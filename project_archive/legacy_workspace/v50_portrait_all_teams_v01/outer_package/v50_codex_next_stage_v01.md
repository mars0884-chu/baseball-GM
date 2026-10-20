# 《決勝GM》V50 Codex 下一階段說明 v01

## 建議下一階段

先製作 T0～T4 的正式肖像隊伍圖層樣板：

- 完整帽子 `capMark`：256×256 透明 PNG。
- 白色系主場球衣 `homeUniform`：256×256 透明 PNG。
- 球隊主色系客場球衣 `awayUniform`：256×256 透明 PNG。

## 驗收要求

- 使用 V50 `PORTRAIT_SPEC` 三錨點。
- z-order：`skin → face → eyes → nose → uniform → hair → beard → cap`。
- 至少使用兩種臉型、兩種髮型、兩種膚色測試遮擋。
- 64px 與 128px 輸出都需檢查安全區與辨識度。
- `cap_mark_reference_256.png` 只能當設計參考，不可直接交付為 `capMark`。
- T0～T4 樣板經 Mars 確認後，才批次製作 T5～T19。

## Claude 下一步可能需要配合

目前不需要 Claude 修改程式。只有在真機匯入正式品牌 Theme pack 後發現以下問題時才提出修改：

- 隊徽在特定尺寸裁切或失真。
- 淺色隊徽在淺色背景缺乏對比。
- 隊色 CSS 變數未套用到預期 UI。
- 主題包匯入、持久化或重開機恢復異常。

如需修改，請先提供根因、影響檔案、向後相容策略與測試計畫，不要直接改遊戲規則。
