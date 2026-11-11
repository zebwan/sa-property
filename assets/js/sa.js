/* SA Property Management — runtime. Motion values mirror the reference template's GSAP calls. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var isPhone = function () { return window.matchMedia("(max-width: 650px)").matches; };
  var finePointer = function () { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; };

  /* --vw: viewport width in px (rem base) */
  (function () {
    var last = 0, raf = 0;
    function set() { var w = window.innerWidth; if (w !== last) { last = w; doc.style.setProperty("--vw", w + "px"); } }
    set();
    window.addEventListener("resize", function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; set(); }); }, { passive: true });
  })();

  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  CustomEase.create("myEase", "0.28, 0.11, 0.32, 1");

  /* ---------------- Lenis ---------------- */
  var lenis = new Lenis({ duration: 1.2, wheelMultiplier: 0.6, smoothWheel: true, syncTouch: false, gestureOrientation: "vertical" });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);
  window.saLenis = lenis;

  /* ---------------- helpers ---------------- */
  var pageCtx = null;          // gsap.context for page-scoped animations
  var pageCleanups = [];
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function layer() { return q(".page-layer:not(.is-leaving)"); }

  /* ---------------- reveal hooks (shared) ---------------- */
  function splitLinesMasked(el) {
    var inner = new SplitText(el, { type: "lines" });
    new SplitText(el, { type: "lines", linesClass: "textMask" });
    return inner;
  }
  function italicChars(el) {
    return qa("i, em", el).map(function (e) { return new SplitText(e, { type: "chars", charsClass: "char" }); })
      .filter(function (s) { return s.chars && s.chars.length; });
  }
  var H = {
    // textLinesReveal (signature): lines yPercent 100 + autoAlpha, italic chars blur in
    lines: function (el, o) {
      o = o || {};
      var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: o.start || "top 87%", end: "bottom 87%" } });
      var s = new SplitText(el, { type: "lines" });
      if (o.mask !== false) new SplitText(el, { type: "lines", linesClass: "textMask" });
      var ic = italicChars(el);
      gsap.set(el, { autoAlpha: 1 });
      tl.from(s.lines, { autoAlpha: 0, duration: 1.2, yPercent: 100, stagger: 0.1, ease: "myEase" });
      ic.forEach(function (c) { tl.from(c.chars, { duration: 1.2, yPercent: 40, autoAlpha: 0, filter: "blur(2px)", stagger: 0.1, ease: "myEase" }, "<"); });
    },
    // linesUp
    linesUp: function (el) {
      var s = splitLinesMasked(el); gsap.set(el, { autoAlpha: 1 });
      gsap.from(s.lines, { yPercent: 120, duration: 1.2, stagger: 0.13, ease: "myEase", scrollTrigger: { trigger: el, start: "top 87%", end: "bottom 87%" } });
    },
    // charsCenterExpo (masked chars from centre)
    charsCenter: function (el) {
      var s = new SplitText(el, { type: "chars", mask: "chars" }); gsap.set(el, { autoAlpha: 1 });
      gsap.from(s.chars, { duration: 2, yPercent: 120, ease: "expo", stagger: { amount: 0.25, from: "center" }, scrollTrigger: { trigger: el, start: "top 95%", end: "bottom 95%" } });
    },
    // charsFadeX (small labels)
    charsX: function (el) {
      var s = new SplitText(el, { type: "chars" }); gsap.set(el, { autoAlpha: 1 });
      gsap.from(s.chars, { duration: 0.5, autoAlpha: 0, xPercent: 40, stagger: 0.06, ease: "myEase", scrollTrigger: { trigger: el, start: "top 87%", end: "bottom 87%" } });
    },
    // charsBlurUp
    charsBlur: function (el, o) {
      var s = new SplitText(el, { type: "chars" }); new SplitText(el, { type: "lines", linesClass: "textMask" }); gsap.set(el, { autoAlpha: 1 });
      gsap.from(s.chars, { yPercent: (o && o.from === "top") ? -120 : 120, autoAlpha: 0, filter: "blur(2px)", duration: 1.1, ease: "myEase", stagger: { amount: 0.4, ease: "linear" }, scrollTrigger: { trigger: el, start: "top 87%", end: "bottom 87%" } });
    },
    // textLinesInlineImages (statement with photos in the text)
    linesImg: function (el) {
      var s = new SplitText(el, { type: "lines" }), m = new SplitText(el, { type: "lines", linesClass: "textMask" });
      gsap.set(el, { autoAlpha: 1 });
      s.lines.forEach(function (line, i) {
        var ic = qa("i, em", line).map(function (e) { return new SplitText(e, { type: "chars", charsClass: "char" }); }).filter(function (x) { return x.chars && x.chars.length; });
        var imgs = qa(".text-image img", line);
        var tl = gsap.timeline({ scrollTrigger: { trigger: m.lines[i], start: "top 87%", end: "bottom 87%" } });
        tl.from(line, { duration: 1.5, yPercent: 120, ease: "expo.out" });
        ic.forEach(function (c) { tl.from(c.chars, { duration: 1.2, yPercent: 40, autoAlpha: 0, filter: "blur(2px)", stagger: 0.1, ease: "myEase" }, "<"); });
        if (imgs.length) tl.from(imgs, { duration: 1.2, yPercent: 120, autoAlpha: 0, filter: "blur(2px)", rotate: 20, ease: "myEase", stagger: 0.2 }, "<");
      });
    },
    fade: function (el) {
      gsap.from(el, { autoAlpha: 0, duration: 1.5, ease: "myEase", scrollTrigger: { trigger: el, start: el.dataset.start || "top 87%" } });
      gsap.set(el, { visibility: "inherit" });
    },
    slideX: function (el) {
      var from = el.dataset.from === "right" ? 110 : -110;
      gsap.set(el, { xPercent: from, autoAlpha: 1, willChange: "transform" });
      gsap.to(el, { xPercent: 0, ease: "power1.out", duration: 1.05, scrollTrigger: { trigger: el.closest("[data-slide-trigger]") || el.parentElement, start: "top 80%", end: "bottom 80%" } });
    },
    lineGrow: function (el) {
      gsap.set(el, { width: 0 });
      gsap.to(el, { width: "100%", ease: "sine.inOut", duration: 1.2, scrollTrigger: { trigger: el, start: "top 87%", end: "bottom 87%" } });
    },
    zoomOut: function (el) { // parallax photos
      gsap.set(el, { willChange: "transform" });
      gsap.from(el, { yPercent: -7, scale: 1.25, ease: "none", scrollTrigger: { trigger: el.closest("[data-zoom-trigger]") || el.parentElement, scrub: 1.4, end: "bottom bottom" } });
    },
    parallaxImg: function (el) {
      var p = +(el.dataset.p || 15);
      gsap.set(el, { yPercent: -p, willChange: "transform", scale: 1.12 });
      gsap.to(el, { yPercent: p, ease: "none", scrollTrigger: { trigger: el.parentElement, invalidateOnRefresh: true, scrub: true } });
    },
    parallax50: function (el) {
      gsap.set(el, { yPercent: -50, willChange: "transform" });
      gsap.to(el, { yPercent: 50, ease: "none", scrollTrigger: { trigger: el.closest("section"), invalidateOnRefresh: true, scrub: true } });
    },
    number: function (el) { // odometer roll
      gsap.set(el, { height: el.offsetHeight, overflow: "hidden", display: "flex" });
      var cols = [];
      qa(".number-fix", el).forEach(function (nf) {
        var t = nf.textContent.trim(); nf.innerHTML = "";
        nf.classList.add("animated-number");
        t.split("").forEach(function (ch) {
          var col = document.createElement("div"); col.className = "animated-number-col";
          if (/\d/.test(ch)) { var n = +ch; var arr = n > 1 ? Array.from({ length: n }, function (_, k) { return k + 1; }) : [ch]; arr.forEach(function (d) { var x = document.createElement("div"); x.textContent = d; col.appendChild(x); }); }
          else { var x = document.createElement("div"); x.textContent = ch; col.appendChild(x); }
          nf.appendChild(col); cols.push(col);
        });
      });
      gsap.set(cols, { yPercent: 100 });
      gsap.to(cols, { yPercent: function (i) { var k = cols[i].children.length; return k > 1 ? -100 * (k - 1) : 0; }, duration: 1.2, stagger: 0.15, ease: "sine.inOut", scrollTrigger: { trigger: el, start: "top 96%", end: "bottom 96%" } });
    }
  };

  /* ---------------- button letter roll ---------------- */
  function initButtons(root) {
    qa(".app-button", root).forEach(function (b) {
      if (b.dataset.rolled) return; b.dataset.rolled = 1;
      var label = b.querySelector(".lbl"); if (!label) return;
      var text = label.textContent;
      function chars(t) { return t.split("").map(function (c) { return c === " " ? '<span class="sp"></span>' : '<span class="c">' + c + "</span>"; }).join(""); }
      label.innerHTML = '<span class="w">' + chars(text) + '</span>';
      var clone = document.createElement("span"); clone.className = "clone"; clone.setAttribute("aria-hidden", "true");
      clone.innerHTML = '<span class="w">' + chars(text) + "</span>";
      label.parentElement.appendChild(clone);
      var a = qa(".c", label), c = qa(".c", clone);
      gsap.set(clone, { display: "flex", justifyContent: "center" });
      gsap.set(c, { yPercent: 130 });
      b.addEventListener("mouseenter", function () {
        if (!finePointer()) return;
        gsap.to(a, { yPercent: -130, duration: 0.5, ease: "myEase", stagger: 0.02, overwrite: true });
        gsap.to(c, { yPercent: 0, duration: 0.5, ease: "myEase", stagger: 0.02, overwrite: true });
      });
      b.addEventListener("mouseleave", function () {
        if (!finePointer()) return;
        gsap.to(a, { yPercent: 0, duration: 0.5, ease: "myEase", stagger: 0.02, overwrite: true });
        gsap.to(c, { yPercent: 130, duration: 0.5, ease: "myEase", stagger: 0.02, overwrite: true });
      });
    });
  }

  /* ---------------- header ---------------- */
  var header = { el: null, triggers: [], lastY: 0 };
  function initHeader(root) {
    var h = q(".header", root); header.el = h; if (!h) return;
    header.triggers.forEach(function (t) { t.kill(); }); header.triggers = [];
    var light = q("[data-header-start=light]", root);
    var noBottom = q("[data-header-bottom=none]", root);
    if (light) {
      h.classList.remove("background", "show-bottom");
      header.triggers.push(ScrollTrigger.create({ trigger: light, start: "top top", end: "bottom top", onLeave: function () { h.classList.add("background"); }, onEnterBack: function () { h.classList.remove("background"); } }));
      if (!noBottom) {
        header.triggers.push(ScrollTrigger.create({ trigger: light, start: "top 70%", end: "bottom 70%", onLeave: function () { h.classList.add("show-bottom"); }, onEnterBack: function () { h.classList.remove("show-bottom"); } }));
        var ft = q("[data-anim-trigger=footer]");
        if (ft) header.triggers.push(ScrollTrigger.create({ trigger: ft, start: "-10% 100%", end: "-10% 100%", onLeave: function () { h.classList.remove("show-bottom"); }, onEnterBack: function () { h.classList.add("show-bottom"); } }));
      }
    } else { h.classList.add("background"); h.classList.remove("show-bottom"); }
  }
  lenis.on("scroll", function (e) {
    var h = header.el; if (!h) return;
    var y = e.scroll, d = y - header.lastY; header.lastY = y;
    if (Math.abs(d) < 6 && Math.abs(e.velocity || 0) < 0.02) return;
    var dir = d > 0 ? 1 : -1;
    var menuOpen = menus.open || mobileMenu.open;
    var down = dir === 1 && y > 0 && !menuOpen && !doc.classList.contains("lenis-stopped");
    h.classList.toggle("scrolling", down);
    var hb = q(".header-bottom", h.closest(".page-layer")); if (hb) hb.classList.toggle("scrolling", down);
  });

  /* ---------------- desktop dropdown menus ---------------- */
  var menus = { open: null, tl: null, el: null };
  function pageBg() { return q(".page-bg-opacity", layer()); }
  function initDesktopMenu(root) {
    var m = q(".menu", root); menus.el = m; menus.open = null; if (!m) return;
    var wrapper = q(".menu-wrapper", m), bottom = q(".menu-bottom", m);
    qa("[data-menu]", root).forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (isPhone()) return;
        var name = btn.dataset.menu;
        if (menus.open === name) return closeMenu();
        openMenu(name, btn);
      });
    });
    m.addEventListener("click", function (e) { if (e.target.classList.contains("menu-backdrop")) closeMenu(); });
    function openMenu(name, btn) {
      var first = !menus.open;
      qa("[data-menu]", root).forEach(function (b) { b.classList.toggle("active", b === btn); });
      qa(".menu-panel", m).forEach(function (p) { p.classList.toggle("active", p.dataset.panel === name); });
      menus.open = name; m.classList.add("open");
      header.el.setAttribute("data-theme", "menu"); header.el.classList.remove("scrolling");
      lenis.stop();
      var panel = q('.menu-panel[data-panel="' + name + '"]', m);
      var lines = qa(".ml", panel);
      gsap.killTweensOf([wrapper, lines]);
      if (first) {
        gsap.fromTo(wrapper, { yPercent: -100 }, { yPercent: 0, duration: 1.2, ease: "myEase" });
        gsap.to(q(".menu-backdrop", m), { opacity: 0.5, duration: 1.2, ease: "myEase" });
        gsap.fromTo(q(".socials", bottom), { autoAlpha: 0, filter: "blur(5px)" }, { autoAlpha: 1, filter: "blur(0px)", duration: 0.8, delay: 0.84 });
        gsap.fromTo(q(".menu-contact", bottom), { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.8, delay: 1.0 });
      }
      gsap.fromTo(lines, { yPercent: 120 }, { yPercent: 0, duration: 0.8, ease: "myEase", stagger: 0.1, delay: first ? 0.25 : 0 });
      var imgs = qa(".menu-slider-item", panel);
      if (imgs.length) gsap.fromTo(imgs, { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: "myEase", stagger: 0.06, delay: first ? 0.25 : 0 });
    }
    menus.close = closeMenu;
    function closeMenu() {
      if (!menus.open) return;
      menus.open = null;
      qa("[data-menu]", root).forEach(function (b) { b.classList.remove("active"); });
      gsap.to(wrapper, { yPercent: -100, duration: 0.8, ease: "myEase" });
      gsap.to(q(".menu-backdrop", m), { opacity: 0, duration: 0.8, ease: "myEase", onComplete: function () { if (!menus.open) { m.classList.remove("open"); } } });
      header.el.removeAttribute("data-theme");
      lenis.start();
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); closeMobile(); } });
  }

  /* ---------------- phone menu ---------------- */
  var mobileMenu = { open: false };
  function closeMobile() { if (mobileMenu.open && mobileMenu.toggle) mobileMenu.toggle(); }
  function initMobileMenu(root) {
    var m = q(".menu", root), cta = q(".header-menu-cta", root); mobileMenu.open = false; if (!m || !cta) return;
    var wrapper = q(".menu-wrapper", m), backdrop = q(".menu-backdrop", m), bottom = q(".menu-mobile-only .menu-bottom", m);
    mobileMenu.toggle = function () {
      if (!isPhone()) return;
      var items = qa(".menu-mobile-nav > *", m);
      if (!mobileMenu.open) {
        mobileMenu.open = true; m.classList.add("open"); cta.classList.add("active");
        header.el.setAttribute("data-theme", "menu"); header.el.classList.remove("scrolling"); lenis.stop();
        gsap.killTweensOf([wrapper, backdrop]);
        gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 0.5, duration: 1.2 });
        gsap.fromTo(wrapper, { yPercent: -100 }, { yPercent: 0, duration: 1.2, ease: "myEase" });
        gsap.fromTo(items, { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: "myEase", stagger: 0.05, delay: 0.3 });
        if (bottom) { gsap.fromTo(q(".socials", bottom), { autoAlpha: 0, filter: "blur(5px)" }, { autoAlpha: 1, filter: "blur(0px)", duration: 0.8, delay: 0.84 }); gsap.fromTo(q(".menu-contact", bottom), { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.8, delay: 1 }); }
      } else {
        mobileMenu.open = false; cta.classList.remove("active");
        gsap.to(wrapper, { yPercent: -100, duration: 0.8, ease: "myEase" });
        gsap.to(backdrop, { opacity: 0, duration: 0.8, onComplete: function () { if (!mobileMenu.open) m.classList.remove("open"); } });
        header.el.removeAttribute("data-theme"); lenis.start();
      }
    };
    cta.addEventListener("click", function (e) { e.preventDefault(); mobileMenu.toggle(); });
    backdrop.addEventListener("click", function () { if (mobileMenu.open) mobileMenu.toggle(); });
    qa(".menu-nav-itemHeader", m).forEach(function (hd) {
      hd.addEventListener("click", function () {
        var content = hd.nextElementSibling, open = hd.classList.toggle("active");
        gsap.to(content, { height: open ? "auto" : 0, duration: 0.6, ease: "myEase" });
      });
    });
  }

  /* ---------------- footer ---------------- */
  function initFooter(root) {
    var f = q(".footer"); if (!f) return;
    var wmEl = q(".footer-wordmark", f);
    function fitWordmark() { if (!wmEl) return; wmEl.style.fontSize = "100px"; var w = wmEl.parentElement.clientWidth, n = wmEl.scrollWidth; if (n) wmEl.style.fontSize = (100 * w / n) + "px"; }
    fitWordmark(); window.addEventListener("resize", fitWordmark); pageCleanups.push(function () { window.removeEventListener("resize", fitWordmark); });
    if (document.fonts && document.fonts.load) document.fonts.load('500 100px "Playfair Display"', "SA Property").then(function () { fitWordmark(); ScrollTrigger.refresh(); });
    var wm = qa(".footer-wordmark .wl", f);
    if (wm.length) gsap.timeline({ scrollTrigger: { trigger: q(".footer-wordmark-wrapper", f), start: "top 100%", end: "98% 100%", endTrigger: f, scrub: 3 } })
      .from(wm, { yPercent: 100, duration: 3.3, stagger: -0.5, ease: "myEase" });
    qa(".footer-acco-item .footer-col-header", f).forEach(function (hd) {
      if (hd.dataset.bound) return; hd.dataset.bound = 1;
      hd.addEventListener("click", function () {
        if (!isPhone()) return;
        var item = hd.parentElement, content = q(".footer-col-content", item), arrow = q(".footer-col-arrow", item);
        var open = item.classList.toggle("active");
        qa(".footer-acco-item.active", f).forEach(function (o) { if (o !== item) { o.classList.remove("active"); gsap.to(q(".footer-col-content", o), { height: 0, duration: 0.5, ease: "myEase" }); gsap.to(q(".footer-col-arrow", o), { rotate: 0 }); } });
        gsap.to(content, { height: open ? "auto" : 0, duration: 0.5, ease: "myEase" });
        gsap.to(arrow, { rotate: open ? 180 : 0 });
      });
    });
  }

  /* ---------------- hero (first main) ---------------- */
  function initHero(root, reveal) {
    var s = q(".first-main", root); if (!s) return;
    var media = q(".fullscreen-media", s), overlay = q(".fullscreen-overlay", s);
    if (media) gsap.to(media, { scale: 1.3, ease: "none", scrollTrigger: { trigger: s, scrub: 1.4, start: "top top" } });
    if (overlay) gsap.to(overlay, { autoAlpha: 0.9, ease: "none", scrollTrigger: { trigger: s, scrub: 1.4, start: "top top" } });
    var cs = q(".card-slider", s);
    if (cs && window.Swiper) {
      new Swiper(cs, { slidesPerView: 1, direction: "vertical", loop: true, grabCursor: true, autoplay: { delay: 3000, pauseOnMouseEnter: true }, speed: 1200, spaceBetween: 24, effect: "creative",
        creativeEffect: { prev: { rotate: [-20, 0, 0], translate: [0, "-140%", -500], scale: 1.1, opacity: 0.2 }, next: { translate: [0, "130%", 0], scale: 0.8 } } });
    }
    var title = q(".first-left .title-2xl", s), desc = q(".first-left .desc-l", s), right = q(".first-right", s), btn = q(".first-right-button", s);
    var tl = gsap.timeline({ paused: true });
    var lines = new SplitText(title, { type: "lines" }); new SplitText(title, { type: "lines", linesClass: "textMask" });
    var ic = italicChars(title);
    tl.set([title, right], { autoAlpha: 1 });
    tl.from(lines.lines, { duration: 1.2, yPercent: 120, stagger: 0.1, ease: "myEase" });
    ic.forEach(function (c) { tl.from(c.chars, { duration: 1.2, yPercent: 40, autoAlpha: 0, filter: "blur(5px)", stagger: 0.1, ease: "myEase" }, "<50%"); });
    if (desc) tl.from(desc, { duration: 1.5, autoAlpha: 0, ease: "myEase" }, "<30%");
    tl.from(right, { yPercent: 130, duration: 1.7, ease: "myEase" }, "<-60%");
    if (btn) tl.from(btn, { opacity: 0, yPercent: 60, duration: 1, ease: "myEase" }, "<50%");
    reveal.push(function () { tl.play(); });
  }
  /* inner heroes: photo (firstInner) / solid (firstSolid) */
  function initInnerHero(root, reveal) {
    var s = q(".first-inner, .first-solid, .first-region", root); if (!s) return;
    var title = q(".title-2xl", s), desc = q(".first-desc", s);
    var tl = gsap.timeline({ paused: true });
    var a = new SplitText(title, { type: "lines" }); new SplitText(title, { type: "lines", linesClass: "textMask" });
    var b = desc ? new SplitText(desc, { type: "lines" }) : null; if (desc) new SplitText(desc, { type: "lines", linesClass: "textMask" });
    var ic = italicChars(title);
    tl.set([title, desc].filter(Boolean), { autoAlpha: 1 });
    var imgWrap = q(".first-img-wrapper", s);
    if (imgWrap) tl.to(imgWrap, { clipPath: "inset(0 0% 0% 0%)", duration: 1.1, ease: "sine.inOut" }, "<");
    tl.from(a.lines, { duration: 1.2, yPercent: 120, stagger: 0.3, ease: "myEase" }, "<");
    if (b) tl.from(b.lines, { yPercent: 120, duration: 1.2, stagger: 0.1, ease: "myEase" }, "<");
    ic.forEach(function (c) { tl.from(c.chars, { duration: 1.2, yPercent: 40, autoAlpha: 0, filter: "blur(5px)", stagger: 0.1, ease: "myEase" }, "<50%"); });
    var media = q(".fullscreen-media, .first-img", s);
    if (media) gsap.to(media, { scale: 1.15, ease: "none", scrollTrigger: { trigger: s, scrub: 1.4, start: "top top" } });
    var overlay = q(".fullscreen-overlay", s);
    if (overlay) gsap.to(overlay, { autoAlpha: 0.9, ease: "none", scrollTrigger: { trigger: s, scrub: 1.4, start: "top top" } });
    reveal.push(function () { tl.play(); });
  }

  /* ---------------- where-we-manage (neighbourhoods) ---------------- */
  function initNeighborhoods(root) {
    qa(".neighborhoods", root).forEach(function (sec) {
      var items = qa(".neighborhoods-list-item", sec), imgs = qa(".neighborhoods-img", sec), cur = 0, busy = [];
      if (imgs.length) {
        gsap.set(imgs, { clipPath: "inset(0% 0% 0 0)", zIndex: 1 }); gsap.set(imgs[0], { zIndex: imgs.length + 1 });
        var z = imgs.length + 1;
        items.forEach(function (it, i) {
          it.addEventListener("mouseenter", function () {
            if (i === cur || busy[i] || !finePointer()) return;
            busy[i] = true; z++;
            items.forEach(function (x) { x.classList.toggle("active", x === it); });
            gsap.set(imgs[i], { zIndex: z, clipPath: "inset(100% 100% 0 0)" });
            gsap.to(imgs[i], { clipPath: "inset(0% 0% 0 0)", duration: 1.5, ease: "myEase", onComplete: function () { busy[i] = false; } });
            cur = i;
          });
        });
        var cont = q(".neighborhoods-slider-container", sec);
        if (cont) gsap.from(cont, { yPercent: -7, scale: 1.25, ease: "none", scrollTrigger: { trigger: q(".neighborhoods-slider", sec), scrub: 1.4, end: "bottom bottom" } });
      }
      items.forEach(function (it) { gsap.from(it, { duration: 1, autoAlpha: 0, xPercent: -20, ease: "myEase", scrollTrigger: { trigger: it, start: "top 80%" } }); });
    });
  }

  /* ---------------- featured properties (pinned) ---------------- */
  function initFeatured(root) {
    qa(".slider[data-featured]", root).forEach(function (sec) {
      var wrap = q(".slider-wrapper", sec), bgs = qa(".slider-bg-img", sec), cardImgs = qa(".slider-img", sec);
      var names = q(".title-inner", sec), nums = q(".slider-number-inner", sec), descs = qa(".desc-wrapper .desc-m", sec), content = q(".slider-content", sec);
      var n = bgs.length; if (!n) return;
      gsap.from(content, { yPercent: 200, duration: 1.5, ease: "power3.out", scrollTrigger: { trigger: wrap, start: "top 60%" } });
      gsap.from(bgs[0], { yPercent: -30, ease: "none", scrollTrigger: { trigger: wrap, end: "bottom bottom", scrub: true, invalidateOnRefresh: true } });
      var splits = descs.map(function (d) { return new SplitText(d, { type: "lines", linesClass: "ln", mask: "lines" }); });
      splits.forEach(function (s, i) { gsap.set(s.lines, { yPercent: i === 0 ? 0 : 110 }); });
      if (n < 2) return;
      gsap.set(bgs.slice(1), { clipPath: "inset(100% 0 0 0)", scale: 1.1 });
      gsap.set(cardImgs.slice(1), { clipPath: "inset(100% 0 0 0)" });
      var step = 1 / (n - 1), cur = 0, scrub = 1.25, endLen = "+=" + (n - 1) * 80 + "%";
      gsap.to(q(".slider-bg", sec), { scale: 1.1, scrollTrigger: { trigger: wrap, scrub: scrub, start: "top top", end: endLen } });
      var tl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: "top top", end: endLen, scrub: scrub, pin: true, invalidateOnRefresh: true, refreshPriority: 1, onUpdate: function (st) { go(st.progress); } } });
      for (var i = 1; i < n; i++) tl.to([bgs[i], cardImgs[i]], { clipPath: "inset(0% 0 0 0)", scale: 1, ease: "power2.inOut" }, step * (i - 1));
      function go(p) {
        var f = Math.floor(Math.max(0, Math.min(1, p)) / step + 0.5); f = Math.min(f, n - 1);
        if (f === cur) return;
        gsap.to([names, nums], { yPercent: -100 * f, duration: 0.7, ease: "myEase" });
        var from = cur;
        gsap.to(splits[from].lines, { yPercent: f > from ? -110 : 110, duration: 0.4, ease: "myEase", stagger: 0.05, onComplete: function () { gsap.to(splits[f].lines, { yPercent: 0, duration: 0.5, ease: "power3.out", stagger: 0.05 }); } });
        cur = f;
      }
    });
  }

  /* ---------------- draggable slider ---------------- */
  function initDraggable(root) {
    qa(".capabilities", root).forEach(function (sec) {
      var el = q(".capabilities-slider", sec), bar = q(".capabilities-progress-line", sec);
      if (!el || !window.Swiper) return;
      var sw = new Swiper(el, { slidesPerView: "auto", freeMode: { enabled: true, momentumRatio: 0.6 }, grabCursor: true,
        on: { progress: function (s, p) { if (bar) bar.style.maxWidth = (33 + Math.max(0, Math.min(1, p)) * 67) + "%"; } } });
      gsap.from([q(".capabilities-progress", sec)].concat(qa(".capabilities-item", sec)), { xPercent: -100, duration: 0.9, ease: "myEase", stagger: 0.3, scrollTrigger: { trigger: q(".capabilities-progress", sec), start: "top 87%", end: "bottom 87%" } });
      qa(".capabilities-img", sec).forEach(function (img) { gsap.set(img, { yPercent: -8, scale: 1.12 }); gsap.to(img, { yPercent: 8, ease: "none", scrollTrigger: { trigger: img.parentElement, scrub: true, invalidateOnRefresh: true } }); });
      pageCleanups.push(function () { sw.destroy(true, false); });
    });
  }

  /* ---------------- custom cursor ---------------- */
  var cursor = (function () {
    var el = q(".custom-cursor"), item = el && q(".custom-cursor-item", el);
    if (!el || !finePointer()) return { bind: function () {} };
    var qx = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" }), qy = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" });
    var sx = gsap.quickTo(item, "scaleX", { duration: 0.5, ease: "power3.out" }), sy = gsap.quickTo(item, "scaleY", { duration: 0.5, ease: "power3.out" });
    var last = { x: 0, y: 0, t: 0 };
    window.addEventListener("pointermove", function (e) {
      var now = Date.now(), dt = last.t ? now - last.t : 16, dx = e.clientX - last.x, dy = e.clientY - last.y;
      var v = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0, a = Math.min(v / 4.5, 1), s = 1 - a * a * (1 - 0.7);
      sx(s); sy(s); qx(e.clientX + 14); qy(e.clientY + 14); last = { x: e.clientX, y: e.clientY, t: now };
    });
    return { bind: function (root) {
      qa("[data-cursor]", root).forEach(function (t) {
        t.addEventListener("mouseenter", function () { item.textContent = t.dataset.cursor || "Explore more"; el.classList.add("on"); });
        t.addEventListener("mouseleave", function () { el.classList.remove("on"); });
      });
    } };
  })();

  /* ---------------- theme triggers (page turns brand blue) ---------------- */
  function initTheme(root) {
    qa("[data-theme-trigger]", root).forEach(function (el, i) {
      ScrollTrigger.create({ trigger: el, start: "top 25%", end: el.dataset.themeEnd || "bottom 80%",
        onEnter: function () { doc.setAttribute("data-theme", el.dataset.themeTrigger); },
        onEnterBack: function () { doc.setAttribute("data-theme", el.dataset.themeTrigger); },
        onLeave: function () { doc.setAttribute("data-theme", "light"); }, onLeaveBack: function () { doc.setAttribute("data-theme", "light"); } });
    });
  }

  /* ---------------- extra page modules registry (inner templates add here) ---------------- */
  var modules = [];
  window.SA = { register: function (fn) { modules.push(fn); }, H: H, q: q, qa: qa, lenis: lenis, isPhone: isPhone, finePointer: finePointer, cleanup: function (fn) { pageCleanups.push(fn); } };

  /* ---------------- page init ---------------- */
  function initPage(root, opts) {
    opts = opts || {};
    var reveal = [];
    pageCtx = gsap.context(function () {
      initHeader(root); initDesktopMenu(root); initMobileMenu(root); initButtons(root);
      initHero(root, reveal); initInnerHero(root, reveal);
      qa("[data-anim]", root).forEach(function (el) {
        var k = el.dataset.anim;
        if (H[k]) H[k](el, { start: el.dataset.start, from: el.dataset.from, mask: el.dataset.mask === "false" ? false : undefined });
      });
      initNeighborhoods(root); initFeatured(root); initDraggable(root); initFooter(root); initTheme(root);
      modules.concat(window.SA_MODULES || []).forEach(function (fn) { fn(root, reveal, window.SA); });
      cursor.bind(root);
    }, root);
    if (opts.preloader) opts.preloader(function () { reveal.forEach(function (f) { f(); }); });
    else reveal.forEach(function (f) { f(); });
    requestAnimationFrame(function () { ScrollTrigger.refresh(); });
  }
  function destroyPage() {
    if (pageCtx) pageCtx.revert(); pageCtx = null;
    pageCleanups.forEach(function (f) { try { f(); } catch (e) {} }); pageCleanups = [];
    ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
    doc.setAttribute("data-theme", "light");
  }

  /* ---------------- preloader ---------------- */
  function runPreloader(done) {
    var p = q(".preloader");
    if (!p || !doc.classList.contains("preloader-active")) { done(); return; }
    lenis.stop(); window.scrollTo(0, 0);
    var go = function () {
      var paths = qa(".preloader-logo .pl-drop", p), keep = q(".preloader-logo .pl-keep", p), svg = q(".preloader-logo", p);
      var tl = gsap.timeline({ onComplete: function () { doc.classList.remove("preloader-active"); lenis.start(); } });
      var bb = keep.getBBox(), vb = svg.viewBox.baseVal, dx = vb.width / 2 - (bb.x + bb.width / 2);
      var vbH = vb.height;
      tl.to(paths, { y: function (i, el) { var b = el.getBBox(); return vbH - b.y + 4; }, stagger: 0.08, duration: 0.45, ease: "power2.in" })
        .to(keep, { x: dx, duration: 0.5, ease: "myEase" })
        .to(keep, { autoAlpha: 0, duration: 0.5, ease: "power1.inOut" }, "+=.05")
        .to(q(".preloader-bg-blue", p), { yPercent: -100, duration: 1, ease: "myEase" }, "<40%")
        .addLabel("reveal", "<")
        .to(q(".preloader-bg-opacity", p), { autoAlpha: 0, duration: 0.9, ease: "myEase" }, "<")
        .call(done, null, "reveal");
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(go, 600); });
  }

  /* ---------------- page transitions (layer slides up over the old page) ---------------- */
  var navigating = false;
  function sameOrigin(a) { return a.origin === location.origin; }
  function shouldIntercept(a, e) {
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download") || a.dataset.noRouter !== undefined) return false;
    var href = a.getAttribute("href"); if (!href || href.charAt(0) === "#" || /^(mailto|tel):/.test(href)) return false;
    if (!sameOrigin(a)) return false;
    if (a.pathname === location.pathname && a.hash) return false;
    return /\/$|\.html$/.test(a.pathname);
  }
  function waitImages(el, offset) {
    var top = el.getBoundingClientRect().top;
    var list = qa("img, video", el).filter(function (m) { if (!m.getClientRects().length) return false; var r = m.getBoundingClientRect(), y = r.top - top - (offset || 0); return y < window.innerHeight && y + r.height >= 0; });
    var one = function (m) { return m.tagName !== "VIDEO" ? (m.decode ? m.decode().catch(function () {}) : Promise.resolve()) : (m.readyState >= 2 ? Promise.resolve() : new Promise(function (r) { m.addEventListener("loadeddata", r, { once: true }); m.addEventListener("error", r, { once: true }); })); };
    return Promise.race([Promise.all(list.map(one)), new Promise(function (r) { setTimeout(r, 1000); })]);
  }
  function navigate(url, push) {
    if (navigating) return; navigating = true;
    if (menus.close) menus.close(); closeMobile();
    fetch(url, { credentials: "same-origin" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (html) {
      var d = new DOMParser().parseFromString(html, "text/html");
      var next = d.querySelector(".page-layer"); if (!next) throw new Error("no layer");
      var old = layer();
      next = document.importNode(next, true);
      next.classList.add("is-entering"); old.classList.add("is-leaving");
      var y = window.scrollY;
      old.parentNode.insertBefore(next, old.nextSibling);
      gsap.set(next, { yPercent: 100 });
      document.title = d.title;
      var desc = d.querySelector('meta[name="description"]'); if (desc) { var md = q('meta[name="description"]'); if (md) md.setAttribute("content", desc.getAttribute("content")); }
      if (push) history.pushState({}, "", url);
      lenis.stop();
      return waitImages(next).then(function () {
        var bg = q(".page-bg-opacity", old);
        gsap.timeline({ onComplete: function () {
          destroyPage();
          old.parentNode.removeChild(old);
          next.classList.remove("is-entering"); gsap.set(next, { clearProps: "all" });
          window.scrollTo(0, 0); lenis.scrollTo(0, { immediate: true, force: true }); lenis.resize(); lenis.start();
          initPage(next); navigating = false;
          if (location.hash) { var t = q(location.hash); if (t) lenis.scrollTo(t, { offset: -60 }); }
        } })
          .fromTo(next, { scale: 0.87, transformOrigin: "50% 0%" }, { yPercent: 0, scale: 1, duration: 0.7, ease: "sine.out" }, 0)
          .to(bg, { autoAlpha: 0.75, duration: 0.7, ease: "power1.inOut" }, 0);
      });
    }).catch(function () { location.href = url; });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a"); if (!shouldIntercept(a, e)) return;
    e.preventDefault(); if (a.href === location.href) { lenis.scrollTo(0); return; } navigate(a.href, true);
  });
  window.addEventListener("popstate", function () { location.reload(); });

  /* ---------------- boot ---------------- */
  doc.classList.remove("no-js");
  function boot() {
    initPage(layer(), { preloader: runPreloader });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
