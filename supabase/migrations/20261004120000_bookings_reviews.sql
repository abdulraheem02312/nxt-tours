-- NXT Tours website backend: bookings, reviews, and admin roles (for the future admin panel).
--
-- Security model
-- - The public website uses only the public (anon) key.
-- - Bookings: the website can NOT read or write the table directly. New bookings go through the
--   create-booking Edge Function, which validates them and writes with the service role.
-- - Reviews: the website may INSERT a review (always unapproved) and may SELECT approved ones only.
-- - Logged-in admins (listed in admin_users) can read/update according to their role.

-- ---------- Admin roles ----------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'reviewer')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Role check used by the policies below. security definer so it can read admin_users
-- without the caller needing their own policy on that table.
create or replace function public.has_admin_role(allowed text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = any (allowed)
  );
$$;

revoke all on function public.has_admin_role(text[]) from public;
grant execute on function public.has_admin_role(text[]) to authenticated;

create policy "admins see the admin list"
  on public.admin_users for select
  to authenticated
  using (public.has_admin_role(array['owner', 'editor', 'reviewer']));

create policy "owners manage the admin list"
  on public.admin_users for all
  to authenticated
  using (public.has_admin_role(array['owner']))
  with check (public.has_admin_role(array['owner']));

-- ---------- Bookings ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  created_at timestamptz not null default now(),
  tour_slug text not null,
  tour_name text not null,
  option_kind text not null check (option_kind in ('sharing', 'private')),
  option_text text not null,
  travel_date date not null,
  pickup text not null,
  persons int check (persons is null or persons between 1 and 60),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  status text not null default 'new' check (status in ('new', 'confirmed', 'cancelled', 'completed')),
  team_notes text,
  emails_sent boolean not null default false
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_email_created_idx on public.bookings (customer_email, created_at desc);

alter table public.bookings enable row level security;
-- No policy for anon: the public website cannot read or write bookings directly.

create policy "admins read bookings"
  on public.bookings for select
  to authenticated
  using (public.has_admin_role(array['owner', 'editor']));

create policy "admins update bookings"
  on public.bookings for update
  to authenticated
  using (public.has_admin_role(array['owner', 'editor']))
  with check (public.has_admin_role(array['owner', 'editor']));

-- ---------- Reviews ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tour_slug text not null,
  tour_name text not null,
  name text not null check (char_length(name) between 1 and 60),
  rating int not null check (rating between 1 and 5),
  text text not null check (char_length(text) between 3 and 1000),
  approved boolean not null default false
);

create index if not exists reviews_tour_approved_idx on public.reviews (tour_slug, approved, created_at desc);

alter table public.reviews enable row level security;

create policy "website adds unapproved reviews"
  on public.reviews for insert
  to anon, authenticated
  with check (approved = false);

create policy "everyone reads approved reviews"
  on public.reviews for select
  to anon, authenticated
  using (approved = true);

create policy "admins read all reviews"
  on public.reviews for select
  to authenticated
  using (public.has_admin_role(array['owner', 'editor', 'reviewer']));

create policy "admins approve or edit reviews"
  on public.reviews for update
  to authenticated
  using (public.has_admin_role(array['owner', 'editor', 'reviewer']))
  with check (public.has_admin_role(array['owner', 'editor', 'reviewer']));

create policy "admins delete reviews"
  on public.reviews for delete
  to authenticated
  using (public.has_admin_role(array['owner', 'editor', 'reviewer']));

-- The website may only send these columns when adding a review (approved/created_at stay default)
revoke insert on public.reviews from anon, authenticated;
grant insert (tour_slug, tour_name, name, rating, text) on public.reviews to anon, authenticated;
grant select (id, created_at, tour_slug, tour_name, name, rating, text) on public.reviews to anon;
