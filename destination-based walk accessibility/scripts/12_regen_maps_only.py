#!/usr/bin/env python3
"""Regenerate map PNGs only for canonical 50 m and scenario 100 m (no recompute)."""

from __future__ import annotations

import importlib
import json
import shutil
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = PACKAGE_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))


def render_maps(access_hex: Path, access_summary: Path, out_maps: Path, classified_out: Path) -> None:
    classify = importlib.import_module("08_classify_and_maps")
    classify.ACCESS_HEX = access_hex
    classify.ACCESS_SUMMARY = access_summary
    classify.OUT_CLASSIFIED = classified_out
    classify.OUT_MAPS = out_maps
    classify.BOUNDARY = PACKAGE_ROOT / "01_boundary" / "primary_study_area_boundary.geojson"
    classify.BETWEENNESS = (
        PACKAGE_ROOT.parent
        / "json_files"
        / "Primary study area final analysis 01"
        / "07_centrality"
        / "betweenness_5000m.geojson"
    )
    out_maps.mkdir(parents=True, exist_ok=True)
    classify.main()


def main() -> None:
    print("Regenerating canonical 50 m maps…")
    render_maps(
        PACKAGE_ROOT / "05_accessibility" / "access_hex_primary.geojson",
        PACKAGE_ROOT / "05_accessibility" / "access_primary_summary.json",
        PACKAGE_ROOT / "06_maps",
        PACKAGE_ROOT / "05_accessibility" / "access_hex_classified.geojson",
    )
    # Keep archive in sync
    for name in ("map01_access_score.png", "map02_access_tiers_deserts.png", "map03_time_by_group.png",
                 "map04_coverage_10min.png", "map05_centrality_mismatch.png", "maps_summary.json"):
        src = PACKAGE_ROOT / "06_maps" / name
        dst = PACKAGE_ROOT / "scenarios" / "snap_50m" / "06_maps" / name
        if src.is_file():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
    shutil.copy2(
        PACKAGE_ROOT / "05_accessibility" / "access_hex_classified.geojson",
        PACKAGE_ROOT / "scenarios" / "snap_50m" / "05_accessibility" / "access_hex_classified.geojson",
    )

    print("Regenerating 100 m scenario maps…")
    snap100 = PACKAGE_ROOT / "scenarios" / "snap_100m"
    render_maps(
        snap100 / "05_accessibility" / "access_hex_primary.geojson",
        snap100 / "05_accessibility" / "access_primary_summary.json",
        snap100 / "06_maps",
        snap100 / "05_accessibility" / "access_hex_classified.geojson",
    )

    print("Refreshing comparison difference map…")
    compare = importlib.import_module("11_compare_snap_scenarios")
    compare.main()
    print("Done.")


if __name__ == "__main__":
    main()
