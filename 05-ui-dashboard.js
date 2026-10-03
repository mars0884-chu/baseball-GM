/* ---------- 畫面渲染 ---------- */
/* v39⑥：次要說明文字摺疊——把輔助說明收進「▸ 詳情」<details>，預設隱藏、點擊展開。
   只包「規則說明類」文字；狀態/結果/警告類訊息維持直接顯示。 */
function foldNote(html, label) {
  return `<details class="fold"><summary>${label || "詳情"}</summary>${html}</details>`;
}
function v60UpgradeComparison(rows) {
  return `<table class="stattable v60-upgrade-compare"><thead><tr><th>效果</th><th>目前</th><th>升級後</th></tr></thead><tbody>${rows.map(r => `<tr><th>${v60UiEscape(r[0])}</th><td>${v60UiEscape(r[1])}</td><td><b>${v60UiEscape(r[2])}</b></td></tr>`).join('')}</tbody></table>`;
}

/* v60-r011：跨模組 renderer 相容橋接。
   公開 Pages 版先查詢外部核准 PNG 路徑；離線單檔／模組包則回退到內嵌 JSON。
   兩條路徑共用同一組 key，確保 APP、球場、新聞與內容畫面不會退回純文字。 */
function v60CompatArtDataUrl(key) {
  try {
    const keyText = String(key || "");
    const publicMap = (typeof window !== "undefined" && window.__v60PublicArtPaths) || null;
    if (publicMap && publicMap[keyText]) return publicMap[keyText];
    const cache = window.__v60CompatArtCache || (window.__v60CompatArtCache = {});
    const status = window.__v60CompatArtStatus || (window.__v60CompatArtStatus = {});
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
function v60CompatArtFallbackUrl(key) {
  try {
    const fallbackMap = (typeof window !== "undefined" && window.__v60PublicArtFallbackPaths) || null;
    return fallbackMap && fallbackMap[String(key || "")] ? fallbackMap[String(key || "")] : "";
  } catch (_) { return ""; }
}
function v60CompatArtImageAttrs(key, loading, priority) {
  const fallback = v60CompatArtFallbackUrl(key);
  const safeLoading = loading === "eager" ? "eager" : "lazy";
  const priorityAttr = priority ? ` fetchpriority="high"` : "";
  const fallbackAttr = fallback ? ` onerror="this.onerror=null;this.src='${fallback}'"` : "";
  return `loading="${safeLoading}" decoding="async"${priorityAttr}${fallbackAttr}`;
}
function v60CompatAppIconDataUrl() {
  if (typeof window !== "undefined" && window.__v60PublicAppIconPath) return window.__v60PublicAppIconPath;
  return (typeof globalThis !== "undefined" && globalThis.v60AppIconDataUrl instanceof Function)
    ? globalThis.v60AppIconDataUrl()
    : "icon-512.png";
}
function v60CompatVisualScene(key, alt, kicker, title, detail, extraClass) {
  const src = v60CompatArtDataUrl(key);
  if (!src) return "";
  const cls = extraClass ? ` ${extraClass}` : "";
  return `<section class="v60-visual-scene${cls}" data-v60-art-key="${key}" data-v60-art-source="approved-scene-png" aria-label="${alt}">
    <div class="v60-visual-scene-art"><img src="${src}" alt="${alt}" ${v60CompatArtImageAttrs(key, "eager", false)}></div>
    <div class="v60-visual-scene-copy"><strong>${title}</strong></div>
  </section>`;
}
function v60KickRenderedSceneImages() {
  try {
    const kick = () => {
      const images = document.querySelectorAll("#app .v60-visual-scene img");
      images.forEach(img => {
        if (img.complete && img.naturalWidth > 0) return;
        // 等下一幀讓瀏覽器先登記動態 DOM，再觸發下載排程。
        img.loading = "lazy";
        img.loading = "eager";
      });
    };
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(kick);
    else setTimeout(kick, 0);
  } catch (e) {
    console.error("場景圖片載入觸發失敗：", e);
  }
}
/* v60-002：把可掃讀資訊改成圖像化指標，避免再用摺疊段落堆疊說明。
   只讀取既有資料，不新增 state、不改數值、不呼叫 RNG。 */
function v60UiEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}
function v60VisualMetricRail(items, ariaLabel) {
  const valid = (Array.isArray(items) ? items : []).filter(function (item) {
    return item && item.length >= 2 && item[0] != null && item[1] != null;
  });
  if (!valid.length) return "";
  return `<div class="v60-visual-metric-rail" aria-label="${v60UiEscape(ariaLabel || "關鍵資訊")}">${valid.map(function (item) {
    return `<span class="v60-visual-metric"><b>${v60UiEscape(item[0])}</b><strong>${v60UiEscape(item[1])}</strong></span>`;
  }).join("")}</div>`;
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
    milestones: '<svg viewBox="0 0 120 56" aria-hidden="true"><circle cx="34" cy="28" r="20" fill="none" stroke="#B7D3F5" stroke-width="7"/><path d="M34 8a20 20 0 0 1 18 28" fill="none" stroke="#26D9E8" stroke-width="7" stroke-linecap="round"/><path d="m34 16 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z" fill="#FFE552" stroke="#143CFF" stroke-width="2"/><path d="M70 19h37M70 29h25M70 39h31" stroke="#143CFF" stroke-width="4" stroke-linecap="round"/></svg>',
    awards: '<svg viewBox="0 0 120 56" aria-hidden="true"><path d="M12 49h96M25 49V34h20v15M50 49V20h20v29M75 49V29h20v20" fill="#EAF5FF" stroke="#143CFF" stroke-width="4"/><circle cx="60" cy="10" r="8" fill="#FFE552" stroke="#FF3D4F" stroke-width="3"/></svg>',
    championship: '<svg viewBox="0 0 120 56" aria-hidden="true"><path d="M37 11h46v15a23 23 0 0 1-46 0V11Z" fill="#FFE552" stroke="#143CFF" stroke-width="4"/><path d="M37 17H21a16 16 0 0 0 16 17M83 17h16a16 16 0 0 1-16 17M60 42v9M43 53h34" fill="none" stroke="#FF3D4F" stroke-width="4" stroke-linecap="round"/></svg>',
    'hall-of-fame': '<svg viewBox="0 0 120 56" aria-hidden="true"><rect x="18" y="6" width="48" height="44" rx="5" fill="#fff" stroke="#143CFF" stroke-width="4"/><circle cx="42" cy="22" r="9" fill="#26D9E8"/><path d="M28 44a14 14 0 0 1 28 0" fill="#EAF5FF" stroke="#143CFF" stroke-width="3"/><path d="m91 8 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z" fill="#FFE552" stroke="#FF3D4F" stroke-width="2"/></svg>',
    chains: '<svg viewBox="0 0 120 56" aria-hidden="true"><path d="M16 28h88" stroke="#B7D3F5" stroke-width="5" stroke-linecap="round"/><circle cx="18" cy="28" r="10" fill="#26D9E8" stroke="#143CFF" stroke-width="3"/><circle cx="60" cy="28" r="10" fill="#FFE552" stroke="#143CFF" stroke-width="3"/><circle cx="102" cy="28" r="10" fill="#FF3D4F" stroke="#143CFF" stroke-width="3"/><path d="m40 22 8 6-8 6M82 22l8 6-8 6" fill="none" stroke="#143CFF" stroke-width="3"/></svg>'
  };
  return svg[domain] || svg.events;
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
  const facility = typeof facilityInfo === "function" ? facilityInfo(team) : null;
  const slots = typeof stadiumSlotCount === "function" ? stadiumSlotCount(team) : null;
  const built = team.facility && Array.isArray(team.facility.stadiumSlots) ? team.facility.stadiumSlots.length : null;
  const anchors = [1, 3, 5, 7];
  const stageRail = anchors.map(function (level) {
    const reached = currentLevel >= level;
    return `<span class="v60-stadium-stage ${reached ? "reached" : "locked"}"><b>Lv${level}</b>${labels[level]}</span>`;
  }).join("");
  return `<section class="v57-dashboard-hero" data-v57-dashboard-hero="true" aria-label="球場升級計畫">
    <div class="v57-dashboard-hero-heading"><span class="v57-facility-kicker">STADIUM VISUAL・DASHBOARD</span><h2>主場球場</h2><span>目前 Lv.${currentLevel}</span></div>
    <div class="v60-dashboard-featured">
    <div class="v60-dashboard-featured-art">${src ? `<img src="${src}" alt="Lv${currentLevel} ${labels[currentLevel] || "主場球場"}" data-v60-art-source="approved-stadium-png" ${v60CompatArtImageAttrs(profile.artKey, "eager", true)}>` : `<div class="v57-dashboard-art-missing">素材未載入</div>`}</div>
      <div class="v60-dashboard-featured-copy"><strong>${labels[currentLevel] || "主場球場"}</strong>${v60VisualMetricRail([
        ["容量", facility ? `${facility.capacity.toLocaleString()} 人` : "—"],
        ["格位", slots != null && built != null ? `${built}/${slots}` : "—"],
        ["預算", team.finance ? formatMoney(team.finance.budget) : "—"]
      ], "主場關鍵資訊")}<button id="btn-dashboard-facilities" class="btn-secondary" type="button">查看球場硬體建設</button></div>
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
/* v60-004：長頁主要操作列固定在可視區底部。
   只標記每個畫面最外層最後一個操作列；不改按鈕事件、不新增 state，
   讓「確認／繼續／返回」不必滑到數千像素後才找得到。 */
function v60MarkStickyScreenAction() {
  const appRoot = document.getElementById("app");
  if (!appRoot || !appRoot.querySelector) return;
  const wrap = appRoot.querySelector(".wrap");
  if (!wrap || !wrap.children) return;
  const rows = Array.from(wrap.children).filter(node => node.classList && node.classList.contains("btnrow") && node.querySelector("button"));
  const actionRow = rows[rows.length - 1];
  if (actionRow) actionRow.classList.add("v60-sticky-actions");
  const backButton = appRoot.querySelector("#btn-back");
  const backRow = backButton && backButton.closest(".btnrow");
  if (backRow) backRow.classList.add("v60-sticky-actions");
}
/* v60-010：開季準備導覽列。財務預估只讀 S；不得觸發 ensure、薪資補值或共享亂數。 */
function v60PreseasonFinanceForecast(team) {
  if (!team || !S || !S.teams) return null;
  const finance = team.finance || {};
  const seasonYear = Number.isFinite(S.seasonYear) ? S.seasonYear : 1;
  const ticketPrice = Number.isFinite(finance.ticketPrice) ? finance.ticketPrice : ({ low: 250, mid: 420, high: 620, premium: 880 }[finance.ticketTier] || 420);
  const ticketCap = Number.isFinite(finance.ticketPriceCap) ? finance.ticketPriceCap : TICKET_PRICE_CEIL_DEFAULT;
  const popularity = Number.isFinite(finance.popularity) ? finance.popularity : 50;
  const played = (team.wins || 0) + (team.losses || 0);
  const winPct = played > 0 ? (team.wins || 0) / played : 0.5;
  const facility = team.facility || {};
  const level = Number.isFinite(facility.level) ? facility.level : 1;
  const capacity = (FACILITY_LEVELS.find(f => f.level === level) || FACILITY_LEVELS[0]).capacity;
  let spendPct = 0, attendancePct = 0, maintenanceCost = 0;
  const slots = Array.isArray(facility.stadiumSlots) ? facility.stadiumSlots : [];
  const builtYears = Array.isArray(facility.slotBuilt) ? facility.slotBuilt : [];
  slots.forEach((key, i) => {
    const type = stadiumFacilityType(key);
    if (!type) return;
    const builtYear = Number.isFinite(builtYears[i]) ? builtYears[i] : seasonYear;
    const decay = seasonYear - builtYear >= STADIUM_LIFE ? STADIUM_DECAY_MULT : 1;
    spendPct += type.spendPct * decay;
    attendancePct += type.attPct * decay;
    maintenanceCost += Math.round(type.cost * type.maintPct);
  });
  const currentMarketing = finance.marketingYear === seasonYear;
  const city = S.cityState && S.cityState[team.id];
  const cityAttendance = city ? 0.85 + (city.population / 100) * 0.30 : 1;
  const baseAttendance = (0.32 + popularity / 100 * 0.38 + (winPct - 0.5) * 0.55
    + (currentMarketing ? finance.marketingAttPct || 0 : 0) + attendancePct) * cityAttendance;
  const attendanceRate = clamp(baseAttendance * ticketDemandRate(ticketPrice, ticketCap, popularity), 0.06, 0.98);
  const projectedAttendance = Math.round(capacity * attendanceRate);
  const totalGames = S.schedule ? S.schedule.length : 126;
  const homeGames = Math.round(totalGames / 2);
  const awayGames = totalGames - homeGames;
  const ticketRevenue = projectedAttendance * ticketPrice * homeGames;
  const currentBroadcastDeal = finance.dealsYear === seasonYear ? finance.broadcastDeal : null;
  const currentSponsorDeal = finance.dealsYear === seasonYear ? finance.sponsorDeal : null;
  const broadcastEstimate = dealSeasonRevenue(currentBroadcastDeal, winPct, false);
  const sponsorEstimate = dealSeasonRevenue(currentSponsorDeal, winPct, false);
  const broadcastRevenue = broadcastEstimate != null ? broadcastEstimate : Math.round((3000 + popularity * 42) * 10000);
  const sponsorRevenue = Math.max(0, sponsorEstimate != null ? sponsorEstimate : Math.round((1500 + popularity * 26) * 10000 + (winPct - 0.5) * 4200 * 10000));
  const merchPct = currentMarketing ? finance.marketingMerchPct || 0 : 0;
  const perCapitaSpend = (MERCH_BASE_SPEND + popularity * 0.06) * (1 + spendPct) * (1 + merchPct);
  const merchRevenue = Math.round(projectedAttendance * homeGames * perCapitaSpend);
  const perGameGate = projectedAttendance * ticketPrice;
  const gateShareIncome = Math.round(awayGames * perGameGate * (winPct * GATE_SHARE_WIN + (1 - winPct) * GATE_SHARE_LOSE));
  const gateSharePaid = Math.round(homeGames * perGameGate * ((1 - winPct) * GATE_SHARE_WIN + winPct * GATE_SHARE_LOSE));
  const players = S.players || {};
  let payroll = 0;
  (team.roster1 || []).concat(team.roster2 || []).forEach(id => {
    const player = players[id];
    if (player) payroll += Number.isFinite(player.salary) ? player.salary : computePlayerSalary(player);
  });
  (team.rosterDev || []).forEach(id => {
    const player = players[id];
    if (player) payroll += Number.isFinite(player.salary) ? player.salary : (typeof V54_DEV_MIN_SALARY !== "undefined" ? V54_DEV_MIN_SALARY : 80000);
  });
  ["1軍", "2軍"].forEach(group => COACH_ROLES.forEach(role => {
    const id = team.coachStaff && team.coachStaff[group] && team.coachStaff[group][role];
    const coach = id && S.coaches && S.coaches[id];
    if (coach) payroll += coach.salary || 0;
  }));
  if (team.coachStaff && team.coachStaff["育成"]) Object.values(team.coachStaff["育成"]).forEach(id => {
    const coach = S.coaches && S.coaches[id];
    if (coach) payroll += coach.salary || 0;
  });
  if (team.scouts) Object.values(team.scouts).forEach(scout => { if (scout) payroll += scout.salary || 0; });
  const leaguePayrolls = Object.values(S.teams).map(other => other === team ? payroll : (other.finance && other.finance.payroll) || 0);
  const avgPayroll = leaguePayrolls.length ? leaguePayrolls.reduce((sum, amount) => sum + amount, 0) / leaguePayrolls.length : payroll;
  const luxuryTax = payroll > avgPayroll * 1.3 ? Math.round((payroll - avgPayroll * 1.3) * 0.5) : 0;
  const totalRevenue = ticketRevenue + broadcastRevenue + sponsorRevenue + merchRevenue + gateShareIncome;
  const projectedNet = totalRevenue - payroll - luxuryTax - maintenanceCost - gateSharePaid;
  return { budget: finance.budget, projectedNet, previousNet: finance.lastSeasonReport && finance.lastSeasonReport.net, projectedAttendance };
}
function v60PreseasonWindow() {
  return !!(S && S.userTeamId && S.teams && S.teams[S.userTeamId] && S.currentDay === 0
    && !["setup", "teamSelect", "gameModePick", "bootRecovery", "tutorial", "gameOver"].includes(UI.screen));
}
function v60PreseasonSpringReady() {
  return !!(S.springCamp && S.springCamp.year === S.seasonYear);
}
const V60_PRESEASON_STEPS = ["deals", "ticket", "marketing", "facilities", "roster"];
function ensureV60() {
  if (!S) return;
  const review = S.preseasonReview;
  if (review && Number.isInteger(review.year) && review.teamId === S.userTeamId && review.steps && typeof review.steps === "object") return;
  const alreadyOpened = S.currentDay > 0 || S.springCampDoneYear === S.seasonYear;
  S.preseasonReview = { year: S.seasonYear, teamId: S.userTeamId, steps: Object.fromEntries(V60_PRESEASON_STEPS.map(key => [key, alreadyOpened])) };
}
function v60PreseasonReview() {
  const review = S.preseasonReview;
  return review && review.year === S.seasonYear && review.teamId === S.userTeamId && review.steps ? review.steps : {};
}
function v60PreseasonMissingStep() {
  if (!S.gameStarted || S.currentDay !== 0 || !v60PreseasonSpringReady() || S.springCampDoneYear === S.seasonYear) return null;
  const steps = v60PreseasonReview();
  return V60_PRESEASON_STEPS.find(key => steps[key] !== true) || null;
}
function v60PreseasonScreenForStep(key) {
  return { deals: "financeDeals", ticket: "financeTicket", marketing: "marketing", facilities: "facilities", roster: "roster" }[key] || "springCamp";
}
function v60PreseasonOpenStep(key) {
  const screen = v60PreseasonScreenForStep(key);
  if (screen === "financeDeals" || screen === "financeTicket") {
    UI.screen = "finance"; UI.tabs = UI.tabs || {}; UI.tabs.finance = screen === "financeDeals" ? "deals" : "ticket";
    if (screen === "financeDeals" && !S.teams[S.userTeamId].finance?.broadcastDeal) UI.tabs.financeDeals = "broadcast";
  } else UI.screen = screen;
  render();
}
function v60PreseasonCompleteStep(key) {
  if (!V60_PRESEASON_STEPS.includes(key) || !S.gameStarted || S.currentDay !== 0 || !v60PreseasonSpringReady()) return false;
  const missing = v60PreseasonMissingStep();
  if (missing !== key) { if (missing) v60PreseasonOpenStep(missing); return false; }
  if (key === "roster" && typeof rosterBlockingIssues === "function" && rosterBlockingIssues(S.teams[S.userTeamId]).length) {
    UI.flash = "名單尚有出賽必要位置缺口，請補足後再進入春訓。";
    render();
    return false;
  }
  if (!S.preseasonReview || S.preseasonReview.year !== S.seasonYear || S.preseasonReview.teamId !== S.userTeamId) S.preseasonReview = { year: S.seasonYear, teamId: S.userTeamId, steps: {} };
  S.preseasonReview.steps[key] = true;
  persist();
  const next = v60PreseasonMissingStep();
  if (next) v60PreseasonOpenStep(next);
  else { UI.screen = "springCamp"; render(); }
  return true;
}
function v60PreseasonNextStage() {
  if (S.forcedCutRequired) return { label: "處理裁員", short: "裁員", screen: "financeCuts" };
  if ((S.pendingContractRenewals || []).length) return { label: "處理談約", short: "球員約", screen: "contractRenewals" };
  if ((S.pendingStaffRenewals || []).length) return { label: "教練／球探續約", short: "教練約", screen: "staffRenewal" };
  if (S.v55PendingDirectorRenewal) return { label: "主管續約", short: "主管約", screen: "directorRenewal" };
  if (S.draft && S.draft.active) return { label: "繼續選秀", short: "選秀", screen: "draft" };
  // 選秀的年度屬於休賽季；換季後 seasonYear 已前進，不能因此重開選秀。
  if (!v60PreseasonSpringReady() && S.draftDoneYear !== S.seasonYear) return { label: "進入選秀", short: "選秀", screen: "draft" };
  if (!S.gameStarted && S.draftDoneYear === S.seasonYear) return { label: "開始新球季", short: "開季", screen: "beginFirstSeason" };
  if (S.springCampDoneYear === S.seasonYear) return { label: "回主控台", short: "開季", screen: "dashboard" };
  if (S.springCamp && S.springCamp.year === S.seasonYear && S.springCamp.executed) return { label: "春訓成果", short: "成果", screen: "springReport" };
  const missing = v60PreseasonMissingStep();
  if (missing) return { label: "完成目前項目", short: ({ deals: "談約", ticket: "票價", marketing: "行銷", facilities: "硬體", roster: "名單" })[missing], screen: v60PreseasonScreenForStep(missing) };
  if (UI.screen === "springCamp") return { label: "完成春訓", short: "春訓", screen: "springCamp" };
  if (UI.screen === "finance") return { label: "春訓安排", short: "春訓", screen: "springCamp" };
  if (v60PreseasonSpringReady()) return { label: "春訓安排", short: "春訓", screen: "springCamp" };
  return { label: "回主控台", short: "開季", screen: "dashboard" };
}
function v60PreseasonGoNext() {
  const stage = v60PreseasonNextStage();
  if (stage.screen === "financeCuts" || stage.screen === "contractRenewals") return proceedFromOffseasonSummary();
  if (stage.screen === "draft") {
    if (S.draft && S.draft.active) { UI.screen = "draft"; render(); return; }
    return proceedToDraft();
  }
  if (stage.screen === "beginFirstSeason") return beginFirstSeason();
  if (stage.screen === "financeDeals" || stage.screen === "financeTicket") return v60PreseasonOpenStep(stage.screen === "financeDeals" ? "deals" : "ticket");
  if (stage.screen === "springCamp") {
    if (!v60PreseasonSpringReady()) prepareSpringCamp();
    if (UI.screen === "springCamp") { UI.flash = "請完成春訓安排；也可使用上方入口直接檢查其他項目。"; }
    UI.screen = "springCamp";
  } else UI.screen = stage.screen;
  render();
}
function v60PreseasonOpenContracts() {
  if (S.forcedCutRequired) { UI.screen = "financeCuts"; }
  else if ((S.pendingContractRenewals || []).length) { UI.screen = "contractRenewals"; }
  else if ((S.pendingStaffRenewals || []).length) { UI.screen = "staffRenewal"; }
  else if (S.v55PendingDirectorRenewal) { UI.screen = "directorRenewal"; }
  else { UI.screen = "finance"; UI.tabs = UI.tabs || {}; UI.tabs.finance = "deals"; }
  render();
}
function v60PreseasonReviewAction() {
  const key = v60PreseasonMissingStep();
  const onStep = key === "deals" ? UI.screen === "finance" && UI.tabs && UI.tabs.finance === "deals"
    : key === "ticket" ? UI.screen === "finance" && UI.tabs && UI.tabs.finance === "ticket"
    : UI.screen === key;
  if (!onStep) return null;
  const label = { deals: "維持未簽約項目預設收入", ticket: "維持目前票價", marketing: "完成行銷配置（可不投入）", facilities: "完成硬體檢查（可不建造）", roster: "確認名單，前往春訓" }[key];
  return { key, label };
}
function v60MountPreseasonDock() {
  if (!v60PreseasonWindow()) return;
  const root = document.getElementById("app");
  if (!root || !root.querySelector || !root.insertAdjacentHTML || !root.querySelectorAll || root.querySelector(".v60-preseason-dock")) return;
  const team = S.teams[S.userTeamId];
  const snapshot = v60PreseasonFinanceForecast(team);
  if (!snapshot) return;
  const stage = v60PreseasonNextStage();
  const reviewAction = v60PreseasonReviewAction();
  const netClass = snapshot.projectedNet < 0 ? "is-negative" : "is-positive";
  const previous = Number.isFinite(snapshot.previousNet) ? `${snapshot.previousNet >= 0 ? "+" : ""}${formatMoney(snapshot.previousNet)}` : "尚無上季資料";
  root.insertAdjacentHTML("afterbegin", `<aside class="v60-preseason-dock" aria-label="開季準備快捷列">
    <div class="v60-preseason-dock-inner">
      <button class="v60-preseason-finance ${netClass}" type="button" data-v60-prep="finance" aria-label="開啟財務總覽；本季預估損益 ${formatMoney(snapshot.projectedNet)}">
        <span><small>預算</small><b>${formatMoney(snapshot.budget)}</b></span>
        <span><small>上季實績</small><b>${previous}</b></span>
        <span class="v60-preseason-current"><small>本季預估</small><b>${snapshot.projectedNet >= 0 ? "+" : ""}${formatMoney(snapshot.projectedNet)}</b></span>
      </button>
      <nav class="v60-preseason-links ${S.selfTrainingReport && S.springCampDoneYear !== S.seasonYear ? "has-report" : ""} ${UI.completedDraft ? "has-recap" : ""}" aria-label="開季準備入口">
        <button type="button" data-v60-prep="current" aria-label="返回目前待完成項目：${stage.short}" title="返回目前待完成項目：${stage.short}"><span>待辦</span><small>${stage.short}</small></button>
        <button type="button" data-v60-prep="contracts">談約${(S.pendingContractRenewals || []).length ? `・${S.pendingContractRenewals.length}` : ""}</button>
        <button type="button" data-v60-prep="ticket">票價</button>
        <button type="button" data-v60-prep="marketing">行銷</button>
        <button type="button" data-v60-prep="facilities">硬體</button>
        <button type="button" data-v60-prep="roster">名單</button>
        ${UI.completedDraft ? '<button type="button" data-v60-prep="draftRecap">選秀成果</button>' : ""}
        ${S.selfTrainingReport && S.springCampDoneYear !== S.seasonYear ? '<button type="button" data-v60-prep="selfTraining">自主訓練成果</button>' : ""}
        <button type="button" data-v60-prep="spring" ${!v60PreseasonSpringReady() || v60PreseasonMissingStep() ? "disabled" : ""}>春訓</button>
      </nav>
      ${reviewAction ? `<button type="button" class="v60-preseason-review-action" data-v60-prep="complete" data-step="${reviewAction.key}">${reviewAction.label}</button>` : ""}
    </div>
  </aside>`);
  root.querySelectorAll("[data-v60-prep]").forEach(button => {
    button.onclick = () => {
      const route = button.dataset.v60Prep;
      if (route === "current") return v60PreseasonGoNext();
      if (route === "complete") return v60PreseasonCompleteStep(button.dataset.step);
      if (route === "contracts") return v60PreseasonOpenContracts();
      if (route === "finance" || route === "ticket") {
        UI.screen = "finance"; UI.tabs = UI.tabs || {}; UI.tabs.finance = route === "ticket" ? "ticket" : "overview";
      } else if (route === "marketing") UI.screen = "marketing";
      else if (route === "facilities") UI.screen = "facilities";
      else if (route === "roster") UI.screen = "roster";
      else if (route === "draftRecap") UI.screen = "draftRecap";
      else if (route === "selfTraining") UI.screen = "selfTraining";
      else if (route === "spring") {
        const missing = v60PreseasonMissingStep();
        if (missing) return v60PreseasonOpenStep(missing);
        if (S.springCamp && S.springCamp.year === S.seasonYear && S.springCamp.executed) UI.screen = "springReport";
        else { if (!S.springCamp || S.springCamp.year !== S.seasonYear) prepareSpringCamp(); UI.screen = "springCamp"; }
      }
      render();
    };
  });
}
let v60LastRenderedScreen = null;
function render() {
  if (typeof window !== 'undefined' && window.v60BootFailed && typeof window.v60RenderBootFailure === 'function') return window.v60RenderBootFailure();
  const __v60CurrentScreen = (typeof UI !== 'undefined' && UI) ? UI.screen : null;
  if (__v60CurrentScreen !== v60LastRenderedScreen) {
    v60LastRenderedScreen = __v60CurrentScreen;
    try { if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, 0); }
    catch (e) { console.error("切換畫面時重設捲動位置失敗：", e); }
  }
  if (UI.injuryChoiceReturn && UI.screen !== 'playerDetail') { UI.injuryChoiceReturn = false; return v60RenderInjuryChoice(); }
  // v35.1：全域渲染防護——任何畫面渲染拋錯都落到安全模式，不留白屏（手機「只剩綠底」的根治）
  try { v60BindArtReadyRerender(); } catch (_) {}
  try { if (document.body && document.body.setAttribute) document.body.setAttribute("data-skin", (S && S.skin) || "emoji"); } catch (_) {} // v41⑦：皮膚插槽（預設emoji）
  try { if (document.body && document.body.setAttribute) document.body.setAttribute("data-screen", (typeof UI !== "undefined" && UI && UI.screen) || ""); } catch (_) {} // v47：分頁背景槽位（未導入資產包時無任何視覺變化）
  try { if (typeof v49ClearPortraitCache === "function") v49ClearPortraitCache(); } catch (_) {} // v49：清除肖像快取（轉隊後即時換帽）
  try { const r = renderScreen(); try { v60MountPreseasonDock(); wireUiTabs(); v60MarkStickyScreenAction(); } catch (e) { console.error("開季準備快捷列掛線失敗：", e); } v60KickRenderedSceneImages(); return r; }
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
  if (UI.screen === "draftRecap") return renderDraft();
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
    v60StartNewGame(document.getElementById("in-gm").value);
  };
}

// 分段僅讓瀏覽器繪製進度；不抽亂數、不改建局順序，不估造剩餘秒數。
async function v60StartNewGame(name) {
  if (UI.creatingGame) return;
  UI.creatingGame = true;
  const started = performance.now();
  const previous = S, previousId = ID_SEQ;
  app.innerHTML = '<div class="wrap"><section class="card v60-loading" aria-busy="true"><h1>建立新球季</h1><p role="status" id="v60-build-status">準備球隊資料</p><progress id="v60-build-progress" max="22" value="0" aria-label="已完成建局工作"></progress><p id="v60-build-time">所需時間依裝置而異</p></section></div>';
  try {
    const steps = newGameSteps(name);
    for (;;) {
      await new Promise(resolve => setTimeout(resolve, 0));
      const step = steps.next();
      if (step.done) break;
      document.getElementById('v60-build-status').textContent = step.value.label;
      document.getElementById('v60-build-progress').value = step.value.completed;
      document.getElementById('v60-build-time').textContent = `已等待 ${((performance.now() - started) / 1000).toFixed(1)} 秒`;
    }
  } catch (error) {
    console.error('[建立球季]', error);
    S = previous; ID_SEQ = previousId;
    UI.flash = '建立失敗，原存檔未刪除；請重試或回報。';
    UI.screen = 'setup'; render();
  } finally { UI.creatingGame = false; }
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
  const activeDiv = divs.includes(UI.teamSelectDivision) ? UI.teamSelectDivision : divs[0];
  UI.teamSelectDivision = activeDiv;
  const lbrand = (typeof LEAGUE_BRAND !== "undefined") ? LEAGUE_BRAND : null;
  app.innerHTML = `
    <div class="wrap">
      <div class="hero">
        <div class="eyebrow">${lbrand ? lbrand.fullName : S.leagueName}</div>
        <h1>選擇你的球隊</h1>
        <p class="sub">GM ${S.gmName}，從 ${lbrand ? lbrand.shortName : "聯盟"} 20 隊中挑一支開始你的 GM 生涯。</p>
      </div>
      <nav class="v60-team-division-tabs" role="tablist" aria-label="選擇球隊分區">
        ${divs.map(d => `<button type="button" role="tab" data-team-division="${d}" aria-selected="${d === activeDiv}" aria-controls="v60-team-division-panel">${DIV_LABEL[d]}<small>${Object.values(S.teams).filter(t => t.division === d).length} 隊</small></button>`).join("")}
      </nav>
      <div class="divblock" id="v60-team-division-panel" role="tabpanel" aria-label="${DIV_LABEL[activeDiv]}球隊">
        <div class="divlabel">${DIV_LABEL[activeDiv]}</div>
        <div class="teamgrid v50-teamgrid">
            ${Object.values(S.teams).filter(t => t.division === activeDiv).map(t => {
              const pc = t.primaryColor || "#333";
              const sc = t.secondaryColor || "#999";
              const logo = (typeof themeTeamLogo === "function") ? themeTeamLogo(t.id, 40) : "";
              const tierLabel = (typeof v55CityTierLabel === "function") ? v55CityTierLabel(t.id) : "";
              const personaLabel = (typeof personaOf === "function" && personaOf(t)) ? personaOf(t).name : "";
              return `<button class="v50-teamcard v55-teamcard-ext v60-approved-teamcard" data-id="${t.id}" data-identity-source="approved-theme-pack" style="--tc-primary:${pc};--tc-secondary:${sc}">
                <span class="v50-team-dot" style="background:${pc};box-shadow:0 0 0 3px ${sc}"></span>
                <span class="v60-team-logo-frame">${logo}</span><span class="v50-team-name">${t.name}</span>
                <span class="v55-team-tags"><span class="v55-city-tier">${tierLabel}</span><span class="v55-persona-tag">${personaLabel}</span></span>
              </button>`;
            }).join("")}
        </div>
      </div>
    </div>`;
  app.querySelectorAll("[data-team-division]").forEach(btn => {
    btn.onclick = () => { UI.teamSelectDivision = btn.dataset.teamDivision; render(); };
  });
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
  const blockingIssues = rosterBlockingIssues(team);
  const rosterWarnings = issues.filter(i => !blockingIssues.includes(i));
  const blocked = blockingIssues.length > 0;
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
      ${(typeof renderCoachRosterSwapCards === "function") ? renderCoachRosterSwapCards() : ""}
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
           <p class="v60-state-line">${p.injury.name}・${p.injury.part}；恢復尚未開始，請先選治療方針。</p>
           ${v60VisualMetricRail([
             ["手術", `${formatMoney(surgCost)}・約${Math.max(3, Math.round(p.injury.totalDays * 1.4))}天`],
             ["保守", `免費・約${p.injury.totalDays}天`],
             ["手術降評", "約2%"],
             ["保守降評", `約${Math.round(clamp(0.25 - (typeof rehabDowngradeShift === "function" ? rehabDowngradeShift(team) : 0), 0.05, 0.25) * 100)}%`],
             ["目前預算", `${formatMoney(team.finance.budget)}${canAfford ? "" : "・不足"}`]
           ], "重傷治療決策")}
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
           ${v60VisualMetricRail([["出賽", "暫停"], ["歸隊", "傷癒自動"], ["醫療室", "降受傷"], ["復健中心", "加速恢復"]], "傷兵狀態摘要")}
           <p class="v60-state-line">傷兵不列入調度；恢復後自動歸隊。</p>
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
         ${v60VisualMetricRail([["比賽", "可繼續"], ["處理", "調整先發"], ["入口", "球員名單"]], "先發陣容摘要")}
         <p class="v60-state-line">到「球員名單」調整先發打線／投手輪值。</p>
      </div>`
          : `
      <div class="card issuecard">
        <div class="eyebrow">現場調度（純GM）</div>
        <ul class="issuelist">
          ${lineupWarnings.map(i => `<li>${i}</li>`).join("")}
        </ul>
        ${v60VisualMetricRail([["模式", "純 GM"], ["排陣", "總教練負責"], ["傷兵", "自動遞補"], ["缺口", "提案請示"]], "純GM陣容摘要")}
        <p class="v60-state-line">你只需回應補強需求／遞補提案。</p>
      </div>`
      ) : ""}

      ${financeWarns.length > 0 ? `
      <div class="card issuecard">
        <div class="eyebrow">財務提醒</div>
        <ul class="issuelist">
          ${financeWarns.map(i => `<li>${i}</li>`).join("")}
        </ul>
        ${v60VisualMetricRail([["警示", `${financeWarns.length} 項`], ["入口", "財務"], ["可調整", "票價・合約"]], "財務提醒摘要")}
        <p class="v60-state-line">前往「財務」查看收支與票價策略。</p>
      </div>` : ""}`;
  const dashTodoCount = (dashTodoPanel.match(/class="card (issuecard|injurycard)/g) || []).length
    + (dashTodoPanel.match(/id="btn-aiprop-accept"/g) || []).length
    + (dashTodoPanel.match(/class="rumor-intercept"/g) || []).length;
  const dashMailUnread = (typeof v43UnreadMailCount === "function") ? v43UnreadMailCount() : 0; // v43郵件未讀數
  const dashGamePanel = `
      ${rosterWarnings.length > 0 ? `
      <div class="card issuecard">
        <div class="eyebrow">名單編制提醒・比賽可繼續</div>
        <ul class="issuelist">${rosterWarnings.map(i => `<li>${i}</li>`).join("")}</ul>
        <p class="v60-state-line">暫時超編不影響比賽；可自行整理，並會在下次選秀後自動整編。</p>
        <button id="btn-roster-warning" class="btn-outline">查看球員名單</button>
      </div>` : ""}
      ${blocked ? `
      <div class="card issuecard">
        <div class="eyebrow">名單狀態異常，暫停比賽模擬</div>
        <ul class="issuelist">
          ${blockingIssues.map(i => `<li>${i}</li>`).join("")}
        </ul>
        <p class="sub dark">一軍缺少出賽必要位置，請補足投手或野手後再繼續模擬。</p>
        <button id="btn-roster-fix" class="btn-primary">前往球員名單調整</button>
      </div>` : ""}

      ${myLastGame ? renderLastGameCard(myLastGame, team) : ""}

      ${needSpringCamp ? `
      <div class="card seasonover">
        <div class="eyebrow">${v60PreseasonMissingStep() ? "開季準備待完成" : "春訓待完成"}</div>
        <button id="btn-go-spring" class="btn-primary">${v60PreseasonMissingStep() ? "回到目前準備項目" : "前往春訓安排"}</button>
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
      const missing = v60PreseasonMissingStep();
      if (missing) return v60PreseasonOpenStep(missing);
      if (!S.springCamp || S.springCamp.year !== S.seasonYear) prepareSpringCamp();
      UI.flash = null; UI.screen = "springCamp"; render();
    };
  }
  const rosterWarningButton = document.getElementById("btn-roster-warning");
  if (rosterWarningButton) rosterWarningButton.onclick = () => { UI.screen = "roster"; render(); };
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
        const swap = (typeof v60MakeCoachRosterSwapProposal === "function")
          ? v60MakeCoachRosterSwapProposal(pid, b.dataset.id)
          : null;
        if (!swap) {
          promotePlayer(pid); // 舊環境 fallback；正式 v60 會走上面的教練提案
          if (typeof checkDemandFulfilled === "function") try { checkDemandFulfilled(); } catch (e) {}
          UI.flash = `${p.name} 已升上一軍——若達到需求門檻，教練需求將自動判定達成。`;
        } else {
          UI.flash = swap.msg;
        }
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
  wireCdActivitiesActions();
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
  const blockingIssues = rosterBlockingIssues(S.teams[S.userTeamId]);
  const rosterWarnings = issues.filter(i => !blockingIssues.includes(i));
  const blocked = blockingIssues.length > 0 && !p.champion;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName} ・ 第${S.seasonYear}年</div><h1>季後賽</h1></div>
      <div class="divlabel">${ROUND_LABEL[p.round]}</div>
      ${p.matchups.map(m => renderMatchupCard(m)).join("")}
      ${rosterWarnings.length > 0 && !p.champion ? `
      <div class="card issuecard">
        <div class="eyebrow">名單編制提醒・比賽可繼續</div>
        <ul class="issuelist">${rosterWarnings.map(i => `<li>${i}</li>`).join("")}</ul>
        <p class="v60-state-line">暫時超編不影響比賽；可自行整理，並會在下次選秀後自動整編。</p>
        <button id="btn-roster-warning" class="btn-outline">查看球員名單</button>
      </div>` : ""}
      ${blocked ? `
      <div class="card issuecard">
        <div class="eyebrow">名單狀態異常，暫停季後賽模擬</div>
        <ul class="issuelist">${blockingIssues.map(i => `<li>${i}</li>`).join("")}</ul>
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
  const rosterWarningButton = document.getElementById("btn-roster-warning");
  if (rosterWarningButton) rosterWarningButton.onclick = () => { UI.screen = "roster"; render(); };
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
    const awardCards = keys => AWARD_LABELS.filter(([key]) => keys.includes(key)).map(([key, label]) => {
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
      }).join("");
    const goldenBat = (function() {
        const p = la.goldenBat ? S.players[la.goldenBat] : null;
        const tm = p ? S.teams[p.team] : null; const mine = p && p.team === S.userTeamId;
        return '<div class="card awardcard ' + (mine ? "me" : "") + '">' +
          '<div class="eyebrow">金棒獎・最佳打者</div>' +
          '<div class="awardname">' + (p ? p.name : "從缺") + '</div>' +
          '<div class="awardteam">' + (p && tm ? tm.name + (mine ? "（你的球隊！）" : "") : "") + '</div>' +
          '<div class="awardstat">' + (p ? awardStatLine("battingTitle", p) + "、" + p.seasonStats.HR + "轟" : "") + '</div></div>';
      })();
    const goldenArm = (function() {
        const p = la.goldenArm ? S.players[la.goldenArm] : null;
        const tm = p ? S.teams[p.team] : null; const mine = p && p.team === S.userTeamId;
        return '<div class="card awardcard ' + (mine ? "me" : "") + '">' +
          '<div class="eyebrow">金臂獎・最佳投手</div>' +
          '<div class="awardname">' + (p ? p.name : "從缺") + '</div>' +
          '<div class="awardteam">' + (p && tm ? tm.name + (mine ? "（你的球隊！）" : "") : "") + '</div>' +
          '<div class="awardstat">' + (p ? awardStatLine("winsTitle", p) + "、防禦率" + era(p.seasonStats).toFixed(2) : "") + '</div></div>';
      })();
    const bestNineCards = BESTNINE_GROUPS.map(g => {
        const p = la.bestNine[g] ? S.players[la.bestNine[g]] : null;
        const tm = p ? S.teams[p.team] : null; const mine = p && p.team === S.userTeamId;
        return '<div class="card awardcard ' + (mine ? "me" : "") + '">' +
          '<div class="eyebrow">' + g + '</div>' +
          '<div class="awardname">' + (p ? p.name : "從缺") + '</div>' +
          '<div class="awardteam">' + (p && tm ? tm.name + (mine ? "（你的球隊！）" : "") : "") + '</div>' +
          '<div class="awardstat">' + (p ? awardStatLine("battingTitle", p) + (g === "指定打擊" ? "" : "、守備成功率" + p.fielding + "%") : "") + '</div></div>';
      }).join("");
    const goldenGloveCards = GOLDGLOVE_GROUPS.map(g => {
        const p = la.goldenGlove[g] ? S.players[la.goldenGlove[g]] : null;
        const tm = p ? S.teams[p.team] : null; const mine = p && p.team === S.userTeamId;
        return '<div class="card awardcard ' + (mine ? "me" : "") + '">' +
          '<div class="eyebrow">' + g + '</div>' +
          '<div class="awardname">' + (p ? p.name : "從缺") + '</div>' +
          '<div class="awardteam">' + (p && tm ? tm.name + (mine ? "（你的球隊！）" : "") : "") + '</div>' +
          '<div class="awardstat">' + (p ? "守備成功率 " + p.fielding + "%" : "") + '</div></div>';
      }).join("");
    return `<div class="v60-awards-categories">${uiTabs(`awards-${region}`, [
      { key: "headline", label: "年度大獎", html: awardCards(["mvp", "rookieOfYear"]) },
      { key: "batting", label: "打擊", html: awardCards(["battingTitle", "homeRunTitle", "hitsTitle", "rbiTitle", "stolenBaseTitle"]) + goldenBat },
      { key: "pitching", label: "投手", html: awardCards(["eraTitle", "winsTitle", "strikeoutTitle", "saveTitle", "holdTitle"]) + goldenArm },
      { key: "bestNine", label: "最佳九人", html: `<p class="sub dark">含指定打擊，共 9 席</p>${bestNineCards}` },
      { key: "goldenGlove", label: "金手套", html: goldenGloveCards }
    ])}</div>`;
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
   r037 將收合式長文改為可見流程圖、數據卡與因果列；純唯讀，任何流程階段均可進出。 */
function tutorialSections() {
  return [
    { key: "basics", short: "規則", title: "聯盟與GM目標", html: `
      <p class="v60-guide-lead">管理陣容、育成與財務，完成 KPI、爭冠並延續 GM 生涯。</p>
      <div class="v60-guide-stat-grid" aria-label="聯盟規模">
        <div><b>20 隊</b><span>4 分區 × 5 隊</span></div><div><b>126 場</b><span>例行賽</span></div><div><b>季後賽</b><span>分區龍頭＋佳績隊伍晉級</span></div>
      </div>
      <div class="v60-guide-rule-strip"><span>1軍 ≤28</span><span>2軍 ≤32</span><span>育成 ≤25</span><span>1軍外籍名額受限</span></div>
      <p class="v60-guide-cause">打線9人・輪值／牛棚備齊；缺人暫停模擬並提示補人。</p>
      <p class="v60-guide-alert"><b>信任 0–100</b><span>開幕訂 KPI、季末評分；信任歸零 → 解職。</span></p>` },
    { key: "cycle", short: "年度", title: "一年流程", html: `
      <ol class="v60-guide-year-grid" aria-label="年度循環">
        <li><b>春訓</b><span>開幕前必經</span></li><li><b>例行賽</b><span>每日推進／快轉</span></li><li><b>季後賽</b><span>層層對決爭冠</span></li><li><b>休賽季</b><span>財務、人事與選秀</span></li>
      </ol>
      <p class="v60-guide-cause">第5年起每4年國際賽；母國春訓免費，海外較貴但效果佳。</p>
      <div class="v60-guide-pair"><article><b>例行賽</b><span>推進1天／快轉1週／至季末</span></article><article><b>自動暫停</b><span>先發傷兵・AI提案・KPI檢視・交易風聲</span></article></div>
      <h3 class="v60-guide-subtitle">休賽季固定順序</h3>
      <ol class="v60-guide-steps"><li>財務結算＋KPI</li><li>若赤字：強制裁員</li><li>球員續約</li><li>教練／球探續約</li><li>新人選秀</li><li>自主訓練＋傳承</li><li>下一季春訓</li></ol>
      <p class="v60-guide-alert"><b>階段不可回頭</b><span>代理人應酬：選秀前休賽季辦理・每類每年1次。</span></p>` },
    { key: "roster", short: "陣容", title: "球員、傷病與養成", html: `
      <div class="v60-guide-pair"><article><b>野手</b><span>打擊・跑壘・守備</span></article><article><b>投手</b><span>球速・控球・體力・球路</span></article></div>
      <p class="v60-guide-cause">現況＝目前能力；天花板＝潛力。年齡影響成長／衰退。</p>
      <div class="v60-guide-rule-strip"><span>狀況5級</span><span>登板累積疲勞</span><span>牛棚連投降能力</span><span>安排輪替</span></div>
      <div class="v60-guide-pair"><article><b>手術</b><span>付費・恢復較慢・後遺症較少</span></article><article><b>保守治療</b><span>免費・降評與復發風險較高</span></article></div>
      <p class="v60-guide-cause">傷後復健；傷病史提高再傷風險。</p>
      <div class="v60-guide-rule-strip"><span>春訓：全隊</span><span>季中特訓：單點</span><span>季後：小幅成長／悟特質</span><span>老將傳承給年輕高潛</span></div>
      <p class="v60-guide-cause">打線、守位、輪值與牛棚可自訂，或採教練建議。</p>` },
    { key: "staff", short: "幕僚", title: "教練與球探", html: `
      <div class="v60-guide-pair"><article><b>教練</b><span>1、2軍各8席；專精加成，總教練小幅加成全隊；可更換／跨軍互換。</span></article><article><b>球探三席</b><span>國內選秀・國際市場・交易評估；準度與辦公室加成提高可信度。</span></article></div>
      <h3 class="v60-guide-subtitle">合約到期後果</h3>
      <div class="v60-guide-rule-strip"><span>出價 ≥ 期望必成</span><span>年限每少1年・薪資要求 +25%</span></div>
      <p class="v60-guide-alert"><b>談破／不續 → 職位空缺、加成歸零</b><span>球探改盲評；到幕僚市場補人。</span></p>` },
    { key: "finance", short: "財務", title: "財務決策", html: `
      <div class="v60-guide-visual-row"><img src="visual_assets/v60/finance_front_office_r038.jpg" alt="球場售票、財務帳務與設施維護場景" width="1254" height="1254" loading="lazy" decoding="async"><div class="v60-guide-visual-points"><span><b>收入</b> 票房・分潤・轉播／贊助・設施</span><span><b>支出</b> 薪資・維護・行銷・春訓／醫療</span><span><b>控管</b> 預算、上座率與奢侈稅</span></div></div>
      <p class="v60-guide-alert"><b>季末赤字 → 休賽季強制釋出高薪球員（無回收）</b><span>戰力受損，影響退休轉任與財務 KPI。</span></p>
      <h3 class="v60-guide-subtitle">控管赤字 6 招</h3>
      <ol class="v60-guide-six"><li>簽約前看薪資總額／聯盟平均</li><li>人氣低慎漲票；上座 ≥90% 才升票價上限</li><li>設施分期；老舊維護費升，留周轉金</li><li>顛峰前長約・老將短約</li><li>虧損季停用選配行銷</li><li>手術／海外春訓／應酬量力</li></ol>` },
    { key: "market", short: "補強", title: "選秀、交易與自由市場", html: `
      <div class="v60-guide-visual-row"><img src="visual_assets/v60/scouting_contracts_r038.jpg" alt="球探室、談約桌與球場場景" width="1254" height="1254" loading="lazy" decoding="async"><div class="v60-guide-visual-points"><span><b>選秀・每年 6 輪</b> 球探估值</span><span><b>交易</b> 選秀後至季末前30天・好感影響開價</span><span><b>本土 FA</b> 能力公開・簽約金約年薪30%</span><span><b>國際市場</b> 球探估值・獨家限本隊</span></div></div>
      <div class="v60-guide-rule-strip"><span>新秀談敗5次 → 放棄加盟</span><span>交易風聲可介入</span><span>1軍外籍名額受限</span></div>` },
    { key: "agency", short: "人脈", title: "代理人與情報", html: `
      <div class="v60-guide-stat-grid" aria-label="代理人關係門檻"><div><b>7 型</b><span>代理不同性格球員</span></div><div><b>好感 ≥4</b><span>取得客戶動向</span></div><div><b>好感 10</b><span>獨家引薦・談約門檻 -5%</span></div></div>
      <p class="v60-guide-cause">付費情蒐：查經紀人底細與薪資底線。</p>
      <p class="v60-guide-rule-strip"><span>休賽季</span><span>每類每年1次</span><span>應酬300–800萬</span><span>好感高：談約／提案更有利</span></p>` },
    { key: "career", short: "生涯", title: "KPI、信任與委任", html: `
      <div class="v60-guide-pair"><article><b>年度 KPI</b><span>開幕公布成績／經營目標；難度越高，未達扣信任越少。季中可加碼／降標，降標獎勵減半。</span></article><article><b>連年結果</b><span>連2年全達→目標升；連2年全未達→留校察看。奪冠信任+8。</span></article></div>
      <p class="v60-guide-cause">信任歸零→解職；東山再起僅1次，保留生涯戰績，邀約看聲望。第二次解職 → 永久出局。</p>
      <p class="v60-guide-rule-strip"><span>沉潛1年：生涯限1次</span><span>回歸聲望+5</span><span>重抽邀約</span></p>
      <p class="v60-guide-cause">新東家可能附2季委任（重建／爭冠／止血），影響 KPI 與財務；奪冠可主動跳槽，不耗東山再起。</p>` },
    { key: "saves", short: "存檔", title: "存檔與重置", html: `
      <ol class="v60-guide-steps"><li>操作後自動存檔；重開續目前階段。</li><li>3個手動槽：選秀／重大交易前留檔。</li><li>換裝置或清資料前匯出 JSON；進度存於 IndexedDB，清資料會一併刪除。</li><li>「重新開始」清除存檔且無法復原；先備份。</li></ol>` }
  ];
}
function renderTutorial() {
  const sections = tutorialSections();
  const activeIndex = Number.isInteger(UI.tutorialPage) ? Math.max(0, Math.min(sections.length - 1, UI.tutorialPage)) : 0;
  const section = sections[activeIndex];
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">GAME GUIDE</div><h1>${icon('book')} 新手教學</h1></div>
      <nav class="v60-guide-index" role="tablist" aria-label="教學章節">
        ${sections.map((s, index) => `<button type="button" role="tab" id="guide-tab-${s.key}" data-guide-page="${index}" aria-controls="guide-panel" aria-selected="${index === activeIndex}"${index === activeIndex ? ' tabindex="0"' : ' tabindex="-1"'}>${s.short}</button>`).join("")}
      </nav>
      <div class="v60-guide-pager" aria-label="教學章節導覽">
        <button type="button" class="btn-outline" data-guide-step="-1"${activeIndex === 0 ? " disabled" : ""}>上一章</button>
        <span aria-live="polite">${activeIndex + 1} / ${sections.length}</span>
        <button type="button" class="btn-primary" data-guide-step="1"${activeIndex === sections.length - 1 ? " disabled" : ""}>下一章</button>
      </div>
      <section class="v60-guide-section card" id="guide-panel" role="tabpanel" tabindex="0" aria-labelledby="guide-tab-${section.key}" data-guide-section="${section.key}">
        <header><span>${String(activeIndex + 1).padStart(2, "0")}</span><h2>${section.title}</h2></header>
        <div class="v60-guide-section-body">${section.html}</div>
      </section>
      <div class="btnrow"><button id="btn-tut-back" class="btn-outline">返回</button></div>
    </div>`;
  app.querySelectorAll("[data-guide-page]").forEach(button => {
    button.onclick = () => { UI.tutorialPage = Number(button.dataset.guidePage); render(); };
    button.onkeydown = event => {
      const last = sections.length - 1;
      let nextIndex = activeIndex;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (activeIndex + 1) % sections.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (activeIndex + last) % sections.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = last;
      else return;
      event.preventDefault();
      UI.tutorialPage = nextIndex;
      render();
      const nextTab = document.getElementById(`guide-tab-${sections[nextIndex].key}`);
      if (nextTab) nextTab.focus();
    };
  });
  app.querySelectorAll("[data-guide-step]").forEach(button => {
    button.onclick = () => { UI.tutorialPage = activeIndex + Number(button.dataset.guideStep); render(); };
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
      <section class="v60-visual-scene v60-compact-scene v60-offseason-scene" aria-label="從球團規劃、名單到春訓的開季準備場景">
        <div class="v60-visual-scene-art"><img src="visual_assets/v60/offseason_planning_r040.jpg" alt="球團辦公室、票務與行銷空間通往春訓球場" loading="lazy" decoding="async"></div>
        <div class="v60-visual-scene-copy"><span class="v60-visual-kicker">開季準備</span><strong>從規劃走到球場</strong><span>完成一項就前往下一站；完成春訓後開季。</span></div>
      </section>
      ${!S.gameStarted ? `
      <div class="card">
        <div class="eyebrow">${icon('book')} 第一次接手球團？</div>
        <p class="sub dark">新手教學可隨時從主控台進入。</p>
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
        <p class="draftnote muted">詳細收支與票價：財務頁。</p>
      </div>` : ""}
      <div class="card">
        <div class="eyebrow">${S.teams[S.userTeamId].name} 本季退休名單</div>
        ${myRetired.length === 0 ? `<p class="sub dark">本季你的球隊沒有球員退休。</p>` : `
        <p class="sub dark">共 ${myRetired.length} 位退休（1軍 ${my1}／2軍 ${my2}）；可留任或轉任教練。</p>`}
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
        <p class="sub dark">選秀前可拜訪事務所；每種類型每年一次。</p>
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
       ${v60VisualMetricRail([["快訊", "0 則"], ["狀態", "等待事件"]], "新聞摘要")}
       <p class="v60-state-line">賽事、傷兵與聯盟事件發生後會在這裡出現。</p>
    </div>`;
  }
  const show = feed.slice(0, UI.newsExpanded ? 15 : 5);
  const typeIcon = { "戰報": "⚾", "傷兵": "🩹", "里程碑": "🏅", "國際賽": "🌐", "春訓": "🌸", "贊助": "🤝", "訓練": "🧢", "高層": "🏛️" };
  // v29真・跑馬燈：取最新8則串成一條，水平無縫循環捲動（內容複製兩份製造無限循環；長度越長捲越久）
  const tickerItems = feed.slice(0, 8).map(n => `<span class="tickeritem">${typeIcon[n.type] || "📰"} ${n.text}</span>`).join("<span class=\"tickersep\">◆</span>");
  const tickerDur = clamp(feed.slice(0, 8).reduce((s, n) => s + n.text.length, 0) * 0.55, 18, 90);
  return `<div class="card newscard">
     <div class="eyebrow">聯盟快訊</div>
     ${v60CompatVisualScene("newsroom_v58", "新聞編輯室場景", "NEWSROOM VISUAL", "新聞與賽場資訊", "完整新聞內容與既有展開操作保留在下方。", "v60-news-scene")}
     <div class="tickerwrap" aria-label="新聞跑馬燈"><div class="tickertrack" style="animation-duration:${tickerDur}s;">${tickerItems}<span class="tickersep">◆</span>${tickerItems}<span class="tickersep">◆</span></div></div>
    ${show.map(n => `<p class="newsitem"><span class="newstime">${n.dateLabel}</span>${typeIcon[n.type] || "📰"} ${n.text}</p>`).join("")}
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
const V60_SPRING_POSITION_TABS = [
  { key: "all", label: "全部" },
  { key: "P", label: "投手" },
  { key: "C", label: "捕手" },
  { key: "IF", label: "內野" },
  { key: "OF", label: "外野" }
];
function v60SpringPositionGroup(p) {
  if (p && p.isPitcher) return "P";
  const primary = p && p.positions && p.positions[0] ? p.positions[0].pos : "";
  if (primary === "C") return "C";
  if (["1B", "2B", "3B", "SS", "DH"].includes(primary)) return "IF";
  if (["LF", "CF", "RF"].includes(primary)) return "OF";
  return "IF";
}
function v60SpringPositionTabs(players, activeKey) {
  const counts = { all: players.length, P: 0, C: 0, IF: 0, OF: 0 };
  players.forEach(p => { counts[v60SpringPositionGroup(p)] += 1; });
  return `<div class="pos-filter-bar spring-position-tabs" role="tablist" aria-label="春訓守位分頁">${V60_SPRING_POSITION_TABS.map(t => `<button type="button" class="pos-filter-btn ${activeKey === t.key ? "active" : ""}" data-spring-position="${t.key}" role="tab" aria-selected="${activeKey === t.key ? "true" : "false"}">${t.label}<span class="pos-count">${counts[t.key]}人</span></button>`).join("")}</div>`;
}
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
  const springPositionKey = V60_SPRING_POSITION_TABS.some(t => t.key === UI.springPositionTab) ? UI.springPositionTab : "all";
  UI.springPositionTab = springPositionKey;
  const visiblePlayers = springPositionKey === "all" ? players : players.filter(p => v60SpringPositionGroup(p) === springPositionKey);
  const springPositionLabel = V60_SPRING_POSITION_TABS.find(t => t.key === springPositionKey).label;
  const springPageKey = `${S.seasonYear}:${UI.springTab}:${springPositionKey}`;
  if (UI.springPageKey !== springPageKey) { UI.springPageKey = springPageKey; UI.springPage = 0; }
  const springPages = Math.max(1, Math.ceil(visiblePlayers.length / 6));
  UI.springPage = Math.min(Math.max(0, UI.springPage || 0), springPages - 1);
  const pagePlayers = visiblePlayers.slice(UI.springPage * 6, UI.springPage * 6 + 6);
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
      ${v60CompatVisualScene("spring_training_base_v58", "春訓基地場景", "SPRING TRAINING VISUAL", "春訓基地", "地點與訓練配置", "v60-spring-scene")}
      <div class="card">
        <div class="eyebrow">春訓地點</div>
        <select id="spring-nation" class="sortselect" style="width:100%;">
          ${gradeNations.map(({ g, list }) => `<optgroup label="${g}級國家（${g === "S" ? "頂級棒球強權" : g === "A" ? "一線強國" : g === "B" ? "中堅棒球國" : g === "C" ? "新興棒球國" : "萌芽中"}・${list[0] ? (springCostForNation(list[0]) === 0 ? "" : NATION_SPRING_COST_WAN[g] + "萬") : ""}）">
            ${list.map(n => `<option value="${n.name}" ${camp.nation === n.name ? "selected" : ""}>${n.name}${n.name === HOME_NATION_NAME ? "（母國・免費）" : `（${springCostForNation(n)}萬）`}</option>`).join("")}
          </optgroup>`).join("")}
        </select>
        ${v60VisualMetricRail([
          ["費用", cost === 0 ? "免費" : formatMoney(cost)],
          ["預算", formatMoney(team.finance.budget)],
          ["等級", `${nation.grade}級`],
          ["專長", specLabels]
        ], "春訓地點摘要")}
        <p class="v60-state-line">${nation.flavor}</p>
      </div>
      <div class="tabrow">
        <button class="tab ${UI.springTab === "1軍" ? "active" : ""}" data-tab="1軍">1軍（${team.roster1.length}人）</button>
        <button class="tab ${UI.springTab === "2軍" ? "active" : ""}" data-tab="2軍">2軍（${team.roster2.length}人）</button>
      </div>
      ${v60SpringPositionTabs(players, springPositionKey)}
      <div class="spring-list-context"><b>${UI.springTab}・${springPositionLabel}</b><span>現況／上限・${visiblePlayers.length}人</span></div>
      <div class="btnrow"><button id="btn-spring-auto" class="btn-secondary">AI一鍵建議（${UI.springTab}全員）</button></div>
      <nav class="v60-choice-pager" aria-label="春訓名單分頁"><button id="spring-prev" ${UI.springPage === 0 ? 'disabled' : ''}>上一頁</button><span>${UI.springPage + 1}/${springPages}</span><button id="spring-next" ${UI.springPage === springPages - 1 ? 'disabled' : ''}>下一頁</button></nav>
      <table class="stattable">
        <thead><tr><th>球員</th><th>訓練</th></tr></thead>
        <tbody>
          ${visiblePlayers.length === 0 ? `<tr><td colspan="2" class="spring-empty-state">此分類目前沒有球員</td></tr>` : pagePlayers.map(p => {
            const ovr = Math.round(trueOverall(p));
            return `<tr>
            <td><b>${p.name}</b><span class="v60-inline-meta">${p.isPitcher ? "投手" : "野手"}${hasTrait(p, "grinder") ? "・練習狂" : ""}・${p.age}歲</span><div class="v60-ability-track" role="img" aria-label="綜合能力${ovr}，天花板${Math.max(ovr,p.potential)}"><i style="width:${Math.max(0,Math.min(100,p.potential))}%"></i><b style="width:${Math.max(0,Math.min(100,ovr))}%"></b></div><small aria-label="綜合能力 ${ovr}／天花板 ${Math.max(ovr,p.potential)}">${ovr}／${Math.max(ovr,p.potential)}</small></td>
            <td><select class="sortselect spring-menu-select" aria-label="${p.name}訓練項目" data-id="${p.id}">
              ${springMenuFor(p).map(m => { const cur = menuAttrOf(p, m.key); const capped = cur >= p.potential; return `<option value="${m.key}" ${camp.assignments[p.id] === m.key ? "selected" : ""}>${m.label} ${cur}${nation.specialties.includes(m.key) ? '・專長' : ''}${capped ? '・滿' : ''}</option>`; }).join("")}
            </select></td>
          </tr>`;}).join("")}
        </tbody>
      </table>
      <div class="v60-training-limit"><span>單項上限</span><b>最多 +5</b><span>不超潛力</span></div>
      <div class="btnrow"><button id="btn-spring-go" class="btn-primary">確認出發春訓${cost > 0 ? `（支付 ${formatMoney(cost)}）` : "（母國・免費）"}</button></div>
    </div>`;
  document.getElementById("spring-nation").onchange = e => setSpringNation(e.target.value);
  app.querySelectorAll(".tab").forEach(btn => { btn.onclick = () => { UI.springTab = btn.dataset.tab; render(); }; });
  app.querySelectorAll("[data-spring-position]").forEach(btn => { btn.onclick = () => { UI.springPositionTab = btn.dataset.springPosition; render(); }; });
  document.getElementById("btn-spring-auto").onclick = () => springAutoAssign(UI.springTab);
  document.getElementById('spring-prev').onclick = () => { UI.springPage--; render(); };
  document.getElementById('spring-next').onclick = () => { UI.springPage++; render(); };
  app.querySelectorAll(".spring-menu-select").forEach(sel => { sel.onchange = e => setSpringAssignment(sel.dataset.id, e.target.value); });
  document.getElementById("btn-spring-go").onclick = () => {
    const missing = v60PreseasonMissingStep();
    if (missing) { UI.flash = "開季準備尚未完成，先處理目前項目。"; v60PreseasonOpenStep(missing); return; }
    UI.flash = null; executeSpringCamp();
  };
}

/* ---------- v25 春訓報告畫面 ---------- */
function renderSpringReport() {
  const camp = S.springCamp;
  if (!camp || !camp.report) { UI.screen = "dashboard"; render(); return; }
  const r = camp.report;
  UI.springReportTab = UI.springReportTab || "1軍";
  const allLines = Array.isArray(r.lines) ? r.lines : [];
  const lines = allLines.filter(l => l.level === UI.springReportTab);
  const page = v60RosterPageSlice(lines, "springReportPage", 6);
  const changesOf = line => Array.isArray(line.changes) ? line.changes : [];
  const gainKinds = [
    { key: "main", label: "主練", test: c => !c.linked && !c.traitSpill },
    { key: "linked", label: "連動", test: c => !!c.linked && !c.traitSpill },
    { key: "trait", label: "特性", test: c => !!c.traitSpill }
  ];
  const renderGains = line => {
    const changes = changesOf(line);
    if (!changes.length) return `<div class="v60-spring-report-stays">維持</div>`;
    return `<div class="v60-spring-report-groups">${gainKinds.map(kind => {
      const selected = changes.filter(kind.test);
      if (!selected.length) return "";
      return `<div class="v60-spring-report-group is-${kind.key}"><b>${kind.label}</b><div>${selected.map(c => {
        const from = Number(c.from), to = Number(c.to);
        const delta = Number.isFinite(from) && Number.isFinite(to) ? Math.max(0, Math.round(to - from)) : 0;
        const width = Math.min(100, delta * 20);
        const label = v60UiEscape(c.label || "能力");
        return `<span class="v60-spring-report-gain" role="img" aria-label="${kind.label} ${label} 增加 ${delta}"><span>${label}</span><i aria-hidden="true"><b style="width:${width}%"></b></i><strong>+${delta}</strong></span>`;
      }).join("")}</div></div>`;
    }).join("")}</div>`;
  };
  const desktopRows = page.items.map(line => {
    const changes = changesOf(line);
    const compactChanges = changes.length === 0 ? "維持" : changes.map(c => `${v60UiEscape(c.label || "能力")}+${Math.max(0, Number(c.to) - Number(c.from) || 0)}`).join("・");
    return `<tr><td><b>${v60UiEscape(line.name)}</b></td><td>${v60UiEscape(line.menu)}</td><td>${compactChanges}</td></tr>`;
  }).join("");
  const mobileCards = page.items.map(line => `<article class="v60-spring-report-player">
    <div class="v60-spring-report-player-head"><strong>${v60UiEscape(line.name)}</strong><span>${v60UiEscape(line.menu)}</span></div>
    ${renderGains(line)}
  </article>`).join("");
  const pager = v60RosterPagerHtml(page, "springReportPage", "春訓成果", lines.length);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName} ・ 第${S.seasonYear}年</div><h1>春訓成果報告</h1></div>
      ${v60CompatVisualScene("spring_training_base_v58", "春訓成果場景", "SPRING REPORT VISUAL", "春訓成果", "成果與特殊事件", "v60-spring-report-scene")}
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">春訓地點</div><div class="sb-value small">${r.nation}（${r.grade}級）</div></div>
        <div class="sb-row small"><div class="sb-label">花費</div><div class="sb-value small">${r.cost === 0 ? "免費（母國）" : formatMoney(r.cost)}</div></div>
      </div>
      ${v60VisualMetricRail([["1軍", `${allLines.filter(l => l.level === "1軍").length} 人`], ["2軍", `${allLines.filter(l => l.level === "2軍").length} 人`], ["事件", `${(r.events || []).length} 件`]], "春訓成果摘要")}
      ${r.events && r.events.length > 0 ? `
      <div class="card">
        <div class="eyebrow">春訓特殊事件</div>
        ${r.events.map(ev => `<p class="sub dark" style="margin:6px 0;">${["homesick", "overtrain"].includes(ev.type) ? ""+icon('warn')+"" : ""+icon('sparkle')+""} ${ev.text}</p>`).join("")}
      </div>` : ""}
      <div class="tabrow">
        <button class="tab ${UI.springReportTab === "1軍" ? "active" : ""}" data-tab="1軍">1軍成果</button>
        <button class="tab ${UI.springReportTab === "2軍" ? "active" : ""}" data-tab="2軍">2軍成果</button>
      </div>
      ${pager}
      <table class="stattable v60-spring-report-table">
        <thead><tr><th>球員</th><th>春訓項目</th><th>成效</th></tr></thead>
        <tbody>${desktopRows || `<tr><td colspan="3" class="spring-empty-state">目前沒有成果</td></tr>`}</tbody>
      </table>
      <div class="v60-spring-report-cards" aria-label="${UI.springReportTab}春訓成果">
        ${mobileCards || `<div class="spring-empty-state">目前沒有成果</div>`}
      </div>
      ${pager}
      ${v60VisualMetricRail([["主練", "主要提升"], ["連動", "相關能力"], ["特性", "額外提升"]], "春訓成果判定")}
      <div class="btnrow"><button id="btn-spring-done" class="btn-primary">春訓結束，迎接開幕戰！</button></div>
    </div>`;
  app.querySelectorAll(".tab").forEach(btn => { btn.onclick = () => { UI.springReportPage = 0; UI.springReportTab = btn.dataset.tab; render(); }; });
  wireV60RosterPager();
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
        <p class="sub dark">自主訓練成長 <b>${r.selfTrained}</b> 人</p>
      </div>
      ${r.newSkills.length > 0 ? `<div class="card"><div class="eyebrow">${icon('medal')} 領悟稱號/特殊技</div>
        <ul class="issuelist" style="color:var(--ink);">${r.newSkills.map(x => `<li><b>${x.name}</b> 領悟了「${icon('star-solid')}${x.skill}」</li>`).join("")}</ul></div>` : ""}
      ${r.newTraits.length > 0 ? `<div class="card"><div class="eyebrow">${icon('sparkle')} 磨練出新特質</div>
        <ul class="issuelist" style="color:var(--ink);">${r.newTraits.map(x => `<li><b>${x.name}</b> 練出了「${x.trait}」</li>`).join("")}</ul></div>` : ""}
      ${r.inheritance ? `<div class="card" style="border:1px solid var(--green-text);"><div class="eyebrow">${icon('grad')} 世代傳承</div>
        <p class="sub dark">老將 <b>${r.inheritance.seniorName}</b> 將畢生絕技「<b>${r.inheritance.item}</b>」傳授給新星 <b>${r.inheritance.juniorName}</b>！${r.inheritance.type === "skill" ? "後輩獲得該稱號並小幅提升對應能力。" : "後輩習得此後天特質。"}</p></div>`
        : `<div class="card"><div class="eyebrow">${icon('grad')} 世代傳承</div><p class="v60-state-line">本季未發生</p></div>`}
      ${r.aiInheritCount > 0 ? `<p class="draftnote muted">本季全聯盟另有 ${r.aiInheritCount} 支球隊發生了世代傳承。</p>` : ""}
      <div class="btnrow"><button id="btn-selftrain-done" class="btn-primary">繼續開季準備</button></div>
    </div>`;
  document.getElementById("btn-selftrain-done").onclick = () => v60PreseasonGoNext();
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
  const previewGroup = UI.intlPreviewGroup === "batters" ? "batters" : "pitchers";
  const previewList = previewGroup === "pitchers" ? pitchers : batters;
  const previewPage = v60RosterPageSlice(previewList, "intlPreviewPage", 6);
  const rowOf = p => {
    const tm = S.teams[p.team];
    const mine = p.team === S.userTeamId;
    const posTxt = p.isPitcher ? `投手・${p.role}` : (p.positions || []).map(x => intlPosLabel(x.pos)).join("/");
    return `<div class="v60-intl-preview-player" data-player-id="${p.id}"><div><b>${p.name}</b>${mine ? `<span class="benchrole-tag">本隊</span>` : ""}<small>${tm ? tm.name : "-"}・${p.age}歲</small></div><span>${posTxt}</span><strong aria-label="綜合能力">${Math.round(trueOverall(p))}</strong></div>`;
  };
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">第${t.year}年（${GAME_EPOCH_YEAR + t.year}年）・4年一度</div><h1>世界棒球錦標賽</h1></div>
      <div class="card">
        <div class="v60-intl-preview-hero"><img src="visual_assets/v60/national_team_roster_r039.jpg" alt="藍白代表隊休息室、排陣桌與球場" width="1254" height="1254" loading="lazy" decoding="async"><div><div class="eyebrow">${HOME_NATION_NAME}代表隊・教練推薦</div><div class="v60-rule-chip-row" aria-label="名單與賽事影響"><span>${pitchers.length} 投手／${batters.length} 野手</span><span>本隊入選 ${mineList.length} 人</span><span>國手成長抗壓・賽果影響人氣／明年收入</span></div></div></div>
        <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
          <button id="btn-intl-go" class="btn-primary">確定名單，進入排陣</button>
          <button id="btn-intl-manual" class="btn-outline">進階：手動調整名單</button>
        </div>
      </div>
      <div class="v60-intl-preview-tabs" role="tablist" aria-label="代表隊守位分組"><button type="button" class="${previewGroup === "pitchers" ? "btn-primary" : "btn-outline"}" data-intl-preview-group="pitchers" role="tab" aria-selected="${previewGroup === "pitchers"}">投手 ${pitchers.length}</button><button type="button" class="${previewGroup === "batters" ? "btn-primary" : "btn-outline"}" data-intl-preview-group="batters" role="tab" aria-selected="${previewGroup === "batters"}">野手 ${batters.length}</button></div>
      ${v60RosterPagerHtml(previewPage, "intlPreviewPage", "代表隊" + (previewGroup === "pitchers" ? "投手" : "野手"), previewList.length)}
      <div class="card v60-intl-preview-list" role="tabpanel" aria-label="${previewGroup === "pitchers" ? "投手" : "野手"}名單">${previewPage.items.map(rowOf).join("")}</div>
    </div>`;
  document.getElementById("btn-intl-go").onclick = () => {
    const r = intlAutoSelectSquad();
    UI.flash = r.msg; UI.intlPreview = null; render();
  };
  document.getElementById("btn-intl-manual").onclick = () => { UI.intlManual = true; UI.intlCandidatePage = 0; UI.intlSquad = ids.slice(); render(); };
  app.querySelectorAll("[data-intl-preview-group]").forEach(btn => { btn.onclick = () => { UI.intlPreviewGroup = btn.dataset.intlPreviewGroup; UI.intlPreviewPage = 0; render(); }; });
  wireV60RosterPager();
}
function renderIntlSquadStageManual(t) {
  const picked = UI.intlSquad || [];
  const pool = intlCandidatePool().slice(0, 90); // v39①：候選 60→90（名單擴編為30人）
  const intlPage = v60RosterPageSlice(pool, "intlCandidatePage", 12);
  const pit = picked.map(id => S.players[id]).filter(p => p && p.isPitcher).length;
  const cat = picked.map(id => S.players[id]).filter(p => p && !p.isPitcher && p.positions && p.positions.some(x => x.pos === "C")).length;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">第${t.year}年（${GAME_EPOCH_YEAR + t.year}年）・4年一度</div><h1>世界棒球錦標賽</h1></div>
      <div class="card">
        <div class="eyebrow">${icon('flag-home')} ${HOME_NATION_NAME}代表隊・召集名單</div>
        <div class="v60-rule-chip-row" aria-label="手動選人規則"><span>健康本土・不限球隊・排除傷兵</span></div>
        <p class="sub dark">目前：<b>${picked.length}／${INTL_SQUAD_SIZE}</b> 人・投手 <b>${pit}</b>／${INTL_SQUAD_MIN_PITCHERS}・捕手 <b>${cat}</b>／${INTL_SQUAD_MIN_CATCHERS}</p>
        <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
          <button id="btn-intl-auto" class="btn-secondary">自動推薦${INTL_SQUAD_SIZE}人</button>
          <button id="btn-intl-clear" class="btn-secondary">全部清空</button>
          <button id="btn-intl-squad-ok" class="btn-primary">確定名單，進入排陣</button>
        </div>
      </div>
      <div class="divlabel">候選名單・本土前90名</div>
      ${v60RosterPagerHtml(intlPage, "intlCandidatePage", "國手候選", pool.length)}
      ${intlPage.items.map(p => {
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
  intlPage.items.forEach(p => {
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
  wireV60RosterPager();
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
      <div class="card"><div class="v60-intl-preview-hero"><img src="visual_assets/v60/national_team_roster_r039.jpg" alt="代表隊休息室與排陣桌" width="1254" height="1254" loading="lazy" decoding="async"><div><div class="eyebrow">代表隊排陣</div><div class="v60-rule-chip-row" aria-label="排陣摘要"><span>${squad.length} 人・${pitchers.length} 投手／${batters.length} 野手</span><span>先發 9 棒・輪值最多 4 人</span></div></div></div></div>
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
    <div class="eyebrow">${canRun ? "開幕前・各一次" : "球季中・已鎖定"}・預算 ${formatMoney(team.finance.budget)}</div>
    <div class="v60-marketing-actions" aria-label="國際活動操作">
      <div class="v60-marketing-action-column">
        ${v60CompatVisualScene("international_exchange_v58", "國際交流場景", "EXCHANGE", "國際交流", "", "v60-compact-scene")}
        <select id="cd-exchange-nation" class="sortselect" ${canRun ? "" : "disabled"}>${natOpts}</select>
        <p id="cd-exchange-cost" class="v60-state-line"></p>
        <p class="v60-activity-outcome">士氣最高 +2・機會發掘新人</p>
        <div class="btnrow v60-sticky-actions"><button id="btn-cd-exchange" class="btn-secondary" ${st.exchangeDone || !canRun ? "disabled" : ""}>${st.exchangeDone ? "本季完成" : "執行交流"}</button></div>
      </div>
      <div class="v60-marketing-action-column">
        ${v60CompatVisualScene("overseas_marketing_v58", "海外行銷場景", "OVERSEAS", "海外行銷", "", "v60-compact-scene")}
        <select id="cd-marketing-nation" class="sortselect" ${canRun ? "" : "disabled"}>${natOpts}</select>
        <p id="cd-marketing-cost" class="v60-state-line"></p>
        <p class="v60-activity-outcome">成功率 70%・人氣 +1～3</p>
        <div class="btnrow v60-sticky-actions"><button id="btn-cd-marketing" class="btn-secondary" ${st.marketingDone || !canRun ? "disabled" : ""}>${st.marketingDone ? "本季完成" : "執行行銷"}</button></div>
      </div>
    </div>
    <div style="margin:6px 0;">${bondNames.length ? bondRows : `<p class="v59-compact-line">交情：尚未建立</p>`}</div>
  </div>`;
}

// 主控台和行銷頁共用相同操作接線，避免移動場景後按鈕只剩外觀。
function wireCdActivitiesActions() {
  ['exchange', 'marketing'].forEach(kind => {
    const select = document.getElementById(`cd-${kind}-nation`), label = document.getElementById(`cd-${kind}-cost`);
    if (!select || !label) return;
    const update = () => {
      const nation = nationByName(select.value);
      label.textContent = nation ? `投入 ${formatMoney(cdCostFor(nation, kind))}・${kind === 'marketing' ? '回收 0.5～2.2倍' : '人氣 +1～4'}` : '請選擇國家';
    };
    select.onchange = update; update();
  });
  const cdEx = document.getElementById("btn-cd-exchange");
  if (cdEx && !cdEx.disabled) cdEx.onclick = () => { const el = document.getElementById("cd-exchange-nation"); runCdExchange(el ? el.value : null); };
  const cdMk = document.getElementById("btn-cd-marketing");
  if (cdMk && !cdMk.disabled) cdMk.onclick = () => { const el = document.getElementById("cd-marketing-nation"); runCdMarketing(el ? el.value : null); };
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
        <p class="v60-state-line">降 1 階・達標信任獎勵½・仍未達再扣信任</p>
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
      <div class="btnrow">
        <button class="btn-primary rumor-intercept" data-rid="${r.id}" ${canAct && lv >= 1 ? "" : "disabled"}>插隊＋${Math.round(AI_TRADE_INTERCEPT_PREMIUM * 100)}%</button>
        <button class="btn-secondary rumor-persuade" data-rid="${r.id}" ${r.persuaded ? "disabled" : ""}>${r.persuaded ? "已慫恿過" : "慫恿・好感−1"}</button>
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
    <div class="eyebrow">${icon('phone')} ${ai.name}${ps ? `（${ps.name}）` : ""}主動提案・${daysLeft}天內回覆 <span class="afftag ${af.cls}">${af.text}</span></div>
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
  const agencyPage = v60RosterPageSlice(AGENT_KEYS, "agencyPage", 4);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>${icon('scout')} 代理人事務所</h1></div>
      <p class="v60-state-line" aria-label="代理人事務所規則">談成→交情↑／談崩→交情↓ · 好感高→談約更易 · 情蒐→談判桌</p>
      <div class="card">
        <div class="eyebrow">${icon('handshake')} GM人脈網</div>
        ${v60RosterPagerHtml(agencyPage, "agencyPage", "代理人", AGENT_KEYS.length, "類")}
        <div class="agencyrel-heading" aria-hidden="true"><span>門檻 %</span><span>談成 ×</span></div>
        <div class="agencyrel-grid">
        ${agencyPage.items.map(k => {
          const a = AGENT_TYPES[k];
          const rel = agentRel(k);
          const relL = agentRelLabel(rel);
          const perks = agentRelPerks(k);
          const threshold = rel > 0 ? `-${Math.round((1 - perks.reqMult) * 100)}%` : (rel < 0 ? `+${Math.round((perks.reqMult - 1) * 100)}%` : "±0%");
          const chance = `×${perks.slopeMult.toFixed(2)}`;
          const canWine = (typeof canWineAgent === "function") && canWineAgent(k);
          const winedThisYear = S.agency.wined && S.agency.wined[k] === S.seasonYear;
          return `<div class="agencyrel-row" aria-label="${a.name}：交情${rel > 0 ? "+" : ""}${rel}；談約門檻${threshold}；談成倍率${chance}">
            <div class="agencyrel-name"><strong>${a.name}</strong><span class="afftag ${relL.cls}">${relL.text}（${rel > 0 ? "+" : ""}${rel}）</span></div>
            <div class="agencyrel-metrics"><div class="agencyrel-metric" aria-label="談約門檻${threshold}">${threshold}</div>
            <div class="agencyrel-metric" aria-label="談成倍率${chance}">${chance}</div></div>
            <button class="btn-outline wine-btn" data-type="${k}" ${canWine ? "" : "disabled"}>${winedThisYear ? "本年已應酬" : `應酬・${Math.round(agentWineCost(k) / 10000)}萬`}</button>
          </div>`;
        }).join("")}
        </div>
        <p class="v60-state-line" aria-label="經紀人應酬與人脈規則">應酬每類型每季1次 · 成功70%好感+1 · 大失敗10%好感-1 · 交好≥4情報 · 莫逆10引薦</p>
      </div>
      ${renderAgencyPerkCards()}
      <div class="card">
        <div class="eyebrow">${icon('clipboard')} 本季已情蒐（${scoutedPlayers.length}）</div>
        ${scoutedPlayers.length > 0 ? scoutedPlayers.map(p => {
          ensureAgent(p);
          const a = AGENT_TYPES[p.agent.type];
          return `<p class="sub dark">${p.name}｜經紀人 ${p.agent.name}（${a.name}）｜期望 ${p.negoDesired ? formatMoney(p.negoDesired.salary) + "／" + p.negoDesired.years + "年" : "談判時揭露"}</p>`;
        }).join("") : `<p class="v60-state-line" aria-label="本季情蒐狀態">尚無情蒐 · 談判→委託（查性格／底線）</p>`}
      </div>
      <div class="btnrow"><button id="btn-agency-back" class="btn-outline">返回</button></div>
    </div>`;
  document.getElementById("btn-agency-back").onclick = () => { const back = UI.agencyReturn || "dashboard"; UI.agencyReturn = null; UI.screen = back; render(); };
  app.querySelectorAll(".wine-btn").forEach(b => {
    b.onclick = () => wineAndDineAgent(b.dataset.type);
  });
  wireV60RosterPager();
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
        ${v60CompatVisualScene("mailroom_v58", "郵件中樞場景", "MAILROOM VISUAL", "郵件中樞", "聯盟訊息與待辦入口", "v60-mail-scene")}
        ${v60VisualMetricRail([["收件匣", "0 封"], ["狀態", "已清空"]], "郵件摘要")}
        <p class="v59-compact-line">目前沒有郵件</p>
        <p class="v60-state-line">新提案、傷兵與聯盟通知會在這裡出現。</p></div>`;
    }
    const open = UI.v43MailOpen || null;
    return `<div class="card">
      <div class="eyebrow">${icon('mail')} 郵件中樞（${mail.filter(m => m.unread).length} 封未讀 / 共 ${mail.length} 封）</div>
      ${v60CompatVisualScene("mailroom_v58", "郵件中樞場景", "MAILROOM VISUAL", "郵件中樞", "聯盟訊息與待辦入口", "v60-mail-scene")}
      ${v60VisualMetricRail([["未讀", `${mail.filter(m => m.unread).length} 封`], ["全部", `${mail.length} 封`], ["操作", "逐封處理"]], "郵件摘要")}
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
    if (m.meta.kind === "rosterSwapProposal") {
      const pr = (S.v43.rosterSwapProposals || []).find(x => x.id === m.meta.refId);
      if (!pr || pr.status !== "open") return `<p class="draftnote muted">（此換位提案已處理或失效）</p>`;
      return v60CoachRosterSwapCardHtml(pr);
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
      <div class="v60-roster-swap-grid">
        ${v60RosterSwapMiniCardHtml(pick, pick.level === "2軍" ? "二軍 → 一軍" : "人選已變動・請換人", "up")}
        <span class="v60-roster-swap-arrow" aria-hidden="true">⇄</span>
        ${v60RosterSwapMiniCardHtml(injured, injured && injured.level === "2軍" ? "傷兵已在二軍" : "傷兵 → 二軍", "down")}
      </div>
      <p class="draftnote">${injured && injured.injury ? `傷停 ${injured.injury.daysLeft || 0} 天・` : ""}${injured && injured.level === "2軍" ? "批准後補上一軍空缺" : "批准後一升一降"}；人選已變動時不執行。</p>
      <div class="btnrow">
        <button class="btn-primary v43-injprop-approve" data-ipid="${pr.id}">批准並自動換位</button>
        <button class="btn-secondary v60-injury-choose" data-ipid="${pr.id}">自己選人</button>
        <button class="btn-secondary v43-injprop-next" data-ipid="${pr.id}">要教練換人選</button>
        <button class="btn-outline v43-injprop-dismiss" data-ipid="${pr.id}">先擱置</button>
      </div>
    </div>`;
  } catch (_) { return ""; }
}
function v60RenderInjuryChoice() {
  const choice = UI.injuryChoice;
  const team = S.teams[S.userTeamId];
  const proposal = choice && (S.v43.injuryProposals || []).find(p => p.id === choice.id && p.status === 'open');
  if (!proposal) { UI.injuryChoice = null; render(); return; }
  const all = v60ManualInjuryCandidates(team);
  const list = choice.group === 'all' ? all : all.filter(p => v60SpringPositionGroup(p) === choice.group);
  const pages = Math.max(1, Math.ceil(list.length / 4));
  choice.page = Math.min(Math.max(0, choice.page), pages - 1);
  const selected = all.find(p => p.id === choice.selected);
  const injured = S.players[proposal.injuredId];
  app.innerHTML = `<div class="wrap v60-injury-picker">
    <h1>自選遞補</h1><p>健康二軍 ${all.length} 人・自選不增減教練信任</p>
    ${v60SpringPositionTabs(all, choice.group)}
    <div class="v60-choice-list">${list.slice(choice.page * 4, choice.page * 4 + 4).map(p => `<div class="card ${p.id === choice.selected ? 'dealchosen' : ''}">${v60RosterSwapMiniCardHtml(p, '可上一軍', 'up')}<button class="btn-secondary" data-injury-select="${p.id}" aria-pressed="${p.id === choice.selected}">${p.id === choice.selected ? '已選擇' : '選擇'}</button></div>`).join('') || '<p>此位置沒有健康二軍人選</p>'}</div>
    <nav class="v60-choice-pager" aria-label="遞補名單分頁"><button id="inj-prev" ${choice.page === 0 ? 'disabled' : ''}>上一頁</button><span>${choice.page + 1}/${pages}</span><button id="inj-next" ${choice.page === pages - 1 ? 'disabled' : ''}>下一頁</button></nav>
    ${selected ? `<section class="card" aria-label="升降確認"><h2>確認換位</h2><div class="v60-roster-swap-grid">${v60RosterSwapMiniCardHtml(selected, '二軍 → 一軍', 'up')}<span aria-hidden="true">⇄</span>${v60RosterSwapMiniCardHtml(injured, injured.level === '2軍' ? '留二軍養傷' : '一軍 → 二軍', 'down')}</div></section>` : ''}
    <div class="btnrow v60-sticky-actions"><button id="inj-confirm" class="btn-primary" ${selected ? '' : 'disabled'}>確認遞補</button><button id="inj-cancel" class="btn-outline">取消自選</button></div>
  </div>`;
  const redraw = () => v60RenderInjuryChoice();
  app.querySelectorAll('[data-spring-position]').forEach(b => { b.onclick = () => { choice.group = b.dataset.springPosition; choice.page = 0; redraw(); }; });
  app.querySelectorAll('[data-injury-select]').forEach(b => { b.onclick = () => { choice.selected = b.dataset.injurySelect; redraw(); app.querySelector('[aria-label="升降確認"]').scrollIntoView({block:'center'}); document.getElementById('inj-confirm').focus({ preventScroll: true }); }; });
  app.querySelectorAll('.v60-swap-player-detail').forEach(b => { b.onclick = () => { UI.injuryChoiceReturn = true; UI.playerDetailReturn = UI.screen; UI.selectedPlayerId = b.dataset.playerId; UI.screen = 'playerDetail'; render(); }; });
  document.getElementById('inj-prev').onclick = () => { choice.page--; redraw(); };
  document.getElementById('inj-next').onclick = () => { choice.page++; redraw(); };
  document.getElementById('inj-cancel').onclick = () => { UI.injuryChoice = null; render(); };
  document.getElementById('inj-confirm').onclick = () => {
    const result = v43ResolveInjuryProposal(choice.id, 'manual', choice.selected);
    UI.injuryChoice = null; UI.flash = result.msg; render();
  };
}
function renderInjuryProposalCards() {
  try {
    ensureV43State();
    const open = (S.v43.injuryProposals || []).filter(p => p.status === "open");
    const team = S.teams[S.userTeamId], seen = new Set();
    const recovery = (S.v43.injuryProposals || []).filter(pr => {
      if (!v60CanReopenInjuryProposal(pr, team) || seen.has(pr.injuredId)) return false;
      seen.add(pr.injuredId); return true;
    }).map(pr => `<div class="card issuecard"><p class="sub dark">${S.players[pr.injuredId].name}仍在二軍養傷，一軍尚有空位。</p><button class="btn-secondary v43-injprop-reopen" data-ipid="${pr.id}">請教練重提遞補</button></div>`).join("");
    return open.map(p => v43InjuryProposalCardHtml(p)).join("") + recovery;
  } catch (_) { return ""; }
}

/* ---------- v60-005 健康球員換位提案卡 ---------- */
function v60RosterSwapMiniCardHtml(p, label, tone) {
  if (!p) return "";
  const overall = (typeof trueOverall === "function") ? Math.round(trueOverall(p)) : "—";
  return `<div class="v60-roster-swap-player ${tone || ""}">
    <span class="v60-roster-swap-label">${label}</span>
    ${typeof themePlayerPhoto === "function" ? themePlayerPhoto(p.id, { player: p, teamId: S.userTeamId, isAway: false }) : ""}
    <button class="v60-swap-player-detail" data-player-id="${p.id}" aria-label="查看 ${p.name} 完整資料">${p.name}</button>
    <span>${v60RosterSwapRoleLabel(p)}・${p.age || "—"}歲・綜合 ${overall}</span>
  </div>`;
}
function v60CoachRosterSwapCardHtml(pr) {
  try {
    const incoming = S.players[pr.incomingId];
    const outgoing = S.players[(pr.outgoingIds || [])[pr.pickIndex || 0]];
    if (!incoming || !outgoing) return "";
    const coach = pr.coachId ? S.coaches[pr.coachId] : null;
    return `<div class="card issuecard v60-roster-swap-card">
      <div class="eyebrow">${coach ? coach.name : "教練團"}・健康換位</div>
      <p class="v60-state-line">一軍 ${S.teams[S.userTeamId].roster1.length}/28・批准後一升一降</p>
      <div class="v60-roster-swap-grid">
        ${v60RosterSwapMiniCardHtml(incoming, "升上一軍", "up")}
        <span class="v60-roster-swap-arrow">⇄</span>
        ${v60RosterSwapMiniCardHtml(outgoing, "下放二軍", "down")}
      </div>
      <p class="draftnote muted">${pr.reason || "批准後會同時完成升降；受傷球員仍走醫療室遞補流程。"}</p>
      <div class="btnrow">
        <button class="btn-primary v60-roster-swap-approve" data-rsid="${pr.id}">批准並完成換位</button>
        <button class="btn-secondary v60-roster-swap-next" data-rsid="${pr.id}">要教練換下放人選</button>
        <button class="btn-outline v60-roster-swap-defer" data-rsid="${pr.id}">先擱置</button>
      </div>
    </div>`;
  } catch (_) { return ""; }
}
function renderCoachRosterSwapCards() {
  try {
    ensureV43State();
    const open = (S.v43.rosterSwapProposals || []).filter(p => p.status === "open");
    return open.map(v60CoachRosterSwapCardHtml).join("");
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
      <div class="eyebrow">${icon('phone')} ${ai.name}${ps ? `（${ps.name}）` : ""}主動提案・${daysLeft}天內回覆 <span class="afftag ${af.cls}">${af.text}</span></div>
      <div class="divlabel">對方送出（交易球探評估值・完整資料）</div>
      ${inP.map(p => v43PlayerFullCardHtml(p, { scoutView: scoutCache[p.id] || {} })).join("")}
      <div class="divlabel">你送出（自家球員・真實資料）</div>
      ${outP.map(p => v43PlayerFullCardHtml(p, null)).join("")}
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">對方送出總值</div><div class="sb-value small">${inVal.toFixed(1)}</div></div>
        <div class="sb-row small"><div class="sb-label">你送出總值</div><div class="sb-value small">${outVal.toFixed(1)}</div></div>
      </div>
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
    app.querySelectorAll('.v60-injury-choose').forEach(b => { b.onclick = () => { UI.injuryChoice = { id: b.dataset.ipid, group: 'all', page: 0, selected: null }; v60RenderInjuryChoice(); }; });
    app.querySelectorAll(".v43-injprop-reopen").forEach(b => { b.onclick = () => { const r = v43ResolveInjuryProposal(b.dataset.ipid, "reopen"); UI.flash = r.msg; render(); }; });
    app.querySelectorAll(".v60-swap-player-detail").forEach(b => { b.onclick = () => { UI.selectedPlayerId = b.dataset.playerId; UI.playerDetailReturn = UI.screen; UI.screen = "playerDetail"; render(); }; });
    app.querySelectorAll(".v43-injprop-next").forEach(b => { b.onclick = () => { const r = v43ResolveInjuryProposal(b.dataset.ipid, "next"); UI.flash = r.msg; render(); }; });
    app.querySelectorAll(".v43-injprop-dismiss").forEach(b => { b.onclick = () => { const r = v43ResolveInjuryProposal(b.dataset.ipid, "dismiss"); UI.flash = r.msg; render(); }; });
    // v60-005：健康球員換位提案（批准才同時升降；換人只改提案，不改名單）
    app.querySelectorAll(".v60-roster-swap-approve").forEach(b => { b.onclick = () => { const r = v60ResolveCoachRosterSwapProposal(b.dataset.rsid, "approve"); UI.flash = r.msg; render(); }; });
    app.querySelectorAll(".v60-roster-swap-next").forEach(b => { b.onclick = () => { const r = v60ResolveCoachRosterSwapProposal(b.dataset.rsid, "next"); UI.flash = r.msg; render(); }; });
    app.querySelectorAll(".v60-roster-swap-defer").forEach(b => { b.onclick = () => { const r = v60ResolveCoachRosterSwapProposal(b.dataset.rsid, "defer"); UI.flash = r.msg; render(); }; });
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
