# v49 Imagegen Prompt Log v0.1

## T1 臨海獵鯊品牌板

Use case: stylized-concept  
Asset type: professional baseball team identity concept board for an in-game art review  
References: approved canonical chibi/UI image and approved baseball asset-language image.  
Request: Create one polished concept board for a fictional Asian professional baseball club themed around a coastal harbor and a fast shark, without words or letters. Show a shield-shaped primary emblem, simplified cap mark, circular secondary mark, white home uniform, pale blue-gray away uniform, dark navy/bright cyan city edition, and one 1.5-head-tall chibi mascot.  
Style: thick dark navy outlines, hard-edged cel shading, compact Japanese sports-game asset style, clear at small sizes.  
Palette: `#063B66`, `#20C6D7`, white, and a very small coral accent.  
Avoid: real-world marks, anchor, gradients inside the emblem, photorealism, fantasy magic, gore, watermark.

## T1 小尺寸隊徽三案

Use case: logo-brand  
Asset type: small-size professional baseball team emblem refinement sheet  
References: current T1 identity board and approved baseball asset-language image.  
Request: Simplify the primary shark emblem for 32–64px and create exactly three comparable variants: A shield with shark, wave and tiny lighthouse; B circle with shark fin and wave; C compact shield with full shark and geometric breakwater.  
Style: bold flat shapes, very thick navy stroke, vector-friendly, professional Asian baseball merchandising.  
Palette: `#063B66`, `#20C6D7`, white, at most one coral accent.  
Avoid: text, letters, numbers, real-world marks, anchor, crane, detailed skyline, thin lines, gradients and watermark.

## Execution

- Mode: Codex built-in imagegen.
- No external API key.
- Generated results were copied into `v49_production/previews/`.

## T10 嘉禾金穗品牌板

Use case: logo-brand  
Asset type: professional baseball team identity concept board for an in-game art review  
References: approved canonical chibi/UI image, approved baseball asset-language image, and existing T1 identity board.  
Request: Create one polished identity board for T10 嘉禾金穗 without text, letters or numbers. Show a shield-shaped primary emblem combining a bold golden rice ear with baseball seam or home-plate geometry, simplified cap mark, circular secondary mark, white home uniform, warm light-gray away uniform, deep agricultural-green city edition, and one 1.5-head-tall chibi player.  
Style: thick dark outlines, hard-edged two-step cel shading, compact Japanese sports-game asset style, readable at 32–64px.  
Palette: `#2F6B3C`, `#E9B949`, white and `#102949`.  
Avoid: food-packaging appearance, farm tools, text, real-world marks, gradients, thin lines and watermark.

## T12 金川礦工品牌板

Use case: logo-brand  
Asset type: professional baseball team identity concept board for an in-game art review  
References: approved canonical chibi/UI image, approved baseball asset-language image, and existing T1 identity board.  
Request: Create one polished identity board for T12 金川礦工 without text, letters or numbers. Show a shield-shaped primary emblem combining a miner lamp with compact gear, mountain and rail geometry, simplified cap mark, circular secondary mark, white home uniform, steel-gray away uniform, charcoal city edition with safety-orange structural graphics, and one 1.5-head-tall chibi player.  
Style: thick dark outlines, hard-edged two-step cel shading, compact Japanese sports-game asset style, readable at 32–64px.  
Palette: `#343A40`, `#F28C28`, steel gray, white and `#102949`.  
Avoid: skulls, weapons, explosions, hazardous imagery, text, real-world marks, gradients, thin lines and watermark.

## 兩套球衣規格修正

2026-07-25 產品擁有者定案：所有球隊只保留兩套球衣，灰色球衣取消。

- 主場：白色系。
- 客場：球隊主色深色系，可保留原城市版地方圖樣。
- 不另設第三套城市版。

T1、T10、T12 均以 precise-object-edit 保留既有隊徽與角色，只移除灰色中間制服組並重排為四個全尺寸制服視圖（主場正／背、客場正／背）。現行檔案：

- `previews/T1_linhai_harbor_sharks_identity_board_v02_two_uniforms.png`
- `previews/T10_jiahe_golden_harvest_identity_board_v02_two_uniforms.png`
- `previews/T12_jinchuan_miners_identity_board_v02_two_uniforms.png`

## A1 第二批：T0／T2／T3／T4

共同規格：

- Use case: logo-brand
- Asset type: two-uniform professional baseball team identity concept board
- 參考：最高人物／UI參考、資產語言參考、T1 兩套球衣版面參考。
- 版面：上方主徽／帽徽／圓形副徽，下方主場正背＋客場正背，右下 1.5 頭身球員。
- 禁止：文字、字母、號碼、灰色球衣、第三套、真實球隊標誌、浮水印。

### T0 靖安盾衛

- 主題：城門、守備、盾形本壘板、團隊紀律。
- 配色：`#1769D2`、白、`#102949`，少量 `#59C78B`。
- 產物：`previews/T0_jingan_shield_guardians_identity_board_v01_two_uniforms.png`

### T2 曲江水牛

- 主題：水牛、曲江河道、梯田、沉穩力量。
- 配色：`#6B3F24`、`#E7B84B`，少量河青。
- 產物：`previews/T2_qujiang_water_buffalo_identity_board_v01_two_uniforms.png`

### T3 永昌雄獅

- 主題：雄獅、紅磚老街、地方傳統、勇氣。
- 配色：`#A6232B`、`#F2C14E`、白、`#102949`。
- 產物：`previews/T3_yongchang_lions_identity_board_v01_two_uniforms.png`

### T4 明陽烈焰

- 主題：日出、受控火焰、重砲、明亮能量。
- 配色：`#E0442E`、`#FFD166`、白、`#102949`。
- 執行紀錄：服務曾短暫出現三次網路錯誤，稍後無參考圖生成成功；再以最高人物參考進行 precise-object-edit，將右下人物修正為緊湊 1.5 頭身。
- 現行產物：`previews/T4_mingyang_blaze_identity_board_v02_chibi_fixed_two_uniforms.png`

## 其餘球隊概念板提示摘要

所有提示均沿用以下不變條件：內建 imagegen、logo-brand、三個品牌識別、兩套球衣正背、右下 1.5 頭身人物、禁止文字／灰色／第三套／真實球隊標誌／浮水印。

| teamId | 隊名 | 主題 | 配色 | 現行檔案 |
|---|---|---|---|---|
| T5 | 天啟鷹 | 山巔、鷹翼、速度與精準 | `#182B49` / `#D6A84B` | `previews/T5_tianqi_eagles_identity_board_v01_two_uniforms.png` |
| T6 | 龍城雲豹 | 霧山城市、雲豹、敏捷 | `#4A1F6F` / `#F0A34A` | `previews/T6_longcheng_clouded_leopards_identity_board_v01_two_uniforms.png` |
| T7 | 星野銀狐 | 夜野、銀狐、月牙 | `#293241` / `#C8D5E1` | `previews/T7_xingye_silver_foxes_identity_board_v01_two_uniforms.png` |
| T8 | 雲夢白鷺 | 濕地、白鷺、蘆葦 | `#2A7F62` / `#F6F1DF` | `previews/T8_yunmeng_egrets_identity_board_v01_two_uniforms.png` |
| T9 | 東寧豹 | 舊城牆、豹紋、加速 | `#C24A22` / `#172A3A` | `previews/T9_dongning_leopards_identity_board_v01_two_uniforms.png` |
| T11 | 瑞港海豚 | 商港、海豚、航道 | `#0077A8` / `#7EE0D6` | `previews/T11_ruigang_dolphins_identity_board_v01_two_uniforms.png` |
| T13 | 玄武黑熊 | 山林、黑熊、守護力量 | `#173D2B` / `#D9C7A2` | `previews/T13_xuanwu_black_bears_identity_board_v01_two_uniforms.png` |
| T14 | 朝陽赤鷹 | 朝日、俯衝赤鷹、決斷 | `#B32025` / `#F4D35E` | `previews/T14_chaoyang_red_hawks_identity_board_v01_two_uniforms.png` |
| T15 | 鳳鳴紅雀 | 紅雀、聲浪、地方應援 | `#B3263E` / `#F4A6C1` | `previews/T15_fengming_redbirds_identity_board_v01_two_uniforms.png` |
| T16 | 銀灘破浪 | 浪峰、海灘、救生旗幾何 | `#00A6A6` / `#F25F5C` | `previews/T16_yintan_breakers_identity_board_v01_two_uniforms.png` |
| T17 | 青川山羌 | 河谷、山羌、穩健步伐 | `#376B45` / `#D6B36A` | `previews/T17_qingchuan_serows_identity_board_v01_two_uniforms.png` |
| T18 | 望海白鯨 | 外海、白鯨、導航星 | `#0B4F8A` / `#EAF6FF` | `previews/T18_wanghai_white_whales_identity_board_v01_two_uniforms.png` |
| T19 | 磐石鐵衛 | 岩壁、鋼構、防守 | `#33415C` / `#C6A15B` | `previews/T19_panshi_iron_guard_identity_board_v01_two_uniforms.png` |

完整提示意圖與輸出規格見 `v491_all_20_identity_review_v01.md`；每張現行圖的 SHA-256 見 `v491_identity_board_manifest_v01.csv`。
