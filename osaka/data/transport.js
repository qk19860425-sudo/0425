// 大阪旅遊：機場交通資料（示範資料）
// 票價、時間都是約略值，實際以各交通公司官網為準。
//
// 欄位說明
//   destination  目的地 id，對應 destinations 的 id
//   mode         交通方式：鐵路、機場巴士、計程車
//   fareMin/Max  預估費用（日圓，成人單程）；只有一個金額時兩者填一樣
//   minutes      預估所需時間（分鐘，不含等車）
//   board        上車地點
//   alight       下車地點
//   transfers    轉乘次數（0 表示直達）
//   steps        路線說明，每一段一行
//   officialUrl  官方查詢連結
window.OSAKA_DATA = window.OSAKA_DATA || {};

window.OSAKA_DATA.transport = {
  airport: "關西國際機場",
  destinations: [
    { id: "namba", name: "難波", note: "道頓堀、心齋橋、黑門市場一帶" },
    { id: "umeda", name: "梅田", note: "大阪站、梅田站一帶" },
  ],
  options: [
    // ---------- 前往難波 ----------
    {
      id: "nankai-rapit-namba", destination: "namba", mode: "鐵路",
      name: "南海特急 Rapi:t",
      fareMin: 1450, fareMax: 1500, minutes: 38,
      board: "南海 關西機場站", alight: "南海 難波站", transfers: 0,
      steps: ["南海 關西機場站 → 難波站（全車對號座，直達）"],
      note: "最快到難波；需另購特急券。",
      officialName: "南海電鐵", officialUrl: "https://www.nankai.co.jp/",
    },
    {
      id: "nankai-express-namba", destination: "namba", mode: "鐵路",
      name: "南海 機場急行",
      fareMin: 970, fareMax: 1000, minutes: 45,
      board: "南海 關西機場站", alight: "南海 難波站", transfers: 0,
      steps: ["南海 關西機場站 → 難波站（自由座，直達）"],
      note: "最便宜的直達方式，不用特急費。",
      officialName: "南海電鐵", officialUrl: "https://www.nankai.co.jp/",
    },
    {
      id: "jr-kanku-namba", destination: "namba", mode: "鐵路",
      name: "JR 關空快速＋地鐵御堂筋線",
      fareMin: 1300, fareMax: 1400, minutes: 60,
      board: "JR 關西機場站", alight: "大阪 Metro 難波站", transfers: 1,
      steps: ["JR 關空快速：關西機場站 → 天王寺站", "大阪 Metro 御堂筋線：天王寺站 → 難波站"],
      note: "有 JR Pass 時可考慮（地鐵段另付）。",
      officialName: "JR 西日本", officialUrl: "https://www.westjr.co.jp/",
    },
    {
      id: "bus-namba", destination: "namba", mode: "機場巴士",
      name: "機場利木津巴士（難波線）",
      fareMin: 1300, fareMax: 1600, minutes: 50,
      board: "關西機場 第 1 航廈巴士站", alight: "難波（OCAT）", transfers: 0,
      steps: ["機場巴士：關西機場 → 難波 OCAT（直達）"],
      note: "行李多、不想換車時適合；遇塞車會比較久。",
      officialName: "關西機場交通", officialUrl: "https://www.kate.co.jp/",
    },
    {
      id: "taxi-namba", destination: "namba", mode: "計程車",
      name: "計程車（定額）",
      fareMin: 16000, fareMax: 20000, minutes: 50,
      board: "關西機場 第 1 航廈計程車招呼站", alight: "飯店門口", transfers: 0,
      steps: ["計程車：關西機場 → 難波一帶飯店"],
      note: "三到四人、行李多或深夜抵達時可考慮；可先預約定額計程車。",
      officialName: "關西機場官網：交通", officialUrl: "https://www.kansai-airport.or.jp/access",
    },
    // ---------- 前往梅田 ----------
    {
      id: "jr-kanku-umeda", destination: "umeda", mode: "鐵路",
      name: "JR 關空快速",
      fareMin: 1210, fareMax: 1300, minutes: 70,
      board: "JR 關西機場站", alight: "JR 大阪站", transfers: 0,
      steps: ["JR 關空快速：關西機場站 → 大阪站（部分班次直達）"],
      note: "到梅田最便宜的直達方式；部分班次需在天王寺轉車。",
      officialName: "JR 西日本", officialUrl: "https://www.westjr.co.jp/",
    },
    {
      id: "jr-haruka-umeda", destination: "umeda", mode: "鐵路",
      name: "JR 特急 HARUKA＋JR 京都線",
      fareMin: 2500, fareMax: 3000, minutes: 55,
      board: "JR 關西機場站", alight: "JR 大阪站", transfers: 1,
      steps: ["JR 特急 HARUKA：關西機場站 → 新大阪站", "JR 京都線：新大阪站 → 大阪站（1 站）"],
      note: "對號座、舒適；需另購特急券。",
      officialName: "JR 西日本", officialUrl: "https://www.westjr.co.jp/",
    },
    {
      id: "nankai-rapit-umeda", destination: "umeda", mode: "鐵路",
      name: "南海特急 Rapi:t＋地鐵御堂筋線",
      fareMin: 1700, fareMax: 1800, minutes: 55,
      board: "南海 關西機場站", alight: "大阪 Metro 梅田站", transfers: 1,
      steps: ["南海特急 Rapi:t：關西機場站 → 難波站", "大阪 Metro 御堂筋線：難波站 → 梅田站"],
      note: "難波站轉乘需步行約 5–10 分鐘。",
      officialName: "南海電鐵", officialUrl: "https://www.nankai.co.jp/",
    },
    {
      id: "bus-umeda", destination: "umeda", mode: "機場巴士",
      name: "機場利木津巴士（大阪站線）",
      fareMin: 1800, fareMax: 2000, minutes: 65,
      board: "關西機場 第 1 航廈巴士站", alight: "大阪站（梅田）巴士站", transfers: 0,
      steps: ["機場巴士：關西機場 → 大阪站（直達）"],
      note: "免換車；遇塞車會比較久。",
      officialName: "關西機場交通", officialUrl: "https://www.kate.co.jp/",
    },
    {
      id: "taxi-umeda", destination: "umeda", mode: "計程車",
      name: "計程車（定額）",
      fareMin: 18000, fareMax: 22000, minutes: 60,
      board: "關西機場 第 1 航廈計程車招呼站", alight: "飯店門口", transfers: 0,
      steps: ["計程車：關西機場 → 梅田一帶飯店"],
      note: "三到四人、行李多或深夜抵達時可考慮。",
      officialName: "關西機場官網：交通", officialUrl: "https://www.kansai-airport.or.jp/access",
    },
  ],
};
