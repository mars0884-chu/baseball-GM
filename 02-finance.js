/* ====================================================================
   第6階段：財務策略系統
   涵蓋：球隊預算、票價與進場人氣、轉播/贊助/周邊收入、球員與教練/球探薪資、
   選秀簽約金、奢侈稅、續約意願修正。
   ==================================================================== */

// 票價分級：至少5個級距，票價越高進場意願越低（進場意願比例統一落在100%~50%之間，由ticketDemandRate()計算）。
// 也開放自行輸入金額，系統會即時估算大約會有幾成觀眾進場。
const TICKET_PRICE_PRESETS = [
  { key: "budget", label: "庶民票價", price: 150 },
  { key: "low", label: "親民票價", price: 300 },
  { key: "mid", label: "中等票價", price: 450 },
  { key: "high", label: "高檔票價", price: 650 },
  { key: "premium", label: "頂級票價", price: 900 }
];
const TICKET_PRICE_FLOOR = 100;
const TICKET_PRICE_CEIL_DEFAULT = 1000; // 每支球隊起始票價上限，可逐年依銷售狀況調高
const TICKET_PRICE_CEIL_MAX = 5000;     // 未來最終票價上限
const TICKET_PRICE_CEIL_STEP = 250;     // 每次符合條件可調高的幅度
const STADIUM_CAPACITY = 15000; // 1級球場的基礎容量；實際容量依team.facility.level查FACILITY_LEVELS取得

/* ====================================================================
   第8階段：硬體建設。球場設施分7個等級，起始容量1萬5千人、最高可蓋到5萬人，
   等級越高容量越大、設施格位越多（v30起周邊收入由格位設施與實際進場人次決定）。
   升級只能在春訓期間（currentDay===0）進行，費用立即從預算扣除，當季即可生效。
   ==================================================================== */
/* v30：merchMult 廢除（周邊收入改由「格位設施」與實際進場人次決定），
   球場等級改為決定「容量」與「設施格位數」。巨蛋為 12 格＋地標獎勵 3 格＝15 格。 */
const FACILITY_LEVELS = [
  { level: 1, label: "簡易球場", capacity: 15000, slots: 3, upgradeCost: 0 },
  { level: 2, label: "社區球場", capacity: 20000, slots: 4, upgradeCost: 6000 * 10000 },
  { level: 3, label: "標準球場", capacity: 25000, slots: 5, upgradeCost: 14000 * 10000 },
  { level: 4, label: "現代化球場", capacity: 30000, slots: 6, upgradeCost: 24000 * 10000 },
  { level: 5, label: "大型球場", capacity: 37000, slots: 8, upgradeCost: 36000 * 10000 },
  { level: 6, label: "旗艦球場", capacity: 44000, slots: 10, upgradeCost: 50000 * 10000 },
  { level: 7, label: "地標級巨蛋", capacity: 50000, slots: 15, upgradeCost: 68000 * 10000 } // 12＋地標獎勵3
];

/* v30 球場設施類型池（12種）：三軸效果——
   spendPct＝人均消費%（消費/體驗）、attPct＝主場進場率%（舒適）、popBoost＝季末人氣成長（同類多座不疊加）。
   可重複建造同類設施（效果線性疊加，popBoost除外）；每座每年收取「建設費×maintPct」維護費。 */
const STADIUM_FACILITY_TYPES = [
  { key: "vendor",   label: "販賣部",       icon: "fac-vendor", cost: 4000 * 10000,  maintPct: 0.10, spendPct: 0.18, attPct: 0,     popBoost: 0, desc: "球場基本盤，飲食與應援小物的主要銷售據點。" },
  { key: "food",     label: "小吃街",       icon: "fac-food", cost: 5000 * 10000,  maintPct: 0.10, spendPct: 0.22, attPct: 0,     popBoost: 0, desc: "在地美食進駐，看球配美食讓人均消費明顯提升。" },
  { key: "drink",    label: "飲料吧",       icon: "fac-drink", cost: 3000 * 10000,  maintPct: 0.09, spendPct: 0.14, attPct: 0,     popBoost: 0, desc: "冷飲與特調專門吧台，翻桌快、毛利高。" },
  { key: "toilet",   label: "廁所擴建",     icon: "fac-toilet", cost: 3500 * 10000,  maintPct: 0.08, spendPct: 0,    attPct: 0.015, popBoost: 0, desc: "減少排隊之苦，觀賽舒適度直接反映在進場意願。" },
  { key: "nursing",  label: "哺乳室",       icon: "fac-nursing", cost: 3000 * 10000,  maintPct: 0.08, spendPct: 0,    attPct: 0.01,  popBoost: 0, desc: "友善親子設施，吸引家庭客層安心進場。" },
  { key: "vip",      label: "VIP包廂",      icon: "fac-vip", cost: 20000 * 10000, maintPct: 0.20, spendPct: 0.45, attPct: 0,     popBoost: 0, desc: "頂級視野與專屬服務，企業招待需求強勁的高消費艙等。" },
  { key: "screen",   label: "大型計分螢幕", icon: "screen", cost: 8000 * 10000,  maintPct: 0.10, spendPct: 0.15, attPct: 0.01,  popBoost: 0, desc: "沉浸式重播與應援互動，觀賽體驗全面升級。" },
  { key: "kidzone",  label: "兒童遊樂區",   icon: "fac-kidzone", cost: 5000 * 10000,  maintPct: 0.09, spendPct: 0.08, attPct: 0.015, popBoost: 0, desc: "小朋友放電、大人安心看球，家庭票房的秘密武器。" },
  { key: "flagship", label: "球隊旗艦店",   icon: "cap", cost: 15000 * 10000, maintPct: 0.20, spendPct: 0.40, attPct: 0,     popBoost: 0, desc: "全品項周邊旗艦門市，球衣公仔限定品一次滿足。" },
  { key: "parking",  label: "立體停車場",   icon: "fac-parking", cost: 12000 * 10000, maintPct: 0.08, spendPct: 0,    attPct: 0.03,  popBoost: 0, desc: "解決最大進場痛點，開車族從此不再過門不入。" },
  { key: "museum",   label: "球隊博物館",   icon: "museum", cost: 10000 * 10000, maintPct: 0.10, spendPct: 0.12, attPct: 0,     popBoost: 1, desc: "隊史榮光與名人堂展區，深化球迷認同（人氣成長+1，多座不疊加）。" },
  { key: "beer",     label: "啤酒花園",     icon: "fac-beer", cost: 6000 * 10000,  maintPct: 0.11, spendPct: 0.25, attPct: 0,     popBoost: 0, desc: "露天暢飲區，夜場票房與人均消費的雙引擎。" }
];
const MERCH_BASE_SPEND = 12; // 人均基礎消費（元）；實際人均＝(12＋人氣×0.06)×(1＋設施加成)×(1＋行銷%)
function ensureFacility(team) {
  if (!team.facility) team.facility = { level: 1 };
  if (team.facility.level === undefined) team.facility.level = 1;
}
function facilityInfo(team) {
  ensureFacility(team);
  return FACILITY_LEVELS.find(f => f.level === team.facility.level) || FACILITY_LEVELS[0];
}
function facilityCapacity(team) { return facilityInfo(team).capacity; }

/* ---------- v30 球場格位設施 ---------- */
/* v31折舊：每座格位設施有屋齡（以平行陣列 facility.slotBuilt 記「建成的球季年」，與 stadiumSlots 同索引對齊）。
   屋齡達 STADIUM_LIFE(30年) → 「⚠老舊」：三軸效果×0.5（維護費不變＝懲罰），須重建（費用＝建設費×0.6）恢復。
   採平行陣列而非改物件結構，保留既有以「字串key」為主的所有邏輯與回歸測試相容。 */
const STADIUM_LIFE = 30;          // 設施壽命（年）
const STADIUM_REBUILD_COST = 0.6; // 重建費＝原建設費×0.6
const STADIUM_DECAY_MULT = 0.5;   // 老舊後三軸效果倍率
function ensureStadiumSlots(team) {
  ensureFacility(team);
  if (!Array.isArray(team.facility.stadiumSlots)) team.facility.stadiumSlots = [];
  // 平行屋齡陣列：長度對齊 stadiumSlots；缺漏者補為「本季新建」（舊v30檔＝視為當年落成，逐年自然老化）
  if (!Array.isArray(team.facility.slotBuilt)) team.facility.slotBuilt = [];
  const sb = team.facility.slotBuilt, n = team.facility.stadiumSlots.length;
  while (sb.length < n) sb.push(S ? S.seasonYear : 1);
  if (sb.length > n) sb.length = n; // 對齊（拆除後殘留清掉）
}
function stadiumSlotCount(team) { return facilityInfo(team).slots; }
function stadiumFacilityType(key) { return STADIUM_FACILITY_TYPES.find(t => t.key === key) || null; }
// 新建設施時同步推入屋齡（建成年＝當前球季年）
function pushStadiumSlotBuilt(team) {
  ensureStadiumSlots(team);
  const sb = team.facility.slotBuilt;
  if (sb.length < team.facility.stadiumSlots.length) sb.push(S ? S.seasonYear : 1);
}
function stadiumSlotAge(team, i) {
  ensureStadiumSlots(team);
  const built = team.facility.slotBuilt[i];
  return Math.max(0, (S ? S.seasonYear : 1) - (typeof built === "number" ? built : 1));
}
function stadiumSlotAged(team, i) { return stadiumSlotAge(team, i) >= STADIUM_LIFE; }
/* ====================================================================
   v36：冠軍回饋五項（① 奪冠獎金 ② 連霸遞增 ③ 士氣/忠誠 ④ 冠軍旗+博物館連動
   ⑤ 國際賽奪冠加碼——⑤在 runIntlTournament 內處理）。玩家隊奪冠時由 settleSeasonKPI 呼叫。 */
const CHAMP_PRIZE_BASE = 8000 * 10000;         // 奪冠基礎獎金 8000萬
const CHAMP_PRIZE_STREAK_STEP = 4000 * 10000;  // 每多一次連霸再+4000萬
const CHAMP_MORALE_GAIN = 10;
const CHAMP_LOYALTY_GAIN = 12;
function applyChampionshipRewards(team, streak) {
  ensureFinance(team);
  streak = streak || 1;
  // ①+② 奪冠獎金（連霸遞增）
  const prize = CHAMP_PRIZE_BASE + (streak - 1) * CHAMP_PRIZE_STREAK_STEP;
  team.finance.budget += prize;
  // ③ 全隊士氣/忠誠提升（連霸再加碼，最多+6）
  const bump = Math.min(streak - 1, 3) * 2;
  const moraleGain = CHAMP_MORALE_GAIN + bump;
  const loyaltyGain = CHAMP_LOYALTY_GAIN + bump;
  team.roster1.concat(team.roster2).forEach(id => {
    const p = S.players[id];
    if (!p) return;
    p.morale = clamp((p.morale != null ? p.morale : 70) + moraleGain, 0, 100);
    p.loyalty = clamp((p.loyalty != null ? p.loyalty : 50) + loyaltyGain, 0, 100);
  });
  // ④ 冠軍旗：記錄冠軍年（博物館效果會依冠軍旗數放大，見 stadiumEffects）
  if (!team.champBanners) team.champBanners = [];
  team.champBanners.push(S.seasonYear);
  const hasMuseum = (team.facility && team.facility.stadiumSlots || []).includes("museum");
  if (typeof pushNews === "function") {
    pushNews("冠軍", `${icon('trophy')} ${team.name}奪下${S.seasonYear}年總冠軍${streak >= 2 ? `（${streak}連霸！）` : ""}！奪冠獎金 ${formatMoney(prize)} 入帳，全隊士氣＋${moraleGain}、忠誠＋${loyaltyGain}${hasMuseum ? `；冠軍旗進駐球隊博物館（隊史第${team.champBanners.length}面，館的人氣效應隨旗數放大）` : `（蓋一座球隊博物館可讓冠軍旗發揮人氣效應）`}。`);
  }
  return { prize, moraleGain, loyaltyGain, banners: team.champBanners.length, hasMuseum };
}
// 彙總已建設施的三軸效果與年度維護費（popBoost同類不疊加；老舊格位三軸×0.5、維護費照收）
function stadiumEffects(team) {
  ensureStadiumSlots(team);
  const eff = { spendPct: 0, attPct: 0, popBoost: 0, maintenance: 0, count: team.facility.stadiumSlots.length, aged: 0 };
  const popSeen = {};
  team.facility.stadiumSlots.forEach((key, i) => {
    const t = stadiumFacilityType(key);
    if (!t) return;
    const decay = stadiumSlotAged(team, i) ? STADIUM_DECAY_MULT : 1;
    if (decay < 1) eff.aged++;
    eff.spendPct += t.spendPct * decay;
    eff.attPct += t.attPct * decay;
    if (t.popBoost && !popSeen[key]) {
      let pb = t.popBoost * decay;
      // v36：冠軍旗＋博物館連動——每面冠軍旗讓博物館的人氣成長再+0.4（上限5面）
      if (key === "museum") pb += Math.min((team.champBanners || []).length, 5) * 0.4;
      eff.popBoost += Math.round(pb * 10) / 10; popSeen[key] = true;
    }
    eff.maintenance += Math.round(t.cost * t.maintPct);
  });
  return eff;
}
// v31完備度：0.5×(等級-1)/6 + 0.5×有效格位/15（老舊格位以0.5計入有效格位）
function stadiumCompleteness(team) {
  ensureStadiumSlots(team);
  const lv = facilityInfo(team).level;
  let effSlots = 0;
  team.facility.stadiumSlots.forEach((key, i) => { effSlots += stadiumSlotAged(team, i) ? 0.5 : 1; });
  return 0.5 * (lv - 1) / 6 + 0.5 * Math.min(effSlots, 15) / 15;
}
function stadiumMaintenance(team) { return stadiumEffects(team).maintenance; }
// 人均消費（元）：基礎＋人氣微幅加成，乘上設施消費/體驗加成與行銷周邊%
function stadiumPerCapitaSpend(team, intlMerchMult) {
  ensureFinance(team);
  const base = MERCH_BASE_SPEND + team.finance.popularity * 0.06;
  return base * (1 + stadiumEffects(team).spendPct) * (1 + (team.finance.marketingMerchPct || 0)) * (intlMerchMult || 1);
}
function buildStadiumFacility(key) {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureStadiumSlots(team);
  if (S.currentDay > 0) { UI.flash = "球場設施只能在春訓期間（開幕前）建造，請等下個休賽季再進行。"; render(); return; }
  const t = stadiumFacilityType(key);
  if (!t) return;
  if (team.facility.stadiumSlots.length >= stadiumSlotCount(team)) {
    UI.flash = `格位已滿（${stadiumSlotCount(team)}格）：升級球場等級可獲得更多格位，或拆除既有設施騰出空間。`;
    render(); return;
  }
  if (team.finance.budget < t.cost) { UI.flash = `預算不足：建造「${t.label}」需要 ${formatMoney(t.cost)}。`; render(); return; }
  team.finance.budget -= t.cost;
  team.facility.stadiumSlots.push(key);
  pushStadiumSlotBuilt(team); // v31：記錄建成年（屋齡起算）
  UI.flash = `「${iconVal(t.icon)}${t.label}」建造完成！每年維護費 ${formatMoney(Math.round(t.cost * t.maintPct))}。`;
  persist(); render();
}
/* v30 主場帳（gate ledger）：逐場累計主場場次/進場人次/門票收入/分潤收支，季末結算採用實帳。
   主客戰績同時記在 team.homeWins/homeLosses/awayWins/awayLosses。 */
function ensureHomeAwayLedger(team) {
  ensureFinance(team);
  if (!team.finance.gateLedger) team.finance.gateLedger = { homeGames: 0, visitors: 0, gateRevenue: 0, shareIn: 0, sharePaid: 0 };
  if (typeof team.homeWins !== "number") { team.homeWins = 0; team.homeLosses = 0; team.awayWins = 0; team.awayLosses = 0; }
}
function resetHomeAwayLedger(team) {
  ensureFinance(team);
  team.finance.gateLedger = { homeGames: 0, visitors: 0, gateRevenue: 0, shareIn: 0, sharePaid: 0 };
  team.homeWins = 0; team.homeLosses = 0; team.awayWins = 0; team.awayLosses = 0;
}
// 客場贏球分潤：客隊贏球抽當場門票8%、輸球2%（由主隊支付）
const GATE_SHARE_WIN = 0.08, GATE_SHARE_LOSE = 0.02;
// 單場主場帳務：依當下進場率結算該場門票、記錄主客戰績、計算分潤
function applyGateEconomy(home, away, homeWon) {
  ensureHomeAwayLedger(home); ensureHomeAwayLedger(away);
  const visitors = Math.round(facilityCapacity(home) * teamAttendanceRate(home));
  let gate = visitors * home.finance.ticketPrice;
  // v48：里程碑票房加成（玩家隊主場逐場消耗）
  try {
    if (home.id === S.userTeamId && S.v48 && S.v48.milestoneTicketBoost > 0) {
      gate = Math.round(gate * (1 + S.v48.milestoneTicketBoost / 100));
      S.v48.milestoneTicketBoost = Math.max(0, S.v48.milestoneTicketBoost - 3); // 每場消耗3%，約5場內消耗完
    }
  } catch (_) {}
  const share = Math.round(gate * (homeWon ? GATE_SHARE_LOSE : GATE_SHARE_WIN));
  const hl = home.finance.gateLedger;
  hl.homeGames++; hl.visitors += visitors; hl.gateRevenue += gate; hl.sharePaid += share;
  away.finance.gateLedger.shareIn += share;
  if (homeWon) { home.homeWins++; away.awayLosses++; } else { home.homeLosses++; away.awayWins++; }
  return { visitors, gate, share };
}

const STADIUM_DEMOLISH_REFUND = 0.4; // 拆除退回建設費40%
function demolishStadiumFacility(slotIndex) {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureStadiumSlots(team);
  if (S.currentDay > 0) { UI.flash = "球場設施只能在春訓期間（開幕前）拆除。"; render(); return; }
  const key = team.facility.stadiumSlots[slotIndex];
  const t = stadiumFacilityType(key);
  if (!t) return;
  team.facility.stadiumSlots.splice(slotIndex, 1);
  team.facility.slotBuilt.splice(slotIndex, 1); // v31：同步移除屋齡
  const refund = Math.round(t.cost * STADIUM_DEMOLISH_REFUND);
  team.finance.budget += refund;
  UI.flash = `已拆除「${iconVal(t.icon)}${t.label}」，退回部分建材費 ${formatMoney(refund)}（${Math.round(STADIUM_DEMOLISH_REFUND * 100)}%）。`;
  persist(); render();
}
/* v31：重建老舊設施——費用＝原建設費×0.6，屋齡歸零、效果恢復。每隊每年重建上限1座（玩家由UI逐座操作，
   上限以 facility.rebuiltYear 記錄「本季已重建過」來把關）。 */
function rebuildStadiumFacility(slotIndex) {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureStadiumSlots(team);
  if (S.currentDay > 0) { UI.flash = "球場設施只能在春訓期間（開幕前）重建。"; render(); return; }
  const key = team.facility.stadiumSlots[slotIndex];
  const t = stadiumFacilityType(key);
  if (!t) return;
  if (!stadiumSlotAged(team, slotIndex)) { UI.flash = "此設施尚未老舊，無需重建。"; render(); return; }
  if (team.facility.rebuiltYear === S.seasonYear) { UI.flash = "每個休賽季只能重建 1 座設施，明年再處理其他老舊設施吧。"; render(); return; }
  const cost = Math.round(t.cost * STADIUM_REBUILD_COST);
  if (team.finance.budget < cost) { UI.flash = `預算不足：重建「${t.label}」需要 ${formatMoney(cost)}。`; render(); return; }
  team.finance.budget -= cost;
  team.facility.slotBuilt[slotIndex] = S.seasonYear; // 屋齡歸零
  team.facility.rebuiltYear = S.seasonYear;
  UI.flash = `「${iconVal(t.icon)}${t.label}」重建完成（${formatMoney(cost)}），效果已恢復、屋齡歸零。`;
  persist(); render();
}
function upgradeFacility(targetLevel) {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureFacility(team);
  if (S.currentDay > 0) {
    UI.flash = "球場硬體建設只能在春訓期間（開幕前）投資，請等下個休賽季再進行。";
    render();
    return;
  }
  const target = FACILITY_LEVELS.find(f => f.level === targetLevel);
  if (!target || targetLevel !== team.facility.level + 1) {
    UI.flash = "球場建設必須逐級升級，不能跳級投資。";
    render();
    return;
  }
  if (team.finance.budget < target.upgradeCost) {
    UI.flash = `預算不足，升級到「${target.label}」需要 ${formatMoney(target.upgradeCost)}。`;
    render();
    return;
  }
  team.finance.budget -= target.upgradeCost;
  team.facility.level = targetLevel;
  UI.flash = `球場硬體升級完成！現在是「${target.label}」，容量提升至 ${target.capacity.toLocaleString()} 人，設施格位增加至 ${target.slots} 格。`;
  persist();
  render();
}

/* ====================================================================
   ⑥硬體建設擴充：球場之外新增三大類設施（皆只能在春訓期間投資、逐級升級）：
   1. 訓練基地：細分10個獨立項目，各自升級可提升對應能力的年度成長幅度
      （效果疊加在教練指導加成之上，作用於 developPlayer 的 coachBonus）
   2. 醫療室：降低受傷機率、縮短傷勢恢復天數（與⑤受傷機制連動）
   3. 球探辦公室：提升三位球探的有效評估精準度，並擴大國際市場「獨家人脈」名額（與⑦連動）
   AI球隊開局隨機擁有低等級設施（0~2級）且不會再升級（已知簡化，玩家可靠投資取得優勢）。
   ==================================================================== */
const TRAINING_ITEMS = [
  { key: "pitchVelocity", label: "球速訓練", group: "投手項目", desc: "提升投手「球速」的年度成長幅度" },
  { key: "pitchControl", label: "控球訓練", group: "投手項目", desc: "提升投手「控球」的年度成長幅度" },
  { key: "pitchBreaking", label: "變化球訓練", group: "投手項目", desc: "提升所有球種「球威/控球」的年度成長幅度" },
  { key: "batContact", label: "打擊訓練", group: "打者項目", desc: "提升「接觸力」與「對左/右投」的年度成長幅度" },
  { key: "batPower", label: "長打訓練", group: "打者項目", desc: "提升「長打力」的年度成長幅度" },
  { key: "batEye", label: "選球訓練", group: "打者項目", desc: "提升「選球眼」的年度成長幅度" },
  { key: "bunting", label: "觸擊訓練", group: "打者項目", desc: "提升「觸擊」的年度成長幅度（v25新增觸擊屬性）" },
  { key: "catcher", label: "捕手訓練室", group: "捕手項目", desc: "提升「配球引導/接捕框架/阻殺跑壘/阻擋/傳球時間/投手調教」的年度成長幅度" },
  { key: "defense", label: "守備訓練場", group: "守備項目", desc: "提升「守備成功率」與「臂力」的年度成長幅度" },
  { key: "baserunning", label: "跑壘訓練場", group: "跑壘項目", desc: "提升「跑壘速度」與「盜壘」的年度成長幅度" },
  { key: "composure", label: "心理抗壓中心", group: "心理項目", desc: "提升「抗壓性」的年度成長幅度" }
];
const TRAINING_MAX_LEVEL = 5;
const TRAINING_UPGRADE_COSTS = [500, 1500, 3000, 6000, 12000]; // 萬元：Lv0→1、1→2、2→3、3→4、4→5
const MEDICAL_MAX_LEVEL = 5;
const MEDICAL_UPGRADE_COSTS = [800, 2400, 4800, 9600, 18000]; // 萬元
const SCOUT_OFFICE_MAX_LEVEL = 5;
const SCOUT_OFFICE_UPGRADE_COSTS = [1000, 3000, 6000, 12000, 24000]; // 萬元

/* ====================================================================
   v36：AI 起始設施「依球團性格」給不同等級帶（玩家隊一律 Lv0＝白手起家）。
   各性格的強項不同（豪購全面偏高、精算重情報端、養成重訓練/宿舍…），
   但上限一律封在 Lv2——與玩家的落差最多 2 級，避免開局差距過大玩不下去。
   只作用於「開新遊戲時尚未有 facilities 的球隊」；舊存檔已有數值者不重擲（向下相容）。
   東山再起接手既有球團：沿用該隊原本（AI 時期）的設施，不歸零。
   ==================================================================== */
const PERSONA_FACILITY_INIT = {
  splash:       { training: [1, 2], medical: [1, 2], scoutOffice: [1, 2], analysisRoom: [0, 2], dorm: [0, 2], rehabCenter: [0, 2] }, // 豪購：財大氣粗、全面偏高
  analytics:    { training: [0, 2], medical: [0, 2], scoutOffice: [1, 2], analysisRoom: [1, 2], dorm: [0, 1], rehabCenter: [0, 1] }, // 精算：情報端最強
  farm:         { training: [1, 2], medical: [0, 2], scoutOffice: [0, 1], analysisRoom: [0, 1], dorm: [1, 2], rehabCenter: [0, 2] }, // 養成：訓練/宿舍最強
  gambler:      { training: [0, 2], medical: [0, 2], scoutOffice: [0, 2], analysisRoom: [0, 2], dorm: [0, 1], rehabCenter: [0, 1] }, // 賭性：敢砸、不均衡
  rebuild:      { training: [0, 2], medical: [0, 2], scoutOffice: [0, 1], analysisRoom: [0, 1], dorm: [0, 2], rehabCenter: [0, 1] }, // 重建：中等偏低、略重訓練
  human:        { training: [0, 2], medical: [0, 2], scoutOffice: [0, 1], analysisRoom: [0, 1], dorm: [0, 1], rehabCenter: [0, 1] }, // 人情：平均基準
  conservative: { training: [0, 1], medical: [0, 1], scoutOffice: [0, 1], analysisRoom: [0, 0], dorm: [0, 1], rehabCenter: [0, 1] }  // 保守：最省、幾乎白牌
};
const FACILITY_INIT_FALLBACK = { training: [0, 2], medical: [0, 2], scoutOffice: [0, 1], analysisRoom: [0, 1], dorm: [0, 1], rehabCenter: [0, 1] };
function personaFacilityRoll(team, cat) {
  if (team.id === S.userTeamId || team.isUser) return 0; // 玩家隊白手起家
  const spec = (PERSONA_FACILITY_INIT[team.persona] || FACILITY_INIT_FALLBACK)[cat] || FACILITY_INIT_FALLBACK[cat];
  return randInt(spec[0], spec[1]);
}
function ensureFacilities(team) {
  ensureFacility(team);
  if (!team.facilities) {
    const training = {};
    TRAINING_ITEMS.forEach(it => { training[it.key] = personaFacilityRoll(team, "training"); });
    team.facilities = {
      training,
      medical: personaFacilityRoll(team, "medical"),
      scoutOffice: personaFacilityRoll(team, "scoutOffice")
    };
  }
  if (!team.facilities.training) team.facilities.training = {};
  TRAINING_ITEMS.forEach(it => { if (team.facilities.training[it.key] === undefined) team.facilities.training[it.key] = personaFacilityRoll(team, "training"); });
  if (team.facilities.medical === undefined) team.facilities.medical = personaFacilityRoll(team, "medical");
  if (team.facilities.scoutOffice === undefined) team.facilities.scoutOffice = personaFacilityRoll(team, "scoutOffice");
  // v26新設施：宿舍／情蒐分析室／復健中心（玩家從0起蓋；AI依性格給0~2級且不再升級，維持既有簡化）
  if (team.facilities.dorm === undefined) team.facilities.dorm = personaFacilityRoll(team, "dorm");
  if (team.facilities.analysisRoom === undefined) team.facilities.analysisRoom = personaFacilityRoll(team, "analysisRoom");
  if (team.facilities.rehabCenter === undefined) team.facilities.rehabCenter = personaFacilityRoll(team, "rehabCenter");
}
/* v40修正：teamSelect 流程的設施歸零。根因：newGame() 在玩家選隊「之前」就呼叫 ensureAllFinance()→ensureFacilities()，
   當下 userTeamId 尚為 null，personaFacilityRoll 的玩家判定不成立，全聯盟（含玩家日後選中的那隊）都被依性格擲了 0~2 級起始設施。
   自訂隊名路徑（userTeamId 開局即為 T0）不受影響。修法：pickTeam() 選定球隊後呼叫本函式把該隊設施全部歸零（球場維持 Lv1），
   確保「玩家白手起家」語意。舊存檔不回溯歸零（無法區分免費擲骰與玩家付費升級，記入已知簡化）。 */
function resetUserFacilities(team) {
  if (!team) return;
  ensureFacilities(team);
  TRAINING_ITEMS.forEach(it => { team.facilities.training[it.key] = 0; });
  team.facilities.medical = 0;
  team.facilities.scoutOffice = 0;
  team.facilities.dorm = 0;
  team.facilities.analysisRoom = 0;
  team.facilities.rehabCenter = 0;
  ensureFacility(team);
  team.facility.level = Math.max(1, Math.min(team.facility.level || 1, 1)); // 球場一律 Lv1 起步
}
function trainingLevel(team, key) { ensureFacilities(team); return team.facilities.training[key] || 0; }
// 訓練加成走 developPlayer 的 coachBonus 通道（與教練加成同質、可疊加）：每級+0.06，Lv5=+0.30
function trainingGrowthBonus(team, key) { return trainingLevel(team, key) * 0.06; }
function medicalLevel(team) { ensureFacilities(team); return team.facilities.medical || 0; }
function medicalInjuryMult(team) { return 1 - 0.08 * medicalLevel(team); }   // 每級受傷機率-8%（Lv5=-40%）
function medicalRecoveryMult(team) { return 1 - 0.06 * medicalLevel(team); } // 每級恢復天數-6%（Lv5=-30%）
function scoutOfficeLevel(team) { ensureFacilities(team); return team.facilities.scoutOffice || 0; }
function scoutAccuracyBonus(team) { return 2 * scoutOfficeLevel(team); }     // 每級三位球探有效精準度+2

/* ====================================================================
   v26新設施三件套（各5級，僅春訓期間可升級）：
   宿舍＝恢復端：每日狀況漂移偏正向、全隊投手疲勞恢復每級+2、23歲以下年輕球員年度成長微幅加成
   情蒐分析室＝情報端：球探評估精準度再+1/級（與球探辦公室疊加）、比賽期望得分每級+0.05分、主控台情蒐報告
   復健中心＝傷病端：受傷恢復天數每級-8%（與醫療室疊加）、傷癒降評機率下修、傷病史復發風險下修
   ==================================================================== */
const DORM_MAX_LEVEL = 5;
const DORM_UPGRADE_COSTS = [900, 2700, 5400, 10800, 20000];        // 萬元：Lv0→1 … Lv4→5
const ANALYSIS_MAX_LEVEL = 5;
const ANALYSIS_UPGRADE_COSTS = [1000, 3000, 6000, 12000, 24000];   // 萬元
const REHAB_MAX_LEVEL = 5;
const REHAB_UPGRADE_COSTS = [800, 2400, 4800, 9600, 18000];        // 萬元
function dormLevel(team) { ensureFacilities(team); return team.facilities.dorm || 0; }
function dormFatigueBonus(team) { return dormLevel(team) * 2; }           // 投手每日疲勞恢復+2/級
function dormConditionBias(team) { return dormLevel(team) * 0.02; }       // 每日狀況漂移偏正向機率+2%/級
function dormYouthGrowthBonus(team) { return dormLevel(team) * 0.02; }    // 23歲以下年度成長+2%/級（走coachBonus通道）
function analysisRoomLevel(team) { ensureFacilities(team); return team.facilities.analysisRoom || 0; }
function analysisGameBonus(team) { return analysisRoomLevel(team) * 0.05; } // 比賽期望得分+0.05分/級（約1%戰力）
function analysisAccuracyBonus(team) { return analysisRoomLevel(team) * 1; }// 球探評估精準度再+1/級
function rehabCenterLevel(team) { ensureFacilities(team); return team.facilities.rehabCenter || 0; }
function rehabRecoveryMult(team) { return 1 - 0.08 * rehabCenterLevel(team); }      // 恢復天數-8%/級（與醫療室疊加）
function rehabDowngradeShift(team) { return 0.03 * rehabCenterLevel(team); }        // 保守治療降評機率-3%/級
function rehabRecurrenceRelief(team) { return 0.08 * rehabCenterLevel(team); }      // 傷病史復發加成削減8%/級

// ⑦有效球探精準度＝球探本身能力＋球探辦公室加成，所有評估（選秀/國際/交易）統一採用
function effectiveScoutAccuracy(team, scout) {
  if (!scout) return 50;
  const bonus = (team && typeof scoutAccuracyBonus === "function") ? scoutAccuracyBonus(team) : 0;
  const ana = (team && typeof analysisAccuracyBonus === "function") ? analysisAccuracyBonus(team) : 0; // v26情蒐分析室加成
  return clamp(scout.accuracy + bonus + ana, 20, 99);
}
// ⑦國際獨家人脈名額：國際球探有效精準度越高，每年能多挖出越多「其他球團接觸不到」的獨家人選
// （精準度63→1位、71→2位、79→3位、87→4位、95→5位；未達63則只能看公開名單）
function exclusiveIntlSlots(team) {
  const scout = team && team.scouts ? team.scouts.international : null;
  if (!scout) return 0;
  const acc = effectiveScoutAccuracy(team, scout);
  return clamp(Math.floor((acc - 55) / 8), 0, 5);
}

function springOnlyGuard() {
  if (S.currentDay > 0) {
    UI.flash = "硬體建設只能在春訓期間（開幕前）投資，請等下個休賽季再進行。";
    render();
    return false;
  }
  return true;
}
function payFacilityCost(team, costWan, label) {
  const cost = costWan * 10000;
  if (team.finance.budget < cost) {
    UI.flash = `預算不足，${label}需要 ${formatMoney(cost)}。`;
    render();
    return false;
  }
  team.finance.budget -= cost;
  return true;
}
function upgradeTrainingItem(key) {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureFacilities(team);
  if (!springOnlyGuard()) return;
  const item = TRAINING_ITEMS.find(it => it.key === key);
  const lv = trainingLevel(team, key);
  if (!item || lv >= TRAINING_MAX_LEVEL) return;
  if (!payFacilityCost(team, TRAINING_UPGRADE_COSTS[lv], `升級「${item.label}」至 Lv.${lv + 1}`)) return;
  team.facilities.training[key] = lv + 1;
  UI.flash = `「${item.label}」升級完成（Lv.${lv + 1}），對應能力的年度成長幅度提升。`;
  persist();
  render();
}
function upgradeMedical() {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureFacilities(team);
  if (!springOnlyGuard()) return;
  const lv = medicalLevel(team);
  if (lv >= MEDICAL_MAX_LEVEL) return;
  if (!payFacilityCost(team, MEDICAL_UPGRADE_COSTS[lv], `升級醫療室至 Lv.${lv + 1}`)) return;
  team.facilities.medical = lv + 1;
  UI.flash = `醫療室升級完成（Lv.${lv + 1}）：受傷機率 -${(lv + 1) * 8}%、恢復天數 -${(lv + 1) * 6}%。`;
  persist();
  render();
}
function upgradeScoutOffice() {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureFacilities(team);
  if (!springOnlyGuard()) return;
  const lv = scoutOfficeLevel(team);
  if (lv >= SCOUT_OFFICE_MAX_LEVEL) return;
  if (!payFacilityCost(team, SCOUT_OFFICE_UPGRADE_COSTS[lv], `升級球探辦公室至 Lv.${lv + 1}`)) return;
  team.facilities.scoutOffice = lv + 1;
  UI.flash = `球探辦公室升級完成（Lv.${lv + 1}）：三位球探有效精準度 +${(lv + 1) * 2}、國內選秀與國際市場的獨家人脈擴大。`;
  persist();
  render();
}
function upgradeDorm() {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureFacilities(team);
  if (!springOnlyGuard()) return;
  const lv = dormLevel(team);
  if (lv >= DORM_MAX_LEVEL) return;
  if (!payFacilityCost(team, DORM_UPGRADE_COSTS[lv], `升級選手宿舍至 Lv.${lv + 1}`)) return;
  team.facilities.dorm = lv + 1;
  UI.flash = `選手宿舍升級完成（Lv.${lv + 1}）：狀況更容易回升、投手疲勞恢復 +${(lv + 1) * 2}、年輕球員成長環境改善。`;
  persist();
  render();
}
function upgradeAnalysisRoom() {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureFacilities(team);
  if (!springOnlyGuard()) return;
  const lv = analysisRoomLevel(team);
  if (lv >= ANALYSIS_MAX_LEVEL) return;
  if (!payFacilityCost(team, ANALYSIS_UPGRADE_COSTS[lv], `升級情蒐分析室至 Lv.${lv + 1}`)) return;
  team.facilities.analysisRoom = lv + 1;
  UI.flash = `情蒐分析室升級完成（Lv.${lv + 1}）：球探評估更精準、比賽情蒐加成提升，主控台將顯示對手情蒐報告。`;
  persist();
  render();
}
function upgradeRehabCenter() {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureFacilities(team);
  if (!springOnlyGuard()) return;
  const lv = rehabCenterLevel(team);
  if (lv >= REHAB_MAX_LEVEL) return;
  if (!payFacilityCost(team, REHAB_UPGRADE_COSTS[lv], `升級復健中心至 Lv.${lv + 1}`)) return;
  team.facilities.rehabCenter = lv + 1;
  UI.flash = `復健中心升級完成（Lv.${lv + 1}）：恢復天數 -${(lv + 1) * 8}%、傷癒降評與舊傷復發風險下降。`;
  persist();
  render();
}
const FACILITY_TABS = ["球場", "訓練基地", "醫療室", "球探辦公室", "宿舍", "情蒐分析室", "復健中心"];
/* v57-001：設施／球場 presentation-only 視覺層。
   只讀既有 facility／S／UI；不新增 state、不改數值、不呼叫亂數。
   M6 已核准的 Lv1／Lv3／Lv5／Lv7 是四個視覺錨點，偶數級距使用同一語彙作中間級距。 */
function v57FacilityVisualProfile(level) {
  const lv = Math.max(1, Math.min(7, Number(level) || 1));
  if (lv === 1) return { level: lv, key: "local", artKey: "stadium_lv1_generated", stage: "在地開放球場", roof: "open", skyline: false };
  if (lv === 2) return { level: lv, key: "community", artKey: "stadium_lv1_generated", stage: "社區擴張球場", roof: "open", skyline: false };
  if (lv === 3) return { level: lv, key: "city", artKey: "stadium_lv3_generated", stage: "小型開放城市球場", roof: "open", skyline: true };
  if (lv === 4) return { level: lv, key: "city-plus", artKey: "stadium_lv3_generated", stage: "現代化城市球場", roof: "partial", skyline: true };
  if (lv === 5) return { level: lv, key: "flagship", artKey: "stadium_lv5_generated", stage: "大型屋架旗艦球場", roof: "partial", skyline: true };
  if (lv === 6) return { level: lv, key: "flagship-plus", artKey: "stadium_lv5_generated", stage: "旗艦擴建球場", roof: "partial", skyline: true };
  return { level: lv, key: "dome", artKey: "stadium_lv7_generated", stage: "全罩式巨蛋", roof: "dome", skyline: true };
}
function v57FacilityAgedCount(team) {
  const slots = team && team.facility && Array.isArray(team.facility.stadiumSlots) ? team.facility.stadiumSlots : [];
  const built = team && team.facility && Array.isArray(team.facility.slotBuilt) ? team.facility.slotBuilt : [];
  const year = typeof S !== "undefined" && S && typeof S.seasonYear === "number" ? S.seasonYear : 1;
  return slots.reduce((n, key, i) => n + (stadiumFacilityType(key) && typeof built[i] === "number" && year - built[i] >= STADIUM_LIFE ? 1 : 0), 0);
}
function v57FacilityTabSummary(team, ftab) {
  if (ftab === "球場") return "球場等級、容量、格位與周邊收入出口";
  if (ftab === "訓練基地") {
    const lv = Math.max(0, ...TRAINING_ITEMS.map(it => trainingLevel(team, it.key)));
    return `訓練項目最高 Lv.${lv}・年度成長出口`;
  }
  if (ftab === "醫療室") return `醫療室 Lv.${medicalLevel(team)}・受傷與恢復出口`;
  if (ftab === "球探辦公室") return `球探辦公室 Lv.${scoutOfficeLevel(team)}・評估精準度出口`;
  if (ftab === "宿舍") return `選手宿舍 Lv.${dormLevel(team)}・休養與成長出口`;
  if (ftab === "情蒐分析室") return `情蒐分析室 Lv.${analysisRoomLevel(team)}・情報出口`;
  return `復健中心 Lv.${rehabCenterLevel(team)}・傷病恢復出口`;
}
function v57FacilityStateOverlay(state) {
  const kind = state && state.locked ? "locked" : state && state.agedCount > 0 ? "aged" : state && state.upgradeReady ? "upgrade" : "";
  if (!kind) return "";
  const label = kind === "locked" ? "尚未開放" : kind === "aged" ? "老舊／重建狀態" : "可升級";
  const glyph = kind === "locked" ? "🔒" : kind === "aged" ? "⚠" : "↗";
  return `<span class="v57-visual-status ${kind}" aria-label="${label}"><span aria-hidden="true">${glyph}</span><span>${label}</span></span>`;
}
function v57StadiumVisual(profile, state) {
  const src = typeof v60CompatArtDataUrl === "function" ? v60CompatArtDataUrl(profile.artKey) : "";
  const fallback = src ? `<img class="v57-confirmed-art-image" src="${src}" alt="Lv.${profile.level} ${profile.stage}" loading="lazy" decoding="async">` : `<div class="v57-art-missing">已核准素材尚未載入</div>`;
  return `<div class="v57-facility-scene-frame v57-scene-${profile.key}" role="img" aria-label="Lv.${profile.level} ${profile.stage}">${fallback}${v57FacilityStateOverlay(state)}</div>`;
}
function v57FacilityTabArtKey(ftab) {
  if (ftab === "訓練基地") return "training_base_generated";
  if (ftab === "醫療室") return "medical_base_generated";
  if (ftab === "球探辦公室") return "scouting_base_generated";
  if (ftab === "宿舍") return "dorm_base_generated";
  if (ftab === "情蒐分析室") return "analysis_rehab_base_generated";
  if (ftab === "復健中心") return "rehab_base_generated";
  return "";
}
function v57FacilityTabVisualData(team, ftab, cur) {
  if (ftab === "球場") return { level: cur.level, label: cur.label, artKey: "", facts: [[cur.capacity.toLocaleString(), "容量"], [String((team.facility.stadiumSlots || []).length) + "/" + cur.slots, "球場格位"], [S.currentDay === 0 ? "春訓" : "球季中", "操作窗口"]] };
  if (ftab === "訓練基地") {
    const lv = Math.max(0, ...TRAINING_ITEMS.map(it => trainingLevel(team, it.key)));
    return { level: lv, label: "訓練基地", artKey: "training_base_generated", facts: [["Lv." + lv, "最高訓練等級"], [String(TRAINING_ITEMS.length), "訓練項目"], [S.currentDay === 0 ? "春訓" : "球季中", "操作窗口"]] };
  }
  if (ftab === "醫療室") { const lv = medicalLevel(team); return { level: lv, label: "醫療室", artKey: "medical_base_generated", facts: [["Lv." + lv, "設施等級"], ["-" + (lv * 8) + "%", "受傷機率"], ["-" + (lv * 6) + "%", "恢復天數"]] }; }
  if (ftab === "球探辦公室") { const lv = scoutOfficeLevel(team); return { level: lv, label: "球探辦公室", artKey: "scouting_base_generated", facts: [["Lv." + lv, "設施等級"], ["+" + (lv * 2), "評估精準度"], [S.currentDay === 0 ? "可升級" : "球季中", "操作窗口"]] }; }
  if (ftab === "宿舍") { const lv = dormLevel(team); return { level: lv, label: "宿舍", artKey: "dorm_base_generated", facts: [["Lv." + lv, "設施等級"], ["+" + (lv * 2), "疲勞恢復"], [S.currentDay === 0 ? "可升級" : "球季中", "操作窗口"]] }; }
  if (ftab === "情蒐分析室") { const lv = analysisRoomLevel(team); return { level: lv, label: "情蒐分析室", artKey: "analysis_rehab_base_generated", facts: [["Lv." + lv, "設施等級"], ["+" + lv, "情報加成"], [S.currentDay === 0 ? "可升級" : "球季中", "操作窗口"]] }; }
  const lv = rehabCenterLevel(team);
  return { level: lv, label: "復健中心", artKey: "rehab_base_generated", facts: [["Lv." + lv, "設施等級"], ["-" + (lv * 8) + "%", "恢復天數"], [S.currentDay === 0 ? "可升級" : "球季中", "操作窗口"]] };
}
function v57FacilityTabArtVisual(ftab, profile, view, state) {
  if (ftab === "球場") return v57StadiumVisual(profile, state);
  const src = typeof v60CompatArtDataUrl === "function" ? v60CompatArtDataUrl(view.artKey) : "";
  const fallback = src ? `<img class="v57-confirmed-art-image" src="${src}" alt="${view.label}" loading="lazy" decoding="async">` : `<div class="v57-art-missing">已核准素材尚未載入</div>`;
  return `<div class="v57-facility-scene-frame v57-facility-scene" role="img" aria-label="${view.label} Lv.${view.level}">${fallback}${v57FacilityStateOverlay(state)}</div>`;
}
function renderV57FacilityVisual(team, cur, next, canUpgrade, ftab) {
  const view = v57FacilityTabVisualData(team, ftab, cur);
  const profile = v57FacilityVisualProfile(ftab === "球場" ? cur.level : 1);
  const slots = team && team.facility && Array.isArray(team.facility.stadiumSlots) ? team.facility.stadiumSlots : [];
  const agedCount = ftab === "球場" ? v57FacilityAgedCount(team) : 0;
  const upgradeReady = ftab === "球場" ? !!(next && canUpgrade && team.finance && team.finance.budget >= next.upgradeCost) : !!(view.level < (ftab === "訓練基地" ? TRAINING_MAX_LEVEL : ftab === "醫療室" ? MEDICAL_MAX_LEVEL : ftab === "宿舍" ? DORM_MAX_LEVEL : ftab === "情蒐分析室" ? ANALYSIS_MAX_LEVEL : ftab === "復健中心" ? REHAB_MAX_LEVEL : 5) && canUpgrade);
  const locked = ftab !== "球場" && view.level <= 0;
  const statusLabel = agedCount > 0 ? `老舊 ${agedCount} 座` : locked ? "尚未開放" : upgradeReady ? "可升級" : (ftab === "球場" && !next) ? "最高級" : "營運中";
  const pills = ftab === "球場" ? Array.from({ length: Math.min(cur.slots, 15) }, function (_, i) {
    const filled = !!slots[i];
    return `<span class="v57-slot-pill ${filled ? "filled" : "empty"}" aria-label="${filled ? "已建設施" : "空格位"}">${filled ? "●" : "＋"}</span>`;
  }).join("") : `<span class="v57-facility-tab-chip">${ftab}</span>`;
  const facts = view.facts.map(function (item) { return `<div><strong>${item[0]}</strong><span>${item[1]}</span></div>`; }).join("");
  return `<section class="v57-facility-hero" data-v57-facility-visual="true" data-facility-level="${view.level}" data-facility-stage="${ftab === "球場" ? profile.key : view.artKey}">
    <div class="v57-facility-hero-copy">
      <span class="v57-facility-kicker">FACILITY VISUAL・${ftab}</span>
      <h2>${ftab === "球場" ? profile.stage : view.label}</h2>
      <p>${v57FacilityTabSummary(team, ftab)}。視覺先呈現目前狀態，完整數值與既有操作保留在下方。</p>
      <div class="v57-facility-status-row"><span class="v57-state-badge ${agedCount > 0 ? "aged" : locked ? "locked" : upgradeReady ? "upgrade" : "stable"}">${statusLabel}</span><span class="v57-level-badge">Lv.${view.level}・${view.label}</span></div>
      <div class="v57-facility-facts">${facts}</div>
      <div class="v57-slot-legend" aria-label="設施格位視覺摘要">${pills}</div>
    </div>
    <div class="v57-facility-hero-scene">${v57FacilityTabArtVisual(ftab, profile, view, { agedCount, upgradeReady, locked })}<div class="v57-scene-caption">${ftab === "球場" ? profile.stage : view.label}・standalone facility art</div></div>
  </section>`;
}
function renderFacilities() {
  const team = S.teams[S.userTeamId];
  ensureFinance(team); ensureFacility(team); ensureFacilities(team);
  const canUpgrade = S.currentDay === 0;
  const ftab = FACILITY_TABS.includes(UI.facilityTab) ? UI.facilityTab : "球場";
  const cur = facilityInfo(team);
  const next = FACILITY_LEVELS.find(f => f.level === team.facility.level + 1);
  let body = "";
  if (ftab === "球場") {
    ensureStadiumSlots(team);
    const eff = stadiumEffects(team);
    const slotMax = stadiumSlotCount(team);
    const built = team.facility.stadiumSlots;
    const perCap = stadiumPerCapitaSpend(team, 1);
    body = `
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">目前等級</div><div class="sb-value small">Lv.${cur.level}・${cur.label}</div></div>
        <div class="sb-row small"><div class="sb-label">目前容量</div><div class="sb-value small">${cur.capacity.toLocaleString()} 人</div></div>
        <div class="sb-row small"><div class="sb-label">設施格位</div><div class="sb-value small">${built.length} / ${slotMax} 格</div></div>
        <div class="sb-row small"><div class="sb-label">設施效果合計</div><div class="sb-value small">人均消費 +${Math.round(eff.spendPct * 100)}%・進場率 +${(eff.attPct * 100).toFixed(1)}%${eff.popBoost ? `・人氣成長 +${eff.popBoost}` : ""}</div></div>
        <div class="sb-row small"><div class="sb-label">觀眾人均消費</div><div class="sb-value small">${perCap.toFixed(1)} 元/人次</div></div>
        <div class="sb-row small"><div class="sb-label">年度維護費合計</div><div class="sb-value small">${formatMoney(eff.maintenance)}</div></div>
        <div class="sb-row small"><div class="sb-label">球場完備度</div><div class="sb-value small">${(stadiumCompleteness(team) * 100).toFixed(1)}%${eff.aged > 0 ? `・${icon('warn')}${eff.aged}座老舊` : ""}</div></div>
      </div>
      <div class="divlabel">已建設施（${built.length}/${slotMax}格）${canUpgrade ? "" : "・春訓期間才能建造/拆除/重建"}</div>
      ${eff.aged > 0 ? `<p class="sub dark">${icon('warn')} 有 ${eff.aged} 座設施屋齡達 ${STADIUM_LIFE} 年老舊化（效果減半、維護費照收），可花「建設費×${Math.round(STADIUM_REBUILD_COST * 100)}%」重建復原（每個休賽季限 1 座）。</p>` : ""}
      ${built.length === 0 ? `<p class="sub dark">目前沒有任何格位設施。周邊收入＝主場進場人次×人均消費，蓋設施可以拉高人均消費與進場率。</p>` : `
      <table class="stattable">
        <thead><tr><th>設施</th><th>屋齡</th><th>效果</th><th>年維護費</th><th></th></tr></thead>
        <tbody>${built.map((k, i) => {
          const t = stadiumFacilityType(k);
          if (!t) return "";
          const aged = stadiumSlotAged(team, i);
          const age = stadiumSlotAge(team, i);
          const fx = [t.spendPct ? `消費+${Math.round(t.spendPct * 100 * (aged ? STADIUM_DECAY_MULT : 1))}%` : "", t.attPct ? `進場+${(t.attPct * 100 * (aged ? STADIUM_DECAY_MULT : 1)).toFixed(1)}%` : "", t.popBoost ? `人氣+${t.popBoost}` : ""].filter(Boolean).join("・");
          const rebuildCost = Math.round(t.cost * STADIUM_REBUILD_COST);
          return `<tr><td>${iconVal(t.icon)}${t.label}${aged ? " "+icon('warn')+"老舊" : ""}</td><td>${age}年</td><td>${fx}</td><td>${formatMoney(Math.round(t.cost * t.maintPct))}</td>
            <td>${aged ? `<button class="pickbtn btn-rebuild-stadium" data-idx="${i}" ${canUpgrade ? "" : "disabled"}>重建 ${formatMoney(rebuildCost)}</button>` : `<button class="pickbtn warn btn-demolish-stadium" data-idx="${i}" ${canUpgrade ? "" : "disabled"}>拆除</button>`}</td></tr>`;
        }).join("")}</tbody>
      </table>
      <p class="sub dark">拆除退回建設費 ${Math.round(STADIUM_DEMOLISH_REFUND * 100)}%；重建費＝建設費×${Math.round(STADIUM_REBUILD_COST * 100)}%（屋齡歸零、效果恢復）。</p>`}
      <div class="divlabel">建造新設施（可重複建造同類，效果疊加）</div>
      ${built.length >= slotMax ? `<p class="sub dark">格位已滿：升級球場等級可獲得更多格位。</p>` : ""}
      ${STADIUM_FACILITY_TYPES.map(t => {
        const owned = built.filter(k => k === t.key).length;
        const fx = [t.spendPct ? `人均消費 +${Math.round(t.spendPct * 100)}%` : "", t.attPct ? `進場率 +${(t.attPct * 100).toFixed(1)}%` : "", t.popBoost ? `季末人氣 +${t.popBoost}` : ""].filter(Boolean).join("・");
        const affordable = team.finance.budget >= t.cost;
        return `<div class="card">
          <div class="eyebrow">${iconVal(t.icon)} ${t.label}${owned > 0 ? `・已建 ${owned} 座` : ""}</div>
          <p class="sub dark" style="margin:4px 0;">${t.desc}</p>
          <p class="sub dark" style="margin:4px 0;">${fx}｜建設費 ${formatMoney(t.cost)}・年維護 ${formatMoney(Math.round(t.cost * t.maintPct))}（${Math.round(t.maintPct * 100)}%）</p>
          <button class="pickbtn btn-build-stadium" data-key="${t.key}" ${canUpgrade && affordable && built.length < slotMax ? "" : "disabled"}>建造</button>
        </div>`;
      }).join("")}
      <div class="divlabel">硬體等級一覽</div>
      <table class="stattable">
        <thead><tr><th>等級</th><th>名稱</th><th>容量</th><th>格位</th><th>升級費用</th><th></th></tr></thead>
        <tbody>
          ${FACILITY_LEVELS.map(f => `<tr class="${f.level === team.facility.level ? "me" : ""}">
            <td>Lv.${f.level}</td><td>${f.label}</td><td>${f.capacity.toLocaleString()}</td><td>${f.slots}${f.level === 7 ? "（12＋地標獎勵3）" : ""}</td>
            <td>${f.level === 1 ? "－" : formatMoney(f.upgradeCost)}</td>
            <td>${f.level === team.facility.level ? "目前等級" : (next && f.level === next.level ? `<button id="btn-upgrade-facility" class="pickbtn" ${canUpgrade && team.finance.budget >= f.upgradeCost ? "" : "disabled"}>升級</button>` : "－")}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      ${!next ? `<p class="sub dark">已經是最高等級的球場硬體！</p>` : ""}`;
  } else if (ftab === "訓練基地") {
    const groups = [...new Set(TRAINING_ITEMS.map(it => it.group))];
    body = `
      <p class="sub dark" style="margin-bottom:10px;">各訓練項目獨立升級（最高Lv.${TRAINING_MAX_LEVEL}），提升對應能力的年度成長幅度（效果與教練指導加成疊加，於休賽季成長結算時生效）。</p>
      ${groups.map(g => `
      <div class="card">
        <div class="eyebrow">${g}</div>
        ${TRAINING_ITEMS.filter(it => it.group === g).map(it => {
          const lv = trainingLevel(team, it.key);
          const maxed = lv >= TRAINING_MAX_LEVEL;
          const cost = maxed ? 0 : TRAINING_UPGRADE_COSTS[lv] * 10000;
          return `<div class="facilityrow">
            <div class="facilityinfo">
              <div class="facilityname">${it.label} <span class="facilitylv ${maxed ? "max" : ""}">Lv.${lv}${maxed ? "・MAX" : ""}</span></div>
              <div class="facilitydesc">${it.desc}${maxed ? "" : `<br>升級費用：${formatMoney(cost)}`}</div>
            </div>
            ${maxed ? "" : `<button class="upbtn train-up-btn" data-key="${it.key}" ${canUpgrade && team.finance.budget >= cost ? "" : "disabled"}>升級</button>`}
          </div>`;
        }).join("")}
      </div>`).join("")}`;
  } else if (ftab === "醫療室") {
    const lv = medicalLevel(team);
    const maxed = lv >= MEDICAL_MAX_LEVEL;
    const cost = maxed ? 0 : MEDICAL_UPGRADE_COSTS[lv] * 10000;
    body = `
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">醫療室等級</div><div class="sb-value small">Lv.${lv}${maxed ? "（MAX）" : ""}</div></div>
        <div class="sb-row small"><div class="sb-label">受傷機率修正</div><div class="sb-value small">-${lv * 8}%</div></div>
        <div class="sb-row small"><div class="sb-label">恢復天數修正</div><div class="sb-value small">-${lv * 6}%</div></div>
      </div>
      <div class="card">
        <div class="eyebrow">醫療室</div>
        <p class="sub dark">球員出賽時有低機率受傷（耐久度越低、年齡越大機率越高），傷兵在恢復期間無法出賽。醫療室每升1級：受傷機率-8%、恢復天數-6%（最高Lv.${MEDICAL_MAX_LEVEL}：-40%／-30%）。</p>
        ${maxed ? `<p class="sub dark">已達最高等級。</p>` : `
        <p class="sub dark">升級至 Lv.${lv + 1} 費用：<b>${formatMoney(cost)}</b></p>
        <div class="btnrow"><button id="btn-upgrade-medical" class="btn-primary" ${canUpgrade && team.finance.budget >= cost ? "" : "disabled"}>升級醫療室</button></div>`}
      </div>`;
  } else if (ftab === "宿舍") {
    const lv = dormLevel(team);
    const maxed = lv >= DORM_MAX_LEVEL;
    const cost = maxed ? 0 : DORM_UPGRADE_COSTS[lv] * 10000;
    body = `
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">選手宿舍等級</div><div class="sb-value small">Lv.${lv}${maxed ? "（MAX）" : ""}</div></div>
        <div class="sb-row small"><div class="sb-label">投手疲勞恢復加成</div><div class="sb-value small">+${lv * 2}/日</div></div>
        <div class="sb-row small"><div class="sb-label">狀況回升傾向</div><div class="sb-value small">+${lv * 2}%</div></div>
        <div class="sb-row small"><div class="sb-label">年輕球員成長加成</div><div class="sb-value small">+${lv * 2}%（23歲以下）</div></div>
      </div>
      <div class="card">
        <div class="eyebrow">選手宿舍</div>
        <p class="sub dark">提供全隊更好的休養與生活環境：每日狀況漂移更容易往「好調」方向、投手每日疲勞恢復每級+2、23歲以下年輕球員的年度成長獲得微幅加成。是「季中特訓↔疲勞受傷」循環中的恢復端投資。</p>
        ${maxed ? `<p class="sub dark">已達最高等級。</p>` : `
        <p class="sub dark">升級至 Lv.${lv + 1} 費用：<b>${formatMoney(cost)}</b></p>
        <div class="btnrow"><button id="btn-upgrade-dorm" class="btn-primary" ${canUpgrade && team.finance.budget >= cost ? "" : "disabled"}>升級選手宿舍</button></div>`}
      </div>`;
  } else if (ftab === "情蒐分析室") {
    const lv = analysisRoomLevel(team);
    const maxed = lv >= ANALYSIS_MAX_LEVEL;
    const cost = maxed ? 0 : ANALYSIS_UPGRADE_COSTS[lv] * 10000;
    body = `
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">情蒐分析室等級</div><div class="sb-value small">Lv.${lv}${maxed ? "（MAX）" : ""}</div></div>
        <div class="sb-row small"><div class="sb-label">球探評估精準度再加成</div><div class="sb-value small">+${lv * 1}</div></div>
        <div class="sb-row small"><div class="sb-label">比賽情蒐加成</div><div class="sb-value small">期望得分 +${(lv * 0.05).toFixed(2)}</div></div>
      </div>
      <div class="card">
        <div class="eyebrow">情蒐分析室</div>
        <p class="sub dark">建立數據與影像分析部門：三位球探的有效評估精準度再+1/級（與球探辦公室疊加，選秀/國際/交易評估誤差更小）、比賽中依情蒐獲得微幅期望得分加成，且Lv.1起主控台會顯示「對手情蒐報告」（Lv.3以上揭露對手攻投戰力數值）。</p>
        ${maxed ? `<p class="sub dark">已達最高等級。</p>` : `
        <p class="sub dark">升級至 Lv.${lv + 1} 費用：<b>${formatMoney(cost)}</b></p>
        <div class="btnrow"><button id="btn-upgrade-analysis" class="btn-primary" ${canUpgrade && team.finance.budget >= cost ? "" : "disabled"}>升級情蒐分析室</button></div>`}
      </div>`;
  } else if (ftab === "復健中心") {
    const lv = rehabCenterLevel(team);
    const maxed = lv >= REHAB_MAX_LEVEL;
    const cost = maxed ? 0 : REHAB_UPGRADE_COSTS[lv] * 10000;
    body = `
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">復健中心等級</div><div class="sb-value small">Lv.${lv}${maxed ? "（MAX）" : ""}</div></div>
        <div class="sb-row small"><div class="sb-label">恢復天數修正</div><div class="sb-value small">-${lv * 8}%（與醫療室疊加）</div></div>
        <div class="sb-row small"><div class="sb-label">保守治療降評機率</div><div class="sb-value small">-${lv * 3}%</div></div>
        <div class="sb-row small"><div class="sb-label">舊傷復發風險削減</div><div class="sb-value small">-${lv * 8}%</div></div>
      </div>
      <div class="card">
        <div class="eyebrow">復健中心</div>
        <p class="sub dark">專業復健團隊與設備：受傷恢復天數每級-8%（與醫療室的-6%疊加）、重傷選擇「保守治療」時的傷癒降評機率每級-3%、傷病史造成的舊傷復發風險每級削減8%。傷兵越多、越該投資這裡。</p>
        ${maxed ? `<p class="sub dark">已達最高等級。</p>` : `
        <p class="sub dark">升級至 Lv.${lv + 1} 費用：<b>${formatMoney(cost)}</b></p>
        <div class="btnrow"><button id="btn-upgrade-rehab" class="btn-primary" ${canUpgrade && team.finance.budget >= cost ? "" : "disabled"}>升級復健中心</button></div>`}
      </div>`;
  } else {
    const lv = scoutOfficeLevel(team);
    const maxed = lv >= SCOUT_OFFICE_MAX_LEVEL;
    const cost = maxed ? 0 : SCOUT_OFFICE_UPGRADE_COSTS[lv] * 10000;
    body = `
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">球探辦公室等級</div><div class="sb-value small">Lv.${lv}${maxed ? "（MAX）" : ""}</div></div>
        <div class="sb-row small"><div class="sb-label">球探精準度加成</div><div class="sb-value small">+${lv * 2}</div></div>
        <div class="sb-row small"><div class="sb-label">國際獨家人脈名額</div><div class="sb-value small">${exclusiveIntlSlots(team)} 位/年</div></div>
        <div class="sb-row small"><div class="sb-label">國內選秀獨家名額</div><div class="sb-value small">${exclusiveDraftSlots(team)} 位/屆</div></div>
      </div>
      <div class="card">
        <div class="eyebrow">球探辦公室</div>
        <p class="sub dark">提升三位球探（國內/國際/交易）的有效評估精準度（每級+2），並擴大兩條獨家人脈：國際球探精準度越高，每年國際市場能多挖出越多獨家人選；國內球探精準度達63/75/87，每屆選秀還能額外挖出1/2/3位其他球團看不到的獨家新秀（不佔公開池等級配額）。</p>
        ${maxed ? `<p class="sub dark">已達最高等級。</p>` : `
        <p class="sub dark">升級至 Lv.${lv + 1} 費用：<b>${formatMoney(cost)}</b></p>
        <div class="btnrow"><button id="btn-upgrade-scoutoffice" class="btn-primary" ${canUpgrade && team.finance.budget >= cost ? "" : "disabled"}>升級球探辦公室</button></div>`}
      </div>`;
  }
  if (ftab === "球場") ensureStadiumSlots(team);
  const v57Visual = renderV57FacilityVisual(team, cur, next, canUpgrade, ftab);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>硬體建設</h1></div>
      ${renderRosterNav("facilities")}
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      <div class="tabrow v57-facility-tabs">
        ${FACILITY_TABS.map(t => `<button class="tab fac-tab ${ftab === t ? "active" : ""}" data-factab="${t}">${t}</button>`).join("")}
      </div>
      ${v57Visual}
      <p class="sub dark" style="margin-bottom:10px;">${canUpgrade ? "現在是春訓期間，可以投資升級硬體設施。" : "本季已開打，硬體升級要等下個休賽季開幕前（春訓期間）才能進行。"}目前預算：<b>${formatMoney(team.finance.budget)}</b></p>
      ${body}
      <div class="btnrow"><button id="btn-back" class="btn-secondary">返回主控台</button></div>
    </div>`;
  app.querySelectorAll(".fac-tab").forEach(btn => { btn.onclick = () => { UI.facilityTab = btn.dataset.factab; UI.flash = null; render(); }; });
  const btn = document.getElementById("btn-upgrade-facility");
  if (btn) btn.onclick = () => upgradeFacility(next.level);
  app.querySelectorAll(".btn-build-stadium").forEach(b => { b.onclick = () => buildStadiumFacility(b.dataset.key); });     // v30
  app.querySelectorAll(".btn-demolish-stadium").forEach(b => { b.onclick = () => demolishStadiumFacility(Number(b.dataset.idx)); }); // v30
  app.querySelectorAll(".btn-rebuild-stadium").forEach(b => { b.onclick = () => rebuildStadiumFacility(Number(b.dataset.idx)); }); // v31重建老舊設施
  app.querySelectorAll(".train-up-btn").forEach(b => { b.onclick = () => upgradeTrainingItem(b.dataset.key); });
  const mbtn = document.getElementById("btn-upgrade-medical");
  if (mbtn) mbtn.onclick = () => upgradeMedical();
  const sbtn = document.getElementById("btn-upgrade-scoutoffice");
  if (sbtn) sbtn.onclick = () => upgradeScoutOffice();
  const dbtn = document.getElementById("btn-upgrade-dorm");           // v26
  if (dbtn) dbtn.onclick = () => upgradeDorm();
  const abtn = document.getElementById("btn-upgrade-analysis");       // v26
  if (abtn) abtn.onclick = () => upgradeAnalysisRoom();
  const rbtn = document.getElementById("btn-upgrade-rehab");          // v26
  if (rbtn) rbtn.onclick = () => upgradeRehabCenter();
  document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
  wireRosterNav();
}
/* ====================================================================
   v26季中訓練指派：球季進行中為球員指定一個加練項目，與春訓/年度成長疊加。
   - 每個比賽日累積訓練點，滿100點該項屬性+1（不超潛力天花板；單次指派本季最多+3）
   - 累積速度：基礎10點 ×(1+訓練設施6%/級) ×(1+教練加成) ×練習狂1.25 ×2軍1.3 ×30歲以上0.5
   - 代價：受訓中受傷機率×1.15（玻璃體質×1.3）、投手每日疲勞恢復-20%、2軍受訓者另有每日微量訓練傷風險
   - 同時指派名額＝4＋最高訓練設施等級；受傷自動中止；休賽季（developPlayer）自動清除
   ==================================================================== */
const MID_TRAINING_ITEMS = [
  { key: "mVelocity", label: "球速特訓", forPitcher: true,  facKey: "pitchVelocity", coachCat: "pitching",     attrLabel: "球速" },
  { key: "mControl",  label: "控球特訓", forPitcher: true,  facKey: "pitchControl",  coachCat: "pitching",     attrLabel: "控球" },
  { key: "mBreaking", label: "變化球特訓", forPitcher: true, facKey: "pitchBreaking", coachCat: "pitching",     attrLabel: "變化球" },
  { key: "mStaminaP", label: "體力強化", forPitcher: true,  facKey: null,            coachCat: "conditioning", attrLabel: "體力" },
  { key: "mContact",  label: "打擊特訓", forPitcher: false, facKey: "batContact",    coachCat: "batting",      attrLabel: "接觸力" },
  { key: "mPower",    label: "力量強化", forPitcher: false, facKey: "batPower",      coachCat: "batting",      attrLabel: "長打力" },
  { key: "mEye",      label: "選球特訓", forPitcher: false, facKey: "batEye",        coachCat: "batting",      attrLabel: "選球眼" },
  { key: "mRun",      label: "跑壘特訓", forPitcher: false, facKey: "baserunning",   coachCat: "running",      attrLabel: "跑壘/盜壘" },
  { key: "mDefense",  label: "守備特訓", forPitcher: false, facKey: "defense",       coachCat: "infield_d",    attrLabel: "守備" },
  { key: "mBunt",     label: "觸擊特訓", forPitcher: false, facKey: "bunting",       coachCat: "batting",      attrLabel: "觸擊" }
];
const MID_TRAINING_SEASON_CAP = 3;    // 單次指派本季最多+3
const MID_TRAINING_POINTS_PER_GAIN = 100;
function midItemByKey(key) { return MID_TRAINING_ITEMS.find(it => it.key === key) || null; }
function midItemsFor(p) { return MID_TRAINING_ITEMS.filter(it => it.forPitcher === !!p.isPitcher); }
function midTrainingSlots(team) {
  ensureFacilities(team);
  const maxFac = Math.max(0, ...TRAINING_ITEMS.map(it => trainingLevel(team, it.key)));
  return 4 + maxFac; // 名額＝4＋最高訓練設施等級
}
function midTrainingPlayers(team) {
  return team.roster1.concat(team.roster2).map(id => S.players[id]).filter(p => p && p.midTraining);
}
function midTrainingSeasonActive() {
  return S.gameStarted && S.currentDay > 0 && S.schedule && S.currentDay < S.schedule.length;
}
function assignMidTraining(playerId, key) {
  const team = S.teams[S.userTeamId];
  const p = S.players[playerId];
  const item = midItemByKey(key);
  if (!p || !item || p.team !== S.userTeamId) return;
  if (!midTrainingSeasonActive()) { UI.flash = "季中特訓只能在球季進行中指派。"; render(); return; }
  if (isInjured(p)) { UI.flash = `${p.name} 目前是傷兵，無法進行特訓。`; render(); return; }
  if (item.forPitcher !== !!p.isPitcher) return;
  const others = midTrainingPlayers(team).filter(x => x.id !== p.id).length;
  if (others >= midTrainingSlots(team)) {
    UI.flash = `特訓名額已滿（${midTrainingSlots(team)} 人，可透過升級訓練設施擴充），請先停止其他球員的特訓。`;
    render(); return;
  }
  p.midTraining = { key, points: 0, gained: 0, year: S.seasonYear };
  UI.flash = `${p.name} 開始「${item.label}」：每日累積訓練點，滿100點提升「${item.attrLabel}」（本季最多+${MID_TRAINING_SEASON_CAP}）。注意：受訓期間受傷風險上升${p.isPitcher ? "、疲勞恢復變慢" : ""}。`;
  persist(); render();
}
function stopMidTraining(playerId, silent) {
  const p = S.players[playerId];
  if (!p || !p.midTraining) return;
  const item = midItemByKey(p.midTraining.key);
  delete p.midTraining;
  if (!silent) { UI.flash = `${p.name} 已停止「${item ? item.label : "特訓"}」。`; persist(); render(); }
}
function midTrainingDailyPoints(p, team, item) {
  let pts = 10;
  if (item.facKey) pts *= 1 + trainingGrowthBonus(team, item.facKey);                         // 設施+6%/級
  const cat = item.coachCat === "infield_d" ? (isInfielderPos(p) ? "infield_d" : "outfield_d") : item.coachCat;
  pts *= 1 + clamp(specificCoachBonus(team, p.level, cat), 0, 0.45);                          // 教練加成
  if (hasTrait(p, "grinder")) pts *= 1.25;                                                    // 練習狂
  if (p.level === "2軍") pts *= 1.3;                                                          // 2軍出賽壓力小
  if (p.age >= 30) pts *= 0.5;                                                                // 30歲以上效率減半
  return pts;
}
// 套用+1（沿用春訓的天花板規則：不超過潛力、已超過者維持不降）；回傳套用結果字串或null（已頂天）
function applyMidTrainingGain(p, item) {
  const cap = (cur) => Math.min(clamp(cur + 1, 20, 95), Math.max(cur, p.potential));
  const tryUp = (attr, label) => { const b = p[attr]; p[attr] = cap(p[attr]); return p[attr] > b ? `${label} ${b}→${p[attr]}` : null; };
  switch (item.key) {
    case "mVelocity": return tryUp("velocity", "球速");
    case "mControl":  return tryUp("control", "控球");
    case "mBreaking": {
      const pool = (p.pitches || []).filter(pt => Math.min(pt.stuff + 1, Math.max(pt.stuff, p.potential)) > pt.stuff);
      if (pool.length === 0) return null;
      const pt = choice(pool); const b = pt.stuff; pt.stuff = Math.min(clamp(pt.stuff + 1, 20, 95), Math.max(pt.stuff, p.potential));
      return pt.stuff > b ? `${pt.type}球威 ${b}→${pt.stuff}` : null;
    }
    case "mStaminaP": return tryUp("stamina", "體力");
    case "mContact":  return tryUp("contact", "接觸力");
    case "mPower":    return tryUp("power", "長打力");
    case "mEye":      return tryUp("eye", "選球眼");
    case "mRun":      return (p.speed <= p.steal ? tryUp("speed", "跑壘速度") : tryUp("steal", "盜壘")) || tryUp("speed", "跑壘速度") || tryUp("steal", "盜壘");
    case "mDefense":  return tryUp("fielding", "守備");
    case "mBunt":     { if (typeof p.bunting !== "number") p.bunting = 45; return tryUp("bunting", "觸擊"); }
  }
  return null;
}
// 每個比賽日呼叫（simulateDay內）：累積訓練點、判定成長、微量訓練傷風險
function tickMidTraining() {
  const team = S.teams[S.userTeamId];
  if (!team || !midTrainingSeasonActive()) return;
  midTrainingPlayers(team).forEach(p => {
    if (isInjured(p)) { stopMidTraining(p.id, true); if (typeof pushNews === "function") pushNews("訓練", `${p.name} 因傷退出特訓計畫。`); return; }
    const item = midItemByKey(p.midTraining.key);
    if (!item) { delete p.midTraining; return; }
    // 微量每日訓練傷風險（涵蓋不出賽的2軍受訓者；玻璃體質加倍）
    const trainInjChance = 0.0015 * (hasTrait(p, "glass") ? 2 : (hasTrait(p, "ironman") ? 0.6 : 1));
    if (Math.random() < trainInjChance && typeof applyInjury === "function") {
      applyInjury(p, team);
      stopMidTraining(p.id, true);
      if (typeof pushNews === "function") pushNews("傷兵", `${p.name} 特訓時受傷（${p.injury ? p.injury.name : ""}），退出特訓計畫。`);
      return;
    }
    p.midTraining.points += midTrainingDailyPoints(p, team, item);
    if (p.midTraining.points >= MID_TRAINING_POINTS_PER_GAIN) {
      p.midTraining.points -= MID_TRAINING_POINTS_PER_GAIN;
      const res = applyMidTrainingGain(p, item);
      if (res) {
        p.midTraining.gained++;
        if (typeof pushNews === "function") pushNews("訓練", `特訓有成！${p.name} 的「${item.label}」見效：${res}。`);
        if (p.midTraining.gained >= MID_TRAINING_SEASON_CAP) {
          stopMidTraining(p.id, true);
          if (typeof pushNews === "function") pushNews("訓練", `${p.name} 完成本季「${item.label}」全部課表（+${MID_TRAINING_SEASON_CAP}），特訓圓滿結束。`);
        }
      } else {
        // 已達潛力天花板，繼續練沒有效果 → 自動停止
        stopMidTraining(p.id, true);
        if (typeof pushNews === "function") pushNews("訓練", `${p.name} 的「${item.label}」已達個人潛力極限，教練團結束了這份課表。`);
      }
    }
  });
}

const STARTING_BUDGET_MIN = 4000, STARTING_BUDGET_MAX = 8000; // 單位：萬元
const USER_STARTING_BUDGET = 6000 * 10000; // v34：玩家隊開局可動用預算固定6000萬（AI隊維持隨機，保留聯盟生態差異）
const USER_STARTING_POPULARITY = 35; // v37③：玩家隊開局人氣固定35（AI隊維持隨機），呼應「弱隊白手起家」定位、不隨機浮動
function fixUserStartingBudget() {
  if (!S.userTeamId || !S.teams[S.userTeamId]) return;
  const t = S.teams[S.userTeamId];
  ensureFinance(t);
  t.finance.budget = USER_STARTING_BUDGET;
  t.finance.popularity = USER_STARTING_POPULARITY; // v37③：只鎖玩家隊，AI維持genRating隨機
}

function ensureFinance(team) {
  if (!team.finance) {
    team.finance = {
      budget: randInt(STARTING_BUDGET_MIN, STARTING_BUDGET_MAX) * 10000,
      ticketPrice: 450,
      ticketPriceCap: TICKET_PRICE_CEIL_DEFAULT,
      popularity: genRating(50, 12),
      payroll: 0,
      signingBonusSpent: 0,
      lastSeasonReport: null
    };
  }
  if (team.finance.signingBonusSpent === undefined) team.finance.signingBonusSpent = 0;
  // 舊存檔相容：把舊的ticketTier換算成新的數字票價
  if (team.finance.ticketPrice === undefined) {
    const legacy = { low: 250, mid: 420, high: 620, premium: 880 }[team.finance.ticketTier] || 420;
    team.finance.ticketPrice = legacy;
    delete team.finance.ticketTier;
  }
  if (team.finance.ticketPriceCap === undefined) team.finance.ticketPriceCap = TICKET_PRICE_CEIL_DEFAULT;
}
function ensureAllFinance() { Object.values(S.teams).forEach(t => { ensureFinance(t); ensureFacility(t); ensureFacilities(t); }); }

// 票價換算進場意願比例：票價越接近本隊當前上限，進場意願越低。
// v34：加入人氣調節彈性——人氣越高的球隊，球迷對高票價越不敏感（懲罰係數 0.5−(人氣−50)/200，範圍0.2~0.6），
// 讓「長期經營人氣→撐得起高票價」成為有效策略（人氣50=舊制100%~50%，人氣99時票價開到上限仍約有74%意願）。
function ticketDemandRate(price, cap, popularity) {
  const pop = (popularity === undefined || popularity === null) ? 50 : popularity;
  const ratio = clamp((price - TICKET_PRICE_FLOOR) / Math.max(1, cap - TICKET_PRICE_FLOOR), 0, 1);
  const penalty = clamp(0.5 - (pop - 50) / 200, 0.2, 0.6);
  return 1 - ratio * penalty;
}
// 供UI即時顯示「這個價位大約幾成觀眾會進場」（含人氣/戰績基礎值一起估算，供自訂票價時參考）
function estimateAttendancePct(team, price) {
  ensureFinance(team);
  const gp = team.wins + team.losses;
  const winPct = gp > 0 ? team.wins / gp : 0.5;
  const base = 0.32 + (team.finance.popularity / 100) * 0.38 + (winPct - 0.5) * 0.55;
  const rate = clamp(base * ticketDemandRate(price, team.finance.ticketPriceCap, team.finance.popularity), 0.06, 0.98);
  return Math.round(rate * 100);
}

// 依球員目前綜合能力與年齡估算「市場身價」年薪（單位：元）。
// 年輕潛力股便宜、當打之年最貴、老將較便宜，貼近真實職業運動的合約行情曲線。
function computePlayerSalary(p) {
  const overall = p.isPitcher
    ? (p.velocity * 0.4 + p.control * 0.35 + p.stamina * 0.25)
    : (p.contact * 0.35 + p.power * 0.3 + p.eye * 0.15 + p.fielding * 0.2);
  const ageFactor = p.age <= 23 ? 0.55 : (p.age <= 29 ? 1.0 : (p.age <= 33 ? 0.8 : 0.5));
  const base = Math.pow(Math.max(overall - 28, 4), 1.55) * 55;
  return Math.max(80, Math.round(base * ageFactor / 10) * 10) * 1000;
}

function refreshPayroll(team, players) {
  ensureFinance(team);
  let total = 0;
  team.roster1.concat(team.roster2).forEach(id => {
    const p = players[id];
    if (!p) return;
    if (p.salary === undefined || p.contractYears === undefined) {
      p.salary = computePlayerSalary(p);
      p.contractYears = randInt(2, 5);
    }
    total += p.salary;
  });
  /* v54 A2：育成球員薪資（底薪 V54_DEV_MIN_SALARY = 80000） */
  if (team.rosterDev) {
    team.rosterDev.forEach(id => {
      const p = players[id];
      if (!p) return;
      if (p.salary === undefined) p.salary = (typeof V54_DEV_MIN_SALARY !== "undefined") ? V54_DEV_MIN_SALARY : 80000;
      total += p.salary;
    });
  }
  ["1軍", "2軍"].forEach(level => {
    COACH_ROLES.forEach(role => {
      const c = S.coaches[team.coachStaff[level][role]];
      if (c) total += c.salary;
    });
  });
  /* v54 A2：育成教練薪資 */
  if (team.coachStaff && team.coachStaff["育成"]) {
    Object.values(team.coachStaff["育成"]).forEach(cId => {
      const c = S.coaches[cId];
      if (c) total += c.salary;
    });
  }
  if (team.scouts) Object.values(team.scouts).forEach(s => { if (s) total += s.salary; });
  team.finance.payroll = total;
  return total;
}

/* r008：薪資分層明細——依 1軍/2軍/育成球員/教練/球探/主管 分類小計 */
function payBreakdownHtml(team, players) {
  var r1 = 0, r2 = 0, dev = 0, coach = 0, scout = 0, director = 0;
  team.roster1.forEach(function(id) { var p = players[id]; if (p) r1 += (p.salary || 0); });
  team.roster2.forEach(function(id) { var p = players[id]; if (p) r2 += (p.salary || 0); });
  if (team.rosterDev) team.rosterDev.forEach(function(id) { var p = players[id]; if (p) dev += (p.salary || 0); });
  ["1軍", "2軍"].forEach(function(level) {
    if (team.coachStaff && team.coachStaff[level]) {
      COACH_ROLES.forEach(function(role) {
        var c = S.coaches[team.coachStaff[level][role]];
        if (c) coach += (c.salary || 0);
      });
    }
  });
  if (team.coachStaff && team.coachStaff["育成"]) {
    Object.values(team.coachStaff["育成"]).forEach(function(cId) {
      var c = S.coaches[cId];
      if (c) coach += (c.salary || 0);
    });
  }
  if (team.scouts) Object.values(team.scouts).forEach(function(s) { if (s) scout += (s.salary || 0); });
  if (team.analysisDirector) director = team.analysisDirector.salary || 0;
  var total = r1 + r2 + dev + coach + scout + director;
  return '<div class="divlabel">薪資分層明細</div>' +
    '<table class="stattable"><thead><tr><th>類別</th><th>金額</th><th>佔比</th></tr></thead><tbody>' +
    '<tr><td>一軍球員（' + team.roster1.length + '人）</td><td>' + formatMoney(r1) + '</td><td>' + (total > 0 ? Math.round(r1/total*100) : 0) + '%</td></tr>' +
    '<tr><td>二軍球員（' + team.roster2.length + '人）</td><td>' + formatMoney(r2) + '</td><td>' + (total > 0 ? Math.round(r2/total*100) : 0) + '%</td></tr>' +
    '<tr><td>育成球員（' + (team.rosterDev ? team.rosterDev.length : 0) + '人）</td><td>' + formatMoney(dev) + '</td><td>' + (total > 0 ? Math.round(dev/total*100) : 0) + '%</td></tr>' +
    '<tr><td>教練團</td><td>' + formatMoney(coach) + '</td><td>' + (total > 0 ? Math.round(coach/total*100) : 0) + '%</td></tr>' +
    '<tr><td>球探室</td><td>' + formatMoney(scout) + '</td><td>' + (total > 0 ? Math.round(scout/total*100) : 0) + '%</td></tr>' +
    (director > 0 ? '<tr><td>分析主管</td><td>' + formatMoney(director) + '</td><td>' + (total > 0 ? Math.round(director/total*100) : 0) + '%</td></tr>' : '') +
    '<tr class="me"><td>合計</td><td>' + formatMoney(total) + '</td><td>100%</td></tr>' +
    '</tbody></table>';
}
function v54DevConversionCost(player) {
  const baseSalary = (player && player.salary) ? player.salary : ((typeof V54_DEV_MIN_SALARY !== "undefined") ? V54_DEV_MIN_SALARY : 80000);
  return Math.round(baseSalary * 0.5);
}

// 球季結束的球員合約到期處理。
// interactive=true（玩家球隊）：只負責找出合約到期的球員，不自動決定續約與否，
//   交由玩家在「合約續約談判」畫面逐一談約或選擇不續約（見item3/item7談約系統）。
// interactive=false（AI球隊）：維持原本自動判定邏輯，以節省效能。
function processPlayerContracts(team, interactive) {
  const result = { renewed: 0, departed: [], pending: [] };
  const isUserTeam = team.id === S.userTeamId;
  team.roster1.concat(team.roster2).forEach(id => {
    const p = S.players[id];
    if (!p) return;
    p.contractYears = (p.contractYears || 1) - 1;
    if (p.contractYears > 0) return;
    if (interactive && isUserTeam) {
      result.pending.push(p.id);
      return;
    }
    let declineChance = isUserTeam ? 0.08 : 0;
    if (isUserTeam) {
      if (team.finance.budget < 0) declineChance += 0.3;
      else if (team.finance.budget < 5000000) declineChance += 0.12;
    }
    if (isUserTeam && Math.random() < declineChance) {
      releasePlayerToFreeAgency(p, team);
      result.departed.push(p.id);
    } else {
      p.salary = computePlayerSalary(p);
      p.contractYears = randInt(2, 5);
      result.renewed++;
    }
  });
  return result;
}

// 玩家選擇「不續約」：球員直接離隊、自動進入自由球員市場
function declineContractRenewal(playerId) {
  const team = S.teams[S.userTeamId];
  const p = S.players[playerId];
  if (!p) return;
  releasePlayerToFreeAgency(p, team);
  S.pendingContractRenewals = (S.pendingContractRenewals || []).filter(id => id !== playerId);
  UI.flash = `${p.name} 未獲續約，已進入自由球員市場。`;
  persist();
  render();
}
// 快速鍵：全部依市場行情自動續約（提供給不想逐一談的玩家）
function autoRenewAllPending() {
  const list = (S.pendingContractRenewals || []).slice();
  list.forEach(id => {
    const p = S.players[id];
    if (!p) return;
    p.salary = computePlayerSalary(p);
    p.contractYears = randInt(2, 5);
  });
  S.pendingContractRenewals = [];
  UI.flash = `已依市場行情自動續約 ${list.length} 位球員。`;
  persist();
  render();
}

function releasePlayerToFreeAgency(p, team) {
  team.roster1 = team.roster1.filter(id => id !== p.id);
  team.roster2 = team.roster2.filter(id => id !== p.id);
  p.lastTeam = team.id; // v27：記錄原球團（重情派經紀人「被你放走過」的心結判定）
  p.team = null; p.level = null;
  S.freeAgents = S.freeAgents || {};
  S.freeAgents[p.id] = p;
}

// 簽下自由球員：改走互動談約流程（AI開價、玩家可調整，最多5次來回機會）
function signFreeAgent(playerId) {
  const team = S.teams[S.userTeamId];
  const p = S.freeAgents && S.freeAgents[playerId];
  if (!p) return;
  const r1 = team.roster1.length, r2 = team.roster2.length;
  if (r1 >= 28 && r2 >= 32) {
    UI.flash = "1軍與2軍名單都已額滿，請先釋出名單空間才能簽下自由球員。";
    render();
    return;
  }
  startNegotiation("freeAgent", playerId, { teamId: team.id });
}

/* ---------- 第9階段：國際球員市場 ---------- */
// 每年休賽季重新產生一批國際自由球員（未簽約的視為返回原聯盟效力，不會留到隔年）
function refillInternationalMarket() {
  S.internationalFreeAgents = {};
  const count = randInt(15, 25);
  for (let i = 0; i < count; i++) {
    const p = generateForeignPlayer(false);
    S.internationalFreeAgents[p.id] = p;
  }
  const team = S.teams[S.userTeamId];
  if (!team || !team.scouts) return;
  // ⑦國際球探獨家人脈：依有效精準度額外挖出獨家菁英人選（其他球團接觸不到）
  let slots = exclusiveIntlSlots(team);
  // v25名門友誼：春訓在該國結下名門友誼後，隔年獨家名額+1、且必有一位來自該國的獨家菁英
  const friendship = (S.nationFriendship && S.nationFriendship.untilYear >= S.seasonYear) ? S.nationFriendship : null;
  if (friendship) slots += 1;
  /* v38④：國家友好度回饋——「友好(5)」以上的每個國家各+1獨家名額，
     且該名額必定出自該國；「莫逆之交(10)」則保證是該國菁英（generateForeignPlayer(true) 本就是菁英，
     故此處以「必額」形式呈現，等同每季穩定供輸）。 */
  const bondNations = (typeof bondedNations === "function") ? bondedNations(BOND_TIER_SLOT) : [];
  const forcedList = [];
  if (friendship) forcedList.push(nationByName(friendship.nation));
  bondNations.forEach(n => { slots += 1; forcedList.push(n); });
  for (let i = 0; i < slots; i++) {
    const forced = forcedList[i] || null;
    const p = generateForeignPlayer(true, forced);
    p.exclusive = true;
    S.internationalFreeAgents[p.id] = p;
  }
  attachScoutedEstimates(Object.values(S.internationalFreeAgents), team.scouts.international);
}

/* ====================================================================
   v38④：國家友好度（C/D 國家互動補足）
   ------------------------------------------------------------------
   v37 的 C/D 活動（交流賽／行銷企劃）是「一次性擲骰」，辦完就沒了；
   而 `S.nationFriendship`（名門友誼）只有 B 級以上海外春訓的 eliteFriendship 拿得到、
   單一國家、效期一年——C/D 國家完全沾不到長線經營。
   v38：導入持久累積的「國家友好度」0~10，交流賽／行銷企劃成功即累積，分級解鎖實質好處，
   讓 C/D 從一次性活動變成長線耕耘（Mars：不要春訓，補足與 C/D 國家的互動即可）。
   ==================================================================== */
const NATION_BOND_MAX = 10;
const BOND_TIER_PROSPECT = 3;   // 交流賽發掘當地潛力股機率提升
const BOND_TIER_SLOT = 5;       // 國際市場該國獨家名額+1
const BOND_TIER_DISCOUNT = 7;   // C/D 活動成本 -25%
const BOND_TIER_SWORN = 10;     // 莫逆之交：每季必有一位該國菁英獨家人選
function ensureNationBonds() {
  if (!S.nationBonds) S.nationBonds = {};
  return S.nationBonds;
}
function nationBondLevel(nationName) {
  if (!nationName) return 0;
  const b = ensureNationBonds();
  return clamp(b[nationName] || 0, 0, NATION_BOND_MAX);
}
function addNationBond(nationName, d) {
  if (!nationName || !d) return 0;
  const b = ensureNationBonds();
  b[nationName] = clamp((b[nationName] || 0) + d, 0, NATION_BOND_MAX);
  return b[nationName];
}
function nationBondLabel(lv) {
  if (lv >= BOND_TIER_SWORN) return "莫逆之交";
  if (lv >= BOND_TIER_DISCOUNT) return "深厚友誼";
  if (lv >= BOND_TIER_SLOT) return "友好";
  if (lv >= BOND_TIER_PROSPECT) return "有交情";
  if (lv >= 1) return "初識";
  return "無往來";
}
// 友好度已解鎖的好處說明（UI 用）
function nationBondPerks(lv) {
  const perks = [];
  if (lv >= BOND_TIER_PROSPECT) perks.push("交流賽發掘當地潛力股機率提升（35%→55%）");
  if (lv >= BOND_TIER_SLOT) perks.push("國際市場該國獨家名額＋1");
  if (lv >= BOND_TIER_DISCOUNT) perks.push("該國交流賽／行銷企劃成本 -25%");
  if (lv >= BOND_TIER_SWORN) perks.push("莫逆之交：每季必有一位該國菁英獨家人選");
  return perks;
}
// 友好度達門檻的國家清單（供國際市場產生獨家名額用）
function bondedNations(minLv) {
  const b = ensureNationBonds();
  return Object.keys(b).filter(n => b[n] >= minLv && n !== HOME_NATION_NAME).map(n => nationByName(n)).filter(Boolean);
}

/* v37① C/D 級國家平行活動：海外春訓僅開放B級以上，這裡補上 C/D（與母國）的用途——
   交流賽（偏球員/情報：人氣+士氣+小機率發掘當地潛力股）與海外行銷企劃（偏財務/人氣）。
   兩者各一季一次、開幕前（currentDay===0）可辦、有成本、結果7:3好壞。 */
const CD_EXCHANGE_COST_WAN = { C: 800, D: 500, HOME: 300 };
const CD_MARKETING_COST_WAN = { C: 1000, D: 700, HOME: 500 };
function ensureCdActivities() {
  if (!S.cdActivities || S.cdActivities.year !== S.seasonYear) S.cdActivities = { year: S.seasonYear, exchangeDone: false, marketingDone: false };
  return S.cdActivities;
}
function cdActNations() {
  return NATIONS.filter(n => n.grade === "C" || n.grade === "D" || n.name === HOME_NATION_NAME);
}
function cdCostFor(nation, kind) {
  const g = nation.name === HOME_NATION_NAME ? "HOME" : nation.grade;
  const base = ((kind === "marketing" ? CD_MARKETING_COST_WAN : CD_EXCHANGE_COST_WAN)[g] || 800) * 10000;
  // v38④：友好度達「深厚友誼」→ 該國活動成本 -25%（在地人脈把場地/通路成本壓下來）
  const disc = nationBondLevel(nation.name) >= BOND_TIER_DISCOUNT ? 0.75 : 1;
  return Math.round(base * disc);
}
function runCdExchange(nationName) {
  const st = ensureCdActivities();
  const team = S.teams[S.userTeamId]; if (!team) return; ensureFinance(team);
  if (S.currentDay !== 0) { UI.flash = "國際交流賽只能在球季開幕前（休賽季/春訓期間）舉辦。"; render(); return; }
  if (st.exchangeDone) { UI.flash = "本季已舉辦過國際交流賽。"; render(); return; }
  const nation = nationByName(nationName); if (!nation) { UI.flash = "請先選擇交流國家。"; render(); return; }
  const cost = cdCostFor(nation, "exchange");
  if (team.finance.budget < cost) { UI.flash = `預算不足，國際交流賽（${nation.name}）需 ${formatMoney(cost)}。`; render(); return; }
  team.finance.budget -= cost;
  st.exchangeDone = true;
  let msg;
  const bondLv0 = nationBondLevel(nation.name);
  // v38④：友好度達「有交情」→ 當地人脈把潛力股帶到你面前的機率明顯提高
  const prospectChance = bondLv0 >= BOND_TIER_PROSPECT ? 0.55 : 0.35;
  if (Math.random() < 0.7) {
    team.finance.popularity = clamp(team.finance.popularity + 4, 10, 99);
    team.roster1.concat(team.roster2).forEach(id => { const p = S.players[id]; if (p) p.morale = clamp((p.morale || 70) + 2, 0, 100); });
    let signNote = "";
    if (Math.random() < prospectChance && typeof generateForeignPlayer === "function") {
      const prospect = generateForeignPlayer(true, nation);
      prospect.exclusive = true;
      S.internationalFreeAgents = S.internationalFreeAgents || {};
      S.internationalFreeAgents[prospect.id] = prospect;
      if (typeof attachScoutedEstimates === "function" && team.scouts) attachScoutedEstimates([prospect], team.scouts.international);
      signNote = `　球探在當地發掘了潛力股 ${prospect.name}，已列入你的國際市場獨家名單！`;
    }
    const lv = addNationBond(nation.name, 2); // v38④：成功交流＝友好度+2
    msg = `國際交流賽（${nation.name}）圓滿（-${formatMoney(cost)}）：人氣+4、全隊士氣+2；與${nation.name}友好度+2（${lv}／${NATION_BOND_MAX}・${nationBondLabel(lv)}）。${signNote}`;
  } else {
    team.finance.popularity = clamp(team.finance.popularity + 1, 10, 99);
    const lv = addNationBond(nation.name, 1); // 就算打得普通，交情還是留下了
    msg = `國際交流賽（${nation.name}）遇上水土不服，成效平平（-${formatMoney(cost)}）：人氣僅+1；友好度+1（${lv}／${NATION_BOND_MAX}・${nationBondLabel(lv)}）。`;
  }
  if (typeof pushNews === "function") pushNews("國際", msg);
  UI.flash = msg; persist(); render();
}
function runCdMarketing(nationName) {
  const st = ensureCdActivities();
  const team = S.teams[S.userTeamId]; if (!team) return; ensureFinance(team);
  if (S.currentDay !== 0) { UI.flash = "海外行銷企劃只能在球季開幕前舉辦。"; render(); return; }
  if (st.marketingDone) { UI.flash = "本季已執行過海外行銷企劃。"; render(); return; }
  const nation = nationByName(nationName); if (!nation) { UI.flash = "請先選擇行銷市場。"; render(); return; }
  const cost = cdCostFor(nation, "marketing");
  if (team.finance.budget < cost) { UI.flash = `預算不足，海外行銷企劃（${nation.name}）需 ${formatMoney(cost)}。`; render(); return; }
  team.finance.budget -= cost;
  st.marketingDone = true;
  const success = Math.random() < 0.7;
  const ret = Math.round(cost * (success ? (1.6 + Math.random() * 0.6) : 0.5));
  team.finance.budget += ret;
  const pop = success ? 3 : 1;
  team.finance.popularity = clamp(team.finance.popularity + pop, 10, 99);
  const lv = addNationBond(nation.name, success ? 1 : 0); // v38④：成功的行銷企劃＝在當地留下品牌，友好度+1
  const bondNote = success ? `；與${nation.name}友好度+1（${lv}／${NATION_BOND_MAX}・${nationBondLabel(lv)}）` : "";
  const msg = success
    ? `海外行銷企劃（${nation.name}）成功：投入${formatMoney(cost)}、回收${formatMoney(ret)}（淨${formatMoney(ret - cost)}），人氣+${pop}${bondNote}。`
    : `海外行銷企劃（${nation.name}）反應冷淡：投入${formatMoney(cost)}、僅回收${formatMoney(ret)}（淨${formatMoney(ret - cost)}），人氣+${pop}。`;
  if (typeof pushNews === "function") pushNews("國際", msg);
  UI.flash = msg; persist(); render();
}

// v27：AI球團依經營個性簽下國際球員（豪購型最積極），每個休賽季全聯盟最多3人、不碰玩家的獨家人選
function aiSignInternationalPlayers() {
  let signed = 0;
  const aiTeams = shuffle(Object.values(S.teams).filter(t => t.id !== S.userTeamId));
  for (const t of aiTeams) {
    if (signed >= 3) break;
    const ps = TEAM_PERSONAS[t.persona] || null;
    if (Math.random() >= ((ps && ps.intlChance) || 0.2)) continue;
    ensureFinance(t);
    if (foreignCountOnRoster1(t) >= FOREIGN_ROSTER_CAP) continue;
    const cand = Object.values(S.internationalFreeAgents || {}).filter(p => !p.exclusive && !(typeof referralFor === "function" && referralFor(p.id))); // v33：引薦獨家對象AI不得碰
    if (cand.length === 0) break;
    cand.sort((a, b) => trueOverall(b) - trueOverall(a));
    const p = cand[0];
    const salary = Math.round(computePlayerSalary(p) * 1.1 / 1000) * 1000;
    if (t.finance.budget < salary * 1.5) continue; // v28：預算門檻由×2放寬至×1.5，讓AI國際簽援更活躍
    // 1軍滿編時：釋出最弱的本土1軍球員騰出位置（進自由市場，玩家也能撿）；洋將要明顯更強才值得換血
    let cutP = null;
    if (t.roster1.length >= 28) {
      const weakest = t.roster1.map(id => S.players[id]).filter(x => x && !x.foreign)
        .sort((a, b) => trueOverall(a) - trueOverall(b))[0];
      if (!weakest || trueOverall(p) < trueOverall(weakest) + 5) continue;
      cutP = weakest;
      releasePlayerToFreeAgency(cutP, t);
    }
    ensureAgent(p);
    p.team = t.id; p.level = "1軍"; p.salary = salary; p.contractYears = randInt(3, 4);
    S.players[p.id] = p;
    t.roster1.push(p.id);
    delete S.internationalFreeAgents[p.id];
    refreshPayroll(t, S.players);
    if (typeof pushNews === "function") pushNews("國際賽", `${t.name}${ps ? `（${ps.name}球團）` : ""}出手簽下${p.nationality}好手 ${p.name}，強化陣容${cutP ? `；${cutP.name} 遭釋出進入自由市場` : ""}！`);
    signed++;
  }
  return signed;
}

function signInternationalPlayer(playerId) {
  const team = S.teams[S.userTeamId];
  const p = S.internationalFreeAgents && S.internationalFreeAgents[playerId];
  if (!p) return;
  const r1 = team.roster1.length, r2 = team.roster2.length;
  if (r1 >= 28 && r2 >= 32) {
    UI.flash = "1軍與2軍名單都已額滿，請先釋出名單空間才能簽下國際球員。";
    render();
    return;
  }
  if (r1 < 28 && foreignCountOnRoster1(team) >= FOREIGN_ROSTER_CAP && r2 >= 32) {
    UI.flash = `1軍外籍球員名額已滿（上限${FOREIGN_ROSTER_CAP}人），且2軍名單也已額滿，請先調整名單。`;
    render();
    return;
  }
  startNegotiation("international", playerId, { teamId: team.id });
}

function teamAttendanceRate(team) {
  ensureFinance(team);
  const gp = team.wins + team.losses;
  const winPct = gp > 0 ? team.wins / gp : 0.5;
  const mktAtt = (team.finance.marketingYear === S.seasonYear) ? (team.finance.marketingAttPct || 0) : 0; // v29行銷活動直接拉抬進場率
  const comfortAtt = stadiumEffects(team).attPct; // v30舒適設施（廁所/停車場/親子等）直接拉抬進場率
  var cityAtt = (typeof v55CityAttendanceMult === "function") ? v55CityAttendanceMult(team.id) : 1;
  const base = (0.32 + (team.finance.popularity / 100) * 0.38 + (winPct - 0.5) * 0.55 + mktAtt + comfortAtt) * cityAtt;
  return clamp(base * ticketDemandRate(team.finance.ticketPrice, team.finance.ticketPriceCap, team.finance.popularity), 0.06, 0.98);
}

// 球季結束後結算單一球隊財務（收入減支出，含奢侈稅），回傳報表物件
function settleSeasonFinance(team, taxThreshold) {
  ensureFinance(team);
  ensureFacility(team);
  ensureStadiumSlots(team);
  ensureHomeAwayLedger(team);
  const totalGames = S.schedule ? S.schedule.length : 126;
  // v30：改用「實際主場帳」——逐場累計的主場場次/進場人次/門票收入；無累計資料（舊檔）才退回對半估算。
  // 舊檔在季中升級v30時帳只記到載入後的場次，依實際賽程主場數等比例外插補全。
  const ledger = team.finance.gateLedger;
  const schedHome = S.schedule ? S.schedule.reduce((a, day) => a + (day.some(g => g.home === team.id) ? 1 : 0), 0) : Math.round(totalGames / 2);
  const scale = (ledger.homeGames > 0 && ledger.homeGames < schedHome) ? schedHome / ledger.homeGames : 1;
  const homeGames = ledger.homeGames > 0 ? schedHome : Math.round(totalGames / 2);
  const attRate = teamAttendanceRate(team);
  const homeVisitors = ledger.homeGames > 0 ? Math.round(ledger.visitors * scale) : Math.round(facilityCapacity(team) * attRate) * homeGames;
  const avgAttendance = Math.round(homeVisitors / Math.max(1, homeGames));
  const ticketRevenue = ledger.homeGames > 0 ? Math.round(ledger.gateRevenue * scale) : avgAttendance * team.finance.ticketPrice * homeGames;
  const gateShareIncome = Math.round((ledger.shareIn || 0) * scale);   // v30客場贏球分潤（收入）
  const gateSharePaid = Math.round((ledger.sharePaid || 0) * scale);   // v30主場支付給客隊的分潤（支出）

  const gp = team.wins + team.losses;
  const winPct = gp > 0 ? team.wins / gp : 0.5;
  const madePlayoffs = !!(S.playoffs && S.playoffs.champion && teamReachedPlayoffs(team.id));
  ensureAnnualDeals(team);
  ensureMarketingPlan(team);
  // v29：轉播/贊助改依「方案物件」結算（保證金＋勝率分潤＋季後賽加碼）；未簽約者套用預設公式（贊助含既有戰績浮動）
  const bDeal = dealSeasonRevenue(team.finance.broadcastDeal, winPct, madePlayoffs);
  const broadcastRevenue = bDeal != null ? bDeal : Math.round((3000 + team.finance.popularity * 42) * 10000);
  // v25國際賽事紅利：母國代表隊前一年打出好成績，全聯盟隔年贊助/周邊收入乘上加成
  const intlMult = (S.intlBoost && S.intlBoost.year === S.seasonYear) ? S.intlBoost : { sponsorMult: 1, merchMult: 1 };
  const sDeal = dealSeasonRevenue(team.finance.sponsorDeal, winPct, madePlayoffs);
  // v45：球迷認同是贊助的出口之一（僅玩家隊；高認同＝品牌價值→贊助商埋單）
  const fanSpMult = (team.id === S.userTeamId && typeof fanIdentifySponsorMult === "function") ? fanIdentifySponsorMult() : 1;
  var citySpMult = (typeof v55CitySponsorMult === "function") ? v55CitySponsorMult(team.id) : 1;
  const sponsorRevenue = Math.max(0, Math.round((sDeal != null ? sDeal : ((1500 + team.finance.popularity * 26) * 10000 + (winPct - 0.5) * 4200 * 10000 + (madePlayoffs ? 12000000 : 0))) * intlMult.sponsorMult * fanSpMult * citySpMult));
  // v30周邊重構：主場總進場人次 × 人均消費（基礎＋人氣微加成，乘設施/行銷/國際賽加成）
  const merchRevenue = Math.round(homeVisitors * stadiumPerCapitaSpend(team, intlMult.merchMult));
  // v31聯盟均衡稅：補貼計入收入、繳稅計入支出（由 runLeagueBalanceTax 預先算好存在 finance 上）
  const balanceTaxReceived = team.finance.balanceTaxReceived || 0;
  const balanceTaxPaid = team.finance.balanceTaxPaid || 0;
  const totalRevenue = ticketRevenue + broadcastRevenue + sponsorRevenue + merchRevenue + gateShareIncome + balanceTaxReceived;

  const payroll = refreshPayroll(team, S.players);
  const maintenanceCost = stadiumMaintenance(team); // v30設施年度維護費
  const luxuryTax = payroll > taxThreshold ? Math.round((payroll - taxThreshold) * 0.5) : 0;
  const totalExpense = payroll + luxuryTax + maintenanceCost + gateSharePaid + balanceTaxPaid;
  const net = totalRevenue - totalExpense;
  team.finance.budget += net;
  team.finance.balanceTaxReceived = 0; team.finance.balanceTaxPaid = 0; // 折入後歸零，避免重複計入

  const priceRatio = (team.finance.ticketPrice - TICKET_PRICE_FLOOR) / Math.max(1, team.finance.ticketPriceCap - TICKET_PRICE_FLOOR);
  const fanPopBond = (team.id === S.userTeamId && typeof fanIdentifyPopBond === "function") ? fanIdentifyPopBond() : 0; // v45：認同→票房/人氣的綁定出口
  const popDelta = (winPct - 0.5) * 9 + (priceRatio < 0.25 ? 1 : (priceRatio > 0.75 ? -1.5 : 0)) + (madePlayoffs ? 2 : 0) + (team.finance.marketingPopBoost || 0) + stadiumEffects(team).popBoost + fanPopBond + (team.id === S.userTeamId && typeof v48HofPopBoost === "function" ? v48HofPopBoost() : 0); // v30博物館人氣加成／v45認同綁定／v48殿堂人氣
  team.finance.popularity = clamp(Math.round(team.finance.popularity + popDelta + (Math.random() * 4 - 2)), 10, 99);

  // 逐年票價上限成長機制（v34放寬）：只要季均上座率≥90%（代表市場供不應求），
  // 隔年就可以調高票價上限，最終不超過5000元；不再要求票價必須先開到上限附近，讓「低價養客→調高上限→逐步漲價」的循環真正跑得動。
  const soldOutAtTop = attRate >= 0.90;
  let capRaised = false;
  if (soldOutAtTop && team.finance.ticketPriceCap < TICKET_PRICE_CEIL_MAX) {
    team.finance.ticketPriceCap = Math.min(TICKET_PRICE_CEIL_MAX, team.finance.ticketPriceCap + TICKET_PRICE_CEIL_STEP);
    capRaised = true;
  }

  const report = {
    year: S.seasonYear, ticketPrice: team.finance.ticketPrice, avgAttendance, ticketRevenue, broadcastRevenue,
    sponsorRevenue, merchRevenue, totalRevenue, payroll, signingBonusSpent: team.finance.signingBonusSpent || 0,
    luxuryTax, taxThreshold: Math.round(taxThreshold), totalExpense, net, budgetAfter: team.finance.budget,
    popularityAfter: team.finance.popularity, ticketPriceCapAfter: team.finance.ticketPriceCap, capRaised,
    // v30：實際主場場次/人次、分潤收支、設施維護費、主客戰績
    homeGames, homeVisitors, gateShareIncome, gateSharePaid, maintenanceCost,
    homeRecord: { w: team.homeWins || 0, l: team.homeLosses || 0 }, awayRecord: { w: team.awayWins || 0, l: team.awayLosses || 0 },
    // v31：聯盟均衡稅收支、球場完備度
    balanceTaxReceived, balanceTaxPaid, stadiumCompleteness: Math.round(stadiumCompleteness(team) * 1000) / 10
  };
  team.finance.lastSeasonReport = report;
  team.finance.signingBonusSpent = 0;
  return report;
}

function teamReachedPlayoffs(teamId) {
  if (!S.playoffs || !S.playoffs.qualifiedTeamIds) return false;
  return S.playoffs.qualifiedTeamIds.includes(teamId);
}

// 全聯盟球季結束財務結算：奢侈稅門檻＝全聯盟平均薪資的1.3倍
function settleLeagueFinance() {
  ensureAllFinance();
  if (typeof runLeagueBalanceTax === "function") runLeagueBalanceTax(); // v31：聯盟均衡稅（先課稅／補貼，再逐隊結算折入報表）
  Object.values(S.teams).forEach(t => refreshPayroll(t, S.players));
  const payrolls = Object.values(S.teams).map(t => t.finance.payroll);
  const avgPayroll = payrolls.reduce((a, b) => a + b, 0) / payrolls.length;
  const taxThreshold = avgPayroll * 1.3;
  const reports = {};
  Object.values(S.teams).forEach(t => {
    // v33爭冠委任：老闆為衝冠開特例——委任期間玩家隊的奢侈稅門檻放寬15%
    const th = (t.id === S.userTeamId && typeof mandateActive === "function" && mandateActive() === "contend") ? taxThreshold * 1.15 : taxThreshold;
    reports[t.id] = settleSeasonFinance(t, th);
  });
  return reports;
}

// ③簽約金分級重構：以「天花板等級」為主要分級依據，輪次僅作小幅修正（越後面輪次略低）
function draftSigningBonus(round, player) {
  const gradeBase = { S: 600, A: 400, B: 250, C: 150, D: 80 }[player.scoutedCeiling] || 80; // 單位：萬元（v25調降：S 600萬→D 80萬）
  const roundMult = clamp(1.0 - (round - 1) * 0.03, 0.85, 1.0);
  return Math.round(gradeBase * roundMult * (0.8 + Math.random() * 0.4)) * 10000;
}

// ③新秀合約分級重構：年薪上限「主要依天花板等級」（S 800萬 > A 700萬 > B 500萬 > C 350萬 > D 200萬，
// 比例即設計指定的 8:7:5 遞減，並對齊遊戲既有薪資經濟量級），輪次退居次要修正因子（第1輪x1.0 → 第6輪x0.85）。
// 這樣「後段輪次撿到的S級新秀」薪資上限仍以S級計算，不再出現高潛力新秀薪資不合理偏低的狀況。
// v25調降（Mars裁定）：新秀年薪上限 S 80萬／A 70萬／B 50萬／C 35萬／D 20萬（元）
const ROOKIE_GRADE_SALARY_CAP = { S: 800000, A: 700000, B: 500000, C: 350000, D: 200000 }; // 各等級年薪上限(元)
function rookieSalaryCap(round, player) {
  const gradeCap = ROOKIE_GRADE_SALARY_CAP[player.scoutedCeiling] || ROOKIE_GRADE_SALARY_CAP.D;
  const roundMult = clamp(1.0 - (round - 1) * 0.03, 0.85, 1.0);
  return Math.round(gradeCap * roundMult / 1000) * 1000; // v25：薪資量級調降後改以千元取整
}
function attemptRookieContract(round, player) {
  const cap = rookieSalaryCap(round, player);
  const gradeFailChance = { S: 0.3, A: 0.2, B: 0.1, C: 0.05, D: 0.02 }[player.scoutedCeiling] || 0.05;
  const failChance = clamp(gradeFailChance, 0.02, 0.35);
  if (Math.random() < failChance) return { success: false };
  const bonus = draftSigningBonus(round, player);
  return { success: true, salary: cap, years: randInt(5, 7), bonus };
}

function applyTicketPrice(team, price) {
  const clamped = clamp(Math.round(price), TICKET_PRICE_FLOOR, team.finance.ticketPriceCap);
  team.finance.ticketPrice = clamped;
  return clamped;
}
function setTicketPreset(presetKey) {
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  if (S.currentDay > 0) {
    UI.flash = "票價只能在球季開打前（開幕日）調整，本季已開打，請等下個休賽季再調整。";
    render();
    return;
  }
  const preset = TICKET_PRICE_PRESETS.find(t => t.key === presetKey);
  if (!preset) return;
  const applied = applyTicketPrice(team, preset.price);
  const pct = estimateAttendancePct(team, applied);
  UI.flash = `票價已調整為「${preset.label}」（每張${applied}元，預估約${pct}%觀眾進場）。`;
  persist();
  render();
}
function setCustomTicketPrice(amount) {
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  if (S.currentDay > 0) {
    UI.flash = "票價只能在球季開打前（開幕日）調整，本季已開打，請等下個休賽季再調整。";
    render();
    return;
  }
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    UI.flash = "請輸入有效的票價金額。";
    render();
    return;
  }
  const applied = applyTicketPrice(team, n);
  const pct = estimateAttendancePct(team, applied);
  const capNote = n > team.finance.ticketPriceCap ? `（已超過目前票價上限${team.finance.ticketPriceCap}元，自動調整為上限）` : "";
  UI.flash = `票價已調整為 ${applied} 元${capNote}，AI預估約${pct}%觀眾會進場。`;
  persist();
  render();
}

// 財務健康度：budget為負或payroll超出奢侈稅門檻時回傳警示文字陣列（非阻擋性，僅提示與影響續約意願）
function financeWarnings(team) {
  ensureFinance(team);
  const warnings = [];
  if (team.finance.budget < 0) warnings.push(`球隊預算已出現赤字（${formatMoney(team.finance.budget)}），會提高教練與球探續約時婉拒的機率。`);
  else if (team.finance.budget < 5000000) warnings.push(`球隊預算偏低（${formatMoney(team.finance.budget)}），建議留意薪資支出或調整票價策略。`);
  const leaguePayrolls = Object.values(S.teams).map(t => { ensureFinance(t); return t.finance.payroll || 0; });
  const avgPayroll = leaguePayrolls.reduce((a, b) => a + b, 0) / leaguePayrolls.length;
  if (team.finance.payroll > avgPayroll * 1.3) warnings.push(`本隊薪資總額已超過奢侈稅門檻（聯盟平均的1.3倍），球季結束結算時將被課徵奢侈稅。`);
  return warnings;
}

// v29轉播與贊助合約重製：三方案有「真實的機制差異」，不再只是金額高低。
// 每個方案＝保證金（base，穩拿）＋戰績分潤（winBonusPer10：勝率每高於5成1個百分點的分潤）＋季後賽加碼（playoffBonus）。
// 保守＝保證金最高、零浮動（怕輸就選這個）；標準＝行情保證金＋小幅浮動；積極＝保證金打折、浮動與季後賽加碼最大（強隊選這個賺最多、爛隊選這個會賠）。
function generateDealOffers(team, kind) {
  const mkt = kind === "broadcast" ? (3000 + team.finance.popularity * 42) : (1500 + team.finance.popularity * 26);
  const marketBase = Math.round(mkt / 10) * 10 * 10000;
  const w = v => Math.round(v / 10000 / 10) * 10 * 10000; // 取整到10萬
  if (kind === "broadcast") {
    return [
      { id: 0, key: "safe", label: "保守方案", base: w(marketBase * 1.05), winBonusPer10: 0, playoffBonus: 0, desc: "電視台買斷全季轉播權：保證金一次談滿，戰績好壞都拿一樣，穩定至上。" },
      { id: 1, key: "standard", label: "標準方案", base: w(marketBase * 0.92), winBonusPer10: w(marketBase * 0.05), playoffBonus: w(marketBase * 0.12), desc: "行情價保證金＋收視分潤：勝率每高於五成1成，多拿一筆分潤；打進季後賽另有轉播加碼。" },
      { id: 2, key: "aggressive", label: "積極方案", base: w(marketBase * 0.72), winBonusPer10: w(marketBase * 0.13), playoffBonus: w(marketBase * 0.30), desc: "低保證金、高分潤對賭約：球隊夠強、話題夠多就大賺，戰績崩盤保證金也少一大截。" }
    ];
  }
  return [
    { id: 0, key: "safe", label: "保守方案", base: w(marketBase * 1.02), winBonusPer10: 0, playoffBonus: 0, desc: "企業年約定額贊助：不看戰績、不設對賭條款，金額全額保證。" },
    { id: 1, key: "standard", label: "標準方案", base: w(marketBase * 0.90), winBonusPer10: w(marketBase * 0.09), playoffBonus: w(marketBase * 0.20), desc: "基本贊助＋戰績獎金：勝率越高獎金越多（輸多也會倒扣），季後賽曝光另有加碼。" },
    { id: 2, key: "aggressive", label: "積極方案", base: w(marketBase * 0.68), winBonusPer10: w(marketBase * 0.20), playoffBonus: w(marketBase * 0.50), desc: "重賞型對賭約：贊助商押你奪冠——勝率分潤與季後賽加碼都是最高檔，但基本盤最薄。" }
  ];
}
// v29：依方案與最終戰績結算實拿金額（保證金＋勝率分潤＋季後賽加碼，下限0）。
// 也相容舊存檔的「純數字合約」（視為定額）。
function dealSeasonRevenue(deal, winPct, madePlayoffs) {
  if (deal == null) return null;
  if (typeof deal === "number") return deal; // 舊版存檔：定額合約
  const winPts = (winPct - 0.5) * 100; // 勝率高於5成的百分點數（可為負）
  const floating = Math.round(winPts / 10 * deal.winBonusPer10);
  return Math.max(0, deal.base + floating + (madePlayoffs ? deal.playoffBonus : 0));
}
// v29：三情境試算（勝率45%/55%/65%＋是否季後賽），給玩家看懂每個方案的實際差異
function dealScenarioTable(offer) {
  const rows = [
    { label: "勝率45%・無季後賽", v: dealSeasonRevenue(offer, 0.45, false) },
    { label: "勝率55%・無季後賽", v: dealSeasonRevenue(offer, 0.55, false) },
    { label: "勝率65%＋季後賽", v: dealSeasonRevenue(offer, 0.65, true) }
  ];
  return rows.map(r => `<div class="sb-row small"><div class="sb-label">${r.label}</div><div class="sb-value small">${formatMoney(r.v)}</div></div>`).join("");
}
function ensureAnnualDeals(team) {
  ensureFinance(team);
  if (team.finance.dealsYear !== S.seasonYear) {
    team.finance.broadcastOffers = generateDealOffers(team, "broadcast");
    team.finance.sponsorOffers = generateDealOffers(team, "sponsor");
    team.finance.broadcastDeal = null;
    team.finance.sponsorDeal = null;
    team.finance.dealsYear = S.seasonYear;
  }
}
function chooseDeal(kind, offerId) {
  const team = S.teams[S.userTeamId];
  ensureAnnualDeals(team);
  if (S.currentDay > 0) {
    UI.flash = "轉播／贊助合約只能在春訓期間（球季開打前）洽談，請等下個休賽季開幕前再談。";
    render();
    return;
  }
  const offers = kind === "broadcast" ? team.finance.broadcastOffers : team.finance.sponsorOffers;
  const offer = offers.find(o => o.id === offerId);
  if (!offer) return;
  // v29：合約改存完整方案物件（保證金＋浮動條款），季末依實際戰績結算
  if (kind === "broadcast") team.finance.broadcastDeal = offer;
  else team.finance.sponsorDeal = offer;
  UI.flash = `已簽下${kind === "broadcast" ? "轉播" : "贊助"}${offer.label}：保證金 ${formatMoney(offer.base)}${offer.winBonusPer10 ? `＋戰績分潤` : ""}${offer.playoffBonus ? `＋季後賽加碼 ${formatMoney(offer.playoffBonus)}` : ""}。`;
  persist();
  render();
}

// 賽季期間的損益預測（依目前人氣/戰績/已簽定的轉播贊助合約估算，非最終結算數字）
function projectSeasonFinance(team) {
  ensureFinance(team);
  ensureAnnualDeals(team);
  ensureFacility(team);
  const totalGames = S.schedule ? S.schedule.length : 126;
  const homeGames = Math.round(totalGames / 2);
  const attRate = teamAttendanceRate(team);
  const projectedAttendance = Math.round(facilityCapacity(team) * attRate);
  const ticketRevenue = projectedAttendance * team.finance.ticketPrice * homeGames;
  const gp = team.wins + team.losses;
  const winPct = gp > 0 ? team.wins / gp : 0.5;
  // v29：以「目前勝率照這樣打完、未進季後賽」估算合約實拿（浮動條款會即時反映在預估上）
  const bEst = dealSeasonRevenue(team.finance.broadcastDeal, winPct, false);
  const broadcastRevenue = bEst != null ? bEst : Math.round((3000 + team.finance.popularity * 42) * 10000);
  const sEst = dealSeasonRevenue(team.finance.sponsorDeal, winPct, false);
  const sponsorRevenue = Math.max(0, sEst != null ? sEst : Math.round((1500 + team.finance.popularity * 26) * 10000 + (winPct - 0.5) * 4200 * 10000));
  // v30：周邊＝主場人次×人均消費；分潤以自家門票行情概估（客場贏抽8%輸抽2%、主場反向支付）
  const merchRevenue = Math.round(projectedAttendance * homeGames * stadiumPerCapitaSpend(team, 1));
  const perGameGate = projectedAttendance * team.finance.ticketPrice;
  const awayGames = totalGames - homeGames;
  const gateShareIncome = Math.round(awayGames * perGameGate * (winPct * GATE_SHARE_WIN + (1 - winPct) * GATE_SHARE_LOSE));
  const gateSharePaid = Math.round(homeGames * perGameGate * ((1 - winPct) * GATE_SHARE_WIN + winPct * GATE_SHARE_LOSE));
  const maintenanceCost = stadiumMaintenance(team);
  const totalRevenue = ticketRevenue + broadcastRevenue + sponsorRevenue + merchRevenue + gateShareIncome;
  const payroll = refreshPayroll(team, S.players);
  const leaguePayrolls = Object.values(S.teams).map(t => { ensureFinance(t); return t.finance.payroll || 0; });
  const avgPayroll = leaguePayrolls.reduce((a, b) => a + b, 0) / leaguePayrolls.length;
  const taxThreshold = avgPayroll * 1.3;
  const luxuryTax = payroll > taxThreshold ? Math.round((payroll - taxThreshold) * 0.5) : 0;
  const projectedNet = totalRevenue - payroll - luxuryTax - maintenanceCost - gateSharePaid;
  return { projectedAttendance, ticketRevenue, broadcastRevenue, sponsorRevenue, merchRevenue, gateShareIncome, gateSharePaid, maintenanceCost, totalRevenue, payroll, luxuryTax, taxThreshold, projectedNet };
}

/* ====================================================================
   第7階段：行銷企劃系統
   涵蓋：年度行銷方案投資（提升人氣成長速度與周邊/販賣部收入），
   於春訓期間規劃，效果套用在該球季結束的財務結算。
   ==================================================================== */
// v29行銷企劃重製：由「三選一大方案」改為「七項活動自由複選」，每項效果與費用明確標示，
// 春訓期間可隨時勾選/取消（取消即退費），效果加總後套用整季。
// 效果三軸：popBoost＝季末人氣成長加成、merchPct＝周邊/販賣部收入%、attPct＝主場進場率%。
const MARKETING_CAMPAIGNS = [
  { key: "social", label: "社群經營", icon: "mk-social", cost: 3000000, popBoost: 2, merchPct: 0.03, attPct: 0, desc: "全年經營官方社群與短影音，穩定累積球迷基本盤。" },
  { key: "ads", label: "電視／網路廣告", icon: "screen", cost: 8000000, popBoost: 4, merchPct: 0, attPct: 0.01, desc: "大量投放形象廣告，直接拉抬球隊知名度。" },
  { key: "endorse", label: "明星球員代言", icon: "star-glow", cost: 15000000, popBoost: 6, merchPct: 0.08, attPct: 0, desc: "推派看板球星接代言與綜藝通告；隊上有「人氣王」特質球員時人氣加成再+2。" },
  { key: "merchdev", label: "周邊商品開發", icon: "cap", cost: 6000000, popBoost: 0, merchPct: 0.15, attPct: 0, desc: "開發新款球衣、公仔與應援商品，直接提升周邊銷售。" },
  { key: "collab", label: "跨界聯名企劃", icon: "handshake", cost: 12000000, popBoost: 2, merchPct: 0.25, attPct: 0, desc: "與知名品牌聯名限定商品，周邊收入大幅提升、也帶進新客群。" },
  { key: "themeday", label: "主題日活動", icon: "mk-themeday", cost: 5000000, popBoost: 1, merchPct: 0.03, attPct: 0.03, desc: "煙火夜、動漫日、啦啦隊應援日等主場企劃，直接提高進場意願。" },
  { key: "familyday", label: "家庭日／球迷回饋季", icon: "family", cost: 9000000, popBoost: 2, merchPct: 0.04, attPct: 0.05, desc: "親子套票與球迷回饋活動，培養闔家觀賽習慣，進場率提升最多。" }
];
// 舊版三方案 → 新版活動組合的對應（v29升級鏈用）
const LEGACY_MARKETING_MAP = { none: [], basic: ["social"], standard: ["social", "ads", "merchdev"], premium: ["social", "ads", "endorse", "collab", "themeday"] };
function ensureMarketingPlan(team) {
  ensureFinance(team);
  if (!Array.isArray(team.finance.marketingCampaigns)) team.finance.marketingCampaigns = [];
  if (team.finance.marketingYear !== S.seasonYear) {
    team.finance.marketingCampaigns = [];
    team.finance.marketingPopBoost = 0;
    team.finance.marketingMerchPct = 0;
    team.finance.marketingAttPct = 0;
    team.finance.marketingYear = S.seasonYear;
  }
}
// 依已勾選活動重算三軸加成（明星代言＋隊上有人氣王特質 → 人氣額外+2）
function recomputeMarketingEffects(team) {
  const keys = team.finance.marketingCampaigns || [];
  let pop = 0, merch = 0, att = 0;
  keys.forEach(k => {
    const c = MARKETING_CAMPAIGNS.find(x => x.key === k);
    if (!c) return;
    pop += c.popBoost; merch += c.merchPct; att += c.attPct;
    if (k === "endorse") {
      const hasStar = team.roster1.concat(team.roster2).some(id => { const p = S.players[id]; return p && hasTrait(p, "idol"); });
      if (hasStar) pop += 2;
    }
  });
  team.finance.marketingPopBoost = pop;
  team.finance.marketingMerchPct = Math.round(merch * 100) / 100;
  team.finance.marketingAttPct = Math.round(att * 100) / 100;
}
function toggleMarketingCampaign(key) {
  const team = S.teams[S.userTeamId];
  ensureMarketingPlan(team);
  if (S.currentDay > 0) {
    UI.flash = "行銷企劃只能在春訓期間規劃，請等下個休賽季開幕前再調整。";
    render();
    return;
  }
  const c = MARKETING_CAMPAIGNS.find(x => x.key === key);
  if (!c) return;
  const idx = team.finance.marketingCampaigns.indexOf(key);
  if (idx >= 0) {
    team.finance.marketingCampaigns.splice(idx, 1);
    team.finance.budget += c.cost; // 春訓期間反悔取消 → 全額退費
    UI.flash = `已取消「${c.label}」，退回 ${formatMoney(c.cost)}。`;
  } else {
    if (team.finance.budget < c.cost) {
      UI.flash = `預算不足，無法投入「${c.label}」（需要 ${formatMoney(c.cost)}）。`;
      render();
      return;
    }
    team.finance.budget -= c.cost;
    team.finance.marketingCampaigns.push(key);
    UI.flash = `已投入「${c.label}」（花費 ${formatMoney(c.cost)}）。`;
  }
  recomputeMarketingEffects(team);
  persist();
  render();
}

/* ====================================================================
   談約系統：所有談約（在役球員續約／自由球員簽約／新秀簽約）統一走這套互動流程。
   AI先依球員等級/身價提供起始報價，玩家可調整薪資與年限後送出，最多5次來回機會。
   續約談不成 → 自動離隊進自由球員市場；自由球員談不成 → 轉投別隊、離開市場；
   新秀談不成（5次都談不成）→ 直接放棄加盟、退出本屆選秀（不會回選秀池、不會被其他球隊選走）。
   ==================================================================== */
function desiredYearsForPlayer(p) {
  if (p.age <= 24) return randInt(4, 5);
  if (p.age <= 29) return randInt(3, 4);
  if (p.age <= 33) return randInt(2, 3);
  return randInt(1, 2);
}
function playerOverallForSalary(p) {
  return p.isPitcher ? (p.velocity * 0.4 + p.control * 0.35 + p.stamina * 0.25) : (p.contact * 0.35 + p.power * 0.3 + p.eye * 0.15 + p.fielding * 0.2);
}
function desiredSalaryMultiplier(p) {
  const overall = playerOverallForSalary(p);
  if (overall >= 70) return 1.15 + Math.random() * 0.12;
  if (overall >= 55) return 1.05 + Math.random() * 0.1;
  return 0.98 + Math.random() * 0.1;
}
// v29選秀談約收緊（Mars定案）：新秀薪資「上限鎖死」在等級定額（ROOKIE_GRADE_SALARY_CAP），
// 新秀沒有超額談判權——期望值＝上限打折（等級越高越不肯讓），玩家只能從上限往下砍價。
function rookieDesired(round, player) {
  const cap = rookieSalaryCap(round, player);
  const gradeMult = { S: 1.0, A: 0.98, B: 0.95, C: 0.9, D: 0.85 }[player.scoutedCeiling] || 0.9;
  return { salary: Math.round(cap * gradeMult / 1000) * 1000, years: randInt(5, 7) };
}

function startNegotiation(kind, playerId, opts) {
  opts = opts || {};
  if (kind === "staffRenewal") { startStaffRenewal(opts.item); return; } // v31：教練/球探續約談判通道
  let p;
  if (kind === "rookie") p = opts.playerObj;
  else if (kind === "freeAgent") p = (S.freeAgents || {})[playerId];
  else if (kind === "international") p = (S.internationalFreeAgents || {})[playerId];
  else p = S.players[playerId];
  if (!p) return;
  let marketSalary, desiredSalary, desiredYears;
  // v25談約人性化：期望薪資／年限「固定存在球員身上」（同一休賽季不重擲），
  // 取消再重開談判不會洗骰；特質「大物志向」+15%／「重情義」-8%。
  if (p.negoDesired && p.negoDesired.year === S.seasonYear) {
    marketSalary = p.negoDesired.market;
    desiredSalary = p.negoDesired.salary;
    desiredYears = p.negoDesired.years;
  } else {
    if (kind === "rookie") {
      const d = rookieDesired(opts.round, p);
      marketSalary = d.salary; desiredSalary = d.salary; desiredYears = d.years;
    } else {
      marketSalary = computePlayerSalary(p);
      let mult = desiredSalaryMultiplier(p);
      if (kind === "international") mult *= 1.1; // 國際球員身價普遍再高一些（跨海挖角成本）
      desiredSalary = Math.round(marketSalary * mult / 1000) * 1000;
      desiredYears = desiredYearsForPlayer(p);
    }
    if (hasTrait(p, "ambitious")) desiredSalary = Math.round(desiredSalary * 1.15 / 1000) * 1000;
    if (hasTrait(p, "humble")) desiredSalary = Math.round(desiredSalary * 0.92 / 1000) * 1000;
    // v36：忠誠折扣——奪冠養出的高忠誠球員願意讓利留隊（忠誠55→100 對應 0→8% 折扣，僅續約適用）
    if (kind === "renewal" && p.loyalty != null && p.loyalty > 55) {
      const loyDisc = Math.min((p.loyalty - 55) / 45 * 0.08, 0.08);
      desiredSalary = Math.round(desiredSalary * (1 - loyDisc) / 1000) * 1000;
    }
    // v27經紀人個性：調整期望薪資與年限偏好（新秀也適用；結果一樣固定存在negoDesired，不洗骰）
    ensureAgent(p);
    const ag = AGENT_TYPES[p.agent.type];
    desiredSalary = Math.round(desiredSalary * (ag.expMult || 1) / 1000) * 1000;
    if (ag.yearsShift) desiredYears = clamp(desiredYears + ag.yearsShift, 1, 7);
    if (kind !== "rookie") {
      if (p.agent.type === "loyal") {
        if (kind === "renewal") desiredSalary = Math.round(desiredSalary * 0.92 / 1000) * 1000; // 重情：留隊談約自動降價
        if (kind === "freeAgent" && p.lastTeam === S.userTeamId) desiredSalary = Math.round(desiredSalary * 1.15 / 1000) * 1000; // 被你放走過，有心結
      }
      if (p.agent.type === "fame") {
        const famT = S.teams[opts.teamId || S.userTeamId];
        ensureFinance(famT);
        const gp = famT.wins + famT.losses, wp = gp > 0 ? famT.wins / gp : 0.5;
        const famMult = clamp(1.18 - (famT.finance.popularity - 50) * 0.004 - (wp - 0.5) * 0.3, 0.9, 1.3);
        desiredSalary = Math.round(desiredSalary * famMult / 1000) * 1000; // 愛名氣：強豪名門可砍價、弱隊要加錢
      }
    }
    // v45：本土自由球員向玩家隊開價時，球迷認同是「FA意願」出口——高認同球隊球員更想來、開價更客氣
    if (kind === "freeAgent" && (opts.teamId || S.userTeamId) === S.userTeamId && typeof fanIdentifyFaMult === "function") {
      desiredSalary = Math.round(desiredSalary * fanIdentifyFaMult() / 1000) * 1000;
    }
    // v55：文化薪資效果——「信任」全體折扣 ×0.97、「贏球至上」老將願來 ×0.96
    if ((opts.teamId || S.userTeamId) === S.userTeamId && typeof v55CultureSalaryMult === "function") {
      desiredSalary = Math.round(desiredSalary * v55CultureSalaryMult() / 1000) * 1000;
    }
    // v29：新秀薪資上限鎖死——不論特質（大物志向）或經紀人個性怎麼墊高期望，最終期望絕不超過等級上限
    if (kind === "rookie") desiredSalary = Math.min(desiredSalary, rookieSalaryCap(opts.round, p));
    p.negoDesired = { year: S.seasonYear, market: marketSalary, salary: desiredSalary, years: desiredYears };
  }
  ensureAgent(p);
  UI.negotiation = {
    kind, playerId: p.id, playerObj: kind === "rookie" ? p : null,
    teamId: opts.teamId || S.userTeamId, round: opts.round || null, pickNo: opts.pickNo || null,
    marketSalary, desiredSalary, desiredYears,
    offerSalary: kind === "rookie" ? desiredSalary : marketSalary, // v29：新秀預設出價＝期望值（本來就≤上限）
    offerYears: desiredYears,
    rookieCap: kind === "rookie" ? rookieSalaryCap(opts.round, p) : null, // v29：新秀薪資硬上限
    attemptsLeft: (AGENT_TYPES[p.agent.type].attempts || 5), log: []
  };
  UI.screen = "negotiation";
  render();
}

function submitNegotiationOffer(offerSalary, offerYears) {
  const neg = UI.negotiation;
  if (!neg) return;
  let salary = Math.max(1000, Math.round(Number(offerSalary) || 0));
  const years = clamp(Math.round(Number(offerYears) || 1), 1, 7);
  // v29：新秀薪資上限鎖死——出價超過等級上限時自動壓回上限（新秀合約只能往下談）
  if (neg.kind === "rookie" && neg.rookieCap) salary = Math.min(salary, neg.rookieCap);
  // v25談約人性化：
  // (1) 年限不足期望時，可用「溢價」彌補：每少1年，所需薪資+28%（1年約可談成任何人，但要付出高溢價）
  // (2) 出價 ≥ 所需薪資（含溢價）→ 必定成交，不再有「開到期望還被拒」的純機率黑箱
  // v27經紀人個性：溢價率、所需門檻、成交機率斜率依經紀人性格而異（出價≥所需必成交的鐵則不變）
  const negP = neg.kind === "rookie" ? neg.playerObj : ((S.freeAgents || {})[neg.playerId] || (S.internationalFreeAgents || {})[neg.playerId] || S.players[neg.playerId]);
  ensureAgent(negP);
  const ag = AGENT_TYPES[negP.agent.type];
  const yearsShort = Math.max(0, neg.desiredYears - years);
  let requiredSalary = Math.round(neg.desiredSalary * (1 + yearsShort * (ag.premiumRate != null ? ag.premiumRate : 0.28)));
  if (ag.overYearsPenalty && years > neg.desiredYears + 1) requiredSalary = Math.round(requiredSalary * ag.overYearsPenalty); // 投機派：不想被長約綁死
  if (ag.requiredMult) requiredSalary = Math.round(requiredSalary * ag.requiredMult); // 好說話：門檻略降
  // v28代理人事務所：GM與該類型經紀人的關係帶來門檻折扣與機率加成
  const perks = (typeof agentRelPerks === "function") ? agentRelPerks(negP.agent.type) : { reqMult: 1, slopeMult: 1 };
  requiredSalary = Math.round(requiredSalary * perks.reqMult);
  // v33-B2：莫逆之交經紀人引薦的客戶，談約門檻再打95折
  const referral = (typeof referralFor === "function") ? referralFor(neg.playerId) : null;
  if (referral) requiredSalary = Math.round(requiredSalary * 0.95);
  neg.referralDiscount = !!referral;
  neg.requiredSalary = requiredSalary; // 供UI顯示參考
  let accepted;
  if (salary >= requiredSalary) {
    accepted = true;
  } else {
    const chance = clamp((salary / requiredSalary - 0.7) * 1.8 * (ag.slope || 1) * perks.slopeMult, 0.03, 0.92);
    accepted = Math.random() < chance;
  }
  neg.attemptsLeft--;
  neg.log.unshift({ salary, years, accepted, quote: accepted ? ag.quoteAccept : ag.quoteReject });
  if (accepted) { finalizeNegotiation(neg, salary, years); return; }
  if (neg.attemptsLeft <= 0) { failNegotiation(neg); return; }
  render();
}

function finalizeNegotiation(neg, salary, years) {
  const team = S.teams[neg.teamId];
  const negoP = neg.kind === "rookie" ? neg.playerObj : (S.freeAgents[neg.playerId] || (S.internationalFreeAgents || {})[neg.playerId] || S.players[neg.playerId]);
  // v28：成交提升與該類型經紀人的關係（+1；玩家隊才計入GM人脈）
  if (negoP && negoP.agent && neg.teamId === S.userTeamId && typeof recordAgentRel === "function") recordAgentRel(negoP.agent.type, 1);
  if (negoP) delete negoP.negoDesired; // 成交後清除暫存期望值
  if (neg.kind === "rookie") {
    const p = neg.playerObj;
    p.team = team.id; p.level = "2軍"; p.salary = salary; p.contractYears = years;
    S.players[p.id] = p;
    team.roster2.push(p.id);
    ensureFinance(team);
    const bonus = draftSigningBonus(neg.round, p);
    team.finance.budget -= bonus;
    team.finance.signingBonusSpent = (team.finance.signingBonusSpent || 0) + bonus;
    S.draft.picks.push({ round: neg.round, pick: neg.pickNo, team: team.id, playerId: p.id, signingBonus: bonus });
    S.draft.pickIndex++;
    UI.flash = `已與新秀 ${p.name} 完成簽約（${years}年・${formatMoney(salary)}）！`;
    UI.negotiation = null;
    advanceDraftUntilUserTurn();
    UI.screen = "draft";
  } else if (neg.kind === "freeAgent") {
    const p = S.freeAgents[neg.playerId];
    const r1 = team.roster1.length;
    p.team = team.id; p.level = r1 < 28 ? "1軍" : "2軍"; p.salary = salary; p.contractYears = years;
    ensureFinance(team);
    const bonus = Math.round(salary * 0.3 / 10000) * 10000;
    team.finance.budget -= bonus;
    if (p.level === "1軍") team.roster1.push(p.id); else team.roster2.push(p.id);
    delete S.freeAgents[neg.playerId];
    /* v55 文化訊號追蹤：FA 支出累計（季末快照用） */
    if (typeof v55EnsureCulture === "function") { v55EnsureCulture(); S.culture.faSpendThisYear = (S.culture.faSpendThisYear || 0) + salary * years; }
    UI.flash = `已簽下自由球員 ${p.name}（${years}年・${formatMoney(salary)}，簽約金${formatMoney(bonus)}）。`;
    UI.negotiation = null;
    UI.screen = "freeAgents";
  } else if (neg.kind === "international") {
    const p = S.internationalFreeAgents[neg.playerId];
    const r1 = team.roster1.length;
    const canGoRoster1 = r1 < 28 && foreignCountOnRoster1(team) < FOREIGN_ROSTER_CAP;
    p.team = team.id; p.level = canGoRoster1 ? "1軍" : "2軍"; p.salary = salary; p.contractYears = years;
    S.players[p.id] = p;
    ensureFinance(team);
    const bonus = Math.round(salary * 0.4 / 10000) * 10000; // 跨海挖角簽約金比例較高
    team.finance.budget -= bonus;
    if (p.level === "1軍") team.roster1.push(p.id); else team.roster2.push(p.id);
    delete S.internationalFreeAgents[neg.playerId];
    // v27記憶事件：35%機率有另一支球團也在追這位好手（豪購/賭性型優先），被你搶先＝結下樑子
    if (Math.random() < 0.35 && typeof recordGmMemory === "function") {
      const rivals = Object.values(S.teams).filter(t => t.id !== S.userTeamId);
      const eager = rivals.filter(t => t.persona === "splash" || t.persona === "gambler");
      const rival = choice(eager.length > 0 ? eager : rivals);
      recordGmMemory(rival, -2, `你搶先簽下他們鎖定的國際好手 ${p.name}`);
      if (typeof pushNews === "function") pushNews("國際賽", `傳出${rival.name}原已鎖定 ${p.name}，卻遭${team.name}搶親成功，兩隊關係降到冰點。`);
    }
    UI.flash = `已簽下國際球員 ${p.name}（${p.nationality}，${years}年・${formatMoney(salary)}），簽約金${formatMoney(bonus)}，安排至${p.level}。`;
    UI.negotiation = null;
    UI.screen = "internationalMarket";
  } else {
    const p = S.players[neg.playerId];
    p.salary = salary; p.contractYears = years;
    S.pendingContractRenewals = (S.pendingContractRenewals || []).filter(id => id !== p.id);
    UI.flash = `已與 ${p.name} 完成續約（${years}年・${formatMoney(salary)}）。`;
    UI.negotiation = null;
    UI.screen = "contractRenewals";
  }
  persist();
  render();
}

function failNegotiation(neg) {
  // v28：談判破局讓與該類型經紀人的關係-1（玩家隊才計入）
  const failP = neg.kind === "rookie" ? neg.playerObj : ((S.freeAgents || {})[neg.playerId] || (S.internationalFreeAgents || {})[neg.playerId] || S.players[neg.playerId]);
  if (failP && failP.agent && neg.teamId === S.userTeamId && typeof recordAgentRel === "function") recordAgentRel(failP.agent.type, -1);
  if (neg.kind === "rookie") {
    const p = neg.playerObj;
    S.draft.picks.push({ round: neg.round, pick: neg.pickNo, team: neg.teamId, playerId: null, failed: true, failedName: p.name });
    S.draft.pickIndex++;
    UI.flash = `與新秀 ${p.name} 談判破局（5次都談不成），他選擇直接放棄加盟、退出本屆選秀。`;
    UI.negotiation = null;
    advanceDraftUntilUserTurn();
    UI.screen = "draft";
  } else if (neg.kind === "freeAgent") {
    const p = S.freeAgents[neg.playerId];
    delete S.freeAgents[neg.playerId];
    UI.flash = `與自由球員 ${p ? p.name : ""} 談判破局，他選擇轉投別隊，已離開自由球員市場。`;
    UI.negotiation = null;
    UI.screen = "freeAgents";
  } else if (neg.kind === "international") {
    const p = S.internationalFreeAgents[neg.playerId];
    delete S.internationalFreeAgents[neg.playerId];
    UI.flash = `與國際球員 ${p ? p.name : ""} 談判破局，他選擇留在原聯盟效力，已離開國際球員市場。`;
    UI.negotiation = null;
    UI.screen = "internationalMarket";
  } else {
    const p = S.players[neg.playerId];
    const team = S.teams[neg.teamId];
    releasePlayerToFreeAgency(p, team);
    UI.flash = `與 ${p.name} 續約談判破局（5次都談不成），已自動離隊、進入自由球員市場。`;
    UI.negotiation = null;
    UI.screen = "contractRenewals";
  }
  persist();
  render();
}

/* ==== v31 教練/球探續約談判（staffRenewal 通道）====
   複用「出價≥期望必成交、短約溢價、期望固定不重擲」的談判精神，但走幕僚薪資邏輯（無經紀人）。
   談成＝續約（延長合約年限）；不續/破局＝職位空缺（加成歸零）直到玩家自由市場補人。AI隊不走此流程。 */
function staffRef(item) {
  const team = S.teams[S.userTeamId];
  if (!item || !team) return null;
  if (item.kind === "coach") {
    // v35：只認「屬於玩家現任球隊、且與佇列項目職位吻合」的教練；
    // 東山再起殘留的舊隊項目在此擋下（回傳null → 佇列自動略過），杜絕跨隊續約/誤刪。
    const byId = S.coaches[item.staffId];
    if (byId && byId.team === S.userTeamId) return byId;
    const curId = team.coachStaff && team.coachStaff[item.level] ? team.coachStaff[item.level][item.role] : null;
    const cur = curId ? S.coaches[curId] : null;
    return (cur && curId === item.staffId) ? cur : null;
  }
  const s = team.scouts ? team.scouts[item.area] : null;
  return (s && (!item.scoutId || s.id === item.scoutId)) ? s : null; // v35：球探同樣驗證身分吻合
}
function staffMarketSalary(item, staff) {
  if (item.kind === "coach") {
    let s = 30 + (staff.teaching - 40) * 1.7;
    if (staff.specialAbility) s *= 1.2;
    if (typeof v42RenewTrustMult === "function") s *= v42RenewTrustMult(staff); // v42④：一軍總教練續約要價受信任影響（≥60打折／40~60加價15%／<40獅子大開口35%）
    return clamp(Math.round(s), 30, 150) * 10000;
  } else {
    let s = 50 + (staff.accuracy - 40) * 2.3;
    return clamp(Math.round(s), 50, 200) * 10000;
  }
}
function staffAbilityLabel(item, staff) {
  if (item.kind === "coach") return `調教力 ${staff.teaching}${staff.specialAbility ? `・特殊技「${staff.specialAbility.name}」(+${Math.round(staff.specialAbility.bonus * 100)}%)` : ""}`;
  return `評估精準度 ${staff.accuracy}・專長 ${staff.specialty || "綜合評估"}`;
}
function generateStaffMarket(item) {
  const n = randInt(3, 5);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (item.kind === "coach") {
      const specialty = COACH_SPECIALTY_MAP[item.role] || "leadership";
      const teaching = genRating(55, 15);
      const sa = rollSpecialAbility(specialty, 0.2);
      out.push({ name: generateChineseName(), teaching, specialAbility: sa, salary: clamp(Math.round((30 + (teaching - 40) * 1.7) * (sa ? 1.2 : 1)), 30, 150) * 10000, contractYears: randInt(2, 5) });
    } else {
      const accuracy = genRating(55, 15);
      out.push({ name: generateChineseName(), accuracy, specialty: choice(["打者潛力評估", "投手潛力評估", "綜合評估"]), salary: clamp(Math.round(50 + (accuracy - 40) * 2.3), 50, 200) * 10000, contractYears: randInt(1, 4) });
    }
  }
  return out;
}
function startStaffRenewal(item) {
  const staff = staffRef(item);
  if (!staff) { advanceStaffRenewalQueue(); return; }
  const market = staffMarketSalary(item, staff);
  if (!staff.renewDesired || staff.renewDesired.year !== S.seasonYear) {
    const desiredSalary = Math.round(market * 0.92 / 1000) * 1000; // 留任續約折扣
    const desiredYears = item.kind === "coach" ? clamp(randInt(2, 4), 1, 5) : clamp(randInt(1, 3), 1, 4);
    staff.renewDesired = { year: S.seasonYear, market, salary: desiredSalary, years: desiredYears };
  }
  UI.negotiation = {
    kind: "staffRenewal", staffItem: item,
    label: item.kind === "coach" ? `${item.level}${item.role}・${staff.name}` : `${({ domestic: "國內", international: "國際", trade: "交易" })[item.area]}球探・${staff.name}`,
    marketSalary: market, desiredSalary: staff.renewDesired.salary, desiredYears: staff.renewDesired.years,
    offerSalary: staff.renewDesired.salary, offerYears: staff.renewDesired.years,
    market3to5: generateStaffMarket(item), attemptsLeft: 5, log: []
  };
  UI.screen = "negotiation";
  render();
}
function submitStaffOffer(offerSalary, offerYears) {
  const neg = UI.negotiation;
  if (!neg || neg.kind !== "staffRenewal") return;
  const staff = staffRef(neg.staffItem);
  if (!staff) { UI.negotiation = null; advanceStaffRenewalQueue(); return; }
  const salary = Math.max(100000, Math.round(Number(offerSalary) || 0));
  const years = clamp(Math.round(Number(offerYears) || 1), 1, neg.staffItem.kind === "coach" ? 5 : 4);
  const yearsShort = Math.max(0, neg.desiredYears - years);
  const requiredSalary = Math.round(neg.desiredSalary * (1 + yearsShort * 0.25)); // 短約溢價：每少1年+25%
  neg.requiredSalary = requiredSalary;
  let accepted;
  if (salary >= requiredSalary) accepted = true;
  else { const chance = clamp((salary / requiredSalary - 0.7) * 1.8, 0.03, 0.9); accepted = Math.random() < chance; }
  neg.attemptsLeft--;
  neg.log.unshift({ salary, years, accepted });
  if (accepted) { finalizeStaffRenewal(neg, salary, years); return; }
  if (neg.attemptsLeft <= 0) { failStaffRenewal(neg); return; }
  render();
}
function finalizeStaffRenewal(neg, salary, years) {
  const item = neg.staffItem;
  const staff = staffRef(item);
  if (staff) { staff.salary = salary; staff.contractYears = years; delete staff.renewDesired; }
  const team = S.teams[S.userTeamId];
  if (item.kind === "coach") setCoachVacancy(team, item.level, item.role, false);
  else setScoutVacancy(team, item.area, false);
  if (item.kind === "coach" && item.level === "1軍" && item.role === "總教練" && staff && typeof chronicle === "function") try { chronicle("coach", `與總教練${staff.name}完成續約（${years}年）`); } catch (e) {} // v42④
  UI.flash = `已完成續約：${neg.label}（${years}年・${formatMoney(salary)}）。`;
  UI.negotiation = null;
  advanceStaffRenewalQueue();
}
function failStaffRenewal(neg) {
  if (neg.staffItem && neg.staffItem.kind === "coach" && typeof chronicle === "function") try { chronicle("coach", `與${neg.label}續約談判破局，職位懸缺`); } catch (e) {} // v42④：教練來去入史冊（補S9）
  vacateStaff(neg.staffItem, `與 ${neg.label} 續約談判破局，該職位暫時空缺（加成歸零），請到自由市場補人。`);
  UI.negotiation = null;
  advanceStaffRenewalQueue();
}
function vacateStaff(item, flashMsg) {
  const team = S.teams[S.userTeamId];
  if (item.kind === "coach") {
    const cid = team.coachStaff[item.level][item.role];
    if (cid) delete S.coaches[cid];
    team.coachStaff[item.level][item.role] = null;
    setCoachVacancy(team, item.level, item.role, true);
  } else {
    team.scouts[item.area] = null;
    setScoutVacancy(team, item.area, true);
  }
  UI.flash = flashMsg;
}
function advanceStaffRenewalQueue() {
  if (Array.isArray(S.pendingStaffRenewals) && S.pendingStaffRenewals.length > 0) S.pendingStaffRenewals.shift();
  persist();
  if (Array.isArray(S.pendingStaffRenewals) && S.pendingStaffRenewals.length > 0) { UI.screen = "staffRenewal"; render(); }
  else proceedFromStaffRenewals();
}
function declineStaffRenewal() {
  const item = (S.pendingStaffRenewals || [])[0];
  if (!item) { proceedFromStaffRenewals(); return; }
  const staff = staffRef(item);
  // v35：staffRef 驗不到人（殘留舊隊項目或資料異常）→ 純略過佇列，絕不 vacateStaff 誤刪現任
  if (!staff) { advanceStaffRenewalQueue(); return; }
  if (item.kind === "coach" && typeof chronicle === "function") try { chronicle("coach", `${item.level}${item.role}${staff.name}約滿離任，職位懸缺`); } catch (e) {} // v42④：教練來去入史冊（補v41已知簡化S9）
  vacateStaff(item, `未與 ${item.kind === "coach" ? `${item.level}${item.role}` : "球探"} ${staff.name} 續約，該職位暫時空缺（加成歸零），請到自由市場補人。`);
  advanceStaffRenewalQueue();
}
function openStaffRenewal() {
  const item = (S.pendingStaffRenewals || [])[0];
  if (!item) { proceedFromStaffRenewals(); return; }
  startNegotiation("staffRenewal", null, { item });
}
// 便利函式：一鍵以期望薪資續約所有到期幕僚（測試/快速流程用；缺人者略過）
function autoRenewAllStaff() {
  const team = S.teams[S.userTeamId];
  (S.pendingStaffRenewals || []).forEach(item => {
    const staff = staffRef(item);
    if (staff) {
      const market = staffMarketSalary(item, staff);
      staff.salary = Math.round(market * 0.92 / 1000) * 1000;
      staff.contractYears = item.kind === "coach" ? randInt(2, 4) : randInt(1, 3);
      delete staff.renewDesired;
      if (item.kind === "coach") setCoachVacancy(team, item.level, item.role, false);
      else setScoutVacancy(team, item.area, false);
    }
  });
  S.pendingStaffRenewals = [];
  persist();
  proceedFromStaffRenewals();
}

function cancelNegotiation() {
  const neg = UI.negotiation;
  if (!neg) { UI.screen = "dashboard"; render(); return; }
  if (neg.kind === "staffRenewal") { UI.negotiation = null; UI.screen = "staffRenewal"; render(); return; } // v31：返回續約清單（尚未決定，不消耗佇列）
  if (neg.kind === "rookie" && neg.playerObj) S.draft.pool.push(neg.playerObj);
  UI.negotiation = null;
  UI.screen = neg.kind === "rookie" ? "draft" : (neg.kind === "freeAgent" ? "freeAgents" : (neg.kind === "international" ? "internationalMarket" : "contractRenewals"));
  render();
}

// v28代理人事務所：對談判中球員的經紀人做情蒐（花錢＋揭露性格與期望底線）
function scoutAgentInNegotiation() {
  const neg = UI.negotiation;
  if (!neg) return;
  const p = neg.kind === "rookie" ? neg.playerObj : ((S.freeAgents || {})[neg.playerId] || (S.internationalFreeAgents || {})[neg.playerId] || S.players[neg.playerId]);
  if (!p) return;
  ensureAgency();
  if (isAgentScouted(p)) { render(); return; }
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  const cost = agentScoutCost(p);
  if (team.finance.budget < cost) {
    UI.flash = `情蒐經費不足（需 ${formatMoney(cost)}），無法委託事務所打聽 ${p.name} 的經紀人。`;
    render();
    return;
  }
  team.finance.budget -= cost;
  S.agency.scouted[p.id] = { year: S.seasonYear };
  UI.flash = `事務所已探明 ${p.name} 的經紀人底細（花費 ${formatMoney(cost)}）。`;
  persist();
  render();
}

/* v29談約資訊完整化：談約前把「目前數據＋球探完整報告（含預測天花板）＋成長階段＋上季成績」全部攤在談判桌上。
   - 自家在役球員（續約）：能力欄顯示真實數值（自家人不需要球探霧化）
   - 自由球員／國際球員：顯示球探評估天花板（依有效精準度霧化，同季內固定不重擲）
   - 新秀：沿用選秀既有的球探評估報告（scouted值＋現況/天花板評等＋熟成度） */
function scoutCeilingReport(p, team, kind) {
  const scout = kind === "international" ? (team.scouts || {}).international : (team.scouts || {}).domestic;
  const acc = effectiveScoutAccuracy(team, scout);
  if (!p.scoutCeilingRpt || p.scoutCeilingRpt.year !== S.seasonYear) {
    const est = scoutedEstimate(p.potential, acc);
    p.scoutCeilingRpt = { year: S.seasonYear, val: est, grade: gradeFromValue(est), acc };
  }
  return p.scoutCeilingRpt;
}
function negoStatLine(p, s) {
  if (!s) return null;
  if (p.isPitcher) {
    if (!(s.IP > 0)) return null;
    return `${s.G}場・${s.W}勝${s.L}敗${s.SV ? s.SV + "救援" : ""}・防禦率 ${era(s).toFixed(2)}・${s.SO}K（${Math.round(s.IP)}局）`;
  }
  if (!(s.AB > 0)) return null;
  return `${s.G}場・打擊率 ${battingAvg(s).toFixed(3).replace(/^0/, "")}・${s.HR}轟 ${s.RBI}打點・${s.SB}盜`;
}
/* v37②：新秀逐屬性「現在(評估) → 預估~天花板」列（球探報告與選秀卡共用）。
   預估值由 scoutedAttrProjection 依總成長空間推估；資料不足時只顯示現在值。 */
function scoutedAttrRows(p) {
  if (!p || !p.scouted) return "";
  /* v38①：優先採用逐屬性天花板評估（p.scoutedPots，每屬性各自霧化，真差異化）；
     舊存檔的球員若尚無 scoutedPots，退回 v37 的等位移推估，畫面不會開天窗。 */
  const proj = (cur, key) => {
    if (p.scoutedPots && typeof p.scoutedPots[key] === "number") return p.scoutedPots[key];
    return scoutedAttrProjection(cur, p.scoutedOverall, p.scoutedCeilingVal);
  };
  const row = (label, cur, isVel, key) => {
    if (cur == null) return "";
    const pv = proj(cur, key);
    const curTxt = isVel ? (velocityKmh(cur) + "km/h") : cur;
    const projTxt = (pv == null) ? "" : (isVel ? ("~" + velocityKmh(pv) + "km/h") : ("~" + pv));
    return `<div class="attr attr2"><span>${label}</span><b>${curTxt}${projTxt ? `<span class="proj"> → ${projTxt}</span>` : ""}</b></div>`;
  };
  const s = p.scouted;
  // v46：補齊 p.scouted 未涵蓋的欄位（對左右投/盜壘/觸擊/體力/耐久/捕手三項/變化球），走全欄位球探視圖（每季快取、不跳動）。
  const sv = (typeof v46ScoutViewFor === "function") ? v46ScoutViewFor(p) : {};
  const xrow = (label, key, isVel) => {
    const v = (s && s[key] != null) ? s[key] : (sv ? sv[key] : null);
    if (v == null) return "";
    const txt = isVel ? (velocityKmh(v) + "km/h") : v;
    return `<div class="attr attr2"><span>${label}</span><b>${txt}</b></div>`;
  };
  if (p.isPitcher) {
    const core = row("球速", s.velocity, true, "velocity") + row("控球", s.control, false, "control") + row("體力", s.stamina, false, "stamina") + row("抗壓", s.composure, false, "composure") + xrow("耐久", "durability", false);
    const pitches = (sv && sv.pitches ? sv.pitches : (p.pitches || []));
    // 變化球：每顆一個網格格子（球種名／球威・控球），融入既有 2 欄網格不破版
    const pitchHtml = pitches.map(pt => `<div class="attr attr2"><span>${pt.type}</span><b>威${pt.stuff != null ? pt.stuff : "—"}／控${pt.control != null ? pt.control : "—"}</b></div>`).join("");
    return core + pitchHtml;
  }
  const batCore = row("接觸", s.contact, false, "contact") + row("長打", s.power, false, "power") + row("選球", s.eye, false, "eye")
    + xrow("對左投", "vsL") + xrow("對右投", "vsR")
    + row("速度", s.speed, false, "speed") + xrow("盜壘", "steal") + xrow("觸擊", "bunting")
    + row("守備", s.fielding, false, "fielding") + row("臂力", s.arm, false, "arm") + xrow("體力", "stamina") + xrow("耐久", "durability");
  const catHtml = (p.gameCalling != null)
    ? xrow("配球", "gameCalling") + xrow("接捕", "framing") + xrow("阻殺", "caughtStealing") + xrow("阻擋", "blocking") + xrow("傳球", "popTime") + xrow("調教", "pitcherHandling")
    : "";
  return batCore + catHtml;
}
function negotiationScoutBlock(p, neg) {
  const team = S.teams[neg.teamId || S.userTeamId];
  const phase = growthPhaseLabel(p);
  const seasonOver = !S.schedule || S.currentDay >= S.schedule.length;
  const curLine = negoStatLine(p, p.seasonStats);
  const lastLine = negoStatLine(p, p.lastSeasonStats);
  let abilityRows, ceilingRow;
  if (neg.kind === "rookie") {
    // 新秀：球探評估值（非真實值）＋選秀既有的現況/天花板評等。v37②：逐屬性同列「現在 → 預估值（天花板）」
    abilityRows = scoutedAttrRows(p);
    const rkCur = (p.scoutedOverall != null) ? `（${p.scoutedOverall}）` : "";
    const rkCeil = (p.scoutedCeilingVal != null) ? `（約${p.scoutedCeilingVal}）` : "";
    ceilingRow = `<span class="gradebadge grade-${p.scoutedGrade}">現況 ${p.scoutedGrade}${rkCur}</span> <span class="gradebadge grade-${p.scoutedCeiling}">預測天花板 ${p.scoutedCeiling}${rkCeil}</span>`;
  } else {
    const own = neg.kind === "renewal"; // 自家人看真實值
    const rpt = scoutCeilingReport(p, team, neg.kind);
    // v46：自由/國際球員走全欄位球探視圖（霧化）；自家續約看真實值。兩者都攤出所有能力（含變化球/對左右投/盜壘觸擊/捕手三項/耐久）。
    const sv2 = own ? null : ((typeof v46ScoutViewFor === "function") ? v46ScoutViewFor(p, neg.kind === "international" ? undefined : undefined) : {});
    const gv = k => own ? (p[k] != null ? p[k] : "—") : (sv2 && sv2[k] != null ? sv2[k] : "—");
    const cell = (label, k, isVel) => `<div class="attr"><span>${label}</span><b>${isVel ? (velocityKmh(gv(k)) + "km/h") : gv(k)}</b></div>`;
    const cell2 = (label, k) => `<div class="attr attr2"><span>${label}</span><b>${gv(k)}</b></div>`;
    if (p.isPitcher) {
      const pitchArr = own ? (p.pitches || []) : ((sv2 && sv2.pitches) ? sv2.pitches : (p.pitches || []));
      const pitchCells = pitchArr.map(pt => `<div class="attr attr2"><span>${pt.type}</span><b>威${pt.stuff != null ? pt.stuff : "—"}／控${pt.control != null ? pt.control : "—"}</b></div>`).join("");
      abilityRows = cell("球速", "velocity", true) + cell("控球", "control") + cell("體力", "stamina") + cell("抗壓", "composure") + cell2("耐久", "durability") + pitchCells;
    } else {
      const catCells = (p.gameCalling != null) ? (cell2("配球", "gameCalling") + cell2("接捕", "framing") + cell2("阻殺", "caughtStealing") + cell2("阻擋", "blocking") + cell2("傳球", "popTime") + cell2("調教", "pitcherHandling")) : "";
      abilityRows = cell("接觸", "contact") + cell("長打", "power") + cell("選球", "eye")
        + cell2("對左投", "vsL") + cell2("對右投", "vsR")
        + cell("速度", "speed") + cell2("盜壘", "steal") + cell2("觸擊", "bunting")
        + cell("守備", "fielding") + cell2("臂力", "arm") + cell2("體力", "stamina") + cell("抗壓", "composure") + cell2("耐久", "durability") + catCells;
    }
    const curG = gradeFromValue(trueOverall(p));
    ceilingRow = `<span class="gradebadge grade-${curG}">綜合現況 ${curG}（${Math.round(trueOverall(p))}）</span> <span class="gradebadge grade-${rpt.grade}">預測天花板 ${rpt.grade}（約${rpt.val}）</span>${own ? "" : `<span class="draftnote muted" style="display:block;">天花板為球探評估值（有效精準度 ${rpt.acc}），可能與真實潛力有落差。</span>`}`;
  }
  return `<div class="card">
    <div class="eyebrow">${icon('clipboard')} 球探完整報告</div>
    <div class="draftgrades" style="margin:6px 0;flex-wrap:wrap;">${ceilingRow}</div>
    ${neg.kind === "rookie" ? `<div class="draftnote muted" style="margin:2px 0;">逐項能力：現在(評估) → 該項預估天花板（v38：每項能力各有自己的天花板，成長空間不一樣；準確度越高越可信）</div>` : ""}
    <div class="attrgrid">${abilityRows}</div>
    <p class="sub dark" style="margin:6px 0;">${icon('chart-up')} 生涯階段：<b class="${phase.cls}">${phase.text}</b> — ${phase.desc}${neg.kind === "rookie" ? `；${p.maturity}` : ""}</p>
    ${curLine ? `<p class="sub dark" style="margin:4px 0;">${icon('chart')} ${seasonOver ? "上季成績（剛結束的球季）" : "本季至今"}：${curLine}</p>` : ""}
    ${lastLine && p.lastSeasonStats ? `<p class="sub dark" style="margin:4px 0;">${icon('chart')} 第${p.lastSeasonStats.year}年成績：${lastLine}</p>` : ""}
    ${!curLine && !lastLine ? `<p class="draftnote muted">尚無一軍出賽成績紀錄${neg.kind === "rookie" ? "（新秀）" : ""}。</p>` : ""}
  </div>`;
}
function renderNegotiation() {
  const neg = UI.negotiation;
  if (!neg) { UI.screen = "dashboard"; render(); return; }
  if (neg.kind === "staffRenewal") return renderStaffNegotiation(neg); // v31：教練/球探續約談判畫面
  const p = neg.kind === "rookie" ? neg.playerObj : (neg.kind === "freeAgent" ? (S.freeAgents || {})[neg.playerId] : (neg.kind === "international" ? (S.internationalFreeAgents || {})[neg.playerId] : S.players[neg.playerId]));
  if (!p) { UI.negotiation = null; UI.screen = "dashboard"; render(); return; }
  const kindLabel = { rookie: "新秀簽約談判", freeAgent: "自由球員簽約談判", international: "國際球員簽約談判", renewal: "在役球員續約談判" }[neg.kind];
  ensureAgent(p);
  const agInfo = AGENT_TYPES[p.agent.type]; // v27：談判桌對面坐的是經紀人
  const failNote = neg.kind === "rookie" ? "這位新秀就會直接放棄加盟、退出本屆選秀" : (neg.kind === "freeAgent" ? "他就會轉投別隊、離開自由球員市場" : (neg.kind === "international" ? "他就會留在原聯盟效力、離開國際球員市場" : "他就會自動離隊、進入自由球員市場"));
  /* v40 A案分頁：談判畫面拆三頁——💰談判桌（出價操作）／📋球探報告／🕵️情報（經紀人＋事務所＋新秀薪資上限）。
     所有面板同時存在DOM、CSS切換，表單狀態不因換頁遺失。 */
  const negoDealPanel = `
      <p class="sub dark" style="margin-bottom:10px;">調整下方薪資與年限後送出，球員會評估是否接受；越接近期望金額與年限，成功率越高。談不成還可以再試，${5 - neg.attemptsLeft === 0 ? "共有5次機會" : `已用掉 ${5 - neg.attemptsLeft} 次`}，5次都談不成${failNote}。</p>
      <label class="field">
        <span>提出年薪（萬元）${neg.kind === "rookie" && neg.rookieCap ? `・上限 ${Math.round(neg.rookieCap / 10000)}萬` : ""}</span>
        <input id="in-neg-salary" type="number" step="1" min="0" ${neg.kind === "rookie" && neg.rookieCap ? `max="${Math.round(neg.rookieCap / 10000)}"` : ""} value="${Math.round(neg.offerSalary / 10000)}" />
        <span id="neg-salary-preview" class="draftnote muted">＝ ${formatMoney(neg.offerSalary)}</span>
      </label>
      <label class="field">
        <span>提出年限（年）</span>
        <input id="in-neg-years" type="number" min="1" max="7" value="${neg.offerYears}" />
      </label>
      ${neg.log.length > 0 ? `
      <div class="card">
        <div class="eyebrow">先前提案紀錄</div>
        <ul class="issuelist" style="color:var(--ink);">
          ${neg.log.map(l => `<li>${formatMoney(l.salary)}／${l.years}年 → ${l.accepted ? "接受" : "拒絕"}${l.quote ? `<br><span class="agentquote">${p.agent.name}：${l.quote}</span>` : ""}</li>`).join("")}
        </ul>
      </div>` : ""}
      <div class="btnrow"><button id="btn-neg-submit" class="btn-primary">送出提案</button></div>
      <div class="btnrow"><button id="btn-neg-cancel" class="btn-outline">先不談，稍後再說</button></div>`;
  const negoReportPanel = negotiationScoutBlock(p, neg);
  const negoIntelPanel = `
      <p class="draftnote muted">${icon('briefcase')} ${agInfo.name}：${agInfo.desc}。</p>
      ${neg.kind === "rookie" && neg.rookieCap ? `<div class="card issuecard"><div class="eyebrow">新秀薪資上限（聯盟規定）</div>${foldNote(`<p class="sub dark">此新秀（天花板 ${p.scoutedCeiling} 級）的年薪上限鎖定為 <b>${formatMoney(neg.rookieCap)}</b>，只能從上限往下談、無法向上加碼；出價越低成功率越低，砍太兇談崩5次會直接放棄加盟。</p>`)}</div>` : ""}
      ${(() => {
        // v28代理人事務所：情蒐卡（未探→委託按鈕；已探→揭露底線與性格；並顯示GM與此類經紀人的人脈）
        const scouted = (typeof isAgentScouted === "function") && isAgentScouted(p);
        const rel = (typeof agentRel === "function") ? agentRel(p.agent.type) : 0;
        const relL = (typeof agentRelLabel === "function") ? agentRelLabel(rel) : { text: "", cls: "affmid" };
        const cost = (typeof agentScoutCost === "function") ? agentScoutCost(p) : 0;
        const relLine = `<p class="sub dark" style="margin:4px 0;">${icon('handshake')} 你與「${agInfo.name}」經紀人的交情：<span class="afftag ${relL.cls}">${relL.text}</span>${rel !== 0 ? `（${rel > 0 ? "談約門檻降低、較好談" : "談約門檻升高、較難談"}）` : ""}</p>`;
        if (scouted) {
          return `<div class="card agencycard">
            <div class="eyebrow">${icon('scout')} 代理人事務所・情蒐報告</div>
            <p class="sub dark">經紀人 <b>${p.agent.name}</b>（${agInfo.name}）談判風格：${agInfo.desc}。</p>
            <p class="sub dark">情蒐揭露的期望底線：年薪約 <b>${formatMoney(neg.desiredSalary)}</b>、年限偏好 <b>${neg.desiredYears} 年</b>。年限每少 1 年，所需薪資約增加 ${Math.round((agInfo.premiumRate != null ? agInfo.premiumRate : 0.28) * 100)}%。</p>
            ${relLine}
          </div>`;
        }
        return `<div class="card agencycard">
          <div class="eyebrow">${icon('scout')} 代理人事務所</div>
          <p class="sub dark">尚未情蒐這位經紀人。委託事務所打聽（花費 <b>${formatMoney(cost)}</b>）可揭露其性格與期望底線，讓你一次開到位。</p>
          ${relLine}
          <div class="btnrow"><button id="btn-scout-agent" class="btn-secondary">委託情蒐（${formatMoney(cost)}）</button></div>
        </div>`;
      })()}`;
  app.innerHTML = `
    <div class="wrap v60-negotiation-screen draft-negotiation-screen">
      <div class="topbar"><div class="eyebrow">${kindLabel}</div><div class="teamname">${p.name}</div></div>
      <div class="v60-negotiation-banner" aria-label="談薪流程"><div class="v60-negotiation-banner-icon">${icon('money')}</div><div><span>NEGOTIATION DESK</span><strong>把薪資與年限談成合約</strong><div class="v60-negotiation-steps"><b>1 報價</b><b>2 評估</b><b>3 簽約</b></div></div></div>
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">類型</div><div class="sb-value small">${p.isPitcher ? "投手" : "野手"}・${p.age}歲</div></div>
        <div class="sb-row small"><div class="sb-label">剩餘談約機會</div><div class="sb-value small">${neg.attemptsLeft} 次</div></div>
        <div class="sb-row small"><div class="sb-label">AI建議開價</div><div class="sb-value small">${formatMoney(neg.marketSalary)}／年</div></div>
        <div class="sb-row small"><div class="sb-label">球員心理期望</div><div class="sb-value small">約 ${formatMoney(neg.desiredSalary)}／年・${neg.desiredYears}年</div></div>
        <div class="sb-row small"><div class="sb-label">經紀人</div><div class="sb-value small">${p.agent.name} <span class="agenttag" title="${agInfo.desc}">${agInfo.name}</span></div></div>
      </div>
      ${uiTabs("nego", [
        { key: "deal", label: ""+icon('money')+" 談判桌", html: negoDealPanel },
        { key: "report", label: ""+icon('clipboard')+" 球探報告", html: negoReportPanel },
        { key: "intel", label: ""+icon('scout')+" 情報", html: negoIntelPanel }
      ])}
    </div>`;
  const salaryInput = document.getElementById("in-neg-salary");
  salaryInput.oninput = () => {
    const preview = document.getElementById("neg-salary-preview");
    preview.textContent = `＝ ${formatMoney((Number(salaryInput.value) || 0) * 10000)}`;
  };
  document.getElementById("btn-neg-submit").onclick = () => {
    submitNegotiationOffer((Number(salaryInput.value) || 0) * 10000, document.getElementById("in-neg-years").value);
  };
  document.getElementById("btn-neg-cancel").onclick = () => cancelNegotiation();
  const scoutBtn = document.getElementById("btn-scout-agent");
  if (scoutBtn) scoutBtn.onclick = () => scoutAgentInNegotiation();
}

/* v31：教練/球探續約談判畫面（附現任 vs 市場人選數據比較） */
function renderStaffNegotiation(neg) {
  const item = neg.staffItem;
  const staff = staffRef(item);
  if (!staff) { UI.negotiation = null; UI.screen = "staffRenewal"; render(); return; }
  const abilityLine = staffAbilityLabel(item, staff);
  const kindLabel = item.kind === "coach" ? "教練續約談判" : "球探續約談判";
  const compareRows = (neg.market3to5 || []).map(m => item.kind === "coach"
    ? `<tr><td>${m.name}</td><td>調教力 ${m.teaching}${m.specialAbility ? `・${m.specialAbility.name}` : ""}</td><td>${formatMoney(m.salary)}／${m.contractYears}年</td></tr>`
    : `<tr><td>${m.name}</td><td>精準度 ${m.accuracy}・${m.specialty}</td><td>${formatMoney(m.salary)}／${m.contractYears}年</td></tr>`).join("");
  app.innerHTML = `
    <div class="wrap v60-negotiation-screen staff-negotiation-screen">
      <div class="topbar"><div class="eyebrow">${kindLabel}</div><div class="teamname">${neg.label}</div></div>
      <div class="v60-negotiation-banner" aria-label="續約流程"><div class="v60-negotiation-banner-icon">${icon('money')}</div><div><span>RENEWAL DESK</span><strong>比較能力，再決定留任條件</strong><div class="v60-negotiation-steps"><b>1 比較</b><b>2 出價</b><b>3 留任</b></div></div></div>
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">現任能力</div><div class="sb-value small">${abilityLine}</div></div>
        <div class="sb-row small"><div class="sb-label">目前年薪</div><div class="sb-value small">${formatMoney(staff.salary || 0)}</div></div>
        <div class="sb-row small"><div class="sb-label">剩餘談約機會</div><div class="sb-value small">${neg.attemptsLeft} 次</div></div>
        <div class="sb-row small"><div class="sb-label">市場行情</div><div class="sb-value small">${formatMoney(neg.marketSalary)}／年</div></div>
        <div class="sb-row small"><div class="sb-label">留任期望</div><div class="sb-value small">約 ${formatMoney(neg.desiredSalary)}／年・${neg.desiredYears}年</div></div>
      </div>
      ${foldNote(`<p class="draftnote muted">出價 ≥ 期望必定成交；年限每少 1 年，所需薪資 +25%（短約溢價）；期望固定不重擲。談判 5 次都談不成，此職位將空缺、加成歸零，須到自由市場補人。</p>`)}
      <div class="card">
        <div class="eyebrow">${icon('chart')} 現任 vs 市場可簽人選（數據比較）</div>
        <table class="stattable">
          <thead><tr><th>對象</th><th>能力</th><th>身價</th></tr></thead>
          <tbody>
            <tr style="background:rgba(90,160,255,.12);"><td><b>現任・${staff.name}</b></td><td>${abilityLine.replace(/・特殊技.*$/, m => m)}</td><td>目前 ${formatMoney(staff.salary || 0)}</td></tr>
            ${compareRows}
          </tbody>
        </table>
        <p class="sub dark">若不續約而改簽市場人選，可談成後到「教練團／球探」畫面挑選補上；空窗期間該職位加成歸零。</p>
      </div>
      <label class="field">
        <span>提出年薪（萬元）</span>
        <input id="in-staff-salary" type="number" step="1" min="0" value="${Math.round(neg.offerSalary / 10000)}" />
        <span id="staff-salary-preview" class="draftnote muted">＝ ${formatMoney(neg.offerSalary)}</span>
      </label>
      <label class="field">
        <span>提出年限（年）</span>
        <input id="in-staff-years" type="number" min="1" max="${item.kind === "coach" ? 5 : 4}" value="${neg.offerYears}" />
      </label>
      ${neg.log.length > 0 ? `
      <div class="card"><div class="eyebrow">先前提案紀錄</div>
        <ul class="issuelist" style="color:var(--ink);">
          ${neg.log.map(l => `<li>${formatMoney(l.salary)}／${l.years}年 → ${l.accepted ? "接受" : "拒絕"}</li>`).join("")}
        </ul></div>` : ""}
      <div class="btnrow"><button id="btn-staff-submit" class="btn-primary">送出續約提案</button></div>
      <div class="btnrow"><button id="btn-staff-decline" class="btn-outline warn">不續約（職位空缺）</button></div>
      <div class="btnrow"><button id="btn-staff-cancel" class="btn-outline">先回清單，稍後再談</button></div>
    </div>`;
  const salaryInput = document.getElementById("in-staff-salary");
  salaryInput.oninput = () => { document.getElementById("staff-salary-preview").textContent = `＝ ${formatMoney((Number(salaryInput.value) || 0) * 10000)}`; };
  document.getElementById("btn-staff-submit").onclick = () => submitStaffOffer((Number(salaryInput.value) || 0) * 10000, document.getElementById("in-staff-years").value);
  document.getElementById("btn-staff-decline").onclick = () => { UI.negotiation = null; declineStaffRenewal(); };
  document.getElementById("btn-staff-cancel").onclick = () => cancelNegotiation();
}

/* v31：休賽季教練/球探到期續約清單畫面 */
function renderStaffRenewal() {
  const queue = S.pendingStaffRenewals || [];
  if (queue.length === 0) { proceedFromStaffRenewals(); return; }
  const item = queue[0];
  const staff = staffRef(item);
  const team = S.teams[S.userTeamId];
  const title = item.kind === "coach" ? `${item.level}${item.role}` : `${({ domestic: "國內", international: "國際", trade: "交易" })[item.area]}球探`;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}・休賽季幕僚異動</div><h1>教練／球探續約</h1></div>
      <div class="card issuecard">
        <div class="eyebrow">尚待處理：${queue.length} 位到期幕僚</div>
        ${foldNote(`<p class="sub dark">合約到期的教練與球探需要你親自決定續約或放手。<b>不再自動暫代</b>：若不續約或談判破局，該職位會<b>空缺、加成歸零</b>，直到你在「教練團／球探」畫面到自由市場補人為止。</p>`)}
      </div>
      ${staff ? `
      <div class="card">
        <div class="eyebrow">${icon('bell')} ${title}・${staff.name}（合約到期）</div>
        <p class="sub dark">現任能力：${staffAbilityLabel(item, staff)}</p>
        <p class="sub dark">目前年薪：${formatMoney(staff.salary || 0)}</p>
        <div class="btnrow"><button id="btn-open-renewal" class="btn-primary">開始續約談判</button></div>
        <div class="btnrow"><button id="btn-decline-renewal" class="btn-outline warn">不續約（職位空缺）</button></div>
      </div>` : `<div class="card"><p class="sub dark">此職位資料異常，略過。</p><div class="btnrow"><button id="btn-decline-renewal" class="btn-outline">略過</button></div></div>`}
      ${queue.length > 1 ? `<p class="draftnote muted">處理完這一位後，會接續下一位（還有 ${queue.length - 1} 位）。</p>` : ""}
    </div>`;
  const openBtn = document.getElementById("btn-open-renewal");
  if (openBtn) openBtn.onclick = () => openStaffRenewal();
  document.getElementById("btn-decline-renewal").onclick = () => declineStaffRenewal();
}

/* ---------- r008：分析主管續約畫面 ---------- */
function renderDirectorRenewal() {
  var team = S.teams[S.userTeamId];
  var dir = team ? team.analysisDirector : null;
  if (!dir) { proceedFromDirectorRenewal(); return; }
  var newSalary = clamp(dir.salary + randInt(-200000, 300000), 500000, 3000000);
  var newYears = randInt(1, 3);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}・休賽季幕僚異動</div><h1>分析主管續約</h1></div>
      <div class="card issuecard">
        <div class="eyebrow">${icon('bell')} ${dir.name}・合約到期</div>
        <p class="sub dark">你的分析主管 <b>${dir.name}</b>（等級：${dir.tier || "?"}）合約已到期。續約或讓他離開？</p>
        <p class="sub dark">目前年薪：${formatMoney(dir.salary || 0)}</p>
        <p class="sub dark">續約條件：年薪 ${formatMoney(newSalary)}・${newYears} 年</p>
      </div>
      <div class="btnrow"><button id="btn-renew-director" class="btn-primary">續約（${formatMoney(newSalary)} / ${newYears}年）</button></div>
      <div class="btnrow"><button id="btn-decline-director" class="btn-outline warn">不續約（主管離隊）</button></div>
    </div>`;
  document.getElementById("btn-renew-director").onclick = function() {
    dir.salary = newSalary;
    dir.contractYears = newYears;
    UI.flash = dir.name + " 已完成續約！年薪 " + formatMoney(newSalary) + "・" + newYears + " 年。";
    proceedFromDirectorRenewal();
  };
  document.getElementById("btn-decline-director").onclick = function() {
    var name = dir.name;
    team.analysisDirector = null;
    UI.flash = name + " 合約到期離隊。可至數據中心聘請新主管。";
    proceedFromDirectorRenewal();
  };
}

/* ---------- 財務赤字強制裁員（item7） ---------- */
function cutPlayerForFinance(playerId) {
  const team = S.teams[S.userTeamId];
  const p = S.players[playerId];
  if (!p) return;
  releasePlayerToFreeAgency(p, team);
  refreshPayroll(team, S.players);
  UI.flash = `已釋出 ${p.name}（年薪${formatMoney(p.salary || 0)}），進入自由球員市場。`;
  persist();
  render();
}
function renderFinanceCuts() {
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  refreshPayroll(team, S.players);
  const list = team.roster1.concat(team.roster2).map(id => S.players[id]).filter(Boolean).sort((a, b) => (b.salary || 0) - (a.salary || 0));
  const leaguePayrolls = Object.values(S.teams).map(t => { ensureFinance(t); return t.finance.payroll || 0; });
  const avgPayroll = leaguePayrolls.reduce((a, b) => a + b, 0) / leaguePayrolls.length;
  const payrollHealthy = team.finance.payroll <= avgPayroll * 1.15;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>財務赤字・強制裁員</h1></div>
      <div class="card issuecard">
        <div class="eyebrow">目前預算為負：${formatMoney(team.finance.budget)}</div>
        <p class="sub dark">球隊財務出現赤字，必須釋出部分薪資較高的球員（直接進入自由球員市場，不會有回收金額）來降低薪資支出壓力，才能繼續下個球季。</p>
      </div>
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">目前薪資總額</div><div class="sb-value small">${formatMoney(team.finance.payroll)}</div></div>
        <div class="sb-row small"><div class="sb-label">聯盟平均薪資</div><div class="sb-value small">${formatMoney(Math.round(avgPayroll))}</div></div>
      </div>
      <table class="stattable">
        <thead><tr><th>姓名</th><th>層級</th><th>類型</th><th>年薪</th><th></th></tr></thead>
        <tbody>
          ${list.map(p => `<tr><td>${p.name}</td><td>${p.level}</td><td>${p.isPitcher ? "投手" : "野手"}</td><td>${formatMoney(p.salary || 0)}</td><td><button class="movebtn cut-btn" data-id="${p.id}">釋出</button></td></tr>`).join("")}
        </tbody>
      </table>
      <div class="btnrow">
        <button id="btn-cuts-continue" class="btn-primary" ${payrollHealthy ? "" : "disabled"}>${payrollHealthy ? "薪資已回到合理範圍，繼續下一步" : "薪資仍偏高，請繼續釋出球員"}</button>
      </div>
      <div class="btnrow"><button id="btn-cuts-override" class="btn-danger">維持目前狀況，自行承擔風險繼續</button></div>
    </div>`;
  app.querySelectorAll(".cut-btn").forEach(btn => { btn.onclick = () => cutPlayerForFinance(btn.dataset.id); });
  const btnCont = document.getElementById("btn-cuts-continue");
  if (payrollHealthy) btnCont.onclick = () => proceedFromFinanceCuts();
  document.getElementById("btn-cuts-override").onclick = () => proceedFromFinanceCuts();
}

/* ---------- 合約續約談判清單（item3+item7） ---------- */
function renderContractRenewals() {
  const team = S.teams[S.userTeamId];
  const ids = S.pendingContractRenewals || [];
  const list = ids.map(id => S.players[id]).filter(Boolean);
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name}</div><h1>合約續約談判</h1></div>
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      ${foldNote(`<p class="sub dark" style="margin-bottom:10px;">以下球員本季合約到期，請逐一決定「談約」（互動式議價，最多5次機會）或「不續約」（直接釋出進自由球員市場）。也可以一鍵依市場行情自動續約全部人。</p>`)}
      ${list.length === 0 ? `<div class="card"><p class="sub dark">所有待續約球員都已處理完畢！</p></div>` : `
      <table class="stattable">
        <thead><tr><th>姓名</th><th>年齡</th><th>類型</th><th>目前年薪</th><th></th></tr></thead>
        <tbody>
          ${list.map(p => `<tr><td>${p.name}</td><td>${p.age}</td><td>${p.isPitcher ? "投手" : "野手"}</td><td>${formatMoney(p.salary || 0)}</td><td>
            <button class="movebtn renew-btn" data-id="${p.id}">談約</button>
            <button class="movebtn decline-btn" data-id="${p.id}">不續約</button>
          </td></tr>`).join("")}
        </tbody>
      </table>
      <div class="btnrow"><button id="btn-auto-renew-all" class="btn-secondary">全部依市場行情自動續約</button></div>`}
      <div class="btnrow"><button id="btn-renewals-continue" class="btn-primary" ${list.length > 0 ? "disabled" : ""}>前往選秀會</button></div>
    </div>`;
  app.querySelectorAll(".renew-btn").forEach(btn => { btn.onclick = () => startNegotiation("renewal", btn.dataset.id, { teamId: team.id }); });
  app.querySelectorAll(".decline-btn").forEach(btn => { btn.onclick = () => declineContractRenewal(btn.dataset.id); });
  const autoBtn = document.getElementById("btn-auto-renew-all");
  if (autoBtn) autoBtn.onclick = () => autoRenewAllPending();
  if (list.length === 0) document.getElementById("btn-renewals-continue").onclick = () => proceedFromContractRenewals();
}

function renderMarketing() {
  const team = S.teams[S.userTeamId];
  ensureMarketingPlan(team);
  const canPlan = S.currentDay === 0;
  const cal = getGameCalendar();
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name} ・ ${cal.dateLabel}</div><h1>行銷企劃</h1></div>
      ${renderRosterNav("marketing")}
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      ${typeof v60CompatVisualScene === "function" ? v60CompatVisualScene("marketing_command_center_v58", "行銷企劃中心場景", "MARKETING VISUAL", "行銷企劃中心", "完整活動效果、費用與投入操作保留在下方。", "v60-marketing-scene") : ""}
      ${typeof renderCdActivitiesCard === "function" ? renderCdActivitiesCard() : ""}
      <div class="scoreboard v59-compact-scoreboard">
        <div class="sb-row small"><span class="sb-label">人氣</span><span class="sb-value small">${team.finance.popularity}/100</span><span class="sb-label">已投</span><span class="sb-value small">${(team.finance.marketingCampaigns || []).length}項・${formatMoney((team.finance.marketingCampaigns || []).reduce((s, k) => s + ((MARKETING_CAMPAIGNS.find(c => c.key === k) || {}).cost || 0), 0))}</span></div>
        <div class="sb-row small"><span class="sb-label">加成</span><span class="sb-value small">人氣+${team.finance.marketingPopBoost || 0}・周邊+${Math.round((team.finance.marketingMerchPct || 0) * 100)}%・進場+${Math.round((team.finance.marketingAttPct || 0) * 100)}%</span></div>
      </div>
      <p class="v59-compact-line">${canPlan ? "春訓期間可複選活動" : "本季已鎖定，休賽季再規劃"}</p>
      ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<p class="sub dark" style="margin:0;">${canPlan ? "可自由複選以下行銷活動；點一下投入、再點一下取消退費，效果會加總套用整季。人氣成長＝季末人氣提升；周邊收入＝販賣部／周邊營收加成；進場率＝主場觀眾增加。" : "本季行銷活動已鎖定，要等下個休賽季開幕前（春訓期間）才能重新規劃。"}</p>`, "規則與效果說明") : ""}
      ${MARKETING_CAMPAIGNS.map(c => {
        const active = (team.finance.marketingCampaigns || []).includes(c.key);
        const effects = [c.popBoost ? `人氣成長 +${c.popBoost}${c.key === "endorse" ? "（有人氣王球員再+2）" : ""}` : "", c.merchPct ? `周邊收入 +${Math.round(c.merchPct * 100)}%` : "", c.attPct ? `進場率 +${Math.round(c.attPct * 100)}%` : ""].filter(Boolean).join("・");
        const shortEffects = [c.popBoost ? `人氣+${c.popBoost}` : "", c.merchPct ? `周邊+${Math.round(c.merchPct * 100)}%` : "", c.attPct ? `進場+${Math.round(c.attPct * 100)}%` : ""].filter(Boolean).join("・");
        return `
        <div class="card dealcard ${active ? "dealchosen" : ""}">
          <div class="eyebrow">${iconVal(c.icon)} ${c.label}${active ? "（已投入）" : ""}　<span style="font-weight:400;">花費 ${formatMoney(c.cost)}</span></div>
          <p class="v59-compact-card-copy">${shortEffects}</p>
          ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<p class="sub dark" style="margin:0;">${c.desc}</p>`, "活動說明") : `<p class="sub dark" style="margin:4px 0;">${c.desc}</p>`}
          ${canPlan ? `<div class="btnrow"><button class="${active ? "btn-danger" : "btn-secondary"} marketing-btn" data-plan="${c.key}">${active ? "取消" : "投入"}</button></div>` : ""}
        </div>`;
      }).join("")}
      ${typeof v59TextDisclosure === "function" ? v59TextDisclosure(`<p class="sub dark" style="margin:0;">行銷效果不會直接影響戰績；想再進一步提升周邊／販賣部收入上限與球場容量，可以到「球場硬體建設」畫面投資升級。</p>`, "與球場升級的關係") : foldNote(`<p class="sub dark" style="margin-top:14px;">行銷效果不會直接影響戰績；想再進一步提升周邊/販賣部收入上限與球場容量，可以到「球場硬體建設」畫面投資升級。</p>`)}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  app.querySelectorAll(".marketing-btn").forEach(btn => {
    btn.onclick = () => toggleMarketingCampaign(btn.dataset.plan);
  });
  document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
  wireRosterNav();
}

// ④金額顯示統一格式：>=1億顯示「X.XX億元」、>=1萬顯示「X萬元」（可帶1位小數）、否則「X元」。
// 修正邊界進位bug：先把數字四捨五入到「萬」的顯示精度，再決定用哪個單位，
// 避免 9999.5萬（99,995,000元）被顯示成「10000萬元」——現在會正確進位為「1.00億元」。
function formatMoney(v) {
  if (!Number.isFinite(v)) return "0元";
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs < 10000) return `${sign}${Math.round(abs)}元`;
  const wan = Math.round(abs / 10000); // 以「萬」為單位四捨五入後的數值
  if (wan >= 10000) return `${sign}${(abs / 100000000).toFixed(2)}億元`; // 進位後達1億（含 9999.5萬 邊界）
  return `${sign}${wan}萬元`;
}

function renderFinance() {
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  ensureAnnualDeals(team);
  refreshPayroll(team, S.players);
  const warns = financeWarnings(team);
  const report = team.finance.lastSeasonReport;
  const canChangeTicket = S.currentDay === 0;
  const cal = getGameCalendar();
  const leaguePayrolls = Object.values(S.teams).map(t => { ensureFinance(t); return t.finance.payroll || 0; });
  const avgPayroll = leaguePayrolls.reduce((a, b) => a + b, 0) / leaguePayrolls.length;
  const taxThreshold = Math.round(avgPayroll * 1.3);
  const forecast = projectSeasonFinance(team);
  /* v40 A案分頁：財務拆四頁——📊總覽（預算/預估損益）／🎟️票價／📺合約（轉播·贊助）／📜上季報告。 */
  const finOverviewPanel = `
      ${warns.length > 0 ? `<div class="card issuecard"><div class="eyebrow">財務提醒</div><ul class="issuelist">${warns.map(w => `<li>${w}</li>`).join("")}</ul></div>` : ""}
      <div class="scoreboard">
        <div class="sb-row"><span class="sb-label">目前預算</span><span class="sb-value" style="font-size:22px;">${formatMoney(team.finance.budget)}</span></div>
        <div class="sb-row"><span class="sb-label">球隊人氣</span><span class="sb-value small">${team.finance.popularity} / 100</span></div>
        <div class="sb-row"><span class="sb-label">目前薪資總額</span><span class="sb-value small">${formatMoney(team.finance.payroll)}</span></div>
        <div class="sb-row"><span class="sb-label">聯盟奢侈稅門檻</span><span class="sb-value small">${formatMoney(taxThreshold)}</span></div>
      </div>
      ${(typeof payBreakdownHtml === "function") ? payBreakdownHtml(team, S.players) : ""}

      <div class="divlabel">球迷三維度（他們不下令，但他們施壓）</div>
      <div class="scoreboard">
        <div class="sb-row"><span class="sb-label">${icon('chart-up')} 期待值${(S.fanExpect||50)>=75?"（王朝詛咒·門檻已升高）":""}</span><span class="sb-value small">${Math.round(S.fanExpect||50)} / 100</span></div>
        <div class="sb-row"><span class="sb-label">${icon('hourglass')} 耐心（老闆耐心乘數）</span><span class="sb-value small">${Math.round(S.fanPatience||60)} / 100</span></div>
        <div class="sb-row"><span class="sb-label">${icon('heart')} 認同（票房·贊助·FA意願·主場）</span><span class="sb-value small">${Math.round(S.fanIdentify||55)} / 100</span></div>
      </div>
      <div class="sb-row"><span class="sb-label">${icon('book-open')} 數據素養${(S.fanDataLiteracy||8)>=50?"（球迷已能讀懂進階數據）":(S.fanDataLiteracy||8)>=25?"（論壇開始討論 OPS+）":""}</span><span class="sb-value small">${Math.round(S.fanDataLiteracy||8)} / 100</span></div>
      ${Array.isArray(S.fanTradeMemory)&&S.fanTradeMemory.length>0?`<div class="sb-row"><span class="sb-label">${icon('ghost')} 交易記憶（球迷還記得）</span><span class="sb-value small">${S.fanTradeMemory.slice(0,3).map(m=>m.name+"（"+m.yearsLeft+"年）").join("、")}</span></div>`:""}
      </div>
      <p class="draftnote muted">期待越高、未達標時球迷越不滿；耐心低會放大老闆對戰績失利的扣分；認同由「球迷認得的傳統數據明星與在地子弟兵」撐起——送走門面球員會重挫認同。數據素養隨年份演進：早年球迷不看 wRC+（Moneyball 被罵），晚年球迷會在論壇貼 Framing Runs（你的孤獨是你的護城河）。</p>

      <div class="divlabel">球隊文化（你十年行為的沉澱）</div>
      <div class="scoreboard">
        <div class="sb-row"><span class="sb-label">${icon('leaf')} 文化標籤</span><span class="sb-value small">${(typeof v55CultureLabelHtml === "function") ? v55CultureLabelHtml((S.culture && S.culture.labels) || []) : "中庸"}</span></div>
        ${(S.culture && S.culture.history && S.culture.history.length >= 3) ? `
        <div class="sb-row"><span class="sb-label">${icon('users')} 自家子弟兵比例</span><span class="sb-value small">${Math.round((S.culture.scores.rookieDev || 0) * 100)}%</span></div>
        <div class="sb-row"><span class="sb-label">${icon('coin')} FA支出占薪資帽</span><span class="sb-value small">${Math.round((S.culture.scores.faBigSpend || 0) * 100)}%</span></div>
        <div class="sb-row"><span class="sb-label">${icon('shield-check')} 教練需求兌現率</span><span class="sb-value small">${Math.round((S.culture.scores.trust || 0) * 100)}%</span></div>
        ` : '<div class="sb-row"><span class="sb-label muted">需累積至少3年行為紀錄才會顯示文化傾向</span></div>'}
      </div>

      <div class="divlabel">城市（${team.city || "—"}）</div>
      <div class="scoreboard">
        ${(S.cityState && S.cityState[S.userTeamId]) ? `
        <div class="sb-row"><span class="sb-label">${icon('building')} 人口規模（票房基底）</span><span class="sb-value small">${Math.round(S.cityState[S.userTeamId].population)} / 100</span></div>
        <div class="sb-row"><span class="sb-label">${icon('chart-line')} 經濟活力（贊助上限）</span><span class="sb-value small">${Math.round(S.cityState[S.userTeamId].economy)} / 100</span></div>
        <div class="sb-row"><span class="sb-label">${icon('heart-handshake')} 球迷世代（耐心根基）</span><span class="sb-value small">${Math.round(S.cityState[S.userTeamId].fanGen)} / 100</span></div>
        ` : '<div class="sb-row"><span class="sb-label muted">城市資料載入中</span></div>'}
      </div>
      <p class="draftnote muted">城市每年極緩演化：人口受球隊影響微幅成長、經濟隨機波動、球迷世代隨連年勝績深化。贏得夠久，城市會變成你的。</p>

      <div class="divlabel">本季預估損益（依目前人氣/戰績/已簽合約估算，非最終數字）</div>
      <table class="stattable">
        <thead><tr><th>項目</th><th>預估金額</th></tr></thead>
        <tbody>
          <tr><td>預估門票收入（均進場約${forecast.projectedAttendance.toLocaleString()}人）</td><td>${formatMoney(forecast.ticketRevenue)}</td></tr>
          <tr><td>轉播收入${team.finance.broadcastDeal ? `（已簽${typeof team.finance.broadcastDeal === "object" ? team.finance.broadcastDeal.label : "定額約"}，依目前勝率估）` : "（預設估算，尚未簽約）"}</td><td>${formatMoney(forecast.broadcastRevenue)}</td></tr>
          <tr><td>贊助收入${team.finance.sponsorDeal ? `（已簽${typeof team.finance.sponsorDeal === "object" ? team.finance.sponsorDeal.label : "定額約"}，依目前勝率估）` : "（預設估算，尚未簽約）"}</td><td>${formatMoney(forecast.sponsorRevenue)}</td></tr>
          <tr><td>周邊/販賣部收入（主場人次×人均消費）</td><td>${formatMoney(forecast.merchRevenue)}</td></tr>
          <tr><td>客場贏球分潤收入（贏抽8%・輸抽2%）</td><td>${formatMoney(forecast.gateShareIncome)}</td></tr>
          <tr class="me"><td>預估總收入</td><td>${formatMoney(forecast.totalRevenue)}</td></tr>
          <tr><td>目前薪資支出</td><td>${formatMoney(forecast.payroll)}</td></tr>
          <tr><td>球場設施維護費</td><td>${formatMoney(forecast.maintenanceCost)}</td></tr>
          <tr><td>支付客隊分潤</td><td>${formatMoney(forecast.gateSharePaid)}</td></tr>
          <tr><td>預估奢侈稅</td><td>${formatMoney(forecast.luxuryTax)}</td></tr>
          <tr class="me"><td>預估淨損益</td><td style="${forecast.projectedNet < 0 ? "color:var(--redline);" : ""}">${forecast.projectedNet >= 0 ? "+" : ""}${formatMoney(forecast.projectedNet)}</td></tr>
        </tbody>
      </table>
      ${forecast.projectedNet < 0 ? `<p class="sub dark" style="color:var(--redline);">目前估算本季可能虧損，建議提早調整票價策略或洽談轉播/贊助合約，不要等到季末才發現。</p>` : ""}`;
  const finTicketPanel = `
      <div class="divlabel">票價策略</div>
      <p class="sub dark" style="margin-bottom:10px;">${canChangeTicket ? "現在是春訓期間，可以調整票價。票價越高單張收入越高，但會降低進場意願（進場意願比例落在100%~50%之間）；票價只能在每季開打前（春訓期間）調整一次。" : "本季已經開打，票價要等下個休賽季開幕前（春訓期間）才能再調整。"}</p>
      <div class="scoreboard">
        <div class="sb-row small"><div class="sb-label">目前票價</div><div class="sb-value small">${team.finance.ticketPrice} 元／張</div></div>
        <div class="sb-row small"><div class="sb-label">目前票價上限</div><div class="sb-value small">${team.finance.ticketPriceCap} 元（最終上限 ${TICKET_PRICE_CEIL_MAX} 元）</div></div>
        <div class="sb-row small"><div class="sb-label">預估進場成數</div><div class="sb-value small">約 ${estimateAttendancePct(team, team.finance.ticketPrice)}%</div></div>
      </div>
      <p class="draftnote muted">若本季票價已開在上限附近仍場場爆滿，隔年球團會評估調高票價上限（最終不超過${TICKET_PRICE_CEIL_MAX}元）。</p>
      <div class="teamgrid">
        ${TICKET_PRICE_PRESETS.map(t => `
          <button class="teamcard ticket-tier-btn" data-tier="${t.key}" style="${team.finance.ticketPrice === Math.min(t.price, team.finance.ticketPriceCap) ? "border:2px solid var(--gold-2);" : ""}" ${(canChangeTicket && t.price <= team.finance.ticketPriceCap) ? "" : "disabled"}>
            <b>${t.label}</b><br>${t.price} 元/張・約${estimateAttendancePct(team, t.price)}%進場
          </button>`).join("")}
      </div>
      <label class="field" style="margin-top:10px;">
        <span>自訂票價（元，上限 ${team.finance.ticketPriceCap}）</span>
        <input id="in-custom-ticket" type="number" min="${TICKET_PRICE_FLOOR}" max="${team.finance.ticketPriceCap}" placeholder="輸入金額，AI會估算進場成數" ${canChangeTicket ? "" : "disabled"} />
      </label>
      ${canChangeTicket ? `<div class="btnrow"><button id="btn-custom-ticket" class="btn-secondary">套用自訂票價</button></div>` : ""}`;
  const finDealsPanel = `
      ${["broadcast", "sponsor"].map(kind => {
        // v29：轉播/贊助方案卡——保證金＋浮動條款＋三情境試算全部攤開，看懂再簽
        const offers = kind === "broadcast" ? team.finance.broadcastOffers : team.finance.sponsorOffers;
        const cur = kind === "broadcast" ? team.finance.broadcastDeal : team.finance.sponsorDeal;
        const curKey = cur && typeof cur === "object" ? cur.key : null;
        return `
      <div class="divlabel">${kind === "broadcast" ? "轉播" : "贊助"}合約（每年可重新洽談）</div>
      <p class="sub dark" style="margin-bottom:10px;">${canChangeTicket ? "三種方案的差別在「保證金 vs 浮動條款」的比例：越積極的方案基本盤越薄、但戰績好時拿越多。點開試算表比較後再簽；不簽就沿用預設估算金額。" : `本季${kind === "broadcast" ? "轉播" : "贊助"}合約已鎖定，要等下個休賽季開幕前才能重談。`}</p>
      ${offers.map(o => `
        <div class="card dealcard ${curKey === o.key ? "dealchosen" : ""}">
          <div class="eyebrow">${o.label}${curKey === o.key ? "（本季已簽）" : ""}</div>
          <p class="sub dark" style="margin:4px 0;">${o.desc}</p>
          <div class="scoreboard" style="margin:6px 0;">
            <div class="sb-row small"><div class="sb-label">保證金（穩拿）</div><div class="sb-value small">${formatMoney(o.base)}</div></div>
            <div class="sb-row small"><div class="sb-label">戰績分潤</div><div class="sb-value small">${o.winBonusPer10 ? `勝率每±10%，${kind === "broadcast" ? "分潤" : "獎金"}±${formatMoney(o.winBonusPer10)}` : "無（定額合約）"}</div></div>
            <div class="sb-row small"><div class="sb-label">季後賽加碼</div><div class="sb-value small">${o.playoffBonus ? formatMoney(o.playoffBonus) : "無"}</div></div>
            ${dealScenarioTable(o)}
          </div>
          ${canChangeTicket ? `<div class="btnrow"><button class="btn-secondary deal-btn" data-kind="${kind}" data-id="${o.id}">${curKey === o.key ? "已簽此方案" : `簽下${o.label}`}</button></div>` : ""}
        </div>`).join("")}`;
      }).join("")}`;
  const finReportPanel = `
      ${report ? `
      <div class="divlabel">上季收支報告（第${report.year}年）</div>
      <table class="stattable">
        <thead><tr><th>項目</th><th>金額</th></tr></thead>
        <tbody>
          <tr><td>門票收入（主場${report.homeGames || "?"}場・均進場約${report.avgAttendance.toLocaleString()}人）</td><td>${formatMoney(report.ticketRevenue)}</td></tr>
          <tr><td>轉播收入</td><td>${formatMoney(report.broadcastRevenue)}</td></tr>
          <tr><td>贊助收入</td><td>${formatMoney(report.sponsorRevenue)}</td></tr>
          <tr><td>周邊/販賣部收入（主場總人次約${(report.homeVisitors || 0).toLocaleString()}）</td><td>${formatMoney(report.merchRevenue)}</td></tr>
          ${typeof report.gateShareIncome === "number" ? `<tr><td>客場贏球分潤收入</td><td>${formatMoney(report.gateShareIncome)}</td></tr>` : ""}
          <tr class="me"><td>總收入</td><td>${formatMoney(report.totalRevenue)}</td></tr>
          <tr><td>球員/教練/球探薪資支出</td><td>${formatMoney(report.payroll)}</td></tr>
          ${typeof report.maintenanceCost === "number" ? `<tr><td>球場設施維護費</td><td>${formatMoney(report.maintenanceCost)}</td></tr>` : ""}
          ${typeof report.gateSharePaid === "number" ? `<tr><td>支付客隊分潤</td><td>${formatMoney(report.gateSharePaid)}</td></tr>` : ""}
          <tr><td>選秀簽約金支出（選秀當下已扣除）</td><td>${formatMoney(report.signingBonusSpent)}</td></tr>
          <tr><td>奢侈稅（門檻 ${formatMoney(report.taxThreshold)}）</td><td>${formatMoney(report.luxuryTax)}</td></tr>
          <tr class="me"><td>淨損益</td><td>${report.net >= 0 ? "+" : ""}${formatMoney(report.net)}</td></tr>
        </tbody>
      </table>
      <p class="draftnote muted">結算後預算：${formatMoney(report.budgetAfter)}；人氣變化後：${report.popularityAfter}；當季票價：${report.ticketPrice}元${report.capRaised ? `（因上座踴躍，票價上限已調高至${report.ticketPriceCapAfter}元！）` : ""}${report.homeRecord ? `；上季主場 ${report.homeRecord.w}勝${report.homeRecord.l}敗／客場 ${report.awayRecord.w}勝${report.awayRecord.l}敗` : ""}</p>
      ` : `<p class="sub dark">尚無歷史收支報告，完成第一個球季後會在這裡顯示。</p>`}

      ${foldNote(`<p class="sub dark" style="margin-top:14px;">收入來源說明：門票收入採「逐場實結」——每個主場依當時進場率×票價入帳；客隊贏球可抽該場門票8%（輸球2%），主隊反向支付。周邊/販賣部收入＝主場總進場人次×人均消費，人均消費受球場格位設施（消費/體驗類）與行銷加成影響，舒適類設施則直接提升進場率。薪資支出依球員目前能力與年齡估算市場身價，教練/球探維持既有合約金額；若隊內薪資總額超過聯盟平均的1.3倍，球季結束將被課徵超出部分50%的奢侈稅。</p>`)}`;
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar"><div class="eyebrow">${team.name} ・ ${cal.dateLabel}</div><h1>財務</h1></div>
      ${renderRosterNav("finance")}
      ${UI.flash ? `<div class="flash">${UI.flash}</div>` : ""}
      ${uiTabs("finance", [
        { key: "overview", label: ""+icon('chart')+" 總覽", badge: warns.length || 0, html: finOverviewPanel },
        { key: "ticket", label: ""+icon('ticket')+" 票價", html: finTicketPanel },
        { key: "deals", label: ""+icon('screen')+" 合約", html: finDealsPanel },
        { key: "report", label: ""+icon('scroll')+" 上季報告", html: finReportPanel }
      ])}
      <div class="btnrow"><button id="btn-back" class="btn-outline">返回</button></div>
    </div>`;
  app.querySelectorAll(".ticket-tier-btn").forEach(btn => {
    btn.onclick = () => setTicketPreset(btn.dataset.tier);
  });
  const customBtn = document.getElementById("btn-custom-ticket");
  if (customBtn) customBtn.onclick = () => setCustomTicketPrice(document.getElementById("in-custom-ticket").value);
  app.querySelectorAll(".deal-btn").forEach(btn => {
    btn.onclick = () => chooseDeal(btn.dataset.kind, Number(btn.dataset.id));
  });
  document.getElementById("btn-back").onclick = () => { UI.screen = "dashboard"; render(); };
  wireRosterNav();
}


/* ====================================================================
   v25 春訓系統：選秀會結束、球季開幕前的固定階段。
   規則（Mars定案）：
   - 春訓地點＝40國任選（母國青雲國免費、海外依國家等級收費 S 4000萬→D 700萬）
   - 整個球團（1軍＋2軍）前往同一國家
   - 1軍與2軍皆有「AI一鍵自動建議」與「逐人手動指定」兩種操作
   - 每位球員選1個訓練項目；成效＝基礎1~2＋國家專長1~3＋教練加成≤2＋設施加成≤2（單項合計≤+5、不超過潛力天花板）
   - 海外春訓隨機發生1~2個特殊事件（好壞約7:3，越高級的國家好事機率越高；S/A/B級才有完整事件池）
   ==================================================================== */
const SPRING_MENU_PITCHER = [
  { key: "pVelocity", label: "球速球威" },
  { key: "pBreaking", label: "變化控球" },
  { key: "pStamina", label: "體力" },
  { key: "pComposure", label: "抗壓" }
];
const SPRING_MENU_BATTER = [
  { key: "bContact", label: "打擊" },
  { key: "bPower", label: "長打" },
  { key: "bBunt", label: "觸擊" },
  { key: "bSpeed", label: "速度盜壘" },
  { key: "bDefense", label: "守備臂力" },
  { key: "bEye", label: "選球" },
  { key: "bComposure", label: "抗壓" },
  { key: "bStamina", label: "體力" }
];
const SPRING_MENU_LABEL = {};
SPRING_MENU_PITCHER.concat(SPRING_MENU_BATTER).forEach(m => { SPRING_MENU_LABEL[m.key] = m.label; });
// 春訓項目 → 教練專長類別、訓練設施項目 對照
const SPRING_COACH_CAT = { pVelocity: "pitching", pBreaking: "pitching", pStamina: "conditioning", pComposure: "leadership", bContact: "batting", bPower: "batting", bBunt: "batting", bSpeed: "running", bDefense: "infield_d", bEye: "batting", bComposure: "leadership", bStamina: "conditioning" };
const SPRING_FACILITY_KEY = { pVelocity: "pitchVelocity", pBreaking: "pitchBreaking", pStamina: null, pComposure: "composure", bContact: "batContact", bPower: "batPower", bBunt: "bunting", bSpeed: "baserunning", bDefense: "defense", bEye: "batEye", bComposure: "composure", bStamina: null };

function springMenuFor(p) { return p.isPitcher ? SPRING_MENU_PITCHER : SPRING_MENU_BATTER; }

// AI建議：挑該球員「相對最弱、且有成長價值」的項目
function springSuggestMenu(p) {
  if (p.isPitcher) {
    const opts = [["pVelocity", p.velocity], ["pBreaking", p.control], ["pStamina", p.stamina], ["pComposure", p.composure]];
    opts.sort((a, b) => a[1] - b[1]);
    return opts[0][0];
  }
  const opts = [["bContact", p.contact], ["bPower", p.power], ["bBunt", p.bunting || 45], ["bSpeed", (p.speed + p.steal) / 2], ["bDefense", (p.fielding + p.arm) / 2], ["bEye", p.eye], ["bComposure", p.composure], ["bStamina", p.stamina]];
  opts.sort((a, b) => a[1] - b[1]);
  return opts[0][0];
}

function prepareSpringCamp() {
  const team = S.teams[S.userTeamId];
  const assignments = {};
  team.roster1.concat(team.roster2).forEach(id => {
    const p = S.players[id];
    if (p) assignments[id] = springSuggestMenu(p); // 預設先帶入AI建議，玩家可逐人改
  });
  S.springCamp = { year: S.seasonYear, nation: HOME_NATION_NAME, assignments, executed: false, report: null };
  generateSponsorMission(); // v25：新球季贊助商任務同步產生（春訓期間即可查看）
}

function setSpringNation(name) {
  if (!S.springCamp || S.springCamp.executed) return;
  const nation = nationByName(name);
  if (!nation) return;
  // v29（Mars定案）：海外春訓只開放B級以上國家——C/D級國家的訓練環境與設施不足以支撐職業球團移地訓練
  if (name !== HOME_NATION_NAME && ["C", "D"].includes(nation.grade)) {
    UI.flash = `${nation.name} 為${nation.grade}級國家，訓練環境不足以承接職業球團春訓；海外春訓僅開放B級以上國家（母國不受限）。`;
    render();
    return;
  }
  S.springCamp.nation = name;
  render();
}
function setSpringAssignment(pid, key) {
  if (!S.springCamp || S.springCamp.executed) return;
  S.springCamp.assignments[pid] = key;
  persist();
}
function springAutoAssign(level) {
  const team = S.teams[S.userTeamId];
  const ids = level === "1軍" ? team.roster1 : team.roster2;
  ids.forEach(id => { const p = S.players[id]; if (p) S.springCamp.assignments[id] = springSuggestMenu(p); });
  UI.flash = `已為${level}全員套用AI建議訓練項目。`;
  persist();
  render();
}

function springSpecialtyGain(nation, key) {
  if (!nation.specialties.includes(key)) return 0;
  if (nation.grade === "S") return randInt(2, 3);
  if (nation.grade === "A") return randInt(1, 3);
  if (nation.grade === "B") return randInt(1, 2);
  return 1;
}

// 套用單一球員的春訓成效，回傳異動明細（供逐人報告）
function applySpringTraining(p, team, nation, key) {
  const base = randInt(1, 2);
  const spec = springSpecialtyGain(nation, key);
  const coachB = team ? Math.min(2, Math.round(clamp(specificCoachBonus(team, p.level, SPRING_COACH_CAT[key] || "leadership"), 0, 0.5) * 5)) : 0;
  const fk = SPRING_FACILITY_KEY[key];
  const facB = (team && fk) ? Math.min(2, Math.round(trainingLevel(team, fk) * 0.4)) : 0;
  const traitB = hasTrait(p, "grinder") ? 1 : 0;
  const gain = Math.min(5, base + spec + coachB + facB + traitB);
  const cap = (cur) => Math.min(clamp(cur + gain, 20, 95), Math.max(cur, p.potential)); // 不超過潛力天花板（已超過者維持不降）
  const capHalf = (cur, g) => Math.min(clamp(cur + g, 20, 95), Math.max(cur, p.potential));
  const changes = [];
  const rec = (label, before, after) => { if (after !== before) changes.push({ label, from: before, to: after }); };
  if (key === "pVelocity") {
    const b = p.velocity; p.velocity = cap(p.velocity); rec("球速", b, p.velocity);
    p.pitches.forEach(pt => { const bs = pt.stuff; pt.stuff = capHalf(pt.stuff, Math.ceil(gain / 2)); if (pt.stuff !== bs) changes.push({ label: `${pt.type}威力`, from: bs, to: pt.stuff, linked: true }); });
  } else if (key === "pBreaking") {
    const b = p.control; p.control = cap(p.control); rec("控球", b, p.control);
    p.pitches.forEach(pt => { const bc = pt.control, bs = pt.stuff; pt.control = capHalf(pt.control, Math.ceil(gain / 2)); pt.stuff = capHalf(pt.stuff, Math.floor(gain / 2)); if (pt.control !== bc) changes.push({ label: `${pt.type}控球`, from: bc, to: pt.control, linked: true }); if (pt.stuff !== bs) changes.push({ label: `${pt.type}威力`, from: bs, to: pt.stuff, linked: true }); });
  } else if (key === "pStamina" || key === "bStamina") {
    const b = p.stamina; p.stamina = cap(p.stamina); rec("體力", b, p.stamina);
  } else if (key === "pComposure" || key === "bComposure") {
    const b = p.composure; p.composure = cap(p.composure); rec("抗壓", b, p.composure);
  } else if (key === "bContact") {
    const b = p.contact; p.contact = cap(p.contact); rec("接觸", b, p.contact);
    const bl = p.vsL, br = p.vsR;
    p.vsL = capHalf(p.vsL, Math.ceil(gain / 2)); p.vsR = capHalf(p.vsR, Math.ceil(gain / 2));
    if (p.vsL !== bl) changes.push({ label: "對左投", from: bl, to: p.vsL, linked: true });
    if (p.vsR !== br) changes.push({ label: "對右投", from: br, to: p.vsR, linked: true });
  } else if (key === "bPower") {
    const b = p.power; p.power = cap(p.power); rec("長打", b, p.power);
  } else if (key === "bBunt") {
    const b = p.bunting; p.bunting = cap(p.bunting); rec("觸擊", b, p.bunting);
  } else if (key === "bSpeed") {
    const b1 = p.speed; p.speed = cap(p.speed); rec("速度", b1, p.speed);
    const b2 = p.steal; p.steal = capHalf(p.steal, Math.ceil(gain * 0.7)); if (p.steal !== b2) changes.push({ label: "盜壘", from: b2, to: p.steal, linked: true });
  } else if (key === "bDefense") {
    const b1 = p.fielding; p.fielding = cap(p.fielding); rec("守備", b1, p.fielding);
    const b2 = p.arm; p.arm = capHalf(p.arm, Math.ceil(gain * 0.7)); if (p.arm !== b2) changes.push({ label: "臂力", from: b2, to: p.arm, linked: true });
  } else if (key === "bEye") {
    const b = p.eye; p.eye = cap(p.eye); rec("選球", b, p.eye);
  }
  // v29特性連動提升（Mars指定）：春訓不只主練項目——其他能力也會依球員特性相對提升。
  // 練習狂必得1項連動+1；23歲以下年輕人60%機率、其他30%機率再得1項。
  // 連動項目在「非主練、還沒到天花板」的屬性中挑：觸擊職人偏好觸擊、導師/大賽型偏好抗壓，其餘隨機。
  const spillCount = (hasTrait(p, "grinder") ? 1 : 0) + ((Math.random() < (p.age <= 23 ? 0.6 : 0.3)) ? 1 : 0);
  if (spillCount > 0) {
    const mainAttr = { pVelocity: "velocity", pBreaking: "control", pStamina: "stamina", pComposure: "composure", bContact: "contact", bPower: "power", bEye: "eye", bSpeed: "speed", bDefense: "fielding", bBunt: "bunting", bStamina: "stamina", bComposure: "composure" }[key];
    const candAttrs = (p.isPitcher ? ["velocity", "control", "stamina", "composure"] : ["contact", "power", "eye", "speed", "fielding", "arm", "bunting", "composure"])
      .filter(a => a !== mainAttr && p[a] < Math.max(p[a], p.potential) && p[a] < p.potential);
    const ATTR_LABEL = { velocity: "球速", control: "控球", stamina: "體力", composure: "抗壓", contact: "接觸", power: "長打", eye: "選球", speed: "速度", fielding: "守備", arm: "臂力", bunting: "觸擊" };
    for (let i = 0; i < spillCount && candAttrs.length > 0; i++) {
      let a;
      if (hasTrait(p, "buntpro") && candAttrs.includes("bunting")) a = "bunting";
      else if ((hasTrait(p, "mentor") || hasTrait(p, "biggame")) && candAttrs.includes("composure")) a = "composure";
      else a = choice(candAttrs);
      candAttrs.splice(candAttrs.indexOf(a), 1);
      const before = p[a];
      p[a] = Math.min(clamp(p[a] + 1, 20, 95), p.potential);
      if (p[a] !== before) changes.push({ label: ATTR_LABEL[a], from: before, to: p[a], linked: true, traitSpill: true });
    }
  }
  return changes;
}

// 海外春訓特殊事件池（S/A/B級完整8種；C/D級僅基本2種）
function rollSpringEvents(team, nation) {
  const events = [];
  const count = randInt(1, 2);
  const goodChance = { S: 0.8, A: 0.75, B: 0.7, C: 0.6, D: 0.55 }[nation.grade];
  const fullPool = ["friendlyWin", "media", "sponsorGift", "fanTrip", "eliteFriendship", "youngEyes"];
  const basicGood = ["friendlyWin", "media"];
  const badPool = ["homesick", "overtrain"];
  for (let i = 0; i < count; i++) {
    const good = Math.random() < goodChance;
    const pool = good ? (NATION_GRADE_ORDER[nation.grade] <= 2 ? fullPool : basicGood) : badPool;
    const type = choice(pool);
    events.push(applySpringEvent(team, nation, type));
  }
  return events.filter(Boolean);
}
function randomCampPlayers(team, n, filter) {
  const pool = team.roster1.concat(team.roster2).map(id => S.players[id]).filter(p => p && (!filter || filter(p)));
  return shuffle(pool).slice(0, n);
}
function applySpringEvent(team, nation, type) {
  ensureFinance(team);
  if (type === "friendlyWin") {
    team.finance.popularity = clamp(team.finance.popularity + 2, 10, 99);
    randomCampPlayers(team, 3).forEach(p => { p.condition = clamp((p.condition || 0) + 1, -2, 2); });
    return { type, text: `與${nation.name}當地強隊的交流賽獲勝！球隊人氣+2，數名球員帶著絕佳手感回國（狀況↑）。` };
  }
  if (type === "media") {
    team.finance.popularity = clamp(team.finance.popularity + 3, 10, 99);
    return { type, text: `${nation.name}媒體大幅報導本隊移地訓練，知名度大開！球隊人氣+3。` };
  }
  if (type === "sponsorGift") {
    const amt = randInt(500, 1500) * 10000;
    team.finance.budget += amt;
    return { type, text: `當地球探與企業對本隊讚譽有加，追加贊助金 ${formatMoney(amt)}！` };
  }
  if (type === "fanTrip") {
    team.finance.popularity = clamp(team.finance.popularity + 2, 10, 99);
    return { type, text: `大批球迷跨海朝聖春訓基地，凝聚力大增！球隊人氣+2。` };
  }
  if (type === "eliteFriendship") {
    S.nationFriendship = { nation: nation.name, untilYear: S.seasonYear + 1 };
    const lv = (typeof addNationBond === "function") ? addNationBond(nation.name, 3) : 0; // v38④：名門友誼同時灌注長期友好度+3
    return { type, text: `與${nation.name}棒球名門結下深厚友誼！明年國際市場將多1個獨家名額，且必有一位${nation.name}菁英人選；與${nation.name}友好度+3（${lv}／${NATION_BOND_MAX}・${nationBondLabel(lv)}）。` };
  }
  if (type === "youngEyes") {
    const young = randomCampPlayers(team, 2, p => p.age <= 23);
    young.forEach(p => { p.potential = clamp(p.potential + 1, 24, 93); });
    return young.length ? { type, text: `${young.map(p => p.name).join("、")} 在${nation.name}見識到世界級水準，眼界大開（潛力+1）！` } : null;
  }
  if (type === "homesick") {
    const hit = randomCampPlayers(team, randInt(2, 4));
    hit.forEach(p => { p.condition = clamp((p.condition || 0) - 1, -2, 2); });
    return { type, text: `部分球員在${nation.name}水土不服：${hit.map(p => p.name).join("、")} 開季狀況下滑（狀況↓）。` };
  }
  if (type === "overtrain") {
    const hit = randomCampPlayers(team, 1, p => !isInjured(p));
    if (hit.length === 0) return null;
    const p = hit[0];
    const days = randInt(3, 6);
    p.injury = { name: "訓練過度輕微拉傷", severity: "light", severityLabel: "輕度", daysLeft: days, totalDays: days };
    return { type, text: `${p.name} 春訓操練過度出現輕微拉傷，開季約缺陣 ${days} 天。` };
  }
  return null;
}

// AI球隊春訓（簡化）：預算充裕的隊伍有機會出國，全員套用建議項目、不生成報告
/* v30 AI球團設施投資：每年春訓期執行一次。
   關鍵設計——AI的營運預算長期接近收支平衡（甚至赤字），若從中扣設施費會排擠簽援/補強、
   破壞v27~v29平衡好的AI經濟。因此改用「隔離的設施發展額度」：AI每年獲得一筆專款（facilityFund），
   只能用於球場升級與設施建造，完全不影響 finance.budget（簽援/交易/補強的錢）。
   - 每年注資：4億 × 個性投資傾向（豪購/賭性1.3、精算1.1、重建/養成1.0、保守0.7、人情1.0）
   - 升級球場等級：facilityFund ≥ 升級費才升（每年最多1級）
   - 建造格位設施：facilityFund ≥ 建設費才建，每年最多2座；個性決定選型偏好 */
const AI_FACILITY_FUND_BASE = 140000000; // v31平衡②：4億→1.4億，放慢AI建設速度
const AI_FACILITY_FUND_MULT = { splash: 1.55, gambler: 1.55, analytics: 1.2, rebuild: 1.05, farm: 1.05, human: 1.0, conservative: 0.95 };
function ensureFacilityFund(team) {
  ensureFacility(team);
  if (typeof team.facility.fund !== "number") team.facility.fund = 0;
}
function aiPickStadiumFacility(team, fund) {
  const spendKeys = ["vendor", "food", "drink", "vip", "flagship", "beer", "screen"];
  const comfortKeys = ["toilet", "parking", "nursing", "kidzone", "museum"];
  const persona = team.persona || "";
  let pool;
  if (persona === "splash" || persona === "gambler") pool = spendKeys;
  else if (persona === "conservative" || persona === "farm") pool = comfortKeys;
  else if (persona === "analytics") {
    const affordable = STADIUM_FACILITY_TYPES.filter(t => fund >= t.cost && t.spendPct > 0);
    if (affordable.length > 0) return affordable.sort((a, b) => (b.spendPct / b.cost) - (a.spendPct / a.cost))[0];
    pool = spendKeys.concat(comfortKeys);
  } else pool = spendKeys.concat(comfortKeys);
  const candidates = pool.map(k => stadiumFacilityType(k)).filter(t => t && fund >= t.cost);
  return candidates.length > 0 ? choice(candidates) : null;
}
const AI_RENOVATION_BASE = 13000000; // v31：蓋滿後年度翻新預算基準（1300萬×個性倍率，沙盒調校鎖定：長期完備度地板≈88%、Δ≈10%）
const AI_FACILITY_FUND_CAP = 800000000; // v31：隔離發展金囤積上限8億（>6.8億最貴升級，不至卡死升Lv7）
function aiStadiumFullyBuilt(team) {
  return team.facility.level >= FACILITY_LEVELS[FACILITY_LEVELS.length - 1].level
    && team.facility.stadiumSlots.length >= stadiumSlotCount(team);
}
// 找出最該重建的老舊設施索引（優先重建原建設費最高者，回本效益最大）
function aiPickAgedSlot(team) {
  ensureStadiumSlots(team);
  let best = -1, bestCost = -1;
  team.facility.stadiumSlots.forEach((key, i) => {
    if (!stadiumSlotAged(team, i)) return;
    const t = stadiumFacilityType(key);
    if (t && t.cost > bestCost) { bestCost = t.cost; best = i; }
  });
  return best;
}
function runAiFacilityInvestments() {
  Object.values(S.teams).forEach(team => {
    if (team.isUser) return;
    ensureFinance(team); ensureFacility(team); ensureStadiumSlots(team); ensureFacilityFund(team);
    const mult = AI_FACILITY_FUND_MULT[team.persona] || 1.0;
    // 注入本年度隔離設施發展金：未蓋滿＝建設模式（1.4億×倍率）；已蓋滿＝翻新模式（1200萬×倍率）
    const inject = aiStadiumFullyBuilt(team)
      ? Math.round(AI_RENOVATION_BASE * mult)
      : Math.round(AI_FACILITY_FUND_BASE * mult);
    team.facility.fund = Math.min(team.facility.fund + inject, AI_FACILITY_FUND_CAP);
    // ① 重建老舊設施（每年最多1座，優先重建最貴者）
    const agedIdx = aiPickAgedSlot(team);
    if (agedIdx >= 0) {
      const t = stadiumFacilityType(team.facility.stadiumSlots[agedIdx]);
      const rc = Math.round(t.cost * STADIUM_REBUILD_COST);
      if (team.facility.fund >= rc) { team.facility.fund -= rc; team.facility.slotBuilt[agedIdx] = S.seasonYear; }
    }
    // ② 升級球場等級（每年最多1級）
    const next = FACILITY_LEVELS.find(f => f.level === team.facility.level + 1);
    if (next && team.facility.fund >= next.upgradeCost) {
      team.facility.fund -= next.upgradeCost;
      team.facility.level = next.level;
    }
    // ③ 建造格位設施（每年最多1座）
    if (team.facility.stadiumSlots.length < stadiumSlotCount(team)) {
      const pick = aiPickStadiumFacility(team, team.facility.fund);
      if (pick) {
        team.facility.fund -= pick.cost;
        team.facility.stadiumSlots.push(pick.key);
        pushStadiumSlotBuilt(team);
      }
    }
  });
}

/* v31聯盟均衡稅：每年一次，抑制豪門球場無限領先、避免弱隊永久落後。
   - AI：完備度≥95% 且 隔離發展金>1.5億 → 課走超過1.5億部分的50%，匯入均衡池（只動發展金，不碰營運預算）。
   - 玩家（對稱但溫和）：完備度≥90% 且 營運預算>6億 → 繳(預算−6億)×12%（單年上限2億），匯入同一均衡池。
   - 均衡池平分給「全聯盟完備度最低4支」球隊（AI進發展金／玩家進營運預算）。
   玩家的收/支由財務報表明列（settleSeasonFinance 折入 net），AI則直接調整發展金。 */
const BALANCE_TAX_PLAYER_FLOOR = 600000000;   // 玩家繳稅門檻：營運預算>6億
const BALANCE_TAX_PLAYER_RATE = 0.12;
const BALANCE_TAX_PLAYER_CAP = 200000000;     // 玩家單年繳稅上限2億
const BALANCE_TAX_PLAYER_COMPLETE = 0.90;
const BALANCE_TAX_AI_FLOOR = 150000000;       // AI繳稅門檻：發展金>1.5億
const BALANCE_TAX_AI_RATE = 0.50;
const BALANCE_TAX_AI_COMPLETE = 0.95;
const BALANCE_SUBSIDY_TEAMS = 4;
function runLeagueBalanceTax() {
  ensureAllFinance();
  const teams = Object.values(S.teams);
  teams.forEach(t => { ensureFacilityFund(t); t.finance.balanceTaxPaid = 0; t.finance.balanceTaxReceived = 0; });
  // 完備度排名，取最低4支為補貼對象
  const ranked = teams.map(t => ({ t, c: stadiumCompleteness(t) })).sort((a, b) => a.c - b.c);
  const recipients = ranked.slice(0, BALANCE_SUBSIDY_TEAMS).map(x => x.t);
  const recipientSet = new Set(recipients.map(t => t.id));
  let pool = 0;
  teams.forEach(t => {
    const c = stadiumCompleteness(t);
    if (t.isUser) {
      if (c >= BALANCE_TAX_PLAYER_COMPLETE && t.finance.budget > BALANCE_TAX_PLAYER_FLOOR) {
        const tax = Math.min(Math.round((t.finance.budget - BALANCE_TAX_PLAYER_FLOOR) * BALANCE_TAX_PLAYER_RATE), BALANCE_TAX_PLAYER_CAP);
        t.finance.balanceTaxPaid = tax; // 由 settleSeasonFinance 折入營運預算（報表明列）
        pool += tax;
      }
    } else {
      if (c >= BALANCE_TAX_AI_COMPLETE && t.facility.fund > BALANCE_TAX_AI_FLOOR) {
        const tax = Math.round((t.facility.fund - BALANCE_TAX_AI_FLOOR) * BALANCE_TAX_AI_RATE);
        t.facility.fund -= tax; // AI只動隔離發展金
        pool += tax;
      }
    }
  });
  if (pool > 0 && recipients.length > 0) {
    const share = Math.round(pool / recipients.length);
    recipients.forEach(t => {
      if (t.isUser) t.finance.balanceTaxReceived = share; // 由 settleSeasonFinance 折入營運預算
      else t.facility.fund += share;                       // AI直接進發展金
    });
  }
  S.lastBalancePool = pool; // 供除錯/報表
  return { pool, recipientIds: [...recipientSet] };
}

function runAiSpringCamps() {
  Object.values(S.teams).forEach(team => {
    if (team.isUser) return;
    ensureFinance(team);
    let nation = nationByName(HOME_NATION_NAME);
    if (team.finance.budget > 300000000 && Math.random() < 0.35) {
      const candidates = NATIONS.filter(n => n.name !== HOME_NATION_NAME && NATION_GRADE_ORDER[n.grade] <= 2);
      const pick = choice(candidates);
      const cost = springCostForNation(pick) * 10000;
      if (team.finance.budget >= cost) { nation = pick; team.finance.budget -= cost; }
    }
    team.roster1.concat(team.roster2).forEach(id => {
      const p = S.players[id];
      if (p) applySpringTraining(p, team, nation, springSuggestMenu(p));
    });
  });
}

function executeSpringCamp() {
  const camp = S.springCamp;
  if (!camp || camp.executed) return;
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  const nation = nationByName(camp.nation) || nationByName(HOME_NATION_NAME);
  const cost = springCostForNation(nation) * 10000;
  if (cost > 0 && team.finance.budget < cost) {
    UI.flash = `預算不足：前往${nation.name}春訓需要 ${formatMoney(cost)}，目前預算 ${formatMoney(team.finance.budget)}。請改選其他國家（母國免費）。`;
    render();
    return;
  }
  if (cost > 0) team.finance.budget -= cost;
  // 逐人套用訓練成效
  const report = { nation: nation.name, grade: nation.grade, cost, lines: [], events: [] };
  ["roster1", "roster2"].forEach(rk => {
    team[rk].forEach(id => {
      const p = S.players[id];
      if (!p) return;
      const key = camp.assignments[id] || springSuggestMenu(p);
      const changes = applySpringTraining(p, team, nation, key);
      report.lines.push({ name: p.name, level: p.level, menu: SPRING_MENU_LABEL[key], changes });
    });
  });
  // 特質造成的開季狀況
  team.roster1.concat(team.roster2).forEach(id => {
    const p = S.players[id];
    if (!p) return;
    if (hasTrait(p, "faststart")) p.condition = clamp(Math.max(p.condition || 0, 1), -2, 2);
    if (hasTrait(p, "slowstart")) p.condition = clamp(Math.min(p.condition || 0, -1), -2, 2);
  });
  // 海外特殊事件
  if (nation.name !== HOME_NATION_NAME) {
    report.events = rollSpringEvents(team, nation);
    report.events.forEach(ev => { if (typeof pushNews === "function") pushNews("春訓", ev.text); });
  }
  if (typeof pushNews === "function") pushNews("春訓", nation.name === HOME_NATION_NAME ? `球團於母國完成春季訓練，全員狀態調整完畢。` : `球團遠征${nation.name}完成移地春訓（${formatMoney(cost)}）。`);
  runAiSpringCamps();
  runAiFacilityInvestments(); // v30 AI球團設施升級/建造
  camp.executed = true;
  camp.report = report;
  S.springCampDoneYear = S.seasonYear;
  UI.screen = "springReport";
  persist();
  render();
}

/* ====================================================================
   v25 贊助商任務：每季開季由主贊助商提出1個目標，季末達成領取獎金（1000~3000萬）。
   ==================================================================== */
function generateSponsorMission() {
  const team = S.teams[S.userTeamId];
  const totalGames = S.schedule ? S.schedule.length : 126;
  const pool = [
    { key: "wins", target: randInt(60, 72), reward: randInt(1500, 2500) * 10000, label: t => `本季拿下 ${t} 勝以上` },
    { key: "playoffs", target: 1, reward: randInt(2000, 3000) * 10000, label: () => `本季打進季後賽` },
    { key: "teamHR", target: randInt(90, 130), reward: randInt(1200, 2200) * 10000, label: t => `全隊合計敲出 ${t} 支全壘打` },
    { key: "teamSB", target: randInt(70, 110), reward: randInt(1000, 1800) * 10000, label: t => `全隊合計盜壘成功 ${t} 次` },
    { key: "attendance", target: randInt(62, 75), reward: randInt(1500, 2500) * 10000, label: t => `主場平均進場率達 ${t}% 以上` }
  ];
  const m = choice(pool);
  S.sponsorMission = { year: S.seasonYear, key: m.key, target: m.target, reward: m.reward, label: m.label(m.target), settled: false, totalGames };
}
function sponsorMissionProgress() {
  const m = S.sponsorMission;
  if (!m || m.year !== S.seasonYear) return null;
  const team = S.teams[S.userTeamId];
  let current = 0;
  if (m.key === "wins") current = team.wins;
  else if (m.key === "playoffs") current = (S.playoffs && S.playoffs.qualifiedTeamIds && S.playoffs.qualifiedTeamIds.includes(team.id)) ? 1 : 0;
  else if (m.key === "teamHR") current = team.roster1.concat(team.roster2).map(id => S.players[id]).filter(Boolean).reduce((a, p) => a + (p.seasonStats.HR || 0), 0);
  else if (m.key === "teamSB") current = team.roster1.concat(team.roster2).map(id => S.players[id]).filter(Boolean).reduce((a, p) => a + (p.seasonStats.SB || 0), 0);
  else if (m.key === "attendance") current = Math.round(teamAttendanceRate(team) * 100);
  return { current, target: m.target, done: current >= m.target };
}
function evaluateSponsorMission() {
  const m = S.sponsorMission;
  if (!m || m.year !== S.seasonYear || m.settled) return null;
  const prog = sponsorMissionProgress();
  m.settled = true;
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  if (prog && prog.done) {
    team.finance.budget += m.reward;
    if (typeof pushNews === "function") pushNews("贊助", `達成贊助商任務「${m.label}」！獲得獎金 ${formatMoney(m.reward)}。`);
    return { achieved: true, label: m.label, reward: m.reward, current: prog.current, target: m.target };
  }
  if (typeof pushNews === "function") pushNews("贊助", `贊助商任務「${m.label}」未達成（${prog ? prog.current : 0}/${m.target}），本季獎金落空。`);
  return { achieved: false, label: m.label, reward: m.reward, current: prog ? prog.current : 0, target: m.target };
}
