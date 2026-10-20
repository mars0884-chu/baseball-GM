from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "v491_all_brand_asset_manifest_v01.json"
REPORT = ROOT / "docs" / "v491_all_brand_asset_validation_v01.json"
EXPECTED_LOGO_SIZES = (512, 128, 64, 32)


def validate_image(path: Path, expected_size: int) -> dict[str, object]:
    if not path.exists():
        raise AssertionError(f"Missing asset: {path}")
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        if rgba.size != (expected_size, expected_size):
            raise AssertionError(f"Wrong dimensions: {path} is {rgba.size}")
        bbox = rgba.getchannel("A").getbbox()
        if bbox is None:
            raise AssertionError(f"Fully transparent asset: {path}")
        if bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= expected_size or bbox[3] >= expected_size:
            raise AssertionError(f"Opaque pixels touch canvas edge: {path}, bbox={bbox}")
        alpha_extrema = rgba.getchannel("A").getextrema()
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "size": [expected_size, expected_size],
        "alphaBoundingBox": list(bbox),
        "alphaExtrema": list(alpha_extrema),
    }


def main() -> None:
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    teams = payload["teams"]
    if list(teams) != [f"T{index}" for index in range(20)]:
        raise AssertionError("Manifest must contain ordered team IDs T0-T19")

    results: dict[str, object] = {}
    for team_id, mapping in teams.items():
        team_dir = ROOT / "production_assets" / "teams" / team_id
        images = [
            validate_image(team_dir / f"logo_{size}.png", size)
            for size in EXPECTED_LOGO_SIZES
        ]
        images.append(validate_image(team_dir / "cap_mark_reference_256.png", 256))
        if mapping["cityUniform"] is not None:
            raise AssertionError(f"{team_id} cityUniform must remain null")
        results[team_id] = {
            "name": mapping["name"],
            "status": "pass",
            "images": images,
            "blockedFields": ["capMark", "homeUniform", "awayUniform"],
        }

    report = {
        "version": "v491-all-brand-asset-validation-v01",
        "status": "pass",
        "teamCount": len(results),
        "imageCount": len(results) * 5,
        "checks": [
            "ordered team IDs T0-T19",
            "RGBA PNG dimensions",
            "non-empty alpha",
            "transparent padding on every canvas edge",
            "cityUniform remains null",
        ],
        "teams": results,
    }
    REPORT.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(REPORT)


if __name__ == "__main__":
    main()
