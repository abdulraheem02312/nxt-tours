// Sending email through Resend + reading the email switches saved in the admin panel.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const env = (k: string) => (Deno.env.get(k) || "").trim();

export const canSend = () => Boolean(env("RESEND_API_KEY") && env("BOOKING_FROM"));

export async function sendEmail(to: string[], subject: string, html: string, textBody: string, replyTo?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env("RESEND_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("BOOKING_FROM"), to, subject, html, text: textBody, reply_to: replyTo }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}

export type EmailSettings = {
  team: string[]; // team alert addresses (empty = no alert)
  teamAlertOn: boolean;
  statusOn: boolean;
  reminderOn: boolean;
  reviewRequestOn: boolean;
};

// Saved in the panel (Site settings > Emails). The old TEAM_EMAILS secret still works as a fallback.
export async function emailSettings(db: SupabaseClient): Promise<EmailSettings> {
  const { data } = await db.from("email_settings").select("*").eq("id", 1).maybeSingle();
  const list = (data?.team_emails || env("TEAM_EMAILS")).split(/[,\s;]+/).map((s: string) => s.trim()).filter((s: string) => /@/.test(s));
  return {
    team: list,
    teamAlertOn: Boolean(data?.team_alert_on),
    statusOn: Boolean(data?.status_on),
    reminderOn: Boolean(data?.reminder_on),
    reviewRequestOn: Boolean(data?.review_request_on),
  };
}

export const siteConfig = async (db: SupabaseClient) => {
  const { data } = await db.from("site_settings").select("whatsapp").eq("id", 1).maybeSingle();
  return {
    siteUrl: env("SITE_URL") || "https://abdulraheem02312.github.io/nxt-tours",
    whatsapp: String(data?.whatsapp || "971586272827").replace(/\D/g, ""),
  };
};
