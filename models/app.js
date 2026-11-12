// 日韓台模型玩具店搜尋：篩選、清單與地圖
(function () {
  "use strict";

  const shops = Array.isArray(window.SHOPS) ? window.SHOPS : [];
  const TYPE_ORDER = ["鋼彈模型", "比例模型", "鐵道模型", "模型車・迷你四驅", "公仔・人偶", "二手・中古", "工具・塗料"];

  const filterForm = document.getElementById("filters");
  const pending = document.getElementById("pending");
  const keywordInput = document.getElementById("keyword");
  const countrySelect = document.getElementById("country");
  const areaSelect = document.getElementById("area");
  const chipBox = document.getElementById("type-chips");
  const resetButton = document.getElementById("reset");
  const resultCount = document.getElementById("result-count");
  const list = document.getElementById("shop-list");
  const empty = document.getElementById("empty");

  document.getElementById("updated").textContent = window.SHOPS_UPDATED || "";

  const selectedTypes = new Set();

  // ---- 建立篩選選項：國家 → 城市 ----
  const COUNTRY_ORDER = ["日本", "韓國", "台灣"];
  const countries = COUNTRY_ORDER.filter((c) => shops.some((s) => s.country === c))
    .concat([...new Set(shops.map((s) => s.country))].filter((c) => !COUNTRY_ORDER.includes(c)));
  for (const c of countries) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c + "（" + shops.filter((s) => s.country === c).length + "）";
    countrySelect.append(opt);
  }

  // 城市選單依國家分組；選了國家就只列該國城市
  function fillCities() {
    const keep = areaSelect.value;
    const first = document.createElement("option");
    first.value = "";
    first.textContent = "全部城市";
    const groups = countries
      .filter((c) => !countrySelect.value || c === countrySelect.value)
      .map((c) => {
        const g = document.createElement("optgroup");
        g.label = c;
        for (const city of [...new Set(shops.filter((s) => s.country === c).map((s) => s.city))]) {
          const opt = document.createElement("option");
          opt.value = city;
          opt.textContent = city + "（" + shops.filter((s) => s.city === city).length + "）";
          g.append(opt);
        }
        return g;
      });
    areaSelect.replaceChildren(first, ...groups);
    areaSelect.value = [...areaSelect.options].some((o) => o.value === keep) ? keep : "";
  }
  fillCities();

  const usedTypes = new Set(shops.flatMap((s) => s.types));
  const types = TYPE_ORDER.filter((t) => usedTypes.has(t))
    .concat([...usedTypes].filter((t) => !TYPE_ORDER.includes(t)));
  for (const type of types) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = type;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      if (selectedTypes.has(type)) selectedTypes.delete(type);
      else selectedTypes.add(type);
      btn.setAttribute("aria-pressed", String(selectedTypes.has(type)));
      markPending();
    });
    chipBox.append(btn);
  }

  // ---- 地圖 ----
  let map = null;
  const markers = new Map();

  function initMap() {
    if (!window.L) {
      document.getElementById("map").hidden = true;
      document.getElementById("map-error").hidden = false;
      return;
    }
    map = L.map("map", { scrollWheelZoom: false }).setView([30.5, 132.5], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 貢獻者',
    }).addTo(map);

    for (const shop of shops) {
      const marker = L.circleMarker([shop.lat, shop.lng], {
        radius: 9, weight: 2, color: "#ffffff", fillColor: "#dc2626", fillOpacity: 0.9,
      });
      const popup = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = shop.name;
      const p = document.createElement("div");
      p.textContent = shop.country + "・" + shop.city + "・" + shop.station;
      const a = document.createElement("a");
      a.href = "#shop-" + shop.id;
      a.textContent = "看店家資料";
      a.addEventListener("click", (e) => {
        e.preventDefault();
        focusCard(shop.id);
      });
      popup.append(strong, p, a);
      marker.bindPopup(popup);
      markers.set(shop.id, marker);
    }
  }

  function focusCard(id) {
    const card = document.getElementById("shop-" + id);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("highlight");
    setTimeout(() => card.classList.remove("highlight"), 1600);
  }

  function showOnMap(shop) {
    if (!map) return;
    document.querySelector(".map-card").scrollIntoView({ behavior: "smooth", block: "start" });
    map.setView([shop.lat, shop.lng], 16);
    markers.get(shop.id).openPopup();
  }

  // ---- 清單 ----
  function googleMapsUrl(shop) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(shop.mapQuery);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderCard(shop) {
    const li = el("li", "card shop");
    li.id = "shop-" + shop.id;

    const head = el("div", "shop-head");
    head.append(el("h2", "shop-name", shop.name), el("span", "area-badge", shop.country + "・" + (shop.area === shop.city ? shop.city : shop.city + " " + shop.area)));

    const tags = el("div", "tags");
    for (const t of shop.types) tags.append(el("span", "tag", t));

    const dl = el("dl", "shop-info");
    dl.append(el("dt", "", "車站"), el("dd", "", shop.station));
    dl.append(el("dt", "", "地址"), el("dd", "", shop.address));

    const parts = [head, tags, el("p", "shop-desc", shop.description), dl];
    if (shop.note) parts.push(el("p", "shop-note", "注意：" + shop.note));

    const actions = el("div", "actions");
    const gmap = el("a", "button", "Google 地圖");
    gmap.href = googleMapsUrl(shop);
    gmap.target = "_blank";
    gmap.rel = "noopener noreferrer";
    actions.append(gmap);
    if (map) {
      const show = el("button", "button button-secondary", "在地圖上顯示");
      show.type = "button";
      show.addEventListener("click", () => showOnMap(shop));
      actions.append(show);
    }
    parts.push(actions);

    const src = el("p", "source");
    src.append("資料來源：");
    const a = el("a", "", shop.source.title);
    a.href = shop.source.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    src.append(a);
    parts.push(src);

    li.append(...parts);
    return li;
  }

  // ---- 篩選 ----
  function normalize(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, "");
  }

  function matches(shop, keyword, country, city) {
    if (country && shop.country !== country) return false;
    if (city && shop.city !== city) return false;
    for (const t of selectedTypes) {
      if (!shop.types.includes(t)) return false;
    }
    if (!keyword) return true;
    const hay = normalize([shop.name, shop.country, shop.city, shop.area, shop.station, shop.address, shop.description, shop.types.join(" ")].join(" "));
    return keyword.split(/\s+/).filter(Boolean).every((k) => hay.includes(normalize(k)));
  }

  function update() {
    const keyword = keywordInput.value.trim();
    const result = shops.filter((s) => matches(s, keyword, countrySelect.value, areaSelect.value));

    pending.hidden = true;
    list.replaceChildren(...result.map(renderCard));
    empty.hidden = result.length > 0;
    resultCount.textContent = "找到 " + result.length + " 家（共 " + shops.length + " 家）";

    if (map) {
      for (const [id, marker] of markers) {
        if (result.some((s) => s.id === id)) marker.addTo(map);
        else marker.remove();
      }
      if (result.length === 1) {
        map.setView([result[0].lat, result[0].lng], 15);
      } else if (result.length > 1) {
        map.fitBounds(L.latLngBounds(result.map((s) => [s.lat, s.lng])), { padding: [30, 30], maxZoom: 15 });
      }
    }
  }

  // 條件改變時先不搜尋，等按下「確定搜尋」（或在關鍵字欄按 Enter）才套用。
  function markPending() {
    pending.hidden = false;
  }

  keywordInput.addEventListener("input", markPending);
  areaSelect.addEventListener("change", markPending);
  countrySelect.addEventListener("change", () => { fillCities(); markPending(); });

  filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    keywordInput.blur(); // 收起手機鍵盤
    update();
    resultCount.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  resetButton.addEventListener("click", () => {
    keywordInput.value = "";
    countrySelect.value = "";
    fillCities();
    areaSelect.value = "";
    selectedTypes.clear();
    for (const chip of chipBox.children) chip.setAttribute("aria-pressed", "false");
    update();
  });

  try {
    initMap();
  } catch (err) {
    map = null;
    document.getElementById("map").hidden = true;
    document.getElementById("map-error").hidden = false;
  }
  update();
})();
