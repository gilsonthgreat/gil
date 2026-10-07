(() => {
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const live = $("#live");
  const reduce = () => root.classList.contains("reduce");
  const still = () => root.classList.contains("still");
  const behavior = () => (reduce() ? "auto" : "smooth");

  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // private windows can refuse storage; the setting just isn't remembered
      }
    },
  };

  function announce(text) {
    live.textContent = "";
    // a fresh text node each time so repeated messages are still read out
    requestAnimationFrame(() => (live.textContent = text));
  }

  /* ---- the two looks ---- */

  const LOOK_NAMES = { afro: "with his hair in an afro", down: "with his hair down" };

  function setLook(look, { initial = false } = {}) {
    if (!LOOK_NAMES[look]) return;
    const changed = root.dataset.look !== look;
    root.dataset.look = look;
    for (const input of $$(".beam input")) input.checked = input.value === look;
    for (const button of $$("[data-set-look]")) button.setAttribute("aria-pressed", button.dataset.setLook === look);
    if (initial || !changed) return;

    if (!reduce()) {
      for (const beam of $$(".beam")) {
        beam.classList.remove("is-tipping", "to-afro");
        void beam.offsetWidth; // restart the tip
        beam.classList.add("is-tipping");
        beam.classList.toggle("to-afro", look === "afro");
      }
    }
    announce(`Showing Rhada ${LOOK_NAMES[look]}.`);
    store.set("rhada:look", look);
    try {
      const url = new URL(location.href);
      if (look === "down") url.searchParams.set("look", "down");
      else url.searchParams.delete("look");
      history.replaceState(history.state, "", url);
    } catch {
      // some embeds don't allow touching the URL
    }
  }

  for (const input of $$(".beam input")) input.addEventListener("change", () => setLook(input.value));
  for (const beam of $$(".beam")) beam.addEventListener("animationend", () => beam.classList.remove("is-tipping"));
  for (const button of $$("[data-set-look]")) button.addEventListener("click", () => setLook(button.dataset.setLook));
  setLook(root.dataset.look, { initial: true });

  /* ---- where the reader is: header, spine, index, progress lines ---- */

  const hero = $("#top");
  const sections = $$("main > section"); // the hero included
  const spineLinks = $$(".spine a");
  const indexLinks = $$(".index-list a");
  const nowNum = $(".now-num");
  const nowLabel = $(".now-label");
  const nowReading = $(".now-reading");
  const readProgress = $(".read-progress");
  const spineFill = $(".spine-fill");
  const chapters = $(".chapters");
  const chaptersFill = $(".chapters-fill");

  function setCurrent(section) {
    const id = section.id;
    for (const link of [...spineLinks, ...indexLinks]) {
      if (link.hash === `#${id}`) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
    const active = spineLinks.findIndex((link) => link.hash === `#${id}`);
    spineFill.style.setProperty("--fill", active < 0 ? 0 : active / (spineLinks.length - 1));
    if (nowLabel.textContent === section.dataset.label) return;
    nowReading.classList.add("is-changing");
    setTimeout(() => {
      nowNum.textContent = section.dataset.num;
      nowLabel.textContent = section.dataset.label;
      nowReading.classList.remove("is-changing");
    }, 200);
  }

  const sectionWatcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) setCurrent(entry.target);
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  for (const section of sections) sectionWatcher.observe(section);

  let scrollQueued = false;
  function onScroll() {
    scrollQueued = false;
    const y = scrollY;
    root.classList.toggle("scrolled", y > 80);
    root.classList.toggle("spine-on", y > hero.offsetHeight * 0.4);
    const max = document.documentElement.scrollHeight - innerHeight;
    readProgress.style.setProperty("--p", max > 0 ? Math.min(1, y / max) : 0);
    // the history cord fills up to whatever has passed the middle of the screen
    const box = chapters.getBoundingClientRect();
    const p = (innerHeight / 2 - box.top) / box.height;
    chaptersFill.style.setProperty("--p", Math.max(0, Math.min(1, p)));
  }
  addEventListener(
    "scroll",
    () => {
      if (!scrollQueued) requestAnimationFrame(onScroll);
      scrollQueued = true;
    },
    { passive: true },
  );
  addEventListener("resize", onScroll, { passive: true });
  onScroll();

  const chapterWatcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.classList.toggle("is-current", entry.isIntersecting);
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );
  for (const chapter of $$(".chapter")) chapterWatcher.observe(chapter);

  /* ---- index dialog ---- */

  const index = $("#index");
  let opener = null;

  function openIndex(e) {
    opener = e.currentTarget;
    index.showModal();
  }

  $(".index-btn").addEventListener("click", openIndex);
  for (const button of $$("[data-open-index]")) button.addEventListener("click", openIndex);
  index.addEventListener("close", () => opener?.focus({ preventScroll: true }));

  function goTo(hash) {
    const target = $(hash);
    if (!target) return;
    target.scrollIntoView({ behavior: behavior(), block: "start" });
    const heading = target.id === "top" ? $("#hero-title") : $("h2", target);
    heading?.focus({ preventScroll: true });
    try {
      history.replaceState(history.state, "", hash);
    } catch {
      // embeds
    }
  }

  for (const link of indexLinks) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      opener = null;
      index.close();
      goTo(link.hash);
    });
  }

  for (const link of $$("[data-to-top]")) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      scrollTo({ top: 0, behavior: behavior() });
      $("#hero-title").focus({ preventScroll: true });
    });
  }

  /* ---- reveals and in-view flags (ambient loops only run where you're looking) ---- */

  const revealer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        revealer.unobserve(entry.target);
      }
    },
    { threshold: 0.15 },
  );
  for (const node of $$("[data-reveal]")) {
    const siblings = [...node.parentElement.children].filter((n) => n.hasAttribute("data-reveal"));
    node.style.setProperty("--i", Math.min(5, siblings.indexOf(node)));
    revealer.observe(node);
  }
  root.classList.add("reveal-ready");

  const viewWatcher = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle("in-view", entry.isIntersecting);
  });
  for (const section of sections) viewWatcher.observe(section);

  /* ---- the scales swing once when first seen, and whenever they're tipped ---- */

  const scales = $(".scales");
  const tipNote = $(".tip-note");

  function swing() {
    if (reduce()) return;
    scales.classList.remove("is-swinging");
    void scales.offsetWidth;
    scales.classList.add("is-swinging");
  }

  scales.addEventListener("animationend", (e) => {
    if (e.target === $$(".marker", scales).at(-1)) scales.classList.remove("is-swinging");
  });
  new IntersectionObserver(
    (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      swing();
    },
    { threshold: 0.5 },
  ).observe(scales);

  let tips = 0;
  const TIP_NOTES = [
    "Back to the middle.",
    "Back to the middle again.",
    "He always comes back to centre.",
    "You can keep trying.",
  ];
  $(".tip-btn").addEventListener("click", () => {
    swing();
    tipNote.textContent = TIP_NOTES[Math.min(tips++, TIP_NOTES.length - 1)];
  });

  /* ---- his planet, drawn once (and again on resize) by the same code as the intro ---- */

  const figure = $(".planet-figure");
  const planet = $(".planet-canvas");

  function drawPlanet() {
    const draw = window.Rhada?.drawPlanet;
    const size = figure.clientWidth;
    if (!draw || !size) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    planet.width = Math.round(size * dpr);
    planet.height = Math.round(size * dpr);
    const ctx = planet.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const scale = size / 440;
    ctx.scale(scale, scale);
    draw(ctx, 220, 220, 120, 1, { ring: true, moon: 0.6 });
    figure.classList.add("is-drawn");
  }

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawPlanet, 150);
  });
  matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener?.("change", drawPlanet);
  drawPlanet();

  /* ---- pointer parallax on the hero (mouse only, and only with motion on) ---- */

  const stage = $(".stage");
  if (matchMedia("(pointer: fine)").matches) {
    let queued = false;
    let px = 0;
    let py = 0;
    hero.addEventListener("pointermove", (e) => {
      if (reduce() || still()) return;
      px = (e.clientX / innerWidth) * 2 - 1;
      py = (e.clientY / innerHeight) * 2 - 1;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        stage.style.setProperty("--px", px.toFixed(3));
        stage.style.setProperty("--py", py.toFixed(3));
      });
    });
    hero.addEventListener("pointerleave", () => {
      stage.style.setProperty("--px", 0);
      stage.style.setProperty("--py", 0);
    });
  }

  /* ---- gold dust: the one continuous loop after the intro ---- */

  const dust = $(".dust");
  const dustCtx = dust.getContext("2d");
  let motes = [];
  let dustFrame = 0;
  let dustLast = 0;
  let dustW = 0;
  let dustH = 0;

  function sizeDust() {
    const phone = innerWidth < 640;
    const dpr = phone ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    dustW = innerWidth;
    dustH = innerHeight;
    dust.width = Math.round(dustW * dpr);
    dust.height = Math.round(dustH * dpr);
    dustCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = phone ? 28 : 60;
    motes = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * dustW,
      y: Math.random() * dustH,
      r: 0.6 + Math.random() * 1.2,
      rise: 4 + Math.random() * 8,
      wind: 1 + Math.random() * 3,
      speed: (0.2 + Math.random() * 0.4) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      glow: i % 8 === 0,
    }));
  }

  // a soft dot, drawn once and stamped for the brighter motes
  const glowSprite = document.createElement("canvas");
  glowSprite.width = glowSprite.height = 16;
  {
    const g = glowSprite.getContext("2d");
    const gradient = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, "rgba(246,231,193,0.9)");
    gradient.addColorStop(0.4, "rgba(230,201,143,0.35)");
    gradient.addColorStop(1, "rgba(230,201,143,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 16, 16);
  }

  function drawDust(t, dt) {
    dustCtx.clearRect(0, 0, dustW, dustH);
    dustCtx.fillStyle = "#e6c98f";
    for (const m of motes) {
      m.y -= m.rise * dt;
      m.x += m.wind * dt;
      if (m.y < -10) m.y = dustH + 10;
      if (m.x > dustW + 10) m.x = -10;
      const x = m.x + Math.sin(t * 0.5 + m.phase) * 6;
      const alpha = 0.15 + 0.45 * (0.5 + 0.5 * Math.sin(t * m.speed + m.phase));
      dustCtx.globalAlpha = alpha;
      if (m.glow) dustCtx.drawImage(glowSprite, x - 8, m.y - 8);
      else {
        dustCtx.beginPath();
        dustCtx.arc(x, m.y, m.r, 0, Math.PI * 2);
        dustCtx.fill();
      }
    }
    dustCtx.globalAlpha = 1;
  }

  function dustLoop(now) {
    dustFrame = requestAnimationFrame(dustLoop);
    if (now - dustLast < 33) return; // 30fps is plenty for drifting dust
    const dt = Math.min(0.1, (now - dustLast) / 1000);
    dustLast = now;
    drawDust(now / 1000, dt);
  }

  function startDust() {
    cancelAnimationFrame(dustFrame);
    if (!motes.length) sizeDust();
    if (reduce() || still()) {
      drawDust(0, 0); // one still frame
      return;
    }
    if (document.hidden || root.classList.contains("arriving")) return;
    dustLast = performance.now();
    dustFrame = requestAnimationFrame(dustLoop);
  }

  addEventListener("resize", () => {
    sizeDust();
    startDust();
  });
  document.addEventListener("visibilitychange", startDust);
  document.addEventListener("rhada:arrived", startDust);
  sizeDust();
  startDust();

  /* ---- ambient motion switch ---- */

  const stillButton = $(".still-btn");
  stillButton.setAttribute("aria-pressed", !still());
  stillButton.addEventListener("click", () => {
    const off = !still();
    root.classList.toggle("still", off);
    store.set("rhada:still", off ? "1" : "0");
    stillButton.setAttribute("aria-pressed", !off);
    announce(off ? "Ambient motion off." : "Ambient motion on.");
    startDust();
  });

  /* ---- replaying the arrival ---- */

  for (const button of $$("[data-replay]")) {
    button.addEventListener("click", () => {
      if (index.open) index.close();
      cancelAnimationFrame(dustFrame);
      window.Rhada?.arrival?.play();
    });
  }

  // with no intro this visit, the hero's entrance runs straight away
  if (!root.classList.contains("arriving")) root.classList.add("arrived");
})();
