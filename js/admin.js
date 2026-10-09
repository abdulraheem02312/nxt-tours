// NXT Tours admin panel. Talks to Supabase with the public key + the logged-in person's session;
// the database security rules decide what each role can see or change, so this file holds no secrets.
// The Tours editor lives in admin-tours.js and uses the helpers shared on window.NXT (see the end).
(() => {
  const sb = window.supabase.createClient(BACKEND.url, BACKEND.key);
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const WHATSAPP_NUMBER = "971586272827";
  // Short codes used in booking references, same as the create-booking function
  const TOUR_CODES = { "abu-dhabi": "AD", dubai: "DXB", hatta: "HT", "desert-safari": "DS", khorfakkan: "KF" };

  let me = null; // { id, email, role }
  let bookings = [];
  let reviews = [];
  let tours = []; // rows from the tours table: { slug, data, visible, sort, updated_at, updated_by }
  let emailCfg = null; // owner only
  let bookingFilter = "new";
  let bookingsShown = 30; // how many booking cards are on screen ("Load more" adds 30)
  let reviewFilter = "pending";
  let knownBookingIds = null; // to spot new bookings between refreshes

  // ---------- helpers ----------
  const show = (name) => $$("[data-view]").forEach((v) => (v.hidden = v.dataset.view !== name));
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  let toastTimer;
  const toast = (msg, bad) => {
    const t = $("[data-toast]");
    t.textContent = msg;
    t.classList.toggle("is-bad", !!bad);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 3200);
  };
  const setError = (sel, msg) => {
    const e = $(sel);
    e.textContent = msg || "";
    e.hidden = !msg;
  };
  const fmtDate = (iso) =>
    new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const fmtTime = (iso) =>
    new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  // Dates follow the Dubai calendar (UTC+4), wherever the team member is
  const dubaiISO = (offsetDays = 0) => new Date(Date.now() + 4 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
  const daysUntil = (iso) => Math.round((new Date(iso + "T00:00:00Z") - new Date(dubaiISO() + "T00:00:00Z")) / 86400e3);
  const tourLabel = (t) => [t.data.name, t.data.accent].filter(Boolean).join(" ");
  const callFn = async (fn, payload) => {
    const { data: s } = await sb.auth.getSession();
    const res = await fetch(BACKEND.url + "/functions/v1/" + fn, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: BACKEND.key, Authorization: "Bearer " + (s.session ? s.session.access_token : "") },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong." }));
    if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  };
  const callTeam = (payload) => callFn("admin-team", payload);

  // ---------- login / session ----------
  async function start() {
    const { data } = await sb.auth.getSession();
    if (!data.session) return show("login");
    const user = data.session.user;
    if (user.user_metadata && user.user_metadata.must_change_password) return show("setpass");
    const { data: row, error } = await sb.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
    if (error || !row) return show("noaccess");
    me = { id: user.id, email: user.email, role: row.role };
    openApp();
  }

  $("[data-login-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter || $("[data-login-form] button");
    const email = $("[data-login-email]").value.trim();
    const password = $("[data-login-password]").value;
    if (!email || !password) return setError("[data-login-error]", "Please enter your email and password.");
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    if (error) return setError("[data-login-error]", "Wrong email or password.");
    setError("[data-login-error]", "");
    $("[data-login-password]").value = "";
    start();
  });

  const savePassword = async (p1, p2, errSel) => {
    if (p1.length < 10) return setError(errSel, "Please use at least 10 characters."), false;
    if (p1 !== p2) return setError(errSel, "The two passwords don't match."), false;
    const { error } = await sb.auth.updateUser({ password: p1, data: { must_change_password: false } });
    if (error) return setError(errSel, error.message || "Could not save the password."), false;
    setError(errSel, "");
    return true;
  };

  $("[data-setpass-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await savePassword($("[data-setpass-1]").value, $("[data-setpass-2]").value, "[data-setpass-error]");
    if (ok) {
      toast("Password saved");
      start();
    }
  });

  $$("[data-signout]").forEach((b) =>
    b.addEventListener("click", async () => {
      await sb.auth.signOut();
      me = null;
      show("login");
    })
  );

  // ---------- app shell ----------
  const canEdit = () => me && (me.role === "owner" || me.role === "editor");

  async function openApp() {
    show("app");
    $("[data-me-email]").textContent = me.email;
    // One role for the whole team (stored as "owner" in the database, shown as "Admin")
    $("[data-me-role]").textContent = "Admin";
    $("[data-account-who]").textContent = "Logged in as " + me.email + " (admin)";
    const tabs = $$("[data-tab]");
    tabs.forEach((t) => (t.hidden = !t.dataset.roles.split(" ").includes(me.role)));
    const first = tabs.find((t) => !t.hidden);
    selectTab(first.dataset.tab);
    if (canEdit()) {
      await loadTours();
      loadBookings();
    }
    if (me.role === "owner") loadEmailCfg().then(() => !$("[data-panel=home]").hidden && renderHome());
    loadReviews();
  }

  function selectTab(name) {
    $$("[data-tab]").forEach((t) => {
      t.classList.toggle("is-active", t.dataset.tab === name);
      t.setAttribute("aria-selected", t.dataset.tab === name ? "true" : "false");
    });
    $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
    if (name === "team") loadTeam();
    if (name === "home") renderHome();
    if (name === "calendar") loadBlocked();
    if (name === "settings") loadSettings();
    if (name === "activity") loadActivity();
    if (name === "tours" && window.NXT && NXT.openTours) NXT.openTours();
    window.scrollTo(0, 0);
  }
  $$("[data-tab]").forEach((t) => t.addEventListener("click", () => selectTab(t.dataset.tab)));
  $$("[data-refresh]").forEach((b) =>
    b.addEventListener("click", () => {
      if (canEdit()) loadBookings();
      loadReviews();
      toast("Updated");
    })
  );

  // Check for new bookings every 30 seconds while the panel is open
  setInterval(() => {
    if (!me) return;
    if (canEdit()) loadBookings(true);
    if (document.visibilityState === "visible") loadReviews(true);
  }, 30000);

  // ---------- tours (list used by the dashboard, manual bookings and blocked dates) ----------
  async function loadTours() {
    const { data, error } = await sb.from("tours").select("slug, data, visible, sort, updated_at, updated_by").order("sort");
    if (error) return toast("Could not load tours", true);
    tours = data || [];
    fillTourSelects();
  }

  function fillTourSelects() {
    const blockSel = $("[data-block-tour]");
    blockSel.textContent = "";
    blockSel.appendChild(new Option("All tours", ""));
    tours.forEach((t) => blockSel.appendChild(new Option(tourLabel(t), t.slug)));
    const mSel = $("[data-m-tour]");
    mSel.textContent = "";
    tours.forEach((t) => mSel.appendChild(new Option(tourLabel(t) + (t.visible ? "" : " (hidden)"), t.slug)));
  }

  // ---------- new booking alerts ----------
  let audioCtx = null;
  const beep = () => {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((delay) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + 0.15);
        o.connect(g).connect(audioCtx.destination);
        o.start(audioCtx.currentTime + delay);
        o.stop(audioCtx.currentTime + delay + 0.16);
      });
    } catch {
      /* sound is a nice-to-have */
    }
  };

  function announceNew(list) {
    list.forEach((b) => {
      toast("New booking " + b.ref + " from " + b.customer_name);
      if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification("New booking: " + b.tour_name, {
          body: b.customer_name + ", " + fmtDate(b.travel_date) + " (" + b.ref + ")",
          icon: "images/favicon.png",
          tag: b.ref,
        });
        n.onclick = () => {
          window.focus();
          selectTab("bookings");
        };
      }
    });
    beep();
  }

  const updateTitle = () => {
    const n = bookings.filter((b) => b.status === "new").length;
    document.title = (n ? "(" + n + ") " : "") + "NXT Tours Admin";
  };

  const alertsCard = $("[data-alerts-card]");
  alertsCard.hidden = !("Notification" in window) || Notification.permission !== "default";
  $("[data-alerts-on]").addEventListener("click", async () => {
    const p = await Notification.requestPermission();
    alertsCard.hidden = true;
    toast(p === "granted" ? "Pop-ups are on for this browser" : "Pop-ups were blocked in the browser", p !== "granted");
    beep(); // also unlocks sound in browsers that need a click first
  });

  // ---------- bookings ----------
  async function loadBookings(quiet) {
    const { data, error } = await sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(10000);
    if (error) {
      if (!quiet) toast("Could not load bookings", true);
      return;
    }
    bookings = data || [];
    const ids = new Set(bookings.map((b) => b.id));
    if (knownBookingIds) {
      const fresh = bookings.filter((b) => !knownBookingIds.has(b.id) && b.source !== "manual");
      if (fresh.length) announceNew(fresh);
    }
    knownBookingIds = ids;
    updateTitle();
    renderBookings();
    if (!$("[data-panel=home]").hidden) renderHome();
  }

  function renderBookings() {
    const counts = { new: 0, confirmed: 0, completed: 0, cancelled: 0, all: bookings.length };
    bookings.forEach((b) => counts[b.status]++);
    $$("[data-booking-filters] [data-status]").forEach((c) => {
      const s = c.dataset.status;
      c.textContent = c.textContent.replace(/\s*\(\d+\)$/, "") + " (" + counts[s] + ")";
    });
    const badge = $("[data-count=new]");
    badge.textContent = counts.new;
    badge.hidden = !counts.new;

    const list = filteredBookings();
    const box = $("[data-booking-list]");
    box.textContent = "";
    if (!list.length) {
      box.appendChild(el("p", "ad-empty", $("[data-booking-search]").value.trim() ? "No bookings match your search." : "No bookings here yet."));
      return;
    }
    // 30 at a time, so the page stays quick with thousands of bookings
    list.slice(0, bookingsShown).forEach((b) => box.appendChild(bookingCard(b)));
    box.appendChild(moreButton(list.length, bookingsShown, () => {
      bookingsShown += PAGE;
      renderBookings();
    }));
  }

  function filteredBookings() {
    const term = $("[data-booking-search]").value.trim().toLowerCase();
    let list = bookings.filter((b) => bookingFilter === "all" || b.status === bookingFilter);
    if (term) {
      list = list.filter((b) =>
        [b.ref, b.customer_name, b.customer_email || "", b.customer_phone || "", b.pickup].join(" ").toLowerCase().includes(term)
      );
    }
    if ($("[data-booking-sort]").value === "travel") list = list.slice().sort((a, b) => a.travel_date.localeCompare(b.travel_date));
    return list;
  }

  function kv(label, value, extra) {
    const d = el("div", "ad-kv");
    d.appendChild(el("span", null, label));
    const s = el("strong", null, value);
    d.appendChild(s);
    if (extra) d.appendChild(extra);
    return d;
  }

  function bookingCard(b) {
    const card = el("article", "ad-card");
    const head = el("div", "ad-bk-head");
    const left = el("div");
    left.appendChild(el("span", "ad-bk-ref", b.ref));
    left.appendChild(document.createTextNode("  "));
    left.appendChild(el("span", "ad-status " + b.status, b.status));
    if (b.source === "manual") {
      left.appendChild(document.createTextNode(" "));
      left.appendChild(el("span", "ad-pill-manual", "Added by hand"));
    }
    head.appendChild(left);
    head.appendChild(el("span", "ad-bk-when", (b.source === "manual" ? "Added " : "Received ") + fmtTime(b.created_at) + (b.created_by ? " by " + b.created_by : "")));
    card.appendChild(head);

    const grid = el("div", "ad-bk-grid");
    const d = daysUntil(b.travel_date);
    const soon = d >= 0 && d <= 3 ? el("span", "ad-soon", d === 0 ? "today" : d === 1 ? "tomorrow" : "in " + d + " days") : null;
    grid.appendChild(kv("Travel date", fmtDate(b.travel_date), soon));
    grid.appendChild(kv("Tour", b.tour_name));
    grid.appendChild(kv("Option", b.option_text));
    grid.appendChild(kv("Pickup", b.pickup));
    if (b.persons) grid.appendChild(kv("Persons", String(b.persons)));
    grid.appendChild(kv("Customer", b.customer_name));
    grid.appendChild(kv("Email", b.customer_email || "Not given"));
    grid.appendChild(kv("Mobile", b.customer_phone || "Not given"));
    card.appendChild(grid);

    const actions = el("div", "ad-bk-actions");
    const sel = el("select", "ad-select");
    sel.setAttribute("aria-label", "Status of " + b.ref);
    ["new", "confirmed", "completed", "cancelled"].forEach((s) => {
      const o = el("option", null, s.charAt(0).toUpperCase() + s.slice(1));
      o.value = s;
      if (s === b.status) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", async () => {
      const ok = await updateBooking(b, { status: sel.value }, "Status updated");
      if (ok && (sel.value === "confirmed" || sel.value === "cancelled")) {
        // Emails the customer only if "Status update" emails are switched on in Settings
        try {
          const r = await callFn("notify", { action: "status", bookingId: b.id });
          if (r.sent) toast("Status updated, customer emailed");
        } catch {
          /* status is saved either way */
        }
      }
    });
    actions.appendChild(sel);

    const phone = (b.customer_phone || "").replace(/\D/g, "");
    if (phone) {
      const wa = el("a", "ad-btn ad-btn-wa ad-btn-sm", "WhatsApp");
      wa.href = "https://wa.me/" + phone + "?text=" + encodeURIComponent("Hello " + b.customer_name + ", this is NXT Tours about your booking " + b.ref + " for the " + b.tour_name + " on " + fmtDate(b.travel_date) + ".");
      wa.target = "_blank";
      wa.rel = "noopener";
      actions.appendChild(wa);
    }
    if (b.customer_email) {
      const mail = el("a", "ad-btn ad-btn-ghost ad-btn-sm", "Email");
      mail.href = "mailto:" + b.customer_email + "?subject=" + encodeURIComponent("Your NXT Tours booking " + b.ref);
      actions.appendChild(mail);
    }
    // Delete for good (test bookings, spam). The Activity log keeps a red line with the details.
    const del = el("button", "ad-btn ad-btn-danger ad-btn-sm ad-bk-delete", "Delete");
    del.type = "button";
    del.addEventListener("click", async () => {
      if (!confirm("Delete booking " + b.ref + " for " + b.customer_name + "?\n\nIt will be removed for good and can't be brought back. The Activity log keeps a record of it.")) return;
      const { error } = await sb.from("bookings").delete().eq("id", b.id);
      if (error) return toast("Could not delete, please try again", true);
      bookings = bookings.filter((x) => x.id !== b.id);
      if (knownBookingIds) knownBookingIds.delete(b.id);
      toast("Booking " + b.ref + " deleted");
      updateTitle();
      renderBookings();
      if (!$("[data-panel=home]").hidden) renderHome();
    });
    actions.appendChild(del);
    card.appendChild(actions);

    const row = el("div", "ad-notes-row");
    const notes = el("textarea", "ad-notes");
    notes.placeholder = "Team notes (only visible here)";
    notes.value = b.team_notes || "";
    const save = el("button", "ad-btn ad-btn-ghost ad-btn-sm", "Save note");
    save.type = "button";
    save.addEventListener("click", () => updateBooking(b, { team_notes: notes.value.trim() || null }, "Note saved"));
    row.appendChild(notes);
    row.appendChild(save);
    card.appendChild(row);
    return card;
  }

  async function updateBooking(b, changes, okMsg) {
    const { error } = await sb.from("bookings").update(changes).eq("id", b.id);
    if (error) {
      toast("Could not save, please try again", true);
      return false;
    }
    Object.assign(b, changes);
    toast(okMsg);
    updateTitle();
    renderBookings();
    return true;
  }

  $$("[data-booking-filters] [data-status]").forEach((c) =>
    c.addEventListener("click", () => {
      bookingFilter = c.dataset.status;
      bookingsShown = PAGE;
      $$("[data-booking-filters] [data-status]").forEach((x) => x.classList.toggle("is-active", x === c));
      renderBookings();
    })
  );
  const resetBookings = () => {
    bookingsShown = PAGE;
    renderBookings();
  };
  $("[data-booking-search]").addEventListener("input", resetBookings);
  $("[data-booking-sort]").addEventListener("change", resetBookings);

  // ---- Download the current list as a spreadsheet (CSV opens in Excel / Google Sheets) ----
  $("[data-booking-csv]").addEventListener("click", () => {
    const list = filteredBookings();
    if (!list.length) return toast("Nothing to download in this list", true);
    const cols = [
      ["Reference", "ref"], ["Status", "status"], ["Source", "source"], ["Received", "created_at"], ["Travel date", "travel_date"],
      ["Tour", "tour_name"], ["Option", "option_text"], ["Persons", "persons"], ["Pickup", "pickup"], ["Customer", "customer_name"],
      ["Email", "customer_email"], ["Mobile", "customer_phone"], ["Team notes", "team_notes"],
    ];
    const cell = (v) => {
      const s = v == null ? "" : String(v);
      // a leading = + - @ would run as a formula in Excel
      const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const lines = [cols.map((c) => cell(c[0])).join(",")].concat(
      list.map((b) => cols.map(([, k]) => cell(k === "created_at" ? fmtTime(b[k]) : b[k])).join(","))
    );
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = el("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nxt-bookings-" + bookingFilter + "-" + dubaiISO() + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  // ---- Add a booking by hand ----
  const mDialog = $("[data-manual-dialog]");
  const mTour = $("[data-m-tour]");
  const mOption = $("[data-m-option]");
  const money = (n) => "AED " + (Number.isInteger(n) ? n : Number(n).toFixed(2));

  function fillOptions() {
    const t = tours.find((x) => x.slug === mTour.value);
    mOption.textContent = "";
    if (!t) return;
    const d = t.data;
    if (!/private only/i.test(d.type || "")) {
      const o = new Option("Sharing, " + money(d.price) + " / person", "sharing");
      o.dataset.kind = "sharing";
      mOption.appendChild(o);
    }
    (d.privateTiers || []).forEach((tier) => {
      const o = new Option("Private " + tier.seats + "-seater, " + money(tier.price), "private-" + tier.seats);
      o.dataset.kind = "private";
      mOption.appendChild(o);
    });
    if (!(d.privateTiers || []).length && /private/i.test(d.type || "")) {
      const o = new Option("Private" + (/private only/i.test(d.type) ? ", " + money(d.price) : ""), "private");
      o.dataset.kind = "private";
      mOption.appendChild(o);
    }
    syncPersons();
  }
  const optionKind = () => (mOption.selectedOptions[0] ? mOption.selectedOptions[0].dataset.kind : "sharing");
  const syncPersons = () => ($("[data-m-persons-field]").hidden = optionKind() !== "sharing");
  mTour.addEventListener("change", fillOptions);
  mOption.addEventListener("change", syncPersons);

  $("[data-booking-add]").addEventListener("click", () => {
    $("[data-manual-form]").reset();
    setError("[data-manual-error]", "");
    if (tours.length) mTour.value = tours[0].slug;
    fillOptions();
    $("[data-m-date]").min = dubaiISO();
    $("[data-m-date]").value = dubaiISO(1);
    mDialog.showModal();
  });
  $("[data-manual-close]").addEventListener("click", () => mDialog.close());

  const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const makeRef = (slug) => {
    const code = TOUR_CODES[slug] || slug.split("-").map((w) => w[0]).join("").toUpperCase().slice(0, 4);
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    return "NXT-" + code + "-" + Array.from(bytes, (b) => REF_CHARS[b % REF_CHARS.length]).join("");
  };

  $("[data-manual-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = tours.find((x) => x.slug === mTour.value);
    const kind = optionKind();
    const v = (s) => $(s).value.trim();
    const rec = {
      source: "manual",
      tour_slug: t ? t.slug : "",
      tour_name: t ? tourLabel(t) : "",
      option_kind: kind,
      option_text: mOption.selectedOptions[0] ? mOption.selectedOptions[0].textContent : "",
      travel_date: v("[data-m-date]"),
      pickup: v("[data-m-pickup]"),
      persons: kind === "sharing" ? Math.round(Number(v("[data-m-persons]"))) : null,
      customer_name: v("[data-m-name]"),
      customer_email: v("[data-m-email]").toLowerCase() || null,
      customer_phone: v("[data-m-phone]") || null,
      status: $("[data-m-status]").value,
      team_notes: v("[data-m-notes]") || null,
    };
    const missing = !t ? "Please choose a tour." : !rec.travel_date ? "Please choose the travel date." : !rec.pickup ? "Please enter the pickup point or hotel." : rec.customer_name.length < 2 ? "Please enter the customer's name." : kind === "sharing" && !(rec.persons >= 1 && rec.persons <= 60) ? "Persons must be between 1 and 60." : rec.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rec.customer_email) ? "That email doesn't look right." : "";
    if (missing) return setError("[data-manual-error]", missing);
    const btn = e.submitter || $("[data-manual-form] [type=submit]");
    btn.disabled = true;
    let saved = null;
    for (let i = 0; i < 4 && !saved; i++) {
      rec.ref = makeRef(rec.tour_slug);
      const { error } = await sb.from("bookings").insert(rec);
      if (!error) saved = rec.ref;
      else if (error.code !== "23505") break;
    }
    btn.disabled = false;
    if (!saved) return setError("[data-manual-error]", "Could not save the booking. Please try again.");
    mDialog.close();
    toast("Booking " + saved + " added");
    loadBookings(true);
  });

  // ---------- dashboard ----------
  function renderHome() {
    const stats = $("[data-stats]");
    stats.textContent = "";
    const today = dubaiISO();
    const week = dubaiISO(6);
    const active = bookings.filter((b) => b.status !== "cancelled");
    const upcoming = active.filter((b) => b.travel_date >= today && b.travel_date <= week);
    const receivedToday = bookings.filter((b) => new Date(new Date(b.created_at).getTime() + 4 * 3600e3).toISOString().slice(0, 10) === today).length;
    const pendingReviews = reviews.filter((r) => !r.approved).length;
    const people = upcoming.reduce((n, b) => n + (b.persons || 0), 0);
    const tile = (num, label, sub, tab, tone) => {
      const t = el("button", "ad-stat" + (tone ? " is-" + tone : ""));
      t.type = "button";
      t.appendChild(el("strong", null, String(num)));
      t.appendChild(el("span", null, label));
      if (sub) t.appendChild(el("small", null, sub));
      t.addEventListener("click", () => {
        if (tab === "bookings-new") {
          bookingFilter = "new";
          $$("[data-booking-filters] [data-status]").forEach((x) => x.classList.toggle("is-active", x.dataset.status === "new"));
          renderBookings();
          selectTab("bookings");
        } else selectTab(tab);
      });
      stats.appendChild(t);
    };
    tile(bookings.filter((b) => b.status === "new").length, "New bookings", "waiting for you to confirm", "bookings-new", "accent");
    tile(receivedToday, "Received today", null, "bookings");
    tile(upcoming.length, "Tours in the next 7 days", people ? people + " people on sharing tours" : null, "bookings");
    tile(pendingReviews, "Reviews to approve", null, "reviews", pendingReviews ? "primary" : "");

    // Email reminder for the owner while team alerts are off
    const note = $("[data-email-note]");
    if (me.role === "owner" && emailCfg && !(emailCfg.team_alert_on && emailCfg.team_emails)) {
      note.textContent = "";
      note.appendChild(el("strong", null, "New-booking emails to the team are off. "));
      note.appendChild(document.createTextNode("Bookings still arrive here, with a pop-up while this panel is open. Once the company mailbox exists, add it in Settings > Emails and switch the alert on."));
      note.hidden = false;
    } else note.hidden = true;

    const box = $("[data-upcoming]");
    box.textContent = "";
    if (!upcoming.length) {
      box.appendChild(el("p", "ad-empty", "No tours booked for the next 7 days yet."));
      return;
    }
    const byDate = {};
    upcoming.sort((a, b) => a.travel_date.localeCompare(b.travel_date)).forEach((b) => (byDate[b.travel_date] = byDate[b.travel_date] || []).push(b));
    Object.keys(byDate).forEach((date) => {
      const card = el("div", "ad-card ad-day");
      const d = daysUntil(date);
      const h = el("h4", null, fmtDate(date));
      h.appendChild(el("span", "ad-soon", d === 0 ? "today" : d === 1 ? "tomorrow" : "in " + d + " days"));
      card.appendChild(h);
      byDate[date].forEach((b) => {
        const r = el("div", "ad-day-row");
        r.appendChild(el("span", "ad-status " + b.status, b.status));
        r.appendChild(el("strong", null, b.customer_name));
        r.appendChild(el("span", null, b.tour_name + (b.persons ? ", " + b.persons + " pers." : "") + ", " + b.option_text));
        r.appendChild(el("small", null, b.pickup + "  ·  " + b.ref));
        card.appendChild(r);
      });
      box.appendChild(card);
    });
  }

  // ---------- reviews ----------
  async function loadReviews(quiet) {
    const { data, error } = await sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) {
      if (!quiet) toast("Could not load reviews", true);
      return;
    }
    reviews = data || [];
    renderReviews();
    if (canEdit() && !$("[data-panel=home]").hidden) renderHome();
  }

  function renderReviews() {
    const pending = reviews.filter((r) => !r.approved).length;
    const badge = $("[data-count=pending]");
    badge.textContent = pending;
    badge.hidden = !pending;
    const counts = { pending, approved: reviews.length - pending, all: reviews.length };
    $$("[data-review-filters] [data-filter]").forEach((c) => {
      c.textContent = c.textContent.replace(/\s*\(\d+\)$/, "") + " (" + counts[c.dataset.filter] + ")";
    });

    const list = reviews.filter((r) => reviewFilter === "all" || (reviewFilter === "pending" ? !r.approved : r.approved));
    const box = $("[data-review-list]");
    box.textContent = "";
    if (!list.length) {
      box.appendChild(el("p", "ad-empty", reviewFilter === "pending" ? "No reviews waiting for approval." : "No reviews here yet."));
      return;
    }
    list.forEach((r) => {
      const card = el("article", "ad-card");
      const head = el("div", "ad-rv-head");
      head.appendChild(el("strong", null, r.name));
      const stars = el("span", "ad-stars", "★".repeat(r.rating));
      stars.appendChild(el("span", null, "★".repeat(5 - r.rating)));
      stars.setAttribute("aria-label", r.rating + " out of 5 stars");
      head.appendChild(stars);
      head.appendChild(el("span", r.approved ? "ad-pill-ok" : "ad-pill-wait", r.approved ? "Approved" : "Waiting"));
      head.appendChild(el("span", "ad-bk-when", r.tour_name + " · " + fmtTime(r.created_at)));
      card.appendChild(head);
      card.appendChild(el("p", "ad-rv-text", r.text));

      const actions = el("div", "ad-row-actions");
      const toggle = el("button", r.approved ? "ad-btn ad-btn-ghost ad-btn-sm" : "ad-btn ad-btn-ok ad-btn-sm", r.approved ? "Hide from website" : "Approve");
      toggle.type = "button";
      toggle.addEventListener("click", async () => {
        const { error } = await sb.from("reviews").update({ approved: !r.approved }).eq("id", r.id);
        if (error) return toast("Could not save, please try again", true);
        r.approved = !r.approved;
        toast(r.approved ? "Review approved, it now shows on the website" : "Review hidden");
        renderReviews();
      });
      const del = el("button", "ad-btn ad-btn-danger ad-btn-sm", "Delete");
      del.type = "button";
      del.addEventListener("click", async () => {
        if (!confirm("Delete this review from " + r.name + "? This can't be undone.")) return;
        const { error } = await sb.from("reviews").delete().eq("id", r.id);
        if (error) return toast("Could not delete, please try again", true);
        reviews = reviews.filter((x) => x.id !== r.id);
        toast("Review deleted");
        renderReviews();
      });
      actions.appendChild(toggle);
      actions.appendChild(del);
      card.appendChild(actions);
      box.appendChild(card);
    });
  }

  $$("[data-review-filters] [data-filter]").forEach((c) =>
    c.addEventListener("click", () => {
      reviewFilter = c.dataset.filter;
      $$("[data-review-filters] [data-filter]").forEach((x) => x.classList.toggle("is-active", x === c));
      renderReviews();
    })
  );

  // ---------- blocked dates ----------
  // A month calendar: tap open days to mark them (orange), tap blocked days (red) to mark them for
  // unblocking, then Save does all of it at once. Works per tour, or for "All tours".
  let blockedRows = []; // upcoming blocked_dates rows
  let bcalMonth = null; // first day of the month shown, as "YYYY-MM-01"
  const toBlock = new Set();
  const toUnblock = new Set(); // ids of rows to delete
  const bcalTour = () => $("[data-block-tour]").value || null;

  async function loadBlocked() {
    $("[data-block-from]").min = $("[data-block-to]").min = dubaiISO();
    const { data, error } = await sb.from("blocked_dates").select("*").gte("date", dubaiISO()).order("date");
    if (error) return toast("Could not load blocked dates", true);
    blockedRows = data || [];
    if (!bcalMonth) bcalMonth = dubaiISO().slice(0, 8) + "01";
    renderBcal();
    renderBlockedList();
  }

  function renderBcal() {
    const tour = bcalTour();
    const today = dubaiISO();
    const first = new Date(bcalMonth + "T00:00:00Z");
    $("[data-bcal-month]").textContent = first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    $("[data-bcal-prev]").disabled = bcalMonth <= today.slice(0, 8) + "01";
    const grid = $("[data-bcal-grid]");
    grid.textContent = "";
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    for (let i = 0; i < lead; i++) grid.appendChild(el("span"));
    const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    for (let n = 1; n <= days; n++) {
      const iso = bcalMonth.slice(0, 8) + String(n).padStart(2, "0");
      const own = blockedRows.find((r) => r.date === iso && r.tour_slug === tour); // blocked for the chosen tour
      const all = tour && blockedRows.find((r) => r.date === iso && r.tour_slug === null); // blocked for every tour
      const b = el("button", "ad-bday");
      b.type = "button";
      b.appendChild(el("span", null, String(n)));
      const label = new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
      if (iso < today) {
        b.disabled = true;
        b.classList.add("is-past");
      } else if (all) {
        b.disabled = true;
        b.classList.add("is-all");
        b.title = "Blocked for all tours" + (all.note ? ": " + all.note : "") + '. Choose "All tours" to change it.';
      } else if (own) {
        b.classList.add(toUnblock.has(own.id) ? "is-remove" : "is-blocked");
        b.title = [own.public_reason && "Customers see: " + own.public_reason, own.note && "Team: " + own.note, "Tap to unblock"].filter(Boolean).join(". ");
        b.addEventListener("click", () => {
          toUnblock.has(own.id) ? toUnblock.delete(own.id) : toUnblock.add(own.id);
          renderBcal();
        });
      } else {
        if (toBlock.has(iso)) b.classList.add("is-new");
        b.title = "Tap to block";
        b.addEventListener("click", () => {
          toBlock.has(iso) ? toBlock.delete(iso) : toBlock.add(iso);
          renderBcal();
        });
      }
      if (iso === today) b.classList.add("is-today");
      b.setAttribute("aria-label", label);
      b.setAttribute("aria-pressed", b.classList.contains("is-new") || b.classList.contains("is-remove") ? "true" : "false");
      grid.appendChild(b);
    }
    const parts = [];
    if (toBlock.size) parts.push(toBlock.size + (toBlock.size === 1 ? " day" : " days") + " to block");
    if (toUnblock.size) parts.push(toUnblock.size + (toUnblock.size === 1 ? " day" : " days") + " to unblock");
    $("[data-bcal-summary]").textContent = parts.length ? parts.join(", ") : "Tap the days you want to block.";
    $("[data-bcal-save]").disabled = !parts.length;
    $("[data-bcal-clear]").hidden = !parts.length;
  }

  function renderBlockedList() {
    const box = $("[data-block-list]");
    box.textContent = "";
    if (!blockedRows.length) {
      box.appendChild(el("p", "ad-empty", "No blocked days. Every day can be booked."));
      return;
    }
    blockedRows.forEach((b) => {
      const card = el("div", "ad-card ad-block-item");
      const who = el("div");
      who.appendChild(el("strong", null, fmtDate(b.date)));
      const t = tours.find((x) => x.slug === b.tour_slug);
      who.appendChild(el("span", "ad-pill-wait", t ? tourLabel(t) : "All tours"));
      if (b.public_reason) who.appendChild(el("span", "ad-pill-public", "Customers see: " + b.public_reason));
      if (b.note) who.appendChild(el("span", "ad-muted", "Team: " + b.note));
      card.appendChild(who);
      const del = el("button", "ad-btn ad-btn-ghost ad-btn-sm", "Unblock");
      del.type = "button";
      del.addEventListener("click", async () => {
        const { error: err } = await sb.from("blocked_dates").delete().eq("id", b.id);
        if (err) return toast("Could not unblock, please try again", true);
        toast("Day unblocked");
        loadBlocked();
      });
      card.appendChild(del);
      box.appendChild(card);
    });
  }

  const shiftMonth = (dir) => {
    const d = new Date(bcalMonth + "T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + dir);
    bcalMonth = d.toISOString().slice(0, 8) + "01";
    renderBcal();
  };
  $("[data-bcal-prev]").addEventListener("click", () => shiftMonth(-1));
  $("[data-bcal-next]").addEventListener("click", () => shiftMonth(1));
  $("[data-block-tour]").addEventListener("change", () => {
    // marks belong to one tour; switching tours starts fresh
    toBlock.clear();
    toUnblock.clear();
    renderBcal();
  });
  $("[data-bcal-clear]").addEventListener("click", () => {
    toBlock.clear();
    toUnblock.clear();
    renderBcal();
  });
  $("[data-bcal-save]").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    setError("[data-block-error]", "");
    const tour = bcalTour();
    const note = $("[data-block-note]").value.trim() || null;
    const publicReason = $("[data-block-public]").value.trim() || null;
    let ok = true;
    if (toBlock.size) {
      const { error } = await sb.from("blocked_dates").insert([...toBlock].sort().map((date) => ({ date, tour_slug: tour, note, public_reason: publicReason })));
      if (error) ok = false;
    }
    if (ok && toUnblock.size) {
      const { error } = await sb.from("blocked_dates").delete().in("id", [...toUnblock]);
      if (error) ok = false;
    }
    if (!ok) {
      btn.disabled = false;
      return setError("[data-block-error]", "Could not save. Please try again.");
    }
    const msg = [toBlock.size && toBlock.size + " blocked", toUnblock.size && toUnblock.size + " unblocked"].filter(Boolean).join(", ");
    toBlock.clear();
    toUnblock.clear();
    toast("Saved: " + msg);
    loadBlocked();
  });

  // Long stretch: every day from - to, for the tour chosen above
  $("[data-block-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const from = $("[data-block-from]").value;
    const to = $("[data-block-to]").value || from;
    const tour = bcalTour();
    const note = $("[data-block-note]").value.trim() || null;
    const publicReason = $("[data-block-public]").value.trim() || null;
    if (!from) return setError("[data-block-error]", "Please choose the first day.");
    if (to < from) return setError("[data-block-error]", "The 'To' day is before the 'From' day.");
    const days = [];
    for (let d = new Date(from + "T00:00:00Z"); d <= new Date(to + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
    if (days.length > 92) return setError("[data-block-error]", "Please block at most 3 months at a time.");
    setError("[data-block-error]", "");
    const taken = new Set(blockedRows.filter((x) => x.tour_slug === tour).map((x) => x.date));
    const rows = days.filter((d) => !taken.has(d)).map((date) => ({ date, tour_slug: tour, note, public_reason: publicReason }));
    if (!rows.length) return toast("Already blocked");
    const { error } = await sb.from("blocked_dates").insert(rows);
    if (error) return setError("[data-block-error]", "Could not save. Please try again.");
    $("[data-block-form]").reset();
    toast(rows.length === 1 ? "Day blocked" : rows.length + " days blocked");
    bcalMonth = from.slice(0, 8) + "01";
    loadBlocked();
  });

  // ---------- settings (owner) ----------
  const cutoffSel = $("[data-set-cutoff]");
  for (let h = 0; h < 24; h++) cutoffSel.appendChild(new Option((h % 12 || 12) + ":00 " + (h < 12 ? "AM" : "PM"), String(h)));

  async function loadEmailCfg() {
    const { data } = await sb.from("email_settings").select("*").eq("id", 1).maybeSingle();
    emailCfg = data;
    return data;
  }

  async function loadSettings() {
    const [{ data: site }, mail] = await Promise.all([sb.from("site_settings").select("*").eq("id", 1).maybeSingle(), loadEmailCfg()]);
    if (site) {
      $("[data-set-whatsapp]").value = site.whatsapp || "";
      $("[data-set-phone]").value = site.phone || "";
      $("[data-set-email]").value = site.email || "";
      cutoffSel.value = String(site.cutoff_hour);
      $("[data-set-offer-on]").checked = site.offer_on;
      $("[data-set-offer-text]").value = site.offer_text || "";
    }
    if (mail) {
      $("[data-set-team]").value = mail.team_emails || "";
      $("[data-set-team-on]").checked = mail.team_alert_on;
      $("[data-set-status-on]").checked = mail.status_on;
      $("[data-set-reminder-on]").checked = mail.reminder_on;
      $("[data-set-review-on]").checked = mail.review_request_on;
    }
  }

  $("[data-site-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const wa = $("[data-set-whatsapp]").value.replace(/\D/g, "");
    const email = $("[data-set-email]").value.trim();
    const offerOn = $("[data-set-offer-on]").checked;
    const offerText = $("[data-set-offer-text]").value.trim();
    const problem = wa.length < 8 ? "Please enter the WhatsApp number with the country code, e.g. 971586272827." : email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? "The email doesn't look right." : offerOn && !offerText ? "Please write the offer text, or switch the banner off." : "";
    if (problem) return setError("[data-site-error]", problem);
    setError("[data-site-error]", "");
    const { error } = await sb.from("site_settings").update({
      whatsapp: wa,
      phone: $("[data-set-phone]").value.trim() || null,
      email: email || null,
      cutoff_hour: Number(cutoffSel.value),
      offer_on: offerOn,
      offer_text: offerText || null,
    }).eq("id", 1);
    if (error) return setError("[data-site-error]", "Could not save. Please try again.");
    toast("Website settings saved");
  });

  const teamList = () => $("[data-set-team]").value.split(/[,\s;]+/).map((s) => s.trim()).filter(Boolean);
  $("[data-email-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const list = teamList();
    const bad = list.find((s) => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s));
    if (bad) return setError("[data-email-error]", "This email doesn't look right: " + bad);
    if ($("[data-set-team-on]").checked && !list.length) return setError("[data-email-error]", "Add the team email first, or switch the new booking alert off.");
    setError("[data-email-error]", "");
    const { error } = await sb.from("email_settings").update({
      team_emails: list.join(", ") || null,
      team_alert_on: $("[data-set-team-on]").checked,
      status_on: $("[data-set-status-on]").checked,
      reminder_on: $("[data-set-reminder-on]").checked,
      review_request_on: $("[data-set-review-on]").checked,
    }).eq("id", 1);
    if (error) return setError("[data-email-error]", "Could not save. Please try again.");
    await loadEmailCfg();
    toast("Email settings saved");
  });

  $("[data-email-test]").addEventListener("click", async (e) => {
    const list = teamList();
    if (!list.length) return setError("[data-email-error]", "Type the team email first.");
    e.currentTarget.disabled = true;
    try {
      await callFn("notify", { action: "test", to: list.join(",") });
      setError("[data-email-error]", "");
      toast("Test email sent to " + list.join(", "));
    } catch (err) {
      setError("[data-email-error]", err.message);
    } finally {
      e.currentTarget.disabled = false;
    }
  });

  // ---------- activity (owner) ----------
  // The log keeps the newest 2,000 changes. They are loaded once and shown 30 at a time
  // ("Load more" adds the next 30), with filters by person and by kind of change.
  const PAGE = 30;
  let activity = [];
  let activityShown = PAGE;
  const ACTIVITY_KINDS = {
    tours: (a) => /tour/i.test(a.action),
    bookings: (a) => /booking/i.test(a.action),
    reviews: (a) => /review/i.test(a.action),
    dates: (a) => /date/i.test(a.action),
    settings: (a) => /settings/i.test(a.action),
    team: (a) => /team/i.test(a.action),
  };

  async function loadActivity() {
    const { data, error } = await sb.from("activity_log").select("*").order("at", { ascending: false }).limit(2000);
    if (error) return toast("Could not load the activity", true);
    activity = data || [];
    activityShown = PAGE;
    const who = $("[data-activity-who]");
    const keep = who.value;
    who.textContent = "";
    who.appendChild(new Option("Everyone", ""));
    [...new Set(activity.map((a) => a.actor))].sort().forEach((p) => who.appendChild(new Option(p, p)));
    who.value = keep;
    renderActivity();
  }

  function renderActivity() {
    const who = $("[data-activity-who]").value;
    const kind = $("[data-activity-kind]").value;
    const list = activity.filter((a) => (!who || a.actor === who) && (!kind || ACTIVITY_KINDS[kind](a)));
    const box = $("[data-activity-list]");
    box.textContent = "";
    if (!list.length) {
      box.appendChild(el("p", "ad-empty", activity.length ? "No changes match these filters." : "Nothing yet. Changes made in this panel will show up here."));
      return;
    }
    const table = el("div", "ad-card ad-log");
    list.slice(0, activityShown).forEach((a) => {
      const r = el("div", "ad-log-row" + (/^(Deleted|Removed)/.test(a.action) ? " is-danger" : ""));
      r.appendChild(el("span", "ad-log-when", fmtTime(a.at)));
      r.appendChild(el("span", "ad-log-who", a.actor));
      const what = el("span", "ad-log-what");
      what.appendChild(el("strong", null, a.action + (a.target ? ": " + a.target : "")));
      const d = a.details;
      // New entries: a list of readable lines. Older entries: { field: true } or { key: value }.
      const lines = d && Array.isArray(d.changes) ? d.changes : d ? Object.entries(d).map(([k, v]) => (v === true ? k + " changed" : k + ": " + v)) : [];
      if (lines.length) {
        const ul = el("ul", "ad-log-changes");
        lines.forEach((t) => ul.appendChild(el("li", null, t)));
        what.appendChild(ul);
      }
      r.appendChild(what);
      table.appendChild(r);
    });
    box.appendChild(table);
    box.appendChild(moreButton(list.length, activityShown, () => {
      activityShown += PAGE;
      renderActivity();
    }));
  }

  // "Showing 30 of 412 · Load more" under a list
  function moreButton(total, shown, onMore) {
    const wrap = el("div", "ad-more");
    wrap.appendChild(el("span", "ad-muted", "Showing " + Math.min(shown, total) + " of " + total));
    if (shown < total) {
      const b = el("button", "ad-btn ad-btn-ghost", "Load more");
      b.type = "button";
      b.addEventListener("click", onMore);
      wrap.appendChild(b);
    }
    return wrap;
  }

  $("[data-activity-refresh]").addEventListener("click", loadActivity);
  ["[data-activity-who]", "[data-activity-kind]"].forEach((s) =>
    $(s).addEventListener("change", () => {
      activityShown = PAGE;
      renderActivity();
    })
  );

  // ---------- team (owner only) ----------
  const loginUrl = () => location.origin + location.pathname;

  function showSecret(email, password) {
    $("[data-secret-email]").textContent = email;
    $("[data-secret-text]").textContent = "Email: " + email + "\nTemporary password: " + password;
    $("[data-secret-url]").textContent = loginUrl();
    $("[data-team-secret]").hidden = false;
    $("[data-team-secret]").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  $("[data-secret-copy]").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("[data-secret-text]").textContent + "\nLogin page: " + loginUrl());
      toast("Copied");
    } catch {
      toast("Select the text and copy it by hand", true);
    }
  });

  async function loadTeam() {
    try {
      const data = await callTeam({ action: "list" });
      renderTeam(data.team);
    } catch (err) {
      toast(err.message, true);
    }
  }

  function renderTeam(team) {
    const box = $("[data-team-list]");
    box.textContent = "";
    team.forEach((m) => {
      const card = el("div", "ad-card ad-member");
      const who = el("div", "ad-member-who");
      who.appendChild(el("strong", null, (m.email || "(no email saved)") + (m.user_id === me.id ? " (you)" : "")));
      who.appendChild(el("small", null, "Added " + fmtTime(m.created_at)));
      card.appendChild(who);

      card.appendChild(el("span", "ad-role-pill", "Admin"));

      if (m.user_id !== me.id) {
        const reset = el("button", "ad-btn ad-btn-ghost ad-btn-sm", "Reset password");
        reset.type = "button";
        reset.addEventListener("click", async () => {
          if (!confirm("Give " + m.email + " a new temporary password? Their old password will stop working.")) return;
          try {
            const data = await callTeam({ action: "reset", userId: m.user_id });
            showSecret(data.email, data.password);
          } catch (err) {
            toast(err.message, true);
          }
        });
        const remove = el("button", "ad-btn ad-btn-danger ad-btn-sm", "Remove");
        remove.type = "button";
        remove.addEventListener("click", async () => {
          if (!confirm("Remove " + m.email + " from the team? They won't be able to log in any more.")) return;
          try {
            const data = await callTeam({ action: "remove", userId: m.user_id });
            toast("Removed");
            renderTeam(data.team);
          } catch (err) {
            toast(err.message, true);
          }
        });
        card.appendChild(reset);
        card.appendChild(remove);
      }
      box.appendChild(card);
    });
  }

  $("[data-team-add]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter || $("[data-team-add] button");
    const email = $("[data-team-email]").value.trim();
    const role = "owner"; // one role: everyone is an admin
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setError("[data-team-error]", "Please enter a valid email.");
    setError("[data-team-error]", "");
    btn.disabled = true;
    try {
      const data = await callTeam({ action: "add", email, role });
      $("[data-team-email]").value = "";
      renderTeam(data.team);
      showSecret(data.email, data.password);
    } catch (err) {
      setError("[data-team-error]", err.message);
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- account ----------
  $("[data-account-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("[data-account-ok]").hidden = true;
    const ok = await savePassword($("[data-account-1]").value, $("[data-account-2]").value, "[data-account-error]");
    if (ok) {
      $("[data-account-1]").value = "";
      $("[data-account-2]").value = "";
      $("[data-account-ok]").hidden = false;
    }
  });

  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") show("login");
  });

  // Shared with admin-tours.js
  window.NXT = {
    sb, $, $$, el, toast, setError, fmtTime, tourLabel,
    me: () => me,
    tours: () => tours,
    reloadTours: async () => {
      await loadTours();
      return tours;
    },
  };

  start();
})();
