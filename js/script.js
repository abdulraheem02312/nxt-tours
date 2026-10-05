// =========================================================
// NXT Tours: Shared behavior for all pages
// =========================================================

// Confirms JS actually ran. See .no-js fallback in style.css,
// which keeps .fade-up content visible if this script never loads/runs
document.documentElement.classList.remove("no-js");

// Navbar: turns into transparent glass once the user scrolls down (.scrolled).
// It also checks what is right UNDER the bar: over a dark section (hero photo, crimson
// strip, black section, footer) it gets .on-dark and keeps white text + white logo;
// over a light section the text and logo turn dark instead.
const navbar = document.querySelector(".navbar");
const DARK_SECTIONS = ".hero, .page-hero, .stats-strip, .cta-strip, .spotlight-dark, .matte-section, footer";
let navTicking = false;

const updateNavbar = () => {
  // Is a dark section behind the middle of the bar? Measured by position, which also works
  // on the very first run while the page is still loading (elementsFromPoint missed it then).
  const y = navbar.offsetHeight / 2;
  const isDark = Array.from(document.querySelectorAll(DARK_SECTIONS)).some((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top <= y && r.bottom >= y;
  });

  // At the very top of EVERY page the bar has no background; the glass only appears after 40px
  // of scrolling. Over a light top (tour.html's white header) the text and logo still turn dark
  // (that follows .on-dark alone, see style.css), so it stays readable without the glass.
  navbar.classList.toggle("scrolled", window.scrollY > 40);
  navbar.classList.toggle("on-dark", isDark);

  navTicking = false;
};

window.addEventListener(
  "scroll",
  () => {
    if (!navTicking) {
      navTicking = true;
      requestAnimationFrame(updateNavbar);
    }
  },
  { passive: true }
);
window.addEventListener("resize", updateNavbar);
updateNavbar();

// Mobile menu toggle
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.classList.toggle("active", isOpen);
    navToggle.setAttribute("aria-expanded", isOpen);
  });

  // Close mobile menu when a link is clicked
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Fade-up animation: reveal elements as they scroll into view
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add("in-view");
        observer.unobserve(el);
        // The .stagger delay (0.1s, 0.2s, 0.3s...) is only wanted for the entrance.
        // Once the entrance is over, remove it, or later hover effects on cards
        // 3, 4, 5... would react late.
        setTimeout(() => { el.style.transitionDelay = "0s"; }, 1500);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));

// Footer year, auto-updates so it never goes stale
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Contact form: there is no backend, so pressing the button opens WhatsApp
// (the client's number) with the whole inquiry already typed into the message.
// The visitor just presses Send there. Nothing is sent until they do.
let WHATSAPP_NUMBER = "971586272827"; // replaced by the number saved in the admin panel, if different

// Settings the team can change in the admin panel. These are the defaults; they are replaced by
// the saved values when the live data loads (see loadLiveData further down).
const SITE = {
  cutoffHour: 18, // tomorrow can be booked until 6 PM Dubai time
  blocked: [], // [{ date: "2026-12-02", tour_slug: null | "abu-dhabi" }]
};

// BACKEND (Supabase URL + public key) is defined in js/config.js, loaded before this file.
// OPTIONAL email copy: put the client's email between the quotes to ALSO get every inquiry
// by email (sent through the free formsubmit.co service; no account needed, but the client
// must click the "activate" link in the first email FormSubmit sends). Empty = WhatsApp only.
const INQUIRY_EMAIL = "";
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  // Tell visitors the truth about what the button does
  const formNote = contactForm.querySelector(".form-note");
  if (INQUIRY_EMAIL && formNote) {
    formNote.textContent = "Pressing the button emails your inquiry to our team and opens WhatsApp so we can chat right away.";
  }

  // Travel date can't be in the past
  const dateInput = contactForm.elements["date"];
  if (dateInput) {
    const now = new Date();
    dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = (name) => (contactForm.elements[name] ? contactForm.elements[name].value.trim() : "");

    // Build the message line by line (optional fields are skipped when empty)
    const lines = ["Hello NXT Tours!", "", "Name: " + val("name"), "Phone: " + val("phone")];
    if (val("email")) lines.push("Email: " + val("email"));
    lines.push("Tour: " + val("tour"));
    if (val("date")) lines.push("Travel date: " + val("date"));
    if (val("guests")) lines.push("Guests: " + val("guests"));
    lines.push("", "Message:", val("message"));

    // Email copy (only when INQUIRY_EMAIL is filled in). If it fails, WhatsApp still opens.
    if (INQUIRY_EMAIL) {
      fetch("https://formsubmit.co/ajax/" + INQUIRY_EMAIL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "New NXT Tours inquiry from " + val("name"),
          _template: "table",
          name: val("name"),
          phone: val("phone"),
          email: val("email"),
          tour: val("tour"),
          travel_date: val("date"),
          guests: val("guests"),
          message: val("message"),
        }),
      }).catch(() => {});
    }

    const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
    window.open(url, "_blank", "noopener");

    // Confirmation + a backup link in case the browser blocked the new tab
    const status = document.getElementById("form-status");
    status.textContent = "WhatsApp is opening with your message ready. Just press Send there. ";
    const backup = document.createElement("a");
    backup.href = url;
    backup.target = "_blank";
    backup.rel = "noopener";
    backup.textContent = "Nothing opened? Tap here.";
    status.appendChild(backup);
  });
}

// Chat demo (Contact banner): messages pop in one by one, incoming ones show typing
// dots first, then everything fades out and the chat starts over. Only plays while
// visible. With reduced motion (or no IntersectionObserver) it just shows the full chat.
const chatDemo = document.querySelector("[data-chat]");
if (chatDemo) {
  const chatMsgs = chatDemo.querySelectorAll(".msg");
  let chatTimers = [];

  const stopChat = () => {
    chatTimers.forEach(clearTimeout);
    chatTimers = [];
  };

  const playChat = () => {
    stopChat();
    chatMsgs.forEach((m) => m.classList.remove("on", "done"));
    chatMsgs.forEach((m) => {
      chatTimers.push(setTimeout(() => m.classList.add("on"), Number(m.dataset.show)));
      if (m.dataset.done) {
        chatTimers.push(setTimeout(() => m.classList.add("done"), Number(m.dataset.done)));
      }
    });
    chatTimers.push(setTimeout(playChat, 12500)); // then start over
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    chatDemo.classList.add("is-static");
  } else {
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) playChat();
      else stopChat();
    }).observe(chatDemo);
  }
}

// Hero photo slider: the big photo behind the hero swipes to the next one every
// 4 seconds. The small photos + arrows (left side) can also pick a photo.
// The photos, the small photos and the words in the headline
// (Abu Dhabi / Hatta / Dubai) are all in the SAME order in the HTML,
// so one number ("current") is enough to keep them in sync.
const heroBgImgs = document.querySelectorAll(".hero-bg-img");
const heroThumbs = document.querySelectorAll(".hero-thumb");
const heroWords = document.querySelector(".rotator-track");
const heroCounts = document.querySelectorAll("[data-hero-count]"); // the "01" in "01 / 03" and the step number

if (heroBgImgs.length && heroBgImgs.length === heroThumbs.length) {
  const HERO_AUTO_MS = 4000; // time each photo stays
  const HERO_SWIPE_MS = 900; // time the swipe takes
  const heroReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;
  let swipeAnims = [];

  // Vertical "one photo on top of another" swipe:
  // dir = 1: the new photo slides up from the bottom and covers the old one, which drifts up a little;
  // dir = -1: the new photo slides down from the top instead.
  const showHeroPhoto = (index, dir = 1) => {
    // % with + total makes it loop: after the last photo comes the first one
    const next = (index + heroBgImgs.length) % heroBgImgs.length;
    if (next === current) return;

    const oldImg = heroBgImgs[current];
    const newImg = heroBgImgs[next];
    current = next;

    // If the previous swipe is still running, stop it and tidy up first
    swipeAnims.forEach((a) => a.cancel());
    swipeAnims = [];
    heroBgImgs.forEach((img) => {
      img.classList.remove("is-leaving");
      if (img !== newImg) img.classList.remove("is-active");
    });

    oldImg.classList.add("is-leaving"); // stays visible while it slides out
    newImg.classList.add("is-active");

    if (!heroReduceMotion) {
      const timing = { duration: HERO_SWIPE_MS, easing: "cubic-bezier(0.7, 0, 0.2, 1)" };
      swipeAnims.push(newImg.animate([{ translate: "0 " + dir * 100 + "%" }, { translate: "0 0" }], timing));
      // the old photo only drifts 25% the other way (a layered, parallax feel); the new one is on top and covers it
      const out = oldImg.animate([{ translate: "0 0" }, { translate: "0 " + -dir * 25 + "%" }], { ...timing, fill: "forwards" });
      out.onfinish = () => {
        oldImg.classList.remove("is-leaving");
        out.cancel();
      };
      swipeAnims.push(out);
    } else {
      oldImg.classList.remove("is-leaving");
    }

    heroThumbs.forEach((thumb, i) => {
      thumb.classList.toggle("is-active", i === current);
      thumb.setAttribute("aria-pressed", i === current ? "true" : "false");
      // Position in the card stack on desktop: 0 = the front card (the photo shown),
      // 1 = the card right behind it (the next photo), 2 = the one at the very back
      thumb.dataset.pos = (i - current + heroThumbs.length) % heroThumbs.length;
    });
    if (heroWords) heroWords.style.setProperty("--i", current);
    heroCounts.forEach((el) => { el.textContent = String(current + 1).padStart(2, "0"); });
  };

  // ---- Auto-advance every 4 seconds ----
  // It pauses while the mouse/keyboard is on the picker, while the hero is
  // scrolled out of view, and while the browser tab is hidden. It does not run at all
  // for people who asked their device for reduced motion.
  let autoTimer;
  let heroInView = true;
  let heroHovered = false;

  const updateAuto = () => {
    clearInterval(autoTimer);
    if (heroReduceMotion || document.hidden || !heroInView || heroHovered) return;
    autoTimer = setInterval(() => showHeroPhoto(current + 1, 1), HERO_AUTO_MS);
  };

  const heroPicker = document.querySelector(".hero-picker");
  if (heroPicker) {
    heroPicker.addEventListener("mouseenter", () => { heroHovered = true; updateAuto(); });
    heroPicker.addEventListener("mouseleave", () => { heroHovered = false; updateAuto(); });
    heroPicker.addEventListener("focusin", () => { heroHovered = true; updateAuto(); });
    heroPicker.addEventListener("focusout", () => { heroHovered = false; updateAuto(); });
  }
  document.addEventListener("visibilitychange", updateAuto);
  new IntersectionObserver((entries) => {
    heroInView = entries[0].isIntersecting;
    updateAuto();
  }).observe(document.querySelector(".hero"));

  // Manual choices: swipe the way you clicked, then restart the 4 second countdown
  document.querySelectorAll(".hero-arrow").forEach((arrow) => {
    arrow.addEventListener("click", () => {
      const dir = Number(arrow.dataset.dir);
      showHeroPhoto(current + dir, dir);
      updateAuto();
    });
  });

  heroThumbs.forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      showHeroPhoto(i, i > current ? 1 : -1);
      updateAuto();
    });
  });

  updateAuto();
}

// Photo sliders: any element with [data-slider] becomes a slider.
// Works with the Next/Prev buttons, the dots, the keyboard arrow keys,
// and a finger/mouse swipe. The CSS does the wipe animation; here we only
// swap the classes (is-active / is-leaving) and remember which way we went.
const initSlider = (root) => {
  const slides = Array.from(root.querySelectorAll(".slide"));
  const dots = Array.from(root.querySelectorAll(".slider-dots button"));
  const counter = root.querySelector(".slider-count");
  let index = 0;
  let leaveTimer;

  const goTo = (target, direction) => {
    const next = (target + slides.length) % slides.length;
    if (next === index) return;

    const previous = slides[index];
    root.dataset.dir = direction; // "next" or "prev": CSS uses it for the wipe side

    slides.forEach((s) => s.classList.remove("is-leaving"));
    previous.classList.remove("is-active");
    previous.classList.add("is-leaving");
    slides[next].classList.add("is-active");

    slides.forEach((s, i) => s.setAttribute("aria-hidden", i === next ? "false" : "true"));
    dots.forEach((d, i) => d.classList.toggle("is-current", i === next));
    if (counter) counter.textContent = next + 1 + " / " + slides.length;

    index = next;
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => previous.classList.remove("is-leaving"), 900);
  };

  // Photos that are hidden behind the active one never count as "on screen", so
  // loading="lazy" would leave them empty until you click. Once the slider is
  // close to the screen, switch every photo to eager so they're ready in advance.
  if ("IntersectionObserver" in window) {
    const preload = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        root.querySelectorAll("img").forEach((img) => (img.loading = "eager"));
        preload.disconnect();
      },
      { rootMargin: "600px 0px" }
    );
    preload.observe(root);
  } else {
    root.querySelectorAll("img").forEach((img) => (img.loading = "eager"));
  }

  root.dataset.dir = "next";
  root.querySelector(".slider-btn.next").addEventListener("click", () => goTo(index + 1, "next"));
  root.querySelector(".slider-btn.prev").addEventListener("click", () => goTo(index - 1, "prev"));
  dots.forEach((dot, i) =>
    dot.addEventListener("click", () => goTo(i, i > index ? "next" : "prev"))
  );

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") goTo(index + 1, "next");
    if (e.key === "ArrowLeft") goTo(index - 1, "prev");
  });

  // Swipe: a sideways drag of more than 40px changes the photo
  let startX = null;
  root.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    startX = e.clientX;
  });
  root.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) {
      goTo(index + (dx < 0 ? 1 : -1), dx < 0 ? "next" : "prev");
      // a swipe must not also count as a click (a slider inside a tour card would open the popup)
      root.dataset.justSwiped = "1";
      setTimeout(() => delete root.dataset.justSwiped, 60);
    }
  });
  root.addEventListener("pointercancel", () => (startX = null));
};
// (Sliders are started further down, after the TOURS list, so a slider can take its photos from a tour.)

// Particles: any element with data-particles="N" gets N tiny, very faint dots that
// drift slowly. Sizes, positions, speeds and colours are random, so no two look alike.
// They pause while the section is off-screen (saves battery/CPU).
document.querySelectorAll("[data-particles]").forEach((box) => {
  const count = parseInt(box.dataset.particles, 10) || 20;
  // data-particles-theme="light" = white/gold dots for dark (crimson) backgrounds
  const onDark = box.dataset.particlesTheme === "light";
  // Brand colours only: crimson #AA1345, orange #F39200, white, and light steps of them
  const colors = onDark ? ["#ffffff", "#f39200", "#f2c9d6"] : ["#aa1345", "#d9708f", "#f39200", "#c9406b"];
  const rand = (min, max) => min + Math.random() * (max - min);
  // data-particles-style="rich" = also rings, diamonds and 4-point stars, and they twinkle
  const rich = box.dataset.particlesStyle === "rich";
  if (rich) box.classList.add("rich");

  for (let i = 0; i < count; i++) {
    const dot = document.createElement("span");
    dot.className = "particle";
    let size = rand(3, 9);
    if (rich) {
      // Roughly: half plain dots, the rest rings / diamonds / stars (a bit bigger so the shape is visible)
      const shape = Math.random();
      if (shape > 0.5) {
        const kind = shape > 0.85 ? "p-star" : shape > 0.7 ? "p-diamond" : "p-ring";
        dot.classList.add(kind);
        size = kind === "p-star" ? rand(9, 16) : rand(7, 14);
      }
      dot.style.setProperty("--tw", rand(3, 7).toFixed(1) + "s");
    }
    dot.style.width = dot.style.height = size.toFixed(1) + "px";
    dot.style.left = rand(0, 100).toFixed(1) + "%";
    dot.style.top = rand(0, 100).toFixed(1) + "%";
    dot.style.setProperty("--c", colors[Math.floor(Math.random() * colors.length)]);
    // light, but a bit stronger on dark backgrounds and for the "rich" style
    const opacity = onDark ? rand(0.2, 0.5) : rich ? rand(0.2, 0.42) : rand(0.12, 0.3);
    dot.style.setProperty("--o", opacity.toFixed(2));
    dot.style.setProperty("--d", rand(14, 30).toFixed(1) + "s");
    dot.style.setProperty("--delay", "-" + rand(0, 20).toFixed(1) + "s");
    dot.style.setProperty("--dx", (Math.random() < 0.5 ? -1 : 1) * rand(15, 50) + "px");
    dot.style.setProperty("--dy", -rand(25, 70) + "px");
    box.appendChild(dot);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      box.classList.toggle("is-paused", !entries[0].isIntersecting);
    }).observe(box);
  }
});

// Tour filter (Tours page): the chips in [data-filter-bar] show/hide the cards of the
// grid named in data-target, by matching each card's data-tags. "all" shows everything.
document.querySelectorAll("[data-filter-bar]").forEach((bar) => {
  const grid = document.getElementById(bar.dataset.target);
  const status = document.getElementById(bar.dataset.status);
  if (!grid) return;
  const cards = Array.from(grid.children);
  const chips = Array.from(bar.querySelectorAll("[data-filter]"));

  bar.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (!chip) return;
    const filter = chip.dataset.filter;

    chips.forEach((c) => {
      const active = c === chip;
      c.classList.toggle("is-active", active);
      c.setAttribute("aria-pressed", active ? "true" : "false");
    });

    let shown = 0;
    cards.forEach((card) => {
      const tags = (card.dataset.tags || "").split(" ");
      const match = filter === "all" || tags.includes(filter);
      card.classList.toggle("is-hidden", !match);
      card.classList.remove("pop-in");
      if (match) {
        shown++;
        void card.offsetWidth; // restart the little pop-in animation
        card.classList.add("pop-in");
      }
    });

    if (status) {
      status.textContent =
        filter === "all"
          ? "Showing all " + shown + " tours"
          : "Showing " + shown + (shown === 1 ? " tour" : " tours") + " in " + chip.firstChild.textContent.trim();
    }
  });
});

// Plane on the Tours banner is an SVG animation: stop it for people who prefer reduced motion
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("svg.flight").forEach((svg) => svg.pauseAnimations && svg.pauseAnimations());
}

// Booking journey: while you scroll through it, the line fills with colour,
// the NXT logo rides the tip of the fill, and each number badge lights up and pops
// once the logo reaches it. CSS reads --progress (0 to 1) from .journey.
document.querySelectorAll("[data-journey]").forEach((root) => {
  // The Home timeline uses the default class names; the Contact page's "What happens next?"
  // card reuses this same code and names its own badges and logo with data-journey-nodes / data-journey-plane.
  const nodes = Array.from(root.querySelectorAll(root.dataset.journeyNodes || ".journey-node"));
  const plane = root.querySelector(root.dataset.journeyPlane || ".journey-plane");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ticking = false;
  let started = false; // false only during the very first update() call

  const update = () => {
    const rect = root.getBoundingClientRect();
    const anchor = window.innerHeight * 0.6; // the "reading line" the plane follows
    // The road ends at the CENTRE of the last badge (not at the bottom of the whole block),
    // so when the logo arrives it sits exactly on the last badge.
    const lastRect = nodes[nodes.length - 1].getBoundingClientRect();
    const roadEnd = lastRect.top + lastRect.height / 2 - rect.top;
    root.style.setProperty("--journey-end", roadEnd.toFixed(1) + "px");
    const progress = Math.min(1, Math.max(0, (anchor - rect.top) / roadEnd));
    root.style.setProperty("--progress", progress.toFixed(4));

    nodes.forEach((node) => {
      const r = node.getBoundingClientRect();
      const reached = r.top + r.height / 2 <= anchor;
      const justReached = reached && !node.classList.contains("is-reached");
      node.classList.toggle("is-reached", reached);

      // The logo gives a little "bump" the moment it arrives inside a badge
      // (the badge itself pops through CSS). Skipped on the first run, so a page
      // that loads already scrolled down does not bump 4 times at once.
      if (justReached && started && !reduceMotion) {
        plane.animate({ scale: [1, 1.12, 1] }, { duration: 400, easing: "ease-out" });
      }
    });
    started = true;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", update);
  update();
});

// Matte black section: the dune-ripple layer (.matte-bg) slides slowly upward
// while you scroll down through the section (and back down if you scroll up).
// It is ~360px taller than the section, so there is always room for the movement.
const matteLayers = document.querySelectorAll(".matte-bg");
if (matteLayers.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let matteTicking = false;

  const updateMatte = () => {
    const vh = window.innerHeight;
    matteLayers.forEach((layer) => {
      const rect = layer.parentElement.getBoundingClientRect();
      if (rect.bottom < -300 || rect.top > vh + 300) return; // far off-screen

      // 0 when the section enters from the bottom, 1 when it has left at the top
      const progress = (vh - rect.top) / (vh + rect.height);
      const lift = (progress - 0.5) * 260; // -130px .. +130px
      layer.style.transform = "translate3d(0, " + -lift + "px, 0)"; // minus = moves up
    });
    matteTicking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!matteTicking) {
        matteTicking = true;
        requestAnimationFrame(updateMatte);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", updateMatte);
  updateMatte();
}

// Stat counters: animate each [data-count-to] number from 0 to its
// target once the stats strip scrolls into view.
const statEls = document.querySelectorAll("[data-count-to]");
if (statEls.length) {
  const animateCount = (el) => {
    const target = parseInt(el.dataset.countTo, 10);
    const suffix = el.dataset.suffix || "";
    const duration = 1600;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out so the count settles smoothly instead of stopping abruptly
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      el.textContent = current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const statObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          statObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  statEls.forEach((el) => statObserver.observe(el));
}

// =========================================================
// Tour details popup
// Every card with data-tour="..." (Home + Tours page) opens a details window that is
// filled from the TOURS list below, so each tour's info lives in ONE place.
// Only facts we really have are shown. Extra facts (pickup time, full itinerary, what's
// included / not included, child price...) appear automatically once you add them to a
// tour here, e.g.  itinerary: ["09:00 Pickup", "10:30 Sheikh Zayed Mosque"],  included: [...]
// =========================================================
const tourUnsplash = (id, w) => "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=" + w + "&q=75";
const tourPexels = (id, w) => "https://images.pexels.com/photos/" + id + "/pexels-photo-" + id + ".jpeg?auto=compress&cs=tinysrgb&w=" + w;

// Abu Dhabi photos (from the client's Drive, 2026-10-04), shared by the gallery, stop cards and timeline
const AD = (slug, alt) => ({ src: "images/stops/abu-dhabi-" + slug + ".webp", alt });
const adPic = {
  mosque: AD("grand-mosque", "Sheikh Zayed Grand Mosque from above, with its white domes, minarets and blue reflecting pools"),
  baps: AD("baps-temple", "The carved pink sandstone spires of the BAPS Hindu Mandir above its reflecting pool"),
  ferrari: AD("ferrari-world", "The red roof of Ferrari World on Yas Island seen from above"),
  qasr: AD("qasr-al-watan", "The white palace of Qasr Al Watan with its central dome and wide marble courtyard"),
  palace: AD("emirates-palace", "Emirates Palace with its arched sandstone front, palm trees and fountains"),
  etihad: AD("etihad-towers", "The five curved glass skyscrapers of Etihad Towers with palm trees and a UAE flag"),
  warner: AD("warner-bros", "The yellow Warner Bros. World entrance canopy under a blue sky"),
  heritage: AD("heritage-village", "Visitors walking through the sandstone gate of the UAE Heritage Village"),
  marina: AD("marina-mall", "The curved glass front of Marina Mall Abu Dhabi with palm trees and gardens"),
  corniche: AD("corniche", "The tiled Abu Dhabi Corniche promenade beside turquoise water, with the skyline in the distance"),
  lastExit: AD("last-exit", "Vintage cars stacked up next to the Last Exit road sign"),
  nec: AD("national-exhibition-centre", "The leaning Capital Gate tower at the Abu Dhabi National Exhibition Centre"),
  bateen: AD("al-bateen", "The Al Bateen waterfront road lined with palms, with the Abu Dhabi skyline and turquoise sea behind"),
  // These two were generated in ChatGPT (the art gallery from a real reference photo of the building)
  dates: AD("dates-market", "Brass trays piled high with dark and golden fresh dates in a covered market, with coffee pots and palm baskets"),
  marjan: AD("marjan-art-gallery", "The sandstone front of Marjan art gallery with its dark MARJAN sign and a row of old heritage photos"),
};

const TOURS = {
  "abu-dhabi": {
    name: "Abu Dhabi", accent: "City Tour", type: "Sharing & Private",
    price: 79.99, was: 120, duration: "Full day, 7:30 AM to 9:00 PM",
    heroTitle: { prefix: "Best of Abu Dhabi:", accent: "Full-Day City Tour from Dubai" },
    // Private tour: priced per vehicle, not per person (same rates as the partner company's
    // own private tour, per Abdul Raheem 2026-09-29)
    privateTiers: [
      { seats: 7, price: 599 },
      { seats: 14, price: 999 },
    ],
    intro: "Abu Dhabi in a single day. Start on Yas Island at Ferrari World and Warner Bros. World, taste fresh dates at the Dates Market and stroll the Abu Dhabi Corniche. After lunch at Marina Mall, take photos at Emirates Palace and Etihad Towers and drive past Qasr Al Watan. End the day at the gleaming white domes of the Sheikh Zayed Grand Mosque and the hand-carved BAPS Hindu Temple. It's the UAE's most complete day trip, loved by families, couples, and solo travellers alike.",
    points: ["Sheikh Zayed Grand Mosque", "BAPS Hindu Temple", "Emirates Palace & Etihad Towers", "Ferrari World Yas Island"],
    // Gallery at the top of the tour page: the first 5 show in the grid, the rest behind "+N photos"
    photos: [
      { ...adPic.mosque, cap: "Sheikh Zayed Grand Mosque" },
      { ...adPic.baps, cap: "BAPS Hindu Temple" },
      { ...adPic.ferrari, cap: "Ferrari World, Yas Island" },
      { ...adPic.qasr, cap: "Qasr Al Watan" },
      { ...adPic.palace, cap: "Emirates Palace" },
      { ...adPic.etihad, cap: "Etihad Towers" },
      { ...adPic.warner, cap: "Warner Bros. World" },
      { ...adPic.heritage, cap: "Heritage Village" },
      { ...adPic.marina, cap: "Marina Mall" },
      { ...adPic.corniche, cap: "Abu Dhabi Corniche" },
      { ...adPic.lastExit, cap: "Last Exit" },
      { ...adPic.nec, cap: "National Exhibition Centre" },
      { ...adPic.dates, cap: "Dates Market" },
      { ...adPic.marjan, cap: "Al Marjan Art Gallery" }
    ],
    // The 15 stops, in the order the tour visits them. A stop without src gets a branded placeholder card.
    stops: [
      { name: "Last Exit", ...adPic.lastExit },
      { name: "Ferrari World & Yas Mall", ...adPic.ferrari },
      { name: "Warner Bros World", ...adPic.warner },
      { name: "Dates Market", ...adPic.dates },
      { name: "Abu Dhabi Corniche", ...adPic.corniche },
      { name: "Heritage Village", ...adPic.heritage },
      { name: "Marina Mall Abu Dhabi", ...adPic.marina },
      { name: "Al Marjan Art Gallery", ...adPic.marjan },
      { name: "Emirates Palace", ...adPic.palace },
      { name: "Etihad Towers", ...adPic.etihad },
      { name: "Qasr Al Watan", ...adPic.qasr },
      { name: "Al Bateen Area", ...adPic.bateen },
      { name: "National Exhibition Center", ...adPic.nec },
      { name: "Sheikh Zayed Grand Mosque", ...adPic.mosque },
      { name: "BAPS Temple Abu Dhabi", ...adPic.baps }
    ],
    // Hour-by-hour plan from the partner's Abu Dhabi tour PDF (Oct 2026), plus Emirates Palace, Etihad
    // Towers and Qasr Al Watan placed where the client said (between the art gallery and Al Bateen).
    // kind: "travel" rows get a vehicle icon and no photo.
    timeline: [
      { time: "7:30 - 9:30 AM", title: "Pickup from Dubai", kind: "travel", text: "Sharing tour: pickup from a metro station or meeting point. Your pickup time depends on your pickup point, see the full list below. Private tour: pickup from your hotel." },
      { time: "9:30 AM", title: "Last Exit", place: "Dubai - Abu Dhabi border", dur: "30 min", text: "Break for refreshments and restrooms, with vintage cars and a desert-style setting for photos.", ...adPic.lastExit },
      { time: "10:00 AM", title: "Ferrari World & Yas Mall", place: "Yas Island", dur: "30 min photo stop", text: "Photo stop at Ferrari World's famous red roof, then free time to explore Yas Mall next door.", ...adPic.ferrari },
      { time: "12:00 PM", title: "Warner Bros. World Abu Dhabi", dur: "20 min photo stop", text: "Photos at the entrance and a quick look around outside the park.", ...adPic.warner },
      { time: "12:45 PM", title: "Dates Market", dur: "20 - 30 min", text: "Visit the largest dates market in the UAE and taste fresh dates for free. Buying is optional.", ...adPic.dates },
      { time: "1:30 PM", title: "Abu Dhabi Corniche", dur: "10 min photo stop", text: "Photo stop along the long, palm-lined waterfront promenade.", ...adPic.corniche },
      { time: "1:50 PM", title: "Heritage Village", dur: "20 - 30 min", text: "See traditional Emirati culture, old-style houses and local crafts.", ...adPic.heritage },
      { time: "2:20 PM", title: "Marina Mall", dur: "45 min - 1 hr", text: "Lunch break and shopping by the waterfront.", ...adPic.marina },
      { time: "3:15 PM", title: "Al Marjan Art Gallery", dur: "30 min", text: "View traditional and contemporary artworks and antiques from the UAE and the region.", ...adPic.marjan },
      { time: "3:45 PM", title: "Emirates Palace", dur: "Photo stop", text: "Photos in front of the grand palace, one of the most famous buildings in Abu Dhabi.", ...adPic.palace },
      { time: "3:55 PM", title: "Etihad Towers", dur: "Photo stop", text: "Right across from Emirates Palace: photos of the five curved glass towers. About 20 minutes in total for both stops.", ...adPic.etihad },
      { time: "4:05 PM", title: "Qasr Al Watan", dur: "Drive-through", text: "Drive past the Presidential Palace, a short way on from Emirates Palace.", ...adPic.qasr },
      { time: "4:15 PM", title: "Al Bateen & National Exhibition Centre", dur: "Drive-through", text: "Scenic drive through the Al Bateen district and past the National Exhibition Centre, with photos from the vehicle.", ...adPic.bateen },
      { time: "4:30 PM", title: "Sheikh Zayed Grand Mosque", dur: "1.5 hr guided visit", text: "Explore one of the largest mosques in the world. Modest dress is required (see notes below).", ...adPic.mosque },
      { time: "6:30 PM", title: "BAPS Hindu Temple", dur: "1 hr", text: "Visit the stunning new hand-carved temple, great for photos and cultural insight.", ...adPic.baps },
      { time: "7:30 PM", title: "Departure from Abu Dhabi", kind: "travel", text: "Relax on the drive back to Dubai." },
      { time: "9:00 PM", title: "Arrival in Dubai", kind: "travel", text: "Drop-off at your hotel or chosen location. End of tour." }
    ],
    // Pickup points and time windows, from the same PDF
    pickupNote: "Sharing tour pickup points. Please be ready at the start of your time window. Private tours are picked up from your hotel.",
    // Abu Dhabi only: hotel pickup is for private tours, sharing uses the metro/meeting points
    pickupFact: "Free pickup & drop-off in Dubai",
    pickupCard: { title: "Free Pickup in Dubai", text: "Free anywhere in Dubai. Sharing: metro points. Private: your hotel." },
    // Sharing-tour pickup points from the PDF, grouped by area (areas assigned by location, team to check)
    pickupAreas: [
      { area: "Al Nahda & Al Qusais", points: [
        ["Sahara Centre (Dubai side), Day to Day", "7:30 - 7:45 AM"],
        ["Al Nahda Metro Station (Exit 2, ENOC petrol station)", "8:00 - 8:15 AM"],
        ["Stadium Metro Station (Lulu Market)", "8:00 - 8:15 AM"],
        ["Al Mulla Plaza (Exit 2)", "8:00 - 8:15 AM"],
        ["Al Qiyadah Metro Station (Exit 2)", "8:00 - 8:15 AM"]
      ] },
      { area: "Deira & Airport area", points: [
        ["Rashidiya Metro Station (KFC)", "7:45 - 8:00 AM"],
        ["Abu Baker Metro Station (Emarat petrol station)", "7:45 - 8:00 AM"],
        ["Salah Al Din Metro Station (Gift Village)", "7:45 - 8:00 AM"],
        ["Al Rigga Metro Station (Delta side)", "7:45 - 8:00 AM"],
        ["Al Rigga, KFC", "7:45 - 8:00 AM"],
        ["Abu Hail Metro Station (Kabayel)", "8:00 - 8:15 AM"],
        ["Union Metro Station (Day to Day)", "8:00 - 8:15 AM"],
        ["Baniyas Metro Station (McDonald's)", "8:00 - 8:15 AM"],
        ["Deira City Centre (Novotel Hotel)", "8:15 - 8:30 AM"]
      ] },
      { area: "Bur Dubai, Karama & Satwa", points: [
        ["Al Ghubaiba Metro Station (Wescott Hotel)", "8:15 - 8:30 AM"],
        ["Sharaf DG Metro Station (Day to Day)", "8:15 - 8:30 AM"],
        ["BurJuman Metro Station (Exit 3, Carrefour)", "8:15 - 8:30 AM"],
        ["ADCB Metro Station (Exit 2)", "8:15 - 8:30 AM"],
        ["Chelsea Plaza (Satwa Roundabout)", "8:30 - 8:45 AM"]
      ] },
      { area: "Sheikh Zayed Road & Downtown", points: [
        ["Financial Centre Metro Station (Exit 2)", "8:30 - 8:45 AM"],
        ["Emirates Towers Metro Station (Burger King)", "8:30 - 8:45 AM"],
        ["Dubai Mall Metro Station (Exit 2)", "8:30 - 8:45 AM"],
        ["Business Bay Metro Station (Bank of Baroda)", "8:30 - 8:45 AM"],
        ["Onpassive Metro Station (Exit 2)", "8:45 - 9:00 AM"],
        ["Equiti Metro Station (Exit 2)", "8:45 - 9:00 AM"]
      ] },
      { area: "Al Barsha, Marina & JLT", points: [
        ["Mall of the Emirates Metro Station (Exit 2)", "8:45 - 9:00 AM"],
        ["Mashreq / InsuranceMarket Metro Station (Exit 2)", "8:45 - 9:00 AM"],
        ["Internet City Metro Station (Exit 3)", "9:00 - 9:15 AM"],
        ["Sobha Realty Metro Station (Marina side)", "9:00 - 9:15 AM"],
        ["DMCC Metro Station (Marina side)", "9:00 - 9:15 AM"],
        ["Gardens Metro Station (Exit 2)", "9:00 - 9:15 AM"],
        ["Ibn Battuta Metro Station (Dream City Cafeteria)", "9:15 - 9:30 AM"]
      ] }
    ],
    included: [
      "Free pickup and drop-off anywhere in Dubai",
      "Air-conditioned vehicle",
      "Professional, licensed tour guide and driver",
      "Bottled drinking water",
      "Visits and photo stops at every place on the route"
    ],
    notIncluded: [
      "Meals and snacks",
      "Entry tickets to go inside places like Ferrari World or Warner Bros. World",
      "Personal expenses and shopping"
    ],
    notes: [
      "This is a sightseeing tour: we take you to every place on the route. If you want to go inside a paid attraction like Ferrari World, or buy anything, that is at your own cost.",
      "For meals, you can bring food from home or buy it at the stops. The lunch break is at Marina Mall.",
      "Modest dress is required at the mosque: long sleeves and long trousers for men and women, and women must cover their hair. Shorts are not allowed for men.",
      "Timings can change a little with traffic and group size.",
      "Bring comfortable walking shoes, sunglasses, sunscreen and a camera.",
      "Pickup and drop-off are free anywhere in Dubai. Pickup from another emirate has an extra charge, ask us for the price."
    ],
    // Text for the "No Hidden Costs" card on this tour's page
    costNote: "Transport, guide and every stop included. Entry tickets and meals are up to you.",
    privateNote: "Custom packages available"
  },
  "hatta": {
    name: "Hatta", accent: "City Tour", type: "Sharing & Private",
    price: 69.99, was: 100,
    heroTitle: { prefix: "Best of Hatta:", accent: "Mountain & Lake Day Trip from Dubai" },
    intro: "Escape the city for a day in the Hajar Mountains. Cruise along the turquoise waters of Hatta Dam, wind through scenic mountain roads with views over lakes and valleys, and stop at Hatta Heritage Village to see traditional Emirati life up close. With fresh mountain air and a slower pace, it's the perfect break from Dubai's skyline.",
    points: ["Hatta Dam lake", "Hajar Mountain scenic drive", "Hatta Heritage Village stop"],
    photos: [
      { src: tourUnsplash("1672435326246-8420531c37ed", 1200), alt: "Hatta lake surrounded by the Hajar mountains", cap: "Hatta lake" },
      { src: tourUnsplash("1559830379-cbe0ad93161d", 1200), alt: "Turquoise water and rocky Hajar mountains at Hatta", cap: "The Hajar mountains" }
    ],
    // The 8 stops from the client's poster, in the poster's order. A stop without src has no photo yet:
    // it gets a branded placeholder card (add src + alt to swap in the real photo).
    stops: [
      { name: "Hatta Dam" },
      { name: "Hatta Heritage Village" },
      { name: "Hatta Hill Park" },
      { name: "Hatta Swan Lake" },
      { name: "Hatta Leem Lake" },
      { name: "Hatta Wadi Park" },
      { name: "Hatta Wadi Hub" },
      { name: "Hatta Fort Hotel" }
    ]
  },
  "dubai": {
    name: "Dubai", accent: "City Tour", type: "Sharing & Private",
    price: 59, was: 99, duration: "Half-day",
    heroTitle: { prefix: "Best of Dubai:", accent: "Half-Day Icons & Skyline Tour" },
    intro: "See Dubai's biggest icons in just half a day. Snap photos at the base of the Burj Khalifa, the world's tallest building, then drive along the iconic Palm Jumeirah. Wind through the narrow lanes of Old Dubai and Dubai Creek to see the city's traditional side, before heading back through the ultra-modern skyline. A fast-paced first look at everything Dubai is known for.",
    points: ["Burj Khalifa photo stop", "Palm Jumeirah drive-by", "Old Dubai & Dubai Creek"],
    photos: [
      { src: tourUnsplash("1745750434535-5943ef2fd31a", 1200), alt: "Dubai skyline with the Burj Khalifa", cap: "Dubai skyline & Burj Khalifa" },
      { src: tourUnsplash("1611577810610-642f8ac05c32", 1200), alt: "Modern Dubai skyline at sunset", cap: "The modern skyline" }
    ],
    // Stop names come from the tour's own text on the site (Burj Khalifa, Palm Jumeirah, Old Dubai & Dubai
    // Creek). The client has not confirmed the exact stops yet, so check them against the real itinerary.
    // No src yet = placeholder card (add src + alt to show a photo).
    stops: [
      { name: "Burj Khalifa" },
      { name: "Palm Jumeirah" },
      { name: "Old Dubai" },
      { name: "Dubai Creek" }
    ]
  },
  "desert-safari": {
    name: "Desert", accent: "Safari", type: "Sharing & Private",
    price: 99, was: 180,
    heroTitle: { prefix: "Arabian Desert Safari:", accent: "Dune Bashing & BBQ Evening from Dubai" },
    intro: "Head into the golden dunes of the Arabian desert for an action-packed evening. Feel the adrenaline of dune bashing in a 4x4, try sand boarding down the dunes, then take a calm camel ride as the sun sets over the desert. Wind down with a BBQ buffet dinner under the stars, complete with fire shows, belly dance, tanoura, and henna painting.",
    points: ["Dune bashing in 4x4 vehicles", "Camel rides", "BBQ dinner with live shows"],
    photos: [
      { src: tourUnsplash("1624062999726-083e5268525d", 1400), alt: "A white Land Cruiser dune bashing in the desert", cap: "Dune bashing" },
      { src: tourPexels("2417260", 1400), alt: "A 4x4 kicking up sand on orange dunes at sunset", cap: "Desert sunset" },
      { src: tourUnsplash("1549944850-84e00be4203b", 1400), alt: "Camels with colourful saddles resting on the sand", cap: "Camels" },
      { src: tourUnsplash("1576159470850-494c8b17aca0", 1400), alt: "4x4 vehicles driving over red sand dunes", cap: "Red dunes" }
    ],
    // A safari has activities instead of places, so these cards use their own wording (stopsTitle/stopLine).
    // The names are the inclusions listed on the client's Desert Safari poster.
    stopsTitle: "Included in this tour",
    stopLine: "Included in the Desert Safari",
    stops: [
      { name: "Dune Bashing" },
      { name: "Sand Boarding" },
      { name: "Camel Riding" },
      { name: "BBQ Buffet Dinner" },
      { name: "Fire Shows" },
      { name: "Belly Dance & Tanoura" },
      { name: "Henna Painting" },
      { name: "Traditional Dress" }
    ],
    included: ["Dune bashing", "Sand boarding", "Camel riding", "BBQ buffet dinner", "Fire shows", "Belly dance and tanoura show", "Henna painting", "Traditional dress for photos"]
  },
  "khorfakkan": {
    name: "Khorfakkan", accent: "City Tour", type: "Private Only",
    price: 699, was: 900, duration: "Full-day",
    heroTitle: { prefix: "Best of Khorfakkan:", accent: "Private Full-Day East Coast Tour from Dubai" },
    intro: "Cross to the UAE's East Coast for a day away from the crowds. Relax on hidden beaches along the Khorfakkan coastline, discover scenic mountain waterfalls tucked into the Hajar range, and enjoy fresh sea air far from the city. As a private, full-day experience, the whole trip moves at your own pace.",
    points: ["East Coast hidden beaches", "Scenic mountain waterfalls", "Private full-day experience"],
    photos: [
      { src: tourPexels("39583225", 1200), alt: "Khorfakkan waterfront and mosque on the deep blue sea, with mountains behind", cap: "Khorfakkan waterfront", pos: "22% 50%" },
      { src: tourPexels("39583227", 1200), alt: "Khorfakkan beachfront town below the mountains", cap: "The East Coast" }
    ]
  }
};

// Real guest reviews (copied from the NXT Tours Facebook page, same wording used on the Home page
// testimonials). `tours` tags which tour a review clearly names, so the tour page can show a
// review about ITSELF first; reviews with no tag are general and only used as a fallback.
// mixed: true = a review that also has a complaint; kept for the record but not shown on tour pages.
const REVIEWS = [
  { name: "Zeq C.", date: "29 Nov 2025", tours: [], text: "Nasir was a very good host. He always try to keep the itinerary on time." },
  { name: "Dileepraj K.", date: "9 Nov 2025", tours: [], text: "A very big thank you to NXT Tours... excellent service." },
  { name: "Raca T.", date: "29 Nov 2025", tours: [], mixed: true, text: "Free tea at least please and candies; but overall we had a great time. The tour guide was very accommodating and easy to approach but they need to double check if all the tourist / passengers are in to avoid someone who will be left. Thank you till next time" },
  { name: "Priya B.", date: "9 Nov 2025", tours: ["abu-dhabi"], text: "I had a wonderful one-day tour in Abu Dhabi. The trip was well-organized and covered some basic spots around the city. Everything went smoothly, and the experience was enjoyable from start to finish. Our guide, Badam, did an excellent job throughout the tour. He explained clearly and shared interesting information, which made the trip even more memorable. Overall, it was a good experience and worth recommending" },
  { name: "Maymay T.", date: "9 Nov 2025", tours: ["abu-dhabi"], text: "Five-star experience from start to finish. Ideal for first-time visitors and repeat travellers wanting a polished, insightful tour. Would book again without hesitation and recommend to friends and family looking to discover Abu Dhabi's beauty and heritage." },
  { name: "Junny E.", date: "25 Oct 2025", tours: [], text: "I enjoyed the entire tour today with Naser Badam. He was very accommodating and made the entire tour an enjoyable one. I would like to tour again hopefully Naser Badam will become our tour guide again when I come back again to visit United Arab Emirates with my friends and relatives." },
  { name: "Isha K.", date: "8 Jun 2025", tours: [], mixed: true, text: "Thank you for everything, we really do appreciate. It was really fun. We enjoy all the activities? The tours was amazing but you have to tell people about time. Thank you. May Allah bless us all" },
  { name: "Shailesh S.", date: "7 Jun 2025", tours: [], text: "I recently went with NXT tours and the experience was very smooth overall and well-organized. The guide they provided was knowledgeable and friendly and will recommend to people to plan their trips" },
  { name: "Bi N.", date: "26 May 2025", tours: [], text: "I wanted to express my heartfelt gratitude for the exceptional service your team NXT Tours provided during our recent tour. Your guide was knowledgeable, friendly, and made the experience truly unforgettable. Thank you for your professionalism and dedication. We highly recommend your company to anyone looking for a memorable experience. Keep up great work." },
  { name: "Reny J.", date: "24 May 2025", tours: [], text: "Excellent service. Treated us well and informed about the places and timings well ahead. Mr. Muhammed did a fantastic job throughout our journey. He patiently handled all the passengers. Recommended one" }
];

// =========================================================
// Live data from the admin panel (Supabase): tours, site settings and blocked dates.
// The TOURS object above stays as the BACKUP: if the database is slow (over 3.5 s) or down,
// the site simply uses the built-in data, so it never breaks. Everything that draws tours
// (price sync, cards, sliders, the tour page) runs in startToursUI() once this has finished.
// =========================================================
const HIDDEN_TOURS = new Set(); // tours switched off in the admin panel

async function loadLiveData() {
  if (typeof BACKEND === "undefined" || !BACKEND.key) return;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  const get = (path) =>
    fetch(BACKEND.url + "/rest/v1/" + path, { headers: { apikey: BACKEND.key }, signal: ctrl.signal }).then((r) => {
      if (!r.ok) throw new Error(path + " " + r.status);
      return r.json();
    });
  const dubaiToday = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);
  try {
    const [tours, settings, blocked] = await Promise.all([
      get("tours?select=slug,data,sort&order=sort"),
      get("site_settings?select=cutoff_hour,whatsapp,phone,email,offer_on,offer_text&id=eq.1"),
      get("blocked_dates?select=date,tour_slug&date=gte." + dubaiToday),
    ]);
    if (tours.length) {
      const live = new Set(tours.map((t) => t.slug));
      Object.keys(TOURS).forEach((slug) => {
        if (!live.has(slug)) {
          HIDDEN_TOURS.add(slug);
          delete TOURS[slug];
        }
      });
      tours.forEach((t) => {
        if (t.data && t.data.name) TOURS[t.slug] = t.data;
      });
    }
    SITE.blocked = blocked;
    const st = settings[0];
    if (st) applySiteSettings(st);
  } catch (err) {
    console.warn("Live tour data not loaded, using the built-in data", err);
  } finally {
    clearTimeout(timer);
  }
}

function applySiteSettings(st) {
  if (Number.isInteger(st.cutoff_hour)) SITE.cutoffHour = st.cutoff_hour;
  const wa = String(st.whatsapp || "").replace(/D/g, "");
  if (wa.length >= 8 && wa !== WHATSAPP_NUMBER) {
    document.querySelectorAll('a[href*="wa.me/' + WHATSAPP_NUMBER + '"]').forEach((a) => {
      a.href = a.href.replace("wa.me/" + WHATSAPP_NUMBER, "wa.me/" + wa);
    });
    WHATSAPP_NUMBER = wa;
  }
  const phone = String(st.phone || "").trim();
  if (phone) {
    document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
      a.href = "tel:" + phone.replace(/[^d+]/g, "");
      const label = a.querySelector("span") || a;
      label.textContent = phone;
    });
  }
  const email = String(st.email || "").trim();
  if (email) {
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      a.href = "mailto:" + email;
      const label = a.querySelector("span") || a;
      label.textContent = email;
    });
  }
  // Offer banner: a thin strip at the top of every page, switched on in the admin panel
  if (st.offer_on && st.offer_text && navbar) {
    const bar = document.createElement("div");
    bar.className = "offer-bar";
    bar.textContent = st.offer_text;
    navbar.prepend(bar);
    document.body.classList.add("has-offer");
  }
}

// Hide cards and sections of tours that are switched off
const hideTourCards = () => {
  HIDDEN_TOURS.forEach((slug) => {
    document.querySelectorAll('[data-tour="' + slug + '"], [data-spotlight-tour="' + slug + '"]').forEach((el) => (el.hidden = true));
  });
};

function startToursUI() {
hideTourCards();

// =========================================================
// Price sync: fill every price element from the TOURS object so
// prices live in ONE place. Covers spotlight sections (data-spotlight-tour),
// homepage wide cards, and tours-page cards (both use data-tour on .tour-card
// or .tour-wide). The hardcoded HTML values remain as a no-JS fallback.
// =========================================================
(function syncPrices() {
  const fmt = (n) => "AED " + (Number.isInteger(n) ? n : n.toFixed(2));

  // Text from the admin panel replaces the text written in the page. data-i18n is removed from
  // those elements, so the language switcher does not put the old built-in wording back.
  const setText = (el, text) => {
    if (!el || text == null || text === "") return;
    el.textContent = text;
    el.removeAttribute("data-i18n");
  };
  const setList = (ul, items) => {
    if (!ul || !Array.isArray(items) || !items.length) return;
    ul.textContent = "";
    items.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });
  };

  document.querySelectorAll("[data-spotlight-tour]").forEach((section) => {
    const tour = TOURS[section.dataset.spotlightTour];
    if (!tour) return;
    // Home page feature box: name, tagline, text and list
    const h2spans = section.querySelectorAll("h2 > span");
    setText(h2spans[0], tour.name);
    setText(h2spans[1], tour.accent);
    if (tour.spotlight) {
      setText(section.querySelector(".spotlight-tagline"), tour.spotlight.tagline);
      setText(section.querySelector(".spotlight-desc"), tour.spotlight.desc);
      setList(section.querySelector(".spotlight-list"), tour.spotlight.list);
    }
    const el = section.querySelector(".spotlight-price");
    if (!el) return;
    el.innerHTML = fmt(tour.price) + (tour.was ? ' <del class="was">AED ' + tour.was + "</del>" : "");
  });

  document.querySelectorAll(".tour-card[data-tour], .tour-wide[data-tour]").forEach((card) => {
    const tour = TOURS[card.dataset.tour];
    if (!tour) return;
    // Card name, type badge, short text and the first 3 highlights
    const fullName = [tour.name, tour.accent].filter(Boolean).join(" ");
    setText(card.querySelector(".tour-body h3"), fullName);
    setText(card.querySelector(".tour-type-badge"), tour.type);
    setText(card.querySelector(".tour-body > p"), tour.cardText);
    setList(card.querySelector(".tour-body ul"), (tour.points || []).slice(0, 3));
    const wa = card.querySelector('a[href*="wa.me/"]');
    if (wa) wa.href = wa.href.replace(/\?text=.*/, "?text=" + encodeURIComponent("Hello NXT Tours! I'd like to book the " + fullName + "."));
    // Card photo = the tour page's main photo, so both always match
    const img = card.querySelector(".tour-img-wrap img");
    if (img && tour.photos && tour.photos[0]) {
      img.src = tour.photos[0].src;
      img.alt = tour.photos[0].alt;
      img.style.objectPosition = tour.photos[0].pos || "";
    }
    const el = card.querySelector(".tour-price");
    if (!el) return;
    el.innerHTML = fmt(tour.price) + (tour.was ? ' <del class="was">AED ' + tour.was + "</del>" : "");
  });
})();

// Sliders linked to a tour (data-slider-tour="abu-dhabi"): rebuild the slides, dots and counter
// from that tour's photos, so the homepage slider shows exactly the tour page's photos.
document.querySelectorAll("[data-slider-tour]").forEach((root) => {
  const tour = TOURS[root.dataset.sliderTour];
  if (!tour || !tour.photos || !tour.photos.length) return;
  const total = tour.photos.length;
  const stage = root.querySelector("[aria-live]");
  const dotsEl = root.querySelector(".slider-dots");
  stage.textContent = "";
  dotsEl.textContent = "";
  tour.photos.forEach((p, i) => {
    const fig = document.createElement("figure");
    fig.className = "slide" + (i === 0 ? " is-active" : "");
    fig.setAttribute("role", "group");
    fig.setAttribute("aria-roledescription", "slide");
    fig.setAttribute("aria-label", i + 1 + " of " + total);
    if (i) fig.setAttribute("aria-hidden", "true");
    const im = document.createElement("img");
    im.src = p.src;
    im.alt = p.alt;
    im.loading = "lazy";
    im.decoding = "async";
    if (p.pos) im.style.objectPosition = p.pos;
    const cap = document.createElement("figcaption");
    cap.textContent = p.cap;
    fig.appendChild(im);
    fig.appendChild(cap);
    stage.appendChild(fig);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", "Go to photo " + (i + 1));
    if (i === 0) dot.className = "is-current";
    dotsEl.appendChild(dot);
  });
  const counter = root.querySelector(".slider-count");
  if (counter) counter.textContent = "1 / " + total;
});

document.querySelectorAll("[data-slider]").forEach(initSlider);

if (document.querySelector(".tour-card[data-tour]")) {
  const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const money = (n) => "AED " + (Number.isInteger(n) ? n : n.toFixed(2));

  // ---- Build the (empty) popup once and put it in the page ----
  const dialog = document.createElement("dialog");
  dialog.className = "tour-modal";
  dialog.setAttribute("aria-labelledby", "tm-title");
  dialog.innerHTML =
    '<div class="tm-panel">' +
      // The x and the arrows are SVG icons (not text characters) so they sit at the exact centre of their round buttons
      '<button type="button" class="tm-close" aria-label="Close tour details"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="tm-gallery">' +
        '<span class="tm-badge"></span>' +
        '<img class="tm-photo" alt="" />' +
        '<button type="button" class="tm-arrow tm-prev" aria-label="Previous photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.5 5l-7 7 7 7"/></svg></button>' +
        '<button type="button" class="tm-arrow tm-next" aria-label="Next photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 5l7 7-7 7"/></svg></button>' +
        '<div class="tm-caption"></div>' +
        '<div class="tm-thumbs"></div>' +
      '</div>' +
      '<div class="tm-info">' +
        '<div class="tm-scroll">' +
          '<span class="eyebrow eyebrow-lines is-inline">Tour details</span>' +
          '<h2 class="tm-title" id="tm-title"></h2>' +
          '<div class="tm-price-row"><strong class="tm-price"></strong><del class="tm-was"></del><span class="tm-save"></span></div>' +
          '<ul class="tm-facts"></ul>' +
          '<p class="tm-intro"></p>' +
          '<h3>Highlights</h3><ul class="tm-points"></ul>' +
          '<div class="tm-extra"></div>' +
          '<p class="tm-ask">Need the exact timings, itinerary or the private-tour price? Message us and we\'ll send everything.</p>' +
        '</div>' +
        '<div class="tm-book">' +
          '<div class="tm-book-row">' +
            '<label>Travel date<input type="date" class="tm-date" /></label>' +
            '<label>Guests<input type="number" class="tm-guests" min="1" max="60" placeholder="e.g. 4" /></label>' +
          '</div>' +
          '<a class="btn btn-solid tm-wa" target="_blank" rel="noopener">Book on WhatsApp</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(dialog);

  const q = (sel) => dialog.querySelector(sel);
  const gallery = q(".tm-gallery"), photoEl = q(".tm-photo"), captionEl = q(".tm-caption"), thumbsEl = q(".tm-thumbs");
  const dateEl = q(".tm-date"), guestsEl = q(".tm-guests"), waEl = q(".tm-wa");
  let tour = null, slug = "", photoIndex = 0, swapToken = 0, thumbBtns = [];

  // Travel date can't be in the past
  const now = new Date();
  dateEl.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  // ---- Photos: fade out, load the next one, fade in ----
  const showPhoto = (i) => {
    const photos = tour.photos;
    photoIndex = (i + photos.length) % photos.length;
    const p = photos[photoIndex];
    const token = ++swapToken;
    photoEl.classList.add("is-swapping");
    const preload = new Image();
    const apply = () => {
      if (token !== swapToken) return; // a newer click already took over
      photoEl.src = p.src;
      photoEl.alt = p.alt;
      photoEl.style.objectPosition = p.pos || "50% 50%";
      captionEl.textContent = p.cap;
      photoEl.classList.remove("is-swapping");
    };
    preload.onload = preload.onerror = () => setTimeout(apply, noMotion ? 0 : 150);
    preload.src = p.src;
    thumbBtns.forEach((b, n) => b.classList.toggle("is-active", n === photoIndex));
  };

  // ---- WhatsApp button: message is rebuilt whenever date / guests change ----
  const updateWhatsApp = () => {
    const lines = ["Hello NXT Tours!", "I'd like to book the " + tour.name + " " + tour.accent + " (" + money(tour.price) + ")."];
    if (dateEl.value) lines.push("Travel date: " + dateEl.value);
    if (guestsEl.value) lines.push("Guests: " + guestsEl.value);
    waEl.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
  };
  dateEl.addEventListener("input", updateWhatsApp);
  guestsEl.addEventListener("input", updateWhatsApp);

  // Small helpers to fill lists / optional sections
  const fillList = (ul, items) => {
    ul.textContent = "";
    items.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      ul.appendChild(li);
    });
  };
  const extraSection = (title, content) => {
    const wrap = document.createElement("div");
    const h = document.createElement("h3");
    h.textContent = title;
    wrap.appendChild(h);
    if (Array.isArray(content)) {
      const ul = document.createElement("ul");
      ul.className = "tm-points";
      fillList(ul, content);
      wrap.appendChild(ul);
    } else {
      const p = document.createElement("p");
      p.className = "tm-intro";
      p.textContent = content;
      wrap.appendChild(p);
    }
    return wrap;
  };

  // A tour can list its stops (tour.stops = [{ name, src, alt }]): each one is shown as its OWN
  // small photo with its name, instead of all of them squeezed into one poster image.
  const stopsSection = (allStops, title, moreLabel) => {
    const stops = allStops.filter((s) => s.src); // stops that have a photo
    const moreStops = allStops.filter((s) => !s.src).map((s) => s.name); // name only, no photo yet
    const wrap = document.createElement("div");
    const h = document.createElement("h3");
    h.textContent = (title || "Stops on this tour") + " (" + allStops.length + ")";
    wrap.appendChild(h);
    const grid = document.createElement("div");
    grid.className = "tm-stops";
    stops.forEach((s) => {
      const fig = document.createElement("figure");
      const im = document.createElement("img");
      im.src = s.src;
      im.alt = s.alt || s.name;
      im.loading = "lazy";
      im.decoding = "async";
      im.width = 1000;
      im.height = 667;
      const cap = document.createElement("figcaption");
      cap.textContent = s.name;
      fig.appendChild(im);
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
    wrap.appendChild(grid);

    // Stops that don't have their own photo yet: listed by name
    if (moreStops && moreStops.length) {
      const label = document.createElement("p");
      label.className = "tm-morestops-label";
      label.textContent = moreLabel || "Also on the route:";
      wrap.appendChild(label);
      const ul = document.createElement("ul");
      ul.className = "tm-morestops";
      fillList(ul, moreStops);
      wrap.appendChild(ul);
    }
    return wrap;
  };

  // ---- Open / close ----
  const openTour = (key) => {
    if (!TOURS[key]) return;
    slug = key;
    tour = TOURS[key];

    q(".tm-badge").textContent = tour.type;
    const title = q(".tm-title");
    title.textContent = tour.name + " ";
    const accent = document.createElement("span");
    accent.className = "accent-word";
    accent.textContent = tour.accent;
    title.appendChild(accent);

    q(".tm-price").textContent = money(tour.price);
    q(".tm-was").textContent = money(tour.was);
    q(".tm-save").textContent = "Save " + Math.round((1 - tour.price / tour.was) * 100) + "%";

    // Quick facts: only things we really know (tour type + site-wide promises)
    const facts = [tour.type];
    if (tour.duration) facts.push(tour.duration);
    facts.push("Hotel & metro pickup included", "English-speaking guides", "Family-friendly");
    fillList(q(".tm-facts"), facts);

    q(".tm-intro").textContent = tour.intro;
    fillList(q(".tm-points"), tour.points);

    // Optional extra sections (show up only when the data exists)
    const extra = q(".tm-extra");
    extra.textContent = "";
    if (tour.stops) extra.appendChild(stopsSection(tour.stops, tour.stopsTitle, tour.stopsTitle ? "Included:" : ""));
    if (tour.pickup) extra.appendChild(extraSection("Pickup", tour.pickup));
    if (tour.itinerary) extra.appendChild(extraSection("Itinerary", tour.itinerary));
    if (tour.included) extra.appendChild(extraSection("What's included", tour.included));
    if (tour.notIncluded) extra.appendChild(extraSection("Not included", tour.notIncluded));
    if (tour.bring) extra.appendChild(extraSection("What to bring", tour.bring));
    if (tour.childPrice) extra.appendChild(extraSection("Children", tour.childPrice));
    if (tour.cancellation) extra.appendChild(extraSection("Cancellation", tour.cancellation));

    // Gallery
    thumbsEl.textContent = "";
    thumbBtns = tour.photos.map((p, n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show photo " + (n + 1) + ": " + p.cap);
      const im = document.createElement("img");
      im.src = p.src;
      im.alt = "";
      im.style.objectPosition = p.pos || "50% 50%";
      b.appendChild(im);
      b.addEventListener("click", () => showPhoto(n));
      thumbsEl.appendChild(b);
      return b;
    });
    gallery.classList.toggle("is-single", tour.photos.length < 2);
    photoEl.removeAttribute("src");
    showPhoto(0);

    dateEl.value = "";
    guestsEl.value = "";
    updateWhatsApp();
    q(".tm-scroll").scrollTop = 0;

    if (!dialog.open) dialog.showModal();
    document.body.classList.add("modal-open");
    history.replaceState(null, "", "#" + slug); // makes the popup shareable: tours.html#desert-safari
  };

  // Undo what opening did: allow page scrolling again and clear the #tour part of the URL
  const afterClose = () => {
    document.body.classList.remove("modal-open");
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  };

  const closeTour = () => {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    dialog.classList.add("is-closing");
    setTimeout(() => {
      dialog.close();
      dialog.classList.remove("is-closing");
      afterClose();
    }, noMotion ? 0 : 180);
  };

  dialog.addEventListener("cancel", (e) => { e.preventDefault(); closeTour(); }); // Esc key
  dialog.addEventListener("click", (e) => { if (e.target === dialog) closeTour(); }); // click on the dark backdrop
  q(".tm-close").addEventListener("click", closeTour);
  q(".tm-prev").addEventListener("click", () => showPhoto(photoIndex - 1));
  q(".tm-next").addEventListener("click", () => showPhoto(photoIndex + 1));
  document.addEventListener("keydown", (e) => {
    if (!dialog.open || e.target.closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") showPhoto(photoIndex + 1);
    if (e.key === "ArrowLeft") showPhoto(photoIndex - 1);
  });

  // ---- "Places You'll Visit": one separate card for EVERY stop of a tour ----
  // Built from TOURS[..].stops into any <div data-stops> on the page (Home and Tours pages).
  // A stop with no src yet gets a branded placeholder instead of a photo.
  // Clicking a stop card (or the "View Details" pill) opens the tour it belongs to.
  document.querySelectorAll("[data-stops]").forEach((box) => {
    Object.keys(TOURS).forEach((key) => {
      const t = TOURS[key];
      const list = t.stops || [];
      if (!list.length) return;

      const group = document.createElement("div");
      group.className = "stops-group";

      const head = document.createElement("div");
      head.className = "stops-group-head";
      const title = document.createElement("h3");
      title.textContent = t.name + " " + t.accent;
      const more = document.createElement("button");
      more.type = "button";
      more.className = "stops-more";
      more.textContent = "Tour details";
      more.addEventListener("click", () => openTour(key));
      head.appendChild(title);
      head.appendChild(more);
      group.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "stop-grid";
      list.forEach((s) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "stop-card";
        card.setAttribute("aria-label", s.name + ", " + (t.stopLine || "a stop on the " + t.name + " " + t.accent) + ". Open tour details");

        const pic = document.createElement("span");
        pic.className = "stop-img";
        if (s.src) {
          const im = document.createElement("img");
          im.src = s.src;
          im.alt = s.alt || s.name;
          im.width = 1000;
          im.height = 667;
          im.loading = "lazy";
          im.decoding = "async";
          pic.appendChild(im);
        } else {
          // No photo yet: the NXT logo on a crimson panel (a decorative image, so empty alt)
          pic.classList.add("is-empty");
          const logo = document.createElement("img");
          logo.src = "images/logo-mark.png";
          logo.alt = "";
          logo.width = 72;
          logo.height = 72;
          pic.appendChild(logo);
        }

        // Text under the photo, same layout as the tour cards: name, small line, pill button
        const body = document.createElement("span");
        body.className = "stop-body";
        const name = document.createElement("span");
        name.className = "stop-name";
        name.textContent = s.name;
        const sub = document.createElement("span");
        sub.className = "stop-sub";
        sub.textContent = t.stopLine || "Stop on the " + t.name + " " + t.accent;
        const btn = document.createElement("span");
        btn.className = "stop-btn";
        btn.textContent = "View Details";
        body.appendChild(name);
        body.appendChild(sub);
        body.appendChild(btn);

        card.appendChild(pic);
        card.appendChild(body);
        card.addEventListener("click", () => openTour(key));
        grid.appendChild(card);
      });
      group.appendChild(grid);
      box.appendChild(group);
    });
  });

  // ---- Cards: a click anywhere on the card (except its Book Now link) opens the tour's own page ----
  // (Previously this opened the popup dialog; the user asked for a full page instead, like the
  // reference site he showed. The popup code above still exists but nothing calls it any more.)
  document.querySelectorAll(".tour-card[data-tour]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      location.href = "tour.html?t=" + card.dataset.tour;
    });
  });

  // An old #slug link (from before the tour page existed) still lands on the right tour
  const startKey = location.hash.slice(1);
  if (TOURS[startKey]) location.replace("tour.html?t=" + startKey);
}

// =========================================================
// Hover sparks
// While the mouse is over a button (.btn-solid, .btn-accent, .btn-outline-dark
// or the nav "Book on WhatsApp" pill), small orange and crimson sparks fly up off it like
// embers from lava. When the mouse leaves, no new sparks appear, the ones in the
// air fade out, and the button is back to normal. On a touch screen a tap
// gives one short burst instead (there is no hover on a phone).
// The sparks are tiny dots in a fixed layer above the page, so the button's own
// edges never clip them. Nothing runs for people who asked for reduced motion.
// =========================================================
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const SPARK_BUTTONS = ".btn-solid, .btn-accent, .btn-outline-dark, .nav-links a.nav-cta";
  // Brand colours: orange #F39200 and crimson #AA1345 with lighter steps of each
  const SPARK_COLORS = ["#f39200", "#ffb547", "#ffd08a", "#aa1345", "#d9406e", "#f2c9d6"];
  const SPARK_SIZE = 3; // every spark is exactly this many pixels, small and all the same
  const MAX_SPARKS = 18; // never more than this many in the air at once
  let liveSparks = 0;
  let sparkTimer = null;
  let sparkButton = null;

  // Where the sparks live: the page, or (for a button inside the open tour popup) the popup itself,
  // because the popup sits above everything else on the screen.
  const getSparkLayer = (button) => {
    const host = button.closest("dialog[open]") || document.body;
    let layer = host.querySelector(":scope > .spark-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "spark-layer";
      layer.setAttribute("aria-hidden", "true");
      host.appendChild(layer);
    }
    return layer;
  };

  const spawnSparks = (button, count) => {
    const box = button.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const layer = getSparkLayer(button);
    // the layer's top-left corner is the screen corner, except inside a moved/transformed popup
    const origin = layer.getBoundingClientRect();

    for (let i = 0; i < count && liveSparks < MAX_SPARKS; i++) {
      const size = SPARK_SIZE;
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      const x = box.left + box.width * (0.06 + Math.random() * 0.88) - origin.left;
      const y = box.top + box.height * (0.1 + Math.random() * 0.6) - origin.top;

      const spark = document.createElement("i");
      spark.className = "spark";
      spark.style.cssText =
        "width:" + size + "px;height:" + size + "px;left:" + (x - size / 2) + "px;top:" + (y - size / 2) + "px;" +
        "background:" + color + ";box-shadow:0 0 3px " + color + ";";
      layer.appendChild(spark);
      liveSparks++;

      // Fly up and a little sideways, wobble halfway, shrink and fade out
      const drift = (Math.random() - 0.5) * 40;
      const rise = 28 + Math.random() * 32;
      const wobble = (Math.random() - 0.5) * 10;
      const flight = spark.animate(
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          { transform: "translate(" + (drift * 0.55 + wobble) + "px, " + -rise * 0.65 + "px) scale(0.85)", opacity: 0.95, offset: 0.5 },
          { transform: "translate(" + drift + "px, " + -rise + "px) scale(0.15)", opacity: 0 }
        ],
        { duration: 700 + Math.random() * 400, easing: "cubic-bezier(0.15, 0.6, 0.35, 1)" }
      );
      flight.onfinish = () => {
        spark.remove();
        liveSparks--;
      };
    }
  };

  const stopSparks = () => {
    clearInterval(sparkTimer);
    sparkTimer = null;
    sparkButton = null;
  };

  // The mouse comes onto a button: a first burst, then a steady stream while it stays there
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const button = e.target.closest && e.target.closest(SPARK_BUTTONS);
    if (!button || button === sparkButton) return; // moving between the button's own children is not "coming onto" it
    stopSparks();
    sparkButton = button;
    spawnSparks(button, 3);
    sparkTimer = setInterval(() => spawnSparks(button, 1), 150);
  });

  // The mouse leaves the button: stop making sparks (the ones in the air finish their flight)
  document.addEventListener("pointerout", (e) => {
    const button = e.target.closest && e.target.closest(SPARK_BUTTONS);
    if (!button || button !== sparkButton) return;
    if (button.contains(e.relatedTarget)) return;
    stopSparks();
  });

  // Touch screens: one short burst when the button is tapped
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    const button = e.target.closest && e.target.closest(SPARK_BUTTONS);
    if (button) spawnSparks(button, 6);
  });
}


// =========================================================
// Reviews carousel (Home): every 2 seconds the next review comes to the centre.
// The centre card is bigger and highlighted; the cards next to it sit a little higher,
// smaller and softly blurred; the rest are hidden. It loops forever with no clones:
// each card just gets a new "offset from the centre" (-1, 0, 1, ...) and CSS animates it.
// =========================================================
document.querySelectorAll("[data-reviews]").forEach((slider) => {
  const viewport = slider.querySelector(".testimonial-grid");
  if (!viewport) return;

  // People who asked for less motion keep a normal row they can scroll by hand
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const STEP_MS = 2000; // how long each review stays in the centre

  // Put the cards in one stage so they can be placed around its middle
  const track = document.createElement("div");
  track.className = "reviews-track";
  while (viewport.firstChild) track.appendChild(viewport.firstChild);
  viewport.appendChild(track);

  const cards = Array.from(track.querySelectorAll(".testimonial-card"));
  const total = cards.length;
  if (total < 2) return;
  viewport.classList.add("is-carousel");

  let active = 0; // index of the card in the centre
  const lastOffset = new Array(total).fill(0);

  // Sideways distance between neighbouring cards = card width + a gap
  const measure = () => {
    cards.forEach((c) => { c.style.height = ""; });
    const width = cards[0].offsetWidth;
    const tallest = Math.max(...cards.map((c) => c.offsetHeight));
    cards.forEach((c) => { c.style.height = tallest + "px"; }); // same height, names line up
    track.style.setProperty("--stage-h", tallest + "px");
    track.style.setProperty("--step", width + 24 + "px");
  };

  // Offset of card i from the centre, wrapped so it is between -total/2 and total/2
  const offsetOf = (i) => {
    let off = (i - active) % total;
    if (off > total / 2) off -= total;
    if (off < -total / 2) off += total;
    return off;
  };

  const render = () => {
    cards.forEach((card, i) => {
      const off = offsetOf(i);
      const abs = Math.abs(off);

      // A card wrapping from one far end to the other jumps (invisible, it is hidden there)
      const jumped = Math.abs(off - lastOffset[i]) > total / 2;
      if (jumped) card.classList.add("is-jumping");
      lastOffset[i] = off;

      card.style.setProperty("--off", off);
      if (abs === 0) {
        card.style.setProperty("--y", "0px");
        card.style.setProperty("--s", "1.06");
        card.style.setProperty("--o", "1");
        card.style.setProperty("--b", "0px");
        card.style.setProperty("--z", "3");
      } else {
        // next to the centre card: a little higher, smaller, softly blurred; further out: hidden
        card.style.setProperty("--y", "-24px");
        card.style.setProperty("--s", abs === 1 ? "0.93" : "0.86");
        card.style.setProperty("--o", abs === 1 ? "0.75" : "0");
        card.style.setProperty("--b", abs === 1 ? "1.6px" : "2.6px");
        card.style.setProperty("--z", abs === 1 ? "2" : "1");
      }
      card.classList.toggle("is-center", abs === 0);
      card.classList.toggle("is-far", abs > 1);
      card.setAttribute("aria-hidden", abs === 0 ? "false" : "true");

      if (jumped) {
        void card.offsetWidth; // apply the jump now, then switch the animation back on
        card.classList.remove("is-jumping");
      }
    });
  };

  const goTo = (index) => {
    active = (index + total) % total;
    render();
  };

  // Auto-advance every 2 seconds. It stops while the mouse is on the cards (so a guest can read)
  // and while the browser tab is hidden. Touch screens are ignored here: a tap must not freeze it.
  let timer;
  let mouseOnCards = false;
  const start = () => {
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden && !mouseOnCards) goTo(active + 1); }, STEP_MS);
  };
  viewport.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") mouseOnCards = true;
  });
  viewport.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") {
      mouseOnCards = false;
      start(); // a fresh 2 second countdown when the mouse leaves
    }
  });

  // Left and right arrows (SVG chevrons drawn exactly in the middle of their box)
  const makeArrow = (dir) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reviews-arrow is-" + dir;
    btn.setAttribute("aria-label", dir === "prev" ? "Previous review" : "Next review");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
      (dir === "prev" ? "M15.5 5l-7 7 7 7" : "M8.5 5l7 7-7 7") +
      '"/></svg>';
    btn.addEventListener("click", () => {
      goTo(active + (dir === "prev" ? -1 : 1));
      start(); // fresh 2 second countdown after a manual click
    });
    slider.appendChild(btn);
  };
  makeArrow("prev");
  makeArrow("next");

  // Clicking a side card brings it to the centre
  cards.forEach((card, i) => {
    card.addEventListener("click", () => {
      if (i === active) return;
      goTo(i);
      start();
    });
  });

  measure();
  render();
  start();
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure); // fonts may change the card heights once loaded
});


// =========================================================
// Tour details page (tour.html): fills the page from the SAME TOURS data the old popup used.
// URL looks like tour.html?t=abu-dhabi. If the slug is missing/unknown, send the visitor to
// the Tours page instead of showing a broken page.
// =========================================================
const tourPage = document.querySelector("[data-tour-page]");
if (tourPage) {
  const slug = new URLSearchParams(location.search).get("t");
  const tour = TOURS[slug];

  if (!tour) {
    location.replace("tours.html");
  } else {
    const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const money = (n) => "AED " + (Number.isInteger(n) ? n : n.toFixed(2));
    const q = (sel) => document.querySelector(sel);

    document.title = tour.name + " " + tour.accent + " | NXT Tours Dubai";
    // Google reads the page after this script runs, so each tour gets its own description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && tour.intro) metaDesc.content = tour.intro.length > 158 ? tour.intro.slice(0, 155).replace(/\s+\S*$/, "") + "..." : tour.intro;
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.href = canon.href.replace(/\?t=[^&]*/, "?t=" + encodeURIComponent(slug));

    q("[data-tour-crumb]").textContent = tour.name + " " + tour.accent;
    q("[data-tour-badge]").textContent = tour.type;
    q("[data-tour-meta-place]").textContent = tour.name;
    if (tour.duration) {
      const durEl = q("[data-tour-meta-duration]");
      durEl.hidden = false;
      durEl.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> ';
      durEl.append(tour.duration);
    }

    const titleEl = q("[data-tour-title]");
    titleEl.textContent = tour.heroTitle.prefix + " ";
    const accentEl = document.createElement("span");
    accentEl.className = "accent-word";
    accentEl.textContent = tour.heroTitle.accent;
    titleEl.appendChild(accentEl);

    // ---- Prices: sharing price in the crimson box, private prices in their own block below ----
    // tour.price / tour.was are the SHARING prices (per person). Private prices are per vehicle
    // (tour.privateTiers) or "on request". Private-only tours (Khorfakkan) show only their own price.
    const privateOnly = tour.type === "Private Only";
    q("[data-tour-price-label]").textContent = privateOnly ? "Private tour" : "Sharing tour, per person";
    q("[data-tour-price]").textContent = money(tour.price);
    const wasEl = q("[data-tour-was]");
    const saveEl = q("[data-tour-save]");
    if (tour.was) {
      wasEl.textContent = money(tour.was);
      saveEl.textContent = "Save " + Math.round((1 - tour.price / tour.was) * 100) + "%";
    } else {
      wasEl.hidden = true;
      saveEl.hidden = true;
    }

    // Booking options, used by the "Tour option" dropdown and the WhatsApp message.
    // kind decides the rest of the form: sharing asks for the number of persons, private offers hotel pickup.
    const sharingText = "Sharing, " + money(tour.price) + " per person";
    const options = privateOnly
      ? [{ label: "Private tour, " + money(tour.price), kind: "private", text: "Private tour, " + money(tour.price) }]
      : [{ label: "Sharing, " + money(tour.price) + " / person", kind: "sharing", text: sharingText }];

    if (!privateOnly) {
      q("[data-tour-private]").hidden = false;
      const listEl = q("[data-tour-private-list]");
      const tiers = tour.privateTiers || [];
      tiers.forEach((t) => {
        const li = document.createElement("li");
        li.innerHTML = "<span></span><strong></strong>";
        li.querySelector("span").textContent = t.seats + "-seater vehicle";
        li.querySelector("strong").textContent = money(t.price);
        listEl.appendChild(li);
        options.push({ label: "Private " + t.seats + "-seater, " + money(t.price), kind: "private", text: "Private, " + t.seats + "-seater vehicle, " + money(t.price) });
      });
      if (!tiers.length) {
        const li = document.createElement("li");
        li.innerHTML = "<span>Price</span><strong>On request</strong>";
        listEl.appendChild(li);
        options.push({ label: "Private tour, price on request", kind: "private", text: "Private tour (please send me the price)" });
      }
      q("[data-tour-private-note]").textContent =
        (tour.privateNote ? tour.privateNote + ". " : "") + "Just your group, at your own pace.";
    }

    const optionEl = q("[data-tour-option]");
    if (options.length > 1) {
      q("[data-tour-option-field]").hidden = false;
      options.forEach((o, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = o.label;
        optionEl.appendChild(opt);
      });
    }
    const chosenOption = () => options[Number(optionEl.value) || 0];

    // Quick facts: only things NXT Tours already promises site-wide (same wording as the old popup
    // and the Tours page hero: "Pickup included")
    const facts = [tour.type];
    if (tour.duration) facts.push(tour.duration);
    facts.push(tour.pickupFact || "Hotel & metro pickup included", "English-speaking guides", "Family-friendly");
    const factsEl = q("[data-tour-facts]");
    facts.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      factsEl.appendChild(li);
    });

    q("[data-tour-intro]").textContent = tour.intro;

    const pointsEl = q("[data-tour-points]");
    tour.points.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      pointsEl.appendChild(li);
    });

    // ---- "Why travellers choose this experience": 4 cards, same look as the About page's
    // "why book" tiles. The first 3 are real, already-used site-wide promises; the photo-stops
    // card uses this tour's own real highlights so it is different for every tour. ----
    const whyItems = [
      {
        icon: '<path d="M3 17V7a1 1 0 0 1 1-1h10.5L21 12.5V17"/><path d="M14.5 6v6.5H21"/><path d="M3 17h1.5M8.5 17h6M18.5 17H21"/><circle cx="6.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
        title: tour.pickupCard ? tour.pickupCard.title : "Hotel & Metro Pickup",
        text: tour.pickupCard ? tour.pickupCard.text : "Pickup and drop-off at your hotel or a nearby metro station.",
        photo: "images/why-hotel-pickup-bus.webp",
      },
      {
        icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        title: "Friendly, English-Speaking Guide",
        text: "Real commentary and local context at every stop.",
        photo: "images/why-guide.webp",
      },
      {
        icon: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
        title: "Photo Stops at Every Highlight",
        text: "Capture " + tour.points.slice(0, 2).join(" and ") + ".",
        // Real photo only for the tour it actually shows (Ferrari World is on the Abu Dhabi
        // route, Dubai Frame is on the Dubai route); other tours keep the placeholder until
        // their own stop photo is supplied
        photo:
          slug === "abu-dhabi"
            ? "images/why-photo-stops.webp"
            : slug === "dubai"
            ? "images/why-photo-stops-dubai.webp"
            : undefined,
      },
      {
        icon: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="M9 12l2 2 4-4"/>',
        title: "No Hidden Costs",
        text: tour.costNote || "Every stop is included, nothing extra to pay at the door.",
        photo: slug === "abu-dhabi" ? "images/why-no-hidden-costs.webp" : undefined,
      },
    ];
    const whyEl = q("[data-tour-why]");
    whyItems.forEach((item) => {
      const card = document.createElement("div");
      card.className = "why-card card fade-up";
      // A real photo when we have one; otherwise the same branded placeholder used for stop
      // cards elsewhere on the site (NXT logo on a crimson panel), so the row stays even until
      // more photos are supplied.
      const photoHtml = item.photo
        ? '<div class="tour-why-photo"><img src="' + item.photo + '" alt="" loading="lazy" decoding="async" /></div>'
        : '<div class="tour-why-photo is-empty"><img src="images/logo-mark.png" alt="" /></div>';
      card.innerHTML =
        photoHtml +
        '<div class="why-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        item.icon +
        "</svg></div><h3></h3><p></p>";
      card.querySelector("h3").textContent = item.title;
      card.querySelector("p").textContent = item.text;
      card.classList.add("in-view"); // added after the scroll-reveal observer runs, so reveal it directly
      whyEl.appendChild(card);
    });

    // ---- Gallery: prev/next + thumbnail strip below the photo, plus a "n / total" counter ----
    const photoEl = q("[data-tour-photo]");
    const captionEl = q("[data-tour-caption]");
    const thumbsEl = q("[data-tour-thumbs]");
    const countEl = q("[data-tour-lightbox-count]");
    let photoIndex = 0;
    let swapToken = 0;
    let thumbBtns = [];

    const showPhoto = (i) => {
      const photos = tour.photos;
      photoIndex = (i + photos.length) % photos.length;
      const p = photos[photoIndex];
      const token = ++swapToken;
      photoEl.classList.add("is-swapping");
      const preload = new Image();
      const apply = () => {
        if (token !== swapToken) return;
        photoEl.src = p.src;
        photoEl.alt = p.alt;
        photoEl.style.objectPosition = p.pos || "50% 50%";
        captionEl.textContent = p.cap;
        photoEl.classList.remove("is-swapping");
      };
      preload.onload = preload.onerror = () => setTimeout(apply, noMotion ? 0 : 150);
      preload.src = p.src;
      thumbBtns.forEach((b, n) => b.classList.toggle("is-active", n === photoIndex));
      countEl.textContent = photoIndex + 1 + " / " + photos.length;
    };

    thumbBtns = tour.photos.map((p, n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show photo " + (n + 1) + ": " + p.cap);
      const im = document.createElement("img");
      im.src = p.src;
      im.alt = "";
      im.style.objectPosition = p.pos || "50% 50%";
      b.appendChild(im);
      b.addEventListener("click", () => showPhoto(n));
      thumbsEl.appendChild(b);
      return b;
    });
    const isSingle = tour.photos.length < 2;
    q("[data-tour-lightbox-prev]").hidden = isSingle;
    q("[data-tour-lightbox-next]").hidden = isSingle;
    thumbsEl.hidden = isSingle;
    showPhoto(0);

    q("[data-tour-lightbox-prev]").addEventListener("click", () => showPhoto(photoIndex - 1));
    q("[data-tour-lightbox-next]").addEventListener("click", () => showPhoto(photoIndex + 1));
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") showPhoto(photoIndex + 1);
      if (e.key === "ArrowLeft") showPhoto(photoIndex - 1);
    });

    // ---- Photo grid: one big photo + up to 4 small tiles, adapts to how many photos this tour has.
    // Clicking any tile opens the full-screen viewer above at that photo. ----
    const lightbox = q("[data-tour-lightbox]");
    const openLightbox = (index) => {
      showPhoto(index);
      if (typeof lightbox.showModal === "function") lightbox.showModal();
    };
    q("[data-tour-lightbox-close]").addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.close(); // clicked the backdrop
    });

    const gridEl = q("[data-tour-gallery-grid]");
    const gridPhotos = tour.photos.slice(0, 5); // 1 big + up to 4 small
    const extra = tour.photos.length - gridPhotos.length;
    gridEl.dataset.count = String(gridPhotos.length);
    gridPhotos.forEach((p, i) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = i === 0 ? "g-main" : "g-thumb";
      tile.setAttribute("aria-label", "View photo: " + p.cap);
      const im = document.createElement("img");
      im.src = p.src;
      im.alt = p.alt;
      im.loading = i === 0 ? "eager" : "lazy";
      im.style.objectPosition = p.pos || "50% 50%";
      tile.appendChild(im);
      // The last small tile shows how many more photos this tour has, if any
      if (extra > 0 && i === gridPhotos.length - 1) {
        const more = document.createElement("span");
        more.className = "g-more";
        more.textContent = "+" + extra + " photo" + (extra === 1 ? "" : "s");
        tile.appendChild(more);
      }
      tile.addEventListener("click", () => openLightbox(i));
      gridEl.appendChild(tile);
    });

    // Phones: the grid is too narrow, so show ALL photos as a swipe row (CSS hides one or the other)
    // with a "1 / 14" counter and dots. Tapping a photo opens the same full-screen viewer.
    const swipe = document.createElement("div");
    swipe.className = "tour-swipe";
    swipe.innerHTML =
      '<div class="tour-swipe-track"></div>' +
      '<span class="tour-swipe-count" aria-hidden="true"></span>' +
      '<div class="tour-swipe-dots" aria-hidden="true"></div>';
    const swTrack = swipe.querySelector(".tour-swipe-track");
    const swCount = swipe.querySelector(".tour-swipe-count");
    const swDots = swipe.querySelector(".tour-swipe-dots");
    let dragEndedAt = 0; // set when a mouse drag ends, so that drag does not open the viewer
    tour.photos.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "View photo " + (i + 1) + ": " + p.cap);
      const im = document.createElement("img");
      im.src = p.src;
      im.alt = p.alt || p.cap || "";
      im.loading = i === 0 ? "eager" : "lazy";
      im.decoding = "async";
      im.style.objectPosition = p.pos || "50% 50%";
      b.appendChild(im);
      b.addEventListener("click", () => {
        if (Date.now() - dragEndedAt > 300) openLightbox(i);
      });
      swTrack.appendChild(b);
      swDots.appendChild(document.createElement("span"));
    });
    const swSet = (i) => {
      swCount.textContent = i + 1 + " / " + tour.photos.length;
      [...swDots.children].forEach((d, k) => d.classList.toggle("is-active", k === i));
    };
    swSet(0);
    let swRaf = 0;
    swTrack.addEventListener("scroll", () => {
      cancelAnimationFrame(swRaf);
      swRaf = requestAnimationFrame(() => swSet(Math.round(swTrack.scrollLeft / Math.max(1, swTrack.clientWidth))));
    }, { passive: true });
    // Mouse drag too (phone layouts get checked on computers without touch): drag to move,
    // let go to settle on the nearest photo. A drag never counts as a tap that opens the viewer.
    let drag = null;
    swTrack.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      drag = { x: e.clientX, left: swTrack.scrollLeft, moved: false };
      swTrack.style.scrollSnapType = "none";
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) drag.moved = true;
      swTrack.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      const page = Math.round(swTrack.scrollLeft / swTrack.clientWidth);
      swTrack.scrollTo({ left: page * swTrack.clientWidth, behavior: "smooth" });
      setTimeout(() => (swTrack.style.scrollSnapType = ""), 400);
      if (moved) dragEndedAt = Date.now();
    });
    swTrack.addEventListener("dragstart", (e) => e.preventDefault());
    gridEl.after(swipe);

    // ---- "Your Day, Hour by Hour": vertical timeline. A crimson line fills as you scroll, each
    // dot lights up once you pass it, and each card slides in as it comes into view. ----
    if (tour.timeline && tour.timeline.length) {
      const ICON_PIN = '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>';
      const ICON_VAN = '<path d="M3 17V7a1 1 0 0 1 1-1h10.5L21 12.5V17"/><path d="M14.5 6v6.5H21"/><path d="M3 17h1.5M8.5 17h6M18.5 17H21"/><circle cx="6.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>';
      const ICON_CLOCK = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>';
      const svg = (path) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";

      const section = document.createElement("section");
      section.className = "tl";
      section.innerHTML =
        '<h2>Your Day, <span class="accent-word">Hour by Hour</span></h2>' +
        '<p class="tl-sub"></p>' +
        '<div class="tl-track"><svg class="tl-road" aria-hidden="true"></svg>' +
        '<span class="tl-van" aria-hidden="true">' + svg(ICON_VAN) + "</span>" +
        '<ol class="tl-list"></ol></div>';
      section.querySelector(".tl-sub").textContent =
        (tour.duration ? tour.duration + ". " : "") + "Timings can shift a little with traffic and group size.";
      const listEl = section.querySelector(".tl-list");

      tour.timeline.forEach((s) => {
        const travel = s.kind === "travel";
        const li = document.createElement("li");
        li.className = "tl-item" + (travel ? " is-travel" : "");
        const photo = travel
          ? ""
          : s.src
          ? '<div class="tl-photo"><img alt="" loading="lazy" decoding="async" /></div>'
          : '<div class="tl-photo is-empty"><img src="images/logo-mark.png" alt="" width="56" height="56" /></div>';
        li.innerHTML =
          '<span class="tl-dot">' + svg(travel ? ICON_VAN : ICON_PIN) + "</span>" +
          '<div class="tl-card">' + photo +
            '<div class="tl-body">' +
              '<span class="tl-time"></span>' +
              "<h3></h3>" +
              (s.place ? '<p class="tl-place"></p>' : "") +
              (s.dur ? '<span class="tl-dur">' + svg(ICON_CLOCK) + "<span></span></span>" : "") +
              '<p class="tl-text"></p>' +
            "</div>" +
          "</div>";
        li.querySelector(".tl-time").textContent = s.time;
        li.querySelector("h3").textContent = s.title;
        if (s.place) li.querySelector(".tl-place").textContent = s.place;
        if (s.dur) li.querySelector(".tl-dur span").textContent = s.dur;
        li.querySelector(".tl-text").textContent = s.text;
        if (s.src) {
          const im = li.querySelector(".tl-photo img");
          im.src = s.src;
          im.alt = s.alt || s.title;
        }
        listEl.appendChild(li);
      });

      // Pickup points: a fold-out table so the long list does not push the rest of the page down
      if (tour.pickupAreas && tour.pickupAreas.length) {
        const count = tour.pickupAreas.reduce((n, a) => n + a.points.length, 0);
        const det = document.createElement("details");
        det.className = "tl-pickup";
        det.innerHTML =
          "<summary>" + svg(ICON_VAN) + "<span></span></summary>" +
          '<div class="tl-pickup-body"><p class="tl-pickup-note"></p>' +
          '<table><thead><tr><th scope="col">Pickup point</th><th scope="col">Time</th></tr></thead><tbody></tbody></table></div>';
        det.querySelector("summary span").textContent = "See all " + count + " pickup points and times, by area";
        det.querySelector(".tl-pickup-note").textContent = tour.pickupNote || "";
        const tbody = det.querySelector("tbody");
        tour.pickupAreas.forEach(({ area, points }) => {
          const head = document.createElement("tr");
          head.className = "tl-pickup-area";
          head.innerHTML = '<th colspan="2" scope="rowgroup"></th>';
          head.firstChild.textContent = area;
          tbody.appendChild(head);
          points.forEach(([place, time]) => {
            const tr = document.createElement("tr");
            tr.innerHTML = "<td></td><td></td>";
            tr.children[0].textContent = place;
            tr.children[1].textContent = time;
            tbody.appendChild(tr);
          });
        });
        // Open / close with a smooth slide: animate to the MEASURED height (never "auto"),
        // then clear it so the list can still grow or shrink with the screen width
        const pkBody = det.querySelector(".tl-pickup-body");
        det.querySelector("summary").addEventListener("click", (e) => {
          if (noMotion) return;
          e.preventDefault();
          if (det.classList.contains("is-animating")) return;
          det.classList.add("is-animating");
          let safety = 0;
          const done = (ev) => {
            if (ev.target !== pkBody || ev.propertyName !== "height") return;
            clearTimeout(safety);
            pkBody.removeEventListener("transitionend", done);
            if (det.classList.contains("is-closing")) det.open = false;
            det.classList.remove("is-animating", "is-closing");
            pkBody.style.height = "";
          };
          pkBody.addEventListener("transitionend", done);
          // If the browser skips the animation (tab in the background), finish anyway
          safety = setTimeout(() => done({ target: pkBody, propertyName: "height" }), 800);
          if (det.open) {
            det.classList.add("is-closing");
            pkBody.style.height = pkBody.scrollHeight + "px";
            pkBody.getBoundingClientRect(); // apply the start height before animating
            pkBody.style.height = "0px";
          } else {
            det.open = true;
            pkBody.style.height = "0px";
            pkBody.getBoundingClientRect();
            pkBody.style.height = pkBody.scrollHeight + "px";
          }
        });
        section.appendChild(det);
      }

      q("[data-tour-timeline]").appendChild(section);

      const items = Array.from(listEl.children);
      const track = section.querySelector(".tl-track");
      const road = section.querySelector(".tl-road");
      const van = section.querySelector(".tl-van");
      const NS = "http://www.w3.org/2000/svg";
      let roadPath = null; // the paved (coloured) layer, used to measure the road
      let samples = []; // points along the road, to find how far down the page the van is

      // ---- Layout: a winding ROAD with the stops along it ----
      // Wide (640px+ column): the road snakes down the middle, cards alternate left and right and
      //   overlap in height, like a zigzag. Positions are worked out here, so cards of any height fit.
      // Narrow (phones): the road runs down the left edge with a gentle wave, cards on the right.
      // Every other stop is crimson / orange (the two brand colours).
      const layout = () => {
        const W = track.clientWidth;
        const zig = W >= 640;
        track.classList.toggle("is-zig", zig);
        const LANE = 120; // width of the road lane in the middle (wide layout)
        const cardW = (W - LANE) / 2;
        const tops = [];
        const bottoms = { L: 0, R: 0 };
        let prevTop = -Infinity;
        items.forEach((li, i) => {
          const side = i % 2 ? "R" : "L";
          if (zig) {
            li.style.width = cardW + "px";
            li.style.left = side === "L" ? "0px" : cardW + LANE + "px";
            const top = i === 0 ? 0 : Math.max(prevTop + 140, bottoms[side] + 18);
            li.style.top = top + "px";
            tops.push(top);
            prevTop = top;
            bottoms[side] = top + li.offsetHeight;
            // dot in the road lane, swinging a little left/right so the road curves
            li.style.setProperty("--dot-x", (side === "L" ? cardW + LANE / 2 - 22 - 16 : -LANE / 2 - 22 + 16) + "px");
          } else {
            li.style.width = li.style.left = li.style.top = "";
            li.style.setProperty("--dot-x", (i % 2 ? 6 : 0) + "px");
          }
        });
        track.style.height = zig ? Math.max(bottoms.L, bottoms.R) + "px" : "";

        // Road through the centre of every dot, as smooth S-curves
        const box = track.getBoundingClientRect();
        const pts = items.map((li) => {
          const d = li.querySelector(".tl-dot").getBoundingClientRect();
          return [d.left + d.width / 2 - box.left, d.top + d.height / 2 - box.top];
        });
        const H = track.offsetHeight;
        let d = "M" + pts[0][0] + " 0 L" + pts[0][0] + " " + pts[0][1];
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1];
          const [x1, y1] = pts[i];
          const my = (y1 - y0) / 2;
          d += " C" + x0 + " " + (y0 + my) + " " + x1 + " " + (y1 - my) + " " + x1 + " " + y1;
        }
        const end = pts[pts.length - 1];
        d += " L" + end[0] + " " + H;
        road.setAttribute("viewBox", "0 0 " + W + " " + H);
        road.setAttribute("width", W);
        road.setAttribute("height", H);
        road.innerHTML =
          '<defs><linearGradient id="tl-pave" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + H + '">' +
            '<stop offset="0" stop-color="#aa1345"/><stop offset="0.5" stop-color="#f39200"/><stop offset="1" stop-color="#aa1345"/>' +
          "</linearGradient></defs>";
        const mk = (cls) => {
          const p = document.createElementNS(NS, "path");
          p.setAttribute("d", d);
          p.setAttribute("class", cls);
          road.appendChild(p);
          return p;
        };
        mk("tl-road-base");
        roadPath = mk("tl-road-paved");
        mk("tl-road-dash");
        const len = roadPath.getTotalLength();
        roadPath.style.strokeDasharray = len + " " + len;
        samples = [];
        for (let k = 0; k <= 240; k++) {
          const p = roadPath.getPointAtLength((len * k) / 240);
          samples.push({ l: (len * k) / 240, x: p.x, y: p.y });
        }
        progress();
      };

      // ---- Scroll: the road gets "paved" in brand colours down to a point 60% down the screen,
      // the van drives along at the front, and each stop lights up once the van passes it ----
      const progress = () => {
        if (!roadPath) return;
        const box = track.getBoundingClientRect();
        const still = noMotion || !("IntersectionObserver" in window);
        const markerY = still ? Infinity : window.innerHeight * 0.6 - box.top;
        let at = samples[samples.length - 1];
        for (const s of samples) {
          if (s.y >= markerY) {
            at = s;
            break;
          }
        }
        const len = samples[samples.length - 1].l;
        roadPath.style.strokeDashoffset = String(len - at.l);
        van.style.transform = "translate(" + (at.x - 19) + "px," + (at.y - 19) + "px)";
        van.classList.toggle("is-hidden", markerY <= 0 || still);
        items.forEach((li) => {
          const dot = li.querySelector(".tl-dot").getBoundingClientRect();
          li.classList.toggle("is-reached", dot.top + dot.height / 2 - box.top <= markerY);
        });
      };

      if (noMotion || !("IntersectionObserver" in window)) {
        track.classList.add("is-static");
      } else {
        track.classList.add("is-animated");
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              e.target.classList.add("is-in");
              io.unobserve(e.target);
            });
          },
          { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
        );
        items.forEach((li) => io.observe(li));
      }
      let ticking = false;
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            ticking = false;
            progress();
          });
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      // Redraw when the column changes width (rotate phone, resize window) or fonts finish loading
      let lastW = 0;
      new ResizeObserver(() => {
        if (track.clientWidth !== lastW) {
          lastW = track.clientWidth;
          layout();
        }
      }).observe(track);
      if (document.fonts) document.fonts.ready.then(layout);
      layout();
    }

    // ---- Optional extra sections: only show up once the client confirms the real details ----
    const extraSection = (title, content, mod) => {
      const wrap = document.createElement("div");
      const h = document.createElement("h2");
      h.textContent = title;
      wrap.appendChild(h);
      if (Array.isArray(content)) {
        const ul = document.createElement("ul");
        ul.className = "tm-points" + (mod ? " " + mod : "");
        content.forEach((text) => {
          const li = document.createElement("li");
          li.textContent = text;
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
      } else {
        const p = document.createElement("p");
        p.className = "tour-page-intro";
        p.textContent = content;
        wrap.appendChild(p);
      }
      return wrap;
    };
    const extraEl = q("[data-tour-extra]");
    if (tour.pickup) extraEl.appendChild(extraSection("Pickup", tour.pickup));
    if (tour.itinerary) extraEl.appendChild(extraSection("Itinerary", tour.itinerary));
    if (tour.included) extraEl.appendChild(extraSection("What's Included", tour.included));
    if (tour.notIncluded) extraEl.appendChild(extraSection("Not Included", tour.notIncluded, "is-no"));
    if (tour.notes) extraEl.appendChild(extraSection("Important Notes", tour.notes, "is-info"));
    if (tour.bring) extraEl.appendChild(extraSection("What to Bring", tour.bring));
    if (tour.childPrice) extraEl.appendChild(extraSection("Children", tour.childPrice));
    if (tour.cancellation) extraEl.appendChild(extraSection("Cancellation", tour.cancellation));

    // ---- Reviews: real Facebook recommendations. This tour's own reviews first, then general
    // ones; mixed reviews (with a complaint) are left out. 4 show at first, "Show more" reveals the
    // rest. Facebook has no star ratings, so cards say "Recommends NXT Tours" instead of stars. ----
    const FB_REVIEWS_URL = "https://www.facebook.com/toursnxt/reviews";
    const FB_SCORE = { pct: 98, count: 68 }; // from the Facebook page, 2026-10-04
    const ICON_FB = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.47-1.88 1.95-1.88h1.51V4.92s-1.37-.23-2.69-.23c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.47h3.03v8.4a12 12 0 0 0 3.76 0v-8.4z"/></svg>';
    const ICON_THUMB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11H3V10h4zM7 10l4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7"/></svg>';
    const tourName = tour.name + " " + tour.accent;
    const good = REVIEWS.filter((r) => !r.mixed);
    const list = good.filter((r) => r.tours.includes(slug)).concat(good.filter((r) => !r.tours.includes(slug)));
    const reviewsEl = q("[data-tour-reviews]");
    const rv = document.createElement("div");
    rv.className = "rv";
    rv.innerHTML =
      '<div class="rv-head">' +
        '<div><h2>What Our Guests Say</h2><p class="rv-sub">Real reviews from travellers on our Facebook page.</p></div>' +
        '<a class="rv-score" target="_blank" rel="noopener">' +
          '<span class="rv-score-fb">' + ICON_FB + "</span>" +
          '<span><strong></strong><small></small></span>' +
        "</a>" +
      "</div>" +
      '<div class="rv-grid"></div>' +
      '<div class="rv-actions">' +
        '<button type="button" class="rv-more"></button>' +
        '<a class="btn btn-outline-dark" target="_blank" rel="noopener">Read all reviews on Facebook</a>' +
        '<button type="button" class="btn btn-solid" data-rv-write>Write a review</button>' +
      "</div>";
    const score = rv.querySelector(".rv-score");
    score.href = FB_REVIEWS_URL;
    score.querySelector("strong").textContent = FB_SCORE.pct + "% recommend us";
    score.querySelector("small").textContent = FB_SCORE.count + " reviews on Facebook";
    rv.querySelector(".rv-actions a").href = FB_REVIEWS_URL;

    const grid = rv.querySelector(".rv-grid");
    const moreBtn = rv.querySelector(".rv-more");
    const SHOW = 4;
    // r: { name, date, text, source: "facebook" | "website", rating?, tagged? }
    const makeCard = (r, extra) => {
      const card = document.createElement("article");
      card.className = "rv-card" + (extra ? " is-extra" : "");
      const website = r.source === "website";
      card.innerHTML =
        '<div class="rv-top">' +
          '<span class="rv-avatar" aria-hidden="true"></span>' +
          '<span class="rv-who"><strong></strong><small></small></span>' +
          (website ? '<span class="rv-site">Website</span>' : '<span class="rv-fb" title="Facebook review">' + ICON_FB + "</span>") +
        "</div>" +
        (website
          ? '<p class="rv-rating" aria-label="' + r.rating + ' out of 5 stars">' + "★".repeat(r.rating) + "<span>" + "★".repeat(5 - r.rating) + "</span></p>"
          : '<p class="rv-badge">' + ICON_THUMB + "Recommends NXT Tours</p>") +
        '<p class="rv-text"></p>' +
        '<button type="button" class="rv-toggle" hidden>Read more</button>';
      card.querySelector(".rv-avatar").textContent = r.name.charAt(0).toUpperCase();
      card.querySelector(".rv-who strong").textContent = r.name;
      card.querySelector(".rv-who small").textContent = r.date + (r.tagged ? " · " + tourName : "");
      card.querySelector(".rv-text").textContent = r.text;
      return card;
    };
    let allReviews = list.map((r) => ({ name: r.name, date: r.date, text: r.text, source: "facebook", tagged: r.tours.includes(slug) }));
    const renderReviews = () => {
      grid.textContent = "";
      const showAll = rv.classList.contains("show-all");
      allReviews.forEach((r, i) => grid.appendChild(makeCard(r, i >= SHOW)));
      const moreCount = Math.max(0, allReviews.length - SHOW);
      moreBtn.hidden = !moreCount || showAll;
      moreBtn.textContent = "Show " + moreCount + " more review" + (moreCount === 1 ? "" : "s");
      requestAnimationFrame(clampCheck);
    };
    moreBtn.addEventListener("click", () => {
      rv.classList.add("show-all");
      moreBtn.hidden = true;
      clampCheck();
    });
    reviewsEl.appendChild(rv);

    // Long reviews are cut to 5 lines with a "Read more" toggle
    function clampCheck() {
      grid.querySelectorAll(".rv-card").forEach((card) => {
        const text = card.querySelector(".rv-text");
        const btn = card.querySelector(".rv-toggle");
        if (card.classList.contains("is-open") || !card.offsetParent) return;
        btn.hidden = text.scrollHeight <= text.clientHeight + 2;
      });
    }
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".rv-toggle");
      if (!btn) return;
      const card = btn.closest(".rv-card");
      card.classList.toggle("is-open");
      btn.textContent = card.classList.contains("is-open") ? "Show less" : "Read more";
    });
    window.addEventListener("resize", clampCheck);
    renderReviews();

    // Approved reviews written on the website (newest first) go before the Facebook ones
    if (BACKEND.key) {
      fetch(BACKEND.url + "/rest/v1/reviews?select=name,rating,text,created_at&tour_slug=eq." + encodeURIComponent(slug) + "&order=created_at.desc&limit=50", {
        headers: { apikey: BACKEND.key },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          if (!Array.isArray(rows) || !rows.length) return;
          const site = rows.map((x) => ({
            name: x.name,
            rating: Math.min(5, Math.max(1, Number(x.rating) || 5)),
            text: x.text,
            source: "website",
            tagged: true,
            date: new Date(x.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          }));
          allReviews = site.concat(allReviews);
          renderReviews();
        })
        .catch((err) => console.warn("Website reviews not loaded", err));
    }

    // ---- "Write a review": saved on the website (shown after the team approves it in Supabase).
    // Facebook is offered as a second option. Without a backend it falls back to WhatsApp. ----
    const rvDialog = q("[data-rv-dialog]");
    const rvForm = q("[data-rv-form]");
    const rvStars = Array.from(rvDialog.querySelectorAll("[data-rv-star]"));
    const rvError = q("[data-rv-error]");
    const rvThanks = q("[data-rv-thanks]");
    const rvSubmit = rvForm.querySelector("[type=submit]");
    let rvRating = 0;
    q("[data-rv-fb]").href = FB_REVIEWS_URL;
    q("[data-rv-tour]").value = tourName;
    const paintStars = (n) =>
      rvStars.forEach((s, i) => {
        s.classList.toggle("is-on", i < n);
        s.setAttribute("aria-checked", i + 1 === rvRating ? "true" : "false");
      });
    rvStars.forEach((s, i) => {
      s.addEventListener("click", () => {
        rvRating = i + 1;
        paintStars(rvRating);
        rvError.hidden = true;
      });
      s.addEventListener("mouseenter", () => paintStars(i + 1));
      s.addEventListener("mouseleave", () => paintStars(rvRating));
    });
    const resetReviewForm = () => {
      rvForm.reset();
      q("[data-rv-tour]").value = tourName;
      rvRating = 0;
      paintStars(0);
      rvError.hidden = true;
      rvForm.hidden = false;
      rvThanks.hidden = true;
    };
    rv.querySelector("[data-rv-write]").addEventListener("click", () => {
      resetReviewForm();
      rvDialog.showModal();
      document.body.classList.add("modal-open");
    });
    q("[data-rv-close]").addEventListener("click", () => rvDialog.close());
    q("[data-rv-thanks-close]").addEventListener("click", () => rvDialog.close());
    rvDialog.addEventListener("click", (e) => {
      if (e.target === rvDialog) rvDialog.close();
    });
    rvDialog.addEventListener("close", () => document.body.classList.remove("modal-open"));
    // Link from the "How was your tour?" email (…&review=1): open the review form straight away
    if (new URLSearchParams(location.search).get("review") === "1") {
      rv.querySelector("[data-rv-write]").click();
    }
    rvForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = q("[data-rv-name]").value.trim();
      const text = q("[data-rv-text]").value.trim();
      const missing = !name ? "Please enter your name." : !rvRating ? "Please choose a star rating." : text.length < 3 ? "Please write a few words about your trip." : "";
      if (missing) {
        rvError.textContent = missing;
        rvError.hidden = false;
        return;
      }
      if (q("[data-rv-trap]").value) {
        rvForm.hidden = true;
        rvThanks.hidden = false;
        return;
      }
      if (!BACKEND.key) {
        const lines = ["Hello NXT Tours! Here is my review.", "Name: " + name, "Tour: " + tourName, "Rating: " + rvRating + " out of 5", "Review: " + text];
        window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
        rvDialog.close();
        return;
      }
      rvSubmit.disabled = true;
      const label = rvSubmit.textContent;
      rvSubmit.textContent = "Sending...";
      try {
        const res = await fetch(BACKEND.url + "/rest/v1/reviews", {
          method: "POST",
          headers: { apikey: BACKEND.key, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ tour_slug: slug, tour_name: tourName, name: name.slice(0, 60), rating: rvRating, text: text.slice(0, 1000) }),
        });
        if (!res.ok) throw new Error("review " + res.status);
        rvForm.hidden = true;
        rvThanks.hidden = false;
      } catch (err) {
        console.error("Review not sent", err);
        rvError.textContent = "Sorry, your review could not be sent. Please try again in a moment.";
        rvError.hidden = false;
      } finally {
        rvSubmit.disabled = false;
        rvSubmit.textContent = label;
      }
    });

    // ---- Booking form: name, mobile (optional), tour option, date, pickup, persons (sharing only).
    // "Book on WhatsApp" opens one ready-made message with all of it; nothing is stored anywhere. ----
    const nameEl = q("[data-tour-name]");
    const emailEl = q("[data-tour-email]");
    const trapEl = q("[data-tour-trap]");
    const phoneEl = q("[data-tour-phone]");
    const dateEl = q("[data-tour-date]");
    const pickupTextEl = q("[data-tour-pickup-text]");
    const hotelField = q("[data-tour-hotel-field]");
    const hotelEl = q("[data-tour-hotel]");
    const guestsField = q("[data-tour-guests-field]");
    const guestsEl = q("[data-tour-guests]");
    const errorEl = q("[data-tour-error]");
    const waEl = q("[data-tour-wa]");
    const isPrivate = () => chosenOption().kind === "private";

    // ---- Travel date: a swipeable row of days starting TOMORROW (no same-day bookings), one
    // year ahead. Arrows scroll it, the month label follows the first visible day, the chosen
    // day turns crimson. The "Calendar" button opens the same range as a month grid. ----
    const track = q("[data-date-track]");
    const monthEl = q("[data-date-month]");
    const DAYS = 365;
    const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    // Dates follow the DUBAI calendar (UTC+4, no daylight saving), wherever the visitor is.
    // Tomorrow can be booked until the cutoff hour (6 PM by default, set in the admin panel);
    // after that the earliest day is the day after tomorrow. The server checks the same rule.
    const dubai = new Date(Date.now() + 4 * 3600e3);
    const pastCutoff = dubai.getUTCHours() >= SITE.cutoffHour;
    const start = new Date(dubai.getUTCFullYear(), dubai.getUTCMonth(), dubai.getUTCDate() + (pastCutoff ? 2 : 1));
    const cutoffText = (SITE.cutoffHour % 12 || 12) + ":00 " + (SITE.cutoffHour < 12 ? "AM" : "PM");
    const dateNote = q("[data-date-note]");
    dateNote.textContent = pastCutoff
      ? "Bookings for tomorrow closed at " + cutoffText + " Dubai time. The earliest date you can book is " +
        start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + "."
      : "Bookings for tomorrow close at " + cutoffText + " Dubai time today.";
    // Days the team blocked in the admin panel (holidays, fully booked): for every tour or just this one
    const blocked = new Set(SITE.blocked.filter((b) => !b.tour_slug || b.tour_slug === slug).map((b) => b.date));
    const last = new Date(start);
    last.setDate(start.getDate() + DAYS - 1);
    const dayBtns = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "date-day";
      b.setAttribute("role", "option");
      b.setAttribute("aria-selected", "false");
      b.dataset.date = iso(d);
      b.dataset.month = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      const top = i === 0 && !pastCutoff ? "Tmrw" : d.toLocaleDateString("en-GB", { weekday: "short" });
      b.innerHTML = '<span class="date-dow"></span><span class="date-num"></span><span class="date-mon"></span>';
      b.children[0].textContent = top;
      b.children[1].textContent = d.getDate();
      b.children[2].textContent = d.toLocaleDateString("en-GB", { month: "short" });
      b.setAttribute("aria-label", d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
      if (d.getDay() === 5 || d.getDay() === 6) b.classList.add("is-weekend");
      if (blocked.has(b.dataset.date)) {
        b.disabled = true;
        b.classList.add("is-blocked");
        b.title = "Not available";
      }
      b.addEventListener("click", () => pickDate(b));
      track.appendChild(b);
      dayBtns.push(b);
    }
    const pickDate = (b) => {
      dayBtns.forEach((x) => {
        x.classList.toggle("is-selected", x === b);
        x.setAttribute("aria-selected", x === b ? "true" : "false");
      });
      dateEl.value = b.dataset.date;
      q("[data-date-strip]").classList.remove("is-invalid");
      onChange();
    };
    const updateMonth = () => {
      const step = dayBtns[1].offsetLeft - dayBtns[0].offsetLeft || 1;
      const first = dayBtns[Math.min(DAYS - 1, Math.max(0, Math.round(track.scrollLeft / step)))];
      monthEl.textContent = first.dataset.month;
      q("[data-date-prev]").disabled = track.scrollLeft < 4;
      q("[data-date-next]").disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    const page = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: "smooth" });
    q("[data-date-prev]").addEventListener("click", () => page(-1));
    q("[data-date-next]").addEventListener("click", () => page(1));
    track.addEventListener("scroll", () => requestAnimationFrame(updateMonth), { passive: true });
    // Keyboard: left/right moves the chosen day
    track.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const cur = dayBtns.findIndex((b) => b.classList.contains("is-selected"));
      const dir = e.key === "ArrowRight" ? 1 : -1;
      let next = cur + dir;
      while (dayBtns[next] && dayBtns[next].disabled) next += dir; // skip blocked days
      if (!dayBtns[next]) return;
      pickDate(dayBtns[next]);
      showDay(dayBtns[next], true);
    });
    // Scroll the row (only the row, never the page) so a day is in view
    function showDay(b, smooth) {
      track.scrollTo({ left: Math.max(0, b.offsetLeft - track.offsetLeft - 4), behavior: smooth ? "smooth" : "auto" });
    }
    updateMonth();

    // ---- Full calendar popup: month grid, Monday first. Days before tomorrow or after the
    // last bookable day are greyed out. Picking a day selects it in the row too. ----
    const calDialog = q("[data-cal-dialog]");
    const calGrid = q("[data-cal-grid]");
    const calMonth = q("[data-cal-month]");
    const calPicked = q("[data-cal-picked]");
    const calPrev = q("[data-cal-prev]");
    const calNext = q("[data-cal-next]");
    let calView = new Date(start.getFullYear(), start.getMonth(), 1);

    const renderCal = () => {
      calMonth.textContent = calView.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      calGrid.textContent = "";
      const lead = (calView.getDay() + 6) % 7; // Monday = 0
      for (let i = 0; i < lead; i++) calGrid.appendChild(document.createElement("span"));
      const daysIn = new Date(calView.getFullYear(), calView.getMonth() + 1, 0).getDate();
      for (let n = 1; n <= daysIn; n++) {
        const d = new Date(calView.getFullYear(), calView.getMonth(), n);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cal-day";
        b.textContent = n;
        b.dataset.date = iso(d);
        b.setAttribute("aria-label", d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
        if (d < start || d > last || blocked.has(b.dataset.date)) {
          b.disabled = true;
          if (blocked.has(b.dataset.date)) b.classList.add("is-blocked");
        } else {
          if (iso(d) === dateEl.value) b.classList.add("is-selected");
          if (d.getDay() === 5 || d.getDay() === 6) b.classList.add("is-weekend");
          b.addEventListener("click", () => {
            const chip = dayBtns.find((x) => x.dataset.date === b.dataset.date);
            pickDate(chip);
            showDay(chip, false);
            updateMonth();
            calDialog.close();
          });
        }
        if (iso(d) === iso(new Date())) b.classList.add("is-today");
        calGrid.appendChild(b);
      }
      calPrev.disabled = calView <= new Date(start.getFullYear(), start.getMonth(), 1);
      calNext.disabled = calView >= new Date(last.getFullYear(), last.getMonth(), 1);
      calPicked.textContent = dateEl.value ? "Selected: " + niceDate(dateEl.value) : "";
    };

    q("[data-cal-open]").addEventListener("click", () => {
      const base = dateEl.value ? new Date(dateEl.value + "T00:00:00") : start;
      calView = new Date(base.getFullYear(), base.getMonth(), 1);
      renderCal();
      calDialog.showModal();
      document.body.classList.add("modal-open");
      (calGrid.querySelector(".is-selected") || calGrid.querySelector(".cal-day:not(:disabled)")).focus();
    });
    calPrev.addEventListener("click", () => {
      calView = new Date(calView.getFullYear(), calView.getMonth() - 1, 1);
      renderCal();
    });
    calNext.addEventListener("click", () => {
      calView = new Date(calView.getFullYear(), calView.getMonth() + 1, 1);
      renderCal();
    });
    q("[data-cal-close]").addEventListener("click", () => calDialog.close());
    calDialog.addEventListener("click", (e) => {
      if (e.target === calDialog) calDialog.close();
    });
    calDialog.addEventListener("close", () => document.body.classList.remove("modal-open"));

    // ---- Pickup point: a picker with search and the points grouped by area. Hotel pickup only
    // on private tours; "Not sure" lets the team suggest one. ----
    const areas = tour.pickupAreas || [];
    const hasList = areas.length > 0;
    const trigger = q("[data-pickup-open]");
    const triggerLabel = q("[data-pickup-label]");
    const dialog = q("[data-pickup-dialog]");
    const body = q("[data-pickup-body]");
    const search = q("[data-pickup-search]");
    trigger.hidden = !hasList;
    pickupTextEl.hidden = hasList;
    // Inline display too, so an old cached stylesheet can never show the wrong pickup box
    trigger.style.display = hasList ? "" : "none";
    pickupTextEl.style.display = hasList ? "none" : "";

    let pickup = null; // { type: "point", area, place, time } | { type: "hotel" } | { type: "help" }
    const ICON_CHECK = '<svg class="pickup-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    const same = (a, b) => a && b && a.type === b.type && a.place === b.place;

    const row = (choice, title, sub, extraClass) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pickup-row" + (extraClass ? " " + extraClass : "") + (same(choice, pickup) ? " is-selected" : "");
      b.innerHTML = '<span class="pickup-row-main"><span class="pickup-row-title"></span><span class="pickup-row-sub"></span></span>' + ICON_CHECK;
      b.querySelector(".pickup-row-title").textContent = title;
      b.querySelector(".pickup-row-sub").textContent = sub;
      b.addEventListener("click", () => choosePickup(choice));
      return b;
    };

    const renderPickup = () => {
      const term = search.value.trim().toLowerCase();
      body.textContent = "";
      if (isPrivate() && !term) {
        body.appendChild(row({ type: "hotel" }, "Pick me up from my hotel", "Private tours only. You'll type the hotel name next.", "is-special"));
      }
      let shown = 0;
      areas.forEach(({ area, points }) => {
        const areaHit = area.toLowerCase().includes(term);
        const list = points.filter(([place]) => !term || areaHit || place.toLowerCase().includes(term));
        if (!list.length) return;
        shown += list.length;
        const group = document.createElement("div");
        group.className = "pickup-group";
        const h = document.createElement("h4");
        h.textContent = area;
        group.appendChild(h);
        list.forEach(([place, time]) => group.appendChild(row({ type: "point", area, place, time }, place, "Pickup " + time)));
        body.appendChild(group);
      });
      if (term && !shown) {
        const p = document.createElement("p");
        p.className = "pickup-empty";
        p.textContent = "No pickup point matches “" + search.value.trim() + "”. Choose the option below and our team will help.";
        body.appendChild(p);
      }
      body.appendChild(row({ type: "help" }, "Not sure? Our team will suggest one", "We'll message you the best pickup point for where you're staying.", "is-help"));
    };

    const pickupSummary = () => {
      if (!pickup) return "";
      if (pickup.type === "hotel") return "My hotel (private tour)";
      if (pickup.type === "help") return "Not sure, team will suggest";
      return pickup.place + " · " + pickup.time;
    };

    const choosePickup = (choice) => {
      pickup = choice;
      triggerLabel.textContent = pickupSummary();
      trigger.classList.add("has-value");
      trigger.classList.remove("is-invalid");
      hotelField.hidden = pickup.type !== "hotel";
      dialog.close();
      if (pickup.type === "hotel") hotelEl.focus();
      onChange();
      fitSticky();
    };

    const resetPickup = () => {
      pickup = null;
      triggerLabel.textContent = "Choose your pickup point";
      trigger.classList.remove("has-value");
      hotelField.hidden = true;
    };

    trigger.addEventListener("click", () => {
      search.value = "";
      renderPickup();
      dialog.showModal();
      body.scrollTop = 0;
      const sel = body.querySelector(".is-selected");
      if (sel) sel.scrollIntoView({ block: "center" });
      if (window.matchMedia("(min-width: 700px)").matches) search.focus();
    });
    search.addEventListener("input", renderPickup);
    q("[data-pickup-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => document.body.classList.remove("modal-open"));
    dialog.addEventListener("cancel", () => document.body.classList.remove("modal-open"));
    trigger.addEventListener("click", () => document.body.classList.add("modal-open"));

    // Show/hide the parts of the form that depend on the tour option
    const syncForm = () => {
      if (pickup && pickup.type === "hotel" && !isPrivate()) resetPickup();
      guestsField.hidden = isPrivate();
    };

    const pickupText = () => {
      if (!hasList) return pickupTextEl.value.trim();
      if (!pickup) return "";
      if (pickup.type === "hotel") return hotelEl.value.trim() ? hotelEl.value.trim() + " (hotel)" : "";
      if (pickup.type === "help") return "Not sure, please suggest a pickup point";
      return pickup.place + ", " + pickup.time;
    };

    const niceDate = (v) =>
      new Date(v + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

    const updateWhatsApp = () => {
      const lines = ["Hello NXT Tours!", "I'd like to book the " + tour.name + " " + tour.accent + "."];
      if (nameEl.value.trim()) lines.push("Name: " + nameEl.value.trim());
      if (emailEl.value.trim()) lines.push("Email: " + emailEl.value.trim());
      if (phoneEl.value.trim()) lines.push("Mobile: " + phoneEl.value.trim());
      lines.push("Tour option: " + chosenOption().text);
      if (dateEl.value) lines.push("Date: " + niceDate(dateEl.value));
      if (pickupText()) lines.push("Pickup: " + pickupText());
      if (!isPrivate() && guestsEl.value) lines.push("Persons: " + guestsEl.value);
      waEl.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
    };

    // Required: name, email, date, pickup (and the hotel name if "My hotel"), persons on sharing.
    // Returns [element to highlight, message].
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const firstMissing = () => {
      if (!nameEl.value.trim()) return [nameEl, "Please enter your name."];
      if (!EMAIL_RE.test(emailEl.value.trim())) return [emailEl, "Please enter a valid email, we send your booking details there."];
      if (!dateEl.value) return [q("[data-date-strip]"), "Please choose your travel date."];
      if (hasList && !pickup) return [trigger, "Please choose a pickup point."];
      if (hasList && pickup.type === "hotel" && !hotelEl.value.trim()) return [hotelEl, "Please enter your hotel name."];
      if (!hasList && !pickupTextEl.value.trim()) return [pickupTextEl, "Please enter your hotel or pickup area."];
      if (!isPrivate() && !(Number(guestsEl.value) >= 1)) return [guestsEl, "Please enter the number of persons."];
      return null;
    };

    const showError = (el, message) => {
      errorEl.textContent = message;
      errorEl.hidden = false;
      if (el) {
        el.classList.add("is-invalid");
        (el === q("[data-date-strip]") ? track : el).focus();
      }
      requestAnimationFrame(fitSticky);
    };

    // ---- Booking received popup ----
    const doneDialog = q("[data-done-dialog]");
    const showDone = (ref, emailSent) => {
      q("[data-done-ref]").textContent = ref;
      const summary = q("[data-done-summary]");
      summary.textContent = "";
      const rows = [
        ["Tour", tour.name + " " + tour.accent],
        ["Option", chosenOption().text],
        ["Date", niceDate(dateEl.value)],
        ["Pickup", pickupText()],
      ];
      if (!isPrivate()) rows.push(["Persons", guestsEl.value]);
      rows.forEach(([k, v]) => {
        const dt = document.createElement("dt");
        dt.textContent = k;
        const dd = document.createElement("dd");
        dd.textContent = v;
        summary.append(dt, dd);
      });
      q("[data-done-note]").textContent = emailSent
        ? "We've sent the details to " + emailEl.value.trim() + "."
        : "Please keep your reference. Our team will message you to confirm.";
      q("[data-done-wa]").href =
        "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent("Hello NXT Tours! My booking reference is " + ref + ".");
      doneDialog.showModal();
      document.body.classList.add("modal-open");
    };
    q("[data-done-close]").addEventListener("click", () => doneDialog.close());
    doneDialog.addEventListener("click", (e) => {
      if (e.target === doneDialog) doneDialog.close();
    });
    doneDialog.addEventListener("close", () => document.body.classList.remove("modal-open"));

    // ---- Book Now: save the booking through the backend. If the backend can't be reached,
    // the button falls back to opening WhatsApp with everything typed in. ----
    let sending = false;
    waEl.addEventListener("click", async (e) => {
      const missing = firstMissing();
      if (missing) {
        e.preventDefault();
        showError(missing[0], missing[1]);
        return;
      }
      errorEl.hidden = true;
      if (!BACKEND.key) return; // no backend configured: let the WhatsApp link open
      e.preventDefault();
      if (sending) return;
      sending = true;
      waEl.classList.add("is-loading");
      waEl.setAttribute("aria-busy", "true");
      const label = waEl.textContent;
      waEl.textContent = "Sending your booking...";
      try {
        const res = await fetch(BACKEND.url + "/functions/v1/create-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: BACKEND.key },
          body: JSON.stringify({
            tour: slug,
            optionKind: chosenOption().kind,
            optionText: chosenOption().text,
            date: dateEl.value,
            pickup: pickupText(),
            persons: isPrivate() ? null : Number(guestsEl.value),
            name: nameEl.value.trim(),
            email: emailEl.value.trim(),
            phone: phoneEl.value.trim(),
            website: trapEl.value,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          showDone(data.ref, data.emailSent);
        } else if (res.status === 400 || res.status === 429) {
          showError(null, data.error || "Please check your details and try again.");
        } else {
          throw new Error("backend " + res.status);
        }
      } catch (err) {
        console.error("Booking could not be sent", err);
        showError(null, "We couldn't send your booking right now. Please tap Book Now again, or message us on WhatsApp.");
      } finally {
        sending = false;
        waEl.classList.remove("is-loading");
        waEl.removeAttribute("aria-busy");
        waEl.textContent = label;
      }
    });

    function onChange(e) {
      if (e && e.target && e.target.classList) e.target.classList.remove("is-invalid");
      if (!errorEl.hidden && !firstMissing()) errorEl.hidden = true;
      updateWhatsApp();
    }
    [nameEl, emailEl, phoneEl, pickupTextEl, hotelEl, guestsEl].forEach((el) => el.addEventListener("input", onChange));
    optionEl.addEventListener("change", (e) => {
      syncForm();
      onChange(e);
      fitSticky();
    });

    // The pinned booking card can be taller than a laptop screen. Then pin it by its bottom edge
    // instead, so the Book button is never cut off.
    const side = q(".tour-detail-side");
    function fitSticky() {
      side.style.top = Math.min(104, window.innerHeight - side.offsetHeight - 16) + "px";
    }
    window.addEventListener("resize", () => {
      fitSticky();
      updateMonth();
    });

    // ---- Phones and small tablets (980px and narrower): the booking card is NOT at the bottom of
    // the page. A bar with the price and "Book Now" stays at the bottom of the screen once the
    // visitor has scrolled past the photos; it opens the same booking card as a pop-up sheet. ----
    const phoneBook = window.matchMedia("(max-width: 980px)");
    const bar = document.createElement("div");
    bar.className = "book-bar";
    bar.innerHTML =
      '<div class="book-bar-price"><small></small><strong></strong></div>' +
      '<button type="button" class="btn btn-solid book-bar-btn">Book Now</button>';
    bar.querySelector("small").textContent = privateOnly ? "Private tour from" : "Sharing tour from";
    bar.querySelector("strong").textContent = money(tour.price) + (privateOnly ? "" : " / person");
    document.body.appendChild(bar);

    const sheetHead = document.createElement("div");
    sheetHead.className = "book-sheet-head";
    sheetHead.innerHTML =
      '<span class="book-sheet-grip" aria-hidden="true"></span><strong>Book your tour</strong>' +
      '<button type="button" class="book-sheet-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    side.prepend(sheetHead);
    const backdrop = document.createElement("div");
    backdrop.className = "book-sheet-backdrop";
    document.body.appendChild(backdrop);

    let pastPhotos = false;
    const syncBar = () => {
      const show = phoneBook.matches && pastPhotos && !side.classList.contains("is-open");
      bar.classList.toggle("is-shown", show);
      document.body.classList.toggle("has-book-bar", show);
    };
    const openSheet = () => {
      side.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("sheet-open");
      side.scrollTop = 0;
      syncBar();
      requestAnimationFrame(updateMonth); // the date row was hidden, re-measure it
    };
    const closeSheet = () => {
      side.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("sheet-open");
      syncBar();
    };
    bar.querySelector("button").addEventListener("click", openSheet);
    sheetHead.querySelector(".book-sheet-close").addEventListener("click", closeSheet);
    backdrop.addEventListener("click", closeSheet);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && side.classList.contains("is-open") && !document.querySelector("dialog[open]")) closeSheet();
    });
    // Swipe the top of the sheet down to close it
    let sheetY = null;
    sheetHead.addEventListener("touchstart", (e) => (sheetY = e.touches[0].clientY), { passive: true });
    sheetHead.addEventListener("touchend", (e) => {
      if (sheetY !== null && e.changedTouches[0].clientY - sheetY > 60) closeSheet();
      sheetY = null;
    });
    // After a booking is sent, the "request received" popup closes the sheet behind it too
    doneDialog.addEventListener("close", closeSheet);
    // The bar appears once the photos have scrolled up out of view
    new IntersectionObserver(([e]) => {
      pastPhotos = !e.isIntersecting && e.boundingClientRect.top < 0;
      syncBar();
    }).observe(swipe);
    phoneBook.addEventListener("change", () => {
      if (!phoneBook.matches) closeSheet();
      syncBar();
      fitSticky();
    });

    syncForm();
    updateWhatsApp();
    fitSticky();
  }
}
} // end of startToursUI

loadLiveData().then(startToursUI);
