#!/usr/bin/env python3
"""Clip primary hex layer geometries to the study-area boundary (properties unchanged)."""

from __future__ import annotations

import json
import math
from pathlib import Path

import geopandas as gpd
from shapely.geometry import mapping
from shapely.ops import unary_union

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
BOUNDARY_PATH = PACKAGE_ROOT / "01_boundary" / "primary_study_area_boundary.geojson"
ANALYSIS_CRS = "EPSG:3857"
EXPORT_CRS = "EPSG:4326"

TARGETS = [
    PACKAGE_ROOT / "02_hex_grid" / "hex_grid_primary_100m.geojson",
    PACKAGE_ROOT / "04_density" / "density_primary_hex.geojson",
    PACKAGE_ROOT / "05_maturation" / "maturation_primary_hex.geojson",
]


def _as_multipolygon_coords(geom) -> dict | None:
    if geom is None or geom.is_empty:
        return None
    if geom.geom_type == "Polygon":
        return {"type": "MultiPolygon", "coordinates": [mapping(geom)["coordinates"]]}
    if geom.geom_type == "MultiPolygon":
        return mapping(geom)
    if geom.geom_type == "GeometryCollection":
        polys = [g for g in geom.geoms if g.geom_type in ("Polygon", "MultiPolygon") and not g.is_empty]
        if not polys:
            return None
        merged = unary_union(polys)
        return _as_multipolygon_coords(merged)
    return None


def clip_layer(path: Path, boundary_3857) -> dict:
    gdf = gpd.read_file(path)
    if gdf.crs is None:
        gdf = gdf.set_crs(EXPORT_CRS)
    gdf_m = gdf.to_crs(ANALYSIS_CRS).copy()
    clipped = gdf_m.geometry.intersection(boundary_3857)
    gdf_m = gdf_m.set_geometry(clipped)
    gdf_m = gdf_m[~gdf_m.geometry.is_empty & gdf_m.geometry.notna()].copy()
    gdf_out = gdf_m.to_crs(EXPORT_CRS)

    # Preserve original GeoJSON wrapper style where possible
    raw = json.loads(path.read_text(encoding="utf-8"))
    by_id = {}
    for _, row in gdf_out.iterrows():
        props = {k: row[k] for k in gdf_out.columns if k != "geometry"}
        # JSON-safe NaN / numpy types
        clean_props = {}
        for k, v in props.items():
            if v is None:
                clean_props[k] = None
            elif isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                clean_props[k] = None
            elif hasattr(v, "item"):
                try:
                    clean_props[k] = v.item()
                except Exception:
                    clean_props[k] = v
            else:
                clean_props[k] = v
        geom = _as_multipolygon_coords(row.geometry)
        if geom is None:
            continue
        key = clean_props.get("id")
        by_id[key] = {"type": "Feature", "properties": clean_props, "geometry": geom}

    features = []
    for feat in raw.get("features", []):
        key = feat.get("properties", {}).get("id")
        if key in by_id:
            features.append(by_id[key])
        elif key is None:
            # fall back: skip unmatched without id
            pass

    # Include any clipped rows not in original order (should not happen)
    seen = {f["properties"].get("id") for f in features}
    for key, feat in by_id.items():
        if key not in seen:
            features.append(feat)

    out = {
        "type": "FeatureCollection",
        "features": features,
    }
    if "crs" in raw:
        out["crs"] = raw["crs"]
    else:
        out["crs"] = {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        }
    return out


def main() -> None:
    boundary = gpd.read_file(BOUNDARY_PATH)
    if boundary.crs is None:
        boundary = boundary.set_crs(EXPORT_CRS)
    boundary_3857 = unary_union(boundary.to_crs(ANALYSIS_CRS).geometry.values)

    for path in TARGETS:
        if not path.exists():
            raise SystemExit(f"Missing layer: {path}")
        before = len(json.loads(path.read_text(encoding="utf-8"))["features"])
        clipped = clip_layer(path, boundary_3857)
        after = len(clipped["features"])
        path.write_text(json.dumps(clipped, ensure_ascii=False), encoding="utf-8")
        print(f"Clipped {path.name}: {before} -> {after} features")


if __name__ == "__main__":
    main()
