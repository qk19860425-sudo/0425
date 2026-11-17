// 模型玩具指南：把 guide.js 的內容顯示成可展開的區塊
(function () {
  "use strict";
  const guide = window.MODEL_GUIDE;
  const box = document.getElementById("guide-content");
  if (!guide || !box) return;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  const parts = guide.sections.map((sec, i) => {
    const det = el("details", "card guide-section");
    if (i === 0) det.open = true;
    det.append(el("summary", "guide-summary", sec.title));
    for (const item of sec.items) det.append(el("h3", "guide-item-title", item.title), el("p", "guide-item-body", item.body));
    return det;
  });

  const src = el("details", "card guide-section");
  src.append(el("summary", "guide-summary", "資料來源"));
  const ul = el("ul", "guide-sources");
  for (const s of guide.sources) {
    const li = el("li");
    const a = el("a", "", s.title);
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    li.append(a);
    ul.append(li);
  }
  src.append(ul);
  parts.push(src);
  box.replaceChildren(...parts);
  const upd = document.getElementById("guide-updated");
  if (upd) upd.textContent = guide.updated;
})();
