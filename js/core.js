(() => {
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value === true ? "" : value);
    }
    node.append(...[].concat(children));
    return node;
  }

  function icon(id) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "ico");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(ns, "use");
    use.setAttribute("href", `#${id}`);
    svg.append(use);
    return svg;
  }

  // localStorage throws in some private windows; settings just aren't remembered there
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
      } catch {}
    },
  };

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor(s / 60) % 60;
    if (h) return `${plural(h, "hour")}, ${plural(m, "min")}`;
    if (m) return `${plural(m, "min")}, ${plural(s % 60, "sec")}`;
    return plural(s, "sec");
  }

  window.GIL = {
    site: window.SITE,
    bootTime: Date.now(),
    reduceMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    mobile: matchMedia("(max-width: 760px)"), // same breakpoint as style.css
    finePointer: matchMedia("(pointer: fine)").matches,
    logo: [
      " ██████╗ ██╗██╗     ",
      "██╔════╝ ██║██║     ",
      "██║  ███╗██║██║     ",
      "██║   ██║██║██║     ",
      "╚██████╔╝██║███████╗",
      " ╚═════╝ ╚═╝╚══════╝",
    ].join("\n"),
    el,
    span: (text, className) => el("span", { class: className, text }),
    icon,
    store,
    formatUptime,
  };
})();
