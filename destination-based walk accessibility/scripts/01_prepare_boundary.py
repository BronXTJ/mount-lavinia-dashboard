#!/usr/bin/env python3
"""Copy primary boundary and build 500 m access AOI."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import geopandas as gpd

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent

SRC_BOUNDARY = (
    REPO_ROOT
    / "json_files"
    / "Primary study area final analysis 01"
    / "01_boundary"
    / "primary_study_area_boundary.geojson"
)
OUT_BOUNDARY = PACKAGE_ROOT / "01_boundary" / "primary_study_area_boundary.geojson"
OUT_AOI = PACKAGE_ROOT / "01_boundary" / "access_aoi_500m.geojson"
BUFFER_M = 500


def main() -> None:
    if not SRC_BOUNDARY.is_file():
        raise SystemExit(f"Missing source boundary: {SRC_BOUNDARY}")

    OUT_BOUNDARY.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC_BOUNDARY, OUT_BOUNDARY)

    gdf = gpd.read_file(OUT_BOUNDARY)
    if gdf.crs is None:
        gdf = gdf.set_crs(4326)
    else:
        gdf = gdf.to_crs(4326)

    metric = gdf.to_crs(3857)
    dissolved = metric.dissolve().reset_index(drop=True)
    dissolved["geometry"] = dissolved.geometry.buffer(BUFFER_M)
    aoi = dissolved.to_crs(4326)
    aoi["name"] = "access_aoi_500m"
    aoi["buffer_m"] = BUFFER_M
    aoi.to_file(OUT_AOI, driver="GeoJSON")

    # Normalize CRS metadata for validators that expect CRS84 name
    with OUT_AOI.open(encoding="utf-8") as f:
        data = json.load(f)
    data["name"] = "access_aoi_500m"
    data["crs"] = {
        "type": "name",
        "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
    }
    with OUT_AOI.open("w", encoding="utf-8") as f:
        json.dump(data, f)

    print(f"Wrote {OUT_BOUNDARY}")
    print(f"Wrote {OUT_AOI} (buffer={BUFFER_M} m, features={len(aoi)})")


if __name__ == "__main__":
    main()
