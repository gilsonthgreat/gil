/* terminal: a tiny shell with neofetch, files and music controls */
(() => {
  const { site, el, util, on, reduceMotion } = GIL;
  const out = document.getElementById("term-out");
  const form = document.getElementById("term-form");
  const input = document.getElementById("term-input");
  const term = document.querySelector(".term");
  if (!out || !form || !input) return;

  const USER = "visitor";
  const HOST = site.osName;
  const SHELL = `${site.name}sh`;
  const history = [];
  let historyIndex = 0;
  let busy = false;
  let started = false;
  let machine = null;

  const own = (obj, key) => (Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* ---------- output ---------- */
  const seg = (text, cls) => el("span", { class: cls, text });
  function print(...parts) {
    const line = el("div", { class: "ln" }, parts.map((p) => (Array.isArray(p) ? seg(p[0], p[1]) : p)));
    out.append(line);
    return line;
  }
  function promptParts() {
    return [seg(USER, "t-user"), seg("@", "t-dim"), seg(HOST, "t-host"), seg(":", "t-dim"), seg("~", "t-path"), seg("$", "t-dim")];
  }
  function echo(text) {
    print(...promptParts(), " ", seg(text, "t-val"));
  }
  function scrollDown() {
    out.scrollTop = out.scrollHeight;
  }

  /* ---------- apps and files ---------- */
  const apps = { profile: "profile.exe", about: "about_me.txt", dni: "dni.txt", music: "music.exe", terminal: "terminal" };
  const files = ["about_me.txt", "dni.txt", "music.exe", "profile.exe"];

  function appId(name = "") {
    const n = name.toLowerCase().replace(/\.(exe|txt)$/, "");
    if (n === "about_me" || n === "aboutme") return "about";
    if (n === "term" || n === "shell" || n === SHELL) return "terminal";
    return own(apps, n) ? n : null;
  }

  /* ---------- machine info (read locally, never sent anywhere) ---------- */
  function detect() {
    const ua = navigator.userAgent;
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    let os = "unknown";
    if (/android/i.test(ua)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(platform) && navigator.maxTouchPoints > 1)) os = "iOS / iPadOS";
    else if (/win/i.test(platform) || /windows/i.test(ua)) os = "Windows";
    else if (/mac/i.test(platform)) os = "macOS";
    else if (/cros/i.test(ua)) os = "ChromeOS";
    else if (/linux/i.test(platform) || /linux/i.test(ua)) os = "Linux";

    const version = (re) => (ua.match(re) || [])[1];
    let browser = "unknown";
    if (version(/Edg\/(\d+)/)) browser = `Edge ${version(/Edg\/(\d+)/)}`;
    else if (version(/OPR\/(\d+)/)) browser = `Opera ${version(/OPR\/(\d+)/)}`;
    else if (version(/Firefox\/(\d+)/)) browser = `Firefox ${version(/Firefox\/(\d+)/)}`;
    else if (version(/Chrome\/(\d+)/)) browser = `Chrome ${version(/Chrome\/(\d+)/)}`;
    else if (version(/Version\/(\d+)[\d.]* .*Safari/)) browser = `Safari ${version(/Version\/(\d+)/)}`;

    const threads = navigator.hardwareConcurrency;
    const memory = navigator.deviceMemory;
    const dpr = window.devicePixelRatio || 1;
    return {
      os,
      browser,
      cpu: threads ? `${threads} threads` : "n/a",
      gpu: detectGpu(),
      memory: memory ? (memory >= 8 ? "8+ GiB" : `${memory} GiB`) : "n/a",
      screen: `${screen.width}×${screen.height}${dpr !== 1 ? ` @${+dpr.toFixed(2)}x` : ""}`,
    };
  }

  function detectGpu() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return "n/a";
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const raw = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
      return cleanGpu(raw) || "n/a";
    } catch {
      return "n/a";
    }
  }

  function cleanGpu(raw) {
    if (!raw) return "";
    let s = String(raw);
    const angle = s.match(/^ANGLE \((.*)\)$/);
    if (angle) {
      const parts = angle[1].split(", ");
      s = parts.length > 1 ? parts[1] : parts[0];
    }
    s = s
      .replace(/^ANGLE Metal Renderer:\s*/i, "")
      .replace(/\s*\(0x[0-9a-f]+\)/gi, "")
      .replace(/\s+Direct3D.*$/i, "")
      .replace(/\/PCIe\/SSE2/i, "")
      .replace(/, or similar$/i, "")
      .trim();
    return s.length > 40 ? `${s.slice(0, 39)}…` : s;
  }

  /* ---------- commands ---------- */
  function nowPlaying(m) {
    if (!m || !m.state) return "…";
    if (m.state === "error") return "unavailable";
    const title = m.title || "loading…";
    const text = `♪ ${title.length > 32 ? `${title.slice(0, 31)}…` : title}`;
    return m.state === "playing" ? text : `${text} (${m.state})`;
  }

  function neofetch() {
    machine = machine || detect();
    const width = 30;
    const box = (title, rows) => {
      const inner = width - 2;
      const label = ` ${title} `;
      const left = Math.max(1, Math.floor((inner - label.length) / 2));
      const right = Math.max(1, inner - label.length - left);
      return [
        el("div", { class: "ln" }, [seg(`╭${"─".repeat(left)}`, "t-box"), seg(label, "t-hl"), seg(`${"─".repeat(right)}╮`, "t-box")]),
        ...rows.map(([key, value]) =>
          el("div", { class: "ln fr" }, [seg("├ ", "t-box"), seg(key, "t-key"), typeof value === "string" ? seg(value, "t-val") : value]),
        ),
        el("div", { class: "ln" }, [seg(`╰${"─".repeat(inner)}╯`, "t-box")]),
      ];
    };

    const status = el("span", { class: "t-val" }, [seg("● ", "t-hl"), site.status || "online"]);
    const music = el("span", { class: "t-val js-np", text: nowPlaying(GIL.music && GIL.music.info()) });
    const uptime = el("span", { class: "t-val js-uptime-long", text: util.uptime(Date.now() - GIL.bootTime) });
    const swatches = el(
      "div",
      { class: "ln swatches", "aria-hidden": "true" },
      Array.from({ length: 8 }, (_, i) => seg("● ", `sw sw-${i + 1}`)),
    );

    const info = el("div", { class: "fetch-info" }, [
      el("div", { class: "ln" }, [seg("hey, ", "t-dim"), seg(USER, "t-user"), seg(" :)", "t-dim")]),
      ...box(site.name, [
        ["user", `${site.name} (${site.handle})`],
        ["status", status],
        ["music", music],
        ["uptime", uptime],
      ]),
      ...box("your machine", [
        ["os", machine.os],
        ["browser", machine.browser],
        ["cpu", machine.cpu],
        ["gpu", machine.gpu],
        ["memory", machine.memory],
        ["screen", machine.screen],
      ]),
      swatches,
    ]);
    out.append(el("div", { class: "fetch" }, [el("pre", { class: "fetch-logo", "aria-hidden": "true", text: GIL.logo }), info]));
    print(["your machine info is read by your own browser and never leaves it.", "t-faint"]);
  }

  function help() {
    print(["commands", "t-hl"]);
    for (const [name, cmd] of Object.entries(commands)) {
      if (cmd.hidden) continue;
      const usage = cmd.args ? `${name} ${cmd.args}` : name;
      print([`  ${usage.padEnd(30)}`, "t-key"], [cmd.desc, "t-dim"]);
    }
    print(["tab completes a command. ↑ and ↓ go through history.", "t-faint"]);
  }

  function ls() {
    print(...files.flatMap((f, i) => [seg(f, f.endsWith(".exe") ? "t-hl" : "t-key"), i < files.length - 1 ? "   " : ""]));
  }

  function cat(args) {
    const arg = (args[0] || "").toLowerCase();
    if (!arg) return print(["usage: cat <file>. try ", "t-dim"], ["cat about_me.txt", "t-key"]);
    const name = arg === "about" || arg === "about_me" ? "about_me.txt" : arg === "dni" ? "dni.txt" : arg;
    const build = GIL.files && own(GIL.files, name);
    if (build) {
      build().forEach((row) => print(...row));
      return;
    }
    if (files.includes(name)) return print([`cat: ${name} is a program. run `, "t-dim"], [`open ${name.replace(/\.exe$/, "")}`, "t-key"], [" instead.", "t-dim"]);
    print([`cat: ${args[0]}: no such file`, "t-err"]);
  }

  function openApp(args) {
    if (!args[0]) return print(["usage: open <app>. apps: profile, about, dni, music, terminal", "t-dim"]);
    const id = appId(args[0]);
    if (!id) return print([`open: ${args[0]}: no such app`, "t-err"]);
    print([`opening ${apps[id]}…`, "t-dim"]);
    if (GIL.desktop) GIL.desktop.open(id);
  }

  function music(args) {
    const player = GIL.music;
    if (!player) return print(["music.exe isn't running", "t-err"]);
    const [sub, value] = args.map((a) => a.toLowerCase());
    const info = player.info();
    if (!sub || sub === "status") {
      print(["♪ ", "t-hl"], [info.title || "unknown", "t-val"], [`  ${info.state} · volume ${info.volume}`, "t-dim"]);
      if (info.error) print([info.error, "t-err"]);
      return print(["usage: music [play|pause|stop|vol 0-100]", "t-faint"]);
    }
    if (sub === "play") {
      if (player.play()) return print(["▶ playing", "t-dim"]);
      return print([info.error || "music can't play right now", "t-err"]);
    }
    if (sub === "pause") {
      player.pause();
      return print(["❚❚ paused", "t-dim"]);
    }
    if (sub === "stop") {
      player.stop();
      return print(["■ stopped", "t-dim"]);
    }
    if (sub === "vol" || sub === "volume") {
      const n = Number(value);
      if (value === undefined || !Number.isFinite(n)) return print([`volume is ${info.volume}. change it with `, "t-dim"], ["music vol 0-100", "t-key"]);
      player.setVolume(n);
      return print([`volume set to ${player.info().volume}`, "t-dim"]);
    }
    print([`music: unknown option "${sub}"`, "t-err"]);
  }

  function links() {
    for (const link of site.links || []) {
      print([`  ${String(link.label).padEnd(12)}`, "t-key"], el("a", { href: link.url, target: "_blank", rel: "noopener", text: link.url }));
    }
  }

  const commands = {
    help: { desc: "list commands", run: help },
    neofetch: { desc: "system info: gil + your machine", run: neofetch },
    about: { desc: "print about_me.txt", run: () => cat(["about_me.txt"]) },
    dni: { desc: "print dni.txt", run: () => cat(["dni.txt"]) },
    ls: { desc: "list files", run: ls },
    cat: { args: "<file>", desc: "print a file", run: cat },
    open: { args: "<app>", desc: "open a window", run: openApp },
    music: { args: "[play|pause|stop|vol n]", desc: "control the music", run: music },
    links: { desc: `${site.name}'s links`, run: links, hidden: !(site.links && site.links.length) },
    whoami: { desc: "who are you?", run: () => print([USER, "t-val"], ["  (a guest on ", "t-dim"], [`${site.name}'s machine`, "t-key"], [")", "t-dim"]) },
    date: { desc: "date and time", run: () => print([new Date().toString(), "t-val"]) },
    echo: { args: "<text>", desc: "print text", run: (args) => print([args.join(" "), "t-val"]) },
    history: { desc: "commands you've run", run: () => history.forEach((h, i) => print([`${String(i + 1).padStart(4)}  `, "t-faint"], [h, "t-val"])) },
    clear: { desc: "clear the screen (ctrl+l)", run: () => out.replaceChildren() },
    exit: { desc: "close the terminal", run: () => GIL.desktop && GIL.desktop.close("terminal") },
  };
  const aliases = { fastfetch: "neofetch", fetch: "neofetch", cls: "clear", dir: "ls", "?": "help" };
  const extras = {
    play: () => music(["play"]),
    pause: () => music(["pause"]),
    stop: () => music(["stop"]),
    sudo: () => print([`${USER} is not in the sudoers file. this incident will be reported.`, "t-err"]),
    rm: () => print([`rm: nice try. ${site.name}'s files stay put.`, "t-err"]),
    hi: () => print(["hey :)", "t-hl"]),
    hello: () => print(["hey :)", "t-hl"]),
    ping: () => print(["pong", "t-val"]),
    vim: () => print(["no editors here. try cat instead.", "t-dim"]),
    nano: () => print(["no editors here. try cat instead.", "t-dim"]),
  };

  function run(raw) {
    const line = raw.trim();
    echo(raw);
    if (line) {
      history.push(line);
      const [name, ...args] = line.split(/\s+/);
      const key = name.toLowerCase();
      const cmd = own(commands, key) || own(commands, own(aliases, key) || "");
      const extra = own(extras, key);
      if (cmd) cmd.run(args);
      else if (extra) extra(args);
      else {
        print([`${SHELL}: command not found: ${name}`, "t-err"]);
        print(["type ", "t-dim"], ["help", "t-key"], [" to see what's here.", "t-dim"]);
      }
    }
    historyIndex = history.length;
    scrollDown();
  }

  function complete() {
    const value = input.value;
    const parts = value.split(" ");
    const last = parts[parts.length - 1].toLowerCase();
    let pool;
    if (parts.length === 1) pool = Object.keys(commands).filter((k) => !commands[k].hidden);
    else if (parts[0] === "cat") pool = files.filter((f) => f.endsWith(".txt"));
    else if (parts[0] === "open") pool = Object.keys(apps);
    else if (parts[0] === "music") pool = ["play", "pause", "stop", "vol"];
    else return;
    const hits = pool.filter((p) => p.startsWith(last));
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0];
      input.value = `${parts.join(" ")} `;
    } else if (hits.length > 1) {
      echo(value);
      print([hits.join("   "), "t-key"]);
      scrollDown();
    }
  }

  /* ---------- input ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (busy) return;
    const raw = input.value;
    input.value = "";
    run(raw);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (!history.length) return;
      e.preventDefault();
      historyIndex = Math.min(history.length, Math.max(0, historyIndex + (e.key === "ArrowUp" ? -1 : 1)));
      input.value = history[historyIndex] || "";
      const end = input.value.length;
      input.setSelectionRange(end, end);
    } else if (e.key === "Tab" && input.value) {
      e.preventDefault();
      complete();
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      out.replaceChildren();
    } else if (e.ctrlKey && e.key.toLowerCase() === "c" && input.selectionStart === input.selectionEnd && !String(window.getSelection())) {
      e.preventDefault();
      print(...promptParts(), " ", seg(input.value, "t-val"), seg("^C", "t-dim"));
      input.value = "";
      scrollDown();
    }
  });

  term.addEventListener("click", (e) => {
    if (e.target.closest("a, button") || String(window.getSelection())) return;
    input.focus({ preventScroll: true });
  });

  on("music:change", (m) => {
    document.querySelectorAll(".js-np").forEach((node) => {
      node.textContent = nowPlaying(m);
    });
  });

  on("window:open", ({ id, quiet }) => {
    if (id === "terminal" && !quiet && !matchMedia("(max-width: 760px)").matches) input.focus({ preventScroll: true });
  });

  /* ---------- first run: type out neofetch ---------- */
  function hint() {
    print(["type ", "t-dim"], ["help", "t-key"], [" to see what you can do here.", "t-dim"]);
    scrollDown();
  }

  async function start() {
    if (started) return;
    started = true;
    if (reduceMotion) {
      run("neofetch");
      hint();
      return;
    }
    busy = true;
    const ghost = print(...promptParts(), " ");
    const typed = seg("", "t-val");
    ghost.append(typed, el("span", { class: "caret", "aria-hidden": "true" }));
    await wait(400);
    for (const ch of "neofetch") {
      typed.textContent += ch;
      await wait(55 + Math.random() * 60);
    }
    await wait(200);
    ghost.remove();
    run("neofetch");
    hint();
    busy = false;
  }

  document.getElementById("term-prompt").replaceChildren(...promptParts());
  GIL.terminal = { start, run, focus: () => input.focus({ preventScroll: true }) };
})();
