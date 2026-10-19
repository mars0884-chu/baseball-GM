from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


MASTER_SIZE = 256


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("input contains no visible pixels")
    return bbox


def fit_layer(image: Image.Image, kind: str) -> Image.Image:
    image = image.convert("RGBA")
    cropped = image.crop(alpha_bbox(image))

    if kind == "cap":
        target_width, target_height = 224, 64
        target_top = 26
    elif kind == "uniform":
        target_width, target_height = 240, 72
        target_top = 184
    else:
        raise ValueError(f"unsupported kind: {kind}")

    resized = cropped.resize(
        (target_width, target_height),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    left = (MASTER_SIZE - resized.width) // 2
    if kind == "uniform":
        top = MASTER_SIZE - resized.height
    else:
        top = target_top
    canvas.alpha_composite(resized, (left, top))
    return canvas


def validate(image: Image.Image, kind: str) -> dict[str, object]:
    bbox = alpha_bbox(image)
    alpha = image.getchannel("A")
    corners = [
        alpha.getpixel((0, 0)),
        alpha.getpixel((255, 0)),
        alpha.getpixel((0, 255)),
        alpha.getpixel((255, 255)),
    ]
    expected_top = 26 if kind == "cap" else 184
    return {
        "size": list(image.size),
        "bbox": list(bbox),
        "transparentCorners": all(value == 0 for value in corners),
        "topAnchor": bbox[1],
        "expectedTop": expected_top,
        "anchorPass": abs(bbox[1] - expected_top) <= 1,
    }


def overlay_emblem(
    canvas: Image.Image,
    emblem_path: Path,
    center_x: int,
    center_y: int,
    width: int,
) -> None:
    emblem = Image.open(emblem_path).convert("RGBA")
    emblem = emblem.crop(alpha_bbox(emblem))
    height = max(1, round(emblem.height * (width / emblem.width)))
    emblem = emblem.resize((width, height), Image.Resampling.LANCZOS)
    canvas.alpha_composite(
        emblem,
        (center_x - width // 2, center_y - height // 2),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--kind", required=True, choices=("cap", "uniform"))
    parser.add_argument("--emblem", type=Path)
    parser.add_argument("--emblem-x", type=int)
    parser.add_argument("--emblem-y", type=int)
    parser.add_argument("--emblem-width", type=int)
    args = parser.parse_args()

    source = Image.open(args.input)
    master = fit_layer(source, args.kind)
    if args.emblem:
        required = (args.emblem_x, args.emblem_y, args.emblem_width)
        if any(value is None for value in required):
            raise ValueError("emblem x, y, and width are required with --emblem")
        overlay_emblem(
            master,
            args.emblem,
            args.emblem_x,
            args.emblem_y,
            args.emblem_width,
        )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    master.save(args.out, optimize=True)

    for size in (128, 64):
        preview = master.resize((size, size), Image.Resampling.LANCZOS)
        preview.save(
            args.out.with_name(f"{args.out.stem}_{size}.png"),
            optimize=True,
        )

    print(validate(master, args.kind))


if __name__ == "__main__":
    main()
