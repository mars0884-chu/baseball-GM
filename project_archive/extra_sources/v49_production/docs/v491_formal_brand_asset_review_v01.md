# 《決勝GM》v491｜20 隊正式品牌素材階段檢查

> 日期：2026-07-25  
> 範圍：`T0`～`T19`  
> 結論：20 隊主隊徽、帽徽／帽型參考與色票已完成透明化；肖像合成用帽子、主場球衣、客場球衣仍等待 Claude 確認介面。

## 已完成

- 20 隊主隊徽：
  - `logo_512.png`
  - `logo_128.png`
  - `logo_64.png`
  - `logo_32.png`
- 20 隊 `cap_mark_reference_256.png`，用途是視覺參考，不宣稱符合目前 `capMark` 程式契約。
- 每隊主色與輔色已用固定 `teamId` 寫入清單。
- 所有輸出為透明 PNG。
- 抽取工具會移除概念板背景，並只保留最大的完整圖形元件，避免混入下方帽子或球衣碎片。
- 已建立全聯盟透明素材 QA 總覽與機器驗證報告。

總數：

- 20 隊。
- 每隊 5 張透明素材。
- 共 100 張 PNG。

## 驗證結果

`docs/v491_all_brand_asset_validation_v01.json` 結果為 `pass`，檢查：

- `T0`～`T19` 順序與數量。
- PNG 尺寸。
- 非空透明遮罩。
- 四邊均保留透明安全距離。
- 已取消的 `cityUniform` 保持 `null`。

目視 QA：

- `previews/v491_all_20_transparent_asset_qa_v01.png`

## 可交給 Claude 的內容

- `logo`
- `primaryColor`
- `secondaryColor`
- 固定 `teamId → 正式隊名`
- `capMarkReference` 僅供帽子正式層製作參考

資料清單：

- `docs/v491_all_brand_asset_manifest_v01.json`

## 目前不可假裝完成的內容

- `capMark`
- `homeUniform`
- `awayUniform`

原因不是美術方向未定，而是現行 `compositePortrait()` 將相關欄位當作完整方形肖像覆蓋層；目前尚無正式母版畫布、頭部／臉心／領口錨點及確認過的疊放順序。

## 球衣規則

- 每隊只製作兩套：白色系主場＋球隊主色系客場。
- 灰色取消。
- 不製作第三套城市版。
- `cityUniform` 保持 `null`，由 Claude 決定程式回退策略。

## 下一個完成門檻

Claude 回覆並落實以下契約後，Codex 才能製作不會錯位的正式肖像層：

1. `capMark` 是完整帽子透明層，或拆成 `capBase`＋帽徽。
2. 肖像母版尺寸。
3. 頭頂、臉心、領口錨點與安全區。
4. 正式 z-order。
5. `cityUniform: null` 的回退行為。

