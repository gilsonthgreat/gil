/* starfield behind the desktop: drifting, twinkling stars and the odd shooting star */
(() => {
  const canvas = document.getElementById("stars");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const still = GIL.reduceMotion;
  const tints = ["255,255,255", "236,228,255", "201,162,255", "228,108,243", "160,158,255"];

  let w = 0;
  let h = 0;
  let stars = [];
  let comet = null;
  let raf = 0;
  let last = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round((w * h) / 4200);
    stars = Array.from({ length: count }, () => {
      const big = Math.random() < 0.08;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: big ? 1.1 + Math.random() * 0.9 : 0.25 + Math.random() * 0.85,
        alpha: 0.3 + Math.random() * 0.6,
        speed: 0.4 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        drift: (0.15 + Math.random() * 0.5) * (big ? 0.012 : 0.006),
        tint: tints[Math.floor(Math.random() * (big ? tints.length : 3))],
        big,
      };
    });
    if (still) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const twinkle = still ? 1 : 0.6 + 0.4 * Math.sin(t * 0.001 * s.speed + s.phase);
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillStyle = `rgb(${s.tint})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.big) {
        ctx.globalAlpha = s.alpha * twinkle * 0.18;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (comet) {
      const tailX = comet.x - comet.vx * 16;
      const tailY = comet.y - comet.vy * 16;
      const grad = ctx.createLinearGradient(comet.x, comet.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255,255,255,${comet.life})`);
      grad.addColorStop(1, "rgba(201,162,255,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(comet.x, comet.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    const dt = Math.min(64, t - last || 16);
    last = t;
    for (const s of stars) {
      s.x -= s.drift * dt;
      if (s.x < -4) s.x = w + 4;
    }
    if (!comet && Math.random() < dt / 9000) {
      comet = { x: w * (0.3 + Math.random() * 0.7), y: Math.random() * h * 0.4, vx: -6 - Math.random() * 4, vy: 2.5 + Math.random() * 2, life: 1 };
    }
    if (comet) {
      comet.x += comet.vx * (dt / 16);
      comet.y += comet.vy * (dt / 16);
      comet.life -= dt / 1100;
      if (comet.life <= 0) comet = null;
    }
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  document.addEventListener("visibilitychange", () => {
    if (still) return;
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });

  resize();
  if (!still) raf = requestAnimationFrame(frame);
})();
