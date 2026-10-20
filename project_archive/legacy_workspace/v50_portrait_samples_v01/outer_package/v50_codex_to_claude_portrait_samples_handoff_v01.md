# 《決勝GM》V50 Codex → Claude T0–T4 肖像樣板交接 v01

> 日期：2026-07-26  
> 狀態：候選樣板已完成並通過自動驗證，等待 Mars 視覺確認。

## Claude 請檢查

1. 新版 Theme pack 可否維持 `valid=true`、0 warnings。
2. T0–T4 的 `capMark`、`homeUniform`、`awayUniform` data URI 是否能在實際遊戲渲染。
3. 主場與客場 context 是否按 `isAway` 正確切換。
4. 匯入、儲存與重開後是否仍保留新版 Theme pack。

## 本輪內容

- T0–T4：5 隊 × 3 層＝15 張 256px 透明 PNG。
- 每張另外提供 128px 與 64px，共 30 張縮圖。
- 新版 Theme pack：
  `theme_pack/v50_official_brand_theme_v02_t0_t4_portrait_samples.json`
- 路徑版 Theme pack：
  `theme_pack/v50_official_brand_theme_paths_v02_t0_t4_portrait_samples.json`

## 已執行驗證

- 資產尺寸、Alpha、錨點、安全區與縮圖：150/150。
- Theme pack 欄位與遊戲驗證：80/80。
- `validateThemePack()`：valid=true，0 warnings。
- 回歸：1150/0。
- 一般模式 15 年 smoke：全部通過。
- 純 GM 15 年 smoke：全部通過。

## 程式修改

- 無。
- `50_baseball_gm.html` 未修改。
- `50_baseball_gm_modular.zip` 未修改，仍為 20 檔。

## Claude 不要做的事

- 不要把 T0–T4 寫成已經 Mars 核准。
- 不要補入 T5–T19 的空欄位或 null；未完成隊伍繼續省略選填欄位。
- 不要改遊戲規則或肖像 z-order，除非實測確認根因在程式。
- 不要刪除 Claude→Codex 與 Codex→Claude 的歷史 handoff。

## 若發現問題

請回報：

1. 根因。
2. 影響檔案與隊伍。
3. 是否為素材、Theme pack、渲染器或持久化問題。
4. 向後相容策略。
5. 建議測試。

Mars 視覺核准後，Codex 下一步才是 T5–T19。
