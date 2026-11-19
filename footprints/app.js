// 旅行足跡：畫面操作
//   資料存在瀏覽器的 IndexedDB（records：每筆足跡，照片以 Blob 存在 photos 陣列裡）
(function () {
  "use strict";

  const F = window.Footprints;
  const $ = (id) => document.getElementById(id);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // ---------------------------------------------------------------
  // IndexedDB
  // ---------------------------------------------------------------
  const DB_NAME = "footprints";
  const STORE = "records";
  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        // 版本 2：新增 files（存幻燈片用的音樂檔）
        const req = indexedDB.open(DB_NAME, 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
          if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "key" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function tx(mode, fn, storeName) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName || STORE, mode);
      const store = t.objectStore(storeName || STORE);
      let result;
      Promise.resolve(fn(store)).then((r) => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("寫入失敗"));
    });
  }

  const reqP = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  const getAll = () => tx("readonly", (s) => reqP(s.getAll()));
  const putRecord = (r) => tx("readwrite", (s) => { s.put(r); });
  const deleteRecord = (id) => tx("readwrite", (s) => { s.delete(id); });

  // ---------------------------------------------------------------
  // 照片：縮小後存起來（原圖 1600px、縮圖 400px，JPEG）
  // ---------------------------------------------------------------
  function loadImage(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("無法讀取照片")); };
      img.src = url;
    });
  }

  function resize(img, max, quality) {
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("照片轉換失敗"))), "image/jpeg", quality));
  }

  async function processPhoto(file) {
    const exif = F.readExif(await file.slice(0, 256 * 1024).arrayBuffer());
    const img = await loadImage(file);
    const full = await resize(img, 1600, 0.82);
    const thumb = await resize(img, 400, 0.75);
    return { photo: { id: F.newId(), full, thumb }, exif };
  }

  // 每個 Blob 只建立一次網址，畫面重畫時重複使用
  const urlCache = new WeakMap();
  function blobUrl(blob) {
    if (!blob) return "";
    let u = urlCache.get(blob);
    if (!u) { u = URL.createObjectURL(blob); urlCache.set(blob, u); }
    return u;
  }

  // ---------------------------------------------------------------
  // 分頁
  // ---------------------------------------------------------------
  const tabs = ["list", "map", "slideshow", "backup"];
  function showTab(name) {
    for (const t of tabs) {
      $("tab-" + t).setAttribute("aria-selected", String(t === name));
      $("panel-" + t).hidden = t !== name;
    }
    // 「＋ 記錄這裡」只在足跡與地圖分頁顯示，避免蓋住播放、備份的設定
    $("add").hidden = !(name === "list" || name === "map");
    if (name === "map") showMap();
    if (name === "backup") renderBackupStats();
    if (name === "slideshow" && window.FootprintsApp.onShowSlideshow) window.FootprintsApp.onShowSlideshow();
  }
  for (const t of tabs) $("tab-" + t).addEventListener("click", () => showTab(t));

  // ---------------------------------------------------------------
  // 足跡列表
  // ---------------------------------------------------------------
  let records = [];

  async function reload() {
    try {
      records = await getAll();
    } catch (e) {
      records = [];
      $("list").replaceChildren(el("p", "card message message-error", "這個瀏覽器無法儲存資料（可能是私密瀏覽模式），請改用一般模式開啟。"));
      return;
    }
    renderList();
    if (map) refreshMapMarkers();
    const photoCount = records.reduce((n, r) => n + (r.photos || []).length, 0);
    $("stats").textContent = records.length ? "已記錄 " + records.length + " 個地方・" + photoCount + " 張照片" : "";
  }

  function locText(r) {
    return r.lat != null && r.lng != null ? "📍 " + r.lat.toFixed(5) + ", " + r.lng.toFixed(5) : "📍 沒有位置";
  }

  function renderList() {
    const list = $("list");
    if (!records.length) {
      const empty = el("div", "card empty");
      empty.append(el("p", "big", "🧳"), el("p", "", "還沒有足跡。按右下角「＋ 記錄這裡」，記下第一個地方吧！"));
      list.replaceChildren(empty);
      return;
    }
    const parts = [];
    for (const g of F.groupByMonth(records)) {
      parts.push(el("h2", "month", g.label + "（" + g.items.length + "）"));
      for (const r of g.items) parts.push(renderEntry(r));
    }
    list.replaceChildren(...parts);
  }

  function renderEntry(r) {
    const card = el("article", "card entry");
    card.id = "entry-" + r.id;
    const head = el("div", "entry-head");
    head.append(el("h3", "entry-name", r.name || "未命名地點"), el("span", "entry-date", F.formatDate(r.date)));
    card.append(head);
    if ((r.photos || []).length) {
      const strip = el("div", "thumbs");
      r.photos.forEach((p, i) => {
        const b = el("button");
        b.type = "button";
        b.setAttribute("aria-label", "看大圖：" + (r.name || "照片") + " 第 " + (i + 1) + " 張" + (p.caption ? "（" + p.caption + "）" : ""));
        if (p.caption) b.classList.add("has-caption");
        const img = el("img");
        img.src = blobUrl(r.photos.length === 1 ? p.full : p.thumb);
        img.alt = "";
        img.loading = "lazy";
        b.append(img);
        b.addEventListener("click", () => openViewer(r, i));
        strip.append(b);
      });
      card.append(strip);
    }
    if (r.note) card.append(el("p", "entry-note", r.note));
    card.append(el("p", "entry-loc", locText(r)));

    const actions = el("div", "actions");
    if (r.lat != null) {
      const onMap = el("button", "button button-secondary button-small", "🗺️ 地圖");
      onMap.type = "button";
      onMap.addEventListener("click", () => { showTab("map"); focusOnMap(r); });
      const nav = el("a", "button button-secondary button-small", "🧭 導航");
      nav.href = "https://www.google.com/maps/dir/?api=1&destination=" + r.lat + "," + r.lng;
      nav.target = "_blank";
      nav.rel = "noopener noreferrer";
      actions.append(onMap, nav);
    }
    const edit = el("button", "button button-secondary button-small", "✏️ 編輯");
    edit.type = "button";
    edit.addEventListener("click", () => openEditor(r));
    const del = el("button", "button button-secondary button-small", "🗑️ 刪除");
    del.type = "button";
    del.addEventListener("click", async () => {
      if (!window.confirm("確定要刪除「" + (r.name || "未命名地點") + "」？照片也會一起刪除，無法復原。")) return;
      await deleteRecord(r.id);
      reload();
    });
    actions.append(edit, del);
    card.append(actions);
    return card;
  }

  // ---------------------------------------------------------------
  // 地圖
  // ---------------------------------------------------------------
  let map = null;
  let markerLayer = null;
  const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 貢獻者';

  function showMap() {
    if (!window.L) {
      $("map").hidden = true;
      $("map-error").hidden = false;
      return;
    }
    if (!map) {
      map = L.map("map").setView([25.04, 121.56], 4);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);
      refreshMapMarkers(true);
    }
    setTimeout(() => map.invalidateSize(), 50);
  }

  function pinIcon(r) {
    const first = (r.photos || [])[0];
    if (!first) return L.divIcon({ className: "", html: '<div class="dot-pin"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
    const div = document.createElement("div");
    div.className = "photo-pin";
    div.style.width = div.style.height = "48px";
    const img = document.createElement("img");
    img.src = blobUrl(first.thumb);
    img.alt = "";
    div.append(img);
    return L.divIcon({ className: "", html: div, iconSize: [48, 48], iconAnchor: [24, 24] });
  }

  function popupFor(r) {
    const box = el("div", "popup");
    const first = (r.photos || [])[0];
    if (first) {
      const img = el("img");
      img.src = blobUrl(first.thumb);
      img.alt = "";
      box.append(img);
    }
    box.append(el("strong", "", r.name || "未命名地點"), el("span", "", F.formatDate(r.date)));
    const go = el("button", "button button-small", "查看這筆足跡");
    go.type = "button";
    go.addEventListener("click", () => {
      showTab("list");
      const card = $("entry-" + r.id);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    box.append(el("br"), go);
    return box;
  }

  function refreshMapMarkers(fit) {
    if (!map) return;
    markerLayer.clearLayers();
    const pts = [];
    for (const r of records) {
      if (r.lat == null || r.lng == null) continue;
      L.marker([r.lat, r.lng], { icon: pinIcon(r), title: r.name || "" }).bindPopup(() => popupFor(r)).addTo(markerLayer);
      pts.push([r.lat, r.lng]);
    }
    if (fit && pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
  }

  function focusOnMap(r) {
    if (!map) return;
    map.setView([r.lat, r.lng], 15);
    markerLayer.eachLayer((m) => {
      const p = m.getLatLng();
      if (p.lat === r.lat && p.lng === r.lng) m.openPopup();
    });
  }

  // ---------------------------------------------------------------
  // 新增／編輯
  // ---------------------------------------------------------------
  const editor = { record: null, photos: [], lat: null, lng: null, locSource: "", busy: 0 };
  let pickMap = null;
  let pickMarker = null;
  let lastFocus = null;

  function setLocation(lat, lng, source) {
    editor.lat = lat;
    editor.lng = lng;
    editor.locSource = source;
    const label = { here: "目前位置", photo: "照片的拍攝地點", map: "在地圖上選的位置", saved: "已存的位置" }[source] || "";
    $("loc-status").textContent = lat == null ? "還沒有位置" : "📍 " + label + "：" + lat.toFixed(5) + ", " + lng.toFixed(5);
    if (pickMap) {
      if (lat == null) {
        if (pickMarker) { pickMarker.remove(); pickMarker = null; }
      } else {
        if (!pickMarker) pickMarker = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<div class="dot-pin"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(pickMap);
        pickMarker.setLatLng([lat, lng]);
        pickMap.setView([lat, lng], Math.max(pickMap.getZoom(), 14));
      }
    }
  }

  function useCurrentLocation(auto) {
    if (!navigator.geolocation) {
      if (!auto) $("loc-status").textContent = "這個瀏覽器不支援定位，請在地圖上點選位置。";
      return;
    }
    $("loc-status").textContent = "📡 正在取得目前位置…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // 自動定位時，若使用者已經用照片或地圖選了位置，就不覆蓋
        if (auto && editor.lat != null && editor.locSource !== "here") return;
        setLocation(Math.round(pos.coords.latitude * 1e6) / 1e6, Math.round(pos.coords.longitude * 1e6) / 1e6, "here");
      },
      () => {
        if (editor.lat == null) $("loc-status").textContent = "無法取得目前位置，請允許定位權限，或直接點地圖選位置。";
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  function renderEditorPhotos() {
    const box = $("photo-list");
    box.replaceChildren(...editor.photos.map((p, i) => {
      const item = el("div", "photo-edit");
      const img = el("img");
      img.src = blobUrl(p.thumb);
      img.alt = "照片 " + (i + 1);
      const rm = el("button", "", "✕");
      rm.type = "button";
      rm.setAttribute("aria-label", "移除第 " + (i + 1) + " 張照片");
      rm.addEventListener("click", () => { editor.photos.splice(i, 1); renderEditorPhotos(); });
      item.append(img, rm);
      return item;
    }));
  }

  async function addFiles(files) {
    const list = [...files].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name));
    if (!list.length) return;
    editor.busy++;
    $("editor-save").disabled = true;
    $("photo-status").textContent = "處理照片中…（" + list.length + " 張）";
    let failed = 0;
    for (const file of list) {
      try {
        const { photo, exif } = await processPhoto(file);
        editor.photos.push(photo);
        if (exif.lat != null && (editor.lat == null || editor.locSource === "here")) setLocation(exif.lat, exif.lng, "photo");
        if (exif.date && !editor.record && editor.photos.length === 1) $("f-date").value = exif.date;
        renderEditorPhotos();
      } catch (e) { failed++; }
    }
    editor.busy--;
    $("editor-save").disabled = editor.busy > 0;
    $("photo-status").textContent = failed ? failed + " 張照片無法讀取（可能是格式不支援）。" : "";
  }
  $("photo-camera").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });
  $("photo-library").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });

  function openEditor(record) {
    editor.record = record || null;
    editor.photos = record ? (record.photos || []).slice() : [];
    $("editor-title").textContent = record ? "編輯足跡" : "記錄這裡";
    $("f-name").value = record ? record.name || "" : "";
    $("f-date").value = record ? record.date || "" : F.todayString();
    $("f-note").value = record ? record.note || "" : "";
    $("editor-error").hidden = true;
    $("photo-status").textContent = "";
    renderEditorPhotos();
    lastFocus = document.activeElement;
    $("editor").hidden = false;
    document.body.classList.add("no-scroll");

    if (window.L && !pickMap) {
      pickMap = L.map("pick-map").setView([25.04, 121.56], 4);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(pickMap);
      pickMap.on("click", (e) => setLocation(Math.round(e.latlng.lat * 1e6) / 1e6, Math.round(e.latlng.lng * 1e6) / 1e6, "map"));
    }
    $("pick-map").hidden = !window.L;
    if (pickMap) setTimeout(() => pickMap.invalidateSize(), 50);

    if (record && record.lat != null) setLocation(record.lat, record.lng, "saved");
    else {
      setLocation(null, null, "");
      if (!record) useCurrentLocation(true);
    }
    $("f-name").focus();
  }

  function closeEditor() {
    $("editor").hidden = true;
    document.body.classList.remove("no-scroll");
    if (lastFocus) lastFocus.focus();
  }

  $("add").addEventListener("click", () => openEditor(null));
  $("editor-close").addEventListener("click", closeEditor);
  $("editor-cancel").addEventListener("click", closeEditor);
  $("loc-here").addEventListener("click", () => useCurrentLocation(false));
  $("loc-clear").addEventListener("click", () => setLocation(null, null, ""));

  $("editor-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (editor.busy) return;
    const name = $("f-name").value.trim();
    const err = $("editor-error");
    if (!name && !editor.photos.length) {
      err.textContent = "請至少填地點名稱，或加一張照片。";
      err.hidden = false;
      return;
    }
    const base = editor.record || { id: F.newId(), createdAt: Date.now() };
    const rec = Object.assign({}, base, {
      name: name || "未命名地點",
      date: $("f-date").value || F.todayString(),
      note: $("f-note").value.trim(),
      lat: editor.lat,
      lng: editor.lng,
      photos: editor.photos,
      updatedAt: Date.now(),
    });
    try {
      await putRecord(rec);
    } catch (ex) {
      err.textContent = "儲存失敗：手機空間可能不足。可以先匯出備份，再刪掉一些舊照片。";
      err.hidden = false;
      return;
    }
    closeEditor();
    await reload();
    showTab("list");
    const card = $("entry-" + rec.id);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    requestPersist();
  });

  // ---------------------------------------------------------------
  // 看大圖
  // ---------------------------------------------------------------
  const viewer = { record: null, index: 0 };
  function showViewerPhoto() {
    const r = viewer.record;
    const p = r.photos[viewer.index];
    $("viewer-img").src = blobUrl(p.full);
    $("viewer-img").alt = (r.name || "照片") + " 第 " + (viewer.index + 1) + " 張";
    $("viewer-caption").textContent = (r.name || "未命名地點") + "・" + F.formatDate(r.date) + "（" + (viewer.index + 1) + "／" + r.photos.length + "）";
    $("viewer-prev").hidden = $("viewer-next").hidden = r.photos.length < 2;
    // 照片文字
    const text = p.caption || "";
    $("viewer-text").textContent = text;
    $("viewer-text").hidden = !text;
    $("viewer-text-edit").textContent = text ? "✏️ 編輯文字" : "✏️ 添加文字";
    setViewerEditing(false);
  }
  function openViewer(r, i) {
    viewer.record = r;
    viewer.index = i;
    lastFocus = document.activeElement;
    showViewerPhoto();
    $("viewer").hidden = false;
    document.body.classList.add("no-scroll");
    $("viewer-close").focus();
  }
  function closeViewer() {
    $("viewer").hidden = true;
    document.body.classList.remove("no-scroll");
    if (lastFocus) lastFocus.focus();
  }
  const step = (d) => {
    if (viewer.editing) return;
    const n = viewer.record.photos.length;
    viewer.index = (viewer.index + d + n) % n;
    showViewerPhoto();
  };

  // ---- 照片文字：點「添加文字」→ 輸入 → 儲存 ----
  function setViewerEditing(on) {
    viewer.editing = on;
    $("viewer-edit").hidden = !on;
    $("viewer-text-edit").hidden = on;
    $("viewer-prev").disabled = $("viewer-next").disabled = on;
    $("viewer").classList.toggle("editing", on);
    if (on) {
      const p = viewer.record.photos[viewer.index];
      $("viewer-input").value = p.caption || "";
      $("viewer-text").hidden = true;
      $("viewer-input").focus();
    }
  }
  $("viewer-text-edit").addEventListener("click", () => setViewerEditing(true));
  $("viewer-text-cancel").addEventListener("click", () => { showViewerPhoto(); $("viewer-text-edit").focus(); });
  $("viewer-text-save").addEventListener("click", async () => {
    const r = viewer.record;
    const text = $("viewer-input").value.trim().slice(0, 500);
    const photos = r.photos.slice();
    photos[viewer.index] = Object.assign({}, photos[viewer.index], { caption: text });
    const updated = Object.assign({}, r, { photos, updatedAt: Date.now() });
    $("viewer-text-save").disabled = true;
    try {
      await putRecord(updated);
      viewer.record = updated;
      await reload();
      showViewerPhoto();
      $("viewer-text-edit").focus();
    } catch (e) {
      window.alert("儲存失敗，請稍後再試。");
    }
    $("viewer-text-save").disabled = false;
  });
  $("viewer-close").addEventListener("click", closeViewer);
  $("viewer-prev").addEventListener("click", () => step(-1));
  $("viewer-next").addEventListener("click", () => step(1));
  $("viewer").addEventListener("click", (e) => { if (e.target.id === "viewer" && !viewer.editing) closeViewer(); });
  document.addEventListener("keydown", (e) => {
    if (!$("viewer").hidden) {
      if (viewer.editing) {
        if (e.key === "Escape") { showViewerPhoto(); $("viewer-text-edit").focus(); }
        return;
      }
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    } else if (!$("editor").hidden && e.key === "Escape") closeEditor();
  });
  // 左右滑動換照片
  let touchX = null;
  $("viewer").addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  $("viewer").addEventListener("touchend", (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50 && !viewer.editing && viewer.record && viewer.record.photos.length > 1) step(dx < 0 ? 1 : -1);
  });

  // ---------------------------------------------------------------
  // 備份
  // ---------------------------------------------------------------
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }
  async function dataUrlToBlob(url) {
    const res = await fetch(url);
    return res.blob();
  }

  function showBackupMessage(text, isError) {
    const m = $("backup-message");
    m.textContent = text;
    m.classList.toggle("message-error", !!isError);
    m.hidden = !text;
  }

  async function renderBackupStats() {
    const photoCount = records.reduce((n, r) => n + (r.photos || []).length, 0);
    let text = "目前有 " + records.length + " 筆足跡、" + photoCount + " 張照片。";
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        text += "已使用約 " + (est.usage / 1024 / 1024).toFixed(1) + " MB。";
      }
      if (navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()) text += "已設定為永久保存。";
    } catch (e) { /* 部分瀏覽器不支援 */ }
    $("backup-stats").textContent = text;
  }

  $("export").addEventListener("click", async () => {
    if (!records.length) { showBackupMessage("還沒有足跡可以備份。"); return; }
    $("export").disabled = true;
    showBackupMessage("準備備份檔中…");
    try {
      const out = { app: "footprints", version: 1, exportedAt: new Date().toISOString(), records: [] };
      for (const r of records) {
        const photos = [];
        for (const p of r.photos || []) photos.push({ id: p.id, caption: p.caption || "", full: await blobToDataUrl(p.full), thumb: await blobToDataUrl(p.thumb) });
        out.records.push({ id: r.id, name: r.name, date: r.date, note: r.note, lat: r.lat, lng: r.lng, createdAt: r.createdAt, photos });
      }
      const blob = new Blob([JSON.stringify(out)], { type: "application/json" });
      const a = el("a");
      a.href = URL.createObjectURL(blob);
      a.download = "footprints-backup-" + F.todayString().replace(/-/g, "") + ".json";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      showBackupMessage("已產生備份檔（約 " + (blob.size / 1024 / 1024).toFixed(1) + " MB）。iPhone 會開啟分享選單，可以存到「檔案」或傳到雲端硬碟。");
    } catch (e) {
      showBackupMessage("備份失敗，請稍後再試。", true);
    }
    $("export").disabled = false;
  });

  $("import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    showBackupMessage("讀取備份檔中…");
    try {
      const check = F.checkBackup(JSON.parse(await file.text()));
      if (!check.ok) { showBackupMessage(check.error, true); return; }
      const existing = new Set(records.map((r) => r.id));
      let added = 0;
      for (const r of check.records) {
        if (existing.has(r.id)) continue;
        const photos = [];
        for (const p of r.photos) photos.push({ id: p.id, caption: p.caption || "", full: await dataUrlToBlob(p.full), thumb: await dataUrlToBlob(p.thumb) });
        await putRecord(Object.assign({}, r, { photos }));
        added++;
      }
      await reload();
      renderBackupStats();
      showBackupMessage("匯入完成：新增 " + added + " 筆足跡" + (check.records.length - added ? "，" + (check.records.length - added) + " 筆已存在所以略過" : "") + "。");
    } catch (ex) {
      showBackupMessage("匯入失敗：檔案可能損毀，或手機空間不足。", true);
    }
  });

  // 請瀏覽器盡量不要自動清掉資料
  function requestPersist() {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* 忽略 */ }
  }

  // ---------------------------------------------------------------
  // 給幻燈片（slideshow.js）用的介面
  // ---------------------------------------------------------------
  window.FootprintsApp = {
    getRecords: () => records,
    blobUrl,
    getFile: (key) => tx("readonly", (st) => reqP(st.get(key)), "files"),
    putFile: (obj) => tx("readwrite", (st) => { st.put(obj); }, "files"),
    deleteFile: (key) => tx("readwrite", (st) => { st.delete(key); }, "files"),
    onShowSlideshow: null,
  };

  // ---------------------------------------------------------------
  // 啟動
  // ---------------------------------------------------------------
  reload();
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => { /* 註冊失敗時照常可用 */ }); });
  }
})();
