// 交換禮物抽籤機：抽籤邏輯測試（在 lottery/ 資料夾執行 node --test）
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

// 可重現的亂數，方便測試
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

test("號碼範圍：起訖都包含在內", () => {
  const r = L.buildNumbers(1, 5, "");
  assert.equal(r.ok, true);
  assert.deepEqual(r.numbers, [1, 2, 3, 4, 5]);
});

test("排除號碼：支援逗號、頓號、空白與範圍", () => {
  const r = L.buildNumbers(1, 12, "3、5-7, 10 ～ 11");
  assert.deepEqual(r.numbers, [1, 2, 4, 8, 9, 12]);
});

test("輸入錯誤時回傳中文說明", () => {
  assert.equal(L.buildNumbers(5, 1, "").ok, false);
  assert.equal(L.buildNumbers(1.5, 3, "").ok, false);
  assert.equal(L.buildNumbers(1, 2000, "").ok, false);
  assert.match(L.buildNumbers(1, 5, "abc").error, /abc/);
  assert.equal(L.buildNumbers(1, 3, "1-3").ok, false);
});

test("抽完全部號碼：每個號碼剛好出現一次", () => {
  const rng = seeded(42);
  let pool = L.buildNumbers(1, 30, "").numbers;
  const drawn = [];
  while (pool.length) {
    const r = L.drawFrom(pool, rng);
    drawn.push(r.number);
    pool = r.rest;
  }
  assert.equal(L.drawFrom(pool, rng), null);
  assert.deepEqual(drawn.slice().sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i + 1));
});

test("抽籤結果大致平均（每個號碼都有機會第一個被抽到）", () => {
  const rng = seeded(7);
  const counts = new Map();
  for (let i = 0; i < 6000; i++) {
    const n = L.drawFrom([1, 2, 3, 4, 5, 6], rng).number;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  for (const n of [1, 2, 3, 4, 5, 6]) assert.ok(counts.get(n) > 800 && counts.get(n) < 1200, n + "：" + counts.get(n));
});

test("各自點號碼抽：只剩自己的禮物時回傳 null（畫面不會讓這種情況發生）", () => {
  assert.equal(L.drawForDrawer([1], 1, [], Math.random), null);
});

test("各自點號碼抽（順序不限）：任何人數、任何順序都不會抽到自己，也不會卡住", () => {
  for (let size = 2; size <= 30; size++) {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = seeded(seed * 1000 + size);
      const numbers = Array.from({ length: size }, (_, i) => i + 1);
      let pool = numbers.slice();
      let waiting = L.shuffle(numbers, rng); // 隨機的抽籤順序
      const got = new Map();
      while (waiting.length) {
        const drawer = waiting[0];
        waiting = waiting.slice(1);
        const r = L.drawForDrawer(pool, drawer, waiting, rng);
        assert.ok(r, "卡住了：" + size + " 人，種子 " + seed);
        assert.notEqual(r.number, drawer);
        got.set(drawer, r.number);
        pool = r.rest;
      }
      assert.equal(pool.length, 0);
      assert.deepEqual([...got.values()].sort((a, b) => a - b), numbers);
    }
  }
});

test("各自點號碼抽：倒數第二人一定會抽走最後一人的禮物", () => {
  // 剩 2 號、3 號兩份禮物，1 號先抽、3 號最後抽：1 號只能抽 3 號，3 號才不會抽到自己
  const r = L.drawForDrawer([2, 3], 1, [3], () => 0);
  assert.equal(r.number, 3);
  assert.deepEqual(r.rest, [2]);
});

test("各自點號碼抽：抽籤結果大致平均", () => {
  const rng = seeded(99);
  const counts = new Map();
  for (let i = 0; i < 5000; i++) {
    const n = L.drawForDrawer([1, 2, 3, 4, 5, 6], 1, [2, 3, 4, 5, 6], rng).number;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  assert.equal(counts.has(1), false);
  for (const n of [2, 3, 4, 5, 6]) assert.ok(counts.get(n) > 850 && counts.get(n) < 1150, n + "：" + counts.get(n));
});
