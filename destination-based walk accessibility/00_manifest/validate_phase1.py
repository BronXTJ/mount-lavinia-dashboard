#!/usr/bin/env python3
"""Phase 1 gate: validate accessibility POI inventory. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "01_boundary/primary_study_area_boundary.geojson",
    "01_boundary/access_aoi_500m.geojson",
    "02_pois/raw/osm_pois_raw.geojson",
    "02_pois/raw/gmaps_places_raw.geojson",
    "02_pois/pois_access_primary.geojson",
    "02_pois/pois_access_summary.json",
    "00_manifest/METHODS_PHASE1.md",
    "00_manifest/SOURCE_MANIFEST.json",
]

POI_REQUIRED_FIELDS = ["poi_id", "name", "dest_group", "source", "in_primary"]
DEST_GROUPS = {"food", "education", "health", "transit", "finance", "open_space"}
SOURCES = {"osm", "gmaps"}


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED_FILES:
        path = PACKAGE_ROOT / rel
        if not path.is_file():
            fail(f"Missing file: {rel}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    boundary = load_json(PACKAGE_ROOT / "01_boundary/primary_study_area_boundary.geojson")
    if len(boundary.get("features", [])) != 1:
        fail("primary_study_area_boundary must have exactly 1 feature", errors)

    aoi = load_json(PACKAGE_ROOT / "01_boundary/access_aoi_500m.geojson")
    if len(aoi.get("features", [])) < 1:
        fail("access_aoi_500m has no features", errors)

    pois = load_json(PACKAGE_ROOT / "02_pois/pois_access_primary.geojson")
    feats = pois.get("features", [])
    if len(feats) < 50:
        fail(f"pois_access_primary too small ({len(feats)} < 50)", errors)

    poi_ids: set[str] = set()
    for i, feat in enumerate(feats):
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        for field in POI_REQUIRED_FIELDS:
            if field not in props:
                fail(f"Feature {i}: missing field {field}", errors)
                break
        if props.get("dest_group") not in DEST_GROUPS:
            fail(f"Feature {i}: invalid dest_group {props.get('dest_group')!r}", errors)
        if props.get("source") not in SOURCES:
            fail(f"Feature {i}: invalid source {props.get('source')!r}", errors)
        if not isinstance(props.get("in_primary"), bool):
            fail(f"Feature {i}: in_primary must be boolean", errors)
        pid = props.get("poi_id")
        if pid in poi_ids:
            fail(f"Duplicate poi_id: {pid}", errors)
        poi_ids.add(pid)
        if geom.get("type") != "Point":
            fail(f"Feature {i}: geometry must be Point", errors)
        coords = geom.get("coordinates") or []
        if len(coords) < 2:
            fail(f"Feature {i}: invalid coordinates", errors)

    summary = load_json(PACKAGE_ROOT / "02_pois/pois_access_summary.json")
    if summary.get("feature_count") != len(feats):
        fail(
            f"summary feature_count {summary.get('feature_count')} != geojson {len(feats)}",
            errors,
        )
    by_group = summary.get("by_dest_group") or {}
    for g in DEST_GROUPS:
        if g not in by_group:
            fail(f"summary missing dest_group key: {g}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  pois_access_primary features: {len(feats)}")
    print(f"  by_dest_group: {by_group}")
    print(f"  by_source: {summary.get('by_source')}")
    empty = summary.get("empty_groups") or []
    if empty:
        print(f"  NOTE: empty groups (allowed): {empty}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
