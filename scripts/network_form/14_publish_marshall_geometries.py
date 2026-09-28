#!/usr/bin/env python3
"""Publish validated Marshall junctions, cells, and cul-de-sacs for the dashboard map.

Uses the same inclusion rule as the ratio table. Does not reclassify features.
"""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import Point

ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = ROOT / "network_form" / "marshall_matrix"
JUNCTIONS = OUT_ROOT / "data" / "processed" / "marshall_junctions.gpkg"
REVIEWED = OUT_ROOT / "data" / "processed" / "marshall_junctions_reviewed.gpkg"
CELLS_GPKG = OUT_ROOT / "data" / "processed" / "marshall_cells_culs.gpkg"
REVIEW_CSV = OUT_ROOT / "results" / "tables" / "marshall_junction_review_final.csv"
PUBLIC = ROOT / "public" / "data" / "network-form" / "marshall"
MANIFESTS = [
    ROOT / "src" / "data" / "assetManifest.json",
    ROOT / "public" / "data" / "manifest.json",
]
GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]
EXPECTED_TX = {
    "Mount Lavinia": (113, 8),
    "Kawdana West": (68, 3),
    "Watarappala": (75, 8),
    "Wathumulla": (55, 4),
    "Wedikanda": (73, 7),
}
EXPECTED_STRUCTURE = {
    "Mount Lavinia": (21, 63),
    "Kawdana West": (5, 58),
    "Watarappala": (8, 44),
    "Wathumulla": (10, 38),
    "Wedikanda": (7, 54),
}


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def drop_ids() -> set[str]:
    review_rows = read_csv(REVIEW_CSV)
    reviewed = gpd.read_file(REVIEWED, layer="reviewed_junctions")
    reviewed_class = {row.node_id: row.final_class for row in reviewed.itertuples(index=False)}
    for row in review_rows:
        if reviewed_class.get(row["node_id"]) != row["final_class"]:
            raise RuntimeError(f"{row['node_id']} review CSV and reviewed gpkg disagree")
    return {
        row["node_id"]
        for row in review_rows
        if row["previous_class"] in {"T", "X"} and row["final_class"] not in {"CONFIRMED_T", "CONFIRMED_X"}
    }


def assert_counts(found: dict[str, tuple[int, int]], expected: dict[str, tuple[int, int]], label: str) -> None:
    if found != expected:
        raise RuntimeError(f"{label} counts {found} do not match {expected}")
    total = tuple(sum(pair[i] for pair in found.values()) for i in (0, 1))
    if label == "junction" and total != (384, 30):
        raise RuntimeError(f"Study-area junctions {total} are not 384 and 30")
    if label == "structure" and total != (51, 257):
        raise RuntimeError(f"Study-area structure {total} is not 51 cells and 257 cul-de-sacs")


def dead_end_points(lines: gpd.GeoDataFrame, junctions: gpd.GeoDataFrame) -> gpd.GeoSeries:
    """The cul-de-sac tip is the line end farther from the nearest T or X junction."""
    junction_pts = gpd.GeoSeries(junctions.to_crs(3857).geometry, crs=3857)
    tips = []
    for geom in lines.to_crs(3857).geometry:
        if geom is None or geom.geom_type != "LineString" or len(geom.coords) < 2:
            raise RuntimeError("A genuine cul-de-sac is missing its street line")
        ends = [Point(geom.coords[0]), Point(geom.coords[-1])]
        distances = [float(junction_pts.distance(end).min()) for end in ends]
        tips.append(ends[0] if distances[0] >= distances[1] else ends[1])
    return gpd.GeoSeries(tips, index=lines.index, crs=3857).to_crs(4326)


def write_geojson(frame: gpd.GeoDataFrame, path: Path) -> None:
    payload = json.loads(frame.to_crs(4326).to_json())
    path.write_text(json.dumps(payload), encoding="utf-8")


def refresh_hash(relative: str, path: Path) -> None:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    for manifest_path in MANIFESTS:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        files = manifest.setdefault("files", {})
        files[relative] = digest
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    removed = drop_ids()
    junctions = gpd.read_file(JUNCTIONS, layer="junctions")
    kept = junctions[junctions["classification"].isin(["T", "X"]) & ~junctions["junction_id"].isin(removed)].copy()
    kept["jtype"] = kept["classification"].map({"T": "three_way", "X": "four_way"})
    kept["gn_name"] = kept["GN"]
    kept["node_id"] = kept["junction_id"]
    assert_counts(
        {
            name: (
                int(((kept["GN"] == name) & (kept["classification"] == "T")).sum()),
                int(((kept["GN"] == name) & (kept["classification"] == "X")).sum()),
            )
            for name in GN_NAMES
        },
        EXPECTED_TX,
        "junction",
    )

    cells = gpd.read_file(CELLS_GPKG, layer="cell_candidates")
    cells = cells[cells["classification"] == "GENUINE_CELL"].copy()
    metric = cells.to_crs(3857)
    centroids = gpd.GeoSeries(metric.geometry.centroid, crs=3857).to_crs(4326)
    cells["gn_name"] = cells["GN"]
    cells["area_m2"] = metric.geometry.area.round(1)
    cells["centroid_lon"] = centroids.x
    cells["centroid_lat"] = centroids.y
    cells = cells[["cell_id", "gn_name", "area_m2", "centroid_lon", "centroid_lat", "geometry"]]

    culs = gpd.read_file(CELLS_GPKG, layer="cul_candidates")
    culs = culs[culs["classification"] == "GENUINE_CUL"].copy()
    culs["jtype"] = "culdesac"
    culs["gn_name"] = culs["GN"]
    culs["node_id"] = culs["cul_id"]
    culs = culs.set_geometry(dead_end_points(culs, kept))
    culs = culs[["node_id", "jtype", "gn_name", "geometry"]]

    structure = {
        name: (
            int((cells["gn_name"] == name).sum()),
            int((culs["gn_name"] == name).sum()),
        )
        for name in GN_NAMES
    }
    assert_counts(structure, EXPECTED_STRUCTURE, "structure")

    PUBLIC.mkdir(parents=True, exist_ok=True)
    junction_path = PUBLIC / "junctions_marshall.geojson"
    cul_path = PUBLIC / "culdesacs_marshall.geojson"
    cell_path = PUBLIC / "cells_marshall.geojson"
    write_geojson(kept[["node_id", "jtype", "gn_name", "geometry"]], junction_path)
    write_geojson(culs, cul_path)
    write_geojson(cells, cell_path)
    for relative, path in (
        ("network-form/marshall/junctions_marshall.geojson", junction_path),
        ("network-form/marshall/culdesacs_marshall.geojson", cul_path),
        ("network-form/marshall/cells_marshall.geojson", cell_path),
    ):
        refresh_hash(relative, path)
    print(
        f"Wrote {len(kept)} junctions, {len(cells)} cells, {len(culs)} cul-de-sacs"
    )


if __name__ == "__main__":
    main()
