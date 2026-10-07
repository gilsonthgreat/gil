(() => {
  const { el, span } = GIL;
  const $ = (selector) => document.querySelector(selector);
  const card = $("#bio-card");
  const art = (animal) => `assets/animals/${animal.id}.svg`;

  // opens beside (x, y), nudged to stay on screen
  function showBio(animal, x, y) {
    $("#bio-img").src = art(animal);
    $("#bio-name").textContent = animal.name;
    $("#bio-latin").textContent = animal.latin;
    $("#bio-lives").textContent = animal.lives;
    $("#bio-eats").textContent = animal.eats;
    $("#bio-fact").textContent = animal.fact;
    card.hidden = false;
    const { width, height } = card.getBoundingClientRect();
    const left = x + 18 + width < window.innerWidth - 8 ? x + 18 : x - 18 - width;
    card.style.left = `${Math.max(8, left)}px`;
    card.style.top = `${Math.min(window.innerHeight - height - 8, Math.max(8, y - height / 2))}px`;
    card.classList.remove("pop");
    void card.offsetWidth; // restart the animation
    card.classList.add("pop");
  }

  function hideBio() {
    card.hidden = true;
  }

  // "Sea Otter", "sea-otter" and "otter" all find the otter
  function find(query) {
    const q = query.toLowerCase().trim().replace(/\s+/g, "-");
    if (!q) return undefined;
    return ANIMALS.find(
      (a) => a.id === q || a.name.replace(/\s+/g, "-") === q || a.name.endsWith(q.replace(/-/g, " ")),
    );
  }

  $("#bio-close").addEventListener("click", hideBio);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !card.hidden) hideBio();
  });
  document.addEventListener("pointerdown", (e) => {
    if (!card.hidden && !e.target.closest("#bio-card, .zoo-card")) hideBio();
  });

  $("#zoo-count").textContent = ANIMALS.length;
  $("#zoo-grid").replaceChildren(
    ...ANIMALS.map((animal) => {
      const button = el("button", { type: "button", class: "zoo-card" }, [
        el("img", { src: art(animal), alt: "", width: 40, height: 40, loading: "lazy" }),
        span(animal.name),
      ]);
      button.addEventListener("click", () => {
        const r = button.getBoundingClientRect();
        showBio(animal, r.right, r.top + r.height / 2);
      });
      return button;
    }),
  );

  GIL.zoo = { art, showBio, hideBio, find };
})();
