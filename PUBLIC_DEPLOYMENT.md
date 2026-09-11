# 《決勝 GM》公開版部署說明

本目錄是 v60-r010 candidate 的 GitHub Pages 部署殼層，不取代離線交付包。

- `index.html` 只負責 PWA metadata、暖金／深綠啟動畫面、七個外部模組與公共 art key mapping。
- `visual_assets/v57` 與 `visual_assets/v58` 是從候選 Art build 原樣複製的 17 張核准 PNG，不重新生成、不裁切、不轉 SVG。
- `05-ui-dashboard.js` 先查 `window.__v60PublicArtPaths`；公開版只有實際 render 的 `<img>` 才會請求對應圖片。
- Dashboard 首屏球場圖優先載入；其他設施／活動／新聞場景使用 lazy loading。
- 離線 `v60_delivery.zip` 仍維持單檔自包含與固定 10／20 檔交付規格，未將此部署殼層混入 modular ZIP。
