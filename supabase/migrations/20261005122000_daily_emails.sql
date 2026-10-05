-- Daily emails (reminder the day before, review request the day after): pg_cron calls the
-- notify Edge Function every day at 06:00 UTC = 10:00 AM Dubai. The function itself checks the
-- on/off switches in email_settings, so this job is harmless while they are off.
-- The job proves who it is with a random secret kept in Supabase Vault (never in code).
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'notify_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'notify_cron_secret', 'Proves the daily email job to the notify function');
  end if;
end $$;

create or replace function public.notify_cron_secret_ok(p text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'notify_cron_secret' and decrypted_secret = p and p <> '');
$$;

revoke all on function public.notify_cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.notify_cron_secret_ok(text) to service_role;

select cron.unschedule('nxt-daily-emails') where exists (select 1 from cron.job where jobname = 'nxt-daily-emails');
select cron.schedule(
  'nxt-daily-emails',
  '0 6 * * *',
  $job$
  select net.http_post(
    url := 'https://gqlceqeinyfdjbshmacb.supabase.co/functions/v1/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notify_cron_secret')
    ),
    body := '{"action":"scheduled"}'::jsonb
  );
  $job$
);
