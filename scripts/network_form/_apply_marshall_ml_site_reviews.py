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
# Galle Road coast strip — clip boundary endpoints reclassified as Marshall T (site GPS)
J0005_LON, J0005_LAT = 79.865045, 6.830105
J0012_LON, J0012_LAT = 79.866089, 6.830294
J0034_LON, J0034_LAT = 79.867472, 6.831598
# Kawdana West × Watarappala boundary — Marshall four-way at site GPS (nearest X: J0600 / J0612)
J0600_LON, J0600_LAT = 79.869572, 6.842433
J0612_LON, J0612_LAT = 79.870501, 6.842867
# Kawdana West residential grid — Marshall three-way at site GPS (was degree-1 endpoint)
J0270_LON, J0270_LAT = 79.868757, 6.842374
J0274_LON, J0274_LAT = 79.868910, 6.842398
J0305_LON, J0305_LAT = 79.871022, 6.843205
J0375_LON, J0375_LAT = 79.872264, 6.845317
J0298_LON, J0298_LAT = 79.875760, 6.842932
J0384_LON, J0384_LAT = 79.871403, 6.845974
J0383_LON, J0383_LAT = 79.871747, 6.845635
J0317_LON, J0317_LAT = 79.875688, 6.843672
J0309_LON, J0309_LAT = 79.875592, 6.843331
J0272_LON, J0272_LAT = 79.876012, 6.842247

JUNCTION_PATCHES: dict[str, tuple[str, int]] = {
    "J0057": ("T", 3),
    "J0044": ("T", 3),
    "J0092": ("T", 3),
    "J0116": ("T", 3),
    "J0984": ("T", 3),
    "J0005": ("T", 3),
    "J0012": ("T", 3),
    "J0034": ("X", 4),
    "J0600": ("X", 4),
    "J0612": ("X", 4),
    "J0270": ("T", 3),
    "J0274": ("T", 3),
    "J0305": ("T", 3),
    "J0375": ("T", 3),
    "J0298": ("T", 3),
    "J0384": ("T", 3),
    "J0383": ("T", 3),
    "J0317": ("T", 3),
    "J0309": ("T", 3),
    "J0272": ("T", 3),
}

JUNCTION_GEOM: dict[str, tuple[float, float]] = {
    "J0116": (J0116_LON, J0116_LAT),
    "J0057": (J0057_LON, J0057_LAT),
    "J0984": (J0984_LON, J0984_LAT),
    "J0005": (J0005_LON, J0005_LAT),
    "J0012": (J0012_LON, J0012_LAT),
    "J0034": (J0034_LON, J0034_LAT),
    "J0600": (J0600_LON, J0600_LAT),
    "J0612": (J0612_LON, J0612_LAT),
    "J0270": (J0270_LON, J0270_LAT),
    "J0274": (J0274_LON, J0274_LAT),
    "J0305": (J0305_LON, J0305_LAT),
    "J0375": (J0375_LON, J0375_LAT),
    "J0298": (J0298_LON, J0298_LAT),
    "J0384": (J0384_LON, J0384_LAT),
    "J0383": (J0383_LON, J0383_LAT),
    "J0317": (J0317_LON, J0317_LAT),
    "J0309": (J0309_LON, J0309_LAT),
    "J0272": (J0272_LON, J0272_LAT),
}

# Clip polygon had Wedikanda; college × Galle is Mount Lavinia for map scope and ratios.
JUNCTION_GN: dict[str, str] = {
    "J0984": "Mount Lavinia",
    "J0600": "Kawdana West",
    "J0612": "Kawdana West",
}

CUL_PATCHES = {
    "K0030": "Site review: three-way T-junction (J0057)—S0125 connected to Galle; not a Marshall cul-de-sac",
    "K0017": "Site review: three-way T-junction (J0014)—not a Marshall cul-de-sac",
    "K0005": "Site review: three-way T-junction (J0005)—Galle Road access; not a GN boundary artefact",
    "K0012": "Site review: three-way T-junction (J0012)—Galle Road access; not a GN boundary artefact",
    "K0172": "Site review: three-way T-junction (J0383)—not a Marshall cul-de-sac",
    "K0143": "Site review: three-way T-junction (J0317)—not a Marshall cul-de-sac",
    "K0137": "Site review: three-way T-junction (J0309)—not a Marshall cul-de-sac",
    "K0112": "Site review: three-way T-junction (J0272)—not a Marshall cul-de-sac",
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
    by_id["J0005"] = {
        "junction_id": "J0005",
        "GN": "Mount Lavinia",
        "x": f"{J0005_LON:.6f}",
        "y": f"{J0005_LAT:.6f}",
        "classification": "T",
        "degree": "3",
        "reason": "Site review: Galle Road three-way (was clip boundary endpoint B0024)",
    }
    by_id["J0012"] = {
        "junction_id": "J0012",
        "GN": "Mount Lavinia",
        "x": f"{J0012_LON:.6f}",
        "y": f"{J0012_LAT:.6f}",
        "classification": "T",
        "degree": "3",
        "reason": "Site review: Galle Road three-way (was clip boundary endpoint on S0114)",
    }
    by_id["J0034"] = {
        "junction_id": "J0034",
        "GN": "Mount Lavinia",
        "x": f"{J0034_LON:.6f}",
        "y": f"{J0034_LAT:.6f}",
        "classification": "X",
        "degree": "4",
        "reason": "Site review: Marshall four-way at field GPS (C0068 Galle crossing; repositioned from prior pin)",
    }
    by_id["J0600"] = {
        "junction_id": "J0600",
        "GN": "Kawdana West",
        "x": f"{J0600_LON:.6f}",
        "y": f"{J0600_LAT:.6f}",
        "classification": "X",
        "degree": "4",
        "reason": "Site review: Marshall four-way at GN boundary (nearest node to site GPS point A)",
    }
    by_id["J0612"] = {
        "junction_id": "J0612",
        "GN": "Kawdana West",
        "x": f"{J0612_LON:.6f}",
        "y": f"{J0612_LAT:.6f}",
        "classification": "X",
        "degree": "4",
        "reason": "Site review: Marshall four-way at GN boundary (nearest node to site GPS point B)",
    }
    for jid, lon, lat in [
        ("J0270", J0270_LON, J0270_LAT),
        ("J0274", J0274_LON, J0274_LAT),
        ("J0305", J0305_LON, J0305_LAT),
        ("J0375", J0375_LON, J0375_LAT),
        ("J0298", J0298_LON, J0298_LAT),
        ("J0384", J0384_LON, J0384_LAT),
        ("J0383", J0383_LON, J0383_LAT),
        ("J0317", J0317_LON, J0317_LAT),
        ("J0309", J0309_LON, J0309_LAT),
        ("J0272", J0272_LON, J0272_LAT),
    ]:
        cul_note = {
            "J0383": "was false cul K0172",
            "J0317": "was false cul K0143",
            "J0309": "was false cul K0137",
            "J0272": "was false cul K0112",
        }.get(jid, "was misclassified degree-1 endpoint")
        by_id[jid] = {
            "junction_id": jid,
            "GN": "Kawdana West",
            "x": f"{lon:.6f}",
            "y": f"{lat:.6f}",
            "classification": "T",
            "degree": "3",
            "reason": f"Site review: Marshall three-way at site GPS ({cul_note})",
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
    junctions = gpd.read_file(JUNCTIONS, layer="junctions").reset_index(drop=True)
    for jid, (klass, degree) in JUNCTION_PATCHES.items():
        idx = junctions.index[junctions["junction_id"] == jid]
        if idx.empty:
            raise RuntimeError(f"Missing junction {jid}")
        junctions.loc[idx, "classification"] = klass
        junctions.loc[idx, "degree"] = degree
    for jid, (lon, lat) in JUNCTION_GEOM.items():
        idx = junctions.index[junctions["junction_id"] == jid]
        if not idx.empty:
            junctions.loc[idx, "geometry"] = Point(lon, lat)
    for jid, gn in JUNCTION_GN.items():
        idx = junctions.index[junctions["junction_id"] == jid]
        if not idx.empty:
            junctions.loc[idx, "GN"] = gn
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
