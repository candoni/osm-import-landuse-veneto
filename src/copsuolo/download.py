#!/usr/bin/env python3
"""
Download COPSULO 2023 layers by codComune.

- Reads codes from data/{PROVINCIA}_comuni.json
- For each code, downloads:
  https://idt2.regione.veneto.it/idt/download/layerDownload/downloadLayerByComune?codComune={codComune}&idLayer=14275
- Saves under: data/copsuolo_2023_14275/{PROVINCIA}/

Assumes {PROVINCIA}_comuni.json is either:
  - a list of objects with key "codComune"
  - a list of strings/ints (the codes)
  - a dict mapping arbitrary keys to codes, or to objects with "codComune"
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime
import json
import time
import sys
import zipfile
import unicodedata

from pathlib import Path
from typing import List, TextIO, Tuple

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from copsuolo.config import REPO_ROOT, VALID_PROVINCES

LAYER_ID = "14275"
LAYER_NAME = "copsuolo_2023"
BASE_URL = (
    "https://idt2.regione.veneto.it/idt/download/layerDownload/"
    "downloadLayerByComune?codComune={codComune}" + f"&idLayer={LAYER_ID}"
)
DATA_DIR = REPO_ROOT / "data"
LAYER_ROOT = DATA_DIR / f"{LAYER_NAME}_{LAYER_ID}"
TMP_DIR = DATA_DIR / "tmp" / f"{LAYER_NAME}_{LAYER_ID}"
# Filename es: agugliaro_24001.zip
FILENAME_TEMPLATE = "{nomeComune}_{codComune}.zip"


# ---------- Utilities ----------


@dataclass
class RunStats:
    errors: int = 0
    http_requests: int = 0
    skips: int = 0
    successful_payloads: int = 0


def log_error(log_fp: TextIO, message: str, stats: RunStats) -> None:
    timestamp = datetime.now().isoformat(timespec="seconds")
    log_fp.write(f"[{timestamp}] {message}\n")
    log_fp.flush()
    stats.errors += 1


def delete_invalid_zip(path: Path, log_fp: TextIO, stats: RunStats) -> None:
    message = f"{path} is not a valid ZIP file."
    print(f"[ERR  ] {message}")
    log_error(log_fp, message, stats)
    path.unlink(missing_ok=True)
    print(f"[RM   ] Removed invalid ZIP {path}")


def build_session() -> requests.Session:
    """HTTP session with retries and sensible timeouts."""
    session = requests.Session()
    retry = Retry(
        total=5,
        backoff_factor=0.8,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({"User-Agent": "veneto-copsuolo-downloader/1.1"})
    return session


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download and extract COPSULO 2023 archives by comune."
    )
    parser.add_argument(
        "--provincia",
        required=True,
        choices=VALID_PROVINCES,
        help="Veneto province code.",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=float,
        default=1.0,
        help="Seconds to wait between municipalities. Default: 1.0.",
    )
    return parser.parse_args()


def slugify_name(name: str) -> str:
    """
    Turn a comune name into a filesystem-safe slug:
    - lowercase
    - remove accents
    - spaces -> '-', apostrophes removed
    - keep only [a-z0-9-_]
    """
    n = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    n = n.lower().replace("'", "").replace("\u2019", "").replace("`", "").replace(" ", "-")
    allowed = []
    for ch in n:
        if ("a" <= ch <= "z") or ("0" <= ch <= "9") or ch in "-_":
            allowed.append(ch)
    # collapse multiple dashes
    slug = []
    prev_dash = False
    for ch in allowed:
        if ch == "-":
            if not prev_dash:
                slug.append(ch)
            prev_dash = True
        else:
            slug.append(ch)
            prev_dash = False
    return "".join(slug).strip("-") or "comune"


def load_code_and_name(json_path: Path) -> List[Tuple[str, str]]:
    """Return list of (codComune, nomeComune)."""
    with json_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    items: List[Tuple[str, str]] = []
    for item in data:
        if "codComune" in item and item["codComune"]:
            code = str(item["codComune"]).strip()
            name = str(item.get("nomeComune", "") or "").strip()
            items.append((code, name))
    if not items:
        raise ValueError("No codComune found in JSON.")
    return items


def is_zip_signature(path: Path) -> bool:
    """Quick check: ZIP files start with bytes PK."""
    try:
        with path.open("rb") as f:
            sig = f.read(4)
        return sig.startswith(b"PK")
    except Exception:
        return False


def has_shapefile_payload(target_dir: Path) -> bool:
    """True when the directory contains at least one complete shapefile set."""
    stems = set()
    for shp_path in target_dir.rglob("*.shp"):
        stems.add(shp_path.with_suffix(""))
    for stem in stems:
        if stem.with_suffix(".dbf").exists() and stem.with_suffix(".shx").exists():
            return True
    return False


def extract_nested_archives(target_dir: Path, log_fp: TextIO, stats: RunStats) -> None:
    """Expand nested ZIP files already present in an extracted directory."""
    for nested_path in sorted(target_dir.rglob("*.zip")):
        if not is_zip_signature(nested_path):
            delete_invalid_zip(nested_path, log_fp, stats)
            continue
        try:
            with zipfile.ZipFile(nested_path, "r") as zf:
                zf.extractall(nested_path.parent)
            print(f"[UNZIP] Extracted nested ZIP {nested_path}")
        except zipfile.BadZipFile:
            delete_invalid_zip(nested_path, log_fp, stats)


def extract_zip(zip_path: Path, target_dir: Path, log_fp: TextIO, stats: RunStats) -> bool:
    """Extract ZIP file into target_dir and unpack any nested ZIP payloads."""
    target_dir.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(target_dir)
        print(f"[UNZIP] Extracted to {target_dir}")
    except zipfile.BadZipFile:
        delete_invalid_zip(zip_path, log_fp, stats)
        return False

    extract_nested_archives(target_dir, log_fp, stats)

    if not has_shapefile_payload(target_dir):
        message = f"{target_dir} does not contain a complete shapefile payload."
        print(f"[ERR  ] {message}")
        log_error(log_fp, message, stats)
        zip_path.unlink(missing_ok=True)
        print(f"[RM   ] Removed temporary ZIP {zip_path}")
        return False

    stats.successful_payloads += 1
    return True


def download_one(
    session: requests.Session,
    code: str,
    comune_name: str,
    out_dir: Path,
    temp_dir: Path,
    log_fp: TextIO,
    stats: RunStats,
) -> bool:
    url = BASE_URL.format(codComune=code)
    slug = slugify_name(comune_name or code)
    out_path = temp_dir / FILENAME_TEMPLATE.format(codComune=code, nomeComune=slug)
    tmp_path = out_path.with_suffix(out_path.suffix + ".part")
    extract_dir = out_dir / out_path.stem  # same name as zip, without .zip

    # Recover previous partial extracts by expanding any nested ZIPs already present.
    if extract_dir.exists() and any(extract_dir.iterdir()):
        extract_nested_archives(extract_dir, log_fp, stats)

    # Skip only when a full shapefile payload is already available.
    if extract_dir.exists() and has_shapefile_payload(extract_dir):
        print(f"[SKIP] {code} -> already extracted: {extract_dir.name}")
        stats.skips += 1
        return False

    # If zip already present and valid, skip download
    if out_path.exists() and out_path.stat().st_size > 0 and is_zip_signature(out_path):
        print(f"[SKIP] {code} -> ZIP exists: {out_path.name}")
        requested = False
    else:
        requested = True
        stats.http_requests += 1
        print(f"[GET ] {code} -> {url}")
        try:
            with session.get(url, stream=True, timeout=(10, 120)) as r:
                r.raise_for_status()
                with tmp_path.open("wb") as f:
                    for chunk in r.iter_content(chunk_size=128 * 1024):
                        if chunk:
                            f.write(chunk)
        except requests.RequestException as e:
            message = f"{code} -> HTTP error: {e}"
            print(f"[ERR ] {message}")
            log_error(log_fp, message, stats)
            tmp_path.unlink(missing_ok=True)
            return requested

        if not is_zip_signature(tmp_path):
            message = f"{code} -> response not a ZIP. Keeping: {tmp_path.name}"
            print(f"[WARN] {message}")
            log_error(log_fp, message, stats)
            return requested

        tmp_path.replace(out_path)
        print(
            f"[OK  ] {code} -> saved {out_path.name} ({out_path.stat().st_size} bytes)"
        )

    # Extract
    extract_zip(out_path, extract_dir, log_fp, stats)
    return requested


# ---------- Main ----------


def main():
    args = parse_args()
    provincia = args.provincia.upper()
    sleep_seconds = args.sleep_seconds
    province_dir = LAYER_ROOT / provincia
    province_tmp_dir = TMP_DIR / provincia
    json_path = DATA_DIR / f"{provincia}_comuni.json"

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LAYER_ROOT.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    province_dir.mkdir(parents=True, exist_ok=True)
    province_tmp_dir.mkdir(parents=True, exist_ok=True)
    stats = RunStats()
    log_path = province_dir / (
        f"download_errors_{datetime.now().strftime('%Y%m%d-%H%M%S')}.log"
    )
    if not json_path.exists():
        message = f"Input JSON not found: {json_path}"
        with log_path.open("a", encoding="utf-8") as log_fp:
            log_error(log_fp, message, stats)
        print(message, file=sys.stderr)
        sys.exit(1)

    try:
        items = load_code_and_name(json_path)  # list of (codComune, nomeComune)
    except Exception as e:
        message = f"Failed to read/parse {json_path}: {e}"
        with log_path.open("a", encoding="utf-8") as log_fp:
            log_error(log_fp, message, stats)
        print(message, file=sys.stderr)
        sys.exit(2)

    session = build_session()
    with log_path.open("a", encoding="utf-8") as log_fp:
        for index, (code, nome) in enumerate(items):
            requested = download_one(
                session, code, nome, province_dir, province_tmp_dir, log_fp, stats
            )
            if requested and index < len(items) - 1 and sleep_seconds > 0:
                time.sleep(sleep_seconds)

    print(
        "[DONE] "
        f"province={provincia} "
        f"http_requests={stats.http_requests} "
        f"skips={stats.skips} "
        f"successful_payloads={stats.successful_payloads} "
        f"errors={stats.errors}"
    )


if __name__ == "__main__":
    main()
