#!/usr/bin/env python3
"""Idempotent Mount Lavinia Marshall site-review overlays (junctions, culs, review CSVs).

Site review adjusts classification, review tables, and published junction icon positions only.
Do not edit street segment geometry; ground linework stays in roads_marshall_ready / roads_streets.

After apply, run Marshall publish 11–14 then 15_sync_network_form_overview_from_marshall.py
so Network Form Overview map and metrics_by_scope stay aligned with Marshall Morphology.
"""

from __future__ import annotations

import csv
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

ROOT = Path(__file__).resolve().parents[2]
JUNCTIONS = ROOT / "network_form/marshall_matrix/data/processed/marshall_junctions.gpkg"
REVIEWED = ROOT / "network_form/marshall_matrix/data/processed/marshall_junctions_reviewed.gpkg"
CELLS = ROOT / "network_form/marshall_matrix/data/processed/marshall_cells_culs.gpkg"
TABLE = ROOT / "network_form/marshall_matrix/results/tables"
JUNCTION_REVIEW = TABLE / "marshall_junction_review.csv"
REVIEW_FINAL = TABLE / "marshall_junction_review_final.csv"

J0116_LON, J0116_LAT = 79.866938, 6.841286
# Must match S0125∩S0081 after scripts/network_form/_site_connect_s0125_galle.py
J0057_LON, J0057_LAT = 79.86731174291111, 6.834063961259677
J0984_LON, J0984_LAT = 79.867655, 6.830827

JUNCTION_PATCHES: dict[str, tuple[str, int]] = {
    "J0057": ("T", 3),
    "J0044": ("T", 3),
    "J0092": ("T", 3),
    "J0116": ("T", 3),
    "J0984": ("T", 3),
}

JUNCTION_GEOM: dict[str, tuple[float, float]] = {
    "J0116": (J0116_LON, J0116_LAT),
    "J0057": (J0057_LON, J0057_LAT),
    "J0984": (J0984_LON, J0984_LAT),
}

# Clip polygon had Wedikanda; college × Galle is Mount Lavinia for map scope and ratios.
JUNCTION_GN: dict[str, str] = {
    "J0984": "Mount Lavinia",
}

CUL_PATCHES = {
    "K0030": "Site review: three-way T-junction (J0057)—S0125 connected to Galle; not a Marshall cul-de-sac",
    "K0017": "Site review: three-way T-junction (J0014)—not a Marshall cul-de-sac",
}


def upsert_junction_review_rows() -> None:
    rows = list(csv.DictReader(JUNCTION_REVIEW.open(encoding="utf-8")))
    fieldnames = rows[0].keys() if rows else [
        "junction_id",
        "GN",
        "x",
        "y",
        "classification",
        "degree",
        "reason",
    ]
    by_id = {row["junction_id"]: row for row in rows}

    by_id["J0116"] = {
        "junction_id": "J0116",
        "GN": "Mount Lavinia",
        "x": f"{J0116_LON:.6f}",
        "y": f"{J0116_LAT:.6f}",
        "classification": "T",
        "degree": "3",
        "reason": "Site review: reclassified from misidentified four-way to Marshall T-junction (Hotel × Galle)",
    }
    by_id["J0117"] = {
        "junction_id": "J0117",
        "GN": "Mount Lavinia",
        "x": "79.867040",
        "y": "6.841309",
        "classification": "ENDPOINT",
        "degree": "0",
        "reason": "Site review: not a Marshall four-way crossing—no map icon",
    }
    by_id["J0057"] = {
        "junction_id": "J0057",
        "GN": "Mount Lavinia",
        "x": f"{J0057_LON:.6f}",
        "y": f"{J0057_LAT:.6f}",
        "classification": "T",
        "degree": "3",
        "reason": "Site review: S0125 spur connected to Galle Road—Marshall three-way (was false cul K0030)",
    }
    if "J0058" in by_id:
        by_id["J0058"]["classification"] = "X"
        by_id["J0058"]["degree"] = "4"
        by_id["J0058"]["reason"] = "Marshall X at spur bend (Galle T is J0057 after S0125 snap)"
    by_id["J0984"] = {
        "junction_id": "J0984",
        "GN": "Mount Lavinia",
        "x": f"{J0984_LON:.6f}",
        "y": f"{J0984_LAT:.6f}",
        "classification": "T",
        "degree": "3",
        "reason": "Site review: British College access × Galle Road (S0079)—Marshall three-way",
    }

    out = list(by_id.values())
    out.sort(key=lambda r: r["junction_id"])
    with JUNCTION_REVIEW.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(out)


def ensure_review_final_j0117_j0058() -> None:
    rows = list(csv.DictReader(REVIEW_FINAL.open(encoding="utf-8")))
    fieldnames = rows[0].keys()
    by_id = {row["node_id"]: row for row in rows}

    by_id["J0117"] = {
        "node_id": "J0117",
        "GN": "Mount Lavinia",
        "previous_class": "X",
        "final_class": "ENDPOINT / NOT_JUNCTION",
        "reason": "Site review: not a Marshall four-way crossing—remove from X counts",
        "confidence": "high",
    }
    by_id["J0058"] = {
        "node_id": "J0058",
        "GN": "Mount Lavinia",
        "previous_class": "X",
        "final_class": "ENDPOINT / NOT_JUNCTION",
        "reason": "Spur bend after S0125 snap—not a Marshall four-way; Galle T is J0057",
        "confidence": "high",
    }

    with REVIEW_FINAL.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(by_id.values())

    junctions = gpd.read_file(JUNCTIONS, layer="junctions")
    reviewed = gpd.read_file(REVIEWED, layer="reviewed_junctions")
    for node_id, meta in [
        ("J0058", by_id["J0058"]),
        ("J0117", by_id["J0117"]),
    ]:
        jrow = junctions[junctions["junction_id"] == node_id]
        if jrow.empty:
            continue
        geom = jrow.iloc[0].geometry
        reviewed = reviewed[reviewed["node_id"] != node_id]
        reviewed = pd.concat(
            [
                reviewed,
                gpd.GeoDataFrame(
                    [
                        {
                            "node_id": node_id,
                            "GN": "Mount Lavinia",
                            "previous_class": meta["previous_class"],
                            "final_class": meta["final_class"],
                            "reason": meta["reason"],
                            "confidence": "high",
                            "geometry": geom,
                        }
                    ],
                    crs=reviewed.crs,
                ),
            ],
            ignore_index=True,
        )
    if REVIEWED.exists():
        REVIEWED.unlink()
    reviewed.to_file(REVIEWED, layer="reviewed_junctions", driver="GPKG", engine="pyogrio")


def patch_junctions_gpkg() -> None:
    junctions = gpd.read_file(JUNCTIONS, layer="junctions")
    for jid, (klass, degree) in JUNCTION_PATCHES.items():
        mask = junctions["junction_id"] == jid
        if not mask.any():
            raise RuntimeError(f"Missing junction {jid}")
        junctions.loc[mask, "classification"] = klass
        junctions.loc[mask, "degree"] = degree
    for jid, (lon, lat) in JUNCTION_GEOM.items():
        mask = junctions["junction_id"] == jid
        if mask.any():
            junctions.loc[mask, "geometry"] = Point(lon, lat)
    for jid, gn in JUNCTION_GN.items():
        mask = junctions["junction_id"] == jid
        if mask.any():
            junctions.loc[mask, "GN"] = gn
    if JUNCTIONS.exists():
        JUNCTIONS.unlink()
    junctions.to_file(JUNCTIONS, layer="junctions", driver="GPKG", engine="pyogrio")


def patch_culs_gpkg_and_csv() -> None:
    culs = gpd.read_file(CELLS, layer="cul_candidates")
    for cul_id, reason in CUL_PATCHES.items():
        mask = culs["cul_id"] == cul_id
        if not mask.any():
            raise RuntimeError(f"{cul_id} missing from cul_candidates")
        culs.loc[mask, "classification"] = "NOT_A_CUL"
        culs.loc[mask, "reason"] = reason
    cells = gpd.read_file(CELLS, layer="cell_candidates")
    if CELLS.exists():
        CELLS.unlink()
    cells.to_file(CELLS, layer="cell_candidates", driver="GPKG", engine="pyogrio")
    culs.to_file(CELLS, layer="cul_candidates", driver="GPKG", mode="a", engine="pyogrio")

    fields = ["cul_id", "GN", "street_segment_id", "classification", "reason"]
    candidates = [{k: row[k] for k in fields} for row in culs.to_dict("records")]
    for path, rows in [
        (TABLE / "marshall_cul_candidates.csv", candidates),
        (TABLE / "marshall_culs_final.csv", [r for r in candidates if r["classification"] == "GENUINE_CUL"]),
        (TABLE / "marshall_cul_review.csv", [r for r in candidates if r["classification"] != "GENUINE_CUL"]),
    ]:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)


def apply() -> None:
    upsert_junction_review_rows()
    patch_junctions_gpkg()
    patch_culs_gpkg_and_csv()
    ensure_review_final_j0117_j0058()


def main() -> None:
    apply()
    print("marshall ML site reviews applied")


if __name__ == "__main__":
    main()
