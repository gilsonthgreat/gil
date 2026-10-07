(() => {
  const canvas = document.getElementById("flappy-canvas");
  const ctx = canvas.getContext("2d");
  const bestLabel = document.getElementById("flappy-best");
  const W = 300;
  const H = 420;
  const FLOOR = H - 36;
  const GRAVITY = 1500;
  const FLAP = -420;
  const SPEED = 140;
  const GAP = 130;
  const PIPE_WIDTH = 52;
  const SPACING = 190;
  const INK = "#1b1030";
  const BEST_KEY = "gilos-flappy-best";

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  // two skyline layers, fixed per page load, scrolled at different speeds for depth
  const skyline = (count, minH, maxH) =>
    Array.from({ length: count }, (_, i) => ({
      x: i * (W / count) * 1.6,
      w: 24 + Math.random() * 30,
      h: minH + Math.random() * (maxH - minH),
    }));
  const farCity = skyline(10, 40, 110);
  const nearCity = skyline(8, 20, 70);
  const stars = Array.from({ length: 40 }, () => ({
    x: Math.random() * W,
    y: Math.random() * FLOOR * 0.7,
    r: Math.random() * 1.2 + 0.3,
  }));

  let state = "ready"; // ready | playing | over
  let bird;
  let pipes;
  let score;
  let scroll = 0;
  let overAt = 0;
  let best = Number(GIL.store.get(BEST_KEY)) || 0;
  let frameId = 0;
  let last = 0;
  bestLabel.textContent = best;

  function reset() {
    state = "ready";
    bird = { x: 84, y: H / 2 - 20, vy: 0 };
    pipes = [];
    score = 0;
  }

  function flap() {
    if (state === "over") {
      if (performance.now() - overAt > 450) reset();
      return;
    }
    state = "playing";
    bird.vy = FLAP;
  }

  function addPipe(x) {
    const top = 60 + Math.random() * (FLOOR - GAP - 120);
    pipes.push({ x, top, scored: false });
  }

  function crash() {
    state = "over";
    overAt = performance.now();
    if (score > best) {
      best = score;
      GIL.store.set(BEST_KEY, best);
      bestLabel.textContent = best;
    }
  }

  function update(dt, now) {
    const s = dt / 1000;
    if (state !== "over") scroll += SPEED * s;
    if (state === "ready") {
      bird.y = H / 2 - 20 + Math.sin(now / 250) * 6;
      return;
    }
    bird.vy += GRAVITY * s;
    bird.y = Math.min(FLOOR - 12, bird.y + bird.vy * s);
    // the sky is a soft ceiling; the pipes reach the top, so this doesn't let anyone skip them
    if (bird.y < 10) {
      bird.y = 10;
      bird.vy = Math.max(0, bird.vy);
    }
    if (state === "over") return;

    if (!pipes.length || pipes.at(-1).x < W - SPACING) addPipe(W + 20);
    for (const pipe of pipes) {
      pipe.x -= SPEED * s;
      if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
        pipe.scored = true;
        score++;
      }
      const inColumn = bird.x + 11 > pipe.x && bird.x - 11 < pipe.x + PIPE_WIDTH;
      if (inColumn && (bird.y - 10 < pipe.top || bird.y + 10 > pipe.top + GAP)) crash();
    }
    pipes = pipes.filter((pipe) => pipe.x > -PIPE_WIDTH - 10);
    if (bird.y >= FLOOR - 12) crash();
  }

  function drawCity(layer, speed, color) {
    ctx.fillStyle = color;
    const span = (W / layer.length) * 1.6 * layer.length;
    for (const b of layer) {
      const x = ((((b.x - scroll * speed) % span) + span) % span) - 40;
      ctx.fillRect(x, FLOOR - b.h, b.w, b.h);
    }
  }

  function drawPipe(x, y, h, cap) {
    const body = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
    body.addColorStop(0, "#5b2bb0");
    body.addColorStop(0.45, "#b07cff");
    body.addColorStop(1, "#4a1f93");
    ctx.fillStyle = body;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, PIPE_WIDTH, h);
    ctx.strokeRect(x, y, PIPE_WIDTH, h);
    ctx.fillStyle = "#ec7cf5";
    ctx.fillRect(x - 4, cap, PIPE_WIDTH + 8, 14);
    ctx.strokeRect(x - 4, cap, PIPE_WIDTH + 8, 14);
  }

  function drawBird(now) {
    const tilt = Math.max(-0.5, Math.min(1.2, bird.vy / 600));
    const wing = state === "playing" ? Math.sin(now / 45) : Math.sin(now / 120);
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(tilt);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.fillStyle = "#b07cff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e6dcff";
    ctx.beginPath();
    ctx.ellipse(2, 4, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8f6ae0";
    ctx.beginPath();
    ctx.ellipse(-5, 1 + wing * 3, 7, 4.5, -0.3 + wing * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.moveTo(11, -2);
    ctx.lineTo(20, 1);
    ctx.lineTo(11, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(7.5, -4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function text(str, y, size, color = "#f7f3ff") {
    ctx.font = `${size}px Silkscreen, monospace`;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.strokeText(str, W / 2, y);
    ctx.fillStyle = color;
    ctx.fillText(str, W / 2, y);
  }

  function draw(now) {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, "#0b0618");
    sky.addColorStop(1, "#3a1a6e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e6dcff";
    for (const star of stars) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now / 400 + star.x);
      ctx.fillRect((((star.x - scroll * 0.05) % W) + W) % W, star.y, star.r, star.r);
    }
    ctx.globalAlpha = 1;
    drawCity(farCity, 0.2, "#24124a");
    drawCity(nearCity, 0.45, "#321a63");

    for (const pipe of pipes) {
      drawPipe(pipe.x, 0, pipe.top, pipe.top - 14);
      drawPipe(pipe.x, pipe.top + GAP, FLOOR - pipe.top - GAP, pipe.top + GAP);
    }

    ctx.fillStyle = "#1b1030";
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = "#5b2bb0";
    for (let x = -((scroll % 24) + 24); x < W; x += 24) ctx.fillRect(x, FLOOR + 4, 12, 4);
    ctx.fillStyle = "#b07cff";
    ctx.fillRect(0, FLOOR, W, 2);

    drawBird(now);

    if (state === "playing") text(String(score), 64, 36);
    if (state === "ready") {
      text("flappy", 120, 30);
      text("click, tap or space", 300, 12, "#cfaeff");
    }
    if (state === "over") {
      text("game over", 150, 26);
      text(`score ${score}  best ${best}`, 186, 14, "#cfaeff");
      text("tap to try again", 300, 12, "#cfaeff");
    }
  }

  function frame(now) {
    const dt = Math.min(48, now - last);
    last = now;
    update(dt, now);
    draw(now);
    frameId = requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    flap();
  });
  canvas.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
      e.preventDefault();
      flap();
    }
  });

  // only run while the window is showing
  document.addEventListener("window:open", (e) => {
    if (e.detail.id !== "flappy") return;
    last = performance.now();
    frameId = requestAnimationFrame(frame);
    if (!GIL.mobile.matches) canvas.focus({ preventScroll: true });
  });
  document.addEventListener("window:hide", (e) => {
    if (e.detail.id !== "flappy") return;
    cancelAnimationFrame(frameId);
    if (state === "playing") crash();
  });

  reset();
  draw(0);
})();
