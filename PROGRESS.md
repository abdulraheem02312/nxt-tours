# NXT Tours website: progress

Update this file at the end of every work session (newest first).

## Status (2026-10-04)

### Done
- **Abu Dhabi tour page** fully built: hour-by-hour animated timeline (pickup 7:30 AM, all stops incl. Emirates Palace, Etihad Towers, Qasr Al Watan), 14 photos, included / not included / important notes, pickup points grouped by area with search.
- **Prices**: sharing price + separate private prices (7-seater, 14-seater); homepage and tours page read prices and photos from the same `TOURS` data.
- **Brand colours** matched to the brand guideline across the whole site.
- **Booking form**: name, email, mobile (optional), tour option, date (swipe row + full calendar, no same-day bookings), pickup picker, persons (sharing only). "Book Now" saves the booking in Supabase and shows a "Booking request received" popup with a reference like `NXT-AD-7K3QF`.
- **Booking emails**: customer confirmation sends from hello@nxttours.com (Resend, domain verified).
- **Reviews**: Facebook reviews + reviews written on the website (shown after approval, with stars).
- **Backend security** tested: public key can't read bookings, can't approve reviews, sign-ups off.

### Waiting on the client
- Create **hello@nxttours.com** in their Google Workspace (company email is on Google, not cPanel). Then set `TEAM_EMAILS=hello@nxttours.com` so new-booking alerts arrive.
- Decide when to put the site live on nxttours.com (cPanel hosting, a site is already running there).

- **Admin panel, phase 1** (`admin.html`, not linked from the site): email/password login, Bookings (filter by status, search, sort by travel date, change status, team notes, WhatsApp/email the customer), Reviews (approve, hide, delete), Team (owner adds people with a role and a temporary password, resets passwords, removes people; the last owner can't be removed), Account (change password). New people must set their own password on first login. Tested end to end, including that editors can't make themselves owner.

### First owner login (one-time, done by a person, not in code)
1. Supabase > Authentication > Users > Add user > Create new user: your email + a strong password, tick "Auto Confirm User".
2. Supabase > SQL Editor, run (with your email): `insert into public.admin_users (user_id, role, email) select id, 'owner', email from auth.users where email = 'you@example.com';`
3. Log in at `/admin.html`. Add everyone else from the Team page.

### Next
1. Create the first owner login (above).
2. Collect more Abu Dhabi reviews from the Facebook page.
3. About / Contact pages still say "hotel & metro pickup" (hotel pickup is private tours only).
4. Admin panel phase 2: edit prices, tour text, timeline, photos from the panel.
5. Other tours (Dubai, Hatta, Desert Safari, Khorfakkan) to the same level as Abu Dhabi.
6. Move the site to nxttours.com, then make this repo private and switch `SITE_URL` (email logo) to nxttours.com.

### Managing bookings and reviews
- Use the admin panel at `/admin.html` (after the first owner login exists).
