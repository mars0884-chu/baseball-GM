from __future__ import annotations

import argparse
import colorsys
from pathlib import Path

from PIL import Image


TEAM_COLORS = {
    "T1": {"cap": "#0B2D4F", "away": "#0B2D4F", "accent": "#13B5D1"},
    "T2": {"cap": "#0B1F3A", "away": "#6B3B1D", "accent": "#E5A928"},
    "T3": {"cap": "#A51C30", "away": "#A51C30", "accent": "#F2B84B"},
    "T4": {"cap": "#F0441D", "away": "#F0441D", "accent": "#F4C542"},
}


def rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def shade(target: tuple[int, int, int], luminance: float) -> tuple[int, int, int]:
    factor = 0.52 + 0.72 * (luminance / 255)
    return tuple(max(0, min(255, round(channel * factor))) for channel in target)


def classify(pixel: tuple[int, int, int, int]) -> tuple[float, float, float]:
    red, green, blue, _ = pixel
    luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    _, saturation, _ = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
    cyan_score = min(green, blue) - red
    return luminance, saturation, cyan_score


def recolor_cap(source: Image.Image, base: str, accent: str) -> Image.Image:
    result = source.copy().convert("RGBA")
    pixels = result.load()
    base_rgb, accent_rgb = rgb(base), rgb(accent)
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            luminance, _, cyan_score = classify((red, green, blue, alpha))
            if luminance < 24:
                continue
            target = accent_rgb if cyan_score > 45 else base_rgb
            nr, ng, nb = shade(target, luminance)
            pixels[x, y] = (nr, ng, nb, alpha)
    return result


def recolor_uniform(
    source: Image.Image,
    accent: str,
    away: str | None,
) -> Image.Image:
    result = source.copy().convert("RGBA")
    pixels = result.load()
    accent_rgb = rgb(accent)
    away_rgb = rgb(away) if away else None
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            luminance, saturation, cyan_score = classify((red, green, blue, alpha))
            if luminance < 28:
                continue
            if cyan_score > 35 or (saturation > 0.35 and blue > red):
                nr, ng, nb = shade(accent_rgb, luminance)
                pixels[x, y] = (nr, ng, nb, alpha)
            elif away_rgb and saturation < 0.30 and luminance > 45:
                nr, ng, nb = shade(away_rgb, luminance)
                pixels[x, y] = (nr, ng, nb, alpha)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cap-base", required=True, type=Path)
    parser.add_argument("--uniform-base", required=True, type=Path)
    parser.add_argument("--out-root", required=True, type=Path)
    args = parser.parse_args()

    cap_source = Image.open(args.cap_base).convert("RGBA")
    uniform_source = Image.open(args.uniform_base).convert("RGBA")

    for team_id, colors in TEAM_COLORS.items():
        team_dir = args.out_root / team_id
        team_dir.mkdir(parents=True, exist_ok=True)
        cap_path = team_dir / "capMark_alpha.png"
        home_path = team_dir / "homeUniform_alpha.png"
        away_path = team_dir / "awayUniform_alpha.png"
        if not cap_path.exists():
            recolor_cap(cap_source, colors["cap"], colors["accent"]).save(
                cap_path,
                optimize=True,
            )
        if not home_path.exists():
            recolor_uniform(uniform_source, colors["accent"], None).save(
                home_path,
                optimize=True,
            )
        if not away_path.exists():
            recolor_uniform(uniform_source, colors["accent"], colors["away"]).save(
                away_path,
                optimize=True,
            )
        print(f"{team_id}: cap/home/away variants written")


if __name__ == "__main__":
    main()
