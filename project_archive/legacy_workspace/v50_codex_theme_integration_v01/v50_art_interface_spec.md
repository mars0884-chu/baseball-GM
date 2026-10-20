# 決勝GM v50 美術接口正式規格書

> 版本：v50
> 日期：2026-07-25
> 適用：Codex 美術層製作與 Theme pack 產出
> 權威來源：`00-theme.js`（本文件與程式碼不一致時，以程式碼為準並回報）

---

## 一、PORTRAIT_SPEC（肖像母版規格）

程式常數位置：`00-theme.js` → `PORTRAIT_SPEC`（`Object.freeze`）

```
PORTRAIT_SPEC = {
  masterSize: 256,
  outputSizes: [64, 128],
  anchors: {
    headTop:    { x: 0.50, y: 0.10 },
    faceCenter: { x: 0.50, y: 0.38 },
    neckline:   { x: 0.50, y: 0.72 }
  },
  layerOrder: ["skin","face","eyes","nose","uniform","hair","beard","cap"],
  capMarkNote: "capMark = 完整帽子圖層（含帽身＋帽簷＋帽徽），非單獨帽徽",
  uniformNote: "正式球衣僅 homeUniform 與 awayUniform；cityUniform 已停用，載入時忽略。客場素材缺失時回退 homeUniform"
}
```

### 母版畫布

- 尺寸：**256 × 256** 像素
- 格式：PNG，透明背景（Alpha 通道）
- 所有肖像零件（skin/face/eyes/nose/hair/beard/cap/uniform）必須使用同一母版尺寸與同一錨點基準

### 輸出尺寸

| 尺寸 | 使用位置 |
|------|----------|
| 64 px | 球員名單、球員卡片、比賽情境肖像 |
| 128 px | 球員詳情、談判畫面 |

---

## 二、錨點與安全區

三個錨點以百分比定義，對應 256×256 母版上的絕對像素：

| 錨點 | 百分比 | 256px 絕對位置 | 意義 |
|------|--------|---------------|------|
| `headTop` | x=50%, y=10% | (128, 26) | 帽頂對齊線 |
| `faceCenter` | x=50%, y=38% | (128, 97) | 五官對齊中心 |
| `neckline` | x=50%, y=72% | (128, 184) | 領口上緣對齊線 |

### 安全區規則

- **64px 縮圖安全區**：`headTop` ~ `neckline` 之間的區域（y=26 ~ y=184，高度 158px）等比縮放後居中裁切。此區域內的內容在 64px 輸出時必定完整可見。
- **帽簷基準**：帽簷位置由 `capMark` 圖層自行定義，但帽頂不得超過 `headTop`（y=26），否則 64px 縮圖會截頂。
- **領口寬度**：由 `uniform` 圖層自行定義，中心固定 x=50%。領口上緣不得高於 `neckline`（y=184），否則會遮住下巴。
- **邊界留白**：建議四邊各留 8px 透明邊界，避免縮放時邊緣鋸齒。

---

## 三、z-order（圖層疊放順序）

```
skin → face → eyes → nose → uniform → hair → beard → cap
```

| 順位 | 圖層 | 說明 |
|------|------|------|
| 1 | `skin` | 膚色底 |
| 2 | `face` | 臉型輪廓 |
| 3 | `eyes` | 眉眼 |
| 4 | `nose` | 鼻嘴 |
| 5 | `uniform` | 球衣（**在毛髮之前**） |
| 6 | `hair` | 髮型（蓋過球衣領口） |
| 7 | `beard` | 鬍型 |
| 8 | `cap` | 帽子（最上層） |

### 設計理由

球衣放在毛髮之前，是為了讓長髮／鬢角能自然蓋在球衣領口之上；帽子放最後，讓帽簷能正確蓋住額頭與部分瀏海。

### 自訂覆蓋

主題包可透過 `portraits.rendererConfig.layerOrder` 提供自訂順序陣列。驗證規則見 §6。

---

## 四、capMark（帽子圖層）

### 定案：方案 A ——完整帽子圖層

- `capMark` = **完整帽子透明圖層**，256×256，包含帽身 + 帽簷 + 帽徽
- **不拆分**為 `capBase` + `capInsignia`
- 每隊一張，路徑放在 `teams.<teamId>.capMark`

### capMarkReference 的定位

`capMarkReference` 是 Codex 交接階段的**輔助參考欄位**，用於存放帽徽概念圖或色彩參考。

**不得直接填入 `capMark`**——必須另外製作正式的完整帽子圖層。

---

## 五、home／away 球衣策略

### 正式使用欄位（僅兩套）

| 欄位 | 說明 |
|------|------|
| `homeUniform` | 白色系主場球衣圖層 |
| `awayUniform` | 球隊主色系客場球衣圖層 |

### cityUniform 已停用

- v50 決策：取消第三套城市版球衣
- `cityUniform` **不在正式欄位白名單** (`V50_TEAM_FIELDS`) 內
- 舊主題包若帶有 `cityUniform`：載入時由 `v50StripDeprecatedFields()` 剝除，並產生「已停用」警告
- 遊戲程式碼**不會**讀取 `cityUniform`

### 選用邏輯

```
若 isAway === true:
    uniformSrc = awayUniform || homeUniform || null
否則:
    uniformSrc = homeUniform || null

若 uniformSrc 為 null:
    回退到通用 portraits.layers.uniform[0]
```

**客場素材缺失時回退主場素材**——這是刻意設計，讓 Codex 可以先做主場再補客場，不會因缺件而破圖。

### 肖像 context

渲染入口：

```
compositePortrait(playerId, ctx, size)
ctx = { player, teamId, isAway }
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `player` | object | 球員物件（省略時由 `S.players[playerId]` 取得） |
| `teamId` | string | 要套哪一隊的帽子／球衣（省略時取 `player.team`） |
| `isAway` | boolean | true=客場球衣、false／省略=主場球衣 |

**向後相容**：舊式呼叫 `compositePortrait(id, playerObject, size)` 仍可用，會自動轉為 `ctx.player`，`isAway` 取預設值。

### 非比賽情境的固定預設

程式常數：`PORTRAIT_DEFAULT_AWAY = false`

以下情境**一律使用主場球衣**：

- 球員名單、球員完整資料卡、球員詳情
- 談判畫面、選秀畫面、交易畫面
- 求購市場、國際市場、自由球員市場
- 榮譽殿堂、里程碑報喜、事件卡

### 比賽情境

比賽情境由呼叫端**明確傳入** `isAway`。目前唯一的比賽情境出口：

- `renderLastGameCard()`（06-ui-roster.js）——「最近一戰」卡片，依該場實際主客場傳入 `isAway: !isHome`

輔助函式：

| 函式 | 用途 |
|------|------|
| `v50IsTeamAwayToday(teamId, optResults)` | 從賽果判斷該隊是否為客隊 |
| `v50GamePortraitCtx(player, optResults)` | 組出比賽情境 ctx |

---

## 六、Theme pack schema、URI 規則與驗證警告

### team 欄位白名單（`V50_TEAM_FIELDS`）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `logo` | image | 隊徽 |
| `capMark` | image | 完整帽子圖層 |
| `homeUniform` | image | 主場球衣 |
| `awayUniform` | image | 客場球衣 |
| `primaryColor` | color | 主色 |
| `secondaryColor` | color | 輔色 |
| `capMarkReference` | image | 帽徽參考（交接輔助，非正式圖層） |
| `shortName` | text | 隊伍簡稱 |
| `brandKey` | text | 美術資產目錄鍵名 |

白名單以外的欄位一律產生「未知圖層／欄位」警告。

### 停用欄位（`V50_TEAM_DEPRECATED`）

- `cityUniform`

### 合法圖層名稱（`V50_LAYER_NAMES`）

```
skin, face, eyes, nose, uniform, hair, beard, cap
```

### 必要圖層（`V50_LAYER_REQUIRED`）

```
skin, face, uniform, cap
```

`layerOrder` 缺少其中任一項即產生警告。

### 圖片 URI 規則（`v50IsValidImageUri`）

允許三種形式，副檔名限 `png` / `jpg` / `jpeg` / `webp` / `svg`：

| 形式 | 範例 | 說明 |
|------|------|------|
| data URI | `data:image/png;base64,iVBOR...` | 內嵌 base64 |
| http(s) | `https://cdn.example.com/logo.svg` | 絕對網址 |
| 相對路徑 | `assets/teams/T0/logo.png` | 限 `A-Za-z0-9_-./`，不得含 `..` |

不合法範例：`assets/logo.txt`（非圖片副檔名）、`javascript:alert(1)`（危險協定）、`../../etc/passwd.png`（路徑穿越）。

### 色彩格式規則（`v50IsValidColor`）

允許 `#RGB` / `#RRGGBB` / `#RRGGBBAA` 三種長度的十六進位色碼。

### 驗證回傳語意（`validateThemePack`）

```
{ valid: boolean, warnings: string[] }
```

| 欄位 | 語意 |
|------|------|
| `valid: false` | 主題包結構**根本不可用**（非物件、傳入 null、傳入陣列、驗證本身拋例外）。載入器仍會嘗試套用但不保證行為 |
| `valid: true` | 結構可用。個別欄位問題一律以 `warnings` 呈現 |
| `warnings[]` | 每則為可讀中文字串，指出「哪個鍵、什麼問題」。空陣列代表無已知問題 |

### 既定策略：警告但不阻擋載入

**個別欄位有問題不會阻擋主題包載入**。這是刻意設計，讓 Codex 可以漸進補齊素材而不會因為單一欄位錯誤導致整包無法測試。

警告會輸出到 `console.warn("[v50 主題包驗證]", warnings)`。

### 完整警告類型清單

| 觸發條件 | 警告訊息關鍵字 |
|---------|--------------|
| teamId 不在 T0～T19 | `未知 teamId` |
| team 欄位不在白名單 | `未知圖層／欄位` |
| team 欄位帶 cityUniform | `已停用` |
| 圖片 URI 格式不合法 | `圖片 URI 格式不合法` |
| 色彩格式不合法 | `色彩格式不合法` |
| layerOrder 非陣列 | `應為陣列` |
| layerOrder 有未知圖層名 | `未知圖層名稱` |
| layerOrder 有重複項 | `重複圖層` |
| layerOrder 缺必要層 | `缺少必要圖層` |
| layers 有未知圖層名 | `未知圖層名稱` |
| layers 陣列元素 URI 不合法 | `圖片 URI 格式不合法` |
| slots 鍵名不在登錄表 | `未知的 slot 鍵` |
| playerPhotos URI 不合法 | `圖片 URI 格式不合法` |

---

## 七、快取與轉隊／主客場行為

### 快取鍵組成（四欄齊全）

```
playerId | teamId | size | H或A
```

範例：`B_0042|T7|64|A`

### 保證行為

| 情境 | 行為 |
|------|------|
| 同球員主場 → 客場 | 快取鍵尾碼 H→A，**不命中**主場快取，正確顯示客場球衣 |
| 球員轉隊 T0 → T1 | 快取鍵 teamId 變更，**不命中**舊球隊快取，正確顯示新隊帽子與球衣 |
| 同球員 64px → 128px | 快取鍵 size 變更，各自獨立快取 |
| 導入新主題包 | `applyThemePack()` 自動清空整個快取 |
| 每次 `render()` 前 | `v49ClearPortraitCache()` 清空快取 |

### 手動清空

`v49ClearPortraitCache()` 可隨時呼叫清空全部肖像快取。

---

## 八、20 隊品牌資料（穩定 ID 映射）

美術資產一律以 **teamId** 為鍵，不得用可能變動的顯示名稱。

| teamId | 隊名 | brandKey | 聯盟 | 分區 | 主色 | 輔色 |
|--------|------|----------|------|------|------|------|
| T0 | 靖安盾衛 | jingan_guardians | A | A1 | #1B3A6B | #C0C0C0 |
| T1 | 臨海獵鯊 | linhai_sharks | A | A1 | #005F73 | #0A9396 |
| T2 | 曲江水牛 | qujiang_buffalo | A | A1 | #6B4226 | #D4A373 |
| T3 | 永昌雄獅 | yongchang_lions | A | A1 | #B8860B | #1C1C1C |
| T4 | 明陽烈焰 | mingyang_blaze | A | A1 | #CC3311 | #FF8800 |
| T5 | 天啟鷹 | tianqi_eagles | A | A2 | #2E4057 | #D4AF37 |
| T6 | 龍城雲豹 | longcheng_leopards | A | A2 | #4A4A4A | #E8C547 |
| T7 | 星野銀狐 | xingye_foxes | A | A2 | #708090 | #C0C0C0 |
| T8 | 雲夢白鷺 | yunmeng_egrets | A | A2 | #F0F0F0 | #4682B4 |
| T9 | 東寧豹 | dongning_leopards | A | A2 | #1C1C1C | #D4A017 |
| T10 | 嘉禾金穗 | jiahe_harvest | B | B1 | #DAA520 | #228B22 |
| T11 | 瑞港海豚 | ruigang_dolphins | B | B1 | #0077B6 | #48CAE4 |
| T12 | 金川礦工 | jinchuan_miners | B | B1 | #5C4033 | #E8A838 |
| T13 | 玄武黑熊 | xuanwu_bears | B | B1 | #1C1C1C | #4B5320 |
| T14 | 朝陽赤鷹 | chaoyang_redhawks | B | B1 | #B22222 | #FFD700 |
| T15 | 鳳鳴紅雀 | fengming_redbirds | B | B2 | #C41E3A | #FFFACD |
| T16 | 銀灘破浪 | yintan_breakers | B | B2 | #006994 | #F5F5DC |
| T17 | 青川山羌 | qingchuan_serows | B | B2 | #2D6A4F | #B7E4C7 |
| T18 | 望海白鯨 | wanghai_whales | B | B2 | #E8E8E8 | #1E3A5F |
| T19 | 磐石鐵衛 | panshi_ironguard | B | B2 | #36454F | #A9A9A9 |

---

## 九、完整主題包範例

見 `theme_pack_example.json`（模組 ZIP 內）。

```json
{
  "version": "v50",
  "teams": {
    "T0": {
      "logo": "assets/teams/T0/logo_128.png",
      "capMark": "assets/teams/T0/cap_256.png",
      "primaryColor": "#1B3A6B",
      "secondaryColor": "#C0C0C0",
      "homeUniform": "assets/teams/T0/uniform_home_256.png",
      "awayUniform": "assets/teams/T0/uniform_away_256.png"
    }
  },
  "portraits": {
    "layers": {
      "skin": ["assets/portrait/skin_01.png"],
      "face": ["assets/portrait/face_01.png"],
      "eyes": ["assets/portrait/eyes_01.png"],
      "nose": ["assets/portrait/nose_01.png"],
      "hair": ["assets/portrait/hair_01.png"],
      "beard": ["assets/portrait/beard_01.png"],
      "cap": ["assets/portrait/cap_default.png"],
      "uniform": ["assets/portrait/uniform_default.png"]
    },
    "rules": { "beardChance": 30 },
    "rendererConfig": {
      "layerOrder": ["skin","face","eyes","nose","uniform","hair","beard","cap"],
      "masterSize": 256
    }
  }
}
```

---

## 十、程式端 API 索引

| 函式／常數 | 檔案 | 用途 |
|-----------|------|------|
| `PORTRAIT_SPEC` | 00-theme.js | 肖像母版規格常數 |
| `PORTRAIT_DEFAULT_AWAY` | 00-theme.js | 非比賽情境預設球衣（false=主場） |
| `compositePortrait(id, ctx, size)` | 00-theme.js | 肖像渲染入口 |
| `v50NormalizePortraitCtx(id, ctxOrPlayer)` | 00-theme.js | ctx 正規化（新舊式相容） |
| `v49ClearPortraitCache()` | 00-theme.js | 清空肖像快取 |
| `v50IsTeamAwayToday(teamId, results)` | 00-theme.js | 主客場判定 |
| `v50GamePortraitCtx(player, results)` | 00-theme.js | 組出比賽情境 ctx |
| `validateThemePack(pack)` | 00-theme.js | 主題包驗證 |
| `v50IsValidImageUri(s)` | 00-theme.js | 圖片 URI 驗證 |
| `v50IsValidColor(s)` | 00-theme.js | 色彩格式驗證 |
| `v50StripDeprecatedFields(pack)` | 00-theme.js | 剝除停用欄位 |
| `applyThemePack(pack)` | 00-theme.js | 載入主題包（含驗證＋剝除） |
| `resetThemePack()` | 00-theme.js | 重設回內建外觀 |
| `themeManifest()` | 00-theme.js | 輸出製作清單（含 portraitSpec） |
| `V50_TEAM_FIELDS` | 00-theme.js | team 欄位白名單 |
| `V50_TEAM_DEPRECATED` | 00-theme.js | 停用欄位清單 |
| `V50_LAYER_NAMES` | 00-theme.js | 合法圖層名稱 |
| `V50_LAYER_REQUIRED` | 00-theme.js | 必要圖層 |

---

*本規格書為 v50 正式接口定義，與 `v50_codex_handoff.md`（Claude→Codex 交接）及 `v50_claude_handoff.md`（Codex→Claude 交接）並存，三者不互相取代。*
