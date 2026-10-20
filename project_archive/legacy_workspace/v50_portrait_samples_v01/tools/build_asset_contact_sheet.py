from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets-root", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    teams = [f"T{index}" for index in range(5)]
    assets = ["capMark", "homeUniform", "awayUniform"]
    tile_size = 256
    label_height = 28
    sheet = Image.new(
        "RGBA",
        (tile_size * len(assets), (tile_size + label_height) * len(teams)),
        "#E8EDF5",
    )
    draw = ImageDraw.Draw(sheet)

    for row, team_id in enumerate(teams):
        for column, asset_name in enumerate(assets):
            image = Image.open(
                args.assets_root / team_id / f"{asset_name}_256.png"
            ).convert("RGBA")
            left = column * tile_size
            top = row * (tile_size + label_height) + label_height
            sheet.alpha_composite(image, (left, top))
            draw.text(
                (left + 8, row * (tile_size + label_height) + 6),
                f"{team_id} {asset_name}",
                fill="#071B38",
            )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out, optimize=True)
    print(f"teams={len(teams)} assetsPerTeam={len(assets)} total=15")


if __name__ == "__main__":
    main()
