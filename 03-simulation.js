/* ---------- 賽程演算法 ---------- */
function roundRobinRounds(teamIds) {
  let ids = teamIds.slice();
  if (ids.length % 2 !== 0) ids.push(null);
  const n = ids.length;
  const rounds = [];
  let arr = ids.slice();
  for (let r = 0; r < n - 1; r++) {
    const roundPairs = [];
    for (let i = 0; i < n / 2; i++) {
      const t1 = arr[i], t2 = arr[n - 1 - i];
      if (t1 !== null && t2 !== null) {
        if ((r + i) % 2 === 0) roundPairs.push([t1, t2]); else roundPairs.push([t2, t1]);
      }
    }
    rounds.push(roundPairs);
    const fixed = arr[0]; const rest = arr.slice(1); rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }
  return rounds;
}

function buildSeasonSchedule(teams) {
  const teamIds = Object.keys(teams);
  const mainRounds = roundRobinRounds(teamIds);
  const schedule = [];
  // v30：每個循環交替主客（單週期單場循環賽本身主客不均，偶數循環對調可讓每隊主客場趨近對半），
  // 確保「實際主場帳」制下沒有球隊整季幾乎沒有主場。
  for (let cycle = 0; cycle < 6; cycle++) {
    const flip = cycle % 2 === 1;
    mainRounds.forEach(round => { schedule.push(round.map(([h, a]) => flip ? { home: a, away: h } : { home: h, away: a })); });
  }
  const divGroups = {};
  teamIds.forEach(tid => { const d = teams[tid].division; (divGroups[d] = divGroups[d] || []).push(tid); });
  const divRoundsMap = {};
  Object.keys(divGroups).forEach(div => { divRoundsMap[div] = roundRobinRounds(divGroups[div]); });
  for (let cycle = 0; cycle < 3; cycle++) {
    const flip = cycle % 2 === 1;
    for (let r = 0; r < 5; r++) {
      const dayGames = [];
      Object.keys(divRoundsMap).forEach(div => {
        (divRoundsMap[div][r] || []).forEach(([h, a]) => dayGames.push(flip ? { home: a, away: h } : { home: h, away: a }));
      });
      schedule.push(dayGames);
    }
  }
  return schedule;
}

/* ---------- 模擬引擎 ---------- */
function getLineupBatters(team, players) {
  if (team.lineup && team.lineup.length > 0) {
    const chosen = team.lineup.map(slot => players[slot.playerId]).filter(p => p && team.roster1.includes(p.id) && !(p.internationalDutyGamesLeft > 0) && !isInjured(p));
    if (chosen.length >= 5) return chosen;
  }
  return team.roster1.map(id => players[id]).filter(p => p && !p.isPitcher && !(p.internationalDutyGamesLeft > 0) && !isInjured(p))
    .sort((a, b) => (b.contact + b.power + b.eye) - (a.contact + a.power + a.eye)).slice(0, 9);
}

function getRotationPitchers(team, players) {
  if (team.rotation && team.rotation.length > 0) {
    const chosen = team.rotation.map(id => players[id]).filter(p => p && team.roster1.includes(p.id) && !(p.internationalDutyGamesLeft > 0) && !isInjured(p));
    if (chosen.length > 0) return chosen;
  }
  const auto = autoRotation(team, players).map(id => players[id]).filter(Boolean);
  // v42⑪：套用輪值方針（僅裁自動輪值；手動指定不動）；v43②：純GM 改用折射後方針
  if (team && team.id === S.userTeamId && S.gameMode === "pure_gm" && !S.takeover && typeof v43ApplyRotationPolicyRefracted === "function") {
    const ids = auto.map(p => p.id);
    return v43ApplyRotationPolicyRefracted(team, ids).map(id => players[id]).filter(Boolean);
  }
  return (typeof v42ApplyRotationPolicy === "function") ? v42ApplyRotationPolicy(team, auto) : auto;
}

const LINEUP_FIELD_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const POSITION_FAMILY = { C: "C", "1B": "COR_IF", "3B": "COR_IF", "2B": "MID_IF", SS: "MID_IF", LF: "COR_OF", RF: "COR_OF", CF: "CTR_OF" };
function positionFamilyPenalty(famA, famB) {
  if (famA === famB) return 0;
  if (famA === "C" || famB === "C") return 30;
  const IFs = ["COR_IF", "MID_IF"], OFs = ["COR_OF", "CTR_OF"];
  if (IFs.includes(famA) && IFs.includes(famB)) return 10;
  if (OFs.includes(famA) && OFs.includes(famB)) return 8;
  return 22;
}
// 移防到非擅長守位時，以主守位熟悉度為基礎，依守位族群差異扣分（例如游擊手臨時去守外野會有明顯落差）
function effectivePositionFielding(p, pos) {
  if (!pos || pos === "DH") return p.fielding;
  const known = p.positions.find(x => x.pos === pos);
  if (known) return known.rating;
  const primaryFam = POSITION_FAMILY[p.positions[0].pos];
  const targetFam = POSITION_FAMILY[pos];
  const penalty = positionFamilyPenalty(primaryFam, targetFam);
  return clamp(Math.round(p.fielding - penalty), 15, 95);
}
function battingPower(p) { return p.contact * 0.4 + p.power * 0.35 + p.eye * 0.25; }

/* ---------- v25 狀況機制：p.condition 五級（-2絕不調～+2絕好調），表現±8%、影響受傷率 ---------- */
const CONDITION_LABELS = { "-2": "絕不調", "-1": "低迷", "0": "普通", "1": "好調", "2": "絕好調" };
const CONDITION_ARROWS = { "-2": "↓", "-1": "↘", "0": "→", "1": "↗", "2": "↑" };
function conditionOf(p) { return clamp(Math.round(p.condition || 0), -2, 2); }
function conditionMult(p) { return 1 + conditionOf(p) * 0.04; } // 每級±4%，極端±8%
function conditionTagHtml(p) {
  const c = conditionOf(p);
  return `<span class="condtag cond${c}" title="狀況：${CONDITION_LABELS[c]}">${CONDITION_ARROWS[c]}</span>`;
}
// 每日狀況漂移（馬可夫鏈）：小機率±1，偏向回歸「普通」；情緒起伏特質波動加倍；
// 開季低迷鎖（國際賽失利／慢熱特質）以 p.slumpLockDays 表示，期間狀況上限壓在低迷以下。
function driftConditions() {
  Object.values(S.players).forEach(p => {
    if (!p.team) return;
    const moody = hasTrait(p, "moody");
    const chance = moody ? 0.24 : 0.12;
    if (Math.random() < chance) {
      const c = conditionOf(p);
      // v26宿舍：所屬球隊宿舍等級越高，漂移越偏向正向（每級+2%）
      const team = S.teams[p.team];
      let dormBias = (team && typeof dormConditionBias === "function") ? dormConditionBias(team) : 0;
      if (team && typeof teamHasCaptainBonus === "function" && teamHasCaptainBonus(team)) dormBias += 0.06; // v37④隊長在陣：全隊狀況漂移偏正向
      let dir;
      if (c > 0) dir = Math.random() < (0.6 - dormBias) ? -1 : 1;      // 高檔偏向回落（宿舍減緩）
      else if (c < 0) dir = Math.random() < (0.6 + dormBias * 1.5) ? 1 : -1; // 低檔偏向回升（宿舍加速）
      else dir = Math.random() < (0.5 + dormBias) ? 1 : -1;
      p.condition = clamp(c + dir, -2, 2);
    }
    if (p.slumpLockDays > 0) {
      p.slumpLockDays--;
      p.condition = Math.min(conditionOf(p), -1); // 低迷鎖：狀況最高只能到「低迷」
      if (p.slumpLockDays <= 0) delete p.slumpLockDays;
    }
  });
}

/* ---------- v25 牛棚疲勞：出賽累積、每日恢復，影響投球表現與受傷率 ---------- */
function fatigueOf(p) { return clamp(Math.round(p.fatigue || 0), 0, 100); }
function addFatigue(p, amt) { p.fatigue = clamp(fatigueOf(p) + amt, 0, 100); }
function fatigueMult(p) { return 1 - fatigueOf(p) / 350; } // 疲勞100 → 表現約-29%
function recoverFatigueDaily() {
  Object.values(S.players).forEach(p => {
    if (p.isPitcher && p.fatigue > 0) {
      const team = S.teams[p.team];
      const dormB = (team && typeof dormFatigueBonus === "function") ? dormFatigueBonus(team) : 0; // v26宿舍每級+2
      let rec = 10 + Math.round(p.stamina * 0.08) + dormB;
      if (p.midTraining) rec = Math.round(rec * 0.8); // v26季中特訓：疲勞恢復-20%
      p.fatigue = Math.max(0, p.fatigue - rec);
    }
  });
  // r008：野手連續出賽計數歸零（未出賽者＝被輪休或板凳）—— consecGames 由 v52PlayGame 遞增，
  // 這裡在每日結算時把「今天沒打」的野手歸零。用 _playedToday 旗標區分。
  Object.values(S.players).forEach(p => {
    if (!p.isPitcher) {
      if (p._playedToday) { delete p._playedToday; }
      else if (p.consecGames > 0) { p.consecGames = 0; }
    }
  });
}

function autoLineup(team, players) {
  const pool = team.roster1.map(id => players[id]).filter(p => p && !p.isPitcher && !(p.internationalDutyGamesLeft > 0) && !isInjured(p));
  const used = new Set();
  const assigned = [];
  LINEUP_FIELD_POSITIONS.forEach(pos => {
    const candidates = pool.filter(p => !used.has(p.id) && p.positions.some(x => x.pos === pos))
      .sort((a, b) => {
        const ar = (a.positions.find(x => x.pos === pos) || {}).rating || 0;
        const br = (b.positions.find(x => x.pos === pos) || {}).rating || 0;
        return (battingPower(b) + br * 0.3) - (battingPower(a) + ar * 0.3);
      });
    if (candidates.length > 0) { used.add(candidates[0].id); assigned.push({ playerId: candidates[0].id, position: pos }); }
  });
  // 找不到守位符合人選時，仍以最佳剩餘打者強制填補（避免守位缺人擋住整條打線）
  LINEUP_FIELD_POSITIONS.forEach(pos => {
    if (assigned.some(a => a.position === pos)) return;
    const fallback = pool.filter(p => !used.has(p.id)).sort((a, b) => battingPower(b) - battingPower(a))[0];
    if (fallback) { used.add(fallback.id); assigned.push({ playerId: fallback.id, position: pos }); }
  });
  const remaining = pool.filter(p => !used.has(p.id)).sort((a, b) => battingPower(b) - battingPower(a));
  if (remaining.length > 0) { used.add(remaining[0].id); assigned.push({ playerId: remaining[0].id, position: "DH" }); }
  assigned.sort((a, b) => battingPower(players[b.playerId]) - battingPower(players[a.playerId]));
  return assigned;
}

function dedupeLineupPositions(team) {
  if (!team.lineup) return;
  const seen = new Set();
  team.lineup.forEach(slot => {
    if (!slot) return;
    if (slot.position !== "DH" && seen.has(slot.position)) {
      const p = S.players[slot.playerId];
      const altPos = p ? p.positions.map(x => x.pos).find(pos => pos === "DH" || !seen.has(pos)) : null;
      slot.position = altPos || "DH";
    }
    seen.add(slot.position);
  });
}

/* v37⑧：守備守位缺口偵測——傷病後若健康野手無法組成合法守備（無捕手可守、健康野手不足8名、
   或某守位只能塞上嚴重不擅守者），回傳缺口清單。有缺口時逐日中斷連續模擬、要求玩家手動重排，
   系統不會硬把守位不符的球員塞進先發（呼應 Mars：忘記才自動補、守位不符就停下）。 */
function lineupPositionGaps(team) {
  if (!team) return [];
  const players = S.players;
  const pool = team.roster1.map(id => players[id]).filter(p => p && !p.isPitcher && !isInjured(p) && !(p.internationalDutyGamesLeft > 0));
  const gaps = [];
  if (pool.length < 8) { gaps.push(`可用健康野手僅${pool.length}名（守備8守位不足）`); return gaps; }
  if (!pool.some(p => p.positions.some(x => x.pos === "C"))) gaps.push("捕手(C) 無人可守");
  const assigned = autoLineup(team, players);
  LINEUP_FIELD_POSITIONS.forEach(pos => {
    if (pos === "C") return; // 捕手已單獨檢查
    const slot = assigned.find(a => a.position === pos);
    if (!slot) { gaps.push(`${POS_LABEL[pos] || pos} 無人可守`); return; }
    const p = players[slot.playerId];
    const natural = p && p.positions.some(x => x.pos === pos);
    if (!natural && p && effectivePositionFielding(p, pos) < 40 && !gaps.some(g => g.indexOf(POS_LABEL[pos]) >= 0)) {
      gaps.push(`${POS_LABEL[pos] || pos} 僅能勉強補位`);
    }
  });
  return gaps;
}

/* v40④：守位「硬缺口」——只有在真的湊不出合法陣容時才成立：
   (a)健康野手不足8名 (b)完全無人可蹲捕 (c)autoLineup連強制填補後仍有守位無人可站。
   「勉強補位」等軟缺口不再逐日中斷模擬（改為只在先發打線頁顯示警告），
   呼應 Mars v40④：能開打就不要一直停下來煩玩家。lineupPositionGaps 原函式保留供打線頁顯示完整警告。 */
function lineupHardGaps(team) {
  if (!team) return [];
  const players = S.players;
  const pool = team.roster1.map(id => players[id]).filter(p => p && !p.isPitcher && !isInjured(p) && !(p.internationalDutyGamesLeft > 0));
  const gaps = [];
  if (pool.length < 8) { gaps.push(`可用健康野手僅${pool.length}名（守備8守位不足）`); return gaps; }
  if (!pool.some(p => p.positions.some(x => x.pos === "C"))) gaps.push("捕手(C) 無人可守");
  const assigned = autoLineup(team, players);
  LINEUP_FIELD_POSITIONS.forEach(pos => {
    if (pos === "C") return;
    if (!assigned.some(a => a.position === pos)) gaps.push(`${POS_LABEL[pos] || pos} 無人可守`);
  });
  return gaps;
}

/* ====================================================================
   v40⑤：打線交給教練——戰術方針＋輪休策略。
   球隊帶 team.tactics = { offense, rest }、team.lineupMode = "coach"|"manual"（預設教練）。
   教練模式下每天開打前依方針重排打線並指派板凳專員；GM仍可切回手排。
   ==================================================================== */
const TACTICS_OFFENSE = [
  { key: "balance",  label: "均衡打線",   desc: "教練綜合火力與守備擇優（預設）",         score: (p, pr) => battingPower(p) + pr * 0.3 },
  { key: "slug",     label: "強攻火力",   desc: "重長打與破壞力，守備其次",               score: (p, pr) => p.power * 0.55 + p.contact * 0.25 + p.eye * 0.1 + pr * 0.1 },
  { key: "smallball",label: "速度小球",   desc: "重速度、盜壘與觸擊，串聯得分",           score: (p, pr) => p.speed * 0.4 + (p.steal || 0) * 0.25 + p.contact * 0.2 + (p.bunting || 45) * 0.05 + pr * 0.1 },
  { key: "onbase",   label: "上壘至上",   desc: "重選球與接觸，先站上壘包再說",           score: (p, pr) => p.eye * 0.45 + p.contact * 0.4 + pr * 0.15 },
  { key: "defense",  label: "守備優先",   desc: "守位適性擺第一，火力其次",               score: (p, pr) => pr * 0.55 + battingPower(p) * 0.45 },
  { key: "hot",      label: "手感優先",   desc: "誰狀況好誰先發，士氣高者優先",           score: (p, pr) => (p.morale || 70) * 0.45 + battingPower(p) * 0.45 + pr * 0.1 },
  { key: "youth",    label: "青年育成",   desc: "25歲以下潛力新秀優先上場累積經驗",       score: (p, pr) => battingPower(p) * 0.42 + pr * 0.13 + Math.max(0, 26 - (p.age || 26)) * 4 + Math.max(0, (p.potential || 50) - 50) * 0.25 } // v42⑩
];
const TACTICS_REST = [
  { key: "none",     label: "全力搶勝（不輪休）", desc: "健康主力天天上，衝刺戰績" },
  { key: "veteran",  label: "資深護身",           desc: "33歲以上或傷病史2次以上者約每5天輪休1天" }, // r008：合併老將輪休＋傷病防護
  { key: "fatigue",  label: "狀態保護",           desc: "狀況低迷或絕不調者當日輪休調整" }, // r008：改查condition而非morale
  { key: "rotate",   label: "全員輪替",           desc: "每天輪休1名非捕手野手，雨露均霑" },
  { key: "stamina",  label: "體力管理",           desc: "連續出賽6天後自動輪休1天恢復體力" }, // r008新增
  { key: "rookie",   label: "新秀保護",           desc: "25歲以下野手約每6天輪休1天，養成不燃燒" } // v42⑪
];
function ensureTactics(team) {
  if (!team) return;
  if (!team.tactics) team.tactics = { offense: "balance", rest: "none" };
  if (!TACTICS_OFFENSE.some(t => t.key === team.tactics.offense)) team.tactics.offense = "balance";
  // r008：舊存檔遷移 vets/guard → veteran
  if (team.tactics.rest === "vets" || team.tactics.rest === "guard") team.tactics.rest = "veteran";
  if (!TACTICS_REST.some(t => t.key === team.tactics.rest)) team.tactics.rest = "none";
  if (team.lineupMode !== "coach" && team.lineupMode !== "manual") team.lineupMode = "coach"; // v40預設交給教練
}
function tacticsOffenseDef(key) { return TACTICS_OFFENSE.find(t => t.key === key) || TACTICS_OFFENSE[0]; }
function tacticsRestDef(key) { return TACTICS_REST.find(t => t.key === key) || TACTICS_REST[0]; }
// 依輪休策略回傳「今天休息」的球員id集合；若排除後健康野手會不足9人則放棄輪休（開機防護：不因輪休打不了球）
function coachRestSet(team) {
  ensureTactics(team);
  const players = S.players;
  const pool = team.roster1.map(id => players[id]).filter(p => p && !p.isPitcher && !isInjured(p) && !(p.internationalDutyGamesLeft > 0));
  const day = S.currentDay || 0;
  const rest = new Set();
  const mode = ((typeof effTacticsOf === "function") ? effTacticsOf(team) : team.tactics).rest; // v41⑤：讀教練實際執行的方針（effTactics），內部邏輯一行不改
  const idNum = p => { let h = 0; const s = String(p.id); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997; return h; };
  if (mode === "veteran" || mode === "vets" || mode === "guard") pool.forEach(p => { if ((p.age >= 33 || (p.injuryHistory || []).length >= 2) && (day + idNum(p)) % 5 === 0) rest.add(p.id); }); // r008：合併資深護身（向下相容 vets/guard）
  else if (mode === "fatigue") pool.forEach(p => { if (conditionOf(p) <= -1) rest.add(p.id); }); // r008：改查condition（低迷/絕不調）
  else if (mode === "rotate") {
    const cands = pool.filter(p => !p.positions.some(x => x.pos === "C")).sort((a, b) => String(a.id) < String(b.id) ? -1 : 1);
    if (cands.length > 0) rest.add(cands[day % cands.length].id);
  } else if (mode === "stamina") pool.forEach(p => { if ((p.consecGames || 0) >= 6) rest.add(p.id); }); // r008新增：體力管理
  else if (mode === "rookie") pool.forEach(p => { if (p.age <= 25 && (day + idNum(p)) % 6 === 0) rest.add(p.id); }); // v42⑪
  if (pool.length - rest.size < 9) rest.clear();
  return rest;
}
// autoLineup 的加權泛化版：scoreFn(球員, 守位適性評分)、excludeIds 今日輪休。原 autoLineup 保留不動（AI隊與既有呼叫沿用）。
function autoLineupBy(team, players, scoreFn, excludeIds) {
  const ex = excludeIds || new Set();
  const pool = team.roster1.map(id => players[id]).filter(p => p && !p.isPitcher && !(p.internationalDutyGamesLeft > 0) && !isInjured(p) && !ex.has(p.id));
  const used = new Set();
  const assigned = [];
  const posRating = (p, pos) => (p.positions.find(x => x.pos === pos) || {}).rating || 0;
  LINEUP_FIELD_POSITIONS.forEach(pos => {
    const candidates = pool.filter(p => !used.has(p.id) && p.positions.some(x => x.pos === pos))
      .sort((a, b) => scoreFn(b, posRating(b, pos)) - scoreFn(a, posRating(a, pos)));
    if (candidates.length > 0) { used.add(candidates[0].id); assigned.push({ playerId: candidates[0].id, position: pos }); }
  });
  LINEUP_FIELD_POSITIONS.forEach(pos => {
    if (assigned.some(a => a.position === pos)) return;
    const fallback = pool.filter(p => !used.has(p.id)).sort((a, b) => scoreFn(b, 0) - scoreFn(a, 0))[0];
    if (fallback) { used.add(fallback.id); assigned.push({ playerId: fallback.id, position: pos }); }
  });
  const remaining = pool.filter(p => !used.has(p.id)).sort((a, b) => scoreFn(b, 0) - scoreFn(a, 0));
  if (remaining.length > 0) { used.add(remaining[0].id); assigned.push({ playerId: remaining[0].id, position: "DH" }); }
  assigned.sort((a, b) => scoreFn(players[b.playerId], 0) - scoreFn(players[a.playerId], 0));
  return assigned;
}
// 教練每日排線：依方針＋輪休重排我隊打線（只在 lineupMode==="coach" 時由 simulateDay 呼叫）
function coachDailyLineup(team) {
  ensureTactics(team);
  const def = tacticsOffenseDef(((typeof effTacticsOf === "function") ? effTacticsOf(team) : team.tactics).offense); // v41⑤：讀教練實際執行的方針（effTactics），autoLineupBy 內部一行不改
  const lineup = autoLineupBy(team, S.players, def.score, coachRestSet(team));
  if (lineup.length >= 9) team.lineup = lineup; // 排不滿9人時保留原打線（開機防護：教練排不出來不硬換）
  else if (!team.lineup || team.lineup.length < 5) team.lineup = autoLineup(team, S.players);
  dedupeLineupPositions(team);
  return team.lineup;
}
// v40⑤：板凳專員改回教練指派——每日依專長自動指派代打/代跑/代守（先發與傷兵不指派）。setBenchRole 保留供除錯。
function coachAssignBenchRoles(team) {
  team.benchRoles = team.benchRoles || {};
  const inLineup = new Set((team.lineup || []).map(s => s.playerId));
  const bench = team.roster1.map(id => S.players[id]).filter(p => p && !p.isPitcher && !inLineup.has(p.id) && !isInjured(p) && !(p.internationalDutyGamesLeft > 0));
  const pickBy = fn => { const c = bench.slice().sort((a, b) => fn(b) - fn(a))[0]; return c ? c.id : null; };
  const ph = pickBy(p => p.contact * 0.5 + p.power * 0.5);
  const pr = pickBy(p => p.speed * 0.6 + (p.steal || 0) * 0.4);
  const ds = pickBy(p => p.fielding);
  if (ph) team.benchRoles.pinchHit = ph; else delete team.benchRoles.pinchHit;
  if (pr) team.benchRoles.pinchRun = pr; else delete team.benchRoles.pinchRun;
  if (ds) team.benchRoles.defSub = ds; else delete team.benchRoles.defSub;
  return team.benchRoles;
}
// v40⑤：隊長改為教練提名——教練依資歷/忠誠/士氣/抗壓/實力綜合評選，提出最多3位人選，由GM圈選任命。
function coachCaptainCandidates(team) {
  if (!team) return [];
  const pool = team.roster1.map(id => S.players[id]).filter(p => p && !isInjured(p));
  return pool.map(p => ({
    p,
    sc: (p.loyalty || 50) * 0.3 + (p.morale || 70) * 0.15 + (p.composure || 50) * 0.2 + trueOverall(p) * 0.2 + Math.min(p.age, 36) * 1.5
  })).sort((a, b) => b.sc - a.sc).slice(0, 3).map(x => x.p);
}

// 彈性輪值：預設抓所有健康的「先發」角色投手（幾人就排幾人，不強制湊滿5人）；
// 若1軍完全沒有先發角色投手，才退而求其次以綜合能力挑前4名頂替。
function autoRotation(team, players) {
  const healthy = team.roster1.map(id => players[id])
    .filter(p => p && p.isPitcher && !(p.internationalDutyGamesLeft > 0) && !isInjured(p));
  const starters = healthy.filter(p => p.role === "先發").sort((a, b) => trueOverall(b) - trueOverall(a));
  if (starters.length > 0) return starters.map(p => p.id);
  return healthy.sort((a, b) => trueOverall(b) - trueOverall(a)).slice(0, 4).map(p => p.id);
}

function teamBattingRating(team, players) {
  const batters = getLineupBatters(team, players);
  if (batters.length === 0) return 50;
  // v25：觸擊納入小權重（打線串聯貢獻），並乘上個人狀況係數
  const sum = batters.reduce((s, p) => s + (p.contact * 0.38 + p.power * 0.34 + p.eye * 0.21 + (p.bunting || 45) * 0.07) * conditionMult(p), 0);
  return sum / batters.length;
}
function teamPitchingRating(team, players) {
  const pitchers = getRotationPitchers(team, players);
  if (pitchers.length === 0) return 50;
  const sum = pitchers.reduce((s, p) => {
    const pq = p.pitches.reduce((ps, pt) => ps + (pt.stuff * 0.5 + pt.control * 0.5), 0) / p.pitches.length;
    return s + (p.control * 0.3 + p.velocity * 0.2 + pq * 0.5) * conditionMult(p) * fatigueMult(p); // v25狀況＋疲勞
  }, 0);
  return sum / pitchers.length;
}
function teamDefenseRating(team, players) {
  const lineup = team.lineup || [];
  const fielders = lineup.filter(s => s.position !== "DH").map(s => ({ p: players[s.playerId], pos: s.position })).filter(x => x.p);
  if (fielders.length === 0) return 50;
  return fielders.reduce((s, x) => s + effectivePositionFielding(x.p, x.pos) * ((typeof improvisePenaltyFor === "function") ? improvisePenaltyFor(x.p, x.pos) : 1), 0) / fielders.length; // v41④：無本職捕手客串蹲捕→該格×0.6
}
/* v37④ 隊長系統：持久身份 team.captainId ＋一季一次任命 team.captainAppointedYear。
   常駐：在隊即提升全隊抗壓（接進比賽——透過既有近戰抗壓決勝機制放大近戰勝率）＋每日狀況偏正向；
   隊長本人任命時獲士氣/忠誠加成，長期高忠誠→續約讓利。 */
const CAPTAIN_COMPOSURE_BONUS = 4;   // 在陣時全隊抗壓平均值加成（近戰決勝力，約等值＋2%勝率）
function activeCaptain(team) {
  if (!team || !team.captainId) return null;
  const c = S.players[team.captainId];
  if (!c || c.team !== team.id || !team.roster1.includes(c.id) || isInjured(c)) return null;
  return c;
}
function teamHasCaptainBonus(team) { return !!activeCaptain(team); }
function canAppointCaptainThisSeason(team) {
  if (!team) return false;
  if (team.captainAppointedYear !== S.seasonYear) return true;
  const c = team.captainId ? S.players[team.captainId] : null; // 本季已任命，但現任隊長已離隊/退休→允許改任
  return !(c && c.team === team.id && !c.retired);
}
function appointCaptain(team, pid) {
  if (!team) return { ok: false, msg: "無球隊" };
  if (!canAppointCaptainThisSeason(team)) return { ok: false, msg: "本季已任命過隊長，需等下個球季才能更換。" };
  const p = S.players[pid];
  if (!p || p.team !== team.id || !team.roster1.includes(p.id)) return { ok: false, msg: "只能從一軍現役球員中任命隊長。" };
  team.captainId = pid;
  team.captainAppointedYear = S.seasonYear;
  p.morale = clamp((p.morale || 70) + 6, 0, 100);
  p.loyalty = clamp((p.loyalty || 50) + 10, 0, 100);
  return { ok: true, msg: `${p.name} 獲任命為隊長，士氣＋6、忠誠＋10；在陣期間全隊近戰抗壓提升、狀況偏正向。` };
}
// 傷病/交易/退休後隊長失效時清除（休賽季rollover與載入時呼叫）
function pruneCaptain(team) {
  if (team && team.captainId) {
    const c = S.players[team.captainId];
    if (!c || c.team !== team.id || c.retired) delete team.captainId;
  }
}
function teamComposureRating(team, players) {
  const batters = getLineupBatters(team, players);
  const pitchers = getRotationPitchers(team, players);
  // v25：大賽型特質在關鍵時刻抗壓+8；野手觸擊以15%權重混入（近比分小球戰術價值）
  const cv = p => (p.composure + (hasTrait(p, "biggame") ? 8 : 0));
  const vals = batters.map(p => cv(p) * 0.85 + (p.bunting || 45) * 0.15).concat(pitchers.map(p => cv(p)));
  if (vals.length === 0) return 50;
  const base = vals.reduce((a, b) => a + b, 0) / vals.length;
  return base + (teamHasCaptainBonus(team) ? CAPTAIN_COMPOSURE_BONUS : 0); // v37④隊長在陣：全隊抗壓加成，放大近戰勝率
}
// v30主客場賽制：主場優勢正式常數化——主隊期望得分+0.15分（基準4.5分的約+3%），
// 加上同分時52%偏向主隊的再見分機制，構成完整主場優勢。
/* 加權抽樣（國際賽成績分配 intlCreditStats 仍沿用；例行賽已改逐打席引擎） */
function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const HOME_ADVANTAGE_RUNS = 0.15;
/* v37⑥ 代打/代跑/代守：盒分級架構下做成「賽前指定專員＋近戰觸發」。玩家於先發打線頁指派
   板凳專員（各一名，須為一軍現役、非先發、健康）；在近戰（分差≤3）局面小機率發動，
   代打/代跑幫落後或平手的自家追平/超前1分、代守幫小幅領先守下1分，並累計專員出賽成績。
   AI 隊不設定專員故無效。__benchCredits 為每日暫存（不序列化）。 */
let __benchCredits = [];
function benchSpecialist(team, roleKey) {
  const pid = team && team.benchRoles && team.benchRoles[roleKey];
  if (!pid) return null;
  const p = S.players[pid];
  if (!p || p.team !== team.id || p.isPitcher || !team.roster1.includes(pid) || isInjured(p) || (p.internationalDutyGamesLeft > 0)) return null;
  if ((team.lineup || []).some(sl => sl.playerId === pid)) return null; // 已在先發打線者不算替補
  return p;
}
function applyBenchRoleNudge(team, myScore, oppScore) {
  if (Math.abs(myScore - oppScore) > 3) return [myScore, oppScore]; // 只在近戰觸發
  const ph = benchSpecialist(team, "pinchHit");
  const pr = benchSpecialist(team, "pinchRun");
  const ds = benchSpecialist(team, "defSub");
  if (ph) { const hit = (myScore <= oppScore) && Math.random() < 0.22; if (hit) myScore += 1; __benchCredits.push({ pid: ph.id, role: "pinchHit", hit }); }
  if (pr) { const scored = (myScore <= oppScore) && Math.random() < 0.16; if (scored) myScore += 1; __benchCredits.push({ pid: pr.id, role: "pinchRun", scored }); }
  if (ds) { const saved = (myScore >= oppScore) && (myScore - oppScore) <= 2 && oppScore > 0 && Math.random() < 0.22; if (saved) oppScore -= 1; __benchCredits.push({ pid: ds.id, role: "defSub", saved }); }
  return [myScore, oppScore];
}
function creditBenchRoleAppearances() {
  if (!__benchCredits.length) return;
  __benchCredits.forEach(c => {
    const p = S.players[c.pid]; if (!p) return;
    p.seasonStats.G += 1; p.careerStats.G += 1;
    if (c.role === "pinchHit") { p.seasonStats.AB += 1; p.careerStats.AB += 1; if (c.hit) { p.seasonStats.H += 1; p.careerStats.H += 1; p.seasonStats.RBI += 1; p.careerStats.RBI += 1; p.seasonStats.R = (p.seasonStats.R || 0); } }
    if (c.role === "pinchRun" && c.scored) { p.seasonStats.SB += 1; p.careerStats.SB += 1; }
    /* v51 A1：代打／代跑不走逐打席引擎的打線路徑，
       但仍會增加 AB／SB，因此在此同步 PA 恆等式與 A1 欄位，避免板凳球員 PA=0。 */
    if (typeof v51SyncBatterPA === "function") { try { v51SyncBatterPA(p); } catch (_) {} }
  });
  __benchCredits = [];
}

/* ====================================================================
   v52 A1-W1：逐打席比賽引擎（取代 v51 以前的「常態分布抽比分 → 反推個人成績」模型）

   v51 以前的三個結構性錯誤：
   ① 投球局數帳本不完整——一場只記先發約 5 局，後援僅在「贏球且分差 1~3」才各記 1 局，
      每隊每場只有約 5.6 局進帳，ERA 分母短少近四成。
   ② 自責分帳本同時灌水與漏水——qualityFactor 平均值 1.3 使平均投手被記 130% 比例分自責分，
      而全隊失分只有約 77% 被記為 ER，其餘既未入 ER 也未入非自責分。
   ③ 打擊率與失分無法自洽——安打數由得分反推，AB 又獨立計算，兩者相乘產生 .234 的假象。

   v52 起：比分由每一個打席的事件結果累積得出；投手換人由局數／體力／疲勞／牛棚順位／
   教練調度決定（中繼、布局、終結各自輪替，一季 45~65 場登板為常態）；非自責分由守備失誤
   直接產生（A1-W3）；捕手六項專項屬性（A5）在此為主要作用點。
   ==================================================================== */

/* 校準基準：以 5 個不同賽季種子跑完整季實測，全聯盟打擊率平均 .250、防禦率平均 3.86、
   每隊每場得分 4.15、投球局數 9.0、三振率 21.4%、四壞率 8.2%、非自責分占比 7.3%。
   （校準靶心由 Mars 指定：介於美職與日職之間的打擊率 .250／防禦率 3.80） */
const V52_CFG = {
  kBase: 0.233,          // 每打席三振基準
  bbBase: 0.0739,         // 每打席四壞基準
  hbpBase: 0.0095,       // 每打席觸身球基準
  hrRate: 0.0224,        // 每打席全壘打基準
  babip: 0.2724,          // 場內球安打率基準
  dblShare: 0.205,       // 場內安打中二壘打占比
  tplShare: 0.021,       // 場內安打中三壘打占比
  errRate: 0.0145,       // 每個場內球的失誤率（守備評分調節；A1-W3 非自責分來源）
  gidpRate: 0.105,       // 一壘有人且未滿兩出局時的雙殺打機率
  sfRate: 0.135,         // 三壘有人且未滿兩出局時的高飛犧牲打機率
  sbAttempt: 0.075,      // 一壘有人二壘空時的盜壘企圖率
  sbBase: 0.705,         // 盜壘成功基準
  wpRate: 0.0088,        // 有人在壘時每打席的暴投／捕逸基準（捕手 Blocking 調節）
  homeAdv: 0.036,        // 主場進攻乘數加成（＝HOME_ADVANTAGE_RUNS 換算）
  runToMult: 0.24,       // 「期望得分加成」換算成進攻乘數的係數
  maxExtra: 6            // 延長賽上限局數
};

/* 取得守方先發捕手（優先先發打線中的 C，其次一軍捕手最佳者） */
function v52CatcherOf(team, players) {
  if (team && team.lineup && team.lineup.length) {
    for (let i = 0; i < team.lineup.length; i++) {
      const sl = team.lineup[i];
      if (sl && sl.position === "C") {
        const p = players[sl.playerId];
        if (p && !isInjured(p)) return p;
      }
    }
  }
  const cands = (team && team.roster1 ? team.roster1 : []).map(id => players[id])
    .filter(p => p && !p.isPitcher && p.gameCalling != null && !isInjured(p));
  cands.sort((a, b) => v52CatcherScore(b) - v52CatcherScore(a));
  return cands[0] || null;
}
function v52CatcherScore(p) {
  if (!p || p.gameCalling == null) return 0;
  return (p.gameCalling || 50) + (p.framing || 50) + (p.caughtStealing || 50)
       + (p.blocking || 50) + (p.popTime || 50) + (p.pitcherHandling || 50);
}
/* A5：捕手專項六維取值（非捕手或缺值一律回 50＝聯盟中庸，確保無捕手時行為中性） */
function v52Cat(cat, key) {
  if (!cat) return 50;
  const v = cat[key];
  return (typeof v === "number") ? v : 50;
}

/* 進攻端整體乘數：主場優勢＋情蒐分析室＋球迷認同（全部由「期望得分」換算成打席層乘數） */
function v52OffMult(team, isHome) {
  let m = 1;
  if (isHome) m += V52_CFG.homeAdv;
  if (typeof analysisGameBonus === "function") {
    const b = analysisGameBonus(team) || 0;
    m += b * V52_CFG.runToMult;
  }
  if (isHome && team && team.id === S.userTeamId && typeof fanIdentifyHomeEdge === "function") {
    m += (fanIdentifyHomeEdge() || 0) * V52_CFG.runToMult;
  }
  return clamp(m, 0.85, 1.20);
}

/* ---------- 成績暫存帳本（比賽當下不寫入球員，由 attributeGameStats 決定是否入帳） ---------- */
function v52Led() { return { _map: {} }; }
function v52Add(led, p, key, v) {
  if (!p || !v) return;
  const m = led._map;
  const e = m[p.id] || (m[p.id] = { _p: p });
  e[key] = (e[key] || 0) + v;
}
function v52Commit(led) {
  const m = led._map;
  Object.keys(m).forEach(pid => {
    const e = m[pid], p = e._p;
    if (!p || !p.seasonStats || !p.careerStats) return;
    Object.keys(e).forEach(k => {
      if (k === "_p") return;
      p.seasonStats[k] = (p.seasonStats[k] || 0) + e[k];
      p.careerStats[k] = (p.careerStats[k] || 0) + e[k];
    });
    if (p.isPitcher) { v52SyncIP(p.seasonStats); v52SyncIP(p.careerStats); }
    else if (typeof v51SyncBatterPA === "function") { try { v51SyncBatterPA(p); } catch (_) {} }
  });
}
/* 投球局數由出局數換算（OUTS 為精確帳本，IP 供顯示與 ERA 使用，保留一位小數） */
function v52SyncIP(st) {
  if (!st || typeof st.OUTS !== "number") return;
  st.IP = Math.round((st.OUTS / 3) * 10) / 10;
}

/* ---------- 單一打席結果 ---------- */
function v52PA(bat, pit, cat, defR, offMult) {
  const bf = clamp(conditionMult(bat) * offMult, 0.75, 1.30);
  const phd = (v52Cat(cat, "pitcherHandling") - 50) / 100;   // A5 投手調教：投手臨場穩定度加成
  const pf = clamp(conditionMult(pit) * fatigueMult(pit) * (1 + 0.12 * phd), 0.60, 1.25);
  const ct = ((bat.contact || 50) - 50) / 100;
  const pw = ((bat.power || 50) - 50) / 100;
  const ey = ((bat.eye || 50) - 50) / 100;
  const sp = ((bat.speed || 50) - 50) / 100;
  const stf = ((pit.velocity || 50) - 50) / 100;
  const ctl = ((pit.control || 50) - 50) / 100;
  const fr = (v52Cat(cat, "framing") - 50) / 100;        // A5 接捕框架：對手 BB↓ K↑
  const gc = (v52Cat(cat, "gameCalling") - 50) / 100;    // A5 配球引導：全投手群失分修正
  const dv = (defR - 50) / 100;

  let K = V52_CFG.kBase * (1 + 0.60 * stf + 0.30 * ctl - 0.75 * ct + 0.22 * fr + 0.10 * gc) * pf / bf;
  let BB = V52_CFG.bbBase * (1 + 0.80 * ey - 0.70 * ctl - 0.28 * fr - 0.12 * gc) * bf / pf;
  let HBP = V52_CFG.hbpBase * (1 - 0.35 * ctl);
  let HR = V52_CFG.hrRate * (1 + 0.95 * pw + 0.25 * ct - 0.50 * stf - 0.18 * gc) * bf / pf;
  let BABIP = V52_CFG.babip * (1 + 0.40 * ct + 0.12 * sp - 0.55 * dv - 0.20 * stf - 0.12 * gc) * bf / pf;
  K = clamp(K, 0.05, 0.45); BB = clamp(BB, 0.010, 0.220);
  HBP = clamp(HBP, 0.002, 0.030); HR = clamp(HR, 0.002, 0.100);
  BABIP = clamp(BABIP, 0.200, 0.420);

  const r = Math.random();
  if (r < BB) return "BB";
  if (r < BB + HBP) return "HBP";
  if (r < BB + HBP + K) return "K";
  const rest = Math.max(0.05, 1 - BB - HBP - K);
  if (Math.random() < clamp(HR / rest, 0.001, 0.20)) return "HR";
  const eRate = clamp(V52_CFG.errRate * (1 - 1.1 * dv), 0.003, 0.05);
  const r3 = Math.random();
  if (r3 < eRate) return "E";
  if (r3 < eRate + BABIP) {
    const r4 = Math.random();
    const tpl = clamp(V52_CFG.tplShare * (1 + 0.9 * sp), 0.004, 0.06);
    const dbl = clamp(V52_CFG.dblShare * (1 + 0.6 * pw), 0.10, 0.34);
    if (r4 < tpl) return "3B";
    if (r4 < tpl + dbl) return "2B";
    return "1B";
  }
  return "OUT";
}

/* ====================================================================
   v55 L3：擊球品質分類（每個場內球事件呼叫，記錄打者+投手的擊球分類統計）
   ==================================================================== */
/* 擊球類型機率由打者屬性驅動：
   power↑→FB↑ GB↓ | contact↑→LD↑ PU↓ | speed↑→GB↑（拍到地上搶內安） */
function v55ClassifyBattedBall(bat, pit) {
  const pw = ((bat.power || 50) - 50) / 100;
  const ct = ((bat.contact || 50) - 50) / 100;
  const stf = ((pit.velocity || 50) - 50) / 100;
  /* 類型分布基準：GB 44%, FB 25%, LD 21%, PU 10% */
  let gbW = 0.44 - 0.16 * pw + 0.06 * ct;          // 高 power 拉飛球，GB↓
  let fbW = 0.25 + 0.14 * pw - 0.04 * ct;           // 高 power FB↑
  let ldW = 0.21 + 0.08 * ct - 0.04 * stf;          // 高 contact LD↑
  let puW = 0.10 - 0.04 * ct + 0.05 * stf;          // 高 stuff 讓打者打飛（PU↑）
  gbW = Math.max(0.15, gbW); fbW = Math.max(0.08, fbW);
  ldW = Math.max(0.08, ldW); puW = Math.max(0.02, puW);
  const total = gbW + fbW + ldW + puW;
  gbW /= total; fbW /= total; ldW /= total; puW /= total;
  const r = Math.random();
  let bbType;
  if (r < gbW) bbType = "GB";
  else if (r < gbW + fbW) bbType = "FB";
  else if (r < gbW + fbW + ldW) bbType = "LD";
  else bbType = "PU";
  /* 擊球品質：power↑+contact↑→hard/barrel 機率↑；stuff↑→soft↑ */
  const hardBase = 0.30 + 0.22 * pw + 0.10 * ct - 0.14 * stf;
  const hardRate = clamp(hardBase, 0.12, 0.55);
  const barrelBase = 0.07 + 0.12 * pw + 0.05 * ct - 0.08 * stf;
  const barrelRate = clamp(barrelBase, 0.01, 0.20);
  let bbQuality;
  const r2 = Math.random();
  if (r2 < barrelRate) bbQuality = "barrel";
  else if (r2 < hardRate) bbQuality = "hard";
  else if (r2 < hardRate + 0.45) bbQuality = "medium";
  else bbQuality = "soft";
  return { type: bbType, quality: bbQuality };
}

/* 把擊球分類結果記入雙方帳本 */
function v55RecordBattedBall(offLed, defLed, bat, pit, bb) {
  v52Add(offLed, bat, "BIP", 1);
  v52Add(defLed, pit, "BIP", 1);
  v52Add(offLed, bat, bb.type, 1);   // GB/LD/FB/PU
  v52Add(defLed, pit, bb.type, 1);
  if (bb.quality === "hard" || bb.quality === "barrel") {
    v52Add(offLed, bat, "HardHit", 1);
    v52Add(defLed, pit, "HardHit", 1);
  }
  if (bb.quality === "barrel") {
    v52Add(offLed, bat, "Barrel", 1);
    v52Add(defLed, pit, "Barrel", 1);
  }
}

/* ---------- 投手調度（局初判定；中繼/布局/終結依順位與疲勞輪替） ---------- */
function v52NeedChange(side, inning) {
  const cur = side.cur;
  if (!cur) return true;
  if (side.isStarter) {
    let target = clamp(Math.round(16 + ((cur.stamina || 50) - 50) / 4.5), 9, 25);
    target -= Math.round(fatigueOf(cur) / 12);
    if (side.curOuts >= target) return true;
    if (side.curR >= 6 && side.curOuts >= 9) return true;
    return false;
  }
  return side.curOuts >= 3; // 後援以一局為單位輪替（可因牛棚耗盡而續投）
}
function v52PickReliever(side, inning, lead) {
  const team = side.team, players = side.players;
  if (typeof ensureBullpenOrder === "function") { try { ensureBullpenOrder(team, players); } catch (_) {} }
  const bo = team.bullpenOrder || {};
  const byRole = role => (bo[role] || []).map(id => players[id])
    .filter(p => p && p.isPitcher && (team.roster1 || []).includes(p.id) && !isInjured(p) && !side.used[p.id]);
  let pool;
  if (inning >= 9 && lead > 0 && lead <= 3) pool = byRole("終結").concat(byRole("布局"), byRole("中繼"));
  else if (inning === 8) pool = byRole("布局").concat(byRole("中繼"), byRole("終結"));
  else pool = byRole("中繼").concat(byRole("布局"), byRole("終結"));
  let pick = pool.find(p => fatigueOf(p) <= 70) || pool[0];
  if (!pick) {
    pick = (team.roster1 || []).map(id => players[id])
      .filter(p => p && p.isPitcher && !isInjured(p) && !side.used[p.id] && p !== side.starter)
      .sort((a, b) => trueOverall(b) - trueOverall(a))[0];
  }
  return pick || side.cur;
}
function v52EnterPitcher(side, p, inning, lead) {
  if (!p) return;
  side.cur = p; side.curOuts = 0; side.curR = 0;
  side.used[p.id] = true;
  if (!side.appear[p.id]) {
    side.appear[p.id] = { p, outs: 0, R: 0, ER: 0, enterInning: inning, enterLead: lead, isStarter: p === side.starter };
    v52Add(side.led, p, "G", 1);
  }
  side.isStarter = (p === side.starter);
  side.order.push(p.id);
}

/* ---------- 半局 ---------- */
function v52HalfInning(off, def, inning, lead, stopWhenLead) {
  let outs = 0, runs = 0, errInning = false;
  const bases = [null, null, null];
  // 局初換投判定
  if (v52NeedChange(def, inning)) {
    const nx = v52PickReliever(def, inning, -lead);
    if (nx && nx !== def.cur) v52EnterPitcher(def, nx, inning, -lead);
  }
  const score = (runner, earned, rbiTo) => {
    runs++;
    if (runner) v52Add(off.led, runner, "R", 1);
    const pit = def.cur;
    v52Add(def.led, pit, "R", 1);
    const ap = def.appear[pit.id]; if (ap) { ap.R++; }
    def.curR++;
    if (earned && !errInning) { v52Add(def.led, pit, "ER", 1); if (ap) ap.ER++; }
    if (rbiTo) v52Add(off.led, rbiTo, "RBI", 1);
  };
  while (outs < 3) {
    const pit = def.cur, cat = def.catcher;
    const bat = off.batters[off.idx % off.batters.length];
    off.idx++;
    if (!bat || !pit) break;

    // 暴投／捕逸（A5 Blocking）
    if ((bases[0] || bases[1] || bases[2])) {
      const blk = (v52Cat(cat, "blocking") - 50) / 100;
      if (Math.random() < clamp(V52_CFG.wpRate * (1 - 0.9 * blk), 0.001, 0.03)) {
        const isPB = Math.random() < 0.38;
        if (isPB && cat) v52Add(def.led, cat, "PB", 1); else v52Add(def.led, pit, "WP", 1);
        if (bases[2]) { score(bases[2], true, null); bases[2] = null; }
        if (bases[1]) { bases[2] = bases[1]; bases[1] = null; }
        if (bases[0]) { bases[1] = bases[0]; bases[0] = null; }
      }
    }
    // 盜壘（A5 Pop Time＋阻殺跑壘）
    if (bases[0] && !bases[1] && outs < 3) {
      const runner = bases[0];
      const stl = ((runner.steal || 50) - 50) / 100, spd = ((runner.speed || 50) - 50) / 100;
      const att = clamp(V52_CFG.sbAttempt * (1 + 1.6 * stl + 0.6 * spd), 0.005, 0.28);
      if (Math.random() < att) {
        const arm = (v52Cat(cat, "caughtStealing") - 50) / 100;
        const pop = (v52Cat(cat, "popTime") - 50) / 100;
        const succ = clamp(V52_CFG.sbBase + 0.30 * stl + 0.12 * spd - 0.28 * arm - 0.22 * pop, 0.25, 0.95);
        if (Math.random() < succ) {
          v52Add(off.led, runner, "SB", 1);
          bases[1] = runner; bases[0] = null;
        } else {
          v52Add(off.led, runner, "CS", 1);
          if (cat) v52Add(def.led, cat, "CSC", 1);
          bases[0] = null; outs++;
          def.curOuts++; v52Add(def.led, pit, "OUTS", 1);
          const ap0 = def.appear[pit.id]; if (ap0) ap0.outs++;
          if (outs >= 3) break;
        }
      }
    }

    const res = v52PA(bat, pit, cat, def.defR, off.mult);
    v52Add(def.led, pit, "BF", 1);
    const addOut = n => { outs += n; def.curOuts += n; v52Add(def.led, pit, "OUTS", n); const ap = def.appear[pit.id]; if (ap) ap.outs += n; };
    /* v55 L3：場內球事件記錄擊球分類（BB/HBP/K 不算場內球） */
    if (res !== "BB" && res !== "HBP" && res !== "K") {
      const bb = v55ClassifyBattedBall(bat, pit);
      v55RecordBattedBall(off.led, def.led, bat, pit, bb);
    }

    if (res === "BB" || res === "HBP") {
      if (res === "BB") { v52Add(off.led, bat, "BB", 1); v52Add(def.led, pit, "BB", 1); }
      else { v52Add(off.led, bat, "HBP", 1); v52Add(def.led, pit, "HBPA", 1); }
      // 保送推進
      if (bases[0]) {
        if (bases[1]) {
          if (bases[2]) score(bases[2], true, bat);
          bases[2] = bases[1];
        }
        bases[1] = bases[0];
      }
      bases[0] = bat;
    } else if (res === "K") {
      v52Add(off.led, bat, "AB", 1); v52Add(off.led, bat, "SO", 1);
      v52Add(def.led, pit, "SO", 1); v52Add(def.led, pit, "H", 0);
      addOut(1);
    } else if (res === "HR") {
      v52Add(off.led, bat, "AB", 1); v52Add(off.led, bat, "H", 1); v52Add(off.led, bat, "HR", 1);
      v52Add(def.led, pit, "H", 1); v52Add(def.led, pit, "HRA", 1);
      for (let b = 2; b >= 0; b--) { if (bases[b]) { score(bases[b], true, bat); bases[b] = null; } }
      score(bat, true, bat);
    } else if (res === "3B" || res === "2B" || res === "1B") {
      v52Add(off.led, bat, "AB", 1); v52Add(off.led, bat, "H", 1);
      v52Add(def.led, pit, "H", 1);
      if (res === "3B") {
        v52Add(off.led, bat, "T", 1);
        for (let b = 2; b >= 0; b--) { if (bases[b]) { score(bases[b], true, bat); bases[b] = null; } }
        bases[2] = bat;
      } else if (res === "2B") {
        v52Add(off.led, bat, "D", 1);
        if (bases[2]) { score(bases[2], true, bat); bases[2] = null; }
        if (bases[1]) { score(bases[1], true, bat); bases[1] = null; }
        if (bases[0]) {
          if (Math.random() < 0.42) score(bases[0], true, bat); else bases[2] = bases[0];
          bases[0] = null;
        }
        bases[1] = bat;
      } else {
        if (bases[2]) { score(bases[2], true, bat); bases[2] = null; }
        if (bases[1]) {
          if (Math.random() < 0.62) score(bases[1], true, bat); else bases[2] = bases[1];
          bases[1] = null;
        }
        if (bases[0]) {
          if (!bases[2] && Math.random() < 0.28) bases[2] = bases[0]; else bases[1] = bases[0];
          bases[0] = null;
        }
        bases[0] = bat;
      }
    } else if (res === "E") {
      // A1-W3：失誤直接產生非自責分——本局之後的得分不計入自責分
      v52Add(off.led, bat, "AB", 1);
      errInning = true;
      if (bases[2]) { score(bases[2], false, null); bases[2] = null; }
      if (bases[1]) { bases[2] = bases[1]; bases[1] = null; }
      if (bases[0]) { bases[1] = bases[0]; bases[0] = null; }
      bases[0] = bat;
    } else { // OUT
      const spd = ((bat.speed || 50) - 50) / 100;
      if (bases[0] && outs < 2 && Math.random() < clamp(V52_CFG.gidpRate * (1 - 0.8 * spd), 0.02, 0.22)) {
        v52Add(off.led, bat, "AB", 1); v52Add(off.led, bat, "GIDP", 1);
        bases[0] = null; addOut(2);
      } else if (bases[2] && outs < 2 && Math.random() < V52_CFG.sfRate) {
        v52Add(off.led, bat, "SF", 1);
        score(bases[2], true, bat); bases[2] = null;
        addOut(1);
      } else {
        v52Add(off.led, bat, "AB", 1);
        if (bases[1] && !bases[2] && Math.random() < 0.22) { bases[2] = bases[1]; bases[1] = null; }
        addOut(1);
      }
    }
    if (stopWhenLead && runs + lead > 0) break; // 九局下後攻超前即再見結束
  }
  return runs;
}

/* ---------- 一場比賽 ---------- */
function v52SideInit(team, players, isHome) {
  const batters = getLineupBatters(team, players);
  const rotation = getRotationPitchers(team, players);
  let starter = null;
  if (rotation.length > 0) {
    if (typeof team.starterIndex !== "number") team.starterIndex = 0;
    // r008：疲勞門檻——疲勞 ≥ 80 的先發跳過，改用下一位；全員 ≥ 80 則選疲勞最低者
    let pick = null;
    for (let i = 0; i < rotation.length; i++) {
      const cand = rotation[(team.starterIndex + i) % rotation.length];
      if (fatigueOf(cand) < 80) { pick = cand; team.starterIndex = team.starterIndex + i + 1; break; }
    }
    if (!pick) {
      // 全員疲勞 ≥ 80：選疲勞最低者，不跳 starterIndex 避免打亂正常輪值
      pick = rotation.reduce((a, b) => fatigueOf(a) <= fatigueOf(b) ? a : b);
      team.starterIndex++;
    }
    starter = pick;
  }
  return {
    team, players, batters, idx: 0, isHome,
    mult: v52OffMult(team, isHome),
    defR: teamDefenseRating(team, players),
    catcher: v52CatcherOf(team, players),
    starter, cur: null, curOuts: 0, curR: 0, isStarter: false,
    used: {}, appear: {}, order: [], led: v52Led(), runs: 0, committed: false
  };
}

let __v52LastGame = null;

function v52PlayGame(homeTeam, awayTeam, players) {
  const home = v52SideInit(homeTeam, players, true);
  const away = v52SideInit(awayTeam, players, false);
  if (!home.starter || !away.starter || home.batters.length === 0 || away.batters.length === 0) {
    // 陣容不足以逐打席模擬（例如國際賽幽靈隊資料不全）→ 退回輕量估算，不產生個人成績
    const hs = Math.max(0, Math.round(randNormal(4.2, 2.2)));
    let as = Math.max(0, Math.round(randNormal(4.2, 2.2)));
    if (hs === as) as = Math.max(0, as - 1);
    return { homeScore: hs, awayScore: as, home, away, light: true };
  }
  v52EnterPitcher(home, home.starter, 1, 0);
  v52EnterPitcher(away, away.starter, 1, 0);

  let inning = 1;
  const maxInning = 9 + V52_CFG.maxExtra;
  while (inning <= maxInning) {
    // 上半局：客隊進攻
    away.runs += v52HalfInning(away, home, inning, away.runs - home.runs, false);
    // 下半局：主隊進攻（九局以後領先則不需再打）
    if (!(inning >= 9 && home.runs > away.runs)) {
      const walkOff = inning >= 9;
      home.runs += v52HalfInning(home, away, inning, home.runs - away.runs, walkOff);
    }
    if (inning >= 9 && home.runs !== away.runs) break;
    inning++;
  }
  // 延長仍平手：以全隊抗壓性決勝（極罕見）
  if (home.runs === away.runs) {
    const hC = teamComposureRating(homeTeam, players), aC = teamComposureRating(awayTeam, players);
    if (hC >= aC) home.runs++; else away.runs++;
  }

  let homeScore = home.runs, awayScore = away.runs;
  // v37⑥ 板凳專員近戰發動（僅自家隊；同步調整對手投手的失分帳）
  const nudge = (side, oppSide, my, opp) => {
    const r = applyBenchRoleNudge(side.team, my, opp);
    const dMy = r[0] - my, dOpp = r[1] - opp;
    if (dMy !== 0 || dOpp !== 0) {
      const lastId = oppSide.order[oppSide.order.length - 1];
      const lastP = lastId ? (oppSide.appear[lastId] || {}).p : null;
      if (lastP && dMy > 0) { v52Add(oppSide.led, lastP, "R", dMy); v52Add(oppSide.led, lastP, "ER", dMy); }
      const myLastId = side.order[side.order.length - 1];
      const myLastP = myLastId ? (side.appear[myLastId] || {}).p : null;
      if (myLastP && dOpp < 0) { v52Add(side.led, myLastP, "R", dOpp); v52Add(side.led, myLastP, "ER", dOpp); }
    }
    return r;
  };
  if (homeTeam.id === S.userTeamId) { const r = nudge(home, away, homeScore, awayScore); homeScore = r[0]; awayScore = r[1]; }
  else if (awayTeam.id === S.userTeamId) { const r = nudge(away, home, awayScore, homeScore); awayScore = r[0]; homeScore = r[1]; }
  if (homeScore === awayScore) homeScore++;

  // 勝敗投／救援／中繼
  v52DecideDecisions(home, away, homeScore > awayScore, homeScore, awayScore);
  v52DecideDecisions(away, home, awayScore > homeScore, awayScore, homeScore);
  // 出賽場次（打者）與疲勞
  [home, away].forEach(sd => {
    sd.batters.forEach(b => { v52Add(sd.led, b, "G", 1); if (!b.isPitcher) { b.consecGames = (b.consecGames || 0) + 1; b._playedToday = true; } }); // r008：體力管理連續出賽計數
    Object.keys(sd.appear).forEach(pid => {
      const ap = sd.appear[pid];
      if (!ap || !ap.p) return;
      if (ap.isStarter) {
        const extra = (typeof v43RotFatigueDelta === "function") ? v43RotFatigueDelta(sd.team)
                    : ((typeof v42RotFatigueDelta === "function") ? v42RotFatigueDelta(sd.team) : 0);
        addFatigue(ap.p, 32 + extra);
      } else {
        addFatigue(ap.p, 14 + Math.round(ap.outs * 2.5));
      }
    });
  });
  home.runs = homeScore; away.runs = awayScore;
  return { homeScore, awayScore, home, away };
}

function v52DecideDecisions(side, opp, won, myScore, oppScore) {
  const ids = side.order;
  if (!ids.length) return;
  const list = ids.map(id => side.appear[id]).filter(Boolean);
  const starterAp = list.find(a => a.isStarter);
  if (won) {
    let winner = null;
    if (starterAp && starterAp.outs >= 15) winner = starterAp;
    else {
      const rel = list.filter(a => !a.isStarter).sort((a, b) => b.outs - a.outs)[0];
      winner = rel || starterAp;
    }
    if (winner) v52Add(side.led, winner.p, "W", 1);
    const finisher = list[list.length - 1];
    const lead = myScore - oppScore;
    if (finisher && !finisher.isStarter && finisher !== winner && lead > 0 && lead <= 3 && finisher.outs >= 1) {
      v52Add(side.led, finisher.p, "SV", 1);
    }
    list.forEach(a => {
      if (a.isStarter || a === finisher || a === winner) return;
      if (a.enterLead > 0 && a.enterLead <= 3 && a.outs >= 1) v52Add(side.led, a.p, "HD", 1);
    });
  } else {
    let loser = list.slice().sort((a, b) => (b.R - a.R) || (b.outs - a.outs))[0];
    if (!loser) loser = starterAp;
    if (loser) v52Add(side.led, loser.p, "L", 1);
  }
}

function simulateGame(homeTeam, awayTeam, players) {
  const g = v52PlayGame(homeTeam, awayTeam, players);
  __v52LastGame = g;
  return { homeScore: g.homeScore, awayScore: g.awayScore };
}

/* 個人成績入帳：逐打席引擎已在比賽當下算完整場帳本，這裡只負責寫入。
   季後賽／國際賽只呼叫 simulateGame 不呼叫本函式，因此不會污染例行賽成績。 */
function attributeGameStats(team, players, runsScored, runsAllowed, won) {
  const g = __v52LastGame;
  if (!g || g.light) return;
  const side = (g.home.team === team) ? g.home : ((g.away.team === team) ? g.away : null);
  if (!side || side.committed) return;
  v52Commit(side.led);
  side.committed = true;
}

/* ====================================================================
   ⑤受傷機制：出賽球員每場有低機率受傷（耐久度越低、年齡越大機率越高），
   受傷分輕/中/重三級（3~10天／11~30天／31~90天），傷兵無法出賽（打線/輪值/牛棚自動跳過），
   每模擬1天恢復1天，醫療室等級（⑥）可降低受傷機率並縮短恢復天數；休賽季所有傷勢痊癒。
   ==================================================================== */
/* v26傷病深化：傷勢部位化＋傷病史＋舊傷復發＋重傷手術決策＋傷癒降評（復健中心⑥v26連動） */
const INJURY_TYPES = {
  light: { label: "輕度", days: [3, 10], pool: [
    { n: "肌肉緊繃", part: "背部" }, { n: "手指挫傷", part: "手指" }, { n: "輕微拉傷", part: "大腿" },
    { n: "背部僵硬", part: "背部" }, { n: "小腿抽筋", part: "小腿" }] },
  medium: { label: "中度", days: [11, 30], pool: [
    { n: "腿筋拉傷", part: "大腿" }, { n: "腹斜肌拉傷", part: "腹部" }, { n: "腳踝扭傷", part: "腳踝" },
    { n: "肩膀發炎", part: "肩部" }, { n: "手腕發炎", part: "手腕" }] },
  severe: { label: "重度", days: [31, 90], pool: [
    { n: "手肘韌帶損傷", part: "手肘" }, { n: "肩旋轉肌撕裂", part: "肩部" },
    { n: "膝蓋韌帶扭傷", part: "膝蓋" }, { n: "疲勞性骨折", part: "小腿" }] }
};
function rollInjurySeverity(p) {
  const durShift = clamp((55 - p.durability) / 150, -0.15, 0.25); // 耐久越低越容易偏向重傷
  const r = Math.random();
  if (r < 0.10 + durShift * 0.4) return "severe";
  if (r < 0.40 + durShift) return "medium";
  return "light";
}
// v26傷病史係數：中重度傷病越多、受傷機率越高（上限x2）；手術治癒的重傷權重較低；復健中心削減
function injuryHistFactor(p, team) {
  const hist = p.injuryHistory || [];
  if (hist.length === 0) return 1;
  const w = hist.reduce((a, h) => a + (h.severity === "severe" ? (h.method === "surgery" ? 0.4 : 1) : (h.severity === "medium" ? 0.5 : 0.15)), 0);
  let m = Math.min(2, 1 + 0.12 * w);
  const relief = (team && typeof rehabRecurrenceRelief === "function") ? rehabRecurrenceRelief(team) : 0;
  return 1 + (m - 1) * (1 - relief);
}
// v26：實際套用一筆傷勢（比賽受傷與特訓受傷共用）：擲等級→算天數（醫療室+復健中心）→舊傷復發判定→寫入傷病史→重傷治療方針
function applyInjury(p, team) {
  const sev = rollInjurySeverity(p);
  const t = INJURY_TYPES[sev];
  const pick = choice(t.pool);
  let days = randInt(t.days[0], t.days[1]);
  const recMult = (typeof medicalRecoveryMult === "function") ? medicalRecoveryMult(team) : 1;      // ⑥醫療室縮短恢復
  const rehMult = (team && typeof rehabRecoveryMult === "function") ? rehabRecoveryMult(team) : 1;  // v26復健中心再縮短
  days = Math.max(2, Math.round(days * recMult * rehMult));
  // 舊傷復發：同部位有中重度病史 → 傷名冠上「舊傷復發」且天數x1.15
  const recur = (p.injuryHistory || []).some(h => h.part === pick.part && h.severity !== "light");
  if (recur) days = Math.max(2, Math.round(days * 1.15));
  p.injury = { name: (recur ? "舊傷復發・" : "") + pick.n, part: pick.part, severity: sev, severityLabel: t.label, daysLeft: days, totalDays: days };
  p.injuryHistory = p.injuryHistory || [];
  p.injuryHistory.push({ year: S.seasonYear, name: pick.n, part: pick.part, severity: sev, severityLabel: t.label, days, recur: recur || undefined });
  if (p.injuryHistory.length > 20) p.injuryHistory.shift(); // 病史封頂20筆
  // 重傷 → 治療方針：玩家隊出決策卡（恢復凍結至決策為止）；AI隊即時自動決定（長期傷勢傾向手術）
  if (sev === "severe") {
    p.injury.baseDays = days; // v29：手術費以受傷當下的原始天數計價
    if (team && team.id === S.userTeamId) p.injury.pendingSurgery = true;
    else {
      // v29：AI隊自動決策也要實際付手術費；為避免手術支出侵蝕AI的國際簽援與運營預算（v27已放寬過門檻），
      // AI只在「預算 ≥ 手術費＋2億緩衝」時才選手術——只有真正有錢的球團捨得開刀，中小球團一律保守治療（也符合現實）。
      ensureFinance(team);
      const wantSurgery = days >= 50 && team.finance.budget >= surgeryCostFor(p, team) + 200000000;
      decideSurgeryFor(p, wantSurgery ? "surgery" : "conservative", team);
    }
  }
  return true;
}
function maybeInjurePlayer(p, team) {
  if (!p || isInjured(p) || p.internationalDutyGamesLeft > 0) return false;
  const base = 0.0035; // 每場出賽基礎受傷率0.35%
  const durMult = clamp(1 + (55 - p.durability) / 70, 0.4, 1.8); // 耐久20→約x1.5、耐久90→約x0.5
  const ageMult = p.age >= 33 ? 1.3 : (p.age >= 29 ? 1.12 : 1);
  const medMult = (typeof medicalInjuryMult === "function") ? medicalInjuryMult(team) : 1; // ⑥醫療室降低機率
  // v25：特質（玻璃體質x1.5／鋼鐵之軀x0.6）、狀況（低迷+30%／絕不調+60%）、投手疲勞（滿疲勞+60%）
  const traitMult = hasTrait(p, "glass") ? 1.5 : (hasTrait(p, "ironman") ? 0.6 : 1);
  const condMult = conditionOf(p) === -1 ? 1.3 : (conditionOf(p) === -2 ? 1.6 : 1);
  const fatMult = p.isPitcher ? (1 + fatigueOf(p) / 160) : 1;
  // v26：季中特訓風險x1.15（玻璃體質受訓x1.3）、傷病史係數（中重傷越多越易再傷，復健中心削減）
  const trainMult = p.midTraining ? (hasTrait(p, "glass") ? 1.3 : 1.15) : 1;
  const histMult = injuryHistFactor(p, team);
  const chance = clamp(base * durMult * ageMult * medMult * traitMult * condMult * fatMult * trainMult * histMult, 0.0005, 0.05);
  if (Math.random() >= chance) return false;
  return applyInjury(p, team);
}
/* v26重傷治療方針：
   手術＝恢復天數x1.4、傷癒降評機率僅2%、病史復發權重低（治本）
   保守＝天數照舊、降評機率25%（復健中心每級-3%、下限5%）、病史復發權重高（賭一把）
   玻璃體質降評機率x1.4、鋼鐵之軀x0.5 */
// v29手術費用：基礎300萬＋原始缺陣天數×15萬（以「手術延長前」的天數計價，避免手術反而讓帳單變貴），
// 醫療室每級費用-5%（自家醫療團隊分攤，Lv5=-25%）；全聯盟球隊（含AI）都要實際付費。
function surgeryCostFor(p, team) {
  const days = p.injury ? (p.injury.baseDays || p.injury.totalDays || 30) : 30;
  const medDiscount = (team && typeof medicalLevel === "function") ? (1 - 0.05 * medicalLevel(team)) : 1;
  return Math.round((3000000 + days * 150000) * medDiscount / 10000) * 10000;
}
function decideSurgeryFor(p, method, team) {
  if (!p.injury || p.injury.severity !== "severe") return;
  const t = team || S.teams[p.team];
  let downgrade;
  if (method === "surgery") {
    // v29：手術實際扣除費用（玩家與AI都要付；AI在自動決策端已先確認預算）
    const surgCost = surgeryCostFor(p, t);
    if (t) { ensureFinance(t); t.finance.budget -= surgCost; }
    p.injury.surgeryCost = surgCost;
    p.injury.baseDays = p.injury.baseDays || p.injury.totalDays;
    p.injury.totalDays = Math.max(3, Math.round(p.injury.totalDays * 1.4));
    p.injury.daysLeft = p.injury.totalDays;
    downgrade = 0.02;
  } else {
    const shift = (t && typeof rehabDowngradeShift === "function") ? rehabDowngradeShift(t) : 0;
    downgrade = clamp(0.25 - shift, 0.05, 0.25);
  }
  if (hasTrait(p, "glass")) downgrade *= 1.4;
  if (hasTrait(p, "ironman")) downgrade *= 0.5;
  p.injury.method = method;
  p.injury.downgradeChance = clamp(downgrade, 0.01, 0.5);
  delete p.injury.pendingSurgery;
  const last = (p.injuryHistory || []).slice(-1)[0];
  if (last && last.severity === "severe" && !last.method) last.method = method;
}
function decideSurgery(playerId, method) {
  const p = S.players[playerId];
  if (!p || !p.injury || !p.injury.pendingSurgery) return;
  const team = S.teams[p.team];
  // v29：手術需實際支付費用，預算不足時擋下並提示（保守治療永遠可選，不會卡死）
  if (method === "surgery") {
    ensureFinance(team);
    const cost = surgeryCostFor(p, team);
    if (team.finance.budget < cost) {
      UI.flash = `預算不足：${p.name} 的手術費用需要 ${formatMoney(cost)}，目前預算 ${formatMoney(team.finance.budget)}。只能採取保守治療，或先想辦法籌錢。`;
      render();
      return;
    }
  }
  decideSurgeryFor(p, method, team);
  UI.flash = method === "surgery"
    ? `${p.name} 接受手術治療（支付 ${formatMoney(p.injury.surgeryCost || 0)}）：恢復期延長為約 ${p.injury.daysLeft} 天，但幾乎不留後遺症、舊傷復發風險最低。`
    : `${p.name} 採取保守治療（不需費用）：恢復期約 ${p.injury.daysLeft} 天，但傷癒後有降評風險，日後同部位也較容易復發。`;
  if (typeof pushNews === "function") pushNews("傷兵", `${S.teams[p.team] ? S.teams[p.team].name : ""} ${p.name}（${p.injury.name}）決定${method === "surgery" ? `接受手術（費用${formatMoney(p.injury.surgeryCost || 0)}）` : "採取保守治療"}，預計缺陣約${p.injury.daysLeft}天。`);
  persist();
  render();
}
// v26傷癒降評：重傷痊癒時依治療方針擲骰，中獎則耐久或相關屬性-1~3並寫入病史與新聞
const INJURY_PART_ATTR = {
  "肩部": pl => pl.isPitcher ? "velocity" : "arm", "手肘": pl => pl.isPitcher ? "velocity" : "arm",
  "手腕": pl => pl.isPitcher ? "control" : "contact", "手指": pl => pl.isPitcher ? "control" : "contact",
  "膝蓋": pl => pl.isPitcher ? "stamina" : "speed", "腳踝": pl => pl.isPitcher ? "stamina" : "speed",
  "大腿": pl => pl.isPitcher ? "stamina" : "speed", "小腿": pl => pl.isPitcher ? "stamina" : "speed",
  "背部": pl => pl.isPitcher ? "stamina" : "power", "腹部": pl => pl.isPitcher ? "stamina" : "power"
};
const ATTR_ZH = { velocity: "球速", control: "控球", stamina: "體力", contact: "接觸力", power: "長打力", speed: "跑壘速度", arm: "臂力", durability: "耐久度" };
function resolveSevereRecovery(p) {
  const inj = p.injury;
  const chance = typeof inj.downgradeChance === "number" ? inj.downgradeChance : 0.25; // 舊存檔重傷視同保守治療
  const last = (p.injuryHistory || []).slice(-1)[0];
  if (Math.random() < chance) {
    const partFn = INJURY_PART_ATTR[inj.part];
    const attr = Math.random() < 0.5 ? "durability" : (partFn ? partFn(p) : "stamina");
    const amt = randInt(1, 3);
    const before = p[attr];
    p[attr] = clamp((p[attr] || 40) - amt, 20, 99);
    const desc = `${ATTR_ZH[attr] || attr} ${before}→${p[attr]}`;
    if (last && last.severity === "severe") last.downgraded = desc;
    if (typeof pushNews === "function") {
      const t = S.teams[p.team];
      pushNews("傷兵", `${t ? t.name : ""} ${p.name} 傷癒歸隊，但${inj.name}留下了後遺症（${desc}）。`);
    }
  } else if (p.team === S.userTeamId && typeof pushNews === "function") {
    pushNews("傷兵", `好消息！${p.name} 完全康復歸隊，${inj.name}未留下後遺症。`);
  }
}
function rollTeamInjuries(team, players, collector) {
  const participants = getLineupBatters(team, players).slice(0, 10);
  const rotation = getRotationPitchers(team, players);
  if (rotation.length > 0) participants.push(choice(rotation)); // 近似：當日登板投手之一
  participants.forEach(p => {
    if (maybeInjurePlayer(p, team)) collector.push({ playerId: p.id, teamId: team.id });
  });
}
function tickInjuries(players) {
  Object.values(players).forEach(p => {
    if (p.injury && p.injury.daysLeft > 0) {
      if (p.injury.pendingSurgery) return; // v26：重傷等待治療方針決策期間，恢復凍結
      p.injury.daysLeft--;
      if (p.injury.daysLeft <= 0) {
        if (p.injury.severity === "severe") resolveSevereRecovery(p); // v26傷癒降評判定
        delete p.injury;
      }
    }
  });
}

/* ====================================================================
   v36 第10階段：事件系統。逐日加權抽發（依球隊狀況/球員），每季上限、重大事件冷卻，
   一次只處理一個事件卡（不洗版）。效果以「事件key＋選項key＋ctx純資料」在結算時重建，
   不把函式存進存檔（序列化安全）。事件卡與選項接線在 05-ui-dashboard。
   ==================================================================== */
const EVENT_SEASON_CAP = 6;      // 每季事件上限（依Claude建議）
const EVENT_COOLDOWN_DAYS = 14;  // 觸發後冷卻天數，避免洗版
const EVENT_DAILY_CHANCE = 0.09; // 每個模擬日的基礎觸發機率
function ev_m(p) { return p && p.morale != null ? p.morale : 70; }
function ev_l(p) { return p && p.loyalty != null ? p.loyalty : 50; }
function ev_roster(team) { return team.roster1.concat(team.roster2).map(id => S.players[id]).filter(Boolean); }
function ev_pick(team, filter) { const c = ev_roster(team).filter(p => !filter || filter(p)); return c.length ? choice(c) : null; }
function ev_bumpAll(team, dM, dL) { ev_roster(team).forEach(p => { if (dM) p.morale = clamp(ev_m(p) + dM, 0, 100); if (dL) p.loyalty = clamp(ev_l(p) + dL, 0, 100); }); }
function ev_avgMorale(team) { const ps = ev_roster(team); return ps.length ? ps.reduce((s, p) => s + ev_m(p), 0) / ps.length : 70; }
function ev_budget(team, d) { ensureFinance(team); team.finance.budget += d; }
function ev_pop(team, d) { ensureFinance(team); team.finance.popularity = clamp(team.finance.popularity + d, 10, 99); }

const EVENT_DEFS = {
  leaderEmergence: {
    category: "更衣室", 
    weight: team => ev_pick(team, p => p.age >= 30 && ev_m(p) >= 70) ? 3 : 1,
    build: team => { const v = ev_pick(team, p => p.age >= 30) || ev_pick(team); if (!v) return null;
      return { title: "更衣室領袖浮現", desc: `資深球員 ${v.name} 在隊上威望日隆，隊友都願意聽他的。要不要順勢立他為精神領袖？`, ctx: { pid: v.id },
        options: [{ key: "appoint", label: "任命為隊長" }, { key: "lowkey", label: "低調鼓勵就好" }] }; },
    apply: (team, opt, ctx) => { const v = S.players[ctx.pid]; const nm = v ? v.name : "該球員";
      if (opt === "appoint") { ev_bumpAll(team, 4, 3); if (v) v.loyalty = clamp(ev_l(v) + 8, 0, 100); return `${nm}獲任命為隊長，全隊士氣＋4、向心力提升。`; }
      ev_bumpAll(team, 2, 0); return `你私下肯定了${nm}，更衣室氣氛小幅提振（士氣＋2）。`; }
  },
  clubhouseRift: {
    category: "更衣室",
    weight: team => ev_avgMorale(team) < 65 ? 3 : 1,
    build: team => { const a = ev_pick(team); const b = ev_pick(team, p => a && p.id !== a.id); if (!a || !b) return null;
      return { title: "更衣室起了裂痕", desc: `${a.name} 與 ${b.name} 為了先發順序鬧得不愉快，隊友都感受到低氣壓。你怎麼處理？`, ctx: {},
        options: [{ key: "mediate", label: "親自調解（花小錢辦聚餐）" }, { key: "evenhand", label: "各打五十大板" }, { key: "ignore", label: "暫不介入" }] }; },
    apply: (team, opt) => {
      if (opt === "mediate") { ev_budget(team, -500 * 10000); ev_bumpAll(team, 5, 0); return "你出面調解並辦了場全隊聚餐（-500萬），心結化解、全隊士氣＋5。"; }
      if (opt === "evenhand") { ev_bumpAll(team, -1, 2); return "你公正地各打五十大板，士氣略降但球員敬重你的公道（忠誠＋2）。"; }
      ev_bumpAll(team, -4, 0); return "你選擇不介入，裂痕擴大，全隊士氣－4。"; },
    // v38②：不介入的裂痕不會自己癒合——14天後演變成主力求去（連鎖）
    chain: (team, opt) => opt === "ignore" ? { key: "tradeDemand", afterDays: 25, ctx: { fromRift: true } } : null
  },
  offFieldIncident: {
    category: "場外",
    weight: () => 1,
    build: team => { const p = ev_pick(team); if (!p) return null;
      return { title: "球員場外風波", desc: `${p.name} 捲入一起場外爭議，登上社群熱議。球團要如何回應？`, ctx: { pid: p.id },
        options: [{ key: "apologize", label: "公開道歉＋內部處分" }, { key: "defend", label: "力挺球員" }, { key: "bench", label: "禁賽冷處理" }] }; },
    apply: (team, opt, ctx) => { const p = S.players[ctx.pid]; const nm = p ? p.name : "該球員";
      if (opt === "apologize") { ev_pop(team, -2); if (p) p.morale = clamp(ev_m(p) - 3, 0, 100); return `球團代為道歉並內部處分，人氣－2、${nm}士氣－3，但風波平息。`; }
      if (opt === "defend") { ev_pop(team, -4); if (p) { p.morale = clamp(ev_m(p) + 6, 0, 100); p.loyalty = clamp(ev_l(p) + 6, 0, 100); } return `你公開力挺${nm}（人氣－4），但他深受感動，士氣＋6、忠誠＋6。`; }
      if (p) { p.morale = clamp(ev_m(p) - 8, 0, 100); p.condition = -1; } return `${nm}遭禁賽冷處理，士氣－8、近期狀態下滑。`; },
    // v38②：力挺球員＝與輿論對作，20天後媒體回頭找你算帳（連鎖）
    chain: (team, opt) => opt === "defend" ? { key: "mediaCriticism", afterDays: 35, ctx: {} } : null
  },
  sponsorBonus: {
    category: "營運",
    weight: team => (team.finance && team.finance.popularity >= 45) ? 2 : 1,
    build: team => ({ title: "贊助商臨時加碼", desc: "一家贊助商想搭配一檔限定促銷，願意額外挹注獎金——但你得配合辦一場小型行銷活動。", ctx: {},
      options: [{ key: "accept", label: "接受並辦促銷" }, { key: "decline", label: "婉拒" }] }),
    apply: (team, opt) => {
      if (opt === "accept") { ev_budget(team, 3000 * 10000 - 500 * 10000); ev_pop(team, 1); return "促銷檔期圓滿（活動成本500萬），淨入帳2500萬、人氣＋1。"; }
      return "你婉拒了這次合作，維持現狀。"; },
    // v38②：合作愉快的贊助商30天後回頭談長約（連鎖）
    chain: (team, opt) => opt === "accept" ? { key: "sponsorRenewal", afterDays: 55, ctx: {} } : null
  },
  tradeDemand: {
    category: "球員",
    weight: team => ev_pick(team, p => ev_m(p) < 55) ? 3 : 0.5,
    build: team => { const p = ev_pick(team, x => ev_m(x) < 60) || ev_pick(team); if (!p) return null;
      return { title: "球員求去", desc: `${p.name} 對現況不滿，透過經紀人放話希望加薪或被交易。你的決定是？`, ctx: { pid: p.id },
        options: [{ key: "raise", label: "安撫並加薪" }, { key: "promise", label: "承諾更多上場機會" }, { key: "refuse", label: "拒絕，維持原議" }] }; },
    apply: (team, opt, ctx) => { const p = S.players[ctx.pid]; const nm = p ? p.name : "該球員";
      if (opt === "raise") { ev_budget(team, -2000 * 10000); if (p) { p.morale = clamp(ev_m(p) + 15, 0, 100); p.loyalty = clamp(ev_l(p) + 8, 0, 100); } return `你以加薪（-2000萬）安撫${nm}，士氣＋15、忠誠＋8。`; }
      if (opt === "promise") { if (p) p.morale = clamp(ev_m(p) + 6, 0, 100); return `你承諾給${nm}更多上場機會，士氣＋6。`; }
      if (p) { p.morale = clamp(ev_m(p) - 6, 0, 100); p.loyalty = clamp(ev_l(p) - 10, 0, 100); } return `你回絕了${nm}的要求，士氣－6、忠誠－10。`; }
  },
  playerBreakthrough: {
    category: "球員",
    weight: team => ev_pick(team, p => p.age <= 24 && (p.potential || 60) >= 70) ? 2 : 0.5,
    build: team => { const p = ev_pick(team, x => x.age <= 24) || ev_pick(team); if (!p) return null;
      return { title: "年輕球員的頓悟", desc: `${p.name} 最近在練習中抓到了關鍵手感，教練團認為值得加練把握。`, ctx: { pid: p.id },
        options: [{ key: "train", label: "加練強化（-800萬）" }, { key: "keep", label: "維持現有節奏" }] }; },
    apply: (team, opt, ctx) => { const p = S.players[ctx.pid]; const nm = p ? p.name : "該球員";
      if (opt === "train") { ev_budget(team, -800 * 10000);
        if (p) { const k = p.isPitcher ? choice(["velocity", "control", "stamina"]) : choice(["contact", "power", "eye", "speed", "fielding"]); p[k] = clamp((p[k] || 50) + 3, 20, 99); p.morale = clamp(ev_m(p) + 3, 0, 100); }
        return `${nm}把握住頓悟加練，一項能力提升、士氣＋3。`; }
      if (p) p.morale = clamp(ev_m(p) + 2, 0, 100); return `你讓${nm}維持節奏，順其自然（士氣＋2）。`; },
    // v38②：加練的成果不是當場揭曉——25天後驗收（連鎖）
    chain: (team, opt, ctx) => opt === "train" ? { key: "breakthroughReview", afterDays: 45, ctx: { pid: ctx.pid } } : null
  },

  /* ==== v38②：新增 8 種事件（6→14），並補上「媒體球迷」「國際」兩個新類別 ==== */
  veteranMentor: {
    category: "更衣室",
    weight: team => (ev_pick(team, p => p.age >= 32) && ev_pick(team, p => p.age <= 22)) ? 2 : 0,
    build: team => { const v = ev_pick(team, p => p.age >= 32); const y = ev_pick(team, p => p.age <= 22 && (!v || p.id !== v.id)); if (!v || !y) return null;
      return { title: "老將想帶新人", desc: `${v.name} 主動說想利用休息時間帶 ${y.name} 加強基本功。要不要給他們額外的訓練時段？`, ctx: { vid: v.id, yid: y.id },
        options: [{ key: "allow", label: "安排師徒時段" }, { key: "focus", label: "還是各自專心備戰" }] }; },
    apply: (team, opt, ctx) => { const v = S.players[ctx.vid], y = S.players[ctx.yid];
      const vn = v ? v.name : "老將", yn = y ? y.name : "新人";
      if (opt === "allow") {
        if (y) { const k = y.isPitcher ? choice(["control", "stamina"]) : choice(["contact", "eye", "bunting"]); y[k] = clamp((y[k] || 50) + 2, 20, 99); y.morale = clamp(ev_m(y) + 5, 0, 100); }
        if (v) { v.loyalty = clamp(ev_l(v) + 6, 0, 100); v.morale = clamp(ev_m(v) + 3, 0, 100); }
        ev_bumpAll(team, 2, 1);
        return `${vn}帶著${yn}加練，${yn}一項基本功提升、士氣＋5；${vn}忠誠＋6，更衣室氣氛也好轉。`; }
      if (v) v.morale = clamp(ev_m(v) - 3, 0, 100);
      return `你要求各自專心備戰，${vn}有點失落（士氣－3）。`; }
  },
  breakthroughReview: {
    category: "球員",
    weight: () => 0, // 連鎖專用：不進入每日隨機抽籤
    build: (team, ctx) => { const p = ctx && S.players[ctx.pid]; if (!p) return null;
      return { title: "加練成果驗收", desc: `一個多月前你為 ${p.name} 追加了強化訓練，教練團今天回報了驗收結果。`, ctx: { pid: p.id },
        options: [{ key: "ok", label: "看結果" }] }; },
    apply: (team, opt, ctx) => { const p = S.players[ctx.pid]; if (!p) return "";
      if (Math.random() < 0.6) {
        p.potential = clamp((p.potential || 55) + 2, 24, 93); // 逐屬性天花板由 ensurePlayerPots 依 potBase 差額同步位移（v38①）
        if (typeof ensurePlayerPots === "function") ensurePlayerPots(p);
        p.morale = clamp(ev_m(p) + 4, 0, 100);
        return `驗收成果亮眼：${p.name} 的動作定型了，教練團上修他的潛力評估（潛力＋2，各項天花板同步上調）、士氣＋4。`; }
      p.fatigue = clamp((p.fatigue || 0) + 15, 0, 100);
      return `驗收結果普通：${p.name} 練得很勤但沒抓到訣竅，只累積了疲勞（疲勞＋15）。`; }
  },
  slumpCrisis: {
    category: "球員",
    weight: team => ev_pick(team, p => ev_m(p) < 50) ? 2 : 0.6,
    build: team => { const p = ev_pick(team, x => ev_m(x) < 60) || ev_pick(team); if (!p) return null;
      return { title: "主力陷入低潮", desc: `${p.name} 已經連續多場表現失常，本人看起來也失去了自信。`, ctx: { pid: p.id },
        options: [{ key: "rest", label: "讓他休息調整（-狀態換士氣）" }, { key: "coach", label: "找教練加強特訓（-600萬）" }, { key: "push", label: "硬撐著繼續用" }] }; },
    apply: (team, opt, ctx) => { const p = S.players[ctx.pid]; const nm = p ? p.name : "該球員";
      if (opt === "rest") { if (p) { p.morale = clamp(ev_m(p) + 10, 0, 100); p.fatigue = clamp((p.fatigue || 0) - 25, 0, 100); p.condition = 0; } return `${nm}獲准休息調整，士氣＋10、疲勞緩解，狀況回到平穩。`; }
      if (opt === "coach") { ev_budget(team, -600 * 10000); if (p) { p.morale = clamp(ev_m(p) + 5, 0, 100); p.condition = Math.random() < 0.6 ? 1 : -1; } return `你安排了專門特訓（-600萬），${nm}士氣＋5，狀況${p && p.condition > 0 ? "明顯回升" : "仍未見起色"}。`; }
      if (p) { p.morale = clamp(ev_m(p) - 8, 0, 100); p.slumpLockDays = randInt(5, 9); } return `你要求${nm}硬撐著上場，士氣－8，低潮還會延續一段時間。`; }
  },
  mediaCriticism: {
    category: "媒體球迷",
    weight: team => (team.finance && team.finance.popularity < 45) ? 2.5 : 1,
    build: team => ({ title: "媒體開砲", desc: "一家大報以頭版檢討球團經營方向，質疑你的補強根本沒有章法。要回應嗎？", ctx: {},
      options: [{ key: "counter", label: "開記者會強硬反擊" }, { key: "humble", label: "低姿態說明並溝通" }, { key: "silent", label: "不予回應" }] }),
    apply: (team, opt) => {
      if (opt === "counter") { ev_pop(team, 2); ev_bumpAll(team, 3, 0); return "你開記者會強硬回擊，球迷買單這股氣勢（人氣＋2、全隊士氣＋3），但媒體記下了這筆帳。"; }
      if (opt === "humble") { ev_pop(team, 1); return "你低姿態說明球團規劃，輿論逐漸降溫（人氣＋1）。"; }
      ev_pop(team, -3); return "你選擇沉默，批評聲量持續發酵（人氣－3）。"; },
    // v38②：硬碰硬會有後續——15天後媒體帶動球迷情緒
    chain: (team, opt) => opt === "counter" ? { key: "fanProtest", afterDays: 28, ctx: { fromMedia: true } } : null
  },
  fanProtest: {
    category: "媒體球迷",
    weight: team => (team.finance && team.finance.popularity < 40) ? 1.5 : 0.4,
    build: (team, ctx) => ({ title: "球迷抗議行動", desc: (ctx && ctx.fromMedia)
        ? "媒體戰延燒，鐵桿球迷在主場外拉起白布條，要求球團說清楚未來方向。"
        : "戰績低迷太久，球迷在主場外拉起白布條抗議球團不作為。", ctx: ctx || {},
      options: [{ key: "meet", label: "親自出面對話" }, { key: "refund", label: "推出球迷回饋方案（-1200萬）" }, { key: "ignore", label: "交由公關處理" }] }),
    apply: (team, opt) => {
      if (opt === "meet") { ev_pop(team, 3); ev_bumpAll(team, -1, 0); return "你親自走出來與球迷對話，誠意獲得肯定（人氣＋3），但球員承受了更多壓力（士氣－1）。"; }
      if (opt === "refund") { ev_budget(team, -1200 * 10000); ev_pop(team, 5); return "球團推出球迷回饋方案（-1200萬），現場氣氛翻轉（人氣＋5）。"; }
      ev_pop(team, -4); return "你交給公關制式回應，球迷更火大了（人氣－4）。"; }
  },
  fanFestival: {
    category: "媒體球迷",
    weight: team => (team.finance && team.finance.popularity >= 55) ? 2 : 0.8,
    build: () => ({ title: "球迷感謝祭邀約", desc: "球迷後援會希望球團辦一場感謝祭，球員要下場互動整整一天。", ctx: {},
      options: [{ key: "big", label: "盛大舉辦（-1000萬）" }, { key: "small", label: "小規模辦（-300萬）" }, { key: "skip", label: "婉拒，專心比賽" }] }),
    apply: (team, opt) => {
      if (opt === "big") { ev_budget(team, -1000 * 10000); ev_pop(team, 6); ev_bumpAll(team, 3, 2); return "感謝祭盛大登場（-1000萬）：人氣＋6、全隊士氣＋3、忠誠＋2。"; }
      if (opt === "small") { ev_budget(team, -300 * 10000); ev_pop(team, 2); ev_bumpAll(team, 1, 1); return "小而美的感謝祭（-300萬）：人氣＋2、士氣＋1、忠誠＋1。"; }
      ev_pop(team, -1); return "你婉拒了感謝祭，球迷有些失落（人氣－1）。"; }
  },
  foreignAdaptation: {
    category: "國際",
    weight: team => ev_pick(team, p => p.foreign) ? 2 : 0,
    build: team => { const p = ev_pick(team, x => x.foreign); if (!p) return null;
      return { title: "外籍球員水土不服", desc: `${p.name}（${p.nationality}）私下反映生活適應不良，狀況明顯受影響。`, ctx: { pid: p.id },
        options: [{ key: "support", label: "安排翻譯與生活支援（-700萬）" }, { key: "family", label: "接家人來台同住（-1500萬）" }, { key: "tough", label: "職業選手應該自己克服" }] }; },
    apply: (team, opt, ctx) => { const p = S.players[ctx.pid]; const nm = p ? p.name : "該球員";
      if (opt === "support") { ev_budget(team, -700 * 10000); if (p) { p.morale = clamp(ev_m(p) + 8, 0, 100); p.condition = 0; } return `球團安排了翻譯與生活支援（-700萬），${nm}安定下來（士氣＋8）。`; }
      if (opt === "family") { ev_budget(team, -1500 * 10000); if (p) { p.morale = clamp(ev_m(p) + 14, 0, 100); p.loyalty = clamp(ev_l(p) + 12, 0, 100); }
        if (p && typeof addNationBond === "function") { const lv = addNationBond(p.nationality, 1); return `你把${nm}的家人接了過來（-1500萬），他徹底安心（士氣＋14、忠誠＋12）；此舉在${p.nationality}傳為佳話，友好度+1（${lv}／${NATION_BOND_MAX}）。`; }
        return `你把${nm}的家人接了過來（-1500萬），他徹底安心（士氣＋14、忠誠＋12）。`; }
      if (p) { p.morale = clamp(ev_m(p) - 10, 0, 100); p.condition = -1; } return `你要求${nm}自己克服，他士氣－10、狀況下滑。`; }
  },
  intlScoutTip: {
    category: "國際",
    weight: team => (team.scouts && team.scouts.international) ? 1.5 : 0,
    build: team => { const pool = (typeof cdActNations === "function") ? cdActNations().filter(n => n.name !== HOME_NATION_NAME) : [];
      const nation = pool.length ? choice(pool) : null; if (!nation) return null;
      return { title: "國際球探的情報", desc: `你的國際球探回報：${nation.name}有個沒沒無聞的好手，但要親自跑一趟才談得下來。`, ctx: { nation: nation.name },
        options: [{ key: "go", label: `飛一趟${nation.name}（-900萬）` }, { key: "pass", label: "這次先算了" }] }; },
    apply: (team, opt, ctx) => {
      if (opt !== "go") return "你決定這次先不跑這一趟。";
      ev_budget(team, -900 * 10000);
      const nation = (typeof nationByName === "function") ? nationByName(ctx.nation) : null;
      const lv = (typeof addNationBond === "function") ? addNationBond(ctx.nation, 1) : 0;
      if (Math.random() < 0.65 && typeof generateForeignPlayer === "function") {
        const p = generateForeignPlayer(true, nation);
        p.exclusive = true;
        S.internationalFreeAgents = S.internationalFreeAgents || {};
        S.internationalFreeAgents[p.id] = p;
        if (typeof attachScoutedEstimates === "function" && team.scouts) attachScoutedEstimates([p], team.scouts.international);
        return `你飛了一趟${ctx.nation}（-900萬）：${p.name} 已列入你的國際市場獨家名單！友好度+1（${lv}／10）。`;
      }
      return `你飛了一趟${ctx.nation}（-900萬），可惜對方已與他隊接觸，無功而返；但這趟拜訪仍讓友好度+1（${lv}／10）。`; }
  },
  facilityBreakdown: {
    category: "營運",
    weight: () => 1,
    build: () => ({ title: "設施突發故障", desc: "訓練基地的主要設備半夜故障，要立刻決定怎麼處理。", ctx: {},
      options: [{ key: "fix", label: "緊急搶修（-1500萬）" }, { key: "patch", label: "先湊合著用（-300萬）" }] }),
    apply: (team, opt) => {
      if (opt === "fix") { ev_budget(team, -1500 * 10000); return "連夜搶修完成（-1500萬），訓練不受影響。"; }
      ev_budget(team, -300 * 10000); ev_bumpAll(team, -3, 0);
      return "你決定先湊合著用（-300萬），球員抱怨訓練品質（全隊士氣－3）。"; }
  },
  sponsorRenewal: {
    category: "營運",
    weight: () => 0, // 連鎖專用
    build: () => ({ title: "贊助商想談長約", desc: "上次的限定促銷成效超出預期，贊助商回頭想談一份更大的合作案。", ctx: {},
      options: [{ key: "sign", label: "簽下長約" }, { key: "hold", label: "維持單次合作" }] }),
    apply: (team, opt) => {
      if (opt === "sign") { ev_budget(team, 6000 * 10000); ev_pop(team, 2); return "長約拍板：一次性挹注6000萬入帳、人氣＋2。"; }
      return "你選擇維持單次合作，保留日後議價空間。"; }
  }
};

/* v38②：連鎖事件排程——某事件的「選擇」種下後果，N 天後自動引爆後續事件。
   排程資料 S.eventChains=[{key, day, ctx, year, carried?}] 為純資料（可序列化、重載後照常引爆）。
   v39③：間隔全面拉開（25/28/35/45/55 天），且允許跨季存活一次（carried 旗標）。
   連鎖事件不佔每季上限、不吃每日 9% 機率（後果本來就該來），但仍遵守「一次一卡」與冷卻。 */
function scheduleEventChain(key, afterDays, ctx) {
  if (!EVENT_DEFS[key]) return;
  if (!S.eventChains) S.eventChains = [];
  S.eventChains.push({ key, day: S.currentDay + Math.max(1, afterDays | 0), ctx: ctx || {}, year: S.seasonYear });
}
function fireEvent(key, ctx, isChain) {
  const team = S.teams[S.userTeamId];
  const def = EVENT_DEFS[key];
  if (!team || !def) return false;
  const built = def.build(team, ctx || {});
  if (!built) return false;
  S.activeEvent = {
    key, category: def.category, title: built.title, desc: built.desc,
    ctx: built.ctx || {}, options: built.options, year: S.seasonYear, chained: !!isChain
  };
  if (!isChain) S.eventSeason.count++;   // 連鎖事件是既有選擇的後果，不佔每季新事件上限
  S.eventCooldownUntil = S.currentDay + EVENT_COOLDOWN_DAYS;
  if (typeof pushSimInterrupt === "function") pushSimInterrupt(`突發事件：${built.title}`); // 中斷連續模擬讓玩家決定
  if (typeof pushNews === "function") pushNews("事件", `${isChain ? "後續發展：" : "突發事件："}${built.title}`);
  persist();
  return true;
}
function tickEvents() {
  const team = S.teams[S.userTeamId];
  if (!team) return;
  if (S.activeEvent) return; // 一次只處理一個事件，不洗版
  if (!S.eventSeason || S.eventSeason.year !== S.seasonYear) S.eventSeason = { year: S.seasonYear, count: 0 };
  if (S.currentDay < (S.eventCooldownUntil || 0)) return;   // 冷卻中
  // ① 先看有沒有到期的連鎖後果
  //    v39③：跨季允許存活「一次」——季末尚未引爆的連鎖以剩餘天數換算帶進新球季（標 carried），
  //    第二次跨季仍未引爆才丟棄，避免舊帳無限期掛著。（近似：以本季賽程長度代替上季長度換算）
  if (Array.isArray(S.eventChains) && S.eventChains.length) {
    S.eventChains = S.eventChains.reduce((keep, c) => {
      if (!c) return keep;
      if (c.year === S.seasonYear) { keep.push(c); return keep; }
      if (c.carried) return keep; // 已跨過一季仍未引爆 → 過期丟棄
      const seasonLen = S.schedule ? S.schedule.length : 129;
      const remain = Math.max(1, (c.day | 0) - seasonLen);
      keep.push({ key: c.key, day: remain, ctx: c.ctx || {}, year: S.seasonYear, carried: true });
      return keep;
    }, []);
    const idx = S.eventChains.findIndex(c => S.currentDay >= c.day);
    if (idx >= 0) {
      const due = S.eventChains.splice(idx, 1)[0];
      if (fireEvent(due.key, due.ctx, true)) return;
    }
  }
  // ② 一般隨機事件
  if (S.eventSeason.count >= EVENT_SEASON_CAP) return;      // 每季上限
  if (Math.random() > EVENT_DAILY_CHANCE) return;
  const weighted = Object.keys(EVENT_DEFS).map(k => ({ k, w: Math.max(0, EVENT_DEFS[k].weight(team)) })).filter(x => x.w > 0);
  if (!weighted.length) return;
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total, key = weighted[0].k;
  for (const x of weighted) { r -= x.w; if (r <= 0) { key = x.k; break; } }
  fireEvent(key, {}, false);
}

function resolveEvent(optKey) {
  const ev = S.activeEvent;
  if (!ev) return;
  const def = EVENT_DEFS[ev.key];
  const team = S.teams[S.userTeamId];
  let result = "";
  if (def && team && (ev.options || []).some(o => o.key === optKey)) {
    try { result = def.apply(team, optKey, ev.ctx || {}) || ""; } catch (e) { result = ""; }
    // v38②：選擇留痕——若此選項會種下後果，排入連鎖佇列（N天後引爆）
    if (typeof def.chain === "function") {
      try {
        const nxt = def.chain(team, optKey, ev.ctx || {});
        if (nxt && nxt.key) scheduleEventChain(nxt.key, nxt.afterDays, nxt.ctx);
      } catch (e) { /* 連鎖排程失敗不得影響事件本身結算 */ }
    }
  }
  if (!S.eventLog) S.eventLog = [];
  S.eventLog.unshift({ year: ev.year, title: ev.title, choice: optKey, result, chained: !!ev.chained });
  if (S.eventLog.length > 10) S.eventLog.pop();
  if (result && typeof pushNews === "function") pushNews("事件", result);
  UI.flash = result || "事件已處理。";
  S.activeEvent = null;
  persist();
}

function simulateDay(S) {
  // v25：舊制「季中國際賽徵召缺陣」已廢除（國際賽改季末制），不再有任何季中離隊倒數
  tickInjuries(S.players); // ⑤傷勢每日恢復（v26：待治療方針決策者凍結、重傷痊癒有降評判定）
  driftConditions();       // v25狀況每日漂移（v26：宿舍偏正向）
  recoverFatigueDaily();   // v25投手疲勞每日恢復（v26：宿舍加成、特訓-20%）
  if (typeof tickMidTraining === "function") tickMidTraining(); // v26季中特訓每日累積
  if (typeof v47TickScoutMissions === "function") v47TickScoutMissions(); // v47 Z1：球探市場委託到期回報
  // v40⑤：教練排線——玩家隊 lineupMode==="coach"（預設）時，每天開打前由教練依戰術方針/輪休策略重排打線並指派板凳專員
  {
    const __ut = S.teams && S.teams[S.userTeamId];
    if (__ut && typeof coachDailyLineup === "function") {
      ensureTactics(__ut);
      if (__ut.lineupMode === "coach") { coachDailyLineup(__ut); coachAssignBenchRoles(__ut); }
      // v43①：純GM 未接管時，投手輪值/牛棚也由教練每日重排（投打守全交給教練）
      if (S.gameMode === "pure_gm" && !S.takeover && typeof coachDailyRotation === "function") coachDailyRotation(__ut);
    }
  }
  const day = S.schedule[S.currentDay];
  if (!day) return null;
  const results = [];
  const newInjuries = [];
  __benchCredits = []; // v37⑥ 每日重置代打/代跑/代守出賽暫存
  day.forEach(g => {
    const home = S.teams[g.home], away = S.teams[g.away];
    const { homeScore, awayScore } = simulateGame(home, away, S.players);
    if (homeScore > awayScore) { home.wins++; away.losses++; } else { away.wins++; home.losses++; }
    // v30：逐場主場帳（門票收入/進場人次累計）＋客場分潤＋主客戰績
    if (typeof applyGateEconomy === "function") applyGateEconomy(home, away, homeScore > awayScore);
    attributeGameStats(home, S.players, homeScore, awayScore, homeScore > awayScore);
    attributeGameStats(away, S.players, awayScore, homeScore, awayScore > homeScore);
    rollTeamInjuries(home, S.players, newInjuries);
    rollTeamInjuries(away, S.players, newInjuries);
    results.push({ home: g.home, away: g.away, homeScore, awayScore });
  });
  creditBenchRoleAppearances(); // v37⑥ 代打/代跑/代守出賽入帳
  S.currentDay++;
  S.resultsLog.push({ dayIndex: S.currentDay, results });
  if (S.resultsLog.length > 20) S.resultsLog.shift();
  // ⑤傷兵通報：自家球員受傷時提示（模擬多天時以最後一次通報為準，完整名單見主控台傷兵卡）
  const mine = newInjuries.filter(x => x.teamId === S.userTeamId).map(x => S.players[x.playerId]).filter(Boolean);
  if (mine.length > 0) {
    UI.flash = `傷兵通報：${mine.map(p => `${p.name}（${p.injury.name}・${p.injury.severityLabel}，約${p.injury.daysLeft}天）`).join("、")}`;
    // v34：受傷球員若在先發陣容內（打線棒次／先發輪值／牛棚配置），中斷連續模擬讓玩家處置
    const ut = S.teams[S.userTeamId];
    if (ut && typeof pushSimInterrupt === "function") {
      const lineupIds = new Set((ut.lineup || []).map(sl => sl.playerId));
      const rotIds = new Set(ut.rotation || []);
      const penIds = new Set(Object.values(ut.bullpenOrder || {}).reduce((a, arr) => a.concat(arr || []), []));
      mine.forEach(p => {
        if (lineupIds.has(p.id) || rotIds.has(p.id) || penIds.has(p.id)) {
          pushSimInterrupt(`先發陣容傷兵：${p.name}（${p.injury.name}・${p.injury.severityLabel}）`);
        }
      });
    }
  }
  // v40④：玩家隊守位檢查改用「硬缺口」——只有真的湊不出合法陣容才停下；
  // 「勉強補位」等軟缺口不再中斷（改於先發打線頁顯示警告）。v37⑧的 lineupPositionGaps 保留供打線頁使用。
  {
    /* v41④ 守位缺口三層防線：軟缺口→打線頁警告（現況不動）；硬缺口→不再中斷，改為
       需求單（high/30天）＋客串頂替（守備懲罰×0.6）＋敘事，比賽照打；
       只有「數學無解」（健康野手<9，連9人打線都湊不出）才保留中斷路徑。
       真實GM遇到沒捕手不會停賽——教練讓人客串，然後打電話給GM罵人。 */
    const utg = S.teams[S.userTeamId];
    if (utg && typeof lineupHardGaps === "function") {
      const __pool41 = utg.roster1.map(id => S.players[id]).filter(p => p && !p.isPitcher && !isInjured(p) && !(p.internationalDutyGamesLeft > 0));
      if (__pool41.length < 9 && typeof pushSimInterrupt === "function") {
        pushSimInterrupt(`${icon('warn')} 健康野手僅${__pool41.length}名，連9人打線都湊不出來（數學無解）——請至球員名單補人`);
      } else if (typeof handleHardGapsV41 === "function") {
        handleHardGapsV41(utg);
      }
    }
  }
  updateNewsAfterDay(results, newInjuries); // v25新聞跑馬燈
  if (typeof tickAiTrades === "function") tickAiTrades();       // v32：AI互相交易撮合/風聲倒數/AI主動提案
  if (typeof tickKpiMidSeason === "function") tickKpiMidSeason(); // v32：KPI季中檢視與止血目標追蹤
  if (typeof tickEvents === "function") tickEvents();            // v36第10階段：事件系統逐日加權觸發
  if (typeof tickV41Daily === "function") tickV41Daily(results); // v41：分權/接管/需求單/球迷耐心 每日心跳
  if (typeof tickV42Daily === "function") try { tickV42Daily(); } catch (e) {} // v42：辭呈/背信/拉人提示 每日心跳
  if (typeof tickV43Daily === "function") try { tickV43Daily(results); } catch (e) {} // v43：掛牌報價/純GM傷兵遞補提案 每日心跳
  if (typeof v48TickMilestones === "function") try { v48TickMilestones(); } catch (e) {} // v48：里程碑事件卡（暫停模擬）
  return results;
}

/* ---------- v25 新聞跑馬燈事件蒐集：連勝連敗／重傷／里程碑 ---------- */
const MILESTONES = [
  { stat: "HR", marks: [100, 200, 300, 400, 500], label: v => `生涯第${v}轟` },
  { stat: "H", marks: [1000, 1500, 2000, 2500], label: v => `生涯第${v}安` },
  { stat: "W", marks: [50, 100, 150, 200], label: v => `生涯第${v}勝` },
  { stat: "SO", marks: [1000, 1500, 2000], label: v => `生涯第${v}次三振` },
  { stat: "SV", marks: [100, 200, 300], label: v => `生涯第${v}次救援成功` }
];
function updateNewsAfterDay(results, newInjuries) {
  if (typeof pushNews !== "function") return;
  const team = S.teams[S.userTeamId];
  if (!team) return;
  const myGame = results.find(r => r.home === team.id || r.away === team.id);
  // 連勝連敗追蹤（僅玩家隊）
  if (myGame) {
    const won = (myGame.home === team.id) ? myGame.homeScore > myGame.awayScore : myGame.awayScore > myGame.homeScore;
    if (won) team.streak = (team.streak || 0) > 0 ? team.streak + 1 : 1;
    else team.streak = (team.streak || 0) < 0 ? team.streak - 1 : -1;
    if (team.streak >= 4 && team.streak % 3 === 1 && team.streak > 4) pushNews("戰報", `勢不可擋！${team.name}豪取${team.streak}連勝，全城陷入瘋狂！`);
    else if (team.streak === 4) pushNews("戰報", `${team.name}近況火燙，拉出一波4連勝！`);
    else if (team.streak === -4) pushNews("戰報", `${team.name}吞下4連敗，更衣室氣氛凝重。`);
    else if (team.streak <= -6 && team.streak % 2 === 0) pushNews("戰報", `${team.name}深陷${-team.streak}連敗泥淖，球迷開始鼓譟。`);
  }
  // 重傷新聞（中度以上）
  newInjuries.map(x => S.players[x.playerId]).filter(p => p && p.injury && p.injury.severity !== "light").forEach(p => {
    const t = S.teams[p.team];
    pushNews("傷兵", `${t ? t.name : ""} ${p.name} 因${p.injury.name}（${p.injury.severityLabel}）預計缺陣約${p.injury.daysLeft}天。`);
  });
  // 玩家隊里程碑
  team.roster1.map(id => S.players[id]).filter(Boolean).forEach(p => {
    p.milestonesDone = p.milestonesDone || {};
    MILESTONES.forEach(m => {
      const val = p.careerStats[m.stat] || 0;
      m.marks.forEach(mark => {
        const k = m.stat + mark;
        if (val >= mark && !p.milestonesDone[k]) {
          p.milestonesDone[k] = true;
          if (val <= mark + 5) pushNews("里程碑", `恭喜！${p.name} 達成${m.label(mark)}里程碑！`); // 只報「剛達成」的，舊存檔補標不重報
        }
      });
    });
  });
}


/* ====================================================================
   ██ v41 北極星第一梯次：GM／教練分權 ██
   依《職棒GM：百年帝國》北極星設計書 v1.2 與 v41 設計提案實作。
   ①開局身分模式＋不對稱切換 ②接管Takeover ③需求單核心迴圈
   ④守位缺口三層防線 ⑤教練哲學×6＋執行度公式 ⑥百年史冊log
   ⑦資產插槽登錄表 ⑧球迷耐心乘數（先埋）
   鐵則遵循：不刪既有程式碼——lineupMode／TACTICS／autoLineupBy／
   coachDailyLineup 內部邏輯一行不改，僅換輸入來源或上游決定者。
   ==================================================================== */

/* ---------- v41⑥ 百年史冊：append-only 敘事層（本版只寫入不顯示） ---------- */
function chronicle(type, text, meta) {
  if (!S) return;
  if (!Array.isArray(S.chronicle)) S.chronicle = [];
  S.chronicle.push({ y: S.seasonYear, d: S.currentDay || 0, t: type, x: text, m: meta || null });
  if (S.chronicle.length > 5000) S.chronicle.shift(); // 防呆封頂（15年正常量級為數百筆）
}

/* ---------- v41⑦ 資產插槽登錄表：視覺與邏輯解耦（本版只建空插槽＋emoji後備，不放任何資產） ---------- */
const ASSET_SLOTS = {
  "team.logo":          { fallback: "⚾", kind: "emoji" },
  "player.portrait":    { fallback: "🧢", kind: "emoji" },
  "coach.portrait":     { fallback: "👔", kind: "emoji" },
  "stadium.view":       { fallback: null, kind: "css" },
  "facility.icon":      { fallback: "🏋️", kind: "emoji" },
  "event.illustration": { fallback: null, kind: "none" },
  "ui.texture":         { fallback: null, kind: "css" },
  "badge.grade":        { fallback: null, kind: "css" },
  "fan.mood":           { fallback: "👥", kind: "emoji" }
};
// 單一取值口：有資產回資產、無資產回 fallback、查無此鍵回空字串。永不 throw（開機防護）。
function assetSlot(key, ctx) {
  try {
    const slot = ASSET_SLOTS[key];
    if (!slot) return "";
    if (S && S.assets && S.assets[key]) return S.assets[key]; // 未來資產包掛載點（v45+）
    return slot.fallback === null || slot.fallback === undefined ? "" : slot.fallback;
  } catch (_) { return ""; }
}

/* ---------- v41⑤ 教練哲學 ×6（Mars 拍板：需要更多變化性，由3種擴為6種） ----------
   aff＝該哲學對六種戰術方針的「認同度」0~1；offense/rest＝教練我行我素時的預設方針。 */
const COACH_ARCHETYPES = {
  SMALL_BALL:     { label: "小球流",     desc: "觸擊、盜壘與跑壘串聯，一分一分咬",     offense: "smallball", rest: "rotate",
                    aff: { smallball: 1.0, onbase: 0.8, balance: 0.6, hot: 0.5, defense: 0.45, slug: 0.15 } },
  POWER:          { label: "轟炸流",     desc: "長打轟出勝利，不屑觸擊",               offense: "slug",      rest: "none",
                    aff: { slug: 1.0, hot: 0.7, balance: 0.6, onbase: 0.5, defense: 0.3, smallball: 0.15 } },
  PITCHING_FIRST: { label: "投手王國流", desc: "守備與投手保護至上，先立於不敗",       offense: "defense",   rest: "veteran",
                    aff: { defense: 1.0, balance: 0.7, onbase: 0.6, smallball: 0.5, hot: 0.4, slug: 0.3 } },
  BALANCED:       { label: "均衡流",     desc: "中庸調和，什麼方針都能配合",           offense: "balance",   rest: "fatigue",
                    aff: { balance: 1.0, onbase: 0.8, defense: 0.75, slug: 0.7, smallball: 0.7, hot: 0.7 } },
  YOUTH_DEV:      { label: "養成流",     desc: "押注年輕人與手感，積極輪替養整隊",     offense: "youth",     rest: "rotate", // v42⑩：我行我素預設改為青年育成
                    aff: { youth: 1.0, hot: 0.9, balance: 0.7, onbase: 0.6, smallball: 0.55, slug: 0.5, defense: 0.5 } },
  VETERAN:        { label: "老將流",     desc: "信任經驗與老將，關鍵時刻不交給菜鳥",   offense: "balance",   rest: "veteran",
                    aff: { balance: 0.9, defense: 0.8, onbase: 0.75, slug: 0.6, smallball: 0.5, hot: 0.35, youth: 0.15 } } // v42⑩：老將流極度排斥青年育成
};
// 教練人格惰性補齊：archetype（僅總教練）／trust 信任（0~100）／coachability 受教性。舊檔載入或新聘任時補上。
function ensureCoachPersona(c) {
  if (!c) return c;
  if (c.role === "總教練" && !c.archetype) {
    const keys = Object.keys(COACH_ARCHETYPES);
    c.archetype = keys[randInt(0, keys.length - 1)];
  }
  if (typeof c.trust !== "number") c.trust = clamp(Math.round(45 + ((c.teaching || 55) - 55) * 0.4 + randInt(-8, 8)), 20, 85);
  if (typeof c.coachability !== "number") c.coachability = genRating(55, 15);
  return c;
}
function headCoachOf(team) {
  if (!team || !team.coachStaff || !team.coachStaff["1軍"]) return null;
  if (typeof coachVacant === "function" && coachVacant(team, "1軍", "總教練")) return null;
  const c = S.coaches[team.coachStaff["1軍"]["總教練"]];
  return c ? ensureCoachPersona(c) : null;
}
// 認同度：哲學與GM方針的距離 → 0~1（進攻方針佔75%、輪休策略佔25%）
function agreementOf(coach, tactics) {
  if (!coach || !coach.archetype || !COACH_ARCHETYPES[coach.archetype] || !tactics) return 1;
  const arc = COACH_ARCHETYPES[coach.archetype];
  const offAff = (arc.aff[tactics.offense] !== undefined) ? arc.aff[tactics.offense] : 0.5;
  const restAff = tactics.rest === arc.rest ? 1 : 0.6;
  return clamp(offAff * 0.75 + restAff * 0.25, 0, 1);
}
// 執行度公式：f(認同度, 教練能力, 信任) → 0.5~1.0
function executionOf(coach, tactics) {
  if (!coach) return 1;
  const ag = agreementOf(coach, tactics);
  return clamp(0.5 + ag * 0.25 + ((coach.teaching || 55) - 50) / 100 * 0.15 + (((typeof coach.trust === "number" ? coach.trust : 55) - 50) / 100) * 0.2, 0.5, 1.0);
}
/* effTactics：教練「實際執行」的方針（衍生值）。GM 下的方針＝team.tactics（欄位不改名、不刪）。
   類別型方針無法連續混合，v41 以確定性門檻折射（已知簡化 S3）：
   執行度≥0.78 → 完全照辦；0.62~0.78 → 進攻照辦、輪休改用哲學預設；<0.62 → 教練我行我素（進攻＋輪休都用哲學預設）。 */
function effTacticsOf(team) {
  if (!team) return { offense: "balance", rest: "none" };
  ensureTactics(team);
  const coach = headCoachOf(team);
  if (!coach || !coach.archetype) { team.effTactics = { offense: team.tactics.offense, rest: team.tactics.rest, execution: 1, agreement: 1 }; return team.effTactics; }
  const arc = COACH_ARCHETYPES[coach.archetype];
  const ag = agreementOf(coach, team.tactics);
  const exec = executionOf(coach, team.tactics);
  let offense = team.tactics.offense, rest = team.tactics.rest;
  if (exec < 0.62) { offense = arc.offense; rest = arc.rest; }
  else if (exec < 0.78) { rest = arc.rest; }
  team.effTactics = { offense, rest, execution: Math.round(exec * 100) / 100, agreement: Math.round(ag * 100) / 100 };
  return team.effTactics;
}
// GM 覆蓋消耗信任：方針與哲學距離過大 → 每日小額扣教練信任 → 長期 → 抱怨／求去（v41 只到新聞層，實際離隊 v42）
function tickCoachDynamics() {
  const team = S.teams[S.userTeamId];
  if (!team) return;
  const coach = headCoachOf(team);
  if (!coach) return;
  if (!S.v41y || S.v41y.year !== S.seasonYear) S.v41y = { year: S.seasonYear, grumbled: false, quitTalk: false };
  const ag = agreementOf(coach, team.tactics);
  if (ag < 0.4) coach.trust = clamp((coach.trust || 55) - 0.2, 0, 100); // 硬要教練做他不信的事，每天都在磨信任
  else if (coach.trust < 55) coach.trust = clamp(coach.trust + 0.05, 0, 100); // 順著哲學走，信任緩慢回溫
  if (coach.trust < 35 && !S.v41y.grumbled) { S.v41y.grumbled = true; pushNews("更衣室", (typeof v42Quote === "function" && v42Quote("grumble", { coach })) || `總教練${coach.name}私下向記者抱怨：「方針跟我的棒球哲學根本是兩回事。」`); } // v42⑫語錄多樣化
  if (coach.trust < 18 && !S.v41y.quitTalk) { S.v41y.quitTalk = true; pushNews("更衣室", (typeof v42Quote === "function" && v42Quote("quitTalk", { coach })) || `震盪！總教練${coach.name}被拍到與經紀人密會，傳出萌生去意（信任瀕臨破裂）。`); chronicle("coach", `總教練${coach.name}與GM關係降至冰點，傳出求去`); } // v42⑫語錄多樣化
}

/* ---------- v41① 開局身分模式＋不對稱切換 ----------
   S.gameMode（局層級、進存檔）＝ lineupMode 的上游決定者；lineupMode 保留為每日排線的執行層真值。 */
function canManualLineup() {
  if (!S) return true;
  if (S.gameMode === undefined) return true; // 舊檔尚未遷移前不擋（開機防護）
  return S.gameMode === "gm_coach" || !!S.takeover;
}
// 開局模式選擇（gameModePick 畫面按鈕呼叫）：選完回到休賽季摘要，流程與 v40 完全相同
function pickGameMode(mode) {
  ensureV41();
  S.gameMode = mode === "pure_gm" ? "pure_gm" : "gm_coach";
  const team = S.teams[S.userTeamId];
  if (team) {
    ensureTactics(team);
    if (S.gameMode === "pure_gm") team.lineupMode = "coach"; // 純GM：排線鐵定在教練手上
  }
  chronicle("mode", S.gameMode === "pure_gm" ? "以「純GM」身分接掌兵符：現場全權交給總教練" : "以「GM兼教練」身分接掌兵符：親自盯場");
  UI.screen = "offseasonSummary";
  persist();
  render();
}
// 放權（不對稱切換的正面方向）：免費、正面事件，GM兼教練 → 純GM
function delegateLineup() {
  if (!S || S.gameMode !== "gm_coach") return { ok: false, msg: "目前已是純GM模式。" };
  ensureV41();
  const team = S.teams[S.userTeamId];
  S.gameMode = "pure_gm";
  if (team) {
    ensureTactics(team);
    team.lineupMode = "coach";
    if (typeof coachDailyLineup === "function") { coachDailyLineup(team); coachAssignBenchRoles(team); }
    const coach = headCoachOf(team);
    if (coach) coach.trust = clamp((coach.trust || 55) + 10, 0, 100);
  }
  if (!S.gmTags.includes("delegates")) S.gmTags.push("delegates"); // 聲望標籤：放得下權的GM（好教練欣賞，市場影響 v42 接）
  pushNews("球團", `GM ${S.gmName} 宣布全面授權總教練掌兵：「專業的事交給專業的人。」教練團士氣大振。`);
  chronicle("mode", "GM 全面放權，轉為純GM模式（正面事件：教練信任+10）");
  persist();
  return { ok: true, msg: "已全面放權：本局轉為純GM模式。想拿回兵符只能走「接管」（有代價）。" };
}

/* ---------- v41② 接管 Takeover：收權的帳單 ---------- */
function startTakeover(reason) {
  if (!S || S.gameMode !== "pure_gm" || S.takeover) return { ok: false, msg: "目前無法接管。" };
  ensureV41();
  const team = S.teams[S.userTeamId];
  S.takeover = { seasonYear: S.seasonYear, startedDay: S.currentDay || 0, renewals: 0, reason: reason || "GM對現場調度失去耐心", expired: false };
  const coach = headCoachOf(team);
  if (coach) {
    coach.trust = clamp((coach.trust || 55) - 30, 0, 100); // 帳單一：教練信任暴跌
    pushNews("震撼", `GM ${S.gmName} 宣布接管兵符，總教練${coach.name}遭架空！媒體開炮：「這是不信任投票。」`);
    if (coach.trust < 25) pushNews("更衣室", `${coach.name}臉色鐵青離開球場，傳出已請經紀人探詢他隊職缺。`);
  } else {
    pushNews("震撼", `GM ${S.gmName} 宣布親自接管兵符，兼任現場指揮。`);
  }
  if (!S.gmTags.includes("hands_on")) S.gmTags.push("hands_on"); // 帳單二：聲望標籤（未來好教練不來；市場實際影響 v42 接）
  if (team) team.lineupMode = "manual";
  chronicle("takeover", `GM接管兵符（理由：${S.takeover.reason}）——教練信任重挫、貼上hands_on標籤`, { renewals: 0 });
  persist();
  return { ok: true, msg: "已接管兵符：本季剩餘賽事由你手排。教練信任重挫，聯盟已記住你是個「愛管現場的GM」。" };
}
// 每日檢查：跨季 → 到期，發出「續期或還權」的決策（待辦卡）。決策前接管仍暫時有效（寬限）。
function tickTakeover() {
  if (!S || !S.takeover) return;
  if (S.takeover.seasonYear < S.seasonYear && !S.takeover.expired) {
    S.takeover.expired = true;
    if (typeof pushSimInterrupt === "function") pushSimInterrupt(""+icon('hourglass')+" 接管授權已跨季到期：請至待辦決定「續期」或「還權」");
  }
}
function renewTakeover() {
  if (!S || !S.takeover) return { ok: false, msg: "目前沒有接管狀態。" };
  const team = S.teams[S.userTeamId];
  S.takeover.renewals++;
  S.takeover.seasonYear = S.seasonYear;
  S.takeover.expired = false;
  const coach = headCoachOf(team);
  if (coach) coach.trust = clamp((coach.trust || 55) - 15, 0, 100);
  if (S.gmCareer) S.gmCareer.trust = clamp((S.gmCareer.trust || 50) - 3, 0, 100); // 再付一次聲望：高層觀感-3
  pushNews("球團", `GM ${S.gmName} 宣布續掌兵符（第${S.takeover.renewals + 1}季）。名嘴：「那總教練是請來喝茶的嗎？」`);
  chronicle("takeover", `接管續期（第${S.takeover.renewals}次）——教練信任再挫、高層觀感-3`, { renewals: S.takeover.renewals });
  persist();
  return { ok: true, msg: "接管已續期一季：教練信任再挫，高層對你的越權也開始有意見（-3）。" };
}
function endTakeover() {
  if (!S || !S.takeover) return { ok: false, msg: "目前沒有接管狀態。" };
  const team = S.teams[S.userTeamId];
  const renewals = S.takeover.renewals;
  S.takeover = null;
  const coach = headCoachOf(team);
  if (coach) coach.trust = clamp((coach.trust || 55) + 15, 0, 100); // 信任部分回復；hands_on 標籤留著（記憶不清零）
  if (team) {
    ensureTactics(team);
    team.lineupMode = "coach";
    if (typeof coachDailyLineup === "function") { coachDailyLineup(team); coachAssignBenchRoles(team); }
  }
  pushNews("球團", `GM ${S.gmName} 交還兵符，總教練重新掌軍。雙方握手言和，但更衣室都記得發生過什麼。`);
  chronicle("takeover", `GM還權：教練信任部分回復（+15），hands_on標籤留存`, { renewals });
  persist();
  return { ok: true, msg: "已還權給教練：信任部分回復（+15）。標籤不會消失——聯盟記得你接管過。" };
}

/* ---------- v41③ 需求單核心迴圈：遊戲推動玩家 ---------- */
// 掃描隊伍缺口：守位硬缺（無本職者）、輪值深度、牛棚深度、打線火力
function scanTeamGaps(team) {
  if (!team) return [];
  const gaps = [];
  const pool = team.roster1.map(id => S.players[id]).filter(p => p && !p.isPitcher && !isInjured(p) && !(p.internationalDutyGamesLeft > 0));
  LINEUP_FIELD_POSITIONS.forEach(pos => {
    if (!pool.some(p => p.positions.some(x => x.pos === pos))) gaps.push({ kind: "pos", pos, hard: true, metric: `一軍無健康的本職${POS_LABEL[pos] || pos}` });
  });
  const rot = (typeof autoRotation === "function") ? autoRotation(team, S.players) : [];
  if (rot.length < 4) gaps.push({ kind: "rot", metric: `健康先發投手僅${rot.length}名（輪值撐不起一季）` });
  const pen = team.roster1.map(id => S.players[id]).filter(p => p && p.isPitcher && p.role !== "先發" && !isInjured(p));
  if (pen.length < 3) gaps.push({ kind: "pen", metric: `健康後援投手僅${pen.length}名（牛棚見底）` });
  const bats = (team.lineup || []).map(s => S.players[s.playerId]).filter(p => p && !p.isPitcher);
  if (bats.length >= 8) {
    const avgPow = bats.reduce((s, p) => s + battingPower(p), 0) / bats.length;
    if (avgPow < 52) gaps.push({ kind: "bat", metric: `先發打線平均火力僅${Math.round(avgPow)}（聯盟後段班）` });
  }
  return gaps;
}
// 依教練專長 × 性格 × 缺口產生需求單。爛教練（teaching<45）→ 爛需求：門檻誇大、輕重不分。
function genDemand(coach, gap, team) {
  if (!S.demands) S.demands = [];
  ensureCoachPersona(coach);
  const bad = (coach.teaching || 55) < 45;
  const arc = coach.archetype ? COACH_ARCHETYPES[coach.archetype] : null;
  let need = null, title = "", priority = gap.hard ? "high" : (gap.kind === "bat" ? "low" : "mid"), reason = gap.metric;
  if (gap.kind === "pos") {
    need = { pos: gap.pos, attrs: { fielding: bad ? 72 : 58 } };
    title = `補一名能守${POS_LABEL[gap.pos] || gap.pos}的野手`;
    reason = `${gap.metric}——每天靠人客串不是辦法，守備正在漏水。`;
  } else if (gap.kind === "rot") {
    need = { pos: "SP", attrs: { control: bad ? 78 : 62, stamina: bad ? 75 : 60 } };
    title = "補一名可靠的先發投手";
    reason = `${gap.metric}——再不補人，季中就得讓牛棚硬扛先發。`;
  } else if (gap.kind === "pen") {
    need = { pos: "RP", attrs: { control: bad ? 75 : 58 } };
    title = "補強牛棚深度";
    reason = `${gap.metric}——七局以後我沒有人可以叫。`;
  } else { // bat：依總教練哲學開口味
    if (arc && coach.archetype === "SMALL_BALL") { need = { pos: null, attrs: { speed: bad ? 82 : 68, contact: bad ? 78 : 62 } }; title = "要一名能跑能碰的串聯型打者"; }
    else if (arc && coach.archetype === "POWER") { need = { pos: null, attrs: { power: bad ? 85 : 68 } }; title = "要一支能改變比賽的大棒子"; }
    else if (arc && coach.archetype === "PITCHING_FIRST") { need = { pos: null, attrs: { fielding: bad ? 82 : 66 } }; title = "要一名守備至上的野手"; }
    else if (arc && coach.archetype === "VETERAN") { need = { pos: null, attrs: { contact: bad ? 80 : 64, eye: bad ? 75 : 58 } }; title = "要一名穩定輸出的成熟打者"; }
    else if (arc && coach.archetype === "YOUTH_DEV") { need = { pos: null, attrs: { contact: bad ? 76 : 55, speed: bad ? 76 : 55 } }; title = "給我一個值得培養的年輕野手"; }
    else { need = { pos: null, attrs: { contact: bad ? 78 : 60, power: bad ? 76 : 58 } }; title = "補強打線整體火力"; }
    reason = `${gap.metric}——${arc ? `身為${arc.label}，` : ""}我要的補強方向很明確。`;
  }
  if (bad) priority = "high"; // 爛教練：什麼都十萬火急
  let days = priority === "high" ? 30 : (priority === "mid" ? 45 : 60);
  // v46 重建漸進寬限：年資淺→期限加長（少壓力）、措辭轉「重建方向」
  const pr = (typeof v46DemandPressure === "function") ? v46DemandPressure() : 1.0;
  const rebuild = pr < 1.0;
  if (rebuild) {
    days = Math.round(days * (1 + (1 - pr) * 0.9)); // 第1年約 1.7～1.8 倍期限
    reason = "【重建方向】" + reason + `（重建期第${(typeof v46FranchiseYear === "function") ? v46FranchiseYear() : "?"}年：教練體諒陣容尚在成形，先給方向、不逼交易；可從陣中拔擢或選秀補強）`;
  }
  const seasonLen = S.schedule ? S.schedule.length : 129;
  const d = {
    id: "D" + (S.demandSeq = (S.demandSeq || 1)) + "_" + S.seasonYear, coachId: coach.id, role: coach.role,
    priority, need, title, reason,
    deadline: Math.min((S.currentDay || 0) + days, seasonLen),
    status: "open", negotiated: false, year: S.seasonYear,
    rebuild: rebuild,
    snapshot: team.roster1.slice()
  };
  S.demandSeq++;
  S.demands.push(d);
  pushNews("教練團", `${coach.name}（${coach.role}）${rebuild ? "提出重建方向建議" : "向GM遞出補強需求"}：「${title}」（優先度：${priority === "high" ? "高" : priority === "mid" ? "中" : "低"}）`);
  return d;
}
// 四鍵回應：接受／駁回／協商（受教性×GM聲望）／體諒說明（v44：說辭需與真實狀態相符才免罰）
function resolveDemand(id, action, reasonKey) {
  const d = (S.demands || []).find(x => x.id === id);
  if (!d || d.status !== "open") return { ok: false, msg: "此需求單已不在待回應狀態。" };
  const coach = S.coaches[d.coachId];
  if (action === "accept") {
    d.status = "accepted";
    persist();
    return { ok: true, msg: `已接受「${d.title}」：列入補強追蹤，達成時教練信任回升。` };
  }
  if (action === "reject") {
    d.status = "rejected";
    if (coach) { ensureCoachPersona(coach); coach.trust = clamp(coach.trust - 5, 0, 100); }
    S.demandRejects = (S.demandRejects || 0) + 1;
    if (S.demandRejects >= 3) {
      pushNews("更衣室", "教練團的補強需求接連被打回票，開始有人在媒體放話：「上面根本沒在聽。」");
      chronicle("demand", "需求單連續遭駁回，教練團公開表達不滿");
      if (coach) coach.trust = clamp(coach.trust - 5, 0, 100);
      S.demandRejects = 0;
    }
    persist();
    return { ok: true, msg: `已駁回「${d.title}」（教練信任-5）。累積駁回會釀成更衣室不滿。` };
  }
  if (action === "negotiate") {
    if (d.negotiated) return { ok: false, msg: "此需求已協商過一次。" };
    d.negotiated = true;
    const rep = (typeof careerReputation === "function") ? careerReputation() : 50;
    const co = coach ? ensureCoachPersona(coach).coachability : 55;
    const chance = clamp((co / 100) * 0.6 + rep / 250, 0.15, 0.9);
    if (Math.random() < chance) {
      Object.keys(d.need.attrs || {}).forEach(k => { d.need.attrs[k] = Math.max(40, d.need.attrs[k] - 10); });
      d.priority = d.priority === "high" ? "mid" : "low";
      d.deadline = Math.min(d.deadline + 15, S.schedule ? S.schedule.length : 129);
      persist();
      return { ok: true, msg: `協商成功：「${d.title}」門檻下修10、期限放寬15天。教練同意務實一點。` };
    }
    if (coach) coach.trust = clamp(coach.trust - 2, 0, 100);
    persist();
    return { ok: true, msg: `協商破裂：教練不肯讓步（信任-2）。需求維持原條件。` };
  }
  // v44：體諒說明——向教練說明現況（重建期／沒有經費／市場沒合適人選）。
  //      說辭經教練查證屬實 → 體諒撤下需求（不罰）；與帳本/戰績/市場不符 → 被識破（信任-6，需求維持）。
  if (action === "understand") {
    const team = S.teams[S.userTeamId];
    if (!team) return { ok: false, msg: "找不到球隊資料。" };
    const rk = (reasonKey === "nobudget" || reasonKey === "noplayer") ? reasonKey : "rebuild";
    const rkLabel = rk === "rebuild" ? "重建期" : rk === "nobudget" ? "沒有經費" : "市場沒有合適人選";
    const cred = demandExcuseCredible(team, d, rk);
    if (coach) {
      ensureCoachPersona(coach);
      if (coach.excuseYear !== S.seasonYear) { coach.excuseYear = S.seasonYear; coach.excuseCount = 0; }
    }
    if (cred.credible) {
      const repeat = coach ? (coach.excuseCount || 0) : 0;
      const trustDelta = repeat >= 1 ? V44_EXCUSE_FATIGUE_TRUST : 0;
      const lineKey = repeat >= 1 ? "fatigue" : (rk === "rebuild" ? "rebuildOK" : rk === "nobudget" ? "nobudgetOK" : "noplayerOK");
      if (coach) { coach.trust = clamp((coach.trust || 55) + trustDelta, 0, 100); coach.excuseCount = (coach.excuseCount || 0) + 1; }
      d.status = "excused";
      d.excused = { reasonKey: rk, credible: true, day: S.currentDay || 0, year: S.seasonYear };
      const line = v44ExcuseLine(lineKey);
      pushNews("教練團", `你向 ${coach ? coach.name : "教練"} 說明「${rkLabel}」——「${line}」${trustDelta < 0 ? `（本季重複說明，信任${trustDelta}）` : "（體諒，信任不變）"}`);
      chronicle("demand", `以「${rkLabel}」向教練說明「${d.title}」——教練${trustDelta < 0 ? "體諒但耐心磨損" : "表示體諒"}`);
      if (typeof v43PushMail === "function") v43PushMail("coach", "教練體諒了你的說明", `關於「${d.title}」：「${line}」`, { kind: "excused" });
      persist();
      return { ok: true, msg: `已向教練說明「${rkLabel}」，教練查證屬實、表示體諒。需求已撤下${trustDelta < 0 ? `（本季重複說明，信任${trustDelta}）` : "（信任不變）"}。` };
    }
    if (coach) coach.trust = clamp((coach.trust || 55) + V44_EXCUSE_FALSE_TRUST, 0, 100);
    d.falseExcuseTries = (d.falseExcuseTries || 0) + 1;
    const fKey = rk === "rebuild" ? "falseRebuild" : rk === "nobudget" ? "falseBudget" : "falseNoplayer";
    const fline = v44ExcuseLine(fKey);
    pushNews("教練團", `${coach ? coach.name : "教練"}不接受「${rkLabel}」的說法：「${fline}」（信任${V44_EXCUSE_FALSE_TRUST}）`);
    chronicle("demand", `以「${rkLabel}」搪塞「${d.title}」被教練識破——信任${V44_EXCUSE_FALSE_TRUST}`);
    if (typeof v43PushMail === "function") v43PushMail("coach", "教練不接受你的說辭", `關於「${d.title}」：「${fline}」`, { kind: "excuseRejected" });
    persist();
    return { ok: true, msg: `教練查證後不接受「${rkLabel}」的說法（信任${V44_EXCUSE_FALSE_TRUST}）：說辭與帳本／戰績／市場不符，需求仍在待回應。` };
  }
  return { ok: false, msg: "未知的回應。" };
}
// 名單是否已滿足需求：出現「快照之外」的健康新戰力且達標
function demandMatches(team, d) {
  if (!team || !d || !d.need) return false;
  return team.roster1.some(id => {
    if (d.snapshot && d.snapshot.includes(id)) return false;
    const p = S.players[id];
    if (!p || isInjured(p)) return false;
    if (d.need.pos === "SP") { if (!p.isPitcher || p.role !== "先發") return false; }
    else if (d.need.pos === "RP") { if (!p.isPitcher || p.role === "先發") return false; }
    else if (d.need.pos) { if (p.isPitcher || !p.positions.some(x => x.pos === d.need.pos)) return false; }
    else if (p.isPitcher) return false;
    const attrs = d.need.attrs || {};
    return Object.keys(attrs).every(k => (p[k] || 0) >= attrs[k]);
  });
}
function checkDemandFulfilled() {
  const team = S.teams[S.userTeamId];
  if (!team || !Array.isArray(S.demands)) return;
  S.demands.forEach(d => {
    if (d.status !== "open" && d.status !== "accepted") return;
    if (demandMatches(team, d)) {
      d.status = "fulfilled";
      const coach = S.coaches[d.coachId];
      if (coach) { ensureCoachPersona(coach); coach.trust = clamp(coach.trust + 8, 0, 100); }
      pushNews("教練團", `補強到位！${coach ? coach.name : "教練"}對「${d.title}」的成果點頭：「這才叫做支援現場。」（信任+8）`);
      chronicle("demand", `達成教練需求「${d.title}」——教練信任+8`);
    } else if ((S.currentDay || 0) > d.deadline) {
      const wasOpen = d.status === "open";
      d.status = "expired";
      const coach = S.coaches[d.coachId];
      if (wasOpen) {
        S.demandIgnored = (S.demandIgnored || 0) + 1;
        // v46：重建寬限期內過期懲罰減輕（漸進，年資越淺扣越少）
        const pr = (typeof v46DemandPressure === "function") ? v46DemandPressure() : 1.0;
        const scale = (v => Math.max(1, Math.round(v)));
        // v45 #5：若 GM 曾為此需求張貼求購（去市場找過人），教練看見努力→過期減罰（-8→-3）
        if (d.wantPosted) {
          const pen = scale(3 * (0.4 + 0.6 * pr));
          if (coach) { ensureCoachPersona(coach); coach.trust = clamp(coach.trust - pen, 0, 100); }
          pushNews("教練團", `「${d.title}」最終沒能補到人，但${coach ? coach.name : "教練"}知道你到市場找過了：「行情就是這樣，我明白。」（信任-${pen}）`);
        } else {
          const pen = scale(8 * (0.4 + 0.6 * pr));
          if (coach) { ensureCoachPersona(coach); coach.trust = clamp(coach.trust - pen, 0, 100); }
          pushNews("教練團", `「${d.title}」的需求${d.rebuild ? "在重建期未能落實" : "石沉大海直到過期"}，${coach ? coach.name : "教練"}${d.rebuild ? "表示理解，但仍記在心上" : "不再多說什麼"}。（信任-${pen}）`);
        }
      }
    }
  });
}
// 需求引擎每日心跳：開季、交易截止前15天、重大傷病、（硬缺口另由 handleHardGapsV41 觸發）
function tickDemandEngine() {
  const team = S.teams[S.userTeamId];
  if (!team) return;
  if (!Array.isArray(S.demands)) S.demands = [];
  if (!S.demandMeta || S.demandMeta.year !== S.seasonYear) S.demandMeta = { year: S.seasonYear, seasonGen: false, deadlineGen: false };
  const openCount = S.demands.filter(d => d.status === "open").length;
  const day = S.currentDay || 0;
  const hc = headCoachOf(team);
  const pc = (team.coachStaff && team.coachStaff["1軍"]) ? S.coaches[team.coachStaff["1軍"]["投手教練"]] : null;
  const coachFor = gap => (gap.kind === "rot" || gap.kind === "pen") ? (pc || hc) : hc;
  // 觸發①：開季（春訓後第2天）——總教練的開季診斷
  if (!S.demandMeta.seasonGen && day >= 2 && openCount < v46DemandCap()) {
    S.demandMeta.seasonGen = true;
    const gaps = scanTeamGaps(team).filter(g => !g.hard); // 硬缺口交給④的專用通道
    if (gaps.length > 0) { const c = coachFor(gaps[0]); if (c) genDemand(c, gaps[0], team); }
  }
  // 觸發②：交易截止日前15天——最後補強窗
  const ddl = (typeof tradeDeadlineDay === "function") ? tradeDeadlineDay() : 999;
  if (!S.demandMeta.deadlineGen && day >= ddl - 15 && day < ddl && openCount < v46DemandCap()) {
    S.demandMeta.deadlineGen = true;
    const gaps = scanTeamGaps(team);
    if (gaps.length > 0) { const c = coachFor(gaps[0]); if (c) genDemand(c, gaps[0], team); }
  }
  // 觸發③：重大傷病（一軍球員30天以上傷勢）
  team.roster1.forEach(id => {
    const p = S.players[id];
    if (!p || !p.injury || p.injury.demandRaised) return;
    if ((p.injury.totalDays || 0) >= 30 && S.demands.filter(d => d.status === "open").length < v46DemandCap()) {
      p.injury.demandRaised = true;
      const gap = p.isPitcher
        ? { kind: p.role === "先發" ? "rot" : "pen", metric: `${p.name}重傷離場約${p.injury.totalDays}天，戰力出現大洞` }
        : { kind: "pos", pos: p.positions[0].pos, hard: false, metric: `${p.name}重傷離場約${p.injury.totalDays}天，${POS_LABEL[p.positions[0].pos] || ""}出現大洞` };
      const c = coachFor(gap);
      if (c) { const d = genDemand(c, gap, team); d.priority = "high"; d.deadline = Math.min(day + 30, S.schedule ? S.schedule.length : 129); }
    }
  });
  checkDemandFulfilled();
}

/* ---------- v41④ 守位缺口三層防線（硬缺口：需求單＋客串＋敘事，比賽照打） ---------- */
// 客串頂替：從健康野手中挑「最接近該守位」者，回傳人選與懲罰係數（Mars 拍板：×0.6，smoke 校準）
const IMPROVISE_PENALTY = 0.6;
function improviseFielder(team, pos) {
  const pool = team.roster1.map(id => S.players[id]).filter(p => p && !p.isPitcher && !isInjured(p) && !(p.internationalDutyGamesLeft > 0));
  const best = pool.slice().sort((a, b) => effectivePositionFielding(b, pos) - effectivePositionFielding(a, pos))[0] || null;
  return { player: best, penalty: IMPROVISE_PENALTY };
}
// 守備懲罰口：無本職捕手客串蹲捕 → 該格守備貢獻×0.6（teamDefenseRating 讀取；其他守位由既有移防家族懲罰處理）
function improvisePenaltyFor(p, pos) {
  if (pos === "C" && p && !p.positions.some(x => x.pos === "C")) return IMPROVISE_PENALTY;
  return 1;
}
// 硬缺口每日處理：發需求單（high、30天）＋客串敘事＋看得到的代價（紅線一），不中斷
function handleHardGapsV41(team) {
  const gaps = lineupHardGaps(team);
  if (gaps.length === 0) return;
  const hc = headCoachOf(team);
  const pool = team.roster1.map(id => S.players[id]).filter(p => p && !p.isPitcher && !isInjured(p));
  LINEUP_FIELD_POSITIONS.forEach(pos => {
    const hasNatural = pool.some(p => p.positions.some(x => x.pos === pos));
    if (hasNatural) return;
    // 需求單：同守位不重複開單；v46 重建期並受同時掛單上限節流（避免第一年硬缺口一次爆多張）
    const already = (S.demands || []).some(d => (d.status === "open" || d.status === "accepted") && d.need && d.need.pos === pos);
    const cap = (typeof v46DemandCap === "function") ? v46DemandCap() : 3;
    const openNow = (S.demands || []).filter(d => d.status === "open").length;
    if (!already && hc && openNow < cap) {
      const d = genDemand(hc, { kind: "pos", pos, hard: true, metric: `一軍無健康的本職${POS_LABEL[pos] || pos}，只能靠人客串` }, team);
      d.priority = "high";
      // 重建期沿用 genDemand 已加長的期限；非重建期維持 30 天硬期限
      if (!d.rebuild) d.deadline = Math.min((S.currentDay || 0) + 30, S.schedule ? S.schedule.length : 129);
    }
    // 客串敘事：偶爾把守備代價打在新聞上（紅線一：玩家看得到代價）
    if (Math.random() < 0.22) {
      const imp = improviseFielder(team, pos);
      if (imp.player) pushNews("戰報", pos === "C"
        ? `${imp.player.name}客串蹲捕出現捕逸，失分的帳最終記在沒補人的名單上。`
        : `${imp.player.name}客串${POS_LABEL[pos] || pos}發生失誤，守備缺口的代價浮上檯面。`);
    }
  });
}

/* ---------- v41⑧ 球迷耐心（先埋：單一數字，唯一出口＝老闆耐心乘數） ---------- */
// 期待值門檻：由本季KPI難度推得（diff 1~3 → 0.50~0.58）
function fanExpectationBar() {
  const goals = (S.seasonKPI && S.seasonKPI.goals) || [];
  const perf = goals.find(g => typeof g.diff === "number" && !g.bonus);
  return 0.46 + 0.04 * (perf ? clamp(perf.diff, 1, 3) : 1);
}
function tickFanPatience(results) {
  const team = S.teams[S.userTeamId];
  if (!team) return;
  if (typeof S.fanPatience !== "number") S.fanPatience = 60;
  let d = 0;
  const my = results && results.find(r => r.home === team.id || r.away === team.id);
  if (my) {
    const won = (my.home === team.id) ? my.homeScore > my.awayScore : my.awayScore > my.homeScore;
    const exp = fanExpectationBar();
    d += won ? (1 - exp) * 0.9 : -exp * 1.0; // 贏球回血比輸球扣血慢：期待越高越難伺候
  }
  const tp = team.finance && team.finance.ticketPrice;
  if (typeof tp === "number" && tp > 600) d -= 0.05; // 高票價緩慢消磨耐心
  if (d !== 0) S.fanPatience = clamp(S.fanPatience + d, 0, 100);
}
// 唯一出口：老闆耐心乘數（季末考核負向扣分的放大／緩衝；三維度與其餘出口排 v44）
function fanPatienceOwnerMult() {
  const fp = (S && typeof S.fanPatience === "number") ? S.fanPatience : 60;
  if (fp <= 25) return 1.3;
  if (fp <= 40) return 1.15;
  if (fp >= 75) return 0.85;
  return 1;
}

/* ---------- v41 交易掛勾：明星異動→球迷耐心／重大交易→史冊 ---------- */
function v41OnTradeExecuted(teamAId, teamBId, aGivesIds, bGivesIds) {
  try {
    if (!S || !S.userTeamId) return;
    const userSide = teamAId === S.userTeamId ? aGivesIds : (teamBId === S.userTeamId ? bGivesIds : null);
    const otherSide = teamAId === S.userTeamId ? bGivesIds : (teamBId === S.userTeamId ? aGivesIds : null);
    if (!userSide) return;
    const stars = userSide.map(id => S.players[id]).filter(p => p && trueOverall(p) >= 80);
    stars.forEach(p => { S.fanPatience = clamp((typeof S.fanPatience === "number" ? S.fanPatience : 60) - 6, 0, 100); });
    if (stars.length > 0) pushNews("球迷", `看板球星${stars.map(p => p.name).join("、")}被交易，售票口前有球迷焚燒應援毛巾洩憤。`);
    // v45：認同看的是「球迷認得的門面」而非真實能力——送走高 fanAppeal 球員（傳統數據明星/在地英雄）重挫認同
    try {
      if (typeof ensureV45Fans === "function") ensureV45Fans();
      const faceLoss = userSide.map(id => S.players[id]).filter(Boolean)
        .reduce((s, p) => s + ((typeof playerFanAppeal === "function") ? playerFanAppeal(p) : 0), 0);
      if (faceLoss > 0 && typeof S.fanIdentify === "number") {
        // v55球迷演化：高素養球迷對「進階數據好的交易」容忍度較高（減傷10-30%）
        const litDamp = (typeof S.fanDataLiteracy === "number") ? clamp(1 - S.fanDataLiteracy / 300, 0.7, 1.0) : 1;
        S.fanIdentify = clamp(Math.round(S.fanIdentify - Math.min(18, faceLoss * 0.6 * litDamp)), 0, 100);
        const locals = userSide.map(id => S.players[id]).filter(p => p && !p.foreign && playerFanAppeal(p) >= 8);
        if (locals.length > 0) pushNews("球迷", `在地子弟兵${locals.map(p => p.name).join("、")}被送走，社群湧現「留不住自家人」的失望聲浪。`);
      }
      // v55球迷演化：交易記憶——送走門面球星，球迷記你三年（§6.7「你交易掉的門面球星會讓球迷記你三年」）
      try {
        if (!Array.isArray(S.fanTradeMemory)) S.fanTradeMemory = [];
        userSide.forEach(id => {
          const p = S.players[id];
          if (!p) return;
          const appeal = (typeof playerFanAppeal === "function") ? playerFanAppeal(p) : 0;
          if (appeal >= 6) { // 只有球迷「認得」的球員才進記憶（門面級）
            S.fanTradeMemory.push({ name: p.name, appeal: Math.round(appeal), yearTraded: S.year || 1, yearsLeft: 3, local: !p.foreign });
          }
        });
      } catch (_) {}
    } catch (_) {}
    const allBig = userSide.concat(otherSide || []).map(id => S.players[id]).filter(p => p && trueOverall(p) >= 78);
    if (allBig.length > 0) chronicle("trade", `重大交易：送出${userSide.map(id => S.players[id] && S.players[id].name).filter(Boolean).join("、") || "（無球員）"}，換回${(otherSide || []).map(id => S.players[id] && S.players[id].name).filter(Boolean).join("、") || "（無球員）"}`);
  } catch (_) { /* 交易主流程不得被史冊/耐心掛勾拖垮 */ }
}

/* ---------- v41 季末掛勾（enterOffseason 呼叫）：史冊季記／退休記載／需求單年度清理／耐心回中 ---------- */
function v41OnSeasonEnd() {
  try {
    ensureV41();
    const team = S.teams[S.userTeamId];
    const last = (S.gmCareer && S.gmCareer.seasons && S.gmCareer.seasons[S.gmCareer.seasons.length - 1]) || null;
    if (team) chronicle("season", `第${S.seasonYear}年球季結束：${team.wins}勝${team.losses}敗${last && last.year === S.seasonYear && last.champion ? "，奪下總冠軍！" : ""}`, { w: team.wins, l: team.losses, champ: !!(last && last.year === S.seasonYear && last.champion) });
    const ret = (S.offseasonSummary && S.offseasonSummary.myRetiredIds) || [];
    if (ret.length > 0) {
      const names = ret.map(id => S.retiredPlayers[id] && S.retiredPlayers[id].name).filter(Boolean);
      if (names.length > 0) chronicle("retire", `本季${names.length}名子弟兵高掛球鞋：${names.join("、")}`);
    }
    (S.demands || []).forEach(d => {
      if (d.year === S.seasonYear && d.status === "open") { d.status = "expired"; S.demandIgnored = (S.demandIgnored || 0) + 1; }
      else if (d.year === S.seasonYear && d.status === "accepted") d.status = "expired"; // 承諾未兌現也失效（不追加懲罰，v42 承諾系統再接）
    });
    if ((S.demandIgnored || 0) >= 3) {
      chronicle("demand", "教練團的補強需求連季遭到冷處理，更衣室瀰漫不信任氣氛");
      const hc = headCoachOf(team);
      if (hc) hc.trust = clamp((hc.trust || 55) - 6, 0, 100);
      S.demandIgnored = 0;
    }
    S.demands = (S.demands || []).filter(d => d.year >= S.seasonYear - 1); // 史冊留敘事、佇列只留近一年
    S.fanPatience = clamp(Math.round(((typeof S.fanPatience === "number" ? S.fanPatience : 60)) * 0.8 + 50 * 0.2), 0, 100); // 季末向50回中20%
    if (typeof v45FansSeasonEnd === "function") v45FansSeasonEnd(); // v45：期待/認同季末靠攏＋耐心期待落差壓力＋球迷來信
    /* v54 A2：育成/二軍季末統計結算＋育成合約到期處理 */
    if (typeof v54DevMinorSeasonStats === "function") v54DevMinorSeasonStats();
    if (typeof v54DevContractSeasonEnd === "function") v54DevContractSeasonEnd();
    /* v55 Culture & City：文化快照、城市演化、文化效果結算 */
    if (typeof v55CultureSeasonSnapshot === "function") v55CultureSeasonSnapshot();
    if (typeof v55CitySeasonEnd === "function") v55CitySeasonEnd();
    if (typeof v55CultureSeasonEffects === "function") v55CultureSeasonEffects();
  } catch (_) { /* 季末掛勾不得阻擋休賽季流程 */ }
}

/* ---------- v41 每日心跳（simulateDay 尾端呼叫） ---------- */
function tickV41Daily(results) {
  try {
    ensureV41();
    const team = S.teams[S.userTeamId];
    if (team && !canManualLineup() && team.lineupMode !== "coach") team.lineupMode = "coach"; // 純GM且未接管：排線鐵定在教練手上
    if (team) effTacticsOf(team); // 每日刷新教練實際執行方針（供隔日排線與打線頁顯示）
    tickCoachDynamics();
    tickTakeover();
    tickDemandEngine();
    tickFanPatience(results);
    if (typeof tickV45Fans === "function") tickV45Fans(results); // v45：球迷三維度每日心跳（期待/認同）
  } catch (_) { /* v41 心跳不得阻擋比賽模擬（開機防護） */ }
}

/* ---------- v41 狀態遷移：舊檔一律補 gm_coach（v40 玩家本來就在手排，不破壞既有存檔） ---------- */
function ensureV41() {
  if (!S) return;
  if (S.gameMode !== "pure_gm" && S.gameMode !== "gm_coach") S.gameMode = "gm_coach";
  if (S.takeover === undefined) S.takeover = null;
  if (!Array.isArray(S.demands)) S.demands = [];
  if (typeof S.demandSeq !== "number") S.demandSeq = 1;
  if (!Array.isArray(S.chronicle)) S.chronicle = [];
  if (!Array.isArray(S.gmTags)) S.gmTags = [];
  if (typeof S.fanPatience !== "number") S.fanPatience = 60;
  if (typeof S.demandRejects !== "number") S.demandRejects = 0;
  if (typeof S.demandIgnored !== "number") S.demandIgnored = 0;
  if (S.takeoverTipsSeen === undefined) S.takeoverTipsSeen = false;
  const team = S.teams && S.teams[S.userTeamId];
  if (team) { ensureTactics(team); const hc = headCoachOf(team); if (hc) ensureCoachPersona(hc); }
  if (typeof ensureV42 === "function") try { ensureV42(); } catch (e) {} // v42：升級鏈串接（…→ensureV41→ensureV42）
  if (typeof ensureV43 === "function") try { ensureV43(); } catch (e) {} // v43：升級鏈串接（…→ensureV42→ensureV43）
  if (typeof ensureV44 === "function") try { ensureV44(); } catch (e) {} // v44：升級鏈串接（…→ensureV43→ensureV44）
  if (typeof ensureV45 === "function") try { ensureV45(); } catch (e) {} // v45：升級鏈串接（…→ensureV44→ensureV45）
}

/* ====================================================================
   v42 附錄：教練市場與標籤後果（北極星第二梯次）
   ①聯盟教練市場池＋AI搶人 ②意願系統（delegates甜頭／hands_on帳單，僅對好教練生效）
   ③教練實際求去離隊（辭呈→慰留一次→代理教練） ④續約要價受信任影響＋約滿史冊
   ⑤hands_on 衰減表（永留疤） ⑨釋出→二軍拉人建議 ⑩青年育成方針
   ⑪投手輪值方針×3＋新秀保護輪休 ⑫反應語錄多樣化
   鐵則：全部 try-catch 防呆，任何失敗退回 v41 行為，不得阻擋開機與模擬。
   ==================================================================== */

/* ---------- v42⑪ 投手輪值方針（GM／教練共治層；v42 簡化：不入折射，見 §42.5） ---------- */
const TACTICS_ROTATION = [
  { key: "five", label: "標準輪值", desc: "健康先發全員照排（預設）", size: 99, fatigue: 0 },
  { key: "four", label: "四本柱強投", desc: "只用最強四名先發：登板多、狀態犀利但疲勞重", size: 4, fatigue: 6 },
  { key: "six",  label: "六人養護",  desc: "六人分擔先發：護臂養投，單場消耗較低", size: 6, fatigue: -6 }
];
function rotationPolicyOf(team) {
  try {
    const key = (team && team.tactics && team.tactics.rotation) || "five";
    return TACTICS_ROTATION.find(r => r.key === key) || TACTICS_ROTATION[0];
  } catch (_) { return TACTICS_ROTATION[0]; }
}
function v42RotFatigueDelta(team) { try { return rotationPolicyOf(team).fatigue || 0; } catch (_) { return 0; } }
// 套用輪值人數上限（僅自動輪值時裁切；GM 手動指定輪值不動）
function v42ApplyRotationPolicy(team, list) {
  try {
    const pol = rotationPolicyOf(team);
    if (!pol || pol.size >= 99 || !Array.isArray(list) || list.length <= pol.size) return list;
    return list.slice().sort((a, b) => trueOverall(b) - trueOverall(a)).slice(0, pol.size);
  } catch (_) { return list; }
}

/* ---------- v42 隔離亂數：v42 的敘事型抽選（語錄、AI搶人、育成屬性）走自有 PRNG，
   不動用共享 Math.random——確保回歸沙盒與比賽模擬的既有亂數序列完全不受 v42 影響
   （記憶錨點：回歸沙盒與宿主共用 Math；v42 一律不碰全域序列）。 ---------- */
let _v42rngState = 0;
function v42rng() {
  if (!_v42rngState) {
    let h = 2166136261 >>> 0;
    const s = String((S && S.seasonYear) || 1) + ":" + String((S && S.currentDay) || 0) + ":" + String((S && S.demandSeq) || 0);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    _v42rngState = (h >>> 0) || 1;
  }
  _v42rngState ^= _v42rngState << 13; _v42rngState >>>= 0;
  _v42rngState ^= _v42rngState >> 17;
  _v42rngState ^= _v42rngState << 5; _v42rngState >>>= 0;
  return (_v42rngState >>> 0) / 4294967296;
}
function v42Int(lo, hi) { return lo + Math.floor(v42rng() * (hi - lo + 1)); }

/* ---------- v42⑫ 反應語錄庫：同一件事說法多樣，教練帶哲學口吻 ---------- */
const V42_QUOTES = {
  grumble: [
    "總教練{coach}私下向記者抱怨：「方針跟我的棒球哲學根本是兩回事。」",
    "更衣室傳出雜音——總教練{coach}對戰術方針面露難色：「照這樣打，輸了算誰的？」",
    "總教練{coach}賽後淡淡一句：「打法不是我定的，你們去問樓上。」火藥味十足。",
    "記者堵到總教練{coach}：「GM的方針？我尊重，但尊重不代表認同。」",
    "總教練{coach}在教練休息室摔了戰術板——目擊者說他嘟囔著「外行領導內行」。"
  ],
  quitTalk: [
    "震盪！總教練{coach}被拍到與經紀人密會，傳出萌生去意（信任瀕臨破裂）。",
    "地方媒體頭條：總教練{coach}「留任變數大」，知情人士透露他已請經紀人探詢下家。",
    "總教練{coach}清空了辦公室一半的私人物品——球團上下人心惶惶。"
  ],
  resign: [
    "重磅！總教練{coach}正式向球團遞出辭呈：「道不同，不相為謀。」",
    "總教練{coach}把辭呈拍在GM桌上：「這支球隊不需要兩個總教練。」",
    "破局！總教練{coach}遞辭呈求去，聲明只有一句：「我累了。」"
  ],
  coachOnRelease: [
    "總教練{coach}對釋出{player}表示：「陣容是GM的權責，我只負責把剩下的人帶好。」",
    "被問到{player}遭釋出，總教練{coach}聳肩：「更衣室少了一個人，比賽還是要打。」",
    "總教練{coach}：「{player}的離開是艱難決定，希望名單上的洞有人補。」"
  ],
  callup: [
    "{player}接到升上一軍的電話，激動得說不出話：「我等這通電話等了好久！」",
    "農場傳來歡呼——{player}把二軍置物櫃清空，只留下一張字條：「我去圓夢了。」",
    "{player}升上一軍後第一件事是打給家人：「媽，我做到了。」",
    "二軍總教練目送{player}離開：「這孩子準備好了，去吧。」"
  ],
  demote: [
    "{player}默默收拾行囊下放二軍：「我會回來的。」",
    "被下放的{player}在停車場坐了很久——教練團希望他把這口氣化成養分。",
    "{player}接受下放安排：「在哪裡跌倒，就從二軍站起來。」"
  ],
  release: [
    "{player}離開球場前向球迷深深一鞠躬，結束在{team}的日子。",
    "{player}遭釋出後於社群發文：「感謝一切，棒球路還沒走完。」",
    "老將{player}被釋出，更衣室幾名年輕球員紅了眼眶。"
  ]
};
function v42Quote(key, ctx) {
  try {
    const pool = V42_QUOTES[key];
    if (!pool || !pool.length) return "";
    let s = pool[v42Int(0, pool.length - 1)];
    const c = ctx || {};
    s = s.replace(/{coach}/g, (c.coach && c.coach.name) || "").replace(/{player}/g, (c.player && c.player.name) || "").replace(/{team}/g, (c.team && c.team.name) || "球隊");
    return s;
  } catch (_) { return ""; }
}

/* ---------- v42② 意願系統：標籤後果落地（僅 teaching≥60 的好教練會挑雇主） ---------- */
// hands_on 市場罰則衰減表：未接管季數 0/1/2/3+ → −20/−14/−8/−4（地板−4，永遠留疤）
function handsOnMarketPenalty() {
  try {
    var culturePen = (typeof v55CultureCoachPenalty === "function") ? v55CultureCoachPenalty() : 0;
    if (!Array.isArray(S.gmTags) || !S.gmTags.includes("hands_on")) return -culturePen; /* 文化罰值為負數回傳正值 */
    const last = (S.v42 && typeof S.v42.lastTakeoverSeason === "number") ? S.v42.lastTakeoverSeason : null;
    const since = (last === null) ? 3 : Math.max(0, (S.seasonYear || 1) - last);
    return [20, 14, 8, 4][Math.min(since, 3)] - culturePen;
  } catch (_) { return 0; }
}
function teamRecentWinPct(team) {
  try { const w = (team && team.wins) || 0, l = (team && team.losses) || 0; return (w + l >= 20) ? w / (w + l) : null; } catch (_) { return null; }
}
function willingnessOf(entry, team) {
  try {
    const good = (entry.teaching || 50) >= 60;
    let w = 55; const why = [];
    if (good && Array.isArray(S.gmTags)) {
      if (S.gmTags.includes("delegates")) { w += 15; why.push("欣賞放得下權的GM"); }
      const hp = handsOnMarketPenalty();
      if (hp > 0) { w -= hp; why.push("聽說你會搶教練的兵符"); }
    }
    if (entry.grudge && entry.grudge.vsUser) {
      const decay = Math.max(0, 30 - Math.max(0, (S.seasonYear || 1) - (entry.grudge.year || 0)) * 10);
      if (decay > 0) { w -= decay; why.push("與你不歡而散的舊帳還記著"); }
    }
    const wr = teamRecentWinPct(team);
    if (wr !== null) {
      const adj = Math.round((wr - 0.5) * 20);
      w += adj;
      if (adj >= 5) why.push("看好球隊競爭力"); else if (adj <= -5) why.push("對球隊戰績有疑慮");
    }
    w = clamp(Math.round(w), 0, 100);
    return { value: w, state: w < 40 ? "refuse" : (w < 60 ? "ask" : "ok"), why: why.join("；") };
  } catch (_) { return { value: 60, state: "ok", why: "" }; }
}

/* ---------- v42① 聯盟教練市場池：教練是有限資源，好教練會被搶 ---------- */
const V42_HOT_TEACHING = 65;   // 搶手門檻
const V42_POACH_RATE = 0.25;   // Mars 拍板（採建議）：每休賽季搶手教練被 AI 隊聘走機率
function v42MarketId() { S.v42.seq = (S.v42.seq || 0) + 1; return "CM" + S.v42.seq + "_" + (S.seasonYear || 1); }
// 退役好手harvest：不呼叫 generateCoach，全走 S.retiredPlayers 既有資料（不消耗共享RNG的隨機生成）
function harvestRetireesToMarket() {
  try {
    ensureV42();
    const pool = S.coachMarket.pool;
    const inPool = new Set(pool.filter(c => c.kind === "retiree").map(c => c.sourceId));
    const want = Math.max(0, 4 - pool.filter(c => c.kind === "retiree").length);
    const retirees = Object.values(S.retiredPlayers || {})
      .filter(p => !p.becameCoach && !inPool.has(p.id))
      .sort((a, b) => (b.coachingAptitude || 0) - (a.coachingAptitude || 0))
      .slice(0, want);
    retirees.forEach(p => pool.push({
      id: v42MarketId(), kind: "retiree", sourceId: p.id, name: p.name, age: p.age,
      teaching: p.coachingAptitude || 50, specialAbility: null,
      contractYears: v42Int(2, 5), salary: v42Int(30, 150) * 10000
    }));
  } catch (_) {}
}
// 新面孔補滿：呼叫共享 generateCoach，僅在「玩家開啟教練選人器」時使用（UI動作，不在確定性模擬路徑上，安全）
function refillCoachMarket() {
  try {
    ensureV42();
    harvestRetireesToMarket();
    const pool = S.coachMarket.pool;
    let guard = 0;
    while (pool.length < 10 && guard++ < 20) {
      const c = generateCoach(S.userTeamId, "1軍", "總教練");
      pool.push({
        id: v42MarketId(), kind: "fresh", sourceId: null, name: c.name, age: null,
        teaching: c.teaching, specialAbility: c.specialAbility || null,
        contractYears: c.contractYears || randInt(2, 5), salary: c.salary || randInt(30, 150) * 10000
      });
    }
    S.coachMarket.year = S.seasonYear || 1;
  } catch (_) {}
}
// 休賽季市場運轉：AI 搶人（搶手者 25%）＋補池
function v42OffseasonCoachMarket() {
  try {
    ensureV42();
    const keep = [];
    (S.coachMarket.pool || []).forEach(e => {
      if ((e.teaching || 0) >= V42_HOT_TEACHING && v42rng() < V42_POACH_RATE) {
        const others = Object.values(S.teams).filter(t => t.id !== S.userTeamId);
        const ai = others.length ? others[v42Int(0, others.length - 1)] : null;
        if (ai) {
          if (e.kind === "retiree" && S.retiredPlayers[e.sourceId]) S.retiredPlayers[e.sourceId].becameCoach = true;
          pushNews("教練市場", `${ai.name}出手搶下名教頭${e.name}（調教力${e.teaching}），市場上又少一個好選擇。`);
          chronicle("coach", `名教頭${e.name}遭${ai.name}捷足先登，教練市場競爭白熱化`);
          return;
        }
      }
      keep.push(e);
    });
    S.coachMarket.pool = keep;
    harvestRetireesToMarket(); // 只補退役（隔離RNG）；新面孔延到玩家開啟選人器時補（見 generateCoachCandidatesV42）
  } catch (_) {}
}
// 從市場池抽候選（取代即時抽卡；池空或出錯退回 v41 舊制，畫面永不開天窗）
function generateCoachCandidatesV42(teamId, level, role) {
  try {
    ensureV42();
    if ((S.coachMarket.pool || []).length < 5) refillCoachMarket();
    const team = S.teams[teamId];
    const specialty = COACH_SPECIALTY_MAP[role] || "leadership";
    const picks = S.coachMarket.pool.slice().sort((a, b) => (b.teaching || 0) - (a.teaching || 0)).slice(0, 5);
    if (!picks.length) return generateCoachCandidates(teamId, level, role);
    return picks.map(entry => {
      const sa = entry.specialAbility || (entry.kind === "retiree" ? rollSpecialAbility(specialty, 0.2) : null);
      const will = willingnessOf(entry, team);
      const ask = will.state === "ask" ? 1.25 : 1;
      return {
        kind: entry.kind === "exiled" ? "fresh" : entry.kind, sourceId: entry.sourceId, marketId: entry.id,
        name: entry.name, age: entry.age, teaching: entry.teaching, specialAbility: sa,
        contractYears: entry.contractYears, salary: Math.round(entry.salary * ask / 1000) * 1000,
        will, exiled: entry.kind === "exiled"
      };
    });
  } catch (_) { return generateCoachCandidates(teamId, level, role); }
}
// 聘用閘門：拒絕級意願 → 婉拒（含理由）；由 hireCoachCandidate 開頭呼叫
function v42HireGate(candidate) {
  try {
    if (candidate && candidate.will && candidate.will.state === "refuse") {
      UI.flash = `${candidate.name} 婉拒加盟：「${candidate.will.why || "現在不是好時機"}。」`;
      UI.coachPicker = null; UI.coachCandidates = null;
      render();
      return false;
    }
  } catch (_) {}
  return true;
}
// 聘用成功：自市場池移除（稀缺性落地）
function v42OnCoachHired(candidate) {
  try {
    if (candidate && candidate.marketId && S.coachMarket && Array.isArray(S.coachMarket.pool))
      S.coachMarket.pool = S.coachMarket.pool.filter(e => e.id !== candidate.marketId);
  } catch (_) {}
}

/* ---------- v42④ 一軍總教練續約要價受信任影響（信任≥60 ×0.95／40~60 ×1.15／<40 ×1.35） ---------- */
function v42RenewTrustMult(staff) {
  try {
    if (!staff || staff.role !== "總教練" || staff.level !== "1軍") return 1;
    const t = (typeof staff.trust === "number") ? staff.trust : 55;
    return t >= 60 ? 0.95 : (t >= 40 ? 1.15 : 1.35);
  } catch (_) { return 1; }
}

/* ---------- v42③ 教練實際求去離隊：辭呈 → 慰留（生涯一次）→ 離隊＋代理教練 ---------- */
function tickCoachResignation() {
  try {
    ensureV42();
    const team = S.teams[S.userTeamId];
    if (!team) return;
    const hc = headCoachOf(team);
    if (!hc) { S.v42.quitCountdown = 0; S.v42.resignation = null; return; }
    if (S.v42.resignation) {
      if (S.v42.resignation.coachId !== hc.id) { S.v42.resignation = null; return; } // 教練已換人，辭呈失效
      if ((S.currentDay || 0) >= S.v42.resignation.expiresDay) v42CoachLeaves(hc, "辭呈七天未獲回應");
      return;
    }
    const t = (typeof hc.trust === "number") ? hc.trust : 55;
    if (t < 18) S.v42.quitCountdown = (S.v42.quitCountdown || 0) + 1;
    else if (t >= 25) S.v42.quitCountdown = 0;
    if ((S.v42.quitCountdown || 0) >= 14) {
      S.v42.resignation = { coachId: hc.id, day: S.currentDay || 0, expiresDay: (S.currentDay || 0) + 7 };
      S.v42.quitCountdown = 0;
      pushNews("更衣室", v42Quote("resign", { coach: hc }) || `總教練${hc.name}遞出辭呈。`);
      chronicle("coach", `總教練${hc.name}遞出辭呈（信任破裂14天未見修補）`);
    }
  } catch (_) {}
}
function v42CoachLeaves(hc, reason) {
  try {
    ensureV42();
    const team = S.teams[S.userTeamId];
    if (!team || !hc) return;
    // 離隊教練進市場、記舊帳（對同一GM意願−30，逐季衰減）
    S.coachMarket.pool.unshift({
      id: v42MarketId(), kind: "exiled", sourceId: null, name: hc.name, age: null,
      teaching: hc.teaching || 50, specialAbility: hc.specialAbility || null,
      contractYears: v42Int(2, 4), salary: Math.max(300000, Math.round((hc.salary || 500000) / 1000) * 1000),
      grudge: { vsUser: true, year: S.seasonYear || 1 }
    });
    const v42Name = (function () {
      try {
        if (typeof SURNAMES !== "undefined" && typeof GIVEN_CHARS !== "undefined") {
          const len = v42rng() < 0.7 ? 2 : 1; let gn = "";
          for (let i = 0; i < len; i++) gn += GIVEN_CHARS[v42Int(0, GIVEN_CHARS.length - 1)];
          return SURNAMES[v42Int(0, SURNAMES.length - 1)] + gn;
        }
      } catch (_) {}
      return "板凳";
    })();
    delete S.coaches[hc.id];
    const interim = {
      id: nextId("CO"), name: v42Name, team: team.id, level: "1軍", role: "總教練",
      specialty: COACH_SPECIALTY_MAP["總教練"] || "leadership",
      teaching: clamp((hc.teaching || 50) - 10, 25, 95),
      specialAbility: null, contractYears: 1, salary: 300000, interim: true, formerPlayer: false
    };
    S.coaches[interim.id] = interim;
    team.coachStaff["1軍"]["總教練"] = interim.id;
    if (typeof setCoachVacancy === "function") setCoachVacancy(team, "1軍", "總教練", false);
    // 代理教練人格：直接以隔離RNG填欄位（不呼叫 ensureCoachPersona，避免在模擬路徑動用共享RNG）
    if (typeof COACH_ARCHETYPES === "object") { const ks = Object.keys(COACH_ARCHETYPES); interim.archetype = ks[v42Int(0, ks.length - 1)]; }
    interim.coachability = clamp(Math.round(40 + v42rng() * 30), 20, 90);
    interim.trust = 50;
    S.v42.resignation = null;
    S.v42.quitCountdown = 0;
    S.v42.promise = null;
    pushNews("更衣室", `總教練${hc.name}正式離隊（${reason}）。板凳教練${interim.name}臨危受命代理兵符至季末。`);
    chronicle("coach", `總教練${hc.name}與GM決裂離隊（${reason}），${interim.name}代理指揮`);
  } catch (_) {}
}
// 慰留（mode: "pay" 加薪30% / "promise" 還權承諾 / "accept" 接受辭呈）
function v42RetainCoach(mode) {
  try {
    ensureV42();
    const res = S.v42.resignation;
    if (!res) return;
    const hc = S.coaches[res.coachId];
    if (!hc) { S.v42.resignation = null; render(); return; }
    if (mode === "accept") { v42CoachLeaves(hc, "GM接受辭呈"); persist(); render(); return; }
    if (hc.retainedOnce) { UI.flash = `${hc.name} 已被慰留過一次，這次他心意已決（僅能接受辭呈）。`; render(); return; }
    if (mode === "pay") {
      hc.salary = Math.round((hc.salary || 500000) * 1.3 / 1000) * 1000;
      hc.contractYears = Math.max(hc.contractYears || 1, 2);
      hc.trust = clamp(Math.max((typeof hc.trust === "number" ? hc.trust : 0), 40), 0, 100);
      hc.retainedOnce = true;
      S.v42.resignation = null;
      pushNews("更衣室", `球團加薪30%慰留成功，總教練${hc.name}收回辭呈。`);
      chronicle("coach", `以加薪30%慰留總教練${hc.name}（每任教練生涯僅此一次）`);
    } else if (mode === "promise") {
      if (!(S.takeover && S.takeover.active)) { UI.flash = "目前沒有接管狀態，無法用「還權承諾」慰留。"; render(); return; }
      if (typeof endTakeover === "function") endTakeover();
      hc.trust = clamp(Math.max((typeof hc.trust === "number" ? hc.trust : 0), 35), 0, 100);
      hc.retainedOnce = true;
      S.v42.promise = { coachId: hc.id, until: (S.currentDay || 0) + 60, year: S.seasonYear || 1 };
      S.v42.resignation = null;
      pushNews("更衣室", `GM承諾還權，總教練${hc.name}收回辭呈——60天內若再接管，信任將徹底歸零。`);
      chronicle("coach", `以「還權承諾」慰留總教練${hc.name}（60天內再接管＝信任歸零）`);
    }
    persist(); render();
  } catch (_) {}
}

/* ---------- v42⑨ 釋出影響評估＋二軍拉人建議 ---------- */
function releaseImpactOf(p, team) {
  try {
    if (!p || !team) return null;
    const out = { gaps: [], suggestions: [] };
    if (!p.isPitcher) {
      const others = (team.roster1 || []).map(id => S.players[id]).filter(q => q && q.id !== p.id && !q.isPitcher && !isInjured(q));
      (p.positions || []).forEach(x => {
        if (LINEUP_FIELD_POSITIONS.includes(x.pos) && !others.some(q => (q.positions || []).some(y => y.pos === x.pos)))
          out.gaps.push(`一軍將沒有健康的本職${POS_LABEL[x.pos] || x.pos}`);
      });
    } else {
      const mates = (team.roster1 || []).map(id => S.players[id]).filter(q => q && q.isPitcher && q.id !== p.id && !isInjured(q));
      if (p.role === "先發" && mates.filter(q => q.role === "先發").length < 4)
        out.gaps.push(`健康先發投手將只剩${mates.filter(q => q.role === "先發").length}名（輪值吃緊）`);
      if (p.role !== "先發" && mates.filter(q => q.role !== "先發").length < 3)
        out.gaps.push(`健康後援投手將只剩${mates.filter(q => q.role !== "先發").length}名（牛棚見底）`);
    }
    out.suggestions = suggestCallups(team, p);
    return out;
  } catch (_) { return null; }
}
function suggestCallups(team, released) {
  try {
    const farm = ((team && team.roster2) || []).map(id => S.players[id]).filter(q => q && !isInjured(q));
    return farm.map(q => {
      let fit = trueOverall(q); const why = [];
      if (released) {
        if (released.isPitcher !== q.isPitcher) fit -= 25;
        else if (released.isPitcher && q.role === released.role) { fit += 15; why.push(`同為${released.role}投手`); }
        else if (!released.isPitcher) {
          const shared = (released.positions || []).filter(x => (q.positions || []).some(y => y.pos === x.pos));
          if (shared.length > 0) { fit += 18; why.push(`能守${shared.map(x => POS_LABEL[x.pos] || x.pos).join("/")}`); }
        }
      }
      if ((q.age || 30) <= 24 && (q.potential || 50) >= 60) { fit += 5; why.push("年輕有潛力"); }
      why.push(`綜合${trueOverall(q)}`);
      return { p: q, fit, why: why.join("・") };
    }).sort((a, b) => b.fit - a.fit).slice(0, 3);
  } catch (_) { return []; }
}
// 釋出後掛勾：教練語錄反應＋若產生缺口留「拉人提示」待辦卡（3天後自動收起）
function v42OnRelease(p, team) {
  try {
    ensureV42();
    const hc = headCoachOf(team);
    if (hc) pushNews("更衣室", v42Quote("coachOnRelease", { coach: hc, player: p }));
    pushNews("球員動態", v42Quote("release", { player: p, team }));
    const impact = releaseImpactOf(p, team);
    if (impact && impact.gaps.length > 0 && impact.suggestions.length > 0) {
      S.v42.callupHint = {
        day: S.currentDay || 0, reason: impact.gaps.join("；"),
        ids: impact.suggestions.map(s => s.p.id), whys: impact.suggestions.map(s => s.why)
      };
    }
  } catch (_) {}
}
// 升降掛勾：球員反應語錄（互動多樣化）
function v42OnRosterMove(p, dir) {
  try {
    if (!p) return;
    pushNews("球員動態", v42Quote(dir === "up" ? "callup" : "demote", { player: p }));
    if (dir === "up" && S.v42 && S.v42.callupHint) {
      S.v42.callupHint.ids = (S.v42.callupHint.ids || []).filter(id => id !== p.id);
      if (!S.v42.callupHint.ids.length) S.v42.callupHint = null;
    }
  } catch (_) {}
}

/* ---------- v42⑩ 青年育成：季末大量上場的年輕人多長一格（潛力天花板內） ---------- */
function v42YouthGrowthOnSeasonEnd() {
  try {
    const team = S.teams[S.userTeamId];
    if (!team) return;
    (team.roster1 || []).concat(team.roster2 || []).map(id => S.players[id]).forEach(p => {
      if (!p || (p.age || 30) > 25 || !p.seasonStats || (p.seasonStats.G || 0) < 60) return;
      const keys = p.isPitcher ? ["velocity", "control", "stamina"] : ["contact", "power", "eye", "fielding", "speed"];
      const k = keys[v42Int(0, keys.length - 1)];
      const cap = (typeof potFor === "function") ? potFor(p, k) : 99;
      if (typeof p[k] === "number" && p[k] < cap) {
        p[k] = clamp(p[k] + 1, 1, cap);
        if (team.roster1.includes(p.id)) pushNews("養成", `${p.name} 靠著整季大量出賽經驗有感成長（${k === "velocity" ? "球速" : k === "control" ? "控球" : k === "stamina" ? "體力" : k === "contact" ? "接觸" : k === "power" ? "長打" : k === "eye" ? "選球" : k === "fielding" ? "守備" : "速度"}+1）。`);
      }
    });
  } catch (_) {}
}

/* ---------- v42 每日心跳與季末掛勾 ---------- */
function tickV42Daily() {
  try {
    ensureV42();
    if (S.takeover && S.takeover.active) {
      S.v42.lastTakeoverSeason = S.seasonYear || 1;
      // 還權承諾背信判定：承諾期內再接管 → 信任徹底歸零
      if (S.v42.promise && S.v42.promise.year === S.seasonYear && (S.currentDay || 0) <= S.v42.promise.until) {
        const hc = S.coaches[S.v42.promise.coachId];
        if (hc) {
          hc.trust = 0;
          pushNews("更衣室", `背信！GM在承諾還權後60天內再度接管，總教練${hc.name}的信任徹底歸零。`);
          chronicle("coach", `GM違背還權承諾，總教練${hc.name}信任歸零`);
        }
        S.v42.promise = null;
      }
    }
    tickCoachResignation();
    if (S.v42.callupHint && (S.currentDay || 0) > (S.v42.callupHint.day || 0) + 3) S.v42.callupHint = null;
  } catch (_) { /* v42 心跳不得阻擋比賽模擬（開機防護） */ }
}
function v42OnSeasonEnd() {
  try {
    ensureV42();
    const team = S.teams[S.userTeamId];
    // 代理總教練季末卸任 → 兵符懸缺（走既有空缺機制，玩家自由市場補人）
    const hc = team ? headCoachOf(team) : null;
    if (hc && hc.interim) {
      chronicle("coach", `代理總教練${hc.name}季末卸任，兵符懸缺待補`);
      pushNews("教練團", `代理總教練${hc.name}功成身退，球團啟動新任總教練遴選。`);
      if (typeof vacateStaff === "function") vacateStaff({ kind: "coach", level: "1軍", role: "總教練" }, `代理總教練${hc.name}卸任，總教練職位空缺，請到自由市場補人。`);
    }
    v42YouthGrowthOnSeasonEnd();
    v42OffseasonCoachMarket();
    S.v42.promise = null;
    S.v42.resignation = null;
    S.v42.quitCountdown = 0;
    S.v42.callupHint = null;
  } catch (_) { /* 季末掛勾不得阻擋休賽季流程 */ }
}

/* ---------- v54 A2 育成/二軍季末結算統計 ----------
   育成聯盟＋二軍不做逐場模擬，改為季末結算：
   根據球員能力、出賽機會、隨機波動，生成一整季的模擬數據（§8） */
function v54DevMinorSeasonStats() {
  try {
    if (!S || !S.teams) return;
    Object.values(S.teams).forEach(function(team) {
      /* 二軍球員季末統計 */
      (team.roster2 || []).forEach(function(id) {
        var p = S.players[id];
        if (!p) return;
        var stats = v54GenerateSeasonStats(p);
        if (!p.minorSeasonLog) p.minorSeasonLog = [];
        p.minorSeasonLog.push({ year: S.seasonYear, stats: stats });
      });
      /* 育成球員季末統計 */
      (team.rosterDev || []).forEach(function(id) {
        var p = S.players[id];
        if (!p) return;
        var stats = v54GenerateSeasonStats(p);
        if (!p.devSeasonLog) p.devSeasonLog = [];
        p.devSeasonLog.push({ year: S.seasonYear, stats: stats });
      });
    });
  } catch (_) { /* 不阻擋流程 */ }
}

/* 根據球員能力生成模擬季度統計 */
function v54GenerateSeasonStats(p) {
  if (!p) return {};
  var overall = (typeof trueOverall === "function") ? trueOverall(p) : 50;
  var games = randInt(60, 120);
  if (p.isPitcher) {
    var ip = Math.round(games * (0.3 + overall / 200) * 10) / 10;
    var era = Math.max(1.5, 6.5 - overall * 0.04 + (Math.random() - 0.5) * 2);
    var k = Math.round(ip * (0.5 + overall / 150 + (Math.random() - 0.5) * 0.3));
    var bb = Math.round(ip * (0.4 - overall / 400 + (Math.random() - 0.5) * 0.15));
    var w = Math.round(games * (overall / 150) * (0.3 + Math.random() * 0.3));
    var l = Math.round(games * ((100 - overall) / 200) * (0.3 + Math.random() * 0.3));
    return { G: games, W: w, L: l, IP: ip, ERA: Math.round(era * 100) / 100, K: k, BB: Math.max(0,bb), ER: Math.round(ip * era / 9), OUTS: Math.round(ip * 3) };
  } else {
    var ab = Math.round(games * (2.5 + Math.random()));
    var avg = Math.max(0.15, 0.18 + overall * 0.003 + (Math.random() - 0.5) * 0.06);
    var h = Math.round(ab * avg);
    var hr = Math.round(h * ((p.power || 50) / 400) * (0.5 + Math.random()));
    var rbi = Math.round(hr * 2.5 + h * 0.2 + Math.random() * 10);
    var walks = Math.round(ab * 0.06 + (p.eye || 50) / 200 * ab * 0.06);
    return { G: games, AB: ab, H: h, HR: hr, RBI: rbi, AVG: Math.round(avg * 1000) / 1000, BB: walks, PA: ab + walks, R: Math.round(h * 0.4 + hr * 0.6 + Math.random() * 10) };
  }
}

/* v54 A2：育成合約到期處理（季末掛勾，AI 隊自動處理） */
function v54DevContractSeasonEnd() {
  try {
    if (!S || !S.teams) return;
    Object.values(S.teams).forEach(function(team) {
      if (!team.rosterDev) return;
      var toRemove = [];
      team.rosterDev.forEach(function(id) {
        var p = S.players[id];
        if (!p) return;
        var devYears = (S.seasonYear || 1) - (p.devContractStart || S.seasonYear) + 1;
        /* 第 7 年強制畢業 */
        if (devYears >= 7) {
          if (!team.isUser) {
            /* AI 隊：能力高的升二軍，低的釋出 */
            var ov = (typeof trueOverall === "function") ? trueOverall(p) : 50;
            if (ov >= 45 && team.roster2.length < 32) {
              team.roster2.push(id); p.level = "2軍";
              delete p.devContractYears; delete p.devContractStart;
            } else {
              toRemove.push(id);
            }
          }
          /* 玩家隊由郵件事件處理（不在此自動） */
        }
      });
      toRemove.forEach(function(id) {
        team.rosterDev = team.rosterDev.filter(function(x){return x!==id});
        delete S.players[id];
      });
    });
  } catch (_) { /* 不阻擋流程 */ }
}
function ensureV42() {
  if (!S) return;
  if (!S.v42 || typeof S.v42 !== "object") S.v42 = {};
  if (S.v42.lastTakeoverSeason === undefined) S.v42.lastTakeoverSeason = null;
  if (S.v42.quitCountdown === undefined) S.v42.quitCountdown = 0;
  if (S.v42.promise === undefined) S.v42.promise = null;
  if (S.v42.resignation === undefined) S.v42.resignation = null;
  if (S.v42.callupHint === undefined) S.v42.callupHint = null;
  if (!S.coachMarket || !Array.isArray(S.coachMarket.pool)) S.coachMarket = { pool: [], year: S.seasonYear || 1 };
  const team = S.teams && S.teams[S.userTeamId];
  if (team && team.tactics && !TACTICS_ROTATION.some(r => r.key === team.tactics.rotation)) team.tactics.rotation = "five";
}


/* ====================================================================
   v43 —— 03-simulation 附加區塊 ——
   ①純GM 投打守全由教練安排：純GM 未接管時，投手輪值/牛棚也由教練每日重排。
   ②輪值方針納入教練折射（解除 v42 §42.5 T1 簡化）。
   ③傷兵遞補：純GM 時教練從現有選手提出遞補人選（不限同守位），走准駁制。
   ④掛牌報價每日 tick、郵件中樞 push、ensureV43。
   鐵則：全部 try-catch；純GM 手排入口是不存在（非 disable）；亂數走隔離 v42rng。
   ==================================================================== */

/* ---------- v43① 純GM 輪值/牛棚教練化 ----------
   純GM 未接管時，投手先發輪值與牛棚順序改由教練每日依「綜合能力＋輪值方針折射」重排，
   與打線一樣不給玩家手排入口。coachDailyRotation 在 simulateDay 尾端（打線之後）呼叫。 */
function coachDailyRotation(team) {
  try {
    if (!team) return;
    if (typeof ensureRotation === "function") ensureRotation(team);
    if (typeof ensureBullpenOrder === "function") ensureBullpenOrder(team, S.players);
    // 先發輪值：健康先發角色投手依綜合能力排序，再套「教練實際執行的輪值方針」（折射後）
    const healthyStarters = team.roster1.map(id => S.players[id])
      .filter(p => p && p.isPitcher && p.role === "先發" && !isInjured(p) && !(p.internationalDutyGamesLeft > 0))
      .sort((a, b) => trueOverall(b) - trueOverall(a));
    let rot = healthyStarters.map(p => p.id);
    if (rot.length === 0) { // 沒有先發角色→退回綜合能力前四
      rot = team.roster1.map(id => S.players[id]).filter(p => p && p.isPitcher && !isInjured(p) && !(p.internationalDutyGamesLeft > 0))
        .sort((a, b) => trueOverall(b) - trueOverall(a)).slice(0, 4).map(p => p.id);
    }
    // 套用教練折射後的輪值方針（見 v43 EffRotationKey）
    if (typeof v43ApplyRotationPolicyRefracted === "function") rot = v43ApplyRotationPolicyRefracted(team, rot);
    if (rot.length > 0) { team.rotation = rot; if (typeof team.starterIndex === "number") team.starterIndex = team.starterIndex % rot.length; }
    // 牛棚順序：各類別依綜合能力排序（教練把最強的擺前面）
    ["中繼", "布局", "終結"].forEach(tab => {
      const arr = team.roster1.map(id => S.players[id]).filter(p => p && p.isPitcher && p.role === tab && !isInjured(p))
        .sort((a, b) => trueOverall(b) - trueOverall(a)).map(p => p.id);
      if (arr.length > 0) { team.bullpenOrder = team.bullpenOrder || {}; team.bullpenOrder[tab] = arr; }
    });
  } catch (_) {}
}

/* ---------- v43② 輪值方針納入教練折射（解除 T1） ----------
   GM 下的輪值方針＝team.tactics.rotation；教練實際執行的方針＝經折射後的 key。
   折射門檻與 effTacticsOf 一致：exec<0.62 → 教練用哲學偏好（強投型教練偏四本柱、養護型偏六人、其餘標準）；
   0.62~0.78 → 打折執行（激進方針被緩和一級）；≥0.78 → 完全照 GM 方針。 */
function v43CoachRotationPref(coach) {
  try {
    if (!coach || !coach.archetype) return "five";
    // 依教練原型給輪值偏好
    if (coach.archetype === "PITCHING_FIRST") return "six"; // 護投
    if (coach.archetype === "POWER" || coach.archetype === "SMALL_BALL") return "four"; // 求戰績搶短期
    return "five";
  } catch (_) { return "five"; }
}
function v43EffRotationKey(team) {
  try {
    if (typeof ensureTactics === "function") ensureTactics(team);
    const gmKey = (team.tactics && team.tactics.rotation) || "five";
    // 折射只對「純GM 未接管的玩家隊」生效；其餘（AI 隊、GM兼教練、接管中）一律照 GM 方針，
    // 且不呼叫 headCoachOf——避免對尚未初始化人格的 AI 教練觸發 ensureCoachPersona 而擾動共享 RNG。
    if (!team || team.id !== S.userTeamId || S.gameMode !== "pure_gm" || S.takeover) return gmKey;
    const coach = (typeof headCoachOf === "function") ? headCoachOf(team) : null;
    if (!coach || !coach.archetype) return gmKey; // 無教練原型→照 GM
    const exec = (typeof executionOf === "function") ? executionOf(coach, team.tactics) : 1;
    if (exec >= 0.78) return gmKey; // 完全照辦
    const pref = v43CoachRotationPref(coach);
    if (exec < 0.62) return pref;   // 我行我素：用教練偏好
    // 中間帶：把「激進」的 GM 方針緩和一級（four→five／six→five 保守化），其餘照 GM
    if (gmKey === "four") return "five";
    return gmKey;
  } catch (_) { return "five"; }
}
// 依「折射後的輪值方針 key」裁切自動輪值人數（與 v42ApplyRotationPolicy 同語意，但吃折射 key）
function v43ApplyRotationPolicyRefracted(team, list) {
  try {
    const key = v43EffRotationKey(team);
    const pol = (typeof TACTICS_ROTATION !== "undefined") ? TACTICS_ROTATION.find(r => r.key === key) : null;
    if (!pol || pol.size >= 99 || !Array.isArray(list) || list.length <= pol.size) return list;
    return list.slice().sort((a, b) => trueOverall(b) - trueOverall(a)).slice(0, pol.size);
  } catch (_) { return list; }
}
// 折射後的輪值疲勞 delta（先發疲勞增減吃折射 key，取代 v42RotFatigueDelta 於純GM 下的來源）
function v43RotFatigueDelta(team) {
  try {
    const key = v43EffRotationKey(team);
    const pol = (typeof TACTICS_ROTATION !== "undefined") ? TACTICS_ROTATION.find(r => r.key === key) : null;
    return pol ? (pol.fatigue || 0) : 0;
  } catch (_) { return 0; }
}

/* ---------- v43③ 傷兵遞補：純GM 時教練從現有選手提出遞補人選（不限同守位），走准駁制 ----------
   觸發：純GM 未接管時，先發陣容（打線/輪值）成員受傷 → 教練提一份「遞補提案」（含建議人選與理由），
   玩家在待辦/郵件批准或否決；否決則教練改提替代案（同一傷缺最多提到玩家接受或替代人選用盡）。
   不限同守位——由教練需求自行決定（真實 GM 情境：捕手傷了，教練可能拉一個能蹲的內野手頂）。 */
function v43InjuryReplaceCandidates(team, injured) {
  // 從一/二軍健康、且不在先發陣容的球員中，依「能否合理頂替」評分挑前三
  try {
    const inLineup = new Set((team.lineup || []).map(s => s.playerId).concat(team.rotation || []));
    const pool = team.roster1.concat(team.roster2).map(id => S.players[id])
      .filter(p => p && !isInjured(p) && !(p.internationalDutyGamesLeft > 0) && p.id !== injured.id && !inLineup.has(p.id));
    const wantPitcher = injured.isPitcher;
    // r008：同類型硬篩選——先只看同類型，無人時才 fallback 全員
    const sameType = pool.filter(p => p.isPitcher === wantPitcher);
    const effective = sameType.length > 0 ? sameType : pool;
    const scored = effective.map(p => {
      let sc = trueOverall(p);
      // 野手：能守傷者主守位再加分（但非必要）
      if (!wantPitcher && !p.isPitcher && injured.positions && p.positions) {
        const injPos = injured.positions[0] && injured.positions[0].pos;
        if (injPos && p.positions.some(x => x.pos === injPos)) sc += 12;
      }
      // 跨類型頂替（fallback 情況）扣分以凸顯非理想
      if (p.isPitcher !== wantPitcher) sc -= 10;
      // 一軍優先（即戰力）
      if (p.level === "1軍") sc += 8;
      // r008：隨機微擾 ±3，避免同一板凳反覆入選
      sc += Math.floor(Math.random() * 7) - 3;
      return { p, sc };
    }).sort((a, b) => b.sc - a.sc);
    return scored.slice(0, 3).map(x => x.p);
  } catch (_) { return []; }
}
function v43MakeInjuryProposal(team, injured) {
  try {
    ensureV43State();
    // 同一傷者已有未結案提案→不重複開
    if ((S.v43.injuryProposals || []).some(pr => pr.status === "open" && pr.injuredId === injured.id)) return null;
    const cands = v43InjuryReplaceCandidates(team, injured);
    if (cands.length === 0) return null;
    const coach = (typeof headCoachOf === "function") ? headCoachOf(team) : null;
    const pick = cands[0];
    const injPosLbl = injured.isPitcher ? (injured.role || "投手")
      : (injured.positions ? injured.positions.map(x => (POS_LABEL[x.pos] || x.pos)).join("/") : "野手");
    const pickPosLbl = pick.isPitcher ? (pick.role || "投手")
      : (pick.positions ? pick.positions.map(x => (POS_LABEL[x.pos] || x.pos)).join("/") : "野手");
    const crossNote = (pick.isPitcher !== injured.isPitcher || (!pick.isPitcher && injured.positions && pick.positions && !pick.positions.some(x => injured.positions.some(y => y.pos === x.pos))))
      ? "（跨守位頂替，不是理想人選但目前陣容裡最合適）" : "";
    if (!S.v43.injuryProposals) S.v43.injuryProposals = [];
    const pr = {
      id: "IP" + (S.v43.injuryProposalSeq++) + "_" + S.seasonYear,
      injuredId: injured.id, coachId: coach ? coach.id : null,
      candidateIds: cands.map(p => p.id), pickIndex: 0,
      status: "open", year: S.seasonYear, createdDay: S.currentDay || 0,
      title: `${injured.name}（${injPosLbl}）受傷，建議由 ${pick.name}（${pickPosLbl}）遞補上一軍`,
      reason: `${coach ? coach.name + "教練" : "教練團"}的判斷：目前最能補上這個洞的是 ${pick.name}${crossNote}。你可以批准，或要教練另提人選。`
    };
    S.v43.injuryProposals.push(pr);
    if (typeof v43PushMail === "function") v43PushMail("coach", "教練遞補提案", pr.title, { kind: "injuryProposal", refId: pr.id });
    if (typeof pushNews === "function") pushNews("教練團", `${coach ? coach.name : "教練團"}就 ${injured.name} 的傷缺提出遞補人選：${pick.name}。`);
    return pr;
  } catch (_) { return null; }
}
// 批准／換人：批准則把建議人選升上一軍並排入相應位置；換人則指向下一位候選
function v43ResolveInjuryProposal(id, action) {
  try {
    ensureV43State();
    const pr = (S.v43.injuryProposals || []).find(x => x.id === id);
    if (!pr || pr.status !== "open") return { ok: false, msg: "此提案已不在待回應狀態。" };
    const team = S.teams[S.userTeamId];
    if (action === "approve") {
      const pid = pr.candidateIds[pr.pickIndex];
      const p = S.players[pid];
      if (!p) { pr.status = "void"; return { ok: false, msg: "建議人選已不可用，提案取消。" }; }
      // 升上一軍（若在二軍）
      if (team.roster2.indexOf(pid) >= 0) {
        team.roster2 = team.roster2.filter(x => x !== pid);
        if (team.roster1.indexOf(pid) < 0) team.roster1.push(pid);
        p.level = "1軍";
      }
      pr.status = "approved";
      const coach = pr.coachId ? S.coaches[pr.coachId] : null;
      if (coach && typeof coach.trust === "number") coach.trust = clamp(coach.trust + 3, 0, 100); // 尊重教練判斷→信任小回
      if (typeof pushNews === "function") pushNews("教練團", `GM 批准遞補：${p.name} 升上一軍頂替傷缺。`);
      if (typeof chronicle === "function") chronicle("coach", `傷缺遞補：${p.name} 上一軍（教練提案獲准）`);
      if (typeof persist === "function") persist();
      return { ok: true, msg: `已批准：${p.name} 升上一軍遞補。` };
    }
    if (action === "next") {
      if (pr.pickIndex + 1 >= pr.candidateIds.length) {
        return { ok: false, msg: "教練已提出所有可行人選，沒有其他建議了。請直接批准，或自行到名單調整。" };
      }
      pr.pickIndex++;
      const np = S.players[pr.candidateIds[pr.pickIndex]];
      const coach = pr.coachId ? S.coaches[pr.coachId] : null;
      pr.title = `${(S.players[pr.injuredId] || {}).name || "傷者"} 的遞補改提：${np ? np.name : "?"}`;
      pr.reason = `${coach ? coach.name + "教練" : "教練團"}改口：「那換 ${np ? np.name : "這位"} 上來，這是我下一個口袋人選。」`;
      if (typeof persist === "function") persist();
      return { ok: true, msg: `教練改提人選：${np ? np.name : "下一位"}。` };
    }
    if (action === "dismiss") {
      pr.status = "dismissed";
      const coach = pr.coachId ? S.coaches[pr.coachId] : null;
      if (coach && typeof coach.trust === "number") coach.trust = clamp(coach.trust - 2, 0, 100);
      if (typeof persist === "function") persist();
      return { ok: true, msg: "已擱置這份遞補提案（教練信任−2）。傷缺仍在，教練之後可能再提。" };
    }
    return { ok: false, msg: "未知的回應。" };
  } catch (_) { return { ok: false, msg: "處理失敗。" }; }
}

/* ---------- v43④ 郵件中樞 push ----------
   把教練事件、掛牌報價、傷兵遞補、輪值異動通知等統一收進 S.v43.mail。
   category：coach／trade／injury／system。unread 標記；玩家在郵件中樞讀取與跳轉處理。 */
function v43PushMail(category, title, body, meta) {
  try {
    ensureV43State();
    const m = {
      id: "M" + (S.v43.mailSeq++) + "_" + S.seasonYear,
      category: category || "system", title: title || "", body: body || "",
      meta: meta || null, day: S.currentDay || 0, year: S.seasonYear, unread: true
    };
    S.v43.mail.unshift(m);
    if (S.v43.mail.length > 60) S.v43.mail = S.v43.mail.slice(0, 60); // 收件匣封頂
    return m;
  } catch (_) { return null; }
}

/* ---------- v43 掛牌報價每日 tick ----------
   掛牌中的每位球員，每天有機率被一支 AI 球團（需求匹配者優先）開出一份報價，進郵件中樞。
   過期報價自動清除。全走隔離 RNG。 */
const V43_OFFER_DAILY_CHANCE = 0.35; // 每位掛牌球員每天被開價機率
function v43TickListings() {
  try {
    ensureV43State();
    if (!S.v43.listings || S.v43.listings.length === 0) {
      // 仍要清過期報價
      v43PurgeExpiredOffers();
      return;
    }
    const seller = S.teams[S.userTeamId];
    const otherTeams = Object.values(S.teams).filter(t => t.id !== seller.id);
    S.v43.listings.forEach(pid => {
      const target = S.players[pid];
      if (!target) return;
      // 已有此球員的未回應報價達 2 份→這天不再加（避免灌爆）
      const openCnt = S.v43.offers.filter(o => o.targetId === pid && o.status === "open").length;
      if (openCnt >= 2) return;
      if (v42rng() >= V43_OFFER_DAILY_CHANCE) return;
      // 挑一支「眼中此球員價值高」的 AI 隊當買家
      const ranked = otherTeams.map(t => ({ t, v: (typeof personaTradeValue === "function") ? personaTradeValue(t, target) : tradeValue(target) }))
        .sort((a, b) => b.v - a.v);
      const buyer = ranked[v42Int(0, Math.min(4, ranked.length - 1))].t; // 前五名隨機一支
      const offer = (typeof v43GenerateOfferFor === "function") ? v43GenerateOfferFor(pid, buyer.id) : null;
      if (offer) {
        S.v43.offers.push(offer);
        const desc = (typeof v43OfferSummary === "function") ? v43OfferSummary(offer) : "一份交易條件";
        v43PushMail("trade", `${buyer.name} 對 ${target.name} 開出條件`, desc, { kind: "listingOffer", refId: offer.id });
        if (typeof pushNews === "function") pushNews("交易市場", `${buyer.name}對掛牌的 ${target.name} 開出交易條件。`);
      }
    });
    v43PurgeExpiredOffers();
    if (typeof persist === "function") persist();
  } catch (_) {}
}
function v43PurgeExpiredOffers() {
  try {
    const day = S.currentDay || 0;
    (S.v43.offers || []).forEach(o => { if (o.status === "open" && day > o.expiresDay) o.status = "expired"; });
    // 只保留近一年 open/近期，避免無限增長
    S.v43.offers = (S.v43.offers || []).filter(o => o.status === "open" || (o.year >= (S.seasonYear || 1)));
  } catch (_) {}
}
// 報價文字摘要（人話）
function v43OfferSummary(offer) {
  try {
    const buyer = S.teams[offer.buyerId];
    const parts = [];
    if (offer.playerIds && offer.playerIds.length) {
      parts.push("球員 " + offer.playerIds.map(id => (S.players[id] || {}).name || "?").join("、"));
    }
    if (offer.cash > 0) parts.push("現金 " + ((typeof formatMoney === "function") ? formatMoney(offer.cash) : offer.cash));
    return `${buyer ? buyer.name : "某隊"}願以【${parts.join(" ＋ ")}】換取 ${(S.players[offer.targetId] || {}).name || "該球員"}。`;
  } catch (_) { return "一份交易條件。"; }
}
// 玩家接受一份掛牌報價 → 執行交易（對方球員/現金進來，掛牌球員出去）
function v43AcceptOffer(offerId) {
  try {
    ensureV43State();
    const offer = (S.v43.offers || []).find(o => o.id === offerId);
    if (!offer || offer.status !== "open") return { ok: false, msg: "此報價已失效。" };
    const seller = S.teams[S.userTeamId];
    const buyer = S.teams[offer.buyerId];
    if (!buyer) return { ok: false, msg: "買方球團已不存在。" };
    // 你送出＝掛牌目標；你收到＝offer.playerIds ＋ offer.cash（buyer 付你現金）
    if (typeof v43ExecuteTradeWithCash === "function") {
      v43ExecuteTradeWithCash(seller.id, buyer.id, [offer.targetId], offer.playerIds || [], 0, offer.cash || 0);
    }
    offer.status = "accepted";
    // 撤掉此球員的掛牌與其它未回應報價
    S.v43.listings = S.v43.listings.filter(x => x !== offer.targetId);
    S.v43.offers.forEach(o => { if (o.targetId === offer.targetId && o.status === "open") o.status = "void"; });
    const gotNames = (offer.playerIds || []).map(id => (S.players[id] || {}).name).filter(Boolean).join("、");
    if (typeof pushNews === "function") pushNews("交易市場", `${seller.name}接受了${buyer.name}的條件，送出 ${(S.players[offer.targetId] || {}).name || "球員"}。`);
    if (typeof chronicle === "function") chronicle("trade", `掛牌成交：送出 ${(S.players[offer.targetId] || {}).name || "球員"}，換回 ${gotNames || ""}${offer.cash > 0 ? `＋現金` : ""}`);
    if (typeof persist === "function") persist();
    return { ok: true, msg: `已成交：${gotNames ? "換回 " + gotNames : ""}${offer.cash > 0 ? (gotNames ? "＋" : "換回") + "現金 " + ((typeof formatMoney === "function") ? formatMoney(offer.cash) : offer.cash) : ""}。` };
  } catch (_) { return { ok: false, msg: "成交失敗。" }; }
}
function v43DeclineOffer(offerId) {
  try {
    ensureV43State();
    const offer = (S.v43.offers || []).find(o => o.id === offerId);
    if (!offer || offer.status !== "open") return { ok: false, msg: "此報價已失效。" };
    offer.status = "declined";
    if (typeof persist === "function") persist();
    return { ok: true, msg: "已婉拒這份報價。球員仍在掛牌中，其他隊可能再開條件。" };
  } catch (_) { return { ok: false, msg: "操作失敗。" }; }
}

/* ---------- v43 每日心跳（掛在 simulateDay 尾端；純GM 輪值教練化＋傷兵提案＋掛牌） ---------- */
function tickV43Daily(dayResults) {
  try {
    ensureV43State();
    const team = S.teams[S.userTeamId];
    if (!team) return;
    // 傷兵遞補提案：純GM 未接管時，先發陣容成員新受傷→教練提遞補
    if (S.gameMode === "pure_gm" && !S.takeover) {
      const lineupIds = new Set((team.lineup || []).map(s => s.playerId).concat(team.rotation || []));
      team.roster1.map(id => S.players[id]).filter(p => p && isInjured(p) && lineupIds.has(p.id))
        .forEach(inj => { if (typeof v43MakeInjuryProposal === "function") v43MakeInjuryProposal(team, inj); });
    }
    // 掛牌報價
    if (typeof v43TickListings === "function") v43TickListings();
  } catch (_) {}
}
function ensureV43() {
  try {
    ensureV43State();
    // 舊檔遷移：純GM 存檔若殘留 rotation 手排痕跡，交由 coachDailyRotation 每日重排即可，無需破壞
    if (!S.v43.migrated) { S.v43.migrated = true; }
  } catch (_) {}
}

/* ====================================================================
   v44 附錄：教練體諒溝通（需求單第四路徑）
   病灶：開局沒錢沒人，需求單只能「接受」（多半過期 -8「石沉大海」）或「駁回」（-5＋連鎖），
        兩條路教練都因「誤會被無視」而不滿——玩家缺少「向教練說明現況」的管道。
   設計：需求單新增第四鍵「體諒說明」（選項式高自由度：重建期／沒有經費／市場沒合適人選）。
        說辭與真實狀態相符 → 教練查證屬實，表示體諒並撤下需求（不罰信任、不算過期）；
        說辭與帳本／戰績／市場不符 → 教練識破（信任 -6，需求維持），不能靠謊話免費消災；
        同教練同季第 2 次以上體諒 → 耐心磨損（信任 -2），杜絕無限找藉口。
   憲法對齊：資訊不對稱（教練查得到帳本/戰績/市場）＋人的意志（會識破、耐心會磨損）＋後果。
   亂數紀律：教練回話語錄走隔離 PRNG v42rng，不動共享 Math.random。
   ==================================================================== */
const V44_NOBUDGET_THRESHOLD   = 3000 * 10000; // 可用預算低於 3000 萬＝真的沒錢補強（真機可調）
const V44_REBUILD_YOUNG_AGE    = 26.5;         // 一軍平均年齡低於此＝實質重建（年輕陣容）
const V44_REBUILD_RANK_FRAC    = 0.6;          // 戰績落在聯盟後 40%＝實質重建
const V44_EXCUSE_FATIGUE_TRUST = -2;           // 同教練同季第 2 次以上體諒：耐心磨損
const V44_EXCUSE_FALSE_TRUST   = -6;           // 教練識破不實說辭：信任重挫（近似駁回）

// 單一球員是否滿足需求單條件（不含 snapshot 判斷，供市場掃描用）
function v44PlayerMeetsNeed(p, need) {
  if (!p || !need) return false;
  if (typeof isInjured === "function" && isInjured(p)) return false;
  if (need.pos === "SP") { if (!p.isPitcher || p.role !== "先發") return false; }
  else if (need.pos === "RP") { if (!p.isPitcher || p.role === "先發") return false; }
  else if (need.pos) { if (p.isPitcher || !(p.positions || []).some(x => x.pos === need.pos)) return false; }
  else if (p.isPitcher) return false;
  const attrs = need.attrs || {};
  return Object.keys(attrs).every(k => (p[k] || 0) >= attrs[k]);
}

// 市場上是否「真的」找不到合適人選：掃二軍＋自由球員＋國際自由球員＋他隊掛牌
function v44NoSuitablePlayer(team, d) {
  if (!team || !d || !d.need) return true;
  const need = d.need;
  const farm = (team.roster2 || []).map(id => S.players[id]);
  if (farm.some(p => v44PlayerMeetsNeed(p, need))) return false;
  const fa = Object.values(S.freeAgents || {});
  if (fa.some(p => v44PlayerMeetsNeed(p, need))) return false;
  const intl = Object.values(S.internationalFreeAgents || {});
  if (intl.some(p => v44PlayerMeetsNeed(p, need))) return false;
  if (S.v43 && Array.isArray(S.v43.listings)) {
    if (S.v43.listings.map(id => S.players[id]).some(p => p && v44PlayerMeetsNeed(p, need))) return false;
  }
  return true;
}

// 玩家隊在聯盟的戰績名次比例（0＝第一、接近 1＝墊底）；出賽數過少時回 null（賽季初不以名次論斷）
function v44LeagueRankFrac(team) {
  const teams = Object.values(S.teams || {});
  if (teams.length < 2) return null;
  const gp = (team.wins || 0) + (team.losses || 0);
  if (gp < 15) return null;
  const wp = t => { const g = (t.wins || 0) + (t.losses || 0); return g > 0 ? t.wins / g : 0.5; };
  const sorted = teams.slice().sort((a, b) => wp(b) - wp(a));
  const idx = sorted.findIndex(t => t.id === team.id);
  return idx < 0 ? null : idx / (sorted.length - 1);
}

// 一軍平均年齡
function v44RosterAvgAge(team) {
  const ps = (team.roster1 || []).map(id => S.players[id]).filter(Boolean);
  if (ps.length === 0) return 99;
  return ps.reduce((s, p) => s + (p.age || 27), 0) / ps.length;
}

// 說辭可信度查證：回 { credible, tag }
function demandExcuseCredible(team, d, reasonKey) {
  if (reasonKey === "rebuild") {
    const mand = (typeof mandateActive === "function") ? mandateActive() : null;
    if (mand === "rebuild") return { credible: true, tag: "mandate" };
    if (v44RosterAvgAge(team) < V44_REBUILD_YOUNG_AGE) return { credible: true, tag: "young" };
    const frac = v44LeagueRankFrac(team);
    if (frac != null && frac >= V44_REBUILD_RANK_FRAC) return { credible: true, tag: "bottom" };
    return { credible: false, tag: null };
  }
  if (reasonKey === "nobudget") {
    const budget = (team.finance && typeof team.finance.budget === "number") ? team.finance.budget : 0;
    const ok = budget < V44_NOBUDGET_THRESHOLD;
    return { credible: ok, tag: ok ? "poor" : null };
  }
  if (reasonKey === "noplayer") {
    const none = v44NoSuitablePlayer(team, d);
    return { credible: none, tag: none ? "empty" : null };
  }
  return { credible: false, tag: null };
}

// 教練體諒／識破的回話語錄（隔離 PRNG，不動共享 Math.random）
const V44_EXCUSE_LINES = {
  rebuildOK:  ["我懂，現在是打地基的時候，我把年輕人帶好。", "重建期我沒話說，先把根基顧穩。", "理解，這階段贏球不是唯一指標，我調整期待。"],
  nobudgetOK: ["帳我看過了，確實沒有空間，我先想辦法擠。", "沒錢就沒錢，別勉強，我用手上的人拚。", "了解預算的難處，這筆我先擱著。"],
  noplayerOK: ["市場我也翻過，確實沒有對的人，不是你不幫。", "沒有適合的就別亂補，我認同。", "與其硬找不如不補，這點我同意。"],
  fatigue:    ["……我明白，但這季這種說法我聽了不只一次了。", "我體諒，可是總得讓我看到一點進展。", "好，我接受，但我的耐心不是無限的。"],
  falseRebuild:  ["重建？我們戰績排在中上游，這說法我不買單。", "陣容一點都不年輕，別拿重建搪塞我。"],
  falseBudget:   ["帳上明明還有空間，別跟我說沒錢。", "我看得懂財報，這筆預算你出得起。"],
  falseNoplayer: ["市場上明明就有人選，你是沒去看還是不想補？", "自由市場、二軍都有適任的人，這藉口站不住腳。"]
};
function v44ExcuseLine(key) {
  const arr = V44_EXCUSE_LINES[key] || [""];
  return arr[v42Int(0, arr.length - 1)];
}

/* ---------- v44 狀態遷移（掛在 ensureV41 尾端，升級鏈 …→ensureV43→ensureV44，零破壞） ---------- */
function ensureV44() {
  try {
    if (!S.v44) S.v44 = { ver: 44 };
    // 教練體諒次數（excuseYear/excuseCount）為惰性欄位，於 resolveDemand 內按季重置，此處不需預填。
  } catch (_) {}
}

/* v45 統一入口：選秀權歸屬狀態＋球迷三維度＋求購市場容器（升級鏈 …→ensureV44→ensureV45） */
function ensureV45() {
  try {
    if (!S.v45) S.v45 = { ver: 45 };
    if (typeof ensureV45PickState === "function") ensureV45PickState();     // 選秀權歸屬（01 檔）
    if (typeof ensureV45Fans === "function") ensureV45Fans();               // 球迷三維度（本檔）
    if (typeof ensureV45WantState === "function") ensureV45WantState();     // #5 教練需求求購市場
    if (typeof ensureV46 === "function") ensureV46();                       // v46：重建寬限期錨點
    if (typeof ensureV47 === "function") ensureV47();                       // v47：Z1 球探委託容器
  } catch (_) {}
}

/* ====================================================================
   v46 附錄①：教練需求「重建漸進寬限期」（Mars v46 需求②）
   痛點：第一年爛陣容觸發大量硬缺口需求，沒錢沒籌碼卻被逼交易。
   Mars 拍板：前 5 年、且要「漸進不設懸崖」（教練約長度不定，硬切 N 年不合理）。
   解法：以「加盟年資」推導壓力係數（第1年最低、逐年遞增、第6年回正常）：
     - 同時可掛需求數（cap）：年資淺→只掛 1 張、中段 2 張、第6年起 3 張
     - 需求期限：寬限期加長（少壓力）
     - 過期未達成的信任懲罰：寬限期減輕
     - 措辭：寬限期內標示為「重建方向」，並附球探盤點內部人選＋選秀方向（見 UI）
   對齊北極星：不改動「人的意志/壓力表」定義，只調節早期節奏；全程 try-catch。
   ==================================================================== */
function ensureV46() {
  try {
    if (!S) return;
    if (typeof S.franchiseStartYear !== "number") S.franchiseStartYear = 1; // 舊檔一律視為第1年起家（年資由此推）
    if (!S.v46) S.v46 = { ver: 46 };
  } catch (_) {}
}
// 加盟年資（1 起算）
function v46FranchiseYear() {
  try {
    const start = (typeof S.franchiseStartYear === "number") ? S.franchiseStartYear : 1;
    return Math.max(1, ((S.seasonYear || 1) - start + 1));
  } catch (_) { return 99; }
}
// 重建壓力係數（0.2→1.0，漸進、無懸崖）；1.0＝完全正常
function v46DemandPressure() {
  const y = v46FranchiseYear();
  if (y <= 1) return 0.20;
  if (y === 2) return 0.40;
  if (y === 3) return 0.55;
  if (y === 4) return 0.72;
  if (y === 5) return 0.88;
  return 1.0;
}
// 同時可掛需求上限（取代原本寫死的 <3）
function v46DemandCap() {
  const pr = v46DemandPressure();
  return pr < 0.5 ? 1 : (pr < 0.9 ? 2 : 3);
}
// 是否在重建寬限期（措辭/盤點用）
function v46InRebuild() { return v46DemandPressure() < 1.0; }


/* ====================================================================
   v45 附錄②：球迷三維度（期待／耐心／認同・北極星 6.7、附錄B v44順延項）
   北極星憲法：球迷不進權力表（不下令），他們施壓（2.1b）。把 v41 預埋的單一
   S.fanPatience 擴為三維，各接自己的出口：
     期待值 S.fanExpect   ← 近年戰績（贏久了門檻自升＝王朝詛咒）；出口＝未達標的不滿放大
     耐心   S.fanPatience ← 文化/城市/世代（既有）；出口＝老闆耐心乘數（既有 fanPatienceOwnerMult）
     認同   S.fanIdentify ← 特定球員/在地出身/兌現承諾；出口＝票房・贊助・FA意願・主場修正
   關鍵設計（對齊支柱一）：認同由「球迷看得懂的傳統數據＋在地出身」決定，**不看球探天花板、
   不看進階數據**——這正是「第三雙眼睛不看數據」的落地。L3 進階數據引擎到位後套利張力會加深，
   但期待/耐心/認同三者定義皆不需 L3，本版即可完整成立。
   鐵則：全程 try-catch；任何失敗退回 v41 單一耐心行為，不得阻擋模擬與開機。
   ==================================================================== */
function ensureV45Fans() {
  try {
    if (!S) return;
    if (typeof S.fanExpect !== "number") S.fanExpect = 50;     // 期待值（門檻）
    if (typeof S.fanPatience !== "number") S.fanPatience = 60; // 耐心（v41 既有）
    if (typeof S.fanIdentify !== "number") S.fanIdentify = 55; // 認同
    // v55球迷演化：數據素養（0-100）＋交易記憶
    if (typeof S.fanDataLiteracy !== "number") S.fanDataLiteracy = 8;
    if (!Array.isArray(S.fanTradeMemory)) S.fanTradeMemory = [];
  } catch (_) {}
}

/* 一名球員在球迷眼中的「認得的價值」
   v55球迷演化：不再純看傳統數據——隨 fanDataLiteracy 演進，球迷逐漸混入 L3 進階指標。
   低素養(0-20)：100%傳統（AVG/HR/RBI/SB/W/SV）——"球迷不看 wRC+"
   中素養(20-60)：傳統為主，進階開始加分——"有人在論壇討論 OPS+ 了"
   高素養(60-100)：~35%進階權重——"球迷會看 Framing Runs"，但傳統永不消失（散場仍在聊全壘打）
   §4.3 對稱：「你早年的孤獨，正是你的護城河」 */
function playerFanAppeal(p) {
  try {
    if (!p) return 0;
    const ss = p.seasonStats || {};
    const lit = (S && typeof S.fanDataLiteracy === "number") ? S.fanDataLiteracy : 8;
    // 進階權重：素養20以下=0%，60=25%，100≈35%（傳統永遠占多數；散場球迷仍聊全壘打）
    const advW = clamp((lit - 20) / 220, 0, 0.36);
    const tradW = 1 - advW * 0.5; // 傳統權重緩降（0.82~1.0）：進階加入≠傳統消失

    let trad = 0, adv = 0;
    if (p.isPitcher || (typeof p.velocity === "number")) {
      // 傳統：勝投與救援是球迷認得的招牌
      trad += (ss.W || 0) * 1.6 + (ss.SV || 0) * 1.2 + (ss.SO || 0) * 0.03;
      // 進階：FIP 好→球迷開始懂「他不是運氣好」；三振率、被打率
      if (advW > 0) {
        const fip = ss.FIP || ss.fip;
        if (typeof fip === "number" && fip > 0) adv += clamp((4.5 - fip) * 3.5, 0, 14); // FIP<4.5→加分
        adv += (ss.SO || 0) * 0.06; // 進階球迷更在意三振能力
      }
    } else {
      // 傳統：打擊率、全壘打、打點、盜壘
      const ab = ss.AB || 0;
      const avg = ab >= 40 ? (ss.H || 0) / ab : 0;
      trad += clamp((avg - 0.25) * 120, 0, 30);
      trad += (ss.HR || 0) * 0.9;
      trad += (ss.RBI || 0) * 0.12;
      trad += (ss.SB || 0) * 0.15;
      // 進階：wRC+ 讓球迷認得「打擊率低但價值高」的球員；ISO 區分力量
      if (advW > 0) {
        const wrc = ss.wRCplus || ss["wRC+"];
        if (typeof wrc === "number") adv += clamp((wrc - 95) * 0.25, 0, 12); // wRC+>95 開始加分
        const iso = (typeof ss.ISO === "number") ? ss.ISO : ((ss.HR || 0) > 0 && ab > 0 ? ((ss["2B"]||0)+(ss["3B"]||0)+(ss.HR||0))/ab : 0);
        adv += clamp(iso * 35, 0, 8); // 高 ISO 球員在進階球迷眼中更有份量
        // 守備進階：Framing 是最極端的例子——"第15年球迷自己在論壇貼 Framing Runs"
        if (p.positions && p.positions.some(x => x.pos === "C")) {
          const framing = p.framingAbility || p.framing;
          if (typeof framing === "number") adv += clamp((framing - 50) * 0.15, 0, 6);
        }
      }
    }
    let a = trad * tradW + adv * advW;
    if (!p.foreign) a *= 1.15; // 在地出身：家鄉英雄加成
    return a;
  } catch (_) { return 0; }
}
// 全隊認同目標值（0~100）：一軍名單認得的價值總量，映射到 0~100
function teamFanAppeal(team) {
  try {
    if (!team) return 50;
    const ids = (team.roster1 || []);
    const appeals = ids.map(id => playerFanAppeal(S.players[id])).sort((a, b) => b - a);
    // 取前 12 名貢獻（球迷記得的就是那幾張臉），加總後壓縮到 0~100
    const top = appeals.slice(0, 12).reduce((s, v) => s + v, 0);
    return clamp(Math.round(30 + top * 0.55), 0, 100);
  } catch (_) { return 50; }
}

/* ---------- 出口：期待值 → 未達標的不滿放大 ---------- */
// 本季相對期待的落差壓力：戰績遠低於期待→>1（放大耐心/認同下滑）；達標→<1
function fanExpectPressure() {
  try {
    const team = S.teams[S.userTeamId];
    if (!team) return 1;
    const gp = (team.wins || 0) + (team.losses || 0);
    if (gp < 15) return 1; // 樣本太小不論斷
    const wp = team.wins / gp;
    const expWp = 0.42 + ((S.fanExpect || 50) / 100) * 0.28; // 期待50→0.56、期待100→0.70、期待0→0.42
    const gap = expWp - wp; // 正＝未達期待
    return clamp(1 + gap * 2.2, 0.7, 1.8);
  } catch (_) { return 1; }
}

/* ---------- 出口：認同 → 票房/贊助/FA意願/主場修正 ---------- */
// 認同對「季末人氣成長」的加成（票房出口・與既有 popularity 綁定，不取代）
function fanIdentifyPopBond() {
  try { const fi = (S && typeof S.fanIdentify === "number") ? S.fanIdentify : 55; return Math.round((fi - 55) / 12); } catch (_) { return 0; }
}
// 認同對「贊助收入」的乘數（0.9~1.12）
function fanIdentifySponsorMult() {
  try { const fi = (S && typeof S.fanIdentify === "number") ? S.fanIdentify : 55; return clamp(0.9 + (fi / 100) * 0.24, 0.9, 1.12); } catch (_) { return 1; }
}
// 認同對「本土FA期望薪資」的折讓乘數（高認同→球員想來→開價客氣；0.94~1.06）
function fanIdentifyFaMult() {
  try { const fi = (S && typeof S.fanIdentify === "number") ? S.fanIdentify : 55; return clamp(1.06 - (fi / 100) * 0.12, 0.94, 1.06); } catch (_) { return 1; }
}
// 認同對「主場期望得分」的微幅修正（滿場死忠加持；-0.03~+0.05 分）
function fanIdentifyHomeEdge() {
  try { const fi = (S && typeof S.fanIdentify === "number") ? S.fanIdentify : 55; return clamp((fi - 55) / 100 * 0.11, -0.03, 0.05); } catch (_) { return 0; }
}

/* ---------- 每日心跳：三維度的每日微調（承 v41 tickFanPatience，另補期待/認同） ---------- */
function tickV45Fans(results) {
  try {
    ensureV45Fans();
    const team = S.teams[S.userTeamId];
    if (!team) return;
    const my = results && results.find(r => r.home === team.id || r.away === team.id);
    if (my) {
      const won = (my.home === team.id) ? my.homeScore > my.awayScore : my.awayScore > my.homeScore;
      const press = fanExpectPressure();
      // 認同：贏球緩升、輸球在高期待壓力下較快掉（球迷認同隨戰績波動，但比耐心黏）
      S.fanIdentify = clamp(S.fanIdentify + (won ? 0.10 : -0.08 * press), 0, 100);
      // 期待：贏球極緩推升門檻（王朝詛咒的日常累積），輸球極緩回落
      S.fanExpect = clamp(S.fanExpect + (won ? 0.05 : -0.03), 0, 100);
    }
  } catch (_) {}
}

/* ---------- 季末結算：三維度向各自目標靠攏（掛在 v41OnSeasonEnd 之後） ---------- */
function v45FansSeasonEnd() {
  try {
    ensureV45Fans();
    const team = S.teams[S.userTeamId];
    if (!team) return;
    const gp = (team.wins || 0) + (team.losses || 0);
    const wp = gp > 0 ? team.wins / gp : 0.5;
    // 期待值：強季推升門檻（王朝詛咒），弱季緩降；向「近年戰績導出的目標」靠攏
    const expTarget = clamp(Math.round(35 + wp * 55), 0, 100); // 五成→62、七成→73、三成→51
    S.fanExpect = clamp(Math.round(S.fanExpect * 0.6 + expTarget * 0.4), 0, 100);
    // 認同：向「全隊認得的價值」靠攏，並受戰績修正（贏球加深認同）
    const identTarget = clamp(teamFanAppeal(team) + Math.round((wp - 0.5) * 20), 0, 100);
    S.fanIdentify = clamp(Math.round(S.fanIdentify * 0.55 + identTarget * 0.45), 0, 100);
    // 耐心：v41 已在 v41OnSeasonEnd 做向50回中；此處再疊期待落差壓力（未達期待→耐心額外磨損）
    const press = fanExpectPressure();
    if (press > 1.05) S.fanPatience = clamp(Math.round(S.fanPatience - (press - 1) * 12), 0, 100);
    // v55球迷演化：交易記憶衰減——球迷記你三年，送走的門面每年拖拽認同
    try {
      if (Array.isArray(S.fanTradeMemory) && S.fanTradeMemory.length > 0) {
        let memDrag = 0;
        S.fanTradeMemory = S.fanTradeMemory.filter(m => {
          if (!m || m.yearsLeft <= 0) return false;
          // 每年拖拽：認同被送走球員的幽靈壓低，本地子弟兵更痛
          const weight = m.local ? 1.3 : 1.0;
          memDrag += clamp(m.appeal * 0.15 * weight * (m.yearsLeft / 3), 0, 5);
          m.yearsLeft -= 1;
          return m.yearsLeft > 0;
        });
        if (memDrag > 0) {
          S.fanIdentify = clamp(Math.round(S.fanIdentify - Math.min(10, memDrag)), 0, 100);
        }
      }
    } catch (_) {}
    // v55球迷演化：數據素養年度演化（§4.3 對稱「球迷的數據化程度也會演進」）
    if (typeof v55FanLiteracyEvolve === "function") v55FanLiteracyEvolve();
    // 郵件中樞：三維度跨門檻時發球迷來信（不做新畫面，重用郵件與跑馬燈）
    v45FanMail();
  } catch (_) {}
}

// 球迷來信：依三維度狀態推播（重用 v43 郵件中樞 category=球迷 ＋ 新聞跑馬燈）
function v45FanMail() {
  try {
    const push = (title, body) => { if (typeof v43PushMail === "function") v43PushMail("球迷", title, body, { kind: "fanVoice" }); };
    if (S.fanIdentify >= 78) { push("球迷來信：這是我們的球隊", "「看台上全是熟悉的名字與家鄉的孩子，週末帶全家來看球是我們的傳統。」"); if (typeof pushNews === "function") pushNews("球迷", "主場氣氛火熱，死忠球迷把應援做成了城市風景。"); }
    else if (S.fanIdentify <= 30) { push("球迷來信：我認不得這支球隊了", "「帳面數字也許好看，但看台上沒有一張我認得的臉。你到底在經營什麼？」"); if (typeof pushNews === "function") pushNews("球迷", "論壇上出現退票潮聲浪，球迷質疑球團失去了靈魂。"); }
    if (S.fanExpect >= 80 && ((S.teams[S.userTeamId].wins || 0) / Math.max(1, (S.teams[S.userTeamId].wins || 0) + (S.teams[S.userTeamId].losses || 0))) < 0.55) {
      push("媒體詢問：王朝的詛咒", "「贏習慣的城市不再滿足於一場好球——去年的標準成了今年的最低要求。你扛得住嗎？」");
    }
    if (S.fanPatience <= 25) push("球迷來信：我們的耐心正在見底", "「重建、重建，永遠的重建。我們還要相信多久？」");
    // v55球迷演化：交易記憶郵件——被送走的門面球星還在球迷記憶中
    try {
      if (Array.isArray(S.fanTradeMemory)) {
        const recent = S.fanTradeMemory.filter(m => m && m.yearsLeft >= 2 && m.appeal >= 10);
        if (recent.length > 0) {
          const names = recent.map(m => m.name).slice(0, 3).join("、");
          push("球迷來信：我們還記得", `「${names}離開後，看台上有些位子一直空著。那不只是一個球員，那是一段記憶。」`);
        }
      }
    } catch (_) {}
    // v55球迷演化：數據素養里程碑郵件
    if (typeof v55FanLiteracyMail === "function") v55FanLiteracyMail();
  } catch (_) {}
}

/* ====================================================================
   v55 球迷演化：數據素養年度演化（§4.3「球迷的數據化程度也會演進」）
   §6.7 核心設計：「第1年你簽 Framing 大師被罵到臭頭，第15年球迷自己在論壇貼 Framing Runs。
   你早年的孤獨，正是你的護城河。」
   與 L3 引擎形成完整咬合：
   - 早期：球迷純看傳統數據 → Moneyball 社會代價高（被罵）→ 但套利空間大
   - 晚期：球迷開始懂進階數據 → 社會代價降 → 但聯盟也追上 → 套利空間收窄
   影響因子：
   - 基底年成長 +2~3（時代演進不可逆）
   - 城市經濟/球迷世代深度（富裕城市+深度球迷=學習更快）
   - 文化：育成聖地球迷較願意研究數據；贏球至上球迷只看結果
   鐵則：全程 try-catch；失敗時 literacy 維持不變，不阻擋模擬。
   ==================================================================== */
function v55FanLiteracyEvolve() {
  try {
    if (!S) return;
    if (typeof S.fanDataLiteracy !== "number") S.fanDataLiteracy = 8;
    const cs = S.cityState && S.cityState[S.userTeamId];
    // 基底年成長：2~3（不可逆的時代演進，就像現實中數據革命不會倒退）
    let growth = 2.0 + (v42rng() * 1.2);
    // 城市經濟加速（富裕城市球迷更容易接觸數據分析內容）
    if (cs && typeof cs.econ === "number") growth += clamp((cs.econ - 50) / 80, -0.3, 0.6);
    // 球迷世代深度加速（深度球迷花更多時間在論壇討論＝學習更快）
    if (cs && typeof cs.fanGen === "number") growth += clamp((cs.fanGen - 40) / 100, -0.2, 0.5);
    // 文化影響：育成聖地球迷較有耐心研究數據；贏球至上只看輸贏不看數字
    try {
      if (typeof v55GetCultureTags === "function") {
        var tags = v55GetCultureTags();
        if (tags && tags.rookieDev) growth += 0.4; // 育成文化的球迷更願意深入了解
        if (tags && tags.winNow) growth -= 0.3;    // 贏球至上球迷只在意結果
      }
    } catch (_) {}
    // 素養永遠不回退（一旦球迷學會看 wRC+ 就不會忘記），但成長隨已有水平漸緩
    const diminish = 1 - S.fanDataLiteracy / 140; // literacy=70→0.5倍成長速；100→0.29倍
    S.fanDataLiteracy = clamp(Math.round((S.fanDataLiteracy + growth * Math.max(0.2, diminish)) * 10) / 10, 0, 100);
  } catch (_) {}
}

// 數據素養里程碑郵件：球迷學習進階數據的三個重大時刻
function v55FanLiteracyMail() {
  try {
    if (!S || typeof S.fanDataLiteracy !== "number") return;
    const lit = S.fanDataLiteracy;
    const push = (title, body) => { if (typeof v43PushMail === "function") v43PushMail("球迷", title, body, { kind: "fanLiteracy" }); };
    // 用 S 上的旗標避免重複發送（每個門檻只發一次）
    if (!S._fanLitMilestones) S._fanLitMilestones = {};
    if (lit >= 25 && !S._fanLitMilestones.m25) {
      S._fanLitMilestones.m25 = true;
      push("媒體觀察：球迷論壇開始聊數據了", "「最近幾個球迷論壇出現 OPS+ 和上壘率的討論串，有人質疑『打擊率真的代表一切嗎？』。球迷正在改變——你的交易決策可能不再那麼孤獨。」");
      if (typeof pushNews === "function") pushNews("球迷", "部分球迷開始在社群討論進階數據指標。");
    }
    if (lit >= 50 && !S._fanLitMilestones.m50) {
      S._fanLitMilestones.m50 = true;
      push("媒體專題：數據革命走進看台", "「體育記者開始用 wRC+ 和 FIP 分析你的交易，電視轉播也加入了進階數據板塊。球迷不再只看打擊率——你多年前的眼光，正在被理解。」");
      if (typeof pushNews === "function") pushNews("球迷", "主流媒體開始報導進階數據，球迷對 Moneyball 策略的接受度明顯提升。");
    }
    if (lit >= 75 && !S._fanLitMilestones.m75) {
      S._fanLitMilestones.m75 = true;
      push("球迷來信：我們終於懂了", "「當年你交易掉那個打擊率三成的球星、簽下那個打擊率兩成二但 Framing 聯盟第一的捕手，我們罵你罵了三年。現在我在論壇上自己貼 Framing Runs。你是對的——我們只是花了十幾年才看懂。」");
      if (typeof pushNews === "function") pushNews("球迷", "球迷論壇上有人貼出 Framing Runs 排行榜——當年的孤獨決策終於被理解了。");
    }
  } catch (_) {}
}


/* ====================================================================
   v45 附錄③（#5）：依教練需求的「求購市場」
   Mars 需求：在交易市場依教練需求張貼求購 → 其他球團可能回覆選手名單與報價
   （證明 GM 有去找人）；報價可為多種條件（選手／選手加錢／純錢／多換一）。
   與教練需求單（v41~v44）串接：張貼求購＝對教練展現努力；市場真的沒人→回饋 v44 體諒。
   鐵則：try-catch 防呆；沿用 v43 現金交易執行；不新增共享亂數污染（走 v42rng）。
   ==================================================================== */
// 單一球員是否滿足某教練需求（standalone；同 demandMatches 內層判準）
function v45PlayerMeetsDemand(p, d) {
  try {
    if (!p || !d || !d.need || isInjured(p)) return false;
    if (d.need.pos === "SP") { if (!p.isPitcher || p.role !== "先發") return false; }
    else if (d.need.pos === "RP") { if (!p.isPitcher || p.role === "先發") return false; }
    else if (d.need.pos) { if (p.isPitcher || !p.positions.some(x => x.pos === d.need.pos)) return false; }
    else if (p.isPitcher) return false;
    const attrs = d.need.attrs || {};
    return Object.keys(attrs).every(k => (p[k] || 0) >= attrs[k]);
  } catch (_) { return false; }
}
// AI 對「用自家球員換 GM 資產」開出的要價（回傳一份 response 或 null）
function v45GenerateWantResponse(aiTeam, aiPlayer, wantId) {
  try {
    const seller = aiTeam; // 賣方＝擁有合適球員的 AI
    const buyer = S.teams[S.userTeamId]; // 買方＝玩家
    const ps = (typeof personaOf === "function") ? personaOf(seller) : null;
    // 賣方眼中「自己這名球員」的價值（要價基準）
    const want = (typeof personaTradeValue === "function") ? personaTradeValue(seller, aiPlayer) : tradeValue(aiPlayer);
    // AI 想要略佔便宜到公平（1.0~1.15，弱隊/交情好略鬆）
    const aff = (typeof gmAffinity === "function") ? gmAffinity(seller) : 0;
    const targetRatio = clamp(1.12 - aff * 0.01 + (v42rng() * 0.06 - 0.03), 0.95, 1.2);
    const need = want * targetRatio; // AI 要 GM 拿出的總價值
    // GM 可當籌碼的球員：一二軍非傷兵，價值由賣方眼光估
    const pool = buyer.roster1.concat(buyer.roster2).map(id => S.players[id]).filter(p => p && !isInjured(p));
    const chips = pool.map(p => ({ p, v: (typeof personaTradeValue === "function") ? personaTradeValue(seller, p) : tradeValue(p) })).sort((a, b) => a.v - b.v);
    const roll = v42rng();
    let askIds = [], askCash = 0, kind = "";
    if (roll < 0.20) { // 純現金
      kind = "cash"; askCash = Math.round(need * V43_CASH_PER_VALUE / 100000) * 100000;
    } else if (roll < 0.5) { // 單一球員（不足補現金）
      kind = "player";
      const near = chips.filter(c => c.v <= need * 1.15).sort((a, b) => b.v - a.v)[0] || chips[chips.length - 1];
      if (near) { askIds = [near.p.id]; const gap = need - near.v; askCash = Math.round(clamp(gap, 0, need) * V43_CASH_PER_VALUE / 100000) * 100000; }
    } else if (roll < 0.8) { // 多換一
      kind = "multi"; let acc = 0; const picked = [];
      for (const c of chips.filter(c => c.v < need * 0.8).reverse()) { picked.push(c.p); acc += c.v; if (acc >= need * 0.9 || picked.length >= 3) break; }
      if (picked.length === 0 && chips[0]) picked.push(chips[0].p);
      askIds = picked.map(p => p.id);
      const gap = need - picked.reduce((s, p) => s + ((typeof personaTradeValue === "function") ? personaTradeValue(seller, p) : tradeValue(p)), 0);
      if (gap > 0.3) askCash = Math.round(gap * V43_CASH_PER_VALUE / 100000) * 100000;
    } else { // 選手加錢
      kind = "player_cash";
      const near = chips.filter(c => c.v <= need * 0.8).sort((a, b) => b.v - a.v)[0] || chips[0];
      if (near) { askIds = [near.p.id]; const gap = need - near.v; askCash = Math.round(Math.max(gap, need * 0.25) * V43_CASH_PER_VALUE / 100000) * 100000; }
    }
    if (askIds.length === 0 && askCash <= 0) return null;
    return {
      id: "WR" + (S.v45WantSeq++) + "_" + S.seasonYear, wantId,
      aiTeamId: seller.id, aiPlayerId: aiPlayer.id, kind,
      askPlayerIds: askIds, askCash, status: "open"
    };
  } catch (_) { return null; }
}
// 玩家依某教練需求張貼求購：掃全聯盟合適球員，生成 AI 回覆清單（證明有去找人）
function v45PostWant(demandId) {
  try {
    ensureV45WantState();
    const d = (S.demands || []).find(x => x.id === demandId);
    if (!d) return { ok: false, msg: "找不到這筆教練需求。" };
    if ((S.v45Wants || []).some(w => w.demandId === demandId && w.status === "open"))
      return { ok: false, msg: "這筆需求已在求購市場張貼中。" };
    d.wantPosted = true; // 對教練展現努力的旗標（供 checkDemandFulfilled 過期時減罰）
    const responses = [];
    Object.values(S.teams).forEach(t => {
      if (t.id === S.userTeamId) return;
      // 該 AI 隊中最符合需求、且非當家招牌（避免 AI 送走核心）的候選
      const cands = t.roster1.concat(t.roster2).map(id => S.players[id])
        .filter(p => p && v45PlayerMeetsDemand(p, d) && trueOverall(p) < 88)
        .sort((a, b) => trueOverall(b) - trueOverall(a));
      if (cands.length === 0) return;
      // 每隊最多回 1 名（避免清單爆炸）；AI 願不願賣：核心球員多半留著
      const cand = cands.find(p => trueOverall(p) < 82) || cands[cands.length - 1];
      if (!cand) return;
      const resp = v45GenerateWantResponse(t, cand, "W?");
      if (resp) responses.push(resp);
    });
    const want = {
      id: "W" + (S.v45WantSeq++) + "_" + S.seasonYear, demandId, title: d.title,
      need: d.need, createdDay: S.currentDay || 0, status: "open",
      responses: responses.map(r => (r.wantId = "linked", r))
    };
    S.v45Wants.push(want);
    if (typeof chronicle === "function") chronicle("demand", `依教練需求「${d.title}」張貼求購，向全聯盟探詢`);
    if (responses.length > 0) {
      if (typeof v43PushMail === "function") v43PushMail("交易市場", "求購有了回音", `你為「${d.title}」張貼的求購，收到 ${responses.length} 個球團的報價。`, { kind: "wantResponses", refId: want.id });
      return { ok: true, msg: `已張貼求購。收到 ${responses.length} 個球團回覆報價，請到求購市場檢視。` };
    } else {
      if (typeof v43PushMail === "function") v43PushMail("交易市場", "求購乏人問津", `你為「${d.title}」張貼的求購，市場上暫時沒有球團願意割愛合適人選。`, { kind: "wantNone", refId: want.id });
      return { ok: true, msg: "已張貼求購，但市場上暫時沒有合適人選——這也證明了你確實去找過人。" };
    }
  } catch (_) { return { ok: false, msg: "張貼求購失敗。" }; }
}
// 玩家接受某求購回覆：GM 交出要價（球員＋現金），換回 AI 球員（落 1 軍以填補需求）
function v45AcceptWantResponse(wantId, respId) {
  try {
    ensureV45WantState();
    const want = (S.v45Wants || []).find(w => w.id === wantId);
    if (!want || want.status !== "open") return { ok: false, msg: "此求購已結束。" };
    const resp = (want.responses || []).find(r => r.id === respId);
    if (!resp || resp.status !== "open") return { ok: false, msg: "此報價已失效。" };
    const user = S.teams[S.userTeamId], ai = S.teams[resp.aiTeamId];
    if (!ai) return { ok: false, msg: "對方球團已不存在。" };
    if (typeof ensureFinance === "function") ensureFinance(user);
    if ((resp.askCash || 0) > (user.finance.budget || 0)) return { ok: false, msg: `預算不足：這份報價需付出現金 ${(typeof formatMoney === "function") ? formatMoney(resp.askCash) : resp.askCash}。` };
    const stillHave = (resp.askPlayerIds || []).every(id => user.roster1.includes(id) || user.roster2.includes(id));
    if (!stillHave) return { ok: false, msg: "你名單上已無報價所指定的球員（可能已交易），此報價失效。" };
    // 執行：user 送出 askPlayers+askCash → ai；ai 送出 aiPlayer → user
    if (typeof v43ExecuteTradeWithCash === "function") {
      v43ExecuteTradeWithCash(user.id, ai.id, resp.askPlayerIds || [], [resp.aiPlayerId], resp.askCash || 0, 0);
    } else if (typeof executeTrade === "function") {
      executeTrade(user.id, ai.id, resp.askPlayerIds || [], [resp.aiPlayerId]);
    }
    // 換回的球員落 1 軍以實際填補教練需求（未超編時）
    try {
      const got = S.players[resp.aiPlayerId];
      if (got && got.team === user.id && got.level !== "1軍" && user.roster1.length < 28) {
        user.roster2 = user.roster2.filter(x => x !== got.id);
        if (!user.roster1.includes(got.id)) user.roster1.push(got.id);
        got.level = "1軍";
      }
    } catch (_) {}
    resp.status = "accepted"; want.status = "fulfilled";
    (want.responses || []).forEach(r => { if (r.status === "open") r.status = "void"; });
    const gotName = (S.players[resp.aiPlayerId] || {}).name || "球員";
    if (typeof pushNews === "function") pushNews("交易市場", `${user.name}透過求購市場補進 ${gotName}，回應了教練的補強需求。`);
    if (typeof checkDemandFulfilled === "function") checkDemandFulfilled(); // 若換回球員滿足需求→教練信任+8
    if (typeof persist === "function") persist();
    return { ok: true, msg: `已成交：補進 ${gotName}。教練會看到你的努力。` };
  } catch (_) { return { ok: false, msg: "成交失敗。" }; }
}
function v45CancelWant(wantId) {
  try {
    ensureV45WantState();
    const want = (S.v45Wants || []).find(w => w.id === wantId);
    if (!want) return { ok: false, msg: "找不到此求購。" };
    want.status = "cancelled";
    (want.responses || []).forEach(r => { if (r.status === "open") r.status = "void"; });
    if (typeof persist === "function") persist();
    return { ok: true, msg: "已撤下求購。" };
  } catch (_) { return { ok: false, msg: "操作失敗。" }; }
}

/* ====================================================================
   ██ v47 Z1：球探市場主動找人（自由市場／國際市場）██
   承 v46④「球探盤點內部人選」：需求單除了看陣中，還能「派球探到市場找符合條件者」。
   Mars 拍板：成本＝花球探時間／名額（不花錢）；隔期出結果；結果＝清單＋一鍵導到簽約/報價。
   資訊不對稱：候選以「球探估值」比對門檻（v46Fog 確定性霧化，不污染共享 Math.random），
   因此球探準度低時可能誤報／漏報——這正是球探能力的價值所在。
   鐵則：純附加；不改既有需求單/簽約流程，只在 UI 增加入口。
   ==================================================================== */
const V47_SCOUT_DAYS = 14;            // 出勤天數（隔期出結果）
const V47_SCOUT_MAX_RESULTS = 6;      // 一次回報上限（避免清單過長）

function ensureV47() {
  try {
    if (!S) return;
    if (!S.v47) S.v47 = { ver: 47, missions: [] };
    if (!Array.isArray(S.v47.missions)) S.v47.missions = [];
    if (typeof ensureV48 === "function") try { ensureV48(); } catch (e) {} // v48：榮譽殿堂＋里程碑
  } catch (_) {}
}
// 該區域球探（domestic＝國內自由市場／international＝國際市場）
function v47ScoutOf(team, area) {
  try {
    if (!team || !team.scouts) return null;
    if (typeof scoutVacant === "function" && scoutVacant(team, area)) return null; // 職缺出缺＝無人可派
    return team.scouts[area] || null;
  } catch (_) { return null; }
}
// 名額：同一區域球探同時只能出一趟勤
function v47ScoutBusy(area) {
  ensureV47();
  return S.v47.missions.some(m => m.area === area && !m.done);
}
// 是否已到出結果的時機（跨年亦視為已到期，避免季末派遣卡住）
function v47MissionReady(m) {
  try {
    if (!m || m.done) return false;
    const y = (S.seasonYear || 0), d = (S.currentDay || 0);
    if (y > m.dueYear) return true;
    return y === m.dueYear && d >= m.dueDay;
  } catch (_) { return false; }
}
// 依需求條件掃描市場池（以球探估值比對，體現資訊不對稱）
function v47ScanMarketCandidates(team, d, area) {
  const out = [];
  try {
    if (!team || !d || !d.need) return out;
    const pool = area === "international" ? (S.internationalFreeAgents || {}) : (S.freeAgents || {});
    const need = d.need, attrs = need.attrs || {};
    const sc = v47ScoutOf(team, area);
    const acc = sc ? ((typeof effectiveScoutAccuracy === "function") ? effectiveScoutAccuracy(team, sc) : (sc.accuracy || 50)) : 40;
    const posOk = p => {
      if (!p) return false;
      if (need.pos === "SP") return p.isPitcher && p.role === "先發";
      if (need.pos === "RP") return p.isPitcher && p.role !== "先發";
      if (need.pos) return !p.isPitcher && p.positions && p.positions.some(x => x.pos === need.pos);
      return !p.isPitcher;
    };
    Object.keys(pool).forEach(pid => {
      const p = pool[pid];
      if (!p || !posOk(p)) return;
      let gap = 0, meets = true;
      Object.keys(attrs).forEach(k => {
        // 球探估值（確定性；同球員同季同屬性穩定不跳動）
        const est = (typeof v46Fog === "function") ? v46Fog(p[k] || 0, acc, "Z1:" + p.id + ":" + k) : (p[k] || 0);
        if (est < attrs[k]) { gap += (attrs[k] - est); meets = false; }
      });
      out.push({ id: p.id, meets, gap });
    });
    out.sort((a, b) => (b.meets - a.meets) || (a.gap - b.gap));
  } catch (_) {}
  return out.slice(0, V47_SCOUT_MAX_RESULTS);
}
// 派遣：檢查需求單、球探在編、名額未占用
function v47StartScoutMission(demandId, area) {
  try {
    ensureV47();
    const team = S.teams[S.userTeamId];
    if (!team) return { ok: false, msg: "找不到球隊。" };
    const d = (S.demands || []).find(x => x.id === demandId);
    if (!d || (d.status !== "open" && d.status !== "accepted")) return { ok: false, msg: "此需求已結案，無法派遣球探。" };
    const areaLabel = area === "international" ? "國際市場" : "國內自由市場";
    const sc = v47ScoutOf(team, area);
    if (!sc) return { ok: false, msg: `目前沒有負責${areaLabel}的球探（職位出缺），請先補人。` };
    if (v47ScoutBusy(area)) return { ok: false, msg: `${sc.name}正在出勤中，同一時間只能查訪一個委託。` };
    const m = {
      id: "Z1" + ((S.v47.missions.length + 1) + "") + "-" + (S.seasonYear || 0) + "-" + (S.currentDay || 0),
      demandId, area, scoutId: sc.id,
      startYear: S.seasonYear || 0, startDay: S.currentDay || 0,
      dueYear: S.seasonYear || 0, dueDay: (S.currentDay || 0) + V47_SCOUT_DAYS,
      done: false, results: []
    };
    S.v47.missions.push(m);
    if (typeof chronicle === "function") chronicle("scout", `派遣${sc.name}前往${areaLabel}查訪教練需求`);
    return { ok: true, msg: `已派遣${sc.name}前往${areaLabel}查訪，約 ${V47_SCOUT_DAYS} 天後回報。期間該球探無法接受其他委託。` };
  } catch (e) { return { ok: false, msg: "派遣失敗。" }; }
}
// 到期產出結果（可由每日 tick 或渲染時延遲觸發，兩者皆安全）
function v47MaterializeMission(m) {
  try {
    if (!v47MissionReady(m)) return false;
    const team = S.teams[S.userTeamId];
    const d = (S.demands || []).find(x => x.id === m.demandId);
    m.done = true;
    m.results = (team && d) ? v47ScanMarketCandidates(team, d, m.area) : [];
    m.doneYear = S.seasonYear || 0; m.doneDay = S.currentDay || 0;
    const sc = S.coaches && S.coaches[m.scoutId] ? S.coaches[m.scoutId] : null;
    const scName = (team && team.scouts && team.scouts[m.area] && team.scouts[m.area].name) || (sc ? sc.name : "球探");
    const areaLabel = m.area === "international" ? "國際市場" : "國內自由市場";
    const hit = m.results.filter(r => r.meets).length;
    if (typeof pushNews === "function") {
      pushNews("球探", hit > 0
        ? `${scName}自${areaLabel}回報：找到 ${hit} 名符合教練需求條件的人選。`
        : `${scName}自${areaLabel}回報：目前沒有完全符合條件者，另附最接近的名單供參考。`);
    }
    return true;
  } catch (_) { return false; }
}
// 每日 tick（掛在 simulateDay）；休賽季無日推進時由 UI 端延遲觸發
function v47TickScoutMissions() {
  try {
    ensureV47();
    S.v47.missions.forEach(m => { if (!m.done && v47MissionReady(m)) v47MaterializeMission(m); });
  } catch (_) {}
}
// 取某需求單的球探委託（順便延遲結算，確保休賽季也會出結果）
function v47MissionsForDemand(demandId) {
  ensureV47();
  const list = S.v47.missions.filter(m => m.demandId === demandId);
  list.forEach(m => { if (!m.done && v47MissionReady(m)) v47MaterializeMission(m); });
  return list;
}
// 市場池中取球員物件（供 UI 顯示與一鍵簽約）
function v47MarketPlayer(area, pid) {
  const pool = area === "international" ? (S.internationalFreeAgents || {}) : (S.freeAgents || {});
  return pool[pid] || null;
}

/* ====================================================================
   ██ v48 里程碑事件卡系統 ██
   達成里程碑 → 暫停連續模擬、顯示慶祝事件卡（含球員完整資料）
   → GM 選擇慶祝方式 → 人氣/票房/認同獎勵。
   接近里程碑 → 媒體預告（新聞＋郵件）、不暫停。
   ==================================================================== */

/* 每日心跳：掃描玩家隊球員是否「接近」或「達成」里程碑 */
function v48TickMilestones() {
  try {
    if (!S || !S.v48) return;
    if (S.v48.activeMilestone) return; // 一次一卡
    const team = S.teams && S.teams[S.userTeamId];
    if (!team) return;
    const allIds = (team.roster1 || []).concat(team.roster2 || []);
    for (let i = 0; i < allIds.length; i++) {
      const p = S.players[allIds[i]];
      if (!p || !p.careerStats || !p.seasonStats) continue;
      const ms = v48CheckMilestones(p);
      // 達成 → 事件卡（暫停模擬）
      if (ms.achieved.length > 0) {
        const m = ms.achieved[0]; // 一次處理一個
        S.v48.activeMilestone = {
          playerId: p.id, playerName: p.name, isPitcher: p.isPitcher,
          key: m.key, label: m.label, desc: m.desc, total: m.total, stat: m.stat, threshold: m.threshold,
          year: S.seasonYear, day: S.currentDay
        };
        // 記錄已達成（防重觸發）
        S.v48.milestoneLog.push({ playerId: p.id, key: m.key, year: S.seasonYear, day: S.currentDay });
        if (typeof pushSimInterrupt === "function") pushSimInterrupt(`${icon('milestone')} 里程碑達成：${p.name}・${m.label}！`);
        if (typeof pushNews === "function") pushNews("里程碑", `${icon('milestone')} ${p.name}達成${m.label}里程碑！全城沸騰！`);
        if (typeof persist === "function") persist();
        return; // 一次一卡
      }
      // 接近 → 媒體預告（不暫停，每個里程碑只預告一次）
      ms.approaching.forEach(m => {
        const aKey = p.id + "_" + m.key;
        if (S.v48.milestoneApproaching[aKey]) return;
        S.v48.milestoneApproaching[aKey] = true;
        if (typeof pushNews === "function") pushNews("里程碑", `${icon('milestone-near')} 媒體預告：${p.name}距${m.label}僅差${m.gap}，全城期待中！`);
        // 送郵件
        if (typeof sendMail === "function") {
          sendMail({
            title: `媒體預告：${p.name}即將達成${m.label}`,
            body: `${p.name}的${m.stat === "H" ? "安打" : m.stat === "HR" ? "全壘打" : m.stat === "W" ? "勝投" : m.stat === "SO" ? "三振" : m.stat === "SV" ? "救援" : m.stat === "HD" ? "中繼" : m.stat === "SB" ? "盜壘" : m.stat}數已累積至${m.total}，距${m.label}里程碑僅差${m.gap}。媒體開始追蹤報導，球迷引頸期盼！`,
            category: "里程碑"
          });
        }
      });
    }
  } catch (_) {}
}

/* 解決里程碑事件卡（GM 選擇慶祝方式後呼叫） */
function v48ResolveMilestone(optKey) {
  try {
    const ms = S.v48.activeMilestone;
    if (!ms) return;
    const team = S.teams[S.userTeamId];
    let result = "";
    if (optKey === "celebrate") {
      // 盛大慶祝：花 500萬，人氣+2、票房+15%下場、認同+3
      if (team && team.finance) {
        team.finance.budget -= 500 * 10000;
        team.finance.popularity = Math.min(100, (team.finance.popularity || 50) + 2);
        if (typeof S.fanIdentify === "number") S.fanIdentify = Math.min(100, S.fanIdentify + 3);
      }
      if (!S.v48.milestoneTicketBoost) S.v48.milestoneTicketBoost = 0;
      S.v48.milestoneTicketBoost += 15; // 百分比加成，逐場消耗
      const p = S.players[ms.playerId];
      if (p) { p.morale = clamp((p.morale || 50) + 8, 0, 100); p.loyalty = clamp((p.loyalty || 50) + 5, 0, 100); }
      result = `球團舉辦盛大慶祝儀式（-500萬），${ms.playerName}感動萬分（士氣＋8、忠誠＋5），人氣＋2、球迷認同＋3、近期票房＋15%！`;
    } else if (optKey === "simple") {
      // 簡單致意：免費，人氣+1、認同+1
      if (team && team.finance) {
        team.finance.popularity = Math.min(100, (team.finance.popularity || 50) + 1);
        if (typeof S.fanIdentify === "number") S.fanIdentify = Math.min(100, S.fanIdentify + 1);
      }
      const p = S.players[ms.playerId];
      if (p) p.morale = clamp((p.morale || 50) + 3, 0, 100);
      result = `球團簡單致意肯定${ms.playerName}的里程碑，人氣＋1、認同＋1。`;
    }
    if (typeof pushNews === "function") pushNews("里程碑", result);
    S.v48.activeMilestone = null;
    if (typeof persist === "function") persist();
  } catch (_) { S.v48.activeMilestone = null; }
}

/* v48 HoF 退休勾連：在休賽季 runOffseasonProgression 退休球員後呼叫 */
function v48ProcessRetirements() {
  try {
    if (!S || !S.v48 || !S.retiredPlayers) return;
    const thisYear = Object.values(S.retiredPlayers).filter(p => p.retiredYear === S.seasonYear);
    thisYear.forEach(p => { if (typeof v48ProcessRetirementHof === "function") v48ProcessRetirementHof(p); });
  } catch (_) {}
}

/* ====================================================================
   v55 Culture & City — 季末結算（掛 v41OnSeasonEnd 尾端）
   ==================================================================== */

/* ---------- 城市季末演化（全 20 隊）---------- */
function v55CitySeasonEnd() {
  try {
    if (!S || !S.teams) return;
    if (typeof v55EnsureCityState === "function") v55EnsureCityState();
    Object.keys(S.teams).forEach(function(tid) {
      var team = S.teams[tid];
      var cs = S.cityState[tid];
      if (!team || !cs) return;
      var gp = (team.wins || 0) + (team.losses || 0);
      var wp = gp > 0 ? team.wins / gp : 0.5;
      var last = (S.gmCareer && S.gmCareer.seasons && S.gmCareer.seasons[S.gmCareer.seasons.length - 1]) || null;
      var champ = !!(last && last.year === S.seasonYear && last.champion && tid === S.userTeamId);
      /* AI 球隊的冠軍判定較粗糙——用季後賽表現近似 */
      if (tid !== S.userTeamId && wp >= 0.62) champ = Math.random() < 0.15;
      /* 人口：極緩成長 + 球隊影響 */
      var popDelta = 0.3 + (wp - 0.4) * 2 + (champ ? 1.5 : 0);
      cs.population = clamp(Math.round((cs.population + clamp(popDelta, -1, 2)) * 10) / 10, 10, 100);
      /* 經濟：緩慢隨機波動 + 冠軍加成 */
      var econDelta = (Math.random() - 0.5) * 2 + (champ ? 1.0 : 0);
      cs.economy = clamp(Math.round((cs.economy + clamp(econDelta, -1.5, 1.5)) * 10) / 10, 10, 100);
      /* 球迷世代：你的成績沉澱出世代球迷 */
      var genDelta = wp > 0.55 ? 2 : (wp < 0.45 ? -0.5 : 0.5);
      if (champ) genDelta += 3;
      cs.fanGen = clamp(Math.round((cs.fanGen + genDelta) * 10) / 10, 0, 100);
    });
  } catch (_) {}
}

/* ---------- 文化季末效果（玩家隊）---------- */
function v55CultureSeasonEffects() {
  try {
    if (!S || !S.culture) return;
    var team = S.teams[S.userTeamId];
    if (!team) return;
    /* 球迷耐心：文化 + 城市效果 */
    var cultureMod = (typeof v55CultureFanPatienceMod === "function") ? v55CultureFanPatienceMod() : 0;
    var cityMod = (typeof v55CityFanPatienceMod === "function") ? v55CityFanPatienceMod() : 0;
    if (typeof S.fanPatience === "number") S.fanPatience = clamp(Math.round(S.fanPatience + cultureMod + cityMod), 0, 100);
    /* 忠誠：文化影響全隊忠誠微調 */
    var loyMod = (typeof v55CultureLoyaltyMod === "function") ? v55CultureLoyaltyMod() : 0;
    if (loyMod !== 0) {
      (team.roster1 || []).concat(team.roster2 || []).forEach(function(id) {
        var p = S.players[id];
        if (p && typeof p.loyalty === "number") p.loyalty = clamp(p.loyalty + loyMod, 0, 100);
      });
    }
    /* 文化郵件 */
    v55CultureMail();
  } catch (_) {}
}

/* ---------- 文化里程碑郵件 ---------- */
function v55CultureMail() {
  try {
    if (!S || !S.culture) return;
    var push = function(title, body) { if (typeof v43PushMail === "function") v43PushMail("球迷", title, body, { kind: "culture" }); };
    var labels = S.culture.labels || [];
    var h = S.culture.history || [];
    if (h.length < 3) return;
    if (labels.indexOf("rookieDev") >= 0 && h.length >= 5) {
      push("媒體專題：育成聖地", "「這裡的年輕人知道，只要夠好就有機會上場。球迷們用自家孩子的名字替孩子取名——" + (S.teams[S.userTeamId] || {}).city + "已經成為棒球少年的夢想之地。」");
      if (typeof pushNews === "function") pushNews("球團", (S.teams[S.userTeamId] || {}).city + "獲媒體評選為「最佳育成球團」。");
    }
    if (labels.indexOf("faBigSpend") >= 0 && h.length >= 5) {
      push("球迷來信：贏球至上", "「年年重磅簽約，但看台上的老面孔越來越少。你買得到冠軍，但買不到我們的心。」");
    }
    if (labels.indexOf("trust") >= 0 && h.length >= 5) {
      push("經紀人圈消息", "「跟" + ((S && S.gmName) || "你") + "談事情放心——說到做到。我的球員想去" + ((S.teams[S.userTeamId] || {}).city || "") + "。」");
    }
    if (labels.indexOf("handsOn") >= 0) {
      push("媒體評論：傀儡球團", "「名義上有總教練，實際上GM什麼都管。新聞圈已經把這裡標記為『只有聽話的教練才會來』的地方。」");
    }
    /* 城市里程碑：fanGen ≥ 80 */
    var cs = S.cityState && S.cityState[S.userTeamId];
    if (cs && cs.fanGen >= 80) {
      push("城市特別報導：這座城市是你的", "「三代人看著同一支球隊長大——週末的比賽已經不是娛樂，而是這座城市的生活方式。" + ((S.teams[S.userTeamId] || {}).city || "") + "與它的球隊，已經分不開了。」");
      if (typeof pushNews === "function") pushNews("球迷", ((S.teams[S.userTeamId] || {}).city || "") + "市長宣布球隊創隊紀念日為城市假日。");
    }
  } catch (_) {}
}
