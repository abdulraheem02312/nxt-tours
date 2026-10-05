// create-booking: receives a booking from the website, checks it, saves it, emails the customer
// and the team (through Resend), and returns the booking reference.
//
// Secrets (Supabase > Edge Functions > Secrets). Only the first two are required for saving bookings:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  - provided by Supabase automatically
//   RESEND_API_KEY   - from the client's Resend account (emails are skipped until it is set)
//   BOOKING_FROM     - e.g. "NXT Tours <bookings@clientdomain.com>" (a verified Resend domain)
//   TEAM_EMAILS      - old fallback for the team alert address; now set in the admin panel
//                      (Site settings > Emails), where the alert is also switched on/off
//   SITE_URL         - public website address, used for the logo in emails
//   ALLOWED_ORIGINS  - optional, comma separated website addresses allowed to call this function

import { createClient } from "npm:@supabase/supabase-js@2";
import { customerEmail, teamEmail, type Booking } from "../_shared/emails.ts";
import { canSend, emailSettings, sendEmail, siteConfig } from "../_shared/mail.ts";

// Short codes used in booking references (NXT-AD-...). Tours added later get a code from their slug.
const CODES: Record<string, { name: string; code: string }> = {
  "abu-dhabi": { name: "Abu Dhabi City Tour", code: "AD" },
  "dubai": { name: "Dubai City Tour", code: "DXB" },
  "hatta": { name: "Hatta City Tour", code: "HT" },
  "desert-safari": { name: "Desert Safari", code: "DS" },
  "khorfakkan": { name: "Khorfakkan City Tour", code: "KF" },
};
const MAX_PER_EMAIL_PER_HOUR = 5;

const env = (k: string) => (Deno.env.get(k) || "").trim();
const allowed = env("ALLOWED_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean);

function cors(origin: string | null) {
  const ok = !allowed.length || (origin && allowed.includes(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin || "*" : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Vary": "Origin",
  };
}

const reply = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

const text = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Today's date in Dubai (UTC+4, no daylight saving), as YYYY-MM-DD
const dubaiDate = (offsetDays = 0) => new Date(Date.now() + 4 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
const dubaiHour = () => new Date(Date.now() + 4 * 3600e3).getUTCHours();

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeRef(code: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return "NXT-" + code + "-" + Array.from(bytes, (b) => REF_CHARS[b % REF_CHARS.length]).join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply(405, { ok: false, error: "Method not allowed" }, origin);
  if (allowed.length && origin && !allowed.includes(origin)) return reply(403, { ok: false, error: "Not allowed" }, origin);

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return reply(400, { ok: false, error: "Invalid request" }, origin);
  }

  // Hidden field real people never see; bots fill it. Pretend success, save nothing.
  if (text(data.website, 100)) return reply(200, { ok: true, ref: "NXT-OK" }, origin);

  // ---- Validate ----
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const slug = text(data.tour, 40);
  // The tour must exist and be switched on in the admin panel
  const { data: row } = await db.from("tours").select("data").eq("slug", slug).eq("visible", true).maybeSingle();
  const tour = row
    ? {
        name: CODES[slug]?.name || [row.data.name, row.data.accent].filter(Boolean).join(" "),
        code: CODES[slug]?.code || slug.split("-").map((w) => w[0]).join("").toUpperCase().slice(0, 4),
      }
    : null;
  // Same rules as the website's date picker: tomorrow closes at the cutoff hour (Dubai time),
  // and days blocked in the admin panel can't be booked.
  const { data: settings } = await db.from("site_settings").select("cutoff_hour").eq("id", 1).maybeSingle();
  const cutoff = Number.isInteger(settings?.cutoff_hour) ? settings!.cutoff_hour : 18;
  const earliest = dubaiDate(dubaiHour() >= cutoff ? 2 : 1);
  const optionKind = data.optionKind === "private" ? "private" : data.optionKind === "sharing" ? "sharing" : "";
  const optionText = text(data.optionText, 120);
  const travelDate = text(data.date, 10);
  const pickup = text(data.pickup, 200);
  const name = text(data.name, 80);
  const email = text(data.email, 120).toLowerCase();
  const phone = text(data.phone, 30) || null;
  const persons = optionKind === "sharing" ? Math.round(Number(data.persons)) : null;

  const problems: string[] = [];
  if (!tour) problems.push("tour");
  if (!optionKind || !optionText) problems.push("tour option");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate) || travelDate < earliest || travelDate > dubaiDate(366)) problems.push("date");
  if (!pickup) problems.push("pickup");
  if (name.length < 2) problems.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) problems.push("email");
  if (phone && !/^[+\d][\d\s()-]{5,}$/.test(phone)) problems.push("mobile");
  if (optionKind === "sharing" && !(persons! >= 1 && persons! <= 60)) problems.push("persons");
  if (problems.length) return reply(400, { ok: false, error: "Please check: " + problems.join(", ") }, origin);

  const { count: blockedCount } = await db.from("blocked_dates").select("id", { count: "exact", head: true })
    .eq("date", travelDate).or("tour_slug.is.null,tour_slug.eq." + slug);
  if (blockedCount) return reply(400, { ok: false, error: "Sorry, this tour is not available on that date. Please choose another day." }, origin);

  // ---- Spam limit: a handful of bookings per email per hour ----
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("customer_email", email).gte("created_at", since);
  if ((count || 0) >= MAX_PER_EMAIL_PER_HOUR) {
    return reply(429, { ok: false, error: "Too many bookings from this email. Please message us on WhatsApp." }, origin);
  }

  // ---- Save (retry if the random reference already exists) ----
  let ref = "";
  for (let attempt = 0; attempt < 4 && !ref; attempt++) {
    const candidate = makeRef(tour!.code);
    const { error } = await db.from("bookings").insert({
      ref: candidate,
      tour_slug: slug,
      tour_name: tour!.name,
      option_kind: optionKind,
      option_text: optionText,
      travel_date: travelDate,
      pickup,
      persons,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
    });
    if (!error) ref = candidate;
    else if (error.code !== "23505") {
      console.error("Insert failed", error);
      return reply(500, { ok: false, error: "Could not save the booking" }, origin);
    }
  }
  if (!ref) return reply(500, { ok: false, error: "Could not save the booking" }, origin);

  // ---- Emails (skipped until Resend is set up) ----
  // The customer always gets the confirmation. The team alert only goes out once it is switched
  // on in the admin panel with an address filled in.
  let emailSent = false;
  if (canSend()) {
    const booking: Booking = {
      ref, tourName: tour!.name, optionText, optionKind, travelDate, pickup, persons, name, email, phone,
    };
    const cfg = await siteConfig(db);
    const c = customerEmail(booking, cfg);
    emailSent = await sendEmail([email], c.subject, c.html, c.text);
    const es = await emailSettings(db);
    if (es.teamAlertOn && es.team.length) {
      const t = teamEmail(booking, cfg);
      await sendEmail(es.team, t.subject, t.html, t.text, email);
    }
    if (emailSent) await db.from("bookings").update({ emails_sent: true }).eq("ref", ref);
  }

  return reply(200, { ok: true, ref, emailSent }, origin);
});
