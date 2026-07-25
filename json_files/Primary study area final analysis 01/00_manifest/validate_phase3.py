#!/usr/bin/env python3
"""Phase 3 gate: validate buildings floors layer. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = PACKAGE_ROOT / "03_buildings" / "buildings_primary_floors.geojson"
SUMMARY_PATH = PACKAGE_ROOT / "03_buildings" / "buildings_primary_floors_summary.json"
RAW_PATH = PACKAGE_ROOT / "03_buildings" / "zenodo_buildings_raw.geojson"

EXPECTED_COUNT = 5501
REQUIRED = ["FID_1", "Height", "Area_build", "Floors", "Floor_Area"]
AREA_TOL = 0.02  # rounded to 4 decimals


def floors_from_height(height: float) -> int:
    if height < 3:
        return 1
    return int(round(height / 3.0))


def main() -> int:
    errors: list[str] = []
    print(f"Package root: {PACKAGE_ROOT}")
    print("--- Phase 3 validation ---")

    if not OUT_PATH.exists() or OUT_PATH.stat().st_size <= 0:
        errors.append(f"MISSING or empty: {OUT_PATH}")
    if not SUMMARY_PATH.exists():
        errors.append(f"MISSING summary: {SUMMARY_PATH}")
    if not RAW_PATH.exists():
        errors.append(f"MISSING raw zenodo (must remain): {RAW_PATH}")

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    with OUT_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    features = data.get("features") or []
    n = len(features)
    if n != EXPECTED_COUNT:
        errors.append(f"COUNT expected {EXPECTED_COUNT}, got {n}")

    heights = []
    areas = []
    floor_areas = []
    floors_list = []

    for i, feat in enumerate(features):
        props = feat.get("properties") or {}
        missing = [k for k in REQUIRED if k not in props]
        if missing:
            errors.append(f"Feature {i}: missing {missing}")
            break

        height = float(props["Height"])
        area_build = float(props["Area_build"])
        floors = int(props["Floors"])
        floor_area = float(props["Floor_Area"])

        heights.append(height)
        areas.append(area_build)
        floor_areas.append(floor_area)
        floors_list.append(floors)

        if area_build <= 0:
            errors.append(f"Feature {i} FID_1={props.get('FID_1')}: Area_build <= 0")

        expected_floors = floors_from_height(height)
        if floors != expected_floors:
            errors.append(
                f"Feature {i}: Floors={floors} expected {expected_floors} for Height={height}"
            )

        expected_fa = round(area_build * floors, 4)
        if abs(floor_area - expected_fa) > AREA_TOL and abs(
            floor_area - area_build * floors
        ) > AREA_TOL:
            errors.append(
                f"Feature {i}: Floor_Area={floor_area} != Area_build*Floors "
                f"({area_build}*{floors})"
            )

        if len(errors) > 40:
            break

    if heights:
        hmin = min(heights)
        if hmin <= 0:
            errors.append(f"Height min must be > 0, got {hmin}")
        mean_area = sum(areas) / len(areas)
        if mean_area < 1.0:
            errors.append(
                f"Area_build mean {mean_area} looks like square degrees, not m2"
            )

    with SUMMARY_PATH.open(encoding="utf-8") as f:
        summary = json.load(f)
    if summary.get("feature_count") != n:
        errors.append(
            f"Summary feature_count {summary.get('feature_count')} != geojson n={n}"
        )

    below3 = sum(1 for h in heights if h < 3) if heights else None

    print()
    print(f"OK buildings file n={n} bytes={OUT_PATH.stat().st_size}")
    if heights:
        print(
            f"OK Height min/max={min(heights)}/{max(heights)} below_3m={below3}"
        )
        print(
            f"OK Floors min/max/mean="
            f"{min(floors_list)}/{max(floors_list)}/{sum(floors_list)/len(floors_list):.3f}"
        )
        print(
            f"OK Area_build mean/sum={sum(areas)/len(areas):.2f}/{sum(areas):.2f}"
        )
    print("OK floors rule and Floor_Area checks")
    print("OK raw zenodo source still present")

    if errors:
        print()
        print("FAIL - Phase 3 validation errors:")
        for err in errors[:30]:
            print(f"  - {err}")
        if len(errors) > 30:
            print(f"  ... and {len(errors) - 30} more")
        return 1

    print()
    print("PASS - Phase 3 buildings floors layer is valid.")
    print(f"  buildings={n} Height<3m={below3}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
