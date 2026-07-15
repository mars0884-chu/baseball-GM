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
  return autoRotation(team, players).map(id => players[id]).filter(Boolean);
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
  return fielders.reduce((s, x) => s + effectivePositionFielding(x.p, x.pos), 0) / fielders.length;
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
    if (c.role === "pinchHit") { p.seasonStats.AB += 1; p.careerStats.AB += 1; if (c.hit) { p.seasonStats.H += 1; p.careerStats.H += 1; p.seasonStats.RBI += 1; p.careerStats.RBI += 1; } }
    if (c.role === "pinchRun" && c.scored) { p.seasonStats.SB += 1; p.careerStats.SB += 1; }
  });
  __benchCredits = [];
}
function simulateGame(homeTeam, awayTeam, players) {
  const hb = teamBattingRating(homeTeam, players), hp = teamPitchingRating(homeTeam, players);
  const ab_ = teamBattingRating(awayTeam, players), ap = teamPitchingRating(awayTeam, players);
  const hDef = teamDefenseRating(homeTeam, players), aDef = teamDefenseRating(awayTeam, players);
  // v26情蒐分析室：依情報獲得微幅期望得分加成（每級+0.05分，雙方各自計算）
  const hAna = (typeof analysisGameBonus === "function") ? analysisGameBonus(homeTeam) : 0;
  const aAna = (typeof analysisGameBonus === "function") ? analysisGameBonus(awayTeam) : 0;
  let homeScore = Math.max(0, Math.round(randNormal(4.5 + (hb - ap) / 10 + HOME_ADVANTAGE_RUNS + hAna - (aDef - 50) / 45, 2.3)));
  let awayScore = Math.max(0, Math.round(randNormal(4.5 + (ab_ - hp) / 10 + aAna - (hDef - 50) / 45, 2.3)));
  if (homeScore === awayScore) { if (Math.random() < 0.52) homeScore++; else awayScore++; }
  // 抗壓性：關鍵時刻（比分接近）的攻守投表現差異，反映在勝負邊緣的一分之差
  if (Math.abs(homeScore - awayScore) <= 2) {
    const hC = teamComposureRating(homeTeam, players), aC = teamComposureRating(awayTeam, players);
    const clutchDiff = (hC - aC) / 100;
    if (Math.random() < Math.abs(clutchDiff) * 0.6) {
      if (clutchDiff > 0 && homeScore <= awayScore) homeScore++;
      else if (clutchDiff < 0 && awayScore <= homeScore) awayScore++;
    }
  }
  // v37⑥ 代打/代跑/代守：自家隊近戰局面發動板凳專員（AI隊不設定故略過）
  if (homeTeam.id === S.userTeamId) { const r = applyBenchRoleNudge(homeTeam, homeScore, awayScore); homeScore = r[0]; awayScore = r[1]; }
  else if (awayTeam.id === S.userTeamId) { const r = applyBenchRoleNudge(awayTeam, awayScore, homeScore); awayScore = r[0]; homeScore = r[1]; }
  return { homeScore, awayScore };
}

/* ---------- 個人成績分配（依球員能力值統計模擬，非逐球模擬） ---------- */
function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function attributeGameStats(team, players, runsScored, runsAllowed, won) {
  const batters = getLineupBatters(team, players);
  if (batters.length > 0) {
    const orderBonus = batters.map((b, i) => clamp(1.15 - i * 0.03, 0.85, 1.15));
    const weights = batters.map((b, i) => Math.max(5, (b.contact * 0.5 + b.power * 0.3 + b.eye * 0.2)) * orderBonus[i]);
    batters.forEach((b, i) => {
      const ab = Math.round(4 * (weights[i] / (weights.reduce((a, c) => a + c, 0) / batters.length)) * 0.5 + 2);
      b.seasonStats.AB += ab; b.careerStats.AB += ab;
      b.seasonStats.G += 1; b.careerStats.G += 1;
    });
    const totalHits = clamp(Math.round(runsScored * 1.6 + randInt(-1, 2)), 0, 20);
    for (let h = 0; h < totalHits; h++) {
      const pick = weightedPick(batters, weights);
      pick.seasonStats.H++; pick.careerStats.H++;
      if (Math.random() < pick.power / 380) {
        pick.seasonStats.HR++; pick.careerStats.HR++;
        const rbi = randInt(1, 3);
        pick.seasonStats.RBI += rbi; pick.careerStats.RBI += rbi;
      } else if (Math.random() < 0.35) {
        const rbi = 1;
        pick.seasonStats.RBI += rbi; pick.careerStats.RBI += rbi;
      }
      if (Math.random() < pick.steal / 450) {
        pick.seasonStats.SB += 1; pick.careerStats.SB += 1;
      }
    }
    const totalBB = randInt(1, 5);
    for (let i = 0; i < totalBB; i++) {
      const pick = weightedPick(batters, batters.map(b => Math.max(5, b.eye)));
      pick.seasonStats.BB++; pick.careerStats.BB++;
    }
    const totalSO = randInt(3, 10);
    for (let i = 0; i < totalSO; i++) {
      const pick = weightedPick(batters, batters.map(b => Math.max(5, 100 - b.contact)));
      pick.seasonStats.SO++; pick.careerStats.SO++;
    }
  }

  const rotation = getRotationPitchers(team, players);
  let starter = null;
  if (rotation.length > 0) {
    if (typeof team.starterIndex !== "number") team.starterIndex = 0;
    starter = rotation[team.starterIndex % rotation.length];
    team.starterIndex++;
  }
  if (starter) {
    addFatigue(starter, 32); // v25：先發登板累積疲勞（輪值人數越少者恢復不及、表現下滑）
    const ip = clamp(5 + Math.round((starter.stamina - 50) / 25), 3, 9);
    starter.seasonStats.G += 1; starter.careerStats.G += 1;
    starter.seasonStats.IP += ip; starter.careerStats.IP += ip;
    const qualityFactor = clamp(1.3 - (starter.control + starter.velocity - 100) / 200, 0.55, 1.5);
    const starterER = clamp(Math.round(runsAllowed * (ip / 9) * qualityFactor), 0, runsAllowed);
    starter.seasonStats.ER += starterER; starter.careerStats.ER += starterER;
    const so = clamp(Math.round(starter.control > 60 ? randInt(4, 9) : randInt(2, 7)), 0, 15);
    starter.seasonStats.SO += so; starter.careerStats.SO += so;
    const bb = randInt(0, 4);
    starter.seasonStats.BB += bb; starter.careerStats.BB += bb;
    const hitsAllowed = clamp(Math.round((runsAllowed + randInt(2, 6)) * (ip / 9)), 1, 15);
    starter.seasonStats.H += hitsAllowed; starter.careerStats.H += hitsAllowed;
    if (won) { starter.seasonStats.W += 1; starter.careerStats.W += 1; }
    else { starter.seasonStats.L += 1; starter.careerStats.L += 1; }
  }
  // v34：後援登板的投球內容（三振/保送/被安打/偶發失分），抗壓越高失分機率越低，讓後援防禦率合理而非0.00
  function applyRelieverLine(rp) {
    const so = randInt(0, 2), bb = Math.random() < 0.3 ? 1 : 0, h = randInt(0, 2);
    rp.seasonStats.SO += so; rp.careerStats.SO += so;
    rp.seasonStats.BB += bb; rp.careerStats.BB += bb;
    rp.seasonStats.H += h; rp.careerStats.H += h;
    const erChance = clamp(0.3 - (rp.composure - 50) / 250, 0.08, 0.45);
    if (Math.random() < erChance) { rp.seasonStats.ER += 1; rp.careerStats.ER += 1; }
  }
  if (won && (runsScored - runsAllowed) <= 3 && (runsScored - runsAllowed) >= 1) {
    ensureBullpenOrder(team, players);
    const closerOrder = (team.bullpenOrder["終結"] || []).map(id => players[id]).filter(p => p && team.roster1.includes(p.id) && !isInjured(p));
    // v25疲勞調度：疲勞>70的後援自動跳過，改用順位次一位（強迫玩家輪替牛棚）
    const closer = closerOrder.find(p => fatigueOf(p) <= 70) || closerOrder[0] || team.roster1.map(id => players[id]).filter(p => p && p.isPitcher && p.role === "終結" && !isInjured(p)).sort((a, b) => trueOverall(b) - trueOverall(a))[0];
    if (closer && closer !== starter) {
      addFatigue(closer, 22);
      closer.seasonStats.G += 1; closer.careerStats.G += 1;
      // v34：後援登板同步累計局數與投球內容（修正救援王/中繼王因IP=0被排除在獎項池外的漏洞）
      closer.seasonStats.IP += 1; closer.careerStats.IP += 1;
      applyRelieverLine(closer);
      const saveChance = clamp(0.55 + (closer.composure - 50) / 120, 0.25, 0.95);
      if (Math.random() < saveChance) { closer.seasonStats.SV += 1; closer.careerStats.SV += 1; }
    }
    const setupOrder = (team.bullpenOrder["布局"] || []).concat(team.bullpenOrder["中繼"] || [])
      .map(id => players[id]).filter(p => p && team.roster1.includes(p.id) && p !== starter && p !== closer && !isInjured(p));
    if (setupOrder.length > 0 && Math.random() < 0.6) {
      const setup = setupOrder.find(p => fatigueOf(p) <= 70) || setupOrder[0]; // v25疲勞調度
      addFatigue(setup, 22);
      setup.seasonStats.G += 1; setup.careerStats.G += 1;
      setup.seasonStats.IP += 1; setup.careerStats.IP += 1; // v34：同上，中繼登板累計局數
      applyRelieverLine(setup);
      const holdChance = clamp(0.5 + (setup.composure - 50) / 120, 0.2, 0.9);
      if (Math.random() < holdChance) { setup.seasonStats.HD += 1; setup.careerStats.HD += 1; }
    }
  }
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
      ev_bumpAll(team, -4, 0); return "你選擇不介入，裂痕擴大，全隊士氣－4。"; }
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
      if (p) { p.morale = clamp(ev_m(p) - 8, 0, 100); p.condition = -1; } return `${nm}遭禁賽冷處理，士氣－8、近期狀態下滑。`; }
  },
  sponsorBonus: {
    category: "營運",
    weight: team => (team.finance && team.finance.popularity >= 45) ? 2 : 1,
    build: team => ({ title: "贊助商臨時加碼", desc: "一家贊助商想搭配一檔限定促銷，願意額外挹注獎金——但你得配合辦一場小型行銷活動。", ctx: {},
      options: [{ key: "accept", label: "接受並辦促銷" }, { key: "decline", label: "婉拒" }] }),
    apply: (team, opt) => {
      if (opt === "accept") { ev_budget(team, 3000 * 10000 - 500 * 10000); ev_pop(team, 1); return "促銷檔期圓滿（活動成本500萬），淨入帳2500萬、人氣＋1。"; }
      return "你婉拒了這次合作，維持現狀。"; }
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
      if (p) p.morale = clamp(ev_m(p) + 2, 0, 100); return `你讓${nm}維持節奏，順其自然（士氣＋2）。`; }
  }
};

function tickEvents() {
  const team = S.teams[S.userTeamId];
  if (!team) return;
  if (S.activeEvent) return; // 一次只處理一個事件，不洗版
  if (!S.eventSeason || S.eventSeason.year !== S.seasonYear) S.eventSeason = { year: S.seasonYear, count: 0 };
  if (S.eventSeason.count >= EVENT_SEASON_CAP) return;      // 每季上限
  if (S.currentDay < (S.eventCooldownUntil || 0)) return;   // 冷卻中
  if (Math.random() > EVENT_DAILY_CHANCE) return;
  const weighted = Object.keys(EVENT_DEFS).map(k => ({ k, w: Math.max(0, EVENT_DEFS[k].weight(team)) })).filter(x => x.w > 0);
  if (!weighted.length) return;
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total, key = weighted[0].k;
  for (const x of weighted) { r -= x.w; if (r <= 0) { key = x.k; break; } }
  const built = EVENT_DEFS[key].build(team);
  if (!built) return;
  S.activeEvent = { key, category: EVENT_DEFS[key].category, title: built.title, desc: built.desc, ctx: built.ctx || {}, options: built.options, year: S.seasonYear };
  S.eventSeason.count++;
  S.eventCooldownUntil = S.currentDay + EVENT_COOLDOWN_DAYS;
  if (typeof pushSimInterrupt === "function") pushSimInterrupt(`突發事件：${built.title}`); // 中斷連續模擬讓玩家決定
  if (typeof pushNews === "function") pushNews("事件", `突發事件：${built.title}`);
  persist();
}

function resolveEvent(optKey) {
  const ev = S.activeEvent;
  if (!ev) return;
  const def = EVENT_DEFS[ev.key];
  const team = S.teams[S.userTeamId];
  let result = "";
  if (def && team && (ev.options || []).some(o => o.key === optKey)) {
    try { result = def.apply(team, optKey, ev.ctx || {}) || ""; } catch (e) { result = ""; }
  }
  if (!S.eventLog) S.eventLog = [];
  S.eventLog.unshift({ year: ev.year, title: ev.title, choice: optKey, result });
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
  // v37⑧：玩家隊守備守位缺口——每日檢查，缺口未解前逐日停下連續模擬並跳提示（系統不硬塞守位不符者）
  {
    const utg = S.teams[S.userTeamId];
    if (utg && typeof lineupPositionGaps === "function" && typeof pushSimInterrupt === "function") {
      const gaps = lineupPositionGaps(utg);
      if (gaps.length > 0) pushSimInterrupt(`⚠️ 守備守位無法遞補：${gaps.join("、")}——請至先發打線手動調整（系統不會塞守位不符的球員硬撐）`);
    }
  }
  updateNewsAfterDay(results, newInjuries); // v25新聞跑馬燈
  if (typeof tickAiTrades === "function") tickAiTrades();       // v32：AI互相交易撮合/風聲倒數/AI主動提案
  if (typeof tickKpiMidSeason === "function") tickKpiMidSeason(); // v32：KPI季中檢視與止血目標追蹤
  if (typeof tickEvents === "function") tickEvents();            // v36第10階段：事件系統逐日加權觸發
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

