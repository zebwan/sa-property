/* Page-level modules for inner templates. Registered before sa.js boots; each runs on every page init. */
window.SA_MODULES = window.SA_MODULES || [];
(function () {
  "use strict";
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* image marquee: constant speed (150 / 100 / 75 px/s), runs only in view, slight scrub drift */
  window.SA_MODULES.push(function (root, reveal, SA) {
    qa(".marquee", root).forEach(function (m) {
      var cont = q(".marquee-container", m), content = q(".marquee-content", m); if (!cont || !content) return;
      cont.appendChild(content.cloneNode(true));
      var tw = null;
      function speed() { return window.innerWidth <= 650 ? 75 : (window.innerWidth <= 1024 ? 100 : 150); }
      function start() {
        var p = tw ? tw.progress() : 0; stop();
        var gap = parseFloat(getComputedStyle(content).columnGap) || 0, dist = content.scrollWidth + gap;
        tw = gsap.fromTo(cont.children, { x: 0 }, { x: -dist, duration: dist / speed(), ease: "none", repeat: -1 }); tw.progress(p);
      }
      function stop() { if (tw) { tw.kill(); tw = null; } }
      ScrollTrigger.create({ trigger: m, start: "top bottom", end: "bottom top", invalidateOnRefresh: true, onEnter: start, onEnterBack: start, onLeave: stop, onLeaveBack: stop });
      gsap.to(q(".marquee-wrapper", m), { xPercent: -7, ease: "none", scrollTrigger: { trigger: m, scrub: true, invalidateOnRefresh: true } });
      SA.cleanup(stop);
    });
  });

  /* collage photos: gentle parallax (yPercent ±c, scale r) */
  window.SA_MODULES.push(function (root) {
    qa(".collage-media img", root).forEach(function (img, i) {
      var c = i % 2 ? 6 : 4;
      gsap.set(img, { yPercent: -c, scale: 1.1, willChange: "transform" });
      gsap.to(img, { yPercent: c, ease: "none", scrollTrigger: { trigger: q(".collage", root), invalidateOnRefresh: true, scrub: true } });
    });
  });

  /* map hero: draw the outlines, then pins fade in */
  window.SA_MODULES.push(function (root, reveal) {
    var svg = q(".map-svg", root); if (!svg) return;
    var paths = qa("path", svg), pins = qa(".hero-map-pin", root);
    paths.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    gsap.set(pins, { autoAlpha: 0 });
    var tl = gsap.timeline({ paused: true });
    tl.to(paths, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut", stagger: 0.04 })
      .to(pins, { autoAlpha: 1, duration: 1.2, ease: "myEase", stagger: 0.15 }, "<40%");
    var title = q(".hero-map-top .title-l", root), desc = q(".hero-map-top .desc-m", root);
    if (title) {
      var a = new SplitText(title, { type: "lines" }); new SplitText(title, { type: "lines", linesClass: "textMask" });
      var ic = qa("i", title).map(function (e) { return new SplitText(e, { type: "chars", charsClass: "char" }); });
      gsap.set([title, desc], { autoAlpha: 1 });
      tl.from(a.lines, { yPercent: 120, duration: 1.2, stagger: 0.1, ease: "myEase" }, 0);
      ic.forEach(function (c) { tl.from(c.chars, { yPercent: 40, autoAlpha: 0, filter: "blur(5px)", duration: 1.2, stagger: 0.1, ease: "myEase" }, "<50%"); });
      if (desc) { var b = new SplitText(desc, { type: "lines" }); new SplitText(desc, { type: "lines", linesClass: "textMask" }); tl.from(b.lines, { yPercent: 120, duration: 1.2, stagger: 0.1, ease: "myEase" }, 0.2); }
    }
    reveal.push(function () { tl.play(); });
  });

  /* all-projects: location filter + sort */
  window.SA_MODULES.push(function (root) {
    var grid = q(".search-grid", root); if (!grid) return;
    var cards = qa(".listing-card", grid), count = q(".search-count", root), sort = q(".sort-select select", root);
    function apply() {
      var loc = (q('input[name="loc"]:checked', root) || {}).value || "all", n = 0;
      cards.forEach(function (c) { var ok = loc === "all" || c.dataset.loc === loc; c.classList.toggle("is-hidden", !ok); if (ok) n++; });
      if (count) count.textContent = n + (n === 1 ? " project" : " projects");
      var mode = sort ? sort.value : "az";
      cards.slice().sort(function (a, b) {
        if (mode === "units") return (+b.dataset.units) - (+a.dataset.units);
        return a.dataset.name.localeCompare(b.dataset.name);
      }).forEach(function (c) { grid.appendChild(c); });
      ScrollTrigger.refresh();
      if (history.replaceState) { var u = new URL(location.href); if (loc === "all") u.searchParams.delete("location"); else u.searchParams.set("location", loc); history.replaceState({}, "", u); }
    }
    qa('input[name="loc"]', root).forEach(function (i) { i.addEventListener("change", apply); });
    if (sort) sort.addEventListener("change", apply);
    var clr = q(".search-sidebar-clear button", root); if (clr) clr.addEventListener("click", function () { var a = q('input[name="loc"][value="all"]', root); if (a) { a.checked = true; apply(); } });
    var pre = new URL(location.href).searchParams.get("location"); if (pre) { var i = q('input[name="loc"][value="' + pre + '"]', root); if (i) i.checked = true; }
    apply();
    gsap.from(cards.filter(function (c) { return !c.classList.contains("is-hidden"); }).slice(0, 9), { autoAlpha: 0, y: 30, duration: 1, ease: "myEase", stagger: 0.06, delay: 0.2 });
  });

  /* gallery lightbox */
  window.SA_MODULES.push(function (root, reveal, SA) {
    var grid = q(".photo-grid", root); if (!grid) return;
    var btns = qa("button", grid), lb = q(".lightbox", root), im = q("img", lb), cnt = q(".lb-count", lb), cur = 0;
    function show(i) { cur = (i + btns.length) % btns.length; im.src = btns[cur].dataset.full; cnt.textContent = (cur + 1) + " / " + btns.length; }
    btns.forEach(function (b, i) { b.addEventListener("click", function () { show(i); lb.classList.add("open"); SA.lenis.stop(); }); });
    function close() { lb.classList.remove("open"); SA.lenis.start(); }
    q(".lb-close", lb).addEventListener("click", close);
    q(".lb-prev", lb).addEventListener("click", function () { show(cur - 1); });
    q(".lb-next", lb).addEventListener("click", function () { show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    function key(e) { if (!lb.classList.contains("open")) return; if (e.key === "Escape") close(); if (e.key === "ArrowRight") show(cur + 1); if (e.key === "ArrowLeft") show(cur - 1); }
    document.addEventListener("keydown", key); SA.cleanup(function () { document.removeEventListener("keydown", key); });
    gsap.from(btns.slice(0, 12), { autoAlpha: 0, y: 30, duration: 1, ease: "myEase", stagger: 0.04, scrollTrigger: { trigger: grid, start: "top 87%" } });
  });

  /* contact form: validate, then hand off to the visitor's email app (no backend yet) */
  window.SA_MODULES.push(function (root) {
    var f = q(".contact-form", root); if (!f) return;
    var type = new URL(location.href).searchParams.get("type"), sel = q("select[name=type]", f);
    if (type && sel) { var o = qa("option", sel).filter(function (x) { return x.value === type; })[0]; if (o) sel.value = type; }
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var ok = true;
      qa("[required]", f).forEach(function (el) {
        var wrap = el.closest(".app-input"), bad = !el.value.trim() || (el.type === "email" && !/^\S+@\S+\.\S+$/.test(el.value));
        wrap.classList.toggle("error", bad); if (bad) ok = false;
      });
      var msg = q(".submit-text", f);
      if (!ok) { msg.textContent = "Please fill in the highlighted fields."; return; }
      var d = new FormData(f), to = d.get("type") === "careers" ? f.dataset.career : f.dataset.to;
      var body = "Name: " + d.get("name") + "\nEmail: " + d.get("email") + "\nPhone: " + d.get("phone") + "\nEnquiry: " + (sel ? sel.options[sel.selectedIndex].text : "") + "\n\n" + d.get("message");
      location.href = "mailto:" + to + "?subject=" + encodeURIComponent("Website enquiry: " + (sel ? sel.options[sel.selectedIndex].text : "")) + "&body=" + encodeURIComponent(body);
      msg.textContent = "Thank you. Your email app should open with your message ready to send.";
    });
  });
})();

/* leadership bio modal */
window.SA_MODULES.push(function (root, reveal, SA) {
  var m = root.querySelector(".leader-modal"); if (!m) return;
  var panel = m.querySelector(".leader-modal-panel"), back = m.querySelector(".leader-modal-backdrop"), body = m.querySelector(".leader-modal-body");
  function open(i) {
    var t = root.querySelector("#leader-" + i); if (!t) return;
    body.innerHTML = t.innerHTML; m.classList.add("open"); SA.lenis.stop();
    gsap.to(back, { opacity: 0.5, duration: 0.6, ease: "myEase" }); gsap.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.8, ease: "myEase" });
  }
  function close() {
    gsap.to(back, { opacity: 0, duration: 0.5 }); gsap.to(panel, { xPercent: 100, duration: 0.6, ease: "myEase", onComplete: function () { m.classList.remove("open"); } }); SA.lenis.start();
  }
  Array.prototype.forEach.call(root.querySelectorAll("[data-leader]"), function (b) { b.addEventListener("click", function () { open(b.dataset.leader); }); });
  back.addEventListener("click", close); m.querySelector(".leader-modal-close").addEventListener("click", close);
});
