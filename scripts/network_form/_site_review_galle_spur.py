#!/usr/bin/env python3
"""Apply site-review overlays after S0125 Galle snap (J0057 T, K0030 NOT_A_CUL)."""

from __future__ import annotations

import csv
import subprocess
from pathlib import Path

import fiona
import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
JUNCTIONS = ROOT / "network_form" / "marshall_matrix" / "data" / "processed" / "marshall_junctions.gpkg"
CELLS = ROOT / "network_form" / "marshall_matrix" / "data" / "processed" / "marshall_cells_culs.gpkg"
TABLE = ROOT / "network_form" / "marshall_matrix" / "results" / "tables"
JUNCTION_REVIEW = TABLE / "marshall_junction_review.csv"

SNAP_LON, SNAP_LAT = 79.86731183808924, 6.834073156930607

JUNCTION_PATCHES = {
    "J0057": ("T", 3),
    "J0044": ("T", 3),
    "J0092": ("T", 3),
    "J0116": ("T", 3),
}

CUL_PATCHES = {
    "K0030": "Site review: three-way T-junction (J0057)—S0125 connected to Galle; not a Marshall cul-de-sac",
    "K0017": "Site review: three-way T-junction (J0014)—not a Marshall cul-de-sac",
}


def restore_review_csv() -> None:
    subprocess.run(
        ["git", "checkout", "HEAD", "--", str(JUNCTION_REVIEW.relative_to(ROOT))],
        cwd=ROOT,
        check=True,
    )
    subprocess.run(
        ["git", "checkout", "HEAD", "--", "network_form/marshall_matrix/results/tables/marshall_cul_review.csv"],
        cwd=ROOT,
        check=True,
    )


def append_junction_review_rows() -> None:
    rows = list(csv.DictReader(JUNCTION_REVIEW.open(encoding="utf-8")))
    ids = {row["junction_id"] for row in rows}
    # J0058 in HEAD was wrongly labeled T for K0030 at mid-spur; restore algorithm class for map QA.
    for row in rows:
        if row["junction_id"] == "J0058":
            row["classification"] = "X"
            row["degree"] = "4"
            row["reason"] = "Marshall X at spur bend (Galle T is J0057 after S0125 snap)"
    new_row = {
        "junction_id": "J0057",
        "GN": "Mount Lavinia",
        "x": f"{SNAP_LON:.6f}",
        "y": f"{SNAP_LAT:.6f}",
        "classification": "T",
        "degree": "3",
        "reason": "Site review: S0125 spur connected to Galle Road—Marshall three-way (was false cul K0030)",
    }
    if "J0057" not in ids:
        rows.insert(7, new_row)
    cul_review_path = TABLE / "marshall_cul_review.csv"
    cul_rows = list(csv.DictReader(cul_review_path.open(encoding="utf-8")))
    for row in cul_rows:
        if row["cul_id"] == "K0030":
            row["reason"] = (
                "Site review: three-way T-junction (J0057)—S0125 connected to Galle; not a Marshall cul-de-sac"
            )
    with JUNCTION_REVIEW.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    with cul_review_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=cul_rows[0].keys())
        writer.writeheader()
        writer.writerows(cul_rows)


def patch_junctions_gpkg() -> None:
    junctions = gpd.read_file(JUNCTIONS, layer="junctions")
    for jid, (klass, degree) in JUNCTION_PATCHES.items():
        mask = junctions["junction_id"] == jid
        if not mask.any():
            raise RuntimeError(f"Missing junction {jid}")
        junctions.loc[mask, "classification"] = klass
        junctions.loc[mask, "degree"] = degree
    if JUNCTIONS.exists():
        JUNCTIONS.unlink()
    junctions.to_file(JUNCTIONS, layer="junctions", driver="GPKG", engine="pyogrio")


def patch_review_final_j0058() -> None:
    path = TABLE / "marshall_junction_review_final.csv"
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    row = {
        "node_id": "J0058",
        "GN": "Mount Lavinia",
        "previous_class": "X",
        "final_class": "ENDPOINT / NOT_JUNCTION",
        "reason": "Spur bend after S0125 snap—not a Marshall four-way; Galle T is J0057",
        "confidence": "high",
    }
    rows = [r for r in rows if r["node_id"] != "J0058"]
    rows.append(row)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    junctions = gpd.read_file(JUNCTIONS, layer="junctions")
    j58 = junctions[junctions["junction_id"] == "J0058"].iloc[0]
    reviewed = gpd.read_file(
        ROOT / "network_form/marshall_matrix/data/processed/marshall_junctions_reviewed.gpkg",
        layer="reviewed_junctions",
    )
    reviewed = reviewed[reviewed["node_id"] != "J0058"]
    reviewed = pd.concat(
        [
            reviewed,
            gpd.GeoDataFrame(
                [
                    {
                        "node_id": "J0058",
                        "GN": "Mount Lavinia",
                        "previous_class": "X",
                        "final_class": row["final_class"],
                        "reason": row["reason"],
                        "confidence": "high",
                        "geometry": j58.geometry,
                    }
                ],
                crs=reviewed.crs,
            ),
        ],
        ignore_index=True,
    )
    reviewed_path = ROOT / "network_form/marshall_matrix/data/processed/marshall_junctions_reviewed.gpkg"
    if reviewed_path.exists():
        reviewed_path.unlink()
    reviewed.to_file(reviewed_path, layer="reviewed_junctions", driver="GPKG", engine="pyogrio")


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

    candidates = culs.to_dict("records")
    fields = ["cul_id", "GN", "street_segment_id", "classification", "reason"]
    with (TABLE / "marshall_cul_candidates.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in candidates:
            writer.writerow({k: row[k] for k in fields})
    genuine = [row for row in candidates if row["classification"] == "GENUINE_CUL"]
    with (TABLE / "marshall_culs_final.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in genuine:
            writer.writerow({k: row[k] for k in fields})
    not_genuine = [row for row in candidates if row["classification"] != "GENUINE_CUL"]
    with (TABLE / "marshall_cul_review.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in not_genuine:
            writer.writerow({k: row[k] for k in fields})


def main() -> None:
    from _apply_marshall_ml_site_reviews import apply

    apply()
    print("site review applied (delegates to _apply_marshall_ml_site_reviews)")


if __name__ == "__main__":
    main()
