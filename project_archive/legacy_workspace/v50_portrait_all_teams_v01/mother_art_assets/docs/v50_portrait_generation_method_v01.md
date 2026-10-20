# V50 20 隊肖像隊伍圖層產製方法 v01

## 來源

- T0 帽子、主場球衣、客場球衣使用內建 imagegen 依 T0 品牌概念板產生。
- T1 建立無徽記的共用帽子與白色主場球衣母版。
- 全部母版先使用純綠 chroma key，再以官方去背工具產生 Alpha PNG。
- T0–T4 候選樣板於 2026-07-26 經 Mars 核准後，才擴充 T5–T19。

## 批次規則

- 所有隊伍共用已核准的帽型與球衣剪裁，確保錨點及縮圖比例一致。
- 每隊使用既有正式 `cap_mark_reference_256.png` 或 `logo_128.png` 合成，不重新發明徽記。
- 帽子與客場球衣色彩以品牌概念板為美術權威。
- Theme pack 的 `primaryColor`／`secondaryColor` 保留 TEAM_DEFS 原值；素材色與 UI 色票各自遵循其權威來源。
- 256px 母版另外產出 128px 與 64px。

## 固定錨點

- `headTop`: (128, 26)
- `faceCenter`: (128, 97)
- `neckline`: (128, 184)
- 帽子頂端：y=26
- 球衣頂端：y=184
- 左右至少 8px 透明安全區

## 驗證

- 20 隊 × 3 主素材＝60 張。
- 120 張縮圖。
- 20 隊 × 4 種合成案例＝80 組，涵蓋兩臉型、兩髮型、兩膚色、主／客場。
- 自動規格驗證：1100/1100。

## 可重現來源

- `source_templates/portrait_v01/approved_cap_template_alpha.png`
- `source_templates/portrait_v01/approved_uniform_template_alpha.png`
- `tools/build_t5_t19_color_variants.py`
- `tools/process_portrait_asset.py`
- `tools/build_portrait_validation.py`
- `tools/build_all_teams_contact_sheets.py`
- `tools/validate_all_portrait_assets.py`
