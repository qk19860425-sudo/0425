// 日本哆啦A夢景點與販售地點：依關鍵字、類型、地區搜尋
(function () {
  "use strict";

  const shops = window.DORA_SHOPS || [];
  const closed = window.DORA_CLOSED || [];
  const $ = (id) => document.getElementById(id);

  $("shops-updated").textContent = window.DORA_SHOPS_UPDATED || "";

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

  // 畫面上正在選的條件（按「確定搜尋」才套用）
  const state = { type: "", area: "" };
  const types = [...new Set(shops.flatMap((s) => s.types))];
  const areas = [...new Set(shops.map((s) => s.area))];

  function markPending() { $("shop-pending").hidden = false; }

  function renderChips(boxId, values, key, countFn) {
    const options = [{ id: "", label: "全部" }].concat(values.map((v) => ({ id: v, label: v + "（" + countFn(v) + "）" })));
    $(boxId).replaceChildren(...options.map((o) => {
      const b = el("button", "chip", o.label);
      b.type = "button";
      b.setAttribute("aria-pressed", String(state[key] === o.id));
      b.addEventListener("click", () => { state[key] = o.id; renderFilters(); markPending(); });
      return b;
    }));
  }

  function renderFilters() {
    renderChips("shop-types", types, "type", (t) => shops.filter((s) => s.types.includes(t)).length);
    renderChips("shop-areas", areas, "area", (a) => shops.filter((s) => s.area === a).length);
  }

  function renderCard(shop) {
    const li = el("li", "card shop");
    const head = el("div", "shop-head");
    head.append(el("h3", "shop-name", shop.name), el("span", "badge", shop.kind));
    li.append(head);
    if (shop.status) li.append(el("p", "shop-status", shop.status));
    li.append(el("p", "shop-desc", shop.description));

    const dl = el("dl", "shop-info");
    dl.append(el("dt", "", "地區"), el("dd", "", shop.area));
    dl.append(el("dt", "", "地址"), el("dd", "", shop.address));
    dl.append(el("dt", "", "交通"), el("dd", "", shop.access));
    dl.append(el("dt", "", "時間"), el("dd", "", shop.hours));
    li.append(dl);

    li.append(link("Google 地圖", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(shop.mapQuery), "button button-secondary"));

    const src = el("p", "source", "資料來源：");
    src.append(link(shop.source.title, shop.source.url));
    li.append(src);
    return li;
  }

  function normalize(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, "");
  }

  function update() {
    $("shop-pending").hidden = true;
    const words = $("shop-keyword").value.trim().split(/\s+/).filter(Boolean).map(normalize);
    const result = shops.filter((s) => {
      if (state.type && !s.types.includes(state.type)) return false;
      if (state.area && s.area !== state.area) return false;
      const hay = normalize([s.name, s.kind, s.area, s.address, s.access, s.description, s.types.join(" ")].join(" "));
      return words.every((w) => hay.includes(w));
    });
    $("shop-list").replaceChildren(...result.map(renderCard));
    $("shop-empty").hidden = result.length > 0;
    $("shop-count").textContent = "找到 " + result.length + " 個地點（共 " + shops.length + " 個）";
  }

  $("shop-keyword").addEventListener("input", markPending);

  $("shop-form").addEventListener("submit", (e) => {
    e.preventDefault();
    $("shop-keyword").blur();
    update();
    $("shop-count").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("shop-reset").addEventListener("click", () => {
    $("shop-keyword").value = "";
    state.type = "";
    state.area = "";
    renderFilters();
    update();
  });

  function renderClosed() {
    const box = $("closed");
    if (!closed.length) { box.hidden = true; return; }
    box.append(el("h3", "shop-name", "已經結束的地點"));
    const ul = el("ul", "closed-list");
    for (const c of closed) {
      const li = el("li");
      li.append(el("strong", "", c.name), "：" + c.note + "（", link(c.source.title, c.source.url), "）");
      ul.append(li);
    }
    box.append(ul);
  }

  renderFilters();
  update();
  renderClosed();
})();
