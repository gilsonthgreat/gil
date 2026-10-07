(() => {
  const { site, el, span } = GIL;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const mobile = matchMedia("(max-width: 760px)"); // same breakpoint as style.css
  const taskbar = $(".taskbar");

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

  // Each row is the content of one line. The terminal's `cat` prints the same rows.
  function aboutRows() {
    const rows = [[span("# about_me.txt", "e-h")], []];
    for (const [key, value] of site.about) {
      rows.push([el("span", { class: "e-kv" }, [span(key, "e-k"), span(value, "e-v")])]);
    }
    for (const paragraph of site.aboutText) rows.push([], [span(paragraph, "e-p")]);
    return rows;
  }

  function dniRows() {
    const rows = [[span("# dni.txt", "e-h")], []];
    if (site.dniIntro) rows.push([span(site.dniIntro, "e-p")]);
    for (const item of site.dni) rows.push([span(item, "e-li")]);
    if (site.dniOutro) rows.push([], [span(site.dniOutro, "e-dim")]);
    return rows;
  }

  GIL.files = { "about_me.txt": aboutRows, "dni.txt": dniRows };

  function renderFile(id, rows) {
    $(`#${id}-lines`).replaceChildren(...rows.map((row) => el("li", {}, row)));
    $(`#${id}-count`).textContent = `${rows.length} lines`;
  }

  function fillContent() {
    document.title = site.osName;
    for (const node of $$("[data-tpl]")) {
      node.textContent = node.dataset.tpl.replace(/\{(\w+)\}/g, (_, key) => site[key]);
    }
    $("#avatar").alt = `${site.name}'s profile picture`;
    $(".boot-logo").textContent = GIL.logo;
    $(".js-year").textContent = new Date().getFullYear();
    renderFile("about", aboutRows());
    renderFile("dni", dniRows());

    if (site.links.length) {
      const box = $("#profile-links");
      box.replaceChildren(
        ...site.links.map((link) =>
          el("a", { class: "chip", href: link.url, target: "_blank", rel: "noopener" }, [
            svgIcon("i-link"),
            span(link.label),
          ]),
        ),
      );
      box.hidden = false;
    }
  }

  // Window layout. Widths come from style.css: profile 340px, music 360px.
  const ICONS_RIGHT = 112;
  const TERMINAL_LEFT = ICONS_RIGHT + 340 + 24;
  const WIDE = 1480; // enough room for profile, terminal and music side by side

  const wins = {};
  let topZ = 10;
  let active = null;
  let cascade = 0;

  function viewport() {
    return { vw: window.innerWidth, vh: window.innerHeight - taskbar.offsetHeight };
  }

  // keeps 96px of the window, and its title bar, on screen so it can always be dragged back
  function move(w, x, y) {
    const { vw, vh } = viewport();
    w.x = Math.round(Math.min(Math.max(x, 96 - w.el.offsetWidth), vw - 96));
    w.y = Math.round(Math.min(Math.max(y, 0), vh - 40));
    w.el.style.left = `${w.x}px`;
    w.el.style.top = `${w.y}px`;
  }

  function place(w) {
    const { vw, vh } = viewport();
    const wide = vw >= WIDE;
    let x;
    let y;
    if (w.id === "profile") {
      x = ICONS_RIGHT;
      y = 28;
    } else if (w.id === "terminal") {
      const room = vw - TERMINAL_LEFT - (wide ? 360 + 56 : 24);
      const width = Math.round(Math.min(700, Math.max(420, room)));
      w.el.style.width = `${width}px`;
      w.el.style.height = `${Math.round(Math.max(280, Math.min(520, vh - 76)))}px`;
      x = Math.min(TERMINAL_LEFT, vw - width - 16);
      y = 52;
    } else if (w.id === "music") {
      x = vw - w.el.offsetWidth - 28;
      y = wide ? 28 : vh - w.el.offsetHeight - 20;
    } else {
      // step down by about a title bar so the window underneath can still be grabbed
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
    if (w.state !== "open" || active === id) return;
    w.el.style.zIndex = ++topZ;
    active = id;
    for (const node of $$(".window.is-active")) node.classList.remove("is-active");
    w.el.classList.add("is-active");
    renderTasks();
  }

  function focusTopmost() {
    const open = Object.values(wins).filter((w) => w.state === "open");
    open.sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex));
    if (open.length) focus(open[0].id);
  }

  // `quiet` is for the windows opened at boot: no scrolling to them on phones, no stealing focus
  function open(id, { quiet = false } = {}) {
    const w = wins[id];
    const wasHidden = w.state !== "open";
    w.state = "open";
    w.el.hidden = false;
    if (!w.placed && !mobile.matches) place(w);
    if (wasHidden && !GIL.reduceMotion) {
      w.el.classList.remove("pop");
      void w.el.offsetWidth; // restart the animation
      w.el.classList.add("pop");
    }
    focus(id);
    if (quiet) return;
    if (mobile.matches) w.el.scrollIntoView({ behavior: GIL.reduceMotion ? "auto" : "smooth", block: "start" });
    else if (id === "terminal") GIL.terminal.focus();
  }

  function hide(id, state) {
    const w = wins[id];
    if (w.state === "closed" || w.state === state) return;
    w.state = state;
    w.el.hidden = true;
    w.el.classList.remove("is-active");
    if (active === id) active = null;
    if (id === "music" && state === "closed") GIL.music.stop();
    renderTasks();
    focusTopmost();
  }

  const close = (id) => hide(id, "closed");
  const minimize = (id) => hide(id, "minimized");

  function enableDrag(w) {
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
      const onEnd = () => {
        bar.removeEventListener("pointermove", onMove);
        bar.removeEventListener("pointerup", onEnd);
        bar.removeEventListener("pointercancel", onEnd);
        document.documentElement.classList.remove("is-dragging");
      };
      bar.addEventListener("pointermove", onMove);
      bar.addEventListener("pointerup", onEnd);
      bar.addEventListener("pointercancel", onEnd);
    });
  }

  function renderTasks() {
    for (const w of Object.values(wins)) {
      const current = w.state === "open" && active === w.id;
      w.task.hidden = w.state === "closed";
      w.task.classList.toggle("is-active", current);
      w.task.classList.toggle("is-min", w.state === "minimized");
      w.task.setAttribute("aria-pressed", String(current));
    }
  }

  for (const node of $$(".window")) {
    const w = { id: node.dataset.app, el: node, state: "closed", placed: false, x: 0, y: 0 };
    const { title, icon } = node.dataset;
    w.task = el("button", { type: "button", class: "task", title, hidden: true }, [svgIcon(icon), span(title)]);
    w.task.addEventListener("click", () => (w.state === "open" && active === w.id ? minimize(w.id) : open(w.id)));
    $("#tasks").append(w.task);
    $(".tb-min", node).addEventListener("click", () => minimize(w.id));
    $(".tb-close", node).addEventListener("click", () => close(w.id));
    node.addEventListener("pointerdown", () => focus(w.id));
    node.addEventListener("focusin", () => focus(w.id));
    enableDrag(w);
    wins[w.id] = w;
  }

  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) open(opener.dataset.open);
  });

  // windows first opened on a phone have no desktop position yet
  mobile.addEventListener("change", () => {
    if (mobile.matches) return;
    for (const w of Object.values(wins)) if (w.state === "open" && !w.placed) place(w);
  });

  window.addEventListener("resize", () => {
    if (mobile.matches) return;
    for (const w of Object.values(wins)) if (w.state === "open" && w.placed) move(w, w.x, w.y);
  });

  const startButton = $("#start-btn");
  const startMenu = $("#start-menu");

  function toggleStartMenu(show) {
    startMenu.hidden = !show;
    startButton.setAttribute("aria-expanded", String(show));
    if (show) $("button", startMenu).focus({ preventScroll: true });
  }

  startButton.addEventListener("click", () => toggleStartMenu(startMenu.hidden));
  startMenu.addEventListener("click", (e) => {
    if (e.target.closest("button")) toggleStartMenu(false);
  });
  document.addEventListener("pointerdown", (e) => {
    if (!startMenu.hidden && !e.target.closest("#start-menu, #start-btn")) toggleStartMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !startMenu.hidden) {
      toggleStartMenu(false);
      startButton.focus();
    }
  });
  $("#reboot").addEventListener("click", () => location.reload());

  const tray = $("#tray-music");
  tray.addEventListener("click", () => open("music"));
  document.addEventListener("music:change", (e) => {
    const { state, title } = e.detail;
    const label = title || "music";
    tray.hidden = state === "error";
    $(".t", tray).textContent = label;
    tray.title = `${label} (${state})`;
    tray.setAttribute("aria-label", `${label}, ${state}. open music.exe`);
  });

  function formatClock(ms) {
    const s = Math.floor(ms / 1000);
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, "0")).join(":");
  }

  function tick() {
    const now = new Date();
    const up = now - GIL.bootTime;
    $("#clock-time").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $("#clock-date").textContent = now.toLocaleDateString([], { month: "short", day: "numeric" });
    for (const node of $$(".js-uptime")) node.textContent = formatClock(up);
    for (const node of $$(".js-uptime-long")) node.textContent = GIL.formatUptime(up);
  }

  function start() {
    // on medium screens music overlaps the terminal, so open it last to keep its play button on top
    const order =
      window.innerWidth >= WIDE || mobile.matches ? ["profile", "music", "terminal"] : ["profile", "terminal", "music"];
    for (const id of order) open(id, { quiet: true });
    const hash = location.hash.slice(1);
    if (Object.hasOwn(wins, hash)) open(hash);
    GIL.terminal.start();
  }

  function boot() {
    const screen = $("#boot");
    if (GIL.reduceMotion) {
      screen.remove();
      return start();
    }
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
    const log = $("#boot-log");
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
        log.append(
          el(
            "div",
            {},
            lines[i++].map(([text, className]) => span(text, className)),
          ),
        );
        timer = setTimeout(step, 90 + Math.random() * 90);
      } else {
        timer = setTimeout(finish, 700);
      }
    };
    screen.addEventListener("click", finish);
    window.addEventListener("keydown", finish);
    step();
  }

  GIL.desktop = { open, close };

  fillContent();
  tick();
  setInterval(tick, 1000);
  boot();
})();
