// 旅行足跡：幻燈片播放（含背景音樂）
//   音樂有兩種：內建輕音樂（Web Audio 即時合成的原創旋律）、使用者自己選的音樂檔（存在 IndexedDB）
(function () {
  "use strict";

  const A = window.FootprintsApp;
  const F = window.Footprints;
  const $ = (id) => document.getElementById(id);
  const OPTS_KEY = "footprints-slideshow-v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------
  // 設定（記在手機上）
  // ---------------------------------------------------------------
  function readOpts() {
    try { return JSON.parse(localStorage.getItem(OPTS_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function saveOpts(o) {
    try { localStorage.setItem(OPTS_KEY, JSON.stringify(o)); } catch (e) { /* 無法儲存時忽略 */ }
  }
  const radio = (name) => (document.querySelector('input[name="' + name + '"]:checked') || {}).value;
  function setRadio(name, value) {
    const r = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (r) r.checked = true;
  }

  function currentOpts() {
    return {
      range: $("ss-range").value,
      order: $("ss-order").value,
      seconds: Number(radio("ss-seconds")) || 5,
      effect: radio("ss-effect") || "fade",
      music: radio("ss-music") || "builtin",
      text: $("ss-text").checked,
      loop: $("ss-loop").checked,
    };
  }

  // ---------------------------------------------------------------
  // 播放清單
  // ---------------------------------------------------------------
  function photoItems(records) {
    const out = [];
    for (const r of records) (r.photos || []).forEach((p) => out.push({ record: r, photo: p }));
    return out;
  }

  function playlist(opts) {
    let recs = A.getRecords().filter((r) => (r.photos || []).length);
    if (opts.range.startsWith("month:")) recs = recs.filter((r) => (r.date || "").slice(0, 7) === opts.range.slice(6));
    else if (opts.range.startsWith("record:")) recs = recs.filter((r) => r.id === opts.range.slice(7));
    recs.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || 0) - (b.createdAt || 0));
    if (opts.order === "desc") recs.reverse();
    return photoItems(recs);
  }

  // 依目前的足跡更新「播放範圍」選單
  function refreshRanges() {
    const sel = $("ss-range");
    const keep = sel.value || readOpts().range || "all";
    const recs = A.getRecords().filter((r) => (r.photos || []).length);
    const total = recs.reduce((n, r) => n + r.photos.length, 0);
    const opts = [["all", "全部照片（" + total + " 張）"]];
    const months = new Map();
    for (const r of recs) {
      const m = (r.date || "").slice(0, 7);
      if (m) months.set(m, (months.get(m) || 0) + r.photos.length);
    }
    [...months.keys()].sort().reverse().forEach((m) => {
      const [y, mm] = m.split("-");
      opts.push(["month:" + m, "📅 " + y + " 年 " + Number(mm) + " 月（" + months.get(m) + " 張）"]);
    });
    recs.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).forEach((r) => {
      opts.push(["record:" + r.id, "📍 " + (r.name || "未命名地點") + "（" + r.photos.length + " 張）"]);
    });
    sel.replaceChildren(...opts.map(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; return o; }));
    sel.value = opts.some(([v]) => v === keep) ? keep : "all";
    $("ss-count").textContent = total ? "共有 " + total + " 張照片可以播放。" : "還沒有照片。先到「📖 足跡」記錄幾張照片吧！";
  }

  // ---------------------------------------------------------------
  // 內建輕音樂：C–Am–F–G 和弦的分解和弦＋柔和鋪底（原創，App 即時合成）
  // ---------------------------------------------------------------
  function createSynth() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const CHORDS = [
      [261.63, 329.63, 392.0],  // C
      [220.0, 261.63, 329.63],  // Am
      [174.61, 220.0, 261.63],  // F
      [196.0, 246.94, 293.66],  // G
    ];
    const PATTERN = [0, 1, 2, 1, 0, 2, 1, 2];
    const STEP = 0.42;
    let step = 0;
    let next = 0;
    let timer = null;
    let muted = false;

    function note(freq, at, dur, type, vol) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g);
      g.connect(master);
      o.start(at);
      o.stop(at + dur + 0.05);
    }

    function schedule() {
      while (next < ctx.currentTime + 0.4) {
        const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
        const idx = PATTERN[step % 8];
        // 分解和弦：每兩小節的後半升高八度，比較有變化
        const up = Math.floor(step / 4) % 2 === 1 ? 2 : 1;
        note(chord[idx] * up, next, 0.9, "triangle", 0.09);
        if (step % 8 === 0) {
          // 每個和弦開始時：低音與柔和鋪底
          note(chord[0] / 2, next, STEP * 8, "sine", 0.08);
          chord.forEach((f) => note(f / 2, next, STEP * 8, "sine", 0.025));
        }
        step++;
        next += STEP;
      }
    }

    return {
      start() {
        if (ctx.state === "suspended") ctx.resume();
        next = ctx.currentTime + 0.1;
        schedule();
        timer = setInterval(schedule, 120);
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(muted ? 0 : 0.7, ctx.currentTime + 1.5);
      },
      pause() { ctx.suspend(); },
      resume() { ctx.resume(); },
      setMuted(m) {
        muted = m;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.1);
      },
      stop() {
        clearInterval(timer);
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        setTimeout(() => { try { ctx.close(); } catch (e) { /* 忽略 */ } }, 1200);
      },
    };
  }

  // 使用者的音樂檔
  function createFilePlayer(blob) {
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);
    audio.loop = true;
    audio.volume = 0.85;
    let fadeTimer = null;
    return {
      audio,
      start() { audio.currentTime = 0; return audio.play().catch(() => {}); },
      pause() { audio.pause(); },
      resume() { audio.play().catch(() => {}); },
      setMuted(m) { audio.muted = m; },
      stop() {
        clearInterval(fadeTimer);
        fadeTimer = setInterval(() => {
          audio.volume = Math.max(0, audio.volume - 0.1);
          if (audio.volume <= 0.01) {
            clearInterval(fadeTimer);
            audio.pause();
            URL.revokeObjectURL(audio.src);
          }
        }, 80);
      },
    };
  }

  // ---------------------------------------------------------------
  // 音樂檔：選擇、記住、移除
  // ---------------------------------------------------------------
  let musicFile = null; // { key, name, blob }
  async function loadMusicFile() {
    try { musicFile = (await A.getFile("music")) || null; } catch (e) { musicFile = null; }
    renderMusicBox();
  }
  function renderMusicBox() {
    $("ss-file-box").hidden = radio("ss-music") !== "file";
    $("ss-file-name").textContent = musicFile ? "🎶 " + musicFile.name : "還沒有選音樂檔。";
    $("ss-file-clear").hidden = !musicFile;
  }
  document.querySelectorAll('input[name="ss-music"]').forEach((r) => r.addEventListener("change", renderMusicBox));
  $("ss-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const obj = { key: "music", name: file.name, blob: file };
    try {
      await A.putFile(obj);
      musicFile = obj;
    } catch (ex) {
      $("ss-error").textContent = "音樂檔存不進去，可能是檔案太大或手機空間不足。";
      $("ss-error").hidden = false;
    }
    renderMusicBox();
  });
  $("ss-file-clear").addEventListener("click", async () => {
    await A.deleteFile("music");
    musicFile = null;
    renderMusicBox();
  });

  // ---------------------------------------------------------------
  // 播放
  // ---------------------------------------------------------------
  const player = $("ss-player");
  const imgs = [$("ss-img-a"), $("ss-img-b")];
  const st = { list: [], index: 0, playing: false, timer: null, opts: null, music: null, muted: false, layer: 0, wake: null, startedAt: 0, remaining: 0, idleTimer: null, lastFocus: null };

  function setProgress() {
    const pct = st.list.length ? ((st.index + 1) / st.list.length) * 100 : 0;
    $("ss-bar").style.width = pct + "%";
    $("ss-counter").textContent = (st.index + 1) + "／" + st.list.length;
  }

  function showSlide(i) {
    st.index = i;
    const item = st.list[i];
    const nextImg = imgs[1 - st.layer];
    const curImg = imgs[st.layer];
    nextImg.classList.remove("show", "alt");
    nextImg.alt = (item.record.name || "照片") + (item.photo.caption ? "：" + item.photo.caption : "");
    nextImg.onload = () => {
      void nextImg.offsetWidth; // 重新觸發動畫
      if (i % 2) nextImg.classList.add("alt");
      nextImg.classList.add("show");
      curImg.classList.remove("show");
      st.layer = 1 - st.layer;
    };
    nextImg.src = A.blobUrl(item.photo.full);
    $("ss-text-box").hidden = !st.opts.text;
    $("ss-place").textContent = (item.record.name || "未命名地點") + "・" + F.formatDate(item.record.date);
    $("ss-caption").textContent = item.photo.caption || "";
    setProgress();
    // 預先載入下一張
    const nx = st.list[(i + 1) % st.list.length];
    if (nx) { const pre = new Image(); pre.src = A.blobUrl(nx.photo.full); }
    schedule(st.opts.seconds * 1000);
  }

  function schedule(ms) {
    clearTimeout(st.timer);
    st.remaining = ms;
    st.startedAt = Date.now();
    if (st.playing) st.timer = setTimeout(advance, ms);
  }

  function advance() {
    if (st.index + 1 < st.list.length) showSlide(st.index + 1);
    else if (st.opts.loop) showSlide(0);
    else finish();
  }

  function finish() {
    setPlaying(false);
    if (st.music) { st.music.stop(); st.music = null; }
    $("ss-end").hidden = false;
    $("ss-again").focus();
  }

  function setPlaying(on) {
    st.playing = on;
    $("ss-play").textContent = on ? "⏸" : "▶️";
    $("ss-play").setAttribute("aria-label", on ? "暫停" : "播放");
    if (on) {
      st.timer = setTimeout(advance, Math.max(500, st.remaining));
      st.startedAt = Date.now();
      if (st.music) st.music.resume();
    } else {
      clearTimeout(st.timer);
      st.remaining = Math.max(500, st.remaining - (Date.now() - st.startedAt));
      if (st.music) st.music.pause();
    }
  }

  // 控制列：點畫面顯示，3 秒沒動作就隱藏
  function wake() {
    player.classList.remove("idle");
    clearTimeout(st.idleTimer);
    st.idleTimer = setTimeout(() => { if (st.playing) player.classList.add("idle"); }, 3000);
  }

  async function keepScreenOn() {
    try { if ("wakeLock" in navigator) st.wake = await navigator.wakeLock.request("screen"); } catch (e) { st.wake = null; }
  }

  async function start() {
    const opts = currentOpts();
    saveOpts(opts);
    const list = playlist(opts);
    const err = $("ss-error");
    if (!list.length) {
      err.textContent = "這個範圍沒有照片可以播放。";
      err.hidden = false;
      return;
    }
    if (opts.music === "file" && !musicFile) {
      err.textContent = "請先選擇音樂檔，或改用內建輕音樂。";
      err.hidden = false;
      return;
    }
    err.hidden = true;
    st.list = list;
    st.opts = opts;
    st.layer = 0;
    imgs.forEach((im) => { im.classList.remove("show", "alt"); im.removeAttribute("src"); });
    player.classList.toggle("zoom", opts.effect === "zoom" && !reduceMotion);
    player.style.setProperty("--ss-duration", (opts.seconds + 1) + "s");
    $("ss-end").hidden = true;
    st.lastFocus = document.activeElement;
    player.hidden = false;
    document.body.classList.add("no-scroll");

    // 音樂要在使用者按下「開始播放」時啟動，手機才會出聲
    st.music = null;
    if (opts.music === "builtin") st.music = createSynth();
    else if (opts.music === "file" && musicFile) st.music = createFilePlayer(musicFile.blob);
    if (st.music) { st.music.setMuted(st.muted); st.music.start(); }
    $("ss-mute").textContent = st.muted ? "🔇" : "🔊";
    $("ss-mute").hidden = !st.music;

    st.playing = true;
    $("ss-play").textContent = "⏸";
    $("ss-play").setAttribute("aria-label", "暫停");
    keepScreenOn();
    showSlide(0);
    wake();
    $("ss-play").focus();
  }

  function close() {
    clearTimeout(st.timer);
    clearTimeout(st.idleTimer);
    st.playing = false;
    if (st.music) { st.music.stop(); st.music = null; }
    if (st.wake) { st.wake.release().catch(() => {}); st.wake = null; }
    player.hidden = true;
    document.body.classList.remove("no-scroll");
    if (st.lastFocus) st.lastFocus.focus();
  }

  $("ss-form").addEventListener("submit", (e) => { e.preventDefault(); start(); });
  $("ss-play").addEventListener("click", (e) => { e.stopPropagation(); setPlaying(!st.playing); wake(); });
  $("ss-next").addEventListener("click", (e) => { e.stopPropagation(); showSlide((st.index + 1) % st.list.length); wake(); });
  $("ss-prev").addEventListener("click", (e) => { e.stopPropagation(); showSlide((st.index - 1 + st.list.length) % st.list.length); wake(); });
  $("ss-mute").addEventListener("click", (e) => {
    e.stopPropagation();
    st.muted = !st.muted;
    if (st.music) st.music.setMuted(st.muted);
    $("ss-mute").textContent = st.muted ? "🔇" : "🔊";
    $("ss-mute").setAttribute("aria-label", st.muted ? "取消靜音" : "靜音");
    wake();
  });
  $("ss-close").addEventListener("click", (e) => { e.stopPropagation(); close(); });
  $("ss-end-close").addEventListener("click", close);
  $("ss-again").addEventListener("click", () => start());
  player.addEventListener("click", () => wake());
  player.addEventListener("mousemove", () => wake());
  document.addEventListener("keydown", (e) => {
    if (player.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === " ") { e.preventDefault(); setPlaying(!st.playing); wake(); }
    else if (e.key === "ArrowRight") { showSlide((st.index + 1) % st.list.length); wake(); }
    else if (e.key === "ArrowLeft") { showSlide((st.index - 1 + st.list.length) % st.list.length); wake(); }
  });
  // 左右滑動換照片
  let touchX = null;
  player.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  player.addEventListener("touchend", (e) => {
    if (touchX == null || player.hidden || !st.list.length) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) showSlide((st.index + (dx < 0 ? 1 : -1) + st.list.length) % st.list.length);
  });
  // 切到別的 App 時暫停，回來時螢幕常亮要重新申請
  document.addEventListener("visibilitychange", () => {
    if (player.hidden) return;
    if (document.hidden && st.playing) setPlaying(false);
    else if (!document.hidden) keepScreenOn();
  });

  // ---------------------------------------------------------------
  // 初始化
  // ---------------------------------------------------------------
  const saved = readOpts();
  if (saved.order) $("ss-order").value = saved.order;
  if (saved.seconds) setRadio("ss-seconds", String(saved.seconds));
  if (saved.effect) setRadio("ss-effect", saved.effect);
  if (saved.music) setRadio("ss-music", saved.music);
  if (saved.text === false) $("ss-text").checked = false;
  if (saved.loop === false) $("ss-loop").checked = false;
  A.onShowSlideshow = () => { refreshRanges(); renderMusicBox(); $("ss-error").hidden = true; };
  loadMusicFile();
})();
