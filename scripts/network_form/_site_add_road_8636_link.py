#!/usr/bin/env python3
"""Add site-review motorable link between GPS A and B (8636 corridor)."""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path

import fiona
import geopandas as gpd
import pandas as pd
from pyproj import Transformer
from shapely.geometry import LineString, Point, mapping

ROOT = Path(__file__).resolve().parents[2]
GPKG = ROOT / "network_form" / "marshall_matrix" / "data" / "processed" / "roads_marshall_ready.gpkg"
STREETS_GEOJSON = ROOT / "public" / "data" / "network-form" / "roads_streets.geojson"
GN5_PATH = ROOT / "public" / "data" / "network-form" / "gn5_divisions.geojson"
GEOM_LOG = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "geometry_changes.csv"

SEGMENT_ID = "S0976"
NF_ROAD_ID = "site-8636-link"
# lon, lat
END_A = (79.863769, 6.831625)
END_B = (79.863640, 6.830560)
SNAP_TOL_M = 1.0
ENDPOINT_TOL_DEG = 1e-7

TO_M = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)


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


def dist_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    ax, ay = TO_M.transform(a[0], a[1])
    bx, by = TO_M.transform(b[0], b[1])
    return math.hypot(ax - bx, ay - by)


def collect_vertices(streets: gpd.GeoDataFrame) -> list[tuple[float, float]]:
    verts: list[tuple[float, float]] = []
    for geom in streets.geometry:
        if geom is None or geom.is_empty:
            continue
        for x, y in geom.coords:
            verts.append((x, y))
    return verts


def snap_endpoint(pt: tuple[float, float], verts: list[tuple[float, float]]) -> tuple[float, float]:
    best = pt
    best_d = SNAP_TOL_M
    for v in verts:
        d = dist_m(pt, v)
        if d <= best_d:
            best_d = d
            best = v
    return best


def endpoints_match(line: LineString, a: tuple[float, float], b: tuple[float, float]) -> bool:
    coords = list(line.coords)
    if len(coords) < 2:
        return False
    p0, p1 = coords[0], coords[-1]
    forward = (
        abs(p0[0] - a[0]) < ENDPOINT_TOL_DEG
        and abs(p0[1] - a[1]) < ENDPOINT_TOL_DEG
        and abs(p1[0] - b[0]) < ENDPOINT_TOL_DEG
        and abs(p1[1] - b[1]) < ENDPOINT_TOL_DEG
    )
    reverse = (
        abs(p0[0] - b[0]) < ENDPOINT_TOL_DEG
        and abs(p0[1] - b[1]) < ENDPOINT_TOL_DEG
        and abs(p1[0] - a[0]) < ENDPOINT_TOL_DEG
        and abs(p1[1] - a[1]) < ENDPOINT_TOL_DEG
    )
    return forward or reverse


def gn_for_midpoint(mid: Point) -> str:
    gn = gpd.read_file(GN5_PATH)
    name_col = "gn_name" if "gn_name" in gn.columns else "ADM4_EN"
    hit = gn[gn.contains(mid)]
    if len(hit) == 1:
        return str(hit.iloc[0][name_col])
    if len(hit) > 1:
        names = hit[name_col].astype(str).tolist()
        if "Mount Lavinia" in names:
            return "Mount Lavinia"
        return names[0]
    return "Mount Lavinia"


def line_length_m(line: LineString) -> float:
    coords = list(line.coords)
    total = 0.0
    for i in range(len(coords) - 1):
        total += dist_m(coords[i], coords[i + 1])
    return round(total, 3)


def main() -> None:
    streets = gpd.read_file(GPKG, layer="streets")
    existing = streets[streets["segment_id"] == SEGMENT_ID]
    if len(existing) == 1 and endpoints_match(existing.iloc[0].geometry, END_A, END_B):
        print(f"{SEGMENT_ID} already present; no-op")
        return

    verts = collect_vertices(streets)
    a = snap_endpoint(END_A, verts)
    b = snap_endpoint(END_B, verts)
    line = LineString([a, b])
    mid = Point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    gn_name = gn_for_midpoint(mid)
    length_m = line_length_m(line)

    new_row = {
        "segment_id": SEGMENT_ID,
        "osm_id": "",
        "highway": "residential",
        "name": "Site review link",
        "nf_road_id": NF_ROAD_ID,
        "gn_name": gn_name,
        "bridge": "",
        "layer": "",
        "bridge_join": "site_review",
        "source_layer": "site_review",
        "processing_status": "site_review_add",
        "short_fragment": False,
        "length_m": length_m,
        "geometry": line,
    }

    if len(existing) == 1:
        idx = existing.index[0]
        for key, val in new_row.items():
            streets.at[idx, key] = val
        change = "replace_segment"
    else:
        new_gdf = gpd.GeoDataFrame([new_row], geometry="geometry", crs=streets.crs)
        streets = gpd.GeoDataFrame(pd.concat([streets, new_gdf], ignore_index=True), crs=streets.crs)
        change = "add_segment"

    write_streets_gpkg(streets)

    with GEOM_LOG.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                SEGMENT_ID,
                "site_review",
                change,
                f"8636 link {a[0]:.8f},{a[1]:.8f} -> {b[0]:.8f},{b[1]:.8f} ({length_m:.1f} m, {gn_name})",
            ]
        )

    roads = json.loads(STREETS_GEOJSON.read_text(encoding="utf-8"))
    feats = roads["features"]
    updated = False
    for feat in feats:
        props = feat.get("properties") or {}
        if props.get("nf_road_id") == NF_ROAD_ID:
            feat["geometry"] = mapping(line)
            feat["properties"] = {
                "osm_id": None,
                "highway": "residential",
                "name": "Site review link",
                "nf_road_id": NF_ROAD_ID,
            }
            updated = True
            break
    if not updated:
        feats.append(
            {
                "type": "Feature",
                "properties": {
                    "osm_id": None,
                    "highway": "residential",
                    "name": "Site review link",
                    "nf_road_id": NF_ROAD_ID,
                },
                "geometry": mapping(line),
            }
        )
    STREETS_GEOJSON.write_text(json.dumps(roads), encoding="utf-8")

    print(f"{SEGMENT_ID} {change}: A={a} B={b} length_m={length_m} gn={gn_name}")


if __name__ == "__main__":
    main()
