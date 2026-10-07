(() => {
  const { el, store } = GIL;
  const layer = document.getElementById("critters");
  const taskbar = document.querySelector(".taskbar");
  const STORE_KEY = "gilos-pets";
  // a different handful comes out each visit; zoo.exe lists everyone
  const LINE_LENGTH = 10;
  const FLOOR_COUNT = GIL.mobile.matches ? 3 : 5;
  const FLYER_COUNT = GIL.mobile.matches ? 1 : 2;
  const HOLD_DELAY = 250; // ms the mouse button has to stay down before the line follows, so clicks don't count
  const HEAD_GAP = 30; // the front of the line stops this far from the cursor
  const HEAD_SPEED = 900; // px/s
  const WALK_SPEED = { crawl: 9, slither: 26, waddle: 30, scuttle: 36, hop: 62 };

  const ground = () => window.innerHeight - taskbar.offsetHeight + 1;
  const shuffle = (list) =>
    list
      .map((v) => [Math.random(), v])
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);

  // (x, y) is where the animal stands: bottom centre, or top centre for the sloth hanging from the top edge
  class Critter {
    constructor(animal, x, y) {
      this.animal = animal;
      this.size = animal.size;
      this.x = x;
      this.y = y;
      this.flip = 1; // the artwork faces left; -1 mirrors it to face right
      this.phase = 0;
      this.moving = false;
      this.seed = Math.random() * 100;
      this.hopAt = -Infinity;
      this.nextHop = performance.now() + 2000 + Math.random() * 9000;
      this.speed = WALK_SPEED[animal.gait] ?? 24 + this.size * 0.6;
      this.el = el("img", {
        class: `critter gait-${animal.gait}`,
        src: GIL.zoo.art(animal),
        alt: "",
        width: this.size,
        height: this.size,
        draggable: "false",
      });
      layer.append(this.el);
    }

    moveTo(x, y) {
      const dx = x - this.x;
      const distance = Math.hypot(dx, y - this.y);
      this.moving = distance > 0.25;
      if (Math.abs(dx) > 0.25 && this.animal.gait !== "scuttle") this.flip = dx > 0 ? -1 : 1;
      this.phase += distance / Math.max(4, this.size * 0.14); // bigger animals take longer strides
      this.x = x;
      this.y = y;
    }

    hop(now) {
      this.hopAt = now;
    }

    // per-frame bob, tilt and stretch for each way of moving
    pose(now) {
      const p = this.phase;
      const t = now / 1000 + this.seed;
      const gait = this.animal.gait;
      const rest = { dy: 0, rot: 0, skew: 0, sx: 1, sy: 1 };
      if (gait === "fly") {
        return {
          ...rest,
          dy: Math.sin(t * 3) * 4,
          rot: Math.sin(t * 2) * 6,
          sy: 1 - Math.abs(Math.sin(t * 16)) * 0.22,
        };
      }
      if (gait === "hang") return { ...rest, rot: Math.sin(t * 0.9) * 6 };
      const hopProgress = (now - this.hopAt) / 380;
      if (hopProgress < 1) return { ...rest, dy: -Math.sin(hopProgress * Math.PI) * 8 };
      if (!this.moving) {
        if (now > this.nextHop) {
          this.hop(now);
          this.nextHop = now + 4000 + Math.random() * 10000;
        }
        return { ...rest, sy: 1 + Math.sin(t * 2.2) * 0.025 };
      }
      switch (gait) {
        case "hop":
          return { ...rest, dy: -Math.abs(Math.sin(p)) * 10, rot: -Math.cos(p) * 7, sy: 1 + Math.sin(p * 2) * 0.07 };
        case "waddle":
          return { ...rest, dy: -Math.abs(Math.sin(p)) * 1.5, rot: Math.sin(p) * 10 };
        case "slither":
          return { ...rest, skew: Math.sin(p) * 12, sx: 1 + Math.sin(p) * 0.06 };
        case "crawl":
          return { ...rest, sx: 1 + Math.sin(p) * 0.05, sy: 1 - Math.sin(p) * 0.03 };
        case "scuttle":
          return { ...rest, dy: -Math.abs(Math.sin(p * 2)) * 1.5, rot: Math.sin(p * 2) * 4 };
        default:
          return { ...rest, dy: -Math.abs(Math.sin(p)) * 2.5, rot: Math.sin(p) * 4 };
      }
    }

    center() {
      return { x: this.x, y: this.animal.gait === "hang" ? this.y + this.size / 2 : this.y - this.size / 2 };
    }

    render(now) {
      const { dy, rot, skew, sx, sy } = this.pose(now);
      const top = this.animal.gait === "hang" ? this.y : this.y - this.size;
      // position goes in `translate` so the transform below scales and tilts around the animal itself
      this.el.style.translate = `${this.x - this.size / 2}px ${top + dy}px`;
      this.el.style.transform = `rotate(${rot}deg) skewX(${skew}deg) scale(${this.flip * sx}, ${sy})`;
    }
  }

  function effect(kind, x, y) {
    const node = el("span", { class: `critter-fx fx-${kind}`, text: kind === "z" ? "z" : "♥" });
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.addEventListener("animationend", () => node.remove());
    layer.append(node);
  }

  const pointer = { x: 0, y: 0, movedAt: 0, held: false };
  let holdTimer = 0;
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.movedAt = performance.now();
  });
  // the line only follows while the mouse button is held down
  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    holdTimer = setTimeout(() => (pointer.held = true), HOLD_DELAY);
  });
  const release = () => {
    clearTimeout(holdTimer);
    pointer.held = false;
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", release);

  let line = [];
  let floor = [];
  let flyers = [];
  let hangers = [];
  let trail = []; // where the front of the line has been, newest first
  const head = { x: 0, y: 0 };
  let lastHeart = 0;
  let frameId = 0;
  let last = 0;

  const all = () => [...floor, ...line, ...flyers, ...hangers];
  const gap = (a, b) => (a.size + b.size) * 0.42 + 2;
  const skyPoint = () => ({
    x: 40 + Math.random() * (window.innerWidth - 80),
    y: 70 + Math.random() * (ground() - 210),
  });

  function create() {
    const width = window.innerWidth;
    const y = ground();
    const walkers = shuffle(ANIMALS.filter((a) => a.gait !== "fly" && a.gait !== "hang"));
    // the line follows a mouse cursor; on touch screens everyone walks the floor instead
    const lineAnimals = GIL.finePointer ? walkers.slice(0, LINE_LENGTH) : [];
    const floorAnimals = walkers.slice(lineAnimals.length, lineAnimals.length + FLOOR_COUNT);

    floor = floorAnimals.map((animal, i) => {
      const c = new Critter(animal, ((i + 0.5) / floorAnimals.length) * width, y);
      c.targetX = c.x;
      c.restUntil = performance.now() + Math.random() * 4000;
      return c;
    });

    // the line starts out standing in a row along the floor, front animal on the right
    line = lineAnimals.map((animal) => new Critter(animal, 0, y));
    const length = line.reduce((sum, c, i) => sum + (i ? gap(line[i - 1], c) : c.size / 2), 0);
    head.x = Math.min(width * 0.6, length + 80);
    head.y = y;
    trail = [
      { x: head.x, y },
      { x: head.x - length - 60, y },
    ];

    flyers = shuffle(ANIMALS.filter((a) => a.gait === "fly"))
      .slice(0, FLYER_COUNT)
      .map((animal) => {
        const start = skyPoint();
        const c = new Critter(animal, start.x, start.y);
        c.vx = 0;
        c.vy = 0;
        c.target = skyPoint();
        c.retarget = 0;
        c.speed = animal.size < 26 ? 90 : 60;
        return c;
      });

    hangers = ANIMALS.filter((a) => a.gait === "hang").map((animal) => {
      const c = new Critter(animal, width * (0.2 + Math.random() * 0.6), -6);
      c.targetX = c.x;
      c.restUntil = 0;
      return c;
    });
  }

  function updateLine(dt) {
    if (!line.length) return;
    // while held, the front of the line heads for the cursor; once let go, it walks straight back down to the floor
    const goal = pointer.held ? { x: pointer.x, y: pointer.y, gap: HEAD_GAP } : { x: head.x, y: ground(), gap: 0 };
    const dx = goal.x - head.x;
    const dy = goal.y - head.y;
    const toGoal = Math.hypot(dx, dy);
    if (toGoal > goal.gap + 0.5) {
      const speed = pointer.held ? HEAD_SPEED : HEAD_SPEED * 0.6;
      const step = Math.min(toGoal - goal.gap, (speed * dt) / 1000);
      head.x += (dx / toGoal) * step;
      head.y += (dy / toGoal) * step;
    }
    // trail[0] always sits on the head; a new point is laid down every few pixels
    trail[0] = { x: head.x, y: head.y };
    if (Math.hypot(trail[0].x - trail[1].x, trail[0].y - trail[1].y) >= 4) trail.unshift({ x: head.x, y: head.y });

    // walk down the trail once, dropping each animal at its distance behind the head
    let segment = 0;
    let segmentStart = 0;
    let distance = 0;
    line.forEach((c, i) => {
      distance += i ? gap(line[i - 1], c) : c.size / 2;
      while (segment < trail.length - 1) {
        const a = trail[segment];
        const b = trail[segment + 1];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (distance <= segmentStart + length) break;
        segmentStart += length;
        segment++;
      }
      if (segment >= trail.length - 1) {
        const end = trail.at(-1);
        c.moveTo(end.x, end.y);
        return;
      }
      const a = trail[segment];
      const b = trail[segment + 1];
      const k = (distance - segmentStart) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
      c.moveTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
    });
    trail.length = Math.min(trail.length, segment + 3);
  }

  // walk to a random spot, rest a while, repeat
  function wander(c, dt, now, y, minX, maxX, rest) {
    if (now < c.restUntil) return c.moveTo(c.x, y);
    const dx = c.targetX - c.x;
    if (Math.abs(dx) < 2) {
      c.restUntil = now + rest();
      c.targetX = minX + Math.random() * (maxX - minX);
      return c.moveTo(c.x, y);
    }
    c.moveTo(c.x + Math.sign(dx) * Math.min(Math.abs(dx), (c.speed * dt) / 1000), y);
  }

  function updateFlyers(dt, now) {
    for (const c of flyers) {
      const dx = c.target.x - c.x;
      const dy = c.target.y - c.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < 24 || now > c.retarget) {
        c.target = skyPoint();
        c.retarget = now + 4000 + Math.random() * 7000;
      }
      c.vx += ((dx / distance) * c.speed - c.vx) * 0.02;
      c.vy += ((dy / distance) * c.speed - c.vy) * 0.02;
      // small insects flit up and down on top of their flight path
      const flit = c.size < 26 ? Math.sin(now / 110 + c.seed) * 40 : 0;
      c.moveTo(c.x + (c.vx * dt) / 1000, c.y + ((c.vy + flit) * dt) / 1000);
    }
  }

  function petting(now) {
    if (now - pointer.movedAt > 120 || now - lastHeart < 260) return;
    for (const c of all()) {
      if (c.moving) continue;
      const { x, y } = c.center();
      if (Math.hypot(pointer.x - x, pointer.y - y) < c.size * 0.55) {
        lastHeart = now;
        effect("heart", x, y - c.size / 2);
        return;
      }
    }
  }

  function frame(now) {
    const dt = Math.min(64, now - last);
    last = now;
    const y = ground();
    const width = window.innerWidth;
    updateLine(dt);
    for (const c of floor) wander(c, dt, now, y, 30, width - 30, () => 1500 + Math.random() * 5000);
    for (const c of hangers) wander(c, dt, now, -6, 60, width - 60, () => 6000 + Math.random() * 9000);
    updateFlyers(dt, now);
    petting(now);
    for (const c of all()) c.render(now);
    frameId = requestAnimationFrame(frame);
  }

  // Right-click (or long-press on touch) an animal for its bio. The animals don't take pointer
  // events, so left clicks still reach whatever is underneath; this hit-tests them by hand instead.
  function animalAt(x, y) {
    return all()
      .reverse()
      .find((c) => {
        const r = c.el.getBoundingClientRect();
        return x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4;
      });
  }

  function openBio(c) {
    c.hop(performance.now());
    const { x, y } = c.center();
    effect("heart", x, y - c.size / 2);
    GIL.zoo.showBio(c.animal, x + c.size / 2, y);
  }

  window.addEventListener("contextmenu", (e) => {
    const c = animalAt(e.clientX, e.clientY);
    if (!c) return;
    e.preventDefault();
    openBio(c);
  });

  // long-press on touch screens
  let press = null;
  let swallowClicksUntil = 0;
  const cancelPress = () => {
    if (press) clearTimeout(press.timer);
    press = null;
  };
  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    const c = animalAt(e.clientX, e.clientY);
    if (!c) return;
    press = { x: e.clientX, y: e.clientY, fired: false };
    press.timer = setTimeout(() => {
      press.fired = true;
      openBio(c);
    }, 500);
  });
  window.addEventListener("pointerup", () => {
    // the tap that ends a long-press shouldn't also click whatever is underneath
    if (press?.fired) swallowClicksUntil = performance.now() + 400;
    cancelPress();
  });
  window.addEventListener("pointercancel", cancelPress);
  window.addEventListener("pointermove", (e) => {
    if (press && !press.fired && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress();
  });
  window.addEventListener(
    "click",
    (e) => {
      if (performance.now() > swallowClicksUntil) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  function start() {
    create();
    last = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(frameId);
    line = [];
    floor = [];
    flyers = [];
    hangers = [];
    layer.replaceChildren();
  }

  // pets start off for people who asked for less motion, but they can still turn them on
  const enabled = () => (store.get(STORE_KEY) ?? (GIL.reduceMotion ? "off" : "on")) === "on";

  function setEnabled(on) {
    store.set(STORE_KEY, on ? "on" : "off");
    stop();
    if (on) start();
  }

  GIL.critters = { enabled, setEnabled, count: () => all().length };
  if (enabled()) start();
})();
