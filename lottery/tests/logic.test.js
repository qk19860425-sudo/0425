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

test("不能抽到自己的號碼：任何人數都不會抽到自己，且號碼不重複", () => {
  for (let size = 2; size <= 40; size++) {
    for (let seed = 1; seed <= 30; seed++) {
      const numbers = Array.from({ length: size }, (_, i) => i + 1);
      const p = L.derangement(numbers, seeded(seed * 100 + size));
      assert.equal(p.length, size);
      assert.ok(p.every((x, i) => x !== numbers[i]), "有人抽到自己：" + p.join(","));
      assert.deepEqual(p.slice().sort((a, b) => a - b), numbers);
    }
  }
});

test("不能抽到自己的號碼：亂數一直很差時也不會失敗", () => {
  const numbers = [1, 2, 3, 4, 5];
  const p = L.derangement(numbers, () => 0.999999);
  assert.ok(p.every((x, i) => x !== numbers[i]));
  assert.deepEqual(p.slice().sort((a, b) => a - b), numbers);
});

test("只有 1 個號碼時不能使用「不能抽到自己」", () => {
  assert.equal(L.derangement([1], Math.random), null);
});
