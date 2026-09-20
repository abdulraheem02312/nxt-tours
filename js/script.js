// =========================================================
// NXT Tours — Shared behavior for all pages
// =========================================================

// Confirms JS actually ran — see .no-js fallback in style.css,
// which keeps .fade-up content visible if this script never loads/runs
document.documentElement.classList.remove("no-js");

// Navbar gets a solid glass background once the user scrolls down
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 40) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

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
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
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

// Hero photo arches: on a desktop mouse, each arch drifts a little against
// the cursor (a different amount each) and tilts to face it, for a soft 3D feel.
// The CSS reads --px / --py / --ry through the `translate` and `rotate` properties.
const heroEl = document.querySelector(".hero");
if (
  heroEl &&
  window.matchMedia("(pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const heroPanels = heroEl.querySelectorAll(".hero-panel");

  heroEl.addEventListener("mousemove", (e) => {
    const rect = heroEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    heroPanels.forEach((panel, i) => {
      const strength = 10 + i * 8;
      panel.style.setProperty("--px", -x * strength + "px");
      panel.style.setProperty("--py", -y * strength + "px");
      panel.style.setProperty("--ry", x * 14 + "deg"); // turn toward the cursor
    });
  });

  heroEl.addEventListener("mouseleave", () => {
    heroPanels.forEach((panel) => {
      panel.style.setProperty("--px", "0px");
      panel.style.setProperty("--py", "0px");
      panel.style.setProperty("--ry", "0deg");
    });
  });
}

// Scroll bubbles: the bubbles stay still until you scroll, then each one
// drifts at its own speed/direction based on how far its section has moved
// through the screen. Skipped for people who prefer reduced motion.
const bubbleGroups = document.querySelectorAll(".bubbles");
if (bubbleGroups.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const drift = [
    { x: 90, y: -160 },
    { x: -110, y: 130 },
    { x: 60, y: -90 },
  ];
  let ticking = false;

  const updateBubbles = () => {
    const vh = window.innerHeight;
    bubbleGroups.forEach((group) => {
      const rect = group.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return; // off-screen, skip work

      // 0 when the section just enters from the bottom, 1 when it leaves at the top
      const progress = (vh - rect.top) / (vh + rect.height);
      const offset = progress - 0.5;

      group.querySelectorAll(".bubble").forEach((bubble, i) => {
        const d = drift[i % drift.length];
        const scale = 1 + offset * 0.2;
        bubble.style.transform =
          "translate3d(" + d.x * offset + "px, " + d.y * offset + "px, 0) scale(" + scale + ")";
      });
    });
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateBubbles);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", updateBubbles);
  updateBubbles();
}

// Photo sliders: any element with [data-slider] becomes a slider.
// Works with the Next/Prev buttons, the dots, the keyboard arrow keys,
// and a finger/mouse swipe. The CSS does the wipe animation; here we only
// swap the classes (is-active / is-leaving) and remember which way we went.
document.querySelectorAll("[data-slider]").forEach((root) => {
  const slides = Array.from(root.querySelectorAll(".slide"));
  const dots = Array.from(root.querySelectorAll(".slider-dots button"));
  const counter = root.querySelector(".slider-count");
  let index = 0;
  let leaveTimer;

  const goTo = (target, direction) => {
    const next = (target + slides.length) % slides.length;
    if (next === index) return;

    const previous = slides[index];
    root.dataset.dir = direction; // "next" or "prev" — CSS uses it for the wipe side

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
    if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1), dx < 0 ? "next" : "prev");
  });
  root.addEventListener("pointercancel", () => (startX = null));
});

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
          : "Showing " + shown + (shown === 1 ? " tour" : " tours") + " — " + chip.firstChild.textContent.trim();
    }
  });
});

// Plane on the Tours banner is an SVG animation: stop it for people who prefer reduced motion
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("svg.flight").forEach((svg) => svg.pauseAnimations && svg.pauseAnimations());
}

// Booking journey: while you scroll through it, the line fills with colour,
// the little plane rides the tip of the fill, and each number badge lights up
// once the plane has passed it. CSS reads --progress (0 to 1) from .journey.
document.querySelectorAll("[data-journey]").forEach((root) => {
  const nodes = Array.from(root.querySelectorAll(".journey-node"));
  let ticking = false;

  const update = () => {
    const rect = root.getBoundingClientRect();
    const anchor = window.innerHeight * 0.6; // the "reading line" the plane follows
    const progress = Math.min(1, Math.max(0, (anchor - rect.top) / rect.height));
    root.style.setProperty("--progress", progress.toFixed(4));

    nodes.forEach((node) => {
      const r = node.getBoundingClientRect();
      node.classList.toggle("is-reached", r.top + r.height / 2 <= anchor);
    });
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
