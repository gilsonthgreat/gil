(() => {
  const cfg = GIL.site.music;
  const $ = (selector) => document.querySelector(selector);
  const ui = {
    root: $(".music"),
    title: $("#music-title"),
    titleText: $("#music-title .np-text"),
    viz: $(".viz"),
    fallback: $("#yt-fallback"),
    fallbackMsg: $("#yt-fallback-msg"),
    link: $("#music-link"),
    toggle: $("#music-toggle"),
    toggleIcon: $("#music-toggle use"),
    toggleLabel: $("#music-toggle .label"),
    stop: $("#music-stop"),
    seek: $("#music-seek"),
    pos: $("#music-pos"),
    dur: $("#music-dur"),
    vol: $("#music-vol"),
    status: $("#music-status"),
  };

  const VOLUME_KEY = "gilos-volume";
  const ERRORS = {
    2: "the video id in config.js looks wrong.",
    5: "this browser can't play the video.",
    100: "the video was removed or made private.",
    101: "the video's owner doesn't allow it to play on other sites.",
    150: "the video's owner doesn't allow it to play on other sites.",
  };

  let player = null;
  let ready = false;
  let state = "loading"; // loading | ready | playing | buffering | paused | stopped | error
  let error = "";
  let hint = "";
  let wantPlay = false;
  let stopping = false;
  let title = cfg.title;
  let volume = clampVolume(storedVolume() ?? cfg.volume);
  let position = 0;
  let duration = 0;
  let seeking = false;
  let pollTimer = 0;
  let hintTimer = 0;

  function clampVolume(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 40;
  }

  function storedVolume() {
    try {
      return localStorage.getItem(VOLUME_KEY);
    } catch {
      return null; // storage blocked, e.g. some private windows
    }
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function fill(range, pct) {
    range.style.setProperty("--fill", `${Math.min(100, Math.max(0, pct))}%`);
  }

  function load() {
    ui.link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(cfg.youtubeId)}`;
    if (!cfg.youtubeId) return fail("no song is set. add a youtubeId in config.js.");
    window.onYouTubeIframeAPIReady = create;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => fail("couldn't reach youtube from this page.");
    document.head.append(script);
    setTimeout(() => {
      if (!ready && state !== "error") fail("youtube is taking too long to answer.");
    }, 15000);
  }

  function create() {
    const playerVars = { playsinline: 1, rel: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3 };
    if (location.protocol.startsWith("http")) playerVars.origin = location.origin;
    player = new YT.Player("yt-player", {
      videoId: cfg.youtubeId,
      width: "100%",
      height: "100%",
      playerVars,
      events: { onReady, onStateChange, onError },
    });
  }

  function onReady() {
    ready = true;
    // a slow load can trip the timeout above and still finish afterwards
    if (state === "loading" || state === "error") state = "ready";
    error = "";
    ui.fallback.hidden = true;
    player.setVolume(volume);
    readMeta();
    if (wantPlay) play();
    render();
  }

  function onStateChange(e) {
    switch (e.data) {
      case YT.PlayerState.PLAYING:
        state = "playing";
        hint = "";
        startPolling();
        break;
      case YT.PlayerState.BUFFERING:
        state = "buffering";
        startPolling();
        break;
      case YT.PlayerState.PAUSED:
        state = stopping ? "stopped" : "paused";
        stopPolling();
        break;
      case YT.PlayerState.ENDED:
        if (wantPlay) {
          player.seekTo(0, true);
          player.playVideo();
          return;
        }
        state = "stopped";
        stopPolling();
        break;
    }
    readMeta();
    poll();
    render();
  }

  function onError(e) {
    fail(ERRORS[e.data] || "youtube couldn't play this video.");
  }

  function fail(message) {
    state = "error";
    error = message;
    wantPlay = false;
    stopPolling();
    ui.fallbackMsg.textContent = message;
    ui.fallback.hidden = false;
    render();
  }

  function readMeta() {
    // getVideoData isn't part of the documented API, so don't count on it
    const data = player.getVideoData?.();
    if (!cfg.title && data?.title) title = data.title;
    duration = player.getDuration() || duration;
  }

  function play() {
    if (state === "error") return false;
    wantPlay = true;
    stopping = false;
    hint = "";
    if (ready) {
      player.playVideo();
      // mobile browsers often refuse scripted playback until the video itself is tapped
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => {
        if (wantPlay && state !== "playing" && state !== "buffering" && state !== "error") {
          hint = "your browser blocked autoplay. tap the video to start it.";
          render();
        }
      }, 3000);
    }
    render();
    return true;
  }

  function pause() {
    wantPlay = false;
    if (ready) player.pauseVideo();
    render();
  }

  // YouTube's stopVideo() can report ENDED, which would trigger the loop, so pause and rewind instead
  function stop() {
    wantPlay = false;
    if (ready && (state === "playing" || state === "buffering" || state === "paused")) {
      stopping = true;
      player.pauseVideo();
      player.seekTo(0, true);
      state = "stopped";
      position = 0;
    }
    stopPolling();
    render();
  }

  function toggle() {
    if (state === "playing" || state === "buffering") pause();
    else play();
  }

  function setVolume(value) {
    volume = clampVolume(value);
    ui.vol.value = volume;
    fill(ui.vol, volume);
    if (ready) {
      player.setVolume(volume);
      if (volume > 0 && player.isMuted()) player.unMute();
    }
    try {
      localStorage.setItem(VOLUME_KEY, volume);
    } catch {
      // storage blocked; the volume just won't be remembered
    }
    render();
  }

  function poll() {
    position = player.getCurrentTime() || 0;
    duration = player.getDuration() || duration;
    renderProgress();
  }

  function startPolling() {
    if (!pollTimer) pollTimer = setInterval(poll, 500);
  }

  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = 0;
  }

  const STATUS = {
    loading: "connecting to youtube…",
    ready: "ready. press play.",
    playing: "playing · on repeat",
    buffering: "buffering…",
    paused: "paused",
    stopped: "stopped",
  };

  function statusText() {
    if (state === "error") return error;
    if (hint) return hint;
    if (wantPlay && (state === "loading" || state === "ready")) return "starting…";
    return STATUS[state];
  }

  function setTitle(text) {
    if (ui.titleText.textContent === text) return;
    ui.titleText.textContent = text;
    ui.title.title = text;
    updateMarquee();
  }

  function updateMarquee() {
    const overflow = ui.titleText.scrollWidth - ui.title.clientWidth;
    ui.title.classList.toggle("marquee", overflow > 4 && !GIL.reduceMotion);
    ui.title.style.setProperty("--shift", `-${Math.max(0, overflow) + 16}px`);
  }

  function renderProgress() {
    const pct = duration ? (position / duration) * 100 : 0;
    if (!seeking) {
      ui.seek.value = Math.round(pct * 10);
      fill(ui.seek, pct);
      ui.pos.textContent = formatTime(position);
    }
    ui.dur.textContent = formatTime(duration);
  }

  function render() {
    const active = state === "playing" || state === "buffering";
    const broken = state === "error";
    ui.root.classList.toggle("is-playing", state === "playing");
    document.documentElement.classList.toggle("music-on", state === "playing");
    ui.toggleIcon.setAttribute("href", active ? "#i-pause" : "#i-play");
    ui.toggleLabel.textContent = active ? "pause" : "play";
    ui.toggle.setAttribute("aria-label", active ? "pause music" : "play music");
    ui.toggle.disabled = broken;
    ui.stop.disabled = broken;
    ui.seek.disabled = broken || !ready;
    setTitle(title || (broken ? "no song loaded" : "loading…"));
    ui.status.textContent = statusText();
    renderProgress();
    document.dispatchEvent(new CustomEvent("music:change", { detail: info() }));
  }

  function info() {
    return { state, title, error, volume };
  }

  // fixed, uneven timings so the bars don't pulse in sync
  for (let i = 0; i < 24; i++) {
    const bar = document.createElement("span");
    bar.style.setProperty("--d", `${0.55 + ((i * 37) % 9) / 14}s`);
    bar.style.setProperty("--delay", `${-((i * 53) % 11) / 10}s`);
    bar.style.setProperty("--peak", `${0.45 + ((i * 29) % 11) / 20}`);
    ui.viz.append(bar);
  }

  ui.toggle.addEventListener("click", toggle);
  ui.stop.addEventListener("click", stop);
  ui.vol.value = volume;
  fill(ui.vol, volume);
  ui.vol.addEventListener("input", () => setVolume(ui.vol.value));
  ui.seek.addEventListener("input", () => {
    seeking = true;
    const pct = ui.seek.value / 10;
    fill(ui.seek, pct);
    ui.pos.textContent = formatTime((duration * pct) / 100);
  });
  ui.seek.addEventListener("change", () => {
    seeking = false;
    if (ready && duration) {
      position = (duration * ui.seek.value) / 1000;
      player.seekTo(position, true);
    }
    renderProgress();
  });
  new ResizeObserver(updateMarquee).observe(ui.title);

  // Browsers block sound until the visitor interacts with the page, so start on the first click or key.
  // Clicks on the player are left to its own controls.
  if (cfg.playOnFirstClick) {
    const onFirstInput = (e) => {
      if (e.type === "keydown" && (e.key === "Escape" || e.key === "Tab" || e.ctrlKey || e.metaKey || e.altKey)) return;
      window.removeEventListener("click", onFirstInput, true);
      window.removeEventListener("keydown", onFirstInput, true);
      if (!e.target.closest?.('[data-app="music"], #tray-music')) play();
    };
    window.addEventListener("click", onFirstInput, true);
    window.addEventListener("keydown", onFirstInput, true);
  }

  GIL.music = { play, pause, stop, setVolume, info };
  render();
  load();
})();
