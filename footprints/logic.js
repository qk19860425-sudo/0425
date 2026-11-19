// 旅行足跡：不碰畫面的邏輯（可在 Node 直接測試）
//   readExif：從 JPEG 照片讀出拍攝地點（GPS）與拍攝時間
//   其他：日期格式、依月份分組、備份檔檢查
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Footprints = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---- EXIF（只讀需要的欄位：GPS 經緯度、拍攝時間） ----
  // 回傳 { lat, lng, date }，讀不到的欄位不會出現；不是 JPEG 或沒有 EXIF 時回傳 {}
  function readExif(buffer) {
    try {
      const view = new DataView(buffer);
      if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return {};
      let offset = 2;
      while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset);
        if ((marker & 0xff00) !== 0xff00) return {};
        const size = view.getUint16(offset + 2);
        // APP1 且開頭是 "Exif\0\0"
        if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0) {
          return readTiff(view, offset + 10);
        }
        if (marker === 0xffda) return {}; // 影像資料開始，後面不會有 EXIF
        offset += 2 + size;
      }
    } catch (e) { /* 壞掉的檔案就當作沒有 EXIF */ }
    return {};
  }

  function readTiff(view, start) {
    const little = view.getUint16(start) === 0x4949;
    const u16 = (o) => view.getUint16(start + o, little);
    const u32 = (o) => view.getUint32(start + o, little);
    if (u16(2) !== 42) return {};

    function entries(ifdOffset) {
      const list = {};
      const n = u16(ifdOffset);
      for (let i = 0; i < n; i++) {
        const e = ifdOffset + 2 + i * 12;
        list[u16(e)] = { type: u16(e + 2), count: u32(e + 4), valueOffset: e + 8 };
      }
      return list;
    }
    // 取值：資料超過 4 bytes 時存的是位移
    function dataOffset(entry, unitSize) {
      return entry.count * unitSize > 4 ? u32(entry.valueOffset) : entry.valueOffset;
    }
    function rationals(entry) {
      const o = dataOffset(entry, 8);
      const out = [];
      for (let i = 0; i < entry.count; i++) {
        const den = u32(o + i * 8 + 4);
        out.push(den ? u32(o + i * 8) / den : 0);
      }
      return out;
    }
    function ascii(entry) {
      const o = dataOffset(entry, 1);
      let s = "";
      for (let i = 0; i < entry.count; i++) {
        const c = view.getUint8(start + o + i);
        if (!c) break;
        s += String.fromCharCode(c);
      }
      return s;
    }

    const result = {};
    const ifd0 = entries(u32(4));
    if (ifd0[0x8825]) {
      const gps = entries(u32(ifd0[0x8825].valueOffset));
      if (gps[2] && gps[4]) {
        const toDeg = (r) => r[0] + (r[1] || 0) / 60 + (r[2] || 0) / 3600;
        let lat = toDeg(rationals(gps[2]));
        let lng = toDeg(rationals(gps[4]));
        if (gps[1] && ascii(gps[1]).toUpperCase() === "S") lat = -lat;
        if (gps[3] && ascii(gps[3]).toUpperCase() === "W") lng = -lng;
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat || lng)) {
          result.lat = Math.round(lat * 1e6) / 1e6;
          result.lng = Math.round(lng * 1e6) / 1e6;
        }
      }
    }
    if (ifd0[0x8769]) {
      const exif = entries(u32(ifd0[0x8769].valueOffset));
      const dt = exif[0x9003] || exif[0x9004];
      if (dt) {
        // "2026:11:19 14:30:00" → "2026-11-19"
        const m = ascii(dt).match(/^(\d{4}):(\d{2}):(\d{2})/);
        if (m && m[1] !== "0000") result.date = m[1] + "-" + m[2] + "-" + m[3];
      }
    }
    return result;
  }

  // ---- 日期 ----
  function todayString(d) {
    const x = d || new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate());
  }

  function formatDate(s) {
    const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return s || "";
    return m[1] + " 年 " + Number(m[2]) + " 月 " + Number(m[3]) + " 日";
  }

  // 依日期新到舊排序，再依月份分組：[{ key: "2026-11", label: "2026 年 11 月", items }]
  function groupByMonth(records) {
    const sorted = records.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
    const groups = [];
    for (const r of sorted) {
      const key = (r.date || "").slice(0, 7) || "未知";
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        const m = key.match(/^(\d{4})-(\d{2})$/);
        g = { key, label: m ? m[1] + " 年 " + Number(m[2]) + " 月" : "日期未知", items: [] };
        groups.push(g);
      }
      g.items.push(r);
    }
    return groups;
  }

  // ---- 備份檔 ----
  // 格式：{ app: "footprints", version: 1, exportedAt, records: [{ id, name, date, note, lat, lng, createdAt, photos: [{ id, caption, full, thumb }] }] }
  // caption 是照片文字（舊備份沒有這個欄位，視為空白）
  // full、thumb 是 data URL（data:image/jpeg;base64,...）
  function checkBackup(obj) {
    if (!obj || obj.app !== "footprints" || !Array.isArray(obj.records)) {
      return { ok: false, error: "這不是旅行足跡的備份檔。" };
    }
    const records = [];
    for (const r of obj.records) {
      if (!r || typeof r.id !== "string") continue;
      const photos = Array.isArray(r.photos)
        ? r.photos
          .filter((p) => p && typeof p.id === "string" && /^data:image\//.test(p.full || "") && /^data:image\//.test(p.thumb || ""))
          .map((p) => ({ id: p.id, caption: String(p.caption || "").slice(0, 500), full: p.full, thumb: p.thumb }))
        : [];
      records.push({
        id: r.id,
        name: String(r.name || "未命名地點").slice(0, 100),
        date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || "") ? r.date : "",
        note: String(r.note || "").slice(0, 5000),
        lat: Number.isFinite(r.lat) ? r.lat : null,
        lng: Number.isFinite(r.lng) ? r.lng : null,
        createdAt: Number(r.createdAt) || Date.now(),
        photos,
      });
    }
    return { ok: true, records };
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  return { readExif, todayString, formatDate, groupByMonth, checkBackup, newId };
});
