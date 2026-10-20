from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path, PurePosixPath


PROJECT = Path(__file__).resolve().parents[1]
CHECKPOINT = (
    PROJECT
    / "_staging"
    / "v52_r004_codex_art_CHECKPOINT_HAIR_RESET_NON_DELIVERY.zip"
)
DELIVERY = PROJECT / "v52_delivery.zip"
VERIFY_ROOT = (
    PROJECT / "_audit" / "v52_r004_hair_reset_checkpoint_verify_20260730"
)
EXPECTED_OUTER = {
    "SHA256SUMS.txt",
    "v52_r004_ART_WORK_CHECKPOINT.zip",
    "v52_r004_CHECKPOINT_MANIFEST.json",
    "v52_r004_FORMAL_CHARACTER_PIXEL_LOCK_RULES.md",
    "v52_r004_NEW_CHAT_PROMPT.txt",
    "v52_r004_NEW_CHAT_START.md",
    "v52_T0_FORMAL_CHARACTER_RATIO_ANCHOR_APPROVED.png",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def assert_safe(entries: list[zipfile.ZipInfo]) -> None:
    for info in entries:
        member = PurePosixPath(info.filename)
        if (
            member.is_absolute()
            or ".." in member.parts
            or (member.parts and ":" in member.parts[0])
        ):
            raise RuntimeError(f"Unsafe ZIP member: {info.filename}")


def main() -> None:
    if VERIFY_ROOT.exists():
        raise FileExistsError(f"Refusing to reuse verification directory: {VERIFY_ROOT}")
    outer_dir = VERIFY_ROOT / "outer"
    work_dir = VERIFY_ROOT / "art_work"
    outer_dir.mkdir(parents=True)
    work_dir.mkdir(parents=True)

    with zipfile.ZipFile(CHECKPOINT) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("Outer ZIP CRC failure")
        entries = archive.infolist()
        assert_safe(entries)
        actual_outer = {info.filename for info in entries}
        if actual_outer != EXPECTED_OUTER:
            raise RuntimeError(
                f"Outer members mismatch: {sorted(actual_outer)}"
            )
        archive.extractall(outer_dir)

    sha_lines = (
        outer_dir / "SHA256SUMS.txt"
    ).read_text(encoding="utf-8").splitlines()
    checked_sha = 0
    for line in sha_lines:
        expected, name = line.split("  ", 1)
        actual = sha256(outer_dir / name)
        if actual != expected:
            raise RuntimeError(f"SHA mismatch for {name}: {actual}")
        checked_sha += 1
    if checked_sha != 6:
        raise RuntimeError(f"Expected 6 SHA entries, got {checked_sha}")

    manifest = json.loads(
        (outer_dir / "v52_r004_CHECKPOINT_MANIFEST.json").read_text(
            encoding="utf-8"
        )
    )
    if manifest["expectedFileCount"] != 7:
        raise RuntimeError("Manifest expectedFileCount is not 7")
    if manifest["basedOnPackageId"] != "v52-r003-codex":
        raise RuntimeError("Unexpected basedOnPackageId")
    if sha256(DELIVERY) != manifest["requiredCompanionFile"]["sha256"]:
        raise RuntimeError("Companion v52_delivery.zip SHA mismatch")
    for entry in manifest["files"]:
        if entry["sha256"] is None:
            continue
        if sha256(outer_dir / entry["path"]) != entry["sha256"]:
            raise RuntimeError(f"Manifest hash mismatch: {entry['path']}")

    nested = outer_dir / "v52_r004_ART_WORK_CHECKPOINT.zip"
    with zipfile.ZipFile(nested) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("Nested ZIP CRC failure")
        nested_entries = archive.infolist()
        assert_safe(nested_entries)
        archive.extractall(work_dir)

    required_nested = [
        work_dir / "AGENTS.md",
        work_dir / "docs" / "v52_r004_FORMAL_CHARACTER_PIXEL_LOCK_RULES.md",
        work_dir / "docs" / "v52_r004_NEW_CHAT_START_HAIR_RESET.md",
        work_dir / "docs" / "v52_r004_NEW_CHAT_PROMPT_HAIR_RESET.txt",
        work_dir
        / "production_assets"
        / "formal_characters"
        / "T0"
        / "T0_formal_character_master_1254_v01.png",
    ]
    missing = [str(path) for path in required_nested if not path.is_file()]
    if missing:
        raise RuntimeError(f"Missing required nested files: {missing}")

    forbidden = [
        work_dir / "previews" / "T0_master_coordinate_grid_tmp.png",
        work_dir
        / "previews"
        / "modular_characters_v2"
        / "formal_batch03_hair"
        / "highres_style03",
        work_dir / "tools" / "build_v52_style03_highres_overlay_v01.py",
    ]
    present_forbidden = [str(path) for path in forbidden if path.exists()]
    if present_forbidden:
        raise RuntimeError(
            f"Unapproved experiment leaked into checkpoint: {present_forbidden}"
        )

    rule_text = (
        work_dir / "docs" / "v52_r004_FORMAL_CHARACTER_PIXEL_LOCK_RULES.md"
    ).read_text(encoding="utf-8")
    if "禁止整張人物生成" not in rule_text or "可見 RGB" not in rule_text:
        raise RuntimeError("Pixel-lock rule content check failed")

    print(
        json.dumps(
            {
                "status": "PASS",
                "checkpointSha256": sha256(CHECKPOINT),
                "outerEntries": len(EXPECTED_OUTER),
                "shaEntriesPassed": checked_sha,
                "nestedEntries": len(nested_entries),
                "unsafePaths": 0,
                "manifestPassed": True,
                "companionDeliveryShaPassed": True,
                "cleanExtractionPassed": True,
                "requiredNestedFilesPassed": True,
                "unapprovedHighresExperimentExcluded": True,
                "formalDeliveryModified": False,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
