---
documentRole: art-interface-spec
gameVersion: v56
documentRevision: 1
originalAuthor: Codex
lastModifiedBy: Codex
authoritative: false
packageId: v56-r001-codex
---
# v56 production 美術介面規格（r001）

## 本包素材邊界

- 本包沒有新增或改造正式人物、隊徽、國旗、帽子、頭像 layer 或其他 production art。
- `v56_art_assets.zip` 逐位元沿用 `v55-r012-codex` 的 `v55_art_assets.zip`，只因固定外層角色規則改用 v56 檔名。
- `V54_BUILTIN_THEME` 與 r012 的 20 個獨立 SVG 隊徽、6 層頭像實際 renderer 整合、國旗與 capMark contract 保持不變。

## Content visualization contract

V56-001 的視覺內容層是 UI presentation adapter，不是美術機制。它在既有 renderer 完成後，以獨立 inline SVG scene、短標籤、關鍵值與完整原卡片內容呈現事件／連鎖、郵件、新聞、里程碑、獎項、冠軍、名人堂與連鎖歷史。

- 不改資料值、Save、RNG、模擬或操作語意。
- 狀態不只依賴顏色；保留結構、圖示、文字與 focus。
- 1280×720、1024×768 與 390×844 不水平溢出；手機為單欄 reflow。
- 完整訊息與既有按鈕、aria-label、title 必須在同一卡片保留。

## 原有 portrait contract

`style03_v12`、`style04_v11`、`style05_method_c_v05`、四個 head family、capMark、skin、臉部與球衣保護區均沿用 r012；任何後續人物或主視覺變更需另開 staging revision 並取得 Mars 決策。
