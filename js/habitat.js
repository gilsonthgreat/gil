(() => {
  const { store, Critter, emote } = GIL;
  const layer = document.getElementById("critters");
  const taskbar = document.querySelector(".taskbar");
  const STORE_KEY = "gilos-pets";
  const GROUND_COUNT = GIL.mobile.matches ? 5 : 12;
  const FLYER_COUNT = GIL.mobile.matches ? 2 : 6;
  const GRAVITY = 2200; // px/s²
  const WALK_SPEED = { crawl: 9, slither: 26, waddle: 30, scuttle: 36, hop: 62 };

  // Personalities: who leans towards play-fights, who likes napping in a pile, and who chases whom.
  // prettier-ignore
  const FEISTY = new Set([
    "goat", "rhinoceros", "kangaroo", "rooster", "crab", "tiger", "leopard", "gorilla", "t-rex", "hippopotamus",
    "badger", "skunk", "zebra", "deer", "horse", "goose", "cat", "black-cat", "chipmunk", "cricket",
  ]);
  // prettier-ignore
  const SNUGGLY = new Set([
    "otter", "penguin", "ewe", "cow", "pig", "rabbit", "mouse", "hedgehog", "dog", "poodle", "cat", "black-cat",
    "llama", "elephant", "duck", "beaver", "baby-chick", "goose", "orangutan", "mammoth",
  ]);
  const CHASES = {
    cat: ["mouse", "cricket", "baby-chick"],
    "black-cat": ["mouse", "cricket"],
    dog: ["cat", "black-cat", "rabbit", "duck"],
    poodle: ["cat", "black-cat"],
    tiger: ["deer", "zebra", "pig"],
    leopard: ["deer", "chipmunk"],
    "t-rex": ["goat", "dodo", "pig"],
    rooster: ["cricket"],
  };
  // prettier-ignore
  const SAYS = {
    "t-rex": "rawr", rooster: "cock-a-doodle-doo", goose: "honk", dog: "woof", poodle: "yip", cat: "mrrp",
    "black-cat": "mrrp", cow: "moo", pig: "oink", duck: "quack", ewe: "baa", goat: "meh", mouse: "squeak",
    horse: "neigh", cricket: "chirp", "baby-chick": "peep", elephant: "toot", llama: "hmm", owl: "hoo",
  };

  const rand = (min, max) => min + Math.random() * (max - min);
  const chance = (p) => Math.random() < p;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const shuffle = (list) =>
    list
      .map((v) => [Math.random(), v])
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  const ground = () => window.innerHeight - taskbar.offsetHeight + 1;
  const isNight = () => {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
  };
  const speedOf = (animal) => WALK_SPEED[animal.gait] ?? 24 + animal.size * 0.6;

  let walkers = [];
  let flyers = [];
  let hangers = [];
  let flock = [];
  let frameId = 0;
  let last = 0;
  let nextFlock = 0;
  let surfaces = new Map(); // things to stand on: the floor and the top edge of each open window
  let undersides = []; // things to hang from: the top of the screen and the bottom edge of each window
  let followers = [];

  const all = () => [...walkers, ...flyers, ...hangers, ...flock];
  const following = () => all().filter((c) => c.task.kind === "follow");

  // where the cursor (or the last touch) is and which way it's heading, for the animals following it
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, dx: 1, dy: 0, movedAt: -Infinity };

  function updateWorld() {
    const width = window.innerWidth;
    surfaces = new Map([["floor", { id: "floor", x1: 0, x2: width, y: ground() }]]);
    undersides = [{ id: "ceiling", x1: 0, x2: width, y: -6 }];
    for (const r of GIL.desktop.rects()) {
      surfaces.set(r.id, { id: r.id, x1: r.x + 4, x2: r.x + r.width - 4, y: r.y });
      undersides.push({ id: r.id, x1: r.x + 4, x2: r.x + r.width - 4, y: r.y + r.height });
    }
  }

  // kind "word" shows the text (an animal sound); every other kind shows its own symbol
  function say(c, kind, text) {
    const { x, y } = c.head();
    emote(kind, x, y, kind === "word" ? text : undefined);
  }

  // Walking along a surface. relX is measured from the surface's left end, so animals ride along with a dragged window.
  function walk(c, s, x, speed, dt) {
    const margin = c.size * 0.3;
    const goal = Math.max(s.x1 + margin, Math.min(x, s.x2 - margin)) - s.x1;
    const dx = goal - c.relX;
    if (Math.abs(dx) < 1.5) return true;
    c.relX += Math.sign(dx) * Math.min(Math.abs(dx), (speed * dt) / 1000);
    c.moveTo(s.x1 + c.relX, s.y);
    return false;
  }

  /* ---- ground animals ---- */

  // ends whatever c was doing with someone else, so the other one doesn't wait forever
  function leave(c, now) {
    const partner = c.task?.partner;
    if (partner?.task?.partner === c) {
      if (partner.task.kind === "sleep") partner.task.partner = null;
      else {
        partner.task = { kind: "idle", until: now + 1200 };
        say(partner, "huh");
      }
    }
  }

  function think(c, now) {
    const s = surfaces.get(c.surface);
    const near = walkers.filter((o) => o !== c && o.surface === c.surface && Math.abs(o.x - c.x) < 380);
    const free = near.filter((o) => (o.task.kind === "idle" || o.task.kind === "walk") && !o.task.partner);
    const sleeper = near.find((o) => o.task.kind === "sleep" && !o.task.partner);
    const sleepy = isNight() ? 0.3 : 0.1;
    const r = Math.random();
    if (sleeper && SNUGGLY.has(c.animal.id) && r < 0.4) return approach(c, sleeper, "cuddle", now);
    if (r < sleepy) return sleep(c, now);
    if (free.length && r < sleepy + 0.32) return socialise(c, pick(free), now);
    if (r < sleepy + 0.52) {
      c.task = { kind: "idle", until: now + rand(1500, 4500) };
      return;
    }
    // wander; animals up on a window sometimes walk off the end and drop down
    const hopDown = c.surface !== "floor" && chance(0.3);
    const x = hopDown ? (chance(0.5) ? s.x1 - 30 : s.x2 + 30) : rand(s.x1, s.x2);
    c.task = { kind: "walk", x, hopDown };
  }

  function sleep(c, now, until = now + rand(9000, 18000), partner = null) {
    c.task = { kind: "sleep", until, partner, nextZ: now + 600 };
  }

  function socialise(c, o, now) {
    if (CHASES[c.animal.id]?.includes(o.animal.id)) return chase(c, o, now);
    if (CHASES[o.animal.id]?.includes(c.animal.id)) return chase(o, c, now);
    const feisty = FEISTY.has(c.animal.id) || FEISTY.has(o.animal.id);
    const snuggly = SNUGGLY.has(c.animal.id) && SNUGGLY.has(o.animal.id);
    const plan = feisty && chance(0.55) ? "fight" : snuggly && chance(0.5) ? "cuddle" : "greet";
    approach(c, o, plan, now);
  }

  function approach(c, o, plan, now) {
    c.task = { kind: "approach", partner: o, plan, until: now + 7000 };
    if (o.task.kind === "sleep") o.task.partner = c;
    else o.task = { kind: "wait", partner: c, until: now + 7000 };
  }

  function begin(c, o, plan, now) {
    c.face(o.x);
    o.face(c.x);
    if (plan === "greet") {
      c.task = { kind: "greet", partner: o, until: now + 1600 };
      o.task = { kind: "greet", partner: c, until: now + 1600 };
      c.hop(now);
      o.hop(now + 260);
      say(c, SAYS[c.animal.id] && chance(0.5) ? "word" : "heart", SAYS[c.animal.id]);
      if (chance(0.6)) setTimeout(() => say(o, SAYS[o.animal.id] ? "word" : "bang", SAYS[o.animal.id]), 350);
    } else if (plan === "fight") {
      c.task = { kind: "fight", partner: o, leader: true, started: now, until: now + 2600, nextDust: now };
      o.task = { kind: "fight", partner: c, leader: false };
      say(c, SAYS[c.animal.id] && chance(0.5) ? "word" : "bang", SAYS[c.animal.id]);
    } else {
      const until = Math.max(now + rand(10000, 18000), o.task.kind === "sleep" ? o.task.until : 0);
      sleep(c, now, until, o);
      sleep(o, now, until, c);
      say(c, "heart");
    }
  }

  function chase(chaser, prey, now) {
    const until = now + rand(3500, 5000);
    leave(chaser, now);
    leave(prey, now);
    chaser.task = { kind: "chase", partner: prey, until };
    prey.task = { kind: "flee", from: chaser, partner: chaser, until };
    say(chaser, SAYS[chaser.animal.id] ? "word" : "bang", SAYS[chaser.animal.id]);
    say(prey, "bang");
  }

  function flee(c, from, now) {
    c.task = { kind: "flee", from, until: now + rand(1600, 2400) };
    say(c, "bang");
  }

  function settleFight(c, o, now) {
    // bigger animals win more often, but not always
    const [winner, loser] = chance(c.size / (c.size + o.size)) ? [c, o] : [o, c];
    winner.task = { kind: "idle", until: now + 1500 };
    winner.hop(now);
    say(winner, SAYS[winner.animal.id] ? "word" : "bang", SAYS[winner.animal.id]);
    flee(loser, winner, now);
  }

  function fall(c, vx, vy, now) {
    leave(c, now);
    c.task = { kind: "fall", from: c.y };
    c.surface = null;
    c.vx = vx;
    c.vy = vy;
    c.setMode("fall", now);
  }

  function updateFall(c, dt, now) {
    const s = dt / 1000;
    const half = c.size / 2;
    const width = window.innerWidth;
    const prevY = c.y;
    c.vy += GRAVITY * s;
    let x = c.x + c.vx * s;
    const y = c.y + c.vy * s;
    if (x < half || x > width - half) {
      x = Math.max(half, Math.min(width - half, x));
      c.vx *= -0.5;
    }
    if (y - c.size < 0 && c.vy < 0) c.vy *= -0.3;
    // land on the first surface it passes through on the way down
    if (c.vy > 0) {
      let landing = null;
      for (const surface of surfaces.values()) {
        if (x < surface.x1 || x > surface.x2 || prevY > surface.y + 1 || y < surface.y) continue;
        if (!landing || surface.y < landing.y) landing = surface;
      }
      if (landing) {
        const drop = landing.y - c.task.from;
        c.surface = landing.id;
        c.relX = x - landing.x1;
        c.x = x;
        c.y = landing.y;
        c.vx = 0;
        c.vy = 0;
        c.task = { kind: "land", until: now + 300 };
        c.setMode("land", now);
        if (drop > 220) say(c, "bang");
        return;
      }
    }
    c.x = x;
    c.y = y;
  }

  function updateWalker(c, dt, now) {
    const task = c.task;
    c.nudge = 0;
    if (task.kind === "follow") return updateFollower(c, dt, now);
    c.moving = false;
    if (task.kind === "held") return;
    if (task.kind === "fall") return updateFall(c, dt, now);
    const s = surfaces.get(c.surface);
    if (!s) return fall(c, 0, 0, now); // its window was closed or minimised
    c.x = s.x1 + c.relX;
    c.y = s.y;
    const partner = task.partner;
    const together = partner && partner.task.partner === c && partner.surface === c.surface;

    switch (task.kind) {
      case "idle":
      case "wait":
        c.setMode("idle", now);
        if (task.kind === "wait" && together) c.face(partner.x);
        if (now > task.until) {
          if (task.kind === "wait") leave(c, now);
          think(c, now);
        }
        break;
      case "walk":
        c.setMode("walk", now);
        if (walk(c, s, task.x, speedOf(c.animal), dt)) {
          if (task.hopDown) return fall(c, Math.sign(task.x - c.x) * 90, -260, now);
          think(c, now);
        }
        break;
      case "land":
        if (now > task.until) {
          c.setMode("idle", now);
          think(c, now);
        }
        break;
      case "sleep":
        c.setMode("sleep", now);
        if (now > task.nextZ) {
          task.nextZ = now + 1400;
          say(c, "z");
        }
        if (now > task.until) {
          c.task = { kind: "idle", until: now + 1200 };
          c.hop(now);
        }
        break;
      case "approach": {
        c.setMode("walk", now);
        if (!together || now > task.until) {
          leave(c, now);
          c.task = { kind: "idle", until: now + 1000 };
          break;
        }
        const side = c.x < partner.x ? -1 : 1;
        const gap = (c.size + partner.size) * (task.plan === "cuddle" ? 0.3 : task.plan === "fight" ? 0.36 : 0.45);
        if (walk(c, s, partner.x + side * gap, speedOf(c.animal) * 1.3, dt)) begin(c, partner, task.plan, now);
        break;
      }
      case "greet":
        c.setMode("idle", now);
        if (now > task.until) think(c, now);
        break;
      case "fight": {
        if (!together) {
          c.task = { kind: "idle", until: now + 1000 };
          break;
        }
        c.setMode("fight", now);
        c.face(partner.x);
        c.nudge = Math.sin(now / 45 + c.seed) * 3 * (c.x < partner.x ? 1 : -1);
        if (!task.leader) break;
        // the leader runs the dust and the ending, so they only happen once per fight
        if (now > task.nextDust) {
          task.nextDust = now + 140;
          emote("dust", (c.x + partner.x) / 2 + rand(-12, 12), c.y - rand(8, 34));
        }
        const skunk = [c, partner].find((o) => o.animal.id === "skunk");
        if (skunk && now > task.started + 900) {
          // a skunk ends any fight its own way
          const other = skunk === c ? partner : c;
          for (let i = 0; i < 5; i++) emote("spray", skunk.x + rand(-20, 20), skunk.y - rand(5, 30));
          skunk.task = { kind: "idle", until: now + 1500 };
          flee(other, skunk, now);
        } else if (now > task.until) settleFight(c, partner, now);
        break;
      }
      case "chase":
        c.setMode("walk", now);
        if (!together || now > task.until) {
          if (now > task.until) say(c, "huh");
          leave(c, now);
          c.task = { kind: "idle", until: now + 1500 };
          break;
        }
        if (
          walk(c, s, partner.x, Math.max(70, speedOf(c.animal) * 1.7), dt) ||
          Math.abs(c.x - partner.x) < (c.size + partner.size) * 0.35
        ) {
          // caught it: no harm done, they just say hi
          say(c, "heart");
          begin(c, partner, "greet", now);
        }
        break;
      case "flee": {
        c.setMode("walk", now);
        const away = Math.sign(c.x - task.from.x) || 1;
        const stuck = walk(c, s, c.x + away * 400, Math.max(80, speedOf(c.animal) * 1.9), dt);
        if (stuck && c.surface !== "floor") return fall(c, away * 120, -240, now); // jumps off the window to get away
        // cornered against the edge of the screen: a chased animal waits to be caught, a beaten one just stops
        if (now > task.until || (stuck && !task.partner)) {
          if (task.partner) leave(c, now);
          c.task = { kind: "idle", until: now + 1200 };
        }
        break;
      }
    }
  }

  /* ---- flyers ---- */

  function planFlight(c, now) {
    if (chance(0.3)) {
      // land somewhere for a bit: the floor or the top of a window
      const s = pick([...surfaces.values()]);
      c.task = { kind: "fly", perch: s.id, relX: rand(0.1, 0.9) * (s.x2 - s.x1), until: now + 10000 };
    } else {
      c.task = {
        kind: "fly",
        x: rand(40, window.innerWidth - 40),
        y: rand(70, ground() - 160),
        until: now + rand(4000, 9000),
      };
    }
  }

  function updateFlyer(c, dt, now) {
    const task = c.task;
    if (task.kind === "follow") return updateFollower(c, dt, now);
    if (task.kind === "held") return;
    if (task.kind === "perch") {
      const s = surfaces.get(c.surface);
      if (!s || now > task.until) return planFlight(c, now);
      c.setMode("perch", now);
      c.x = s.x1 + c.relX;
      c.y = s.y;
      return;
    }
    c.setMode("fly", now);
    let tx = task.x;
    let ty = task.y;
    if (task.perch) {
      const s = surfaces.get(task.perch);
      if (!s) return planFlight(c, now);
      tx = s.x1 + task.relX;
      ty = s.y;
    }
    const dx = tx - c.x;
    const dy = ty - c.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < (task.perch ? 6 : 24) || now > task.until) {
      if (task.perch && distance < 6) {
        c.surface = task.perch;
        c.relX = task.relX;
        c.task = { kind: "perch", until: now + rand(4000, 9000) };
        c.vx = c.vy = 0;
      } else planFlight(c, now);
      return;
    }
    const speed = c.animal.size < 26 ? 90 : 65;
    c.vx += ((dx / distance) * speed - c.vx) * 0.03;
    c.vy += ((dy / distance) * speed - c.vy) * 0.03;
    // small insects flit up and down on top of their flight path
    const flit = c.size < 26 && !task.perch ? Math.sin(now / 110 + c.seed) * 40 : 0;
    c.moveTo(c.x + (c.vx * dt) / 1000, c.y + ((c.vy + flit) * dt) / 1000);
  }

  // every so often a small flock crosses the screen
  function updateFlock(dt, now) {
    if (now > nextFlock) {
      nextFlock = now + rand(22000, 40000);
      const species = pick(ANIMALS.filter((a) => ["dove", "bird", "black-bird", "parrot", "eagle"].includes(a.id)));
      const fromLeft = chance(0.5);
      const count = species.id === "eagle" ? 1 : 3 + Math.floor(Math.random() * 3);
      const y = rand(60, ground() * 0.45);
      for (let i = 0; i < count; i++) {
        const rank = Math.ceil(i / 2);
        const side = i % 2 ? 1 : -1;
        const c = new Critter(
          species,
          fromLeft ? -40 - rank * 34 : window.innerWidth + 40 + rank * 34,
          y + side * rank * 16,
        );
        c.task = { kind: "pass", vx: (fromLeft ? 1 : -1) * (species.id === "eagle" ? 90 : 120) };
        c.setMode("fly", now);
        flock.push(c);
      }
    }
    for (const c of flock) {
      if (c.task.kind !== "pass") continue;
      c.moveTo(c.x + (c.task.vx * dt) / 1000, c.y + Math.sin(now / 400 + c.seed) * 0.3);
    }
    flock = flock.filter((c) => {
      const gone = c.task.kind === "pass" && (c.x < -200 || c.x > window.innerWidth + 200);
      if (gone) c.remove();
      return !gone;
    });
  }

  /* ---- the sloth ---- */

  // the lowest thing above it that it can grab: a window's bottom edge, or the top of the screen
  function undersideAbove(c) {
    let best = undersides[0];
    for (const u of undersides) if (c.x >= u.x1 && c.x <= u.x2 && u.y <= c.y + 2 && u.y > best.y) best = u;
    return best;
  }

  function updateHanger(c, dt, now) {
    const task = c.task;
    if (task.kind === "follow") return updateFollower(c, dt, now);
    if (task.kind === "held") return;
    if (task.kind === "climb") {
      const u = undersideAbove(c);
      c.setMode("climb", now);
      const step = (70 * dt) / 1000;
      if (c.y - step <= u.y) {
        c.surface = u.id;
        c.relX = c.x - u.x1;
        c.task = { kind: "hang", until: now + rand(3000, 8000), x: c.x };
      } else c.y -= step;
      return;
    }
    const u = undersides.find((o) => o.id === c.surface);
    if (!u) {
      c.task = { kind: "climb" };
      return;
    }
    c.setMode("hang", now);
    c.x = u.x1 + c.relX;
    c.y = u.y;
    if (now > task.until && walk(c, u, task.x, 10, dt)) {
      c.task = { kind: "hang", until: now + rand(6000, 14000), x: rand(u.x1, u.x2) };
    }
  }

  /* ---- following the cursor ---- */

  function follow(c, now) {
    leave(c, now);
    if (flock.includes(c)) {
      flock = flock.filter((o) => o !== c);
      flyers.push(c);
    }
    const gait = c.animal.gait;
    c.surface = null;
    c.task = {
      kind: "follow",
      state: "trail", // trail: keeping up; inspect: checking out the still cursor; rest: lying down next to it
      lag: rand(0, 50), // how far back it hangs, so a few followers spread out
      side: chance(0.5) ? 1 : -1, // which side of the cursor's path it keeps to
      spin: chance(0.5) ? 1 : -1, // which way flyers circle the cursor
      radius: 58 + c.size + rand(0, 30),
    };
    c.setMode(gait === "fly" ? "fly" : gait === "hang" ? "climb" : "walk", now);
    c.el.classList.add("is-following");
    c.hop(now);
    say(c, "heart");
  }

  function unfollow(c, now) {
    c.el.classList.remove("is-following");
    if (c.animal.gait === "fly") planFlight(c, now);
    else if (c.animal.gait === "hang") c.task = { kind: "climb" };
    else fall(c, c.vx * 0.3, c.vy * 0.3, now); // back down to whatever is underneath
  }

  // checking out the cursor: a puzzled "?", its own sound, a pounce, or going round to look from the other side
  function inspect(c, task, now) {
    const r = Math.random();
    if (r < 0.3) say(c, "huh");
    else if (r < 0.5) say(c, SAYS[c.animal.id] ? "word" : "heart", SAYS[c.animal.id]);
    else if (r < 0.8) c.hop(now);
    else task.look *= -1;
  }

  function updateFollower(c, dt, now) {
    const task = c.task;
    const s = dt / 1000;
    const flying = c.animal.gait === "fly";
    const sloth = c.animal.gait === "hang";
    const still = !sloth && now - pointer.movedAt > 450;
    const centre = c.center();
    let tx;
    let ty;
    if (flying) {
      // circles the cursor from wherever it is, so it goes round it rather than across it; now and then turns back
      if (chance(s * 0.15)) task.spin *= -1;
      const angle = Math.atan2((centre.y - pointer.y) / 0.6, centre.x - pointer.x) + task.spin * 0.6;
      tx = pointer.x + Math.cos(angle) * task.radius;
      ty = pointer.y + Math.sin(angle) * task.radius * 0.6;
    } else if (!still) {
      if (task.state === "rest") say(c, "bang"); // woken up
      task.state = "trail";
      // a spot back along the way the cursor is going, a little off to one side
      const back = c.size * 0.8 + 26 + task.lag;
      tx = pointer.x - pointer.dx * back - pointer.dy * task.side * 14;
      ty = pointer.y - pointer.dy * back + pointer.dx * task.side * 14;
    } else {
      if (task.state === "trail") {
        task.state = "inspect";
        task.since = now;
        task.look = Math.sign(centre.x - pointer.x) || 1; // stays on the side it came from
        task.nextAct = now + rand(900, 1800);
      }
      if (task.state === "inspect" && now - task.since > 9000) {
        task.state = "rest";
        task.nextZ = now + 1500;
      }
      // nose right up to the cursor without touching it
      tx = pointer.x + task.look * (c.size * 0.5 + 10);
      ty = pointer.y + c.size * 0.15;
    }
    if (!flying) {
      // don't pile up on other followers
      for (const o of followers) {
        if (o === c || o.animal.gait === "fly") continue;
        const other = o.center();
        const gap = (c.size + o.size) * 0.45;
        const d = Math.hypot(centre.x - other.x, centre.y - other.y) || 1;
        if (d < gap) {
          tx += ((centre.x - other.x) / d) * (gap - d);
          ty += ((centre.y - other.y) / d) * (gap - d);
        }
      }
    }
    const half = c.size / 2;
    tx = Math.max(half, Math.min(window.innerWidth - half, tx));
    ty = Math.max(half, Math.min(ground() - half, ty));

    // sprints when far behind and eases in as it gets close
    const dx = tx - centre.x;
    const dy = ty - centre.y;
    const distance = Math.hypot(dx, dy);
    const want = Math.min(sloth ? 40 : flying ? 560 : 820, distance * (flying ? 4 : 6));
    const grip = Math.min(1, s * (flying ? 5 : 9));
    c.vx += ((distance ? (dx / distance) * want : 0) - c.vx) * grip;
    c.vy += ((distance ? (dy / distance) * want : 0) - c.vy) * grip;
    const speed = Math.hypot(c.vx, c.vy);
    c.moving = speed > 14;
    c.phase += (speed * s) / Math.max(4, c.size * 0.14);
    let x = centre.x + c.vx * s;
    let y = centre.y + c.vy * s;
    if (flying) {
      // never closer than this, even when the cursor comes straight at it: it gets pushed along instead
      const min = 44 + c.size * 0.6;
      const away = Math.hypot(x - pointer.x, y - pointer.y) || 1;
      if (away < min) {
        x = pointer.x + ((x - pointer.x) / away) * min;
        y = pointer.y + ((y - pointer.y) / away) * min;
      }
    }
    c.x = x;
    c.y = y + (c.hangs() ? -half : half);
    if (task.state !== "trail" && !flying && distance < 30) c.flip = pointer.x > c.x ? -1 : 1;
    else if (Math.abs(c.vx) > 30 && c.animal.gait !== "scuttle") c.flip = c.vx > 0 ? -1 : 1;

    if (flying || sloth) return;
    if (task.state === "rest" && distance < 20) {
      c.setMode("sleep", now);
      if (now > task.nextZ) {
        task.nextZ = now + 1400;
        say(c, "z");
      }
    } else if (task.state === "inspect" && distance < 20) {
      c.setMode("sniff", now);
      if (now > task.nextAct) {
        task.nextAct = now + rand(1400, 2800);
        inspect(c, task, now);
      }
    } else c.setMode("walk", now);
  }

  window.addEventListener(
    "pointermove",
    (e) => {
      const dx = e.clientX - pointer.x;
      const dy = e.clientY - pointer.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.5) return;
      // smoothed, so "behind the cursor" doesn't swing around with every wobble
      const nx = pointer.dx * 0.85 + (dx / d) * 0.15;
      const ny = pointer.dy * 0.85 + (dy / d) * 0.15;
      const n = Math.hypot(nx, ny) || 1;
      pointer.dx = nx / n;
      pointer.dy = ny / n;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.movedAt = performance.now();
    },
    { passive: true },
  );

  // a click next to an animal that's checking out the cursor startles it
  window.addEventListener(
    "pointerdown",
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (e.target.critter) return;
      const now = performance.now();
      for (const c of followers) {
        if (c.task.state === "trail" || c.animal.gait === "fly") continue;
        if (Math.hypot(c.x - e.clientX, c.center().y - e.clientY) > 160) continue;
        c.hop(now);
        say(c, "bang");
        c.task.state = "inspect";
        c.task.since = now;
      }
    },
    { passive: true },
  );

  /* ---- picking animals up ---- */

  let press = null;

  function pickUp(c, now) {
    leave(c, now);
    c.el.classList.remove("is-following"); // putting it down somewhere is a way of telling it to stay
    c.task = { kind: "held", from: c.task.kind };
    c.surface = null;
    c.setMode("held", now);
    say(c, "bang");
  }

  function drop(c, vx, vy, now) {
    if (flock.includes(c)) {
      flock = flock.filter((o) => o !== c);
      flyers.push(c); // a flock bird that's been handled stays
    }
    if (c.animal.gait === "fly") {
      c.y += c.size; // from hanging off the cursor back to flying coordinates
      c.vx = vx * 0.3;
      c.vy = vy * 0.3;
      planFlight(c, now);
    } else if (c.animal.gait === "hang") {
      c.task = { kind: "climb" };
    } else {
      // the critter hangs from the cursor by its top; switch to standing coordinates before it falls
      c.y += c.size;
      fall(c, Math.max(-1500, Math.min(1500, vx)), Math.max(-1500, Math.min(1500, vy)), now);
    }
  }

  function velocity() {
    const recent = press.samples.filter((s) => press.samples.at(-1).t - s.t < 100);
    const a = recent[0];
    const b = press.samples.at(-1);
    const dt = (b.t - a.t) / 1000 || 1;
    return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
  }

  function finishPress(e) {
    if (!press || e.pointerId !== press.id) return;
    clearTimeout(press.timer);
    const { c } = press;
    const now = performance.now();
    if (press.carrying) {
      // the release itself counts as a sample, so holding still before letting go drops it instead of throwing it
      press.samples.push({ x: e.clientX, y: e.clientY, t: now });
      const { vx, vy } = velocity();
      drop(c, vx, vy, now);
    } else if (e.type === "pointerup" && now - press.at < 500) {
      // a quick click is a boop
      c.hop(now);
      say(c, SAYS[c.animal.id] && chance(0.4) ? "word" : "heart", SAYS[c.animal.id]);
    }
    press = null;
  }

  layer.addEventListener("pointerdown", (e) => {
    const c = e.target.critter;
    if (!c || e.button !== 0) return;
    e.preventDefault();
    const now = performance.now();
    press = {
      c,
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      at: now,
      touch: e.pointerType !== "mouse",
      carrying: false,
      samples: [{ x: e.clientX, y: e.clientY, t: now }],
    };
    c.el.setPointerCapture(e.pointerId);
    if (press.touch) {
      // on touch screens, holding still on an animal opens its menu
      press.timer = setTimeout(() => {
        if (press?.c === c && !press.carrying) {
          openMenu(c, press.x, press.y, true);
          press = null;
        }
      }, 550);
    }
  });

  layer.addEventListener("pointermove", (e) => {
    const now = performance.now();
    if (!press) {
      // stroking a resting animal makes hearts
      const c = e.target.critter;
      if (c && e.pointerType === "mouse" && !c.moving && now - (c.pettedAt ?? 0) > 450) {
        c.pettedAt = now;
        say(c, "heart");
      }
      return;
    }
    if (e.pointerId !== press.id) return;
    press.samples.push({ x: e.clientX, y: e.clientY, t: now });
    if (press.samples.length > 12) press.samples.shift();
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    if (!press.carrying && moved > (e.pointerType === "mouse" ? 4 : 8)) {
      press.carrying = true;
      clearTimeout(press.timer);
      pickUp(press.c, now);
    }
    if (press.carrying) {
      const c = press.c;
      c.vx = velocity().vx;
      c.x = e.clientX;
      c.y = e.clientY + 4; // held by the scruff, just under the cursor
    }
  });

  layer.addEventListener("pointerup", finishPress);
  layer.addEventListener("pointercancel", finishPress);
  layer.addEventListener("lostpointercapture", finishPress);

  /* ---- the right-click menu ---- */

  const menu = document.getElementById("critter-menu");
  const [followItem, bioItem, everyoneItem] = menu.querySelectorAll("button");
  let menuFor = null;
  let menuAt = 0;

  function openMenu(c, x, y, touch) {
    GIL.zoo.hideBio();
    menuFor = c;
    menuAt = performance.now();
    c.hop(menuAt);
    document.getElementById("critter-menu-name").textContent = c.animal.name;
    followItem.lastElementChild.textContent = c.task.kind === "follow" ? "stop following" : "follow me";
    bioItem.lastElementChild.textContent = `about the ${c.animal.name.toLowerCase()}`;
    everyoneItem.hidden = following().length < 2;
    menu.hidden = false;
    const width = menu.offsetWidth; // not the bounding box, which is mid pop-in animation here
    const height = menu.offsetHeight;
    // with a finger it opens above the touch, so lifting the finger doesn't land on an item
    let left = x + 6;
    let top = touch ? y - height - 28 : y + 6;
    if (left + width > window.innerWidth - 8) left = x - width - 6;
    if (top + height > window.innerHeight - 8) top = y - height - 6;
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  }

  function closeMenu() {
    menu.hidden = true;
    menuFor = null;
  }

  layer.addEventListener("contextmenu", (e) => {
    const c = e.target.critter;
    if (!c) return;
    e.preventDefault();
    // some phones send this on a long press too; the press timer may already have opened the menu
    if (menuFor === c && performance.now() - menuAt < 1000) return;
    const touch = press?.c === c && press.touch;
    if (touch) {
      clearTimeout(press.timer);
      press = null;
    }
    openMenu(c, e.clientX, e.clientY, touch);
  });

  menu.addEventListener("click", (e) => {
    const item = e.target.closest("button");
    const c = menuFor;
    const now = performance.now();
    if (!item || !c || now - menuAt < 300) return;
    closeMenu();
    if (!all().includes(c)) return; // gone since: flew off, or the animals were switched off
    if (item === followItem) {
      if (c.task.kind === "follow") unfollow(c, now);
      else follow(c, now);
    } else if (item === bioItem) GIL.zoo.showBio(c.animal, c.x + c.size / 2, c.center().y);
    else for (const o of following()) unfollow(o, now);
  });

  document.addEventListener("pointerdown", (e) => {
    if (!menu.hidden && !menu.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) closeMenu();
  });

  /* ---- running it ---- */

  function create(now) {
    updateWorld();
    const width = window.innerWidth;
    const floor = surfaces.get("floor");
    const grounders = shuffle(ANIMALS.filter((a) => a.gait !== "fly" && a.gait !== "hang")).slice(0, GROUND_COUNT);
    walkers = grounders.map((animal, i) => {
      const c = new Critter(animal, ((i + 0.5) / grounders.length) * width, floor.y);
      c.surface = "floor";
      c.relX = c.x;
      c.flip = chance(0.5) ? 1 : -1;
      c.task = { kind: "idle", until: now + rand(500, 4000) };
      return c;
    });
    flyers = shuffle(ANIMALS.filter((a) => a.gait === "fly"))
      .slice(0, FLYER_COUNT)
      .map((animal) => {
        const c = new Critter(animal, rand(60, width - 60), rand(80, ground() - 200));
        planFlight(c, now);
        return c;
      });
    hangers = ANIMALS.filter((a) => a.gait === "hang").map((animal) => {
      const c = new Critter(animal, width * rand(0.25, 0.75), -6);
      c.surface = "ceiling";
      c.relX = c.x;
      c.task = { kind: "hang", until: now + 4000, x: c.x };
      c.setMode("hang", now);
      return c;
    });
    flock = [];
    nextFlock = now + rand(8000, 15000);
  }

  function frame(now) {
    const dt = Math.min(64, now - last);
    last = now;
    updateWorld();
    followers = following();
    for (const c of walkers) updateWalker(c, dt, now);
    for (const c of flyers) updateFlyer(c, dt, now);
    for (const c of hangers) updateHanger(c, dt, now);
    updateFlock(dt, now);
    for (const c of all()) c.render(now);
    frameId = requestAnimationFrame(frame);
  }

  function start() {
    last = performance.now();
    create(last);
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(frameId);
    walkers = [];
    flyers = [];
    hangers = [];
    flock = [];
    followers = [];
    press = null;
    closeMenu();
    layer.replaceChildren();
  }

  // animals start off for people who asked for less motion, but they can still turn them on
  const enabled = () => (store.get(STORE_KEY) ?? (GIL.reduceMotion ? "off" : "on")) === "on";

  function setEnabled(on) {
    store.set(STORE_KEY, on ? "on" : "off");
    stop();
    if (on) start();
  }

  GIL.critters = { enabled, setEnabled, count: () => all().length };
  // after every script has loaded, since this asks the desktop where the windows are
  document.addEventListener("DOMContentLoaded", () => enabled() && start());
})();
