// 日本・韓國景點路線資料
// 整理日期：2026-11-12。票價、時間都是「約略值」，會隨班次、季節與票價調整變動，出發前請用地圖 App 查即時資訊。
// 景點座標是概略位置（可能差數十到數百公尺），只用來估算距離與開啟地圖導航。
//
// 資料結構
//   regions[].hubs      ：區域內的城市中心（跨城市移動以 hub 對 hub 的交通為準）
//   regions[].intercity ：hub 之間的交通建議
//   regions[].spots     ：景點，hub 表示屬於哪個城市
//   regions[].itineraries：推薦行程，legs[i] 是 stops[i] 到 stops[i+1] 的交通
window.TRAVEL_UPDATED = "2026-11-12";

window.REGIONS = [
  // ===================================================================
  {
    id: "tokyo",
    name: "東京",
    country: "jp",
    currency: "日圓",
    transportTip: "東京以電車和地鐵為主，班次密集。買一張 Suica 或 PASMO（或手機綁定）就能搭大部分電車、地鐵和公車。計程車起跳約 500 日圓，短程多人可考慮。",
    hubs: [
      { id: "tokyo-center", name: "東京市區", station: "東京站", lat: 35.6812, lng: 139.7671 },
      { id: "yokohama", name: "橫濱", station: "橫濱站", lat: 35.4660, lng: 139.6223 },
      { id: "kamakura", name: "鎌倉", station: "鎌倉站", lat: 35.3190, lng: 139.5506 },
    ],
    intercity: [
      { from: "tokyo-center", to: "kamakura", mode: "電車", detail: "JR 橫須賀線，東京站直達鎌倉站（從新宿可搭 JR 湘南新宿線）", minutes: 55, cost: "約 950–1,000 日圓" },
      { from: "tokyo-center", to: "yokohama", mode: "電車", detail: "JR 東海道線，東京站直達橫濱站", minutes: 25, cost: "約 500 日圓" },
      { from: "yokohama", to: "kamakura", mode: "電車", detail: "JR 橫須賀線，橫濱站直達鎌倉站", minutes: 25, cost: "約 350–400 日圓" },
    ],
    spots: [
      { id: "asakusa", name: "淺草寺", hub: "tokyo-center", station: "淺草站（銀座線、都營淺草線）", tags: ["寺廟神社", "歷史"], stay: "1–1.5 小時", lat: 35.7148, lng: 139.7967 },
      { id: "skytree", name: "東京晴空塔", hub: "tokyo-center", station: "東京晴空塔站、押上站", tags: ["夜景", "購物"], stay: "1.5–2 小時", lat: 35.7101, lng: 139.8107 },
      { id: "ueno", name: "上野恩賜公園", hub: "tokyo-center", station: "上野站", tags: ["自然", "博物館"], stay: "1–2 小時", lat: 35.7156, lng: 139.7745 },
      { id: "akihabara", name: "秋葉原電器街", hub: "tokyo-center", station: "秋葉原站", tags: ["購物", "動漫"], stay: "1.5–3 小時", lat: 35.6984, lng: 139.7731 },
      { id: "tokyo-station", name: "東京車站丸之內", hub: "tokyo-center", station: "東京站", tags: ["歷史", "購物"], stay: "1 小時", lat: 35.6812, lng: 139.7671 },
      { id: "kokyo", name: "皇居東御苑", hub: "tokyo-center", station: "大手町站、東京站", tags: ["自然", "歷史"], stay: "1 小時", lat: 35.6852, lng: 139.7528 },
      { id: "tsukiji", name: "築地場外市場", hub: "tokyo-center", station: "築地站（日比谷線）", tags: ["美食"], stay: "1–1.5 小時", lat: 35.6655, lng: 139.7707 },
      { id: "ginza", name: "銀座", hub: "tokyo-center", station: "銀座站", tags: ["購物", "美食"], stay: "1.5–3 小時", lat: 35.6717, lng: 139.7650 },
      { id: "tokyo-tower", name: "東京鐵塔", hub: "tokyo-center", station: "赤羽橋站、神谷町站", tags: ["夜景"], stay: "1 小時", lat: 35.6586, lng: 139.7454 },
      { id: "meiji", name: "明治神宮", hub: "tokyo-center", station: "原宿站、明治神宮前站", tags: ["寺廟神社", "自然"], stay: "1 小時", lat: 35.6764, lng: 139.6993 },
      { id: "shibuya", name: "澀谷十字路口", hub: "tokyo-center", station: "澀谷站", tags: ["購物", "夜景"], stay: "1–2 小時", lat: 35.6595, lng: 139.7005 },
      { id: "shinjuku-gyoen", name: "新宿御苑", hub: "tokyo-center", station: "新宿御苑前站（丸之內線）", tags: ["自然"], stay: "1–1.5 小時", lat: 35.6852, lng: 139.7101 },
      { id: "odaiba", name: "台場海濱公園", hub: "tokyo-center", station: "御台場海濱公園站（百合海鷗號）", tags: ["夜景", "親子"], stay: "1.5–3 小時", lat: 35.6298, lng: 139.7740 },
      { id: "yokohama-redbrick", name: "橫濱紅磚倉庫", hub: "yokohama", station: "馬車道站、日本大通站（港未來線）", tags: ["購物", "夜景"], stay: "1–2 小時", lat: 35.4527, lng: 139.6430 },
      { id: "tsurugaoka", name: "鶴岡八幡宮", hub: "kamakura", station: "鎌倉站", tags: ["寺廟神社", "歷史"], stay: "1 小時", lat: 35.3259, lng: 139.5565 },
      { id: "daibutsu", name: "鎌倉大佛（高德院）", hub: "kamakura", station: "長谷站（江之電）", tags: ["寺廟神社", "歷史"], stay: "45 分鐘", lat: 35.3167, lng: 139.5357 },
    ],
    itineraries: [
      {
        id: "tokyo-shitamachi",
        title: "上野・淺草・晴空塔：下町經典一日",
        days: 1, themes: ["第一次去", "歷史", "夜景"],
        summary: "白天逛公園和老街，傍晚上晴空塔看夜景。全程都在東京東側，移動很短。",
        stops: ["ueno", "asakusa", "skytree"],
        legs: [
          { mode: "地鐵", detail: "銀座線 上野站 → 淺草站，2 站", minutes: 5, cost: "約 180 日圓" },
          { mode: "步行", detail: "過吾妻橋沿隅田川走，約 1.5 公里；不想走可搭東武晴空塔線 淺草站 → 東京晴空塔站，1 站", minutes: 20, cost: "步行免費" },
        ],
      },
      {
        id: "tokyo-west",
        title: "明治神宮・澀谷・新宿御苑",
        days: 1, themes: ["第一次去", "購物", "自然"],
        summary: "早上在神宮森林散步，中午逛澀谷，下午到新宿御苑休息，晚上留在新宿吃飯。",
        stops: ["meiji", "shibuya", "shinjuku-gyoen"],
        legs: [
          { mode: "電車", detail: "JR 山手線 原宿站 → 澀谷站，1 站；也可以沿表參道、貓街走過去", minutes: 5, cost: "約 150–160 日圓" },
          { mode: "地鐵", detail: "副都心線 澀谷站 → 新宿三丁目站，再步行約 5 分鐘到新宿門", minutes: 15, cost: "約 180 日圓" },
        ],
      },
      {
        id: "tokyo-kamakura",
        title: "鎌倉一日遊",
        days: 1, themes: ["近郊", "寺廟", "歷史"],
        summary: "從東京站搭 JR 直達鎌倉，參拜鶴岡八幡宮，再搭江之電去看大佛。",
        stops: ["tokyo-station", "tsurugaoka", "daibutsu"],
        legs: [
          { mode: "電車", detail: "JR 橫須賀線 東京站 → 鎌倉站（直達），出站沿若宮大路或小町通步行約 10 分鐘", minutes: 65, cost: "約 950–1,000 日圓" },
          { mode: "電車", detail: "從鶴岡八幡宮走回鎌倉站，搭江之電到長谷站（3 站），再步行約 7 分鐘", minutes: 30, cost: "約 200 日圓" },
        ],
      },
    ],
  },
  // ===================================================================
  {
    id: "kansai",
    name: "大阪・京都・奈良",
    country: "jp",
    currency: "日圓",
    transportTip: "城市之間搭 JR 或私鐵（阪急、京阪、近鐵）都很方便。京都市區公車常客滿，建議盡量搭地鐵、電車再步行；三到四人短程可搭計程車。ICOCA 和 Suica 在關西都能用。",
    hubs: [
      { id: "osaka", name: "大阪", station: "大阪站（梅田）", lat: 34.7025, lng: 135.4959 },
      { id: "kyoto", name: "京都", station: "京都站", lat: 34.9858, lng: 135.7588 },
      { id: "nara", name: "奈良", station: "近鐵奈良站", lat: 34.6844, lng: 135.8274 },
    ],
    intercity: [
      { from: "osaka", to: "kyoto", mode: "電車", detail: "JR 新快速 大阪站 → 京都站；要去祇園、河原町可改搭阪急京都線到京都河原町站", minutes: 30, cost: "約 580 日圓" },
      { from: "osaka", to: "nara", mode: "電車", detail: "近鐵奈良線 大阪難波站 → 近鐵奈良站（快速急行）", minutes: 40, cost: "約 700 日圓" },
      { from: "kyoto", to: "nara", mode: "電車", detail: "近鐵京都線 京都站 → 近鐵奈良站（急行，部分班次需在大和西大寺轉車）", minutes: 45, cost: "約 760 日圓" },
    ],
    spots: [
      { id: "osaka-castle", name: "大阪城公園", hub: "osaka", station: "谷町四丁目站、大阪城公園站", tags: ["歷史", "自然"], stay: "1.5–2 小時", lat: 34.6873, lng: 135.5262 },
      { id: "dotonbori", name: "道頓堀", hub: "osaka", station: "難波站、日本橋站", tags: ["美食", "夜景", "購物"], stay: "1.5–3 小時", lat: 34.6687, lng: 135.5013 },
      { id: "tsutenkaku", name: "通天閣・新世界", hub: "osaka", station: "惠美須町站、新今宮站", tags: ["美食", "夜景"], stay: "1 小時", lat: 34.6525, lng: 135.5063 },
      { id: "umeda-sky", name: "梅田藍天大廈空中庭園", hub: "osaka", station: "大阪站、梅田站", tags: ["夜景"], stay: "1 小時", lat: 34.7053, lng: 135.4906 },
      { id: "usj", name: "日本環球影城", hub: "osaka", station: "環球城站（JR 夢咲線）", tags: ["親子", "樂園"], stay: "一整天", lat: 34.6654, lng: 135.4323 },
      { id: "kaiyukan", name: "海遊館", hub: "osaka", station: "大阪港站（中央線）", tags: ["親子"], stay: "2 小時", lat: 34.6545, lng: 135.4290 },
      { id: "kyoto-station", name: "京都車站", hub: "kyoto", station: "京都站", tags: ["交通樞紐", "購物"], stay: "30 分鐘", lat: 34.9858, lng: 135.7588 },
      { id: "fushimi-inari", name: "伏見稻荷大社", hub: "kyoto", station: "稻荷站（JR 奈良線）、伏見稻荷站（京阪）", tags: ["寺廟神社"], stay: "1.5–2 小時", lat: 34.9671, lng: 135.7727 },
      { id: "kiyomizu", name: "清水寺", hub: "kyoto", station: "清水五條站（京阪），步行約 25 分鐘", tags: ["寺廟神社", "歷史"], stay: "1–1.5 小時", lat: 34.9949, lng: 135.7850 },
      { id: "gion", name: "八坂神社・祇園", hub: "kyoto", station: "祇園四條站（京阪）", tags: ["寺廟神社", "美食", "歷史"], stay: "1–2 小時", lat: 35.0037, lng: 135.7788 },
      { id: "kinkakuji", name: "金閣寺", hub: "kyoto", station: "市巴士「金閣寺道」站", tags: ["寺廟神社"], stay: "45 分鐘", lat: 35.0394, lng: 135.7292 },
      { id: "arashiyama", name: "嵐山竹林小徑", hub: "kyoto", station: "嵯峨嵐山站（JR）、嵐山站（嵐電）", tags: ["自然"], stay: "2–3 小時", lat: 35.0170, lng: 135.6713 },
      { id: "nijo", name: "二條城", hub: "kyoto", station: "二條城前站（地鐵東西線）", tags: ["歷史"], stay: "1–1.5 小時", lat: 35.0142, lng: 135.7481 },
      { id: "nara-kintetsu", name: "近鐵奈良站", hub: "nara", station: "近鐵奈良站", tags: ["交通樞紐"], stay: "—", lat: 34.6844, lng: 135.8274 },
      { id: "todaiji", name: "奈良公園・東大寺", hub: "nara", station: "近鐵奈良站，步行約 20 分鐘", tags: ["寺廟神社", "自然", "親子"], stay: "2 小時", lat: 34.6890, lng: 135.8398 },
      { id: "kasuga", name: "春日大社", hub: "nara", station: "近鐵奈良站，步行約 30 分鐘", tags: ["寺廟神社"], stay: "45 分鐘", lat: 34.6812, lng: 135.8484 },
    ],
    itineraries: [
      {
        id: "kyoto-higashiyama",
        title: "京都東山：伏見稻荷・清水寺・祇園",
        days: 1, themes: ["第一次去", "寺廟", "歷史"],
        summary: "一早先去伏見稻荷避開人潮，中午到清水寺，再沿二年坂、三年坂一路走到祇園。",
        stops: ["kyoto-station", "fushimi-inari", "kiyomizu", "gion"],
        legs: [
          { mode: "電車", detail: "JR 奈良線 京都站 → 稻荷站，2 站，出站就是鳥居", minutes: 5, cost: "約 150 日圓" },
          { mode: "電車", detail: "京阪本線 伏見稻荷站 → 清水五條站，再上坡步行約 25 分鐘；三到四人可直接搭計程車（約 15 分鐘）", minutes: 35, cost: "約 230 日圓" },
          { mode: "步行", detail: "經產寧坂（三年坂）、二年坂、寧寧之道走到八坂神社，沿路都是老街", minutes: 25, cost: "步行免費" },
        ],
      },
      {
        id: "kyoto-arashiyama",
        title: "嵐山・金閣寺・二條城",
        days: 1, themes: ["自然", "寺廟", "歷史"],
        summary: "早上先到嵐山竹林，中午後去金閣寺，最後到二條城。嵐山到金閣寺的公車班次少、常客滿，建議計程車。",
        stops: ["kyoto-station", "arashiyama", "kinkakuji", "nijo"],
        legs: [
          { mode: "電車", detail: "JR 嵯峨野線 京都站 → 嵯峨嵐山站，步行約 10 分鐘到竹林", minutes: 25, cost: "約 240 日圓" },
          { mode: "計程車", detail: "計程車約 20 分鐘；也可以搭市巴士（約 40 分鐘，常客滿）", minutes: 20, cost: "計程車約 2,500–3,500 日圓" },
          { mode: "公車", detail: "市巴士「金閣寺道」→「二條城前」，約 25 分鐘；或搭計程車約 15 分鐘", minutes: 25, cost: "約 230 日圓" },
        ],
      },
      {
        id: "osaka-classic",
        title: "大阪城・新世界・道頓堀",
        days: 1, themes: ["第一次去", "美食", "夜景"],
        summary: "白天逛大阪城，下午到新世界吃串炸，晚上在道頓堀看招牌夜景。",
        stops: ["osaka-castle", "tsutenkaku", "dotonbori"],
        legs: [
          { mode: "地鐵", detail: "谷町線 谷町四丁目站 → 天王寺站，再步行約 15 分鐘；或堺筋線 北濱站附近搭到惠美須町站", minutes: 25, cost: "約 240 日圓" },
          { mode: "地鐵", detail: "堺筋線 惠美須町站 → 日本橋站，2 站，步行約 5 分鐘；或從新世界直接走過去（約 25 分鐘）", minutes: 15, cost: "約 190 日圓" },
        ],
      },
      {
        id: "nara-half",
        title: "奈良半日：餵鹿・東大寺・春日大社",
        days: 0.5, themes: ["近郊", "寺廟", "親子"],
        summary: "從大阪或京都搭近鐵到奈良，全程步行。鹿仙貝在公園內有賣。",
        stops: ["nara-kintetsu", "todaiji", "kasuga"],
        legs: [
          { mode: "步行", detail: "沿登大路往東走，穿過奈良公園到東大寺南大門", minutes: 20, cost: "步行免費" },
          { mode: "步行", detail: "從東大寺往南穿過公園與參道到春日大社", minutes: 25, cost: "步行免費" },
        ],
      },
    ],
  },
  // ===================================================================
  {
    id: "seoul",
    name: "首爾",
    country: "kr",
    currency: "韓元",
    transportTip: "首爾地鐵路線多、標示有中文，用 T-money 卡或氣候同行卡最方便。地鐵和公車 30 分鐘內轉乘有優惠，下公車記得也要刷卡。計程車比日本便宜，叫車用 Kakao T 或 K.Ride。",
    hubs: [{ id: "seoul", name: "首爾", station: "首爾站", lat: 37.5547, lng: 126.9707 }],
    intercity: [],
    spots: [
      { id: "gyeongbokgung", name: "景福宮", hub: "seoul", station: "景福宮站（3 號線）", tags: ["歷史"], stay: "1.5–2 小時", lat: 37.5796, lng: 126.9770 },
      { id: "bukchon", name: "北村韓屋村", hub: "seoul", station: "安國站（3 號線）", tags: ["歷史"], stay: "1 小時", lat: 37.5826, lng: 126.9830 },
      { id: "insadong", name: "仁寺洞", hub: "seoul", station: "安國站（3 號線）", tags: ["購物", "美食"], stay: "1 小時", lat: 37.5740, lng: 126.9850 },
      { id: "gwangjang", name: "廣藏市場", hub: "seoul", station: "鍾路 5 街站（1 號線）", tags: ["美食"], stay: "1 小時", lat: 37.5700, lng: 126.9996 },
      { id: "myeongdong", name: "明洞", hub: "seoul", station: "明洞站（4 號線）", tags: ["購物", "美食"], stay: "1.5–3 小時", lat: 37.5636, lng: 126.9827 },
      { id: "namsan", name: "N 首爾塔（南山）", hub: "seoul", station: "明洞站，步行到南山纜車", tags: ["夜景"], stay: "1.5 小時", lat: 37.5512, lng: 126.9882 },
      { id: "ddp", name: "東大門設計廣場（DDP）", hub: "seoul", station: "東大門歷史文化公園站（2、4、5 號線）", tags: ["購物", "夜景"], stay: "1–2 小時", lat: 37.5665, lng: 127.0092 },
      { id: "hongdae", name: "弘大", hub: "seoul", station: "弘大入口站（2 號線、機場鐵路）", tags: ["購物", "美食"], stay: "2–3 小時", lat: 37.5563, lng: 126.9236 },
      { id: "yeouido", name: "汝矣島漢江公園", hub: "seoul", station: "汝矣渡口站（5 號線）", tags: ["自然", "夜景"], stay: "1–2 小時", lat: 37.5284, lng: 126.9327 },
      { id: "seongsu", name: "聖水洞", hub: "seoul", station: "聖水站（2 號線）", tags: ["購物", "咖啡"], stay: "2 小時", lat: 37.5446, lng: 127.0557 },
      { id: "lotte-tower", name: "樂天世界塔", hub: "seoul", station: "蠶室站（2、8 號線）", tags: ["夜景", "親子", "購物"], stay: "2–3 小時", lat: 37.5126, lng: 127.1025 },
    ],
    itineraries: [
      {
        id: "seoul-palace",
        title: "景福宮・北村・仁寺洞・廣藏市場",
        days: 1, themes: ["第一次去", "歷史", "美食"],
        summary: "全程在鍾路區，大多步行。穿韓服參觀景福宮可免門票，晚餐到廣藏市場吃綠豆煎餅。",
        stops: ["gyeongbokgung", "bukchon", "insadong", "gwangjang"],
        legs: [
          { mode: "步行", detail: "從景福宮東側出來往東走到北村，上坡路段多", minutes: 15, cost: "步行免費" },
          { mode: "步行", detail: "下坡經安國站走到仁寺洞主街", minutes: 10, cost: "步行免費" },
          { mode: "地鐵", detail: "1 號線 鐘閣站 → 鍾路 5 街站，2 站；或沿清溪川步行約 25 分鐘", minutes: 15, cost: "約 1,550 韓元" },
        ],
      },
      {
        id: "seoul-namsan",
        title: "明洞・N 首爾塔・東大門夜逛",
        days: 1, themes: ["第一次去", "購物", "夜景"],
        summary: "下午逛明洞，傍晚上南山看夜景，晚上到 DDP 看燈光和東大門商場。",
        stops: ["myeongdong", "namsan", "ddp"],
        legs: [
          { mode: "纜車", detail: "從明洞步行約 10 分鐘到南山纜車站（上坡），搭纜車上山；也可搭南山循環巴士", minutes: 25, cost: "纜車來回約 1–1.5 萬韓元" },
          { mode: "計程車", detail: "下山後搭計程車到 DDP 約 15 分鐘；或回明洞站搭 4 號線到東大門歷史文化公園站（2 站）", minutes: 20, cost: "地鐵約 1,550 韓元" },
        ],
      },
      {
        id: "seoul-trendy",
        title: "弘大・汝矣島漢江・聖水洞",
        days: 1, themes: ["購物", "咖啡", "夜景"],
        summary: "上午逛弘大街頭，下午到漢江公園野餐、吃便利商店泡麵，晚上去聖水洞咖啡廳。",
        stops: ["hongdae", "yeouido", "seongsu"],
        legs: [
          { mode: "地鐵", detail: "2 號線 弘大入口站 → 永登浦區廳站，轉 5 號線到汝矣渡口站", minutes: 25, cost: "約 1,550 韓元" },
          { mode: "地鐵", detail: "5 號線 汝矣渡口站 → 往十里站，轉 2 號線到聖水站", minutes: 40, cost: "約 1,650 韓元" },
        ],
      },
    ],
  },
  // ===================================================================
  {
    id: "busan",
    name: "釜山",
    country: "kr",
    currency: "韓元",
    transportTip: "釜山景點分散在海雲台（東）和南浦洞（西南）兩區，兩區間搭地鐵 2 號線或 1 號線約 40–60 分鐘。山區景點（甘川文化村、海東龍宮寺）建議搭計程車或公車。T-money 在釜山也能用。",
    hubs: [{ id: "busan", name: "釜山", station: "西面站", lat: 35.1578, lng: 129.0600 }],
    intercity: [],
    spots: [
      { id: "haeundae", name: "海雲台海水浴場", hub: "busan", station: "海雲台站（2 號線）", tags: ["自然", "海景"], stay: "1–2 小時", lat: 35.1587, lng: 129.1604 },
      { id: "gwangalli", name: "廣安里海水浴場", hub: "busan", station: "廣安站、金蓮山站（2 號線）", tags: ["夜景", "海景"], stay: "1–2 小時", lat: 35.1532, lng: 129.1187 },
      { id: "yonggungsa", name: "海東龍宮寺", hub: "busan", station: "奧西利亞站（東海線），再轉公車或計程車", tags: ["寺廟神社", "海景"], stay: "1 小時", lat: 35.1884, lng: 129.2233 },
      { id: "gamcheon", name: "甘川文化村", hub: "busan", station: "土城站（1 號線），再轉社區小巴", tags: ["拍照"], stay: "1.5 小時", lat: 35.0975, lng: 129.0106 },
      { id: "jagalchi", name: "札嘎其市場", hub: "busan", station: "札嘎其站（1 號線）", tags: ["美食"], stay: "1 小時", lat: 35.0966, lng: 129.0306 },
      { id: "gukje", name: "國際市場・BIFF 廣場", hub: "busan", station: "札嘎其站、南浦站（1 號線）", tags: ["購物", "美食"], stay: "1–1.5 小時", lat: 35.1013, lng: 129.0287 },
      { id: "busan-tower", name: "龍頭山公園・釜山塔", hub: "busan", station: "南浦站（1 號線）", tags: ["夜景"], stay: "45 分鐘", lat: 35.1007, lng: 129.0324 },
      { id: "seomyeon", name: "西面", hub: "busan", station: "西面站（1、2 號線）", tags: ["購物", "美食"], stay: "1.5–2 小時", lat: 35.1578, lng: 129.0600 },
      { id: "taejongdae", name: "太宗台", hub: "busan", station: "南浦洞搭公車或計程車約 25 分鐘", tags: ["自然", "海景"], stay: "1.5–2 小時", lat: 35.0517, lng: 129.0870 },
    ],
    itineraries: [
      {
        id: "busan-east",
        title: "海東龍宮寺・海雲台・廣安里夜景",
        days: 1, themes: ["第一次去", "海景", "夜景"],
        summary: "上午去海邊的龍宮寺，下午在海雲台散步，晚上到廣安里看廣安大橋夜景。",
        stops: ["yonggungsa", "haeundae", "gwangalli"],
        legs: [
          { mode: "計程車", detail: "計程車約 15–20 分鐘；搭公車到海雲台約 30–40 分鐘", minutes: 20, cost: "計程車約 12,000–16,000 韓元" },
          { mode: "地鐵", detail: "2 號線 海雲台站 → 廣安站或金蓮山站，約 4 站，再步行約 10 分鐘到海邊", minutes: 20, cost: "約 1,600–1,800 韓元" },
        ],
      },
      {
        id: "busan-nampo",
        title: "甘川文化村・札嘎其・國際市場・釜山塔",
        days: 1, themes: ["第一次去", "美食", "拍照"],
        summary: "早上上山逛彩色的甘川文化村，下山到札嘎其市場吃海鮮，再逛國際市場，傍晚上釜山塔。",
        stops: ["gamcheon", "jagalchi", "gukje", "busan-tower"],
        legs: [
          { mode: "計程車", detail: "計程車約 10 分鐘；或搭社區小巴下山到土城站，再搭 1 號線到札嘎其站（1 站）", minutes: 15, cost: "計程車約 6,000–8,000 韓元" },
          { mode: "步行", detail: "從札嘎其市場往北過馬路就是 BIFF 廣場與國際市場", minutes: 10, cost: "步行免費" },
          { mode: "步行", detail: "從光復路搭手扶梯上龍頭山公園", minutes: 10, cost: "步行免費" },
        ],
      },
    ],
  },
];

// ===================================================================
// 旅遊指南
// ===================================================================
window.GUIDES = [
  {
    country: "jp",
    name: "日本",
    sections: [
      {
        id: "cards",
        title: "交通票券與 IC 卡",
        items: [
          { title: "IC 卡：Suica、PASMO、ICOCA", body: "儲值後刷卡搭電車、地鐵、公車，便利商店也能付款。東京常見 Suica、PASMO，關西是 ICOCA，三種在全日本大部分地區都能互通。無記名的 Suica、PASMO 卡片已在 2025 年 3 月恢復販售。iPhone 可以直接在「錢包」App 新增 Suica、PASMO 或 ICOCA，不用買實體卡。" },
          { title: "東京地鐵通票（Tokyo Subway Ticket）", body: "24／48／72 小時券，成人 1,000／1,500／2,000 日圓。可無限次搭東京 Metro 與都營地鐵，但不能搭 JR、百合海鷗號、私鐵與機場快線。一天搭 4 次以上地鐵通常就划算。" },
          { title: "JR Pass 全國版", body: "7 日普通車券：官方網站購買 50,000 日圓，海外代理商自 2026 年 10 月起 53,000 日圓。東京與大阪之間來回新幹線約 2.8 萬日圓，只玩東京加關西通常不划算；要跑北海道、九州等長距離才考慮。" },
          { title: "京都地下鐵・巴士一日券", body: "單獨的「巴士一日券」已停售，現在是地鐵加市巴士通用的一日券。價格曾調整，購買前請到京都市交通局官網確認。京都市也在研議市民與觀光客不同價的公車票價，預計 2027 年度上路。" },
        ],
      },
      {
        id: "airport",
        title: "機場進市區",
        items: [
          { title: "成田機場 → 東京市區", body: "京成 Skyliner 到日暮里、上野約 40 分鐘，約 2,570 日圓，最快。JR 成田特快（N'EX）到東京站約 60 分鐘，約 3,250 日圓，也直達新宿、澀谷。最便宜的是京成 Access 特急，到京成上野約 80 分鐘，約 1,240 日圓。" },
          { title: "羽田機場 → 東京市區", body: "京急線到品川站約 20 分鐘，約 330 日圓；東京單軌電車到浜松町站約 13–19 分鐘，約 520 日圓。兩者都可用 IC 卡。" },
          { title: "關西機場 → 大阪、京都", body: "南海特急 Rapi:t 到難波約 40 分鐘。JR 特急 HARUKA 到京都站約 80 分鐘，約 3,060 日圓（自由席，依查詢日而定）。省錢可搭 JR 關空快速到大阪，或轉車到京都，約 1,800–1,900 日圓。" },
        ],
      },
      {
        id: "apps",
        title: "實用 App 與上網",
        items: [
          { title: "地圖與轉乘", body: "Google 地圖在日本的電車、步行導航都很準，有中文介面。另外可裝 NAVITIME 或「乘換案內」查末班車與月台。" },
          { title: "叫車", body: "GO 和 Uber 都能在日本叫計程車，可綁外國信用卡。京都、大阪觀光區也可直接在路邊招手。" },
          { title: "上網", body: "出發前買 eSIM 最方便，下飛機開機就能用；手機不支援 eSIM 的話可買實體 SIM 卡，多人同行可租 Wi-Fi 分享器。" },
        ],
      },
      {
        id: "etiquette",
        title: "禮儀與注意事項",
        items: [
          { title: "搭車禮儀", body: "車廂內不講電話、說話小聲；背包背在前面或放行李架。手扶梯東京習慣站左邊、大阪站右邊。博愛座請讓給需要的人。" },
          { title: "免稅制度 2026 年 11 月起改變", body: "從 2026 年 11 月 1 日起改為「退稅制」：在免稅店先付含稅價格，出境時海關確認商品帶出後，再由店家或退稅業者退還消費稅。須在購買後 90 天內出境。退稅方式、時間與手續費依店家而不同，購買時請先問清楚。" },
          { title: "垃圾與小費", body: "路邊垃圾桶很少，垃圾請帶回飯店或便利商店丟。日本沒有給小費的習慣。" },
          { title: "緊急電話", body: "警察 110，消防與救護車 119。日本觀光局訪日旅客熱線 050-3816-2787（24 小時，可用英文與中文）。" },
        ],
      },
    ],
    sources: [
      { title: "東京 Metro：Tokyo Subway Ticket（英文）", url: "https://www.tokyometro.jp/lang_en/ticket/value/travel/index.html" },
      { title: "JR Pass 價格調整說明（中文 PDF）", url: "https://japanrailpass.net/assets/pdf/JRP_Price_Changes_Zh.pdf" },
      { title: "unwire.hk：JR Pass 2026 年 10 月漲價", url: "https://unwire.hk/2026/04/13/jr-pass-price-hike-2026/life-tech/travel/" },
      { title: "東京 Metro：無記名 Suica、PASMO 恢復販售", url: "https://www.tokyometro.jp/news/2025/219936.html" },
      { title: "tabiris：成田機場交通 2026", url: "https://tabiris.com/archives/naria-access2026/" },
      { title: "ekitan：關西機場 → 京都 票價查詢", url: "https://ekitan.com/transit/fare/sf-5130/st-5198" },
      { title: "nippon.com：免稅改為退稅制", url: "https://www.nippon.com/ja/japan-data/h02925/" },
      { title: "bring-you：京都地鐵巴士一日券 2026", url: "https://www.bring-you.info/zh-tw/kyoto-bus-pass" },
    ],
  },
  {
    country: "kr",
    name: "韓國",
    sections: [
      {
        id: "cards",
        title: "交通票券與 IC 卡",
        items: [
          { title: "T-money 交通卡", body: "在便利商店購買、儲值，全韓國的地鐵、公車、計程車大多能用（釜山也可以）。地鐵與公車 30 分鐘內轉乘有折扣，下公車時也要刷卡才算轉乘。" },
          { title: "氣候同行卡（Climate Card）短期券", body: "首爾的無限搭乘卡，觀光客可買 1、2、3、5、7 日券，例如 1 日券約 5,000 韓元、3 日券約 10,000 韓元、7 日券約 20,000 韓元。只限首爾市內的地鐵與公車，出了首爾（部分京畿道、仁川區間）與新盆唐線不能用。原本的 30 日券正在停止。" },
          { title: "首爾地鐵基本票價", body: "刷交通卡約 1,550 韓元起（10 公里內），距離越遠越貴。" },
          { title: "釜山交通", body: "T-money 可直接使用。另有內建交通卡功能的 VISIT BUSAN PASS（含景點門票），內容與價格請以官網為準。" },
        ],
      },
      {
        id: "airport",
        title: "機場進市區",
        items: [
          { title: "仁川機場 → 首爾", body: "機場鐵路 AREX 直達列車到首爾站，第一航廈約 43 分鐘、第二航廈約 51 分鐘，中途不停，票價約 11,000–13,000 韓元（請以官網為準）。普通列車停靠弘大入口等站，約 60 分鐘，較便宜。機場巴士（6000 系列）約 17,000–18,000 韓元，可直達飯店附近，適合行李多的人。" },
          { title: "金海機場 → 釜山市區", body: "搭金海輕軌到沙上站，出站再轉地鐵 2 號線（轉乘約 10 分鐘，刷交通卡有轉乘優惠）。到西面約 30 分鐘、約 2,100 韓元；到海雲台約 60 分鐘、約 2,300 韓元。行李多可搭計程車，到西面、南浦約 20,000 韓元起。" },
        ],
      },
      {
        id: "apps",
        title: "實用 App 與上網",
        items: [
          { title: "地圖：Naver 地圖、KakaoMap", body: "Google 地圖在韓國可以查大眾運輸，但步行、開車導航不可靠。建議以 Naver 地圖為主（有中文介面），找不到時改用 KakaoMap。" },
          { title: "叫車：Kakao T、K.Ride", body: "Kakao T 是韓國最常用的叫車 App，有英文介面，可綁外國信用卡；綁卡有問題時可改用 K.Ride。" },
          { title: "翻譯與地鐵", body: "Papago 的韓文翻譯和拍照翻譯很好用；Subway Korea 可查地鐵路線、時間和票價。" },
          { title: "上網", body: "多數 App 需要網路，出發前先買 eSIM 或實體 SIM 卡，並在台灣先下載、登入好 App。" },
        ],
      },
      {
        id: "etiquette",
        title: "禮儀與注意事項",
        items: [
          { title: "搭車禮儀", body: "地鐵粉紅色的孕婦座位請空著，博愛座留給長者。車廂內不吃東西、講話小聲。公車上下車都要刷卡。" },
          { title: "購物退稅", body: "在有「Tax Free」標誌的店家消費達一定金額可退稅，部分店家可當場扣除（即時退稅）。結帳時出示護照。" },
          { title: "小費與用餐", body: "韓國沒有給小費的習慣。小菜通常可以免費續；部分餐廳一人用餐可能不接待，或需點兩人份。" },
          { title: "緊急電話", body: "警察 112，消防與救護車 119。韓國觀光諮詢熱線 1330（24 小時，可用中文）。" },
        ],
      },
    ],
    sources: [
      { title: "trvlogue：AREX 直達列車 2026", url: "https://www.trvlogue.com/zh-Hant/seoul-arex-express-train" },
      { title: "haniseoul：仁川機場進首爾", url: "https://www.haniseoul.com/zh-TW/travels/korea/incheon-airport-to-seoul" },
      { title: "haniseoul：首爾交通票券比較", url: "https://www.haniseoul.com/zh-TW/travels/korea/seoul-city-pass-guide" },
      { title: "Creatrip：氣候同行卡", url: "https://www.creatrip.com/zh-HK/blog/14288" },
      { title: "10 Magazine：30 日氣候同行卡停止", url: "https://10mag.com/?p=577790" },
      { title: "趣旅行：金海機場到釜山市區", url: "https://www.funtime.com.tw/blog/funtime/busan-airport-to-city-transit" },
      { title: "haniseoul：韓國旅遊必備 App", url: "https://www.haniseoul.com/travels/korea/best-apps-korea-travel" },
      { title: "LG U+：韓國旅遊必備 App", url: "https://lguplus.com/korea-sim/eng/pc/support/blog/korea_travel_essential_apps_guide" },
    ],
  },
];
