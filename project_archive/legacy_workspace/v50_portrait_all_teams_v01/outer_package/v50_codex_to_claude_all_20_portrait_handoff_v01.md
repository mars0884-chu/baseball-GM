# 《決勝GM》V50 Codex → Claude 全 20 隊肖像圖層交接 v01

> 日期：2026-07-26  
> 狀態：T0–T4 已獲 Mars 樣板核准；T5–T19 候選素材完成，等待 Mars 視覺確認。

## Claude 請檢查

1. 全 20 隊 Theme pack 是否維持 `valid=true`、0 warnings。
2. 20 隊 capMark/homeUniform/awayUniform 是否能在遊戲渲染。
3. `isAway` 是否正確切換主客場球衣。
4. Theme pack 匯入、持久化與重開恢復。

## 本輪內容

- 全 20 隊共 60 張 256px 透明肖像隊伍圖層。
- 另有 120 張 128/64px 縮圖。
- 全 20 隊 Theme pack：
  `theme_pack/v50_official_brand_theme_v03_all_20_portrait_layers.json`
- 路徑版：
  `theme_pack/v50_official_brand_theme_paths_v03_all_20_portrait_layers.json`

## 已執行驗證

- 資產、縮圖與 80 組合成案例：1100/1100。
- Theme pack：125/125。
- `validateThemePack()`：valid=true、0 warnings。
- 回歸：1150/0。
- 兩組 15 年 smoke：全部通過。

## 程式修改

- 無。
- 整合 HTML 未修改。
- 20 檔模組 ZIP 未修改。

## Claude 不要做的事

- 不要把 T5–T19 寫成已獲 Mars 視覺核准。
- 不要改 TEAM_DEFS 色票來追隨素材顏色；UI 色票與美術概念板各有權威來源。
- 不要修改 z-order、錨點或遊戲規則，除非實測證明根因在程式。
- 不要刪除任何歷史 handoff 或母包檔案。

## 問題回報格式

- 根因。
- 影響隊伍與檔案。
- 素材／Theme pack／渲染／持久化中的責任層。
- 向後相容策略。
- 測試計畫。
