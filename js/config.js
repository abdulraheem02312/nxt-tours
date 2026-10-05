// Shared settings for the website and the admin panel.

// Always use the secure address: http://nxttours.com -> https://nxttours.com (backup for the
// "Enforce HTTPS" switch in the GitHub Pages settings, which only the repo owner can turn on)
if (location.protocol === "http:" && /(^|\.)nxttours\.com$/.test(location.hostname)) {
  location.replace("https://" + location.host + location.pathname + location.search + location.hash);
}

// Supabase backend (bookings, reviews, admin panel). The publishable key is MEANT to be public: on its own it can
// only do what the database security rules allow (add a review, read approved reviews, call the
// create-booking function). Never put the secret / service_role key here.
const BACKEND = {
  url: "https://gqlceqeinyfdjbshmacb.supabase.co",
  key: "sb_publishable_J9l-V7Moj1nFF8L0reZP4Q_PoTsxK7M",
};
