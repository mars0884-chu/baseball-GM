/* ---------- 畫面渲染 ---------- */
/* v39⑥：次要說明文字摺疊——把輔助說明收進「▸ 詳情」<details>，預設隱藏、點擊展開。
   只包「規則說明類」文字；狀態/結果/警告類訊息維持直接顯示。 */
function foldNote(html, label) {
  return `<details class="fold"><summary>${label || "詳情"}</summary>${html}</details>`;
}

/* v60-r007：跨模組 renderer 相容橋接。
   某些瀏覽器對 classic script 的 global lexical binding 處理不同；
   這裡直接讀取單檔內嵌 JSON，確保 APP、球場、新聞與內容畫面不會退回純文字。 */
function v60CompatArtDataUrl(key) {
  try {
    const cache = window.__v60CompatArtCache || (window.__v60CompatArtCache = {});
    const status = window.__v60CompatArtStatus || (window.__v60CompatArtStatus = {});
    const keyText = String(key || "");
    const v57Key = /^(analysis_rehab_base_generated|dorm_base_generated|medical_base_generated|rehab_base_generated|scouting_base_generated|stadium_lv1_generated|stadium_lv3_generated|stadium_lv5_generated|stadium_lv7_generated|training_base_generated)$/.test(keyText);
    const ids = v57Key ? ["v57-art-assets", "v58-art-assets"] : ["v58-art-assets", "v57-art-assets"];
    ids.forEach(function(id) {
      if (status[id]) return;
      const node = document.getElementById(id);
      if (!node || !node.textContent) return;
      try {
        Object.assign(cache, JSON.parse(node.textContent) || {});
        status[id] = true;
      } catch (_) {}
    });
    return cache[key] || "";
  } catch (_) { return ""; }
}
function v60CompatAppIconDataUrl() {
  return (typeof globalThis !== "undefined" && globalThis.v60AppIconDataUrl instanceof Function)
    ? globalThis.v60AppIconDataUrl()
    : "icon-512.png";
}
function v60CompatVisualScene(key, alt, kicker, title, detail, extraClass) {
  const src = v60CompatArtDataUrl(key);
  if (!src) return "";
  const cls = extraClass ? ` ${extraClass}` : "";
  return `<section class="v60-visual-scene${cls}" data-v60-art-key="${key}" data-v60-art-source="approved-scene-png" aria-label="${alt}">
    <div class="v60-visual-scene-art"><img src="${src}" alt="${alt}"></div>
    <div class="v60-visual-scene-copy"><span class="v60-visual-kicker">${kicker}</span><strong>${title}</strong><span>${detail}</span></div>
  </section>`;
}
/* v60-r007：大型內嵌美術 JSON 位於模組腳本之後；若 IndexedDB 讀檔先完成，
   初次 render 可能早於素材節點解析。DOM 完成後只重繪一次，讓 APP／球場／新聞
   的實際畫面使用已存在的素材；不寫入 S、不觸發模擬、不呼叫亂數。 */
var v60ArtReadyRerenderBound = false;
function v60BindArtReadyRerender() {
  if (v60ArtReadyRerenderBound || typeof document === "undefined" || document.readyState !== "loading") return;
  v60ArtReadyRerenderBound = true;
  document.addEventListener("DOMContentLoaded", function() {
    try {
      if (typeof render === "function" && typeof S !== "undefined" && S && typeof UI !== "undefined" && UI) render();
    } catch (e) { console.error("[v60-art-ready-rerender]", e); }
  }, { once: true });
}
/* v56-001：內容圖像化 presentation adapter（只讀現有 S／UI，不新增狀態）。
   每次既有 render() 完成後，在原卡片前插入可辨識的 SVG 摘要；完整原文與既有按鈕保留。
   這個 adapter 不參與事件、模擬、Save 或 RNG，素材缺失時也只會略過視覺摘要。 */
function v56ContentEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}
function v56ContentSvg(domain) {
  const svg = {
    events: '<svg viewBox="0 0 120 56" aria-hidden="true"><path d="M9 43h102" stroke="#B7D3F5" stroke-width="6" stroke-linecap="round"/><circle cx="25" cy="43" r="8" fill="#26D9E8" stroke="#143CFF" stroke-width="3"/><circle cx="60" cy="43" r="8" fill="#FFE552" stroke="#143CFF" stroke-width="3"/><circle cx="95" cy="43" r="8" fill="#FF3D4F" stroke="#143CFF" stroke-width="3"/><path d="m59 6-19 23h13l-5 18 25-28H59Z" fill="#143CFF"/></svg>',
    mail: '<svg viewBox="0 0 120 56" aria-hidden="true"><rect x="12" y="13" width="76" height="39" rx="6" fill="#fff" stroke="#143CFF" stroke-width="4"/><path d="m15 16 35 27 35-27" fill="none" stroke="#26D9E8" stroke-width="4"/><circle cx="94" cy="14" r="11" fill="#FF3D4F"/><text x="94" y="18" text-anchor="middle" font-size="11" font-weight="900" fill="#fff">1</text></svg>',
    news: '<svg viewBox="0 0 120 56" aria-hidden="true"><rect x="13" y="7" width="70" height="45" rx="5" fill="#fff" stroke="#143CFF" stroke-width="4"/><path d="M23 19h49M23 29h49M23 39h31" stroke="#26D9E8" stroke-width="5" stroke-linecap="round"/><rect x="91" y="20" width="19" height="20" rx="4" fill="#FF3D4F"/><text x="100.5" y="33" text-anchor="middle" font-size="8" font-weight="900" fill="#fff">LIVE</text></svg>',
    milestones: '<svg viewBox="0 0 120 56" aria-hidden="true"><circle cx="34" cy="28" r="20" fill="none" stroke="#B7D3F5" stroke-width="7"/><path d="M34 8a20 20 0 0 1 18 28" fill="none" stroke="#26D9E8" stroke-width="7" stroke-linecap="round"/><path d="m34 16 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z" fill="#FFE552" stroke="#143CFF" stroke-width="2"/><path d="M70 19h37M70 29h25M70 39h31" stroke="#143CFF" stroke-width="4" stroke-linecap="round"/></svg>',
    awards: '<svg viewBox="0 0 120 56" aria-hidden="true"><path d="M12 49h96M25 49V34h20v15M50 49V20h20v29M75 49V29h20v20" fill="#EAF5FF" stroke="#143CFF" stroke-width="4"/><circle cx="60" cy="10" r="8" fill="#FFE552" stroke="#FF3D4F" stroke-width="3"/></svg>',
    championship: '<svg viewBox="0 0 120 56" aria-hidden="true"><path d="M37 11h46v15a23 23 0 0 1-46 0V11Z" fill="#FFE552" stroke="#143CFF" stroke-width="4"/><path d="M37 17H21a16 16 0 0 0 16 17M83 17h16a16 16 0 0 1-16 17M60 42v9M43 53h34" fill="none" stroke="#FF3D4F" stroke-width="4" stroke-linecap="round"/></svg>',
    'hall-of-fame': '<svg viewBox="0 0 120 56" aria-hidden="true"><rect x="18" y="6" width="48" height="44" rx="5" fill="#fff" stroke="#143CFF" stroke-width="4"/><circle cx="42" cy="22" r="9" fill="#26D9E8"/><path d="M28 44a14 14 0 0 1 28 0" fill="#EAF5FF" stroke="#143CFF" stroke-width="3"/><path d="m91 8 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z" fill="#FFE552" stroke="#FF3D4F" stroke-width="2"/></svg>',
    chains: '<svg viewBox="0 0 120 56" aria-hidden="true"><path d="M16 28h88" stroke="#B7D3F5" stroke-width="5" stroke-linecap="round"/><circle cx="18" cy="28" r="10" fill="#26D9E8" stroke="#143CFF" stroke-width="3"/><circle cx="60" cy="28" r="10" fill="#FFE552" stroke="#143CFF" stroke-width="3"/><circle cx="102" cy="28" r="10" fill="#FF3D4F" stroke="#143CFF" stroke-width="3"/><path d="m40 22 8 6-8 6M82 22l8 6-8 6" fill="none" stroke="#143CFF" stroke-width="3"/></svg>'
  };
  return svg[domain] || svg.news;
}
function v56ContentSummary(domain, state, title, detail) {
  const labels = { events: "事件", mail: "郵件", news: "新聞", milestones: "里程碑", awards: "獎項", championship: "冠軍", "hall-of-fame": "名人堂", chains: "連鎖" };
  return `<section class="v56-live-summary" data-v56-domain="${v56ContentEscape(domain)}" aria-label="${v56ContentEscape(labels[domain] || "內容")}圖像摘要">
    <div class="v56-live-summary-art">${v56ContentSvg(domain)}</div>
    <div class="v56-live-summary-copy"><span class="v56-live-summary-kicker">圖像摘要・${v56ContentEscape(labels[domain] || "內容")}</span><strong>${v56ContentEscape(title)}</strong><span>${v56ContentEscape(state)}・${v56ContentEscape(detail)}</span><small>完整訊息與既有操作保留在下方。</small></div>
  </section>`;
}
function v56InsertSummary(target, html) {
  if (!target || !html || target.querySelector(".v56-live-summary")) return;
  target.insertAdjacentHTML("afterbegin", html);
}
function v56DecorateRenderedContent() {
  if (typeof app === "undefined" || !app || typeof app.querySelectorAll !== "function" || typeof app.querySelector !== "function" || typeof S === "undefined" || typeof UI === "undefined") return;
  app.querySelectorAll(".v56-live-summary").forEach(function (node) { node.remove(); });
  if (UI.screen === "dashboard") {
    const ev = S.activeEvent;
    if (ev) {
      const domain = ev.chained ? "chains" : "events";
      const target = app.querySelector(".event-opt-btn") ? app.querySelector(".event-opt-btn").closest(".issuecard") : null;
      v56InsertSummary(target, v56ContentSummary(domain, ev.chained ? "後續發展待處理" : "突發事件待決策", ev.title || "目前事件", ev.desc || "請查看下方完整訊息與既有選項。"));
    }
    const mailList = app.querySelector(".v43maillist");
    if (mailList && !app.querySelector(".v58-mail-scene")) {
      const mail = Array.isArray(S.v43 && S.v43.mail) ? S.v43.mail : [];
      const unread = mail.filter(function (item) { return item.unread; }).length;
      v56InsertSummary(mailList.closest(".card"), v56ContentSummary("mail", unread ? "有未讀待處理" : "目前無未讀", "收件匣狀態", `${unread} 封未讀・共 ${mail.length} 封`));
    }
    const newsCard = app.querySelector(".newscard");
    if (newsCard && !app.querySelector(".v60-news-scene")) v56InsertSummary(newsCard, v56ContentSummary("news", "最新快訊已更新", "聯盟消息流", `${(S.newsFeed || []).length} 則可查閱`));
    const ms = app.querySelector(".v48milestone-card");
    if (ms) v56InsertSummary(ms, v56ContentSummary("milestones", "里程碑已達成", "生涯成長節點", "查看下方既有回應選項。"));
    const dev = app.querySelector(".v54-ms-promote2, .v54-ms-promote1");
    if (dev) v56InsertSummary(dev.closest(".card"), v56ContentSummary("milestones", "育成節點待處理", "球員培養進度", "升格或繼續培養的既有選項保留。"));
    const hofPending = app.querySelector(".v48hof-card");
    if (hofPending) v56InsertSummary(hofPending, v56ContentSummary("hall-of-fame", "提名待核准", "永久生涯紀錄", "完整成績與既有核准按鈕保留。"));
  } else if (UI.screen === "awards") {
    const wrap = app.querySelector(".wrap");
    v56InsertSummary(wrap, v56ContentSummary("awards", "年度結果可查", "年度榮譽席位", "下方獎項卡保留真實球員與統計依據。"));
  } else if (UI.screen === "playoffs") {
    const wrap = app.querySelector(".wrap");
    const p = S.playoffs || {};
    v56InsertSummary(wrap, v56ContentSummary("championship", p.champion ? "冠軍已寫入歷史" : "季後賽進行中", "賽季結果出口", "冠軍資料只讀取既有比賽結果。"));
  } else if (UI.screen === "hallOfFame" && !app.querySelector(".v58-hof-scene")) {
    const wrap = app.querySelector(".wrap");
    v56InsertSummary(wrap, v56ContentSummary("hall-of-fame", "永久紀錄可查", "名人堂", "下方保留入選、退休背號與完整生涯資料。"));
  }
}
/* v57-002：Dashboard 上半部主視覺。
   直接使用四張獨立生成的完整球場 PNG，依現有球場等級只讀顯示完成／未解鎖狀態；不寫入 S、不改升級規則。 */
function v57DashboardHero(team) {
  if (!team || typeof v57FacilityVisualProfile !== "function") return "";
  const currentLevel = Math.max(1, Number(team.facility && team.facility.level) || 1);
  const labels = { 1: "在地開放球場", 3: "城市球場", 5: "都會旗艦球場", 7: "全封閉巨蛋" };
  const profile = v57FacilityVisualProfile(currentLevel);
  const src = v60CompatArtDataUrl(profile.artKey);
  const anchors = [1, 3, 5, 7];
  const stageRail = anchors.map(function (level) {
    const reached = currentLevel >= level;
    return `<span class="v60-stadium-stage ${reached ? "reached" : "locked"}"><b>Lv${level}</b>${labels[level]}</span>`;
  }).join("");
  return `<section class="v57-dashboard-hero" data-v57-dashboard-hero="true" aria-label="球場升級計畫">
    <div class="v57-dashboard-hero-heading"><span class="v57-facility-kicker">STADIUM VISUAL・DASHBOARD</span><h2>主場球場</h2><span>目前 Lv.${currentLevel}・${labels[currentLevel] || "球場升級中"}</span></div>
    <div class="v60-dashboard-featured">
      <div class="v60-dashboard-featured-art">${src ? `<img src="${src}" alt="Lv${currentLevel} ${labels[currentLevel] || "主場球場"}" data-v60-art-source="approved-stadium-png">` : `<div class="v57-dashboard-art-missing">素材未載入</div>`}</div>
      <div class="v60-dashboard-featured-copy"><span class="v60-dashboard-kicker">HOME STADIUM</span><strong>${labels[currentLevel] || "主場球場"}</strong><span>球場等級、容量與格位狀態已由「球場硬體建設」保留完整操作。</span><button id="btn-dashboard-facilities" class="btn-secondary" type="button">查看球場硬體建設</button></div>
    </div>
    <div class="v60-stadium-rail" aria-label="球場升級階段">${stageRail}</div>
  </section>`;
}
/* ====================================================================
   v40 A案：uiTabs 輕量分頁元件。
   - 所有面板同時渲染進DOM，僅以CSS class 切換顯示 → 換頁不重繪、表單輸入不遺失、既有事件掛線邏輯零改動。
   - 分頁選擇記在 UI.tabs[key]（同一畫面往返時記住上次停留頁）；不寫入存檔。
   - badge：頁籤右上角小紅點數字（如待辦數、財務警示數），0 或未給則不顯示。
   ==================================================================== */
function uiTabs(key, tabs) {
  UI.tabs = UI.tabs || {};
  const valid = tabs.map(t => t.key);
  let active = UI.tabs[key];
  if (!valid.includes(active)) active = valid[0];
  UI.tabs[key] = active;
  return `<div class="uitabs" data-tabkey="${key}">
    <div class="uitab-bar">
      ${tabs.map(t => `<button type="button" class="uitab-btn ${t.key === active ? "active" : ""}" data-tabgroup="${key}" data-tab="${t.key}">${t.label}${t.badge ? `<span class="uitab-badge">${t.badge}</span>` : ""}</button>`).join("")}
    </div>
    ${tabs.map(t => `<div class="uitab-panel ${t.key === active ? "active" : ""}" data-tabgroup="${key}" data-tab="${t.key}">${t.html}</div>`).join("")}
  </div>`;
}
function wireUiTabs() {
  if (!app || !app.querySelectorAll) return;
  app.querySelectorAll(".uitab-btn").forEach(btn => {
    btn.onclick = () => {
      const group = btn.dataset.tabgroup, tab = btn.dataset.tab;
      UI.tabs = UI.tabs || {};
      UI.tabs[group] = tab;
      app.querySelectorAll(`.uitab-btn[data-tabgroup="${group}"]`).forEach(b => { if (b.classList && b.classList.toggle) b.classList.toggle("active", b.dataset.tab === tab); });
      app.querySelectorAll(`.uitab-panel[data-tabgroup="${group}"]`).forEach(pn => { if (pn.classList && pn.classList.toggle) pn.classList.toggle("active", pn.dataset.tab === tab); });
    };
  });
}
function render() {
  // v35.1：全域渲染防護——任何畫面渲染拋錯都落到安全模式，不留白屏（手機「只剩綠底」的根治）
  try { v60BindArtReadyRerender(); } catch (_) {}
  try { if (document.body && document.body.setAttribute) document.body.setAttribute("data-skin", (S && S.skin) || "emoji"); } catch (_) {} // v41⑦：皮膚插槽（預設emoji）
  try { if (document.body && document.body.setAttribute) document.body.setAttribute("data-screen", (typeof UI !== "undefined" && UI && UI.screen) || ""); } catch (_) {} // v47：分頁背景槽位（未導入資產包時無任何視覺變化）
  try { if (typeof v49ClearPortraitCache === "function") v49ClearPortraitCache(); } catch (_) {} // v49：清除肖像快取（轉隊後即時換帽）
  try { const r = renderScreen(); try { wireUiTabs(); } catch (_) {} try { v56DecorateRenderedContent(); } catch (e) { console.error("[v56-content-visualization]", e); } return r; }
  catch (e) {
    UI.__bootError = "畫面渲染發生錯誤：" + ((e && e.message) || e);
    try { return renderBootRecovery(); }
    catch (_) {
      var __el = document.getElementById("app");
      if (__el) __el.innerHTML = '<div style="padding:24px;color:#F5F1E6;font-family:-apple-system,sans-serif;line-height:1.7">載入時發生錯誤，畫面無法顯示。請清除此檔案／網站的瀏覽器資料後重新開啟，或把情況回報給開發者。</div>';
    }
  }
}
function renderScreen() {
  // v27：遭解職後鎖定在Game Over畫面（僅開新局的setup/teamSelect與唯讀的新手教學例外）
  if (S && S.gmCareer && S.gmCareer.fired && UI.screen !== "setup" && UI.screen !== "teamSelect" && UI.screen !== "gameOver" && UI.screen !== "tutorial") UI.screen = "gameOver";
  if (UI.screen === "gameOver") return renderGameOver();
  if (UI.screen === "setup") return renderSetup();
  if (UI.screen === "bootRecovery") return renderBootRecovery(); // v35.1 安全模式
  if (UI.screen === "teamSelect") return renderTeamSelect();
  if (UI.screen === "gameModePick") return renderGameModePick(); // v41①：開局身分模式選擇
  if (UI.screen === "tutorial") return renderTutorial(); // v35新手教學
  if (UI.screen === "dashboard") return renderDashboard();
  if (UI.screen === "standings") return renderStandings();
  if (UI.screen === "roster") return renderRoster();
  if (UI.screen === "playerDetail") return renderPlayerDetail();
  if (UI.screen === "playoffs") return renderPlayoffs();
  if (UI.screen === "draft") return renderDraft();
  if (UI.screen === "awards") return renderAwards();
  if (UI.screen === "offseasonSummary") return renderOffseasonSummary();
  if (UI.screen === "coaches") return renderCoaches();
  if (UI.screen === "lineup") return renderLineup();
  if (UI.screen === "rotation") {
    // v43①③：純GM 未接管→投手輪值也交給教練（唯讀預覽，手排入口不存在）
    const __manualRot = (typeof canManualLineup === "function") ? canManualLineup() : true;
    if (!__manualRot && typeof renderRotationCoachManaged === "function") return renderRotationCoachManaged();
    return renderRotation();
  }
  if (UI.screen === "listing") return (typeof renderListingScreen === "function") ? renderListingScreen() : renderDashboard(); // v43②掛牌市場
  if (UI.screen === "wantMarket") return (typeof renderWantMarket === "function") ? renderWantMarket() : renderDashboard(); // v45#5求購市場
  if (UI.screen === "tradeTeamSelect") return renderTradeTeamSelect();
  if (UI.screen === "tradeBuilder") return (typeof renderTradeBuilderV43 === "function") ? renderTradeBuilderV43() : renderTradeBuilder(); // v43③完整資料交易畫面
  if (UI.screen === "finance") return renderFinance();
  if (UI.screen === "scouts") return renderScouts();
  if (UI.screen === "freeAgents") return renderFreeAgents();
  if (UI.screen === "marketing") return renderMarketing();
  if (UI.screen === "negotiation") return renderNegotiation();
  if (UI.screen === "financeCuts") return renderFinanceCuts();
  if (UI.screen === "contractRenewals") return renderContractRenewals();
  if (UI.screen === "staffRenewal") return renderStaffRenewal();   // v31教練/球探續約
  if (UI.screen === "directorRenewal") return renderDirectorRenewal(); // r008分析主管續約
  if (UI.screen === "selfTraining") return renderSelfTraining();   // v31季後自主訓練/傳承報告
  if (UI.screen === "facilities") return renderFacilities();
  if (UI.screen === "hallOfFame") return (typeof renderHallOfFame === "function") ? renderHallOfFame() : renderDashboard(); // v48 榮譽殿堂
  if (UI.screen === "agency") return renderAgency();
  if (UI.screen === "saveManager") return renderSaveManager(); // v34存檔管理
  if (UI.screen === "dataCenter") return (typeof renderDataCenter === "function") ? renderDataCenter() : renderDashboard(); // v55 L3 Phase 2
  if (UI.screen === "internationalMarket") return renderInternationalMarket();
  if (UI.screen === "springCamp") return renderSpringCamp();       // v25春訓
  if (UI.screen === "springReport") return renderSpringReport();   // v25春訓報告
  if (UI.screen === "intlTournament") return renderIntlTournament(); // v25國際賽事
}

function renderSetup() {
  app.innerHTML = `
    <div class="wrap">
      <section class="v60-app-brand-hero" data-v60-app-visual="approved-pwa-icon" aria-label="決勝 GM APP 主視覺">
        <div class="v60-app-brand-mark"><img src="${v60CompatAppIconDataUrl()}" width="512" height="512" alt="決勝 GM 應用程式圖示" /></div>
        <div class="v60-app-brand-copy">
          <span>APP START</span>
          <strong>決勝 GM</strong>
          <em>FRONT OFFICE BASEBALL</em>
        </div>
      </section>
      <div class="hero">
        <div class="eyebrow">${typeof BRAND !== "undefined" ? BRAND.gameName : "決勝GM"} — ${typeof BRAND !== "undefined" ? BRAND.gameSubtitle : "FRONT OFFICE BASEBALL"}</div>
        <h1>開局設定</h1>
        <p class="sub">輸入你的 GM 姓名，留空將自動生成。</p>
      </div>
      <div class="card">
        <label class="field">
          <span>GM 姓名</span>
          <input id="in-gm" type="text" placeholder="留空隨機生成" />
        </label>
        <p class="sub dark">${typeof LEAGUE_BRAND !== "undefined" ? LEAGUE_BRAND.fullName : "海嶺職業棒球聯盟"}・20 隊等你來掌舵</p>
        <button id="btn-start" class="btn-primary">開始新球季</button>
      </div>
    </div>`;
  document.getElementById("btn-start").onclick = () => {
    newGame(document.getElementById("in-gm").value);
  };
}

/* ---------- v35.1：安全模式・載入救援畫面 ----------
   任何開機／渲染錯誤都會落到這裡，避免整頁白屏。畫面完全自給自足，不依賴 S 是否正常，
   讓玩家能：①匯出壞掉的存檔（下載或複製，傳給開發者精準修復）②清除存檔重開 ③回開局。 */
function renderBootRecovery() {
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var raw = "";
  try { raw = UI.__rawSave ? JSON.stringify(UI.__rawSave) : ""; } catch (e) { raw = ""; }
  var errMsg = UI.__bootError || "載入存檔時發生未預期的錯誤。";
  var el = document.getElementById("app");
  if (!el) return;
  el.innerHTML =
    '<div class="wrap">' +
      '<div class="hero"><div class="eyebrow">SAFE MODE</div><h1>安全模式・載入救援</h1>' +
      '<p class="sub">遊戲在載入你的存檔時發生錯誤，已切到安全模式避免整個畫面卡死。建議先把存檔匯出備份，再視情況清除重來。</p></div>' +
      '<div class="card"><div class="eyebrow">錯誤訊息</div><p class="sub dark" style="word-break:break-all;">' + esc(errMsg) + '</p></div>' +
      (raw ?
        ('<div class="card"><div class="eyebrow">'+icon("export")+' 匯出存檔（強烈建議先做）</div>' +
          '<p class="sub dark">點「下載」存成 JSON；若手機沒反應，改按「全選複製」把下方整段文字複製起來貼給開發者，即可精準重現並修復。</p>' +
          '<div class="btnrow"><button id="btn-rec-download" class="btn-primary">下載存檔 JSON</button><button id="btn-rec-copy" class="btn-secondary">全選複製</button></div>' +
          '<textarea id="rec-save" readonly style="width:100%;height:120px;margin-top:10px;font-family:monospace;font-size:11px;">' + esc(raw) + '</textarea>' +
        '</div>')
        : '<div class="card"><p class="sub dark">找不到可匯出的存檔資料（可能根本沒有存檔，或存檔已損毀無法讀取）。</p></div>') +
      '<div class="card"><div class="eyebrow">重新開始</div>' +
        '<p class="sub dark">清除這個壞掉的存檔並回到開局畫面。<b>此動作無法復原</b>，請確認已先匯出備份。</p>' +
        '<div class="btnrow"><button id="btn-rec-clear" class="btn-danger">清除存檔並重新開始</button><button id="btn-rec-setup" class="btn-outline">先不清除，回開局畫面</button></div>' +
      '</div>' +
    '</div>';
  var dl = document.getElementById("btn-rec-download");
  if (dl) dl.onclick = function () {
    try {
      var blob = new Blob([raw], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "baseball_gm_save_recovery.json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    } catch (e) { alert("下載失敗，請改用『全選複製』。"); }
  };
  var cp = document.getElementById("btn-rec-copy");
  if (cp) cp.onclick = function () {
    var ta = document.getElementById("rec-save");
    if (ta) { ta.focus(); ta.select(); try { document.execCommand("copy"); cp.textContent = "已複製 "+icon('ok')+""; } catch (e) {} }
  };
  var cl = document.getElementById("btn-rec-clear");
  if (cl) cl.onclick = function () {
    try { if (typeof clearState === "function") clearState(); } catch (e) {}
    UI.__rawSave = null; UI.__bootError = null;
    UI.screen = "setup"; render();
  };
  var su = document.getElementById("btn-rec-setup");
  if (su) su.onclick = function () { UI.__bootError = null; UI.screen = "setup"; render(); };
}

function renderTeamSelect() {
  const divs = ["A1", "A2", "B1", "B2"];
  const lbrand = (typeof LEAGUE_BRAND !== "undefined") ? LEAGUE_BRAND : null;
  app.innerHTML = `
    <div class="wrap">
      <div class="hero">
        <div class="eyebrow">${lbrand ? lbrand.fullName : S.leagueName}</div>
        <h1>選擇你的球隊</h1>
        <p class="sub">GM ${S.gmName}，從 ${lbrand ? lbrand.shortName : "聯盟"} 20 隊中挑一支開始你的 GM 生涯。</p>
      </div>
      ${divs.map(d => `
        <div class="divblock">
          <div class="divlabel">${DIV_LABEL[d]}</div>
          <div class="teamgrid v50-teamgrid">
            ${Object.values(S.teams).filter(t => t.division === d).map(t => {
              const pc = t.primaryColor || "#333";
              const sc = t.secondaryColor || "#999";
              const logo = (typeof themeTeamLogo === "function") ? themeTeamLogo(t.id, 40) : "";
              const tierLabel = (typeof v55CityTierLabel === "function") ? v55CityTierLabel(t.id) : "";
              const personaLabel = (typeof personaOf === "function" && personaOf(t)) ? personaOf(t).name : "";
              const flavor = (typeof v55CityFlavorOf === "function") ? v55CityFlavorOf(t.id) : "";
              return `<button class="v50-teamcard v55-teamcard-ext v60-approved-teamcard" data-id="${t.id}" data-identity-source="approved-theme-pack" style="--tc-primary:${pc};--tc-secondary:${sc}">
                <span class="v50-team-dot" style="background:${pc};box-shadow:0 0 0 3px ${sc}"></span>
                <span class="v60-team-logo-frame">${logo}</span><span class="v50-team-name">${t.name}</span>
                <span class="v55-team-tags"><span class="v55-city-tier">${tierLabel}</span><span class="v55-persona-tag">${personaLabel}</span></span>
                ${flavor ? `<span class="v55-city-flavor">${flavor}</span>` : ""}
              </button>`;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </div>`;
  app.querySelectorAll(".v50-teamcard").forEach(btn => {
    btn.onclick = () => pickTeam(btn.dataset.id);
  });
}

function renderDashboard() {
  const team = S.teams[S.userTeamId];
  const div = standingsForDivision(team.division);
  const rank = div.findIndex(t => t.id === team.id) + 1;
  const totalDays = S.schedule.length;
  const seasonOver = S.currentDay >= totalDays;
  const lastLog = S.resultsLog[S.resultsLog.length - 1];
  const myLastGame = lastLog ? lastLog.results.find(r => r.home === team.id || r.away === team.id) : null;
  const issues = rosterIssues(team);
  const blocked = issues.length > 0;
  ensureLineup(team); ensureRotation(team); ensureBullpenOrder(team, S.players);
  const lineupWarnings = blocked ? [] : lineupRotationWarnings(team);
  ensureFinance(team);
  const financeWarns = financeWarnings(team);
  // v25：本季春訓尚未完成時（球季未開打），以春訓卡取代模擬按鈕
  const needSpringCamp = S.gameStarted && S.currentDay === 0 && S.springCampDoneYear !== S.seasonYear;

  /* v40 A案分頁：主控台拆四頁——⚾賽況（比分/上一戰/模擬按鈕/擋模擬警示）／📋待辦（所有決策卡與提醒）／📰新聞／📂選單。
     計分板與 flash 常駐頁首；待辦頁籤帶紅點數字＝待處理決策卡數量，一眼看出有事要辦。 */
  const dashTodoPanel = `
      ${(typeof renderTakeoverExpiryCard === "function") ? renderTakeoverExpiryCard() : ""}
      ${(typeof renderResignationCard === "function") ? renderResignationCard() : ""}
      ${(typeof renderCallupHintCard === "function") ? renderCallupHintCard() : ""}
      ${(typeof renderDemandCards === "function") ? renderDemandCards(team) : ""}
      ${(typeof renderInjuryProposalCards === "function") ? renderInjuryProposalCards() : ""}
      ${(typeof renderListingOfferCards === "function") ? renderListingOfferCards() : ""}
      ${renderKpiCard()}
      ${renderKpiMidReviewCard()}
      ${renderCdActivitiesCard()}
      ${renderEventCard()}
      ${(typeof renderV48MilestoneCard === "function") ? renderV48MilestoneCard() : ""}
      ${(typeof renderV48HofCards === "function") ? renderV48HofCards() : ""}
      ${(typeof renderV54DevMilestoneCards === "function") ? renderV54DevMilestoneCards() : ""}
      ${renderRumorCards()}
      ${(typeof renderAiProposalCardV43 === "function") ? renderAiProposalCardV43() : renderAiProposalCard()}

      ${(() => {
        // v26手術決策卡：重傷球員需先決定治療方針，決策前恢復凍結
        const pending = team.roster1.concat(team.roster2).map(id => S.players[id]).filter(p => p && p.injury && p.injury.pendingSurgery);
        if (pending.length === 0) return "";
        return pending.map(p => {
          const surgCost = (typeof surgeryCostFor === "function") ? surgeryCostFor(p, team) : 0; // v29手術費用
          const canAfford = team.finance.budget >= surgCost;
          return `<div class="card issuecard">
          <div class="eyebrow">${icon('medical')} 重傷治療方針待決定：${p.name}（${p.level}）</div>
          <p class="sub dark">${p.name} 遭遇 <b>${p.injury.name}</b>（${p.injury.part}・重度），基礎恢復期約 ${p.injury.totalDays} 天。<b>決定治療方針前，恢復不會開始。</b></p>
          <p class="sub dark">${icon('surgery')} <b>手術治療</b>：需支付手術費 <b>${formatMoney(surgCost)}</b>${medicalLevel(team) > 0 ? `（醫療室Lv.${medicalLevel(team)}已折抵${medicalLevel(team) * 5}%）` : ""}，恢復期延長約40%（約 ${Math.max(3, Math.round(p.injury.totalDays * 1.4))} 天），但傷癒降評機率僅2%、日後舊傷復發風險最低。<br>${icon('bandage')} <b>保守治療</b>：免費、恢復期照舊（約 ${p.injury.totalDays} 天），但傷癒降評機率約${Math.round(clamp(0.25 - (typeof rehabDowngradeShift === "function" ? rehabDowngradeShift(team) : 0), 0.05, 0.25) * 100)}%${hasTrait(p, "glass") ? "（玻璃體質再上修）" : hasTrait(p, "ironman") ? "（鋼鐵之軀下修）" : ""}，同部位也較易復發。</p>
          <p class="draftnote muted">目前預算：${formatMoney(team.finance.budget)}${canAfford ? "" : "（不足以支付手術費）"}</p>
          <div class="btnrow">
            <button class="btn-primary surg-btn" data-pid="${p.id}" data-method="surgery" ${canAfford ? "" : "disabled"}>手術治療（${formatMoney(surgCost)}）</button>
            <button class="btn-secondary surg-btn" data-pid="${p.id}" data-method="conservative">保守治療（免費）</button>
          </div>
        </div>`;}).join("");
      })()}

      ${(() => {
        const injured = team.roster1.concat(team.roster2).map(id => S.players[id]).filter(p => p && isInjured(p) && !(p.injury && p.injury.pendingSurgery));
        if (injured.length === 0) return "";
        return `<div class="card injurycard">
          <div class="eyebrow">傷兵名單（${injured.length} 人）</div>
          ${injured.map(p => {
            const pct26 = Math.round((p.injury.totalDays - p.injury.daysLeft) / Math.max(1, p.injury.totalDays) * 100);
            return `<p class="sub dark" style="margin:4px 0;">${icon('bandage')} ${p.name}（${p.level}）：${p.injury.name}・${p.injury.severityLabel}${p.injury.method === "surgery" ? "・術後復健" : ""}，還需 ${p.injury.daysLeft} 天<span class="rehabpct">復健 ${pct26}%</span></p>
            <div class="injurybar slim"><div style="width:${pct26}%"></div></div>`;
          }).join("")}
          ${foldNote(`<p class="draftnote muted">傷兵不會被排入打線與投手調度，傷癒後自動歸隊。醫療室與復健中心可分別降低受傷機率、加速恢復並減少後遺症。</p>`)}
        </div>`;
      })()}

      ${renderMidTrainingCard(team)}
      ${renderScoutingReportCard(team, seasonOver)}
      ${(typeof v55RenderAlertsCard === "function") ? v55RenderAlertsCard(team) : ""}

      ${(!blocked && lineupWarnings.length > 0) ? (
        ((typeof canManualLineup === "function") ? canManualLineup() : true)
          ? `
      <div class="card issuecard">
        <div class="eyebrow">先發陣容提醒</div>
        <ul class="issuelist">
          ${lineupWarnings.map(i => `<li>${i}</li>`).join("")}
        </ul>
        <p class="sub dark">比賽仍可正常進行，但建議盡快到「球員名單」的先發打線／投手輪值分頁調整，避免不合理的先發安排。</p>
      </div>`
          : `
      <div class="card issuecard">
        <div class="eyebrow">現場調度（純GM）</div>
        <ul class="issuelist">
          ${lineupWarnings.map(i => `<li>${i}</li>`).join("")}
        </ul>
        <p class="sub dark">純GM 模式下先發打線／輪值由總教練全權排定，傷兵會自動由教練遞補，你不需要（也無法）手動調整陣容。若一軍出現本職球員缺口，教練會另以「補強需求／遞補提案」向你請示。</p>
      </div>`
      ) : ""}

      ${financeWarns.length > 0 ? `
      <div class="card issuecard">
        <div class="eyebrow">財務提醒</div>
        <ul class="issuelist">
          ${financeWarns.map(i => `<li>${i}</li>`).join("")}
        </ul>
        <p class="sub dark">前往「財務」畫面可查看詳細收支並調整票價策略。</p>
      </div>` : ""}`;
  const dashTodoCount = (dashTodoPanel.match(/class="card (issuecard|injurycard)/g) || []).length
    + (dashTodoPanel.match(/id="btn-aiprop-accept"/g) || []).length
    + (dashTodoPanel.match(/class="rumor-intercept"/g) || []).length;
  const dashMailUnread = (typeof v43UnreadMailCount === "function") ? v43UnreadMailCount() : 0; // v43郵件未讀數
  const dashGamePanel = `
      ${blocked ? `
      <div class="card issuecard">
        <div class="eyebrow">名單狀態異常，暫停比賽模擬</div>
        <ul class="issuelist">
          ${issues.map(i => `<li>${i}</li>`).join("")}
        </ul>
        <p class="sub dark">請先到「球員名單」調整升降，符合條件後才能繼續模擬比賽。</p>
        <button id="btn-roster-fix" class="btn-primary">前往球員名單調整</button>
      </div>` : ""}

      ${myLastGame ? renderLastGameCard(myLastGame, team) : ""}

      ${needSpringCamp ? `
      <div class="card seasonover">
        <div class="eyebrow">春季訓練尚未完成</div>
        ${foldNote(`<p class="sub dark">球季開幕前，先帶球隊完成春訓吧！可選擇留在母國（免費）或前往海外移地訓練（依國家等級收費，成效與體驗更好）。</p>`)}
        <button id="btn-go-spring" class="btn-primary">前往春訓安排</button>
      </div>` : ""}

      ${blocked || needSpringCamp ? "" : (seasonOver ? renderSeasonOverPanel() : `
      <div class="btnrow">
        <button id="btn-day" class="btn-primary">模擬下一天</button>
        <button id="btn-week" class="btn-secondary">快轉一週</button>
      </div>
      <div class="btnrow">
        <button id="btn-end" class="btn-secondary">模擬至球季結束</button>
      </div>`)}`;
  const dashNewsPanel = `
      ${renderNewsCard()}
      ${renderSponsorMissionCard()}`;
  const dashMenuPanel = `
      <div class="btnrow">
        <button id="btn-standings" class="btn-outline">戰績榜</button>
        <button id="btn-roster" class="btn-outline">球員名單</button>
      </div>
      <div class="btnrow">
        <button id="btn-coaches" class="btn-outline">教練團</button>
      </div>
      <div class="btnrow">
        <button id="btn-lineup" class="btn-outline">先發棒次守位</button>
        <button id="btn-rotation" class="btn-outline">投手輪值</button>
      </div>
      <div class="btnrow">
        <button id="btn-trade" class="btn-outline">球員交易</button>
        <button id="btn-finance" class="btn-outline">財務</button>
      </div>
      <div class="btnrow">
        <button id="btn-marketing" class="btn-outline">行銷企劃</button>
        <button id="btn-facilities" class="btn-outline">球場硬體建設</button>
      </div>
      <div class="btnrow">
        <button id="btn-global-activities" class="btn-outline">國際交流／海外行銷</button>
      </div>
      <div class="btnrow">
        <button id="btn-datacenter" class="btn-outline">${icon('chart')} 數據中心</button>
      </div>
      <div class="btnrow">
        <button id="btn-agency" class="btn-outline">${icon('scout')} 代理人事務所</button>
        <button id="btn-saves" class="btn-outline">${icon('save')} 存檔管理</button>
      </div>
      <div class="btnrow">
        <button id="btn-tutorial" class="btn-outline">${icon('book')} 新手教學</button>
      </div>
      ${UI.confirmReset ? `
      <div class="card resetcard">
        <div class="eyebrow">確認重新開始</div>
        <p class="sub dark">這會清除目前的存檔進度，且無法復原。確定要繼續嗎？</p>
        <div class="btnrow">
          <button id="btn-reset-cancel" class="btn-secondary">取消</button>
          <button id="btn-reset-confirm" class="btn-danger-solid">確定清除並重新開始</button>
        </div>
      </div>` : `
      <div class="btnrow">
        <button id="btn-reset" class="btn-danger">重新開始（清除存檔）</button>
      </div>`}`;
  app.innerHTML = `
    <div class="wrap">${typeof themeHero === "function" ? themeHero() : ""}
      <div class="topbar">
        <div>
          <div class="eyebrow">${S.leagueName}</div>
          <div class="teamname">${(typeof themeTeamLogo === "function") ? themeTeamLogo(team.id, 28) : ""}${team.name}</div>
        </div>
        <div class="gmtag">GM ${S.gmName}</div>
      </div>

      ${v57DashboardHero(team)}

      <div class="scoreboard">
        <div class="sb-row">
          <div class="sb-label">戰績</div>
          <div class="sb-value">${team.wins}<span class="sb-dash">-</span>${team.losses}</div>
        </div>
        <div class="sb-row small">
          <div class="sb-label">勝率</div>
          <div class="sb-value small">${pct(team.wins, team.losses)}</div>
        </div>
        <div class="sb-row small">
          <div class="sb-label">主／客場</div>
          <div class="sb-value small">主 ${team.homeWins || 0}勝${team.homeLosses || 0}敗・客 ${team.awayWins || 0}勝${team.awayLosses || 0}敗</div>
        </div>
        <div class="sb-row small">
          <div class="sb-label">分組排名</div>
          <div class="sb-value small">第 ${rank} 名 / ${DIV_LABEL[team.division]}</div>
        </div>
        <div class="sb-row small">
          <div class="sb-label">球季進度</div>
          <div class="sb-value small">${getGameCalendar().dateLabel}</div>
        </div>
      </div>

      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}

      ${uiTabs("dash", [
        { key: "game", label: `${(typeof assetSlot === "function" ? assetSlot("team.logo") : ""+icon('baseball')+"")} 賽況`, html: dashGamePanel }, // v41⑦：emoji改走插槽（無資產→fallback⚾，畫面不變）
        { key: "todo", label: ""+icon('clipboard')+" 待辦", badge: dashTodoCount, html: dashTodoPanel },
        { key: "mail", label: ""+icon('mail')+" 郵件", badge: dashMailUnread, html: (typeof dashMailPanel === "function") ? dashMailPanel() : "" }, // v43郵件中樞
        { key: "news", label: ""+icon('news')+" 新聞", html: dashNewsPanel },
        { key: "menu", label: ""+icon('folder')+" 選單", html: dashMenuPanel }
      ])}
    </div>`;
  if (needSpringCamp) {
    document.getElementById("btn-go-spring").onclick = () => {
      if (!S.springCamp || S.springCamp.year !== S.seasonYear) prepareSpringCamp();
      UI.flash = null; UI.screen = "springCamp"; render();
    };
  }
  if (blocked) {
    document.getElementById("btn-roster-fix").onclick = () => { UI.screen = "roster"; render(); };
  } else if (!seasonOver && !needSpringCamp) {
    document.getElementById("btn-day").onclick = () => { UI.flash = null; doSimulateDay(); };
    document.getElementById("btn-week").onclick = () => { UI.flash = null; doSimulateWeek(); };
    document.getElementById("btn-end").onclick = () => { UI.flash = null; doSimulateToEnd(); };
  } else {
    wireSeasonOverPanel();
  }
  const newsToggle = document.getElementById("btn-news-toggle");
  if (newsToggle) newsToggle.onclick = () => { UI.newsExpanded = !UI.newsExpanded; render(); };
  app.querySelectorAll(".surg-btn").forEach(b => { b.onclick = () => decideSurgery(b.dataset.pid, b.dataset.method); }); // v26手術決策
  // v41③：需求單三鍵（接受/協商/駁回）；v44④：體諒說明（帶 data-reason：rebuild/nobudget/noplayer）
  app.querySelectorAll(".demand-btn").forEach(b => { b.onclick = () => {
    if (b.dataset.act === "want") { // v45 #5：張貼求購並前往求購市場
      const r = (typeof v45PostWant === "function") ? v45PostWant(b.dataset.id) : { msg: "求購功能未就緒。" };
      UI.flash = r.msg; UI.screen = "wantMarket"; render(); return;
    }
    if (b.dataset.act === "z1scout") { // v47 Z1：派球探到自由/國際市場找符合需求者（占用該球探名額、隔期回報）
      const r = (typeof v47StartScoutMission === "function") ? v47StartScoutMission(b.dataset.id, b.dataset.area) : { msg: "球探委託功能未就緒。" };
      UI.flash = r.msg; if (typeof persist === "function") try { persist(); } catch (e) {}
      render(); return;
    }
    if (b.dataset.act === "promote") { // v46④：從陣中拔擢符合條件者達成需求
      const pid = b.dataset.pid;
      const p = pid ? S.players[pid] : null;
      if (typeof promotePlayer === "function" && p) {
        promotePlayer(pid); // 內含 persist()+render()
        if (typeof checkDemandFulfilled === "function") try { checkDemandFulfilled(); } catch (e) {}
        UI.flash = `${p.name} 已升上一軍——若達到需求門檻，教練需求將自動判定達成。`;
        render();
      }
      return;
    }
    const r = resolveDemand(b.dataset.id, b.dataset.act, b.dataset.reason); UI.flash = r.msg; render();
  }; });
  // v47 Z1：球探回報清單→一鍵導到簽約/報價流程（延續 v46 拔擢的一鍵手感）
  app.querySelectorAll(".v47-z1-sign").forEach(b => { b.onclick = () => {
    const kind = b.dataset.area === "international" ? "international" : "freeAgent";
    if (typeof startNegotiation === "function") { startNegotiation(kind, b.dataset.pid); render(); }
  }; });
  if (typeof wireV42Cards === "function") wireV42Cards(); // v42：辭呈/拉人提示卡按鈕
  if (typeof wireV43Cards === "function") wireV43Cards(); // v43：郵件/掛牌報價/傷兵遞補卡按鈕
  if (typeof wireV48Dashboard === "function") wireV48Dashboard(); // v48：里程碑事件卡/殿堂提名卡
  if (typeof wireV54DevMilestoneCards === "function") wireV54DevMilestoneCards(); // v54：育成里程碑事件卡
  // v41②：接管跨季到期→續期或還權
  const tkRenew41 = document.getElementById("btn-takeover-renew");
  if (tkRenew41) tkRenew41.onclick = () => { const r = renewTakeover(); UI.flash = r.msg; render(); };
  const tkEnd41 = document.getElementById("btn-takeover-end2");
  if (tkEnd41) tkEnd41.onclick = () => { const r = endTakeover(); UI.flash = r.msg; render(); };
  // v32：風聲反應措施
  app.querySelectorAll(".rumor-intercept").forEach(b => { b.onclick = () => interceptRumorUi(b.dataset.rid); });
  app.querySelectorAll(".rumor-persuade").forEach(b => { b.onclick = () => { persuadeRumor(b.dataset.rid); render(); }; });
  app.querySelectorAll(".rumor-dismiss").forEach(b => { b.onclick = () => { const r = rumorById(b.dataset.rid); if (r) r.dismissed = true; persist(); render(); }; });
  // v32：AI主動提案回覆
  const apAccept = document.getElementById("btn-aiprop-accept");
  if (apAccept) apAccept.onclick = () => { acceptAiProposal(); render(); };
  const apDecline = document.getElementById("btn-aiprop-decline");
  if (apDecline) apDecline.onclick = () => { declineAiProposal(); render(); };
  // v36第10階段：突發事件選項
  app.querySelectorAll(".event-opt-btn").forEach(b => { b.onclick = () => { resolveEvent(b.dataset.key); render(); }; });
  // v32：KPI季中檢視抉擇
  const krReduce = document.getElementById("btn-kpi-reduce");
  if (krReduce) krReduce.onclick = () => { acceptKpiReduction(); render(); };
  const krFight = document.getElementById("btn-kpi-fight");
  if (krFight) krFight.onclick = () => { declineKpiReduction(); render(); };
  const kpiNego = document.getElementById("btn-kpi-negotiate"); // v37⑤ 開季目標協商
  if (kpiNego) kpiNego.onclick = () => { negotiateKpiGoalDown(); };
  // v37① C/D 國家平行活動
  const cdEx = document.getElementById("btn-cd-exchange");
  if (cdEx && !cdEx.disabled) cdEx.onclick = () => { const el = document.getElementById("cd-exchange-nation"); runCdExchange(el ? el.value : null); };
  const cdMk = document.getElementById("btn-cd-marketing");
  if (cdMk && !cdMk.disabled) cdMk.onclick = () => { const el = document.getElementById("cd-marketing-nation"); runCdMarketing(el ? el.value : null); };
  const dashboardFacilities = document.getElementById("btn-dashboard-facilities");
  if (dashboardFacilities) dashboardFacilities.onclick = () => { UI.screen = "facilities"; render(); };
  document.getElementById("btn-standings").onclick = () => { UI.screen = "standings"; render(); };
  document.getElementById("btn-roster").onclick = () => { UI.screen = "roster"; render(); };
  document.getElementById("btn-coaches").onclick = () => { UI.screen = "coaches"; render(); };
  document.getElementById("btn-lineup").onclick = () => { UI.screen = "lineup"; render(); };
  document.getElementById("btn-rotation").onclick = () => { UI.screen = "rotation"; render(); };
  document.getElementById("btn-trade").onclick = () => { UI.screen = "tradeTeamSelect"; render(); };
  document.getElementById("btn-finance").onclick = () => { UI.screen = "finance"; render(); };
  document.getElementById("btn-marketing").onclick = () => { UI.screen = "marketing"; render(); };
  document.getElementById("btn-facilities").onclick = () => { UI.screen = "facilities"; render(); };
  document.getElementById("btn-global-activities").onclick = () => { UI.screen = "marketing"; render(); };
  { const dcb = document.getElementById("btn-datacenter"); if (dcb) dcb.onclick = () => { UI.screen = "dataCenter"; render(); }; }
  document.getElementById("btn-agency").onclick = () => { UI.agencyReturn = null; UI.screen = "agency"; render(); };
  const savesBtn = document.getElementById("btn-saves");
  if (savesBtn) savesBtn.onclick = () => { UI.screen = "saveManager"; UI.saveSlots = undefined; UI.saveConfirm = null; render(); };
  const tutBtn = document.getElementById("btn-tutorial");
  if (tutBtn) tutBtn.onclick = () => { UI.tutorialReturn = "dashboard"; UI.screen = "tutorial"; render(); }; // v35新手教學
  if (UI.confirmReset) {
    document.getElementById("btn-reset-cancel").onclick = () => { UI.confirmReset = false; render(); };
    document.getElementById("btn-reset-confirm").onclick = () => { resetGame(); };
  } else {
    document.getElementById("btn-reset").onclick = () => { UI.confirmReset = true; render(); };
  }
}

function renderSeasonOverPanel() {
  if (!S.playoffs) {
    return `
      <div class="card seasonover">
        <div class="eyebrow">例行賽結束</div>
        <p class="sub dark">第${S.seasonYear}年例行賽已經打完，準備進入季後賽！</p>
        <button id="btn-enter-playoffs" class="btn-primary">進入季後賽</button>
      </div>`;
  }
  if (S.playoffs.champion) {
    const champ = S.teams[S.playoffs.champion];
    const isUserChamp = champ.id === S.userTeamId;
    return `
      <div class="card champcard">
        <div class="eyebrow">冠軍賽結果</div>
        <div class="champname">${champ.name}</div>
        <div class="champlabel">${isUserChamp ? ""+icon('trophy')+" 恭喜奪冠！" : ""+icon('trophy')+" 本季冠軍"}</div>
        <button id="btn-view-awards" class="btn-primary">查看年度頒獎</button>
        <button id="btn-view-playoffs" class="btn-outline" style="margin-top:10px;">查看季後賽戰報</button>
      </div>`;
  }
  return `
    <div class="card seasonover">
      <div class="eyebrow">季後賽進行中</div>
      <p class="sub dark">前往查看目前的對戰進度。</p>
      <button id="btn-view-playoffs" class="btn-primary">前往季後賽</button>
    </div>`;
}

function wireSeasonOverPanel() {
  const btnEnter = document.getElementById("btn-enter-playoffs");
  if (btnEnter) btnEnter.onclick = () => { generatePlayoffs(); UI.screen = "playoffs"; persist(); render(); };
  const btnView = document.getElementById("btn-view-playoffs");
  if (btnView) btnView.onclick = () => { UI.screen = "playoffs"; render(); };
  const btnNext = document.getElementById("btn-next-season");
  const btnAwards = document.getElementById("btn-view-awards");
  if (btnAwards) btnAwards.onclick = () => { UI.screen = "awards"; render(); };
}

const ROUND_LABEL = ["八強系列賽（五戰三勝）", "四強系列賽（五戰三勝）", "冠軍賽（七戰四勝）"];

function renderPlayoffs() {
  const p = S.playoffs;
  const issues = rosterIssues(S.teams[S.userTeamId]);
  const blocked = issues.length > 0 && !p.champion;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName} ・ 第${S.seasonYear}年</div><h1>季後賽</h1></div>
      <div class="divlabel">${ROUND_LABEL[p.round]}</div>
      ${p.matchups.map(m => renderMatchupCard(m)).join("")}
      ${blocked ? `
      <div class="card issuecard">
        <div class="eyebrow">名單狀態異常，暫停季後賽模擬</div>
        <ul class="issuelist">${issues.map(i => `<li>${i}</li>`).join("")}</ul>
        <button id="btn-roster-fix" class="btn-primary">前往球員名單調整</button>
      </div>` : (p.champion ? `
        <div class="card champcard">
          <div class="eyebrow">${icon('trophy')} 年度冠軍</div>
          <div class="champname">${(typeof themeTeamLogo === "function") ? themeTeamLogo(p.champion, 36) : ""}${S.teams[p.champion].name}</div>
          <button id="btn-view-awards" class="btn-primary">查看年度頒獎</button>
        </div>` : `
        <div class="btnrow">
          <button id="btn-playoff-game" class="btn-primary">模擬一場</button>
          <button id="btn-playoff-end" class="btn-secondary">模擬至結果出爐</button>
        </div>`)}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回主畫面</button></div>
    </div>`;
  if (blocked) {
    document.getElementById("btn-roster-fix").onclick = () => { UI.screen = "roster"; render(); };
  }
  const btnGame = document.getElementById("btn-playoff-game");
  if (btnGame) btnGame.onclick = () => doSimulatePlayoffRound();
  const btnEnd = document.getElementById("btn-playoff-end");
  if (btnEnd) btnEnd.onclick = () => doSimulatePlayoffsToEnd();
  const btnNext = document.getElementById("btn-next-season");
  const btnAwards2 = document.getElementById("btn-view-awards");
  if (btnAwards2) btnAwards2.onclick = () => { UI.screen = "awards"; render(); };
  document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
}

/* ---------- 選秀畫面 ---------- */
/* ---------- 年度頒獎畫面 ---------- */
const AWARD_LABELS = [
  ["mvp", "最有價值球員 MVP"],
  ["battingTitle", "打擊王"],
  ["homeRunTitle", "全壘打王"],
  ["hitsTitle", "安打王"],
  ["rbiTitle", "打點王"],
  ["stolenBaseTitle", "盜壘王"],
  ["eraTitle", "防禦率王"],
  ["winsTitle", "勝投王"],
  ["strikeoutTitle", "三振王"],
  ["saveTitle", "救援王"],
  ["holdTitle", "中繼王"],
  ["rookieOfYear", "最佳新人"]
];

function awardStatLine(key, p) {
  if (!p) return "本季無合格球員";
  const s = p.seasonStats;
  switch (key) {
    case "battingTitle": return `打擊率 ${battingAvg(s).toFixed(3).replace(/^0/, "")}`;
    case "homeRunTitle": return `${s.HR} 支全壘打`;
    case "hitsTitle": return `${s.H} 支安打`;
    case "rbiTitle": return `${s.RBI} 分打點`;
    case "stolenBaseTitle": return `${s.SB} 次盜壘`;
    case "eraTitle": return `防禦率 ${era(s).toFixed(2)}`;
    case "winsTitle": return `${s.W} 勝`;
    case "strikeoutTitle": return `${s.SO} 次三振`;
    case "saveTitle": return `${s.SV} 次救援成功`;
    case "holdTitle": return `${s.HD} 次中繼成功`;
    case "mvp": return p.isPitcher ? `${s.W}勝、防禦率${era(s).toFixed(2)}` : `打擊率${battingAvg(s).toFixed(3).replace(/^0/, "")}、${s.HR}轟`;
    case "rookieOfYear": return p.isPitcher ? `${s.W}勝、防禦率${era(s).toFixed(2)}` : `打擊率${battingAvg(s).toFixed(3).replace(/^0/, "")}、${s.HR}轟`;
    default: return "";
  }
}

function renderAwards() {
  const a = S.lastAwards;
  /* v56：按聯盟分頁顯示所有獎項 */
  function leagueAwardsHtml(region) {
    const la = a[region];
    if (!la) return `<p>無資料</p>`;
    return `
      ${AWARD_LABELS.map(([key, label]) => {
        const pid = la[key];
        const p = pid ? S.players[pid] : null;
        const team = p ? S.teams[p.team] : null;
        const isMe = p && p.team === S.userTeamId;
        return `<div class="card awardcard ${isMe ? "me" : ""}">
            <div class="eyebrow">${label}</div>
            <div class="awardname">${p ? p.name : "從缺"}</div>
            <div class="awardteam">${p ? (team.name + (isMe ? "（你的球隊！）" : "")) : ""}</div>
            <div class="awardstat">${awardStatLine(key, p)}</div>
          </div>`;
      }).join("")}

      <div class="divlabel">金棒獎（最佳打者）</div>
      ${(function() {
        const p = la.goldenBat ? S.players[la.goldenBat] : null;
        const tm = p ? S.teams[p.team] : null; const mine = p && p.team === S.userTeamId;
        return '<div class="card awardcard ' + (mine ? "me" : "") + '">' +
          '<div class="eyebrow">' + region + '聯盟</div>' +
          '<div class="awardname">' + (p ? p.name : "從缺") + '</div>' +
          '<div class="awardteam">' + (p && tm ? tm.name + (mine ? "（你的球隊！）" : "") : "") + '</div>' +
          '<div class="awardstat">' + (p ? awardStatLine("battingTitle", p) + "、" + p.seasonStats.HR + "轟" : "") + '</div></div>';
      })()}

      <div class="divlabel">金臂獎（最佳投手）</div>
      ${(function() {
        const p = la.goldenArm ? S.players[la.goldenArm] : null;
        const tm = p ? S.teams[p.team] : null; const mine = p && p.team === S.userTeamId;
        return '<div class="card awardcard ' + (mine ? "me" : "") + '">' +
          '<div class="eyebrow">' + region + '聯盟</div>' +
          '<div class="awardname">' + (p ? p.name : "從缺") + '</div>' +
          '<div class="awardteam">' + (p && tm ? tm.name + (mine ? "（你的球隊！）" : "") : "") + '</div>' +
          '<div class="awardstat">' + (p ? awardStatLine("winsTitle", p) + "、防禦率" + era(p.seasonStats).toFixed(2) : "") + '</div></div>';
      })()}

      <div class="divlabel">最佳9人（攻守綜合最頂尖，含指定打擊共9席）</div>
      ${BESTNINE_GROUPS.map(g => {
        const p = la.bestNine[g] ? S.players[la.bestNine[g]] : null;
        const tm = p ? S.teams[p.team] : null; const mine = p && p.team === S.userTeamId;
        return '<div class="card awardcard ' + (mine ? "me" : "") + '">' +
          '<div class="eyebrow">' + g + '</div>' +
          '<div class="awardname">' + (p ? p.name : "從缺") + '</div>' +
          '<div class="awardteam">' + (p && tm ? tm.name + (mine ? "（你的球隊！）" : "") : "") + '</div>' +
          '<div class="awardstat">' + (p ? awardStatLine("battingTitle", p) + (g === "指定打擊" ? "" : "、守備成功率" + p.fielding + "%") : "") + '</div></div>';
      }).join("")}

      <div class="divlabel">金手套獎（各守位最佳防守）</div>
      ${GOLDGLOVE_GROUPS.map(g => {
        const p = la.goldenGlove[g] ? S.players[la.goldenGlove[g]] : null;
        const tm = p ? S.teams[p.team] : null; const mine = p && p.team === S.userTeamId;
        return '<div class="card awardcard ' + (mine ? "me" : "") + '">' +
          '<div class="eyebrow">' + g + '</div>' +
          '<div class="awardname">' + (p ? p.name : "從缺") + '</div>' +
          '<div class="awardteam">' + (p && tm ? tm.name + (mine ? "（你的球隊！）" : "") : "") + '</div>' +
          '<div class="awardstat">' + (p ? "守備成功率 " + p.fielding + "%" : "") + '</div></div>';
      }).join("")}
    `;
  }
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName} ・ 第${a.year}年</div><h1>年度頒獎典禮</h1></div>
      ${uiTabs("awards", [
        { key: "A", label: "A聯盟", html: leagueAwardsHtml("A") },
        { key: "B", label: "B聯盟", html: leagueAwardsHtml("B") }
      ])}
      <div class="btnrow"><button id="btn-to-offseason" class="btn-primary">${isIntlYear(S.seasonYear) && !(S.intlTournament && S.intlTournament.year === S.seasonYear && S.intlTournament.done) ? "前往世界棒球錦標賽" : "查看休賽季異動"}</button></div>
    </div>`;
  wireUiTabs();
  document.getElementById("btn-to-offseason").onclick = () => {
    // v25：4年一度國際賽年（首屆第5年），頒獎後先舉辦世界賽再進休賽季
    if (isIntlYear(S.seasonYear) && !(S.intlTournament && S.intlTournament.year === S.seasonYear && S.intlTournament.done)) {
      runIntlTournament();
      UI.screen = "intlTournament";
      render();
      return;
    }
    enterOffseason();
  };
}

const DRAFT_SORTS = {
  default: (a, b) => b.scoutedOverall - a.scoutedOverall,
  age: (a, b) => a.age - b.age,
  ceiling: (a, b) => "SABCD".indexOf(a.scoutedCeiling) - "SABCD".indexOf(b.scoutedCeiling)
};

/* ==== v35 新手教學：各系統功能說明／遊玩注意事項／基本規則定義 ====
   手風琴式章節，點標題展開；純唯讀畫面，任何流程階段都可安全進出。 */
function tutorialSections() {
  return [
    { key: "basics", title: ""+icon('target')+" 遊戲目標與基本規則", html: `
      <p class="sub dark">你是職棒球團的 <b>GM（總經理）</b>：組建陣容、養成球員、經營財務、回應高層期待，帶隊爭冠並讓自己的 GM 生涯走得長久。</p>
      <p class="sub dark"><b>聯盟結構</b>：20 支球隊（4 個分區 × 5 隊）、例行賽 126 場；各分區龍頭與成績較佳球隊晉級季後賽，層層對決產生年度冠軍。每逢第 5、9、13 年還會舉辦國際賽。</p>
      <p class="sub dark"><b>名單規則</b>：1軍上限 28 人、2軍上限 32 人、育成上限 25 人；1軍外籍球員有名額上限。先發打線 9 人、先發輪值加牛棚要備妥，人手不足時主控台會擋住模擬並提示你先補齊。</p>
      <p class="sub dark"><b>最重要的一條</b>：高層對你的<b>信任度（0~100）</b>就是你的命。每季開幕前高層會開出 KPI 年度目標，季末依達成與否加減信任；<b>信任歸零＝解職</b>。生涯僅有一次「東山再起」機會，第二次遭解職就是永久出局。</p>` },
    { key: "cycle", title: ""+icon('calendar')+" 一年怎麼玩：年度循環總覽", html: `
      <p class="sub dark">每一年依序經歷：<b>春訓 → 例行賽 → 季後賽 →（國際賽年）→ 休賽季</b>。</p>
      <p class="sub dark"><b>春訓</b>：開幕前必經。留在母國免費，海外移地訓練依國家等級收費、成效更好（預算吃緊就留母國）。</p>
      <p class="sub dark"><b>例行賽</b>：主控台可「模擬下一天／快轉一週／模擬至球季結束」。連續模擬遇到<b>先發傷兵、AI 交易提案、KPI 季中檢視、交易風聲</b>會自動暫停等你決策。</p>
      <p class="sub dark"><b>休賽季</b>依序：異動摘要（財務結算＋KPI 考核）→（若赤字）強制裁員 → 球員合約續約談判 → 教練/球探到期續約 → 新人選秀 → 自主訓練與傳承 → 下一季春訓。順序是固定的，錯過的階段不會回頭，請在各階段把事情辦完。</p>
      <p class="sub dark"><b>應酬窗口</b>：休賽季摘要頁可前往代理人事務所應酬，進入選秀流程前記得把飯局跑完（每個經紀人類型每年限一次）。</p>` },
    { key: "roster", title: ""+icon('cap')+" 陣容管理與球員養成", html: `
      <p class="sub dark"><b>看懂球員</b>：野手看接觸／長打／選球／速度／守備等，投手看球速／控球／體力／抗壓與球路。「現況」是目前實力、「天花板」是潛力上限；年齡與顛峰期決定成長或衰退。</p>
      <p class="sub dark"><b>狀況與疲勞</b>：球員有 5 級狀況起伏；投手登板累積疲勞，牛棚連投會下滑，記得輪替。</p>
      <p class="sub dark"><b>傷病</b>：受傷後需復健天數；重傷要你拍板「手術（花錢、恢復慢、後遺症最少）或保守（免費、降評與復發風險較高）」。傷病史越多的球員越容易再受傷。</p>
      <p class="sub dark"><b>養成管道</b>：春訓（全隊）、季中特訓（單點強化）、季後自主訓練（全員小幅成長、可能領悟後天特質），資深老將還可能把特質「傳承」給年輕高潛力後輩。</p>
      <p class="sub dark"><b>打線與輪值</b>：先發棒次守位、投手輪值與牛棚順序都可自訂；懶得調可用系統建議，但關鍵戰力請自己確認。</p>` },
    { key: "staff", title: ""+icon('brain')+" 教練團與球探", html: `
      <p class="sub dark"><b>教練團</b>：1軍/2軍各 8 個職位，專精直接加成對應能力（打擊教練加打擊、投手教練加投球…），總教練提供全隊小幅加成；約 2 成教練帶特殊能力（${icon('star-solid')}），加成更明顯。可隨時更換或 1軍/2軍互換。</p>
      <p class="sub dark"><b>球探三席</b>：國內（選秀評估與獨家新秀）、國際（國際市場評估與獨家人選數量）、交易（評估他隊球員）。精準度越高，看到的數字越接近真實；「球探辦公室」設施可再加成。</p>
      <p class="sub dark"><b>到期續約（重要）</b>：教練/球探合約到期不會自動暫代——休賽季會逐一進入續約談判，出價 ≥ 期望必成交、年限每少 1 年所需薪資 +25%。談破或不續約，該職位<b>空缺、加成歸零（球探評估變成盲評）</b>，直到你去「教練團／球探室」自由市場補人為止。</p>` },
    { key: "finance", title: ""+icon('money')+" 財務經營與避免赤字（必讀）", html: `
      <p class="sub dark"><b>收入</b>：主場門票（逐場結算）、客場贏球分潤、轉播與贊助合約、贊助商任務獎金、球場格位設施收益。<b>支出</b>：球員薪資、教練/球探薪資、球場維護、行銷、春訓/手術/情蒐等雜項，薪資過高還會被課奢侈稅。</p>
      <p class="sub dark"><b>赤字的代價</b>：季末結算若預算為負，休賽季會被<b>強制裁員</b>釋出高薪球員（無回收金額），戰力大失血；財務吃緊也會讓退休球員拒絕轉任、影響 KPI 財務目標。</p>
      <p class="sub dark"><b>避免赤字的訣竅</b>：
        ①簽約前先看「財務」頁的薪資總額與聯盟平均，別讓薪資失控；
        ②票價別貪心——人氣不夠時把票價拉到上限，上座率會崩（需求會隨票價與人氣調整），季均上座率 ≥90% 才能調升票價上限；
        ③設施投資分期進行，球場維護費會隨屋齡上升，留足周轉金；
        ④長約集中在顛峰期前的球員，老將給短約；
        ⑤行銷活動可開可關，虧損季先關省錢；
        ⑥手術、海外春訓、應酬都是選配支出，預算緊就從簡。</p>` },
    { key: "market", title: ""+icon('refresh')+" 補強管道：選秀／交易／FA／國際市場", html: `
      <p class="sub dark"><b>選秀</b>：每年休賽季 6 輪。新秀數值是球探「評估值」，精準度越高越可信；新秀薪資有硬上限、簽約金依評級。談約 5 次談不成該新秀直接放棄加盟。可放棄順位保留彈性。</p>
      <p class="sub dark"><b>交易</b>：窗口為「選秀結束後～球季結束前 30 天」。用交易球探評估對方球員，注意雙方價值平衡；AI 之間也會互相交易，留意風聲情報（可攔截、勸留或觀望）。AI 也會主動向你提案，好感度影響開價。</p>
      <p class="sub dark"><b>自由球員（FA）</b>：合約到期不續留的本土球員；能力是公開真實數字，「看漲/持平/衰退」是本土球探的前瞻評估。簽下需付約年薪 30% 的簽約金。</p>
      <p class="sub dark"><b>國際市場</b>：每年休賽季刷新一批海外球員，數值為國際球探評估值；「獨家情報」人選只有你能接觸。注意 1軍外籍名額上限。</p>` },
    { key: "agency", title: ""+icon('scout')+" 代理人事務所與人脈", html: `
      <p class="sub dark">聯盟有 7 型經紀人事務所，各自代理不同性格的球員。<b>情蒐</b>可在談約中花錢摸清經紀人底細與期望底線。</p>
      <p class="sub dark"><b>應酬（休賽季限定）</b>：花 300~800萬 與某型經紀人博感情提升好感；好感 4 以上開始拿到旗下球員動向情報，好感滿 10（莫逆之交）可獲「獨家引薦」——獨家談判權外加談約門檻 5% 折扣。</p>
      <p class="sub dark">好感是長期投資：談約更順、提案更便宜。預算許可時，每個休賽季固定跑幾攤划算的飯局。</p>` },
    { key: "career", title: ""+icon('chart-up')+" GM 生涯：KPI、信任、委任與東山再起", html: `
      <p class="sub dark"><b>KPI</b>：每季開幕前高層開出年度目標（成績類＋經營類），難度越高沒達成扣越少；季中檢視可能加碼或讓你選擇降標（降標後達成獎勵減半）。連 2 年全達成高層胃口變大、連 2 年全滅會被留校察看（懲罰加重）。奪冠另有信任紅利 +8。</p>
      <p class="sub dark"><b>解職與東山再起</b>：信任歸零即解職。此時可接受其他球團邀約東山再起（生涯戰績累計不歸零），邀約品質看你的業界聲望；也可選擇「沉潛一年」（生涯限一次，歸來聲望 +5、邀約重抽）。<b>東山再起僅此一次——第二次解職＝永久出局。</b></p>
      <p class="sub dark"><b>委任</b>：新東家可能附帶 2 季委任（重建／爭冠／止血），KPI 與財務規則會隨委任調整，接受前看清楚條件。奪冠後也可以功成身退主動跳槽，不消耗東山再起機會、還累積話題聲望。</p>` },
    { key: "saves", title: ""+icon('save')+" 存檔與操作注意", html: `
      <p class="sub dark"><b>自動存檔</b>：每次操作後自動保存，中途關閉遊戲再開會回到目前流程階段（選秀中回選秀、談約中回談約清單）。</p>
      <p class="sub dark"><b>手動槽位</b>：主控台「存檔管理」提供 3 個手動槽位，建議在重大決策前（選秀、豪賭交易）先存一份。</p>
      <p class="sub dark"><b>匯出／匯入 JSON</b>：換裝置或清瀏覽器資料前務必匯出備份——存檔放在瀏覽器內（IndexedDB），清除瀏覽器資料會連進度一起清掉。</p>
      <p class="sub dark"><b>重置</b>：主控台最下方「重新開始」會清除自動存檔且無法復原，按之前請三思或先匯出。</p>` }
  ];
}
function renderTutorial() {
  const open = UI.tutorialOpen || null;
  const sections = tutorialSections();
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">GAME GUIDE</div><h1>${icon('book')} 新手教學</h1></div>
      <p class="sub dark" style="margin-bottom:10px;">第一次接手球團？點各章節標題展開說明。看完「財務經營與避免赤字」再開季，可以少走很多冤枉路。</p>
      ${sections.map(s => `
        <div class="card" style="padding:0;overflow:hidden;">
          <button class="tut-toggle" data-key="${s.key}" style="display:block;width:100%;text-align:left;background:none;border:none;padding:14px 16px;cursor:pointer;">
            <span class="eyebrow" style="margin:0;">${s.title}　<span style="float:right;">${open === s.key ? "▲" : "▼"}</span></span>
          </button>
          ${open === s.key ? `<div style="padding:0 16px 14px;">${s.html}</div>` : ""}
        </div>`).join("")}
      <div class="btnrow"><button id="btn-tut-back" class="btn-outline">返回</button></div>
    </div>`;
  app.querySelectorAll(".tut-toggle").forEach(btn => {
    btn.onclick = () => { UI.tutorialOpen = (UI.tutorialOpen === btn.dataset.key) ? null : btn.dataset.key; render(); };
  });
  document.getElementById("btn-tut-back").onclick = () => {
    UI.screen = UI.tutorialReturn || "dashboard";
    UI.tutorialReturn = null;
    render();
  };
}

/* ---------- 休賽季異動摘要畫面 ---------- */
function coachRoleOptionsHtml(teamId) {
  const team = S.teams[teamId];
  let opts = "";
  ["1軍", "2軍"].forEach(level => {
    COACH_ROLES.forEach(role => {
      const cur = S.coaches[team.coachStaff[level][role]];
      // v35：職位空缺（v31合法狀態）防呆——先前直接讀 cur.name 會在賽季結束的休賽季摘要渲染時當機
      opts += `<option value="${level}|${role}">${level}・${role}（現：${cur ? `${cur.name}／指導力${cur.teaching}` : "職位空缺"}）</option>`;
    });
  });
  return opts;
}

function renderCoachRefusalCard() {
  const r = UI.coachRefusal;
  if (!r) return "";
  const p = S.retiredPlayers[r.playerId];
  if (!p) return "";
  const areaLabel = { domestic: "國內", international: "國際", trade: "交易" };
  const roleLabel = r.roleType === "scout" ? `${areaLabel[r.role] || r.role}球探` : `${r.level}${r.role}`;
  return `<div class="card issuecard">
    <div class="eyebrow">${r.roleType === "scout" ? "球探" : "教練"}邀約遭婉拒</div>
    <p class="sub dark">${p.name} 婉拒了 ${S.teams[r.teamId].name} ${roleLabel} 的邀約，希望能以球員身分再拚一次。</p>
    <div class="btnrow">
      <button id="btn-coach-refusal-reinstate" class="btn-secondary">讓他回歸球員</button>
      <button id="btn-coach-refusal-dismiss" class="btn-danger">尊重決定，維持退休</button>
    </div>
  </div>`;
}
function wireCoachRefusalCard() {
  if (!UI.coachRefusal) return;
  const btn1 = document.getElementById("btn-coach-refusal-reinstate");
  if (btn1) btn1.onclick = () => resolveCoachRefusalReinstate();
  const btn2 = document.getElementById("btn-coach-refusal-dismiss");
  if (btn2) btn2.onclick = () => resolveCoachRefusalDismiss();
}

function renderRetireOfferCard() {
  const r = UI.retireOffer;
  if (!r) return "";
  const p = S.players[r.playerId];
  if (!p) return "";
  const msg = r.reason === "declinedMidSeason"
    ? `${p.name} 婉拒在球季中放下球員身分兼任 ${r.roleLabel || "教練職務"}（本休賽季前不會再考慮）。要讓他繼續留在球隊，還是釋出到自由球員市場？`
    : (r.reason === "declinedRole"
      ? `${p.name} 婉拒了轉任 ${r.roleLabel || "教練職務"} 的建議，決定繼續以現役球員身分打球（本休賽季不會再考慮）。要讓他繼續留在球隊，還是釋出到自由球員市場？`
      : `${p.name} 婉拒了退休建議，仍想繼續以現役球員身分打球。要讓他繼續留在球隊，還是釋出到自由球員市場？`);
  return `<div class="card issuecard">
    <div class="eyebrow">${r.reason === "declinedRole" ? "轉任邀約遭婉拒" : "婉拒退休建議"}</div>
    <p class="sub dark">${msg}</p>
    <div class="btnrow">
      <button id="btn-retire-offer-keep" class="btn-secondary">繼續留隊</button>
      <button id="btn-retire-offer-release" class="btn-danger">釋出至自由球員市場</button>
    </div>
  </div>`;
}
function wireRetireOfferCard() {
  if (!UI.retireOffer) return;
  const btn1 = document.getElementById("btn-retire-offer-keep");
  if (btn1) btn1.onclick = () => resolveRetireOfferKeep();
  const btn2 = document.getElementById("btn-retire-offer-release");
  if (btn2) btn2.onclick = () => resolveRetireOfferRelease();
}

function renderOffseasonSummary() {
  const sum = S.offseasonSummary;
  const myRetired = sum.myRetiredIds.map(id => S.retiredPlayers[id]).filter(Boolean);
  const my1 = myRetired.filter(p => p.level === "1軍").length;
  const my2 = myRetired.filter(p => p.level === "2軍").length;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName} ・ 第${S.seasonYear}年休賽季</div><h1>休賽季異動摘要</h1></div>
      ${!S.gameStarted ? `
      <div class="card">
        <div class="eyebrow">${icon('book')} 第一次接手球團？</div>
        <p class="sub dark">建議先花三分鐘看「新手教學」：各系統怎麼玩、年度流程、以及<b>怎麼避免財政赤字</b>都整理好了。之後也能隨時從主控台進入。</p>
        <div class="btnrow"><button id="btn-oss-tutorial" class="btn-outline">前往新手教學</button></div>
      </div>` : ""}
      ${sum.rehired ? `
      <div class="card rehirecard">
        <div class="eyebrow">${icon('party')} 東山再起</div>
        <p class="sub dark">歡迎加入 <b>${sum.rehiredTeam}</b>！你帶著過往的執教履歷走馬上任，高層給予的起始信任度為 <b>${sum.startTrust}</b>。接手現有陣容，證明你寶刀未老吧。</p>
      </div>` : ""}
      ${renderCoachRefusalCard()}
      ${renderChampJumpCard(sum)}
      ${renderAgencyPerkCards()}
      ${sum.kpiResult ? `
      <div class="card ${sum.kpiResult.trustDelta >= 0 ? "" : "issuecard"}">
        <div class="eyebrow">${icon('museum')} 高層年度考核</div>
        ${sum.kpiResult.results.map(r => `<p class="sub dark">${r.achieved ? ""+icon('check')+"" : ""+icon('cross')+""} ${r.label}（信任 ${r.delta >= 0 ? "+" : ""}${r.delta}）</p>`).join("")}
        ${sum.kpiResult.champ ? `<p class="sub dark">${icon('trophy')} 奪冠紅利：信任 +8</p>` : ""}
        <p class="sub dark"><b>信任度 ${sum.kpiResult.trustBefore} → ${sum.kpiResult.trustAfter}</b>${sum.kpiResult.trustAfter < 30 ? "　"+icon('warn')+" 高層的耐心所剩無幾！" : ""}</p>
      </div>` : ""}
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">全聯盟退休人數</div><div class="sb-value small">${sum.retiredCount} 人</div></div>
        <div class="sb-row small"><div class="sb-label">教練合約到期更換</div><div class="sb-value small">${sum.coachesReplaced} 位</div></div>
      </div>
      ${sum.sponsorMissionResult ? `
      <div class="card ${sum.sponsorMissionResult.achieved ? "" : "issuecard"}">
        <div class="eyebrow">贊助商任務結算</div>
        <p class="sub dark">「${sum.sponsorMissionResult.label}」${sum.sponsorMissionResult.achieved ? `達成 ${icon('check')}（${sum.sponsorMissionResult.current}/${sum.sponsorMissionResult.target}），獎金 ${formatMoney(sum.sponsorMissionResult.reward)} 已入帳！` : `未達成（${sum.sponsorMissionResult.current}/${sum.sponsorMissionResult.target}），本季獎金落空。`}</p>
      </div>` : ""}
      ${sum.myFinanceReport ? `
      <div class="card">
        <div class="eyebrow">本季財務結算</div>
        <div class="attrgrid">
          <div class="attr"><span>總收入</span><b>${formatMoney(sum.myFinanceReport.totalRevenue)}</b></div>
          <div class="attr"><span>總支出</span><b>${formatMoney(sum.myFinanceReport.totalExpense)}</b></div>
          <div class="attr"><span>淨損益</span><b>${sum.myFinanceReport.net >= 0 ? "+" : ""}${formatMoney(sum.myFinanceReport.net)}</b></div>
          <div class="attr"><span>結算後預算</span><b>${formatMoney(sum.myFinanceReport.budgetAfter)}</b></div>
        </div>
        ${sum.myFinanceReport.luxuryTax > 0 ? `<p class="sub dark">本季薪資超過奢侈稅門檻，已被課徵 ${formatMoney(sum.myFinanceReport.luxuryTax)} 奢侈稅。</p>` : ""}
        ${sum.myFinanceReport.balanceTaxPaid > 0 ? `<p class="sub dark">${icon('stadium')} 聯盟均衡稅：球場完備度居前段（${sum.myFinanceReport.stadiumCompleteness}%）且營運預算充裕，本季繳納均衡稅 ${formatMoney(sum.myFinanceReport.balanceTaxPaid)}（挹注聯盟弱隊球場基金）。</p>` : ""}
        ${sum.myFinanceReport.balanceTaxReceived > 0 ? `<p class="sub dark">${icon('stadium')} 聯盟均衡稅補貼：球場完備度為聯盟後段（${sum.myFinanceReport.stadiumCompleteness}%），本季領取均衡補貼 ${formatMoney(sum.myFinanceReport.balanceTaxReceived)}（已計入營運預算）。</p>` : ""}
        <p class="draftnote muted">詳細收支項目可到「財務」畫面查看，也可以趁現在（開幕前）調整下一季票價。</p>
      </div>` : ""}
      <div class="card">
        <div class="eyebrow">${S.teams[S.userTeamId].name} 本季退休名單</div>
        ${myRetired.length === 0 ? `<p class="sub dark">本季你的球隊沒有球員退休。</p>` : `
        <p class="sub dark">共 ${myRetired.length} 位退休（1軍 ${my1} 位／2軍 ${my2} 位）。看看完整資料，覺得還能打可以留任；也能直接指派他去擔任教練。</p>`}
      </div>
      ${myRetired.map(p => `
        <div class="card retirecard">
          <div class="draftcard-head">
            <div>
              <div class="draftname">${p.name}${p.forcedRetirement ? "（強制退休）" : ""}</div>
              <div class="draftmeta">${p.isPitcher ? "投手" : "野手"} ・ ${p.age}歲 ・ 原${p.level} ・ ${p.isPitcher ? p.throws + "投" : p.bats + "打／" + p.throws + "投"}</div>
              <div class="draftnote muted">${careerTypeLabel(p)}</div>
            </div>
            ${p.becameCoach ? `<span class="statusbadge">已轉任教練</span>` : (p.becameScout ? `<span class="statusbadge">已轉任球探</span>` : `<button class="pickbtn" data-id="${p.id}">留任</button>`)}
          </div>
          <div class="attrgrid">
            ${p.isPitcher ? `
              <div class="attr"><span>球速</span><b>${velocityKmh(p.velocity)} km/h</b></div>
              <div class="attr"><span>控球</span><b>${p.control}</b></div>
              <div class="attr"><span>體力</span><b>${p.stamina}</b></div>
              <div class="attr"><span>耐久度</span><b>${p.durability}</b></div>
              <div class="attr"><span>抗壓性</span><b>${p.composure}</b></div>
              <div class="attr"><span>角色</span><b>${p.role}</b></div>
            ` : `
              <div class="attr"><span>接觸力</span><b>${p.contact}</b></div>
              <div class="attr"><span>長打力</span><b>${p.power}</b></div>
              <div class="attr"><span>選球眼</span><b>${p.eye}</b></div>
              <div class="attr"><span>跑壘速度</span><b>${p.speed}</b></div>
              <div class="attr"><span>守備成功率</span><b>${p.fielding}%</b></div>
              <div class="attr"><span>臂力</span><b>${p.arm}</b></div>
              <div class="attr"><span>主守位</span><b>${POS_LABEL[p.positions[0].pos]}</b></div>
            `}
            <div class="attr"><span>教練潛力</span><b>${p.coachingAptitude}</b></div>
          </div>
          ${!p.becameCoach ? `
          <div class="coachassign">
            <select class="sortselect coach-role-select" data-id="${p.id}">
              ${coachRoleOptionsHtml(S.userTeamId)}
            </select>
            <button class="btn-secondary assign-coach-btn" data-id="${p.id}">指派為教練</button>
          </div>` : ""}
        </div>`).join("")}
      ${(typeof isOffseasonNow === "function" && isOffseasonNow()) ? `
      <div class="card">
        <div class="eyebrow">${icon('scout')} 應酬季節</div>
        <p class="sub dark">休賽季正是與各事務所經紀人博感情的時候（每個類型每年限一次，進入選秀流程前記得把飯局跑完）。</p>
        <div class="btnrow"><button id="btn-oss-agency" class="btn-outline">前往代理人事務所</button></div>
      </div>` : ""}
      <div class="btnrow"><button id="btn-go-draft" class="btn-primary">${S.forcedCutRequired ? "前往財務強制裁員" : ((S.pendingContractRenewals || []).length > 0 ? "前往合約續約談判" : "進入選秀會")}</button></div>
    </div>`;
  app.querySelectorAll(".retirecard .pickbtn").forEach(btn => {
    btn.onclick = () => reinstatePlayer(btn.dataset.id);
  });
  app.querySelectorAll(".assign-coach-btn").forEach(btn => {
    btn.onclick = () => {
      const select = app.querySelector(`.coach-role-select[data-id="${btn.dataset.id}"]`);
      const [level, role] = select.value.split("|");
      assignRetiredPlayerAsCoach(btn.dataset.id, S.userTeamId, level, role);
    };
  });
  document.getElementById("btn-go-draft").onclick = () => proceedFromOffseasonSummary();
  // v35：首玩教學提示（僅初始休賽季顯示）
  const ossTut = document.getElementById("btn-oss-tutorial");
  if (ossTut) ossTut.onclick = () => { UI.tutorialReturn = "offseasonSummary"; UI.screen = "tutorial"; render(); };
  // v34：休賽季摘要可直接前往事務所應酬（記錄返回來源，事務所返回鍵會回到本畫面）
  const ossAgency = document.getElementById("btn-oss-agency");
  if (ossAgency) ossAgency.onclick = () => { UI.agencyReturn = "offseasonSummary"; UI.screen = "agency"; render(); };
  wireCoachRefusalCard();
  wireChampJumpCard();
  wireAgencyPerkCards();
}

/* ---------- v33-A2 功成身退卡：冠軍年休賽季可探詢跳槽市場（不消耗東山再起機會） ---------- */
function renderChampJumpCard(sum) {
  const c = S.gmCareer;
  if (!sum || !sum.kpiResult || !sum.kpiResult.champ || !c || c.fired) return "";
  const explored = S.champJumpYear === S.seasonYear;
  const offers = explored ? (S.jobOffers || []) : [];
  return `<div class="card">
    <div class="eyebrow">${icon('trophy')} 功成身退？</div>
    <p class="sub dark">你剛帶隊登頂，身價正處於生涯巔峰。此刻跳槽不但不算落跑，還會成為聯盟話題（業界聲望+8）——當然，留下來打造王朝也是一種傳奇。</p>
    ${!explored ? `<div class="btnrow"><button id="btn-champjump-explore" class="btn-outline">探詢跳槽市場</button></div>`
    : (offers.length > 0 ? offers.map(o => { const mm = (typeof MANDATE_META !== "undefined" && MANDATE_META[o.mandate]) || null; return `<div class="joboffer">
        <div class="joboffer-info"><b>${o.teamName}</b>${mm ? ` <span class="personatag" title="${mm.desc}">${mm.name}</span>` : ""}<span class="joboffer-sub">起始信任度 ${o.startTrust}／聯盟戰力第 ${o.strengthRank} 弱${mm ? `／${mm.short}` : ""}</span></div>
        <button class="btn-secondary champjump-btn" data-tid="${o.teamId}">跳槽</button>
      </div>`; }).join("") + `<p class="draftnote muted">不點跳槽、直接往下走流程＝留任現東家（邀約自動作廢）。</p>`
    : `<p class="sub dark muted">市場靜悄悄——看來各隊都對現任GM很滿意，就留下來衛冕吧。</p>`)}
  </div>`;
}
function wireChampJumpCard() {
  const eb = document.getElementById("btn-champjump-explore");
  if (eb) eb.onclick = () => { offerChampJumpMarket(); render(); };
  app.querySelectorAll(".champjump-btn").forEach(b => {
    b.onclick = () => takeJobOffer(b.dataset.tid, true);
  });
}

/* ---------- v34：存檔管理（3手動槽＋匯出/匯入JSON） ---------- */
const SLOT_LABELS = { slot1: "存檔槽 1", slot2: "存檔槽 2", slot3: "存檔槽 3" };
function saveMetaLine(meta) {
  if (!meta) return `<p class="sub dark muted">（空槽）</p>`;
  const d = new Date(meta.savedAt);
  const pad = n => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `<p class="sub dark">${meta.teamName}・GM ${meta.gmName}<br>第${meta.seasonYear}年（第${meta.currentDay}天）・${ts} 存檔</p>`;
}
function renderSaveManager() {
  // 槽位資訊採非同步載入：首次進入先顯示載入中，讀完再重繪
  if (UI.saveSlots === undefined) {
    UI.saveSlots = null;
    loadSlotMeta().then(m => { UI.saveSlots = m; render(); }).catch(() => { UI.saveSlots = {}; render(); });
  }
  const slots = UI.saveSlots;
  const cf = UI.saveConfirm;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">系統</div><h1>存檔管理</h1></div>
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      ${foldNote(`<p class="sub dark" style="margin-bottom:10px;">遊戲會在每次操作後自動存檔；這裡另外提供 3 個手動槽位，方便在重大決策前留存進度。建議定期「匯出JSON」備份——清除瀏覽器資料或更換裝置都會讓瀏覽器內的存檔消失，JSON檔可以隨時匯入還原。</p>`)}
      ${!slots ? `<p class="sub dark">存檔槽位讀取中……</p>` : MANUAL_SLOT_KEYS.map(k => `
      <div class="card">
        <div class="eyebrow">${icon('save')} ${SLOT_LABELS[k]}</div>
        ${saveMetaLine(slots[k])}
        ${cf && cf.slot === k ? `
        <div class="card resetcard">
          <div class="eyebrow">${cf.type === "save" ? "確認覆蓋存檔" : (cf.type === "load" ? "確認讀取" : "確認刪除")}</div>
          <p class="sub dark">${cf.type === "save" ? "這會覆蓋此槽位原有的存檔，確定嗎？" : (cf.type === "load" ? "讀取後會取代目前進度（自動存檔也會同步更新），確定嗎？" : "刪除後無法復原，確定嗎？")}</p>
          <div class="btnrow">
            <button class="btn-secondary slot-cancel">取消</button>
            <button class="btn-danger-solid slot-confirm" data-type="${cf.type}" data-slot="${k}">確定</button>
          </div>
        </div>` : `
        <div class="btnrow">
          <button class="btn-secondary slot-save" data-slot="${k}">${slots[k] ? "覆蓋存檔" : "存檔到此槽"}</button>
          ${slots[k] ? `<button class="btn-primary slot-load" data-slot="${k}">讀取</button>` : ""}
          ${slots[k] ? `<button class="btn-danger slot-del" data-slot="${k}">刪除</button>` : ""}
        </div>`}
      </div>`).join("")}
      <div class="card">
        <div class="eyebrow">${icon('package')} 備份與還原</div>
        <div class="btnrow">
          <button id="btn-export-json" class="btn-secondary">匯出目前進度（JSON）</button>
          <button id="btn-import-json" class="btn-outline">匯入JSON存檔</button>
        </div>
        <input id="import-json-file" type="file" accept=".json,application/json" style="display:none;" />
        <p class="draftnote muted">匯入會直接取代目前進度並自動套用新版升級（舊版本存檔相容）。</p>
      </div>
      <div class="btnrow"><button id="btn-saves-back" class="btn-outline">返回主控台</button></div>
    </div>`;
  document.getElementById("btn-saves-back").onclick = () => { UI.flash = null; UI.saveConfirm = null; UI.screen = "dashboard"; render(); };
  app.querySelectorAll(".slot-save").forEach(b => { b.onclick = () => {
    const k = b.dataset.slot;
    if (UI.saveSlots && UI.saveSlots[k]) { UI.saveConfirm = { type: "save", slot: k }; render(); }
    else doSlotAction("save", k);
  }; });
  app.querySelectorAll(".slot-load").forEach(b => { b.onclick = () => { UI.saveConfirm = { type: "load", slot: b.dataset.slot }; render(); }; });
  app.querySelectorAll(".slot-del").forEach(b => { b.onclick = () => { UI.saveConfirm = { type: "delete", slot: b.dataset.slot }; render(); }; });
  app.querySelectorAll(".slot-cancel").forEach(b => { b.onclick = () => { UI.saveConfirm = null; render(); }; });
  app.querySelectorAll(".slot-confirm").forEach(b => { b.onclick = () => doSlotAction(b.dataset.type, b.dataset.slot); });
  const exp = document.getElementById("btn-export-json");
  if (exp) exp.onclick = () => { exportSaveJson(); UI.flash = "已匯出JSON存檔（請留意瀏覽器下載）。"; render(); };
  const impBtn = document.getElementById("btn-import-json");
  const impFile = document.getElementById("import-json-file");
  if (impBtn && impFile) {
    impBtn.onclick = () => impFile.click();
    impFile.onchange = e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const res = importSaveJson(ev.target.result);
        UI.flash = res.ok ? ""+icon('check')+" 匯入成功，進度已還原。" : `${icon('cross')} 匯入失敗：${res.msg}`;
        if (!res.ok) { UI.screen = "saveManager"; }
        render();
      };
      reader.readAsText(f);
    };
  }
}
function doSlotAction(type, slot) {
  UI.saveConfirm = null;
  if (type === "save") {
    saveToSlot(slot).then(ok => {
      UI.flash = ok ? `${icon('check')} 已存檔到${SLOT_LABELS[slot]}。` : ""+icon('cross')+" 存檔失敗。";
      UI.saveSlots = undefined; // 重新讀取槽位資訊
      render();
    }).catch(() => { UI.flash = ""+icon('cross')+" 存檔失敗。"; render(); });
  } else if (type === "load") {
    loadFromSlot(slot).then(ok => {
      UI.flash = ok ? ""+icon('check')+" 讀取完成。" : ""+icon('cross')+" 讀取失敗：槽位是空的。";
      render();
    }).catch(() => { UI.flash = ""+icon('cross')+" 讀取失敗。"; render(); });
  } else if (type === "delete") {
    deleteSlot(slot).then(() => { UI.flash = `已刪除${SLOT_LABELS[slot]}。`; UI.saveSlots = undefined; render(); });
  }
}

/* ---------- v33-B2/B3 事務所紅利卡（休賽季摘要顯示引薦與動向情報） ---------- */
function renderAgencyPerkCards() {
  const a = S.agency;
  if (!a) return "";
  const refs = (a.referrals || []).filter(r => r.year === S.seasonYear);
  const intel = (a.intel || []).filter(r => r.year === S.seasonYear);
  if (refs.length === 0 && intel.length === 0) return "";
  const refHtml = refs.map(r => {
    const p = (S.freeAgents || {})[r.playerId] || (S.internationalFreeAgents || {})[r.playerId];
    if (!p) return "";
    const at = AGENT_TYPES[r.type];
    return `<p class="sub dark">${icon('handshake')} ${at ? at.name : ""}經紀人引薦：<b>${p.name}</b>（${p.isPitcher ? "投手" : "野手"}・${p.age}歲・${r.kind === "international" ? "國際自由球員" : "自由球員"}）——本休賽季獨家談判、門檻95折。</p>`;
  }).join("");
  const intelHtml = intel.map(r => {
    const p = S.players[r.playerId];
    const t = S.teams[r.teamId];
    if (!p || !t || p.team !== r.teamId) return "";
    const at = AGENT_TYPES[r.type];
    return `<p class="sub dark">${icon('sake')} ${at ? at.name : ""}經紀人透露：<b>${p.name}</b>（${t.name}）想換環境——談交易時不妨把他當目標。</p>`;
  }).join("");
  if (!refHtml && !intelHtml) return "";
  return `<div class="card">
    <div class="eyebrow">${icon('scout')} 事務所人脈紅利</div>
    ${refHtml}${intelHtml}
    <p class="draftnote muted">詳情可到「代理人事務所」畫面查看。</p>
  </div>`;
}
function wireAgencyPerkCards() { /* 目前為純資訊卡，無需接線 */ }

/* ---------- 教練團畫面 ---------- */
/* ---------- 棒次／守位管理 ---------- */
/* ---------- 陣容管理共用導覽列（整合名單／打線／輪值／教練團，介面參考OOTP風格） ---------- */


/* ---------- v25 新聞跑馬燈卡（主控台）｜v29 升級為真・跑馬燈動畫 ---------- */
function renderNewsCard() {
  const feed = S.newsFeed || [];
  if (feed.length === 0) {
    return `<div class="card newscard">
      <div class="eyebrow">聯盟快訊</div>
      ${v60CompatVisualScene("newsroom_v58", "新聞編輯室場景", "NEWSROOM VISUAL", "新聞與賽場資訊", "完整新聞內容與既有展開操作保留在下方。", "v60-news-scene")}
      <p class="v59-compact-line">目前沒有新聞</p>
      ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<p class="sub dark" style="margin:0;">目前尚無新聞快訊；賽事、傷兵、國際活動與聯盟事件發生後會集中顯示在這裡。</p>`, "新聞來源") : ""}
    </div>`;
  }
  const show = feed.slice(0, UI.newsExpanded ? 15 : 5);
  const typeIcon = { "戰報": ""+icon('fire')+"", "傷兵": ""+icon('bandage')+"", "里程碑": ""+icon('medal')+"", "國際賽": ""+icon('globe')+"", "春訓": ""+icon('blossom')+"", "贊助": ""+icon('handshake')+"", "訓練": ""+icon('training')+"", "高層": ""+icon('museum')+"" };
  // v29真・跑馬燈：取最新8則串成一條，水平無縫循環捲動（內容複製兩份製造無限循環；長度越長捲越久）
  const tickerItems = feed.slice(0, 8).map(n => `<span class="tickeritem">${typeIcon[n.type] || ""+icon('news')+""} ${n.text}</span>`).join("<span class=\"tickersep\">◆</span>");
  const tickerDur = clamp(feed.slice(0, 8).reduce((s, n) => s + n.text.length, 0) * 0.55, 18, 90);
  return `<div class="card newscard">
    <div class="eyebrow">聯盟快訊</div>
    ${v60CompatVisualScene("newsroom_v58", "新聞編輯室場景", "NEWSROOM VISUAL", "新聞與賽場資訊", "完整新聞內容與既有展開操作保留在下方。", "v60-news-scene")}
    ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<div class="tickerwrap"><div class="tickertrack" style="animation-duration:${tickerDur}s;">${tickerItems}<span class="tickersep">◆</span>${tickerItems}<span class="tickersep">◆</span></div></div>`, "開啟新聞跑馬燈") : `<div class="tickerwrap"><div class="tickertrack" style="animation-duration:${tickerDur}s;">${tickerItems}<span class="tickersep">◆</span>${tickerItems}<span class="tickersep">◆</span></div></div>`}
    ${show.map(n => `<p class="newsitem"><span class="newstime">${n.dateLabel}</span>${typeIcon[n.type] || ""+icon('news')+""} ${n.text}</p>`).join("")}
    ${feed.length > 5 ? `<button id="btn-news-toggle" class="btn-outline" style="margin-top:8px;">${UI.newsExpanded ? "收合" : `更多快訊（共${feed.length}則）`}</button>` : ""}
  </div>`;
}

/* ---------- v25 贊助商任務卡（主控台） ---------- */
function renderSponsorMissionCard() {
  const m = S.sponsorMission;
  if (!m || m.year !== S.seasonYear || m.settled) return "";
  const prog = sponsorMissionProgress();
  if (!prog) return "";
  const pctv = clamp(Math.round(prog.current / prog.target * 100), 0, 100);
  return `<div class="card">
    <div class="eyebrow">贊助商任務（達成可得 ${formatMoney(m.reward)}）</div>
    <p class="sub dark" style="margin:6px 0;">${m.label} — 目前進度 ${prog.current}/${m.target}${prog.done ? " "+icon('check')+" 已達標，季末結算入帳！" : ""}</p>
    <div class="injurybar"><div style="width:${pctv}%"></div></div>
  </div>`;
}

/* ---------- v26 季中特訓總覽卡（主控台） ---------- */
function renderMidTrainingCard(team) {
  if (typeof midTrainingPlayers !== "function" || !midTrainingSeasonActive()) return "";
  const list = midTrainingPlayers(team);
  if (list.length === 0) return "";
  return `<div class="card">
    <div class="eyebrow">${icon('training')} 季中特訓中（${list.length}/${midTrainingSlots(team)} 名額）</div>
    ${list.map(p => {
      const item = midItemByKey(p.midTraining.key);
      const pctv = clamp(Math.round(p.midTraining.points / MID_TRAINING_POINTS_PER_GAIN * 100), 0, 99);
      const ph = (typeof growthPhaseLabel === "function") ? growthPhaseLabel(p) : null; // v37⑦
      return `<p class="sub dark" style="margin:4px 0;">${p.name}（${p.level}）${ph ? `<span class="${ph.cls}" style="font-size:12px;">・${ph.text}</span>` : ""}：${item ? item.label : "特訓"}・已 +${p.midTraining.gained}/${MID_TRAINING_SEASON_CAP}，下次提升進度 ${pctv}%</p>
      <div class="injurybar slim trainbar"><div style="width:${pctv}%"></div></div>`;
    }).join("")}
    <p class="draftnote muted">特訓於球員詳情頁指派/停止。受訓中受傷風險上升、投手疲勞恢復變慢；受傷會自動退訓。</p>
  </div>`;
}

/* ---------- v26 情蒐報告卡（主控台，情蒐分析室Lv.1起） ---------- */
function renderScoutingReportCard(team, seasonOver) {
  if (typeof analysisRoomLevel !== "function") return "";
  const lv = analysisRoomLevel(team);
  if (lv < 1 || seasonOver || !S.schedule || S.currentDay >= S.schedule.length) return "";
  const day = S.schedule[S.currentDay];
  if (!day) return "";
  const g = day.find(x => x.home === team.id || x.away === team.id);
  if (!g) return "";
  const oppId = g.home === team.id ? g.away : g.home;
  const opp = S.teams[oppId];
  if (!opp) return "";
  const streak = opp.streak || 0;
  const streakTxt = streak > 1 ? `${streak}連勝中 ${icon('fire')}` : (streak < -1 ? `${-streak}連敗中 ${icon('ice')}` : "近況平平");
  let deep = "";
  if (lv >= 3) {
    const ob = Math.round(teamBattingRating(opp, S.players));
    const op = Math.round(teamPitchingRating(opp, S.players));
    deep = `<p class="sub dark" style="margin:4px 0;">${icon('chart')} 戰力評估：打線 <b>${ob}</b>／投手 <b>${op}</b>（本隊 ${Math.round(teamBattingRating(team, S.players))}／${Math.round(teamPitchingRating(team, S.players))}）</p>`;
  }
  return `<div class="card">
    <div class="eyebrow">${icon('search')} 情蒐報告（分析室 Lv.${lv}）</div>
    <p class="sub dark" style="margin:4px 0;">下一戰對手：<b>${opp.name}</b>（${opp.wins}勝${opp.losses}敗・${streakTxt}）${g.home === team.id ? "・主場" : "・客場"}</p>
    ${deep}
    ${lv < 3 ? `<p class="draftnote muted">分析室升至 Lv.3 可揭露對手攻投戰力數值。</p>` : ""}
  </div>`;
}

/* ---------- v25 春訓畫面 ---------- */
function renderSpringCamp() {
  if (!S.springCamp || S.springCamp.year !== S.seasonYear) prepareSpringCamp();
  const camp = S.springCamp;
  if (camp.executed) { UI.screen = "springReport"; render(); return; }
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  const nation = nationByName(camp.nation);
  const cost = springCostForNation(nation) * 10000;
  UI.springTab = UI.springTab || "1軍";
  const ids = UI.springTab === "1軍" ? team.roster1 : team.roster2;
  const players = ids.map(id => S.players[id]).filter(Boolean);
  // v29（Mars定案）：海外春訓僅開放B級以上國家（C/D級訓練環境不足）；母國青雲國不受限
  const gradeNations = ["S", "A", "B"].map(g => ({ g, list: NATIONS.filter(n => n.grade === g) }));
  const specLabels = nation.specialties.map(k => SPRING_MENU_LABEL[k]).join("、");
  // v29：春訓菜單直接顯示球員現況數據——每個訓練選項後面帶「現在值/天花板內比較」，弱點一眼可見
  const menuAttrOf = (p, key) => ({
    pVelocity: p.velocity, pBreaking: p.control, pStamina: p.stamina, pComposure: p.composure,
    bContact: p.contact, bPower: p.power, bEye: p.eye, bSpeed: p.speed,
    bDefense: p.fielding, bBunt: p.bunting, bStamina: p.stamina, bComposure: p.composure
  })[key];
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName} ・ 第${S.seasonYear}年</div><h1>春季訓練</h1></div>
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      ${typeof v59VisualScene === "function" ? v59VisualScene("spring_training_base_v58", "春訓基地場景", "SPRING TRAINING VISUAL", "春訓基地", "完整訓練設施與既有球員訓練配置保留在下方。", "v59-spring-scene") : ""}
      <div class="card">
        <div class="eyebrow">春訓地點</div>
        <select id="spring-nation" class="sortselect" style="width:100%;">
          ${gradeNations.map(({ g, list }) => `<optgroup label="${g}級國家（${g === "S" ? "頂級棒球強權" : g === "A" ? "一線強國" : g === "B" ? "中堅棒球國" : g === "C" ? "新興棒球國" : "萌芽中"}・${list[0] ? (springCostForNation(list[0]) === 0 ? "" : NATION_SPRING_COST_WAN[g] + "萬") : ""}）">
            ${list.map(n => `<option value="${n.name}" ${camp.nation === n.name ? "selected" : ""}>${n.name}${n.name === HOME_NATION_NAME ? "（母國・免費）" : `（${springCostForNation(n)}萬）`}</option>`).join("")}
          </optgroup>`).join("")}
        </select>
        <div class="attrgrid" style="margin-top:8px;">
          <div class="attr"><span>費用</span><b>${cost === 0 ? "免費" : formatMoney(cost)}</b></div>
          <div class="attr"><span>目前預算</span><b>${formatMoney(team.finance.budget)}</b></div>
          <div class="attr"><span>國家等級</span><b>${nation.grade}級</b></div>
          <div class="attr"><span>訓練專長</span><b>${specLabels}</b></div>
        </div>
        ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<p class="draftnote muted" style="margin:0;">${nation.flavor}。專長項目可獲得額外成效（${nation.grade}級：+${nation.grade === "S" ? "2~3" : nation.grade === "A" ? "1~3" : nation.grade === "B" ? "1~2" : "1"}）；${NATION_GRADE_ORDER[nation.grade] <= 2 && nation.name !== HOME_NATION_NAME ? "海外春訓期間會發生特殊事件（交流賽、媒體報導、名門友誼…，也可能水土不服）。" : nation.name === HOME_NATION_NAME ? "母國春訓穩定無風險，但沒有海外事件與國家專長以外的驚喜。" : "此等級國家事件較單純。"}單項訓練成效＝基礎1~2＋國家專長＋教練加成＋設施加成（合計最多+5，且不超過潛力天花板）。</p>`, "地點規則") : `<p class="draftnote muted">${nation.flavor}。</p>`}
      </div>
      <div class="tabrow">
        <button class="tab ${UI.springTab === "1軍" ? "active" : ""}" data-tab="1軍">1軍（${team.roster1.length}人）</button>
        <button class="tab ${UI.springTab === "2軍" ? "active" : ""}" data-tab="2軍">2軍（${team.roster2.length}人）</button>
      </div>
      <div class="btnrow"><button id="btn-spring-auto" class="btn-secondary">AI一鍵建議（${UI.springTab}全員）</button></div>
      <table class="stattable">
        <thead><tr><th>球員</th><th>訓練</th></tr></thead>
        <tbody>
          ${players.map(p => {
            const ovr = Math.round(trueOverall(p));
            const attrLine = p.isPitcher
              ? `速${velocityKmh(p.velocity)}km 控${p.control} 體${p.stamina} 壓${p.composure}`
              : `打${p.contact} 長${p.power} 選${p.eye} 速${p.speed} 守${p.fielding} 觸${p.bunting}`;
            return `<tr>
            <td><b>${p.name}</b>${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<span>${p.isPitcher ? "投手" : "野手"}${hasTrait(p, "grinder") ? "・練習狂" : ""}・${p.age}歲・OVR ${ovr}/${Math.max(ovr, p.potential)}<br>${attrLine}</span>`, "資料") : `<br><span class="draftnote muted">${p.isPitcher ? "投手" : "野手"}・${p.age}歲・OVR ${ovr}/${Math.max(ovr, p.potential)}<br>${attrLine}</span>`}</td>
            <td><select class="sortselect spring-menu-select" aria-label="${p.name}訓練項目" data-id="${p.id}">
              ${springMenuFor(p).map(m => { const cur = menuAttrOf(p, m.key); const capped = cur >= p.potential; return `<option value="${m.key}" ${camp.assignments[p.id] === m.key ? "selected" : ""}>${m.label}${nation.specialties.includes(m.key) ? ""+icon('star-solid')+"" : ""}（現${cur}${capped ? "・已達頂" : ""}）</option>`; }).join("")}
            </select></td>
          </tr>`;}).join("")}
        </tbody>
      </table>
      ${foldNote(`<p class="draftnote muted">${icon('star-solid')}＝本次春訓地點的國家專長項目，可獲得額外成效。每個訓練選項後面標示該能力「現在值」，低於綜合值的就是弱點；「已達頂」代表該項已到潛力天花板，再練也不會提升。春訓成果除了主練項目外，其他能力也會依球員特性連動提升（成果報告會完整列出）。</p>`)}
      <div class="btnrow"><button id="btn-spring-go" class="btn-primary">確認出發春訓${cost > 0 ? `（支付 ${formatMoney(cost)}）` : "（母國・免費）"}</button></div>
    </div>`;
  document.getElementById("spring-nation").onchange = e => setSpringNation(e.target.value);
  app.querySelectorAll(".tab").forEach(btn => { btn.onclick = () => { UI.springTab = btn.dataset.tab; render(); }; });
  document.getElementById("btn-spring-auto").onclick = () => springAutoAssign(UI.springTab);
  app.querySelectorAll(".spring-menu-select").forEach(sel => { sel.onchange = e => setSpringAssignment(sel.dataset.id, e.target.value); });
  document.getElementById("btn-spring-go").onclick = () => { UI.flash = null; executeSpringCamp(); };
}

/* ---------- v25 春訓報告畫面 ---------- */
function renderSpringReport() {
  const camp = S.springCamp;
  if (!camp || !camp.report) { UI.screen = "dashboard"; render(); return; }
  const r = camp.report;
  UI.springReportTab = UI.springReportTab || "1軍";
  const lines = r.lines.filter(l => l.level === UI.springReportTab);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName} ・ 第${S.seasonYear}年</div><h1>春訓成果報告</h1></div>
      ${typeof v59VisualScene === "function" ? v59VisualScene("spring_training_base_v58", "春訓成果場景", "SPRING REPORT VISUAL", "春訓成果", "完整成果數據與特殊事件保留在下方。", "v59-spring-report-scene") : ""}
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">春訓地點</div><div class="sb-value small">${r.nation}（${r.grade}級）</div></div>
        <div class="sb-row small"><div class="sb-label">花費</div><div class="sb-value small">${r.cost === 0 ? "免費（母國）" : formatMoney(r.cost)}</div></div>
      </div>
      ${r.events && r.events.length > 0 ? `
      <div class="card">
        <div class="eyebrow">春訓特殊事件</div>
        ${r.events.map(ev => `<p class="sub dark" style="margin:6px 0;">${["homesick", "overtrain"].includes(ev.type) ? ""+icon('warn')+"" : ""+icon('sparkle')+""} ${ev.text}</p>`).join("")}
      </div>` : ""}
      <div class="tabrow">
        <button class="tab ${UI.springReportTab === "1軍" ? "active" : ""}" data-tab="1軍">1軍成果</button>
        <button class="tab ${UI.springReportTab === "2軍" ? "active" : ""}" data-tab="2軍">2軍成果</button>
      </div>
      <table class="stattable">
        <thead><tr><th>球員</th><th>成效</th></tr></thead>
        <tbody>
          ${lines.map(l => {
            const fullChanges = l.changes.length === 0 ? "已達潛力上限，維持水準" : l.changes.map(c => `${c.traitSpill ? ""+icon('link')+"" : ""}${c.label} ${c.from}→<b>${c.to}</b>${c.traitSpill ? "<span class=\"draftnote muted\">(特性連動)</span>" : (c.linked ? "<span class=\"draftnote muted\">(連動)</span>" : "")}`).join("、");
            const compactChanges = l.changes.length === 0 ? "維持" : l.changes.map(c => `${c.label}+${Math.max(0, c.to - c.from)}`).join("・");
            const detail = `<span>訓練：${l.menu}<br>完整成效：${fullChanges}</span>`;
            return `<tr><td>${l.name}</td><td>${compactChanges}${typeof v59TextDisclosure === "function" ? v59TextDisclosure(detail, "詳情") : `<br>${l.menu}<br>${fullChanges}`}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
      ${foldNote(`<p class="draftnote muted">「連動」＝主練項目帶動的相關能力；「特性連動」＝依球員特性（練習狂、年輕潛力、觸擊職人…）額外提升的其他能力。</p>`)}
      <div class="btnrow"><button id="btn-spring-done" class="btn-primary">春訓結束，迎接開幕戰！</button></div>
    </div>`;
  app.querySelectorAll(".tab").forEach(btn => { btn.onclick = () => { UI.springReportTab = btn.dataset.tab; render(); }; });
  document.getElementById("btn-spring-done").onclick = () => {
    UI.flash = `第 ${S.seasonYear} 年球季正式開幕！`;
    UI.screen = "dashboard";
    persist();
    render();
  };
}

/* ---------- v31-B 季後自主訓練/傳承報告畫面 ---------- */
function renderSelfTraining() {
  const r = S.selfTrainingReport || { selfTrained: 0, newTraits: [], newSkills: [], inheritance: null, aiInheritCount: 0 };
  const team = S.teams[S.userTeamId];
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}・第${S.seasonYear}年 休賽季</div><h1>季後自主訓練窗</h1></div>
      <div class="card issuecard">
        <div class="eyebrow">自主訓練成果</div>
        <p class="sub dark">季後空窗期，球員各自依生涯型態自主鍛鍊。本季共有 <b>${r.selfTrained}</b> 位球員在自主訓練中小幅成長。</p>
      </div>
      ${r.newSkills.length > 0 ? `<div class="card"><div class="eyebrow">${icon('medal')} 領悟稱號/特殊技</div>
        <ul class="issuelist" style="color:var(--ink);">${r.newSkills.map(x => `<li><b>${x.name}</b> 領悟了「${icon('star-solid')}${x.skill}」</li>`).join("")}</ul></div>` : ""}
      ${r.newTraits.length > 0 ? `<div class="card"><div class="eyebrow">${icon('sparkle')} 磨練出新特質</div>
        <ul class="issuelist" style="color:var(--ink);">${r.newTraits.map(x => `<li><b>${x.name}</b> 練出了「${x.trait}」</li>`).join("")}</ul></div>` : ""}
      ${r.inheritance ? `<div class="card" style="border:1px solid var(--green-text);"><div class="eyebrow">${icon('grad')} 世代傳承</div>
        <p class="sub dark">老將 <b>${r.inheritance.seniorName}</b> 將畢生絕技「<b>${r.inheritance.item}</b>」傳授給新星 <b>${r.inheritance.juniorName}</b>！${r.inheritance.type === "skill" ? "後輩獲得該稱號並小幅提升對應能力。" : "後輩習得此後天特質。"}</p></div>`
        : `<div class="card"><div class="eyebrow">${icon('grad')} 世代傳承</div>${foldNote(`<p class="sub dark">本季你的球隊沒有發生傳承（需資深老將持有可傳承的後天特質/稱號，且隊內有年輕高潛力後輩，緣分到了才會成功；每隊每年至多一次）。</p>`)}</div>`}
      ${r.aiInheritCount > 0 ? `<p class="draftnote muted">本季全聯盟另有 ${r.aiInheritCount} 支球隊發生了世代傳承。</p>` : ""}
      <div class="btnrow"><button id="btn-selftrain-done" class="btn-primary">前往春訓</button></div>
    </div>`;
  document.getElementById("btn-selftrain-done").onclick = () => proceedFromSelfTraining();
}

/* ---------- v25 國際賽事畫面（v38③改為多階段：選人 → 排陣 → 逐場 → 戰報） ---------- */
function intlPosLabel(pos) { return (typeof POS_LABEL === "object" && POS_LABEL[pos]) ? POS_LABEL[pos] : pos; }
function intlStatLine(p, st) {
  if (!st) return "";
  if (p.isPitcher) {
    const era = st.IP > 0 ? (st.ER * 9 / st.IP).toFixed(2) : "0.00";
    return `${st.G}場 ${st.W}勝${st.L}敗 防禦率${era} ${Math.round(st.IP * 10) / 10}局 ${st.SO}K`;
  }
  const avg = st.AB > 0 ? (st.H / st.AB).toFixed(3).replace(/^0/, "") : ".000";
  return `${st.G}場 打擊${avg} ${st.HR}轟 ${st.RBI}打點 ${st.SB}盜`;
}
/* v40⑤：國際賽選人交給國家隊教練——預設顯示教練擇優的30人名單（含本隊入選提示與借調教練），
   玩家按一鍵確定出征；原手動介面完整保留為「進階：手動調整名單」備援（UI.intlManual=true 進入）。 */
function renderIntlSquadStage(t) {
  if (UI.intlManual) return renderIntlSquadStageManual(t);
  const ids = UI.intlPreview && UI.intlPreview.year === t.year ? UI.intlPreview.ids : intlSuggestSquad();
  UI.intlPreview = { year: t.year, ids };
  const coach = t.natCoach || pickNationalCoach();
  const squad = ids.map(id => S.players[id]).filter(Boolean);
  const mineList = squad.filter(p => p.team === S.userTeamId);
  const pitchers = squad.filter(p => p.isPitcher);
  const batters = squad.filter(p => !p.isPitcher);
  const rowOf = p => {
    const tm = S.teams[p.team];
    const mine = p.team === S.userTeamId;
    const posTxt = p.isPitcher ? `投手・${p.role}` : (p.positions || []).map(x => intlPosLabel(x.pos)).join("/");
    return `<p class="sub dark" style="margin:3px 0;">${mine ? ""+icon('star')+"" : "・"}<b>${p.name}</b>${mine ? `<span class="benchrole-tag">本隊</span>` : ""} <span class="muted">${tm ? tm.name : "-"}・${p.age}歲・${posTxt}・綜合${Math.round(trueOverall(p))}</span></p>`;
  };
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">第${t.year}年（${GAME_EPOCH_YEAR + t.year}年）・4年一度</div><h1>世界棒球錦標賽</h1></div>
      <div class="card">
        <div class="eyebrow">${icon('flag-home')} ${HOME_NATION_NAME}代表隊・教練擇優名單</div>
        <p class="sub dark">國家隊總教練 <b>${coach.name}</b>（借調自${coach.from}）已依全聯盟選手數據敲定 <b>${INTL_SQUAD_SIZE}</b> 人名單（投手 ${pitchers.length}／捕手保底 ${INTL_SQUAD_MIN_CATCHERS}）。</p>
        ${mineList.length > 0 ? `<p class="sub dark">${icon('star')} 你的球員有 <b>${mineList.length}</b> 位入選：<b>${mineList.map(p => p.name).join("、")}</b>——國手歷練將帶來抗壓成長，也請留意他們的季後狀態。</p>` : `<p class="sub dark">本屆你的球員無人入選。</p>`}
        ${foldNote(`<p class="sub dark">名單由教練依數據擇優自動入選（14投＋2捕＋野手保底9），玩家不需逐一挑人；母國成績連動全聯盟人氣與明年收入。若想親自操刀，可用下方「手動調整名單」。</p>`)}
        <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
          <button id="btn-intl-go" class="btn-primary">確定名單，進入排陣</button>
          <button id="btn-intl-manual" class="btn-outline">進階：手動調整名單</button>
        </div>
      </div>
      <div class="divlabel">投手（${pitchers.length}人）</div>
      <div class="card" style="padding:10px 12px;">${pitchers.map(rowOf).join("")}</div>
      <div class="divlabel">野手（${batters.length}人）</div>
      <div class="card" style="padding:10px 12px;">${batters.map(rowOf).join("")}</div>
    </div>`;
  document.getElementById("btn-intl-go").onclick = () => {
    const r = intlAutoSelectSquad();
    UI.flash = r.msg; UI.intlPreview = null; render();
  };
  document.getElementById("btn-intl-manual").onclick = () => { UI.intlManual = true; UI.intlSquad = ids.slice(); render(); };
}
function renderIntlSquadStageManual(t) {
  const picked = UI.intlSquad || [];
  const pool = intlCandidatePool().slice(0, 90); // v39①：候選 60→90（名單擴編為30人）
  const pit = picked.map(id => S.players[id]).filter(p => p && p.isPitcher).length;
  const cat = picked.map(id => S.players[id]).filter(p => p && !p.isPitcher && p.positions && p.positions.some(x => x.pos === "C")).length;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">第${t.year}年（${GAME_EPOCH_YEAR + t.year}年）・4年一度</div><h1>世界棒球錦標賽</h1></div>
      <div class="card">
        <div class="eyebrow">${icon('flag-home')} ${HOME_NATION_NAME}代表隊・召集名單</div>
        ${foldNote(`<p class="sub dark">你被推舉兼任母國代表隊的管理層：從全聯盟本土球員中挑出 <b>${INTL_SQUAD_SIZE}</b> 人出征世界賽。
        （不限自家球員；受傷球員無法入選。國手在大賽淬鍊下會獲得抗壓性成長，母國成績也連動全聯盟人氣與明年收入。）</p>`)}
        <p class="sub dark">目前：<b>${picked.length}／${INTL_SQUAD_SIZE}</b> 人・投手 <b>${pit}</b>／${INTL_SQUAD_MIN_PITCHERS}・捕手 <b>${cat}</b>／${INTL_SQUAD_MIN_CATCHERS}</p>
        <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
          <button id="btn-intl-auto" class="btn-secondary">自動推薦${INTL_SQUAD_SIZE}人</button>
          <button id="btn-intl-clear" class="btn-secondary">全部清空</button>
          <button id="btn-intl-squad-ok" class="btn-primary">確定名單，進入排陣</button>
        </div>
      </div>
      <div class="divlabel">候選名單（聯盟本土能力前90名）</div>
      ${pool.map(p => {
        const on = picked.includes(p.id);
        const tm = S.teams[p.team];
        const mine = p.team === S.userTeamId;
        const posTxt = p.isPitcher ? `投手・${p.role}` : (p.positions || []).map(x => intlPosLabel(x.pos)).join("/");
        return `<div class="card ${on ? "me" : ""}" style="padding:8px 10px;">
          <div class="rowline"><b>${p.name}</b>${mine ? `<span class="benchrole-tag">本隊</span>` : ""} <span class="muted">${tm ? tm.name : "-"}・${p.age}歲・${posTxt}・綜合${Math.round(trueOverall(p))}</span></div>
          <div class="btnrow"><button id="intl-pick-${p.id}" class="${on ? "btn-secondary" : "btn-primary"}">${on ? "移出名單" : "選入"}</button></div>
        </div>`;
      }).join("")}
    </div>`;
  document.getElementById("btn-intl-auto").onclick = () => { UI.intlSquad = intlSuggestSquad(); render(); };
  document.getElementById("btn-intl-clear").onclick = () => { UI.intlSquad = []; render(); };
  document.getElementById("btn-intl-squad-ok").onclick = () => {
    const t2 = S.intlTournament;
    if (t2 && !t2.natCoach) t2.natCoach = pickNationalCoach(); // v40⑤：手動路徑也配置國家隊教練
    const r = intlSetSquad(UI.intlSquad || []);
    if (r.ok) { UI.intlManual = false; UI.intlPreview = null; }
    UI.flash = r.msg; render();
  };
  pool.forEach(p => {
    const el = document.getElementById("intl-pick-" + p.id);
    if (!el) return;
    el.onclick = () => {
      const cur = UI.intlSquad || [];
      if (cur.includes(p.id)) UI.intlSquad = cur.filter(x => x !== p.id);
      else if (cur.length >= INTL_SQUAD_SIZE) { UI.flash = `名單已滿 ${INTL_SQUAD_SIZE} 人，請先移出其他球員。`; }
      else UI.intlSquad = cur.concat([p.id]);
      render();
    };
  });
}
function renderIntlLineupStage(t) {
  const squad = (t.squadIds || []).map(id => S.players[id]).filter(Boolean);
  const batters = squad.filter(p => !p.isPitcher);
  const pitchers = squad.filter(p => p.isPitcher);
  const lu = t.natLineup || [];
  const posList = LINEUP_FIELD_POSITIONS.concat(["DH"]);
  const rot = t.natRotation || [];
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">第${t.year}年・${HOME_NATION_NAME}代表隊</div><h1>排出你的國家隊</h1></div>
      <div class="card">
        <div class="eyebrow">${icon('baseball')} 先發打線（9棒・守位不可重複、必須有捕手）</div>
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
          const sl = lu[i] || { playerId: null, position: "DH" };
          const p = S.players[sl.playerId];
          return `<div class="rowline" style="margin:4px 0;">
            <b style="min-width:36px;display:inline-block;">${i + 1}棒</b>
            <select id="intl-lu-p-${i}" class="sortselect">
              <option value="">－選擇球員－</option>
              ${batters.map(b => `<option value="${b.id}" ${sl.playerId === b.id ? "selected" : ""}>${b.name}（綜合${Math.round(trueOverall(b))}）</option>`).join("")}
            </select>
            <select id="intl-lu-pos-${i}" class="sortselect">
              ${posList.map(ps => `<option value="${ps}" ${sl.position === ps ? "selected" : ""}>${intlPosLabel(ps)}${p && ps !== "DH" ? `（守備${effectivePositionFielding(p, ps)}）` : ""}</option>`).join("")}
            </select>
          </div>`;
        }).join("")}
      </div>
      <div class="card">
        <div class="eyebrow">${icon('rotation')} 先發輪值（依序登板，最多4人）</div>
        ${[0, 1, 2, 3].map(i => `<div class="rowline" style="margin:4px 0;">
          <b style="min-width:60px;display:inline-block;">先發${i + 1}</b>
          <select id="intl-rot-${i}" class="sortselect">
            <option value="">－不指定－</option>
            ${pitchers.map(p => `<option value="${p.id}" ${rot[i] === p.id ? "selected" : ""}>${p.name}（球速${p.velocity}／控球${p.control}）</option>`).join("")}
          </select>
        </div>`).join("")}
      </div>
      <div class="card">
        <p class="sub dark">代表隊${INTL_SQUAD_SIZE}人：${squad.map(p => p.name).join("、")}</p>
        <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
          <button id="btn-intl-autolu" class="btn-secondary">自動排陣</button>
          <button id="btn-intl-lu-ok" class="btn-primary">確定，出征世界賽</button>
        </div>
      </div>
    </div>`;
  [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(i => {
    const pe = document.getElementById("intl-lu-p-" + i);
    if (pe) pe.onchange = () => { intlSetLineupSlot(i, pe.value, null); render(); };
    const se = document.getElementById("intl-lu-pos-" + i);
    if (se) se.onchange = () => { intlSetLineupSlot(i, null, se.value); render(); };
  });
  [0, 1, 2, 3].forEach(i => {
    const el = document.getElementById("intl-rot-" + i);
    if (el) el.onchange = () => {
      const cur = (t.natRotation || []).slice();
      while (cur.length <= i) cur.push(null);
      cur[i] = el.value || null;
      t.natRotation = cur.filter(Boolean);
      persist(); render();
    };
  });
  document.getElementById("btn-intl-autolu").onclick = () => {
    const tm = intlHomeTeam();
    t.natLineup = autoLineup(tm, S.players);
    t.natRotation = autoRotation(tm, S.players);
    persist(); render();
  };
  document.getElementById("btn-intl-lu-ok").onclick = () => {
    const r = intlConfirmLineup();
    UI.flash = r.msg; render();
  };
}
function intlGroupTables(t) {
  return t.groups.map((g, i) => `
    <div class="card">
      <div class="eyebrow">第${i + 1}組${i === t.homeGroupIdx ? "（母國）" : ""}</div>
      <table class="stattable"><tbody>
        ${g.map((n, j) => `<tr class="${n.isHome ? "me" : ""}"><td>${j === 0 && (t.stage === "report" || i !== t.homeGroupIdx) ? ""+icon('check')+"" : ""} ${n.name}${n.isHome ? "（母國）" : ""}</td><td>${n.grade}級</td><td>${n.w}勝${n.l}敗</td></tr>`).join("")}
      </tbody></table>
    </div>`).join("");
}
function intlSquadStatsCard(t) {
  const ids = Object.keys(t.stats || {});
  if (!ids.length) return "";
  const rows = ids.map(id => ({ p: S.players[id], st: t.stats[id] })).filter(x => x.p)
    .sort((a, b) => (b.p.isPitcher ? 0 : 1) - (a.p.isPitcher ? 0 : 1));
  return `<div class="card">
    <div class="eyebrow">${icon('chart')} 國手本屆成績</div>
    ${rows.map(x => `<p class="sub dark" style="margin:3px 0;">${x.p.team === S.userTeamId ? ""+icon('star')+" " : ""}${x.p.name}：${intlStatLine(x.p, x.st)}</p>`).join("")}
  </div>`;
}
function intlScheduleCard(t) {
  return `<div class="card">
    <div class="eyebrow">${icon('calendar')} ${HOME_NATION_NAME}賽程</div>
    ${t.schedule.map(g => `<p class="sub dark" style="margin:3px 0;">${g.round}　${g.home ? "" : "＠"}vs ${g.opp}（${g.oppGrade}級）　${g.played ? `<b>${g.myScore}：${g.oppScore}　${g.win ? ""+icon('check')+"勝" : ""+icon('cross')+"敗"}</b>` : "<span class='muted'>未開打</span>"}</p>`).join("")}
  </div>`;
}
function renderIntlPlayStage(t) {
  const next = t.schedule.find(x => !x.played);
  const homeTeam = intlHomeTeam();
  const lu = getLineupBatters(homeTeam, S.players);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">第${t.year}年・世界棒球錦標賽</div><h1>${HOME_NATION_NAME}代表隊出征</h1></div>
      ${next ? `<div class="card champcard">
        <div class="eyebrow">下一場：${next.round}</div>
        <div class="champname">${HOME_NATION_NAME} ${next.home ? "vs" : "＠"} ${next.opp}</div>
        <div class="champlabel">${next.opp}（${next.oppGrade}級）・${next.home ? "主場" : "客場"}</div>
        <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
          <button id="btn-intl-play" class="btn-primary">開打！</button>
          <button id="btn-intl-autoall" class="btn-secondary">自動模擬到落幕</button>
        </div>
      </div>` : `<div class="card"><p class="sub dark">賽程結算中…</p></div>`}
      ${intlScheduleCard(t)}
      <div class="card">
        <div class="eyebrow">${icon('baseball')} 目前先發打線</div>
        ${lu.map((p, i) => `<p class="sub dark" style="margin:2px 0;">${i + 1}棒 ${intlPosLabel((homeTeam.lineup.find(s => s.playerId === p.id) || {}).position || "DH")}　${p.name}</p>`).join("")}
      </div>
      ${intlSquadStatsCard(t)}
      <div class="divlabel">分組賽戰績（40國・8組循環，各組第1晉級8強）</div>
      ${intlGroupTables(t)}
      ${t.rounds.length ? `<div class="divlabel">淘汰賽</div>` + t.rounds.map(rd => `
        <div class="card">
          <div class="eyebrow">${rd.label}</div>
          ${rd.games.map(gm => `<p class="sub dark" style="margin:6px 0;">${gm.a} ${gm.sa} : ${gm.sb} ${gm.b} → <b>${gm.winner}</b> 晉級</p>`).join("")}
        </div>`).join("") : ""}
    </div>`;
  const bp = document.getElementById("btn-intl-play");
  if (bp) bp.onclick = () => {
    const g = intlPlayNextGame();
    if (g) UI.flash = `${g.round} ${HOME_NATION_NAME} ${g.myScore}：${g.oppScore} ${g.opp} — ${g.win ? "獲勝！" : "落敗。"}`;
    render();
  };
  const ba = document.getElementById("btn-intl-autoall");
  if (ba) ba.onclick = () => { intlAutoResolveAll(); render(); };
}
function renderIntlReportStage(t) {
  const finishLabel = { champion: ""+icon('trophy')+" 世界冠軍！", final4: ""+icon('medal4')+" 世界4強", top8: "8強止步", groupOut: "小組賽淘汰" }[t.homeFinish];
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">第${t.year}年（${GAME_EPOCH_YEAR + t.year}年）・4年一度</div><h1>世界棒球錦標賽</h1></div>
      <div class="card champcard">
        <div class="eyebrow">本屆冠軍</div>
        <div class="champname">${t.champion}</div>
        <div class="champlabel">${t.champion === HOME_NATION_NAME ? ""+icon('trophy')+" 我們的母國站上世界之巔！" : ""+icon('trophy')+" 世界冠軍"}</div>
      </div>
      <div class="card ${t.homeFinish === "groupOut" ? "issuecard" : ""}">
        <div class="eyebrow">${HOME_NATION_NAME}代表隊戰果：${finishLabel}</div>
        ${t.effects.map(e => `<p class="sub dark" style="margin:6px 0;">${e}</p>`).join("")}
        <p class="draftnote muted">代表隊主力：${t.squadNames.join("、")} 等${INTL_SQUAD_SIZE}人（由你親自召集）。</p>
      </div>
      ${intlScheduleCard(t)}
      ${intlSquadStatsCard(t)}
      <div class="divlabel">分組賽戰績（40國・8組循環，各組第1晉級8強）</div>
      ${intlGroupTables(t)}
      <div class="divlabel">淘汰賽</div>
      ${t.rounds.map(rd => `
        <div class="card">
          <div class="eyebrow">${rd.label}</div>
          ${rd.games.map(gm => `<p class="sub dark" style="margin:6px 0;">${gm.a} ${gm.sa} : ${gm.sb} ${gm.b} → <b>${gm.winner}</b> 晉級</p>`).join("")}
        </div>`).join("")}
      <div class="btnrow"><button id="btn-intl-done" class="btn-primary">賽事落幕，進入休賽季</button></div>
    </div>`;
  document.getElementById("btn-intl-done").onclick = () => finishIntlTournament();
}
function renderIntlTournament() {
  const t = S.intlTournament;
  if (!t) { UI.screen = "dashboard"; render(); return; }
  // v38③：多階段賽會——選人 → 排陣 → 逐場 → 戰報（舊存檔沒有 stage 時視為戰報，維持相容）
  const stage = t.stage || "report";
  if (stage === "squad") {
    if (!UI.intlSquad) UI.intlSquad = intlSuggestSquad(); // 預設帶入推薦名單，玩家再增刪
    return renderIntlSquadStage(t);
  }
  if (stage === "lineup") return renderIntlLineupStage(t);
  if (stage === "play") return renderIntlPlayStage(t);
  return renderIntlReportStage(t);
}

/* ====================================================================
   v27 高層目標卡＋信任度條＋解職Game Over畫面
   ==================================================================== */
/* v37① C/D 國家平行活動卡（主控台・開幕前顯示）：國際交流賽／海外行銷企劃，各一季一次。 */
function renderCdActivitiesCard() {
  if (!S.gameStarted) return "";
  if (typeof ensureCdActivities !== "function") return "";
  const st = ensureCdActivities();
  const canRun = S.currentDay === 0;
  const team = S.teams[S.userTeamId];
  // v38④：選單直接標出該國友好度，讓「長線耕耘哪一國」變成可讀的決策
  const natOpts = cdActNations().map(n => {
    const lv = (typeof nationBondLevel === "function") ? nationBondLevel(n.name) : 0;
    return `<option value="${n.name}">${n.name}（${n.name === HOME_NATION_NAME ? "母國" : n.grade + "級"}・友好${lv}）</option>`;
  }).join("");
  // 已建立交情的國家一覽＋已解鎖好處
  const bonds = (typeof ensureNationBonds === "function") ? ensureNationBonds() : {};
  const bondNames = Object.keys(bonds).filter(n => bonds[n] > 0).sort((a, b) => bonds[b] - bonds[a]);
  const bondRows = bondNames.length ? bondNames.map(n => {
    const lv = nationBondLevel(n);
    const perks = nationBondPerks(lv);
    return `<p class="sub dark" style="margin:2px 0;">${icon('handshake')} <b>${n}</b> 友好度 ${lv}／${NATION_BOND_MAX}（${nationBondLabel(lv)}）${perks.length ? `<span class="muted"> — ${perks.join("、")}</span>` : ""}</p>`;
  }).join("") : `<p class="sub muted" style="margin:2px 0;">尚未與任何國家建立交情。友好度 3／5／7／10 各有解鎖。</p>`;
  return `<div class="card cdact-card">
    <div class="eyebrow">${icon('globe')} 國際交流／海外行銷</div>
    ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<p class="sub dark" style="margin:0;">${canRun ? "開幕前開放；交流與行銷各一季一次。" : "畫面全年保留；實際執行僅限開幕前。"} 海外春訓僅開放 B 級以上，這裡補上 C／D 級國家與母國的經營用途。</p>`, "活動規則") : ""}
    <div class="v58-dual-scene-row">
      ${v60CompatVisualScene("international_exchange_v58", "國際交流場景", "EXCHANGE", "國際交流", "出訪、友誼賽與跨國交流的操作保留在下方。", "v60-compact-scene")}
      ${v60CompatVisualScene("overseas_marketing_v58", "海外行銷場景", "OVERSEAS", "海外行銷", "海外市場檔期與執行按鈕保留在下方。", "v60-compact-scene")}
    </div>
    <p class="v59-compact-line">${canRun ? "本季可執行" : "本季已鎖定"}・預算：<b>${formatMoney(team.finance.budget)}</b></p>
    <div style="margin:6px 0;">${bondNames.length ? bondRows : `<p class="v59-compact-line">交情：尚未建立</p>`}</div>
    <div style="margin:8px 0;">
      <span class="benchrole-tag">交流賽</span> 人氣↑・士氣↑・潛力股
      ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<p class="sub dark" style="margin:0;">出訪打友誼賽，可提升人氣與全隊士氣，小機率發掘當地潛力股。</p>`, "交流賽說明") : ""}
      <select id="cd-exchange-nation" class="sortselect" ${canRun ? "" : "disabled"}>${natOpts}</select>
      <div class="btnrow"><button id="btn-cd-exchange" class="btn-secondary" ${st.exchangeDone || !canRun ? "disabled" : ""}>${st.exchangeDone ? "本季完成" : "執行交流"}</button></div>
    </div>
    <div style="margin:8px 0;">
      <span class="benchrole-tag">行銷企劃</span> 海外市場：回收・人氣
      ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<p class="sub dark" style="margin:0;">海外市場檔期偏財務回收與人氣，約七成成功。</p>`, "行銷說明") : ""}
      <select id="cd-marketing-nation" class="sortselect" ${canRun ? "" : "disabled"}>${natOpts}</select>
      <div class="btnrow"><button id="btn-cd-marketing" class="btn-secondary" ${st.marketingDone || !canRun ? "disabled" : ""}>${st.marketingDone ? "本季完成" : "執行行銷"}</button></div>
    </div>
  </div>`;
}

function renderKpiCard() {
  if (!S.seasonKPI || S.seasonKPI.year !== S.seasonYear || !S.gmCareer) return "";
  const trust = S.gmCareer.trust;
  const trustCls = trust >= 60 ? "good" : (trust >= 30 ? "mid" : "bad");
  return `<div class="card kpicard">
    <div class="eyebrow">${icon('museum')} 高層年度目標（信任度 ${trust}／100）</div>
    <div class="trustbar"><div class="trustfill ${trustCls}" style="width:${trust}%"></div></div>
    ${S.seasonKPI.goals.map(g => {
      const settledR = S.seasonKPI.settled ? (S.seasonKPI.results || []).find(r => r.label === g.label) : null;
      const status = settledR ? (settledR.achieved ? ""+icon('check')+"" : ""+icon('cross')+"") : ""+icon('target')+"";
      return `<p class="sub dark kpigoal">${status} <b>${g.label}</b><span class="kpiprog">${S.seasonKPI.settled ? "" : kpiProgress(g)}</span></p>`;
    }).join("")}
    ${trust < 30 && !S.seasonKPI.settled ? `<p class="draftnote" style="color:var(--bad,#c0392b);">${icon('warn')} 高層的耐心所剩無幾——信任歸零就會遭到解職！</p>` : ""}
    ${(typeof canNegotiateKpi === "function" && canNegotiateKpi()) ? `
      <div class="kpinego-card" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);">
        ${foldNote(`<p class="sub dark" style="margin:2px 0;">${icon('handshake')} 開季前期可與高層<b>協商降低成績目標一階</b>（重建期實用）。交換條件：達成獎勵減半；且若連降階後的目標都達不到，會額外扣信任。<b>一季只能協商一次</b>。</p>`)}
        <div class="btnrow"><button id="btn-kpi-negotiate" class="btn-secondary">與高層協商降標</button></div>
      </div>` : (S.seasonKPI.negotiated && !S.seasonKPI.settled ? `<p class="draftnote muted">本季已與高層協商過目標。</p>` : "")}
  </div>`;
}

/* ---------- v32：風聲情報卡（依交易球探精確度分級顯示）---------- */
function renderRumorCards() {
  if (!S.aiTrade) return "";
  const active = (S.aiTrade.rumors || []).filter(r => !r.done && !r.cancelled && !r.dismissed);
  if (active.length === 0) return "";
  const lv = rumorDetailLevel();
  return active.map(r => {
    const seller = S.teams[r.sellerId], buyer = S.teams[r.buyerId];
    const vet = S.players[r.sellerGives[0]];
    const chips = r.buyerGives.map(id => S.players[id]).filter(Boolean);
    const when = r.resolveAtSeasonStart ? "新球季開幕時定案" : `約 ${Math.max(1, r.daysLeft)} 天後定案`;
    let detail;
    if (lv >= 2) detail = `<p class="sub dark">${buyer.name}擬以 <b>${chips.map(p => `${p.name}（${p.age}歲）`).join("、")}</b> 向${seller.name}換取 <b>${vet ? `${vet.name}（${vet.age}歲）` : "主力球員"}</b>。球探研判撮合比率約 <b>${r.neutralRatio}</b>。</p>`;
    else if (lv >= 1) detail = `<p class="sub dark">${buyer.name}正向${seller.name}洽談 <b>${vet ? vet.name : "某位主力"}</b> 的交易，包裹內容尚未探明。</p>`;
    else detail = `<p class="sub dark">${buyer.name}與${seller.name}之間有交易動作，詳情不明（交易球探能力不足或職位空缺）。</p>`;
    const canAct = tradeWindowOpen();
    return `<div class="card kpicard">
      <div class="eyebrow">${icon('antenna')} 交易風聲（${when}）</div>
      ${detail}
      ${foldNote(`<p class="draftnote muted">插隊搶人：你的報價須明顯優於現有買家（比率+${Math.round(AI_TRADE_INTERCEPT_PREMIUM * 100)}%），搶成賣方+好感、被搶買家記恨。慫恿破局：耗賣方好感1點，成功機率依交情20~50%（人情型加倍），每筆限一次。</p>`)}
      <div class="btnrow">
        <button class="btn-primary rumor-intercept" data-rid="${r.id}" ${canAct && lv >= 1 ? "" : "disabled"}>插隊搶人</button>
        <button class="btn-secondary rumor-persuade" data-rid="${r.id}" ${r.persuaded ? "disabled" : ""}>${r.persuaded ? "已慫恿過" : "慫恿破局"}</button>
        <button class="btn-outline rumor-dismiss" data-rid="${r.id}">靜觀其變</button>
      </div>
    </div>`;
  }).join("");
}
/* 插隊搶人：開交易畫面並預載風聲目標 */
function interceptRumorUi(rumorId) {
  const r = rumorById(rumorId);
  if (!r || r.done || r.cancelled) { render(); return; }
  openTradeBuilder(r.sellerId);
  UI.tradeGet = r.sellerGives.slice();
  UI.tradeIntercept = rumorId;
  render();
}

/* ---------- v32：AI主動提案卡 ---------- */
/* v36第10階段：突發事件卡（一次一張，選項各有代價與後果） */
function renderEventCard() {
  const ev = S.activeEvent;
  if (!ev) return "";
  // v38②：連鎖事件標示為「後續發展」，讓玩家看得出這是先前某個選擇的後果
  return `<div class="card issuecard">
    <div class="eyebrow">${ev.chained ? ""+icon('link')+" 後續發展" : ""+icon('bolt')+" 突發事件"}・${ev.category}：${ev.title}</div>
    ${ev.chained ? `<p class="sub muted" style="margin:2px 0;">這是你先前決定所種下的後果。</p>` : ""}
    <p class="sub dark">${ev.desc}</p>
    <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
      ${ev.options.map((o, i) => `<button class="${i === 0 ? "btn-primary" : "btn-secondary"} event-opt-btn" data-key="${o.key}">${o.label}</button>`).join("")}
    </div>
  </div>`;
}

function renderAiProposalCard() {
  const pr = S.aiTrade && S.aiTrade.proposal;
  if (!pr) return "";
  const ai = S.teams[pr.teamId];
  if (!ai) return "";
  const ps = personaOf(ai);
  const af = affinityLabel(gmAffinity(ai));
  const inP = pr.aiGives.map(id => S.players[id]).filter(Boolean);
  const outP = pr.userGives.map(id => S.players[id]).filter(Boolean);
  if (inP.length === 0 || outP.length === 0) return "";
  const daysLeft = Math.max(0, pr.expiresDay - S.currentDay);
  // v36：提案卡直接攤開雙方球員的球探評估數據（重用交易畫面：自家真實值／對方交易球探評估值）
  if (!pr.scoutedCache) {
    const acc = effectiveScoutAccuracy(S.teams[S.userTeamId], (S.teams[S.userTeamId].scouts || {}).trade);
    const vals = {};
    inP.forEach(p => {
      vals[p.id] = p.isPitcher
        ? { velocity: scoutedEstimate(p.velocity, acc), control: scoutedEstimate(p.control, acc) }
        : { contact: scoutedEstimate(p.contact, acc), power: scoutedEstimate(p.power, acc), eye: scoutedEstimate(p.eye, acc), speed: scoutedEstimate(p.speed, acc), fielding: scoutedEstimate(p.fielding, acc) };
    });
    pr.scoutedCache = { acc, vals }; // 一次算好、存在提案上，避免每次重繪跳動
  }
  const abilLine = (p, scouted) => {
    if (scouted) {
      const sc = (pr.scoutedCache.vals || {})[p.id] || {};
      return p.isPitcher ? `球速${velocityKmh(sc.velocity)}km/h・控球${sc.control}` : `接觸${sc.contact}・長打${sc.power}・選球${sc.eye}・速度${sc.speed}・守備${sc.fielding}%`;
    }
    return p.isPitcher ? `球速${velocityKmh(p.velocity)}km/h・控球${p.control}・體力${p.stamina}` : `接觸${p.contact}・長打${p.power}・選球${p.eye}・速度${p.speed}・守備${p.fielding}%`;
  };
  const posOf = p => p.isPitcher ? p.role : p.positions.map(x => POS_LABEL[x.pos]).join("/");
  const inVal = inP.reduce((s, p) => s + tradeValue(p), 0);
  const outVal = outP.reduce((s, p) => s + tradeValue(p), 0);
  return `<div class="card kpicard">
    <div class="eyebrow">${icon('phone')} ${ai.name}${ps ? `（${ps.name}）` : ""}主動提案 <span class="afftag ${af.cls}">${af.text}</span></div>
    <div class="divlabel">對方送出（${ai.name}・交易球探評估值，有效準確度 ${pr.scoutedCache.acc}）</div>
    <table class="stattable">
      <thead><tr><th>姓名</th><th>類型</th><th>守位</th><th>評估能力</th></tr></thead>
      <tbody>${inP.map(p => `<tr><td>${p.name}（${p.age}歲）</td><td>${p.isPitcher ? "投手" : "野手"}</td><td>${posOf(p)}</td><td>${abilLine(p, true)}</td></tr>`).join("")}</tbody>
    </table>
    <div class="divlabel">你送出（自家球員・真實能力值）</div>
    <table class="stattable">
      <thead><tr><th>姓名</th><th>類型</th><th>守位</th><th>能力</th></tr></thead>
      <tbody>${outP.map(p => `<tr><td>${p.name}（${p.age}歲）</td><td>${p.isPitcher ? "投手" : "野手"}</td><td>${posOf(p)}</td><td>${abilLine(p, false)}</td></tr>`).join("")}</tbody>
    </table>
    <div class="scoreboard">
      <div class="sb-row small"><div class="sb-label">對方送出總值</div><div class="sb-value small">${inVal.toFixed(1)}</div></div>
      <div class="sb-row small"><div class="sb-label">你送出總值</div><div class="sb-value small">${outVal.toFixed(1)}</div></div>
    </div>
    ${foldNote(`<p class="draftnote muted">對方球員為交易球探評估值（準確度越高落差越小）；自家球員為真實值。好感度越高，AI開價越接近公平甚至讓利（人情型加倍）。婉拒不扣好感。剩 ${daysLeft} 天回覆，逾期自動失效。</p>`)}
    <div class="btnrow">
      <button id="btn-aiprop-accept" class="btn-primary">接受交易</button>
      <button id="btn-aiprop-decline" class="btn-secondary">婉拒</button>
    </div>
  </div>`;
}

/* ---------- v32：KPI季中檢視抉擇卡 ---------- */
function renderKpiMidReviewCard() {
  const mr = S.seasonKPI && S.seasonKPI.year === S.seasonYear && S.seasonKPI.midReview;
  if (!mr || mr.decided) return "";
  return `<div class="card issuecard">
    <div class="eyebrow">${icon('museum')} 高層季中召見：進度嚴重落後</div>
    <p class="sub dark">原目標「<b>${mr.origLabel}</b>」達成希望渺茫。高層給你兩條路：</p>
    <p class="sub dark">① <b>接受降標</b>：目標改為「${mr.easier.label}」——達成的信任獎勵減半，且本季所有信任加分打75折（高層會記住你退縮過）。<br>② <b>硬拚原目標</b>：目標不變，另附「止血考核」——接下來15戰至少8勝（達成信任+3、未達成不扣，但高層臉色會很難看）。</p>
    <div class="btnrow">
      <button id="btn-kpi-reduce" class="btn-secondary">接受降標</button>
      <button id="btn-kpi-fight" class="btn-primary">硬拚原目標</button>
    </div>
  </div>`;
}

function renderGameOver() {
  const c = S.gmCareer || { seasons: [], championships: 0, trust: 0, stints: [] };
  // v28：生涯戰績跨球團累計（已封存的stints + 當前段seasons）
  const allSeasons = (typeof careerAllSeasons === "function") ? careerAllSeasons() : (c.seasons || []);
  const totalW = allSeasons.reduce((s, x) => s + x.wins, 0);
  const totalL = allSeasons.reduce((s, x) => s + x.losses, 0);
  const playoffTimes = allSeasons.filter(x => x.madePlayoffs).length;
  const years = allSeasons.length;
  const team = S.teams[S.userTeamId];
  const rep = (typeof careerReputation === "function") ? careerReputation() : 50;
  // 產生（或沿用）聘僱邀約
  if (!S.jobOffers && typeof generateJobOffers === "function") generateJobOffers();
  const offers = S.jobOffers || [];
  const repLabel = rep >= 70 ? "業界名帥" : (rep >= 55 ? "受敬重的資深GM" : (rep >= 40 ? "評價中庸" : "亟需證明自己"));
  app.innerHTML = `
    <div class="wrap">
      <div class="hero gameoverhero">
        <div class="eyebrow">GAME OVER</div>
        <h1>你被解職了</h1>
        <p class="sub">高層對球隊的表現徹底失去耐心。${GAME_EPOCH_YEAR + (c.firedYear || S.seasonYear)}年冬天，${c.teamName || (team ? team.name : "球團")}召開記者會，宣布與GM ${S.gmName} 分道揚鑣。</p>
      </div>
      <div class="card">
        <div class="eyebrow">${icon('scroll')} GM生涯總結（跨球團累計）</div>
        <div class="scoreboard">
          <div class="sb-row small"><div class="sb-label">執掌年數</div><div class="sb-value small">${years} 年</div></div>
          <div class="sb-row small"><div class="sb-label">生涯戰績</div><div class="sb-value small">${totalW} 勝 ${totalL} 敗（${pct(totalW, totalL)}）</div></div>
          <div class="sb-row small"><div class="sb-label">晉級季後賽</div><div class="sb-value small">${playoffTimes} 次</div></div>
          <div class="sb-row small"><div class="sb-label">總冠軍</div><div class="sb-value small">${c.championships} 座</div></div>
          <div class="sb-row small"><div class="sb-label">業界聲望</div><div class="sb-value small">${rep} / 100（${repLabel}）</div></div>
        </div>
        ${(c.stints && c.stints.length > 0) ? `<p class="draftnote muted">執教履歷：${c.stints.map(s => `${s.teamName}（第${s.startYear}~${s.endYear}年，${s.wins}-${s.losses}${s.championships ? `・${s.championships}冠` : ""}）`).join("；")}${c.teamName ? `；${c.teamName}（本段）` : ""}</p>` : ""}
        ${c.seasons.length > 0 ? `<table class="stattable"><thead><tr><th>年度</th><th>戰績</th><th>考核</th><th>信任</th></tr></thead><tbody>
          ${c.seasons.map(sx => `<tr><td>第${sx.year}年</td><td>${sx.wins}-${sx.losses}${sx.champion ? " "+icon('trophy')+"" : (sx.madePlayoffs ? " "+icon('ticket')+"" : "")}</td><td>${(sx.results || []).map(r => r.achieved ? ""+icon('check')+"" : ""+icon('cross')+"").join("")}</td><td>${sx.trustAfter}</td></tr>`).join("")}
        </tbody></table>` : ""}
      </div>
      ${(c.rehires || 0) >= 1 ? `
      <div class="card issuecard">
        <div class="eyebrow">${icon('door')} 業界的大門已經關上</div>
        <p class="sub dark">你已經用過一次東山再起的機會，這一次沒有球團願意再賭。你的GM生涯正式劃下句點——但這段旅程的每一勝，都會留在紀錄裡。</p>
      </div>` : (offers.length > 0 ? `
      <div class="card">
        <div class="eyebrow">${icon('mail-in')} 東山再起：其他球團的聘僱邀約（生涯僅此一次）</div>
        <p class="sub dark">你的業界聲望為你帶來了 ${offers.length} 份邀約。接受任一份即可接手該球團現有陣容，生涯戰績持續累積。<b>注意：東山再起僅有一次機會，若再度遭解職即為永久出局。</b></p>
        ${offers.map(o => { const mm = (typeof MANDATE_META !== "undefined" && MANDATE_META[o.mandate]) || null; return `<div class="joboffer">
          <div class="joboffer-info"><b>${o.teamName}</b>${mm ? ` <span class="personatag" title="${mm.desc}">${mm.name}</span>` : ""}<span class="joboffer-sub">起始信任度 ${o.startTrust}／聯盟戰力第 ${o.strengthRank} 弱${mm ? `／${mm.short}` : ""}</span></div>
          <button class="btn-secondary offer-btn" data-tid="${o.teamId}">接受</button>
        </div>`; }).join("")}
      </div>` : `<p class="sub dark">這一次，沒有任何球團向你伸出橄欖枝。</p>`)}
      ${((c.rehires || 0) < 1 && (c.sabbaticals || 0) < 1) ? `
      <div class="card">
        <div class="eyebrow">${icon('tea')} 或者……沉潛一年？</div>
        <p class="sub dark">拒絕${offers.length > 0 ? "所有邀約" : "急著回鍋"}，離開鎂光燈充電一年。聯盟照常運轉；歸來時業界聲望+5、邀約重抽且可及的球隊範圍更廣。（生涯限用一次）</p>
        <div class="btnrow"><button id="btn-sabbatical" class="btn-outline">沉潛一年</button></div>
      </div>` : ""}
      <p class="sub dark">每一次失敗，都是下一段傳奇的序章。</p>
      <div class="btnrow"><button id="btn-gameover-restart" class="btn-outline">結束遊戲（開新存檔）</button></div>
    </div>`;
  const btn = document.getElementById("btn-gameover-restart");
  if (btn) btn.onclick = () => resetGame();
  const sbtn = document.getElementById("btn-sabbatical");
  if (sbtn) sbtn.onclick = () => { UI.flash = null; runSabbaticalYear(); };
  app.querySelectorAll(".offer-btn").forEach(b => {
    b.onclick = () => takeJobOffer(b.dataset.tid);
  });
}

/* ---------- v28 代理人事務所總覽畫面 ---------- */
function renderAgency() {
  ensureAgency();
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  // 本季已情蒐的球員
  const scoutedIds = Object.keys(S.agency.scouted).filter(id => S.agency.scouted[id] && S.agency.scouted[id].year === S.seasonYear);
  const scoutedPlayers = scoutedIds.map(id => S.players[id] || (S.freeAgents || {})[id] || (S.internationalFreeAgents || {})[id]).filter(Boolean);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>${icon('scout')} 代理人事務所</h1></div>
      ${foldNote(`<p class="sub dark">這裡管理你與各類型經紀人的人脈。談約成功會加深交情、談崩則生嫌隙；交情好的經紀人，未來談約門檻更低、更好談成。談判桌上可花錢委託情蒐，一次看穿對方的性格與期望底線。</p>`)}
      <div class="card">
        <div class="eyebrow">${icon('handshake')} GM人脈網（與各型經紀人的交情）</div>
        ${AGENT_KEYS.map(k => {
          const a = AGENT_TYPES[k];
          const rel = agentRel(k);
          const relL = agentRelLabel(rel);
          const perks = agentRelPerks(k);
          const perkText = rel > 0 ? `門檻-${Math.round((1 - perks.reqMult) * 100)}%、機率×${perks.slopeMult.toFixed(2)}` : (rel < 0 ? `門檻+${Math.round((perks.reqMult - 1) * 100)}%、機率×${perks.slopeMult.toFixed(2)}` : "無加成");
          const canWine = (typeof canWineAgent === "function") && canWineAgent(k);
          const winedThisYear = S.agency.wined && S.agency.wined[k] === S.seasonYear;
          return `<div class="agencyrel-row">
            <div class="agencyrel-name">${a.name} <span class="afftag ${relL.cls}">${relL.text}（${rel > 0 ? "+" : ""}${rel}）</span></div>
            <div class="agencyrel-perk">${perkText}</div>
            <button class="btn-outline wine-btn" data-type="${k}" ${canWine ? "" : "disabled"}>${winedThisYear ? "本年已應酬" : `應酬（${formatMoney(agentWineCost(k))}）`}</button>
          </div>`;
        }).join("")}
        <p class="draftnote muted">v33應酬：休賽季可對每類型經紀人請客一次（成功70%好感+1、大失敗10%好感-1）。交情練到「交好(≥4)」會透露旗下客戶動向、「莫逆之交(滿級10)」則會引薦好手給你獨家談。</p>
      </div>
      ${renderAgencyPerkCards()}
      <div class="card">
        <div class="eyebrow">${icon('clipboard')} 本季已情蒐（${scoutedPlayers.length}）</div>
        ${scoutedPlayers.length > 0 ? scoutedPlayers.map(p => {
          ensureAgent(p);
          const a = AGENT_TYPES[p.agent.type];
          return `<p class="sub dark">${p.name}｜經紀人 ${p.agent.name}（${a.name}）｜期望 ${p.negoDesired ? formatMoney(p.negoDesired.salary) + "／" + p.negoDesired.years + "年" : "談判時揭露"}</p>`;
        }).join("") : `<p class="sub dark muted">本季尚未委託任何情蒐。在談判畫面點「委託情蒐」即可打聽對方經紀人的底細。</p>`}
      </div>
      <div class="btnrow"><button id="btn-agency-back" class="btn-outline">返回</button></div>
    </div>`;
  document.getElementById("btn-agency-back").onclick = () => { const back = UI.agencyReturn || "dashboard"; UI.agencyReturn = null; UI.screen = back; render(); };
  app.querySelectorAll(".wine-btn").forEach(b => {
    b.onclick = () => wineAndDineAgent(b.dataset.type);
  });
}


/* ====================================================================
   v43 —— 05-ui-dashboard 附加區塊 ——
   郵件中樞面板／傷兵遞補提案卡／掛牌 AI 報價卡／完整資料 AI 提案卡（重繪）／綁定。
   全部附加；整合以最小編輯掛入 dashTodoPanel 與 wireV42Cards。
   ==================================================================== */

/* ---------- v43 郵件中樞面板（主控台新增「✉️ 郵件」分頁） ----------
   收攏教練事件、掛牌報價、傷兵遞補、系統通知。點一封信可展開內文與「前往處理」。 */
function v43UnreadMailCount() {
  try { ensureV43State(); return (S.v43.mail || []).filter(m => m.unread).length; } catch (_) { return 0; }
}
function v43MailCategoryLabel(cat) {
  return { coach: "教練團", trade: "交易市場", injury: "醫療室", system: "聯盟公告" }[cat] || "訊息";
}
function dashMailPanel() {
  try {
    ensureV43State();
    const mail = S.v43.mail || [];
    if (mail.length === 0) {
      return `<div class="card"><div class="eyebrow">${icon('mail')} 郵件中樞</div>
        ${typeof v59VisualScene === "function" ? v59VisualScene("mailroom_v58", "郵件中樞場景", "MAILROOM VISUAL", "郵件中樞", "完整郵件內容、未讀狀態與既有處理按鈕保留在下方。", "v59-mail-scene") : ""}
        <p class="v59-compact-line">目前沒有郵件</p>
        ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<p class="sub dark" style="margin:0;">教練提案、掛牌報價、傷兵遞補與聯盟通知都會集中寄到這裡。</p>`, "郵件來源") : ""}</div>`;
    }
    const open = UI.v43MailOpen || null;
    return `<div class="card">
      <div class="eyebrow">${icon('mail')} 郵件中樞（${mail.filter(m => m.unread).length} 封未讀 / 共 ${mail.length} 封）</div>
      ${typeof v59VisualScene === "function" ? v59VisualScene("mailroom_v58", "郵件中樞場景", "MAILROOM VISUAL", "郵件中樞", "完整郵件內容、未讀狀態與既有處理按鈕保留在下方。", "v59-mail-scene") : ""}
      <div class="v43maillist">
        ${mail.map(m => {
          const isOpen = open === m.id;
          const metaBtn = v43MailActionButton(m);
          return `<div class="v43mailitem ${m.unread ? "unread" : ""} ${isOpen ? "open" : ""}">
            <button type="button" class="v43mail-head v43mail-toggle" data-mailid="${m.id}">
              <span class="v43mail-cat">${v43MailCategoryLabel(m.category)}</span>
              <span class="v43mail-title">${m.unread ? ""+icon('dot-unread')+" " : ""}${m.title}</span>
              <span class="v43mail-day muted">第${m.year}年・第${m.day}天</span>
            </button>
            ${isOpen ? `<div class="v43mail-body"><p class="sub dark">${m.body}</p>${metaBtn}</div>` : ""}
          </div>`;
        }).join("")}
      </div>
      ${mail.some(m => m.unread) ? `<div class="btnrow"><button id="v43-mail-readall" class="btn-outline">全部標為已讀</button></div>` : ""}
    </div>`;
  } catch (_) { return ""; }
}
// 依郵件 meta 給「前往處理」按鈕（跳到對應待辦卡）
function v43MailActionButton(m) {
  try {
    if (!m.meta) return "";
    if (m.meta.kind === "listingOffer") {
      const o = (S.v43.offers || []).find(x => x.id === m.meta.refId);
      if (!o || o.status !== "open") return `<p class="draftnote muted">（此報價已處理或失效）</p>`;
      return v43OfferCardHtml(o);
    }
    if (m.meta.kind === "injuryProposal") {
      const pr = (S.v43.injuryProposals || []).find(x => x.id === m.meta.refId);
      if (!pr || pr.status !== "open") return `<p class="draftnote muted">（此提案已處理）</p>`;
      return v43InjuryProposalCardHtml(pr);
    }
    return "";
  } catch (_) { return ""; }
}

/* ---------- v43 掛牌 AI 報價卡（含雙方完整球員資料） ---------- */
function v43OfferCardHtml(offer) {
  try {
    const buyer = S.teams[offer.buyerId];
    const target = S.players[offer.targetId];
    if (!buyer || !target) return "";
    const daysLeft = Math.max(0, offer.expiresDay - (S.currentDay || 0));
    // 對方送來的球員→交易球探評估值；你送出的（掛牌目標）→真實值
    const scoutCache = (typeof v43BuildScoutCache === "function") ? v43BuildScoutCache(offer.playerIds || []) : {};
    const inCards = (offer.playerIds || []).map(id => {
      const p = S.players[id];
      return p ? v43PlayerFullCardHtml(p, { scoutView: scoutCache[id] || {} }) : "";
    }).join("");
    return `<div class="card issuecard v43offercard">
      <div class="eyebrow">${icon('exchange')} ${buyer.name} 對 ${target.name} 的交易條件</div>
      <div class="divlabel">你送出（掛牌球員・真實資料）</div>
      ${v43PlayerFullCardHtml(target, null)}
      <div class="divlabel">對方給你（${offer.playerIds && offer.playerIds.length ? "球員為交易球探評估值＋" : ""}${offer.cash > 0 ? "現金" : ""}）</div>
      ${inCards || ""}
      ${offer.cash > 0 ? `<div class="v43cashrow">${icon('money')} 現金 <b>${(typeof formatMoney === "function") ? formatMoney(offer.cash) : offer.cash}</b></div>` : ""}
      ${(!offer.playerIds || offer.playerIds.length === 0) && offer.cash > 0 ? `<p class="draftnote muted">這是一份純現金收購。</p>` : ""}
      <p class="draftnote muted">對方球員為交易球探評估值（準確度越高落差越小）。剩 ${daysLeft} 天回覆，逾期自動失效。你可以接受、婉拒，或什麼都不選（放著就好）。</p>
      <div class="btnrow">
        <button class="btn-primary v43-offer-accept" data-offerid="${offer.id}">接受這筆</button>
        <button class="btn-secondary v43-offer-decline" data-offerid="${offer.id}">婉拒</button>
      </div>
    </div>`;
  } catch (_) { return ""; }
}
// 待辦頁彙整：所有 open 的掛牌報價卡
function renderListingOfferCards() {
  try {
    ensureV43State();
    const open = (S.v43.offers || []).filter(o => o.status === "open");
    if (open.length === 0) return "";
    return open.map(o => v43OfferCardHtml(o)).join("");
  } catch (_) { return ""; }
}

/* ---------- v43 傷兵遞補提案卡（自由度：批准／換人／擱置，可自由回應） ---------- */
function v43InjuryProposalCardHtml(pr) {
  try {
    const injured = S.players[pr.injuredId];
    const pick = S.players[pr.candidateIds[pr.pickIndex]];
    if (!pick) return "";
    return `<div class="card issuecard v43injprop">
      <div class="eyebrow">${icon('bandage')} 教練遞補提案</div>
      <p class="sub dark">${pr.title}</p>
      <p class="sub dark">${pr.reason}</p>
      <div class="divlabel">教練建議人選</div>
      ${v43PlayerFullCardHtml(pick, null)}
      <p class="draftnote muted">批准＝把他升上一軍頂替傷缺；要教練換人＝聽下一個口袋人選；擱置＝先不處理（教練信任會小扣，之後可能再提）。這個洞不一定要補同守位，教練會依陣容彈性提人。</p>
      <div class="btnrow">
        <button class="btn-primary v43-injprop-approve" data-ipid="${pr.id}">批准（升 ${pick.name} 上一軍）</button>
        <button class="btn-secondary v43-injprop-next" data-ipid="${pr.id}">要教練換人選</button>
        <button class="btn-outline v43-injprop-dismiss" data-ipid="${pr.id}">先擱置</button>
      </div>
    </div>`;
  } catch (_) { return ""; }
}
function renderInjuryProposalCards() {
  try {
    ensureV43State();
    const open = (S.v43.injuryProposals || []).filter(p => p.status === "open");
    if (open.length === 0) return "";
    return open.map(p => v43InjuryProposalCardHtml(p)).join("");
  } catch (_) { return ""; }
}

/* ---------- v43 重繪 AI 主動提案卡（改用完整資料元件；覆蓋 v36 版顯示） ----------
   函式改名 renderAiProposalCardV43；整合點把 dashTodoPanel 的 renderAiProposalCard() 換成它。 */
function renderAiProposalCardV43() {
  try {
    const pr = S.aiTrade && S.aiTrade.proposal;
    if (!pr) return "";
    const ai = S.teams[pr.teamId];
    if (!ai) return "";
    const ps = (typeof personaOf === "function") ? personaOf(ai) : null;
    const af = (typeof affinityLabel === "function") ? affinityLabel(gmAffinity(ai)) : { cls: "", text: "" };
    const inP = pr.aiGives.map(id => S.players[id]).filter(Boolean);
    const outP = pr.userGives.map(id => S.players[id]).filter(Boolean);
    if (inP.length === 0 || outP.length === 0) return "";
    const daysLeft = Math.max(0, pr.expiresDay - S.currentDay);
    const scoutCache = (typeof v43BuildScoutCache === "function") ? v43BuildScoutCache(inP.map(p => p.id)) : {};
    const inVal = inP.reduce((s, p) => s + tradeValue(p), 0);
    const outVal = outP.reduce((s, p) => s + tradeValue(p), 0);
    return `<div class="card kpicard">
      <div class="eyebrow">${icon('phone')} ${ai.name}${ps ? `（${ps.name}）` : ""}主動提案 <span class="afftag ${af.cls}">${af.text}</span></div>
      <div class="divlabel">對方送出（交易球探評估值・完整資料）</div>
      ${inP.map(p => v43PlayerFullCardHtml(p, { scoutView: scoutCache[p.id] || {} })).join("")}
      <div class="divlabel">你送出（自家球員・真實資料）</div>
      ${outP.map(p => v43PlayerFullCardHtml(p, null)).join("")}
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">對方送出總值</div><div class="sb-value small">${inVal.toFixed(1)}</div></div>
        <div class="sb-row small"><div class="sb-label">你送出總值</div><div class="sb-value small">${outVal.toFixed(1)}</div></div>
      </div>
      ${foldNote(`<p class="draftnote muted">對方球員為交易球探評估值（準確度越高落差越小）；自家球員為真實值。婉拒不扣好感。剩 ${daysLeft} 天回覆，逾期自動失效。</p>`)}
      <div class="btnrow">
        <button id="btn-aiprop-accept" class="btn-primary">接受交易</button>
        <button id="btn-aiprop-decline" class="btn-secondary">婉拒</button>
      </div>
    </div>`;
  } catch (_) { return (typeof renderAiProposalCard === "function") ? renderAiProposalCard() : ""; }
}

/* ---------- v43 卡片綁定（併入 wireV42Cards 尾端呼叫） ---------- */
function wireV43Cards() {
  try {
    // 郵件展開/已讀
    app.querySelectorAll(".v43mail-toggle").forEach(b => {
      b.onclick = () => {
        const id = b.dataset.mailid;
        UI.v43MailOpen = (UI.v43MailOpen === id) ? null : id;
        try { const m = (S.v43.mail || []).find(x => x.id === id); if (m && m.unread) { m.unread = false; if (typeof persist === "function") persist(); } } catch (_) {}
        render();
      };
    });
    const readAll = document.getElementById("v43-mail-readall");
    if (readAll) readAll.onclick = () => { try { (S.v43.mail || []).forEach(m => m.unread = false); if (typeof persist === "function") persist(); } catch (_) {} render(); };
    // 掛牌報價
    app.querySelectorAll(".v43-offer-accept").forEach(b => { b.onclick = () => { const r = v43AcceptOffer(b.dataset.offerid); UI.flash = r.msg; render(); }; });
    app.querySelectorAll(".v43-offer-decline").forEach(b => { b.onclick = () => { const r = v43DeclineOffer(b.dataset.offerid); UI.flash = r.msg; render(); }; });
    // 傷兵遞補提案
    app.querySelectorAll(".v43-injprop-approve").forEach(b => { b.onclick = () => { const r = v43ResolveInjuryProposal(b.dataset.ipid, "approve"); UI.flash = r.msg; render(); }; });
    app.querySelectorAll(".v43-injprop-next").forEach(b => { b.onclick = () => { const r = v43ResolveInjuryProposal(b.dataset.ipid, "next"); UI.flash = r.msg; render(); }; });
    app.querySelectorAll(".v43-injprop-dismiss").forEach(b => { b.onclick = () => { const r = v43ResolveInjuryProposal(b.dataset.ipid, "dismiss"); UI.flash = r.msg; render(); }; });
  } catch (_) {}
}

/* ====================================================================
   ██ v48 里程碑事件卡 + 榮譽殿堂提名卡 ██
   ==================================================================== */

function renderV48MilestoneCard() {
  try {
    if (!S.v48 || !S.v48.activeMilestone) return "";
    const ms = S.v48.activeMilestone;
    const p = S.players[ms.playerId];
    const playerCard = p && typeof v46FullPlayerCard === "function" ? v46FullPlayerCard(p, null) : "";
    return `<div class="card v48milestone-card">
      <div class="eyebrow">${icon('milestone')} 里程碑達成！${ms.playerName}・${ms.label}</div>
      <p class="sub dark">${ms.playerName}累計${ms.stat === "H" ? "安打" : ms.stat === "HR" ? "全壘打" : ms.stat === "W" ? "勝投" : ms.stat === "SO" ? "三振" : ms.stat === "SV" ? "救援成功" : ms.stat === "HD" ? "中繼成功" : ms.stat === "SB" ? "盜壘成功" : ms.stat}達 <b>${ms.total}</b>，達成「${ms.label}」里程碑！全城為之沸騰，球迷期待球團的回應。</p>
      ${playerCard}
      <div class="btnrow" style="flex-wrap:wrap;gap:6px;margin-top:8px;">
        <button class="btn-primary v48ms-btn" data-opt="celebrate">${icon('party')} 盛大慶祝（-500萬・人氣+2・認同+3・票房+15%）</button>
        <button class="btn-secondary v48ms-btn" data-opt="simple">${icon('handshake')} 簡單致意（免費・人氣+1・認同+1）</button>
      </div>
    </div>`;
  } catch (_) { return ""; }
}

function renderV48HofCards() {
  try {
    if (!S.v48 || !S.v48.hofPending || !S.v48.hofPending.length) return "";
    return S.v48.hofPending.map(nom => {
      const cs = nom.careerStats || {};
      const ab = nom.abilities || {};
      const statLine = nom.isPitcher
        ? `${cs.W || 0}勝 ${cs.L || 0}敗・${cs.SV || 0}救援・${cs.HD || 0}中繼・${cs.SO || 0}K・ERA ${cs.IP > 0 ? (cs.ER / cs.IP * 9).toFixed(2) : "—"}`
        : `${cs.G || 0}場・${cs.H || 0}安・${cs.HR || 0}轟・${cs.RBI || 0}打點・${cs.SB || 0}盜・AVG ${cs.AB > 0 ? (cs.H / cs.AB).toFixed(3) : "—"}`;
      const metHtml = (nom.metCriteria || []).map(c => `<span class="v48hof-crit">${c.stat === "H" ? "安打" : c.stat === "HR" ? "全壘打" : c.stat === "W" ? "勝投" : c.stat === "SO" ? "三振" : c.stat === "SV" ? "救援" : c.stat === "HD" ? "中繼" : c.stat === "SB" ? "盜壘" : c.stat} ${c.val}（門檻${c.req}）${icon('check')}</span>`).join(" ");
      const byService = nom.byService ? `<span class="v48hof-crit">效力${nom.yearsOnTeam}年（長期貢獻）${icon('check')}</span>` : "";
      // 能力快照（私密資料）
      let abilHtml = "";
      if (nom.isPitcher) {
        abilHtml = `<div class="v46sect">退休時能力（私密）</div><div class="v46grid">
          ${v46Cell("球速", ab.velocity && typeof velocityKmh === "function" ? velocityKmh(ab.velocity) + "km/h" : ab.velocity)}${v46Cell("控球", ab.control)}${v46Cell("體力", ab.stamina)}
          ${v46Cell("耐久", ab.durability)}${v46Cell("潛力", ab.potential)}
        </div>${(ab.pitches || []).length ? `<div class="v46sect">變化球</div>${ab.pitches.map(pt => `<div class="v46pitch">${pt.type}　球威 <b>${pt.stuff}</b>／控球 <b>${pt.control}</b></div>`).join("")}` : ""}`;
      } else {
        abilHtml = `<div class="v46sect">退休時能力（私密）</div><div class="v46grid">
          ${v46Cell("接觸", ab.contact)}${v46Cell("長打", ab.power)}${v46Cell("選球", ab.eye)}
          ${v46Cell("速度", ab.speed)}${v46Cell("守備", ab.fielding)}${v46Cell("臂力", ab.arm)}
          ${v46Cell("耐久", ab.durability)}${v46Cell("潛力", ab.potential)}
        </div>`;
      }
      const traitHtml = (nom.traits || []).map(t => { try { const TRAIT = typeof TRAITS === "object" ? TRAITS : {}; const tr = TRAIT[t]; return tr ? `<span class="traittag">${tr.name}</span>` : ""; } catch (_) { return ""; } }).join("");
      // 雷達圖（用退休時能力建構假 player 物件）
      let radarHtml = "";
      try {
        const fakeP = { isPitcher: nom.isPitcher, ...ab, pitches: ab.pitches || [] };
        radarHtml = typeof v48RadarSVG === "function" ? v48RadarSVG(fakeP, {}) : "";
      } catch (_) {}
      return `<div class="card v48hof-card">
        <div class="eyebrow">${icon('hof')} 榮譽殿堂提名：${nom.name}</div>
        <div class="v48hof-head">${nom.name} <span class="muted">${nom.isPitcher ? "投手" : "野手"}・${nom.role}・${nom.nationality || ""}</span></div>
        <div class="v48hof-meta">${nom.age}歲退休・效力本隊 ${nom.yearsOnTeam} 年・第${nom.retiredYear}年退休</div>
        <div class="v48hof-stat"><b>生涯累計：</b>${statLine}</div>
        <div class="v48hof-criteria"><b>入選依據：</b>${metHtml}${byService}</div>
        ${radarHtml ? `<div style="display:flex;justify-content:center;margin:6px 0;">${radarHtml}</div>` : ""}
        ${abilHtml}
        ${traitHtml ? `<div style="margin-top:4px;">${traitHtml}</div>` : ""}
        <div class="btnrow" style="flex-wrap:wrap;gap:6px;margin-top:8px;">
          <button class="btn-primary v48hof-btn" data-action="induct" data-id="${nom.id}">${icon('crown')} 核准入選殿堂</button>
          <button class="btn-outline v48hof-btn" data-action="dismiss" data-id="${nom.id}">${icon('cross')} 不予入選</button>
        </div>
      </div>`;
    }).join("");
  } catch (_) { return ""; }
}

/* v54 A2：育成合約里程碑事件卡（主控台）——r008 加互動按鈕 */
function renderV54DevMilestoneCards() {
  try {
    if (!S.v54DevMilestones || S.v54DevMilestones.length === 0) return "";
    return S.v54DevMilestones.map(function(evt, idx) {
      var iconStr = evt.type === "graduation" ? "🎓" : (evt.type === "released" ? "👋" : "📋");
      var p = evt.playerId ? S.players[evt.playerId] : null;
      var actionBtns = "";
      if (p && !p.retired && p.level === "育成" && (evt.type === "milestone3" || evt.type === "milestone5" || evt.type === "milestone7")) {
        actionBtns = '<div class="btnrow">' +
          '<button class="btn-primary v54-ms-promote2" data-idx="' + idx + '" data-pid="' + evt.playerId + '">升上二軍</button>' +
          '<button class="btn-secondary v54-ms-promote1" data-idx="' + idx + '" data-pid="' + evt.playerId + '">直升一軍</button>' +
          '<button class="btn-outline v54-dismiss-milestone" data-idx="' + idx + '">繼續留在育成</button>' +
          '</div>';
      } else {
        actionBtns = '<div class="btnrow"><button class="btn-secondary v54-dismiss-milestone" data-idx="' + idx + '">知道了</button></div>';
      }
      return '<div class="card">' +
        '<div class="eyebrow">' + iconStr + ' 育成動態：' + (evt.name || "球員") + '</div>' +
        '<p class="sub dark">' + evt.msg + '</p>' +
        actionBtns + '</div>';
    }).join("");
  } catch (_) { return ""; }
}
function wireV54DevMilestoneCards() {
  document.querySelectorAll(".v54-dismiss-milestone").forEach(function(btn) {
    btn.onclick = function() {
      var idx = Number(btn.dataset.idx);
      if (S.v54DevMilestones && idx >= 0) { S.v54DevMilestones.splice(idx, 1); persist(); render(); }
    };
  });
  /* r008：里程碑升上二軍按鈕 */
  document.querySelectorAll(".v54-ms-promote2").forEach(function(btn) {
    btn.onclick = function() {
      var idx = Number(btn.dataset.idx);
      var pid = btn.dataset.pid;
      if (typeof v54PromoteDevToMinor === "function") v54PromoteDevToMinor(pid);
      if (S.v54DevMilestones && idx >= 0) S.v54DevMilestones.splice(idx, 1);
      persist(); render();
    };
  });
  /* r008：里程碑直升一軍按鈕 */
  document.querySelectorAll(".v54-ms-promote1").forEach(function(btn) {
    btn.onclick = function() {
      var idx = Number(btn.dataset.idx);
      var pid = btn.dataset.pid;
      if (typeof v54PromoteDevToMajor === "function") v54PromoteDevToMajor(pid);
      if (S.v54DevMilestones && idx >= 0) S.v54DevMilestones.splice(idx, 1);
      persist(); render();
    };
  });
}

/* 事件接線（在 wireDashboard 呼叫） */
function wireV48Dashboard() {
  try {
    // 里程碑事件卡按鈕
    document.querySelectorAll(".v48ms-btn").forEach(b => {
      b.onclick = () => { if (typeof v48ResolveMilestone === "function") v48ResolveMilestone(b.dataset.opt); render(); };
    });
    // 殿堂提名按鈕
    document.querySelectorAll(".v48hof-btn").forEach(b => {
      b.onclick = () => {
        const action = b.dataset.action, id = b.dataset.id;
        if (action === "induct" && typeof v48InductHof === "function") {
          v48InductHof(id);
          UI.flash = "已核准入選榮譽殿堂！";
        } else if (action === "dismiss" && typeof v48DismissHof === "function") {
          v48DismissHof(id);
          UI.flash = "已拒絕本次提名。";
        }
        render();
      };
    });
  } catch (_) {}
}

/* ====================================================================
   ██ v49 主題設定畫面 ██
   提供主題包 JSON 匯入/匯出/重設功能。跨存檔共用（localStorage），不影響遊戲數值。
   ==================================================================== */
function renderThemeSettings() {
  try {
    var hasPack = !!(THEME && THEME.pack);
    var packInfo = "";
    if (hasPack) {
      var ver = (THEME.pack && THEME.pack.version) || "未標示";
      packInfo = `<div class="card" style="border-left:4px solid var(--pack-brand-positive, #59C78B);">
        <div class="eyebrow">${icon('check')} 目前主題包</div>
        <p class="sub">版本：${ver}・圖示 ${THEME.pack && THEME.pack.icons ? Object.keys(THEME.pack.icons).length : 0} 個・槽位 ${THEME.pack && THEME.pack.slots ? Object.keys(THEME.pack.slots).length : 0} 個</p>
      </div>`;
    } else {
      packInfo = `<div class="card"><p class="sub muted">${icon('palette')} 尚未載入主題包。目前使用預設 emoji 圖示與內建配色。</p></div>`;
    }
    app.innerHTML = `<div class="wrap">
      <div class="topbar">
        <div>
          <div class="eyebrow">${icon('settings')} 系統</div>
          <h1>${icon('palette')} 主題設定</h1>
        </div>
        <button class="btn-outline" id="v49theme-back">${icon('door')} 返回主控台</button>
      </div>
      ${packInfo}
      <div class="card">
        <div class="eyebrow">匯入主題包</div>
        <p class="sub" style="margin-bottom:8px;">選擇 Codex 產出的 JSON 主題包檔案。載入後所有畫面立即生效，並自動記住（下次開啟遊戲自動套用）。</p>
        <input type="file" id="v49theme-file" accept=".json" style="margin-bottom:8px;">
        <div id="v49theme-msg" class="sub muted"></div>
      </div>
      <div class="btnrow">
        ${hasPack ? `<button class="btn-outline" id="v49theme-export">${icon('export')} 匯出目前主題包</button>` : ""}
        ${hasPack ? `<button class="btn-danger" id="v49theme-reset">${icon('cross')} 重設為預設</button>` : ""}
      </div>
      <div class="card" style="margin-top:12px;">
        <div class="eyebrow">目前美術系統資訊</div>
        <p class="sub" style="margin:0;">語意圖示 ${Object.keys(THEME_ICONS).length} 個・CSS 美術槽位 ${Object.keys(THEME_SLOTS).length} 個・品牌：${typeof BRAND !== "undefined" ? BRAND.gameName : "決勝GM"}</p>
      </div>
    </div>`;
    wireThemeSettings();
  } catch (e) {
    app.innerHTML = `<div class="wrap"><div class="card"><p>載入主題設定時發生錯誤。</p><button class="btn-outline" onclick="UI.screen='dashboard';render();">返回</button></div></div>`;
  }
}
function wireThemeSettings() {
  try {
    var backBtn = document.getElementById("v49theme-back");
    if (backBtn) backBtn.onclick = function() { UI.screen = "dashboard"; render(); };
    var fileInput = document.getElementById("v49theme-file");
    if (fileInput) fileInput.onchange = function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(re) {
        var msgEl = document.getElementById("v49theme-msg");
        try {
          var res = loadThemePackFromJSON(re.target.result);
          if (res.ok) {
            if (msgEl) msgEl.textContent = "主題包載入成功！";
            setTimeout(function() { render(); }, 600);
          } else {
            if (msgEl) msgEl.textContent = "載入失敗：" + (res.error || "格式不符");
          }
        } catch (err) {
          if (msgEl) msgEl.textContent = "載入失敗：" + String(err);
        }
      };
      reader.readAsText(file);
    };
    var exportBtn = document.getElementById("v49theme-export");
    if (exportBtn) exportBtn.onclick = function() {
      try {
        var json = exportThemePack();
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "theme_pack_export.json"; a.click();
        URL.revokeObjectURL(url);
      } catch (err) { UI.flash = "匯出失敗：" + String(err); render(); }
    };
    var resetBtn = document.getElementById("v49theme-reset");
    if (resetBtn) resetBtn.onclick = function() {
      if (typeof resetThemePack === "function") resetThemePack();
      UI.flash = "主題已重設為預設。";
      render();
    };
  } catch (_) {}
}
