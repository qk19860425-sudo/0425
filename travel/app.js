// 日韓景點路線：推薦行程、路線查詢、旅遊指南
(function () {
  "use strict";

  // 只顯示某些國家：日本 App 設 window.APP_COUNTRY = "jp"、韓國 "kr"、印尼 "id"；
  // 日韓合併版設 "jp,kr"（用逗號分開）。未設定則全部顯示。
  const APP_COUNTRIES = String(window.APP_COUNTRY || "").split(",").map((x) => x.trim()).filter(Boolean);
  const inCountry = (x) => !APP_COUNTRIES.length || APP_COUNTRIES.includes(x.country);

  // 地區依地理位置由北到南排列；不在清單裡的排在最後
  const REGION_ORDER = [
    "sapporo", "sendai", "tokyo", "nagoya", "kanazawa", "kansai", "hiroshima", "takamatsu", "fukuoka", "nagasaki", "okinawa",
    "seoul", "gangneung", "daegu", "busan", "jeonju", "jeju",
    "jakarta", "yogyakarta", "bali", "lombok", "labuanbajo",
  ];
  const orderOf = (id) => { const i = REGION_ORDER.indexOf(id); return i < 0 ? 999 : i; };
  const REGIONS = (window.REGIONS || []).filter(inCountry).slice().sort((a, b) => orderOf(a.id) - orderOf(b.id));
  const GUIDES = (window.GUIDES || []).filter(inCountry);
  const $ = (id) => document.getElementById(id);

  $("updated").textContent = window.TRAVEL_UPDATED || "";

  // ---------------------------------------------------------------
  // 共用小工具
  // ---------------------------------------------------------------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function link(text, href, className) {
    const a = el("a", className, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }

  function chip(text, pressed, onClick) {
    const b = el("button", "chip", text);
    b.type = "button";
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", onClick);
    return b;
  }

  function formatMinutes(min) {
    const m = Math.max(1, Math.round(min));
    if (m < 60) return "約 " + m + " 分鐘";
    const h = Math.floor(m / 60);
    const r = m % 60;
    return "約 " + h + " 小時" + (r ? " " + r + " 分鐘" : "");
  }

  const MODE_ICON = { "步行": "🚶", "大眾運輸": "🚇", "地鐵": "🚇", "電車": "🚆", "公車": "🚌", "計程車": "🚕", "纜車": "🚡", "叫車": "🚗", "機車": "🛵", "船": "⛴️", "包車": "🚐" };
  function modeLabel(mode) {
    return (MODE_ICON[mode] || "➡️") + " " + mode;
  }
  // 交通方式的彩色標籤
  const MODE_CLASS = { "步行": "walk", "大眾運輸": "transit", "地鐵": "subway", "電車": "rail", "公車": "bus", "計程車": "taxi", "纜車": "cable", "叫車": "taxi", "機車": "taxi", "船": "boat", "包車": "taxi" };

  // 各國地圖 App 的補充說明
  function mapAppNote(region) {
    if (region.country === "kr") return "韓國的 Google 地圖可以查大眾運輸，但步行導航不可靠，建議搭配 Naver 地圖或 KakaoMap。";
    if (region.country === "id") return "印尼的 Google 地圖可以查雅加達的捷運、通勤電車；峇里島、龍目島等地幾乎沒有大眾運輸，建議用 Grab 或 Gojek 叫車（App 會先顯示價格）。";
    return "";
  }
  function modeTag(mode) {
    return el("strong", "mode-tag mode-" + (MODE_CLASS[mode] || "other"), modeLabel(mode));
  }


  // 地區名稱前面加上特色圖案
  function regionLabel(r) {
    return (r.emoji ? r.emoji + " " : "") + r.name;
  }

  function findRegion(id) {
    return REGIONS.find((r) => r.id === id);
  }

  function findSpot(region, id) {
    return region.spots.find((s) => s.id === id);
  }

  function findHub(region, id) {
    return region.hubs.find((h) => h.id === id);
  }

  // 兩點直線距離（公里）
  function distanceKm(a, b) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function googleTransitUrl(a, b) {
    return "https://www.google.com/maps/dir/?api=1&origin=" + a.lat + "," + a.lng +
      "&destination=" + b.lat + "," + b.lng + "&travelmode=transit";
  }

  function kakaoToUrl(b) {
    return "https://map.kakao.com/link/to/" + encodeURIComponent(b.name.replace(/,/g, " ")) + "," + b.lat + "," + b.lng;
  }

  function mapLinks(region, a, b) {
    const box = el("div", "map-links");
    box.append(link("Google 地圖查即時路線", googleTransitUrl(a, b), "button button-small"));
    if (region.country === "kr") {
      box.append(link("KakaoMap 導航到目的地", kakaoToUrl(b), "button button-secondary button-small"));
    }
    return box;
  }

  // ---------------------------------------------------------------
  // 分頁
  // ---------------------------------------------------------------
  const tabs = ["plans", "route", "guide", "translate"];
  function showTab(name) {
    for (const t of tabs) {
      const active = t === name;
      $("tab-" + t).setAttribute("aria-selected", String(active));
      $("panel-" + t).hidden = !active;
    }
  }
  for (const t of tabs) $("tab-" + t).addEventListener("click", () => showTab(t));

  // ---------------------------------------------------------------
  // 推薦行程
  // ---------------------------------------------------------------
  function renderItinerary(region, it) {
    const card = el("article", "card plan");
    const head = el("div", "plan-head");
    head.append(el("h2", "plan-title", it.title), el("span", "badge", regionLabel(region)));
    card.append(head);

    const meta = el("div", "tags");
    meta.append(el("span", "tag tag-days", it.days >= 1 ? it.days + " 天" : "半天"));
    for (const t of it.themes) meta.append(el("span", "tag", t));
    card.append(meta, el("p", "plan-summary", it.summary));

    const totalMin = it.legs.reduce((s, l) => s + l.minutes, 0);
    card.append(el("p", "plan-total", "交通時間合計 " + formatMinutes(totalMin) + "（不含參觀）"));

    const ol = el("ol", "timeline");
    it.stops.forEach((stopId, i) => {
      const spot = findSpot(region, stopId);
      const li = el("li", "stop");
      li.append(el("span", "stop-dot dot-" + (i % 6), String(i + 1)));
      const body = el("div", "stop-body");
      body.append(el("h3", "stop-name", spot.name));
      body.append(el("p", "stop-meta", "🚉 " + spot.station + "　⏱ 建議停留 " + spot.stay));
      li.append(body);
      ol.append(li);

      const leg = it.legs[i];
      if (leg) {
        const next = findSpot(region, it.stops[i + 1]);
        const legLi = el("li", "leg");
        const legBody = el("div", "leg-body");
        const top = el("p", "leg-top");
        top.append(modeTag(leg.mode), " " + formatMinutes(leg.minutes) + "・" + leg.cost);
        legBody.append(top, el("p", "leg-detail", leg.detail));
        legBody.append(mapLinks(region, spot, next));
        legLi.append(legBody);
        ol.append(legLi);
      }
    });
    card.append(ol);
    return card;
  }

  // ---- 熱門景點：依今天的月份顯示當季最紅的景點 ----
  const HOT = window.HOT_SPOTS || {};
  const THIS_MONTH = new Date().getMonth() + 1;
  // 可以自選出門的月份：pending 是點選但還沒按「確定」的月份
  const hotState = { month: THIS_MONTH, pending: THIS_MONTH };

  // 當季景點全部列出；全年熱門的補到每個城市至少 3 個（同一景點不重複）
  function hotFor(region) {
    const list = HOT[region.id] || [];
    const seasonal = list.filter((h) => h.months !== "all" && h.months.includes(hotState.month));
    const seen = new Set(seasonal.map((h) => h.spot));
    const allYear = list.filter((h) => h.months === "all" && !seen.has(h.spot)).slice(0, Math.max(0, 3 - seasonal.length));
    return [...seasonal.map((h) => ({ h, seasonal: true })), ...allYear.map((h) => ({ h, seasonal: false }))]
      .filter((x) => findSpot(region, x.h.spot));
  }

  // 從「我現在的位置」出發：不帶出發地，地圖 App 會用手機目前的位置
  function fromHereUrl(spot) {
    return "https://www.google.com/maps/dir/?api=1&destination=" + spot.lat + "," + spot.lng + "&travelmode=transit";
  }

  function renderHotCard(region, item) {
    const spot = findSpot(region, item.h.spot);
    const card = el("article", "card hot-spot");
    const head = el("div", "plan-head");
    head.append(el("h3", "hot-name", spot.name),
      el("span", "badge " + (item.seasonal ? "badge-hot" : "badge-allyear"), item.seasonal ? "🔥 當季" : "⭐ 全年熱門"));
    card.append(head, el("p", "hot-reason", item.h.reason));
    card.append(el("p", "stop-meta", "🚉 " + spot.station + "　⏱ 建議停留 " + spot.stay));

    const box = el("div", "map-links hot-actions");
    box.append(link("📍 從我現在的位置怎麼去", fromHereUrl(spot), "button button-small"));
    if (region.country === "kr") {
      box.append(link("KakaoMap 從目前位置導航", kakaoToUrl(spot), "button button-secondary button-small"));
    }
    // 從機場怎麼去：最多列兩個機場，點了跳到路線查詢並直接算好
    for (const ap of airportsOf(region).slice(0, 2)) {
      const b = el("button", "button button-secondary button-small hot-airport", "✈️ 從" + ap.name + "怎麼去");
      b.type = "button";
      b.addEventListener("click", () => runQuickRoute(region, { airport: ap.id, to: spot.id }));
      box.append(b);
    }
    card.append(box);
    return card;
  }

  // 熱門景點在上、推薦行程在下，都依城市分組（城市順序同 REGIONS：由北到南）
  function renderPlans() {
    const list = $("plan-list");
    const parts = [];
    let hotTotal = 0;

    const month = hotState.month;
    const intro = el("div", "card hot-intro");
    intro.append(el("h2", "plan-section-title", "🔥 " + month + " 月熱門景點" + (month === THIS_MONTH ? "（本月）" : "")));

    // 選擇出門的月份：點選後按「確定」才更新清單
    const monthBox = el("fieldset", "field hot-months");
    monthBox.append(el("legend", "", "出門月份"));
    const chips = el("div", "chips hot-month-chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", "選擇出門的月份");
    const pendingNote = el("p", "pending", "已選 " + hotState.pending + " 月，按「確定」更新熱門景點。");
    pendingNote.hidden = hotState.pending === month;
    const setPending = (m) => {
      hotState.pending = m;
      chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(Number(c.dataset.month) === m)));
      pendingNote.textContent = "已選 " + m + " 月，按「確定」更新熱門景點。";
      pendingNote.hidden = m === hotState.month;
    };
    for (let m = 1; m <= 12; m++) {
      const c = chip(m + " 月" + (m === THIS_MONTH ? "・本月" : ""), m === hotState.pending, () => setPending(m));
      c.dataset.month = String(m);
      chips.append(c);
    }
    const actions = el("div", "form-actions hot-month-actions");
    const ok = el("button", "button", "確定");
    ok.type = "button";
    ok.addEventListener("click", () => {
      hotState.month = hotState.pending;
      renderPlans();
      $("plan-count").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const back = el("button", "button button-secondary", "回到本月");
    back.type = "button";
    back.addEventListener("click", () => {
      hotState.month = hotState.pending = THIS_MONTH;
      renderPlans();
    });
    actions.append(ok, back);
    monthBox.append(chips);
    intro.append(monthBox, actions, pendingNote,
      el("p", "stop-meta", "預設顯示這個月，可以改選出門的月份。祭典、花季的日期每年不同，出發前請以官方公告為準。"),
      el("p", "stop-meta", "「📍 從我現在的位置怎麼去」會打開地圖 App，用你手機目前的位置規劃路線（第一次使用時請允許位置權限）。"));
    parts.push(intro);
    for (const region of REGIONS) {
      const items = hotFor(region);
      if (!items.length) continue;
      parts.push(el("h2", "plan-region", regionLabel(region)));
      for (const item of items) parts.push(renderHotCard(region, item));
      hotTotal += items.length;
    }

    let planTotal = 0;
    const planParts = [];
    for (const region of REGIONS) {
      if (!region.itineraries.length) continue;
      planParts.push(el("h2", "plan-region", regionLabel(region) + "（" + region.itineraries.length + "）"));
      for (const it of region.itineraries) planParts.push(renderItinerary(region, it));
      planTotal += region.itineraries.length;
    }
    if (planTotal) parts.push(el("h2", "plan-section-title plan-section-sep", "🗺️ 推薦行程（" + planTotal + "）"), ...planParts);

    list.replaceChildren(...parts);
    $("plan-count").textContent = month + " 月熱門景點 " + hotTotal + " 個・推薦行程 " + planTotal + " 個";
  }

  // ---------------------------------------------------------------
  // 路線查詢
  // ---------------------------------------------------------------
  const regionSelect = $("route-region");
  const fromSelect = $("route-from");
  const toSelect = $("route-to");

  for (const r of REGIONS) {
    const o = el("option", "", regionLabel(r));
    o.value = r.id;
    regionSelect.append(o);
  }

  const AIRPORTS = window.AIRPORTS || {};
  const AIRPORT_PREFIX = "airport:";

  function airportsOf(region) {
    return AIRPORTS[region.id] || [];
  }

  function fillSpotSelect(select, region, placeholder) {
    const first = el("option", "", placeholder);
    first.value = "";
    const airportGroup = document.createElement("optgroup");
    airportGroup.label = "✈️ 機場";
    for (const ap of airportsOf(region)) {
      const o = el("option", "", "✈️ " + ap.name);
      o.value = AIRPORT_PREFIX + ap.id;
      airportGroup.append(o);
    }
    const groups = region.hubs.map((hub) => {
      const g = document.createElement("optgroup");
      g.label = hub.name;
      for (const s of region.spots.filter((x) => x.hub === hub.id)) {
        const o = el("option", "", s.name);
        o.value = s.id;
        g.append(o);
      }
      return g;
    });
    select.replaceChildren(first, ...(airportGroup.children.length ? [airportGroup] : []), ...groups);
  }

  function onRegionChange() {
    const region = findRegion(regionSelect.value);
    fillSpotSelect(fromSelect, region, "請選擇出發地");
    fillSpotSelect(toSelect, region, "請選擇目的地");
    // 手動輸入目的地：提供本城市景點名稱當輸入建議
    $("route-to-text").value = "";
    $("route-to-suggest").replaceChildren(...region.spots.map((s) => {
      const o = document.createElement("option");
      o.value = s.name;
      return o;
    }));
    $("route-result").replaceChildren();
    $("route-error").hidden = true;
  }
  regionSelect.addEventListener("change", onRegionChange);

  $("route-swap").addEventListener("click", () => {
    const a = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = a;
  });

  // 推薦行程裡整理過的路段（同方向）
  function curatedLeg(region, fromId, toId) {
    for (const it of region.itineraries) {
      for (let i = 0; i < it.legs.length; i++) {
        if (it.stops[i] === fromId && it.stops[i + 1] === toId) return it.legs[i];
      }
    }
    return null;
  }

  // ---- 大型行李 ----
  // 勾選「我帶著大型行李」時，直達、免轉乘的方式排在前面，並加上提醒
  const luggageBox = $("route-luggage");
  function readLuggagePref() {
    try { return localStorage.getItem("travel-luggage") === "1"; } catch (e) { return false; }
  }
  luggageBox.checked = readLuggagePref();
  luggageBox.addEventListener("change", () => {
    document.querySelectorAll(".quick-luggage-box").forEach((x) => { x.checked = luggageBox.checked; });
    try { localStorage.setItem("travel-luggage", luggageBox.checked ? "1" : "0"); } catch (e) { /* 無法儲存時忽略 */ }
  });
  const withLuggage = () => luggageBox.checked;

  const LUGGAGE_LEVEL = {
    good: { score: 0, label: "🧳 大行李友善", cls: "luggage-good" },
    ok: { score: 1, label: "🧳 大行李可以", cls: "luggage-ok" },
    hard: { score: 2, label: "🧳 大行李較辛苦", cls: "luggage-hard" },
  };
  const COMFY_TRAINS = ["Skyliner", "N'EX", "HARUKA", "Rapi:t", "μSKY", "直達列車", "特急"];

  // 判斷機場交通方案帶大型行李好不好走；資料裡有 luggage 欄位時以資料為準
  function luggageInfo(o) {
    if (o.luggage && LUGGAGE_LEVEL[o.luggage]) return { level: o.luggage, note: o.luggageNote || "" };
    const text = (o.title || "") + " " + (o.detail || "");
    if (o.mode === "計程車" || o.direct) return { level: "good", note: "門口到門口，最省力；可在機場排班處搭車，多人同行時分攤也划算。" };
    if (o.mode === "公車") return { level: "good", note: "行李放在車底行李艙，免轉乘；到站後通常離飯店還有一段路。" };
    if (/轉|＋/.test(text)) return { level: "hard", note: "需要轉乘，拖著行李上下樓梯、出站再進站比較辛苦；請找電梯，並避開上下班尖峰。" };
    if (COMFY_TRAINS.some((k) => text.includes(k))) return { level: "good", note: "直達、對號座，車廂有放大型行李的位置。" };
    return { level: "ok", note: "直達但車廂可能擁擠；尖峰時段行李不好放。" };
  }

  function luggageBadge(o) {
    const info = luggageInfo(o);
    const lv = LUGGAGE_LEVEL[info.level];
    const box = el("p", "luggage-note " + lv.cls);
    box.append(el("strong", "", lv.label), "　" + info.note);
    return box;
  }

  // ---- 等車時間、票價、轉乘（結果卡的總計用） ----
  // 每段的「等車」時間為估算：班次間隔一半左右
  const WAIT = { airport: 10, intercity: 5, transit: 5 };
  // 市區大眾運輸與計程車的票價估算（依國家）
  const LOCAL_FARE = {
    jp: { transit: [190, 300], taxiBase: 600, taxiPerKm: 400 },
    kr: { transit: [1500, 1800], taxiBase: 4800, taxiPerKm: 760 },
    // 印尼：以 Grab／Gojek 汽車與機車叫車的約略價格估算
    id: { transit: [3500, 15000], taxiBase: 10000, taxiPerKm: 6000, bikeBase: 5000, bikePerKm: 2500 },
  };

  // 從「約 1,450–1,670 日圓」之類的文字取出金額範圍；取不到就回傳 null
  function parseCost(text) {
    if (!text) return null;
    const nums = [];
    String(text).replace(/(\d[\d,]*(?:\.\d+)?)\s*(萬)?/g, (m, n, wan) => {
      nums.push(parseFloat(n.replace(/,/g, "")) * (wan ? 10000 : 1));
      return m;
    });
    if (!nums.length) return null;
    const ranged = nums.length >= 2 && /[–~〜-]/.test(text);
    const min = nums[0];
    const max = ranged ? nums[1] : nums[0];
    const open = /起|另加|請以|以上/.test(text);
    return { min, max, open };
  }

  function formatMoney(n) {
    const step = n >= 10000 ? 100 : 10;
    return (Math.round(n / step) * step).toLocaleString("en-US");
  }

  function costEstimate(region, mode, km) {
    const f = LOCAL_FARE[region.country] || LOCAL_FARE.jp;
    if (mode === "步行") return { min: 0, max: 0 };
    if (mode === "大眾運輸") return { min: f.transit[0], max: f.transit[1], estimated: true };
    if (mode === "計程車" || mode === "叫車") {
      const base = f.taxiBase + Math.max(km - 1.5, 0) * f.taxiPerKm;
      return { min: base * 0.9, max: base * 1.2, estimated: true };
    }
    if (mode === "機車" && f.bikeBase) {
      const base = f.bikeBase + Math.max(km - 1.5, 0) * f.bikePerKm;
      return { min: base * 0.9, max: base * 1.3, estimated: true };
    }
    return null;
  }

  // 機場交通方案本身要轉幾次車：資料有寫 transfers 就照資料，否則依「＋」「轉」推估
  function optionTransfers(o) {
    if (typeof o.transfers === "number") return { n: o.transfers, sure: true };
    const plus = ((o.title || "").match(/＋/g) || []).length;
    const turns = ((o.detail || "").match(/再?轉(?!乘優惠)(?:地鐵|搭|KTX|JR|西鐵|\s*\d)/g) || []).length;
    return { n: Math.max(plus, turns), sure: false };
  }

  // ---- 方向一致：回程時把說明文字的起訖站對調 ----
  function reverseText(text) {
    let t = String(text || "");
    let changed = false;
    const swap = (re, fn) => { const n = t.replace(re, fn); if (n !== t) { changed = true; t = n; } };
    swap(/([^\s，、；：。（）()]+?)\s*→\s*([^\s，、；：。（）()]+)/g, (m, a, b) => b + " → " + a);
    swap(/([^\s，、；：。（）()]+?站)直達([^\s，、；：。（）()]+?站)/g, (m, a, b) => b + "直達" + a);
    return { text: t, changed };
  }

  // 回程的說明：資料有 detailBack 就用；否則自動對調箭頭；
  // 還是看不出方向時，明確寫出回程要從哪裡搭到哪裡，原說明標成「去程說明」
  function backNote(seg) {
    if (seg.noteBack) return seg.noteBack;
    if (seg.estimated && !seg.kind) return seg.note;
    if (seg.kind === "transit" || seg.kind === "walk" || seg.kind === "taxi") return seg.note;
    const r = reverseText(seg.note);
    const directional = /到|往|直達|出發|→/.test(seg.note);
    if (r.changed && !/(^|[^→])到[^達]/.test(r.text)) return r.text;
    if (!directional) return seg.note;
    return "回程：在 " + seg.to + " 搭同一條路線往 " + seg.from + " 方向。（去程說明：" + seg.note + "）";
  }

  // 同城市內：依距離估算交通方式
  // minutes 為乘車＋步行時間，不含等車；wait 為估算的等車時間
  function localOptions(a, b, region) {
    const km = distanceKm(a, b) * 1.3; // 直線距離乘上繞路係數
    const opts = [];
    const luggage = withLuggage();
    if (km <= (luggage ? 1.0 : 1.5)) {
      opts.push({ mode: "步行", kind: "walk", minutes: km / 4.5 * 60, wait: 0, note: luggage ? "距離很近，拖著行李走過去即可。" : "距離很近，建議步行。" });
      return { km, opts };
    }
    // 島與島之間只能搭船（吉利群島、科莫多國家公園）
    const boatHub = (p) => region && p.hub && (findHub(region, p.hub) || {}).boatOnly;
    if (boatHub(a) || boatHub(b)) {
      opts.push({ mode: "船", kind: "boat", minutes: 10 + km / 25 * 60, wait: 0,
        note: "島與島之間只能搭船：吉利群島搭島間接駁船，科莫多國家公園通常跟著跳島行程移動。島上沒有汽機車，靠步行、腳踏車或馬車。" });
      return { km, opts };
    }
    // 沒有像樣大眾運輸的地方（例如峇里島）：用 Grab／Gojek 叫車；路上常塞車，依地區的平均時速估算
    if (region && region.localTransit === false) {
      const kmh = region.rideKmh || 18;
      opts.push({ mode: "叫車", kind: "taxi", minutes: 5 + km / kmh * 60, wait: 5, note: luggage
        ? "用 Grab 或 Gojek 叫汽車（GrabCar／GoCar），行李放後車廂；App 會先顯示價格，等車時間約 5 分鐘（估算）。"
        : "用 Grab 或 Gojek 叫汽車（GrabCar／GoCar），App 會先顯示價格；尖峰與雨天常塞車，時間為估算。" });
      if (!luggage && km <= 15) {
        opts.push({ mode: "機車", kind: "taxi", minutes: 3 + km / 25 * 60, wait: 5, note: "GrabBike／GoRide 機車叫車，一個人、沒有大行李時最快也最便宜；司機會提供安全帽。" });
      }
      if (!luggage && km <= 3) {
        opts.push({ mode: "步行", kind: "walk", minutes: km / 4.5 * 60, wait: 0, note: "很多路段沒有人行道，天熱時不建議走太遠。" });
      }
      return { km, opts };
    }
    const transit = { mode: "大眾運輸", kind: "transit", minutes: 3 + km / 22 * 60, wait: WAIT.transit,
      note: "搭地鐵、電車或公車，時間含步行到車站，另估等車約 " + WAIT.transit + " 分鐘；實際路線請用下方地圖連結查詢。" +
      (luggage ? "帶大型行李請找電梯、避開上下班尖峰（約 7:30–9:30、17:30–19:30）。" : "") };
    const taxi = { mode: "計程車", kind: "taxi", minutes: 5 + km / 20 * 60, wait: 0, note: luggage
      ? "帶大型行李建議搭計程車，省去轉乘和樓梯；多人同行時分攤也划算。"
      : "三到四人同行、行李多或趕時間時適合。" };
    if (luggage && km <= 20) {
      opts.push(taxi, transit);
    } else {
      opts.push(transit);
      if (km <= 12) opts.push(taxi);
    }
    if (!luggage && km <= 3) {
      opts.push({ mode: "步行", kind: "walk", minutes: km / 4.5 * 60, wait: 0, note: "天氣好也可以散步過去。" });
    }
    return { km, opts };
  }

  // 城際路段：同方向的資料直接用；只有反方向的資料時，說明與起訖站都要對調
  function intercityLeg(region, fromHub, toHub) {
    const hubA = findHub(region, fromHub);
    const hubB = findHub(region, toHub);
    const stopOf = (hub, stop) => stop ? Object.assign({ station: stop.name }, stop) : { name: hub.station, station: hub.station, lat: hub.lat, lng: hub.lng };
    const direct = region.intercity.find((x) => x.from === fromHub && x.to === toHub);
    if (direct) {
      return { leg: direct, reversed: false, note: direct.detail, noteBack: direct.detailBack,
        fromStop: stopOf(hubA, direct.fromStop), toStop: stopOf(hubB, direct.toStop) };
    }
    const back = region.intercity.find((x) => x.from === toHub && x.to === fromHub);
    if (back) {
      const fromStop = stopOf(hubA, back.toStop);
      const toStop = stopOf(hubB, back.fromStop);
      const note = back.detailBack || backNote({ note: back.detail, from: toStop.name, to: fromStop.name, kind: "intercity" });
      return { leg: back, reversed: true, note, noteBack: back.detail, fromStop, toStop };
    }
    return null;
  }

  function renderOption(opt, primary) {
    const box = el("div", "option" + (primary ? " option-primary" : ""));
    const top = el("p", "leg-top");
    top.append(modeTag(opt.mode), " " + formatMinutes(opt.minutes) + (opt.wait ? "＋等車約 " + opt.wait + " 分" : "") + (opt.cost ? "・" + opt.cost : ""));
    if (primary) top.append(" ", el("span", "badge badge-accent", "推薦"));
    box.append(top, el("p", "leg-detail", opt.note));
    return box;
  }

  // ---- 電車路線導引：搭哪條線、往哪個方向、在哪站轉乘、走幾號出口（資料在 rail.js）----
  function lineBadge(line) {
    const b = el("span", "line-badge", line.name);
    const hex = line.color.replace("#", "");
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const light = (r * 299 + g * 587 + bl * 114) / 1000 > 160;
    b.style.background = line.color;
    b.style.color = light ? "#111827" : "#ffffff";
    return b;
  }

  function strong(text) {
    return el("strong", "", text);
  }

  // 出口說明：有出口號碼就寫號碼，沒有就照站內指標
  function exitParts(acc, entering) {
    if (acc.exit) return ["從 ", strong(acc.exit), entering ? " 進站" : " 出站"];
    if (acc.sign && !entering) return ["照站內「", strong(acc.sign), "」指標出站"];
    return [entering ? "進站" : "出站"];
  }

  function renderRailGuide(region, a, b) {
    const RG = window.RailGuide;
    if (!RG || !a.id || !b.id || !RG.has(region.id, a.id) || !RG.has(region.id, b.id)) return null;
    const p = RG.plan(region.id, a.id, b.id);
    if (!p) return null;
    const box = el("div", "rail-guide");
    if (p.sameStation) {
      box.append(el("p", "rail-title", "🚇 兩個地方都在 " + p.sameStation + " 附近，步行過去即可。"));
      return box;
    }
    const st = RG.stationName;
    box.append(el("p", "rail-title", "🚇 電車怎麼搭" + (p.transfers ? "（轉乘 " + p.transfers + " 次）" : "（直達，免轉乘）")));
    const ol = el("ol", "rail-steps");
    const li = (cls, ...parts) => {
      const x = el("li", cls);
      x.append(...parts);
      ol.append(x);
      return x;
    };
    li("rail-walk", "🚶 從「" + a.name + "」" + (p.from.note ? "前往 " : "步行約 " + p.from.walk + " 分鐘到 "), strong(st(p.from.st)), "，", ...exitParts(p.from, true));
    const rides = p.segments.filter((s) => s.kind === "ride");
    for (const s of p.segments) {
      if (s.kind === "walk") {
        li("rail-walk", "🚶 出站步行約 " + s.minutes + " 分鐘到 ", strong(st(s.to)), " 轉乘");
        continue;
      }
      const last = s === rides[rides.length - 1];
      const ride = li("rail-ride", "搭 ", lineBadge(s.line), " 往 ", strong(s.towards), " 方向");
      ride.style.setProperty("--rail", s.line.color);
      ride.append(el("span", "rail-stations", st(s.from) + " 上車 → " + st(s.to) + (last ? " 下車" : " 下車轉乘")));
    }
    // 有備註（例如還要轉公車、搭纜車）時，照備註前往，不寫步行時間
    const end = li("rail-walk", "🚪 ", ...exitParts(p.to, false), p.to.note ? "，前往「" + b.name + "」" : "，步行約 " + p.to.walk + " 分鐘到「" + b.name + "」");
    if (p.to.note) end.append(el("span", "rail-stations", "💡 " + p.to.note));
    if (p.from.note) ol.firstChild.append(el("span", "rail-stations", "💡 這裡離車站較遠，請先搭接駁公車或計程車到車站。"));
    box.append(ol);
    box.append(el("p", "rail-note", "路線與出口是整理的參考資料（只列主要車站），現場請以站內指標為準；即時班次請用地圖 App。"));
    return box;
  }

  function renderLocalStep(region, title, a, b, aStation, bStation) {
    const step = el("div", "card route-step");
    step.append(el("h3", "step-title", title));
    step.append(el("p", "stop-meta", "🚉 " + aStation + " → " + bStation));
    const { km, opts } = localOptions(a, b, region);
    step.append(el("p", "stop-meta", "距離約 " + km.toFixed(1) + " 公里（估算）"));
    opts.forEach((o, i) => step.append(renderOption(o, i === 0)));
    if (opts.some((o) => o.kind === "transit")) {
      const guide = renderRailGuide(region, a, b);
      if (guide) step.append(guide);
    }
    step.append(mapLinks(region, a, b));
    return { step, minutes: opts[0].minutes, wait: opts[0].wait || 0 };
  }

  // ---- 機場路線 ----
  // 一個方案 = 機場交通（抵達某車站）＋（必要時）跨城市＋到景點的最後一段
  function airportPlan(region, airport, option, spot) {
    // 巴士等沿途有多個停靠站時，選離目的地最近的一站下車
    if (option.stops && option.stops.length) {
      // 目的地在別的城市時，改選離轉乘城際交通的城市中心最近的一站
      const target = option.to.hub === spot.hub ? spot : (findHub(region, option.to.hub) || spot);
      const stop = option.stops.reduce((best, x) => (distanceKm(x, target) < distanceKm(best, target) ? x : best));
      option = Object.assign({}, option, {
        minutes: stop.minutes || option.minutes,
        cost: stop.cost || option.cost,
        to: Object.assign({}, option.to, { name: stop.name, lat: stop.lat, lng: stop.lng }),
      });
    }
    const tr = optionTransfers(option);
    if (option.direct) {
      // 直達目的地（計程車）：依距離估算時間。前 20 公里以市區時速約 30 公里計，
      // 之後以高速公路時速約 65 公里計（避免長距離時高估）
      const taxiSeg = (dest, destName, extraNote) => {
        const km = distanceKm(airport, dest) * 1.3;
        const minutes = 10 + Math.min(km, 20) / 30 * 60 + Math.max(km - 20, 0) / 65 * 60;
        // 車資依實際距離估算（資料裡的金額只對應某一個目的地）；
        // 機場計程車有起跳價較高的固定價（fare: { base, perKm }）時照資料算
        const costRange = option.fare
          ? { min: (option.fare.base + option.fare.perKm * km) * 0.9, max: (option.fare.base + option.fare.perKm * km) * 1.2, estimated: true }
          : costEstimate(region, "計程車", km);
        return {
          mode: option.mode, kind: "taxi", from: airport.name, to: destName, minutes, wait: 0, cost: null, costRange,
          note: option.detail + (extraNote || ""), noteBack: option.detailBack, estimated: true, official: option.official, transfers: 0,
        };
      };
      const spotHub = findHub(region, spot.hub);
      if (spotHub && spotHub.boatOnly) {
        // 目的地在島上：車子開不上島，先坐到搭船的地方，再搭船
        const link = region.intercity.find((x) => x.to === spot.hub || x.from === spot.hub);
        if (!link) return null;
        const inter = intercityLeg(region, link.from === spot.hub ? link.to : link.from, spot.hub);
        const segs = [taxiSeg(inter.fromStop, inter.fromStop.name, "（島上不能開車，先坐到搭船的地方）")];
        segs.push({ mode: inter.leg.mode, kind: "intercity", from: inter.fromStop.name, to: inter.toStop.name,
          minutes: inter.leg.minutes, wait: WAIT.intercity, cost: inter.leg.cost, costRange: parseCost(inter.leg.cost),
          note: inter.note, noteBack: inter.noteBack, official: inter.leg.official });
        if (distanceKm(inter.toStop, spot) > 0.3) {
          const { km, opts } = localOptions(inter.toStop, spot, region);
          const best = opts[0];
          segs.push({ mode: best.mode, kind: best.kind, from: inter.toStop.name, to: spot.name, minutes: best.minutes, wait: best.wait,
            costRange: costEstimate(region, best.mode, km), note: best.note, estimated: true });
        }
        return finishPlan(region, option, segs);
      }
      return finishPlan(region, option, [taxiSeg(spot, spot.name)]);
    }
    const segs = [{
      mode: option.mode, kind: "airport", from: airport.name, to: option.to.name, title: option.title,
      minutes: option.minutes, wait: WAIT.airport, cost: option.cost, costRange: parseCost(option.cost),
      note: option.detail, noteBack: option.detailBack, verified: option.verified, official: option.official,
      transfers: tr.n, transfersSure: tr.sure,
    }];

    function addLocal(a, aName, b, bName) {
      if (distanceKm(a, b) <= 0.3) return;
      const { km, opts } = localOptions(a, b, region);
      const best = opts[0];
      segs.push({ mode: best.mode, kind: best.kind, from: aName, to: bName, minutes: best.minutes, wait: best.wait,
        costRange: costEstimate(region, best.mode, km), note: best.note, estimated: true,
        official: best.kind === "transit" || best.mode === "叫車" ? region.localLink : null });
    }

    if (option.to.hub === spot.hub) {
      addLocal(option.to, option.to.name, spot, spot.name);
    } else {
      const hubFrom = findHub(region, option.to.hub);
      const hubTo = findHub(region, spot.hub);
      const inter = intercityLeg(region, hubFrom.id, hubTo.id);
      if (inter) {
        addLocal(option.to, option.to.name, inter.fromStop, inter.fromStop.name);
        segs.push({ mode: inter.leg.mode, kind: "intercity", from: inter.fromStop.name, to: inter.toStop.name,
          minutes: inter.leg.minutes, wait: WAIT.intercity, cost: inter.leg.cost, costRange: parseCost(inter.leg.cost),
          note: inter.note, noteBack: inter.noteBack, official: inter.leg.official });
        addLocal(inter.toStop, inter.toStop.name, spot, spot.name);
      } else {
        addLocal(option.to, option.to.name, hubFrom, hubFrom.station);
        segs.push({ mode: "大眾運輸", kind: "intercity", from: hubFrom.station, to: hubTo.station, minutes: 0, wait: 0, note: "這兩個城市之間沒有整理資料，請用地圖 App 查詢。", estimated: true, unknown: true });
        addLocal(hubTo, hubTo.station, spot, spot.name);
      }
    }
    return finishPlan(region, option, segs);
  }

  // 計算方案的總時間（含／不含等車）、總票價、轉乘次數
  function finishPlan(region, option, segs) {
    const ride = segs.reduce((s, x) => s + x.minutes, 0);
    const wait = segs.reduce((s, x) => s + (x.wait || 0), 0);
    const vehicles = segs.filter((x) => x.kind !== "walk");
    let transfers = Math.max(vehicles.length - 1, 0);
    let transfersSure = true;
    for (const x of segs) {
      if (x.transfers) transfers += x.transfers;
      if (x.transfersSure === false && x.transfers) transfersSure = false;
      if (x.kind === "transit" || x.unknown) transfersSure = false; // 市區段可能還要轉車
    }
    let min = 0, max = 0, open = false, estimated = false, unknown = false;
    for (const x of segs) {
      if (!x.costRange) { if (x.kind !== "walk") unknown = true; continue; }
      min += x.costRange.min;
      max += x.costRange.max;
      if (x.costRange.open) open = true;
      if (x.costRange.estimated) estimated = true;
    }
    const fare = { min, max, open, estimated, unknown, currency: region.currency };
    return { option, segs, total: ride, ride, wait, transfers, transfersSure, fare };
  }

  // 景點 → 機場：把機場 → 景點的方案整個反過來，每段說明也換成回程方向
  function reversePlan(plan) {
    const segs = plan.segs.slice().reverse().map((s) => Object.assign({}, s, {
      from: s.to, to: s.from, note: backNote(s), noteBack: s.note,
    }));
    return Object.assign({}, plan, { segs });
  }

  // 會「先去別的城市再折返」的方案：機場交通的終點不在目的地所在的城市，而且
  // ① 下車的地方離目的地比機場還遠，或 ② 從機場坐到下車處比到目的地還遠（坐過頭再回來）。
  // 例：去大阪卻先搭 HARUKA 到京都、去札幌卻坐到小樽；但去京都時先到大阪再轉車是順路，不算折返
  function isDetour(airport, plan, spot) {
    const o = plan.option;
    if (o.direct || !o.to || o.to.hub === spot.hub) return false;
    return distanceKm(o.to, spot) > distanceKm(airport, spot) ||
      distanceKm(airport, o.to) > distanceKm(airport, spot);
  }

  function fareText(fare) {
    if (fare.unknown && !fare.max) return "票價未知，請以官網為準";
    const range = fare.min === fare.max || Math.round(fare.min) === Math.round(fare.max)
      ? formatMoney(fare.min)
      : formatMoney(fare.min) + "–" + formatMoney(fare.max);
    if (fare.unknown) return "部分票價未知：已知部分約 " + range + " " + fare.currency + twdText(fare) + "，其餘請以官網為準";
    return "約 " + range + " " + fare.currency + (fare.open ? " 起" : "") + twdText(fare) +
      (fare.estimated ? "（含估算）" : "") + (fare.open ? "，部分票價請以官網為準" : "");
  }

  // 結果卡上方的總計
  function planSummary(region, plan, start, end) {
    const box = el("div", "plan-summary");
    const dl = el("dl", "summary-grid");
    function row(label, value, sub) {
      const d = el("div", "summary-item");
      d.append(el("dt", "", label));
      const dd = el("dd", "", value);
      if (sub) dd.append(el("span", "summary-sub", sub));
      d.append(dd);
      dl.append(d);
    }
    if (plan.wait) {
      row("⏱️ 預估總時間", "含等車 " + formatMinutes(plan.ride + plan.wait),
        "乘車＋步行 " + formatMinutes(plan.ride) + "（不含等車）＋等車約 " + Math.round(plan.wait) + " 分鐘（估算）");
    } else {
      row("⏱️ 預估總時間", formatMinutes(plan.ride), "不含等車：計程車直接搭，排班等候時間另計");
    }
    const hasTaxi = plan.segs.some((x) => x.kind === "taxi");
    row("💴 總票價", fareText(plan.fare), hasTaxi ? "電車為每人單程；計程車為一車的費用，多人同行可分攤" : "每人單程");
    row("🔁 轉乘次數", (plan.transfersSure ? "" : "約 ") + plan.transfers + " 次",
      plan.transfers === 0 ? "一車到底" : (plan.transfersSure ? "" : "市區段依實際路線可能再多轉一次"));
    box.append(dl);

    // 官方票價／班次連結（重複的只列一次），沒有官方資料的段落用 Google 地圖
    const links = el("div", "map-links official-links");
    const seen = new Set();
    for (const s of plan.segs) {
      if (s.official && !seen.has(s.official.url)) {
        seen.add(s.official.url);
        links.append(link("🔗 " + s.official.name, s.official.url, "button button-small"));
      }
    }
    if (!seen.size) links.append(el("p", "stop-meta", "這條路線沒有整理官方連結，請用下方地圖查即時班次與票價。"));
    box.append(links);
    return box;
  }

  function renderPlan(region, plan, index, start, end) {
    const card = el("div", "card route-step");
    const title = el("h3", "step-title", "方案 " + (index + 1) + "：" + plan.option.title);
    if (index === 0) title.append(" ", el("span", "badge badge-accent", withLuggage() ? "推薦" : "最快"));
    card.append(title, planSummary(region, plan, start, end));
    if (withLuggage()) card.append(luggageBadge(plan.option));

    const ol = el("ol", "segments");
    for (const s of plan.segs) {
      const li = el("li", "segment");
      const top = el("p", "leg-top");
      top.append(modeTag(s.mode), " " + s.from + " → " + s.to);
      const time = s.minutes ? formatMinutes(s.minutes) + (s.wait ? "＋等車約 " + s.wait + " 分" : "（不用等車）") : "時間未知";
      const cost = s.cost || (s.costRange && s.costRange.max ? "約 " + formatMoney(s.costRange.min) + (s.costRange.max !== s.costRange.min ? "–" + formatMoney(s.costRange.max) : "") + " " + region.currency : "");
      const meta = el("p", "stop-meta", time + (cost ? "・" + cost : "") + (s.estimated ? "（估算）" : ""));
      li.append(top, meta, el("p", "leg-detail", s.note));
      if (s.verified === false) li.append(el("p", "unverified", "⚠️ 票價或時間未查證，請以交通公司官網為準"));
      ol.append(li);
    }
    card.append(ol, mapLinks(region, start, end));
    return card;
  }

  function updateAirportRoute(region, fromVal, toVal) {
    const err = $("route-error");
    const out = $("route-result");
    const fromAirport = fromVal.startsWith(AIRPORT_PREFIX);
    const airportId = (fromAirport ? fromVal : toVal).slice(AIRPORT_PREFIX.length);
    const otherVal = fromAirport ? toVal : fromVal;

    if (otherVal.startsWith(AIRPORT_PREFIX)) {
      err.textContent = "出發地和目的地不能都是機場，請選一個景點。";
      err.hidden = false;
      return;
    }
    const airport = airportsOf(region).find((a) => a.id === airportId);
    const spot = findSpot(region, otherVal);

    let plans = airport.options.map((o) => airportPlan(region, airport, o, spot)).filter(Boolean);
    // 拿掉「先到別的城市再折返」的方案（例如去大阪卻先搭到京都）
    const detours = plans.filter((p) => isDetour(airport, p, spot));
    plans = plans.filter((p) => !detours.includes(p));
    if (!fromAirport) plans = plans.map(reversePlan);
    const fullTime = (p) => p.ride + p.wait;
    if (withLuggage()) {
      // 大型行李：好走的排前面，同等級再比轉乘次數、時間
      const score = (p) => LUGGAGE_LEVEL[luggageInfo(p.option).level].score;
      // 大型行李：好走的等級＋轉乘次數越少越前面；比最快的方案慢 30 分鐘以上再降一級
      const fastest = Math.min(...plans.map(fullTime));
      const rank = (p) => score(p) + p.transfers + (fullTime(p) - fastest >= 30 ? 1 : 0);
      plans.sort((x, y) => rank(x) - rank(y) || fullTime(x) - fullTime(y));
    } else {
      plans.sort((x, y) => fullTime(x) - fullTime(y));
    }

    const start = fromAirport ? airport : spot;
    const end = fromAirport ? spot : airport;
    const header = el("div", "card route-summary");
    header.append(el("h2", "plan-title", "✈️ " + start.name + " → " + end.name));
    header.append(el("p", "stop-meta", withLuggage()
      ? "共 " + plans.length + " 個方案。已依「大型行李」排序：直達、免轉乘、有行李空間的方式排在前面。"
      : "共 " + plans.length + " 個方案，依含等車的總時間由快到慢排列。帶大型行李時，可勾選上方「我帶著大型行李」重新查詢。"));
    if (detours.length) {
      header.append(el("p", "stop-meta detour-note", "已略過要先到其他城市再折返的方案：" +
        detours.map((p) => p.option.title).join("、") + "。"));
    }
    header.append(el("p", "stop-meta", "⏱️ 時間說明：「含等車」是加上每段估算的等車時間（機場線約 " + WAIT.airport + " 分、城際約 " +
      WAIT.intercity + " 分、市區約 " + WAIT.transit + " 分）；「不含等車」只算乘車和步行。"));
    header.append(mapLinks(region, start, end));

    const parts = [header, ...plans.map((p, i) => renderPlan(region, p, i, start, end))];
    parts.push(el("p", "card hint", "機場交通的時間、票價為約略值；到景點的最後一段依距離估算。出發前請用官方連結或地圖連結查即時班次。" +
      mapAppNote(region)));
    parts.push(el("p", "card tip", "💡 " + region.transportTip));
    out.replaceChildren(...parts);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- 手動輸入的目的地 ----
  function normalizeName(s) {
    return String(s || "").toLowerCase().replace(/[\s・·（）()「」]/g, "");
  }

  // 輸入的文字若對應到清單裡的景點，就回傳該景點
  function matchSpot(region, text) {
    const t = normalizeName(text);
    if (!t) return null;
    return region.spots.find((s) => normalizeName(s.name) === t) ||
      region.spots.find((s) => normalizeName(s.name).includes(t) || t.includes(normalizeName(s.name))) ||
      null;
  }

  function googleTransitToText(a, text) {
    return "https://www.google.com/maps/dir/?api=1&origin=" + a.lat + "," + a.lng +
      "&destination=" + encodeURIComponent(text) + "&travelmode=transit";
  }

  function freeMapLinks(region, from, text) {
    const box = el("div", "map-links");
    box.append(link("Google 地圖查即時路線", googleTransitToText(from, text), "button button-small"));
    if (region.country === "kr") {
      box.append(link("KakaoMap 搜尋目的地", "https://map.kakao.com/link/search/" + encodeURIComponent(text), "button button-secondary button-small"));
    }
    return box;
  }

  // 目的地不在清單裡：沒辦法估算，改列出可用的資訊與地圖連結
  function updateFreeRoute(region, fromVal, text) {
    const out = $("route-result");
    const fromAirport = fromVal.startsWith(AIRPORT_PREFIX);
    const from = fromAirport
      ? airportsOf(region).find((a) => a.id === fromVal.slice(AIRPORT_PREFIX.length))
      : findSpot(region, fromVal);

    const header = el("div", "card route-summary");
    header.append(el("h2", "plan-title", (fromAirport ? "✈️ " : "") + from.name + " → " + text));
    header.append(el("p", "stop-meta", "「" + text + "」不在景點清單裡，沒辦法估算時間和票價。請用下面的地圖連結查即時路線；輸入完整的名稱或地址會比較準。"));
    header.append(freeMapLinks(region, from, text));
    const parts = [header];

    if (fromAirport) {
      // 從機場出發：列出各機場交通方案，最後一段再用地圖查
      const lscore = (o) => LUGGAGE_LEVEL[luggageInfo(o).level].score;
      const options = from.options.slice().sort((x, y) => (withLuggage() ? lscore(x) - lscore(y) : 0) || x.minutes - y.minutes);
      parts.push(el("p", "result-count", "先選機場交通方式，再從下車的車站查到目的地："));
      options.forEach((o, i) => {
        const card = el("div", "card route-step");
        const title = el("h3", "step-title", "方案 " + (i + 1) + "：" + o.title);
        card.append(title);
        if (withLuggage()) card.append(luggageBadge(o));
        const ol = el("ol", "segments");
        const li1 = el("li", "segment");
        const top = el("p", "leg-top");
        top.append(modeTag(o.mode), " " + from.name + " → " + (o.direct ? text : o.to.name));
        li1.append(top, el("p", "stop-meta", formatMinutes(o.minutes) + (o.cost ? "・" + o.cost : "") + (o.direct ? "（估算）" : "")), el("p", "leg-detail", o.detail));
        if (o.verified === false) li1.append(el("p", "unverified", "⚠️ 票價或時間未查證，請以交通公司官網為準"));
        ol.append(li1);
        if (!o.direct) {
          const li2 = el("li", "segment");
          const top2 = el("p", "leg-top");
          top2.append(modeTag("大眾運輸"), " " + o.to.name + " → " + text);
          li2.append(top2, el("p", "leg-detail", "這一段請用地圖查詢。"), freeMapLinks(region, o.to, text));
          ol.append(li2);
        }
        card.append(ol);
        parts.push(card);
      });
    }

    parts.push(el("p", "card tip", "💡 " + region.transportTip));
    out.replaceChildren(...parts);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateRoute() {
    const region = findRegion(regionSelect.value);
    const err = $("route-error");
    const out = $("route-result");
    err.hidden = true;

    // 有手動輸入目的地時，以輸入為準
    const typed = $("route-to-text").value.trim();
    if (typed) {
      if (!fromSelect.value) {
        err.textContent = "請選擇出發地。";
        err.hidden = false;
        return;
      }
      const matched = matchSpot(region, typed);
      if (!matched) {
        updateFreeRoute(region, fromSelect.value, typed);
        return;
      }
      // 對應到清單裡的景點：照一般方式計算
      toSelect.value = matched.id;
    }

    if (fromSelect.value === toSelect.value && fromSelect.value) {
      err.textContent = "出發地和目的地是同一個地方。";
      err.hidden = false;
      return;
    }
    if (fromSelect.value.startsWith(AIRPORT_PREFIX) || toSelect.value.startsWith(AIRPORT_PREFIX)) {
      if (!fromSelect.value || !toSelect.value) {
        err.textContent = "請選擇出發地和目的地。";
        err.hidden = false;
        return;
      }
      updateAirportRoute(region, fromSelect.value, toSelect.value);
      return;
    }

    const a = findSpot(region, fromSelect.value);
    const b = findSpot(region, toSelect.value);
    if (!a || !b) {
      err.textContent = "請選擇出發景點和目的地。";
      err.hidden = false;
      return;
    }
    if (a.id === b.id) {
      err.textContent = "出發景點和目的地是同一個地方。";
      err.hidden = false;
      return;
    }

    const parts = [];
    const header = el("div", "card route-summary");
    header.append(el("h2", "plan-title", a.name + " → " + b.name));
    parts.push(header);

    const curated = curatedLeg(region, a.id, b.id);
    if (curated) {
      header.append(el("p", "stop-meta", "這段在推薦行程中有整理過的走法："));
      header.append(renderOption({ mode: curated.mode, minutes: curated.minutes, cost: curated.cost, note: curated.detail }, true));
      if (/電車|地鐵|大眾運輸/.test(curated.mode) || /線/.test(curated.detail)) {
        const guide = renderRailGuide(region, a, b);
        if (guide) header.append(guide);
      }
      header.append(mapLinks(region, a, b));
    } else if (a.hub === b.hub) {
      const r = renderLocalStep(region, "建議交通方式", a, b, a.station, b.station);
      parts.push(r.step);
    } else {
      const hubA = findHub(region, a.hub);
      const hubB = findHub(region, b.hub);
      const inter = intercityLeg(region, hubA.id, hubB.id);
      // 城際路段的上下車站（例如近鐵是大阪難波站，不是大阪站）
      const stopA = inter ? inter.fromStop : { name: hubA.station, lat: hubA.lat, lng: hubA.lng };
      const stopB = inter ? inter.toStop : { name: hubB.station, lat: hubB.lat, lng: hubB.lng };
      let total = 0;
      let wait = 0;
      const steps = [];
      const num = ["① ", "② ", "③ "];

      if (distanceKm(a, stopA) > 0.3) {
        const s1 = renderLocalStep(region, num[steps.length] + a.name + " → " + stopA.name, a, stopA, a.station, stopA.name);
        steps.push(s1.step); total += s1.minutes; wait += s1.wait;
      }

      const mid = el("div", "card route-step");
      mid.append(el("h3", "step-title", num[steps.length] + stopA.name + " → " + stopB.name));
      if (inter) {
        mid.append(renderOption({ mode: inter.leg.mode, minutes: inter.leg.minutes, wait: WAIT.intercity, cost: inter.leg.cost, note: inter.note }, true));
        total += inter.leg.minutes; wait += WAIT.intercity;
      } else {
        mid.append(el("p", "leg-detail", "這兩個城市之間沒有整理資料，請用地圖 App 查詢。"));
      }
      mid.append(mapLinks(region, stopA, stopB));
      steps.push(mid);

      if (distanceKm(stopB, b) > 0.3) {
        const s3 = renderLocalStep(region, num[steps.length] + stopB.name + " → " + b.name, stopB, b, stopB.name, b.station);
        steps.push(s3.step); total += s3.minutes; wait += s3.wait;
      }

      header.append(el("p", "stop-meta", "跨城市移動，建議先到 " + stopA.name + "，再前往 " + hubB.name + "。"));
      header.append(el("p", "plan-total", "交通時間合計：含等車 " + formatMinutes(total + wait) + "；不含等車 " + formatMinutes(total) + "（估算）"));
      header.append(mapLinks(region, a, b));
      parts.push(...steps);
    }

    const note = el("p", "card hint", "「推薦」以外的時間為依距離估算，實際會因轉乘與班次不同；請用上面的地圖連結查即時路線。" +
      mapAppNote(region));
    parts.push(note, el("p", "card tip", "💡 " + region.transportTip));

    out.replaceChildren(...parts);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("route-form").addEventListener("submit", (e) => {
    e.preventDefault();
    updateRoute();
  });

  // ---------------------------------------------------------------
  // 旅遊指南
  // ---------------------------------------------------------------
  let guideCountry = GUIDES[0] ? GUIDES[0].country : "";

  function renderGuide() {
    // 只有一個國家時不需要切換按鈕
    $("guide-countries").closest(".card").hidden = GUIDES.length <= 1;
    $("guide-countries").replaceChildren(...GUIDES.map((g) =>
      chip(g.name, g.country === guideCountry, () => { guideCountry = g.country; renderGuide(); })
    ));

    const guide = GUIDES.find((g) => g.country === guideCountry);
    const content = $("guide-content");
    if (!guide) { content.replaceChildren(); return; }

    const parts = [];
    const tips = REGIONS.filter((r) => r.country === guide.country);
    const tipCard = el("div", "card");
    tipCard.append(el("h2", "plan-title", "各城市交通建議"));
    for (const r of tips) {
      tipCard.append(el("h3", "stop-name", regionLabel(r)), el("p", "leg-detail", r.transportTip));
    }
    parts.push(tipCard);

    guide.sections.forEach((sec, i) => {
      const det = el("details", "card guide-section");
      if (i === 0) det.open = true;
      det.append(el("summary", "guide-summary", sec.title));
      for (const item of sec.items) {
        det.append(el("h3", "stop-name", item.title), el("p", "leg-detail", item.body));
      }
      parts.push(det);
    });

    const src = el("details", "card guide-section");
    src.append(el("summary", "guide-summary", "資料來源"));
    const ul = el("ul", "source-list");
    for (const s of guide.sources) {
      const li = el("li");
      li.append(link(s.title, s.url));
      ul.append(li);
    }
    src.append(ul);
    parts.push(src);

    content.replaceChildren(...parts);
  }

  // ---------------------------------------------------------------
  // 「機場 → 市區」快捷入口：一鍵帶入城市、機場與目的地並查詢
  // ---------------------------------------------------------------
  function runQuickRoute(region, q) {
    showTab("route");
    regionSelect.value = region.id;
    onRegionChange();
    fromSelect.value = AIRPORT_PREFIX + q.airport;
    toSelect.value = q.to;
    $("route-to-text").value = "";
    updateRoute();
  }

  function quickRouteCard() {
    const list = REGIONS.filter((r) => (r.quickRoutes || []).length);
    if (!list.length) return null;
    const card = el("div", "card quick-routes");
    card.append(el("h2", "quick-title", "✈️ 機場 → 市區 快捷查詢"));
    card.append(el("p", "stop-meta", "剛下飛機？點一下直接比較各種交通方式的時間、票價與轉乘。"));
    // 大型行李勾選框：和路線查詢裡的「我帶著大型行李」同步
    const lab = el("label", "check quick-luggage");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "quick-luggage-box";
    box.checked = luggageBox.checked;
    box.addEventListener("change", () => {
      luggageBox.checked = box.checked;
      luggageBox.dispatchEvent(new Event("change"));
    });
    lab.append(box, el("span", "", "🧳 我帶著大型行李（直達、免轉乘的方式排前面）"));
    card.append(lab);
    for (const r of list) {
      if (list.length > 1) card.append(el("p", "quick-region", regionLabel(r)));
      const box = el("div", "chips quick-chips");
      for (const q of r.quickRoutes) {
        const spot = findSpot(r, q.to);
        const ap = airportsOf(r).find((a) => a.id === q.airport);
        if (!spot || !ap) continue;
        const b = el("button", "chip quick-chip", q.label || ap.name + " → " + spot.name);
        b.type = "button";
        b.addEventListener("click", () => runQuickRoute(r, q));
        box.append(b);
      }
      card.append(box);
    }
    return card;
  }
  for (const panel of ["panel-plans", "panel-route"]) {
    const card = quickRouteCard();
    if (card) $(panel).prepend(card);
  }

  // ---------------------------------------------------------------
  // 今日匯率換算（台幣 ↔ 日圓／韓元／印尼盾）
  //   匯率來源：ExchangeRate-API 免費版（每日更新），抓不到時改用 fawazahmed0 currency-api。
  //   最後一次抓到的匯率存在手機上，離線也能換算；畫面會標出匯率日期。
  // ---------------------------------------------------------------
  const FX_KEY = "travel-fx-v1";
  const FX_MAX_AGE = 6 * 60 * 60 * 1000; // 6 小時內不重抓
  const CURRENCIES = {
    "日圓": { code: "JPY", quick: [100, 500, 1000, 5000, 10000] },
    "韓元": { code: "KRW", quick: [1000, 5000, 10000, 50000, 100000] },
    "印尼盾": { code: "IDR", quick: [10000, 50000, 100000, 500000, 1000000] },
  };
  const appCurrencies = [...new Set(REGIONS.map((r) => r.currency))].filter((c) => CURRENCIES[c]);

  // fx = { rates: { JPY: 1 台幣可換的日圓, ... }, date: "YYYY-MM-DD", source, fetchedAt }
  let fx = null;
  try { fx = JSON.parse(localStorage.getItem(FX_KEY) || "null"); } catch (e) { fx = null; }
  let fxError = "";

  const FX_SOURCES = [
    {
      name: "ExchangeRate-API",
      url: "https://open.er-api.com/v6/latest/TWD",
      parse: (d) => d && d.result === "success" && d.rates
        ? { rates: { JPY: d.rates.JPY, KRW: d.rates.KRW, IDR: d.rates.IDR }, date: new Date(d.time_last_update_unix * 1000).toISOString().slice(0, 10) }
        : null,
    },
    {
      name: "currency-api",
      url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/twd.json",
      parse: (d) => d && d.twd ? { rates: { JPY: d.twd.jpy, KRW: d.twd.krw, IDR: d.twd.idr }, date: d.date } : null,
    },
  ];

  function fxRate(currencyName) {
    const c = CURRENCIES[currencyName];
    const r = c && fx && fx.rates ? Number(fx.rates[c.code]) : 0;
    return r > 0 ? r : 0;
  }

  // 外幣 → 台幣
  function toTwd(amount, currencyName) {
    const r = fxRate(currencyName);
    return r ? amount / r : null;
  }

  function formatTwd(n) {
    if (n < 10) return n.toFixed(1);
    return Math.round(n).toLocaleString("en-US");
  }

  // 結果卡的總票價後面加上「約 NT$ …」
  function twdText(fare) {
    if (!fxRate(fare.currency) || !fare.max) return "";
    const a = toTwd(fare.min, fare.currency);
    const b = toTwd(fare.max, fare.currency);
    return "（≈ NT$ " + (Math.round(a) === Math.round(b) ? formatTwd(a) : formatTwd(a) + "–" + formatTwd(b)) + "）";
  }

  async function fetchFx(force) {
    if (!force && fx && fx.fetchedAt && Date.now() - fx.fetchedAt < FX_MAX_AGE) return;
    for (const src of FX_SOURCES) {
      try {
        const res = await fetch(src.url, { cache: "no-store" });
        if (!res.ok) continue;
        const parsed = src.parse(await res.json());
        if (!parsed || !(parsed.rates.JPY > 0)) continue;
        fx = Object.assign(parsed, { source: src.name, fetchedAt: Date.now() });
        fxError = "";
        try { localStorage.setItem(FX_KEY, JSON.stringify(fx)); } catch (e) { /* 無法儲存時照常使用 */ }
        renderFx();
        return;
      } catch (e) { /* 換下一個來源 */ }
    }
    fxError = fx ? "目前無法更新匯率，先用上次抓到的匯率。" : "目前無法取得匯率，請連上網路後按「更新匯率」。";
    renderFx();
  }

  const fxState = { currency: appCurrencies[0] || "", foreign: "", twd: "", last: "foreign" };
  try {
    const saved = localStorage.getItem("travel-fx-currency");
    if (appCurrencies.includes(saved)) fxState.currency = saved;
  } catch (e) { /* 忽略 */ }

  const parseAmount = (t) => {
    const n = Number(String(t).replace(/[,，\s]/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };

  // 換算畫面可以有好幾個（旅遊指南裡的卡片、右上角的換算框），共用同一份 fxState
  const fxViews = [];
  const FX_SAMPLE = { "日圓": 1000, "韓元": 10000, "印尼盾": 100000 };
  let fxIdSeq = 0;

  function renderFx() {
    const cur = fxState.currency;
    const rate = fxRate(cur);
    for (const root of fxViews) {
      const chipsBox = root.querySelector(".fx-currencies");
      chipsBox.hidden = appCurrencies.length < 2;
      chipsBox.replaceChildren(...appCurrencies.map((c) => chip(c, c === cur, () => {
        fxState.currency = c;
        try { localStorage.setItem("travel-fx-currency", c); } catch (e) { /* 忽略 */ }
        renderFx();
        recalc();
      })));
      root.querySelector(".fx-foreign-label").textContent = cur;
      root.querySelector(".fx-quick").replaceChildren(...(CURRENCIES[cur] ? CURRENCIES[cur].quick : []).map((n) => {
        const b = el("button", "chip", n.toLocaleString("en-US"));
        b.type = "button";
        b.addEventListener("click", () => {
          fxState.foreign = n.toLocaleString("en-US");
          fxState.last = "foreign";
          recalc();
        });
        return b;
      }));
      root.querySelector(".fx-rate").textContent = rate
        ? "1 " + cur + " ≈ " + (1 / rate).toPrecision(3) + " 台幣；100 台幣 ≈ " + Math.round(100 * rate).toLocaleString("en-US") + " " + cur
        : "還沒有匯率資料。";
      const status = root.querySelector(".fx-status");
      status.textContent = (fx && fx.date ? "匯率日期：" + fx.date + "（來源：" + fx.source + "）。" : "") + (fxError ? " " + fxError : "");
      status.classList.toggle("fx-error", !!fxError);
      root.querySelector(".fx-inputs").hidden = !rate;
    }
    // 右上角按鈕上的換算：例如「1,000 日圓 ≈ NT$210」
    const pill = $("fx-pill");
    if (pill) {
      const n = FX_SAMPLE[cur] || 1000;
      pill.textContent = rate ? "💱 " + n.toLocaleString("en-US") + " " + cur + " ≈ NT$" + formatTwd(n / rate) : "💱 匯率換算";
      pill.setAttribute("aria-label", "今日匯率換算" + (rate ? "：" + pill.textContent.replace("💱 ", "") : ""));
    }
  }

  // 依最後輸入的那一欄換算另一欄，所有換算畫面同步
  function recalc() {
    const rate = fxRate(fxState.currency);
    if (!rate) return;
    let foreign = fxState.foreign;
    let twd = fxState.twd;
    if (fxState.last === "foreign") {
      const n = parseAmount(foreign);
      twd = foreign === "" || Number.isNaN(n) ? "" : formatTwd(n / rate);
    } else {
      const n = parseAmount(twd);
      foreign = twd === "" || Number.isNaN(n) ? "" : Math.round(n * rate).toLocaleString("en-US");
    }
    for (const root of fxViews) {
      const fIn = root.querySelector(".fx-foreign-input");
      const tIn = root.querySelector(".fx-twd-input");
      if (document.activeElement !== fIn) fIn.value = foreign;
      if (document.activeElement !== tIn) tIn.value = twd;
    }
  }

  // 建立一個換算畫面；compact 為右上角的精簡版（少一些說明文字）
  function buildFxView(compact) {
    const root = el("div", "fx-view" + (compact ? " fx-compact" : ""));
    const currencies = el("div", "chips fx-currencies");
    currencies.setAttribute("role", "group");
    currencies.setAttribute("aria-label", "幣別");

    const inputs = el("div", "fx-inputs");
    const field = (cls, labelText, labelClass) => {
      const id = "fx-input-" + (++fxIdSeq);
      const wrap = el("label", "fx-field");
      wrap.htmlFor = id;
      const input = document.createElement("input");
      input.id = id;
      input.className = cls;
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.placeholder = "0";
      wrap.append(el("span", "fx-unit " + labelClass, labelText), input);
      return input;
    };
    const f = field("fx-foreign-input", "", "fx-foreign-label");
    const t = field("fx-twd-input", "台幣", "");
    inputs.append(f.parentNode, el("span", "fx-eq", "＝"), t.parentNode);
    for (const ev of ["input", "change", "compositionend", "keyup"]) {
      f.addEventListener(ev, () => { fxState.foreign = f.value; fxState.last = "foreign"; recalc(); });
      t.addEventListener(ev, () => { fxState.twd = t.value; fxState.last = "twd"; recalc(); });
    }

    const refresh = el("button", "button button-secondary button-small", "🔄 更新匯率");
    refresh.type = "button";
    refresh.addEventListener("click", () => { refresh.disabled = true; fetchFx(true).finally(() => { refresh.disabled = false; }); });

    root.append(currencies, inputs, el("div", "chips fx-quick"), el("p", "fx-rate"), el("p", "stop-meta fx-status"));
    if (!compact) root.append(el("p", "stop-meta", "這是市場參考匯率；在當地換錢或刷卡的實際匯率會比較差，另有手續費。"));
    root.append(refresh);
    fxViews.push(root);
    return root;
  }

  function buildFxCard() {
    if (!appCurrencies.length) return;
    const card = el("section", "card fx-card");
    card.setAttribute("aria-labelledby", "fx-title");
    const title = el("h2", "fx-title", "💱 今日匯率換算");
    title.id = "fx-title";
    card.append(title, buildFxView(false));
    $("panel-guide").prepend(card);
  }

  // 右上角的換算框：固定在畫面右上角，點一下展開
  function buildFxCorner() {
    if (!appCurrencies.length) return;
    const pill = el("button", "fx-pill", "💱 匯率換算");
    pill.id = "fx-pill";
    pill.type = "button";
    pill.setAttribute("aria-expanded", "false");
    pill.setAttribute("aria-controls", "fx-pop");

    const pop = el("div", "fx-pop card");
    pop.id = "fx-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "今日匯率換算");
    pop.hidden = true;
    const head = el("div", "fx-pop-head");
    const close = el("button", "fx-pop-close", "✕");
    close.type = "button";
    close.setAttribute("aria-label", "關閉匯率換算");
    head.append(el("h2", "fx-title", "💱 今日匯率換算"), close);
    pop.append(head, buildFxView(true));

    const open = (show) => {
      pop.hidden = !show;
      pill.setAttribute("aria-expanded", String(show));
      if (show) {
        fetchFx(false);
        const input = pop.querySelector(".fx-foreign-input");
        if (input && !pop.querySelector(".fx-inputs").hidden) input.focus();
      }
    };
    pill.addEventListener("click", () => open(pop.hidden));
    close.addEventListener("click", () => { open(false); pill.focus(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) { open(false); pill.focus(); } });
    document.addEventListener("click", (e) => {
      // 用事件路徑判斷：點幣別時按鈕會重畫、元素被換掉，不能用 contains
      const path = e.composedPath();
      if (!pop.hidden && !path.includes(pop) && !path.includes(pill)) open(false);
    });
    document.body.append(pill, pop);

    // 分頁列捲到頂端固定時，按鈕移到分頁列下方，避免蓋住分頁
    const tabsBar = document.querySelector(".tabs");
    let ticking = false;
    const place = () => {
      ticking = false;
      const r = tabsBar ? tabsBar.getBoundingClientRect() : null;
      const top = r && r.top <= 1 ? Math.round(r.bottom + 6) : 8;
      pill.style.top = "calc(env(safe-area-inset-top, 0px) + " + top + "px)";
      pop.style.top = "calc(env(safe-area-inset-top, 0px) + " + (top + 44) + "px)";
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(place); } }, { passive: true });
    window.addEventListener("resize", place);
    place();
  }

  // ---------------------------------------------------------------
  // 今日天氣與穿著建議（熱門景點分頁最上方）
  //   資料來源：Open-Meteo（免費、免金鑰）；最後一次的結果存在手機上，離線時也能看
  // ---------------------------------------------------------------
  const WX_KEY = "travel-weather-v1";
  const WX_MAX_AGE = 60 * 60 * 1000; // 1 小時內不重抓

  // WMO 天氣代碼 → 中文與圖示
  function wxDesc(code) {
    if (code === 0) return ["☀️", "晴天"];
    if (code === 1) return ["🌤️", "大致晴朗"];
    if (code === 2) return ["⛅", "多雲時晴"];
    if (code === 3) return ["☁️", "陰天"];
    if (code === 45 || code === 48) return ["🌫️", "有霧"];
    if (code >= 51 && code <= 57) return ["🌦️", "毛毛雨"];
    if (code >= 61 && code <= 67) return ["🌧️", code >= 65 ? "大雨" : "下雨"];
    if (code >= 71 && code <= 77) return ["🌨️", "下雪"];
    if (code >= 80 && code <= 82) return ["🌦️", "陣雨"];
    if (code === 85 || code === 86) return ["🌨️", "陣雪"];
    if (code >= 95) return ["⛈️", "雷雨"];
    return ["🌡️", "—"];
  }

  // 依溫度、溫差、雨、雪、風、紫外線給建議（純規則，不需網路）
  function wxAdvice(d) {
    const hi = d.tmax;
    const lo = d.tmin;
    const feel = d.feel;
    const avg = (hi + lo) / 2;
    let wear;
    if (avg >= 27) wear = "短袖、短褲或透氣的薄衣服";
    else if (avg >= 23) wear = "短袖，帶一件薄長袖進冷氣房";
    else if (avg >= 18) wear = "長袖上衣，加一件薄外套";
    else if (avg >= 13) wear = "長袖＋外套（針織衫、風衣）";
    else if (avg >= 8) wear = "毛衣＋厚外套";
    else if (avg >= 3) wear = "羽絨衣、圍巾、手套";
    else wear = "保暖內衣＋羽絨衣，戴帽子、圍巾、手套";
    const tips = [];
    if (hi - lo >= 8) tips.push("早晚溫差 " + Math.round(hi - lo) + "°C，建議洋蔥式穿法，方便穿脫");
    if (d.wind >= 30 && avg < 20) tips.push("風大，體感更冷，外套選防風的");
    else if (feel != null && d.now != null && d.now - feel >= 3 && avg < 25) tips.push("現在體感 " + Math.round(feel) + "°C，比氣溫冷，多帶一件外套");
    const snow = (d.code >= 71 && d.code <= 77) || d.code === 85 || d.code === 86;
    if (snow) tips.push("可能下雪，穿防滑的鞋子");
    if (d.uv >= 8) tips.push("紫外線很強，記得防曬乳、帽子、太陽眼鏡");
    else if (d.uv >= 6 && hi >= 25) tips.push("紫外線偏強，出門擦防曬");

    let rain;
    let rainLevel;
    const p = d.rainProb;
    const mm = d.rainSum;
    if (snow && (p >= 30 || mm >= 1)) {
      rain = "🌨️ 會下雪：降水機率 " + p + "%。帶傘或穿防水外套，鞋子選防滑、防水的。";
      rainLevel = "high";
    } else if (p >= 60 || mm >= 5 || (d.code >= 61 && d.code <= 67) || d.code >= 95) {
      rain = "☔ 一定要帶雨具：降雨機率 " + p + "%" + (mm >= 1 ? "，預估雨量約 " + Math.round(mm) + " 毫米" : "") + "。建議帶傘或雨衣，鞋子選防水的。";
      rainLevel = "high";
    } else if (p >= 30 || mm >= 1) {
      rain = "🌂 建議帶折疊傘：降雨機率 " + p + "%，可能會有短暫陣雨。";
      rainLevel = "mid";
    } else {
      rain = "😎 不太需要雨具：降雨機率 " + p + "%。";
      rainLevel = "low";
    }
    if (d.wind >= 36 && rainLevel !== "low") rain += " 風很大，雨衣會比傘好用。";
    return { wear, tips, rain, rainLevel };
  }

  const wxState = { place: "", data: null, error: "" };
  let wxCache = {};
  try { wxCache = JSON.parse(localStorage.getItem(WX_KEY) || "{}") || {}; } catch (e) { wxCache = {}; }

  // 地點選項：每個地區用第一個城市中心
  const wxPlaces = REGIONS.map((r) => ({ id: r.id, name: regionLabel(r), lat: r.hubs[0].lat, lng: r.hubs[0].lng }));

  async function loadWeather(place, force) {
    const key = place.id;
    const cached = wxCache[key];
    if (!force && cached && Date.now() - cached.fetchedAt < WX_MAX_AGE) {
      wxState.data = cached; wxState.error = ""; renderWeather(); return;
    }
    wxState.data = cached || null;
    wxState.error = "";
    renderWeather(true);
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + place.lat.toFixed(4) + "&longitude=" + place.lng.toFixed(4) +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,wind_speed_10m_max" +
      "&timezone=auto&forecast_days=1";
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = await res.json();
      const dl = j.daily;
      const data = {
        name: place.name,
        date: dl.time[0],
        code: dl.weather_code[0],
        tmax: dl.temperature_2m_max[0],
        tmin: dl.temperature_2m_min[0],
        rainProb: dl.precipitation_probability_max[0] != null ? dl.precipitation_probability_max[0] : 0,
        rainSum: dl.precipitation_sum[0] || 0,
        uv: dl.uv_index_max ? dl.uv_index_max[0] || 0 : 0,
        wind: dl.wind_speed_10m_max ? dl.wind_speed_10m_max[0] || 0 : 0,
        now: j.current ? j.current.temperature_2m : null,
        feel: j.current ? j.current.apparent_temperature : null,
        fetchedAt: Date.now(),
      };
      wxCache[key] = data;
      try { localStorage.setItem(WX_KEY, JSON.stringify(wxCache)); } catch (e) { /* 無法儲存時照常顯示 */ }
      if (wxState.place === key) { wxState.data = data; renderWeather(); }
    } catch (e) {
      if (wxState.place === key) {
        wxState.error = cached ? "目前無法更新天氣，先顯示上次的資料。" : "目前無法取得天氣，請連上網路後再試。";
        renderWeather();
      }
    }
  }

  let wxCard = null;
  function renderWeather(loading) {
    if (!wxCard) return;
    const body = wxCard.querySelector(".wx-body");
    const d = wxState.data;
    const parts = [];
    if (d) {
      const [icon, text] = wxDesc(d.code);
      const a = wxAdvice(d);
      const top = el("div", "wx-top");
      top.append(el("span", "wx-icon", icon), el("div", "wx-temps"));
      top.lastChild.append(el("p", "wx-desc", text + (d.now != null ? "・現在 " + Math.round(d.now) + "°C" : "")),
        el("p", "wx-range", "最高 " + Math.round(d.tmax) + "°C／最低 " + Math.round(d.tmin) + "°C・降雨機率 " + d.rainProb + "%"));
      parts.push(top);
      const wear = el("p", "wx-line");
      wear.append(el("strong", "", "👕 建議穿著："), a.wear);
      parts.push(wear);
      for (const t of a.tips) parts.push(el("p", "wx-tip", "・" + t));
      parts.push(el("p", "wx-rain wx-rain-" + a.rainLevel, a.rain));
      parts.push(el("p", "stop-meta", "預報日期：" + d.date + "（當地時間）。資料來源：Open-Meteo。"));
    } else if (!wxState.error) {
      parts.push(el("p", "stop-meta", "讀取天氣中…"));
    }
    if (loading && d) parts.push(el("p", "stop-meta", "更新中…"));
    if (wxState.error) parts.push(el("p", "wx-error", wxState.error));
    body.replaceChildren(...parts);
  }

  function selectWxPlace(place) {
    wxState.place = place.id;
    wxState.data = wxCache[place.id] || null;
    try { localStorage.setItem("travel-weather-place", place.id); } catch (e) { /* 忽略 */ }
    loadWeather(place, false);
  }

  function buildWeatherCard() {
    if (!wxPlaces.length) return;
    const card = el("section", "card wx-card");
    card.setAttribute("aria-labelledby", "wx-title");
    const title = el("h2", "wx-title", "🌤️ 今日天氣與穿著建議");
    title.id = "wx-title";
    const row = el("div", "wx-controls");
    const label = el("label", "visually-hidden", "選擇城市");
    label.htmlFor = "wx-place";
    const select = document.createElement("select");
    select.id = "wx-place";
    for (const p of wxPlaces) {
      const o = el("option", "", p.name);
      o.value = p.id;
      select.append(o);
    }
    const here = el("button", "button button-secondary button-small", "📍 用我現在的位置");
    here.type = "button";
    row.append(label, select, here);
    card.append(title, row, el("div", "wx-body"));
    wxCard = card;
    $("panel-plans").prepend(card);

    let saved = "";
    try { saved = localStorage.getItem("travel-weather-place") || ""; } catch (e) { saved = ""; }
    const start = wxPlaces.find((p) => p.id === saved) || wxPlaces[0];
    select.value = start.id;
    select.addEventListener("change", () => selectWxPlace(wxPlaces.find((p) => p.id === select.value)));
    here.addEventListener("click", () => {
      if (!navigator.geolocation) { wxState.error = "這個瀏覽器不支援定位。"; renderWeather(); return; }
      here.disabled = true;
      navigator.geolocation.getCurrentPosition((pos) => {
        here.disabled = false;
        const place = { id: "here", name: "目前位置", lat: pos.coords.latitude, lng: pos.coords.longitude };
        wxState.place = "here";
        wxState.data = null;
        loadWeather(place, true);
      }, () => {
        here.disabled = false;
        wxState.error = "無法取得目前位置，請允許定位權限，或改選城市。";
        renderWeather();
      }, { timeout: 10000, maximumAge: 10 * 60 * 1000 });
    });
    selectWxPlace(start);
  }

  // ---------------------------------------------------------------
  // 初始化
  // ---------------------------------------------------------------
  renderPlans();
  onRegionChange();
  renderGuide();
  buildFxCard();
  buildFxCorner();
  buildWeatherCard();
  renderFx();
  recalc();
  fetchFx(false);
})();

// ---------------------------------------------------------------
// 回到頂端：多拉A夢的鈴鐺按鈕（往下捲一段後出現在右下角）
// ---------------------------------------------------------------
(function () {
  "use strict";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "to-top";
  btn.className = "to-top";
  btn.setAttribute("aria-label", "回到頂端");
  btn.title = "回到頂端";
  btn.hidden = true;
  btn.innerHTML =
    '<svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" focusable="false">' +
      // 紅色項圈
      '<rect x="4" y="6" width="56" height="12" rx="6" fill="#e60012" stroke="#1f2937" stroke-width="2"/>' +
      // 鈴鐺本體
      '<circle cx="32" cy="36" r="20" fill="#ffd400" stroke="#1f2937" stroke-width="2.5"/>' +
      '<ellipse cx="25" cy="27" rx="5" ry="3.5" fill="#fff6b0" opacity="0.9"/>' +
      // 中間的兩條橫線
      '<path d="M13.5 32 H50.5 M12.5 37 H51.5" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
      // 下方的圓孔與開口
      '<circle cx="32" cy="45" r="3.5" fill="#1f2937"/>' +
      '<path d="M32 48 V55" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round"/>' +
    "</svg>" +
    '<span class="to-top-label" aria-hidden="true">TOP</span>';
  document.body.append(btn);

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ticking = false;
  function update() {
    ticking = false;
    btn.hidden = window.scrollY < 400;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();

  btn.addEventListener("click", () => {
    btn.classList.remove("ringing");
    void btn.offsetWidth;
    btn.classList.add("ringing");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    // 鍵盤使用者回到頂端後，焦點放在頁首
    const h1 = document.querySelector(".site-header h1");
    if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  });
  btn.addEventListener("animationend", () => btn.classList.remove("ringing"));
})();
