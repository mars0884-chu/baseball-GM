/* ====== v55 位置篩選分頁 ======
   共用於選秀、自由球員、國際市場等球員清單畫面。
   分組：全部 / 投手 / 捕手 / 內野 / 外野 */
var POS_FILTER_GROUPS = [
  { key: "all",   label: "全部" },
  { key: "P",     label: "投手" },
  { key: "C",     label: "捕手" },
  { key: "IF",    label: "內野" },
  { key: "OF",    label: "外野" }
];
function posFilterGroup(p) {
  if (p.isPitcher) return "P";
  var pos = (p.positions && p.positions[0]) ? p.positions[0].pos : "";
  if (pos === "C") return "C";
  if (["1B","2B","3B","SS"].includes(pos)) return "IF";
  if (["LF","CF","RF"].includes(pos)) return "OF";
  return "IF"; // DH 等罕見情況歸內野
}
function posFilterBarHtml(players, uiKey) {
  var current = UI[uiKey] || "all";
  var counts = { all: players.length, P: 0, C: 0, IF: 0, OF: 0 };
  for (var i = 0; i < players.length; i++) counts[posFilterGroup(players[i])]++;
  return '<div class="pos-filter-bar">' + POS_FILTER_GROUPS.map(function(g) {
    return '<button class="pos-filter-btn' + (current === g.key ? ' active' : '') + '" data-filterkey="' + uiKey + '" data-filterval="' + g.key + '">' + g.label + '<span class="pos-count">' + counts[g.key] + '</span></button>';
  }).join('') + '</div>';
}
function applyPosFilter(players, uiKey) {
  var f = UI[uiKey] || "all";
  if (f === "all") return players;
  return players.filter(function(p) { return posFilterGroup(p) === f; });
}
function wirePosFilterButtons() {
  app.querySelectorAll(".pos-filter-btn").forEach(function(btn) {
    btn.onclick = function() {
      UI[btn.dataset.filterkey] = btn.dataset.filterval;
      render();
    };
  });
}

function nameWithDutyTag(p) {
  const natFlag = (p.foreign && typeof v53NationFlagByName === "function") ? v53NationFlagByName(p.nationality, 16) : "";
  const nat = p.foreign ? `<span class="nationtag">${natFlag}${p.nationality}</span>` : "";
  const train = p.midTraining ? `<span class="traintag" title="季中特訓中">${icon('training')}</span>` : ""; // v26特訓標記
  const cap = (p.team && S.teams[p.team] && S.teams[p.team].captainId === p.id) ? `<span class="captag" title="隊長">Ⓒ隊長</span>` : ""; // v37④隊長標記
  if (isInjured(p)) {
    if (p.injury.pendingSurgery) return `${p.name}${cap}${nat}<br><span class="injurytag">${icon('medical')}${p.injury.name}・待決定治療方針</span>`;
    return `${p.name}${cap}${nat}<br><span class="injurytag">${icon('bandage')}${p.injury.name}・剩${p.injury.daysLeft}天</span>`;
  }
  return `${p.name}${cap}${train}${nat}`;
}
// v26傷病體質標籤：中重度傷病史≥2筆時顯示（球員詳情與球探視角共用）
function injuryProneTagHtml(p) {
  const sig = (p.injuryHistory || []).filter(h => h.severity !== "light").length;
  return sig >= 2 ? `<span class="pronetag" title="中重度傷病史 ${sig} 筆">${icon('warn')}傷病體質</span>` : "";
}
function renderRosterNav(active) {
  const team = S.teams[S.userTeamId];
  const tabs = [
    { key: "roster1", label: `1軍名單（${team.roster1.length}）`, screen: "roster", rosterTab: "1軍" },
    { key: "roster2", label: `2軍名單（${team.roster2.length}）`, screen: "roster", rosterTab: "2軍" },
    { key: "rosterDev", label: `育成（${(team.rosterDev||[]).length}）`, screen: "roster", rosterTab: "育成" },
    { key: "lineup", label: "先發打線", screen: "lineup", rosterTab: "" },
    { key: "rotation", label: "投手輪值/牛棚", screen: "rotation", rosterTab: "" },
    { key: "listing", label: "掛牌交易市場", screen: "listing", rosterTab: "" },
    { key: "coaches", label: "教練團", screen: "coaches", rosterTab: "" },
    { key: "scouts", label: "球探室", screen: "scouts", rosterTab: "" },
    { key: "freeAgents", label: "自由球員市場", screen: "freeAgents", rosterTab: "" },
    { key: "internationalMarket", label: "國際球員市場", screen: "internationalMarket", rosterTab: "" },
    { key: "finance", label: "財務", screen: "finance", rosterTab: "" },
    { key: "marketing", label: "行銷企劃", screen: "marketing", rosterTab: "" },
    { key: "facilities", label: "球場硬體建設", screen: "facilities", rosterTab: "" },
    { key: "hallOfFame", label: `${icon('hof')} 榮譽殿堂`, screen: "hallOfFame", rosterTab: "" }
  ];
  const current = tabs.find(t => t.key === active) || tabs[0];
  return `<details class="v59-nav-fold" data-v59-text-density="1"><summary class="v59-nav-current">${current.label}</summary><div class="tabrow v59-nav-options" style="flex-wrap:wrap;">${tabs.map(t => `<button class="tab navtab ${active === t.key ? "active" : ""}" data-screen="${t.screen}" data-rostertab="${t.rosterTab}" style="flex:1 1 30%;min-width:90px;margin-bottom:6px;">${t.label}</button>`).join("")}</div></details>`;
}
function wireRosterNav() {
  document.querySelectorAll(".navtab").forEach(btn => {
    btn.onclick = () => {
      UI.screen = btn.dataset.screen;
      if (btn.dataset.rostertab) UI.rosterTab = btn.dataset.rostertab;
      UI.lineupPicker = null; UI.rotationPicker = null; UI.coachPicker = null; UI.scoutPicker = null; UI.scoutCandidates = null; UI.flash = null;
      render();
    };
  });
}

function ensureLineup(team) {
  if (!team.lineup || team.lineup.length < 5) team.lineup = autoLineup(team, S.players);
  dedupeLineupPositions(team);
}
function ensureRotation(team) {
  if (!team.rotation || team.rotation.length === 0) team.rotation = autoRotation(team, S.players);
}
function ensureBullpenOrder(team, players) {
  team.bullpenOrder = team.bullpenOrder || {};
  ["中繼", "布局", "終結"].forEach(role => {
    const isFirstInit = team.bullpenOrder[role] === undefined;
    const current = (team.bullpenOrder[role] || []).filter(id => team.roster1.includes(id) && players[id] && players[id].isPitcher && players[id].role === role);
    // 玩家球隊：只在「第一次初始化」時自動補人，之後尊重玩家手動新增/移除的名單；AI球隊：持續自動補滿確保可運作
    if (isFirstInit || !team.isUser) {
      const missing = team.roster1.map(id => players[id]).filter(p => p && p.isPitcher && p.role === role && !current.includes(p.id))
        .sort((a, b) => trueOverall(b) - trueOverall(a)).map(p => p.id);
      team.bullpenOrder[role] = current.concat(missing);
    } else {
      team.bullpenOrder[role] = current;
    }
  });
}

// v29：調換棒次——把第idx棒與相鄰棒次「整槽互換」（球員與守位綁在一起移動），
// 這樣調棒次不會打亂守位配置，也不會觸發守位重複的自動互換邏輯。
function moveLineupSlot(idx, dir) {
  const team = S.teams[S.userTeamId];
  ensureLineup(team);
  const j = idx + dir;
  if (j < 0 || j >= team.lineup.length) return;
  const tmp = team.lineup[idx];
  team.lineup[idx] = team.lineup[j];
  team.lineup[j] = tmp;
  const pA = S.players[team.lineup[j].playerId], pB = S.players[team.lineup[idx].playerId];
  UI.flash = `已調換棒次：第${idx + 1}棒 ${pB ? pB.name : ""} ↔ 第${j + 1}棒 ${pA ? pA.name : ""}。`;
  persist();
  render();
}
function setLineupSlotPlayer(slotIndex, playerId) {
  const team = S.teams[S.userTeamId];
  ensureLineup(team);
  const p = S.players[playerId];
  const pos = team.lineup[slotIndex] ? team.lineup[slotIndex].position : (p.positions[0] ? p.positions[0].pos : "DH");
  team.lineup[slotIndex] = { playerId, position: pos };
  UI.lineupPicker = null;
  persist();
  render();
}
function setLineupSlotPosition(slotIndex, pos) {
  const team = S.teams[S.userTeamId];
  ensureLineup(team);
  if (pos !== "DH") {
    const conflictIdx = team.lineup.findIndex((s, i) => i !== slotIndex && s.position === pos);
    if (conflictIdx >= 0) {
      // 該守位已有先發球員：直接與對方守位互換，避免同一守位出現兩位先發（例如同時2位捕手）
      team.lineup[conflictIdx].position = team.lineup[slotIndex].position;
    }
  }
  team.lineup[slotIndex].position = pos;
  UI.flash = "已更新守位（若該守位原本已有人先發，已自動互換守位）。";
  persist();
  render();
}
function resetLineup() {
  const team = S.teams[S.userTeamId];
  team.lineup = autoLineup(team, S.players);
  UI.flash = "已自動排列棒次與守位。";
  persist();
  render();
}

function lineupPositionIssues(team) {
  const issues = [];
  if (!team.lineup) return issues;
  const seen = {};
  team.lineup.forEach(slot => {
    if (slot.position === "DH") return;
    seen[slot.position] = (seen[slot.position] || 0) + 1;
  });
  Object.keys(seen).forEach(pos => { if (seen[pos] > 1) issues.push(`先發打線中「${POS_LABEL[pos]}」同時有 ${seen[pos]} 位先發球員，守位重複`); });
  const filled = LINEUP_FIELD_POSITIONS.filter(pos => seen[pos] >= 1);
  const missing = LINEUP_FIELD_POSITIONS.filter(pos => !seen[pos]);
  if (missing.length > 0) issues.push(`先發打線缺少守位：${missing.map(p => POS_LABEL[p]).join("、")}`);
  if (team.lineup.length < 9) issues.push(`先發打線只有 ${team.lineup.length} 人，DH制下應有9人（8個守位＋DH）`);
  return issues;
}

/* v37⑥ 板凳替補專員指派卡（先發打線頁）：代打/代跑/代守各一名，須為一軍非先發健康野手。 */
function renderBenchRolesSection(team) {
  team.benchRoles = team.benchRoles || {};
  const inLineup = new Set((team.lineup || []).map(s => s.playerId));
  const bench = team.roster1.map(id => S.players[id]).filter(p => p && !p.isPitcher && !inLineup.has(p.id) && !isInjured(p));
  const roles = [
    { key: "pinchHit", label: "代打", hint: "近戰落後/平手時小機率追平・超前（重接觸長打）", sortBy: p => (p.contact * 0.5 + p.power * 0.5) },
    { key: "pinchRun", label: "代跑", hint: "近戰時靠速度多搶1分（重速度盜壘）", sortBy: p => (p.speed * 0.6 + (p.steal || 0) * 0.4) },
    { key: "defSub", label: "代守", hint: "小幅領先時守下1分（重守備）", sortBy: p => p.fielding }
  ];
  const rowHtml = r => {
    const list = bench.slice().sort((a, b) => r.sortBy(b) - r.sortBy(a));
    const cur = team.benchRoles[r.key];
    const opts = `<option value="">（不指派）</option>` + list.map(p => `<option value="${p.id}" ${cur === p.id ? "selected" : ""}>${p.name}（${POS_LABEL[p.positions[0].pos]}）</option>`).join("");
    return `<div style="margin:8px 0;">
      <span class="benchrole-tag">${r.label}</span>
      <select class="benchrole-select" data-role="${r.key}">${opts}</select>
      <span class="draftnote muted" style="display:block;margin-top:2px;">${r.hint}</span>
    </div>`;
  };
  // v40⑤：教練模式下板凳專員由教練每日指派——改為唯讀顯示（setBenchRole 手排模式仍可用）
  const coachMode = team.lineupMode === "coach";
  const roRowHtml = r => {
    const cur = team.benchRoles[r.key];
    const p = cur ? S.players[cur] : null;
    return `<div style="margin:8px 0;">
      <span class="benchrole-tag">${r.label}</span>
      <b>${p ? `${p.name}（${POS_LABEL[p.positions[0].pos]}）` : "（今日無合適人選）"}</b>
      <span class="draftnote muted" style="display:block;margin-top:2px;">${r.hint}</span>
    </div>`;
  };
  return `<div class="card">
    <div class="eyebrow">${icon('refresh')} 板凳替補指派（代打／代跑／代守）</div>
    ${foldNote(`<p class="sub dark">為板凳（一軍非先發的健康野手）指定近戰替補專員。<b>只在近戰（分差3分內）</b>局面發動：代打／代跑幫落後或平手的自家追平・超前1分，代守幫小幅領先守下1分；被指派者會累計替補出賽成績。先發名單內或傷兵不可指派。</p>`)}
    ${coachMode ? `<p class="draftnote muted">教練模式：專員由教練每天依專長自動指派（下方為今日指派）。</p>` : ""}
    ${bench.length === 0 ? `<p class="draftnote muted">目前一軍沒有可用的板凳野手（先發之外的健康野手）。</p>` : (coachMode ? roles.map(roRowHtml).join("") : roles.map(rowHtml).join(""))}
  </div>`;
}
function setBenchRole(roleKey, pid) {
  const team = S.teams[S.userTeamId];
  if (!team) return;
  team.benchRoles = team.benchRoles || {};
  if (pid) team.benchRoles[roleKey] = pid; else delete team.benchRoles[roleKey];
  persist(); render();
}

/* v40⑤：隊長改為「教練提名、GM圈選」。教練依資歷/忠誠/士氣/抗壓/實力提出最多3位人選；
   一季一次的任命限制沿用 v37④（appointCaptain 原邏輯不動）。 */
function renderCaptainProposalCard(team) {
  const curCap = team.captainId ? S.players[team.captainId] : null;
  const can = (typeof canAppointCaptainThisSeason === "function") ? canAppointCaptainThisSeason(team) : true;
  const cands = (typeof coachCaptainCandidates === "function") ? coachCaptainCandidates(team) : [];
  return `<div class="card">
    <div class="eyebrow">Ⓒ 隊長（教練提名制）</div>
    <p class="sub dark">${curCap ? `現任隊長：<b>${curCap.name}</b>。` : "目前尚未任命隊長。"}隊長在陣期間全隊近戰抗壓提升、狀況偏正向；一季只能任命一次。</p>
    ${can ? (cands.length === 0 ? `<p class="draftnote muted">教練目前提不出合適人選（一軍健康球員不足）。</p>` : `
      <p class="sub dark">教練提名以下人選，由你圈選任命：</p>
      ${cands.map(p => `<div class="rowline" style="margin:4px 0;"><b>${p.name}</b> <span class="muted">${p.age}歲・忠誠${p.loyalty || 50}・士氣${p.morale || 70}・抗壓${p.composure || 50}・綜合${Math.round(trueOverall(p))}</span> <button class="pickbtn captain-appoint-btn" data-id="${p.id}" ${team.captainId === p.id ? "disabled" : ""}>${team.captainId === p.id ? "現任" : "任命"}</button></div>`).join("")}`)
    : `<p class="draftnote muted">本季已任命過隊長（${curCap ? curCap.name : ""}），需等下個球季才能更換。</p>`}
  </div>`;
}
function renderLineup() {
  const team = S.teams[S.userTeamId];
  ensureLineup(team);
  const manualOk41 = (typeof canManualLineup === "function") ? canManualLineup() : true; // v41①：純GM且未接管→手排控制項不render（不是disable，是不存在）
  const usedIds = new Set(team.lineup.map(s => s.playerId));
  const picking = UI.lineupPicker;
  const slotPos = picking !== null && picking !== undefined ? team.lineup[picking].position : null;
  const candidates = team.roster1.map(id => S.players[id]).filter(p => p && !p.isPitcher && !usedIds.has(p.id))
    .sort((a, b) => {
      const aEligible = slotPos === "DH" || a.positions.some(x => x.pos === slotPos);
      const bEligible = slotPos === "DH" || b.positions.some(x => x.pos === slotPos);
      if (aEligible !== bEligible) return aEligible ? -1 : 1;
      return effectivePositionFielding(b, slotPos) - effectivePositionFielding(a, slotPos);
    });
  const issues = lineupPositionIssues(team);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>先發棒次與守位</h1></div>
      ${renderRosterNav("lineup")}
      ${foldNote(`<p class="sub dark" style="margin-bottom:10px;">棒次順序會影響打席分配（越前面打席越多）。本聯盟採指定打擊制（DH），投手不用打擊，打線需排滿8個守位＋DH共9人；守位選擇會自動避免與其他先發重複。也可以將球員「移防」到非本職守位出賽，但守備成功率會依守位落差程度下降（例如游擊手臨時去守外野，落差比游擊手改守二壘更明顯）。</p>`)}
      ${issues.length > 0 ? `<div class="card issuecard"><div class="eyebrow">打線守位提醒</div><ul class="issuelist">${issues.map(i => `<li>${i}</li>`).join("")}</ul></div>` : ""}
      ${(() => {
        /* v40⑤：打線交給教練——戰術方針＋輪休策略（預設教練排線；GM可切回手排）。
           教練模式下每天開打前依方針重排打線並指派板凳專員；下方棒次表在教練模式為「今日教練排陣預覽」。 */
        ensureTactics(team);
        if (typeof ensureV41 === "function") ensureV41();
        const coachMode = team.lineupMode === "coach";
        /* v41①②⑤：排線權責改由 S.gameMode 上游決定——
           純GM（未接管）：手排入口「不存在」（不是disable）；提供放權後唯一的收權管道「接管」（有代價）。
           GM兼教練：畫面與 v40 完全相同，另加「全面放權」正面事件（不對稱切換的正向）。 */
        const pureGm = S.gameMode === "pure_gm";
        const tkv = S.takeover;
        const manualOk = (typeof canManualLineup === "function") ? canManualLineup() : true;
        const hc = (typeof headCoachOf === "function") ? headCoachOf(team) : null;
        const eff = (typeof effTacticsOf === "function") ? effTacticsOf(team) : null;
        const arcDef = (hc && hc.archetype && typeof COACH_ARCHETYPES === "object") ? COACH_ARCHETYPES[hc.archetype] : null;
        const deviated = eff && (eff.offense !== team.tactics.offense || eff.rest !== team.tactics.rest);
        const coachLine = hc ? `<p class="sub dark" style="margin:6px 0 2px;">總教練 <b>${hc.name}</b>${arcDef ? `・<b>${arcDef.label}</b>（${arcDef.desc}）` : ""}・信任 ${Math.round(hc.trust || 55)}${eff ? `・認同度 ${Math.round((eff.agreement || 1) * 100)}%・執行度 ${Math.round((eff.execution || 1) * 100)}%` : ""}</p>
          ${deviated ? `<p class="draftnote" style="color:var(--redline);">${icon('warn')} 方針與教練哲學差距過大，執行被折射——教練實際採用：${tacticsOffenseDef(eff.offense).label}／${tacticsRestDef(eff.rest).label}。想貫徹意志：換方針、換教練，或累積信任。</p>` : ""}` : "";
        const modeHeader = pureGm
          ? `<p class="sub dark"><b>純GM模式</b>：現場全權委任總教練${tkv ? `——<b style="color:var(--redline)">接管中</b>（第${tkv.seasonYear}季起・續期${tkv.renewals}次），本季由你手排。` : "，每日打線由教練依哲學執行你的方針。"}</p>
             <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
               ${tkv ? `<button id="btn-takeover-end" class="btn-secondary">${icon('dove')} 還權給教練（信任部分回復）</button>` : `<button id="btn-takeover-start" class="btn-danger">${icon('bolt')} 接管兵符（有代價）</button>`}
             </div>
             ${UI.takeoverTips ? `<div class="card issuecard" style="margin-top:8px;">
               <div class="eyebrow">接管之前，教練想跟你說三件事</div>
               <p class="sub dark">① <b>調方針</b>：也許不是教練不行，是方針跟他的哲學打架（看上方認同度）。<br>② <b>換教練</b>：找一個哲學跟你合拍的人，比你自己下場便宜。<br>③ <b>把爛選項移走</b>：教練只能用你給的名單排陣——名單爛，誰排都爛。</p>
               <p class="draftnote muted">仍要接管的代價：教練信任重挫、可能求去、媒體開炮，並被貼上「hands_on」標籤（未來好教練對你卻步）。時效為本季剩餘，跨季須續期（再付代價）。</p>
               <div class="btnrow"><button id="btn-takeover-confirm" class="btn-danger-solid">我明白，仍要接管</button><button id="btn-takeover-cancel" class="btn-secondary">先算了</button></div>
             </div>` : ""}`
          : `<div class="btnrow" style="flex-wrap:wrap;gap:6px;">
            <button id="btn-lm-coach" class="${coachMode ? "btn-primary" : "btn-secondary"}">交給教練（依方針每日排線）</button>
            <button id="btn-lm-manual" class="${coachMode ? "btn-secondary" : "btn-primary"}">GM親自手排</button>
            <button id="btn-delegate" class="btn-outline">${icon('handshake')} 全面放權（轉為純GM模式）</button>
          </div>`;
        return `<div class="card">
          <div class="eyebrow">${icon('cap')} 排線權責（v41）</div>
          ${modeHeader}
          ${coachLine}
          ${coachMode ? `
          <div class="tacticrow"><span>戰術方針</span>
            <select id="sel-tactic-offense">${TACTICS_OFFENSE.map(o => `<option value="${o.key}" ${team.tactics.offense === o.key ? "selected" : ""}>${o.label}——${o.desc}</option>`).join("")}</select>
          </div>
          <div class="tacticrow"><span>輪休策略</span>
            <select id="sel-tactic-rest">${TACTICS_REST.map(o => `<option value="${o.key}" ${team.tactics.rest === o.key ? "selected" : ""}>${o.label}——${o.desc}</option>`).join("")}</select>
          </div>
          ${(typeof TACTICS_ROTATION !== "undefined") ? `<div class="tacticrow"><span>投手輪值</span>
            <select id="sel-tactic-rotation">${TACTICS_ROTATION.map(o => `<option value="${o.key}" ${(team.tactics.rotation || "five") === o.key ? "selected" : ""}>${o.label}——${o.desc}</option>`).join("")}</select>
          </div>` : ""}
          <p class="draftnote muted">教練每天開打前依上述方針重排打線並指派板凳專員；下方棒次表為「今日教練排陣預覽」${manualOk ? "，手動調整將於明天被教練重排（要固定打線請切回GM手排）" : "。純GM模式下沒有手排入口——想介入現場，只能付代價接管"}。</p>` : `
          <p class="draftnote muted">${pureGm ? "接管中：打線由你手排，教練暫時靠邊站（信任持續低迷）。" : "GM手排模式：打線由你固定安排，教練不介入；板凳專員也改由你在下方指派。"}</p>`}
        </div>${renderCaptainProposalCard(team)}`;
      })()}
      <table class="stattable">
        <thead><tr><th>棒次</th><th>姓名</th><th>守位</th><th>接觸</th><th>長打</th><th>選球</th><th>速度</th><th>守備%</th><th>抗壓</th><th></th></tr></thead>
        <tbody>
          ${team.lineup.map((slot, i) => {
            const p = S.players[slot.playerId];
            if (!p) return "";
            const knownPositions = new Set(p.positions.map(x => x.pos));
            const allOptions = LINEUP_FIELD_POSITIONS.concat(["DH"]);
            const effRating = effectivePositionFielding(p, slot.position);
            return `<tr>
              <td>${i + 1}</td>
              <td>${p.name}</td>
              <td>
                ${manualOk41 ? `<select class="lineup-pos-select" data-idx="${i}">
                  ${allOptions.map(pos => `<option value="${pos}" ${pos === slot.position ? "selected" : ""}>${POS_LABEL[pos]}${(pos !== "DH" && !knownPositions.has(pos)) ? "（移防）" : ""}</option>`).join("")}
                </select>` : `${POS_LABEL[slot.position]}${(slot.position !== "DH" && !knownPositions.has(slot.position)) ? "（移防）" : ""}`}
              </td>
              <td>${p.contact}</td><td>${p.power}</td><td>${p.eye}</td><td>${p.speed}</td><td>${effRating}${(slot.position !== "DH" && !knownPositions.has(slot.position)) ? "*" : ""}</td><td>${p.composure}</td>
              ${manualOk41 ? `<td class="lineup-actions">
                <button class="movebtn lineup-order-btn" data-idx="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""} title="棒次上移">▲</button>
                <button class="movebtn lineup-order-btn" data-idx="${i}" data-dir="1" ${i === team.lineup.length - 1 ? "disabled" : ""} title="棒次下移">▼</button>
                <button class="movebtn lineup-swap-btn" data-idx="${i}">更換</button>
              </td>` : `<td class="lineup-actions"><span class="muted">教練調度</span></td>`}
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <p class="draftnote muted">＊守備%欄位標有星號代表該球員目前是「移防」到非本職守位出賽，數值已反映能力下降。</p>
      ${renderBenchRolesSection(team)}
      ${picking !== null && picking !== undefined ? `
      <div class="card">
        <div class="eyebrow">選擇第 ${picking + 1} 棒人選（守位：${POS_LABEL[slotPos]}）</div>
        ${candidates.length === 0 ? `<p class="sub dark">1軍已無其他可用野手，請先調整名單。</p>` : `
        <table class="stattable">
          <thead><tr><th>姓名</th><th>年齡</th><th>主守位</th><th>接觸</th><th>長打</th><th>選球</th><th>速度</th><th>此守位守備%</th><th></th></tr></thead>
          <tbody>
            ${candidates.map(p => {
              const eligible = slotPos === "DH" || p.positions.some(x => x.pos === slotPos);
              return `<tr><td>${p.name}</td><td>${p.age}</td><td>${POS_LABEL[p.positions[0].pos]}</td><td>${p.contact}</td><td>${p.power}</td><td>${p.eye}</td><td>${p.speed}</td><td>${effectivePositionFielding(p, slotPos)}${eligible ? "" : "（移防）"}</td><td><button class="pickbtn" data-id="${p.id}">選他</button></td></tr>`;
            }).join("")}
          </tbody>
        </table>`}
        <div class="btnrow"><button id="btn-cancel-lineup-pick" class="btn-secondary">取消</button></div>
      </div>` : ""}
      <div class="btnrow">
        ${manualOk41 ? `<button id="btn-auto-lineup" class="btn-secondary">自動排列</button>` : ""}
        <button id="btn-back" class="btn-outline">返回</button>
      </div>
    </div>`;
  app.querySelectorAll(".lineup-pos-select").forEach(sel => {
    sel.onchange = (e) => setLineupSlotPosition(Number(sel.dataset.idx), e.target.value);
  });
  app.querySelectorAll(".benchrole-select").forEach(sel => { // v37⑥ 板凳專員指派
    sel.onchange = (e) => setBenchRole(sel.dataset.role, e.target.value || null);
  });
  app.querySelectorAll(".lineup-swap-btn").forEach(btn => {
    btn.onclick = () => { UI.lineupPicker = Number(btn.dataset.idx); render(); };
  });
  // v29：棒次上移/下移（整個棒次槽互換，球員與守位一起移動、不影響守位配置）
  app.querySelectorAll(".lineup-order-btn").forEach(btn => {
    btn.onclick = () => moveLineupSlot(Number(btn.dataset.idx), Number(btn.dataset.dir));
  });
  if (picking !== null && picking !== undefined) {
    document.getElementById("btn-cancel-lineup-pick").onclick = () => { UI.lineupPicker = null; render(); };
    app.querySelectorAll(".card .pickbtn").forEach(btn => {
      btn.onclick = () => setLineupSlotPlayer(picking, btn.dataset.id);
    });
  }
  const btnAuto41 = document.getElementById("btn-auto-lineup");
  if (btnAuto41) btnAuto41.onclick = () => resetLineup(); // v41：純GM模式此鈕不存在
  // v41①②：放權（正向、免費）與接管（有代價；首次強制看過三招提示——Mars拍板）
  const btnDelegate = document.getElementById("btn-delegate");
  if (btnDelegate) btnDelegate.onclick = () => { const r = delegateLineup(); UI.flash = r.msg; persist(); render(); };
  const btnTkStart = document.getElementById("btn-takeover-start");
  if (btnTkStart) btnTkStart.onclick = () => {
    if (!S.takeoverTipsSeen) { UI.takeoverTips = true; render(); return; } // 首次強制看三招；之後不擋
    const r = startTakeover("GM對現場調度失去耐心"); UI.flash = r.msg; render();
  };
  const btnTkConfirm = document.getElementById("btn-takeover-confirm");
  if (btnTkConfirm) btnTkConfirm.onclick = () => { S.takeoverTipsSeen = true; UI.takeoverTips = false; const r = startTakeover("GM對現場調度失去耐心"); UI.flash = r.msg; render(); };
  const btnTkCancel = document.getElementById("btn-takeover-cancel");
  if (btnTkCancel) btnTkCancel.onclick = () => { UI.takeoverTips = false; render(); };
  const btnTkEnd = document.getElementById("btn-takeover-end");
  if (btnTkEnd) btnTkEnd.onclick = () => { const r = endTakeover(); UI.flash = r.msg; render(); };
  // v40⑤：排線權責切換與戰術方針/輪休策略
  const lmCoach = document.getElementById("btn-lm-coach");
  if (lmCoach) lmCoach.onclick = () => { team.lineupMode = "coach"; ensureTactics(team); coachDailyLineup(team); coachAssignBenchRoles(team); UI.flash = "已交給教練排線：每天開打前依戰術方針自動重排。"; persist(); render(); };
  const lmManual = document.getElementById("btn-lm-manual");
  if (lmManual) lmManual.onclick = () => { team.lineupMode = "manual"; UI.flash = "已切回GM手排：打線與板凳專員由你固定安排。"; persist(); render(); };
  const selOff = document.getElementById("sel-tactic-offense");
  if (selOff) selOff.onchange = (e) => { ensureTactics(team); team.tactics.offense = e.target.value; coachDailyLineup(team); UI.flash = `戰術方針已改為「${tacticsOffenseDef(team.tactics.offense).label}」，教練已重排今日打線。`; persist(); render(); };
  const selRest = document.getElementById("sel-tactic-rest");
  if (selRest) selRest.onchange = (e) => { ensureTactics(team); team.tactics.rest = e.target.value; coachDailyLineup(team); UI.flash = `輪休策略已改為「${tacticsRestDef(team.tactics.rest).label}」。`; persist(); render(); };
  const selRot = document.getElementById("sel-tactic-rotation"); // v42⑪
  if (selRot) selRot.onchange = (e) => { ensureTactics(team); team.tactics.rotation = e.target.value; UI.flash = `投手輪值方針已改為「${(typeof rotationPolicyOf === "function") ? rotationPolicyOf(team).label : e.target.value}」。`; persist(); render(); };
  app.querySelectorAll(".captain-appoint-btn").forEach(btn => { // v40⑤：教練提名→GM圈選任命
    btn.onclick = () => {
      const r = appointCaptain(team, btn.dataset.id);
      UI.flash = r.msg; if (r.ok) persist(); render();
    };
  });
  document.getElementById("btn-back").onclick = () => { UI.lineupPicker = null; UI.screen = "dashboard"; render(); };
  wireRosterNav();
}

/* ---------- 投手輪值管理 ---------- */
const BULLPEN_TABS = ["先發", "中繼", "布局", "終結"];
function orderArrayFor(team, tab) { return tab === "先發" ? team.rotation : (team.bullpenOrder[tab] || []); }
function moveRotationSlot(tab, idx, dir) {
  const team = S.teams[S.userTeamId];
  ensureRotation(team); ensureBullpenOrder(team, S.players);
  const arr = orderArrayFor(team, tab);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  persist();
  render();
}
function setRotationSlot(tab, idx, playerId) {
  const team = S.teams[S.userTeamId];
  ensureRotation(team); ensureBullpenOrder(team, S.players);
  orderArrayFor(team, tab)[idx] = playerId;
  UI.rotationPicker = null;
  persist();
  render();
}
function resetRotation(tab) {
  const team = S.teams[S.userTeamId];
  if (tab === "先發") {
    team.rotation = autoRotation(team, S.players);
    team.starterIndex = 0;
  } else {
    team.bullpenOrder[tab] = team.roster1.map(id => S.players[id])
      .filter(p => p && p.isPitcher && p.role === tab)
      .sort((a, b) => trueOverall(b) - trueOverall(a)).map(p => p.id);
  }
  UI.flash = "已自動排列。";
  persist();
  render();
}

// ②輪值彈性化：任何類別都可自由新增/移除人數（先發至少保留1人才能出賽）
function removeRotationSlot(tab, idx) {
  const team = S.teams[S.userTeamId];
  ensureRotation(team); ensureBullpenOrder(team, S.players);
  const arr = orderArrayFor(team, tab);
  if (tab === "先發" && arr.length <= 1) {
    UI.flash = "先發輪值至少需要1位投手，無法再移除。";
    render();
    return;
  }
  arr.splice(idx, 1);
  if (tab === "先發" && typeof team.starterIndex === "number" && arr.length > 0) team.starterIndex = team.starterIndex % arr.length;
  UI.rotationPicker = null;
  persist();
  render();
}
function addRotationSlot(tab, playerId) {
  const team = S.teams[S.userTeamId];
  ensureRotation(team); ensureBullpenOrder(team, S.players);
  const arr = orderArrayFor(team, tab);
  if (!arr.includes(playerId)) arr.push(playerId);
  UI.rotationAdding = false;
  persist();
  render();
}

function renderRotation() {
  const team = S.teams[S.userTeamId];
  ensureRotation(team); ensureBullpenOrder(team, S.players);
  const tab = BULLPEN_TABS.includes(UI.rotationTab) ? UI.rotationTab : "先發";
  const arr = orderArrayFor(team, tab);
  const usedIds = new Set(arr);
  const picking = UI.rotationPicker;
  const adding = UI.rotationAdding;
  const candidates = team.roster1.map(id => S.players[id])
    .filter(p => p && p.isPitcher && !usedIds.has(p.id) && (tab === "先發" || p.role === tab));
  const tabDesc = {
    "先發": "輪值會依序循環先發，下一場比賽由輪值中的下一位投手登板。人數不限（至少1人），可自由增減：人少輪得快、消耗大，人多則每人出賽間隔長。",
    "中繼": "中繼投手的順序決定登板優先權，越前面越常被優先派上場中繼。人數可自由增減。",
    "布局": "布局投手的順序決定登板優先權，通常在終結者上場前的關鍵局數登板。人數可自由增減。",
    "終結": "終結者的順序決定救援優先權，第1順位在有救援機會時會優先登板。人數可自由增減。"
  };
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>投手輪值與牛棚</h1></div>
      ${renderRosterNav("rotation")}
      <div class="tabrow">
        ${BULLPEN_TABS.map(t => `<button class="tab rot-tab ${tab === t ? "active" : ""}" data-rotationtab="${t}">${t}</button>`).join("")}
      </div>
      <p class="sub dark" style="margin-bottom:10px;">${tabDesc[tab]}（目前 ${arr.length} 人）</p>
      <table class="stattable">
        <thead><tr><th>順位</th><th>姓名</th><th>狀況</th><th>年齡</th><th>球速(km/h)</th><th>控球</th><th>體力</th><th>疲勞</th><th>抗壓</th><th></th></tr></thead>
        <tbody>
          ${arr.map((pid, i) => {
            const p = S.players[pid];
            if (!p) return "";
            return `<tr>
              <td>${i + 1}</td><td>${p.name}${isInjured(p) ? ` <span class="injurytag">傷${p.injury.daysLeft}天</span>` : ""}</td><td>${conditionTagHtml(p)}</td><td>${p.age}</td><td>${velocityKmh(p.velocity)}</td><td>${p.control}</td><td>${p.stamina}</td><td>${fatigueOf(p) > 70 ? `<b style="color:#c0392b;">${fatigueOf(p)}</b>` : fatigueOf(p)}</td><td>${p.composure}</td>
              <td>
                <button class="movebtn rot-up-btn" data-idx="${i}">↑</button>
                <button class="movebtn rot-down-btn" data-idx="${i}">↓</button>
                <button class="movebtn rot-swap-btn" data-idx="${i}">更換</button>
                <button class="movebtn rot-remove-btn" data-idx="${i}">移除</button>
              </td>
            </tr>`;
          }).join("")}
          ${arr.length === 0 ? `<tr><td colspan="10" class="draftnote muted">目前「${tab}」名單是空的，可用下方「新增人選」加入投手。</td></tr>` : ""}
        </tbody>
      </table>
      ${picking !== null && picking !== undefined ? `
      <div class="card">
        <div class="eyebrow">選擇第 ${picking + 1} 順位人選</div>
        ${candidates.length === 0 ? `<p class="sub dark">1軍已無其他可用（角色為「${tab}」的）投手。</p>` : `
        <table class="stattable">
          <thead><tr><th>姓名</th><th>年齡</th><th>角色</th><th>球速(km/h)</th><th>控球</th><th>抗壓</th><th></th></tr></thead>
          <tbody>
            ${candidates.map(p => `<tr><td>${p.name}${isInjured(p) ? ` <span class="injurytag">傷${p.injury.daysLeft}天</span>` : ""}</td><td>${p.age}</td><td>${p.role}</td><td>${velocityKmh(p.velocity)}</td><td>${p.control}</td><td>${p.composure}</td><td><button class="pickbtn" data-id="${p.id}">選他</button></td></tr>`).join("")}
          </tbody>
        </table>`}
        <div class="btnrow"><button id="btn-cancel-rot-pick" class="btn-secondary">取消</button></div>
      </div>` : ""}
      ${adding ? `
      <div class="card">
        <div class="eyebrow">新增人選至「${tab}」</div>
        ${candidates.length === 0 ? `<p class="sub dark">1軍已無其他可加入的${tab === "先發" ? "" : `（角色為「${tab}」的）`}投手。</p>` : `
        <table class="stattable">
          <thead><tr><th>姓名</th><th>年齡</th><th>角色</th><th>球速(km/h)</th><th>控球</th><th>抗壓</th><th></th></tr></thead>
          <tbody>
            ${candidates.map(p => `<tr><td>${p.name}${isInjured(p) ? ` <span class="injurytag">傷${p.injury.daysLeft}天</span>` : ""}</td><td>${p.age}</td><td>${p.role}</td><td>${velocityKmh(p.velocity)}</td><td>${p.control}</td><td>${p.composure}</td><td><button class="pickbtn rot-add-pick" data-id="${p.id}">加入</button></td></tr>`).join("")}
          </tbody>
        </table>`}
        <div class="btnrow"><button id="btn-cancel-rot-add" class="btn-secondary">取消</button></div>
      </div>` : ""}
      <div class="btnrow">
        <button id="btn-add-rotation" class="btn-secondary">新增人選</button>
        <button id="btn-auto-rotation" class="btn-secondary">自動排列（${tab}）</button>
        <button id="btn-back" class="btn-outline">返回</button>
      </div>
    </div>`;
  app.querySelectorAll(".rot-tab").forEach(btn => {
    btn.onclick = () => { UI.rotationTab = btn.dataset.rotationtab; UI.rotationPicker = null; UI.rotationAdding = false; render(); };
  });
  app.querySelectorAll(".rot-up-btn").forEach(btn => { btn.onclick = () => moveRotationSlot(tab, Number(btn.dataset.idx), -1); });
  app.querySelectorAll(".rot-down-btn").forEach(btn => { btn.onclick = () => moveRotationSlot(tab, Number(btn.dataset.idx), 1); });
  app.querySelectorAll(".rot-swap-btn").forEach(btn => { btn.onclick = () => { UI.rotationPicker = Number(btn.dataset.idx); UI.rotationAdding = false; render(); }; });
  app.querySelectorAll(".rot-remove-btn").forEach(btn => { btn.onclick = () => removeRotationSlot(tab, Number(btn.dataset.idx)); });
  if (picking !== null && picking !== undefined) {
    document.getElementById("btn-cancel-rot-pick").onclick = () => { UI.rotationPicker = null; render(); };
    app.querySelectorAll(".card .pickbtn:not(.rot-add-pick)").forEach(btn => {
      btn.onclick = () => setRotationSlot(tab, picking, btn.dataset.id);
    });
  }
  if (adding) {
    document.getElementById("btn-cancel-rot-add").onclick = () => { UI.rotationAdding = false; render(); };
    app.querySelectorAll(".rot-add-pick").forEach(btn => { btn.onclick = () => addRotationSlot(tab, btn.dataset.id); });
  }
  document.getElementById("btn-add-rotation").onclick = () => { UI.rotationAdding = true; UI.rotationPicker = null; render(); };
  document.getElementById("btn-auto-rotation").onclick = () => resetRotation(tab);
  document.getElementById("btn-back").onclick = () => { UI.rotationPicker = null; UI.rotationAdding = false; UI.screen = "dashboard"; render(); };
  wireRosterNav();
}

/* ---------- 交易畫面 ---------- */
function openTradeBuilder(partnerId) {
  UI.tradePartner = partnerId;
  UI.tradeGive = [];
  UI.tradeGet = [];
  UI.tradeGivePicks = []; // v45-U1：我方送出的選秀權 token
  UI.tradeGetPicks = [];  // v45-U1：我方索取的選秀權 token
  UI.tradeResult = null;
  const partnerTeam = S.teams[partnerId];
  const scout = S.teams[S.userTeamId].scouts.trade;
  const cache = {};
  const tradeAcc = effectiveScoutAccuracy(S.teams[S.userTeamId], scout); // ⑦含球探辦公室加成
  partnerTeam.roster1.concat(partnerTeam.roster2).forEach(id => {
    const p = S.players[id];
    if (!p) return;
    cache[id] = p.isPitcher
      ? { velocity: scoutedEstimate(p.velocity, tradeAcc), control: scoutedEstimate(p.control, tradeAcc) }
      : {
          contact: scoutedEstimate(p.contact, tradeAcc), power: scoutedEstimate(p.power, tradeAcc), eye: scoutedEstimate(p.eye, tradeAcc),
          speed: scoutedEstimate(p.speed, tradeAcc), fielding: scoutedEstimate(p.fielding, tradeAcc)
        };
  });
  UI.tradeScoutedCache = cache;
  UI.screen = "tradeBuilder";
  render();
}

function submitTrade() {
  const givePicks = UI.tradeGivePicks || [], getPicks = UI.tradeGetPicks || [];
  if (UI.tradeGive.length === 0 && UI.tradeGet.length === 0 && givePicks.length === 0 && getPicks.length === 0) return;
  // v45-U1：帶選秀權的評估（沿用 v43 現金評估邏輯，選秀權為純資產）
  const result = (typeof v45EvaluateTradeWithPicks === "function")
    ? v45EvaluateTradeWithPicks(UI.tradeGive, UI.tradeGet, givePicks, getPicks, UI.tradePartner, 0, 0)
    : evaluateTrade(UI.tradeGive, UI.tradeGet, UI.tradePartner);
  if (result.accept) {
    if (result.hijackedRumorId && typeof settleHijack === "function") settleHijack(result.hijackedRumorId);
    if (typeof v45ExecuteTradeWithPicks === "function") {
      v45ExecuteTradeWithPicks(S.userTeamId, UI.tradePartner, UI.tradeGive, UI.tradeGet, 0, 0, givePicks, getPicks);
    } else {
      executeTrade(S.userTeamId, UI.tradePartner, UI.tradeGive, UI.tradeGet);
    }
    UI.tradeIntercept = null;
    UI.tradeResult = { success: true, reason: result.reason };
    UI.tradeGive = []; UI.tradeGet = [];
    UI.tradeGivePicks = []; UI.tradeGetPicks = [];
  } else {
    UI.tradeResult = { success: false, reason: result.reason };
  }
  persist();
  render();
}

function renderTradeTeamSelect() {
  const teams = Object.values(S.teams).filter(t => t.id !== S.userTeamId);
  const open = tradeWindowOpen();
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName}</div><h1>選擇交易對象</h1></div>
      ${!open ? `<div class="card issuecard"><div class="eyebrow">交易視窗已關閉</div><p class="sub dark">已過交易截止日，須等到休賽季（進入選秀會前後）才能再進行交易。</p></div>` : ""}
      <div class="teamgrid">
        ${teams.map(t => {
          const af = affinityLabel(gmAffinity(t));
          return `<button class="teamcard" data-id="${t.id}" ${!open ? "disabled" : ""}>${(typeof themeTeamLogo === "function") ? themeTeamLogo(t.id, 24) : ""}${t.name}<br><span class="teamcardsub">${personaTagHtml(t)}<span class="afftag ${af.cls}">${af.text}</span></span></button>`;
        }).join("")}
      </div>
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  app.querySelectorAll(".teamcard").forEach(btn => { btn.onclick = () => openTradeBuilder(btn.dataset.id); });
  document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
}

function renderTradeBuilder() {
  const teamA = S.teams[S.userTeamId], teamB = S.teams[UI.tradePartner];
  const myPlayers = teamA.roster1.concat(teamA.roster2).map(id => S.players[id]).filter(Boolean);
  const theirPlayers = teamB.roster1.concat(teamB.roster2).map(id => S.players[id]).filter(Boolean);
  // v45-U1：雙方目前持有、可交易的選秀權 token
  const myPicks = (typeof teamOwnedPicks === "function") ? teamOwnedPicks(teamA.id) : [];
  const theirPicks = (typeof teamOwnedPicks === "function") ? teamOwnedPicks(teamB.id) : [];
  const givePicks = UI.tradeGivePicks || [], getPicks = UI.tradeGetPicks || [];
  const pickChecked = (tk, arr) => (arr || []).some(t => (typeof pickTokenKey === "function") ? pickTokenKey(t) === pickTokenKey(tk) : false);
  const giveValue = UI.tradeGive.reduce((s, id) => s + tradeValue(S.players[id]), 0)
    + ((typeof picksTotalValue === "function") ? picksTotalValue(givePicks) : 0);
  const getValue = UI.tradeGet.reduce((s, id) => s + tradeValue(S.players[id]), 0)
    + ((typeof picksTotalValue === "function") ? picksTotalValue(getPicks) : 0);
  // 選秀權表格 HTML 產生器
  const pickTableHtml = (picks, side) => picks.length === 0
    ? `<p class="draftnote muted">目前沒有可交易的選秀權（可交易範圍：本屆與未來兩年、各六輪）。</p>`
    : `<table class="stattable"><thead><tr><th></th><th>選秀權</th><th>估值</th></tr></thead><tbody>${picks.map(tk => {
        const arr = side === "give" ? givePicks : getPicks;
        return `<tr>
          <td><input type="checkbox" class="${side}-pick-check" data-pk="${pickTokenKey(tk)}" ${pickChecked(tk, arr) ? "checked" : ""}></td>
          <td>${pickLabel(tk)}</td>
          <td>${((typeof pickTradeValue === "function") ? pickTradeValue(tk) : 0).toFixed(1)}</td>
        </tr>`;
      }).join("")}</tbody></table>`;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName}</div><h1>交易：${teamB.name}</h1></div>
      ${UI.tradeResult ? `<div class="flash">${UI.tradeResult.reason}</div>` : ""}
      ${(() => { // v27：對方球團個性與兩隊交情（含記憶事件簿）
        const ps = personaOf(teamB);
        const aff = gmAffinity(teamB);
        const af = affinityLabel(aff);
        const events = (teamB.gmMemory && teamB.gmMemory.events || []).slice(0, 5);
        return `<div class="card">
          <div class="eyebrow">對手檔案：${ps ? `${ps.name}球團` : "未知風格"}・交情 <span class="afftag ${af.cls}">${af.text}</span></div>
          <p class="sub dark">${ps ? ps.desc : ""}${aff !== 0 ? `（交情會影響他們的成交門檻${ps && ps.affinityW === 0 ? "——但這隊只認數字，交情無效" : ""}）` : ""}</p>
          ${events.length > 0 ? `<p class="draftnote muted">${icon('notebook')} 他們記得：${events.map(e => `第${e.year}年${e.text}（${e.delta > 0 ? "+" : ""}${e.delta}）`).join("；")}</p>` : ""}
        </div>`;
      })()}
      <div class="divlabel">你提供（${teamA.name}）</div>
      <p class="draftnote muted">自己球隊球員顯示真實能力值。</p>
      <table class="stattable">
        <thead><tr><th></th><th></th><th>姓名</th><th>層級</th><th>類型</th><th>守位</th><th>能力</th></tr></thead>
        <tbody>
          ${myPlayers.map(p => `<tr>
            <td><input type="checkbox" class="give-check" data-id="${p.id}" ${UI.tradeGive.includes(p.id) ? "checked" : ""}></td>
            <td class="v53-trade-portrait">${(() => { try { var cp = (typeof compositePortrait === "function") ? compositePortrait(p.id, { player: p, teamId: p.team, isAway: false }, 32) : ""; return cp || ""; } catch(_){ return ""; } })()}</td>
            <td>${p.name}</td><td>${p.level}</td><td>${p.isPitcher ? "投手" : "野手"}</td>
            <td>${p.isPitcher ? p.role : p.positions.map(x => POS_LABEL[x.pos]).join("/")}</td>
            <td>${p.isPitcher ? `球速${velocityKmh(p.velocity)}km/h・控球${p.control}・體力${p.stamina}` : `接觸${p.contact}・長打${p.power}・選球${p.eye}・速度${p.speed}・守備${p.fielding}%`}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div class="divlabel">你提供的選秀權（${teamA.name}）</div>
      ${pickTableHtml(myPicks, "give")}
      <div class="divlabel">你想要（${teamB.name}，球探評估值）</div>
      <p class="draftnote muted">守位是公開資訊、真實不變；但能力數值是交易球探的評估值，準確度越高落差越小。</p>
      <table class="stattable">
        <thead><tr><th></th><th></th><th>姓名</th><th>層級</th><th>類型</th><th>守位</th><th>評估能力</th></tr></thead>
        <tbody>
          ${theirPlayers.map(p => {
            const sc = UI.tradeScoutedCache[p.id] || {};
            return `<tr>
            <td><input type="checkbox" class="get-check" data-id="${p.id}" ${UI.tradeGet.includes(p.id) ? "checked" : ""}></td>
            <td class="v53-trade-portrait">${(() => { try { var cp = (typeof compositePortrait === "function") ? compositePortrait(p.id, { player: p, teamId: p.team, isAway: false }, 32) : ""; return cp || ""; } catch(_){ return ""; } })()}</td>
            <td>${p.name}</td><td>${p.level}</td><td>${p.isPitcher ? "投手" : "野手"}</td>
            <td>${p.isPitcher ? p.role : p.positions.map(x => POS_LABEL[x.pos]).join("/")}</td>
            <td>${p.isPitcher ? `球速${velocityKmh(sc.velocity)}km/h・控球${sc.control}` : `接觸${sc.contact}・長打${sc.power}・選球${sc.eye}・速度${sc.speed}・守備${sc.fielding}%`}</td>
          </tr>`;
          }).join("")}
        </tbody>
      </table>
      <div class="divlabel">你想要的選秀權（${teamB.name}）</div>
      ${pickTableHtml(theirPicks, "get")}
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">你提供的價值</div><div class="sb-value small">${giveValue.toFixed(1)}</div></div>
        <div class="sb-row small"><div class="sb-label">你想要的價值</div><div class="sb-value small">${getValue.toFixed(1)}</div></div>
      </div>
      <div class="btnrow">
        <button id="btn-submit-trade" class="btn-primary" ${(UI.tradeGive.length === 0 && UI.tradeGet.length === 0 && (UI.tradeGivePicks || []).length === 0 && (UI.tradeGetPicks || []).length === 0) ? "disabled" : ""}>提出交易</button>
      </div>
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回選對象</button></div>
    </div>`;
  app.querySelectorAll(".give-check").forEach(cb => {
    cb.onchange = () => {
      const id = cb.dataset.id;
      if (cb.checked) UI.tradeGive.push(id); else UI.tradeGive = UI.tradeGive.filter(x => x !== id);
      render();
    };
  });
  app.querySelectorAll(".get-check").forEach(cb => {
    cb.onchange = () => {
      const id = cb.dataset.id;
      if (cb.checked) UI.tradeGet.push(id); else UI.tradeGet = UI.tradeGet.filter(x => x !== id);
      render();
    };
  });
  // v45-U1：選秀權勾選（以 pickTokenKey 對應回 token）
  app.querySelectorAll(".give-pick-check").forEach(cb => {
    cb.onchange = () => {
      const tk = myPicks.find(t => pickTokenKey(t) === cb.dataset.pk);
      if (!tk) return;
      if (cb.checked) UI.tradeGivePicks = (UI.tradeGivePicks || []).concat([tk]);
      else UI.tradeGivePicks = (UI.tradeGivePicks || []).filter(t => pickTokenKey(t) !== cb.dataset.pk);
      render();
    };
  });
  app.querySelectorAll(".get-pick-check").forEach(cb => {
    cb.onchange = () => {
      const tk = theirPicks.find(t => pickTokenKey(t) === cb.dataset.pk);
      if (!tk) return;
      if (cb.checked) UI.tradeGetPicks = (UI.tradeGetPicks || []).concat([tk]);
      else UI.tradeGetPicks = (UI.tradeGetPicks || []).filter(t => pickTokenKey(t) !== cb.dataset.pk);
      render();
    };
  });
  document.getElementById("btn-submit-trade").onclick = () => submitTrade();
  document.getElementById("btn-back").onclick = () => { UI.screen = "tradeTeamSelect"; UI.tradeResult = null; render(); };
}

/* v36：球探換人改為「候選人比較 picker」（對齊教練 openCoachPicker）：
   先列出數位候選球探的準確度／專精／年薪／簽約金並排比較，簽下才扣款，不再一按即隨機扣錢。 */
function scoutSigningCost(scout) { return Math.round((scout && scout.salary || 0) * 0.3 / 10000) * 10000; } // 簽約金＝年薪30%
function generateScoutCandidates(teamId, area) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const s = generateScout(teamId, area);
    s.signing = scoutSigningCost(s); // 暫存簽約金供 picker 顯示（簽下時刪除，不留進存檔）
    out.push(s);
  }
  return out;
}
function openScoutPicker(area) {
  const team = S.teams[S.userTeamId];
  UI.scoutPicker = area;
  UI.scoutCandidates = generateScoutCandidates(team.id, area);
  render();
}
function hireScoutCandidate(area, idx) {
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  const cand = (UI.scoutCandidates || [])[idx];
  if (!cand) return;
  const wasVacant = (typeof scoutVacant === "function") && scoutVacant(team, area);
  const signing = cand.signing != null ? cand.signing : scoutSigningCost(cand);
  if (team.finance.budget < signing) { UI.flash = `預算不足：簽下${cand.areaLabel}球探需簽約金 ${formatMoney(signing)}。`; render(); return; }
  team.finance.budget -= signing;
  delete cand.signing; // 不把臨時欄位帶進存檔的球探物件
  team.scouts[area] = cand;
  if (typeof setScoutVacancy === "function") setScoutVacancy(team, area, false); // v31：補人後清除空缺
  UI.scoutPicker = null; UI.scoutCandidates = null;
  UI.flash = `已${wasVacant ? "補實空缺，" : "更換"}${cand.areaLabel}球探為 ${cand.name}（簽約金 ${formatMoney(signing)}）。`;
  persist();
  render();
}

/* ---------- v34：自由球員市場改版（資訊量對齊國際市場） ----------
   本土FA是聯盟打滾過的已知球員，能力值直接顯示真實數字；
   「未來看漲/看跌」則屬於前瞻判斷，由本土球探評估（精準度越高、對顛峰期的判讀越準）。 */
function faTrendReport(p, team) {
  const scout = team.scouts.domestic;
  const acc = effectiveScoutAccuracy(team, scout);
  // 以球員id+年度做確定性雜訊：精準度越低，球探對「顛峰年齡」的判讀誤差越大（同一年內不重擲）
  let h = 0; const seed = String(p.id) + "_" + S.seasonYear;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  const maxErr = Math.round((100 - acc) / 25); // acc 100→0歲誤差、50→2歲誤差
  const err = maxErr > 0 ? (h % (maxErr * 2 + 1)) - maxErr : 0;
  const perceivedPeak = p.peakAge + err;
  const headroom = p.potential - trueOverall(p);
  const conf = acc >= 75 ? "可信度高" : (acc >= 60 ? "可信度中等" : "可信度偏低");
  if (p.age < perceivedPeak && headroom >= 5) return { key: 0, cls: "up", text: `${icon('chart-up')} 看漲：距顛峰還有空間（球探評估・${conf}）` };
  if (p.age <= perceivedPeak) return { key: 1, cls: "flat", text: `${icon('trend-flat')} 持平：正值顛峰期（球探評估・${conf}）` };
  const gap = p.age - perceivedPeak;
  return { key: 2, cls: "down", text: `${icon('chart-down')} ${gap >= 3 ? "明顯衰退中" : "已開始衰退"}：顛峰已過約${gap}年（球探評估・${conf}）` };
}
function renderFreeAgents() {
  const team = S.teams[S.userTeamId];
  const scout = team.scouts.domestic;
  const effAcc = effectiveScoutAccuracy(team, scout);
  const FA_SORTS = {
    default: p => -trueOverall(p),
    overall: p => -trueOverall(p),
    age: p => p.age,
    type: p => p.isPitcher ? 0 : 1,
    trend: p => faTrendReport(p, team).key,
    salary: p => -(computePlayerSalary(p) || 0)
  };
  let agents = Object.values(S.freeAgents || {});
  agents = applySort(agents, FA_SORTS, UI.faSort || "default", UI.faSortDir);
  const faAllAgents = agents; // 篩選前保留全量（用於計數）
  const faFiltered = applyPosFilter(agents, "faPosFilter");
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>自由球員市場</h1></div>
      ${renderRosterNav("freeAgents")}
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">本土球探</div><div class="sb-value small">${scout ? scout.name : "（職位空缺・盲評）"}</div></div>
        <div class="sb-row small"><div class="sb-label">前瞻評估精準度</div><div class="sb-value small">${effAcc}</div></div>
        <div class="sb-row small"><div class="sb-label">名單狀態</div><div class="sb-value small">1軍 ${team.roster1.length}/28・2軍 ${team.roster2.length}/32</div></div>
      </div>
      <p class="sub dark" style="margin-bottom:10px;">合約到期後選擇不續留的球員會出現在這裡，可隨時簽下補強（需支付簽約金，約為年薪的30%）。本土球員在聯盟打滾多年，能力值為公開的真實數字；「未來看漲/看跌」則是本土球探的前瞻評估，精準度越高越可靠。</p>
      ${posFilterBarHtml(faAllAgents, "faPosFilter")}
      <div class="btnrow" style="align-items:center;">
        <select id="sort-fa" class="sortselect" style="flex:1;">
          <option value="default" ${(!UI.faSort || UI.faSort === "default") ? "selected" : ""}>預設（綜合能力）</option>
          <option value="age" ${UI.faSort === "age" ? "selected" : ""}>依年齡</option>
          <option value="type" ${UI.faSort === "type" ? "selected" : ""}>依類型（投手/野手）</option>
          <option value="trend" ${UI.faSort === "trend" ? "selected" : ""}>依前瞻評估（看漲優先）</option>
          <option value="salary" ${UI.faSort === "salary" ? "selected" : ""}>依身價</option>
        </select>
        ${sortDirButtonHtml("faSortDir")}
      </div>
      ${faFiltered.length === 0 ? `<p class="sub dark">目前沒有自由球員。</p>` : faFiltered.map(p => {
        const trend = faTrendReport(p, team);
        const lastLine = negoStatLine(p, p.lastSeasonStats);
        return `
      <div class="card draftcard">
        <div class="draftcard-head">
          ${(() => { try { return (typeof themePlayerPhoto === "function") ? themePlayerPhoto(p.id, { player: p, teamId: null, isAway: false }) : ""; } catch(_){ return ""; } })()}
          <div>
            <div class="draftname">${p.name}</div>
            <div class="draftmeta">${p.isPitcher ? "投手" : "野手"} ・ ${p.age}歲 ・ ${p.isPitcher ? p.throws + "投" : p.bats + "打／" + p.throws + "投"}${p.isPitcher ? ` ・ ${p.role}` : ` ・ ${p.positions.map(x => POS_LABEL[x.pos]).join("/")}`}</div>
          </div>
          <button class="pickbtn sign-fa-btn" data-id="${p.id}">簽下</button>
        </div>
        <div class="draftgrades">
          <span class="gradebadge grade-${gradeFromValue(trueOverall(p))}">現況 ${gradeFromValue(trueOverall(p))}</span>
          <span class="gradebadge grade-${gradeFromValue(Math.max(trueOverall(p), p.potential))}">天花板 ${gradeFromValue(Math.max(trueOverall(p), p.potential))}</span>
        </div>
        ${(() => { const ph = growthPhaseLabel(p); return `<div class="draftnote">${icon('chart-up')} 生涯階段：<b class="${ph.cls}">${ph.text}</b>——${ph.desc}</div>`; })()}
        <div class="attrgrid">
          ${p.isPitcher ? `
            <div class="attr"><span>球速</span><b>${velocityKmh(p.velocity)} km/h</b></div>
            <div class="attr"><span>控球</span><b>${p.control}</b></div>
            <div class="attr"><span>體力</span><b>${p.stamina}</b></div>
            <div class="attr"><span>耐久度</span><b>${p.durability}</b></div>
            <div class="attr"><span>抗壓</span><b>${p.composure}</b></div>
            <div class="attr"><span>球路數</span><b>${p.pitches.length} 種</b></div>
          ` : `
            <div class="attr"><span>接觸</span><b>${p.contact}</b></div>
            <div class="attr"><span>長打</span><b>${p.power}</b></div>
            <div class="attr"><span>選球</span><b>${p.eye}</b></div>
            <div class="attr"><span>速度</span><b>${p.speed}</b></div>
            <div class="attr"><span>盜壘</span><b>${p.steal}</b></div>
            <div class="attr"><span>守備</span><b>${p.fielding}%</b></div>
            <div class="attr"><span>臂力</span><b>${p.arm}</b></div>
            <div class="attr"><span>耐久度</span><b>${p.durability}</b></div>
          `}
        </div>
        <div class="draftnote trend-${trend.cls}">${trend.text}</div>
        ${lastLine ? `<div class="draftnote muted">${icon('chart')} 上季成績：${lastLine}</div>` : `<div class="draftnote muted">${icon('chart')} 上季無出賽紀錄</div>`}
        <div class="draftnote muted">預估年薪 ${formatMoney(computePlayerSalary(p))}・簽約金約 ${formatMoney(Math.round(computePlayerSalary(p) * 0.3))}</div>
      </div>`;
      }).join("")}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  const sortSel = document.getElementById("sort-fa");
  if (sortSel) sortSel.onchange = e => { UI.faSort = e.target.value; render(); };
  wirePosFilterButtons();
  wireSortDirButtons();
  app.querySelectorAll(".sign-fa-btn").forEach(btn => {
    btn.onclick = () => signFreeAgent(btn.dataset.id);
  });
  document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
  wireRosterNav();
}


function renderInternationalMarket() {
  const team = S.teams[S.userTeamId];
  ensureFacilities(team);
  const scout = team.scouts.international;
  const effAcc = effectiveScoutAccuracy(team, scout);
  const bonus = scoutAccuracyBonus(team);
  const INTL_SORTS = {
    default: null,
    overall: p => -(p.scoutedOverall || 0),
    ceiling: p => "SABCD".indexOf(p.scoutedCeiling || "D"),
    age: p => p.age,
    type: p => p.isPitcher ? 0 : 1,
    nation: p => NATION_GRADE_ORDER[(nationByName(p.nationality) || { grade: "D" }).grade] * 100 + p.nationality.charCodeAt(0),
    salary: p => -(computePlayerSalary(p) || 0)
  };
  let agents = Object.values(S.internationalFreeAgents || {})
    .sort((a, b) => (b.exclusive ? 1 : 0) - (a.exclusive ? 1 : 0) || (b.scoutedOverall || 0) - (a.scoutedOverall || 0));
  agents = applySort(agents, INTL_SORTS, UI.intlSort || "default", UI.intlSortDir); // v25市場排序（雙向）
  const intlAllAgents = agents;
  const intlFiltered = applyPosFilter(agents, "intlPosFilter");
  const exclusiveCount = intlAllAgents.filter(p => p.exclusive).length;
  const fCount = foreignCountOnRoster1(team);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>國際球員市場</h1></div>
      ${renderRosterNav("internationalMarket")}
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">負責球探</div><div class="sb-value small">${scout ? scout.name : "（職位空缺・盲評）"}</div></div>
        <div class="sb-row small"><div class="sb-label">有效評估精準度</div><div class="sb-value small">${effAcc}${bonus > 0 && scout ? `（${scout.accuracy}＋辦公室${bonus}）` : ""}</div></div>
        <div class="sb-row small"><div class="sb-label">獨家人脈人選</div><div class="sb-value small">${exclusiveCount} 位</div></div>
        <div class="sb-row small"><div class="sb-label">1軍外籍名額</div><div class="sb-value small">${fCount}/${FOREIGN_ROSTER_CAP}</div></div>
      </div>
      ${posFilterBarHtml(intlAllAgents, "intlPosFilter")}
      <div class="btnrow" style="align-items:center;">
        <select id="sort-intl" class="sortselect" style="flex:1;">
          <option value="default" ${(!UI.intlSort || UI.intlSort === "default") ? "selected" : ""}>預設（獨家優先・評估值）</option>
          <option value="overall" ${UI.intlSort === "overall" ? "selected" : ""}>依現況評估</option>
          <option value="ceiling" ${UI.intlSort === "ceiling" ? "selected" : ""}>依天花板</option>
          <option value="age" ${UI.intlSort === "age" ? "selected" : ""}>依年齡</option>
          <option value="type" ${UI.intlSort === "type" ? "selected" : ""}>依類型（投手/野手）</option>
          <option value="nation" ${UI.intlSort === "nation" ? "selected" : ""}>依國籍（國家等級）</option>
          <option value="salary" ${UI.intlSort === "salary" ? "selected" : ""}>依身價</option>
        </select>
        ${sortDirButtonHtml("intlSortDir")}
      </div>
      <p class="sub dark" style="margin-bottom:10px;">每年休賽季重新開放一批海外球員（未簽約者留在原聯盟）。世界共40國，球員素質受國家棒球等級（S~D）影響。所有數值皆為國際球探的評估值，精準度越高落差越小。標示「獨家情報」的是球探人脈獨家挖掘的菁英人選，其他球團接觸不到；提升球探能力與球探辦公室等級可以挖到更多、更好的獨家人才。目前1軍 ${team.roster1.length}/28、2軍 ${team.roster2.length}/32。</p>
      ${intlFiltered.length === 0 ? `<p class="sub dark">目前沒有可簽約的國際球員，請等下個休賽季再來看看。</p>` : intlFiltered.map(p => `
      <div class="card draftcard">
        <div class="draftcard-head">
          ${(() => { try { return (typeof themePlayerPhoto === "function") ? themePlayerPhoto(p.id, { player: p, teamId: null, isAway: false }) : ""; } catch(_){ return ""; } })()}
          <div>
            <div class="draftname">${p.name}${p.exclusive ? `<span class="exclusivetag">獨家情報</span>` : ""}</div>
            <div class="draftmeta"><span class="nationtag">${(typeof v53NationFlagByName === "function") ? v53NationFlagByName(p.nationality, 16) : ""}${p.nationality}${(nationByName(p.nationality) || {}).grade ? "・" + nationByName(p.nationality).grade + "級" : ""}</span> ${p.isPitcher ? "投手" : "野手"} ・ ${p.age}歲 ・ ${p.isPitcher ? p.throws + "投" : p.bats + "打／" + p.throws + "投"}${p.isPitcher ? ` ・ ${p.role}` : ` ・ ${p.positions.map(x => POS_LABEL[x.pos]).join("/")}`}</div>
          </div>
          <button class="pickbtn sign-intl-btn" data-id="${p.id}">簽下</button>
        </div>
        <div class="draftgrades">
          <span class="gradebadge grade-${p.scoutedGrade}">現況 ${p.scoutedGrade}${p.scoutedOverall != null ? `（${p.scoutedOverall}）` : ""}</span>
          <span class="gradebadge grade-${p.scoutedCeiling}">天花板 ${p.scoutedCeiling}${p.scoutedCeilingVal != null ? `（約${p.scoutedCeilingVal}）` : ""}</span>
        </div>
        <div class="attrgrid">
          ${p.scouted ? `
          <div class="draftnote muted" style="grid-column:1/-1;margin:0 0 2px;">逐項能力：現在(評估) → 該項預估天花板（與談判桌同一份球探報告，選前即可全覽）</div>
          ${scoutedAttrRows(p)}` : `
          ${p.isPitcher ? `
            <div class="attr"><span>球速(評估)</span><b>${velocityKmh(p.scouted.velocity)} km/h</b></div>
            <div class="attr"><span>控球(評估)</span><b>${p.scouted.control}</b></div>
            <div class="attr"><span>體力(評估)</span><b>${p.scouted.stamina}</b></div>
            <div class="attr"><span>抗壓(評估)</span><b>${p.scouted.composure}</b></div>
            <div class="attr"><span>球路數</span><b>${p.pitches.length} 種</b></div>
          ` : `
            <div class="attr"><span>接觸(評估)</span><b>${p.scouted.contact}</b></div>
            <div class="attr"><span>長打(評估)</span><b>${p.scouted.power}</b></div>
            <div class="attr"><span>選球(評估)</span><b>${p.scouted.eye}</b></div>
            <div class="attr"><span>速度(評估)</span><b>${p.scouted.speed}</b></div>
            <div class="attr"><span>盜壘(評估)</span><b>${p.scouted.steal}</b></div>
            <div class="attr"><span>守備(評估)</span><b>${p.scouted.fielding}%</b></div>
            <div class="attr"><span>臂力(評估)</span><b>${p.scouted.arm}</b></div>
            <div class="attr"><span>抗壓(評估)</span><b>${p.scouted.composure}</b></div>
          `}`}
        </div>
        <div class="draftnote">${p.archetype} ・ ${p.maturity}</div>
        <div class="draftnote muted">${p.scoutConfidence}${p.exclusive ? " ・ 球探獨家人脈，僅本隊可接觸簽約" : ""}</div>
      </div>`).join("")}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  document.getElementById("sort-intl").onchange = e => { UI.intlSort = e.target.value; render(); };
  wirePosFilterButtons();
  wireSortDirButtons();
  app.querySelectorAll(".sign-intl-btn").forEach(btn => {
    btn.onclick = () => signInternationalPlayer(btn.dataset.id);
  });
  document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
  wireRosterNav();
}


function renderScouts() {
  const team = S.teams[S.userTeamId];
  const areas = ["domestic", "international", "trade"];
  const AREA_LABEL = { domestic: "國內球探", international: "國際球探", trade: "交易球探" };
  const picking = UI.scoutPicker;
  const candidates = UI.scoutCandidates || [];
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>球探室</h1></div>
      ${renderRosterNav("scouts")}
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      <p class="sub dark" style="margin-bottom:10px;">球探至少配置3位：國內球探（負責選秀評估準確度）、國際球探（負責國際球員市場的評估準確度，也決定每年能挖到多少「獨家人選」）、交易球探（負責評估交易對象的球探準確度）。${scoutAccuracyBonus(team) > 0 ? `目前球探辦公室 Lv.${scoutOfficeLevel(team)}，所有球探有效準確度 +${scoutAccuracyBonus(team)}。` : "升級「硬體建設→球探辦公室」可提升所有球探的有效準確度。"}</p>
      <table class="stattable">
        <thead><tr><th>類別</th><th>姓名</th><th>準確度</th><th>專精</th><th>合約</th><th>年薪</th><th></th></tr></thead>
        <tbody>
          ${areas.map(area => {
            const s = team.scouts[area];
            const label = AREA_LABEL[area];
            if (!s) {
              // v31：球探空缺（到期未續約）→ 精準度歸零（盲評），顯示補人入口
              return `<tr style="background:rgba(255,90,90,.10);"><td>${label}<br><span class="specialabilitytag" style="color:var(--redline);">空缺</span></td><td colspan="4"><span style="color:var(--redline);">此球探職位空缺中，該區評估精準度歸零。</span></td><td><button class="movebtn open-scout-picker-btn" data-area="${area}">自由市場簽人</button></td></tr>`;
            }
            const expiring = s.contractYears <= 1;
            return `<tr><td>${s.areaLabel}${expiring ? `<br><span class="specialabilitytag" style="color:var(--redline);">合約將到期</span>` : ""}</td><td>${s.name}</td><td>${s.accuracy}</td><td>${s.specialty}</td><td>${s.contractYears}年</td><td>${formatMoney(s.salary)}</td><td><button class="movebtn open-scout-picker-btn" data-area="${area}">更換</button></td></tr>`;
          }).join("")}
        </tbody>
      </table>
      ${picking ? `
      <div class="card">
        <div class="eyebrow">簽新球探：${AREA_LABEL[picking]}・${team.scouts[picking] ? `現任準確度 ${team.scouts[picking].accuracy}` : "目前空缺"}</div>
        <p class="sub dark" style="margin-bottom:10px;">並排比較候選人的評估準確度／專精／年薪／簽約金後再決定，<b>簽下才扣款</b>。</p>
        <div class="teamgrid" style="grid-template-columns:1fr;gap:10px;">
          ${candidates.map((cand, idx) => {
            const curAcc = team.scouts[picking] ? team.scouts[picking].accuracy : 0;
            const diff = cand.accuracy - curAcc;
            const diffLabel = !team.scouts[picking] ? "（補實空缺）" : (diff > 3 ? `<span style="color:var(--green-text);">優於現任 +${diff}</span>` : (diff < -3 ? `<span style="color:var(--redline);">劣於現任 ${diff}</span>` : "與現任相當"));
            const signing = cand.signing != null ? cand.signing : scoutSigningCost(cand);
            return `<div class="card" style="margin-bottom:0;padding:14px 16px;">
              <div class="draftcard-head">
                <div>
                  <div class="draftname">${cand.name}</div>
                  <div class="draftmeta">專精：${cand.specialty}</div>
                </div>
                <button class="pickbtn hire-scout-btn" data-idx="${idx}">簽下</button>
              </div>
              <div class="draftnote">評估準確度 ${cand.accuracy}（${diffLabel}）</div>
              <div class="draftnote">年薪 ${formatMoney(cand.salary)}・合約 ${cand.contractYears} 年</div>
              <div class="draftnote muted">簽約金 ${formatMoney(signing)}（簽下時扣除）</div>
            </div>`;
          }).join("")}
        </div>
        <div class="btnrow" style="margin-top:10px;"><button id="btn-cancel-scout-pick" class="btn-secondary">取消</button></div>
      </div>` : ""}
      ${(() => {
        /* v54 A2：球探發掘育成候選 */
        if (typeof V54_DISCOVERY_DIRECTIONS === "undefined") return "";
        var devDiscovered = UI.v54DevCandidates || [];
        var curDir = UI.v54DiscoveryDir || "balanced";
        var devTeam = S.teams[S.userTeamId];
        var devCount = devTeam && devTeam.rosterDev ? devTeam.rosterDev.length : 0;
        var canDiscover = !UI.v54DiscoveredThisOffseason;
        return `<div class="card" style="margin-top:16px;">
          <div class="eyebrow">發掘業餘新秀（育成候選）</div>
          <p class="sub dark">國內球探利用人脈尋找 15-20 歲的業餘球員。每個休賽季可發掘一次，球探準確度越高，候選品質越好。目前育成名單 ${devCount}/25 人。</p>
          ${canDiscover ? `<div class="btnrow" style="align-items:center;">
            <select id="v54-discover-dir" class="sortselect" style="flex:1;">
              ${V54_DISCOVERY_DIRECTIONS.map(function(d) { return '<option value="' + d.key + '"' + (d.key === curDir ? ' selected' : '') + '>' + d.label + '</option>'; }).join("")}
            </select>
            <button id="btn-v54-discover" class="btn-primary" style="margin-left:8px;">發掘</button>
          </div>` : `<p class="draftnote muted">本休賽季已發掘過，請等待下一個休賽季。</p>`}
          ${devDiscovered.length > 0 ? `<div class="divlabel" style="margin-top:10px;">發掘結果（${devDiscovered.length} 名候選）</div>
          <div class="teamgrid" style="grid-template-columns:1fr;gap:10px;">
            ${devDiscovered.map(function(c, idx) {
              var ov = (typeof trueOverall === "function") ? trueOverall(c) : "?";
              return '<div class="card" style="margin-bottom:0;padding:14px 16px;"><div class="draftcard-head"><div><div class="draftname">' + c.name + '</div><div class="draftmeta">' + (c.isPitcher ? "投手" : "野手") + '・' + c.age + '歲・潛力 ' + c.potential + '・綜合 ' + ov + '</div></div><button class="pickbtn v54-sign-dev-btn" data-idx="' + idx + '">簽約</button></div><div class="draftnote">年薪 ' + ((typeof formatMoney === "function") ? formatMoney(80000) : "8萬") + '（育成合約 5 年）</div></div>';
            }).join("")}
          </div>` : ""}
        </div>`;
      })()}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  app.querySelectorAll(".open-scout-picker-btn").forEach(btn => {
    btn.onclick = () => openScoutPicker(btn.dataset.area);
  });
  if (picking) {
    document.getElementById("btn-cancel-scout-pick").onclick = () => { UI.scoutPicker = null; UI.scoutCandidates = null; render(); };
    app.querySelectorAll(".hire-scout-btn").forEach(btn => {
      btn.onclick = () => hireScoutCandidate(picking, Number(btn.dataset.idx));
    });
  }
  document.getElementById("btn-back").onclick = () => { UI.scoutPicker = null; UI.scoutCandidates = null; UI.v54DevCandidates = null; UI.screen = "dashboard"; render(); };
  /* v54 A2：球探發掘育成候選事件綁定 */
  var discoverBtn = document.getElementById("btn-v54-discover");
  if (discoverBtn) discoverBtn.onclick = function() {
    var dirSel = document.getElementById("v54-discover-dir");
    var dir = dirSel ? dirSel.value : "balanced";
    UI.v54DiscoveryDir = dir;
    UI.v54DevCandidates = v54ScoutDiscoverCandidates(dir);
    UI.v54DiscoveredThisOffseason = true;
    UI.flash = "球探已完成發掘，找到 " + UI.v54DevCandidates.length + " 名候選新秀。";
    render();
  };
  app.querySelectorAll(".v54-sign-dev-btn").forEach(function(btn) {
    btn.onclick = function() {
      var idx = Number(btn.dataset.idx);
      var candidates = UI.v54DevCandidates || [];
      if (idx < 0 || idx >= candidates.length) return;
      var result = v54SignDiscoveredPlayer(candidates[idx]);
      UI.flash = result.msg;
      if (result.ok) { candidates.splice(idx, 1); UI.v54DevCandidates = candidates; persist(); }
      render();
    };
  });
  wireRosterNav();
}

function renderCoaches() {
  const team = S.teams[S.userTeamId];
  const level = UI.coachTab || "1軍";
  const staff = team.coachStaff[level];
  const picking = UI.coachPicker;
  const candidates = UI.coachCandidates || [];
  const pending = (S.pendingCoachHires || []).filter(x => x.level === level);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>教練團</h1></div>
      ${renderRosterNav("coaches")}
      ${renderCoachRefusalCard()}
      ${pending.length > 0 ? `<div class="card issuecard"><div class="eyebrow">合約到期・待你確認人選</div>
        <p class="sub dark">以下職位教練合約到期，系統已暫時自動指派人選頂上，你可以直接點「更換」重新比較候選人：${pending.map(x => x.role).join("、")}</p>
      </div>` : ""}
      <div class="tabrow">
        <button class="tab ${level === "1軍" ? "active" : ""}" data-tab="1軍">1軍教練團</button>
        <button class="tab ${level === "2軍" ? "active" : ""}" data-tab="2軍">2軍教練團</button>
        <button class="tab ${level === "育成" ? "active" : ""}" data-tab="育成">育成教練團</button>
      </div>
      <table class="stattable">
        <thead><tr><th>職位</th><th>姓名</th><th>專精</th><th>指導力</th><th>合約</th><th></th></tr></thead>
        <tbody>
          ${COACH_ROLES.map(role => {
            const c = S.coaches[staff[role]];
            if (!c) {
              // v31：職位空缺（到期未續約）→ 加成歸零，顯示補人入口
              return `<tr style="background:rgba(255,90,90,.10);"><td>${role}<br><span class="specialabilitytag" style="color:var(--redline);">空缺</span></td><td colspan="3"><span style="color:var(--redline);">此職位空缺中，加成歸零。請到自由市場補人。</span></td><td>—</td><td>
                <button class="movebtn open-picker-btn" data-role="${role}">自由市場簽人</button></td></tr>`;
            }
            const abilityTag = c.specialAbility ? `<br><span class="specialabilitytag">${icon('star-solid')}${c.specialAbility.name}</span>` : "";
            const expiring = c.contractYears <= 1;
            return `<tr><td>${role}${expiring ? `<br><span class="specialabilitytag" style="color:var(--redline);">合約將到期</span>` : ""}</td><td>${c.name}${c.formerPlayer ? "（退休轉任）" : ""}${abilityTag}</td><td>${SPECIALTY_LABEL[c.specialty]}</td><td>${c.teaching}</td><td>${c.contractYears}年</td><td>
              <button class="movebtn open-picker-btn" data-role="${role}">更換</button>
              <button class="movebtn swap-level-btn" data-role="${role}">與${level === "1軍" ? "2軍" : "1軍"}互換</button>
            </td></tr>`;
          }).join("")}
        </tbody>
      </table>
      <p class="sub dark">每位教練的專精會直接加成對應能力（例如打擊教練加成打擊、投手教練加成球速控球），總教練提供全隊小幅加成。約20%機率教練會帶有特殊能力（${icon('star-solid')}標記），加成更明顯。<b>v31：合約到期不再自動暫代</b>——休賽季須逐一續約談判，談不成或不續約則職位空缺（加成歸零），須在此到自由市場簽人補上。</p>
      ${picking ? `
      <div class="card">
        <div class="eyebrow">聘僱新教練：${picking}（${level}）・${S.coaches[staff[picking]] ? `現任指導力 ${S.coaches[staff[picking]].teaching}` : "目前空缺"}</div>
        <p class="sub dark" style="margin-bottom:10px;">候選人包含幾位退休球員轉任人選與新聘教練人選，並排比較指導力／特殊能力後再決定。</p>
        <div class="teamgrid" style="grid-template-columns:1fr;gap:10px;">
          ${candidates.map((cand, idx) => {
            const curT = S.coaches[staff[picking]] ? S.coaches[staff[picking]].teaching : 0;
            const diff = cand.teaching - curT;
            const diffLabel = !S.coaches[staff[picking]] ? "（補實空缺）" : (diff > 3 ? `<span style="color:var(--green-text);">優於現任 +${diff}</span>` : (diff < -3 ? `<span style="color:var(--redline);">劣於現任 ${diff}</span>` : "與現任相當"));
            const abilityLine = cand.specialAbility ? `${icon('star-solid')}${cand.specialAbility.name}（${SPECIALTY_LABEL[cand.specialAbility.category] || ""}加成）` : "無特殊能力";
            // v42②：意願徽章——好教練會挑雇主（delegates甜頭／hands_on帳單／舊帳／戰績）
            const will = cand.will || null;
            const willBadge = !will ? "" : (will.state === "refuse"
              ? `<div class="draftnote" style="color:var(--redline);">${icon('no')} 婉拒加盟${will.why ? `：「${will.why}」` : ""}</div>`
              : (will.state === "ask"
                ? `<div class="draftnote" style="color:var(--redline);">△ 意願保留（要價+25%）${will.why ? `：「${will.why}」` : ""}</div>`
                : `<div class="draftnote" style="color:var(--green-text);">○ 願意加盟${will.why ? `：「${will.why}」` : ""}</div>`));
            const refuse = !!(will && will.state === "refuse");
            return `<div class="card" style="margin-bottom:0;padding:14px 16px;${refuse ? "opacity:.65;" : ""}">
              <div class="draftcard-head">
                <div>
                  <div class="draftname">${cand.name}</div>
                  <div class="draftmeta">${cand.exiled ? "前職業教練（曾與你不歡而散）" : (cand.kind === "retiree" ? `退休球員轉任・退休時${cand.age}歲` : "新聘教練")}</div>
                </div>
                <button class="pickbtn hire-btn" data-idx="${idx}" ${refuse ? "disabled" : ""}>${refuse ? "無意願" : "聘用"}</button>
              </div>
              <div class="draftnote">指導力 ${cand.teaching}（${diffLabel}）</div>
              <div class="draftnote">${abilityLine}</div>
              ${willBadge}
              <div class="draftnote muted">合約 ${cand.contractYears} 年・年薪 ${typeof formatMoney === "function" ? formatMoney(cand.salary || 0) : (cand.salary || 0)}</div>
            </div>`;
          }).join("")}
        </div>
        <div class="btnrow" style="margin-top:10px;"><button id="btn-cancel-pick" class="btn-secondary">取消</button></div>
      </div>` : ""}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  wireCoachRefusalCard();
  app.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => { UI.coachTab = btn.dataset.tab; UI.coachPicker = null; UI.coachCandidates = null; render(); };
  });
  app.querySelectorAll(".open-picker-btn").forEach(btn => {
    btn.onclick = () => openCoachPicker(btn.dataset.role);
  });
  app.querySelectorAll(".swap-level-btn").forEach(btn => {
    btn.onclick = () => swapCoachLevels(team.id, btn.dataset.role);
  });
  if (picking) {
    document.getElementById("btn-cancel-pick").onclick = () => { UI.coachPicker = null; UI.coachCandidates = null; render(); };
    app.querySelectorAll(".hire-btn").forEach(btn => {
      btn.onclick = () => hireCoachCandidate(picking, Number(btn.dataset.idx));
    });
  }
  document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
  wireRosterNav();
}

function renderDraft() {
  const d = S.draft;
  if (!d.active) {
    const myPicks = d.picks.filter(pk => pk.team === S.userTeamId && S.players[pk.playerId]);
    const myFailed = d.picks.filter(pk => pk.team === S.userTeamId && pk.failed);
    const skipNote = d.skippedByUser ? `本次選秀你主動放棄了 ${d.skippedByUser} 個名額，保留給未來的交易或國際選秀。` : "名單缺額已自動以增援新秀補齊。";
    app.innerHTML = `
      <div class="wrap">
        <div class="topbar"><div class="eyebrow">${S.leagueName} ・ 第${S.seasonYear}年</div><h1>選秀會結束</h1></div>
        <div class="card">
          <div class="eyebrow">${S.teams[S.userTeamId].name} 選秀成果</div>
          <p class="sub dark">共選進 ${myPicks.length} 位新秀，已分發至2軍名單。${skipNote}</p>
          ${myFailed.length > 0 ? `<p class="sub dark" style="color:var(--redline);">有 ${myFailed.length} 個順位因新秀合約談判破局（5次來回都談不成），這幾位新秀直接放棄加盟、退出本屆選秀，你這幾個順位沒有選進球員：${myFailed.map(pk => pk.failedName).join("、")}</p>` : ""}
        </div>
        <table class="stattable">
          <thead><tr><th>輪次</th><th>姓名</th><th>類型</th><th>年齡</th><th>新秀合約</th><th>簽約金</th></tr></thead>
          <tbody>
            ${myPicks.map(pk => {
              const p = S.players[pk.playerId];
              return `<tr><td>第${pk.round}輪</td><td>${p.name}</td><td>${p.isPitcher ? "投手" : "野手"}</td><td>${p.age}</td><td>${p.contractYears}年・${formatMoney(p.salary)}</td><td>${formatMoney(pk.signingBonus)}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
        <div class="btnrow"><button id="btn-start-season" class="btn-primary">開始新球季</button></div>
      </div>`;
    document.getElementById("btn-start-season").onclick = () => { S.gameStarted ? finalizeNewSeason() : beginFirstSeason(); };
    return;
  }

  const round = Math.floor(d.pickIndex / 20) + 1;
  const pickNo = (d.pickIndex % 20) + 1;
  const sortKey = UI.draftSort || "default";
  const sorted = d.pool.slice().sort(DRAFT_SORTS[sortKey]);
  const filtered = applyPosFilter(sorted, "draftPosFilter");
  const scout = S.teams[S.userTeamId].scouts.domestic;
  const draftEffAcc = effectiveScoutAccuracy(S.teams[S.userTeamId], scout); // ⑦含球探辦公室加成

  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName} ・ 第${S.seasonYear}年休賽季</div><h1>新人選秀會</h1></div>
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">目前輪次</div><div class="sb-value small">第 ${round} 輪・第 ${pickNo} 順位</div></div>
        <div class="sb-row small"><div class="sb-label">輪到你選秀</div><div class="sb-value small">${S.teams[S.userTeamId].name}</div></div>
        <div class="sb-row small"><div class="sb-label">負責球探</div><div class="sb-value small">${scout ? scout.name : "（職位空缺・盲評）"}（有效準確度 ${draftEffAcc}）</div></div>
      </div>
      ${UI.draftSkipConfirm ? `
      <div class="card issuecard">
        <div class="eyebrow">放棄選秀權</div>
        <p class="sub dark">只跳過這一個順位，還是放棄本次選秀會「剩餘所有」順位（之後每輪不會再跳出來詢問，直接自動跳過到選秀結束）？</p>
        <div class="btnrow">
          <button id="btn-skip-once" class="btn-secondary">只跳過這次</button>
          <button id="btn-skip-all" class="btn-danger">放棄剩餘所有順位</button>
        </div>
        <div class="btnrow"><button id="btn-skip-cancel" class="btn-outline">取消</button></div>
      </div>` : `<div class="btnrow"><button id="btn-skip-pick" class="btn-outline">放棄本輪選秀權</button></div>`}
      <p class="sub" style="margin-bottom:10px;">以下為球探評估報告，非真實能力值；準確度越高、評估落差越小。標示「獨家情報」的是國內球探人脈額外挖掘的菁英新秀，只有你能選、AI球團接觸不到（不佔本屆公開池的等級配額）。</p>
      ${posFilterBarHtml(d.pool, "draftPosFilter")}
      <select id="sort-draft" class="sortselect">
        <option value="default" ${sortKey === "default" ? "selected" : ""}>依現在能力評等排序</option>
        <option value="age" ${sortKey === "age" ? "selected" : ""}>依年齡排序（小到大）</option>
        <option value="ceiling" ${sortKey === "ceiling" ? "selected" : ""}>依天花板評等排序</option>
      </select>
      ${filtered.map(p => `
        <div class="card draftcard">
          <div class="draftcard-head">
            ${(() => { try { return (typeof themePlayerPhoto === "function") ? themePlayerPhoto(p.id, { player: p, teamId: null, isAway: false }) : ""; } catch(_){ return ""; } })()}
            <div>
              <div class="draftname">${p.name}${p.exclusive ? `<span class="exclusivetag">獨家情報</span>` : ""}</div>
              <div class="draftmeta">${p.isPitcher ? "投手" : "野手"} ・ ${p.age}歲 ・ ${p.isPitcher ? p.throws + "投" : p.bats + "打／" + p.throws + "投"}</div>
            </div>
            <button class="pickbtn" data-id="${p.id}">選他</button>
          </div>
          <div class="draftmeta" style="margin-bottom:6px;">
            ${p.isPitcher ? `角色傾向：${p.role}` : `主守位：${POS_LABEL[p.positions[0].pos]}`}　球風：${p.archetype}
          </div>
          <div class="draftgrades">
            <span class="gradebadge grade-${p.scoutedGrade}">現在 ${p.scoutedGrade}${p.scoutedOverall != null ? `（${p.scoutedOverall}）` : ""}</span>
            <span class="gradebadge grade-${p.scoutedCeiling}">天花板 ${p.scoutedCeiling}${p.scoutedCeilingVal != null ? `（約${p.scoutedCeilingVal}）` : ""}</span>
          </div>
          <div class="draftnote muted" style="margin:2px 0;">能力評估：現在(評估) → 預估~天花板值${p.isPitcher ? `・球路 ${p.pitches ? p.pitches.length : "?"} 種` : ""}</div>
          <div class="attrgrid">
            ${scoutedAttrRows(p)}
          </div>
          <div class="draftnote">${p.maturity}</div>
          ${(() => { const ph = growthPhaseLabel(p); return `<div class="draftnote">${icon('chart-up')} 生涯階段：<b class="${ph.cls}">${ph.text}</b>——${ph.desc}</div>`; })()}
          <div class="draftnote muted">${p.scoutConfidence}（球探有效準確度 ${draftEffAcc}，數值可能與真實能力有落差）</div>
        </div>`).join("")}
    </div>`;
  document.getElementById("sort-draft").onchange = (e) => { UI.draftSort = e.target.value; render(); };
  wirePosFilterButtons();
  if (UI.draftSkipConfirm) {
    document.getElementById("btn-skip-once").onclick = () => confirmSkipOnce();
    document.getElementById("btn-skip-all").onclick = () => confirmSkipAllRemaining();
    document.getElementById("btn-skip-cancel").onclick = () => cancelSkip();
  } else {
    document.getElementById("btn-skip-pick").onclick = () => userSkipPick();
  }
  app.querySelectorAll(".pickbtn").forEach(btn => {
    btn.onclick = () => userDraftPick(btn.dataset.id);
  });
}

function renderMatchupCard(m) {
  const teamA = S.teams[m.a], teamB = S.teams[m.b];
  const involvesUser = m.a === S.userTeamId || m.b === S.userTeamId;
  return `
    <div class="card matchupcard ${involvesUser ? "me" : ""}">
      <div class="lg-row">
        <div class="lg-team">${(typeof themeTeamLogo === "function") ? themeTeamLogo(m.a, 24) : ""}${teamA.name}<span class="lg-score">${m.winsA}</span></div>
        <div class="lg-vs">${m.winner ? "系列賽結束" : "對戰中"}</div>
        <div class="lg-team">${(typeof themeTeamLogo === "function") ? themeTeamLogo(m.b, 24) : ""}${teamB.name}<span class="lg-score">${m.winsB}</span></div>
      </div>
      ${m.winner ? `<div class="lg-result win">${S.teams[m.winner].name} 晉級</div>` : ""}
    </div>`;
}

function renderLastGameCard(g, team) {
  const isHome = g.home === team.id;
  const oppId = isHome ? g.away : g.home;
  const opp = S.teams[oppId];
  const myScore = isHome ? g.homeScore : g.awayScore;
  const oppScore = isHome ? g.awayScore : g.homeScore;
  const win = myScore > oppScore;
  /* v50：比賽情境肖像——明確依這一戰的實際主客場傳入 isAway。
     這是全專案唯一的「比賽情境」肖像出口；其餘畫面一律主場預設。
     未導入主題包時 compositePortrait 回空字串，版面不受影響（位元等價）。 */
  let gamePortrait = "";
  try {
    if (typeof compositePortrait === "function") {
      const capId = (typeof activeCaptain === "function") ? (activeCaptain(team) || {}).id : null;
      const showId = capId || (team.lineup && team.lineup.length ? team.lineup[0].playerId : null);
      const shp = showId ? S.players[showId] : null;
      if (shp) {
        const html = compositePortrait(shp.id, { player: shp, teamId: team.id, isAway: !isHome }, 64);
        if (html) gamePortrait = `<div class="lg-portrait">${html}</div>`;
      }
    }
  } catch (_) {}
  return `
    <div class="card lastgame">
      <div class="eyebrow">最近一戰</div>
      ${gamePortrait}
      <div class="lg-row">
        <div class="lg-team">${(typeof themeTeamLogo === "function") ? themeTeamLogo(team.id, 24) : ""}${team.name}<span class="lg-score">${myScore}</span></div>
        <div class="lg-vs">${isHome ? "主場迎戰" : "客場出擊"}</div>
        <div class="lg-team">${(typeof themeTeamLogo === "function") ? themeTeamLogo(oppId, 24) : ""}${opp.name}<span class="lg-score">${oppScore}</span></div>
      </div>
      <div class="lg-result ${win ? "win" : "lose"}">${win ? "勝利" : "落敗"}</div>
    </div>`;
}

function renderStandings() {
  /* r008：分聯盟分頁 + 個人排行榜 */
  var allPlayers = Object.values(S.players).filter(function(p) { return p && p.team && p.seasonStats; });
  function divHtml(d) {
    return '<div class="divblock"><div class="divlabel">' + DIV_LABEL[d] + '</div>' +
      '<table class="stattable"><thead><tr><th>球隊</th><th>勝</th><th>敗</th><th>勝率</th></tr></thead><tbody>' +
      standingsForDivision(d).map(function(t) {
        return '<tr class="' + (t.isUser ? "me" : "") + '">' +
          '<td>' + ((typeof themeTeamLogo === "function") ? themeTeamLogo(t.id, 20) : "") + t.name + '</td>' +
          '<td>' + t.wins + '</td><td>' + t.losses + '</td><td>' + pct(t.wins, t.losses) + '</td></tr>';
      }).join("") + '</tbody></table></div>';
  }
  function leagueTeamIds(prefix) {
    return Object.values(S.teams).filter(function(t) { return t.division && t.division.charAt(0) === prefix; }).map(function(t) { return t.id; });
  }
  function topBatters(teamIds, stat, n) {
    return allPlayers.filter(function(p) { return !p.isPitcher && teamIds.indexOf(p.team) >= 0 && p.seasonStats; })
      .sort(function(a, b) { return (b.seasonStats[stat] || 0) - (a.seasonStats[stat] || 0); }).slice(0, n);
  }
  function topPitchers(teamIds, stat, n, asc) {
    return allPlayers.filter(function(p) { return p.isPitcher && teamIds.indexOf(p.team) >= 0 && p.seasonStats; })
      .sort(function(a, b) {
        if (asc) return (a.seasonStats[stat] || 999) - (b.seasonStats[stat] || 999);
        return (b.seasonStats[stat] || 0) - (a.seasonStats[stat] || 0);
      }).slice(0, n);
  }
  function rankTable(title, list, stat, fmt) {
    if (!list.length) return "";
    return '<div class="divlabel">' + title + '</div>' +
      '<table class="stattable"><thead><tr><th>#</th><th>球員</th><th>球隊</th><th>數值</th></tr></thead><tbody>' +
      list.map(function(p, i) {
        var tn = S.teams[p.team] ? S.teams[p.team].abbr || S.teams[p.team].name : "?";
        var val = fmt ? fmt(p.seasonStats[stat]) : (p.seasonStats[stat] || 0);
        return '<tr' + (p.team === S.userTeamId ? ' class="me"' : '') + '><td>' + (i+1) + '</td><td>' + p.name + '</td><td>' + tn + '</td><td>' + val + '</td></tr>';
      }).join("") + '</tbody></table>';
  }
  function eraFmt(v) { return v != null ? (typeof v === "number" ? v.toFixed(2) : v) : "-"; }
  function avgFmt(v) { return v != null ? (typeof v === "number" ? ("." + ((v * 1000 + 0.5) | 0).toString().padStart(3, "0")) : v) : "-"; }
  function leagueRankings(prefix) {
    var ids = leagueTeamIds(prefix);
    var n = 10;
    var html = '<div class="divlabel" style="margin-top:14px;">打者排行</div>';
    html += rankTable("安打", topBatters(ids, "H", n), "H");
    html += rankTable("全壘打", topBatters(ids, "HR", n), "HR");
    html += rankTable("打點", topBatters(ids, "RBI", n), "RBI");
    html += rankTable("打擊率", topBatters(ids, "AVG", n), "AVG", avgFmt);
    html += rankTable("盜壘", topBatters(ids, "SB", n), "SB");
    html += '<div class="divlabel" style="margin-top:14px;">投手排行</div>';
    html += rankTable("勝投", topPitchers(ids, "W", n), "W");
    html += rankTable("三振", topPitchers(ids, "SO", n), "SO");
    html += rankTable("救援成功", topPitchers(ids, "SV", n), "SV");
    html += rankTable("防禦率", topPitchers(ids, "ERA", 10, true), "ERA", eraFmt);
    return html;
  }
  var leagueAhtml = divHtml("A1") + divHtml("A2") + leagueRankings("A");
  var leagueBhtml = divHtml("B1") + divHtml("B2") + leagueRankings("B");
  app.innerHTML = '<div class="wrap">' +
    '<div class="topbar"><div class="eyebrow">' + S.leagueName + '</div><h1>戰績榜</h1></div>' +
    uiTabs("standings", [
      { key: "leagueA", label: "海風聯盟", html: leagueAhtml },
      { key: "leagueB", label: "山岳聯盟", html: leagueBhtml }
    ]) +
    '<div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div></div>';
  wireUiTabs();
  document.getElementById("btn-back").onclick = function() { UI.screen = "dashboard"; render(); };
}

// v25排序全面升級：所有排序皆可切換「高→低／低→高」雙向，並新增薪資排序
const PITCHER_SORTS = {
  default: null,
  age: p => p.age,
  velocity: p => -p.velocity,
  control: p => -p.control,
  stamina: p => -p.stamina,
  fatigue: p => -(p.fatigue || 0),
  salary: p => -(p.salary || 0),
  role: p => p.role
};
const BATTER_SORTS = {
  default: null,
  age: p => p.age,
  position: p => p.positions[0] ? p.positions[0].pos : "",
  power: p => -p.power,
  contact: p => -p.contact,
  eye: p => -p.eye,
  bunting: p => -(p.bunting || 0),
  speed: p => -p.speed,
  fielding: p => -p.fielding,
  salary: p => -(p.salary || 0)
};

function applySort(list, sortMap, key, dir) {
  const fn = sortMap[key];
  if (!fn) return dir === -1 ? list.slice().reverse() : list;
  const mult = dir === -1 ? -1 : 1;
  return list.slice().sort((a, b) => {
    const va = fn(a), vb = fn(b);
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  });
}
// 排序方向切換按鈕（共用）：dirKey 為 UI 上存方向的欄位名
function sortDirButtonHtml(dirKey) {
  const dir = UI[dirKey] === -1 ? -1 : 1;
  return `<button class="btn-outline sortdir-btn" data-dirkey="${dirKey}" style="padding:6px 10px;">${dir === 1 ? "↓ 正向" : "↑ 反向"}</button>`;
}
function wireSortDirButtons() {
  app.querySelectorAll(".sortdir-btn").forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.dirkey;
      UI[k] = UI[k] === -1 ? 1 : -1;
      render();
    };
  });
}

function pitcherRoleTag(team, p) {
  if (team.rotation && team.rotation.includes(p.id)) return `輪值${team.rotation.indexOf(p.id) + 1}`;
  if (team.bullpenOrder && team.bullpenOrder[p.role] && team.bullpenOrder[p.role].includes(p.id)) return `${p.role}${team.bullpenOrder[p.role].indexOf(p.id) + 1}`;
  return "－";
}
function batterLineupTag(team, p) {
  if (!team.lineup) return "－";
  const idx = team.lineup.findIndex(s => s.playerId === p.id);
  if (idx < 0) return "－";
  return `${idx + 1}棒・${POS_LABEL[team.lineup[idx].position]}`;
}
function lineupRotationWarnings(team) {
  const issues = lineupPositionIssues(team);
  const availableStarters = (team.rotation || []).map(id => S.players[id]).filter(p => p && !isInjured(p) && !(p.internationalDutyGamesLeft > 0));
  if (availableStarters.length === 0) issues.push("先發輪值目前沒有任何可出賽的投手（可能全數受傷或服役中），請至輪值畫面補人");
  const injuredIn = (team.rotation || []).concat(team.lineup ? team.lineup.map(s => s.playerId) : []).map(id => S.players[id]).filter(p => p && isInjured(p));
  if (injuredIn.length > 0) issues.push(`打線/輪值中有 ${injuredIn.length} 位傷兵（${injuredIn.map(p => p.name).join("、")}），出賽時會自動跳過`);
  return issues;
}

function renderRoster() {
  const team = S.teams[S.userTeamId];
  ensureLineup(team); ensureRotation(team); ensureBullpenOrder(team, S.players);
  const ids = UI.rosterTab === "1軍" ? team.roster1 : (UI.rosterTab === "育成" ? (team.rosterDev || []) : team.roster2);
  const list = ids.map(id => S.players[id]);
  const pitchers = applySort(list.filter(p => p.isPitcher), PITCHER_SORTS, UI.pitcherSort || "default", UI.pitcherSortDir);
  const batters = applySort(list.filter(p => !p.isPitcher), BATTER_SORTS, UI.batterSort || "default", UI.batterSortDir);
  const rosterPosF = UI.rosterPosFilter || "all";
  const showPitchers = rosterPosF === "all" || rosterPosF === "P";
  const showBatters = rosterPosF === "all" || rosterPosF !== "P";
  const filteredBatters = rosterPosF === "all" || rosterPosF === "P" ? batters : batters.filter(p => posFilterGroup(p) === rosterPosF);
  const actionLabel = UI.rosterTab === "1軍" ? "下放2軍" : (UI.rosterTab === "育成" ? "詳細" : "升上1軍");
  const warnings = UI.rosterTab === "1軍" ? lineupRotationWarnings(team) : [];
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>球員名單</h1></div>
      ${renderRosterNav(UI.rosterTab === "2軍" ? "roster2" : "roster1")}
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      ${posFilterBarHtml(list, "rosterPosFilter")}
      ${warnings.length > 0 ? `<div class="card issuecard"><div class="eyebrow">先發陣容提醒</div><ul class="issuelist">${warnings.map(i => `<li>${i}</li>`).join("")}</ul><p class="sub dark">前往「先發打線」或「投手輪值/牛棚」分頁即可調整。</p></div>` : ""}
      ${(team.roster1.length !== 28 || team.roster2.length !== 32) ? `<p class="sub dark" style="margin-bottom:12px;">名單人數已偏離編制（1軍限28人／2軍限32人），暫時超編或缺編都不影響比賽進行，會在下次選秀會後自動整編回正常編制。</p>` : ""}
      ${UI.rosterTab === "育成" ? (() => {
        var curPolicyP = team.devPolicyPitcher || team.devPolicy || "balanced";
        var curPolicyB = team.devPolicyBatter || team.devPolicy || "balanced";
        var policyOpts = (typeof V54_DEV_POLICIES !== "undefined") ? V54_DEV_POLICIES : {};
        var pitcherOpts = Object.keys(policyOpts).filter(function(k) { return policyOpts[k].forPitcher; });
        var batterOpts = Object.keys(policyOpts).filter(function(k) { return policyOpts[k].forBatter; });
        var optHtml = function(keys, cur) {
          return keys.map(function(k) {
            var pol = policyOpts[k];
            var lbl = (pol && pol.label) ? pol.label : k;
            var desc = (pol && pol.desc) ? " — " + pol.desc : "";
            var mulNote = k === "balanced" ? "（×0.8）" : "";
            return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + lbl + mulNote + '</option>';
          }).join("");
        };
        var curPolPObj = policyOpts[curPolicyP] || policyOpts.balanced;
        var curPolBObj = policyOpts[curPolicyB] || policyOpts.balanced;
        return `<div class="card" style="margin-bottom:12px;">
          <div class="eyebrow">育成方針（影響育成球員的屬性成長分配）</div>
          <div style="margin-bottom:8px;"><span class="sub dark" style="font-weight:700;">投手方針</span></div>
          <div class="btnrow" style="align-items:center;margin-bottom:4px;">
            <select id="v54-dev-policy-pitcher" class="sortselect" style="flex:1;">
              ${optHtml(pitcherOpts, curPolicyP)}
            </select>
          </div>
          <p class="draftnote muted" style="margin-bottom:10px;">${curPolPObj.desc || ""}</p>
          <div style="margin-bottom:8px;"><span class="sub dark" style="font-weight:700;">野手方針</span></div>
          <div class="btnrow" style="align-items:center;margin-bottom:4px;">
            <select id="v54-dev-policy-batter" class="sortselect" style="flex:1;">
              ${optHtml(batterOpts, curPolicyB)}
            </select>
          </div>
          <p class="draftnote muted" style="margin-bottom:6px;">${curPolBObj.desc || ""}</p>
          <p class="draftnote muted">均衡方針全屬性 ×0.8（刻意的代價，不是安全選擇）。專項方針主屬性 ×1.0–1.2，副屬性 ×0.5–0.7。</p>
        </div>`;
      })() : ""}
      ${showPitchers ? `<div class="divlabel">投手（${pitchers.length}）</div>
      <div class="btnrow" style="align-items:center;">
        <select id="sort-pitcher" class="sortselect" style="flex:1;">
          <option value="default" ${(!UI.pitcherSort || UI.pitcherSort === "default") ? "selected" : ""}>預設排序</option>
          <option value="age" ${UI.pitcherSort === "age" ? "selected" : ""}>依年齡</option>
          <option value="velocity" ${UI.pitcherSort === "velocity" ? "selected" : ""}>依球速</option>
          <option value="control" ${UI.pitcherSort === "control" ? "selected" : ""}>依控球</option>
          <option value="stamina" ${UI.pitcherSort === "stamina" ? "selected" : ""}>依體力</option>
          <option value="fatigue" ${UI.pitcherSort === "fatigue" ? "selected" : ""}>依疲勞</option>
          <option value="salary" ${UI.pitcherSort === "salary" ? "selected" : ""}>依年薪</option>
          <option value="role" ${UI.pitcherSort === "role" ? "selected" : ""}>依角色</option>
        </select>
        ${sortDirButtonHtml("pitcherSortDir")}
      </div>
      <table class="stattable">
        <thead><tr><th>姓名</th><th>狀況</th><th>年齡</th><th>角色</th><th>先發位置</th><th>球速(km/h)</th><th>控球</th><th>體力</th><th>疲勞</th><th>抗壓</th><th></th></tr></thead>
        <tbody>
          ${pitchers.map(p => `<tr data-id="${p.id}"><td class="rowlink" data-id="${p.id}">${nameWithDutyTag(p)}</td><td>${conditionTagHtml(p)}</td><td>${p.age}</td><td>${p.role}</td><td>${UI.rosterTab === "1軍" ? pitcherRoleTag(team, p) : "－"}</td><td>${velocityKmh(p.velocity)}</td><td>${p.control}</td><td>${p.stamina}</td><td>${fatigueOf(p) > 70 ? `<b style="color:#c0392b;">${fatigueOf(p)}</b>` : fatigueOf(p)}</td><td>${p.composure}</td><td><button class="movebtn" data-id="${p.id}">${actionLabel}</button></td></tr>`).join("")}
        </tbody>
      </table>` : ""}
      ${showBatters ? `<div class="divlabel">野手（${filteredBatters.length}）</div>
      <div class="btnrow" style="align-items:center;">
        <select id="sort-batter" class="sortselect" style="flex:1;">
          <option value="default" ${(!UI.batterSort || UI.batterSort === "default") ? "selected" : ""}>預設排序</option>
          <option value="age" ${UI.batterSort === "age" ? "selected" : ""}>依年齡</option>
          <option value="position" ${UI.batterSort === "position" ? "selected" : ""}>依守位</option>
          <option value="power" ${UI.batterSort === "power" ? "selected" : ""}>依長打力</option>
          <option value="contact" ${UI.batterSort === "contact" ? "selected" : ""}>依接觸力</option>
          <option value="eye" ${UI.batterSort === "eye" ? "selected" : ""}>依選球</option>
          <option value="bunting" ${UI.batterSort === "bunting" ? "selected" : ""}>依觸擊</option>
          <option value="speed" ${UI.batterSort === "speed" ? "selected" : ""}>依速度</option>
          <option value="fielding" ${UI.batterSort === "fielding" ? "selected" : ""}>依守備</option>
          <option value="salary" ${UI.batterSort === "salary" ? "selected" : ""}>依年薪</option>
        </select>
        ${sortDirButtonHtml("batterSortDir")}
      </div>
      <table class="stattable">
        <thead><tr><th>姓名</th><th>狀況</th><th>年齡</th><th>守位</th><th>先發</th><th>接觸</th><th>長打</th><th>選球</th><th>觸擊</th><th>速度</th><th>守備%</th><th></th></tr></thead>
        <tbody>
          ${filteredBatters.map(p => `<tr data-id="${p.id}"><td class="rowlink" data-id="${p.id}">${nameWithDutyTag(p)}</td><td>${conditionTagHtml(p)}</td><td>${p.age}</td><td>${p.positions.map(x => POS_LABEL[x.pos]).join("/")}</td><td>${UI.rosterTab === "1軍" ? batterLineupTag(team, p) : "－"}</td><td>${p.contact}</td><td>${p.power}</td><td>${p.eye}</td><td>${p.bunting || "-"}</td><td>${p.speed}</td><td>${p.fielding}</td><td><button class="movebtn" data-id="${p.id}">${actionLabel}</button></td></tr>`).join("")}
        </tbody>
      </table>` : ""}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  var sortPEl = document.getElementById("sort-pitcher");
  if (sortPEl) sortPEl.onchange = (e) => { UI.pitcherSort = e.target.value; render(); };
  var sortBEl = document.getElementById("sort-batter");
  if (sortBEl) sortBEl.onchange = (e) => { UI.batterSort = e.target.value; render(); };
  wirePosFilterButtons();
  wireSortDirButtons();
  /* v54 A2：育成方針下拉 */
  var devPolPitch = document.getElementById("v54-dev-policy-pitcher");
  if (devPolPitch) devPolPitch.onchange = function(e) { team.devPolicyPitcher = e.target.value; UI.flash = "投手育成方針已變更為「" + (e.target.options[e.target.selectedIndex].text) + "」。"; persist(); render(); };
  var devPolBat = document.getElementById("v54-dev-policy-batter");
  if (devPolBat) devPolBat.onchange = function(e) { team.devPolicyBatter = e.target.value; UI.flash = "野手育成方針已變更為「" + (e.target.options[e.target.selectedIndex].text) + "」。"; persist(); render(); };
  app.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => { UI.flash = null; UI.rosterTab = btn.dataset.tab; render(); };
  });
  app.querySelectorAll(".rowlink").forEach(td => {
    td.onclick = () => openPlayerDetail(td.dataset.id);
  });
  app.querySelectorAll(".movebtn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (UI.rosterTab === "育成") { openPlayerDetail(btn.dataset.id); return; } /* 育成球員點按鈕開詳細頁 */
      if (UI.rosterTab === "1軍") demotePlayer(btn.dataset.id);
      else promotePlayer(btn.dataset.id);
    };
  });
  document.getElementById("btn-back").onclick = () => { UI.flash = null; UI.screen = "dashboard"; render(); };
  wireRosterNav();
}

function openPlayerDetail(id) {
  UI.prevRosterTab = UI.rosterTab; /* r008：記住進入前的分頁，返回時還原 */
  UI.playerDetailReturn = "roster"; /* r008：預設返回 roster */
  UI.selectedPlayerId = id;
  UI.screen = "playerDetail";
  UI.suggestRole = UI.suggestRole || "coach|1軍|總教練";
  render();
}

// 建議轉任前的「與現任人選能力比對」卡片：讓玩家看清楚換人是升級還是降級
function renderRoleComparison(p, team, roleType, level, role) {
  if (roleType === "scout") {
    const areaLabel = { domestic: "國內", international: "國際", trade: "交易" }[role] || role;
    const cur = team.scouts ? team.scouts[role] : null;
    const estAccuracy = clamp(Math.round((p.coachingAptitude || 50) * 0.85 + 50 * 0.15), 30, 95);
    return `
      <div class="divlabel">與現任${areaLabel}球探比對</div>
      <table class="stattable">
        <thead><tr><th></th><th>評估精準度</th><th>年薪</th><th>合約</th></tr></thead>
        <tbody>
          <tr><td>現任：${cur ? cur.name : "（懸缺）"}</td><td>${cur ? cur.accuracy : "-"}</td><td>${cur ? formatMoney(cur.salary) : "-"}</td><td>${cur ? cur.contractYears + "年" : "-"}</td></tr>
          <tr class="me"><td>${p.name}（轉任後）</td><td>約${estAccuracy}</td><td>約50~200萬元</td><td>2~5年</td></tr>
        </tbody>
      </table>
      <p class="draftnote muted">轉任球探的評估精準度以「教練潛力 ${p.coachingAptitude}」為主推估，實際數值就任後才會確定。</p>`;
  }
  const curId = team.coachStaff && team.coachStaff[level] ? team.coachStaff[level][role] : null;
  const cur = curId ? S.coaches[curId] : null;
  const curAbility = cur && cur.specialAbility ? `${icon('star-solid')}${cur.specialAbility.name}` : "無";
  return `
    <div class="divlabel">與現任${level}${role}比對</div>
    <table class="stattable">
      <thead><tr><th></th><th>指導力</th><th>特殊能力</th><th>年薪</th><th>合約</th></tr></thead>
      <tbody>
        <tr><td>現任：${cur ? cur.name : "（懸缺）"}</td><td>${cur ? cur.teaching : "-"}</td><td>${cur ? curAbility : "-"}</td><td>${cur ? formatMoney(cur.salary) : "-"}</td><td>${cur ? cur.contractYears + "年" : "-"}</td></tr>
        <tr class="me"><td>${p.name}（轉任後）</td><td>${p.coachingAptitude}</td><td>就任時抽選</td><td>約30~150萬元</td><td>2~5年</td></tr>
      </tbody>
    </table>
    <p class="draftnote muted">轉任教練的指導力＝球員的「教練潛力 ${p.coachingAptitude}」。若他就任，現任人選將被解除職務。</p>`;
}

/* v26季中特訓指派卡（球員詳情頁）：球季進行中、自家現役且非傷兵才可指派 */
/* v37④ 隊長任命卡（球員詳情頁）：自家一軍現役球員可任命為隊長；一季一次。 */
/* v54 A2：三層升降級操作卡 + 育成合約資訊（球員詳細頁） */
function renderV54RosterMoveCard(p, team) {
  if (!team || team.id !== S.userTeamId || p.retired) return "";
  var level = p.level;
  var btns = "";
  var info = "";
  if (level === "育成") {
    var devYears = (p.devContractStart != null) ? (S.seasonYear - p.devContractStart + 1) : "?";
    var remaining = p.devContractYears != null ? p.devContractYears : "?";
    info = `<p class="sub dark">育成合約：已在團 ${devYears} 年，剩餘 ${remaining} 年（滿 7 年強制結業）。年薪 ${typeof formatMoney === "function" ? formatMoney(p.salary || 80000) : (p.salary || 80000)}。</p>`;
    var convCost = (typeof v54DevConversionCost === "function") ? v54DevConversionCost(p) : Math.round((p.salary || 80000) * 0.5);
    info += `<p class="draftnote muted">升上二軍或一軍需轉為正式合約，轉約金 ${typeof formatMoney === "function" ? formatMoney(convCost) : convCost}。</p>`;
    btns = `<div class="btnrow">
      <button id="btn-v54-dev-to-minor" class="btn-primary">升上二軍</button>
      <button id="btn-v54-dev-to-major" class="btn-secondary">直升一軍</button>
    </div>`;
  } else if (level === "2軍") {
    btns = `<div class="btnrow">
      <button id="btn-v54-minor-to-major" class="btn-primary">升上一軍</button>
      <button id="btn-v54-minor-to-dev" class="btn-secondary">下放育成</button>
    </div>`;
  } else if (level === "1軍") {
    btns = `<div class="btnrow">
      <button id="btn-v54-major-to-minor" class="btn-primary">下放二軍</button>
      <button id="btn-v54-major-to-dev" class="btn-secondary">下放育成</button>
    </div>`;
  }
  if (!btns) return "";
  return `<div class="card">
    <div class="eyebrow">陣容調度（${level}）</div>
    ${info}
    ${btns}
  </div>`;
}

function renderCaptainSection(p, team) {
  if (!team || team.id !== S.userTeamId || p.retired || !team.roster1.includes(p.id)) return "";
  const isCap = team.captainId === p.id;
  const curCap = team.captainId ? S.players[team.captainId] : null;
  const canThisSeason = (typeof canAppointCaptainThisSeason === "function") ? canAppointCaptainThisSeason(team) : true;
  if (isCap) {
    return `<div class="card">
      <div class="eyebrow">Ⓒ 隊長</div>
      <p class="sub dark">${p.name} 是本隊隊長。在陣期間全隊近戰抗壓提升（更容易贏下一分差勝負）、狀況漂移偏正向；每季在隊忠誠回補、續約較好談。${canThisSeason ? "" : "（本季已任命，需下季才能更換）"}</p>
    </div>`;
  }
  return `<div class="card">
    <div class="eyebrow">Ⓒ 隊長任命（v40：教練提名制）</div>
    <p class="sub dark">${curCap ? `現任隊長：<b>${curCap.name}</b>。` : "目前尚未任命隊長。"}隊長在陣期間全隊近戰抗壓提升、狀況偏正向；一季只能任命一次。v40起由教練提出人選、GM在「先發打線」頁圈選任命。</p>
    ${canThisSeason
      ? ((typeof coachCaptainCandidates === "function" && coachCaptainCandidates(team).some(c => c.id === p.id))
        ? `<div class="btnrow"><button id="btn-appoint-captain" class="btn-primary">任命 ${p.name} 為隊長（教練提名人選）</button></div>`
        : `<p class="draftnote muted">教練本季未將 ${p.name} 列入隊長提名；請至「先發打線」頁從教練提名人選中圈選。</p>`)
      : `<p class="draftnote muted">本季已任命過隊長（${curCap ? curCap.name : ""}），需等下個球季才能更換隊長。</p>`}
  </div>`;
}
function renderMidTrainingSection(p, team) {
  if (typeof midTrainingSeasonActive !== "function") return "";
  if (!team || team.id !== S.userTeamId || p.retired || !midTrainingSeasonActive() || isInjured(p)) return "";
  const items = midItemsFor(p);
  const phase = (typeof growthPhaseLabel === "function") ? growthPhaseLabel(p) : null; // v37⑦：特訓時顯示生涯階段
  const phaseLine = phase ? `<p class="sub dark" style="margin:2px 0 8px;">${icon('chart-up')} 生涯階段：<b class="${phase.cls}">${phase.text}</b> — ${phase.desc}</p>` : "";
  if (p.midTraining) {
    const item = midItemByKey(p.midTraining.key);
    const pctv = clamp(Math.round(p.midTraining.points / MID_TRAINING_POINTS_PER_GAIN * 100), 0, 99);
    return `<div class="card">
      <div class="eyebrow">${icon('training')} 季中特訓中：${item ? item.label : ""}</div>
      ${phaseLine}
      <p class="sub dark">本季已提升 +${p.midTraining.gained}/${MID_TRAINING_SEASON_CAP}・下次提升進度 ${pctv}%。受訓期間受傷風險上升${p.isPitcher ? "、疲勞恢復-20%" : ""}${p.age >= 30 ? "・30歲以上效率減半" : ""}。</p>
      <div class="injurybar slim trainbar"><div style="width:${pctv}%"></div></div>
      <div class="btnrow"><button id="btn-stop-training" class="btn-danger">停止特訓</button></div>
    </div>`;
  }
  const used = midTrainingPlayers(team).length;
  const slots = midTrainingSlots(team);
  const sel = UI.midTrainSel && items.some(it => it.key === UI.midTrainSel) ? UI.midTrainSel : items[0].key;
  return `<div class="card">
    <div class="eyebrow">${icon('training')} 季中特訓指派（${used}/${slots} 名額使用中）</div>
    ${phaseLine}
    <p class="sub dark">為球員指定一個加練項目：每個比賽日累積訓練點，滿100點提升對應能力（不超潛力、本季最多+${MID_TRAINING_SEASON_CAP}）。訓練設施與對應教練會加速累積；代價是受傷風險上升${p.isPitcher ? "與疲勞恢復變慢" : ""}${p.age >= 30 ? "，且30歲以上效率減半" : ""}。成長期年輕球員練起來最划算、衰退期老將效益有限。</p>
    <select id="mid-train-select" class="sortselect">
      ${items.map(it => `<option value="${it.key}"${it.key === sel ? " selected" : ""}>${it.label}（${it.attrLabel}）</option>`).join("")}
    </select>
    <div class="btnrow"><button id="btn-start-training" class="btn-primary" ${used >= slots ? "disabled" : ""}>${used >= slots ? "特訓名額已滿" : "開始特訓"}</button></div>
  </div>`;
}


/* ---------- v34：球員成績區塊（本季／上季／生涯通算） ---------- */
function statCells(p, st) {
  if (!st) return "";
  if (p.isPitcher) {
    return `<td>${st.G || 0}</td><td>${st.W || 0}</td><td>${st.L || 0}</td><td>${st.SV || 0}</td><td>${st.HD || 0}</td><td>${st.IP || 0}</td><td>${st.SO || 0}</td><td>${st.IP > 0 ? era(st).toFixed(2) : "-"}</td>`;
  }
  return `<td>${st.G || 0}</td><td>${st.AB || 0}</td><td>${st.H || 0}</td><td>${st.HR || 0}</td><td>${st.RBI || 0}</td><td>${st.SB || 0}</td><td>${st.AB > 0 ? battingAvg(st).toFixed(3).replace(/^0/, "") : "-"}</td>`;
}
function playerStatsSectionHtml(p) {
  const head = p.isPitcher
    ? `<tr><th></th><th>出賽</th><th>勝</th><th>敗</th><th>救援</th><th>中繼</th><th>局數</th><th>三振</th><th>防禦率</th></tr>`
    : `<tr><th></th><th>出賽</th><th>打數</th><th>安打</th><th>全壘打</th><th>打點</th><th>盜壘</th><th>打擊率</th></tr>`;
  const last = p.lastSeasonStats || null;
  const rows = [
    `<tr><td>本季</td>${statCells(p, p.seasonStats)}</tr>`,
    last ? `<tr><td>上季(第${last.year}年)</td>${statCells(p, last)}</tr>` : "",
    `<tr><td>生涯通算</td>${statCells(p, p.careerStats)}</tr>`
  ].filter(Boolean).join("");
  /* v54 A2：育成/二軍期間成績日誌 */
  var devLogHtml = "";
  if (p.devSeasonLog && p.devSeasonLog.length > 0) {
    devLogHtml += `<div class="divlabel">育成期間紀錄（${p.devSeasonLog.length} 季）</div><table class="stattable"><thead>${head}</thead><tbody>`;
    p.devSeasonLog.slice().reverse().forEach(function(log) {
      devLogHtml += `<tr><td>第${log.year || "?"}年</td>${statCells(p, log)}</tr>`;
    });
    devLogHtml += `</tbody></table>`;
  }
  if (p.minorSeasonLog && p.minorSeasonLog.length > 0) {
    devLogHtml += `<div class="divlabel">二軍期間紀錄（${p.minorSeasonLog.length} 季）</div><table class="stattable"><thead>${head}</thead><tbody>`;
    p.minorSeasonLog.slice().reverse().forEach(function(log) {
      devLogHtml += `<tr><td>第${log.year || "?"}年</td>${statCells(p, log)}</tr>`;
    });
    devLogHtml += `</tbody></table>`;
  }
  return `
      <div class="divlabel">成績一覽</div>
      <table class="stattable">
        <thead>${head}</thead>
        <tbody>${rows}</tbody>
      </table>${v51AdvancedStatsHtml(p)}${devLogHtml}`;
}

/* ====================================================================
   v51 A1③：進階數據區塊（可見度綁定分析室等級，呼應憲法第一支柱資訊不對稱）
   Lv.0 只有基礎；Lv.1 上壘與效率；Lv.2 數據拆解；Lv.3 真實能力指標。
   自家球員保底 Lv.1。未解鎖的層級顯示鎖定提示，讓玩家知道「還有東西看不到」。
   ==================================================================== */
const V51_METRIC_LABELS = {
  OBP: "上壘率", SLG: "長打率", OPS: "整體攻擊指數", ISO: "純長打率",
  BBpct: "保送率", Kpct: "三振率", BBK: "保送三振比", SBpct: "盜壘成功率",
  GIDP: "雙殺打", BABIP: "場內球安打率", wOBA: "加權上壘率",
  WHIP: "每局被上壘率", K9: "九局三振", BB9: "九局保送", HR9: "九局被轟",
  KBB: "三振保送比", RA9: "九局失分", FIP: "獨立防禦率",
  pBABIP: "場內球被安打率", unearnedPct: "非自責分佔比"
};
/* r008：每個進階指標的一句話中文解釋，用於 tooltip */
const V51_METRIC_TIPS = {
  OBP: "打者每次打席上壘的比率（含安打、保送、觸身）",
  SLG: "打者每打數創造的壘打數，反映長打能力",
  OPS: "上壘率＋長打率，一數看攻擊價值",
  ISO: "長打率減去打擊率，純粹衡量額外壘打力",
  BBpct: "打席中獲得四壞保送的比例，反映選球能力",
  Kpct: "打席中被三振的比例，越低越好",
  BBK: "保送數除以三振數，衡量打者紀律",
  SBpct: "盜壘成功次數占盜壘嘗試的比率",
  GIDP: "打出雙殺打的次數",
  BABIP: "場內球（非全壘打）落地後變安打的比率，可看運氣成分",
  wOBA: "按事件價值加權的上壘率，比 OPS 更精準衡量攻擊產出",
  WHIP: "投手每局平均被上壘人數（安打＋保送），越低越好",
  K9: "投手每九局三振數，衡量壓制力",
  BB9: "投手每九局保送數，越低越好",
  HR9: "投手每九局被全壘打數，越低越好",
  KBB: "三振數除以保送數，衡量投手控制力",
  RA9: "投手每九局失分（含自責與非自責），比 ERA 更全面",
  FIP: "只看三振、保送、全壘打估算的防禦率，排除守備影響",
  pBABIP: "投手被打出的場內球安打比率，可看守備與運氣",
  unearnedPct: "非自責分占總失分的比例，反映守備失誤影響"
};
function v51FormatMetric(key, a) {
  try {
    switch (key) {
      case "OBP": case "SLG": case "OPS": case "ISO": case "BABIP":
      case "wOBA": case "pBABIP":
        return v51Fmt3(a[key] || 0);
      case "BBpct": case "Kpct": case "SBpct": case "unearnedPct":
        return v51Pct(a[key] || 0);
      case "BBK": case "KBB": case "WHIP": case "K9": case "BB9":
      case "HR9": case "RA9": case "FIP":
        return v51Fmt2(a[key] || 0);
      case "GIDP":
        return String(a[key] || 0);
      default:
        return String(a[key] == null ? "-" : a[key]);
    }
  } catch (_) { return "-"; }
}
function v51AdvancedStatsHtml(p) {
  try {
    if (!p || !p.seasonStats) return "";
    const isPit = !!p.isPitcher;
    const kind = isPit ? "pit" : "bat";
    const ownTeam = (S && S.teams) ? S.teams[S.userTeamId] : null;
    const isOwn = !!(p.team && S && p.team === S.userTeamId);
    const tier = v51VisibleTier(ownTeam, isOwn);
    const a = isPit ? v51PitcherAdvanced(p.seasonStats) : v51BatterAdvanced(p.seasonStats);
    // 樣本不足時不顯示（避免 3 打數 1 支就 1.000 的誤導）
    const enough = isPit ? (a.IP >= 10) : (a.AB >= 30);
    if (!enough) {
      return `<div class="divlabel">進階數據</div>
        <p class="sub dark">本季樣本不足（${isPit ? "投球局數未滿 10 局" : "打數未滿 30 打數"}），進階數據暫不顯示。</p>`;
    }
    /* v55 Phase 2：樣本數與信心徽章 */
    const v55adv = (typeof v55ComputeAdvancedStats === "function") ? v55ComputeAdvancedStats(p.seasonStats, isPit) : null;
    const sampleN = v55adv ? v55adv.samplePA : (isPit ? (p.seasonStats.BF || 0) : ((p.seasonStats.AB || 0) + (p.seasonStats.BB || 0) + (p.seasonStats.HBP || 0) + (p.seasonStats.SF || 0)));
    const conf = v55adv ? v55adv.confidence : (sampleN >= 400 ? "reliable" : (sampleN >= 150 ? "moderate" : "insufficient"));
    const confLabel = conf === "reliable" ? "可靠" : (conf === "moderate" ? "參考" : "不足");
    const confClass = conf === "reliable" ? "v55conf-ok" : (conf === "moderate" ? "v55conf-mid" : "v55conf-low");
    const sampleLabel = isPit ? "面對打者" : "打席數";
    let html = `<div class="divlabel">進階數據 <span class="v55sample-badge ${confClass}">${sampleLabel} ${sampleN}・${confLabel}</span></div>`;
    let anyLocked = false;
    for (let t = 1; t <= 3; t++) {
      const keys = (V51_TIERS[kind][t] || []);
      if (!keys.length) continue;
      if (t > tier) { anyLocked = true; continue; }
      const cells = keys.map(k =>
        `<div class="v51adv-item" title="${V51_METRIC_TIPS[k] || ""}"><span class="v51adv-k">${V51_METRIC_LABELS[k] || k}</span>` +
        `<span class="v51adv-v">${v51FormatMetric(k, a)}</span></div>`).join("");
      html += `<div class="v51adv-tier"><div class="v51adv-tierlabel">${V51_TIER_LABELS[t]}</div>` +
              `<div class="v51adv-grid">${cells}</div></div>`;
    }
    /* v55 Phase 2：Tier 3 擊球品質指標（從 v55ComputeAdvancedStats） */
    if (tier >= 3 && v55adv) {
      const bbKeys = isPit
        ? [["GB%","滾地球率"], ["HardHit%","強襲球率"], ["Barrel%","甜蜜點率"]]
        : [["GB%","滾地球率"], ["LD%","平飛球率"], ["FB%","飛球率"], ["HardHit%","強襲球率"], ["Barrel%","甜蜜點率"]];
      const bbCells = bbKeys.map(([k,label]) =>
        `<div class="v51adv-item"><span class="v51adv-k">${label}</span>` +
        `<span class="v51adv-v">${v55adv[k] != null ? v55adv[k].toFixed(1) + "%" : "—"}</span></div>`).join("");
      html += `<div class="v51adv-tier"><div class="v51adv-tierlabel">擊球品質分析</div>` +
              `<div class="v51adv-grid">${bbCells}</div></div>`;
      if (isPit) {
        const eraP = v55adv["ERA+"];
        html += `<div class="v51adv-tier"><div class="v51adv-tierlabel">聯盟校準</div>` +
                `<div class="v51adv-grid"><div class="v51adv-item"><span class="v51adv-k">ERA+</span><span class="v51adv-v">${eraP || "—"}</span></div></div></div>`;
      } else {
        const opsP = v55adv["OPS+"];
        html += `<div class="v51adv-tier"><div class="v51adv-tierlabel">聯盟校準</div>` +
                `<div class="v51adv-grid"><div class="v51adv-item"><span class="v51adv-k">OPS+</span><span class="v51adv-v">${opsP || "—"}</span></div></div></div>`;
      }
    }
    /* v55 Phase 2：運氣校正面板（Tier 3 且 isOwn） */
    if (tier >= 3 && isOwn && typeof v55LuckIndicators === "function") {
      const luck = v55LuckIndicators(p.seasonStats, isPit);
      if (luck && luck.reliable) {
        html += v55LuckPanelHtml(luck, isPit);
      } else if (luck) {
        html += `<div class="v55luck-panel"><div class="v55luck-title">${icon('chart')} 運氣校正</div>` +
                `<p class="sub dark">樣本數不足（${isPit ? luck.sampleBF + " 面對打者" : luck.samplePA + " 打席"}），運氣校正需累積更多數據。</p></div>`;
      }
    }
    if (anyLocked) {
      const nextLv = tier + 1;
      html += `<p class="sub dark">升級分析室至 Lv.${nextLv} 可解鎖「${V51_TIER_LABELS[nextLv] || ""}」` +
              `（目前分析室 Lv.${(typeof analysisRoomLevel === "function" && ownTeam) ? analysisRoomLevel(ownTeam) : 0}）。</p>`;
    }
    return html;
  } catch (_) { return ""; }
}

/* v55 Phase 2：運氣校正面板 HTML 生成 */
function v55LuckPanelHtml(luck, isPitcher) {
  try {
    const arrow = (v) => v > 0 ? icon('chart-up') : (v < 0 ? icon('chart-down') : "—");
    const luckClass = luck.luckDirection === "lucky" ? "v55luck-lucky" : (luck.luckDirection === "unlucky" ? "v55luck-unlucky" : "v55luck-neutral");
    const luckWord = luck.luckDirection === "lucky" ? "好運偏高" : (luck.luckDirection === "unlucky" ? "壞運偏多" : "運氣中性");
    const f3 = (v) => (v == null) ? "—" : (typeof v === "number" ? v.toFixed(3) : String(v));
    const f2 = (v) => (v == null) ? "—" : (typeof v === "number" ? v.toFixed(2) : String(v));
    const sign = (v) => (v > 0 ? "+" : "") + f3(v);
    let rows = "";
    if (isPitcher) {
      rows = `<tr><td>防禦率 ERA</td><td>${f2(luck.ERA)}</td><td>${f2(luck.FIP)}</td><td class="${luckClass}">${sign(luck.eraFipGap)}</td></tr>` +
             `<tr><td>被打 BABIP</td><td>${f3(luck.BABIP)}</td><td>.300</td><td class="${luck.babipDelta > 0.02 ? "v55luck-unlucky" : (luck.babipDelta < -0.02 ? "v55luck-lucky" : "v55luck-neutral")}">${sign(luck.babipDelta)}</td></tr>`;
      const insight = luck.eraFipGap < -0.5 ? "ERA 遠低於 FIP，防禦率很可能回升（趁高賣出）。"
                    : luck.eraFipGap > 0.5 ? "ERA 遠高於 FIP，真實能力優於帳面（低買良機）。"
                    : "ERA 與 FIP 接近，表現與能力相符。";
      return `<div class="v55luck-panel"><div class="v55luck-title">${icon('chart')} 運氣校正 <span class="v55luck-tag ${luckClass}">${luckWord}</span></div>` +
             `<table class="stattable v55luck-table"><thead><tr><th>指標</th><th>實際</th><th>預期</th><th>差距</th></tr></thead><tbody>${rows}</tbody></table>` +
             `<p class="sub dark v55luck-insight">${insight}</p></div>`;
    } else {
      rows = `<tr><td>打擊率 AVG</td><td>${f3(luck.AVG)}</td><td>${f3(luck.xAVG)}</td><td class="${luck.avgLuck > 0.015 ? "v55luck-lucky" : (luck.avgLuck < -0.015 ? "v55luck-unlucky" : "v55luck-neutral")}">${sign(luck.avgLuck)}</td></tr>` +
             `<tr><td>BABIP</td><td>${f3(luck.BABIP)}</td><td>${f3(luck.xBABIP)}</td><td class="${luckClass}">${sign(luck.babipLuck)}</td></tr>` +
             `<tr><td>強襲球率</td><td>${luck["HardHit%"].toFixed(1)}%</td><td colspan="2">聯盟均值 30%</td></tr>` +
             `<tr><td>甜蜜點率</td><td>${luck["Barrel%"].toFixed(1)}%</td><td colspan="2">聯盟均值 7%</td></tr>`;
      const insight = luck.babipLuck > 0.025 ? "BABIP 高於擊球品質預期，明年打擊率很可能下修（趁高賣出）。"
                    : luck.babipLuck < -0.025 ? "BABIP 低於擊球品質預期，打擊率明年有望回彈（低買良機）。"
                    : "擊球品質與實際成績一致，表現可信。";
      return `<div class="v55luck-panel"><div class="v55luck-title">${icon('chart')} 運氣校正 <span class="v55luck-tag ${luckClass}">${luckWord}</span></div>` +
             `<table class="stattable v55luck-table"><thead><tr><th>指標</th><th>實際</th><th>預期</th><th>差距</th></tr></thead><tbody>${rows}</tbody></table>` +
             `<p class="sub dark v55luck-insight">${insight}</p></div>`;
    }
  } catch (_) { return ""; }
}

function renderPlayerDetail() {
  const p = S.players[UI.selectedPlayerId];
  if (!p) {
    // 球員可能剛透過「建議退休轉任」或「臨時兼任」離開現役名單；若還有待處理的卡片就先顯示，否則直接返回名單
    if (UI.coachRefusal || UI.retireOffer) {
      app.innerHTML = `<div class="wrap">${renderCoachRefusalCard()}${renderRetireOfferCard()}<div class="btnrow"><button id="btn-back" class="btn-outline">返回名單</button></div></div>`;
      document.getElementById("btn-back").onclick = () => { UI.screen = UI.playerDetailReturn || "roster"; UI.playerDetailReturn = null; render(); };
      wireCoachRefusalCard();
      wireRetireOfferCard();
      return;
    }
    UI.screen = UI.playerDetailReturn || "roster";
    UI.playerDetailReturn = null;
    render();
    return;
  }
  const team = S.teams[p.team];
  const isCatcher = !p.isPitcher && p.positions.some(x => x.pos === "C");
  let body = "";
  if (p.isPitcher) {
    body = `
      <div class="attrgrid">
        <div class="attr"><span>球速</span><b>${velocityKmh(p.velocity)} km/h</b></div>
        <div class="attr"><span>控球</span><b>${p.control}</b></div>
        <div class="attr"><span>體力</span><b>${p.stamina}</b></div>
        <div class="attr"><span>耐久度</span><b>${p.durability}</b></div>
        <div class="attr"><span>疲勞度</span><b>${fatigueOf(p)}${fatigueOf(p) > 70 ? "（過勞）" : ""}</b></div>
        <div class="attr"><span>潛力值</span><b>${p.potential}</b></div>
      </div>
      <div class="divlabel">球路組合</div>
      <table class="stattable">
        <thead><tr><th>球種</th><th>球威</th><th>控球</th></tr></thead>
        <tbody>
          ${p.pitches.map(pt => `<tr><td>${pt.type}</td><td>${pt.stuff}</td><td>${pt.control}</td></tr>`).join("")}
        </tbody>
      </table>`;
  } else {
    body = `
      <div class="attrgrid">
        <div class="attr"><span>接觸力</span><b>${p.contact}</b></div>
        <div class="attr"><span>長打力</span><b>${p.power}</b></div>
        <div class="attr"><span>選球眼</span><b>${p.eye}</b></div>
        <div class="attr"><span>對左投</span><b>${p.vsL}</b></div>
        <div class="attr"><span>對右投</span><b>${p.vsR}</b></div>
        <div class="attr"><span>跑壘速度</span><b>${p.speed}</b></div>
        <div class="attr"><span>盜壘</span><b>${p.steal}</b></div>
        <div class="attr"><span>觸擊</span><b>${p.bunting || "-"}</b></div>
        <div class="attr"><span>守備成功率</span><b>${p.fielding}%</b></div>
        <div class="attr"><span>臂力</span><b>${p.arm}</b></div>
        <div class="attr"><span>體力</span><b>${p.stamina}</b></div>
        <div class="attr"><span>耐久度</span><b>${p.durability}</b></div>
        <div class="attr"><span>潛力值</span><b>${p.potential}</b></div>
      </div>
      <div class="divlabel">守備位置（多重守位）</div>
      <table class="stattable">
        <thead><tr><th>位置</th><th>熟練度</th></tr></thead>
        <tbody>${p.positions.map(x => `<tr><td>${POS_LABEL[x.pos]}</td><td>${x.rating}</td></tr>`).join("")}</tbody>
      </table>
      ${isCatcher ? `
      <div class="divlabel">捕手專項</div>
      <div class="attrgrid">
        <div class="attr"><span>配球引導</span><b>${p.gameCalling}</b></div>
        <div class="attr"><span>接捕框架</span><b>${p.framing}</b></div>
        <div class="attr"><span>阻擋</span><b>${p.blocking != null ? p.blocking : "—"}</b></div>
        <div class="attr"><span>傳球時間</span><b>${p.popTime != null ? p.popTime : "—"}</b></div>
        <div class="attr"><span>投手調教</span><b>${p.pitcherHandling != null ? p.pitcherHandling : "—"}</b></div>
        <div class="attr"><span>阻殺跑壘</span><b>${p.caughtStealing}</b></div>
      </div>` : ""}`;
  }
  const isMidSeason = S.currentDay > 0 && S.currentDay < (S.schedule ? S.schedule.length : 129);
  const isOwnActivePlayer = !p.retired && team && team.id === S.userTeamId;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar">
        <div>
          <div class="eyebrow">${team.name} ・ ${p.level}</div>
          <div class="teamname">${p.name}</div>
        </div>
        <div class="gmtag">${p.age}歲／${p.isPitcher ? (p.throws + "投") : (p.bats + "打・" + p.throws + "投")}</div>
      </div>
      ${(() => { try { return (typeof themePlayerPhoto === "function") ? themePlayerPhoto(p.id, { player: p, teamId: p.team, isAway: false }) : ""; } catch(_){ return ""; } })()}
      <div style="margin-bottom:8px;">
        <span class="nationtag">${(typeof v53NationFlagByName === "function") ? v53NationFlagByName(nationDisplay(p), 18) : ""}${nationDisplay(p)}</span>
        ${conditionTagHtml(p)} <span class="sub dark" style="font-size:13px;">狀況：${CONDITION_LABELS[conditionOf(p)]}</span>
        ${traitTagsHtml(p)}${legacyTagsHtml(p)}${injuryProneTagHtml(p)}${agentTagHtml(p)}
      </div>
      ${renderCoachRefusalCard()}
      ${renderRetireOfferCard()}
      <div class="attrgrid" style="margin-bottom:10px;">
        <div class="attr"><span>合約年限</span><b>${p.contractYears || "-"}年</b></div>
        <div class="attr"><span>年薪</span><b>${p.salary ? formatMoney(p.salary) : "-"}</b></div>
      </div>
      ${isInjured(p) ? (p.injury.pendingSurgery ? `
      <div class="card issuecard">
        <div class="eyebrow">${icon('medical')} 重傷：等待治療方針決定</div>
        <p class="sub dark">${p.injury.name}（${p.injury.part}），基礎恢復期約 ${p.injury.totalDays} 天。請至<b>主控台</b>選擇「手術治療」或「保守治療」，決策前恢復不會開始。</p>
      </div>` : `
      <div class="card injurycard">
        <div class="eyebrow">傷勢狀態：${p.injury.severityLabel}傷勢${p.injury.method === "surgery" ? "（術後復健中）" : (p.injury.method === "conservative" ? "（保守治療中）" : "")}</div>
        <p class="sub dark">${p.injury.name}${p.injury.part ? `（${p.injury.part}）` : ""}，預計還需 ${p.injury.daysLeft} 天恢復（共 ${p.injury.totalDays} 天）・復健進度 ${Math.round((p.injury.totalDays - p.injury.daysLeft) / p.injury.totalDays * 100)}%。傷癒前無法出賽，打線與投手調度會自動跳過他。</p>
        <div class="injurybar"><div style="width:${Math.round((p.injury.totalDays - p.injury.daysLeft) / p.injury.totalDays * 100)}%"></div></div>
      </div>`) : ""}
      ${renderCaptainSection(p, team)}
      ${renderMidTrainingSection(p, team)}
      ${body}
      ${playerStatsSectionHtml(p)}
      ${(p.injuryHistory || []).length > 0 ? `
      <div class="divlabel">傷病史（近${Math.min(20, p.injuryHistory.length)}筆）</div>
      <table class="stattable">
        <thead><tr><th>年度</th><th>傷勢</th><th>部位</th><th>等級</th><th>天數</th><th>備註</th></tr></thead>
        <tbody>${p.injuryHistory.slice().reverse().map(h => `<tr>
          <td>第${h.year}年</td><td>${h.recur ? ""+icon('refresh')+"" : ""}${h.name}</td><td>${h.part}</td><td>${h.severityLabel}</td><td>${h.days}</td>
          <td>${h.method === "surgery" ? "手術" : (h.method === "conservative" ? "保守" : "－")}${h.downgraded ? `・後遺症（${h.downgraded}）` : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <p class="draftnote muted">中重度傷病史越多，日後受傷與同部位復發的風險越高（復健中心可削減）；${icon('refresh')}＝舊傷復發。</p>` : ""}
      ${isOwnActivePlayer ? renderV54RosterMoveCard(p, team) : ""}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回名單</button></div>
      ${isOwnActivePlayer ? (() => {
        const sel = UI.suggestRole || "coach|1軍|總教練";
        const [selType, selLevel, selRole] = sel.split("|");
        const opt = v => (v === sel ? " selected" : "");
        const locked = roleOfferLockedThisYear(p);
        return `
      <div class="card">
        <div class="eyebrow">球隊事務</div>
        <p class="sub dark">${isMidSeason ? "球季進行中：仍可徵詢兼任教練／球探（現役球員在球季中意願很低），或直接釋出球員。" : "休賽季：可建議球員退休轉任教練／球探（單次判定，婉拒後本休賽季不再考慮），或直接釋出球員。"}</p>
        <select id="role-suggest-select" class="sortselect" ${locked ? "disabled" : ""}>
          <optgroup label="教練（1軍）">${COACH_ROLES.map(r => `<option value="coach|1軍|${r}"${opt(`coach|1軍|${r}`)}>1軍 ${r}</option>`).join("")}</optgroup>
          <optgroup label="教練（2軍）">${COACH_ROLES.map(r => `<option value="coach|2軍|${r}"${opt(`coach|2軍|${r}`)}>2軍 ${r}</option>`).join("")}</optgroup>
          <optgroup label="球探">
            <option value="scout||domestic"${opt("scout||domestic")}>國內球探</option>
            <option value="scout||international"${opt("scout||international")}>國際球探</option>
            <option value="scout||trade"${opt("scout||trade")}>交易球探</option>
          </optgroup>
        </select>
        ${locked ? "" : renderRoleComparison(p, S.teams[S.userTeamId], selType, selLevel, selRole)}
        <div class="btnrow">
          <button id="btn-suggest-role" class="btn-secondary" ${locked ? "disabled" : ""}>${locked ? "本休賽季已婉拒過" : (isMidSeason ? "徵詢兼任（單次判定）" : "建議退休轉任（單次判定）")}</button>
        </div>
        ${UI.releaseConfirmId === p.id ? `
        <div class="card resetcard" style="margin-top:10px;">
          <div class="eyebrow">確認釋出</div>
          <p class="sub dark">確定要將 ${p.name} 釋出至自由球員市場嗎？他將立即離隊，之後可能被其他球隊簽走。</p>
          ${(typeof renderReleaseImpact === "function") ? renderReleaseImpact(p, S.teams[S.userTeamId]) : ""}
          <div class="btnrow">
            <button id="btn-release-cancel" class="btn-secondary">取消</button>
            <button id="btn-release-confirm" class="btn-danger-solid">確定釋出</button>
          </div>
        </div>` : `
        <div class="btnrow">
          <button id="btn-release-player" class="btn-danger">釋出至自由球員市場</button>
        </div>`}
      </div>`;
      })() : ""}
    </div>`;
  document.getElementById("btn-back").onclick = () => { if (UI.prevRosterTab) { UI.rosterTab = UI.prevRosterTab; } UI.screen = UI.playerDetailReturn || "roster"; UI.playerDetailReturn = null; render(); };
  wireCoachRefusalCard();
  wireRetireOfferCard();
  // v26季中特訓卡按鈕
  const mtSel = document.getElementById("mid-train-select");
  if (mtSel) mtSel.onchange = e => { UI.midTrainSel = e.target.value; };
  const mtStart = document.getElementById("btn-start-training");
  if (mtStart && !mtStart.disabled) mtStart.onclick = () => assignMidTraining(p.id, (mtSel && mtSel.value) || UI.midTrainSel || midItemsFor(p)[0].key);
  const mtStop = document.getElementById("btn-stop-training");
  if (mtStop) mtStop.onclick = () => stopMidTraining(p.id);
  // v37④ 任命隊長
  const capBtn = document.getElementById("btn-appoint-captain");
  if (capBtn) capBtn.onclick = () => {
    const r = appointCaptain(team, p.id);
    UI.flash = r.msg;
    if (r.ok) persist();
    render();
  };
  if (isOwnActivePlayer) {
    const roleSel = document.getElementById("role-suggest-select");
    if (roleSel && !roleSel.disabled) roleSel.onchange = e => { UI.suggestRole = e.target.value; render(); };
    const suggestBtn = document.getElementById("btn-suggest-role");
    if (suggestBtn && !suggestBtn.disabled) suggestBtn.onclick = () => {
      const [roleType, level, role] = (UI.suggestRole || roleSel.value).split("|");
      suggestPlayerRetireForRole(p.id, level, role, roleType);
    };
    const relBtn = document.getElementById("btn-release-player");
    if (relBtn) relBtn.onclick = () => { UI.releaseConfirmId = p.id; render(); };
    const relCancel = document.getElementById("btn-release-cancel");
    if (relCancel) relCancel.onclick = () => { UI.releaseConfirmId = null; render(); };
    const relConfirm = document.getElementById("btn-release-confirm");
    if (relConfirm) relConfirm.onclick = () => releaseActivePlayer(p.id);
  }
  /* v54 A2：六方向升降級按鈕事件綁定 */
  var v54d2m = document.getElementById("btn-v54-dev-to-minor");
  if (v54d2m) v54d2m.onclick = function() { v54PromoteDevToMinor(p.id); };
  var v54d2M = document.getElementById("btn-v54-dev-to-major");
  if (v54d2M) v54d2M.onclick = function() { v54PromoteDevToMajor(p.id); };
  var v54m2M = document.getElementById("btn-v54-minor-to-major");
  if (v54m2M) v54m2M.onclick = function() { v54PromoteMinorToMajor(p.id); };
  var v54m2d = document.getElementById("btn-v54-minor-to-dev");
  if (v54m2d) v54m2d.onclick = function() { v54DemoteMinorToDev(p.id); };
  var v54M2m = document.getElementById("btn-v54-major-to-minor");
  if (v54M2m) v54M2m.onclick = function() { v54DemoteMajorToMinor(p.id); };
  var v54M2d = document.getElementById("btn-v54-major-to-dev");
  if (v54M2d) v54M2d.onclick = function() { v54DemoteMajorToDev(p.id); };
}

/* ---------- 初始化 ---------- */
/* v34：把「載入存檔→升級鏈→畫面還原」抽成 hydrateLoadedState()，
   供開頁初始化、手動槽位讀取、JSON匯入三處共用。 */
function hydrateLoadedState(saved) {
      S = saved;
      // v35：槽位讀檔／JSON匯入不會重整頁面，先清掉上一份進度殘留的暫時性UI狀態，
      // 避免舊談判視窗/教練候選清單/確認框帶進新讀入的存檔。
      UI.negotiation = null; UI.coachPicker = null; UI.coachCandidates = null;
      UI.scoutPicker = null; UI.scoutCandidates = null; UI.intlSquad = null; // v38③：國際賽選人暫存亦屬暫時性UI狀態
      UI.coachRefusal = null; UI.retireOffer = null; UI.releaseConfirmId = null;
      UI.saveConfirm = null; UI.flash = null;
      if (S.playoffs === undefined) S.playoffs = null;
      if (S.draft === undefined) S.draft = null;
      if (S.offseasonSummary === undefined) S.offseasonSummary = null;
      if (S.coaches === undefined) S.coaches = {};
      Object.values(S.teams).forEach(t => {
        if (!t.scouts) {
          t.scouts = {
            domestic: t.scout || generateScout(t.id, "domestic"),
            international: generateScout(t.id, "international"),
            trade: generateScout(t.id, "trade")
          };
          delete t.scout;
        }
        if (!t.coachStaff) {
          const { coaches: staffCoaches, staff } = buildCoachStaff(t.id);
          Object.assign(S.coaches, staffCoaches);
          t.coachStaff = staff;
        }
      });
      if (S.seasonYear === undefined) S.seasonYear = 1;
      if (S.retiredPlayers === undefined) S.retiredPlayers = {};
      if (S.lastAwards === undefined) S.lastAwards = null;
      // v56：舊存檔 lastAwards 從全聯盟 flat 格式遷移至 per-league 格式
      if (S.lastAwards && S.lastAwards.mvp !== undefined && !S.lastAwards.A) {
        const _oa = S.lastAwards;
        const _na = { year: _oa.year };
        ["A", "B"].forEach(function(_r) {
          _na[_r] = {
            mvp: _oa.mvp, battingTitle: _oa.battingTitle, homeRunTitle: _oa.homeRunTitle,
            hitsTitle: _oa.hitsTitle, rbiTitle: _oa.rbiTitle, stolenBaseTitle: _oa.stolenBaseTitle,
            eraTitle: _oa.eraTitle, winsTitle: _oa.winsTitle, strikeoutTitle: _oa.strikeoutTitle,
            saveTitle: _oa.saveTitle, holdTitle: _oa.holdTitle, rookieOfYear: _oa.rookieOfYear,
            goldenBat: _oa.goldenBat && _oa.goldenBat[_r] ? _oa.goldenBat[_r] : null,
            goldenArm: _oa.goldenArm && _oa.goldenArm[_r] ? _oa.goldenArm[_r] : null,
            bestNine: _oa.bestNine && _oa.bestNine[_r] ? _oa.bestNine[_r] : {},
            goldenGlove: _oa.goldenGlove && _oa.goldenGlove[_r] ? _oa.goldenGlove[_r] : {}
          };
        });
        S.lastAwards = _na;
      }
      // 舊存檔補上野手抗壓性欄位（第一次載入舊版存檔時）
      [S.players, S.retiredPlayers].forEach(pool => {
        Object.values(pool).forEach(p => { if (!p.isPitcher && p.composure === undefined) p.composure = genRating(); });
      });
      Object.values(S.teams).forEach(t => { if (!t.bullpenOrder) t.bullpenOrder = {}; });
      if (!S.pendingCoachHires) S.pendingCoachHires = [];
      // 舊存檔補上財務系統欄位（第一次載入舊版存檔時）
      ensureAllFinance();
      Object.values(S.teams).forEach(t => refreshPayroll(t, S.players));
      if (!S.freeAgents) S.freeAgents = {};
      // 舊存檔補上新版談約/財務/票價系統欄位（第一次載入舊版存檔時）：
      // 舊存檔視為「已經開打過」，不會被拉回開局的休賽季流程。
      if (S.gameStarted === undefined) S.gameStarted = true;
      if (S.pendingContractRenewals === undefined) S.pendingContractRenewals = [];
      if (S.forcedCutRequired === undefined) S.forcedCutRequired = false;
      Object.values(S.teams).forEach(t => {
        ensureFinance(t);
        if (t.finance.ticketPriceCap === undefined) t.finance.ticketPriceCap = TICKET_PRICE_CEIL_DEFAULT;
      });
      ID_SEQ = S.idSeq || 999999;
      ensureV25(); // v25：舊存檔一次性升級（40國/特質/觸擊/狀況/疲勞/新聞/春訓旗標，並清除舊制季中徵召殘留）
      ensureV26(); // v26：舊存檔一次性升級（傷病史/傷勢部位/新設施三件套/殘留特訓清除）
      ensureV27(); // v27：舊存檔一次性升級（經紀人/球團個性/GM記憶/信任度與KPI）
      ensureV28(); // v28：舊存檔一次性升級（東山再起生涯段落/代理人事務所）
      ensureV29(); // v29：舊存檔一次性升級（行銷活動制/合約方案物件/上季成績快照）
      ensureV30(); // v30：球場格位設施/主客場帳/等級換算補發設施
      ensureV31(); // v31：球場屋齡/球探合約年限/均衡稅欄位/教練球探空缺旗標
      ensureV32(); // v32：AI交易狀態/KPI連續性/交易窗口旗標/季中檢視欄位
      ensureV33(); // v33：委任/解職與再起次數/沉潛旗標/事務所應酬・引薦・情報容器
      ensureV34(); // v34：連續模擬中斷事件容器
      ensureV35(); // v35：殘留幕僚佇列消毒/空缺旗標同步/AI隊補缺/休賽季還原旗標
      if (typeof ensureV41 === "function") ensureV41();
      if (typeof ensureV491 === "function") ensureV491(); // v491：固定隊名品牌
      if (typeof ensureV50 === "function") ensureV50(); // v50：品牌色彩欄位＋美術接口定案
      if (typeof ensureV51 === "function") ensureV51(); // v51：A1 進階數據欄位惰性補齊
      if (typeof ensureV52 === "function") ensureV52(); // v52：逐打席欄位＋A5 捕手專項補完惰性補齊 // v41：舊檔一律補 gameMode="gm_coach"（v40玩家本來就在手排，不破壞既有存檔）＋接管/需求單/史冊/標籤/耐心容器
      /* v54 A2：育成聯盟存檔遷移 */
      if (typeof ensureV54 === "function") ensureV54();
      /* r010 V55-MIG-001：三條正式讀檔路徑共用此 hydrate，於 V54 後補齊 V55 狀態。 */
      if (typeof ensureV55 === "function") ensureV55();
      // v39.1：開幕選秀殘骸遷移——舊版存檔若已開打、仍在第1年、掛著「已結束且無opening欄位」的
      // 選秀物件，即為被bug吞掉第二屆選秀的狀態（開幕選秀殘影）；清除之，讓第1季休賽季能正常
      // 舉辦自己的選秀。新版選秀物件一律帶opening欄位，正常辦完的休賽季選秀不會被誤清。
      if (S.gameStarted && S.seasonYear === 1 && S.draft && !S.draft.active && S.draft.opening === undefined) {
        S.draft = null;
        S.draftDoneYear = 0;
      }
      // 依目前實際卡在哪個流程階段還原畫面，避免重新整理頁面時遺失選秀/談約/裁員進度
      if (!S.userTeamId) UI.screen = "teamSelect";
      else if (S.gmCareer && S.gmCareer.fired && !S.sabbatical) UI.screen = "gameOver"; // v35：解職中優先回生涯總結/邀約畫面（先前會被殘留佇列劫走）
      else if (S.draft && S.draft.active) UI.screen = "draft";
      else if (S.forcedCutRequired) UI.screen = "financeCuts";
      else if ((S.pendingContractRenewals || []).length > 0) UI.screen = "contractRenewals";
      else if ((S.pendingStaffRenewals || []).length > 0) UI.screen = "staffRenewal"; // v31
      else if (S.gameStarted && S.offseasonEnteredYear === S.seasonYear && S.offseasonSummary) UI.screen = "offseasonSummary"; // v35：休賽季進行中重載→回摘要（先前落到dashboard，可能經頒獎鈕二次結算）
      else if (!S.gameStarted) UI.screen = "offseasonSummary";
      else if (S.intlTournament && S.intlTournament.year === S.seasonYear && !S.intlTournament.done) UI.screen = "intlTournament";
      else if (S.currentDay === 0 && S.springCampDoneYear !== S.seasonYear && S.springCamp && S.springCamp.year === S.seasonYear) UI.screen = S.springCamp.executed ? "springReport" : "springCamp";
      else UI.screen = "dashboard";
}
(async function init() {
  // v35.1：開機防護——讀檔／還原／渲染任一環節出錯，都導向安全模式救援畫面，杜絕白屏「完全無法開啟」
    // r009：只套用隨遊戲交付的官方美術；玩家不再自行匯入或覆蓋主題。
    try { if (typeof v54ApplyBuiltinTheme === "function") v54ApplyBuiltinTheme(); } catch (_) {}
  let saved = null;
  try { saved = await loadState(); }
  catch (e) { saved = null; }          // 讀檔失敗（IndexedDB異常等）→ 當作無存檔
  UI.__rawSave = saved || null;         // 暫存原始存檔，供安全模式匯出（即使還原失敗也能匯出給開發者）
  try {
    if (saved) hydrateLoadedState(saved);
    else UI.screen = "setup";
  } catch (e) {
    // v35.1：還原存檔拋錯——不再靜默吃掉存檔，改進安全模式（保留存檔可匯出）
    UI.__bootError = "還原存檔時發生錯誤：" + ((e && e.message) || e);
    UI.screen = "bootRecovery";
  }
  render(); // render 內已自帶 try/catch，渲染拋錯會自動落到安全模式
})();

/* ====================================================================
   v41 UI 附錄：開局身分模式選擇畫面／需求單卡／接管到期決策卡
   ==================================================================== */
function renderGameModePick() {
  app.innerHTML = `
    <div class="wrap">
      <div class="hero">
        <div class="eyebrow">CHOOSE YOUR SEAT</div>
        <h1>這一局，你是誰？</h1>
        <p class="sub">開局身分決定你與總教練的權力邊界。之後隨時可「全面放權」轉為純GM（免費的正面事件），但反向只能透過有代價的「接管」——權力收回來，帳單跟著來。</p>
      </div>
      <div class="card">
        <div class="eyebrow">${(typeof assetSlot === "function" ? assetSlot("coach.portrait") : ""+icon('suit')+"")} 純 GM 模式（北極星推薦）</div>
        <p class="sub dark">每日打線、板凳與輪休全權交給總教練——他會依自己的<b>棒球哲學</b>執行你的方針、主動遞出<b>補強需求單</b>。你專注在補強、財務與談判。看不下去時可以「接管」，但教練信任會重挫、聯盟會記住你是個愛管現場的GM。</p>
        <button id="btn-mode-pure" class="btn-primary">以純 GM 開局</button>
      </div>
      <div class="card">
        <div class="eyebrow">${icon('cap')} GM 兼教練模式</div>
        <p class="sub dark">維持 v40 玩法：可隨時在「教練排線／GM手排」之間切換，親手固定打線與板凳專員。日後可一鍵放權轉為純GM。</p>
        <button id="btn-mode-gmcoach" class="btn-secondary">以 GM 兼教練開局</button>
      </div>
    </div>`;
  document.getElementById("btn-mode-pure").onclick = () => pickGameMode("pure_gm");
  document.getElementById("btn-mode-gmcoach").onclick = () => pickGameMode("gm_coach");
}

// v41③：需求單卡（掛既有📋待辦分頁；郵件中樞完全體排 v43+）。open 卡帶 issuecard class → 紅點逐卡精確計數。
function renderDemandCards(team) {
  if (!S || !Array.isArray(S.demands)) return "";
  const open = S.demands.filter(d => d.status === "open");
  const accepted = S.demands.filter(d => d.status === "accepted");
  if (open.length === 0 && accepted.length === 0) return "";
  const prLabel = { high: ""+icon('prio-high')+" 高", mid: ""+icon('prio-mid')+" 中", low: ""+icon('prio-low')+" 低" };
  const coachName = d => { const c = S.coaches[d.coachId]; return c ? c.name : "（已離任教練）"; };
  const ATTR_LABEL = { contact: "接觸", power: "長打", eye: "選球", speed: "速度", fielding: "守備", control: "控球", velocity: "球速", stamina: "體力" };
  const needTxt = d => {
    const parts = [];
    if (d.need.pos === "SP") parts.push("先發投手");
    else if (d.need.pos === "RP") parts.push("後援投手");
    else if (d.need.pos) parts.push(`能守${POS_LABEL[d.need.pos] || d.need.pos}的野手`);
    else parts.push("野手");
    Object.keys(d.need.attrs || {}).forEach(k => parts.push(`${ATTR_LABEL[k] || k}≥${d.need.attrs[k]}`));
    return parts.join("・");
  };
  // v46④ 球探盤點：陣中符合條件的人選（可拔擢）＋選秀方向
  const scoutPanel = d => {
    try {
      if (typeof v46ScanInternalCandidates !== "function") return "";
      const scan = v46ScanInternalCandidates(team, d);
      const draftNote = (typeof v46DraftDirectionNote === "function") ? v46DraftDirectionNote(d) : "";
      const rows = (scan.list || []).map(c => {
        const p = c.p;
        const lvl = c.promotable ? "2軍" : (p.level || "");
        const meetTag = c.meets ? `<span class="v46meet">${icon('ok')} 已達門檻</span>` : `<span class="v46short">差 ${c.gap} 點</span>`;
        const btn = c.promotable
          ? `<button class="btn-secondary demand-btn" data-id="${d.id}" data-act="promote" data-pid="${p.id}">拔擢上一軍</button>`
          : (c.eligible ? `<span class="draftnote muted">已在一軍</span>` : `<span class="draftnote muted">需求開立時已在陣（不計達成）</span>`);
        return `<div class="v46cand-row"><span>${p.name}（${lvl}・${p.isPitcher ? (p.role || "投") : (p.positions ? p.positions.map(x => POS_LABEL[x.pos]).join("/") : "野")}・${p.age}歲）　${meetTag}</span>${btn}</div>`;
      }).join("");
      const head = scan.anyMeet
        ? `<b>球探盤點：陣中已有達標人選，可直接拔擢達成（不必交易）。</b>`
        : ((scan.list && scan.list.length) ? `球探盤點：陣中最接近的人選如下（暫未達門檻，可培養或列為選秀方向）。` : `球探盤點：陣中暫無合適人選——建議走選秀補強。`);
      return `<div class="v46cands">
        <p class="draftnote" style="margin:0 0 4px;">${icon('magnify')} ${head}</p>
        ${rows}
        ${draftNote ? `<p class="draftnote muted" style="margin-top:5px;">${icon('target')} ${draftNote}</p>` : ""}
      </div>`;
    } catch (_) { return ""; }
  };
  /* v47 Z1：球探市場主動找人（自由/國際市場）——派遣狀態、到期回報清單、一鍵導到簽約/報價 */
  const z1Panel = d => {
    try {
      if (typeof v47MissionsForDemand !== "function") return "";
      const ms = v47MissionsForDemand(d.id);
      const areaLabel = a => a === "international" ? "國際市場" : "國內自由市場";
      const blocks = ms.map(m => {
        if (!m.done) {
          const left = Math.max(0, (m.dueDay || 0) - (S.currentDay || 0));
          const scName = (team.scouts && team.scouts[m.area] && team.scouts[m.area].name) || "球探";
          return `<p class="draftnote muted" style="margin:4px 0;">${icon('hourglass')} ${scName} 正在查訪${areaLabel(m.area)}——約 ${left} 天後回報（該球探此期間無法接受其他委託）。</p>`;
        }
        const rows = (m.results || []).map(r => {
          const p = (typeof v47MarketPlayer === "function") ? v47MarketPlayer(m.area, r.id) : null;
          if (!p) return "";
          const posTxt = p.isPitcher ? (p.role || "投手") : ((p.positions || []).map(x => POS_LABEL[x.pos] || x.pos).join("/") || "野手");
          const tag = r.meets ? `<span class="v46meet">${icon('ok')} 估值達門檻</span>` : `<span class="v46short">估值差 ${r.gap} 點</span>`;
          return `<div class="v46cand-row"><span>${p.name}（${areaLabel(m.area)}・${posTxt}・${p.age}歲）　${tag}</span>` +
                 `<button class="btn-secondary v47-z1-sign" data-pid="${p.id}" data-area="${m.area}">前往報價</button></div>`;
        }).join("");
        const hit = (m.results || []).filter(r => r.meets).length;
        const head = hit > 0
          ? `<b>球探回報（${areaLabel(m.area)}）：${hit} 名估值符合門檻，可直接接洽。</b>`
          : ((m.results || []).length ? `球探回報（${areaLabel(m.area)}）：無完全符合者，以下為最接近的名單。` : `球探回報（${areaLabel(m.area)}）：市場上目前找不到合適人選。`);
        return `<p class="draftnote" style="margin:4px 0;">${icon('scout')} ${head}</p>${rows}
          <p class="draftnote muted" style="margin:3px 0 0;">※ 以上為球探估值（非真實能力），準度取決於該區域球探水準。</p>`;
      }).join("");
      const busyD = (typeof v47ScoutBusy === "function") && v47ScoutBusy("domestic");
      const busyI = (typeof v47ScoutBusy === "function") && v47ScoutBusy("international");
      const hasD = (typeof v47ScoutOf === "function") && !!v47ScoutOf(team, "domestic");
      const hasI = (typeof v47ScoutOf === "function") && !!v47ScoutOf(team, "international");
      const dispatch = `<div class="btnrow" style="flex-wrap:wrap;gap:6px;margin-top:6px;">
        <button class="btn-secondary demand-btn" data-id="${d.id}" data-act="z1scout" data-area="domestic" ${(!hasD || busyD) ? "disabled" : ""}>${icon('scout')} 派球探查自由市場${!hasD ? "（無球探）" : (busyD ? "（出勤中）" : "")}</button>
        <button class="btn-secondary demand-btn" data-id="${d.id}" data-act="z1scout" data-area="international" ${(!hasI || busyI) ? "disabled" : ""}>${icon('globe')} 派球探查國際市場${!hasI ? "（無球探）" : (busyI ? "（出勤中）" : "")}</button>
      </div>`;
      return `<div class="v46cands">${blocks}${dispatch}</div>`;
    } catch (_) { return ""; }
  };
  return open.map(d => `<div class="card issuecard demandcard">
    <div class="eyebrow">${(typeof assetSlot === "function" ? assetSlot("coach.portrait") : ""+icon('suit')+"")} ${d.rebuild ? "教練重建方向建議" : "教練補強需求"}（優先度：${prLabel[d.priority] || d.priority}）</div>
    <p class="sub dark"><b>${coachName(d)}</b>（${d.role}）：「${d.reason}」</p>
    <p class="sub dark">需求：<b>${d.title}</b>（${needTxt(d)}）</p>
    <p class="draftnote muted">期限：第 ${d.deadline} 天前${d.negotiated ? "・已協商過一次" : ""}。${d.rebuild ? "重建期過期只小幅影響信任。" : "過期未回應會重挫教練信任。"}</p>
    ${scoutPanel(d)}
    ${z1Panel(d)}
    <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
      <button class="btn-primary demand-btn" data-id="${d.id}" data-act="accept">接受（列入追蹤）</button>
      <button class="btn-secondary demand-btn" data-id="${d.id}" data-act="want">${icon('search')} 求購市場找人</button>
      <button class="btn-secondary demand-btn" data-id="${d.id}" data-act="negotiate" ${d.negotiated ? "disabled" : ""}>協商降低門檻</button>
      <button class="btn-danger demand-btn" data-id="${d.id}" data-act="reject">駁回</button>
    </div>
    <p class="draftnote muted" style="margin-top:6px;">向教練說明現況（查證屬實會體諒、撤下需求；說辭與帳本／戰績／市場不符會被識破，信任重挫）：</p>
    <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
      <button class="btn-secondary demand-btn" data-id="${d.id}" data-act="understand" data-reason="rebuild">現在是重建期</button>
      <button class="btn-secondary demand-btn" data-id="${d.id}" data-act="understand" data-reason="nobudget">目前沒有經費</button>
      <button class="btn-secondary demand-btn" data-id="${d.id}" data-act="understand" data-reason="noplayer">市場上沒有合適人選</button>
    </div>
  </div>`).join("") + (accepted.length > 0 ? `<div class="card">
    <div class="eyebrow">${icon('pin')} 補強追蹤中（${accepted.length}）</div>
    ${accepted.map(d => `<p class="sub dark" style="margin:3px 0;">・${d.title}——期限第 ${d.deadline} 天（${coachName(d)}）</p>`).join("")}
    <p class="draftnote muted">名單出現符合條件的新戰力時自動判定達成（教練信任+8）。</p>
  </div>` : "");
}

// v41②：接管跨季到期→續期或還權（決策前接管暫時寬限有效）
function renderTakeoverExpiryCard() {
  if (!S || !S.takeover || !S.takeover.expired) return "";
  return `<div class="card issuecard">
    <div class="eyebrow">${icon('hourglass')} 接管授權已跨季到期</div>
    <p class="sub dark">你在第 ${S.takeover.seasonYear} 季接管的兵符授權已到期（已續期 ${S.takeover.renewals} 次）。要繼續掌兵，得再付一次代價；還權則教練信任部分回復——但「hands_on」標籤不會消失。</p>
    <div class="btnrow">
      <button id="btn-takeover-renew" class="btn-danger">續期一季（教練信任-15、高層觀感-3）</button>
      <button id="btn-takeover-end2" class="btn-primary">還權給教練（信任+15）</button>
    </div>
  </div>`;
}

/* ====================================================================
   v42 UI 附錄：辭呈決策卡／二軍拉人提示卡／釋出影響評估／卡片按鈕綁定
   ==================================================================== */
// v42③ 辭呈決策卡（主控台待辦頁；7天未回應自動離隊）
function renderResignationCard() {
  try {
    if (!S || !S.v42 || !S.v42.resignation) return "";
    const res = S.v42.resignation;
    const hc = S.coaches[res.coachId];
    if (!hc) return "";
    const canPromise = !!(S.takeover && S.takeover.active);
    const retained = !!hc.retainedOnce;
    const daysLeft = Math.max(0, (res.expiresDay || 0) - (S.currentDay || 0));
    return `<div class="card issuecard">
      <div class="eyebrow">${(typeof assetSlot === "function" ? assetSlot("coach.portrait") : ""+icon('suit')+"")} 總教練遞出辭呈</div>
      <p class="sub dark"><b>${hc.name}</b> 把辭呈放在你桌上：「道不同，不相為謀。」（信任 ${typeof hc.trust === "number" ? hc.trust : "?"}）</p>
      <p class="draftnote muted">${retained ? "他已被慰留過一次，這次心意已決——只能接受辭呈。" : `你可以慰留（每任教練生涯僅一次）：加薪30%求穩，${canPromise ? "或承諾還權（立即結束接管；60天內再接管＝信任徹底歸零）" : "（目前無接管狀態，還權承諾不可用）"}。`}${daysLeft} 天內未回應視同接受辭呈。</p>
      <div class="btnrow" style="flex-wrap:wrap;gap:6px;">
        ${retained ? "" : `<button class="btn-primary v42-resign-btn" data-act="pay">加薪30%慰留</button>`}
        ${(!retained && canPromise) ? `<button class="btn-secondary v42-resign-btn" data-act="promise">承諾還權慰留</button>` : ""}
        <button class="btn-danger v42-resign-btn" data-act="accept">接受辭呈</button>
      </div>
    </div>`;
  } catch (_) { return ""; }
}
// v42⑨ 釋出後拉人提示卡（缺口＋二軍前三推薦，一鍵升上一軍；3天自動收起）
function renderCallupHintCard() {
  try {
    if (!S || !S.v42 || !S.v42.callupHint) return "";
    const hint = S.v42.callupHint;
    const team = S.teams[S.userTeamId];
    const rows = (hint.ids || []).map((id, i) => {
      const q = S.players[id];
      if (!q || !team.roster2.includes(id)) return "";
      return `<div class="btnrow" style="align-items:center;gap:8px;margin:4px 0;">
        <span class="sub dark" style="flex:1;">・<b>${q.name}</b>（${q.age}歲・${(hint.whys || [])[i] || ""}）</span>
        <button class="movebtn v42-callup-btn" data-id="${id}">升上1軍</button>
      </div>`;
    }).join("");
    if (!rows) return "";
    return `<div class="card issuecard">
      <div class="eyebrow">${icon('megaphone')} 陣容缺口・二軍拉人建議</div>
      <p class="sub dark">釋出球員後：${hint.reason}。二軍教練推薦以下人選頂上：</p>
      ${rows}
      <p class="draftnote muted">也可到名單頁自行比較後升降；本提示數日後自動收起。</p>
    </div>`;
  } catch (_) { return ""; }
}
// v42⑨ 釋出確認卡內嵌影響評估（讓玩家在按下確定前就知道洞在哪、誰能補）
function renderReleaseImpact(p, team) {
  try {
    if (typeof releaseImpactOf !== "function") return "";
    const impact = releaseImpactOf(p, team);
    if (!impact) return "";
    const gapTxt = impact.gaps.length > 0
      ? `<p class="sub dark" style="color:var(--redline);">${icon('warn')} 釋出後：${impact.gaps.join("；")}</p>`
      : `<p class="draftnote muted">釋出後一軍守位與投手深度暫無硬缺口。</p>`;
    const sugTxt = impact.suggestions.length > 0
      ? `<p class="draftnote muted">二軍可拉上頂替：${impact.suggestions.map(s => `${s.p.name}（${s.why}）`).join("、")}</p>`
      : "";
    return gapTxt + sugTxt;
  } catch (_) { return ""; }
}
// v42 卡片按鈕綁定（主控台 render 後呼叫）
function wireV42Cards() {
  try {
    app.querySelectorAll(".v42-resign-btn").forEach(b => { b.onclick = () => { if (typeof v42RetainCoach === "function") v42RetainCoach(b.dataset.act); }; });
    app.querySelectorAll(".v42-callup-btn").forEach(b => { b.onclick = () => { if (typeof promotePlayer === "function") promotePlayer(b.dataset.id); }; });
  } catch (_) {}
}


/* ====================================================================
   v43 —— 06-ui-roster 附加區塊 ——
   ①交易畫面雙方完整資料（比照選秀/外籍）＋現金維度（自填數值＝高自由度）。
   ②掛牌釋出 UI（把自家球員掛上市場，等 AI 開條件）。
   ③純GM 投手輪值頁改唯讀（教練管理），手排入口不存在。
   全部附加；整合點以最小編輯掛入。
   ==================================================================== */

/* ---------- v43① 完整資料交易畫面（renderTradeBuilder 的 v43 版；整合點改呼叫此函式） ----------
   自家＝真實完整卡；對方＝交易球探評估完整卡。加現金雙向輸入（你附現金／向對方要現金）。 */
function ensureTradeCashState() {
  if (typeof UI.tradeCashGive !== "number") UI.tradeCashGive = 0; // 你附帶送出的現金
  if (typeof UI.tradeCashGet !== "number") UI.tradeCashGet = 0;   // 你向對方要的現金
}
function renderTradeBuilderV43() {
  try {
    ensureTradeCashState();
    const teamA = S.teams[S.userTeamId], teamB = S.teams[UI.tradePartner];
    const myPlayers = teamA.roster1.concat(teamA.roster2).map(id => S.players[id]).filter(Boolean);
    const theirPlayers = teamB.roster1.concat(teamB.roster2).map(id => S.players[id]).filter(Boolean);
    const val = p => (typeof personaTradeValue === "function") ? personaTradeValue(teamB, p) : tradeValue(p);
    const giveValue = UI.tradeGive.reduce((s, id) => s + tradeValue(S.players[id]), 0);
    const getValue = UI.tradeGet.reduce((s, id) => s + tradeValue(S.players[id]), 0);
    // v45-U1：可交易選秀權（雙方持有）＋已選 token
    const myPicks = (typeof teamOwnedPicks === "function") ? teamOwnedPicks(teamA.id) : [];
    const theirPicks = (typeof teamOwnedPicks === "function") ? teamOwnedPicks(teamB.id) : [];
    const givePicks = UI.tradeGivePicks || [], getPicks = UI.tradeGetPicks || [];
    const pkChecked = (tk, arr) => (arr || []).some(t => pickTokenKey(t) === pickTokenKey(tk));
    const givePicksVal = (typeof picksTotalValue === "function") ? picksTotalValue(givePicks) : 0;
    const getPicksVal = (typeof picksTotalValue === "function") ? picksTotalValue(getPicks) : 0;
    const pickTableHtml = (picks, side) => picks.length === 0
      ? `<p class="draftnote muted">目前沒有可交易的選秀權（可交易範圍：本屆與未來兩年、各六輪；原隊戰績越差、順位越前越值錢）。</p>`
      : `<table class="stattable"><thead><tr><th></th><th>選秀權</th><th>估值</th></tr></thead><tbody>${picks.map(tk => `<tr>
          <td><input type="checkbox" class="${side}-pick-check" data-pk="${pickTokenKey(tk)}" ${pkChecked(tk, side === "give" ? givePicks : getPicks) ? "checked" : ""}></td>
          <td>${pickLabel(tk)}</td><td>${((typeof pickTradeValue === "function") ? pickTradeValue(tk) : 0).toFixed(1)}</td>
        </tr>`).join("")}</tbody></table>`;
    // 現金當量顯示
    const cashGiveVal = (typeof v43CashToValue === "function") ? v43CashToValue(UI.tradeCashGive) : 0;
    const cashGetVal = (typeof v43CashToValue === "function") ? v43CashToValue(UI.tradeCashGet) : 0;
    if (typeof ensureFinance === "function") ensureFinance(teamA);
    const myBudget = (teamA.finance && teamA.finance.budget) || 0;
    // 對方球員的球探評估完整卡快取
    const scoutCache = (typeof v43BuildScoutCache === "function") ? v43BuildScoutCache(theirPlayers.map(p => p.id)) : {};
    // 一覽勾選列（保留精簡表，展開看完整卡）：野手/投手分兩張表；每列一個勾選框＋姓名＋守位＋年齡＋薪資
    const rowMine = p => `<tr>
      <td><input type="checkbox" class="give-check" data-id="${p.id}" ${UI.tradeGive.includes(p.id) ? "checked" : ""}></td>
      <td>${p.name}${isInjured(p) ? ` <span class="injurytag">傷</span>` : ""}</td>
      <td>${p.level}</td><td>${p.isPitcher ? "投" : "野"}</td>
      <td>${p.isPitcher ? (p.role || "投手") : p.positions.map(x => POS_LABEL[x.pos]).join("/")}</td>
      <td>${p.age}</td><td>${v43SalaryLabel(p)}</td><td>${v43ContractLabel(p)}</td>
    </tr>`;
    const rowTheir = p => `<tr>
      <td><input type="checkbox" class="get-check" data-id="${p.id}" ${UI.tradeGet.includes(p.id) ? "checked" : ""}></td>
      <td>${p.name}${isInjured(p) ? ` <span class="injurytag">傷</span>` : ""}</td>
      <td>${p.level}</td><td>${p.isPitcher ? "投" : "野"}</td>
      <td>${p.isPitcher ? (p.role || "投手") : p.positions.map(x => POS_LABEL[x.pos]).join("/")}</td>
      <td>${p.age}</td><td>${v43SalaryLabel(p)}</td><td>${v43ContractLabel(p)}</td>
    </tr>`;
    // 已勾選者展開完整卡（讓玩家看清楚要換的人；比照選秀/外籍完整度）
    const selectedMineCards = UI.tradeGive.map(id => S.players[id]).filter(Boolean).map(p => v43PlayerFullCardHtml(p, null)).join("");
    const selectedTheirCards = UI.tradeGet.map(id => S.players[id]).filter(Boolean).map(p => v43PlayerFullCardHtml(p, { scoutView: scoutCache[id] || {} })).join("");
    app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName}</div><h1>交易：${teamB.name}</h1></div>
      ${UI.tradeResult ? `<div class="flash">${UI.tradeResult.reason}</div>` : ""}
      ${(() => {
        const ps = (typeof personaOf === "function") ? personaOf(teamB) : null;
        const aff = (typeof gmAffinity === "function") ? gmAffinity(teamB) : 0;
        const af = (typeof affinityLabel === "function") ? affinityLabel(aff) : { cls: "", text: "" };
        const events = (teamB.gmMemory && teamB.gmMemory.events || []).slice(0, 5);
        return `<div class="card">
          <div class="eyebrow">對手檔案：${ps ? `${ps.name}球團` : "未知風格"}・交情 <span class="afftag ${af.cls}">${af.text}</span></div>
          <p class="sub dark">${ps ? ps.desc : ""}${aff !== 0 ? `（交情會影響他們的成交門檻${ps && ps.affinityW === 0 ? "——但這隊只認數字，交情無效" : ""}）` : ""}</p>
          ${events.length > 0 ? `<p class="draftnote muted">${icon('notebook')} 他們記得：${events.map(e => `第${e.year}年${e.text}（${e.delta > 0 ? "+" : ""}${e.delta}）`).join("；")}</p>` : ""}
        </div>`;
      })()}

      <div class="divlabel">你提供（${teamA.name}・真實完整資料）</div>
      <p class="draftnote muted">勾選要送出的球員；勾選後下方會展開完整資料卡（年齡、薪資、合約、能力、潛力、特質）。</p>
      ${posFilterBarHtml(myPlayers, "tradeGivePosFilter")}
      <table class="stattable v43tradetable">
        <thead><tr><th></th><th>姓名</th><th>層級</th><th>型</th><th>守位</th><th>年齡</th><th>年薪</th><th>合約</th></tr></thead>
        <tbody>${applyPosFilter(myPlayers, "tradeGivePosFilter").map(rowMine).join("")}</tbody>
      </table>
      ${selectedMineCards ? `<div class="divlabel small">已選送出（完整資料）</div>${selectedMineCards}` : ""}

      <div class="divlabel">你想要（${teamB.name}・交易球探評估完整資料）</div>
      <p class="draftnote muted">守位是公開資訊、真實不變；能力/潛力為交易球探評估值，準確度越高落差越小。勾選後展開評估完整卡。</p>
      ${posFilterBarHtml(theirPlayers, "tradeGetPosFilter")}
      <table class="stattable v43tradetable">
        <thead><tr><th></th><th>姓名</th><th>層級</th><th>型</th><th>守位</th><th>年齡</th><th>年薪</th><th>合約</th></tr></thead>
        <tbody>${applyPosFilter(theirPlayers, "tradeGetPosFilter").map(rowTheir).join("")}</tbody>
      </table>
      ${selectedTheirCards ? `<div class="divlabel small">已選取得（球探評估完整資料）</div>${selectedTheirCards}` : ""}

      <div class="card v43cashcard">
        <div class="eyebrow">${icon('money')} 現金條件（可自由填，也可留 0）</div>
        <div class="v43cashinputrow">
          <label>你附帶送出現金：</label>
          <input type="number" id="v43-cash-give" min="0" step="100000" value="${UI.tradeCashGive}" class="v43cashinput">
          <span class="muted">（上限：你的預算 ${(typeof formatMoney === "function") ? formatMoney(myBudget) : myBudget}）</span>
        </div>
        <div class="v43cashinputrow">
          <label>你向對方要求現金：</label>
          <input type="number" id="v43-cash-get" min="0" step="100000" value="${UI.tradeCashGet}" class="v43cashinput">
          <span class="muted">（對方付不出來會直接回絕）</span>
        </div>
        <p class="draftnote muted">現金會換算成交易價值一併計入評估。多換一、一換多、選手加錢、純現金都能在這個畫面自由組合。</p>
      </div>

      <div class="divlabel">${icon('ticket')} 選秀權（U1・原隊決定順位，擁有者實際選人）</div>
      <div class="divlabel small">你提供的選秀權（${teamA.name}）</div>
      ${pickTableHtml(myPicks, "give")}
      <div class="divlabel small">你想要的選秀權（${teamB.name}）</div>
      ${pickTableHtml(theirPicks, "get")}

      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">你提供總值（含現金・選秀權）</div><div class="sb-value small">${(giveValue + cashGiveVal + givePicksVal).toFixed(1)}</div></div>
        <div class="sb-row small"><div class="sb-label">你想要總值（含現金・選秀權）</div><div class="sb-value small">${(getValue + cashGetVal + getPicksVal).toFixed(1)}</div></div>
      </div>
      <div class="btnrow">
        <button id="btn-submit-trade" class="btn-primary" ${(UI.tradeGive.length === 0 && UI.tradeGet.length === 0 && UI.tradeCashGive === 0 && UI.tradeCashGet === 0 && givePicks.length === 0 && getPicks.length === 0) ? "disabled" : ""}>提出交易</button>
      </div>
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回選對象</button></div>
    </div>`;
    // 勾選綁定
    wirePosFilterButtons();
    app.querySelectorAll(".give-check").forEach(cb => {
      cb.onchange = () => { const id = cb.dataset.id; if (cb.checked) UI.tradeGive.push(id); else UI.tradeGive = UI.tradeGive.filter(x => x !== id); render(); };
    });
    app.querySelectorAll(".get-check").forEach(cb => {
      cb.onchange = () => { const id = cb.dataset.id; if (cb.checked) UI.tradeGet.push(id); else UI.tradeGet = UI.tradeGet.filter(x => x !== id); render(); };
    });
    // v45-U1：選秀權勾選
    app.querySelectorAll(".give-pick-check").forEach(cb => {
      cb.onchange = () => { const tk = myPicks.find(t => pickTokenKey(t) === cb.dataset.pk); if (!tk) return;
        if (cb.checked) UI.tradeGivePicks = (UI.tradeGivePicks || []).concat([tk]); else UI.tradeGivePicks = (UI.tradeGivePicks || []).filter(t => pickTokenKey(t) !== cb.dataset.pk); render(); };
    });
    app.querySelectorAll(".get-pick-check").forEach(cb => {
      cb.onchange = () => { const tk = theirPicks.find(t => pickTokenKey(t) === cb.dataset.pk); if (!tk) return;
        if (cb.checked) UI.tradeGetPicks = (UI.tradeGetPicks || []).concat([tk]); else UI.tradeGetPicks = (UI.tradeGetPicks || []).filter(t => pickTokenKey(t) !== cb.dataset.pk); render(); };
    });
    // 現金輸入綁定（失焦時回寫，不逐字 render 以免游標跳動）
    const cg = document.getElementById("v43-cash-give");
    if (cg) cg.onchange = () => { UI.tradeCashGive = Math.max(0, Math.round((Number(cg.value) || 0) / 100000) * 100000); render(); };
    const cget = document.getElementById("v43-cash-get");
    if (cget) cget.onchange = () => { UI.tradeCashGet = Math.max(0, Math.round((Number(cget.value) || 0) / 100000) * 100000); render(); };
    document.getElementById("btn-submit-trade").onclick = () => submitTradeV43();
    document.getElementById("btn-back").onclick = () => { UI.screen = "tradeTeamSelect"; UI.tradeResult = null; UI.tradeCashGive = 0; UI.tradeCashGet = 0; render(); };
  } catch (e) {
    // 任何異常退回舊交易畫面
    if (typeof renderTradeBuilder === "function") return renderTradeBuilder();
  }
}
// v43 提交交易（帶現金）：預算不足擋下；評估→成交執行帶現金
function submitTradeV43() {
  try {
    ensureTradeCashState();
    const givePicks = UI.tradeGivePicks || [], getPicks = UI.tradeGetPicks || [];
    if (UI.tradeGive.length === 0 && UI.tradeGet.length === 0 && UI.tradeCashGive === 0 && UI.tradeCashGet === 0 && givePicks.length === 0 && getPicks.length === 0) return;
    const teamA = S.teams[S.userTeamId];
    if (typeof ensureFinance === "function") ensureFinance(teamA);
    if (UI.tradeCashGive > ((teamA.finance && teamA.finance.budget) || 0)) {
      UI.tradeResult = { reason: `你附帶的現金超過球隊預算（${(typeof formatMoney === "function") ? formatMoney(teamA.finance.budget) : teamA.finance.budget}），請下修。` };
      render(); return;
    }
    // v45-U1：帶選秀權評估（選秀權為純資產）；無選秀權時退回 v43 現金評估
    const res = (typeof v45EvaluateTradeWithPicks === "function")
      ? v45EvaluateTradeWithPicks(UI.tradeGive, UI.tradeGet, givePicks, getPicks, UI.tradePartner, UI.tradeCashGive, UI.tradeCashGet)
      : ((typeof v43EvaluateTradeWithCash === "function")
          ? v43EvaluateTradeWithCash(UI.tradeGive, UI.tradeGet, UI.tradePartner, UI.tradeCashGive, UI.tradeCashGet)
          : evaluateTrade(UI.tradeGive, UI.tradeGet, UI.tradePartner));
    if (res.accept) {
      if (typeof v45ExecuteTradeWithPicks === "function") {
        v45ExecuteTradeWithPicks(S.userTeamId, UI.tradePartner, UI.tradeGive, UI.tradeGet, UI.tradeCashGive, UI.tradeCashGet, givePicks, getPicks);
      } else if (typeof v43ExecuteTradeWithCash === "function") {
        v43ExecuteTradeWithCash(S.userTeamId, UI.tradePartner, UI.tradeGive, UI.tradeGet, UI.tradeCashGive, UI.tradeCashGet);
      }
      UI.tradeResult = { reason: `${icon('check')} ${res.reason}` };
      UI.tradeGive = []; UI.tradeGet = []; UI.tradeCashGive = 0; UI.tradeCashGet = 0;
      UI.tradeGivePicks = []; UI.tradeGetPicks = [];
      if (typeof persist === "function") persist();
    } else {
      UI.tradeResult = { reason: `${icon('cross')} ${res.reason}` };
    }
    render();
  } catch (e) {
    if (typeof submitTrade === "function") return submitTrade();
  }
}

/* ---------- v43② 掛牌釋出 UI（球員名單頁新增「掛牌交易市場」入口） ----------
   把自家一/二軍球員掛上市場，AI 會在後續幾天主動開條件（進郵件中樞）。 */
function renderListingScreen() {
  try {
    ensureV43State();
    const team = S.teams[S.userTeamId];
    const listed = new Set(S.v43.listings || []);
    const all = team.roster1.concat(team.roster2).map(id => S.players[id]).filter(Boolean);
    const listFiltered = applyPosFilter(all, "listingPosFilter");
    const openOffers = (S.v43.offers || []).filter(o => o.status === "open");
    const row = p => `<tr>
      <td>${p.name}${isInjured(p) ? ` <span class="injurytag">傷</span>` : ""}</td>
      <td>${p.level}</td><td>${p.isPitcher ? "投" : "野"}</td>
      <td>${p.isPitcher ? (p.role || "投手") : p.positions.map(x => POS_LABEL[x.pos]).join("/")}</td>
      <td>${p.age}</td><td>${v43SalaryLabel(p)}</td>
      <td>${listed.has(p.id)
        ? `<span class="v43listedtag">掛牌中</span> <button class="movebtn v43-unlist-btn" data-id="${p.id}">撤牌</button>`
        : `<button class="pickbtn v43-list-btn" data-id="${p.id}">掛牌</button>`}</td>
    </tr>`;
    app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>掛牌交易市場</h1></div>
      ${renderRosterNav("listing")}
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      <p class="sub dark" style="margin-bottom:10px;">把想釋出的球員掛上市場，各隊會依需求主動開出條件（選手、現金、選手加錢、多換一、一換多都可能），條件會寄到主控台的<b>郵件中樞</b>由你抉擇——你也可以全部拒絕。掛牌不代表一定要交易。</p>
      ${openOffers.length > 0 ? `<div class="card issuecard"><div class="eyebrow">${icon('mail-box')} 目前有 ${openOffers.length} 份待回應報價</div><p class="sub dark">到主控台「${icon('mail')} 郵件」或「${icon('clipboard')} 待辦」查看並抉擇。</p></div>` : ""}
      ${posFilterBarHtml(all, "listingPosFilter")}
      <table class="stattable">
        <thead><tr><th>姓名</th><th>層級</th><th>型</th><th>守位</th><th>年齡</th><th>年薪</th><th>操作</th></tr></thead>
        <tbody>${listFiltered.map(row).join("")}</tbody>
      </table>
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
    app.querySelectorAll(".v43-list-btn").forEach(b => { b.onclick = () => { const r = v43ListPlayer(b.dataset.id); UI.flash = r.msg; render(); }; });
    app.querySelectorAll(".v43-unlist-btn").forEach(b => { b.onclick = () => { const r = v43UnlistPlayer(b.dataset.id); UI.flash = r.msg; render(); }; });
    wirePosFilterButtons();
    document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
    if (typeof wireRosterNav === "function") wireRosterNav();
  } catch (e) {
    UI.screen = "dashboard"; render();
  }
}

/* ---------- v43③ 純GM 投手輪值唯讀（教練管理）預覽 ----------
   純GM 未接管時，輪值/牛棚不給手排入口，改顯示「教練今日調度預覽」＋輪值方針（受折射）。 */
function renderRotationCoachManaged() {
  try {
    const team = S.teams[S.userTeamId];
    if (typeof ensureRotation === "function") ensureRotation(team);
    if (typeof ensureBullpenOrder === "function") ensureBullpenOrder(team, S.players);
    if (typeof coachDailyRotation === "function") coachDailyRotation(team); // 先讓教練排一次當預覽
    const hc = (typeof headCoachOf === "function") ? headCoachOf(team) : null;
    const effKey = (typeof v43EffRotationKey === "function") ? v43EffRotationKey(team) : (team.tactics && team.tactics.rotation) || "five";
    const gmKey = (team.tactics && team.tactics.rotation) || "five";
    const pol = (typeof TACTICS_ROTATION !== "undefined") ? TACTICS_ROTATION.find(r => r.key === effKey) : null;
    const gmPol = (typeof TACTICS_ROTATION !== "undefined") ? TACTICS_ROTATION.find(r => r.key === gmKey) : null;
    const deviated = effKey !== gmKey;
    const tab = BULLPEN_TABS.includes(UI.rotationTab) ? UI.rotationTab : "先發";
    const arr = (typeof orderArrayFor === "function") ? orderArrayFor(team, tab) : (tab === "先發" ? team.rotation : (team.bullpenOrder[tab] || []));
    app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>投手調度（教練管理）</h1></div>
      ${renderRosterNav("rotation")}
      <div class="card">
        <div class="eyebrow">${icon('cap')} 純GM模式：投手輪值與牛棚由總教練安排</div>
        <p class="sub dark">${hc ? `總教練 <b>${hc.name}</b>` : "教練團"} 每天依你設定的輪值方針（經哲學折射）調度先發與牛棚。純GM模式下沒有手排入口——想親自調度，只能到「先發打線」頁付代價接管。</p>
        ${(typeof TACTICS_ROTATION !== "undefined") ? `<div class="tacticrow"><span>輪值方針（GM設定）</span>
          <select id="sel-tactic-rotation-pg">${TACTICS_ROTATION.map(o => `<option value="${o.key}" ${gmKey === o.key ? "selected" : ""}>${o.label}——${o.desc}</option>`).join("")}</select>
        </div>` : ""}
        ${deviated ? `<p class="draftnote" style="color:var(--redline);">${icon('warn')} 你設定的是「${gmPol ? gmPol.label : gmKey}」，但教練哲學折射後實際採用「${pol ? pol.label : effKey}」。想貫徹意志：換方針、換教練，或累積信任。</p>`
          : `<p class="draftnote muted">教練正照你的方針「${pol ? pol.label : effKey}」執行。</p>`}
      </div>
      <div class="tabrow">
        ${BULLPEN_TABS.map(t => `<button class="tab rot-tab ${tab === t ? "active" : ""}" data-rotationtab="${t}">${t}</button>`).join("")}
      </div>
      <p class="sub dark" style="margin-bottom:10px;">教練今日「${tab}」調度預覽（唯讀）。</p>
      <table class="stattable">
        <thead><tr><th>順位</th><th>姓名</th><th>狀況</th><th>年齡</th><th>球速(km/h)</th><th>控球</th><th>體力</th><th>疲勞</th></tr></thead>
        <tbody>
          ${arr.map((pid, i) => { const p = S.players[pid]; if (!p) return ""; return `<tr>
            <td>${i + 1}</td><td>${p.name}${isInjured(p) ? ` <span class="injurytag">傷${p.injury.daysLeft}天</span>` : ""}</td><td>${conditionTagHtml(p)}</td><td>${p.age}</td><td>${velocityKmh(p.velocity)}</td><td>${p.control}</td><td>${p.stamina}</td><td>${fatigueOf(p) > 70 ? `<b style="color:#c0392b;">${fatigueOf(p)}</b>` : fatigueOf(p)}</td>
          </tr>`; }).join("")}
          ${arr.length === 0 ? `<tr><td colspan="8" class="draftnote muted">目前「${tab}」沒有可用投手。</td></tr>` : ""}
        </tbody>
      </table>
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
    app.querySelectorAll(".rot-tab").forEach(btn => { btn.onclick = () => { UI.rotationTab = btn.dataset.rotationtab; render(); }; });
    const selRotPg = document.getElementById("sel-tactic-rotation-pg");
    if (selRotPg) selRotPg.onchange = (e) => { ensureTactics(team); team.tactics.rotation = e.target.value; UI.flash = `輪值方針已改為「${(typeof rotationPolicyOf === "function") ? rotationPolicyOf(team).label : e.target.value}」（教練會依哲學折射執行）。`; persist(); render(); };
    document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
    if (typeof wireRosterNav === "function") wireRosterNav();
  } catch (e) {
    if (typeof renderRotation === "function") return renderRotation();
  }
}


/* ---------- v45 #5：求購市場畫面（依教練需求張貼→AI 回覆選手＋報價條件） ---------- */
function v45WantKindLabel(k) {
  return ({ cash: "純現金", player: "單一球員", player_cash: "球員＋現金", multi: "多換一" })[k] || k;
}
function renderWantMarket() {
  try {
    if (typeof ensureV45WantState === "function") ensureV45WantState();
    const wants = (S.v45Wants || []).filter(w => w.status === "open" || w.status === "fulfilled").slice().reverse();
    const askHtml = r => {
      const parts = [];
      (r.askPlayerIds || []).forEach(id => { const p = S.players[id]; if (p) parts.push(`${p.name}（${p.isPitcher ? (p.role || "投") : p.positions.map(x => POS_LABEL[x.pos]).join("/")}・${p.age}歲）`); });
      if (r.askCash > 0) parts.push(`現金 ${(typeof formatMoney === "function") ? formatMoney(r.askCash) : r.askCash}`);
      return parts.length ? parts.join("＋") : "（無）";
    };
    const wantCard = w => {
      const ai = id => (S.teams[id] || {}).name || "他隊";
      const openResp = (w.responses || []).filter(r => r.status === "open");
      const body = w.status === "fulfilled"
        ? `<p class="sub dark">${icon('check')} 已透過求購成交，補進了球員。</p>`
        : (openResp.length === 0
          ? `<p class="draftnote muted">目前沒有球團願意割愛合適人選——這也向教練證明了你確實去找過人（若最終仍補不到，教練過期只會小幅扣信任）。</p>`
          : openResp.map(r => {
              const gp = S.players[r.aiPlayerId];
              // 他們願給：對方球員 → 球探評估完整卡（全欄位）
              const giveCard = gp ? ((typeof v46FullPlayerCard === "function") ? v46FullPlayerCard(gp, { scoutView: {} }) : gp.name) : "（球員）";
              // 他們要你付出：球員 → 你自家真實完整卡；現金另列
              const payCards = (r.askPlayerIds || []).map(id => { const pp = S.players[id]; return pp ? ((typeof v46FullPlayerCard === "function") ? v46FullPlayerCard(pp, null) : pp.name) : ""; }).join("");
              const cashLine = (r.askCash > 0) ? `<div class="v43cashrow">${icon('money')} 另需付出現金 <b>${(typeof formatMoney === "function") ? formatMoney(r.askCash) : r.askCash}</b></div>` : "";
              return `<div class="card issuecard" style="margin:8px 0;">
                <div class="eyebrow">${ai(r.aiTeamId)}・${v45WantKindLabel(r.kind)}</div>
                <div class="divlabel small">他們願給（球探評估完整資料）</div>
                ${giveCard}
                <div class="divlabel small">你要付出（自家真實完整資料）</div>
                ${payCards || `<p class="draftnote muted">（無球員，見下方現金）</p>`}
                ${cashLine}
                <div class="btnrow"><button class="btn-primary v45-want-accept" data-wid="${w.id}" data-rid="${r.id}">接受這筆求購</button></div>
              </div>`;
            }).join(""));
      return `<div class="card">
        <div class="eyebrow">${icon('search')} 求購：${w.title}</div>
        ${body}
        ${w.status === "open" ? `<div class="btnrow"><button class="btn-outline v45-want-cancel" data-wid="${w.id}">撤下這筆求購</button></div>` : ""}
      </div>`;
    };
    app.innerHTML = `<div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName}</div><h1>求購市場</h1></div>
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      <p class="draftnote muted">依教練的補強需求向全聯盟探詢。有合適人選的球團會回覆「他們願給的球員」與「他們要你付出的條件」（球員／球員加錢／純現金／多換一）。就算沒人回覆，張貼本身也是對教練展現努力。</p>
      ${wants.length === 0 ? `<div class="card"><p class="sub dark">目前沒有進行中的求購。到球員名單頁的教練需求卡，點「${icon('search')} 求購市場找人」即可張貼。</p></div>` : wants.map(wantCard).join("")}
      <div class="btnrow"><button id="btn-want-back" class="btn-outline">返回</button></div>
    </div>`;
    UI.flash = null;
    app.querySelectorAll(".v45-want-accept").forEach(b => { b.onclick = () => { const r = v45AcceptWantResponse(b.dataset.wid, b.dataset.rid); UI.flash = r.msg; render(); }; });
    app.querySelectorAll(".v45-want-cancel").forEach(b => { b.onclick = () => { const r = v45CancelWant(b.dataset.wid); UI.flash = r.msg; render(); }; });
    const bk = document.getElementById("btn-want-back"); if (bk) bk.onclick = () => { UI.screen = "roster"; render(); };
  } catch (e) {
    UI.screen = "roster"; if (typeof render === "function") render();
  }
}

/* ====================================================================
   ██ v48 榮譽殿堂畫面 ██
   球隊博物館中的名人堂頁面：殿堂成員列表、退休背號展示、操作入口。
   不受設施限制——即使沒有蓋博物館也能使用。
   ==================================================================== */
function renderHallOfFame() {
  try {
    if (typeof ensureV48 === "function") ensureV48();
    const team = S.teams[S.userTeamId];
    const hof = S.v48.hallOfFame || [];
    const retNums = S.v48.retiredNumbers || [];
    const pending = S.v48.hofPending || [];

    // 殿堂成員卡
    let membersHtml = "";
    if (hof.length === 0) {
      membersHtml = `<div class="card"><p class="sub muted">尚無殿堂成員。退休球員達到生涯里程碑門檻時，系統會自動提名候選。</p></div>`;
    } else {
      membersHtml = hof.map(h => {
        const cs = h.careerStats || {};
        const statLine = h.isPitcher
          ? `${cs.W || 0}勝 ${cs.L || 0}敗・${cs.SV || 0}救援・${cs.HD || 0}中繼・${cs.SO || 0}K`
          : `${cs.H || 0}安・${cs.HR || 0}轟・${cs.RBI || 0}打點・${cs.SB || 0}盜`;
        const numTag = h.retiredNumber ? `<span class="v48retired-num">${icon('jersey')} #${h.retiredNumber} 永久退休</span>` : "";
        // 雷達圖
        let radarHtml = "";
        try {
          const fakeP = { isPitcher: h.isPitcher, ...(h.abilities || {}), pitches: (h.abilities && h.abilities.pitches) || [] };
          radarHtml = typeof v48RadarSVG === "function" ? v48RadarSVG(fakeP, {}) : "";
        } catch (_) {}
        // 退休背號按鈕（尚未退休背號的成員才有）
        const retireBtn = !h.retiredNumber ? `<button class="btn-outline v48retire-num-btn" data-hofid="${h.id}">${icon('jersey')} 退休背號</button>` : "";
        return `<div class="card v48hof-member">
          <div class="v48hof-member-head">
            ${typeof themePlayerPhoto === "function" ? themePlayerPhoto(h.id) : ""}
            <div>
              <div class="v48hof-name">${icon('crown')} ${h.name} ${numTag}</div>
              <div class="v48hof-role">${h.isPitcher ? "投手" : "野手"}・${h.role || ""}・${(typeof v53NationFlagByName === "function" && h.nationality) ? v53NationFlagByName(h.nationality, 16) : ""}${h.nationality || ""}</div>
              <div class="v48hof-inducted">第${h.inductedYear}年入選・效力${h.yearsOnTeam}年</div>
            </div>
          </div>
          ${radarHtml ? `<div style="display:flex;justify-content:center;margin:4px 0;">${radarHtml}</div>` : ""}
          <div class="v48hof-statline">${statLine}</div>
          ${retireBtn ? `<div class="btnrow" style="margin-top:6px;">${retireBtn}</div>` : ""}
        </div>`;
      }).join("");
    }

    // 退休背號列表
    let retNumsHtml = "";
    if (retNums.length > 0) {
      retNumsHtml = `<div class="card"><div class="eyebrow">${icon('jersey')} 永久退休背號</div>
        <div class="v48retired-nums-row">${retNums.map(n => {
          const owner = hof.find(h => h.retiredNumber === n);
          return `<div class="v48retired-num-badge"><span class="num">#${n}</span><span class="nm">${owner ? owner.name : ""}</span></div>`;
        }).join("")}</div>
      </div>`;
    }

    // 待提名提示
    const pendingNote = pending.length > 0 ? `<div class="card issuecard"><p class="sub dark">${icon('bell')} 有 ${pending.length} 位退休球員等待殿堂審核，請至主控台處理提名。</p></div>` : "";

    app.innerHTML = `<div class="wrap">
      ${renderRosterNav("hallOfFame")}
      <div class="topbar">
        <div>
          <div class="eyebrow">${icon('museum')} ${team.name}</div>
          <div class="teamname">${icon('hof')} 球隊榮譽殿堂</div>
        </div>
        <div class="gmtag">${hof.length} 位殿堂・${retNums.length} 個退休背號</div>
      </div>
      ${typeof v60CompatVisualScene === "function" ? v60CompatVisualScene("hall_of_fame_gallery_v58", "名人堂展示館場景", "HALL OF FAME VISUAL", "球隊榮譽殿堂", "入選紀錄與退休背號", "v60-hof-scene") : ""}
      ${typeof v60VisualMetricRail === "function" ? v60VisualMetricRail([["殿堂", `${hof.length} 位`], ["退休背號", `${retNums.length} 個`], ["待審核", `${pending.length} 位`]], "名人堂摘要") : ""}
      ${pendingNote}
      ${retNumsHtml}
      <div class="divlabel">殿堂成員（${hof.length}）</div>
      ${membersHtml}
      <p class="v60-state-line">${icon('hof')} 達到生涯門檻會自動提名，由 GM 最終核准入殿。</p>
    </div>`;
    wireHallOfFame();
    wireRosterNav(); // v49修復：缺此行導致榮譽殿堂畫面無法跳出
  } catch (e) {
    app.innerHTML = `<div class="wrap"><div class="card"><p>載入榮譽殿堂時發生錯誤。</p></div></div>`;
  }
}

function wireHallOfFame() {
  try {
    document.querySelectorAll(".v48retire-num-btn").forEach(b => {
      b.onclick = () => {
        const hofId = b.dataset.hofid;
        const entry = (S.v48.hallOfFame || []).find(h => h.id === hofId);
        if (!entry) return;
        const numStr = prompt(`請輸入要為 ${entry.name} 退休的背號（數字）：`);
        if (!numStr) return;
        const num = parseInt(numStr, 10);
        if (isNaN(num) || num < 0 || num > 99) { UI.flash = "背號需為 0-99 之間的數字。"; render(); return; }
        if ((S.v48.retiredNumbers || []).includes(num)) { UI.flash = `${num} 號已經是退休背號。`; render(); return; }
        if (typeof v48RetireNumber === "function") v48RetireNumber(hofId, num);
        UI.flash = `${entry.name} 的 ${num} 號球衣正式退休！`;
        render();
      };
    });
  } catch (_) {}
}

/* ====================================================================
   v55 L3 Phase 2：數據中心畫面
   支柱一旗艦 UI——透過分析室等級門檻，讓玩家看到「表面之下的真相」。
   ==================================================================== */

function renderDataCenter() {
  try {
    const ownTeam = (S && S.teams) ? S.teams[S.userTeamId] : null;
    const tier = (typeof v51VisibleTier === "function") ? v51VisibleTier(ownTeam, true) : 0;
    const tab = UI.dcTab || "batters";
    const scope = UI.dcScope || "league"; // "league" or "team"
    const sortKey = UI.dcSort || (tab === "batters" ? "OPS+" : "ERA+");
    const sortDir = UI.dcSortDir || "desc";

    /* 分析室等級不足時顯示提示 */
    if (tier < 1) {
      app.innerHTML = `<div class="wrap">
        <div class="topbar"><div><div class="eyebrow">數據中心</div><div class="teamname">${icon('chart')} 進階數據分析</div></div></div>
        <div class="card"><p class="sub dark">${icon('locked')} 數據中心需要分析室 Lv.1 以上才能使用。</p>
        <p class="sub dark">前往球團設施升級分析室，解鎖進階數據。目前分析室 Lv.${(typeof analysisRoomLevel === "function" && ownTeam) ? analysisRoomLevel(ownTeam) : 0}。</p></div>
        <div class="btnrow"><button id="v55dc-back" class="btn-outline">返回主控台</button></div></div>`;
      document.getElementById("v55dc-back").onclick = () => { UI.screen = "dashboard"; render(); };
      return;
    }

    const filterTeam = scope === "team" ? S.userTeamId : null;
    const data = (typeof v55DataCenterStats === "function") ? v55DataCenterStats(filterTeam) : { batters: [], pitchers: [] };
    const lgAvg = (typeof v55LeagueAverages === "function") ? v55LeagueAverages() : null;

    let tableHtml = "";
    if (tab === "batters") {
      tableHtml = v55DCBattersTable(data.batters, tier, sortKey, sortDir);
    } else if (tab === "pitchers") {
      tableHtml = v55DCPitchersTable(data.pitchers, tier, sortKey, sortDir);
    } else {
      tableHtml = v55DCLuckTable(data, tier);
    }

    const tierLabel = V51_TIER_LABELS ? (V51_TIER_LABELS[tier] || "") : "";
    /* v55 Phase 3：聘任候選人畫面 */
    if (UI.v55DirHiring && UI.v55DirCandidates) {
      var cands = UI.v55DirCandidates;
      var candsHtml = cands.map(function(c, i) {
        return '<div class="card" style="margin:8px 0;">' +
          '<div class="eyebrow">候選人 ' + (i + 1) + '</div>' +
          '<div class="attrgrid">' +
            '<div class="attr"><span>姓名</span><b>' + c.name + '</b></div>' +
            '<div class="attr"><span>洞察力</span><b>' + c.insight + '</b></div>' +
            '<div class="attr"><span>校正力</span><b>' + c.correction + '</b></div>' +
            '<div class="attr"><span>警覺度</span><b>' + c.alertness + '</b></div>' +
            '<div class="attr"><span>合約</span><b>' + c.contractYears + '年</b></div>' +
            '<div class="attr"><span>年薪</span><b>' + (typeof formatMoney === "function" ? formatMoney(c.salary) : c.salary) + '</b></div>' +
          '</div>' +
          '<div class="btnrow"><button class="btn-secondary v55hire-btn" data-idx="' + i + '">聘任</button></div>' +
          '</div>';
      }).join("");
      app.innerHTML = '<div class="wrap">' +
        '<div class="topbar"><div><div class="eyebrow">數據中心</div><div class="teamname">' + icon('chart') + ' 聘任分析主管</div></div></div>' +
        '<p class="sub dark">選擇一位分析主管。洞察力影響可見數據層級，校正力影響運氣校正準度，警覺度影響主動警訊品質。</p>' +
        candsHtml +
        '<div class="btnrow"><button id="v55hire-cancel" class="btn-outline">取消</button></div></div>';
      document.querySelectorAll(".v55hire-btn").forEach(function(b) {
        b.onclick = function() { v55ConfirmHireDirector(parseInt(b.dataset.idx)); };
      });
      document.getElementById("v55hire-cancel").onclick = function() { UI.v55DirHiring = false; UI.v55DirCandidates = null; render(); };
      return;
    }

    app.innerHTML = `<div class="wrap">
      <div class="topbar"><div><div class="eyebrow">數據中心・分析室 Lv.${tier}</div><div class="teamname">${icon('chart')} 進階數據分析</div></div></div>
      ${(typeof v55DirectorPanelHtml === "function") ? v55DirectorPanelHtml(ownTeam) : ""}
      <div class="tabrow">
        <button class="tab ${tab === "batters" ? "active" : ""}" data-dctab="batters">打者排行</button>
        <button class="tab ${tab === "pitchers" ? "active" : ""}" data-dctab="pitchers">投手排行</button>
        ${tier >= 3 ? `<button class="tab ${tab === "luck" ? "active" : ""}" data-dctab="luck">運氣校正</button>` : ""}
      </div>
      <div class="btnrow" style="margin:8px 0 4px;">
        <button class="btn-outline v55dc-scope ${scope === "league" ? "active" : ""}" data-scope="league">全聯盟</button>
        <button class="btn-outline v55dc-scope ${scope === "team" ? "active" : ""}" data-scope="team">本隊</button>
      </div>
      ${tableHtml}
      <div class="btnrow"><button id="v55dc-back" class="btn-outline">返回主控台</button></div>
    </div>`;
    wireDataCenter();
  } catch (e) {
    app.innerHTML = `<div class="wrap"><div class="card"><p>載入數據中心時發生錯誤。</p></div><div class="btnrow"><button id="v55dc-back" class="btn-outline">返回主控台</button></div></div>`;
    var bk = document.getElementById("v55dc-back"); if (bk) bk.onclick = function() { UI.screen = "dashboard"; render(); };
  }
}

/* --- 打者排行表 --- */
function v55DCBattersTable(batters, tier, sortKey, sortDir) {
  if (!batters || batters.length === 0) return `<p class="sub dark">尚無足夠數據。</p>`;
  var sorted = batters.slice();
  sorted.sort(function(a, b) {
    var va = (a.advanced && a.advanced[sortKey] != null) ? a.advanced[sortKey] : -999;
    var vb = (b.advanced && b.advanced[sortKey] != null) ? b.advanced[sortKey] : -999;
    return sortDir === "desc" ? vb - va : va - vb;
  });
  sorted = sorted.slice(0, 40);
  var f3 = function(v) { return v != null ? (typeof v === "number" ? v.toFixed(3) : String(v)) : "—"; };
  var f1 = function(v) { return v != null ? (typeof v === "number" ? v.toFixed(1) : String(v)) : "—"; };
  /* 依 tier 決定顯示欄位 */
  var cols = [["PA","打席",function(r){ return r.pa; }]];
  if (tier >= 1) {
    cols.push(["OBP","上壘率",function(r){ return f3(r.advanced.OBP); }]);
    cols.push(["SLG","長打率",function(r){ return f3(r.advanced.SLG); }]);
    cols.push(["OPS","OPS",function(r){ return f3(r.advanced.OPS); }]);
  }
  if (tier >= 2) {
    cols.push(["ISO","ISO",function(r){ return f3(r.advanced.ISO); }]);
    cols.push(["K%","三振",function(r){ return f1(r.advanced["K%"]); }]);
    cols.push(["BB%","保送",function(r){ return f1(r.advanced["BB%"]); }]);
  }
  if (tier >= 3) {
    cols.push(["OPS+","OPS+",function(r){ return r.advanced["OPS+"] || "—"; }]);
    cols.push(["BABIP","BABIP",function(r){ return f3(r.advanced.BABIP); }]);
    cols.push(["HardHit%","強襲",function(r){ return f1(r.advanced["HardHit%"]); }]);
  }
  var confBadge = function(r) {
    var c = r.advanced.confidence || "insufficient";
    var cls = c === "reliable" ? "v55conf-ok" : (c === "moderate" ? "v55conf-mid" : "v55conf-low");
    return `<span class="v55conf-dot ${cls}"></span>`;
  };
  var thead = `<tr><th>#</th><th>球員</th>${cols.map(function(c){ return `<th class="v55dc-sortable" data-sortkey="${c[0]}">${c[1]}</th>`; }).join("")}</tr>`;
  var tbody = sorted.map(function(r, i) {
    var teamName = (S.teams && S.teams[r.team]) ? S.teams[r.team].abbr || S.teams[r.team].name.slice(0, 4) : "";
    var cells = cols.map(function(c) { return `<td>${c[2](r)}</td>`; }).join("");
    return `<tr class="v55dc-row" data-pid="${r.id}"><td>${i + 1}</td><td>${confBadge(r)}${r.name}<span class="sub" style="margin-left:4px;font-size:11px;">${teamName}</span></td>${cells}</tr>`;
  }).join("");
  return `<div class="v55dc-table-wrap"><table class="stattable v55dc-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
}

/* --- 投手排行表 --- */
function v55DCPitchersTable(pitchers, tier, sortKey, sortDir) {
  if (!pitchers || pitchers.length === 0) return `<p class="sub dark">尚無足夠數據。</p>`;
  var sorted = pitchers.slice();
  /* ERA/FIP 排序方向預設 asc（低即好） */
  var lowerIsBetter = ["ERA", "FIP", "BB%", "BB/9", "BABIP"];
  var effDir = sortDir;
  if (lowerIsBetter.indexOf(sortKey) >= 0 && sortDir === "desc") effDir = "asc";
  else if (lowerIsBetter.indexOf(sortKey) >= 0 && sortDir === "asc") effDir = "desc";
  sorted.sort(function(a, b) {
    var va = (a.advanced && a.advanced[sortKey] != null) ? a.advanced[sortKey] : 999;
    var vb = (b.advanced && b.advanced[sortKey] != null) ? b.advanced[sortKey] : 999;
    return effDir === "desc" ? vb - va : va - vb;
  });
  sorted = sorted.slice(0, 40);
  var f2 = function(v) { return v != null ? (typeof v === "number" ? v.toFixed(2) : String(v)) : "—"; };
  var f1 = function(v) { return v != null ? (typeof v === "number" ? v.toFixed(1) : String(v)) : "—"; };
  var f3 = function(v) { return v != null ? (typeof v === "number" ? v.toFixed(3) : String(v)) : "—"; };
  var cols = [["IP","局數",function(r){ return f1(r.ip); }]];
  if (tier >= 1) {
    cols.push(["ERA","防禦率",function(r){ return f2(r.advanced.ERA); }]);
    cols.push(["K/9","K/9",function(r){ return f1(r.advanced["K/9"]); }]);
    cols.push(["BB/9","BB/9",function(r){ return f1(r.advanced["BB/9"]); }]);
  }
  if (tier >= 2) {
    cols.push(["K%","三振率",function(r){ return f1(r.advanced["K%"]); }]);
    cols.push(["BB%","保送率",function(r){ return f1(r.advanced["BB%"]); }]);
  }
  if (tier >= 3) {
    cols.push(["FIP","FIP",function(r){ return f2(r.advanced.FIP); }]);
    cols.push(["ERA+","ERA+",function(r){ return r.advanced["ERA+"] || "—"; }]);
    cols.push(["GB%","滾地",function(r){ return f1(r.advanced["GB%"]); }]);
    cols.push(["BABIP","BABIP",function(r){ return f3(r.advanced.BABIP); }]);
  }
  var confBadge = function(r) {
    var c = r.advanced.confidence || "insufficient";
    var cls = c === "reliable" ? "v55conf-ok" : (c === "moderate" ? "v55conf-mid" : "v55conf-low");
    return `<span class="v55conf-dot ${cls}"></span>`;
  };
  var thead = `<tr><th>#</th><th>球員</th>${cols.map(function(c){ return `<th class="v55dc-sortable" data-sortkey="${c[0]}">${c[1]}</th>`; }).join("")}</tr>`;
  var tbody = sorted.map(function(r, i) {
    var teamName = (S.teams && S.teams[r.team]) ? S.teams[r.team].abbr || S.teams[r.team].name.slice(0, 4) : "";
    var cells = cols.map(function(c) { return `<td>${c[2](r)}</td>`; }).join("");
    return `<tr class="v55dc-row" data-pid="${r.id}"><td>${i + 1}</td><td>${confBadge(r)}${r.name}<span class="sub" style="margin-left:4px;font-size:11px;">${teamName}</span></td>${cells}</tr>`;
  }).join("");
  return `<div class="v55dc-table-wrap"><table class="stattable v55dc-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
}

/* --- 運氣校正分頁（Tier 3 專屬） --- */
function v55DCLuckTable(data, tier) {
  if (tier < 3) return `<p class="sub dark">${icon('locked')} 運氣校正需要分析室 Lv.3。</p>`;
  var f3 = function(v) { return v != null ? (typeof v === "number" ? v.toFixed(3) : String(v)) : "—"; };
  var f2 = function(v) { return v != null ? (typeof v === "number" ? v.toFixed(2) : String(v)) : "—"; };
  var sign3 = function(v) { return v == null ? "—" : ((v > 0 ? "+" : "") + v.toFixed(3)); };
  var sign2 = function(v) { return v == null ? "—" : ((v > 0 ? "+" : "") + v.toFixed(2)); };
  var luckTag = function(dir) {
    if (dir === "lucky") return `<span class="v55luck-tag v55luck-lucky">好運偏高</span>`;
    if (dir === "unlucky") return `<span class="v55luck-tag v55luck-unlucky">壞運偏多</span>`;
    return `<span class="v55luck-tag v55luck-neutral">中性</span>`;
  };
  /* 打者運氣排行：按 babipLuck 絕對值排序（偏離最大 = 最值得關注） */
  var luckyBatters = (data.batters || []).filter(function(r) { return r.luck && r.luck.reliable; });
  luckyBatters.sort(function(a, b) { return Math.abs(b.luck.babipLuck) - Math.abs(a.luck.babipLuck); });
  luckyBatters = luckyBatters.slice(0, 25);
  var batHtml = "";
  if (luckyBatters.length > 0) {
    var bRows = luckyBatters.map(function(r) {
      var teamName = (S.teams && S.teams[r.team]) ? S.teams[r.team].abbr || S.teams[r.team].name.slice(0, 4) : "";
      return `<tr class="v55dc-row" data-pid="${r.id}"><td>${r.name}<span class="sub" style="margin-left:4px;font-size:11px;">${teamName}</span></td>` +
        `<td>${f3(r.luck.AVG)}</td><td>${f3(r.luck.xAVG)}</td><td>${sign3(r.luck.avgLuck)}</td>` +
        `<td>${f3(r.luck.BABIP)}</td><td>${f3(r.luck.xBABIP)}</td>` +
        `<td>${luckTag(r.luck.luckDirection)}</td></tr>`;
    }).join("");
    batHtml = `<div class="divlabel">打者運氣校正（BABIP 偏離排行）</div>` +
      `<div class="v55dc-table-wrap"><table class="stattable v55dc-table"><thead><tr><th>球員</th><th>AVG</th><th>xAVG</th><th>差距</th><th>BABIP</th><th>xBABIP</th><th>判定</th></tr></thead><tbody>${bRows}</tbody></table></div>`;
  }
  /* 投手運氣排行：按 ERA-FIP 絕對值排序 */
  var luckyPitchers = (data.pitchers || []).filter(function(r) { return r.luck && r.luck.reliable; });
  luckyPitchers.sort(function(a, b) { return Math.abs(b.luck.eraFipGap) - Math.abs(a.luck.eraFipGap); });
  luckyPitchers = luckyPitchers.slice(0, 25);
  var pitHtml = "";
  if (luckyPitchers.length > 0) {
    var pRows = luckyPitchers.map(function(r) {
      var teamName = (S.teams && S.teams[r.team]) ? S.teams[r.team].abbr || S.teams[r.team].name.slice(0, 4) : "";
      return `<tr class="v55dc-row" data-pid="${r.id}"><td>${r.name}<span class="sub" style="margin-left:4px;font-size:11px;">${teamName}</span></td>` +
        `<td>${f2(r.luck.ERA)}</td><td>${f2(r.luck.FIP)}</td><td>${sign2(r.luck.eraFipGap)}</td>` +
        `<td>${f3(r.luck.BABIP)}</td>` +
        `<td>${luckTag(r.luck.luckDirection)}</td></tr>`;
    }).join("");
    pitHtml = `<div class="divlabel">投手運氣校正（ERA-FIP 偏離排行）</div>` +
      `<div class="v55dc-table-wrap"><table class="stattable v55dc-table"><thead><tr><th>球員</th><th>ERA</th><th>FIP</th><th>差距</th><th>BABIP</th><th>判定</th></tr></thead><tbody>${pRows}</tbody></table></div>`;
  }
  var desc = `<div class="card" style="margin:8px 0;">` +
    `<p class="sub dark" style="margin:0;">${icon('chart')} <b>運氣校正</b>：比較實際數據與擊球品質預期值。差距大＝運氣成分高，明年很可能回歸常態。` +
    `「好運偏高」的球員目前數據優於真實能力（趁高賣出）；「壞運偏多」的則被低估（低買良機）。</p></div>`;
  if (!batHtml && !pitHtml) return desc + `<p class="sub dark">本季尚無足夠數據進行運氣校正（需累積約 200 打席 / 300 面對打者）。</p>`;
  return desc + batHtml + pitHtml;
}

/* --- 數據中心事件綁定 --- */
function wireDataCenter() {
  try {
    document.getElementById("v55dc-back").onclick = function() { UI.screen = "dashboard"; render(); };
    document.querySelectorAll("[data-dctab]").forEach(function(btn) {
      btn.onclick = function() {
        UI.dcTab = btn.dataset.dctab;
        if (UI.dcTab === "batters") UI.dcSort = "OPS+";
        else if (UI.dcTab === "pitchers") UI.dcSort = "ERA+";
        else UI.dcSort = null;
        render();
      };
    });
    document.querySelectorAll(".v55dc-scope").forEach(function(btn) {
      btn.onclick = function() { UI.dcScope = btn.dataset.scope; render(); };
    });
    document.querySelectorAll(".v55dc-sortable").forEach(function(th) {
      th.onclick = function() {
        var key = th.dataset.sortkey;
        if (UI.dcSort === key) {
          UI.dcSortDir = (UI.dcSortDir === "desc") ? "asc" : "desc";
        } else {
          UI.dcSort = key;
          UI.dcSortDir = "desc";
        }
        render();
      };
    });
    document.querySelectorAll(".v55dc-row").forEach(function(row) {
      row.onclick = function() {
        var pid = row.dataset.pid;
        if (pid) { UI.selectedPlayerId = pid; UI.playerDetailReturn = "dataCenter"; UI.screen = "playerDetail"; render(); }
      };
    });
    /* v55 Phase 3：聘任/解聘分析主管 */
    var hireBtn = document.getElementById("v55-hire-director");
    if (hireBtn) hireBtn.onclick = function() { v55HireDirector(); };
    /* 警訊卡內球員點擊 */
    document.querySelectorAll(".v55alert-item").forEach(function(el) {
      var pid = el.dataset.pid;
      if (pid) { el.style.cursor = "pointer"; el.onclick = function() { UI.selectedPlayerId = pid; UI.playerDetailReturn = "dataCenter"; UI.screen = "playerDetail"; render(); }; }
    });
  } catch (_) {}
}

/* ====================================================================
   v55 L3 Phase 3：分析主管警訊卡（主控台）＋聘任 UI（數據中心）
   ==================================================================== */

/* 主控台警訊卡 */
function v55RenderAlertsCard(team) {
  try {
    if (!team || !team.analysisDirector) return "";
    var dir = team.analysisDirector;
    var alerts = (typeof v55GenerateAlerts === "function") ? v55GenerateAlerts(team) : [];
    if (alerts.length === 0 && S.currentDay < 30) return ""; // 季初數據不足時不顯示空卡
    var sevIcon = function(s) {
      if (s === "warning") return icon('chart-down');
      if (s === "opportunity") return icon('chart-up');
      return icon('chart');
    };
    var sevClass = function(s) {
      if (s === "warning") return "v55alert-warn";
      if (s === "opportunity") return "v55alert-opp";
      return "v55alert-info";
    };
    var alertsHtml = alerts.length > 0
      ? alerts.map(function(a) {
          return '<p class="sub dark v55alert-item ' + sevClass(a.severity) + '" data-pid="' + (a.playerId || '') + '">' +
                 sevIcon(a.severity) + ' ' + a.text + '</p>';
        }).join("")
      : '<p class="sub dark">目前無特別警訊。球季中累積更多數據後會出現套利建議。</p>';
    return '<div class="card v55alert-card">' +
      '<div class="eyebrow">' + icon('chart') + ' 分析主管報告 — ' + dir.name + '</div>' +
      alertsHtml +
      '<p class="draftnote muted">分析主管洞察力 ' + dir.insight + '・校正力 ' + dir.correction + '・警覺度 ' + dir.alertness +
      '（數據中心可查看詳情與聘任）</p></div>';
  } catch (_) { return ""; }
}

/* 數據中心：分析主管面板（嵌入數據中心頂部） */
function v55DirectorPanelHtml(team) {
  try {
    var dir = team ? team.analysisDirector : null;
    if (dir) {
      return '<div class="card" style="margin:8px 0;">' +
        '<div class="eyebrow">' + icon('chart') + ' 數據分析主管</div>' +
        '<div class="attrgrid">' +
          '<div class="attr"><span>姓名</span><b>' + dir.name + '</b></div>' +
          '<div class="attr"><span>洞察力</span><b>' + dir.insight + '</b></div>' +
          '<div class="attr"><span>校正力</span><b>' + dir.correction + '</b></div>' +
          '<div class="attr"><span>警覺度</span><b>' + dir.alertness + '</b></div>' +
          '<div class="attr"><span>合約</span><b>' + (dir.contractYears || 0) + '年</b></div>' +
          '<div class="attr"><span>年薪</span><b>' + (typeof formatMoney === "function" ? formatMoney(dir.salary) : dir.salary) + '</b></div>' +
        '</div>' +
        '<p class="sub dark">洞察力影響可見數據層級（' + (dir.insight >= 60 ? '+1 tier bonus' : '未達 60，無 tier 加成') + '）。' +
        '校正力影響運氣校正準確度。警覺度' + (dir.alertness >= 65 ? '已達 65，啟用全聯盟掃描。' : '未達 65，僅掃描本隊。') + '</p>' +
        '</div>';
    }
    /* 未聘用：顯示聘任按鈕 */
    return '<div class="card" style="margin:8px 0;">' +
      '<div class="eyebrow">' + icon('chart') + ' 數據分析主管（未聘任）</div>' +
      '<p class="sub dark">聘用分析主管可提升可見數據層級、啟用運氣校正與套利警訊。' +
      '這是全遊戲投報率最高的一次聘任。</p>' +
      (S.currentDay === 0 ? '<div class="btnrow"><button id="v55-hire-director" class="btn-secondary">' + icon('plus') + ' 聘任分析主管</button></div>' : '<p class="draftnote muted">聘任僅限休賽季（春訓前）。</p>') +
      '</div>';
  } catch (_) { return ""; }
}

/* 聘任流程 */
function v55HireDirector() {
  try {
    var team = S.teams[S.userTeamId];
    if (!team || S.currentDay > 0) { UI.flash = "聘任僅限休賽季。"; render(); return; }
    if (team.analysisDirector) { UI.flash = "已有分析主管。"; render(); return; }
    /* 產生3個候選人供選擇 */
    var candidates = [];
    for (var i = 0; i < 3; i++) candidates.push(v55GenerateAnalysisDirector(S.userTeamId));
    UI.v55DirCandidates = candidates;
    UI.v55DirHiring = true;
    render();
  } catch (_) { UI.flash = "聘任時發生錯誤。"; render(); }
}

function v55ConfirmHireDirector(idx) {
  try {
    var team = S.teams[S.userTeamId];
    var c = (UI.v55DirCandidates || [])[idx];
    if (!team || !c) return;
    if (typeof payFacilityCost === "function" && !payFacilityCost(team, Math.round(c.salary / 10000), "分析主管簽約金")) return;
    team.analysisDirector = c;
    UI.v55DirHiring = false;
    UI.v55DirCandidates = null;
    UI.flash = "已聘任分析主管 " + c.name + "！";
    if (typeof persist === "function") persist();
    render();
  } catch (_) { UI.flash = "聘任時發生錯誤。"; render(); }
}

function v55FireDirector() {
  try {
    var team = S.teams[S.userTeamId];
    if (!team || !team.analysisDirector) return;
    var name = team.analysisDirector.name;
    team.analysisDirector = null;
    UI.flash = "已解聘分析主管 " + name + "。";
    if (typeof persist === "function") persist();
    render();
  } catch (_) {}
}
