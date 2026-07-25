#!/usr/bin/env python3
"""Phase 4: aggregate buildings to primary hexes; compute FSI/GSI/OSR/Density_V."""

from __future__ import annotations

import json
import math
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
HEX_PATH = PACKAGE_ROOT / "02_hex_grid" / "hex_grid_primary_100m.geojson"
BLD_PATH = PACKAGE_ROOT / "03_buildings" / "buildings_primary_floors.geojson"
OUT_DIR = PACKAGE_ROOT / "04_density"
OUT_GEOJSON = OUT_DIR / "density_primary_hex.geojson"
OUT_SUMMARY = OUT_DIR / "density_primary_summary.json"

ANALYSIS_CRS = "EPSG:3857"
EXPORT_CRS = "EPSG:4326"
EXPECTED_HEXES = 447


def is_valid_row(fsi, gsi, osr, hex_area, is_edge) -> bool:
    if is_edge:
        return False
    if hex_area is None or hex_area <= 0:
        return False
    if fsi is None or gsi is None or fsi <= 0 or gsi <= 0:
        return False
    if osr is None or osr < 0:
        return False
    return True


def median(vals: list[float]) -> float | None:
    if not vals:
        return None
    s = sorted(vals)
    m = len(s) // 2
    if len(s) % 2:
        return float(s[m])
    return float((s[m - 1] + s[m]) / 2.0)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    hex_gdf = gpd.read_file(HEX_PATH)
    bld_gdf = gpd.read_file(BLD_PATH)
    if hex_gdf.crs is None:
        hex_gdf = hex_gdf.set_crs("EPSG:4326")
    if bld_gdf.crs is None:
        bld_gdf = bld_gdf.set_crs("EPSG:4326")

    if len(hex_gdf) != EXPECTED_HEXES:
        raise SystemExit(f"Expected {EXPECTED_HEXES} hexes, got {len(hex_gdf)}")

    hex_m = hex_gdf.to_crs(ANALYSIS_CRS).copy()
    bld_m = bld_gdf.to_crs(ANALYSIS_CRS).copy()
    bld_m["Floors"] = bld_m["Floors"].astype(int)

    # Keep only needed building columns for overlay
    bld_m = bld_m[["Floors", "geometry"]].copy()
    hex_m = hex_m.reset_index(drop=True)
    hex_m["_hex_idx"] = hex_m.index

    overlay = gpd.overlay(hex_m[["_hex_idx", "geometry"]], bld_m, how="intersection", keep_geom_type=False)
    if len(overlay) == 0:
        raise SystemExit("No building-hex intersections found.")

    overlay["inter_area"] = overlay.geometry.area.astype(float)
    overlay["foot_contrib"] = overlay["inter_area"]
    overlay["floor_contrib"] = overlay["inter_area"] * overlay["Floors"].astype(float)

    agg = (
        overlay.groupby("_hex_idx", as_index=True)
        .agg(Area_build=("foot_contrib", "sum"), Floor_Area=("floor_contrib", "sum"))
    )

    hex_m["Area_build"] = hex_m["_hex_idx"].map(agg["Area_build"]).fillna(0.0)
    hex_m["Floor_Area"] = hex_m["_hex_idx"].map(agg["Floor_Area"]).fillna(0.0)

    hex_area = hex_m["Hex_area"].astype(float)
    area_build = hex_m["Area_build"].astype(float)
    floor_area = hex_m["Floor_Area"].astype(float)

    with np.errstate(divide="ignore", invalid="ignore"):
        gsi = np.where(hex_area > 0, area_build / hex_area, 0.0)
        fsi = np.where(hex_area > 0, floor_area / hex_area, 0.0)
        osr = np.where(floor_area > 0, (hex_area - area_build) / floor_area, np.nan)

    hex_m["GSI"] = gsi
    hex_m["FSI"] = fsi
    hex_m["OSR"] = osr

    is_edge = hex_m["is_edge"].astype(bool).tolist()
    valid_mask = [
        is_valid_row(
            float(fsi[i]) if not math.isnan(fsi[i]) else None,
            float(gsi[i]) if not math.isnan(gsi[i]) else None,
            float(osr[i]) if not (isinstance(osr[i], float) and math.isnan(osr[i])) else None,
            float(hex_area.iloc[i]),
            bool(is_edge[i]),
        )
        for i in range(len(hex_m))
    ]
    valid_mask_arr = np.array(valid_mask, dtype=bool)

    fsi_valid = fsi[valid_mask_arr]
    gsi_valid = gsi[valid_mask_arr]
    if len(fsi_valid) == 0 or len(gsi_valid) == 0:
        raise SystemExit("No valid interior cells for max-norm.")

    fsi_max = float(np.max(fsi_valid))
    gsi_max = float(np.max(gsi_valid))
    if fsi_max <= 0 or gsi_max <= 0:
        raise SystemExit("Invalid max FSI/GSI for normalization.")

    fsi_norm = np.where(np.isfinite(fsi), fsi / fsi_max, 0.0)
    gsi_norm = np.where(np.isfinite(gsi), gsi / gsi_max, 0.0)
    density_v = 0.5 * (fsi_norm + gsi_norm)

    # Round for storage
    hex_m["Area_build"] = np.round(area_build, 4)
    hex_m["Floor_Area"] = np.round(floor_area, 4)
    hex_m["GSI"] = np.round(gsi, 4)
    hex_m["FSI"] = np.round(fsi, 4)
    # OSR: keep null as None in geojson
    osr_rounded = []
    for v in osr:
        if v is None or (isinstance(v, float) and math.isnan(v)):
            osr_rounded.append(None)
        else:
            osr_rounded.append(round(float(v), 4))
    hex_m["OSR"] = osr_rounded
    hex_m["FSI_Norm"] = np.round(fsi_norm, 4)
    hex_m["GSI_Norm"] = np.round(gsi_norm, 4)
    hex_m["Density_V"] = np.round(density_v, 4)
    hex_m["is_valid"] = valid_mask_arr

    keep_cols = [
        "id",
        "row_index",
        "col_index",
        "left",
        "right",
        "top",
        "bottom",
        "is_edge",
        "is_valid",
        "Hex_area",
        "Area_build",
        "Floor_Area",
        "GSI",
        "FSI",
        "OSR",
        "GSI_Norm",
        "FSI_Norm",
        "Density_V",
        "geometry",
    ]
    out_m = hex_m[keep_cols].copy()
    out_ll = out_m.to_crs(EXPORT_CRS)

    geojson = json.loads(out_ll.to_json())
    geojson["crs"] = {
        "type": "name",
        "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
    }
    for feat in geojson["features"]:
        props = feat["properties"]
        # Ensure JSON nulls for OSR
        if props.get("OSR") is not None and isinstance(props["OSR"], float) and math.isnan(props["OSR"]):
            props["OSR"] = None
        geom = feat["geometry"]
        if geom and geom["type"] == "Polygon":
            feat["geometry"] = {
                "type": "MultiPolygon",
                "coordinates": [geom["coordinates"]],
            }

    with OUT_GEOJSON.open("w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    # Summary on valid cells
    valid_rows = out_m[out_m["is_valid"]].copy()

    def series_stats(col: str) -> dict:
        vals = [float(v) for v in valid_rows[col].tolist() if v is not None and not (isinstance(v, float) and math.isnan(v))]
        if not vals:
            return {"min": None, "max": None, "mean": None, "median": None}
        return {
            "min": float(min(vals)),
            "max": float(max(vals)),
            "mean": float(sum(vals) / len(vals)),
            "median": median(vals),
        }

    edge_count = int(out_m["is_edge"].astype(bool).sum())
    valid_count = int(out_m["is_valid"].astype(bool).sum())
    summary = {
        "phase": 4,
        "output": str(OUT_GEOJSON).replace("\\", "/"),
        "analysis_crs": ANALYSIS_CRS,
        "export_crs": "CRS84 / EPSG:4326",
        "feature_count": int(len(out_m)),
        "edge_count": edge_count,
        "valid_count": valid_count,
        "interior_count": int(len(out_m) - edge_count),
        "norm_basis": {
            "FSI_max_valid": fsi_max,
            "GSI_max_valid": gsi_max,
            "valid_rule": "FSI>0 & GSI>0 & OSR>=0 & Hex_area>0 & is_edge==false",
        },
        "valid_cell_stats": {
            "FSI": series_stats("FSI"),
            "GSI": series_stats("GSI"),
            "OSR": series_stats("OSR"),
            "Density_V": series_stats("Density_V"),
        },
    }
    with OUT_SUMMARY.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Wrote {OUT_GEOJSON}")
    print(f"Wrote {OUT_SUMMARY}")
    print(
        f"hexes={len(out_m)} edge={edge_count} valid={valid_count} "
        f"FSI_max={fsi_max:.4f} GSI_max={gsi_max:.4f}"
    )


if __name__ == "__main__":
    main()
