from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets-root", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    errors: list[str] = []
    checks: list[dict[str, object]] = []

    def check(condition: bool, label: str) -> None:
        checks.append({"label": label, "passed": bool(condition)})
        if not condition:
            errors.append(label)

    for team_index in range(5):
        team_id = f"T{team_index}"
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
            check(image.size == (256, 256), f"{team_id} {asset_name} is 256x256")
            check(bbox is not None, f"{team_id} {asset_name} has visible pixels")
            if bbox:
                check(
                    abs(bbox[1] - expected_top) <= 1,
                    f"{team_id} {asset_name} top anchor is {expected_top}",
                )
                check(
                    bbox[0] >= 8 and bbox[2] <= 248,
                    f"{team_id} {asset_name} keeps 8px side safety",
                )
            corners = (
                alpha.getpixel((0, 0)),
                alpha.getpixel((255, 0)),
                alpha.getpixel((0, 255)),
                alpha.getpixel((255, 255)),
            )
            check(
                all(value == 0 for value in corners),
                f"{team_id} {asset_name} corners transparent",
            )
            for size in (128, 64):
                preview = path.with_name(f"{asset_name}_256_{size}.png")
                check(
                    preview.exists(),
                    f"{team_id} {asset_name} {size}px preview exists",
                )
                if preview.exists():
                    check(
                        Image.open(preview).size == (size, size),
                        f"{team_id} {asset_name} preview is {size}x{size}",
                    )

    report = {
        "validationVersion": 1,
        "scope": "T0-T4 portrait layer samples",
        "teamCount": 5,
        "assetCount": 15,
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
