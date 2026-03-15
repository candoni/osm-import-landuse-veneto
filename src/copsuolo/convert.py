#!/usr/bin/env python3
"""
Recursively scan INPUT_ROOT; for each directory that contains at least one .shp file,
mirror the tree into OUTPUT_ROOT and run:

ogr2osm <shp_file> -t src/copsuolo/translation/landuse.py --never-download -o <OUTPUT_ROOT>/<mirrored_path>/<folder_name>.osm

Example:
- Found: data/copsuolo_2023_14275/VI/agugliaro_24001/c0506191_ccs2023.shp
- Run:   ogr2osm data/copsuolo_2023_14275/VI/agugliaro_24001/c0506191_ccs2023.shp
         -t src/copsuolo/translation/landuse.py --never-download
         -o dist/copsuolo_2023_14275/VI/agugliaro_24001.osm
"""

import argparse
import json
import os
import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from copsuolo.config import REPO_ROOT

# ====== GLOBAL CONFIG ======
INPUT_ROOT = REPO_ROOT / "data" / "copsuolo_2023_14275"
OUTPUT_ROOT = REPO_ROOT / "dist" / "copsuolo_2023_14275"
TEMPLATE = Path(__file__).resolve().parent / "translation" / "landuse.py"
OGR2OSM_BIN = "ogr2osm"  # Path or name in PATH
DRY_RUN = False  # Set to True to preview commands without running them
FORCE_OVERWRITE = False  # If False, skip existing output files
VERBOSE = False  # If True, print more info
# ===========================

MANIFEST_PATH = REPO_ROOT / "dist" / "import_manifest.json"


def parse_args():
    """Parse CLI options to override defaults."""
    parser = argparse.ArgumentParser(
        description="Recursively convert shapefiles to OSM with ogr2osm."
    )
    parser.add_argument(
        "-i",
        "--input",
        "--input-root",
        dest="input_root",
        type=Path,
        default=INPUT_ROOT,
        help=f"Root directory to scan for .shp files (default: {INPUT_ROOT})",
    )
    parser.add_argument(
        "-o",
        "--output",
        "--output-root",
        dest="output_root",
        type=Path,
        default=OUTPUT_ROOT,
        help=f"Root directory where .osm files will be written (default: {OUTPUT_ROOT})",
    )
    parser.add_argument(
        "-t",
        "--template",
        dest="template",
        type=Path,
        default=TEMPLATE,
        help=f"ogr2osm translation template (default: {TEMPLATE})",
    )
    parser.add_argument(
        "--ogr2osm-bin",
        dest="ogr2osm_bin",
        default=OGR2OSM_BIN,
        help=f"Path or name of the ogr2osm executable (default: {OGR2OSM_BIN})",
    )
    parser.add_argument(
        "--dry-run",
        dest="dry_run",
        action="store_true",
        default=DRY_RUN,
        help="Print planned commands without executing them",
    )
    parser.add_argument(
        "-f",
        "--force-overwrite",
        dest="force_overwrite",
        action="store_true",
        default=FORCE_OVERWRITE,
        help="Force overwrite of existing output files",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        dest="verbose",
        action="store_true",
        default=VERBOSE,
        help="Show executed commands and ogr2osm output",
    )
    return parser.parse_args()


def find_shapefiles_in_dir(dir_path: Path):
    """Return a sorted list of .shp files directly inside dir_path (non-recursive)."""
    return sorted(
        [p for p in dir_path.iterdir() if p.is_file() and p.suffix.lower() == ".shp"]
    )


def build_output_path(dir_with_shp: Path) -> Path:
    """
    Given a directory that contains the .shp, build the output .osm path:
    <OUTPUT_ROOT>/<relative_to_INPUT_ROOT_parent>/<dir_name>.osm
    """
    rel = dir_with_shp.relative_to(INPUT_ROOT)
    output_dir = OUTPUT_ROOT / rel.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"{dir_with_shp.name}.osm"


def now_iso_utc() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def file_mtime_iso(path: Path) -> str:
    return (
        datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def path_for_manifest(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path.resolve())


def update_import_manifest(
    updated_outputs_by_province: dict[str, list[Path]],
    *,
    input_root: Path,
    output_root: Path,
) -> None:
    manifest: dict[str, object] = {}
    if MANIFEST_PATH.exists():
        try:
            manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            manifest = {}

    provinces = manifest.get("provinces")
    if not isinstance(provinces, dict):
        provinces = {}

    imported_at = now_iso_utc()
    all_updated_outputs: list[Path] = []

    for province_code, outputs in sorted(updated_outputs_by_province.items()):
        if not outputs:
            continue
        all_updated_outputs.extend(outputs)
        provinces[province_code] = {
            "imported_at": imported_at,
            "latest_output_mtime": max(file_mtime_iso(path) for path in outputs),
            "updated_file_count": len(outputs),
        }

    manifest.update(
        {
            "updated_at": imported_at,
            "input_root": path_for_manifest(input_root),
            "output_root": path_for_manifest(output_root),
            "latest_output_mtime": max(file_mtime_iso(path) for path in all_updated_outputs),
            "provinces": provinces,
        }
    )

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def run_ogr2osm(shp_file: Path, output_osm: Path):
    """Run the ogr2osm command with required flags."""

    if output_osm.exists() and not FORCE_OVERWRITE:
        print(f"[WARN] {output_osm} already exists, skipping.")
        return "skipped"

    if output_osm.exists():
        print(f"[WARN] {output_osm} already exists, overwriting.")

    cmd = [
        OGR2OSM_BIN,
        str(shp_file),
        "-t",
        str(TEMPLATE),
        "-o",
        str(output_osm),
        "--never-download",
    ]
    # Add --force only if FORCE_OVERWRITE is True
    if FORCE_OVERWRITE:
        cmd.append("--force")

    print(f"Converting: {shp_file} -> {output_osm}")
    if VERBOSE:
        print(">>", " ".join(map(str, cmd)))
    if DRY_RUN:
        return "dry-run"

    try:
        if VERBOSE:
            # Direct output to console
            subprocess.run(cmd, check=True)
        else:
            # Capture output silently
            subprocess.run(
                cmd,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
        return "written"
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] ogr2osm failed for {shp_file}", file=sys.stderr)

        print("--- STDOUT ---")
        print(e.stdout or "(no output)")
        print("--- STDERR ---")
        print(e.stderr or "(no error output)")
        return "error"


def main():
    args = parse_args()
    # Apply CLI overrides to globals
    global INPUT_ROOT, OUTPUT_ROOT, TEMPLATE, OGR2OSM_BIN, DRY_RUN, FORCE_OVERWRITE, VERBOSE
    INPUT_ROOT = args.input_root
    OUTPUT_ROOT = args.output_root
    TEMPLATE = args.template
    OGR2OSM_BIN = args.ogr2osm_bin
    DRY_RUN = args.dry_run
    FORCE_OVERWRITE = args.force_overwrite
    VERBOSE = args.verbose

    # Basic validations
    if not INPUT_ROOT.exists():
        print(f"[FATAL] INPUT_ROOT not found: {INPUT_ROOT}", file=sys.stderr)
        sys.exit(1)
    if not TEMPLATE.exists():
        print(f"[FATAL] TEMPLATE not found: {TEMPLATE}", file=sys.stderr)
        sys.exit(1)

    # Avoid scanning OUTPUT_ROOT if it's inside INPUT_ROOT
    output_inside_input = (
        OUTPUT_ROOT.resolve().is_relative_to(INPUT_ROOT.resolve())
        if hasattr(Path, "is_relative_to")
        else str(OUTPUT_ROOT.resolve()).startswith(str(INPUT_ROOT.resolve()))
    )

    failures = 0
    updated_outputs_by_province: dict[str, list[Path]] = {}

    for root, dirs, files in os.walk(INPUT_ROOT):
        # Sort directories and files alphabetically to ensure consistent order
        dirs.sort()
        files.sort()
        root_path = Path(root)

        # If OUTPUT_ROOT is inside INPUT_ROOT, skip that subtree
        if (
            output_inside_input
            and root_path.resolve().is_relative_to(OUTPUT_ROOT.resolve())
            if hasattr(Path, "is_relative_to")
            else str(root_path.resolve()).startswith(str(OUTPUT_ROOT.resolve()))
        ):
            continue

        # Find .shp files directly in current directory
        shp_files = [root_path / f for f in files if f.lower().endswith(".shp")]
        if not shp_files:
            continue

        # Sort for determinism; pick the first .shp (warn if there are multiple)
        shp_files = sorted(shp_files)
        if len(shp_files) > 1:
            print(
                f"[WARN] Multiple .shp in {root_path}; using the first one: {Path(shp_files[0]).name}"
            )

        shp = Path(shp_files[0])
        try:
            output_osm = build_output_path(root_path)
        except ValueError:
            # This happens if root_path is not under INPUT_ROOT (shouldn't occur in practice)
            print(
                f"[ERROR] Could not compute relative path for {root_path}",
                file=sys.stderr,
            )
            failures += 1
            continue

        status = run_ogr2osm(shp, output_osm)
        if status == "error":
            failures += 1
            continue
        if status == "written":
            province_code = output_osm.parent.name.upper()
            updated_outputs_by_province.setdefault(province_code, []).append(output_osm)

    if updated_outputs_by_province and not DRY_RUN:
        update_import_manifest(
            updated_outputs_by_province,
            input_root=INPUT_ROOT,
            output_root=OUTPUT_ROOT,
        )
        print(f"[INFO] Updated {MANIFEST_PATH}")

    if failures:
        print(f"[DONE] Completed with {failures} failure(s).")
        sys.exit(2)
    else:
        print("[DONE] All conversions completed successfully.")


if __name__ == "__main__":
    main()
