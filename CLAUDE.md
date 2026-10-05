# NXT Tours website

Static website (HTML/CSS/JS) for NXT Tours, a Dubai tour operator, plus a Supabase backend for bookings and reviews. Worked on by more than one person from different computers through this GitHub repo.

**This repo is public.** Never commit passwords, API keys, client contact details or private notes. Secrets live in `.env` (gitignored) on each computer only.

## How we work (two people, one repo)
1. **Start of every session:** `git pull` on the branch you're working on, so you have the other person's latest work.
2. Work on the **`dev`** branch. `main` is the live site: every push to `main` goes live on https://nxttours.com (GitHub Pages, domain set by the `CNAME` file, never delete it), so only finished, checked work is merged into it.
3. **End of session:** commit with a clear message and `git push`. Update `PROGRESS.md` (what you did, what's next) in the same commit.
4. Small commits, and tell each other who is working on which part to avoid both editing the same file.
5. After changing CSS or JS, bump the `?v=YYYYMMDDx` number on the `<link>`/`<script>` tags in every HTML page, or returning visitors keep the old cached files.

## Where things are
| What | Where |
|---|---|
| All tour data (prices, timeline, pickup points, photos, notes) | The `tours` table in Supabase, edited in the admin panel (Tours). `TOURS` in `js/script.js` is only the BACKUP used when the database can not be reached, so a change made only there will NOT show. |
| Facebook reviews shown on tour pages | `js/script.js`, the `REVIEWS` array |
| Backend settings (Supabase URL + public key) | `js/config.js`, the `BACKEND` object (loaded on every page). The publishable key is meant to be public. |
| Admin panel | `admin.html` + `js/admin.js` (bookings, reviews, dashboard, blocked dates, settings, activity, team) + `js/admin-tours.js` (tour editor) + `css/admin.css`. Team management goes through the `admin-team` Edge Function. |
| Live data loader (tours, settings, blocked dates) | `js/script.js`, `loadLiveData()`; everything that draws tours runs in `startToursUI()` after it |
| Home hero photos | `images/hero/` (originals in `nxt-tours-assets/hero/`) |
| Share preview + Google tags | `<head>` of each page, `images/og-image.jpg`, `sitemap.xml`, `robots.txt` (all use the github.io address until the move to nxttours.com) |
| Translations for the language switcher | `js/i18n.js` |
| Tour detail page (one template for all tours) | `tour.html?t=<slug>` |
| Styles and brand colours | `css/style.css`, `:root` variables |
| Database tables + security rules | `supabase/migrations/*.sql` |
| Booking function (saves booking, sends emails) | `supabase/functions/create-booking/` |
| Email designs (customer + team + status + reminder + review request) | `supabase/functions/_shared/emails.ts`; sending + email switches in `_shared/mail.ts` |
| Status / reminder / review emails, test email | `supabase/functions/notify/` (daily job: pg_cron `nxt-daily-emails`, 06:00 UTC) |

## Brand
- Colours from the NXT Tours Brand Guideline: crimson `#AA1345`, orange `#F39200`, white, black. Every other shade is a lighter/darker step of these.
- Fonts stay as they are (Poppins, Inter, Playfair italic for accent words). Decided not to switch to the guideline fonts.
- Writing: plain everyday English, no em dash anywhere.

## Backend (Supabase project `gqlceqeinyfdjbshmacb`, Mumbai)
- `bookings`: the website cannot read or write it directly; bookings go through the `create-booking` Edge Function.
- `reviews`: the website can add a review (always unapproved) and read approved ones only.
- `admin_users`: roles `owner`, `editor`, `reviewer` for the admin panel.
- `tours` (public reads visible ones), `tour_versions` (undo), `site_settings` (public: WhatsApp, cutoff hour, offer banner), `email_settings` (owner only: team address + on/off switches), `blocked_dates` (public reads upcoming), `activity_log` (owner only, written by triggers). Storage bucket `tour-photos` (public read, owner/editor upload).
- Public sign-ups are off. Admin accounts are added by an owner.
- Booking emails send through Resend from `NXT Tours <hello@nxttours.com>`.
- Function secrets (set in Supabase, never in code): `RESEND_API_KEY`, `BOOKING_FROM`, `SITE_URL` (`TEAM_EMAILS` is only an old fallback now; the team address is set in the panel).

### Working on the backend
- Put your own Supabase personal access token in `.env` as `SUPABASE_ACCESS_TOKEN=sbp_...` (each person makes their own token).
- Deploy a function: `npx supabase functions deploy <create-booking|admin-team|notify> --project-ref gqlceqeinyfdjbshmacb --no-verify-jwt --use-api`
- To test the admin panel, make throwaway logins with `@example.com` emails and delete them afterwards. Never create or change real people's logins in tests.
- Database changes: add a new file in `supabase/migrations/`, then run it (Supabase SQL editor or the Management API). Never edit old migration files.
- Test with throwaway data and delete it afterwards. Never send test emails to real customers (use `delivered@resend.dev`).
- Do not connect this Supabase project to GitHub: it would block transferring the project to the client later.
