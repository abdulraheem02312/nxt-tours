-- Admin panel: keep each team member's email next to their role so the Team page can list people
-- without reading auth.users from the browser.
alter table public.admin_users add column if not exists email text;

-- Let any logged-in admin see their own row (so the panel knows their role), owners see everyone
-- (already covered by "admins see the admin list").
