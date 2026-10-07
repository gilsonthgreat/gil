(() => {
  if (!GIL.finePointer) return;

  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  const root = document.documentElement;
  const CLICKABLE = "a, button, select, label, [data-open], .titlebar, .resize, .square, #flappy-canvas";
  const pos = { x: -100, y: -100 };
  const trail = { x: -100, y: -100 };
  let frameId = 0;

  root.classList.add("custom-cursor");

  // Position lives in `translate`, not `transform`, so the press effect (`scale` in style.css)
  // shrinks the dot in place instead of scaling its distance from the corner of the screen.
  const place = (node, x, y) => (node.style.translate = `${x}px ${y}px`);

  function follow() {
    // the ring eases toward the dot; with reduced motion it just sits on it
    const ease = GIL.reduceMotion ? 1 : 0.2;
    trail.x += (pos.x - trail.x) * ease;
    trail.y += (pos.y - trail.y) * ease;
    place(ring, trail.x, trail.y);
    frameId = Math.abs(pos.x - trail.x) + Math.abs(pos.y - trail.y) > 0.3 ? requestAnimationFrame(follow) : 0;
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pos.x = e.clientX;
    pos.y = e.clientY;
    place(dot, pos.x, pos.y);
    // coming back into the window: start the ring on the dot rather than sliding in from where it left
    if (!root.classList.contains("cursor-visible")) {
      trail.x = pos.x;
      trail.y = pos.y;
      place(ring, pos.x, pos.y);
    }
    root.classList.add("cursor-visible");
    root.classList.toggle("cursor-hover", Boolean(e.target.closest?.(CLICKABLE)));
    if (!frameId) frameId = requestAnimationFrame(follow);
  });

  // leaving the window, or moving onto the YouTube iframe (which draws its own cursor)
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget || e.relatedTarget.tagName === "IFRAME") root.classList.remove("cursor-visible");
  });

  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    root.classList.add("cursor-down");
    const ripple = GIL.el("span", { class: "cursor-ripple", "aria-hidden": "true" });
    place(ripple, e.clientX, e.clientY);
    ripple.addEventListener("animationend", () => ripple.remove());
    document.body.append(ripple);
  });
  window.addEventListener("pointerup", () => root.classList.remove("cursor-down"));
  window.addEventListener("blur", () => root.classList.remove("cursor-down"));
})();
