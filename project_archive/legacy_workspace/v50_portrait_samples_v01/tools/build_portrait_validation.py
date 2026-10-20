from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


SIZE = 256


def base_face(shape: str, skin: str) -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    outline = "#071B38"
    if shape == "round":
        face_box = (67, 55, 189, 190)
    else:
        face_box = (76, 48, 180, 194)
    draw.ellipse(face_box, fill=skin, outline=outline, width=5)
    draw.ellipse((88, 91, 103, 111), fill="#071B38")
    draw.ellipse((153, 91, 168, 111), fill="#071B38")
    draw.arc((113, 105, 143, 141), 25, 155, fill="#8A4E35", width=4)
    draw.arc((104, 132, 152, 161), 20, 160, fill="#8A4E35", width=4)
    return image


def hair_layer(style: str) -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    color = "#101C33" if style == "short" else "#3A2118"
    outline = "#071B38"
    if style == "short":
        points = [
            (72, 84), (78, 57), (94, 45), (111, 52), (128, 40),
            (145, 53), (164, 46), (181, 62), (184, 89),
            (166, 76), (153, 85), (137, 69), (122, 85),
            (106, 68), (92, 82),
        ]
    else:
        points = [
            (70, 79), (75, 52), (94, 39), (115, 50), (129, 36),
            (149, 49), (172, 43), (184, 67), (186, 126),
            (176, 160), (164, 175), (158, 135), (170, 101),
            (154, 81), (136, 70), (118, 84), (98, 70), (84, 99),
            (92, 141), (84, 171), (72, 144),
        ]
    draw.polygon(points, fill=color, outline=outline)
    draw.line(points + [points[0]], fill=outline, width=5, joint="curve")
    return image


def composite(
    cap: Image.Image,
    uniform: Image.Image,
    shape: str,
    skin: str,
    hair: str,
) -> Image.Image:
    canvas = base_face(shape, skin)
    canvas.alpha_composite(uniform)
    canvas.alpha_composite(hair_layer(hair))
    canvas.alpha_composite(cap)
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--team-dir", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--team-id", required=True)
    args = parser.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    cap = Image.open(args.team_dir / "capMark_256.png").convert("RGBA")
    uniforms = {
        "home": Image.open(args.team_dir / "homeUniform_256.png").convert("RGBA"),
        "away": Image.open(args.team_dir / "awayUniform_256.png").convert("RGBA"),
    }
    cases = [
        ("home_round_light_short", "home", "round", "#F2BE91", "short"),
        ("home_long_dark_long", "home", "long", "#9D603F", "long"),
        ("away_round_dark_short", "away", "round", "#9D603F", "short"),
        ("away_long_light_long", "away", "long", "#F2BE91", "long"),
    ]

    tiles: list[Image.Image] = []
    for name, uniform_name, shape, skin, hair in cases:
        result = composite(cap, uniforms[uniform_name], shape, skin, hair)
        result.save(args.out_dir / f"{name}_256.png", optimize=True)
        for size in (128, 64):
            result.resize((size, size), Image.Resampling.LANCZOS).save(
                args.out_dir / f"{name}_{size}.png",
                optimize=True,
            )
        tiles.append(result)

    sheet = Image.new("RGBA", (SIZE * 2, SIZE * 2), "#E8EDF5")
    for index, tile in enumerate(tiles):
        sheet.alpha_composite(tile, ((index % 2) * SIZE, (index // 2) * SIZE))
    sheet.save(
        args.out_dir / f"{args.team_id}_portrait_validation_contact_sheet.png",
        optimize=True,
    )
    print("cases=4 faceShapes=2 hairStyles=2 skinTones=2 sizes=256,128,64")


if __name__ == "__main__":
    main()
