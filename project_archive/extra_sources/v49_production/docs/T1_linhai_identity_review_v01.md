# T1「臨海獵鯊」第一輪視覺驗證

> 日期：2026-07-24  
> 用途：驗證 v49 的隊徽、帽徽、三套球衣與小尺寸圖示語言。  
> 狀態：概念提案，尚未綁定正式 `teamId`。

## 產出

- `previews/T1_linhai_harbor_sharks_identity_board_v01.png`
- `previews/T1_primary_emblem_variants_v02.png`
- `previews/T1_emblem_variant_A_64px.png`
- `previews/T1_emblem_variant_B_64px.png`
- `previews/T1_emblem_variant_C_64px.png`

## 64px 驗證結果

| 方案 | 判定 | 說明 |
|---|---|---|
| A｜鯊魚＋浪＋燈塔盾徽 | 建議作主隊徽 | 64px 仍可辨認鯊魚與燈塔，地方性最強；正式向量化時再減少牙齒與浪花節點 |
| B｜鯊鰭＋浪圓徽 | 建議作帽徽／小圖示 | 最清楚、最適合 24～32px，但單獨作主徽章時品牌故事較弱 |
| C｜全身鯊＋防波堤盾徽 | 暫不採用 | 動勢強，但小尺寸時魚身、防波堤與浪花互相競爭 |

## 建議組合

- 主隊徽：A。
- 帽徽與 24～32px 圖示：B。
- 主場球衣：白底、深海軍藍滾邊。
- 客場球衣：淺藍灰底、深海軍藍字框。
- 城市版：深海軍藍底、亮青港口剪影。

## 下一輪修正

1. 將 A 方案向量化，限制為深海軍藍、亮青、白與一個珊瑚紅燈點。
2. 移除過細牙齒與多餘浪花節點。
3. 以 B 方案建立獨立帽徽。
4. 吉祥物調整為正式 1.5 頭身：頭部約佔全身 65%，只露手套與短鞋。
5. 待 `capMark` 契約確認後，再切正式帽子透明圖層。

## 生成方式

- 使用 Codex 內建 imagegen。
- 風格參考：
  - `formal_overview_v03/01_CANONICAL_character_ui_reference.png`
  - `formal_overview_v03/03_asset_language_final_review.png`
- 未使用外部 API 金鑰。
