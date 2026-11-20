// 出國清單（checklist.js）的資料與狀態測試。在 travel/ 執行：node --test
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const C = require(path.join(__dirname, "..", "checklist.js"));

test("每個國家都有專屬項目，項目 id 不重複", () => {
  for (const country of ["jp", "kr", "id"]) {
    const groups = C.groupsFor(country);
    assert.match(groups[0].group, /專屬/);
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    assert.strictEqual(new Set(ids).size, ids.length, country + " 有重複 id");
  }
  assert.ok(!C.groupsFor("xx").some((g) => /專屬/.test(g.group)));
});

test("進度：勾選數／總數，自己加的項目也算", () => {
  const s = C.emptyState();
  const total = C.progress("jp", s).total;
  s.checked.passport = true;
  assert.deepStrictEqual(C.progress("jp", s), { done: 1, total });
  C.addCustom(s, "自拍棒", 1);
  s.checked[s.custom[0].id] = true;
  assert.deepStrictEqual(C.progress("jp", s), { done: 2, total: total + 1 });
});

test("自己加的項目：空白與重複不加、刪除時一併取消勾選", () => {
  const s = C.emptyState();
  assert.strictEqual(C.addCustom(s, "   "), null);
  const item = C.addCustom(s, " 伴手禮清單 ", 2);
  assert.strictEqual(item.text, "伴手禮清單");
  assert.strictEqual(C.addCustom(s, "伴手禮清單"), null);
  s.checked[item.id] = true;
  C.removeCustom(s, item.id);
  assert.deepStrictEqual(s, C.emptyState());
});

test("讀到壞掉或舊的資料時不會出錯", () => {
  assert.deepStrictEqual(C.normalize(null), C.emptyState());
  assert.deepStrictEqual(C.normalize("x"), C.emptyState());
  const s = C.normalize({ checked: { passport: true, bad: "yes" }, custom: [{ id: "c1", text: "  A " }, { id: 3 }, null] });
  assert.deepStrictEqual(s, { checked: { passport: true }, custom: [{ id: "c1", text: "A" }] });
});
