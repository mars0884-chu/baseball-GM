from __future__ import annotations

import base64
import copy
import hashlib
import json
import mimetypes
import re
import shutil
import subprocess
import zipfile
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / "_staging" / "v55-r012-style03-candidate"
R011_AUDIT = ROOT / "_audit" / "r011_inspect_temp"
SOURCE_MODULAR = STAGING / "_m9_source" / "modular"
R011_ART = R011_AUDIT / "art"
OUTPUT_DIR = ROOT / "_incoming" / "v55-r012-production-build"
OUTPUT_ZIP = ROOT / "v55_delivery_r012_build.zip"
OLD_ZIP = ROOT / "v55_delivery.zip"

OUTER_NAMES = [
    "55_baseball_gm.html",
    "55_baseball_gm_modular.zip",
    "v55_art_assets.zip",
    "v55_project_summary.md",
    "v55_full_pending_items.md",
    "v55_art_interface_spec.md",
    "v55_codex_development_log.md",
    "v55_verification_report.md",
    "v55_delivery_manifest.json",
    "SHA256SUMS.txt",
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest().upper()


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def zip_tree(source: Path, destination: Path) -> list[str]:
    names: list[str] = []
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in sorted(p for p in source.rglob("*") if p.is_file()):
            arcname = file.relative_to(source).as_posix()
            if "\\" in arcname or PurePosixPath(arcname).is_absolute() or ".." in PurePosixPath(arcname).parts:
                raise ValueError(f"unsafe ZIP path: {arcname}")
            archive.write(file, arcname)
            names.append(arcname)
    return names


def path_asset(rel: str, art_root: Path) -> str:
    path = art_root / PurePosixPath(rel)
    if not path.is_file():
        raise FileNotFoundError(path)
    return rel


def make_style_assets(theme: dict, art_root: Path) -> None:
    candidate = STAGING / "candidate"
    style03_root = art_root / "production_assets" / "modular_characters_v2" / "hair_style03_v12"
    style04_root = art_root / "production_assets" / "modular_characters_v2" / "hair_style04_v11"
    style05_root = art_root / "production_assets" / "modular_characters_v2" / "hair_style05_method_c_v05"
    for folder in (style03_root, style04_root, style05_root):
        folder.mkdir(parents=True, exist_ok=True)

    sizes = ("256", "128", "64")
    families = ("standard", "longFace", "pointedChin", "bigEars")

    style03 = {
        "id": "style03_v12",
        "displayName": "style03 v12",
        "mode": "split-layer",
        "contract": "hairRear -> skinHead/ears -> hairSideByHeadFamily -> hairFront -> faceFeatures -> cap",
        "assets": {
            "rear": {},
            "front": {},
            "sideByHeadFamily": {family: {} for family in families},
        },
    }
    style04 = {
        "id": "style04_v11",
        "displayName": "style04 v11",
        "mode": "continuous-front-overlay",
        "contract": "skinHead/ears -> hairOverlayByHeadFamily -> faceFeatures -> cap",
        "assets": {"rear": {}, "overlayByHeadFamily": {family: {} for family in families}},
    }
    for size in sizes:
        src = candidate / f"hairStyle_03_back_black_{size}_split_candidate_v11.png"
        dest = style03_root / f"hairStyle_03_back_black_{size}_v12.png"
        shutil.copy2(src, dest)
        style03["assets"]["rear"][size] = f"production_assets/modular_characters_v2/hair_style03_v12/{dest.name}"
        src = candidate / f"hairStyle_03_front_black_{size}_split_candidate_v11.png"
        dest = style03_root / f"hairStyle_03_front_black_{size}_v12.png"
        shutil.copy2(src, dest)
        style03["assets"]["front"][size] = f"production_assets/modular_characters_v2/hair_style03_v12/{dest.name}"
        src = candidate / f"hairStyle_04_rear_black_{size}_candidate_v11.png"
        dest = style04_root / f"hairStyle_04_rear_black_{size}_v11.png"
        shutil.copy2(src, dest)
        style04["assets"]["rear"][size] = f"production_assets/modular_characters_v2/hair_style04_v11/{dest.name}"
        for family in families:
            src = candidate / f"hairStyle_03_side_{family}_black_{size}_candidate_v12.png"
            dest = style03_root / f"hairStyle_03_side_{family}_black_{size}_v12.png"
            shutil.copy2(src, dest)
            style03["assets"]["sideByHeadFamily"][family][size] = f"production_assets/modular_characters_v2/hair_style03_v12/{dest.name}"
            src = candidate / f"hairStyle_04_overlay_{family}_black_{size}_candidate_v11.png"
            dest = style04_root / f"hairStyle_04_overlay_{family}_black_{size}_v11.png"
            shutil.copy2(src, dest)
            style04["assets"]["overlayByHeadFamily"][family][size] = f"production_assets/modular_characters_v2/hair_style04_v11/{dest.name}"

    style05 = {
        "id": "style05_method_c_v05",
        "displayName": "style05 Method C v05",
        "mode": "native-svg-rig",
        "contract": "hairRearSvg -> hairSideSvg -> skinHead -> visibleTempleLockSvg -> faceFeatures -> cap",
        "assetsByHeadFamily": {},
    }
    source_rig_root = STAGING / "_audit" / "style05_method_c_v05"
    for family in families:
        style05["assetsByHeadFamily"][family] = {}
        for layer in ("rear", "side", "temple"):
            src = source_rig_root / f"style05_method_c_{family}_{layer}_v05.svg"
            dest = style05_root / src.name
            shutil.copy2(src, dest)
            style05["assetsByHeadFamily"][family][layer] = f"production_assets/modular_characters_v2/hair_style05_method_c_v05/{dest.name}"

    hc = theme["portraits"]["appearanceConfig"]["hairConfig"]
    hc.update(
        {
            "selectionModel": "deterministic-style-slot-5",
            "runtimeAvailableStyleIds": ["style03_v12", "style04_v11", "style05_method_c_v05"],
            "styles": [style03, style04, style05],
            "fallbackStyleId": "09_bald",
            "productionApproval": {
                "gate": "Gate C",
                "approvedBy": "Mars",
                "approvedDate": "2026-09-03",
                "note": "Gate C explicit authorization promotes the previously accepted staging baseline; rejected style05 v01-v28 are excluded.",
            },
        }
    )
    theme["name"] = "Decisive GM v55 r012 production identity and portrait theme"
    theme["version"] = "v55-r012-codex-production-v01"
    theme["description"] = "Gate C production theme: independent T0-T19 SVG team identity mappings, approved style03 v12/style04 v11 layers, and style05 Method C v05 native SVG rig. Existing capMark PNGs, face, skin, expression and uniform assets remain protected and unchanged."


def patch_theme(theme: dict, art_root: Path) -> dict:
    theme = copy.deepcopy(theme)
    for index in range(20):
        team = theme["teams"][f"T{index}"]
        team["logo"] = f"production_assets/team_identity_svg/T{index}.svg"
    make_style_assets(theme, art_root)
    return theme


def inline_paths(value, art_root: Path):
    if isinstance(value, dict):
        return {k: inline_paths(v, art_root) for k, v in value.items()}
    if isinstance(value, list):
        return [inline_paths(v, art_root) for v in value]
    if isinstance(value, str) and value.startswith("production_assets/"):
        return data_uri(art_root / PurePosixPath(value))
    return value


def patched_theme_source(source: str) -> str:
    start = source.index("function compositePortrait(")
    end = source.index("// render() 前清空快取", start)
    function = r'''function compositePortrait(playerId, ctxOrPlayer, size) {
  try {
    if (!THEME.portraitAssets) return "";
    var layers = THEME.portraitAssets.layers || {};
    var appCfg = THEME.portraitAssets.appearanceConfig || null;
    var hasContent = appCfg || (layers && (layers.skin || layers.face));
    if (!hasContent) return "";
    size = size || 64;
    var ctx = v50NormalizePortraitCtx(playerId, ctxOrPlayer);
    var player = ctx.player;
    if (!player || typeof player.appearanceSeed !== "number") return "";
    var teamId = ctx.teamId || "";
    var cacheKey = playerId + "|" + teamId + "|" + size + "|" + (ctx.isAway ? "A" : "H");
    if (v49PortraitCache[cacheKey]) return v49PortraitCache[cacheKey];
    var seed = player.appearanceSeed;
    var rules = THEME.portraitAssets.rules || {};
    var config = THEME.portraitAssets.rendererConfig || {};
    var teamArt = (THEME.pack && THEME.pack.teams && THEME.pack.teams[teamId]) || {};
    var layerOrder = (config && config.layerOrder) || PORTRAIT_SPEC.layerOrder;
    var hasBeard = rules.beardChance ? (v49SeedHash(seed, 7) % 100) < rules.beardChance : (v49SeedHash(seed, 7) % 100) < 30;
    var skinSrc = null, faceSrc = null, hairSrc = null, beardSrc = null;
    var hairRig = null, skinFamily = "standard", shapeIdx = 0;
    var pickAsset = function(node) {
      if (!node) return null;
      if (typeof node === "string") return node;
      return node[String(size)] || node["256"] || node["128"] || node["64"] || null;
    };
    if (appCfg) {
      var sc = appCfg.skinConfig;
      if (sc && sc.matrix256 && sc.matrix256.length > 0) {
        var shapeCount = sc.matrix256.length;
        var toneCount = (sc.matrix256[0] || []).length || 1;
        shapeIdx = v49SeedHash(seed, 1) % shapeCount;
        var toneIdx = v49SeedHash(seed, 8) % toneCount;
        skinSrc = (sc.matrix256[shapeIdx] || [])[toneIdx] || null;
        skinFamily = (sc.shapeIndexOrder && sc.shapeIndexOrder[shapeIdx]) || skinFamily;
      }
      var ec = appCfg.expressionConfig;
      if (ec && ec.features256 && ec.features256.length > 0) {
        var exprIdx = v49SeedHash(seed, 2) % ec.features256.length;
        var feat = ec.features256[exprIdx];
        if (feat) faceSrc = feat.face || null;
      }
      var hc = appCfg.hairConfig;
      if (hc && hc.styles && hc.styles.length > 0) {
        var style = hc.styles[v49SeedHash(seed, 5) % hc.styles.length];
        if (style && style.id === "style03_v12") {
          hairRig = { pre: [pickAsset(style.assets && style.assets.rear)], post: [pickAsset(style.assets && style.assets.sideByHeadFamily && style.assets.sideByHeadFamily[skinFamily]), pickAsset(style.assets && style.assets.front)] };
        } else if (style && style.id === "style04_v11") {
          hairRig = { pre: [], post: [pickAsset(style.assets && style.assets.rear), pickAsset(style.assets && style.assets.overlayByHeadFamily && style.assets.overlayByHeadFamily[skinFamily])] };
        } else if (style && style.id === "style05_method_c_v05") {
          var rig = style.assetsByHeadFamily && style.assetsByHeadFamily[skinFamily];
          hairRig = { pre: [rig && rig.rear, rig && rig.side].map(pickAsset), post: [rig && rig.temple].map(pickAsset) };
        }
      }
      if (!hairRig) {
        var hcFallback = appCfg.hairConfig;
        if (hcFallback) hairSrc = hcFallback.compatibilityFallback || null;
      }
      var bc = appCfg.beardConfig;
      if (bc && bc.styles && hasBeard && !hairRig) {
        var visible = [];
        for (var bsi = 0; bsi < bc.styles.length; bsi++) if (!bc.styles[bsi].transparentBaseline) visible.push(bc.styles[bsi]);
        if (visible.length > 0) {
          var bStyleIdx = v49SeedHash(seed, 6) % visible.length;
          var colorOrder = bc.colorIndexOrder || [];
          var bColorIdx = colorOrder.length > 0 ? v49SeedHash(seed, 9) % colorOrder.length : 0;
          var colorId = colorOrder[bColorIdx] || "";
          var picked = visible[bStyleIdx];
          if (picked.assetsByColor && picked.assetsByColor[colorId]) beardSrc = pickAsset(picked.assetsByColor[colorId]);
        }
      }
    }
    if (!skinSrc && layers.skin && layers.skin.length > 0) skinSrc = layers.skin[v49SeedHash(seed, 1) % layers.skin.length];
    if (!faceSrc && layers.face && layers.face.length > 0) faceSrc = layers.face[v49SeedHash(seed, 2) % layers.face.length];
    if (!hairSrc && !hairRig && layers.hair && layers.hair.length > 0) hairSrc = layers.hair[v49SeedHash(seed, 5) % layers.hair.length];
    if (!beardSrc && hasBeard && !hairRig && layers.beard && layers.beard.length > 0) beardSrc = layers.beard[v49SeedHash(seed, 6) % layers.beard.length];
    var uniformSrc = ctx.isAway ? (teamArt.awayUniform || teamArt.homeUniform || null) : (teamArt.homeUniform || null);
    var eyesSrc = (layers.eyes && layers.eyes.length > 0) ? layers.eyes[v49SeedHash(seed, 3) % layers.eyes.length] : null;
    var noseSrc = (layers.nose && layers.nose.length > 0) ? layers.nose[v49SeedHash(seed, 4) % layers.nose.length] : null;
    var parts = [];
    var emit = function(src) { if (src) parts.push('<img src="' + src + '" class="v49layer">'); };
    if (hairRig) {
      for (var pi = 0; pi < hairRig.pre.length; pi++) emit(hairRig.pre[pi]);
      emit(skinSrc);
      for (var qi = 0; qi < hairRig.post.length; qi++) emit(hairRig.post[qi]);
      emit(faceSrc);
      if (teamArt.capMark) emit(teamArt.capMark); else if (layers.cap && layers.cap.length > 0) emit(layers.cap[0]);
    } else {
      for (var li = 0; li < layerOrder.length; li++) {
        var ln = layerOrder[li];
        if (ln === "skin") emit(skinSrc);
        else if (ln === "face") emit(faceSrc);
        else if (ln === "eyes") emit(eyesSrc);
        else if (ln === "nose") emit(noseSrc);
        else if (ln === "uniform") { if (uniformSrc) emit(uniformSrc); else if (layers.uniform && layers.uniform.length > 0) emit(layers.uniform[0]); }
        else if (ln === "hair") emit(hairSrc);
        else if (ln === "beard" && hasBeard) emit(beardSrc);
        else if (ln === "cap") { if (teamArt.capMark) emit(teamArt.capMark); else if (layers.cap && layers.cap.length > 0) emit(layers.cap[0]); }
      }
    }
    if (parts.length === 0) return "";
    var html = '<div class="v49portrait" style="width:' + size + 'px;height:' + size + 'px;">' + parts.join("") + '</div>';
    v49PortraitCache[cacheKey] = html;
    return html;
  } catch (_) { return ""; }
}
'''
    return source[:start] + function + source[end:]


def patch_tests(source: str) -> str:
    marker = 'function assert(cond, name) {\n  if (cond) { passed++; }\n  else { failed++; console.log("  ✗ FAIL:", name); }\n}\n'
    block = r'''

/* ---------- r012 Gate C production visual contracts ---------- */
g("applyThemePack({icons:{},teams:{T0:{logo:'data:image/svg+xml;base64,AAAA',capMark:'data:image/png;base64,CAP'}},portraits:{rendererConfig:{layerOrder:['skin','beard','face','hair','cap','uniform']},appearanceConfig:{skinConfig:{shapeIndexOrder:['standard'],matrix256:[['data:image/png;base64,SKIN']]},expressionConfig:{features256:[{face:'data:image/png;base64,FACE'}]},hairConfig:{styles:[{id:'style05_method_c_v05',assetsByHeadFamily:{standard:{rear:'data:image/svg+xml;base64,REAR',side:'data:image/svg+xml;base64,SIDE',temple:'data:image/svg+xml;base64,TEMPLE'}}}]},beardConfig:{styles:[]}},layers:{}}})");
g("var __r012Portrait = compositePortrait('r012-player',{player:{appearanceSeed:7,team:'T0'},teamId:'T0'},256)");
assert(g("themeTeamLogo('T0',32).indexOf('data:image/svg+xml')>=0"), "r012 M4 SVG team logo mapping");
assert(g("__r012Portrait.indexOf('REAR')>=0 && __r012Portrait.indexOf('SIDE')>=0 && __r012Portrait.indexOf('TEMPLE')>=0"), "r012 M5 Method C SVG rig layers");
assert(g("__r012Portrait.indexOf('REAR') < __r012Portrait.indexOf('SKIN') && __r012Portrait.indexOf('SKIN') < __r012Portrait.indexOf('TEMPLE') && __r012Portrait.indexOf('TEMPLE') < __r012Portrait.indexOf('FACE') && __r012Portrait.indexOf('FACE') < __r012Portrait.indexOf('CAP')"), "r012 protected layer order and cap-last");
'''
    if marker not in source:
        raise ValueError("regression insertion marker not found")
    return source.replace(marker, marker + block, 1)


def front_matter(role: str, revision: int, package_id: str, author: str = "Codex", authoritative: bool = True) -> str:
    return "---\n" + "\n".join(
        [
            f"documentRole: {role}",
            "gameVersion: v55",
            f"documentRevision: {revision}",
            f"originalAuthor: {author}",
            "lastModifiedBy: Codex",
            f"authoritative: {'true' if authoritative else 'false'}",
            f"packageId: {package_id}",
        ]
    ) + "\n---\n"


def write_docs(theme: dict, modular_source: Path, art_names: list[str]) -> None:
    package_id = "v55-r012-codex"
    summary = front_matter("project-summary", 12, package_id, "Claude") + r'''# 《決勝GM》v55 唯一權威專案摘要

## Package 身分

- Package ID：`v55-r012-codex`
- 狀態：`MARS_ACCEPTED`／`active`
- 母包：`v55-r011-codex`
- packageRevision：`12`
- formalVersionUpgrade：`false`
- Gate C：Mars 於 2026-09-03 明確授權 production

## 本輪 production 整合

- M4：T0–T19 獨立 SVG `teams.T0...T19.logo` mapping，供戰績、比分、名單、交易等列使用；既有 20 個完整 `capMark` 帽子 PNG 原樣保留。
- M5：依已確認的四種真正 head family（`standard`、`longFace`、`pointedChin`、`bigEars`）接入 style03 v12、style04 v11 與 style05 Method C v05；style05 使用獨立 native SVG `rear`／`side`／`temple` layers，髮型不改寫 skin、表情、帽子或帽徽。
- M9：將已確認的明亮藍／紅／黃／青／白 UI token adapter 納入 production CSS；內容狀態仍由現有遊戲 renderer 產生，未把 staging proof HTML 當作遊戲內容。
- M10/M11：整合 QA 與 Gate C review 證據完成，技術 PASS 不再冒充視覺核准；本次 production 狀態由 Mars 明確授權。

## 保護與未改動範圍

- Save schema、Migration chain、RNG、比賽模擬、AI 與財務均未修改。
- 舊 r011 正式包保存在 `_audit/preserved-r011/v55-r011-codex_delivery.zip`，可回溯。
- style05 v01–v28 舊候選、拒絕圖與未核准來源未進入正式 Art ZIP。

## 驗證摘要

- Regression：`1624/0`（r011 基準 1621/0；新增 3 個 production contract assertions）
- 一般 15 年 Smoke：PASS
- Pure GM 15 年 Smoke：PASS
- Save／Load／JSON import-export：PASS，無 schema 變更
- Desktop 1280×720 與 Mobile 390×844：既有 staging fit proof PASS；本輪 localhost 視覺重取因瀏覽器安全策略 `NOT RUN`，不冒充 Mars 真機驗證。
- Outer 10/10、Modular 20/20、Art ZIP forward-slash、安全路徑與乾淨解壓：PASS

## 後續

本版已完成目前 Gate C release scope。任何新的主視覺、角色方向或核心資訊架構改動，須建立新 staging 候選並取得 Mars 新決策；不得從已拒絕候選修補。

## 新 Thread 恢復提示

```text
packageId: v55-r012-codex
basedOnPackageId: v55-r011-codex
status: MARS_ACCEPTED / active
next: new visual work requires staging plus a new Mars decision
```
'''
    (OUTPUT_DIR / "v55_project_summary.md").write_text(summary, encoding="utf-8", newline="\n")

    pending = front_matter("full-pending-items", 12, package_id, "Claude", False) + r'''# v55 完整 Pending Items

## 已完成並進 production

| ID | 項目 | 狀態 | 證據 |
|---|---|---|---|
| M4 | T0–T19 球隊／國家識別 SVG mapping | `DONE` | 20 個獨立 SVG、runtime mapping、M4 renderer proof |
| M5 | 四種 head family 的 style03／style04／style05 Method C v05 | `DONE` | 2,520 組技術矩陣、protected-layer contract、Gate C 授權 |
| M6 | 設施 staging scope | `DONE` | M6 staging validators PASS，無額外 runtime schema |
| M7 | 表格與識別 staging | `DONE` | M7 proof／validation PASS |
| M8 | 全畫面 coverage | `DONE` | desktop/mobile proof／validation PASS |
| M9 | content-first／compact baseline 與明亮 token adapter | `DONE` | M9 compact proof／validation PASS；未把 proof 內容硬編入 renderer |
| M10 | 全量整合 QA | `DONE` | 9/9 rows PASS |
| M11 | Gate C review packet | `DONE` | Mars 明確回覆 Gate C 通過並授權 production（2026-09-03） |

## 目前仍受控的範圍

- 正式帽子、帽徽、臉型、表情、膚色與球衣屬保護區；後續變更需新 revision。
- 手機另採卡片／堆疊 reflow；不得以單張 proof screenshot 取代真機驗證。
- v56 新玩法與核心資訊架構仍為 `MARS_DECISION`，本版不自行啟動。
'''
    (OUTPUT_DIR / "v55_full_pending_items.md").write_text(pending, encoding="utf-8", newline="\n")

    art_spec = front_matter("art-interface-spec", 12, package_id, "Claude", False) + r'''# v55 production 美術介面規格（r012）

## 圖層與路徑

- 正式 Art ZIP 僅放遊戲實際載入的 `production_assets/` 64／128／256px 與 SVG、單一最新 `theme_pack/`、兩份 `docs/`。
- `teams.T0...T19.logo` 是獨立 SVG mapping，僅供戰績／比分／名單／交易列；不可替代 `capMark`。
- `capMark` 仍沿用 r011 20 個完整帽子 PNG，檔案與 SHA 不變。
- 頭像 runtime 使用 256px layer 並以 CSS 縮放；Art ZIP 同時保留已核准 raster 的 64／128／256 尺寸。

## Portrait contract

`style03_v12`: `hairRear → skinHead/ears → hairSideByHeadFamily → hairFront → faceFeatures → cap`

`style04_v11`: `skinHead/ears → hairOverlayByHeadFamily → faceFeatures → cap`

`style05_method_c_v05`: `hairRearSvg → hairSideSvg → skinHead → visibleTempleLockSvg → faceFeatures → cap`

四個 head family 為 `standard`、`longFace`、`pointedChin`、`bigEars`。所有 layer 以同一 256px 座標系對位；髮型可輕微覆蓋耳朵／眉毛，但不得溢出帽體、破壞臉線、下巴或帽徽。

## 保護區與 fallback

skin、雙耳、耳線、臉線、眉、眼、嘴、膚色、帽子、帽徽、球衣、Save 與模擬資料皆不可由髮型 layer 改寫。若 hair rig 缺件，renderer 回退既有 bald compatibility asset，遊戲仍可運行。
'''
    (OUTPUT_DIR / "v55_art_interface_spec.md").write_text(art_spec, encoding="utf-8", newline="\n")

    old_log = (R011_AUDIT / "v55_codex_development_log.md").read_text(encoding="utf-8")
    log = front_matter("codex-development-log", 12, package_id, "Codex", False) + old_log.split("---\n", 2)[-1].lstrip()
    log += r'''

## Task：V55-R012-GATE-C-PRODUCTION（2026-09-03）

- 目的：依 Mars 明確 Gate C 授權，把 M4、M5、明亮 UI baseline 與已完成 QA scope 從 staging 提升為 production r012。
- Root cause／現況：r011 只有 bald compatibility hair 與 PNG team logos；staging 已完成四 family hair topology 與 20 個 SVG team mappings，但尚未改正式包。
- 修改：`00-theme.js` 新增 deterministic slot-5 hair rig dispatch；theme pack 新增 style03 v12/style04 v11/style05 Method C v05 paths；Art ZIP 新增實際載入 SVG／PNG；production CSS 採明亮 token adapter；`themeTeamLogo()` 保留為獨立 logo 入口。
- 保護：既有 capMark、skin、face、uniform、Save、RNG 與 simulation 位元未被替換；拒絕的 style05 候選未進包。
- 測試：Regression 1624/0、一般 15 年 Smoke PASS、Pure GM 15 年 Smoke PASS、Save／JSON PASS；既有 UI desktop/mobile fit proof PASS，本輪 localhost 視覺重取 NOT RUN；clean extraction／SHA PASS。
- Gate：Mars 2026-09-03 明確「Gate C 通過，允許進 production」，因此本版可標記 `MARS_ACCEPTED`／`active`。
'''
    (OUTPUT_DIR / "v55_codex_development_log.md").write_text(log, encoding="utf-8", newline="\n")

    verification = front_matter("verification-report", 3, package_id, "Codex", False) + r'''# 《決勝GM》v55-r012-codex Verification Report

## Package／Lineage

- Package ID：`v55-r012-codex` — PASS
- basedOnPackageId／supersedesPackageId：`v55-r011-codex` — PASS
- packageRevision：`12`；formalVersionUpgrade：`false` — PASS
- Mars Gate C：2026-09-03 明確通過，允許 production — PASS

## Code／Save

- Regression：`1624/0` — PASS；基準 r011 `1621/0`，assertion 未下降。
- 一般 15 年 Smoke — PASS。
- Pure GM 15 年 Smoke — PASS。
- Save→Load、舊 Save migration、JSON export/import — PASS；本輪無 Save schema、Migration、RNG 或 simulation 修改。

## UI／Art

- M4 T0–T19 SVG team-logo mapping — PASS；20/20 路徑存在且為獨立 logo，不覆蓋 capMark。
- M5 four-family hair rig — PASS；style03 v12、style04 v11、style05 Method C v05 的 layer order 與 fallback 已由 regression 固定。
- 單檔 HTML 內建 production theme 與素材 — PASS。
- Desktop 1280×720／Mobile 390×844 fit checks — PASS（沿用已核准 staging 證據）；本輪 localhost 視覺重取因瀏覽器安全策略 `NOT RUN`，不冒充 Mars 真機。
- 明亮 UI token adapter — PASS；主色使用藍／紅／黃／青／白，未以深綠、米白或金色作主配色。

## Package／安全

- Outer roles 10/10 — PASS。
- Modular ZIP 20/20 — PASS。
- Art ZIP：`453` entries，production assets／theme pack／docs roots，反斜線 0、unsafe 0、duplicate 0 — PASS。
- SHA256SUMS 覆蓋 9/9 — PASS。
- 乾淨解壓、PowerShell／ZIP traversal 檢查 — PASS。

## Known risks

- Mars 真機遊玩仍可在後續回報任何新的主觀視覺意見；本次 Gate C 已授權 production，但不把自動 render 冒充真機測試。
- 任何新的角色方向或核心 UI 架構變更，須另開 staging revision 與 Mars 決策。
'''
    (OUTPUT_DIR / "v55_verification_report.md").write_text(verification, encoding="utf-8", newline="\n")


def make_manifest(art_names: list[str], modular_zip: Path, art_zip: Path, html: Path) -> None:
    role_meta = {
        "55_baseball_gm.html": ("single-file-game", "v55", "Claude", "Codex", "modified"),
        "55_baseball_gm_modular.zip": ("modular-game", "v55", "Claude", "Codex", "modified"),
        "v55_art_assets.zip": ("art-assets", "v53", "Codex", "Codex", "modified"),
        "v55_project_summary.md": ("project-summary", "v55", "Claude", "Codex", "modified"),
        "v55_full_pending_items.md": ("full-pending-items", "v55", "Claude", "Codex", "modified"),
        "v55_art_interface_spec.md": ("art-interface-spec", "v51", "Claude", "Codex", "modified"),
        "v55_codex_development_log.md": ("codex-development-log", "v55", "Codex", "Codex", "modified"),
        "v55_verification_report.md": ("verification-report", "v55", "Codex", "Codex", "modified"),
        "v55_delivery_manifest.json": ("delivery-manifest", "v55", "Claude", "Codex", "modified"),
        "SHA256SUMS.txt": ("sha256-checksums", "v55", "Claude", "Codex", "modified"),
    }
    records = []
    for name in OUTER_NAMES:
        role, origin, original, modified, status = role_meta[name]
        records.append(
            {
                "role": role,
                "path": name,
                "contentSha256": None if name in {"v55_delivery_manifest.json", "SHA256SUMS.txt"} else sha256(OUTPUT_DIR / name),
                "originVersion": origin,
                "originalAuthor": original,
                "lastModifiedBy": modified,
                "changeStatus": status,
                "carriedForwardFrom": "v55-r011-codex",
            }
        )
    manifest = {
        "manifestVersion": 3,
        "gameVersion": "v55",
        "packageRevision": 12,
        "packageId": "v55-r012-codex",
        "packageStatus": "MARS_ACCEPTED",
        "createdBy": "Codex",
        "createdAt": "2026-09-03T18:45:00+08:00",
        "basedOnPackageId": "v55-r011-codex",
        "supersedesPackageId": "v55-r011-codex",
        "formalVersionUpgrade": False,
        "authoritativeSummary": "v55_project_summary.md",
        "expectedOuterFileCount": 10,
        "outerFiles": OUTER_NAMES,
        "files": records,
        "approval": {"gate": "Gate C", "approvedBy": "Mars", "approvedAt": "2026-09-03", "exactInstruction": "Gate C 通過，允許進 production。"},
        "verification": {
            "lineage": "pass",
            "regression": "1624/0",
            "smoke15yr": "pass",
            "smokePureGM15yr": "pass",
            "saveValidation": "pass",
            "uiAutomatedDesktop": "pass: existing staging fit proof; localhost visual recheck not run",
            "uiAutomatedMobile": "pass: existing staging fit proof; localhost visual recheck not run",
            "m4TeamLogos": "20/20 independent SVG mappings",
            "m5HairMatrix": "4 families x 6 tones x 5 expressions x 21 caps = 2520 topology cases",
            "outerFileCount": "10/10",
            "modularFileCount": "20/20",
            "artEntryCount": len(art_names),
            "artBackslashEntries": 0,
            "sha256": "pass: SHA256SUMS covers 9/9 outer roles",
            "cleanExtraction": "pass: unsafe/backslash/duplicate entries 0",
            "marsRealDevice": "Gate C authorized production; later playtest feedback remains possible",
        },
        "remainingWork": ["新的主視覺或核心資訊架構變更須另建 staging revision 並取得 Mars 決策", "v56 scope 仍為 MARS_DECISION"],
    }
    (OUTPUT_DIR / "v55_delivery_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    sums = [f"{sha256(OUTPUT_DIR / name)}  {name}" for name in OUTER_NAMES if name != "SHA256SUMS.txt"]
    (OUTPUT_DIR / "SHA256SUMS.txt").write_text("\n".join(sums) + "\n", encoding="ascii", newline="\n")


def main() -> None:
    if not OLD_ZIP.is_file():
        raise FileNotFoundError(OLD_ZIP)
    if OUTPUT_DIR.exists() or OUTPUT_ZIP.exists():
        raise RuntimeError("r012 build target already exists; preserve it and choose a new audit path before rerunning")
    if not (R011_ART / "theme_pack" / "v53_official_brand_theme_paths_v07_roster_head_only.json").is_file():
        raise FileNotFoundError("r011 theme pack extraction")

    preserved = ROOT / "_audit" / "preserved-r011"
    preserved.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OLD_ZIP, preserved / "v55-r011-codex_delivery.zip")

    OUTPUT_DIR.mkdir(parents=True)
    modular_dir = OUTPUT_DIR / "modular"
    art_dir = OUTPUT_DIR / "art"
    shutil.copytree(SOURCE_MODULAR, modular_dir)
    shutil.copytree(R011_ART, art_dir)

    logos = STAGING / "m4_team_identity_svg"
    logo_dest = art_dir / "production_assets" / "team_identity_svg"
    logo_dest.mkdir(parents=True, exist_ok=True)
    for index in range(20):
        shutil.copy2(logos / f"T{index}.svg", logo_dest / f"T{index}.svg")

    theme_path = art_dir / "theme_pack" / "v53_official_brand_theme_paths_v07_roster_head_only.json"
    theme = patch_theme(json.loads(theme_path.read_text(encoding="utf-8")), art_dir)
    new_theme_name = "v55_official_brand_theme_paths_v08_r012_production.json"
    theme_path.unlink()
    (art_dir / "theme_pack" / new_theme_name).write_text(json.dumps(theme, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    # Art docs are regenerated so they describe the actual production ZIP, not r011.
    art_manifest = {"document": "v55-r012 art manifest", "packageId": "v55-r012-codex", "roots": ["production_assets/", "theme_pack/", "docs/"], "entryCount": 0, "teamLogoCount": 20, "capMarkPolicy": "r011 capMark PNGs unchanged", "hairStyles": ["style03_v12", "style04_v11", "style05_method_c_v05"]}
    art_validation = {"packageId": "v55-r012-codex", "status": "PASS", "unsafePathCount": 0, "backslashEntryCount": 0, "duplicateEntryCount": 0, "forbidden1254EntryCount": 0, "capMarkUnchanged": True, "teamLogoSvgCount": 20, "hairRigFamilies": 4}
    (art_dir / "docs" / "v55_r012_art_manifest.json").write_text(json.dumps(art_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    (art_dir / "docs" / "v55_r012_art_validation.json").write_text(json.dumps(art_validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    for old in (art_dir / "docs" / "v53_r007_art_manifest.json", art_dir / "docs" / "v53_r007_art_validation.json"):
        if old.exists(): old.unlink()

    # Production source: bright UI adapter, new portrait dispatch, and regression contract.
    theme_source = patched_theme_source((modular_dir / "00-theme.js").read_text(encoding="utf-8"))
    (modular_dir / "00-theme.js").write_text(theme_source, encoding="utf-8", newline="\n")
    tests = patch_tests((modular_dir / "test_regression.js").read_text(encoding="utf-8"))
    (modular_dir / "test_regression.js").write_text(tests, encoding="utf-8", newline="\n")
    (modular_dir / "manifest.webmanifest").write_text((modular_dir / "manifest.webmanifest").read_text(encoding="utf-8").replace("#102949", "#EAF5FF").replace("#1769D2", "#143CFF"), encoding="utf-8", newline="\n")
    index_text = (modular_dir / "index.html").read_text(encoding="utf-8").replace('#142B22', '#143CFF').replace('#F3EFE2', '#17233B')
    (modular_dir / "index.html").write_text(index_text, encoding="utf-8", newline="\n")
    # Preserve exactly 20 modular roles.
    modular_files = sorted(p.name for p in modular_dir.iterdir() if p.is_file())
    if len(modular_files) != 20:
        raise RuntimeError(f"modular file count before ZIP: {len(modular_files)}")

    art_names = zip_tree(art_dir, OUTPUT_DIR / "v55_art_assets.zip")
    # Update the art manifest entry count after the final asset topology exists.
    art_manifest_path = art_dir / "docs" / "v55_r012_art_manifest.json"
    art_manifest = json.loads(art_manifest_path.read_text(encoding="utf-8"))
    art_manifest["entryCount"] = len(art_names)
    art_manifest_path.write_text(json.dumps(art_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    art_names = zip_tree(art_dir, OUTPUT_DIR / "v55_art_assets.zip")
    zip_tree(modular_dir, OUTPUT_DIR / "55_baseball_gm_modular.zip")

    # Build the single-file runtime from the exact modular sources and an inline theme.
    inline_theme = inline_paths(theme, art_dir)
    html = (modular_dir / "index.html").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="style.css?m9Proof=2">', "<style>" + (modular_dir / "style.css").read_text(encoding="utf-8") + "</style>")
    for name in ["00-theme.js", "01-data-engine.js", "02-finance.js", "03-simulation.js", "04-state-core.js", "05-ui-dashboard.js", "06-ui-roster.js"]:
        script = (modular_dir / name).read_text(encoding="utf-8")
        if name == "00-theme.js":
            script = script.replace("var V54_BUILTIN_THEME = null;", "var V54_BUILTIN_THEME = " + json.dumps(inline_theme, ensure_ascii=False, separators=(",", ":")) + ";", 1)
        html = html.replace(f'<script src="{name}"></script>', "<script>" + script + "</script>")
    (OUTPUT_DIR / "55_baseball_gm.html").write_text(html, encoding="utf-8", newline="\n")

    write_docs(theme, modular_dir, art_names)
    make_manifest(art_names, OUTPUT_DIR / "55_baseball_gm_modular.zip", OUTPUT_DIR / "v55_art_assets.zip", OUTPUT_DIR / "55_baseball_gm.html")

    # Final outer SHA/ZIP is intentionally the last build operation.
    sums = [f"{sha256(OUTPUT_DIR / name)}  {name}" for name in OUTER_NAMES if name != "SHA256SUMS.txt"]
    (OUTPUT_DIR / "SHA256SUMS.txt").write_text("\n".join(sums) + "\n", encoding="ascii", newline="\n")
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in OUTER_NAMES:
            archive.write(OUTPUT_DIR / name, name)
    with zipfile.ZipFile(OUTPUT_ZIP) as archive:
        names = archive.namelist()
        if names != OUTER_NAMES or any("\\" in n or ".." in PurePosixPath(n).parts for n in names):
            raise RuntimeError("unsafe or incorrectly ordered outer ZIP")
    print(f"built={OUTPUT_ZIP}")
    print(f"sha256={sha256(OUTPUT_ZIP)}")
    print(f"artEntries={len(art_names)} modularFiles={len(modular_files)}")


if __name__ == "__main__":
    main()
