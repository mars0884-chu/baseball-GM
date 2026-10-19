from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets-root", required=True, type=Path)
    parser.add_argument("--validation-root", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    checks: list[dict[str, object]] = []
    errors: list[str] = []

    def check(condition: bool, label: str) -> None:
        checks.append({"label": label, "passed": bool(condition)})
        if not condition:
            errors.append(label)

    for index in range(20):
        team_id = f"T{index}"
        for asset_name, expected_top in (
            ("capMark", 26),
            ("homeUniform", 184),
            ("awayUniform", 184),
        ):
            path = args.assets_root / team_id / f"{asset_name}_256.png"
            check(path.exists(), f"{team_id} {asset_name} exists")
            if not path.exists():
                continue
            image = Image.open(path).convert("RGBA")
            alpha = image.getchannel("A")
            bbox = alpha.getbbox()
            check(image.size == (256, 256), f"{team_id} {asset_name} 256x256")
            check(bbox is not None, f"{team_id} {asset_name} visible")
            if bbox:
                check(
                    abs(bbox[1] - expected_top) <= 1,
                    f"{team_id} {asset_name} top={expected_top}",
                )
                check(
                    bbox[0] >= 8 and bbox[2] <= 248,
                    f"{team_id} {asset_name} side safety",
                )
            check(
                all(
                    alpha.getpixel(point) == 0
                    for point in ((0, 0), (255, 0), (0, 255), (255, 255))
                ),
                f"{team_id} {asset_name} transparent corners",
            )
            for size in (128, 64):
                preview = path.with_name(f"{asset_name}_256_{size}.png")
                check(preview.exists(), f"{team_id} {asset_name} {size}px exists")
                if preview.exists():
                    check(
                        Image.open(preview).size == (size, size),
                        f"{team_id} {asset_name} {size}px dimensions",
                    )

        contact = (
            args.validation_root
            / team_id
            / f"{team_id}_portrait_validation_contact_sheet.png"
        )
        check(contact.exists(), f"{team_id} four-case contact sheet exists")
        for case in (
            "home_round_light_short",
            "home_long_dark_long",
            "away_round_dark_short",
            "away_long_light_long",
        ):
            for size in (256, 128, 64):
                path = args.validation_root / team_id / f"{case}_{size}.png"
                check(path.exists(), f"{team_id} {case} {size}px exists")
                if path.exists():
                    check(
                        Image.open(path).size == (size, size),
                        f"{team_id} {case} {size}px dimensions",
                    )

    report = {
        "validationVersion": 1,
        "scope": "T0-T19 portrait layers and composite fixtures",
        "teamCount": 20,
        "masterAssetCount": 60,
        "thumbnailCount": 120,
        "compositeCaseCount": 80,
        "checkCount": len(checks),
        "passedCount": sum(1 for item in checks if item["passed"]),
        "failedCount": len(errors),
        "passed": not errors,
        "errors": errors,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
