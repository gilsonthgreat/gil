(() => {
  const { site, el, reduceMotion } = GIL;
  const box = document.getElementById("visits");
  const digits = document.getElementById("visits-digits");
  const SESSION_KEY = "gilos-counted";

  function show(total) {
    const text = String(total).padStart(6, "0");
    digits.replaceChildren(...[...text].map((d) => el("span", { class: "visits-digit", text: d })));
    box.setAttribute("aria-label", `${total} visits`);
    box.hidden = false;
    if (reduceMotion) return;
    // roll the digits into place like an odometer, the rightmost spinning fastest
    const cells = [...digits.children];
    const start = performance.now();
    const roll = (now) => {
      const k = Math.min(1, (now - start) / 1400);
      const eased = 1 - (1 - k) ** 3;
      cells.forEach((cell, i) => {
        const turns = (i + 1) * 2;
        cell.textContent = Math.round(eased * (Number(text[i]) + turns * 10)) % 10;
      });
      if (k < 1) requestAnimationFrame(roll);
      else cells.forEach((cell, i) => (cell.textContent = text[i]));
    };
    requestAnimationFrame(roll);
  }

  async function load() {
    // each visit counts once: reloading, or coming back to the tab later in the same session, only reads the total.
    // working on the site locally doesn't count at all
    let counted = false;
    try {
      counted = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {}
    const local = ["localhost", "127.0.0.1", ""].includes(location.hostname);
    const count = !counted && !local;
    try {
      const res = await fetch(count ? site.visits.hit : site.visits.get);
      if (!res.ok) return;
      const data = await res.json();
      const total = Number(data.value ?? data.count);
      if (!Number.isFinite(total)) return;
      if (count) {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {}
      }
      show(total);
    } catch {
      // the counter service is down or blocked; the counter just stays hidden
    }
  }

  if (site.visits) load();
})();
