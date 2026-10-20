from __future__ import annotations

import hashlib
import json
import shutil
import zipfile
from datetime import datetime
from pathlib import Path, PurePosixPath


PROJECT = Path(__file__).resolve().parents[1]
WORK_ROOT = (
    PROJECT
    / "_audit"
    / "v52_r004_resume_20260730_180939"
    / "art_work_checkpoint_clean"
)
OLD_CHECKPOINT = (
    PROJECT
    / "_staging"
    / "v52_r004_codex_art_CHECKPOINT_BATCH10_NON_DELIVERY.zip"
)
DELIVERY = PROJECT / "v52_delivery.zip"
OUTER_NAME = "v52_r004_codex_art_CHECKPOINT_HAIR_RESET_NON_DELIVERY.zip"
OUTER_ZIP = PROJECT / "_staging" / OUTER_NAME
BUILD = PROJECT / "_staging" / "v52_r004_checkpoint_hair_reset_build_20260730"
NESTED_NAME = "v52_r004_ART_WORK_CHECKPOINT.zip"

EXPECTED_DELIVERY_SHA = (
    "D5A73BA22A2FA98C2F5378766725289080A687D96F025E0E59D2C84934B84A3A"
)

EXCLUDED_RELATIVE_PATHS = {
    PurePosixPath("previews/T0_master_coordinate_grid_tmp.png"),
    PurePosixPath(
        "tools/build_v52_style03_highres_overlay_v01.py"
    ),
}
EXCLUDED_PREFIXES = {
    PurePosixPath(
        "previews/modular_characters_v2/formal_batch03_hair/highres_style03"
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def is_excluded(relative: PurePosixPath) -> bool:
    if relative in EXCLUDED_RELATIVE_PATHS:
        return True
    return any(relative == prefix or prefix in relative.parents for prefix in EXCLUDED_PREFIXES)


def safe_zip_members(path: Path) -> tuple[int, int]:
    unsafe = 0
    count = 0
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        if bad:
            raise RuntimeError(f"ZIP CRC failure: {bad}")
        for info in archive.infolist():
            count += 1
            member = PurePosixPath(info.filename)
            if (
                member.is_absolute()
                or ".." in member.parts
                or (member.parts and ":" in member.parts[0])
            ):
                unsafe += 1
    return count, unsafe


def add_file(archive: zipfile.ZipFile, source: Path, arcname: str) -> None:
    archive.write(source, arcname=arcname.replace("\\", "/"))


def main() -> None:
    if OUTER_ZIP.exists():
        raise FileExistsError(f"Refusing to overwrite existing checkpoint: {OUTER_ZIP}")
    if BUILD.exists():
        raise FileExistsError(f"Refusing to overwrite existing build directory: {BUILD}")
    BUILD.mkdir(parents=True)

    delivery_sha = sha256(DELIVERY)
    if delivery_sha != EXPECTED_DELIVERY_SHA:
        raise RuntimeError(
            f"Unexpected v52_delivery.zip SHA-256: {delivery_sha}"
        )

    nested = BUILD / NESTED_NAME
    included_files: list[Path] = []
    with zipfile.ZipFile(
        nested, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6
    ) as archive:
        for source in sorted(path for path in WORK_ROOT.rglob("*") if path.is_file()):
            relative = PurePosixPath(source.relative_to(WORK_ROOT).as_posix())
            if "__pycache__" in relative.parts or source.suffix == ".pyc":
                continue
            if is_excluded(relative):
                continue
            add_file(archive, source, relative.as_posix())
            included_files.append(source)

    nested_entries, nested_unsafe = safe_zip_members(nested)
    if nested_unsafe:
        raise RuntimeError(f"Nested ZIP unsafe paths: {nested_unsafe}")

    source_docs = {
        "v52_r004_NEW_CHAT_START.md": (
            WORK_ROOT / "docs" / "v52_r004_NEW_CHAT_START_HAIR_RESET.md"
        ),
        "v52_r004_NEW_CHAT_PROMPT.txt": (
            WORK_ROOT / "docs" / "v52_r004_NEW_CHAT_PROMPT_HAIR_RESET.txt"
        ),
        "v52_r004_FORMAL_CHARACTER_PIXEL_LOCK_RULES.md": (
            WORK_ROOT / "docs" / "v52_r004_FORMAL_CHARACTER_PIXEL_LOCK_RULES.md"
        ),
        "v52_T0_FORMAL_CHARACTER_RATIO_ANCHOR_APPROVED.png": (
            PROJECT
            / "_audit"
            / "v52_r004_resume_20260730_180939"
            / "checkpoint_outer"
            / "v52_T0_FORMAL_CHARACTER_RATIO_ANCHOR_APPROVED.png"
        ),
    }
    for name, source in source_docs.items():
        shutil.copy2(source, BUILD / name)

    supersedes_sha = sha256(OLD_CHECKPOINT)
    manifest_path = BUILD / "v52_r004_CHECKPOINT_MANIFEST.json"
    manifest = {
        "manifestVersion": 3,
        "checkpointType": "codex-art-non-delivery",
        "gameVersion": "v52",
        "checkpointId": "v52-r004-codex-art-hair-reset-20260730",
        "targetPackageId": "v52-r004-codex",
        "basedOnPackageId": "v52-r003-codex",
        "supersedesCheckpointSha256": supersedes_sha,
        "createdBy": "Codex",
        "createdDate": datetime.now().astimezone().isoformat(timespec="seconds"),
        "formalDelivery": False,
        "requiredCompanionFile": {
            "path": "v52_delivery.zip",
            "sha256": delivery_sha,
            "packageId": "v52-r003-codex",
        },
        "expectedFileCount": 7,
        "files": [
            {
                "path": NESTED_NAME,
                "role": "complete-current-art-work-tree",
                "sha256": sha256(nested),
            },
            {
                "path": "v52_T0_FORMAL_CHARACTER_RATIO_ANCHOR_APPROVED.png",
                "role": "sole-approved-character-style-and-ratio-anchor",
                "sha256": sha256(
                    BUILD / "v52_T0_FORMAL_CHARACTER_RATIO_ANCHOR_APPROVED.png"
                ),
            },
            {
                "path": "v52_r004_NEW_CHAT_START.md",
                "role": "single-authoritative-art-continuation-summary",
                "sha256": sha256(BUILD / "v52_r004_NEW_CHAT_START.md"),
            },
            {
                "path": "v52_r004_NEW_CHAT_PROMPT.txt",
                "role": "copy-paste-new-chat-prompt",
                "sha256": sha256(BUILD / "v52_r004_NEW_CHAT_PROMPT.txt"),
            },
            {
                "path": "v52_r004_FORMAL_CHARACTER_PIXEL_LOCK_RULES.md",
                "role": "mandatory-character-pixel-lock-rule",
                "sha256": sha256(
                    BUILD / "v52_r004_FORMAL_CHARACTER_PIXEL_LOCK_RULES.md"
                ),
            },
            {
                "path": "v52_r004_CHECKPOINT_MANIFEST.json",
                "role": "checkpoint-manifest",
                "sha256": None,
            },
            {
                "path": "SHA256SUMS.txt",
                "role": "hash-list-for-other-six-files",
                "sha256": None,
            },
        ],
        "approvals": {
            "batch10Cap": True,
            "formalT0FiveExpressions": True,
            "skinToneSeries": "KEEP-00-through-05",
            "tone06Allowed": False,
            "formalCharactersT0ToT19": True,
            "hairStylesApproved": False,
        },
        "rejectedDoNotUse": [
            "all displayed hair candidates v01-v06",
            "2026-07-30 full-character ImageGen large-body result",
            "2026-07-30 style03 high-resolution compositing experiment",
        ],
        "mandatoryProductionRule": (
            "v52_r004_FORMAL_CHARACTER_PIXEL_LOCK_RULES.md"
        ),
        "verification": {
            "artWorkZipEntries": nested_entries,
            "unsafeNestedZipPaths": nested_unsafe,
            "excludedUnapprovedHighresStyle03Experiment": True,
            "excludedTemporaryCoordinateGrid": True,
            "claudeProgramModified": False,
            "claudeToCodexHandoffModified": False,
            "formalDeliveryModified": False,
        },
        "remainingWork": [
            "restart hair style03 from approved 1254px master under pixel-lock rule",
            "Mars approval of each hair style before batching colors",
            "remaining production-ready modular character layers",
            "scoreboard art",
            "team visuals",
            "Hall of Fame art",
            "all hardware and facility levels",
            "remaining gameplay and management situation art",
            "complete ten-role v52-r004-codex delivery and full validation",
        ],
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    sha_lines = []
    for path in sorted(BUILD.iterdir(), key=lambda value: value.name):
        if path.name == "SHA256SUMS.txt":
            continue
        sha_lines.append(f"{sha256(path)}  {path.name}")
    (BUILD / "SHA256SUMS.txt").write_text(
        "\n".join(sha_lines) + "\n", encoding="utf-8", newline="\n"
    )

    with zipfile.ZipFile(
        OUTER_ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6
    ) as archive:
        for source in sorted(BUILD.iterdir(), key=lambda value: value.name):
            add_file(archive, source, source.name)

    outer_entries, outer_unsafe = safe_zip_members(OUTER_ZIP)
    print(
        json.dumps(
            {
                "outerZip": str(OUTER_ZIP),
                "outerSha256": sha256(OUTER_ZIP),
                "outerEntries": outer_entries,
                "outerUnsafePaths": outer_unsafe,
                "nestedSha256": sha256(nested),
                "nestedEntries": nested_entries,
                "nestedUnsafePaths": nested_unsafe,
                "includedWorkFiles": len(included_files),
                "deliverySha256": delivery_sha,
                "supersedesCheckpointSha256": supersedes_sha,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
