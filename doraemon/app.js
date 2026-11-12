// 哆啦A夢搜尋入口：組出各網站的搜尋網址
(function () {
  "use strict";

  const NAME = "哆啦A夢";
  // 已包含這些字時，就不再自動加上「哆啦A夢」
  const NAME_PATTERN = /哆啦|多啦|叮噹|小叮噹|doraemon|ドラえもん/i;

  const SITES = [
    { id: "google", name: "Google", url: (q) => "https://www.google.com/search?q=" + encodeURIComponent(q) },
    { id: "google-images", name: "Google 圖片", url: (q) => "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q) },
    { id: "youtube", name: "YouTube", url: (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q) },
    { id: "wikipedia", name: "維基百科", url: (q) => "https://zh.wikipedia.org/w/index.php?variant=zh-tw&search=" + encodeURIComponent(q) },
    { id: "bing", name: "Bing", url: (q) => "https://www.bing.com/search?q=" + encodeURIComponent(q) },
    { id: "yahoo-news", name: "Yahoo 新聞", url: (q) => "https://tw.news.search.yahoo.com/search?p=" + encodeURIComponent(q) },
    { id: "anigamer", name: "巴哈姆特動畫瘋", url: (q) => "https://ani.gamer.com.tw/search.php?keyword=" + encodeURIComponent(q) },
    { id: "books", name: "博客來", url: (q) => "https://search.books.com.tw/search/query/key/" + encodeURIComponent(q) },
  ];

  const QUICK = ["秘密道具", "大長篇電影", "主題曲", "角色介紹", "任意門", "竹蜻蜓", "大雄", "最新消息"];

  const form = document.getElementById("search-form");
  const keyword = document.getElementById("keyword");
  const addName = document.getElementById("add-name");
  const siteBox = document.getElementById("sites");
  const quickBox = document.getElementById("quick");
  const more = document.getElementById("more");
  const moreLinks = document.getElementById("more-links");
  const queryText = document.getElementById("query-text");

  let selectedSite = SITES[0].id;

  function readPref() {
    try { return localStorage.getItem("doraemon-site"); } catch (e) { return null; }
  }
  function savePref(id) {
    try { localStorage.setItem("doraemon-site", id); } catch (e) { /* 無法儲存時忽略 */ }
  }
  const saved = readPref();
  if (SITES.some((s) => s.id === saved)) selectedSite = saved;

  // ---- 網站選擇 ----
  function renderSites() {
    siteBox.replaceChildren(...SITES.map((site) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = site.name;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(site.id === selectedSite));
      b.addEventListener("click", () => {
        selectedSite = site.id;
        savePref(site.id);
        renderSites();
      });
      return b;
    }));
  }

  // ---- 常用關鍵字：點了填入關鍵字欄 ----
  quickBox.replaceChildren(...QUICK.map((word) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip chip-light";
    b.textContent = word;
    b.addEventListener("click", () => {
      keyword.value = word;
      keyword.focus();
    });
    return b;
  }));

  // ---- 組出搜尋字詞 ----
  function buildQuery() {
    const k = keyword.value.trim().replace(/\s+/g, " ");
    if (!k) return NAME;
    if (addName.checked && !NAME_PATTERN.test(k)) return NAME + " " + k;
    return k;
  }

  function renderMore(q) {
    queryText.textContent = q;
    moreLinks.replaceChildren(...SITES.map((site) => {
      const a = document.createElement("a");
      a.className = "button button-secondary";
      a.href = site.url(q);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = site.name;
      return a;
    }));
    more.hidden = false;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = buildQuery();
    const site = SITES.find((s) => s.id === selectedSite);
    renderMore(q);
    keyword.blur();
    // 不用 "noopener" 參數：加了它 window.open 一律回傳 null，就無法判斷是否被擋。
    const win = window.open(site.url(q), "_blank");
    if (win) {
      win.opener = null;
    } else {
      // 被瀏覽器擋下彈出視窗時，直接在本頁開啟
      window.location.href = site.url(q);
    }
  });

  renderSites();
})();
