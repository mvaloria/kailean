/* Kailean — shared site behaviour */
window.KAILEAN = {
  calendlyUrl: "https://calendly.com/kaileanconsultancy",
  // Optional: set to a Formspree / HubSpot / Make webhook URL to receive leads as JSON POSTs.
  leadEndpoint: "",
  phpPerUsd: 58
};

(function () {
  const K = window.KAILEAN;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* Lead capture (no-op if no endpoint is configured) */
  K.sendLead = function (payload) {
    try { localStorage.setItem("kailean_converted", "1"); } catch (e) {}
    if (!K.leadEndpoint) return Promise.resolve();
    return fetch(K.leadEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.assign({ page: location.pathname, submittedAt: new Date().toISOString() }, payload))
    }).catch(() => {});
  };

  /* Booking: Calendly popup with prefill; falls back to opening the page */
  K.calendlyLink = function (prefill = {}) {
    const p = new URLSearchParams();
    Object.entries(prefill).forEach(([k, v]) => { if (v) p.set(k, v); });
    const q = p.toString();
    return K.calendlyUrl + (q ? "?" + q : "");
  };
  K.book = function (prefill) {
    const url = K.calendlyLink(prefill);
    if (window.Calendly && window.Calendly.initPopupWidget) window.Calendly.initPopupWidget({ url });
    else window.open(url, "_blank", "noopener");
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-book]");
    if (!t) return;
    e.preventDefault();
    K.book();
  });

  /* Header shadow + mobile nav */
  const header = $(".site-header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const toggle = $(".nav-toggle"), nav = $(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    $$("a", nav).forEach((a) => a.addEventListener("click", () => { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }));
  }

  /* Reveal on scroll + counters */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "", prefix = el.dataset.prefix || "";
    if (reduce) { el.textContent = prefix + target + suffix; return; }
    const start = performance.now(), dur = 1200;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        if (en.target.dataset.count) countUp(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    $$(".reveal, [data-count]").forEach((el) => io.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("in"));
  }

  /* Floating CTA + mobile bar: show after 40% scroll, hide near booking/footer */
  const fab = $(".fab"), bar = $(".mobile-bar");
  if (fab || bar) {
    let lastY = window.scrollY, nearCta = false;
    const hideZones = $$("#book, .site-footer");
    if ("IntersectionObserver" in window && hideZones.length) {
      const visible = new Set();
      const zo = new IntersectionObserver((entries) => {
        entries.forEach((en) => en.isIntersecting ? visible.add(en.target) : visible.delete(en.target));
        nearCta = visible.size > 0;
        update();
      });
      hideZones.forEach((z) => zo.observe(z));
    }
    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const past = max > 0 ? window.scrollY / max > 0.25 : false;
      const y = window.scrollY, up = y < lastY;
      lastY = y;
      if (fab) fab.classList.toggle("show", past && !nearCta);
      if (bar) bar.classList.toggle("show", y > 300 && !nearCta && (up || past));
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* Exit intent: desktop only, after 15s, once per 14 days, never after conversion */
  const modal = $("#exit-modal");
  if (modal && window.matchMedia("(pointer: fine) and (min-width: 900px)").matches) {
    const KEY = "kailean_exit_seen";
    let seen = false;
    try {
      const last = parseInt(localStorage.getItem(KEY) || "0", 10);
      seen = Date.now() - last < 14 * 864e5 || localStorage.getItem("kailean_converted") === "1";
    } catch (e) {}
    let armed = false, lastFocus = null;
    setTimeout(() => { armed = true; }, 15000);
    const open = () => {
      lastFocus = document.activeElement;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      $(".modal .btn", modal).focus();
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    };
    const close = () => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      if (lastFocus) lastFocus.focus();
    };
    document.addEventListener("mouseout", (e) => {
      if (seen || !armed || e.relatedTarget || e.clientY > 10) return;
      seen = true;
      open();
    });
    modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest(".modal-close")) close(); });
    document.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const f = $$("a, button", modal);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* Smart CTA: swap assessment CTA once the visitor has a score */
  try {
    const score = localStorage.getItem("kailean_score");
    if (score) $$("[data-smart-cta]").forEach((a) => {
      a.textContent = "Book your results walkthrough (score " + score + ")";
      a.setAttribute("href", "#");
      a.setAttribute("data-book", "");
    });
  } catch (e) {}

  /* Solutions finder */
  const finder = $("#finder");
  if (finder) {
    const PACKAGES = {
      diagnostic: { name: "Lean Diagnostic Sprint", dur: "1–2 weeks", desc: "Gemba walks, process interviews and data review to find and quantify your biggest sources of waste.", out: "Prioritised waste map + quick wins" },
      vsm: { name: "Value Stream Mapping Workshop", dur: "2 weeks", desc: "Map current-state flow end to end, expose delays and handoffs, and co-design a leaner future state.", out: "Current & future-state maps + roadmap" },
      kaizen: { name: "Kaizen Event", dur: "3–5 days", desc: "A focused, hands-on improvement blitz with your team on one process, implemented in the same week.", out: "Implemented improvement + standard work" },
      scaling: { name: "Operations Scaling Program", dur: "8–12 weeks", desc: "Standardise core processes, set up KPIs and visual management so you can grow without adding chaos.", out: "Scalable operating system + KPI boards" },
      fivesq: { name: "5S & Standard Work Setup", dur: "2–4 weeks", desc: "Organise workspaces (physical and digital) and document the one best way to do recurring work.", out: "5S audit baseline + SOP library" },
      coaching: { name: "Continuous Improvement Coaching", dur: "Monthly retainer", desc: "Ongoing coaching for leaders and frontline teams to build a self-sustaining Kaizen culture.", out: "Internal CI capability" }
    };
    const PAIN = {
      scaling: ["scaling", "vsm", "Growth is outpacing your processes"],
      costs: ["diagnostic", "kaizen", "Costs are rising faster than revenue"],
      slow: ["vsm", "kaizen", "Work takes too long to get done"],
      quality: ["kaizen", "fivesq", "Errors and rework keep coming back"],
      chaos: ["fivesq", "scaling", "Everyone does it differently"],
      culture: ["coaching", "diagnostic", "Improvements don't stick"]
    };
    const INDUSTRY_NOTE = {
      bpo: "Applied to ticket flow, handle time, QA rework and onboarding.",
      manufacturing: "Applied to production flow, changeovers, inventory and defects.",
      healthcare: "Applied to patient flow, admissions, billing and supply rooms.",
      logistics: "Applied to warehousing, order fulfilment, dispatch and returns.",
      tech: "Applied to delivery pipelines, customer onboarding and support ops.",
      government: "Applied to permits, procurement and frontline citizen services.",
      sme: "Applied to the handful of core processes that run your business."
    };
    const state = { industry: null, pain: null };
    const out = $("#finder-results", finder);
    const render = () => {
      if (!state.industry || !state.pain) {
        out.innerHTML = '<div class="finder-empty">Pick your industry and your biggest challenge to see where we\'d start.</div>';
        return;
      }
      const [p1, p2, painLabel] = PAIN[state.pain];
      const a = PACKAGES[p1], b = PACKAGES[p2];
      out.innerHTML = `
        <article class="result-card primary">
          <div class="kind">Recommended start</div>
          <h4>${a.name}</h4>
          <p>${a.desc}</p>
          <div class="meta">${a.dur} · ${a.out}</div>
        </article>
        <article class="result-card">
          <div class="kind">Then</div>
          <h4>${b.name}</h4>
          <p>${b.desc}</p>
          <div class="meta">${b.dur} · ${b.out}</div>
        </article>
        <article class="result-card">
          <div class="kind">For your context</div>
          <h4>${painLabel}</h4>
          <p>${INDUSTRY_NOTE[state.industry]}</p>
          <a href="#" data-book>Discuss this plan on a free call →</a>
        </article>`;
    };
    $$(".chip", finder).forEach((chip) => {
      chip.addEventListener("click", () => {
        const group = chip.dataset.group;
        $$(`.chip[data-group="${group}"]`, finder).forEach((c) => c.setAttribute("aria-pressed", "false"));
        chip.setAttribute("aria-pressed", "true");
        state[group] = chip.dataset.value;
        render();
      });
    });
    render();
  }

  /* Process timeline */
  const tl = $("#timeline");
  if (tl) {
    const steps = $$(".t-step", tl), panels = $$(".t-panel", tl), prog = $(".timeline-progress", tl);
    const select = (i) => {
      steps.forEach((s, j) => {
        s.setAttribute("aria-selected", j === i);
        s.tabIndex = j === i ? 0 : -1;
        s.classList.toggle("done", j < i);
      });
      panels.forEach((p, j) => (p.hidden = j !== i));
      if (prog) prog.style.width = (80 * i) / (steps.length - 1) + "%";
    };
    steps.forEach((s, i) => {
      s.addEventListener("click", () => select(i));
      s.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const n = (i + (e.key === "ArrowRight" ? 1 : -1) + steps.length) % steps.length;
        select(n); steps[n].focus();
      });
    });
    select(0);
  }

  /* Case study toggle */
  const cs = $("#case");
  if (cs) {
    const tabs = $$(".seg button", cs), panes = $$(".case-pane", cs), bars = $$(".bar", cs);
    const show = (key) => {
      tabs.forEach((t) => t.setAttribute("aria-selected", t.dataset.key === key));
      panes.forEach((p) => (p.hidden = p.dataset.key !== key));
      bars.forEach((b) => {
        const after = key === "after";
        b.style.width = (after ? b.dataset.after : b.dataset.before) + "%";
        b.classList.toggle("after", after);
        const lbl = b.closest(".bar-row").querySelector(".val");
        if (lbl) lbl.textContent = after ? lbl.dataset.after : lbl.dataset.before;
      });
    };
    tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.key)));
    const startObs = new IntersectionObserver((en) => { if (en[0].isIntersecting) { show("before"); startObs.disconnect(); } });
    startObs.observe(cs);
  }

  /* Homepage mini calculator */
  const mini = $("#mini-calc");
  if (mini) {
    const team = $("#mc-team", mini), teamOut = $("#mc-team-out", mini), sel = $("#mc-bottleneck", mini), res = $("#mc-result", mini);
    const COST = 320000; // loaded cost per production worker (PHP/yr)
    const calc = () => {
      const n = +team.value, pct = +sel.value;
      teamOut.textContent = n;
      const waste = n * COST * pct;
      res.textContent = "₱" + (waste / 1e6).toFixed(1) + "M / yr";
    };
    team.addEventListener("input", calc);
    sel.addEventListener("change", calc);
    calc();
  }

  const yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
