# 《決勝GM》Codex-only 固定角色與交付規格

> 狀態：正式生效  
> 正式核准日：2026-08-09  
> 最終核准者：Mars  
> 技術責任者：Codex  
> 適用起點：`v55-r010-codex`；`v55-r009-codex` 與更早正式 ZIP 保留原角色與歷史內容，不回頭修改

本文件規範正式封裝、lineage、固定角色、驗證與保存。產品權責、開發流程、測試誠信、Agent 分工、Save／Migration 與美術製作規則以最新版 `AGENTS.md` 為準。

「Codex-only」代表日常維護責任由 Codex 接手，不代表抹除 Claude 的原始核心共同開發者身分。歷史 ZIP、文件與來源署名必須保留。

## 一、交付單位

- 每輪正式交付是一個可獨立使用的完整 `v<n>_delivery.zip`。
- 不接受補丁、差異包、零散附件或要求 Mars 自行重組。
- 同一正式版本的 ZIP 名稱固定；新舊依 `packageRevision`、`packageId`、`basedOnPackageId`、manifest 與 SHA-256 判定，不依檔名尾綴或時間戳。
- 每次工作只使用 Mars 本輪指定的原始完整 ZIP。Lineage 不一致時停止正式修改並回報 Mars。

## 二、Codex-only 固定 10 個外層角色

自 `v55-r010-codex` 起，正式版本、修正版、候選版、檢查點與重新打包版外層必須恰好包含：

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

- 不得增加用途重疊的 summary、memory、context restoration、next chat、continuation notes、mirror manifest、額外 handoff 或其他第 11 個外層角色。
- 規劃內容整合進 Pending、Project Summary 或 Development Log。
- 非美術版本不得自行省略 Art ZIP 或 Art Interface。
- 固定角色確需變更時，必須先由 Mars 明確核准並同步修改 `AGENTS.md` 與本規格。

## 三、v55-r009 至 r010 過渡

現有 `v55-r009-codex` 是已存在的功能修訂，不得重新定義或回頭改寫；具體內容以該包 Project Summary、manifest、SHA 與實際程式為準。

第一個 Codex-only 治理過渡包為：

```json
{
  "gameVersion": "v55",
  "packageRevision": 10,
  "packageId": "v55-r010-codex",
  "createdBy": "Codex",
  "basedOnPackageId": "v55-r009-codex",
  "supersedesPackageId": "v55-r009-codex",
  "formalVersionUpgrade": false,
  "authoritativeSummary": "v55_project_summary.md",
  "expectedOuterFileCount": 10
}
```

r010 使用新的 Codex Development Log 與 Verification Report，取代新包中的兩份雙向 handoff。Manifest 必須把兩個舊角色記為 `replaced`，說明新角色與來源；舊 handoff 位元不變地留在 r009 與更早正式 ZIP 中作為 Historical Source。

r010 原則上不新增大型玩法、不做無關核心重構、不改遊戲平衡。第一個技術工作為 `V55-MIG-001`，初始狀態 `AUDIT_REQUIRED`、優先級 `CRITICAL`；在完成舊存檔影響、lazy ensure、正式 hydrate／import 路徑與 Regression 缺口分析前，不得直接修改 migration chain。完成根因與影響分析後，才可決定安全修正並新增覆蓋真實讀檔入口的 Regression 測試。Mars 接受 r010 後，才進入 `v56-r001-codex`。

## 四、唯一權威 Project Summary

`v<n>_project_summary.md` 是新 Codex Thread 的唯一權威恢復摘要。

- 只有本檔可以包含完整 copy-ready fenced recovery block。
- 其他文件只能引用，不得複製平行的完整恢復摘要。
- 至少包含：最新 package、packageId、母包、遊戲版本、架構、完成項目、修改檔案、Migration、Regression、Smoke、Save 測試、已知問題、Remaining Work、下一個 `READY`、Mars 待決定事項、未驗證推論與恢復方式。
- 必須區分 Mars 決定、Claude 歷史來源、Codex 新增／修改、Codex 驗證與尚未確認推論。

## 五、Codex Development Log 與 Verification Report

### 5.1 `v<n>_codex_development_log.md`

每個主要 Task 記錄：Task ID、日期、目的、設計依據、Root Cause／現況、修改檔案、實作內容、Migration、新增測試、驗證結果、風險與後續。不得成為聊天逐字稿或第二份完整恢復摘要。

### 5.2 `v<n>_verification_report.md`

至少記錄：Package ID、Lineage、Outer／Modular／Art package、SHA、Regression、Smoke、Pure GM Smoke、Save migration、New Save、Load、JSON import／export、UI automated checks、Desktop、Mobile、Mars real-device status、Known failures、Not-run checks 與 Remaining risks。

未實際執行的驗證只能標記 `NOT RUN` 或 `NOT VERIFIED`，不得寫 PASS。

## 六、文件身分與作者追蹤

每份 Markdown 固定角色文件使用 YAML front matter：

```yaml
---
documentRole: project-summary
gameVersion: v55
documentRevision: 10
originalAuthor: Claude
lastModifiedBy: Codex
authoritative: true
packageId: v55-r010-codex
---
```

固定欄位為：`documentRole`、`gameVersion`、`documentRevision`、`originalAuthor`、`lastModifiedBy`、`authoritative`、`packageId`。

`originalAuthor` 必須忠實保留內容最早來源；Codex 接手修改只更新 `lastModifiedBy`，不得把 Claude 原始內容改稱 Codex 原創。Manifest 對每個角色同步記錄來源與變更狀態。

## 七、GitHub 與公開共同開發者署名

公開發布或上傳 GitHub 時，必須忠實保留 Claude 作為原始核心共同開發者的貢獻，不得遺漏 Mars、Claude 與 Codex 的實際角色。具體 Credits 名稱、排序、版面與呈現格式由 Mars 決定。

既有 Claude 程式、設計與文件來源不得被抹除。Codex 修改 Claude 原始內容時，使用 Development Log、Release Notes 或版本紀錄區分原始來源與後續修改。

不得為新 Codex-only commit 偽造 Claude 的 Git 作者、commit 或 `Co-authored-by`；公開署名透過 README、Credits、Release Notes 與工程文件忠實呈現。

GitHub README／Credits 是原始碼儲存庫治理文件，不放進正式 `v<n>_delivery.zip`，因此不構成第 11 個外層角色。

## 八、Package lineage

### 8.1 同版往返

- ZIP 名稱固定為 `v<n>_delivery.zip`。
- `packageRevision` 比直接上一包加一。
- 建立唯一 `packageId`。
- `basedOnPackageId` 等於實際母包，`supersedesPackageId` 指向直接被取代包。
- `formalVersionUpgrade: false`。

### 8.2 正式升版

例如 v55→v56：

- 外層 10 角色全部使用 v56 檔名。
- `packageRevision` 從 1 開始。
- `basedOnPackageId` 與 `supersedesPackageId` 指向最後有效 v55 package ID。
- `formalVersionUpgrade: true`。
- 不把 v55 完整 ZIP 嵌入 v56。
- Manifest 逐角色記錄 `carriedForwardFrom`、舊 SHA、新 SHA 與 change status。

Manifest 只保存目前狀態與直接上一包來源；更早歷史由舊完整 ZIP 保存。

## 九、Delivery manifest

Manifest 至少包含：

- `manifestVersion`
- `gameVersion`
- `packageRevision`
- `packageId`
- `createdBy`
- `basedOnPackageId`
- `supersedesPackageId`
- `formalVersionUpgrade`
- `authoritativeSummary`
- `expectedOuterFileCount`
- `outerFiles`
- `files`
- `verification`
- `remainingWork`

每個 `files` 項目至少包含：

- `role`
- `path`
- `contentSha256`
- `originVersion`
- `originalAuthor`
- `lastModifiedBy`
- `changeStatus`
- `carriedForwardFrom`

`changeStatus` 使用 `unchanged`、`modified`、`replaced`、`merged` 或 `new`。

## 十、SHA 規則

- Manifest 的 `outerFiles` 列出全部 10 個外層檔案，包括 manifest 與 `SHA256SUMS.txt`。
- `SHA256SUMS.txt` 雜湊其餘 9 個外層檔案，不雜湊自身。
- Manifest 中 manifest 自身與 `SHA256SUMS.txt` 的 `contentSha256` 設為 `null`；manifest 最終 SHA 由 SHA 清單記錄。
- 所有內容與 manifest 定案後最後建立 SHA；修改任何檔案後必須重建。

## 十一、20 檔模組版

模組 ZIP 必須恰好包含：

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

這是 1 個主題／美術模組加 6 個遊戲模組，以及 13 個文件、資源與測試檔。角色或檔名確需變更時仍維持 20 檔，並在 manifest 與 Project Summary 提供一對一映射與理由。

## 十二、正式美術包

`v<n>_art_assets.zip` 只附遊戲實際載入的正式素材。

保留：

- `production_assets/` 的 64／128／256px 與 SVG
- `theme_pack/` 最新一份
- `docs/` 本包必要的 manifest 與 validation

不附：

- 1254px 母檔
- `source_assets/`、`concept_boards/`、`previews/`、`checkpoint/`、`source_templates/`、無關 `tools/`
- 被拒絕素材與過程生成素材

1254px 母檔由 Codex 在工作區保存供像素鎖定與追溯。ZIP entry 一律使用正斜線 `/`，反斜線 entry 必須為 0。美術 ZIP 必須區分檔案數與 ZIP entry 數。

## 十三、ZIP 安全與乾淨解壓

驗收必須拒絕：

- 絕對路徑、磁碟代號路徑與 `..` traversal
- 重複 entry
- 非預期巢狀 ZIP
- 外層第 11 個檔案或角色重複
- Art ZIP 反斜線路徑

必須在新建乾淨目錄中使用 Windows PowerShell `Expand-Archive` 成功解壓，不能以舊解壓目錄驗收。

## 十四、交付驗收

每次正式交付至少執行：

1. 驗證 Mars 指定母包與 lineage。
2. 驗證外層恰好 10 個角色且不重複。
3. 驗證 ZIP 安全與乾淨解壓。
4. 驗證 SHA 9/9。
5. 驗證模組 ZIP 恰好 20 檔。
6. 驗證 Art ZIP 完整、路徑正規且檔案數正確。
7. 執行 `node test_regression.js`。
8. 執行 `node smoke_multiyear.js`。
9. 執行 `node smoke_puregm.js`。
10. 執行適用的 Save migration、New Save、Load 與 JSON import／export 驗證。
11. 執行適用的 UI 自動 render、Desktop 與 Mobile 檢查。
12. 驗證 Project Summary、Pending、Development Log、Verification Report 與 manifest 一致。
13. 產出完整 Delivery ZIP 並再次乾淨驗收。
14. 標記 `TECHNICAL_RC`，將 Mars 真機狀態獨立標記。

若任何檢查未執行，必須標記 `NOT RUN` 或 `NOT VERIFIED`；歷史測試結果不得冒充本輪結果。

## 十五、版本狀態與 `CURRENT_PACKAGE.json`

- `candidate`／`TECHNICAL_RC`：Codex 已完成技術驗證，尚待 Mars 接受。
- `active`／`MARS_ACCEPTED`：Mars 明確接受此 package，該 package 成為目前正式母包；若 Verification Plan 或 Mars 指示要求真機驗證，必須先完成 Mars 指定範圍的真機驗證。只有 Mars 可以給予此狀態。

「已存檔，可以刪除上一版」是另一項獨立 Mars 授權，不是 `MARS_ACCEPTED`／`active` 的必要條件。
- `superseded`：已有後續正式接受版本。
- `historical`：只供回溯或回滾。

只有 Mars 可以將 candidate 晉升為 active。`CURRENT_PACKAGE.json` 若與 Mars 指定 ZIP、manifest 或 SHA 不符，視為過期，不得用來取代母包。

## 十六、工作區與保存

目標工作區只保留：

- `AGENTS.md`
- `FUTURE_DELIVERY_STANDARD.md`
- `CURRENT_PACKAGE.json`
- `delivery_tools/`
- 一份 `current/`
- 一個目前 `v<n>_delivery.zip`
- `_incoming/`、`_staging/`、`_audit/` 三個可重建暫存區

不建立 `final_final`、`final2`、`copy`、`new`、`tmp_obj` 或意義不明的平行專案。清理前列出保留、移入新版、可淘汰、Mars 決定四類；只有 Mars 明確確認「已存檔，可以刪除上一版」後，才能淘汰正式上一版。

## 十七、版本保存與回滾

- 同版新 revision 完整驗證後，中間候選可依 Mars 指示淘汰。
- 跨版時，上一版完整 ZIP 是歷史與回滾包，不嵌入新版。
- Mars 確認新版已存檔前，不得刪除上一個正式接受版本。
- v55 及以前含 Claude handoff 的正式 ZIP 永久保留其原始內容；新版不複製假的 handoff，但不得否認或抹除 Claude 的歷史貢獻。
