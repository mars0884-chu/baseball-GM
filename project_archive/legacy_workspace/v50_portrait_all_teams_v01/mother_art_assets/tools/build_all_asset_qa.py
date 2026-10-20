from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "production_assets" / "teams"
OUTPUT = ROOT / "previews" / "v491_all_20_transparent_asset_qa_v01.png"
TEAMS = tuple(f"T{index}" for index in range(20))


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf"),
    )
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def checker(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGB", size, "#D9DEE7")
    draw = ImageDraw.Draw(image)
    width, height = size
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle(
                    (x, y, min(x + cell - 1, width), min(y + cell - 1, height)),
                    fill="#F4F6F9",
                )
    return image


def card(asset: Image.Image, title: str, width: int = 210) -> Image.Image:
    height = 210
    canvas = checker((width, height))
    preview = asset.copy()
    preview.thumbnail((156, 156), Image.Resampling.LANCZOS)
    x = (width - preview.width) // 2
    y = 42 + (156 - preview.height) // 2
    canvas.paste(preview, (x, y), preview)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, width, 36), fill="#111827")
    draw.text((12, 8), title, font=load_font(18), fill="white")
    return canvas


def main() -> None:
    margin = 24
    gap = 16
    card_width = 210
    card_height = 210
    teams_per_row = 4
    column_count = teams_per_row * 2
    row_count = (len(TEAMS) + teams_per_row - 1) // teams_per_row
    canvas = Image.new(
        "RGB",
        (
            margin * 2 + card_width * column_count + gap * (column_count - 1),
            margin * 2 + card_height * row_count + gap * (row_count - 1),
        ),
        "white",
    )

    for index, team_id in enumerate(TEAMS):
        team_dir = ASSET_ROOT / team_id
        logo = Image.open(team_dir / "logo_512.png").convert("RGBA")
        cap_reference = Image.open(
            team_dir / "cap_mark_reference_256.png"
        ).convert("RGBA")
        row = index // teams_per_row
        pair = index % teams_per_row
        y = margin + row * (card_height + gap)
        x = margin + pair * (card_width * 2 + gap * 2)
        canvas.paste(card(logo, f"{team_id} logo_512"), (x, y))
        canvas.paste(
            card(cap_reference, f"{team_id} capMark reference"),
            (x + card_width + gap, y),
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
