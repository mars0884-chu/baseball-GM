# 《決勝GM》V50 Codex 正式品牌 Theme pack 完整摘要 v01

> 日期：2026-07-25  
> 基準母包：Claude `v50_delivery.zip`  
> 母包 SHA-256：`5498CF635812225D079059C6D7F236CB8AA67ED4D2DFE13D1C5EA612FF8A23D0`  
> 本輪範圍：建立正式 Theme pack，映射 20 隊現有隊徽與 V50 正式主輔色。

## 一、來源與邊界

### Claude 原始提供

- 完整 V50 外層 9 檔。
- 整合單檔 HTML。
- 恰好 20 檔的完整模組 ZIP。
- 138 檔完整美術素材 ZIP。
- V50 `TEAM_DEFS` 的 20 隊固定 `teamId`、正式隊名、`shortName`、`brandKey` 與主輔色。
- Theme pack schema、圖片 URI 驗證、欄位白名單、主題匯入與持久化接口。
- 對話脈絡摘要、Claude/Codex handoff、接口規格、未完成清單與 SHA-256。

### Codex 本輪新增／修改／確認

- 新增可直接匯入的 20 隊品牌 Theme pack。
- 新增相對路徑開發版本、正式 manifest、README、建置腳本與兩層驗證器。
- 更新美術專案記憶與美術包內交付標準。
- 重新封裝完整美術素材 ZIP，但保留母包原有 138 檔，遺失數為 0。
- 新增本摘要、交給 Claude 的 handoff、下一階段套入說明與母包鏡像 manifest。
- 未修改 Claude 的遊戲規則、模擬、數值、RNG、存檔語意、整合 HTML 或 20 檔模組內容。

## 二、正式 Theme pack

### 可直接匯入版本

`v50_art_assets.zip/theme_pack/v50_official_brand_theme_v01.json`

- 20 個 `teams.T0`～`teams.T19` 全部存在。
- 每隊 `logo` 使用 128×128 PNG data URI。
- JSON 單檔即可由 V50 主題設定頁匯入。
- 不依賴圖片相對路徑或外部網路。

### Claude 開發路徑版本

`v50_art_assets.zip/theme_pack/v50_official_brand_theme_paths_v01.json`

- 以美術素材 ZIP 根目錄為解析基準。
- 20 個 logo 指向 `production_assets/teams/TN/logo_128.png`。
- 供 Claude 檢查、建置或轉換，不建議脫離素材目錄單獨匯入。

## 三、20 隊正式映射

| teamId | 正式隊名 | brandKey | 主色 | 輔色 |
|---|---|---|---|---|
| T0 | 靖安盾衛 | jingan_guardians | #1B3A6B | #C0C0C0 |
| T1 | 臨海獵鯊 | linhai_sharks | #005F73 | #0A9396 |
| T2 | 曲江水牛 | qujiang_buffalo | #6B4226 | #D4A373 |
| T3 | 永昌雄獅 | yongchang_lions | #B8860B | #1C1C1C |
| T4 | 明陽烈焰 | mingyang_blaze | #CC3311 | #FF8800 |
| T5 | 天啟鷹 | tianqi_eagles | #2E4057 | #D4AF37 |
| T6 | 龍城雲豹 | longcheng_leopards | #4A4A4A | #E8C547 |
| T7 | 星野銀狐 | xingye_foxes | #708090 | #C0C0C0 |
| T8 | 雲夢白鷺 | yunmeng_egrets | #F0F0F0 | #4682B4 |
| T9 | 東寧豹 | dongning_leopards | #1C1C1C | #D4A017 |
| T10 | 嘉禾金穗 | jiahe_harvest | #DAA520 | #228B22 |
| T11 | 瑞港海豚 | ruigang_dolphins | #0077B6 | #48CAE4 |
| T12 | 金川礦工 | jinchuan_miners | #5C4033 | #E8A838 |
| T13 | 玄武黑熊 | xuanwu_bears | #1C1C1C | #4B5320 |
| T14 | 朝陽赤鷹 | chaoyang_redhawks | #B22222 | #FFD700 |
| T15 | 鳳鳴紅雀 | fengming_redbirds | #C41E3A | #FFFACD |
| T16 | 銀灘破浪 | yintan_breakers | #006994 | #F5F5DC |
| T17 | 青川山羌 | qingchuan_serows | #2D6A4F | #B7E4C7 |
| T18 | 望海白鯨 | wanghai_whales | #E8E8E8 | #1E3A5F |
| T19 | 磐石鐵衛 | panshi_ironguard | #36454F | #A9A9A9 |

色票權威來源為 V50 `TEAM_DEFS`。v491 美術 manifest 的早期色票保留作歷史紀錄，不覆蓋 V50。

## 四、未完成內容不得誤填

本輪沒有把以下欄位寫進正式 Theme pack：

- `capMark`
- `homeUniform`
- `awayUniform`

原因：

- 現有 `cap_mark_reference_256.png` 只是參考，不是完整帽子透明圖層。
- 正式主場與客場球衣透明層尚未製作。
- 肖像零件庫尚未完成。

## 五、驗證結果

- 20 隊數量：20/20。
- 來源隊徽尺寸：20/20 均為 128×128。
- 內嵌 data URI 與來源 PNG 位元比對：20/20 相同。
- 結構、色票、映射與未完成欄位檢查：303/303 通過。
- V50 `validateThemePack()`：`valid=true`、0 warnings。
- 原母包美術檔案保留：138/138，遺失 0。
- V50 遊戲模組：未修改。

## 六、開新對話使用

開新對話時請附上本輪完整交付 ZIP，並把以下內容貼給新的 AI：

```markdown
這是《決勝GM》V50 Codex 正式品牌 Theme pack v01。

請先完整解壓交付 ZIP。Claude 原始 V50 的 9 個外層檔案全部保留；20 檔模組版沒有刪減。Codex 本輪只在完整美術素材 ZIP 中加入正式 Theme pack、manifest、README、建置與驗證工具，並新增 Codex 摘要、Claude handoff、下一階段文件。

已完成：
- 20 隊既有 128px 隊徽全部映射。
- 主輔色以 V50 TEAM_DEFS 為權威。
- 可直接匯入的 data URI 單檔 Theme pack 已完成。
- 303/303 結構與素材驗證通過。
- V50 validateThemePack() 為 valid=true、0 warnings。

尚未完成：
- 正式 capMark。
- 20 隊 homeUniform／awayUniform。
- 肖像零件庫。

請勿把 cap_mark_reference_256.png 當成正式 capMark，也不要宣稱球衣或肖像已完成。
```
