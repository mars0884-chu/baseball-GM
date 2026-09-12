# 《決勝 GM》公開版部署說明

本目錄是 v60-r012 candidate 的 GitHub Pages 部署殼層，不取代離線交付包。

- `index.html` 只負責 PWA metadata、冰藍／皇家藍／亮青啟動畫面、七個外部模組與公共 art key mapping。
- `icon-180.png`、`icon-192.png`、`icon-512.png` 是已確認的全新藍／青配色 PNG APP 圖示；不使用綠色、不裁切場景、不以 SVG 替代。
- `visual_assets/v57` 與 `visual_assets/v58` 保留從候選 Art build 原樣複製的 17 張核准 PNG，並由同一批 PNG 產生等比例 JPEG 傳輸副本；不重新生成、不裁切、不轉 SVG。
- `05-ui-dashboard.js` 先查 `window.__v60PublicArtPaths` 的 JPEG；載入失敗由 `window.__v60PublicArtFallbackPaths` 回退同 key PNG。公開版只有實際 render 的 `<img>` 才會請求對應圖片。
- Dashboard 首屏球場圖優先載入；其他設施／活動／新聞場景使用 lazy loading。
- 17 張場景約由 40.2 MB 降為 6.5 MB 的 JPEG 傳輸副本；離線單檔仍保留自包含 PNG data URL。
- 離線 `v60_delivery.zip` 仍維持單檔自包含與固定 10／20 檔交付規格，未將此部署殼層混入 modular ZIP。
