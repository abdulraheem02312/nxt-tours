// NXT Tours admin panel: the Tours editor. Uses the helpers admin.js shares on window.NXT.
// Each tour is one row in the "tours" table: data = the same object the website used to have in
// js/script.js (TOURS), so the website shows exactly what is saved here. Every save keeps the
// previous version (tour_versions), which can be restored from the History box.
(() => {
  const { sb, $, el, toast, fmtTime, tourLabel } = window.NXT;
  const home = $("[data-tours-home]");
  const box = $("[data-tour-editor]");
  const TYPES = ["Sharing & Private", "Sharing Only", "Private Only"];

  let current = null; // the tour row being edited
  let draft = null; // a copy of its data, changed by the form, saved with the Save button
  let draftVisible = true;
  let dirty = false;

  // ---------- small helpers ----------
  const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const setPath = (obj, path, value) => {
    const keys = path.split(".");
    const last = keys.pop();
    let o = obj;
    keys.forEach((k) => {
      if (typeof o[k] !== "object" || o[k] == null) o[k] = {};
      o = o[k];
    });
    // Empty = remove the field, so the website simply leaves that part out
    if (value === "" || value == null || (Array.isArray(value) && !value.length)) delete o[last];
    else o[last] = value;
  };
  const markDirty = () => {
    dirty = true;
    const bar = $("[data-te-bar]");
    if (bar) bar.classList.add("is-dirty");
    const st = $("[data-te-state]");
    if (st) st.textContent = "Unsaved changes";
  };
  const btn = (label, cls, onClick, title) => {
    const b = el("button", "ad-btn " + (cls || "ad-btn-ghost ad-btn-sm"), label);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", onClick);
    return b;
  };
  const iconBtn = (label, title, onClick) => {
    const b = btn(label, "ad-icon-btn", onClick, title);
    b.setAttribute("aria-label", title);
    return b;
  };
  const move = (arr, i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return false;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return true;
  };

  // A labelled input bound to draft[path]
  function field(label, path, opts = {}) {
    const wrap = el("label", "ad-field" + (opts.wide ? " ad-span-2" : ""));
    wrap.appendChild(document.createTextNode(label));
    const input = opts.textarea ? el("textarea", "ad-notes") : el("input");
    if (!opts.textarea) input.type = opts.type || "text";
    if (opts.type === "number") {
      input.step = "0.01";
      input.min = "0";
    }
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.rows) input.rows = opts.rows;
    const v = getPath(draft, path);
    input.value = v == null ? "" : String(v);
    input.addEventListener("input", () => {
      const raw = input.value;
      setPath(draft, path, opts.type === "number" ? (raw.trim() === "" ? "" : Number(raw)) : opts.textarea ? raw : raw.trim() === "" ? "" : raw);
      markDirty();
    });
    if (opts.help) wrap.appendChild(el("small", "ad-help", opts.help));
    wrap.appendChild(input);
    return wrap;
  }

  // A list of short texts edited as "one per line"
  function linesField(label, path, help) {
    const wrap = el("label", "ad-field ad-span-2");
    wrap.appendChild(document.createTextNode(label));
    if (help) wrap.appendChild(el("small", "ad-help", help));
    const ta = el("textarea", "ad-notes ad-lines");
    ta.rows = 5;
    ta.value = (getPath(draft, path) || []).join("\n");
    ta.addEventListener("input", () => {
      setPath(draft, path, ta.value.split("\n").map((s) => s.trim()).filter(Boolean));
      markDirty();
    });
    wrap.appendChild(ta);
    return wrap;
  }

  function section(title, sub, open) {
    const d = el("details", "ad-card ad-te-section");
    if (open) d.open = true;
    const s = el("summary");
    s.appendChild(el("strong", null, title));
    if (sub) s.appendChild(el("span", "ad-muted", sub));
    d.appendChild(s);
    const body = el("div", "ad-te-body");
    d.appendChild(body);
    return { d, body };
  }

  // ---------- list of tours ----------
  function renderList() {
    const list = $("[data-tour-list]");
    list.textContent = "";
    window.NXT.tours().forEach((t) => {
      const card = el("article", "ad-card ad-tour-card");
      const img = el("div", "ad-tour-thumb");
      const first = (t.data.photos || [])[0];
      if (first) {
        const im = el("img");
        im.src = first.src;
        im.alt = "";
        im.loading = "lazy";
        img.appendChild(im);
      }
      card.appendChild(img);
      const info = el("div", "ad-tour-info");
      const h = el("h3", null, tourLabel(t));
      info.appendChild(h);
      const meta = el("p", "ad-muted");
      meta.textContent = "From AED " + t.data.price + "  ·  " + (t.data.type || "") + "  ·  " + (t.data.photos || []).length + " photos";
      info.appendChild(meta);
      info.appendChild(el("span", t.visible ? "ad-pill-ok" : "ad-pill-wait", t.visible ? "Shown on website" : "Hidden"));
      if (t.updated_by && t.updated_by !== "website") info.appendChild(el("small", "ad-muted ad-block", "Last saved " + fmtTime(t.updated_at) + " by " + t.updated_by));
      const actions = el("div", "ad-row-actions");
      actions.appendChild(btn("Edit", "ad-btn-primary ad-btn-sm", () => openEditor(t.slug)));
      const view = el("a", "ad-btn ad-btn-ghost ad-btn-sm", "View on website");
      view.href = "tour.html?t=" + encodeURIComponent(t.slug);
      view.target = "_blank";
      view.rel = "noopener";
      actions.appendChild(view);
      info.appendChild(actions);
      card.appendChild(info);
      list.appendChild(card);
    });
  }

  // ---------- editor ----------
  function openEditor(slug) {
    current = window.NXT.tours().find((t) => t.slug === slug);
    if (!current) return;
    draft = structuredClone(current.data);
    draftVisible = current.visible;
    dirty = false;
    home.hidden = true;
    box.hidden = false;
    renderEditor();
    window.scrollTo(0, 0);
  }

  function closeEditor(force) {
    if (dirty && !force && !confirm("You have unsaved changes. Leave without saving?")) return false;
    dirty = false;
    current = draft = null;
    box.hidden = true;
    box.textContent = "";
    home.hidden = false;
    renderList();
    return true;
  }

  function renderEditor() {
    box.textContent = "";
    // Header
    const head = el("div", "ad-panel-head");
    const left = el("div");
    left.appendChild(btn("← All tours", "ad-btn-ghost ad-btn-sm", () => closeEditor()));
    left.appendChild(el("h2", "ad-te-title", tourLabel({ data: draft })));
    head.appendChild(left);
    const view = el("a", "ad-btn ad-btn-ghost ad-btn-sm", "View on website");
    view.href = "tour.html?t=" + encodeURIComponent(current.slug);
    view.target = "_blank";
    view.rel = "noopener";
    head.appendChild(view);
    box.appendChild(head);

    // Show / hide
    const vis = el("label", "ad-card ad-switch ad-te-visible");
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = draftVisible;
    cb.addEventListener("change", () => {
      draftVisible = cb.checked;
      markDirty();
    });
    vis.appendChild(cb);
    const vt = el("span");
    vt.appendChild(el("strong", null, "Show this tour on the website"));
    vt.appendChild(el("small", "ad-muted ad-block", "Switch off to hide it everywhere (cards, tour page, booking) without deleting anything."));
    vis.appendChild(vt);
    box.appendChild(vis);

    box.appendChild(basicsSection());
    box.appendChild(pricesSection());
    box.appendChild(includedSection());
    box.appendChild(timelineSection());
    box.appendChild(pickupSection());
    box.appendChild(photosSection());
    box.appendChild(historySection());

    // Sticky save bar
    const bar = el("div", "ad-te-bar");
    bar.dataset.teBar = "";
    const state = el("span", "ad-te-state", "All changes saved");
    state.dataset.teState = "";
    bar.appendChild(state);
    bar.appendChild(btn("Discard changes", "ad-btn-ghost ad-btn-sm", () => {
      if (!dirty || confirm("Throw away your unsaved changes?")) openEditor(current.slug);
    }));
    bar.appendChild(btn("Save and publish", "ad-btn-primary", save));
    box.appendChild(bar);
  }

  // ---------- sections ----------
  function basicsSection() {
    const { d, body } = section("Name and text", "Title, intro, highlights, pickup line", true);
    const g = el("div", "ad-form-grid");
    g.appendChild(field("Name (first word, e.g. Abu Dhabi)", "name"));
    g.appendChild(field("Second part (e.g. City Tour)", "accent"));
    const typeWrap = el("label", "ad-field");
    typeWrap.appendChild(document.createTextNode("Tour type"));
    const sel = el("select");
    const types = TYPES.includes(draft.type) || !draft.type ? TYPES : TYPES.concat(draft.type);
    types.forEach((t) => sel.appendChild(new Option(t, t)));
    sel.value = draft.type || TYPES[0];
    sel.addEventListener("change", () => {
      draft.type = sel.value;
      markDirty();
    });
    typeWrap.appendChild(sel);
    g.appendChild(typeWrap);
    g.appendChild(field("Duration", "duration", { placeholder: "e.g. Full day, 7:30 AM to 9:00 PM" }));
    g.appendChild(field("Page title, first part", "heroTitle.prefix", { placeholder: "Best of Abu Dhabi:" }));
    g.appendChild(field("Page title, coloured part", "heroTitle.accent", { placeholder: "Full-Day City Tour from Dubai" }));
    g.appendChild(field("About this experience", "intro", { textarea: true, wide: true, rows: 5 }));
    g.appendChild(linesField("Highlights", "points", "One per line. Shown as ticks under the description and on the tour cards."));
    g.appendChild(field("Pickup line (short)", "pickupFact", { placeholder: "Free pickup & drop-off in Dubai" }));
    g.appendChild(field("“No hidden costs” card text", "costNote"));
    g.appendChild(field("Pickup card title", "pickupCard.title", { placeholder: "Free Pickup in Dubai" }));
    g.appendChild(field("Pickup card text", "pickupCard.text"));
    body.appendChild(g);
    return d;
  }

  function pricesSection() {
    const { d, body } = section("Prices", "Sharing price per person, private prices per vehicle", true);
    const g = el("div", "ad-form-grid");
    g.appendChild(field("Price in AED (sharing, per person)", "price", { type: "number", help: "For a private-only tour, the starting price." }));
    g.appendChild(field("Old price in AED (shown crossed out)", "was", { type: "number", help: "Leave empty for no crossed-out price." }));
    g.appendChild(field("Line under private prices", "privateNote", { wide: true, placeholder: "Custom packages available" }));
    body.appendChild(g);

    body.appendChild(el("h4", "ad-te-sub", "Private tour prices (per vehicle)"));
    const rows = el("div", "ad-te-rows");
    body.appendChild(rows);
    const draw = () => {
      rows.textContent = "";
      const tiers = draft.privateTiers || [];
      if (!tiers.length) rows.appendChild(el("p", "ad-muted", "No private prices. Add one if this tour can be booked privately."));
      tiers.forEach((t, i) => {
        const r = el("div", "ad-te-row ad-te-tier");
        const seats = el("input");
        seats.type = "number";
        seats.min = "1";
        seats.value = t.seats;
        seats.setAttribute("aria-label", "Seats");
        seats.addEventListener("input", () => {
          t.seats = Number(seats.value);
          markDirty();
        });
        const price = el("input");
        price.type = "number";
        price.min = "0";
        price.step = "0.01";
        price.value = t.price;
        price.setAttribute("aria-label", "Price in AED");
        price.addEventListener("input", () => {
          t.price = Number(price.value);
          markDirty();
        });
        r.appendChild(el("span", null, "Seats"));
        r.appendChild(seats);
        r.appendChild(el("span", null, "AED"));
        r.appendChild(price);
        r.appendChild(iconBtn("✕", "Remove this price", () => {
          tiers.splice(i, 1);
          if (!tiers.length) delete draft.privateTiers;
          markDirty();
          draw();
        }));
        rows.appendChild(r);
      });
    };
    draw();
    body.appendChild(btn("+ Add private price", "ad-btn-ghost ad-btn-sm", () => {
      draft.privateTiers = draft.privateTiers || [];
      draft.privateTiers.push({ seats: 7, price: 0 });
      markDirty();
      draw();
    }));
    return d;
  }

  function includedSection() {
    const { d, body } = section("Included, not included, notes", "The lists under the timeline");
    const g = el("div", "ad-form-grid");
    g.appendChild(linesField("What's included", "included", "One per line."));
    g.appendChild(linesField("Not included", "notIncluded", "One per line."));
    g.appendChild(linesField("Important notes", "notes", "One per line."));
    body.appendChild(g);
    return d;
  }

  // Photo chooser used by timeline rows: pick one of this tour's photos, or none
  function photoSelect(current, onPick) {
    const sel = el("select");
    sel.appendChild(new Option("No photo", ""));
    (draft.photos || []).forEach((p, i) => sel.appendChild(new Option((i + 1) + ". " + (p.cap || p.alt || "Photo"), p.src)));
    sel.value = current || "";
    if (current && sel.value !== current) {
      sel.appendChild(new Option("(current photo)", current));
      sel.value = current;
    }
    sel.addEventListener("change", () => onPick(sel.value));
    return sel;
  }

  function timelineSection() {
    const { d, body } = section("Timeline (hour by hour)", "Stops, times and what happens at each");
    body.appendChild(el("p", "ad-muted", "“Travel” rows (pickup, drive back) get a van icon and no photo. Photos come from the Photos section below."));
    const rows = el("div", "ad-te-rows");
    body.appendChild(rows);
    const draw = () => {
      rows.textContent = "";
      const tl = draft.timeline || [];
      if (!tl.length) rows.appendChild(el("p", "ad-muted", "No timeline yet. Add the first stop below."));
      tl.forEach((s, i) => {
        const card = el("div", "ad-te-stop" + (s.kind === "travel" ? " is-travel" : ""));
        const top = el("div", "ad-te-stop-top");
        top.appendChild(el("span", "ad-te-num", String(i + 1)));
        const time = el("input");
        time.value = s.time || "";
        time.placeholder = "9:30 AM";
        time.setAttribute("aria-label", "Time");
        time.className = "ad-te-time";
        time.addEventListener("input", () => {
          s.time = time.value;
          markDirty();
        });
        const title = el("input");
        title.value = s.title || "";
        title.placeholder = "Stop name";
        title.setAttribute("aria-label", "Stop name");
        title.className = "ad-te-name";
        title.addEventListener("input", () => {
          s.title = title.value;
          markDirty();
        });
        const kind = el("select");
        kind.appendChild(new Option("Stop", ""));
        kind.appendChild(new Option("Travel", "travel"));
        kind.value = s.kind === "travel" ? "travel" : "";
        kind.setAttribute("aria-label", "Row type");
        kind.addEventListener("change", () => {
          if (kind.value) s.kind = "travel";
          else delete s.kind;
          markDirty();
          draw();
        });
        top.appendChild(time);
        top.appendChild(title);
        top.appendChild(kind);
        const tools = el("div", "ad-te-tools");
        tools.appendChild(iconBtn("↑", "Move up", () => move(tl, i, -1) && (markDirty(), draw())));
        tools.appendChild(iconBtn("↓", "Move down", () => move(tl, i, 1) && (markDirty(), draw())));
        tools.appendChild(iconBtn("✕", "Remove this row", () => {
          if (!confirm("Remove “" + (s.title || "this row") + "” from the timeline?")) return;
          tl.splice(i, 1);
          markDirty();
          draw();
        }));
        top.appendChild(tools);
        card.appendChild(top);

        const g = el("div", "ad-form-grid");
        const small = (label, key, ph) => {
          const w = el("label", "ad-field");
          w.appendChild(document.createTextNode(label));
          const inp = el("input");
          inp.value = s[key] || "";
          inp.placeholder = ph || "";
          inp.addEventListener("input", () => {
            if (inp.value.trim()) s[key] = inp.value;
            else delete s[key];
            markDirty();
          });
          w.appendChild(inp);
          return w;
        };
        if (s.kind !== "travel") {
          g.appendChild(small("Place (optional)", "place", "e.g. Yas Island"));
          g.appendChild(small("How long (optional)", "dur", "e.g. 30 min photo stop"));
        }
        const tw = el("label", "ad-field ad-span-2");
        tw.appendChild(document.createTextNode("What happens here"));
        const ta = el("textarea", "ad-notes");
        ta.rows = 2;
        ta.value = s.text || "";
        ta.addEventListener("input", () => {
          s.text = ta.value;
          markDirty();
        });
        tw.appendChild(ta);
        g.appendChild(tw);
        if (s.kind !== "travel") {
          const pw = el("label", "ad-field ad-span-2 ad-te-photo-pick");
          pw.appendChild(document.createTextNode("Photo"));
          const prev = el("img", "ad-te-mini");
          prev.alt = "";
          const setPrev = () => {
            prev.hidden = !s.src;
            if (s.src) prev.src = s.src;
          };
          setPrev();
          pw.appendChild(photoSelect(s.src, (src) => {
            if (src) {
              const p = (draft.photos || []).find((x) => x.src === src);
              s.src = src;
              s.alt = (p && p.alt) || s.title;
            } else {
              delete s.src;
              delete s.alt;
            }
            setPrev();
            markDirty();
          }));
          pw.appendChild(prev);
          g.appendChild(pw);
        }
        card.appendChild(g);
        rows.appendChild(card);
      });
    };
    draw();
    body.appendChild(btn("+ Add a row", "ad-btn-ghost ad-btn-sm", () => {
      draft.timeline = draft.timeline || [];
      draft.timeline.push({ time: "", title: "", text: "" });
      markDirty();
      draw();
    }));
    return d;
  }

  function pickupSection() {
    const { d, body } = section("Pickup points", "Areas, points and time windows (sharing tours)");
    const g = el("div", "ad-form-grid");
    g.appendChild(field("Note above the pickup list", "pickupNote", { textarea: true, wide: true, rows: 2 }));
    body.appendChild(g);
    const areasBox = el("div", "ad-te-rows");
    body.appendChild(areasBox);
    const draw = () => {
      areasBox.textContent = "";
      const areas = draft.pickupAreas || [];
      if (!areas.length) areasBox.appendChild(el("p", "ad-muted", "No pickup list. Customers type their pickup place instead."));
      areas.forEach((a, ai) => {
        const card = el("div", "ad-te-area");
        const top = el("div", "ad-te-stop-top");
        const name = el("input");
        name.value = a.area || "";
        name.placeholder = "Area name, e.g. Deira";
        name.className = "ad-te-name";
        name.setAttribute("aria-label", "Area name");
        name.addEventListener("input", () => {
          a.area = name.value;
          markDirty();
        });
        top.appendChild(name);
        const tools = el("div", "ad-te-tools");
        tools.appendChild(iconBtn("↑", "Move area up", () => move(areas, ai, -1) && (markDirty(), draw())));
        tools.appendChild(iconBtn("↓", "Move area down", () => move(areas, ai, 1) && (markDirty(), draw())));
        tools.appendChild(iconBtn("✕", "Remove this area", () => {
          if (!confirm("Remove the area “" + (a.area || "") + "” and all its points?")) return;
          areas.splice(ai, 1);
          if (!areas.length) delete draft.pickupAreas;
          markDirty();
          draw();
        }));
        top.appendChild(tools);
        card.appendChild(top);
        (a.points || []).forEach((p, pi) => {
          const r = el("div", "ad-te-row ad-te-point");
          const place = el("input");
          place.value = p[0] || "";
          place.placeholder = "Pickup point";
          place.setAttribute("aria-label", "Pickup point");
          place.addEventListener("input", () => {
            p[0] = place.value;
            markDirty();
          });
          const time = el("input");
          time.value = p[1] || "";
          time.placeholder = "8:00 - 8:15 AM";
          time.setAttribute("aria-label", "Pickup time");
          time.addEventListener("input", () => {
            p[1] = time.value;
            markDirty();
          });
          r.appendChild(place);
          r.appendChild(time);
          r.appendChild(iconBtn("↑", "Move up", () => move(a.points, pi, -1) && (markDirty(), draw())));
          r.appendChild(iconBtn("↓", "Move down", () => move(a.points, pi, 1) && (markDirty(), draw())));
          r.appendChild(iconBtn("✕", "Remove this point", () => {
            a.points.splice(pi, 1);
            markDirty();
            draw();
          }));
          card.appendChild(r);
        });
        card.appendChild(btn("+ Add a point", "ad-btn-ghost ad-btn-sm", () => {
          a.points = a.points || [];
          a.points.push(["", ""]);
          markDirty();
          draw();
        }));
        areasBox.appendChild(card);
      });
    };
    draw();
    body.appendChild(btn("+ Add an area", "ad-btn-ghost ad-btn-sm", () => {
      draft.pickupAreas = draft.pickupAreas || [];
      draft.pickupAreas.push({ area: "", points: [["", ""]] });
      markDirty();
      draw();
    }));
    return d;
  }

  // Shrink a photo in the browser before uploading: max 1600px wide, WebP (JPEG if the browser
  // can't make WebP). Keeps the site fast and the free storage lasting.
  async function shrink(file) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    let blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp") blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob;
  }

  function photosSection() {
    const { d, body } = section("Photos", "The gallery at the top of the tour page and the card slider");
    body.appendChild(el("p", "ad-muted", "The first photo is the main one. Photos are made smaller automatically when you upload them."));
    const grid = el("div", "ad-te-photos");
    body.appendChild(grid);
    const draw = () => {
      grid.textContent = "";
      const photos = draft.photos || [];
      photos.forEach((p, i) => {
        const card = el("div", "ad-te-photo");
        const im = el("img");
        im.src = p.src;
        im.alt = "";
        im.loading = "lazy";
        card.appendChild(im);
        if (i === 0) card.appendChild(el("span", "ad-te-main", "Main photo"));
        const cap = el("input");
        cap.value = p.cap || "";
        cap.placeholder = "Caption, e.g. Qasr Al Watan";
        cap.setAttribute("aria-label", "Caption");
        cap.addEventListener("input", () => {
          p.cap = cap.value;
          markDirty();
        });
        const alt = el("input");
        alt.value = p.alt || "";
        alt.placeholder = "Describe the photo (for Google)";
        alt.setAttribute("aria-label", "Photo description");
        alt.addEventListener("input", () => {
          p.alt = alt.value;
          markDirty();
        });
        card.appendChild(cap);
        card.appendChild(alt);
        const tools = el("div", "ad-te-tools");
        tools.appendChild(iconBtn("←", "Move left", () => move(photos, i, -1) && (markDirty(), draw())));
        tools.appendChild(iconBtn("→", "Move right", () => move(photos, i, 1) && (markDirty(), draw())));
        if (i > 0) tools.appendChild(btn("Make main", "ad-btn-ghost ad-btn-sm", () => {
          photos.unshift(photos.splice(i, 1)[0]);
          markDirty();
          draw();
        }));
        tools.appendChild(iconBtn("✕", "Remove this photo", () => {
          if (photos.length === 1) return toast("A tour needs at least one photo", true);
          if (!confirm("Remove this photo from the tour?")) return;
          photos.splice(i, 1);
          markDirty();
          draw();
        }));
        card.appendChild(tools);
        grid.appendChild(card);
      });
    };
    draw();

    const up = el("label", "ad-btn ad-btn-primary ad-btn-sm ad-upload");
    up.appendChild(document.createTextNode("+ Upload photos"));
    const file = el("input");
    file.type = "file";
    file.accept = "image/jpeg,image/png,image/webp";
    file.multiple = true;
    up.appendChild(file);
    const status = el("span", "ad-muted");
    file.addEventListener("change", async () => {
      const files = Array.from(file.files || []);
      file.value = "";
      let done = 0;
      for (const f of files) {
        status.textContent = "Uploading " + (done + 1) + " of " + files.length + "...";
        try {
          const blob = await shrink(f);
          const ext = blob.type === "image/webp" ? "webp" : "jpg";
          const path = current.slug + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + ext;
          const { error } = await sb.storage.from("tour-photos").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
          if (error) throw error;
          const src = sb.storage.from("tour-photos").getPublicUrl(path).data.publicUrl;
          draft.photos = draft.photos || [];
          draft.photos.push({ src, alt: "", cap: f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ") });
          done++;
          markDirty();
          draw();
        } catch (err) {
          console.error(err);
          toast("Could not upload " + f.name + ". Please use a JPG or PNG photo.", true);
        }
      }
      status.textContent = done ? done + " photo" + (done === 1 ? "" : "s") + " added. Remember to save." : "";
    });
    const row = el("div", "ad-row-actions");
    row.appendChild(up);
    row.appendChild(status);
    body.appendChild(row);
    return d;
  }

  function historySection() {
    const { d, body } = section("History (undo)", "Earlier saved versions of this tour");
    const list = el("div", "ad-te-history");
    body.appendChild(list);
    d.addEventListener("toggle", async () => {
      if (!d.open) return;
      list.textContent = "Loading...";
      const { data, error } = await sb.from("tour_versions").select("id, saved_at, saved_by, data, visible").eq("slug", current.slug).order("saved_at", { ascending: false }).limit(40);
      list.textContent = "";
      if (error) return list.appendChild(el("p", "ad-error", "Could not load the history."));
      if (!data.length) return list.appendChild(el("p", "ad-muted", "No earlier versions yet. Each time you save, the version before it is kept here."));
      data.forEach((v) => {
        const r = el("div", "ad-te-row ad-te-version");
        r.appendChild(el("span", null, "Version from " + fmtTime(v.saved_at) + (v.saved_by && v.saved_by !== "website" ? " (saved by " + v.saved_by + ")" : "")));
        r.appendChild(btn("Restore", "ad-btn-ghost ad-btn-sm", async () => {
          if (!confirm("Put this version back on the website? The current version is kept in the history too.")) return;
          const { error: err } = await sb.from("tours").update({ data: v.data, visible: v.visible }).eq("slug", current.slug);
          if (err) return toast("Could not restore, please try again", true);
          toast("Version restored");
          await window.NXT.reloadTours();
          dirty = false;
          openEditor(current.slug);
        }));
        list.appendChild(r);
      });
    });
    return d;
  }

  // ---------- save ----------
  function problems() {
    if (!String(draft.name || "").trim()) return "The tour needs a name.";
    if (!(Number(draft.price) > 0)) return "Please enter the price.";
    if (!(draft.photos || []).length) return "The tour needs at least one photo.";
    if ((draft.privateTiers || []).some((t) => !(t.seats > 0) || !(t.price > 0))) return "Each private price needs seats and a price.";
    const tl = draft.timeline || [];
    const badRow = tl.findIndex((s) => !String(s.time || "").trim() || !String(s.title || "").trim());
    if (badRow >= 0) return "Timeline row " + (badRow + 1) + " needs a time and a name.";
    const badPoint = (draft.pickupAreas || []).find((a) => !String(a.area || "").trim() || (a.points || []).some((p) => !String(p[0] || "").trim()));
    if (badPoint) return "Each pickup area needs a name, and each point needs a place.";
    return "";
  }

  async function save() {
    const p = problems();
    if (p) return toast(p, true);
    // tidy: drop empty pickup point rows, keep numbers as numbers
    (draft.pickupAreas || []).forEach((a) => (a.points = (a.points || []).filter((pt) => String(pt[0] || "").trim())));
    draft.price = Number(draft.price);
    if (draft.was !== undefined) draft.was = Number(draft.was);
    const { error } = await sb.from("tours").update({ data: draft, visible: draftVisible }).eq("slug", current.slug);
    if (error) {
      console.error(error);
      return toast("Could not save. Please try again.", true);
    }
    dirty = false;
    toast("Saved. The website shows the new version now.");
    const slug = current.slug;
    await window.NXT.reloadTours();
    openEditor(slug);
  }

  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  window.NXT.openTours = () => {
    if (!current) renderList();
  };
})();
