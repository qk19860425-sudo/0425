// 旅遊指南裡的「出國清單」：可以勾選、可以自己加項目，勾選狀態只存在這支手機（localStorage）。
// 每個國家各有一份清單（共通項目＋該國專屬項目），互不影響。
(function (root) {
  "use strict";

  // 共通項目：id 不要改，改了之前的勾選會對不上
  const COMMON = [
    { group: "證件與預訂", emoji: "🛂", items: [
      { id: "passport", text: "護照（效期還有 6 個月以上）" },
      { id: "ticket", text: "機票／電子機票（截圖存手機）" },
      { id: "hotel", text: "住宿訂房資料" },
      { id: "insurance", text: "旅遊平安險、不便險" },
      { id: "photocopy", text: "護照影本或照片（和正本分開放）" },
    ] },
    { group: "錢與卡", emoji: "💴", items: [
      { id: "cash", text: "外幣現金（先換一些）" },
      { id: "credit", text: "信用卡（帶 2 張不同發卡組織）" },
      { id: "atm", text: "提款卡已開通海外提款" },
      { id: "wallet", text: "零錢包" },
    ] },
    { group: "手機與電子", emoji: "📱", items: [
      { id: "phone", text: "手機與充電線" },
      { id: "powerbank", text: "行動電源（只能放隨身行李）" },
      { id: "sim", text: "eSIM／網卡／Wi-Fi 分享器" },
      { id: "earphone", text: "耳機" },
    ] },
    { group: "衣物", emoji: "👕", items: [
      { id: "clothes", text: "換洗衣物" },
      { id: "shoes", text: "好走的鞋" },
      { id: "jacket", text: "外套（看當地天氣）" },
      { id: "umbrella", text: "折傘或雨衣" },
      { id: "pajamas", text: "睡衣" },
    ] },
    { group: "盥洗與藥品", emoji: "💊", items: [
      { id: "medicine", text: "個人長期用藥" },
      { id: "firstaid", text: "常備藥（感冒、腸胃、止痛、OK 繃）" },
      { id: "toiletries", text: "牙刷、保養品、隱形眼鏡" },
      { id: "liquids", text: "隨身液體每瓶 100ml 以下、裝進透明袋" },
    ] },
    { group: "出發前", emoji: "✅", items: [
      { id: "weather", text: "查好當地天氣" },
      { id: "offline-map", text: "下載離線地圖與翻譯 App" },
      { id: "family", text: "把行程告訴家人" },
      { id: "home", text: "關好門窗、瓦斯、電源" },
    ] },
  ];

  // 各國專屬項目（入境規定常調整，出發前請再到官網確認）
  const BY_COUNTRY = {
    jp: { group: "日本專屬", emoji: "🗾", items: [
      { id: "jp-vjw", text: "Visit Japan Web 填好入境資料（拿到 QR Code）" },
      { id: "jp-ic", text: "Suica／ICOCA 加進手機錢包或買實體卡" },
      { id: "jp-coins", text: "日幣零錢包（日本常用硬幣）" },
      { id: "jp-tax", text: "退稅帶護照正本" },
    ] },
    kr: { group: "韓國專屬", emoji: "🇰🇷", items: [
      { id: "kr-entry", text: "確認入境規定（K-ETA、入境卡）" },
      { id: "kr-plug", text: "轉接頭（韓國 220V 圓孔插座）" },
      { id: "kr-tmoney", text: "T-money 卡" },
      { id: "kr-map", text: "下載 Naver Map 或 KakaoMap" },
    ] },
    id: { group: "印尼專屬", emoji: "🇮🇩", items: [
      { id: "id-voa", text: "電子落地簽 e-VOA（出發前確認規定）" },
      { id: "id-levy", text: "峇里島觀光稅（Love Bali）" },
      { id: "id-plug", text: "轉接頭（印尼 230V 圓孔插座）" },
      { id: "id-mosquito", text: "防蚊液、防曬乳" },
      { id: "id-ride", text: "下載 Grab 或 Gojek" },
    ] },
  };

  function groupsFor(country) {
    return BY_COUNTRY[country] ? [BY_COUNTRY[country], ...COMMON] : COMMON.slice();
  }

  // 狀態：{ checked: { id: true }, custom: [{ id, text }] }
  function emptyState() {
    return { checked: {}, custom: [] };
  }

  function normalize(raw) {
    const s = emptyState();
    if (!raw || typeof raw !== "object") return s;
    if (raw.checked && typeof raw.checked === "object") {
      for (const [k, v] of Object.entries(raw.checked)) if (v === true) s.checked[k] = true;
    }
    if (Array.isArray(raw.custom)) {
      for (const c of raw.custom) {
        if (c && typeof c.id === "string" && typeof c.text === "string" && c.text.trim()) {
          s.custom.push({ id: c.id, text: c.text.trim().slice(0, 60) });
        }
      }
    }
    return s;
  }

  function allIds(country, state) {
    return [...groupsFor(country).flatMap((g) => g.items.map((i) => i.id)), ...state.custom.map((c) => c.id)];
  }

  function progress(country, state) {
    const ids = allIds(country, state);
    const done = ids.filter((id) => state.checked[id]).length;
    return { done, total: ids.length };
  }

  function addCustom(state, text, now) {
    const t = String(text || "").trim().slice(0, 60);
    if (!t) return null;
    if (state.custom.some((c) => c.text === t)) return null;
    const item = { id: "c-" + (now || Date.now()).toString(36) + "-" + state.custom.length, text: t };
    state.custom.push(item);
    return item;
  }

  function removeCustom(state, id) {
    state.custom = state.custom.filter((c) => c.id !== id);
    delete state.checked[id];
  }

  // ---------------------------------------------------------------
  // 畫面
  // ---------------------------------------------------------------
  const KEY = (country) => "travel-checklist-" + country;
  const OPEN_KEY = "travel-checklist-open";

  function load(country) {
    try { return normalize(JSON.parse(localStorage.getItem(KEY(country)) || "null")); } catch (e) { return emptyState(); }
  }
  function save(country, state) {
    try { localStorage.setItem(KEY(country), JSON.stringify(state)); } catch (e) { /* 無法儲存時，這次開啟仍可勾選 */ }
  }

  function h(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  let seq = 0;
  function build(country, countryName) {
    const state = load(country);
    const det = h("details", "card guide-section checklist");
    let open = true;
    try { open = localStorage.getItem(OPEN_KEY) !== "0"; } catch (e) { open = true; }
    det.open = open;
    det.addEventListener("toggle", () => {
      try { localStorage.setItem(OPEN_KEY, det.open ? "1" : "0"); } catch (e) { /* 忽略 */ }
    });

    const summary = h("summary", "guide-summary checklist-summary");
    const sumText = h("span", "", "🧳 出國清單" + (countryName ? "（" + countryName + "）" : ""));
    const sumCount = h("span", "checklist-count");
    summary.append(sumText, sumCount);
    det.append(summary);

    const bar = h("div", "checklist-bar");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", "準備進度");
    bar.setAttribute("aria-valuemin", "0");
    const fill = h("div", "checklist-fill");
    bar.append(fill);
    const status = h("p", "checklist-status");
    status.setAttribute("aria-live", "polite");
    det.append(bar, status);

    const body = h("div", "checklist-body");
    det.append(body);

    function updateProgress() {
      const { done, total } = progress(country, state);
      sumCount.textContent = done + "／" + total;
      bar.setAttribute("aria-valuemax", String(total));
      bar.setAttribute("aria-valuenow", String(done));
      fill.style.width = (total ? Math.round(done / total * 100) : 0) + "%";
      status.textContent = done === total && total > 0 ? "🎉 全部準備好了，出發吧！" : "已準備 " + done + " 項，還差 " + (total - done) + " 項。";
      det.classList.toggle("checklist-done", done === total && total > 0);
    }

    function itemRow(item, removable) {
      const li = h("li", "checklist-item");
      const id = "chk-" + (++seq);
      const box = document.createElement("input");
      box.type = "checkbox";
      box.id = id;
      box.checked = !!state.checked[item.id];
      const label = h("label", "", item.text);
      label.htmlFor = id;
      box.addEventListener("change", () => {
        if (box.checked) state.checked[item.id] = true;
        else delete state.checked[item.id];
        save(country, state);
        updateProgress();
      });
      li.append(box, label);
      if (removable) {
        const del = h("button", "checklist-del", "✕");
        del.type = "button";
        del.setAttribute("aria-label", "刪除「" + item.text + "」");
        del.addEventListener("click", () => {
          removeCustom(state, item.id);
          save(country, state);
          render();
        });
        li.append(del);
      }
      return li;
    }

    function render() {
      const parts = [];
      for (const g of groupsFor(country)) {
        parts.push(h("h3", "checklist-group", g.emoji + " " + g.group));
        const ul = h("ul", "checklist-list");
        ul.append(...g.items.map((i) => itemRow(i, false)));
        parts.push(ul);
      }
      parts.push(h("h3", "checklist-group", "✏️ 我自己加的"));
      if (state.custom.length) {
        const ul = h("ul", "checklist-list");
        ul.append(...state.custom.map((i) => itemRow(i, true)));
        parts.push(ul);
      }

      const form = h("form", "checklist-add");
      const inputId = "chk-new-" + (++seq);
      const lab = h("label", "visually-hidden", "新增項目");
      lab.htmlFor = inputId;
      const input = document.createElement("input");
      input.id = inputId;
      input.type = "text";
      input.maxLength = 60;
      input.enterKeyHint = "done";
      input.placeholder = "例如：自拍棒、伴手禮清單";
      const add = h("button", "button button-small", "加入");
      add.type = "submit";
      const err = h("p", "checklist-error");
      err.setAttribute("role", "alert");
      err.hidden = true;
      form.append(lab, input, add);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) { err.textContent = "請先輸入要加入的項目。"; err.hidden = false; input.focus(); return; }
        if (!addCustom(state, text)) { err.textContent = "清單裡已經有「" + text + "」了。"; err.hidden = false; input.focus(); return; }
        save(country, state);
        render();
        const next = body.querySelector(".checklist-add input");
        if (next) next.focus();
      });
      parts.push(form, err);

      const reset = h("button", "button button-secondary button-small checklist-reset", "全部取消勾選");
      reset.type = "button";
      reset.addEventListener("click", () => {
        if (!Object.keys(state.checked).length) return;
        if (!confirm("要把清單的勾選全部取消嗎？（自己加的項目會保留）")) return;
        state.checked = {};
        save(country, state);
        render();
      });
      parts.push(reset);

      body.replaceChildren(...parts);
      updateProgress();
    }

    render();
    return det;
  }

  const api = { groupsFor, normalize, progress, addCustom, removeCustom, emptyState, build };
  root.TravelChecklist = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
