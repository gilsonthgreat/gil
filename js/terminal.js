(() => {
  const { site, el, span } = GIL;
  const out = document.getElementById("term-out");
  const form = document.getElementById("term-form");
  const input = document.getElementById("term-input");

  const USER = "visitor";
  const SHELL = `${site.name}sh`;
  // window id -> name shown in the shell, read from the windows themselves
  const apps = Object.fromEntries(
    [...document.querySelectorAll(".window")].map((node) => [node.dataset.app, node.dataset.title]),
  );
  const files = Object.values(apps).filter((name) => name.includes("."));
  const commandHistory = [];
  let historyIndex = 0;
  let busy = false;
  let machine = null;

  // parts are nodes, strings, or [text, className] pairs
  function line(...parts) {
    return el(
      "div",
      { class: "ln" },
      parts.map((p) => (Array.isArray(p) ? span(...p) : p)),
    );
  }

  function print(...parts) {
    return out.appendChild(line(...parts));
  }

  function prompt() {
    return [
      span(USER, "t-user"),
      span("@", "t-dim"),
      span(site.osName, "t-host"),
      span(":", "t-dim"),
      span("~", "t-path"),
      span("$", "t-dim"),
    ];
  }

  function echo(text) {
    print(...prompt(), " ", span(text, "t-val"));
  }

  function scrollDown() {
    out.scrollTop = out.scrollHeight;
  }

  function appId(name) {
    const n = name.toLowerCase().replace(/\.(exe|txt)$/, "");
    if (n === "about_me") return "about";
    if (n === "term" || n === SHELL) return "terminal";
    return Object.hasOwn(apps, n) ? n : null;
  }

  // Everything below is read in the visitor's browser for display only; nothing is sent anywhere.
  function detectMachine() {
    const ua = navigator.userAgent;
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    let os = "unknown";
    if (/android/i.test(ua)) os = "Android";
    // iPadOS reports itself as a Mac, but Macs don't have touch screens
    else if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(platform) && navigator.maxTouchPoints > 1))
      os = "iOS / iPadOS";
    else if (/win/i.test(platform) || /windows/i.test(ua)) os = "Windows";
    else if (/mac/i.test(platform)) os = "macOS";
    else if (/cros/i.test(ua)) os = "ChromeOS";
    else if (/linux/i.test(platform) || /linux/i.test(ua)) os = "Linux";

    // order matters: Edge and Opera user agents also contain "Chrome"
    const browsers = [
      ["Edge", /Edg\/(\d+)/],
      ["Opera", /OPR\/(\d+)/],
      ["Firefox", /Firefox\/(\d+)/],
      ["Chrome", /Chrome\/(\d+)/],
      ["Safari", /Version\/(\d+).*Safari/],
    ];
    const found = browsers.find(([, pattern]) => pattern.test(ua));

    const threads = navigator.hardwareConcurrency;
    const memory = navigator.deviceMemory; // Chrome caps this at 8
    const dpr = window.devicePixelRatio || 1;
    return {
      os,
      browser: found ? `${found[0]} ${ua.match(found[1])[1]}` : "unknown",
      cpu: threads ? `${threads} threads` : "n/a",
      gpu: detectGpu(),
      memory: memory ? (memory >= 8 ? "8+ GiB" : `${memory} GiB`) : "n/a",
      screen: `${screen.width}×${screen.height}${dpr !== 1 ? ` @${+dpr.toFixed(2)}x` : ""}`,
    };
  }

  function detectGpu() {
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (!gl) return "n/a";
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return cleanGpuName(name) || "n/a";
    } catch {
      return "n/a";
    }
  }

  // Chrome wraps the name, e.g. "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)"
  function cleanGpuName(raw) {
    let name = String(raw || "");
    const angle = name.match(/^ANGLE \((.*)\)$/);
    if (angle) {
      const parts = angle[1].split(", ");
      name = parts[1] || parts[0];
    }
    name = name
      .replace(/^ANGLE Metal Renderer:\s*/i, "")
      .replace(/\s*\(0x[0-9a-f]+\)/gi, "")
      .replace(/\s+Direct3D.*$/i, "")
      .replace(/\/PCIe\/SSE2/i, "")
      .replace(/, or similar$/i, "")
      .trim();
    return name.length > 40 ? `${name.slice(0, 39)}…` : name;
  }

  function nowPlaying({ state, title }) {
    if (state === "error") return "unavailable";
    const name = title || "loading…";
    const text = `♪ ${name.length > 32 ? `${name.slice(0, 31)}…` : name}`;
    return state === "playing" ? text : `${text} (${state})`;
  }

  function neofetch() {
    machine ??= detectMachine();
    const inner = 28;
    const box = (title, rows) => {
      const label = ` ${title} `;
      const left = Math.max(1, Math.floor((inner - label.length) / 2));
      const right = Math.max(1, inner - label.length - left);
      return [
        line(span(`╭${"─".repeat(left)}`, "t-box"), span(label, "t-hl"), span(`${"─".repeat(right)}╮`, "t-box")),
        ...rows.map(([key, value]) =>
          el("div", { class: "ln fetch-row" }, [
            span("├ ", "t-box"),
            span(key, "t-key"),
            typeof value === "string" ? span(value, "t-val") : value,
          ]),
        ),
        line(span(`╰${"─".repeat(inner)}╯`, "t-box")),
      ];
    };

    const info = el("div", { class: "fetch-info" }, [
      line(span("hey, ", "t-dim"), span(USER, "t-user"), span(" :)", "t-dim")),
      ...box(site.name, [
        ["user", `${site.name} (${site.handle})`],
        ["pronouns", site.pronouns],
        ["status", el("span", { class: "t-val" }, [span("● ", "t-hl"), site.status])],
        ["music", span(nowPlaying(GIL.music.info()), "t-val js-np")],
        ["uptime", span(GIL.formatUptime(Date.now() - GIL.bootTime), "t-val js-uptime-long")],
      ]),
      ...box("your machine", [
        ["os", machine.os],
        ["browser", machine.browser],
        ["cpu", machine.cpu],
        ["gpu", machine.gpu],
        ["memory", machine.memory],
        ["screen", machine.screen],
      ]),
      el(
        "div",
        { class: "ln swatches", "aria-hidden": "true" },
        Array.from({ length: 8 }, (_, i) => span("● ", `sw-${i + 1}`)),
      ),
    ]);
    out.append(
      el("div", { class: "fetch" }, [el("pre", { class: "fetch-logo", "aria-hidden": "true", text: GIL.logo }), info]),
    );
    print(["your machine info is read by your own browser and never leaves it.", "t-faint"]);
  }

  function help() {
    print(["commands", "t-hl"]);
    for (const [name, cmd] of Object.entries(commands)) {
      print([`  ${`${name} ${cmd.args || ""}`.trim().padEnd(30)}`, "t-key"], [cmd.desc, "t-dim"]);
    }
    print(["tab completes a command. ↑ and ↓ go through history.", "t-faint"]);
  }

  function ls() {
    print(
      ...files.flatMap((file, i) => [
        span(file, file.endsWith(".exe") ? "t-hl" : "t-key"),
        i < files.length - 1 ? "   " : "",
      ]),
    );
  }

  function cat([name]) {
    if (!name) return print(["usage: cat <file>. try ", "t-dim"], ["cat about_me.txt", "t-key"]);
    const id = appId(name);
    const file = id && apps[id];
    if (GIL.files[file]) return GIL.files[file]().forEach((row) => print(...row));
    if (file)
      return print([`cat: ${file} is a program. run `, "t-dim"], [`open ${id}`, "t-key"], [" instead.", "t-dim"]);
    print([`cat: ${name}: no such file`, "t-err"]);
  }

  function open([name]) {
    if (!name) return print([`usage: open <app>. apps: ${Object.keys(apps).join(", ")}`, "t-dim"]);
    const id = appId(name);
    if (!id) return print([`open: ${name}: no such app`, "t-err"]);
    print([`opening ${apps[id]}…`, "t-dim"]);
    GIL.desktop.open(id);
  }

  function music([action, value]) {
    const player = GIL.music;
    const { state, title, error, volume } = player.info();
    switch (action?.toLowerCase()) {
      case undefined:
      case "status":
        print(["♪ ", "t-hl"], [title || "unknown", "t-val"], [`  ${state} · volume ${volume}`, "t-dim"]);
        if (error) print([error, "t-err"]);
        return print(["usage: music [play|pause|stop|vol 0-100]", "t-faint"]);
      case "play":
        return player.play() ? print(["▶ playing", "t-dim"]) : print([error || "music can't play right now", "t-err"]);
      case "pause":
        player.pause();
        return print(["❚❚ paused", "t-dim"]);
      case "stop":
        player.stop();
        return print(["■ stopped", "t-dim"]);
      case "vol":
      case "volume":
        if (value === undefined || !Number.isFinite(Number(value))) {
          return print([`volume is ${volume}. change it with `, "t-dim"], ["music vol 0-100", "t-key"]);
        }
        player.setVolume(value);
        return print([`volume set to ${player.info().volume}`, "t-dim"]);
      default:
        print([`music: unknown option "${action}"`, "t-err"]);
    }
  }

  function links() {
    for (const link of site.links) {
      print(
        [`  ${link.label.padEnd(12)}`, "t-key"],
        el("a", { href: link.url, target: "_blank", rel: "noopener", text: link.url }),
      );
    }
  }

  const commands = {
    help: { desc: "list commands", run: help },
    neofetch: { desc: `system info: ${site.name} + your machine`, run: neofetch },
    about: { desc: "print about_me.txt", run: () => cat(["about_me.txt"]) },
    dni: { desc: "print dni.txt", run: () => cat(["dni.txt"]) },
    ls: { desc: "list files", run: ls },
    cat: { args: "<file>", desc: "print a file", run: cat },
    open: { args: "<app>", desc: "open a window", run: open },
    music: { args: "[play|pause|stop|vol n]", desc: "control the music", run: music },
    links: { desc: `${site.name}'s links`, run: links },
    whoami: {
      desc: "who are you?",
      run: () =>
        print([USER, "t-val"], ["  (a guest on ", "t-dim"], [`${site.name}'s machine`, "t-key"], [")", "t-dim"]),
    },
    date: { desc: "date and time", run: () => print([new Date().toString(), "t-val"]) },
    echo: { args: "<text>", desc: "print text", run: (args) => print([args.join(" "), "t-val"]) },
    history: {
      desc: "commands you've run",
      run: () =>
        commandHistory.forEach((cmd, i) => print([`${String(i + 1).padStart(4)}  `, "t-faint"], [cmd, "t-val"])),
    },
    clear: { desc: "clear the screen (ctrl+l)", run: () => out.replaceChildren() },
    exit: { desc: "close the terminal", run: () => GIL.desktop.close("terminal") },
  };
  if (!site.links.length) delete commands.links;

  // aliases and easter eggs, left out of help and tab completion
  const unlisted = {
    fastfetch: neofetch,
    fetch: neofetch,
    cls: commands.clear.run,
    dir: ls,
    "?": help,
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
    objection: () => print(["OBJECTION!", "t-objection"]),
    pets: () => {
      GIL.critters.setEnabled(!GIL.critters.enabled());
      print([GIL.critters.enabled() ? "the pets are back." : "the pets went to sleep.", "t-dim"]);
    },
  };
  // every app name also works as a command, e.g. `chess`
  for (const id of Object.keys(apps)) unlisted[id] ??= () => open([id]);

  function run(raw) {
    const line = raw.trim();
    echo(raw);
    if (line) {
      commandHistory.push(line);
      const [name, ...args] = line.split(/\s+/);
      const key = name.toLowerCase();
      // hasOwn so input like "constructor" doesn't resolve to Object.prototype
      const command = Object.hasOwn(commands, key) ? commands[key].run : Object.hasOwn(unlisted, key) && unlisted[key];
      if (command) {
        command(args);
      } else {
        print([`${SHELL}: command not found: ${name}`, "t-err"]);
        print(["type ", "t-dim"], ["help", "t-key"], [" to see what's here.", "t-dim"]);
      }
    }
    historyIndex = commandHistory.length;
    scrollDown();
  }

  function complete() {
    const parts = input.value.split(" ");
    const last = parts.at(-1).toLowerCase();
    const options = {
      cat: files.filter((file) => file.endsWith(".txt")),
      open: Object.keys(apps),
      music: ["play", "pause", "stop", "vol"],
    };
    const pool = parts.length === 1 ? Object.keys(commands) : options[parts[0]];
    if (!pool) return;
    const hits = pool.filter((option) => option.startsWith(last));
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0];
      input.value = `${parts.join(" ")} `;
    } else if (hits.length > 1) {
      echo(input.value);
      print([hits.join("   "), "t-key"]);
      scrollDown();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (busy) return;
    const raw = input.value;
    input.value = "";
    run(raw);
  });

  input.addEventListener("keydown", (e) => {
    const key = e.key?.toLowerCase(); // undefined for some autofill events
    if (key === "arrowup" || key === "arrowdown") {
      if (!commandHistory.length) return;
      e.preventDefault();
      historyIndex = Math.min(commandHistory.length, Math.max(0, historyIndex + (key === "arrowup" ? -1 : 1)));
      input.value = commandHistory[historyIndex] || "";
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (key === "tab" && input.value) {
      // only with text typed, so tab still moves focus out of an empty prompt
      e.preventDefault();
      complete();
    } else if (e.ctrlKey && key === "l") {
      e.preventDefault();
      out.replaceChildren();
    } else if (e.ctrlKey && key === "c" && input.selectionStart === input.selectionEnd && !String(getSelection())) {
      // with nothing selected anywhere, ctrl+c cancels the line instead of copying
      e.preventDefault();
      print(...prompt(), " ", span(input.value, "t-val"), span("^C", "t-dim"));
      input.value = "";
      scrollDown();
    }
  });

  document.querySelector(".term").addEventListener("click", (e) => {
    if (e.target.closest("a, button") || String(getSelection())) return;
    input.focus({ preventScroll: true });
  });

  document.addEventListener("music:change", (e) => {
    for (const node of document.querySelectorAll(".js-np")) node.textContent = nowPlaying(e.detail);
  });

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function hint() {
    print(["type ", "t-dim"], ["help", "t-key"], [" to see what you can do here.", "t-dim"]);
    scrollDown();
  }

  // types "neofetch" at the prompt on first load
  async function start() {
    if (GIL.reduceMotion) {
      run("neofetch");
      return hint();
    }
    busy = true;
    const typed = span("", "t-val");
    const typing = print(...prompt(), " ", typed, el("span", { class: "caret", "aria-hidden": "true" }));
    await wait(400);
    for (const ch of "neofetch") {
      typed.textContent += ch;
      await wait(55 + Math.random() * 60);
    }
    await wait(200);
    typing.remove();
    run("neofetch");
    hint();
    busy = false;
  }

  document.getElementById("term-prompt").replaceChildren(...prompt());
  GIL.terminal = { start, focus: () => input.focus({ preventScroll: true }) };
})();
