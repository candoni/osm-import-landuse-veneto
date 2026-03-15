#!/usr/bin/env python3
"""
Print distinct tag keys found under `tags:` in src/map_copsuolo.yaml.
"""

from __future__ import annotations

import sys
from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parent.parent
YAML_PATH = REPO_ROOT / "src" / "map_copsuolo.yaml"


def load_yaml(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"YAML file not found: {path}")

    try:
        with path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle)
    except yaml.YAMLError as exc:
        raise ValueError(f"Invalid YAML in {path}: {exc}") from exc

    if not isinstance(data, dict):
        raise ValueError(f"Unexpected YAML root in {path}: expected a mapping")

    return data


def collect_distinct_tag_keys(data: dict) -> list[str]:
    items = data.get("map")
    if not isinstance(items, list):
        raise ValueError("Unexpected YAML structure: expected 'map' to be a list")

    keys: set[str] = set()
    for entry in items:
        if not isinstance(entry, dict):
            continue
        tags = entry.get("tags")
        if isinstance(tags, dict):
            keys.update(str(key) for key in tags.keys())

    return sorted(keys)


def main() -> int:
    try:
        data = load_yaml(YAML_PATH)
        for key in collect_distinct_tag_keys(data):
            print(key)
    except (FileNotFoundError, ValueError) as exc:
        print(exc, file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
