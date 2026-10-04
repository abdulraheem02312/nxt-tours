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

### Next
1. **Admin panel, phase 1** (`admin.html`): login, bookings list with status + WhatsApp, review approval, team management (owner adds people with a role).
2. Collect more Abu Dhabi reviews from the Facebook page.
3. About / Contact pages still say "hotel & metro pickup" (hotel pickup is private tours only).
4. Admin panel phase 2: edit prices, tour text, timeline, photos from the panel.
5. Other tours (Dubai, Hatta, Desert Safari, Khorfakkan) to the same level as Abu Dhabi.
6. Move the site to nxttours.com, then make this repo private and switch `SITE_URL` (email logo) to nxttours.com.

### Until the admin panel exists
- Approve a website review: Supabase > Table Editor > `reviews` > tick `approved`.
- See bookings: Supabase > Table Editor > `bookings`.
