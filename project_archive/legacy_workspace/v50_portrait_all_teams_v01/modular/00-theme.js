/* ====================================================================
   ██ v49 可導入美術系統（Importable Art Layer）██  ── 本模組供 Codex 開發美術層 ──
   v47 建立、v48 新增雷達圖/球員照片、v49 擴充品牌/隊色/國旗/組合肖像/設定頁。
   定位：把「美術、美編、UI/UX、背景、按鍵、圖示」與遊戲邏輯徹底解耦。
   邏輯層只呼叫語意介面（icon('trophy')／CSS 變數槽位），完全不綁定任何一張圖。
   導入方式：Codex 產出「主題包」(officialArtPack) → 呼叫 applyThemePack(pack)
             即整包生效；未導入或缺項時，自動回退到現用 emoji／現行 CSS。
   鐵則：本模組排在六模組之前載入；只新增、不刪既有；所有 DOM 操作皆 try-catch 防護。
   ==================================================================== */

/* ---------- v49 品牌常數 ---------- */
var BRAND = {
  gameName: "決勝GM",
  gameSubtitle: "FRONT OFFICE BASEBALL",
  homeNation: "海嶺共和國",
  palette: {
    primary:   "#1769D2",  // 主藍
    white:     "#FFFFFF",  // 基底白
    green:     "#59C78B",  // 輔綠
    pink:      "#FF4F87",  // 輔粉
    darkBlue:  "#102949"   // 墨藍
  }
};

/* ---------- 主題狀態（導入的資產包掛在這裡；預設為空＝現用 emoji/CSS） ---------- */
var THEME = { pack: null, version: "v50" };

/* ---------- v50 肖像母版規格（回應 Codex 美術檢查點 §2） ----------
   capMark 定義：完整帽子透明圖層 256×256（非帽徽），不拆分 capBase＋capInsignia。
   z-order（v50 修正）：skin → face → eyes → nose → uniform → hair → beard → cap
   三錨點（百分比座標，256×256 畫布上的絕對位置標示於 px）：
     headTop:    y = 10%  (y=26px)    — 帽頂對齊線
     faceCenter: x = 50%, y = 38%  (x=128px, y=97px)  — 五官對齊中心
     neckline:   y = 72%  (y=184px)  — 領口上緣對齊線
   輸出尺寸：64px（名單/卡片）、128px（詳情/談判）。
   縮圖安全區：64px 輸出時臉部居中裁切（headTop~neckline 區域等比縮放）。 */
var PORTRAIT_SPEC = Object.freeze({
  masterSize: 256,
  outputSizes: [64, 128],
  anchors: {
    headTop:    { x: 0.50, y: 0.10 },
    faceCenter: { x: 0.50, y: 0.38 },
    neckline:   { x: 0.50, y: 0.72 }
  },
  /* v50 z-order 修正：球衣在毛髮／鬍型／帽子之前，避免球衣遮蓋帽簷和鬢角 */
  layerOrder: ["skin", "face", "eyes", "nose", "uniform", "hair", "beard", "cap"],
  capMarkNote: "capMark = 完整帽子圖層（含帽身＋帽簷＋帽徽），非單獨帽徽",
  uniformNote: "正式球衣僅 homeUniform（白色系主場）與 awayUniform（主色系客場）；cityUniform 已停用，載入時忽略。客場素材缺失時回退 homeUniform"
});

/* ---------- 語意圖示登錄表：語意名 → 預設 glyph（現用 emoji，作為無資產時的後備） ----------
   Codex 只需針對這些「語意名」產出對應圖檔（SVG 建議優先／PNG 亦可），不必理解程式邏輯。 */
var THEME_ICONS = {
    'antenna': { glyph: '📡' },
    'bandage': { glyph: '🩹' },
    'baseball': { glyph: '⚾' },
    'bell': { glyph: '🔔' },
    'blossom': { glyph: '🌸' },
    'bolt': { glyph: '⚡' },
    'book': { glyph: '📖' },
    'brain': { glyph: '🧠' },
    'briefcase': { glyph: '💼' },
    'calendar': { glyph: '🗓️' },
    'cap': { glyph: '🧢' },
    'chart': { glyph: '📊' },
    'chart-down': { glyph: '📉' },
    'chart-up': { glyph: '📈' },
    'check': { glyph: '✅' },
    'clipboard': { glyph: '📋' },
    'cross': { glyph: '❌' },
    'door': { glyph: '🚪' },
    'dot-unread': { glyph: '🔵' },
    'dove': { glyph: '🕊️' },
    'exchange': { glyph: '💱' },
    'export': { glyph: '📤' },
    'fac-beer': { glyph: '🍺' },
    'fac-drink': { glyph: '🥤' },
    'fac-food': { glyph: '🍜' },
    'fac-kidzone': { glyph: '🎠' },
    'fac-nursing': { glyph: '🍼' },
    'fac-parking': { glyph: '🅿️' },
    'fac-toilet': { glyph: '🚻' },
    'fac-vendor': { glyph: '🛒' },
    'fac-vip': { glyph: '💺' },
    'family': { glyph: '👨‍👩‍👧' },
    'fire': { glyph: '🔥' },
    'flag-home': { glyph: '🇹🇼' },
    'folder': { glyph: '📂' },
    'globe': { glyph: '🌏' },
    'grad': { glyph: '🎓' },
    'handshake': { glyph: '🤝' },
    'heart': { glyph: '❤️' },
    'hourglass': { glyph: '⏳' },
    'ice': { glyph: '🧊' },
    'link': { glyph: '🔗' },
    'magnify': { glyph: '🔎' },
    'mail': { glyph: '✉️' },
    'mail-box': { glyph: '📬' },
    'mail-in': { glyph: '📨' },
    'medal': { glyph: '🏅' },
    'medal4': { glyph: '🎖️' },
    'medical': { glyph: '⚕️' },
    'megaphone': { glyph: '📣' },
    'mk-social': { glyph: '📱' },
    'mk-themeday': { glyph: '🎆' },
    'money': { glyph: '💰' },
    'museum': { glyph: '🏛️' },
    'news': { glyph: '📰' },
    'no': { glyph: '✕' },
    'notebook': { glyph: '📓' },
    'ok': { glyph: '✓' },
    'package': { glyph: '📦' },
    'party': { glyph: '🎊' },
    'pause': { glyph: '⏸️' },
    'people': { glyph: '👥' },
    'phone': { glyph: '📞' },
    'pin': { glyph: '📌' },
    'prio-high': { glyph: '🔴' },
    'prio-low': { glyph: '🟢' },
    'prio-mid': { glyph: '🟡' },
    'refresh': { glyph: '🔁' },
    'rotation': { glyph: '🥎' },
    'sake': { glyph: '🍶' },
    'save': { glyph: '💾' },
    'scout': { glyph: '🕵️' },
    'screen': { glyph: '📺' },
    'scroll': { glyph: '📜' },
    'search': { glyph: '🔍' },
    'settings': { glyph: '⚙️' },
    'sparkle': { glyph: '✨' },
    'stadium': { glyph: '🏟️' },
    'star': { glyph: '⭐' },
    'star-glow': { glyph: '🌟' },
    'star-solid': { glyph: '★' },
    'suit': { glyph: '👔' },
    'surgery': { glyph: '🔪' },
    'target': { glyph: '🎯' },
    'tea': { glyph: '🍵' },
    'ticket': { glyph: '🎟️' },
    'training': { glyph: '🏋️' },
    'trend-flat': { glyph: '➡️' },
    'trophy': { glyph: '🏆' },
    'warn': { glyph: '⚠️' },
    'hof': { glyph: '🏅' },
    'jersey': { glyph: '🎽' },
    'crown': { glyph: '👑' },
    'camera': { glyph: '📷' },
    'milestone': { glyph: '🎉' },
    'milestone-near': { glyph: '🔜' },
    'palette': { glyph: '🎨' },
    'portrait': { glyph: '🧑' },
};

/* ---------- 單一取圖口 icon(name, opts) ----------
   有導入資產 → 回傳 <img>/<svg> 標記；無資產 → 回傳現用 emoji glyph；查無此名 → 空字串。
   opts.cls：附加 class；opts.title：無障礙標題。永不 throw（開機防護）。 */
function icon(name, opts) {
  try {
    opts = opts || {};
    var reg = THEME_ICONS[name];
    var asset = (THEME.pack && THEME.pack.icons && THEME.pack.icons[name]) || null;
    if (asset) {
      if (typeof asset === "string") asset = { src: asset };
      var cls = "ico" + (opts.cls ? (" " + opts.cls) : "");
      var ttl = opts.title ? (' title="' + String(opts.title).replace(/"/g, "&quot;") + '"') : "";
      if (asset.svg) return '<span class="' + cls + '" role="img"' + ttl + ">" + asset.svg + "</span>";
      if (asset.src) return '<img class="' + cls + '" alt=""' + ttl + ' src="' + asset.src + '">';
    }
    return reg ? reg.glyph : "";
  } catch (_) {
    try { return THEME_ICONS[name] ? THEME_ICONS[name].glyph : ""; } catch (__){ return ""; }
  }
}


/* ---------- iconVal(v)：資料欄位用解析器 ----------
   設施／行銷等 config 的 icon 欄位改存「語意名」（載入期是資料、渲染期才解析），
   因此導入主題包後即時反映。傳入非登錄名（例如舊存檔存的原始 emoji）則原樣回傳。 */
function iconVal(v, opts) {
  try {
    if (v == null || v === "") return "";
    return THEME_ICONS[v] ? icon(v, opts) : v;
  } catch (_) { return v || ""; }
}

/* ---------- 槽位登錄表（背景/材質/主視覺/分頁背景/按鍵皮膚/隊色/國旗）：語意鍵 → CSS 變數 ----------
   v47 建立 18 槽位、v49 擴充至 26 槽位（新增品牌/卡片/工具列/國旗）。
   預設值留空＝沿用 style.css 現行外觀；導入資產包時才覆蓋。 */
var THEME_SLOTS = {
  // v47 原始 18 槽位
  "bg.app":        { css: "--pack-bg-image",      kind: "image", desc: "全域背景（body）" },
  "bg.card":       { css: "--pack-card-texture",  kind: "image", desc: "卡片材質" },
  "hero.image":    { css: "--pack-hero-image",    kind: "image", desc: "主視覺 hero 橫幅" },
  "screen.dashboard": { css: "--pack-screen-dashboard", kind: "image", desc: "分頁背景・主控台" },
  "screen.finance":   { css: "--pack-screen-finance",   kind: "image", desc: "分頁背景・財務" },
  "screen.roster":    { css: "--pack-screen-roster",    kind: "image", desc: "分頁背景・名單" },
  "screen.trade":     { css: "--pack-screen-trade",     kind: "image", desc: "分頁背景・交易" },
  "screen.coach":     { css: "--pack-screen-coach",     kind: "image", desc: "分頁背景・教練" },
  "screen.mail":      { css: "--pack-screen-mail",      kind: "image", desc: "分頁背景・郵件" },
  "btn.primary":   { css: "--pack-btn-primary-image",   kind: "image", desc: "按鍵皮膚・主要" },
  "btn.secondary": { css: "--pack-btn-secondary-image", kind: "image", desc: "按鍵皮膚・次要" },
  "btn.outline":   { css: "--pack-btn-outline-image",   kind: "image", desc: "按鍵皮膚・外框" },
  "btn.danger":    { css: "--pack-btn-danger-image",    kind: "image", desc: "按鍵皮膚・危險" },
  "tabbar.image":  { css: "--pack-tabbar-image",        kind: "image", desc: "分頁圖示條底圖" },
  "radar.fill":    { css: "--pack-radar-fill",          kind: "color", desc: "雷達圖填充色（預設 rgba(217,164,65,0.25)）" },
  "radar.stroke":  { css: "--pack-radar-stroke",        kind: "color", desc: "雷達圖邊線色（預設 #D9A441）" },
  "radar.grid":    { css: "--pack-radar-grid",          kind: "color", desc: "雷達圖格線色（預設 rgba(255,255,255,0.15)）" },
  "radar.text":    { css: "--pack-radar-text",          kind: "color", desc: "雷達圖軸標籤色（預設 --ink）" },
  // v49 新增 8 槽位
  "brand.primary": { css: "--pack-brand-primary", kind: "color", desc: "品牌主色（預設 #1769D2）" },
  "brand.accent":  { css: "--pack-brand-accent",  kind: "color", desc: "品牌強調色（預設 #FF4F87）" },
  "brand.dark":    { css: "--pack-brand-dark",    kind: "color", desc: "品牌深色（預設 #102949）" },
  "brand.positive":{ css: "--pack-brand-positive",kind: "color", desc: "品牌正面色（預設 #59C78B）" },
  "card.event":    { css: "--pack-card-event-bg",  kind: "color", desc: "事件卡背景色" },
  "card.proposal": { css: "--pack-card-proposal-bg", kind: "color", desc: "提案卡背景色" },
  "card.milestone":{ css: "--pack-card-milestone-bg",kind: "color", desc: "里程碑卡背景色" },
  "toolbar.bg":    { css: "--pack-toolbar-bg",    kind: "color", desc: "頂部工具列背景色" }
};


/* ---------- themeHero()：主視覺 hero 橫幅 ----------
   未導入 hero 資產時回傳空字串（畫面輸出與未接線時逐位元相同）；導入後才輸出橫幅節點。 */
function themeHero() {
  try {
    var p = THEME.pack;
    if (!p || !p.slots || !p.slots["hero.image"]) return "";
    return '<div class="v47hero" role="img" aria-label="主視覺"></div>';
  } catch (_) { return ""; }
}

/* ---------- 導入器：整包生效 ----------
   officialArtPack 結構（v49 擴充）：
   { brand: { gameLogo, leagueLogo, palette },
     teams: { T0: { logo, capMark, primaryColor, secondaryColor, homeUniform, awayUniform,
                    capMarkReference, shortName, brandKey }, ... },
            // ↑ 正式 team 欄位白名單（V50_TEAM_FIELDS）。cityUniform 已停用，不是正式欄位；
            //   舊主題包若帶此欄位，載入時會產生警告並由 v50StripDeprecatedFields() 剝除。
     nations: { NAT_0: { flag, palette }, ... },
     portraits: { layers, rules, rendererConfig },
     icons: { trophy: {svg|src}, ... },
     slots: { "bg.app": "url(...)/data:...", ... },
     playerPhotos: { "P_123": "data:...", "_default": "data:..." },
     screens: { dashboard: { bg }, ... },
     buttons: { primary: { bg }, ... },
     cards: { event: { bg }, ... },
     assets: { "team.logo": ..., ... } }
   全程 try-catch，任何缺項/格式錯誤都不得影響遊戲運轉。 */
function applyThemePack(pack) {
  try {
    if (!pack || typeof pack !== "object") return false;
    // v50：載入前驗證（警告記入 console 但不阻擋載入）
    try {
      var vr = validateThemePack(pack);
      if (vr.warnings.length > 0 && typeof console !== "undefined" && console.warn) {
        console.warn("[v50 主題包驗證]", vr.warnings);
      }
    } catch (_) {}
    // v50：停用欄位剝除（cityUniform 已取消第三套城市版，載入時忽略）
    try { pack = v50StripDeprecatedFields(pack); } catch (_) {}
    THEME.pack = pack;
    if (pack.slots) applyThemeSlots(pack.slots);
    if (pack.assets && typeof S !== "undefined" && S) {
      S.assets = Object.assign(S.assets || {}, pack.assets); // 橋接 v41⑦ assetSlot 掛載點
    }
    // v49：隊色覆蓋 CSS 變數（teams[teamId].primaryColor/secondaryColor）
    if (pack.teams) applyTeamColors(pack.teams);
    // v49：組合肖像圖層載入
    if (pack.portraits) { THEME.portraitAssets = pack.portraits; v49PortraitCache = {}; }
    // v49：持久化主題包到 localStorage（供下次開機自動載入）
    persistThemePack(pack);
    return true;
  } catch (_) { return false; }
}
function applyThemeSlots(slots) {
  try {
    if (typeof document === "undefined" || !document.documentElement || !document.documentElement.style) return;
    var root = document.documentElement.style;
    for (var key in slots) {
      if (!Object.prototype.hasOwnProperty.call(slots, key)) continue;
      var slot = THEME_SLOTS[key];
      var cssVar = slot ? slot.css : ("--pack-" + key.replace(/[^a-z0-9]+/gi, "-"));
      if (slots[key] != null) root.setProperty(cssVar, slots[key]);
    }
  } catch (_) {}
}
/* 由 JSON 文字導入（供設定頁「導入主題包」按鈕使用；解析失敗回傳錯誤訊息不 throw） */
function loadThemePackFromJSON(text) {
  try { return applyThemePack(JSON.parse(text)) ? { ok: true } : { ok: false, error: "格式不符" }; }
  catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}
/* 匯出目前主題包（除錯/範例用） */
function exportThemePack() { try { return JSON.stringify(THEME.pack || { icons: {}, slots: {} }, null, 2); } catch (_) { return "{}"; } }

/* ---------- v49 隊色 CSS 變數接線 ----------
   主題包提供 teams[teamId].primaryColor/secondaryColor 時，寫入 --team-TN-primary / --team-TN-secondary。
   畫面渲染時可用 var(--team-T0-primary, #default) 取得隊色。 */
function applyTeamColors(teamsMap) {
  try {
    if (typeof document === "undefined" || !document.documentElement) return;
    var root = document.documentElement.style;
    for (var tid in teamsMap) {
      if (!Object.prototype.hasOwnProperty.call(teamsMap, tid)) continue;
      var t = teamsMap[tid];
      if (t.primaryColor) root.setProperty("--team-" + tid + "-primary", t.primaryColor);
      if (t.secondaryColor) root.setProperty("--team-" + tid + "-secondary", t.secondaryColor);
    }
  } catch (_) {}
}

/* ---------- v49 隊徽取得 ----------
   主題包 teams[teamId].logo 有值時回傳 <img>，否則回傳空字串（維持現行純文字隊名）。 */
function themeTeamLogo(teamId, size) {
  try {
    var p = THEME.pack;
    if (!p || !p.teams || !p.teams[teamId] || !p.teams[teamId].logo) return "";
    size = size || 32;
    return '<img class="v49team-logo" src="' + p.teams[teamId].logo + '" width="' + size + '" height="' + size + '" alt="">';
  } catch (_) { return ""; }
}

/* ---------- v49 國旗取得 ----------
   主題包 nations[countryId].flag 有值時回傳 <img>，否則回傳空字串。 */
function themeNationFlag(countryId, size) {
  try {
    var p = THEME.pack;
    if (!p || !p.nations || !p.nations[countryId] || !p.nations[countryId].flag) return "";
    size = size || 20;
    return '<img class="v49nation-flag" src="' + p.nations[countryId].flag + '" width="' + size + '" height="' + size + '" alt="">';
  } catch (_) { return ""; }
}

/* ---------- v48 球員照片槽位（v50：支援肖像 context 透傳） ----------
   主題包可在 pack.playerPhotos[playerId] 或 pack.playerPhotos["_default"] 提供球員照片。
   v49：若有組合式肖像圖層 (portraits)，改呼叫 compositePortrait 合成。
   v50：第二參數可傳球員物件（舊式）或 { player, teamId, isAway }（新式 ctx）。
        非比賽情境不傳 isAway → 一律主場球衣（PORTRAIT_DEFAULT_AWAY=false）。
   未提供時回傳佔位框（icon camera）讓版面一致，Codex 可自行設計預設肖像。 */
function themePlayerPhoto(playerId, ctxOrPlayer) {
  try {
    var p = THEME.pack;
    // 優先：完整照片（指定 playerId 或 _default）
    var src = null;
    if (p && p.playerPhotos) {
      src = p.playerPhotos[playerId] || p.playerPhotos["_default"] || null;
    }
    if (src) return '<div class="v48photo"><img src="' + src + '" alt="球員照片"></div>';
    // 次選：組合式肖像（v49/v50）
    var portrait = compositePortrait(playerId, ctxOrPlayer, 64);
    if (portrait) return '<div class="v48photo">' + portrait + '</div>';
    // 後備：空佔位
    return '<div class="v48photo v48photo-empty">' + icon('camera') + '</div>';
  } catch (_) { return '<div class="v48photo v48photo-empty">' + icon('camera') + '</div>'; }
}

/* ---------- v49/v50 組合式肖像系統 ----------
   目的：用有限的圖層零件組合出約 1200+ 名球員的獨立外觀，避免準備上千張完整圖片。
   資料契約：
     - 每位球員有 p.appearanceSeed（整數，由不可變身份資料建立或首次生成後持久化）
     - 種子決定圖層選擇（膚色/臉型/眉眼/鼻嘴/髮型/鬍型），轉隊不變
     - 帽子與球衣由 team 動態決定（轉隊時跟著換）
     - 不使用 Math.random——用確定性雜湊（v46Fog 同族）

   v50 修正：肖像 context 明確化
     渲染入口：compositePortrait(playerId, ctx, size)
     ctx = { player, teamId, isAway } 三欄明確 context（不再靠 optPlayer._portraitAway 隱性旗標）
     - player：球員物件；省略時由 S.players[playerId] 取得
     - teamId：肖像要套哪一隊的帽子/球衣；省略時取 player.team
     - isAway：true=客場球衣、false/省略=主場球衣
     相容：舊呼叫 compositePortrait(id, playerObj, size) 仍可用（自動轉為 ctx.player）
     非比賽情境（名單/詳情/談判/選秀/交易/殿堂）一律用主場球衣（PORTRAIT_DEFAULT_AWAY=false）
     比賽情境由呼叫端明確傳入 isAway

   v50 快取鍵：playerId|teamId|size|H或A（四欄齊全）
     轉隊 → teamId 變 → 不命中舊快取
     主客切換 → H/A 變 → 不命中對側快取 */
var v49PortraitCache = {};
/* v50：非比賽情境的固定預設球衣＝主場（寫入規格 v50_art_interface_spec.md §5） */
var PORTRAIT_DEFAULT_AWAY = false;
// 確定性雜湊（從 appearanceSeed 取子值，不碰共享亂數）
function v49SeedHash(seed, index) {
  try {
    var h = ((seed * 2654435761 + index * 40503) >>> 0) % 2147483647;
    return h;
  } catch (_) { return 0; }
}
/* v50：把舊式第二參數（球員物件）或新式 ctx 統一轉為標準 context */
function v50NormalizePortraitCtx(playerId, ctxOrPlayer) {
  var ctx = { player: null, teamId: null, isAway: PORTRAIT_DEFAULT_AWAY };
  try {
    if (ctxOrPlayer && typeof ctxOrPlayer === "object") {
      // 新式 ctx：帶有 player / teamId / isAway 任一欄
      var looksLikeCtx = ("player" in ctxOrPlayer) || ("teamId" in ctxOrPlayer) || ("isAway" in ctxOrPlayer);
      if (looksLikeCtx) {
        ctx.player = ctxOrPlayer.player || null;
        ctx.teamId = ctxOrPlayer.teamId || null;
        ctx.isAway = !!ctxOrPlayer.isAway;
      } else {
        // 舊式：直接傳球員物件
        ctx.player = ctxOrPlayer;
      }
    }
    if (!ctx.player && typeof S !== "undefined" && S && S.players) ctx.player = S.players[playerId] || null;
    if (!ctx.teamId && ctx.player) ctx.teamId = ctx.player.team || null;
  } catch (_) {}
  return ctx;
}
// 組合式肖像渲染（Codex 提供圖層後生效；未提供圖層時回傳空字串）
function compositePortrait(playerId, ctxOrPlayer, size) {
  try {
    if (!THEME.portraitAssets || !THEME.portraitAssets.layers) return "";
    size = size || 64;
    var ctx = v50NormalizePortraitCtx(playerId, ctxOrPlayer);
    var player = ctx.player;
    if (!player || typeof player.appearanceSeed !== "number") return "";
    var teamId = ctx.teamId || "";
    // v50 快取鍵四欄齊全：playerId|teamId|size|H/A
    var cacheKey = playerId + "|" + teamId + "|" + size + "|" + (ctx.isAway ? "A" : "H");
    if (v49PortraitCache[cacheKey]) return v49PortraitCache[cacheKey];

    var seed = player.appearanceSeed;
    var layers = THEME.portraitAssets.layers;
    var rules = THEME.portraitAssets.rules || {};
    var config = THEME.portraitAssets.rendererConfig || {};

    // 各圖層選擇（由種子確定性決定）
    var skinIdx = layers.skin ? v49SeedHash(seed, 1) % layers.skin.length : 0;
    var faceIdx = layers.face ? v49SeedHash(seed, 2) % layers.face.length : 0;
    var eyesIdx = layers.eyes ? v49SeedHash(seed, 3) % layers.eyes.length : 0;
    var noseIdx = layers.nose ? v49SeedHash(seed, 4) % layers.nose.length : 0;
    var hairIdx = layers.hair ? v49SeedHash(seed, 5) % layers.hair.length : 0;
    var beardIdx = layers.beard ? v49SeedHash(seed, 6) % layers.beard.length : 0;

    // 帽子/球衣由球隊決定（轉隊即換）
    var teamArt = (THEME.pack && THEME.pack.teams && THEME.pack.teams[teamId]) || {};

    // v50 z-order：skin → face → eyes → nose → uniform → hair → beard → cap
    var layerOrder = (config && config.layerOrder) || PORTRAIT_SPEC.layerOrder;

    var parts = [];
    var hasBeard = rules.beardChance ? (v49SeedHash(seed, 7) % 100) < rules.beardChance : (v49SeedHash(seed, 7) % 100) < 30;

    /* v50 球衣選擇（正式僅 homeUniform / awayUniform 兩套；cityUniform 已停用）
       客場：awayUniform → 缺失回退 homeUniform
       主場：homeUniform → 缺失回退通用 layers.uniform[0] */
    var uniformSrc = null;
    if (ctx.isAway) uniformSrc = teamArt.awayUniform || teamArt.homeUniform || null;
    else uniformSrc = teamArt.homeUniform || null;

    for (var li = 0; li < layerOrder.length; li++) {
      var ln = layerOrder[li];
      if (ln === "skin" && layers.skin && layers.skin[skinIdx]) parts.push('<img src="' + layers.skin[skinIdx] + '" class="v49layer">');
      else if (ln === "face" && layers.face && layers.face[faceIdx]) parts.push('<img src="' + layers.face[faceIdx] + '" class="v49layer">');
      else if (ln === "eyes" && layers.eyes && layers.eyes[eyesIdx]) parts.push('<img src="' + layers.eyes[eyesIdx] + '" class="v49layer">');
      else if (ln === "nose" && layers.nose && layers.nose[noseIdx]) parts.push('<img src="' + layers.nose[noseIdx] + '" class="v49layer">');
      else if (ln === "uniform") {
        if (uniformSrc) parts.push('<img src="' + uniformSrc + '" class="v49layer">');
        else if (layers.uniform && layers.uniform.length > 0) parts.push('<img src="' + layers.uniform[0] + '" class="v49layer">');
      }
      else if (ln === "hair" && layers.hair && layers.hair[hairIdx]) parts.push('<img src="' + layers.hair[hairIdx] + '" class="v49layer">');
      else if (ln === "beard" && hasBeard && layers.beard && layers.beard[beardIdx]) parts.push('<img src="' + layers.beard[beardIdx] + '" class="v49layer">');
      else if (ln === "cap") {
        // capMark = 完整帽子圖層（v50 定案：不拆分 capBase＋capInsignia）
        if (teamArt.capMark) parts.push('<img src="' + teamArt.capMark + '" class="v49layer">');
        else if (layers.cap && layers.cap.length > 0) parts.push('<img src="' + layers.cap[0] + '" class="v49layer">');
      }
    }

    if (parts.length === 0) return "";
    var html = '<div class="v49portrait" style="width:' + size + 'px;height:' + size + 'px;">' + parts.join("") + '</div>';
    v49PortraitCache[cacheKey] = html;
    return html;
  } catch (_) { return ""; }
}
// render() 前清空快取（避免轉隊後顯示舊帽）
function v49ClearPortraitCache() { v49PortraitCache = {}; }

/* ---------- v48 雷達圖配色取得（從主題包 CSS 變數或預設值） ---------- */
function themeRadarColors() {
  try {
    var p = THEME.pack, s = (p && p.slots) || {};
    return {
      fill: s["radar.fill"] || "rgba(217,164,65,0.25)",
      stroke: s["radar.stroke"] || "#D9A441",
      grid: s["radar.grid"] || "rgba(255,255,255,0.15)",
      text: s["radar.text"] || "#e8dcc8"
    };
  } catch (_) { return { fill: "rgba(217,164,65,0.25)", stroke: "#D9A441", grid: "rgba(255,255,255,0.15)", text: "#e8dcc8" }; }
}

/* ---------- v50 主題包持久化（localStorage + IndexedDB 後備） ----------
   官方主題包載入後自動存入 localStorage（鍵 v50_theme_pack），下次開機自動載入。
   大型主題包超出 localStorage 5MB 限制時，自動回退到 IndexedDB（v50_theme_db）。
   不動遊戲存檔 IndexedDB，不動共享亂數。失敗時靜默回退。
   v50 遷移：舊 v49_theme_pack 鍵自動清除。 */
function persistThemePack(pack) {
  try {
    // v50 遷移：清除舊版 v49 鍵
    try { if (typeof localStorage !== "undefined") { localStorage.removeItem("v49_theme_pack"); localStorage.removeItem("v49_theme_meta"); } } catch (_) {}
    if (!pack) { try { if (typeof localStorage !== "undefined") localStorage.removeItem("v50_theme_pack"); } catch (_) {} _v50IdbDeleteTheme(); return; }
    var meta = { version: pack.version || "custom", hasPack: true, ts: Date.now() };
    if (typeof localStorage !== "undefined") {
      try { localStorage.setItem("v50_theme_meta", JSON.stringify(meta)); } catch (_) {}
      // 嘗試存完整包到 localStorage
      try { localStorage.setItem("v50_theme_pack", JSON.stringify(pack)); return; } catch (_) {}
    }
    // localStorage 失敗或不可用 → 回退到 IndexedDB
    _v50IdbSaveTheme(pack);
  } catch (_) {}
}
function loadPersistedThemePack() {
  try {
    // 優先 localStorage
    if (typeof localStorage !== "undefined") {
      var raw = localStorage.getItem("v50_theme_pack");
      if (raw) {
        var pack = JSON.parse(raw);
        return applyThemePackSilent(pack);
      }
    }
    // 回退 IndexedDB（非同步，但開機時 init 已 await loadState 後才呼叫此處，可容許同步失敗靜默）
    _v50IdbLoadTheme();
    return false;
  } catch (_) { return false; }
}
/* v50 IndexedDB 後備——獨立 DB（v50_theme_db），不干擾遊戲存檔 DB */
function _v50IdbSaveTheme(pack) {
  try {
    if (typeof indexedDB === "undefined") return;
    var req = indexedDB.open("v50_theme_db", 1);
    req.onupgradeneeded = function(e) { e.target.result.createObjectStore("theme"); };
    req.onsuccess = function(e) {
      try {
        var tx = e.target.result.transaction("theme", "readwrite");
        tx.objectStore("theme").put(pack, "current");
      } catch (_) {}
    };
  } catch (_) {}
}
function _v50IdbLoadTheme() {
  try {
    if (typeof indexedDB === "undefined") return;
    var req = indexedDB.open("v50_theme_db", 1);
    req.onupgradeneeded = function(e) { e.target.result.createObjectStore("theme"); };
    req.onsuccess = function(e) {
      try {
        var tx = e.target.result.transaction("theme", "readonly");
        var gr = tx.objectStore("theme").get("current");
        gr.onsuccess = function() { if (gr.result) applyThemePackSilent(gr.result); };
      } catch (_) {}
    };
  } catch (_) {}
}
function _v50IdbDeleteTheme() {
  try {
    if (typeof indexedDB === "undefined") return;
    var req = indexedDB.open("v50_theme_db", 1);
    req.onupgradeneeded = function(e) { e.target.result.createObjectStore("theme"); };
    req.onsuccess = function(e) {
      try {
        var tx = e.target.result.transaction("theme", "readwrite");
        tx.objectStore("theme").delete("current");
      } catch (_) {}
    };
  } catch (_) {}
}
// 靜默導入（不觸發持久化，供開機自動載入用）
function applyThemePackSilent(pack) {
  try {
    if (!pack || typeof pack !== "object") return false;
    THEME.pack = pack;
    if (pack.slots) applyThemeSlots(pack.slots);
    if (pack.assets && typeof S !== "undefined" && S) {
      S.assets = Object.assign(S.assets || {}, pack.assets);
    }
    if (pack.teams) applyTeamColors(pack.teams);
    if (pack.portraits) { THEME.portraitAssets = pack.portraits; v49PortraitCache = {}; }
    return true;
  } catch (_) { return false; }
}
function resetThemePack() {
  try {
    THEME.pack = null;
    THEME.portraitAssets = null;
    v49PortraitCache = {};
    if (typeof localStorage !== "undefined") {
      try { localStorage.removeItem("v50_theme_pack"); } catch (_) {}
      try { localStorage.removeItem("v50_theme_meta"); } catch (_) {}
      // 清舊版鍵
      try { localStorage.removeItem("v49_theme_pack"); } catch (_) {}
      try { localStorage.removeItem("v49_theme_meta"); } catch (_) {}
    }
    _v50IdbDeleteTheme();
    // 清除所有已套用的 CSS 變數
    if (typeof document !== "undefined" && document.documentElement && document.documentElement.style) {
      var root = document.documentElement.style;
      for (var key in THEME_SLOTS) {
        if (Object.prototype.hasOwnProperty.call(THEME_SLOTS, key)) {
          root.removeProperty(THEME_SLOTS[key].css);
        }
      }
    }
    return true;
  } catch (_) { return false; }
}

/* ---------- v50 主題包驗證（完整版） ----------
   驗證範圍：teamId 白名單、team 欄位白名單、圖片 URI 格式、色彩格式、
             rendererConfig.layerOrder（陣列/合法項/無重複/必要層齊全）、
             cityUniform 停用相容警告、slots 鍵名。
   語意約定（同步寫入 v50_art_interface_spec.md §6）：
     valid=false   → 主題包結構根本不可用（非物件、驗證本身拋例外）；載入器仍會嘗試套用但不保證行為
     valid=true    → 結構可用；個別欄位問題一律以 warnings 呈現，不阻擋載入
     warnings[]    → 每則為可讀中文字串，指出「哪個鍵、什麼問題」；空陣列代表無已知問題
   既定策略：警告但不阻擋載入（讓 Codex 能漸進補齊素材而不被擋住）。 */

/* 允許的 team 圖層/欄位白名單（正式使用欄位） */
var V50_TEAM_FIELDS = Object.freeze({
  logo: "image", capMark: "image", homeUniform: "image", awayUniform: "image",
  primaryColor: "color", secondaryColor: "color",
  capMarkReference: "image", // Codex 交接輔助欄位（非正式帽子層）
  shortName: "text", brandKey: "text"
});
/* 已停用欄位（舊主題包相容：忽略並警告） */
var V50_TEAM_DEPRECATED = Object.freeze(["cityUniform"]);
/* 合法圖層名稱（layerOrder 只能用這些） */
var V50_LAYER_NAMES = Object.freeze(["skin", "face", "eyes", "nose", "uniform", "hair", "beard", "cap"]);
/* 必要圖層（layerOrder 缺任一即警告） */
var V50_LAYER_REQUIRED = Object.freeze(["skin", "face", "uniform", "cap"]);

/* v50 圖片 URI 格式驗證：允許 data URI、http(s)、相對路徑；副檔名限 png/jpg/jpeg/webp/svg */
function v50IsValidImageUri(s) {
  try {
    if (typeof s !== "string" || s.length === 0) return false;
    // data URI（base64 內嵌）
    if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(s)) return true;
    // http(s) 絕對網址
    if (/^https?:\/\/[^\s]+\.(png|jpe?g|webp|svg)(\?[^\s]*)?$/i.test(s)) return true;
    // 相對路徑（不得以 / 或 \ 開頭以外的協定，不得含 ..）
    if (/^[A-Za-z0-9_\-./]+\.(png|jpe?g|webp|svg)$/.test(s) && s.indexOf("..") === -1) return true;
    return false;
  } catch (_) { return false; }
}
/* v50 色彩格式驗證：#RGB / #RRGGBB / #RRGGBBAA */
function v50IsValidColor(s) {
  try { return typeof s === "string" && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(s); }
  catch (_) { return false; }
}

function validateThemePack(pack) {
  var result = { valid: true, warnings: [] };
  function warn(m) { result.warnings.push(m); }
  try {
    if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
      result.valid = false; warn("主題包不是合法物件"); return result;
    }

    /* ---- teams ---- */
    if (pack.teams) {
      if (typeof pack.teams !== "object" || Array.isArray(pack.teams)) {
        warn("teams 應為物件（以 teamId 為鍵）");
      } else {
        var validIds = {};
        if (typeof TEAM_DEFS !== "undefined" && TEAM_DEFS && TEAM_DEFS.forEach) TEAM_DEFS.forEach(function(d) { validIds[d.id] = true; });
        else for (var i = 0; i < 20; i++) validIds["T" + i] = true;

        for (var tid in pack.teams) {
          if (!Object.prototype.hasOwnProperty.call(pack.teams, tid)) continue;
          if (!validIds[tid]) warn("未知 teamId：" + tid + "（合法範圍 T0～T19）");
          var t = pack.teams[tid];
          if (!t || typeof t !== "object") { warn(tid + " 的值應為物件"); continue; }

          for (var f in t) {
            if (!Object.prototype.hasOwnProperty.call(t, f)) continue;
            // 停用欄位
            if (V50_TEAM_DEPRECATED.indexOf(f) !== -1) {
              warn(tid + "." + f + " 已停用（v50 取消第三套城市版球衣），載入時忽略；正式球衣只用 homeUniform／awayUniform");
              continue;
            }
            var kind = V50_TEAM_FIELDS[f];
            if (!kind) { warn(tid + " 有未知圖層／欄位：" + f); continue; }
            if (kind === "image") {
              if (typeof t[f] !== "string") warn(tid + "." + f + " 應為字串圖片 URI");
              else if (!v50IsValidImageUri(t[f])) warn(tid + "." + f + " 圖片 URI 格式不合法：" + String(t[f]).slice(0, 60));
            } else if (kind === "color") {
              if (!v50IsValidColor(t[f])) warn(tid + "." + f + " 色彩格式不合法（需 #RGB／#RRGGBB／#RRGGBBAA）：" + t[f]);
            } else if (kind === "text") {
              if (typeof t[f] !== "string") warn(tid + "." + f + " 應為字串");
            }
          }
        }
      }
    }

    /* ---- portraits ---- */
    if (pack.portraits) {
      var po = pack.portraits;
      if (typeof po !== "object" || Array.isArray(po)) {
        warn("portraits 應為物件");
      } else {
        if (po.layers) {
          if (typeof po.layers !== "object" || Array.isArray(po.layers)) warn("portraits.layers 應為物件");
          else {
            for (var lk in po.layers) {
              if (!Object.prototype.hasOwnProperty.call(po.layers, lk)) continue;
              if (V50_LAYER_NAMES.indexOf(lk) === -1) { warn("portraits.layers 有未知圖層名稱：" + lk); continue; }
              var arr = po.layers[lk];
              if (!Array.isArray(arr)) { warn("portraits.layers." + lk + " 應為陣列"); continue; }
              for (var ai = 0; ai < arr.length; ai++) {
                if (!v50IsValidImageUri(arr[ai])) warn("portraits.layers." + lk + "[" + ai + "] 圖片 URI 格式不合法：" + String(arr[ai]).slice(0, 60));
              }
            }
          }
        }
        if (po.rendererConfig && po.rendererConfig.layerOrder !== undefined) {
          var lo = po.rendererConfig.layerOrder;
          if (!Array.isArray(lo)) {
            warn("rendererConfig.layerOrder 應為陣列");
          } else {
            var seen = {};
            for (var oi = 0; oi < lo.length; oi++) {
              var nm = lo[oi];
              if (V50_LAYER_NAMES.indexOf(nm) === -1) warn("rendererConfig.layerOrder 有未知圖層名稱：" + String(nm));
              else if (seen[nm]) warn("rendererConfig.layerOrder 有重複圖層：" + nm);
              else seen[nm] = true;
            }
            for (var ri = 0; ri < V50_LAYER_REQUIRED.length; ri++) {
              if (!seen[V50_LAYER_REQUIRED[ri]]) warn("rendererConfig.layerOrder 缺少必要圖層：" + V50_LAYER_REQUIRED[ri]);
            }
          }
        }
      }
    }

    /* ---- slots ---- */
    if (pack.slots) {
      if (typeof pack.slots !== "object" || Array.isArray(pack.slots)) warn("slots 應為物件");
      else for (var sk in pack.slots) {
        if (!Object.prototype.hasOwnProperty.call(pack.slots, sk)) continue;
        if (!THEME_SLOTS[sk]) warn("未知的 slot 鍵：" + sk);
      }
    }

    /* ---- playerPhotos ---- */
    if (pack.playerPhotos) {
      if (typeof pack.playerPhotos !== "object" || Array.isArray(pack.playerPhotos)) warn("playerPhotos 應為物件");
      else for (var pk in pack.playerPhotos) {
        if (!Object.prototype.hasOwnProperty.call(pack.playerPhotos, pk)) continue;
        if (!v50IsValidImageUri(pack.playerPhotos[pk])) warn("playerPhotos." + pk + " 圖片 URI 格式不合法");
      }
    }
  } catch (e) {
    result.valid = false; warn("驗證發生例外：" + String((e && e.message) || e));
  }
  return result;
}

/* ---------- v50 比賽情境主客場判定 ----------
   給肖像 context 用：判斷指定球隊在「最近一場比賽」是主場還是客場。
   來源：S.resultsLog 最末筆（當日賽果陣列，每筆含 home/away teamId）。
   非比賽情境（名單/詳情/談判/選秀/交易/殿堂）不呼叫此函式，
   一律用 PORTRAIT_DEFAULT_AWAY=false（主場球衣）——見 v50_art_interface_spec.md §5。 */
function v50IsTeamAwayToday(teamId, optResults) {
  try {
    if (!teamId) return false;
    var results = optResults;
    if (!results && typeof S !== "undefined" && S && S.resultsLog && S.resultsLog.length) {
      results = S.resultsLog[S.resultsLog.length - 1].results;
    }
    if (!results || !results.length) return false;
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (r && r.away === teamId) return true;
      if (r && r.home === teamId) return false;
    }
    return false;
  } catch (_) { return false; }
}
/* v50：組出比賽情境的肖像 context（供比賽相關 UI 使用） */
function v50GamePortraitCtx(player, optResults) {
  try {
    var tid = player && player.team ? player.team : null;
    return { player: player, teamId: tid, isAway: v50IsTeamAwayToday(tid, optResults) };
  } catch (_) { return { player: player, teamId: null, isAway: false }; }
}

/* v50：剝除已停用欄位（cityUniform）——保留舊主題包相容性但不讓遊戲讀到停用欄位。
   回傳新物件（不改動呼叫端傳入的原始物件）。 */
function v50StripDeprecatedFields(pack) {
  try {
    if (!pack || typeof pack !== "object" || !pack.teams) return pack;
    var hasDep = false;
    for (var tid in pack.teams) {
      if (!Object.prototype.hasOwnProperty.call(pack.teams, tid)) continue;
      var t = pack.teams[tid];
      if (!t || typeof t !== "object") continue;
      for (var di = 0; di < V50_TEAM_DEPRECATED.length; di++) {
        if (Object.prototype.hasOwnProperty.call(t, V50_TEAM_DEPRECATED[di])) { hasDep = true; break; }
      }
      if (hasDep) break;
    }
    if (!hasDep) return pack;
    // 淺層複製 teams，剝除停用欄位
    var out = {}; for (var k in pack) if (Object.prototype.hasOwnProperty.call(pack, k)) out[k] = pack[k];
    out.teams = {};
    for (var tid2 in pack.teams) {
      if (!Object.prototype.hasOwnProperty.call(pack.teams, tid2)) continue;
      var src = pack.teams[tid2];
      if (!src || typeof src !== "object") { out.teams[tid2] = src; continue; }
      var cp = {};
      for (var f in src) {
        if (!Object.prototype.hasOwnProperty.call(src, f)) continue;
        if (V50_TEAM_DEPRECATED.indexOf(f) !== -1) continue; // 剝除
        cp[f] = src[f];
      }
      out.teams[tid2] = cp;
    }
    return out;
  } catch (_) { return pack; }
}

/* 供 Codex 讀取的清單（語意圖示名＋槽位＋品牌）——製作規格由 THEME_ICONS/THEME_SLOTS 自動衍生 */
function themeManifest() {
  var out = { version: THEME.version, brand: BRAND, icons: Object.keys(THEME_ICONS), slots: {}, portraitSpec: PORTRAIT_SPEC };
  for (var k in THEME_SLOTS) if (Object.prototype.hasOwnProperty.call(THEME_SLOTS, k)) out.slots[k] = { css: THEME_SLOTS[k].css, kind: THEME_SLOTS[k].kind, desc: THEME_SLOTS[k].desc };
  return out;
}

/* 對外可見（瀏覽器與 vm 沙盒皆可） */
try { if (typeof globalThis !== "undefined") {
  globalThis.icon = icon; globalThis.iconVal = iconVal; globalThis.themeHero = themeHero;
  globalThis.themePlayerPhoto = themePlayerPhoto; globalThis.themeRadarColors = themeRadarColors;
  globalThis.THEME = THEME; globalThis.BRAND = BRAND;
  globalThis.applyThemePack = applyThemePack; globalThis.loadThemePackFromJSON = loadThemePackFromJSON;
  globalThis.exportThemePack = exportThemePack; globalThis.resetThemePack = resetThemePack;
  globalThis.loadPersistedThemePack = loadPersistedThemePack;
  globalThis.themeTeamLogo = themeTeamLogo; globalThis.themeNationFlag = themeNationFlag;
  globalThis.compositePortrait = compositePortrait; globalThis.v49ClearPortraitCache = v49ClearPortraitCache;
  globalThis.v49SeedHash = v49SeedHash;
  globalThis.THEME_ICONS = THEME_ICONS; globalThis.THEME_SLOTS = THEME_SLOTS;
  globalThis.PORTRAIT_SPEC = PORTRAIT_SPEC; globalThis.validateThemePack = validateThemePack;
  globalThis.PORTRAIT_DEFAULT_AWAY = PORTRAIT_DEFAULT_AWAY;
  globalThis.v50NormalizePortraitCtx = v50NormalizePortraitCtx;
  globalThis.v50IsValidImageUri = v50IsValidImageUri; globalThis.v50IsValidColor = v50IsValidColor;
  globalThis.v50StripDeprecatedFields = v50StripDeprecatedFields;
  globalThis.v50IsTeamAwayToday = v50IsTeamAwayToday; globalThis.v50GamePortraitCtx = v50GamePortraitCtx;
  globalThis.V50_TEAM_FIELDS = V50_TEAM_FIELDS; globalThis.V50_TEAM_DEPRECATED = V50_TEAM_DEPRECATED;
  globalThis.V50_LAYER_NAMES = V50_LAYER_NAMES; globalThis.V50_LAYER_REQUIRED = V50_LAYER_REQUIRED;
} } catch (_) {}
