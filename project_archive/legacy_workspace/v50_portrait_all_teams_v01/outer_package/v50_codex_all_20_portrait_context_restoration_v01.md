# 《決勝GM》V50 全 20 隊肖像圖層脈絡還原摘要 v01

> 本文件是本包最新、可在全新對話獨立使用的脈絡摘要。  
> 開新對話時，請貼上以下整段內容，並同時附上最新版完整 ZIP。

```markdown
# 《決勝GM》V50 全 20 隊肖像隊伍圖層脈絡還原

## 1. 專案與版本

- 專案：《決勝GM》
- 遊戲基線：V50
- 美術版本：v50-codex-all-20-portrait-layers-v01
- 日期：2026-07-26
- 本輪成果：完成 T0–T19 全 20 隊的 capMark、homeUniform、awayUniform。

## 2. 架構與固定接口

- 瀏覽器單機棒球 GM 遊戲。
- 保留整合單檔 HTML 與恰好 20 檔模組版。
- 主題／肖像接口位於 `00-theme.js`。
- z-order：skin → face → eyes → nose → uniform → hair → beard → cap。
- 母版：256×256 透明 PNG。
- 輸出：128px、64px。
- 錨點：headTop=(128,26)、faceCenter=(128,97)、neckline=(128,184)。
- 正式球衣只有 homeUniform 與 awayUniform；cityUniform 已停用。

## 3. Claude 原始提供與確認的內容

- Claude 維護全部遊戲程式碼、回歸與 smoke 測試。
- Claude 已確認 V50 品牌 Theme pack v01 的 20 隊 logo、色票與接口。
- Claude 已確認先做 T0–T4 樣板，Mars 核准後再批次製作 T5–T19。
- 本輪未修改任何遊戲程式。

## 4. Codex 本輪新增、修改、確認與推論

- T0–T4 樣板已由 Mars 回覆「可以」，視為樣板規格核准。
- 依核准母版擴充 T5–T19。
- 全 20 隊共 60 張 256px 透明 PNG：
  - 20 張完整帽子 capMark
  - 20 張白色系主場 homeUniform
  - 20 張品牌客場 awayUniform
- 另產出 120 張 128/64px 縮圖。
- 20 隊各有 4 種合成案例，共 80 組，涵蓋兩臉型、兩髮型、兩膚色、主客場。
- 新增全 20 隊 Theme pack v03。
- T5–T19 尚待 Mars 視覺核准；不能寫成已正式核准。

## 5. 美術產製方法

- T0 使用 imagegen 個別樣板。
- T1 建立共用帽子／球衣母版。
- T0–T4 核准後，T5–T19 使用同一母版做確定性隊色重繪。
- 每隊徽記取自既有正式 cap_mark_reference 或 logo，不重新發明。
- 帽子與球衣素材色以品牌概念板為美術權威。
- Theme pack 的 primaryColor/secondaryColor 保留 TEAM_DEFS UI 色票，不因素材色調而變更。

## 6. 完成清單

- T0 靖安、T1 臨海、T2 曲江、T3 永昌、T4 明陽：已獲 Mars 樣板核准。
- T5 天啟、T6 龍城、T7 星野、T8 雲夢、T9 東寧。
- T10 嘉禾、T11 瑞港、T12 金川、T13 玄武、T14 朝陽。
- T15 鳳鳴、T16 銀灘、T17 青川、T18 望海、T19 磐石。
- T5–T19 已完成候選素材，待 Mars 視覺核准。

## 7. 驗證結果

- 20 隊資產與合成規格：1100/1100。
- 全 20 隊 Theme pack：125/125。
- validateThemePack()：valid=true、0 warnings、0 console warnings。
- 完整回歸：1150 通過 / 0 失敗。
- 一般模式 15 年 smoke：全部通過。
- 純 GM 模式 15 年 smoke：全部通過。
- 模組 ZIP：恰好 20 檔且未修改。

## 8. 目前風險與待確認

- T5–T19 尚待 Mars 在 contact sheet 與實際遊戲 UI 視覺確認。
- 真機 Theme pack 匯入、持久化、重開恢復仍待 Mars 操作。
- 64px 已自動產出並合成檢查，但最終可讀性仍需真實裝置確認。
- 若個別隊需要獨特帽型或球衣剪裁，應在本批回饋，不應直接改共用錨點。

## 9. 仍未完成

- Mars 視覺核准 T5–T19。
- 通用肖像臉型、眼、鼻、髮型、鬍型等正式零件。
- 20 架空國旗與真實國旗正式版。
- 97 個語意圖示正式版。
- 六大畫面背景、按鍵、卡片、雷達圖與事件素材。
- V50 原始待辦中的遊戲調校、真機驗證與 backlog。

## 10. 角色邊界

- Mars：設計總監、視覺核准、真機測試、最終拍板。
- Claude：唯一遊戲工程師；只有確認程式根因時修改程式。
- Codex：美術素材、Theme pack、驗證、封裝與交接；不改遊戲規則。

## 11. 最新檔案

- 完整 Theme pack：
  `theme_pack/v50_official_brand_theme_v03_all_20_portrait_layers.json`
- 路徑版 Theme pack：
  `theme_pack/v50_official_brand_theme_paths_v03_all_20_portrait_layers.json`
- 60 張主素材：
  `production_assets/teams/T0..T19/*_256_v01.png`
- 20 隊素材總覽：
  `previews/v50_all_20_portrait_assets_contact_sheet_v01.png`
- 20 隊合成總覽：
  `previews/v50_all_20_portrait_composites_contact_sheet_v01.png`
- 產製方法：
  `docs/v50_portrait_generation_method_v01.md`

## 12. 新對話恢復方式

1. 上傳本輪最新完整交付 ZIP。
2. 貼上本摘要整段 fenced Markdown。
3. 以本文件為最新狀態；舊摘要保留是因母包不可刪減。
4. 先查看兩張全 20 隊 contact sheet。
5. Mars 核准 T5–T19 後，再進入通用臉型／髮型等肖像零件。

## 13. 母包不可刪減規則

- 上一個完整交付包的 19 個外層項目必須全部保留。
- 20 檔模組 ZIP 必須仍恰好 20 檔。
- 上一版美術 ZIP 的 209 檔必須全部保留。
- 雙向 handoff 與歷史摘要不得刪除。
- 每次交付都必須是可獨立使用的完整 ZIP。
```
