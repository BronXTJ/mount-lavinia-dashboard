#!/usr/bin/env python3
"""Phase 5: Shannon entropy, 5000m accessibility, Density_V diversity, UMI."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
HEX_PATH = PACKAGE_ROOT / "02_hex_grid" / "hex_grid_primary_100m.geojson"
DENSITY_PATH = PACKAGE_ROOT / "04_density" / "density_primary_hex.geojson"
LANDUSE_PATH = PACKAGE_ROOT / "06_context" / "landuse_primary.geojson"
CLOSE_PATH = PACKAGE_ROOT / "07_centrality" / "closeness_5000m.geojson"
BET_PATH = PACKAGE_ROOT / "07_centrality" / "betweenness_5000m.geojson"
OUT_DIR = PACKAGE_ROOT / "05_maturation"
OUT_GEOJSON = OUT_DIR / "maturation_primary_hex.geojson"
OUT_SUMMARY = OUT_DIR / "maturation_primary_summary.json"

ANALYSIS_CRS = "EPSG:3857"
EXPORT_CRS = "EPSG:4326"
EXPECTED_HEXES = 447


def classify_tier(umi: float) -> str:
    if umi > 0.35:
        return "high"
    if umi >= 0.15:
        return "medium"
    return "low"


def shannon_from_areas(areas_by_class: dict[str, float]) -> tuple[float, float, int]:
    total = sum(areas_by_class.values())
    classes = {k: v for k, v in areas_by_class.items() if v > 0 and total > 0}
    k = len(classes)
    if k < 2 or total <= 0:
        return 0.0, 0.0, k
    entropy = 0.0
    for a in classes.values():
        p = a / total
        entropy -= p * math.log(p)
    mixed = entropy / math.log(k)
    return float(entropy), float(mixed), k


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    hex_gdf = gpd.read_file(HEX_PATH)
    dens_gdf = gpd.read_file(DENSITY_PATH)
    lu_gdf = gpd.read_file(LANDUSE_PATH)
    close_gdf = gpd.read_file(CLOSE_PATH)
    bet_gdf = gpd.read_file(BET_PATH)

    for gdf in (hex_gdf, dens_gdf, lu_gdf, close_gdf, bet_gdf):
        if gdf.crs is None:
            gdf.set_crs("EPSG:4326", inplace=True)

    if len(hex_gdf) != EXPECTED_HEXES:
        raise SystemExit(f"Expected {EXPECTED_HEXES} hexes, got {len(hex_gdf)}")

    hex_m = hex_gdf.to_crs(ANALYSIS_CRS).copy().reset_index(drop=True)
    dens_m = dens_gdf.to_crs(ANALYSIS_CRS).copy()
    lu_m = lu_gdf.to_crs(ANALYSIS_CRS).copy()
    close_m = close_gdf.to_crs(ANALYSIS_CRS).copy()
    bet_m = bet_gdf.to_crs(ANALYSIS_CRS).copy()

    # Density_V and is_edge from density layer (join on id)
    dens_by_id = dens_m.set_index("id")
    hex_m["Density_V"] = hex_m["id"].map(dens_by_id["Density_V"]).astype(float).fillna(0.0)
    hex_m["is_edge"] = hex_m["id"].map(dens_by_id["is_edge"]).astype(bool)
    hex_m["_hex_idx"] = hex_m.index

    # --- Shannon via land-use overlay ---
    lu_m = lu_m[["Main_C", "geometry"]].copy()
    lu_m["Main_C"] = lu_m["Main_C"].fillna("Unknown").astype(str)
    lu_overlay = gpd.overlay(
        hex_m[["_hex_idx", "geometry"]],
        lu_m,
        how="intersection",
        keep_geom_type=False,
    )
    lu_overlay["inter_area"] = lu_overlay.geometry.area.astype(float)

    areas_map: dict[int, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for _, row in lu_overlay.iterrows():
        areas_map[int(row["_hex_idx"])][row["Main_C"]] += float(row["inter_area"])

    entropy_raw = np.zeros(len(hex_m), dtype=float)
    mixed_use = np.zeros(len(hex_m), dtype=float)
    n_classes = np.zeros(len(hex_m), dtype=int)
    for idx in range(len(hex_m)):
        e, m, k = shannon_from_areas(areas_map[idx])
        entropy_raw[idx] = e
        mixed_use[idx] = m
        n_classes[idx] = k

    # --- Accessibility: mean NQPDA / BtA per hex ---
    close_m = close_m[["NQPDA5000", "geometry"]].copy()
    close_m["NQPDA5000"] = pd.to_numeric(close_m["NQPDA5000"], errors="coerce")
    bet_m = bet_m[["BtA5000", "geometry"]].copy()
    bet_m["BtA5000"] = pd.to_numeric(bet_m["BtA5000"], errors="coerce")

    close_join = gpd.sjoin(
        close_m.dropna(subset=["NQPDA5000"]),
        hex_m[["_hex_idx", "geometry"]],
        how="inner",
        predicate="intersects",
    )
    bet_join = gpd.sjoin(
        bet_m.dropna(subset=["BtA5000"]),
        hex_m[["_hex_idx", "geometry"]],
        how="inner",
        predicate="intersects",
    )

    close_mean = close_join.groupby("_hex_idx")["NQPDA5000"].mean()
    bet_mean = bet_join.groupby("_hex_idx")["BtA5000"].mean()

    close_vals = hex_m["_hex_idx"].map(close_mean).fillna(0.0).to_numpy(dtype=float)
    bet_vals = hex_m["_hex_idx"].map(bet_mean).fillna(0.0).to_numpy(dtype=float)

    # Provisional accessibility for eligibility: need both means > 0 after we have norms.
    # First pass: cells with any centrality presence
    has_close = close_vals > 0
    has_bet = bet_vals > 0

    # Norm-eligible for max of close/bet: non-edge with entropy>0 and some centrality
    # We'll compute close_norm/bet_norm using max among cells that will be maturation-valid.
    # Chicken-egg: accessibility needs norms; eligibility needs accessibility>0.
    # Approach: max close/bet among non-edge cells that have entropy>0 and close>0 and bet>0.
    seed_eligible = (
        (~hex_m["is_edge"].to_numpy(dtype=bool))
        & (entropy_raw > 0)
        & has_close
        & has_bet
    )
    if not seed_eligible.any():
        raise SystemExit("No seed-eligible cells for accessibility norms.")

    close_max = float(np.max(close_vals[seed_eligible]))
    bet_max = float(np.max(bet_vals[seed_eligible]))
    if close_max <= 0 or bet_max <= 0:
        raise SystemExit("Invalid closeness/betweenness max for normalization.")

    close_norm = np.where(close_max > 0, close_vals / close_max, 0.0)
    bet_norm = np.where(bet_max > 0, bet_vals / bet_max, 0.0)
    accessibility = 0.5 * (close_norm + bet_norm)

    # Entropy norm among cells that are norm-eligible after accessibility
    norm_eligible = (
        (~hex_m["is_edge"].to_numpy(dtype=bool))
        & (entropy_raw > 0)
        & (accessibility > 0)
    )
    if not norm_eligible.any():
        raise SystemExit("No norm-eligible maturation cells.")

    entropy_max = float(np.max(entropy_raw[norm_eligible]))
    if entropy_max <= 0:
        raise SystemExit("Invalid entropy max for normalization.")
    entropy_norm = np.where(entropy_max > 0, entropy_raw / entropy_max, 0.0)

    landuse_div = hex_m["Density_V"].to_numpy(dtype=float)
    umi = (entropy_norm + accessibility + landuse_div) / 3.0

    is_valid = norm_eligible
    tiers = [classify_tier(float(u)) for u in umi]

    # Build output frame
    out = hex_m[
        [
            "id",
            "row_index",
            "col_index",
            "left",
            "right",
            "top",
            "bottom",
            "Hex_area",
            "is_edge",
            "geometry",
        ]
    ].copy()

    def r4(arr):
        return np.round(arr.astype(float), 4)

    out["area"] = out["Hex_area"].round(0).astype(int)
    out["entropy_raw"] = r4(entropy_raw)
    out["shannon_entropy"] = r4(entropy_raw)
    out["mixed_use"] = r4(mixed_use)
    out["n_landuse_classes"] = n_classes
    out["entropy_norm"] = r4(entropy_norm)
    out["close_mean"] = r4(close_vals)
    out["bet_mean"] = r4(bet_vals)
    out["accessibility"] = r4(accessibility)
    out["landuse_div"] = r4(landuse_div)
    out["umi"] = r4(umi)
    out["tier"] = tiers
    out["is_valid_maturation"] = is_valid

    # Dashboard aliases (QGIS-truncated names)
    out["1entropy_i"] = out["entropy_raw"]
    out["1normalize"] = out["entropy_norm"]
    out["1average_c"] = out["accessibility"]
    out["1normali_1"] = out["accessibility"]
    out["1landuse_d"] = out["landuse_div"]
    out["1normali_2"] = out["landuse_div"]
    out["1urban mat"] = out["umi"]
    out[" final_ent"] = out["shannon_entropy"]
    out[" final_mui"] = out["mixed_use"]

    out_ll = out.to_crs(EXPORT_CRS)
    geojson = json.loads(out_ll.to_json())
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

    valid_umi = umi[is_valid]
    valid_ent = entropy_raw[is_valid]
    valid_acc = accessibility[is_valid]
    tier_counts = {
        "high": int(sum(1 for t in tiers if t == "high")),
        "medium": int(sum(1 for t in tiers if t == "medium")),
        "low": int(sum(1 for t in tiers if t == "low")),
    }
    valid_tier_counts = {"high": 0, "medium": 0, "low": 0}
    for flag, t in zip(is_valid, tiers):
        if flag:
            valid_tier_counts[t] += 1

    def stats(arr: np.ndarray) -> dict:
        if len(arr) == 0:
            return {"min": None, "max": None, "mean": None}
        return {
            "min": float(np.min(arr)),
            "max": float(np.max(arr)),
            "mean": float(np.mean(arr)),
        }

    summary = {
        "phase": 5,
        "output": str(OUT_GEOJSON).replace("\\", "/"),
        "analysis_crs": ANALYSIS_CRS,
        "export_crs": "CRS84 / EPSG:4326",
        "feature_count": int(len(out)),
        "edge_count": int(hex_m["is_edge"].sum()),
        "valid_maturation_count": int(is_valid.sum()),
        "norm_basis": {
            "entropy_max_valid": entropy_max,
            "close_max_seed": close_max,
            "bet_max_seed": bet_max,
            "rule": "is_edge==false & entropy_raw>0 & accessibility>0",
        },
        "valid_cell_stats": {
            "entropy_raw": stats(valid_ent),
            "accessibility": stats(valid_acc),
            "umi": stats(valid_umi),
            "landuse_div": stats(landuse_div[is_valid]),
            "entropy_norm": stats(entropy_norm[is_valid]),
        },
        "tier_counts_all": tier_counts,
        "tier_counts_valid": valid_tier_counts,
    }
    with OUT_SUMMARY.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Wrote {OUT_GEOJSON}")
    print(f"Wrote {OUT_SUMMARY}")
    print(
        f"hexes={len(out)} valid={int(is_valid.sum())} "
        f"tiers_valid={valid_tier_counts} umi_mean={float(np.mean(valid_umi)):.4f}"
    )


if __name__ == "__main__":
    main()
