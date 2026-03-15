"""Shared configuration constants for the copsuolo pipeline."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

DEFAULT_MIN_ZOOM = 7
DEFAULT_MAX_ZOOM = 13

VALID_PROVINCES = ("BL", "PD", "RO", "TV", "VE", "VI", "VR")

DEFAULT_INPUT_ROOT = REPO_ROOT / "dist" / "copsuolo_2023_14275"
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "frontend" / "public" / "data"
DEFAULT_PBF = REPO_ROOT / "data" / "italy-nord-est.osm.pbf"
DEFAULT_INTERMEDIATE_ROOT = REPO_ROOT / "data" / "tmp" / "intermediate"
