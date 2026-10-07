/* music.exe: a YouTube player (official embed API) with custom controls */
(() => {
  const { site, emit, util, store } = GIL;
  const cfg = Object.assign({ youtubeId: "", title: "", volume: 40 }, site.music);
  const $ = (id) => document.getElementById(id);
  const ui = {
    root: document.querySelector(".music"),
    title: $("music-title"),
    titleText: document.querySelector("#music-title .np-text"),
    fallback: $("yt-fallback"),
    fallbackMsg: $("yt-fallback-msg"),
    link: $("music-link"),
    toggle: $("music-toggle"),
    toggleUse: document.querySelector("#music-toggle use"),
    toggleLabel: document.querySelector("#music-toggle .label"),
    stop: $("music-stop"),
    seek: $("music-seek"),
    pos: $("music-pos"),
    dur: $("music-dur"),
    vol: $("music-vol"),
    status: $("music-status"),
  };
  if (!ui.root) return;

  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(cfg.youtubeId)}`;
  const ERRORS = {
    2: "the video id in config.js looks wrong.",
    5: "this browser can't play the video.",
    100: "the video was removed or made private.",
    101: "the video's owner doesn't allow it to play on other sites.",
    150: "the video's owner doesn't allow it to play on other sites.",
  };

  let player = null;
  let ready = false;
  let state = "loading"; // loading | ready | playing | paused | buffering | stopped | error
  let error = "";
  let hint = "";
  let wantPlay = false;
  let stopping = false;
  let title = cfg.title || "";
  let volume = clampVolume(store.get("gilos-volume", cfg.volume));
  let position = 0;
  let duration = 0;
  let seeking = false;
  let timer = 0;
  let hintTimer = 0;

  function clampVolume(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 40;
  }

  function fill(range, pct) {
    range.style.setProperty("--fill", `${Math.min(100, Math.max(0, pct))}%`);
  }

  /* ---------- loading the YouTube API ---------- */
  function load() {
    ui.link.href = url;
    if (!cfg.youtubeId) return fail("no song is set. add a youtubeId in config.js.");
    if (window.YT && window.YT.Player) return create();
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous();
      create();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => fail("couldn't reach youtube from this page.");
    document.head.append(script);
    setTimeout(() => {
      if (!ready && state !== "error") fail("youtube is taking too long to answer.");
    }, 15000);
  }

  function create() {
    const playerVars = { playsinline: 1, rel: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3 };
    if (/^https?:$/.test(location.protocol)) playerVars.origin = location.origin;
    try {
      player = new YT.Player("yt-player", {
        videoId: cfg.youtubeId,
        width: "100%",
        height: "100%",
        playerVars,
        events: { onReady, onStateChange, onError },
      });
    } catch {
      fail("youtube's player failed to start.");
    }
  }

  function onReady() {
    ready = true;
    error = "";
    if (state === "error" || state === "loading") state = "ready";
    ui.fallback.hidden = true;
    player.setVolume(volume);
    readMeta();
    if (wantPlay) play();
    render();
  }

  function onStateChange(e) {
    const S = YT.PlayerState;
    switch (e.data) {
      case S.PLAYING:
        state = "playing";
        hint = "";
        startTimer();
        break;
      case S.BUFFERING:
        state = "buffering";
        startTimer();
        break;
      case S.PAUSED:
        state = stopping ? "stopped" : "paused";
        stopTimer();
        break;
      case S.ENDED:
        if (wantPlay) {
          player.seekTo(0, true);
          player.playVideo();
          return;
        }
        state = "stopped";
        stopTimer();
        break;
      default:
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
    stopTimer();
    ui.fallbackMsg.textContent = message;
    ui.fallback.hidden = false;
    render();
  }

  function readMeta() {
    if (!player) return;
    try {
      const data = typeof player.getVideoData === "function" ? player.getVideoData() : null;
      if (!cfg.title && data && data.title) title = data.title;
      duration = player.getDuration() || duration;
    } catch {
      /* the player isn't ready to answer yet */
    }
  }

  /* ---------- controls ---------- */
  function play() {
    if (state === "error") return false;
    wantPlay = true;
    stopping = false;
    hint = "";
    if (ready) {
      player.playVideo();
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

  function stop() {
    wantPlay = false;
    if (ready && state !== "ready" && state !== "stopped") {
      stopping = true;
      player.pauseVideo();
      player.seekTo(0, true);
      state = "stopped";
    }
    position = 0;
    stopTimer();
    render();
  }

  // matches what the button shows: "pause" only while sound is actually coming out
  function toggle() {
    if (state === "playing" || state === "buffering") pause();
    else play();
  }

  function setVolume(v) {
    volume = clampVolume(v);
    ui.vol.value = volume;
    fill(ui.vol, volume);
    if (ready) {
      player.setVolume(volume);
      if (volume > 0 && player.isMuted()) player.unMute();
    }
    store.set("gilos-volume", volume);
    render();
  }

  /* ---------- progress ---------- */
  function poll() {
    if (!ready) return;
    try {
      position = player.getCurrentTime() || 0;
      duration = player.getDuration() || duration;
    } catch {
      /* ignore */
    }
    renderProgress();
  }
  function startTimer() {
    if (!timer) timer = setInterval(poll, 500);
  }
  function stopTimer() {
    clearInterval(timer);
    timer = 0;
  }

  /* ---------- rendering ---------- */
  function statusText() {
    if (state === "error") return error;
    if (hint) return hint;
    switch (state) {
      case "loading":
        return wantPlay ? "starting…" : "connecting to youtube…";
      case "ready":
        return wantPlay ? "starting…" : "ready. press play.";
      case "playing":
        return "playing · on repeat";
      case "buffering":
        return "buffering…";
      case "paused":
        return "paused";
      case "stopped":
        return "stopped";
      default:
        return "";
    }
  }

  function setTitle(text) {
    if (ui.titleText.textContent === text) return;
    ui.titleText.textContent = text;
    ui.title.title = text;
    checkMarquee();
  }

  function checkMarquee() {
    const overflow = ui.titleText.scrollWidth - ui.title.clientWidth;
    const scroll = overflow > 4 && !GIL.reduceMotion;
    ui.title.classList.toggle("marquee", scroll);
    ui.title.style.setProperty("--shift", `-${Math.max(0, overflow) + 16}px`);
  }

  function renderProgress() {
    const pct = duration ? (position / duration) * 100 : 0;
    if (!seeking) {
      ui.seek.value = Math.round(pct * 10);
      fill(ui.seek, pct);
      ui.pos.textContent = util.mmss(position);
    }
    ui.dur.textContent = util.mmss(duration);
  }

  function render() {
    const active = state === "playing" || state === "buffering";
    ui.root.classList.toggle("is-playing", state === "playing");
    document.documentElement.classList.toggle("music-on", state === "playing");
    ui.toggleUse.setAttribute("href", active ? "#i-pause" : "#i-play");
    ui.toggleLabel.textContent = active ? "pause" : "play";
    ui.toggle.setAttribute("aria-label", active ? "pause music" : "play music");
    const broken = state === "error";
    ui.toggle.disabled = broken;
    ui.stop.disabled = broken;
    ui.seek.disabled = broken || !ready;
    setTitle(title || (broken ? "no song loaded" : "loading…"));
    ui.status.textContent = statusText();
    renderProgress();
    emit("music:change", info());
  }

  function info() {
    return { state, title: title || "", error, volume, url, playing: state === "playing" };
  }

  /* ---------- wiring ---------- */
  ui.toggle.addEventListener("click", toggle);
  ui.stop.addEventListener("click", stop);
  ui.vol.value = volume;
  fill(ui.vol, volume);
  ui.vol.addEventListener("input", () => setVolume(ui.vol.value));
  ui.seek.addEventListener("input", () => {
    seeking = true;
    const pct = ui.seek.value / 10;
    fill(ui.seek, pct);
    ui.pos.textContent = util.mmss((duration * pct) / 100);
  });
  ui.seek.addEventListener("change", () => {
    seeking = false;
    if (ready && duration) {
      position = (duration * ui.seek.value) / 1000;
      player.seekTo(position, true);
    }
    renderProgress();
  });
  if ("ResizeObserver" in window) new ResizeObserver(checkMarquee).observe(ui.title);

  GIL.music = { play, pause, stop, toggle, setVolume, info };
  render();
  load();
})();
