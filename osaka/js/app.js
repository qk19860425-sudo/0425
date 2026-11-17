// 大阪旅遊：畫面（首頁、機場交通、景點、美食）
// 資料來自 data/*.js，邏輯來自 js/logic.js；這裡只負責顯示與操作。
(function () {
  "use strict";

  const DATA = window.OSAKA_DATA || {};
  const L = window.OsakaLogic;
  const $ = (id) => document.getElementById(id);

  // ---------- 小工具 ----------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function extLink(text, href, className) {
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

  function infoList(rows) {
    const dl = el("dl", "info");
    for (const [k, v] of rows) dl.append(el("dt", "", k), el("dd", "", v));
    return dl;
  }

  // 開發時檢查資料格式，有問題就顯示在畫面上
  const problems = L.validateData(DATA);
  if (problems.length) {
    const box = $("data-problems");
    box.hidden = false;
    box.textContent = "資料格式有問題：" + problems.join("；");
  }

  // ---------- 頁面切換（網址 #/transport、#/spots、#/food） ----------
  const PAGES = ["home", "transport", "spots", "food"];
  const TITLES = { home: "大阪旅遊", transport: "機場交通", spots: "景點", food: "美食" };

  function route() {
    const name = (location.hash.replace(/^#\/?/, "") || "home");
    const page = PAGES.includes(name) ? name : "home";
    for (const p of PAGES) $("page-" + p).hidden = p !== page;
    $("back").hidden = page === "home";
    $("page-title").textContent = TITLES[page];
    document.title = page === "home" ? "大阪旅遊" : TITLES[page] + "｜大阪旅遊";
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  $("back").addEventListener("click", () => { location.hash = "#/"; });

  // ---------- 機場交通 ----------
  const transportState = { destination: DATA.transport.destinations[0].id, sortBy: "fare" };

  function renderTransportControls() {
    $("dest-chips").replaceChildren(...DATA.transport.destinations.map((d) =>
      chip(d.name, d.id === transportState.destination, () => {
        transportState.destination = d.id;
        renderTransportControls();
        renderTransport();
      })));
    $("sort-chips").replaceChildren(
      chip("費用低到高", transportState.sortBy === "fare", () => { transportState.sortBy = "fare"; renderTransportControls(); renderTransport(); }),
      chip("時間短到長", transportState.sortBy === "time", () => { transportState.sortBy = "time"; renderTransportControls(); renderTransport(); })
    );
  }

  function renderTransport() {
    const dest = DATA.transport.destinations.find((d) => d.id === transportState.destination);
    const list = L.sortTransport(DATA.transport.options, transportState.destination, transportState.sortBy);
    $("transport-summary").textContent = DATA.transport.airport + " → " + dest.name + "（" + dest.note + "），共 " + list.length + " 種方式";

    $("transport-list").replaceChildren(...list.map((o, i) => {
      const card = el("li", "card option");
      const head = el("div", "card-head");
      head.append(el("span", "mode mode-" + o.mode, o.mode), el("h3", "card-title", o.name));
      if (i === 0) head.append(el("span", "badge", transportState.sortBy === "fare" ? "最便宜" : "最快"));
      card.append(head);

      const stats = el("div", "stats");
      stats.append(
        stat("費用", L.formatFare(o)),
        stat("時間", L.formatMinutes(o.minutes)),
        stat("轉乘", L.formatTransfers(o.transfers))
      );
      card.append(stats);

      card.append(infoList([["上車", o.board], ["下車", o.alight]]));
      const ol = el("ol", "steps");
      for (const s of o.steps) ol.append(el("li", "", s));
      card.append(ol);
      if (o.note) card.append(el("p", "note", o.note));
      card.append(extLink("官方查詢：" + o.officialName, o.officialUrl, "button button-secondary"));
      return card;
    }));
  }

  function stat(label, value) {
    const box = el("div", "stat");
    box.append(el("span", "stat-label", label), el("strong", "stat-value", value));
    return box;
  }

  // ---------- 景點 ----------
  const spotsState = { area: "", types: new Set() };

  function renderSpotFilters() {
    $("spot-areas").replaceChildren(
      chip("全部", spotsState.area === "", () => { spotsState.area = ""; renderSpotFilters(); markPending("spots"); }),
      ...DATA.spots.areas.map((a) => chip(a, spotsState.area === a, () => { spotsState.area = a; renderSpotFilters(); markPending("spots"); }))
    );
    $("spot-types").replaceChildren(...DATA.spots.types.map((t) => chip(t, spotsState.types.has(t), () => {
      if (spotsState.types.has(t)) spotsState.types.delete(t); else spotsState.types.add(t);
      renderSpotFilters(); markPending("spots");
    })));
  }

  function renderSpots() {
    $("spots-pending").hidden = true;
    const list = L.filterSpots(DATA.spots.items, spotsState.area, [...spotsState.types]);
    $("spots-count").textContent = "找到 " + list.length + " 個景點（共 " + DATA.spots.items.length + " 個）";
    $("spots-empty").hidden = list.length > 0;
    $("spots-list").replaceChildren(...list.map((s) => {
      const card = el("li", "card");
      const head = el("div", "card-head");
      head.append(el("h3", "card-title", s.name), el("span", "area", s.area));
      const tags = el("div", "tags");
      for (const t of s.types) tags.append(el("span", "tag", t));
      card.append(head, tags, el("p", "intro", s.intro),
        infoList([["地址", s.address], ["營業時間", s.hours], ["門票", s.ticket]]),
        extLink("在 Google 地圖開啟", L.mapUrl(s.mapQuery), "button button-secondary"));
      return card;
    }));
  }

  // ---------- 美食 ----------
  const foodState = { area: "", cuisine: "", prices: new Set() };

  function renderFoodFilters() {
    $("food-areas").replaceChildren(
      chip("全部", foodState.area === "", () => { foodState.area = ""; renderFoodFilters(); markPending("food"); }),
      ...DATA.food.areas.map((a) => chip(a, foodState.area === a, () => { foodState.area = a; renderFoodFilters(); markPending("food"); }))
    );
    $("food-cuisines").replaceChildren(
      chip("全部", foodState.cuisine === "", () => { foodState.cuisine = ""; renderFoodFilters(); markPending("food"); }),
      ...DATA.food.cuisines.map((c) => chip(c, foodState.cuisine === c, () => { foodState.cuisine = c; renderFoodFilters(); markPending("food"); }))
    );
    $("food-prices").replaceChildren(...DATA.food.priceLevels.map((p) => chip(p.label + "（" + p.note + "）", foodState.prices.has(p.level), () => {
      if (foodState.prices.has(p.level)) foodState.prices.delete(p.level); else foodState.prices.add(p.level);
      renderFoodFilters(); markPending("food");
    })));
  }

  function renderFood() {
    $("food-pending").hidden = true;
    const list = L.filterFood(DATA.food.items, foodState.area, foodState.cuisine, [...foodState.prices]);
    $("food-count").textContent = "找到 " + list.length + " 家（共 " + DATA.food.items.length + " 家）";
    $("food-empty").hidden = list.length > 0;
    const priceLabel = (lv) => (DATA.food.priceLevels.find((p) => p.level === lv) || {}).label || "";
    $("food-list").replaceChildren(...list.map((f) => {
      const card = el("li", "card");
      const head = el("div", "card-head");
      head.append(el("h3", "card-title", f.name), el("span", "area", f.area));
      const tags = el("div", "tags");
      tags.append(el("span", "tag", f.cuisine), el("span", "tag tag-price", priceLabel(f.price)));
      card.append(head, tags,
        infoList([["推薦", f.dishes.join("、")], ["預算", f.budget], ["地址", f.address], ["營業時間", f.hours]]),
        extLink("在 Google 地圖搜尋附近店家", L.mapUrl(f.mapQuery), "button button-secondary"));
      return card;
    }));
  }

  // ---------- 篩選的「確定」與「清除」 ----------
  function markPending(page) { $(page + "-pending").hidden = false; }

  $("spots-form").addEventListener("submit", (e) => { e.preventDefault(); renderSpots(); $("spots-count").scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("spots-reset").addEventListener("click", () => { spotsState.area = ""; spotsState.types.clear(); renderSpotFilters(); renderSpots(); });
  $("food-form").addEventListener("submit", (e) => { e.preventDefault(); renderFood(); $("food-count").scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("food-reset").addEventListener("click", () => { foodState.area = ""; foodState.cuisine = ""; foodState.prices.clear(); renderFoodFilters(); renderFood(); });

  // ---------- 初始化 ----------
  $("home-counts-transport").textContent = DATA.transport.options.length + " 種方式";
  $("home-counts-spots").textContent = DATA.spots.items.length + " 個景點";
  $("home-counts-food").textContent = DATA.food.items.length + " 家店";
  renderTransportControls();
  renderTransport();
  renderSpotFilters();
  renderSpots();
  renderFoodFilters();
  renderFood();
  route();
})();
