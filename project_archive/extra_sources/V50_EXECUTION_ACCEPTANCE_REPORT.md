# 《決勝GM》v50 可執行驗收報告

> 驗收日期：2026-07-25  
> 驗收檔：`D:/Claud_baseball_GM/第二版北極星棒球設計/v50_delivery.zip`  
> 外層 ZIP SHA-256：`2D1BAB384AAA44C952FE4B55A82C2FCD942532F1BC2583012FB904BD9F4FE37D`  
> 最終判定：**不符合可執行交付標準，必須重新封裝。**

## 一、阻斷性問題

### ZIP 內含編碼錯誤的非 ASCII 檔名，Windows 標準解壓失敗

外層 ZIP 有 9 個項目，其中第 8 個原意應為：

`決勝GM_全部未完成項目清單.md`

但 ZIP 內實際檔名已成為編碼損壞字串。使用 Windows PowerShell `Expand-Archive` 解壓整包時直接失敗：

`路徑中有不合法的字元`

使用 Windows `tar` 也在該項目報錯：

`Invalid empty pathname`

因此一般使用者無法用 Windows 標準工具完整解壓本交付包，不能判定為可執行的完整交付。

此檔名也直接違反專案「所有檔名必須為 ASCII」規則。`v50_project_summary.md` 自行寫入「Mars 指定中文檔名的例外」，但本次驗收沒有找到使用者授權這項例外。

### SHA-256 清單無法完整驗證

七個 ASCII 外層檔案的 SHA-256 均吻合：

1. `50_baseball_gm.html`
2. `50_baseball_gm_modular.zip`
3. `v50_project_summary.md`
4. `v50_claude_handoff.md`
5. `v50_codex_handoff.md`
6. `v50_art_interface_spec.md`
7. `v50_art_assets.zip`

但 `SHA256SUMS.txt` 使用正常中文檔名列出第 8 個檔案，ZIP 實際 entry 卻是編碼損壞名稱，而且無法解壓，因此清單不能達成「全部外層檔案可依檔名驗證」的要求。

## 二、程式與測試驗證

排除損壞檔名後，以替代工具抽出其餘有效檔案繼續驗證：

- 外層有效核心檔案：8 檔。
- 模組 ZIP：完整 20 檔，基準檔名齊全。
- 美術素材 ZIP：138 檔。
- 回歸測試：**1150 通過／0 失敗**。
- 一般模式 15 年 smoke：**通過**。
- 純 GM 模式 15 年 smoke：**通過**。

主要修正已實作：

- 肖像 context 改為 `{ player, teamId, isAway }`。
- 最近一戰 UI 依實際主客場傳入 `isAway`。
- 快取鍵包含球員、球隊、尺寸與主客場。
- Theme pack 已補 URI、欄位白名單與 `layerOrder` 驗證。
- `cityUniform` 載入時會警告並剝除。
- 新增 54 項相關回歸斷言。

所以目前狀態是：

**程式測試合格，但交付 ZIP 不合格。**

## 三、仍需一併清理的規格文字

重新封裝前應同步修正兩處過期敘述：

1. `01-data-engine.js` 的 v50 說明仍寫著：
   `cityUniform null 時回退 awayUniform`
2. `00-theme.js` 的主題包資料契約註解仍把 `cityUniform` 列在正式 team 欄位內。

實際程式已將 `cityUniform` 停用並剝除，因此這兩處應改成一致說法，整合 HTML 中的對應內嵌內容也要同步重建。

## 四、Claude 必須執行的最小修正

1. 將中文檔案改名為 ASCII，例如：
   `v50_full_pending_items.md`
2. 更新以下文件中的所有引用：
   - `v50_project_summary.md`
   - `v50_claude_handoff.md`
   - 外層 manifest
3. 移除未經 Mars 授權的「中文檔名例外」敘述。
4. 修正兩處過期的 `cityUniform` 註解，並重新建置整合 HTML。
5. 更新 `SHA256SUMS.txt`，以新 ASCII 檔名涵蓋全部 8 個其他外層檔案。
6. 從乾淨資料夾重新產生 `v50_delivery.zip`。
7. 必須在 Windows 上實測：
   - `Expand-Archive` 可完整解壓，0 錯誤。
   - 外層 9 檔全部存在。
   - 全部 SHA-256 依檔名驗證成功。
   - 模組 ZIP 恰好 20 檔。
   - 回歸與兩組 smoke 仍全部通過。

## 五、最終驗收條件

修正版只有在 Windows 標準解壓成功、所有檔名為 ASCII、全部 SHA-256 可驗證，且既有 1150/0 與兩組 smoke 維持通過後，才符合「可以執行」標準。

