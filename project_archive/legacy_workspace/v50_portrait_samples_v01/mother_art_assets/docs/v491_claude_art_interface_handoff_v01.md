# 給 Claude 的交接摘要｜《決勝GM》v491 球隊美術接口

> 日期：2026-07-25  
> 目的：請先確認／修正肖像圖層契約，再讓 Codex 繼續製作 20 隊正式帽子與兩套球衣層。

## Claude 原本內容摘要

- v491 已把球隊改為固定 `T0`～`T19` 與固定正式隊名。
- 玩家改為從固定 20 隊選隊，原本隊名隨機與 T0 自訂名稱造成的資產錯配已解決。
- `00-theme.js` 的球隊介面位於 `teams.T0`～`teams.T19`。
- 現有欄位為：
  - `logo`
  - `capMark`
  - `primaryColor`
  - `secondaryColor`
  - `homeUniform`
  - `awayUniform`
  - `cityUniform`
- `compositePortrait()` 目前把 `capMark` 與 `homeUniform` 當作完整方形圖層，以全畫布覆蓋方式疊在人物肖像上。

## Codex 已新增／完成

- 20/20 隊兩套球衣品牌概念板。
- 球衣規則已固定：
  - 主場白色系。
  - 客場球隊主色系。
  - 灰色取消。
  - 不做第三套城市版。
- 20 隊正式透明主隊徽：
  - 512px、128px、64px、32px。
- 20 隊透明 `capMarkReference`：
  - 部分是獨立帽徽。
  - T6、T16、T19 等概念板提供的是完整帽型參考。
  - 這些檔案刻意不直接填入 `capMark`，避免誤用。
- 20 隊色票與固定 `teamId` 清單。
- 100 張 PNG 已通過尺寸、透明遮罩、安全邊距與數量驗證。

## 請 Claude 先處理／回覆

### 1. 定義 `capMark`

請二選一並固定：

- A：`capMark` 明確定義為完整帽子透明圖層。
- B：拆成 `capBase`＋`capInsignia`，並提供帽徽定位框。

若維持 A，建議欄位改名或至少在 schema／註解寫明它不是單獨帽徽。

### 2. 固定肖像母版

請提供：

- 母版畫布尺寸，建議 256×256。
- 頭頂錨點。
- 臉部中心。
- 帽沿基準線。
- 領口中心與領口寬度。
- 64px／128px 縮圖安全區。

### 3. 固定疊放順序

目前順序：

`skin → face → eyes → nose → hair → beard → cap → uniform`

請確認球衣最後疊放是否符合預期；若否，讓 `rendererConfig.layerOrder` 正式生效或直接修正順序。

### 4. 兩套球衣與回退

- 正式資產只提供 `homeUniform` 與 `awayUniform`。
- `cityUniform` 必須為 `null`、省略，或回退到 `awayUniform`；請選定正式行為。
- 請確認遊戲實際會依主客場切換 `homeUniform`／`awayUniform`，而不是永遠只讀 `homeUniform`。

### 5. Schema 與錯誤回報

請讓主題包載入時至少驗證：

- `teamId`
- 圖層欄位名稱
- 圖片 URI／路徑
- 必填尺寸或版號

## 已可直接使用的映射

來源：

- `v49_production/docs/v491_all_brand_asset_manifest_v01.json`

可以使用：

- `teams.T0`～`teams.T19`
- `logo`
- `primaryColor`
- `secondaryColor`

暫時保持 `null`：

- `capMark`
- `homeUniform`
- `awayUniform`
- `cityUniform`

`capMarkReference` 是交接輔助欄位，不是目前正式 theme schema 欄位。

## 驗證與預覽

- 機器驗證：`v49_production/docs/v491_all_brand_asset_validation_v01.json`
- 透明素材總覽：`v49_production/previews/v491_all_20_transparent_asset_qa_v01.png`
- 接口缺口原始盤點：`v49_production/docs/v49_art_interface_gap_audit.md`

## Claude 回覆後的 Codex 下一步

1. 建立正式肖像母版與定位測試圖。
2. 先完成 T0～T4 的完整帽子、主場與客場圖層。
3. 用至少兩種臉型、髮型與膚色測試 z-order 與遮擋。
4. 樣板通過後批次完成 T5～T19。
5. 最終依 `v491_delivery.zip` 規格交付整合單檔、20 檔模組版、開新對話脈絡還原摘要及 Claude 交接摘要。

