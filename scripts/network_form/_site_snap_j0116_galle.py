#!/usr/bin/env python3
"""Site review: snap Galle S0086/S0087 to J0116 T at Hotel Road × Galle."""

from __future__ import annotations

import csv
import json
from pathlib import Path

import fiona
import geopandas as gpd
from shapely.geometry import LineString, Point

ROOT = Path(__file__).resolve().parents[2]
GPKG = ROOT / "network_form" / "marshall_matrix" / "data" / "processed" / "roads_marshall_ready.gpkg"
STREETS_GEOJSON = ROOT / "public" / "data" / "network-form" / "roads_streets.geojson"
GEOM_LOG = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "geometry_changes.csv"
SNAP_LON, SNAP_LAT = 79.866938, 6.841286
OLD_J0117 = (79.8670400000447, 6.84130859986636)


def write_streets_gpkg(streets: gpd.GeoDataFrame) -> None:
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


def move_endpoint(coords: list, index: int, new_pt: tuple[float, float]) -> list:
    out = list(coords)
    out[index] = new_pt
    return out


def update_geojson_vertex(
    roads: dict,
    old_pt: tuple[float, float],
    new_pt: tuple[float, float],
    tol: float = 1e-5,
) -> int:
    updated = 0
    for feat in roads["features"]:
        coords = feat["geometry"]["coordinates"]
        for i, c in enumerate(coords):
            if abs(c[0] - old_pt[0]) < tol and abs(c[1] - old_pt[1]) < tol:
                coords[i] = [new_pt[0], new_pt[1]]
                updated += 1
    return updated


def main() -> None:
    snap = (SNAP_LON, SNAP_LAT)
    streets = gpd.read_file(GPKG, layer="streets")

    s86_idx = streets.index[streets["segment_id"] == "S0086"][0]
    s87_idx = streets.index[streets["segment_id"] == "S0087"][0]
    g86 = streets.at[s86_idx, "geometry"]
    g87 = streets.at[s87_idx, "geometry"]
    old86 = g86.coords[-1]
    old87 = g87.coords[0]

    streets.at[s86_idx, "geometry"] = LineString(move_endpoint(list(g86.coords), -1, snap))
    streets.at[s87_idx, "geometry"] = LineString(move_endpoint(list(g87.coords), 0, snap))
    write_streets_gpkg(streets)

    with GEOM_LOG.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "S0086",
                "site_review",
                "move_endpoint",
                f"Galle end {old86[0]:.8f},{old86[1]:.8f} -> {snap[0]:.8f},{snap[1]:.8f} (J0116 T)",
            ]
        )
        writer.writerow(
            [
                "S0087",
                "site_review",
                "move_endpoint",
                f"segment start {old87[0]:.8f},{old87[1]:.8f} -> {snap[0]:.8f},{snap[1]:.8f} (J0116 T)",
            ]
        )

    roads = json.loads(STREETS_GEOJSON.read_text(encoding="utf-8"))
    n = update_geojson_vertex(roads, OLD_J0117, snap)
    n += update_geojson_vertex(roads, (79.86703999999999, 6.8413086), snap, tol=1e-8)
    if n < 1:
        raise RuntimeError(f"roads_streets.geojson: expected >=1 vertex move at J0117, got {n}")
    STREETS_GEOJSON.write_text(json.dumps(roads), encoding="utf-8")
    print("snap", SNAP_LON, SNAP_LAT, "geojson_moves", n)


if __name__ == "__main__":
    main()
