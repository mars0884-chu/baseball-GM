# v60-r072 選秀跳過順位決策卡

- 2026-10-08 對 54 路由矩陣中的「選秀跳過確認」子畫面做資訊減量。原確認長句與三個按鈕重複敘述，改為兩個直接寫明後果的決策列：只跳過本順位、下一輪仍可選人；放棄本屆剩餘順位、自動跳到選秀結束。取消保留且不更動選秀。未新增裝飾圖示或改選秀規則、狀態結構、共享亂數。
- 固定情境 390px 可見字約 769→732、頁高 2,316→2,273px，長段落 53→0 字；320px 頁高 2,409px、1280px 2,181px。三寬度無水平溢位與頁面例外。實際瀏覽器點擊驗證取消不改選秀、單次跳過只前進一個順位、放棄剩餘順位後完成選秀；三按鈕高度 48／48／44px。證據：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r072-*-route-inventory.json` 與截圖。此為單一子畫面，不是全遊戲減量百分比。
- `node test_regression.js`：1,918 通過／0 失敗；一般 15 年＋全畫面渲染煙霧及純 GM 15 年煙霧均通過。正式套件與原有未提交 `manifest.webmanifest` 均不動。Pages 部署證據待推送後補記。

# v60-r071 育成名單方針比較與短頁

- 2026-10-08 以 54 個路由／子畫面的固定狀態矩陣稽核，育成名單原本把投手、野手同一方針說明重複寫兩次，返回鈕浮在名單下方且可能遮擋操作；導覽標籤也錯顯示為一軍。現改正育成導覽、合併相同說明，方針並排並以兩格呈現原有均衡與專項倍率；原兩個獨立選單及資料寫入保留。返回鈕移至頁首，320px 方針選單改單欄避免文字截斷。
- 固定情境 390px 可見字約 506→465、頁高 1,275→1,182px；320px 1,317px、1280px 1,205px。三寬度無水平溢位與頁面例外，320px 截圖確認選單全文可讀。證據：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r071-*-route-inventory.json` 及相應截圖。這是育成子畫面結果，不是全遊戲文字減量百分比；矩陣僅覆蓋固定模擬狀態，未涵蓋所有存檔組合。
- `node test_regression.js`：1,917 通過／0 失敗；一般 15 年＋全畫面渲染煙霧、純 GM 15 年煙霧均通過。新增測試覆蓋育成導覽、同／不同方針說明、兩選單與返回。正式套件及原有未提交 `manifest.webmanifest` 均不動。
- 程式 commit `f77f43a52bbf110a84566123d871eb1a9b54ed0c` 已推送 `main`；[Pages build 37762681013](https://github.com/mars0884-chu/baseball-GM/actions/runs/37762681013) 對應該 commit 且 `completed/success`。公開 `index.html`、`06-ui-roster.js`、`style.css`、`sw.js` 使用獨立查詢參數與 `no-cache` 實際 GET 均為 HTTP 200，且各含新快取鍵或育成方針標記。公開部署不等於 Mars 真機接受。

# v60-r070 選秀養成／生涯階段緊湊呈現

- 2026-10-07 接續選秀雙人對照後，兩名候選卡仍各有養成與生涯的長句。將標準成熟度的完整語意轉成短階段資訊：長期養成約 4–6 年、潛力新秀約 3–5 年、即戰力成長有限且較快可上一軍；生涯仍標示成長、顛峰或衰退，保留顛峰年齡及長青型衰退較慢的差異。這些資訊直接置於已核准的「目前數據／未來天花板」卡內，不增第三排卡片、不改 `p.maturity` 或 Save；舊存檔特殊成熟度原文維持原樣。
- 先試獨立階段雙卡時，390px 可見字 745→709，但頁高 2,174→2,184px，因加高頁面而未採用；改為併入原評等卡後，固定情境 390px 約 697 可見字／2,108px。320px 2,209px、1280px 2,015px，無橫向溢位與頁面例外；兩候選肖像、雷達、全部逐項估值、四類比較及選擇／翻頁操作仍可用。證據：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r070-draft-*-route-inventory.json` 與截圖。這是單頁改善，非全遊戲減量完成。
- `node test_regression.js`：1,916 通過／0 失敗，涵蓋三種標準養成時程、顛峰年齡、特殊舊值保留與不改 `S`；一般 15 年＋全畫面渲染煙霧、純 GM 15 年煙霧均通過。正式套件與原有未提交 `manifest.webmanifest` 不動。
- 程式 commit `fe2673fd73918d620c08933a19d31663a9a110fb` 已推送 `main`；[Pages build 37609913778](https://github.com/mars0884-chu/baseball-GM/actions/runs/37609913778) 對應該 commit 且 `completed/success`。公開 `index.html`、`06-ui-roster.js`、`style.css`、`sw.js` 以獨立查詢參數與 `no-cache` 實際 GET，四者皆 HTTP 200 且含預期標記。公開部署不等於 Mars 真機接受。

# v60-r069 選秀雙人逐項能力共享比較

- 2026-10-07 固定有效選秀情境的 390px 畫面約 839 可見字／2,398px 高。原先兩張候選卡分別列出同名逐項能力，現在保留核准肖像、雙層雷達、現況／天花板評等、球風、成熟度、選擇按鈕與每頁兩人，將所有原逐項球探估值改為一張共用欄名的雙人對照。核心、對位／跑壘、守備／捕手、體能／球路四類皆可觸控切換，原數值不刪除，也不新增裝飾圖示。
- 同一情境 390px 約 745 可見字／2,174px；320px 2,277px、1280px 2,055px，三寬度無橫向溢位或頁面例外。瀏覽器驗證兩候選卡、四類皆可切換、雙人分頁可到達且頁籤切換不更動 `S`。證據：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r069-draft-*-route-inventory.json` 與三寬度截圖。此是單頁改善，並非全遊戲減量百分比；情境入口本身存在既有選秀 lazy state 初始化，不能把該狀態變更誤說成本次分頁副作用。
- `node test_regression.js`：1,914 通過／0 失敗，含共用比較全部原估值、原兩人分頁／雷達與不改 `S` 的斷言；一般 15 年＋全畫面渲染煙霧、純 GM 15 年煙霧均通過。正式套件與原有未提交 `manifest.webmanifest` 不動。
- 程式 commit `257cffa48d24cb0a84bda541d04d4eb8bab3700c` 已推送至 `main`；[Pages build 37608701227](https://github.com/mars0884-chu/baseball-GM/actions/runs/37608701227) 對應該 commit，`completed/success`。公開 `index.html`、`06-ui-roster.js`、`test_regression.js`、`sw.js` 以獨立查詢參數與 `no-cache` 實際 GET，四者皆 HTTP 200 且含預期標記。公開部署不是 Mars 真機接受。

# v60-r068 休賽季讀檔回到未完成關卡

- 修正已有本季春訓資料的休賽季存檔重開時，仍被舊的摘要還原條件攔回休賽季摘要。現在僅在尚未建立本季春訓時回摘要；已有資料依未完成的談約、票價、行銷、硬體、名單或春訓狀態還原。完成站點直接銜接下一站；保留未投入、不建造、不調價等玩家明確選擇，不自動花費或更動名單。
- 回歸新增真實 `hydrateLoadedState` 入口測試並調整歷史「尚未建立春訓」前提；第一次完整重跑因舊測試前提不符為 1,910 通過／1 失敗，調整後 1,911／0，加入新讀檔斷言後最終為 1,912／0。一般與純 GM 15 年煙霧均通過。此為 GitHub 網頁版工作區修正，正式套件未變更。
- 程式推送：`c49974a192b98e70ccb28fa833c8125ab722a7bb`；[Pages build 37607150415](https://github.com/mars0884-chu/baseball-GM/actions/runs/37607150415) 對應該 commit 且 `completed/success`。公開 `index.html`、`06-ui-roster.js`、`05-ui-dashboard.js`、`sw.js` 使用獨立查詢參數與 `no-cache` 實際 GET，四者均 HTTP 200 且包含 r068／春訓短頁預期標記。公開部署不等於 Mars 真機接受。

# v60-r067 春訓訓練名單短頁與出發操作

- 2026-10-07 的 41 路由固定情境再稽核顯示春訓頁在 390px 仍約 1,562px 高，且固定「確認出發春訓」鈕會蓋住球員訓練列。現將一／二軍各守位名單改為每頁四人，訓練限制與出發操作移至名單前的正常版面，名單上下均可翻頁。保留核准春訓基地圖、地點／費用／預算／等級／專長、每位球員現況／天花板、全部訓練選項、AI 全員建議及原開季準備守門。未靠收合或刪除資料減字。
- 390px 固定情境：當頁可見文字估計 340→300 字，頁高 1,562→1,425px；320px 1,508px、1280px 1,562px，三種寬度皆無水平溢位或頁面例外。瀏覽器逐頁到達一軍 28 人／7 頁、守位投手篩選正確、訓練選項變更確實寫入 `S.springCamp.assignments`；單純翻頁不變更 `S`，出發鈕有事件，無固定浮鈕遮擋。證據：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r067-*-route-inventory.json` 與三寬度截圖。這是當頁閱讀分流，不是全遊戲減量比例；全路由情境稽核仍有部分未達可玩的完整狀態，不能冒充全遊戲驗收。
- 首次新增回歸斷言錯把簡化測試沙盒當成真實 DOM 查詢，結果 1,909 通過／1 失敗；修正斷言為沙盒可驗證的 HTML 與事件後，`node test_regression.js` 完整重跑為 1,910 通過／0 失敗。一般 15 年＋全畫面渲染煙霧與純 GM 15 年煙霧均通過。正式套件及原有未提交 `manifest.webmanifest` 未動。此批與 r068 同一程式 commit 推送，公開驗證見上。

# v60-r066 財務裁員決策與候選名單短頁

- 2026-10-06 實際 390px 赤字情境顯示「自行承擔風險繼續」固定操作鈕會浮在候選球員卡上，且原每頁八人需長捲動。將兩種原有決策移到財務摘要後，取消本頁固定浮鈕；候選改每頁四人，名單上下均可翻頁。保留赤字說明、目前與聯盟平均薪資、全部球員、薪資比較條、釋出操作及承擔風險分支，不新增機制或刪除資料。
- 固定有效赤字、薪資偏高、60 名球員的 390px 情境：當頁可見文字估計 357→289 字，頁高 1,349→1,100px。320px 1,183px、1280px 960px，三種寬度均無水平溢位或頁面例外。瀏覽器逐頁翻完 15 頁取得 60 個不同球員，翻頁不改 `S`；實際釋出第一名後名單 60→59，風險分支仍有事件連結，無固定按鈕遮擋。證據：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r066-*-route-inventory.json` 與 320／390／1280px 截圖。這是本頁每次閱讀分流，非全遊戲減量比例。
- `node test_regression.js`：1,909 通過／0 失敗，涵蓋 11 人 4＋4＋3 頁、原兩決策與位置；一般 15 年＋全畫面渲染煙霧、純 GM 15 年煙霧均通過。正式套件及原有未提交 `manifest.webmanifest` 未動。
- 公開推送：`718fb0976efb7fee291fd9129d22409694568236` 已上傳 `main`；[Pages build 37604894568](https://github.com/mars0884-chu/baseball-GM/actions/runs/37604894568) 對應同一 commit，結果 `completed/success`。公開 `index.html`、`02-finance.js`、`05-ui-dashboard.js`、`style.css`、`sw.js` 以獨立查詢參數及 `no-cache` 實際 GET，五者皆 HTTP 200 且含 r066 預期標記。公開部署不等於 Mars 真機驗收。

# v60-r065 選秀同頁球探評估去重與長頁盤點

- 2026-10-06 實際手機盤點發現新人選秀會仍是高閱讀負擔畫面（390px 約 848 可見字、2,415px 頁高），兩名候選人若有相同球探信心，原本逐卡重複顯示。現改在當頁名單上方顯示一次共通評估；若評估不同，各卡仍分別顯示。已核准雷達、肖像、目前數據／天花板、逐項能力及兩人分頁均保留，未隱藏判斷資料或改變選秀規則。
- 固定情境 390px 候選約 839 可見字、2,398px；320px 2,586px、1280px 2,231px，三寬度無水平溢位或頁面例外，下一頁可到達並更換兩名候選人。此批只去除一處重複，**不是全遊戲或整個選秀頁完成**。國際球員市場已實際檢查肖像、國旗、兩人分頁及能力比較，未為湊減字數移除必要簽約資料。情境證據：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r065-*-route-inventory.json` 與選秀手機截圖；長路由盤點仍有情境初始化限制，交易畫面的稽核已補入有效對手，不能把先前安全模式畫面當正式交易頁。
- `node test_regression.js`：1,908 通過／0 失敗，含同評估與不同評估兩種真實渲染斷言；一般 15 年＋全畫面渲染煙霧、純 GM 15 年煙霧均通過。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 與原有未提交 `manifest.webmanifest` 均未修改。公開推送與 Pages 驗證另記。
- 公開推送：`b06d26a4fd9ca38732e72f405c1ed213f0b23aa8` 已上傳 `main`；[Pages build 37453150185](https://github.com/mars0884-chu/baseball-GM/actions/runs/37453150185) 對應同一 commit，結果 `completed/success`。公開 `index.html`、`06-ui-roster.js`、`test_regression.js`、`sw.js` 以獨立查詢參數和 `no-cache` 實際 GET，四者皆 HTTP 200 且含 r065 預期標記。公開部署不等於 Mars 真機驗收。

# v60-r064 球場建造長頁減量與操作遮擋修正

- 2026-10-06 全路由情境盤點後先檢查國際球員市場（已每頁兩人，現況／天花板及能力比較分組），再處理手機更長、且返回鈕浮在數據上的硬體建設頁。球場附屬設施建造由每頁四種改為兩種，12 種仍可翻完六頁；保留核准球場圖、完整效果、建設／維護費、可建條件及實際建造操作。硬體頁頁末返回鈕不再浮在中間遮擋球場數值。
- 固定春訓可操作、預算 6000 萬的 390px 情境：當前頁可見文字估計 396→316 字，頁高 1,553→1,359px；320px 候選頁高 1,608px、1280px 1,217px，三種寬度皆無水平溢位或頁面例外。瀏覽器實際翻六頁取得 12 種不同設施，翻頁不改遊戲存檔，按「建造」則真正增加一格設施並扣除預算。此為當前頁閱讀分流，不等於刪除設施資料或全遊戲減量比例。證據：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r064-*-route-inventory.json` 與對應 390px 截圖。國際球員市場仍列為後續逐頁改善，不因本批檢查而標記完成。
- `node test_regression.js` 最終重跑 1,907 通過／0 失敗；一般 15 年＋全畫面渲染煙霧及純 GM 15 年煙霧均通過。第一次回歸啟動時仍載入舊版 r063 斷言，為 1,905 通過／1 失敗；更新斷言後才取得上述最終結果，未將首次失敗冒充通過。正式套件、`current/` 及原有未提交的 `manifest.webmanifest` 未動。
- 公開推送：`8f0142012932eda29b79fbca0ab33f6beb4712aa` 已上傳 `main`；[Pages build 37451082063](https://github.com/mars0884-chu/baseball-GM/actions/runs/37451082063) 對應同一 commit，結果 `completed/success`。公開 `index.html`、`02-finance.js`、`05-ui-dashboard.js`、`sw.js` 以獨立查詢參數及 `no-cache` 實際 GET，四者皆 HTTP 200 且含 r064 預期標記。公開部署不等於 Mars 手機驗收。

# v60-r063 休賽季結算與退休決策分區

- 2026-10-06，以新局進入實際 `enterOffseason()` 結算後的固定亂數情境量測，原本休賽季摘要在 390px 首屏同時堆放年度財務／任務與兩名退休球員卡：可見文字估計 500 字、頁高 2,011px。改為「年度結算／退休球員」兩個明確頁籤，後者顯示待檢視人數；預設結算頁 187 字、1,131px，退休頁仍保留兩人分頁、完整能力數值、留任及指派教練操作。此為單次畫面閱讀量分區，**不是跨頁資料刪除或全遊戲 50% 減量證據**。
- 手機原固定前進鈕會蓋住財務結算卡；此頁取消重複固定操作列，保留頁首「待辦」及頁末原有入口。320／390／1280px 瀏覽器均實際切兩頁籤、翻退休名單下一頁、留任球員；切頁不改正式 `S`，留任操作仍真正更新名單，無水平溢位或 JS 例外。樣本結算情境及截圖：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r063-*-route-inventory.json` 與對應 PNG。分析主管續約、春訓成果的先前錯誤跳頁稽核情境亦已補正並重測，但不計入本批文字減量。
- 休賽季摘要含退休留任／轉教練等玩家可選決定，故本批沒有擅自把結算畫面跳過或自動開始選秀；完成決定後仍由原入口進入下一階段。已完成的開季準備站與賽程守門維持原行為。Mars 真機、全遊戲逐頁覆蓋及全局減量成效仍未結案。
- `node test_regression.js`：1,906 通過／0 失敗；`node smoke_multiyear.js`：一般 15 年及全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 及既有未提交 `manifest.webmanifest` 均未修改。公開推送與 Pages 驗證另記。
- 公開推送：`121582e6de3dc4c49b3745c002011f72e8c9ec90` 已上傳 `main`；[Pages build 37449593022](https://github.com/mars0884-chu/baseball-GM/actions/runs/37449593022) 對應同一 commit 且 `completed/success`。公開 `index.html`、`05-ui-dashboard.js`、`style.css`、`sw.js` 以獨立查詢參數與 `no-cache` 實際 GET，四者皆 HTTP 200 且含 r063 預期標記。公開部署不等於 Mars 手機驗收。

# v60-r062 行銷決策分區與國際活動操作修正

- 2026-10-05，重新稽核路由字數時發現舊量測將未展開的 `<select>` 選項全部算入可見文字：390px 春訓原 741 字含 401 字隱藏選項，行銷原 768 字含 400 字隱藏國家選項。後續優先順序使用「目前可見文字估計值＋頁高＋實際操作」；完整每頁及情境覆蓋仍未完成。
- 行銷保留核准的企劃中心、國際交流與海外行銷三張場景，將年度企劃和國際交流／海外行銷分為兩個明確決策頁籤。三案分頁、企劃費用／成效、國家友好度、活動費用／機率及操作均留在原位，不用摺疊或刪除必要資訊。固定 390px 情境：年度企劃的當前可見文字估計由 368→232 字、頁高 1542→1024px；國際活動頁 233 字／1162px。這是路由當前畫面的閱讀負擔，不等於全遊戲刪字比例。
- 瀏覽器另重現原國際活動卡內 `sticky` 執行鈕與國家選單重疊；兩個鈕改回卡內正常排版，返回移至頁首，避免內容被固定按鈕遮蓋。320px 國際頁兩案改單欄、國家選單至少 44px 高且 14px 字；390／1280px 保持雙欄。三種寬度的年度／國際頁均無 JS 例外與水平溢位；分頁切換、企劃翻頁、國際兩張 1254px 圖載入、兩個國家選單及執行鈕接線、上下無重疊均驗證。瀏覽與翻頁不新增正式 `S` 異動；初次渲染既有的 `teams`／`cdActivities` 初始化仍存在。證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r047_route_inventory.js` 與 `browser-proof/v60-r062-*-route-inventory.json`。
- `node test_regression.js`：1,904 通過／0 失敗；`node smoke_multiyear.js`：一般 15 年及全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。正式套件與既有 `manifest.webmanifest` 未動；Mars 真機待驗收。
- 公開推送：`e159bd09400be69c4d272104ca44442f4091539f` 已上傳 `main`；[Pages build 37447954380](https://github.com/mars0884-chu/baseball-GM/actions/runs/37447954380) 對應同一 commit 且 `completed/success`。公開 `index.html`、`02-finance.js`、`05-ui-dashboard.js`、`style.css`、`sw.js` 以獨立查詢參數與 `no-cache` 實際 GET，五者皆 HTTP 200 且含 r062 預期標記。此為部署／公開檔案證據，不等於 Mars 真機驗收或全遊戲文字減量結案。

# v60-r061 選秀進行中畫面減量與逐頁稽核修正

- 2026-10-05，以可重現的固定選秀池比較 `HEAD` 與候選：390px「選秀進行中」由 944 字／2516px 降至 868 字／2415px。頁首三列改為輪次、球隊、球探準度摘要；移除與雷達圖例、現況／天花板圖框重複的句子。保留兩人分頁、全部球探能力估值、雷達六軸精確數值、人物肖像、選人及放棄操作。這僅是該路由的局部減量，**不代表全遊戲已達 50%**。
- 現行 41 個合成路由／情境的盤點中，`directorRenewal` 未建立待續約狀態而轉到選秀，`springReport` 未建立成果狀態而轉到主控台；兩者都不可算該頁驗證通過。`draftActive` 補上真實進行中狀態，舊版僅稽核已結束空狀態。`draft` 在渲染／翻頁時有既存的 `S.draft` 球探估值快取寫入，基準與候選相同；本批未新增該行為。盤點只用於決定下一批優先順序，不作全遊戲結案證據。證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r047_route_inventory.js` 與 `browser-proof/v60-r061-*-route-inventory.json`。
- `node test_regression.js`：1,900 通過／0 失敗；一般及純 GM 15 年煙霧均通過。320／390／1280px 瀏覽器選秀頁均無例外或水平溢位，第二頁可達且人選改變；翻頁時觀察到的 `S.draft` 球探估值快取寫入與基準一致，不是本批新增。正式套件與既有 `manifest.webmanifest` 未動；Mars 真機待驗收。
- 公開推送：`fb2129d` 已上傳 `main`；[Pages build 37299297173](https://github.com/mars0884-chu/baseball-GM/actions/runs/37299297173) 對應該 commit 且成功完成。公開 `index.html`、`01-data-engine.js`、`06-ui-roster.js`、`style.css`、`sw.js` 皆 HTTP 200，並含本批預期標記。這是部署及公開檔案證據，不等於 Mars 真機接受。

# v60-r060 名人堂非空長頁分區

- 2026-10-05，接續全遊戲文字量稽核，發現名人堂空館僅約 130 字，無法代表長期經營後的非空狀態。以遊戲新局實際球員組成 10 人殿堂的隔離測試情境（入選年份／生涯累計為測試資料，非玩家真存檔）量測：390px 手機原單頁 802 可見字元、4,053px 高，10 張成員卡及雷達圖全部連續排列。現成員每頁 2 位，共 5 頁；390px 第一頁約 297 字、1,823px，高度減約 55.0%。此減量主要來自分頁，不能當作跨頁資料總量減少或全遊戲減半的證據。
- 保留全部 10 位成員、原有能力雷達、3 個退休背號及 7 位可執行的退休背號操作；刪除與摘要量尺重複的人數標籤，空館仍保留「達標後自動提名」的觸發條件。既有雷達圖數值不變，只增大名人堂卡上的標籤、改深色並避免邊緣裁字。共用分頁狀態只寫 `UI`，不修改存檔 `S`、模擬或美術圖片。`node test_regression.js` 1,897 通過／0 失敗；一般與純 GM 的 15 年煙霧均通過。320／390／1280px 瀏覽器五頁均可達、實際退休背號操作成功、`S` 於瀏覽與翻頁時不變、圖片載入成功、例外及橫向溢位皆 0；證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r060_hof.js`、`browser-proof/v60-r060-hof-390.png`。Mars 真機與全遊戲總量仍待驗收。
- 程式提交 `b80b149` 已推送 `main`；[Pages build 37296621932](https://github.com/mars0884-chu/baseball-GM/actions/runs/37296621932) 以該 SHA 成功完成。公開 `index.html`、`06-ui-roster.js`、`style.css`、`sw.js` 均 HTTP 200 且各自含 r060 分頁／樣式／快取標記。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 均未修改；原有未提交 `manifest.webmanifest` 不納入。

# v60-r059 開季賽程入口守門

- 2026-10-04，Mars 指出不能靠記得按「下一步」才維持休賽季順序，也不能漏項後直接春訓開季。既有逐站 UI 會導向漏項，但三個 `doSimulate*` 賽程入口原本直接呼叫 `simulateDay`，未做開季前置檢查。現於玩家賽程入口共用守門：第 0 比賽日若裁員、續約、選秀、準備五站或春訓未完成，先回待辦／第一個漏項；不推進日期、賽果或預算。春訓完成並有同年度完成記錄後才可進入賽程。行銷及硬體仍是可連續操作的配置站，玩家明確選擇完成／維持現況後即自動轉下一站，不會因第一次投資而偷跳。
- 本批新增回歸入口測試；`node test_regression.js` 1,895 通過／0 失敗，`node smoke_multiyear.js` 15 年＋全畫面渲染通過，`node smoke_puregm.js` 純 GM 15 年通過。320／390／1280px 瀏覽器實際呼叫三種賽程入口、走五站並執行春訓，皆證明未完成時無賽程或財務改動、完成後才抵達春訓成果；頁面例外 0、無水平溢位。舊存檔若已記錄本季春訓完成但未保存春訓物件，不被迫倒退。證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r059_season_gate.js`。公開快取鍵 `v60-r059-season-gate`；Mars 真機仍待確認；正式包及原有 `manifest.webmanifest` 不動。
- 公開推送：`b1b73ab`（r058）與 `45b0249`（r059）已上傳 `main`；[Pages build 37294362292](https://github.com/mars0884-chu/baseball-GM/actions/runs/37294362292) 以 `45b0249` 成功完成。公開 `index.html`、`04-state-core.js`、`01-data-engine.js`、`02-finance.js`、`06-ui-roster.js`、`sw.js` 均 HTTP 200，且各自含本批預期標記。這是部署與程式證據，不等於 Mars 真機接受。

# v60-r058 分析主管續約報價定案與比較

- 實際資料流稽核：`v55ProcessAnalysisDirectorContract()` 在合約到期時只設定待辦；原 `renderDirectorRenewal()` 每次呼叫 `randInt` 兩次抽年薪／年限，重畫文字會變且消耗模擬共享亂數。此批在合約到期時產生一次報價，存入現任主管的 `renewalOffer`；有效同年度報價不覆寫，接受後清除報價、拒絕後主管離隊。報價範圍維持原年薪調整 -20～+30 萬、50～300 萬上限與 1～3 年，不改其他經濟規則。
- 舊存檔若已在主管續約關卡但無報價，共用 `hydrateLoadedState()` 以主管身分與年度的確定性雜湊補一次，不在渲染時抽亂數；保留已有的有效報價，補值後於 hydrate 完成時寫入 IndexedDB。此次瀏覽器驗證發現「解職邀約補值旗標覆寫主管補值旗標」會造成未持久化，已一併修正。讀檔後能回主管續約頁；缺報價的異常直入頁提供明確重建入口而不默默改價。
- 重複的姓名、年薪及按鈕報價文字改為「現約年薪／新約年薪與年限」比較；原先無資料的「等級 ?」改用真實情報、校正、警訊能力。390px 可見字元 103→76，但為保留三項真實能力，頁高 423→445px；這是決策清晰度與報價穩定性改善，不冒稱長頁改善或全遊戲文字減半。
- 隔離瀏覽器在 320／390／1280px 驗證重畫亂數呼叫 2→0、文字及 `S` 穩定、按鍵至少 48px、無橫向溢位或頁面例外；舊存檔經實際 IndexedDB 重新載入後，補入報價能持久化，接受與不續約兩路均正確。證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r058_director.js`、`browser-proof/v60-r058-director-{baseline,candidate}.json` 與三種寬度截圖。
- 本批只修改公開 GitHub 工作樹，不動正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json`，也不納入使用者原有未提交的 `manifest.webmanifest`。Mars 真機及全遊戲總量驗收仍待完成。快取鍵 `v60-r058-director-terms`；`node test_regression.js` 1,894 通過／0 失敗，兩種 15 年煙霧均通過；公開 Pages 狀態於部署後定案。

# v60-r057 春訓成果單屏資訊減量

- 以完成新局、選秀、五站開季準備及實際 `executeSpringCamp()` 的狀態稽核成果頁；原 390px 第一頁為 1,942px／293 個可見字元，增幅字體 12px。續約頁也用 12 位真實到期球員稽核：390px 約 850px／272 字元，故本批不為它增加無必要的分頁。
- 春訓成果改每頁四人；核准春訓基地圖與「地點／花費」排成同一張摘要卡，圖片 `object-fit:contain`、未裁主體；刪掉與頁標重複的「春訓成果」圖卡標題。主要增幅、連動與特性數值照常顯示，手機增幅字體提高至 14px，事件、軍別、完整球員名單與開季操作不變。瀏覽器在 320／390／1280px 均實際逐頁走完一軍 28 人、二軍 32 人，切軍別不改存檔，圖片成功解碼、無水平溢位或例外，最後「迎接開幕戰」仍可進主控台。
- 同一固定情境，390px 第一頁 293→236 個可見字元、頁高 1,942→1,337px；320px 1,909→1,374px。可見字元下降主要含四人分頁及移除重複標題，不代表全名單資料被刪，更不代表全遊戲 50% 已完成。證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r057_spring_report.js`、`browser-proof/v60-r057-spring-report-{baseline,candidate}.json` 與三種寬度截圖。
- `node test_regression.js`：1,891 通過／0 失敗；一般 15 年＋全畫面、純 GM 15 年煙霧測試均通過。`directorRenewal` 舊版已證實重畫會重新抽報價，屬另一項高風險狀態缺陷，未在本批藉文字減量修改；應先建立定案與舊存檔方案再修。Mars 真機／主觀驗收、全遊戲逐頁減量仍待完成。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 不動，原有未提交 `manifest.webmanifest` 不納入。本批公開快取鍵 `v60-r057-spring-report`；推送及公開 Pages 驗證另記。
- 2026-10-04 程式提交 `1711b650adf8d6cdbf933777c13b060892d5c0e9` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37190017185) 為 `completed/success`。公開 `index.html`、`05-ui-dashboard.js`、`style.css`、`sw.js` 使用唯一查詢參數與 `no-cache` 實際 GET 均為 HTTP 200，核對新快取鍵、四人分頁、圖與資料同卡及 14px 樣式標記。已安裝手機 PWA 是否切到新版本仍待 Mars 真機確認。

# v60-r056 休賽季資訊減量與逐站銜接候選

- 休賽季退休球員改每頁兩人；四人情境在 390px 的目前頁可見字元 1,930→1,076、頁高 3,000→2,243px。其餘球員仍可翻頁查看、留任或指派教練；這是降低單次閱讀量，不是宣稱刪掉 854 字或全遊戲文字減半。代理人事務所未更動。隔離瀏覽器在 320／390／1280px 檢查翻頁、第二頁留任、無水平溢位與頁面例外；證據位於 `_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r056-*`。
- 流程稽核確認選秀最後一項原已能自動進開季準備，談約／票價／行銷／硬體／名單各有逐站狀態；補齊財務裁員達標後自動前進，以及舊選秀成果頁按鈕走同一守門入口。未達標裁員仍停在原站；行銷不投入、硬體不建造、名單確認及春訓地點屬玩家決策，仍須明確確認，不能為了省按鍵而擅自略過。直接執行春訓仍會因未完成準備被擋下；舊版「下一步」畫面可能是離線快取，需待新版實際部署及手機重新開啟驗證。
- 本候選回歸測試 1,890 通過／0 失敗，15 年一般及純 GM 煙霧測試均通過；Mars 真機與主觀驗收未完成。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 未動，原有未提交的 `manifest.webmanifest` 不納入。公開快取鍵 `v60-r056-offseason-retired-pages`。
- 2026-10-04 程式提交 `e693542befd04ccb8ed58b296687d42948224cd6` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37189049694) 為 `completed/success`。公開 `index.html`、`02-finance.js`、`05-ui-dashboard.js`、`06-ui-roster.js`、`sw.js` 使用唯一查詢參數及 `no-cache` 實際 GET 均為 HTTP 200，並分別核對新版快取鍵、裁員自動銜接、退休名單分頁與舊選秀頁守門標記。已安裝 PWA 仍須重新開啟並確認取得新版；Mars 真機驗收未完成。

# v60-r055 解職／東山再起決策頁減量

## r055：聘僱卡可讀、關鍵後果可掃讀、邀約不在畫面渲染時重抽

- 以新局、春訓、年度 KPI 失敗、`enterOffseason()` 的實際結算入口建立解職狀態，對比 320／390／1280px renderer。原聘僱卡「接受」按鈕繼承 `width:100%`，擠壓隊名成直排，是手機長頁主因；改為卡內「球團與條件／接受」兩欄，保留球團、委任、起始信任與戰力資訊，按鈕至少 48px。一般「結束遊戲」不再浮在邀約與沉潛選擇上方。
- 解職新聞稿式重複敘事與末尾裝飾句刪除；「東山再起僅一次、接手現有陣容、生涯戰績延續、再次解職永久出局」和「沉潛一年僅一次、聯盟照常運轉、聲望 +5、邀約重抽與範圍擴大」集中在對應決策卡。生涯各項數據、年度表及三類操作保留。此情境下可見字元 399→281（-118，約 29.6%）；390px 頁高 1,755→1,147px（-608px），320px 1,843→1,228px；不推論其他情境或全遊戲比例。
- 原 `renderGameOver()` 在 `jobOffers=null` 時抽共享亂數產生邀約且未立即持久化。新解職改於休賽季結算後定案並隨狀態存檔；已解職而未存邀約的舊存檔在共用 hydrate 成功後補一次並存檔，既有邀約、已用過再起機會的空邀約不覆寫。渲染只讀、不抽亂數。瀏覽器在三種寬度驗證重繪無狀態／亂數變化、IndexedDB 重載邀約一致、接受邀約仍能接手新隊；390px 另驗證舊存檔缺邀約可補入並存檔。證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r055_gameover.js`、`browser-proof/v60-r055-gameover-baseline.json`、`v60-r055-gameover-candidate.json` 及前後截圖。
- Mars 真機與主觀驗收仍待確認；全遊戲逐頁減量與總體成效仍未結案。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 不動；原有未提交的 `manifest.webmanifest` 不納入。本批公開快取鍵 `v60-r055-gameover-decisions`。
- 本批 `node test_regression.js`：1,885 通過／0 失敗；`node smoke_multiyear.js`：15 年及全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。舊存檔補邀約走正式 hydrate 入口；瀏覽器以實際 IndexedDB 複製「已解職但尚無邀約」狀態並重新載入，驗證補入後可持久化、可接受聘僱，重繪不改邀約或抽共享亂數。
- 程式提交 `3ebd0a08bfa133b68e86ff7bf4ee3400f78e421b` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37168024048) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`01-data-engine.js`、`04-state-core.js`、`05-ui-dashboard.js`、`06-ui-roster.js`、`style.css`、`sw.js`，七者皆 HTTP 200，並逐項核對 r055 版本鍵、邀約事件／hydrate 入口、新決策文案及邀約卡格線。這不等同已安裝 PWA 即時切換或 Mars 真機驗收。

# v60-r054 春訓安排頁資訊減量

## r054：以既有圖與頁籤承接重複敘事

- 基於實際 `springCamp` renderer 稽核，刪除地點卡底部的氣氛敘事（已由核准春訓基地圖呈現），以及在一軍／二軍與守位頁籤下重述的隊別、分類、人數。能力數字「現況／上限」移至球員欄標題，仍搭配原有量尺；AI 按鈕縮為「AI建議・當前軍全員」，保留作用範圍。地點選單、費用、預算、等級、專長、逐人訓練、單項上限與出發操作均保留。未改 Save、模擬或亂數。
- 320／390／1280px 固定新局的春訓首頁：**關閉選單時的可見字元** 287→261（-26，約 9.1%）；量測明確扣除選單尚未展開的其他選項，並非全遊戲指標。390px 頁高 1,524→1,465px；320px 1,561→1,502px；1280px 1,690→1,628px。守位頁籤與人數字體提高至 14px；已核准場景圖在三種寬度皆成功解碼，無水平溢位或頁面例外。切換投手、一二軍及手動訓練後返回，訓練選擇仍保存。證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r054_spring.js`、`browser-proof/v60-r054-spring-baseline.json`、`v60-r054-spring-candidate.json` 與三種寬度前後截圖。
- 瀏覽器檢查不等同 Mars 真機驗收；全遊戲逐頁減量與總體成效仍未完成。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 不動；原有未提交的 `manifest.webmanifest` 不納入。本批公開快取鍵 `v60-r054-spring-copy`。
- 本批 `node test_regression.js`：1,881 通過／0 失敗；`node smoke_multiyear.js`：15 年及全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。新增回歸斷言確認核准場景、地點數據、選擇入口與出發鍵仍在，瀏覽器驗證逐人訓練選擇在分頁往返後仍保留。
- 程式提交 `26a844a787302e9d037639362af74c53e1498889` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37167204472) 為 `completed/success`。用唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`05-ui-dashboard.js`、`style.css`、`sw.js`，四者皆 HTTP 200；首頁及 Service Worker 含 r054 版本鍵，春訓程式含新 AI 標籤且不含被移除的敘事欄位，CSS 含 14px 守位人數字。已安裝 PWA 是否切換及 Mars 真機仍待確認。

# v60-r053 開季流程畫面與離線快取核對

## r053：已完成項目自動銜接，重新開啟優先取得新版首頁

- 2026-10-04 核對公開 `05-ui-dashboard.js`（HTTP 200）：頁首已是「待辦」返回入口，沒有舊版「下一步」按鈕；選秀結束自動進開季準備、談約／票價等完成後銜接下一項是既有 r050／r041 實作，不冒充本批新增功能。玩家仍需自行決定是否投入行銷、建設硬體及確認名單；這些「完成配置」動作是必要決策，不是另按一個空泛的「下一步」。
- 增加逐站回歸測試：談約、票價、行銷、硬體、名單任何一項未完成，直接執行春訓都不會進入球季或扣款；五項各完成後才依序轉下一站並到春訓。既有新舊存檔自動銜接測試仍在。`node test_regression.js`：1,879 通過／0 失敗；`node smoke_multiyear.js`：15 年及全畫面通過；`node smoke_puregm.js`：純 GM 15 年通過。
- 真實瀏覽器於 320／390／1280px 使用同一選秀完成入口：無「下一步」按鈕、有「待辦」入口；五項未完成時逐一嘗試春訓皆被阻擋，完成後依序轉談約→票價→行銷→硬體→名單→春訓，三種寬度皆無水平溢位、無頁面例外。稽核腳本：`_staging/v60-010-preseason-flow-candidate/audit_v60_r053_preseason.js`。此為桌面瀏覽器寬度驗證，不是 Mars 真機驗收。
- 舊畫面可能來自已安裝 PWA 的離線首頁：舊 Service Worker 先回快取導覽頁。本批將新版 Service Worker 導覽請求改為線上優先、離線退回首頁快取，並更新所有首頁腳本／樣式版本鍵為 `v60-r053-preseason-navigation-refresh`。此修正降低**重新開啟後**使用舊首頁的機會；已經開著的遊戲仍不會突然中斷重載，首次收到新版 Service Worker 的舊安裝版可能需再開啟一次。未取得 Mars 真機測試，不能宣稱手機已即時更新。
- 正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 均未改動；原有未提交的 `manifest.webmanifest` 不納入。全遊戲文字減量仍在進行，不能以本次流程檢查宣稱結案。
- 程式提交 `36735ae70286893a3e7deb7a46466b88a907db03` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37166728785) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`sw.js`、`test_regression.js`，三者均 HTTP 200 且具有 r053 對應標記。這證明公開靜態檔已更新，不等於已安裝 PWA 已切換或 Mars 真機驗收。

# v60-r052 交易組合文字減量與選秀權雙側分頁

## r052：規則集中，雙方選秀權不再上下堆疊

- 交易組合保留四步驟、球員完整卡、球探評估、選秀權估值、現金與提交操作。移除「勾選後展開資料卡」等已由介面直接呈現的重複指示；守位真值／能力估值、交易範圍、順位由原隊戰績決定與持有者選人、現金計入估值改以短句集中於相關步驟，沒有用收合掩蓋必要規則。
- 選秀權由原本我方與對方兩張清單上下堆疊，改為同層級雙側頁籤；兩側各 18 筆仍可用原分頁瀏覽，兩側各六筆的當頁勾選可同時保留。真實瀏覽器比較 Git `HEAD` 與候選在 320／390／1280px 四步驟：390px 選秀權首側頁高 1,265→994px、當頁可見字元 436→283；這包含將另一側移至可直接切換的頁籤，不是刪除另一側資料。其餘三步驟 390px 可見字元：我方球員 379→336、對方球員 392→373、現金確認 276→251；四步驟總可見字元 1,483→1,243，但不能用這個數字推論全遊戲減量或實際刪文比例。
- 兩側球員／選秀權數量、現金欄位、提交鍵均保留；切頁及雙側選取不改 `S`、不消耗共享亂數，無水平溢位或頁面例外；四步驟按鈕與雙側頁籤至少 44px。證據在 `_staging/v60-010-preseason-flow-candidate/audit_v60_r052_trade_copy.js`、`browser-proof/v60-r052-trade-copy.json` 與截圖。正式包及原有未提交的 `manifest.webmanifest` 不動。公開快取鍵 `v60-r052-trade-pick-tabs`；Mars 真機驗收待確認。
- 本批 `node test_regression.js`：1,877 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。選秀權勾選框另補可讀的操作標籤，手機頁籤與四步驟鍵盤焦點可見。
- 2026-10-04，程式提交 `2924d585521033bb26700f23326455d92a2c9d10` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37166049713) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`06-ui-roster.js`、`style.css`、`sw.js`，四者均 HTTP 200 且含 r052 對應標記。已安裝 PWA 是否即時切換、Mars 真機與主觀驗收仍待確認。
- 全遊戲逐頁文字減量尚未結案；春訓成果與分析主管續約等後續畫面仍待處理。測試與 Pages 驗證見本批後續紀錄。

# v60-r051 已完成選秀存檔恢復

## r051：讀檔後不需再按舊版「下一步」

- 正式 hydrate 路徑完成既有 Migration 後，僅在「本季選秀已完成、尚未建立本季春訓、無待裁員／球員或幕僚續約」時，自動銜接開季準備。未完成選秀、有待辦決策或已有春訓的存檔不受影響；成功銜接時只渲染一次，不重複換季。沒有新增 Save 欄位或改動模擬種子。
- 以實際 IndexedDB 保存「已完成選秀但尚未按舊版按鈕」的存檔後重載，在 320／390／1280px 都自動進談約檢查，`gameStarted` 正確、春訓未執行、無水平溢位與頁面例外。證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r050_draft_autoadvance.js`、`browser-proof/v60-r050-draft-auto.json`。公開快取鍵 `v60-r051-recover-draft`。正式包及使用者原有未提交 `manifest.webmanifest` 仍不動。
- `node test_regression.js`：1,875 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。讀檔恢復守門另驗證未完成續約、已有春訓、非休賽季狀態不可誤觸發。
- 2026-10-03，程式提交 `0ddd40af59526cd678dec7b93794f296949e63ce` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37128351574) 為 `completed/success`。用唯一查詢參數及 `no-cache` GET 公開 `index.html`、`06-ui-roster.js`、`sw.js`，均 HTTP 200 且含 r051 標記；已安裝 PWA 的實際切換與 Mars 真機驗收仍須另外確認。
- 全遊戲逐頁文字減量尚未結案；r050 的四條情境路由稽核與分析主管續約的共享亂數缺陷仍是後續待處理項目。Mars 真機驗收待確認。

# v60-r050 選秀完成自動銜接與逐頁稽核

## r050：完成選秀後自動進入開季準備

- 玩家完成最後一個選秀動作（跳過順位、全部放棄或新秀談薪結束）後，介面自動銜接談約檢查；不再依賴選秀摘要頁的額外「下一步」。核心 `finishDraft()` 仍先完成選秀結算，不在其中過早清除選秀結果。既有舊存檔的摘要按鈕保留；本次會話可從開季列回看選秀成果。年度換季的自主訓練照舊自動計算並保存，報告可由頁首開啟，不再阻擋開季準備。春訓仍需逐項確認談約、票價、行銷、硬體與名單；直接呼叫春訓執行入口不可略過或扣款。
- 已移除開季交接訊息的重複長說明；必要的退休人數與行動入口保留。`UI.completedDraft` 是本次會話的可回看摘要，不寫入 Save；舊版正式包與 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 未修改，原有未提交的 `manifest.webmanifest` 未納入。
- 真實瀏覽器以 320／390／1280px 驗證新局與後續球季的選秀完成、成果回看、下一年度自主訓練報告回看、五項開季準備、春訓守門與開賽按鈕；三種寬度均無水平溢位或頁面例外。證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r050_draft_autoadvance.js`、`browser-proof/v60-r050-draft-auto.json` 與截圖。
- 另以實際狀態重跑先前失真的四條合成路由：季後賽、交易組合、分析主管續約、春訓成果皆成功進入目標頁。`directorRenewal` 重複渲染會消耗共享亂數並改變報價（`browser-proof/v60-r050-context-routes.json`），屬尚未修正的獨立高風險缺陷，不能當作文字減量已結案。交易組合與春訓成果亦仍待後續逐頁減量；全遊戲文字量沒有完成 50% 證據。
- 本批 `node test_regression.js`：1,873 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。Mars 真機驗收待確認；公開快取鍵為 `v60-r050-auto-preseason`。
- 2026-10-03，程式提交 `e314391c0182f4113da1fcccf43b54191fa4d74d` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37127792597) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`06-ui-roster.js`、`05-ui-dashboard.js`、`style.css`、`sw.js`，五者均 HTTP 200 且含 r050 對應標記。這只證明公開靜態檔已更新，不等同已安裝 PWA 即時切換或 Mars 真機驗收。

# v60-r049 選隊分區與核准隊徽可讀性

## r049：選隊以既有四分區切換，每區五隊

- 2026-10-03，續查 40 路由抽樣，選隊在 390px 一次縱向排 20 隊，頁高 1,972px。原程式已有 A1／A2／B1／B2 四個分區，但同時展開；本批改為四個直接可見頁籤，每次顯示五隊，選隊仍由原按鈕呼叫 `pickTeam()`。20 個球隊 ID、隊名、城市級別、性格標籤與核准 Theme Pack 隊徽均保留。原卡片另有 20 段 10px 城市敘事小字（共 343 字元），不承載規則或數據，已從選隊畫面移除；城市級別與性格標籤提高至 14px，避免單靠縮小文字塞入卡片。
- 隔離瀏覽器以同一固定新局，比較 Git `HEAD` 與候選在 320／390／1280px 的實際 renderer。390px 首區可見字元 719→183、頁高 1,972→844px；320px 2,308→844px。這是首屏負擔，不能把隱於其他分區的 15 隊誤算成實際刪文；實際移除的是前述 343 字元裝飾文案。四分區 20 隊逐一核對隊名／級別／性格與圖源，20 張隊徽在切頁後皆成功解碼，最後一區可正常選隊進入開局身分頁；無水平溢位、頁面例外、共用亂數或 `S` 寫入，互動按鈕至少 44px。證據在 `_staging/v60-010-preseason-flow-candidate/audit_v60_r049_team_select.js`、`browser-proof/v60-r049-team-audit.json` 與截圖。
- 稽核界線：先前 40 路由合成抽樣中的 `playoffs`／`tradeBuilder` 落入安全模式，`directorRenewal` 意外落到選秀且消耗亂數，`springReport` 落到主控台；這些不是有效的該頁視覺證據，後續須建立符合實際流程的情境再驗。選隊與開局身分、國際市場等已有獨立瀏覽器證據，但仍不能據此宣稱全遊戲 50% 減量。本批 `node test_regression.js`：1,870 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 不動；原有未提交的 `manifest.webmanifest` 不納入。公開快取鍵 `v60-r049-team-division`，Mars 真機與主觀驗收待確認。
- 2026-10-03，程式提交 `b709234d36e8ed036476ca0d823d5bff77953f39` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37085664346) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`05-ui-dashboard.js`、`style.css`、`sw.js`，四者均 HTTP 200 且含 r049 對應標記。這證明公開靜態檔已更新，不等同已安裝 PWA 立即切換或 Mars 真機驗收。

# v60-r048 開局身分權責比較

## r048：開局模式選擇的長文改為同欄位比較

- 2026-10-03，逐頁稽核定位「開局身分選擇」：原三段說明共 223 字元，重複敘述 GM／教練分權。改為兩張同欄位決策卡，直接比較現場、GM 權責及後續變更；保留教練排打線／板凳／輪值、主動補強需求、GM 的補強財務談判、GM 兼教練手排、免費放權，以及純 GM 接管教練信任 -30／聯盟名聲代價。沒有改權力規則或兩個模式的操作入口，也沒有用收合長文或新裝飾圖取代內容。
- 隔離瀏覽器以同一固定新局比較 Git `HEAD` 與候選於 320／390／1280px 的實際畫面：整頁可見字元 301→202（約 -33%），段落字元 223→56；三種寬度均無水平溢位或畫面例外，按鈕寬高均至少 44px；點選兩種模式都進入休賽季摘要。純渲染不改 `S`、不消耗共用亂數。證據為 `_staging/v60-010-preseason-flow-candidate/audit_v60_r048_mode_pick.js`、`browser-proof/v60-r048-mode-audit.json` 與截圖。game-ui-design 的閱讀與觸控規範用於驗收欄位、對比及操作尺寸。這是單頁改善，不代表全遊戲已減少 50%。
- 本批 `node test_regression.js`：1,868 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 不動；原有未提交的 `manifest.webmanifest` 不納入。40 路由抽樣中部分合成情境仍不足以證明全遊戲逐頁通過，總減量稽核未結案，Mars 真機與主觀驗收待確認。公開快取鍵 `v60-r048-mode-compare`。
- 2026-10-03，程式提交 `5a88c25078cbb53ca846694bc214d2757dd01bbc` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37084945925) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`06-ui-roster.js`、`style.css`、`sw.js`，四者均 HTTP 200 且含 r048 對應標記。這證明公開靜態檔已更新，不等同已安裝 PWA 立即切換或 Mars 真機驗收。

# v60-r047 國際球員比較與開季流程標示

## r047：共享能力比較、開季準備完成即接續

- 2026-10-03，國際球員市場原每頁兩人仍在各球員卡重複能力欄名及獨家說明。本批改為共享欄名的雙人比較表，依核心、對位／跑壘、守備／捕手、體能／球路四類切換；原始球探能力數值、兩人肖像、天花板、簽約操作及 19 名人選保留，不改球探或簽約規則。390px 初頁可見字元 777→553、頁高 2,039→1,311px；320px 2,327→1,443px。這是單頁同屏閱讀改善，未宣稱全遊戲文字減少 50%。
- 休賽季逐站流程重驗：320／390／1280px 均從選秀後依談約→票價→行銷→硬體→名單→春訓切換；未完成時直接執行春訓會回到第一個漏項，不扣費、不推進日期。r047 將頁首易誤認為「下一步」的入口改為「待辦／返回目前待完成項目」，選秀結束按鈕改稱「完成選秀，進入開季準備」；完成每站仍自動前進。行銷可多選、硬體可連續建設，是否結束該站仍須玩家按「完成」，不會代玩家消費或設定。
- 國際市場使用隔離瀏覽器比較 Git 基準與候選，檢查 320／390／1280px 排版、肖像載入、能力值與操作可達、共享亂數及錯誤；證據在 `_staging/v60-010-preseason-flow-candidate/audit_v60_r047_international.js`、`audit_v60_r044_preseason.js` 與 `browser-proof/`。40 路由情境抽樣只供找長頁優先序，其中數個合成情境落入安全模式，不能算完成全遊戲 UI 驗收。本批 `node test_regression.js`：1,866 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。正式 `current/`、Delivery／Art ZIP、manifest、SHA、`CURRENT_PACKAGE.json` 不動；原有未提交的 `manifest.webmanifest` 不納入。Mars 真機與主觀驗收待確認。公開快取鍵 `v60-r047-international-flow`。
- 2026-10-03，程式提交 `3cf4a25c89cc8fff2913adacfe6aea0365557a6b` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37084247005) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`05-ui-dashboard.js`、`06-ui-roster.js`、`02-finance.js`、`style.css`、`sw.js`，六者均 HTTP 200 且含對應 r047 程式或快取標記。這證明公開靜態檔已更新，不等同已安裝 PWA 立即切換或 Mars 真機驗收。

# v60-r046 年度頒獎分組與手機長頁減量

## r046：年度頒獎按獎項類型呈現

- 2026-10-02，盤點尚未處理的長頁，年度頒獎在 A／B 每個聯盟各直接排 31 張卡，320px 頁高 4,494px。本批把既有聯盟分頁內的獎項再分「年度大獎／打擊／投手／最佳九人／金手套」五個直接可見類別；卡片改為獎名、球員、球隊、成績的短列。31 張卡與所有獎項、守位及原始數值仍在，不改頒獎計算或存檔，只將頁籤位置存在暫存 `UI`。不以收合長文或裝飾圖示假稱減量。
- 隔離瀏覽器以同一固定新局獎項資料，比較 Git `HEAD` 與候選版於 320／390／1280px 的實際 renderer；A、B 各 31 張獎項卡均可透過五類切換到，流程操作仍可見、共享亂數呼叫 0、`S` 不變、頁面無水平溢位與例外。320px 初頁顯示卡片 31→2、可見字元 791→154、頁高 4,494→844px；這是同屏閱讀負擔，不是資料被刪，也不代表全遊戲達成 50%。腳本、JSON、截圖在 `_staging/v60-010-preseason-flow-candidate/audit_v60_r046_awards.js` 與 `browser-proof/`。Mars 真機與主觀驗收仍待確認。
- 本批沒有更換核准美術、遊戲數值或正式 `current/`／Delivery ZIP／Art ZIP／manifest／SHA／`CURRENT_PACKAGE.json`；原有未提交 `manifest.webmanifest` 不納入。全遊戲逐頁稽核與總減量成效仍未結案。`node test_regression.js`：1,862 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。公開部署結果待推送後實際查核；公開快取鍵 `v60-r046-awards`。
- 2026-10-03，程式提交 `aaf89c3c475ea4da6977e1130a580c5fdd884cef` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37031073893) 為 `completed/success`。以唯一查詢參數及 `no-cache` 實際 GET 公開 `index.html`、`05-ui-dashboard.js`、`style.css`、`sw.js`，四者均 HTTP 200 且含 r046 對應標記。此為公開靜態檔更新證據，不等於既有安裝 PWA 立即替換或 Mars 真機驗收。

## r045：數據中心排行榜分頁

- 2026-10-02，繼續全遊戲逐頁文字減量與資訊圖像化。實際第 48 天存檔的數據中心打者頁原一次呈現前 40 名：320px 畫面 4,342px 高、2,644 可見字元，資料格實際字級 12.5px，球員姓名在窄欄中逐字換行。本批改為每頁 8 名、5 頁，保留原排名 1–40、全部數值欄、排序、全聯盟／本隊切換及點球員詳情。投手榜同樣保留前 40 名並分成 5 頁。頁碼只存在暫存 `UI`，不寫入 Save。
- 運氣校正改成「打者／投手」兩個直接可見的分類頁，各自最多 25 名、每頁 8 名；實際存檔中 25 名打者與 10 名投手全數可翻到。原實績、預期值、差距、BABIP 與好壞運判定仍在；重複的長段解說縮為共用短判讀。榜單可信度原先只靠彩色小點辨識，現改為可讀的「高／中／低」文字標籤及共用圖例。
- 表格資料格提高至 14px，列觸控高度至少 47px、翻頁鈕 44px；窄螢幕表格在具名區域內左右滑動，球員姓名不再逐字斷行，頁面沒有水平溢位。表頭排序與球員詳情列可用鍵盤 Enter／空白鍵操作且有焦點框。320px 首頁高度 4,342→1,030px、可見字元 2,644→704；這主要是每頁只顯示 8 人，不能冒稱把其餘球員資料刪掉，更不是全遊戲文字減半。對應隔離瀏覽器腳本、JSON 與 320／390／1280px 截圖位於 `_staging/v60-010-preseason-flow-candidate/audit_v60_r045_data_center.js` 及 `browser-proof/`。
- 三種寬度的真實 renderer 均確認打者 40／40、投手 40／40、運氣校正打者 25／25、投手 10／10 可達；下一頁實際更換球員，切換本隊會回第一頁，渲染共享亂數呼叫 0、`S` 不變、瀏覽器例外 0。這是隔離瀏覽器技術驗證，不代替 Mars 真機或主觀驗收。本批未製作或更換核准美術，也沒有改數據計算、球員能力或正式 `current/`／Delivery ZIP／Art ZIP／manifest／SHA／`CURRENT_PACKAGE.json`；原有未提交 `manifest.webmanifest` 不納入。全遊戲範圍與總減量成效稽核尚未結案。
- `node test_regression.js`：1,860 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過；JS 語法與 `git diff --check` 通過。GitHub Pages 推送與公開部署另以實際結果記錄；公開快取鍵 `v60-r045-data-center`。
- 2026-10-02，程式提交 `eb1080da8a43a7724a9379e8995e0101b8df2bf3` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37029792560) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`06-ui-roster.js`、`style.css`、`sw.js`，四者均 HTTP 200 且含 r045 對應標記。這證明公開靜態檔更新，不等同已安裝 PWA 立即替換或 Mars 真機驗收。

## r044：完成即接續、春訓入口防跳關、交易組合分區

- 2026-10-02，Mars 指出不應靠玩家記得按頁首「下一步」，漏按也不能直接春訓開季。r041／r042 已讓五項開季準備依序確認且自動開下一站；本批補上球員續約最後一人談成、拒絕或全部自動續約後直接接教練／主管續約或選秀，不再多按一個「繼續」。行銷可多選、硬體可連續建設，仍須由玩家在該頁明確按「完成」，單次操作不能冒充整站完成。
- 春訓的實際 `executeSpringCamp()` 現在也檢查未完成的準備項目；即使不是經畫面出發鈕呼叫，也會回到第一個漏項，不扣春訓費、不套訓練、不開季。隔離瀏覽器於 320／390／1280px 由開幕選秀結束開始，直接呼叫春訓被擋；逐項完成後自動依談約→票價→行銷→硬體→名單→春訓切換，春訓完成進報告，無頁面例外及水平溢位。驗證腳本與 JSON：`_staging/v60-010-preseason-flow-candidate/audit_v60_r044_preseason.js`／`browser-proof/v60-r044-preseason-audit.json`。這不是 Mars 真機驗收。
- 逐頁稽核發現交易組合頁原一次展開雙方各 60 人與各 18 筆選秀權，且查看畫面消耗共享亂數 276 次。本批改為「我方球員／對方球員／選秀權／現金確認」四個明確決策頁，球員每頁 6 人、選秀權每頁 6 筆；全部 60＋60 人與 18＋18 筆仍可翻頁取得，選取跨頁保留，現金、交易價值與送出前核對保留。球探估值改為穩定的 `v46Fog`，純渲染共享亂數降為 0 次，不更動真實能力與交易演算法。這是減少同屏閱讀與過長捲動，不把分頁後 4,875→392 字誤稱全內容刪除 92%。
- 320px 交易頁基準高度 8,655px，新版第一頁 929px；390／1280px 亦無水平溢位、頁面錯誤 0。三種寬度均驗證四階段、全部人選／選秀權可達、已選兩名球員可在確認頁核對，證據：`_staging/v60-010-preseason-flow-candidate/audit_v60_r044_trade.js` 與 `browser-proof/v60-r044-trade-audit.json`。未新增美術素材，既有核准圖未變；沒有用裝飾圖示取代文字。全遊戲逐頁減量與減量成效總稽核仍在進行，不能由此批單頁數據宣稱達成 50%。
- 本批驗證：`node test_regression.js` 1,857 通過／0 失敗，`node smoke_multiyear.js` 15 年＋全畫面渲染通過，`node smoke_puregm.js` 純 GM 15 年通過。舊測試原先直接跳過開季準備呼叫春訓，本批改走實際五步完成函式；先發手機測試 fixture 也修正為先排除已不存在的球員，避免用殘留名單誤判呈現人數。正式 `current/`、Delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 與 lineage 均不動；原有未提交 `manifest.webmanifest` 不納入。公開快取鍵 `v60-r044-trade-flow`。
- 2026-10-02，程式提交 `e0cfbf888499afabeb97cd6180a00ae79db1387c` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/37027096560) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`02-finance.js`、`06-ui-roster.js`、`style.css`、`sw.js`，五者均 HTTP 200 且含本輪標記。這證明公開靜態檔更新，不等同已安裝 PWA 立即替換或 Mars 真機驗收。

## r043：代理人關係雙欄比較與分頁

- 2026-10-02，繼續全遊戲逐頁文字減量。本批鎖定代理人事務所：原七列逐一重複「門檻／機率」並在手機擠成多行；改為共用欄名、交情標籤與雙數值比較卡，每頁四類／次頁三類。七類資料、談約門檻、談成倍率、應酬費用與操作、每年限制、成功／失敗機率及情報／引薦門檻都保留，不用折疊或裝飾 SVG 代替資訊。頁碼只在暫存 `UI`，不寫 Save、不影響共享亂數或談判規則。
- 同一固定新局、代理人交情 fixture，隔離瀏覽器實際渲染：390px 首頁可見字元 473→368（-22.2%）、頁高 1,028→965px；320px 頁高 1,227→1,044px。第二頁三類全部可達，七個應酬入口完整，390px 實際應酬後交情 -10→-9、年度限制生效；320／390／1280px 無水平溢位、頁面錯誤 0、按鈕至少 44px。腳本、截圖與 `v60-r043-agency-audit.json` 存於工作區 `_staging/v60-010-preseason-flow-candidate/`。這是單頁樣本與同屏閱讀負擔，不代表全遊戲文字減少 50%。
- `node test_regression.js`：1,853 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。r042 原測試將快取鍵寫死，r043 改為驗證頁面與 Service Worker 使用同一修訂鍵；沒有放寬功能斷言。正式 `current/`、Delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 與 lineage 均不動；原有未提交 `manifest.webmanifest` 也不納入。本批快取鍵 `v60-r043-agency-compare`。
- 2026-10-02，程式提交 `9ce9fc7526bdc015ed1736e494ff2db701f61021` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/36997252118) 為 `completed/success`。以唯一查詢參數及 `no-cache` 實際 GET 公開 `index.html`、`05-ui-dashboard.js`、`style.css`、`sw.js`，四者皆 HTTP 200 且含 r043 對應標記。這確認公開靜態檔已更新，不等同既有安裝版立即切換或 Mars 真機／主觀驗收。

## r042：行銷／硬體完成直接接下一站

- 2026-10-02，Mars 再次指出不能依靠記得按頁首「下一步」，否則可能漏掉設定。r041 已在談約與票價完成後自動接續；本批把行銷頁原本可直接跳硬體的按鈕改為「完成行銷配置，前往硬體」，並在硬體頁提供「完成硬體檢查，前往名單」。兩者按下即記錄該站完成、儲存並顯示下一站，不必再按頁首「目前」入口。多選行銷及連續建設仍須明確按「完成」，單次投入／建造不能冒充全部完成；不投入時可維持現況。
- 名單若缺少出賽必要位置，確認時留在名單並提示補足，不能直接進春訓。春訓畫面出發鈕及主控台入口原有漏項守衛保留；此批不改模擬或經濟規則。
- `node test_regression.js`：1,851 通過／0 失敗；`node smoke_multiyear.js`：15 年＋全畫面渲染通過；`node smoke_puregm.js`：純 GM 15 年通過。390×844 隔離瀏覽器實際點選行銷完成→硬體完成→名單，春訓仍由未完成名單鎖定，頁面例外 0、無水平溢位。證據：`_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r042-preseason-mobile.png`。這不是 Mars 真機驗收。
- 公開版變更限 `02-finance.js`、`05-ui-dashboard.js`、`test_regression.js`、`index.html`、`sw.js` 與本紀錄。原有未提交 `manifest.webmanifest` 不納入；正式 `current/`、Delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 與 lineage 不動。快取版本 `v60-r042-flow-continuity`；是否已上線以後續部署實證為準。
- 2026-10-02，程式提交 `e40fc0f9d0054f401335ce16d7d1f234bba0f0f7` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/36994879435) 為 `completed/success`。以唯一查詢參數及 `no-cache` 實際 GET 公開 `index.html`、`02-finance.js`、`05-ui-dashboard.js`、`sw.js`，四者皆 HTTP 200 且包含 r042 對應標記。這確認公開靜態版已更新，不等同既有 PWA 立即切換或 Mars 真機驗收。

本目錄是 GitHub Pages 公開部署殼層，不取代離線交付包，也不代表 Mars 正式接受。

## r041：防止略過開季準備

- 2026-10-01，Mars 指出 r040 仍需手動點「下一步」，即使漏按也能直接春訓開季；此為流程缺陷。本批以「完成目前項目」替代可連點的「下一步」，談約雙合約簽妥即自動到票價，票價設定後自動到行銷。未簽約可明確選擇維持預設收入、票價可維持現值；行銷、硬體與名單可逐項確認維持現況，不強迫花錢或更動球員，確認後自動進下一站。
- 開季進度存於 `S.preseasonReview`，以球季與球隊識別；舊存檔經 `ensureV60()` 冪等補建，已開季者不倒退、尚未春訓者從未完成項開始。年度切換或換隊不沿用舊進度。主控台春訓入口、頁首春訓捷徑及「確認出發春訓」會導回第一個漏項；已有的裁員、續約、選秀優先順序保留。沒有改比賽、財務或行銷演算法。
- Playwright 真實點選 390／320px：未完成時強行出發被擋、連點「目前項目」不跳關，簽完兩份合約自動到票價，選票價自動到行銷，確認行銷→硬體→名單後才可春訓，重新載入仍回未完成的名單，春訓完成後進成果及開季主控台；0 頁面錯誤、無水平溢位。證據於工作區 `_staging/v60-010-preseason-flow-candidate/browser-proof/v60-r041-auto-flow-audit.json`。這是技術驗證，不取代 Mars 真機確認。
- `node test_regression.js` 1,849 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面渲染 PASS；`node smoke_puregm.js` 純 GM 15 年 PASS。新測試保留舊選秀、開季、財務與春訓斷言，補測舊存檔遷移冪等與不可連點跳關。
- 公開版程式含 `01-data-engine.js`、`02-finance.js`、`04-state-core.js`、`05-ui-dashboard.js`、`06-ui-roster.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js` 與本紀錄；原有未提交 `manifest.webmanifest` 不納入。正式 `current/`、Delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 與 lineage 均不動。快取版本改為 `v60-r041-auto-preseason`；推送與線上生效另以實際部署驗證為準。
- 2026-10-01，程式提交 `436f16e1edbf13eeeb0d8dbe90a2eefd963885dc` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/36853040645) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開 `index.html`、`05-ui-dashboard.js`、`02-finance.js`、`sw.js` 均 HTTP 200 且具有 r041 版本或流程標記。這證明公開靜態程式已更新，不代表既有安裝版立即替換 Service Worker，也不代表 Mars 真機已驗收。

## r040：休賽季逐步導覽與圖像化

## r040：開季準備流程

- 2026-10-01，Mars 明確通過 r039 的代表隊新圖。本批依同一藍白等角剖面場景畫風製作全新的「球團規劃室通往春訓場」圖片，母版位於工作區 `_staging/v60-r040-art-source/offseason_planning_r040_master.png`；公開 JPEG 位於 `visual_assets/v60/offseason_planning_r040.jpg`（375,058 bytes），於休賽季異動摘要才延遲載入，不列入啟動預載。r040 新圖是待 Mars 目視確認的候選，不冒稱已核准。
- 根因：換季時 `seasonYear` 前進，`draftDoneYear` 保留上一個休賽季年份；原「下一步」先比較兩者，導致準備春訓時誤開第二次選秀。現以當年度 `springCamp` 存在為準判斷選秀是否已過，並將自主訓練後的導覽接成談約／收入 → 票價 → 行銷 → 硬體 → 名單 → 春訓 → 春訓成果 → 開季主控台。強制裁員、續約等必辦關卡仍優先；其餘檢查不阻止開季。只用暫存 `UI` 記錄導覽位置，不新增 Save 欄位或改動模擬規則。
- 新場景圖取代休賽季摘要的長篇流程說明，並縮短教學提示、財務頁指引、退休名單提示與代理人事務所說明；必要金額、人員、規則與按鈕仍可見。這是本畫面的局部減量，不宣稱全遊戲文字減半或減量工作全部完成。
- 隔離瀏覽器實際逐鍵走完整流程：390／320px 無橫向溢位、未重開選秀，春訓按鈕實際執行後進入成果頁，再到開季主控台；新圖 `complete && naturalWidth > 0`，頁面錯誤 0。既有財務／行銷／設施／名單首次渲染會補建預設資料，於測試預先初始化後確認導覽本身不改存檔 `S`。圖面目視截圖及測試證據存於工作區 `_staging/v60-010-preseason-flow-candidate/browser-proof/`。
- `node test_regression.js` 1,846 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面渲染 PASS；`node smoke_puregm.js` 純 GM 15 年 PASS。此為本地技術驗證，不是 Mars 真機確認。
- 程式變更限 `05-ui-dashboard.js`、`index.html`、`sw.js`、`test_regression.js`、新 JPEG 與本紀錄；原有未提交 `manifest.webmanifest` 修改保留且不納入。正式 `current/`、Delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 與 lineage 不動。三項測試與線上 Pages 驗證以實際結果補記，不以本地候選冒稱線上已更新。
- 2026-10-01，程式及圖片提交 `cfbebd178b358276aae9de81a2db872ff99168ec` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/36850537367) 為 `completed/success`。以唯一查詢參數與 `no-cache` 實際 GET 公開首頁、`05-ui-dashboard.js`、`sw.js`、新 JPEG 均 HTTP 200；首頁與 Service Worker 含 r040 版本標記，新 JPEG 為 375,058 bytes。這證明靜態資源公開可讀，不代表已安裝 PWA 立即替換舊快取，也不代表 Mars 真機／主觀美術已接受。

## r039：代表隊名單圖像化與長頁減量

## r039：代表隊名單與排陣

- Mars 已明確通過 r038 的財務／補強兩張圖片。本批以已核准的藍白等角剖面球場畫風為參照，新製「代表隊休息室與排陣桌」場景，取代世界賽選人／排陣頁的重複文字；新圖是本批候選，尚未冒稱 Mars 已目視核准。生成母版保留於工作區 `_staging/v60-r039-art-source/national_team_roster_r039.png`；公開版採壓縮 JPEG `visual_assets/v60/national_team_roster_r039.jpg`（365,251 bytes），只在打開對應畫面時延遲載入，不加入啟動核心預載。
- 原教練推薦頁一次列出完整 30 人，手機長頁要滑到底。現依投手／野手分組，每頁最多 6 人，保留姓名、球隊、年齡、守位／職務、綜合能力、本隊標記與「確定名單／手動調整」操作。自動選人邏輯及 30 人資料不變；頁碼僅寫暫存 `UI`，不寫入 Save。排陣頁原在 9 棒與輪值選單後再重複列 30 個名字，現以上方同風格場景與投／野人數摘要取代；9 棒、守位、4 人輪值及確認操作均保留。
- 固定情境、390px 手機的教練推薦首屏：871→261 可見字元（同屏少 70.0%），頁面高度 1,296→935px（少 27.9%）。這主要是名單分頁後的同屏閱讀負擔，不是刪掉 610 字球員資料。前一批同一 37 路由樣本總字元 12,339→11,729（少 4.9%）；樣本不是全遊戲 50% 結論。
- 隔離瀏覽器逐頁操作推薦名單：投手 19 人分 4 頁、野手 11 人分 2 頁，共 30 人全部可達；切換前後 `S` 未變。320／390／1280px 圖片 `complete && naturalWidth > 0`、無水平溢位；排陣仍有 9 組打者與 4 組輪值下拉、確認按鈕，圖片實際載入。頁面錯誤 0。此為 Codex 技術驗證，不取代 Mars 真機與主觀美術確認。
- `node test_regression.js` 1,838 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面渲染 PASS；`node smoke_puregm.js` 純 GM 15 年 PASS。隔離瀏覽器 37 路由與代表隊選人／排陣互動 PASS，320／390／1280px 圖片載入且無橫向溢位，程式頁面錯誤 0；Mars 真機未驗證。公開變更限 `05-ui-dashboard.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js`、新 JPEG 與本紀錄；原有未提交 `manifest.webmanifest` 不納入。正式 `current/`、delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 及 lineage 都不修改。Service Worker／頁面 cache key 為 `v60-r039-national-roster`。
- 2026-10-01，程式提交 `7fd4b95ec241fb472a5b0293b421bb64a6ccc09d` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/36847335373) `completed/success`。建置前首次請求仍取到 r038 首頁、新圖 404；建置後以唯一查詢參數與 `no-cache` 複查，首頁、`05-ui-dashboard.js`、`style.css`、`sw.js`、新 JPEG 均 HTTP 200 且 r039 標記／圖片大小吻合。公開靜態版已更新；既有安裝的 PWA 仍可能需重新開啟讓 Service Worker 接手，不把這項網路驗證冒充 Mars 真機或視覺接受。

## r038：同畫風場景取代教學長文、管理頁減量

- 財務與補強教學不再以長段說明為主：新增藍色／象牙白球場經營場景圖，分別呈現售票、預算與設施，以及球探、選秀與談約的管理場景；旁邊保留簡短可見的規則／數值。兩張圖不是 SVG 或裝飾圖示，採 1254px 正方形構圖與 `object-fit:contain`，不裁切主體；JPEG 各約 258KB／230KB，僅在進入對應教學章節時延遲載入。圖像生成母版保存在工作區 `_staging/v60-r038-art-source/`，公開版只放壓縮素材，不動正式 Art ZIP。這是技術候選；Mars 尚未就本批新圖給予主觀視覺核准。
- 新手教學九章的標題＋內文，同一測量法由 r037 的 2,129 字降至 1,615 字（再減 24.1%）；r036 同法為 3,008 字，累計減少 46.3%。這是教學內容，不是全遊戲文字量。九章規則仍可切換閱讀；未用收合取代、未刪除操作／必要條件。國際賽手動選人由一次列 90 名改為每頁 12 名，保留入選／退出與已選名單；原 2,556 字的首屏情境目前 483 字，這是分頁減少同屏負擔，不是刪除其餘球員。
- 同一 37 路由樣本、390px 手機測量：15,038→12,339 可見字元，減少 17.9%；所有增加文字的路由為 0。此為固定樣本，不涵蓋每個存檔、情境或全遊戲，所以全遊戲減半仍未完成或證明。財務、續約、KPI、交易風聲、存檔、春訓報告及國際賽提示以短狀態列取代重複解說；原有結果數據、代價與操作維持。
- 本機隔離瀏覽器檢查 37 路由、教學九章互動、320／390／1280px 響應式、國際賽選人狀態與 `S` 只讀性，頁面錯誤 0。兩張 JPEG 在實際教學 renderer 中 `complete && naturalWidth=1254`，財務／補強 320／390px 截圖已檢視：圖片完整、無水平溢位。這不等於 Mars 手機實測。
- Regression：`node test_regression.js` 1,833 通過／0 失敗；`node smoke_multiyear.js` 15 年＋全畫面 renderer PASS；`node smoke_puregm.js` 純 GM 15 年 PASS。新圖路徑、壓縮大小、按需載入與完整構圖新增回歸斷言。程式不改遊戲規則、存檔欄位或模擬亂數。
- 本批公開程式與素材：`02-finance.js`、`05-ui-dashboard.js`、`style.css`、`index.html`、`sw.js`、`test_regression.js`、`visual_assets/v60/` 兩張 JPEG、本紀錄。Service Worker／頁面 cache key 為 `v60-r038-visible-rules`。工作區原有 `manifest.webmanifest` 修改保留且不納入提交；正式 `current/`、delivery／Art ZIP、正式 manifest／SHA、`CURRENT_PACKAGE.json` 與 lineage 均未修改。公開推送與 Pages 實際生效狀態另以部署驗證為準，不以本地 PASS 冒稱線上更新。
- 2026-09-30，程式提交 `e37982c93c6a370405eaa688af9efd0bece389cc` 已推送 `main`；[GitHub Pages 建置](https://github.com/mars0884-chu/baseball-GM/actions/runs/36703831092) `completed/success`。以唯一查詢參數及 `no-cache` 對公開 Pages 逐一 GET：`index.html`、`05-ui-dashboard.js`、`02-finance.js`、`style.css`、`sw.js`、兩張新 JPEG 均 HTTP 200；程式與快取標記相符，圖片大小分別 258,187／230,370 bytes。這證明線上靜態資源已生效，不代表既有 PWA 安裝立刻替換舊快取，也不代表 Mars 真機／視覺接受。

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
