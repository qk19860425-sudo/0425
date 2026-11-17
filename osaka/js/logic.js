// 大阪旅遊：純邏輯（排序、篩選、格式化），不碰畫面，方便測試。
// 瀏覽器中掛在 window.OsakaLogic；Node.js 測試中用 require() 載入。
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OsakaLogic = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 機場交通：依目的地篩選後排序
  //   sortBy = "fare"（費用低到高，同價時快的在前）或 "time"（時間短到長，同時間時便宜的在前）
  function sortTransport(options, destination, sortBy) {
    const list = options.filter((o) => o.destination === destination);
    const byFare = (a, b) => a.fareMin - b.fareMin || a.fareMax - b.fareMax;
    const byTime = (a, b) => a.minutes - b.minutes;
    return list.slice().sort(sortBy === "time"
      ? (a, b) => byTime(a, b) || byFare(a, b)
      : (a, b) => byFare(a, b) || byTime(a, b));
  }

  // 景點：area 為空字串表示不限；types 為空陣列表示不限，否則需符合任一類型
  function filterSpots(items, area, types) {
    return items.filter((s) =>
      (!area || s.area === area) &&
      (!types.length || types.some((t) => s.types.includes(t))));
  }

  // 美食：area、cuisine 為空字串表示不限；prices 為空陣列表示不限
  function filterFood(items, area, cuisine, prices) {
    return items.filter((f) =>
      (!area || f.area === area) &&
      (!cuisine || f.cuisine === cuisine) &&
      (!prices.length || prices.includes(f.price)));
  }

  function formatYen(n) {
    return n.toLocaleString("en-US");
  }

  function formatFare(o) {
    return o.fareMin === o.fareMax
      ? "約 " + formatYen(o.fareMin) + " 日圓"
      : "約 " + formatYen(o.fareMin) + "–" + formatYen(o.fareMax) + " 日圓";
  }

  function formatMinutes(min) {
    if (min < 60) return "約 " + min + " 分鐘";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return "約 " + h + " 小時" + (m ? " " + m + " 分鐘" : "");
  }

  function formatTransfers(n) {
    return n === 0 ? "直達" : "轉乘 " + n + " 次";
  }

  function mapUrl(query) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  }

  // 資料檢查：回傳問題清單（空陣列表示沒問題），開發與測試時用
  function validateData(data) {
    const problems = [];
    const t = data.transport;
    const destIds = new Set(t.destinations.map((d) => d.id));
    for (const o of t.options) {
      if (!destIds.has(o.destination)) problems.push("交通 " + o.id + "：未知的目的地 " + o.destination);
      if (!(o.fareMin > 0 && o.fareMax >= o.fareMin)) problems.push("交通 " + o.id + "：費用不正確");
      if (!(o.minutes > 0)) problems.push("交通 " + o.id + "：時間不正確");
      if (!/^https:\/\//.test(o.officialUrl)) problems.push("交通 " + o.id + "：缺少官方連結");
    }
    for (const s of data.spots.items) {
      if (!data.spots.areas.includes(s.area)) problems.push("景點 " + s.id + "：未知的區域 " + s.area);
      for (const ty of s.types) if (!data.spots.types.includes(ty)) problems.push("景點 " + s.id + "：未知的類型 " + ty);
    }
    const levels = data.food.priceLevels.map((p) => p.level);
    for (const f of data.food.items) {
      if (!data.food.areas.includes(f.area)) problems.push("美食 " + f.id + "：未知的區域 " + f.area);
      if (!data.food.cuisines.includes(f.cuisine)) problems.push("美食 " + f.id + "：未知的料理類型 " + f.cuisine);
      if (!levels.includes(f.price)) problems.push("美食 " + f.id + "：未知的價位 " + f.price);
    }
    const ids = [...t.options, ...data.spots.items, ...data.food.items].map((x) => x.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) problems.push("重複的 id：" + [...new Set(dup)].join("、"));
    return problems;
  }

  return { sortTransport, filterSpots, filterFood, formatYen, formatFare, formatMinutes, formatTransfers, mapUrl, validateData };
});
