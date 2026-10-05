# NXT Tours website: progress

Update this file at the end of every work session (newest first).

## LIVE on https://nxttours.com (2026-10-05)
- GitHub Pages from `main` of this repo, custom domain via the `CNAME` file. DNS in cPanel Zone Editor: 4 A records to GitHub (185.199.108-111.153), www CNAME to abdulraheem02312.github.io. MX/TXT untouched. Old site still in cPanel public_html as a backup. Old A record was 162.241.27.228.
- cPanel login now: https://cpanel.nxttours.com (nxttours.com:2083 no longer reaches cPanel).
- HTTPS certificate approved. "Enforce HTTPS" in repo Settings > Pages is off (only the repo owner can switch it on); js/config.js sends http visitors to https meanwhile.
- Supabase secret SITE_URL = https://nxttours.com (email logo).
- The github.io link redirects to nxttours.com. The repo stays public (no secrets in it).

## Status (2026-10-05, evening)

### Done later on 2026-10-05 (on `dev`, NOT live, Abdullah said keep it off live for now)
- Phones: tall hero photos for phones (`images/hero/hero-m-*`), Book Now bar + pop-up booking form on the tour page (no form at the bottom), timeline cards rise from below so nothing is cut at the screen edge.
- Blocked dates: month calendar in the panel. Tap any days (orange) to block, tap red days to unblock, one Save. Days blocked for all tours show locked when one tour is selected. From-To stays for long stretches.
- Cards + Home feature boxes now follow the panel (name, type, card text, first 3 highlights, price, photo; feature box tagline, text, list). New editor section "Cards and home page". Card texts copied into the database (`cardText`, `spotlight`).
- Activity log shows old → new values ("Price: AED 69.99 → AED 100.99"), skips empty saves, keeps the newest 2,000, shows 30 at a time with Load more, filters by person and type. Bookings list also 30 at a time.
- Tested every tour field one by one on Home, Tours and the tour page; all test data removed.

### Earlier on 2026-10-05

### Done on 2026-10-05 (on `dev`, NOT live yet, waiting for Abdullah's review)
- **Website fixes**: tour page photos swipe on phones (1 / 14 counter + dots); home card caption no longer overlaps the dots; hero text readable (dark fade behind it) and the button lines up with the text; nav bar has no background at the top of every page, glass only after scrolling; Facebook logo round and Facebook blue, "98% recommend" opens Facebook in a new tab; About/Contact pickup wording fixed.
- **Booking cutoff**: tomorrow can't be booked after 6:00 PM Dubai time (setting in the admin panel). Clear orange note under the dates. The server checks it too.
- **Tour page design**: orange accents next to the crimson; new road timeline (curvy road down the middle on PC with cards left/right, road on the left on phones, red/orange stops, a van that drives as you scroll); "Why Travellers Choose" moved to the end.
- **Home hero**: 5 new bright daytime photos (Abu Dhabi, Dubai, Desert, Hatta, Khorfakkan) made in ChatGPT, originals in `nxt-tours-assets/hero/`. On phones the arrows are hidden, the photo cards are the picker.
- **Share preview + Google**: share image `images/og-image.jpg`, Open Graph tags on every page, business data (TravelAgency), `sitemap.xml`, `robots.txt` (admin hidden). Addresses point to github.io for now.
- **Backend phase 2**: tours now live in the database (`tours` table). The site loads them on every visit and falls back to the built-in `TOURS` in `js/script.js` if the database is slow or down. New tables: `site_settings`, `email_settings`, `blocked_dates`, `tour_versions` (undo), `activity_log`. Photo uploads go to the `tour-photos` storage bucket.
- **Admin panel phase 2**: Dashboard (counts, next 7 days, pop-up + sound for new bookings), Bookings (add booking by hand, download as Excel/CSV), Tours editor (name, text, prices, private prices, included/notes, timeline, pickup points, photos with auto-shrink, show/hide, history with restore), Blocked dates, Settings (WhatsApp/phone/email, cutoff hour, offer banner, email switches + test email), Activity log. Works on phones.
- **Emails**: customer booking confirmation stays ON. Team alert, status update (Confirmed/Cancelled), reminder (day before, 10 AM) and review request (day after, 10 AM) are built but OFF. Turn them on in Settings > Emails once the client's mailbox exists. Daily job: pg_cron `nxt-daily-emails`, 06:00 UTC, calls the `notify` function.
- Everything tested with throwaway logins and test bookings, all deleted afterwards.

### Waiting on the client
- Company mailbox (hello@nxttours.com). The client lost access to Google Workspace; Google admin access can be recovered by domain verification (we control the DNS in cPanel). Then: Settings > Emails, add the address, switch alerts on, press "Send a test alert".
- OK to merge the duplicate root SPF records on nxttours.com.
- Team to check the pickup-area grouping (Onpassive/Equiti under Sheikh Zayed Road).

### Next
1. Abdullah reviews `dev` (local preview), then merge to `main` to go live.
2. Move the site to nxttours.com and to Abdullah's own private repo (plan agreed, postponed). Then change the github.io address in the share tags, `sitemap.xml`, `robots.txt` and the `SITE_URL` secret to nxttours.com.
3. Other tours (Dubai, Hatta, Desert Safari, Khorfakkan) to the Abu Dhabi level: the team can now do this from the admin panel.
4. Collect more Abu Dhabi reviews from the Facebook page.

### Managing the site
- Everything day to day is in the admin panel at `/admin.html`: bookings, reviews, tours, blocked dates, settings, team.
- Owner: everything. Editor: bookings, reviews, tours, blocked dates. Reviewer: reviews only.
