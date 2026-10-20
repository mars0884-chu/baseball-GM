# 《決勝GM》V50 交付稽核報告

> 稽核日期：2026-07-25  
> 稽核檔：`V50_delivery.zip`  
> 對照檔：`v491_art_checkpoint_delivery_v01.zip`  
> 結論：**程式核心修正大致完成，但尚未完全符合需求與既定交付規則，不建議直接視為最終合格版。**

## 一、驗證結論

### 已符合

1. V50 外層 ZIP 可正常解壓，共 6 個檔案。
2. `50_baseball_gm_modular.zip` 恰好包含 20 個基準模組檔，檔名與 v491 基準一致。
3. `v50_art_assets.zip` 可正常解壓，共 138 個檔案；SHA-256 與 v491 美術素材 ZIP 完全相同，證明素材是原封轉入，沒有遺失或被改寫。
4. 五項美術接口決策的主要程式結構已加入：
   - `capMark` 定義為完整帽子圖層。
   - `PORTRAIT_SPEC` 定義 256×256、64/128 輸出與三個錨點。
   - 預設 z-order 為 `skin → face → eyes → nose → uniform → hair → beard → cap`。
   - `homeUniform`／`awayUniform` 欄位與回退程式存在。
   - `validateThemePack()` 已存在並在載入主題包時呼叫。
5. 20 隊 `TEAM_DEFS` 已加入 `shortName`、`brandKey`、`league`、`division`、`primaryColor`、`secondaryColor`。
6. `ensureV50()`、新開局品牌欄位與 v50 主題持久化鍵已存在。
7. 實際重跑測試結果：
   - 回歸測試：1096 通過／0 失敗。
   - 一般模式 15 年 smoke：通過。
   - 純 GM 模式 15 年 smoke：通過。
8. `SHA256SUMS.txt` 中已列出的四個檔案，雜湊均與實際檔案相符。

### 未完全符合

#### P1：主客場球衣切換尚未真正接到畫面呼叫端

- `compositePortrait()` 以 `optPlayer._portraitAway` 判斷客場球衣。
- 全部模組中只有 `compositePortrait()` 自己讀取 `_portraitAway`，沒有任何 UI、比賽或球員卡呼叫端設定該值。
- 因此目前一般畫面會持續採用主場球衣；交接文件所稱「遊戲依主客場切換」並未端到端完成。
- 肖像快取鍵只有 `playerId@size`，沒有包含球隊或主客場狀態。即使未來接上切換，同一輪渲染中的狀態切換仍可能取到舊快取。

建議修正：

1. 將肖像渲染參數改成明確 context，例如 `{ player, isAway, teamId }`，不要在球員物件塞臨時 `_portraitAway`。
2. 比賽、球員卡與相關 UI 呼叫端依實際主客場傳入 `isAway`。
3. 快取鍵至少加入 `teamId` 與 `home/away`。
4. 新增端到端測試，分別斷言主場與客場輸出使用正確球衣。

#### P1：`validateThemePack()` 沒有完整做到文件聲稱的 Schema／URI 驗證

- 現況只在已知四個圖片欄位有值且不是字串時警告。
- 任意字串（例如 `not-a-uri`）仍會通過，沒有驗證 data URI、相對路徑或允許的 URL 格式。
- 沒有攔出未知的 team 圖層欄位。
- `rendererConfig.layerOrder` 只檢查是不是陣列，沒有檢查陣列內是否為允許的圖層名稱、是否重複或缺少必要層。
- 現有 v50 新測試只驗證函式存在、未知 teamId、錯誤色彩與少量品牌欄位，沒有覆蓋上述情境。

建議修正：

1. 定義可接受的圖片來源格式與允許欄位白名單。
2. 驗證 `layerOrder` 每一項、重複項與必要項。
3. 補上有效／無效 URI、未知圖層、錯誤 layerOrder 的測試。

#### P1：對話脈絡還原摘要不符合既定交付規則

`v50_project_summary.md` 雖然存在，但相較 v491 脈絡摘要缺少或未清楚提供：

- 沒有把可直接複製的還原本文包在單一 Markdown fenced code block。
- 沒有提醒開新對話時附上最新版程式與交付檔。
- 沒有區分 Claude 原始提供內容、Codex 新增／修改／確認／推論。
- 缺少完整的遊戲架構、既有功能進度、角色與責任、固定設計決策、完整待辦與 backlog、測試風險、版本差異與檔案 manifest。
- 內容由 v491 約 21 KB 縮成約 5 KB，不足以取代原本的全貌恢復文件。

建議：以 v491 全貌摘要為底稿，保留既有完整內容，再新增 v50 差異；不可用目前精簡版取代。

#### P1：缺少「交給 Claude」的正式 handoff

- 既定未來交付標準要求有一份 addressed to Claude 的交接摘要。
- V50 只有 `v50_codex_handoff.md`，內容方向是 Claude 回覆 Codex，並非把本輪結果、Codex 待續工作與風險交回 Claude 的文件。
- 建議補 `v50_claude_handoff.md`，或在規則明確允許雙向 handoff 後，同時保留 `v50_codex_handoff.md` 與 `v50_claude_handoff.md`。

#### P2：校驗清單漏列美術素材 ZIP

- `SHA256SUMS.txt` 只列 HTML、模組 ZIP、project summary、codex handoff。
- 漏列 42 MB 的 `v50_art_assets.zip`。
- 實際素材雜湊為：
  `66bd6577c15cc621d870786abfa88181bad4f7b80f462cb27b2538776b62bcaf`

建議：補入校驗清單後重打外層 ZIP。

#### P2：文件與程式註解對 `cityUniform` 的描述不精確

- 程式沒有 city 模式或 `cityUniform` 選擇分支。
- 現況只有客場時 `awayUniform || homeUniform`；`cityUniform` 欄位本身沒有被讀取。
- 若正式決策是取消第三套城市版，建議從正式 schema 移除 `cityUniform`，不要再描述為「null 時回退」；若仍保留 city 情境，則需實作明確的 city 分支。

## 二、檔案完整性

### V50 外層現有 6 檔

1. `50_baseball_gm.html`
2. `50_baseball_gm_modular.zip`
3. `v50_project_summary.md`
4. `v50_codex_handoff.md`
5. `v50_art_assets.zip`
6. `SHA256SUMS.txt`

### 欠缺或需補正

1. **欠缺：** `v50_claude_handoff.md`（依既定交付標準）。
2. **內容不足：** `v50_project_summary.md` 需恢復完整脈絡還原格式。
3. **清單漏項：** `SHA256SUMS.txt` 需加入 `v50_art_assets.zip`。
4. **建議新增：** 明確的 v50 美術接口／schema 規格文件，避免把規格只散落在程式註解與 handoff。

## 三、最終判定

V50 可以判定為「主要接口決策已寫入、核心回歸未破壞」的可測試候選版，但不能判定為完全驗收通過。至少應先修正：

1. 主客場球衣端到端接線與快取。
2. Theme pack 真正的 URI／schema 驗證與測試。
3. 完整脈絡還原摘要。
4. Claude handoff。
5. 美術素材 SHA-256 清單漏項。

