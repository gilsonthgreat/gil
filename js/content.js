(() => {
  const { site, el, span, icon } = GIL;
  const $ = (selector) => document.querySelector(selector);

  // Static, hand-written SVG; nothing from config.js goes into this markup.
  const FLAGS = {
    iceland: {
      label: "iceland",
      svg: `<svg viewBox="0 0 25 18"><rect width="25" height="18" fill="#02529c"/><path d="M7 0h4v18H7zM0 7h25v4H0z" fill="#fff"/><path d="M8 0h2v18H8zM0 8h25v2H0z" fill="#dc1e35"/></svg>`,
    },
    jamaica: {
      label: "jamaica",
      svg: `<svg viewBox="0 0 24 12"><rect width="24" height="12" fill="#000"/><path d="M0 0h24L12 6zM0 12h24L12 6z" fill="#009b3a"/><path d="M0 0l24 12M24 0L0 12" stroke="#fed100" stroke-width="2.2"/></svg>`,
    },
    native: {
      label: "native american",
      svg: `<svg viewBox="0 0 38 20"><path d="M3 18L15 2" stroke="#f3dfc1" stroke-width="1.2"/><path d="M15 2c-5 1.5-9 6-11 12l2.6 1.4C8 10 11 6 15 2z" fill="#b5562b"/><path d="M15 2c-2 4-4.5 8.5-8 12.5l1.6.9C11.5 11 13.6 6.5 15 2z" fill="#e08a4f"/><g transform="translate(18 4)"><rect width="19" height="12" fill="#b22234"/><path d="M0 1.4h19M0 3.7h19M0 6h19M0 8.3h19M0 10.6h19" stroke="#fff" stroke-width=".9"/><rect width="8" height="6.5" fill="#3c3b6e"/></g></svg>`,
    },
  };

  function flags() {
    return site.roots.map((key) => {
      const flag = el("span", { class: "flag", title: FLAGS[key].label, role: "img", "aria-label": FLAGS[key].label });
      flag.innerHTML = FLAGS[key].svg;
      return flag;
    });
  }

  const pair = (key, value) => [el("span", { class: "e-kv" }, [span(key, "e-k"), value])];

  // Each row is the content of one line. The terminal's `cat` prints the same rows.
  function aboutRows() {
    const rows = [
      [span("# about_me.txt", "e-h")],
      [],
      pair("name", span(site.name, "e-v")),
      pair("pronouns", span(site.pronouns, "e-v")),
      pair("age", span(site.age, "e-v")),
      pair("timezone", span(site.timezone, "e-v")),
      pair("roots", el("span", { class: "e-v e-flags" }, flags())),
    ];
    for (const [key, value] of site.about) rows.push(pair(key, span(value, "e-v")));
    rows.push([], [span("## likes", "e-h")]);
    for (const [key, value] of site.likes) rows.push(pair(key, span(value, "e-v")));
    for (const paragraph of site.aboutText) rows.push([], [span(paragraph, "e-p")]);
    return rows;
  }

  function dniRows() {
    return [[span("# dni.txt", "e-h")], [], ...site.dni.map((line) => [span(line, "e-p")])];
  }

  GIL.files = { "about_me.txt": aboutRows, "dni.txt": dniRows };

  function renderFile(id, rows) {
    $(`#${id}-lines`).replaceChildren(...rows.map((row) => el("li", {}, row)));
    $(`#${id}-count`).textContent = `${rows.length} lines`;
  }

  function renderFriends() {
    const names = [...site.shoutouts, "all my friends"];
    const ring = $("#carousel-ring");
    ring.style.setProperty("--count", names.length);
    ring.replaceChildren(
      ...names.map((name, i) =>
        el("span", { class: "carousel-card", style: `--i: ${i}` }, [icon("i-heart"), span(name)]),
      ),
    );
    $("#friends-list").replaceChildren(...site.shoutouts.map((name) => el("li", { text: name })));
  }

  function renderSkills() {
    $("#skill-list").replaceChildren(
      ...site.skills.map(([name, level]) =>
        el("li", { class: "skill" }, [
          span(name, "skill-name"),
          el(
            "span",
            { class: "skill-bar", role: "img", "aria-label": `${name}: ${level} out of 10` },
            Array.from({ length: 10 }, (_, i) =>
              el("span", { class: i < level ? "seg is-on" : "seg", style: `--i: ${i}` }),
            ),
          ),
          span(`${level}/10`, "skill-score"),
        ]),
      ),
    );
  }

  // replay the bar fill each time the window opens
  document.addEventListener("window:open", (e) => {
    if (e.detail.id !== "skills") return;
    const list = $("#skill-list");
    list.classList.remove("is-filled");
    void list.offsetWidth;
    list.classList.add("is-filled");
  });

  function setupGallery() {
    const img = $("#gallery-img");
    const caption = $("#gallery-caption");
    const dots = $("#gallery-dots");
    let index = 0;
    let timer = 0;

    function show(i) {
      index = (i + site.gallery.length) % site.gallery.length;
      const item = site.gallery[index];
      img.src = item.src;
      img.alt = item.caption || `gallery image ${index + 1}`;
      caption.textContent = item.caption || `${index + 1} / ${site.gallery.length}`;
      for (const [n, dot] of [...dots.children].entries()) dot.classList.toggle("is-on", n === index);
      img.classList.remove("flip");
      void img.offsetWidth;
      img.classList.add("flip");
    }

    function autoplay(on) {
      clearInterval(timer);
      if (on && !GIL.reduceMotion) timer = setInterval(() => show(index + 1), 6000);
    }

    dots.replaceChildren(
      ...site.gallery.map((_, i) => {
        const dot = el("button", { type: "button", class: "gallery-dot", "aria-label": `image ${i + 1}` });
        dot.addEventListener("click", () => show(i));
        return dot;
      }),
    );
    $("#gallery-prev").addEventListener("click", () => show(index - 1));
    $("#gallery-next").addEventListener("click", () => show(index + 1));
    document.addEventListener("window:open", (e) => e.detail.id === "gallery" && autoplay(true));
    document.addEventListener("window:hide", (e) => e.detail.id === "gallery" && autoplay(false));
    $(".gallery-stage").addEventListener("pointerenter", () => autoplay(false));
    $(".gallery-stage").addEventListener("pointerleave", () => autoplay(GIL.desktop.isOpen("gallery")));
    show(0);
  }

  function setupCardTilt() {
    const card = $("#profile-card");
    if (GIL.reduceMotion || !GIL.finePointer) return;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--rx", `${(0.5 - py) * 14}deg`);
      card.style.setProperty("--ry", `${(px - 0.5) * 18}deg`);
      card.style.setProperty("--gx", `${px * 100}%`);
      card.style.setProperty("--gy", `${py * 100}%`);
      card.classList.add("is-tilted");
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-tilted");
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  }

  document.title = site.osName;
  for (const node of document.querySelectorAll("[data-tpl]")) {
    node.textContent = node.dataset.tpl.replace(/\{(\w+)\}/g, (_, key) => site[key]);
  }
  $("#avatar").alt = `${site.name}'s profile picture`;
  $(".boot-logo").textContent = GIL.logo;
  $(".js-year").textContent = new Date().getFullYear();
  $("#profile-roots").replaceChildren(...flags());
  renderFile("about", aboutRows());
  renderFile("dni", dniRows());
  renderFriends();
  renderSkills();
  setupGallery();
  setupCardTilt();

  if (site.links.length) {
    const box = $("#profile-links");
    box.replaceChildren(
      ...site.links.map((link) =>
        el("a", { class: "chip", href: link.url, target: "_blank", rel: "noopener" }, [
          icon("i-link"),
          span(link.label),
        ]),
      ),
    );
    box.hidden = false;
  }
})();
