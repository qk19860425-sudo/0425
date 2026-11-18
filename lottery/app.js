// 交換禮物抽籤機：畫面操作
(function () {
  "use strict";

  const L = window.Lottery;
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "gift-lottery-v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 用手機內建的安全亂數（比 Math.random 更平均）
  function rng() {
    if (window.crypto && window.crypto.getRandomValues) {
      const a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return a[0] / 4294967296;
    }
    return Math.random();
  }

  // ---- 狀態：存在這台手機，重新整理也不會不見 ----
  // settings：輸入的設定；numbers：全部號碼；pool：還沒抽的號碼（一般模式）；
  // plan：不能抽到自己時，事先排好的結果；history：[{ order, drawer, number }]
  let state = null;
  let rolling = false;

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 無法儲存時照常使用 */ }
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (s && Array.isArray(s.numbers) && Array.isArray(s.history)) return s;
    } catch (e) { /* 資料壞掉就當作沒有 */ }
    return null;
  }

  function newGame(settings, numbers) {
    const game = { settings, numbers, history: [], pool: numbers.slice(), plan: null };
    if (settings.noSelf) game.plan = L.derangement(numbers, rng);
    return game;
  }

  const remaining = () => state.numbers.length - state.history.length;
  // 動畫進行中，結果已經存好但還沒公布：畫面上先當作還沒抽
  const shownCount = () => state.history.length - (rolling ? 1 : 0);

  // ---- 設定畫面 ----
  const form = $("setup-form");
  const startInput = $("start");
  const endInput = $("end");
  const excludesInput = $("excludes");
  const noSelfInput = $("no-self");

  function readSettings() {
    return {
      start: startInput.value.trim(),
      end: endInput.value.trim(),
      excludes: excludesInput.value.trim(),
      noSelf: noSelfInput.checked,
    };
  }

  function updatePreview() {
    const s = readSettings();
    const r = L.buildNumbers(s.start === "" ? NaN : s.start, s.end === "" ? NaN : s.end, s.excludes);
    $("setup-preview").textContent = r.ok
      ? "共 " + r.numbers.length + " 個號碼：" + summarize(r.numbers)
      : "";
  }

  // 號碼太多時只列頭尾
  function summarize(numbers) {
    if (numbers.length <= 12) return numbers.join("、");
    return numbers.slice(0, 6).join("、") + " … " + numbers.slice(-3).join("、");
  }

  [startInput, endInput, excludesInput, noSelfInput].forEach((el) => el.addEventListener("input", () => {
    $("setup-error").hidden = true;
    updatePreview();
  }));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const s = readSettings();
    const err = $("setup-error");
    const r = L.buildNumbers(s.start === "" ? NaN : s.start, s.end === "" ? NaN : s.end, s.excludes);
    if (!r.ok) {
      err.textContent = r.error;
      err.hidden = false;
      return;
    }
    if (s.noSelf && r.numbers.length < 2) {
      err.textContent = "「不會抽到自己的禮物」至少要 2 個號碼。";
      err.hidden = false;
      return;
    }
    state = newGame(s, r.numbers);
    save();
    showGame();
  });

  // ---- 抽籤畫面 ----
  const resultEl = $("result");
  const drawBtn = $("draw");
  const zoomBtn = $("zoom");
  const machine = document.querySelector(".machine");

  function setResult(number, animate) {
    resultEl.textContent = String(number);
    resultEl.classList.toggle("long", String(number).length >= 3);
    resultEl.classList.remove("rolling", "pop");
    if (animate && !reduceMotion) {
      void resultEl.offsetWidth; // 重新觸發動畫
      resultEl.classList.add("pop");
    }
  }

  function drawerLabel(entry) {
    return entry.drawer != null ? "第 " + entry.order + " 位（" + entry.drawer + " 號）" : "第 " + entry.order + " 位";
  }

  function renderStatus() {
    const left = state.numbers.length - shownCount();
    $("status").textContent = left
      ? "共 " + state.numbers.length + " 個號碼，還剩 " + left + " 個"
      : "全部 " + state.numbers.length + " 個號碼都抽完了！🎉";
    const turn = $("turn");
    if (state.plan && left) {
      const next = shownCount();
      turn.textContent = "👉 輪到 " + state.numbers[next] + " 號的人抽";
      turn.hidden = false;
    } else {
      turn.hidden = true;
    }
    drawBtn.disabled = rolling || !left;
    drawBtn.textContent = rolling ? "🎲 抽籤中…" : left ? "🎲 抽一個！" : "🎉 全部抽完了";
    zoomBtn.disabled = rolling || !state.history.length;
  }

  function renderHistory() {
    const list = $("history");
    $("history-empty").hidden = state.history.length > 0;
    list.replaceChildren(...state.history.map((h, i) => {
      const li = document.createElement("li");
      if (i === state.history.length - 1) li.className = "latest";
      const order = document.createElement("span");
      order.className = "h-order";
      order.textContent = h.drawer != null ? h.drawer + " 號 →" : "第 " + h.order + " 位";
      const num = document.createElement("span");
      num.className = "h-number";
      num.textContent = h.number;
      li.append(order, num);
      li.setAttribute("aria-label", drawerLabel(h) + "抽到 " + h.number + " 號");
      return li;
    }));
  }

  function showGame() {
    $("setup").hidden = true;
    $("game").hidden = false;
    const last = state.history[state.history.length - 1];
    if (last) {
      setResult(last.number, false);
      $("result-note").textContent = drawerLabel(last) + "抽到 " + last.number + " 號";
    } else {
      resultEl.textContent = "?";
      resultEl.classList.remove("long");
      $("result-note").textContent = "按下面的按鈕開始抽籤";
    }
    renderStatus();
    renderHistory();
  }

  function showSetup() {
    const s = state ? state.settings : null;
    if (s) {
      startInput.value = s.start;
      endInput.value = s.end;
      excludesInput.value = s.excludes;
      noSelfInput.checked = !!s.noSelf;
    }
    $("game").hidden = true;
    $("setup").hidden = false;
    $("setup-error").hidden = true;
    updatePreview();
  }

  function pickNext() {
    const order = state.history.length + 1;
    if (state.plan) {
      const i = state.history.length;
      return { order, drawer: state.numbers[i], number: state.plan[i] };
    }
    const r = L.drawFrom(state.pool, rng);
    state.pool = r.rest;
    return { order, drawer: null, number: r.number };
  }

  drawBtn.addEventListener("click", () => {
    if (rolling || !remaining()) return;
    // 先決定結果並存檔，動畫只是展示，避免中途關掉 App 造成重複抽
    const entry = pickNext();
    state.history.push(entry);
    save();

    const finish = () => {
      rolling = false;
      machine.classList.remove("rolling");
      setResult(entry.number, true);
      $("result-note").textContent = drawerLabel(entry) + "抽到 " + entry.number + " 號！";
      renderStatus();
      renderHistory();
      celebrate();
      if (navigator.vibrate) navigator.vibrate(80);
    };

    if (reduceMotion) { finish(); return; }

    rolling = true;
    renderStatus();
    machine.classList.add("rolling");
    $("result-note").textContent = "抽籤中…";
    resultEl.classList.remove("pop");
    resultEl.classList.add("rolling");
    // 號碼快速跳動，越來越慢，約 1.4 秒後停在結果
    const pool = state.numbers;
    let delay = 50;
    let elapsed = 0;
    (function tick() {
      const n = pool[Math.floor(rng() * pool.length)];
      resultEl.textContent = String(n);
      resultEl.classList.toggle("long", String(n).length >= 3);
      elapsed += delay;
      delay *= 1.12;
      if (elapsed < 1400) setTimeout(tick, delay);
      else finish();
    })();
  });

  // ---- 放大號碼 ----
  const zoomLayer = $("zoom-layer");
  function openZoom() {
    const last = state.history[state.history.length - 1];
    if (!last) return;
    $("zoom-label").textContent = drawerLabel(last) + "抽到";
    const z = $("zoom-number");
    z.textContent = String(last.number);
    z.classList.toggle("long", String(last.number).length >= 3);
    zoomLayer.hidden = false;
    $("zoom-close").focus();
  }
  function closeZoom() {
    zoomLayer.hidden = true;
    zoomBtn.focus();
  }
  zoomBtn.addEventListener("click", openZoom);
  $("zoom-close").addEventListener("click", closeZoom);
  zoomLayer.addEventListener("click", (e) => { if (e.target === zoomLayer || e.target.id === "zoom-number") closeZoom(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !zoomLayer.hidden) closeZoom(); });

  // ---- 重新開始 ----
  $("redo").addEventListener("click", () => {
    if (state.history.length && !window.confirm("要用同樣的號碼重新抽嗎？目前的抽籤紀錄會清除。")) return;
    state = newGame(state.settings, state.numbers);
    save();
    showGame();
  });
  $("reset").addEventListener("click", () => {
    if (state.history.length && remaining() && !window.confirm("還沒抽完，確定要重新設定號碼嗎？目前的抽籤紀錄會清除。")) return;
    showSetup();
  });

  // ---- 彩帶 ----
  const COLORS = ["#f43f5e", "#facc15", "#38bdf8", "#a78bfa", "#4ade80", "#fb923c", "#f472b6"];
  function celebrate() {
    if (reduceMotion) return;
    const box = $("confetti");
    const pieces = [];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement("i");
      p.style.left = Math.round(rng() * 100) + "vw";
      p.style.background = COLORS[i % COLORS.length];
      p.style.setProperty("--dx", Math.round(rng() * 120 - 60) + "px");
      p.style.setProperty("--rot", Math.round(rng() * 720 - 360) + "deg");
      p.style.animationDuration = (1.4 + rng() * 1.2).toFixed(2) + "s";
      p.style.animationDelay = (rng() * 0.25).toFixed(2) + "s";
      pieces.push(p);
    }
    box.replaceChildren(...pieces);
    setTimeout(() => box.replaceChildren(), 3000);
  }

  // ---- 啟動 ----
  state = load();
  if (state) showGame();
  else showSetup();

  // 離線也能用：註冊 Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* 註冊失敗時照常可用 */ });
    });
  }
})();
