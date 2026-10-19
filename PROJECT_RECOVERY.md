# 《決勝GM》GitHub 恢復與清理紀錄

更新：2026-10-19。這份文件供本機工作區清理後重新接手使用；**不得把文件中的「本機測試通過」解讀成公開版或 Mars 真機驗收通過**。

## 先判斷版本

- 公開遊戲：<https://mars0884-chu.github.io/baseball-GM/>；原始碼：<https://github.com/mars0884-chu/baseball-GM>。公開頁實際版本須核對 GitHub Pages 工作流程、遠端 `main` SHA、`index.html`／`sw.js` 快取標記與瀏覽器畫面，不可只看本文件或推送訊息。
- 本機最後已知候選為 `v60-r140-offseason-ledger`。截至本文件起草，GitHub 公開版仍是 r135；r136～r140 程式及紀錄已在本機 Git commit，但**尚未完成推送與公開瀏覽器驗證**。後續若成功推送，必須更新本段和下方狀態。
- 封裝體系與 GitHub 公開程式是兩條不同線：本機 `CURRENT_PACKAGE.json` 記錄最後 Mars 明確接受的正式母包為 `v56-r001-codex`，母包 `v55-r012-codex`，正式 ZIP SHA-256 為 `53B111CC1FDC4275B73E596D2C76AD1696F4367ECA9370681C10E8B77F786F97`。公開程式的 r140 不等於 v60 正式完整 ZIP，也不得自行宣稱 Mars 接受。

## 源碼與開發接續

- GitHub 遊戲入口是 `index.html`。七個腳本依序載入：`00-theme.js`、`01-data-engine.js`、`02-finance.js`、`03-simulation.js`、`04-state-core.js`、`05-ui-dashboard.js`、`06-ui-roster.js`。`style.css` 控制版面，`sw.js` 與首頁的版本查詢字串要一起更新，否則玩家可能讀到舊快取。
- 程式修改至少執行 `node test_regression.js`、`node smoke_multiyear.js`、`node smoke_puregm.js`。本機 r140 最後結果：回歸 2,013 通過／0 失敗、一般與純 GM 15 年煙霧均 PASS；這不是本機手機畫面或公開部署證據。
- r136：自由球員首屏情蒐／名單摘要；r137：春訓成果同球路控球與威力成對比較；r138：球員詳情季中特訓規則分組；r139：球員傷勢狀態短列；r140：休賽季跳槽與稅務結算短列。細節及各批限制見 `PUBLIC_DEPLOYMENT.md` 和 Git commit。這些批次沒有改模擬、存檔欄位或經濟規則。
- 文字減量的產品決策：以核准美術、資訊分組、比較、分頁取代重複文字，**不是把必要資料收起來**；不得用任意 SVG／裝飾圖示冒充已核准圖片。保留所有決策數值、規則、操作及舊存檔相容性。Mars 要在全部完成後一次進行個人驗收。
- 尚未結案：56 路由與條件分支的同源前後可見字／頁高量測；有實際資料的數據中心、跨年名人堂、季末頒獎等手機畫面；r136～r140 更新後瀏覽器證據；整體文字量是否達目標。歷史單頁下降與空資料頁不能證明全遊戲減半。
- 2026-10-19 本機舊 Edge 自動稽核在沙箱中啟動後立即結束；本機 `file://` 被瀏覽器安全政策拒絕。不要以其他瀏覽器協定或原始控制方式繞過政策，也不要把程式測試寫成瀏覽器 PASS。

## 正式與歷史 ZIP 備份清單

下列為清理前本機根目錄的原始 ZIP SHA-256。**此表是來源清單，不是遠端備份完成證明。**預計在同一 GitHub 儲存庫的 `project_archive/` 放置可追溯副本；每一份須於推送後核對遠端檔案與下載 SHA，才能標記「已備份」。GitHub 仍是公開儲存庫。

| 檔案 | MiB | SHA-256 |
|---|---:|---|
| `CLAUDE_V49_ART_HANDOFF_PACKAGE_v1.zip` | 4.32 | `8AAE74E0AAFDF003CD266FC2CC2C47F7AC19A91B27AAB1D0D054252184F77D41` |
| `v491_art_checkpoint_delivery_v01.zip` | 41.64 | `C38E8631B7D4FF661FF8A5721EFE19505B0F9570C365057BCA2E9B34EBF0A6D6` |
| `v50_claude_corrected_mother_v01.zip` | 42.19 | `0539B9F1E8ECAD68EC2998114BBD9A9ADBA94F2454F0544A5CA743E92EA49261` |
| `v50_codex_all_20_portrait_delivery_v01.zip` | 51.58 | `8FDAF046539D4DC0C89500BD7CE85647E40416DC7CCE8BB50EF252291C8B5FCA` |
| `v50_codex_portrait_samples_delivery_v01.zip` | 45.58 | `6FA985F7A245DBA5CAAF1AD8E8DFBEB455E8416E65FDDE9964FCC78645E33B80` |
| `v52_delivery.zip` | 54.39 | `D5A73BA22A2FA98C2F5378766725289080A687D96F025E0E59D2C84934B84A3A` |
| `v53_delivery.zip` | 4.70 | `658F818FBA4C9113D719382F963810886BBEF9F6DCFDA4BC4F7EE74DA924A5DB` |
| `v55_delivery.zip` | 7.53 | `0E62B4A5E99FB07F04460CBE0C09C5B5B1D10F0E956429190C08AA325FC387C5` |
| `v55-r010-codex.zip` | 8.32 | `437097D1ACD17F37275E89782A4C385F1BEE9EC1D9E3EBA7E2D101FAD117BF26` |
| `v56_delivery.zip` | 10.62 | `53B111CC1FDC4275B73E596D2C76AD1696F4367ECA9370681C10E8B77F786F97` |

`_audit/preserved-v55-r012/v55-r012-codex_delivery.zip` 長度 7,895,839 位元組，SHA-256 `0E62B4A5E99FB07F04460CBE0C09C5B5B1D10F0E956429190C08AA325FC387C5`，與上表 `v55_delivery.zip` 逐位元組雜湊相同。備份兩個原路徑／名稱的副本以保留 lineage 線索，不能因內容相同就把名稱當成同一 package ID。

清理作業狀態：**尚未推送備份、尚未核對遠端、尚未刪除本機正式或歷史原件。**推送後須記錄遠端 commit、各檔 Git blob／下載雜湊、公開版版本與實際刪除範圍；不要預先把計畫寫成完成。

另已準備 `project_archive/governance/`（規則、正式包指標與歷史美術記憶）、`project_archive/current_v56/`（正式 v56 解包角色，10 檔）及 `project_archive/approved_portrait_mothers_v50/`（v50 1254px 母版等，375 檔）。目前只完成本機逐檔 SHA-256 複本核對，**推送與遠端核對仍未完成**。這些目錄在 GitHub 公開可讀；重啟前仍須重新檢查正式 ZIP 內的角色、manifest、SHA 與批准範圍。

本機 `_audit/`、`_incoming/`、`_staging/` 其他候選與歷史資料，以及未逐一收錄的舊美術目錄不在上述備份範圍。只有 ZIP 或明確收錄的檔案可由 GitHub 恢復；不能假定整個工作區已備份。若未來依 Mars 指示刪除未備份項目，須保留「已刪且無遠端副本」紀錄，不能寫成可回復。

## 人員與安全邊界

Mars 是產品與正式接受的最終決策者；Claude 是原始核心共同開發者；Codex 後續負責程式、美術整合、驗證與版本維護。不得刪除歷史作者標記，也不得偽造 Git 作者或共同提交。正式交付若重啟，應先取得 Mars 指定母包並驗證 ZIP、manifest、SHA、lineage，再依當時有效的 AGENTS 規則處理；不能從 GitHub 遊戲頁反推正式 package 身分。

