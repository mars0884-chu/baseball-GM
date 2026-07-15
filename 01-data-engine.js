"use strict";
/* ====================================================================
   職棒GM經營模擬遊戲 - 第1階段 MVP
   ==================================================================== */

/* ---------- 資料池 ---------- */
const SURNAMES = ["陳","林","黃","張","李","王","吳","劉","蔡","楊","許","鄭","謝","郭","洪","曾","邱","廖","賴","徐","周","葉","蘇","莊","呂","江","何","蕭","羅","高","潘","簡","朱","鍾","游","詹","方","施","沈","余","趙","顏","盧","梁","鄧","侯","曹","彭","巫","董","藍","古","阮","馮","姚","石","傅","皮","韓","袁","唐","孫","陸","田","康","龍","尹","卜","齊","錢","熊","秦","白","段","席","荊","章","甄","童","焦","苗","幸","柯","丁","涂","歐陽"];
const GIVEN_CHARS = ["建","志","明","宇","翔","傑","豪","軒","睿","承","恩","澤","廷","鈞","逸","陽","昇","霖","楷","岳","修","哲","彥","誠","崇","展","弘","儒","冠","齊","秉","尚","家","品","柏","維","政","育","昌","賢","泰","華","文","武","世","忠","孝","仁","義","禮","智","信","元","亨","利","貞","安","平","康","順","富","貴","榮","強","勇","剛","毅","力","勤","儉","節","約","青","風","嘉","宏","偉","國","慶","春","輝","堂","邦"];
const CITY_NAMES = ["靖安","臨海","曲江","永昌","明陽","天啟","龍城","星野","雲夢","東寧","嘉禾","瑞港","金川","玄武","朝陽","鳳鳴","銀灘","青川","望海","磐石"];
const MASCOTS = ["猛虎","雄鷹","蒼龍","獵鯊","烈焰","疾風","巨獅","戰狼","海豚","金鵰","迅豹","烽火","白鯨","遊俠","破浪","銀狐","赤焰","雷霆","蒼狼","皇鷲"];
const LEAGUE_PREFIX = ["至高","寰宇","星辰","東方","榮耀","傳奇","王牌","巔峰"];

/* ====================================================================
   第9階段：國際化。虛構4個海外國家，各自有獨立的音譯姓名庫（風格區隔），
   用來生成國際自由球員市場的外籍球員；本土聯盟與選秀維持不變，不混入外籍新秀。
   ==================================================================== */
/* ====================================================================
   v25 世界國家系統：共40國（現實20國＋虛構20國，含玩家母國「青雲國」）。
   國家分級 S/A/B/C/D 決定：春訓費用與專長強度、國際市場球員素質、國際賽事實力。
   S/A/B級（共24國）具備完整互動內容（春訓專長、特殊事件、名門友誼）；
   C/D級提供國籍來源、國際市場與國際賽事參賽，互動內容較簡。
   ==================================================================== */
const NAME_POOLS = {
  jp: { surnames: ["山本","鈴木","佐藤","田中","渡邊","伊藤","加藤","山田","松本","中村","小林","高橋","大谷","近藤","岡田","佐佐木"], givens: ["一郎","健太","大輔","直樹","翔平","拓也","涼介","颯太","悠斗","蓮","隼人","陸","和真","慎之助"] },
  kr: { surnames: ["金","李","朴","崔","鄭","姜","趙","尹","張","林","申","韓"], givens: ["民俊","志勳","東赫","俊昊","賢宇","成範","炳浩","泰均","光鉉","珉豪","載榮","勝煥"] },
  latin: { surnames: ["羅德里奎茲","賈西亞","馬丁尼茲","岡薩雷斯","埃爾南德茲","桑切斯","拉米雷茲","佩雷茲","托雷斯","弗洛雷斯","狄亞茲","古茲曼"], givens: ["卡洛斯","米格爾","荷西","路易斯","拉斐爾","迭戈","阿爾貝托","馬里奧","安德烈","恩里克","費南多","璜"] },
  anglo: { surnames: ["強森","史密斯","威廉斯","布朗","瓊斯","米勒","戴維斯","威爾遜","泰勒","安德森","哈里斯","湯普森"], givens: ["麥可","萊恩","凱文","布萊恩","傑森","崔維斯","柯林","喬丹","奧斯汀","泰","查德","德魯"] },
  slavic: { surnames: ["伊凡諾夫","彼得羅夫","索科洛夫","科瓦爾","沃爾科夫","莫洛佐夫","巴甫洛夫","尼基丁","舒克林","札哈羅夫","諾瓦克","霍拉克"], givens: ["安德烈","狄米崔","尼可萊","瓦西里","伊格爾","馬克西姆","羅曼","亞歷山大","帕維爾","葉夫根尼","雅羅斯","米蘭"] },
  dutch: { surnames: ["范德堡","德容","范戴克","揚森","巴克","克魯伊","斯洛特","韋斯特"], givens: ["尤里安","巴斯","凱文","史蒂芬","盧克","丹尼","提姆","尼克"] },
  italian: { surnames: ["羅西","費拉里","埃斯波西托","里奇","科隆博","馬里諾","格雷科","布魯諾"], givens: ["盧卡","馬可","亞歷山卓","喬凡尼","安東尼奧","法比歐","達里歐","恩佐"] },
  german: { surnames: ["穆勒","施密特","施奈德","費雪","韋伯","華格納","貝克","霍夫曼"], givens: ["盧卡斯","菲利克斯","約拿斯","馬克斯","保羅","里昂","提姆","尼可"] },
  filipino: { surnames: ["桑托斯","雷耶斯","克魯茲","巴蒂斯塔","加西亞","門多薩","拉莫斯","托倫蒂諾"], givens: ["喬瑟夫","馬克","約翰","保羅","卡洛","丹尼爾","雷納多","艾里克"] },
  islander: { surnames: ["卡瓦納","塔瑪希","馬努卡","拉羅亞","提亞雷","努伊卡","歐塔尼亞","莫阿納"], givens: ["卡希","提摩","馬努","萊卡","托瓦","尼豪","阿雷","基奧"] },
  nordic: { surnames: ["約翰森","尼爾森","林德堡","埃里克森","索倫森","哈爾沃森","伯格曼","奧爾森"], givens: ["拉斯","埃米爾","古斯塔","奧斯卡","索倫","馬格努斯","埃里克","維果"] },
  desert: { surnames: ["哈桑","納西爾","卡里姆","法里德","阿茲哈","薩利姆","拉希德","賈邁勒"], givens: ["奧馬爾","尤瑟夫","卡利","塔里克","哈立德","薩米爾","納迪姆","法赫德"] },
  chinese: null // null＝沿用本土姓名庫（generateChineseName）
};

const HOME_NATION_NAME = "青雲國"; // 玩家母國（虛構）：聯盟所在地，本土球員國籍統一以此顯示

// 春訓菜單鍵值（與各國專長對應）：p開頭＝投手項目、b開頭＝野手項目
// pVelocity球速球威 pBreaking變化控球 pStamina體力 pComposure抗壓
// bContact打擊 bPower長打 bBunt觸擊 bSpeed速度盜壘 bDefense守備臂力 bEye選球 bComposure抗壓 bStamina體力
const NATIONS = [
  // ---- S級（4國）----
  { name: "美國", grade: "S", real: true, style: "anglo", specialties: ["pVelocity","bPower"], flavor: "世界棒球最高殿堂，火球與重砲的原鄉" },
  { name: "日本", grade: "S", real: true, style: "jp", specialties: ["pBreaking","bBunt","bDefense"], flavor: "細膩小球與變化球王國，基本功世界第一" },
  { name: "多明尼加", grade: "S", real: true, style: "latin", specialties: ["bPower","bSpeed"], flavor: "加勒比海的天才產地，爆發力驚人" },
  { name: "北原聯邦", grade: "S", real: false, style: "anglo", specialties: ["pVelocity","bPower","bStamina"], flavor: "大陸型棒球強權，以力量棒球著稱" },
  // ---- A級（8國）----
  { name: "韓國", grade: "A", real: true, style: "kr", specialties: ["pBreaking","bContact"], flavor: "拚戰精神旺盛，投打均衡的東亞勁旅" },
  { name: "台灣", grade: "A", real: true, style: "chinese", specialties: ["bBunt","bDefense","pBreaking"], flavor: "熱情的棒球之島，小球戰術與守備素質出色" },
  { name: "古巴", grade: "A", real: true, style: "latin", specialties: ["bSpeed","bPower"], flavor: "傳統業餘霸主，天賦滿溢的紅色閃電" },
  { name: "委內瑞拉", grade: "A", real: true, style: "latin", specialties: ["bContact","bDefense"], flavor: "游擊手搖籃，內野守備藝術的代名詞" },
  { name: HOME_NATION_NAME, grade: "A", real: false, style: "chinese", specialties: ["bBunt","bContact"], flavor: "你的母國：職棒20隊的棒球熱土" },
  { name: "赤陽國", grade: "A", real: false, style: "jp", specialties: ["pBreaking","bBunt","bDefense"], flavor: "以精密控球與變化球聞名的島國" },
  { name: "藍岸共和國", grade: "A", real: false, style: "latin", specialties: ["bContact","bSpeed"], flavor: "熱帶海岸的打擊天堂，跑壘風格奔放" },
  { name: "白熊聯盟", grade: "A", real: false, style: "slavic", specialties: ["pComposure","bComposure","bDefense"], flavor: "嚴寒鍛鍊出的鋼鐵意志與強肩" },
  // ---- B級（12國）----
  { name: "墨西哥", grade: "B", real: true, style: "latin", specialties: ["bContact"], flavor: "聯盟歷史悠久，打擊技巧扎實" },
  { name: "波多黎各", grade: "B", real: true, style: "latin", specialties: ["bSpeed"], flavor: "小島大能量，捕手與快腿輩出" },
  { name: "巴拿馬", grade: "B", real: true, style: "latin", specialties: ["bDefense"], flavor: "運河之國，守備意識細膩" },
  { name: "加拿大", grade: "B", real: true, style: "anglo", specialties: ["pVelocity"], flavor: "北國力量派，投手體格出眾" },
  { name: "荷蘭", grade: "B", real: true, style: "dutch", specialties: ["bDefense","bPower"], flavor: "歐洲棒球先驅，加勒比屬地人才濟濟" },
  { name: "澳洲", grade: "B", real: true, style: "anglo", specialties: ["pVelocity","bPower"], flavor: "南半球勁旅，體能條件優異" },
  { name: "金沙王國", grade: "B", real: false, style: "desert", specialties: ["bSpeed","pStamina"], flavor: "沙漠綠洲的速度信仰，耐力驚人" },
  { name: "翡翠海聯邦", grade: "B", real: false, style: "islander", specialties: ["bContact","bBunt"], flavor: "群島聯邦，巧打與觸擊的藝術家" },
  { name: "南嶼群島", grade: "B", real: false, style: "islander", specialties: ["bSpeed","bStamina"], flavor: "赤道陽光下的飛毛腿之鄉" },
  { name: "烈日邦聯", grade: "B", real: false, style: "desert", specialties: ["pVelocity","pStamina"], flavor: "高溫淬鍊的剛猛投手群" },
  { name: "蒼穹國", grade: "B", real: false, style: "chinese", specialties: ["pBreaking","bEye"], flavor: "高原棒球學院派，講究配球與選球" },
  { name: "極光公國", grade: "B", real: false, style: "nordic", specialties: ["pComposure","bComposure"], flavor: "極夜中修行的心理素質大師" },
  // ---- C級（10國）----
  { name: "哥倫比亞", grade: "C", real: true, style: "latin", specialties: ["bSpeed"], flavor: "新興棒球國度，速度型好手漸多" },
  { name: "尼加拉瓜", grade: "C", real: true, style: "latin", specialties: ["bContact"], flavor: "中美洲的棒球熱情之地" },
  { name: "義大利", grade: "C", real: true, style: "italian", specialties: ["bDefense"], flavor: "歐洲老牌棒球協會，守備風格優雅" },
  { name: "中國", grade: "C", real: true, style: "chinese", specialties: ["bBunt"], flavor: "發展中的巨大市場，基本功導向" },
  { name: "捷克", grade: "C", real: true, style: "slavic", specialties: ["pBreaking"], flavor: "歐洲新勢力，土產變化球投手崛起" },
  { name: "銀月王國", grade: "C", real: false, style: "nordic", specialties: ["bEye"], flavor: "月光書院的選球哲學" },
  { name: "雪嶺聯邦", grade: "C", real: false, style: "slavic", specialties: ["pStamina"], flavor: "高山雪訓打造的長程體能" },
  { name: "風岬國", grade: "C", real: false, style: "islander", specialties: ["bSpeed"], flavor: "強風海岬練出的疾風跑者" },
  { name: "珊瑚環礁國", grade: "C", real: false, style: "islander", specialties: ["bBunt"], flavor: "環礁沙地上的小球職人" },
  { name: "曙光合眾國", grade: "C", real: false, style: "anglo", specialties: ["pVelocity"], flavor: "新興聯邦，速球養成計畫起步中" },
  // ---- D級（6國）----
  { name: "德國", grade: "D", real: true, style: "german", specialties: ["pBreaking"], flavor: "棒球尚屬小眾，但訓練一板一眼" },
  { name: "菲律賓", grade: "D", real: true, style: "filipino", specialties: ["bSpeed"], flavor: "籃球國度裡的棒球火種" },
  { name: "黑森公國", grade: "D", real: false, style: "german", specialties: ["pStamina"], flavor: "森林小國，苦練型球風" },
  { name: "霧谷國", grade: "D", real: false, style: "chinese", specialties: ["bEye"], flavor: "終年霧鎖的山谷，練就一雙好眼" },
  { name: "沙洲聯盟", grade: "D", real: false, style: "desert", specialties: ["bStamina"], flavor: "游牧邦聯，體能至上" },
  { name: "星港城邦", grade: "D", real: false, style: "chinese", specialties: ["bContact"], flavor: "貿易港城邦，棒球剛剛萌芽" }
];
function nationByName(name) { return NATIONS.find(n => n.name === name) || null; }
const NATION_GRADE_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4 };
const NATION_SPRING_COST_WAN = { S: 4000, A: 3000, B: 2000, C: 1200, D: 700 }; // 海外春訓整隊費用（萬元）；母國免費
function springCostForNation(nation) { return nation.name === HOME_NATION_NAME ? 0 : NATION_SPRING_COST_WAN[nation.grade]; }
function nationDisplay(p) { return p.foreign ? p.nationality : HOME_NATION_NAME; }
// 相容舊命名：外籍球員來源池＝母國以外的39國
const FOREIGN_NATIONS = NATIONS.filter(n => n.name !== HOME_NATION_NAME);
function generateForeignName(nation) {
  const pool = NAME_POOLS[nation.style];
  if (!pool) return generateChineseName();
  return choice(pool.surnames) + choice(pool.givens);
}
// 外籍球員以即戰力為主（年齡較高），透過國際自由球員市場加入球隊，不參加本土選秀。
// v25起：國際賽事改為「季末制」（季後賽與頒獎之後、休賽季之前舉辦），
// 舊制「季中徵召、缺陣10~18場」已全面廢除，球員不會再於球季中離隊。
function generateForeignPlayer(elite, forcedNation) {
  const nation = forcedNation || choice(FOREIGN_NATIONS);
  const isPitcher = Math.random() < 0.45;
  const p = isPitcher ? generatePitcher(null, null) : generateBatter(null, null);
  p.name = generateForeignName(nation);
  p.nationality = nation.name;
  p.foreign = true;
  p.age = randInt(22, 34);
  // 國家分級影響球員素質：等級越高的棒球強國，輸出的球員平均能力與潛力越好
  const gradeShift = { S: 6, A: 4, B: 1, C: -2, D: -5 }[nation.grade] || 0;
  if (gradeShift !== 0) {
    const keys = p.isPitcher ? ["velocity", "control", "stamina"] : ["contact", "power", "eye", "fielding", "speed"];
    keys.forEach(k => { p[k] = clamp(p[k] + gradeShift + randInt(-2, 2), 20, 95); });
    if (p.isPitcher) p.pitches.forEach(pt => { pt.stuff = clamp(pt.stuff + gradeShift, 20, 95); pt.control = clamp(pt.control + gradeShift, 20, 95); });
    p.potential = clamp(p.potential + gradeShift, 24, 93);
  }
  // ⑦獨家人選：球探獨家人脈挖出的菁英，能力與潛力顯著高於公開名單
  if (elite) {
    if (p.isPitcher) {
      p.velocity = clamp(p.velocity + randInt(6, 14), 20, 95);
      p.control = clamp(p.control + randInt(6, 14), 20, 95);
      p.pitches.forEach(pt => {
        pt.stuff = clamp(pt.stuff + randInt(4, 10), 20, 95);
        pt.control = clamp(pt.control + randInt(4, 10), 20, 95);
      });
    } else {
      ["contact", "power", "eye"].forEach(k => { p[k] = clamp(p[k] + randInt(6, 14), 20, 95); });
      p.fielding = clamp(p.fielding + randInt(3, 8), 15, 95);
    }
    const curOverall = p.isPitcher ? (p.velocity + p.control) / 2 : (p.contact + p.power + p.eye) / 3;
    p.potential = clamp(Math.round(Math.max(p.potential, curOverall + randInt(3, 10))), 24, 93);
  }
  return p;
}
const FOREIGN_ROSTER_CAP = 4; // 每隊1軍最多可同時註冊上場的外籍球員人數（超過上限需先釋出才能再簽新的外籍球員）
function foreignCountOnRoster1(team) {
  return team.roster1.map(id => S.players[id]).filter(p => p && p.foreign).length;
}
const FIELD_POS = ["1B","2B","3B","SS","LF","CF","RF"];
const POS_LABEL = {P:"投手",C:"捕手","1B":"一壘","2B":"二壘","3B":"三壘",SS:"游擊",LF:"左外野",CF:"中外野",RF:"右外野",DH:"指定打擊"};
const PITCH_TYPES = ["四縫線速球","二縫線速球","卡特球","滑球","曲球","指叉球","變速球","蝴蝶球"];
const DIV_LABEL = {A1:"A區・第一分組", A2:"A區・第二分組", B1:"B區・第一分組", B2:"B區・第二分組"};

/* ---------- 工具函式 ---------- */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function choice(arr) { return arr[randInt(0, arr.length - 1)]; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function randNormal(mean, stdev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdev;
}
function genRating(mean = 50, spread = 15) { return clamp(Math.round(randNormal(mean, spread)), 20, 95); }
let ID_SEQ = 1;
function nextId(prefix) { return prefix + (ID_SEQ++); }
// 球速：內部仍以0-100評等值(p.velocity)驅動成長/衰退/戰力等所有既有公式（避免牽動模擬平衡），
// 但介面一律換算成真實公里/小時顯示，符合真實球速直覺（約116~169km/h區間）。
function velocityKmh(v) { return Math.round(clamp(v, 0, 100) * 0.51 + 118); }
function generateGivenName() {
  const len = Math.random() < 0.7 ? 2 : 1;
  let s = "";
  for (let i = 0; i < len; i++) s += choice(GIVEN_CHARS);
  return s;
}
function generateChineseName() { return choice(SURNAMES) + generateGivenName(); }
function pct(w, l) { const g = w + l; return g === 0 ? ".000" : (w / g).toFixed(3).replace(/^0/, ""); }

/* ---------- 球員生成 ---------- */
/* ====================================================================
   v25 球員特質系統：生成時隨機0~2個特質，讓每位球員有獨特個性。
   特質連動：成長（developPlayer）、受傷（maybeInjurePlayer）、關鍵時刻（比賽模擬）、
   談約（期望薪資）、春訓（成效）、狀況（開季初始）、人氣（年度結算）。
   ==================================================================== */
const TRAITS = {
  grinder:    { name: "練習狂",   desc: "訓練與春訓成效更好" },
  glass:      { name: "玻璃體質", desc: "受傷機率明顯較高" },
  ironman:    { name: "鋼鐵之軀", desc: "受傷機率明顯較低" },
  biggame:    { name: "大賽型",   desc: "關鍵時刻與季後賽表現提升" },
  slowstart:  { name: "慢熱型",   desc: "開季前15場狀況壓在普通以下" },
  faststart:  { name: "快熱型",   desc: "開季自帶好調" },
  mentor:     { name: "導師",     desc: "同隊23歲以下年輕球員成長加速" },
  idol:       { name: "人氣王",   desc: "在隊時球隊人氣每年+2" },
  ambitious:  { name: "大物志向", desc: "談約期望薪資+15%" },
  humble:     { name: "重情義",   desc: "談約期望薪資-8%" },
  buntpro:    { name: "觸擊職人", desc: "觸擊能力出眾" },
  moody:      { name: "情緒起伏", desc: "狀況波動比一般人劇烈" }
};
const TRAIT_KEYS = Object.keys(TRAITS);
/* v31傳承：特質分「先天型（不可傳，體質/個性）」與「後天型（可傳，磨練得來的技藝）」。
   僅後天型可透過老將傳承給後輩。 */
const ACQUIRED_TRAITS = ["grinder", "biggame", "mentor", "buntpro"]; // 後天型：練習狂/大賽型/導師/觸擊職人
function isAcquiredTrait(key) { return ACQUIRED_TRAITS.includes(key); }
/* v31特殊技/稱號池（可疊加、可傳承，等同「型態」傳授）：
   取得時給予一次性小幅屬性提升（類似春訓）；持有即為一種稱號，於球員資料顯示。 */
const LEGACY_SKILLS = {
  eye_master:   { name: "選球之神", batter: true,  boost: { eye: 3, contact: 1 }, desc: "選球眼獨到，保送與擊球品質俱佳。" },
  power_flag:   { name: "強打旗手", batter: true,  boost: { power: 3 }, desc: "長打火力的精神領袖。" },
  contact_zen:  { name: "巧打宗師", batter: true,  boost: { contact: 3 }, desc: "棒子如臂使指，安打製造機。" },
  speed_heir:   { name: "快腿傳人", batter: true,  boost: { speed: 2, steal: 3 }, desc: "腳程與盜壘技藝的傳承者。" },
  glove_magic:  { name: "守備魔術師", batter: true, boost: { fielding: 3, arm: 1 }, desc: "美技守備的化身。" },
  control_ace:  { name: "制球鬼才", pitcher: true, boost: { control: 3 }, desc: "指哪打哪的精準控球。" },
  fire_legacy:  { name: "火球傳承", pitcher: true, boost: { velocity: 3 }, desc: "速球威力的血脈延續。" },
  iron_arm:     { name: "鐵臂傳人", pitcher: true, boost: { stamina: 3 }, desc: "耐投不倦的鐵人臂力。" },
  big_heart:    { name: "大心臟",   pitcher: true, boost: { composure: 3 }, desc: "越是關鍵越冷靜。" }
};
const LEGACY_SKILL_KEYS = Object.keys(LEGACY_SKILLS);
function hasLegacySkill(p, key) { return !!(p && p.specialSkills && p.specialSkills.includes(key)); }
function legacyItemsCount(p) { // 稱號＋後天特質的疊加數（傳承上限用）
  const skills = (p.specialSkills || []).length;
  const acq = (p.traits || []).filter(isAcquiredTrait).length;
  return skills + acq;
}
function legacyTagsHtml(p) {
  if (!p || !p.specialSkills || p.specialSkills.length === 0) return "";
  return p.specialSkills.map(k => LEGACY_SKILLS[k] ? `<span class="specialabilitytag" title="${LEGACY_SKILLS[k].desc}">★${LEGACY_SKILLS[k].name}</span>` : "").join("");
}
// 套用特殊技的一次性屬性提升（取得時）
function applyLegacySkillBoost(p, key) {
  const sk = LEGACY_SKILLS[key];
  if (!sk || !sk.boost) return;
  Object.keys(sk.boost).forEach(attr => {
    if (typeof p[attr] === "number") p[attr] = clamp(p[attr] + sk.boost[attr], 20, 99);
  });
}
function rollTraits() {
  const r = Math.random();
  const count = r < 0.55 ? 0 : (r < 0.9 ? 1 : 2);
  return shuffle(TRAIT_KEYS).slice(0, count);
}
function hasTrait(p, key) { return !!(p && p.traits && p.traits.includes(key)); }
function traitTagsHtml(p) {
  if (!p.traits || p.traits.length === 0) return "";
  return p.traits.map(k => TRAITS[k] ? `<span class="traittag" title="${TRAITS[k].desc}">${TRAITS[k].name}</span>` : "").join("");
}
function applyTraitOnGen(p) {
  p.traits = rollTraits();
  p.agent = rollAgent(); // v27：每位球員配一名專屬經紀人
  if (!p.isPitcher && hasTrait(p, "buntpro")) p.bunting = clamp(p.bunting + randInt(6, 12), 20, 95);
  if (hasTrait(p, "ironman")) p.durability = clamp(p.durability + randInt(5, 10), 20, 99);
  if (hasTrait(p, "glass")) p.durability = clamp(p.durability - randInt(3, 8), 20, 99);
}
// 舊存檔相容：載入時一次性為既有球員補上特質與觸擊屬性
function ensureTraitsAndBunting() {
  const all = Object.values(S.players).concat(Object.values(S.retiredPlayers || {}));
  all.forEach(p => {
    if (!p.isPitcher && typeof p.bunting !== "number") {
      p.bunting = clamp(Math.round(p.contact * 0.45 + p.speed * 0.35 + genRating(45, 10) * 0.2), 20, 95);
    }
    if (!Array.isArray(p.traits)) p.traits = S.traitsSeeded ? [] : rollTraits();
  });
  Object.values(S.internationalFreeAgents || {}).forEach(p => {
    if (!p.isPitcher && typeof p.bunting !== "number") p.bunting = clamp(Math.round(p.contact * 0.45 + p.speed * 0.35 + genRating(45, 10) * 0.2), 20, 95);
    if (!Array.isArray(p.traits)) p.traits = [];
  });
  Object.values(S.freeAgents || {}).forEach(p => {
    if (!p.isPitcher && typeof p.bunting !== "number") p.bunting = clamp(Math.round(p.contact * 0.45 + p.speed * 0.35 + genRating(45, 10) * 0.2), 20, 95);
    if (!Array.isArray(p.traits)) p.traits = [];
  });
  S.traitsSeeded = true;
}

/* ====================================================================
   v27 經紀人個性系統：每位球員生成時配一名專屬經紀人（7型），
   影響談約的期望薪資、年限偏好、少年限溢價率、成交機率曲線與談判次數。
   鐵則不變：期望固定不洗骰、出價≥所需必成交（性格只改「所需」與機率曲線）。
   ==================================================================== */
const AGENT_TYPES = {
  hardline: { name: "強硬派", desc: "期望薪資+12%、年限不足時溢價更兇、談判次數少一次",
    expMult: 1.12, premiumRate: 0.40, slope: 1.0, attempts: 4, yearsShift: 0,
    quoteAccept: "「這是我的客戶應得的，成交。」", quoteReject: "「別浪費彼此時間，這數字免談。」" },
  friendly: { name: "好說話", desc: "所需門檻略降、未達標也較容易點頭",
    expMult: 1.0, premiumRate: 0.28, slope: 1.35, attempts: 5, yearsShift: 0, requiredMult: 0.97,
    quoteAccept: "「合作愉快！我就知道我們談得來。」", quoteReject: "「唔……再往上一點點，我們就能握手了。」" },
  money: { name: "愛錢派", desc: "加錢效果放大，但年限不足時溢價最兇",
    expMult: 1.05, premiumRate: 0.45, slope: 1.5, attempts: 5, yearsShift: 0,
    quoteAccept: "「數字會說話，這筆我們收下了。」", quoteReject: "「誠意是用鈔票堆出來的，再加點。」" },
  loyal: { name: "重情派", desc: "續約談判期望-8%；但若球員曾被你釋出，期望+15%（有心結）",
    expMult: 1.0, premiumRate: 0.28, slope: 1.0, attempts: 5, yearsShift: 0,
    quoteAccept: "「他重的是情義，不只是錢。合作愉快。」", quoteReject: "「感情歸感情，這條件還是委屈了他。」" },
  steady: { name: "求穩派", desc: "偏好長約（期望年限+1）、薪資略讓，但年限不足時溢價高",
    expMult: 0.95, premiumRate: 0.45, slope: 1.0, attempts: 5, yearsShift: 1,
    quoteAccept: "「一份安穩的長約，正是我們要的。」", quoteReject: "「年限太短了，我的客戶要的是保障。」" },
  gambler: { name: "投機派", desc: "偏好短約高薪（期望年限-2、薪資+10%）；給太長的約反而扣分",
    expMult: 1.10, premiumRate: 0.28, slope: 1.0, attempts: 5, yearsShift: -2, overYearsPenalty: 1.06,
    quoteAccept: "「短打快攻，正合我意！」", quoteReject: "「我們不想被綁死，條件再漂亮點。」" },
  fame: { name: "愛名氣", desc: "期望隨你的球隊人氣與戰績浮動：強豪名門可砍價、弱隊要加錢",
    expMult: 1.0, premiumRate: 0.28, slope: 1.0, attempts: 5, yearsShift: 0,
    quoteAccept: "「能站上大舞台，這筆划算。」", quoteReject: "「以貴隊目前的行情……這數字不夠看。」" }
};
const AGENT_KEYS = Object.keys(AGENT_TYPES);
function rollAgent() { return { type: choice(AGENT_KEYS), name: generateChineseName() }; }
function ensureAgent(p) { if (p && (!p.agent || !AGENT_TYPES[p.agent.type])) p.agent = rollAgent(); return p ? p.agent : null; }
function agentOf(p) { ensureAgent(p); return AGENT_TYPES[p.agent.type]; }
function agentTagHtml(p) {
  if (!p || !p.agent || !AGENT_TYPES[p.agent.type]) return "";
  const a = AGENT_TYPES[p.agent.type];
  return `<span class="agenttag" title="${a.desc}">${a.name}</span>`;
}

/* ====================================================================
   v28 代理人事務所：談約前的經紀人情蒐（揭露性格與期望底線），
   以及GM與各類型經紀人的關係經營（好感度影響未來談約門檻與機率）。
   資料存於 S.agency = { scouted: {playerId:{year}}, rel: {agentType:affinity(-10~10)} }。
   ==================================================================== */
function ensureAgency() {
  if (!S.agency) S.agency = { scouted: {}, rel: {} };
  if (!S.agency.scouted) S.agency.scouted = {};
  if (!S.agency.rel) S.agency.rel = {};
  if (!S.agency.wined) S.agency.wined = {};        // v33-B1 應酬紀錄：{經紀人類型: seasonYear}
  if (!S.agency.referrals) S.agency.referrals = []; // v33-B2 引薦：[{playerId, kind, type, year}]
  if (!S.agency.intel) S.agency.intel = [];         // v33-B3 動向情報：[{playerId, teamId, type, year}]
  return S.agency;
}
function agentRel(type) { const a = ensureAgency(); return a.rel[type] || 0; }
function agentRelLabel(rel) {
  // v33：稱號門檻與功能門檻對齊——莫逆之交(≥10)解鎖引薦獨家、交好(≥4)解鎖動向情報
  if (rel >= 10) return { text: "莫逆之交", cls: "affgood" };
  if (rel >= 4) return { text: "交好", cls: "affgood" };
  if (rel <= -6) return { text: "深惡痛絕", cls: "affbad" };
  if (rel <= -2) return { text: "有嫌隙", cls: "affbad" };
  return { text: "點頭之交", cls: "affmid" };
}
// 記錄GM與某類型經紀人的關係變化（成功簽約+、談崩/侮辱-），封頂±10
function recordAgentRel(type, delta) {
  if (!type) return;
  const a = ensureAgency();
  a.rel[type] = clamp((a.rel[type] || 0) + delta, -10, 10);
}
// 關係帶來的談約優惠：門檻折扣（requiredMult再乘）與機率斜率加成
function agentRelPerks(type) {
  const rel = agentRel(type);
  // 關係好：門檻每點-1.2%（最多-12%）、斜率每點+4%（最多+40%）；關係差則反向懲罰（較輕）
  if (rel >= 0) return { reqMult: 1 - rel * 0.012, slopeMult: 1 + rel * 0.04 };
  return { reqMult: 1 - rel * 0.008, slopeMult: 1 + rel * 0.03 }; // rel為負 → reqMult>1（更難）、slopeMult<1
}
// 已對此球員的經紀人做過情蒐？（同一休賽季有效）
function isAgentScouted(p) {
  const a = ensureAgency();
  const rec = a.scouted[p.id];
  return !!(rec && rec.year === S.seasonYear);
}
/* ==== v33-B1 應酬經營 ====
   休賽季可對每類型經紀人「應酬」一次：費用依關係現值300~800萬（交情越深、圈子越貴），
   成功70%好感+1、大失敗10%好感-1、其餘20%錢花了交情原地踏步。 */
function isOffseasonNow() { return !!(S.seasonKPI && S.seasonKPI.settled && S.seasonKPI.year === S.seasonYear); }
function agentWineCost(type) { const rel = agentRel(type); return (300 + Math.round((rel + 10) / 20 * 500)) * 10000; }
function canWineAgent(type) {
  const a = ensureAgency();
  return isOffseasonNow() && a.wined[type] !== S.seasonYear;
}
function wineAndDineAgent(type) {
  if (!canWineAgent(type)) return null;
  const team = S.teams[S.userTeamId];
  ensureFinance(team);
  const cost = agentWineCost(type);
  if (team.finance.budget < cost) { UI.flash = "預算不足，這頓飯請不起。"; render(); return null; }
  team.finance.budget -= cost;
  const a = ensureAgency();
  a.wined[type] = S.seasonYear;
  const roll = Math.random();
  let outcome;
  if (roll < 0.7) { recordAgentRel(type, +1); outcome = "good"; }
  else if (roll < 0.8) { recordAgentRel(type, -1); outcome = "bad"; }
  else outcome = "flat";
  const aname = AGENT_TYPES[type] ? AGENT_TYPES[type].name : type;
  pushNews("事務所", outcome === "good" ? `你與${aname}經紀人圈的飯局賓主盡歡，交情升溫。`
    : (outcome === "bad" ? `飯局上你一句玩笑話踩了地雷，${aname}經紀人們拂袖而去……`
    : `與${aname}經紀人圈的飯局平淡收場——錢花了，交情原地踏步。`));
  persist();
  render();
  return outcome;
}

/* ==== v33-B2/B3 休賽季事務所紅利（enterOffseason 呼叫，於AI簽國際球員之前以確保獨家生效）====
   B2 引薦獨家：莫逆之交(好感滿級10)的經紀人引薦一名旗下FA/國際FA好手——
      本休賽季獨家談判權（AI不得搶簽國際引薦對象）＋談約門檻再打95折；每類型每年一次。
   B3 動向情報：交好(好感≥4)的經紀人透露一名旗下他隊客戶「想換環境」，作為交易目標線索；每類型每年一次。 */
function generateAgencyOffseasonPerks() {
  const a = ensureAgency();
  a.referrals = (a.referrals || []).filter(r => r.year === S.seasonYear);
  a.intel = (a.intel || []).filter(r => r.year === S.seasonYear);
  Object.keys(AGENT_TYPES).forEach(type => {
    const rel = agentRel(type);
    if (rel >= 10 && !a.referrals.some(r => r.type === type)) {
      const pools = [
        { kind: "freeAgent", list: Object.values(S.freeAgents || {}) },
        { kind: "international", list: Object.values(S.internationalFreeAgents || {}) }
      ];
      let best = null, bestKind = null;
      pools.forEach(pool => pool.list.forEach(p => {
        ensureAgent(p);
        if (p.agent.type !== type) return;
        if (!best || trueOverall(p) > trueOverall(best)) { best = p; bestKind = pool.kind; }
      }));
      if (best) {
        a.referrals.push({ playerId: best.id, kind: bestKind, type, year: S.seasonYear });
        pushNews("事務所", `莫逆之交的${AGENT_TYPES[type].name}經紀人私下引薦旗下好手 ${best.name}——本休賽季你有獨家談判權（門檻95折）。`);
      }
    }
    if (rel >= 4 && !a.intel.some(r => r.type === type)) {
      const cands = Object.values(S.players).filter(p => p.team && p.team !== S.userTeamId
        && p.agent && p.agent.type === type && p.age >= 26 && p.age <= 33 && trueOverall(p) >= 55);
      if (cands.length > 0) {
        const pick = cands[randInt(0, cands.length - 1)];
        a.intel.push({ playerId: pick.id, teamId: pick.team, type, year: S.seasonYear });
        const tn = S.teams[pick.team] ? S.teams[pick.team].name : "他隊";
        pushNews("事務所", `${AGENT_TYPES[type].name}經紀人酒後吐真言：他的客戶 ${pick.name}（${tn}）待得不太開心，想換個環境……`);
      }
    }
  });
}
// 該球員是否為本年度引薦對象（談約95折、AI國際簽援跳過）
function referralFor(playerId) {
  const a = ensureAgency();
  return (a.referrals || []).find(r => r.playerId === playerId && r.year === S.seasonYear) || null;
}

// 情蒐花費：依球員身價估算（越大牌的客戶，經紀人越難打聽）
function agentScoutCost(p) {
  const base = (typeof computePlayerSalary === "function") ? computePlayerSalary(p) : 5000000;
  return Math.round(clamp(base * 0.06, 800000, 12000000) / 10000) * 10000;
}

/* ====================================================================
   v27 AI球團個性檔案（7型）＋GM記憶系統：
   每隊有經營風格（影響交易估值加權、接受門檻、簽國際球員積極度），
   並記得你做過的事（好感度-10~+10，逐年淡化×0.7，事件封頂10筆）。
   ==================================================================== */
const TEAM_PERSONAS = {
  rebuild:      { name: "重建型", desc: "看重年輕潛力股，樂意送走老將", youngMult: 1.25, oldMult: 0.75, potMult: 1.2, starMult: 1.0, acceptHi: 1.15, chanceMult: 1.0, affinityW: 1, intlChance: 0.15 },
  splash:       { name: "豪購型", desc: "迷戀即戰力明星，絕不輕易放走主力，簽國際球員最積極", youngMult: 0.85, oldMult: 1.15, potMult: 0.9, starMult: 1.25, acceptHi: 1.15, chanceMult: 1.0, affinityW: 1, intlChance: 0.6 },
  farm:         { name: "養成型", desc: "惜售自家農場，年輕潛力股開價特別高", youngMult: 1.3, oldMult: 1.0, potMult: 1.25, starMult: 1.0, acceptHi: 1.18, chanceMult: 0.9, affinityW: 1, intlChance: 0.1 },
  analytics:    { name: "精算型", desc: "只認數字：帳面划算就成交、吃虧一律免談，不受交情影響", youngMult: 1.0, oldMult: 1.0, potMult: 1.0, starMult: 1.0, acceptHi: 1.03, chanceMult: 0, affinityW: 0, intlChance: 0.25 },
  conservative: { name: "保守型", desc: "極少交易，門檻最高，也幾乎不碰國際市場", youngMult: 1.0, oldMult: 1.0, potMult: 1.0, starMult: 1.05, acceptHi: 1.28, chanceMult: 0.5, affinityW: 1, intlChance: 0.05 },
  gambler:      { name: "賭性型", desc: "門檻低、偶爾連小虧的交易都敢賭", youngMult: 1.0, oldMult: 1.0, potMult: 1.1, starMult: 1.0, acceptHi: 1.08, chanceMult: 1.3, affinityW: 1, lowballChance: 0.08, intlChance: 0.4 },
  human:        { name: "人情型", desc: "最重交情：好感度對交易門檻的影響是別隊的兩倍", youngMult: 1.0, oldMult: 1.0, potMult: 1.0, starMult: 1.0, acceptHi: 1.15, chanceMult: 1.0, affinityW: 2, intlChance: 0.25 }
};
const PERSONA_KEYS = Object.keys(TEAM_PERSONAS);
function personaOf(team) { return (team && TEAM_PERSONAS[team.persona]) || null; }
function personaTagHtml(team) {
  const ps = personaOf(team);
  return ps ? `<span class="personatag" title="${ps.desc}">${ps.name}</span>` : "";
}
function ensureGmMemory(team) {
  if (team && !team.gmMemory) team.gmMemory = { affinity: 0, events: [], rejects: 0 };
  return team ? team.gmMemory : null;
}
function gmAffinity(team) { return (team && team.gmMemory) ? (team.gmMemory.affinity || 0) : 0; }
function recordGmMemory(team, delta, text) {
  if (!team || team.id === S.userTeamId) return;
  const m = ensureGmMemory(team);
  m.affinity = clamp(m.affinity + delta, -10, 10);
  m.events.unshift({ year: S.seasonYear, delta, text });
  if (m.events.length > 10) m.events.length = 10;
}
function affinityLabel(aff) {
  if (aff >= 6) return { text: "深厚交情", cls: "affgood" };
  if (aff >= 2) return { text: "友好", cls: "affgood" };
  if (aff <= -6) return { text: "水火不容", cls: "affbad" };
  if (aff <= -2) return { text: "不睦", cls: "affbad" };
  return { text: "普通", cls: "affmid" };
}
// 逐年淡化：好感度×0.7取整（往0靠攏）、當季被拒計數歸零（enterOffseason呼叫）
function decayGmMemories() {
  Object.values(S.teams).forEach(t => {
    if (t.id === S.userTeamId) return;
    const m = ensureGmMemory(t);
    m.affinity = Math.abs(m.affinity) <= 1 ? 0 : Math.round(m.affinity * 0.7);
    m.rejects = 0;
  });
}

function freshBatterStats() { return { G: 0, AB: 0, H: 0, HR: 0, RBI: 0, BB: 0, SO: 0, SB: 0 }; }
function freshPitcherStats() { return { G: 0, W: 0, L: 0, SV: 0, HD: 0, IP: 0, ER: 0, SO: 0, BB: 0, H: 0 }; }

function generatePositions() {
  const primary = Math.random() < 0.15 ? "C" : choice(FIELD_POS);
  const positions = [{ pos: primary, rating: genRating(65, 12) }];
  const pool = ["1B", "2B", "3B", "SS", "LF", "CF", "RF"].filter(p => p !== primary);
  const roll = Math.random();
  const secCount = roll < 0.15 ? 2 : (roll < 0.5 ? 1 : 0);
  for (let i = 0; i < secCount; i++) {
    const p = choice(pool);
    if (!positions.find(x => x.pos === p)) positions.push({ pos: p, rating: genRating(45, 15) });
  }
  return positions;
}

function generateAgingProfile() {
  const peakAge = clamp(Math.round(randNormal(27, 2.8)), 21, 34);
  const longevity = genRating(50, 18);
  return { peakAge, longevity };
}

// 生涯型態標籤（退休後才顯示，避免提前暴雷）：
// 顛峰年齡（peakAge）與長青體質（longevity）是完全獨立生成的兩個隱藏參數，
// 因此「早熟/晚成」×「早衰/長青」可以自由組合出多種不同生涯樣貌。
function careerTypeLabel(p) {
  const growthLabel = p.peakAge <= 24 ? "早熟型" : (p.peakAge >= 30 ? "晚成型" : "正常成長型");
  const declineLabel = p.longevity >= 65 ? "長青型" : (p.longevity <= 35 ? "早衰型" : "正常衰退型");
  return `${growthLabel}・${declineLabel}（顛峰年齡約${p.peakAge}歲）`;
}

function generateBatter(teamId, level, forcedPotential) {
  const positions = generatePositions();
  const isCatcher = positions.some(p => p.pos === "C");
  const aging = generateAgingProfile();
  const b = {
    id: nextId("B"), name: generateChineseName(), age: randInt(18, 34),
    bats: choice(["左", "右", "左右"]), throws: choice(["左", "右"]),
    nationality: "本土", foreign: false, team: teamId, level, isPitcher: false,
    positions,
    contact: genRating(), power: genRating(), eye: genRating(),
    vsL: genRating(), vsR: genRating(), speed: genRating(), steal: genRating(),
    fielding: genRating(), arm: genRating(), stamina: genRating(),
    durability: genRating(), potential: typeof forcedPotential === "number" ? forcedPotential : genRating(55, 15),
    peakAge: aging.peakAge, longevity: aging.longevity, coachingAptitude: genRating(50, 16),
    composure: genRating(),
    gameCalling: isCatcher ? genRating(50, 14) : null,
    framing: isCatcher ? genRating(50, 14) : null,
    caughtStealing: isCatcher ? genRating(50, 14) : null,
    bunting: genRating(45, 14), condition: 0,
    specialSkills: [], morale: 70,
    seasonStats: freshBatterStats(), careerStats: freshBatterStats()
  };
  applyTraitOnGen(b);
  return b;
}

function generatePitcher(teamId, level, forcedPotential) {
  const numPitches = randInt(2, 5);
  const shuffled = shuffle(PITCH_TYPES.filter(p => p !== "四縫線速球")).slice(0, numPitches - 1);
  const chosen = ["四縫線速球", ...shuffled];
  const pitches = chosen.map(type => ({ type, stuff: genRating(), control: genRating() }));
  const roleRoll = Math.random();
  const role = roleRoll < 0.38 ? "先發" : (roleRoll < 0.68 ? "中繼" : (roleRoll < 0.85 ? "布局" : "終結"));
  const aging = generateAgingProfile();
  const pl = {
    id: nextId("P"), name: generateChineseName(), age: randInt(18, 35),
    throws: choice(["左", "右"]), nationality: "本土", foreign: false,
    team: teamId, level, isPitcher: true, role,
    velocity: genRating(), control: genRating(), pitches,
    composure: genRating(),
    stamina: genRating(), durability: genRating(), potential: typeof forcedPotential === "number" ? forcedPotential : genRating(55, 15),
    peakAge: aging.peakAge, longevity: aging.longevity, coachingAptitude: genRating(50, 16),
    condition: 0, fatigue: 0,
    specialSkills: [], morale: 70,
    seasonStats: freshPitcherStats(), careerStats: freshPitcherStats()
  };
  applyTraitOnGen(pl);
  return pl;
}

function buildRoster(teamId) {
  const roster1 = [], roster2 = [];
  for (let i = 0; i < 13; i++) roster1.push(generatePitcher(teamId, "1軍"));
  for (let i = 0; i < 15; i++) roster1.push(generateBatter(teamId, "1軍"));
  for (let i = 0; i < 15; i++) roster2.push(generatePitcher(teamId, "2軍"));
  for (let i = 0; i < 17; i++) roster2.push(generateBatter(teamId, "2軍"));
  return { roster1, roster2 };
}

/* ---------- 成長／衰退／退休系統 ---------- */
const BATTER_FIELDS = ["contact", "power", "eye", "vsL", "vsR", "speed", "steal", "fielding", "arm", "stamina"];
const CATCHER_FIELDS = ["gameCalling", "framing", "caughtStealing"];

function ageAdjustRating(rating, potential, age, peakAge, longevity, coachBonus = 0) {
  if (age <= peakAge) {
    // 成長階段：把「潛力與現在的差距」平均分攤到「距離顛峰年齡的剩餘年數」，
    // 避免新秀在1~2年內就從評等D暴衝到天花板S（不符合真實養成節奏）。
    const yearsRemaining = Math.max(peakAge - age, 1) + 1;
    const room = potential - rating;
    // v25修正：現況已達（或超過）潛力天花板時，顛峰年齡前維持現狀、不再被負room拖著衰退
    if (room <= 0) return rating;
    const baseStep = room / yearsRemaining;
    const variance = Math.abs(baseStep) * 0.35;
    const coachMult = 1 + clamp(coachBonus, -0.35, 0.45) * 0.4;
    let step = (baseStep + (Math.random() * 2 - 1) * variance) * coachMult;
    step = clamp(step, -2, 8); // 單一球季成長幅度上限，杜絕暴衝式成長
    return clamp(Math.round(rating + step), 20, 99);
  } else {
    const yearsPast = age - peakAge;
    const longevityFactor = (longevity - 50) / 100;
    const declineChance = clamp(0.12 + yearsPast * 0.05 - longevityFactor * 0.15 - coachBonus * 0.1, 0.05, 0.9);
    if (Math.random() < declineChance) {
      const step = -(randInt(1, 4) + Math.floor(yearsPast / 3)) * clamp(1 - longevityFactor * 0.6, 0.4, 1.3);
      return clamp(rating + Math.round(step), 15, 99);
    }
    return rating;
  }
}

function developPlayer(p, team) {
  p.age++;
  // v25特質：練習狂本人成長加成；同隊有「導師」特質老將時，23歲以下年輕球員成長加速
  let traitG = hasTrait(p, "grinder") ? 0.12 : 0;
  if (team && p.age <= 23) {
    const hasMentor = team.roster1.concat(team.roster2).some(id => {
      const m = S.players[id];
      return m && m.id !== p.id && m.age >= 30 && hasTrait(m, "mentor");
    });
    if (hasMentor) traitG += 0.06;
    if (typeof dormYouthGrowthBonus === "function") traitG += dormYouthGrowthBonus(team); // v26宿舍：年輕球員成長環境加成
  }
  const tb = (key) => ((team && typeof trainingGrowthBonus === "function") ? trainingGrowthBonus(team, key) : 0) + traitG; // ⑥訓練設施加成（疊加於教練加成）＋v25特質加成
  if (p.isPitcher) {
    const pitchBonus = team ? specificCoachBonus(team, p.level, "pitching") : 0;
    const condBonus = team ? specificCoachBonus(team, p.level, "conditioning") : 0;
    p.velocity = ageAdjustRating(p.velocity, p.potential, p.age, p.peakAge, p.longevity, pitchBonus + tb("pitchVelocity"));
    p.control = ageAdjustRating(p.control, p.potential, p.age, p.peakAge, p.longevity, pitchBonus + tb("pitchControl"));
    p.pitches.forEach(pt => {
      pt.stuff = ageAdjustRating(pt.stuff, p.potential, p.age, p.peakAge, p.longevity, pitchBonus + tb("pitchBreaking"));
      pt.control = ageAdjustRating(pt.control, p.potential, p.age, p.peakAge, p.longevity, pitchBonus + tb("pitchBreaking"));
    });
    p.stamina = ageAdjustRating(p.stamina, p.potential, p.age, p.peakAge, p.longevity, condBonus);
    const leadBonusP = team ? specificCoachBonus(team, p.level, "leadership") : 0;
    p.composure = ageAdjustRating(p.composure, p.potential, p.age, p.peakAge, p.longevity, leadBonusP + tb("composure"));
  } else {
    const battingBonus = team ? specificCoachBonus(team, p.level, "batting") : 0;
    const runningBonus = team ? specificCoachBonus(team, p.level, "running") : 0;
    const defBonus = team ? specificCoachBonus(team, p.level, isInfielderPos(p) ? "infield_d" : "outfield_d") : 0;
    const condBonus = team ? specificCoachBonus(team, p.level, "conditioning") : 0;
    p.contact = ageAdjustRating(p.contact, p.potential, p.age, p.peakAge, p.longevity, battingBonus + tb("batContact"));
    p.power = ageAdjustRating(p.power, p.potential, p.age, p.peakAge, p.longevity, battingBonus + tb("batPower"));
    p.eye = ageAdjustRating(p.eye, p.potential, p.age, p.peakAge, p.longevity, battingBonus + tb("batEye"));
    p.vsL = ageAdjustRating(p.vsL, p.potential, p.age, p.peakAge, p.longevity, battingBonus + tb("batContact"));
    p.vsR = ageAdjustRating(p.vsR, p.potential, p.age, p.peakAge, p.longevity, battingBonus + tb("batContact"));
    p.speed = ageAdjustRating(p.speed, p.potential, p.age, p.peakAge, p.longevity, runningBonus + tb("baserunning"));
    p.steal = ageAdjustRating(p.steal, p.potential, p.age, p.peakAge, p.longevity, runningBonus + tb("baserunning"));
    p.bunting = ageAdjustRating(p.bunting || 45, p.potential, p.age, p.peakAge, p.longevity, battingBonus + tb("bunting")); // v25觸擊屬性
    p.fielding = ageAdjustRating(p.fielding, p.potential, p.age, p.peakAge, p.longevity, defBonus + tb("defense"));
    p.arm = ageAdjustRating(p.arm, p.potential, p.age, p.peakAge, p.longevity, defBonus + tb("defense"));
    p.stamina = ageAdjustRating(p.stamina, p.potential, p.age, p.peakAge, p.longevity, condBonus);
    if (p.gameCalling !== null) {
      const catchBonus = team ? specificCoachBonus(team, p.level, "catching") : 0;
      p.gameCalling = ageAdjustRating(p.gameCalling, p.potential, p.age, p.peakAge, p.longevity, catchBonus + tb("catcher"));
      p.framing = ageAdjustRating(p.framing, p.potential, p.age, p.peakAge, p.longevity, catchBonus + tb("catcher"));
      p.caughtStealing = ageAdjustRating(p.caughtStealing, p.potential, p.age, p.peakAge, p.longevity, catchBonus + tb("catcher"));
    }
    const leadBonusB = team ? specificCoachBonus(team, p.level, "leadership") : 0;
    p.composure = ageAdjustRating(p.composure, p.potential, p.age, p.peakAge, p.longevity, leadBonusB + tb("composure"));
  }
  if (p.age > p.peakAge && p.age % 2 === 0) p.durability = clamp(p.durability - 1, 20, 99);
  if (hasTrait(p, "ironman")) p.durability = Math.max(p.durability, 40); // 鋼鐵之軀：耐久不低於40
  if (p.injury) delete p.injury; // ⑤休賽季充分休養，所有傷勢痊癒（v26：跨季重傷不做降評判定，視同休養成功；injuryHistory傷病史刻意保留終生）
  if (p.midTraining) delete p.midTraining; // v26季中特訓：球季結束自動清除
  p.fatigue = 0; // v25牛棚疲勞：休賽季歸零
  p.condition = 0; // v25狀況：休賽季重置為普通（春訓與特質可再推移）
}

function checkRetirement(p) {
  const overall = p.isPitcher ? (p.velocity + p.control) / 2 : (p.contact + p.power + p.eye + p.fielding) / 4;
  const yearsPastPeak = Math.max(0, p.age - p.peakAge);
  if (yearsPastPeak <= 2) return false;
  const longevityFactor = (p.longevity - 50) / 100;
  const skillFactor = clamp((55 - overall) / 40, 0, 1);
  const ageFactor = clamp((yearsPastPeak - 2) * 0.03, 0, 0.5);
  let chance = ageFactor + skillFactor * 0.5 - longevityFactor * 0.25;
  if (p.age >= 45) chance += 0.25;
  return Math.random() < clamp(chance, 0, 0.95);
}

function reinstatePlayer(playerId) {
  const p = S.retiredPlayers[playerId];
  if (!p) return;
  if (p.becameCoach || p.becameScout) return; // 已經轉任教練或球探的不能再留任球員身份
  delete S.retiredPlayers[playerId];
  p.retired = false;
  delete p.retiredYear;
  S.players[playerId] = p;
  const team = S.teams[p.team];
  if (team) {
    if (p.level === "1軍") team.roster1.push(playerId);
    else team.roster2.push(playerId);
  }
  if (S.offseasonSummary && S.offseasonSummary.myRetiredIds) {
    S.offseasonSummary.myRetiredIds = S.offseasonSummary.myRetiredIds.filter(id => id !== playerId);
  }
  UI.flash = `${p.name} 決定繼續留任，取消本季退休。`;
  persist();
  render();
}

// 將現役球員移入退休名單（僅供「建議退休轉任教練／球探」流程在球員同意後內部呼叫；
// 舊版獨立的「強制退休」按鈕已移除，不再有任何非自願退休入口）
function retirePlayerToList(playerId) {
  const p = S.players[playerId];
  if (!p) return null;
  const team = S.teams[p.team];
  if (team) {
    team.roster1 = team.roster1.filter(id => id !== playerId);
    team.roster2 = team.roster2.filter(id => id !== playerId);
  }
  delete S.players[playerId];
  p.retired = true;
  p.retiredYear = S.seasonYear;
  S.retiredPlayers[playerId] = p;
  return p;
}

// v29談約資訊：成長階段標示——依年齡與（隱藏的）顛峰年齡，把球員標成成長期／巔峰期／衰退期，
// 讓玩家談約時直觀判斷「這張約簽下去，能力是會往上還是往下走」。
/* v37②：新秀球探報告——逐屬性「預估值」。模型上各屬性都朝單一 p.potential 收斂，
   故以「總體成長空間（天花板−現況總評）」為位移量，把每個現況屬性往上推估到其天花板值，
   保留屬性間相對高低、封頂99、不低於現況。回傳整數；資料不足回 null（顯示端自動略過）。 */
function scoutedAttrProjection(curVal, scoutedOverall, scoutedCeilingVal) {
  if (curVal == null || scoutedOverall == null || scoutedCeilingVal == null) return null;
  const room = Math.max(0, scoutedCeilingVal - scoutedOverall);
  return clamp(Math.round(curVal + room), Math.round(curVal), 99);
}
function growthPhaseLabel(p) {
  const peak = p.peakAge || 27;
  if (p.age < peak - 1) return { key: "grow", text: "成長期", desc: `能力仍在向天花板爬升（預估顛峰約${peak}歲前後）`, cls: "phasegrow" };
  if (p.age <= peak + 1) return { key: "peak", text: "巔峰期", desc: "正值生涯顛峰，能力大致維持在最高水準", cls: "phasepeak" };
  return { key: "decline", text: "衰退期", desc: "已過顛峰，能力會逐年下滑（長青型球員衰退較慢）", cls: "phasedecline" };
}
function trueOverall(p) {
  return p.isPitcher ? (p.velocity + p.control) / 2 : (p.contact + p.power + p.eye + p.fielding) / 4;
}

// 受傷判定：p.injury = { name, daysLeft, totalDays, severity }，daysLeft>0 即無法出賽
function isInjured(p) { return !!(p && p.injury && p.injury.daysLeft > 0); }

function rosterIssues(team) {
  const issues = [];
  const r1 = team.roster1.map(id => S.players[id]).filter(Boolean);
  const p1 = r1.filter(p => p.isPitcher).length;
  const b1 = r1.length - p1;
  if (team.roster1.length > 28) issues.push(`1軍超編：目前 ${team.roster1.length} 人，編制上限28人，請先下放至28人以內`);
  if (team.roster2.length > 32) issues.push(`2軍超編：目前 ${team.roster2.length} 人，編制上限32人，請先調整至32人以內`);
  if (p1 === 0) issues.push("1軍目前沒有任何投手，無法出賽");
  if (b1 === 0) issues.push("1軍目前沒有任何野手，無法出賽");
  return issues;
}

/* ---------- 交易系統 ---------- */
/* v32：交易截止日改為「季後賽前一個月」（例行賽最後30個比賽日不可交易）；
   休賽季窗口改為「選秀會結束後」才重新開放（finishDraft 設 draftDoneYear）。 */
const TRADE_DEADLINE_BUFFER_DAYS = 30;
function tradeDeadlineDay() { return Math.max(1, S.schedule.length - TRADE_DEADLINE_BUFFER_DAYS); }
function tradeWindowOpen() {
  const totalDays = S.schedule.length;
  const seasonOver = S.currentDay >= totalDays;
  if (seasonOver) return S.draftDoneYear === S.seasonYear; // v32：休賽季需等選秀後
  return S.currentDay < tradeDeadlineDay();
}

function tradeValue(p) {
  const overall = trueOverall(p);
  const ageFactor = clamp(1.5 - (p.age - 23) * 0.035, 0.45, 1.5);
  const potentialFactor = 1 + (p.potential - 50) / 120;
  return overall * ageFactor * potentialFactor;
}

// v27：該球團「眼中」的球員價值（依經營風格加權：年輕/老將/潛力股/明星）
function personaTradeValue(team, p) {
  const base = tradeValue(p);
  const ps = personaOf(team);
  if (!ps) return base;
  let m = 1;
  if (p.age <= 25) m *= ps.youngMult;
  if (p.age >= 30) m *= ps.oldMult;
  if ((p.potential || 50) >= 70) m *= ps.potMult;
  if (trueOverall(p) >= 65) m *= ps.starMult;
  return base * m;
}

// v27改寫：交易評估改以「對方球團的眼光」計價，並受經營個性門檻與GM好感度影響；
// 評估結果同時寫入對方的記憶（欠人情／侮辱性報價／反覆騷擾）。
function evaluateTrade(givePlayerIds, getPlayerIds, partnerTeamId) {
  const pid = partnerTeamId || (getPlayerIds[0] && S.players[getPlayerIds[0]] && S.players[getPlayerIds[0]].team) || null;
  const partner = pid ? S.teams[pid] : null;
  const ps = personaOf(partner);
  const val = p => partner ? personaTradeValue(partner, p) : tradeValue(p);
  const giveValue = givePlayerIds.reduce((s, id) => s + val(S.players[id]), 0);
  const getValue = getPlayerIds.reduce((s, id) => s + val(S.players[id]), 0);
  if (getValue === 0) {
    if (partner && giveValue > 0) recordGmMemory(partner, 2, "你無償送出球員給他們（欠你一份人情）");
    return { accept: true, ratio: 99, reason: "對方沒有損失任何球員，當然同意" };
  }
  const ratio = giveValue / getValue;
  const aff = gmAffinity(partner);
  const affW = ps ? ps.affinityW : 1;
  const adjRatio = ratio + aff * 0.01 * affW; // 好感度±10 → 帳面比率±0.1（人情型×2）
  let hi = ps ? ps.acceptHi : 1.15;
  // v32-B2：好感≥+5的球團「客隊讓利」——成交門檻打95折（精算型不看交情，維持原門檻與決定性）
  if (partner && aff >= 5 && !(ps && ps.chanceMult === 0)) hi *= 0.95;
  // v32：插隊搶人——目標球員已有AI買家在談時，報價比率須壓過AI撮合比率+5%，且不走隨機成交
  const hijack = partner ? (getPlayerIds.map(id => activeRumorForPlayer(id, partner.id)).find(Boolean) || null) : null;
  if (hijack) {
    const needRatio = Math.max(hi, hijack.neutralRatio + AI_TRADE_INTERCEPT_PREMIUM);
    const who32 = `${partner.name}${ps ? `（${ps.name}）` : ""}`;
    if (ratio >= needRatio) {
      return { accept: true, ratio, reason: `${who32}見你的開價壓過檯面上的買家，見利忘義轉頭與你成交！`, hijackedRumorId: hijack.id };
    }
    return { accept: false, ratio, reason: `${who32}搖搖頭：「已經有別隊在談了，你這個價碼不夠讓我們改變心意。」（須明顯優於現有買家的條件）` };
  }
  const who = partner ? `${partner.name}${ps ? `（${ps.name}）` : ""}` : "對方";
  let accept, reason;
  if (ps && ps.chanceMult === 0) {
    // 精算型：純數字判定，無隨機、不看交情
    accept = ratio >= hi;
    reason = accept ? `${who}攤開試算表：「帳面划算，成交。」` : `${who}攤開試算表：「數字不會說謊，這筆我們吃虧，免談。」`;
  } else if (adjRatio >= hi) {
    accept = true; reason = `${who}認為這筆交易非常划算，欣然接受！`;
  } else if (adjRatio >= 0.85) {
    const chance = clamp((adjRatio - 0.75) * 3 * (ps ? ps.chanceMult : 1), 0.05, 0.9);
    accept = Math.random() < chance;
    reason = accept ? `${who}認為條件公平，同意交易。` : `${who}覺得條件差不多，但這次選擇再考慮看看。`;
  } else if (ps && ps.lowballChance && adjRatio >= 0.75 && Math.random() < ps.lowballChance) {
    accept = true; reason = `${who}明知帳面小虧，仍決定賭一把，同意交易！`;
  } else {
    accept = false; reason = `${who}認為這筆交易對他們不夠划算，拒絕了。`;
  }
  // 記憶事件：欣然成交的好交易記人情；侮辱性報價與反覆騷擾扣好感
  if (partner) {
    if (accept && ratio >= 1.3) recordGmMemory(partner, 2, "一筆對他們明顯有利的交易（欠你人情）");
    else if (accept && ratio >= 1.15) recordGmMemory(partner, 1, "一筆划算的交易");
    if (!accept) {
      if (ratio < 0.6) { recordGmMemory(partner, -2, "你提出過侮辱性的交易報價"); reason += "（這種報價讓對方相當不悅）"; }
      else {
        const m = ensureGmMemory(partner);
        m.rejects = (m.rejects || 0) + 1;
        if (m.rejects % 3 === 0) { recordGmMemory(partner, -1, "同一球季內反覆糾纏被拒的交易"); reason += "（對方開始對你的來電感到不耐）"; }
      }
    }
  }
  return { accept, ratio, reason };
}

function executeTrade(teamAId, teamBId, aGivesIds, bGivesIds) {
  const teamA = S.teams[teamAId], teamB = S.teams[teamBId];
  function moveOut(team, ids) {
    ids.forEach(id => {
      team.roster1 = team.roster1.filter(x => x !== id);
      team.roster2 = team.roster2.filter(x => x !== id);
    });
  }
  function moveIn(team, ids, levels) {
    ids.forEach(id => {
      let level = levels[id] || "2軍";
      // v35：外援上限守衛——交易進來的外籍球員若會使1軍外援超限，改落2軍（上限僅限1軍）。
      // 此為所有交易路徑（玩家交易/AI提案/AI互易/風聲攔截）的共同出口，一處守住全部。
      if (level === "1軍" && S.players[id].foreign && foreignCountOnRoster1(team) >= FOREIGN_ROSTER_CAP) level = "2軍";
      S.players[id].team = team.id;
      S.players[id].level = level;
      if (level === "1軍") team.roster1.push(id); else team.roster2.push(id);
    });
  }
  const aLevels = {}; aGivesIds.forEach(id => { aLevels[id] = S.players[id].level; });
  const bLevels = {}; bGivesIds.forEach(id => { bLevels[id] = S.players[id].level; });
  moveOut(teamA, aGivesIds);
  moveOut(teamB, bGivesIds);
  moveIn(teamA, bGivesIds, bLevels);
  moveIn(teamB, aGivesIds, aLevels);
  // v32：任何交易成立後，涉及球員的進行中風聲即失效（球員已易主）
  if (typeof invalidateRumorsForPlayers === "function") invalidateRumorsForPlayers(aGivesIds.concat(bGivesIds));
}


function refillRoster(teamId, level, keepIds, targetPitchers, targetBatters) {
  // v34防呆：過濾掉指向已不存在球員的殘留id（正常流程不會出現；萬一存檔/外部操作留下髒資料，自清而非當機）
  const result = keepIds.filter(id => S.players[id]);
  let pCount = result.filter(id => S.players[id].isPitcher).length;
  let bCount = result.length - pCount;
  while (pCount < targetPitchers) {
    const np = generatePitcher(teamId, level);
    np.age = randInt(18, 21);
    S.players[np.id] = np;
    result.push(np.id);
    pCount++;
  }
  while (bCount < targetBatters) {
    const nb = generateBatter(teamId, level);
    nb.age = randInt(18, 21);
    S.players[nb.id] = nb;
    result.push(nb.id);
    bCount++;
  }
  return result;
}

function runOffseasonProgression() {
  let retiredCount = 0;
  S.retiredPlayers = S.retiredPlayers || {};
  Object.values(S.teams).forEach(team => {
    ["roster1", "roster2"].forEach(rk => {
      const keep = [];
      team[rk].forEach(pid => {
        const p = S.players[pid];
        if (!p) return;
        developPlayer(p, team);
        if (checkRetirement(p)) {
          p.retired = true;
          p.retiredYear = S.seasonYear;
          S.retiredPlayers[p.id] = p;
          delete S.players[p.id];
          retiredCount++;
        } else {
          keep.push(pid);
        }
      });
      team[rk] = keep;
    });
    // v37④隊長：在隊滿一季→忠誠回補（長期高忠誠→續約讓利）；失效（退休/離隊）則清除隊長身份
    if (team.captainId) {
      const cap = S.players[team.captainId];
      if (cap && cap.team === team.id && !cap.retired) cap.loyalty = clamp((cap.loyalty || 50) + 5, 0, 100);
    }
    if (typeof pruneCaptain === "function") pruneCaptain(team);
  });
  return { retiredCount };
}

/* ---------- 球探與選秀系統 ---------- */
function generateScout(teamId, area) {
  const areaLabel = { domestic: "國內", international: "國際", trade: "交易" }[area] || "國內";
  return {
    id: nextId("SC"), name: generateChineseName(), team: teamId, area: area || "domestic",
    areaLabel,
    accuracy: genRating(55, 15),
    coverage: area === "international" ? "海外地區（負責國際球員市場）" : (area === "trade" ? "全聯盟交易對象評估" : "本土＋鄰近地區"),
    specialty: choice(["打者潛力評估", "投手潛力評估", "綜合評估"]),
    contractYears: randInt(1, 4),
    salary: randInt(50, 200) * 10000
  };
}

/* ---------- 教練系統 ---------- */
const COACH_ROLES = ["總教練", "投手教練", "捕手教練", "內野守備教練", "外野守備教練", "打擊教練", "跑壘教練", "體能教練"];
const COACH_SPECIALTY_MAP = {
  "總教練": "leadership", "投手教練": "pitching", "捕手教練": "catching",
  "內野守備教練": "infield_d", "外野守備教練": "outfield_d", "打擊教練": "batting",
  "跑壘教練": "running", "體能教練": "conditioning"
};
const SPECIALTY_LABEL = {
  leadership: "統御領導", pitching: "投手調教", catching: "捕手養成",
  infield_d: "內野防守", outfield_d: "外野防守", batting: "打擊技術",
  running: "跑壘盜壘", conditioning: "體能耐久"
};
const SPECIAL_ABILITIES = {
  pitching: [{ name: "魔球開發", bonus: 0.15 }],
  batting: [{ name: "打擊大師", bonus: 0.15 }],
  running: [{ name: "盜壘教頭", bonus: 0.15 }],
  conditioning: [{ name: "鐵血調教", bonus: 0.15 }],
  infield_d: [{ name: "內野防守大師", bonus: 0.15 }],
  outfield_d: [{ name: "外野防守大師", bonus: 0.15 }],
  catching: [{ name: "配球大師", bonus: 0.15 }],
  leadership: [{ name: "統御全隊", bonus: 0.1 }]
};

function rollSpecialAbility(specialty, chance) {
  if (Math.random() >= chance) return null;
  const pool = SPECIAL_ABILITIES[specialty];
  if (!pool || pool.length === 0) return null;
  return { category: specialty, ...choice(pool) };
}

function generateCoach(teamId, level, role) {
  const specialty = COACH_SPECIALTY_MAP[role] || "leadership";
  return {
    id: nextId("CO"), name: generateChineseName(), team: teamId, level, role, specialty,
    teaching: genRating(55, 15),
    specialAbility: rollSpecialAbility(specialty, 0.2),
    contractYears: randInt(1, 5),
    salary: randInt(30, 150) * 10000,
    formerPlayer: false
  };
}

function buildCoachStaff(teamId) {
  const coaches = {};
  const staff = { "1軍": {}, "2軍": {} };
  ["1軍", "2軍"].forEach(level => {
    COACH_ROLES.forEach(role => {
      const c = generateCoach(teamId, level, role);
      coaches[c.id] = c;
      staff[level][role] = c.id;
    });
  });
  return { coaches, staff };
}

// v31空缺旗標輔助：教練 key＝`${level}|${role}`，球探 key＝area
function coachVacant(team, level, role) { return !!(team.staffVacancies && team.staffVacancies.coach && team.staffVacancies.coach[`${level}|${role}`]); }
function scoutVacant(team, area) { return !!(team.staffVacancies && team.staffVacancies.scout && team.staffVacancies.scout[area]); }
function setCoachVacancy(team, level, role, v) { if (!team.staffVacancies) team.staffVacancies = { coach: {}, scout: {} }; if (v) team.staffVacancies.coach[`${level}|${role}`] = true; else delete team.staffVacancies.coach[`${level}|${role}`]; }
function setScoutVacancy(team, area, v) { if (!team.staffVacancies) team.staffVacancies = { coach: {}, scout: {} }; if (v) team.staffVacancies.scout[area] = true; else delete team.staffVacancies.scout[area]; }

function specificCoachBonus(team, level, category) {
  if (!team.coachStaff || !team.coachStaff[level]) return 0;
  const role = Object.keys(COACH_SPECIALTY_MAP).find(r => COACH_SPECIALTY_MAP[r] === category);
  // v31：該項教練職位空缺（未補人）→ 該類加成完全歸零，不吃總教練外溢
  if (role && coachVacant(team, level, role)) return 0;
  const coach = role ? S.coaches[team.coachStaff[level][role]] : null;
  const headVacant = coachVacant(team, level, "總教練");
  const headCoach = headVacant ? null : S.coaches[team.coachStaff[level]["總教練"]];
  let bonus = 0;
  if (coach) bonus += (coach.teaching - 50) / 100;
  if (coach && coach.specialAbility && coach.specialAbility.category === category) bonus += coach.specialAbility.bonus;
  if (headCoach) bonus += (headCoach.teaching - 50) / 300;
  if (headCoach && headCoach.specialAbility && headCoach.specialAbility.category === "leadership") bonus += headCoach.specialAbility.bonus * 0.5;
  return clamp(bonus, -0.35, 0.45);
}

function isInfielderPos(p) { return ["1B", "2B", "3B", "SS", "C"].includes(p.positions[0].pos); }


function processCoachContracts() {
  let replaced = 0;
  const userRenewals = [];
  Object.values(S.teams).forEach(team => {
    if (!team.coachStaff) return;
    ["1軍", "2軍"].forEach(level => {
      COACH_ROLES.forEach(role => {
        const cid = team.coachStaff[level][role];
        const c = S.coaches[cid];
        if (!c) return;
        c.contractYears--;
        if (c.contractYears <= 0) {
          if (team.id === S.userTeamId) {
            // v31：玩家隊教練到期不再自動暫代——保留現任、進入休賽季續約談判佇列，
            // 談成則續約、不續/破局則職位空缺（加成歸零）直到玩家自由市場補人。
            userRenewals.push({ kind: "coach", staffId: cid, level, role });
          } else {
            // AI隊維持原本自動補人邏輯
            delete S.coaches[cid];
            const newCoach = generateCoach(team.id, level, role);
            S.coaches[newCoach.id] = newCoach;
            team.coachStaff[level][role] = newCoach.id;
            if (typeof setCoachVacancy === "function") setCoachVacancy(team, level, role, false); // v35：補人同步清旗標（玩家離開的舊隊不再永久歸零）
            replaced++;
          }
        }
      });
    });
  });
  S.pendingCoachHires = []; // v31：玩家隊不再自動暫代，改走續約佇列
  return { replaced, userRenewals };
}

/* v31：球探合約到期處理（球探現已有 contractYears，randInt 1~4 年）。
   玩家隊到期球探→續約談判佇列；AI隊自動重新聘用（沿用舊自動補人精神）。 */
function processScoutContracts() {
  const userRenewals = [];
  Object.values(S.teams).forEach(team => {
    if (!team.scouts) return;
    ["domestic", "international", "trade"].forEach(area => {
      const s = team.scouts[area];
      if (!s) return;
      if (typeof s.contractYears !== "number") s.contractYears = randInt(1, 4);
      s.contractYears--;
      if (s.contractYears <= 0) {
        if (team.id === S.userTeamId) {
          userRenewals.push({ kind: "scout", area, scoutId: s.id });
        } else {
          team.scouts[area] = generateScout(team.id, area);
          if (typeof setScoutVacancy === "function") setScoutVacancy(team, area, false); // v35：補人同步清旗標
        }
      }
    });
  });
  return { userRenewals };
}

function swapCoachLevels(teamId, role) {
  const team = S.teams[teamId];
  if (!team || !team.coachStaff) return;
  const id1 = team.coachStaff["1軍"][role];
  const id2 = team.coachStaff["2軍"][role];
  const c1 = S.coaches[id1], c2 = S.coaches[id2];
  if (!c1 || !c2) return;
  c1.level = "2軍"; c2.level = "1軍";
  team.coachStaff["1軍"][role] = id2;
  team.coachStaff["2軍"][role] = id1;
  UI.flash = `${c1.name} 與 ${c2.name} 已互換1軍／2軍${role}職務。`;
  persist();
  render();
}

function generateCoachCandidates(teamId, level, role) {
  const specialty = COACH_SPECIALTY_MAP[role] || "leadership";
  const retireePool = Object.values(S.retiredPlayers)
    .filter(p => !p.becameCoach)
    .sort((a, b) => b.coachingAptitude - a.coachingAptitude)
    .slice(0, 6);
  const retireeCandidates = retireePool.slice(0, 3).map(p => ({
    kind: "retiree", sourceId: p.id, name: p.name, age: p.age,
    teaching: p.coachingAptitude,
    specialAbility: rollSpecialAbility(specialty, 0.2),
    contractYears: randInt(2, 5), salary: randInt(30, 150) * 10000
  }));
  const freshCandidates = [];
  for (let i = 0; i < 2; i++) {
    const c = generateCoach(teamId, level, role);
    freshCandidates.push({
      kind: "fresh", sourceId: null, name: c.name, age: null,
      teaching: c.teaching, specialAbility: c.specialAbility,
      contractYears: c.contractYears, salary: c.salary
    });
  }
  return retireeCandidates.concat(freshCandidates);
}

function openCoachPicker(role) {
  const team = S.teams[S.userTeamId];
  const level = UI.coachTab || "1軍";
  UI.coachPicker = role;
  UI.coachCandidates = generateCoachCandidates(team.id, level, role);
  render();
}

function hireCoachCandidate(role, candidateIdx) {
  const team = S.teams[S.userTeamId];
  const level = UI.coachTab || "1軍";
  const candidate = (UI.coachCandidates || [])[candidateIdx];
  if (!candidate) return;
  ensureFinance(team);
  const oldId = team.coachStaff[level][role];
  const specialty = COACH_SPECIALTY_MAP[role] || "leadership";
  let newCoach;
  if (candidate.kind === "retiree") {
    const p = S.retiredPlayers[candidate.sourceId];
    if (!p || p.becameCoach) {
      UI.flash = "該退休球員人選已無法指派（可能剛被其他安排指派走），請重新開啟比較清單。";
      UI.coachPicker = null; UI.coachCandidates = null;
      render();
      return;
    }
    const yearsSinceRetirement = Math.max(0, S.seasonYear - p.retiredYear);
    let refusalChance = clamp(0.35 - yearsSinceRetirement * 0.1, 0.03, 0.5);
    if (team.finance.budget < 0) refusalChance = clamp(refusalChance + 0.25, 0.03, 0.85);
    else if (team.finance.budget < 5000000) refusalChance = clamp(refusalChance + 0.1, 0.03, 0.85);
    if (Math.random() < refusalChance) {
      UI.coachRefusal = { playerId: p.id, teamId: team.id, level, role };
      render();
      return;
    }
    p.becameCoach = true;
    newCoach = {
      id: nextId("CO"), name: p.name, team: team.id, level, role, specialty,
      teaching: candidate.teaching, specialAbility: candidate.specialAbility,
      contractYears: candidate.contractYears, salary: candidate.salary, formerPlayer: true
    };
  } else {
    newCoach = {
      id: nextId("CO"), name: candidate.name, team: team.id, level, role, specialty,
      teaching: candidate.teaching, specialAbility: candidate.specialAbility,
      contractYears: candidate.contractYears, salary: candidate.salary, formerPlayer: false
    };
  }
  if (oldId) delete S.coaches[oldId];
  S.coaches[newCoach.id] = newCoach;
  team.coachStaff[level][role] = newCoach.id;
  if (typeof setCoachVacancy === "function") setCoachVacancy(team, level, role, false); // v31：補人後清除空缺旗標
  S.pendingCoachHires = (S.pendingCoachHires || []).filter(x => !(x.level === level && x.role === role));
  UI.coachPicker = null; UI.coachCandidates = null;
  UI.flash = `已聘用 ${newCoach.name} 擔任 ${team.name} ${level}${role}。`;
  persist();
  render();
}

function assignRetiredPlayerAsCoach(playerId, teamId, level, role) {
  const p = S.retiredPlayers[playerId];
  if (!p || p.becameCoach) return;
  const team = S.teams[teamId];
  if (!team || !team.coachStaff) return;
  ensureFinance(team);
  const yearsSinceRetirement = Math.max(0, S.seasonYear - p.retiredYear);
  let refusalChance = clamp(0.5 - yearsSinceRetirement * 0.15, 0.05, 0.6);
  if (team.finance.budget < 0) refusalChance = clamp(refusalChance + 0.25, 0.05, 0.9); // 球隊財務吃緊，退休球員較不願意加入
  else if (team.finance.budget < 5000000) refusalChance = clamp(refusalChance + 0.1, 0.05, 0.9);
  if (Math.random() < refusalChance) {
    UI.coachRefusal = { playerId, teamId, level, role };
    render();
    return;
  }
  const oldCoachId = team.coachStaff[level][role];
  if (oldCoachId) delete S.coaches[oldCoachId];
  p.becameCoach = true;
  const specialty = COACH_SPECIALTY_MAP[role] || "leadership";
  const newCoach = {
    id: nextId("CO"), name: p.name, team: teamId, level, role, specialty,
    teaching: p.coachingAptitude,
    specialAbility: rollSpecialAbility(specialty, 0.15),
    contractYears: randInt(2, 5),
    salary: randInt(30, 150) * 10000, formerPlayer: true
  };
  S.coaches[newCoach.id] = newCoach;
  team.coachStaff[level][role] = newCoach.id;
  if (typeof setCoachVacancy === "function") setCoachVacancy(team, level, role, false); // v31
  UI.coachRefusal = null;
  UI.flash = `${p.name} 就任 ${team.name} ${level}${role}。`;
  persist();
  render();
}

function resolveCoachRefusalReinstate() {
  const r = UI.coachRefusal;
  if (!r) return;
  UI.coachRefusal = null;
  reinstatePlayer(r.playerId);
}
function resolveCoachRefusalDismiss() {
  UI.coachRefusal = null;
  render();
}

// ---------- 現役球員「建議退休轉任教練／球探」連動機制 ----------
// 賽季中僅能使用此機制（從現役球員中臨時徵詢），拒絕機率很高；
// 休賽季時同樣可用，也可以直接從既有退休球員池挑選（見 generateCoachCandidates/openCoachPicker）。
// v25全面重寫（Mars定案規格）：
// 球員卡固定兩鈕「釋出至自由球員市場」（確認後直接執行，無拒絕）＋「建議轉任教練／球探」（附比對、單次判定）。
// 單次判定：一次擲骰同時決定「願不願意退休＋接任職務」，杜絕連按洗骰。
// 婉拒 → 顯示「釋出自由球員／繼續留隊」卡片，且該球員 roleOfferDeclinedYear 記錄本季，
//        同一休賽季內按鈕鎖住顯示「本休賽季已婉拒過」。
// 成功 → 正式退休就任（球季中則為臨時兼任），跳回名單並提示。
function roleOfferLockedThisYear(p) { return p.roleOfferDeclinedYear === S.seasonYear; }
function suggestPlayerRetireForRole(playerId, level, role, roleType) {
  const p = S.players[playerId];
  if (!p) return;
  const team = S.teams[p.team];
  if (!team) return;
  if (roleOfferLockedThisYear(p)) {
    UI.flash = `${p.name} 本休賽季已婉拒過轉任邀約，請等下個休賽季再提。`;
    render();
    return;
  }
  ensureFinance(team);
  const isMidSeason = S.currentDay > 0 && S.currentDay < (S.schedule ? S.schedule.length : 129);
  const roleLabel = roleType === "scout"
    ? (({ domestic: "國內", international: "國際", trade: "交易" })[role] || "國內") + "球探"
    : `${level}${role}`;
  // 單次判定的接受機率：年齡越大、教練潛力越高越願意；球季中大幅打折；財務吃緊再打折
  let chance = clamp(0.18 + (p.age - 30) * 0.06 + (p.coachingAptitude - 50) * 0.004, 0.05, 0.8);
  if (isMidSeason) chance *= 0.25;
  if (team.finance.budget < 0) chance *= 0.6;
  else if (team.finance.budget < 5000000) chance *= 0.85;
  if (Math.random() >= chance) {
    p.roleOfferDeclinedYear = S.seasonYear; // 鎖住本季按鈕
    UI.retireOffer = { playerId, level, role, roleType, roleLabel, reason: isMidSeason ? "declinedMidSeason" : "declinedRole" };
    persist();
    render();
    return;
  }
  if (isMidSeason) {
    finalizeRoleFromActivePlayer(p, team, level, role, roleType, true);
  } else {
    retirePlayerToList(playerId);
    finalizeRoleFromActivePlayer(S.retiredPlayers[playerId], team, level, role, roleType, false);
  }
  UI.retireOffer = null;
  UI.screen = "roster"; // 成功後跳回名單（原詳情頁球員已不在現役，避免空白頁）
  persist();
  render();
}

// 「釋出至自由球員市場」固定鈕：由UI確認後呼叫，直接執行、無拒絕判定
function releaseActivePlayer(playerId) {
  const p = S.players[playerId];
  if (!p) return;
  const team = S.teams[p.team];
  if (!team) return;
  releasePlayerToFreeAgency(p, team);
  UI.flash = `${p.name} 已釋出至自由球員市場。`;
  UI.releaseConfirmId = null;
  UI.screen = "roster";
  persist();
  render();
}

function finalizeRoleFromActivePlayer(p, team, level, role, roleType, isTemporary) {
  if (!isTemporary) {
    // 從退休名單「轉任」：移除現役球員身份的動作已由retirePlayerToList完成
  } else {
    // 賽季中臨時兼任：直接從現役名單移除，暫代教練/球探職務
    team.roster1 = team.roster1.filter(id => id !== p.id);
    team.roster2 = team.roster2.filter(id => id !== p.id);
    delete S.players[p.id];
    p.retired = true; p.retiredYear = S.seasonYear; p.becameCoach = roleType !== "scout"; p.becameScout = roleType === "scout";
    S.retiredPlayers[p.id] = p;
  }
  if (roleType === "scout") {
    p.becameScout = true;
    const areaLabel = { domestic: "國內", international: "國際", trade: "交易" }[role] || "國內";
    const newScout = {
      id: nextId("SC"), name: p.name, team: team.id, area: role, areaLabel,
      accuracy: clamp(Math.round((p.coachingAptitude || 50) * 0.85 + genRating(50, 10) * 0.15), 30, 95),
      coverage: role === "international" ? "海外地區（負責國際球員市場）" : (role === "trade" ? "全聯盟交易對象評估" : "本土＋鄰近地區"),
      specialty: choice(["打者潛力評估", "投手潛力評估", "綜合評估"]),
      contractYears: randInt(2, 5), salary: randInt(50, 200) * 10000, formerPlayer: true
    };
    team.scouts[role] = newScout;
    UI.flash = `${p.name} ${isTemporary ? "暫時兼任" : "退休並就任"} ${team.name} ${areaLabel}球探。`;
  } else {
    p.becameCoach = true;
    const oldCoachId = team.coachStaff[level][role];
    if (oldCoachId) delete S.coaches[oldCoachId];
    const specialty = COACH_SPECIALTY_MAP[role] || "leadership";
    const newCoach = {
      id: nextId("CO"), name: p.name, team: team.id, level, role, specialty,
      teaching: p.coachingAptitude || 50, specialAbility: rollSpecialAbility(specialty, 0.15),
      contractYears: randInt(2, 5), salary: randInt(30, 150) * 10000, formerPlayer: true
    };
    S.coaches[newCoach.id] = newCoach;
    team.coachStaff[level][role] = newCoach.id;
    UI.flash = `${p.name} ${isTemporary ? "暫時兼任" : "退休並就任"} ${team.name} ${level}${role}。`;
  }
}

function resolveRetireOfferKeep() {
  UI.retireOffer = null;
  render();
}
function resolveRetireOfferRelease() {
  const offer = UI.retireOffer;
  if (!offer) return;
  const p = S.players[offer.playerId];
  const team = p ? S.teams[p.team] : null;
  if (p && team) {
    releasePlayerToFreeAgency(p, team);
    UI.flash = `${p.name} 婉拒退休建議，已釋出至自由球員市場。`;
    persist();
  }
  UI.retireOffer = null;
  render();
}

function scoutedEstimate(trueVal, accuracy) {
  const errorRange = clamp(30 - accuracy * 0.28, 3, 26);
  const noise = (Math.random() * 2 - 1) * errorRange;
  return clamp(Math.round(trueVal + noise), 15, 99);
}

function gradeFromValue(v) {
  if (v >= 75) return "S";
  if (v >= 65) return "A";
  if (v >= 55) return "B";
  if (v >= 45) return "C";
  return "D";
}

function maturityLabel(age) {
  if (age <= 19) return "長期養成型（預估至少4~6年才可能接近天花板評等）";
  if (age <= 21) return "潛力新秀（預估約3~5年逐步成長至天花板附近）";
  return "即戰力可期（成長空間較有限，但可望較快登上一軍）";
}

function confidenceLabel(accuracy) {
  if (accuracy >= 70) return "評估高度可信";
  if (accuracy >= 45) return "評估中等可信，仍有落差空間";
  return "球探情報有限，評估落差可能較大";
}

function pitcherArchetype(velocity, control) {
  if (velocity - control >= 12) return "速球型";
  if (control - velocity >= 12) return "控球型";
  return "均衡型";
}
function batterArchetype(contact, power, speed, fielding) {
  const entries = [["安打型", contact], ["長打型", power], ["速度型", speed], ["守備型", fielding]];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function attachScoutedEstimates(pool, scout) {
  // ⑦統一採用「有效精準度」（球探能力＋球探辦公室加成），並擴充評估欄位讓資訊比照本土選秀完整
  const userTeam = S.teams[S.userTeamId];
  const accuracy = (typeof effectiveScoutAccuracy === "function") ? effectiveScoutAccuracy(userTeam, scout) : scout.accuracy;
  pool.forEach(p => {
    if (p.isPitcher) {
      p.scouted = {
        velocity: scoutedEstimate(p.velocity, accuracy),
        control: scoutedEstimate(p.control, accuracy),
        stamina: scoutedEstimate(p.stamina, accuracy),
        composure: scoutedEstimate(p.composure, accuracy)
      };
      p.archetype = pitcherArchetype(p.scouted.velocity, p.scouted.control);
    } else {
      p.scouted = {
        contact: scoutedEstimate(p.contact, accuracy),
        power: scoutedEstimate(p.power, accuracy),
        eye: scoutedEstimate(p.eye, accuracy),
        speed: scoutedEstimate(p.speed, accuracy),
        steal: scoutedEstimate(p.steal, accuracy),
        fielding: scoutedEstimate(p.fielding, accuracy),
        arm: scoutedEstimate(p.arm, accuracy),
        bunting: scoutedEstimate(p.bunting || 45, accuracy),
        composure: scoutedEstimate(p.composure, accuracy)
      };
      p.archetype = batterArchetype(p.scouted.contact, p.scouted.power, p.scouted.speed, p.scouted.fielding);
    }
    const estOverall = p.isPitcher ? (p.scouted.velocity + p.scouted.control) / 2
      : (p.scouted.contact + p.scouted.power + p.scouted.eye) / 3;
    p.scoutedGrade = gradeFromValue(estOverall);
    p.scoutedOverall = Math.round(estOverall);
    p.scoutedCeilingVal = scoutedEstimate(p.potential, accuracy); // v36：存下天花板「數值」，等級由同一數值推導（確保徽章與數字一致）
    p.scoutedCeiling = gradeFromValue(p.scoutedCeilingVal);
    p.maturity = maturityLabel(p.age);
    p.scoutConfidence = confidenceLabel(accuracy);
  });
}

// 天花板評等的真實數值區間（對應gradeFromValue的門檻）
const CEILING_GRADE_BANDS = { S: [75, 93], A: [65, 74], B: [55, 64], C: [45, 54], D: [24, 44] };
function potentialForCeilingGrade(grade) {
  const [lo, hi] = CEILING_GRADE_BANDS[grade];
  return randInt(lo, hi);
}
// 每屆選秀天花板等級配額：等級越高名額越稀少（S級每年僅1~2人、A級4~8人），
// B級以下不設固定名額上限，但仍依比例遞增，避免超頂級新秀氾濫。
function draftClassCeilingSequence(size) {
  const quotaS = randInt(1, 2);
  const quotaA = randInt(4, 8);
  const quotaB = randInt(Math.round(size * 0.12), Math.round(size * 0.22));
  const seq = [];
  for (let i = 0; i < quotaS; i++) seq.push("S");
  for (let i = 0; i < quotaA; i++) seq.push("A");
  for (let i = 0; i < quotaB; i++) seq.push("B");
  while (seq.length < size) seq.push(Math.random() < 0.55 ? "C" : "D");
  return shuffle(seq).slice(0, size);
}
function generateDraftPool(size) {
  const pool = [];
  const ceilingSeq = draftClassCeilingSequence(size);
  for (let i = 0; i < size; i++) {
    const isPitcher = Math.random() < 0.45;
    const forcedPotential = potentialForCeilingGrade(ceilingSeq[i]);
    const p = isPitcher ? generatePitcher(null, "選秀", forcedPotential) : generateBatter(null, "選秀", forcedPotential);
    p.age = randInt(18, 22);
    calibrateProspectToCeiling(p); // v25修正：新秀現況一律從天花板往下推算，杜絕「現況S天花板D、選進來就衰退」
    pool.push(p);
  }
  return pool;
}
// v25：新秀現況校準——以潛力天花板為基準，往下保留8~25點成長空間，
// 各屬性再帶±8的個體差異；確保潛力值恆不低於現況綜合值（配合ageAdjustRating的room保護雙保險）。
function calibrateProspectToCeiling(p) {
  const room = randInt(8, 25);
  const base = clamp(p.potential - room, 20, 90);
  const v = () => clamp(base + randInt(-8, 8), 20, 90);
  if (p.isPitcher) {
    p.velocity = v(); p.control = v(); p.stamina = v(); p.composure = v();
    p.pitches.forEach(pt => { pt.stuff = v(); pt.control = v(); });
  } else {
    ["contact", "power", "eye", "vsL", "vsR", "speed", "steal", "fielding", "arm", "stamina", "composure", "bunting"].forEach(k => { p[k] = v(); });
    if (p.gameCalling !== null) { p.gameCalling = v(); p.framing = v(); p.caughtStealing = v(); }
  }
  const curOverall = trueOverall(p);
  if (p.potential < curOverall) p.potential = clamp(Math.round(curOverall + randInt(2, 6)), 24, 93);
}

function buildDraftOrder(rounds) {
  const worstFirst = Object.values(S.teams).slice()
    .sort((a, b) => (a.wins / Math.max(1, a.wins + a.losses)) - (b.wins / Math.max(1, b.wins + b.losses)))
    .map(t => t.id);
  const order = [];
  for (let r = 0; r < rounds; r++) {
    const roundOrder = (r % 2 === 0) ? worstFirst : worstFirst.slice().reverse();
    roundOrder.forEach(tid => order.push(tid));
  }
  return order;
}

// v29國內球探獨家新秀：國內球探有效精準度夠高時，每屆選秀能額外挖出1~3位「其他球團看不到」的獨家新秀。
// 獨家新秀是「額外加進選秀池」的（不佔每屆S/A級固定配額——挖到S級獨家不會讓公開池的S級變少），
// 等級偏高（S 30%／A 45%／B 25%），只有玩家能選、AI選秀會直接跳過他們。
function exclusiveDraftSlots(team) {
  const scout = team && team.scouts ? team.scouts.domestic : null;
  if (!scout) return 0;
  const acc = effectiveScoutAccuracy(team, scout);
  if (acc >= 87) return 3;
  if (acc >= 75) return 2;
  if (acc >= 63) return 1;
  return 0;
}
function generateExclusiveDraftProspects(team) {
  const n = exclusiveDraftSlots(team);
  const list = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    const grade = r < 0.30 ? "S" : (r < 0.75 ? "A" : "B");
    const isPitcher = Math.random() < 0.45;
    const forcedPotential = potentialForCeilingGrade(grade);
    const p = isPitcher ? generatePitcher(null, "選秀", forcedPotential) : generateBatter(null, "選秀", forcedPotential);
    p.age = randInt(18, 22);
    calibrateProspectToCeiling(p);
    p.exclusive = true; // 獨家標記：AI不可選、UI顯示「獨家情報」徽章
    list.push(p);
  }
  return list;
}
function startDraft() {
  const rounds = 6;
  const pool = generateDraftPool(20 * rounds);
  // v29：附加玩家國內球探的獨家新秀（額外名額，不影響公開池等級配額）
  const exclusives = generateExclusiveDraftProspects(S.teams[S.userTeamId]);
  exclusives.forEach(p => pool.push(p));
  attachScoutedEstimates(pool, S.teams[S.userTeamId].scouts.domestic);
  const order = buildDraftOrder(rounds);
  S.draft = { active: true, rounds, order, pickIndex: 0, pool, picks: [], userAutoSkip: false };
  advanceDraftUntilUserTurn();
}

// 僅供AI球隊使用：AI選秀維持系統立即自動談約（單次判定），
// 若新秀合約談不成，該新秀直接從本屆選秀「消失」（不會回到選秀池被其他球隊選走，也不會隔年再出現）。
function resolvePick(teamId, chosenPlayer) {
  const round = Math.floor(S.draft.pickIndex / 20) + 1;
  const pickNo = (S.draft.pickIndex % 20) + 1;
  const team = S.teams[teamId];
  ensureFinance(team);
  const deal = attemptRookieContract(round, chosenPlayer);
  if (!deal.success) {
    S.draft.picks.push({ round, pick: pickNo, team: teamId, playerId: null, failed: true, failedName: chosenPlayer.name });
    S.draft.pickIndex++;
    return;
  }
  chosenPlayer.team = teamId;
  chosenPlayer.level = "2軍";
  chosenPlayer.salary = deal.salary;
  chosenPlayer.contractYears = deal.years;
  S.players[chosenPlayer.id] = chosenPlayer;
  team.roster2.push(chosenPlayer.id);
  team.finance.budget -= deal.bonus;
  team.finance.signingBonusSpent = (team.finance.signingBonusSpent || 0) + deal.bonus;
  S.draft.picks.push({
    round, pick: pickNo,
    team: teamId, playerId: chosenPlayer.id, signingBonus: deal.bonus
  });
  S.draft.pickIndex++;
}

function aiDraftPick(teamId) {
  const pool = S.draft.pool;
  if (pool.length === 0) return null;
  pool.sort((a, b) => trueOverall(b) - trueOverall(a));
  // v29：獨家新秀是玩家球探的人脈，AI球團接觸不到、選秀時直接跳過
  const idx = pool.findIndex(p => !p.exclusive);
  if (idx < 0) return null;
  return pool.splice(idx, 1)[0];
}

function advanceDraftUntilUserTurn() {
  while (S.draft.pickIndex < S.draft.order.length) {
    const teamId = S.draft.order[S.draft.pickIndex];
    if (teamId === S.userTeamId) {
      if (S.draft.userAutoSkip) {
        S.draft.pickIndex++;
        S.draft.skippedByUser = (S.draft.skippedByUser || 0) + 1;
        continue;
      }
      return;
    }
    const chosen = aiDraftPick(teamId);
    if (!chosen) { S.draft.pickIndex++; continue; }
    resolvePick(teamId, chosen);
  }
  finishDraft();
}

// 玩家選秀：改走互動式談約（AI開價、玩家可調整、最多5次來回機會），詳見02-finance.js的談約系統。
// 談約失敗（5次都談不成）：這位新秀直接消失，不會回到選秀池讓其他球隊選走。
function userDraftPick(playerId) {
  const idx = S.draft.pool.findIndex(p => p.id === playerId);
  if (idx < 0) return;
  const round = Math.floor(S.draft.pickIndex / 20) + 1;
  const pickNo = (S.draft.pickIndex % 20) + 1;
  const chosen = S.draft.pool.splice(idx, 1)[0];
  startNegotiation("rookie", chosen.id, { teamId: S.userTeamId, round, pickNo, playerObj: chosen });
}

function userSkipPick() {
  UI.draftSkipConfirm = true;
  render();
}
function confirmSkipOnce() {
  UI.draftSkipConfirm = false;
  S.draft.pickIndex++;
  S.draft.skippedByUser = (S.draft.skippedByUser || 0) + 1;
  advanceDraftUntilUserTurn();
  persist();
  render();
}
function confirmSkipAllRemaining() {
  UI.draftSkipConfirm = false;
  S.draft.userAutoSkip = true;
  S.draft.pickIndex++;
  S.draft.skippedByUser = (S.draft.skippedByUser || 0) + 1;
  advanceDraftUntilUserTurn();
  persist();
  render();
}
function cancelSkip() {
  UI.draftSkipConfirm = false;
  render();
}

function promotePlayer(playerId) {
  const p = S.players[playerId];
  const team = S.teams[S.userTeamId];
  if (!team.roster2.includes(playerId)) return;
  team.roster2 = team.roster2.filter(id => id !== playerId);
  team.roster1 = team.roster1.concat([playerId]);
  p.level = "1軍";
  UI.flash = `${p.name} 升上1軍。1軍目前 ${team.roster1.length} 人（編制28人）。`;
  persist();
  render();
}

function demotePlayer(playerId) {
  const p = S.players[playerId];
  const team = S.teams[S.userTeamId];
  if (!team.roster1.includes(playerId)) return;
  team.roster1 = team.roster1.filter(id => id !== playerId);
  team.roster2 = team.roster2.concat([playerId]);
  p.level = "2軍";
  UI.flash = `${p.name} 下放2軍。1軍目前 ${team.roster1.length} 人（編制28人）。`;
  persist();
  render();
}

function autoPromote(team) {
  function need() {
    const list = team.roster1.map(id => S.players[id]).filter(Boolean);
    return { p: 13 - list.filter(p => p.isPitcher).length, b: 15 - list.filter(p => !p.isPitcher).length };
  }
  let n = need();
  let guard = 0;
  while ((n.p > 0 || n.b > 0) && guard < 60) {
    guard++;
    // v35：外援上限守衛——1軍外援已滿時，升格候選排除外籍球員（上限僅限1軍）
    const foreignFull = foreignCountOnRoster1(team) >= FOREIGN_ROSTER_CAP;
    const pool2 = team.roster2.map(id => S.players[id]).filter(Boolean).filter(p => !(foreignFull && p.foreign));
    let candidate = null;
    if (n.p > 0) candidate = pool2.filter(p => p.isPitcher).sort((a, b) => trueOverall(b) - trueOverall(a))[0];
    if (!candidate && n.b > 0) candidate = pool2.filter(p => !p.isPitcher).sort((a, b) => trueOverall(b) - trueOverall(a))[0];
    if (!candidate) break;
    team.roster2 = team.roster2.filter(id => id !== candidate.id);
    team.roster1.push(candidate.id);
    candidate.level = "1軍";
    n = need();
  }
}

function capRoster(team, rk, target, protectedIds) {
  if (team[rk].length <= target) return;
  const excess = team[rk].length - target;
  const all = team[rk].map(id => S.players[id]).filter(Boolean);
  const unprotected = all.filter(p => !protectedIds.has(p.id)).sort((a, b) => trueOverall(a) - trueOverall(b));
  const protectedList = all.filter(p => protectedIds.has(p.id)).sort((a, b) => trueOverall(a) - trueOverall(b));
  const cutOrder = unprotected.concat(protectedList);
  const toCut = cutOrder.slice(0, excess);
  const cutIds = new Set(toCut.map(p => p.id));
  team[rk] = team[rk].filter(id => !cutIds.has(id));
  toCut.forEach(p => { delete S.players[p.id]; });
  return toCut.length;
}

function finishDraft() {
  S.draft.active = false;
  S.draftDoneYear = S.seasonYear; // v32：選秀後才重新開放交易窗口
  if (typeof runOffseasonAiTrades === "function") runOffseasonAiTrades(); // v32：休賽季AI互相交易批次（開幕定案，期間可插手）
  Object.values(S.teams).forEach(team => {
    const protectedIds = new Set(S.draft.picks.filter(pk => pk.team === team.id).map(pk => pk.playerId));
    autoPromote(team);
    if (team.isUser) {
      // 玩家主動放棄的名額尊重其選擇，不強制補人，留給未來交易／國際選秀補強
      capRoster(team, "roster1", 28, protectedIds);
      capRoster(team, "roster2", 32, protectedIds);
    } else {
      team.roster1 = refillRoster(team.id, "1軍", team.roster1, 13, 15);
      team.roster2 = refillRoster(team.id, "2軍", team.roster2, 15, 17);
      capRoster(team, "roster1", 28, protectedIds);
      capRoster(team, "roster2", 32, protectedIds);
    }
    // ④金額稽核修正：refillRoster補進的AI球員先前沒有薪資/合約欄位（顯示會出現「-」），
    // 統一在選秀收尾時refreshPayroll補齊（該函式會為缺漏者計算市場薪資並指派合約年限）
    refreshPayroll(team, S.players);
  });
  persist();
}

function enterOffseason() {
  // v35：重入防護——本年度已結算過（例如重載後從頒獎畫面再點一次「進入休賽季」）
  // 直接回到休賽季摘要，避免財務/老化/合約被二次結算。
  if (S.offseasonEnteredYear === S.seasonYear && S.offseasonSummary) {
    UI.screen = (S.gmCareer && S.gmCareer.fired) ? "gameOver" : "offseasonSummary";
    render();
    return;
  }
  S.offseasonEnteredYear = S.seasonYear;
  const missionResult = (typeof evaluateSponsorMission === "function") ? evaluateSponsorMission() : null; // v25贊助商任務結算（在財務結算前入帳）
  const financeReports = settleLeagueFinance();
  // v27：GM信任度/KPI年度結算（需在財務結算後，才能判定赤字目標；信任歸零＝解職）
  const kpiResult = (typeof settleSeasonKPI === "function") ? settleSeasonKPI(financeReports) : null;
  const { retiredCount } = runOffseasonProgression();
  if (typeof decayGmMemories === "function") decayGmMemories(); // v27：各隊對你的記憶逐年淡化
  refillInternationalMarket();
  if (typeof generateAgencyOffseasonPerks === "function" && !S.sabbatical) generateAgencyOffseasonPerks(); // v33：事務所引薦/情報（須在AI簽援前，獨家才生效）
  if (typeof aiSignInternationalPlayers === "function") aiSignInternationalPlayers(); // v27：AI依球團個性簽國際球員
  const userTeam = S.teams[S.userTeamId];
  // 玩家球隊的合約續約改為互動式（談約或不續約），不再由系統自動決定；AI球隊維持原本自動邏輯。
  const contractResult = processPlayerContracts(userTeam, true);
  Object.values(S.teams).forEach(t => { if (t.id !== S.userTeamId) processPlayerContracts(t, false); });
  const coachResult = processCoachContracts();
  const scoutResult = processScoutContracts();
  // v31：玩家隊到期教練/球探合併成續約佇列（休賽季逐一談判；不許暫代）
  S.pendingStaffRenewals = (coachResult.userRenewals || []).concat(scoutResult.userRenewals || []);
  const coachesReplaced = coachResult.replaced;
  const retiredThisYear = Object.values(S.retiredPlayers).filter(p => p.retiredYear === S.seasonYear);
  const myRetired = retiredThisYear.filter(p => p.team === S.userTeamId);
  S.pendingContractRenewals = contractResult.pending || [];
  S.offseasonSummary = {
    retiredCount, coachesReplaced, myRetiredIds: myRetired.map(p => p.id),
    myFinanceReport: financeReports[S.userTeamId],
    sponsorMissionResult: missionResult,
    kpiResult, // v27：年度KPI結算結果（休賽季摘要顯示）
    contractsRenewed: 0, contractsDeparted: []
  };
  ensureFinance(userTeam);
  S.forcedCutRequired = userTeam.finance.budget < 0;
  // v27：信任歸零＝遭高層解職，改進Game Over畫面（生涯總結）
  UI.screen = (kpiResult && kpiResult.fired) ? "gameOver" : "offseasonSummary";
  persist();
  render();
}

// 從「休賽季異動摘要」畫面往下一步：若財務赤字則先強制裁員、若有待續約名單則先談約，最後才進選秀會
function proceedFromOffseasonSummary() {
  if (S.forcedCutRequired) { UI.screen = "financeCuts"; render(); return; }
  if ((S.pendingContractRenewals || []).length > 0) { UI.screen = "contractRenewals"; render(); return; }
  proceedToStaffOrDraft();
}
function proceedFromFinanceCuts() {
  S.forcedCutRequired = false;
  if ((S.pendingContractRenewals || []).length > 0) { UI.screen = "contractRenewals"; render(); return; }
  proceedToStaffOrDraft();
}
function proceedFromContractRenewals() {
  if ((S.pendingContractRenewals || []).length > 0) return;
  proceedToStaffOrDraft();
}
// v31：合約續約完成後，先處理玩家隊到期教練/球探續約，再進選秀
function proceedToStaffOrDraft() {
  if (typeof sanitizeStaffRenewals === "function") sanitizeStaffRenewals(); // v35：擋掉不屬於現任球隊的殘留項目
  if (Array.isArray(S.pendingStaffRenewals) && S.pendingStaffRenewals.length > 0) { UI.screen = "staffRenewal"; render(); return; }
  proceedToDraft();
}
function proceedFromStaffRenewals() {
  proceedToDraft();
}

function proceedToDraft() {
  // v35：本年度已辦過選秀（重載後重走休賽季流程）→ 直接顯示選秀結束摘要，不重辦
  if (S.draftDoneYear === S.seasonYear && S.draft && !S.draft.active) {
    UI.screen = "draft";
    persist();
    render();
    return;
  }
  startDraft();
  UI.screen = "draft";
  persist();
  render();
}

// 新開局第一次（尚未打過任何一季）：選秀會結束後直接進入「開幕春訓」畫面，
// 不套用年度轉換的seasonYear遞增／重建賽程等邏輯（球季1的賽程在newGame()時已經建立好）。
function beginFirstSeason() {
  S.gameStarted = true;
  if (typeof generateSeasonKPI === "function") generateSeasonKPI(); // v27：高層公布年度目標
  prepareSpringCamp(); // v25：選秀結束後先進春訓（母國免費／海外付費），完成後才開幕
  UI.screen = "springCamp";
  UI.flash = `選秀會與談約已完成，接下來安排第 ${S.seasonYear} 年球季的春訓！`;
  persist();
  render();
}

/* ==== v31-B 季後自主訓練窗（春訓之外的獨立小階段）====
   ① 自主訓練：全員依生涯型態小幅成長，並有機率獲得新「後天特質」；標竿老將有機率領悟「特殊技/稱號」。
   ② 傳承：資深老將（高齡＋持有後天特質或稱號）自動配對隊內最年輕高潛力者，機率把後天特質/稱號傳給後輩。
      規則：自動配對；僅後天型可傳；每隊每年至多 1 次傳承成功；後輩疊加上限 3 個特質/稱號。 */
function batterSignatureSkill(p) {
  if (p.eye >= 85) return "eye_master";
  if (p.power >= 85) return "power_flag";
  if (p.contact >= 85) return "contact_zen";
  if ((p.speed || 0) >= 83 && (p.steal || 0) >= 83) return "speed_heir";
  if ((p.fielding || 0) >= 85) return "glove_magic";
  return null;
}
function pitcherSignatureSkill(p) {
  if (p.control >= 85) return "control_ace";
  if (p.velocity >= 85) return "fire_legacy";
  if (p.stamina >= 85) return "iron_arm";
  if ((p.composure || 0) >= 85) return "big_heart";
  return null;
}
function selfTrainGrow(p) {
  // 依型態小幅成長：以「生涯尚未走下坡」者為主（年輕/巔峰），高齡者成長機率遞減
  const young = p.age <= 27;
  const workEthic = hasTrait(p, "grinder") ? 2 : 1;
  const growChance = clamp((young ? 0.35 : 0.18) * workEthic, 0, 0.7);
  const changes = [];
  const bumpAttrs = p.isPitcher ? ["velocity", "control", "stamina", "composure"] : ["contact", "power", "eye", "speed", "fielding"];
  bumpAttrs.forEach(attr => {
    if (typeof p[attr] !== "number") return;
    if (Math.random() < growChance * 0.4) {
      const before = p[attr];
      p[attr] = clamp(p[attr] + 1, 20, 99);
      if (p[attr] !== before) changes.push(attr);
    }
  });
  return changes;
}
function selfTrainMaybeNewTrait(p) {
  // 機率獲得一項尚未持有的後天特質（練習狂更容易）
  const base = hasTrait(p, "grinder") ? 0.10 : 0.05;
  if (Math.random() >= base) return null;
  if (!Array.isArray(p.traits)) p.traits = [];
  if (p.traits.length >= 3) return null; // 特質總數上限
  const pool = ACQUIRED_TRAITS.filter(k => !p.traits.includes(k));
  if (pool.length === 0) return null;
  const key = choice(pool);
  p.traits.push(key);
  if (key === "buntpro" && !p.isPitcher) p.bunting = clamp((p.bunting || 45) + randInt(6, 12), 20, 95);
  return key;
}
function selfTrainMaybeNewSkill(p) {
  // 標竿老將領悟稱號/特殊技：年紀夠成熟＋招牌屬性突出，且未達疊加上限
  if (p.age < 28) return null;
  if (legacyItemsCount(p) >= 3) return null;
  const sig = p.isPitcher ? pitcherSignatureSkill(p) : batterSignatureSkill(p);
  if (!sig || hasLegacySkill(p, sig)) return null;
  const chance = hasTrait(p, "grinder") ? 0.16 : 0.08;
  if (Math.random() >= chance) return null;
  if (!Array.isArray(p.specialSkills)) p.specialSkills = [];
  p.specialSkills.push(sig);
  applyLegacySkillBoost(p, sig);
  return sig;
}
function playerPotentialScore(p) {
  return typeof p.potential === "number" ? p.potential : (p.overall || 50);
}
function runTeamInheritance(team, isUser) {
  const ids = (team.roster1 || []).concat(team.roster2 || []);
  const players = ids.map(id => S.players[id]).filter(Boolean);
  // 資深老將：高齡（≥32）且持有可傳承項目（後天特質或稱號）
  const seniors = players.filter(p => p.age >= 32 && legacyItemsCount(p) > 0)
    .sort((a, b) => legacyItemsCount(b) - legacyItemsCount(a) || b.age - a.age);
  if (seniors.length === 0) return null;
  // 後輩：最年輕高潛力（≤23歲，潛力最高），且疊加未滿3
  const juniors = players.filter(p => p.age <= 23 && legacyItemsCount(p) < 3)
    .sort((a, b) => playerPotentialScore(b) - playerPotentialScore(a) || a.age - b.age);
  if (juniors.length === 0) return null;
  // 自動配對：依序嘗試，找到「老將有、後輩缺、且位置相容」的可傳項目
  for (const senior of seniors) {
    for (const junior of juniors) {
      // 可傳項目：老將的後天特質（後輩沒有）＋老將的稱號（後輩沒有且位置相容）
      const traitOpts = (senior.traits || []).filter(k => isAcquiredTrait(k) && !(junior.traits || []).includes(k));
      const skillOpts = (senior.specialSkills || []).filter(k => {
        if (hasLegacySkill(junior, k)) return false;
        const sk = LEGACY_SKILLS[k];
        if (!sk) return false;
        if (sk.batter && junior.isPitcher) return false;
        if (sk.pitcher && !junior.isPitcher) return false;
        return true;
      });
      const opts = traitOpts.map(k => ({ type: "trait", key: k })).concat(skillOpts.map(k => ({ type: "skill", key: k })));
      if (opts.length === 0) continue;
      // 機率傳承成功（每隊每年至多1次）
      if (Math.random() >= 0.4) return null; // 本年這隊配對失敗（緣分未到）
      const pick = choice(opts);
      let itemName;
      if (pick.type === "trait") {
        junior.traits = junior.traits || [];
        junior.traits.push(pick.key);
        if (pick.key === "buntpro" && !junior.isPitcher) junior.bunting = clamp((junior.bunting || 45) + randInt(6, 12), 20, 95);
        itemName = TRAITS[pick.key] ? TRAITS[pick.key].name : pick.key;
      } else {
        junior.specialSkills = junior.specialSkills || [];
        junior.specialSkills.push(pick.key);
        applyLegacySkillBoost(junior, pick.key);
        itemName = LEGACY_SKILLS[pick.key] ? LEGACY_SKILLS[pick.key].name : pick.key;
      }
      const news = `老將 ${senior.name} 將畢生絕技「${itemName}」傳授給新星 ${junior.name}，${team.name}後繼有人。`;
      if (isUser && typeof pushNews === "function") pushNews("傳承", news);
      return { seniorName: senior.name, juniorName: junior.name, item: itemName, type: pick.type };
    }
  }
  return null;
}
function runSelfTrainingWindow() {
  const report = { selfTrained: 0, newTraits: [], newSkills: [], inheritance: null, aiInheritCount: 0 };
  Object.values(S.teams).forEach(team => {
    const isUser = team.id === S.userTeamId;
    const ids = (team.roster1 || []).concat(team.roster2 || []);
    ids.forEach(id => {
      const p = S.players[id];
      if (!p) return;
      if (!Array.isArray(p.specialSkills)) p.specialSkills = [];
      const grew = selfTrainGrow(p);
      const nt = selfTrainMaybeNewTrait(p);
      const ns = selfTrainMaybeNewSkill(p);
      if (isUser) {
        if (grew.length > 0) report.selfTrained++;
        if (nt) report.newTraits.push({ name: p.name, trait: TRAITS[nt] ? TRAITS[nt].name : nt });
        if (ns) report.newSkills.push({ name: p.name, skill: LEGACY_SKILLS[ns] ? LEGACY_SKILLS[ns].name : ns });
      }
    });
    const inh = runTeamInheritance(team, isUser);
    if (inh) { if (isUser) report.inheritance = inh; else report.aiInheritCount++; }
  });
  S.selfTrainingReport = report;
  return report;
}

function finalizeNewSeason() {
  if (typeof settleOffseasonAiTrades === "function") settleOffseasonAiTrades(); // v32：休賽季AI交易於開幕前定案
  Object.values(S.teams).forEach(t => {
    t.wins = 0; t.losses = 0; t.ties = 0;
    if (typeof resetHomeAwayLedger === "function") resetHomeAwayLedger(t); // v30主客戰績＋主場帳歸零
  });
  Object.values(S.players).forEach(p => {
    // v29：歸零前把上季成績快照到lastSeasonStats（供談約畫面等處顯示「上一季表現」）
    if (p.seasonStats && ((p.isPitcher && p.seasonStats.IP > 0) || (!p.isPitcher && p.seasonStats.AB > 0))) {
      p.lastSeasonStats = { year: S.seasonYear, ...p.seasonStats };
    }
    p.seasonStats = p.isPitcher ? freshPitcherStats() : freshBatterStats();
  });
  S.schedule = buildSeasonSchedule(S.teams);
  S.currentDay = 0;
  S.resultsLog = [];
  S.seasonYear++;
  S.playoffs = null;
  S.draft = null;
  S.lastAwards = null;
  if (typeof generateSeasonKPI === "function" && !S.sabbatical) generateSeasonKPI(); // v27：新球季高層公布年度目標（v33：沉潛年無人在任、不產KPI）
  runSelfTrainingWindow(); // v31-B：季後自主訓練窗（自主成長/得特質/老將傳承）——春訓之外的獨立小階段
  prepareSpringCamp(); // v25：新球季開幕前先進春訓
  UI.screen = "selfTraining"; // v31-B：先看自主訓練/傳承報告，再前往春訓
  const rc = S.offseasonSummary ? S.offseasonSummary.retiredCount : 0;
  UI.flash = `第 ${S.seasonYear} 年球季即將開幕！本休賽季共有 ${rc} 位球員退休，選秀會已完成補強。`;
  persist();
  render();
}
// v31-B：自主訓練報告 →（繼續）前往春訓
function proceedFromSelfTraining() {
  UI.screen = "springCamp";
  persist();
  render();
}

function buildLeague(userTeamName) {
  const personaCycle = shuffle(PERSONA_KEYS.slice()); // v27：7型個性洗牌後輪配，確保20隊分布均勻
  const cities = shuffle(CITY_NAMES);
  const mascots = shuffle(MASCOTS);
  const teamNames = cities.map((c, i) => c + mascots[i]);
  const divKeys = ["A1", "A2", "B1", "B2"];
  const teams = {}, players = {}, coaches = {};
  let idx = 0;
  divKeys.forEach(div => {
    const league = div[0];
    for (let i = 0; i < 5; i++) {
      const teamId = "T" + idx;
      teams[teamId] = { id: teamId, name: teamNames[idx], league, division: div, wins: 0, losses: 0, ties: 0, isUser: false, starterIndex: 0,
        persona: personaCycle[idx % personaCycle.length], gmMemory: { affinity: 0, events: [], rejects: 0 }, // v27：球團個性與GM記憶
        staffVacancies: { coach: {}, scout: {} } }; // v31：教練/球探空缺記錄
      const { roster1, roster2 } = buildRoster(teamId);
      teams[teamId].roster1 = roster1.map(p => p.id);
      teams[teamId].roster2 = roster2.map(p => p.id);
      teams[teamId].scouts = {
        domestic: generateScout(teamId, "domestic"),
        international: generateScout(teamId, "international"),
        trade: generateScout(teamId, "trade")
      };
      const { coaches: staffCoaches, staff } = buildCoachStaff(teamId);
      Object.assign(coaches, staffCoaches);
      teams[teamId].coachStaff = staff;
      roster1.concat(roster2).forEach(p => { players[p.id] = p; });
      idx++;
    }
  });
  if (userTeamName) {
    teams["T0"].name = userTeamName;
    teams["T0"].isUser = true;
  }
  return { teams, players, coaches };
}

/* ==================== v32：聯盟生態——AI互相交易／風聲情報／AI主動提案 ==================== */
const AI_TRADE_CAP_PER_TEAM = 5;         // 每隊每年AI交易成交上限（Mars拍板：5筆）
const AI_TRADE_MIN_RATIO = 0.85;         // AI互相交易帳面比率下限（防賤賣/防坑殺）
const AI_TRADE_INTERCEPT_PREMIUM = 0.05; // 玩家插隊搶人須壓過AI撮合比率的溢價
const AI_TRADE_DAILY_CHANCE = 0.045;     // 球季內每日撮合嘗試機率（期望全季約3~4組）
const AI_TRADE_ATTEMPT_CAP = 6;          // 每年撮合嘗試上限（含休賽季批次，中等活躍4~6組）
const AI_PROPOSAL_DAILY_CHANCE = 0.02;   // AI主動向玩家提案的每日機率
const AI_PROPOSAL_YEAR_CAP = 2;          // 每年最多收到幾次AI主動提案

function ensureAiTradeState() {
  if (!S.aiTrade || S.aiTrade.year !== S.seasonYear) {
    S.aiTrade = { year: S.seasonYear, counts: {}, rumors: [], attempts: 0, proposal: null, proposalCount: 0, rumorSeq: 0 };
  }
  if (!Array.isArray(S.aiTrade.rumors)) S.aiTrade.rumors = [];
  if (!S.aiTrade.counts) S.aiTrade.counts = {};
  return S.aiTrade;
}
function aiTradeCount(teamId) { return (ensureAiTradeState().counts[teamId] || 0); }
function bumpAiTradeCount(teamId) { const st = ensureAiTradeState(); st.counts[teamId] = (st.counts[teamId] || 0) + 1; }

/* 風聲查詢：某球員是否是進行中風聲的「賣方讓出球員」且賣方＝指定球團 */
function activeRumorForPlayer(playerId, sellerTeamId) {
  if (!S || !S.aiTrade) return null;
  return (S.aiTrade.rumors || []).find(r =>
    !r.done && !r.cancelled && r.sellerId === sellerTeamId && r.sellerGives.includes(playerId)) || null;
}
function invalidateRumorsForPlayers(playerIds) {
  if (!S || !S.aiTrade) return;
  const set = new Set(playerIds);
  (S.aiTrade.rumors || []).forEach(r => {
    if (r.done || r.cancelled) return;
    if (r.sellerGives.some(id => set.has(id)) || r.buyerGives.some(id => set.has(id))) r.cancelled = true;
  });
}

/* 球團交易姿態：依個性＋當前戰力排名決定買/賣/持有 */
function aiTradeStance(team) {
  const rank = teamStrengthRank(team.id);
  if (team.persona === "rebuild" || team.persona === "farm" || rank >= 16) return "sell";
  if (team.persona === "splash" || team.persona === "gambler" || rank <= 5) return "buy";
  if (team.persona === "analytics") return "value";
  return "hold";
}

/* 賣方出清候選：29歲以上、有一定即戰力的老將（1軍優先） */
function aiSellCandidates(team) {
  return team.roster1.concat(team.roster2).map(id => S.players[id])
    .filter(p => p && p.age >= 29 && trueOverall(p) >= 55 && !(p.injury && p.injury.pendingSurgery))
    .sort((a, b) => tradeValue(b) - tradeValue(a));
}
/* 買方讓出候選：年輕或高潛力的籌碼（不含隊上最強潛力，留給自家養成） */
function aiChipCandidates(team) {
  const all = team.roster1.concat(team.roster2).map(id => S.players[id])
    .filter(p => p && (p.age <= 26 || (p.potential || 50) >= 65))
    .sort((a, b) => tradeValue(b) - tradeValue(a));
  return all.slice(1); // 跳過最大籌碼
}

/* 撮合一組 AI↔AI 交易：賣方出老將、買方以1~2名年輕籌碼交換；
   雙方以「各自個性眼光」計價都要划算（≥0.9），且中立比率落在防坑殺區間內。 */
function tryMatchAiTrade(offseason) {
  const st = ensureAiTradeState();
  const ai = Object.values(S.teams).filter(t => !t.isUser);
  const sellers = shuffle(ai.filter(t => aiTradeStance(t) === "sell" && aiTradeCount(t.id) < AI_TRADE_CAP_PER_TEAM));
  const buyers = shuffle(ai.filter(t => ["buy", "value"].includes(aiTradeStance(t)) && aiTradeCount(t.id) < AI_TRADE_CAP_PER_TEAM));
  for (const seller of sellers) {
    const vets = aiSellCandidates(seller);
    if (vets.length === 0) continue;
    for (const buyer of buyers) {
      if (buyer.id === seller.id) continue;
      // 已有同兩隊進行中的風聲就不重複
      if (st.rumors.some(r => !r.done && !r.cancelled && r.sellerId === seller.id && r.buyerId === buyer.id)) continue;
      const vet = vets[0];
      const chips = aiChipCandidates(buyer);
      if (chips.length === 0) continue;
      const vetValSeller = personaTradeValue(seller, vet);
      const vetValBuyer = personaTradeValue(buyer, vet);
      const vetValNeutral = tradeValue(vet);
      // 貪婪找1~2籌碼組合，讓雙方都覺得划算
      let pick = null;
      for (let i = 0; i < Math.min(chips.length, 8) && !pick; i++) {
        const combos = [[chips[i]]];
        for (let j = i + 1; j < Math.min(chips.length, 8); j++) combos.push([chips[i], chips[j]]);
        for (const combo of combos) {
          const chipValSeller = combo.reduce((s, p) => s + personaTradeValue(seller, p), 0);
          const chipValBuyer = combo.reduce((s, p) => s + personaTradeValue(buyer, p), 0);
          const chipValNeutral = combo.reduce((s, p) => s + tradeValue(p), 0);
          const neutralRatio = chipValNeutral / Math.max(1, vetValNeutral); // 買方付出/賣方付出
          if (chipValSeller / Math.max(1, vetValSeller) < 0.9) continue;   // 賣方眼光：收到的籌碼要夠
          if (vetValBuyer / Math.max(1, chipValBuyer) < 0.9) continue;     // 買方眼光：換到的老將要值
          if (neutralRatio < AI_TRADE_MIN_RATIO || neutralRatio > 1 / AI_TRADE_MIN_RATIO) continue; // 防坑殺
          pick = { combo, neutralRatio };
          break;
        }
      }
      if (!pick) continue;
      const rumor = {
        id: "R" + (++st.rumorSeq) + "Y" + S.seasonYear,
        sellerId: seller.id, buyerId: buyer.id,
        sellerGives: [vet.id], buyerGives: pick.combo.map(p => p.id),
        neutralRatio: Math.round(pick.neutralRatio * 100) / 100,
        daysLeft: offseason ? 0 : rumorLeadDays(),          // 球季內：玩家提早5~7天知情
        resolveAtSeasonStart: !!offseason,                   // 休賽季批次：新球季開幕時定案
        persuaded: false, cancelled: false, done: false, dismissed: false
      };
      st.rumors.push(rumor);
      const lv = rumorDetailLevel();
      if (lv >= 1) {
        pushNews("風聲", `聯盟消息：${seller.name}與${buyer.name}正在密談一筆交易${lv >= 2 ? `，據悉主角是${vet.name}` : ""}……（詳見主控台情報卡）`);
        if (!offseason && typeof pushSimInterrupt === "function") pushSimInterrupt(`交易風聲：${seller.name}與${buyer.name}密談中`); // v34：情報現身即暫停時程
      }
      return rumor;
    }
  }
  return null;
}

/* 玩家交易球探決定風聲提前天數（5~7）與情報精確度（0粗略/1隊伍/2完整） */
function rumorLeadDays() {
  const sc = S.teams[S.userTeamId] && S.teams[S.userTeamId].scouts && S.teams[S.userTeamId].scouts.trade;
  const acc = sc ? (typeof effectiveScoutAccuracy === "function" ? effectiveScoutAccuracy(S.teams[S.userTeamId], sc) : sc.accuracy) : 0;
  return acc >= 70 ? 7 : (acc >= 55 ? 6 : 5);
}
function rumorDetailLevel() {
  const t = S.teams[S.userTeamId];
  const sc = t && t.scouts && t.scouts.trade;
  if (!sc) return 0; // 交易球探空缺：只知道「有事在談」
  const acc = (typeof effectiveScoutAccuracy === "function") ? effectiveScoutAccuracy(t, sc) : sc.accuracy;
  return acc >= 70 ? 2 : (acc >= 55 ? 1 : 0);
}

/* 定案一筆風聲交易（雙方AI） */
function resolveAiRumor(r) {
  if (r.done || r.cancelled) return;
  const seller = S.teams[r.sellerId], buyer = S.teams[r.buyerId];
  // 球員仍在原隊且上限未滿才成交
  const intact = r.sellerGives.every(id => S.players[id] && S.players[id].team === r.sellerId)
    && r.buyerGives.every(id => S.players[id] && S.players[id].team === r.buyerId);
  if (!intact || aiTradeCount(r.sellerId) >= AI_TRADE_CAP_PER_TEAM || aiTradeCount(r.buyerId) >= AI_TRADE_CAP_PER_TEAM) {
    r.cancelled = true; return;
  }
  r.done = true;
  executeTrade(r.sellerId, r.buyerId, r.sellerGives.slice(), r.buyerGives.slice());
  bumpAiTradeCount(r.sellerId); bumpAiTradeCount(r.buyerId);
  const vet = S.players[r.sellerGives[0]];
  const chips = r.buyerGives.map(id => S.players[id]).filter(Boolean);
  const bp = personaOf(buyer), sp = personaOf(seller);
  pushNews("交易", `重磅成交！${buyer.name}${bp ? `（${bp.name}）` : ""}送出${chips.map(p => p.name).join("、")}，向${seller.name}${sp ? `（${sp.name}）` : ""}換來${vet ? vet.name : "主力球員"}。`);
}

/* 每日tick（03 simulateDay呼叫）：風聲倒數/定案、嘗試新撮合、AI主動提案 */
function tickAiTrades() {
  if (!S || !S.gameStarted) return;
  const st = ensureAiTradeState();
  // 倒數與定案（僅球季內型風聲）
  st.rumors.forEach(r => {
    if (r.done || r.cancelled || r.resolveAtSeasonStart) return;
    r.daysLeft--;
    if (r.daysLeft <= 0) resolveAiRumor(r);
  });
  // 窗口內嘗試新撮合
  const inWindow = S.currentDay < tradeDeadlineDay();
  if (inWindow && st.attempts < AI_TRADE_ATTEMPT_CAP && Math.random() < AI_TRADE_DAILY_CHANCE) {
    st.attempts++;
    tryMatchAiTrade(false);
  }
  // AI 主動向玩家提案（v32-B1）
  if (inWindow && !st.proposal && st.proposalCount < AI_PROPOSAL_YEAR_CAP && Math.random() < AI_PROPOSAL_DAILY_CHANCE) {
    generateAiProposalToUser();
  }
  // 提案逾期自動失效
  if (st.proposal && S.currentDay > st.proposal.expiresDay) st.proposal = null;
}

/* 休賽季批次（finishDraft呼叫）：撮合1~2組、新球季開幕時定案（期間玩家可插手/慫恿） */
function runOffseasonAiTrades() {
  const st = ensureAiTradeState();
  const n = randInt(1, 2);
  for (let i = 0; i < n && st.attempts < AI_TRADE_ATTEMPT_CAP; i++) {
    st.attempts++;
    tryMatchAiTrade(true);
  }
}
/* 新球季開幕（finalizeNewSeason呼叫）：定案休賽季風聲、清空上一年狀態 */
function settleOffseasonAiTrades() {
  if (!S.aiTrade) return;
  (S.aiTrade.rumors || []).forEach(r => { if (r.resolveAtSeasonStart) resolveAiRumor(r); });
}

/* ---------- v32 風聲反應措施 ---------- */
function rumorById(id) { return S.aiTrade ? (S.aiTrade.rumors || []).find(r => r.id === id) : null; }
/* ②慫恿破局：耗賣方好感-1；機率20~50%依好感浮動，人情型賣方加倍（上限90%）；每個風聲限一次 */
function persuadeRumor(rumorId) {
  const r = rumorById(rumorId);
  if (!r || r.done || r.cancelled || r.persuaded) return { ok: false };
  r.persuaded = true;
  const seller = S.teams[r.sellerId];
  const affBefore = gmAffinity(seller);
  recordGmMemory(seller, -1, "你出面攪局，勸阻他們的一筆交易");
  let chance = clamp(0.2 + affBefore * 0.03, 0.2, 0.5);
  if (seller.persona === "human") chance = Math.min(0.9, chance * 2);
  const success = Math.random() < chance;
  if (success) {
    r.cancelled = true;
    pushNews("風聲", `${seller.name}在你的遊說下臨陣縮手，與${S.teams[r.buyerId].name}的交易談判宣告破局。`);
  } else {
    pushNews("風聲", `你試圖勸阻${seller.name}，但對方不為所動，交易照談。`);
  }
  persist();
  return { ok: true, success, chance };
}
/* ①插隊搶人成功後的好感結算（06 submitTrade於result.hijackedRumorId時呼叫） */
function settleHijack(rumorId) {
  const r = rumorById(rumorId);
  if (!r || r.done) return;
  r.cancelled = true;
  const seller = S.teams[r.sellerId], buyer = S.teams[r.buyerId];
  recordGmMemory(seller, 1, "在競價中賣了你想要的好價錢");
  recordGmMemory(buyer, -2, "你半路殺出，搶走他們談了很久的交易目標");
  pushNews("交易", `螳螂捕蟬！你搶在${buyer.name}定案前開出更高價碼，從${seller.name}手中截走目標球員。${buyer.name}高層震怒。`);
}

/* ---------- v32-B1：AI依個性與隊形主動向玩家提案 ---------- */
function generateAiProposalToUser() {
  const st = ensureAiTradeState();
  const user = S.teams[S.userTeamId];
  // 好感≥+3的AI優先；沒有就從買/賣姿態明確的隊中挑
  const pool = Object.values(S.teams).filter(t => !t.isUser && aiTradeCount(t.id) < AI_TRADE_CAP_PER_TEAM);
  const warm = pool.filter(t => gmAffinity(t) >= 3);
  const cands = shuffle((warm.length > 0 ? warm : pool.filter(t => aiTradeStance(t) !== "hold")));
  for (const ai of cands) {
    const stance = aiTradeStance(ai);
    const aiGiveList = stance === "sell" ? aiSellCandidates(ai) : aiChipCandidates(ai);
    if (aiGiveList.length === 0) continue;
    const aiGive = aiGiveList[0];
    // AI想換的：賣方要籌碼、買方要即戰力——從玩家陣中找「AI眼中」價值相近者
    const wantPool = user.roster1.concat(user.roster2).map(id => S.players[id]).filter(Boolean)
      .filter(p => stance === "sell" ? (p.age <= 26 || (p.potential || 50) >= 65) : (p.age >= 28 && trueOverall(p) >= 58));
    if (wantPool.length === 0) continue;
    const aff = gmAffinity(ai);
    const ps = personaOf(ai);
    const favor = clamp(aff * 0.01 * (ai.persona === "human" ? 2 : 1), -0.10, 0.10); // 好感越高開價越讓利
    // 目標：玩家收到/付出 ≈ 1+favor（AI眼光計價），挑最接近者
    const giveVal = personaTradeValue(ai, aiGive);
    let best = null, bestDiff = 1e9;
    wantPool.forEach(p => {
      const ratio = giveVal / Math.max(1, personaTradeValue(ai, p));
      const diff = Math.abs(ratio - (1 + favor));
      if (ratio >= 0.85 && ratio <= 1.25 && diff < bestDiff) { best = p; bestDiff = diff; }
    });
    if (!best) continue;
    st.proposal = {
      teamId: ai.id, aiGives: [aiGive.id], userGives: [best.id],
      expiresDay: S.currentDay + 3, favor: Math.round(favor * 100) / 100
    };
    st.proposalCount++;
    pushNews("提案", `${ai.name}${ps ? `（${ps.name}）` : ""}主動來電，開出交易提案：以${aiGive.name}換你的${best.name}。（3天內回覆，詳見主控台）`);
    if (typeof pushSimInterrupt === "function") pushSimInterrupt(`AI交易提案：${ai.name}來電（3天內回覆）`); // v34：提案送達即暫停時程
    return st.proposal;
  }
  return null;
}
function acceptAiProposal() {
  const st = ensureAiTradeState();
  const pr = st.proposal;
  if (!pr) return;
  const ai = S.teams[pr.teamId];
  const intact = pr.aiGives.every(id => S.players[id] && S.players[id].team === pr.teamId)
    && pr.userGives.every(id => S.players[id] && S.players[id].team === S.userTeamId);
  st.proposal = null;
  if (!intact) { UI.flash = "提案涉及的球員已異動，交易取消。"; return; }
  executeTrade(S.userTeamId, pr.teamId, pr.userGives.slice(), pr.aiGives.slice());
  bumpAiTradeCount(pr.teamId);
  recordGmMemory(ai, 1, "爽快接受了他們主動提出的交易");
  const inNames = pr.aiGives.map(id => S.players[id].name).join("、");
  pushNews("交易", `一拍即合！你接受${ai.name}的主動提案，${inNames}加盟本隊。`);
  UI.flash = `交易成立：${inNames} 加盟！`;
  persist();
}
function declineAiProposal() {
  const st = ensureAiTradeState();
  if (!st.proposal) return;
  st.proposal = null; // 婉拒不扣好感（對方主動來談）
  persist();
}
