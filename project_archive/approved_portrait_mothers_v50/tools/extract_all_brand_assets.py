from __future__ import annotations

import hashlib
import json
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "previews"
OUTPUT = ROOT / "production_assets" / "teams"
MANIFEST = ROOT / "docs" / "v491_all_brand_asset_manifest_v01.json"

TEAMS = [
    {
        "id": "T0",
        "name": "靖安盾衛",
        "source": "T0_jingan_shield_guardians_identity_board_v01_two_uniforms.png",
        "primaryColor": "#1769D2",
        "secondaryColor": "#FFFFFF",
    },
    {
        "id": "T1",
        "name": "臨海獵鯊",
        "source": "T1_linhai_harbor_sharks_identity_board_v02_two_uniforms.png",
        "primaryColor": "#063B66",
        "secondaryColor": "#20C6D7",
    },
    {
        "id": "T2",
        "name": "曲江水牛",
        "source": "T2_qujiang_water_buffalo_identity_board_v01_two_uniforms.png",
        "primaryColor": "#6B3F24",
        "secondaryColor": "#E7B84B",
    },
    {
        "id": "T3",
        "name": "永昌雄獅",
        "source": "T3_yongchang_lions_identity_board_v01_two_uniforms.png",
        "primaryColor": "#A6232B",
        "secondaryColor": "#F2C14E",
    },
    {
        "id": "T4",
        "name": "明陽烈焰",
        "source": "T4_mingyang_blaze_identity_board_v02_chibi_fixed_two_uniforms.png",
        "primaryColor": "#E0442E",
        "secondaryColor": "#FFD166",
    },
    {
        "id": "T5",
        "name": "天啟鷹",
        "source": "T5_tianqi_eagles_identity_board_v01_two_uniforms.png",
        "primaryColor": "#182B49",
        "secondaryColor": "#D6A84B",
    },
    {
        "id": "T6",
        "name": "龍城雲豹",
        "source": "T6_longcheng_clouded_leopards_identity_board_v01_two_uniforms.png",
        "primaryColor": "#4A1F6F",
        "secondaryColor": "#F0A34A",
    },
    {
        "id": "T7",
        "name": "星野銀狐",
        "source": "T7_xingye_silver_foxes_identity_board_v01_two_uniforms.png",
        "primaryColor": "#293241",
        "secondaryColor": "#C8D5E1",
    },
    {
        "id": "T8",
        "name": "雲夢白鷺",
        "source": "T8_yunmeng_egrets_identity_board_v01_two_uniforms.png",
        "primaryColor": "#2A7F62",
        "secondaryColor": "#F6F1DF",
    },
    {
        "id": "T9",
        "name": "東寧豹",
        "source": "T9_dongning_leopards_identity_board_v01_two_uniforms.png",
        "primaryColor": "#C24A22",
        "secondaryColor": "#172A3A",
    },
    {
        "id": "T10",
        "name": "嘉禾金穗",
        "source": "T10_jiahe_golden_harvest_identity_board_v02_two_uniforms.png",
        "primaryColor": "#2F6B3C",
        "secondaryColor": "#E9B949",
    },
    {
        "id": "T11",
        "name": "瑞港海豚",
        "source": "T11_ruigang_dolphins_identity_board_v01_two_uniforms.png",
        "primaryColor": "#0077A8",
        "secondaryColor": "#7EE0D6",
    },
    {
        "id": "T12",
        "name": "金川礦工",
        "source": "T12_jinchuan_miners_identity_board_v02_two_uniforms.png",
        "primaryColor": "#343A40",
        "secondaryColor": "#F28C28",
    },
    {
        "id": "T13",
        "name": "玄武黑熊",
        "source": "T13_xuanwu_black_bears_identity_board_v01_two_uniforms.png",
        "primaryColor": "#173D2B",
        "secondaryColor": "#D9C7A2",
    },
    {
        "id": "T14",
        "name": "朝陽赤鷹",
        "source": "T14_chaoyang_red_hawks_identity_board_v01_two_uniforms.png",
        "primaryColor": "#B32025",
        "secondaryColor": "#F4D35E",
    },
    {
        "id": "T15",
        "name": "鳳鳴紅雀",
        "source": "T15_fengming_redbirds_identity_board_v01_two_uniforms.png",
        "primaryColor": "#B3263E",
        "secondaryColor": "#F4A6C1",
    },
    {
        "id": "T16",
        "name": "銀灘破浪",
        "source": "T16_yintan_breakers_identity_board_v01_two_uniforms.png",
        "primaryColor": "#00A6A6",
        "secondaryColor": "#F25F5C",
    },
    {
        "id": "T17",
        "name": "青川山羌",
        "source": "T17_qingchuan_serows_identity_board_v01_two_uniforms.png",
        "primaryColor": "#376B45",
        "secondaryColor": "#D6B36A",
    },
    {
        "id": "T18",
        "name": "望海白鯨",
        "source": "T18_wanghai_white_whales_identity_board_v01_two_uniforms.png",
        "primaryColor": "#0B4F8A",
        "secondaryColor": "#EAF6FF",
    },
    {
        "id": "T19",
        "name": "磐石鐵衛",
        "source": "T19_panshi_iron_guard_identity_board_v01_two_uniforms.png",
        "primaryColor": "#33415C",
        "secondaryColor": "#C6A15B",
    },
]


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return sum((int(x) - int(y)) ** 2 for x, y in zip(a, b)) ** 0.5


def connected_background_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    rgb = rgba.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()

    border_samples = []
    for x in range(width):
        border_samples.append(pixels[x, 0])
        border_samples.append(pixels[x, height - 1])
    for y in range(height):
        border_samples.append(pixels[0, y])
        border_samples.append(pixels[width - 1, y])
    key = tuple(
        sorted(channel_values)[len(channel_values) // 2]
        for channel_values in zip(*border_samples)
    )

    visited = bytearray(width * height)
    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    queue: deque[tuple[int, int]] = deque()

    def add(x: int, y: int) -> None:
        index = y * width + x
        if visited[index]:
            return
        visited[index] = 1
        distance = color_distance(pixels[x, y], key)
        if distance > 52:
            return
        queue.append((x, y))
        if distance <= 14:
            alpha_pixels[x, y] = 0
        else:
            alpha_pixels[x, y] = min(255, round((distance - 14) / 38 * 255))

    for x in range(width):
        add(x, 0)
        add(x, height - 1)
    for y in range(height):
        add(0, y)
        add(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            add(x - 1, y)
        if x + 1 < width:
            add(x + 1, y)
        if y > 0:
            add(x, y - 1)
        if y + 1 < height:
            add(x, y + 1)

    rgba.putalpha(alpha)
    return rgba


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    width, height = alpha.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    largest: list[tuple[int, int]] = []

    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if visited[start_index] or pixels[start_x, start_y] <= 8:
                continue
            visited[start_index] = 1
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            component: list[tuple[int, int]] = []

            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for next_x, next_y in (
                    (x - 1, y),
                    (x + 1, y),
                    (x, y - 1),
                    (x, y + 1),
                    (x - 1, y - 1),
                    (x + 1, y - 1),
                    (x - 1, y + 1),
                    (x + 1, y + 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    index = next_y * width + next_x
                    if visited[index]:
                        continue
                    visited[index] = 1
                    if pixels[next_x, next_y] > 8:
                        queue.append((next_x, next_y))

            if len(component) > len(largest):
                largest = component

    if not largest:
        raise ValueError("Asset has no opaque component")

    cleaned_alpha = Image.new("L", (width, height), 0)
    cleaned_pixels = cleaned_alpha.load()
    for x, y in largest:
        cleaned_pixels[x, y] = pixels[x, y]
    rgba.putalpha(cleaned_alpha)
    return rgba


def normalized_crop(
    source: Image.Image, box: tuple[float, float, float, float]
) -> Image.Image:
    width, height = source.size
    return source.crop(
        (
            round(width * box[0]),
            round(height * box[1]),
            round(width * box[2]),
            round(height * box[3]),
        )
    )


def fit_transparent(image: Image.Image, size: int, padding: int) -> Image.Image:
    bbox = image.getbbox()
    if not bbox:
        raise ValueError("Asset became fully transparent")
    cropped = image.crop(bbox)
    max_side = size - padding * 2
    cropped.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(
        cropped,
        ((size - cropped.width) // 2, (size - cropped.height) // 2),
    )
    return canvas


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def export_asset(
    source: Image.Image,
    box: tuple[float, float, float, float],
    output_path: Path,
    size: int,
    padding: int,
) -> None:
    extracted = connected_background_alpha(normalized_crop(source, box))
    extracted = keep_largest_alpha_component(extracted)
    fit_transparent(extracted, size, padding).save(output_path, optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    teams: dict[str, dict[str, object]] = {}

    for team in TEAMS:
        source_path = PREVIEWS / team["source"]
        if not source_path.exists():
            raise SystemExit(f"Missing source: {source_path}")
        team_dir = OUTPUT / team["id"]
        team_dir.mkdir(exist_ok=True)

        with Image.open(source_path) as opened:
            source = opened.convert("RGB")
            logo_512 = team_dir / "logo_512.png"
            cap_reference_256 = team_dir / "cap_mark_reference_256.png"
            export_asset(
                source,
                (0.025, 0.01, 0.375, 0.48),
                logo_512,
                512,
                24,
            )
            export_asset(
                source,
                (0.36, 0.015, 0.665, 0.46),
                cap_reference_256,
                256,
                20,
            )

        logo = Image.open(logo_512).convert("RGBA")
        for size in (128, 64, 32):
            fit_transparent(logo, size, max(3, round(size * 0.05))).save(
                team_dir / f"logo_{size}.png",
                optimize=True,
            )

        teams[team["id"]] = {
            "name": team["name"],
            "primaryColor": team["primaryColor"],
            "secondaryColor": team["secondaryColor"],
            "logo": f"production_assets/teams/{team['id']}/logo_512.png",
            "logoSha256": sha256(logo_512),
            "capMarkReference": (
                f"production_assets/teams/{team['id']}/"
                "cap_mark_reference_256.png"
            ),
            "capMarkReferenceSha256": sha256(cap_reference_256),
            "capMark": None,
            "homeUniform": None,
            "awayUniform": None,
            "cityUniform": None,
            "integrationStatus": "logo-and-colors-ready",
            "blockedBy": [
                "capMark full-cap-vs-insignia contract",
                "portrait canvas and anchor specification",
                "portrait layer z-order specification",
            ],
        }

    payload = {
        "version": "v491-all-brand-assets-v01",
        "scope": "all teams T0-T19",
        "status": "partial-theme-mapping; logo/colors ready; portrait layers blocked",
        "teams": teams,
    }
    MANIFEST.parent.mkdir(exist_ok=True)
    MANIFEST.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(MANIFEST)


if __name__ == "__main__":
    main()
