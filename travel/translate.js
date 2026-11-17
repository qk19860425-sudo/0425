// 日韓景點路線：翻譯分頁
//   A. 常用語句：依情境分類，可念出來（手機內建語音）或放大給對方看，離線可用
//   B. 自由輸入：按按鈕用 Google 翻譯或 Papago 開啟，文字已經填好（需要網路）
(function () {
  "use strict";

  const PHRASES = window.PHRASES || [];
  const CATEGORIES = window.PHRASE_CATEGORIES || [];
  const $ = (id) => document.getElementById(id);

  const LANGS = {
    ja: { label: "日文", speech: "ja-JP", text: "ja", roma: "jaRoma" },
    ko: { label: "韓文", speech: "ko-KR", text: "ko", roma: "koRoma" },
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function readPref(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }
  function savePref(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* 無法儲存時忽略 */ }
  }

  const state = {
    lang: LANGS[readPref("travel-phrase-lang", "ja")] ? readPref("travel-phrase-lang", "ja") : "ja",
    category: CATEGORIES[0] || "",
  };

  // ---------- 語音 ----------
  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  function hasVoice(speechLang) {
    if (!canSpeak) return false;
    const voices = window.speechSynthesis.getVoices();
    // 有些瀏覽器一開始拿不到語音清單，這時先當作可以念
    if (!voices.length) return true;
    return voices.some((v) => v.lang && v.lang.toLowerCase().startsWith(speechLang.slice(0, 2)));
  }

  function speak(text, speechLang) {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechLang;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function updateVoiceNote() {
    const note = $("voice-note");
    const lang = LANGS[state.lang];
    if (!canSpeak) {
      note.textContent = "這個瀏覽器不支援語音朗讀，可以改用「放大給對方看」。";
      note.hidden = false;
    } else if (!hasVoice(lang.speech)) {
      note.textContent = "這支手機沒有" + lang.label + "語音。可以到系統設定下載" + lang.label + "語音，或改用「放大給對方看」。";
      note.hidden = false;
    } else {
      note.hidden = true;
    }
  }
  if (canSpeak) window.speechSynthesis.addEventListener("voiceschanged", updateVoiceNote);

  // ---------- 放大顯示 ----------
  const overlay = $("phrase-overlay");
  let lastFocus = null;

  function showBig(phrase) {
    const lang = LANGS[state.lang];
    $("overlay-text").textContent = phrase[lang.text];
    $("overlay-text").lang = lang.text;
    $("overlay-roma").textContent = phrase[lang.roma];
    $("overlay-zh").textContent = phrase.zh;
    $("overlay-speak").hidden = !canSpeak;
    $("overlay-speak").onclick = () => speak(phrase[lang.text], lang.speech);
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("no-scroll");
    $("overlay-close").focus();
  }

  function hideBig() {
    overlay.hidden = true;
    document.body.classList.remove("no-scroll");
    if (canSpeak) window.speechSynthesis.cancel();
    if (lastFocus) lastFocus.focus();
  }
  $("overlay-close").addEventListener("click", hideBig);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) hideBig(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) hideBig(); });

  // ---------- 常用語句 ----------
  function chip(text, pressed, onClick) {
    const b = el("button", "chip", text);
    b.type = "button";
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", onClick);
    return b;
  }

  function renderControls() {
    $("phrase-langs").replaceChildren(...Object.entries(LANGS).map(([id, l]) =>
      chip(l.label, id === state.lang, () => {
        state.lang = id;
        savePref("travel-phrase-lang", id);
        renderControls();
        renderPhrases();
      })));
    $("phrase-categories").replaceChildren(...CATEGORIES.map((c) =>
      chip(c + "（" + PHRASES.filter((p) => p.category === c).length + "）", c === state.category, () => {
        state.category = c;
        renderControls();
        renderPhrases();
      })));
    updateVoiceNote();
  }

  function renderPhrases() {
    const lang = LANGS[state.lang];
    const list = PHRASES.filter((p) => p.category === state.category);
    $("phrase-list").replaceChildren(...list.map((p) => {
      const li = el("li", "card phrase");
      li.append(el("p", "phrase-zh", p.zh));
      const target = el("p", "phrase-target", p[lang.text]);
      target.lang = lang.text;
      li.append(target, el("p", "phrase-roma", p[lang.roma]));
      const actions = el("div", "phrase-actions");
      if (canSpeak) {
        const s = el("button", "button button-small", "🔊 念出來");
        s.type = "button";
        s.setAttribute("aria-label", "用" + lang.label + "念出「" + p.zh + "」");
        s.addEventListener("click", () => speak(p[lang.text], lang.speech));
        actions.append(s);
      }
      const big = el("button", "button button-secondary button-small", "放大給對方看");
      big.type = "button";
      big.addEventListener("click", () => showBig(p));
      actions.append(big);
      li.append(actions);
      return li;
    }));
  }

  // ---------- 自由輸入：開啟翻譯 App ----------
  const TARGETS = {
    ja: { label: "日文", google: "ja", papago: "ja" },
    ko: { label: "韓文", google: "ko", papago: "ko" },
    en: { label: "英文", google: "en", papago: "en" },
  };

  function googleUrl(text, target) {
    return "https://translate.google.com/?sl=zh-TW&tl=" + target + "&text=" + encodeURIComponent(text) + "&op=translate";
  }
  function papagoUrl(text, target) {
    return "https://papago.naver.com/?sk=zh-TW&tk=" + target + "&st=" + encodeURIComponent(text);
  }

  const BUILDERS = {
    "open-google": (text, t) => googleUrl(text, t.google),
    "open-papago": (text, t) => papagoUrl(text, t.papago),
  };

  // 提示訊息：type 為 "error"（紅字）或 "info"（一般）
  function showFreeMessage(text, type) {
    const msg = $("free-hint");
    msg.textContent = text;
    msg.classList.toggle("free-error", type === "error");
    msg.hidden = !text;
  }

  // 只負責外觀（按鈕變淡）；真正的網址在按下的當下才產生。
  // 手機中文輸入法打字時，有時不會觸發 input 事件，所以不能只靠事件更新連結。
  function updateLinkLook() {
    const empty = !$("free-text").value.trim();
    for (const id of Object.keys(BUILDERS)) $(id).classList.toggle("is-disabled", empty);
  }

  for (const [id, t] of Object.entries(TARGETS)) {
    const o = el("option", "", "翻成" + t.label);
    o.value = id;
    $("free-target").append(o);
  }
  for (const ev of ["input", "change", "compositionend", "keyup"]) {
    $("free-text").addEventListener(ev, () => { updateLinkLook(); if ($("free-text").value.trim()) showFreeMessage("", ""); });
  }

  for (const id of Object.keys(BUILDERS)) {
    $(id).addEventListener("click", (e) => {
      const text = $("free-text").value.trim();
      if (!text) {
        e.preventDefault();
        showFreeMessage("請先在上面輸入想說的話，再按按鈕。", "error");
        $("free-text").focus();
        return;
      }
      // 按下的當下才設定網址，瀏覽器接著就會開啟這個連結
      $(id).href = BUILDERS[id](text, TARGETS[$("free-target").value]);
      // 順便把文字複製到剪貼簿；翻譯 App 沒有自動帶入時可以直接貼上
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          () => showFreeMessage("已開啟翻譯，文字也複製好了；如果沒有自動帶入，長按輸入框貼上即可。", "info"),
          () => showFreeMessage("已開啟翻譯；如果文字沒有自動帶入，請回來複製後貼上。", "info")
        );
      } else {
        showFreeMessage("已開啟翻譯；如果文字沒有自動帶入，請回來複製後貼上。", "info");
      }
    });
  }

  renderControls();
  renderPhrases();
  updateLinkLook();
  showFreeMessage("先輸入文字，再按按鈕開啟翻譯。", "info");
})();
