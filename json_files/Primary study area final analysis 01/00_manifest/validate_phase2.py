#!/usr/bin/env python3
"""Phase 2 gate: validate primary 100 m hex grid. Exit 0 only on PASS."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
HEX_PATH = PACKAGE_ROOT / "02_hex_grid" / "hex_grid_primary_100m.geojson"
SUMMARY_PATH = PACKAGE_ROOT / "02_hex_grid" / "hex_grid_primary_100m_summary.json"
BOUNDARY_PATH = PACKAGE_ROOT / "01_boundary" / "primary_study_area_boundary.geojson"

REQUIRED_FIELDS = [
    "id",
    "row_index",
    "col_index",
    "left",
    "right",
    "top",
    "bottom",
    "Hex_area",
    "Hex_area_full",
    "is_edge",
]

HEX_SIZE = 100.0
SIDE = HEX_SIZE / math.sqrt(3.0)
THEORETICAL_AREA = (3.0 * math.sqrt(3.0) / 2.0) * (SIDE**2)
INTERIOR_TOL = 0.01  # 1%


def main() -> int:
    errors: list[str] = []
    summary_lines: list[str] = []

    print(f"Package root: {PACKAGE_ROOT}")
    print("--- Phase 2 validation ---")

    if not HEX_PATH.exists() or HEX_PATH.stat().st_size <= 0:
        errors.append(f"MISSING or empty hex grid: {HEX_PATH}")
    if not SUMMARY_PATH.exists() or SUMMARY_PATH.stat().st_size <= 0:
        errors.append(f"MISSING or empty summary: {SUMMARY_PATH}")
    if not BOUNDARY_PATH.exists():
        errors.append(f"MISSING boundary: {BOUNDARY_PATH}")

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    with HEX_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    features = data.get("features") or []
    n = len(features)
    if n <= 0:
        errors.append("Hex grid has 0 features")

    ids = []
    for i, feat in enumerate(features):
        props = feat.get("properties") or {}
        missing = [k for k in REQUIRED_FIELDS if k not in props]
        if missing:
            errors.append(f"Feature {i}: missing fields {missing}")
            break
        ids.append(props["id"])

        is_edge = bool(props["is_edge"])
        hex_area = float(props["Hex_area"])
        hex_full = float(props["Hex_area_full"])

        if is_edge:
            if not (hex_area < hex_full - 1e-6):
                errors.append(
                    f"Edge id={props['id']}: expected Hex_area < Hex_area_full "
                    f"({hex_area} vs {hex_full})"
                )
        else:
            # Interior: within 1% of theoretical full area
            if abs(hex_area - THEORETICAL_AREA) / THEORETICAL_AREA > INTERIOR_TOL:
                errors.append(
                    f"Interior id={props['id']}: Hex_area {hex_area} not within 1% of "
                    f"{THEORETICAL_AREA}"
                )
            if abs(hex_full - THEORETICAL_AREA) / THEORETICAL_AREA > INTERIOR_TOL:
                errors.append(
                    f"Interior id={props['id']}: Hex_area_full {hex_full} not within 1% of "
                    f"{THEORETICAL_AREA}"
                )

    if len(ids) != len(set(ids)):
        errors.append("Duplicate id values found")

    # Geometry intersects boundary (project to 3857 for robust check)
    hex_gdf = gpd.read_file(HEX_PATH)
    boundary_gdf = gpd.read_file(BOUNDARY_PATH)
    if hex_gdf.crs is None:
        hex_gdf = hex_gdf.set_crs("EPSG:4326")
    if boundary_gdf.crs is None:
        boundary_gdf = boundary_gdf.set_crs("EPSG:4326")
    hex_3857 = hex_gdf.to_crs("EPSG:3857")
    boundary_geom = unary_union(boundary_gdf.to_crs("EPSG:3857").geometry.values)

    non_intersect = 0
    for geom in hex_3857.geometry:
        if geom is None or geom.is_empty or not geom.intersects(boundary_geom):
            non_intersect += 1
    if non_intersect:
        errors.append(f"{non_intersect} hex geometries do not intersect the boundary")

    with SUMMARY_PATH.open(encoding="utf-8") as f:
        summary = json.load(f)
    if summary.get("feature_count") != n:
        errors.append(
            f"Summary feature_count {summary.get('feature_count')} != geojson n={n}"
        )

    edge_count = sum(1 for f in features if f["properties"]["is_edge"])
    interior_count = n - edge_count
    areas = [float(f["properties"]["Hex_area"]) for f in features]

    summary_lines.append(f"OK hex file n={n} bytes={HEX_PATH.stat().st_size}")
    summary_lines.append(f"OK edge={edge_count} interior={interior_count}")
    summary_lines.append(
        f"OK Hex_area min/max/mean={min(areas):.4f}/{max(areas):.4f}/{sum(areas)/len(areas):.4f}"
    )
    summary_lines.append(f"OK theoretical_full_area~={THEORETICAL_AREA:.4f}")
    summary_lines.append("OK required fields present")
    summary_lines.append("OK unique ids")
    summary_lines.append("OK all hexes intersect primary boundary")

    print()
    for line in summary_lines:
        print(line)

    if errors:
        print()
        print("FAIL — Phase 2 validation errors:")
        for err in errors[:30]:
            print(f"  - {err}")
        if len(errors) > 30:
            print(f"  ... and {len(errors) - 30} more")
        return 1

    print()
    print("PASS - Phase 2 primary 100 m hex grid is valid.")
    print(f"  hexes={n} edge={edge_count} interior={interior_count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
