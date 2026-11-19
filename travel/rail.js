// 日韓城市電車路線導引：景點 A → 景點 B 要搭哪條線、往哪個方向、在哪站轉乘、走幾號出口。
//
// 資料是人工整理的「主要車站」路線網，不是完整時刻表：
//   lines[].stations：依行駛順序列出主要車站（不是每一站都列），頭尾是終點站
//                     （環狀線 loop: true，最後一站接回第一站）
//   transfers       ：不同站名、但可以步行轉乘的車站 [站 A, 站 B, 步行分鐘]
//   access[景點 id] ：景點最近的車站、出口與步行時間
//                     lines 有寫時，只有這些路線用這個出口（例如淺草站銀座線走 1 號出口、淺草線走 A4）
//                     exit 沒寫時，請照站內往 sign 的指標出站
// 出口與步行時間是參考值，現場請以站內指標為準；即時班次請用地圖 App。
(function (root) {
  "use strict";

  const RAIL = {
    // =================================================================
    tokyo: {
      lines: [
        { id: "JY", name: "JR 山手線", color: "#80c241", loop: true,
          stations: ["東京", "有樂町", "新橋", "浜松町", "品川", "目黑", "惠比壽", "澀谷", "原宿", "代代木", "新宿", "池袋", "日暮里", "上野", "御徒町", "秋葉原", "神田"] },
        { id: "JC", name: "JR 中央線快速", color: "#f15a22",
          stations: ["東京", "神田", "御茶之水", "四谷", "新宿", "中野", "吉祥寺", "高尾"] },
        { id: "G", name: "銀座線（東京 Metro）", color: "#f39700",
          stations: ["澀谷", "表參道", "青山一丁目", "赤坂見附", "溜池山王", "虎之門", "新橋", "銀座", "京橋", "日本橋", "三越前", "神田", "末廣町", "上野廣小路", "上野", "稻荷町", "田原町", "淺草"] },
        { id: "M", name: "丸之內線（東京 Metro）", color: "#e60012",
          stations: ["荻窪", "新宿", "新宿三丁目", "新宿御苑前", "四谷三丁目", "四谷", "赤坂見附", "國會議事堂前", "霞關", "銀座", "東京", "大手町", "淡路町", "御茶之水", "本鄉三丁目", "後樂園", "池袋"] },
        { id: "H", name: "日比谷線（東京 Metro）", color: "#9ca3af",
          stations: ["中目黑", "惠比壽", "六本木", "神谷町", "虎之門之丘", "霞關", "日比谷", "銀座", "東銀座", "築地", "八丁堀", "茅場町", "人形町", "小傳馬町", "秋葉原", "仲御徒町", "上野", "北千住"] },
        { id: "C", name: "千代田線（東京 Metro）", color: "#00bb85",
          stations: ["代代木上原", "代代木公園", "明治神宮前", "表參道", "乃木坂", "赤坂", "國會議事堂前", "霞關", "日比谷", "二重橋前", "大手町", "新御茶之水", "湯島", "西日暮里", "北千住", "綾瀨"] },
        { id: "Z", name: "半藏門線（東京 Metro）", color: "#8f76d6",
          stations: ["澀谷", "表參道", "青山一丁目", "永田町", "半藏門", "九段下", "神保町", "大手町", "三越前", "水天宮前", "清澄白河", "錦糸町", "押上"] },
        { id: "A", name: "都營淺草線", color: "#e85298",
          stations: ["西馬込", "五反田", "泉岳寺", "三田", "大門", "新橋", "東銀座", "寶町", "日本橋", "人形町", "東日本橋", "淺草橋", "藏前", "淺草", "本所吾妻橋", "押上"] },
        { id: "E", name: "都營大江戶線", color: "#b6007a", loop: true,
          stations: ["都廳前", "新宿西口", "飯田橋", "春日", "本鄉三丁目", "上野御徒町", "藏前", "兩國", "清澄白河", "門前仲町", "月島", "築地市場", "汐留", "大門", "赤羽橋", "麻布十番", "六本木", "青山一丁目", "國立競技場", "代代木", "新宿"] },
        { id: "U", name: "百合海鷗號", color: "#00a3d9",
          stations: ["新橋", "汐留", "竹芝", "日之出", "芝浦埠頭", "御台場海濱公園", "台場", "青海", "有明", "豐洲"] },
        { id: "TS", name: "東武晴空塔線", color: "#0f6cc3",
          stations: ["淺草", "東京晴空塔", "曳舟"] },
        { id: "EN", name: "江之電", color: "#00a650",
          stations: ["鎌倉", "和田塚", "由比濱", "長谷", "極樂寺", "藤澤"] },
      ],
      transfers: [
        ["大門", "浜松町", 3], ["日比谷", "有樂町", 3], ["大手町", "東京", 5], ["二重橋前", "東京", 5],
        ["上野", "上野廣小路", 4], ["上野", "上野御徒町", 5], ["御徒町", "上野御徒町", 3], ["御徒町", "仲御徒町", 3],
        ["新宿", "新宿西口", 3], ["新宿", "新宿三丁目", 6], ["原宿", "明治神宮前", 2], ["汐留", "新橋", 4],
        ["赤坂見附", "永田町", 4], ["國會議事堂前", "溜池山王", 4], ["御茶之水", "新御茶之水", 4],
        ["押上", "東京晴空塔", 5], ["銀座", "有樂町", 5],
      ],
      access: {
        asakusa: [{ st: "淺草", lines: ["G", "TS"], exit: "1 號出口", walk: 5 }, { st: "淺草", lines: ["A"], exit: "A4 出口", walk: 7 }],
        skytree: [{ st: "東京晴空塔", exit: "正面口", walk: 1 }, { st: "押上", exit: "B3 出口", walk: 3 }],
        ueno: [{ st: "上野", lines: ["JY"], exit: "公園口", walk: 2 }, { st: "上野", lines: ["G", "H"], sign: "上野公園", walk: 6 }],
        akihabara: [{ st: "秋葉原", lines: ["JY"], exit: "電氣街口", walk: 1 }, { st: "秋葉原", lines: ["H"], sign: "電氣街", walk: 4 }],
        "tokyo-station": [{ st: "東京", exit: "丸之內口（北口・中央口・南口）", walk: 1 }],
        kokyo: [{ st: "大手町", exit: "C13a 出口", walk: 5 }, { st: "東京", lines: ["JY", "JC"], exit: "丸之內北口", walk: 15 }],
        tsukiji: [{ st: "築地", exit: "1 號出口", walk: 1 }, { st: "築地市場", exit: "A1 出口", walk: 3 }],
        ginza: [{ st: "銀座", sign: "銀座四丁目路口（A 系列出口）", walk: 1 }, { st: "東銀座", exit: "A7 出口", walk: 4 }],
        "tokyo-tower": [{ st: "赤羽橋", exit: "赤羽橋口", walk: 5 }, { st: "神谷町", exit: "1 號出口", walk: 7 }],
        meiji: [{ st: "原宿", exit: "表參道口", walk: 2 }, { st: "明治神宮前", exit: "2 號出口", walk: 3 }],
        shibuya: [{ st: "澀谷", lines: ["JY"], exit: "八公口", walk: 1 }, { st: "澀谷", lines: ["Z"], exit: "A8 出口", walk: 1 }, { st: "澀谷", lines: ["G"], sign: "八公口", walk: 3 }],
        shinjuku: [{ st: "新宿", sign: "東口或西口（依目的地）", walk: 1 }, { st: "新宿三丁目", sign: "新宿通", walk: 3 }],
        "shinjuku-gyoen": [{ st: "新宿御苑前", exit: "1 號出口（大木戶門）", walk: 5 }],
        odaiba: [{ st: "御台場海濱公園", walk: 3 }],
        tsurugaoka: [{ st: "鎌倉", exit: "東口", walk: 10 }],
        daibutsu: [{ st: "長谷", walk: 7 }],
      },
    },

    // =================================================================
    kansai: {
      lines: [
        { id: "M", name: "御堂筋線（大阪地鐵）", color: "#e5171f",
          stations: ["江坂", "新大阪", "西中島南方", "中津", "梅田", "淀屋橋", "本町", "心齋橋", "難波", "大國町", "動物園前", "天王寺", "中百舌鳥"] },
        { id: "T", name: "谷町線（大阪地鐵）", color: "#8f4b9f",
          stations: ["大日", "東梅田", "南森町", "天滿橋", "谷町四丁目", "谷町六丁目", "谷町九丁目", "四天王寺前夕陽丘", "天王寺", "八尾南"] },
        { id: "K", name: "堺筋線（大阪地鐵）", color: "#814721",
          stations: ["天神橋筋六丁目", "扇町", "南森町", "北濱", "堺筋本町", "長堀橋", "日本橋", "惠美須町", "動物園前", "天下茶屋"] },
        { id: "C", name: "中央線（大阪地鐵）", color: "#019a66",
          stations: ["宇宙廣場", "大阪港", "朝潮橋", "弁天町", "九條", "阿波座", "本町", "堺筋本町", "谷町四丁目", "森之宮", "長田"] },
        { id: "S", name: "千日前線（大阪地鐵）", color: "#e44d93",
          stations: ["野田阪神", "阿波座", "難波", "日本橋", "谷町九丁目", "鶴橋", "南巽"] },
        { id: "N", name: "長堀鶴見綠地線（大阪地鐵）", color: "#a9cc51",
          stations: ["大正", "心齋橋", "長堀橋", "谷町六丁目", "森之宮", "京橋", "門真南"] },
        { id: "O", name: "JR 大阪環狀線", color: "#f0802d", loop: true,
          stations: ["大阪", "福島", "西九條", "弁天町", "大正", "新今宮", "天王寺", "鶴橋", "玉造", "森之宮", "大阪城公園", "京橋", "天滿"] },
        { id: "P", name: "JR 夢咲線", color: "#1e3a8a",
          stations: ["西九條", "安治川口", "環球城", "櫻島"] },
        // 京都
        { id: "KK", name: "烏丸線（京都地鐵）", color: "#1aa34a",
          stations: ["國際會館", "今出川", "丸太町", "烏丸御池", "四條", "五條", "京都", "九條", "竹田"] },
        { id: "KT", name: "東西線（京都地鐵）", color: "#e83e33",
          stations: ["太秦天神川", "二條", "二條城前", "烏丸御池", "京都市役所前", "三條京阪", "東山", "蹴上", "六地藏"] },
        { id: "KH", name: "京阪本線", color: "#1b5e3b",
          stations: ["出町柳", "神宮丸太町", "三條", "祇園四條", "清水五條", "七條", "東福寺", "伏見稻荷", "淀屋橋"] },
        { id: "JD", name: "JR 奈良線", color: "#a0522d",
          stations: ["京都", "東福寺", "稻荷", "宇治", "奈良"] },
        { id: "JE", name: "JR 嵯峨野線", color: "#7b2d8e",
          stations: ["京都", "二條", "花園", "嵯峨嵐山", "龜岡", "園部"] },
        { id: "HK", name: "阪急京都線", color: "#7a1f2b",
          stations: ["京都河原町", "烏丸", "大宮", "大阪梅田"] },
      ],
      transfers: [
        ["梅田", "東梅田", 5], ["梅田", "大阪", 5], ["東梅田", "大阪", 6], ["新今宮", "動物園前", 3], ["天滿", "扇町", 3],
        ["三條京阪", "三條", 2], ["四條", "烏丸", 2], ["京都河原町", "祇園四條", 5], ["稻荷", "伏見稻荷", 5],
      ],
      access: {
        "osaka-castle": [{ st: "谷町四丁目", exit: "1-B 或 9 號出口", walk: 15 }, { st: "大阪城公園", walk: 20 }, { st: "森之宮", lines: ["O"], walk: 20 }],
        namba: [{ st: "難波", sign: "依目的地出口", walk: 1 }],
        umeda: [{ st: "梅田", sign: "依目的地出口", walk: 1 }, { st: "大阪", walk: 1 }],
        dotonbori: [{ st: "難波", lines: ["M"], exit: "14 號出口", walk: 3 }, { st: "日本橋", exit: "2 號出口", walk: 5 }],
        tsutenkaku: [{ st: "惠美須町", exit: "3 號出口", walk: 3 }, { st: "動物園前", exit: "1 號出口", walk: 5 }, { st: "新今宮", exit: "東口", walk: 7 }],
        "umeda-sky": [{ st: "大阪", exit: "中央北口", walk: 10 }, { st: "梅田", sign: "梅田藍天大廈", walk: 12 }],
        usj: [{ st: "環球城", walk: 5 }],
        kaiyukan: [{ st: "大阪港", exit: "1 號出口", walk: 5 }],
        "kyoto-station": [{ st: "京都", walk: 1 }],
        "fushimi-inari": [{ st: "稻荷", walk: 1 }, { st: "伏見稻荷", walk: 5 }],
        kiyomizu: [{ st: "清水五條", walk: 25, note: "上坡路；也可以在京都站搭市巴士到「五條坂」或「清水道」" }],
        gion: [{ st: "祇園四條", sign: "八坂神社", walk: 5 }, { st: "京都河原町", sign: "四條通・八坂神社", walk: 10 }],
        arashiyama: [{ st: "嵯峨嵐山", exit: "南口", walk: 12 }],
        nijo: [{ st: "二條城前", exit: "1 號出口", walk: 1 }],
      },
    },

    // =================================================================
    seoul: {
      lines: [
        { id: "1", name: "1 號線", color: "#0052a4",
          stations: ["首爾站", "市廳", "鐘閣", "鐘路 3 街", "鐘路 5 街", "東大門", "東廟前", "清涼里"] },
        { id: "2", name: "2 號線（環狀線）", color: "#00a84d", loop: true,
          stations: ["市廳", "乙支路入口", "乙支路 3 街", "乙支路 4 街", "東大門歷史文化公園", "往十里", "聖水", "建大入口", "蠶室", "綜合運動場", "三成", "江南", "教大", "舍堂", "新道林", "堂山", "合井", "弘大入口", "新村", "忠正路"] },
        { id: "3", name: "3 號線", color: "#ef7c1c",
          stations: ["大化", "景福宮", "安國", "鐘路 3 街", "乙支路 3 街", "忠武路", "藥水", "玉水", "狎鷗亭", "新沙", "高速巴士客運站", "教大", "梧琴"] },
        { id: "4", name: "4 號線", color: "#00a5de",
          stations: ["晉接", "惠化", "東大門", "東大門歷史文化公園", "忠武路", "明洞", "會賢", "首爾站", "三角地", "新龍山", "二村", "舍堂", "烏耳島"] },
        { id: "5", name: "5 號線", color: "#996cac",
          stations: ["傍花", "金浦機場", "汝矣島", "汝矣渡口", "孔德", "忠正路", "光化門", "鐘路 3 街", "乙支路 4 街", "東大門歷史文化公園", "往十里", "河南檢丹山"] },
        { id: "9", name: "9 號線", color: "#bdb092",
          stations: ["開花", "金浦機場", "堂山", "汝矣島", "鷺梁津", "高速巴士客運站", "新論峴", "綜合運動場", "中央報勳醫院"] },
        { id: "AREX", name: "機場鐵路（普通列車）", color: "#0090d2",
          stations: ["首爾站", "孔德", "弘大入口", "金浦機場", "仁川機場第 2 航廈"] },
        { id: "8", name: "8 號線", color: "#e6186c",
          stations: ["岩寺", "蠶室", "石村", "牡丹"] },
      ],
      transfers: [],
      access: {
        gyeongbokgung: [{ st: "景福宮", exit: "5 號出口", walk: 5 }, { st: "光化門", exit: "2 號出口", walk: 7 }],
        bukchon: [{ st: "安國", exit: "2 號出口", walk: 10 }],
        insadong: [{ st: "安國", exit: "6 號出口", walk: 3 }, { st: "鐘閣", exit: "3 號出口", walk: 7 }],
        gwangjang: [{ st: "鐘路 5 街", exit: "7 或 8 號出口", walk: 2 }],
        "seoul-station": [{ st: "首爾站", walk: 1 }],
        myeongdong: [{ st: "明洞", exit: "6 號出口", walk: 1 }, { st: "乙支路入口", exit: "5 或 6 號出口", walk: 3 }],
        namsan: [{ st: "明洞", exit: "3 號出口", walk: 10, note: "走到南山纜車搭乘處，搭纜車上山" }],
        ddp: [{ st: "東大門歷史文化公園", exit: "1 號出口", walk: 1 }],
        hongdae: [{ st: "弘大入口", exit: "9 號出口", walk: 3 }],
        yeouido: [{ st: "汝矣渡口", exit: "2 或 3 號出口", walk: 3 }],
        seongsu: [{ st: "聖水", exit: "3 或 4 號出口", walk: 3 }],
        "express-terminal": [{ st: "高速巴士客運站", sign: "京釜線（경부선）", walk: 5 }],
        "lotte-tower": [{ st: "蠶室", exit: "1 或 2 號出口（地下直通）", walk: 2 }],
      },
    },

    // =================================================================
    busan: {
      lines: [
        { id: "1", name: "1 號線", color: "#f06a00",
          stations: ["老圃", "東萊", "教大", "蓮山", "釜田", "西面", "凡一", "釜山站", "中央", "南浦", "札嘎其", "土城", "多大浦海水浴場"] },
        { id: "2", name: "2 號線", color: "#81bf48",
          stations: ["萇山", "中洞", "海雲台", "冬柏", "BEXCO", "Centum City", "民樂", "水營", "廣安", "金蓮山", "南川", "慶星大・釜慶大", "西面", "沙上", "梁山"] },
        { id: "3", name: "3 號線", color: "#bb8c00",
          stations: ["水營", "蓮山", "巨堤", "社稷", "美南", "大渚"] },
        { id: "DH", name: "東海線", color: "#0054a6",
          stations: ["釜田", "巨堤", "教大", "東萊", "Centum", "BEXCO", "新海雲台", "松亭", "奧西利亞", "太和江"] },
      ],
      transfers: [],
      access: {
        haeundae: [{ st: "海雲台", exit: "3 或 5 號出口", walk: 10 }, { st: "中洞", exit: "7 號出口", walk: 10 }],
        gwangalli: [{ st: "廣安", exit: "3 或 5 號出口", walk: 10 }, { st: "金蓮山", walk: 10 }],
        yonggungsa: [{ st: "奧西利亞", exit: "1 號出口", walk: 15, note: "出站後轉 139 號公車或計程車約 10 分鐘" }],
        gamcheon: [{ st: "土城", exit: "6 號出口", walk: 15, note: "出站後轉社區小巴（1-1、2、2-2 號）上山約 10 分鐘" }],
        jagalchi: [{ st: "札嘎其", exit: "10 號出口", walk: 5 }],
        gukje: [{ st: "札嘎其", sign: "BIFF 廣場・國際市場", walk: 7 }, { st: "南浦", sign: "國際市場", walk: 7 }],
        "busan-tower": [{ st: "南浦", exit: "1 號出口（光復路方向）", walk: 7 }],
        seomyeon: [{ st: "西面", walk: 1 }],
      },
    },

    // =================================================================
    fukuoka: {
      lines: [
        { id: "K", name: "空港線（福岡地鐵）", color: "#f37021",
          stations: ["福岡機場", "東比惠", "博多", "祇園", "中洲川端", "天神", "赤坂", "大濠公園", "唐人町", "西新", "姪濱"] },
        { id: "H", name: "箱崎線（福岡地鐵）", color: "#0067b0",
          stations: ["中洲川端", "吳服町", "千代縣廳口", "箱崎宮前", "貝塚"] },
        { id: "N", name: "七隈線（福岡地鐵）", color: "#00a650",
          stations: ["博多", "櫛田神社前", "天神南", "渡邊通", "藥院", "橋本"] },
      ],
      transfers: [["天神", "天神南", 6]],
      access: {
        "hakata-station": [{ st: "博多", walk: 1 }],
        tenjin: [{ st: "天神", walk: 1 }, { st: "天神南", walk: 2 }],
        kushida: [{ st: "櫛田神社前", walk: 3 }, { st: "祇園", walk: 5 }],
        "canal-city": [{ st: "櫛田神社前", sign: "博多運河城", walk: 3 }, { st: "中洲川端", walk: 10 }],
        "nakasu-yatai": [{ st: "中洲川端", walk: 3 }, { st: "天神南", walk: 5 }],
        "ohori-park": [{ st: "大濠公園", exit: "3 號出口", walk: 1 }],
        "fukuoka-tower": [{ st: "西新", walk: 20, note: "也可以從博多、天神搭公車直達「福岡塔南口」" }],
      },
    },

    // =================================================================
    sapporo: {
      lines: [
        { id: "N", name: "南北線（札幌地鐵）", color: "#00a650",
          stations: ["麻生", "北 12 條", "札幌", "大通", "薄野", "中島公園", "真駒內"] },
        { id: "T", name: "東西線（札幌地鐵）", color: "#f58220",
          stations: ["宮之澤", "圓山公園", "西 18 丁目", "西 11 丁目", "大通", "巴士中心前", "菊水", "新札幌"] },
        { id: "H", name: "東豐線（札幌地鐵）", color: "#0079c2",
          stations: ["榮町", "札幌", "大通", "豐水薄野", "福住"] },
        { id: "S", name: "札幌市電（環狀）", color: "#64748b", loop: true,
          stations: ["西 4 丁目", "西 8 丁目", "西 15 丁目", "纜車入口", "中央圖書館前", "薄野", "狸小路"] },
      ],
      transfers: [["西 4 丁目", "大通", 3], ["豐水薄野", "薄野", 4]],
      access: {
        "sapporo-station": [{ st: "札幌", walk: 1 }],
        susukino: [{ st: "薄野", walk: 1 }],
        "hokkaido-jingu": [{ st: "圓山公園", exit: "3 號出口", walk: 15 }],
        "odori-park": [{ st: "大通", walk: 1 }],
        "sapporo-tv-tower": [{ st: "大通", sign: "電視塔", walk: 2 }],
        tanukikoji: [{ st: "大通", sign: "狸小路", walk: 5 }, { st: "薄野", walk: 3 }],
        "nijo-market": [{ st: "巴士中心前", walk: 3 }],
        moiwa: [{ st: "纜車入口", walk: 1, note: "轉免費接駁巴士到藻岩山纜車站" }],
      },
    },

    // =================================================================
    nagoya: {
      lines: [
        { id: "H", name: "東山線（名古屋地鐵）", color: "#f6b500",
          stations: ["高畑", "名古屋", "伏見", "榮", "新榮町", "藤之丘"] },
        { id: "M", name: "名城線（名古屋地鐵，環狀）", color: "#7a4a9c", loop: true,
          stations: ["名古屋城", "久屋大通", "榮", "矢場町", "上前津", "金山", "熱田神宮西", "熱田神宮傳馬町", "八事", "本山", "大曾根"] },
        { id: "T", name: "鶴舞線（名古屋地鐵）", color: "#0078c2",
          stations: ["上小田井", "丸之內", "伏見", "大須觀音", "上前津", "鶴舞", "赤池"] },
        { id: "AN", name: "青波線", color: "#2b4c9b",
          stations: ["名古屋", "金城埠頭"] },
        { id: "MT", name: "名鐵名古屋本線", color: "#e60033",
          stations: ["名鐵岐阜", "榮生", "名鐵名古屋", "金山", "神宮前", "豐橋"] },
      ],
      transfers: [["名古屋", "名鐵名古屋", 5]],
      access: {
        "nagoya-station": [{ st: "名古屋", walk: 1 }, { st: "名鐵名古屋", walk: 1 }],
        "nagoya-castle": [{ st: "名古屋城", exit: "7 號出口", walk: 5 }],
        atsuta: [{ st: "神宮前", walk: 3 }, { st: "熱田神宮傳馬町", walk: 7 }],
        osu: [{ st: "大須觀音", exit: "2 號出口", walk: 1 }, { st: "上前津", exit: "8 號出口", walk: 3 }],
        oasis21: [{ st: "榮", sign: "綠洲 21", walk: 1 }],
        "toyota-museum": [{ st: "榮生", walk: 3 }],
        scmaglev: [{ st: "金城埠頭", walk: 2 }],
      },
    },
  };

  // ---------------------------------------------------------------
  // 找路：先少轉乘，再少站數＋走路時間
  // ---------------------------------------------------------------
  const RIDE = 2;       // 每經過一個列出的車站
  const TRANSFER = 60;  // 每轉乘一次（遠大於多坐幾站：能直達就不轉乘）
  const MAX_TRANSFERS = 3;

  function stationName(st) {
    return /站$/.test(st) ? st : st + "站";
  }

  // 一條線上相鄰的車站（環狀線頭尾相接）
  function neighbors(line, i) {
    const n = line.stations.length;
    const out = [];
    if (i + 1 < n) out.push({ i: i + 1, dir: 1 });
    else if (line.loop) out.push({ i: 0, dir: 1 });
    if (i - 1 >= 0) out.push({ i: i - 1, dir: -1 });
    else if (line.loop) out.push({ i: n - 1, dir: -1 });
    return out;
  }

  function linesAt(net, st) {
    const out = [];
    for (const line of net.lines) {
      const i = line.stations.indexOf(st);
      if (i >= 0) out.push({ line, i });
    }
    return out;
  }

  function walkTransfers(net, st) {
    const out = [];
    for (const [a, b, min] of net.transfers || []) {
      if (a === st) out.push({ st: b, min });
      else if (b === st) out.push({ st: a, min });
    }
    return out;
  }

  // 從一個出入口到另一個出入口的最佳搭法（Dijkstra，狀態 = 路線＋車站）
  function search(net, from, to) {
    const key = (lineId, i) => lineId + "|" + i;
    const dist = new Map();
    const prev = new Map();
    const queue = [];
    const push = (state, cost, back) => {
      const k = key(state.line.id, state.i);
      if (dist.has(k) && dist.get(k) <= cost) return;
      dist.set(k, cost);
      prev.set(k, back);
      queue.push({ state, cost });
    };
    for (const s of linesAt(net, from.st)) {
      if (from.lines && !from.lines.includes(s.line.id)) continue;
      push(s, 0, null);
    }
    let best = null;
    while (queue.length) {
      queue.sort((x, y) => x.cost - y.cost);
      const { state, cost } = queue.shift();
      const k = key(state.line.id, state.i);
      if (dist.get(k) < cost) continue;
      const st = state.line.stations[state.i];
      if (st === to.st && (!to.lines || to.lines.includes(state.line.id))) {
        if (!best || cost < best.cost) best = { cost, k };
        continue;
      }
      if (best && cost >= best.cost) continue;
      const transfers = (prev.get(k) && prev.get(k).transfers) || 0;
      // 同一條線往前或往後
      for (const nb of neighbors(state.line, state.i)) {
        push({ line: state.line, i: nb.i }, cost + RIDE, { k, kind: "ride", dir: nb.dir, transfers });
      }
      if (transfers >= MAX_TRANSFERS) continue;
      // 同站轉乘其他路線
      for (const s of linesAt(net, st)) {
        if (s.line.id === state.line.id) continue;
        push(s, cost + TRANSFER, { k, kind: "transfer", transfers: transfers + 1 });
      }
      // 步行轉乘到附近的其他車站
      for (const w of walkTransfers(net, st)) {
        for (const s of linesAt(net, w.st)) {
          if (s.line.id === state.line.id) continue;
          push(s, cost + TRANSFER + 5 + w.min, { k, kind: "walk", min: w.min, transfers: transfers + 1 });
        }
      }
    }
    if (!best) return null;
    // 還原路徑
    const path = [];
    let k = best.k;
    while (k) {
      const [lineId, i] = k.split("|");
      const back = prev.get(k);
      path.unshift({ lineId, i: Number(i), back });
      k = back ? back.k : null;
    }
    return { cost: best.cost, path };
  }

  // 把路徑整理成「搭某線往某方向，從 X 站到 Y 站」的段落
  function toSegments(net, path) {
    const lineById = (id) => net.lines.find((l) => l.id === id);
    const segs = [];
    let cur = null;
    for (let n = 0; n < path.length; n++) {
      const p = path[n];
      const line = lineById(p.lineId);
      const st = line.stations[p.i];
      const back = p.back;
      if (!back || back.kind !== "ride") {
        if (back && back.kind === "walk") segs.push({ kind: "walk", from: segs.length ? segs[segs.length - 1].to : st, to: st, minutes: back.min });
        cur = { kind: "ride", line, fromIndex: p.i, from: st, to: st, dir: 0, stops: 0 };
        segs.push(cur);
      } else {
        cur.to = st;
        cur.toIndex = p.i;
        cur.dir = back.dir;
        cur.stops++;
      }
    }
    // 沒有真的搭車的段落（只是在同站換線）去掉
    const out = segs.filter((s) => s.kind !== "ride" || s.stops > 0);
    for (const s of out) {
      if (s.kind === "ride") s.towards = towards(s.line, s.fromIndex, s.dir);
    }
    return out;
  }

  // 方向：一般路線寫終點站；環狀線寫接下來會經過的兩個主要站
  function towards(line, i, dir) {
    if (!line.loop) return dir > 0 ? line.stations[line.stations.length - 1] : line.stations[0];
    const n = line.stations.length;
    const next = [1, 2].map((d) => line.stations[(i + dir * d + n * 2) % n]);
    return next.join("・");
  }

  // 景點 A → 景點 B：試過 A、B 每一個出入口的組合，選最好的一個
  function plan(regionId, fromSpot, toSpot) {
    const net = RAIL[regionId];
    if (!net) return null;
    const as = net.access[fromSpot];
    const bs = net.access[toSpot];
    if (!as || !bs) return null;
    let best = null;
    for (const a of as) {
      for (const b of bs) {
        if (a.st === b.st) continue;
        const r = search(net, a, b);
        if (!r) continue;
        const segments = toSegments(net, r.path);
        if (!segments.some((s) => s.kind === "ride")) continue; // 只是走到隔壁站，不用搭車
        const cost = r.cost + a.walk + b.walk;
        if (!best || cost < best.cost) best = { cost, a, b, segments };
      }
    }
    if (!best) {
      // 兩個景點在同一站（或可步行轉乘的相鄰車站）附近
      const near = (x, y) => x === y || (net.transfers || []).some(([p, q]) => (p === x && q === y) || (p === y && q === x));
      const same = as.find((a) => bs.some((b) => near(a.st, b.st)));
      return same ? { sameStation: stationName(same.st) } : null;
    }
    return {
      from: best.a,
      to: best.b,
      segments: best.segments,
      transfers: best.segments.filter((s) => s.kind === "ride").length - 1,
    };
  }

  function has(regionId, spotId) {
    return !!(RAIL[regionId] && RAIL[regionId].access[spotId]);
  }

  const api = { RAIL, plan, has, stationName };
  root.RailGuide = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
