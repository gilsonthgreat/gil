/* shared helpers for the gilOS scripts */
(() => {
  const site = window.SITE || {};
  site.name = site.name || "gil";
  site.handle = site.handle || `@${site.name}`;
  site.osName = site.osName || `${site.name}OS`;

  const pad2 = (n) => String(n).padStart(2, "0");
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // el("span", { class: "x", text: "hi" }, [child, "text"])
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of [].concat(children)) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : String(child));
    }
    return node;
  }

  const LOGO = [
    " ██████╗ ██╗██╗     ",
    "██╔════╝ ██║██║     ",
    "██║  ███╗██║██║     ",
    "██║   ██║██║██║     ",
    "╚██████╔╝██║███████╗",
    " ╚═════╝ ╚═╝╚══════╝",
  ].join("\n");

  window.GIL = {
    site,
    logo: site.asciiLogo || LOGO,
    bootTime: Date.now(),
    reduceMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    el,
    emit(name, detail) {
      document.dispatchEvent(new CustomEvent(name, { detail }));
    },
    on(name, fn) {
      document.addEventListener(name, (e) => fn(e.detail || {}));
    },
    util: {
      pad2,
      clock(ms) {
        const s = Math.floor(ms / 1000);
        return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`;
      },
      uptime(ms) {
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor(s / 60) % 60;
        if (h) return `${plural(h, "hour")}, ${plural(m, "min")}`;
        if (m) return `${plural(m, "min")}, ${plural(s % 60, "sec")}`;
        return plural(s, "sec");
      },
      mmss(sec) {
        const s = Math.max(0, Math.floor(sec || 0));
        return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
      },
    },
    store: {
      get(key, fallback) {
        try {
          const raw = localStorage.getItem(key);
          return raw === null ? fallback : JSON.parse(raw);
        } catch {
          return fallback;
        }
      },
      set(key, value) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          /* storage blocked (private window etc.): skip */
        }
      },
    },
  };
})();
