# 決勝GM Claude 完整記憶摘要 v01

> 日期：2026-07-25
> 用途：供 Mars 開新 Claude 對話時貼入，讓新 Claude 完整繼承專案脈絡與所有已寫入的規則
> 版本基線：v50（Codex v01 正式品牌 Theme pack 已驗證通過）

---

## 一、專案基本資訊

- 專案名稱：**決勝GM: FRONT OFFICE BASEBALL**
- 架構：六模組 vanilla JS，mobile-first PWA，IndexedDB 存檔
- 交付形式：整合單檔 HTML（離線自足）＋ 20 檔模組版
- 當前版本：**v50**（2026-07-25 一次性修正後重新交付；Codex v01 Theme pack 已驗證通過）
- 回歸測試基準：**1150 項全綠**
- 母國：海嶺共和國
- 聯盟：海嶺職業棒球聯盟（HPBL），A=海風聯盟、B=山岳聯盟
- 20 隊固定品牌在 TEAM_DEFS（Object.freeze），不可變更

---

## 二、角色分工

| 角色 | 職責 |
|------|------|
| Mars | 設計方向、需求定義、真機測試、最終拍板；不寫程式碼 |
| Claude | 唯一工程師：程式碼、測試、回歸、交付；不自行決定設計 |
| Codex | 美術製作：隊徽、肖像零件、球衣、帽子、圖示、國旗；不動遊戲規則 |

---

## 三、交付規格鐵則

### 外層交付 ZIP 必含（v{版號}_delivery.zip）

| 序 | 檔案 | 說明 |
|---|------|------|
| ① | `<版號>_baseball_gm.html` | 整合單檔 |
| ② | `<版號>_baseball_gm_modular.zip` | 模組版（恰為 20 檔） |
| ③ | `v<版號>_project_summary.md` | 脈絡還原摘要 |
| ④ | `v<版號>_claude_handoff.md` | 交給 Claude 的交接摘要 |
| ⑤ | `v<版號>_codex_handoff.md` | 交給 Codex 的接口說明 |
| ⑥ | `v<版號>_art_interface_spec.md` | 正式美術接口規格 |
| ⑦ | `v<版號>_art_assets.zip` | 完整美術素材包（不得只放新增） |
| ⑧ | `SHA256SUMS.txt` | 全部外層檔案校驗 |
| ⑨ | `v<版號>_full_pending_items.md` | 未完成項目清單（每次交付都要） |

### 20 檔模組版固定清單

00-theme.js / 01-data-engine.js / 02-finance.js / 03-simulation.js / 04-state-core.js / 05-ui-dashboard.js / 06-ui-roster.js / baseball_gm_century_empire_design_v1_2.md / design_doc.md / icon-180.png / icon-192.png / icon-512.png / index.html / manifest.webmanifest / smoke_multiyear.js / smoke_puregm.js / style.css / sw.js / test_regression.js / theme_pack_example.json

### 脈絡還原摘要（project_summary）14 項必含

①專案名稱與版本 ②遊戲定位與架構 ③核心開發進度 ④技術細節與功能 ⑤已解決的問題 ⑥開發需求/限制/驗收條件 ⑦Mars/Claude/Codex 責任邊界 ⑧待辦與未完成 ⑨記憶錨點與已定案事項 ⑩完整檔案說明清單 ⑪Claude 原本內容摘要（與 Codex 新增內容須可追溯區分）⑫本版相對上一版變更 ⑬測試結果與已知風險 ⑭開新對話使用方式

**可貼入新對話的完整摘要正文必須包在單一 Markdown fenced code block 中**

### 交付前驗收（四項全過才可交付）

1. 完整回歸：`node test_regression.js` — 0 失敗
2. 一般模式 15 年 smoke：`node smoke_multiyear.js` — 全過
3. 純 GM 模式 15 年 smoke：`node smoke_puregm.js` — 全過
4. 整合單檔自驗：抽出主 script 在 vm 沙盒執行 — 0 失敗

有失敗必須明列，不得寫成全過。

### 檔名/打包規則

- **所有檔名一律純 ASCII，無任何例外**
- ZIP 內所有 entry 路徑亦須為 ASCII，不得設 UTF-8 旗標
- 打包指令用 `zip -X`（不存額外屬性），先複製到乾淨資料夾再壓縮
- ZIP 須能在全新空資料夾獨立解壓、測試、使用，不依賴前版檔案

---

## 四、不得違反的硬性約束

1. **共用 RNG 序列**：`Math.random()` 用於遊戲模擬，呼叫次數與次序不得因美術/UI 改動而變化；敘事型隨機用 `v42rng()` / `v42Int()`；確定性雜湊用 `v46Fog()` / `v49SeedHash()`
2. **存檔相容性**：新欄位透過 `ensureVXX()` 升級鏈惰性補值，不做破壞性遷移
3. **升級鏈順序**：`ensureV25 → … → ensureV49 → ensureV491 → ensureV50`，新版接在尾端
4. **模組邊界**：00-theme.js 只放主題/美術接口，不放遊戲規則
5. **20 檔模組版**：模組 ZIP 恰為 20 檔
6. **整合單檔離線自足**：不得引入外部 CDN 或字型連結
7. **未導入主題包時位元等價**：美術接口在未導入資產包時必須回退到 emoji/CSS 外觀
8. **警告不阻擋載入**：`validateThemePack` 個別欄位問題一律只產生警告
9. **全部繁體中文**：程式註解、UI 文字、對話一律繁體中文
10. **美術映射用穩定 ID**（teamId/countryId），不用可能變動的顯示名稱
11. **文件不得把未完成的美術工作寫成已完成**

---

## 五、v50 美術接口已定案（不可推翻）

### PORTRAIT_SPEC

```
母版：256x256
輸出：64px / 128px
三錨點：
  headTop:    { x: 0.50, y: 0.10 }   // 帽頂對齊線
  faceCenter: { x: 0.50, y: 0.38 }   // 五官中心
  neckline:   { x: 0.50, y: 0.72 }   // 領口上緣
```

### z-order

`skin → face → eyes → nose → uniform → hair → beard → cap`

### 球衣

- `capMark` = 完整帽子圖層 256x256（帽身+帽簷+帽徽一體，不拆分）
- `homeUniform` = 白色系主場球衣
- `awayUniform` = 球隊主色系客場球衣
- `cityUniform` **永久停用**（不在白名單、載入剝除、產生警告）
- 客場缺失回退 homeUniform
- 非比賽情境一律主場（`PORTRAIT_DEFAULT_AWAY = false`）

### 肖像 context

```
compositePortrait(playerId, { player, teamId, isAway }, size)
快取鍵：playerId|teamId|size|H或A
```

### 主題包驗證

- `V50_TEAM_FIELDS` 白名單 9 欄
- `V50_LAYER_NAMES` 8 個合法圖層
- `V50_LAYER_REQUIRED` 4 個必要圖層（skin/face/uniform/cap）
- 13 類警告；valid=false 只在結構根本不可用
- `v50StripDeprecatedFields()` 載入時剝除已停用欄位

---

## 六、穩定 ID 一覽

| 類型 | ID 格式 | 定義位置 |
|------|---------|----------|
| 球隊 | T0~T19 | `TEAM_DEFS`（01-data-engine.js） |
| 國家 | NAT_US / NAT_TW / NAT_HOME / NAT_F01~F19 | `NATIONS` |
| 球員外觀 | `appearanceSeed`（整數） | 生成時寫入，轉隊不變 |
| 美術目錄 | `brandKey`（如 jingan_guardians） | `TEAM_DEFS` |

---

## 七、20 隊固定品牌

| teamId | 隊名 | brandKey | 聯盟 | 分區 | 主色 | 輔色 |
|--------|------|----------|------|------|------|------|
| T0 | 靖安盾衛 | jingan_guardians | A | A1 | #1B3A6B | #C0C0C0 |
| T1 | 臨海獵鯊 | linhai_sharks | A | A1 | #005F73 | #0A9396 |
| T2 | 曲江水牛 | qujiang_buffalo | A | A1 | #6B4226 | #D4A373 |
| T3 | 永昌雄獅 | yongchang_lions | A | A1 | #B8860B | #1C1C1C |
| T4 | 明陽烈焰 | mingyang_blaze | A | A1 | #CC3311 | #FF8800 |
| T5 | 天啟鷹 | tianqi_eagles | A | A2 | #2E4057 | #D4AF37 |
| T6 | 龍城雲豹 | longcheng_leopards | A | A2 | #4A4A4A | #E8C547 |
| T7 | 星野銀狐 | xingye_foxes | A | A2 | #708090 | #C0C0C0 |
| T8 | 雲夢白鷺 | yunmeng_egrets | A | A2 | #F0F0F0 | #4682B4 |
| T9 | 東寧豹 | dongning_leopards | A | A2 | #1C1C1C | #D4A017 |
| T10 | 嘉禾金穗 | jiahe_harvest | B | B1 | #DAA520 | #228B22 |
| T11 | 瑞港海豚 | ruigang_dolphins | B | B1 | #0077B6 | #48CAE4 |
| T12 | 金川礦工 | jinchuan_miners | B | B1 | #5C4033 | #E8A838 |
| T13 | 玄武黑熊 | xuanwu_bears | B | B1 | #1C1C1C | #4B5320 |
| T14 | 朝陽赤鷹 | chaoyang_redhawks | B | B1 | #B22222 | #FFD700 |
| T15 | 鳳鳴紅雀 | fengming_redbirds | B | B2 | #C41E3A | #FFFACD |
| T16 | 銀灘破浪 | yintan_breakers | B | B2 | #006994 | #F5F5DC |
| T17 | 青川山羌 | qingchuan_serows | B | B2 | #2D6A4F | #B7E4C7 |
| T18 | 望海白鯨 | wanghai_whales | B | B2 | #E8E8E8 | #1E3A5F |
| T19 | 磐石鐵衛 | panshi_ironguard | B | B2 | #36454F | #A9A9A9 |

---

## 八、版本沿革摘要

| 版本 | 重點 | 回歸數 |
|------|------|--------|
| v24~v28 | 核心玩法循環、信任/KPI/東山再起、經紀人辦公室 | 184 |
| v29~v31 | 球場設施經濟、折舊重建、傳承系統 | 328 |
| v32~v33 | 聯盟生態（AI 互交易）、生涯深化（委任/沉潛/應酬） | 417 |
| v34~v35 | 九項修正＋教學頁、第二輪穩定性、Safe Mode | 498 |
| v35.1/v35.2 | 開機防護 hotfix、preboot 靜態文字 | 498 |
| v36 | ④⑤⑥ 修正、冠軍5項、Phase 10 事件系統 | 546 |
| v37 | Mars 十項＋Phase 11 PWA（代打代跑確認、隊長、KPI 談判） | 571 |
| v38 | 18 事件＋連鎖＋型態弧、國際賽逐場化（母國） | 611 |
| v39 | 潛力動態＋不可逆特質＋球探探價 | 658 |
| v39.1 | 第二年選秀被吞修正 hotfix | 658 |
| v40 | 談判球探報告徽章修正、UI 去雜亂、分頁 | 710 |
| v41 | GM/教練分權「教練核心委任制」 | 762 |
| v42 | 教練市場＋標籤後果＋Mars 四項需求 | 817 |
| v43 | 郵件中樞＋純 GM 全教練化＋傷兵遞補准駁 | 856 |
| v44 | 教練體諒溝通（需求單第四路徑） | 871 |
| v45 | 選秀順位交易＋球迷三維度＋求購市場 | 898 |
| v46 | 完整資訊卡＋確定性霧化＋重建漸進寬限 | 914 |
| v47 | 可導入美術層＋89 圖示語意化＋球探市場找人 | 948 |
| v48 | 六角雷達圖＋球員照片＋榮譽殿堂＋里程碑 | 1000 |
| v49 | 品牌更名決勝GM＋海嶺共和國＋組合肖像＋主題設定頁 | 1047 |
| v491 | TEAM_DEFS 固定 20 隊＋LEAGUE_BRAND＋選隊制＋GM 名稱 | 1069 |
| v50 | 美術接口定案＋肖像context端到端＋驗證完整化＋cityUniform 停用 | 1150 |

---

## 九、已知簡化與待辦摘要

詳見 `v50_full_pending_items.md`，主要類別：

- **收官大項**（5 項）：L3 進階數據/農場多層級/文化傳承/承諾系統/捕手體系
- **版本簡化**（28 項）：v35~v47 各版標記的「後續再補」
- **待調參數**（18 組）：v33~v46 各版建議值，待 Mars 真機微調
- **Backlog**（10 項）：多層事件連鎖、39 國逐場、選秀權保護等
- **美術待製作**（7 大項）：capMark/球衣/肖像零件/圖示/槽位/國旗（Theme pack 隊徽+色票已完成）

---

## 十、Codex 美術層當前狀態

### 已完成

- 20 隊隊徽（512/128/64/32px）
- 20 隊帽徽參考（capMarkReference，輔助用非正式圖層）
- 20 隊品牌概念板
- 品牌色票（在 TEAM_DEFS）
- PORTRAIT_SPEC / z-order（已定案寫入程式碼）
- **正式品牌 Theme pack v01**（logo+色票 JSON，Claude 已驗證：valid=true, 0 warnings）

### 待製作

- 正式 capMark（256x256 完整帽子，建議先做 T0-T4 樣板）
- homeUniform / awayUniform（主/客場球衣透明層）
- 肖像零件（skin/face/eyes/nose/hair/beard）
- 語意圖示（97 個 emoji→SVG/PNG）
- 槽位資產（背景/卡片材質/按鍵皮膚等 26 個）
- 國旗（40 國）

---

## 十一、Mars 溝通規則

- 回覆全程繁體中文（無對應翻譯時才允許英文）
- 需要 Mars 決定的內容直接在對話中提問，不放在文件裡
- 未獲回覆的問題要再問一次，不自行猜測
- 上下文記憶容量達 50%/70%/80%/90% 時主動提醒
- Mars 是設計方向指揮者，Claude 先根因分析再提方案，Mars 拍板後才動工
- Mars 一貫要求「先開發完再提供」，不接受分批零碎交付

---

## 十二、開新對話使用指引

1. 開新 Claude 對話
2. 上傳最新完整交付 ZIP（本輪為 Codex 原始交付 ZIP 或 Claude 驗證後的輸出 ZIP）
3. 貼入 `v50_project_summary.md` 中的 fenced code block 完整內容
4. 說明本次目標

---

*本記憶摘要由 Claude 於 2026-07-25 根據所有已寫入記憶檔案彙整產出，涵蓋 /areas/baseball-gm-sim.md 主線歷史、v37~v50 各版分卷檔、/areas/delivery-standard.md 交付規格、/preferences.md 溝通偏好。*
