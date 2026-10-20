# 《決勝GM》v50 最終複驗報告

> 複驗日期：2026-07-25  
> 複驗檔：`D:/Claud_baseball_GM/第二版北極星棒球設計/v50_delivery.zip`  
> 外層 ZIP SHA-256：`5498CF635812225D079059C6D7F236CB8AA67ED4D2DFE13D1C5EA612FF8A23D0`  
> 判定：**通過自動化與封裝驗收，可作為目前正式可執行 V50 交付。**

## 驗收結果

| 項目 | 結果 |
|---|---|
| Windows PowerShell `Expand-Archive` | 通過，0 錯誤 |
| 外層檔案 | 9 檔 |
| 外層檔名 | 全部 ASCII |
| 模組 ZIP | 完整 20 檔 |
| 模組內非 ASCII 路徑 | 0 |
| 美術素材 ZIP | 完整 138 檔 |
| 美術素材內非 ASCII 路徑 | 0 |
| SHA-256 | 8/8 全部吻合 |
| 回歸測試 | 1150 通過／0 失敗 |
| 一般模式 15 年 smoke | 通過 |
| 純 GM 模式 15 年 smoke | 通過 |
| `cityUniform` 現行規格 | 已統一為停用、警告並剝除 |
| 舊中文檔名引用 | 0 |
| 未授權中文檔名例外 | 已移除 |

## 完整外層 manifest

1. `50_baseball_gm.html`
2. `50_baseball_gm_modular.zip`
3. `v50_project_summary.md`
4. `v50_claude_handoff.md`
5. `v50_codex_handoff.md`
6. `v50_art_interface_spec.md`
7. `v50_art_assets.zip`
8. `v50_full_pending_items.md`
9. `SHA256SUMS.txt`

## SHA-256 驗證

`SHA256SUMS.txt` 中以下 8 個檔案均與實際檔案吻合：

- `50_baseball_gm.html`
- `50_baseball_gm_modular.zip`
- `v50_project_summary.md`
- `v50_claude_handoff.md`
- `v50_codex_handoff.md`
- `v50_art_interface_spec.md`
- `v50_art_assets.zip`
- `v50_full_pending_items.md`

## 修正確認

- 原先編碼損壞的中文檔名已改為 `v50_full_pending_items.md`。
- Windows 標準解壓問題已消失。
- 所有相關文件與 SHA-256 清單已改用新 ASCII 檔名。
- `01-data-engine.js` 的過期 `cityUniform` 回退說法已修正。
- `00-theme.js` 的現行契約已不再把 `cityUniform` 當成正式 team 欄位。
- 整合 HTML 已包含更新後說明。
- v491 美術素材中的歷史文件仍保存當時尚未定案的 `cityUniform` 討論，屬歷史紀錄，不是 V50 現行規格衝突。

## 驗收邊界

本次已獨立重跑模組回歸及兩組 smoke。交付文件記錄整合單檔自驗為 33/0；目前執行環境不允許瀏覽器直接開啟本機 `file://` HTML，因此未在本輪額外進行 Edge 視覺操作。這不影響 Windows 解壓、模組測試與封裝驗收結論；正式使用前仍建議由使用者在 Edge 開啟 `50_baseball_gm.html` 做一次畫面確認。

