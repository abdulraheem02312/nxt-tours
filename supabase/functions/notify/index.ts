// notify: the emails that are NOT the booking confirmation. Each one has an on/off switch in the
// admin panel (Site settings > Emails), and all start switched OFF.
// Actions (POST JSON { action, ... }):
//   status    { bookingId }   owner/editor (login token): email the customer that their booking is
//                             confirmed or cancelled. Sent once per status.
//   test      { to }          owner (login token): send a sample "new booking" alert, to check the address
//   scheduled                 daily job (x-cron-secret header): reminder for tomorrow's tours, and a
//                             review request for yesterday's tours

import { createClient } from "npm:@supabase/supabase-js@2";
import { reminderEmail, reviewRequestEmail, statusEmail, teamEmail, type Booking } from "../_shared/emails.ts";
import { canSend, emailSettings, sendEmail, siteConfig } from "../_shared/mail.ts";

const env = (k: string) => (Deno.env.get(k) || "").trim();
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-cron-secret",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const dubaiDate = (offsetDays = 0) => new Date(Date.now() + 4 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);

// bookings row -> the shape the email templates use
const toBooking = (r: Record<string, any>): Booking & { tourSlug: string } => ({
  ref: r.ref,
  tourName: r.tour_name,
  tourSlug: r.tour_slug,
  optionText: r.option_text,
  optionKind: r.option_kind,
  travelDate: r.travel_date,
  pickup: r.pickup,
  persons: r.persons,
  name: r.customer_name,
  email: r.customer_email || "",
  phone: r.customer_phone,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { ok: false, error: "Method not allowed" });

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return reply(400, { ok: false, error: "Invalid request" });
  }
  const action = String(body.action || "");

  // ---- Daily job (called by pg_cron, 10:00 AM Dubai time) ----
  if (action === "scheduled") {
    const secret = req.headers.get("x-cron-secret") || "";
    const { data: okSecret } = await db.rpc("notify_cron_secret_ok", { p: secret });
    if (!okSecret) return reply(401, { ok: false, error: "Not allowed" });
    const es = await emailSettings(db);
    const result = { reminders: 0, reviewRequests: 0 };
    if (!canSend()) return reply(200, { ok: true, ...result, note: "Email sending is not set up" });
    const cfg = await siteConfig(db);

    if (es.reminderOn) {
      const { data } = await db.from("bookings").select("*")
        .eq("travel_date", dubaiDate(1)).in("status", ["new", "confirmed"])
        .is("reminder_sent_at", null).not("customer_email", "is", null);
      for (const r of data || []) {
        const m = reminderEmail(toBooking(r), cfg);
        if (await sendEmail([r.customer_email], m.subject, m.html, m.text)) {
          await db.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", r.id);
          result.reminders++;
        }
      }
    }
    if (es.reviewRequestOn) {
      const { data } = await db.from("bookings").select("*")
        .eq("travel_date", dubaiDate(-1)).in("status", ["confirmed", "completed"])
        .is("review_request_sent_at", null).not("customer_email", "is", null);
      for (const r of data || []) {
        const m = reviewRequestEmail(toBooking(r), cfg);
        if (await sendEmail([r.customer_email], m.subject, m.html, m.text)) {
          await db.from("bookings").update({ review_request_sent_at: new Date().toISOString() }).eq("id", r.id);
          result.reviewRequests++;
        }
      }
    }
    return reply(200, { ok: true, ...result });
  }

  // ---- Everything else needs a logged-in admin ----
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData?.user) return reply(401, { ok: false, error: "Please log in again." });
  const { data: me } = await db.from("admin_users").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (!me || !["owner", "editor"].includes(me.role)) return reply(403, { ok: false, error: "You don't have access to this." });

  if (action === "status") {
    const es = await emailSettings(db);
    if (!es.statusOn) return reply(200, { ok: true, sent: false, reason: "Status emails are switched off" });
    if (!canSend()) return reply(200, { ok: true, sent: false, reason: "Email sending is not set up" });
    const { data: r } = await db.from("bookings").select("*").eq("id", String(body.bookingId || "")).maybeSingle();
    if (!r) return reply(404, { ok: false, error: "Booking not found" });
    if (!["confirmed", "cancelled"].includes(r.status)) return reply(200, { ok: true, sent: false, reason: "No email for this status" });
    if (!r.customer_email) return reply(200, { ok: true, sent: false, reason: "This booking has no email address" });
    if (r.status_emailed === r.status) return reply(200, { ok: true, sent: false, reason: "Already emailed" });
    const m = statusEmail(toBooking(r), r.status, await siteConfig(db));
    const sent = await sendEmail([r.customer_email], m.subject, m.html, m.text);
    if (sent) await db.from("bookings").update({ status_emailed: r.status }).eq("id", r.id);
    return reply(200, { ok: true, sent });
  }

  if (action === "test") {
    if (me.role !== "owner") return reply(403, { ok: false, error: "Only an owner can do this." });
    if (!canSend()) return reply(200, { ok: false, error: "Email sending is not set up yet." });
    const to = String(body.to || "").split(/[,\s;]+/).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)).slice(0, 5);
    if (!to.length) return reply(400, { ok: false, error: "Please enter a valid email address." });
    const sample: Booking = {
      ref: "NXT-TEST-0000", tourName: "Abu Dhabi City Tour", optionText: "Sharing, AED 79.99 / person", optionKind: "sharing",
      travelDate: dubaiDate(3), pickup: "Al Nahda Metro Station (Exit 2), 8:00 - 8:15 AM", persons: 2,
      name: "Test Customer", email: "test@example.com", phone: null,
    };
    const m = teamEmail(sample, await siteConfig(db));
    const sent = await sendEmail(to, "[TEST] " + m.subject, m.html, m.text);
    return reply(200, sent ? { ok: true } : { ok: false, error: "The email could not be sent. Check the address." });
  }

  return reply(400, { ok: false, error: "Unknown action" });
});
