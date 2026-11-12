// 日韓景點路線：推薦行程、路線查詢、旅遊指南
(function () {
  "use strict";

  const REGIONS = window.REGIONS || [];
  const GUIDES = window.GUIDES || [];
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
  const tabs = ["plans", "route", "guide"];
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
  const planState = { region: "", themes: new Set() };
  const allThemes = [...new Set(REGIONS.flatMap((r) => r.itineraries.flatMap((i) => i.themes)))];

  function renderPlanFilters() {
    const regionBox = $("plan-regions");
    regionBox.replaceChildren(
      chip("全部", planState.region === "", () => { planState.region = ""; renderPlanFilters(); markPlanPending(); }),
      ...REGIONS.map((r) => chip(r.name, planState.region === r.id, () => {
        planState.region = r.id; renderPlanFilters(); markPlanPending();
      }))
    );
    const themeBox = $("plan-themes");
    themeBox.replaceChildren(...allThemes.map((t) => chip(t, planState.themes.has(t), () => {
      if (planState.themes.has(t)) planState.themes.delete(t); else planState.themes.add(t);
      renderPlanFilters(); markPlanPending();
    })));
  }

  function markPlanPending() { $("plan-pending").hidden = false; }

  function renderItinerary(region, it) {
    const card = el("article", "card plan");
    const head = el("div", "plan-head");
    head.append(el("h2", "plan-title", it.title), el("span", "badge", region.name));
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
      li.append(el("span", "stop-dot", String(i + 1)));
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
        top.append(el("strong", "", modeLabel(leg.mode)), " " + formatMinutes(leg.minutes) + "・" + leg.cost);
        legBody.append(top, el("p", "leg-detail", leg.detail));
        legBody.append(mapLinks(region, spot, next));
        legLi.append(legBody);
        ol.append(legLi);
      }
    });
    card.append(ol);
    return card;
  }

  function updatePlans() {
    $("plan-pending").hidden = true;
    const list = $("plan-list");
    const cards = [];
    for (const region of REGIONS) {
      if (planState.region && region.id !== planState.region) continue;
      for (const it of region.itineraries) {
        if ([...planState.themes].every((t) => it.themes.includes(t))) cards.push(renderItinerary(region, it));
      }
    }
    list.replaceChildren(...cards);
    if (!cards.length) list.append(el("p", "card empty", "沒有符合條件的行程，試著減少主題。"));
    $("plan-count").textContent = "找到 " + cards.length + " 個行程";
  }

  $("plan-form").addEventListener("submit", (e) => {
    e.preventDefault();
    updatePlans();
    $("plan-count").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("plan-reset").addEventListener("click", () => {
    planState.region = "";
    planState.themes.clear();
    renderPlanFilters();
    updatePlans();
  });

  // ---------------------------------------------------------------
  // 路線查詢
  // ---------------------------------------------------------------
  const regionSelect = $("route-region");
  const fromSelect = $("route-from");
  const toSelect = $("route-to");

  for (const r of REGIONS) {
    const o = el("option", "", r.name);
    o.value = r.id;
    regionSelect.append(o);
  }

  function fillSpotSelect(select, region, placeholder) {
    const first = el("option", "", placeholder);
    first.value = "";
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
    select.replaceChildren(first, ...groups);
  }

  function onRegionChange() {
    const region = findRegion(regionSelect.value);
    fillSpotSelect(fromSelect, region, "請選擇出發景點");
    fillSpotSelect(toSelect, region, "請選擇目的地");
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

  // 同城市內：依距離估算交通方式
  function localOptions(a, b) {
    const km = distanceKm(a, b) * 1.3; // 直線距離乘上繞路係數
    const opts = [];
    if (km <= 1.5) {
      opts.push({ mode: "步行", minutes: km / 4.5 * 60, note: "距離很近，建議步行。" });
      return { km, opts };
    }
    opts.push({ mode: "大眾運輸", minutes: 8 + km / 22 * 60, note: "搭地鐵、電車或公車，含步行到車站與等車時間；實際路線請用下方地圖連結查詢。" });
    if (km <= 12) {
      opts.push({ mode: "計程車", minutes: 5 + km / 20 * 60, note: "三到四人同行、行李多或趕時間時適合。" });
    }
    if (km <= 3) {
      opts.push({ mode: "步行", minutes: km / 4.5 * 60, note: "天氣好也可以散步過去。" });
    }
    return { km, opts };
  }

  function intercityLeg(region, fromHub, toHub) {
    const direct = region.intercity.find((x) => x.from === fromHub && x.to === toHub);
    if (direct) return { leg: direct, reversed: false };
    const back = region.intercity.find((x) => x.from === toHub && x.to === fromHub);
    if (back) return { leg: back, reversed: true };
    return null;
  }

  function renderOption(opt, primary) {
    const box = el("div", "option" + (primary ? " option-primary" : ""));
    const top = el("p", "leg-top");
    top.append(el("strong", "", modeLabel(opt.mode)), " " + formatMinutes(opt.minutes) + (opt.cost ? "・" + opt.cost : ""));
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
    return { step, minutes: opts[0].minutes };
  }

  function updateRoute() {
    const region = findRegion(regionSelect.value);
    const err = $("route-error");
    const out = $("route-result");
    err.hidden = true;

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
      let total = 0;
      const steps = [];

      if (distanceKm(a, hubA) > 0.3) {
        const s1 = renderLocalStep(region, "① " + a.name + " → " + hubA.station, a, hubA, a.station, hubA.station);
        steps.push(s1.step); total += s1.minutes;
      }

      const mid = el("div", "card route-step");
      mid.append(el("h3", "step-title", (steps.length ? "② " : "① ") + hubA.name + " → " + hubB.name));
      if (inter) {
        mid.append(renderOption({ mode: inter.leg.mode, minutes: inter.leg.minutes, cost: inter.leg.cost, note: inter.leg.detail + (inter.reversed ? "（反方向搭同一條路線）" : "") }, true));
        total += inter.leg.minutes;
      } else {
        mid.append(el("p", "leg-detail", "這兩個城市之間沒有整理資料，請用地圖 App 查詢。"));
      }
      mid.append(mapLinks(region, hubA, hubB));
      steps.push(mid);

      if (distanceKm(hubB, b) > 0.3) {
        const s3 = renderLocalStep(region, (steps.length + 1 === 3 ? "③ " : "② ") + hubB.station + " → " + b.name, hubB, b, hubB.station, b.station);
        steps.push(s3.step); total += s3.minutes;
      }

      header.append(el("p", "stop-meta", "跨城市移動，建議先到 " + hubA.station + "，再前往 " + hubB.name + "。"));
      header.append(el("p", "plan-total", "交通時間合計 " + formatMinutes(total) + "（估算）"));
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
      tipCard.append(el("h3", "stop-name", r.name), el("p", "leg-detail", r.transportTip));
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
  // 初始化
  // ---------------------------------------------------------------
  renderPlanFilters();
  updatePlans();
  onRegionChange();
  renderGuide();
})();
