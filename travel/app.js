// 日韓景點路線：推薦行程、路線查詢、旅遊指南
(function () {
  "use strict";

  // 只顯示某一國家：日本 App 設 window.APP_COUNTRY = "jp"，韓國 App 設 "kr"；未設定則兩國都顯示
  const APP_COUNTRY = window.APP_COUNTRY || "";
  const inCountry = (x) => !APP_COUNTRY || x.country === APP_COUNTRY;

  // 地區依地理位置由北到南排列；不在清單裡的排在最後
  const REGION_ORDER = [
    "sapporo", "sendai", "tokyo", "nagoya", "kanazawa", "kansai", "hiroshima", "takamatsu", "fukuoka", "nagasaki", "okinawa",
    "seoul", "gangneung", "daegu", "busan", "jeonju", "jeju",
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

  const MODE_ICON = { "步行": "🚶", "大眾運輸": "🚇", "地鐵": "🚇", "電車": "🚆", "公車": "🚌", "計程車": "🚕", "纜車": "🚡" };
  function modeLabel(mode) {
    return (MODE_ICON[mode] || "➡️") + " " + mode;
  }
  // 交通方式的彩色標籤
  const MODE_CLASS = { "步行": "walk", "大眾運輸": "transit", "地鐵": "subway", "電車": "rail", "公車": "bus", "計程車": "taxi", "纜車": "cable" };
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

  // 列出全部推薦行程，依城市分組（城市順序同 REGIONS：由北到南）
  function renderPlans() {
    const list = $("plan-list");
    const parts = [];
    let total = 0;
    for (const region of REGIONS) {
      if (!region.itineraries.length) continue;
      parts.push(el("h2", "plan-region", regionLabel(region) + "（" + region.itineraries.length + "）"));
      for (const it of region.itineraries) parts.push(renderItinerary(region, it));
      total += region.itineraries.length;
    }
    list.replaceChildren(...parts);
    if (!total) list.append(el("p", "card empty", "還沒有整理推薦行程。"));
    $("plan-count").textContent = "共 " + total + " 個推薦行程";
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
    if (mode === "計程車") {
      const base = f.taxiBase + Math.max(km - 1.5, 0) * f.taxiPerKm;
      return { min: base * 0.9, max: base * 1.2, estimated: true };
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
  function localOptions(a, b) {
    const km = distanceKm(a, b) * 1.3; // 直線距離乘上繞路係數
    const opts = [];
    const luggage = withLuggage();
    if (km <= (luggage ? 1.0 : 1.5)) {
      opts.push({ mode: "步行", kind: "walk", minutes: km / 4.5 * 60, wait: 0, note: luggage ? "距離很近，拖著行李走過去即可。" : "距離很近，建議步行。" });
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

  function renderLocalStep(region, title, a, b, aStation, bStation) {
    const step = el("div", "card route-step");
    step.append(el("h3", "step-title", title));
    step.append(el("p", "stop-meta", "🚉 " + aStation + " → " + bStation));
    const { km, opts } = localOptions(a, b);
    step.append(el("p", "stop-meta", "距離約 " + km.toFixed(1) + " 公里（估算）"));
    opts.forEach((o, i) => step.append(renderOption(o, i === 0)));
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
      const km = distanceKm(airport, spot) * 1.3;
      const minutes = 10 + Math.min(km, 20) / 30 * 60 + Math.max(km - 20, 0) / 65 * 60;
      return finishPlan(region, option, [{
        mode: option.mode, kind: "taxi", from: airport.name, to: spot.name, minutes, wait: 0,
        // 計程車依實際距離估算車資（資料裡的金額只對應某一個目的地）
        cost: null, costRange: costEstimate(region, "計程車", km),
        note: option.detail, noteBack: option.detailBack, estimated: true, official: option.official, transfers: 0,
      }]);
    }
    const segs = [{
      mode: option.mode, kind: "airport", from: airport.name, to: option.to.name, title: option.title,
      minutes: option.minutes, wait: WAIT.airport, cost: option.cost, costRange: parseCost(option.cost),
      note: option.detail, noteBack: option.detailBack, verified: option.verified, official: option.official,
      transfers: tr.n, transfersSure: tr.sure,
    }];

    function addLocal(a, aName, b, bName) {
      if (distanceKm(a, b) <= 0.3) return;
      const { km, opts } = localOptions(a, b);
      const best = opts[0];
      segs.push({ mode: best.mode, kind: best.kind, from: aName, to: bName, minutes: best.minutes, wait: best.wait,
        costRange: costEstimate(region, best.mode, km), note: best.note, estimated: true,
        official: best.kind === "transit" ? region.localLink : null });
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
    if (fare.unknown) return "部分票價未知：已知部分約 " + range + " " + fare.currency + "，其餘請以官網為準";
    return "約 " + range + " " + fare.currency + (fare.open ? " 起" : "") +
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

    let plans = airport.options.map((o) => airportPlan(region, airport, o, spot));
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
      (region.country === "kr" ? "韓國建議搭配 Naver 地圖或 KakaoMap。" : "")));
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
      (region.country === "kr" ? "韓國的 Google 地圖可以查大眾運輸，但步行導航不可靠，建議搭配 Naver 地圖或 KakaoMap。" : ""));
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
  // 初始化
  // ---------------------------------------------------------------
  renderPlans();
  onRegionChange();
  renderGuide();
})();
