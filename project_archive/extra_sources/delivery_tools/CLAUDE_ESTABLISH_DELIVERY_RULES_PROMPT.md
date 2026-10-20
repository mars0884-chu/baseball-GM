# 給 Claude：以 v51-r003-codex 修正交付規則

請把以下提示語完整貼入 Claude 對話，並同時提供最新完整 `v51_delivery.zip`。
這份提示語不放入外層 ZIP 成為第 11 個角色；相同規則已寫入
`v51_codex_to_claude_handoff.md`。

```text
請先直接檢查我提供的最新完整 v51_delivery.zip。它的預期身分是：

- packageId: v51-r003-codex
- packageRevision: 3
- basedOnPackageId: v51-r002-codex
- createdBy: Codex

若 ZIP SHA、packageId 或 lineage 不符，立即停止並列出證據；不得改用同名工作區檔案或舊解壓目錄。

確認來源後，請先把以下規則同步到你使用的 AGENTS.md、FUTURE_DELIVERY_STANDARD.md
與交付驗證器，再開始下一輪封裝：

一、固定角色
完整 v51_delivery.zip 外層必須恰好 10 個角色：
1. 51_baseball_gm.html
2. 51_baseball_gm_modular.zip
3. v51_art_assets.zip
4. v51_project_summary.md
5. v51_full_pending_items.md
6. v51_art_interface_spec.md
7. v51_claude_to_codex_handoff.md
8. v51_codex_to_claude_handoff.md
9. v51_delivery_manifest.json
10. SHA256SUMS.txt

不得新增第 11 份 summary、memory、context restoration、prompt、mirror manifest
或方向不明的 handoff。v51_project_summary.md 仍是唯一權威脈絡摘要。

二、handoff 所有權與不可變規則
- v51_claude_to_codex_handoff.md 只有 Claude 可寫。
- v51_codex_to_claude_handoff.md 只有 Codex 可寫；Claude 必須位元不變保留。
- 不得為了更新目前容器 packageId 而修改對方 handoff。
- 有異議、回覆或建議時，只能寫入自己方向的 handoff。

三、front matter packageId 的明確語意
YAML front matter 的 packageId 代表「最後一次由文件所有者或有權封裝者修改該文件的 package」，
不是強迫所有文件等於目前容器 packageId。

因此：
- 本輪實際修改的文件使用新 packageId，documentRevision 加一。
- 未修改的對方 handoff 或接口文件保持全部位元與原 front matter 不變。
- manifest 對未修改文件記錄 changeStatus: unchanged。
- carriedForwardFrom.packageId 必須指向直接母包 v51-r003-codex。
- carriedForwardFrom.contentSha256 必須等於母包內同檔 SHA。
- manifest 以直接上一包追蹤容器 lineage；front matter 以文件最後修改來源追蹤作者 lineage。

四、美術 ZIP 路徑
v51-r003-codex 已把 375 個美術檔案的 ZIP entry 分隔符正規化為 /：
- 檔案數 375
- ZIP entries 376
- 反斜線 entries 0
- 重打包前後 375/375 檔案內容 SHA 相同

後續不得重新引入反斜線，也不得在未經 Mars 核准下變更素材內容或把 T5-T19 寫成已視覺核准。

五、測試執行規則
- Windows PowerShell Expand-Archive 必須實機成功。
- Node test_regression.js、smoke_multiyear.js、smoke_puregm.js
  必須從解壓後的模組目錄執行，不能從專案根目錄執行。
- console.warn 不等於失敗；以 process exit code 與驗證結果判斷。
- 必須驗證外層 10/10、SHA 9/9、模組 20/20。
- 必須驗證 Theme pack 125/125、品牌 303/303、遊戲接口 valid=true 且 0 warnings。

六、下一包 lineage
下一個同版包必須：
- packageRevision: 4
- packageId 使用唯一的 v51-r004-<作者> 格式
- basedOnPackageId: v51-r003-codex
- supersedesPackageId: v51-r003-codex
- formalVersionUpgrade: false

全部文件與 manifest 定案後，最後才重建 SHA256SUMS.txt。
交付必須是完整、可下載、可獨立使用的 v51_delivery.zip；
不得只交補丁、差異文件或要求 Mars 自行組包。

七、權限邊界
這份提示只修正交付規則，不代表 Mars 已選擇 A2、A3、A4 或 A5，
也不授權自行調整打擊率 .234、防禦率 6.10、R1 教練 AI 手感，
或把 T5-T19 標記成已獲視覺核准。

完成後請一次回報：
程式缺陷、測試缺口、文件缺口、封裝缺口、仍未完成的專案工作，
並交付完整 v51_delivery.zip。
```
