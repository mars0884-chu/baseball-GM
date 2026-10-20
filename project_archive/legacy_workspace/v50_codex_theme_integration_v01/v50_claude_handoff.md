# v50 交回 Claude 的交接摘要

> 日期：2026-07-25
> 來源版本：v50（初版交付）→ 目標版本：v50（一次性修正後重新交付）
> 本文件用途：讓下一個 Claude 工作階段能直接接手，不需重新推導。
> 與 `v50_codex_handoff.md`（Claude→Codex 接口說明）並存，兩者不互相取代。

---

## 一、本輪目標與完成結果

### 目標

依 `V50_CLAUDE_ONE_SHOT_CORRECTION_REQUEST.md` 一次性修完 v50 初版交付的三類缺口，並依 `FUTURE_DELIVERY_STANDARD.md` 重新完整封裝。

### 完成結果

| 項目 | 狀態 |
|------|------|
| ①主客場球衣端到端接通 | ✅ 完成 |
| ②Theme pack 驗證完整化 | ✅ 完成 |
| ③cityUniform 規格一致化 | ✅ 完成 |
| ④測試併入正式 test_regression.js | ✅ 完成（+54 項） |
| ⑤四項正式測試全過 | ✅ 完成（0 失敗） |
| ⑥project_summary 完整版 | ✅ 完成 |
| ⑦雙向 handoff | ✅ 完成 |
| ⑧art_interface_spec | ✅ 完成 |
| ⑨完整封裝 9 檔 | ✅ 完成 |

---

## 二、修改檔案及修改點

### 00-theme.js（主要修改檔）

| 修改點 | 說明 |
|--------|------|
| `PORTRAIT_DEFAULT_AWAY` | 新增常數 = `false`，定義非比賽情境固定用主場球衣 |
| `v50NormalizePortraitCtx()` | 新增。把舊式第二參數（球員物件）或新式 ctx 統一轉為 `{player, teamId, isAway}` |
| `compositePortrait()` | 重寫。改吃明確 ctx；快取鍵從 `playerId@size` 改為 `playerId\|teamId\|size\|H或A` |
| `themePlayerPhoto()` | 第二參數改名 `ctxOrPlayer`，透傳給 `compositePortrait` |
| `v50IsTeamAwayToday()` | 新增。從 `S.resultsLog` 最末筆判斷該隊是否客隊 |
| `v50GamePortraitCtx()` | 新增。組出比賽情境 ctx |
| `V50_TEAM_FIELDS` | 新增。team 欄位白名單（9 個正式欄位，型別分 image/color/text） |
| `V50_TEAM_DEPRECATED` | 新增。停用欄位清單（目前只有 `cityUniform`） |
| `V50_LAYER_NAMES` | 新增。8 個合法圖層名稱 |
| `V50_LAYER_REQUIRED` | 新增。4 個必要圖層（skin/face/uniform/cap） |
| `v50IsValidImageUri()` | 新增。驗證 data URI / http(s) / 相對路徑，副檔名限 png/jpg/jpeg/webp/svg |
| `v50IsValidColor()` | 新增。驗證 #RGB / #RRGGBB / #RRGGBBAA |
| `validateThemePack()` | 重寫。從 5 條檢查擴充到 13 類警告 |
| `v50StripDeprecatedFields()` | 新增。剝除 `cityUniform`，回傳新物件不改原物件 |
| `applyThemePack()` | 加入剝除步驟（驗證 → 剝除 → 套用） |
| `PORTRAIT_SPEC.uniformNote` | 改寫，明示 cityUniform 已停用 |
| 全域匯出 | 新增 11 個 v50 函式／常數 |

### 06-ui-roster.js

| 修改點 | 說明 |
|--------|------|
| `renderLastGameCard()` | 加入比賽情境肖像，明確傳 `isAway: !isHome`。這是全專案唯一的比賽情境肖像出口 |

### style.css

| 修改點 | 說明 |
|--------|------|
| `.lg-portrait` | 新增比賽肖像容器樣式 |

### theme_pack_example.json

| 修改點 | 說明 |
|--------|------|
| 移除 `cityUniform` | 範例不再宣稱使用第三套球衣 |
| `rendererConfig.note` | 補上 cityUniform 停用說明 |

### test_regression.js

| 修改點 | 說明 |
|--------|------|
| v50 修正批次區塊 | 新增 54 項斷言（A 肖像 context 15 項／B 驗證 25 項／C cityUniform 14 項） |

---

## 三、接口、資料結構、穩定 ID 與資產映射

### 肖像 context 資料結構

```
ctx = {
  player:  object   // 球員物件；省略時由 S.players[playerId] 取得
  teamId:  string   // 要套哪一隊的帽子/球衣；省略時取 player.team
  isAway:  boolean  // true=客場、false/省略=主場
}
```

### 快取鍵格式

```
playerId | teamId | size | H或A
```

範例：`B_0042|T7|64|A`

### 穩定 ID

- 球隊：`teamId`（T0～T19），定義在 `TEAM_DEFS`
- 國家：`countryId`（NAT_US / NAT_TW / NAT_HOME / NAT_F01～NAT_F19），定義在 `NATIONS`
- 球員外觀：`appearanceSeed`（整數，確定性雜湊產生，轉隊不變）
- 美術資產目錄：`brandKey`（如 `jingan_guardians`）

### 資產映射原則

一律以穩定 ID 為鍵，**不得**用顯示名稱（隊名可能因品牌調整而變動）。

---

## 四、與 Claude 原始內容的差異

本輪修正**沒有引入任何 Codex 產出的程式碼**。所有程式改動均為 Claude 實作。

| 來源 | 內容 |
|------|------|
| **Claude 原始提供** | 全部程式碼（00～06 模組、style.css、測試腳本）、全部文件、TEAM_DEFS 20 隊品牌色票、PORTRAIT_SPEC、z-order 決策、驗證規則、快取設計 |
| **Codex 產出** | `v50_art_assets.zip` 內的美術素材（20 隊隊徽 4 尺寸、20 帽徽參考、品牌概念板）、`v491_art_checkpoint` 提出的 5 項接口問題 |
| **Codex 推論／確認** | 無程式碼層面的推論；Codex 僅提問，未修改任何程式檔（v491 art checkpoint 的 HTML 與模組 ZIP 與 v491_delivery MD5 完全一致，已驗證） |

---

## 五、不得修改的邊界

以下是硬性約束，後續任何版本都不得違反：

1. **共用 RNG 序列**：美術／UI 改動不得改變 `Math.random()` 的呼叫次數或次序。任何敘事型隨機一律走隔離 PRNG（`v42rng` / `v42Int`）或確定性雜湊（`v46Fog` / `v49SeedHash`）。
2. **存檔相容性**：新欄位一律透過 `ensureVXX()` 升級鏈惰性補值，不做破壞性遷移。
3. **升級鏈順序**：`ensureV25 → … → ensureV49 → ensureV491 → ensureV50`，新版接在尾端。
4. **模組邊界**：00-theme.js 只放主題／美術接口，不得放遊戲規則。
5. **20 檔模組版**：模組 ZIP 必須恰為 20 檔。
6. **整合單檔離線自足**：不得引入外部 CDN 或字型連結。
7. **未導入主題包時位元等價**：所有美術接口在未導入資產包時必須回退到原本的 emoji／CSS 外觀，畫面輸出不變。
8. **警告不阻擋載入**：`validateThemePack` 的個別欄位問題一律只產生警告，不得改成阻擋。

---

## 六、測試方式與實際結果

### 執行方式

```
cd <模組解壓目錄>
node test_regression.js      # 完整回歸
node smoke_multiyear.js      # 一般模式 15 年
node smoke_puregm.js         # 純 GM 模式 15 年
```

整合單檔自驗需另外抽出主 `<script>` 區塊在 vm 沙盒執行（腳本不在交付包內，屬 Claude 工作階段內部驗證工具）。

### 實際結果

| 測試 | 結果 |
|------|------|
| 完整回歸 | **1150 通過 / 0 失敗** |
| 一般模式 15 年 smoke | **全部通過** |
| 純 GM 模式 15 年 smoke | **全部通過** |
| 整合單檔自驗 | **33 通過 / 0 失敗** |

回歸從 v50 初版的 1096 增加到 1150（+54 項）。

---

## 七、已知問題、風險、待 Claude 執行事項

### 已知簡化（誠實記錄）

| 編號 | 說明 |
|------|------|
| V50-1 | 比賽情境肖像目前只有「最近一戰」卡片一個出口。若未來新增逐場比賽畫面，需比照傳入 `isAway` |
| V50-2 | `v50IsTeamAwayToday()` 讀 `S.resultsLog` 最末筆；若同日多場（國際賽）判定以第一筆命中為準 |
| V50-3 | 圖片 URI 驗證為格式檢查，不做實際載入測試（無法在 Node 環境驗證檔案存在） |
| V50-4 | `validateThemePack` 不檢查圖片實際尺寸是否符合 256×256（需瀏覽器環境） |
| V50-5 | 主題包持久化的 IndexedDB 後備為非同步，開機時若 localStorage 不可用會有一次渲染延遲 |

### 風險

| 風險 | 說明 | 緩解 |
|------|------|------|
| R1 | 純 GM 模式教練 AI 手感未經真機驗證（自 v41 起持續） | 待 Mars 實機遊玩回饋 |
| R2 | 大量 v33～v46 參數採建議值未經真機調校 | 已列入未完成清單，待批次調整 |
| R3 | Codex 產出的正式圖層若不符 PORTRAIT_SPEC 錨點，會出現對位偏移 | 建議 Codex 先做 T0～T4 樣板驗證再批次 |

### 待 Claude 執行事項

1. 依 `v50_full_pending_items.md` 與 Mars 討論優先序，排定 v51 範圍
2. 收官三大項（L3 進階數據引擎／農場多層級／文化傳承）尚未動工
3. 待 Codex 交回正式圖層後，做一次導入實測（目前所有美術接口都只有邏輯測試，無實際圖片測試）

---

## 八、交付檔案清單及用途

| 檔案 | 用途 |
|------|------|
| `50_baseball_gm.html` | 整合單檔，離線可執行，手機用 Edge 開啟 |
| `50_baseball_gm_modular.zip` | 20 檔模組版，開發與測試用 |
| `v50_project_summary.md` | 脈絡還原摘要，開新對話直接複製貼上 |
| `v50_claude_handoff.md` | 本文件，交回 Claude 的技術交接 |
| `v50_codex_handoff.md` | 交給 Codex 的接口說明 |
| `v50_art_interface_spec.md` | 正式美術接口規格，Codex 製作依據 |
| `v50_art_assets.zip` | Codex 已產出美術素材（原封保留） |
| `v50_full_pending_items.md` | 全部未完成項目（約 68 項） |
| `SHA256SUMS.txt` | 外層檔案完整性校驗 |

---

*本交接摘要由 Claude 產出於 v50 一次性修正交付（2026-07-25）。*
