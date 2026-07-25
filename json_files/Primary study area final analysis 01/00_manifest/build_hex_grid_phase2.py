#!/usr/bin/env python3
"""Phase 2: flat-top 100 m hex grid over the primary study area boundary."""

from __future__ import annotations

import json
import math
from pathlib import Path

import geopandas as gpd
from shapely.geometry import Polygon
from shapely.ops import unary_union

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
BOUNDARY_PATH = PACKAGE_ROOT / "01_boundary" / "primary_study_area_boundary.geojson"
OUT_DIR = PACKAGE_ROOT / "02_hex_grid"
OUT_GEOJSON = OUT_DIR / "hex_grid_primary_100m.geojson"
OUT_SUMMARY = OUT_DIR / "hex_grid_primary_100m_summary.json"

# Flat-top hex: vertical flat-to-flat = 100 m (matches old Focus Area grid)
HEX_SIZE = 100.0  # flat-to-flat (short diameter / row spacing)
SIDE = HEX_SIZE / math.sqrt(3.0)
HEX_WIDTH = 2.0 * SIDE  # ~115.470
COL_SPACING = 1.5 * SIDE  # ~86.603
ROW_SPACING = HEX_SIZE  # 100
THEORETICAL_AREA = (3.0 * math.sqrt(3.0) / 2.0) * (SIDE**2)  # ~8660.25
EDGE_RATIO = 0.999
ANALYSIS_CRS = "EPSG:3857"
EXPORT_CRS = "EPSG:4326"


def flat_top_hex(cx: float, cy: float, side: float) -> Polygon:
    """Flat-top regular hexagon centered at (cx, cy)."""
    angles_deg = [0, 60, 120, 180, 240, 300]
    coords = [
        (cx + side * math.cos(math.radians(a)), cy + side * math.sin(math.radians(a)))
        for a in angles_deg
    ]
    return Polygon(coords)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    boundary_gdf = gpd.read_file(BOUNDARY_PATH)
    if boundary_gdf.crs is None:
        boundary_gdf = boundary_gdf.set_crs("EPSG:4326")
    boundary_3857 = boundary_gdf.to_crs(ANALYSIS_CRS)
    boundary_geom = unary_union(boundary_3857.geometry.values)
    minx, miny, maxx, maxy = boundary_geom.bounds

    # Pad by one hex so edge coverage is complete
    pad_x = HEX_WIDTH
    pad_y = HEX_SIZE
    minx -= pad_x
    maxx += pad_x
    miny -= pad_y
    maxy += pad_y

    records = []
    # Odd-q vertical layout for flat-top: odd columns shifted down by half row
    col = 0
    x = minx
    while x <= maxx + 1e-6:
        y_offset = (ROW_SPACING / 2.0) if (col % 2 == 1) else 0.0
        row = 0
        y = miny + y_offset
        while y <= maxy + 1e-6:
            hex_poly = flat_top_hex(x, y, SIDE)
            if hex_poly.intersects(boundary_geom):
                inter = hex_poly.intersection(boundary_geom)
                hex_area = float(inter.area) if not inter.is_empty else 0.0
                hex_area_full = float(hex_poly.area)
                contained = boundary_geom.contains(hex_poly)
                is_edge = (not contained) or (hex_area / hex_area_full < EDGE_RATIO)
                bxmin, bymin, bxmax, bymax = hex_poly.bounds
                records.append(
                    {
                        "row_index": float(row),
                        "col_index": float(col),
                        "left": float(bxmin),
                        "right": float(bxmax),
                        "top": float(bymax),
                        "bottom": float(bymin),
                        "Hex_area": round(hex_area, 4),
                        "Hex_area_full": round(hex_area_full, 4),
                        "is_edge": bool(is_edge),
                        "geometry": hex_poly,
                    }
                )
            row += 1
            y += ROW_SPACING
        col += 1
        x += COL_SPACING

    if not records:
        raise SystemExit("No hexes intersect the primary boundary.")

    # Stable id by row then col
    records.sort(key=lambda r: (r["row_index"], r["col_index"]))
    for i, rec in enumerate(records, start=1):
        rec["id"] = float(i)

    gdf = gpd.GeoDataFrame(records, geometry="geometry", crs=ANALYSIS_CRS)
    gdf_out = gdf.to_crs(EXPORT_CRS)

    # Write GeoJSON with CRS84-style crs member for consistency with package inputs
    geojson = json.loads(gdf_out.to_json())
    geojson["crs"] = {
        "type": "name",
        "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
    }
    # Ensure MultiPolygon like the old grid where helpful
    for feat in geojson["features"]:
        geom = feat["geometry"]
        if geom["type"] == "Polygon":
            feat["geometry"] = {
                "type": "MultiPolygon",
                "coordinates": [geom["coordinates"]],
            }
        # JSON-safe bools already; strip nothing

    with OUT_GEOJSON.open("w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    edge_count = int(gdf["is_edge"].sum())
    interior_count = len(gdf) - edge_count
    areas = gdf["Hex_area"].tolist()
    summary = {
        "phase": 2,
        "output": str(OUT_GEOJSON).replace("\\", "/"),
        "analysis_crs": ANALYSIS_CRS,
        "export_crs": "CRS84 / EPSG:4326",
        "hex_type": "flat-top",
        "flat_to_flat_m": HEX_SIZE,
        "side_m": SIDE,
        "col_spacing_m": COL_SPACING,
        "row_spacing_m": ROW_SPACING,
        "theoretical_full_area_m2": THEORETICAL_AREA,
        "feature_count": len(gdf),
        "edge_count": edge_count,
        "interior_count": interior_count,
        "Hex_area": {
            "min": float(min(areas)),
            "max": float(max(areas)),
            "mean": float(sum(areas) / len(areas)),
        },
        "Hex_area_full_mean": float(gdf["Hex_area_full"].mean()),
        "edge_ratio_threshold": EDGE_RATIO,
    }
    with OUT_SUMMARY.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Wrote {OUT_GEOJSON}")
    print(f"Wrote {OUT_SUMMARY}")
    print(
        f"hexes={len(gdf)} edge={edge_count} interior={interior_count} "
        f"Hex_area min/max={min(areas):.2f}/{max(areas):.2f}"
    )


if __name__ == "__main__":
    main()
