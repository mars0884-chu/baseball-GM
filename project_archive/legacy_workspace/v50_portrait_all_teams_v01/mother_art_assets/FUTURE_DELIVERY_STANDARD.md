# 《決勝GM》未來版本交付規格

> 生效日：2026-07-25  
> 基準包：`v491_delivery.zip`  
> 適用範圍：Codex、Claude 或其他 AI 後續輸出的每一個可交付遊戲版本。

## 一、最高規則

未來每次版本交付，內容規格一律以 `v491_delivery.zip` 為最低基準。不得只交付單一 HTML、零散程式檔或只有口頭摘要。

每個版本的外層交付 ZIP 至少必須包含以下四項：

1. **整合單檔版**：`<version>_baseball_gm.html`
2. **20 檔模組版**：`<version>_baseball_gm_modular.zip`
3. **脈絡還原／Claude 原內容摘要**：`<version>_project_summary.md`
4. **交給 Claude 的交接摘要**：`<version>_claude_handoff.md`

若某次工作由 Claude 先提供原始交接內容，`<version>_project_summary.md` 必須保留「Claude 原本內容摘要」專節，清楚區分：

- Claude 原本提供的事實、設計與程式狀態
- 本輪 Codex 新增、修改、確認或推論的內容

不得把兩者混寫成無法追溯來源的單一敘述。

## 二、整合單檔版

- 必須可獨立開啟與執行。
- 必須與模組版使用相同版本邏輯。
- 必須保留離線、PWA、錯誤回退及既有存檔相容性要求。
- 美術修改不得改變規則、數值、機率、模擬、共用 RNG、存檔語意或核心功能流程。

## 三、20 檔模組版

模組 ZIP 必須維持 **20 個檔案**。以 v491 為基準，檔案角色如下：

1. `00-theme.js`
2. `01-data-engine.js`
3. `02-finance.js`
4. `03-simulation.js`
5. `04-state-core.js`
6. `05-ui-dashboard.js`
7. `06-ui-roster.js`
8. `baseball_gm_century_empire_design_v1_2.md`
9. `design_doc.md`
10. `icon-180.png`
11. `icon-192.png`
12. `icon-512.png`
13. `index.html`
14. `manifest.webmanifest`
15. `smoke_multiyear.js`
16. `smoke_puregm.js`
17. `style.css`
18. `sw.js`
19. `test_regression.js`
20. `theme_pack_example.json`

若未來架構確有必要變更檔名或檔案角色，交付仍須維持「20 檔模組版」要求；任何替換都必須在兩份摘要中列出新舊對照與原因。

## 四、脈絡還原摘要

`<version>_project_summary.md` 是開新對話時直接複製貼上、恢復 AI 脈絡的主要文件，並須提醒使用者同時附上最新版本檔案。

摘要至少必須包含：

1. 目前專案名稱與版本
2. 遊戲定位與遊戲架構
3. 遊戲開發的核心進度
4. 目前擁有的技術細節與功能
5. 已解決的問題
6. 程式開發需求、限制與驗收條件
7. 使用者、Codex、Claude 各自的工作內容與責任邊界
8. 代辦事項與未完成內容
9. 不可遺失的記憶錨點與已定案事項
10. 完整檔案說明清單
11. Claude 原本內容摘要
12. 本版本相對上一版的變更
13. 測試結果與已知風險
14. 開新對話時的使用方式

為方便直接複製，**可貼入新對話的完整摘要正文必須包在單一 Markdown fenced code block 中**。若摘要內需要展示程式碼，內層改用縮排或不同長度的 fence，避免破壞最外層區塊。

## 五、Claude 交接摘要

`<version>_claude_handoff.md` 必須以 Claude 能直接接手為目標，至少包含：

- 本輪目標與完成結果
- 來源版本與目標版本
- 修改檔案及修改點
- 接口、資料結構、穩定 ID 與資產映射
- 與 Claude 原始內容的差異
- 不得修改的邊界
- 測試方式與實際結果
- 已知問題、風險、待 Claude 執行事項
- 交付檔案清單及用途

## 六、交付前驗收

- 外層 ZIP 四項核心內容齊全。
- 模組 ZIP 解壓後恰為 20 檔。
- 整合單檔與模組版版本號、核心資料與功能一致。
- 回歸測試、兩種 15 年 smoke 測試及整合單檔自驗均通過；若有失敗必須明列，不得寫成全數通過。
- 隊伍、國家、球員等美術映射使用穩定 ID，不以可能變動的顯示名稱作鍵。
- 脈絡摘要已用單一 Markdown 區塊包裝，且包含本文件第四節全部欄位。
- Claude 交接摘要與 Claude 原內容摘要均存在，且來源清楚可追溯。
- 交付檔名使用 ASCII。
- 提供版本、日期及必要的 SHA-256 清單。

## 七、v491 基準確認

`v491_delivery.zip` 已具備：

- 整合單檔 `491_baseball_gm.html`
- 20 檔模組包 `491_baseball_gm_modular.zip`
- 脈絡摘要 `v491_project_summary.md`
- 美編／接口交接摘要 `v491_codex_handoff.md`

本規格自 v491 基準向後沿用，並新增明確要求：未來脈絡摘要的可貼用正文必須以單一 Markdown fenced code block 包裝，且必須清楚保留 Claude 原本內容摘要與交給 Claude 的交接摘要。

## 八、Codex 回交 Claude 的完整母包規則

- Claude 提供的完整版本 ZIP 是 Codex 本輪的不可刪減母包。
- Codex 回交時必須保留母包全部外層檔案；不得只交差異檔、修改檔或精簡版。
- 母包內的 20 檔模組 ZIP 必須完整保留且仍恰為 20 檔。
- 母包內的美術素材 ZIP 必須保留原有全部檔案，再加入 Codex 本輪新增內容；不得刪除舊素材、規格、驗證報告、記憶文件或重建工具。
- Codex 可額外加入本輪完整摘要、Claude handoff、Claude 修改請求及下一階段套入文件；所有新增檔名必須為 ASCII。
- 若母包原檔因錯誤必須改名或替換，必須提供一對一新舊映射與原因，且不得造成內容遺失。
- 回交前必須產生母包與回交包 manifest 對照，原母包遺失檔案數必須為 0。
- 最終交付必須是一個已實際建立、可下載、可獨立解壓與驗證的完整 ZIP，不能只提供說明文字。
