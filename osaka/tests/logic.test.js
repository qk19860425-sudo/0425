// 大阪旅遊：邏輯與資料測試
// 執行方式（在 osaka/ 資料夾）：node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const L = require("../js/logic.js");

// 用和瀏覽器相同的方式載入 data/*.js（它們會寫入 window.OSAKA_DATA）
function loadData() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of ["transport.js", "spots.js", "food.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "data", f), "utf8"), sandbox);
  }
  return sandbox.window.OSAKA_DATA;
}
const DATA = loadData();

const opts = [
  { id: "a", destination: "x", fareMin: 1000, fareMax: 1000, minutes: 60 },
  { id: "b", destination: "x", fareMin: 500, fareMax: 700, minutes: 90 },
  { id: "c", destination: "x", fareMin: 500, fareMax: 600, minutes: 40 },
  { id: "d", destination: "y", fareMin: 100, fareMax: 100, minutes: 10 },
];

test("交通依費用排序：便宜在前，同價時便宜上限、再快的在前，只含所選目的地", () => {
  assert.deepEqual(L.sortTransport(opts, "x", "fare").map((o) => o.id), ["c", "b", "a"]);
});

test("交通依時間排序：快的在前", () => {
  assert.deepEqual(L.sortTransport(opts, "x", "time").map((o) => o.id), ["c", "a", "b"]);
});

test("排序不會改動原本的陣列", () => {
  const before = opts.map((o) => o.id);
  L.sortTransport(opts, "x", "time");
  assert.deepEqual(opts.map((o) => o.id), before);
});

test("景點篩選：區域與類型（任一符合）", () => {
  const items = [
    { id: "1", area: "A", types: ["歷史"] },
    { id: "2", area: "A", types: ["購物", "景觀"] },
    { id: "3", area: "B", types: ["景觀"] },
  ];
  assert.equal(L.filterSpots(items, "", []).length, 3);
  assert.deepEqual(L.filterSpots(items, "A", []).map((s) => s.id), ["1", "2"]);
  assert.deepEqual(L.filterSpots(items, "", ["景觀"]).map((s) => s.id), ["2", "3"]);
  assert.deepEqual(L.filterSpots(items, "A", ["景觀", "歷史"]).map((s) => s.id), ["1", "2"]);
});

test("美食篩選：區域、料理、價位", () => {
  const items = [
    { id: "1", area: "A", cuisine: "拉麵", price: 1 },
    { id: "2", area: "A", cuisine: "燒肉", price: 3 },
    { id: "3", area: "B", cuisine: "拉麵", price: 2 },
  ];
  assert.deepEqual(L.filterFood(items, "", "拉麵", []).map((f) => f.id), ["1", "3"]);
  assert.deepEqual(L.filterFood(items, "A", "", [3]).map((f) => f.id), ["2"]);
  assert.deepEqual(L.filterFood(items, "", "", [1, 2]).map((f) => f.id), ["1", "3"]);
  assert.equal(L.filterFood(items, "B", "燒肉", []).length, 0);
});

test("格式化：費用、時間、轉乘、地圖連結", () => {
  assert.equal(L.formatFare({ fareMin: 1450, fareMax: 1500 }), "約 1,450–1,500 日圓");
  assert.equal(L.formatFare({ fareMin: 970, fareMax: 970 }), "約 970 日圓");
  assert.equal(L.formatMinutes(45), "約 45 分鐘");
  assert.equal(L.formatMinutes(70), "約 1 小時 10 分鐘");
  assert.equal(L.formatMinutes(120), "約 2 小時");
  assert.equal(L.formatTransfers(0), "直達");
  assert.equal(L.formatTransfers(1), "轉乘 1 次");
  assert.equal(L.mapUrl("大阪城"), "https://www.google.com/maps/search/?api=1&query=%E5%A4%A7%E9%98%AA%E5%9F%8E");
});

test("資料檔格式正確（區域、類型、價位、目的地、官方連結、id 不重複）", () => {
  assert.deepEqual(L.validateData(DATA), []);
});

test("每個目的地都有鐵路、機場巴士、計程車三種方式", () => {
  for (const d of DATA.transport.destinations) {
    const modes = new Set(DATA.transport.options.filter((o) => o.destination === d.id).map((o) => o.mode));
    assert.deepEqual([...modes].sort(), ["機場巴士", "計程車", "鐵路"].sort(), d.name);
  }
});

test("資料檢查能抓到錯誤", () => {
  const bad = JSON.parse(JSON.stringify(DATA));
  bad.spots.items[0].area = "不存在的區域";
  bad.food.items[0].price = 9;
  bad.transport.options[0].destination = "nowhere";
  const problems = L.validateData(bad);
  assert.equal(problems.length, 3);
});
