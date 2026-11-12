// 日韓景點路線：Service Worker（離線快取）
// 更新網站檔案時，請把 CACHE_VERSION 加 1，使用者下次開啟就會換成新版。
const CACHE_VERSION = "v2";
const CACHE_NAME = "travel-" + CACHE_VERSION;

// 離線也要能開的檔案（路徑相對於 sw.js 所在的 travel/ 資料夾）
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./data.js",
  "./app.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// 啟用新版時刪除舊版快取
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("travel-") && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 同網站的檔案：先用網路拿最新版，失敗（離線）時改用快取。
// 外部網站（Google 地圖、KakaoMap 等）不經過快取。
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        })
      )
  );
});
