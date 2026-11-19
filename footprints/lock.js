// 旅行足跡：開啟 App 時的密碼鎖（4 位數）
//   密碼只存雜湊值（SHA-256），原始碼裡看不到密碼本身。
//   這是防止別人隨手翻看的簡易鎖；足跡資料本來就只存在這支手機。
//   要改密碼：把 "footprints-lock-v1:" 加上新密碼算 SHA-256，換掉下面的 PIN_HASH。
(function () {
  "use strict";

  const PIN_HASH = "bd4ab2e5067c587ad8398535788e55f38f2a2cfab2512af708f088a8b784a540";
  const SALT = "footprints-lock-v1:";
  const LENGTH = 4;
  const MAX_TRIES = 5;
  const WAIT_MS = 30000;
  const SESSION_KEY = "footprints-unlocked";

  const lock = document.getElementById("lock");
  const dots = document.getElementById("lock-dots");
  const msg = document.getElementById("lock-message");
  const keys = document.getElementById("lock-keys");

  // 這次開啟已經解鎖過（重新整理頁面時不用再輸入）
  let unlocked = false;
  try { unlocked = sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) { unlocked = false; }
  if (unlocked) { open(); return; }

  let entry = "";
  let tries = 0;
  let waitUntil = 0;
  let busy = false;

  async function sha256(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return "";
  }

  function renderDots() {
    dots.replaceChildren(...Array.from({ length: LENGTH }, (_, i) => {
      const d = document.createElement("span");
      d.className = "lock-dot" + (i < entry.length ? " filled" : "");
      return d;
    }));
    dots.setAttribute("aria-label", "已輸入 " + entry.length + " 位，共 " + LENGTH + " 位");
  }

  function setMessage(text, isError) {
    msg.textContent = text;
    msg.classList.toggle("lock-error", !!isError);
  }

  function open() {
    document.body.classList.remove("locked");
    lock.hidden = true;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) { /* 無法記住時，下次重新整理要再輸入 */ }
  }

  async function check() {
    busy = true;
    const ok = (await sha256(SALT + entry)) === PIN_HASH;
    if (ok) {
      setMessage("🔓 歡迎回來！", false);
      setTimeout(open, 250);
      return;
    }
    tries++;
    entry = "";
    lock.querySelector(".lock-box").classList.remove("shake");
    void lock.offsetWidth;
    lock.querySelector(".lock-box").classList.add("shake");
    if (navigator.vibrate) navigator.vibrate(150);
    if (tries >= MAX_TRIES) {
      tries = 0;
      waitUntil = Date.now() + WAIT_MS;
      countdown();
    } else {
      setMessage("密碼不對，還可以再試 " + (MAX_TRIES - tries) + " 次。", true);
    }
    renderDots();
    busy = false;
  }

  function countdown() {
    const left = Math.ceil((waitUntil - Date.now()) / 1000);
    if (left > 0) {
      setMessage("輸錯太多次了，請等 " + left + " 秒再試。", true);
      setTimeout(countdown, 500);
    } else {
      setMessage("請輸入 4 位數密碼", false);
    }
  }

  function press(k) {
    if (busy || Date.now() < waitUntil) return;
    if (k === "del") entry = entry.slice(0, -1);
    else if (/^\d$/.test(k) && entry.length < LENGTH) entry += k;
    renderDots();
    if (entry.length === LENGTH) check();
  }

  keys.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-key]");
    if (b) press(b.dataset.key);
  });
  document.addEventListener("keydown", (e) => {
    if (lock.hidden) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("del");
  });

  if (!(window.crypto && crypto.subtle)) {
    setMessage("這個瀏覽器無法驗證密碼，請用 Safari 或 Chrome 開啟網址（https）。", true);
  }
  renderDots();
})();
