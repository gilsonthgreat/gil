(() => {
  if (!GIL.finePointer) return;

  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  const root = document.documentElement;
  const CLICKABLE = "a, button, select, label, [data-open], .titlebar, .square, #flappy-canvas";
  const pos = { x: -100, y: -100 };
  const trail = { x: -100, y: -100 };
  let frameId = 0;

  root.classList.add("custom-cursor");

  function follow() {
    // the ring eases toward the dot; with reduced motion it just sits on it
    const ease = GIL.reduceMotion ? 1 : 0.2;
    trail.x += (pos.x - trail.x) * ease;
    trail.y += (pos.y - trail.y) * ease;
    ring.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0)`;
    frameId = Math.abs(pos.x - trail.x) + Math.abs(pos.y - trail.y) > 0.3 ? requestAnimationFrame(follow) : 0;
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pos.x = e.clientX;
    pos.y = e.clientY;
    dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    root.classList.add("cursor-visible");
    root.classList.toggle("cursor-hover", Boolean(e.target.closest?.(CLICKABLE)));
    if (!frameId) frameId = requestAnimationFrame(follow);
  });

  // leaving the window, or moving onto the YouTube iframe (which draws its own cursor)
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget || e.relatedTarget.tagName === "IFRAME") root.classList.remove("cursor-visible");
  });
  window.addEventListener("pointerdown", () => root.classList.add("cursor-down"));
  window.addEventListener("pointerup", () => root.classList.remove("cursor-down"));
})();
