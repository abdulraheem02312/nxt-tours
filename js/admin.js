// NXT Tours admin panel. Talks to Supabase with the public key + the logged-in person's session;
// the database security rules decide what each role can see or change, so this file holds no secrets.
(() => {
  const sb = window.supabase.createClient(BACKEND.url, BACKEND.key);
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const WHATSAPP_NUMBER = "971586272827";

  let me = null; // { id, email, role }
  let bookings = [];
  let reviews = [];
  let bookingFilter = "new";
  let reviewFilter = "pending";

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
  const daysUntil = (iso) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso + "T00:00:00") - today) / 86400e3);
  };
  const callTeam = async (payload) => {
    const { data: s } = await sb.auth.getSession();
    const res = await fetch(BACKEND.url + "/functions/v1/admin-team", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: BACKEND.key, Authorization: "Bearer " + (s.session ? s.session.access_token : "") },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong." }));
    if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  };

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
  function openApp() {
    show("app");
    $("[data-me-email]").textContent = me.email;
    $("[data-me-role]").textContent = me.role;
    $("[data-account-who]").textContent = "Logged in as " + me.email + " (" + me.role + ")";
    const tabs = $$("[data-tab]");
    tabs.forEach((t) => (t.hidden = !t.dataset.roles.split(" ").includes(me.role)));
    const first = tabs.find((t) => !t.hidden);
    selectTab(first.dataset.tab);
    if (me.role !== "reviewer") loadBookings();
    loadReviews();
  }

  function selectTab(name) {
    $$("[data-tab]").forEach((t) => {
      t.classList.toggle("is-active", t.dataset.tab === name);
      t.setAttribute("aria-selected", t.dataset.tab === name ? "true" : "false");
    });
    $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
    if (name === "team") loadTeam();
  }
  $$("[data-tab]").forEach((t) => t.addEventListener("click", () => selectTab(t.dataset.tab)));
  $$("[data-refresh]").forEach((b) =>
    b.addEventListener("click", () => {
      if (me.role !== "reviewer") loadBookings();
      loadReviews();
      toast("Updated");
    })
  );

  // Check for new bookings every minute while the panel is open and visible
  setInterval(() => {
    if (me && document.visibilityState === "visible") {
      if (me.role !== "reviewer") loadBookings(true);
      loadReviews(true);
    }
  }, 60000);

  // ---------- bookings ----------
  async function loadBookings(quiet) {
    const { data, error } = await sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) {
      if (!quiet) toast("Could not load bookings", true);
      return;
    }
    bookings = data || [];
    renderBookings();
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

    const term = $("[data-booking-search]").value.trim().toLowerCase();
    let list = bookings.filter((b) => bookingFilter === "all" || b.status === bookingFilter);
    if (term) {
      list = list.filter((b) =>
        [b.ref, b.customer_name, b.customer_email, b.customer_phone || "", b.pickup].join(" ").toLowerCase().includes(term)
      );
    }
    if ($("[data-booking-sort]").value === "travel") list = list.slice().sort((a, b) => a.travel_date.localeCompare(b.travel_date));

    const box = $("[data-booking-list]");
    box.textContent = "";
    if (!list.length) {
      box.appendChild(el("p", "ad-empty", term ? "No bookings match your search." : "No bookings here yet."));
      return;
    }
    list.forEach((b) => box.appendChild(bookingCard(b)));
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
    head.appendChild(left);
    head.appendChild(el("span", "ad-bk-when", "Received " + fmtTime(b.created_at)));
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
    grid.appendChild(kv("Email", b.customer_email));
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
    sel.addEventListener("change", () => updateBooking(b, { status: sel.value }, "Status updated"));
    actions.appendChild(sel);

    const phone = (b.customer_phone || "").replace(/\D/g, "");
    if (phone) {
      const wa = el("a", "ad-btn ad-btn-wa ad-btn-sm", "WhatsApp");
      wa.href = "https://wa.me/" + phone + "?text=" + encodeURIComponent("Hello " + b.customer_name + ", this is NXT Tours about your booking " + b.ref + " for the " + b.tour_name + " on " + fmtDate(b.travel_date) + ".");
      wa.target = "_blank";
      wa.rel = "noopener";
      actions.appendChild(wa);
    }
    const mail = el("a", "ad-btn ad-btn-ghost ad-btn-sm", "Email");
    mail.href = "mailto:" + b.customer_email + "?subject=" + encodeURIComponent("Your NXT Tours booking " + b.ref);
    actions.appendChild(mail);
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
    if (error) return toast("Could not save, please try again", true);
    Object.assign(b, changes);
    toast(okMsg);
    renderBookings();
  }

  $$("[data-booking-filters] [data-status]").forEach((c) =>
    c.addEventListener("click", () => {
      bookingFilter = c.dataset.status;
      $$("[data-booking-filters] [data-status]").forEach((x) => x.classList.toggle("is-active", x === c));
      renderBookings();
    })
  );
  $("[data-booking-search]").addEventListener("input", renderBookings);
  $("[data-booking-sort]").addEventListener("change", renderBookings);

  // ---------- reviews ----------
  async function loadReviews(quiet) {
    const { data, error } = await sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) {
      if (!quiet) toast("Could not load reviews", true);
      return;
    }
    reviews = data || [];
    renderReviews();
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

      const sel = el("select", "ad-select");
      sel.setAttribute("aria-label", "Role for " + (m.email || "member"));
      ["owner", "editor", "reviewer"].forEach((r) => {
        const o = el("option", null, r.charAt(0).toUpperCase() + r.slice(1));
        o.value = r;
        if (r === m.role) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", async () => {
        try {
          const data = await callTeam({ action: "role", userId: m.user_id, role: sel.value });
          toast("Role updated");
          if (m.user_id === me.id && sel.value !== "owner") return location.reload();
          renderTeam(data.team);
        } catch (err) {
          toast(err.message, true);
          sel.value = m.role;
        }
      });
      card.appendChild(sel);

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
    const role = $("[data-team-role]").value;
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

  start();
})();
