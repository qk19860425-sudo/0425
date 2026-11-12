// 報修登記：Service Worker（離線快取）
// 更新網站檔案時，請把 CACHE_VERSION 加 1，使用者下次開啟就會換成新版。
//
// 注意：這個 sw.js 放在網站根目錄，範圍會涵蓋 models/、travel/、doraemon/ 等子資料夾。
// 為了不干擾那些網站（它們有各自的 Service Worker），這裡只處理下面列出的報修登記檔案，
// 其他請求一律不經手。
const CACHE_VERSION = "v1";
const CACHE_NAME = "repair-" + CACHE_VERSION;

// 報修登記本身的檔案（路徑相對於 sw.js 所在的根目錄）
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./config.js",
  "./app.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
];
const SHELL_URLS = new Set(APP_SHELL.map((p) => new URL(p, self.location).href));

// supabase-js（固定版本，內容不會變，所以優先用快取）
const LIBS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      await Promise.all(LIBS.map((url) =>
        cache.add(new Request(url, { mode: "cors", credentials: "omit" })).catch(() => {})
      ));
    }).then(() => self.skipWaiting())
  );
});

// 啟用新版時刪除舊版快取（只刪自己的，不動其他網站的快取）
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("repair-") && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  url.search = "";
  url.hash = "";

  // supabase-js：先用快取，沒有才上網抓並存起來
  if (LIBS.includes(url.href)) {
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

  // 只處理報修登記自己的檔案；Supabase 資料、子資料夾的網站都不經手
  if (!SHELL_URLS.has(url.href)) return;

  // 先用網路拿最新版，失敗（離線）時改用快取
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
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./index.html"))
      )
  );
});
