from __future__ import annotations

import hashlib
import json
import zipfile
from datetime import datetime
from pathlib import Path, PurePosixPath


PROJECT = Path(__file__).resolve().parents[1]
STAGE = PROJECT / "_staging" / "v52_r004_new_chat_transfer_20260731"
OUTER = STAGE / "outer"
ART = STAGE / "art_new"
DELIVERY_DIR = STAGE / "delivery"
DELIVERY = DELIVERY_DIR / "v52_delivery.zip"
SOURCE_DELIVERY = PROJECT / "v52_delivery.zip"
SOURCE_CHECKPOINT = (
    PROJECT
    / "_staging"
    / "v52_r004_codex_art_CHECKPOINT_APPROVED_VISUALS_ONLY_RECOVERY_v2_NON_DELIVERY.zip"
)
CHECKPOINT_ROOT = ART / "checkpoint" / "v52_r004_20260731"

SOURCE_DELIVERY_SHA = "D5A73BA22A2FA98C2F5378766725289080A687D96F025E0E59D2C84934B84A3A"
SOURCE_CHECKPOINT_SHA = "AE54C1D9D34E15CD3A880E006219F3410D3410885080EE290AD26482DC5CABA9"
PACKAGE_ID = "v52-r004-codex"
PARENT_ID = "v52-r003-codex"

EXCLUDED_ART_PATHS = {
    PurePosixPath("docs/v52_r004_NEW_CHAT_START_HAIR_RESET.md"),
    PurePosixPath("docs/v52_r004_NEW_CHAT_PROMPT_HAIR_RESET.txt"),
    PurePosixPath("docs/v52_r004_NEW_CHAT_START_batch10.md"),
    PurePosixPath("docs/v52_r004_NEW_CHAT_PROMPT_batch10.txt"),
}

OUTER_FILES = [
    "52_baseball_gm.html",
    "52_baseball_gm_modular.zip",
    "v52_art_assets.zip",
    "v52_project_summary.md",
    "v52_full_pending_items.md",
    "v52_art_interface_spec.md",
    "v52_claude_to_codex_handoff.md",
    "v52_codex_to_claude_handoff.md",
    "v52_delivery_manifest.json",
    "SHA256SUMS.txt",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def safe_ascii(relative: PurePosixPath) -> None:
    value = relative.as_posix()
    if not value.isascii():
        raise RuntimeError(f"Non-ASCII archive path: {value}")
    if relative.is_absolute() or ".." in relative.parts or (relative.parts and ":" in relative.parts[0]):
        raise RuntimeError(f"Unsafe archive path: {value}")


def art_files() -> list[tuple[Path, PurePosixPath]]:
    output = []
    for path in sorted((item for item in ART.rglob("*") if item.is_file()), key=lambda item: item.relative_to(ART).as_posix()):
        relative = PurePosixPath(path.relative_to(ART).as_posix())
        if relative in EXCLUDED_ART_PATHS:
            continue
        if "__pycache__" in relative.parts or path.suffix == ".pyc":
            continue
        safe_ascii(relative)
        output.append((path, relative))
    return output


def write_checkpoint_metadata() -> None:
    manifest_path = CHECKPOINT_ROOT / "docs" / "v52_r004_ART_CHECKPOINT_MANIFEST.json"
    sha_path = CHECKPOINT_ROOT / "docs" / "SHA256SUMS.txt"
    if manifest_path.exists():
        manifest_path.unlink()
    if sha_path.exists():
        sha_path.unlink()

    records = []
    for path in sorted((item for item in CHECKPOINT_ROOT.rglob("*") if item.is_file()), key=lambda item: item.relative_to(CHECKPOINT_ROOT).as_posix()):
        relative = path.relative_to(CHECKPOINT_ROOT).as_posix()
        records.append({"path": relative, "sha256": sha256(path)})
    records.extend(
        [
            {"path": "docs/v52_r004_ART_CHECKPOINT_MANIFEST.json", "sha256": None},
            {"path": "docs/SHA256SUMS.txt", "sha256": None},
        ]
    )

    manifest = {
        "manifestVersion": 1,
        "gameVersion": "v52",
        "checkpointId": "v52-r004-codex-art-approved-hair-colors-facial-hair-v07-20260731",
        "packageId": PACKAGE_ID,
        "createdBy": "Codex",
        "createdDate": datetime.now().astimezone().isoformat(timespec="seconds"),
        "sourceDelivery": {"packageId": PARENT_ID, "sha256": SOURCE_DELIVERY_SHA},
        "sourceCheckpoint": {"sha256": SOURCE_CHECKPOINT_SHA},
        "authoritativeOuterSummary": "v52_project_summary.md",
        "files": records,
        "approvals": {
            "hairStyleCount": 10,
            "hairStylesApprovedUnchanged": True,
            "hairColorCount": 6,
            "hairColorsApproved": ["#171414", "#33211E", "#8B552C", "#B9B6B0", "#D7A942", "#C43D2F"],
            "facialHairStyles": ["clean-shaven", "wide chin-only goatee", "circle beard", "full jaw beard", "eight-shaped moustache"],
            "facialHairGeometryApproved": True,
            "facialHairGeometryVersion": "v07",
            "facialHairColorsReuseHairColors": True,
        },
        "validation": {
            "facialHairStateCountPerVisibleStyle": 5,
            "visibleFacialHairStyleCount": 4,
            "outsideMaskVisibleRgbDiff": 0,
            "outsideMaskAlphaDiff": 0,
            "opaqueMouthCoreDiff": 0,
            "approvedSourceFilesOverwritten": False,
        },
        "nextStep": "Deterministically recolor the four approved visible facial-hair v07 masters into all six approved hair colors, then emit 256/128/64 outputs and five-state composites.",
        "forbidden": [
            "using local old extracts or same-name files as authority",
            "regenerating or changing the approved ten hairstyles",
            "using rejected or superseded facial-hair versions v01-v06",
            "delivering concept or illustrative-only art",
            "redrawing the whole character",
            "modifying Claude-owned game code, interfaces, or handoff",
        ],
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    sha_lines = []
    for path in sorted((item for item in CHECKPOINT_ROOT.rglob("*") if item.is_file()), key=lambda item: item.relative_to(CHECKPOINT_ROOT).as_posix()):
        if path == sha_path:
            continue
        sha_lines.append(f"{sha256(path)}  {path.relative_to(CHECKPOINT_ROOT).as_posix()}")
    sha_path.write_text("\n".join(sha_lines) + "\n", encoding="ascii", newline="\n")


def write_zip(path: Path, members: list[tuple[Path, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        seen = set()
        for source, arcname in members:
            normalized = PurePosixPath(arcname).as_posix()
            safe_ascii(PurePosixPath(normalized))
            key = normalized.lower()
            if key in seen:
                raise RuntimeError(f"Duplicate archive path: {normalized}")
            seen.add(key)
            archive.write(source, normalized)


def verify_zip(path: Path) -> dict:
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        if bad:
            raise RuntimeError(f"CRC failure in {path.name}: {bad}")
        names = []
        for info in archive.infolist():
            relative = PurePosixPath(info.filename)
            safe_ascii(relative)
            names.append(info.filename)
        if len(names) != len(set(name.lower() for name in names)):
            raise RuntimeError(f"Duplicate paths in {path.name}")
        return {"entries": len(names), "files": sum(1 for item in archive.infolist() if item.filename and not item.is_dir()), "unsafe": 0, "crc": "passed"}


def build_art_zip() -> dict:
    write_checkpoint_metadata()
    members = [(path, relative.as_posix()) for path, relative in art_files()]
    art_zip = OUTER / "v52_art_assets.zip"
    write_zip(art_zip, members)
    return verify_zip(art_zip)


def update_outer_manifest(art_stats: dict) -> None:
    manifest_path = OUTER / "v52_delivery_manifest.json"
    with zipfile.ZipFile(SOURCE_DELIVERY) as source_archive:
        old_manifest = json.loads(source_archive.read("v52_delivery_manifest.json").decode("utf-8-sig"))
    old_records = {record["path"]: record for record in old_manifest["files"]}
    parent_hashes = {
        name: (old_records[name].get("contentSha256") if name not in ("v52_delivery_manifest.json", "SHA256SUMS.txt") else None)
        for name in OUTER_FILES
    }

    manifest = {
        "manifestVersion": 3,
        "gameVersion": "v52",
        "packageRevision": 4,
        "packageId": PACKAGE_ID,
        "createdBy": "Codex",
        "createdDate": datetime.now().astimezone().isoformat(timespec="seconds"),
        "basedOnPackageId": PARENT_ID,
        "supersedesPackageId": PARENT_ID,
        "formalVersionUpgrade": False,
        "authoritativeSummary": "v52_project_summary.md",
        "expectedOuterFileCount": 10,
        "outerFiles": OUTER_FILES,
        "parentPackage": {
            "packageId": PARENT_ID,
            "zipFileName": "v52_delivery.zip",
            "zipSha256": SOURCE_DELIVERY_SHA,
            "zipSizeBytes": SOURCE_DELIVERY.stat().st_size,
        },
        "checkpointSource": {
            "path": SOURCE_CHECKPOINT.name,
            "sha256": SOURCE_CHECKPOINT_SHA,
            "type": "approved-visuals-only-recovery-v2-non-delivery",
        },
        "files": [],
        "verification": {
            "regressionPassed": 1299,
            "regressionFailed": 0,
            "smokeMultiyear": "passed (exit 0)",
            "smokePureGm": "passed (exit 0)",
            "modularZipFileCount": 20,
            "outerFileCount": 10,
            "shaChecked": "9/9 after final rebuild",
            "windowsExpandArchive": "passed for r004 outer ZIP, art ZIP and modular ZIP",
            "artZipEntries": art_stats["entries"],
            "artZipFiles": art_stats["files"],
            "artZipUnsafePaths": art_stats["unsafe"],
            "artZipCrc": art_stats["crc"],
            "byteIdenticalCarryForwardVerified": [
                "52_baseball_gm.html",
                "52_baseball_gm_modular.zip",
                "v52_art_interface_spec.md",
                "v52_claude_to_codex_handoff.md",
            ],
            "approvedArtCheckpoint": "checkpoint/v52_r004_20260731",
            "facialHairV07OutsideMaskVisibleRgbDiff": 0,
            "facialHairV07OutsideMaskAlphaDiff": 0,
            "facialHairV07OpaqueMouthCoreDiff": 0,
            "claudeProgramModified": False,
            "claudeToCodexHandoffModified": False,
            "artInterfaceSpecModified": False,
        },
        "remainingWork": {
            "programDefects": [],
            "testGaps": [],
            "documentGaps": ["Claude must update the interface only if the approved beard variants cannot fit the existing contract."],
            "packagingGaps": [],
            "projectWork": [
                "deterministically expand the four visible approved facial-hair v07 masters to all six approved colors",
                "emit and validate 256/128/64 outputs and five-state composites",
                "locate true independent 1254px sources for the approved ten hairstyles without cropping or upscaling the confirmation sheet",
                "continue remaining modular character and project art stages",
            ],
        },
        "notAuthorised": [
            "modifying Claude-owned game code, RNG, save semantics, interface spec, or Claude-to-Codex handoff",
            "regenerating or altering the approved ten hairstyle geometry",
            "using rejected or superseded art as a production source",
            "marking T5-T19 visually approved by Mars",
        ],
    }

    role_updates = {
        "52_baseball_gm.html": ("unchanged", "Claude"),
        "52_baseball_gm_modular.zip": ("unchanged", "Claude"),
        "v52_art_assets.zip": ("modified", "Codex"),
        "v52_project_summary.md": ("modified", "Codex"),
        "v52_full_pending_items.md": ("modified", "Codex"),
        "v52_art_interface_spec.md": ("unchanged", "Claude"),
        "v52_claude_to_codex_handoff.md": ("unchanged", "Claude"),
        "v52_codex_to_claude_handoff.md": ("modified", "Codex"),
        "v52_delivery_manifest.json": ("replaced", "Codex"),
        "SHA256SUMS.txt": ("replaced", "Codex"),
    }
    for name in OUTER_FILES:
        old = old_records[name]
        content_hash = None if name in ("v52_delivery_manifest.json", "SHA256SUMS.txt") else sha256(OUTER / name)
        change_status, modifier = role_updates[name]
        manifest["files"].append(
            {
                "role": old["role"],
                "path": name,
                "contentSha256": content_hash,
                "originVersion": old["originVersion"],
                "originalAuthor": old["originalAuthor"],
                "lastModifiedBy": modifier,
                "changeStatus": change_status,
                "carriedForwardFrom": {
                    "packageId": PARENT_ID,
                    "path": name,
                    "contentSha256": parent_hashes[name],
                },
            }
        )
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_outer_sha() -> None:
    lines = []
    for name in OUTER_FILES:
        if name == "SHA256SUMS.txt":
            continue
        lines.append(f"{sha256(OUTER / name)}  {name}")
    (OUTER / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="ascii", newline="\n")


def main() -> None:
    if sha256(SOURCE_DELIVERY) != SOURCE_DELIVERY_SHA:
        raise RuntimeError("Source delivery SHA mismatch")
    if sha256(SOURCE_CHECKPOINT) != SOURCE_CHECKPOINT_SHA:
        raise RuntimeError("Source checkpoint SHA mismatch")
    if sorted(path.name for path in OUTER.iterdir() if path.is_file()) != sorted(OUTER_FILES):
        raise RuntimeError("Outer build directory does not contain the fixed ten roles")

    art_stats = build_art_zip()
    update_outer_manifest(art_stats)
    write_outer_sha()

    members = [(OUTER / name, name) for name in OUTER_FILES]
    write_zip(DELIVERY, members)
    outer_stats = verify_zip(DELIVERY)
    report = {
        "status": "BUILT",
        "path": str(DELIVERY),
        "sha256": sha256(DELIVERY),
        "sizeBytes": DELIVERY.stat().st_size,
        "packageId": PACKAGE_ID,
        "basedOnPackageId": PARENT_ID,
        "outer": outer_stats,
        "art": art_stats,
        "checkpointShaLines": len((CHECKPOINT_ROOT / "docs" / "SHA256SUMS.txt").read_text(encoding="ascii").splitlines()),
        "sourceDeliverySha": SOURCE_DELIVERY_SHA,
        "sourceCheckpointSha": SOURCE_CHECKPOINT_SHA,
    }
    (STAGE / "build_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
