# 《決勝GM》V50 Codex 肖像樣板脈絡還原摘要 v01

> 本文件是本包最新、可在全新對話獨立使用的脈絡摘要。  
> 開新對話時，請貼上以下整段內容，並同時附上最新版完整 ZIP。

```markdown
# 《決勝GM》V50 專案脈絡還原：T0–T4 肖像隊伍圖層候選樣板

## 1. 專案與版本

- 專案：《決勝GM》
- 遊戲程式基線：V50
- 本輪美術版本：v50-codex-t0-t4-portrait-samples-v01
- 日期：2026-07-26
- 本輪定位：依 Claude 驗證後 handoff，製作 T0–T4 的 capMark、homeUniform、awayUniform 候選樣板。

## 2. 遊戲架構

- 瀏覽器單機棒球 GM 遊戲。
- 交付同時保留整合單檔 HTML 與恰好 20 檔模組版。
- 主題／肖像接口由 `00-theme.js` 管理。
- 肖像疊放順序：skin → face → eyes → nose → uniform → hair → beard → cap。

## 3. Claude 原始提供與確認的內容

- Claude 提供並維護全部遊戲程式碼、回歸測試與 smoke 測試。
- Claude 修正後母包共有 15 個外層項目，SHA-256：
  `0539B9F1E8ECAD68EC2998114BBD9A9ADBA94F2454F0544A5CA743E92EA49261`。
- Claude 已確認 V50 品牌 Theme pack v01：20 隊 logo 與色票正確、valid=true、0 warnings。
- Claude 已確認下一階段應先完成 T0–T4 三類肖像隊伍圖層，Mars 確認後才製作 T5–T19。
- 遊戲程式碼本輪不需修改。

## 4. Codex 本輪新增、修改、確認與推論

- 新增 T0–T4 共 15 張 256×256 透明 PNG：
  - 每隊 1 張完整帽子 `capMark`
  - 每隊 1 張白色系主場 `homeUniform`
  - 每隊 1 張主色系客場 `awayUniform`
- 每張另產出 128px 與 64px 縮圖，共 30 張。
- T0 使用獨立 imagegen 樣板；T1 建立一致的帽子／球衣母版；T1–T4 以同一母版、各隊正式徽記與色票產生可重現變體。
- 正式徽記來自母包既有 `production_assets/teams/T0..T4`，不是重新發明的隊徽。
- 新增 V50 Theme pack v02，僅 T0–T4 加入 capMark/homeUniform/awayUniform；T5–T19 繼續省略未完成欄位。
- 未修改任何遊戲程式、遊戲規則或 20 檔模組版。

## 5. 肖像規格與固定決策

- 母版：256×256 透明 PNG。
- headTop：(128, 26)。
- faceCenter：(128, 97)。
- neckline：(128, 184)。
- 帽子內容頂端對齊 y=26。
- 球衣內容頂端對齊 y=184。
- 四角透明；左右至少保留 8px 安全區。
- capMark 是帽身、帽簷、帽徽一體的完整帽子，不能用舊 cap_mark_reference 直接冒充。
- 正式球衣只有 homeUniform 與 awayUniform；cityUniform 已停用。

## 6. 已完成內容

- T0 靖安：capMark、homeUniform、awayUniform。
- T1 臨海：capMark、homeUniform、awayUniform。
- T2 曲江：capMark、homeUniform、awayUniform。
- T3 永昌：capMark、homeUniform、awayUniform。
- T4 明陽：capMark、homeUniform、awayUniform。
- 五隊各有 4 種遮擋測試組合，涵蓋 2 種臉型、2 種髮型、2 種膚色與主／客場。
- 新增完整資產 contact sheet 與每隊肖像驗證 contact sheet。

## 7. 驗證結果

- 肖像資產規格：150/150 通過。
- Theme pack T0–T4：80/80 通過。
- 遊戲 `validateThemePack()`：valid=true、0 warnings、0 console warnings。
- 完整回歸：1150 通過 / 0 失敗。
- 一般模式 15 年 smoke：全部通過。
- 純 GM 模式 15 年 smoke：全部通過。
- 模組 ZIP：恰好 20 檔，未修改。

## 8. 目前狀態與風險

- T0–T4 是「候選樣板」，尚待 Mars 視覺確認，不可寫成已核准量產。
- 64px 可辨識度已做縮圖與合成測試，但仍需 Mars 在實際遊戲畫面、實際顯示器上確認。
- 真機匯入、持久化與重開恢復尚未由 Mars 操作驗證。
- T1–T4 採共用母版維持一致性；若 Mars 希望各隊帽型或剪裁更具差異，應先在本批提出，再擴至 T5–T19。

## 9. 尚未完成

- Mars 視覺核准 T0–T4。
- T5–T19 共 15 隊的 capMark/homeUniform/awayUniform。
- 通用肖像臉型、眼、鼻、髮型、鬍型等正式零件。
- 20 架空國旗與真實國旗正式版。
- 97 個語意圖示正式版。
- 六大畫面背景、按鍵、卡片、雷達圖與事件素材。
- 原 V50 完整待辦清單中的遊戲調校、真機驗證與 backlog。

## 10. 角色邊界

- Mars：設計總監、視覺核准、真機測試與最終拍板。
- Claude：唯一遊戲工程師；只有發現接口或程式缺陷時才改程式。
- Codex：美術素材、Theme pack、驗證、封裝與交接；不改遊戲規則。

## 11. 最新檔案使用方式

1. 上傳本輪完整交付 ZIP。
2. 以本摘要為最新狀態，不以包內保留的舊歷史摘要判斷目前美術進度。
3. 先查看美術素材 ZIP 內：
   - `previews/v50_T0_T4_portrait_asset_contact_sheet_v01.png`
   - `previews/v50_T0_portrait_validation_contact_sheet_v01.png` 至 T4
4. 檢查 Theme pack：
   - `theme_pack/v50_official_brand_theme_v02_t0_t4_portrait_samples.json`
5. Mars 核准後，才以同規格開始 T5–T19。

## 12. 不得遺失的母包規則

- Claude 修正母包原 15 個外層項目必須全部保留。
- 原 20 檔模組 ZIP 必須仍恰好 20 檔。
- 美術素材 ZIP 必須保留原 147 檔，再加入本輪內容。
- Claude→Codex 與 Codex→Claude handoff 都要保留。
- 每次新交付都必須是可獨立使用的完整 ZIP，不能只交差異檔。
```
