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
  navbar.classList.toggle("scrolled", window.scrollY > 40);

  // the element under the middle of the bar (skipping the bar itself)
  const under = document
    .elementsFromPoint(window.innerWidth / 2, navbar.offsetHeight / 2)
    .find((el) => !navbar.contains(el));
  navbar.classList.toggle("on-dark", Boolean(under && under.closest(DARK_SECTIONS)));

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
const WHATSAPP_NUMBER = "971586272827";
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
    const lines = ["Hello NXT Tours! 👋", "", "Name: " + val("name"), "Phone: " + val("phone")];
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
document.querySelectorAll("[data-slider]").forEach(initSlider);

// Particles: any element with data-particles="N" gets N tiny, very faint dots that
// drift slowly. Sizes, positions, speeds and colours are random, so no two look alike.
// They pause while the section is off-screen (saves battery/CPU).
document.querySelectorAll("[data-particles]").forEach((box) => {
  const count = parseInt(box.dataset.particles, 10) || 20;
  // data-particles-theme="light" = white/gold dots for dark (crimson) backgrounds
  const onDark = box.dataset.particlesTheme === "light";
  const colors = onDark ? ["#ffffff", "#ffd27a", "#ffc2dc"] : ["#e0578f", "#f4a3c4", "#f2b45a", "#c9497f"];
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

const TOURS = {
  "abu-dhabi": {
    name: "Abu Dhabi", accent: "City Tour", type: "Sharing & Private",
    price: 79.99, was: 120, duration: "Day trip",
    intro: "Sheikh Zayed Mosque, Emirates Palace, Ferrari World & more: the UAE's most complete day trip.",
    points: ["Sheikh Zayed Grand Mosque", "Emirates Palace & Etihad Towers", "Ferrari World Yas Island"],
    photos: [
      { src: "images/abu-dhabi-grand-mosque-aerial.jpg", alt: "Sheikh Zayed Grand Mosque seen from above", cap: "Sheikh Zayed Grand Mosque" },
      { src: tourUnsplash("1512632578888-169bbbc64f33", 1200), alt: "Sheikh Zayed Grand Mosque at sunset", cap: "The mosque at sunset" },
      { src: "images/abu-dhabi-etihad-towers.jpg", alt: "Etihad Towers in Abu Dhabi", cap: "Etihad Towers" },
      { src: "images/abu-dhabi-ferrari-world-hd.jpg", alt: "Ferrari World on Yas Island", cap: "Ferrari World, Yas Island" }
    ],
    // The 15 stops from the client's poster, in the poster's order. A stop without src has no photo yet:
    // it gets a branded placeholder card (add src + alt to swap in the real photo).
    stops: [
      { name: "BAPS Temple Abu Dhabi", src: "images/stops/abu-dhabi-baps-temple.webp", alt: "The carved pink sandstone spires of the BAPS Hindu Mandir above its white marble steps and reflecting pool" },
      { name: "Al Bateen Area", src: "images/stops/abu-dhabi-al-bateen.webp", alt: "The Al Bateen waterfront road lined with palms, with the Abu Dhabi skyline and turquoise sea behind" },
      { name: "Emirates Palace", src: "images/stops/abu-dhabi-emirates-palace.webp", alt: "Emirates Palace with its pale dome, palm gardens and a long reflecting pool with fountains" },
      { name: "Heritage Village", src: "images/stops/abu-dhabi-heritage-village.webp", alt: "Old-style sandstone houses with wind towers on a stone path by the sea, with the Abu Dhabi skyline behind" },
      { name: "Warner Bros World" },
      { name: "Sheikh Zayed Grand Mosque" },
      { name: "Qasr Al Watan" },
      { name: "Al Marjan Art Gallery" },
      { name: "Abu Dhabi Corniche" },
      { name: "Ferrari World & Yas Mall" },
      { name: "National Exhibition Center" },
      { name: "Etihad Towers" },
      { name: "Marina Mall Abu Dhabi" },
      { name: "Dates Market" },
      { name: "Last Exit" }
    ]
  },
  "hatta": {
    name: "Hatta", accent: "City Tour", type: "Sharing & Private",
    price: 69.99, was: 100,
    intro: "Turquoise lakes, mountain trails, and the Hajar peaks: a refreshing escape from the city.",
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
    intro: "Burj Khalifa, Palm Jumeirah, Old Dubai and the modern skyline, all in one half-day tour.",
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
    intro: "Dune bashing, camel rides, BBQ dinner and live entertainment under the stars.",
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
    ]
  },
  "khorfakkan": {
    name: "Khorfakkan", accent: "City Tour", type: "Private Only",
    price: 699, was: 900, duration: "Full-day",
    intro: "Hidden beaches, scenic waterfalls, and the East Coast's best-kept secret: a full private day out.",
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
const REVIEWS = [
  { name: "Raca T.", date: "29 Nov 2025", tours: [], text: "Free tea at least please and candies; but overall we had a great time. The tour guide was very accommodating and easy to approach but they need to double check if all the tourist / passengers are in to avoid someone who will be left. Thank you till next time" },
  { name: "Priya B.", date: "9 Nov 2025", tours: ["abu-dhabi"], text: "I had a wonderful one-day tour in Abu Dhabi. The trip was well-organized and covered some basic spots around the city. Everything went smoothly, and the experience was enjoyable from start to finish. Our guide, Badam, did an excellent job throughout the tour. He explained clearly and shared interesting information, which made the trip even more memorable. Overall, it was a good experience and worth recommending" },
  { name: "Maymay T.", date: "9 Nov 2025", tours: ["abu-dhabi"], text: "Five-star experience from start to finish. Ideal for first-time visitors and repeat travellers wanting a polished, insightful tour. Would book again without hesitation and recommend to friends and family looking to discover Abu Dhabi's beauty and heritage." },
  { name: "Junny E.", date: "25 Oct 2025", tours: [], text: "I enjoyed the entire tour today with Naser Badam. He was very accommodating and made the entire tour an enjoyable one. I would like to tour again hopefully Naser Badam will become our tour guide again when I come back again to visit United Arab Emirates with my friends and relatives." },
  { name: "Isha K.", date: "8 Jun 2025", tours: [], text: "Thank you for everything, we really do appreciate. It was really fun. We enjoy all the activities? The tours was amazing but you have to tell people about time. Thank you. May Allah bless us all" },
  { name: "Shailesh S.", date: "7 Jun 2025", tours: [], text: "I recently went with NXT tours and the experience was very smooth overall and well-organized. The guide they provided was knowledgeable and friendly and will recommend to people to plan their trips" },
  { name: "Bi N.", date: "26 May 2025", tours: [], text: "I wanted to express my heartfelt gratitude for the exceptional service your team NXT Tours provided during our recent tour. Your guide was knowledgeable, friendly, and made the experience truly unforgettable. Thank you for your professionalism and dedication. We highly recommend your company to anyone looking for a memorable experience. Keep up great work." },
  { name: "Reny J.", date: "24 May 2025", tours: [], text: "Excellent service. Treated us well and informed about the places and timings well ahead. Mr. Muhammed did a fantastic job throughout our journey. He patiently handled all the passengers. Recommended one" }
];

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
    const lines = ["Hello NXT Tours! 👋", "I'd like to book the " + tour.name + " " + tour.accent + " (" + money(tour.price) + ")."];
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
// or the nav "Book on WhatsApp" pill), small pink sparks fly up off it like
// embers from lava. When the mouse leaves, no new sparks appear, the ones in the
// air fade out, and the button is back to normal. On a touch screen a tap
// gives one short burst instead (there is no hover on a phone).
// The sparks are tiny dots in a fixed layer above the page, so the button's own
// edges never clip them. Nothing runs for people who asked for reduced motion.
// =========================================================
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const SPARK_BUTTONS = ".btn-solid, .btn-accent, .btn-outline-dark, .nav-links a.nav-cta";
  const SPARK_COLORS = ["#ff2e88", "#ff5ca6", "#ff8cc4", "#ffb3d9", "#ffd6ea", "#e0206a"];
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

    q("[data-tour-crumb]").textContent = tour.name + " " + tour.accent;
    q("[data-tour-badge]").textContent = tour.type;
    if (tour.duration) {
      const durEl = q("[data-tour-meta-duration]");
      durEl.hidden = false;
      durEl.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> ';
      durEl.append(tour.duration);
    }

    const titleEl = q("[data-tour-title]");
    titleEl.textContent = tour.name + " ";
    const accentEl = document.createElement("span");
    accentEl.className = "accent-word";
    accentEl.textContent = tour.accent;
    titleEl.appendChild(accentEl);

    // ---- Sharing / Private switch ----
    // tour.price and tour.was are the SHARING prices. A tour can also have privatePrice (+ optional
    // privateWas) once the client confirms it; until then the Private button says "on request".
    // Private-only tours (Khorfakkan) have no switch: their price is always the private price.
    const privateOnly = tour.type === "Private Only";
    let mode = privateOnly ? "private" : "sharing";
    const priceEl = q("[data-tour-price]");
    const wasEl = q("[data-tour-was]");
    const saveEl = q("[data-tour-save]");
    const modeBar = q("[data-tour-mode]");
    const modeBtns = Array.from(modeBar.querySelectorAll("[data-mode]"));

    const currentPrice = () => {
      if (mode === "sharing" || privateOnly) return { price: tour.price, was: tour.was };
      return tour.privatePrice ? { price: tour.privatePrice, was: tour.privateWas } : null;
    };

    // Text used in the WhatsApp message (updated below)
    const modeLabel = () => (privateOnly ? "" : mode === "private" ? " (Private tour)" : " (Sharing tour)");

    const showPrice = () => {
      const p = currentPrice();
      priceEl.classList.toggle("is-text", !p);
      if (p) {
        priceEl.textContent = money(p.price);
        wasEl.style.display = p.was ? "" : "none";
        saveEl.style.display = p.was ? "" : "none";
        if (p.was) {
          wasEl.textContent = money(p.was);
          saveEl.textContent = "Save " + Math.round((1 - p.price / p.was) * 100) + "%";
        }
      } else {
        priceEl.textContent = "Private price on request";
        wasEl.style.display = "none";
        saveEl.style.display = "none";
      }
    };

    if (privateOnly) {
      modeBar.hidden = true;
    } else {
      modeBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          mode = btn.dataset.mode;
          modeBtns.forEach((b) => {
            b.classList.toggle("is-active", b === btn);
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
          showPrice();
          updateWhatsApp();
        });
      });
    }
    showPrice();

    // Quick facts: only things NXT Tours already promises site-wide (same wording as the old popup
    // and the Tours page hero: "Pickup included")
    const facts = [tour.type];
    if (tour.duration) facts.push(tour.duration);
    facts.push("Hotel & metro pickup included", "English-speaking guides", "Family-friendly");
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

    // ---- Gallery: same prev/next + thumbnail behaviour as the old popup ----
    const galleryEl = q("[data-tour-gallery]");
    const photoEl = q("[data-tour-photo]");
    const captionEl = q("[data-tour-caption]");
    const thumbsEl = q("[data-tour-thumbs]");
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
    galleryEl.classList.toggle("is-single", tour.photos.length < 2);
    showPhoto(0);

    q(".tm-prev").addEventListener("click", () => showPhoto(photoIndex - 1));
    q(".tm-next").addEventListener("click", () => showPhoto(photoIndex + 1));
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") showPhoto(photoIndex + 1);
      if (e.key === "ArrowLeft") showPhoto(photoIndex - 1);
    });

    // ---- Stops / inclusions (only tours that have this data get the section) ----
    if (tour.stops && tour.stops.length) {
      const allStops = tour.stops;
      const withPhoto = allStops.filter((s) => s.src);
      const nameOnly = allStops.filter((s) => !s.src).map((s) => s.name);

      const wrap = document.createElement("div");
      const h = document.createElement("h2");
      h.textContent = (tour.stopsTitle || "Stops on this tour") + " (" + allStops.length + ")";
      wrap.appendChild(h);

      const grid = document.createElement("div");
      grid.className = "tm-stops";
      withPhoto.forEach((s) => {
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

      if (nameOnly.length) {
        const label = document.createElement("p");
        label.className = "tm-morestops-label";
        label.textContent = tour.stopsTitle ? "Included:" : "Also on the route:";
        wrap.appendChild(label);
        const ul = document.createElement("ul");
        ul.className = "tm-morestops";
        nameOnly.forEach((name) => {
          const li = document.createElement("li");
          li.textContent = name;
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
      }
      q("[data-tour-stops]").appendChild(wrap);
    }

    // ---- Optional extra sections: only show up once the client confirms the real details ----
    const extraSection = (title, content) => {
      const wrap = document.createElement("div");
      const h = document.createElement("h2");
      h.textContent = title;
      wrap.appendChild(h);
      if (Array.isArray(content)) {
        const ul = document.createElement("ul");
        ul.className = "tm-points";
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
    if (tour.notIncluded) extraEl.appendChild(extraSection("Not Included", tour.notIncluded));
    if (tour.bring) extraEl.appendChild(extraSection("What to Bring", tour.bring));
    if (tour.childPrice) extraEl.appendChild(extraSection("Children", tour.childPrice));
    if (tour.cancellation) extraEl.appendChild(extraSection("Cancellation", tour.cancellation));

    // ---- Reviews: real Facebook reviews, this tour's own reviews first, then general ones, up to 2 ----
    const matched = REVIEWS.filter((r) => r.tours.includes(slug));
    const general = REVIEWS.filter((r) => !r.tours.includes(slug));
    const chosen = matched.concat(general).slice(0, 2);
    if (chosen.length) {
      const reviewsEl = q("[data-tour-reviews]");
      const heading = document.createElement("h2");
      heading.textContent = "What Our Guests Say";
      reviewsEl.appendChild(heading);
      const grid = document.createElement("div");
      grid.className = "tour-reviews-grid";
      chosen.forEach((r) => {
        const card = document.createElement("div");
        card.className = "card tour-review-card";
        card.innerHTML =
          '<div class="review-quote" aria-hidden="true">&rdquo;</div>' +
          '<div class="review-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</div>' +
          "<p></p>" +
          '<div class="tour-review-name"></div>' +
          '<div class="tour-review-source"></div>';
        card.querySelector("p").textContent = r.text;
        card.querySelector(".tour-review-name").textContent = r.name;
        card.querySelector(".tour-review-source").textContent = "Facebook review, " + r.date;
        grid.appendChild(card);
      });
      reviewsEl.appendChild(grid);
    }

    // ---- Booking bar: WhatsApp message rebuilt live from the date/guests fields ----
    const dateEl = q("[data-tour-date]");
    const guestsEl = q("[data-tour-guests]");
    const waEl = q("[data-tour-wa]");
    const now = new Date();
    dateEl.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    const updateWhatsApp = () => {
      const p = currentPrice();
      const lines = [
        "Hello NXT Tours! 👋",
        "I'd like to book the " + tour.name + " " + tour.accent + modeLabel() + (p ? ", " + money(p.price) + "." : ". Please send me the private tour price."),
      ];
      if (dateEl.value) lines.push("Travel date: " + dateEl.value);
      if (guestsEl.value) lines.push("Guests: " + guestsEl.value);
      waEl.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
    };
    dateEl.addEventListener("input", updateWhatsApp);
    guestsEl.addEventListener("input", updateWhatsApp);
    updateWhatsApp();
  }
}
