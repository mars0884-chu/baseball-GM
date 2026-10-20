from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


ART_COLORS = {
    "T5": {"cap": "#2E4057", "away": "#2E4057", "accent": "#D4AF37"},
    "T6": {"cap": "#3B1C70", "away": "#3B1C70", "accent": "#F0A43A"},
    "T7": {"cap": "#1C1C1C", "away": "#1C1C1C", "accent": "#C0C0C0"},
    "T8": {"cap": "#0B5D45", "away": "#0B5D45", "accent": "#E6F4EF"},
    "T9": {"cap": "#1C1C1C", "away": "#D95A1A", "accent": "#E8571C"},
    "T10": {"cap": "#166534", "away": "#166534", "accent": "#E0A11A"},
    "T11": {"cap": "#0077B6", "away": "#0077B6", "accent": "#48CAE4"},
    "T12": {"cap": "#1C1C1C", "away": "#1C1C1C", "accent": "#E8A838"},
    "T13": {"cap": "#174C2E", "away": "#174C2E", "accent": "#D4A373"},
    "T14": {"cap": "#B22222", "away": "#B22222", "accent": "#FFD700"},
    "T15": {"cap": "#C41E3A", "away": "#C41E3A", "accent": "#FFFACD"},
    "T16": {"cap": "#008C9E", "away": "#008C9E", "accent": "#F5F5DC"},
    "T17": {"cap": "#2D6A4F", "away": "#2D6A4F", "accent": "#B7E4C7"},
    "T18": {"cap": "#1E3A5F", "away": "#1E3A5F", "accent": "#E8E8E8"},
    "T19": {"cap": "#1E2D3D", "away": "#1E2D3D", "accent": "#D4AF37"},
}


def parse_hex(value: str) -> np.ndarray:
    value = value.removeprefix("#")
    return np.array(
        [int(value[index : index + 2], 16) for index in (0, 2, 4)],
        dtype=np.float32,
    )


def shade(target: np.ndarray, luminance: np.ndarray) -> np.ndarray:
    factor = 0.52 + 0.72 * (luminance / 255.0)
    return np.clip(target[None, None, :] * factor[..., None], 0, 255)


def metrics(array: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rgb = array[..., :3].astype(np.float32)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    saturation = np.divide(
        maximum - minimum,
        maximum,
        out=np.zeros_like(maximum),
        where=maximum > 0,
    )
    cyan_score = np.minimum(green, blue) - red
    return luminance, saturation, cyan_score


def recolor_cap(source: np.ndarray, base_hex: str, accent_hex: str) -> np.ndarray:
    result = source.copy()
    luminance, _, cyan_score = metrics(result)
    visible = result[..., 3] > 0
    editable = visible & (luminance >= 24)
    accent_mask = editable & (cyan_score > 45)
    base_mask = editable & ~accent_mask
    result[..., :3][base_mask] = shade(parse_hex(base_hex), luminance)[base_mask]
    result[..., :3][accent_mask] = shade(parse_hex(accent_hex), luminance)[accent_mask]
    return result


def recolor_uniform(
    source: np.ndarray,
    accent_hex: str,
    away_hex: str | None,
) -> np.ndarray:
    result = source.copy()
    luminance, saturation, cyan_score = metrics(result)
    rgb = result[..., :3].astype(np.float32)
    red, blue = rgb[..., 0], rgb[..., 2]
    visible = result[..., 3] > 0
    editable = visible & (luminance >= 28)
    accent_mask = editable & ((cyan_score > 35) | ((saturation > 0.35) & (blue > red)))
    result[..., :3][accent_mask] = shade(
        parse_hex(accent_hex),
        luminance,
    )[accent_mask]
    if away_hex:
        fabric_mask = editable & ~accent_mask & (saturation < 0.30) & (luminance > 45)
        result[..., :3][fabric_mask] = shade(
            parse_hex(away_hex),
            luminance,
        )[fabric_mask]
    return result


def save(array: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(array.astype(np.uint8), "RGBA").save(path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cap-base", required=True, type=Path)
    parser.add_argument("--uniform-base", required=True, type=Path)
    parser.add_argument("--theme", required=True, type=Path)
    parser.add_argument("--out-root", required=True, type=Path)
    args = parser.parse_args()

    cap_source = np.array(Image.open(args.cap_base).convert("RGBA"))
    uniform_source = np.array(Image.open(args.uniform_base).convert("RGBA"))
    theme = json.loads(args.theme.read_text(encoding="utf-8"))

    for index in range(5, 20):
        team_id = f"T{index}"
        team = theme["teams"][team_id]
        colors = ART_COLORS[team_id]
        team_dir = args.out_root / team_id
        save(
            recolor_cap(cap_source, colors["cap"], colors["accent"]),
            team_dir / "capMark_alpha.png",
        )
        save(
            recolor_uniform(uniform_source, colors["accent"], None),
            team_dir / "homeUniform_alpha.png",
        )
        save(
            recolor_uniform(uniform_source, colors["accent"], colors["away"]),
            team_dir / "awayUniform_alpha.png",
        )
        print(
            f"{team_id}: cap={colors['cap']} away={colors['away']} "
            f"accent={colors['accent']} theme={team['primaryColor']}/{team['secondaryColor']}"
        )


if __name__ == "__main__":
    main()
