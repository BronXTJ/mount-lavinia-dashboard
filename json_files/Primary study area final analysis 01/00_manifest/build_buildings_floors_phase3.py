#!/usr/bin/env python3
"""Phase 3: derive Floors and Floor_Area from Zenodo buildings (Height/3 rule)."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import geopandas as gpd

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
IN_PATH = PACKAGE_ROOT / "03_buildings" / "zenodo_buildings_raw.geojson"
OUT_GEOJSON = PACKAGE_ROOT / "03_buildings" / "buildings_primary_floors.geojson"
OUT_SUMMARY = PACKAGE_ROOT / "03_buildings" / "buildings_primary_floors_summary.json"

ANALYSIS_CRS = "EPSG:3857"
EXPORT_CRS = "EPSG:4326"
EXPECTED_COUNT = 5501


def floors_from_height(height: float) -> int:
    if height < 3:
        return 1
    return int(round(height / 3.0))


def main() -> None:
    gdf = gpd.read_file(IN_PATH)
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    if len(gdf) != EXPECTED_COUNT:
        raise SystemExit(f"Expected {EXPECTED_COUNT} buildings, got {len(gdf)}")

    gdf_m = gdf.to_crs(ANALYSIS_CRS)
    area_build = gdf_m.geometry.area.astype(float)
    heights = gdf["Height"].astype(float)
    floors = heights.map(floors_from_height).astype(int)
    floor_area = area_build * floors.astype(float)

    out = gpd.GeoDataFrame(
        {
            "FID_1": gdf["FID_1"].values,
            "Height": heights.values,
            "Area_build": area_build.round(4).values,
            "Floors": floors.values,
            "Floor_Area": floor_area.round(4).values,
        },
        geometry=gdf.geometry.values,
        crs=gdf.crs,
    )

    # Ensure CRS84 export
    out = out.to_crs(EXPORT_CRS)
    geojson = json.loads(out.to_json())
    geojson["crs"] = {
        "type": "name",
        "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
    }
    for feat in geojson["features"]:
        geom = feat["geometry"]
        if geom and geom["type"] == "Polygon":
            feat["geometry"] = {
                "type": "MultiPolygon",
                "coordinates": [geom["coordinates"]],
            }

    with OUT_GEOJSON.open("w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    below3 = int((heights < 3).sum())
    floor_hist = Counter(int(v) for v in floors.tolist())
    floor_hist_sorted = {
        str(k): floor_hist[k] for k in sorted(floor_hist.keys())
    }
    summary = {
        "phase": 3,
        "output": str(OUT_GEOJSON).replace("\\", "/"),
        "source": str(IN_PATH).replace("\\", "/"),
        "analysis_crs_for_area": ANALYSIS_CRS,
        "export_crs": "CRS84 / EPSG:4326",
        "floors_rule": "if Height < 3: 1 else round(Height / 3)",
        "feature_count": int(len(out)),
        "Height": {
            "min": float(heights.min()),
            "max": float(heights.max()),
            "below_3m_count": below3,
        },
        "Floors": {
            "min": int(floors.min()),
            "max": int(floors.max()),
            "mean": float(floors.mean()),
            "histogram": floor_hist_sorted,
        },
        "Area_build_m2": {
            "min": float(area_build.min()),
            "max": float(area_build.max()),
            "sum": float(area_build.sum()),
            "mean": float(area_build.mean()),
        },
        "Floor_Area_m2": {
            "min": float(floor_area.min()),
            "max": float(floor_area.max()),
            "sum": float(floor_area.sum()),
            "mean": float(floor_area.mean()),
        },
    }
    with OUT_SUMMARY.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Wrote {OUT_GEOJSON}")
    print(f"Wrote {OUT_SUMMARY}")
    print(
        f"n={len(out)} Height<3m={below3} Floors "
        f"{int(floors.min())}-{int(floors.max())} "
        f"Area_build mean={float(area_build.mean()):.2f}"
    )


if __name__ == "__main__":
    main()
