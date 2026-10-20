# v50 Codex 交接摘要

> 日期：2026-07-25
> 回應：v491 美術檢查點 v01 五項待確認事項——全部已定案並寫入程式碼。

## 一、五項接口問題——Claude 正式回覆

### §1 capMark 定義 → 方案 A（完整帽子圖層）

- `capMark` = 完整帽子透明圖層 256×256（含帽身＋帽簷＋帽徽一體）。
- 不拆分 `capBase` + `capInsignia`。
- 程式碼已在 `PORTRAIT_SPEC.capMarkNote` 寫明。
- `capMarkReference` 是交接輔助欄位，**不要**直接填入 `capMark`——需另外製作正式完整帽子圖層。

### §2 肖像母版——已固定

```
PORTRAIT_SPEC = {
  masterSize: 256,                   // 256×256 母版畫布
  outputSizes: [64, 128],            // 64px 名單卡片、128px 詳情
  anchors: {
    headTop:    { x: 0.50, y: 0.10 },   // 帽頂對齊線（y=26px）
    faceCenter: { x: 0.50, y: 0.38 },   // 五官中心（x=128px, y=97px）
    neckline:   { x: 0.50, y: 0.72 }    // 領口上緣（y=184px）
  }
}
```

- 64px 縮圖安全區：headTop ~ neckline 之間的區域等比縮放居中裁切。
- 帽沿基準線 ≈ headTop 錨點附近（帽簷到帽頂之間由 capMark 圖層自行定義）。
- 領口中心 x=50%、領口寬度由 uniform 圖層自行定義。

### §3 疊放順序——已修正並固定

```
z-order: skin → face → eyes → nose → uniform → hair → beard → cap
```

- 球衣（uniform）在毛髮/鬍型/帽子**之前**疊放。
- 帽子（cap / capMark）最後蓋上。
- 程式碼 `compositePortrait()` 已按此順序渲染。
- 若主題包提供 `rendererConfig.layerOrder` 陣列，可自訂覆蓋。

### §4 兩套球衣與回退——已固定

- `homeUniform`：白色系主場球衣圖層。
- `awayUniform`：球隊主色系客場球衣圖層。
- `cityUniform`：**已停用**。不在正式欄位白名單 `V50_TEAM_FIELDS` 內；舊主題包若帶此欄位，載入時由 `v50StripDeprecatedFields()` 剝除並產生「已停用」警告。遊戲程式碼不會讀取。
- 灰色球衣與第三套城市版**已取消**。
- 遊戲依主客場切換讀取 `homeUniform` / `awayUniform`，由明確的肖像 context 控制：
  ```
  compositePortrait(playerId, { player, teamId, isAway }, size)
  ```
- **回退規則**：客場 `awayUniform` 缺失時回退 `homeUniform`（讓 Codex 可先做主場再補客場，不會破圖）。
- **非比賽情境**（名單／詳情／談判／選秀／交易／殿堂）一律用主場球衣（`PORTRAIT_DEFAULT_AWAY = false`）。
- **比賽情境**由呼叫端明確傳入 `isAway`；目前唯一出口為「最近一戰」卡片。
- **快取鍵**：`playerId|teamId|size|H或A`，轉隊或主客切換不會命中舊快取。

### §5 Schema 與錯誤回報——已實作（完整版）

`validateThemePack(pack)` 函式載入時自動執行，回傳 `{ valid, warnings[] }`。

**team 欄位白名單**（`V50_TEAM_FIELDS`）：`logo` / `capMark` / `homeUniform` / `awayUniform` / `primaryColor` / `secondaryColor` / `capMarkReference` / `shortName` / `brandKey`。白名單以外一律警告。

**停用欄位**（`V50_TEAM_DEPRECATED`）：`cityUniform`。

**圖片 URI 規則**（`v50IsValidImageUri`）：允許 data URI、http(s)、相對路徑；副檔名限 png/jpg/jpeg/webp/svg；相對路徑不得含 `..`。

**色彩規則**（`v50IsValidColor`）：`#RGB` / `#RRGGBB` / `#RRGGBBAA`。

**layerOrder 四項檢查**：必須是陣列、每項必須是合法圖層名（skin/face/eyes/nose/uniform/hair/beard/cap）、不得重複、必要圖層（skin/face/uniform/cap）不得缺少。

**完整警告類型**：未知 teamId、未知圖層／欄位、已停用欄位、圖片 URI 格式不合法、色彩格式不合法、layerOrder 應為陣列／未知圖層名稱／重複圖層／缺少必要圖層、layers 未知圖層名／URI 不合法、未知的 slot 鍵、playerPhotos URI 不合法。

**valid 與 warnings 語意**：

- `valid: false` → 主題包結構根本不可用（非物件、null、陣列、驗證拋例外）
- `valid: true` → 結構可用；個別欄位問題一律以 `warnings` 呈現
- `warnings[]` → 每則為可讀中文字串；空陣列代表無已知問題

**既定策略維持不變**：警告但不阻擋載入，讓 Codex 可漸進補齊素材。

## 二、已可直接使用的映射

```javascript
// 以下欄位可立即填入
teams.T0 ~ teams.T19: {
  logo: "...",           // ✅ 20隊已有四尺寸隊徽
  primaryColor: "#...",  // ✅ v50 已固定在 TEAM_DEFS + S.teams
  secondaryColor: "#..." // ✅ v50 已固定在 TEAM_DEFS + S.teams
}

// 以下欄位等正式圖層完成後填入
teams.T0 ~ teams.T19: {
  capMark: null,         // 等正式完整帽子圖層（256×256 完整帽子）
  homeUniform: null,     // 等正式白色系主場球衣圖層
  awayUniform: null      // 等正式主色系客場球衣圖層
  // cityUniform 已停用——不要填入，填了會被剝除並產生警告
}
```

## 三、v50 品牌資料擴充

每隊 `TEAM_DEFS` 新增欄位，Codex 可用 `brandKey` 作為美術資產目錄名：

| 欄位 | 用途 | 範例（T0） |
|------|------|-----------|
| `shortName` | 隊伍簡稱 | "靖安" |
| `brandKey` | 美術資產目錄鍵名 | "jingan_guardians" |
| `league` | 所屬聯盟 | "A" |
| `division` | 所屬分區 | "A1" |
| `primaryColor` | 主色 hex | "#1B3A6B" |
| `secondaryColor` | 輔色 hex | "#C0C0C0" |

## 四、v50 持久化

- 主題包持久化鍵已升級：localStorage `v50_theme_pack` / `v50_theme_meta`。
- 大型主題包超出 localStorage 5MB 限制時，自動回退到 IndexedDB `v50_theme_db`（獨立於遊戲存檔 DB）。
- 舊版 `v49_theme_pack` / `v49_theme_meta` 鍵自動清除。

## 五、Codex 下一步

1. 將已完成的 20 隊隊徽映射到主題包 `teams.T0.logo` ～ `teams.T19.logo`。
2. 依 `PORTRAIT_SPEC` 建立正式肖像母版（256×256）與定位測試圖。
3. 先完成 T0～T4 的完整帽子、主場與客場圖層。
4. 用至少兩種臉型、髮型與膚色測試 z-order 與遮擋。
5. 樣板通過後批次完成 T5～T19。
6. 交付依 v50 規格打包。

## 六、本次外層交付

- `50_baseball_gm.html`（整合單檔）
- `50_baseball_gm_modular.zip`（20檔模組版）
- `v50_project_summary.md`（脈絡還原摘要）
- `v50_codex_handoff.md`（本文件）
- `v50_art_assets.zip`（Codex 已產出美術素材原封轉入）

*本交接摘要生成於 v50（2026-07-25）。*
