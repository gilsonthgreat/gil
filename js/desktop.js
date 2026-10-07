/* desktop: content from config.js, windows, taskbar, start menu and the boot screen */
(() => {
  const { site, el, util, emit, on, reduceMotion } = GIL;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const mobile = matchMedia("(max-width: 760px)");

  /* ---------- content ---------- */
  function fillContent() {
    document.title = site.osName;
    $$("[data-tpl]").forEach((node) => {
      node.textContent = node.dataset.tpl.replace(/\{(\w+)\}/g, (_, key) => site[key] ?? "");
    });
    $$("img[data-avatar]").forEach((img) => {
      if (site.avatar) img.src = site.avatar;
    });
    const avatar = $("#avatar");
    if (avatar) avatar.alt = `${site.name}'s profile picture`;
    const bootLogo = $(".boot-logo");
    if (bootLogo) bootLogo.textContent = GIL.logo;
    $$(".js-year").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });

    renderEditor("about", aboutRows());
    renderEditor("dni", dniRows());

    const links = site.links || [];
    const box = $("#profile-links");
    if (box && links.length) {
      box.replaceChildren(
        ...links.map((link) =>
          el("a", { class: "chip", href: link.url, target: "_blank", rel: "noopener" }, [svgIcon("i-link"), el("span", { text: link.label })]),
        ),
      );
      box.hidden = false;
    }

    $$(".viz span").forEach((bar, i) => {
      bar.style.setProperty("--d", `${0.55 + ((i * 37) % 9) / 14}s`);
      bar.style.setProperty("--delay", `${-((i * 53) % 11) / 10}s`);
      bar.style.setProperty("--peak", `${0.45 + ((i * 29) % 11) / 20}`);
    });
  }

  const span = (cls, text) => el("span", { class: cls, text });

  function aboutRows() {
    const rows = [[span("e-h", "# about_me.txt")], []];
    for (const [key, value] of site.about || []) rows.push([el("span", { class: "e-kv" }, [span("e-k", key), span("e-v", value)])]);
    for (const paragraph of [].concat(site.aboutText || [])) rows.push([], [span("e-p", paragraph)]);
    return rows;
  }

  function dniRows() {
    const rows = [[span("e-h", "# dni.txt")], []];
    if (site.dniIntro) rows.push([span("e-p", site.dniIntro)]);
    for (const item of site.dni || []) rows.push([span("e-li", item)]);
    if (site.dniOutro) rows.push([], [span("e-dim", site.dniOutro)]);
    return rows;
  }

  function renderEditor(id, rows) {
    const list = $(`#${id}-lines`);
    if (!list) return;
    list.replaceChildren(...rows.map((row) => el("li", {}, row)));
    const count = $(`#${id}-count`);
    if (count) count.textContent = `${rows.length} lines`;
  }

  GIL.files = { "about_me.txt": aboutRows, "dni.txt": dniRows };

  function svgIcon(id) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "ico");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(ns, "use");
    use.setAttribute("href", `#${id}`);
    svg.append(use);
    return svg;
  }

  /* ---------- windows ---------- */
  const wins = {};
  let z = 10;
  let active = null;
  let cascade = 0;

  function viewport() {
    const bar = $(".taskbar");
    return { vw: window.innerWidth, vh: window.innerHeight - (bar ? bar.offsetHeight : 46) };
  }

  function move(w, x, y) {
    const { vw, vh } = viewport();
    const width = w.el.offsetWidth;
    w.x = Math.round(Math.min(Math.max(x, 96 - width), vw - 96));
    w.y = Math.round(Math.min(Math.max(y, 0), vh - 40));
    w.el.style.left = `${w.x}px`;
    w.el.style.top = `${w.y}px`;
  }

  // first-open position. wide screens get three columns; smaller ones overlap like a real desktop
  function place(w) {
    const { vw, vh } = viewport();
    const wide = vw >= 1480;
    const left = 112;
    let x;
    let y;
    if (w.id === "terminal") {
      const reserve = wide ? 416 : 24;
      const width = Math.round(Math.min(700, Math.max(420, vw - left - 364 - reserve)));
      w.el.style.width = `${width}px`;
      x = Math.min(left + 364, vw - width - 16);
      y = 52;
      w.el.style.height = `${Math.round(Math.max(280, Math.min(520, vh - y - 24)))}px`;
    } else if (w.id === "profile") {
      x = left;
      y = 28;
    } else if (w.id === "music") {
      x = vw - w.el.offsetWidth - 28;
      y = wide ? 28 : vh - w.el.offsetHeight - 20;
    } else {
      // stagger by a title bar's height so earlier windows stay grabbable
      const n = cascade++ % 6;
      x = (vw - w.el.offsetWidth) / 2 + n * 30 - 30;
      y = 48 + n * 40;
    }
    x = Math.max(8, Math.min(x, vw - w.el.offsetWidth - 8));
    y = Math.max(8, Math.min(y, vh - w.el.offsetHeight - 8));
    move(w, x, y);
    w.placed = true;
  }

  function focus(id) {
    const w = wins[id];
    if (!w || w.state !== "open" || active === id) return;
    w.el.style.zIndex = ++z;
    active = id;
    $$(".window.is-active").forEach((node) => node.classList.remove("is-active"));
    w.el.classList.add("is-active");
    renderTasks();
    emit("window:focus", { id });
  }

  function focusTopmost() {
    const open = Object.values(wins).filter((w) => w.state === "open");
    open.sort((a, b) => (Number(b.el.style.zIndex) || 0) - (Number(a.el.style.zIndex) || 0));
    if (open[0]) focus(open[0].id);
  }

  function open(id, { quiet = false } = {}) {
    const w = wins[id];
    if (!w) return false;
    const wasShut = w.state !== "open";
    w.el.hidden = false;
    w.state = "open";
    if (!w.placed && !mobile.matches) place(w);
    if (wasShut && !reduceMotion) {
      w.el.classList.remove("pop");
      void w.el.offsetWidth;
      w.el.classList.add("pop");
    }
    active = null;
    focus(id);
    if (mobile.matches && !quiet) w.el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    emit("window:open", { id, quiet });
    return true;
  }

  function hide(id, state) {
    const w = wins[id];
    if (!w || w.state === state || w.state === "closed") return false;
    w.state = state;
    w.el.hidden = true;
    w.el.classList.remove("is-active");
    if (active === id) active = null;
    if (id === "music" && state === "closed" && GIL.music) GIL.music.stop();
    renderTasks();
    focusTopmost();
    emit(`window:${state === "closed" ? "close" : "min"}`, { id });
    return true;
  }
  const close = (id) => hide(id, "closed");
  const minimize = (id) => hide(id, "min");

  function drag(w) {
    const bar = $(".titlebar", w.el);
    bar.addEventListener("pointerdown", (e) => {
      if (mobile.matches || e.button !== 0 || e.target.closest("button")) return;
      e.preventDefault();
      focus(w.id);
      const dx = e.clientX - w.x;
      const dy = e.clientY - w.y;
      bar.setPointerCapture(e.pointerId);
      document.documentElement.classList.add("is-dragging");
      const onMove = (ev) => move(w, ev.clientX - dx, ev.clientY - dy);
      const onUp = () => {
        bar.removeEventListener("pointermove", onMove);
        bar.removeEventListener("pointerup", onUp);
        bar.removeEventListener("pointercancel", onUp);
        document.documentElement.classList.remove("is-dragging");
      };
      bar.addEventListener("pointermove", onMove);
      bar.addEventListener("pointerup", onUp);
      bar.addEventListener("pointercancel", onUp);
    });
  }

  /* ---------- taskbar ---------- */
  function makeTask(w) {
    const button = el("button", { type: "button", class: "task", title: w.title, hidden: true }, [svgIcon(w.icon), el("span", { text: w.title })]);
    button.addEventListener("click", () => (w.state === "open" && active === w.id ? minimize(w.id) : open(w.id)));
    $("#tasks").append(button);
    return button;
  }

  function renderTasks() {
    for (const w of Object.values(wins)) {
      const current = w.state === "open" && active === w.id;
      w.task.hidden = w.state === "closed";
      w.task.classList.toggle("is-active", current);
      w.task.classList.toggle("is-min", w.state === "min");
      w.task.setAttribute("aria-pressed", String(current));
    }
  }

  $$(".window").forEach((node) => {
    const w = { id: node.dataset.app, el: node, title: node.dataset.title, icon: node.dataset.icon, state: "closed", placed: false, x: 0, y: 0 };
    wins[w.id] = w;
    w.task = makeTask(w);
    $(".tb-min", node)?.addEventListener("click", () => minimize(w.id));
    $(".tb-close", node)?.addEventListener("click", () => close(w.id));
    node.addEventListener("pointerdown", () => focus(w.id));
    node.addEventListener("focusin", () => focus(w.id));
    drag(w);
  });

  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) open(opener.dataset.open);
  });

  mobile.addEventListener("change", () => {
    if (mobile.matches) return;
    Object.values(wins).forEach((w) => {
      if (w.state === "open" && !w.placed) place(w);
    });
  });

  window.addEventListener("resize", () => {
    if (mobile.matches) return;
    Object.values(wins).forEach((w) => {
      if (w.placed && w.state === "open") move(w, w.x, w.y);
    });
  });

  // start menu
  const startBtn = $("#start-btn");
  const startMenu = $("#start-menu");
  function setStart(show) {
    startMenu.hidden = !show;
    startBtn.setAttribute("aria-expanded", String(show));
    if (show) $("button", startMenu)?.focus({ preventScroll: true });
  }
  startBtn.addEventListener("click", () => setStart(startMenu.hidden));
  startMenu.addEventListener("click", (e) => {
    if (e.target.closest("button")) setStart(false);
  });
  document.addEventListener("pointerdown", (e) => {
    if (!startMenu.hidden && !e.target.closest("#start-menu, #start-btn")) setStart(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !startMenu.hidden) {
      setStart(false);
      startBtn.focus();
    }
  });
  $("#reboot").addEventListener("click", () => window.location.reload());

  // now playing in the tray
  const tray = $("#tray-music");
  tray.addEventListener("click", () => open("music"));
  on("music:change", (m) => {
    tray.hidden = m.state === "error";
    $(".t", tray).textContent = m.title || "music";
    tray.title = `${m.title || "music"} (${m.state})`;
    tray.setAttribute("aria-label", `${m.title || "music"}, ${m.state}. open music.exe`);
  });

  // clock and uptime
  function tick() {
    const now = new Date();
    $("#clock-time").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $("#clock-date").textContent = now.toLocaleDateString([], { month: "short", day: "numeric" });
    const up = Date.now() - GIL.bootTime;
    $$(".js-uptime").forEach((node) => {
      node.textContent = util.clock(up);
    });
    $$(".js-uptime-long").forEach((node) => {
      node.textContent = util.uptime(up);
    });
  }

  // music starts on the visitor's first click or key press (browsers block sound before that)
  function armAutoplay() {
    if (!site.music || !site.music.playOnFirstClick) return;
    const handler = (e) => {
      if (e.type === "keydown" && (e.key === "Escape" || e.key === "Tab" || e.ctrlKey || e.metaKey || e.altKey)) return;
      off();
      if (e.target instanceof Element && e.target.closest('[data-app="music"], #tray-music')) return;
      if (GIL.music) GIL.music.play();
    };
    const off = () => {
      window.removeEventListener("click", handler, true);
      window.removeEventListener("keydown", handler, true);
    };
    window.addEventListener("click", handler, true);
    window.addEventListener("keydown", handler, true);
  }

  /* ---------- boot ---------- */
  function start() {
    const wide = window.innerWidth >= 1480;
    const order = wide || mobile.matches ? ["profile", "music", "terminal"] : ["profile", "terminal", "music"];
    order.forEach((id) => open(id, { quiet: true }));
    const hash = window.location.hash.slice(1);
    if (wins[hash]) open(hash);
    if (GIL.terminal) GIL.terminal.start();
  }

  function boot() {
    const screen = $("#boot");
    if (!screen) return start();
    if (reduceMotion) {
      screen.remove();
      return start();
    }
    const log = $("#boot-log");
    const ok = (text) => [["[  ok  ] ", "ok"], [text]];
    const lines = [
      [[`${site.osName} 1.0 · tty1`, "dim"]],
      [],
      ok("loaded theme: purple gradient"),
      ok(`mounted /home/${site.name}`),
      ok(`started ${site.name}sh`),
      ok("started music.exe"),
      ok(`loaded profile ${site.handle}`),
      ok("reached target: desktop"),
      [],
      [["welcome, visitor.", "hi"]],
    ];
    let i = 0;
    let timer = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener("keydown", finish);
      screen.classList.add("is-done");
      setTimeout(() => screen.remove(), 500);
      start();
    };
    const step = () => {
      if (i < lines.length) {
        log.append(el("div", {}, lines[i++].map(([text, cls]) => el("span", { class: cls, text }))));
        timer = setTimeout(step, 90 + Math.random() * 90);
      } else {
        timer = setTimeout(finish, 700);
      }
    };
    screen.addEventListener("click", finish);
    window.addEventListener("keydown", finish);
    step();
  }

  GIL.desktop = { open, close, minimize, focus };

  fillContent();
  tick();
  setInterval(tick, 1000);
  armAutoplay();
  boot();
})();
