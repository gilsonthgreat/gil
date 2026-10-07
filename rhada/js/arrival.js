/* Rhada Evergarden: the arrival intro, the smoke sprites (M18) and the planet drawing (M20).
   Exposes window.Rhada.drawPlanet(ctx, cx, cy, R, z, opts) and window.Rhada.arrival = { play, skip, active }. */
(function () {
  "use strict";
  var win = window,
    doc = document,
    root = doc.documentElement,
    Rh = (win.Rhada = win.Rhada || {});
  var PI = Math.PI,
    TAU = 2 * PI,
    DEG = PI / 180,
    TILT = -12 * DEG;
  var sin = Math.sin,
    cos = Math.cos,
    min = Math.min,
    max = Math.max,
    pow = Math.pow,
    rnd = Math.random;
  function seg(t, a, b) {
    t = (t - a) / (b - a);
    return t < 0 ? 0 : t > 1 ? 1 : t;
  }
  function eio(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - pow(2 - 2 * x, 3) / 2;
  }
  function eout(x) {
    return 1 - pow(1 - x, 3);
  }
  function gauss() {
    return (rnd() + rnd() + rnd() - 1.5) / 1.5;
  }
  function mk(w, h) {
    var c = doc.createElement("canvas");
    c.width = w;
    c.height = h || w;
    return c;
  }
  function rgba(rgb, a) {
    return "rgba(" + rgb + "," + a + ")";
  }
  function circ(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
  }
  function stops(g, a) {
    for (var i = 0; i < a.length; i += 2) g.addColorStop(a[i], a[i + 1]);
    return g;
  }

  /* ---------- drawPlanet: Evergarden in the ctx's current transform; lw = 1/z keeps hairlines 1px at any zoom ---------- */
  function ringHalf(c, cx, cy, R, lw, a0, a1, moon) {
    c.lineWidth = lw;
    c.strokeStyle = "rgba(230,201,143,.55)";
    c.beginPath();
    c.ellipse(cx, cy, 1.7 * R, 0.3 * R, TILT, a0, a1);
    c.stroke();
    c.setLineDash([lw, 5 * lw]);
    c.strokeStyle = "rgba(230,201,143,.35)";
    c.beginPath();
    c.ellipse(cx, cy, 1.85 * R, 0.33 * R, TILT, a0, a1);
    c.stroke();
    c.setLineDash([]);
    var m = ((moon % TAU) + TAU) % TAU,
      ex = 1.85 * R * cos(m),
      ey = 0.33 * R * sin(m);
    if (typeof moon !== "number" || m < a0 || m >= a1) return;
    c.fillStyle = "#F1E9DA";
    circ(c, cx + ex * cos(TILT) - ey * sin(TILT), cy + ex * sin(TILT) + ey * cos(TILT), 3 * lw);
    c.fill();
  }
  function drawPlanet(c, cx, cy, R, z, o) {
    z = z || 1;
    o = o || {};
    var lw = 1 / z,
      fy = cy - 0.22 * R,
      i,
      j,
      y,
      a,
      x,
      rr,
      p,
      dots = new Path2D(),
      ln = new Path2D(),
      dr = 0.9 * lw;
    c.save();
    if (o.ring) ringHalf(c, cx, cy, R, lw, PI, TAU, o.moon);
    c.fillStyle = stops(c.createLinearGradient(cx - R, 0, cx + R, 0), [
      0,
      "#F4EAD2",
      0.3,
      "#E6C98F",
      0.44,
      "#B88F55",
      0.485,
      "#8B7BA8",
      0.515,
      "#3A2A1A",
      0.62,
      "#17110C",
      1,
      "#080604",
    ]);
    circ(c, cx, cy, R);
    c.fill();
    c.save();
    c.clip();
    // (a) day-side latitude bands, foreshortened toward the limb: dots, zigzag, laddered double line, chevrons, dots
    [-0.62, -0.3, 0.05, 0.38, 0.66].forEach(function (k, b) {
      var w = R * Math.sqrt(1 - k * k),
        y0 = cy + k * R,
        xs = [],
        n,
        d = 0.012 * R;
      for (n = 0; n <= 24; n++) xs.push(cx + w * sin(-PI / 2 + (n * PI) / 48));
      if (b === 2) {
        ln.moveTo(xs[0], y0 - d);
        ln.lineTo(cx, y0 - d);
        ln.moveTo(xs[0], y0 + d);
        ln.lineTo(cx, y0 + d);
      }
      for (n = 0; n <= 24; n++) {
        if (b % 4 === 0) {
          dots.moveTo(xs[n] + dr, y0);
          dots.arc(xs[n], y0, dr, 0, TAU);
        } else if (b === 1) ln[n ? "lineTo" : "moveTo"](xs[n], y0 + (n % 2 ? 0.022 : -0.022) * R);
        else if (n % 2) continue;
        else if (b === 2) {
          ln.moveTo(xs[n], y0 - 2 * d);
          ln.lineTo(xs[n], y0 + 2 * d);
        } else if (n < 24) {
          ln.moveTo(xs[n], y0 - 0.035 * R);
          ln.lineTo(xs[n + 1], y0);
          ln.lineTo(xs[n], y0 + 0.035 * R);
        }
      }
    });
    c.lineWidth = lw;
    c.strokeStyle = c.fillStyle = "rgba(255,248,230,.35)";
    c.stroke(ln);
    c.fill(dots);
    // (b) night lamps on arcs around the home node
    for (j = 1; j <= 4; j++) {
      p = new Path2D();
      rr = 0.14 * R * j;
      for (i = 0; i < 3 * j + 3; i++) {
        a = (-80 + (160 * i) / (3 * j + 2)) * DEG;
        x = cx + rr * cos(a);
        y = fy + rr * sin(a);
        p.moveTo(x + 1.4 * lw, y);
        p.arc(x, y, 1.4 * lw, 0, TAU);
      }
      c.fillStyle = rgba("230,201,143", [0.9, 0.7, 0.5, 0.35][j - 1]);
      c.fill(p);
    }
    // (c) the even hour: a dusk band, and a diamond chain down the terminator phased so one diamond frames home
    c.fillStyle = stops(c.createLinearGradient(cx - 0.05 * R, 0, cx + 0.05 * R, 0), [
      0,
      "rgba(139,123,168,0)",
      0.5,
      "rgba(139,123,168,.35)",
      1,
      "rgba(139,123,168,0)",
    ]);
    c.fillRect(cx - 0.05 * R, cy - R, 0.1 * R, 2 * R);
    var h = 0.025 * R,
      sp = 0.07 * R,
      end = cy + 0.96 * R;
    p = new Path2D();
    for (y = fy - Math.floor((fy - cy + 0.96 * R) / sp) * sp; y <= end; y += sp) {
      p.moveTo(cx, y - h);
      p.lineTo(cx + h, y);
      p.lineTo(cx, y + h);
      p.lineTo(cx - h, y);
      p.closePath();
      if (y + sp <= end) {
        p.moveTo(cx, y + h);
        p.lineTo(cx, y + sp - h);
      }
    }
    c.strokeStyle = "rgba(246,231,193,.75)";
    c.stroke(p);
    // (d) sphere shading (a warm shadow; black reads grey on the gold)
    c.fillStyle = stops(
      c.createRadialGradient(cx - 0.3 * R, cy - 0.25 * R, 0.2 * R, cx - 0.3 * R, cy - 0.25 * R, 1.25 * R),
      [0.55, "rgba(23,15,8,0)", 1, "rgba(23,15,8,.55)"],
    );
    c.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    c.restore();
    // rim, lit limb and its glow (never shadowBlur)
    c.strokeStyle = "rgba(230,201,143,.25)";
    circ(c, cx, cy, R);
    c.stroke();
    c.beginPath();
    c.arc(cx, cy, R, 100 * DEG, 260 * DEG);
    c.lineWidth = 6 * lw;
    c.strokeStyle = "rgba(246,231,193,.08)";
    c.stroke();
    c.lineWidth = 1.5 * lw;
    c.strokeStyle = "rgba(246,231,193,.7)";
    c.stroke();
    // home node
    c.lineWidth = lw;
    c.strokeStyle = "rgba(246,231,193,.9)";
    circ(c, cx, fy, 5 * lw);
    c.moveTo(cx + 9 * lw, fy);
    c.arc(cx, fy, 9 * lw, 0, TAU);
    c.stroke();
    c.fillStyle = "#F6E7C1";
    circ(c, cx, fy, 2 * lw);
    c.fill();
    if (o.ring) ringHalf(c, cx, cy, R, lw, 0, PI, o.moon);
    c.restore();
  }
  Rh.drawPlanet = drawPlanet;

  /* ---------- smoke sprites (M18): L1 L2 light, D1 rust, D2 near-black; L1 and D1 also go to CSS ---------- */
  var smoke = null,
    smokeCss = false;
  function puffs(s, rgb, lo, hi) {
    var c = mk(s),
      g = c.getContext("2d"),
      i,
      x,
      y,
      r,
      a,
      e,
      q,
      P = [];
    for (i = 0; i < 40; i++) {
      // 24 broad puffs, then 16 small dense ones on their rims so the edges billow
      if (i < 24) {
        x = s * (0.15 + 0.7 * rnd());
        y = s * (0.15 + 0.7 * rnd());
        r = s * (0.12 + 0.23 * rnd());
        a = lo + (hi - lo) * rnd();
        P.push([x, y, r]);
      } else {
        q = P[(rnd() * 24) | 0];
        e = rnd() * TAU;
        x = q[0] + cos(e) * q[2] * 0.7;
        y = q[1] + sin(e) * q[2] * 0.7;
        r = s * (0.05 + 0.07 * rnd());
        a = (lo + hi) * (0.7 + 0.5 * rnd());
      }
      e = 0.7 + 0.6 * rnd(); // a little stretch: wisps, not dots
      g.setTransform(e, 0, 0, 1 / e, x, y);
      g.fillStyle = stops(g.createRadialGradient(0, 0, 0, 0, 0, r), [
        0,
        rgba(rgb, a),
        0.4,
        rgba(rgb, a * 0.62),
        0.75,
        rgba(rgb, a * 0.18),
        1,
        rgba(rgb, 0),
      ]);
      g.fillRect(-r, -r, 2 * r, 2 * r);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "destination-in"; // feather to nothing well inside the square
    g.fillStyle = stops(g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2), [
      0.45,
      "#000",
      0.8,
      "rgba(0,0,0,.35)",
      1,
      "rgba(0,0,0,0)",
    ]);
    g.fillRect(0, 0, s, s);
    return c;
  }
  function getSmoke() {
    var s = innerWidth < 640 ? 192 : 256,
      L = "241,233,218";
    smoke = smoke || {
      L: [puffs(s, L, 0.05, 0.09), puffs(s, L, 0.05, 0.09)],
      D: [puffs(s, "107,58,30", 0.05, 0.09), puffs(s, "5,4,3", 0.1, 0.14)],
    };
    if (!smokeCss) {
      smokeCss = true;
      // a short blob: URL rather than a ~170KB data: URL string on :root
      [
        ["--smoke-light", smoke.L[0]],
        ["--smoke-dark", smoke.D[0]],
      ].forEach(function (pair) {
        try {
          pair[1].toBlob(function (blob) {
            if (blob) root.style.setProperty(pair[0], 'url("' + URL.createObjectURL(blob) + '")');
          });
        } catch (e) {}
      });
    }
    return smoke;
  }

  /* ---------- the arrival ---------- */
  var A = doc.getElementById("arrival"),
    cv = A && A.querySelector(".arrival-canvas"),
    btn = A && A.querySelector(".a-skip"),
    ctx = cv && cv.getContext("2d");
  var active = false,
    leaving = false,
    still = false,
    dirty = false,
    ready = false,
    raf = 0,
    timer = 0,
    run = 0,
    t0 = 0,
    last = 0,
    fc = 0,
    sum = 0,
    b1End = 0,
    beat = "",
    inerted = [];
  var W,
    H,
    dpr,
    phone,
    cx,
    cy,
    R,
    r0,
    sx,
    fy,
    ZM,
    SV,
    SK = 5,
    starCv,
    stars,
    P,
    glow,
    ringCv,
    RS,
    slc,
    sl,
    sprites;
  var fe = 0,
    fcy = 1,
    fcr = 1,
    fsr = 0,
    fz = 1,
    foy = 0,
    gx = 0,
    gy = 0; // per-frame projection state, read by proj()

  function layout() {
    W = innerWidth;
    H = innerHeight;
    phone = W < 640;
    dpr = phone || (navigator.hardwareConcurrency || 8) <= 4 ? 1 : min(win.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    var vm = min(W, H) / 100,
      i,
      s,
      g,
      th,
      k,
      rr,
      f,
      n = phone ? 22 : 30,
      st = A.style;
    cx = W / 2;
    cy = H / 2;
    R = phone ? min(12 * vm, 52) : min(8 * vm, 72);
    r0 = phone ? min(22 * vm, 96) : min(15 * vm, 128);
    sx = phone ? 0.38 * W : min(0.34 * W, 460);
    fy = cy - 0.22 * R;
    ZM = 60 * min(1, max(0.35, W / 1200)); // 60x on desktop; less on narrow screens so gold, seam and night all stay in frame
    SV = min(1, max(0.65, max(W, 0.6 * H) / 1000)); // smoke scale follows the viewport
    st.setProperty("--cx", cx + "px");
    st.setProperty("--cy", cy + "px");
    st.setProperty("--R", R + "px");
    st.setProperty("--r0", r0 + "px");
    st.setProperty("--sx", sx + "px");
    starCv = mk(cv.width, cv.height);
    g = starCv.getContext("2d");
    g.scale(dpr, dpr);
    for (stars = [], i = 0; i < (phone ? 110 : 200); i++) {
      stars.push((s = [rnd() * W, rnd() * H]));
      g.globalAlpha = 0.3 + rnd() * 0.6;
      g.fillStyle = rnd() < 0.5 ? "#F6E7C1" : "#E6C98F";
      circ(g, s[0], s[1], 0.25 + rnd() * 0.45);
      g.fill();
    }
    slc = mk(Math.ceil(W / SK), Math.ceil(H / SK));
    sl = slc.getContext("2d"); // smoke is soft: a fifth-res layer cuts its fill cost 25x
    // the dense dust of the loading ring, prerendered: a glow band, specks thickening on three lobes, four spiral wisps
    glow = mk(64);
    g = glow.getContext("2d");
    g.fillStyle = stops(g.createRadialGradient(32, 32, 0, 32, 32, 32), [
      0,
      "rgba(246,231,193,.85)",
      0.22,
      "rgba(230,201,143,.38)",
      0.55,
      "rgba(201,164,106,.1)",
      1,
      "rgba(201,164,106,0)",
    ]);
    g.fillRect(0, 0, 64, 64);
    RS = Math.ceil((r0 + 48) * 2);
    ringCv = mk(Math.ceil(RS * dpr));
    g = ringCv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, (RS * dpr) / 2, (RS * dpr) / 2);
    g.globalCompositeOperation = "lighter";
    for (i = 0; i < 90; i++) {
      th = (i / 90) * TAU;
      g.globalAlpha = 0.05 + 0.035 * (1 + sin(3 * th + 1));
      g.drawImage(glow, cos(th) * r0 - n, sin(th) * r0 - n, 2 * n, 2 * n);
    }
    for (i = 0; i < (phone ? 1500 : 2600); i++) {
      if (i % 5) {
        th = rnd() * TAU;
        k = 0.5 + 0.5 * sin(3 * th + 1);
        rr = r0 + gauss() * (4 + 10 * k);
      } else {
        f = rnd();
        th = ((i / 5) % 4) * 1.7 + 0.4 + f * 1.3;
        k = 1 - f;
        rr = r0 + 5 + f * f * 34 + (rnd() - 0.5) * 8 * f;
      }
      g.globalAlpha = (0.12 + 0.5 * rnd()) * (0.5 + 0.5 * k);
      g.fillStyle = rnd() < 0.3 ? "#F6E7C1" : "#E6C98F";
      f = 0.5 + rnd() * 1.1;
      g.fillRect(cos(th) * rr - f / 2, sin(th) * rr - f / 2, f, f);
    }
  }

  function build() {
    var i,
      c,
      L,
      sm = getSmoke(),
      n = phone ? 140 : 240,
      half = phone ? 6 : 12;
    for (P = [], i = 0; i < n + (phone ? 70 : 120); i++) {
      // a dense core of 1-2px grains plus a finer, looser halo
      c = i < n;
      P.push({
        th: rnd() * TAU,
        u: gauss() * (c ? 1 : 2.3),
        s: c ? 1 + rnd() : 0.7 + rnd() * 0.6,
        a: c ? 0.25 + rnd() * 0.55 : 0.12 + rnd() * 0.3,
        f: 1 + rnd() * 2.5,
        ph: rnd() * TAU,
        dead: 0,
      });
    }
    for (sprites = [], i = 0; i < half * 2; i++) {
      // light from the left, dark from the right, interleaved; y stratified
      L = i % 2 === 0;
      c = i >> 1;
      sprites.push({
        L: L,
        img: (L ? sm.L : sm.D)[c % 2],
        x0: L ? -0.6 : 1.6,
        x1: L ? 0.08 + rnd() * 0.4 : 0.52 + rnd() * 0.4,
        y: (c + 0.15 + 0.7 * rnd()) / half,
        sc: 3 + rnd() * 3,
        r: rnd() * TAU,
        rs: (rnd() - 0.5) * 0.2,
        a: 0.55 + rnd() * 0.3,
        d: rnd() * 0.25,
      });
    }
  }

  // a ring point at angle phi, radial offset off: circle (B1) -> tipped, tilted ellipse (B2) -> through the camera (B3+)
  function proj(phi, off) {
    var rho = r0 + off,
      lx,
      ly;
    rho += (1.7 * R + off * 0.6 - rho) * fe;
    lx = rho * cos(phi);
    ly = rho * sin(phi) * fcy;
    gx = cx + lx * fcr - ly * fsr;
    gy = cy + lx * fsr + ly * fcr;
    if (fz > 1) {
      gx = cx + (gx - cx) * fz;
      gy = foy + (gy - fy) * fz;
    }
  }
  function camera() {
    ctx.setTransform(dpr * fz, 0, 0, dpr * fz, dpr * (cx - cx * fz), dpr * (foy - fy * fz));
  }

  // the two moons on the line: node rings, then bodies (gold and small; pale and wide), lit from the left like the planet
  function moons(a, b, off) {
    var i, k, x, rr;
    ctx.lineWidth = 1;
    for (i = 0; i < 2; i++) {
      x = i ? cx + sx + off : cx - sx - off;
      ctx.globalAlpha = a;
      for (k = 0; k < 3; k++) {
        ctx.strokeStyle = rgba("201,164,106", [0.7, 0.45, 0.25][k]);
        circ(ctx, x, cy, [4, 9, 16][k]);
        ctx.stroke();
      }
      ctx.fillStyle = "#E6C98F";
      circ(ctx, x, cy, 2);
      ctx.fill();
      if (b <= 0) continue;
      rr = (i ? 8.5 : 5.5) * (0.4 + 0.6 * b);
      ctx.fillStyle = stops(
        ctx.createLinearGradient(x - rr, 0, x + rr, 0),
        i
          ? [0, "#F1E9DA", 0.45, "#CFCBB8", 0.7, "#7D7A6C", 1, "#24221C"]
          : [0, "#F6E7C1", 0.45, "#E6C98F", 0.7, "#B88F55", 1, "#3A2A1A"],
      );
      ctx.globalAlpha = a * b;
      circ(ctx, x, cy, rr);
      ctx.fill();
    }
  }

  // faint orbit linework around the loading ring, as in the reference
  function orbits(a) {
    var o = phone ? 1.4 : 1.62;
    ctx.globalAlpha = a;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(201,164,106,.16)";
    circ(ctx, cx, cy, r0 * 1.25);
    ctx.stroke();
    ctx.strokeStyle = "rgba(90,65,39,.5)";
    circ(ctx, cx, cy, r0 * 2.5);
    ctx.stroke();
    ctx.setLineDash([1, 6]);
    ctx.strokeStyle = "rgba(201,164,106,.45)";
    circ(ctx, cx, cy, r0 * o);
    ctx.stroke();
    ctx.setLineDash([]);
    if (phone) return; // phones: the moon nodes sit there
    ctx.fillStyle = "#C9A46A";
    circ(ctx, cx - r0 * o, cy, 2);
    ctx.moveTo(cx + r0 * o + 2, cy);
    ctx.arc(cx + r0 * o, cy, 2, 0, TAU);
    ctx.fill();
  }

  // one depth layer (bk = back half) of the dust ring, additive: the prerendered dust, the comet's glow, the grains
  function dust(bk, F) {
    var i,
      p,
      k,
      phi,
      s,
      ta = F.ringA * F.gA;
    ctx.save();
    if (ta > 0 && (fe > 0 || !bk)) {
      s = (r0 + (1.7 * R - r0) * fe) / r0;
      if (fz > 1) camera();
      ctx.translate(cx, cy);
      ctx.rotate(TILT * fe);
      ctx.scale(s, s * fcy);
      if (fe > 0) {
        ctx.beginPath();
        ctx.rect(-RS, bk ? -RS : 0, 2 * RS, RS);
        ctx.clip();
      }
      ctx.rotate(F.rot);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = ta * (1 - 0.3 * fe);
      ctx.drawImage(ringCv, -RS / 2, -RS / 2, RS, RS);
    }
    ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    for (k = 0; F.cA > 0 && k < 9; k++) {
      phi = F.head - k * 0.1;
      s = (phone ? 40 : 54) - 3 * k;
      if ((fe > 0 && sin(phi) < 0 ? 1 : 0) !== bk) continue;
      proj(phi, 0);
      ctx.globalAlpha = 0.34 * (1 - k / 9) * F.cA * F.gA;
      ctx.drawImage(glow, gx - s / 2, gy - s / 2, s, s);
    }
    for (k = 0; k < 2; k++) {
      ctx.fillStyle = k ? "#F6E7C1" : "#E6C98F";
      for (i = 0; i < P.length; i++) {
        p = P[i];
        if (p.dead || p.b !== bk || p.h !== k) continue;
        ctx.globalAlpha = p.al;
        ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
      }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  // B4 smoke drifts in and meets in a ragged seam; B5 parts it outward over the hero
  function drawSmoke(t4, t5) {
    var k = 1 / SK,
      i,
      p,
      e,
      a,
      s,
      e5 = 1 - pow(1 - seg(t5, 0, 0.9), 4),
      f5 = 1 - eio(seg(t5, 0.1, 0.9));
    sl.setTransform(1, 0, 0, 1, 0, 0);
    sl.clearRect(0, 0, slc.width, slc.height);
    for (i = 0; i < sprites.length; i++) {
      p = sprites[i];
      e = eout(seg(t4, p.d, 0.9));
      a = p.r + p.rs * t4;
      s = p.sc * SV * k;
      sl.globalAlpha = p.a * seg(t4, p.d, p.d + 0.45) * f5;
      if (sl.globalAlpha < 0.003) continue;
      sl.setTransform(
        cos(a) * s,
        sin(a) * s,
        -sin(a) * s,
        cos(a) * s,
        (p.x0 + (p.x1 - p.x0) * e + (p.L ? -0.45 : 0.45) * e5) * W * k,
        p.y * H * k,
      );
      sl.drawImage(p.img, -p.img.width / 2, -p.img.width / 2);
    }
    ctx.drawImage(slc, 0, 0, W, H);
  }

  function setBeat(b) {
    if (b !== beat) A.setAttribute("data-beat", (beat = b));
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!t0) t0 = last = now;
    var t = (now - t0) / 1000,
      i,
      p,
      phi,
      w,
      d;
    if (++fc > 5 && fc <= 25) {
      sum += now - last;
      if (fc === 25 && sum / 20 > 30) return out(true);
    } // perf guard, frames 5-25
    last = now;
    if (fc < 4 && win.pageYOffset) toTop(); // a smooth scroll still in flight at replay can tick once more
    if (dirty) {
      dirty = false;
      layout();
    }
    if (!b1End && (t >= 2.8 || (ready && t >= 1.4))) b1End = t; // B1 lasts 1.0-2.4s, waiting on fonts and hero images
    var T = b1End ? t - b1End + 1.4 : min(t, 1.399),
      t2 = T - 1.4,
      t3 = T - 2.6,
      t4 = T - 3.9,
      t5 = T - 4.8,
      q = max(0, t2);
    setBeat(T >= 4.8 ? "5" : T >= 3.9 ? "4" : T >= 2.6 ? "3" : T >= 1.4 ? "2" : t >= 0.4 ? "1" : "0");
    if (t5 >= 0 && !root.classList.contains("arrived")) root.classList.add("arrived"); // hand-off: the hero entrance runs underneath
    if (t5 >= 1) return finish(false);
    // spin .6 rad/s, easing to .15 over the morph; the comet sweeps every 2.2s
    var F = {
      t: t,
      ringA: seg(t, 0.4, 0.8),
      gA: 1 - seg(t3, 0, 0.4),
      head: (TAU * t) / 2.2 + 2.3,
      rot: 0.6 * (t - q) + 0.15 * q + 0.45 * (q < 0.9 ? q - (q * q) / 1.8 : 0.45),
    };
    var e3 = eio(seg(t3, 0, 1.6));
    fe = eio(seg(t2, 0, 0.9));
    fcy = cos(1.393 * fe);
    fcr = cos(TILT * fe);
    fsr = sin(TILT * fe); // 1.393 = acos(.3/1.7)
    fz = t3 > 0 ? pow(ZM, e3) * (1 + 0.1 * eout(seg(t3, 1.6, 3.2))) : 1;
    foy = fy + (cy - fy) * e3;
    F.cA = (1 - fe) * F.ringA;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (fz < 8) {
      // stars at .6, pushed outward and streaked while the zoom is fast, gone by z = 8
      var f = 1 + (0.8 * (fz - 1)) / 59,
        sa = t3 > 0 ? 1 - (fz - 1) / 7 : 1,
        f1,
        dx,
        dy,
        vx,
        vy,
        L;
      ctx.globalAlpha = 0.6 * seg(t, 0, 0.4) * sa;
      ctx.drawImage(starCv, cx - cx * f, cy - cy * f, W * f, H * f);
      if (t3 > 0) {
        f1 = 1 + (0.8 * (pow(ZM, eio(seg(t3 - 0.05, 0, 1.6))) - 1)) / 59;
        ctx.globalAlpha = 0.5 * sa;
        ctx.strokeStyle = "#E6C98F";
        ctx.lineWidth = 1;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (i = 0; i < stars.length; i++) {
          dx = stars[i][0] - cx;
          dy = stars[i][1] - cy;
          vx = dx * (f - f1);
          vy = dy * (f - f1);
          L = Math.sqrt(vx * vx + vy * vy);
          if (L < 1.5) continue;
          if (L > 14) {
            vx *= 14 / L;
            vy *= 14 / L;
          }
          ctx.moveTo(cx + dx * f - vx, cy + dy * f - vy);
          ctx.lineTo(cx + dx * f, cy + dy * f);
        }
        ctx.stroke();
        ctx.lineCap = "butt";
      }
    }
    if (t2 < 0.5) orbits(F.ringA * (1 - seg(t2, 0, 0.5)));
    if (t3 < 0.4) moons(F.ringA * (1 - seg(t3, 0, 0.4)), eout(seg(t2, 0.3, 0.8)), eout(seg(t3, 0, 0.4)) * 0.12 * W);
    ctx.globalAlpha = 1;
    for (i = 0; i < P.length; i++) {
      // the grains
      p = P[i];
      if (p.dead) continue;
      phi = p.th + F.rot;
      d = (F.head - phi) % TAU;
      if (d < 0) d += TAU;
      w = d < 0.9 ? (1 - d / 0.9) * F.cA : 0; // just behind the comet: brighter, bigger, looser
      proj(phi, p.u * (4 + 3 * sin(3 * phi + t)) * (1 + w));
      if (fz > 1 && (gx < -40 || gx > W + 40 || gy < -40 || gy > H + 40)) {
        p.dead = 1;
        continue;
      } // culled once off-screen
      p.x = gx;
      p.y = gy;
      p.b = fe > 0 && sin(phi) < 0 ? 1 : 0;
      p.h = w > 0.3 ? 1 : 0;
      p.al = min(1, p.a * (0.7 + 0.3 * sin(t * p.f + p.ph)) * (1 + w)) * F.ringA;
      p.sz = p.s * (1 + 0.6 * w) * (fz > 1 ? min(1 + (fz - 1) * 0.06, 3) : 1);
    }
    if (fz < 8) dust(1, F); // back half, behind the disc
    var pa = t3 >= 0 ? 1 - seg(t5, 0, 0.4) : eout(seg(t2, 0.2, 0.9));
    if (pa > 0) {
      ctx.globalAlpha = pa;
      if (t3 >= 0) {
        camera();
        drawPlanet(ctx, cx, cy, R, fz);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else drawPlanet(ctx, cx, cy, R * (0.6 + 0.4 * pa), 1);
      ctx.globalAlpha = 1;
    }
    dust(0, F);
    if (t4 >= 0) drawSmoke(t4, t5);
  }

  function drawStill() {
    // reduced motion: one composed frame
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(starCv, 0, 0, W, H);
    moons(1, 1, 0);
    ctx.globalAlpha = 1;
    drawPlanet(ctx, cx, cy, R, 1, { ring: true });
  }

  function start() {
    var my = ++run,
      done = function () {
        if (my === run) ready = true;
      };
    active = true;
    leaving = ready = dirty = false;
    b1End = t0 = fc = sum = 0;
    beat = "";
    [].forEach.call(
      doc.querySelectorAll("a.skip-link, header.site-header, nav.spine, main#main, footer.colophon"),
      function (el) {
        if (!el.hasAttribute("inert")) {
          el.setAttribute("inert", "");
          inerted.push(el);
        }
      },
    );
    A.classList.remove("is-out");
    A.classList.add("is-on");
    layout();
    build();
    try {
      btn.focus({ preventScroll: true });
    } catch (e) {}
    Promise.all(
      [].map
        .call(doc.querySelectorAll(".stage .fig img"), function (im) {
          return im.decode ? im.decode().catch(function () {}) : 0;
        })
        .concat(doc.fonts ? [doc.fonts.ready] : []),
    ).then(done, done);
    still = !!(win.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (still) {
      setBeat("still");
      drawStill();
      timer = setTimeout(out, 1600, false);
    } else {
      setBeat("0");
      raf = requestAnimationFrame(frame);
    }
  }

  // leave: fade the overlay (400ms) while the hero comes in underneath, then clean up
  function out(skipped) {
    if (!active || leaving) return;
    leaving = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    if (!root.classList.contains("arrived")) root.classList.add("arrived", skipped ? "arrived-quick" : "arrived");
    A.classList.add("is-out");
    timer = setTimeout(finish, 400, skipped);
  }

  function finish(skipped) {
    var fo = doc.activeElement,
      inside = !fo || fo === doc.body || A.contains(fo),
      h = doc.getElementById("hero-title"),
      live = doc.getElementById("live");
    root.classList.remove("arriving");
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    cv.width = cv.height = 0;
    starCv = stars = slc = sl = glow = ringCv = sprites = P = smoke = null;
    inerted.forEach(function (el) {
      el.removeAttribute("inert");
    });
    inerted = [];
    A.classList.remove("is-on", "is-out");
    A.removeAttribute("data-beat");
    if (inside && h) {
      try {
        h.focus({ preventScroll: true });
      } catch (e) {}
    } // a click on the overlay leaves focus on body: counts as inside
    try {
      sessionStorage.setItem("rhada:arrived", "1");
    } catch (e) {}
    if (live) live.textContent = "Rhada Evergarden, character record.";
    active = leaving = false;
    doc.dispatchEvent(new CustomEvent("rhada:arrived", { detail: { skipped: !!skipped } }));
  }

  function skip() {
    out(true);
  }

  function toTop() {
    // instant, whatever the page's CSS says (the inline override needs a style flush to count)
    var sb = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    getComputedStyle(root).scrollBehavior;
    try {
      win.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch (e) {
      win.scrollTo(0, 0);
    }
    root.style.scrollBehavior = sb;
  }

  function play() {
    if (!A) return;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    var dlg = doc.querySelector("dialog[open]");
    if (dlg && dlg.close) dlg.close();
    toTop();
    root.classList.remove("arrived", "arrived-quick");
    root.classList.add("arriving");
    start();
  }

  Rh.arrival = {
    play: play,
    skip: skip,
    get active() {
      return active;
    },
  };

  if (A) {
    doc.addEventListener(
      "keydown",
      function (e) {
        if (active && /^(Escape|Esc|PageDown|ArrowDown| |Spacebar)$/.test(e.key)) {
          e.preventDefault();
          skip();
        }
      },
      true,
    );
    A.addEventListener("click", skip);
    win.addEventListener("wheel", skip, { passive: true });
    win.addEventListener("touchmove", skip, { passive: true });
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) skip();
    });
    win.addEventListener("resize", function () {
      if (active && !leaving) {
        if (still) {
          layout();
          drawStill();
        } else dirty = true;
      }
    });
  }
  if (A && root.classList.contains("arriving")) start();
  else {
    // no intro: still make the CSS smoke, once the page has settled
    root.classList.remove("arriving");
    var make = function () {
      getSmoke();
      if (!active) smoke = null;
    };
    var later = function () {
      if (win.requestIdleCallback) requestIdleCallback(make, { timeout: 2000 });
      else setTimeout(make, 200);
    };
    if (doc.readyState === "complete") later();
    else win.addEventListener("load", later);
  }
})();
