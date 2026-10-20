# 《決勝GM》V50 Codex → Claude 正式品牌 Theme pack 交接 v01

> 日期：2026-07-25  
> 對象：Claude  
> 狀態：20 隊隊徽與 V50 正式色票映射已完成，可進入 Claude 檢查／套入階段。

## Claude 請先檢查

1. 解壓本輪完整交付 ZIP，確認 Claude 原始外層 9 檔全部存在。
2. 解壓 `v50_art_assets.zip`。
3. 檢查：
   - `theme_pack/v50_official_brand_theme_v01.json`
   - `theme_pack/v50_official_brand_theme_paths_v01.json`
   - `docs/v50_official_brand_theme_manifest_v01.json`
   - `docs/v50_official_brand_theme_validation_v01.json`
   - `docs/v50_official_brand_theme_game_validation_v01.json`
4. 使用 V50 主題設定頁匯入 `v50_official_brand_theme_v01.json`，確認 20 隊隊徽與色彩顯示。

## 本輪接口使用

每隊只填入：

```javascript
{
  logo: "data:image/png;base64,...",
  primaryColor: "#......",
  secondaryColor: "#......",
  shortName: "...",
  brandKey: "..."
}
```

沒有填入：

```javascript
{
  capMark: null,
  homeUniform: null,
  awayUniform: null
}
```

正式 JSON 直接省略未完成欄位，避免主題包宣稱不存在的資產。

## 驗證

- `node tools/build_v50_official_brand_theme_v01.mjs`
- `node tools/validate_v50_official_brand_theme_v01.mjs`
- `node tools/validate_v50_theme_against_game_v01.mjs <path-to-00-theme.js>`

結果：

- 303/303 通過。
- `validateThemePack()`：valid。
- warnings：0。

## 請 Claude 不要做的事

- 不要把 `cap_mark_reference_256.png` 填入 `capMark`。
- 不要把概念板裁切圖當正式球衣透明層。
- 不要用 v491 早期色票覆蓋 V50 `TEAM_DEFS` 色票。
- 不要刪除本輪完整母包中的任何原檔。

## 建議套入方式

目前建議先維持「使用者從主題設定頁匯入正式 JSON」：

- 不需要修改 V50 遊戲規則或存檔。
- 可獨立驗證資產映射。
- 待 Mars 真機確認 20 隊隊徽與色彩後，再由 Claude決定是否把此 Theme pack 設成內建官方預設。

若 Claude 要把 Theme pack 內建為預設，請先提出實作方式與對離線 HTML、模組版、IndexedDB／localStorage 遷移的影響，等 Mars 確認後再修改程式。
