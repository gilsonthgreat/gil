(() => {
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  const still = GIL.reduceMotion;
  // small stars use the first three tints, big ones can be any
  const tints = ["255,255,255", "236,228,255", "201,162,255", "228,108,243", "160,158,255"];

  let width = 0;
  let height = 0;
  let stars = [];
  let birds = [];
  let comet = null;
  let frameId = 0;
  let last = 0;
  let spin = 0.6;
  let nextFlock = 2000;
  const look = { x: 0, y: 0 }; // smoothed pointer position, -1..1 from the centre
  const pointer = { x: 0, y: 0 };

  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / width) * 2 - 1;
    pointer.y = (e.clientY / height) * 2 - 1;
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // depth runs 0.15 (far) to 1 (near): near stars are bigger, faster and shift more with the pointer
    stars = Array.from({ length: Math.round((width * height) / 4200) }, () => {
      const depth = 0.15 + Math.random() ** 2 * 0.85;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        r: 0.25 + depth * 1.4,
        alpha: 0.25 + depth * 0.65,
        speed: 0.4 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        tint: tints[Math.floor(Math.random() * (depth > 0.8 ? tints.length : 3))],
      };
    });
    if (still) draw(0);
  }

  // rotate a point on the unit sphere by `yaw` around Y, then `tilt` around X
  function rotate(x, y, z, yaw, tilt) {
    const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
    const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
    return [x1, y * Math.cos(tilt) - z1 * Math.sin(tilt), y * Math.sin(tilt) + z1 * Math.cos(tilt)];
  }

  function drawPlanet() {
    const mobile = width < 760;
    const radius = Math.min(200, Math.max(60, Math.min(width, height) * (mobile ? 0.2 : 0.16)));
    const cx = width * (mobile ? 0.78 : 0.8) - look.x * 14;
    const cy = height * (mobile ? 0.82 : 0.7) - look.y * 10;
    const tilt = 0.42 + look.y * 0.12;
    const yaw = spin + look.x * 0.25;
    const project = ([x, y, z]) => [cx + x * radius * (1 + z * 0.08), cy + y * radius * (1 + z * 0.08), z];

    const halo = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 2.2);
    halo.addColorStop(0, "rgba(176,124,255,0.22)");
    halo.addColorStop(1, "rgba(176,124,255,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(cx - radius * 2.3, cy - radius * 2.3, radius * 4.6, radius * 4.6);

    // the ring is drawn in two halves so the planet hides the back one
    const ring = (front) => {
      for (const scale of [1.55, 1.7, 1.82]) {
        ctx.beginPath();
        for (let i = 0; i <= 96; i++) {
          const a = (i / 96) * Math.PI * 2;
          const [x, y, z] = project(rotate(Math.cos(a) * scale, 0, Math.sin(a) * scale, yaw * 0.3, tilt + 0.28));
          if (z > 0 !== front) {
            ctx.moveTo(x, y);
            continue;
          }
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(236,124,245,${front ? 0.45 : 0.18})`;
        ctx.lineWidth = scale === 1.7 ? 2 : 1;
        ctx.stroke();
      }
    };

    ring(false);

    const body = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius);
    body.addColorStop(0, "rgba(120,80,210,0.55)");
    body.addColorStop(0.7, "rgba(40,20,90,0.6)");
    body.addColorStop(1, "rgba(14,8,32,0.85)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // grid lines are batched into a few brightness levels (back face dimmest) to keep stroke calls down
    const levels = Array.from({ length: 6 }, () => new Path2D());
    const segment = (a, b) => {
      const pa = project(a);
      const pb = project(b);
      const depth = (pa[2] + pb[2]) / 2;
      const level = depth > 0 ? 1 + Math.min(4, Math.floor(depth * 5)) : 0;
      levels[level].moveTo(pa[0], pa[1]);
      levels[level].lineTo(pb[0], pb[1]);
    };
    for (let lat = -60; lat <= 60; lat += 30) {
      const phi = (lat * Math.PI) / 180;
      let prev = null;
      for (let i = 0; i <= 48; i++) {
        const theta = (i / 48) * Math.PI * 2;
        const p = rotate(Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta), yaw, tilt);
        if (prev) segment(prev, p);
        prev = p;
      }
    }
    for (let lon = 0; lon < 180; lon += 30) {
      const theta = (lon * Math.PI) / 180;
      let prev = null;
      for (let i = 0; i <= 48; i++) {
        const phi = (i / 48) * Math.PI * 2;
        const p = rotate(Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta), yaw, tilt);
        if (prev) segment(prev, p);
        prev = p;
      }
    }

    ctx.lineWidth = 1;
    levels.forEach((path, level) => {
      ctx.strokeStyle = level ? `rgba(207,174,255,${0.12 + level * 0.08})` : "rgba(207,174,255,0.05)";
      ctx.stroke(path);
    });

    ring(true);

    const moonAngle = spin * 2.3;
    const [mx, my, mz] = project(rotate(Math.cos(moonAngle) * 2.3, 0.35, Math.sin(moonAngle) * 2.3, 0, tilt - 0.2));
    const hidden = mz < 0 && Math.hypot(mx - cx, my - cy) < radius;
    if (!hidden) {
      ctx.fillStyle = `rgba(247,243,255,${mz > 0 ? 0.95 : 0.45})`;
      ctx.beginPath();
      ctx.arc(mx, my, 3 + mz * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function spawnFlock() {
    const fromLeft = Math.random() < 0.5;
    const depth = 0.35 + Math.random() * 0.45;
    const count = 3 + Math.floor(Math.random() * 5);
    const baseY = height * (0.08 + Math.random() * 0.35);
    for (let i = 0; i < count; i++) {
      // a loose V: each bird trails the leader further back and to one side
      const rank = Math.ceil(i / 2);
      const side = i % 2 ? 1 : -1;
      birds.push({
        x: (fromLeft ? -40 : width + 40) - (fromLeft ? 1 : -1) * rank * 26 * depth,
        y: baseY + side * rank * 14 * depth,
        vx: (fromLeft ? 1 : -1) * (40 + depth * 60),
        size: 5 + depth * 9,
        depth,
        flap: Math.random() * Math.PI * 2,
        flapSpeed: 7 + Math.random() * 3,
      });
    }
  }

  function drawBird(b) {
    const s = b.size;
    const wing = Math.sin(b.flap) * 0.8;
    ctx.strokeStyle = `rgba(230,220,255,${0.18 + b.depth * 0.35})`;
    ctx.lineWidth = 1 + b.depth;
    ctx.beginPath();
    ctx.moveTo(b.x - s, b.y - wing * s * 0.7);
    ctx.quadraticCurveTo(b.x - s * 0.45, b.y - s * 0.25 - wing * s * 0.2, b.x, b.y);
    ctx.quadraticCurveTo(b.x + s * 0.45, b.y - s * 0.25 - wing * s * 0.2, b.x + s, b.y - wing * s * 0.7);
    ctx.stroke();
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    for (const s of stars) {
      const twinkle = still ? 1 : 0.6 + 0.4 * Math.sin(t * 0.001 * s.speed + s.phase);
      const x = s.x - look.x * s.depth * 26;
      const y = s.y - look.y * s.depth * 18;
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillStyle = `rgb(${s.tint})`;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.depth > 0.85) {
        ctx.globalAlpha = s.alpha * twinkle * 0.16;
        ctx.beginPath();
        ctx.arc(x, y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    drawPlanet();
    for (const b of birds) drawBird(b);
    if (comet) {
      const tailX = comet.x - comet.vx * 16;
      const tailY = comet.y - comet.vy * 16;
      const tail = ctx.createLinearGradient(comet.x, comet.y, tailX, tailY);
      tail.addColorStop(0, `rgba(255,255,255,${comet.life})`);
      tail.addColorStop(1, "rgba(201,162,255,0)");
      ctx.strokeStyle = tail;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(comet.x, comet.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
  }

  function frame(t) {
    // cap the step so a backgrounded tab doesn't jump the whole sky when it comes back
    const dt = Math.min(64, t - last);
    last = t;
    look.x += (pointer.x - look.x) * 0.04;
    look.y += (pointer.y - look.y) * 0.04;
    spin += dt * 0.00012;

    for (const s of stars) {
      s.x -= s.depth * 0.012 * dt;
      if (s.x < -30) s.x = width + 30;
    }

    nextFlock -= dt;
    if (nextFlock <= 0) {
      spawnFlock();
      nextFlock = 9000 + Math.random() * 12000;
    }
    for (const b of birds) {
      b.x += (b.vx * dt) / 1000;
      b.y += Math.sin(b.flap * 0.25) * 0.08;
      b.flap += (b.flapSpeed * dt) / 1000;
    }
    birds = birds.filter((b) => b.x > -120 && b.x < width + 120);

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
