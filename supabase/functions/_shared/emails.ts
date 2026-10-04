// Booking emails: one to the customer, one to the NXT team.
// Plain tables + inline styles so they look right in Gmail, Outlook and phone mail apps.
// Brand: crimson #AA1345, orange #F39200, white, black (NXT Tours Brand Guideline 2025).

export type Booking = {
  ref: string;
  tourName: string;
  optionText: string;
  optionKind: "sharing" | "private";
  travelDate: string; // YYYY-MM-DD
  pickup: string;
  persons: number | null;
  name: string;
  email: string;
  phone: string | null;
};

export type EmailConfig = {
  siteUrl: string; // e.g. https://nxttours.ae (no trailing slash)
  whatsapp: string; // digits only, e.g. 971586272827
};

const CRIMSON = "#AA1345";
const ORANGE = "#F39200";
const INK = "#1C1013";
const MUTED = "#7C6669";
const SOFT = "#FBF4F6";

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const niceDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const wa = (number: string, text: string) => "https://wa.me/" + number + "?text=" + encodeURIComponent(text);

const row = (label: string, value: string) =>
  `<tr>
     <td style="padding:10px 0;border-bottom:1px solid #F1E3E8;color:${MUTED};font-size:14px;width:38%;vertical-align:top;">${esc(label)}</td>
     <td style="padding:10px 0;border-bottom:1px solid #F1E3E8;color:${INK};font-size:14px;font-weight:600;vertical-align:top;">${esc(value)}</td>
   </tr>`;

const summaryRows = (b: Booking) =>
  [
    row("Tour", b.tourName),
    row("Option", b.optionText),
    row("Date", niceDate(b.travelDate)),
    row("Pickup", b.pickup),
    b.persons ? row("Persons", String(b.persons)) : "",
  ].join("");

const button = (href: string, label: string, bg: string) =>
  `<a href="${esc(href)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:${bg};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;">${esc(label)}</a>`;

const shell = (cfg: EmailConfig, preheader: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>NXT Tours</title>
</head>
<body style="margin:0;padding:0;background:#F4EEF0;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EEF0;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:18px;overflow:hidden;">
      <tr><td align="center" style="background:${CRIMSON};padding:28px 24px;">
        <img src="${esc(cfg.siteUrl)}/images/nxt-logo-white.png" width="190" alt="NXT Tours, Experience Next-Gen Travel" style="display:block;border:0;width:190px;height:auto;">
      </td></tr>
      ${body}
      <tr><td style="background:#000000;padding:22px 24px;text-align:center;">
        <div style="color:#FFFFFF;font-size:13px;font-weight:700;">NXT Tours</div>
        <div style="color:#BBBBBB;font-size:12px;line-height:1.6;margin-top:4px;">
          Sadiq Al Kazim Building, Abu Hail, Deira, Dubai, UAE<br>
          WhatsApp / Call: +971 58 627 2827
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

// ---------- Customer: "we received your booking request" ----------
export function customerEmail(b: Booking, cfg: EmailConfig) {
  const waLink = wa(cfg.whatsapp, `Hello NXT Tours! My booking reference is ${b.ref}.`);
  const subject = `Booking request received: ${b.tourName} on ${niceDate(b.travelDate)} (${b.ref})`;
  const body = `
      <tr><td style="padding:32px 32px 8px;">
        <div style="color:${CRIMSON};font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Booking request received</div>
        <h1 style="margin:8px 0 12px;color:${INK};font-size:24px;line-height:1.3;">Thank you, ${esc(b.name.split(" ")[0])}!</h1>
        <p style="margin:0;color:${MUTED};font-size:15px;line-height:1.6;">
          We have received your booking request. Our team will contact you on WhatsApp shortly to confirm your seat and pickup details.
        </p>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border-radius:14px;">
          <tr><td style="padding:16px 20px;">
            <div style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your reference</div>
            <div style="color:${CRIMSON};font-size:26px;font-weight:800;letter-spacing:1px;margin-top:2px;">${esc(b.ref)}</div>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summaryRows(b)}</table>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;">
        <div style="color:${INK};font-size:16px;font-weight:700;margin-bottom:8px;">What happens next</div>
        <ol style="margin:0;padding-left:20px;color:${MUTED};font-size:14px;line-height:1.8;">
          <li>Our team checks your date and pickup point.</li>
          <li>We message you on WhatsApp to confirm.</li>
          <li>On the day, be ready at your pickup point at the start of your time window.</li>
        </ol>
      </td></tr>
      <tr><td align="center" style="padding:24px 32px 8px;">
        <div style="color:${MUTED};font-size:14px;margin-bottom:14px;">Questions or changes? We usually reply within minutes.</div>
        ${button(waLink, "Chat with us on WhatsApp", "#25D366")}
      </td></tr>
      <tr><td style="padding:20px 32px 30px;">
        <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;border-top:1px solid #F1E3E8;padding-top:16px;">
          Pickup and drop-off are free anywhere in Dubai.${/abu dhabi/i.test(b.tourName) ? " Modest dress is required at the Sheikh Zayed Grand Mosque." : ""}
          This is a booking request, it is confirmed once our team contacts you.
        </p>
      </td></tr>`;
  const text = [
    `Thank you, ${b.name}! We have received your booking request.`,
    `Reference: ${b.ref}`,
    `Tour: ${b.tourName}`,
    `Option: ${b.optionText}`,
    `Date: ${niceDate(b.travelDate)}`,
    `Pickup: ${b.pickup}`,
    b.persons ? `Persons: ${b.persons}` : "",
    "",
    "Our team will contact you on WhatsApp shortly to confirm.",
    `Questions? WhatsApp us: ${waLink}`,
  ].filter(Boolean).join("\n");
  return { subject, html: shell(cfg, `Your reference is ${b.ref}. We'll confirm on WhatsApp shortly.`, body), text };
}

// ---------- Team: "new booking" alert ----------
export function teamEmail(b: Booking, cfg: EmailConfig) {
  const phoneDigits = (b.phone || "").replace(/\D/g, "");
  const subject = `New booking ${b.ref}: ${b.tourName}, ${niceDate(b.travelDate)}, ${b.name}`;
  const contact = phoneDigits
    ? button(
        wa(phoneDigits, `Hello ${b.name}, this is NXT Tours about your booking ${b.ref} for the ${b.tourName}.`),
        "WhatsApp the customer",
        "#25D366",
      )
    : button(`mailto:${b.email}?subject=${encodeURIComponent("Your NXT Tours booking " + b.ref)}`, "Email the customer", CRIMSON);
  const body = `
      <tr><td style="padding:30px 32px 8px;">
        <div style="display:inline-block;padding:5px 12px;border-radius:999px;background:${ORANGE};color:#FFFFFF;font-size:12px;font-weight:700;">NEW BOOKING</div>
        <h1 style="margin:12px 0 4px;color:${INK};font-size:22px;">${esc(b.ref)}</h1>
        <p style="margin:0;color:${MUTED};font-size:14px;">Please contact the customer to confirm.</p>
      </td></tr>
      <tr><td style="padding:12px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${summaryRows(b)}
          ${row("Customer", b.name)}
          ${row("Email", b.email)}
          ${row("Mobile", b.phone || "Not given")}
        </table>
      </td></tr>
      <tr><td align="center" style="padding:26px 32px 32px;">${contact}</td></tr>`;
  const text = [
    `NEW BOOKING ${b.ref}`,
    `Tour: ${b.tourName}`,
    `Option: ${b.optionText}`,
    `Date: ${niceDate(b.travelDate)}`,
    `Pickup: ${b.pickup}`,
    b.persons ? `Persons: ${b.persons}` : "",
    `Customer: ${b.name}`,
    `Email: ${b.email}`,
    `Mobile: ${b.phone || "Not given"}`,
  ].filter(Boolean).join("\n");
  return { subject, html: shell(cfg, `${b.name}, ${b.tourName}, ${niceDate(b.travelDate)}`, body), text };
}
