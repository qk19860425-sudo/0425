// 旅行足跡：邏輯測試（在 footprints/ 資料夾執行 node --test）
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../logic.js");

// 做一張只有 EXIF 的假 JPEG：可以指定 GPS 與拍攝時間、大小端
function fakeJpeg({ lat, lng, date, little = true } = {}) {
  const parts = [];
  const tiff = [];
  const w16 = (arr, o, v) => { if (little) { arr[o] = v & 255; arr[o + 1] = v >> 8; } else { arr[o] = v >> 8; arr[o + 1] = v & 255; } };
  const w32 = (arr, o, v) => {
    const b = [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    for (let i = 0; i < 4; i++) arr[o + i] = little ? b[3 - i] : b[i];
  };
  const buf = new Array(512).fill(0);
  buf[0] = buf[1] = little ? 0x49 : 0x4d;
  w16(buf, 2, 42);
  w32(buf, 4, 8); // IFD0 位置
  // IFD0：兩個項目（GPS 指標、Exif 指標）
  const ifd0 = 8;
  w16(buf, ifd0, 2);
  const gpsIfd = 100;
  const exifIfd = 300;
  const entry = (o, tag, type, count, value) => { w16(buf, o, tag); w16(buf, o + 2, type); w32(buf, o + 4, count); w32(buf, o + 8, value); };
  entry(ifd0 + 2, 0x8825, 4, 1, gpsIfd);
  entry(ifd0 + 14, 0x8769, 4, 1, exifIfd);
  w32(buf, ifd0 + 26, 0);
  // GPS IFD：緯度參考、緯度、經度參考、經度
  if (lat != null) {
    w16(buf, gpsIfd, 4);
    const latData = 200;
    const lngData = 230;
    const ascii1 = (ch) => (little ? ch.charCodeAt(0) : ch.charCodeAt(0) << 24);
    entry(gpsIfd + 2, 1, 2, 2, ascii1(lat < 0 ? "S" : "N"));
    entry(gpsIfd + 14, 2, 5, 3, latData);
    entry(gpsIfd + 26, 3, 2, 2, ascii1(lng < 0 ? "W" : "E"));
    entry(gpsIfd + 38, 4, 5, 3, lngData);
    const rat = (o, deg) => {
      const a = Math.abs(deg);
      const d = Math.floor(a);
      const m = Math.floor((a - d) * 60);
      const s = Math.round(((a - d) * 60 - m) * 60 * 1000);
      w32(buf, o, d); w32(buf, o + 4, 1);
      w32(buf, o + 8, m); w32(buf, o + 12, 1);
      w32(buf, o + 16, s); w32(buf, o + 20, 1000);
    };
    rat(latData, lat);
    rat(lngData, lng);
  } else {
    w16(buf, gpsIfd, 0);
  }
  // Exif IFD：拍攝時間
  if (date) {
    w16(buf, exifIfd, 1);
    const strOff = 400;
    entry(exifIfd + 2, 0x9003, 2, 20, strOff);
    const s = date + "\0";
    for (let i = 0; i < s.length; i++) buf[strOff + i] = s.charCodeAt(i);
  } else {
    w16(buf, exifIfd, 0);
  }
  tiff.push(...buf);
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = app1.length + 2;
  parts.push(0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255, ...app1, 0xff, 0xd9);
  return new Uint8Array(parts).buffer;
}

test("讀出照片的拍攝地點與日期（小端）", () => {
  const r = F.readExif(fakeJpeg({ lat: 35.658581, lng: 139.745433, date: "2026:11:19 14:30:00" }));
  assert.ok(Math.abs(r.lat - 35.658581) < 1e-4, r.lat);
  assert.ok(Math.abs(r.lng - 139.745433) < 1e-4, r.lng);
  assert.equal(r.date, "2026-11-19");
});

test("南半球、西半球與大端格式", () => {
  const r = F.readExif(fakeJpeg({ lat: -8.409518, lng: -115.188916, date: "2025:07:01 08:00:00", little: false }));
  assert.ok(Math.abs(r.lat + 8.409518) < 1e-4, r.lat);
  assert.ok(Math.abs(r.lng + 115.188916) < 1e-4, r.lng);
  assert.equal(r.date, "2025-07-01");
});

test("沒有 GPS 的照片只回傳日期；不是 JPEG 回傳空物件", () => {
  assert.deepEqual(F.readExif(fakeJpeg({ date: "2026:01:02 00:00:00" })), { date: "2026-01-02" });
  assert.deepEqual(F.readExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer), {});
  assert.deepEqual(F.readExif(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer), {});
  assert.deepEqual(F.readExif(new ArrayBuffer(0)), {});
});

test("依月份分組，新的在前面", () => {
  const g = F.groupByMonth([
    { id: "a", date: "2026-10-05" },
    { id: "b", date: "2026-11-02" },
    { id: "c", date: "2026-11-20" },
    { id: "d", date: "" },
  ]);
  assert.deepEqual(g.map((x) => x.label), ["2026 年 11 月", "2026 年 10 月", "日期未知"]);
  assert.deepEqual(g[0].items.map((x) => x.id), ["c", "b"]);
});

test("備份檔檢查：格式不對會拒絕，欄位會整理", () => {
  assert.equal(F.checkBackup({ app: "other", records: [] }).ok, false);
  assert.equal(F.checkBackup(null).ok, false);
  const r = F.checkBackup({ app: "footprints", version: 1, records: [
    { id: "x1", name: "清水寺", date: "2026-11-19", lat: 34.99, lng: 135.78, photos: [
      { id: "p1", full: "data:image/jpeg;base64,AAA", thumb: "data:image/jpeg;base64,BBB" },
      { id: "p2", full: "javascript:alert(1)", thumb: "data:image/jpeg;base64,BBB" },
    ] },
    { name: "沒有 id 的會略過" },
    { id: "x2", date: "11/19", lat: "abc" },
  ] });
  assert.equal(r.ok, true);
  assert.equal(r.records.length, 2);
  assert.equal(r.records[0].photos.length, 1);
  assert.equal(r.records[1].name, "未命名地點");
  assert.equal(r.records[1].date, "");
  assert.equal(r.records[1].lat, null);
});

test("日期格式", () => {
  assert.equal(F.formatDate("2026-11-09"), "2026 年 11 月 9 日");
  assert.equal(F.todayString(new Date(2026, 0, 5)), "2026-01-05");
});
