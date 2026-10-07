(() => {
  const $ = (selector) => document.querySelector(selector);
  const SAMPLES = 60;
  const SAMPLE_MS = 250;
  const graphs = {
    fps: { canvas: $("#mon-fps-graph"), label: $("#mon-fps"), max: () => 70, format: (v) => `${Math.round(v)} fps` },
    speed: {
      canvas: $("#mon-speed-graph"),
      label: $("#mon-speed"),
      max: (data) => Math.max(1500, ...data) * 1.15,
      format: (v) => `${Math.round(v)} px/s`,
    },
    ms: { canvas: $("#mon-ms-graph"), label: $("#mon-ms"), max: () => 40, format: (v) => `${v.toFixed(1)} ms` },
  };
  for (const graph of Object.values(graphs)) graph.data = Array(SAMPLES).fill(0);

  const gilClock = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/New_York",
  });
  const localClock = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
  const localZone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;
  $("#mon-gil-label").textContent = `${GIL.site.name} · ${GIL.site.timezone}`;
  $("#mon-you-label").textContent = localZone ? `you · ${localZone}` : "you";

  let frameId = 0;
  let frames = 0;
  let frameTotal = 0;
  let lastFrame = 0;
  let sampleStart = 0;
  let distance = 0;
  let lastPointer = null;

  window.addEventListener("pointermove", (e) => {
    if (lastPointer) distance += Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y);
    lastPointer = { x: e.clientX, y: e.clientY };
  });

  // "4:44:38 PM" -> big "4:44" and small "38 pm"
  function renderClock(node, format) {
    const parts = Object.fromEntries(format.formatToParts(new Date()).map((p) => [p.type, p.value]));
    node.replaceChildren(
      `${parts.hour}:${parts.minute}`,
      GIL.el("small", { text: ` ${parts.second} ${(parts.dayPeriod || "").toLowerCase()}` }),
    );
  }

  function drawGraph(graph) {
    const { canvas, data } = graph;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(207,174,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      ctx.moveTo(0, Math.round((h * i) / 4) + 0.5);
      ctx.lineTo(w, Math.round((h * i) / 4) + 0.5);
    }
    for (let i = 1; i < 12; i++) {
      ctx.moveTo(Math.round((w * i) / 12) + 0.5, 0);
      ctx.lineTo(Math.round((w * i) / 12) + 0.5, h);
    }
    ctx.stroke();

    const max = graph.max(data);
    const point = (v, i) => [(i / (SAMPLES - 1)) * w, h - 2 - Math.min(1, v / max) * (h - 6)];
    const line = new Path2D();
    data.forEach((v, i) => line.lineTo(...point(v, i)));
    const area = new Path2D(line);
    area.lineTo(w, h);
    area.lineTo(0, h);
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, "rgba(236,124,245,0.45)");
    fill.addColorStop(1, "rgba(143,140,255,0.03)");
    ctx.fillStyle = fill;
    ctx.fill(area);
    ctx.strokeStyle = "#cfaeff";
    ctx.lineWidth = 1.5;
    ctx.stroke(line);
    const [x, y] = point(data.at(-1), SAMPLES - 1);
    ctx.fillStyle = "#f7f3ff";
    ctx.beginPath();
    ctx.arc(x - 2, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function sample(elapsed) {
    const values = {
      fps: (frames * 1000) / elapsed,
      speed: (distance * 1000) / elapsed,
      ms: frames ? frameTotal / frames : 0,
    };
    for (const [key, graph] of Object.entries(graphs)) {
      graph.data.push(values[key]);
      graph.data.shift();
      graph.label.textContent = graph.format(values[key]);
      drawGraph(graph);
    }
    frames = 0;
    frameTotal = 0;
    distance = 0;
    renderClock($("#mon-gil-time"), gilClock);
    renderClock($("#mon-you-time"), localClock);
  }

  function frame(now) {
    frames++;
    frameTotal += now - lastFrame;
    lastFrame = now;
    if (now - sampleStart >= SAMPLE_MS) {
      sample(now - sampleStart);
      sampleStart = now;
    }
    frameId = requestAnimationFrame(frame);
  }

  // only measure while the window is showing
  document.addEventListener("window:open", (e) => {
    if (e.detail.id !== "sysmon") return;
    lastFrame = sampleStart = performance.now();
    frameId = requestAnimationFrame(frame);
  });
  document.addEventListener("window:hide", (e) => {
    if (e.detail.id === "sysmon") cancelAnimationFrame(frameId);
  });
})();
