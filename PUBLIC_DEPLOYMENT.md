# v60-r038 可見規則精簡與同畫風場景圖

本目錄是 GitHub Pages 公開部署殼層，不取代離線交付包，也不代表 Mars 正式接受。

## r038：同畫風場景取代教學長文、管理頁減量

- 財務與補強教學不再以長段說明為主：新增藍色／象牙白球場經營場景圖，分別呈現售票、預算與設施，以及球探、選秀與談約的管理場景；旁邊保留簡短可見的規則／數值。兩張圖不是 SVG 或裝飾圖示，採 1254px 正方形構圖與 `object-fit:contain`，不裁切主體；JPEG 各約 258KB／230KB，僅在進入對應教學章節時延遲載入。圖像生成母版保存在工作區 `_staging/v60-r038-art-source/`，公開版只放壓縮素材，不動正式 Art ZIP。這是技術候選；Mars 尚未就本批新圖給予主觀視覺核准。
- 新手教學九章的標題＋內文，同一測量法由 r037 的 2,129 字降至 1,615 字（再減 24.1%）；r036 同法為 3,008 字，累計減少 46.3%。這是教學內容，不是全遊戲文字量。九章規則仍可切換閱讀；未用收合取代、未刪除操作／必要條件。國際賽手動選人由一次列 90 名改為每頁 12 名，保留入選／退出與已選名單；原 2,556 字的首屏情境目前 483 字，這是分頁減少同屏負擔，不是刪除其餘球員。
- 同一 37 路由樣本、390px 手機測量：15,038→12,339 可見字元，減少 17.9%；所有增加文字的路由為 0。此為固定樣本，不涵蓋每個存檔、情境或全遊戲，所以全遊戲減半仍未完成或證明。財務、續約、KPI、交易風聲、存檔、春訓報告及國際賽提示以短狀態列取代重複解說；原有結果數據、代價與操作維持。
- 本機隔離瀏覽器檢查 37 路由、教學九章互動、320／390／1280px 響應式、國際賽選人狀態與 `S` 只讀性，頁面錯誤 0。兩張 JPEG 在實際教學 renderer 中 `complete && naturalWidth=1254`，財務／補強 320／390px 截圖已檢視：圖片完整、無水平溢位。這不等於 Mars 手機實測。
- Regression：`node test_regression.js` 1,833 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面 renderer PASS；`node smoke_puregm.js` 純 GM 15 年 PASS。新圖路徑、壓縮大小、按需載入與完整構圖新增回歸斷言。程式不改遊戲規則、存檔欄位或模擬亂數。
- 本批公開程式與素材：`02-finance.js`、`05-ui-dashboard.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js`、`visual_assets/v60/` 兩張 JPEG、本紀錄。Service Worker／頁面 cache key 為 `v60-r038-visible-rules`。工作區原有 `manifest.webmanifest` 修改保留且不納入提交；正式 `current/`、delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 與 lineage 均未修改。公開推送與 Pages 實際生效狀態另以部署驗證為準，不以本地 PASS 冒稱線上更新。

## r037：新手教學九章導覽與可見規則卡

- 新手教學由手風琴改成九個章節分頁，每頁只呈現一組視覺卡片／流程／因果規則；章節可由頁首直接選取，也能用上一章／下一章切換。不是摺疊或刪除章節，原有規則與數據仍可逐頁讀取。
- 以相同章節模型計算標題＋內文的全部字元，包含 r036 首次載入時尚未展開的章節：3,008→2,129，減少 29.2%。此為新手教學單頁內容量，不代表全遊戲減少 50%。目前 390×844 手機第一章畫面高 798px；整頁九章常駐的長頁已拆成可直接選擇的章節畫面，避免一次閱讀九段長文。
- Playwright 隔離瀏覽器逐一點擊九章，確認每章標題、內容、頁碼與單一選中頁籤同步；上一章／下一章、方向鍵循環操作有效。分頁控制至少 44px，320×844、390×844、1280×900 均無水平溢位；各章規則可見，沒有 `<details>`／手風琴；操作前後遊戲 `S` 完全相同，render 未呼叫共享亂數。
- Regression：`node test_regression.js` 為 1,820 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面 render PASS；`node smoke_puregm.js` 純 GM 15 年 PASS；`node --check 05-ui-dashboard.js`、`node --check test_regression.js`、`node --check sw.js` 與 `git diff --check` PASS。隔離瀏覽器渲染 30 個主要路由無 JavaScript 例外，教學九章於 320×844、390×844、1280×900 互動及響應式驗證 PASS。
- 本輪修改：`05-ui-dashboard.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js` 與本部署紀錄。Service Worker／靜態資源版本為 `v60-r037-visual-tutorial-guide`。工作區原有 `manifest.webmanifest` 修改保留且不納入提交；正式 `current/`、delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 及 lineage 均未修改。
- 全遊戲文字量減少 50% 仍未被證明或完成；春訓、行銷、國際球員市場等畫面仍包含必要的人員、效果、估值及操作資料。本候選僅完成教學頁本批減量與導航，不將單頁比例冒稱全遊戲結果。
- 2026-09-29，程式提交 `35a51bd7973c96602316578f7ab4794dcac1b2d0` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/36565742970) `success`。部署後以 no-cache GET 驗證公開首頁、`05-ui-dashboard.js`、`style.css`、`sw.js` 全部 HTTP 200，並逐一確認 r037 HTML／章節 renderer／樣式／Service Worker 標記。這確認公開靜態版已更新，不等於 Mars 真機或主觀視覺接受。

## r036：先發／教練分頁與可見規則短列

- 先發管理改為「先發打線／教練調度」兩個可見工作頁；先發卡、完整桌面表、六項能力、守位、棒次、換人、自動排列、教練戰術、隊長與板凳資訊均保留。切換鍵支援方向鍵／Home／End，採單一焦點頁籤；只改暫存 `UI`，不改遊戲存檔或模擬規則。
- 分頁前先執行舊單頁原有的戰術衍生值與板凳預設初始化，避免玩家第一次切到教練頁時才新增 `effTactics`／`benchRoles`；瀏覽器實測切換前後 `S` 相同。未改模擬函式或 Save schema。
- 依全路由稽核，把票價、教練效果、輪值、球探職務、育成發掘、自由球員、國際市場與代理人說明整理為直接可見的短狀態列／因果提示；代理人規則不再收合。機率、交情門檻、球員估值可信度、簽約成本、名單限制與所有操作均保留。場上能力、薪資、球員姓名、排名數據等必要遊戲資料沒有為追求字數而刪除。
- 390×844 同一固定測試存檔、同一路由下，打線頁原本把先發和教練資訊塞在同一頁：1,148 字／1,828px；新預設「先發打線」頁 380 字／964px（同屏字數減 66.9%、文件高度減 47.3%）。「教練調度」頁另有 774 字／1,211px，原資料與操作均可見。這是工作頁分區，不是跨兩頁合計刪字比例，也不是全遊戲減半結論。
- 隔離瀏覽器稽核 28 個已定義主要路由：JavaScript 例外 0、renderer 亂數呼叫 0；球場建造／升級、國際市場翻頁／返回互動均通過。打線頁分頁點擊與鍵盤左右操作通過，320／390／1280px 文件寬度均未超出 viewport，前後 `S` 完全相同。Mars 真機與主觀視覺接受仍未驗證。
- 驗證：`node test_regression.js` 1,819 通過／0 失敗；`node smoke_multiyear.js` 15 年及全畫面 render PASS；`node smoke_puregm.js` 純 GM 15 年 PASS；`node --check 02-finance.js`、`node --check 05-ui-dashboard.js`、`node --check 06-ui-roster.js`、`node --check test_regression.js`、`node --check sw.js` 與 `git diff --check` PASS。
- 公開殼層／Service Worker cache key：`v60-r036-lineup-work-tabs`。正式 `current/`、delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 及正式 package lineage 均不在本次範圍。工作區原有 `manifest.webmanifest` 修改保留且不納入提交。
- 全遊戲文字減半尚未證明或宣稱完成；春訓、行銷、球員市集等畫面仍含必要的選項、球員資料與數值。本輪只按可讀性稽核把高負擔說明改短，並將先發／教練資訊分頁；不以收合、刪除資料或多加裝飾圖示假稱減量。
- 2026-09-29，程式提交 `5340bf07688ff935ec4102b0e1b415e3ccac3166` 已推送 `main`；[GitHub Actions 建置與 Pages 部署](https://github.com/mars0884-chu/baseball-GM/actions/runs/36560099929)結果 `success`。部署剛結束時第一次查詢仍取得 r035 首頁；稍後以唯一查詢參數與 `no-cache` 重查，首頁、`06-ui-roster.js`、`05-ui-dashboard.js`、`02-finance.js`、`style.css`、`sw.js` 全部 HTTP 200，並分別確認 r036 shell、先發分頁、代理人規則、票價規則及 cache key 標記。公開版已更新；這不代表 Mars 真機／視覺接受。

## r035：長頁資訊分區與文字負擔整理

- 依 `renderScreen()` 路由表盤點 40 個畫面入口：`gameOver`、`setup`、`bootRecovery`、`teamSelect`、`gameModePick`、`tutorial`、`dashboard`、`standings`、`roster`、`playerDetail`、`playoffs`、`draft`、`awards`、`offseasonSummary`、`coaches`、`lineup`、`rotation`、`listing`、`wantMarket`、`tradeTeamSelect`、`tradeBuilder`、`finance`、`scouts`、`freeAgents`、`marketing`、`negotiation`、`financeCuts`、`contractRenewals`、`staffRenewal`、`directorRenewal`、`selfTraining`、`facilities`、`hallOfFame`、`agency`、`saveManager`、`dataCenter`、`internationalMarket`、`springCamp`、`springReport`、`intlTournament`。既有 r021–r030 逐項紀錄涵蓋主控台、戰績、名單、先發、球探／市場、財務、設施、行銷及春訓；本輪接續降低已確認長頁，不重做已完成項目。自動化多年度 renderer smoke 的一般畫面清單為 17 頁，另有多個情境畫面探查；它不是 40 頁逐一手機截圖稽核，故不把 route 清單數字說成視覺逐頁通過。
- 本輪延續處理已確認的高負擔管理頁：球場設施 12 種分 3 頁、每頁 4 種；訓練基地按 6 個專項切換，只呈現該類項目。行銷企劃 7 案分 3＋3＋1 頁；財務總覽分「營運／球迷／收支」。球員名單分投手／野手、每頁 8 人，野手仍可依捕手／內野／外野篩選。
- 球員詳情曾在窄手機量到 2,295px 長頁。自家現役球員改按「能力／成績／調度／人事」分區；非自家球員使用「能力／成績」。返回名單仍固定在操作列；能力、合約、狀況、傷病史、完整成績、隊長／特訓、升降級、轉任、釋出與確認取消入口均保留，頁籤只變更呈現，不改 Save 或模擬資料。
- 隔離瀏覽器以新 Service Worker cache key `v60-r035-player-management-tabs` 實測：球員四分頁於 320×844、390×844、1280×800 均可切換，文件寬度未超出 viewport；最長顯示頁分別為 1,235px、1,066px、986px。改職務選單後仍停在人事分頁；開啟釋出確認再取消，取消後原釋出入口仍在。上述高度來自隔離新局樣本，沒有拿不同球員狀態推算全遊戲減量百分比。
- 文字處理採「分組、視覺比較、分頁」而非 `<details>` 收合；遊戲規則、精確數據與操作均保留。40 個路由入口已盤點，但自動 renderer smoke 只覆蓋清單中的主要頁面與多個情境，不是 40 頁全數逐頁驗收。本候選沒有主張 40 個畫面每頁都同幅度減字，也沒有證據支持「全遊戲總文字已減少 50%」，故不宣稱達成該百分比。沒有為追求數字而刪除敘事、選項或年度結果等獨有內容。
- Regression：`node test_regression.js` 為 1,812 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面 renderer PASS；`node smoke_puregm.js` 純 GM 15 年 PASS。修改模組 `node --check` 與 `git diff --check` PASS。沒有修改 Save schema、遊戲平衡、模擬規則或核准美術。
- 本輪 Pages 程式：`02-finance.js`、`06-ui-roster.js`、`index.html`、`style.css`、`sw.js`、`test_regression.js` 與本部署紀錄。正式 `current/`、正式 delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 均不在本次範圍；工作區原有 `manifest.webmanifest` 修改不納入本次提交。
- 2026-09-28，程式提交 `266ed2c198bf734d0ed9ac7a9cb02d5df8606d20` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/36417516111)完成且成功。首次無快取查詢仍取得舊內容；等待建置後用新查詢再次確認首頁、`02-finance.js`、`06-ui-roster.js`、`style.css`、`sw.js` 全部 HTTP 200，並逐一找到 r035 cache／renderer／樣式標記。這證明公開靜態資源已更新，不等於 Mars 真機／視覺接受。

## r030：先發棒次手機能力卡與名單分頁

- 先發畫面在手機上改為每頁 3 人的球員卡，以六條百分制能力量尺呈現接觸、長打、選球、速度、守備與抗壓；精確數字、守位、棒次、移防扣分標記及既有手排操作均保留。9 名先發可逐頁檢視，桌面仍使用原完整數據表。
- 將先發能力與棒次移到教練戰術／隊長資訊之前，球員核心資料不必先滑過整段策略區才看到。這是先發單一畫面的手機編排與資料視覺化，不是刪除其他頁面資訊，也不宣稱全遊戲文字已減少 50%。
- 本機隔離瀏覽器的實際 375px 寬手機畫面已載入新 renderer：頁面呈現第 1/3 頁、每頁 3 人、六項數字與量尺，且教練策略區位於名單之後；Regression 另確認完整桌面表仍保留、翻頁換人及渲染不更動遊戲存檔。未以此取代 Mars 真機／視覺接受。
- 本輪程式：`06-ui-roster.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js` 與本部署紀錄；公開殼層及 Service Worker cache key 更新為 `v60-r030-lineup-paged-cards`。正式 `current/`、正式 delivery、Art ZIP、manifest、SHA 與 `CURRENT_PACKAGE.json` 均未修改；既有未提交 `manifest.webmanifest` 刻意保留且不納入本輪提交。
- 驗證：`node test_regression.js` 1,803 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面渲染 PASS；`node smoke_puregm.js` 純 GM 15 年 PASS；`node --check 06-ui-roster.js`、`node --check sw.js`、`node --check test_regression.js`、`git diff --check` PASS。Regression 實際執行 renderer，確認 9 人完整桌面表、手機每頁 3 人／18 個能力值、翻頁換人、移防星號及 `S` 不變。啟動時既有 v60-002 public-shell check 顯示 `NOT RUN`（固定模組解壓目錄不含公開部署目錄）；本輪另外直接核對公開 Pages。
- 2026-09-28，程式提交 `e86c7b6` 已推送 `main`。GitHub Pages 公開首頁、`06-ui-roster.js`、`style.css`、`sw.js` 的無快取複查均 HTTP 200，並各自含 r030 shell、手機 renderer、手機 CSS、Service Worker cache key 標記。推送後第一次立即請求曾先取得未含 r030 標記的舊首頁；稍後複查確認 Pages 已更新。正式包未改；既有 `manifest.webmanifest` 工作區修改未納入提交。公開資源更新不等同 Mars 真機／視覺接受。

## r029：行銷企劃共用成效矩陣

- 七項年度企劃由逐卡重複寫「人氣／周邊／進場」改成共用欄名、精確加成數字與相對量尺；企劃名稱、費用、所有效果、七個春訓投入／取消操作、已投入狀態都保留。明星代言的「人氣王再+2」條件留在該企劃列。
- 零加成改以空量尺表示，只在春訓頁提示一次「空白＝無加成」；球季中不再重複「本季已鎖定」，因上方交流／海外活動卡已有球季鎖定狀態。未以收合或隱藏必要規則替代資訊。
- 最終程式碼本機隔離瀏覽器，320px 手機內容寬 305px：文件寬 305px、矩陣寬約 273px／scrollWidth 271px；七列與七個投入操作完整，沒有水平溢位。1280px 桌面：頁面寬 1265px、矩陣寬 488px／scrollWidth 486px；七列與操作完整，沒有欄位裁切。投入「社群經營」後，預算 6000萬→5700萬元、摘要顯示 1 項且按鈕轉為「取消」。
- 以上是行銷單頁資訊編排與量尺化，不代表全遊戲文字減少 50%；沒有用不同遊戲階段的整頁字數作前後百分比比較。
- 本輪程式：`02-finance.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js` 與本部署紀錄；正式 `current/`、正式 delivery、Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 均未修改。
- 本輪驗證：`node test_regression.js` 1797 通過／0 失敗、`node smoke_multiyear.js` PASS、`node smoke_puregm.js` PASS；`node --check 02-finance.js`、`node --check sw.js`、`node --check test_regression.js` 與 `git diff --check` PASS。Regression 另確認 7 項方案／21 個效果格、費用與精確加成、明星條件、球季鎖定、投入操作，以及渲染不改 Save／不消耗亂數。
- 2026-09-28，程式提交 `bdf88a6` 已推送 `main`；[公開 Pages](https://mars0884-chu.github.io/baseball-GM/) 首頁、`index.html`、`02-finance.js`、`style.css`、`sw.js` 以無快取 GET 均回應 HTTP 200，且逐一確認 r029 HTML／renderer／CSS／Service Worker 專屬標記。此證明公開靜態資源已更新，不等同 Mars 真機／視覺接受。

## r028：春訓成果依軍別／六人分頁與手機成效卡

- 春訓成果原本一次列出 1 軍 28 人、2 軍 32 人；手機窄欄表格把人名、春訓項目與成效擠在同一列。現在先選 1 軍／2 軍，每頁最多 6 人；上下各有頁碼與上一頁／下一頁，全部 60 人仍能逐頁查看，不刪除訓練成果。
- 手機改用逐人卡片與主練／連動／特性增幅條；每項能力名稱與精確增加值仍直接呈現，零變化標示「維持」。桌面保留表格並新增春訓項目欄。切換軍別回到該軍第 1 頁；分頁狀態只寫入暫存 `UI`，不寫入 Save。春訓事件、摘要、結束入口、訓練資料與遊戲規則不變。
- 隔離瀏覽器實際 renderer，390×844 手機 viewport：r027 整份成果清單 4,416px／905 字；r028 初始 1 軍第 1 頁 2,036px／456 字，高度降低 53.9%、當頁可見文字降低 49.6%。此為每頁只呈現 6 人的閱讀／捲動負擔改善，其他球員仍可翻頁；不是刪除等比例資料，也不代表全遊戲文字已減少 50%。
- 390×844：第一頁 6 卡、第 1/5 頁共 28 人；按下一頁後人選更換為第 2/5 頁。切換 2 軍後為第 1/6 頁共 32 人，顯示 6 卡。320×844：文件寬度 305px 等於可用寬度，無水平溢位，手機卡片顯示、表格隱藏；春訓結束操作完整位於畫面寬度內。1280×800：桌面表格顯示，當頁 6 列；手機卡片容器隱藏。隔離瀏覽器錯誤 0。
- Regression fixture 確認 11 人按 6＋5 分頁、2 軍內容、主練／連動／特性及「維持」均保留、翻頁更換人選且 `S` 未改；沒有更動模擬、亂數、球員能力或 Save schema。
- 本輪程式：`05-ui-dashboard.js`、`06-ui-roster.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js`、本部署紀錄；靜態資源／Service Worker cache key 更新為 r028。正式 `current/`、正式 package、Art ZIP、manifest、SHA 與 `CURRENT_PACKAGE.json` 均未修改。
- 驗證：`node test_regression.js` 1,791 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面渲染 PASS；`node smoke_puregm.js` 純 GM 15 年 PASS；修改的 3 個 JavaScript `node --check` 與 `git diff --check` PASS。隔離瀏覽器頁面錯誤 0。2026-09-28，提交 `13fcd21` 推送 `main`；公開 Pages 首頁、兩支 UI 模組、CSS、Service Worker 皆 HTTP 200，無快取請求確認 r028 專屬 renderer／樣式／cache key 標記。這只證明公開靜態來源更新，不等於 Mars 真機／視覺接受。

## r027：財務赤字裁員候選分頁與年薪比較

- 延續《模擬職棒3》的管理分類原則：先看薪資總額與聯盟平均，再依守位篩選候選，並把釋出操作放在候選資料旁；只借資訊編排原則，不複製原作畫面、素材或玩法。
- 裁員候選維持原年薪由高至低排序，新增全部／投手／捕手／內野／外野篩選，每頁最多 8 人。60 名候選都仍可逐頁檢視；不是刪除資料或收合資訊。篩選、頁碼都只改暫存 UI，不寫入 Save。
- 原本一次顯示 60 列的桌面表格保留；手機改成球員卡，清楚呈現姓名、層級、類型、年薪、薪資比較條與「釋出」操作。縮短赤字說明，但仍明確說明釋出不回收轉會金，也保留承擔風險繼續的入口。
- 390×844 隔離瀏覽器：舊版一次列完 60 人為 3,241px／1,354 字；新版第一頁為 1,349px／416 字，分別減少 58.4%／69.3%。這是單頁改呈現 8 人所減少的同屏內容量，不是全候選總資訊刪減，也不代表全遊戲文字已減少 50%。
- 320×844：文件寬度 320px，無水平溢位；每張卡 68×48px 釋出按鈕，守位篩選按鈕至少 53×44px。捲至底部時最後球員卡完整顯示，且在繼續操作列上方。切下一頁由「幸利邦」換至「何建榮」；在第 8 頁切投手會回到第 1/4 頁、共 28 人。瀏覽器例外 0。
- 1280×800 桌面使用原表格，第一頁 8 列及 8 個釋出操作均存在；手機卡片隱藏。renderer 呼叫共享亂數 0 次；頁碼存在 `UI` 暫存層，不寫入 `S`，財務／釋出規則未改。
- 本輪程式：`02-finance.js`、`06-ui-roster.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js`；Service Worker／靜態資源版本更新為 r027。
- 驗證：`node test_regression.js` 1,787 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面渲染 PASS；`node smoke_puregm.js` 純 GM 15 年 PASS；相關 JavaScript syntax 與 `git diff --check` PASS。這些自動驗證不等同 Mars 真機／視覺接受。
- 本輪未變更素材、Save schema、正式 `current/`、外層正式 package、Art ZIP、manifest、SHA 或 `CURRENT_PACKAGE.json`。
- 2026-09-28，程式提交 `eef439d` 已推送 `main`；GitHub Pages 首頁、`02-finance.js`、`style.css` 與 `sw.js` 均回應 HTTP 200，分別確認 r027 查詢版本、手機裁員卡、薪資比較條與 Service Worker cache key 標記。這證明公開靜態資源已更新，不等同玩家瀏覽器互動驗收或 Mars 真機／視覺接受。

## r026：掛牌交易市場分頁與手機卡片

- 延續《模擬職棒3》的球團管理分類原則：名單依守位篩選、控制留在名單前方，並把操作放在球員資料旁；不宣稱複製原作網頁樣式、素材或玩法。
- 交易市場原本一次渲染 60 人，改成每頁最多 8 人。全部／投手／捕手／內野／外野篩選與球員總數保留；切換篩選回到第一頁。頁碼只有暫存 UI 狀態，不寫入 Save。
- 桌面維持表格；窄螢幕改用球員列卡，一卡呈現姓名、層級、類型／守位、年齡、年薪與掛牌／撤牌。掛牌中狀態與撤牌入口保留；報價類型、接受／拒絕所在入口及「掛牌不代表成交」說明縮短但未改交易規則。
- 390×844 隔離瀏覽器，同路由舊版全名單基準 3,992px／1,679 字元；新 renderer 第一頁 1,115px／353 字元，分別降低 72.1%／79.0%。此改善是單頁只呈現 8 人，全部 60 人仍可翻 8 頁檢視；不得解讀為刪除同等比例資料或全遊戲文字量已減少 50%。
- 實際 renderer：390px 文件寬度 390px；320px 文件寬度 320px；兩者每頁 8 張卡，操作按鈕 68×44px。320px 翻至頁尾後最後球員卡仍完整位於返回操作列上方。點擊下一頁由第 1/8 頁切至第 2/8 頁並更換球員；切投手後回到第 1/4 頁。掛牌後顯示「掛牌中／撤牌」，撤牌可返回原狀態。桌面 1280px 維持表格及掛牌操作。renderer 呼叫共享亂數 0 次，瀏覽器例外 0。
- 本輪程式：`06-ui-roster.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js`；更新 r026 靜態資源與 Service Worker cache key。修正並加強共用分頁器及 v60-014／v60-016 regression assertions。
- 本輪驗證：`node test_regression.js` 1,783 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面渲染 PASS；`node smoke_puregm.js` 純 GM 15 年 PASS；JS syntax 與 `git diff --check` PASS。Mars 真機／最終視覺接受不由自動化代替。
- 素材、Save schema、球員資料、報價／交易規則、模擬及正式 `current/` 未變更。
- 2026-09-28，程式提交 `63c8787` 已推送 `main`；GitHub Pages 首頁、`06-ui-roster.js`、`style.css` 與 `sw.js` 四項均回應 HTTP 200，回傳內容確認包含 r026 cache key／手機卡片 renderer／CSS／Service Worker cache key。本核驗證明公開靜態來源已更新，不等同公開瀏覽器互動或 Mars 真機／視覺接受。

## r025：球員名單依守位分頁（《模擬職棒3》經營分類原則延伸）

- 延續 r022／r024 對 PS2《模擬職棒3》的參考：只借用球團管理按人員／決策主題分區、資訊與操作相鄰的原則，不宣稱原作使用相同網頁分頁樣式，也不複製原作素材、文案或玩法。來源沿用 [SEGA 作品目錄](https://www.sega.jp/game/?page=32) 及 [PS2 攻略資料索引](https://www.sheepplus.com/yakyutsuku3/)。
- 球員名單原本「全部」同時展開整份投手表與野手表；改成各表每頁最多 8 人，頁碼直接顯示總人數，上一頁／下一頁控制保留 44px 觸控高度。此為呈現分頁，不是收合說明，也不刪球員、數據或升降軍操作。
- 投手、野手各自記錄暫時頁碼；守位篩選、排序、1軍／2軍／育成切換會重設合適頁碼。分頁狀態只留在暫存 UI，不寫入 Save；沒有模擬或名單規則變更。
- 驗證：`node test_regression.js` 1,780 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面渲染 PASS；`node smoke_puregm.js` 純 GM 15 年 PASS；三支相關 JS `node --check` 與 `git diff --check` PASS。Regression 以 11 人 fixture 確認每頁 8＋3 人且翻頁更換列；呈現狀態留在暫存 UI，不進 Save。
- 隔離瀏覽器以實際 renderer 檢查 390px、320px：頁面寬度皆未超出 viewport；手機數據表限於表格容器水平捲動；分頁放在表格前且按鈕可見，320px 實際按下一頁由 P1/P2 換為 P9/P10。名單區下方既有固定返回列不再遮住翻頁控制。
- 續約 renderer 以 320px、12 人待處理狀態實際呈現常駐規則與固定操作列（兩個 48px 按鈕）；清空待辦後實際呈現單一「前往選秀會」按鈕。測試使用隔離瀏覽器，不代表 Mars 真機驗證。
- 2026-09-27，r025 程式提交 `da7f55e` 已推送 `main`；公開 Pages 首頁、名單模組、財務模組、CSS 與 Service Worker 均回應 HTTP 200，並確認回傳 r025 cache key、每頁 8 人 renderer、續約摘要／固定操作列及 r025 SW cache key。這是公開靜態來源部署核驗，不等於公開瀏覽器互動或 Mars 真機／視覺接受。

## r024：先發管理資訊精簡（《模擬職棒3》內容結構參考）

- SEGA 官方目錄核對《プロ野球チームをつくろう！3》為 2005 年 PS2 作品；原作經營內容的次級資料索引將主場城鎮、球團企劃、球場／練習設施、春訓與育成分成明確的決策主題，企劃與設施資料會把選項連到效果。資料參考：[SEGA 作品目錄](https://www.sega.jp/game/?page=32)、[PS2《模擬職棒3》經營／設施索引](https://www.sheepplus.com/yakyutsuku3/)、[主場城鎮發展效果](https://www.sheepplus.com/yakyutsuku3/management/)。後兩者是玩家攻略整理，不冒充官方手冊或本機實機觀察。
- 本輪只借用「管理決策分類清楚、效果緊鄰操作」的資訊編排原則；將先發頁長篇規則說明改為同屏 4 個短決策提示：9人（8守位＋DH）、棒次與打席、守位不可重複、移防與守備折減。不移植原作圖文、球員資料或玩法，不改模擬規則／Save。
- 教練與手排切換顯示互斥 `aria-pressed` 狀態；重複說明縮短為「手排只維持當日，隔日由教練重排」。隊長提名說明縮短，效果與每季任命限制保留。只有實際有人移防時才顯示守備星號註解。
- 板凳替補不再把條件藏在摺疊段落，也移除效果重述；直接顯示健康非先發資格、3分內觸發與替補成績出口，代打／代跑／代守各自的觸發效果與能力重點緊鄰指派列。只重排資訊，不改替補發動規則。
- 這是單一先發管理畫面的局部文字整理，不等於全遊戲文字量減少 50%；全遊戲逐頁盤點與減量仍未完成。
- 本輪改動：`06-ui-roster.js`、`style.css`、`test_regression.js`、`index.html`、`sw.js`。`node --check 06-ui-roster.js`、`node --check test_regression.js` 與 `git diff --check` 通過。
- `node test_regression.js`：1,773 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。最終回歸另驗證先發 renderer 實際輸出常駐條件及板凳角色效果。
- 隔離瀏覽器使用實際先發畫面驗證：390px 與 320px viewport 的文件寬度都未超過 viewport；數據表保留 520px 內容寬，限於具名、可聚焦的表格區左右滑動。摘要、教練／手排狀態及實際移防註記均在 renderer DOM 出現；測試亦確認無移防時不顯示註記。之後的板凳文案只改模板文字，回歸會執行該 renderer；未對最終文字版本重新擷取截圖，亦非 Mars 視覺核准。
- 2026-09-27，r024 commit `1c56fba` 已推送 `main`；公開頁面、先發模組、CSS 與 Service Worker 均回應 HTTP 200，回傳內容含 r024 cache key 與更新後的先發／板凳文案。這是靜態來源核驗，不等同 Mars 視覺核准或公開頁瀏覽器互動驗收。

## r023：財務合約與戰績榜文字減量

- 轉播與贊助改成獨立工作頁籤；每類 3 個方案仍完整顯示保證金、戰績分潤、季後賽加碼、45%／55%／65% 三種收入試算，以及原簽約按鈕。不是摺疊：兩類決策有明確頁籤，切換後當類全部方案直接可見，六個簽約入口均保留。
- 六張方案卡不再各自重複三個條款名稱；欄名每組顯示一次，方案按鈕縮成「簽約／已簽」，仍有方案專屬完整無障礙名稱，觸控高度維持 44px。保證金、分潤、季後賽加碼與全部收入預估數值沒有刪除。
- 同一隔離新局、春訓、390×844 viewport，以 r022 提交為基準：單一合約類型同屏字數 520→270（-48.1%），文件高度 2605→1,144px（-56.1%）。字數與高度改善包含轉播／贊助分頁分流；不得將此比例宣稱為跨兩頁合計資訊量的等幅刪減。320px 窄螢幕無水平溢位，方案名與按鈕不重疊；兩個頁籤、六個方案及簽約入口均經瀏覽器互動檢查，頁面例外 0。
- 戰績榜頁首重複解說移除；聯盟、分組、打者排行及投手排行頁籤與全部排名數據保留。390×844 同隔離新局頁面由 260 字降至 218 字、頁高 955→917px。
- 探查 18 個主要路由時，先發打線頁在 390px viewport 的文件寬度達 519px；此項未在 r023 修改，列為後續手機版面檢查目標。選秀路由缺少實際選秀狀態，該筆探查不作為有效遊戲錯誤結論。
- `node test_regression.js`：1,770 通過／0 失敗；`node smoke_multiyear.js`（15 年＋全畫面渲染）與 `node smoke_puregm.js`（純 GM 15 年）均 PASS；JS 語法及 `git diff --check` 通過。
- 2026-09-27，程式提交 `1ee82df` 已推送 `main`；[公開 Pages](https://mars0884-chu.github.io/baseball-GM/) 頁面、CSS 與 7 個模組均回應 HTTP 200。隔離瀏覽器完成轉播／贊助切換，六案與簽約入口存在；320px 寬無水平溢位或按鈕重疊，瀏覽器例外 0。
- 全遊戲文字減半仍未完成；本輪僅完成財務合約與戰績榜兩處減量。合約頁同屏改善包含分類分頁，不能誤報成兩類方案合併後也減少 48.1%。

## r022：球探市場與球場設施資訊減量

- 以早期 PS2《プロ野球チームをつくろう！3》（《模擬職棒3》）的球團管理資訊分區作參照：讓球探職責、球員市場及決策入口一眼可辨；不複製其圖片、文案或玩法。本輪方向參考 [SEGA PS2 遊戲目錄](https://www.sega.jp/game/ps2/?page=3) 與 [官方完全攻略本書目](https://www.kinokuniya.co.jp/f/dsg-01-9784757724594)。
- 國際球員市場改為每頁兩人，共 22 人／11 頁；排序、守位篩選、球員完整估值、天花板、可信度、獨家人選說明與簽約按鈕均保留。每次只載入目前兩張卡，不是把完整球員資訊折疊或刪除。390×844 手機 viewport 中，單次市場頁高 14,170→1,777px；目前頁顯示 678 字，完整候選仍可分頁瀏覽。
- 每人重複的「球探評估／目前→天花板」長說明改為全頁共用一次圖例；球探室與自由球員市場保留職務、盲評後果、人才發掘條件、公開數據、預測屬性與簽約成本。390×844 字元數分別為球探室 339→262（-22.7%）、自由球員 248→188（-24.2%）；頁高分別 781→714px、642→597px。
- 球場頁將「附屬設施建造／已建管理」與「球場等級升級」分頁；12 種設施仍同頁可見，但改用雙欄精簡卡，保留效果、建設／年維護費及建造按鈕，無法建造時以高對比文字指出預算不足、球季鎖定或格位已滿。核准球場圖片及數值出口不變。390×844 球場頁字元數 1,051→788（-25.0%），初始建造頁高度 4,263→2,083px（-51.1%）；分頁、升級與建造按鈕都實際點擊驗證。320×844 版面改為單欄設施清單，無水平溢位。
- 談判頁既有球探天花板初始化原先在 render 時呼叫共享亂數；改用 `v46Fog` 確定性估值，不改球員能力或模擬結果。瀏覽器逐路由稽核確認談判頁渲染亂數呼叫為 0。
- 390×844 共 29 個路由逐一渲染：瀏覽器錯誤 0；候選版路由 render 未呼叫共享亂數。此輪之外多數介面尚未減量。
- 本輪 `node test_regression.js` 為 1,764 通過／0 失敗；`node smoke_multiyear.js`（15 年＋全畫面渲染）及 `node smoke_puregm.js`（純 GM 15 年）均 PASS；JS syntax 與 `git diff --check` 通過。
- 素材、Save schema、比賽模擬規則與正式 `current/` 未變更。全遊戲文字減半目標仍未完成；本輪聚焦球探室、自由球員市場、國際市場、球場設施及談判估值的渲染安全。

## r021：常用管理畫面文字減量

- r019 修正暫時名單超編誤鎖例行賽／季後賽：一軍 29/28、二軍或育成超額均保留提醒與名單入口，不再阻止世界推進；只有一軍沒有任何投手或野手時才阻擋模擬。
- 主題 PNG、人物頭像、隊徽、帽徽、場景圖與核准美術皆未重畫、壓縮或更換；r019 僅改名單規則、主控台／季後賽呈現與快取版本。
- r018 傷缺自選一升一降、信任不變；r017 春訓與行銷介面、r016 教練換位等既有功能照常保留。
- Service Worker 與公開資源查詢版本更新為 `v60-r021-textcompact`，讓瀏覽器取得本輪程式而不沿用舊 App Shell。
- 開季準備頁首常駐預算、上季實績、本季預估損益，並提供流程下一步、談約、票價、行銷、硬體、名單與春訓入口。
- 財務列使用唯讀預估，不補寫球員薪資欄位、不消耗共享亂數；票價畫面刪除與指標卡重複的資料列。
- 本輪移除主控台球場主視覺重複場名、春訓／行銷重複操作文案、先發／輪值／教練重複說明；規則與數據仍直接可見，不以折疊或新增裝飾圖示取代。固定種子、390×844 比較：主控台 6.8%、春訓 6.1%、行銷 1.9%、教練團 22.6%、先發 4.1%、輪值 13.2%。這些只是 13 個抽查路由中的部分畫面，不代表全遊戲完成。
- 修正財務分頁多餘的容器結尾，避免未選分頁內容漏到目前頁面；合約卡把重複的三情境長標籤改為共用欄名＋三筆金額，保證金、浮動條款、試算結果及簽約操作均保留。所選合約面板字元數 991→464（-53.2%）；所選票價面板 211→207（-1.9%）。財務總覽整頁可見字元 812→632（-22.2%），但原頁有分頁內容外漏，整頁字元差不能當作純文案減量。
- 13 個抽查路由合計仍非完整遊戲盤點；球員名單、設施、戰績等畫面本輪未減量。整體 50% 目標尚未完成，後續需繼續逐頁檢視，避免刪除必要數值或操作資訊。
- 公開資源版本更新為 `v60-r021-textcompact`；本輪未修改存檔格式、模擬規則、正式 `current/` 或 `CURRENT_PACKAGE.json`。
- 玩家資料保存在瀏覽器端；更新部署檔不會主動清除或改寫既有存檔。重新載入頁面後會讀取新版程式。
