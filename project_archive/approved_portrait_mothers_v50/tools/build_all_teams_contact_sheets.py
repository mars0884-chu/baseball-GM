from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


BG = "#E8EDF5"
INK = "#071B38"
TEAM_COLUMNS = 4
TEAM_ROWS = 5
ASSET_SIZE = 128
LABEL_HEIGHT = 24


def build_asset_sheet(assets_root: Path) -> Image.Image:
    cell_width = ASSET_SIZE * 3
    cell_height = LABEL_HEIGHT + ASSET_SIZE
    sheet = Image.new(
        "RGBA",
        (cell_width * TEAM_COLUMNS, cell_height * TEAM_ROWS),
        BG,
    )
    draw = ImageDraw.Draw(sheet)
    for index in range(20):
        team_id = f"T{index}"
        column, row = index % TEAM_COLUMNS, index // TEAM_COLUMNS
        left, top = column * cell_width, row * cell_height
        draw.text((left + 6, top + 5), team_id, fill=INK)
        for asset_index, asset_name in enumerate(
            ("capMark", "homeUniform", "awayUniform")
        ):
            image = Image.open(
                assets_root / team_id / f"{asset_name}_256_128.png"
            ).convert("RGBA")
            sheet.alpha_composite(
                image,
                (left + asset_index * ASSET_SIZE, top + LABEL_HEIGHT),
            )
    return sheet


def build_portrait_sheet(validation_root: Path) -> Image.Image:
    tile_size = 128
    cell_width = tile_size
    cell_height = LABEL_HEIGHT + tile_size
    sheet = Image.new(
        "RGBA",
        (cell_width * TEAM_COLUMNS, cell_height * TEAM_ROWS),
        BG,
    )
    draw = ImageDraw.Draw(sheet)
    for index in range(20):
        team_id = f"T{index}"
        column, row = index % TEAM_COLUMNS, index // TEAM_COLUMNS
        left, top = column * cell_width, row * cell_height
        draw.text((left + 6, top + 5), team_id, fill=INK)
        case = (
            "home_round_light_short_128.png"
            if index % 2 == 0
            else "away_long_light_long_128.png"
        )
        image = Image.open(validation_root / team_id / case).convert("RGBA")
        sheet.alpha_composite(image, (left, top + LABEL_HEIGHT))
    return sheet


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets-root", required=True, type=Path)
    parser.add_argument("--validation-root", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    args = parser.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    asset_sheet = build_asset_sheet(args.assets_root)
    portrait_sheet = build_portrait_sheet(args.validation_root)
    asset_sheet.save(
        args.out_dir / "v50_all_20_portrait_assets_contact_sheet_v01.png",
        optimize=True,
    )
    portrait_sheet.save(
        args.out_dir / "v50_all_20_portrait_composites_contact_sheet_v01.png",
        optimize=True,
    )
    print("teams=20 masterAssets=60 representativeComposites=20")


if __name__ == "__main__":
    main()
