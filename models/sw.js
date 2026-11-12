// 東京模型店搜尋：Service Worker（離線快取）
// 更新網站檔案時，請把 CACHE_VERSION 加 1，使用者下次開啟就會換成新版。
const CACHE_VERSION = "v1";
const CACHE_NAME = "models-" + CACHE_VERSION;

// 離線也要能開的檔案（路徑相對於 sw.js 所在的 models/ 資料夾）
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./shops.js",
  "./app.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
];

// 地圖程式庫 Leaflet（固定版本，內容不會變，所以優先用快取）
const LEAFLET = [
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      // Leaflet 抓不到時不影響安裝，之後開頁面時會再存
      await Promise.all(LEAFLET.map((url) =>
        cache.add(new Request(url, { mode: "cors", credentials: "omit" })).catch(() => {})
      ));
    }).then(() => self.skipWaiting())
  );
});

// 啟用新版時刪除舊版快取
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("models-") && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Leaflet：先用快取，沒有才上網抓並存起來
  if (LEAFLET.includes(url.href)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // 其他外部網站（地圖圖磚、Google 地圖等）不經過快取
  if (url.origin !== self.location.origin) return;

  // 同網站的檔案：先用網路拿最新版，失敗（離線）時改用快取
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
