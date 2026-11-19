// 電車路線導引（rail.js）的資料檢查與找路測試。在 travel/ 執行：node --test
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

global.window = {};
require(path.join(__dirname, "..", "data.js"));
const { RAIL, plan } = require(path.join(__dirname, "..", "rail.js"));

const regions = Object.fromEntries(window.REGIONS.map((r) => [r.id, r]));

test("每個城市的景點出入口都對應到路線上的車站", () => {
  for (const [id, net] of Object.entries(RAIL)) {
    assert.ok(regions[id], id + " 不是 data.js 裡的城市");
    const all = new Set(net.lines.flatMap((l) => l.stations));
    const ids = new Set(net.lines.map((l) => l.id));
    assert.strictEqual(ids.size, net.lines.length, id + " 的路線代號重複");
    for (const line of net.lines) {
      assert.strictEqual(new Set(line.stations).size, line.stations.length, line.name + " 有重複車站");
      assert.match(line.color, /^#[0-9a-f]{6}$/i);
    }
    for (const [a, b] of net.transfers) {
      assert.ok(all.has(a) && all.has(b), id + " 轉乘站不存在：" + a + "、" + b);
    }
    for (const [spot, list] of Object.entries(net.access)) {
      assert.ok(regions[id].spots.some((s) => s.id === spot), id + " 沒有景點 " + spot);
      for (const acc of list) {
        assert.ok(all.has(acc.st), spot + " 的車站不在路線上：" + acc.st);
        assert.ok(acc.walk > 0, spot + " 要有步行時間");
        for (const l of acc.lines || []) {
          const line = net.lines.find((x) => x.id === l);
          assert.ok(line && line.stations.includes(acc.st), spot + " 的路線 " + l + " 沒有停 " + acc.st);
        }
      }
    }
  }
});

test("能直達就不轉乘：淺草寺 → 澀谷搭銀座線，出淺草站 1 號出口", () => {
  const p = plan("tokyo", "asakusa", "shibuya");
  assert.strictEqual(p.transfers, 0);
  assert.strictEqual(p.from.exit, "1 號出口");
  const ride = p.segments[0];
  assert.match(ride.line.name, /銀座線/);
  assert.strictEqual(ride.towards, "澀谷");
  assert.strictEqual(ride.to, "澀谷");
});

test("需要轉乘時列出轉乘站與方向：道頓堀 → 大阪城", () => {
  const p = plan("kansai", "dotonbori", "osaka-castle");
  const rides = p.segments.filter((s) => s.kind === "ride");
  assert.strictEqual(p.transfers, 1);
  assert.deepStrictEqual(rides.map((s) => [s.line.id, s.from, s.to, s.towards]), [
    ["M", "難波", "本町", "江坂"],
    ["C", "本町", "谷町四丁目", "長田"],
  ]);
  assert.strictEqual(p.to.exit, "1-B 或 9 號出口");
});

test("環狀線寫接下來經過的車站：明洞 → 弘大", () => {
  const p = plan("seoul", "myeongdong", "hongdae");
  const ride = p.segments.find((s) => s.kind === "ride");
  assert.strictEqual(ride.line.id, "2");
  assert.strictEqual(ride.towards, "市廳・忠正路");
  assert.strictEqual(p.to.exit, "9 號出口");
});

test("指定路線的出口只用在那條線：淺草線走 A4，銀座線走 1 號出口", () => {
  const p = plan("tokyo", "asakusa", "tokyo-tower");
  if (p.from.lines.includes("A")) assert.strictEqual(p.from.exit, "A4 出口");
  else assert.strictEqual(p.from.exit, "1 號出口");
  assert.ok(p.segments[0].line.id === "A" ? p.from.lines.includes("A") : !p.from.lines.includes("A"));
});

test("同一站附近的兩個景點、沒有資料的景點", () => {
  assert.ok(plan("seoul", "bukchon", "gyeongbokgung"));
  assert.deepStrictEqual(plan("tokyo", "odaiba", "odaiba"), { sameStation: "御台場海濱公園站" });
  assert.strictEqual(plan("kansai", "kinkakuji", "nijo"), null);
  assert.strictEqual(plan("jeju", "a", "b"), null);
});

test("每兩個有資料的景點都找得到路", () => {
  for (const [id, net] of Object.entries(RAIL)) {
    const spots = Object.keys(net.access);
    for (const a of spots) for (const b of spots) {
      if (a === b) continue;
      const ra = regions[id].spots.find((s) => s.id === a);
      const rb = regions[id].spots.find((s) => s.id === b);
      if (ra.hub !== rb.hub) continue; // 跨城市由城際交通處理
      assert.ok(plan(id, a, b), id + "：" + a + " → " + b + " 找不到路");
    }
  }
});
