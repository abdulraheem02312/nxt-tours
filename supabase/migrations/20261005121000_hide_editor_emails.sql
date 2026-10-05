-- The public website does not need to know who last edited a tour or the settings (an email),
-- so the public role only gets the columns the site actually uses.
revoke select on public.tours from anon;
grant select (slug, data, visible, sort) on public.tours to anon;
revoke select on public.site_settings from anon;
grant select (id, cutoff_hour, whatsapp, phone, email, offer_on, offer_text) on public.site_settings to anon;
