(() => {
  const { el, store } = GIL;
  const layer = document.getElementById("critters");
  const taskbar = document.querySelector(".taskbar");
  const INK = "#1b1030";
  const W = 76;
  const H = 60;
  const STORE_KEY = "gilos-pets";

  // Everything is drawn facing right with the origin between the feet; the element is mirrored to face left.
  function blob(ctx, x, y, rx, ry, rotation, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }

  function poly(ctx, points, fill) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }

  // a thick rounded stroke with an outline: legs and thin tails
  function limb(ctx, path, width, color) {
    for (const [w, c] of [
      [width + 3, INK],
      [width, color],
    ]) {
      ctx.beginPath();
      path();
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
  }

  function eye(ctx, x, y, closed) {
    if (closed) {
      ctx.beginPath();
      ctx.moveTo(x - 1.8, y);
      ctx.quadraticCurveTo(x, y + 1.6, x + 1.8, y);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 0.2, y - 1.2, 0.9, 0.9);
  }

  const SPECIES = {
    cat: { body: "#ddd2f7", shade: "#b29fe3", detail: "#ff9ad5", innerEar: "#ff9ad5", ears: "pointy", tail: "thin" },
    dog: { body: "#efcb98", shade: "#c99a62", detail: "#7a4b2a", muzzle: "#fbe6c4", ears: "floppy", tail: "wag" },
    fox: {
      body: "#ff9a5a",
      shade: "#d26a33",
      detail: "#fff1e0",
      muzzle: "#fff1e0",
      innerEar: INK,
      ears: "pointy",
      tail: "bushy",
    },
  };

  function head(ctx, sp, x, y, t, sleeping, blink) {
    if (sp.ears === "pointy") {
      poly(
        ctx,
        [
          [x - 6, y - 3],
          [x - 4, y - 13],
          [x + 1, y - 6],
        ],
        sp.body,
      );
      poly(
        ctx,
        [
          [x, y - 6],
          [x + 5, y - 13],
          [x + 6.5, y - 2],
        ],
        sp.body,
      );
      ctx.fillStyle = sp.innerEar;
      ctx.beginPath();
      ctx.moveTo(x + 2.5, y - 7);
      ctx.lineTo(x + 4.8, y - 11);
      ctx.lineTo(x + 5.5, y - 6);
      ctx.fill();
    }
    blob(ctx, x, y, 7.5, 7, 0, sp.body);
    if (sp.muzzle) {
      blob(ctx, x + 6, y + 2, 5, 3.4, 0.1, sp.muzzle);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(x + 10.5, y + 1, 1.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = sp.detail;
      ctx.beginPath();
      ctx.arc(x + 6.5, y + 1.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 2.5);
      ctx.lineTo(x + 11, y + 2);
      ctx.moveTo(x + 5, y + 3.2);
      ctx.lineTo(x + 10.5, y + 4.2);
      ctx.stroke();
      ctx.lineWidth = 2;
    }
    if (sp.ears === "floppy") {
      const flop = Math.sin(t * 0.006) * 0.12;
      blob(ctx, x - 3, y + 1, 3.4, 6.5, 0.35 + flop, sp.detail);
    }
    eye(ctx, x + 2.5, y - 1.5, sleeping || blink);
  }

  function tail(ctx, sp, x, y, t, pose) {
    if (sp.tail === "thin") {
      const sway = Math.sin(t * 0.005) * 3;
      if (pose === "walk") {
        limb(
          ctx,
          () => {
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x - 9, y - 2, x - 10, y - 10, x - 8 + sway, y - 15);
          },
          3.5,
          sp.body,
        );
      } else {
        limb(
          ctx,
          () => {
            ctx.moveTo(x - 4, -4);
            ctx.bezierCurveTo(x - 10, -1, x + 4, -1, x + 18 + sway * 0.3, -2.5);
          },
          3.5,
          sp.body,
        );
      }
    } else if (sp.tail === "wag") {
      const wag = Math.sin(t * 0.03) * 0.5;
      const angle = -2.3 + wag;
      limb(
        ctx,
        () => {
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
        },
        4,
        sp.body,
      );
    } else {
      const sway = Math.sin(t * 0.004) * 0.15;
      const rotation = (pose === "walk" ? -0.35 : 0.25) + sway;
      const tx = x - Math.cos(rotation) * 9;
      const ty = y - Math.sin(rotation) * 9 + (pose === "walk" ? 0 : 5);
      blob(ctx, tx, ty, 10, 5, rotation, sp.body);
      blob(ctx, tx - Math.cos(rotation) * 8, ty - Math.sin(rotation) * 8, 3.5, 3, rotation, sp.detail);
    }
  }

  function quadruped(ctx, sp, pose, t, phase, blink) {
    if (pose === "walk") {
      const bob = -Math.abs(Math.sin(phase)) * 1.5;
      const leg = (hx, offset, color) => {
        const a = Math.sin(phase + offset) * 0.6;
        const lift = Math.max(0, Math.cos(phase + offset)) * 2.5;
        limb(
          ctx,
          () => {
            ctx.moveTo(hx, -10 + bob);
            ctx.lineTo(hx + Math.sin(a) * 8, -1.5 - lift);
          },
          4.5,
          color,
        );
      };
      leg(-7, Math.PI, sp.shade);
      leg(9, 0, sp.shade);
      tail(ctx, sp, -12, -15 + bob, t, pose);
      blob(ctx, 0, -14 + bob, 13, 7.5, 0, sp.body);
      if (sp.tail === "bushy") blob(ctx, 9, -13 + bob, 4, 4.5, 0, sp.detail);
      leg(-10, 0, sp.body);
      leg(11, Math.PI, sp.body);
      head(ctx, sp, 13, -22 + bob, t, false, blink);
    } else if (pose === "sit") {
      tail(ctx, sp, -6, -9, t, pose);
      blob(ctx, -4, -7, 8.5, 7, 0, sp.body);
      blob(ctx, 2, -14, 7.5, 10, -0.15, sp.body);
      limb(
        ctx,
        () => {
          ctx.moveTo(7, -10);
          ctx.lineTo(8, -1.5);
        },
        4,
        sp.shade,
      );
      limb(
        ctx,
        () => {
          ctx.moveTo(4, -10);
          ctx.lineTo(4.5, -1.5);
        },
        4,
        sp.body,
      );
      head(ctx, sp, 5, -27, t, false, blink);
    } else {
      const breath = Math.sin(t * 0.003) * 0.6;
      tail(ctx, sp, -10, -10, t, pose);
      blob(ctx, -1, -7, 15, 7 + breath, 0, sp.body);
      head(ctx, sp, 10, -9, t, true, false);
    }
  }

  function bunny(ctx, pose, t, phase, blink) {
    const hop = pose === "walk" ? Math.max(0, Math.sin(phase)) * 9 : 0;
    const twitch = pose === "walk" ? 0 : Math.max(0, Math.sin(t * 0.004)) ** 8 * 0.3;
    blob(ctx, -5 - hop * 0.3, -2.5 - hop * 0.85, 6.5 + hop * 0.2, 2.6, hop * 0.04, "#e9ddfa");
    blob(ctx, -1, -11 - hop, 10, 8, -0.1, "#f8f2ff");
    blob(ctx, -11, -13 - hop, 3.6, 3.6, 0, "#ffffff");
    blob(ctx, 4, -28 - hop, 2.6, 8.5, -0.3 - twitch, "#e9ddfa");
    blob(ctx, 8, -28 - hop, 2.6, 8.5, -0.05 + twitch, "#f8f2ff");
    ctx.fillStyle = "#ffb3dc";
    ctx.beginPath();
    ctx.ellipse(8, -28 - hop, 1, 6, -0.05 + twitch, 0, Math.PI * 2);
    ctx.fill();
    blob(ctx, 8, -17 - hop, 6.5, 6, 0, "#f8f2ff");
    blob(ctx, 7 + hop * 0.2, -3.5 - hop * 0.9, 2.6, 2, 0, "#f8f2ff");
    eye(ctx, 10, -18.5 - hop, pose === "sleep" || blink);
    ctx.fillStyle = "#ff8fc8";
    ctx.beginPath();
    ctx.arc(14, -16 - hop, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function duck(ctx, pose, t, phase, blink) {
    const step = pose === "walk" ? Math.sin(phase) : 0;
    ctx.save();
    ctx.rotate(step * 0.1);
    poly(
      ctx,
      [
        [-2 + step * 3, -2],
        [3 + step * 3, -2],
        [0.5 + step * 3, 0.5],
      ],
      "#ff9f43",
    );
    poly(
      ctx,
      [
        [-1 - step * 3, -2],
        [4 - step * 3, -2],
        [1.5 - step * 3, 0.5],
      ],
      "#ff9f43",
    );
    poly(
      ctx,
      [
        [-9, -13],
        [-16, -18],
        [-11, -8],
      ],
      "#ffe07a",
    );
    blob(ctx, 0, -10, 11, 8, 0, "#ffe07a");
    const flap = pose === "walk" ? 0 : Math.max(0, Math.sin(t * 0.003)) ** 12 * 0.6;
    blob(ctx, -1, -11, 7, 4.5, -0.2 - flap, "#f2c94c");
    blob(ctx, 8, -20, 6, 6, 0, "#ffe07a");
    poly(
      ctx,
      [
        [12.5, -21],
        [19, -19.5],
        [12.5, -17.5],
      ],
      "#ff9f43",
    );
    eye(ctx, 9.5, -21.5, pose === "sleep" || blink);
    ctx.restore();
  }

  class Critter {
    constructor(kind, x, y, speed) {
      this.kind = kind;
      this.x = x;
      this.y = y;
      this.speed = speed;
      this.facing = 1;
      this.pose = "sit";
      this.phase = 0;
      this.since = performance.now();
      this.blinkUntil = 0;
      this.nextBlink = performance.now() + 1000 + Math.random() * 3000;
      this.nextZ = 0;
      this.canvas = el("canvas", { class: "critter" });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = W * dpr;
      this.canvas.height = H * dpr;
      this.ctx = this.canvas.getContext("2d");
      this.ctx.scale(dpr, dpr);
      layer.append(this.canvas);
    }

    setPose(pose, now) {
      if (pose !== this.pose) {
        this.pose = pose;
        this.since = now;
      }
    }

    // returns true once it has arrived
    walkTo(tx, ty, dt, now) {
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < (this.pose === "walk" ? 4 : 24)) return true;
      const step = Math.min(dist, (this.speed * dt) / 1000);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
      this.phase += step / (this.kind === "bunny" ? 9 : this.kind === "duck" ? 5 : 4.5);
      this.setPose("walk", now);
      return false;
    }

    headPosition() {
      return { x: this.x + this.facing * 10, y: this.y - (this.pose === "sleep" ? 12 : 28) };
    }

    render(now) {
      if (now > this.nextBlink) {
        this.blinkUntil = now + 140;
        this.nextBlink = now + 2500 + Math.random() * 4000;
      }
      const blink = now < this.blinkUntil;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H - 3);
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = INK;
      if (this.kind === "bunny") bunny(ctx, this.pose, now, this.phase, blink);
      else if (this.kind === "duck") duck(ctx, this.pose, now, this.phase, blink);
      else quadruped(ctx, SPECIES[this.kind], this.pose, now, this.phase, blink);
      ctx.restore();
      this.canvas.style.transform = `translate3d(${this.x - W / 2}px, ${this.y - H + 3}px, 0) scaleX(${this.facing})`;

      if (this.pose === "sleep" && now > this.nextZ) {
        this.nextZ = now + 1400;
        const { x, y } = this.headPosition();
        effect("z", x + this.facing * 6, y - 6);
      }
    }
  }

  function effect(kind, x, y) {
    const node = el("span", { class: `critter-fx fx-${kind}`, text: kind === "z" ? "z" : "♥" });
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.addEventListener("animationend", () => node.remove());
    layer.append(node);
  }

  const pointer = { x: 0, y: 0, movedAt: 0, seen: false };
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.movedAt = performance.now();
    pointer.seen = true;
  });

  const ground = () => window.innerHeight - taskbar.offsetHeight + 2;

  let followers = [];
  let roamers = [];
  let lastHeart = 0;
  let frameId = 0;
  let last = 0;

  function create() {
    const floor = ground();
    if (GIL.finePointer) {
      followers = [new Critter("cat", 150, floor, 260), new Critter("dog", 96, floor, 235)];
    }
    roamers = [
      ["bunny", 0.35, 80],
      ["duck", 0.6, 42],
      ["fox", 0.85, 70],
    ].map(([kind, at, speed]) => {
      const critter = new Critter(kind, window.innerWidth * at, floor, speed);
      critter.targetX = critter.x;
      critter.restUntil = performance.now() + 1500 + Math.random() * 3000;
      return critter;
    });
  }

  function updateFollowers(dt, now) {
    const [cat, dog] = followers;
    if (!cat) return;
    const floor = ground();
    const quiet = now - pointer.movedAt;
    // the cat chases the pointer, the dog chases the cat
    const goals = [
      pointer.seen ? [pointer.x, Math.min(floor, pointer.y + 34)] : [cat.x, cat.y],
      [cat.x - cat.facing * 46, cat.y],
    ];
    followers.forEach((critter, i) => {
      const [gx, gy] = goals[i];
      const arrived = critter.walkTo(gx, gy, dt, now);
      if (arrived && critter.pose === "walk") critter.setPose("sit", now);
      if (critter.pose === "sit" && quiet > 8000 && now - critter.since > 2500) critter.setPose("sleep", now);
    });
    // a sleeping dog wakes up with the cat
    if (cat.pose !== "sleep" && dog.pose === "sleep") dog.setPose("sit", now);
  }

  function updateRoamers(dt, now) {
    const floor = ground();
    for (const critter of roamers) {
      critter.y = floor;
      if (critter.pose === "walk" || now > critter.restUntil) {
        if (critter.walkTo(critter.targetX, floor, dt, now)) {
          critter.setPose(critter.kind === "fox" && Math.random() < 0.3 ? "sleep" : "sit", now);
          critter.restUntil = now + (critter.pose === "sleep" ? 9000 : 1500 + Math.random() * 4000);
          critter.targetX = 40 + Math.random() * (window.innerWidth - 80);
        }
      }
    }
  }

  function petting(now) {
    if (now - pointer.movedAt > 120 || now - lastHeart < 260) return;
    for (const critter of [...followers, ...roamers]) {
      if (critter.pose === "walk") continue;
      const { x, y } = critter.headPosition();
      if (Math.hypot(pointer.x - x, pointer.y - y) < 26) {
        lastHeart = now;
        effect("heart", x, y - 10);
        return;
      }
    }
  }

  function frame(now) {
    const dt = Math.min(64, now - last);
    last = now;
    updateFollowers(dt, now);
    updateRoamers(dt, now);
    petting(now);
    for (const critter of [...followers, ...roamers]) critter.render(now);
    frameId = requestAnimationFrame(frame);
  }

  function start() {
    create();
    last = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(frameId);
    followers = [];
    roamers = [];
    layer.replaceChildren();
  }

  // pets start off for people who asked for less motion, but they can still turn them on
  const enabled = () => (store.get(STORE_KEY) ?? (GIL.reduceMotion ? "off" : "on")) === "on";

  function setEnabled(on) {
    store.set(STORE_KEY, on ? "on" : "off");
    stop();
    if (on) start();
  }

  GIL.critters = { enabled, setEnabled };
  if (enabled()) start();
})();
