/* ═══════════════════════════════════════════════════════════
   ONYX ESTATES — main.js
   Preloader · cursor · nav · reveals · counters · tilt ·
   filters · slider · parallax · magnetic buttons · form
   ═══════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;

  /* ─────────── Preloader ─────────── */
  const preloader = document.getElementById("preloader");
  const preloaderCount = document.getElementById("preloaderCount");

  const finishPreload = () => {
    preloader.classList.add("is-done");
    document.body.classList.add("is-loaded");
  };

  if (reduceMotion) {
    finishPreload();
  } else {
    let progress = 0;
    const tick = () => {
      progress = Math.min(progress + Math.random() * 22 + 6, 100);
      preloaderCount.textContent = String(Math.floor(progress)).padStart(2, "0");
      if (progress < 100) {
        setTimeout(tick, 110);
      } else {
        setTimeout(finishPreload, 250);
      }
    };
    tick();
  }

  /* ─────────── Custom cursor ─────────── */
  if (!isTouch && !reduceMotion) {
    const dot = document.getElementById("cursorDot");
    const ring = document.getElementById("cursorRing");
    let mx = -100, my = -100, rx = -100, ry = -100;

    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

    const renderCursor = () => {
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(renderCursor);
    };
    renderCursor();

    document.querySelectorAll("a, button, select, input, textarea, .card").forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => ring.classList.remove("is-hover"));
    });
  }

  /* ─────────── Nav: solid on scroll, hide on scroll down ─────────── */
  const nav = document.getElementById("nav");
  const progressBar = document.getElementById("scrollProgress");
  const toTop = document.getElementById("toTop");
  let lastY = 0;

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-solid", y > 60);
    nav.classList.toggle("is-hidden", y > 500 && y > lastY);
    toTop.classList.toggle("is-visible", y > 900);
    lastY = y;

    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  /* ─────────── Mobile menu ─────────── */
  const burger = document.getElementById("navBurger");
  const mobileMenu = document.getElementById("mobileMenu");

  const setMenu = (open) => {
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setMenu(!mobileMenu.classList.contains("is-open")));
  mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ─────────── Reveal on scroll ─────────── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

  /* ─────────── Animated counters ─────────── */
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  const runCounter = (el) => {
    const target = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const duration = 1800;
    let start = null;

    const frame = (ts) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const val = target * easeOutQuart(t);
      el.textContent = val.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        runCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });

  document.querySelectorAll("[data-counter]").forEach((el) => {
    if (reduceMotion) {
      const d = parseInt(el.dataset.decimals || "0", 10);
      el.textContent = parseFloat(el.dataset.counter).toLocaleString("en-US", {
        minimumFractionDigits: d, maximumFractionDigits: d,
      });
    } else {
      counterObserver.observe(el);
    }
  });

  /* ─────────── Parallax media ─────────── */
  if (!reduceMotion) {
    const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
    if (parallaxEls.length) {
      let ticking = false;
      const applyParallax = () => {
        parallaxEls.forEach((el) => {
          const rect = el.parentElement.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) return;
          const speed = parseFloat(el.dataset.parallax);
          const center = rect.top + rect.height / 2 - window.innerHeight / 2;
          el.style.transform = `translateY(${center * -speed}px)`;
        });
        ticking = false;
      };
      window.addEventListener("scroll", () => {
        if (!ticking) { requestAnimationFrame(applyParallax); ticking = true; }
      }, { passive: true });
      applyParallax();
    }
  }

  /* ─────────── 3D tilt on property cards ─────────── */
  if (!isTouch && !reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 6}deg) rotateX(${py * -6}deg) translateY(-4px)`;
        card.style.transition = "box-shadow .5s";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.style.transition = "";
      });
    });
  }

  /* ─────────── Property filters ─────────── */
  const filterButtons = document.querySelectorAll(".filter");
  const cards = document.querySelectorAll(".card");

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const filter = btn.dataset.filter;

      cards.forEach((card) => {
        const show = filter === "all" || card.dataset.category === filter;
        if (show) {
          card.classList.remove("is-filtered-out");
          // re-trigger a soft entrance
          card.style.animation = "none";
          void card.offsetWidth;
          card.style.animation = "";
        } else {
          card.classList.add("is-filtered-out");
        }
      });
    });
  });

  /* ─────────── Favourite toggles ─────────── */
  document.querySelectorAll(".card__fav").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const fav = btn.classList.toggle("is-fav");
      btn.textContent = fav ? "♥" : "♡";
      btn.setAttribute("aria-label", fav ? "Remove from favourites" : "Save to favourites");
    });
  });

  /* ─────────── Testimonial slider ─────────── */
  const quotes = [...document.querySelectorAll(".quote")];
  const dotsWrap = document.getElementById("quoteDots");
  let quoteIndex = 0;
  let quoteTimer = null;

  quotes.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.setAttribute("aria-label", `Go to testimonial ${i + 1}`);
    dot.addEventListener("click", () => { showQuote(i); restartQuoteTimer(); });
    dotsWrap.appendChild(dot);
  });
  const dots = [...dotsWrap.children];

  function showQuote(i) {
    quoteIndex = (i + quotes.length) % quotes.length;
    quotes.forEach((q, j) => q.classList.toggle("is-active", j === quoteIndex));
    dots.forEach((d, j) => d.classList.toggle("is-active", j === quoteIndex));
  }
  function restartQuoteTimer() {
    if (reduceMotion) return;
    clearInterval(quoteTimer);
    quoteTimer = setInterval(() => showQuote(quoteIndex + 1), 6500);
  }

  document.getElementById("quotePrev").addEventListener("click", () => { showQuote(quoteIndex - 1); restartQuoteTimer(); });
  document.getElementById("quoteNext").addEventListener("click", () => { showQuote(quoteIndex + 1); restartQuoteTimer(); });

  showQuote(0);
  restartQuoteTimer();

  /* ─────────── Magnetic buttons ─────────── */
  if (!isTouch && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = 14;
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength * 0.6}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)";
        el.style.transform = "";
        setTimeout(() => { el.style.transition = ""; }, 500);
      });
    });
  }

  /* ─────────── Contact form ─────────── */
  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("fName").value.trim().split(" ")[0];
    note.textContent = `Thank you${name ? ", " + name : ""} — an advisor will be in touch within one business day.`;
    form.reset();
    setTimeout(() => { note.textContent = ""; }, 8000);
  });

  /* ─────────── Smooth anchor offset for fixed nav ─────────── */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (id === "#top") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

})();
