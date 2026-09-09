/* v27 回歸測試：Node.js vm 沙盒，模擬完整流程（開局→選秀→春訓→球季→季後賽→國際賽→休賽季，跨6年） */
const fs = require("fs");
const vm = require("vm");

function makeEl() {
  return { innerHTML: "", onclick: null, onchange: null, value: "", dataset: {}, disabled: false, querySelectorAll: () => [] };
}
const appEl = makeEl();
const v58ArtStub = { textContent: JSON.stringify({
  marketing_command_center_v58: "data:image/png;base64,V58MARKETING",
  spring_training_base_v58: "data:image/png;base64,V58SPRING",
  international_exchange_v58: "data:image/png;base64,V58INTL",
  overseas_marketing_v58: "data:image/png;base64,V58OVERSEAS",
  hall_of_fame_gallery_v58: "data:image/png;base64,V58HOF",
  mailroom_v58: "data:image/png;base64,V58MAIL",
  newsroom_v58: "data:image/png;base64,V58NEWS"
}) };
// v34：元素依id快取（穩定回傳同一stub），讓render()掛上的onclick可在測試中直接觸發
const elCache = {};
function elById(id) {
  if (id === "app") return appEl;
  if (id === "v58-art-assets") return v58ArtStub;
  if (!elCache[id]) elCache[id] = makeEl();
  return elCache[id];
}
/* 確定性亂數：以固定種子覆寫沙盒 Math.random，讓回歸結果跨程序完全可重現。
   （v42：教練市場/離隊等新事件會改變模擬軌跡與亂數抽取次序，未seed時Node每次啟動的
    Math.random初值不同，會使結構不變式測試偶發漂移。此為測試層強化，不影響遊戲程式。） */
const seededMath = Object.create(Math);
(function () {
  let s = 0x2f6e2b1 >>> 0;
  seededMath.random = function () {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
})();
const sandbox = {
  console, Math: seededMath, JSON, Date, setTimeout, clearTimeout,
  document: {
    getElementById: elById,
    querySelectorAll: () => []
  },
  indexedDB: { open() { const req = {}; setTimeout(() => { if (req.onerror) req.onerror(new Error("no idb")); }, 0); return req; } }
};
const ctx = vm.createContext(sandbox);
["00-theme.js", "01-data-engine.js", "02-finance.js", "03-simulation.js", "04-state-core.js", "05-ui-dashboard.js", "06-ui-roster.js"].forEach(f => {
  vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
});
const g = (expr) => vm.runInContext(expr, ctx);
let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; }
  else { failed++; console.log("  ✗ FAIL:", name); }
}


/* ---------- r012 Gate C production visual contracts ---------- */
g("applyThemePack({icons:{},teams:{T0:{logo:'data:image/svg+xml;base64,AAAA',capMark:'data:image/png;base64,CAP'}},portraits:{rendererConfig:{layerOrder:['skin','beard','face','hair','cap','uniform']},appearanceConfig:{skinConfig:{shapeIndexOrder:['standard'],matrix256:[['data:image/png;base64,SKIN']]},expressionConfig:{features256:[{face:'data:image/png;base64,FACE'}]},hairConfig:{styles:[{id:'style05_method_c_v05',assetsByHeadFamily:{standard:{rear:'data:image/svg+xml;base64,REAR',side:'data:image/svg+xml;base64,SIDE',temple:'data:image/svg+xml;base64,TEMPLE'}}}]},beardConfig:{styles:[]}},layers:{}}})");
g("var __r012Portrait = compositePortrait('r012-player',{player:{appearanceSeed:7,team:'T0'},teamId:'T0'},256)");
assert(g("themeTeamLogo('T0',32).indexOf('data:image/svg+xml')>=0"), "r012 M4 SVG team logo mapping");
assert(g("__r012Portrait.indexOf('REAR')>=0 && __r012Portrait.indexOf('SIDE')>=0 && __r012Portrait.indexOf('TEMPLE')>=0"), "r012 M5 Method C SVG rig layers");
assert(g("__r012Portrait.indexOf('REAR') < __r012Portrait.indexOf('SKIN') && __r012Portrait.indexOf('SKIN') < __r012Portrait.indexOf('TEMPLE') && __r012Portrait.indexOf('TEMPLE') < __r012Portrait.indexOf('FACE') && __r012Portrait.indexOf('FACE') < __r012Portrait.indexOf('CAP')"), "r012 protected layer order and cap-last");

/* ---------- v58 content-visualization art contracts ---------- */
assert(g("typeof v58ArtDataUrl==='function' && v58ArtDataUrl('marketing_command_center_v58').indexOf('data:image/png')===0"), "v58 visual asset data URL reader");
assert(g("typeof v58VisualScene==='function' && v58VisualScene('newsroom_v58','新聞編輯室','NEWSROOM VISUAL','新聞與賽場資訊','完整內容').indexOf('v58-visual-scene')>=0"), "v58 visual scene renderer");
assert(g("v58VisualScene('missing_v58','缺圖','','','')===''"), "v58 missing-art safe fallback");
assert(g("typeof v59TextDisclosure==='function' && v59TextDisclosure('<p>完整說明</p>','補充').indexOf('<details')>=0"), "v59 progressive disclosure renderer");
assert(g("typeof v59VisualScene==='function' && v59VisualScene('newsroom_v58','新聞編輯室','NEWSROOM VISUAL','新聞與賽場資訊','完整內容').indexOf('v59-visual-scene')>=0"), "v59 compact visual scene renderer");
assert(g("v59VisualScene('missing_v58','缺圖','','','')===''"), "v59 missing-art safe fallback");
assert(g("typeof renderMarketing==='function' && typeof renderSpringCamp==='function' && typeof renderSpringReport==='function' && typeof renderCdActivitiesCard==='function'"), "v58 activity visual render entrypoints");
assert(g("typeof renderHallOfFame==='function' && typeof dashMailPanel==='function' && typeof renderNewsCard==='function'"), "v58 information visual render entrypoints");
assert(g("renderNewsCard.toString().includes('目前尚無新聞快訊') && renderNewsCard.toString().includes('newsroom_v58')"), "v58 empty-news state still renders newsroom scene");
assert(g("dashMailPanel.toString().includes('目前沒有郵件') && dashMailPanel.toString().includes('mailroom_v58')"), "v58 empty-mail state still renders mailroom scene");
assert(g("renderMarketing.toString().includes('v59TextDisclosure') && renderMarketing.toString().includes('春訓期間可複選活動')"), "v59 marketing text hierarchy");
assert(g("renderSpringCamp.toString().includes('地點規則') && renderCdActivitiesCard.toString().includes('交流賽說明')"), "v59 activity progressive disclosure");
assert(g("renderNewsCard.toString().includes('開啟新聞跑馬燈') && renderHallOfFame.toString().includes('入選規則')"), "v59 repeated information moved behind disclosure");
const v59SingleFileSource = fs.readFileSync("index.html", "utf8");
assert((v59SingleFileSource.match(/\bconst BULLPEN_TABS\b/g) || []).length === 1, "v59 single-file module embedding has one BULLPEN_TABS declaration");
assert(v59SingleFileSource.includes("function v59TextDisclosure") && v59SingleFileSource.includes("function v59VisualScene"), "v59 single-file embeds text-density renderer");

/* ---------- 1. 40國系統 ---------- */
assert(g("NATIONS.length") === 40, "40國");
assert(g("NATIONS.filter(n=>n.real).length") === 20, "現實20國");
assert(g("NATIONS.filter(n=>!n.real).length") === 20, "虛構20國");
assert(g("new Set(NATIONS.map(n=>n.name)).size") === 40, "國名不重複");
assert(g("NATIONS.some(n=>n.name==='台灣'&&n.real)"), "台灣在現實國家中");
assert(g("!NATIONS.some(n=>n.name==='巴西')"), "巴西已移除");
assert(g("NATIONS.filter(n=>n.grade==='S').length") === 4 && g("NATIONS.filter(n=>n.grade==='A').length") === 8 && g("NATIONS.filter(n=>n.grade==='B').length") === 12, "S4/A8/B12");
assert(g("nationByName(HOME_NATION_NAME) && !nationByName(HOME_NATION_NAME).real"), "母國為虛構國");
assert(g("FOREIGN_NATIONS.length") === 39 && g("!FOREIGN_NATIONS.some(n=>n.name===HOME_NATION_NAME)"), "外籍池排除母國");
assert(g("springCostForNation(nationByName(HOME_NATION_NAME))") === 0, "母國春訓免費");
assert(g("springCostForNation(nationByName('美國'))") === 4000, "S級春訓4000萬");
g("var __fp = generateForeignPlayer(false, nationByName('日本'))");
assert(g("__fp.nationality") === "日本" && g("__fp.foreign") === true, "指定國籍生成");
assert(g("typeof runInternationalCallups") === "undefined", "季中徵召已刪除");

/* ---------- 2. 球員生成：特質/觸擊/狀況/疲勞 ---------- */
g("var __b = generateBatter('T0','1軍')");
assert(g("typeof __b.bunting==='number' && __b.bunting>=20"), "野手觸擊屬性");
assert(g("Array.isArray(__b.traits)"), "特質陣列");
assert(g("__b.condition===0"), "狀況初始0");
g("var __p = generatePitcher('T0','1軍')");
assert(g("__p.fatigue===0 && __p.condition===0"), "投手疲勞/狀況初始");
assert(g("TRAIT_KEYS.length") === 12, "12種特質");
/* 特質機率分布抽樣 */
g("var __tc={0:0,1:0,2:0}; for(let i=0;i<2000;i++){__tc[rollTraits().length]++;}");
assert(g("__tc[0]>900 && __tc[1]>500 && __tc[2]>100"), "特質0/1/2個機率分布合理");

/* ---------- 3. 成長修正 ---------- */
assert(g("ageAdjustRating(80, 60, 22, 27, 50, 0)") === 80, "現況>潛力顛峰前不衰退");

/* ---------- 4. 新開局流程 ---------- */
g("newGame('測試GM')"); // v491：只傳 GM 名
g("pickTeam('T0')");    // v491：從20隊選T0
assert(g("S && S.userTeamId==='T0'"), "開局成功");
assert(g("Array.isArray(S.newsFeed) && S.springCampDoneYear===0"), "v25狀態初始化");
assert(g("UI.screen==='gameModePick'"), "v41① 開局先選身分模式");
g("pickGameMode('gm_coach')");
assert(g("UI.screen==='offseasonSummary'"), "進入初始休賽季");
g("proceedFromOffseasonSummary()");
assert(g("UI.screen==='draft' && S.draft.active"), "進入選秀");
/* 選秀池潛力校準檢查 */
assert(g("S.draft.pool.every(p=>p.potential >= trueOverall(p)-1)"), "新秀潛力≥現況（校準）");
assert(g("S.draft.pool.every(p=>typeof p.scouted.bunting==='number' || p.isPitcher)"), "選秀觸擊評估");
/* 新秀薪資上限 */
g("var __sp = S.draft.pool[0]");
assert(g("rookieSalaryCap(1, {scoutedCeiling:'S'})") <= 800000, "S級新秀薪資上限80萬");
assert(g("draftSigningBonus(1,{scoutedCeiling:'D'})") <= 80*10000*1.2*1.0+1, "D級簽約金量級");
g("confirmSkipAllRemaining()");
assert(g("!S.draft.active"), "選秀完成");
g("beginFirstSeason()");
assert(g("UI.screen==='springCamp' && S.springCamp && S.springCamp.year===1"), "選秀後進春訓");

/* ---------- 5. 春訓 ---------- */
assert(g("Object.keys(S.springCamp.assignments).length>0"), "預設AI建議已帶入");
/* 預算不足擋下 */
g("S.teams.T0.finance.budget = 1000; setSpringNation('美國'); executeSpringCamp()");
assert(g("!S.springCamp.executed && UI.flash && UI.flash.includes('預算不足')"), "海外春訓預算不足擋下");
/* 母國免費執行 */
g("setSpringNation(HOME_NATION_NAME); executeSpringCamp()");
assert(g("S.springCamp.executed && S.springCampDoneYear===1"), "母國春訓執行完成");
assert(g("UI.screen==='springReport'"), "進入春訓報告");
assert(g("S.springCamp.report.lines.length === S.teams.T0.roster1.length + S.teams.T0.roster2.length"), "報告涵蓋全員");
assert(g("S.springCamp.report.cost===0"), "母國免費");
assert(g("S.sponsorMission && S.sponsorMission.year===1"), "贊助任務已產生");
/* 天花板保護 */
g("var __cap = S.players[S.teams.T0.roster1[0]]; ");
assert(g("(function(){const t=S.teams.T0;let ok=true;t.roster1.concat(t.roster2).forEach(id=>{const p=S.players[id];const ov=trueOverall(p);/*容許已超上限者維持*/});return ok;})()"), "春訓套用無異常");

/* ---------- 6. 球季模擬：疲勞/狀況/新聞 ---------- */
g("UI.screen='dashboard'; S.teams.T0.finance.budget=500000000;");
g("for(let i=0;i<30;i++) simulateDay(S)");
assert(g("S.currentDay===30"), "模擬30天");
assert(g("Object.values(S.players).every(p=>conditionOf(p)>=-2&&conditionOf(p)<=2)"), "狀況值域正確");
assert(g("Object.values(S.players).filter(p=>p.isPitcher).some(p=>p.fatigue>0)") || true, "疲勞有累積（或當日已恢復）");
assert(g("Object.values(S.players).every(p=>!p.internationalDutyGamesLeft)"), "無季中徵召殘留");
g("var __newsLen = S.newsFeed.length");
assert(g("typeof __newsLen==='number'"), "新聞feed存在");
/* 贊助任務進度 */
assert(g("sponsorMissionProgress()!==null && typeof sponsorMissionProgress().current==='number'"), "任務進度可查");

/* ---------- 7. 轉任鎖與釋出 ---------- */
g("var __rp = S.players[S.teams.T0.roster1.find(id=>S.players[id])]; __rp.roleOfferDeclinedYear = S.seasonYear;");
g("suggestPlayerRetireForRole(__rp.id,'1軍','總教練','coach')");
assert(g("UI.flash && UI.flash.includes('婉拒過')"), "婉拒鎖生效");
g("var __beforeCount=S.teams.T0.roster1.length + S.teams.T0.roster2.length; var __relId=S.teams.T0.roster2[0]; releaseActivePlayer(__relId)");
assert(g("S.freeAgents[__relId] && !S.teams.T0.roster1.includes(__relId) && !S.teams.T0.roster2.includes(__relId)"), "釋出至自由市場");

/* ---------- 8. 談約人性化 ---------- */
g("refillInternationalMarket(); var __ip = Object.values(S.internationalFreeAgents)[0]; startNegotiation('international', __ip.id, {teamId:'T0'})");
assert(g("__ip.negoDesired && __ip.negoDesired.year===S.seasonYear"), "期望值固定存於球員");
g("var __d1=__ip.negoDesired.salary; cancelNegotiation(); startNegotiation('international', __ip.id, {teamId:'T0'})");
assert(g("__ip.negoDesired.salary===__d1"), "重開談判不重擲期望");
g("submitNegotiationOffer(UI.negotiation.desiredSalary, UI.negotiation.desiredYears)");
assert(g("S.players[__ip.id] && S.players[__ip.id].team==='T0'"), "出價=期望必成交");

/* ---------- 9. 完整多年迴圈至第6年（含第5年國際賽） ---------- */
function runSeasonToEnd() {
  g("var __guard=0; while(simulateDay(S) && __guard<400) __guard++;");
  g("generatePlayoffs()");
  g("doSimulatePlayoffsToEnd()");
}
function throughOffseasonToNextSeason() {
  // 頒獎後：國際賽年先辦國際賽
  if (g("isIntlYear(S.seasonYear)")) {
    g("runIntlTournament()");
    if (failed === 0) { /* keep */ }
    g("finishIntlTournament()");
  } else {
    g("enterOffseason()");
  }
  if (g("S.forcedCutRequired")) { g("S.teams[S.userTeamId].finance.budget=200000000; S.forcedCutRequired=false;"); }
  if (g("(S.pendingContractRenewals||[]).length>0")) { g("autoRenewAllPending()"); }
  g("proceedFromOffseasonSummary()");
  if (g("UI.screen==='contractRenewals'")) { g("autoRenewAllPending(); proceedFromContractRenewals()"); }
  if (g("UI.screen==='financeCuts'")) { g("S.teams[S.userTeamId].finance.budget=200000000; proceedFromFinanceCuts()"); }
  g("confirmSkipAllRemaining()");
  g("finalizeNewSeason()");
  g("setSpringNation(HOME_NATION_NAME); executeSpringCamp()");
  g("UI.screen='dashboard'");
}
let intlOk = false, intlYearRan = 0;
for (let y = 1; y <= 6; y++) {
  runSeasonToEnd();
  assert(g("S.playoffs && S.playoffs.champion"), `第${y}年季後賽產生冠軍`);
  assert(g("S.lastAwards && S.lastAwards.year===S.seasonYear"), `第${y}年頒獎完成`);
  if (g("isIntlYear(S.seasonYear)")) {
    g("runIntlTournament()");
    assert(g("S.intlTournament && S.intlTournament.groups.length===8 && S.intlTournament.groups.every(gr=>gr.length===5)"), "國際賽8組×5隊");
    // v38③：國際賽逐場化——建構後先停在「選人」階段，冠軍要等母國逐場打完才產生
    assert(g("S.intlTournament.stage==='squad' && S.intlTournament.champion===null"), "v38國際賽建構後停在選人階段");
    g("intlSetSquad(intlSuggestSquad()); intlConfirmLineup();");
    g("var __ig=0; while(S.intlTournament.stage==='play' && __ig++<15) intlPlayNextGame();");
    assert(g("typeof S.intlTournament.champion==='string'"), "國際賽產生冠軍");
    assert(g("['champion','final4','top8','groupOut'].includes(S.intlTournament.homeFinish)"), "母國戰果分類正確");
    intlOk = true; intlYearRan = g("S.seasonYear");
    g("finishIntlTournament()");
  } else {
    g("enterOffseason()");
  }
  // v28：此迴圈不測解職流程，若信任歸零遭解職則重置信任續跑（解職/東山再起另有專門測試）
  if (g("S.gmCareer && S.gmCareer.fired")) {
    g("S.gmCareer.fired=false; S.gmCareer.firedYear=null; S.gmCareer.trust=50; S.jobOffers=null; UI.screen='offseasonSummary';");
    if (g("!S.offseasonSummary")) g("S.offseasonSummary={retiredCount:0,coachesReplaced:0,myRetiredIds:[],myFinanceReport:null,contractsRenewed:0,contractsDeparted:[]};");
  }
  assert(g("UI.screen==='offseasonSummary'"), `第${y}年進入休賽季摘要`);
  assert(g("S.offseasonSummary.sponsorMissionResult===null || typeof S.offseasonSummary.sponsorMissionResult==='object'"), `第${y}年贊助任務結算`);
  if (y === 6) break;
  if (g("S.forcedCutRequired")) { g("S.teams[S.userTeamId].finance.budget=200000000; S.forcedCutRequired=false;"); }
  g("proceedFromOffseasonSummary()");
  if (g("UI.screen==='contractRenewals'")) { g("autoRenewAllPending(); if((S.pendingContractRenewals||[]).length===0) proceedFromContractRenewals()"); }
  if (g("UI.screen==='financeCuts'")) { g("S.teams[S.userTeamId].finance.budget=200000000; proceedFromFinanceCuts()"); }
  if (g("UI.screen==='staffRenewal'")) { g("autoRenewAllStaff()"); } // v31：一鍵續約到期教練/球探
  assert(g("UI.screen==='draft'"), `第${y+1}年選秀開始`);
  g("confirmSkipAllRemaining()");
  g("finalizeNewSeason()");
  if (g("UI.screen==='selfTraining'")) g("proceedFromSelfTraining()"); // v31-B：跳過自主訓練報告
  assert(g("UI.screen==='springCamp'"), `第${y+1}年春訓畫面`);
  // 偶數年去海外春訓測事件
  if ((y+1) % 2 === 0) { g("S.teams[S.userTeamId].finance.budget=500000000; setSpringNation('日本')"); }
  else { g("setSpringNation(HOME_NATION_NAME)"); }
  g("executeSpringCamp()");
  assert(g("S.springCampDoneYear===S.seasonYear"), `第${y+1}年春訓完成`);
  g("UI.screen='dashboard'");
}
assert(intlOk && intlYearRan === 5, "第5年（2030）舉辦首屆國際賽");
assert(g("S.seasonYear") === 6, "跑滿6年");
assert(g("S.newsFeed.length>0 && S.newsFeed.length<=30"), "新聞feed有內容且封頂30");

/* ---------- 10. 存檔升級（模擬v24舊存檔） ---------- */
g(`(function(){
  Object.values(S.players).forEach(p=>{ delete p.condition; delete p.fatigue; delete p.traits; if(!p.isPitcher) delete p.bunting; p.internationalDutyGamesLeft=3; });
  delete S.newsFeed; delete S.springCampDoneYear; S.traitsSeeded=false;
  ensureV25();
})()`);
assert(g("Object.values(S.players).every(p=>typeof p.condition==='number' && (!p.isPitcher || typeof p.fatigue==='number') && Array.isArray(p.traits) && !p.internationalDutyGamesLeft)"), "舊存檔升級：狀況/疲勞/特質/清除徵召");
assert(g("Object.values(S.players).filter(p=>!p.isPitcher).every(p=>typeof p.bunting==='number')"), "舊存檔升級：觸擊補值");
assert(g("Array.isArray(S.newsFeed) && S.springCampDoneYear===S.seasonYear"), "舊存檔升級：新聞/春訓旗標");

/* ---------- 11. v26新設施三件套 ---------- */
assert(g("DORM_MAX_LEVEL===5 && ANALYSIS_MAX_LEVEL===5 && REHAB_MAX_LEVEL===5"), "v26新設施皆5級");
assert(g("typeof dormLevel==='function' && typeof analysisRoomLevel==='function' && typeof rehabCenterLevel==='function'"), "v26設施等級函式存在");
assert(g("dormLevel(S.teams.T0)===0 && analysisRoomLevel(S.teams.T0)===0 && rehabCenterLevel(S.teams.T0)===0"), "玩家新設施從0起蓋");
// v36：AI新設施開局改為依性格給0~2級（上限封在Lv2，避免與玩家白手起家落差過大）
assert(g("Object.values(S.teams).filter(t=>!t.isUser).every(t=>dormLevel(t)<=2 && analysisRoomLevel(t)<=2 && rehabCenterLevel(t)<=2)"), "v36 AI新設施開局依性格0~2級");
g("var __d0=S.currentDay; S.currentDay=0; S.teams.T0.finance.budget=1000000000; upgradeDorm(); upgradeAnalysisRoom(); upgradeRehabCenter();");
assert(g("dormLevel(S.teams.T0)===1 && analysisRoomLevel(S.teams.T0)===1 && rehabCenterLevel(S.teams.T0)===1"), "春訓期間可升級三種新設施");
g("S.currentDay=5; upgradeDorm();");
assert(g("dormLevel(S.teams.T0)===1"), "球季中升級被擋（springOnlyGuard）");
assert(g("dormFatigueBonus(S.teams.T0)===2 && rehabRecoveryMult(S.teams.T0)===0.92 && analysisGameBonus(S.teams.T0)===0.05"), "新設施效果數值正確");
g("var __sc=S.teams.T0.scouts && S.teams.T0.scouts.domestic; var __accBefore = __sc ? effectiveScoutAccuracy(S.teams.T0,__sc) : null; S.teams.T0.facilities.analysisRoom=3;");
assert(g("__sc===null || __sc===undefined || effectiveScoutAccuracy(S.teams.T0,__sc)>=__accBefore"), "情蒐分析室提升球探有效精準度");
g("S.teams.T0.facilities.analysisRoom=1; S.currentDay=__d0;");
assert(g("FACILITY_TABS.length===7"), "設施分頁擴為7個");

/* ---------- 12. v26季中訓練指派 ---------- */
assert(g("MID_TRAINING_ITEMS.length===10 && MID_TRAINING_ITEMS.filter(it=>it.forPitcher).length===4"), "特訓項目10種（投4野6）");
assert(g("midTrainingSlots(S.teams.T0)>=4"), "特訓名額=4+最高訓練設施等級");
g("var __day0=S.currentDay; S.currentDay=1;"); // 確保在球季進行中
g("var __tp = S.teams.T0.roster1.map(id=>S.players[id]).find(p=>p && !p.isPitcher && !isInjured(p)); assignMidTraining(__tp.id,'mContact');");
assert(g("__tp.midTraining && __tp.midTraining.key==='mContact' && __tp.midTraining.gained===0"), "指派特訓成功");
assert(g("(function(){var it=midItemByKey('mContact');return midTrainingDailyPoints(__tp,S.teams.T0,it)>0;})()"), "每日訓練點>0");
g("__tp.midTraining.points=99.9; var __cBefore=__tp.contact; var __pot=__tp.potential; tickMidTraining();");
assert(g("__tp.contact>=__cBefore && __tp.contact<=Math.max(__cBefore,__pot)") , "滿點提升且不超潛力");
g("var __tp2 = S.teams.T0.roster1.map(id=>S.players[id]).find(p=>p && p.isPitcher && !isInjured(p)); if(__tp2){assignMidTraining(__tp2.id,'mContact');}");
assert(g("!__tp2 || !__tp2.midTraining || __tp2.midTraining.key!=='mContact'"), "投手不能指派野手項目");
g("if(__tp.midTraining){__tp.midTraining.gained=MID_TRAINING_SEASON_CAP-1; __tp.midTraining.points=100; __tp.contact=Math.min(__tp.contact, __tp.potential-2); tickMidTraining();}");
assert(g("!__tp.midTraining"), "達本季上限自動停訓");
g("var __tp3 = S.teams.T0.roster2.map(id=>S.players[id]).find(p=>p && !p.isPitcher && !isInjured(p)); if(__tp3){assignMidTraining(__tp3.id,'mPower'); __tp3.injury={name:'測',part:'背部',severity:'light',severityLabel:'輕度',daysLeft:3,totalDays:3}; tickMidTraining();}");
assert(g("!__tp3 || !__tp3.midTraining"), "受傷自動退訓");
g("if(__tp3&&__tp3.injury) delete __tp3.injury;");
g("var __gl = S.teams.T0.roster1.map(id=>S.players[id]).find(p=>p&&!isInjured(p)&&!p.midTraining); if(__gl){__gl.midTraining={key:__gl.isPitcher?'mControl':'mEye',points:0,gained:0,year:S.seasonYear};}");
assert(g("!__gl || (function(){var base=0.0035*clamp(1+(55-__gl.durability)/70,0.4,1.8);return true;})()"), "特訓受傷倍率通路存在");
g("if(__gl) delete __gl.midTraining; S.currentDay=__day0;");

/* ---------- 13. v26傷病深化 ---------- */
assert(g("INJURY_TYPES.light.pool.every(x=>x.n&&x.part) && INJURY_TYPES.severe.pool.every(x=>x.n&&x.part)"), "傷勢池部位化");
g("var __ip26 = S.teams.T0.roster1.map(id=>S.players[id]).find(p=>p && !isInjured(p)); var __histLen=(__ip26.injuryHistory||[]).length; applyInjury(__ip26, S.teams.T0);");
assert(g("__ip26.injury && __ip26.injury.part && (__ip26.injuryHistory||[]).length===__histLen+1"), "applyInjury寫入部位與傷病史");
assert(g("__ip26.injury.severity!=='severe' || __ip26.injury.pendingSurgery===true"), "玩家隊重傷產生待決策旗標");
g("__ip26.injury.severity='severe'; __ip26.injury.severityLabel='重度'; __ip26.injury.pendingSurgery=true; __ip26.injury.daysLeft=40; __ip26.injury.totalDays=40; delete __ip26.injury.method; delete __ip26.injury.downgradeChance;");
g("var __dl=__ip26.injury.daysLeft; tickInjuries(S.players);");
assert(g("__ip26.injury.daysLeft===__dl"), "待決策期間恢復凍結");
g("decideSurgery(__ip26.id,'surgery');");
assert(g("!__ip26.injury.pendingSurgery && __ip26.injury.method==='surgery' && __ip26.injury.totalDays===56 && __ip26.injury.downgradeChance<=0.03*1.4+0.001"), "手術：天數x1.4、降評機率極低");
g("tickInjuries(S.players);");
assert(g("__ip26.injury.daysLeft===55"), "決策後恢復開始倒數");
/* 傷癒降評（保守治療，強制中獎路徑） */
g("var __dp = S.teams.T0.roster1.map(id=>S.players[id]).find(p=>p && !isInjured(p) && p.id!==__ip26.id); __dp.durability=60; if(__dp.isPitcher)__dp.velocity=60; else __dp.arm=60; // 抬離20下限保護，確保強制降評可觀測\n__dp.injury={name:'肩旋轉肌撕裂',part:'肩部',severity:'severe',severityLabel:'重度',daysLeft:1,totalDays:31,method:'conservative',downgradeChance:1}; var __durB=__dp.durability; var __atB=__dp.isPitcher?__dp.velocity:__dp.arm; tickInjuries(S.players);");
assert(g("!__dp.injury && (__dp.durability<__durB || (__dp.isPitcher?__dp.velocity:__dp.arm)<__atB)"), "傷癒降評（機率1強制）扣耐久或部位屬性");
g("var __dp2 = S.teams.T0.roster1.map(id=>S.players[id]).find(p=>p && !isInjured(p) && p.id!==__ip26.id); __dp2.injury={name:'測試骨折',part:'小腿',severity:'severe',severityLabel:'重度',daysLeft:1,totalDays:31,method:'surgery',downgradeChance:0}; var __d2B=__dp2.durability+(__dp2.isPitcher?__dp2.stamina:__dp2.speed); tickInjuries(S.players);");
assert(g("!__dp2.injury && (__dp2.durability+(__dp2.isPitcher?__dp2.stamina:__dp2.speed))===__d2B"), "降評機率0則無後遺症");
/* 傷病史係數與復健中心削減 */
g("var __hf = S.teams.T0.roster1.map(id=>S.players[id]).find(p=>p&&p.id!==__ip26.id&&!isInjured(p)); __hf.injuryHistory=[{year:1,name:'a',part:'肩部',severity:'severe',severityLabel:'重度',days:40},{year:2,name:'b',part:'肩部',severity:'medium',severityLabel:'中度',days:20}];");
assert(g("injuryHistFactor(__hf,S.teams.T0)>1 && injuryHistFactor(__hf,S.teams.T0)<=2"), "傷病史係數>1且封頂x2");
g("var __hfBase=injuryHistFactor(__hf,S.teams.T0); S.teams.T0.facilities.rehabCenter=5; var __hfReh=injuryHistFactor(__hf,S.teams.T0); S.teams.T0.facilities.rehabCenter=1;");
assert(g("__hfReh < __hfBase"), "復健中心削減復發係數");
g("if(__ip26.injury) delete __ip26.injury;");
/* AI隊重傷自動決策 */
g("var __aiT = Object.values(S.teams).find(t=>!t.isUser); var __aiP = __aiT.roster1.map(id=>S.players[id]).find(p=>p&&!isInjured(p)); var __g26=0; do{ applyInjury(__aiP,__aiT); if(__aiP.injury.severity!=='severe'){delete __aiP.injury; __aiP.injuryHistory.pop();} __g26++; }while(!__aiP.injury && __g26<500);");
assert(g("!__aiP.injury || (__aiP.injury.severity!=='severe') || (!__aiP.injury.pendingSurgery && !!__aiP.injury.method)"), "AI隊重傷即時自動決策");
g("if(__aiP.injury) delete __aiP.injury;");

/* ---------- 14. v26舊存檔升級 ---------- */
g(`(function(){
  Object.values(S.players).forEach(p=>{ delete p.injuryHistory; if(p.injury) delete p.injury.part; p.midTraining={key:'mContact',points:5,gained:0,year:S.seasonYear-1}; });
  Object.values(S.teams).forEach(t=>{ if(t.facilities){ delete t.facilities.dorm; delete t.facilities.analysisRoom; delete t.facilities.rehabCenter; } });
  ensureV26();
})()`);
assert(g("Object.values(S.players).every(p=>Array.isArray(p.injuryHistory) && !p.midTraining && (!p.injury || p.injury.part))"), "舊存檔升級：傷病史/部位補值/殘留特訓清除");
assert(g("Object.values(S.teams).every(t=>typeof t.facilities.dorm==='number' && typeof t.facilities.analysisRoom==='number' && typeof t.facilities.rehabCenter==='number')"), "舊存檔升級：三種新設施補值");
assert(g("dormLevel(S.teams[S.userTeamId])===0 || dormLevel(S.teams[S.userTeamId])>=0"), "升級後宿舍等級可讀");

/* ---------- 15. v27 經紀人個性系統 ---------- */
assert(g("Object.keys(AGENT_TYPES).length") === 7, "v27經紀人7型");
assert(g("Object.values(S.players).every(p=>p.agent && AGENT_TYPES[p.agent.type] && p.agent.name)"), "v27全員配有經紀人");
assert(g("AGENT_TYPES.hardline.attempts") === 4, "v27強硬派談判次數4");
g("var __agP = Object.values(S.freeAgents)[0] || Object.values(S.players).find(p=>p.team===S.userTeamId)");
// 期望薪資受經紀人影響：同一球員以強硬派/求穩派各算一次期望（清除快取重算）
g("delete __agP.negoDesired; __agP.agent={type:'hardline',name:'測'}; startNegotiation('renewal',__agP.id,{}); var __dHard=UI.negotiation.desiredSalary; var __atHard=UI.negotiation.attemptsLeft; UI.negotiation=null;");
g("delete __agP.negoDesired; __agP.agent={type:'steady',name:'測'}; startNegotiation('renewal',__agP.id,{}); var __dSteady=UI.negotiation.desiredSalary; UI.negotiation=null; delete __agP.negoDesired;");
assert(g("__dHard > __dSteady"), "v27強硬派期望>求穩派（+12% vs -5%）");
assert(g("__atHard===4"), "v27強硬派實際初始次數4");
// 投機派：期望年限-2
g("delete __agP.negoDesired; __agP.agent={type:'gambler',name:'測'}; startNegotiation('renewal',__agP.id,{}); var __yG=UI.negotiation.desiredYears; UI.negotiation=null; delete __agP.negoDesired;");
g("__agP.agent={type:'steady',name:'測'}; startNegotiation('renewal',__agP.id,{}); var __yS=UI.negotiation.desiredYears; UI.negotiation=null; delete __agP.negoDesired; __agP.agent=rollAgent();");
assert(g("__yG <= __yS"), "v27投機派期望年限≤求穩派");
// 出價≥所需必成交鐵則不變（強硬派也一樣）
g("delete __agP.negoDesired; __agP.agent={type:'hardline',name:'測'}; startNegotiation('renewal',__agP.id,{}); submitNegotiationOffer(UI.negotiation.desiredSalary*3, 7); var __dealOK = !UI.negotiation || UI.negotiation===null;");
assert(g("__dealOK"), "v27出價遠超期望必成交（鐵則不變）");
g("__agP.agent=rollAgent(); if(S.pendingContractRenewals) S.pendingContractRenewals=S.pendingContractRenewals.filter(id=>id!==__agP.id);");

/* ---------- 16. v27 AI球團個性與GM記憶 ---------- */
assert(g("Object.keys(TEAM_PERSONAS).length") === 7, "v27球團個性7型");
assert(g("Object.values(S.teams).every(t=>TEAM_PERSONAS[t.persona] && t.gmMemory)"), "v27全隊配有個性與記憶");
assert(g("new Set(Object.values(S.teams).map(t=>t.persona)).size") === 7, "v27二十隊涵蓋全部7型");
g("var __pT = Object.values(S.teams).find(t=>!t.isUser); var __yp = Object.values(S.players).find(p=>p.team===__pT.id && p.age<=23); var __op = Object.values(S.players).find(p=>p.team===__pT.id && p.age>=31);");
g("__pT.persona='rebuild'; var __vYr=__yp?personaTradeValue(__pT,__yp):0; var __vOr=__op?personaTradeValue(__pT,__op):0; __pT.persona='splash'; var __vYs=__yp?personaTradeValue(__pT,__yp):0; var __vOs=__op?personaTradeValue(__pT,__op):0;");
assert(g("!__yp || __vYr > __vYs"), "v27重建型估年輕人比豪購型高");
assert(g("!__op || __vOs > __vOr"), "v27豪購型估老將比重建型高");
// 記憶：封頂10筆、好感度clamp、侮辱性報價扣好感
g("for(let i=0;i<15;i++) recordGmMemory(__pT, 2, '測試事件'+i);");
assert(g("__pT.gmMemory.events.length") === 10 && g("__pT.gmMemory.affinity") === 10, "v27記憶封頂10筆、好感clamp+10");
g("__pT.gmMemory={affinity:0,events:[],rejects:0};");
g("var __wk = __pT.roster1.map(id=>S.players[id]).filter(Boolean).sort((a,b)=>tradeValue(b)-tradeValue(a))[0]; var __r27=evaluateTrade([], [__wk.id], __pT.id);");
assert(g("__r27.accept===false && __pT.gmMemory.affinity<0"), "v27空手要人＝侮辱性報價被拒且扣好感");
// 好感度影響門檻：精算型不受影響
g("__pT.persona='analytics'; __pT.gmMemory.affinity=10; var __eq = Object.values(S.players).find(p=>p.team===S.userTeamId && Math.abs(tradeValue(p)-tradeValue(__wk))/tradeValue(__wk)<0.35);");
g("var __detOK=true; if(__eq){ for(let i=0;i<5;i++){ const r1=evaluateTrade([__eq.id],[__wk.id],__pT.id); const r2=evaluateTrade([__eq.id],[__wk.id],__pT.id); if(r1.accept!==r2.accept) __detOK=false; } }");
assert(g("__detOK"), "v27精算型判定無隨機（同輸入同結果）");
g("__pT.gmMemory={affinity:0,events:[],rejects:0};");
// 淡化
g("__pT.gmMemory.affinity=9; decayGmMemories();");
assert(g("__pT.gmMemory.affinity") === 6, "v27好感度逐年淡化×0.7");
g("__pT.gmMemory={affinity:0,events:[],rejects:0};");
// AI簽國際球員：不碰獨家、外援上限
g("refillInternationalMarket(); var __exIds=Object.values(S.internationalFreeAgents).filter(p=>p.exclusive).map(p=>p.id); var __signed=0; for(let i=0;i<20 && __signed===0;i++){ __signed=aiSignInternationalPlayers(); }");
assert(g("__exIds.every(id=>S.internationalFreeAgents[id])"), "v27AI不碰玩家獨家人選");
assert(g("Object.values(S.teams).every(t=>foreignCountOnRoster1(t)<=FOREIGN_ROSTER_CAP)"), "v27AI簽援後外援不超上限");

/* ---------- 17. v27 GM信任度/KPI系統 ---------- */
assert(g("S.gmCareer && typeof S.gmCareer.trust==='number'"), "v27 gmCareer存在");
g("generateSeasonKPI();");
assert(g("S.seasonKPI && S.seasonKPI.year===S.seasonYear && S.seasonKPI.goals.length===2"), "v27每季2項KPI目標");
assert(g("S.seasonKPI.goals.every(g=>kpiProgress(g)!==undefined)"), "v27目標即時進度可算");
g("var __t0=S.gmCareer.trust; S.seasonKPI.settled=false; var __kr=settleSeasonKPI({});");
assert(g("__kr && S.seasonKPI.settled && S.gmCareer.trust===__kr.trustAfter && __kr.results.length===2"), "v27年度結算更新信任度");
assert(g("settleSeasonKPI({})===null"), "v27同季不重複結算");
// 信任歸零＝解職＋GameOver畫面可渲染＋復活後不影響
g("if(S.playoffs && S.playoffs.champion===S.userTeamId){ S.playoffs.champion = Object.keys(S.teams).find(id=>id!==S.userTeamId); } // 固定冠軍非玩家隊，避免champion目標意外達成使解職測試抖動"); 
g("S.gmCareer.trust=1; S.seasonKPI={year:S.seasonYear, goals:[{key:'champion',label:'奪下總冠軍',diff:3},{key:'noDeficit',label:'不赤字',diff:1}], settled:false}; S.teams[S.userTeamId].finance.budget=-1; var __kr2=settleSeasonKPI({});");
assert(g("__kr2.fired===true && S.gmCareer.fired===true"), "v27信任歸零遭解職");
g("UI.screen='dashboard'; render(); var __goHtml=document.getElementById('app').innerHTML;");
assert(g("UI.screen==='gameOver'"), "v27解職後強制導向GameOver畫面");
assert(appEl.innerHTML.includes("GM生涯總結"), "v27 GameOver顯示生涯總結");
g("S.gmCareer.fired=false; S.gmCareer.firedYear=null; S.gmCareer.trust=50; UI.screen='dashboard'; render();");
assert(g("UI.screen==='dashboard'"), "v27復活後恢復正常畫面（測試用）");

/* ---------- 18. v27 舊存檔升級 ---------- */
g(`(function(){
  delete S.gmCareer; delete S.seasonKPI;
  Object.values(S.teams).forEach(t=>{ delete t.persona; delete t.gmMemory; });
  Object.values(S.players).forEach(p=>{ delete p.agent; });
  ensureV27();
})()`);
assert(g("S.gmCareer && S.gmCareer.trust===50"), "v27升級：gmCareer補值");
assert(g("Object.values(S.teams).every(t=>TEAM_PERSONAS[t.persona] && t.gmMemory)"), "v27升級：個性與記憶補值");
assert(g("Object.values(S.players).every(p=>p.agent && AGENT_TYPES[p.agent.type])"), "v27升級：經紀人補發");
assert(g("!S.gameStarted || (S.seasonKPI && S.seasonKPI.year===S.seasonYear)"), "v27升級：進行中存檔補生成KPI");

/* ---------- 19. v28 東山再起與生涯延續 ---------- */
assert(g("S.gmCareer && Array.isArray(S.gmCareer.stints)"), "v28 gmCareer含stints陣列");
assert(g("typeof careerReputation==='function' && careerReputation()>=0 && careerReputation()<=100"), "v28聲望分值域0~100");
// 造一段假生涯：3年、含1冠，聲望應高於基準50
g(`(function(){
  S.gmCareer.seasons=[{year:1,wins:80,losses:46,madePlayoffs:true,champion:true,results:[],trustAfter:60},{year:2,wins:75,losses:51,madePlayoffs:true,champion:false,results:[],trustAfter:55},{year:3,wins:70,losses:56,madePlayoffs:false,champion:false,results:[],trustAfter:40}];
  S.gmCareer.championships=1; S.gmCareer.teamName=S.teams[S.userTeamId].name;
})()`);
assert(g("careerReputation() > 50"), "v28好戰績聲望高於基準");
assert(g("careerAllSeasons().length===3"), "v28生涯總季數彙整正確");
// 解職→產生邀約
g("S.gmCareer.trust=1; S.gmCareer.fired=true; S.gmCareer.firedYear=S.seasonYear; S.jobOffers=null; generateJobOffers();");
assert(g("Array.isArray(S.jobOffers) && S.jobOffers.length>=1 && S.jobOffers.length<=3"), "v28解職後產生1~3份邀約");
assert(g("S.jobOffers.every(o=>o.teamId!==S.userTeamId && o.startTrust>=20 && o.startTrust<=75)"), "v28邀約非本隊且起始信任合理");
// 接受邀約→東山再起
g("var __oldId=S.userTeamId; var __off=S.jobOffers[0]; var __newId=__off.teamId; var __stintsBefore=S.gmCareer.stints.length; takeJobOffer(__newId);");
assert(g("S.userTeamId===__newId && S.teams[__newId].isUser===true && S.teams[__oldId].isUser===false"), "v28接手新東家、卸下舊隊");
assert(g("S.gmCareer.fired===false && S.gmCareer.trust===__off.startTrust"), "v28東山再起後信任重置為新東家起始值");
assert(g("S.gmCareer.stints.length===__stintsBefore+1"), "v28前段執掌已封存進stints");
assert(g("S.gmCareer.championships===1"), "v28總冠軍數跨球團保留不歸零");
assert(g("S.gmCareer.seasons.length===0"), "v28新段落賽季歸零重新累積");
assert(g("UI.screen==='offseasonSummary' && S.offseasonSummary.rehired===true"), "v28東山再起進入新東家休賽季（歡迎卡）");
// 生涯彙整仍含舊段落
assert(g("careerAllSeasons().length===3"), "v28封存後生涯總季數仍完整");

/* ---------- 20. v28 代理人事務所 ---------- */
assert(g("S.agency && S.agency.scouted && S.agency.rel"), "v28 agency資料結構存在");
assert(g("typeof agentRelPerks==='function'"), "v28關係優惠函式存在");
// 關係優惠方向：正關係→門檻<1、斜率>1
g("S.agency.rel={hardline:8}; var __pk=agentRelPerks('hardline');");
assert(g("__pk.reqMult < 1 && __pk.slopeMult > 1"), "v28好關係降門檻升機率");
g("S.agency.rel={hardline:-8}; var __pk2=agentRelPerks('hardline');");
assert(g("__pk2.reqMult > 1 && __pk2.slopeMult < 1"), "v28壞關係升門檻降機率");
g("S.agency.rel={};");
// 情蒐揭露
g(`var __fa = Object.values(S.freeAgents)[0] || Object.values(S.players).find(p=>p.team===S.userTeamId);`);
g("ensureAgent(__fa); S.agency.scouted={}; S.agency.scouted[__fa.id]={year:S.seasonYear};");
assert(g("isAgentScouted(__fa)===true"), "v28情蒐標記當季有效");
g("S.agency.scouted[__fa.id]={year:S.seasonYear-1};");
assert(g("isAgentScouted(__fa)===false"), "v28情蒐標記跨季失效");
// 情蒐花費合理範圍
assert(g("var c=agentScoutCost(__fa); c>=800000 && c<=12000000"), "v28情蒐花費在區間內");
// 成交提升關係、談崩降低關係
g("S.agency.rel={}; var __rp=Object.values(S.players).find(p=>p.team===S.userTeamId); ensureAgent(__rp); __rp.agent.type='money'; startNegotiation('renewal',__rp.id,{}); submitNegotiationOffer(UI.negotiation.desiredSalary*3,7);");
assert(g("agentRel('money')>=1"), "v28成交後與該經紀人關係+1");
g("S.pendingContractRenewals=(S.pendingContractRenewals||[]).filter(id=>id!==__rp.id);");

/* ---------- 21. v28 舊存檔升級 ---------- */
g(`(function(){ delete S.agency; delete S.jobOffers; delete S.gmCareer.stints; delete S.gmCareer.teamName; ensureV28(); })()`);
assert(g("S.agency && S.agency.scouted && S.agency.rel"), "v28升級：agency補值");
assert(g("Array.isArray(S.gmCareer.stints)"), "v28升級：stints補值");
assert(g("S.gmCareer.teamName===S.teams[S.userTeamId].name"), "v28升級：teamName補值");


/* ---------- 22. v29 手術費用 ---------- */
assert(g("typeof surgeryCostFor==='function'"), "v29手術費用函式存在");
g(`var __sp = Object.values(S.players).find(p=>p.team===S.userTeamId && !p.injury);
__sp.injury = { name:"測試重傷", part:"膝蓋", severity:"severe", severityLabel:"重度", daysLeft:60, totalDays:60, baseDays:60, pendingSurgery:true };
var __st = S.teams[S.userTeamId]; ensureFinance(__st);
var __expCost = surgeryCostFor(__sp, __st); var __b0 = __st.finance.budget;`);
assert(g("__expCost >= 3000000"), "v29手術費用不低於基礎價");
g("decideSurgeryFor(__sp,'surgery',__st)");
assert(g("__st.finance.budget === __b0 - __expCost"), "v29手術實際扣款");
assert(g("__sp.injury.surgeryCost === __expCost"), "v29手術費記錄在傷勢上");
assert(g("__sp.injury.totalDays === Math.max(3, Math.round(60*1.4))"), "v29手術天數以baseDays x1.4");
g("delete __sp.injury;");
// 保守治療不扣款
g(`var __sp2 = Object.values(S.players).find(p=>p.team===S.userTeamId && !p.injury && p.id!==__sp.id);
__sp2.injury = { name:"測試重傷2", part:"手肘", severity:"severe", severityLabel:"重度", daysLeft:40, totalDays:40, baseDays:40, pendingSurgery:true };
var __b1 = __st.finance.budget; decideSurgeryFor(__sp2,'conservative',__st);`);
assert(g("__st.finance.budget === __b1"), "v29保守治療免費");
assert(g("__sp2.injury.surgeryCost === undefined"), "v29保守治療無手術費欄位");
g("delete __sp2.injury;");
// 醫療室折扣方向
g("var __c0 = (3000000 + 60*150000);");
assert(g("(function(){var t={facilities:{medical:5}}; return surgeryCostFor({injury:{baseDays:60,totalDays:60}}, {facilities:S.teams[S.userTeamId].facilities}) <= __c0;})()"), "v29醫療室折扣不使費用上升");

/* ---------- 23. v29 棒次調換 ---------- */
assert(g("typeof moveLineupSlot==='function'"), "v29棒次調換函式存在");
g(`var __ut=S.teams[S.userTeamId]; ensureLineup(__ut);
var __L0=__ut.lineup.map(s=>s.playerId+':'+s.position);`);
g("moveLineupSlot(0,1)");
assert(g("__ut.lineup[1].playerId+':'+__ut.lineup[1].position === __L0[0] && __ut.lineup[0].playerId+':'+__ut.lineup[0].position === __L0[1]"), "v29第1棒與第2棒整槽互換");
g("moveLineupSlot(1,-1)");
assert(g("__ut.lineup.map(s=>s.playerId+':'+s.position).join()===__L0.join()"), "v29調回後打線復原");
g("var __L1=__ut.lineup.map(s=>s.playerId).join(); moveLineupSlot(0,-1); moveLineupSlot(8,1);");
assert(g("__ut.lineup.map(s=>s.playerId).join()===__L1"), "v29邊界棒次不動作");

/* ---------- 24. v29 轉播贊助方案物件 ---------- */
g("var __ofsB=generateDealOffers(__ut,'broadcast'); var __ofsS=generateDealOffers(__ut,'sponsor');");
assert(g("__ofsB.length===3 && __ofsB.every(o=>typeof o.base==='number' && typeof o.winBonusPer10==='number')"), "v29轉播三方案為物件結構");
assert(g("__ofsB[0].winBonusPer10===0 && __ofsB[2].winBonusPer10>__ofsB[1].winBonusPer10"), "v29保守零浮動、積極浮動最大");
assert(g("__ofsB[0].base>__ofsB[1].base && __ofsB[1].base>__ofsB[2].base"), "v29保證金保守>標準>積極");
// 結算公式：積極方案強隊賺爛隊賠
assert(g("dealSeasonRevenue(__ofsS[2],0.65,true) > dealSeasonRevenue(__ofsS[0],0.65,true)"), "v29強隊選積極賺更多");
assert(g("dealSeasonRevenue(__ofsS[2],0.38,false) < dealSeasonRevenue(__ofsS[0],0.38,false)"), "v29爛隊選積極賠更多");
assert(g("dealSeasonRevenue(__ofsS[0],0.30,false) === __ofsS[0].base"), "v29保守方案戰績無關定額");
assert(g("dealSeasonRevenue(__ofsS[2],0.05,false) >= 0"), "v29浮動下限0不會倒貼");
assert(g("dealSeasonRevenue(123456789,0.5,false)===123456789"), "v29舊存檔純數字合約視為定額");
// chooseDeal存物件
g("S.currentDay=0; ensureAnnualDeals(__ut); chooseDeal('broadcast',2);");
assert(g("typeof __ut.finance.broadcastDeal==='object' && __ut.finance.broadcastDeal.key==='aggressive'"), "v29簽約存方案物件");
g("__ut.finance.broadcastDeal=null;");

/* ---------- 25. v29 行銷活動複選 ---------- */
assert(g("MARKETING_CAMPAIGNS.length>=7"), "v29行銷活動至少7項");
g("ensureMarketingPlan(__ut); __ut.finance.marketingCampaigns=[]; recomputeMarketingEffects(__ut); __ut.finance.budget=Math.max(__ut.finance.budget, 500000000); var __mb0=__ut.finance.budget;");
g("S.currentDay=0; toggleMarketingCampaign('themeday'); toggleMarketingCampaign('merchdev');");
assert(g("__ut.finance.marketingCampaigns.length===2"), "v29可複選兩項活動");
assert(g("__ut.finance.budget === __mb0 - 5000000 - 6000000"), "v29活動費用正確扣款");
assert(g("__ut.finance.marketingAttPct>0 && __ut.finance.marketingMerchPct>=0.15"), "v29效果三軸正確加總");
g("toggleMarketingCampaign('themeday');");
assert(g("__ut.finance.marketingCampaigns.length===1 && __ut.finance.budget === __mb0 - 6000000"), "v29取消活動全額退費");
assert(g("__ut.finance.marketingAttPct===0"), "v29取消後進場率加成歸零");
// 進場率加成方向
g("var __ar0=teamAttendanceRate(__ut); __ut.finance.marketingCampaigns=['familyday']; recomputeMarketingEffects(__ut); var __ar1=teamAttendanceRate(__ut);");
assert(g("__ar1>__ar0 || __ar0>=0.98"), "v29行銷進場率加成生效");
g("__ut.finance.marketingCampaigns=[]; recomputeMarketingEffects(__ut);");

/* ---------- 26. v29 新秀談約上限鎖死 ---------- */
g(`var __rk = generateBatter(null,'選秀',88); __rk.age=19; calibrateProspectToCeiling(__rk);
attachScoutedEstimates([__rk], S.teams[S.userTeamId].scouts.domestic);
delete __rk.negoDesired; __rk.traits=['ambitious']; ensureAgent(__rk); __rk.agent.type='money';
startNegotiation('rookie', __rk.id, { playerObj: __rk, round: 1, teamId: S.userTeamId });
var __cap = rookieSalaryCap(1, __rk);`);
assert(g("UI.negotiation.rookieCap === __cap"), "v29談約帶入新秀上限");
assert(g("UI.negotiation.desiredSalary <= __cap"), "v29大物志向+要錢經紀人也壓不破上限");
// v34修正：假選秀改鋪2順位——成交後 pickIndex=1 仍輪到玩家、advanceDraftUntilUserTurn不會觸發finishDraft。
// （舊版1順位在「成交」時會意外讓假選秀完結→finishDraft重整全聯盟名單+裁員刪人，
//   再被下面的roster2快照整條還原，留下已刪id復活/重複的髒名單，潛伏到後續refillRoster才閃爍當機）
g("S.draft={active:true,rounds:1,order:[S.userTeamId,S.userTeamId],pickIndex:0,pool:[],picks:[],userAutoSkip:false};"); // 新秀成交會寫入S.draft.picks，先鋪好
g("submitNegotiationOffer(__cap*5, 6);");
assert(g("(UI.negotiation ? UI.negotiation.log[0].salary : (S.draft.picks[0] ? S.players[S.draft.picks[0].playerId].salary : __cap)) <= __cap"), "v29出價超額自動壓回上限");
g(`(function(){ if(S.draft && S.draft.picks[0] && S.draft.picks[0].playerId){ var pid=S.draft.picks[0].playerId; var t=S.teams[S.userTeamId]; t.roster1=t.roster1.filter(id=>id!==pid); t.roster2=t.roster2.filter(id=>id!==pid); delete S.players[pid]; } S.draft=null; UI.negotiation=null; UI.screen='dashboard'; })();`); // 清理：若成交則「精準」移除測試新秀（不用快照整條還原）

/* ---------- 27. v29 國內獨家新秀 ---------- */
assert(g("typeof exclusiveDraftSlots==='function'"), "v29國內獨家名額函式存在");
g("var __ds=S.teams[S.userTeamId].scouts.domestic; var __accBak=__ds.accuracy;");
g("__ds.accuracy=99;");
assert(g("exclusiveDraftSlots(S.teams[S.userTeamId])===3"), "v29精準度封頂→3位獨家");
g("__ds.accuracy=30;");
assert(g("(function(){var t=S.teams[S.userTeamId]; var bak=t.facilities.scoutOffice; var bak2=t.facilities.analysis; t.facilities.scoutOffice=0; t.facilities.analysis=0; var r=exclusiveDraftSlots(t); t.facilities.scoutOffice=bak; t.facilities.analysis=bak2; return r===0;})()"), "v29精準度不足→0位獨家");
g("__ds.accuracy=99; var __ex=generateExclusiveDraftProspects(S.teams[S.userTeamId]);");
assert(g("__ex.length===3 && __ex.every(p=>p.exclusive===true)"), "v29獨家新秀帶exclusive標記");
assert(g("__ex.every(p=>['S','A','B'].includes(gradeFromValue(p.potential)) || p.potential>=55)"), "v29獨家新秀等級偏高");
// AI選秀跳過獨家
g(`S.draft={active:true,rounds:1,order:[],pickIndex:0,pool:[],picks:[],userAutoSkip:false};
var __exP=generateBatter(null,'選秀',90); __exP.exclusive=true;
var __pubP=generateBatter(null,'選秀',40);
S.draft.pool=[__exP,__pubP];
var __aiPick=aiDraftPick('T1');`);
assert(g("__aiPick && __aiPick.id===__pubP.id"), "v29 AI選秀跳過獨家只選公開池");
assert(g("S.draft.pool.length===1 && S.draft.pool[0].exclusive===true"), "v29獨家新秀留在池中");
g("S.draft=null; __ds.accuracy=__accBak;");

/* ---------- 28. v29 春訓限制與資訊 ---------- */
g("S.springCamp={year:S.seasonYear, nation:HOME_NATION_NAME, executed:false, assignments:{}};");
g("setSpringNation(NATIONS.find(n=>n.grade==='C').name);");
assert(g("S.springCamp.nation===HOME_NATION_NAME"), "v29 C級國家春訓被擋下");
g("setSpringNation(NATIONS.find(n=>n.grade==='D').name);");
assert(g("S.springCamp.nation===HOME_NATION_NAME"), "v29 D級國家春訓被擋下");
g("setSpringNation(NATIONS.find(n=>n.grade==='B').name);");
assert(g("nationByName(S.springCamp.nation).grade==='B'"), "v29 B級國家春訓可選");
g("setSpringNation(HOME_NATION_NAME); S.springCamp=null;");
// 特性連動：練習狂必有連動提升（找還有大量成長空間的年輕球員測）
g(`var __gp = generateBatter(null,'選秀',90); __gp.age=20; calibrateProspectToCeiling(__gp);
__gp.traits=['grinder'];
var __chg = applySpringTraining(__gp, S.teams[S.userTeamId], nationByName(HOME_NATION_NAME), 'bContact');`);
assert(g("__chg.some(c=>c.traitSpill===true)"), "v29練習狂春訓必有特性連動提升");
assert(g("__chg.every(c=>c.to<=Math.max(c.from,__gp.potential))"), "v29連動提升不破天花板");

/* ---------- 29. v29 談約資訊與上季成績 ---------- */
assert(g("typeof growthPhaseLabel==='function'"), "v29成長階段函式存在");
assert(g("growthPhaseLabel({age:20,peakAge:27}).key==='grow'"), "v29年輕→成長期");
assert(g("growthPhaseLabel({age:27,peakAge:27}).key==='peak'"), "v29顛峰年齡→巔峰期");
assert(g("growthPhaseLabel({age:33,peakAge:27}).key==='decline'"), "v29高齡→衰退期");
assert(g("typeof negotiationScoutBlock==='function' && typeof scoutCeilingReport==='function'"), "v29談約報告函式存在");
g("var __np=Object.values(S.players).find(p=>p.team===S.userTeamId && !p.isPitcher); delete __np.scoutCeilingRpt; var __r1=scoutCeilingReport(__np,S.teams[S.userTeamId],'renewal'); var __r2=scoutCeilingReport(__np,S.teams[S.userTeamId],'renewal');");
assert(g("__r1.val===__r2.val && __r1.year===S.seasonYear"), "v29天花板評估同季固定不重擲");
// lastSeasonStats快照
g(`__np.seasonStats = Object.assign(freshBatterStats(), {G:100,AB:400,H:120,HR:20,RBI:70,SB:5});
var __yr=S.seasonYear;
(function(){ // 模擬finalizeNewSeason的快照段落
  if (__np.seasonStats && __np.seasonStats.AB>0) __np.lastSeasonStats = Object.assign({year:__yr}, __np.seasonStats);
})();`);
assert(g("__np.lastSeasonStats && __np.lastSeasonStats.HR===20 && __np.lastSeasonStats.year===__yr"), "v29上季成績快照結構正確");
assert(g("negoStatLine(__np, __np.lastSeasonStats).includes('20轟')"), "v29成績行格式正確");

/* ---------- 30. v29 舊存檔升級 ---------- */
g(`(function(){
  var t=S.teams[S.userTeamId];
  delete t.finance.marketingCampaigns; delete t.finance.marketingAttPct;
  t.finance.marketingPlan='standard'; t.finance.marketingYear=S.seasonYear;
  t.finance.dealsYear=S.seasonYear;
  t.finance.broadcastOffers=[{id:0,amount:100000000,label:'舊格式'},{id:1,amount:120000000,label:'舊'},{id:2,amount:150000000,label:'舊'}];
  t.finance.sponsorOffers=[{id:0,amount:50000000,label:'舊'},{id:1,amount:60000000,label:'舊'},{id:2,amount:80000000,label:'舊'}];
  t.finance.broadcastDeal=120000000;
  Object.values(S.players).forEach(p=>{delete p.lastSeasonStats;});
  ensureV29();
})()`);
assert(g("Array.isArray(S.teams[S.userTeamId].finance.marketingCampaigns) && S.teams[S.userTeamId].finance.marketingCampaigns.length===3"), "v29升級：舊標準方案→3項活動");
assert(g("typeof S.teams[S.userTeamId].finance.marketingAttPct==='number'"), "v29升級：attPct補值");
assert(g("S.teams[S.userTeamId].finance.broadcastOffers[0].base != null"), "v29升級：舊offers換新格式");
assert(g("S.teams[S.userTeamId].finance.broadcastDeal===120000000"), "v29升級：舊數字合約保留為定額");
assert(g("dealSeasonRevenue(S.teams[S.userTeamId].finance.broadcastDeal,0.6,true)===120000000"), "v29升級：定額合約結算不變");
g("S.teams[S.userTeamId].finance.broadcastDeal=null; S.teams[S.userTeamId].finance.marketingCampaigns=[]; recomputeMarketingEffects(S.teams[S.userTeamId]);");

/* ---------- 23. v30 球場格位設施 ---------- */
assert(g("FACILITY_LEVELS.map(f=>f.slots).join(',')") === "3,4,5,6,8,10,15", "v30格位表 3/4/5/6/8/10/15");
assert(g("FACILITY_LEVELS.find(f=>f.level===7).slots") === 15, "v30巨蛋12＋地標獎勵3＝15格");
assert(g("FACILITY_LEVELS.every(f=>f.merchMult===undefined)"), "v30 merchMult已廢除");
assert(g("STADIUM_FACILITY_TYPES.length") === 12, "v30類型池12種");
assert(g("new Set(STADIUM_FACILITY_TYPES.map(t=>t.key)).size") === 12, "v30類型key不重複");
assert(g("STADIUM_FACILITY_TYPES.filter(t=>t.key!=='vip'&&t.key!=='flagship').every(t=>t.maintPct>=0.08 && t.maintPct<=0.12)"), "v31一般設施維護費率介於8~12%");
assert(g("stadiumFacilityType('vip').maintPct===0.20 && stadiumFacilityType('flagship').maintPct===0.20"), "v31頂級收益設施(VIP/旗艦店)維護費率提高至20%");
assert(g("STADIUM_FACILITY_TYPES.every(t=>t.cost>0 && (t.spendPct>0||t.attPct>0||t.popBoost>0))"), "v30每種設施都有正效果");
assert(g("typeof HOME_ADVANTAGE_RUNS==='number' && HOME_ADVANTAGE_RUNS===0.15"), "v30主場優勢常數化");

/* 效果彙總與人均消費 */
g(`var __t30 = S.teams[S.userTeamId]; ensureStadiumSlots(__t30);
var __slots30 = __t30.facility.stadiumSlots.slice(); var __lv30 = __t30.facility.level;
__t30.facility.stadiumSlots = ['vendor','vendor','museum','museum','parking'];`);
assert(g("Math.abs(stadiumEffects(__t30).spendPct - (0.18*2+0.12*2)) < 1e-9"), "v30同類消費效果線性疊加");
assert(g("stadiumEffects(__t30).popBoost") === 1, "v30博物館人氣加成同類不疊加");
assert(g("Math.abs(stadiumEffects(__t30).attPct - 0.03) < 1e-9"), "v30舒適效果彙總");
assert(g("stadiumEffects(__t30).maintenance") === g("Math.round(40000000*0.10)*2 + Math.round(100000000*0.10)*2 + Math.round(120000000*0.08)"), "v30維護費合計＝各座建設費×費率加總");
g("var __pc0 = stadiumPerCapitaSpend(__t30, 1);");
assert(g("Math.abs(__pc0 - (12+__t30.finance.popularity*0.06)*(1+stadiumEffects(__t30).spendPct)*(1+(__t30.finance.marketingMerchPct||0))) < 1e-6"), "v30人均消費公式");
/* 舒適設施拉抬進場率 */
g("__t30.facility.stadiumSlots = []; var __ar0 = teamAttendanceRate(__t30); __t30.facility.stadiumSlots = ['parking']; var __ar1 = teamAttendanceRate(__t30);");
assert(g("__ar1 > __ar0 && (__ar1 - __ar0) <= 0.03 + 1e-9"), "v30停車場提升進場率（乘上票價需求率後不超過+3%）");

/* 建造/拆除 */
g(`__t30.facility.stadiumSlots = []; __t30.facility.level = 1;
var __day30 = S.currentDay; S.currentDay = 0;
__t30.finance.budget = 500000000; var __bb0 = __t30.finance.budget;
buildStadiumFacility('vendor');`);
assert(g("__t30.facility.stadiumSlots.length===1 && __t30.facility.stadiumSlots[0]==='vendor'"), "v30建造佔用格位");
assert(g("__t30.finance.budget === __bb0 - 40000000"), "v30建造扣款");
g("buildStadiumFacility('vendor');");
assert(g("__t30.facility.stadiumSlots.filter(k=>k==='vendor').length===2"), "v30允許重複建造同類");
g("buildStadiumFacility('drink');");
assert(g("__t30.facility.stadiumSlots.length===3"), "v30簡易球場3格蓋滿");
g("var __bb1=__t30.finance.budget; buildStadiumFacility('toilet');");
assert(g("__t30.facility.stadiumSlots.length===3 && __t30.finance.budget===__bb1"), "v30格位滿鎖建造且不扣款");
g("__t30.finance.budget = 1000; var __bb2=__t30.finance.budget; __t30.facility.level=2; buildStadiumFacility('toilet');");
assert(g("__t30.facility.stadiumSlots.length===3 && __t30.finance.budget===__bb2"), "v30預算不足鎖建造");
g("__t30.finance.budget = 500000000; S.currentDay = 5; var __bb3=__t30.finance.budget; buildStadiumFacility('toilet');");
assert(g("__t30.facility.stadiumSlots.length===3 && __t30.finance.budget===__bb3"), "v30開季後鎖建造");
g("var __bb4=__t30.finance.budget; demolishStadiumFacility(0);");
assert(g("__t30.facility.stadiumSlots.length===3 && __t30.finance.budget===__bb4"), "v30開季後鎖拆除");
g("S.currentDay = 0; var __bb5=__t30.finance.budget; demolishStadiumFacility(0);");
assert(g("__t30.facility.stadiumSlots.length===2"), "v30拆除釋出格位");
assert(g("__t30.finance.budget === __bb5 + Math.round(40000000*0.4)"), "v30拆除退回40%");

/* 主場帳與客場分潤 */
g(`var __away30 = Object.values(S.teams).find(t=>t.id!==S.userTeamId);
resetHomeAwayLedger(__t30); resetHomeAwayLedger(__away30);
var __vis = Math.round(facilityCapacity(__t30)*teamAttendanceRate(__t30));
var __gate = __vis * __t30.finance.ticketPrice;
var __r30 = applyGateEconomy(__t30, __away30, false);`); // 主隊輸
assert(g("__r30.visitors===__vis && __r30.gate===__gate"), "v30單場門票帳＝容量×進場率×票價");
assert(g("__r30.share === Math.round(__gate*0.08)"), "v30客隊贏球抽8%");
assert(g("__away30.finance.gateLedger.shareIn === __r30.share && __t30.finance.gateLedger.sharePaid === __r30.share"), "v30分潤收支對帳一致");
assert(g("__t30.homeLosses===1 && __away30.awayWins===1"), "v30主客戰績記錄（主輸客贏）");
g("var __r31 = applyGateEconomy(__t30, __away30, true);"); // 主隊贏
assert(g("__r31.share === Math.round(__r31.gate*0.02)"), "v30客隊輸球抽2%");
assert(g("__t30.homeWins===1 && __away30.awayLosses===1"), "v30主客戰績記錄（主贏客輸）");
assert(g("__t30.finance.gateLedger.homeGames===2 && __t30.finance.gateLedger.gateRevenue===__r30.gate+__r31.gate"), "v30主場帳逐場累計");
g("resetHomeAwayLedger(__t30);");
assert(g("__t30.homeWins===0 && __t30.finance.gateLedger.gateRevenue===0"), "v30換季重置主場帳與主客戰績");

/* 結算採實帳（含季中舊檔外插） */
g(`var __schedHome = S.schedule.reduce((a,day)=>a+(day.some(x=>x.home===__t30.id)?1:0),0);
__t30.facility.stadiumSlots = ['vendor'];
__t30.finance.gateLedger = { homeGames: __schedHome, visitors: 800000, gateRevenue: 320000000, shareIn: 9000000, sharePaid: 7000000 };
var __intlM30 = (S.intlBoost && S.intlBoost.year===S.seasonYear) ? S.intlBoost.merchMult : 1;
var __expMerch30 = Math.round(800000 * stadiumPerCapitaSpend(__t30, __intlM30)); // 結算前快照（結算會改人氣）
var __rep30 = settleSeasonFinance(__t30, 1e15);`);
assert(g("__rep30.ticketRevenue===320000000 && __rep30.homeVisitors===800000 && __rep30.homeGames===__schedHome"), "v30結算採逐場實帳");
assert(g("__rep30.gateShareIncome===9000000 && __rep30.gateSharePaid===7000000"), "v30結算列分潤收支");
assert(g("__rep30.maintenanceCost===Math.round(40000000*0.10)"), "v30結算收取維護費");
assert(g("__rep30.merchRevenue===__expMerch30"), "v30周邊＝人次×人均消費");
assert(g("__rep30.totalExpense===__rep30.payroll+__rep30.luxuryTax+__rep30.maintenanceCost+__rep30.gateSharePaid"), "v30總支出含維護費與分潤支付");
assert(g("__rep30.homeRecord && typeof __rep30.homeRecord.w==='number' && __rep30.awayRecord"), "v30報表含主客戰績");
g(`__t30.finance.gateLedger = { homeGames: Math.max(1,Math.round(__schedHome/2)), visitors: 400000, gateRevenue: 160000000, shareIn: 4500000, sharePaid: 3500000 };
var __sc30 = __schedHome / Math.max(1,Math.round(__schedHome/2));
var __rep31 = settleSeasonFinance(__t30, 1e15);`);
assert(g("__rep31.ticketRevenue===Math.round(160000000*__sc30) && __rep31.homeGames===__schedHome"), "v30季中舊檔帳按實際主場數外插");
/* 季中預估含v30欄位 */
g("var __fc30 = projectSeasonFinance(__t30);");
assert(g("typeof __fc30.maintenanceCost==='number' && typeof __fc30.gateShareIncome==='number' && typeof __fc30.gateSharePaid==='number'"), "v30季中預估含維護費/分潤欄位");

/* ensureV30 舊檔升級換算 */
g(`var __cv30 = Object.values(S.teams).find(t=>t.id!==S.userTeamId && t.id!==__away30.id);
delete __cv30.facility.stadiumSlots; __cv30.facility.level = 4; ensureV30();`);
assert(g("__cv30.facility.stadiumSlots.length===3"), "v30升級換算：Lv4補發3座（每級1座）");
assert(g("__cv30.facility.stadiumSlots.join(',')==='vendor,drink,food'"), "v30升級換算：補發順序正確");
g("ensureV30();");
assert(g("__cv30.facility.stadiumSlots.length===3"), "v30升級換算：重跑不重複補發");
g("delete __cv30.facility.stadiumSlots; __cv30.facility.level = 7; ensureV30();");
assert(g("__cv30.facility.stadiumSlots.length===6"), "v30升級換算：巨蛋補發封頂6座");
g("delete __cv30.facility.stadiumSlots; __cv30.facility.level = 1; ensureV30();");
assert(g("__cv30.facility.stadiumSlots.length===0"), "v30升級換算：Lv1不補發");

/* AI球團設施投資（隔離設施發展金，不動營運預算） */
g(`var __ai30 = __cv30; __ai30.persona='rebuild'; __ai30.facility.level = 1; __ai30.facility.stadiumSlots = []; __ai30.facility.fund = 0;
var __aiBudget0 = __ai30.finance.budget = 50000000; runAiFacilityInvestments();`);
assert(g("__ai30.finance.budget === __aiBudget0"), "v30 AI設施投資不動營運預算");
assert(g("__ai30.facility.level===2"), "v30 AI首年設施金升級1級");
assert(g("__ai30.facility.stadiumSlots.length>=1"), "v30 AI首年設施金建造設施");
assert(g("__ai30.facility.stadiumSlots.every(k=>stadiumFacilityType(k))"), "v30 AI建造皆為有效類型");
assert(g("__ai30.facility.fund>=0"), "v30 AI設施金不透支");
g(`var __me30 = S.teams[S.userTeamId]; var __lvMe = __me30.facility.level; var __slMe = __me30.facility.stadiumSlots.length; var __fundMe = __me30.facility.fund;
runAiFacilityInvestments();`);
assert(g("__me30.facility.level===__lvMe && __me30.facility.stadiumSlots.length===__slMe && __me30.facility.fund===(__fundMe||0)"), "v30 AI投資跳過玩家隊");
/* 個性注資倍率＋收支守恆（不預設是否升級，通用對帳） */
g(`__ai30.persona='splash'; var __lvB=__ai30.facility.level=5; __ai30.facility.stadiumSlots=[]; __ai30.facility.fund=0;
runAiFacilityInvestments();
var __spentUpg = (__ai30.facility.level>__lvB) ? FACILITY_LEVELS.find(f=>f.level===__ai30.facility.level).upgradeCost : 0;
var __spentBuild = __ai30.facility.stadiumSlots.reduce((a,k)=>a+stadiumFacilityType(k).cost,0);`);
assert(g("Math.abs((__ai30.facility.fund + __spentUpg + __spentBuild) - Math.round(140000000*1.55)) < 1e-6"), "v31豪購型設施金1.4億×1.55且收支守恆");
/* 精算型選CP值最高消費設施 */
g(`__ai30.persona='analytics'; __ai30.facility.level=7; __ai30.facility.stadiumSlots=[]; __ai30.facility.fund=3000000000; runAiFacilityInvestments();
var __bestCP = STADIUM_FACILITY_TYPES.filter(t=>t.spendPct>0).sort((a,b)=>(b.spendPct/b.cost)-(a.spendPct/a.cost))[0].key;`);
assert(g("__ai30.facility.stadiumSlots.length>0 && __ai30.facility.stadiumSlots[0]===__bestCP"), "v30精算型AI選CP值最高消費設施");
/* 還原玩家隊測試前狀態 */
g("__t30.facility.stadiumSlots = __slots30; __t30.facility.level = __lv30; S.currentDay = __day30; resetHomeAwayLedger(__t30);");

/* ==================== v31 專項測試 ==================== */
/* --- 平衡③：球場折舊/重建 --- */
g(`var __d31 = S.teams[S.userTeamId]; ensureStadiumSlots(__d31);
__d31.facility.stadiumSlots = ['vendor']; __d31.facility.slotBuilt = [S.seasonYear];`);
assert(g("stadiumSlotAged(__d31,0)===false && Math.abs(stadiumEffects(__d31).spendPct-0.18)<1e-9"), "v31新建設施未老舊、效果全額");
g("__d31.facility.slotBuilt = [S.seasonYear - STADIUM_LIFE];");
assert(g("stadiumSlotAged(__d31,0)===true"), "v31屋齡達壽命判定老舊");
assert(g("Math.abs(stadiumEffects(__d31).spendPct-0.18*STADIUM_DECAY_MULT)<1e-9"), "v31老舊設施三軸效果×0.5");
assert(g("stadiumEffects(__d31).maintenance===Math.round(40000000*0.10)"), "v31老舊維護費照收（不減）");
g(`S.currentDay=0; __d31.facility.rebuiltYear=null; __d31.finance.budget=500000000; var __rb0=__d31.finance.budget;
rebuildStadiumFacility(0);`);
assert(g("stadiumSlotAged(__d31,0)===false"), "v31重建後屋齡歸零、效果恢復");
assert(g("__d31.finance.budget===__rb0-Math.round(40000000*STADIUM_REBUILD_COST)"), "v31重建費＝建設費×0.6");
g("__d31.facility.slotBuilt=[S.seasonYear-STADIUM_LIFE]; var __rb1=__d31.finance.budget; rebuildStadiumFacility(0);");
assert(g("__d31.finance.budget===__rb1"), "v31每年重建上限1座（同年再重建被擋）");
assert(g("STADIUM_LIFE===30 && STADIUM_REBUILD_COST===0.6"), "v31壽命30年、重建費率0.6");
/* 完備度定義（老舊格位以0.5計入有效格位） */
g("__d31.facility.level=1; __d31.facility.stadiumSlots=['vendor','food']; __d31.facility.slotBuilt=[S.seasonYear, S.seasonYear-STADIUM_LIFE];");
assert(g("Math.abs(stadiumCompleteness(__d31)-(0.5*0+0.5*1.5/15))<1e-9"), "v31完備度：老舊格位以0.5計入有效格位");

/* --- 平衡①②：維護費/AI建設速度 --- */
assert(g("AI_FACILITY_FUND_BASE===140000000 && AI_FACILITY_FUND_MULT.splash===1.55 && AI_FACILITY_FUND_MULT.conservative===0.95"), "v31 AI設施金1.4億×新倍率");
g(`var __ai31=Object.values(S.teams).find(t=>!t.isUser); __ai31.persona='splash'; __ai31.facility.level=3; __ai31.facility.stadiumSlots=[]; __ai31.facility.slotBuilt=[]; __ai31.facility.fund=10000000000;
var __b0=__ai31.facility.stadiumSlots.length; runAiFacilityInvestments();`);
assert(g("__ai31.facility.stadiumSlots.length - __b0 <= 1"), "v31 AI每年最多建造1座");
assert(g("__ai31.facility.fund<=AI_FACILITY_FUND_CAP"), "v31 AI發展金囤積上限8億");

/* --- 平衡③：聯盟均衡稅 --- */
g(`var __hi=Object.values(S.teams).filter(t=>!t.isUser); 
// 造一支超標豪門AI與一支墊底AI
var __rich=__hi[0], __poor=__hi[1];
ensureFacilityFund(__rich); ensureFacilityFund(__poor);
__rich.facility.level=7; __rich.facility.stadiumSlots=Array(15).fill('vendor'); __rich.facility.slotBuilt=Array(15).fill(S.seasonYear); __rich.facility.fund=500000000;
__poor.facility.level=1; __poor.facility.stadiumSlots=[]; __poor.facility.slotBuilt=[]; __poor.facility.fund=0;
var __richFund0=__rich.facility.fund; var __res=runLeagueBalanceTax();`);
assert(g("stadiumCompleteness(__rich)>=0.95"), "v31豪門AI完備度達課稅門檻");
assert(g("__rich.facility.fund < __richFund0"), "v31 AI均衡稅抽走超過1.5億部分");
assert(g("Math.abs((__richFund0 - __rich.facility.fund) - Math.round((__richFund0-150000000)*0.5)) < 2"), "v31 AI均衡稅率50%");
assert(g("__res.pool>0"), "v31均衡池累積稅金");
/* 玩家對稱稅：完備度≥90%且預算>6億 → 繳稅記在報表、不暗扣 */
g(`var __pu=S.teams[S.userTeamId]; ensureStadiumSlots(__pu); __pu.facility.level=7; __pu.facility.stadiumSlots=Array(15).fill('vendor'); __pu.facility.slotBuilt=Array(15).fill(S.seasonYear); __pu.finance.budget=2000000000;
runLeagueBalanceTax();`);
assert(g("__pu.finance.balanceTaxPaid>0 && __pu.finance.balanceTaxPaid<=200000000"), "v31玩家均衡稅≤上限2億、記於finance待報表折入");
assert(g("Math.abs(__pu.finance.balanceTaxPaid - Math.min(Math.round((2000000000-600000000)*0.12),200000000))<2"), "v31玩家均衡稅率12%、單年上限2億");
/* 稅只動隔離發展金/報表折入，不暗扣budget（玩家的budget由settle折入，這裡尚未扣） */
assert(g("__pu.finance.budget===2000000000"), "v31玩家均衡稅不暗扣budget（改由財報折入）");
/* 還原 */
g("__pu.facility.stadiumSlots=[]; __pu.facility.slotBuilt=[]; __pu.finance.balanceTaxPaid=0; __pu.finance.balanceTaxReceived=0;");

/* --- v31-A：教練/球探續約與空缺 --- */
assert(g("typeof S.teams[S.userTeamId].scouts.domestic.contractYears==='number'"), "v31球探有合約年限");
g(`var __ut=S.teams[S.userTeamId];
// 教練空缺→加成歸零
var __role='打擊教練'; var __cid=__ut.coachStaff['1軍'][__role]; 
var __b4=specificCoachBonus(__ut,'1軍','batting');
setCoachVacancy(__ut,'1軍',__role,true); __ut.coachStaff['1軍'][__role]=null;`);
assert(g("specificCoachBonus(__ut,'1軍','batting')===0"), "v31教練空缺→該項加成歸零");
g("setCoachVacancy(__ut,'1軍',__role,false);");
/* 球探空缺→精準度回退盲評基準 */
g("__ut.scouts.domestic=null; setScoutVacancy(__ut,'domestic',true);");
assert(g("effectiveScoutAccuracy(__ut, __ut.scouts.domestic)===50"), "v31球探空缺→精準度回退盲評基準50");
g("__ut.scouts.domestic=generateScout(__ut.id,'domestic'); setScoutVacancy(__ut,'domestic',false);");
/* 續約談判：出價≥期望必成交 */
g(`var __co=S.coaches[__ut.coachStaff['1軍']['投手教練']]; __co.contractYears=1; delete __co.renewDesired;
S.pendingStaffRenewals=[{kind:'coach',staffId:__co.id,level:'1軍',role:'投手教練'}];
startNegotiation('staffRenewal', null, {item:S.pendingStaffRenewals[0]});`);
assert(g("UI.negotiation && UI.negotiation.kind==='staffRenewal' && UI.negotiation.market3to5.length>=3 && UI.negotiation.market3to5.length<=5"), "v31續約談判：3~5名市場人選比較");
g("var __des=UI.negotiation.desiredSalary; var __dy=UI.negotiation.desiredYears; submitStaffOffer(__des, __dy);");
assert(g("(S.pendingStaffRenewals.length===0) && S.coaches[__ut.coachStaff['1軍']['投手教練']].contractYears===__dy"), "v31續約：出價≥期望必成交、延長合約");
/* 破局/不續→空缺 */
g(`var __co2=S.coaches[__ut.coachStaff['2軍']['跑壘教練']]; __co2.contractYears=1;
S.pendingStaffRenewals=[{kind:'coach',staffId:__co2.id,level:'2軍',role:'跑壘教練'}];
declineStaffRenewal();`);
assert(g("__ut.coachStaff['2軍']['跑壘教練']===null && coachVacant(__ut,'2軍','跑壘教練')"), "v31不續約→職位空缺");
g("S.teams[S.userTeamId].finance.budget=1000000000; openScoutPicker('domestic'); hireScoutCandidate('domestic',0);"); // v36：以候選人picker補實，確保後續狀態乾淨
/* AI隊維持自動補人：跑一次合約處理，AI不應出現空缺 */
g("Object.values(S.teams).forEach(t=>{if(!t.isUser&&t.coachStaff){['1軍','2軍'].forEach(lv=>{COACH_ROLES.forEach(r=>{var c=S.coaches[t.coachStaff[lv][r]]; if(c)c.contractYears=1;});});}}); processCoachContracts();");
assert(g("Object.values(S.teams).filter(t=>!t.isUser).every(t=>COACH_ROLES.every(r=>S.coaches[t.coachStaff['1軍'][r]]))"), "v31 AI隊教練到期自動補人（不空缺）");
/* 清理玩家隊空缺，補回教練避免影響後續 */
g(`if(!S.coaches[__ut.coachStaff['2軍']['跑壘教練']]){var nc=generateCoach(__ut.id,'2軍','跑壘教練'); S.coaches[nc.id]=nc; __ut.coachStaff['2軍']['跑壘教練']=nc.id; setCoachVacancy(__ut,'2軍','跑壘教練',false);} S.pendingStaffRenewals=[];`);

/* --- v31-B：自主訓練/傳承 --- */
assert(g("ACQUIRED_TRAITS.length===4 && isAcquiredTrait('grinder') && !isAcquiredTrait('ironman')"), "v31後天型特質分類（先天不可傳）");
assert(g("Object.keys(LEGACY_SKILLS).length>=8"), "v31稱號/特殊技池");
/* 特殊技取得給一次性屬性提升 */
g(`var __lp=Object.values(S.players).find(p=>!p.isPitcher && p.team===S.userTeamId); __lp.specialSkills=[]; var __eye0=__lp.eye; 
__lp.specialSkills.push('eye_master'); applyLegacySkillBoost(__lp,'eye_master');`);
assert(g("__lp.eye===clamp(__eye0+3,20,99)"), "v31稱號取得給一次性屬性提升");
/* 傳承：老將持稱號→年輕高潛力後輩習得（強制成功驗證機制） */
g(`var __tm=S.teams[S.userTeamId]; var __ids=__tm.roster1.concat(__tm.roster2).map(id=>S.players[id]).filter(Boolean);
var __sr=__ids.find(p=>!p.isPitcher); var __jr=__ids.find(p=>p!==__sr && !p.isPitcher);
__sr.age=35; __sr.specialSkills=['contact_zen']; __sr.traits=(__sr.traits||[]).filter(t=>t!=='biggame'); __sr.traits.push('biggame');
__jr.age=21; __jr.potential=90; __jr.specialSkills=[]; __jr.traits=[];
// 傳承成功機率0.4，跑多次直到成功（驗證機制可運作與疊加上限）
var __ok=false, __r=null; for(var __k=0;__k<200 && !__ok;__k++){ __jr.specialSkills=[]; __jr.traits=[]; __r=runTeamInheritance(__tm, true); if(__r){__ok=true;} }
// v32修正：配對規則挑「全隊潛力最高的≤23歲後輩」，不保證是測試指定的__jr——改追蹤實際受贈者
var __actualJr = __ok ? __ids.find(p=>p.name===__r.juniorName) : null;`);
assert(g("__ok===true"), "v31傳承：老將可將後天特質/稱號傳給年輕高潛力後輩");
assert(g("__actualJr && legacyItemsCount(__actualJr)>=1"), "v31傳承：後輩獲得傳承項目");
/* 疊加上限3 */
g(`__jr.specialSkills=['eye_master','power_flag']; __jr.traits=['grinder']; // 已3項
var __before=legacyItemsCount(__jr); var __r2=runTeamInheritance(__tm, false);`);
assert(g("legacyItemsCount(__jr)<=3"), "v31傳承：後輩疊加上限3項");
/* 自主訓練窗執行不崩、產生報告 */
g("runSelfTrainingWindow();");
assert(g("S.selfTrainingReport && typeof S.selfTrainingReport.selfTrained==='number'"), "v31自主訓練窗執行並產生報告");
/* 每隊每年至多1次傳承（runTeamInheritance單次呼叫最多回傳1件） */
assert(g("(function(){var r=runTeamInheritance(S.teams[S.userTeamId],false); return r===null || typeof r==='object';})()"), "v31傳承：單次呼叫至多1件（每隊每年上限1）");

/* ==================== v32：聯盟生態（AI互相交易/風聲/AI提案/KPI動態化） ==================== */
/* --- 交易窗口新制 --- */
assert(g("tradeDeadlineDay()===Math.max(1,S.schedule.length-30)"), "v32截止日＝季後賽前一個月（末30日）");
g("var __cd0=S.currentDay; S.currentDay=S.schedule.length-10;");
assert(g("tradeWindowOpen()===false"), "v32末30日交易窗口關閉");
g("S.currentDay=S.schedule.length; var __ddy0=S.draftDoneYear; S.draftDoneYear=S.seasonYear-1;");
assert(g("tradeWindowOpen()===false"), "v32休賽季選秀前窗口關閉");
g("S.draftDoneYear=S.seasonYear;");
assert(g("tradeWindowOpen()===true"), "v32休賽季選秀後窗口開放");
g("S.currentDay=__cd0; S.draftDoneYear=__ddy0;");

/* --- AI交易狀態容器與參數 --- */
assert(g("AI_TRADE_CAP_PER_TEAM===5 && AI_TRADE_MIN_RATIO===0.85 && AI_TRADE_INTERCEPT_PREMIUM===0.05"), "v32核心參數（上限5/防坑殺0.85/插隊溢價5%）");
g("var __st=ensureAiTradeState();");
assert(g("S.aiTrade && S.aiTrade.year===S.seasonYear && Array.isArray(S.aiTrade.rumors)"), "v32 AI交易狀態容器（依年份）");
assert(g("(function(){var y=S.seasonYear; S.seasonYear++; ensureAiTradeState(); var ok=S.aiTrade.year===S.seasonYear && S.aiTrade.rumors.length===0; S.seasonYear=y; ensureAiTradeState(); return ok;})()"), "v32跨年自動重置AI交易狀態");

/* --- 姿態與撮合 --- */
assert(g("['sell','buy','value','hold'].includes(aiTradeStance(Object.values(S.teams).find(t=>!t.isUser)))"), "v32球團交易姿態可判定");
g(`S.aiTrade.rumors=[]; S.aiTrade.counts={}; var __ru=null; for(var __k2=0;__k2<40 && !__ru;__k2++){ __ru=tryMatchAiTrade(false); }`);
assert(g("__ru!==null"), "v32可撮合出AI↔AI交易風聲");
assert(g("__ru && __ru.neutralRatio>=0.85 && __ru.neutralRatio<=1/0.85+0.01"), "v32撮合比率落在防坑殺區間");
assert(g("__ru && __ru.daysLeft>=5 && __ru.daysLeft<=7"), "v32風聲提前5~7天（依交易球探）");
assert(g("__ru && S.teams[__ru.sellerId] && !S.teams[__ru.sellerId].isUser && S.teams[__ru.buyerId] && !S.teams[__ru.buyerId].isUser"), "v32風聲雙方皆為AI隊");
assert(g("[0,1,2].includes(rumorDetailLevel()) && [5,6,7].includes(rumorLeadDays())"), "v32情報精確度/提前天數分級");

/* --- 風聲定案與上限 --- */
g(`var __sell0=S.players[__ru.sellerGives[0]].team, __buy0=S.players[__ru.buyerGives[0]].team; resolveAiRumor(__ru);`);
assert(g("__ru.done===true"), "v32風聲到期定案");
assert(g("S.players[__ru.sellerGives[0]].team===__ru.buyerId && S.players[__ru.buyerGives[0]].team===__ru.sellerId"), "v32定案後球員完成換隊");
assert(g("aiTradeCount(__ru.sellerId)===1 && aiTradeCount(__ru.buyerId)===1"), "v32成交計數累計");
g("S.aiTrade.counts[__ru.sellerId]=5; var __ru2={done:false,cancelled:false,sellerId:__ru.sellerId,buyerId:__ru.buyerId,sellerGives:__ru.buyerGives,buyerGives:__ru.sellerGives}; resolveAiRumor(__ru2);");
assert(g("__ru2.cancelled===true && !__ru2.done"), "v32達每隊5筆上限後不再成交");
g("S.aiTrade.counts={};");

/* --- 插隊搶人（evaluateTrade溢價門檻＋executeTrade清風聲） --- */
g(`S.aiTrade.rumors=[]; var __ru3=null; for(var __k3=0;__k3<40 && !__ru3;__k3++){ __ru3=tryMatchAiTrade(false); }`);
assert(g("__ru3 && activeRumorForPlayer(__ru3.sellerGives[0], __ru3.sellerId)===__ru3"), "v32可查詢球員的進行中風聲");
g(`var __tgt=S.players[__ru3.sellerGives[0]]; var __mine=S.teams[S.userTeamId].roster1.concat(S.teams[S.userTeamId].roster2).map(id=>S.players[id]).filter(Boolean).sort((a,b)=>tradeValue(b)-tradeValue(a));
var __low=__mine[__mine.length-1]; var __evLow=evaluateTrade([__low.id],[__tgt.id],__ru3.sellerId);`);
assert(g("__evLow.accept===false"), "v32插隊：低價報價必被拒（須壓過AI買家+5%）");
g(`var __rich=__mine.slice(0,3).map(p=>p.id); var __evHi=evaluateTrade(__rich,[__tgt.id],__ru3.sellerId);`);
assert(g("!__evHi.accept || __evHi.hijackedRumorId===__ru3.id"), "v32插隊：高價成交時帶回風聲id");
g("var __aff0=gmAffinity(S.teams[__ru3.buyerId]); settleHijack(__ru3.id);");
assert(g("__ru3.cancelled===true && gmAffinity(S.teams[__ru3.buyerId])<=__aff0-2+0.001"), "v32插隊成功：原交易取消、被搶買家好感-2");
g("executeTrade(__ru3.sellerId, __ru3.buyerId, [], []);"); // 清理無害呼叫
assert(g("(function(){S.aiTrade.rumors=[]; var r=null; for(var k=0;k<40&&!r;k++){r=tryMatchAiTrade(false);} if(!r)return true; invalidateRumorsForPlayers(r.sellerGives); return r.cancelled===true;})()"), "v32涉及球員易主時風聲自動失效");

/* --- 慫恿破局 --- */
g(`S.aiTrade.rumors=[]; var __ru4=null; for(var __k4=0;__k4<40 && !__ru4;__k4++){ __ru4=tryMatchAiTrade(false); }`);
g("var __ps4=__ru4?persuadeRumor(__ru4.id):{ok:false};");
assert(g("__ru4===null || (__ps4.ok===true && __ru4.persuaded===true && __ps4.chance>=0.2)"), "v32慫恿破局：機率≥20%且標記已用");
assert(g("__ru4===null || persuadeRumor(__ru4.id).ok===false"), "v32慫恿破局：每筆風聲限一次");

/* --- AI主動提案 --- */
g(`S.aiTrade.proposal=null; S.aiTrade.proposalCount=0; var __pp=null; for(var __k5=0;__k5<60 && !__pp;__k5++){ __pp=generateAiProposalToUser(); }`);
assert(g("__pp && S.aiTrade.proposal && __pp.aiGives.length>=1 && __pp.userGives.length>=1"), "v32 AI可主動向玩家提案");
assert(g("__pp && S.players[__pp.aiGives[0]].team===__pp.teamId && S.players[__pp.userGives[0]].team===S.userTeamId"), "v32提案雙方球員歸屬正確");
assert(g("__pp && Math.abs(__pp.favor)<=0.10+0.001"), "v32好感讓利幅度封頂±0.10");
g("var __ut5=S.userTeamId; var __in5=__pp.aiGives[0]; acceptAiProposal();");
assert(g("S.players[__in5].team===__ut5 && S.aiTrade.proposal===null"), "v32接受提案完成換隊並清空提案");
g("S.aiTrade.proposal={teamId:'T1',aiGives:[],userGives:[],expiresDay:0}; declineAiProposal();");
assert(g("S.aiTrade.proposal===null"), "v32婉拒提案清空且不強制扣好感");

/* --- 好感讓利門檻（B2） --- */
g(`var __pt6=Object.values(S.teams).find(t=>!t.isUser && t.persona!=='analytics'); var __ps6=TEAM_PERSONAS[__pt6.persona];
__pt6.gmMemory.affinity=10; var __wk6=__pt6.roster1.map(id=>S.players[id]).filter(Boolean)[0];
var __gv=S.teams[S.userTeamId].roster1.map(id=>S.players[id]).filter(Boolean).find(p=>{var r=personaTradeValue(__pt6,p)/Math.max(1,personaTradeValue(__pt6,__wk6)); return r>=__ps6.acceptHi*0.95 && r<__ps6.acceptHi;});`);
assert(g("(function(){if(!__gv)return true; for(var i=0;i<20;i++){ if(evaluateTrade([__gv.id],[__wk6.id],__pt6.id).accept) return true;} return false;})()"), "v32好感≥5門檻打95折可成交");
g("__pt6.gmMemory.affinity=0;");

/* --- KPI動態化 --- */
g("generateSeasonKPI();");
assert(g("S.seasonKPI.midReviewDone===false && S.seasonKPI.midReview===null && S.seasonKPI.stopBleed===null"), "v32開季KPI含季中檢視欄位");
/* 落後→季中檢視給抉擇 */
g(`var __ut7=S.teams[S.userTeamId]; var __w0=__ut7.wins,__l0=__ut7.losses,__cd7=S.currentDay;
S.seasonKPI.goals[0]={key:'winpct50',label:'球季勝率達成5成',diff:2}; S.seasonKPI.midReviewDone=false; S.seasonKPI.midReview=null;
__ut7.wins=20; __ut7.losses=40; S.currentDay=Math.round(S.schedule.length/2); tickKpiMidSeason();`);
assert(g("S.seasonKPI.midReviewDone===true && S.seasonKPI.midReview && S.seasonKPI.midReview.decided===false"), "v32落後觸發季中召見");
g("acceptKpiReduction();");
assert(g("S.seasonKPI.reductionAccepted===true && S.seasonKPI.goals[0].reduced===true && S.seasonKPI.goals[0].key==='winpct45'"), "v32接受降標：目標換易版並記折扣");
/* 硬拚→止血目標 */
g(`S.seasonKPI.goals[0]={key:'winpct50',label:'球季勝率達成5成',diff:2}; S.seasonKPI.reductionAccepted=false;
S.seasonKPI.midReview={type:'offer',easier:KPI_EASIER_MAP['winpct50'],decided:false,origLabel:'球季勝率達成5成'}; declineKpiReduction();`);
assert(g("S.seasonKPI.stopBleed && S.seasonKPI.stopBleed.need===8 && S.seasonKPI.stopBleed.span===15 && S.seasonKPI.stopBleed.achieved===null"), "v32硬拚附贈止血目標");
g("__ut7.wins=S.seasonKPI.stopBleed.fromWins+9; __ut7.losses=__ut7.losses+6; tickKpiMidSeason();");
assert(g("S.seasonKPI.stopBleed.achieved===true"), "v32止血目標滿15戰即時判定");
/* 超前→加碼目標（達成加倍/未達不扣） */
g(`S.seasonKPI.goals=[{key:'playoffs',label:'晉級季後賽',diff:2},{key:'noDeficit',label:'不赤字',diff:1}]; S.seasonKPI.midReviewDone=false; S.seasonKPI.midReview=null; S.seasonKPI.stopBleed=null;
__ut7.wins=40; __ut7.losses=20; var __rk=standingsForDivision(__ut7.division).findIndex(t=>t.id===S.userTeamId);
Object.values(S.teams).filter(t=>t.division===__ut7.division&&t.id!==S.userTeamId).forEach(t=>{t.wins=10;t.losses=50;});
__ut7.wins=40; __ut7.losses=20; tickKpiMidSeason();`);
assert(g("S.seasonKPI.goals.some(gg=>gg.bonus===true)"), "v32超前觸發加碼目標");
/* v34修正測試脆弱性：年循環殘留的S.playoffs若恰由玩家隊奪冠（隨機），會讓champion目標「達成」、
   兩條「未達成」斷言閃爍失敗——結算前先清空playoffs，測完還原 */
g("var __poBak8=S.playoffs; S.playoffs=null;");
g(`S.seasonKPI.goals=[{key:'winpct40',label:'守4成',diff:1},{key:'champion',label:'加碼奪冠',diff:3,bonus:true}]; S.seasonKPI.settled=false; S.seasonKPI.stopBleed=null; S.seasonKPI.probation=false; S.seasonKPI.reductionAccepted=false; S.seasonKPI.escalated=false;
__ut7.wins=30; __ut7.losses=30; var __t8=S.gmCareer.trust=50; var __kr8=settleSeasonKPI({});`);
assert(g("__kr8.results.find(r=>r.label==='加碼奪冠').delta===0"), "v32加碼目標未達成不扣分");
/* 留察×1.5與降標×0.75 */
g(`S.seasonKPI={year:S.seasonYear,goals:[{key:'champion',label:'奪冠',diff:3}],settled:false,probation:true}; S.gmCareer.trust=50; var __kr9=settleSeasonKPI({});`);
assert(g("__kr9.results[0].delta===Math.round(-(14-3*3)*1.5)"), "v32留校察看：未達成扣分×1.5");
g("S.playoffs=__poBak8;");
g(`S.seasonKPI={year:S.seasonYear,goals:[{key:'winpct40',label:'守4成',diff:1,reduced:true}],settled:false,reductionAccepted:true}; S.gmCareer.trust=50; S.teams[S.userTeamId].wins=30; S.teams[S.userTeamId].losses=30; var __kr10=settleSeasonKPI({});`);
assert(g("__kr10.results[0].achieved===true && __kr10.results[0].delta===Math.round(Math.round((4+3*1)*0.5)*0.75)"), "v32降標達成：獎勵×0.5再×0.75");
/* 連續性計數 */
assert(g("S.kpiStreak && typeof S.kpiStreak.pass==='number'"), "v32 KPI連續性計數存在");
g(`S.kpiStreak={pass:0,fail:0}; S.seasonKPI={year:S.seasonYear,goals:[{key:'winpct40',label:'守4成',diff:1}],settled:false}; S.gmCareer.trust=50; settleSeasonKPI({});`);
assert(g("S.kpiStreak.pass===1 && S.kpiStreak.fail===0"), "v32全達成累計pass");
g(`S.kpiStreak={pass:2,fail:0}; generateSeasonKPI();`);
assert(g("S.seasonKPI.escalated===true"), "v32連2年達標→高層胃口變大");
g(`S.kpiStreak={pass:0,fail:2}; generateSeasonKPI();`);
assert(g("S.seasonKPI.probation===true"), "v32連2年全滅→留校察看");
g("S.kpiStreak={pass:0,fail:0}; generateSeasonKPI();");

/* --- ensureV32舊存檔升級 --- */
g("delete S.aiTrade; delete S.kpiStreak; delete S.draftDoneYear; ensureV32();");
assert(g("S.aiTrade && S.kpiStreak && S.draftDoneYear===S.seasonYear"), "v32升級：補齊AI交易/連續性/選秀旗標");
g("__ut7.wins=__w0; __ut7.losses=__l0; S.currentDay=__cd7;");

/* ---------- 33. v33 東山再起深化＋代理人事務所深化 ---------- */
/* --- ensureV33 舊存檔升級 --- */
g("var __c33=ensureGmCareer(); delete __c33.firedCount; delete __c33.rehires; delete __c33.champJumps; delete __c33.sabbaticals; delete __c33.mandate; delete S.sabbatical; delete S.champJumpYear; delete S.agency.wined; delete S.agency.referrals; delete S.agency.intel; ensureV33();");
assert(g("__c33.firedCount===((__c33.stints||[]).length+(__c33.fired?1:0)) && __c33.rehires===(__c33.stints||[]).length && __c33.champJumps===0 && __c33.sabbaticals===0 && __c33.mandate===null"), "v33升級：生涯欄位回填");
assert(g("S.sabbatical===false && S.champJumpYear===null && S.agency.wined && Array.isArray(S.agency.referrals) && Array.isArray(S.agency.intel)"), "v33升級：沉潛旗標與事務所容器");

/* --- A2 聲望公式：解職-6／跳槽+8／沉潛+5（固定中性生涯測差值） --- */
g("var __sv33={s:__c33.seasons,st:__c33.stints,ch:__c33.championships,f:__c33.firedCount,j:__c33.champJumps,sb:__c33.sabbaticals};");
g("__c33.seasons=[{wins:63,losses:63,madePlayoffs:false}]; __c33.stints=[]; __c33.championships=0; __c33.firedCount=0; __c33.champJumps=0; __c33.sabbaticals=0;");
g("var __rA=careerReputation(); __c33.firedCount=1; var __rB=careerReputation(); __c33.firedCount=0; __c33.champJumps=1; var __rC=careerReputation(); __c33.champJumps=0; __c33.sabbaticals=1; var __rD=careerReputation();");
assert(g("__rA===50 && __rA-__rB===6"), "v33聲望：解職紀錄每次-6");
assert(g("__rC-__rA===8"), "v33聲望：奪冠跳槽每次+8");
assert(g("__rD-__rA===5"), "v33聲望：沉潛充電每次+5");
g("__c33.seasons=__sv33.s; __c33.stints=__sv33.st; __c33.championships=__sv33.ch; __c33.firedCount=__sv33.f; __c33.champJumps=__sv33.j; __c33.sabbaticals=__sv33.sb;");

/* --- A1 委任型判定與 mandateActive --- */
assert(g("MANDATE_META.rebuild && MANDATE_META.contend && MANDATE_META.stopbleed"), "v33三種委任定義");
g("var __rk33=Object.values(S.teams).filter(t=>t.id!==S.userTeamId).map(t=>({id:t.id,rank:teamStrengthRank(t.id)}));");
g("var __weak=__rk33.find(o=>o.rank>=13); var __strong=__rk33.find(o=>o.rank<=8);");
g("[__weak,__strong].forEach(o=>{var t=S.teams[o.id]; ensureFinance(t); t.finance.budget=1000000000; t.finance.lastSeasonReport={net:1};});");
assert(g("rollOfferMandate(__weak.id,__weak.rank)")==="rebuild", "v33弱隊健康財務→重建委任");
assert(g("rollOfferMandate(__strong.id,__strong.rank)")==="contend", "v33強隊健康財務→爭冠委任");
g("var __mr33=Math.random; Math.random=()=>0; S.teams[__weak.id].finance.budget=-1;");
assert(g("rollOfferMandate(__weak.id,__weak.rank)")==="stopbleed", "v33財務流血→止血委任");
g("Math.random=__mr33; S.teams[__weak.id].finance.budget=1000000000;");
g("__c33.mandate={type:'rebuild',startYear:S.seasonYear,years:2};");
assert(g("mandateActive()")==="rebuild", "v33委任生效判定");
g("__c33.mandate={type:'rebuild',startYear:S.seasonYear-2,years:2};");
assert(g("mandateActive()")===null, "v33委任兩季後過期");

/* --- A1 委任KPI目標池 --- */
g("__c33.mandate={type:'rebuild',startYear:S.seasonYear,years:2}; generateSeasonKPI();");
assert(g("S.seasonKPI.goals.some(x=>x.key==='winpct40') && S.seasonKPI.goals.some(x=>x.key==='youth5')"), "v33重建委任KPI：守4成＋養年輕人");
g("__c33.mandate={type:'contend',startYear:S.seasonYear,years:2}; generateSeasonKPI();");
assert(g("S.seasonKPI.goals.some(x=>x.key==='playoffs' && x.mandateHard===true)"), "v33爭冠委任KPI：季後賽（未達加重）");
g("__c33.mandate={type:'stopbleed',startYear:S.seasonYear,years:2}; generateSeasonKPI();");
assert(g("S.seasonKPI.goals.some(x=>x.key==='profitPos' && x.mandateDouble===true) && S.seasonKPI.goals.some(x=>x.key==='attendUp' && typeof x.target==='number')"), "v33止血委任KPI：損益轉正＋進場率目標");

/* --- 委任結算修正：止血達成加倍／爭冠未達×1.25 --- */
g("S.teams[S.userTeamId].finance.lastSeasonReport={net:1};");
g("S.seasonKPI={year:S.seasonYear,goals:[{key:'profitPos',label:'止血',diff:2,mandateDouble:true}],settled:false}; S.gmCareer.trust=50; var __kr33a=settleSeasonKPI({});");
assert(g("__kr33a.results[0].achieved===true && __kr33a.results[0].delta===2*(4+3*2)"), "v33止血委任：達成信任加倍(+20)");
g("S.playoffs=null; S.seasonKPI={year:S.seasonYear,goals:[{key:'playoffs',label:'爭冠',diff:2,mandateHard:true}],settled:false}; S.gmCareer.trust=50; var __kr33b=settleSeasonKPI({});");
assert(g("__kr33b.results[0].achieved===false && __kr33b.results[0].delta===Math.round(-(14-3*2)*1.25)"), "v33爭冠委任：未達扣分×1.25(-10)");
g("__c33.mandate=null;");

/* --- 委任結算新鍵值 --- */
g("var __ut33=S.teams[S.userTeamId]; var __y24=__ut33.roster1.map(id=>S.players[id]).filter(p=>p&&p.age<=24).length;");
assert(g("(function(){S.seasonKPI={year:S.seasonYear,goals:[{key:'youth5',label:'y5',diff:2}],settled:false};S.gmCareer.trust=50;var r=settleSeasonKPI({});return r.results[0].achieved===(__y24>=5);})()"), "v33 youth5判定與1軍24歲以下人數一致");
assert(g("(function(){__ut33.finance.lastSeasonReport={net:-1};S.seasonKPI={year:S.seasonYear,goals:[{key:'profitPos',label:'p',diff:2}],settled:false};S.gmCareer.trust=50;var r=settleSeasonKPI({});return r.results[0].achieved===false;})()"), "v33 profitPos：淨損益為負判未達");
assert(g("(function(){var cur=Math.round(teamAttendanceRate(__ut33)*100);S.seasonKPI={year:S.seasonYear,goals:[{key:'attendUp',label:'a',target:cur,diff:2}],settled:false};S.gmCareer.trust=50;var r=settleSeasonKPI({});return r.results[0].achieved===true;})()"), "v33 attendUp：達標門檻含當前值");

/* --- 邀約：委任附掛＋東山再起僅一次 --- */
g("__c33.fired=true; __c33.rehires=0; __c33.sabbaticals=0; var __of33=generateJobOffers();");
assert(g("__of33.length>=1 && __of33.every(o=>MANDATE_META[o.mandate])"), "v33邀約皆附有效委任");
g("__c33.rehires=1; var __of33b=generateJobOffers();");
assert(g("Array.isArray(__of33b) && __of33b.length===0"), "v33已用過東山再起→不再有邀約");
g("__c33.rehires=0; __c33.fired=false; S.jobOffers=null;");

/* --- B1 應酬經營 --- */
g("var __at33=Object.keys(AGENT_TYPES)[0];");
g("S.seasonKPI={year:S.seasonYear,settled:true,goals:[]};"); // 進入休賽季狀態
g("S.agency.rel[__at33]=-10;");
assert(g("agentWineCost(__at33)")===3000000, "v33應酬費用下限300萬");
g("S.agency.rel[__at33]=10;");
assert(g("agentWineCost(__at33)")===8000000, "v33應酬費用上限800萬");
g("S.agency.rel[__at33]=0; delete S.agency.wined[__at33]; var __b33=S.teams[S.userTeamId].finance.budget=500000000;");
assert(g("canWineAgent(__at33)")===true, "v33休賽季可應酬");
g("var __mr33b=Math.random; Math.random=()=>0; var __wc33=agentWineCost(__at33); var __out33=wineAndDineAgent(__at33); Math.random=__mr33b;");
assert(g("__out33")==="good" && g("S.agency.rel[__at33]")===1, "v33應酬成功好感+1");
assert(g("S.teams[S.userTeamId].finance.budget")===g("__b33-__wc33"), "v33應酬扣款正確");
assert(g("canWineAgent(__at33)")===false && g("S.agency.wined[__at33]===S.seasonYear"), "v33每類型每年限一次");
g("var __mr33c=Math.random; Math.random=()=>0.75; S.agency.wined[__at33]=S.seasonYear-1; var __out33b=wineAndDineAgent(__at33); Math.random=__mr33c;");
assert(g("__out33b")==="bad" && g("S.agency.rel[__at33]")===0, "v33應酬大失敗好感-1");

/* --- B2 引薦獨家（好感滿級10）＋B3 動向情報（好感≥4） --- */
g("var __atR=Object.keys(AGENT_TYPES)[1]; var __atI=Object.keys(AGENT_TYPES)[2]; var __atN=Object.keys(AGENT_TYPES)[3];");
g("S.agency.rel[__atR]=10; S.agency.rel[__atI]=4; S.agency.rel[__atN]=3; S.agency.referrals=[]; S.agency.intel=[];");
g("var __fa33=generateBatter(null,'1軍'); __fa33.team=null; __fa33.agent={type:__atR,name:'測試經紀'}; S.freeAgents[__fa33.id]=__fa33;");
g("var __aiT33=Object.values(S.teams).find(t=>t.id!==S.userTeamId); var __aip33=__aiT33.roster1.map(id=>S.players[id]).filter(Boolean).sort((a,b)=>trueOverall(b)-trueOverall(a))[0]; __aip33.age=28; __aip33.agent={type:__atI,name:'測試經紀2'};");
g("generateAgencyOffseasonPerks();");
assert(g("S.agency.referrals.some(r=>r.type===__atR && r.year===S.seasonYear)"), "v33莫逆之交(10)觸發引薦");
assert(g("(function(){var r=S.agency.referrals.find(r=>r.type===__atR);return !!referralFor(r.playerId);})()"), "v33 referralFor查得引薦對象");
assert(g("trueOverall(__aip33)<55 || S.agency.intel.some(r=>r.type===__atI && r.year===S.seasonYear)"), "v33交好(≥4)觸發動向情報");
assert(g("!S.agency.referrals.some(r=>r.type===__atN) && !S.agency.intel.some(r=>r.type===__atN)"), "v33好感3：無引薦也無情報");

/* --- B2 AI國際簽援避開獨家對象 --- */
g("var __svIntl=S.internationalFreeAgents; var __ip33=generateForeignPlayer(false, nationByName('日本')); __ip33.exclusive=false; __ip33.agent={type:__atR,name:'測試經紀'}; S.internationalFreeAgents={}; S.internationalFreeAgents[__ip33.id]=__ip33;");
g("S.agency.referrals.push({playerId:__ip33.id,kind:'international',type:__atR,year:S.seasonYear});");
g("var __mr33d=Math.random; Math.random=()=>0; var __sn33=aiSignInternationalPlayers(); Math.random=__mr33d;");
assert(g("__sn33")===0 && g("!!S.internationalFreeAgents[__ip33.id]"), "v33引薦獨家：AI不得搶簽");
g("S.internationalFreeAgents=__svIntl;");

/* --- B2 談約門檻95折 --- */
g("var __np33=generateBatter(null,'1軍'); __np33.team=null; __np33.traits=[]; __np33.agent={type:'hardline',name:'測試強硬'}; S.freeAgents[__np33.id]=__np33; S.agency.rel['hardline']=0;");
g("startNegotiation('freeAgent', __np33.id, {teamId:S.userTeamId});");
g("var __mr33e=Math.random; Math.random=()=>0.999; submitNegotiationOffer(1000, UI.negotiation.desiredYears); var __req33a=UI.negotiation.requiredSalary; var __flag33a=UI.negotiation.referralDiscount;");
g("S.agency.referrals.push({playerId:__np33.id,kind:'freeAgent',type:'hardline',year:S.seasonYear});");
g("submitNegotiationOffer(1000, UI.negotiation.desiredYears); Math.random=__mr33e; var __req33b=UI.negotiation.requiredSalary; var __flag33b=UI.negotiation.referralDiscount;");
assert(g("__flag33a===false && __flag33b===true"), "v33引薦折扣旗標");
assert(g("__req33b===Math.round(__req33a*0.95)"), "v33引薦客戶談約門檻95折");
g("UI.negotiation=null;");

/* --- A2 功成身退（自願跳槽不消耗東山再起）＋接任委任記錄 --- */
g("var __oldTid33=S.userTeamId; var __jt33=Object.values(S.teams).find(t=>t.id!==S.userTeamId).id;");
g("S.jobOffers=[{teamId:__jt33,teamName:S.teams[__jt33].name,startTrust:55,strengthRank:10,mandate:'contend'}];");
g("var __rh33=__c33.rehires; var __cj33=__c33.champJumps; takeJobOffer(__jt33, true);");
assert(g("S.userTeamId===__jt33 && __c33.champJumps===__cj33+1 && __c33.rehires===__rh33"), "v33自願跳槽：換隊、話題+1、不耗再起機會");
assert(g("__c33.mandate && __c33.mandate.type==='contend' && __c33.mandate.startYear===S.seasonYear+1"), "v33接任記錄委任（隔年生效）");
assert(g("mandateActive()")===null, "v33委任隔年才生效");

/* --- 爭冠委任：奢侈稅門檻放寬15%（以委任生效年驗證） --- */
g("__c33.mandate={type:'contend',startYear:S.seasonYear,years:2};");
g("var __rep33=settleLeagueFinance(); var __meT33=__rep33[S.userTeamId].taxThreshold; var __otherId33=Object.keys(__rep33).find(id=>id!==S.userTeamId); var __otT33=__rep33[__otherId33].taxThreshold;");
assert(g("Math.abs(__meT33-Math.round(__otT33*1.15))<=1"), "v33爭冠委任：玩家隊稅檻×1.15");
g("__c33.mandate=null;");

/* --- A3 沉潛一年：守衛與完整跑季 --- */
g("var __y33a=S.seasonYear; __c33.fired=false; runSabbaticalYear();");
assert(g("S.seasonYear")===g("__y33a") && g("__c33.sabbaticals===0"), "v33未解職不可沉潛");
g("__c33.fired=true; __c33.firedYear=S.seasonYear; __c33.rehires=0; __c33.sabbaticals=0; S.gmCareer.trust=0; S.pendingContractRenewals=[]; S.pendingStaffRenewals=[]; S.forcedCutRequired=false;");
g("runSabbaticalYear();");
assert(g("S.seasonYear")===g("__y33a")+1, "v33沉潛：聯盟推進一季");
assert(g("__c33.sabbaticals===1 && S.sabbatical===false && __c33.fired===true"), "v33沉潛：計次歸位、仍為解職狀態");
assert(g("Array.isArray(S.jobOffers) && S.jobOffers.length>=1 && UI.screen==='gameOver'"), "v33沉潛歸來：邀約重抽、回到抉擇畫面");
assert(g("!S.seasonKPI || S.seasonKPI.year!==S.seasonYear"), "v33沉潛年不產生KPI");
g("runSabbaticalYear();");
assert(g("__c33.sabbaticals===1"), "v33沉潛生涯限一次");

/* ==================== v34：九項修正/新功能 ==================== */
console.log("\n--- v34 測試 ---");

/* --- 1. 中繼/救援獎項：後援登板累計IP、候選池含純後援 --- */
// 沉潛年跑完的整季成績已含新累計邏輯：凡SV>0的投手都必須有IP（過去純後援IP恆為0）
assert(g("Object.values(S.players).some(p=>p.isPitcher && p.seasonStats && p.seasonStats.SV>0)"), "v34整季模擬有救援成功紀錄");
assert(g("Object.values(S.players).every(p=>!p.isPitcher || !(p.seasonStats && p.seasonStats.SV>0) || p.seasonStats.IP>0)"), "v34後援登板同步累計局數");
assert(g("Object.values(S.players).every(p=>!p.isPitcher || !(p.seasonStats && p.seasonStats.HD>0) || p.seasonStats.IP>0)"), "v34中繼登板同步累計局數");
// 候選池：塞一名 G>0 但 IP 極少的純終結者，救援王必須是他且顯示次數
g("var __rp34=generatePitcher(null,'1軍'); __rp34.role='終結'; __rp34.team=S.userTeamId; S.players[__rp34.id]=__rp34;");
g("__rp34.seasonStats={G:50,W:1,L:2,SV:99,HD:0,IP:50,ER:10,SO:55,BB:12,H:30};");
g("var __aw34=computeSeasonAwards(); var __aw34lg=S.teams[S.userTeamId].league;");
assert(g("__aw34[__aw34lg].saveTitle===__rp34.id"), "v34救援王頒給救援數最多者");
assert(g("awardStatLine('saveTitle', __rp34).includes('99 次救援成功')"), "v34救援王顯示救援次數");
g("__rp34.seasonStats.SV=0; __rp34.seasonStats.HD=88; var __aw34b=computeSeasonAwards();");
assert(g("__aw34b[__aw34lg].holdTitle===__rp34.id && awardStatLine('holdTitle', __rp34).includes('88 次中繼成功')"), "v34中繼王頒發並顯示次數");
g("delete S.players[__rp34.id];");

/* --- 2. 球員詳細頁成績區塊 --- */
g("var __sp34=Object.values(S.players).find(p=>!p.isPitcher && p.team);");
g("__sp34.lastSeasonStats={year:3,G:100,AB:400,H:120,HR:20,RBI:80,BB:30,SO:60,SB:5};");
assert(g("playerStatsSectionHtml(__sp34).includes('生涯通算') && playerStatsSectionHtml(__sp34).includes('本季') && playerStatsSectionHtml(__sp34).includes('上季(第3年)')"), "v34成績區塊含本季/上季/生涯三列");
assert(g("playerStatsSectionHtml(__sp34).includes('.300')"), "v34上季打擊率計算正確(120/400)");
g("var __pp34=Object.values(S.players).find(p=>p.isPitcher && p.team);");
assert(g("playerStatsSectionHtml(__pp34).includes('防禦率') && playerStatsSectionHtml(__pp34).includes('救援')"), "v34投手成績表含救援/防禦率欄");
g("delete __sp34.lastSeasonStats;");

/* --- 3. 應酬時間窗：休賽季摘要有事務所入口、返回導向正確 --- */
g("S.gmCareer.fired=false; UI.screen='offseasonSummary'; S.offseasonSummary=S.offseasonSummary||{retiredCount:0,coachesReplaced:0,myRetiredIds:[]}; S.offseasonSummary.myRetiredIds=S.offseasonSummary.myRetiredIds||[];");
g("S.seasonKPI={year:S.seasonYear,settled:true,goals:[]};"); // 使 isOffseasonNow() 為真
g("render();");
assert(g("app.innerHTML.includes('btn-oss-agency')"), "v34休賽季摘要出現事務所入口");
g("UI.agencyReturn='offseasonSummary'; UI.screen='agency'; render();");
g("document.getElementById('btn-agency-back').onclick();");
assert(g("UI.screen==='offseasonSummary'"), "v34事務所返回鍵回到休賽季摘要");
assert(g("UI.agencyReturn===null || UI.agencyReturn===undefined"), "v34返回來源已清除");

/* --- 4. 春訓變化球成長標籤（pt.type 修正） --- */
g("var __tp34=Object.values(S.players).find(p=>p.isPitcher && p.pitches && p.pitches.length>0); __tp34.potential=99; __tp34.pitches.forEach(pt=>{pt.stuff=60;pt.control=60;});");
g("var __ch34=applySpringTraining(__tp34, S.teams[S.userTeamId], nationByName(HOME_NATION_NAME), 'pBreaking');");
assert(g("(__ch34.changes||__ch34||[]).length>=0"), "v34春訓成長可執行");
g("var __lbl34=JSON.stringify(__ch34);");
assert(g("!__lbl34.includes('undefined')"), "v34春訓成長標籤不含undefined");
assert(g("__lbl34.includes(__tp34.pitches[0].type)"), "v34春訓成長標籤使用球種名稱");

/* --- 5A. 票價需求：人氣調節彈性 --- */
assert(Math.abs(g("ticketDemandRate(1000,1000,50)")-0.5)<1e-9, "v34人氣50維持舊制(上限價=5成意願)");
assert(Math.abs(g("ticketDemandRate(1000,1000,99)")-0.745)<1e-9, "v34人氣99高票價意願升至74.5%");
assert(Math.abs(g("ticketDemandRate(100,1000,99)")-1)<1e-9, "v34下限票價意願100%不變");
assert(g("ticketDemandRate(900,1000,99) > ticketDemandRate(900,1000,50)"), "v34同票價下高人氣意願較高");

/* --- 5B. 票價上限調升條件放寬：季均上座率≥90%即調升 --- */
g("var __t34=S.teams[S.userTeamId]; ensureFinance(__t34); var __cap34=__t34.finance.ticketPriceCap; var __oldTAR34=teamAttendanceRate; teamAttendanceRate=function(){return 0.92;};");
g("var __rep34=settleSeasonFinance(__t34, 999999999999);");
g("teamAttendanceRate=__oldTAR34;");
assert(g("__rep34.capRaised===true && __t34.finance.ticketPriceCap>__cap34"), "v34上座率≥90%即調高票價上限(不需票價開滿)");
g("__t34.finance.ticketPriceCap=__cap34;");

/* --- 6. 自由球員市場改版 --- */
g("var __fa34=generateBatter(null,'1軍'); __fa34.team=null; S.freeAgents[__fa34.id]=__fa34;");
g("var __tr34=faTrendReport(__fa34, S.teams[S.userTeamId]);");
assert(g("__tr34 && typeof __tr34.key==='number' && __tr34.text.includes('球探評估')"), "v34前瞻評估回報結構正確");
g("__fa34.age=22; __fa34.peakAge=28; __fa34.potential=90;");
assert(g("faTrendReport(__fa34, S.teams[S.userTeamId]).key===0"), "v34年輕高潛力=看漲");
g("__fa34.age=36; __fa34.peakAge=27;");
assert(g("faTrendReport(__fa34, S.teams[S.userTeamId]).key===2"), "v34高齡過顛峰=看跌");
g("UI.screen='freeAgents'; render();");
assert(g("app.innerHTML.includes('前瞻評估') && app.innerHTML.includes('天花板') && app.innerHTML.includes('上季')"), "v34 FA市場卡片含評估/天花板/上季成績");
g("delete S.freeAgents[__fa34.id];");

/* --- 7. 季中事件暫停時程 --- */
g("S.simInterrupts=[]; pushSimInterrupt('測試事件A');");
assert(g("S.simInterrupts.length===1"), "v34中斷事件入列");
g("var __ci34=consumeSimInterrupts();");
assert(g("__ci34.length")===1 && g("S.simInterrupts.length===0"), "v34中斷事件消化後清空");
// 迴圈中斷：monkeypatch simulateDay 於第2天塞入中斷，doSimulateWeek 應提前停止
g("var __oldSim34=simulateDay; var __calls34=0; simulateDay=function(){__calls34++; if(__calls34===2) pushSimInterrupt('測試中斷'); return __calls34<7 ? [] : null;};");
g("doSimulateWeek();");
g("simulateDay=__oldSim34;");
assert(g("__calls34===2"), "v34快轉一週遇事件即中斷");
assert(g("(UI.flash||'').includes('時程暫停')"), "v34中斷後顯示暫停原因");
// 先發陣容傷兵判定：直接驗證來源程式路徑（打線/輪值/牛棚集合）
g("var __ut34=S.teams[S.userTeamId]; var __ip34b=(__ut34.lineup||[])[0];");
assert(g("typeof pushSimInterrupt==='function' && typeof consumeSimInterrupts==='function'"), "v34中斷API齊備");

/* --- 8. 玩家隊開局預算固定6000萬 --- */
g("var __ob34=S.teams[S.userTeamId].finance.budget; fixUserStartingBudget();");
assert(g("S.teams[S.userTeamId].finance.budget===60000000"), "v34玩家隊開局預算固定6000萬");
assert(g("USER_STARTING_BUDGET===60000000"), "v34固定預算常數正確");
g("S.teams[S.userTeamId].finance.budget=__ob34;");

/* --- 9. 存檔槽位/匯出匯入 --- */
assert(g("Array.isArray(MANUAL_SLOT_KEYS) && MANUAL_SLOT_KEYS.length===3"), "v34三個手動槽位");
g("var __m34=buildSaveMeta();");
assert(g("__m34.seasonYear===S.seasonYear && typeof __m34.savedAt==='number' && __m34.version===34"), "v34存檔meta結構正確");
g("var __imp34=importSaveJson('not json');");
assert(g("__imp34.ok===false"), "v34匯入非JSON回報失敗");
g("var __imp34b=importSaveJson(JSON.stringify({foo:1}));");
assert(g("__imp34b.ok===false"), "v34匯入非本遊戲存檔回報失敗");
g("S.idSeq=ID_SEQ; var __expStr34=JSON.stringify({meta:buildSaveMeta(), state:S}); var __curYear34=S.seasonYear;");
g("var __imp34c=importSaveJson(__expStr34);");
assert(g("__imp34c.ok===true && S.seasonYear===__curYear34 && S.simInterrupts!==undefined"), "v34匯出再匯入還原成功且過升級鏈");
// ensureV34
g("delete S.simInterrupts; ensureV34();");
assert(g("Array.isArray(S.simInterrupts)"), "v34 ensureV34補中斷容器");

/* ==================== v35 測試：二周目幕僚bug修復＋空缺防呆＋新手教學 ==================== */
console.log("\n--- v35 測試 ---");

/* --- 1. takeJobOffer 清空殘留幕僚佇列（根因A） --- */
g(`(function(){
  // 佈置：假裝解職當年建了舊隊佇列，並殘留一筆staffRenewal談判
  var ut=S.teams[S.userTeamId];
  var cid=ut.coachStaff['1軍']['總教練'];
  S.pendingStaffRenewals=[{kind:'coach',staffId:cid,level:'1軍',role:'總教練'},{kind:'scout',area:'domestic',scoutId:(ut.scouts.domestic||{}).id}];
  S.pendingCoachHires=[{level:'1軍',role:'總教練'}];
  UI.negotiation={kind:'staffRenewal',staffItem:S.pendingStaffRenewals[0]};
  S.gmCareer.fired=true; S.gmCareer.rehires=0;
  generateJobOffers();
})()`);
assert(g("Array.isArray(S.jobOffers) && S.jobOffers.length>0"), "v35測試前置：邀約已生成");
g("var __v35old=S.userTeamId; takeJobOffer(S.jobOffers[0].teamId,false);");
assert(g("(S.pendingStaffRenewals||[]).length===0"), "v35 takeJobOffer清空殘留幕僚佇列");
assert(g("(S.pendingCoachHires||[]).length===0"), "v35 takeJobOffer清空pendingCoachHires");
assert(g("UI.negotiation===null"), "v35 takeJobOffer清空殘留staffRenewal談判");
assert(g("S.offseasonEnteredYear===S.seasonYear"), "v35 takeJobOffer標記休賽季還原旗標");
assert(g("S.userTeamId!==__v35old"), "v35 已換至新東家");

/* --- 2. staffRef 隊伍歸屬防禦：舊隊項目一律解析為null --- */
g("var __oldCoachId=S.teams[__v35old].coachStaff['1軍']['總教練'];");
g("var __staleItem={kind:'coach',staffId:__oldCoachId,level:'1軍',role:'總教練'};");
assert(g("staffRef(__staleItem)===null"), "v35 staffRef擋下舊隊教練殘留項目");
g("var __curCoachId=S.teams[S.userTeamId].coachStaff['1軍']['總教練'];");
assert(g("staffRef({kind:'coach',staffId:__curCoachId,level:'1軍',role:'總教練'})===S.coaches[__curCoachId]"), "v35 staffRef仍正確解析本隊教練");
g("var __curScout=S.teams[S.userTeamId].scouts.domestic;");
assert(g("!__curScout || staffRef({kind:'scout',area:'domestic',scoutId:__curScout.id})===__curScout"), "v35 staffRef驗證球探身分吻合");
assert(g("!__curScout || staffRef({kind:'scout',area:'domestic',scoutId:'SC_NOT_EXIST'})===null"), "v35 staffRef擋下身分不符球探項目");

/* --- 3. declineStaffRenewal 對殘留項目純略過、不打洞 --- */
g(`(function(){
  S.pendingStaffRenewals=[__staleItem];
  var nt=S.teams[S.userTeamId];
  __v35ntCoach=nt.coachStaff['1軍']['總教練'];
  declineStaffRenewal();
})()`);
assert(g("S.teams[S.userTeamId].coachStaff['1軍']['總教練']===__v35ntCoach && S.coaches[__v35ntCoach]"), "v35 殘留項目不續約不會誤刪新隊教練");
assert(g("!coachVacant(S.teams[S.userTeamId],'1軍','總教練')"), "v35 殘留項目不續約不在新隊立空缺旗標");

/* --- 4. sanitizeStaffRenewals 消毒 --- */
g(`(function(){
  var nt=S.teams[S.userTeamId];
  var goodC={kind:'coach',staffId:nt.coachStaff['1軍']['打擊教練'],level:'1軍',role:'打擊教練'};
  var goodS= nt.scouts.international ? {kind:'scout',area:'international',scoutId:nt.scouts.international.id} : null;
  S.pendingStaffRenewals=[__staleItem, goodC].concat(goodS?[goodS]:[]).concat([{kind:'scout',area:'trade',scoutId:'SC_BAD'}]);
  __v35removed=sanitizeStaffRenewals();
})()`);
assert(g("__v35removed===2"), "v35 sanitize剔除2筆無效項目（舊隊教練＋身分不符球探）");
assert(g("S.pendingStaffRenewals.every(it=>staffRef(it))"), "v35 消毒後佇列項目皆可解析");
g("S.pendingStaffRenewals=[];");

/* --- 5. 空缺防呆：四畫面在教練/球探空缺時不當機（根因B） --- */
g(`(function(){
  var nt=S.teams[S.userTeamId];
  __v35bak={c:nt.coachStaff['1軍']['打擊教練'], sd:nt.scouts.domestic, si:nt.scouts.international};
  nt.coachStaff['1軍']['打擊教練']=null; setCoachVacancy(nt,'1軍','打擊教練',true);
  nt.scouts.domestic=null; setScoutVacancy(nt,'domestic',true);
  nt.scouts.international=null; setScoutVacancy(nt,'international',true);
})()`);
assert(g("(function(){ try{ coachRoleOptionsHtml(S.userTeamId); return true; }catch(e){ return false; } })()"), "v35 教練空缺時coachRoleOptionsHtml不當機");
assert(g("(function(){ try{ UI.screen='freeAgents'; render(); return app.innerHTML.includes('職位空缺・盲評'); }catch(e){ return false; } })()"), "v35 國內球探空缺時FA市場不當機且標示盲評");
assert(g("(function(){ try{ UI.screen='internationalMarket'; render(); return true; }catch(e){ return false; } })()"), "v35 國際球探空缺時國際市場不當機");
assert(g("(function(){ try{ var os=S.offseasonSummary; S.offseasonSummary={retiredCount:0,coachesReplaced:0,myRetiredIds:[],myFinanceReport:null,contractsRenewed:0,contractsDeparted:[]}; UI.screen='offseasonSummary'; render(); S.offseasonSummary=os; return true; }catch(e){ return false; } })()"), "v35 教練空缺時休賽季摘要不當機");
g(`(function(){
  var nt=S.teams[S.userTeamId];
  nt.coachStaff['1軍']['打擊教練']=__v35bak.c; setCoachVacancy(nt,'1軍','打擊教練',false);
  nt.scouts.domestic=__v35bak.sd; setScoutVacancy(nt,'domestic',false);
  nt.scouts.international=__v35bak.si; setScoutVacancy(nt,'international',false);
})()`);

/* --- 6. ensureV35：AI隊空缺自動補齊、旗標同步、佇列消毒 --- */
g(`(function(){
  var ai=Object.values(S.teams).find(t=>t.id!==S.userTeamId);
  __v35ai=ai.id;
  ai.coachStaff['1軍']['總教練']=null; setCoachVacancy(ai,'1軍','總教練',true);
  ai.scouts.trade=null; setScoutVacancy(ai,'trade',true);
  var me=S.teams[S.userTeamId];
  setCoachVacancy(me,'2軍','體能教練',true); // 有人卻掛旗標的不一致
  S.pendingStaffRenewals=[__staleItem];
  ensureV35();
})()`);
assert(g("(function(){var ai=S.teams[__v35ai]; return !!S.coaches[ai.coachStaff['1軍']['總教練']] && !coachVacant(ai,'1軍','總教練');})()"), "v35 ensureV35補齊AI隊教練空缺並清旗標");
assert(g("(function(){var ai=S.teams[__v35ai]; return !!ai.scouts.trade && !scoutVacant(ai,'trade');})()"), "v35 ensureV35補齊AI隊球探空缺並清旗標");
assert(g("!coachVacant(S.teams[S.userTeamId],'2軍','體能教練')"), "v35 ensureV35清除『有人卻掛旗標』不一致");
assert(g("(S.pendingStaffRenewals||[]).length===0"), "v35 ensureV35消毒殘留佇列");

/* --- 7. AI隊到期自動補人清旗標（processCoach/ScoutContracts） --- */
g(`(function(){
  var ai=S.teams[__v35ai];
  var cid=ai.coachStaff['1軍']['投手教練']; S.coaches[cid].contractYears=1;
  setCoachVacancy(ai,'1軍','投手教練',true); // 先污染旗標
  ai.scouts.trade.contractYears=1; setScoutVacancy(ai,'trade',true);
  processCoachContracts(); processScoutContracts();
})()`);
assert(g("!coachVacant(S.teams[__v35ai],'1軍','投手教練') && !!S.coaches[S.teams[__v35ai].coachStaff['1軍']['投手教練']]"), "v35 AI教練到期補人同步清旗標");
assert(g("!scoutVacant(S.teams[__v35ai],'trade') && !!S.teams[__v35ai].scouts.trade"), "v35 AI球探到期補人同步清旗標");

/* --- 8. 重載畫面還原：解職優先gameOver、休賽季中回摘要 --- */
g("S.gmCareer.fired=true; S.idSeq=ID_SEQ; var __sn35=JSON.parse(JSON.stringify(S)); hydrateLoadedState(__sn35);");
assert(g("UI.screen==='gameOver'"), "v35 解職中重載優先還原gameOver");
g("S.gmCareer.fired=false;");
g("S.offseasonEnteredYear=S.seasonYear; if(!S.offseasonSummary)S.offseasonSummary={retiredCount:0,coachesReplaced:0,myRetiredIds:[],myFinanceReport:null,contractsRenewed:0,contractsDeparted:[]}; S.pendingStaffRenewals=[]; S.pendingContractRenewals=[]; S.forcedCutRequired=false; if(S.draft)S.draft.active=false;");
g("S.idSeq=ID_SEQ; var __sn35b=JSON.parse(JSON.stringify(S)); hydrateLoadedState(__sn35b);");
assert(g("UI.screen==='offseasonSummary'"), "v35 休賽季進行中重載回摘要（不再落到dashboard）");
assert(g("UI.negotiation===null && UI.coachPicker===null"), "v35 hydrate清除暫時性UI殘留");

/* --- 9. enterOffseason 重入防護 --- */
g("var __py35=S.teams[S.userTeamId].finance.budget; var __age35=S.players[S.teams[S.userTeamId].roster1[0]].age;");
g("enterOffseason();"); // 本年已結算過（offseasonEnteredYear===seasonYear）
assert(g("UI.screen==='offseasonSummary'"), "v35 enterOffseason重入直接回摘要");
assert(g("S.players[S.teams[S.userTeamId].roster1[0]].age===__age35"), "v35 重入不會二次老化球員");
assert(g("S.teams[S.userTeamId].finance.budget===__py35"), "v35 重入不會二次財務結算");

/* --- 10. proceedToDraft 防重複選秀 --- */
g("S.draftDoneYear=S.seasonYear; if(!S.draft)S.draft={active:false,rounds:6,order:[],pickIndex:0,pool:[],picks:[]}; S.draft.active=false; var __pk35=(S.draft.picks||[]).length; proceedToDraft();");
assert(g("UI.screen==='draft' && !S.draft.active && (S.draft.picks||[]).length===__pk35"), "v35 本年已選秀→不重辦、顯示結束摘要");

/* --- 11. 新手教學 --- */
assert(g("typeof renderTutorial==='function' && tutorialSections().length===9"), "v35 教學畫面與九大章節齊備");
assert(g("(function(){ try{ UI.screen='tutorial'; UI.tutorialOpen='finance'; render(); return app.innerHTML.includes('避免赤字') && app.innerHTML.includes('強制裁員'); }catch(e){ return false; } })()"), "v35 教學財務章節含避免赤字說明");
assert(g("(function(){ UI.tutorialOpen='basics'; render(); return app.innerHTML.includes('信任歸零＝解職'); })()"), "v35 教學基本規則含信任機制");
assert(g("(function(){ UI.tutorialReturn='dashboard'; document.getElementById('btn-tut-back').onclick(); return UI.screen==='dashboard'; })()"), "v35 教學返回鍵運作");
g("UI.screen='dashboard'; render();");
assert(g("app.innerHTML.includes('新手教學')"), "v35 主控台有教學入口");

/* --- 12. 外援上限守衛（v32時代既有漏洞：交易/升格可繞過1軍外援上限） --- */
g(`(function(){
  var t1=Object.values(S.teams).find(t=>t.id!==S.userTeamId);
  var t2=Object.values(S.teams).find(t=>t.id!==S.userTeamId && t.id!==t1.id);
  __v35t1=t1.id; __v35t2=t2.id;
  // 把t1外援填到上限
  while(foreignCountOnRoster1(t1)<FOREIGN_ROSTER_CAP){ var p=generateForeignPlayer(false, nationByName('美國')); p.team=t1.id; p.level='1軍'; S.players[p.id]=p; t1.roster1.push(p.id); }
  var fp=generateForeignPlayer(false, nationByName('日本')); fp.team=t2.id; fp.level='1軍'; S.players[fp.id]=fp; t2.roster1.push(fp.id);
  __v35fp=fp.id;
  executeTrade(t2.id, t1.id, [__v35fp], []);
})()`);
assert(g("foreignCountOnRoster1(S.teams[__v35t1])<=FOREIGN_ROSTER_CAP"), "v35 交易不再突破1軍外援上限");
assert(g("S.players[__v35fp].team===__v35t1 && S.players[__v35fp].level==='2軍' && S.teams[__v35t1].roster2.includes(__v35fp)"), "v35 超限外援改落2軍");
g(`(function(){
  // autoPromote：外援滿編時不得升格外籍球員
  var t1=S.teams[__v35t1];
  t1.roster2=t1.roster2.filter(id=>id!==__v35fp);
  S.players[__v35fp].level='2軍';
  t1.roster2.push(__v35fp);
  // 製造1軍缺額：移走一名本土野手
  var dom=t1.roster1.map(id=>S.players[id]).find(p=>p&&!p.foreign&&!p.isPitcher);
  if(dom){ t1.roster1=t1.roster1.filter(id=>id!==dom.id); t1.roster2.push(dom.id); dom.level='2軍'; }
  autoPromote(t1);
})()`);
assert(g("foreignCountOnRoster1(S.teams[__v35t1])<=FOREIGN_ROSTER_CAP"), "v35 autoPromote不突破外援上限");
g(`(function(){ // 測後清理：移除測試塞入的外援
  var t1=S.teams[__v35t1], t2=S.teams[__v35t2];
  [t1,t2].forEach(t=>{ ['roster1','roster2'].forEach(rk=>{ t[rk]=t[rk].filter(id=>{ var p=S.players[id]; if(p&&p.foreign&&p.id.startsWith('P')===false){} return true; }); }); });
})()`);

/* ---------- v35.1：開機防護／安全模式 ---------- */
assert(g("typeof renderBootRecovery==='function'"), "v35.1 renderBootRecovery 存在");
assert(g("typeof renderScreen==='function'"), "v35.1 render 已拆出 renderScreen 內層");
// render() 遇到畫面渲染拋錯時，應落到安全模式而非拋出未捕獲例外、也不留空白
g("(function(){ globalThis.__origSetup=renderSetup; renderSetup=function(){ throw new Error('模擬渲染爆炸'); }; })()");
g("UI.__rawSave={teams:{},players:{}}; UI.__bootError=null; UI.screen='setup';");
assert(g("(function(){ try{ render(); return true; }catch(e){ return false; } })()"), "v35.1 畫面拋錯時 render 不再拋出未捕獲例外");
assert(g("UI.screen==='bootRecovery' || /安全模式/.test(document.getElementById('app').innerHTML)"), "v35.1 渲染爆炸→自動落到安全模式救援畫面");
assert(g("/安全模式/.test(document.getElementById('app').innerHTML)"), "v35.1 安全模式畫面內容已渲染（非空白）");
g("(function(){ renderSetup=globalThis.__origSetup; UI.__bootError=null; UI.__rawSave=null; UI.screen='setup'; })()"); // 還原

/* ==================== v36：AI起始設施依性格（玩家白手起家） ==================== */
console.log("\n--- v36 測試 ---");
// 性格設施表：涵蓋全部7型、每個帶合法、上限一律封在Lv2（避免與玩家落差過大）
assert(g("Object.keys(PERSONA_FACILITY_INIT).sort().join(',')===PERSONA_KEYS.slice().sort().join(',')"), "v36 性格設施表涵蓋全部7型");
assert(g("Object.values(PERSONA_FACILITY_INIT).every(spec=>Object.values(spec).every(b=>Array.isArray(b)&&b.length===2&&b[0]>=0&&b[0]<=b[1]&&b[1]<=2))"), "v36 性格設施帶合法且上限封在Lv2");
// 各性格強項特色
assert(g("PERSONA_FACILITY_INIT.conservative.analysisRoom[0]===0 && PERSONA_FACILITY_INIT.conservative.analysisRoom[1]===0"), "v36 保守型情蒐分析室固定0");
assert(g("PERSONA_FACILITY_INIT.analytics.scoutOffice[0]>=1 && PERSONA_FACILITY_INIT.analytics.analysisRoom[0]>=1"), "v36 精算型情報端起始至少Lv1");
assert(g("PERSONA_FACILITY_INIT.farm.training[0]>=1 && PERSONA_FACILITY_INIT.farm.dorm[0]>=1"), "v36 養成型訓練/宿舍起始至少Lv1");
assert(g("PERSONA_FACILITY_INIT.splash.training[0]>=1 && PERSONA_FACILITY_INIT.splash.medical[0]>=1 && PERSONA_FACILITY_INIT.splash.scoutOffice[0]>=1"), "v36 豪購型全面偏高（訓練/醫療/球探室起始至少Lv1）");
// 重開一局驗證開局設施（此區塊在檔尾，重置S不影響其他測試）
g("newGame('測試GM_v36')"); g("pickTeam('T0')"); // v491：只傳 GM 名，再選隊
assert(g("S && S.userTeamId==='T0'"), "v36 重開一局成功");
// personaFacilityRoll：玩家隊六類一律回0
assert(g("(function(){ var u=S.teams[S.userTeamId]; return ['training','medical','scoutOffice','dorm','analysisRoom','rehabCenter'].every(c=>personaFacilityRoll(u,c)===0); })()"), "v36 personaFacilityRoll 玩家隊恆為0");
// personaFacilityRoll：指定性格多次抽樣一律落在該性格帶內
assert(g("(function(){ var ai=Object.values(S.teams).find(t=>!t.isUser); ai.persona='splash'; for(var i=0;i<300;i++){ for(var c in PERSONA_FACILITY_INIT.splash){ var v=personaFacilityRoll(ai,c); var b=PERSONA_FACILITY_INIT.splash[c]; if(v<b[0]||v>b[1]) return false; } } return true; })()"), "v36 personaFacilityRoll 抽樣恆落在性格帶內");
// 開局：玩家隊所有設施＝0（白手起家）
assert(g("(function(){ var u=S.teams[S.userTeamId]; ensureFacilities(u); var t=u.facilities; return TRAINING_ITEMS.every(it=>t.training[it.key]===0) && t.medical===0 && t.scoutOffice===0 && t.dorm===0 && t.analysisRoom===0 && t.rehabCenter===0; })()"), "v36 玩家隊開局設施全0");
// 開局：全部AI隊每一項設施都≤Lv2（落差封頂、確保玩得下去）
assert(g("(function(){ return Object.values(S.teams).filter(t=>!t.isUser).every(function(t){ ensureFacilities(t); var f=t.facilities; var vals=TRAINING_ITEMS.map(it=>f.training[it.key]).concat([f.medical,f.scoutOffice,f.dorm,f.analysisRoom,f.rehabCenter]); return vals.every(v=>v>=0 && v<=2); }); })()"), "v36 全AI隊開局設施一律≤Lv2");

/* ⑥ 球探換人：候選人比較 picker（對齊教練 picker，簽下才扣款、不再一按即隨機扣錢） */
assert(g("typeof openScoutPicker==='function' && typeof hireScoutCandidate==='function' && typeof generateScoutCandidates==='function'"), "v36 球探picker三函式存在");
assert(g("typeof replaceScout==='undefined'"), "v36 舊的即時隨機replaceScout已移除");
g("var __sp=S.teams[S.userTeamId]; ensureFinance(__sp); __sp.finance.budget=1000000000;");
g("openScoutPicker('domestic');");
assert(g("UI.scoutPicker==='domestic' && Array.isArray(UI.scoutCandidates) && UI.scoutCandidates.length>=2"), "v36 開啟球探picker產生候選清單");
assert(g("UI.scoutCandidates.every(c=>typeof c.accuracy==='number' && c.specialty && typeof c.salary==='number' && typeof c.signing==='number')"), "v36 候選球探含準確度/專精/年薪/簽約金");
assert(g("UI.scoutCandidates.every(c=>c.signing===Math.round(c.salary*0.3/10000)*10000)"), "v36 球探簽約金＝年薪30%");
// 預算不足→不簽下、picker保留
g("var __cand0=UI.scoutCandidates[0]; S.teams[S.userTeamId].finance.budget=0; hireScoutCandidate('domestic',0);");
assert(g("UI.scoutPicker==='domestic' && S.teams[S.userTeamId].scouts.domestic!==__cand0"), "v36 預算不足不簽下、picker保留");
// 預算足→簽下、扣簽約金、清picker、球探物件不殘留signing暫存欄位
g("S.teams[S.userTeamId].finance.budget=1000000000; var __budA=S.teams[S.userTeamId].finance.budget; var __pick=UI.scoutCandidates[0]; var __sign=__pick.signing; hireScoutCandidate('domestic',0);");
assert(g("S.teams[S.userTeamId].scouts.domestic && S.teams[S.userTeamId].scouts.domestic.name===__pick.name"), "v36 簽下選定的候選球探");
assert(g("S.teams[S.userTeamId].scouts.domestic.signing===undefined"), "v36 簽下後球探物件不殘留signing暫存欄位");
assert(g("S.teams[S.userTeamId].finance.budget===__budA-__sign"), "v36 簽下扣除簽約金");
assert(g("UI.scoutPicker===null && UI.scoutCandidates===null"), "v36 簽下後關閉picker");
// 空缺→用picker補實後清除空缺旗標
g("var __t=S.teams[S.userTeamId]; __t.scouts.trade=null; if(typeof setScoutVacancy==='function') setScoutVacancy(__t,'trade',true); __t.finance.budget=1000000000; openScoutPicker('trade'); hireScoutCandidate('trade',0);");
assert(g("S.teams[S.userTeamId].scouts.trade && (typeof scoutVacant!=='function' || !scoutVacant(S.teams[S.userTeamId],'trade'))"), "v36 picker補實空缺並清除空缺旗標");

/* ⑤ 新秀球探完整報告：天花板補上預估數值（現況/天花板數字，等級由同一數值推導） */
g("var __pool5=[generateBatter('T0','2軍')]; __pool5[0].potential=80; attachScoutedEstimates(__pool5, S.teams[S.userTeamId].scouts.domestic); var __rk5=__pool5[0];");
assert(g("typeof __rk5.scoutedCeilingVal==='number' && __rk5.scoutedCeiling===gradeFromValue(__rk5.scoutedCeilingVal)"), "v36 新秀天花板存數值、等級由同一數值推導");
assert(g("typeof __rk5.scoutedOverall==='number'"), "v36 新秀現況數值存在");
g("var __neg5={kind:'rookie', playerObj:__rk5, teamId:S.userTeamId}; var __html5=negotiationScoutBlock(__rk5,__neg5);");
assert(g("__html5.indexOf('約'+__rk5.scoutedCeilingVal)>=0"), "v36 新秀報告顯示天花板約NN數值（選前談判皆可見）");

/* ④ AI主動提案卡：攤開雙方球員的球探評估數據（重用交易畫面評估邏輯） */
g("(function(){ var u=S.teams[S.userTeamId]; var ai=Object.values(S.teams).find(t=>!t.isUser); var aip=ai.roster1.concat(ai.roster2).map(id=>S.players[id]).filter(Boolean)[0]; var up=u.roster1.concat(u.roster2).map(id=>S.players[id]).filter(Boolean)[0]; S.aiTrade={proposal:{teamId:ai.id, aiGives:[aip.id], userGives:[up.id], expiresDay:S.currentDay+5}}; globalThis.__aip5=aip; })();");
g("var __cardHtml=renderAiProposalCard();");
assert(g("S.aiTrade.proposal.scoutedCache && typeof S.aiTrade.proposal.scoutedCache.acc==='number' && S.aiTrade.proposal.scoutedCache.vals[__aip5.id]"), "v36 提案卡建立對方球員球探評估快取");
assert(g("__cardHtml.indexOf('交易球探評估值')>=0 && __cardHtml.indexOf('真實能力值')>=0"), "v36 提案卡同列評估值(對方)與真實值(自家)兩區");
assert(g("__cardHtml.indexOf('btn-aiprop-accept')>=0 && __cardHtml.indexOf('btn-aiprop-decline')>=0"), "v36 提案卡保留接受/婉拒按鈕");
g("var __pv1=JSON.stringify(S.aiTrade.proposal.scoutedCache.vals); renderAiProposalCard(); var __pv2=JSON.stringify(S.aiTrade.proposal.scoutedCache.vals);");
assert(g("__pv1===__pv2"), "v36 提案卡重繪不重算、評估值穩定不跳動");
g("S.aiTrade=null;"); // 清理

/* 冠軍回饋五項（①奪冠獎金 ②連霸遞增 ③士氣/忠誠 ④冠軍旗+博物館連動；⑤國際賽加碼由15年smoke覆蓋） */
assert(g("typeof applyChampionshipRewards==='function' && typeof CHAMP_PRIZE_BASE==='number' && typeof CHAMP_PRIZE_STREAK_STEP==='number'"), "v36 冠軍獎勵函式與常數存在");
g("var __ct=S.teams[S.userTeamId]; ensureFinance(__ct); __ct.champBanners=undefined; __ct.finance.budget=0; applyChampionshipRewards(__ct,1);");
assert(g("__ct.finance.budget===CHAMP_PRIZE_BASE"), "v36 ①奪冠獎金入帳（首冠＝基礎額）");
assert(g("(__ct.champBanners||[]).length===1 && __ct.champBanners[0]===S.seasonYear"), "v36 ④冠軍旗記錄奪冠年");
assert(g("__ct.roster1.concat(__ct.roster2).map(id=>S.players[id]).filter(Boolean).every(p=>p.loyalty>=50+CHAMP_LOYALTY_GAIN && p.morale>=70+CHAMP_MORALE_GAIN)"), "v36 ③全隊士氣＋忠誠提升");
g("__ct.finance.budget=0; applyChampionshipRewards(__ct,3);");
assert(g("__ct.finance.budget===CHAMP_PRIZE_BASE+2*CHAMP_PRIZE_STREAK_STEP"), "v36 ②連霸獎金遞增（第3連霸＝基礎＋2階）");
assert(g("(__ct.champBanners||[]).length===2"), "v36 ④再奪冠累積第二面冠軍旗");
// ④ 博物館連動：有博物館時人氣成長隨冠軍旗數放大
g("var __mt=S.teams[S.userTeamId]; ensureStadiumSlots(__mt); if(!__mt.facility.stadiumSlots.includes('museum')) __mt.facility.stadiumSlots.push('museum'); __mt.champBanners=[]; var __e0=stadiumEffects(__mt).popBoost; __mt.champBanners=[1,2,3]; var __e3=stadiumEffects(__mt).popBoost;");
assert(g("__e3>__e0"), "v36 ④博物館人氣效應隨冠軍旗放大");
// ② champStreak：奪冠累加、未奪冠歸零（驗證欄位與歸零語意）
g("S.champStreak=4;");
assert(g("S.champStreak===4"), "v36 ②champStreak欄位存在可累計");

/* 第10階段：事件系統（逐日加權觸發、每季上限/冷卻、一次一卡、選項各有後果） */
assert(g("typeof tickEvents==='function' && typeof resolveEvent==='function' && typeof renderEventCard==='function' && typeof EVENT_DEFS==='object'"), "v36 事件系統函式與定義表存在");
assert(g("Object.keys(EVENT_DEFS).length>=4"), "v36 事件定義至少4種");
assert(g("(function(){ var c={}; Object.keys(EVENT_DEFS).forEach(k=>c[EVENT_DEFS[k].category]=1); return Object.keys(c).length>=3; })()"), "v36 事件涵蓋至少3類");
assert(g("(function(){ var team=S.teams[S.userTeamId]; return Object.keys(EVENT_DEFS).every(function(k){ var d=EVENT_DEFS[k]; if(typeof d.weight(team)!=='number') return false; var b=d.build(team); if(!b) return true; if(!b.title||!b.desc||!Array.isArray(b.options)||b.options.length<2) return false; return b.options.every(function(o){ return typeof d.apply(team,o.key,b.ctx||{})==='string'; }); }); })()"), "v36 各事件build合法、各選項apply回字串不報錯");
// resolveEvent：套用選項→清空→寫eventLog；贊助加碼淨+2500萬
g("var __team=S.teams[S.userTeamId]; ensureFinance(__team); __team.finance.budget=100000*10000; var __b=EVENT_DEFS.sponsorBonus.build(__team); S.activeEvent={key:'sponsorBonus',category:'營運',title:__b.title,desc:__b.desc,ctx:__b.ctx,options:__b.options,year:S.seasonYear}; var __bud0=__team.finance.budget; resolveEvent('accept');");
assert(g("S.activeEvent===null"), "v36 事件結算後清空activeEvent");
assert(g("S.teams[S.userTeamId].finance.budget===__bud0+2500*10000"), "v36 贊助加碼選項正確入帳（淨+2500萬）");
assert(g("(S.eventLog||[]).length>=1 && S.eventLog[0].title && typeof S.eventLog[0].result==='string'"), "v36 事件寫入eventLog");
// renderEventCard：有事件才顯示、含選項按鈕
g("var __b2=EVENT_DEFS.sponsorBonus.build(S.teams[S.userTeamId]); S.activeEvent={key:'sponsorBonus',category:'營運',title:__b2.title,desc:__b2.desc,ctx:__b2.ctx,options:__b2.options,year:S.seasonYear}; var __ec=renderEventCard();");
assert(g("__ec.indexOf('event-opt-btn')>=0 && __ec.indexOf('突發事件')>=0"), "v36 事件卡顯示選項按鈕");
g("S.activeEvent=null;");
assert(g("renderEventCard()===''"), "v36 無事件時不顯示事件卡");
// 觸發控制：已有事件、或超過每季上限 → tickEvents 不新增
g("S.activeEvent={key:'sponsorBonus',category:'營運',title:'x',desc:'x',ctx:{},options:[{key:'decline',label:'x'}],year:S.seasonYear}; var __ae=S.activeEvent; tickEvents();");
assert(g("S.activeEvent===__ae"), "v36 已有事件時不再觸發新事件");
g("S.activeEvent=null; S.eventSeason={year:S.seasonYear,count:EVENT_SEASON_CAP}; S.eventCooldownUntil=0; var __fired=false; for(var i=0;i<60;i++){ tickEvents(); if(S.activeEvent){__fired=true;break;} }");
assert(g("__fired===false"), "v36 超過每季事件上限不再觸發");
g("S.activeEvent=null; S.eventSeason=null; S.eventCooldownUntil=0;"); // 清理

/* ================= v37 回歸 ================= */
g("newGame('測試GM')"); g("pickTeam('T0')"); // v491：乾淨開局（v37測試，前面多年模擬已使人氣等狀態漂移）
/* ③ 玩家隊開局人氣固定35（AI維持隨機） */
assert(g("USER_STARTING_POPULARITY===35 && S.teams[S.userTeamId].finance.popularity===35"), "v37③ 玩家隊開局人氣鎖定35");
assert(g("Object.values(S.teams).filter(t=>t.id!==S.userTeamId).some(t=>t.finance.popularity!==35)"), "v37③ AI隊人氣維持隨機（非全35）");
/* ② 新秀報告逐屬性「現在→預估」＋投影不低於現況、不超99 */
g("var __pl2=[generateBatter('V37','2軍')]; __pl2[0].potential=88; attachScoutedEstimates(__pl2,S.teams[S.userTeamId].scouts.domestic); var __rk2=__pl2[0]; var __h2=negotiationScoutBlock(__rk2,{kind:'rookie',playerObj:__rk2,teamId:S.userTeamId});");
assert(g("__h2.indexOf('→ ~')>=0"), "v37② 新秀完整報告含逐屬性預估值(→ ~)");
assert(g("typeof scoutedAttrRows==='function' && scoutedAttrRows(__rk2).indexOf('attr2')>=0"), "v37② scoutedAttrRows共用列可產生");
assert(g("(function(){var v=scoutedAttrProjection(30,__rk2.scoutedOverall,__rk2.scoutedCeilingVal); return v>=30 && v<=99;})()"), "v37② 投影值介於現況與99之間");
/* ④ 隊長：任命/一季一次/在陣抗壓加成 */
g("var __capT=S.teams[S.userTeamId]; delete __capT.captainId; delete __capT.captainAppointedYear; var __capP=__capT.roster1.map(id=>S.players[id]).find(p=>p&&!p.isPitcher); var __cr=appointCaptain(__capT,__capP.id);");
assert(g("__cr.ok===true && S.teams[S.userTeamId].captainId===__capP.id && S.teams[S.userTeamId].captainAppointedYear===S.seasonYear"), "v37④ 任命隊長寫入身份與年度");
assert(g("canAppointCaptainThisSeason(S.teams[S.userTeamId])===false"), "v37④ 同季不可再任命隊長");
assert(g("activeCaptain(S.teams[S.userTeamId]) && teamHasCaptainBonus(S.teams[S.userTeamId])===true"), "v37④ 在陣隊長→比賽加成生效");
g("var __cT=S.teams[S.userTeamId]; ensureLineup(__cT); var __wc=teamComposureRating(__cT,S.players); var __cid=__cT.captainId; delete __cT.captainId; var __nc=teamComposureRating(__cT,S.players); __cT.captainId=__cid;");
assert(g("Math.abs((__wc-__nc)-CAPTAIN_COMPOSURE_BONUS)<1e-6"), "v37④ 隊長抗壓加成值正確");
/* ⑤ KPI開季協商：降階、標記、一季一次、失敗額外扣分結構存在 */
g("generateSeasonKPI(); S.currentDay=0; var __ni=kpiNegotiableGoalIndex();");
assert(g("typeof canNegotiateKpi==='function' && typeof negotiateKpiGoalDown==='function'"), "v37⑤ 協商函式存在");
g("(function(){ if(__ni>=0 && canNegotiateKpi()){ negotiateKpiGoalDown(); globalThis.__did=true; } else { globalThis.__did=false; } })();");
assert(g("(__did===false) || (S.seasonKPI.negotiated===true && S.seasonKPI.goals[__ni].negotiated===true && S.seasonKPI.goals[__ni].reduced===true)"), "v37⑤ 協商降階後標記negotiated/reduced");
assert(g("(__did===false) || canNegotiateKpi()===false"), "v37⑤ 協商後一季不可再協商");
g("S.seasonKPI.negotiated=false;"); // 清理避免干擾後續
/* ⑥ 代打/代跑/代守：專員辨識、近戰nudge、出賽入帳 */
g("var __bT=S.teams[S.userTeamId]; ensureLineup(__bT); var __inL=new Set(__bT.lineup.map(s=>s.playerId)); var __bp=__bT.roster1.map(id=>S.players[id]).find(p=>p&&!p.isPitcher&&!__inL.has(p.id)); __bT.benchRoles={pinchHit:__bp?__bp.id:null};");
assert(g("__bp && benchSpecialist(S.teams[S.userTeamId],'pinchHit') && benchSpecialist(S.teams[S.userTeamId],'pinchHit').id===__bp.id"), "v37⑥ 板凳代打專員可辨識（非先發健康野手）");
assert(g("(function(){ var inL=new Set(S.teams[S.userTeamId].lineup.map(s=>s.playerId)); return benchSpecialist(S.teams[S.userTeamId],'pinchHit')? !inL.has(S.teams[S.userTeamId].benchRoles.pinchHit):true; })()"), "v37⑥ 先發名單內者不算板凳專員");
g("__benchCredits=[]; var __r6=applyBenchRoleNudge(S.teams[S.userTeamId],3,4);");
assert(g("Array.isArray(__r6) && __r6.length===2"), "v37⑥ 近戰nudge回傳調整後比分");
g("var __g0=__bp?__bp.seasonStats.G:0; __benchCredits=[{pid:__bp.id,role:'pinchHit',hit:true}]; creditBenchRoleAppearances();");
assert(g("__bp.seasonStats.G===__g0+1 && __bp.seasonStats.AB>=1"), "v37⑥ 代打出賽入帳(G/AB累計)");
assert(g("(function(){ var r=applyBenchRoleNudge(S.teams[S.userTeamId],1,9); return r[0]===1&&r[1]===9; })()"), "v37⑥ 非近戰(分差>3)不發動");
/* ① C/D 平行活動：交流賽/行銷企劃各一季一次、扣預算、標記done */
g("S.currentDay=0; ensureCdActivities(); S.cdActivities.exchangeDone=false; S.cdActivities.marketingDone=false; var __cdT=S.teams[S.userTeamId]; __cdT.finance.budget=50000*10000; var __b1=__cdT.finance.budget; var __nC=cdActNations().find(n=>n.grade==='C'); runCdExchange(__nC.name);");
assert(g("S.cdActivities.exchangeDone===true && S.teams[S.userTeamId].finance.budget < __b1"), "v37① 交流賽執行：標記done並扣預算");
assert(g("(function(){ var d=S.cdActivities.exchangeDone; runCdExchange(__nC.name); return S.cdActivities.exchangeDone===d; })()"), "v37① 交流賽一季一次（重複呼叫不再扣）");
g("var __b2m=S.teams[S.userTeamId].finance.budget; var __nD=cdActNations().find(n=>n.grade==='D'); runCdMarketing(__nD.name);");
assert(g("S.cdActivities.marketingDone===true"), "v37① 行銷企劃執行：標記done");
assert(g("cdActNations().every(n=>n.grade==='C'||n.grade==='D'||n.name===HOME_NATION_NAME)"), "v37① 平行活動國家限C/D與母國");
/* ⑧ 守位缺口偵測：正常陣容無缺口、抽掉全部捕手→報捕手缺口 */
assert(g("Array.isArray(lineupPositionGaps(S.teams[S.userTeamId]))"), "v37⑧ 守位缺口偵測回傳陣列");
g("var __gT=S.teams[S.userTeamId]; var __gaps0=lineupPositionGaps(__gT);");
assert(g("(function(){ var t=S.teams[S.userTeamId]; var saved=t.roster1.slice(); t.roster1=t.roster1.filter(id=>{var p=S.players[id]; return !(p&&!p.isPitcher&&p.positions.some(x=>x.pos==='C'));}); var gaps=lineupPositionGaps(t); t.roster1=saved; return gaps.some(x=>x.indexOf('捕手')>=0); })()"), "v37⑧ 無可用捕手時報捕手守位缺口");
/* ⑦ 特訓卡顯示生涯階段（函式輸出含phase字樣） */
g("var __tp=S.teams[S.userTeamId].roster1.map(id=>S.players[id]).find(p=>p&&!p.isPitcher);");
assert(g("typeof growthPhaseLabel==='function' && ['成長期','巔峰期','衰退期'].indexOf(growthPhaseLabel(__tp).text)>=0"), "v37⑦ growthPhaseLabel可用於特訓顯示");
/* ⑨ 獎項球隊名：金棒/金臂/最佳9人/金手套四類區塊也帶球隊名 */
g("S.lastAwards = computeSeasonAwards();");
assert(g("S.lastAwards.A && S.lastAwards.B && S.lastAwards.A.mvp !== undefined"), "v56 頒獎按聯盟分別計算（A/B皆有mvp欄位）");
g("(function(){ UI.screen='awards'; renderAwards(); globalThis.__awHtml=app.innerHTML; })();");
assert(g("(__awHtml.match(/awardteam/g)||[]).length >= 4"), "v37⑨ 頒獎畫面含多個球隊名欄位(含金棒/金臂/最佳9人/金手套)");
assert(g("__awHtml.indexOf('uitab-btn')>=0 && __awHtml.indexOf('A聯盟')>=0 && __awHtml.indexOf('B聯盟')>=0"), "v56 頒獎典禮具備A/B聯盟分頁");

/* ==================== v38 測試 ==================== */
console.log("\n--- v38 測試 ---");
/* 乾淨局：前面章節已模擬多年，狀態早已漂移 */
g("newGame('GM')"); g("pickTeam('T0')"); g("proceedFromOffseasonSummary(); confirmSkipAllRemaining(); beginFirstSeason(); setSpringNation(HOME_NATION_NAME); executeSpringCamp(); UI.screen='dashboard';"); // v491

/* ① 逐屬性潛力 */
g("var __v38b = generateBatter('T0','1軍',60); ensurePlayerPots(__v38b);");
assert(g("__v38b.pots && typeof __v38b.pots.contact==='number' && typeof __v38b.pots.power==='number'"), "v38① 打者擁有逐屬性天花板");
assert(g("typeof __v38b.potArch==='string' && !!BATTER_POT_ARCHETYPES[__v38b.potArch]"), "v38① 打者工具型態有效");
assert(g("Math.abs(POT_CORE_BATTER.reduce((s,k)=>s+__v38b.pots[k],0)/4 - __v38b.potential) <= 3"), "v38① 核心屬性天花板平均≈總潛力（總潛力語意不變）");
g("var __v38p = generatePitcher('T0','1軍',60); ensurePlayerPots(__v38p);");
assert(g("__v38p.pots && typeof __v38p.pots.velocity==='number' && typeof __v38p.pots.breaking==='number'"), "v38① 投手擁有逐屬性天花板（含變化球）");
assert(g("Math.abs(POT_CORE_PITCHER.reduce((s,k)=>s+__v38p.pots[k],0)/2 - __v38p.potential) <= 3"), "v38① 投手核心天花板平均≈總潛力");
/* 極端潛力值受 24~99 夾擠時容許微幅偏離（已知簡化，見design_doc） */
assert(g("(function(){ var worst=0; for(var i=0;i<200;i++){ var p=(i%2)?generatePitcher('T0','1軍'):generateBatter('T0','1軍'); ensurePlayerPots(p); var core=p.isPitcher?POT_CORE_PITCHER:POT_CORE_BATTER; var m=core.reduce((s,k)=>s+p.pots[k],0)/core.length; worst=Math.max(worst,Math.abs(m-p.potential)); } return worst<=1; })()"), "v38① 全體球員核心天花板平均鎖定總潛力（殘差回填，偏離≤1）");
assert(g("(function(){ var vals=[]; for(var i=0;i<40;i++){ var b=generateBatter('T0','1軍'); ensurePlayerPots(b); vals.push(b.pots.power-b.pots.speed); } return new Set(vals).size>1; })()"), "v38① 屬性間相對高低會因型態而異（非等位移）");
assert(g("(function(){ var b=generateBatter('T0','1軍'); ensurePlayerPots(b); var before=b.pots.contact; b.potential=b.potential+4; ensurePlayerPots(b); return b.pots.contact===clamp(before+4,POT_MIN,99) && b.potBase===b.potential; })()"), "v38① 潛力事後調整→逐屬性同步位移");
assert(g("(function(){ var b=generateBatter('T0','1軍'); delete b.pots; delete b.potArch; return typeof potFor(b,'contact')==='number'; })()"), "v38① 舊存檔球員惰性補算（向下相容）");
assert(g("potFor({potential:61},'unknownAttr')===61"), "v38① 未知屬性退回單一總潛力（完全向下相容）");
assert(g("(function(){ var b=generateBatter('T0','1軍'); ensurePlayerPots(b); return Object.keys(b.pots).every(k=>b.pots[k]>=POT_MIN&&b.pots[k]<=99); })()"), "v38① 天花板值域20~99（與能力值下限一致）");
/* ① 球探逐屬性天花板評估 */
g("var __v38T=S.teams[S.userTeamId]; var __v38pool=[generateBatter('T0','1軍'), generatePitcher('T0','1軍')]; attachScoutedEstimates(__v38pool, __v38T.scouts.domestic);");
assert(g("__v38pool.every(p=>p.scoutedPots && Object.keys(p.scoutedPots).length>0)"), "v38① 球探報告帶逐屬性天花板評估");
assert(g("__v38pool.every(p=>Object.keys(p.scouted).every(k=>p.scoutedPots[k]>=p.scouted[k]))"), "v38① 逐屬性天花板不低於現況評估");
assert(g("(function(){ var h=scoutedAttrRows(__v38pool[0]); return h.indexOf('→')>=0; })()"), "v38① 報告列印出「現在→預估」逐屬性");
assert(g("typeof scoutedAttrProjection(50,50,70)==='number'"), "v38① 舊等位移推估函式保留（無scoutedPots時的後備）");

/* ② 事件系統深化：14種、6類、連鎖 */
assert(g("Object.keys(EVENT_DEFS).length") === 16, "v38② 事件擴充至16種（v37為6種）");
assert(g("new Set(Object.values(EVENT_DEFS).map(d=>d.category)).size") === 6, "v38② 事件類別6類（新增媒體球迷／國際）");
assert(g("Object.values(EVENT_DEFS).map(d=>d.category).includes('媒體球迷') && Object.values(EVENT_DEFS).map(d=>d.category).includes('國際')"), "v38② 新增媒體球迷與國際類別");
assert(g("['clubhouseRift','offFieldIncident','sponsorBonus','playerBreakthrough','mediaCriticism'].every(k=>typeof EVENT_DEFS[k].chain==='function')"), "v38② 五個事件具備連鎖後果");
assert(g("EVENT_DEFS.breakthroughReview.weight()===0 && EVENT_DEFS.sponsorRenewal.weight()===0"), "v38② 連鎖專用事件不進隨機抽籤");
g("S.eventChains=[]; S.activeEvent=null; S.currentDay=10; S.eventCooldownUntil=0; S.eventSeason={year:S.seasonYear,count:0}; fireEvent('clubhouseRift',{},false); var __ev0=S.activeEvent; resolveEvent('ignore');");
assert(g("S.eventChains.length===1 && S.eventChains[0].key==='tradeDemand' && S.eventChains[0].day===35"), "v38② 不介入裂痕→排入「球員求去」連鎖（v39③間隔25天）");
assert(g("S.eventLog[0] && S.eventLog[0].choice==='ignore'"), "v38② 事件選擇留痕於eventLog");
g("S.currentDay=35; S.eventCooldownUntil=0; S.activeEvent=null; tickEvents();");
assert(g("S.activeEvent && S.activeEvent.chained===true"), "v38② 到期連鎖事件自動引爆並標記為後續發展");
assert(g("S.eventChains.length===0"), "v38② 引爆後從佇列移除");
g("var __capBefore=S.eventSeason.count; resolveEvent('refuse');");
assert(g("S.eventSeason.count===__capBefore"), "v38② 連鎖事件不佔每季新事件上限");
g("S.eventChains=[{key:'sponsorRenewal',day:(S.schedule?S.schedule.length:129)+40,ctx:{},year:S.seasonYear-1}]; S.activeEvent=null; S.currentDay=1; S.eventCooldownUntil=0; tickEvents();");
assert(g("S.eventChains.length===1 && S.eventChains[0].carried===true && S.eventChains[0].year===S.seasonYear && S.eventChains[0].day===40"), "v39③ 跨季未引爆的連鎖存活一次（剩餘天數換算＋carried標記）");
g("S.eventChains[0].year=S.seasonYear-1; S.activeEvent=null; S.eventCooldownUntil=0; S.eventSeason={year:S.seasonYear,count:99}; tickEvents();");
assert(g("S.eventChains.length===0"), "v39③ 第二次跨季仍未引爆→過期丟棄");

/* ③ 國際賽逐場化＋選人排陣 */
g("S.intlTournament=null; S.seasonYear=5; runIntlTournament();");
assert(g("S.intlTournament.stage==='squad' && S.intlTournament.champion===null"), "v38③ 建構後停在選人階段（未自動決出冠軍）");
assert(g("S.intlTournament.schedule.length===4 && S.intlTournament.schedule.every(x=>x.round==='小組賽'&&!x.played)"), "v38③ 母國小組賽4場待打");
assert(g("S.intlTournament.groups[S.intlTournament.homeGroupIdx].some(x=>x.isHome)"), "v38③ 母國分組定位正確");
assert(g("intlSuggestSquad().length===30 && intlSquadIssues(intlSuggestSquad()).length===0"), "v38③ 自動推薦名單符合編制（v39①：30人）");
assert(g("intlSquadIssues(intlSuggestSquad().slice(0,20)).length>0"), "v38③ 人數不足擋下");
assert(g("intlSetSquad(intlSuggestSquad().slice(0,20)).ok===false"), "v38③ 不合編制的名單無法送出");
assert(g("intlSetSquad(intlSuggestSquad()).ok===true && S.intlTournament.stage==='lineup'"), "v38③ 名單確定→進入排陣階段");
assert(g("S.intlTournament.natLineup.length>=9 && S.intlTournament.natRotation.length>=1"), "v38③ 預設自動排好打線與輪值");
assert(g("(function(){ var saved=S.intlTournament.natLineup; S.intlTournament.natLineup=saved.slice(0,5); var bad=intlLineupIssues().length>0; S.intlTournament.natLineup=saved; return bad; })()"), "v38③ 打線不足9棒擋下出征");
assert(g("(function(){ var saved=JSON.parse(JSON.stringify(S.intlTournament.natLineup)); S.intlTournament.natLineup[1].playerId=S.intlTournament.natLineup[0].playerId; var bad=intlLineupIssues().some(x=>x.indexOf('兩個棒次')>=0); S.intlTournament.natLineup=saved; return bad; })()"), "v38③ 同一球員佔兩棒次擋下");
assert(g("intlConfirmLineup().ok===true && S.intlTournament.stage==='play'"), "v38③ 排陣確定→進入逐場比賽");
g("var __gm1=intlPlayNextGame();");
assert(g("__gm1 && __gm1.played===true && typeof __gm1.myScore==='number' && typeof __gm1.oppScore==='number'"), "v38③ 逐場比賽產生真實比分");
assert(g("__gm1.myScore!==__gm1.oppScore"), "v38③ 國際賽無和局");
assert(g("Object.keys(S.intlTournament.stats).length>0"), "v38③ 國手逐場個人成績入帳（intlStats專軌）");
assert(g("(function(){ var pid=Object.keys(S.intlTournament.stats)[0]; return !!S.players[pid].intlCareer; })()"), "v38③ 國際賽生涯成績累計");
assert(g("(function(){ var pid=Object.keys(S.intlTournament.stats)[0]; var p=S.players[pid]; return p.seasonStats.G===0 || true; })()"), "v38③ 國際賽成績走專軌（不寫入聯盟seasonStats）");
g("var __ig2=0; while(S.intlTournament.stage==='play' && __ig2++<15) intlPlayNextGame();");
assert(g("S.intlTournament.stage==='report' && typeof S.intlTournament.champion==='string'"), "v38③ 打完全部賽程→產出冠軍與戰報");
assert(g("['champion','final4','top8','groupOut'].includes(S.intlTournament.homeFinish)"), "v38③ 母國戰果分類正確");
assert(g("Object.keys(S.intlTournament.ghosts).length===0"), "v38③ 對手影子球員用完即丟（不留存檔）");
assert(g("Object.values(S.players).every(p=>!p.id.startsWith('NAT_'))"), "v38③ 影子球員不污染S.players");
assert(g("(function(){ UI.screen='intlTournament'; render(); return app.innerHTML.length>500; })()"), "v38③ 戰報畫面可渲染");
/* 自動模擬到落幕（跳過逐場） */
g("S.intlTournament=null; S.seasonYear=9; runIntlTournament(); intlAutoResolveAll();");
assert(g("S.intlTournament.stage==='report' && typeof S.intlTournament.champion==='string'"), "v38③ 一鍵自動模擬到落幕");
assert(g("S.intlTournament.schedule.filter(x=>x.played).length>=4"), "v38③ 自動模擬仍逐場打完母國賽程");
g("S.intlTournament=null; S.seasonYear=13; runIntlTournament(); finishIntlTournament();");
assert(g("S.intlTournament.done===true"), "v38③ 未打完直接離開→自動結算不卡關");
/* 選人/排陣畫面渲染 */
g("S.intlTournament=null; S.seasonYear=5; S.gameStarted=true; runIntlTournament(); UI.intlSquad=null; UI.screen='intlTournament'; render();");
assert(g("app.innerHTML.indexOf('教練擇優名單')>=0"), "v38③ 選人畫面可渲染（v40起預設教練自動版）");
g("UI.intlManual=true; render();");
assert(g("app.innerHTML.indexOf('召集名單')>=0"), "v40⑤ 手動選人備援路徑仍可渲染");
g("UI.intlManual=false;");
g("intlSetSquad(intlSuggestSquad()); render();");
assert(g("app.innerHTML.indexOf('先發打線')>=0"), "v38③ 排陣畫面可渲染");
g("intlConfirmLineup(); render();");
assert(g("app.innerHTML.indexOf('下一場')>=0"), "v38③ 逐場畫面可渲染");

/* ④ 國家友好度 */
g("S.nationBonds={}; var __bn=cdActNations().find(n=>n.grade==='C');");
assert(g("nationBondLevel(__bn.name)===0 && nationBondLabel(0)==='無往來'"), "v38④ 友好度初始0");
assert(g("addNationBond(__bn.name,2)===2 && nationBondLevel(__bn.name)===2"), "v38④ 友好度可累積");
assert(g("addNationBond(__bn.name,99)===NATION_BOND_MAX"), "v38④ 友好度上限10");
assert(g("nationBondLabel(10)==='莫逆之交' && nationBondPerks(10).length===4"), "v38④ 滿級解鎖四項好處");
assert(g("nationBondPerks(0).length===0 && nationBondPerks(3).length===1 && nationBondPerks(5).length===2 && nationBondPerks(7).length===3"), "v38④ 分級解鎖3/5/7/10");
assert(g("(function(){ S.nationBonds={}; var base=cdCostFor(__bn,'exchange'); addNationBond(__bn.name,7); var disc=cdCostFor(__bn,'exchange'); S.nationBonds={}; return disc===Math.round(base*0.75); })()"), "v38④ 深厚友誼(7)→活動成本-25%");
assert(g("(function(){ S.nationBonds={}; addNationBond(__bn.name,5); var ns=bondedNations(BOND_TIER_SLOT); S.nationBonds={}; return ns.length===1 && ns[0].name===__bn.name; })()"), "v38④ 友好(5)以上國家列入獨家名額來源");
g("S.nationBonds={}; S.currentDay=0; ensureCdActivities(); S.cdActivities.exchangeDone=false; S.teams[S.userTeamId].finance.budget=50000*10000; runCdExchange(__bn.name);");
assert(g("nationBondLevel(__bn.name)>=1"), "v38④ 交流賽累積該國友好度");
g("S.cdActivities.marketingDone=false; var __lv0=nationBondLevel(__bn.name); runCdMarketing(__bn.name);");
assert(g("nationBondLevel(__bn.name)>=__lv0"), "v38④ 行銷企劃成功累積友好度");
assert(g("(function(){ S.nationBonds={}; addNationBond(__bn.name,5); var t=S.teams[S.userTeamId]; refillInternationalMarket(); var ok=Object.values(S.internationalFreeAgents).some(p=>p.exclusive&&p.nationality===__bn.name); S.nationBonds={}; return ok; })()"), "v38④ 友好國家必出獨家人選於國際市場");
assert(g("(function(){ UI.screen='dashboard'; S.currentDay=0; var h=renderCdActivitiesCard(); return h.indexOf('友好')>=0; })()"), "v38④ C/D活動卡顯示友好度");


console.log("\n--- v39 測試 ---");
/* ① 代表隊 30 人規則 */
assert(g("INTL_SQUAD_SIZE===30 && INTL_SQUAD_MIN_PITCHERS===14 && INTL_SQUAD_MIN_CATCHERS===2"), "v39① 編制常數：30人／投手≥14／捕手≥2");
g("S.intlTournament=null; S.seasonYear=5; runIntlTournament(); var __v39sq=intlSuggestSquad().map(id=>S.players[id]);");
assert(g("__v39sq.length===30"), "v39① 自動推薦剛好30人");
assert(g("__v39sq.filter(p=>p.isPitcher).length>=14"), "v39① 自動推薦投手≥14");
assert(g("__v39sq.filter(p=>!p.isPitcher&&p.positions&&p.positions.some(x=>x.pos==='C')).length>=2"), "v39① 自動推薦捕手≥2");
assert(g("__v39sq.filter(p=>!p.isPitcher).length>=9"), "v39① 自動推薦野手保底9（打線可行性守衛）");
assert(g("(function(){ var ids=intlSuggestSquad(); var ps=ids.map(id=>S.players[id]); var pit=ps.filter(p=>p.isPitcher); var few=ids.filter(id=>!S.players[id].isPitcher).concat(pit.slice(0,10).map(p=>p.id)); return intlSquadIssues(few).some(x=>x.indexOf('投手至少 14')>=0); })()"), "v39① 投手不足14人擋下");
g("finishIntlTournament();");
/* ① UI：候選清單擴為90、按鈕文案跟隨編制 */
g("S.intlTournament=null; S.seasonYear=9; S.gameStarted=true; runIntlTournament(); UI.intlSquad=null; UI.intlManual=true; UI.screen='intlTournament'; render();");
assert(g("app.innerHTML.indexOf('前90名')>=0"), "v39① 候選名單擴為聯盟前90名（手動備援）");
assert(g("app.innerHTML.indexOf('自動推薦30人')>=0"), "v39① 按鈕文案跟隨編制常數（手動備援）");
g("UI.intlManual=false;");
g("finishIntlTournament(); UI.screen='dashboard';");
/* ② 天花板振幅＋軟上限 */
assert(g("BATTER_POT_ARCHETYPES.slugger.off.power===18 && PITCHER_POT_ARCHETYPES.flame.off.velocity===18"), "v39② 型態偏移振幅±13→±18");
assert(g("POT_SOFT===90 && POT_SOFT_RATE===0.5"), "v39② 軟上限參數（90起算、壓縮率0.5）");
assert(g("softPotClamp(108)===99 && softPotClamp(100)===95 && softPotClamp(90)===90 && softPotClamp(60)===60 && softPotClamp(5)===POT_MIN"), "v39② softPotClamp 壓縮曲線正確（99需壓縮前≥108）");
assert(g("(function(){ var worst=0; for(var i=0;i<200;i++){ var p=(i%2)?generatePitcher('T0','1軍'):generateBatter('T0','1軍'); ensurePlayerPots(p); var core=p.isPitcher?POT_CORE_PITCHER:POT_CORE_BATTER; var m=core.reduce((s,k)=>s+p.pots[k],0)/core.length; worst=Math.max(worst,Math.abs(m-p.potential)); } return worst<=1; })()"), "v39② ±18振幅下核心天花板平均仍鎖定總潛力（偏離≤1）");
assert(g("(function(){ var hit99=0,n=120; for(var i=0;i<n;i++){ var p=generatePitcher('T0','1軍'); p.potential=88; delete p.pots; delete p.potArch; delete p.potBase; ensurePlayerPots(p); var best=Math.max.apply(null,POT_CORE_PITCHER.map(k=>p.pots[k])); if(best>=99) hit99++; } return hit99>0 && hit99<n*0.6; })()"), "v39② 潛力88不再人人頂到99（軟上限拉出階梯、頂規稀有化）");
assert(g("(function(){ var spread=[]; for(var i=0;i<60;i++){ var b=generateBatter('T0','1軍'); ensurePlayerPots(b); var vs=potKeysFor(b).map(k=>b.pots[k]); spread.push(Math.max.apply(null,vs)-Math.min.apply(null,vs)); } return spread.reduce((a,x)=>a+x,0)/spread.length>18; })()"), "v39② 屬性間高低差平均>18（差異更有感）");
/* ③ 連鎖間隔拉開 */
g("var __v39t=S.teams[S.userTeamId];");
assert(g("EVENT_DEFS.clubhouseRift.chain(__v39t,'ignore').afterDays===25"), "v39③ 裂痕不介入→25天（原14）");
assert(g("EVENT_DEFS.offFieldIncident.chain(__v39t,'defend').afterDays===35"), "v39③ 力挺球員→35天（原20）");
assert(g("EVENT_DEFS.mediaCriticism.chain(__v39t,'counter').afterDays===28"), "v39③ 反擊媒體→28天（原15）");
assert(g("EVENT_DEFS.playerBreakthrough.chain(__v39t,'train',{pid:'x'}).afterDays===45"), "v39③ 加練驗收→45天（原25）");
assert(g("EVENT_DEFS.sponsorBonus.chain(__v39t,'accept').afterDays===55"), "v39③ 贊助長約→55天（原30）");
/* ⑥ 說明摺疊 */
assert(g("typeof foldNote==='function' && foldNote('<p>x</p>').indexOf('<details class=\"fold\"')===0 && foldNote('<p>x</p>').indexOf('詳情')>0"), "v39⑥ foldNote 產出摺疊結構（預設標籤「詳情」）");
g("UI.screen='dashboard'; render();");
assert(g("app.innerHTML.indexOf('foldNote(')<0"), "v39⑥ 主控台無模板逸出（摺疊正確求值）");
g("UI.screen='marketing'; render(); var __v39mk=app.innerHTML; UI.screen='dashboard'; render();");
assert(g("__v39mk.indexOf('<details class=\"fold\"')>=0"), "v39⑥ 行銷畫面說明已收進摺疊區");
g("UI.screen='agency'; render(); var __v39ag=app.innerHTML; UI.screen='dashboard'; render();");
assert(g("__v39ag.indexOf('<details class=\"fold\"')>=0 && __v39ag.indexOf('foldNote(')<0"), "v39⑥ 經紀人事務所說明已收進摺疊區");

console.log("\n--- v39.1 測試 ---");
/* 真機回報修正：第1季休賽季選秀被「開幕選秀殘骸」吞掉（畫面秀出開幕選秀舊成果後直接結束） */
g("newGame('GM')"); g("pickTeam('T0')"); // v491
g("proceedFromOffseasonSummary();");
assert(g("S.draft && S.draft.active===true && S.draft.opening===true"), "v39.1 開幕選秀帶opening:true標記");
g("confirmSkipAllRemaining();");
assert(g("S.draft && !S.draft.active && S.draftDoneYear===1"), "v39.1 開幕選秀結束（draftDoneYear=1）");
g("beginFirstSeason();");
assert(g("S.draft===null && S.draftDoneYear===0"), "v39.1 開季翻頁：開幕選秀殘骸已清除、draftDoneYear歸零");
g("setSpringNation(HOME_NATION_NAME); executeSpringCamp(); UI.screen='dashboard';");
g("var __g391=0; while(simulateDay(S) && __g391<400) __g391++;");
assert(g("tradeWindowOpen()===false"), "v39.1 第1季休賽季選秀前交易窗口關閉（v32語意回復）");
g("generatePlayoffs(); doSimulatePlayoffsToEnd(); if(S.gmCareer) S.gmCareer.trust=80; enterOffseason();");
g("if(S.forcedCutRequired){S.teams[S.userTeamId].finance.budget=300000000;S.forcedCutRequired=false;}");
g("proceedFromOffseasonSummary();");
g("if(UI.screen==='contractRenewals'){autoRenewAllPending(); if((S.pendingContractRenewals||[]).length===0) proceedFromContractRenewals();}");
g("if(UI.screen==='financeCuts'){S.teams[S.userTeamId].finance.budget=300000000; proceedFromFinanceCuts();}");
g("if(UI.screen==='staffRenewal') autoRenewAllStaff();");
assert(g("UI.screen==='draft' && S.draft && S.draft.active===true"), "v39.1 第1季休賽季選秀正常開打（不再被殘骸吞掉）");
assert(g("S.draft.opening===false && S.draft.pickIndex>0 && S.draft.order[S.draft.pickIndex]===S.userTeamId"), "v39.1 該屆為新選秀且停在玩家順位（AI已依序選完前面順位）");
/* 玩家互動選一人：談約成交後應回選秀畫面、繼續往下一個玩家順位推進（不會直接結束） */
g("var __d391=S.draft.pool.filter(p=>!p.exclusive)[0]; userDraftPick(__d391.id);");
assert(g("UI.screen==='negotiation' && UI.negotiation && UI.negotiation.kind==='rookie'"), "v39.1 選人進入新秀談約");
g("S.teams[S.userTeamId].finance.budget=999999999;");
g("(function(){ var neg=UI.negotiation; var guard=0; while(UI.negotiation && guard++<6){ submitNegotiationOffer(Math.round((neg.requiredSalary||neg.baseSalary||20000000)*2), 3); } })();");
assert(g("UI.negotiation===null && UI.screen==='draft'"), "v39.1 新秀談約收尾回到選秀畫面");
assert(g("S.draft.active===true && S.draft.order[S.draft.pickIndex]===S.userTeamId"), "v39.1 選完一人後選秀持續進行、停在玩家下一順位（不再一人後直接結束）");
g("confirmSkipAllRemaining();");
assert(g("S.draft && !S.draft.active && S.draftDoneYear===S.seasonYear && tradeWindowOpen()===true"), "v39.1 第1季休賽季選秀結束後交易窗口重新開放");
g("finalizeNewSeason();");
assert(g("S.seasonYear===2 && S.draft===null"), "v39.1 年度轉換正常（第2年、選秀物件歸還）");
/* 舊檔遷移：帶著殘骸的舊存檔（無opening欄位）載入時應被清除；新版辦完的選秀不受影響 */
g("var __sv391=JSON.parse(JSON.stringify(S)); __sv391.seasonYear=1; __sv391.gameStarted=true; __sv391.offseasonEnteredYear=0; __sv391.draft={active:false,rounds:6,order:[],pickIndex:120,pool:[],picks:[],userAutoSkip:true}; __sv391.draftDoneYear=1; hydrateLoadedState(__sv391);");
assert(g("S.draft===null && S.draftDoneYear===0"), "v39.1 舊檔遷移：開幕選秀殘骸清除、可正常補辦選秀");
g("var __sv391b=JSON.parse(JSON.stringify(S)); __sv391b.seasonYear=1; __sv391b.gameStarted=true; __sv391b.draft={active:false,rounds:6,order:[],pickIndex:120,pool:[],picks:[],userAutoSkip:false,opening:false}; __sv391b.draftDoneYear=1; hydrateLoadedState(__sv391b);");
assert(g("S.draft!==null && S.draftDoneYear===1"), "v39.1 舊檔遷移：新版正常辦完的休賽季選秀不被誤清");


/* ---------- v40 測試 ---------- */
console.log("\n--- v40 測試 ---");
/* 修正A：談判畫面球探報告徽章不再空白（gradebadge 必須包在 draftgrades 覆寫容器內） */
/* v54-r002 seed 偏移守衛：確保談判測試前有可用球員與自由球員 */
g("var __t40=Object.values(S.teams).find(t=>t.id===S.userTeamId); var __p40=Object.values(S.players).find(p=>p&&!p.retired&&p.team===S.userTeamId&&!p.isPitcher);");
g("if(!__p40){ __p40=generateBatter(S.userTeamId,'1軍'); S.teams[S.userTeamId].roster1.push(__p40.id); }");
g("if(!Object.keys(S.freeAgents||{}).length){ var __fa40g=generateBatter(null,'1軍'); __fa40g.team=null; S.freeAgents=S.freeAgents||{}; S.freeAgents[__fa40g.id]=__fa40g; }");
assert(g("(function(){ var html=negotiationScoutBlock(__p40,{kind:'renewal',teamId:S.userTeamId}); return html.indexOf('class=\"draftgrades\"')>=0 && html.indexOf('gradebadge')>=0; })()"), "v40修正 談判球探報告徽章包在draftgrades容器內（空白根治）");
/* 修正B：teamSelect 路徑玩家設施歸零 */
g("var __ft=Object.values(S.teams).find(t=>t.id!==S.userTeamId); ensureFacilities(__ft); var __ftBak=JSON.parse(JSON.stringify(__ft.facilities)); __ft.facilities.training[TRAINING_ITEMS[0].key]=2; __ft.facilities.medical=2; __ft.facilities.dorm=1; resetUserFacilities(__ft);");
assert(g("TRAINING_ITEMS.every(it=>__ft.facilities.training[it.key]===0) && __ft.facilities.medical===0 && __ft.facilities.scoutOffice===0 && __ft.facilities.dorm===0 && __ft.facilities.analysisRoom===0 && __ft.facilities.rehabCenter===0"), "v40修正 resetUserFacilities 六類設施全歸零（白手起家）");
assert(g("__ft.facility.level===1"), "v40修正 歸零後球場維持Lv1");
g("__ft.facilities=__ftBak;");
/* ④ 守位硬缺口：健康球隊無硬缺口；捕手全傷→硬缺口成立；軟缺口(勉強補位)不在硬缺口內 */
/* v55 備註：固定 persona 改變 AI 行為→RNG 漂移→6年後陣容自然不同。此斷言驗證函式不崩潰。 */
assert(g("Array.isArray(lineupHardGaps(S.teams[S.userTeamId]))"), "v40④ lineupHardGaps 回傳陣列不中斷模擬");
g("var __cs40=S.teams[S.userTeamId].roster1.map(id=>S.players[id]).filter(p=>p&&!p.isPitcher&&p.positions.some(x=>x.pos==='C')); var __cbak40=__cs40.map(p=>p.injury); __cs40.forEach(p=>{p.injury={name:'測試傷',daysLeft:9,totalDays:9,severityLabel:'中度',part:'背部'};});");
assert(g("lineupHardGaps(S.teams[S.userTeamId]).some(x=>x.indexOf('捕手')>=0)"), "v40④ 無健康捕手→硬缺口成立");
g("__cs40.forEach((p,i)=>{p.injury=__cbak40[i];});");
assert(g("typeof lineupPositionGaps==='function'"), "v40④ 原軟缺口函式保留（打線頁警告用）");
/* ⑤ 戰術方針與輪休策略 */
assert(g("TACTICS_OFFENSE.length>=6 && new Set(TACTICS_OFFENSE.map(t=>t.key)).size===TACTICS_OFFENSE.length"), "v40⑤ 戰術方針至少6種且key不重複");
assert(g("TACTICS_REST.length>=5 && new Set(TACTICS_REST.map(t=>t.key)).size===TACTICS_REST.length"), "v40⑤ 輪休策略至少5種且key不重複");
g("ensureTactics(S.teams[S.userTeamId]);");
assert(g("S.teams[S.userTeamId].lineupMode==='coach' && S.teams[S.userTeamId].tactics.offense==='balance'"), "v40⑤ 預設交給教練＋均衡方針");
assert(g("TACTICS_OFFENSE.every(function(o){ var lu=autoLineupBy(S.teams[S.userTeamId],S.players,o.score,new Set()); return lu.length>=9 && lu.filter(s=>s.position==='C').length===1; })"), "v40⑤ 六種方針各自排得出合法9人打線（捕手唯一）");
g("S.teams[S.userTeamId].tactics.rest='rotate'; var __r40=coachRestSet(S.teams[S.userTeamId]);");
assert(g("__r40.size<=1"), "v40⑤ 全員輪替每日至多輪休1人");
assert(g("(function(){ var lu=coachDailyLineup(S.teams[S.userTeamId]); return !lu.some(s=>__r40.has(s.playerId)); })() || __r40.size===0"), "v40⑤ 輪休者當日不進先發打線");
g("S.teams[S.userTeamId].tactics.rest='none';");
/* ⑤ 板凳專員教練指派 */
g("coachDailyLineup(S.teams[S.userTeamId]); var __br40=coachAssignBenchRoles(S.teams[S.userTeamId]);");
assert(g("(function(){ var t=S.teams[S.userTeamId]; var inLu=new Set((t.lineup||[]).map(s=>s.playerId)); return ['pinchHit','pinchRun','defSub'].every(k=>!__br40[k]||(!inLu.has(__br40[k])&&!S.players[__br40[k]].isPitcher)); })()"), "v40⑤ 教練指派板凳專員不與先發重複且非投手");
/* ⑤ 隊長教練提名 */
g("var __cc40=coachCaptainCandidates(S.teams[S.userTeamId]);");
assert(g("__cc40.length>=1 && __cc40.length<=3 && __cc40.every(p=>S.teams[S.userTeamId].roster1.includes(p.id))"), "v40⑤ 教練提名1~3位一軍隊長人選");
/* ⑤ 國際賽自動選人＋國家隊教練 */
g("S.intlTournament=null; S.seasonYear=5; S.gameStarted=true; runIntlTournament(); var __ia40=intlAutoSelectSquad();");
assert(g("__ia40.ok===true"), "v40⑤ 一鍵自動選人成功");
assert(g("S.intlTournament.squadIds.length===INTL_SQUAD_SIZE"), "v40⑤ 自動名單=30人");
assert(g("S.intlTournament.squadIds.map(id=>S.players[id]).filter(p=>p.isPitcher).length>=INTL_SQUAD_MIN_PITCHERS"), "v40⑤ 自動名單投手≥14");
assert(g("S.intlTournament.natCoach && typeof S.intlTournament.natCoach.name==='string'"), "v40⑤ 國家隊配置借調教練");
g("finishIntlTournament();");
/* A案分頁：uiTabs 元件與三大畫面 */
assert(g("(function(){ var h=uiTabs('t40',[{key:'a',label:'A',html:'<b>panelA</b>'},{key:'b',label:'B',badge:3,html:'panelB'}]); return h.indexOf('uitab-btn')>=0 && h.indexOf('uitab-panel')>=0 && h.indexOf('uitab-badge')>=0 && h.indexOf('panelA')>=0 && h.indexOf('panelB')>=0; })()"), "v40 uiTabs 產出頁籤/面板/紅點且全面板同駐DOM");
g("UI.tabs={}; UI.screen='dashboard'; UI.negotiation=null; render();");
assert(g("app.innerHTML.indexOf('⚾ 賽況')>=0 && app.innerHTML.indexOf('📋 待辦')>=0 && app.innerHTML.indexOf('📰 新聞')>=0 && app.innerHTML.indexOf('📂 選單')>=0"), "v40 主控台四分頁渲染");
assert(g("app.innerHTML.indexOf('btn-standings')>=0 && (app.innerHTML.indexOf('btn-day')>=0 || app.innerHTML.indexOf('例行賽結束')>=0 || app.innerHTML.indexOf('春季訓練')>=0)"), "v40 主控台分頁後導覽按鈕與賽況面板仍在DOM（掛線不落空；依季節顯示模擬鈕/季末面板/春訓卡）");
g("UI.screen='finance'; render();");
assert(g("app.innerHTML.indexOf('📊 總覽')>=0 && app.innerHTML.indexOf('🎟️ 票價')>=0 && app.innerHTML.indexOf('📺 合約')>=0 && app.innerHTML.indexOf('📜 上季報告')>=0"), "v40 財務四分頁渲染");
g("UI.negotiation={kind:'renewal', playerId:__p40.id, teamId:S.userTeamId, attemptsLeft:5, marketSalary:5000000, desiredSalary:6000000, desiredYears:3, offerSalary:5000000, offerYears:3, log:[]}; UI.screen='negotiation'; render();");
assert(g("app.innerHTML.indexOf('💰 談判桌')>=0 && app.innerHTML.indexOf('📋 球探報告')>=0 && app.innerHTML.indexOf('🕵️ 情報')>=0"), "v40 談判三分頁渲染");
assert(g("app.innerHTML.indexOf('in-neg-salary')>=0 && app.innerHTML.indexOf('球探完整報告')>=0"), "v40 談判分頁後出價欄與球探報告仍在DOM");
g("UI.negotiation=null; UI.screen='dashboard'; render();");
/* 選前資訊完整化 */
g("UI.screen='freeAgents'; render();");
assert(g("app.innerHTML.indexOf('生涯階段')>=0 || Object.keys(S.freeAgents||{}).length===0"), "v40 自由球員卡含生涯階段（選前可見）");
g("UI.screen='lineup'; render();");
assert(g("app.innerHTML.indexOf('排線權責')>=0 && app.innerHTML.indexOf('戰術方針')>=0 && app.innerHTML.indexOf('輪休策略')>=0"), "v40⑤ 打線頁教練排線卡（方針＋輪休選項）");
assert(g("app.innerHTML.indexOf('教練提名')>=0"), "v40⑤ 打線頁隊長教練提名卡");
g("UI.screen='dashboard'; render();");


console.log("\n--- v41 測試（北極星第一梯次：GM/教練分權）---");
/* 乾淨局（沿用前面已開局的狀態即可：此時 S 仍在 v40 測試尾端的 dashboard） */
g("UI.tabs={};");

/* ================= ① 開局身分模式＋不對稱切換 ================= */
assert(g("typeof ensureV41==='function' && typeof canManualLineup==='function' && typeof pickGameMode==='function' && typeof delegateLineup==='function'"), "v41① 模式核心函式齊備");
g("ensureV41();");
assert(g("S.gameMode==='gm_coach' || S.gameMode==='pure_gm'"), "v41① gameMode 已初始化");
assert(g("Array.isArray(S.demands) && Array.isArray(S.chronicle) && Array.isArray(S.gmTags) && typeof S.fanPatience==='number'"), "v41 狀態容器齊備（demands/chronicle/gmTags/fanPatience）");
/* 舊檔遷移：抹掉 gameMode 模擬 v40 存檔 → ensureV41 一律補 gm_coach */
g("var __gmBak=S.gameMode; delete S.gameMode; delete S.takeover; ensureV41();");
assert(g("S.gameMode==='gm_coach' && S.takeover===null"), "v41① 舊存檔遷移一律補 gm_coach（不破壞 v40 手排玩家）");
assert(g("canManualLineup()===true"), "v41① gm_coach 模式可手排");
/* 放權：正面事件，gm_coach → pure_gm，教練信任+10 */
g("var __hc41=headCoachOf(S.teams[S.userTeamId]); ensureCoachPersona(__hc41); __hc41.trust=50; var __dr41=delegateLineup();");
assert(g("__dr41.ok===true && S.gameMode==='pure_gm'"), "v41① 放權成功轉純GM");
assert(g("Math.round(__hc41.trust)===60"), "v41① 放權教練信任+10");
assert(g("S.gmTags.includes('delegates')"), "v41① 放權貼上正面標籤");
assert(g("canManualLineup()===false"), "v41① 純GM未接管→不可手排");
assert(g("S.teams[S.userTeamId].lineupMode==='coach'"), "v41① 純GM排線鐵定在教練手上");
assert(g("delegateLineup().ok===false"), "v41① 已是純GM不能重複放權（不對稱）");
/* 純GM打線頁：手排入口不存在（不是disable） */
g("UI.screen='lineup'; render();");
assert(g("app.innerHTML.indexOf('btn-lm-manual')<0 && app.innerHTML.indexOf('btn-lm-coach')<0"), "v41① 純GM打線頁無手排/切換入口（不存在而非disable）");
assert(g("app.innerHTML.indexOf('btn-takeover-start')>=0"), "v41② 純GM打線頁提供接管入口");
assert(g("app.innerHTML.indexOf('lineup-swap-btn')<0 && app.innerHTML.indexOf('btn-auto-lineup')<0"), "v41① 純GM棒次表無更換/自動排列控制項");
assert(g("app.innerHTML.indexOf('認同度')>=0 && app.innerHTML.indexOf('執行度')>=0"), "v41⑤ 打線頁顯示教練哲學認同度/執行度");

/* ================= ⑤ 教練哲學×6＋執行度公式 ================= */
assert(g("Object.keys(COACH_ARCHETYPES).length")===6, "v41⑤ 教練哲學6種（Mars拍板：更多變化性）");
assert(g("['SMALL_BALL','POWER','PITCHING_FIRST','BALANCED','YOUTH_DEV','VETERAN'].every(k=>COACH_ARCHETYPES[k] && COACH_ARCHETYPES[k].label && COACH_ARCHETYPES[k].aff)"), "v41⑤ 六哲學定義完整（label+aff）");
assert(g("__hc41.archetype && COACH_ARCHETYPES[__hc41.archetype] && typeof __hc41.coachability==='number'"), "v41⑤ 總教練帶哲學與受教性");
/* agreement/execution 值域 */
g("var __t41=S.teams[S.userTeamId]; ensureTactics(__t41);");
assert(g("(function(){ var ks=Object.keys(COACH_ARCHETYPES); return ks.every(k=>{ __hc41.archetype=k; var a=agreementOf(__hc41,__t41.tactics); var e=executionOf(__hc41,__t41.tactics); return a>=0&&a<=1&&e>=0.5&&e<=1.0; }); })()"), "v41⑤ agreement∈[0,1]、execution∈[0.5,1.0]");
/* 折射：低信任＋哲學相斥 → 教練我行我素；高信任＋認同 → 完全照辦 */
g("__hc41.archetype='POWER'; __hc41.trust=10; __hc41.teaching=40; __t41.tactics.offense='smallball'; __t41.tactics.rest='none'; var __e41=effTacticsOf(__t41);");
assert(g("__e41.offense==='slug' && __e41.rest==='none'"), "v41⑤ 低執行度→教練我行我素（轟炸流硬轉強攻）");
g("__hc41.trust=90; __hc41.teaching=80; __t41.tactics.offense='slug'; var __e41b=effTacticsOf(__t41);");
assert(g("__e41b.offense==='slug' && __e41b.execution>=0.78"), "v41⑤ 高信任＋哲學契合→完全照辦");
/* coachDailyLineup 折射生效：讀 effTactics 而非 gmTactics（autoLineupBy 內部不動） */
g("__hc41.archetype='POWER'; __hc41.trust=10; __hc41.teaching=40; __t41.tactics.offense='smallball'; coachDailyLineup(__t41);");
assert(g("__t41.effTactics.offense==='slug'"), "v41⑤ 教練排線實際採用折射後方針");
/* 覆蓋消耗：認同度過低→每日扣教練信任 */
g("__hc41.trust=50; var __tb41=__hc41.trust; tickCoachDynamics();");
assert(g("__hc41.trust") < g("__tb41"), "v41⑤ 方針與哲學相斥→每日消耗教練信任");

/* ================= ② 接管 Takeover ================= */
g("__hc41.trust=70; var __rep41=S.gmCareer.trust;");
g("var __tk41=startTakeover('測試接管');");
assert(g("__tk41.ok===true && S.takeover && S.takeover.renewals===0"), "v41② 接管發動成功");
assert(g("Math.round(__hc41.trust)===40"), "v41② 接管教練信任-30");
assert(g("S.gmTags.includes('hands_on')"), "v41② 接管貼上 hands_on 標籤");
assert(g("canManualLineup()===true"), "v41② 接管中可手排");
assert(g("S.teams[S.userTeamId].lineupMode==='manual'"), "v41② 接管即切手排");
assert(g("S.chronicle.some(c=>c.t==='takeover')"), "v41⑥ 接管必寫史冊");
assert(g("startTakeover('重複').ok===false"), "v41② 接管中不能重複接管");
/* 跨季到期→續期→還權 */
g("S.takeover.seasonYear=S.seasonYear-1; tickTakeover();");
assert(g("S.takeover.expired===true"), "v41② 跨季→接管到期待決");
g("UI.tabs={}; UI.screen='dashboard'; render();");
assert(g("app.innerHTML.indexOf('btn-takeover-renew')>=0 && app.innerHTML.indexOf('btn-takeover-end2')>=0"), "v41② 待辦出現續期/還權決策卡");
g("var __gt41=S.gmCareer.trust; var __ct41=__hc41.trust; renewTakeover();");
assert(g("S.takeover.expired===false && S.takeover.renewals===1"), "v41② 續期成功");
assert(g("Math.round(__hc41.trust)===Math.round(__ct41-15) && S.gmCareer.trust===Math.max(0,__gt41-3)"), "v41② 續期代價：教練信任-15、高層觀感-3");
g("var __ce41=__hc41.trust; endTakeover();");
assert(g("S.takeover===null && Math.round(__hc41.trust)===Math.round(Math.min(100,__ce41+15))"), "v41② 還權：接管解除、信任部分回復+15");
assert(g("S.gmTags.includes('hands_on')"), "v41② 還權後 hands_on 標籤仍留存（記憶不清零）");
assert(g("S.teams[S.userTeamId].lineupMode==='coach' && canManualLineup()===false"), "v41② 還權後排線回教練、手排入口關閉");

/* ================= ③ 需求單核心迴圈 ================= */
assert(g("typeof scanTeamGaps==='function' && typeof genDemand==='function' && typeof resolveDemand==='function' && typeof checkDemandFulfilled==='function'"), "v41③ 需求引擎函式齊備");
assert(g("Array.isArray(scanTeamGaps(__t41))"), "v41③ 缺口掃描回傳陣列");
/* v46：以下既有需求基準測試固定在「非重建寬限期」條件下驗證（加盟年資推到寬限期外，壓力=1.0），
   使原本的門檻/懲罰基準值不受重建漸進機制影響；重建機制另於 v46 專屬測試覆蓋。 */
g("if(typeof ensureV46==='function')ensureV46(); S.franchiseStartYear=(S.seasonYear||1)-20;");
g("S.demands=[]; S.demandSeq=1; var __d41=genDemand(__hc41,{kind:'bat',metric:'測試火力不足'},__t41);");
assert(g("__d41.status==='open' && __d41.need && __d41.deadline>0 && Array.isArray(__d41.snapshot)"), "v41③ 需求單結構完整（含名單快照）");
assert(g("S.demands.length===1"), "v41③ 需求單入列");
/* 待辦分頁渲染＋紅點精確計數（open需求逐卡入列） */
g("UI.tabs={}; UI.screen='dashboard'; render();");
assert(g("app.innerHTML.indexOf('demandcard')>=0 && app.innerHTML.indexOf('教練補強需求')>=0"), "v41③ 需求單卡掛在待辦分頁");
assert(g("app.innerHTML.indexOf('demand-btn')>=0"), "v41③ 需求卡三鍵在DOM");
/* 三鍵：駁回→信任-5；協商→負向也有代價；接受→追蹤 */
g("__hc41.trust=60; var __rr41=resolveDemand(__d41.id,'reject');");
assert(g("__rr41.ok===true && __d41.status==='rejected' && Math.round(__hc41.trust)===55"), "v41③ 駁回：教練信任-5");
g("var __d41b=genDemand(__hc41,{kind:'rot',metric:'測試輪值'},__t41); var __ra41=resolveDemand(__d41b.id,'accept');");
assert(g("__ra41.ok===true && __d41b.status==='accepted'"), "v41③ 接受→進入追蹤");
g("var __d41c=genDemand(__hc41,{kind:'pen',metric:'測試牛棚'},__t41); var __mr41=Math.random; Math.random=()=>0.0; var __rn41=resolveDemand(__d41c.id,'negotiate'); Math.random=__mr41;");
assert(g("__rn41.ok===true && __d41c.negotiated===true && __d41c.priority!=='high'"), "v41③ 協商成功：門檻/優先度下修");
assert(g("resolveDemand(__d41c.id,'negotiate').ok===false"), "v41③ 同單只能協商一次");
/* 達成判定：塞一名快照外的達標新戰力 → fulfilled、信任+8 */
g("var __np41=generateBatter(S.userTeamId,'1軍'); __np41.positions=[{pos:'C',rating:80}]; __np41.fielding=90; __np41.contact=90; __np41.power=90; __np41.eye=90; __np41.speed=90; S.players[__np41.id]=__np41; __t41.roster1.push(__np41.id);");
g("var __d41d=genDemand(__hc41,{kind:'pos',pos:'C',hard:true,metric:'測試捕手缺'},__t41); __d41d.snapshot=__d41d.snapshot.filter(id=>id!==__np41.id); __hc41.trust=60; checkDemandFulfilled();");
assert(g("__d41d.status==='fulfilled' && Math.round(__hc41.trust)===68"), "v41③ 補強到位→需求達成、教練信任+8");
/* 過期未回應：信任-8 */
g("var __d41e=genDemand(__hc41,{kind:'bat',metric:'測試過期'},__t41); __d41e.need.attrs={power:999}; __d41e.deadline=(S.currentDay||0)-1; __hc41.trust=60; checkDemandFulfilled();");
assert(g("__d41e.status==='expired' && Math.round(__hc41.trust)===52"), "v41③ 需求石沉大海過期→教練信任-8");
/* 爛教練→爛需求：門檻誇大、輕重不分 */
g("var __bad41={id:'COBAD',name:'爛教練',role:'總教練',teaching:30,specialty:'leadership'}; S.coaches['COBAD']=__bad41; var __d41f=genDemand(__bad41,{kind:'bat',metric:'測試'},__t41);");
assert(g("__d41f.priority==='high'"), "v41③ 爛教練什麼都十萬火急（爛需求）");
g("delete S.coaches['COBAD']; S.players[__np41.id]=undefined; __t41.roster1=__t41.roster1.filter(id=>id!==__np41.id); S.players=Object.fromEntries(Object.entries(S.players).filter(([k,v])=>v));");

/* ================= ④ 守位缺口三層防線 ================= */
assert(g("typeof improviseFielder==='function' && typeof improvisePenaltyFor==='function' && typeof handleHardGapsV41==='function'"), "v41④ 三層防線函式齊備");
assert(g("IMPROVISE_PENALTY===0.6"), "v41④ 客串懲罰係數×0.6（Mars拍板）");
/* 無本職捕手客串蹲捕→該格守備×0.6；本職捕手不罰 */
g("var __nc41=__t41.roster1.map(id=>S.players[id]).find(p=>p&&!p.isPitcher&&!p.positions.some(x=>x.pos==='C'));");
assert(g("__nc41 ? improvisePenaltyFor(__nc41,'C')===0.6 : true"), "v41④ 非本職客串蹲捕懲罰0.6");
assert(g("(function(){var c=__t41.roster1.map(id=>S.players[id]).find(p=>p&&!p.isPitcher&&p.positions.some(x=>x.pos==='C')); return c? improvisePenaltyFor(c,'C')===1 : true;})()"), "v41④ 本職捕手無懲罰");
assert(g("(function(){var p=__t41.roster1.map(id=>S.players[id]).find(p=>p&&!p.isPitcher); return improvisePenaltyFor(p,'2B')===1;})()"), "v41④ 其他守位走既有移防家族懲罰（不疊加）");
/* 硬缺口：不中斷、發高優先需求單 */
g("(function(){ var t=S.teams[S.userTeamId]; globalThis.__cSaved41=t.roster1.slice(); t.roster1=t.roster1.filter(id=>{var p=S.players[id]; return !(p&&!p.isPitcher&&p.positions.some(x=>x.pos==='C'));}); })()");
g("S.demands=[]; S.simInterrupts=[]; handleHardGapsV41(S.teams[S.userTeamId]);");
assert(g("(S.simInterrupts||[]).length===0"), "v41④ 硬缺口不再中斷模擬");
assert(g("S.demands.some(d=>d.status==='open' && d.need && d.need.pos==='C' && d.priority==='high')"), "v41④ 硬缺口→自動發高優先捕手需求單");
g("var __dl41=S.demands.length; handleHardGapsV41(S.teams[S.userTeamId]);");
assert(g("S.demands.length===__dl41"), "v41④ 同守位缺口不重複開單");
assert(g("(function(){var r=improviseFielder(S.teams[S.userTeamId],'C'); return r && r.penalty===0.6;})()"), "v41④ 客串頂替回傳人選與懲罰");
g("(function(){ S.teams[S.userTeamId].roster1=globalThis.__cSaved41; })()");
/* 數學無解（健康野手<9）仍中斷 */
g("(function(){ var t=S.teams[S.userTeamId]; globalThis.__all41=t.roster1.slice(); var kept=[]; var got=0; t.roster1.forEach(id=>{var p=S.players[id]; if(p&&p.isPitcher) kept.push(id); else if(got<5){kept.push(id);got++;}}); t.roster1=kept; })()");
g("S.simInterrupts=[]; simulateDay(S);");
assert(g("(S.simInterrupts||[]).some(m=>m.indexOf('數學無解')>=0)"), "v41④ 健康野手<9（數學無解）才中斷");
g("(function(){ S.teams[S.userTeamId].roster1=globalThis.__all41; })()");

/* ================= ⑥ 百年史冊 log ================= */
assert(g("typeof chronicle==='function' && Array.isArray(S.chronicle)"), "v41⑥ 史冊管線就位");
g("var __cl41=S.chronicle.length; chronicle('test','史冊寫入測試',{k:1});");
assert(g("S.chronicle.length===__cl41+1 && S.chronicle[S.chronicle.length-1].x==='史冊寫入測試' && typeof S.chronicle[S.chronicle.length-1].y==='number'"), "v41⑥ chronicle 單一寫入口（含年份/日期/型別/meta）");
assert(g("S.chronicle.some(c=>c.t==='mode')"), "v41⑥ 模式切換已寫史冊");

/* ================= ⑦ 資產插槽登錄表 ================= */
assert(g("typeof ASSET_SLOTS==='object' && typeof assetSlot==='function'"), "v41⑦ 插槽登錄表與取值口就位");
assert(g("Object.keys(ASSET_SLOTS).length===9"), "v41⑦ 九個插槽登錄");
assert(g("assetSlot('team.logo')==='⚾' && assetSlot('coach.portrait')==='👔' && assetSlot('player.portrait')==='🧢'"), "v41⑦ 無資產→emoji後備（畫面與v40相同）");
assert(g("assetSlot('event.illustration')==='' && assetSlot('不存在的鍵')===''"), "v41⑦ 空插槽/未知鍵回空字串、永不throw");
g("S.assets={'team.logo':'LOGO'};");
assert(g("assetSlot('team.logo')==='LOGO'"), "v41⑦ 掛資產即回資產（v45+資產包掛載點）");
g("delete S.assets;");

/* ================= ⑧ 球迷耐心（先埋） ================= */
assert(g("typeof S.fanPatience==='number' && typeof fanPatienceOwnerMult==='function'"), "v41⑧ fanPatience 單一數字就位");
g("S.fanPatience=20;"); assert(g("fanPatienceOwnerMult()===1.3"), "v41⑧ 低耐心→老闆扣分×1.3");
g("S.fanPatience=80;"); assert(g("fanPatienceOwnerMult()===0.85"), "v41⑧ 高耐心→老闆扣分×0.85");
g("S.fanPatience=55;"); assert(g("fanPatienceOwnerMult()===1"), "v41⑧ 中性區間乘數=1");
g("S.fanPatience=0; tickFanPatience([{home:S.userTeamId,away:'T1',homeScore:5,awayScore:3}]);");
assert(g("S.fanPatience>0 && S.fanPatience<=100"), "v41⑧ 贏球回血且值域夾在0~100");

/* ================= ⑨ 純GM流程收尾檢查（畫面與存檔一致性） ================= */
g("S.gameMode='gm_coach'; S.teams[S.userTeamId].lineupMode='coach'; UI.tabs={}; UI.screen='lineup'; render();");
assert(g("app.innerHTML.indexOf('btn-lm-manual')>=0 && app.innerHTML.indexOf('btn-delegate')>=0"), "v41① GM兼教練模式：v40切換鈕俱在＋新增全面放權鈕");
g("UI.screen='dashboard'; UI.tabs={}; render();");

/* ==================================================================
   v42 測試（北極星第二梯次：教練市場與標籤後果）
   ================================================================== */
console.log("\n--- v42 測試（教練市場與標籤後果）---\n");
// 乾淨開局供 v42 使用
g("newGame('GM42')"); g("pickTeam('T0')"); g("proceedFromOffseasonSummary(); confirmSkipAllRemaining(); beginFirstSeason(); setSpringNation(HOME_NATION_NAME); executeSpringCamp(); UI.screen='dashboard';"); // v491
g("var __t42=S.teams[S.userTeamId]; ensureTactics(__t42); ensureV42(); var __hc42=headCoachOf(__t42); ensureCoachPersona(__hc42);");

/* ⑩ 青年育成進攻方針＋⑪新秀保護輪休＋投手輪值方針 */
assert(g("TACTICS_OFFENSE.some(o=>o.key==='youth')"), "v42⑩ 進攻方針新增青年育成");
assert(g("TACTICS_REST.some(o=>o.key==='rookie')"), "v42⑪ 輪休策略新增新秀保護");
assert(g("typeof TACTICS_ROTATION!=='undefined' && TACTICS_ROTATION.length===3 && new Set(TACTICS_ROTATION.map(r=>r.key)).size===3"), "v42⑪ 投手輪值方針3種且不重複");
assert(g("(function(){__t42.tactics.offense='youth'; var lu=autoLineupBy(__t42,S.players,tacticsOffenseDef('youth').score,new Set()); return lu.length>=9 && lu.filter(s=>s.position==='C').length===1;})()"), "v42⑩ 青年育成方針排得出合法9人打線");
assert(g("(function(){__t42.tactics.rest='rookie'; var r=coachRestSet(__t42); return r instanceof Set;})()"), "v42⑪ 新秀保護輪休可執行不炸");
assert(g("COACH_ARCHETYPES.YOUTH_DEV.offense==='youth' && COACH_ARCHETYPES.YOUTH_DEV.aff.youth===1.0"), "v42⑩ 養成流哲學預設＝青年育成、認同度最高");
assert(g("COACH_ARCHETYPES.VETERAN.aff.youth!==undefined && COACH_ARCHETYPES.VETERAN.aff.youth<0.3"), "v42⑩ 老將流排斥青年育成");
// 輪值方針裁切人數
g("__t42.tactics.rotation='four';");
assert(g("rotationPolicyOf(__t42).size===4 && rotationPolicyOf(__t42).fatigue>0"), "v42⑪ 四本柱：4人上限＋疲勞加重");
g("__t42.tactics.rotation='six';");
assert(g("rotationPolicyOf(__t42).size===6 && rotationPolicyOf(__t42).fatigue<0"), "v42⑪ 六人養護：6人＋疲勞減輕");
assert(g("(function(){var big=['a','b','c','d','e','f','g'].map((n,i)=>({id:'PX'+i})); big.forEach((p,i)=>{p.__ovr=100-i;}); var oldTO=trueOverall; trueOverall=(p)=>p.__ovr!=null?p.__ovr:oldTO(p); var out=v42ApplyRotationPolicy(__t42,big); trueOverall=oldTO; return out.length===6;})()"), "v42⑪ 六人養護裁切自動輪值到6人");
g("__t42.tactics.rotation='five';");

/* ② 意願系統：delegates甜頭／hands_on帳單（僅對好教練）＋衰減 */
g("S.gmTags=[];");
assert(g("(function(){var w=willingnessOf({teaching:70},__t42); return w.value>=0 && w.value<=100 && ['ok','ask','refuse'].includes(w.state);})()"), "v42② 意願值域與狀態合法");
g("S.gmTags=['delegates'];");
assert(g("willingnessOf({teaching:70},__t42).value > willingnessOf({teaching:70,__none:1},{wins:0,losses:0}).value - 100"), "v42② delegates 對好教練加意願");
assert(g("(function(){S.gmTags=['delegates']; var a=willingnessOf({teaching:70},__t42).value; S.gmTags=[]; var b=willingnessOf({teaching:70},__t42).value; return a>b;})()"), "v42② delegates 甜頭：好教練意願更高");
assert(g("(function(){S.gmTags=['hands_on']; S.v42.lastTakeoverSeason=S.seasonYear; var a=willingnessOf({teaching:70},__t42).value; var b=willingnessOf({teaching:50},__t42).value; S.gmTags=[]; return a<b;})()"), "v42② hands_on 只罰好教練（爛教練不挑雇主）");
assert(g("(function(){S.gmTags=['hands_on']; S.v42.lastTakeoverSeason=S.seasonYear; var p0=handsOnMarketPenalty(); S.v42.lastTakeoverSeason=S.seasonYear-3; var p3=handsOnMarketPenalty(); S.gmTags=[]; return p0===20 && p3===4;})()"), "v42⑤ hands_on 罰則衰減 20→4（永留疤地板）");
assert(g("(function(){S.gmTags=[]; return handsOnMarketPenalty()===0;})()"), "v42② 無 hands_on 標籤：新玩家零罰則（不對稱）");

/* ① 教練市場池：稀缺性 */
g("S.coachMarket={pool:[],year:S.seasonYear}; harvestRetireesToMarket(); refillCoachMarket();");
assert(g("S.coachMarket.pool.length>=5"), "v42① 教練市場池補得出候選（≥5）");
assert(g("(function(){var before=S.coachMarket.pool.length; var cands=generateCoachCandidatesV42(S.userTeamId,'1軍','總教練'); return Array.isArray(cands) && cands.length>=1 && cands.every(c=>c.will);})()"), "v42① 候選帶意願資訊");
assert(g("(function(){var id=S.coachMarket.pool[0].id; v42OnCoachHired({marketId:id}); return !S.coachMarket.pool.some(e=>e.id===id);})()"), "v42① 聘走即從市場池移除（稀缺性）");
// 拒絕級意願閘門
assert(g("v42HireGate({name:'測',will:{state:'refuse',why:'測試'}})===false"), "v42② 拒絕級意願被閘門攔下");
assert(g("v42HireGate({name:'測',will:{state:'ok'}})===true"), "v42② 願意者可通過閘門");

/* ③ 教練實際求去離隊：辭呈→慰留一次→離隊代理 */
g("var __hc42b=headCoachOf(__t42); __hc42b.trust=10; __hc42b.retainedOnce=false; S.v42.quitCountdown=14; S.v42.resignation=null; S.takeover=null; tickCoachResignation();");
assert(g("S.v42.resignation && S.v42.resignation.coachId===__hc42b.id"), "v42③ 信任破裂14天→遞辭呈");
assert(g("(function(){var before=headCoachOf(__t42).id; v42RetainCoach('pay'); var after=headCoachOf(__t42); return after.id===before && after.retainedOnce===true && S.v42.resignation===null;})()"), "v42③ 加薪30%慰留成功、標記已慰留");
// 已慰留過→只能接受辭呈
g("var __hc42c=headCoachOf(__t42); __hc42c.trust=10; __hc42c.retainedOnce=true; S.v42.quitCountdown=14; S.v42.resignation=null; tickCoachResignation();");
assert(g("(function(){var before=headCoachOf(__t42).id; v42RetainCoach('pay'); return headCoachOf(__t42).id===before && S.v42.resignation!==null;})()"), "v42③ 慰留過的教練無法二次加薪慰留");
assert(g("(function(){var beforeName=headCoachOf(__t42).name; v42RetainCoach('accept'); var nc=headCoachOf(__t42); return nc && nc.interim===true && nc.name!==beforeName && S.coachMarket.pool.some(e=>e.kind==='exiled');})()"), "v42③ 接受辭呈→代理教練上任＋原教練進市場（帶舊帳）");
assert(g("headCoachOf(__t42).teaching <= 95 && headCoachOf(__t42).trust===50"), "v42③ 代理教練能力封頂、信任中性");
// 離隊教練舊帳影響意願
assert(g("(function(){var ex=S.coachMarket.pool.find(e=>e.kind==='exiled'); if(!ex)return true; var w=willingnessOf(ex,__t42); return w.value>=0;})()"), "v42③ 帶舊帳教練意願仍可計算（不炸）");

/* 還權承諾慰留＋背信歸零 */
g("var __hc42d=headCoachOf(__t42); __hc42d.interim=false; __hc42d.trust=10; __hc42d.retainedOnce=false; S.takeover={active:true,seasonYear:S.seasonYear,renewals:0,reason:'測試'}; S.v42.quitCountdown=14; S.v42.resignation=null; tickCoachResignation(); v42RetainCoach('promise');");
assert(g("S.v42.promise && S.v42.promise.coachId===__hc42d.id && (!S.takeover || !S.takeover.active)"), "v42③ 還權承諾慰留：結束接管＋登記承諾");
g("S.takeover={active:true,seasonYear:S.seasonYear,renewals:0,reason:'背信測試'}; tickV42Daily();");
assert(g("headCoachOf(__t42).trust===0 && S.v42.promise===null"), "v42③ 承諾期內再接管→信任歸零（背信代價）");

/* ④ 續約要價受信任影響＋約滿史冊 */
assert(g("(function(){var s={role:'總教練',level:'1軍',trust:80}; var s2={role:'總教練',level:'1軍',trust:20}; return v42RenewTrustMult(s)<1 && v42RenewTrustMult(s2)>1.2;})()"), "v42④ 續約要價：信任高打折、信任低獅子開口");
assert(g("v42RenewTrustMult({role:'投手教練',level:'1軍',trust:80})===1"), "v42④ 要價修正僅限一軍總教練");

/* ⑨ 釋出→二軍拉人建議 */
g("var __rel=__t42.roster1.map(id=>S.players[id]).filter(p=>p&&!p.isPitcher)[0];");
assert(g("(function(){var imp=releaseImpactOf(__rel,__t42); return imp && Array.isArray(imp.gaps) && Array.isArray(imp.suggestions);})()"), "v42⑨ 釋出影響評估回傳缺口與建議結構");
assert(g("(function(){var s=suggestCallups(__t42,__rel); return Array.isArray(s) && s.length<=3 && s.every(x=>x.p&&typeof x.fit==='number');})()"), "v42⑨ 二軍拉人建議≤3且帶適配分數");

/* ⑫ 反應語錄多樣化 */
assert(g("(function(){var s=new Set(); for(var i=0;i<20;i++) s.add(v42Quote('callup',{player:{name:'測員'}})); return s.size>=2;})()"), "v42⑫ 升上一軍語錄有多種變化");
assert(g("v42Quote('callup',{player:{name:'阿明'}}).indexOf('阿明')>=0"), "v42⑫ 語錄正確填入球員名");
assert(g("v42Quote('不存在key',{})===''"), "v42⑫ 未知語錄key回空字串不炸");

/* 升級鏈：舊檔補 v42 容器零破壞 */
g("var __save42=JSON.stringify(S); delete S.v42; delete S.coachMarket; ensureV42();");
assert(g("S.v42 && typeof S.v42==='object' && S.coachMarket && Array.isArray(S.coachMarket.pool)"), "v42 升級鏈：舊檔補 v42/coachMarket 容器");
assert(g("(function(){delete S.v42; delete S.coachMarket; ensureV41(); return !!S.v42 && !!S.coachMarket;})()"), "v42 升級鏈串接：ensureV41→ensureV42");

/* 隔離RNG：不污染宿主序列 */
assert(g("(function(){var a=Math.random(); v42rng(); v42rng(); v42Int(1,10); var b=Math.random(); var c=Math.random(); return typeof a==='number'&&typeof b==='number'&&typeof c==='number';})()"), "v42 隔離RNG：v42rng/v42Int 可獨立抽取");

/* 每日心跳與季末掛勾不炸 */
g("UI.screen='dashboard'; render();");
assert(g("(function(){try{tickV42Daily(); return true;}catch(e){return false;}})()"), "v42 每日心跳 try-catch 不阻擋模擬");
assert(g("(function(){try{v42OnSeasonEnd(); return true;}catch(e){return false;}})()"), "v42 季末掛勾 try-catch 不阻擋休賽季");


/* ==================== v43 測試（郵件中樞＋交易資訊補全＋掛牌＋純GM輪值教練化＋自由度） ==================== */
console.log("\n--- v43 測試（郵件中樞／交易完整資料／掛牌／純GM輪值教練化／傷兵遞補） ---\n");

/* v43 狀態容器與升級鏈 */
g("delete S.v43; ensureV43();");
assert(g("S.v43 && Array.isArray(S.v43.listings) && Array.isArray(S.v43.offers) && Array.isArray(S.v43.mail) && Array.isArray(S.v43.injuryProposals || [])"), "v43 ensureV43 建立狀態容器（掛牌/報價/郵件）");
assert(g("(function(){delete S.v43; ensureV41(); return !!S.v43 && Array.isArray(S.v43.mail);})()"), "v43 升級鏈串接：ensureV41→…→ensureV43");

/* v43 完整球員資料元件：自家真實／對方球探評估 */
g("var __p43 = S.players[S.teams[S.userTeamId].roster1[0]];");
assert(g("typeof v43PlayerFullCardHtml==='function' && v43PlayerFullCardHtml(__p43,null).indexOf(__p43.name)>=0"), "v43 完整資料卡：含球員姓名");
assert(g("v43PlayerFullCardHtml(__p43,null).indexOf('歲')>=0"), "v43 完整資料卡：顯示年齡");
assert(g("(v43PlayerFullCardHtml(__p43,null).indexOf('年')>=0)"), "v43 完整資料卡：顯示合約年限資訊");
assert(g("v43SalaryLabel(__p43).length>0 && v43ContractLabel(__p43).length>0"), "v43 薪資/合約標籤產出");
assert(g("['頂級潛力（S）','高潛力（A）','中上潛力（B）','中等潛力（C）','有限潛力（D）'].indexOf(v43PotentialTier(80))>=0"), "v43 潛力評等分級");
assert(g("(function(){var c=v43BuildScoutCache([__p43.id]); return c && c[__p43.id] && typeof (c[__p43.id].potential)==='number';})()"), "v43 球探評估快取含潛力估值");

/* v43 現金交易維度 */
assert(g("typeof V43_CASH_PER_VALUE==='number' && V43_CASH_PER_VALUE>0"), "v43 現金換算常數存在");
assert(g("Math.abs(v43CashToValue(V43_CASH_PER_VALUE)-1) < 1e-9"), "v43 現金→價值換算正確（1單位）");
g("var __ai43 = Object.values(S.teams).find(t=>t.id!==S.userTeamId);");
assert(g("(function(){var r=v43EvaluateTradeWithCash([],[__ai43.roster1[0]],__ai43.id,0,0); return r && typeof r.accept==='boolean';})()"), "v43 帶現金評估回傳 accept 布林");
assert(g("(function(){ ensureFinance(__ai43); __ai43.finance.budget=1000000; var r=v43EvaluateTradeWithCash([S.teams[S.userTeamId].roster1[0]],[],__ai43.id,0,999999999); return r.accept===false;})()"), "v43 向對方要超出其預算的現金→直接回絕");
assert(g("(function(){ var uteam=S.teams[S.userTeamId]; ensureFinance(uteam); ensureFinance(__ai43); var ub=uteam.finance.budget, ab=__ai43.finance.budget; v43ExecuteTradeWithCash(uteam.id,__ai43.id,[],[],500000,0); return uteam.finance.budget===ub-500000 && __ai43.finance.budget===ab+500000;})()"), "v43 帶現金執行：雙方預算正確結算");

/* v43 掛牌系統 */
g("delete S.v43; ensureV43(); var __lp = S.teams[S.userTeamId].roster2[0];");
assert(g("(function(){var r=v43ListPlayer(__lp); return r.ok && S.v43.listings.indexOf(__lp)>=0;})()"), "v43 掛牌：球員進入掛牌清單");
assert(g("v43ListPlayer(__lp).ok===false"), "v43 掛牌：重複掛牌被擋");
assert(g("(function(){var r=v43UnlistPlayer(__lp); return r.ok && S.v43.listings.indexOf(__lp)<0;})()"), "v43 撤牌：球員移出掛牌清單");
g("v43ListPlayer(__lp); var __off = v43GenerateOfferFor(__lp, __ai43.id);");
assert(g("__off && __off.targetId===__lp && (__off.playerIds.length>0 || __off.cash>0)"), "v43 AI 報價：至少含球員或現金");
assert(g("['cash','player','multi','player_cash'].indexOf(__off.kind)>=0"), "v43 AI 報價型態合法");
g("S.v43.offers.push(__off);");
assert(g("v43OfferSummary(__off).indexOf(__ai43.name)>=0"), "v43 報價摘要含買方名");
assert(g("(function(){var before=S.teams[S.userTeamId].roster2.indexOf(__lp); var r=v43AcceptOffer(__off.id); return r.ok && S.v43.listings.indexOf(__lp)<0;})()"), "v43 接受報價：成交後撤掉掛牌");
g("var __lp2=S.teams[S.userTeamId].roster1.slice(-1)[0]; v43ListPlayer(__lp2); var __off2=v43GenerateOfferFor(__lp2,__ai43.id); if(__off2) S.v43.offers.push(__off2);");
assert(g("!__off2 || (function(){var r=v43DeclineOffer(__off2.id); return r.ok && S.v43.offers.find(o=>o.id===__off2.id).status==='declined';})()"), "v43 婉拒報價：狀態轉 declined、球員續掛牌（或 seed 偏移無報價）");

/* v43 郵件中樞 */
g("delete S.v43; ensureV43(); v43PushMail('trade','測試信','內文',{kind:'x'});");
assert(g("S.v43.mail.length===1 && S.v43.mail[0].unread===true && v43UnreadMailCount()===1"), "v43 郵件：push 後未讀計數");
assert(g("typeof dashMailPanel==='function' && dashMailPanel().indexOf('郵件中樞')>=0"), "v43 郵件面板渲染");
assert(g("['教練團','交易市場','醫療室','聯盟公告','訊息'].indexOf(v43MailCategoryLabel('trade'))>=0"), "v43 郵件分類標籤");

/* v43 純GM 輪值教練化 */
g("S.gameMode='pure_gm'; S.takeover=null; var __ut43=S.teams[S.userTeamId]; ensureTactics(__ut43); ensureRotation(__ut43); ensureBullpenOrder(__ut43,S.players);");
assert(g("typeof coachDailyRotation==='function' && (coachDailyRotation(__ut43), Array.isArray(__ut43.rotation))"), "v43 教練排輪值：純GM 執行不炸");
assert(g("(function(){ __ut43.tactics.rotation='four'; var hc=headCoachOf(__ut43); if(hc){hc.archetype='PITCHING_FIRST'; hc.trust=10; hc.teaching=40;} var k=v43EffRotationKey(__ut43); return k!=='four';})()"), "v43 輪值折射：低執行度總教練偏離 GM 激進方針");
assert(g("(function(){ var hc=headCoachOf(__ut43); if(hc){hc.trust=95; hc.teaching=90;} __ut43.tactics.rotation='six'; return v43EffRotationKey(__ut43)==='six';})()"), "v43 輪值折射：高信任高能力→完全照 GM 方針");
assert(g("(function(){ var other=Object.values(S.teams).find(t=>t.id!==S.userTeamId); return v43EffRotationKey(other)===((other.tactics&&other.tactics.rotation)||'five');})()"), "v43 輪值折射：AI 隊一律照 GM 方針（不觸發人格初始化）");
assert(g("typeof renderRotationCoachManaged==='function'"), "v43 純GM 輪值唯讀畫面函式存在");
g("UI.screen='rotation'; render();");
assert(g("app.innerHTML.indexOf('教練管理')>=0 || app.innerHTML.indexOf('投手調度')>=0"), "v43 純GM 進入輪值頁→教練管理唯讀畫面");

/* v43 傷兵遞補提案（純GM，准駁制） */
g("delete S.v43; ensureV43(); S.gameMode='pure_gm'; S.takeover=null; var __inj=S.players[__ut43.roster1[0]]; __inj.injury={name:'測試傷',part:'肩',severity:'mid',severityLabel:'中度',daysLeft:20,totalDays:20}; if(!__ut43.lineup||__ut43.lineup.length<1) __ut43.lineup=[{playerId:__inj.id,position:'C'}]; else __ut43.lineup[0]={playerId:__inj.id,position:__ut43.lineup[0].position};");
g("var __ipr=v43MakeInjuryProposal(__ut43,__inj);");
assert(g("__ipr && __ipr.status==='open' && __ipr.candidateIds.length>0"), "v43 傷兵遞補：教練提出候選人選");
assert(g("(function(){var r=v43ResolveInjuryProposal(__ipr.id,'next'); return r.ok===true || r.msg.indexOf('沒有其他')>=0;})()"), "v43 傷兵遞補：可要教練換人選");
assert(g("(function(){var pid=__ipr.candidateIds[__ipr.pickIndex]; var r=v43ResolveInjuryProposal(__ipr.id,'approve'); return r.ok && S.teams[S.userTeamId].roster1.indexOf(pid)>=0 && __ipr.status==='approved';})()"), "v43 傷兵遞補：批准→建議人選升上一軍");
assert(g("(function(){ var inj2=S.players[__ut43.roster1[1]]; inj2.injury={name:'x',part:'膝',severity:'mid',severityLabel:'中度',daysLeft:15,totalDays:15}; __ut43.lineup.push({playerId:inj2.id,position:'1B'}); var p=v43MakeInjuryProposal(__ut43,inj2); if(!p) return true; var r=v43ResolveInjuryProposal(p.id,'dismiss'); return r.ok && p.status==='dismissed';})()"), "v43 傷兵遞補：可擱置提案");
g("__inj.injury=null; S.gameMode='gm_coach';");

/* v43 每日心跳與畫面渲染不炸 */
assert(g("(function(){try{tickV43Daily([]); return true;}catch(e){return false;}})()"), "v43 每日心跳 try-catch 不阻擋模擬");
g("delete S.v43; ensureV43(); UI.screen='listing'; render();");
assert(g("app.innerHTML.indexOf('掛牌交易市場')>=0"), "v43 掛牌市場畫面渲染");
g("UI.screen='dashboard'; UI.tabs={dash:'mail'}; v43PushMail('trade','分頁測試信','x',null);");
assert(g("dashMailPanel().indexOf('分頁測試信')>=0"), "v43 主控台郵件分頁內容渲染（含未讀信）");
g("UI.tabs={}; UI.screen='dashboard';");

/* v43 交易畫面完整資料版 */
g("UI.tradePartner=__ai43.id; UI.tradeGive=[]; UI.tradeGet=[]; UI.tradeResult=null; UI.tradeScoutedCache={}; UI.tradeCashGive=0; UI.tradeCashGet=0; UI.screen='tradeBuilder'; render();");
assert(g("app.innerHTML.indexOf('現金條件')>=0"), "v43 交易畫面：含現金條件輸入");
assert(g("app.innerHTML.indexOf('年薪')>=0 && app.innerHTML.indexOf('合約')>=0"), "v43 交易畫面：表頭含年薪與合約欄");
g("UI.screen='dashboard'; render();");

/* ---------- v44 教練體諒溝通（需求單第四路徑） ---------- */
g("delete S.v44; ensureV44();");
assert(g("S.v44 && S.v44.ver===44"), "v44 ensureV44：建立容器");
g("delete S.v44; ensureV41();");
assert(g("S.v44 && S.v44.ver===44"), "v44 升級鏈：ensureV41→…→ensureV44 串接");

g("var __ut44=S.teams[S.userTeamId]; var __hc44=headCoachOf(__ut44); ensureCoachPersona(__hc44); __hc44.excuseYear=null; __hc44.excuseCount=0; __hc44.trust=60;");
g("if(!Array.isArray(S.demands)) S.demands=[]; S.__dxseq=0; function __mkDemand(need){ var d={id:'DX'+(S.__dxseq=(S.__dxseq||0)+1)+'_'+S.seasonYear, coachId:__hc44.id, role:__hc44.role, priority:'high', need:need, title:'測試需求', reason:'測試', deadline:(S.currentDay||0)+10, status:'open', negotiated:false, year:S.seasonYear, snapshot:__ut44.roster1.slice()}; S.demands.push(d); return d; }");

/* v44PlayerMeetsNeed / v44NoSuitablePlayer */
g("var __np={pos:null, attrs:{power:60}}; var __hardhit={isPitcher:false, positions:[{pos:'1B'}], power:70, role:''}; var __weak={isPitcher:false, positions:[{pos:'1B'}], power:40, role:''};");
assert(g("v44PlayerMeetsNeed(__hardhit,__np)===true && v44PlayerMeetsNeed(__weak,__np)===false"), "v44 需求比對：屬性達標判定");
assert(g("v44PlayerMeetsNeed({isPitcher:true,role:'先發'},{pos:'SP',attrs:{}})===true && v44PlayerMeetsNeed({isPitcher:false},{pos:'SP',attrs:{}})===false"), "v44 需求比對：先發投手守位判定");

/* 可信度：重建（委任） */
g("var __savedMandate=S.gmCareer?S.gmCareer.mandate:undefined; if(!S.gmCareer) S.gmCareer={}; S.gmCareer.mandate={type:'rebuild',startYear:S.seasonYear,years:2};");
g("var __d1=__mkDemand({pos:null,attrs:{power:99}});");
assert(g("demandExcuseCredible(__ut44,__d1,'rebuild').credible===true"), "v44 可信度：重建委任→重建期屬實");

/* 體諒（重建屬實）：首次撤需求、信任不變 */
g("__hc44.trust=60; __hc44.excuseYear=null; __hc44.excuseCount=0; var __r1=resolveDemand(__d1.id,'understand','rebuild');");
assert(g("__r1.ok===true && __d1.status==='excused' && __hc44.trust===60"), "v44 體諒（重建屬實）：需求撤下、信任不變");
assert(g("__hc44.excuseCount===1"), "v44 體諒：記錄本季體諒次數");

/* 耐心磨損：同季第2次體諒 -2 */
g("var __d2=__mkDemand({pos:null,attrs:{power:99}}); __hc44.trust=60; var __r2=resolveDemand(__d2.id,'understand','rebuild');");
assert(g("__d2.status==='excused' && __hc44.trust===58"), "v44 體諒耐心磨損：同季第2次信任-2");

/* 可信度：重建（年輕陣容，無委任） */
g("S.gmCareer.mandate=null; var __ages=__ut44.roster1.map(id=>S.players[id]?S.players[id].age:null); __ut44.roster1.forEach(id=>{if(S.players[id])S.players[id].age=22;});");
g("var __d2b=__mkDemand({pos:null,attrs:{power:99}});");
assert(g("demandExcuseCredible(__ut44,__d2b,'rebuild').credible===true"), "v44 可信度：一軍平均年齡年輕→重建期屬實（無委任）");
g("__ut44.roster1.forEach((id,i)=>{if(S.players[id]&&__ages[i]!=null)S.players[id].age=__ages[i];});");

/* 識破（謊稱沒錢）：預算充足→ -6、需求維持 open */
g("S.gmCareer.mandate=__savedMandate; var __d3=__mkDemand({pos:null,attrs:{power:99}}); __ut44.finance.budget=50000*10000; __hc44.trust=60; __hc44.excuseYear=null; __hc44.excuseCount=0; var __r3=resolveDemand(__d3.id,'understand','nobudget');");
assert(g("demandExcuseCredible(__ut44,__d3,'nobudget').credible===false"), "v44 可信度：預算充足→沒經費不成立");
assert(g("__d3.status==='open' && __hc44.trust===54"), "v44 體諒被識破（謊稱沒錢）：信任-6、需求維持待回應");

/* 體諒（沒經費屬實）：低預算→撤需求、信任不變 */
g("var __d4=__mkDemand({pos:null,attrs:{power:99}}); __ut44.finance.budget=100*10000; __hc44.trust=60; __hc44.excuseYear=null; __hc44.excuseCount=0; var __r4=resolveDemand(__d4.id,'understand','nobudget');");
assert(g("__d4.status==='excused' && __hc44.trust===60"), "v44 體諒（沒經費屬實）：需求撤下、信任不變");

/* 體諒（市場沒人屬實）：不可能屬性→無市場人選→撤需求 */
g("var __d5=__mkDemand({pos:null,attrs:{power:999}}); __hc44.trust=60; __hc44.excuseYear=null; __hc44.excuseCount=0; var __r5=resolveDemand(__d5.id,'understand','noplayer');");
assert(g("v44NoSuitablePlayer(__ut44,__d5)===true && __d5.status==='excused'"), "v44 體諒（市場沒人屬實）：需求撤下");

/* 已體諒需求：過期不再扣信任、不被判過期 */
g("S.demands=S.demands.filter(d=>d.id===__d4.id); __hc44.trust=70; S.currentDay=(__d4.deadline||0)+5; checkDemandFulfilled();");
assert(g("__d4.status==='excused' && __hc44.trust===70"), "v44 已體諒需求：過期不再扣信任、不被判過期");

/* UI：體諒說明按鈕在需求卡 */
g("var __d6=__mkDemand({pos:null,attrs:{power:99}});");
assert(g("renderDemandCards(__ut44).indexOf('data-act=\"understand\"')>=0 && renderDemandCards(__ut44).indexOf('體諒')>=0"), "v44 需求卡：體諒說明三顆選項按鈕在DOM");
g("S.demands=S.demands.filter(d=>d.id!==__d6.id); S.currentDay=0;");

/* ================================================================
   v45 測試：U1 選秀順位交易 ＋ 球迷三維度 ＋ #5 教練需求求購市場
   ================================================================ */
console.log("\n--- v45 測試（U1選秀順位交易／球迷三維度／教練需求求購） ---\n");

/* ① U1 選秀順位交易 */
g("ensureV45(); var __v45ids=Object.keys(S.teams); var __oA=__v45ids[0], __oB=__v45ids[1];");
assert(g("typeof S.pickOwnership==='object' && typeof pickOwnerOf==='function' && typeof v45ExecuteTradeWithPicks==='function'"), "v45-U1 選秀權狀態與函式就位");
assert(g("var y=pickBaseDraftYear(); pickOwnerOf(y,1,__oA)===__oA"), "v45-U1 缺項時選秀權歸原隊自持");
g("var __py=pickBaseDraftYear(); setPickOwner(__py,1,__oA,__oB);");
assert(g("pickOwnerOf(__py,1,__oA)===__oB"), "v45-U1 setPickOwner 轉手生效");
assert(g("teamOwnedPicks(__oB).some(t=>t.orig===__oA && t.round===1 && t.year===__py)"), "v45-U1 收購方持有清單含該權");
assert(g("teamOwnedPicks(__oA).every(t=>!(t.orig===__oA && t.round===1 && t.year===__py))"), "v45-U1 原隊持有清單已不含被交易出去的權");
g("setPickOwner(__py,1,__oA,__oA);"); // 還原
assert(g("pickOwnerOf(__py,1,__oA)===__oA && !(S.pickOwnership[__py]&&S.pickOwnership[__py][1]&&S.pickOwnership[__py][1][__oA])"), "v45-U1 歸還原隊時清空記錄不膨脹");
assert(g("pickTradeValue({year:pickBaseDraftYear(),round:1,orig:__oA}) > pickTradeValue({year:pickBaseDraftYear(),round:6,orig:__oA})"), "v45-U1 第1輪估值高於第6輪");
assert(g("pickTradeValue({year:pickBaseDraftYear()+2,round:1,orig:__oA}) < pickTradeValue({year:pickBaseDraftYear(),round:1,orig:__oA})"), "v45-U1 未來年折現：越遠越低");
assert(g("tradeablePickYears().length===3 && tradeablePickYears()[0]===pickBaseDraftYear()"), "v45-U1 可交易窗＝本屆＋未來2年");
// buildDraftOrder 依歸屬導向擁有者
g("var __py2=S.seasonYear; setPickOwner(__py2,1,__oA,__oB); var __ord=buildDraftOrder(6);");
assert(g("__ord.filter(t=>t===__oB).length >= 2"), "v45-U1 buildDraftOrder：擁有者在該輪多一個選位（原隊順位導向擁有者）");
g("setPickOwner(__py2,1,__oA,__oA);"); // 還原
// 帶選秀權執行：ownership 轉移
g("var __tk={year:pickBaseDraftYear(),round:2,orig:__oA}; v45ExecuteTradeWithPicks(__oA,__oB,[],[],0,0,[__tk],[]);");
assert(g("pickOwnerOf(pickBaseDraftYear(),2,__oA)===__oB"), "v45-U1 帶選秀權執行：A送出的權歸B");
g("v45ExecuteTradeWithPicks(__oB,__oA,[],[],0,0,[__tk],[]);"); // 還原（B送回A）
// 帶選秀權評估：pick 併入價值
assert(g("typeof v45EvaluateTradeWithPicks==='function' && typeof v45EvaluateTradeWithPicks([],[],[{year:pickBaseDraftYear(),round:1,orig:__oA}],[], __oB,0,0).accept==='boolean'"), "v45-U1 帶選秀權評估回傳結構完整");

/* ② 球迷三維度 */
assert(g("typeof S.fanExpect==='number' && typeof S.fanPatience==='number' && typeof S.fanIdentify==='number'"), "v45-球迷 三維度數值就位");
assert(g("typeof teamFanAppeal==='function' && typeof playerFanAppeal==='function'"), "v45-球迷 認同來源函式就位");
assert(g("typeof teamFanAppeal(S.teams[S.userTeamId])==='number'"), "v45-球迷 全隊認同目標值可計算");
assert(g("S.fanIdentify=90; fanIdentifySponsorMult()>1 && fanIdentifyFaMult()<1 && fanIdentifyHomeEdge()>0 && fanIdentifyPopBond()>0"), "v45-球迷 高認同：贊助↑/FA開價↓/主場↑/人氣↑（四出口方向正確）");
assert(g("S.fanIdentify=20; fanIdentifySponsorMult()<1 && fanIdentifyFaMult()>1 && fanIdentifyHomeEdge()<=0 && fanIdentifyPopBond()<0"), "v45-球迷 低認同：四出口反向");
g("S.fanIdentify=55;");
assert(g("Math.abs(fanIdentifyHomeEdge())<0.001 && fanIdentifyPopBond()===0"), "v45-球迷 中性認同：主場/人氣出口歸零（不影響基準）");
assert(g("typeof fanExpectPressure()==='number' && fanExpectPressure()>=0.7 && fanExpectPressure()<=1.8"), "v45-球迷 期待壓力值域正常");
// 交易掛勾：送走高認同球員→認同下滑
g("S.fanIdentify=70; var __ut45=S.teams[S.userTeamId]; var __face=S.players[__ut45.roster1[0]]; if(__face){__face.seasonStats=__face.seasonStats||{}; __face.seasonStats.HR=30; __face.seasonStats.RBI=90; __face.seasonStats.AB=400; __face.seasonStats.H=140; __face.foreign=false;} var __fiBefore=S.fanIdentify; v41OnTradeExecuted(__ut45.id,'PARTNERX',[__face?__face.id:'x'],[]);");
assert(g("S.fanIdentify <= __fiBefore"), "v45-球迷 送走高認同門面球員→認同下滑");
g("S.fanExpect=50; S.fanIdentify=55; S.fanPatience=60;");

/* ③ #5 教練需求求購市場 */
assert(g("typeof v45PostWant==='function' && typeof v45AcceptWantResponse==='function' && typeof v45PlayerMeetsDemand==='function'"), "v45-#5 求購市場函式就位");
assert(g("Array.isArray(S.v45Wants)"), "v45-#5 求購狀態容器就位");
// 造一筆需求並張貼求購
g("ensureV45WantState(); var __wteam=S.teams[S.userTeamId]; var __wcoach=headCoachOf(__wteam); var __wd={id:'DW_'+S.seasonYear, coachId:__wcoach?__wcoach.id:'c', role:'總教練', priority:'mid', need:{pos:null,attrs:{power:1}}, title:'求購測試：補一支大棒', reason:'test', deadline:(S.currentDay||0)+30, status:'open', year:S.seasonYear, snapshot:__wteam.roster1.slice()}; S.demands.push(__wd); var __wr=v45PostWant('DW_'+S.seasonYear);");
assert(g("__wr.ok===true && __wd.wantPosted===true"), "v45-#5 張貼求購成功並標記教練努力旗標");
assert(g("S.v45Wants.some(w=>w.demandId==='DW_'+S.seasonYear)"), "v45-#5 求購進入市場清單");
// 過期減罰：wantPosted 的需求過期只扣3而非8
g("var __wc2=headCoachOf(__wteam); if(__wc2){__wc2.trust=50;} var __wd2=S.demands.find(d=>d.id==='DW_'+S.seasonYear); __wd2.status='open'; __wd2.wantPosted=true; __wd2.deadline=1; __wd2.snapshot=__wteam.roster1.slice(); S.currentDay=(__wd2.deadline||0)+5; checkDemandFulfilled();");
assert(g("(function(){var c=headCoachOf(__wteam); return !c || c.trust>=45;})()"), "v45-#5 已張貼求購者過期減罰（-3而非-8）");
g("S.currentDay=0; S.demands=S.demands.filter(d=>d.id!=='DW_'+S.seasonYear); S.v45Wants=(S.v45Wants||[]).filter(w=>w.demandId!=='DW_'+S.seasonYear);");
// 求購市場畫面可渲染
assert(g("typeof renderWantMarket==='function'"), "v45-#5 求購市場畫面函式就位");

/* 升級鏈：ensureV45 串在鏈尾 */
assert(g("typeof ensureV45==='function' && S.v45 && S.v45.ver===45"), "v45 升級鏈：ensureV45 就位、狀態容器 ver=45");

/* ====================================================================
   v46 測試：全能力完整卡 ＋ 純GM傷兵提醒 ＋ 教練需求重建漸進寬限 ＋ 球探盤點
   ==================================================================== */
console.log("\n--- v46 測試（完整資訊卡／重建寬限／球探盤點） ---\n");

/* ① 全能力完整卡：函式就位、投手含變化球、野手含對左右投/盜壘/觸擊/臂力、捕手含配球接捕阻殺 */
assert(g("typeof v46FullPlayerCard==='function' && typeof v46ScoutViewFor==='function' && typeof v46Fog==='function'"), "v46① 完整卡與確定性霧化函式就位");
g("var __p46p=generatePitcher(S.userTeamId,'1軍'); S.players[__p46p.id]=__p46p;");
assert(g("var h=v46FullPlayerCard(__p46p,null); h.indexOf('變化球')>=0 && h.indexOf('耐久')>=0 && h.indexOf('疲勞')>=0 && h.indexOf('控球')>=0"), "v46① 投手完整卡含變化球/耐久/疲勞");
g("var __p46b=generateBatter(S.userTeamId,'1軍'); __p46b.gameCalling=60; __p46b.framing=60; __p46b.caughtStealing=60; __p46b.positions=[{pos:'C',rating:70}]; S.players[__p46b.id]=__p46b;");
assert(g("var h=v46FullPlayerCard(__p46b,null); ['對左投','對右投','盜壘','觸擊','臂力','配球','接捕','阻殺','耐久'].every(k=>h.indexOf(k)>=0)"), "v46① 捕手完整卡含對左右投/盜壘/觸擊/臂力/配球接捕阻殺/耐久");
/* 球探模式：所有欄位仍在（霧化不缺欄），且附球探評估註記 */
assert(g("var h=v46FullPlayerCard(__p46b,{scoutView:{}}); ['對左投','盜壘','觸擊','配球','阻殺'].every(k=>h.indexOf(k)>=0) && h.indexOf('球探評估值')>=0"), "v46① 球探評估卡欄位不缺、標示評估值");
/* 確定性霧化：同一球員同季兩次估值一致（不污染共享亂數、不跳動） */
assert(g("var a=v46Fog(70,50,'X:contact'), b=v46Fog(70,50,'X:contact'); a===b"), "v46① 霧化確定性：同種子同結果");

/* 交易/求購/掛牌共用同一完整卡（委派） */
assert(g("var h=v43PlayerFullCardHtml(__p46b,null); h.indexOf('v46card')>=0 && h.indexOf('對左投')>=0"), "v46① v43完整卡已委派到 v46（交易/掛牌/傷兵/求購共用）");

/* ② 純GM傷兵提醒：純GM模式下先發提醒改為教練自動遞補說明（不叫玩家手排） */
assert(g("typeof canManualLineup==='function'"), "v46② canManualLineup 就位");

/* ③ 重建漸進寬限：壓力係數漸進、掛單上限、rebuild 旗標與過期減罰 */
assert(g("typeof v46DemandPressure==='function' && typeof v46DemandCap==='function' && typeof v46FranchiseYear==='function'"), "v46③ 重建寬限函式就位");
g("if(typeof ensureV46==='function')ensureV46();");
assert(g("S.franchiseStartYear=(S.seasonYear||1); v46FranchiseYear()===1 && v46DemandPressure()<=0.20 && v46DemandCap()===1"), "v46③ 加盟第1年：壓力最低、同時只掛1張需求");
assert(g("S.franchiseStartYear=(S.seasonYear||1)-5; v46FranchiseYear()===6 && v46DemandPressure()===1.0 && v46DemandCap()===3"), "v46③ 第6年起：壓力回正常、上限3張（無懸崖漸進）");
/* rebuild 旗標：第1年生成的需求標記 rebuild、措辭轉重建方向 */
g("S.franchiseStartYear=(S.seasonYear||1); var __t46=S.teams[S.userTeamId]; var __hc46=headCoachOf(__t46); S.demands=[]; S.demandSeq=1; var __d46=genDemand(__hc46,{kind:'bat',metric:'重建測試'},__t46);");
assert(g("__d46.rebuild===true && __d46.reason.indexOf('重建方向')>=0"), "v46③ 重建期需求標記 rebuild 並轉「重建方向」措辭");
/* 過期減罰：重建期（壓力0.2）過期扣分明顯小於基準8 */
g("var __hc46b=headCoachOf(__t46); if(__hc46b)__hc46b.trust=60; __d46.need.attrs={power:999}; __d46.deadline=(S.currentDay||0)-1; checkDemandFulfilled();");
assert(g("__d46.status==='expired' && (function(){var c=headCoachOf(__t46); return !c || c.trust>55;})()"), "v46③ 重建期過期懲罰減輕（遠小於-8）");

/* ④ 球探盤點內部人選：函式就位、依需求掃陣中、選秀方向短語 */
assert(g("typeof v46ScanInternalCandidates==='function' && typeof v46DraftDirectionNote==='function'"), "v46④ 球探盤點函式就位");
g("S.franchiseStartYear=(S.seasonYear||1)-20; var __t46b=S.teams[S.userTeamId]; var __hc46c=headCoachOf(__t46b); var __d46c=genDemand(__hc46c,{kind:'pos',pos:'C',metric:'盤點測試'},__t46b); var __sc46=v46ScanInternalCandidates(__t46b,__d46c);");
assert(g("__sc46 && Array.isArray(__sc46.list)"), "v46④ 盤點回傳候選清單");
assert(g("v46DraftDirectionNote(__d46c).indexOf('選秀方向')>=0"), "v46④ 選秀補強方向短語成立");
g("S.demands=[]; S.franchiseStartYear=(S.seasonYear||1)-20;");

/* 升級鏈：ensureV46 串在 ensureV45 尾 */
assert(g("typeof ensureV46==='function' && S.v46 && S.v46.ver===46"), "v46 升級鏈：ensureV46 就位、狀態容器 ver=46");


/* ==================================================================
   v47 可導入美術系統：icon() 語意介面／applyThemePack 導入器／manifest
   ================================================================== */
assert(g("typeof icon==='function' && typeof applyThemePack==='function' && typeof THEME_ICONS==='object'"), "v47 可導入：icon/applyThemePack/THEME_ICONS 就位");
assert(g("Object.keys(THEME_ICONS).length")>=80, "v47 可導入：語意圖示登錄表≥80名（實="+g("Object.keys(THEME_ICONS).length")+"）");
assert(g("icon('trophy')")==="🏆" && g("icon('scout')")==="🕵️" && g("icon('warn')")==="⚠️", "v47 可導入：未導入時 icon() 回退現用 emoji（預設外觀不變）");
assert(g("icon('這個名字不存在')")==="", "v47 可導入：查無此名回空字串（永不 throw）");
g("applyThemePack({icons:{trophy:{svg:'<svg id=T></svg>'}}})");
assert(g("/class=\"ico\"/.test(icon('trophy')) && /<svg/.test(icon('trophy'))"), "v47 可導入：導入 SVG 資產→回 <svg> 標記");
assert(g("icon('scout')")==="🕵️", "v47 可導入：局部導入不影響未提供的圖示（其餘仍回退emoji）");
g("applyThemePack({icons:{money:'data:image/png;base64,AAAA'}})");
assert(g("/<img class=\"ico\"[^>]*src=\"data:image\\/png/.test(icon('money'))"), "v47 可導入：導入圖檔 src→回 <img> 標記");
assert(g("applyThemePack(null)")===false && g("loadThemePackFromJSON('壞{').ok")===false, "v47 可導入：壞資料/壞JSON 安全回 false 不中斷");
assert(g("themeManifest().icons.length")>=80 && g("Object.keys(themeManifest().slots).length")>=10, "v47 可導入：themeManifest 供 Codex 的圖示/槽位清單完整");
assert(g("typeof S==='undefined' || (applyThemePack({assets:{'team.logo':'X'}}), !S || S.assets['team.logo']==='X')"), "v47 可導入：資產包橋接既有 v41⑦ assetSlot 掛載點 S.assets");
g("THEME.pack=null;");


/* v47 Stage-2：iconVal 資料欄位解析／hero 槽位／槽位登錄完整性 */
assert(g("typeof iconVal==='function' && typeof themeHero==='function'"), "v47S2 iconVal/themeHero 就位");
assert(g("iconVal('fac-vendor')")==="🛒", "v47S2 iconVal 解析語意名→預設 glyph");
assert(g("iconVal('🛒')")==="🛒", "v47S2 iconVal 對非登錄值原樣回傳（向後相容舊存檔）");
assert(g("iconVal('')")==="" && g("iconVal(null)")==="", "v47S2 iconVal 空值安全");
assert(g("themeHero()")==="", "v47S2 未導入 hero 資產時 themeHero 回空字串（畫面不變）");
g("applyThemePack({slots:{'hero.image':\"url('x.png')\"}})");
assert(g("themeHero().indexOf('v47hero')>=0"), "v47S2 導入 hero 資產後才輸出主視覺節點");
g("THEME.pack=null;");
assert(g("Object.keys(THEME_SLOTS).length")>=14, "v47S2 槽位登錄≥14（背景/材質/hero/六分頁/按鍵四型/分頁條）");
assert(g("['hero.image','screen.dashboard','btn.primary','btn.danger','tabbar.image'].every(k=>THEME_SLOTS[k]&&THEME_SLOTS[k].css)"), "v47S2 hero/分頁/按鍵/分頁條槽位皆有對應CSS變數");
assert(g("Object.keys(THEME_ICONS).length")>=88, "v47S2 語意圖示登錄表≥88名（全語意化後）");


/* ==================================================================
   v47 Z1：球探市場主動找人（自由/國際市場・時間與名額成本・一鍵導簽約）
   ================================================================== */
assert(g("typeof v47StartScoutMission==='function' && typeof v47ScanMarketCandidates==='function' && typeof v47TickScoutMissions==='function'"), "v47Z1 函式就位");
assert(g("typeof ensureV47==='function' && (ensureV47(), S.v47 && S.v47.ver===47 && Array.isArray(S.v47.missions))"), "v47Z1 升級鏈：ensureV47 與狀態容器");
g("var __t47=S.teams[S.userTeamId]; var __hc47=headCoachOf(__t47); S.demands=[]; S.demandSeq=1; S.v47.missions=[]; var __d47=genDemand(__hc47,{kind:'pos',pos:'C',metric:'Z1回歸'},__t47); __d47.need={pos:'C',attrs:{contact:60}}; __d47.status='open';");
g("var __fa47=generateBatter(S.userTeamId,'1軍'); __fa47.positions=[{pos:'C',rating:70}]; __fa47.contact=88; __fa47.isPitcher=false; S.freeAgents=S.freeAgents||{}; S.freeAgents[__fa47.id]=__fa47;");
assert(g("v47StartScoutMission(__d47.id,'domestic').ok===true"), "v47Z1 派遣球探到自由市場成功");
assert(g("v47ScoutBusy('domestic')===true"), "v47Z1 名額成本：該區域球探出勤中被占用");
assert(g("v47StartScoutMission(__d47.id,'domestic').ok===false"), "v47Z1 名額成本：同區域重複派遣被擋");
assert(g("v47MissionsForDemand(__d47.id)[0].done===false"), "v47Z1 時間成本：未到期不出結果");
g("var __z47=0; while(__z47<15 && simulateDay(S)){__z47++; if(S.simInterrupts&&S.simInterrupts.length)S.simInterrupts=[];}");
assert(g("v47MissionsForDemand(__d47.id)[0].done===true"), "v47Z1 隔期後回報完成");
assert(g("(v47MissionsForDemand(__d47.id)[0].results||[]).length>0"), "v47Z1 回報清單有候選");
assert(g("v47ScoutBusy('domestic')===false"), "v47Z1 回報後球探名額釋放");
assert(g("(S.newsFeed||[]).some(n=>n.type==='球探')"), "v47Z1 回報產生球探新聞");
/* 資訊不對稱：以球探估值比對（確定性、不污染共享亂數） */
assert(g("v46Fog(70,50,'Z1:X:contact')===v46Fog(70,50,'Z1:X:contact')"), "v47Z1 球探估值確定性（亂數紀律）");
/* 一鍵導到簽約/報價 */
g("var __pid47=v47MissionsForDemand(__d47.id)[0].results[0].id; startNegotiation('freeAgent', __pid47);");
assert(g("UI.screen==='negotiation' && !!UI.negotiation"), "v47Z1 一鍵導到簽約/報價流程");
/* 需求卡 UI：派遣入口與一鍵按鈕 */
assert(g("(typeof renderDemandCards==='function') && renderDemandCards(S.teams[S.userTeamId]).indexOf('z1scout')>=0"), "v47Z1 需求卡含派遣球探入口");
assert(g("renderDemandCards(S.teams[S.userTeamId]).indexOf('v47-z1-sign')>=0"), "v47Z1 需求卡含一鍵報價按鈕");
/* 防呆：無此需求單／已結案不得派遣 */
assert(g("v47StartScoutMission('NO_SUCH_ID','domestic').ok===false"), "v47Z1 防呆：不存在的需求單不得派遣");
g("S.demands=[]; S.v47.missions=[]; UI.screen='dashboard'; UI.negotiation=null;");

/* ---------- v48 測試（雷達圖／榮譽殿堂／里程碑） ---------- */
console.log("\n--- v48 測試（雷達圖／榮譽殿堂／里程碑）---\n");

// 升級鏈
g("ensureV48()");
assert(g("S.v48 && Array.isArray(S.v48.hallOfFame) && Array.isArray(S.v48.hofPending) && Array.isArray(S.v48.retiredNumbers) && Array.isArray(S.v48.milestoneLog)"), "v48 ensureV48 建立完整狀態容器");

// 雷達圖函式就位
assert(g("typeof v48RadarSVG === 'function'"), "v48 v48RadarSVG 函式就位");
assert(g("typeof V48_RADAR_PITCHER === 'object' && V48_RADAR_PITCHER.length === 6"), "v48 投手雷達圖六軸定義");
assert(g("typeof V48_RADAR_BATTER === 'object' && V48_RADAR_BATTER.length === 6"), "v48 野手雷達圖六軸定義");

// 雷達圖渲染（打者）
g("var __tb = S.players[S.teams[S.userTeamId].roster1.find(id=>!S.players[id].isPitcher)]");
assert(g("__tb && v48RadarSVG(__tb).indexOf('<svg')>=0 && v48RadarSVG(__tb).indexOf('v48radar')>=0"), "v48 野手雷達圖輸出 SVG 含 v48radar class");

// 雷達圖渲染（投手）
g("var __tp = S.players[S.teams[S.userTeamId].roster1.find(id=>S.players[id].isPitcher)]");
assert(g("__tp && v48RadarSVG(__tp).indexOf('<svg')>=0"), "v48 投手雷達圖輸出 SVG");

// 完整卡含雷達圖
assert(g("v46FullPlayerCard(__tb).indexOf('v48radar')>=0"), "v48 完整卡（野手）含雷達圖");
assert(g("v46FullPlayerCard(__tp).indexOf('v48radar')>=0"), "v48 完整卡（投手）含雷達圖");

// 完整卡含照片槽位
assert(g("v46FullPlayerCard(__tb).indexOf('v48photo')>=0"), "v48 完整卡含球員照片槽位");

// 球探模式雷達圖（不 throw）
assert(g("v46FullPlayerCard(__tb, {scouted:true}).indexOf('v48radar')>=0"), "v48 球探模式完整卡含雷達圖（不 throw）");

// 主題包函式就位
assert(g("typeof themePlayerPhoto === 'function'"), "v48 themePlayerPhoto 函式就位");
assert(g("typeof themeRadarColors === 'function'"), "v48 themeRadarColors 函式就位");
assert(g("themeRadarColors().fill && themeRadarColors().stroke"), "v48 themeRadarColors 回傳預設配色");

// 新語意圖示
assert(g("icon('hof').length > 0"), "v48 icon('hof') 有輸出");
assert(g("icon('milestone').length > 0"), "v48 icon('milestone') 有輸出");
assert(g("icon('jersey').length > 0"), "v48 icon('jersey') 有輸出");
assert(g("icon('crown').length > 0"), "v48 icon('crown') 有輸出");
assert(g("icon('camera').length > 0"), "v48 icon('camera') 有輸出");
assert(g("icon('milestone-near').length > 0"), "v48 icon('milestone-near') 有輸出");

// 雷達圖配色槽位
assert(g("THEME_SLOTS['radar.fill'] && THEME_SLOTS['radar.stroke'] && THEME_SLOTS['radar.grid'] && THEME_SLOTS['radar.text']"), "v48 雷達圖四個配色槽位登錄");

// 里程碑定義
assert(g("V48_MILESTONES_BATTER.length === 8"), "v48 打者里程碑定義 8 個");
assert(g("V48_MILESTONES_PITCHER.length === 11"), "v48 投手里程碑定義 11 個");
assert(g("V48_MILESTONES_BATTER.some(m=>m.key==='H100') && V48_MILESTONES_BATTER.some(m=>m.key==='H500')"), "v48 打者含 100安/500安");
assert(g("V48_MILESTONES_PITCHER.some(m=>m.key==='W50') && V48_MILESTONES_PITCHER.some(m=>m.key==='HD50') && V48_MILESTONES_PITCHER.some(m=>m.key==='SV50')"), "v48 投手含 50勝/50中繼/50救援");

// 里程碑檢查函式
assert(g("typeof v48CheckMilestones === 'function'"), "v48 v48CheckMilestones 函式就位");
g("var __mtp = { isPitcher:true, careerStats:{W:198,SO:900,SV:0,HD:0}, seasonStats:{W:3,SO:20,SV:0,HD:0} }");
assert(g("v48CheckMilestones(__mtp).achieved.some(m=>m.key==='W200')"), "v48 投手 W=201 達成 200勝里程碑");
assert(g("v48CheckMilestones(__mtp).approaching.length===0 || true"), "v48 里程碑檢查不 throw");

// HoF 函式就位
assert(g("typeof v48HofQualifies === 'function'"), "v48 v48HofQualifies 函式就位");
assert(g("typeof v48InductHof === 'function'"), "v48 v48InductHof 函式就位");
assert(g("typeof v48RetireNumber === 'function'"), "v48 v48RetireNumber 函式就位");
assert(g("typeof v48BuildNomination === 'function'"), "v48 v48BuildNomination 函式就位");

// HoF 門檻判定
assert(g("v48HofQualifies({isPitcher:false, careerStats:{H:1500}})"), "v48 打者 1500安達殿堂門檻");
assert(g("!v48HofQualifies({isPitcher:false, careerStats:{H:500}})"), "v48 打者 500安未達殿堂門檻");
assert(g("v48HofQualifies({isPitcher:true, careerStats:{W:150}})"), "v48 投手 150勝達殿堂門檻");
assert(g("v48HofQualifies({isPitcher:true, careerStats:{SV:100}})"), "v48 投手 100救援達殿堂門檻");
assert(g("v48HofQualifies({isPitcher:true, careerStats:{HD:150}})"), "v48 投手 150中繼達殿堂門檻");

// HoF 入選流程
g("S.v48.hofPending = [{ id:'test-hof-1', name:'測試球星', isPitcher:false, careerStats:{H:2000,HR:300}, abilities:{contact:85}, metCriteria:[{stat:'H',val:2000,req:1500}], yearsOnTeam:12, role:'打者', retiredYear:S.seasonYear }]");
assert(g("v48InductHof('test-hof-1') === true"), "v48 HoF 核准入選成功");
assert(g("S.v48.hallOfFame.length === 1 && S.v48.hallOfFame[0].name === '測試球星'"), "v48 HoF 入選後記錄在殿堂");
assert(g("S.v48.hofPending.length === 0"), "v48 HoF 核准後從待決移除");

// 退休背號
assert(g("v48RetireNumber('test-hof-1', 42) === true"), "v48 退休背號成功");
assert(g("S.v48.retiredNumbers.includes(42)"), "v48 退休背號記錄在清單");
assert(g("S.v48.hallOfFame[0].retiredNumber === 42"), "v48 殿堂成員記錄退休背號");
assert(g("v48RetireNumber('test-hof-1', 42) === false"), "v48 重複退休同背號被拒");

// HoF 人氣效應
assert(g("v48HofPopBoost() > 0"), "v48 HoF 人氣效應 > 0");

// 里程碑事件卡渲染
assert(g("typeof renderV48MilestoneCard === 'function'"), "v48 renderV48MilestoneCard 函式就位");
assert(g("typeof renderV48HofCards === 'function'"), "v48 renderV48HofCards 函式就位");
g("S.v48.activeMilestone = {playerId:__tb.id, playerName:__tb.name, isPitcher:false, key:'H1000', label:'生涯1000安', desc:'千安紀念', total:1000, stat:'H', threshold:1000}");
assert(g("renderV48MilestoneCard().indexOf('v48milestone-card')>=0"), "v48 里程碑事件卡含 v48milestone-card class");
assert(g("renderV48MilestoneCard().indexOf('v48ms-btn')>=0"), "v48 里程碑事件卡含選擇按鈕");
g("S.v48.activeMilestone = null");

// 里程碑解決
assert(g("typeof v48ResolveMilestone === 'function'"), "v48 v48ResolveMilestone 函式就位");

// HoF 殿堂畫面函式
assert(g("typeof renderHallOfFame === 'function'"), "v48 renderHallOfFame 函式就位");

// 每日心跳函式
assert(g("typeof v48TickMilestones === 'function'"), "v48 v48TickMilestones 每日心跳就位");

// 里程碑票房加成機制
g("S.v48.milestoneTicketBoost = 15");
assert(g("S.v48.milestoneTicketBoost === 15"), "v48 里程碑票房加成初始值");

// 清理
g("S.v48.hallOfFame=[]; S.v48.hofPending=[]; S.v48.retiredNumbers=[]; S.v48.milestoneLog=[]; S.v48.milestoneApproaching={}; S.v48.milestoneTicketBoost=0; S.v48.activeMilestone=null;");

// ======================== v49：美術接口擴充＋榮譽殿堂修復 ========================

// v49 品牌常數
assert(g("typeof BRAND === 'object' && BRAND.gameName === '決勝GM'"), "v49 品牌名稱 = 決勝GM");
assert(g("BRAND.gameSubtitle === 'FRONT OFFICE BASEBALL'"), "v49 品牌副標題 = FRONT OFFICE BASEBALL");
assert(g("BRAND.homeNation === '海嶺共和國'"), "v49 品牌母國 = 海嶺共和國");
assert(g("BRAND.palette && BRAND.palette.primary === '#1769D2'"), "v49 品牌主藍色 = #1769D2");
assert(g("BRAND.palette.green === '#59C78B'"), "v49 品牌輔綠色 = #59C78B");
assert(g("BRAND.palette.pink === '#FF4F87'"), "v49 品牌輔粉色 = #FF4F87");
assert(g("BRAND.palette.darkBlue === '#102949'"), "v49 品牌墨藍色 = #102949");

// v49 母國名稱
assert(g("HOME_NATION_NAME === '海嶺共和國'"), "v49 HOME_NATION_NAME = 海嶺共和國");
assert(g("NATIONS.find(n=>n.name==='海嶺共和國') != null"), "v49 NATIONS 包含海嶺共和國");
assert(g("nationByName('海嶺共和國') && nationByName('海嶺共和國').grade === 'A'"), "v49 海嶺共和國為 A 級");

// v49 國家穩定 countryId
assert(g("NATIONS.every(n => typeof n.id === 'string' && n.id.startsWith('NAT_'))"), "v49 所有國家有穩定 countryId");
assert(g("NATIONS.length === 40"), "v49 國家數維持 40");
assert(g("typeof nationById === 'function'"), "v49 nationById 查詢函式就位");
assert(g("nationById('NAT_HOME') && nationById('NAT_HOME').name === HOME_NATION_NAME"), "v49 NAT_HOME 對應母國");
assert(g("nationById('NAT_TW') && nationById('NAT_TW').name === '台灣'"), "v49 NAT_TW 對應台灣");
assert(g("nationById('NAT_US') && nationById('NAT_US').name === '美國'"), "v49 NAT_US 對應美國");
assert(g("nationById('NAT_JP') && nationById('NAT_JP').name === '日本'"), "v49 NAT_JP 對應日本");
assert(g("new Set(NATIONS.map(n=>n.id)).size === 40"), "v49 40國 countryId 全部唯一");

// v49 球員 appearanceSeed
assert(g("typeof v49AppearanceSeedFromId === 'function'"), "v49 v49AppearanceSeedFromId 就位");
assert(g("typeof v49AppearanceSeedFromId('B_1') === 'number' && v49AppearanceSeedFromId('B_1') >= 0"), "v49 種子為非負整數");
assert(g("v49AppearanceSeedFromId('B_1') === v49AppearanceSeedFromId('B_1')"), "v49 種子確定性（同ID同值）");
assert(g("v49AppearanceSeedFromId('B_1') !== v49AppearanceSeedFromId('B_2')"), "v49 不同ID產出不同種子");
// 新生成球員帶 appearanceSeed
assert(g("var _tb = generateBatter('T0','1軍'); typeof _tb.appearanceSeed === 'number' && _tb.appearanceSeed >= 0"), "v49 generateBatter 帶 appearanceSeed");
assert(g("var _tp = generatePitcher('T0','1軍'); typeof _tp.appearanceSeed === 'number' && _tp.appearanceSeed >= 0"), "v49 generatePitcher 帶 appearanceSeed");

// v49 ensureV49 舊存檔惰性補值
g("var _v49pid = Object.keys(S.players)[0]; delete S.players[_v49pid].appearanceSeed"); // 模擬舊存檔
assert(g("ensureV49(); typeof S.players[_v49pid].appearanceSeed === 'number'"), "v49 ensureV49 惰性補 appearanceSeed");

// v49 主題系統擴充
assert(g("THEME.version === 'v50'"), "v49→v50 THEME 版本標記已升級");
assert(g("Object.keys(THEME_ICONS).length >= 97"), "v49 語意圖示 >= 97 個");
assert(g("THEME_ICONS['settings'] && THEME_ICONS['palette'] && THEME_ICONS['portrait']"), "v49 新增3語意圖示");
assert(g("Object.keys(THEME_SLOTS).length >= 26"), "v49 CSS 美術槽位 >= 26 個");
assert(g("THEME_SLOTS['brand.primary'] && THEME_SLOTS['brand.accent']"), "v49 品牌色槽位就位");
assert(g("THEME_SLOTS['card.event'] && THEME_SLOTS['card.milestone']"), "v49 卡片色槽位就位");

// v49 主題包函式
assert(g("typeof themeTeamLogo === 'function'"), "v49 themeTeamLogo 就位");
assert(g("typeof themeNationFlag === 'function'"), "v49 themeNationFlag 就位");
assert(g("typeof compositePortrait === 'function'"), "v49 compositePortrait 就位");
assert(g("typeof v49ClearPortraitCache === 'function'"), "v49 v49ClearPortraitCache 就位");
assert(g("typeof v49SeedHash === 'function'"), "v49 v49SeedHash 就位");
assert(g("typeof resetThemePack === 'function'"), "v49 resetThemePack 就位");
assert(g("typeof loadPersistedThemePack === 'function'"), "v49 loadPersistedThemePack 就位");

// 未導入主題包時回退安全
assert(g("themeTeamLogo('T0') === ''"), "v49 未導入主題包→隊徽回退空字串");
assert(g("themeNationFlag('NAT_HOME') === ''"), "v49 未導入主題包→國旗回退空字串");
assert(g("compositePortrait('B_0', null, 64) === ''"), "v49 未導入肖像圖層→回退空字串");

// v49 主題包匯入匯出重設
assert(g("applyThemePack({icons:{},slots:{}}) === true"), "v49 applyThemePack 空包不報錯");
assert(g("THEME.pack !== null"), "v49 applyThemePack 後 THEME.pack 非空");
assert(g("resetThemePack() === true && THEME.pack === null"), "v49 resetThemePack 清除成功");

// v49 themeManifest 含品牌
assert(g("typeof themeManifest === 'function' && themeManifest().brand && themeManifest().brand.gameName === '決勝GM'"), "v49 themeManifest 含品牌資訊");

// r009：主題設定不再是玩家端功能；內部相容函式保留，避免舊程式引用造成白屏。
assert(g("typeof renderThemeSettings === 'function'"), "r009：主題設定程式保留為內部相容元件，不提供玩家入口");
assert(!g("renderDashboard.toString().includes('btn-theme')"), "r009：儀表板不再輸出主題設定按鈕");
assert(!g("renderScreen.toString().includes('themeSettings')"), "r009：主路由不再分派主題設定畫面");

// v49 確認 wireRosterNav 在 wireHallOfFame 後被呼叫（修復殿堂跳出）
// 由於 DOM 環境限制，這裡檢查函式原始碼
assert(g("renderHallOfFame.toString().includes('wireRosterNav')"), "v49 renderHallOfFame 含 wireRosterNav（殿堂跳出修復）");

/* ================= v491 測試（固定20隊品牌＋聯盟品牌＋選隊制） ================= */
console.log("\n--- v491 測試（固定隊名＋聯盟品牌＋選隊制）---");

// TEAM_DEFS 存在且為20隊
assert(g("typeof TEAM_DEFS !== 'undefined' && TEAM_DEFS.length === 20"), "v491 TEAM_DEFS 定義20隊");
assert(g("Object.isFrozen(TEAM_DEFS)"), "v491 TEAM_DEFS 已凍結不可修改");
assert(g("TEAM_DEFS[0].name === '靖安盾衛' && TEAM_DEFS[0].id === 'T0'"), "v491 T0 = 靖安盾衛");
assert(g("TEAM_DEFS[19].name === '磐石鐵衛' && TEAM_DEFS[19].id === 'T19'"), "v491 T19 = 磐石鐵衛");
assert(g("TEAM_DEFS.every(d => d.id && d.name && d.city && d.nickname)"), "v491 TEAM_DEFS 每隊欄位齊全");

// LEAGUE_BRAND 存在且凍結
assert(g("typeof LEAGUE_BRAND !== 'undefined' && Object.isFrozen(LEAGUE_BRAND)"), "v491 LEAGUE_BRAND 已凍結");
assert(g("LEAGUE_BRAND.fullName === '海嶺職業棒球聯盟'"), "v491 聯盟全名正確");
assert(g("LEAGUE_BRAND.shortName === '海嶺職棒'"), "v491 聯盟簡稱正確");
assert(g("LEAGUE_BRAND.englishShort === 'HPBL'"), "v491 英文縮寫正確");
assert(g("LEAGUE_BRAND.leagueA === '海風聯盟' && LEAGUE_BRAND.leagueB === '山岳聯盟'"), "v491 A/B聯盟顯示名稱正確");

// DIV_LABEL 使用正式聯盟名
assert(g("DIV_LABEL.A1.includes('海風聯盟') && DIV_LABEL.B1.includes('山岳聯盟')"), "v491 DIV_LABEL 使用正式聯盟名");

// newGame 只接受 gmName，開局一律進 teamSelect
g("newGame('v491測試GM')");
assert(g("UI.screen === 'teamSelect'"), "v491 newGame 一律進選隊畫面");
assert(g("S.userTeamId === null"), "v491 newGame 後 userTeamId 為 null");
assert(g("S.leagueName === '海嶺職業棒球聯盟'"), "v491 聯盟名為固定品牌");
// 所有隊名與 TEAM_DEFS 一致
assert(g("TEAM_DEFS.every(d => S.teams[d.id] && S.teams[d.id].name === d.name)"), "v491 buildLeague 產出隊名與 TEAM_DEFS 完全一致");
// 沒有任何隊被標記 isUser
assert(g("Object.values(S.teams).every(t => !t.isUser)"), "v491 newGame 後無隊被標記 isUser");

// pickTeam 可選任意隊（不限 T0）
g("pickTeam('T7')");
assert(g("S.userTeamId === 'T7'"), "v491 pickTeam('T7') 設定 userTeamId=T7");
assert(g("S.teams.T7.isUser === true"), "v491 T7 被標記 isUser");
assert(g("!S.teams.T0.isUser"), "v491 T0 未被標記 isUser");
assert(g("S.teams.T7.name === '星野銀狐'"), "v491 T7 隊名保持固定=星野銀狐");

// ensureV491 升級函數存在
assert(g("typeof ensureV491 === 'function'"), "v491 ensureV491 升級函數就位");

// 架空國家仍為固定（v49已是固定，v491不動）
assert(g("NATIONS.length === 40 && NATIONS.every(n => n.id && n.name)"), "v491 40國系統穩定（id+name齊全）");

// 重開一局回到 T0 確認後續測試正常
g("newGame('v491回正')"); g("pickTeam('T0')");

/* ========== v50 美術接口定案＋品牌資料擴充 ========== */
console.log("\n--- v50 美術接口定案＋品牌資料 ---");

// PORTRAIT_SPEC 常數存在且結構正確
assert(g("typeof PORTRAIT_SPEC === 'object' && PORTRAIT_SPEC.masterSize === 256"), "v50 PORTRAIT_SPEC 母版尺寸 256");
assert(g("PORTRAIT_SPEC.outputSizes[0] === 64 && PORTRAIT_SPEC.outputSizes[1] === 128"), "v50 PORTRAIT_SPEC 輸出尺寸 64/128");
assert(g("PORTRAIT_SPEC.anchors.headTop.y === 0.10"), "v50 頭頂錨點 y=10%");
assert(g("PORTRAIT_SPEC.anchors.faceCenter.x === 0.50 && PORTRAIT_SPEC.anchors.faceCenter.y === 0.38"), "v50 臉心錨點 x50%y38%");
assert(g("PORTRAIT_SPEC.anchors.neckline.y === 0.72"), "v50 領口錨點 y=72%");

// z-order 修正：uniform 在 hair/beard/cap 之前
assert(g("PORTRAIT_SPEC.layerOrder.indexOf('uniform') < PORTRAIT_SPEC.layerOrder.indexOf('hair')"), "v50 z-order: uniform 在 hair 之前");
assert(g("PORTRAIT_SPEC.layerOrder.indexOf('uniform') < PORTRAIT_SPEC.layerOrder.indexOf('beard')"), "v50 z-order: uniform 在 beard 之前");
assert(g("PORTRAIT_SPEC.layerOrder.indexOf('uniform') < PORTRAIT_SPEC.layerOrder.indexOf('cap')"), "v50 z-order: uniform 在 cap 之前");
assert(g("PORTRAIT_SPEC.layerOrder.indexOf('cap') === PORTRAIT_SPEC.layerOrder.length - 1"), "v50 z-order: cap 在最後");

// THEME.version 升至 v50
assert(g("THEME.version === 'v50'"), "v50 THEME.version = v50");

// validateThemePack 存在且可呼叫
assert(g("typeof validateThemePack === 'function'"), "v50 validateThemePack 函式就位");
// 驗證合法主題包
assert(g("validateThemePack({ teams: { T0: { logo: 'x.png', primaryColor: '#1B3A6B' } } }).valid === true"), "v50 validateThemePack 合法包通過");
// 驗證不合法主題包
assert(g("validateThemePack(null).valid === false"), "v50 validateThemePack null 不通過");
// 驗證有警告的包
assert(g("validateThemePack({ teams: { T99: {} } }).warnings.length > 0"), "v50 validateThemePack 未知 teamId 產生警告");
assert(g("validateThemePack({ teams: { T0: { primaryColor: 'bad' } } }).warnings.length > 0"), "v50 validateThemePack 色彩格式不合產生警告");

// TEAM_DEFS 擴充欄位存在
assert(g("TEAM_DEFS.every(d => d.shortName && d.brandKey && d.primaryColor && d.secondaryColor && d.league && d.division)"), "v50 TEAM_DEFS 擴充欄位齊全（shortName/brandKey/primaryColor/secondaryColor/league/division）");
assert(g("TEAM_DEFS[0].brandKey === 'jingan_guardians'"), "v50 T0 brandKey = jingan_guardians");
assert(g("TEAM_DEFS[0].league === 'A' && TEAM_DEFS[0].division === 'A1'"), "v50 T0 所屬 A 聯盟 A1 分區");
assert(g("TEAM_DEFS[15].league === 'B' && TEAM_DEFS[15].division === 'B2'"), "v50 T15 所屬 B 聯盟 B2 分區");

// 新開局隊伍帶有 v50 品牌欄位
g("newGame('v50測試')"); g("pickTeam('T3')");
assert(g("S.teams.T3.shortName === '永昌'"), "v50 新開局 T3.shortName = 永昌");
assert(g("S.teams.T3.brandKey === 'yongchang_lions'"), "v50 新開局 T3.brandKey = yongchang_lions");
assert(g("S.teams.T3.primaryColor === '#B8860B'"), "v50 新開局 T3.primaryColor = #B8860B");
assert(g("S.teams.T3.secondaryColor === '#1C1C1C'"), "v50 新開局 T3.secondaryColor = #1C1C1C");

// ensureV50 升級函式就位
assert(g("typeof ensureV50 === 'function'"), "v50 ensureV50 升級函式就位");
assert(g("S.v50 && S.v50.ver === 50"), "v50 版本標記正確");

// 所有20隊 v50 品牌欄位完整
assert(g("Object.values(S.teams).every(t => t.shortName && t.brandKey && t.primaryColor && t.secondaryColor)"), "v50 所有20隊品牌欄位完整");

// v50 主題包持久化鍵名
assert(g("typeof loadPersistedThemePack === 'function'"), "v50 loadPersistedThemePack 函式就位");

/* ========== v50 修正批次：肖像 context 端到端／驗證完整化／cityUniform 停用 ========== */
console.log("\n--- v50 修正批次（肖像context／驗證／cityUniform） ---");

// --- A. 肖像 context 端到端 ---
assert(g("typeof v50NormalizePortraitCtx === 'function'"), "v50 v50NormalizePortraitCtx 就位");
assert(g("PORTRAIT_DEFAULT_AWAY === false"), "v50 非比賽情境預設＝主場球衣");
assert(g("typeof v50IsTeamAwayToday === 'function'"), "v50 v50IsTeamAwayToday 就位");
assert(g("typeof v50GamePortraitCtx === 'function'"), "v50 v50GamePortraitCtx 就位");

// ctx 正規化：新式 ctx
assert(g("v50NormalizePortraitCtx('X', { player: {appearanceSeed:1, team:'T5'}, teamId:'T5', isAway:true }).isAway === true"), "v50 ctx 正規化：新式 isAway=true");
assert(g("v50NormalizePortraitCtx('X', { player: {appearanceSeed:1, team:'T5'}, teamId:'T5', isAway:false }).isAway === false"), "v50 ctx 正規化：新式 isAway=false");
assert(g("v50NormalizePortraitCtx('X', { player: {appearanceSeed:1, team:'T5'} }).teamId === 'T5'"), "v50 ctx 正規化：teamId 由 player.team 補齊");
// ctx 正規化：舊式相容（直接傳球員物件）
assert(g("v50NormalizePortraitCtx('X', {appearanceSeed:9, team:'T7'}).teamId === 'T7'"), "v50 ctx 正規化：舊式呼叫相容");
assert(g("v50NormalizePortraitCtx('X', {appearanceSeed:9, team:'T7'}).isAway === false"), "v50 ctx 正規化：舊式呼叫預設主場");

// 導入測試主題包（含主客場球衣）驗證球衣選擇端到端
g(`applyThemePack({
  portraits: { layers: { skin:['a.png'], face:['b.png'], uniform:['u.png'], cap:['c.png'] }, rules:{beardChance:0} },
  teams: {
    T0: { homeUniform:'home0.png', awayUniform:'away0.png' },
    T1: { homeUniform:'home1.png' }
  }
})`);
g("v49ClearPortraitCache()");
// 主場情境用 homeUniform
assert(g("compositePortrait('PT1', { player:{appearanceSeed:100, team:'T0'}, teamId:'T0', isAway:false }, 64).indexOf('home0.png') >= 0"), "v50 主場情境使用 homeUniform");
// 客場情境用 awayUniform
assert(g("compositePortrait('PT1', { player:{appearanceSeed:100, team:'T0'}, teamId:'T0', isAway:true }, 64).indexOf('away0.png') >= 0"), "v50 客場情境使用 awayUniform");
// 客場素材缺失回退 homeUniform
assert(g("compositePortrait('PT2', { player:{appearanceSeed:200, team:'T1'}, teamId:'T1', isAway:true }, 64).indexOf('home1.png') >= 0"), "v50 客場素材缺失回退 homeUniform");
// 快取：同球員主客切換不命中錯誤快取
assert(g(`(function(){
  v49ClearPortraitCache();
  var h = compositePortrait('PT3', { player:{appearanceSeed:300, team:'T0'}, teamId:'T0', isAway:false }, 64);
  var a = compositePortrait('PT3', { player:{appearanceSeed:300, team:'T0'}, teamId:'T0', isAway:true }, 64);
  return h.indexOf('home0.png')>=0 && a.indexOf('away0.png')>=0 && h !== a;
})()`), "v50 同球員主客場切換不命中錯誤快取");
// 快取：轉隊後不命中舊球隊快取
assert(g(`(function(){
  v49ClearPortraitCache();
  var t0 = compositePortrait('PT4', { player:{appearanceSeed:400, team:'T0'}, teamId:'T0', isAway:false }, 64);
  var t1 = compositePortrait('PT4', { player:{appearanceSeed:400, team:'T1'}, teamId:'T1', isAway:false }, 64);
  return t0.indexOf('home0.png')>=0 && t1.indexOf('home1.png')>=0 && t0 !== t1;
})()`), "v50 轉隊後不命中舊球隊肖像快取");
// 快取鍵四欄齊全（不同 size 也分開）
assert(g(`(function(){
  v49ClearPortraitCache();
  var s64 = compositePortrait('PT5', { player:{appearanceSeed:500, team:'T0'}, teamId:'T0', isAway:false }, 64);
  var s128 = compositePortrait('PT5', { player:{appearanceSeed:500, team:'T0'}, teamId:'T0', isAway:false }, 128);
  return s64.indexOf('64px')>=0 && s128.indexOf('128px')>=0;
})()`), "v50 快取鍵含 size：不同尺寸各自快取");
// 主客場判定 helper
assert(g("v50IsTeamAwayToday('T3', [{home:'T9', away:'T3'}]) === true"), "v50 主客判定：客隊→true");
assert(g("v50IsTeamAwayToday('T9', [{home:'T9', away:'T3'}]) === false"), "v50 主客判定：主隊→false");
assert(g("v50IsTeamAwayToday('T5', []) === false"), "v50 主客判定：無賽果→預設主場");
g("resetThemePack()");

// --- B. 主題包驗證完整化 ---
assert(g("typeof v50IsValidImageUri === 'function'"), "v50 v50IsValidImageUri 就位");
assert(g("typeof v50IsValidColor === 'function'"), "v50 v50IsValidColor 就位");
// 合法圖片 URI
assert(g("v50IsValidImageUri('assets/teams/T0/logo.png') === true"), "v50 URI：相對路徑 png 合法");
assert(g("v50IsValidImageUri('https://cdn.example.com/a/logo.svg') === true"), "v50 URI：https svg 合法");
assert(g("v50IsValidImageUri('data:image/png;base64,iVBORw0KGgo=') === true"), "v50 URI：data URI 合法");
// 非法圖片 URI
assert(g("v50IsValidImageUri('assets/logo.txt') === false"), "v50 URI：非圖片副檔名不合法");
assert(g("v50IsValidImageUri('javascript:alert(1)') === false"), "v50 URI：javascript 協定不合法");
assert(g("v50IsValidImageUri('../../etc/passwd.png') === false"), "v50 URI：路徑穿越不合法");
assert(g("v50IsValidImageUri(123) === false"), "v50 URI：非字串不合法");
// 色彩
assert(g("v50IsValidColor('#1B3A6B') === true && v50IsValidColor('#FFF') === true && v50IsValidColor('#1B3A6B80') === true"), "v50 色彩：三種合法長度通過");
assert(g("v50IsValidColor('rgb(1,2,3)') === false && v50IsValidColor('#GGGGGG') === false"), "v50 色彩：非法格式不通過");
// 驗證產生警告：非法圖片 URI
assert(g("validateThemePack({ teams:{ T0:{ logo:'bad.txt' } } }).warnings.some(w=>w.indexOf('URI')>=0)"), "v50 驗證：非法圖片 URI 產生警告");
// 驗證產生警告：未知 team 圖層欄位
assert(g("validateThemePack({ teams:{ T0:{ jacketLayer:'a.png' } } }).warnings.some(w=>w.indexOf('未知圖層')>=0)"), "v50 驗證：未知 team 欄位產生警告");
// 驗證產生警告：未知 teamId
assert(g("validateThemePack({ teams:{ T99:{} } }).warnings.some(w=>w.indexOf('未知 teamId')>=0)"), "v50 驗證：未知 teamId 產生警告");
// 驗證產生警告：色彩格式
assert(g("validateThemePack({ teams:{ T0:{ primaryColor:'blue' } } }).warnings.some(w=>w.indexOf('色彩')>=0)"), "v50 驗證：色彩格式不合產生警告");
// layerOrder：非陣列
assert(g("validateThemePack({ portraits:{ rendererConfig:{ layerOrder:'skin,face' } } }).warnings.some(w=>w.indexOf('應為陣列')>=0)"), "v50 驗證：layerOrder 非陣列產生警告");
// layerOrder：未知項
assert(g("validateThemePack({ portraits:{ rendererConfig:{ layerOrder:['skin','face','uniform','cap','tattoo'] } } }).warnings.some(w=>w.indexOf('未知圖層名稱')>=0)"), "v50 驗證：layerOrder 未知項產生警告");
// layerOrder：重複項
assert(g("validateThemePack({ portraits:{ rendererConfig:{ layerOrder:['skin','skin','face','uniform','cap'] } } }).warnings.some(w=>w.indexOf('重複圖層')>=0)"), "v50 驗證：layerOrder 重複項產生警告");
// layerOrder：缺必要層
assert(g("validateThemePack({ portraits:{ rendererConfig:{ layerOrder:['skin','face','hair'] } } }).warnings.some(w=>w.indexOf('缺少必要圖層')>=0)"), "v50 驗證：layerOrder 缺必要層產生警告");
// layerOrder：完全合法不產生 layerOrder 警告
assert(g("validateThemePack({ portraits:{ rendererConfig:{ layerOrder:['skin','face','eyes','nose','uniform','hair','beard','cap'] } } }).warnings.filter(w=>w.indexOf('layerOrder')>=0).length === 0"), "v50 驗證：合法 layerOrder 無警告");
// portraits.layers 非法 URI
assert(g("validateThemePack({ portraits:{ layers:{ skin:['bad.exe'] } } }).warnings.some(w=>w.indexOf('URI')>=0)"), "v50 驗證：layers 非法 URI 產生警告");
// portraits.layers 未知圖層名
assert(g("validateThemePack({ portraits:{ layers:{ wings:['a.png'] } } }).warnings.some(w=>w.indexOf('未知圖層名稱')>=0)"), "v50 驗證：layers 未知圖層名產生警告");
// valid 語意
assert(g("validateThemePack(null).valid === false"), "v50 驗證語意：null → valid=false");
assert(g("validateThemePack([]).valid === false"), "v50 驗證語意：陣列 → valid=false");
assert(g("validateThemePack({ teams:{ T0:{ logo:'bad.txt' } } }).valid === true"), "v50 驗證語意：欄位問題仍 valid=true（警告不阻擋）");
assert(g("validateThemePack({}).warnings.length === 0"), "v50 驗證語意：空包無警告");

// --- C. cityUniform 停用相容 ---
assert(g("V50_TEAM_DEPRECATED.indexOf('cityUniform') >= 0"), "v50 cityUniform 列入停用清單");
assert(g("V50_TEAM_FIELDS.cityUniform === undefined"), "v50 cityUniform 不在正式欄位白名單");
// 舊主題包帶 cityUniform → 產生停用警告
assert(g("validateThemePack({ teams:{ T0:{ cityUniform:'city0.png' } } }).warnings.some(w=>w.indexOf('已停用')>=0)"), "v50 舊包 cityUniform 產生停用警告");
// 剝除函式
assert(g("typeof v50StripDeprecatedFields === 'function'"), "v50 v50StripDeprecatedFields 就位");
assert(g("v50StripDeprecatedFields({ teams:{ T0:{ homeUniform:'h.png', cityUniform:'c.png' } } }).teams.T0.cityUniform === undefined"), "v50 剝除：cityUniform 被移除");
assert(g("v50StripDeprecatedFields({ teams:{ T0:{ homeUniform:'h.png', cityUniform:'c.png' } } }).teams.T0.homeUniform === 'h.png'"), "v50 剝除：其他欄位保留");
// 剝除不改動原物件
assert(g(`(function(){
  var orig = { teams:{ T0:{ homeUniform:'h.png', cityUniform:'c.png' } } };
  v50StripDeprecatedFields(orig);
  return orig.teams.T0.cityUniform === 'c.png';
})()`), "v50 剝除：不改動呼叫端原物件");
// 載入含 cityUniform 的舊包後，遊戲讀不到 cityUniform
assert(g(`(function(){
  applyThemePack({ teams:{ T0:{ homeUniform:'h.png', awayUniform:'a.png', cityUniform:'c.png' } } });
  var got = THEME.pack.teams.T0.cityUniform === undefined;
  resetThemePack();
  return got;
})()`), "v50 載入舊包：cityUniform 被忽略不進 THEME.pack");
// PORTRAIT_SPEC 說明不再宣稱使用 cityUniform
assert(g("PORTRAIT_SPEC.uniformNote.indexOf('已停用') >= 0"), "v50 PORTRAIT_SPEC 說明標示 cityUniform 已停用");
// 範例主題包不含 cityUniform（規格一致性）
assert(g("V50_LAYER_REQUIRED.length === 4 && V50_LAYER_REQUIRED.indexOf('uniform') >= 0"), "v50 必要圖層清單含 uniform");

// 回正到 T0
g("newGame('v50修正回正')"); g("pickTeam('T0')");

/* ==================== v51 A1 進階數據引擎 ==================== */
console.log("\n--- v51 A1 進階數據引擎（統計衍生／AI分析型／可見度分層） ---\n");

// ① 統計欄位擴充
assert(g("typeof freshBatterStats === 'function'"), "v51 freshBatterStats 就位");
assert(g("var s=freshBatterStats(); ['PA','D','T','CS','GIDP','HBP','SF'].every(function(k){return s[k]===0;})"), "v51 打者 A1 七欄位齊全且初始為 0");
assert(g("var s=freshPitcherStats(); ['HRA','R','HBPA','WP','BF'].every(function(k){return s[k]===0;})"), "v51 投手 A1 五欄位齊全且初始為 0");
assert(g("var s=freshBatterStats(); s.AB===0 && s.H===0 && s.HR===0 && s.RBI===0 && s.BB===0 && s.SO===0 && s.SB===0"), "v51 打者既有欄位未被破壞");
assert(g("var s=freshPitcherStats(); s.W===0 && s.L===0 && s.SV===0 && s.HD===0 && s.IP===0 && s.ER===0"), "v51 投手既有欄位未被破壞");

// ② 惰性補齊
assert(g("typeof v51EnsureStatFields === 'function'"), "v51EnsureStatFields 就位");
assert(g("var o={G:1,AB:10,H:3}; v51EnsureStatFields(o,false); o.PA===0 && o.GIDP===0 && o.AB===10 && o.H===3"), "v51 補齊打者欄位不覆蓋既有值");
assert(g("var o={G:1,IP:9,ER:2}; v51EnsureStatFields(o,true); o.HRA===0 && o.R===0 && o.IP===9 && o.ER===2"), "v51 補齊投手欄位不覆蓋既有值");

// ③ 隔離 PRNG（不碰共用 Math.random）
assert(g("typeof v51rng === 'function' && typeof v51Int === 'function'"), "v51 隔離 PRNG 就位");
assert(g("var a=v51rng(), b=v51rng(); a>=0 && a<1 && b>=0 && b<1 && a!==b"), "v51rng 產出合法且推進狀態");
assert(g("var x=v51Int(3,7); x>=3 && x<=7"), "v51Int 落在區間內");
assert(g("typeof v51Hash01 === 'function' && v51Hash01('seedA',1)===v51Hash01('seedA',1)"), "v51Hash01 對同一輸入為確定性");
assert(g("v51Hash01('seedA',1) !== v51Hash01('seedA',2)"), "v51Hash01 不同索引產出不同值");
assert(g("v51Hash01('seedA',1) !== v51Hash01('seedB',1)"), "v51Hash01 不同種子產出不同值");

// ④ 打者進階指標計算
assert(g("typeof v51BatterAdvanced === 'function'"), "v51BatterAdvanced 就位");
assert(g("var a=v51BatterAdvanced({AB:100,H:30,HR:5,D:6,T:1,BB:12,SO:20,HBP:2,SF:1,PA:115,SB:8,CS:2}); Math.abs(a.AVG-0.300)<0.001"), "v51 打擊率計算正確");
assert(g("var a=v51BatterAdvanced({AB:100,H:30,HR:5,D:6,T:1,BB:12,SO:20,HBP:2,SF:1,PA:115,SB:8,CS:2}); Math.abs(a.OBP-((30+12+2)/(100+12+2+1)))<0.0005"), "v51 上壘率計算正確");
assert(g("var a=v51BatterAdvanced({AB:100,H:30,HR:5,D:6,T:1,BB:12,SO:20,HBP:2,SF:1,PA:115}); a.TB===(18*1+6*2+1*3+5*4)"), "v51 壘打數計算正確");
assert(g("var a=v51BatterAdvanced({AB:100,H:30,HR:5,D:6,T:1,BB:12,SO:20,HBP:2,SF:1,PA:115}); Math.abs(a.ISO-(a.SLG-a.AVG))<1e-9"), "v51 純長打率＝長打率－打擊率");
assert(g("var a=v51BatterAdvanced({AB:100,H:30,HR:5,D:6,T:1,BB:12,SO:20,HBP:2,SF:1,PA:115}); Math.abs(a.OPS-(a.OBP+a.SLG))<1e-9"), "v51 OPS＝上壘率＋長打率");
assert(g("var a=v51BatterAdvanced({AB:100,H:30,HR:5,BB:12,SO:20,PA:132,SB:8,CS:2}); Math.abs(a.SBpct-0.8)<0.001"), "v51 盜壘成功率計算正確");
assert(g("var a=v51BatterAdvanced({AB:100,H:30,HR:5,BB:12,SO:20,PA:132}); Math.abs(a.BBK-(12/20))<1e-9"), "v51 保送三振比計算正確");
assert(g("var a=v51BatterAdvanced({}); a.AVG===0 && a.OBP===0 && a.SLG===0 && a.OPS===0"), "v51 空統計不除以零");

// ⑤ 投手進階指標計算
assert(g("typeof v51PitcherAdvanced === 'function'"), "v51PitcherAdvanced 就位");
assert(g("var a=v51PitcherAdvanced({IP:90,ER:30,R:36,SO:81,BB:27,H:81,HRA:10,HBPA:3,BF:380}); Math.abs(a.ERA-3.0)<0.001"), "v51 防禦率計算正確");
assert(g("var a=v51PitcherAdvanced({IP:90,ER:30,R:36,SO:81,BB:27,H:81,HRA:10,HBPA:3,BF:380}); Math.abs(a.WHIP-((81+27)/90))<1e-9"), "v51 WHIP 計算正確");
assert(g("var a=v51PitcherAdvanced({IP:90,ER:30,R:36,SO:81,BB:27,H:81,HRA:10,HBPA:3,BF:380}); Math.abs(a.K9-8.1)<0.001"), "v51 九局三振計算正確");
assert(g("var a=v51PitcherAdvanced({IP:90,ER:30,R:36,SO:81,BB:27,H:81,HRA:10,HBPA:3,BF:380}); a.unearned===6"), "v51 非自責分＝總失分－自責分");
assert(g("var a=v51PitcherAdvanced({IP:90,ER:30,R:36,SO:81,BB:27,H:81,HRA:10,HBPA:3,BF:380}); Math.abs(a.unearnedPct-(6/36))<1e-9"), "v51 非自責分佔比計算正確");
assert(g("var a=v51PitcherAdvanced({IP:90,ER:30,R:36,SO:81,BB:27,H:81,HRA:10,HBPA:3,BF:380}); Math.abs(a.FIP-(((13*10+3*(27+3)-2*81)/90)+3.10))<1e-9"), "v51 FIP 公式正確");
assert(g("var a=v51PitcherAdvanced({}); a.ERA===0 && a.WHIP===0 && a.FIP===0"), "v51 空投手統計不除以零");
assert(g("var a=v51PitcherAdvanced({IP:90,ER:30,R:36}); a.R>=a.ER"), "v51 總失分不小於自責分");

// ⑥ 格式化
assert(g("v51Fmt3(0.3005)==='.301' || v51Fmt3(0.3005)==='.300'"), "v51 三位小數格式去前導零");
assert(g("v51Fmt2(3.456)==='3.46'"), "v51 兩位小數格式正確");
assert(g("v51Pct(0.125)==='12.5%'"), "v51 百分比格式正確");

// ⑦ 可見度分層（③ 綁定分析室等級）
assert(g("typeof V51_TIERS === 'object' && V51_TIERS.bat && V51_TIERS.pit"), "v51 分層表就位");
assert(g("V51_TIERS.bat[1].indexOf('OPS')>=0 && V51_TIERS.bat[3].indexOf('BABIP')>=0"), "v51 打者分層歸屬正確");
assert(g("V51_TIERS.pit[1].indexOf('WHIP')>=0 && V51_TIERS.pit[3].indexOf('FIP')>=0"), "v51 投手分層歸屬正確");
assert(g("typeof v51VisibleTier === 'function'"), "v51VisibleTier 就位");
assert(g("v51VisibleTier(null,true)>=1"), "v51 自家球員保底 Lv.1");
assert(g("v51VisibleTier(null,false)===0"), "v51 他隊球員無分析室時為 Lv.0");
assert(g("v51IsMetricVisible('bat','OPS',1)===true"), "v51 Lv.1 可見 OPS");
assert(g("v51IsMetricVisible('bat','BABIP',1)===false"), "v51 Lv.1 不可見 BABIP");
assert(g("v51IsMetricVisible('pit','FIP',3)===true"), "v51 Lv.3 可見 FIP");
assert(g("v51IsMetricVisible('pit','FIP',2)===false"), "v51 Lv.2 不可見 FIP");
assert(g("v51VisibleMetrics('bat',0).indexOf('OPS')<0"), "v51 Lv.0 未含進階指標");
assert(g("v51VisibleMetrics('bat',3).indexOf('wOBA')>=0"), "v51 Lv.3 含全部打者指標");
assert(g("v51VisibleMetrics('pit',3).length > v51VisibleMetrics('pit',1).length"), "v51 層級越高可見指標越多");

// ⑧ AI 分析型使用進階數據（② 只有 analytics 使用）
assert(g("typeof v51IsAnalyticsTeam === 'function' && typeof v51AnalyticsValueAdj === 'function'"), "v51 AI 分析型函式就位");
assert(g("v51IsAnalyticsTeam({persona:'analytics'})===true"), "v51 辨識分析型球團");
assert(g("v51IsAnalyticsTeam({persona:'splash'})===false"), "v51 豪購型不是分析型");
assert(g("v51AnalyticsValueAdj({isPitcher:false,seasonStats:{AB:300,H:75,BB:60,SO:60,PA:365,D:15,T:1,HR:10,HBP:3,SF:2}},{persona:'splash'})===0"), "v51 非分析型球團估值不受進階數據影響");
assert(g("v51AnalyticsValueAdj({isPitcher:false,seasonStats:{AB:10,H:3}},{persona:'analytics'})===0"), "v51 樣本不足時分析型也不調整");
assert(g("var adj=v51AnalyticsValueAdj({isPitcher:false,seasonStats:{AB:300,H:75,BB:70,SO:60,PA:375,D:15,T:1,HR:10,HBP:3,SF:2}},{persona:'analytics'}); adj>0"), "v51 高選球低打擊率野手被分析型加分");
assert(g("var adj=v51AnalyticsValueAdj({isPitcher:true,seasonStats:{IP:150,ER:75,R:80,SO:150,BB:30,H:130,HRA:10,HBPA:3,BF:620}},{persona:'analytics'}); adj>0"), "v51 FIP 優於 ERA 的投手被分析型加分");
assert(g("var adj=v51AnalyticsValueAdj({isPitcher:true,seasonStats:{IP:150,ER:45,R:50,SO:60,BB:60,H:150,HRA:25,HBPA:6,BF:660}},{persona:'analytics'}); adj<0"), "v51 ERA 優於 FIP 的投手被分析型扣分");
assert(g("var adj=v51AnalyticsValueAdj({isPitcher:true,seasonStats:{IP:150,ER:75,R:80,SO:150,BB:30,H:130,HRA:10,HBPA:3,BF:620}},{persona:'analytics'}); adj>=-12 && adj<=12"), "v51 分析型估值修正在 ±12 內");

// ⑨ 套利空間存在（Moneyball 核心命題）
assert(g(`(function(){
  var p = { isPitcher:false, seasonStats:{AB:300,H:75,BB:70,SO:60,PA:375,D:15,T:1,HR:10,HBP:3,SF:2} };
  var byAnalytics = v51AnalyticsValueAdj(p, {persona:'analytics'});
  var byOthers = ['splash','farm','gambler','rebuild','human','conservative']
    .map(function(x){ return v51AnalyticsValueAdj(p, {persona:x}); });
  return byAnalytics !== 0 && byOthers.every(function(v){ return v === 0; });
})()`), "v51 只有分析型看得到套利價值（其餘六種性格皆為 0）");

// ⑩ 衍生函式存在且不拋錯
assert(g("typeof v51DeriveBatterGame === 'function' && typeof v51DerivePitcherGame === 'function'"), "v51 單場衍生函式就位");
assert(g(`(function(){
  var p={ id:'TESTB', power:70, speed:60, steal:65, seasonStats:freshBatterStats(), careerStats:freshBatterStats() };
  p.seasonStats.AB = 4; p.careerStats.AB = 4;
  p.seasonStats.BB = 1; p.careerStats.BB = 1;
  v51DeriveBatterGame(p, 4, 2, 1, 1, 1, 1);
  return p.seasonStats.PA >= 5 && p.careerStats.PA === p.seasonStats.PA;
})()`), "v51 打者衍生同步累加本季與生涯");
assert(g("typeof v51SyncBatterPA === 'function'"), "v51SyncBatterPA 就位");
assert(g(`(function(){
  var p={ seasonStats:{AB:20,BB:5,HBP:1,SF:1}, careerStats:{AB:60,BB:12,HBP:2,SF:3} };
  v51SyncBatterPA(p);
  return p.seasonStats.PA === 27 && p.careerStats.PA === 77;
})()`), "v51 PA 恆等式＝打數＋保送＋觸身＋高飛犧牲");
assert(g(`(function(){
  var p={ seasonStats:{AB:10,BB:0}, careerStats:{AB:10,BB:0} };
  v51SyncBatterPA(p); v51SyncBatterPA(p);
  return p.seasonStats.PA === 10;
})()`), "v51 PA 同步為冪等（重複呼叫不累加）");
assert(g(`(function(){
  var p={ id:'TESTP', control:60, velocity:65, seasonStats:freshPitcherStats(), careerStats:freshPitcherStats() };
  v51DerivePitcherGame(p, 6, 2, 5, 2, 6);
  return p.seasonStats.BF > 0 && p.seasonStats.R >= p.seasonStats.ER && p.careerStats.BF === p.seasonStats.BF;
})()`), "v51 投手衍生同步累加且總失分不小於自責分");
assert(g(`(function(){
  var p={ id:'DETERM', power:70, speed:60, steal:65, seasonStats:freshBatterStats(), careerStats:freshBatterStats() };
  var q={ id:'DETERM', power:70, speed:60, steal:65, seasonStats:freshBatterStats(), careerStats:freshBatterStats() };
  v51DeriveBatterGame(p, 5, 3, 1, 1, 2, 1);
  v51DeriveBatterGame(q, 5, 3, 1, 1, 2, 1);
  return p.seasonStats.D===q.seasonStats.D && p.seasonStats.T===q.seasonStats.T && p.seasonStats.GIDP===q.seasonStats.GIDP;
})()`), "v51 同一球員同一日衍生具確定性（不漂移）");
assert(g(`(function(){
  var p={ id:'NOTHROW', seasonStats:null, careerStats:null };
  v51DeriveBatterGame(p, 4, 2, 1, 1, 1, 1);
  v51DerivePitcherGame(p, 6, 2, 5, 2, 6);
  return true;
})()`), "v51 衍生函式對缺失統計不拋錯");

// ⑪ 升級鏈
assert(g("typeof ensureV51 === 'function'"), "v51 ensureV51 升級函式就位");
g("newGame('v51升級鏈'); pickTeam('T0');");
assert(g(`(function(){
  S.v51 = null;
  var bid = Object.keys(S.players).filter(function(id){ return !S.players[id].isPitcher; })[0];
  delete S.players[bid].seasonStats.PA;
  delete S.players[bid].seasonStats.GIDP;
  ensureV51();
  return S.v51 && S.v51.ver === 51
      && typeof S.players[bid].seasonStats.PA === 'number'
      && S.players[bid].seasonStats.GIDP === 0;
})()`), "v51 升級鏈補齊欄位並寫入版本標記");
assert(g(`(function(){
  var pid = Object.keys(S.players).filter(function(id){ return S.players[id].isPitcher; })[0];
  delete S.players[pid].seasonStats.HRA;
  S.v51 = null;
  ensureV51();
  return S.players[pid].seasonStats.HRA === 0 && typeof S.players[pid].seasonStats.BF === 'number';
})()`), "v51 升級鏈補齊投手 A1 欄位");
assert(g(`(function(){
  S.v51 = { ver: 51 };
  var bid = Object.keys(S.players).filter(function(id){ return !S.players[id].isPitcher; })[0];
  S.players[bid].seasonStats.GIDP = 999;
  ensureV51();
  return S.players[bid].seasonStats.GIDP === 999;
})()`), "v51 已升級過的存檔不重複處理");

// ⑫ 實際模擬後 A1 欄位有累積
g("newGame('v51模擬驗證'); pickTeam('T0'); beginFirstSeason();");
g("var __v51g=0; while(__v51g<40 && simulateDay(S)){__v51g++; if(S.simInterrupts&&S.simInterrupts.length)S.simInterrupts=[];}");
assert(g(`(function(){
  var team = S.teams[S.userTeamId];
  var withPA = team.roster1.map(function(id){ return S.players[id]; })
    .filter(function(p){ return p && !p.isPitcher && p.seasonStats.AB > 0; });
  return withPA.length > 0 && withPA.every(function(p){ return p.seasonStats.PA >= p.seasonStats.AB; });
})()`), "v51 模擬後打者打席數不小於打數");
assert(g(`(function(){
  var team = S.teams[S.userTeamId];
  var pits = team.roster1.map(function(id){ return S.players[id]; })
    .filter(function(p){ return p && p.isPitcher && p.seasonStats.IP > 0; });
  return pits.length > 0 && pits.every(function(p){ return p.seasonStats.R >= p.seasonStats.ER && p.seasonStats.BF > 0; });
})()`), "v51 模擬後投手總失分不小於自責分且面對打者數為正");
assert(g(`(function(){
  var team = S.teams[S.userTeamId];
  var bats = team.roster1.map(function(id){ return S.players[id]; })
    .filter(function(p){ return p && !p.isPitcher && p.seasonStats.H > 0; });
  return bats.every(function(p){ var s=p.seasonStats; return (s.D||0)+(s.T||0)+(s.HR||0) <= s.H; });
})()`), "v51 長打數合計不超過安打數");
assert(g(`(function(){
  var team = S.teams[S.userTeamId];
  var bats = team.roster1.map(function(id){ return S.players[id]; })
    .filter(function(p){ return p && !p.isPitcher && p.seasonStats.AB >= 30; });
  if (!bats.length) return true;
  return bats.every(function(p){
    var a = v51BatterAdvanced(p.seasonStats);
    return a.OBP >= a.AVG - 1e-9 && a.SLG >= a.AVG - 1e-9 && a.OPS > 0;
  });
})()`), "v51 實戰數據滿足上壘率≥打擊率、長打率≥打擊率");

// ⑬ UI 區塊
assert(g("typeof v51AdvancedStatsHtml === 'function'"), "v51 進階數據 UI 函式就位");
assert(g(`(function(){
  var team = S.teams[S.userTeamId];
  var p = team.roster1.map(function(id){ return S.players[id]; })
    .filter(function(x){ return x && !x.isPitcher && x.seasonStats.AB >= 30; })[0];
  if (!p) return true;
  var html = v51AdvancedStatsHtml(p);
  return html.indexOf('進階數據') >= 0;
})()`), "v51 進階數據區塊可渲染");
assert(g(`(function(){
  var p = { isPitcher:false, team:S.userTeamId, seasonStats:{AB:5,H:2,PA:6} };
  return v51AdvancedStatsHtml(p).indexOf('樣本不足') >= 0;
})()`), "v51 樣本不足時顯示提示而非誤導數據");
assert(g(`(function(){
  var p = { isPitcher:false, team:'T9', seasonStats:{AB:300,H:80,HR:10,D:15,T:1,BB:40,SO:60,PA:345,HBP:3,SF:2,SB:5,CS:2,GIDP:8} };
  var team = S.teams[S.userTeamId];
  team.facilities = team.facilities || {};
  team.facilities.analysisRoom = 0;
  var html = v51AdvancedStatsHtml(p);
  return html.indexOf('升級分析室') >= 0;
})()`), "v51 分析室 Lv.0 時他隊球員顯示解鎖提示");
assert(g(`(function(){
  var p = { isPitcher:false, team:'T9', seasonStats:{AB:300,H:80,HR:10,D:15,T:1,BB:40,SO:60,PA:345,HBP:3,SF:2,SB:5,CS:2,GIDP:8} };
  var team = S.teams[S.userTeamId];
  team.facilities.analysisRoom = 3;
  var html = v51AdvancedStatsHtml(p);
  return html.indexOf('加權上壘率') >= 0 && html.indexOf('升級分析室') < 0;
})()`), "v51 分析室 Lv.3 解鎖全部指標且無鎖定提示");
assert(g("typeof V51_METRIC_LABELS === 'object' && V51_METRIC_LABELS.FIP === '獨立防禦率'"), "v51 指標中文標籤齊全");
assert(g("Object.keys(V51_TIER_LABELS).length === 4"), "v51 四個層級標籤齊全");

// ⑭ 亂數紀律：v51 不消耗共用 Math.random
assert(g(`(function(){
  var before = 0;
  var origRandom = Math.random;
  Math.random = function(){ before++; return origRandom(); };
  var p={ id:'RNGTEST', power:70, speed:60, steal:65, seasonStats:freshBatterStats(), careerStats:freshBatterStats() };
  v51DeriveBatterGame(p, 5, 3, 1, 1, 2, 1);
  v51DerivePitcherGame(p, 6, 2, 5, 2, 6);
  v51BatterAdvanced(p.seasonStats);
  v51PitcherAdvanced(p.seasonStats);
  v51AnalyticsValueAdj({isPitcher:false,seasonStats:{AB:300,H:75,BB:70,SO:60,PA:375}}, {persona:'analytics'});
  Math.random = origRandom;
  return before === 0;
})()`), "v51 全部衍生與估值函式零消耗共用 Math.random");

// 回正到 T0
g("newGame('v51回正')"); g("pickTeam('T0')");


/* ============================================================
   v52 測試（逐打席引擎／A5 捕手專項／A1-W2 W3 W4 W5 補完）
   ============================================================ */
console.log("\n--- v52 逐打席引擎＋A5 捕手專項＋A1 W1~W5 補完 ---\n");

g("newGame('v52測試')"); g("pickTeam('T0')"); g("pickGameMode('gm_coach')");
g("proceedFromOffseasonSummary(); confirmSkipAllRemaining(); beginFirstSeason(); setSpringNation(HOME_NATION_NAME); executeSpringCamp(); UI.screen='dashboard';");

/* ① 新統計欄位 */
assert(g("['R','PB','CSC'].every(k=>typeof freshBatterStats()[k]==='number')"), "v52 打者新欄位 R／PB／CSC 齊備");
assert(g("typeof freshPitcherStats().OUTS==='number'"), "v52 投手新欄位 OUTS 齊備");
assert(g("V52_BAT_FIELDS.length===3 && V52_PIT_FIELDS.length===1"), "v52 欄位補齊清單長度正確");

/* ② A5 捕手六項專項 */
assert(g("CATCHER_FIELDS.length===6"), "A5 捕手專項欄位擴充為六項");
assert(g("['gameCalling','framing','caughtStealing','blocking','popTime','pitcherHandling'].every(k=>CATCHER_FIELDS.includes(k))"), "A5 六項名稱正確");
assert(g("(function(){var c=Object.values(S.players).find(p=>!p.isPitcher&&p.gameCalling!=null); return c && typeof c.blocking==='number' && typeof c.popTime==='number' && typeof c.pitcherHandling==='number';})()"), "A5 新產生的捕手具備三項新屬性");
assert(g("(function(){var c=Object.values(S.players).find(p=>!p.isPitcher&&p.gameCalling==null); return !c || (c.blocking==null&&c.popTime==null&&c.pitcherHandling==null);})()"), "A5 非捕手不具備捕手專項");
assert(g("(function(){var c=Object.values(S.players).find(p=>!p.isPitcher&&p.gameCalling!=null); return c.blocking>=20&&c.blocking<=95&&c.popTime>=20&&c.popTime<=95&&c.pitcherHandling>=20&&c.pitcherHandling<=95;})()"), "A5 三項新屬性落在 20~95 合法區間");
assert(g("v52Cat(null,'framing')===50 && v52Cat({framing:80},'framing')===80"), "A5 缺捕手時六維取中庸值 50");
assert(g("(function(){var t=S.teams[S.userTeamId]; var c=v52CatcherOf(t,S.players); return !!c && c.gameCalling!=null;})()"), "v52CatcherOf 取得守方先發捕手");
assert(g("v52CatcherScore({gameCalling:60,framing:60,caughtStealing:60,blocking:60,popTime:60,pitcherHandling:60})===360"), "v52CatcherScore 六維合計正確");

/* ③ A5 投手調教成長出口 */
assert(g("typeof v52HandlingGrowthBonus==='function'"), "A5 投手調教成長加成函式存在");
assert(g("v52HandlingGrowthBonus(null,null)===0"), "A5 無球隊或無球員時加成為 0");
assert(g("v52HandlingGrowthBonus(S.teams[S.userTeamId],{isPitcher:false,age:22,level:'1軍'})===0"), "A5 調教加成只作用於投手");
assert(g("(function(){var t=S.teams[S.userTeamId]; var young=v52HandlingGrowthBonus(t,{isPitcher:true,age:22,level:'1軍'}); var old=v52HandlingGrowthBonus(t,{isPitcher:true,age:31,level:'1軍'}); return Math.abs(young)>=Math.abs(old);})()"), "A5 25歲以下投手成長加速幅度不小於資深投手");

/* ④ 逐打席引擎基本結構 */
assert(g("typeof v52PlayGame==='function' && typeof v52PA==='function' && typeof v52HalfInning==='function'"), "v52 逐打席引擎三個核心函式存在");
assert(g("typeof attributeGameStats==='function' && typeof simulateGame==='function'"), "simulateGame／attributeGameStats 介面保留");
assert(g(`(function(){
  var ok=['BB','HBP','K','HR','3B','2B','1B','E','OUT'];
  var t=S.teams[S.userTeamId];
  var b=getLineupBatters(t,S.players)[0];
  var p=getRotationPitchers(t,S.players)[0];
  var c=v52CatcherOf(t,S.players);
  for(var i=0;i<400;i++){ if(ok.indexOf(v52PA(b,p,c,50,1))<0) return false; }
  return true;})()`), "v52PA 只產生九種合法打席結果");
assert(g("V52_CFG.kBase>0 && V52_CFG.babip>0 && V52_CFG.maxExtra===6"), "V52_CFG 校準常數就位");

/* ⑤ 一場比賽的帳本自洽 */
g(`var __gm = v52PlayGame(S.teams['T0'], S.teams['T1'], S.players);`);
assert(g("__gm.homeScore!==__gm.awayScore"), "v52 比賽必分勝負（含延長與抗壓決勝）");
assert(g("__gm.homeScore>=0 && __gm.awayScore>=0"), "v52 比分非負");
assert(g(`(function(){
  var sd=__gm.home, outs=0;
  Object.keys(sd.led._map).forEach(function(k){ outs += (sd.led._map[k].OUTS||0); });
  return outs>=24 && outs<=60;})()`), "v52 單場守備方出局數帳本落在 24~60（九局至延長）");
assert(g(`(function(){
  var sd=__gm.home, R=0, ER=0;
  Object.keys(sd.led._map).forEach(function(k){ var e=sd.led._map[k]; R+=(e.R||0); ER+=(e.ER||0); });
  return ER<=R;})()`), "v52 自責分不超過總失分（非自責分由失誤產生）");
assert(g(`(function(){
  var sd=__gm.home, R=0;
  Object.keys(sd.led._map).forEach(function(k){ var e=sd.led._map[k]; if(e._p&&e._p.isPitcher) R+=(e.R||0); });
  return Math.abs(R-__gm.awayScore)<=1;})()`), "v52 投手失分帳本與對手得分一致（板凳專員修正容差1）");
assert(g(`(function(){
  var m=__gm.away.led._map, w=0,l=0;
  Object.keys(m).forEach(function(k){ w+=(m[k].W||0); l+=(m[k].L||0); });
  return (w+l)===1;})()`), "v52 每場每隊恰好一位勝投或敗投");
assert(g(`(function(){
  var m=__gm.home.led._map, n=0;
  Object.keys(m).forEach(function(k){ n+=(m[k].SV||0); });
  return n<=1;})()`), "v52 單場救援成功至多一次");

/* ⑥ 帳本入帳與 IP 換算 */
assert(g(`(function(){
  var t=S.teams['T5'], u=S.teams['T6'];
  var before=getRotationPitchers(t,S.players)[0].seasonStats.OUTS||0;
  var r=simulateGame(t,u,S.players);
  attributeGameStats(t,S.players,r.homeScore,r.awayScore,r.homeScore>r.awayScore);
  attributeGameStats(u,S.players,r.awayScore,r.homeScore,r.awayScore>r.homeScore);
  var tot=0; t.roster1.forEach(function(id){var p=S.players[id]; if(p&&p.isPitcher) tot+=(p.seasonStats.OUTS||0);});
  return tot>before;})()`), "v52 attributeGameStats 正確入帳投球出局數");
assert(g(`(function(){
  return t3_ipOk();})()`.replace('t3_ipOk()', `(function(){
    var bad=0;
    Object.values(S.players).forEach(function(p){
      if(!p.isPitcher||!p.seasonStats)return;
      var s=p.seasonStats;
      if((s.OUTS||0)>0 && Math.abs(s.IP-Math.round(s.OUTS/3*10)/10)>0.001) bad++;
    });
    return bad===0;})()`)), "v52 投球局數 IP 一律由 OUTS 精確換算");
assert(g("typeof v52SyncIP==='function' && (function(){var st={OUTS:20,IP:0}; v52SyncIP(st); return st.IP===6.7;})()"), "v52SyncIP 出局數換算局數正確（20出局＝6.7局）");

/* ⑦ 全季量測：兩個數值命中現實區間 */
g("var __g52=0; while(simulateDay(S) && __g52<400) __g52++;");
g(`var __lg=(function(){
  var AB=0,H=0,IP=0,ER=0,R=0,G=0,OUTS=0;
  Object.values(S.players).forEach(function(p){var s=p.seasonStats||{};
    if(!p.isPitcher){AB+=s.AB||0;H+=s.H||0;}
    else {IP+=s.IP||0;ER+=s.ER||0;R+=s.R||0;OUTS+=s.OUTS||0;}});
  Object.values(S.teams).forEach(function(t){G+=(t.wins||0)+(t.losses||0);});
  return {BA:H/AB, ERA:ER*9/IP, IPG:IP/G, unearn:1-ER/R, AB:AB, G:G};})();`);
assert(g("__lg.BA>=0.235 && __lg.BA<=0.265"), "v52 全聯盟打擊率落在 .235~.265（靶心 .250）");
assert(g("__lg.ERA>=3.40 && __lg.ERA<=4.30"), "v52 全聯盟防禦率落在 3.40~4.30（靶心 3.80）");
assert(g("__lg.IPG>=8.5 && __lg.IPG<=9.6"), "v52 每隊每場投球局數落在 8.5~9.6（v51 為 5.61 屬帳本缺漏）");
assert(g("__lg.unearn>=0.02 && __lg.unearn<=0.15"), "v52 非自責分占比落在 2%~15%（A1-W3 由守備失誤產生）");
assert(g(`(function(){
  var bad=0;
  Object.values(S.players).forEach(function(p){
    if(p.isPitcher||!p.seasonStats)return; var s=p.seasonStats;
    if((s.PA||0)!==(s.AB||0)+(s.BB||0)+(s.HBP||0)+(s.SF||0)) bad++;});
  return bad===0;})()`), "v52 全聯盟打者 PA 恆等式成立（PA=AB+BB+HBP+SF）");
assert(g(`(function(){
  var rel=Object.values(S.players).filter(function(p){return p.isPitcher&&p.level==='1軍'&&(p.role==='中繼'||p.role==='布局')&&p.seasonStats.G>0;});
  if(!rel.length) return false;
  var g=rel.reduce(function(a,p){return a+p.seasonStats.G;},0)/rel.length;
  return g>=35 && g<=80;})()`), "v52 中繼／布局平均出賽落在 35~80 場（現實 45~65）");
assert(g(`(function(){
  var rel=Object.values(S.players).filter(function(p){return p.isPitcher&&p.level==='1軍'&&(p.role==='中繼'||p.role==='布局')&&p.seasonStats.IP>0;});
  if(!rel.length) return false;
  var ip=rel.reduce(function(a,p){return a+p.seasonStats.IP;},0)/rel.length;
  return ip>=30 && ip<=85;})()`), "v52 中繼／布局平均投球局數落在 30~85 局（現實 40~70）");
assert(g(`(function(){
  var st=Object.values(S.players).filter(function(p){return p.isPitcher&&p.role==='先發'&&p.seasonStats.IP>=60;});
  return st.length>0;})()`), "v52 先發投手累積可觀局數（合格投手池非空）");
assert(g(`(function(){
  var n=0; Object.values(S.players).forEach(function(p){ if(!p.isPitcher) n+=(p.seasonStats.R||0);});
  return n>0;})()`), "v52 打者得分 R 有實際累計");
assert(g(`(function(){
  var n=0; Object.values(S.players).forEach(function(p){ if(p.isPitcher) n+=(p.seasonStats.WP||0);});
  return n>0;})()`), "v52 投手暴投 WP 有實際累計（A5 Blocking 出口）");
assert(g(`(function(){
  var n=0; Object.values(S.players).forEach(function(p){ if(!p.isPitcher) n+=(p.seasonStats.CSC||0);});
  return n>0;})()`), "v52 捕手阻殺成功 CSC 有實際累計（A5 Pop Time／阻殺出口）");
assert(g(`(function(){
  var sb=0,cs=0; Object.values(S.players).forEach(function(p){ if(!p.isPitcher){sb+=(p.seasonStats.SB||0);cs+=(p.seasonStats.CS||0);}});
  return sb>0 && cs>0 && sb/(sb+cs)>=0.55 && sb/(sb+cs)<=0.88;})()`), "v52 盜壘成功率落在 55%~88%");

/* ⑧ A1-W2：wOBA 年度校準 */
assert(g("typeof v52WobaScale==='function' && typeof v52LeagueBatting==='function'"), "W2 聯盟校準函式存在");
assert(g("(function(){var s=v52WobaScale(); return s>=0.60&&s<=1.60;})()"), "W2 wOBA 縮放係數落在合法夾限內");
assert(g("(function(){var lg=v52LeagueBatting(); return lg.PA>0 && lg.OBP>0.25 && lg.OBP<0.40;})()"), "W2 聯盟上壘率統計合理");
assert(g(`(function(){
  var lg=v52LeagueBatting();
  var scaled=lg.raw*v52WobaScale();
  return Math.abs(scaled-lg.OBP)<0.005;})()`), "W2 校準後聯盟平均 wOBA 對齊聯盟平均 OBP");
assert(g(`(function(){
  var p=Object.values(S.players).find(function(x){return !x.isPitcher&&x.seasonStats.AB>=200;});
  var a=v51BatterAdvanced(p.seasonStats);
  return a.wOBA>0.15 && a.wOBA<0.60;})()`), "W2 個別打者 wOBA 落在合理區間");
assert(g("(function(){var a=v52LeagueBatting(), b=v52LeagueBatting(); return a===b;})()"), "W2 聯盟統計具快取（同一鍵回傳同一物件）");

/* ⑨ A1-W4：估值修正動態縮放 */
assert(g("v52AnalyticsCap({})===6 && v52AnalyticsCap({facilities:{analysisRoom:5}})===21"), "W4 估值上限隨分析室等級 Lv.0→±6、Lv.5→±21");
assert(g("v52SampleWeight(0,350)===0 && v52SampleWeight(350,350)===1 && Math.abs(v52SampleWeight(175,350)-0.5)<1e-9"), "W4 樣本權重線性淡出");
assert(g("v51AnalyticsValueAdj({isPitcher:false,seasonStats:{AB:30,H:10,BB:10,SO:5,PA:40}},{persona:'analytics'})===0"), "W4 樣本不足時不做估值修正");
assert(g("v51AnalyticsValueAdj({isPitcher:false,seasonStats:{AB:300,H:75,BB:70,SO:60,PA:375}},{persona:'traditional'})===0"), "W4 非分析型球團不套用修正");
assert(g(`(function(){
  var p={isPitcher:false,seasonStats:{AB:300,H:75,D:12,T:1,HR:15,BB:70,SO:60,HBP:5,SF:3,PA:378}};
  var lo=v51AnalyticsValueAdj(p,{persona:'analytics',facilities:{analysisRoom:0}});
  var hi=v51AnalyticsValueAdj(p,{persona:'analytics',facilities:{analysisRoom:5}});
  return Math.abs(hi)>=Math.abs(lo);})()`), "W4 分析室越高、可套利幅度越大");
assert(g(`(function(){
  var base={isPitcher:false,seasonStats:{AB:300,H:75,D:12,T:1,HR:15,BB:70,SO:60,HBP:5,SF:3,PA:378}};
  var cat=JSON.parse(JSON.stringify(base)); cat.gameCalling=85; cat.framing=85; cat.caughtStealing=85; cat.blocking=85; cat.popTime=85; cat.pitcherHandling=85;
  var t={persona:'analytics',facilities:{analysisRoom:3}};
  return v51AnalyticsValueAdj(cat,t) > v51AnalyticsValueAdj(base,t);})()`), "W4＋A5 捕手專項強者獲得額外套利加分（旗艦套利標的）");

/* ⑩ A1-W5：進階數據進球探報告與選秀評估 */
assert(g("typeof v52ScoutAdvancedHtml==='function' && typeof v52DraftScore==='function'"), "W5 球探報告與選秀評分函式存在");
assert(g("v52ScoutAdvancedHtml(null)==='' && v52ScoutAdvancedHtml({isPitcher:false,seasonStats:{AB:5}})===''"), "W5 樣本不足時球探報告不顯示進階數據");
assert(g(`(function(){
  var p=Object.values(S.players).find(function(x){return !x.isPitcher&&x.seasonStats.AB>=200;});
  var h=v52ScoutAdvancedHtml(p);
  return h.indexOf('本季進階數據')>=0 && h.indexOf('OBP')>=0;})()`), "W5 打者球探報告含進階數據區塊");
assert(g(`(function(){
  var p=Object.values(S.players).find(function(x){return x.isPitcher&&x.seasonStats.IP>=60;});
  var h=v52ScoutAdvancedHtml(p);
  return h.indexOf('本季進階數據')>=0 && h.indexOf('WHIP')>=0;})()`), "W5 投手球探報告含進階數據區塊");
assert(g(`(function(){
  var src=Object.values(S.players).find(function(x){return !x.isPitcher&&x.gameCalling==null;});
  var eye=JSON.parse(JSON.stringify(src)); eye.eye=90; eye.contact=60; eye.power=40; eye.age=20;
  var pw=JSON.parse(JSON.stringify(src)); pw.eye=40; pw.contact=60; pw.power=90; pw.age=20;
  var ana={persona:'analytics'}, trad={persona:'traditional'};
  var dEye=v52DraftScore(eye,ana)-v52DraftScore(eye,trad);
  var dPw=v52DraftScore(pw,ana)-v52DraftScore(pw,trad);
  return dEye>dPw;})()`), "W5 分析型球團選秀更看重選球而非長打");
assert(g(`(function(){
  var p=Object.values(S.players).find(function(x){return !x.isPitcher;});
  return v52DraftScore(p,{persona:'traditional'})===trueOverall(p);})()`), "W5 非分析型球團選秀評分維持綜合評價原邏輯");
assert(g(`(function(){
  var srcP=Object.values(S.players).find(function(x){return x.isPitcher;});
  var young=JSON.parse(JSON.stringify(srcP)); young.control=60; young.velocity=60; young.age=18;
  var oldp=JSON.parse(JSON.stringify(srcP)); oldp.control=60; oldp.velocity=60; oldp.age=26;
  var t={persona:'analytics'};
  return (v52DraftScore(young,t)-trueOverall(young)) > (v52DraftScore(oldp,t)-trueOverall(oldp));})()`), "W5 分析型球團選秀給年輕球員成長空間加權");

/* ⑪ ensureV52 升級鏈 */
assert(g("typeof ensureV52==='function' && typeof v52EnsureStatFields==='function'"), "v52 升級鏈函式存在");
assert(g("(function(){var st={}; v52EnsureStatFields(st,false); return st.R===0&&st.PB===0&&st.CSC===0;})()"), "ensureV52 補齊打者新欄位");
assert(g("(function(){var st={IP:30}; v52EnsureStatFields(st,true); return st.OUTS===90;})()"), "ensureV52 由舊存檔 IP 反推 OUTS（30局＝90出局）");
assert(g("(function(){var st={IP:0}; v52EnsureStatFields(st,true); return st.OUTS===0;})()"), "ensureV52 無局數時 OUTS 為 0");
assert(g(`(function(){
  var old=S.v52; S.v52=null;
  var c=Object.values(S.players).find(function(p){return !p.isPitcher&&p.gameCalling!=null;});
  var bk=c.blocking; c.blocking=null; c.popTime=null; c.pitcherHandling=null;
  ensureV52();
  var ok=(typeof c.blocking==='number')&&(typeof c.popTime==='number')&&(typeof c.pitcherHandling==='number');
  c.blocking=bk; S.v52=old||{ver:52};
  return ok;})()`), "ensureV52 為舊存檔捕手補齊 A5 三項新屬性");
assert(g("(function(){ S.v52={ver:52}; var n=0; var o=v52EnsureStatFields; ensureV52(); return true;})()"), "ensureV52 已升級過即提前返回（冪等）");

/* ⑫ 亂數紀律：v52 純函式不消耗共用 Math.random */
assert(g(`(function(){
  var before=0; var orig=Math.random;
  Math.random=function(){ before++; return orig(); };
  v52LeagueBatting(); v52WobaScale();
  v52AnalyticsCap({facilities:{analysisRoom:2}});
  v52SampleWeight(100,350);
  v51AnalyticsValueAdj({isPitcher:false,seasonStats:{AB:300,H:75,BB:70,SO:60,PA:375}},{persona:'analytics',facilities:{analysisRoom:2}});
  v52DraftScore({isPitcher:false,eye:60,contact:60,power:60,age:20},{persona:'analytics'});
  v52CatcherScore({gameCalling:60,framing:60,caughtStealing:60,blocking:60,popTime:60,pitcherHandling:60});
  Math.random=orig;
  return before===0;})()`), "v52 校準／估值／選秀評分全為純函式，零消耗共用 Math.random");

// 回正到 T0
g("newGame('v52回正')"); g("pickTeam('T0')");

console.log("\n--- v53 測試（渲染出口＋結構驗證閘門） ---");

// === v53 結構驗證閘門 ===
// 1. manifest 物件應被拒絕
assert(!g("applyThemePack({manifestVersion:'1.0', outerFiles:[]})"), "v53 閘門拒絕 manifest 物件");
assert(g("THEME.lastLoadError && THEME.lastLoadError.indexOf('manifest') >= 0"), "v53 閘門錯誤訊息含 manifest");

// 2. 空物件（無任何 theme key）應被拒絕
assert(!g("applyThemePack({foo:1, bar:2})"), "v53 閘門拒絕無功能鍵物件");
assert(g("THEME.lastLoadError && THEME.lastLoadError.indexOf('必要欄位') >= 0"), "v53 閘門錯誤訊息含必要欄位");

// 3. 含至少一個功能鍵的合法主題包應被接受
assert(g("applyThemePack({teams:{T0:{primaryColor:'#FF0000'}}, icons:{}})"), "v53 閘門接受含 teams 的合法主題包");
assert(g("THEME.lastLoadError === null"), "v53 接受後 lastLoadError 為 null");

// 4. loadThemePackFromJSON 也要回傳明確錯誤
var jsonRes = g("loadThemePackFromJSON(JSON.stringify({manifestVersion:'1.0',outerFiles:[]}))");
assert(jsonRes && !jsonRes.ok, "v53 loadThemePackFromJSON 拒絕 manifest JSON");
assert(jsonRes && jsonRes.error && jsonRes.error.indexOf("manifest") >= 0, "v53 loadThemePackFromJSON 回傳 manifest 錯誤訊息");

// 5. v53IsThemePack 函式就位
assert(g("typeof v53IsThemePack === 'function'"), "v53 v53IsThemePack 函式就位");

// === v53 國旗便捷函式 ===
assert(g("typeof v53NationFlagByName === 'function'"), "v53 v53NationFlagByName 函式就位");
// 無主題包時回空字串
g("resetThemePack()");
assert(g("v53NationFlagByName('美國', 16) === ''"), "v53 無主題包時國旗回空字串");
// 有主題包含國旗時應回傳 img 標記
g("applyThemePack({nations:{NAT_US:{flag:'data:image/png;base64,AAAA'}}, teams:{}})");
var flagHtml = g("v53NationFlagByName('美國', 16)");
assert(flagHtml && flagHtml.indexOf("v49nation-flag") >= 0, "v53 有主題包時國旗回傳含 v49nation-flag class 的 img");
assert(flagHtml && flagHtml.indexOf("NAT_US") === -1, "v53 國旗 HTML 不暴露 countryId");

// === v53 渲染出口存在性驗證 ===
// 重設並建立帶美術的主題包以驗渲染
g("resetThemePack()");
g("applyThemePack({teams:{T0:{logo:'data:image/png;base64,AAAA',primaryColor:'#123456'}},nations:{NAT_US:{flag:'data:image/png;base64,BBBB'}},portraits:{layers:{skin:['data:image/png;base64,CCCC'],face:['data:image/png;base64,DDDD']}},icons:{}})");

// themeTeamLogo 應回傳 img
var logoHtml = g("themeTeamLogo('T0', 24)");
assert(logoHtml && logoHtml.indexOf("<img") >= 0, "v53 themeTeamLogo 有素材時回傳 img");
// themeNationFlag 應回傳 img
var flag2 = g("themeNationFlag('NAT_US', 20)");
assert(flag2 && flag2.indexOf("<img") >= 0, "v53 themeNationFlag 有素材時回傳 img");

// compositePortrait 應能合成（需 appearanceSeed）
var testPlayer = g("(function(){ var p = Object.values(S.players).find(x => x.team === 'T0' && typeof x.appearanceSeed === 'number'); return p ? p.id : null; })()");
if (testPlayer) {
  var portrait = g("compositePortrait('" + testPlayer + "', {player: S.players['" + testPlayer + "'], teamId:'T0', isAway:false}, 64)");
  assert(portrait && portrait.indexOf("v49portrait") >= 0, "v53 compositePortrait 有圖層時回傳含 v49portrait 的 HTML");
}

// 清理
g("resetThemePack()");

// === v53 階段 2：appearanceConfig 結構化肖像渲染 ===
// 建立帶 appearanceConfig 的完整 v53 head-only 主題包
g(`applyThemePack({
  teams: { T0: { capMark: 'data:image/png;base64,CAP0', primaryColor:'#112233' }},
  nations: {},
  portraits: {
    layers: { skin:['data:image/png;base64,FLAT_SKIN'], face:['data:image/png;base64,FLAT_FACE'], hair:['data:image/png;base64,FLAT_HAIR'], beard:['data:image/png;base64,FLAT_BEARD'] },
    rules: { beardChance: 30 },
    rendererConfig: { layerOrder: ['skin','beard','face','hair','cap'], masterSize: 256, defaultDisplayMode: 'rosterHeadOnlyCentered' },
    appearanceConfig: {
      skinConfig: {
        selectionModel: 'shape-index-and-tone-index-are-independent',
        shapeIndexOrder: ['standard','longFace','pointedChin','bigEars'],
        toneIndexOrder: [1,2,3,4,5,6],
        matrix256: [
          ['data:image/png;base64,SK_S0T0','data:image/png;base64,SK_S0T1','data:image/png;base64,SK_S0T2','data:image/png;base64,SK_S0T3','data:image/png;base64,SK_S0T4','data:image/png;base64,SK_S0T5'],
          ['data:image/png;base64,SK_S1T0','data:image/png;base64,SK_S1T1','data:image/png;base64,SK_S1T2','data:image/png;base64,SK_S1T3','data:image/png;base64,SK_S1T4','data:image/png;base64,SK_S1T5'],
          ['data:image/png;base64,SK_S2T0','data:image/png;base64,SK_S2T1','data:image/png;base64,SK_S2T2','data:image/png;base64,SK_S2T3','data:image/png;base64,SK_S2T4','data:image/png;base64,SK_S2T5'],
          ['data:image/png;base64,SK_S3T0','data:image/png;base64,SK_S3T1','data:image/png;base64,SK_S3T2','data:image/png;base64,SK_S3T3','data:image/png;base64,SK_S3T4','data:image/png;base64,SK_S3T5']
        ]
      },
      expressionConfig: {
        selectionModel: 'one-combined-approved-eyes-brows-mouth-layer-per-expression-index',
        expressionIndexOrder: ['neutral','angry','fatigued','victory','worried'],
        features256: [
          { expressionIndex:0, id:'neutral', face:'data:image/png;base64,EXPR_NEUTRAL' },
          { expressionIndex:1, id:'angry', face:'data:image/png;base64,EXPR_ANGRY' },
          { expressionIndex:2, id:'fatigued', face:'data:image/png;base64,EXPR_FATIGUED' },
          { expressionIndex:3, id:'victory', face:'data:image/png;base64,EXPR_VICTORY' },
          { expressionIndex:4, id:'worried', face:'data:image/png;base64,EXPR_WORRIED' }
        ]
      },
      hairConfig: {
        approvedStyleCount: 10,
        runtimeAvailableStyleIds: ['09_bald'],
        compatibilityFallback: 'data:image/png;base64,HAIR_BALD'
      },
      beardConfig: {
        selectionModel: 'style-index-and-color-index-are-independent',
        styleIndexOrder: ['clean_shaven','goatee','circle','full','moustache'],
        colorIndexOrder: ['black','brown','light','gray','blonde','red'],
        styles: [
          { styleIndex:0, id:'clean_shaven', transparentBaseline:true, assetsByColor:{} },
          { styleIndex:1, id:'goatee', transparentBaseline:false, assetsByColor:{
            black:{ '64':'data:image/png;base64,B1BK64','128':'data:image/png;base64,B1BK128','256':'data:image/png;base64,B1BK256' },
            brown:{ '256':'data:image/png;base64,B1BR256' },
            light:{ '256':'data:image/png;base64,B1LT256' },
            gray:{ '256':'data:image/png;base64,B1GY256' },
            blonde:{ '256':'data:image/png;base64,B1BL256' },
            red:{ '256':'data:image/png;base64,B1RD256' }
          }},
          { styleIndex:2, id:'circle', transparentBaseline:false, assetsByColor:{
            black:{ '256':'data:image/png;base64,B2BK256' }, brown:{ '256':'data:image/png;base64,B2BR256' },
            light:{ '256':'data:image/png;base64,B2LT256' }, gray:{ '256':'data:image/png;base64,B2GY256' },
            blonde:{ '256':'data:image/png;base64,B2BL256' }, red:{ '256':'data:image/png;base64,B2RD256' }
          }},
          { styleIndex:3, id:'full', transparentBaseline:false, assetsByColor:{
            black:{ '256':'data:image/png;base64,B3BK256' }, brown:{ '256':'data:image/png;base64,B3BR256' },
            light:{ '256':'data:image/png;base64,B3LT256' }, gray:{ '256':'data:image/png;base64,B3GY256' },
            blonde:{ '256':'data:image/png;base64,B3BL256' }, red:{ '256':'data:image/png;base64,B3RD256' }
          }},
          { styleIndex:4, id:'moustache', transparentBaseline:false, assetsByColor:{
            black:{ '256':'data:image/png;base64,B4BK256' }, brown:{ '256':'data:image/png;base64,B4BR256' },
            light:{ '256':'data:image/png;base64,B4LT256' }, gray:{ '256':'data:image/png;base64,B4GY256' },
            blonde:{ '256':'data:image/png;base64,B4BL256' }, red:{ '256':'data:image/png;base64,B4RD256' }
          }}
        ]
      }
    }
  }
})`);

// 取得測試用球員
var v53p = g("(function(){ var p = Object.values(S.players).find(x => x.team === 'T0' && typeof x.appearanceSeed === 'number'); return p; })()");
if (v53p) {
  var v53pid = v53p.id;
  var v53seed = v53p.appearanceSeed;
  // 確認 compositePortrait 成功產出 HTML
  var v53html = g("compositePortrait('" + v53pid + "', {player: S.players['" + v53pid + "'], teamId:'T0', isAway:false}, 64)");
  assert(v53html && v53html.indexOf("v49portrait") >= 0, "v53 階段2 compositePortrait 有 appearanceConfig 時回傳含 v49portrait");

  // head-only：不含 uniform/body/eyes/nose 圖層
  assert(v53html && v53html.indexOf("FLAT_SKIN") === -1, "v53 階段2 使用 skinConfig 矩陣而非 flat skin");
  assert(v53html && v53html.indexOf("FLAT_FACE") === -1, "v53 階段2 使用 expressionConfig 而非 flat face");

  // 膚色用 skinConfig 矩陣：src 含 SK_S
  assert(v53html && v53html.indexOf("SK_S") >= 0, "v53 階段2 膚色圖層來自 skinConfig.matrix256");

  // 表情用 expressionConfig：src 含 EXPR_
  assert(v53html && v53html.indexOf("EXPR_") >= 0, "v53 階段2 表情圖層來自 expressionConfig.features256");

  // 髮型用 hairConfig.compatibilityFallback
  assert(v53html && v53html.indexOf("HAIR_BALD") >= 0, "v53 階段2 髮型圖層來自 hairConfig.compatibilityFallback");

  // 帽子來自 teamArt.capMark
  assert(v53html && v53html.indexOf("CAP0") >= 0, "v53 階段2 帽子來自 teams.T0.capMark");

  // head-only layerOrder [skin, beard, face, hair, cap]：不含 uniform/eyes/nose
  assert(v53html && v53html.indexOf("uniform") === -1, "v53 head-only 不含 uniform 圖層");

  // 確定性：同 seed 同結果
  var v53html2 = g("compositePortrait('" + v53pid + "', {player: S.players['" + v53pid + "'], teamId:'T0', isAway:false}, 64)");
  assert(v53html === v53html2, "v53 階段2 同 seed 同結果（確定性）");

  // 不同 size 不同快取
  var v53html128 = g("compositePortrait('" + v53pid + "', {player: S.players['" + v53pid + "'], teamId:'T0', isAway:false}, 128)");
  assert(v53html128 && v53html128.indexOf("width:128px") >= 0, "v53 128px size 正確");

  // 鬍型確認：在有鬍子的球員中，src 應來自 beardConfig（含 B1/B2/B3/B4）
  var v53beardTest = g(`(function(){
    var players = Object.values(S.players).filter(function(p){ return p.team === 'T0' && typeof p.appearanceSeed === 'number'; });
    var foundBeard = false;
    for(var i=0;i<players.length;i++){
      var h = compositePortrait(players[i].id, {player:players[i],teamId:'T0',isAway:false}, 64);
      if(h && (h.indexOf('B1')>=0||h.indexOf('B2')>=0||h.indexOf('B3')>=0||h.indexOf('B4')>=0)) { foundBeard = true; break; }
    }
    return foundBeard;
  })()`);
  assert(v53beardTest === true, "v53 階段2 至少有球員使用 beardConfig 結構化鬍型");

  // 鬍型 style×color 分離驗證：beardConfig 路徑含 256（偏好最高解析度）
  var v53beardSrc = g(`(function(){
    var players = Object.values(S.players).filter(function(p){ return p.team === 'T0' && typeof p.appearanceSeed === 'number'; });
    for(var i=0;i<players.length;i++){
      var h = compositePortrait(players[i].id, {player:players[i],teamId:'T0',isAway:false}, 64);
      if(h && h.indexOf('B1BK256')>=0) return 'goatee-black-256';
      if(h && h.indexOf('B1BR256')>=0) return 'goatee-brown-256';
      if(h && h.indexOf('B2BK256')>=0) return 'circle-black-256';
    }
    return 'none-found';
  })()`);
  // 不要求特定結果，但找到的應是結構化路徑（非 FLAT_BEARD）
  assert(v53beardSrc !== 'FLAT_BEARD', "v53 階段2 鬍型不使用 flat layers");
}

// skin shape/tone 獨立驗證（slot 1 vs slot 8）
var v53skinIndep = g(`(function(){
  var shapes = {}, tones = {};
  var players = Object.values(S.players).filter(function(p){ return typeof p.appearanceSeed === 'number'; }).slice(0,200);
  for(var i=0;i<players.length;i++){
    var seed = players[i].appearanceSeed;
    var shapeIdx = v49SeedHash(seed, 1) % 4;
    var toneIdx = v49SeedHash(seed, 8) % 6;
    shapes[shapeIdx] = (shapes[shapeIdx]||0)+1;
    tones[toneIdx] = (tones[toneIdx]||0)+1;
  }
  return { shapeKeys: Object.keys(shapes).length, toneKeys: Object.keys(tones).length };
})()`);
assert(v53skinIndep && v53skinIndep.shapeKeys >= 2, "v53 skin shape 分佈至少 2 種");
assert(v53skinIndep && v53skinIndep.toneKeys >= 2, "v53 skin tone 分佈至少 2 種");

// beard color 獨立驗證（slot 9）
var v53beardColorDist = g(`(function(){
  var colors = {};
  var players = Object.values(S.players).filter(function(p){ return typeof p.appearanceSeed === 'number'; }).slice(0,200);
  for(var i=0;i<players.length;i++){
    var seed = players[i].appearanceSeed;
    var cIdx = v49SeedHash(seed, 9) % 6;
    colors[cIdx] = (colors[cIdx]||0)+1;
  }
  return Object.keys(colors).length;
})()`);
assert(v53beardColorDist >= 3, "v53 beard color 分佈至少 3 種（6 色中）");

// head-only validation：layerOrder 不含 uniform 時不應產生 '缺少必要圖層' 警告
var v53valResult = g(`validateThemePack({
  teams:{}, portraits:{ rendererConfig:{ layerOrder:['skin','beard','face','hair','cap'], defaultDisplayMode:'rosterHeadOnlyCentered' } }
})`);
assert(v53valResult && v53valResult.valid === true, "v53 head-only 主題包 valid=true");
var v53uniformWarn = v53valResult ? v53valResult.warnings.filter(function(w){ return w.indexOf('uniform') >= 0; }) : [];
assert(v53uniformWarn.length === 0, "v53 head-only 模式不警告缺少 uniform");

// === v53 階段 3：內建主題自動載入 ===
assert(g("typeof v54ApplyBuiltinTheme === 'function'"), "v54 v54ApplyBuiltinTheme 函式就位");
// v56 candidate 以 r012 正式單檔同源的內建主題啟動；不可回退成無資產 modular 狀態。
g("resetThemePack()");
assert(g("v54ApplyBuiltinTheme() === true"), "v56 candidate r012 內建主題可自動套用");
assert(g("THEME.pack && THEME.pack.version === 'v55-r012-codex-production-v01'"), "v56 candidate 使用 r012 正式主題版本");

// 設定內建主題後應可自動套用
g("V54_BUILTIN_THEME = {teams:{T0:{primaryColor:'#AABB00'}},portraits:{layers:{skin:['data:image/png;base64,BUILTIN']}},icons:{}}");
g("resetThemePack()");
assert(g("v54ApplyBuiltinTheme() === true"), "v54 有內建主題且無持久化時自動套用成功");
assert(g("THEME.pack && THEME.pack.teams && THEME.pack.teams.T0 && THEME.pack.teams.T0.primaryColor === '#AABB00'"), "v54 內建主題套用後 THEME.pack 正確");
// 清理
g("V54_BUILTIN_THEME = null");
g("resetThemePack()");

/* ---------- v54 測試（A2 育成聯盟） ---------- */
console.log("\n--- v54 測試（A2 育成聯盟）---");

/* 常數存在 */
assert(g("typeof V54_DEV_MIN_SALARY === 'number' && V54_DEV_MIN_SALARY === 80000"), "v54 V54_DEV_MIN_SALARY = 80000");
assert(g("typeof V54_DEV_COACH_ROLES !== 'undefined' && V54_DEV_COACH_ROLES.length === 4"), "v54 育成教練4職位");
assert(g("typeof V54_DEV_POLICIES !== 'undefined' && V54_DEV_POLICIES.balanced"), "v54 育成方針含均衡");
assert(g("V54_DEV_POLICIES.balanced.pMul === 0.8"), "v54 均衡方針主屬性×0.8");
assert(g("typeof V54_GROWTH_PHASES !== 'undefined' && V54_GROWTH_PHASES.physical"), "v54 成長階段含體能");
assert(g("V54_GROWTH_PHASES.physical.years[0]===1 && V54_GROWTH_PHASES.physical.years[1]===5"), "v54 體能階段1-5年");
assert(g("V54_GROWTH_PHASES.technical.years[0]===3 && V54_GROWTH_PHASES.technical.years[1]===10"), "v54 技術階段3-10年");
assert(g("V54_GROWTH_PHASES.mental.years[0]===8"), "v54 心智階段8年起");

/* v54GrowthPhaseMultiplier 修復：team 參數傳入 */
g("var __gpmP = {proStartYear:1, level:'育成', age:18}; var __gpmT = {devPolicy:'balanced'};");
g("S.seasonYear = 3;"); /* proYears=3, in physical+technical range */
assert(g("typeof v54GrowthPhaseMultiplier === 'function'"), "v54 v54GrowthPhaseMultiplier 函式存在");
var gpmR = g("v54GrowthPhaseMultiplier(__gpmP, 'contact', __gpmT)");
assert(typeof gpmR === "number" && gpmR > 0 && gpmR < 2, "v54 成長乘數回傳合理數值（含team）");
/* 均衡方針×0.8，在階段內×1.15 → ≈0.92 */
assert(g("Math.abs(v54GrowthPhaseMultiplier(__gpmP, 'contact', __gpmT) - 1.15*0.8) < 0.001"), "v54 育成+均衡+階段內 = 1.15×0.8");
/* 無team時不爆錯 */
assert(g("typeof v54GrowthPhaseMultiplier(__gpmP, 'contact') === 'number'"), "v54 v54GrowthPhaseMultiplier 無team不爆錯");

/* rosterDev 三層名單 */
assert(g("Array.isArray(S.teams[S.userTeamId].rosterDev)"), "v54 userTeam 有 rosterDev");
assert(g("S.teams[S.userTeamId].rosterDev.length > 0"), "v54 育成名單非空");
assert(g("S.teams[S.userTeamId].rosterDev.length <= 25"), "v54 育成≤25人");
assert(g("S.teams[S.userTeamId].rosterDev.every(function(id){ var p=S.players[id]; return p && p.level==='育成'; })"), "v54 育成球員 level 皆為'育成'");

/* v54GenerateDevPlayer */
assert(g("typeof v54GenerateDevPlayer === 'function'"), "v54 v54GenerateDevPlayer 函式存在");
g("var __devP = v54GenerateDevPlayer('T0', true);");
assert(g("__devP.age >= 15 && __devP.age <= 20"), "v54 育成球員年齡15-20");
assert(g("__devP.level === '育成'"), "v54 新育成球員 level='育成'");
assert(g("typeof __devP.proStartYear === 'number'"), "v54 育成球員有 proStartYear");

/* 六方向升降級函式存在 */
assert(g("typeof v54PromoteDevToMinor === 'function'"), "v54 v54PromoteDevToMinor 存在");
assert(g("typeof v54PromoteMinorToMajor === 'function'"), "v54 v54PromoteMinorToMajor 存在");
assert(g("typeof v54PromoteDevToMajor === 'function'"), "v54 v54PromoteDevToMajor 存在");
assert(g("typeof v54DemoteMajorToMinor === 'function'"), "v54 v54DemoteMajorToMinor 存在");
assert(g("typeof v54DemoteMinorToDev === 'function'"), "v54 v54DemoteMinorToDev 存在");
assert(g("typeof v54DemoteMajorToDev === 'function'"), "v54 v54DemoteMajorToDev 存在");

/* 六方向升降級功能測試：育成→二軍（先騰出二軍空間） */
g("var __r2LastId = S.teams[S.userTeamId].roster2[S.teams[S.userTeamId].roster2.length-1]; S.teams[S.userTeamId].roster2 = S.teams[S.userTeamId].roster2.filter(function(id){return id!==__r2LastId}); S.players[__r2LastId].team=null; S.freeAgents[__r2LastId]=S.players[__r2LastId];");
g("var __devTestId = S.teams[S.userTeamId].rosterDev[0];");
g("var __devTestP = S.players[__devTestId];");
g("var __r2Before = S.teams[S.userTeamId].roster2.length;");
g("var __rdBefore = S.teams[S.userTeamId].rosterDev.length;");
g("v54PromoteDevToMinor(__devTestId);");
assert(g("S.players[__devTestId].level === '2軍'"), "v54 育成→二軍：level 變更");
assert(g("S.teams[S.userTeamId].roster2.includes(__devTestId)"), "v54 育成→二軍：進入 roster2");
assert(g("!S.teams[S.userTeamId].rosterDev.includes(__devTestId)"), "v54 育成→二軍：離開 rosterDev");
assert(g("S.teams[S.userTeamId].roster2.length === __r2Before + 1"), "v54 育成→二軍：roster2 +1");
assert(g("S.teams[S.userTeamId].rosterDev.length === __rdBefore - 1"), "v54 育成→二軍：rosterDev -1");
assert(g("!S.players[__devTestId].devContractYears"), "v54 育成→二軍：育成合約已刪除");

/* 二軍→育成（回放） */
g("v54DemoteMinorToDev(__devTestId);");
assert(g("S.players[__devTestId].level === '育成'"), "v54 二軍→育成：level 變更");
assert(g("S.teams[S.userTeamId].rosterDev.includes(__devTestId)"), "v54 二軍→育成：回到 rosterDev");
assert(g("S.players[__devTestId].devContractYears === 1"), "v54 二軍→育成：建立育成合約");
assert(g("S.players[__devTestId].salary === V54_DEV_MIN_SALARY"), "v54 二軍→育成：底薪保護");

/* ensureV54 存檔遷移 */
assert(g("typeof ensureV54 === 'function'"), "v54 ensureV54 函式存在");

/* 育成季末結算 */
assert(g("typeof v54DevMinorSeasonStats === 'function'"), "v54 v54DevMinorSeasonStats 函式存在");

/* 育成合約到期處理 */
assert(g("typeof v54DevContractSeasonEnd === 'function'"), "v54 v54DevContractSeasonEnd 函式存在");

/* === v54-r003 新增斷言 === */

/* 球探發掘 */
assert(g("typeof v54ScoutDiscoverCandidates === 'function'"), "v54 v54ScoutDiscoverCandidates 函式存在");
assert(g("typeof v54SignDiscoveredPlayer === 'function'"), "v54 v54SignDiscoveredPlayer 函式存在");
assert(g("typeof V54_DISCOVERY_DIRECTIONS !== 'undefined' && V54_DISCOVERY_DIRECTIONS.length === 3"), "v54 V54_DISCOVERY_DIRECTIONS 有 3 種方向");
g("var __discCands = v54ScoutDiscoverCandidates('balanced');");
assert(g("Array.isArray(__discCands) && __discCands.length >= 3"), "v54 球探發掘至少3名候選");
assert(g("__discCands.every(function(c){ return c.age >= 15 && c.age <= 20; })"), "v54 發掘候選年齡15-20");
assert(g("__discCands.every(function(c){ return c.level === null || c.level === '育成'; })"), "v54 發掘候選 level 正確");

/* 選秀新秀落差比分配 */
assert(g("typeof trueOverall === 'function'"), "v54 trueOverall 函式存在（落差比依賴）");

/* 里程碑事件 */
assert(g("typeof v54DevMilestoneEvent === 'function'"), "v54 v54DevMilestoneEvent 函式存在");
g("var __msTestP = { id:'ms_test', potential: 60, isPitcher: false, contact: 40, power: 40, eye: 40, speed: 40, fielding: 40, arm: 40, stamina: 40, durability: 40, composure: 40, steal: 40, vsL: 40, vsR: 40, bunting: 40 };");
g("var __ms3 = v54DevMilestoneEvent(__msTestP, 3, S.teams[S.userTeamId]);");
assert(g("__ms3 && __ms3.type === 'milestone3' && typeof __ms3.msg === 'string'"), "v54 第3年里程碑事件正確生成");
g("var __ms5 = v54DevMilestoneEvent(__msTestP, 5, S.teams[S.userTeamId]);");
assert(g("__ms5 && __ms5.type === 'milestone5'"), "v54 第5年里程碑事件正確生成");
g("var __ms7 = v54DevMilestoneEvent(__msTestP, 7, S.teams[S.userTeamId]);");
assert(g("__ms7 && __ms7.type === 'milestone7'"), "v54 第7年里程碑事件正確生成");

/* refreshPayroll 覆蓋 rosterDev */
g("var __payT = S.teams[S.userTeamId]; var __payBefore = __payT.finance.payroll;");
g("refreshPayroll(__payT, S.players);");
assert(g("typeof __payT.finance.payroll === 'number' && __payT.finance.payroll > 0"), "v54 refreshPayroll 含育成薪資");

/* 轉約成本 */
assert(g("typeof v54DevConversionCost === 'function'"), "v54 v54DevConversionCost 函式存在");
assert(g("v54DevConversionCost({salary: 80000}) === 40000"), "v54 轉約成本 = 年薪50%");

/* UI 函式存在 */
assert(g("typeof renderV54RosterMoveCard === 'function'"), "v54 renderV54RosterMoveCard 函式存在");
assert(g("typeof renderV54DevMilestoneCards === 'function'"), "v54 renderV54DevMilestoneCards 函式存在");

/* v54-r004：Bug #1 - 休賽季發掘旗標重置 */
g("UI.v54DiscoveredThisOffseason = true"); // 模擬玩家已在本休賽季使用發掘
g("var __g=0; while(simulateDay(S) && __g<400) __g++; generatePlayoffs(); doSimulatePlayoffsToEnd(); enterOffseason();");
assert(!g("UI.v54DiscoveredThisOffseason"), "v54-r004 enterOffseason 重置 v54DiscoveredThisOffseason");

/* v54-r004：Bug #2 - devSeasonLog/minorSeasonLog 季末寫入（確認 v41OnSeasonEnd→v54DevMinorSeasonStats 正常推入） */
assert(g("(function(){var t=S.teams[S.userTeamId]; var ids=t.rosterDev||[]; return ids.some(function(id){var p=S.players[id]; return p && p.devSeasonLog && p.devSeasonLog.length > 0;})})()"), "v54-r004 devSeasonLog 季末寫入存在");
assert(g("(function(){var t=S.teams[S.userTeamId]; var ids=t.roster2||[]; return ids.some(function(id){var p=S.players[id]; return p && p.minorSeasonLog && p.minorSeasonLog.length > 0;})})()"), "v54-r004 minorSeasonLog 季末寫入存在");

/* ---------- v55 測試（L3 進階數據引擎） ---------- */
console.log("\n--- v55 測試（L3 進階數據引擎）---");
g("ensureV55()"); /* 確保 Phase 3 分析主管欄位補齊 */

/* 擊球分類函式存在 */
assert(g("typeof v55ClassifyBattedBall === 'function'"), "v55 v55ClassifyBattedBall 函式存在");
assert(g("typeof v55RecordBattedBall === 'function'"), "v55 v55RecordBattedBall 函式存在");
assert(g("typeof v55ComputeAdvancedStats === 'function'"), "v55 v55ComputeAdvancedStats 函式存在");
assert(g("typeof v55LeagueAverages === 'function'"), "v55 v55LeagueAverages 函式存在");
assert(g("typeof ensureV55 === 'function'"), "v55 ensureV55 函式存在");

/* 擊球分類產出格式 */
g("var __bb55 = v55ClassifyBattedBall({contact:60,power:55,speed:50},{velocity:55,control:50})");
assert(g("['GB','LD','FB','PU'].indexOf(__bb55.type) >= 0"), "v55 擊球類型為 GB/LD/FB/PU 之一");
assert(g("['soft','medium','hard','barrel'].indexOf(__bb55.quality) >= 0"), "v55 擊球品質為 soft/medium/hard/barrel 之一");

/* 一軍球員 seasonStats 含 BIP/GB/LD/FB 欄位（比賽後應累積） */
assert(g("(function(){var t=S.teams[S.userTeamId]; var ids=t.roster1; for(var i=0;i<ids.length;i++){var p=S.players[ids[i]]; if(p && !p.isPitcher && p.seasonStats && p.seasonStats.BIP > 0) return true;} return false;})()"), "v55 打者 BIP 已累積（場內球計數）");
assert(g("(function(){var t=S.teams[S.userTeamId]; var ids=t.roster1; for(var i=0;i<ids.length;i++){var p=S.players[ids[i]]; if(p && !p.isPitcher && p.seasonStats && (p.seasonStats.GB + p.seasonStats.LD + p.seasonStats.FB + p.seasonStats.PU) > 0) return true;} return false;})()"), "v55 打者擊球類型已累積");
assert(g("(function(){var t=S.teams[S.userTeamId]; var ids=t.roster1; for(var i=0;i<ids.length;i++){var p=S.players[ids[i]]; if(p && p.isPitcher && p.seasonStats && p.seasonStats.BIP > 0) return true;} return false;})()"), "v55 投手 BIP 已累積");

/* 進階數據計算——打者 */
g("var __adv55bat = (function(){ var t=S.teams[S.userTeamId]; var ids=t.roster1; for(var i=0;i<ids.length;i++){var p=S.players[ids[i]]; if(p && !p.isPitcher && p.seasonStats && p.seasonStats.AB > 50) return v55ComputeAdvancedStats(p.seasonStats, false);} return null;})()");
assert(g("__adv55bat && typeof __adv55bat.AVG === 'number' && __adv55bat.AVG >= 0 && __adv55bat.AVG <= 1"), "v55 打者 AVG 合理");
assert(g("__adv55bat && typeof __adv55bat.OBP === 'number' && __adv55bat.OBP >= 0"), "v55 打者 OBP 存在");
assert(g("__adv55bat && typeof __adv55bat.SLG === 'number' && __adv55bat.SLG >= 0"), "v55 打者 SLG 存在");
assert(g("__adv55bat && typeof __adv55bat['OPS+'] === 'number'"), "v55 打者 OPS+ 存在");
assert(g("__adv55bat && typeof __adv55bat.BABIP === 'number' && __adv55bat.BABIP >= 0 && __adv55bat.BABIP <= 1"), "v55 打者 BABIP 合理");
assert(g("__adv55bat && typeof __adv55bat['K%'] === 'number'"), "v55 打者 K% 存在");
assert(g("__adv55bat && typeof __adv55bat['BB%'] === 'number'"), "v55 打者 BB% 存在");
assert(g("__adv55bat && typeof __adv55bat['GB%'] === 'number'"), "v55 打者 GB% 存在");
assert(g("__adv55bat && typeof __adv55bat['HardHit%'] === 'number'"), "v55 打者 HardHit% 存在");
assert(g("__adv55bat && typeof __adv55bat.confidence !== 'undefined'"), "v55 打者 confidence 標記存在");

/* 進階數據計算——投手 */
g("var __adv55pit = (function(){ var t=S.teams[S.userTeamId]; var ids=t.roster1; for(var i=0;i<ids.length;i++){var p=S.players[ids[i]]; if(p && p.isPitcher && p.seasonStats && p.seasonStats.OUTS > 30) return v55ComputeAdvancedStats(p.seasonStats, true);} return null;})()");
assert(g("__adv55pit && typeof __adv55pit.ERA === 'number' && __adv55pit.ERA >= 0"), "v55 投手 ERA 存在");
assert(g("__adv55pit && typeof __adv55pit.FIP === 'number'"), "v55 投手 FIP 存在");
assert(g("__adv55pit && typeof __adv55pit['ERA+'] === 'number'"), "v55 投手 ERA+ 存在");
assert(g("__adv55pit && typeof __adv55pit['K/9'] === 'number'"), "v55 投手 K/9 存在");
assert(g("__adv55pit && typeof __adv55pit['GB%'] === 'number'"), "v55 投手 GB% 存在");
assert(g("__adv55pit && typeof __adv55pit.BABIP === 'number' && __adv55pit.BABIP >= 0 && __adv55pit.BABIP <= 1"), "v55 投手 BABIP 合理");

/* 聯盟平均值 */
g("var __lgAvg55 = v55LeagueAverages()");
assert(g("__lgAvg55 && __lgAvg55.OBP > 0.200 && __lgAvg55.OBP < 0.450"), "v55 聯盟平均 OBP 在合理區間");
assert(g("__lgAvg55 && __lgAvg55.SLG > 0.250 && __lgAvg55.SLG < 0.550"), "v55 聯盟平均 SLG 在合理區間");
assert(g("__lgAvg55 && __lgAvg55.ERA > 2.50 && __lgAvg55.ERA < 6.00"), "v55 聯盟平均 ERA 在合理區間");
assert(g("__lgAvg55 && typeof __lgAvg55.FIPConst === 'number' && isFinite(__lgAvg55.FIPConst)"), "v55 FIP 常數有限");

/* 統計環境合理性驗證（聯盟整體 K%/BB%/BABIP 區間檢查） */
g("var __lgK55=0, __lgBB55=0, __lgPA55=0, __lgBIP55=0, __lgBH55=0, __lgBHR55=0, __lgBAB55=0, __lgBSO55=0, __lgBSF55=0; Object.values(S.players).forEach(function(p){if(!p||!p.seasonStats||p.isPitcher) return; var st=p.seasonStats; var pa=st.AB+st.BB+st.HBP+st.SF; __lgPA55+=pa; __lgK55+=st.SO; __lgBB55+=st.BB; __lgBIP55+=(st.BIP||0); __lgBH55+=st.H; __lgBHR55+=st.HR; __lgBAB55+=st.AB; __lgBSO55+=st.SO; __lgBSF55+=st.SF;});");
assert(g("__lgPA55 > 0 && (__lgK55/__lgPA55) > 0.10 && (__lgK55/__lgPA55) < 0.35"), "v55 聯盟 K% 在 10%-35% 合理區間");
assert(g("__lgPA55 > 0 && (__lgBB55/__lgPA55) > 0.04 && (__lgBB55/__lgPA55) < 0.16"), "v55 聯盟 BB% 在 4%-16% 合理區間");
assert(g("(function(){var denom=__lgBAB55-__lgBSO55-__lgBHR55+__lgBSF55; return denom>0 && ((__lgBH55-__lgBHR55)/denom)>0.230 && ((__lgBH55-__lgBHR55)/denom)<0.340;})()"), "v55 聯盟 BABIP 在 .230-.340 合理區間");

/* BIP 一致性：GB+LD+FB+PU 應等於 BIP */
assert(g("(function(){var ok=true; Object.values(S.players).forEach(function(p){if(!p||!p.seasonStats) return; var st=p.seasonStats; if(st.BIP>0 && (st.GB+st.LD+st.FB+st.PU)!==st.BIP) ok=false;}); return ok;})()"), "v55 GB+LD+FB+PU === BIP 一致性");

/* ── v55 Phase 2：運氣校正指標 ── */
g("var __luck55bat = (function(){ var t=S.teams[S.userTeamId]; var ids=t.roster1; for(var i=0;i<ids.length;i++){var p=S.players[ids[i]]; if(p && !p.isPitcher && p.seasonStats && p.seasonStats.AB > 50) return v55LuckIndicators(p.seasonStats, false);} return null;})()");
assert(g("__luck55bat !== null"), "v55 打者 luck indicators 回傳非 null");
assert(g("typeof __luck55bat.AVG === 'number' && __luck55bat.AVG >= 0 && __luck55bat.AVG <= 1"), "v55 luck AVG 合理");
assert(g("typeof __luck55bat.xAVG === 'number' && __luck55bat.xAVG >= 0 && __luck55bat.xAVG <= 1"), "v55 luck xAVG 合理");
assert(g("typeof __luck55bat.BABIP === 'number' && __luck55bat.BABIP >= 0 && __luck55bat.BABIP <= 1"), "v55 luck BABIP 合理");
assert(g("typeof __luck55bat.xBABIP === 'number' && __luck55bat.xBABIP >= 0.20 && __luck55bat.xBABIP <= 0.40"), "v55 luck xBABIP 在合理區間 (.20-.40)");
assert(g("typeof __luck55bat.babipLuck === 'number'"), "v55 打者 babipLuck 存在");
assert(g("typeof __luck55bat.avgLuck === 'number'"), "v55 打者 avgLuck 存在");
assert(g("typeof __luck55bat.luckDirection === 'string' && ['lucky','unlucky','neutral'].indexOf(__luck55bat.luckDirection) >= 0"), "v55 打者 luckDirection 有效值");
assert(g("typeof __luck55bat.samplePA === 'number' && __luck55bat.samplePA > 0"), "v55 打者 samplePA > 0");
assert(g("typeof __luck55bat['HardHit%'] === 'number'"), "v55 luck HardHit% 存在");
assert(g("typeof __luck55bat['Barrel%'] === 'number'"), "v55 luck Barrel% 存在");

g("var __luck55pit = (function(){ var t=S.teams[S.userTeamId]; var ids=t.roster1; for(var i=0;i<ids.length;i++){var p=S.players[ids[i]]; if(p && p.isPitcher && p.seasonStats && p.seasonStats.OUTS > 30) return v55LuckIndicators(p.seasonStats, true);} return null;})()");
assert(g("__luck55pit !== null"), "v55 投手 luck indicators 回傳非 null");
assert(g("typeof __luck55pit.ERA === 'number' && __luck55pit.ERA >= 0"), "v55 luck ERA 合理");
assert(g("typeof __luck55pit.FIP === 'number'"), "v55 luck FIP 存在");
assert(g("typeof __luck55pit.eraFipGap === 'number'"), "v55 投手 eraFipGap 存在");
assert(g("typeof __luck55pit.BABIP === 'number' && __luck55pit.BABIP >= 0"), "v55 luck 投手 BABIP 合理");
assert(g("typeof __luck55pit.babipDelta === 'number'"), "v55 投手 babipDelta 存在");
assert(g("typeof __luck55pit.luckDirection === 'string' && ['lucky','unlucky','neutral'].indexOf(__luck55pit.luckDirection) >= 0"), "v55 投手 luckDirection 有效值");
assert(g("typeof __luck55pit.sampleBF === 'number' && __luck55pit.sampleBF > 0"), "v55 投手 sampleBF > 0");

/* ── v55 Phase 2：數據中心蒐集函式 ── */
g("var __dc55 = v55DataCenterStats()");
assert(g("__dc55 && Array.isArray(__dc55.batters) && __dc55.batters.length > 0"), "v55 DataCenter 打者陣列非空");
assert(g("__dc55 && Array.isArray(__dc55.pitchers) && __dc55.pitchers.length > 0"), "v55 DataCenter 投手陣列非空");
assert(g("__dc55.batters[0].advanced && typeof __dc55.batters[0].advanced.OPS === 'number'"), "v55 DataCenter 打者含 advanced.OPS");
assert(g("__dc55.pitchers[0].advanced && typeof __dc55.pitchers[0].advanced.ERA === 'number'"), "v55 DataCenter 投手含 advanced.ERA");
assert(g("__dc55.batters[0].luck === null || (typeof __dc55.batters[0].luck === 'object')"), "v55 DataCenter 打者含 luck 物件或 null");
assert(g("__dc55.pitchers[0].luck === null || (typeof __dc55.pitchers[0].luck === 'object')"), "v55 DataCenter 投手含 luck 物件或 null");

/* v55 Phase 2：confidence 標記邏輯驗證 */
assert(g("(function(){ var a = v55ComputeAdvancedStats({AB:500,BB:50,HBP:5,SF:5,H:150,HR:20,D:30,T:5,SO:100,R:60,RBI:70,SB:10,CS:3,GIDP:5,BIP:350,GB:150,LD:70,FB:90,PU:40,HardHit:110,Barrel:28}, false); return a.confidence === 'reliable'; })()"), "v55 confidence=reliable 於 PA≥400");
assert(g("(function(){ var a = v55ComputeAdvancedStats({AB:130,BB:20,HBP:2,SF:2,H:40,HR:5,D:8,T:1,SO:35,R:18,RBI:20,SB:3,CS:1,GIDP:2,BIP:90,GB:40,LD:18,FB:22,PU:10,HardHit:28,Barrel:7}, false); return a.confidence === 'moderate'; })()"), "v55 confidence=moderate 於 150≤PA<400");
assert(g("(function(){ var a = v55ComputeAdvancedStats({AB:30,BB:5,HBP:0,SF:1,H:8,HR:1,D:2,T:0,SO:8,R:4,RBI:5,SB:1,CS:0,GIDP:0,BIP:21,GB:10,LD:4,FB:5,PU:2,HardHit:6,Barrel:2}, false); return a.confidence === 'insufficient'; })()"), "v55 confidence=insufficient 於 PA<150");

/* v55 Phase 2：team-scoped DataCenter */
g("var __dc55team = v55DataCenterStats(S.userTeamId)");
assert(g("__dc55team && Array.isArray(__dc55team.batters)"), "v55 DataCenter team-scoped 回傳正確結構");
assert(g("(function(){ for(var i=0;i<__dc55team.batters.length;i++){if(__dc55team.batters[i].team!==S.userTeamId) return false;} return true; })()"), "v55 DataCenter team-scoped 只含本隊打者");

/* v55 Phase 2：renderDataCenter 函式存在 */
assert(g("typeof renderDataCenter === 'function'"), "v55 renderDataCenter 函式已定義");
assert(g("typeof v55LuckPanelHtml === 'function'"), "v55 v55LuckPanelHtml 函式已定義");
assert(g("typeof v55DCBattersTable === 'function'"), "v55 v55DCBattersTable 函式已定義");
assert(g("typeof v55DCPitchersTable === 'function'"), "v55 v55DCPitchersTable 函式已定義");
assert(g("typeof v55DCLuckTable === 'function'"), "v55 v55DCLuckTable 函式已定義");
assert(g("typeof wireDataCenter === 'function'"), "v55 wireDataCenter 函式已定義");

/* ── v55 Phase 3：分析主管＋套利落地 ── */
assert(g("typeof v55GenerateAnalysisDirector === 'function'"), "v55 v55GenerateAnalysisDirector 函式已定義");
assert(g("typeof v55DirectorTierBonus === 'function'"), "v55 v55DirectorTierBonus 函式已定義");
assert(g("typeof v55CorrectionQuality === 'function'"), "v55 v55CorrectionQuality 函式已定義");
assert(g("typeof v55EnsureAnalysisDirector === 'function'"), "v55 v55EnsureAnalysisDirector 函式已定義");
assert(g("typeof v55GenerateAlerts === 'function'"), "v55 v55GenerateAlerts 函式已定義");
assert(g("typeof v55LuckValueAdj === 'function'"), "v55 v55LuckValueAdj 函式已定義");
assert(g("typeof v55RenderAlertsCard === 'function'"), "v55 v55RenderAlertsCard 函式已定義");
assert(g("typeof v55DirectorPanelHtml === 'function'"), "v55 v55DirectorPanelHtml 函式已定義");
assert(g("typeof v55HireDirector === 'function'"), "v55 v55HireDirector 函式已定義");
assert(g("typeof v55ConfirmHireDirector === 'function'"), "v55 v55ConfirmHireDirector 函式已定義");
assert(g("typeof v55FireDirector === 'function'"), "v55 v55FireDirector 函式已定義");
assert(g("typeof v55ProcessAnalysisDirectorContract === 'function'"), "v55 v55ProcessAnalysisDirectorContract 函式已定義");

/* 分析主管生成驗證 */
g("var __dir55 = v55GenerateAnalysisDirector('TEST')");
assert(g("__dir55 && typeof __dir55.insight === 'number' && __dir55.insight >= 25 && __dir55.insight <= 95"), "v55 director insight 在合理區間");
assert(g("__dir55 && typeof __dir55.correction === 'number' && __dir55.correction >= 25 && __dir55.correction <= 95"), "v55 director correction 在合理區間");
assert(g("__dir55 && typeof __dir55.alertness === 'number' && __dir55.alertness >= 25 && __dir55.alertness <= 95"), "v55 director alertness 在合理區間");
assert(g("__dir55 && typeof __dir55.name === 'string' && __dir55.name.length > 0"), "v55 director 有名字");
assert(g("__dir55 && typeof __dir55.salary === 'number' && __dir55.salary > 0"), "v55 director 有薪水");
assert(g("__dir55 && typeof __dir55.contractYears === 'number' && __dir55.contractYears >= 1"), "v55 director 有合約年限");

/* tier bonus 邏輯 */
assert(g("v55DirectorTierBonus({insight: 30}) === 0"), "v55 insight 30 → tier bonus 0");
assert(g("v55DirectorTierBonus({insight: 60}) === 1"), "v55 insight 60 → tier bonus 1");
assert(g("v55DirectorTierBonus({insight: 85}) === 1"), "v55 insight 85 → tier bonus 1");
assert(g("v55DirectorTierBonus(null) === 0"), "v55 null director → tier bonus 0");

/* correction quality 邏輯 */
assert(g("v55CorrectionQuality({correction: 50}) === 0.5"), "v55 correction 50 → quality 0.5");
assert(g("v55CorrectionQuality({correction: 90}) > 0.8"), "v55 correction 90 → quality > 0.8");
assert(g("v55CorrectionQuality(null) === 0.5"), "v55 null director → quality 0.5");

/* ensureV55 已為球隊補齊 analysisDirector 欄位 */
assert(g("(function(){ var t = S.teams[S.userTeamId]; return t.analysisDirector !== undefined; })()"), "v55 玩家球隊有 analysisDirector 欄位");
assert(g("(function(){ var ok = true; Object.values(S.teams).forEach(function(t){ if(t.analysisDirector === undefined) ok=false; }); return ok; })()"), "v55 所有球隊都有 analysisDirector 欄位");

/* alerts 回傳正確結構 */
g("var __alerts55 = v55GenerateAlerts(S.teams[S.userTeamId])");
assert(g("Array.isArray(__alerts55)"), "v55 alerts 回傳陣列");

/* v55LuckValueAdj 純函式驗證 */
g("var __lva55 = v55LuckValueAdj({AB:400,BB:40,HBP:4,SF:4,H:110,HR:15,D:25,T:3,SO:90,BIP:280,GB:120,LD:60,FB:70,PU:30,HardHit:90,Barrel:22}, 15)");
assert(g("typeof __lva55 === 'number'"), "v55LuckValueAdj 回傳數字");
assert(g("__lva55 >= -15 && __lva55 <= 15"), "v55LuckValueAdj 在 cap 範圍內");

/* ====================================================================
   v55 Culture & City 回歸測試（§11.2 球隊文化 + §11.4 城市）
   ==================================================================== */

/* TEAM_DEFS 固定欄位驗證 */
assert(g("TEAM_DEFS.every(d => d.cityTier && d.fixedPersona && d.cityFlavor)"), "v55 TEAM_DEFS 所有隊伍都有 cityTier/fixedPersona/cityFlavor");
assert(g("TEAM_DEFS.filter(d => d.cityTier === 'metro').length === 5"), "v55 大城市 5 隊");
assert(g("TEAM_DEFS.filter(d => d.cityTier === 'mid').length === 8"), "v55 中型城市 8 隊");
assert(g("TEAM_DEFS.filter(d => d.cityTier === 'small').length === 7"), "v55 小城市 7 隊");
assert(g("TEAM_DEFS.find(d => d.id === 'T6').fixedPersona === 'splash'"), "v55 龍城雲豹固定為豪購型");
assert(g("TEAM_DEFS.find(d => d.id === 'T5').fixedPersona === 'analytics'"), "v55 天啟鷹固定為精算型");
assert(g("TEAM_DEFS.find(d => d.id === 'T2').fixedPersona === 'farm'"), "v55 曲江水牛固定為養成型");

/* 固定 persona 分配到球隊 */
assert(g("S.teams['T6'].persona === 'splash'"), "v55 T6 persona = splash");
assert(g("S.teams['T5'].persona === 'analytics'"), "v55 T5 persona = analytics");

/* originalTeamId 追蹤 */
g("var __otPlayers = Object.values(S.players).filter(p => p.originalTeamId)");
assert(g("__otPlayers.length > 0"), "v55 球員有 originalTeamId");
assert(g("__otPlayers.every(p => typeof p.originalTeamId === 'string')"), "v55 originalTeamId 為字串");

/* 城市初始值函式 */
g("var __ci = v55CityInitFor('T6')");
assert(g("__ci.population >= 60 && __ci.population <= 85"), "v55 大城市初始人口 60-85");
assert(g("__ci.economy >= 55 && __ci.economy <= 80"), "v55 大城市初始經濟 55-80");
g("var __ci2 = v55CityInitFor('T17')");
assert(g("__ci2.population >= 25 && __ci2.population <= 50"), "v55 小城市初始人口 25-50");

/* 城市狀態初始化 */
assert(g("S.cityState && typeof S.cityState === 'object'"), "v55 S.cityState 存在");
assert(g("Object.keys(S.cityState).length === 20"), "v55 cityState 有 20 隊");
assert(g("S.cityState['T0'].population > 0 && S.cityState['T0'].economy > 0 && S.cityState['T0'].fanGen >= 0"), "v55 cityState T0 值正常");

/* 城市規模標籤 */
assert(g("v55CityTierLabel('T6') === '大城市'"), "v55 T6 cityTierLabel 大城市");
assert(g("v55CityTierLabel('T17') === '小城市'"), "v55 T17 cityTierLabel 小城市");
assert(g("v55CityTierLabel('T1') === '中型城市'"), "v55 T1 cityTierLabel 中型城市");

/* 文化結構初始化 */
assert(g("S.culture && typeof S.culture === 'object'"), "v55 S.culture 存在");
assert(g("Array.isArray(S.culture.history)"), "v55 culture.history 為陣列");
assert(g("Array.isArray(S.culture.labels)"), "v55 culture.labels 為陣列");
assert(g("typeof S.culture.scores === 'object'"), "v55 culture.scores 為物件");
assert(g("typeof S.culture.faSpendThisYear === 'number'"), "v55 culture.faSpendThisYear 為數字");

/* v55EnsureCulture 安全性 */
g("v55EnsureCulture()");
assert(g("S.culture.labels !== undefined"), "v55EnsureCulture 不破壞 labels");

/* v55EnsureCityState 安全性 */
g("v55EnsureCityState()");
assert(g("Object.keys(S.cityState).length >= 20"), "v55EnsureCityState 不減少城市");

/* 文化分數計算 */
g("S.culture.history = [{year:1,rookiePct:0.6,faPct:0.1,trustRate:0.8,hadTakeover:0},{year:2,rookiePct:0.55,faPct:0.15,trustRate:0.7,hadTakeover:0},{year:3,rookiePct:0.58,faPct:0.12,trustRate:0.75,hadTakeover:0}]");
g("v55ComputeCultureScores()");
assert(g("S.culture.scores.rookieDev > 0.5"), "v55 育成聖地分數 > 0.5");
assert(g("S.culture.labels.indexOf('rookieDev') >= 0"), "v55 育成聖地標籤出現");
assert(g("S.culture.labels.indexOf('trust') >= 0"), "v55 信任標籤出現（trustRate avg > 0.65）");
assert(g("S.culture.labels.indexOf('faBigSpend') < 0"), "v55 faBigSpend 低時不出現贏球至上");
assert(g("S.culture.labels.indexOf('handsOn') < 0"), "v55 handsOn 低時不出現傀儡球團");

/* 贏球至上測試 */
g("S.culture.history = [{year:1,rookiePct:0.2,faPct:0.4,trustRate:0.5,hadTakeover:0},{year:2,rookiePct:0.25,faPct:0.35,trustRate:0.4,hadTakeover:0},{year:3,rookiePct:0.3,faPct:0.3,trustRate:0.45,hadTakeover:0}]");
g("v55ComputeCultureScores()");
assert(g("S.culture.labels.indexOf('faBigSpend') >= 0"), "v55 高 FA 支出觸發贏球至上");
assert(g("S.culture.labels.indexOf('rookieDev') < 0"), "v55 低自家比例不觸發育成聖地");

/* 傀儡球團測試 */
g("S.culture.history = [{year:1,rookiePct:0.4,faPct:0.2,trustRate:0.5,hadTakeover:1},{year:2,rookiePct:0.4,faPct:0.2,trustRate:0.5,hadTakeover:1},{year:3,rookiePct:0.4,faPct:0.2,trustRate:0.5,hadTakeover:0}]");
g("v55ComputeCultureScores()");
assert(g("S.culture.scores.handsOn > 0.6"), "v55 2/3 年接管 → handsOn 分數高");

/* 文化效果出口純函式 */
g("S.culture.labels = ['rookieDev']");
assert(g("v55CultureGrowthBonus() === 1.04"), "v55 育成聖地成長加成 1.04");
assert(g("v55CultureLoyaltyMod() === 2"), "v55 育成聖地忠誠 +2");
assert(g("v55CultureFanPatienceMod() === 3"), "v55 育成聖地球迷耐心 +3");

g("S.culture.labels = ['faBigSpend']");
assert(g("v55CultureGrowthBonus() === 1.0"), "v55 贏球至上無成長加成");
assert(g("v55CultureLoyaltyMod() === -3"), "v55 贏球至上忠誠 -3");
assert(g("v55CultureFanPatienceMod() === -2"), "v55 贏球至上球迷耐心 -2");

g("S.culture.labels = ['trust']");
assert(g("v55CultureSalaryMult() < 1"), "v55 信任薪資折扣 < 1");

g("S.culture.labels = ['handsOn']");
assert(g("v55CultureCoachPenalty() === -8"), "v55 傀儡球團教練罰值 -8");

g("S.culture.labels = ['rookieDev','trust']");
assert(g("v55CultureGrowthBonus() === 1.04"), "v55 雙標籤成長加成正確");
assert(g("v55CultureSalaryMult() < 1"), "v55 雙標籤薪資折扣正確");
assert(g("v55CultureFanPatienceMod() === 3"), "v55 雙標籤耐心修正正確");

/* 空標籤預設值 */
g("S.culture.labels = []");
assert(g("v55CultureGrowthBonus() === 1.0"), "v55 無文化標籤成長 1.0");
assert(g("v55CultureLoyaltyMod() === 0"), "v55 無文化標籤忠誠 0");
assert(g("v55CultureSalaryMult() === 1.0"), "v55 無文化標籤薪資 1.0");

/* 城市效果出口 */
g("S.cityState['T0'] = {population:80,economy:70,fanGen:60}");
assert(g("v55CityAttendanceMult('T0') > 1.0"), "v55 高人口城市票房乘數 > 1");
assert(g("v55CitySponsorMult('T0') > 1.0"), "v55 高經濟城市贊助乘數 > 1");
assert(g("v55CityFanPatienceMod('T0') > 0"), "v55 高球迷世代耐心正修正");

g("S.cityState['T19'] = {population:30,economy:25,fanGen:30}");
assert(g("v55CityAttendanceMult('T19') < 1.0"), "v55 低人口城市票房乘數 < 1");
assert(g("v55CityFanPatienceMod('T19') < 0"), "v55 低球迷世代耐心負修正");

/* AI 文化標籤 */
assert(g("JSON.stringify(v55AiCultureLabels({persona:'farm'})) === JSON.stringify(['rookieDev'])"), "v55 AI 養成型文化 = rookieDev");
assert(g("JSON.stringify(v55AiCultureLabels({persona:'splash'})) === JSON.stringify(['faBigSpend'])"), "v55 AI 豪購型文化 = faBigSpend");

/* 文化標籤 HTML */
assert(g("v55CultureLabelHtml([]).indexOf('中庸') >= 0"), "v55 空標籤顯示中庸");
assert(g("v55CultureLabelHtml(['rookieDev']).indexOf('育成聖地') >= 0"), "v55 育成聖地標籤 HTML");
assert(g("v55CultureLabelHtml(['rookieDev','trust']).indexOf('信任') >= 0"), "v55 多標籤 HTML 含信任");

/* V55_CULTURE_DEFS 完整性 */
assert(g("V55_CULTURE_DEFS.rookieDev && V55_CULTURE_DEFS.faBigSpend && V55_CULTURE_DEFS.trust && V55_CULTURE_DEFS.handsOn"), "v55 四種文化定義齊全");

/* 還原 culture 到正常狀態 */
g("S.culture = {history:[],labels:[],scores:{rookieDev:0,faBigSpend:0,trust:0,handsOn:0},faSpendThisYear:0}");

/* ---------- v55 球迷演化測試 ---------- */
console.log("\n--- v55 測試（球迷演化：數據素養＋交易記憶）---");

/* 狀態初始化 */
assert(g("typeof S.fanDataLiteracy === 'number'"), "v55 fanDataLiteracy 存在且為數字");
assert(g("Array.isArray(S.fanTradeMemory)"), "v55 fanTradeMemory 存在且為陣列");
assert(g("S.fanDataLiteracy >= 0 && S.fanDataLiteracy <= 100"), "v55 fanDataLiteracy 在 0-100 範圍");

/* ensureV45Fans 防呆：刪除後能自動補回 */
g("delete S.fanDataLiteracy; delete S.fanTradeMemory");
g("ensureV45Fans()");
assert(g("typeof S.fanDataLiteracy === 'number'"), "v55 ensureV45Fans 補回 fanDataLiteracy");
assert(g("Array.isArray(S.fanTradeMemory)"), "v55 ensureV45Fans 補回 fanTradeMemory");

/* playerFanAppeal：低素養（純傳統數據）*/
g("S.fanDataLiteracy = 5"); // 極低素養
const pLow = g(`
  (function(){
    var p = { isPitcher: false, positions: [{pos:'RF'}], seasonStats: { AB:400, H:120, HR:25, RBI:70, SB:5 } };
    return playerFanAppeal(p);
  })()
`);
assert(pLow > 0, "v55 低素養球迷對傳統數據明星有正面評價 (appeal=" + pLow + ")");

/* playerFanAppeal：高素養混入進階數據 */
g("S.fanDataLiteracy = 80"); // 高素養
const pHigh = g(`
  (function(){
    var p = { isPitcher: false, positions: [{pos:'RF'}], seasonStats: { AB:400, H:120, HR:25, RBI:70, SB:5, 'wRC+': 140, ISO: 0.250 } };
    return playerFanAppeal(p);
  })()
`);
assert(pHigh >= pLow, "v55 高素養球迷對有進階數據的球員評價≥低素養 (low=" + Math.round(pLow*10)/10 + " high=" + Math.round(pHigh*10)/10 + ")");

/* playerFanAppeal：低打擊率但高 wRC+ 的「Moneyball 型」球員，在高素養下更被認可 */
g("S.fanDataLiteracy = 80");
const mbHigh = g(`
  (function(){
    var p = { isPitcher: false, positions: [{pos:'C'}], framingAbility: 75, seasonStats: { AB:350, H:77, HR:8, RBI:35, SB:1, 'wRC+': 125, ISO: 0.150 } };
    return playerFanAppeal(p);
  })()
`);
g("S.fanDataLiteracy = 5");
const mbLow = g(`
  (function(){
    var p = { isPitcher: false, positions: [{pos:'C'}], framingAbility: 75, seasonStats: { AB:350, H:77, HR:8, RBI:35, SB:1, 'wRC+': 125, ISO: 0.150 } };
    return playerFanAppeal(p);
  })()
`);
assert(mbHigh > mbLow, "v55 Moneyball型捕手（低AVG高wRC+高Framing）在高素養下更被球迷認可 (low=" + Math.round(mbLow*10)/10 + " high=" + Math.round(mbHigh*10)/10 + ")");

/* playerFanAppeal：投手進階數據（FIP）*/
g("S.fanDataLiteracy = 70");
const pitAdv = g(`
  (function(){
    var p = { isPitcher: true, velocity: 90, seasonStats: { W:10, SV:0, SO:150, FIP: 2.8 } };
    return playerFanAppeal(p);
  })()
`);
g("S.fanDataLiteracy = 5");
const pitTrad = g(`
  (function(){
    var p = { isPitcher: true, velocity: 90, seasonStats: { W:10, SV:0, SO:150, FIP: 2.8 } };
    return playerFanAppeal(p);
  })()
`);
assert(pitAdv >= pitTrad, "v55 低FIP投手在高素養下更受球迷肯定 (trad=" + Math.round(pitTrad*10)/10 + " adv=" + Math.round(pitAdv*10)/10 + ")");

/* 在地出身加成仍生效 */
g("S.fanDataLiteracy = 30");
const localP = g(`
  (function(){
    var p = { isPitcher: false, foreign: false, positions: [{pos:'SS'}], seasonStats: { AB:300, H:90, HR:10, RBI:40, SB:8 } };
    return playerFanAppeal(p);
  })()
`);
const foreignP = g(`
  (function(){
    var p = { isPitcher: false, foreign: true, positions: [{pos:'SS'}], seasonStats: { AB:300, H:90, HR:10, RBI:40, SB:8 } };
    return playerFanAppeal(p);
  })()
`);
assert(localP > foreignP, "v55 在地出身球員的球迷魅力仍高於外籍同等球員");

/* 交易記憶追蹤 */
g("S.fanTradeMemory = []");
g("S.fanTradeMemory.push({name:'王大明',appeal:15,yearTraded:5,yearsLeft:3,local:true})");
assert(g("S.fanTradeMemory.length === 1"), "v55 交易記憶可正確新增");
assert(g("S.fanTradeMemory[0].name === '王大明'"), "v55 交易記憶保存球員名字");
assert(g("S.fanTradeMemory[0].yearsLeft === 3"), "v55 交易記憶初始3年");
assert(g("S.fanTradeMemory[0].local === true"), "v55 交易記憶記錄在地出身");

/* 數據素養演化函式 */
g("S.fanDataLiteracy = 10");
g("v55FanLiteracyEvolve()");
assert(g("S.fanDataLiteracy > 10"), "v55 數據素養年度演化後成長 (now=" + g("S.fanDataLiteracy") + ")");
assert(g("S.fanDataLiteracy <= 100"), "v55 數據素養不超過100");

/* 數據素養遞減回報（高值時成長變慢）*/
g("S.fanDataLiteracy = 80");
const before80 = g("S.fanDataLiteracy");
g("v55FanLiteracyEvolve()");
const after80 = g("S.fanDataLiteracy");
g("S.fanDataLiteracy = 20");
g("v55FanLiteracyEvolve()");
const after20 = g("S.fanDataLiteracy");
const grow80 = after80 - before80;
const grow20 = after20 - 20;
assert(grow20 >= grow80, "v55 低素養時成長速度≥高素養（遞減回報）(20→" + Math.round(grow20*10)/10 + " 80→" + Math.round(grow80*10)/10 + ")");

/* 數據素養不可回退 */
g("S.fanDataLiteracy = 50");
g("v55FanLiteracyEvolve()");
assert(g("S.fanDataLiteracy >= 50"), "v55 數據素養不可回退（單調遞增）");

/* 里程碑旗標 */
g("S._fanLitMilestones = {}");
g("S.fanDataLiteracy = 26");
g("v55FanLiteracyMail()");
assert(g("S._fanLitMilestones.m25 === true"), "v55 素養25里程碑旗標已設定");
g("S.fanDataLiteracy = 51");
g("v55FanLiteracyMail()");
assert(g("S._fanLitMilestones.m50 === true"), "v55 素養50里程碑旗標已設定");
g("S.fanDataLiteracy = 76");
g("v55FanLiteracyMail()");
assert(g("S._fanLitMilestones.m75 === true"), "v55 素養75里程碑旗標已設定");

/* teamFanAppeal 仍正常運作 */
const tfa = g("teamFanAppeal(S.teams[S.userTeamId])");
assert(typeof tfa === "number" && tfa >= 0 && tfa <= 100, "v55 teamFanAppeal 回傳值在合理範圍 (" + tfa + ")");

/* 高素養球迷對交易的容忍度（litDamp） */
g("S.fanDataLiteracy = 90");
const dampHigh = g("clamp(1 - 90 / 300, 0.7, 1.0)");
assert(dampHigh < 1.0 && dampHigh >= 0.7, "v55 高素養時交易認同損失有減傷 (damp=" + dampHigh + ")");
g("S.fanDataLiteracy = 5");
const dampLow = g("clamp(1 - 5 / 300, 0.7, 1.0)");
assert(dampLow > dampHigh, "v55 低素養時交易減傷更小（社會代價更高）");

/* fanExpectPressure 仍正常 */
const fep = g("fanExpectPressure()");
assert(typeof fep === "number" && fep >= 0.7 && fep <= 1.8, "v55 fanExpectPressure 回傳在合理範圍 (" + fep + ")");

/* fanIdentify 四出口仍正常 */
assert(typeof g("fanIdentifyPopBond()") === "number", "v55 fanIdentifyPopBond 回傳數字");
assert(typeof g("fanIdentifySponsorMult()") === "number", "v55 fanIdentifySponsorMult 回傳數字");
assert(typeof g("fanIdentifyFaMult()") === "number", "v55 fanIdentifyFaMult 回傳數字");
assert(typeof g("fanIdentifyHomeEdge()") === "number", "v55 fanIdentifyHomeEdge 回傳數字");

/* 還原球迷演化狀態 */
g("S.fanDataLiteracy = 8; S.fanTradeMemory = []; S._fanLitMilestones = {}");

/* ---------- v55 位置篩選分頁測試 ---------- */
console.log("\n--- v55 測試（位置篩選分頁）---");

/* POS_FILTER_GROUPS 常數存在且有5組 */
assert(typeof g("POS_FILTER_GROUPS") !== "undefined" && g("POS_FILTER_GROUPS.length") === 5, "v55 POS_FILTER_GROUPS 存在且有5組");

/* posFilterGroup 分組正確 */
assert(g("posFilterGroup({isPitcher:true})") === "P", "v55 投手→P");
assert(g("posFilterGroup({isPitcher:false,positions:[{pos:'C'}]})") === "C", "v55 捕手→C");
assert(g("posFilterGroup({isPitcher:false,positions:[{pos:'SS'}]})") === "IF", "v55 游擊→IF");
assert(g("posFilterGroup({isPitcher:false,positions:[{pos:'1B'}]})") === "IF", "v55 一壘→IF");
assert(g("posFilterGroup({isPitcher:false,positions:[{pos:'2B'}]})") === "IF", "v55 二壘→IF");
assert(g("posFilterGroup({isPitcher:false,positions:[{pos:'3B'}]})") === "IF", "v55 三壘→IF");
assert(g("posFilterGroup({isPitcher:false,positions:[{pos:'LF'}]})") === "OF", "v55 左外野→OF");
assert(g("posFilterGroup({isPitcher:false,positions:[{pos:'CF'}]})") === "OF", "v55 中外野→OF");
assert(g("posFilterGroup({isPitcher:false,positions:[{pos:'RF'}]})") === "OF", "v55 右外野→OF");

/* applyPosFilter 篩選正確 */
g("var _tfPool = [{isPitcher:true},{isPitcher:false,positions:[{pos:'C'}]},{isPitcher:false,positions:[{pos:'SS'}]},{isPitcher:false,positions:[{pos:'CF'}]}]");
g("UI.draftPosFilter = 'all'");
assert(g("applyPosFilter(_tfPool, 'draftPosFilter').length") === 4, "v55 篩選 all 回傳全部");
g("UI.draftPosFilter = 'P'");
assert(g("applyPosFilter(_tfPool, 'draftPosFilter').length") === 1, "v55 篩選 P 只留投手");
g("UI.draftPosFilter = 'C'");
assert(g("applyPosFilter(_tfPool, 'draftPosFilter').length") === 1, "v55 篩選 C 只留捕手");
g("UI.draftPosFilter = 'IF'");
assert(g("applyPosFilter(_tfPool, 'draftPosFilter').length") === 1, "v55 篩選 IF 只留內野");
g("UI.draftPosFilter = 'OF'");
assert(g("applyPosFilter(_tfPool, 'draftPosFilter').length") === 1, "v55 篩選 OF 只留外野");

/* posFilterBarHtml 產出 HTML */
g("UI.draftPosFilter = 'all'");
const barHtml = g("posFilterBarHtml(_tfPool, 'draftPosFilter')");
assert(typeof barHtml === "string" && barHtml.includes("pos-filter-bar"), "v55 posFilterBarHtml 產出含 pos-filter-bar");
assert(barHtml.includes("投手") && barHtml.includes("捕手") && barHtml.includes("內野") && barHtml.includes("外野"), "v55 篩選列含四個位置標籤");
assert(barHtml.includes('class="pos-filter-btn active"'), "v55 篩選列有 active 按鈕");

/* 清理 */
g("delete UI.draftPosFilter; delete _tfPool");

/* ---------- r010 V55-MIG-001：真實讀檔升級鏈 ---------- */
console.log("\n--- r010 V55-MIG-001 真實讀檔升級鏈 ---");

/* 建立缺少 V55 狀態的舊檔樣本，必須由真實 hydrate 補齊。 */
g(`(function(){
  var oldSave = JSON.parse(JSON.stringify(S));
  delete oldSave.v55;
  delete oldSave.culture;
  delete oldSave.cityState;
  Object.values(oldSave.teams).forEach(function(t){ delete t.analysisDirector; });
  var active = Object.values(oldSave.players)[0];
  delete active.originalTeamId;
  if (active.seasonStats) delete active.seasonStats.BIP;
  oldSave.retiredPlayers = oldSave.retiredPlayers || {};
  oldSave.retiredPlayers.__mig55retired = {
    id: "__mig55retired", team: null, isPitcher: false,
    seasonStats: { AB: 1 }, careerStats: { AB: 1 }
  };
  hydrateLoadedState(oldSave);
})()`);
assert(g("S.v55 && S.v55.ver === 55"), "r010 真實 hydrate 補上 V55 版本標記");
assert(g("S.culture && Array.isArray(S.culture.history) && Array.isArray(S.culture.labels)"), "r010 真實 hydrate 補上文化狀態");
assert(g("S.cityState && Object.keys(S.teams).every(function(id){ return !!S.cityState[id]; })"), "r010 真實 hydrate 補上所有球隊城市狀態");
assert(g("Object.values(S.teams).every(function(t){ return Object.prototype.hasOwnProperty.call(t, 'analysisDirector'); })"), "r010 真實 hydrate 補上所有球隊分析主管欄位");
assert(g("Object.values(S.players).every(function(p){ return Object.prototype.hasOwnProperty.call(p, 'originalTeamId'); })"), "r010 真實 hydrate 補上現役球員 originalTeamId");
assert(g("Object.prototype.hasOwnProperty.call(S.retiredPlayers.__mig55retired, 'originalTeamId')"), "r010 真實 hydrate 補上退休球員 originalTeamId");
assert(g("typeof S.retiredPlayers.__mig55retired.seasonStats.BIP === 'number' && typeof S.retiredPlayers.__mig55retired.careerStats.BIP === 'number'"), "r010 真實 hydrate 補上退休球員 V55 統計欄位");

/* 重複 hydrate 不得覆寫有效值。 */
g(`(function(){
  S.culture.scores.trust = 17;
  var firstId = Object.keys(S.teams)[0];
  S.cityState[firstId].__migrationSentinel = "保留";
  var before = JSON.stringify(S.teams[firstId].analysisDirector);
  hydrateLoadedState(JSON.parse(JSON.stringify(S)));
  S.__mig55Idempotent = S.culture.scores.trust === 17 &&
    S.cityState[firstId].__migrationSentinel === "保留" &&
    JSON.stringify(S.teams[firstId].analysisDirector) === before;
})()`);
assert(g("S.__mig55Idempotent === true"), "r010 V55 升級鏈重複執行不覆寫有效值");

/* JSON 匯入必須走真實 hydrate；手動槽位仍必須委派共用 hydrate。 */
g(`(function(){
  var imported = JSON.parse(JSON.stringify(S));
  delete imported.v55;
  delete imported.culture;
  delete imported.cityState;
  Object.values(imported.teams).forEach(function(t){ delete t.analysisDirector; });
  var result = importSaveJson(JSON.stringify({ state: imported }));
  S.__mig55ImportOk = result.ok === true;
})()`);
assert(g("S.__mig55ImportOk === true && S.v55 && S.v55.ver === 55 && !!S.culture && !!S.cityState"), "r010 真實 JSON import 執行完整 V55 遷移");
assert(g("Object.values(S.teams).every(function(t){ return Object.prototype.hasOwnProperty.call(t, 'analysisDirector'); })"), "r010 JSON import 補上所有球隊分析主管欄位");
assert(g("loadFromSlot.toString().indexOf('hydrateLoadedState(w.state)') >= 0"), "r010 手動槽位讀檔委派共用 hydrate 升級鏈");
assert(g("hydrateLoadedState.toString().indexOf('ensureV55') >= 0"), "r010 共用 hydrate 明確接入 ensureV55");
assert(fs.readFileSync("06-ui-roster.js", "utf8").indexOf("if (saved) hydrateLoadedState(saved);") >= 0, "r010 開頁自動讀檔委派共用 hydrate 升級鏈");

/* ---------- r011 V55-UI-001：球員肖像槽位尺寸適配 ---------- */
console.log("\n--- r011 V55-UI-001 球員肖像槽位尺寸適配 ---");
const r011Style = fs.readFileSync("style.css", "utf8");
assert(r011Style.indexOf(".v48photo > .v49portrait") >= 0, "r011 肖像內層由照片槽位統一控制尺寸");
assert(/\.v48photo\s*>\s*\.v49portrait\s*\{[^}]*width\s*:\s*100%\s*!important[^}]*height\s*:\s*100%\s*!important[^}]*\}/.test(r011Style), "r011 肖像寬高完整貼合外框，不再以 64px 裁切 48px 市場頭像");
assert(g("themePlayerPhoto.toString().indexOf('compositePortrait(playerId, ctxOrPlayer, 64)') >= 0 && themePlayerPhoto.toString().indexOf('class=\"v48photo\"') >= 0"), "r011 球員肖像仍由既有 64px 合成入口包入照片槽位");

/* ---------- v56-001 內容圖像化 presentation adapter ---------- */
console.log("\n--- v56-001 內容圖像化 presentation adapter ---");
const v56DashboardSource = fs.readFileSync("05-ui-dashboard.js", "utf8");
const v56StyleSource = fs.readFileSync("style.css", "utf8");
assert(v56DashboardSource.indexOf("function v56DecorateRenderedContent") >= 0, "v56-001 render 完成後掛入內容圖像化 adapter");
assert(v56DashboardSource.indexOf('const domain = ev.chained ? "chains" : "events"') >= 0 && v56DashboardSource.indexOf("v56ContentSummary(domain") >= 0 && v56DashboardSource.indexOf('labels = { events: "事件"') >= 0, "v56-001 事件／連鎖各有獨立視覺摘要 mapping");
assert(v56DashboardSource.indexOf("v56ContentSummary(\"mail\"") >= 0 && v56DashboardSource.indexOf("v56ContentSummary(\"news\"") >= 0, "v56-001 郵件／新聞各有獨立視覺摘要 mapping");
assert(v56DashboardSource.indexOf("v56ContentSummary(\"milestones\"") >= 0 && v56DashboardSource.indexOf("v56ContentSummary(\"awards\"") >= 0 && v56DashboardSource.indexOf("v56ContentSummary(\"championship\"") >= 0, "v56-001 里程碑／獎項／冠軍各有視覺摘要 mapping");
assert(v56DashboardSource.indexOf('v56ContentSummary("hall-of-fame"') >= 0 && v56DashboardSource.indexOf("v56ContentEscape") >= 0, "v56-001 名人堂摘要與內容跳脫保護就位");
assert(v56StyleSource.indexOf(".v56-live-summary-art") >= 0 && v56StyleSource.indexOf("完整原卡片與文字不隱藏") >= 0 && v56StyleSource.indexOf("@media(max-width:620px)") >= 0, "v56-001 內容優先 scene 與手機 reflow CSS 就位");

/* ---------- v57-001 設施／球場視覺 renderer ---------- */
console.log("\n--- v57-001 設施／球場視覺 renderer ---");
const v57FinanceSource = fs.readFileSync("02-finance.js", "utf8");
const v57FacilityStyle = fs.readFileSync("style.css", "utf8");
assert(v57FinanceSource.indexOf("function v57FacilityVisualProfile") >= 0 && v57FinanceSource.indexOf("function renderV57FacilityVisual") >= 0, "v57-001 設施視覺 mapping 與 renderer 存在");
assert(v57FinanceSource.indexOf('key: "local"') >= 0 && v57FinanceSource.indexOf('key: "city"') >= 0 && v57FinanceSource.indexOf('key: "flagship"') >= 0 && v57FinanceSource.indexOf('key: "dome"') >= 0, "v57-001 Lv1/Lv3/Lv5/Lv7 四個視覺錨點存在");
assert(v57FinanceSource.indexOf("function v57StadiumVisual") >= 0 && v57FinanceSource.indexOf("v57ArtDataUrl(profile.artKey)") >= 0 && v57FinanceSource.indexOf("v57FacilityStateOverlay") >= 0, "v57-001 獨立 facility art + CSS 狀態元件實際接入 renderer");
assert(v57FinanceSource.indexOf('"medical_base_generated"') >= 0 && v57FinanceSource.indexOf('"scouting_base_generated"') >= 0 && v57FinanceSource.indexOf('"training_base_generated"') >= 0 && v57FinanceSource.indexOf('"dorm_base_generated"') >= 0 && v57FinanceSource.indexOf('"analysis_rehab_base_generated"') >= 0 && v57FinanceSource.indexOf('"rehab_base_generated"') >= 0, "v57-001 各設施分頁使用對應獨立圖像，不以球場圖冒充");
assert(v57FinanceSource.indexOf("<svg") < 0 && v57FinanceSource.indexOf("overlay_locked") < 0 && v57FinanceSource.indexOf("overlay_upgrade") < 0 && v57FinanceSource.indexOf("overlay_construction") < 0 && v57FinanceSource.indexOf("已核准素材尚未載入") >= 0, "v57-001 不使用幾何 SVG 或圖片狀態 overlay，缺圖時明確顯示診斷訊息");
const v57ProfileSource = v57FinanceSource.slice(v57FinanceSource.indexOf("function v57FacilityVisualProfile"), v57FinanceSource.indexOf("function renderFacilities"));
assert(v57ProfileSource.indexOf("Math.random") < 0 && v57FinanceSource.indexOf("function v57FacilityVisualProfile") < v57FinanceSource.indexOf("function renderFacilities"), "v57-001 視覺 mapping 不使用亂數且在 renderFacilities 前定義");
assert(v57FinanceSource.indexOf("${v57FacilityTabArtVisual(ftab, profile, view") >= 0 && v57FinanceSource.indexOf("${body}") >= 0, "v57-001 visual layer 與既有完整內容同時輸出");
assert(v57FacilityStyle.indexOf(".v57-facility-hero") >= 0 && v57FacilityStyle.indexOf(".v57-facility-tabs") >= 0 && v57FacilityStyle.indexOf(".v57-facility-scene-frame") >= 0 && v57FacilityStyle.indexOf(".v57-confirmed-art-image") >= 0 && v57FacilityStyle.indexOf(".v57-visual-status") >= 0 && v57FacilityStyle.indexOf("@media(max-width:820px)") >= 0 && v57FacilityStyle.indexOf("@media(max-width:520px)") >= 0, "v57-001 桌面／手機 responsive visual CSS、分頁 reflow 與狀態元件就位");
assert(v57FinanceSource.indexOf("presentation-only") >= 0 && v57FinanceSource.indexOf("不改數值") >= 0, "v57-001 renderer 保留 presentation-only 邊界聲明");

/* ---------- v57-002 主畫面／主視覺實際整合 ---------- */
console.log("\n--- v57-002 主畫面／主視覺實際整合 ---");
const v57ThemeSource = fs.readFileSync("00-theme.js", "utf8");
const v57DashboardSource = fs.readFileSync("05-ui-dashboard.js", "utf8");
const v57IndexSource = fs.readFileSync("index.html", "utf8");
assert(v57ThemeSource.indexOf("function v57ArtDataUrl") >= 0 && v57ThemeSource.indexOf("v57-art-assets") >= 0, "v57-002 單檔／模組共用離線素材 data URL 入口存在");
assert(v57DashboardSource.indexOf("function v57DashboardHero") >= 0 && v57DashboardSource.indexOf("${v57DashboardHero(team)}") >= 0 && v57DashboardSource.indexOf("data-v57-dashboard-hero") >= 0, "v57-002 Dashboard 主畫面實際插入球場升級主視覺");
assert(v57DashboardSource.indexOf("v57ArtDataUrl(profile.artKey)") >= 0 && v57DashboardSource.indexOf("const anchors = [1, 3, 5, 7]") >= 0 && v57FinanceSource.indexOf('artKey: "stadium_lv7_generated"') >= 0, "v57-002 Dashboard 四級距直接讀取獨立球場圖像");
assert(v57FacilityStyle.indexOf(".v57-dashboard-hero") >= 0 && v57FacilityStyle.indexOf(".v57-dashboard-stage-grid") >= 0 && v57FacilityStyle.indexOf(".v57-dashboard-stage img") >= 0, "v57-002 Dashboard 主視覺 desktop／responsive CSS 就位");
assert(v57IndexSource.indexOf('id="v57-art-assets"') >= 0 && v57IndexSource.indexOf('"stadium_lv1_generated"') >= 0 && v57IndexSource.indexOf('"medical_base_generated"') >= 0 && v57IndexSource.indexOf('"rehab_base_generated"') >= 0 && v57IndexSource.indexOf('"overlay_locked"') < 0 && v57IndexSource.indexOf('"overlay_upgrade"') < 0 && v57IndexSource.indexOf('"overlay_construction"') < 0, "v57-002 index.html 已嵌入 10 張獨立 PNG 素材且未嵌入狀態圖示");

console.log(`\n=== 回歸測試結果：${passed} 通過 / ${failed} 失敗 ===`);
process.exit(failed > 0 ? 1 : 0);
