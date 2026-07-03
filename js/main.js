/* ════════════════════════════════════════════════
   ONYX ESTATES — scroll cinema
   GSAP + ScrollTrigger + Lenis
   ════════════════════════════════════════════════ */
(() => {
  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const reduced =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof gsap === "undefined" ||
    typeof ScrollTrigger === "undefined";

  /* ── graceful bail: no animation stack → static, readable site ── */
  if (reduced) {
    doc.classList.add("reduced");
    const loader = $("#loader");
    if (loader) loader.remove();
    $$("[data-counter]").forEach((el) => {
      el.textContent = el.dataset.counter;
    });
    wireMenu(null);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ── smooth scroll ── */
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ── text splitters ── */
  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute("aria-hidden", "true");
    el.textContent = "";
    [...text].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = ch === " " ? " " : ch;
      el.appendChild(s);
    });
    return $$(".ch", el);
  }
  function splitWords(el) {
    const text = el.textContent.trim().replace(/\s+/g, " ");
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(" ").forEach((w, i) => {
      if (i) el.appendChild(document.createTextNode(" "));
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = w;
      el.appendChild(s);
    });
    return $$(".w", el);
  }

  /* ── cursor ── */
  const cursor = $("#cursor");
  if (cursor && window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("mousemove", (e) => {
      gsap.to(cursor, { x: e.clientX - 6, y: e.clientY - 6, duration: 0.35, ease: "power3.out" });
    });
    $$("a, button").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-grow"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-grow"));
    });
  }

  /* ── preloader → orbit intro ── */
  const heroChars = splitChars($(".journey__word"));
  gsap.set(heroChars, { yPercent: 115, rotate: 4 });
  gsap.set(".jlayer:first-child", { scale: 1.12 });

  const counter = { v: 0 };
  const loaderNum = $("#loaderNum");
  const intro = gsap.timeline();

  intro
    .to(counter, {
      v: 100,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => (loaderNum.textContent = String(Math.round(counter.v)).padStart(2, "0")),
    })
    .to("#loader", { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "+=0.15")
    .set("#loader", { display: "none" })
    .to(".jlayer:first-child", { scale: 1, duration: 2.4, ease: "power2.out" }, "-=0.9")
    .to(heroChars, { yPercent: 0, rotate: 0, duration: 1.3, ease: "expo.out", stagger: 0.055 }, "<+0.1")
    .to("[data-j-fade]", { opacity: 1, duration: 1.1, ease: "power2.out", stagger: 0.12 }, "-=0.8")
    .to(".nav", { opacity: 1, duration: 0.8 }, "<");

  /* ── the descent: orbit → city → residence → room by room ──
     Each layer zooms toward the viewer and dissolves, revealing the
     next scene already growing — one continuous dive. */
  const layers = $$(".jlayer");
  const stageEl = $("#jStage");
  const altEl = $("#jAlt");
  let jIndex = 0;

  layers.forEach((l, i) => {
    if (i) {
      gsap.set(l, { autoAlpha: 0 });
      gsap.set($("img", l), { scale: 0.82 });
    }
  });

  const journeyTl = gsap.timeline({
    scrollTrigger: {
      trigger: ".journey",
      start: "top top",
      end: "+=" + (layers.length - 1) * 90 + "%",
      pin: ".journey__stage",
      scrub: 0.5,
      onUpdate(self) {
        gsap.set("#jBar", { scaleX: self.progress });
        const i = Math.min(layers.length - 1, Math.round(self.progress * (layers.length - 1)));
        if (i !== jIndex) {
          jIndex = i;
          stageEl.textContent = layers[i].dataset.stage;
          altEl.textContent = layers[i].dataset.alt;
          gsap.fromTo([stageEl, altEl], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out", overwrite: true });
        }
      },
    },
  });

  journeyTl.to(".journey__title", { autoAlpha: 0, yPercent: -14, duration: 0.45, ease: "none" }, 0);

  layers.forEach((layer, i) => {
    if (i === layers.length - 1) return;
    const next = layers[i + 1];
    const t = i;
    journeyTl
      .to($("img", layer), { scale: 2.7, duration: 1, ease: "power1.in" }, t)
      .fromTo($("img", layer), { filter: "blur(0px)" }, { filter: "blur(9px)", duration: 0.38, ease: "none" }, t + 0.62)
      .to(layer, { autoAlpha: 0, duration: 0.3, ease: "none" }, t + 0.68)
      .fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.32, ease: "none" }, t + 0.63)
      .to($("img", next), { scale: 1, duration: 0.37, ease: "none" }, t + 0.63);
  });
  /* settle: the last room breathes slightly at the end of the dive */
  journeyTl.to($("img", layers[layers.length - 1]), { scale: 1.06, duration: 0.6, ease: "none" });

  /* ── manifesto: word-by-word ink-in while pinned ── */
  const manifestoWords = splitWords($("#manifestoText"));
  gsap.set(manifestoWords, { opacity: 0.12 });
  gsap.to(manifestoWords, {
    opacity: 1,
    stagger: 0.4,
    ease: "none",
    scrollTrigger: {
      trigger: ".manifesto",
      start: "top top",
      end: "+=130%",
      pin: ".manifesto__pin",
      scrub: 0.4,
    },
  });

  /* ── showcase: pinned full-screen property reveals ── */
  const slides = $$("[data-slide]");
  const indexEl = $("#showcaseIndex");
  slides.forEach((s, i) => {
    if (i) gsap.set(s, { clipPath: "inset(100% 0 0 0)" });
    gsap.set($(".slide__media img", s), i ? { yPercent: -14, scale: 1.08 } : { scale: 1.0 });
  });

  const showTl = gsap.timeline({
    scrollTrigger: {
      trigger: ".showcase",
      start: "top top",
      end: "+=" + slides.length * 90 + "%",
      pin: ".showcase__stage",
      scrub: 0.5,
      onUpdate(self) {
        const i = Math.min(slides.length - 1, Math.floor(self.progress * slides.length));
        indexEl.textContent = String(i + 1).padStart(2, "0");
      },
    },
  });

  slides.forEach((slide, i) => {
    if (!i) return;
    const prev = slides[i - 1];
    showTl
      .to($(".slide__info", prev), { yPercent: -30, opacity: 0, duration: 0.5, ease: "none" })
      .to(slide, { clipPath: "inset(0% 0 0 0)", duration: 1, ease: "none" }, "<")
      .to($(".slide__media img", slide), { yPercent: 0, scale: 1, duration: 1, ease: "none" }, "<")
      .fromTo(
        $(".slide__info", slide),
        { yPercent: 25, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.5, ease: "none" },
        "-=0.35"
      );
  });

  /* ── horizontal collection ── */
  const track = $("#hgalTrack");
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  gsap.to(track, {
    x: () => -dist(),
    ease: "none",
    scrollTrigger: {
      trigger: ".hgal",
      start: "top top",
      end: () => "+=" + dist(),
      pin: ".hgal__stage",
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate(self) {
        gsap.set("#hgalBar", { scaleX: self.progress });
      },
    },
  });

  /* ── velocity skew on gallery cards ── */
  const skewSetter = gsap.quickSetter("[data-skew]", "skewY", "deg");
  const clampSkew = gsap.utils.clamp(-4, 4);
  ScrollTrigger.create({
    onUpdate(self) {
      const skew = clampSkew(self.getVelocity() / -500);
      if (Math.abs(skew) > 0.05) {
        skewSetter(skew);
        gsap.to({}, { duration: 0.5, onComplete: () => skewSetter(0), overwrite: "auto" });
      }
    },
  });

  /* ── counters ── */
  $$("[data-counter]").forEach((el) => {
    const target = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const state = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () =>
        gsap.to(state, {
          v: target,
          duration: 2,
          ease: "power3.out",
          onUpdate: () =>
            (el.textContent = decimals
              ? state.v.toFixed(decimals)
              : Math.round(state.v).toLocaleString("en-US")),
        }),
    });
  });

  /* ── destinations: counter-scroll headline + image parallax ── */
  $$(".dest").forEach((row) => {
    const dir = parseFloat(row.dataset.dir || "1");
    gsap.fromTo(
      $(".dest__name", row),
      { xPercent: 9 * dir },
      {
        xPercent: -9 * dir,
        ease: "none",
        scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
    gsap.fromTo(
      $(".dest__media img", row),
      { yPercent: -12 },
      {
        yPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  });

  /* ── quote: cream theme + word reveal ── */
  ScrollTrigger.create({
    trigger: ".quote",
    start: "top 62%",
    end: "bottom 30%",
    onEnter: () => document.body.classList.add("theme-cream"),
    onLeave: () => document.body.classList.remove("theme-cream"),
    onEnterBack: () => document.body.classList.add("theme-cream"),
    onLeaveBack: () => document.body.classList.remove("theme-cream"),
  });
  const quoteWords = splitWords($("#quoteText"));
  gsap.set(quoteWords, { opacity: 0, yPercent: 40 });
  ScrollTrigger.create({
    trigger: ".quote",
    start: "top 60%",
    once: true,
    onEnter: () =>
      gsap.to(quoteWords, {
        opacity: 1,
        yPercent: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.035,
      }),
  });

  /* ── generic reveals ── */
  $$(".hgal__title, .dests__kicker, .footer__lead, .quote__by, .quote__mark").forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 30,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  /* ── magnetic mail link ── */
  const magnet = $("#magnetMail");
  if (magnet && window.matchMedia("(hover: hover)").matches) {
    magnet.addEventListener("mousemove", (e) => {
      const r = magnet.getBoundingClientRect();
      gsap.to(magnet, {
        x: (e.clientX - r.left - r.width / 2) * 0.18,
        y: (e.clientY - r.top - r.height / 2) * 0.3,
        duration: 0.5,
        ease: "power3.out",
      });
    });
    magnet.addEventListener("mouseleave", () =>
      gsap.to(magnet, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" })
    );
  }

  wireMenu(lenis);

  window.addEventListener("load", () => ScrollTrigger.refresh());

  /* ── menu overlay (works with or without gsap) ── */
  function wireMenu(lenisInstance) {
    const btn = $("#menuBtn");
    const menu = $("#menuOverlay");
    if (!btn || !menu) return;
    const links = $$(".menu__links a, .menu__foot span", menu);
    let open = false;

    const setOpen = (next) => {
      open = next;
      btn.setAttribute("aria-expanded", String(open));
      menu.setAttribute("aria-hidden", String(!open));
      btn.querySelector(".nav__menu-label").textContent = open ? "Close" : "Menu";
      if (typeof gsap === "undefined") {
        menu.style.visibility = open ? "visible" : "hidden";
        menu.style.clipPath = open ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)";
        return;
      }
      if (open) {
        if (lenisInstance) lenisInstance.stop();
        gsap.timeline()
          .set(menu, { visibility: "visible" })
          .to(menu, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "power4.inOut" })
          .fromTo(
            links,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.07 },
            "-=0.3"
          );
      } else {
        if (lenisInstance) lenisInstance.start();
        gsap.timeline()
          .to(menu, { clipPath: "inset(0 0 100% 0)", duration: 0.7, ease: "power4.inOut" })
          .set(menu, { visibility: "hidden" });
      }
    };

    btn.addEventListener("click", () => setOpen(!open));

    $$("[data-scroll-to]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const target = $(a.dataset.scrollTo);
        if (!target) return;
        e.preventDefault();
        if (open) setOpen(false);
        if (lenisInstance) {
          setTimeout(() => lenisInstance.scrollTo(target, { duration: 1.6 }), open ? 500 : 0);
        } else {
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }
})();
