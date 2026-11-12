// 報修登記：表單送出與清單顯示
(function () {
  "use strict";

  const TABLE = "repair_requests";
  const LIST_LIMIT = 20;
  const CATEGORIES = ["設備", "網路", "環境", "其他"];
  const URGENCIES = ["低", "中", "高"];

  const form = document.getElementById("repair-form");
  const submitButton = document.getElementById("submit-button");
  const formMessage = document.getElementById("form-message");
  const configWarning = document.getElementById("config-warning");
  const list = document.getElementById("request-list");
  const listMessage = document.getElementById("list-message");
  const refreshButton = document.getElementById("refresh-button");
  const description = document.getElementById("description");
  const descriptionCount = document.getElementById("description-count");

  const timeFormatter = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  // ---- 訊息顯示 ----
  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "message" + (type ? " message-" + type : "");
    el.hidden = !text;
  }

  // ---- 檢查設定，建立連線 ----
  function createClient() {
    const config = window.APP_CONFIG || {};
    const url = (config.supabaseUrl || "").trim();
    const key = (config.supabaseKey || "").trim();

    let problem = "";
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      problem = "無法載入 Supabase 程式庫，請檢查網路連線後重新整理頁面。";
    } else if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url)) {
      problem = "config.js 的 Supabase 網址格式不正確。";
    } else if (key.startsWith("sb_secret_")) {
      problem = "config.js 放的是 secret 金鑰，不能用在網頁上。請立刻到 Supabase 撤銷這把金鑰，改用 publishable key。";
    } else if (!key || key.startsWith("請")) {
      problem = "尚未設定 publishable key：請編輯 config.js，填入 Supabase 的 publishable key。";
    }

    if (problem) {
      showMessage(configWarning, problem, "error");
      return null;
    }
    return window.supabase.createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const client = createClient();
  if (!client) {
    submitButton.disabled = true;
    refreshButton.disabled = true;
  }

  // ---- 錯誤訊息轉成中文 ----
  function describeError(error) {
    if (!error) return "發生未知錯誤，請稍後再試。";
    const msg = String(error.message || "");
    if (error.code === "23514") return "資料不符合規則（選項或長度不正確），請檢查後再送出。";
    if (error.code === "23502") return "有必填欄位沒有填寫。";
    if (error.code === "42501") return "沒有權限執行這個動作，請確認資料庫權限設定。";
    if (error.code === "42P01" || error.code === "PGRST205") return "找不到 repair_requests 資料表，請先執行 supabase/schema.sql。";
    if (/fetch|network|Failed to fetch|NetworkError/i.test(msg)) return "無法連線到伺服器，請檢查網路後再試。";
    if (/api key|apikey|JWT|Invalid/i.test(msg)) return "金鑰無效，請確認 config.js 的 publishable key。";
    return "送出失敗：" + msg;
  }

  // ---- 表單驗證 ----
  function readForm() {
    const data = new FormData(form);
    const row = {
      reporter_name: String(data.get("reporter_name") || "").trim(),
      location: String(data.get("location") || "").trim(),
      category: String(data.get("category") || ""),
      description: String(data.get("description") || "").trim(),
      urgency: String(data.get("urgency") || "中"),
    };

    const errors = [];
    if (!row.reporter_name) errors.push("請填寫報修人");
    if (!row.location) errors.push("請填寫地點或部門");
    if (!CATEGORIES.includes(row.category)) errors.push("請選擇類別");
    if (!row.description) errors.push("請填寫問題說明");
    if (!URGENCIES.includes(row.urgency)) errors.push("請選擇緊急程度");
    if (row.reporter_name.length > 50) errors.push("報修人最多 50 字");
    if (row.location.length > 100) errors.push("地點或部門最多 100 字");
    if (row.description.length > 1000) errors.push("問題說明最多 1000 字");

    return { row, errors };
  }

  // ---- 送出 ----
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!client) return;

    const { row, errors } = readForm();
    if (errors.length) {
      showMessage(formMessage, errors.join("、") + "。", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "送出中…";
    showMessage(formMessage, "", "");

    try {
      // 只送 5 個欄位；id、created_at、status 由資料庫自動產生。
      const { error } = await client.from(TABLE).insert(row);
      if (error) {
        showMessage(formMessage, describeError(error), "error");
        return;
      }
      showMessage(formMessage, "已送出報修，謝謝！", "success");
      form.reset();
      updateCount();
      await loadList();
    } catch (err) {
      showMessage(formMessage, describeError(err), "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "送出報修";
    }
  });

  // ---- 清單 ----
  function badge(text, kind) {
    const span = document.createElement("span");
    span.className = "badge badge-" + kind;
    span.textContent = text;
    return span;
  }

  const URGENCY_KIND = { "低": "low", "中": "mid", "高": "high" };
  const STATUS_KIND = { "待處理": "todo", "處理中": "doing", "已完成": "done" };

  function renderItem(item) {
    const li = document.createElement("li");
    li.className = "request-item";

    const top = document.createElement("div");
    top.className = "request-top";
    top.append(
      badge(item.status, STATUS_KIND[item.status] || "todo"),
      badge(item.category, "category"),
      badge("緊急：" + item.urgency, URGENCY_KIND[item.urgency] || "mid")
    );

    const desc = document.createElement("p");
    desc.className = "request-desc";
    desc.textContent = item.description;

    const meta = document.createElement("p");
    meta.className = "request-meta";
    const time = document.createElement("time");
    time.dateTime = item.created_at;
    time.textContent = timeFormatter.format(new Date(item.created_at));
    meta.append(item.reporter_name + "・" + item.location + "・", time);

    li.append(top, desc, meta);
    return li;
  }

  async function loadList() {
    if (!client) return;
    refreshButton.disabled = true;
    showMessage(listMessage, "載入中…", "");
    try {
      const { data, error } = await client
        .from(TABLE)
        .select("id, created_at, reporter_name, location, category, description, urgency, status")
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT);

      if (error) {
        showMessage(listMessage, describeError(error).replace(/^送出失敗/, "載入失敗"), "error");
        return;
      }
      list.replaceChildren(...data.map(renderItem));
      showMessage(listMessage, data.length ? "" : "目前還沒有報修資料。", "");
    } catch (err) {
      showMessage(listMessage, describeError(err).replace(/^送出失敗/, "載入失敗"), "error");
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener("click", loadList);

  // ---- 字數計數 ----
  function updateCount() {
    descriptionCount.textContent = String(description.value.length);
  }
  description.addEventListener("input", updateCount);

  loadList();
})();
