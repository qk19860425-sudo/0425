// 東京模型店搜尋：註冊 Service Worker、顯示「安裝到主畫面」與離線提示
(function () {
  "use strict";

  const installBox = document.getElementById("install");
  const installButton = document.getElementById("install-button");
  const installHint = document.getElementById("install-hint");
  const offlineBar = document.getElementById("offline");

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* 註冊失敗時網站照常可用 */ });
    });
  }

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  // Android、桌機 Chrome／Edge：瀏覽器允許時才顯示安裝按鈕
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installBox.hidden = false;
    installButton.hidden = false;
    installHint.hidden = true;
  });

  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBox.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installBox.hidden = true;
  });

  // iPhone、iPad 的 Safari 沒有安裝按鈕，改顯示操作說明
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS && !isStandalone) {
    installBox.hidden = false;
    installButton.hidden = true;
    installHint.hidden = false;
  }

  // 離線提示：店家清單與篩選離線可用，地圖底圖與 Google 地圖需要網路
  function updateOnline() {
    offlineBar.hidden = navigator.onLine;
  }
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();
})();
