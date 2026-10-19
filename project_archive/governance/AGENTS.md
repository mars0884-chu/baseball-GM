# 《決勝GM》Codex 單一開發者專案規則

> 狀態：正式生效  
> 最終核准者：Mars  
> 正式核准日：2026-08-09  
> 適用範圍：Codex 接手後的程式、美術、測試、文件、封裝、版本維護與多 Agent 協作  
> 過渡基準：現有 `v55-r009-codex` 保留原貌；新的 Codex-only 外層角色自 `v55-r010-codex` 起適用

Claude 歷史文件與舊正式 ZIP 保留作為來源、決策與回滾證據，但 Claude 自本規則生效後退出日常開發流程。Codex 正式接手程式、美術整合、測試、文件、封裝與版本維護；Mars 保有產品與重大設計的最終決策權。

## 一、權威來源與規則優先順序

不同領域使用不同的權威鏈，不以單一排行榜混淆產品決策與檔案真偽。

### 1.1 產品與設計決策

1. Mars 本輪最新明確決定
2. 最新有效 `AGENTS.md`
3. Mars 明確指定的最新版《職棒GM：百年帝國》北極星設計書
4. 本版 `v<n>_project_summary.md`
5. 本版 `v<n>_full_pending_items.md`
6. 最新 Codex Development Log
7. 歷史 Claude／Codex handoff、舊版文件與舊版 manifest

Mars 的新決定可以推翻過去 Mars 的舊決定；Codex 必須在 Project Summary、Pending 或 Development Log 中記錄變更內容、日期與受影響項目。

### 1.2 工作進度與完成狀態

1. 本版 Project Summary
2. 本版 Pending Items
3. 本版 Codex Development Log
4. 本版 Verification Report
5. 歷史 handoff 與舊版文件

文件內容若互相衝突，不得自行挑選方便的說法；先依實際程式與測試證據確認，再修正有誤的本輪文件。

### 1.3 套件身分、來源與完整性

1. Mars 本輪明確指定的原始完整 ZIP
2. ZIP 內 delivery manifest
3. `SHA256SUMS.txt` 與實際重新計算的 SHA-256
4. `gameVersion`、`packageRevision`、`packageId`、`basedOnPackageId`、`supersedesPackageId`
5. Prose 文件中的版本敘述

Project Summary 或 Pending 的筆誤不得推翻原始 ZIP、manifest 與 SHA 證據。檔名、檔案時間、本機解壓目錄與工作區同名檔案都不能單獨證明新舊。

## 二、禁止臆測與母包驗證

- 每次正式工作只能以 Mars 本輪指定或上傳的原始完整 ZIP 為母包；不得用工作區同名檔案、較新時間戳、舊解壓資料或歷史 handoff 自行替代。
- 必須共同核對 `gameVersion`、`packageRevision`、`packageId`、`basedOnPackageId`、manifest 與 SHA-256。
- 若 lineage 不一致，立即停止正式修改，並向 Mars 列出：收到的 package ID、預期 package ID、衝突位置、可確認事實與無法確認事項。
- `CURRENT_PACKAGE.json` 只能輔助定位，不能取代 Mars 指定 ZIP 與 ZIP 內證據。
- 找不到足夠證據時不得補寫未確認結論；應將推論明確標示為 `UNVERIFIED` 或要求 Mars 決定。

## 三、Codex 正式接管範圍

Codex 自本規則生效後正式負責下列工作。

### 3.1 程式與系統

- 遊戲核心、資料模型、球員、球隊、比賽模擬、AI、教練、交易、財務、球探、育成、國際賽與長期世界
- Save／Load、IndexedDB、Migration、JSON import／export、PWA、效能、重構與 Bug 修復
- UI、CSS、RWD、畫面 routing、render 與錯誤處理

### 3.2 測試與驗證

- Regression、一般多年度 smoke、Pure GM 多年度 smoke
- Save migration、New Save、Load、JSON import／export、UI render、桌面與手機版面
- Lineage、外層角色、模組、美術、SHA、ZIP 與乾淨解壓驗證

### 3.3 美術與整合

- 美術素材製作與驗證、圖示、肖像、UI 美術、背景、Theme、正式素材整合、尺寸轉換與像素驗證
- Art manifest、Art validation 與美術接口規格

### 3.4 文件與版本

- Project Summary、Pending Items、Art Interface、Codex Development Log、Verification Report
- Delivery manifest、SHA、完整 ZIP 封裝、package lineage 與版本維護

所有新增或修改的 UI 文字、程式碼註解與正式專案文件使用繁體中文；既有英文程式識別字、檔名、API 與 schema 不強制翻譯。

## 四、Mars 的角色

Mars 是 Product Owner、Game Director 與 Final Decision Maker。

Mars 不需要寫程式、修改 JSON、合併 ZIP、執行 SHA、修 manifest 或整理 module package。Mars 主要負責：

- 決定遊戲方向與重大玩法
- 決定合理但不同的方案取捨
- 核准主觀美術與主視覺方向
- 真機測試並回報遊玩問題
- 決定版本是否正式接受
- 決定上一版是否已存檔且可以淘汰

## 五、Lead Agent 與 Worker Agent

本專案可以採 Lead Agent＋Worker Agent，但多 Agent 是可選工具，不是每項工作都必須使用。核心、高風險或無法安全切割的任務由 Lead 單獨連續完成。

### 5.1 Lead Agent

Lead 使用當時可用、最適合高可靠度工程工作的模型，負責：

- 架構、任務拆解、根因分析、跨模組修改
- 核心程式、模擬、AI、Save、Migration 與高風險重構
- Worker 任務界定、差異驗收與 Code Review
- Regression、Smoke、正式整合、文件定案與最終封裝

Lead 是正式版本唯一技術責任者。

### 5.2 Worker Agent

Worker 適合明確、封閉且可獨立驗收的任務，例如：

- CSS、RWD、一般 UI、Modal、Tooltip、Card、Table
- Icon integration、UI 文案一致化、低風險 Bug
- 重複程式整理、測試案例補充與文件整理

Worker 必須遵守：

- 只能修改 Lead 明確指定的檔案與範圍；不得自行擴張任務。
- 發現架構、核心資料或跨模組問題時，停止該擴張部分並回報 Lead。
- 不得更新 Project Summary、正式 Pending 狀態、manifest、SHA、`CURRENT_PACKAGE.json` 或正式 ZIP。
- 不得自行改 package lineage、Migration chain、deterministic seed 或正式測試基準。
- 不得與其他 Agent 同時修改同一檔案；Lead 必須避免重疊寫入。
- Worker 的完成訊息不是正式驗證；Lead 必須檢查實際差異並親自執行最終測試。

## 六、一個主題模組＋六個遊戲模組

目前載入順序不得任意改變：

1. `00-theme.js`
2. `01-data-engine.js`
3. `02-finance.js`
4. `03-simulation.js`
5. `04-state-core.js`
6. `05-ui-dashboard.js`
7. `06-ui-roster.js`

這是 1 個主題／美術模組加 6 個遊戲模組，合計 7 個 JavaScript 載入檔。

### 6.1 `00-theme.js`：LOW～MEDIUM

負責 Theme、Icon、Portrait 與美術渲染。Worker 可修改明確視覺層；涉及 asset ID、Theme schema、Portrait pipeline 或 Save data 時由 Lead 主責或 review。

### 6.2 `01-data-engine.js`：HIGH

負責球員、球隊、國家、成長、衰退、潛力、球探、選秀、FA、育成、進階數據與部分 Migration。Lead 主責；Worker 不進行大規模邏輯修改。

### 6.3 `02-finance.js`：HIGH

負責財務、薪資、合約、設施、行銷、冠軍獎勵與均衡稅。經濟平衡、合約或設施演算法由 Lead 主責；單純 UI 顯示可交 Worker。

### 6.4 `03-simulation.js`：CRITICAL

負責逐打席、每日推進、賽程、教練、戰術、疲勞、事件、國際賽與部分 Migration。核心修改由 Lead 主責並完整測試；不得為修正單一比賽結果而寫死結果。

### 6.5 `04-state-core.js`：CRITICAL

負責 `S`、New Game、Save、Load、IndexedDB、GM 生涯、KPI 與部分 Migration。任何 Save／Load 修改都必須考慮 backward compatibility，由 Lead 主責。

### 6.6 `05-ui-dashboard.js`：MEDIUM

負責主 render、screen routing、Dashboard、選隊、季後賽、選秀、頒獎、教學、郵件與事件 UI。Worker 可處理一般 UI；主路由重寫由 Lead 主責或 review。

### 6.7 `06-ui-roster.js`：MEDIUM～CRITICAL

一般球員頁、名單、交易、球探、數據與育成 UI 可交 Worker；Save import、Hydrate、Migration chain、`ensureVNN()` 呼叫與會改變資料內容的入口屬 Lead 範圍。不得把整支檔案視為低風險 UI。

## 七、全域狀態 `S`

- `S` 是遊戲唯一主要狀態樹；不得為方便新增第二套平行 global state。
- 所有會改變遊戲狀態的功能必須確認：寫入位置、預設值、舊 Save 行為、Persist、Migration 與長期模擬影響。
- UI 暫存狀態不得冒充正式遊戲狀態，也不得意外寫入 Save。
- 新欄位必須有明確資料出口；不得只增加無人讀取、無玩家結果的長期資料。

## 八、Save 與 Migration 鐵則

正式目標是所有適用 migration 依序執行到目前遊戲版本，但不得把文件描述、函式存在或單獨函式測試冒充正式 hydrate／import 路徑已完整執行。當 handoff、Project Summary 與實際程式存在差異時，必須先標記 `AUDIT_REQUIRED`，完成呼叫路徑、lazy ensure、舊存檔影響與測試覆蓋稽核前，不得先修改 migration chain 或宣稱已完整接通。

後續新增正式資料欄位，例如 v56，必須建立 `ensureV56()`，並接入經稽核的單一 hydrate／import migration orchestration。所有 `ensureVNN()` 必須：

- Idempotent
- 支援欄位不存在
- 不破壞正常舊值
- 不覆寫玩家既有有效資料
- 可以重複執行
- 不依賴 UI 渲染順序

禁止直接假設所有 Save 都是最新版、刪除舊 key 後不 migration、隨意更名 existing field、改變型別而不 migration，或用 New Game 正常證明舊 Save 正常。

Save schema 語意、無法完全向下相容的方案或資料刪除需要 Mars 決策；已核准功能的 backward-compatible migration implementation 由 Lead 自主完成。

## 九、共享亂數與 deterministic simulation

- `Math.random()` 是共享模擬亂數源；任何 render、純 UI、查看資料或切換畫面的路徑都不得呼叫。
- 玩家開啟不同頁面不得改變未來比賽、選秀、球員生成或事件結果。
- 視覺穩定隨機效果使用既有 deterministic 方法，例如 `v46Fog` 或適當的 deterministic hash。
- 既有 regression deterministic seed 不得任意修改。確需修改時視為測試框架重大變更，必須說明理由、比較新舊結果並由 Lead review；若會改變遊戲基準結果，交由 Mars 決定。

## 十、UI 安全與 Root Cause First

### 10.1 UI 安全

- 主要 render path 與新入口應具備可追蹤的錯誤保護；單一 UI 錯誤不得造成整個遊戲永久白屏。
- Catch 後至少要保護遊戲繼續、輸出可追蹤錯誤並保留 debugging 線索。
- 禁止 `catch(e){}`、吞掉錯誤、回傳假成功或用 try／catch 讓測試錯誤消失。
- 錯誤邊界不能取代根因修正；測試環境應讓非預期錯誤正常失敗。

### 10.2 Root Cause First

Mars 回報 Bug 後依序：重現、追資料流、找根因、評估影響、修正、增加 regression test、執行相關與完整測試。無法重現時不得猜測修改；可以增加診斷證據並標記 `NEEDS_REPRO`。

## 十一、自主權限與 Mars 決策閘門

### 11.1 Codex 可自主完成

- 明確 Bug、Null／Undefined protection
- 低風險 UI 錯位、文字溢位、RWD、觸控尺寸、對比與既有元件微調
- 效能改善、不改行為的小型重構、重複程式整理
- 測試補強、錯字、文件同步、manifest／SHA 正確性
- 已由設計書與 Pending 清楚定義且 acceptance criteria 完整的工作
- 已核准功能所需的 backward-compatible Save implementation

### 11.2 必須由 Mars 決定

- 北極星、GM 核心定位、純 GM 權力邊界或三大支柱改變
- 刪除既有玩家功能
- 無法保持 Save backward compatibility
- 兩種以上合理方案會形成明顯不同玩法
- 經濟平衡、AI 行為或模擬規則的重大改變
- 主導航、核心資訊架構或主要畫面布局方向的大幅改變
- 角色、背景、主視覺與其他主觀美術方向；已有 Mars 核准規範者照規範執行
- deterministic seed 或正式測試框架的重大改變

函式命名、檔案內部小型安排、CSS 像素微調、明確 Bug 與可從權威文件或程式確認的事項不得拿來過度詢問 Mars。

## 十二、Pending Items 狀態與最小規格

每個正式工作使用以下狀態之一：

- `READY`：已定義，可自主開始
- `IN_PROGRESS`：目前施工中
- `REVIEW`：等待 Lead review 或正式技術驗證
- `MARS_REVIEW`：候選或 Technical RC 完成，等待 Mars 看圖、真機驗證或接受
- `MARS_DECISION`：尚未施工且需要產品方案決策
- `AUDIT_REQUIRED`：存在已知文件／程式差異或高風險疑點，必須先完成證據、根因與影響分析，禁止直接修改
- `NEEDS_REPRO`：問題存在但尚無法可靠重現
- `BLOCKED`：存在明確技術、資料或外部阻塞
- `DONE`：實作、驗證與文件全部完成

每個可施工項目至少記錄：ID、名稱、STATUS、PRIORITY、現況、目標、設計依據、允許修改範圍、高風險區域、Acceptance Criteria、Migration、Test Requirement 與 Dependency。不得只寫「城市系統未完成」等無法驗收的句子。

## 十三、自主連續開發與版本原子性

- Codex 從目前 release scope 中找到最高優先級 `READY`，標記 `IN_PROGRESS`，完成分析、實作、測試、Lead Review、文件與狀態更新。
- 下一項也已列入同一 release scope、定義完整、不需 Mars 決策、Context 足夠且不越過版本階段時，可以繼續。
- 不得因完成一個小功能無理由停止，也不得藉此無限擴張到下一版本。
- 每個大型版本拆成可恢復 Task，例如 `V56-001`、`V56-002`；每項完成後留下足夠狀態讓新 Thread 接續。
- 完整 ZIP 產出後進入 `MARS_REVIEW`；未經 Mars 明確要求，不得自動開始下一個正式版本。

## 十四、新 Thread 接續規則

聊天紀錄不是唯一專案記憶。新的 Codex Thread 依序讀取：

1. `AGENTS.md`
2. Mars 指定的北極星設計書
3. 最新 `v<n>_project_summary.md`
4. 最新 `v<n>_full_pending_items.md`
5. 最新 `v<n>_codex_development_log.md`
6. 最新 `v<n>_verification_report.md`
7. Delivery manifest 與 `SHA256SUMS.txt`
8. 實際相關程式碼

然後驗證 package lineage、已完成工作、目前 `IN_PROGRESS`、下一個 `READY`，不重新製作 `DONE`，也不依賴上一個聊天未寫入正式文件的記憶。

## 十五、Context 容量管理

- 平台若提供精確 context／token 百分比，首次越過 50%、70%、80%、90% 時提醒 Mars。
- 平台若沒有精確數字，不得虛構百分比；應明確說明無法讀取精確容量。
- 70% 後避免啟動不必要的大型新工作。
- 80% 後主動確保 Project Summary、Pending、Development Log 與目前恢復點已更新。
- 90% 或接近安全上限時優先完成安全 checkpoint，明確建議建立新對話，並提供最新 package、summary、下一步、未完成事項與必要恢復資訊。
- 每次完整 ZIP 交付後，開始下一階段前都必須評估剩餘容量；無法可靠判斷足夠時採保守原則，不啟動大型下一階段。

## 十六、測試最低標準

任何程式修改正式交付前必須執行：

```text
node test_regression.js
node smoke_multiyear.js
node smoke_puregm.js
```

- 歷史 package 的 PASS 不等於本輪 PASS。
- 執行環境限制導致無法運行時必須標記 `NOT RUN` 並說明原因；不得寫 PASS。
- 治理、文件或美術正式包仍依完整交付標準重跑三項測試，以證明封裝未退步。

## 十七、Regression 與測試誠信

- 有效母包的 regression assertion 數量是最低警戒線，原則上只增不減。
- 數量下降必須有明確原因與 Lead Review。
- assertion 總數不等於覆蓋完整；不得用無關、重複或低價值 assertion 補數量，掩蓋重要 invariant 被刪除。
- 禁止刪 assertion、放寬正確條件、改 deterministic seed、跳過失敗測試、Catch 測試錯誤或使用假資料讓測試變綠。

## 十八、完整 Verification

正式 delivery 至少逐項記錄 `PASS`、`FAIL`、`NOT RUN` 或 `NOT VERIFIED`：

- Lineage：packageId、basedOnPackageId、revision、formalVersionUpgrade
- Package：外層角色、Modular ZIP、Art ZIP、SHA、乾淨解壓與 ZIP 安全
- Code：Regression、Smoke、Pure GM Smoke
- Save：舊版 Save→新版、New Save→Load、JSON export／import
- UI：自動 render、Desktop、Mobile layout
- Mars：real-device status

Codex 自動測試不得冒充 Mars 真機驗證。

### 18.1 版本驗證狀態

- `TECHNICAL_RC`：Codex 的實作、測試、文件與封裝已完成，等待 Mars。
- `MARS_ACCEPTED`／`active`：Mars 明確接受此 package，該 package 成為目前正式母包；若 Verification Plan 或 Mars 指示要求真機驗證，必須先完成 Mars 指定範圍的真機驗證。只有 Mars 可以給予此狀態。
- `SUPERSEDED`：已有後續正式接受版本。
- `HISTORICAL`：只供回溯或回滾。

Codex 不得把 `TECHNICAL_RC` 稱為 Mars 已接受的正式完成版。

## 十九、Project Summary、Development Log 與 Verification Report

### 19.1 唯一權威 Project Summary

每個正式 package 只能有一份 `v<n>_project_summary.md` 作為新 Thread 主摘要，至少記錄：最新 package、packageId、母包、遊戲版本、完成項目、修改檔案、Migration、Regression、Smoke、Save 測試、已知問題、Remaining Work、下一個 `READY`、Mars 待決定事項與未驗證推論。

只有 Project Summary 可以包含完整、可直接貼入新 Thread 的 fenced recovery block。不得另建 `memory_summary`、`context_restoration`、`next_chat`、`continuation_notes`、`final_memory` 或其他平行摘要。

### 19.2 Codex Development Log

`v<n>_codex_development_log.md` 每個主要 Task 記錄：Task ID、日期、目的、設計依據、Root Cause／現況、修改檔案、實作內容、Migration、新增測試、驗證結果、風險與後續。只保存可交接的工程資訊，不記錄大量無用思考過程。

### 19.3 Verification Report

`v<n>_verification_report.md` 至少包含：Package ID、Lineage、Outer／Modular／Art package、SHA、Regression、Smoke、Pure GM Smoke、Save migration、New Save、Load、JSON import／export、UI automated checks、Mars real-device status、Known failures、Not-run checks 與 Remaining risks。

## 二十、固定 10 個外層角色

`v55-r009-codex` 與更早正式包保留歷史角色，不回頭修改。自 `v55-r010-codex` 起，每個正式版本、修正版、候選版、檢查點與重新打包版外層必須恰好包含：

1. `<n>_baseball_gm.html`
2. `<n>_baseball_gm_modular.zip`
3. `v<n>_art_assets.zip`
4. `v<n>_project_summary.md`
5. `v<n>_full_pending_items.md`
6. `v<n>_art_interface_spec.md`
7. `v<n>_codex_development_log.md`
8. `v<n>_verification_report.md`
9. `v<n>_delivery_manifest.json`
10. `SHA256SUMS.txt`

- 不得自行增加第 11 個外層角色；用途重疊的規劃書必須整合進 Pending、Summary 或 Development Log。
- 非美術版本不得自行省略 Art ZIP 或 Art Interface；角色集合確需變更時必須先由 Mars 核准並同步修改本規則與交付標準。
- 每份 Markdown 固定角色文件使用 YAML front matter：`documentRole`、`gameVersion`、`documentRevision`、`originalAuthor`、`lastModifiedBy`、`authoritative`、`packageId`。
- `v55-r010-codex` manifest 必須明確記錄兩個舊 handoff 角色被 Development Log 與 Verification Report 取代；舊 handoff 留在 r009 與更早 ZIP 中作為 Historical Source。

## 二十一、Claude 歷史文件

- v55 及以前的 Claude handoff、Codex handoff 與 Claude 原始文件是 Historical Source，不得回頭修改或從舊正式 ZIP 刪除。
- 新 Codex-only 包不再製造假的 Claude→Codex 或 Codex→Claude handoff。
- 必要歷史資訊整合進 Project Summary、Development Log、Pending 或設計文件，並標示來源。
- 「Codex-only」只代表本規則生效後由 Codex 單一維護，不代表抹除 Claude 的原始作者與共同開發者身分。

### 21.1 GitHub 與公開署名

公開發布或上傳 GitHub 時，必須忠實保留 Claude 作為原始核心共同開發者的貢獻，不得遺漏 Mars、Claude 與 Codex 的實際角色。具體 Credits 名稱、排序、版面與呈現格式由 Mars 決定。

既有 Claude 程式、設計或文件的來源標記不得被移除；Codex 修改 Claude 原始內容時，應在 Development Log 或版本紀錄區分原始來源與後續修改。署名可以透過 README、Credits、Release Notes 與工程文件忠實呈現，但不得為新 Codex-only commit 偽造 Claude 的 Git 作者、commit 或 `Co-authored-by` 紀錄。

GitHub 的 README／Credits 屬原始碼儲存庫治理文件，不是正式 `v<n>_delivery.zip` 的第 11 個外層角色；正式 ZIP 內仍維持固定 10 角色。

## 二十二、Package lineage、manifest 與 SHA

### 22.1 同版往返

- 外層 ZIP 名稱固定為 `v<n>_delivery.zip`，不用 `final2`、`r02` 等檔名堆疊。
- `packageRevision` 加一並建立唯一 `packageId`；`basedOnPackageId` 必須等於實際母包，`supersedesPackageId` 指向被取代的直接上一包。
- `formalVersionUpgrade: false`。

### 22.2 正式升版

- `packageRevision` 從 1 開始。
- `basedOnPackageId` 與 `supersedesPackageId` 指向最後有效上一版本 package ID。
- `formalVersionUpgrade: true`。
- 所有外層角色改用新版本檔名，不嵌入上一版完整 ZIP。

### 22.3 Manifest 最低欄位

Delivery manifest 至少包含：`manifestVersion`、`gameVersion`、`packageRevision`、`packageId`、`createdBy`、`basedOnPackageId`、`supersedesPackageId`、`formalVersionUpgrade`、`authoritativeSummary`、`expectedOuterFileCount`、`outerFiles`、`files`、`verification`、`remainingWork`。

每個 `files` 項目至少包含：`role`、`path`、`contentSha256`、`originVersion`、`originalAuthor`、`lastModifiedBy`、`changeStatus`、`carriedForwardFrom`。`changeStatus` 使用 `unchanged`、`modified`、`replaced`、`merged` 或 `new`。

Manifest 只保存目前狀態與直接上一包來源；更早歷史由舊完整 ZIP 保存。

### 22.4 SHA 規則

- `SHA256SUMS.txt` 雜湊其餘 9 個外層檔案，不雜湊自身。
- Manifest 的 `outerFiles` 列出全部 10 個角色，包括 manifest 與 SHA 清單。
- Manifest 與 `SHA256SUMS.txt` 在 manifest `files` 中的 `contentSha256` 因自我參照設為 `null`。
- 全部內容與 manifest 定案後最後建立 SHA；任何檔案再修改都必須重建。

## 二十三、20 檔模組版與載入順序

模組 ZIP 必須恰好 20 檔：

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

角色或檔名確需變更時仍維持 20 檔，並在 manifest 與 Project Summary 提供一對一映射與理由。

## 二十四、第一個 Codex-only 過渡包

現有 `v55-r009-codex` 是已存在的功能修訂，不能重新定義成治理版；具體內容以該包 Project Summary、manifest、SHA 與實際程式為準。Mars 接受並存檔 r009 後，第一個治理過渡包為：

- `packageId: v55-r010-codex`
- `basedOnPackageId: v55-r009-codex`
- `formalVersionUpgrade: false`
- 定位：Governance Migration／Codex 接管版

r010 原則上不新增大型玩法、不做無關核心重構、不改遊戲平衡。主要工作：採用新的 Codex-only 10 角色、整理 Pending 格式、建立 Development Log 與 Verification Report、確認 lineage、完成 `V55-MIG-001`、重跑完整測試與 Save／封裝驗證，並建立 v56 的 `READY` Tasks。

### 24.1 `V55-MIG-001`：Migration chain 完整稽核

- `STATUS: AUDIT_REQUIRED`
- `PRIORITY: CRITICAL`
- 本項是 r010 第一個技術工作。
- 在根因與影響分析完成前，禁止直接修改 migration chain。
- 必須先確認：受影響的舊存檔版本與資料範圍、是否存在其他 lazy ensure、開頁初始化／手動槽位讀取／JSON import 的完整正式執行路徑，以及 Regression 為何沒有捕捉疑點。
- 稽核必須直接從 Mars 指定的 r009 完整 ZIP 與乾淨解壓程式進行，不得只依賴 handoff 或舊工作區。
- 完成證據、根因與影響分析後，才可提出安全修正方案、Migration acceptance criteria 與測試設計。
- 正式修正必須新增能穿過真實 hydrate／import 入口的 Regression 測試；不得只直接呼叫單一 `ensureVNN()` 函式來假裝覆蓋讀檔路徑。

r010 進入 `MARS_ACCEPTED` 後，才正式升版為 `v56-r001-codex`。

## 二十五、`CURRENT_PACKAGE.json` 狀態

- `candidate`：Codex 已完成技術驗證，尚待 Mars 接受。
- `active`／`MARS_ACCEPTED`：Mars 明確接受此 package，該 package 成為目前正式母包；若 Verification Plan 或 Mars 指示要求真機驗證，必須先完成 Mars 指定範圍的真機驗證。只有 Mars 可以給予此狀態。
- `superseded`：已有後續正式接受版本。
- `historical`：只供回溯或回滾。

只有 Mars 明確接受後，才能把 candidate 晉升為 active。工作區目前舊 `CURRENT_PACKAGE.json` 若與 Mars 指定 ZIP 不符，必須視為過期證據，不得自行拿來替代母包。

## 二十六、正式美術素材包

正式 `v<n>_art_assets.zip` 只放遊戲實際載入的 production 素材。

保留：

- `production_assets/` 的正式 64／128／256px 與 SVG
- 最新一份 `theme_pack/`
- `docs/` 中本包必要的 manifest 與 validation

不放：

- 1254px 母檔、concept boards、previews、checkpoint、source templates、無關 tools
- 被拒絕素材與過程生成素材

1254px 正式母版由 Codex 保存在工作區供追溯。ZIP entry 一律使用正斜線 `/`，反斜線 entry 必須為 0；`theme_pack/` 與 `docs/` 不得夾帶舊版平行文件。

## 二十七、正式人物與 Image Generation

- 正式人物只能從 Mars 已核准的 1254px 透明 PNG 母版開始；截圖、256px 圖、失敗候選與 AI 整張重新生成圖都不能作為正式新母版。
- Image Generation 只能生成獨立透明局部圖層，不得重新輸出、修復或編修整張正式人物。
- 髮型拆成帽後／頭後層與帽簷下前髮層。
- 帽子、隊徽、臉型、雙耳、耳線、臉線、眉、眼、嘴、膚色、身體、球衣、手套、姿勢與比例都是保護區。
- 每次只製作一款主要造型；Mars 核准前不得批量套色、套表情或延伸到全部球隊。
- 失敗候選回到核准母版重新開始，不得從失敗圖繼續修補。

## 二十八、人物像素驗證與批准閘門

每個正式候選必須有允許修改遮罩。遮罩外：

- Alpha difference 必須為 0。
- 兩圖合成到同一固定背景後的 visible RGB difference 必須為 0。
- 禁止只用單一 RGBA `difference.getbbox()` 判斷。

任何保護區像素不同即 `FAIL`，不得展示為正式候選或進入 production assets。

正式流程：1254px→驗證→Mars 核准→256px→128px→64px→Production。給 Mars 查看前必須先自驗，並直接顯示至少包含原母版、候選、左右耳與臉線 200% 局部、256px 遊戲尺寸的確認表。未核准或失敗內容標記 `rejected-do-not-use`。

## 二十九、ZIP 與封裝安全

正式驗收必須拒絕：

- 絕對路徑、磁碟代號路徑與 `..` traversal
- 重複 entry、非預期巢狀 ZIP 與不在角色清單內的外層檔案
- Art ZIP 反斜線路徑
- 檔案數與 ZIP entry 數混淆

必須使用乾淨目錄重新解壓，驗證外層恰好 10 檔、SHA 9/9、模組恰好 20 檔、美術包完整，再執行測試。Windows PowerShell `Expand-Archive` 必須成功。

## 三十、工作區與刪除安全

目標工作區：

```text
專案根目錄/
├─ AGENTS.md
├─ FUTURE_DELIVERY_STANDARD.md
├─ CURRENT_PACKAGE.json
├─ delivery_tools/
├─ current/
├─ v<n>_delivery.zip
├─ _incoming/
├─ _staging/
└─ _audit/
```

- 正式來源與暫存工作分離；不建立 `final_final`、`final2`、`copy`、`new`、`tmp_obj` 或意義不明的平行專案。
- 根目錄最終只保留一個當前完整 ZIP 與一份 `current/`。
- Codex 不得自行刪除 Mars 的歷史正式 package。
- 清理前分成：保留、移入新版、可淘汰、Mars 決定。
- 只有 Mars 明確說「已存檔，可以刪除上一版」後才可淘汰正式上一版。
- 可重建的 `_incoming`、`_staging`、`_audit` 可以依安全流程清理；必須解析並確認目標位於專案根目錄內，不得使用廣泛 wildcard 刪除不明路徑。

## 三十一、正式工作標準流程

1. 取得 Mars 指定母包。
2. 驗證 lineage、manifest 與 SHA。
3. 安全、乾淨解壓到 staging。
4. 讀取 AGENTS、北極星、Summary、Pending、Development Log、Verification Report。
5. 確定 release scope 與下一個 `READY`。
6. 分析相關程式，執行 Root Cause／Design Check。
7. 實作並新增或更新測試。
8. 執行局部測試與 Lead Review。
9. 執行完整 Regression、Smoke、Pure GM Smoke 與 Save 驗證。
10. 更新 Development Log、Pending、Project Summary、Verification Report 與 Art 文件。
11. 更新 manifest，最後建立 SHA。
12. 產出完整 Delivery ZIP。
13. 再次乾淨解壓，驗證固定角色、Modular ZIP、Art ZIP、SHA 與安全路徑。
14. 標記 `TECHNICAL_RC` 並交付 Mars。
15. Mars 接受後標記 `MARS_ACCEPTED`，再判斷下一個 release scope。

若交付不完整，必須一次列出：程式缺陷、測試缺口、文件缺口、封裝缺口、仍未完成的專案工作。

## 三十二、不得偽造完成

禁止：

- 沒跑測試卻寫 PASS
- 沒看畫面卻寫 UI verified
- 沒做真機卻寫 Mars verified
- 用舊版測試結果冒充本輪
- 用假資料繞過 Bug、寫死模擬結果或刪測試讓 regression 變綠
- 隱藏錯誤、將未完成標記 DONE、將推論寫成既定事實

## 三十三、設計北極星與系統紅線

所有新增系統必須服務至少一根核心支柱：

- 資訊不對稱
- 人的意志
- 時間的複利

並符合：

- **出口**：新增數值或系統必須指出玩家看得見的結果。
- **真算**：進階數據必須來自真正模擬資料。
- **美術不入機制**：視覺資產不得改變數值、機率、AI 或可玩性；素材缺失時遊戲仍可運行。

新增功能不得任意阻止遊戲世界前進。除非世界狀態在數學上無法繼續，應優先使用降級處理、AI fallback、替代人員、警告或事件後果，而不是要求玩家處理後才能下一天。

## 三十四、Code Review 原則

Lead Review 必須檢查：

- 是否破壞北極星或重複已有系統
- 是否產生第二套 state
- 是否破壞 deterministic simulation、Save 或 Migration
- 是否增加無出口屬性、AI 特權或玩家隱藏作弊
- 是否造成長期資料膨脹或 UI render side effect
- 是否符合 Acceptance Criteria、測試與封裝規則

## 三十五、工作與版本完成定義

一項工作只有在實作、Acceptance Criteria、相關測試、Regression、必要 Smoke、Save compatibility、Lead Review、文件與風險記錄全部完成後才能標記 `DONE`。「程式已寫完」不等於 DONE。

一個版本只有在所有必做 Task DONE、無未處理 Critical Bug、Regression／Smoke／Pure GM Smoke PASS、Save 與 Package 驗證完成、SHA、Verification Report、Project Summary 與 Delivery ZIP 完成後，才能標記 `TECHNICAL_RC`。

只有 Mars 明確接受後，版本才能標記 `MARS_ACCEPTED`／`active` 並成為目前正式母包；若該版本的 Verification Plan 或 Mars 指示要求真機驗證，必須先完成指定範圍的真機驗證。「已存檔，可以刪除上一版」是另一項獨立 Mars 授權，不是 `MARS_ACCEPTED` 的必要條件。

## 三十六、核心原則

Codex 的工作不是不停新增東西，而是在不破壞《決勝GM》既有世界的前提下，持續把它做深、做穩、做完整。

優先順序：

1. 資料正確
2. 模擬正確
3. Save 正確
4. AI 正確
5. 系統因果正確
6. UI 可用
7. 視覺品質
8. 新功能數量

若第 8 項會傷害前七項，不做。
