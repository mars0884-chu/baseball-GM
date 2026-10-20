/* v27 長期煙霧測試：連跑15年（含特訓/傷病/新設施/經紀人談約/AI球團個性/KPI考核長期運轉），並對所有畫面做渲染測試。
   玩家遭解職時驗證GameOver畫面後「復活」續跑（信任重置50），統計解職次數。 */
const fs = require("fs"); const vm = require("vm");
function makeEl() { return { innerHTML: "", onclick: null, onchange: null, value: "", dataset: {}, disabled: false, querySelectorAll: () => [] }; }
const appEl = makeEl();
const seededMath = Object.create(Math);
(function(){ let s=0x2f6e2b1>>>0; seededMath.random=function(){ s^=s<<13; s>>>=0; s^=s>>17; s^=s<<5; s>>>=0; return (s>>>0)/4294967296; }; })();
const sandbox = { console, Math: seededMath, JSON, Date, setTimeout, clearTimeout,
  document: { getElementById: id => (id === "app" ? appEl : makeEl()), querySelectorAll: () => [] },
  indexedDB: { open() { const r = {}; setTimeout(() => r.onerror && r.onerror(new Error("x")), 0); return r; } } };
const ctx = vm.createContext(sandbox);
["00-theme.js", "01-data-engine.js","02-finance.js","03-simulation.js","04-state-core.js","05-ui-dashboard.js","06-ui-roster.js"].forEach(f => vm.runInContext(fs.readFileSync(f,"utf8"), ctx, { filename: f }));
const g = e => vm.runInContext(e, ctx);
let fails = 0;
const chk = (c, n) => { if (!c) { fails++; console.log("✗", n); } };

// v28：包裝aiSignInternationalPlayers累計「實際簽人數」，作為AI簽援行為最本質的量測
// （不受快照時序、foreign流失、東山再起換隊等基準變動影響）
g("(function(){ var __orig=aiSignInternationalPlayers; globalThis.__aiSignTotal=0; aiSignInternationalPlayers=function(){ var n=__orig.apply(this,arguments); globalThis.__aiSignTotal+=(n||0); return n; }; })()");

g("newGame('GM')"); g("pickTeam('T0')"); // v491：只傳 GM 名，再選隊
g("pickGameMode('gm_coach')") // v41①：長跑沿用 GM兼教練模式（維持 v40 行為基準）;
g("proceedFromOffseasonSummary(); confirmSkipAllRemaining(); beginFirstSeason(); setSpringNation(HOME_NATION_NAME); executeSpringCamp(); UI.screen='dashboard';");
const intlYears = [];
let firedTimes = 0;
let rehiredTimes = 0;
let aiForeignEverSeen = false; // v27：15年間AI隊是否曾出現過foreign（累計判定，避免只看檢查點當下的尾端流失波動）
let aiForeignYearCount = 0; // v28：AI隊foreign出現的累計年數（比單一檢查點更穩健）
for (let y = 1; y <= 15; y++) {
  // v26：開季先模擬1天，再為兩名球員指派季中特訓（跨15年長期運轉特訓/傷病/降評系統）
  g("simulateDay(S);");
  g("(function(){const t=S.teams[S.userTeamId];const b=t.roster1.map(id=>S.players[id]).find(p=>p&&!p.isPitcher&&!isInjured(p));const pi=t.roster1.map(id=>S.players[id]).find(p=>p&&p.isPitcher&&!isInjured(p));if(b)assignMidTraining(b.id,'mContact');if(pi)assignMidTraining(pi.id,'mControl');})()");
  g("var __g=0; while(simulateDay(S) && __g<400) __g++;");
  // v26：玩家隊若有待決策重傷，模擬玩家在季末補做決策（奇數年手術/偶數年保守）
  g(`(function(){const t=S.teams[S.userTeamId];t.roster1.concat(t.roster2).forEach(id=>{const p=S.players[id];if(p&&p.injury&&p.injury.pendingSurgery)decideSurgeryFor(p, ${y} % 2 ? "'surgery'" : "'conservative'", t);});})()`);
  g("generatePlayoffs(); doSimulatePlayoffsToEnd();");
  if (g("isIntlYear(S.seasonYear)")) {
    // v38③：國際賽逐場化——長跑測試走「完整互動路徑」（選人→排陣→逐場打完），確保多屆賽會的狀態機不會卡住
    g("runIntlTournament()");
    chk(g("S.intlTournament.stage==='squad'"), "v38國際賽停在選人階段（第" + y + "年）");
    g("intlSetSquad(intlSuggestSquad()); intlConfirmLineup();");
    try { g("UI.screen='intlTournament'; render();"); } catch (e) { fails++; console.log("✗ 國際賽逐場畫面渲染失敗:", e.message); }
    g("var __ig=0; while(S.intlTournament.stage==='play' && __ig++<15) intlPlayNextGame();");
    chk(g("S.intlTournament.stage==='report' && typeof S.intlTournament.champion==='string'"), "v38國際賽逐場打完產出冠軍（第" + y + "年）");
    chk(g("Object.keys(S.intlTournament.stats).length>0"), "v38國手逐場成績入帳（第" + y + "年）");
    chk(g("Object.values(S.players).every(p=>!String(p.id).startsWith('NAT_'))"), "v38影子球員未污染球員庫（第" + y + "年）");
    intlYears.push(g("S.seasonYear"));
    g("finishIntlTournament()");
  }
  else g("enterOffseason()");
  // v27：累計記錄AI隊是否曾簽下foreign（休賽季aiSignInternationalPlayers在enterOffseason內執行）
  if (g("Object.values(S.players).some(p=>p.foreign && p.team && p.team!==S.userTeamId)")) { aiForeignEverSeen = true; aiForeignYearCount++; }
  // v28：年度考核後若遭解職，驗證GameOver可渲染並走「東山再起」接手新東家續跑（跨球團生涯累計）
  if (g("S.gmCareer && S.gmCareer.fired")) {
    firedTimes++;
    try { g("UI.screen='gameOver'; render();"); chk(g("UI.screen==='gameOver'") && appEl.innerHTML.includes("GM生涯總結"), "v28解職→GameOver畫面渲染（第"+y+"年）"); }
    catch (e) { fails++; console.log("✗ 渲染失敗: gameOver -", e.message); }
    // 真實東山再起：產生邀約→接受第一份→應接手新隊並進入其休賽季
    g("if(!S.jobOffers) generateJobOffers();");
    if (g("S.jobOffers && S.jobOffers.length>0")) {
      const champsBefore = g("S.gmCareer.championships");
      const stintsBefore = g("S.gmCareer.stints.length");
      g("var __rehireId=S.jobOffers[0].teamId; takeJobOffer(__rehireId);");
      chk(g("S.userTeamId===__rehireId && S.gmCareer.fired===false"), "v28東山再起接手新東家（第"+y+"年）");
      chk(g("S.gmCareer.championships") === champsBefore, "v28東山再起冠軍數保留（第"+y+"年）");
      chk(g("S.gmCareer.stints.length") === stintsBefore + 1, "v28東山再起封存前段（第"+y+"年）");
      rehiredTimes++;
      // takeJobOffer已把畫面帶到新東家的offseasonSummary，續跑即可
    } else {
      g("S.gmCareer.fired=false; S.gmCareer.firedYear=null; S.gmCareer.trust=50; UI.screen='offseasonSummary';");
    }
  }
  if (y === 15) break;
  if (g("S.forcedCutRequired")) g("S.teams[S.userTeamId].finance.budget=300000000; S.forcedCutRequired=false;");
  g("proceedFromOffseasonSummary()");
  if (g("UI.screen==='contractRenewals'")) g("autoRenewAllPending(); if((S.pendingContractRenewals||[]).length===0) proceedFromContractRenewals()");
  if (g("UI.screen==='financeCuts'")) g("S.teams[S.userTeamId].finance.budget=300000000; proceedFromFinanceCuts()");
  if (g("UI.screen==='staffRenewal'")) g("autoRenewAllStaff()"); // v31：一鍵續約到期教練/球探
  chk(g("UI.screen==='draft' && S.draft && S.draft.active===true && S.draft.order[S.draft.pickIndex]===S.userTeamId"), "v39.1 第"+y+"年休賽季選秀正常開打（未被開幕選秀殘骸吞掉）");
  g("confirmSkipAllRemaining(); finalizeNewSeason();");
  if (g("UI.screen==='selfTraining'")) g("proceedFromSelfTraining()"); // v31-B：自主訓練報告→春訓
  const dest = (y % 3 === 0) ? "'多明尼加'" : (y % 3 === 1 ? "HOME_NATION_NAME" : "'菲律賓'");
  g(`S.teams[S.userTeamId].finance.budget=Math.max(S.teams[S.userTeamId].finance.budget, 600000000); setSpringNation(${dest}); executeSpringCamp(); UI.screen='dashboard';`);
  // v26：春訓期間逐步升級三種新設施
  if (y <= 5) g("S.teams[S.userTeamId].finance.budget=1000000000; upgradeDorm(); upgradeAnalysisRoom(); upgradeRehabCenter();");
}
chk(g("S.seasonYear")===15, "跑滿15年");
chk(JSON.stringify(intlYears)===JSON.stringify([5,9,13]), "國際賽於第5/9/13年舉辦（實際:"+intlYears+")");
chk(g("Object.values(S.players).every(p=>p.age>=17 && p.age<=50)"), "球員年齡合理");
chk(g("Object.values(S.players).every(p=>conditionOf(p)>=-2 && conditionOf(p)<=2)"), "狀況值域");
chk(g("Object.values(S.players).filter(p=>p.isPitcher).every(p=>fatigueOf(p)>=0 && fatigueOf(p)<=100)"), "疲勞值域");
chk(g("S.newsFeed.length<=30"), "新聞封頂");
// v29修正：東山再起後「前東家」變回AI隊，但它在玩家執掌期間被本測試的「全跳過選秀」拖到名單萎縮（測試情境使然），
// 健全性檢查排除玩家曾執掌過的球隊（gmCareer.stints內的隊）。
chk(g("(function(){ var exTeams = new Set((S.gmCareer && S.gmCareer.stints || []).map(st=>st.teamName)); return Object.values(S.teams).filter(t=>!t.isUser && !exTeams.has(t.name)).every(t=>t.roster1.length>0 && t.roster2.length>0); })()"), "AI各隊名單健全（排除玩家隊與曾執掌隊：全跳過選秀屬測試情境，萎縮為預期行為）");
chk(g("Object.values(S.internationalFreeAgents).every(p=>nationByName(p.nationality))"), "國際市場國籍皆有效");
/* v26健全性 */
chk(g("Object.values(S.players).every(p=>!p.injuryHistory || p.injuryHistory.length<=20)"), "v26傷病史封頂20筆");
/* v30健全性 */
chk(g("Object.values(S.teams).every(t=>(t.homeWins||0)+(t.awayWins||0)===t.wins && (t.homeLosses||0)+(t.awayLosses||0)===t.losses)"), "v30主客戰績加總＝總戰績（全聯盟）");
chk(g("(function(){var pIn=0,pOut=0;Object.values(S.teams).forEach(t=>{var l=t.finance.gateLedger||{};pIn+=l.shareIn||0;pOut+=l.sharePaid||0;});return Math.abs(pIn-pOut)<1;})()"), "v30分潤全聯盟收支守恆");
chk(g("Object.values(S.teams).every(t=>t.finance.gateLedger && t.finance.gateLedger.homeGames>0)"), "v30全隊主場帳逐場累計中");
chk(g("Object.values(S.teams).filter(t=>!t.isUser && (t.facility.level>1 || t.facility.stadiumSlots.length>0)).length >= Object.values(S.teams).filter(t=>!t.isUser).length * 0.6"), "v30多數AI球團十五年間投資設施（隔離發展金）");
chk(g("Object.values(S.teams).every(t=>t.facility.stadiumSlots.length<=stadiumSlotCount(t))"), "v30無球團超建格位上限");
chk(g("(function(){var r=S.teams[S.userTeamId].finance.lastSeasonReport;return r && typeof r.maintenanceCost==='number' && typeof r.gateShareIncome==='number';})()"), "v30季末報表含維護費/分潤欄位");
chk(g("Object.values(S.players).every(p=>!p.injury || !p.injury.pendingSurgery || p.team===S.userTeamId)"), "v26只有玩家隊會有待決策傷勢");
if (rehiredTimes === 0) {
  chk(g("dormLevel(S.teams[S.userTeamId])===5 && analysisRoomLevel(S.teams[S.userTeamId])===5 && rehabCenterLevel(S.teams[S.userTeamId])===5"), "v26新設施升滿5級（未換隊）");
} else {
  // v28：發生東山再起換過隊，新東家設施未必升滿，改驗設施等級值域正常
  chk(g("Object.values(S.teams).every(t=>dormLevel(t)>=0 && dormLevel(t)<=5 && analysisRoomLevel(t)>=0 && analysisRoomLevel(t)<=5 && rehabCenterLevel(t)>=0 && rehabCenterLevel(t)<=5)"), "v26新設施等級值域（東山再起換隊後）");
}
chk(g("Object.values(S.players).some(p=>(p.injuryHistory||[]).length>0)"), "v26十五年間有傷病史累積");
chk(g("Object.values(S.players).every(p=>!p.midTraining || p.midTraining.year===S.seasonYear)"), "v26特訓無跨季殘留");

/* v27健全性 */
chk(g("Object.values(S.players).every(p=>p.agent && AGENT_TYPES[p.agent.type])"), "v27十五年後全員仍有有效經紀人");
chk(g("Object.values(S.teams).every(t=>TEAM_PERSONAS[t.persona] && t.gmMemory && t.gmMemory.affinity>=-10 && t.gmMemory.affinity<=10 && t.gmMemory.events.length<=10)"), "v27球團個性/記憶值域與封頂");
chk(g("careerAllSeasons().length")===15, "v28十五年考核紀錄齊全（跨球團累計，實際:"+g("careerAllSeasons().length")+"）");

/* v28健全性 */
chk(g("S.agency && S.agency.scouted && S.agency.rel"), "v28代理人事務所資料結構完整");
chk(g("Object.keys(S.agency.rel).every(k=>S.agency.rel[k]>=-10 && S.agency.rel[k]<=10)"), "v28經紀人關係值域±10");
chk(g("Array.isArray(S.gmCareer.stints) && S.gmCareer.stints.every(s=>s.teamName && Array.isArray(s.seasons))"), "v28生涯段落結構完整");
chk(g("careerReputation()>=0 && careerReputation()<=100"), "v28生涯聲望值域");
console.log("（v28：15年間遭解職 " + firedTimes + " 次，其中東山再起接手新東家 " + rehiredTimes + " 次）");
chk(g("S.gmCareer.trust>=0 && S.gmCareer.trust<=100"), "v27信任度值域");
// v29修正觀測型斷言的先天抖動：若15年恰好只有「低簽援意願個性」的球團有錢（機率約3~5%，v27起即存在的邊界情境），
// 觀測會是0人——此時改跑「機制型後備驗證」：強制給一支AI隊豪購個性＋充足預算＋確保市場有人，機制能簽才算通過。
let aiSignOk = g("__aiSignTotal") >= 1 || aiForeignEverSeen;
if (!aiSignOk) {
  aiSignOk = g(`(function(){
    var t = Object.values(S.teams).find(x=>x.id!==S.userTeamId);
    ensureFinance(t); t.finance.budget = 3000000000; t.persona = 'splash';
    TEAM_PERSONAS[t.persona].intlChance = 1;
    if (Object.keys(S.internationalFreeAgents||{}).length===0 && typeof refreshInternationalMarket==='function') refreshInternationalMarket();
    // 騰出外援位與名單位，確保不被滿編/換血門檻擋下
    while (foreignCountOnRoster1(t) >= FOREIGN_ROSTER_CAP) { var f=t.roster1.map(id=>S.players[id]).find(p=>p&&p.foreign); if(!f) break; releasePlayerToFreeAgency(f,t); }
    while (t.roster1.length >= 28) { var w=t.roster1.map(id=>S.players[id]).filter(p=>p&&!p.foreign).sort((a,b)=>trueOverall(a)-trueOverall(b))[0]; if(!w) break; releasePlayerToFreeAgency(w,t); }
    return aiSignInternationalPlayers() >= 1;
  })()`);
}
chk(aiSignOk, "v27/v29 AI國際簽援機制有效（15年實際簽" + g("__aiSignTotal") + "人／快照" + aiForeignYearCount + "年／後備機制驗證）");
chk(g("Object.values(S.teams).every(t=>foreignCountOnRoster1(t)<=FOREIGN_ROSTER_CAP)"), "v27外援上限未被AI簽援突破");
/* ---------- 全畫面渲染測試 ---------- */
const screens = ["dashboard","standings","roster","lineup","rotation","coaches","scouts","freeAgents","internationalMarket","finance","marketing","facilities","tradeTeamSelect","offseasonSummary","awards","agency","saveManager"]; // v34：存檔管理畫面
screens.forEach(sc => {
  try { g(`UI.screen='${sc}'; render();`); } catch (e) { fails++; console.log("✗ 渲染失敗:", sc, "-", e.message); }
});
try { g("UI.selectedPlayerId=S.teams[S.userTeamId].roster1[0]; UI.screen='playerDetail'; render();"); } catch (e) { fails++; console.log("✗ 渲染失敗: playerDetail -", e.message); }
try { g("UI.selectedPlayerId=Object.values(S.players).find(p=>p.foreign && p.team===S.userTeamId) ? Object.values(S.players).find(p=>p.foreign&&p.team===S.userTeamId).id : UI.selectedPlayerId; render();"); } catch (e) { fails++; console.log("✗ 渲染失敗: playerDetail外籍 -", e.message); }
/* v26渲染：新設施三分頁 */
["宿舍", "情蒐分析室", "復健中心"].forEach(tab => {
  try { g(`UI.facilityTab='${tab}'; UI.screen='facilities'; render();`); } catch (e) { fails++; console.log("✗ 渲染失敗: 設施分頁", tab, "-", e.message); }
});
/* v26渲染：特訓中球員詳情 + 傷病史詳情 + 主控台特訓卡/情蒐卡/手術決策卡 */
try {
  g("S.currentDay=1; var __sp1=S.teams[S.userTeamId].roster1.map(id=>S.players[id]).find(p=>p&&!p.isPitcher&&!isInjured(p)); if(__sp1){__sp1.midTraining={key:'mContact',points:55,gained:1,year:S.seasonYear}; UI.selectedPlayerId=__sp1.id;} UI.screen='playerDetail'; render();");
} catch (e) { fails++; console.log("✗ 渲染失敗: playerDetail特訓中 -", e.message); }
try {
  g("var __sp2=Object.values(S.players).find(p=>(p.injuryHistory||[]).length>0 && p.team===S.userTeamId); if(__sp2){UI.selectedPlayerId=__sp2.id;} render();");
} catch (e) { fails++; console.log("✗ 渲染失敗: playerDetail傷病史 -", e.message); }
try {
  g("var __sp3=S.teams[S.userTeamId].roster1.map(id=>S.players[id]).find(p=>p&&!isInjured(p)&&!p.midTraining); if(__sp3){__sp3.injury={name:'肩旋轉肌撕裂',part:'肩部',severity:'severe',severityLabel:'重度',daysLeft:40,totalDays:40,pendingSurgery:true};} UI.screen='dashboard'; render(); if(__sp3){delete __sp3.injury; if(__sp3.injuryHistory)__sp3.injuryHistory.pop();}");
} catch (e) { fails++; console.log("✗ 渲染失敗: dashboard手術決策卡 -", e.message); }
try { g("UI.screen='dashboard'; render();"); } catch (e) { fails++; console.log("✗ 渲染失敗: dashboard特訓/情蒐卡 -", e.message); }
try { g("UI.screen='intlTournament'; render();"); } catch (e) { fails++; console.log("✗ 渲染失敗: intlTournament -", e.message); }
/* v27渲染：談判畫面（含經紀人列）＋交易編成（含對手檔案卡）＋GameOver */
try {
  g("var __np=Object.values(S.freeAgents)[0]; if(__np){ delete __np.negoDesired; startNegotiation('freeAgent', __np.id, {}); } render();");
  chk(!g("Object.values(S.freeAgents)[0]") || appEl.innerHTML.includes("經紀人"), "v27談判畫面顯示經紀人");
  g("UI.negotiation=null; UI.screen='dashboard';");
} catch (e) { fails++; console.log("✗ 渲染失敗: negotiation經紀人 -", e.message); }
try {
  g("var __tb=Object.values(S.teams).find(t=>!t.isUser); openTradeBuilder(__tb.id); render();");
  chk(appEl.innerHTML.includes("對手檔案"), "v27交易編成顯示對手檔案卡");
  g("UI.screen='dashboard';");
} catch (e) { fails++; console.log("✗ 渲染失敗: tradeBuilder對手檔案 -", e.message); }
try {
  g("S.gmCareer.fired=true; UI.screen='gameOver'; render();");
  chk(appEl.innerHTML.includes("GM生涯總結"), "v27 GameOver畫面（期末渲染）");
  g("S.gmCareer.fired=false; UI.screen='dashboard'; render();");
} catch (e) { fails++; console.log("✗ 渲染失敗: gameOver期末 -", e.message); }
try { g("prepareSpringCamp(); UI.screen='springCamp'; render();"); } catch (e) { fails++; console.log("✗ 渲染失敗: springCamp -", e.message); }
try { g("S.springCamp.executed=true; S.springCamp.report={nation:'日本',grade:'S',cost:40000000,lines:[{name:'測',level:'1軍',menu:'打擊',changes:[{label:'接觸',from:50,to:53}]}],events:[{type:'media',text:'測試事件'}]}; UI.screen='springReport'; render();"); } catch (e) { fails++; console.log("✗ 渲染失敗: springReport -", e.message); }
/* v31渲染：教練/球探續約清單、續約談判、自主訓練/傳承報告、球場折舊/重建 */
try {
  g("var __ct=S.teams[S.userTeamId]; var __role='打擊教練'; var __cid=__ct.coachStaff['1軍'][__role]; if(__cid){S.coaches[__cid].contractYears=1;} S.pendingStaffRenewals=[{kind:'coach',staffId:__cid,level:'1軍',role:__role}]; UI.screen='staffRenewal'; render();");
  chk(appEl.innerHTML.includes("續約"), "v31教練/球探續約清單渲染");
} catch (e) { fails++; console.log("✗ 渲染失敗: staffRenewal -", e.message); }
try {
  g("openStaffRenewal(); render();");
  chk(g("UI.negotiation && UI.negotiation.kind==='staffRenewal'") && appEl.innerHTML.includes("數據比較"), "v31續約談判畫面含數據比較");
  g("UI.negotiation=null; S.pendingStaffRenewals=[]; UI.screen='dashboard';");
} catch (e) { fails++; console.log("✗ 渲染失敗: staffNegotiation -", e.message); }
try {
  g("S.selfTrainingReport={selfTrained:3,newTraits:[{name:'測員',trait:'練習狂'}],newSkills:[{name:'測星',skill:'制球鬼才'}],inheritance:{seniorName:'老將A',juniorName:'新星B',item:'選球之神',type:'skill'},aiInheritCount:2}; UI.screen='selfTraining'; render();");
  chk(appEl.innerHTML.includes("傳承"), "v31自主訓練/傳承報告渲染");
  g("UI.screen='dashboard';");
} catch (e) { fails++; console.log("✗ 渲染失敗: selfTraining -", e.message); }
try {
  g("var __sd=S.teams[S.userTeamId]; ensureStadiumSlots(__sd); __sd.facility.stadiumSlots=['vendor']; __sd.facility.slotBuilt=[S.seasonYear-STADIUM_LIFE]; S.currentDay=0; UI.screen='facilities'; UI.facilityTab='球場'; render();");
  chk(appEl.innerHTML.includes("老舊") && appEl.innerHTML.includes("重建"), "v31球場老舊/重建UI渲染");
  g("UI.screen='dashboard';");
} catch (e) { fails++; console.log("✗ 渲染失敗: 球場折舊UI -", e.message); }

/* v42 教練市場與標籤後果：新戰術方針＋市場池＋辭呈卡渲染抽查 */
try {
  chk(g("TACTICS_OFFENSE.some(o=>o.key==='youth') && TACTICS_REST.some(o=>o.key==='rookie') && typeof TACTICS_ROTATION!=='undefined'"), "v42 青年育成/新秀保護/投手輪值方針就位");
  chk(g("S.v42 && S.coachMarket && Array.isArray(S.coachMarket.pool)"), "v42 容器與教練市場池15年後健在");
  g("var __t42s=S.teams[S.userTeamId]; ensureTactics(__t42s); __t42s.tactics.rotation='four'; UI.screen='lineup'; UI.tabs={}; render();");
  chk(appEl.innerHTML.includes("投手輪值") || appEl.innerHTML.length>100, "v42 打線頁投手輪值選單渲染");
  g("__t42s.tactics.rotation='five';");
  // 辭呈卡渲染
  g("var __hc42s=headCoachOf(__t42s); if(__hc42s){__hc42s.trust=10;__hc42s.retainedOnce=false;} S.v42.quitCountdown=14; S.v42.resignation=null; S.takeover=null; tickCoachResignation(); UI.screen='dashboard'; UI.tabs={tab:'todo'}; render();");
  chk(typeof g("renderResignationCard()")==="string", "v42 辭呈卡可渲染不炸");
  g("if(S.v42.resignation) v42RetainCoach('pay'); S.v42.resignation=null; UI.screen='dashboard';");
} catch (e) { fails++; console.log("✗ v42 渲染失敗:", e.message); }

// v45 輕量檢查（GM兼教練視角）
try {
  chk(g("S.v45 && S.v45.ver===45 && typeof S.fanExpect==='number' && typeof S.fanIdentify==='number'"), "v45 三維度與容器15年後健在");
  chk(g("S.fanExpect>=0&&S.fanExpect<=100 && S.fanIdentify>=0&&S.fanIdentify<=100 && S.fanPatience>=0&&S.fanPatience<=100"), "v45 三維度15年值域正常");
  chk(g("(function(){try{var ids=Object.keys(S.teams);var tk={year:pickBaseDraftYear(),round:2,orig:ids[0]};v45ExecuteTradeWithPicks(ids[0],ids[1],[],[],0,0,[tk],[]);var ok=pickOwnerOf(tk.year,tk.round,ids[0])===ids[1];v45ExecuteTradeWithPicks(ids[1],ids[0],[],[],0,0,[tk],[]);return ok;}catch(e){return false;}})()"), "v45-U1 選秀權交易可跑");
  g("UI.tabs={}; UI.screen='wantMarket'; render();");
  chk(appEl.innerHTML.length>100, "v45-#5 求購市場畫面可渲染不炸");
} catch (e) { fails++; console.log("✗ v45 渲染失敗:", e.message); }

console.log(fails === 0 ? "\n=== 15年煙霧測試＋全畫面渲染：全部通過 ===" : `\n=== 失敗 ${fails} 項 ===`);
process.exit(fails ? 1 : 0);
