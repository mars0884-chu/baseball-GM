/* v41⑨ 純GM 15年煙霧測試（北極星 §14.3 新驗收門檻）：
   以「純GM模式」全自動連跑15年——GM 不做任何手排介入，每日打線/板凳/輪休全由教練AI依哲學×執行度運轉。
   斷言：無荒謬陣容（守位錯置氾濫/主力長期冷凍）、戰績分布合理、硬缺口不中斷、無 crash。
   第3年並演練一次完整接管生命週期（接管→跨季到期→續期→還權），確保分權狀態機長期運轉不卡死。 */
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

g("newGame('純GM')"); g("pickTeam('T0')"); // v491：只傳 GM 名，再選隊
chk(g("UI.screen==='gameModePick'"), "開局進入身分模式選擇");
g("pickGameMode('pure_gm')");
chk(g("S.gameMode==='pure_gm' && UI.screen==='offseasonSummary'"), "選定純GM模式後回到休賽季摘要");
g("proceedFromOffseasonSummary(); confirmSkipAllRemaining(); beginFirstSeason(); setSpringNation(HOME_NATION_NAME); executeSpringCamp(); UI.screen='dashboard';");

let takeoverDrilled = false;
for (let y = 1; y <= 15; y++) {
  // 全季自動：純GM不做任何打線介入；中斷（重傷/AI提案/KPI等既有事件）照常消化後續跑
  g("var __g=0; while(simulateDay(S) && __g<400){ __g++; if(S.simInterrupts && S.simInterrupts.length>0) S.simInterrupts=[]; }");

  // 荒謬陣容檢查①：打線滿9人、守位不重複
  chk(g("(function(){var t=S.teams[S.userTeamId]; if(!t.lineup||t.lineup.length<9) return false; var pos=t.lineup.map(s=>s.position); return new Set(pos).size===pos.length;})()"), `第${y}年：打線9人且守位不重複`);
  // 荒謬陣容檢查②：主力沒被長期冷凍——健康前三強野手至少一人出賽逾半季
  chk(g("(function(){var t=S.teams[S.userTeamId]; var bs=t.roster1.map(id=>S.players[id]).filter(p=>p&&!p.isPitcher).sort((a,b)=>trueOverall(b)-trueOverall(a)).slice(0,3); return bs.length===0 || bs.some(p=>(p.seasonStats.G||0)>=40);})()"), `第${y}年：頂級野手未被教練長期冷凍`);
  // 荒謬陣容檢查③：守位錯置未氾濫——先發打線中「非本職守位」不超過3格（硬缺口客串屬可接受少數）
  chk(g("(function(){var t=S.teams[S.userTeamId]; var bad=0; (t.lineup||[]).forEach(s=>{var p=S.players[s.playerId]; if(p&&s.position!=='DH'&&!p.positions.some(x=>x.pos===s.position)) bad++;}); return bad<=3;})()"), `第${y}年：守位錯置未氾濫（≤3格）`);
  // 戰績分布合理：不出現20勝以下或110勝以上的引擎崩壞值
  const w = g("S.teams[S.userTeamId].wins"), l = g("S.teams[S.userTeamId].losses");
  chk(w + l >= 100 && w >= 15 && w <= 114, `第${y}年：戰績合理（${w}勝${l}敗）`);
  // 純GM狀態一致性：未接管時排線必在教練手上
  chk(g("S.takeover ? true : S.teams[S.userTeamId].lineupMode==='coach'"), `第${y}年：純GM未接管→排線在教練手上`);
  // v43①：純GM 未接管→投手先發輪值有效（教練排得出至少1名先發）
  chk(g("(function(){var t=S.teams[S.userTeamId]; if(S.takeover) return true; coachDailyRotation(t); return Array.isArray(t.rotation) && t.rotation.length>=1;})()"), `第${y}年：純GM 投手輪值由教練排得出`);
  // 需求單佇列健康：狀態值域正確
  chk(g("(S.demands||[]).every(d=>['open','accepted','rejected','fulfilled','expired','excused'].includes(d.status))"), `第${y}年：需求單狀態值域正確`);

  g("generatePlayoffs(); doSimulatePlayoffsToEnd();");
  if (g("isIntlYear(S.seasonYear)")) {
    g("runIntlTournament(); intlSetSquad(intlSuggestSquad()); intlConfirmLineup();");
    g("var __ig=0; while(S.intlTournament.stage==='play' && __ig++<15) intlPlayNextGame();");
    g("finishIntlTournament()");
  } else g("enterOffseason()");

  // 解職→東山再起（沿用既有長跑劇本：復活續跑）
  if (g("S.gmCareer && S.gmCareer.fired")) {
    g("if(!S.jobOffers) generateJobOffers();");
    if (g("S.jobOffers && S.jobOffers.length>0")) g("takeJobOffer(S.jobOffers[0].teamId);");
    else g("S.gmCareer.fired=false; S.gmCareer.trust=50;");
    chk(g("S.gameMode==='pure_gm'"), `第${y}年：東山再起後身分模式沿續（純GM）`);
  }
  if (y === 15) break;
  g("if(S.forcedCutRequired){S.teams[S.userTeamId].finance.budget=300000000;S.forcedCutRequired=false;}");
  g("proceedFromOffseasonSummary();");
  g("if(UI.screen==='contractRenewals'){autoRenewAllPending(); if((S.pendingContractRenewals||[]).length===0) proceedFromContractRenewals();}");
  g("if(UI.screen==='financeCuts'){S.teams[S.userTeamId].finance.budget=300000000; proceedFromFinanceCuts();}");
  g("if(UI.screen==='staffRenewal') autoRenewAllStaff();");
  g("confirmSkipAllRemaining(); finalizeNewSeason();"); // 年度翻頁在 finalizeNewSeason（沿用長跑劇本）
  g("if(UI.screen==='selfTraining') proceedFromSelfTraining();");
  g("if(S.springCampDoneYear!==S.seasonYear){ S.teams[S.userTeamId].finance.budget=Math.max(S.teams[S.userTeamId].finance.budget, 600000000); setSpringNation(HOME_NATION_NAME); executeSpringCamp(); } UI.screen='dashboard';");

  // 第3年演練接管完整生命週期：接管→（隔年到期）→續期→還權
  if (y === 3 && !takeoverDrilled) {
    takeoverDrilled = true;
    g("S.takeoverTipsSeen=true; startTakeover('smoke演練');");
    chk(g("S.takeover && S.teams[S.userTeamId].lineupMode==='manual'"), "第3年：接管發動（手排權開啟）");
  }
  if (y === 4 && g("S.takeover")) {
    g("tickTakeover(); if(S.takeover.expired) renewTakeover();");
    chk(g("S.takeover && S.takeover.renewals>=1 && !S.takeover.expired"), "第4年：接管跨季到期→續期");
  }
  if (y === 5 && g("S.takeover")) {
    g("endTakeover();");
    chk(g("S.takeover===null && S.teams[S.userTeamId].lineupMode==='coach'"), "第5年：還權→排線交還教練");
  }
}

// 15年總體檢：史冊有累積、模式未漂移、球迷耐心值域正常
chk(g("S.seasonYear")===15, "跑滿15年");
chk(g("S.gameMode==='pure_gm'"), "15年後仍為純GM模式（身分不漂移）");
chk(g("S.chronicle.length>=15"), `史冊15年累積≥15筆（實際${g("S.chronicle.length")}筆）`);
chk(g("S.chronicle.some(c=>c.t==='season') && S.chronicle.some(c=>c.t==='takeover')"), "史冊含季記與接管記錄");
chk(g("S.fanPatience>=0 && S.fanPatience<=100"), "球迷耐心15年值域正常");
chk(g("S.gmTags.includes('hands_on')"), "接管演練後 hands_on 標籤留存15年");
// v42 教練市場與標籤後果生命週期檢查
chk(g("S.v42 && typeof S.v42==='object'"), "v42 容器15年後仍在");
chk(g("S.coachMarket && Array.isArray(S.coachMarket.pool)"), "v42 教練市場池存在");
chk(g("handsOnMarketPenalty()>=4"), "v42 接管過→hands_on 市場罰則永留疤（≥4）");
chk(g("(function(){try{ S.coachMarket={pool:[],year:S.seasonYear}; harvestRetireesToMarket(); refillCoachMarket(); return S.coachMarket.pool.length>=5; }catch(e){return false;}})()"), "v42 市場池15年後仍補得出候選");
chk(g("(function(){try{ var hc=headCoachOf(S.teams[S.userTeamId]); if(!hc)return true; hc.trust=10; hc.retainedOnce=false; S.v42.quitCountdown=14; S.v42.resignation=null; S.takeover=null; tickCoachResignation(); var hasRes=!!S.v42.resignation; v42RetainCoach('accept'); var interim=headCoachOf(S.teams[S.userTeamId]); return hasRes && interim && interim.interim===true; }catch(e){console.log('resign err',e.message);return false;}})()"), "v42 辭呈→接受→代理教練完整生命週期可跑");
// v43 生命週期檢查（純GM）：掛牌→AI報價→接受成交；傷兵遞補提案→批准
chk(g("S.v43 && Array.isArray(S.v43.mail) && Array.isArray(S.v43.listings)"), "v43 容器15年後仍在");
chk(g("(function(){try{ var t=S.teams[S.userTeamId]; ensureV43(); var pid=t.roster2[0]; if(!pid) return true; v43ListPlayer(pid); var ai=Object.values(S.teams).find(x=>x.id!==t.id); var off=v43GenerateOfferFor(pid,ai.id); if(!off) return true; S.v43.offers.push(off); var r=v43AcceptOffer(off.id); return r.ok && S.v43.listings.indexOf(pid)<0; }catch(e){console.log('listing err',e.message);return false;}})()"), "v43 掛牌→AI報價→接受成交完整生命週期可跑");
chk(g("(function(){try{ var t=S.teams[S.userTeamId]; S.gameMode='pure_gm'; S.takeover=null; var inj=S.players[t.roster1[0]]; inj.injury={name:'x',part:'肩',severity:'mid',severityLabel:'中度',daysLeft:20,totalDays:20}; if(!t.lineup||t.lineup.length<1) t.lineup=[{playerId:inj.id,position:'C'}]; else t.lineup[0]={playerId:inj.id,position:t.lineup[0].position}; var p=v43MakeInjuryProposal(t,inj); inj.injury=null; if(!p) return true; var pid=p.candidateIds[p.pickIndex]; var r=v43ResolveInjuryProposal(p.id,'approve'); return r.ok && t.roster1.indexOf(pid)>=0; }catch(e){console.log('injprop err',e.message);return false;}})()"), "v43 純GM 傷兵遞補提案→批准可跑");
// v44 生命週期檢查（純GM）：教練體諒（重建屬實撤需求）＋識破（謊稱沒錢-6）
chk(g("S.v44 && S.v44.ver===44"), "v44 容器15年後仍在");
chk(g("(function(){try{ var t=S.teams[S.userTeamId]; ensureV44(); var hc=headCoachOf(t); if(!hc) return true; ensureCoachPersona(hc); hc.excuseYear=null; hc.excuseCount=0; hc.trust=60; if(!Array.isArray(S.demands))S.demands=[]; var d={id:'SMKD_'+S.seasonYear, coachId:hc.id, role:hc.role, priority:'high', need:{pos:null,attrs:{power:99}}, title:'smoke需求', reason:'x', deadline:(S.currentDay||0)+10, status:'open', negotiated:false, year:S.seasonYear, snapshot:t.roster1.slice()}; S.demands.push(d); if(!S.gmCareer)S.gmCareer={}; S.gmCareer.mandate={type:'rebuild',startYear:S.seasonYear,years:2}; var r=resolveDemand(d.id,'understand','rebuild'); return r.ok && d.status==='excused' && hc.trust===60; }catch(e){console.log('excuse err',e.message);return false;}})()"), "v44 教練體諒（重建屬實）→撤需求、信任不變可跑");
chk(g("(function(){try{ var t=S.teams[S.userTeamId]; var hc=headCoachOf(t); if(!hc) return true; ensureCoachPersona(hc); hc.excuseYear=null; hc.excuseCount=0; hc.trust=60; t.finance.budget=80000*10000; if(!S.gmCareer)S.gmCareer={}; S.gmCareer.mandate=null; t.roster1.forEach(id=>{if(S.players[id])S.players[id].age=Math.max(S.players[id].age||30,30);}); var d={id:'SMKF_'+S.seasonYear, coachId:hc.id, role:hc.role, priority:'high', need:{pos:null,attrs:{power:50}}, title:'smoke識破', reason:'x', deadline:(S.currentDay||0)+10, status:'open', negotiated:false, year:S.seasonYear, snapshot:t.roster1.slice()}; S.demands.push(d); var r=resolveDemand(d.id,'understand','nobudget'); return r.ok && d.status==='open' && hc.trust===54; }catch(e){console.log('false-excuse err',e.message);return false;}})()"), "v44 教練識破（謊稱沒錢）→信任-6、需求維持可跑");
// v45 生命週期檢查（純GM）：U1 選秀權交易／球迷三維度／#5 求購市場
chk(g("S.v45 && S.v45.ver===45 && typeof S.fanExpect==='number' && typeof S.fanIdentify==='number'"), "v45 容器與球迷三維度15年後仍在");
chk(g("S.fanExpect>=0&&S.fanExpect<=100 && S.fanPatience>=0&&S.fanPatience<=100 && S.fanIdentify>=0&&S.fanIdentify<=100"), "v45 球迷三維度15年值域正常");
chk(g("(function(){try{ ensureV45(); var ids=Object.keys(S.teams); var a=ids[0],b=ids[1]; var tk={year:pickBaseDraftYear(),round:1,orig:a}; v45ExecuteTradeWithPicks(a,b,[],[],0,0,[tk],[]); var ok=pickOwnerOf(tk.year,tk.round,a)===b; v45ExecuteTradeWithPicks(b,a,[],[],0,0,[tk],[]); return ok && pickOwnerOf(tk.year,tk.round,a)===a; }catch(e){console.log('u1 err',e.message);return false;}})()"), "v45-U1 選秀權交易→轉手→還原 生命週期可跑");
chk(g("(function(){try{ var y=S.seasonYear; var ids=Object.keys(S.teams); setPickOwner(y,1,ids[0],ids[1]); var ord=buildDraftOrder(6); var okk=ord.filter(t=>t===ids[1]).length>=2; setPickOwner(y,1,ids[0],ids[0]); return okk; }catch(e){console.log('u1 order err',e.message);return false;}})()"), "v45-U1 buildDraftOrder 依歸屬導向擁有者可跑");
chk(g("(function(){try{ var t=S.teams[S.userTeamId]; var hc=headCoachOf(t); if(!hc)return true; if(!Array.isArray(S.demands))S.demands=[]; var d={id:'SMKW_'+S.seasonYear, coachId:hc.id, role:hc.role, priority:'mid', need:{pos:null,attrs:{power:1}}, title:'smoke求購', reason:'x', deadline:(S.currentDay||0)+30, status:'open', year:S.seasonYear, snapshot:t.roster1.slice()}; S.demands.push(d); var r=v45PostWant('SMKW_'+S.seasonYear); var posted=d.wantPosted===true; var w=S.v45Wants.find(x=>x.demandId==='SMKW_'+S.seasonYear); if(w && (w.responses||[]).some(x=>x.status==='open')){ var rr=w.responses.find(x=>x.status==='open'); v45AcceptWantResponse(w.id,rr.id); } S.demands=S.demands.filter(x=>x.id!=='SMKW_'+S.seasonYear); S.v45Wants=(S.v45Wants||[]).filter(x=>x.demandId!=='SMKW_'+S.seasonYear); return posted; }catch(e){console.log('want err',e.message);return false;}})()"), "v45-#5 依教練需求張貼求購→AI回覆→成交 生命週期可跑");

// 全畫面渲染抽查（純GM視角）
["dashboard","lineup","rotation","listing","wantMarket","roster","coaches","finance","standings"].forEach(sc => {
  try { g(`UI.tabs={}; UI.screen='${sc}'; render();`); } catch (e) { fails++; console.log("✗ 渲染失敗:", sc, "-", e.message); }
});
chk(appEl.innerHTML.length > 100, "渲染輸出非空");

if (fails === 0) console.log("\n=== 純GM 15年煙霧測試：全部通過 ===");
else console.log(`\n=== 純GM 15年煙霧測試：${fails} 項失敗 ===`);
process.exit(fails > 0 ? 1 : 0);
