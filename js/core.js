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
    formatUptime,
  };
})();
