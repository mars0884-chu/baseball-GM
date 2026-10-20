# V50 Official Brand Theme v01

## 用途

本批次把既有 20 隊正式隊徽與 V50 `TEAM_DEFS` 已定案的主輔色映射成可匯入主題包。

## 可直接匯入版本

`theme_pack/v50_official_brand_theme_v01.json`

- 20 個 `logo` 全部使用內嵌 PNG data URI。
- JSON 單檔即可由遊戲主題設定頁匯入。
- 不依賴解壓後的圖片相對路徑。

## 開發路徑版本

`theme_pack/v50_official_brand_theme_paths_v01.json`

- 圖片路徑以 `v50_art_assets.zip` 根目錄為基準。
- 供 Claude 檢查映射、後續建置或轉換使用。
- 不能脫離完整美術素材目錄單獨使用。

## 本輪已映射

- `teams.T0`～`teams.T19`
- `logo`
- `primaryColor`
- `secondaryColor`
- `shortName`
- `brandKey`

色票權威來源是 V50 `TEAM_DEFS`，不是 v491 歷史美術 manifest 的早期色票。

## 本輪刻意不映射

- `capMark`
- `homeUniform`
- `awayUniform`

現有 `cap_mark_reference_256.png` 只是帽型／帽徽參考，不能冒充正式完整帽子圖層。正式主客場球衣圖層也尚未完成。

## 重建與驗證

```powershell
node tools/build_v50_official_brand_theme_v01.mjs
node tools/validate_v50_official_brand_theme_v01.mjs
```

驗證器會確認：

- 恰好 20 隊。
- 20 個 data URI 均與來源 `logo_128.png` 位元一致。
- 色票、簡稱與 `brandKey` 與正式 manifest 一致。
- 沒有誤填尚未完成的帽子或球衣欄位。
- 每張來源隊徽 SHA-256 與 manifest 一致。
