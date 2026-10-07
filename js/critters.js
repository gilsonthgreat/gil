(() => {
  const { el } = GIL;
  const layer = document.getElementById("critters");

  // One animal on screen: its sprite, position and how it's posed this frame. What it decides to do lives in habitat.js.
  // (x, y) is where it stands: bottom centre, or top centre while hanging (the sloth) or being carried.
  class Critter {
    constructor(animal, x, y) {
      this.animal = animal;
      this.size = animal.size;
      this.x = x;
      this.y = y;
      this.flip = 1; // the artwork faces left; -1 mirrors it to face right
      this.phase = 0;
      this.moving = false;
      this.mode = "idle"; // drives the pose: idle, walk, sleep, fight, held, fall, land, fly, perch, hang, climb
      this.modeAt = 0;
      this.nudge = 0; // sideways shove while fighting
      this.vx = 0;
      this.vy = 0;
      this.seed = Math.random() * 100;
      this.hopAt = -Infinity;
      this.el = el("img", {
        class: `critter gait-${animal.gait}`,
        src: GIL.zoo.art(animal),
        alt: "",
        width: this.size,
        height: this.size,
        draggable: "false",
      });
      this.el.critter = this;
      layer.append(this.el);
    }

    setMode(mode, now) {
      if (mode === this.mode) return;
      this.mode = mode;
      this.modeAt = now;
      this.el.classList.toggle("is-asleep", mode === "sleep");
      this.el.classList.toggle("is-held", mode === "held");
    }

    moveTo(x, y) {
      const dx = x - this.x;
      const distance = Math.hypot(dx, y - this.y);
      this.moving = distance > 0.25;
      if (Math.abs(dx) > 0.25) this.face(x);
      this.phase += distance / Math.max(4, this.size * 0.14); // bigger animals take longer strides
      this.x = x;
      this.y = y;
    }

    face(x) {
      if (this.animal.gait !== "scuttle" && Math.abs(x - this.x) > 0.25) this.flip = x > this.x ? -1 : 1;
    }

    hop(now) {
      this.hopAt = now;
    }

    hangs() {
      return this.mode === "hang" || this.mode === "climb" || this.mode === "held";
    }

    center() {
      return { x: this.x, y: this.hangs() ? this.y + this.size / 2 : this.y - this.size / 2 };
    }

    head() {
      const { x, y } = this.center();
      return { x: x - this.flip * this.size * 0.2, y: y - this.size * 0.5 };
    }

    // bob, tilt and stretch for this frame
    pose(now) {
      const p = this.phase;
      const t = now / 1000 + this.seed;
      const rest = { dy: 0, rot: 0, skew: 0, sx: 1, sy: 1 };
      // hopAt can be set slightly in the future so two animals hop one after the other
      const hopProgress = (now - this.hopAt) / 380;
      const hop = hopProgress >= 0 && hopProgress < 1 ? -Math.sin(hopProgress * Math.PI) * 8 : 0;
      switch (this.mode) {
        case "held":
          // dangling: swings against the direction it's carried and paddles its legs
          return { ...rest, rot: Math.max(-28, Math.min(28, -this.vx * 0.04)) + Math.sin(t * 14) * 5, sy: 1.04 };
        case "fall":
          return { ...rest, rot: Math.max(-20, Math.min(20, this.vx * 0.03)), sy: 1.06 };
        case "sleep":
          return { ...rest, dy: 1, sx: 1.06, sy: 0.84 + Math.sin(t * 1.6) * 0.02 };
        case "fight":
          return {
            ...rest,
            dy: -Math.abs(Math.sin(t * 18)) * 4,
            rot: Math.sin(t * 22) * 10,
            skew: Math.sin(t * 25) * 6,
          };
        case "land": {
          const k = Math.min(1, (now - this.modeAt) / 260);
          return { ...rest, sx: 1.25 - k * 0.25, sy: 0.72 + k * 0.28 };
        }
        case "fly":
          return {
            ...rest,
            dy: Math.sin(t * 3) * 4,
            rot: Math.sin(t * 2) * 6,
            sy: 1 - Math.abs(Math.sin(t * 16)) * 0.22,
          };
        case "perch":
          return { ...rest, dy: hop, sy: 1 + Math.sin(t * 2.2) * 0.025 };
        case "hang":
          return { ...rest, rot: Math.sin(t * 0.9) * 6 };
        case "climb":
          return { ...rest, rot: Math.sin(t * 6) * 9 };
      }
      if (!this.moving) return { ...rest, dy: hop, sy: 1 + Math.sin(t * 2.2) * 0.025 };
      switch (this.animal.gait) {
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

    render(now) {
      const { dy, rot, skew, sx, sy } = this.pose(now);
      // the emoji art leaves a couple of pixels empty under the feet, so standing animals sit that much lower
      const top = this.hangs() ? this.y : this.y - this.size + 2;
      // position goes in `translate` so the transform below scales and tilts around the animal itself
      this.el.style.translate = `${this.x - this.size / 2 + this.nudge}px ${top + dy}px`;
      this.el.style.transform = `rotate(${rot}deg) skewX(${skew}deg) scale(${this.flip * sx}, ${sy})`;
    }

    remove() {
      this.el.remove();
    }
  }

  // little floating reactions: hearts, z's, "!", fight dust, skunk spray, words like "rawr"
  const SYMBOLS = { heart: "♥", z: "z", bang: "!", dust: "✦", spray: "~", huh: "?" };
  function emote(kind, x, y, text) {
    const node = el("span", { class: `critter-fx fx-${kind}`, text: text ?? SYMBOLS[kind] });
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.addEventListener("animationend", () => node.remove());
    layer.append(node);
  }

  GIL.Critter = Critter;
  GIL.emote = emote;
})();
