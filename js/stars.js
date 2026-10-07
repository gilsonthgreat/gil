(() => {
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  const still = GIL.reduceMotion;
  // small stars use the first three tints, big ones can be any
  const tints = ["255,255,255", "236,228,255", "201,162,255", "228,108,243", "160,158,255"];

  let width = 0;
  let height = 0;
  let stars = [];
  let comet = null;
  let frameId = 0;
  let last = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars = Array.from({ length: Math.round((width * height) / 4200) }, () => {
      const big = Math.random() < 0.08;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
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
    ctx.clearRect(0, 0, width, height);
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
      const tail = ctx.createLinearGradient(comet.x, comet.y, tailX, tailY);
      tail.addColorStop(0, `rgba(255,255,255,${comet.life})`);
      tail.addColorStop(1, "rgba(201,162,255,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = tail;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(comet.x, comet.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    // cap the step so a backgrounded tab doesn't jump the whole sky when it comes back
    const dt = Math.min(64, t - last);
    last = t;
    for (const s of stars) {
      s.x -= s.drift * dt;
      if (s.x < -4) s.x = width + 4;
    }
    if (!comet && Math.random() < dt / 9000) {
      comet = {
        x: width * (0.3 + Math.random() * 0.7),
        y: Math.random() * height * 0.4,
        vx: -6 - Math.random() * 4,
        vy: 2.5 + Math.random() * 2,
        life: 1,
      };
    }
    if (comet) {
      comet.x += comet.vx * (dt / 16);
      comet.y += comet.vy * (dt / 16);
      comet.life -= dt / 1100;
      if (comet.life <= 0) comet = null;
    }
    draw(t);
    frameId = requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  resize();
  if (!still) {
    document.addEventListener("visibilitychange", () => {
      cancelAnimationFrame(frameId);
      if (!document.hidden) frameId = requestAnimationFrame(frame);
    });
    frameId = requestAnimationFrame(frame);
  }
})();
