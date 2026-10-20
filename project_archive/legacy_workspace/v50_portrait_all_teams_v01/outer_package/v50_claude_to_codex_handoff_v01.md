# V50 Claude → Codex 正式品牌 Theme pack 驗證交接 v01

> 日期：2026-07-25
> 來源：Codex v50_codex_theme_integration_delivery_v01.zip
> 對象：Codex
> 用途：回報 Claude 驗證結果、確認 Codex 可繼續下一階段

---

## 一、驗證結果

### 遊戲測試（v50 基線不變）

| 測試 | 結果 |
|------|------|
| 完整回歸 | 1150 通過 / 0 失敗 |
| 一般模式 15 年 smoke | 全部通過 |
| 純 GM 模式 15 年 smoke | 全部通過 |

### Theme pack 驗證

| 項目 | 結果 |
|------|------|
| `validateThemePack()` | valid=true, 0 warnings |
| 20 隊 logo data URI 格式 | 全部正確（data:image/png;base64,...） |
| 20 隊 primaryColor/secondaryColor 格式 | 全部正確（#RRGGBB） |
| 色票與 TEAM_DEFS 比對 | 20/20 完全吻合 |
| 不當欄位（capMark/homeUniform/awayUniform/cityUniform） | 全部正確未填入 |
| Logo 大小（128px base64） | 各隊 ~20-29 KB，合理範圍 |

### 母包完整性

| 項目 | 結果 |
|------|------|
| Claude 原始外層 9 檔 | 7 檔保留不動、2 檔合理重建（art_assets.zip / SHA256SUMS.txt） |
| 模組 ZIP | 20 檔未修改 |
| 美術素材 ZIP | 原 138 檔保留＋9 檔新增 = 147 檔 |
| Codex 新增外層檔 | 4 檔（摘要/manifest/next_stage/handoff） |
| 遊戲程式碼修改 | 0（未動） |

### 結論

Codex v01 正式品牌 Theme pack 通過全部驗證，可安全使用。

---

## 二、Claude 確認的接口使用方式

Codex 本輪僅填入 `logo` / `primaryColor` / `secondaryColor`，未填入尚未完成的欄位，做法正確。

正式 JSON 省略未完成欄位（而非填入 null）的策略是正確的：
- 避免主題包宣稱不存在的資產
- `validateThemePack()` 不會對缺少的選填欄位發出警告
- 漸進補齊時只需在新版 JSON 中加入新欄位

---

## 三、Codex 下一階段（維持 Codex v01 next_stage 的建議）

### 優先做 T0-T4 的正式肖像圖層樣板

每隊需製作三個 256x256 透明 PNG：

1. **capMark**（完整帽子圖層）：帽身＋帽簷＋帽徽一體
2. **homeUniform**（主場球衣）：白色系
3. **awayUniform**（客場球衣）：球隊主色系

### 製作規格

- 母版畫布：256x256
- 三錨點：headTop(x50%,y10%) / faceCenter(x50%,y38%) / neckline(x50%,y72%)
- z-order：skin → face → eyes → nose → **uniform** → hair → beard → **cap**
- 輸出尺寸：64px（名單卡片）、128px（詳情）

### 驗收要求

- 至少用兩種臉型、兩種髮型、兩種膚色測試遮擋
- 64px 與 128px 輸出都需檢查安全區與辨識度
- `cap_mark_reference_256.png` 只能當設計參考，不可直接當 capMark
- T0-T4 樣板經 Mars 確認後，才批次製作 T5-T19

### 交付格式

新版 Theme pack JSON 中加入：

```json
{
  "teams": {
    "T0": {
      "logo": "data:image/png;base64,...",
      "primaryColor": "#1B3A6B",
      "secondaryColor": "#C0C0C0",
      "capMark": "data:image/png;base64,...",
      "homeUniform": "data:image/png;base64,...",
      "awayUniform": "data:image/png;base64,..."
    }
  }
}
```

先完成的隊可以只填該隊，其他隊繼續省略。遊戲已內建回退機制：客場 awayUniform 缺失時回退 homeUniform。

---

## 四、Claude 不需要修改程式

本輪驗證未發現任何需要修改的程式問題。除非 Mars 真機匯入後回報以下問題，否則 Claude 不動程式碼：

- 隊徽在特定尺寸裁切或失真
- 淺色隊徽在淺色背景缺乏對比
- 隊色 CSS 變數未套用到預期 UI
- 主題包匯入、持久化或重開機恢復異常

---

## 五、檔案完整性

本輪 Claude 輸出 ZIP 保留 Codex 交付的全部 13 個外層檔案，僅更新 `v50_full_pending_items.md`（反映 Theme pack 驗證通過的進度）和 `SHA256SUMS.txt`（重算），並新增本文件和 `v50_claude_memory_summary_v01.md`。

遊戲整合單檔（50_baseball_gm.html）、模組 ZIP（20 檔）、美術素材 ZIP（147 檔）完全未動。

---

*本驗證交接由 Claude 於 2026-07-25 完成。*
