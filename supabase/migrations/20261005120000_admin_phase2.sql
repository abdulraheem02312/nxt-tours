-- Admin panel phase 2: tours editable from the panel, site settings, email switches, blocked dates,
-- manual bookings, saved versions of every tour edit, an activity log, and photo uploads.
--
-- Who can do what
-- - Public website (anon): reads visible tours, the public site settings and upcoming blocked dates.
-- - Owner + editor: edit tours, photos, blocked dates, add bookings by hand.
-- - Owner only: site settings, email settings, activity log.
-- - Reviewer: unchanged (reviews only).

-- Name of whoever is logged in, for "updated by" and the activity log
create or replace function public.actor_email()
returns text
language sql
stable
as $$
  select coalesce(nullif(auth.jwt() ->> 'email', ''), 'website');
$$;

-- ---------- Activity log (written only by the triggers below) ----------
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  target text,
  details jsonb
);

create index if not exists activity_log_at_idx on public.activity_log (at desc);

alter table public.activity_log enable row level security;

create policy "owners read the activity log"
  on public.activity_log for select
  to authenticated
  using (public.has_admin_role(array['owner']));

create or replace function public.log_activity(p_action text, p_target text, p_details jsonb default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_log (actor, action, target, details)
  values (public.actor_email(), p_action, p_target, p_details);
$$;

revoke all on function public.log_activity(text, text, jsonb) from public;

-- ---------- Tours ----------
-- data = everything the website shows for one tour (prices, text, timeline, pickup points, photos),
-- in the same shape as the TOURS object in js/script.js, which stays as the offline backup.
create table if not exists public.tours (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  visible boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.tours enable row level security;

create policy "everyone reads visible tours"
  on public.tours for select
  to anon, authenticated
  using (visible);

create policy "admins read hidden tours too"
  on public.tours for select
  to authenticated
  using (public.has_admin_role(array['owner', 'editor', 'reviewer']));

create policy "editors add tours"
  on public.tours for insert
  to authenticated
  with check (public.has_admin_role(array['owner', 'editor']));

create policy "editors change tours"
  on public.tours for update
  to authenticated
  using (public.has_admin_role(array['owner', 'editor']))
  with check (public.has_admin_role(array['owner', 'editor']));

create policy "owners delete tours"
  on public.tours for delete
  to authenticated
  using (public.has_admin_role(array['owner']));

-- Every save keeps the version before it, so a wrong edit can be undone from the panel
create table if not exists public.tour_versions (
  id bigint generated always as identity primary key,
  slug text not null,
  data jsonb not null,
  visible boolean not null,
  saved_at timestamptz not null default now(),
  saved_by text
);

create index if not exists tour_versions_slug_idx on public.tour_versions (slug, saved_at desc);

alter table public.tour_versions enable row level security;

create policy "editors read tour versions"
  on public.tour_versions for select
  to authenticated
  using (public.has_admin_role(array['owner', 'editor']));

create or replace function public.tours_before_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := public.actor_email();
  if tg_op = 'UPDATE' and (old.data is distinct from new.data or old.visible is distinct from new.visible) then
    insert into public.tour_versions (slug, data, visible, saved_by)
    values (old.slug, old.data, old.visible, old.updated_by);
    -- keep the 40 most recent versions per tour
    delete from public.tour_versions
    where slug = old.slug
      and id not in (select id from public.tour_versions where slug = old.slug order by saved_at desc, id desc limit 40);
  end if;
  return new;
end;
$$;

create or replace function public.tours_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('Added tour', new.slug, null);
  elsif tg_op = 'DELETE' then
    perform public.log_activity('Deleted tour', old.slug, null);
    return old;
  elsif old.visible is distinct from new.visible and old.data is not distinct from new.data then
    perform public.log_activity(case when new.visible then 'Showed tour' else 'Hid tour' end, new.slug, null);
  else
    perform public.log_activity('Edited tour', new.slug,
      (select jsonb_object_agg(k, true) from jsonb_object_keys(new.data) k
        where old.data -> k is distinct from new.data -> k));
  end if;
  return new;
end;
$$;

drop trigger if exists tours_before_save on public.tours;
create trigger tours_before_save before insert or update on public.tours
  for each row execute function public.tours_before_save();

drop trigger if exists tours_after_change on public.tours;
create trigger tours_after_change after insert or update or delete on public.tours
  for each row execute function public.tours_after_change();

-- ---------- Public site settings (one row) ----------
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  cutoff_hour int not null default 18 check (cutoff_hour between 0 and 23),
  whatsapp text not null default '971586272827',
  phone text,
  email text,
  offer_on boolean not null default false,
  offer_text text check (offer_text is null or char_length(offer_text) <= 160),
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.site_settings (id) values (1) on conflict do nothing;

alter table public.site_settings enable row level security;

create policy "everyone reads site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "owners change site settings"
  on public.site_settings for update
  to authenticated
  using (public.has_admin_role(array['owner']))
  with check (public.has_admin_role(array['owner']));

-- ---------- Email settings (one row, private) ----------
-- Every email except the customer's booking confirmation starts switched OFF. The client turns
-- them on in the panel once their company mailbox exists.
create table if not exists public.email_settings (
  id int primary key default 1 check (id = 1),
  team_emails text,
  team_alert_on boolean not null default false,
  status_on boolean not null default false,
  reminder_on boolean not null default false,
  review_request_on boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.email_settings (id) values (1) on conflict do nothing;

alter table public.email_settings enable row level security;

create policy "owners read email settings"
  on public.email_settings for select
  to authenticated
  using (public.has_admin_role(array['owner']));

create policy "owners change email settings"
  on public.email_settings for update
  to authenticated
  using (public.has_admin_role(array['owner']))
  with check (public.has_admin_role(array['owner']));

create or replace function public.settings_before_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := public.actor_email();
  return new;
end;
$$;

create or replace function public.settings_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_activity(
    case when tg_table_name = 'site_settings' then 'Changed site settings' else 'Changed email settings' end,
    null,
    (select jsonb_object_agg(k, true) from jsonb_object_keys(to_jsonb(new)) k
      where k not in ('updated_at', 'updated_by') and to_jsonb(old) -> k is distinct from to_jsonb(new) -> k));
  return new;
end;
$$;

drop trigger if exists site_settings_before on public.site_settings;
create trigger site_settings_before before update on public.site_settings
  for each row execute function public.settings_before_save();
drop trigger if exists site_settings_after on public.site_settings;
create trigger site_settings_after after update on public.site_settings
  for each row execute function public.settings_after_change();
drop trigger if exists email_settings_before on public.email_settings;
create trigger email_settings_before before update on public.email_settings
  for each row execute function public.settings_before_save();
drop trigger if exists email_settings_after on public.email_settings;
create trigger email_settings_after after update on public.email_settings
  for each row execute function public.settings_after_change();

-- ---------- Blocked dates ----------
-- A day a tour is not running (tour_slug null = every tour). The booking calendar greys it out
-- and the create-booking function refuses it.
create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  tour_slug text references public.tours (slug) on delete cascade,
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  created_by text,
  unique nulls not distinct (date, tour_slug)
);

alter table public.blocked_dates enable row level security;

create policy "everyone reads upcoming blocked dates"
  on public.blocked_dates for select
  to anon, authenticated
  using (date >= current_date - 1);

create policy "editors manage blocked dates"
  on public.blocked_dates for all
  to authenticated
  using (public.has_admin_role(array['owner', 'editor']))
  with check (public.has_admin_role(array['owner', 'editor']));

create or replace function public.blocked_dates_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := public.actor_email();
    perform public.log_activity('Blocked a date', coalesce(new.tour_slug, 'all tours'), jsonb_build_object('date', new.date, 'note', new.note));
    return new;
  end if;
  perform public.log_activity('Unblocked a date', coalesce(old.tour_slug, 'all tours'), jsonb_build_object('date', old.date));
  return old;
end;
$$;

drop trigger if exists blocked_dates_ins on public.blocked_dates;
create trigger blocked_dates_ins before insert on public.blocked_dates
  for each row execute function public.blocked_dates_log();
drop trigger if exists blocked_dates_del on public.blocked_dates;
create trigger blocked_dates_del after delete on public.blocked_dates
  for each row execute function public.blocked_dates_log();

-- ---------- Bookings: manual bookings + email tracking ----------
alter table public.bookings add column if not exists source text not null default 'website';
alter table public.bookings drop constraint if exists bookings_source_check;
alter table public.bookings add constraint bookings_source_check check (source in ('website', 'manual'));
alter table public.bookings alter column customer_email drop not null; -- WhatsApp/phone bookings may have no email
alter table public.bookings add column if not exists created_by text;
alter table public.bookings add column if not exists status_emailed text;
alter table public.bookings add column if not exists reminder_sent_at timestamptz;
alter table public.bookings add column if not exists review_request_sent_at timestamptz;
create index if not exists bookings_travel_date_idx on public.bookings (travel_date);

create policy "editors add manual bookings"
  on public.bookings for insert
  to authenticated
  with check (public.has_admin_role(array['owner', 'editor']) and source = 'manual');

create or replace function public.bookings_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.source = 'manual' then
      perform public.log_activity('Added a booking by hand', new.ref, jsonb_build_object('tour', new.tour_name, 'date', new.travel_date));
    end if;
  elsif old.status is distinct from new.status then
    perform public.log_activity('Changed booking status', new.ref, jsonb_build_object('from', old.status, 'to', new.status));
  elsif old.team_notes is distinct from new.team_notes then
    perform public.log_activity('Edited booking note', new.ref, null);
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_log on public.bookings;
create trigger bookings_log after insert or update on public.bookings
  for each row execute function public.bookings_log();

create or replace function public.bookings_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'manual' then
    new.created_by := public.actor_email();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_before_insert on public.bookings;
create trigger bookings_before_insert before insert on public.bookings
  for each row execute function public.bookings_before_insert();

-- ---------- Reviews + team changes in the log ----------
create or replace function public.reviews_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.log_activity('Deleted a review', old.name, jsonb_build_object('tour', old.tour_name));
    return old;
  end if;
  if old.approved is distinct from new.approved then
    perform public.log_activity(case when new.approved then 'Approved a review' else 'Hid a review' end, new.name, jsonb_build_object('tour', new.tour_name));
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_log on public.reviews;
create trigger reviews_log after update or delete on public.reviews
  for each row execute function public.reviews_log();

create or replace function public.admin_users_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('Added team member', new.email, jsonb_build_object('role', new.role));
  elsif tg_op = 'DELETE' then
    perform public.log_activity('Removed team member', old.email, null);
    return old;
  elsif old.role is distinct from new.role then
    perform public.log_activity('Changed team role', new.email, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;

drop trigger if exists admin_users_log on public.admin_users;
create trigger admin_users_log after insert or update or delete on public.admin_users
  for each row execute function public.admin_users_log();

-- ---------- Table rights for the public role (second safety layer) ----------
revoke all on public.tours, public.tour_versions, public.site_settings, public.email_settings,
  public.blocked_dates, public.activity_log from anon;
grant select on public.tours to anon;
grant select on public.site_settings to anon;
grant select (id, date, tour_slug) on public.blocked_dates to anon;

-- ---------- Photo uploads ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tour-photos', 'tour-photos', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 3145728,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

create policy "editors upload tour photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'tour-photos' and public.has_admin_role(array['owner', 'editor']));

create policy "editors replace tour photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'tour-photos' and public.has_admin_role(array['owner', 'editor']));

create policy "editors delete tour photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'tour-photos' and public.has_admin_role(array['owner', 'editor']));
