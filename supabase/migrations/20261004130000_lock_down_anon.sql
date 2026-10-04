-- Second safety layer: the public (anon) role gets no table rights at all on bookings and
-- admin_users, so even a mistake in a row policy could not expose them. Reviews keep only the
-- column rights set in the first migration.
revoke all on public.bookings from anon;
revoke all on public.admin_users from anon;
revoke update, delete, truncate, references, trigger on public.reviews from anon;
