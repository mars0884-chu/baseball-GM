/* ---------- IndexedDB 存檔 ---------- */
const DB_NAME = "baseball_gm_db", STORE = "state";
function openDB() {
  return new Promise((resolve, reject) => {
    // 環境不支援 IndexedDB（部分手機預覽／隱私模式）→ 直接當作無存檔，不阻斷開機
    if (typeof indexedDB === "undefined" || !indexedDB) { reject(new Error("no-indexeddb")); return; }
    let settled = false;
    const finish = (fn, arg) => { if (!settled) { settled = true; fn(arg); } };
    // 逾時保險：某些受限環境 open 不觸發 onsuccess/onerror（會讓 await 永遠卡住＝白屏開不了）→ 逾時就當作無存檔繼續開機
    const timer = setTimeout(() => finish(reject, new Error("indexeddb-timeout")), 1500);
    let req;
    try { req = indexedDB.open(DB_NAME, 1); }
    catch (e) { clearTimeout(timer); finish(reject, e); return; }
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = e => { clearTimeout(timer); finish(resolve, e.target.result); };
    req.onerror = e => { clearTimeout(timer); finish(reject, e); };
    req.onblocked = () => { clearTimeout(timer); finish(reject, new Error("indexeddb-blocked")); };
  });
}
async function saveState(state, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, key || "save1");
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e);
  });
}
async function loadState(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key || "save1");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = e => reject(e);
  });
}
async function clearState(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key || "save1");
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e);
  });
}

/* ---------- v34：手動存檔槽位（3槽）＋匯出/匯入 JSON ----------
   自動存檔沿用 save1（每次操作後 persist()），手動槽位以 {meta, state} 包裝存於 slot1~slot3；
   匯出JSON讓玩家在換裝置/清瀏覽器資料前備份進度（PWA的IndexedDB會隨瀏覽器資料被清除）。 */
const MANUAL_SLOT_KEYS = ["slot1", "slot2", "slot3"];
function buildSaveMeta() {
  const t = S && S.userTeamId ? S.teams[S.userTeamId] : null;
  return {
    savedAt: Date.now(), seasonYear: S ? S.seasonYear : 0, currentDay: S ? S.currentDay : 0,
    teamName: t ? t.name : "（未選隊）", gmName: S ? S.gmName : "", version: 34
  };
}
async function saveToSlot(slotKey) {
  if (!S) return false;
  S.idSeq = ID_SEQ;
  await saveState({ meta: buildSaveMeta(), state: S }, slotKey);
  return true;
}
async function loadSlotMeta() {
  const out = {};
  for (const k of MANUAL_SLOT_KEYS) {
    try { const w = await loadState(k); out[k] = (w && w.meta) ? w.meta : null; }
    catch (e) { out[k] = null; }
  }
  return out;
}
async function loadFromSlot(slotKey) {
  const w = await loadState(slotKey);
  if (!w || !w.state) return false;
  hydrateLoadedState(w.state); // 06模組：完整升級鏈＋畫面還原
  persist(); // 讀檔後同步覆蓋自動存檔，維持「目前進度＝自動槽」的既有語意
  return true;
}
async function deleteSlot(slotKey) { try { await clearState(slotKey); } catch (e) { /* 刪除失敗不阻斷 */ } }
function exportSaveJson() {
  if (!S) return;
  S.idSeq = ID_SEQ;
  const payload = JSON.stringify({ meta: buildSaveMeta(), state: S });
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `baseball_gm_save_y${S.seasonYear}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function importSaveJson(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { return { ok: false, msg: "檔案不是有效的JSON格式。" }; }
  const st = parsed && parsed.state ? parsed.state : parsed; // 相容直接匯出S的舊格式
  if (!st || !st.teams || !st.players) return { ok: false, msg: "JSON內容不是本遊戲的存檔。" };
  hydrateLoadedState(st);
  persist();
  return { ok: true, msg: "匯入成功！" };
}

/* ---------- 全域狀態 ---------- */
let S = null;
let UI = { screen: "loading", rosterTab: "1軍", flash: null, selectedPlayerId: null, confirmReset: false };
const app = document.getElementById("app");

function newGame(gmNameInput, teamNameInput, leagueNameInput) {
  ID_SEQ = 1;
  const gmName = gmNameInput.trim() || generateChineseName();
  const leagueName = leagueNameInput.trim() || (choice(LEAGUE_PREFIX) + "職業棒球聯盟");
  const userTeamName = teamNameInput.trim();
  const { teams, players, coaches } = buildLeague(userTeamName || null);
  const schedule = buildSeasonSchedule(teams);
  S = {
    gmName, leagueName, teams, players, coaches, schedule,
    currentDay: 0, seasonYear: 1, resultsLog: [], playoffs: null, retiredPlayers: {}, lastAwards: null,
    draft: null, offseasonSummary: null, pendingCoachHires: [], freeAgents: {},
    userTeamId: userTeamName ? "T0" : null, idSeq: ID_SEQ,
    gameStarted: false, pendingContractRenewals: [], forcedCutRequired: false,
    // v25新增狀態
    newsFeed: [], springCampDoneYear: 0, springCamp: null, sponsorMission: null,
    intlTournament: null, intlBoost: null, nationFriendship: null, traitsSeeded: true,
    // v27新增狀態
    gmCareer: { trust: 50, startYear: 1, seasons: [], championships: 0, fired: false, firedYear: null, stints: [], teamName: null },
    seasonKPI: null, jobOffers: null,
    // v28新增狀態：代理人事務所（球員經紀人情蒐揭露 + GM與經紀人關係）
    agency: { scouted: {}, rel: {} },
    // v31新增狀態：教練/球探到期續約佇列、自主訓練窗報告、上季均衡池
    pendingStaffRenewals: [], selfTrainingReport: null, lastBalancePool: 0
  };
  ensureAllFinance();
  Object.values(S.teams).forEach(t => refreshPayroll(t, S.players));
  if (userTeamName) {
    beginInitialOffseason();
  } else {
    UI.screen = "teamSelect";
    persist();
    render();
  }
}

// 新開局的起點代表「西元2025年10月，上一任GM的球季剛結束」，
// 尚未有任何合約到期，所以直接以空白摘要進入「休賽季異動摘要」畫面，
// 玩家從這裡點「進入選秀會」代表接下來11~12月的選秀補強動作，完成後才會抵達隔年3月春訓（正式進入dashboard）。
function beginInitialOffseason() {
  fixUserStartingBudget(); // v34：新開局玩家隊可動用預算固定6000萬（重置不再隨機）
  refillInternationalMarket();
  S.offseasonSummary = {
    retiredCount: 0, coachesReplaced: 0, myRetiredIds: [],
    myFinanceReport: null, contractsRenewed: 0, contractsDeparted: []
  };
  S.pendingContractRenewals = [];
  S.forcedCutRequired = false;
  UI.screen = "offseasonSummary";
  persist();
  render();
}

function persist() { S.idSeq = ID_SEQ; saveState(S).catch(() => {}); }

/* ---------- v25 新聞跑馬燈 ---------- */
function pushNews(type, text) {
  S.newsFeed = S.newsFeed || [];
  const cal = (typeof getGameCalendar === "function" && S.schedule) ? getGameCalendar() : null;
  S.newsFeed.unshift({ day: S.currentDay, dateLabel: cal ? `${cal.year}年${cal.monthLabel}` : `第${S.seasonYear}年`, type, text });
  if (S.newsFeed.length > 30) S.newsFeed.length = 30;
}

/* ---------- v25 舊存檔升級（v24以前存檔載入時一次性補齊新欄位） ---------- */
function ensureV25() {
  if (!S) return;
  S.newsFeed = S.newsFeed || [];
  if (typeof S.springCampDoneYear !== "number") {
    // 舊存檔：球季已開打或已在進行中，視同本季春訓已完成，避免被春訓關卡卡住
    S.springCampDoneYear = (S.currentDay > 0 || S.gameStarted) ? S.seasonYear : 0;
  }
  if (typeof ensureTraitsAndBunting === "function") ensureTraitsAndBunting();
  Object.values(S.players).forEach(p => {
    if (typeof p.condition !== "number") p.condition = 0;
    if (p.isPitcher && typeof p.fatigue !== "number") p.fatigue = 0;
    if (p.internationalDutyGamesLeft) delete p.internationalDutyGamesLeft; // 舊制季中徵召殘留清除
  });
}

// v26舊存檔升級：傷病史陣列、傷勢部位補值、跨季殘留特訓清除、三種新設施lazy補值
function ensureV26() {
  if (!S) return;
  Object.values(S.players).forEach(p => {
    if (!Array.isArray(p.injuryHistory)) p.injuryHistory = [];
    if (p.injury && !p.injury.part) p.injury.part = "背部"; // 舊制傷勢無部位 → 給中性預設，避免復發/降評查表落空
    if (p.midTraining && p.midTraining.year !== S.seasonYear) delete p.midTraining; // 跨季殘留清除
  });
  if (S.teams && typeof ensureFacilities === "function") {
    Object.values(S.teams).forEach(t => ensureFacilities(t)); // 宿舍/情蒐分析室/復健中心補值（玩家0、AI隨機0~1）
  }
}

/* ====================================================================
   v27 GM信任度／KPI系統：
   每季開幕前高層依球隊戰力評估開出2項年度目標（1成績類＋1經營類），
   年度結算依達成與否增減信任度（0~100，起始50；難度越高的目標沒達成扣越少），
   信任歸零＝遭解職（Game Over，顯示生涯總結）。
   ==================================================================== */
function ensureGmCareer() {
  if (!S.gmCareer) S.gmCareer = { trust: 50, startYear: S.seasonYear, seasons: [], championships: 0, fired: false, firedYear: null, stints: [], teamName: null };
  if (!Array.isArray(S.gmCareer.stints)) S.gmCareer.stints = []; // v28：跨球團生涯段落
  return S.gmCareer;
}
/* ====================================================================
   v28 東山再起與生涯聲望：
   解職後不再是死路，玩家可接受其他球團（弱隊為主）的聘僱邀約東山再起。
   生涯總戰績/冠軍跨球團持續累加；履歷（聲望）決定邀約數量、可選隊伍強度、
   以及新東家開出的起始信任度。
   ==================================================================== */
// 生涯聲望分（0~100）：由生涯總勝率與冠軍數綜合，供邀約與起始信任度使用
function careerReputation() {
  const c = ensureGmCareer();
  const allSeasons = careerAllSeasons();
  const tw = allSeasons.reduce((s, x) => s + x.wins, 0);
  const tl = allSeasons.reduce((s, x) => s + x.losses, 0);
  const wp = (tw + tl) > 0 ? tw / (tw + tl) : 0.5;
  const champs = c.championships || 0;
  const playoffs = allSeasons.filter(x => x.madePlayoffs).length;
  // 勝率貢獻(±40)、冠軍(每座+12)、季後賽(每次+3)，基準50
  // v33-A2：解職紀錄每次-6；奪冠後主動跳槽的話題聲望每次+8；沉潛充電每次+5
  const rep = 50 + (wp - 0.5) * 160 + champs * 12 + playoffs * 3
    - (c.firedCount || 0) * 6 + (c.champJumps || 0) * 8 + (c.sabbaticals || 0) * 5;
  return Math.round(clamp(rep, 0, 100));
}
// 生涯所有球季（含已封存的stints與當前執掌）
function careerAllSeasons() {
  const c = ensureGmCareer();
  const past = (c.stints || []).flatMap(s => s.seasons || []);
  return past.concat(c.seasons || []);
}
// 把「當前這段執掌」封存進stints（解職或轉隊時呼叫）
function archiveCurrentStint() {
  const c = ensureGmCareer();
  if (!c.seasons || c.seasons.length === 0) { c.seasons = []; return; }
  const team = S.teams[S.userTeamId];
  c.stints.push({
    teamName: c.teamName || (team ? team.name : "球團"),
    startYear: c.startYear, endYear: c.firedYear || S.seasonYear,
    seasons: c.seasons.slice(),
    wins: c.seasons.reduce((s, x) => s + x.wins, 0),
    losses: c.seasons.reduce((s, x) => s + x.losses, 0),
    championships: c.seasons.filter(x => x.champion).length
  });
  c.seasons = []; // 當前段清空，新東家重新累積該段賽季（但總冠軍數championships不歸零）
}
/* v33-A1 高層委任：每份邀約附帶新東家的建隊委任（為期2季），影響起始信任、KPI走向與財務特例 */
const MANDATE_META = {
  rebuild:   { name: "重建委任", trust: +5, short: "起始信任+5", desc: "高層要的是未來：頭兩年KPI改為養成導向（戰績只需守住4成勝率、養年輕人），起始信任+5。" },
  contend:   { name: "爭冠委任", trust: -5, short: "起始信任-5／奢侈稅門檻+15%", desc: "老闆砸錢要立刻看到成績：頭兩年KPI直接掛「晉級季後賽」且未達扣分加重25%，交換條件是奢侈稅門檻放寬15%；起始信任-5。" },
  stopbleed: { name: "止血委任", trust: 0, short: "財務KPI達成信任加倍", desc: "球團帳面在流血：頭兩年KPI改為「年度損益轉正」與「進場率提升」，達成信任獎勵加倍。" }
};
// 依球隊體質擲出委任型：財務惡化→止血；弱隊→重建；中上游→爭冠
function rollOfferMandate(teamId, rank) {
  const t = S.teams[teamId];
  ensureFinance(t);
  const rpt = t.finance.lastSeasonReport;
  const bleeding = t.finance.budget < 0 || (rpt && rpt.net < 0);
  if (bleeding && Math.random() < 0.7) return "stopbleed";
  if (rank >= 13) return "rebuild";
  if (rank <= 8) return "contend";
  return Math.random() < 0.5 ? "rebuild" : "contend";
}
// 解職後產生1~3個聘僱邀約（弱隊為主；聲望越高、邀約越多、可及隊伍越強、起始信任越高）
function generateJobOffers() {
  const rep = careerReputation();
  const c = ensureGmCareer();
  // v33：東山再起生涯僅此一次——已用過機會的人，市場不會再給第二次
  if (c.fired && (c.rehires || 0) >= 1) { S.jobOffers = []; return []; }
  // 依戰力排名把非玩家球隊由弱到強排序
  const ranked = Object.values(S.teams)
    .filter(t => t.id !== S.userTeamId)
    .map(t => ({ id: t.id, name: t.name, rank: teamStrengthRank(t.id) }))
    .sort((a, b) => b.rank - a.rank); // rank大＝弱，排前面
  const offerCount = rep >= 70 ? 3 : (rep >= 40 ? 2 : 1);
  // 可及隊伍：聲望低只能碰最弱幾隊；聲望高可及中上游；v33聲望≥85「名帥」可及全聯盟、沉潛歸來可及範圍+3
  let reachTop = rep >= 85 ? ranked.length : (rep >= 70 ? 12 : (rep >= 40 ? 8 : 5));
  if (c.fired && (c.sabbaticals || 0) > 0) reachTop = Math.min(ranked.length, reachTop + 3);
  const pool = ranked.slice(0, reachTop);
  const picked = shuffle(pool).slice(0, offerCount);
  const offers = picked.map(o => {
    // 新東家起始信任：基準40，聲望每高於50加成、弱隊求才心切略加；v33委任另有增減
    const weakBonus = clamp((o.rank - 10) * 1.2, 0, 12);
    const mandate = rollOfferMandate(o.id, o.rank);
    const mAdj = (MANDATE_META[mandate] || { trust: 0 }).trust;
    const startTrust = Math.round(clamp(40 + (rep - 50) * 0.4 + weakBonus + mAdj, 15, 80));
    return { teamId: o.id, teamName: o.name, startTrust, strengthRank: o.rank, mandate };
  });
  S.jobOffers = offers;
  return offers;
}
// v33：委任是否生效中（回傳型別或null；委任為期2季）
function mandateActive() {
  const c = S.gmCareer;
  const m = c && c.mandate;
  if (!m || !m.type) return null;
  return (S.seasonYear >= m.startYear && S.seasonYear < m.startYear + (m.years || 2)) ? m.type : null;
}
// 接受某支球團的邀約：東山再起（生涯累計不歸零，接手該隊現有陣容進入其休賽季）
// v33：voluntary=true 為「奪冠後功成身退跳槽」——不消耗僅此一次的東山再起機會，並累積話題聲望
function takeJobOffer(teamId, voluntary) {
  const c = ensureGmCareer();
  const offer = (S.jobOffers || []).find(o => o.teamId === teamId);
  if (!offer) return;
  if (voluntary) c.champJumps = (c.champJumps || 0) + 1;
  else c.rehires = (c.rehires || 0) + 1; // 東山再起僅此一次，用掉就沒了
  // 封存前一段執掌
  archiveCurrentStint();
  // 卸下舊隊、接手新隊
  const oldId = S.userTeamId;
  if (oldId && S.teams[oldId]) S.teams[oldId].isUser = false;
  const newTeam = S.teams[teamId];
  newTeam.isUser = true;
  S.userTeamId = teamId;
  // 重整生涯狀態：信任沿用新東家開的起始值、fired解除、新段落起始年
  c.fired = false; c.firedYear = null;
  c.trust = offer.startTrust;
  c.startYear = S.seasonYear + 1; // 下一段從隔年球季算起
  c.teamName = newTeam.name;
  // v33：記錄新東家的建隊委任（為期2季，影響KPI與財務特例）
  c.mandate = offer.mandate ? { type: offer.mandate, startYear: S.seasonYear + 1, years: 2 } : null;
  S.jobOffers = null;
  const mm = offer.mandate && MANDATE_META[offer.mandate];
  // 產生本季（隔年）KPI並帶入新東家的休賽季流程
  pushNews("高層", `${newTeam.name}宣布延攬 ${S.gmName} 出任新任GM（起始信任度 ${offer.startTrust}${mm ? `／${mm.name}` : ""}）${voluntary ? "——冠軍GM主動跳槽震撼聯盟！" : "！"}`);
  // 直接進入新東家的休賽季摘要（沿用beginInitialOffseason的空白摘要起點）
  refillInternationalMarket();
  S.offseasonSummary = { retiredCount: 0, coachesReplaced: 0, myRetiredIds: [], myFinanceReport: null, contractsRenewed: 0, contractsDeparted: [], rehired: true, rehiredTeam: newTeam.name, startTrust: offer.startTrust };
  S.pendingContractRenewals = [];
  // v35根因修復：解職當年替「舊隊」建立的到期幕僚續約佇列必須在換隊時清空，
  // 否則新東家的休賽季會被殘留佇列攔截——續約談成的是舊隊教練（玩家隊教練看似「不能更換」）、
  // 點不續約卻誤刪「新隊」現任（vacateStaff作用在S.userTeamId），把新隊教練團/球探打洞。
  // 舊隊到期幕僚交回AI自動補人邏輯（次年processCoach/ScoutContracts會處理）。
  S.pendingStaffRenewals = [];
  S.pendingCoachHires = [];
  if (UI.negotiation && UI.negotiation.kind === "staffRenewal") UI.negotiation = null;
  S.offseasonEnteredYear = S.seasonYear; // v35：標記本年度休賽季流程已展開（供重載畫面還原）
  S.forcedCutRequired = false;
  generateSeasonKPI();
  UI.screen = "offseasonSummary";
  persist();
  render();
}

// 依1軍平均實力估算全聯盟戰力排名（1＝最強），用來決定高層目標的野心程度
function teamStrengthRank(teamId) {
  const arr = Object.values(S.teams).map(t => ({
    id: t.id,
    v: t.roster1.map(id => S.players[id]).filter(Boolean).reduce((s, p) => s + trueOverall(p), 0) / Math.max(1, t.roster1.length)
  }));
  arr.sort((a, b) => b.v - a.v);
  return arr.findIndex(x => x.id === teamId) + 1;
}
function generateSeasonKPI() {
  if (!S || !S.userTeamId) return;
  ensureGmCareer();
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  const rank = teamStrengthRank(S.userTeamId);
  const goals = [];
  // v33-A1：委任期間，KPI改由委任目標池決定（不走一般池）
  const mtype = (typeof mandateActive === "function") ? mandateActive() : null;
  if (mtype === "rebuild") {
    goals.push({ key: "winpct40", label: "重建委任：球季勝率守住4成即可", diff: 1, mandate: "rebuild" });
    goals.push({ key: "youth5", label: "重建委任：季末1軍至少5名24歲以下年輕球員", diff: 2, mandate: "rebuild" });
  } else if (mtype === "contend") {
    goals.push({ key: "playoffs", label: "爭冠委任：晉級季後賽（未達扣分加重25%）", diff: 2, mandate: "contend", mandateHard: true });
    const popT = Math.min(95, (team.finance.popularity || 50) + 3);
    goals.push(choice([
      { key: "noDeficit", label: "年度財務結算不得出現赤字", diff: 1 },
      { key: "popularity", label: `球隊人氣提升至 ${popT} 以上`, target: popT, diff: 2 }
    ]));
  } else if (mtype === "stopbleed") {
    goals.push({ key: "profitPos", label: "止血委任：年度損益轉正（達成信任加倍）", diff: 2, mandate: "stopbleed", mandateDouble: true });
    const attT = Math.min(95, Math.round(teamAttendanceRate(team) * 100) + 5);
    goals.push({ key: "attendUp", label: `止血委任：主場平均進場率提升至 ${attT}% 以上（達成信任加倍）`, target: attT, diff: 2, mandate: "stopbleed", mandateDouble: true });
  } else {
  // 成績類目標：戰力越強、高層胃口越大（難度diff越高＝沒達成時扣的信任越少）
  if (rank <= 4) {
    goals.push(choice([
      { key: "champion", label: "奪下總冠軍", diff: 3 },
      { key: "final", label: "打進總冠軍賽", diff: 2 },
      { key: "playoffs", label: "晉級季後賽", diff: 1 }
    ]));
  } else if (rank <= 12) {
    goals.push(choice([
      { key: "playoffs", label: "晉級季後賽", diff: 2 },
      { key: "winpct50", label: "球季勝率達成5成", diff: 2 },
      { key: "div2", label: "分區排名前2", diff: 2 }
    ]));
  } else {
    goals.push(choice([
      { key: "winpct45", label: "球季勝率達成4成5", diff: 1 },
      { key: "win55", label: "全季拿下55勝以上", diff: 1 },
      { key: "playoffs", label: "以黑馬之姿晉級季後賽", diff: 3 }
    ]));
  }
  // 經營類目標
  const popTarget = Math.min(95, (team.finance.popularity || 50) + 3);
  goals.push(choice([
    { key: "noDeficit", label: "年度財務結算不得出現赤字", diff: 1 },
    { key: "popularity", label: `球隊人氣提升至 ${popTarget} 以上`, target: popTarget, diff: 2 },
    { key: "youth", label: "季末1軍陣中至少3名23歲以下年輕球員", diff: 2 }
  ]));
  } // v33：委任分支結束
  S.seasonKPI = { year: S.seasonYear, goals, settled: false, midReviewDone: false, midReview: null, stopBleed: null, reductionAccepted: false };
  // v32：KPI連續性記憶——連2年全達成→高層胃口變大（獎勵加成）；連2年全滅→留校察看（懲罰加重）
  const streak = S.kpiStreak || { pass: 0, fail: 0 };
  if (streak.pass >= 2) {
    S.seasonKPI.escalated = true;
    pushNews("高層", "高層對你連年達標讚譽有加，今年的期待（與獎勵）也跟著水漲船高。");
  }
  if (streak.fail >= 2) {
    S.seasonKPI.probation = true;
    pushNews("高層", "⚠️ 連續兩年目標全數落空，高層宣布你進入「留校察看」狀態——今年再失敗，信任將加重扣減。");
  }
  pushNews("高層", `高層公布第${S.seasonYear}年球季目標：${goals.map(g => g.label).join("、")}。（目前信任度 ${S.gmCareer.trust}）`);
}

/* v37⑤ 開季目標「談條件式」協商：開季前期一次性，把成績類主目標降一階；
   交換條件＝達成的信任獎勵減半（沿用降標 reduced），且若連降階後的目標都沒達成，
   額外扣信任＝該目標未達成基準扣分的一半。委任目標不可協商、一季一次。 */
const KPI_LOWER_CHAIN = {
  champion: { key: "final",    label: "打進總冠軍賽",     diff: 2 },
  final:    { key: "playoffs", label: "晉級季後賽",       diff: 1 },
  playoffs: { key: "winpct50", label: "球季勝率達成5成",   diff: 1 },
  div2:     { key: "winpct50", label: "球季勝率達成5成",   diff: 1 },
  winpct50: { key: "winpct45", label: "球季勝率達成4成5", diff: 1 },
  win55:    { key: "win50",    label: "全季拿下50勝以上",   diff: 1 },
  winpct45: { key: "winpct40", label: "球季勝率守住4成",   diff: 1 }
};
function kpiNegotiableGoalIndex() {
  if (!S.seasonKPI) return -1;
  return S.seasonKPI.goals.findIndex(g => KPI_LOWER_CHAIN[g.key] && !g.bonus && !g.mandate);
}
function canNegotiateKpi() {
  if (!S.seasonKPI || S.seasonKPI.year !== S.seasonYear) return false;
  if (S.seasonKPI.settled || S.seasonKPI.negotiated) return false;
  if ((S.currentDay || 0) > 7) return false; // 只在開季前期（前7個比賽日）可協商
  return kpiNegotiableGoalIndex() >= 0;
}
function negotiateKpiGoalDown() {
  if (!canNegotiateKpi()) { UI.flash = "目前無法與高層協商目標（僅開季前期、每季一次、委任目標不可協商）。"; render(); return; }
  const idx = kpiNegotiableGoalIndex();
  const g = S.seasonKPI.goals[idx];
  const low = KPI_LOWER_CHAIN[g.key];
  const oldLabel = g.label;
  S.seasonKPI.goals[idx] = { key: low.key, label: low.label + "（開季協商降階）", diff: low.diff, reduced: true, negotiated: true, target: g.target };
  S.seasonKPI.negotiated = true;
  if (typeof pushNews === "function") pushNews("高層", `你與高層協商降低目標：「${oldLabel}」→「${low.label}」。高層同意，但開出條件——達成的信任獎勵減半；且若連這個較低的目標都達不到，將額外扣信任。`);
  UI.flash = `已與高層協商：目標降為「${low.label}」（達成獎勵減半；若仍未達成會額外扣信任）。`;
  persist(); render();
}

/* ---------- v32：KPI季中檢視（一次）＋止血目標追蹤 ---------- */
const KPI_PERF_KEYS = ["champion", "final", "playoffs", "div2", "winpct50", "winpct45", "win55"];
const KPI_EASIER_MAP = { champion: { key: "final", label: "打進總冠軍賽", diff: 2 }, final: { key: "playoffs", label: "晉級季後賽", diff: 1 },
  playoffs: { key: "winpct45", label: "球季勝率達成4成5", diff: 1 }, div2: { key: "winpct45", label: "球季勝率達成4成5", diff: 1 },
  winpct50: { key: "winpct45", label: "球季勝率達成4成5", diff: 1 }, winpct45: { key: "winpct40", label: "球季勝率守住4成", diff: 1 },
  win55: { key: "win50", label: "全季拿下50勝以上", diff: 1 } };
function tickKpiMidSeason() {
  if (!S || !S.seasonKPI || S.seasonKPI.year !== S.seasonYear || S.seasonKPI.settled) return;
  const team = S.teams[S.userTeamId];
  if (!team) return;
  const gp = team.wins + team.losses;
  // 止血目標追蹤：滿15戰即時判定
  const sb = S.seasonKPI.stopBleed;
  if (sb && sb.achieved === null && gp - sb.fromGames >= sb.span) {
    sb.achieved = (team.wins - sb.fromWins) >= sb.need;
    pushNews("高層", sb.achieved ? `止血成功！近${sb.span}戰拿下${team.wins - sb.fromWins}勝，高層稍稍鬆了口氣。` : `止血目標未達（近${sb.span}戰僅${team.wins - sb.fromWins}勝），高層臉色更加難看。`);
  }
  // 季中檢視（賽程過半，一次）
  if (S.seasonKPI.midReviewDone || S.currentDay < Math.round(S.schedule.length / 2)) return;
  S.seasonKPI.midReviewDone = true;
  const perf = S.seasonKPI.goals.find(g => KPI_PERF_KEYS.includes(g.key));
  if (!perf || gp === 0) return;
  const wp = team.wins / gp;
  const rank = standingsForDivision(team.division).findIndex(t => t.id === S.userTeamId) + 1;
  const ahead = (perf.key === "winpct50" && wp >= 0.58) || (perf.key === "winpct45" && wp >= 0.53)
    || (perf.key === "win55" && wp * S.schedule.length * (team.wins > 0 ? 1 : 1) >= 63 && wp >= 0.5)
    || (["champion", "final", "playoffs", "div2"].includes(perf.key) && rank === 1 && wp >= 0.55);
  const behind = (perf.key === "winpct50" && wp < 0.44) || (perf.key === "winpct45" && wp < 0.39)
    || (perf.key === "win55" && wp < 0.38)
    || (["champion", "final", "playoffs", "div2"].includes(perf.key) && rank >= 4 && wp < 0.45);
  const aiDeals = S.aiTrade ? (S.aiTrade.rumors || []).filter(r => r.done).length : 0;
  if (ahead) {
    const bonus = perf.key === "champion" ? { key: "winpct55", label: "球季勝率衝上5成5", diff: 2 } : { key: "champion", label: "一鼓作氣奪下總冠軍", diff: 3 };
    bonus.bonus = true;
    S.seasonKPI.goals.push(bonus);
    pushNews("高層", `季中檢視：戰績大幅超前，高層興奮加碼目標「${bonus.label}」——達成信任獎勵加倍，未達成不扣分。`);
    if (typeof pushSimInterrupt === "function") pushSimInterrupt(`KPI季中檢視：高層加碼目標「${bonus.label}」`); // v34
  } else if (behind) {
    S.seasonKPI.midReview = { type: "offer", easier: KPI_EASIER_MAP[perf.key] || { key: "winpct40", label: "球季勝率守住4成", diff: 1 }, decided: false, origLabel: perf.label };
    pushNews("高層", `季中檢視：進度嚴重落後${aiDeals > 0 ? `（別隊本季已完成${aiDeals}筆補強交易，你呢？）` : ""}，高層召見——降標或硬拚，你得做個決定。（詳見主控台）`);
    if (typeof pushSimInterrupt === "function") pushSimInterrupt("KPI季中檢視：高層召見，需決定降標或硬拚"); // v34
  }
  persist();
}
/* 玩家選擇①：接受降標——主目標換成較易版本（達成獎勵減半），且本季信任正向增益打75折 */
function acceptKpiReduction() {
  const mr = S.seasonKPI && S.seasonKPI.midReview;
  if (!mr || mr.decided) return;
  mr.decided = true; mr.choice = "reduce";
  const idx = S.seasonKPI.goals.findIndex(g => KPI_PERF_KEYS.includes(g.key));
  if (idx >= 0) {
    const e = Object.assign({}, mr.easier, { reduced: true });
    S.seasonKPI.goals[idx] = e;
    S.seasonKPI.reductionAccepted = true;
    pushNews("高層", `你接受降標：目標改為「${e.label}」。高層同意，但也記上一筆——本季信任加分將打折計算。`);
  }
  persist();
}
/* 玩家選擇②：硬拚原目標＋附贈止血短期目標（近15戰8勝，達成+3信任、未達成不扣） */
function declineKpiReduction() {
  const mr = S.seasonKPI && S.seasonKPI.midReview;
  if (!mr || mr.decided) return;
  mr.decided = true; mr.choice = "fight";
  const team = S.teams[S.userTeamId];
  S.seasonKPI.stopBleed = { fromGames: team.wins + team.losses, fromWins: team.wins, need: 8, span: 15, achieved: null };
  pushNews("高層", `你選擇硬拚原目標。高層拋下狠話：「那就先讓我看到止血——接下來15戰至少8勝。」（達成信任+3）`);
  persist();
}
// 主控台即時進度文字（球季進行中顯示用）
function kpiProgress(goal) {
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  const gp = team.wins + team.losses;
  const wp = gp > 0 ? team.wins / gp : 0;
  const divRank = standingsForDivision(team.division).findIndex(t => t.id === team.id) + 1;
  switch (goal.key) {
    case "champion": case "final": case "playoffs": case "div2":
      return `目前分區第 ${divRank} 名（${team.wins}勝${team.losses}敗）`;
    case "winpct50": case "winpct45": case "winpct40": case "winpct55":
      return `目前勝率 ${pct(team.wins, team.losses)}`;
    case "win55": case "win50": case "win70":
      return `目前 ${team.wins} 勝`;
    case "youth5":
      return `目前1軍24歲以下 ${team.roster1.map(id => S.players[id]).filter(p => p && p.age <= 24).length} 人`;
    case "profitPos":
      return `目前預算 ${formatMoney(team.finance.budget)}（季末結算看損益）`;
    case "attendUp":
      return `目前進場率 ${Math.round(teamAttendanceRate(team) * 100)}%／目標 ${goal.target}%`;
    case "noDeficit":
      return `目前預算 ${formatMoney(team.finance.budget)}`;
    case "popularity":
      return `目前人氣 ${team.finance.popularity}／目標 ${goal.target}`;
    case "youth":
      return `目前1軍23歲以下 ${team.roster1.map(id => S.players[id]).filter(p => p && p.age <= 23).length} 人`;
    default: return "";
  }
}
// 年度結算：在enterOffseason中、財務結算後呼叫（赤字目標需看結算後預算）
function settleSeasonKPI(financeReports) {
  if (!S.seasonKPI || S.seasonKPI.year !== S.seasonYear || S.seasonKPI.settled) return null;
  const team = S.teams[S.userTeamId];
  if (!team) return null;
  const career = ensureGmCareer();
  ensureFinance(team);
  const uid = S.userTeamId;
  const champ = S.playoffs && S.playoffs.champion === uid;
  const madeFinal = champ || !!(S.playoffs && S.playoffs.round === 2 && S.playoffs.matchups && S.playoffs.matchups.some(m => m.a === uid || m.b === uid));
  const madePlayoffs = !!(S.playoffs && (S.playoffs.qualifiedTeamIds || []).includes(uid));
  const gp = team.wins + team.losses;
  const wp = gp > 0 ? team.wins / gp : 0;
  const divRank = standingsForDivision(team.division).findIndex(t => t.id === uid) + 1;
  const check = g => {
    switch (g.key) {
      case "champion": return champ;
      case "final": return madeFinal;
      case "playoffs": return madePlayoffs;
      case "div2": return divRank <= 2;
      case "winpct50": return wp >= 0.5;
      case "winpct45": return wp >= 0.45;
      case "winpct40": return wp >= 0.40;   // v32降標目標
      case "winpct55": return wp >= 0.55;   // v32加碼目標
      case "win55": return team.wins >= 55;
      case "win50": return team.wins >= 50; // v32降標目標
      case "win70": return team.wins >= 70; // v32加碼目標（保留）
      case "noDeficit": return team.finance.budget >= 0;
      case "popularity": return (team.finance.popularity || 0) >= g.target;
      case "youth": return team.roster1.map(id => S.players[id]).filter(p => p && p.age <= 23).length >= 3;
      case "youth5": return team.roster1.map(id => S.players[id]).filter(p => p && p.age <= 24).length >= 5; // v33重建委任
      case "profitPos": return !!(team.finance.lastSeasonReport && team.finance.lastSeasonReport.net > 0);   // v33止血委任
      case "attendUp": return Math.round(teamAttendanceRate(team) * 100) >= g.target;                        // v33止血委任
      default: return false;
    }
  };
  const trustBefore = career.trust;
  let trustDelta = 0;
  const probation = !!S.seasonKPI.probation;         // v32：留校察看——未達成扣分×1.5
  const reduced75 = !!S.seasonKPI.reductionAccepted;  // v32：接受降標——正向加分×0.75
  const escalated = !!S.seasonKPI.escalated;          // v32：連年達標——達成加分+2
  const results = S.seasonKPI.goals.map(g => {
    const achieved = check(g);
    let delta;
    if (g.bonus) {
      delta = achieved ? 2 * (4 + 3 * g.diff) : 0;   // v32加碼目標：達成獎勵加倍、未達成不扣
    } else {
      delta = achieved ? (4 + 3 * g.diff) : -(14 - 3 * g.diff); // 達成：+7/+10/+13；未達：-11/-8/-5（越難的目標沒達成扣越少）
      if (achieved && g.mandateDouble) delta *= 2;                     // v33止血委任：達成信任獎勵加倍
      if (!achieved && g.mandateHard) delta = Math.round(delta * 1.25); // v33爭冠委任：未達扣分加重25%
      if (achieved && g.reduced) delta = Math.round(delta * 0.5);   // v32：降標後的目標達成獎勵減半
      if (achieved && escalated) delta += 2;
      if (!achieved && probation) delta = Math.round(delta * 1.5);
      if (achieved && reduced75) delta = Math.round(delta * 0.75);
      if (!achieved && g.negotiated) delta += Math.round(-(14 - 3 * g.diff) * 0.5); // v37⑤：開季協商降階後仍未達成→額外扣信任（基準的一半）
    }
    trustDelta += delta;
    return { label: g.label, achieved, delta };
  });
  // v32：止血目標結算（宣告時即時判定，這裡入帳）
  const sb = S.seasonKPI.stopBleed;
  if (sb && sb.achieved === true) { trustDelta += 3; results.push({ label: "止血目標（15戰8勝）", achieved: true, delta: 3 }); }
  else if (sb && sb.achieved === false) { results.push({ label: "止血目標（15戰8勝）", achieved: false, delta: 0 }); }
  if (champ) {
    trustDelta += 8; career.championships++; // 奪冠另加信任紅利
    S.champStreak = (S.champStreak || 0) + 1;  // v36 ②連霸計數（未奪冠歸零，見下）
    applyChampionshipRewards(team, S.champStreak); // v36 冠軍回饋①②③④
  } else {
    S.champStreak = 0;
  }
  // v32：KPI連續性記錄（只看非加碼/非止血的正規目標）
  const regular = results.filter(r => S.seasonKPI.goals.some(g => g.label === r.label && !g.bonus));
  if (!S.kpiStreak) S.kpiStreak = { pass: 0, fail: 0 };
  if (regular.length > 0 && regular.every(r => r.achieved)) { S.kpiStreak.pass++; S.kpiStreak.fail = 0; }
  else if (regular.length > 0 && regular.every(r => !r.achieved)) { S.kpiStreak.fail++; S.kpiStreak.pass = 0; }
  else { S.kpiStreak.pass = 0; S.kpiStreak.fail = 0; }
  career.trust = clamp(trustBefore + trustDelta, 0, 100);
  career.seasons.push({ year: S.seasonYear, wins: team.wins, losses: team.losses, madePlayoffs, champion: champ, results, trustAfter: career.trust });
  S.seasonKPI.settled = true;
  S.seasonKPI.results = results;
  const fired = career.trust <= 0;
  if (fired) {
    career.fired = true;
    career.firedYear = S.seasonYear;
    career.firedCount = (career.firedCount || 0) + 1; // v33：解職紀錄（聲望每次-6）
    career.mandate = null; // v33：人都走了，委任自然作廢
    career.teamName = career.teamName || team.name; // v28：記下遭解職時的隊名
    pushNews("高層", `震撼彈！高層對球隊表現徹底失去耐心，GM ${S.gmName} 遭到解職。`);
  } else {
    pushNews("高層", `年度考核：${results.map(r => `${r.label}${r.achieved ? "✅" : "❌"}`).join("、")}${champ ? "、奪冠紅利+8" : ""}，信任度 ${trustBefore} → ${career.trust}。`);
  }
  persist();
  return { results, trustDelta, trustBefore, trustAfter: career.trust, fired, champ };
}

/* ====================================================================
   v33-A3 沉潛一年：解職後拒絕所有邀約，讓聯盟無人駕駛照常運轉一季。
   歸來時聲望+5（充電加成）、邀約重抽且可及範圍+3名。生涯限用一次。
   簡化說明：沉潛期間舊東家名單仍掛在 userTeamId 之下代管（合約自動續、
   選秀全跳過、傷勢保守處理），該季不產生KPI、不計入GM生涯年資。
   ==================================================================== */
function runSabbaticalYear() {
  const c = ensureGmCareer();
  if (!c.fired || (c.rehires || 0) >= 1 || (c.sabbaticals || 0) >= 1 || S.sabbatical) return;
  S.sabbatical = true;
  S.jobOffers = null;
  pushNews("聯盟", `${S.gmName} 婉拒所有邀約，宣布沉潛一年沉澱自己。聯盟照常運轉。`);
  // ① 自動完成解職當年的休賽季（舊東家自理）：合約自動續、幕僚自動續、選秀全跳過
  if (typeof autoRenewAllPending === "function" && (S.pendingContractRenewals || []).length > 0) autoRenewAllPending();
  S.forcedCutRequired = false;
  if (typeof autoRenewAllStaff === "function" && (S.pendingStaffRenewals || []).length > 0) autoRenewAllStaff();
  if (!S.draft || !S.draft.active) startDraft();
  confirmSkipAllRemaining();
  finalizeNewSeason(); // sabbatical 期間不產生KPI（各生成點均有守衛）
  if (typeof setSpringNation === "function") { setSpringNation(HOME_NATION_NAME); executeSpringCamp(); }
  // ② 整季無人駕駛模擬
  let guard = 0;
  while (simulateDay(S) && guard < 400) guard++;
  // 舊東家的待決策重傷自動採保守療法（沒有GM在任拍板）
  const exTeam = S.teams[S.userTeamId];
  if (exTeam && typeof decideSurgeryFor === "function") {
    exTeam.roster1.concat(exTeam.roster2).forEach(id => {
      const p = S.players[id];
      if (p && p.injury && p.injury.pendingSurgery) decideSurgeryFor(p, "conservative", exTeam);
    });
  }
  generatePlayoffs();
  doSimulatePlayoffsToEnd();
  if (typeof isIntlYear === "function" && isIntlYear(S.seasonYear)) { runIntlTournament(); finishIntlTournament(); }
  else enterOffseason();
  // ③ 歸來：聲望+5、邀約重抽（可及範圍+3）
  S.sabbatical = false;
  c.sabbaticals = (c.sabbaticals || 0) + 1;
  generateJobOffers();
  pushNews("聯盟", `沉潛一年歸來，${S.gmName} 重新叩關GM市場（業界聲望 ${careerReputation()}）。`);
  UI.screen = "gameOver";
  persist();
  render();
}

/* v33-A2 奪冠後功成身退：冠軍年的休賽季可探詢跳槽市場（不消耗東山再起機會、話題聲望+8） */
function offerChampJumpMarket() {
  const c = ensureGmCareer();
  if (c.fired) return null;
  if (S.champJumpYear === S.seasonYear) return S.jobOffers; // 本年已探詢過，沿用
  S.champJumpYear = S.seasonYear;
  return generateJobOffers();
}

/* ---------- v27 舊存檔升級 ---------- */
function ensureV27() {
  if (!S) return;
  ensureGmCareer();
  // 球團個性與GM記憶補值（依隊序輪配7型，結果對同一存檔穩定）
  Object.values(S.teams).forEach((t, i) => {
    if (!t.persona || !TEAM_PERSONAS[t.persona]) t.persona = PERSONA_KEYS[i % PERSONA_KEYS.length];
    if (!t.gmMemory) t.gmMemory = { affinity: 0, events: [], rejects: 0 };
  });
  // 各池球員補發經紀人
  const fill = p => { if (p && (!p.agent || !AGENT_TYPES[p.agent.type])) p.agent = rollAgent(); };
  Object.values(S.players).forEach(fill);
  Object.values(S.freeAgents || {}).forEach(fill);
  Object.values(S.internationalFreeAgents || {}).forEach(fill);
  // 球季進行中載入的舊檔：補生成本季KPI（v33：沉潛期間不生成）
  if (S.gameStarted && S.userTeamId && !S.sabbatical && (!S.seasonKPI || S.seasonKPI.year !== S.seasonYear)) generateSeasonKPI();
}

/* ---------- v28 舊存檔升級 ---------- */
function ensureV28() {
  if (!S) return;
  ensureGmCareer(); // 內含stints補值
  if (!S.gmCareer.teamName && S.userTeamId && S.teams[S.userTeamId]) S.gmCareer.teamName = S.teams[S.userTeamId].name;
  if (typeof ensureAgency === "function") ensureAgency(); // 代理人事務所資料
  if (typeof S.jobOffers === "undefined") S.jobOffers = null;
}

// v29舊存檔一次性升級：行銷活動複選制、轉播贊助方案物件、上季成績快照欄位、手術費欄位。
function ensureV29() {
  if (!S) return;
  Object.values(S.teams || {}).forEach(t => {
    if (!t.finance) return;
    // 行銷：舊三方案 → 新活動組合（費用已付過，不重扣；效果沿用已存的aggregates再重算含attPct）
    if (!Array.isArray(t.finance.marketingCampaigns)) {
      const legacy = (typeof LEGACY_MARKETING_MAP !== "undefined" && t.finance.marketingPlan) ? (LEGACY_MARKETING_MAP[t.finance.marketingPlan] || []) : [];
      t.finance.marketingCampaigns = (t.finance.marketingYear === S.seasonYear) ? legacy.slice() : [];
      delete t.finance.marketingPlan;
      if (typeof recomputeMarketingEffects === "function" && t.finance.marketingYear === S.seasonYear) recomputeMarketingEffects(t);
    }
    if (typeof t.finance.marketingAttPct !== "number") t.finance.marketingAttPct = 0;
    // 轉播/贊助：舊offers（有amount欄位）換成新方案物件；已簽的舊「純數字合約」保留（結算端視為定額，本季有效）
    if (t.finance.dealsYear === S.seasonYear && Array.isArray(t.finance.broadcastOffers) && t.finance.broadcastOffers[0] && t.finance.broadcastOffers[0].amount != null) {
      t.finance.broadcastOffers = generateDealOffers(t, "broadcast");
      t.finance.sponsorOffers = generateDealOffers(t, "sponsor");
    }
  });
  // 球員欄位補值：上季成績快照（舊檔沒有就先留空，跑完一季自然會有）
  Object.values(S.players || {}).forEach(p => {
    if (typeof p.lastSeasonStats === "undefined") p.lastSeasonStats = null;
  });
}

/* v30舊存檔一次性升級：
   - 格位陣列/主客戰績/主場帳補值
   - merchMult 廢除補償：舊檔球場等級≥2者（玩家與AI一視同仁），按「每級補發1座基礎設施」
     換算過去為周邊倍率付出的升級費，避免改制後周邊收入斷崖（補發順序：販賣部→飲料吧→小吃街→廁所擴建→大型計分螢幕→啤酒花園）。
   - 只在尚無 stadiumSlots 欄位時執行一次，不會重複補發。 */
const V30_GRANT_ORDER = ["vendor", "drink", "food", "toilet", "screen", "beer"];
function ensureV30() {
  if (!S) return;
  Object.values(S.teams || {}).forEach(t => {
    if (!t.finance) return;
    ensureFacility(t);
    ensureFacilityFund(t); // v30 AI設施發展金欄位
    const firstTime = !Array.isArray(t.facility.stadiumSlots);
    ensureStadiumSlots(t);
    if (firstTime && t.facility.level >= 2) {
      const grants = Math.min(t.facility.level - 1, V30_GRANT_ORDER.length, stadiumSlotCount(t));
      for (let i = 0; i < grants; i++) t.facility.stadiumSlots.push(V30_GRANT_ORDER[i]);
    }
    ensureHomeAwayLedger(t);
  });
}

/* v31舊存檔一次性升級：
   - 球場格位屋齡平行陣列 slotBuilt（ensureStadiumSlots 會補齊，視既有設施為當年落成、逐年自然老化）
   - 球探補上合約年限 contractYears（v30以前的球探沒有到期概念）
   - 均衡稅收支欄位歸零、教練/球探空缺旗標初始化 */
function ensureV31() {
  if (!S) return;
  Object.values(S.teams || {}).forEach(t => {
    ensureFacility(t);
    if (typeof ensureStadiumSlots === "function") ensureStadiumSlots(t); // 補 slotBuilt
    if (t.finance) { t.finance.balanceTaxPaid = t.finance.balanceTaxPaid || 0; t.finance.balanceTaxReceived = t.finance.balanceTaxReceived || 0; }
    if (t.scouts) {
      ["domestic", "international", "trade"].forEach(area => {
        const s = t.scouts[area];
        if (s && typeof s.contractYears !== "number") s.contractYears = randInt(1, 4);
      });
    }
    if (!t.staffVacancies) t.staffVacancies = { coach: {}, scout: {} }; // v31：教練/球探空缺記錄（加成歸零用）
  });
  if (!Array.isArray(S.pendingStaffRenewals)) S.pendingStaffRenewals = [];
  // v31-B：舊存檔球員補上特殊技/稱號欄位
  Object.values(S.players || {}).forEach(p => { if (!Array.isArray(p.specialSkills)) p.specialSkills = []; });
}

/* v32舊存檔一次性升級：
   - AI交易狀態容器（依年份自動重置）與KPI連續性計數
   - draftDoneYear：舊存檔視為選秀已過（休賽季存檔的交易窗口不因升級被鎖死）
   - seasonKPI補上季中檢視/止血/降標欄位 */
function ensureV32() {
  if (!S) return;
  if (typeof ensureAiTradeState === "function") ensureAiTradeState();
  if (!S.kpiStreak) S.kpiStreak = { pass: 0, fail: 0 };
  if (S.draftDoneYear === undefined) S.draftDoneYear = S.seasonYear;
  if (S.seasonKPI && S.seasonKPI.year === S.seasonYear) {
    if (S.seasonKPI.midReviewDone === undefined) S.seasonKPI.midReviewDone = false;
    if (S.seasonKPI.midReview === undefined) S.seasonKPI.midReview = null;
    if (S.seasonKPI.stopBleed === undefined) S.seasonKPI.stopBleed = null;
    if (S.seasonKPI.reductionAccepted === undefined) S.seasonKPI.reductionAccepted = false;
  }
}

/* ---------- v33 舊存檔升級：委任/聲望事件/沉潛/事務所新容器 ---------- */
function ensureV33() {
  if (!S) return;
  const c = ensureGmCareer();
  // 舊檔的stints一律來自「解職→東山再起」（v28唯一來源），據此回填解職與再起次數
  if (c.firedCount === undefined) c.firedCount = (c.stints || []).length + (c.fired ? 1 : 0);
  if (c.rehires === undefined) c.rehires = (c.stints || []).length;
  if (c.champJumps === undefined) c.champJumps = 0;
  if (c.sabbaticals === undefined) c.sabbaticals = 0;
  if (c.mandate === undefined) c.mandate = null;
  if (S.sabbatical === undefined) S.sabbatical = false;
  if (S.champJumpYear === undefined) S.champJumpYear = null;
  if (typeof ensureAgency === "function") ensureAgency(); // 內含v33新容器（wined/referrals/intel）補值
}

function pickTeam(teamId) {
  S.teams[teamId].isUser = true;
  S.userTeamId = teamId;
  beginInitialOffseason();
}

/* ---------- v34：季中事件暫停時程 ----------
   連續模擬（快轉一週/模擬至球季結束）遇到需要玩家決策的事件即中斷：
   (a)我隊先發陣容（打線/輪值/牛棚配置）球員受傷 (b)AI主動交易提案 (c)KPI季中檢視 (d)交易風聲情報。
   事件由各模組透過 pushSimInterrupt() 回報，迴圈每天檢查、有事件就停下並顯示原因。 */
function pushSimInterrupt(msg) {
  if (!S) return;
  if (!S.simInterrupts) S.simInterrupts = [];
  S.simInterrupts.push(msg);
  if (S.simInterrupts.length > 30) S.simInterrupts.shift(); // 沉潛/煙霧測試等原生迴圈不消化中斷，封頂避免膨脹
}
function consumeSimInterrupts() {
  const list = (S && S.simInterrupts) ? S.simInterrupts : [];
  if (S) S.simInterrupts = [];
  return list;
}
function doSimulateDay() {
  if (S) S.simInterrupts = [];
  const results = simulateDay(S);
  if (!results) { UI.flash = "本季賽事已全部結束！"; }
  const ints = consumeSimInterrupts();
  if (ints.length > 0) UI.flash = `⏸️ ${ints.join("；")}`;
  persist();
  render();
}
function doSimulateWeek() {
  if (S) S.simInterrupts = [];
  for (let i = 0; i < 7; i++) {
    if (!simulateDay(S)) break;
    if (S.simInterrupts && S.simInterrupts.length > 0) break; // v34：事件中斷
  }
  const ints = consumeSimInterrupts();
  if (ints.length > 0) UI.flash = `⏸️ 時程暫停：${ints.join("；")}處置完成後可繼續模擬。`;
  persist();
  render();
}
function doSimulateToEnd() {
  if (S) S.simInterrupts = [];
  let guard = 0;
  while (simulateDay(S) && guard < 400) {
    guard++;
    if (S.simInterrupts && S.simInterrupts.length > 0) break; // v34：事件中斷
  }
  const ints = consumeSimInterrupts();
  if (ints.length > 0) UI.flash = `⏸️ 時程暫停：${ints.join("；")}處置完成後可繼續模擬。`;
  persist();
  render();
}

/* ---------- v34存檔升級 ---------- */
function ensureV34() {
  if (!S) return;
  if (!S.simInterrupts) S.simInterrupts = []; // v34：連續模擬中斷事件容器
}

/* ==== v35：二周目幕僚佇列/空缺一致性修復 ====
   殘留佇列消毒：pendingStaffRenewals 只保留「確實屬於玩家現任球隊」的項目。
   （東山再起換隊後，舊隊項目一律剔除；教練需 staffId 與現任職位吻合、球探需 scoutId 與現任吻合） */
function sanitizeStaffRenewals() {
  if (!S || !Array.isArray(S.pendingStaffRenewals) || !S.userTeamId) return 0;
  const team = S.teams[S.userTeamId];
  if (!team) { S.pendingStaffRenewals = []; return 0; }
  const before = S.pendingStaffRenewals.length;
  S.pendingStaffRenewals = S.pendingStaffRenewals.filter(item => {
    if (!item) return false;
    if (item.kind === "coach") {
      const c = S.coaches[item.staffId];
      if (!c || c.team !== S.userTeamId) return false;
      return !!(team.coachStaff && team.coachStaff[item.level] && team.coachStaff[item.level][item.role] === item.staffId);
    }
    if (item.kind === "scout") {
      const s = team.scouts ? team.scouts[item.area] : null;
      return !!(s && (!item.scoutId || s.id === item.scoutId));
    }
    return false;
  });
  return before - S.pendingStaffRenewals.length;
}

function ensureV35() {
  if (!S) return;
  // ① 殘留佇列消毒（修復既有存檔中「解職換隊」帶著跑的舊隊項目）
  sanitizeStaffRenewals();
  // ② 各隊空缺旗標與實際狀態同步：
  //    - 職位有人 → 清旗標（AI自動補人歷來不清旗標，導致玩家離開的舊隊加成永久歸零）
  //    - AI隊職位無人 → 直接補人並清旗標（AI不走空缺制）
  //    - 玩家隊職位無人 → 立旗標（維持v31空缺語意，畫面已防呆）
  Object.values(S.teams).forEach(t => {
    const isUser = t.id === S.userTeamId;
    if (t.coachStaff) {
      ["1軍", "2軍"].forEach(level => {
        COACH_ROLES.forEach(role => {
          const cid = t.coachStaff[level][role];
          const has = cid && S.coaches[cid];
          if (has) { setCoachVacancy(t, level, role, false); return; }
          if (!isUser) {
            const nc = generateCoach(t.id, level, role);
            S.coaches[nc.id] = nc;
            t.coachStaff[level][role] = nc.id;
            setCoachVacancy(t, level, role, false);
          } else {
            t.coachStaff[level][role] = null;
            setCoachVacancy(t, level, role, true);
          }
        });
      });
    }
    if (t.scouts) {
      ["domestic", "international", "trade"].forEach(area => {
        if (t.scouts[area]) { setScoutVacancy(t, area, false); return; }
        if (!isUser) {
          t.scouts[area] = generateScout(t.id, area);
          setScoutVacancy(t, area, false);
        } else {
          t.scouts[area] = null;
          setScoutVacancy(t, area, true);
        }
      });
    }
  });
  // ③ 休賽季重載還原旗標補值（舊存檔無此欄位：以KPI是否已於本年結算回推）
  if (typeof S.offseasonEnteredYear !== "number") {
    S.offseasonEnteredYear = (S.seasonKPI && S.seasonKPI.year === S.seasonYear && S.seasonKPI.settled) ? S.seasonYear : 0;
  }
}

async function resetGame() {
  try { await clearState(); } catch (e) { /* 即使清除失敗也繼續重置，避免卡住 */ }
  S = null;
  UI = { screen: "setup", rosterTab: "1軍", flash: null, selectedPlayerId: null, confirmReset: false };
  render();
}

const GAME_EPOCH_YEAR = 2025; // 遊戲從西元2025年10月開始：代表GM剛接手，上一季（前一位GM任內）剛結束
const MONTH_NAMES = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

// 依目前遊戲狀態換算成實際年/月/階段，取代原本純數字的「第X天」計時方式
function getGameCalendar() {
  const year = GAME_EPOCH_YEAR + S.seasonYear; // 第1年球季＝隔年開幕（例如2025/10接手 → 2026年開幕）
  const totalDays = S.schedule ? S.schedule.length : 129;
  if (S.currentDay <= 0) {
    // 選秀已完成、球季尚未開打＝春訓期間
    return { year, monthLabel: "3月", phaseLabel: "春季訓練", dateLabel: `${year}年 3月（春訓）` };
  }
  if (S.currentDay < totalDays) {
    const progress = S.currentDay / totalDays;
    const monthIdx = 3 + Math.floor(progress * 6); // 4月開幕，約6個月跑完例行賽（4~9月）
    const month = MONTH_NAMES[Math.min(monthIdx, 8)];
    return { year, monthLabel: month, phaseLabel: "例行賽", dateLabel: `${year}年 ${month}（例行賽第${S.currentDay}/${totalDays}天）` };
  }
  if (S.playoffs && !S.playoffs.champion) {
    return { year, monthLabel: "10月", phaseLabel: "季後賽", dateLabel: `${year}年 10月（季後賽）` };
  }
  if (S.intlTournament && S.intlTournament.year === S.seasonYear && !S.intlTournament.done) {
    return { year, monthLabel: "11月", phaseLabel: "國際賽事", dateLabel: `${year}年 11月（世界棒球錦標賽）` };
  }
  return { year, monthLabel: "11月", phaseLabel: "休賽季", dateLabel: `${year}年 11月（休賽季）` };
}

function standingsForDivision(div) {
  return Object.values(S.teams).filter(t => t.division === div)
    .sort((a, b) => (b.wins / Math.max(1, b.wins + b.losses)) - (a.wins / Math.max(1, a.wins + a.losses)));
}

/* ---------- 季後賽系統 ---------- */
function seriesWinTarget(len) { return Math.ceil(len / 2); }

function generatePlayoffs() {
  const divisions = ["A1", "A2", "B1", "B2"];
  const top2 = {};
  divisions.forEach(d => { top2[d] = standingsForDivision(d).slice(0, 2).map(t => t.id); });
  const matchups = [
    { id: "QF1", a: top2.A1[0], b: top2.B1[1] },
    { id: "QF2", a: top2.B1[0], b: top2.A1[1] },
    { id: "QF3", a: top2.A2[0], b: top2.B2[1] },
    { id: "QF4", a: top2.B2[0], b: top2.A2[1] }
  ].map(m => ({ ...m, seriesLength: 5, winsA: 0, winsB: 0, winner: null, log: [] }));
  const qualifiedTeamIds = matchups.flatMap(m => [m.a, m.b]);
  S.playoffs = { active: true, round: 0, matchups, champion: null, qualifiedTeamIds };
}

function simulatePlayoffGame(m) {
  if (m.winner) return;
  const teamA = S.teams[m.a], teamB = S.teams[m.b];
  const { homeScore, awayScore } = simulateGame(teamA, teamB, S.players);
  if (homeScore > awayScore) m.winsA++; else m.winsB++;
  m.log.push({ homeScore, awayScore });
  const target = seriesWinTarget(m.seriesLength);
  if (m.winsA >= target) m.winner = m.a;
  else if (m.winsB >= target) m.winner = m.b;
}

function advancePlayoffRoundIfComplete() {
  const p = S.playoffs;
  const allDone = p.matchups.every(m => m.winner);
  if (!allDone) return;
  if (p.round === 2) {
    p.champion = p.matchups[0].winner;
    S.lastAwards = computeSeasonAwards();
    return;
  }
  const winners = p.matchups.map(m => m.winner);
  let nextMatchups;
  if (p.round === 0) {
    nextMatchups = [
      { id: "SF1", a: winners[0], b: winners[1], seriesLength: 5 },
      { id: "SF2", a: winners[2], b: winners[3], seriesLength: 5 }
    ];
  } else {
    nextMatchups = [{ id: "CS", a: winners[0], b: winners[1], seriesLength: 7 }];
  }
  p.matchups = nextMatchups.map(m => ({ ...m, winsA: 0, winsB: 0, winner: null, log: [] }));
  p.round++;
}

/* ---------- 年度個人獎項 ---------- */
function battingAvg(s) { return s.AB > 0 ? s.H / s.AB : 0; }
function era(s) { return s.IP > 0 ? (s.ER * 9) / s.IP : 99; }
function battingScore(p) { return battingAvg(p.seasonStats) * 300 + p.seasonStats.HR * 3 + p.seasonStats.RBI * 1; }
function pitchingScore(p) { return Math.max(0, 5 - era(p.seasonStats)) * 40 + p.seasonStats.W * 3 + p.seasonStats.SO * 0.5; }

function topBy(list, fn) { return list.length ? list.reduce((a, b) => (fn(b) > fn(a) ? b : a)) : null; }
function bottomBy(list, fn) { return list.length ? list.reduce((a, b) => (fn(b) < fn(a) ? b : a)) : null; }
function idOf(p) { return p ? p.id : null; }

const GOLDGLOVE_GROUPS = ["捕手", "一壘手", "二壘手", "三壘手", "游擊手", "左外野手", "中外野手", "右外野手"];
const BESTNINE_GROUPS = GOLDGLOVE_GROUPS.concat(["指定打擊"]);
function primaryPositionGroup(p) {
  const pos = p.positions[0].pos;
  const map = { C: "捕手", "1B": "一壘手", "2B": "二壘手", "3B": "三壘手", SS: "游擊手", LF: "左外野手", CF: "中外野手", RF: "右外野手" };
  return map[pos] || "左外野手";
}

function compositeScore(p) { return battingScore(p) + p.fielding * 1.5; }

function computeSeasonAwards() {
  const allPlayers = Object.values(S.players);
  const batters = allPlayers.filter(p => !p.isPitcher && p.seasonStats.AB > 0);
  const pitchers = allPlayers.filter(p => p.isPitcher && p.seasonStats.IP > 0);
  const pitchersAny = allPlayers.filter(p => p.isPitcher && p.seasonStats.G > 0); // v34：救援王/中繼王候選池改依出賽數（後援過去因IP=0被排除）
  const qualifiedBatters = batters.filter(p => p.seasonStats.AB >= 250);
  const qualifiedPitchers = pitchers.filter(p => p.seasonStats.IP >= 80);

  const mvpCandidates = allPlayers.filter(p => (!p.isPitcher && p.seasonStats.AB > 0) || (p.isPitcher && p.seasonStats.IP > 0));
  const mvp = topBy(mvpCandidates, p => p.isPitcher ? pitchingScore(p) : battingScore(p));
  const rookies = mvpCandidates.filter(p => p.age <= 21);
  const rookieOfYear = topBy(rookies, p => p.isPitcher ? pitchingScore(p) : battingScore(p));

  const goldenBat = {}, goldenArm = {};
  const bestNine = { A: {}, B: {} }, goldenGlove = { A: {}, B: {} };
  const allBattersAnyStats = allPlayers.filter(p => !p.isPitcher);
  ["A", "B"].forEach(region => {
    const inRegionBat = batters.filter(p => S.teams[p.team] && S.teams[p.team].league === region);
    goldenBat[region] = idOf(topBy(inRegionBat, p => battingScore(p)));
    const inRegionPitch = pitchers.filter(p => S.teams[p.team] && S.teams[p.team].league === region);
    goldenArm[region] = idOf(topBy(inRegionPitch, p => pitchingScore(p)));
    const usedForBestNine = new Set();
    GOLDGLOVE_GROUPS.forEach(g => {
      const inGroupAll = allBattersAnyStats.filter(p => primaryPositionGroup(p) === g && S.teams[p.team] && S.teams[p.team].league === region);
      const inGroupBat = batters.filter(p => primaryPositionGroup(p) === g && S.teams[p.team] && S.teams[p.team].league === region);
      const winner = topBy(inGroupBat.length ? inGroupBat : inGroupAll, p => compositeScore(p));
      bestNine[region][g] = idOf(winner);
      if (winner) usedForBestNine.add(winner.id);
      goldenGlove[region][g] = idOf(topBy(inGroupAll, p => p.fielding));
    });
    // 指定打擊（DH）：區內打擊分數最高、且尚未獲得其他守位最佳9人的球員
    const dhPool = inRegionBat.filter(p => !usedForBestNine.has(p.id));
    bestNine[region]["指定打擊"] = idOf(topBy(dhPool.length ? dhPool : inRegionBat, p => battingScore(p)));
  });

  return {
    year: S.seasonYear,
    mvp: mvp ? mvp.id : null,
    battingTitle: idOf(topBy(qualifiedBatters.length ? qualifiedBatters : batters, p => battingAvg(p.seasonStats))),
    homeRunTitle: idOf(topBy(batters, p => p.seasonStats.HR)),
    hitsTitle: idOf(topBy(batters, p => p.seasonStats.H)),
    rbiTitle: idOf(topBy(batters, p => p.seasonStats.RBI)),
    stolenBaseTitle: idOf(topBy(batters, p => p.seasonStats.SB)),
    eraTitle: idOf(bottomBy(qualifiedPitchers.length ? qualifiedPitchers : pitchers, p => era(p.seasonStats))),
    winsTitle: idOf(topBy(pitchers, p => p.seasonStats.W)),
    strikeoutTitle: idOf(topBy(pitchers, p => p.seasonStats.SO)),
    saveTitle: idOf(topBy(pitchersAny.filter(p => p.seasonStats.SV > 0), p => p.seasonStats.SV)),
    holdTitle: idOf(topBy(pitchersAny.filter(p => p.seasonStats.HD > 0), p => p.seasonStats.HD)),
    rookieOfYear: rookieOfYear ? rookieOfYear.id : null,
    goldenBat, goldenArm, bestNine, goldenGlove
  };
}

function doSimulatePlayoffRound() {
  S.playoffs.matchups.forEach(m => simulatePlayoffGame(m));
  advancePlayoffRoundIfComplete();
  persist();
  render();
}

function doSimulatePlayoffsToEnd() {
  let guard = 0;
  while (!S.playoffs.champion && guard < 100) {
    S.playoffs.matchups.forEach(m => simulatePlayoffGame(m));
    advancePlayoffRoundIfComplete();
    guard++;
  }
  persist();
  render();
}



/* ====================================================================
   v25 國際賽事（世界棒球錦標賽）：季末制，取代舊的季中徵召。
   - 首屆於遊戲第5年（西元2030年）舉辦，之後每4年一屆
   - 時間點：季後賽冠軍出爐、年度頒獎之後 → 國際賽 → 才進入休賽季
   - 40國全數參賽：8組×5隊分組循環 → 各組第一晉級8強單淘汰 → 冠軍
   - 母國「青雲國」實力＝聯盟本土好手實際能力；玩家球隊有球員入選會獲得成長（抗壓+2~3）
   - 母國成績影響：奪冠/4強 → 全聯盟人氣↑、隔年贊助與周邊收入加成；
     小組未出線 → 入選國手背負罵名，開季背負「低迷鎖」數場＋負面新聞
   ==================================================================== */
function isIntlYear(y) { return y >= 5 && (y - 5) % 4 === 0; } // 第5、9、13…年（2030、2034…）

function nationBaseStrength(nation) {
  const base = { S: 78, A: 72, B: 66, C: 60, D: 54 }[nation.grade];
  return base + randInt(-4, 4);
}

function runIntlTournament() {
  if (S.intlTournament && S.intlTournament.year === S.seasonYear) return; // 已辦過
  // 1) 組出40國實力值
  const homeNation = nationByName(HOME_NATION_NAME);
  // 母國國家隊＝聯盟本土球員最強24人
  const domestic = Object.values(S.players).filter(p => !p.foreign).sort((a, b) => trueOverall(b) - trueOverall(a));
  const squad = domestic.slice(0, 24);
  const squadIds = new Set(squad.map(p => p.id));
  const homeStrength = squad.length ? squad.reduce((a, p) => a + trueOverall(p), 0) / squad.length + 5 : 70;
  // 在本聯盟效力的外籍球員，會小幅提升母國代表隊實力（+2）
  const foreignNationsInLeague = new Set(Object.values(S.players).filter(p => p.foreign).map(p => p.nationality));
  const entries = NATIONS.map(n => ({
    name: n.name, grade: n.grade,
    strength: n.name === HOME_NATION_NAME ? homeStrength : nationBaseStrength(n) + (foreignNationsInLeague.has(n.name) ? 2 : 0),
    isHome: n.name === HOME_NATION_NAME
  }));
  // 2) 分8組（每組5隊）循環：勝率以實力差邏輯機率決定
  const shuffled = shuffle(entries);
  const groups = [];
  for (let g = 0; g < 8; g++) {
    const teams = shuffled.slice(g * 5, g * 5 + 5).map(t => ({ ...t, w: 0, l: 0 }));
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const pWin = 1 / (1 + Math.pow(10, (teams[j].strength - teams[i].strength) / 18));
        if (Math.random() < pWin) { teams[i].w++; teams[j].l++; } else { teams[j].w++; teams[i].l++; }
      }
    }
    teams.sort((a, b) => b.w - a.w || b.strength - a.strength);
    groups.push(teams);
  }
  // 3) 8強單淘汰
  let knockout = groups.map(g => g[0]);
  const rounds = [];
  const playRound = (list, label) => {
    const winners = [];
    const games = [];
    for (let i = 0; i < list.length; i += 2) {
      const a = list[i], b = list[i + 1];
      const pWin = 1 / (1 + Math.pow(10, (b.strength - a.strength) / 18));
      const aw = Math.random() < pWin;
      const sa = randInt(2, 8), sb = clamp(sa + (aw ? -randInt(1, 4) : randInt(1, 4)), 0, 12);
      games.push({ a: a.name, b: b.name, sa: aw ? Math.max(sa, sb + 1) : sa, sb: aw ? Math.min(sb, sa - 1) : Math.max(sb, sa + 1), winner: aw ? a.name : b.name });
      winners.push(aw ? a : b);
    }
    rounds.push({ label, games });
    return winners;
  };
  let sf = playRound(knockout, "八強");
  let fin = playRound(sf, "四強");
  const champArr = playRound(fin, "冠軍戰");
  const champion = champArr[0].name;
  // 4) 母國成績判定與效果
  const homeGroup = groups.find(g => g.some(t => t.isHome));
  const homeAdvanced = homeGroup[0].isHome;
  let homeFinish; // champion / final4 / top8 / groupOut
  if (champion === HOME_NATION_NAME) homeFinish = "champion";
  else if (fin.some(t => t.isHome) || champArr.some(t => t.isHome)) homeFinish = "final4";
  else if (homeAdvanced) homeFinish = "top8";
  else homeFinish = "groupOut";
  const myNationalPlayers = squad.filter(p => p.team === S.userTeamId);
  const effects = [];
  if (homeFinish === "champion" || homeFinish === "final4") {
    const champTitle = homeFinish === "champion";
    Object.values(S.teams).forEach(t => { ensureFinance(t); t.finance.popularity = clamp(t.finance.popularity + (champTitle ? 6 : 3), 10, 99); });
    S.intlBoost = { year: S.seasonYear + 1, sponsorMult: champTitle ? 1.15 : 1.1, merchMult: champTitle ? 1.15 : 1.1 };
    squad.forEach(p => { p.composure = clamp(p.composure + randInt(2, 3), 20, 99); });
    // v36 ⑤ 國際賽奪冠加碼：母國奪世界冠軍→玩家隊額外獎金＋全隊士氣
    if (champTitle) {
      const ut = S.teams[S.userTeamId];
      if (ut) {
        ensureFinance(ut);
        const intlPrize = 5000 * 10000;
        ut.finance.budget += intlPrize;
        ut.roster1.concat(ut.roster2).forEach(id => { const p = S.players[id]; if (p) p.morale = clamp((p.morale != null ? p.morale : 70) + 6, 0, 100); });
        effects.push(`身為母國聯盟球團，${ut.name}獲得國際賽奪冠加碼獎金 ${formatMoney(intlPrize)}，全隊士氣＋6。`);
      }
    }
    effects.push(champTitle ? `${HOME_NATION_NAME}奪下世界冠軍！全聯盟人氣大漲（+6），明年贊助與周邊收入+15%。` : `${HOME_NATION_NAME}闖進世界4強！全聯盟人氣上升（+3），明年贊助與周邊收入+10%。`);
    effects.push(`入選國手全員在大賽淬鍊下抗壓性+2~3。`);
    pushNews("國際賽", effects[0]);
  } else if (homeFinish === "top8") {
    squad.forEach(p => { p.composure = clamp(p.composure + randInt(1, 2), 20, 99); });
    effects.push(`${HOME_NATION_NAME}打進8強但止步淘汰賽，成績中規中矩；國手抗壓性+1~2。`);
    pushNews("國際賽", `${HOME_NATION_NAME}世界賽8強止步，球迷評價兩極。`);
  } else {
    squad.forEach(p => { p.slumpLockDays = randInt(6, 10); p.condition = -1; });
    effects.push(`${HOME_NATION_NAME}小組賽慘遭淘汰！入選國手背負輿論壓力，明年開季前6~10場將陷入低迷。`);
    pushNews("國際賽", `國恥之敗！${HOME_NATION_NAME}世界賽小組未出線，國手們黯然返國。`);
  }
  if (myNationalPlayers.length > 0) {
    effects.push(`你的球隊共有 ${myNationalPlayers.length} 位球員入選國家隊：${myNationalPlayers.map(p => p.name).join("、")}。`);
    pushNews("國際賽", `本隊 ${myNationalPlayers.map(p => p.name).join("、")} 入選${HOME_NATION_NAME}國家隊出戰世界賽。`);
  }
  S.intlTournament = {
    year: S.seasonYear,
    groups: groups.map(g => g.map(t => ({ name: t.name, grade: t.grade, w: t.w, l: t.l, isHome: t.isHome }))),
    rounds, champion, homeFinish, effects,
    squadNames: squad.slice(0, 12).map(p => p.name),
    myNationalIds: myNationalPlayers.map(p => p.id),
    done: false
  };
  persist();
}

function finishIntlTournament() {
  if (S.intlTournament) S.intlTournament.done = true;
  enterOffseason();
}
