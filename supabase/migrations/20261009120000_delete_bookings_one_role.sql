-- 1. Admins can delete a booking (test bookings, spam). Every delete is written to the activity
--    log with the booking's details, so it is never lost without a trace.
-- 2. Blocked days get an optional reason that customers see on the website ("Eid holiday").
--    The existing "note" stays private for the team.
-- 3. One role only: everyone on the team is an admin (stored as 'owner', shown as "Admin").

-- ---------- 1. Delete bookings ----------
create policy "admins delete bookings"
  on public.bookings for delete
  to authenticated
  using (public.has_admin_role(array['owner', 'editor']));

create or replace function public.bookings_deleted_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_activity('Deleted a booking', old.ref, jsonb_build_object('changes', jsonb_build_array(
    old.customer_name || ', ' || old.tour_name || ', ' || to_char(old.travel_date, 'DD Mon YYYY'),
    'Option: ' || old.option_text || coalesce(', ' || old.persons || ' persons', ''),
    'Contact: ' || coalesce(old.customer_email, 'no email') || coalesce(', ' || old.customer_phone, ''),
    'Status before deleting: ' || old.status
  )));
  return old;
end;
$$;

drop trigger if exists bookings_deleted_log on public.bookings;
create trigger bookings_deleted_log after delete on public.bookings
  for each row execute function public.bookings_deleted_log();

-- ---------- 2. Reason for customers on blocked days ----------
alter table public.blocked_dates add column if not exists public_reason text
  check (public_reason is null or char_length(public_reason) <= 120);
grant select (public_reason) on public.blocked_dates to anon;

create or replace function public.blocked_dates_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tour_label text;
begin
  if tg_op = 'INSERT' then
    new.created_by := public.actor_email();
    select (data ->> 'name') || ' ' || coalesce(data ->> 'accent', '') into tour_label from public.tours where slug = new.tour_slug;
    perform public.log_activity('Blocked a date', coalesce(tour_label, 'all tours'), jsonb_build_object('changes', jsonb_build_array(
      to_char(new.date, 'Dy DD Mon YYYY')
      || coalesce(' (customers see: ' || new.public_reason || ')', '')
      || coalesce(' (team note: ' || new.note || ')', ''))));
    return new;
  end if;
  select (data ->> 'name') || ' ' || coalesce(data ->> 'accent', '') into tour_label from public.tours where slug = old.tour_slug;
  perform public.log_activity('Unblocked a date', coalesce(tour_label, 'all tours'), jsonb_build_object('changes', jsonb_build_array(
    to_char(old.date, 'Dy DD Mon YYYY'))));
  return old;
end;
$$;

-- ---------- 3. One role ----------
update public.admin_users set role = 'owner' where role <> 'owner';
alter table public.admin_users alter column role set default 'owner';

-- Team changes in the log: no role any more (everyone is an admin)
create or replace function public.admin_users_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('Added team member', new.email, null);
  elsif tg_op = 'DELETE' then
    perform public.log_activity('Removed team member', old.email, null);
    return old;
  end if;
  return new;
end;
$$;
