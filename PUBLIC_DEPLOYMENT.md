# 《決勝 GM》公開版部署說明

本目錄是 v60-r018 candidate 的 GitHub Pages 部署殼層，不取代離線交付包，也不代表 Mars 正式接受。

- r018 新增傷缺自選健康二軍，確認才成對升降且不增減教練信任；保留原教練建議。
- 春訓每頁6人與能力對照；活動圖片、費用、效果與按鈕同區；設施目前／升級後比較。
- 00-theme.js內嵌PNG改存theme_assets/內容SHA256.png，原始圖片bytes不變並可反向還原來源；公開theme约336KB，離線模組仍保留10.9MB完整自包含theme。
- 首次開頁顯示真實模組完成數；新球季分段建立並顯示已等待時間。不是固定倒數；同種子生成狀態與原版相同。
- SW核心URLquery對齊r018；素材按需快取，未看過的圖片離線可能尚不可用，遊戲核心仍可執行。

- r017 修正傷兵候選已在一軍造成只下放未補人的缺陷，保留舊提案重提入口。
- 選秀目前數據／未來天花板改為亮底深字，每頁兩人；雷達不變。
- 傷兵以核准肖像呈現升降兩人；行銷活動不再重複顯示相同費用／效果或裝飾圖示；核准場景完整保留。
- 原始核心共同開發：Claude；產品與最終決策：Mars；後續維護與本輪修正：Codex。

- `index.html` 只負責 PWA metadata、冰藍／皇家藍／亮青啟動畫面、七個外部模組與公共 art key mapping。
- `icon-180.png`、`icon-192.png`、`icon-512.png` 是已確認的全新藍／青配色 PNG APP 圖示；不使用綠色、不裁切場景、不以 SVG 替代。
- `visual_assets/v57` 與 `visual_assets/v58` 保留從候選 Art build 原樣複製的 17 張核准 PNG，並由同一批 PNG 產生等比例 JPEG 傳輸副本；不重新生成、不裁切、不轉 SVG。
- `05-ui-dashboard.js` 先查 `window.__v60PublicArtPaths` 的 JPEG；載入失敗由 `window.__v60PublicArtFallbackPaths` 回退同 key PNG。公開版只有實際 render 的 `<img>` 才會請求對應圖片。
- 目前顯示畫面中的設施／活動／新聞場景在 DOM 插入後下一幀觸發載圖；場景尚未出現在遊戲畫面時不會請求。此處理修正瀏覽器只呈現 eager 屬性、卻未開始圖片請求的問題。
- r018-scene4 更新公開模組與 Service Worker 的資源查詢版本，讓瀏覽器避開舊 r018 快取。
- 17 張場景約由 40.2 MB 降為 6.5 MB 的 JPEG 傳輸副本；離線單檔仍保留自包含 PNG data URL。
- 離線 `v60_delivery.zip` 仍維持單檔自包含與固定 10／20 檔交付規格，未將此部署殼層混入 modular ZIP。
