from pathlib import Path
import csv
import hashlib

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "previews"
OUTPUT = PREVIEWS / "v491_all_20_identity_contact_sheet_v01.png"
MANIFEST = ROOT / "docs" / "v491_identity_board_manifest_v01.csv"
SMALL_DIR = PREVIEWS / "concept_64px"
SMALL_SHEET = PREVIEWS / "v491_all_20_primary_emblem_64px_test_v01.png"

TEAMS = [
    ("T0", "靖安盾衛", "T0_jingan_shield_guardians_identity_board_v01_two_uniforms.png"),
    ("T1", "臨海獵鯊", "T1_linhai_harbor_sharks_identity_board_v02_two_uniforms.png"),
    ("T2", "曲江水牛", "T2_qujiang_water_buffalo_identity_board_v01_two_uniforms.png"),
    ("T3", "永昌雄獅", "T3_yongchang_lions_identity_board_v01_two_uniforms.png"),
    ("T4", "明陽烈焰", "T4_mingyang_blaze_identity_board_v02_chibi_fixed_two_uniforms.png"),
    ("T5", "天啟鷹", "T5_tianqi_eagles_identity_board_v01_two_uniforms.png"),
    ("T6", "龍城雲豹", "T6_longcheng_clouded_leopards_identity_board_v01_two_uniforms.png"),
    ("T7", "星野銀狐", "T7_xingye_silver_foxes_identity_board_v01_two_uniforms.png"),
    ("T8", "雲夢白鷺", "T8_yunmeng_egrets_identity_board_v01_two_uniforms.png"),
    ("T9", "東寧豹", "T9_dongning_leopards_identity_board_v01_two_uniforms.png"),
    ("T10", "嘉禾金穗", "T10_jiahe_golden_harvest_identity_board_v02_two_uniforms.png"),
    ("T11", "瑞港海豚", "T11_ruigang_dolphins_identity_board_v01_two_uniforms.png"),
    ("T12", "金川礦工", "T12_jinchuan_miners_identity_board_v02_two_uniforms.png"),
    ("T13", "玄武黑熊", "T13_xuanwu_black_bears_identity_board_v01_two_uniforms.png"),
    ("T14", "朝陽赤鷹", "T14_chaoyang_red_hawks_identity_board_v01_two_uniforms.png"),
    ("T15", "鳳鳴紅雀", "T15_fengming_redbirds_identity_board_v01_two_uniforms.png"),
    ("T16", "銀灘破浪", "T16_yintan_breakers_identity_board_v01_two_uniforms.png"),
    ("T17", "青川山羌", "T17_qingchuan_serows_identity_board_v01_two_uniforms.png"),
    ("T18", "望海白鯨", "T18_wanghai_white_whales_identity_board_v01_two_uniforms.png"),
    ("T19", "磐石鐵衛", "T19_panshi_iron_guard_identity_board_v01_two_uniforms.png"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ["msjhbd.ttc", "msjh.ttc"] if bold else ["msjh.ttc", "msjhbd.ttc"]
    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def main() -> None:
    missing = [filename for _, _, filename in TEAMS if not (PREVIEWS / filename).exists()]
    if missing:
        raise SystemExit("Missing identity boards: " + ", ".join(missing))

    cols = 4
    rows = 5
    thumb_w = 448
    thumb_h = 299
    label_h = 44
    gap = 16
    margin = 32
    header_h = 86
    canvas_w = margin * 2 + cols * thumb_w + (cols - 1) * gap
    canvas_h = header_h + margin + rows * (thumb_h + label_h) + (rows - 1) * gap + margin

    canvas = Image.new("RGB", (canvas_w, canvas_h), "#F7F2E9")
    draw = ImageDraw.Draw(canvas)
    title_font = font(34, bold=True)
    label_font = font(24, bold=True)
    sub_font = font(20)

    draw.rectangle((0, 0, canvas_w, header_h), fill="#102949")
    draw.text((margin, 16), "《決勝GM》v491｜20 隊品牌概念總覽", font=title_font, fill="#FFFFFF")
    draw.text(
        (canvas_w - margin, 25),
        "每隊：白色主場＋隊色客場",
        font=sub_font,
        fill="#59C78B",
        anchor="ra",
    )

    for index, (team_id, team_name, filename) in enumerate(TEAMS):
        row, col = divmod(index, cols)
        x = margin + col * (thumb_w + gap)
        y = header_h + margin + row * (thumb_h + label_h + gap)
        with Image.open(PREVIEWS / filename) as source:
            thumb = source.convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        canvas.paste(thumb, (x, y))
        draw.rectangle((x, y + thumb_h, x + thumb_w, y + thumb_h + label_h), fill="#102949")
        draw.text(
            (x + 14, y + thumb_h + label_h // 2),
            f"{team_id}  {team_name}",
            font=label_font,
            fill="#FFFFFF",
            anchor="lm",
        )

    canvas.save(OUTPUT, optimize=True)

    SMALL_DIR.mkdir(exist_ok=True)
    sample_scale = 3
    sample_size = 64
    sample_cell = sample_size * sample_scale
    sample_label_h = 36
    sample_cols = 5
    sample_rows = 4
    sample_gap = 14
    sample_margin = 28
    sample_header = 72
    sample_w = (
        sample_margin * 2
        + sample_cols * sample_cell
        + (sample_cols - 1) * sample_gap
    )
    sample_h = (
        sample_header
        + sample_margin
        + sample_rows * (sample_cell + sample_label_h)
        + (sample_rows - 1) * sample_gap
        + sample_margin
    )
    sample_canvas = Image.new("RGB", (sample_w, sample_h), "#F7F2E9")
    sample_draw = ImageDraw.Draw(sample_canvas)
    sample_draw.rectangle((0, 0, sample_w, sample_header), fill="#102949")
    sample_draw.text(
        (sample_margin, 16),
        "20 隊主徽｜64px 概念可讀性檢查",
        font=font(28, bold=True),
        fill="#FFFFFF",
    )

    for index, (team_id, team_name, filename) in enumerate(TEAMS):
        with Image.open(PREVIEWS / filename) as source:
            source = source.convert("RGB")
            w, h = source.size
            crop = source.crop(
                (
                    round(w * 0.035),
                    round(h * 0.015),
                    round(w * 0.365),
                    round(h * 0.445),
                )
            )
            crop.thumbnail((sample_size, sample_size), Image.Resampling.LANCZOS)
            small = Image.new("RGB", (sample_size, sample_size), "#F7F2E9")
            small.paste(
                crop,
                ((sample_size - crop.width) // 2, (sample_size - crop.height) // 2),
            )
            small.save(SMALL_DIR / f"{team_id}_primary_emblem_64px_concept_v01.png")
            enlarged = small.resize((sample_cell, sample_cell), Image.Resampling.NEAREST)

        row, col = divmod(index, sample_cols)
        x = sample_margin + col * (sample_cell + sample_gap)
        y = sample_header + sample_margin + row * (sample_cell + sample_label_h + sample_gap)
        sample_canvas.paste(enlarged, (x, y))
        sample_draw.rectangle(
            (x, y + sample_cell, x + sample_cell, y + sample_cell + sample_label_h),
            fill="#102949",
        )
        sample_draw.text(
            (x + 10, y + sample_cell + sample_label_h // 2),
            f"{team_id} {team_name}",
            font=font(19, bold=True),
            fill="#FFFFFF",
            anchor="lm",
        )

    sample_canvas.save(SMALL_SHEET, optimize=True)
    with MANIFEST.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["teamId", "teamName", "file", "sha256", "stage", "uniforms"])
        for team_id, team_name, filename in TEAMS:
            path = PREVIEWS / filename
            digest = hashlib.sha256(path.read_bytes()).hexdigest().upper()
            writer.writerow(
                [
                    team_id,
                    team_name,
                    f"previews/{filename}",
                    digest,
                    "concept-board",
                    "home-white + away-team-color",
                ]
            )
    print(OUTPUT)
    print(MANIFEST)
    print(SMALL_SHEET)


if __name__ == "__main__":
    main()
