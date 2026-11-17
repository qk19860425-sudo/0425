// 大阪旅遊：美食資料（示範資料）
// 店名皆為虛構的示範店家；地圖連結會搜尋該區域的同類料理。
// 實際上線前，請換成真實店家並確認營業時間與價格。
//
// 欄位說明
//   area     區域（篩選用），需為 areas 其中之一
//   cuisine  料理類型（篩選用），需為 cuisines 其中之一
//   price    價位等級：1（¥1,000 以下）、2（¥1,000–3,000）、3（¥3,000 以上）
//   budget   預算說明（文字）
//   dishes   推薦餐點
//   mapQuery Google 地圖搜尋字詞
window.OSAKA_DATA = window.OSAKA_DATA || {};

window.OSAKA_DATA.food = {
  areas: ["梅田", "難波・心齋橋", "大阪城・天滿", "天王寺・新世界", "灣區"],
  cuisines: ["章魚燒", "大阪燒", "串炸", "拉麵", "烏龍麵", "壽司・海鮮", "燒肉", "甜點・咖啡"],
  priceLevels: [
    { level: 1, label: "¥", note: "1,000 日圓以下" },
    { level: 2, label: "¥¥", note: "1,000–3,000 日圓" },
    { level: 3, label: "¥¥¥", note: "3,000 日圓以上" },
  ],
  items: [
    {
      id: "demo-takoyaki-dotonbori", name: "浪花章魚燒屋（示範店家）", area: "難波・心齋橋", cuisine: "章魚燒", price: 1,
      dishes: ["招牌章魚燒 8 顆", "蔥花醬油章魚燒"], budget: "約 600–900 日圓",
      address: "大阪市中央區道頓堀一帶", hours: "11:00–22:00",
      mapQuery: "道頓堀 たこ焼き",
    },
    {
      id: "demo-okonomiyaki-namba", name: "鐵板大阪燒 千日前（示範店家）", area: "難波・心齋橋", cuisine: "大阪燒", price: 2,
      dishes: ["豬肉大阪燒", "炒麵", "蔥燒"], budget: "約 1,200–2,000 日圓",
      address: "大阪市中央區千日前一帶", hours: "11:30–22:30",
      mapQuery: "千日前 お好み焼き",
    },
    {
      id: "demo-sushi-kuromon", name: "黑門鮮魚食堂（示範店家）", area: "難波・心齋橋", cuisine: "壽司・海鮮", price: 2,
      dishes: ["海鮮丼", "鮪魚握壽司"], budget: "約 1,500–3,000 日圓",
      address: "大阪市中央區日本橋 2 丁目（黑門市場內）", hours: "09:00–16:00",
      mapQuery: "黒門市場 海鮮丼",
    },
    {
      id: "demo-kushikatsu-shinsekai", name: "新世界串炸本舖（示範店家）", area: "天王寺・新世界", cuisine: "串炸", price: 2,
      dishes: ["綜合串炸 10 串", "炸牛肉串", "炸紅薑"], budget: "約 1,500–2,500 日圓",
      address: "大阪市浪速區惠美須東一帶（通天閣附近）", hours: "11:00–22:30",
      mapQuery: "新世界 串カツ",
    },
    {
      id: "demo-yakiniku-tsuruhashi", name: "炭火燒肉 天王寺（示範店家）", area: "天王寺・新世界", cuisine: "燒肉", price: 3,
      dishes: ["和牛拼盤", "厚切牛舌"], budget: "約 4,000–7,000 日圓",
      address: "大阪市天王寺區天王寺站一帶", hours: "17:00–23:00",
      mapQuery: "天王寺 焼肉",
    },
    {
      id: "demo-ramen-umeda", name: "梅田濃湯拉麵（示範店家）", area: "梅田", cuisine: "拉麵", price: 1,
      dishes: ["豚骨醬油拉麵", "溏心蛋"], budget: "約 900–1,200 日圓",
      address: "大阪市北區梅田一帶", hours: "11:00–翌 01:00",
      mapQuery: "梅田 ラーメン",
    },
    {
      id: "demo-udon-umeda", name: "北新地手打烏龍（示範店家）", area: "梅田", cuisine: "烏龍麵", price: 1,
      dishes: ["咖哩烏龍麵", "豆皮烏龍麵"], budget: "約 800–1,200 日圓",
      address: "大阪市北區曾根崎新地一帶", hours: "11:00–15:00、17:00–21:00",
      mapQuery: "北新地 うどん",
    },
    {
      id: "demo-cafe-tenma", name: "天神橋珈琲（示範店家）", area: "大阪城・天滿", cuisine: "甜點・咖啡", price: 1,
      dishes: ["布丁", "手沖咖啡"], budget: "約 700–1,200 日圓",
      address: "大阪市北區天神橋筋商店街一帶", hours: "08:00–19:00",
      mapQuery: "天神橋筋 喫茶",
    },
    {
      id: "demo-okonomiyaki-tenma", name: "天滿家庭大阪燒（示範店家）", area: "大阪城・天滿", cuisine: "大阪燒", price: 2,
      dishes: ["綜合大阪燒", "摩登燒"], budget: "約 1,000–1,800 日圓",
      address: "大阪市北區天滿一帶", hours: "17:00–23:00",
      mapQuery: "天満 お好み焼き",
    },
    {
      id: "demo-seafood-bay", name: "天保山海景食堂（示範店家）", area: "灣區", cuisine: "壽司・海鮮", price: 3,
      dishes: ["當日鮮魚生魚片", "炸蝦定食"], budget: "約 3,000–5,000 日圓",
      address: "大阪市港區海岸通一帶（海遊館附近）", hours: "11:00–21:00",
      mapQuery: "天保山 海鮮",
    },
  ],
};
