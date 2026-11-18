// 交換禮物抽籤機：抽籤邏輯（不碰畫面，可在 Node 直接測試）
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Lottery = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 一次最多幾個號碼（避免輸錯成 1–100000 時畫面卡住）
  const MAX_COUNT = 500;

  // 把「3, 5-7、10」這類文字轉成號碼清單；看不懂的片段放進 errors
  function parseExcludes(text) {
    const numbers = new Set();
    const errors = [];
    // 「10 ～ 11」這種中間有空白的範圍先合併，再依逗號、頓號、空白切開；全形數字轉半形
    const normalized = String(text || "")
      .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
      .replace(/\s*([-~～－])\s*/g, "$1");
    const tokens = normalized.split(/[,，、\s]+/).filter(Boolean);
    for (const token of tokens) {
      const range = token.match(/^(\d+)\s*[-~～－]\s*(\d+)$/);
      if (range) {
        let a = Number(range[1]);
        let b = Number(range[2]);
        if (a > b) [a, b] = [b, a];
        if (b - a > MAX_COUNT) { errors.push(token); continue; }
        for (let n = a; n <= b; n++) numbers.add(n);
      } else if (/^\d+$/.test(token)) {
        numbers.add(Number(token));
      } else {
        errors.push(token);
      }
    }
    return { numbers, errors };
  }

  // 依起訖號碼與排除號碼產生要抽的號碼（由小到大）
  function buildNumbers(start, end, excludesText) {
    const s = Number(start);
    const e = Number(end);
    if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e < 0) {
      return { ok: false, error: "起始號碼和結束號碼請輸入 0 以上的整數。" };
    }
    if (s > e) return { ok: false, error: "起始號碼不能比結束號碼大。" };
    if (e - s + 1 > MAX_COUNT) return { ok: false, error: "一次最多 " + MAX_COUNT + " 個號碼。" };
    const { numbers: excluded, errors } = parseExcludes(excludesText);
    if (errors.length) {
      return { ok: false, error: "看不懂這些排除號碼：" + errors.join("、") + "。請用逗號分開，例如「3, 7, 10-12」。" };
    }
    const numbers = [];
    for (let n = s; n <= e; n++) if (!excluded.has(n)) numbers.push(n);
    if (!numbers.length) return { ok: false, error: "排除之後沒有號碼可以抽了。" };
    return { ok: true, numbers };
  }

  // rng() 回傳 0 以上、小於 1 的亂數
  function randomIndex(n, rng) {
    return Math.min(n - 1, Math.floor(rng() * n));
  }

  function shuffle(list, rng) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1, rng);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 從號碼池抽一個，回傳抽到的號碼與剩下的號碼池
  function drawFrom(pool, rng) {
    if (!pool.length) return null;
    const i = randomIndex(pool.length, rng);
    return { number: pool[i], rest: pool.slice(0, i).concat(pool.slice(i + 1)) };
  }

  // 交換禮物：drawer 號的人來抽，不能抽到自己的號碼，順序不限。
  // pool：還沒被抽走的禮物號碼；waiting：還沒抽、而且不是 drawer 本人的人。
  // 只有一種情況會讓後面的人卡住：最後只剩一個人，而剩下的禮物剛好是他自己的。
  // 所以倒數第二個人抽時，如果最後那個人的禮物還在，就一定要抽走它。
  // （人數 2 個以上時，每個人至少有一個不是自己的禮物可選，一定排得完。）
  function drawForDrawer(pool, drawer, waiting, rng) {
    let choices = pool.filter((n) => n !== drawer);
    if (!choices.length) return null;
    if (waiting.length === 1 && pool.length === 2) {
      const last = waiting[0];
      if (choices.includes(last)) choices = [last];
    }
    const number = choices[randomIndex(choices.length, rng)];
    return { number, rest: pool.filter((n) => n !== number) };
  }

  return { MAX_COUNT, parseExcludes, buildNumbers, shuffle, drawFrom, drawForDrawer };
});
