#!/usr/bin/env python3
"""One-off site review: snap S0125 spur to Galle Road (S0081) at ~6.834073, 79.867327."""

from __future__ import annotations

import csv
import json
from pathlib import Path

import fiona
import geopandas as gpd
from shapely.geometry import LineString, Point
from shapely.ops import nearest_points

ROOT = Path(__file__).resolve().parents[2]
GPKG = ROOT / "network_form" / "marshall_matrix" / "data" / "processed" / "roads_marshall_ready.gpkg"
STREETS_GEOJSON = ROOT / "public" / "data" / "network-form" / "roads_streets.geojson"
GEOM_LOG = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "geometry_changes.csv"
TARGET = Point(79.867327, 6.834073)
SNAP_TOL_DEG = 1e-8


def insert_point_on_line(line: LineString, pt: Point) -> LineString:
    coords = list(line.coords)
    best_i = 0
    best_d = float("inf")
    for i in range(len(coords) - 1):
        seg = LineString([coords[i], coords[i + 1]])
        d = seg.distance(pt)
        if d < best_d:
            best_d = d
            best_i = i
    p = nearest_points(pt, LineString([coords[best_i], coords[best_i + 1]]))[1]
    new_pt = (p.x, p.y)
    for existing in coords:
        if abs(existing[0] - new_pt[0]) < SNAP_TOL_DEG and abs(existing[1] - new_pt[1]) < SNAP_TOL_DEG:
            return line
    inserted = coords[: best_i + 1] + [new_pt] + coords[best_i + 1 :]
    return LineString(inserted)


def main() -> None:
    streets = gpd.read_file(GPKG, layer="streets")
    s0125_idx = streets.index[streets["segment_id"] == "S0125"][0]
    s0081_idx = streets.index[streets["segment_id"] == "S0081"][0]
    spur = streets.at[s0125_idx, "geometry"]
    galle = streets.at[s0081_idx, "geometry"]
    snap_pt = nearest_points(TARGET, galle)[1]
    old_tip = spur.coords[0]
    spur_coords = list(spur.coords)
    spur_coords[0] = (snap_pt.x, snap_pt.y)
    new_spur = LineString(spur_coords)
    new_galle = insert_point_on_line(galle, snap_pt)

    streets.at[s0125_idx, "geometry"] = new_spur
    streets.at[s0081_idx, "geometry"] = new_galle

    layer_names = fiona.listlayers(GPKG)
    layers = {name: gpd.read_file(GPKG, layer=name) for name in layer_names}
    layers["streets"] = streets
    first = True
    for name, data in layers.items():
        data.to_file(
            GPKG,
            layer=name,
            driver="GPKG",
            mode="w" if first else "a",
            engine="pyogrio",
        )
        first = False

    with GEOM_LOG.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "S0125",
                "site_review",
                "move_endpoint",
                f"Galle spur tip {old_tip[0]:.8f},{old_tip[1]:.8f} -> {snap_pt.x:.8f},{snap_pt.y:.8f} (T on Galle S0081)",
            ]
        )
        writer.writerow(
            [
                "S0081",
                "site_review",
                "insert_vertex",
                f"node spur connection at {snap_pt.x:.8f},{snap_pt.y:.8f}",
            ]
        )

    roads = json.loads(STREETS_GEOJSON.read_text(encoding="utf-8"))
    updated = 0
    for feat in roads["features"]:
        coords = feat["geometry"]["coordinates"]
        if len(coords) == 4 and abs(coords[0][0] - 79.86728209999998) < 1e-6:
            feat["geometry"]["coordinates"][0] = [snap_pt.x, snap_pt.y]
            updated += 1
    if updated != 1:
        raise RuntimeError(f"Expected 1 roads_streets spur feature, updated {updated}")
    STREETS_GEOJSON.write_text(json.dumps(roads), encoding="utf-8")
    print("snap", snap_pt.x, snap_pt.y)
    print("done")


if __name__ == "__main__":
    main()
