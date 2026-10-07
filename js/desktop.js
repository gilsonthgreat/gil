(() => {
  const { site, el, span, icon, mobile } = GIL;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const taskbar = $(".taskbar");
  const icons = $("#icons");

  const WIDE = 1480; // enough room for profile, terminal and music side by side
  const PROFILE_WIDTH = 340; // matches style.css

  const wins = {};
  let topZ = 10;
  let active = null;
  let cascade = 0;

  // "about_me.txt" -> "about_me<wbr>.txt" so narrow icon labels break at the dot
  function iconLabel(title) {
    const dot = title.lastIndexOf(".");
    if (dot < 1) return [title];
    return [title.slice(0, dot), el("wbr"), title.slice(dot)];
  }

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
    const left = icons.getBoundingClientRect().right + 12;
    const terminalLeft = left + PROFILE_WIDTH + 24;
    let x;
    let y;
    if (w.id === "profile") {
      x = left;
      y = 28;
    } else if (w.id === "terminal") {
      const room = vw - terminalLeft - (wide ? 360 + 56 : 24);
      const width = Math.round(Math.min(700, Math.max(420, room)));
      w.el.style.width = `${width}px`;
      w.el.style.height = `${Math.round(Math.max(280, Math.min(520, vh - 76)))}px`;
      x = Math.min(terminalLeft, vw - width - 16);
      y = 52;
    } else if (w.id === "music") {
      x = vw - w.el.offsetWidth - 28;
      y = wide ? 28 : vh - w.el.offsetHeight - 20;
    } else if (w.id === "sysmon" && wide) {
      x = vw - w.el.offsetWidth - 28;
      y = wins.music.y + wins.music.el.offsetHeight + 16;
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
    if (wasHidden) document.dispatchEvent(new CustomEvent("window:open", { detail: { id } }));
    if (quiet) return;
    if (mobile.matches) w.el.scrollIntoView({ behavior: GIL.reduceMotion ? "auto" : "smooth", block: "start" });
    else if (id === "terminal") GIL.terminal.focus();
  }

  function hide(id, state) {
    const w = wins[id];
    if (w.state === "closed" || w.state === state) return;
    const wasOpen = w.state === "open";
    w.state = state;
    w.el.hidden = true;
    w.el.classList.remove("is-active");
    if (active === id) active = null;
    if (id === "music" && state === "closed") GIL.music.stop();
    renderTasks();
    focusTopmost();
    if (wasOpen) document.dispatchEvent(new CustomEvent("window:hide", { detail: { id } }));
  }

  const close = (id) => hide(id, "closed");
  const minimize = (id) => hide(id, "minimized");
  const isOpen = (id) => wins[id].state === "open";

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

  // right edge, bottom edge and the corner grip; sizes are kept on screen and above each window's CSS minimum
  function enableResize(w) {
    for (const handle of $$(".resize", w.el)) {
      handle.addEventListener("pointerdown", (e) => {
        if (mobile.matches || e.button !== 0) return;
        e.preventDefault();
        focus(w.id);
        const edge = handle.dataset.edge;
        const start = { x: e.clientX, y: e.clientY, width: w.el.offsetWidth, height: w.el.offsetHeight };
        const css = getComputedStyle(w.el);
        const minWidth = Math.max(240, parseFloat(css.minWidth) || 0);
        const minHeight = Math.max(140, parseFloat(css.minHeight) || 0);
        const clamp = (v, min, max) => Math.max(min, Math.min(v, Math.max(min, max)));
        handle.setPointerCapture(e.pointerId);
        document.documentElement.classList.add("is-dragging");
        const onMove = (ev) => {
          const { vw, vh } = viewport();
          if (edge !== "s") w.el.style.width = `${clamp(start.width + ev.clientX - start.x, minWidth, vw - w.x - 8)}px`;
          if (edge !== "e")
            w.el.style.height = `${clamp(start.height + ev.clientY - start.y, minHeight, vh - w.y - 8)}px`;
        };
        const onEnd = () => {
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", onEnd);
          handle.removeEventListener("pointercancel", onEnd);
          document.documentElement.classList.remove("is-dragging");
        };
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onEnd);
        handle.addEventListener("pointercancel", onEnd);
      });
    }
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

  // title bars, desktop icons, start menu entries and taskbar buttons all come from the
  // data-title / data-icon attributes on each window
  for (const node of $$(".window")) {
    const { app: id, title, icon: iconId, heading } = node.dataset;
    const titleId = `t-${id}`;
    node.setAttribute("aria-labelledby", titleId);
    node.prepend(
      el("header", { class: "titlebar" }, [
        icon(iconId),
        el("h2", { class: "titlebar-title", id: titleId, "data-tpl": heading, text: title }),
        el("div", { class: "titlebar-btns" }, [
          el("button", { type: "button", class: "tb tb-min", "aria-label": `minimize ${title}` }, [icon("i-min")]),
          el("button", { type: "button", class: "tb tb-close", "aria-label": `close ${title}` }, [icon("i-close")]),
        ]),
      ]),
    );
    for (const edge of ["e", "s", "se"]) {
      node.append(el("span", { class: `resize resize-${edge}`, "data-edge": edge, "aria-hidden": "true" }));
    }
    icons.append(
      el("button", { type: "button", class: "icon", "data-open": id }, [
        el("span", { class: "icon-tile" }, [icon(iconId)]),
        el("span", { class: "icon-label" }, iconLabel(title)),
      ]),
    );
    $("#start-apps").append(el("button", { type: "button", "data-open": id }, [icon(iconId), title]));

    const w = { id, el: node, state: "closed", placed: false, x: 0, y: 0 };
    w.task = el("button", { type: "button", class: "task", title, hidden: true }, [icon(iconId), span(title)]);
    w.task.addEventListener("click", () => (w.state === "open" && active === id ? minimize(id) : open(id)));
    $("#tasks").append(w.task);
    $(".tb-min", node).addEventListener("click", () => minimize(id));
    $(".tb-close", node).addEventListener("click", () => close(id));
    node.addEventListener("pointerdown", () => focus(id));
    node.addEventListener("focusin", () => focus(id));
    enableDrag(w);
    enableResize(w);
    wins[id] = w;
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

  const petsToggle = $("#pets-toggle");
  function renderPetsToggle() {
    $("span", petsToggle).textContent = GIL.critters.enabled() ? "hide pets" : "show pets";
  }
  petsToggle.addEventListener("click", () => {
    GIL.critters.setEnabled(!GIL.critters.enabled());
    renderPetsToggle();
  });

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
    const wide = window.innerWidth >= WIDE;
    // on medium screens music overlaps the terminal, so open it last to keep its play button on top
    const order = wide || mobile.matches ? ["profile", "music", "terminal"] : ["profile", "terminal", "music"];
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
      [[`${site.osName} 2.0 · tty1`, "dim"]],
      [],
      ok("loaded theme: purple gradient"),
      ok(`mounted /home/${site.name}`),
      ok(`started ${site.name}sh`),
      ok("started music.exe"),
      ok(`woke up the habitat: ${ANIMALS.length} animals`),
      ok("taught the chess bot the rules"),
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
        timer = setTimeout(step, 80 + Math.random() * 80);
      } else {
        timer = setTimeout(finish, 650);
      }
    };
    screen.addEventListener("click", finish);
    window.addEventListener("keydown", finish);
    step();
  }

  // where the open windows are, for animals to stand on top of or hang underneath
  const rects = () =>
    mobile.matches
      ? []
      : Object.values(wins)
          .filter((w) => w.state === "open" && w.placed)
          .map((w) => ({ id: w.id, x: w.x, y: w.y, width: w.el.offsetWidth, height: w.el.offsetHeight }));

  GIL.desktop = { open, close, isOpen, rects };

  tick();
  setInterval(tick, 1000);
  // boot after every script has loaded, since start() calls into the terminal and pets
  document.addEventListener("DOMContentLoaded", () => {
    renderPetsToggle();
    boot();
  });
})();
