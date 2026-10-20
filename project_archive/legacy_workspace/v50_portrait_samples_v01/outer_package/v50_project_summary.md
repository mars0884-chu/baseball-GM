# 決勝GM v50 脈絡還原摘要

> 版本：v50（一次性修正後重新交付）
> 日期：2026-07-25
> 用途：開新對話時**直接複製下方程式碼區塊的全部內容**貼入，即可恢復完整專案脈絡。

---

## 使用方式

1. 開新對話
2. **複製下方 fenced code block 的完整內容**貼入第一則訊息
3. **同時附上最新完整交付 ZIP**：`v50_delivery.zip`（缺少 ZIP 時 AI 無法驗證程式碼現況，只能依摘要推論）
4. 說明本次要做什麼

---

````markdown
# 決勝GM 專案脈絡還原包（v50）

## 1. 專案名稱與版本

- 專案名稱：**決勝GM**（FRONT OFFICE BASEBALL）
- 當前版本：**v50**（2026-07-25 一次性修正後重新交付）
- 版本沿革：v24 → … → v49 → v491（資料穩定化）→ v50（美術接口定案）
- 回歸測試基準：**1150 項全綠**

## 2. 遊戲定位與架構

### 定位

瀏覽器端職棒 GM 經營模擬遊戲。玩家扮演球隊總經理（GM），只管經營／策略／管理／行銷／建設，與 AI 球隊競爭。靈感來源為電影《Moneyball》。

核心哲學（北極星憲法三支柱）：

- **資訊不對稱**：球探評估有誤差，真值不可見（L1/L2/L3 三層）
- **人的意志**：教練、球員、球迷、老闆都有自己的意志與記憶，不是可任意擺佈的數值
- **時間複利**：決策的後果跨年累積，百年時間尺度

權力邊界：GM 不排打線（純 GM 模式下投打守全交教練），透過「需求單」與教練溝通。

### 架構

- 六模組 vanilla JS（無框架、無建置流程）
- mobile-first PWA，IndexedDB 存檔
- 交付形式：整合單檔 HTML（離線自足）+ 20 檔模組版
- 測試：Node.js vm 沙盒回歸測試 + 雙 15 年 smoke test

### 模組職責

| 檔案 | 職責 |
|------|------|
| `00-theme.js` | 主題／美術接口層（圖示語意化、槽位、肖像合成、主題包導入驗證） |
| `01-data-engine.js` | 資料引擎（球員生成、屬性、球探評估、球隊建構、完整資料卡、榮譽殿堂） |
| `02-finance.js` | 財務（預算、票房、設施、行銷、球迷三維度、冠軍獎勵） |
| `03-simulation.js` | 模擬（比賽、賽程、事件系統、里程碑、隊長、國際賽） |
| `04-state-core.js` | 狀態核心（存檔讀寫、新遊戲、選隊、升級鏈） |
| `05-ui-dashboard.js` | UI 主控台（儀表板、選隊、財務、談判、國際賽、主題設定） |
| `06-ui-roster.js` | UI 名單（球員名單、詳情、交易、選秀、殿堂、教練、hydrate） |

### 核心迴圈

```
球季開打 → 每日模擬 → 事件/傷病/教練需求打斷
  → GM 決策（交易/簽約/設施/行銷/回應需求）
  → 球季結束 → KPI 考核 → 休賽季（選秀/自由市場/續約/教練異動）
  → 下一年
```

## 3. 核心開發進度

12 階段路線圖已全部完成（Phase 0～11）。v38 之後僅以版本號推進。

### 已完成的重大系統

| 系統 | 版本 | 說明 |
|------|------|------|
| 核心經營迴圈 | Phase 0-7 | 名單、育成、選秀、交易、教練、合約、自由市場、財務、行銷 |
| 40 國世界系統 | v25 | 20 真實 + 20 架空，等級分層、名字池風格 |
| 春訓／國際賽 | v25/v38 | 春訓階段、國際賽事逐場化（母國） |
| 經紀人／GM 信任 | v27/v28 | 7 種經紀人性格、7 種 AI 球團性格、信任/KPI/解職/東山再起 |
| 球場設施經濟 | v30/v31 | 12 種設施、15 巨蛋槽位、逐場門票結算、折舊重建 |
| 聯盟生態 | v32 | AI 互相交易、交易流言、AI 主動提案、動態 KPI |
| 生涯深化 | v33 | 委任制工作邀約、聲望事件、沉潛年、經紀人辦公室 |
| 事件系統 | v36/v38 | 16 種事件、6 大類、連鎖事件 |
| GM/教練分權 | v41 | 6 種教練哲學、執行度折射、接管機制、需求單三鍵 |
| 教練市場 | v42 | 聯盟教練池、AI 搶人、意願系統、辭呈、續約談判 |
| 郵件中樞 | v43 | 全訊息收攏、現金交易、掛牌 AI 開條件、傷兵遞補准駁 |
| 教練體諒溝通 | v44 | 需求單第四路徑「體諒說明」+ 可信度查證 |
| 選秀權交易／球迷三維度 | v45 | 順位交易、期待/耐心/認同、求購市場 |
| 完整資訊卡 | v46 | 全能力到處可見、確定性霧化、重建漸進寬限 |
| 可導入美術層 | v47 | 89 圖示語意化 218 處、14 槽位全接線、球探市場找人 |
| 視覺化 | v48 | 六角雷達圖、球員照片槽位、榮譽殿堂、里程碑報喜 |
| 品牌／肖像系統 | v49 | 決勝GM 更名、海嶺共和國、40 國 countryId、組合肖像 |
| 資料穩定化 | v491 | TEAM_DEFS 固定 20 隊、LEAGUE_BRAND、選隊制、GM 名稱輸入 |
| 美術接口定案 | v50 | PORTRAIT_SPEC、z-order、capMark、主客場球衣、主題包驗證 |

## 4. 技術細節與功能

### 亂數紀律（極重要）

- **共用 RNG**：`Math.random()` 用於遊戲模擬，呼叫次數與次序**不得**因美術／UI 改動而變化
- **隔離 PRNG**：敘事型隨機用 `v42rng()` / `v42Int()`
- **確定性雜湊**：球探霧化用 `v46Fog()`、肖像用 `v49SeedHash()`

理由：回歸測試依賴可重現的模擬軌跡。v42/v43 都曾因此出現偶發漂移，已用隔離修法解決。

### 升級鏈

```
ensureV25 → ensureV26 → … → ensureV49 → ensureV491 → ensureV50
```

新版一律接在尾端，透過惰性補值處理舊存檔，不做破壞性遷移。

### 穩定 ID

| 類型 | ID 格式 | 定義位置 |
|------|---------|----------|
| 球隊 | T0～T19 | `TEAM_DEFS`（01-data-engine.js） |
| 國家 | NAT_US / NAT_TW / NAT_HOME / NAT_F01～F19 | `NATIONS` |
| 球員外觀 | `appearanceSeed`（整數） | 生成時寫入，轉隊不變 |
| 美術目錄 | `brandKey`（如 jingan_guardians） | `TEAM_DEFS` |

### 20 隊固定品牌

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

聯盟品牌：海嶺職業棒球聯盟（HPBL），A=海風聯盟、B=山岳聯盟。母國：海嶺共和國。

### v50 美術接口

- `PORTRAIT_SPEC`：母版 256×256、輸出 64/128、三錨點（headTop y10% / faceCenter x50%y38% / neckline y72%）
- z-order：`skin → face → eyes → nose → uniform → hair → beard → cap`
- `capMark` = 完整帽子圖層（不拆分）
- 球衣：僅 `homeUniform` / `awayUniform`；`cityUniform` 已停用
- 肖像 context：`compositePortrait(playerId, {player, teamId, isAway}, size)`
- 快取鍵：`playerId|teamId|size|H或A`
- 非比賽情境預設主場（`PORTRAIT_DEFAULT_AWAY = false`）
- 主題包驗證：13 類警告，警告不阻擋載入

## 5. 已解決的問題

| 問題 | 解法 | 版本 |
|------|------|------|
| 手機完全打不開 | 用 Edge 等真實瀏覽器開啟（iOS 檔案 App 的 Quick Look 不執行 JS） | v35.2 |
| 第二輪教練無法更換 | `takeJobOffer` 清除舊隊待處理佇列 | v35 |
| 球探替換閃退 | 四個渲染路徑加入空缺守衛 | v35 |
| 第二年選秀被吞掉 | `beginFirstSeason` 清 `S.draft` + 重入守衛修正 | v39.1 |
| 球探報告徽章空白 | draftgrades 容器修復 | v40 |
| 榮譽殿堂進去出不來 | `renderHallOfFame()` 補 `wireRosterNav()` | v49 |
| 回歸測試偶發漂移 | 隔離 PRNG + 固定種子覆寫 | v42/v43 |
| 主客場球衣沒有呼叫端 | 明確 ctx `{player, teamId, isAway}` + 比賽情境接通 | v50 |
| 主題包驗證太淺 | 完整白名單 + URI 格式 + layerOrder 四項檢查 | v50 |
| cityUniform 規格不一致 | 停用欄位 + 載入剝除 + 相容警告 | v50 |

## 6. 開發需求、限制與驗收條件

### 不得違反的限制

1. 共用 RNG 序列不得因美術／UI 改動而變化
2. 存檔相容性透過 `ensureVXX()` 升級鏈，不做破壞性遷移
3. 模組 ZIP 必須恰為 20 檔
4. 整合單檔必須離線自足（無外部 CDN／字型）
5. 未導入主題包時，畫面輸出必須與導入前位元等價
6. 主題包驗證的個別欄位問題只產生警告，不阻擋載入
7. 全部程式註解、UI 文字、對話一律繁體中文
8. **所有交付檔名一律為純 ASCII**，無任何例外。ZIP 內所有路徑與檔名皆須為 ASCII，確保 Windows `Expand-Archive` 等標準工具可正常解壓

### 驗收條件（四項全過才可交付）

| 測試 | 執行指令 | 要求 |
|------|---------|------|
| 完整回歸 | `node test_regression.js` | 0 失敗 |
| 一般模式 15 年 smoke | `node smoke_multiyear.js` | 全部通過 |
| 純 GM 模式 15 年 smoke | `node smoke_puregm.js` | 全部通過 |
| 整合單檔自驗 | 抽出主 script 在 vm 沙盒執行 | 0 失敗 |

有失敗必須明列，不得寫成全數通過。

## 7. Mars／Claude／Codex 責任邊界

| 角色 | 責任 |
|------|------|
| **Mars** | 設計總監與產品負責人。決定方向、拍板設計決策、真機測試、提供回饋。不寫程式 |
| **Claude** | 唯一的程式工程師。全部遊戲邏輯、UI、測試、文件。跨工作階段延續 |
| **Codex** | 美術層製作。隊徽、帽子、球衣、肖像零件、圖示、背景。不改動遊戲邏輯 |

### 溝通約定

- 需要 Mars 決定的事**直接在對話中提問**，不放進文件
- 未獲回覆的問題要**再問一次**，不自行猜測
- 根因診斷先於修復（Mars 會審核診斷再批准）

## 8. 待辦與未完成內容

完整清單見 `v50_full_pending_items.md`（約 68 項）。摘要：

### 收官三大項（尚未動工）

1. **L3 進階數據引擎**（憲法 §4.4-4.6）：BB/K/SB/CS/GIDP/失分組成等進階欄位
2. **農場多層級**（§5.2）：目前只有一軍/二軍
3. **球隊文化／城市記憶／二代傳承**（§11.2-11.4）

### 其他

- 承諾系統、捕手專項完整體系
- 28 項版本簡化事項（S1-S3 / v37-v47 各版）
- 18 組待真機調整的參數
- 10 項 backlog 功能（多層事件連鎖、39 國逐場國際賽、選秀權保護等）
- R1：純 GM 模式教練 AI 手感待真機驗證（自 v41 起）

### 美術層（Codex 端，尚未完成）

- 20 隊正式隊徽尚未全部映射進可直接導入的正式主題包
- 正式完整帽子 `capMark` 尚未製作（現有 `capMarkReference` 不能直接當正式帽子層）
- 20 隊主場／客場正式球衣圖層尚未完成
- 正式肖像母版與臉型、眼、鼻、髮型、鬍型等零件尚未完成
- 20 架空國旗與真實國旗正式版尚未完成
- 97 個語意圖示正式版尚未完成
- 六大畫面背景、按鍵、卡片、雷達圖與事件素材尚未完成
- 可直接匯入的正式完整 Theme pack JSON 尚未完成

## 9. 記憶錨點與已定案事項

以下為**不可遺失**的定案，後續版本不得推翻：

| 錨點 | 內容 |
|------|------|
| 品牌 | 決勝GM: FRONT OFFICE BASEBALL；母國海嶺共和國；聯盟 HPBL |
| 20 隊 | 固定 TEAM_DEFS，隊名不再隨機生成 |
| 選隊制 | 玩家從 20 隊自選，`userTeamId` 不限 T0 |
| 開局 | 玩家只輸入 GM 名稱；玩家隊設施全 Lv0（球場 Lv1）；AI 依性格 Lv0-2 |
| 人氣 | 玩家隊固定 35，AI 隨機 |
| 東山再起 | 一次性。第二次解職＝永久 Game Over；主動跳槽不消耗機會 |
| 打線權責 | 純 GM 模式投打守全交教練；GM 兼教練模式可自排 |
| 國際賽 | 方針層自選、認同度 100%、natCoach 為執行官 |
| 球迷 | 只看傳統數據（認同維度為永久設計，非 L3 未到位的替代品） |
| capMark | 完整帽子圖層（方案 A），不拆分 |
| 球衣 | 僅 home/away 兩套，cityUniform 永久停用 |
| z-order | skin→face→eyes→nose→uniform→hair→beard→cap |
| 肖像母版 | 256×256，三錨點 10%/38%/72% |
| 美術映射 | 一律用穩定 ID（teamId/countryId），不用顯示名稱 |
| 亂數紀律 | 共用 RNG 序列神聖不可變動 |

## 10. 完整檔案說明清單

### 外層交付 ZIP（v50_delivery.zip，9 檔）

| 檔案 | 用途 |
|------|------|
| `50_baseball_gm.html` | 整合單檔，離線可執行 |
| `50_baseball_gm_modular.zip` | 20 檔模組版 |
| `v50_project_summary.md` | 本文件（脈絡還原摘要） |
| `v50_claude_handoff.md` | 交回 Claude 的技術交接 |
| `v50_codex_handoff.md` | 交給 Codex 的接口說明 |
| `v50_art_interface_spec.md` | 正式美術接口規格 |
| `v50_art_assets.zip` | Codex 已產出美術素材 |
| `v50_full_pending_items.md` | 全部未完成項目（約 68 項） |
| `SHA256SUMS.txt` | 完整性校驗 |

### 模組 ZIP（20 檔）

| # | 檔案 | 用途 |
|---|------|------|
| 1 | `00-theme.js` | 主題／美術接口層 |
| 2 | `01-data-engine.js` | 資料引擎 |
| 3 | `02-finance.js` | 財務系統 |
| 4 | `03-simulation.js` | 比賽模擬 |
| 5 | `04-state-core.js` | 狀態核心 |
| 6 | `05-ui-dashboard.js` | UI 主控台 |
| 7 | `06-ui-roster.js` | UI 名單 |
| 8 | `baseball_gm_century_empire_design_v1_2.md` | 北極星憲法 |
| 9 | `design_doc.md` | 開發文件（逐版紀錄） |
| 10 | `icon-180.png` | PWA 圖示 |
| 11 | `icon-192.png` | PWA 圖示 |
| 12 | `icon-512.png` | PWA 圖示 |
| 13 | `index.html` | 模組版入口 |
| 14 | `manifest.webmanifest` | PWA manifest |
| 15 | `smoke_multiyear.js` | 一般模式 15 年 smoke |
| 16 | `smoke_puregm.js` | 純 GM 模式 15 年 smoke |
| 17 | `style.css` | 樣式表 |
| 18 | `sw.js` | Service Worker |
| 19 | `test_regression.js` | 完整回歸測試 |
| 20 | `theme_pack_example.json` | 主題包範例 |

## 11. Claude 原本內容摘要

本節區分內容來源，供追溯。

### Claude 原始提供／實作

- **全部程式碼**：00～06 七個 JS 模組、style.css、index.html、sw.js、manifest.webmanifest、三個測試腳本、theme_pack_example.json
- **全部設計文件**：北極星憲法 v1.0→v1.2、design_doc.md 全部章節、各版交接摘要
- **v50 全部技術決策**：PORTRAIT_SPEC 規格、z-order 順序、capMark 方案 A、球衣策略、主題包驗證規則、快取鍵設計、cityUniform 停用機制、TEAM_DEFS 20 隊品牌色票
- **全部測試**：1150 項回歸斷言、兩個 smoke test、整合單檔自驗

### Codex 新增／修改／確認／推論

- **美術素材**：20 隊隊徽（512/128/64/32px 共 80 檔）、20 隊帽徽參考、20 隊品牌概念板
- **接口提問**：v491 art checkpoint 提出 5 項待確認事項（capMark 定義、肖像母版、z-order、球衣套數、schema 錯誤回報）
- **程式碼修改**：**無**。已驗證 v491_art_checkpoint 的 HTML 與模組 ZIP 與 v491_delivery MD5 完全一致

### 追溯結論

v50 的全部程式碼與設計決策均為 Claude 產出。Codex 貢獻限於美術素材與接口提問，未修改任何程式檔。

## 12. 本版相對上一版的變更

### v491 → v50（初版）

| 項目 | 說明 |
|------|------|
| `PORTRAIT_SPEC` | 新增肖像母版規格常數 |
| z-order 修正 | uniform 從 hair/beard/cap 之後移到之前 |
| `capMark` 定案 | 完整帽子圖層（方案 A） |
| TEAM_DEFS 擴充 | 每隊新增 shortName/brandKey/league/division/primaryColor/secondaryColor |
| `ensureV50()` | 舊存檔補入品牌色彩欄位 |
| 主題包持久化 | localStorage v50_theme_pack + IndexedDB v50_theme_db 後備 |
| 選隊畫面 | v50 品牌卡片（隊色圓點 + 品牌色邊框） |
| 回歸 | 1069 → 1096（+27） |

### v50 初版 → v50 修正版（本次）

| 項目 | 說明 |
|------|------|
| 肖像 context | 從隱性 `_portraitAway` 改為明確 `{player, teamId, isAway}` |
| 快取鍵 | 從 `playerId@size` 改為 `playerId\|teamId\|size\|H或A` 四欄 |
| 比賽情境接通 | `renderLastGameCard()` 明確傳 `isAway: !isHome` |
| 驗證完整化 | 從 5 條檢查擴充到 13 類警告（白名單、URI 格式、layerOrder 四項） |
| cityUniform | 列入停用清單、載入時剝除、產生相容警告、範例與文件同步移除 |
| 新增函式 | `v50NormalizePortraitCtx` / `v50IsTeamAwayToday` / `v50GamePortraitCtx` / `v50IsValidImageUri` / `v50IsValidColor` / `v50StripDeprecatedFields` |
| 新增常數 | `PORTRAIT_DEFAULT_AWAY` / `V50_TEAM_FIELDS` / `V50_TEAM_DEPRECATED` / `V50_LAYER_NAMES` / `V50_LAYER_REQUIRED` |
| 回歸 | 1096 → 1150（+54） |
| 新增文件 | `v50_claude_handoff.md` / `v50_art_interface_spec.md` |

## 13. 測試結果與已知風險

### 測試結果（實測）

| 測試 | 結果 |
|------|------|
| 完整回歸 | **1150 通過 / 0 失敗** |
| 一般模式 15 年 smoke | **全部通過** |
| 純 GM 模式 15 年 smoke | **全部通過** |
| 整合單檔自驗 | **33 通過 / 0 失敗** |

### 已知風險

| 編號 | 風險 | 緩解 |
|------|------|------|
| R1 | 純 GM 模式教練 AI 手感未經真機驗證（自 v41 起） | 待 Mars 實機遊玩 |
| R2 | 大量 v33～v46 參數採建議值未經真機調校 | 已列未完成清單 |
| R3 | Codex 正式圖層若不符錨點會對位偏移 | 建議先做 T0～T4 樣板驗證 |
| R4 | 美術接口只有邏輯測試，無實際圖片載入測試 | 待 Codex 交回圖層後實測 |

### v50 已知簡化

| 編號 | 說明 |
|------|------|
| V50-1 | 比賽情境肖像目前只有「最近一戰」一個出口 |
| V50-2 | 主客場判定讀 `S.resultsLog` 最末筆，同日多場以第一筆命中為準 |
| V50-3 | 圖片 URI 驗證為格式檢查，不做實際載入測試 |
| V50-4 | 不檢查圖片實際尺寸是否符合 256×256 |
| V50-5 | IndexedDB 後備為非同步，localStorage 不可用時有一次渲染延遲 |

## 14. 開新對話時的使用方式

1. **複製本區塊全部內容**貼入新對話第一則訊息
2. **同時上傳 `v50_delivery.zip`**——缺少 ZIP 時 AI 只能依摘要推論，無法驗證程式碼現況
3. 說明本次要做什麼（例如：「繼續開發 v51，優先做 L3 進階數據引擎」）
4. AI 應先解壓 ZIP、跑一次回歸測試確認基線（預期 1150/0），再開始工作

### 提醒

- 語言：全程繁體中文
- 需要 Mars 決定的事直接在對話中問，不放文件
- 交付規格見 `FUTURE_DELIVERY_STANDARD.md`（外層 9 檔、模組 20 檔）
- 所有交付檔名一律純 ASCII，無例外
````

---

## 文件關係說明

| 文件 | 定位 | 不可被取代的原因 |
|------|------|-----------------|
| `v50_project_summary.md` | 本文件。脈絡還原，給任何 AI 恢復記憶用 | 唯一包含可直接複製貼上的完整脈絡包 |
| `v50_claude_handoff.md` | Codex→Claude 方向的技術交接 | 記錄修改點、邊界、風險、待辦 |
| `v50_codex_handoff.md` | Claude→Codex 方向的接口說明 | 回答 Codex 的接口問題、指示下一步 |
| `v50_art_interface_spec.md` | 正式接口規格 | 美術製作的權威依據 |

四份文件並存，不互相取代。

---

*本摘要由 Claude 產出於 v50 一次性修正交付（2026-07-25），回歸 1150/0 全綠。*
