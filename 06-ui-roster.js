function nameWithDutyTag(p) {
  const nat = p.foreign ? `<span class="nationtag">${p.nationality}</span>` : "";
  const train = p.midTraining ? `<span class="traintag" title="季中特訓中">🏋️</span>` : ""; // v26特訓標記
  const cap = (p.team && S.teams[p.team] && S.teams[p.team].captainId === p.id) ? `<span class="captag" title="隊長">Ⓒ隊長</span>` : ""; // v37④隊長標記
  if (isInjured(p)) {
    if (p.injury.pendingSurgery) return `${p.name}${cap}${nat}<br><span class="injurytag">⚕️${p.injury.name}・待決定治療方針</span>`;
    return `${p.name}${cap}${nat}<br><span class="injurytag">🩹${p.injury.name}・剩${p.injury.daysLeft}天</span>`;
  }
  return `${p.name}${cap}${train}${nat}`;
}
// v26傷病體質標籤：中重度傷病史≥2筆時顯示（球員詳情與球探視角共用）
function injuryProneTagHtml(p) {
  const sig = (p.injuryHistory || []).filter(h => h.severity !== "light").length;
  return sig >= 2 ? `<span class="pronetag" title="中重度傷病史 ${sig} 筆">⚠️傷病體質</span>` : "";
}
function renderRosterNav(active) {
  const team = S.teams[S.userTeamId];
  const tabs = [
    { key: "roster1", label: `1軍名單（${team.roster1.length}）`, screen: "roster", rosterTab: "1軍" },
    { key: "roster2", label: `2軍名單（${team.roster2.length}）`, screen: "roster", rosterTab: "2軍" },
    { key: "lineup", label: "先發打線", screen: "lineup", rosterTab: "" },
    { key: "rotation", label: "投手輪值/牛棚", screen: "rotation", rosterTab: "" },
    { key: "coaches", label: "教練團", screen: "coaches", rosterTab: "" },
    { key: "scouts", label: "球探室", screen: "scouts", rosterTab: "" },
    { key: "freeAgents", label: "自由球員市場", screen: "freeAgents", rosterTab: "" },
    { key: "internationalMarket", label: "國際球員市場", screen: "internationalMarket", rosterTab: "" },
    { key: "finance", label: "財務", screen: "finance", rosterTab: "" },
    { key: "marketing", label: "行銷企劃", screen: "marketing", rosterTab: "" },
    { key: "facilities", label: "球場硬體建設", screen: "facilities", rosterTab: "" }
  ];
  return `<div class="tabrow" style="flex-wrap:wrap;">${tabs.map(t => `<button class="tab navtab ${active === t.key ? "active" : ""}" data-screen="${t.screen}" data-rostertab="${t.rosterTab}" style="flex:1 1 30%;min-width:90px;margin-bottom:6px;">${t.label}</button>`).join("")}</div>`;
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
  return `<div class="card">
    <div class="eyebrow">🔁 板凳替補指派（代打／代跑／代守）</div>
    <p class="sub dark">為板凳（一軍非先發的健康野手）指定近戰替補專員。<b>只在近戰（分差3分內）</b>局面發動：代打／代跑幫落後或平手的自家追平・超前1分，代守幫小幅領先守下1分；被指派者會累計替補出賽成績。先發名單內或傷兵不可指派。</p>
    ${bench.length === 0 ? `<p class="draftnote muted">目前一軍沒有可用的板凳野手（先發之外的健康野手）。</p>` : roles.map(rowHtml).join("")}
  </div>`;
}
function setBenchRole(roleKey, pid) {
  const team = S.teams[S.userTeamId];
  if (!team) return;
  team.benchRoles = team.benchRoles || {};
  if (pid) team.benchRoles[roleKey] = pid; else delete team.benchRoles[roleKey];
  persist(); render();
}
function renderLineup() {
  const team = S.teams[S.userTeamId];
  ensureLineup(team);
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
      <p class="sub dark" style="margin-bottom:10px;">棒次順序會影響打席分配（越前面打席越多）。本聯盟採指定打擊制（DH），投手不用打擊，打線需排滿8個守位＋DH共9人；守位選擇會自動避免與其他先發重複。也可以將球員「移防」到非本職守位出賽，但守備成功率會依守位落差程度下降（例如游擊手臨時去守外野，落差比游擊手改守二壘更明顯）。</p>
      ${issues.length > 0 ? `<div class="card issuecard"><div class="eyebrow">打線守位提醒</div><ul class="issuelist">${issues.map(i => `<li>${i}</li>`).join("")}</ul></div>` : ""}
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
                <select class="lineup-pos-select" data-idx="${i}">
                  ${allOptions.map(pos => `<option value="${pos}" ${pos === slot.position ? "selected" : ""}>${POS_LABEL[pos]}${(pos !== "DH" && !knownPositions.has(pos)) ? "（移防）" : ""}</option>`).join("")}
                </select>
              </td>
              <td>${p.contact}</td><td>${p.power}</td><td>${p.eye}</td><td>${p.speed}</td><td>${effRating}${(slot.position !== "DH" && !knownPositions.has(slot.position)) ? "*" : ""}</td><td>${p.composure}</td>
              <td class="lineup-actions">
                <button class="movebtn lineup-order-btn" data-idx="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""} title="棒次上移">▲</button>
                <button class="movebtn lineup-order-btn" data-idx="${i}" data-dir="1" ${i === team.lineup.length - 1 ? "disabled" : ""} title="棒次下移">▼</button>
                <button class="movebtn lineup-swap-btn" data-idx="${i}">更換</button>
              </td>
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
        <button id="btn-auto-lineup" class="btn-secondary">自動排列</button>
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
  document.getElementById("btn-auto-lineup").onclick = () => resetLineup();
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
  if (UI.tradeGive.length === 0 && UI.tradeGet.length === 0) return;
  const result = evaluateTrade(UI.tradeGive, UI.tradeGet, UI.tradePartner); // v27：交易評估帶入對方球團（個性＋交情）
  if (result.accept) {
    if (result.hijackedRumorId && typeof settleHijack === "function") settleHijack(result.hijackedRumorId); // v32：插隊搶人成功→賣方+好感/被搶買家記恨（先結算再執行，避免風聲被executeTrade清除）
    executeTrade(S.userTeamId, UI.tradePartner, UI.tradeGive, UI.tradeGet);
    UI.tradeIntercept = null;
    UI.tradeResult = { success: true, reason: result.reason };
    UI.tradeGive = [];
    UI.tradeGet = [];
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
          return `<button class="teamcard" data-id="${t.id}" ${!open ? "disabled" : ""}>${t.name}<br><span class="teamcardsub">${personaTagHtml(t)}<span class="afftag ${af.cls}">${af.text}</span></span></button>`;
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
  const giveValue = UI.tradeGive.reduce((s, id) => s + tradeValue(S.players[id]), 0);
  const getValue = UI.tradeGet.reduce((s, id) => s + tradeValue(S.players[id]), 0);
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
          ${events.length > 0 ? `<p class="draftnote muted">📓 他們記得：${events.map(e => `第${e.year}年${e.text}（${e.delta > 0 ? "+" : ""}${e.delta}）`).join("；")}</p>` : ""}
        </div>`;
      })()}
      <div class="divlabel">你提供（${teamA.name}）</div>
      <p class="draftnote muted">自己球隊球員顯示真實能力值。</p>
      <table class="stattable">
        <thead><tr><th></th><th>姓名</th><th>層級</th><th>類型</th><th>守位</th><th>能力</th></tr></thead>
        <tbody>
          ${myPlayers.map(p => `<tr>
            <td><input type="checkbox" class="give-check" data-id="${p.id}" ${UI.tradeGive.includes(p.id) ? "checked" : ""}></td>
            <td>${p.name}</td><td>${p.level}</td><td>${p.isPitcher ? "投手" : "野手"}</td>
            <td>${p.isPitcher ? p.role : p.positions.map(x => POS_LABEL[x.pos]).join("/")}</td>
            <td>${p.isPitcher ? `球速${velocityKmh(p.velocity)}km/h・控球${p.control}・體力${p.stamina}` : `接觸${p.contact}・長打${p.power}・選球${p.eye}・速度${p.speed}・守備${p.fielding}%`}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div class="divlabel">你想要（${teamB.name}，球探評估值）</div>
      <p class="draftnote muted">守位是公開資訊、真實不變；但能力數值是交易球探的評估值，準確度越高落差越小。</p>
      <table class="stattable">
        <thead><tr><th></th><th>姓名</th><th>層級</th><th>類型</th><th>守位</th><th>評估能力</th></tr></thead>
        <tbody>
          ${theirPlayers.map(p => {
            const sc = UI.tradeScoutedCache[p.id] || {};
            return `<tr>
            <td><input type="checkbox" class="get-check" data-id="${p.id}" ${UI.tradeGet.includes(p.id) ? "checked" : ""}></td>
            <td>${p.name}</td><td>${p.level}</td><td>${p.isPitcher ? "投手" : "野手"}</td>
            <td>${p.isPitcher ? p.role : p.positions.map(x => POS_LABEL[x.pos]).join("/")}</td>
            <td>${p.isPitcher ? `球速${velocityKmh(sc.velocity)}km/h・控球${sc.control}` : `接觸${sc.contact}・長打${sc.power}・選球${sc.eye}・速度${sc.speed}・守備${sc.fielding}%`}</td>
          </tr>`;
          }).join("")}
        </tbody>
      </table>
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">你提供的價值</div><div class="sb-value small">${giveValue.toFixed(1)}</div></div>
        <div class="sb-row small"><div class="sb-label">你想要的價值</div><div class="sb-value small">${getValue.toFixed(1)}</div></div>
      </div>
      <div class="btnrow">
        <button id="btn-submit-trade" class="btn-primary" ${(UI.tradeGive.length === 0 && UI.tradeGet.length === 0) ? "disabled" : ""}>提出交易</button>
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
  if (p.age < perceivedPeak && headroom >= 5) return { key: 0, cls: "up", text: `📈 看漲：距顛峰還有空間（球探評估・${conf}）` };
  if (p.age <= perceivedPeak) return { key: 1, cls: "flat", text: `➡️ 持平：正值顛峰期（球探評估・${conf}）` };
  const gap = p.age - perceivedPeak;
  return { key: 2, cls: "down", text: `📉 ${gap >= 3 ? "明顯衰退中" : "已開始衰退"}：顛峰已過約${gap}年（球探評估・${conf}）` };
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
      <p class="sub dark" style="margin-bottom:10px;">合約到期後選擇不續留的球員會出現在這裡，可隨時簽下補強（需支付簽約金，約為年薪的30%）。本土球員在聯盟打滾多年，能力值為公開的真實數字；「未來看漲/看跌」則是本土球探的前瞻評估，精準度越高越可靠。</p>
      ${agents.length === 0 ? `<p class="sub dark">目前沒有自由球員。</p>` : agents.map(p => {
        const trend = faTrendReport(p, team);
        const lastLine = negoStatLine(p, p.lastSeasonStats);
        return `
      <div class="card draftcard">
        <div class="draftcard-head">
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
        ${lastLine ? `<div class="draftnote muted">📊 上季成績：${lastLine}</div>` : `<div class="draftnote muted">📊 上季無出賽紀錄</div>`}
        <div class="draftnote muted">預估年薪 ${formatMoney(computePlayerSalary(p))}・簽約金約 ${formatMoney(Math.round(computePlayerSalary(p) * 0.3))}</div>
      </div>`;
      }).join("")}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  const sortSel = document.getElementById("sort-fa");
  if (sortSel) sortSel.onchange = e => { UI.faSort = e.target.value; render(); };
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
  const exclusiveCount = agents.filter(p => p.exclusive).length;
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
      ${agents.length === 0 ? `<p class="sub dark">目前沒有可簽約的國際球員，請等下個休賽季再來看看。</p>` : agents.map(p => `
      <div class="card draftcard">
        <div class="draftcard-head">
          <div>
            <div class="draftname">${p.name}${p.exclusive ? `<span class="exclusivetag">獨家情報</span>` : ""}</div>
            <div class="draftmeta"><span class="nationtag">${p.nationality}${(nationByName(p.nationality) || {}).grade ? "・" + nationByName(p.nationality).grade + "級" : ""}</span> ${p.isPitcher ? "投手" : "野手"} ・ ${p.age}歲 ・ ${p.isPitcher ? p.throws + "投" : p.bats + "打／" + p.throws + "投"}${p.isPitcher ? ` ・ ${p.role}` : ` ・ ${p.positions.map(x => POS_LABEL[x.pos]).join("/")}`}</div>
          </div>
          <button class="pickbtn sign-intl-btn" data-id="${p.id}">簽下</button>
        </div>
        <div class="draftgrades">
          <span class="gradebadge grade-${p.scoutedGrade}">現況 ${p.scoutedGrade}${p.scoutedOverall != null ? `（${p.scoutedOverall}）` : ""}</span>
          <span class="gradebadge grade-${p.scoutedCeiling}">天花板 ${p.scoutedCeiling}${p.scoutedCeilingVal != null ? `（約${p.scoutedCeilingVal}）` : ""}</span>
        </div>
        <div class="attrgrid">
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
          `}
        </div>
        <div class="draftnote">${p.archetype} ・ ${p.maturity}</div>
        <div class="draftnote muted">${p.scoutConfidence}${p.exclusive ? " ・ 球探獨家人脈，僅本隊可接觸簽約" : ""}</div>
      </div>`).join("")}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  document.getElementById("sort-intl").onchange = e => { UI.intlSort = e.target.value; render(); };
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
  document.getElementById("btn-back").onclick = () => { UI.scoutPicker = null; UI.scoutCandidates = null; UI.screen = "dashboard"; render(); };
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
            const abilityTag = c.specialAbility ? `<br><span class="specialabilitytag">★${c.specialAbility.name}</span>` : "";
            const expiring = c.contractYears <= 1;
            return `<tr><td>${role}${expiring ? `<br><span class="specialabilitytag" style="color:var(--redline);">合約將到期</span>` : ""}</td><td>${c.name}${c.formerPlayer ? "（退休轉任）" : ""}${abilityTag}</td><td>${SPECIALTY_LABEL[c.specialty]}</td><td>${c.teaching}</td><td>${c.contractYears}年</td><td>
              <button class="movebtn open-picker-btn" data-role="${role}">更換</button>
              <button class="movebtn swap-level-btn" data-role="${role}">與${level === "1軍" ? "2軍" : "1軍"}互換</button>
            </td></tr>`;
          }).join("")}
        </tbody>
      </table>
      <p class="sub dark">每位教練的專精會直接加成對應能力（例如打擊教練加成打擊、投手教練加成球速控球），總教練提供全隊小幅加成。約20%機率教練會帶有特殊能力（★標記），加成更明顯。<b>v31：合約到期不再自動暫代</b>——休賽季須逐一續約談判，談不成或不續約則職位空缺（加成歸零），須在此到自由市場簽人補上。</p>
      ${picking ? `
      <div class="card">
        <div class="eyebrow">聘僱新教練：${picking}（${level}）・${S.coaches[staff[picking]] ? `現任指導力 ${S.coaches[staff[picking]].teaching}` : "目前空缺"}</div>
        <p class="sub dark" style="margin-bottom:10px;">候選人包含幾位退休球員轉任人選與新聘教練人選，並排比較指導力／特殊能力後再決定。</p>
        <div class="teamgrid" style="grid-template-columns:1fr;gap:10px;">
          ${candidates.map((cand, idx) => {
            const curT = S.coaches[staff[picking]] ? S.coaches[staff[picking]].teaching : 0;
            const diff = cand.teaching - curT;
            const diffLabel = !S.coaches[staff[picking]] ? "（補實空缺）" : (diff > 3 ? `<span style="color:var(--green-text);">優於現任 +${diff}</span>` : (diff < -3 ? `<span style="color:var(--redline);">劣於現任 ${diff}</span>` : "與現任相當"));
            const abilityLine = cand.specialAbility ? `★${cand.specialAbility.name}（${SPECIALTY_LABEL[cand.specialAbility.category] || ""}加成）` : "無特殊能力";
            return `<div class="card" style="margin-bottom:0;padding:14px 16px;">
              <div class="draftcard-head">
                <div>
                  <div class="draftname">${cand.name}</div>
                  <div class="draftmeta">${cand.kind === "retiree" ? `退休球員轉任・退休時${cand.age}歲` : "新聘教練"}</div>
                </div>
                <button class="pickbtn hire-btn" data-idx="${idx}">聘用</button>
              </div>
              <div class="draftnote">指導力 ${cand.teaching}（${diffLabel}）</div>
              <div class="draftnote">${abilityLine}</div>
              <div class="draftnote muted">合約 ${cand.contractYears} 年</div>
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
      <select id="sort-draft" class="sortselect">
        <option value="default" ${sortKey === "default" ? "selected" : ""}>依現在能力評等排序</option>
        <option value="age" ${sortKey === "age" ? "selected" : ""}>依年齡排序（小到大）</option>
        <option value="ceiling" ${sortKey === "ceiling" ? "selected" : ""}>依天花板評等排序</option>
      </select>
      ${sorted.map(p => `
        <div class="card draftcard">
          <div class="draftcard-head">
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
          <div class="draftnote muted">${p.scoutConfidence}（球探有效準確度 ${draftEffAcc}，數值可能與真實能力有落差）</div>
        </div>`).join("")}
    </div>`;
  document.getElementById("sort-draft").onchange = (e) => { UI.draftSort = e.target.value; render(); };
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
        <div class="lg-team">${teamA.name}<span class="lg-score">${m.winsA}</span></div>
        <div class="lg-vs">${m.winner ? "系列賽結束" : "對戰中"}</div>
        <div class="lg-team">${teamB.name}<span class="lg-score">${m.winsB}</span></div>
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
  return `
    <div class="card lastgame">
      <div class="eyebrow">最近一戰</div>
      <div class="lg-row">
        <div class="lg-team">${team.name}<span class="lg-score">${myScore}</span></div>
        <div class="lg-vs">${isHome ? "主場迎戰" : "客場出擊"}</div>
        <div class="lg-team">${opp.name}<span class="lg-score">${oppScore}</span></div>
      </div>
      <div class="lg-result ${win ? "win" : "lose"}">${win ? "勝利" : "落敗"}</div>
    </div>`;
}

function renderStandings() {
  const divs = ["A1", "A2", "B1", "B2"];
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${S.leagueName}</div><h1>戰績榜</h1></div>
      ${divs.map(d => `
        <div class="divblock">
          <div class="divlabel">${DIV_LABEL[d]}</div>
          <table class="stattable">
            <thead><tr><th>球隊</th><th>勝</th><th>敗</th><th>勝率</th></tr></thead>
            <tbody>
              ${standingsForDivision(d).map(t => `
                <tr class="${t.isUser ? "me" : ""}">
                  <td>${t.name}</td><td>${t.wins}</td><td>${t.losses}</td><td>${pct(t.wins, t.losses)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      `).join("")}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
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
  const ids = UI.rosterTab === "1軍" ? team.roster1 : team.roster2;
  const list = ids.map(id => S.players[id]);
  const pitchers = applySort(list.filter(p => p.isPitcher), PITCHER_SORTS, UI.pitcherSort || "default", UI.pitcherSortDir);
  const batters = applySort(list.filter(p => !p.isPitcher), BATTER_SORTS, UI.batterSort || "default", UI.batterSortDir);
  const actionLabel = UI.rosterTab === "1軍" ? "下放2軍" : "升上1軍";
  const warnings = UI.rosterTab === "1軍" ? lineupRotationWarnings(team) : [];
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>球員名單</h1></div>
      ${renderRosterNav(UI.rosterTab === "2軍" ? "roster2" : "roster1")}
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      ${warnings.length > 0 ? `<div class="card issuecard"><div class="eyebrow">先發陣容提醒</div><ul class="issuelist">${warnings.map(i => `<li>${i}</li>`).join("")}</ul><p class="sub dark">前往「先發打線」或「投手輪值/牛棚」分頁即可調整。</p></div>` : ""}
      ${(team.roster1.length !== 28 || team.roster2.length !== 32) ? `<p class="sub dark" style="margin-bottom:12px;">名單人數已偏離編制（1軍限28人／2軍限32人），暫時超編或缺編都不影響比賽進行，會在下次選秀會後自動整編回正常編制。</p>` : ""}
      <div class="divlabel">投手（${pitchers.length}）</div>
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
      </table>
      <div class="divlabel">野手（${batters.length}）</div>
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
          ${batters.map(p => `<tr data-id="${p.id}"><td class="rowlink" data-id="${p.id}">${nameWithDutyTag(p)}</td><td>${conditionTagHtml(p)}</td><td>${p.age}</td><td>${p.positions.map(x => POS_LABEL[x.pos]).join("/")}</td><td>${UI.rosterTab === "1軍" ? batterLineupTag(team, p) : "－"}</td><td>${p.contact}</td><td>${p.power}</td><td>${p.eye}</td><td>${p.bunting || "-"}</td><td>${p.speed}</td><td>${p.fielding}</td><td><button class="movebtn" data-id="${p.id}">${actionLabel}</button></td></tr>`).join("")}
        </tbody>
      </table>
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  document.getElementById("sort-pitcher").onchange = (e) => { UI.pitcherSort = e.target.value; render(); };
  document.getElementById("sort-batter").onchange = (e) => { UI.batterSort = e.target.value; render(); };
  wireSortDirButtons();
  app.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => { UI.flash = null; UI.rosterTab = btn.dataset.tab; render(); };
  });
  app.querySelectorAll(".rowlink").forEach(td => {
    td.onclick = () => openPlayerDetail(td.dataset.id);
  });
  app.querySelectorAll(".movebtn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (UI.rosterTab === "1軍") demotePlayer(btn.dataset.id);
      else promotePlayer(btn.dataset.id);
    };
  });
  document.getElementById("btn-back").onclick = () => { UI.flash = null; UI.screen = "dashboard"; render(); };
  wireRosterNav();
}

function openPlayerDetail(id) {
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
  const curAbility = cur && cur.specialAbility ? `★${cur.specialAbility.name}` : "無";
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
    <div class="eyebrow">Ⓒ 隊長任命</div>
    <p class="sub dark">${curCap ? `現任隊長：<b>${curCap.name}</b>。` : "目前尚未任命隊長。"}隊長在陣期間全隊近戰抗壓提升、狀況偏正向；一季只能任命一次。</p>
    ${canThisSeason
      ? `<div class="btnrow"><button id="btn-appoint-captain" class="btn-primary">任命 ${p.name} 為隊長</button></div>`
      : `<p class="draftnote muted">本季已任命過隊長（${curCap ? curCap.name : ""}），需等下個球季才能更換隊長。</p>`}
  </div>`;
}
function renderMidTrainingSection(p, team) {
  if (typeof midTrainingSeasonActive !== "function") return "";
  if (!team || team.id !== S.userTeamId || p.retired || !midTrainingSeasonActive() || isInjured(p)) return "";
  const items = midItemsFor(p);
  const phase = (typeof growthPhaseLabel === "function") ? growthPhaseLabel(p) : null; // v37⑦：特訓時顯示生涯階段
  const phaseLine = phase ? `<p class="sub dark" style="margin:2px 0 8px;">📈 生涯階段：<b class="${phase.cls}">${phase.text}</b> — ${phase.desc}</p>` : "";
  if (p.midTraining) {
    const item = midItemByKey(p.midTraining.key);
    const pctv = clamp(Math.round(p.midTraining.points / MID_TRAINING_POINTS_PER_GAIN * 100), 0, 99);
    return `<div class="card">
      <div class="eyebrow">🏋️ 季中特訓中：${item ? item.label : ""}</div>
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
    <div class="eyebrow">🏋️ 季中特訓指派（${used}/${slots} 名額使用中）</div>
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
  return `
      <div class="divlabel">成績一覽</div>
      <table class="stattable">
        <thead>${head}</thead>
        <tbody>${rows}</tbody>
      </table>`;
}

function renderPlayerDetail() {
  const p = S.players[UI.selectedPlayerId];
  if (!p) {
    // 球員可能剛透過「建議退休轉任」或「臨時兼任」離開現役名單；若還有待處理的卡片就先顯示，否則直接返回名單
    if (UI.coachRefusal || UI.retireOffer) {
      app.innerHTML = `<div class="wrap">${renderCoachRefusalCard()}${renderRetireOfferCard()}<div class="btnrow"><button id="btn-back" class="btn-outline">返回名單</button></div></div>`;
      document.getElementById("btn-back").onclick = () => { UI.screen = "roster"; render(); };
      wireCoachRefusalCard();
      wireRetireOfferCard();
      return;
    }
    UI.screen = "roster";
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
      <div style="margin-bottom:8px;">
        <span class="nationtag">${nationDisplay(p)}</span>
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
        <div class="eyebrow">⚕️ 重傷：等待治療方針決定</div>
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
          <td>第${h.year}年</td><td>${h.recur ? "🔁" : ""}${h.name}</td><td>${h.part}</td><td>${h.severityLabel}</td><td>${h.days}</td>
          <td>${h.method === "surgery" ? "手術" : (h.method === "conservative" ? "保守" : "－")}${h.downgraded ? `・後遺症（${h.downgraded}）` : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <p class="draftnote muted">中重度傷病史越多，日後受傷與同部位復發的風險越高（復健中心可削減）；🔁＝舊傷復發。</p>` : ""}
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
  document.getElementById("btn-back").onclick = () => { UI.screen = "roster"; render(); };
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
}

/* ---------- 初始化 ---------- */
/* v34：把「載入存檔→升級鏈→畫面還原」抽成 hydrateLoadedState()，
   供開頁初始化、手動槽位讀取、JSON匯入三處共用。 */
function hydrateLoadedState(saved) {
      S = saved;
      // v35：槽位讀檔／JSON匯入不會重整頁面，先清掉上一份進度殘留的暫時性UI狀態，
      // 避免舊談判視窗/教練候選清單/確認框帶進新讀入的存檔。
      UI.negotiation = null; UI.coachPicker = null; UI.coachCandidates = null;
      UI.scoutPicker = null; UI.scoutCandidates = null;
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
