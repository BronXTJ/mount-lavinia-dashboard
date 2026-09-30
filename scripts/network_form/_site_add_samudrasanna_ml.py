#!/usr/bin/env python3
"""Import OSM Samudrasanna Road (way/50133642) into Marshall streets for ML quarry-strip cells."""

from __future__ import annotations

import csv
import json
import math
import re
from pathlib import Path

import fiona
import geopandas as gpd
import pandas as pd
from pyproj import Transformer
from shapely.geometry import LineString, mapping, shape
ROOT = Path(__file__).resolve().parents[2]
PRIMARY = (
    ROOT
    / "json_files"
    / "Primary study area final analysis 01"
    / "06_context"
    / "roads_primary.geojson"
)
GPKG = ROOT / "network_form" / "marshall_matrix" / "data" / "processed" / "roads_marshall_ready.gpkg"
STREETS_GEOJSON = ROOT / "public" / "data" / "network-form" / "roads_streets.geojson"
GN5_PATH = ROOT / "public" / "data" / "network-form" / "gn5_divisions.geojson"
GEOM_LOG = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "geometry_changes.csv"

OSM_ID = "50133642"
OSM_WAY = f"way/{OSM_ID}"
NF_PREFIX = "site-samudrasanna-"
MIN_LEN_M = 0.5
SNAP_TOL_M = 1.0

TO_M = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)


def write_streets_gpkg(streets: gpd.GeoDataFrame) -> None:
    streets = streets.drop_duplicates(subset=["segment_id"], keep="first").reset_index(drop=True)
    layer_names = fiona.listlayers(GPKG)
    layers = {name: gpd.read_file(GPKG, layer=name) for name in layer_names}
    layers["streets"] = streets
    tmp = GPKG.with_suffix(".rewrite.gpkg")
    if tmp.exists():
        tmp.unlink()
    first = True
    for name, data in layers.items():
        data.to_file(
            tmp,
            layer=name,
            driver="GPKG",
            mode="w" if first else "a",
            engine="pyogrio",
        )
        first = False
    tmp.replace(GPKG)


def dist_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    ax, ay = TO_M.transform(a[0], a[1])
    bx, by = TO_M.transform(b[0], b[1])
    return math.hypot(ax - bx, ay - by)


def line_length_m(line: LineString) -> float:
    coords = list(line.coords)
    total = 0.0
    for i in range(len(coords) - 1):
        total += dist_m(coords[i], coords[i + 1])
    return round(total, 3)


def linear_parts(geom) -> list[LineString]:
    if geom is None or geom.is_empty:
        return []
    if geom.geom_type == "LineString":
        return [geom]
    if geom.geom_type == "MultiLineString":
        return [part for part in geom.geoms if not part.is_empty and part.length > 0]
    if geom.geom_type == "GeometryCollection":
        parts: list[LineString] = []
        for part in geom.geoms:
            parts.extend(linear_parts(part))
        return parts
    return []


def next_segment_ids(streets: gpd.GeoDataFrame, count: int) -> list[str]:
    nums = []
    for sid in streets["segment_id"].drop_duplicates():
        m = re.match(r"S(\d+)", str(sid))
        if m:
            nums.append(int(m.group(1)))
    start = max(nums) + 1 if nums else 1
    return [f"S{start + i:04d}" for i in range(count)]


def load_samudrasanna_clipped() -> list[LineString]:
    data = json.loads(PRIMARY.read_text(encoding="utf-8"))
    feat = next(f for f in data["features"] if f.get("properties", {}).get("id") == OSM_WAY)
    geom = shape(feat["geometry"])
    gn = gpd.read_file(GN5_PATH)
    name_col = "ADM4_EN" if "ADM4_EN" in gn.columns else "gn_name"
    ml_poly = gn[gn[name_col] == "Mount Lavinia"].geometry.iloc[0]
    clipped = geom.intersection(ml_poly)
    parts = linear_parts(clipped)
    out: list[LineString] = []
    for part in parts:
        if line_length_m(part) >= MIN_LEN_M:
            out.append(part)
    return out


def snap_line_to_graph(line: LineString, verts: list[tuple[float, float]]) -> LineString:
    coords = list(line.coords)
    if len(coords) < 2:
        return line

    def snap(pt: tuple[float, float]) -> tuple[float, float]:
        best = pt
        best_d = SNAP_TOL_M
        for v in verts:
            d = dist_m(pt, v)
            if d <= best_d:
                best_d = d
                best = v
        return best

    coords[0] = snap(coords[0])
    coords[-1] = snap(coords[-1])
    return LineString(coords)


def collect_vertices(streets: gpd.GeoDataFrame) -> list[tuple[float, float]]:
    verts: list[tuple[float, float]] = []
    for geom in streets.geometry:
        if geom is None or geom.is_empty:
            continue
        for x, y in geom.coords:
            verts.append((x, y))
    return verts


def sync_geojson_from_gpkg(sam_rows: gpd.GeoDataFrame) -> int:
    roads = json.loads(STREETS_GEOJSON.read_text(encoding="utf-8"))
    feats = roads["features"]
    feats = [
        f
        for f in feats
        if not str((f.get("properties") or {}).get("nf_road_id", "")).startswith(NF_PREFIX)
        and str((f.get("properties") or {}).get("osm_id", "")) != OSM_ID
        and (f.get("properties") or {}).get("name") != "Samudrasanna Road"
    ]
    for _, row in sam_rows.iterrows():
        feats.append(
            {
                "type": "Feature",
                "properties": {
                    "osm_id": int(OSM_ID),
                    "highway": str(row.get("highway") or "residential"),
                    "name": "Samudrasanna Road",
                    "nf_road_id": f"{NF_PREFIX}{row['segment_id']}",
                },
                "geometry": mapping(row.geometry),
            }
        )
    roads["features"] = feats
    STREETS_GEOJSON.write_text(json.dumps(roads), encoding="utf-8")
    return len(sam_rows)


def part_covered(part: LineString, existing: gpd.GeoDataFrame, tol_m: float = 2.0) -> bool:
    for _, row in existing.iterrows():
        if row.geometry.distance(part) <= tol_m / 111_320:
            if row.geometry.hausdorff_distance(part) <= tol_m / 111_320:
                return True
    return False


def main() -> None:
    streets = gpd.read_file(GPKG, layer="streets")
    streets = streets.drop_duplicates(subset=["segment_id"], keep="first").reset_index(drop=True)

    sam_existing = streets[streets["osm_id"].astype(str) == OSM_ID]
    parts = load_samudrasanna_clipped()
    added = 0

    if len(sam_existing) > 0:
        missing = [p for p in parts if not part_covered(p, sam_existing)]
        if not missing:
            n = sync_geojson_from_gpkg(sam_existing)
            write_streets_gpkg(streets)
            print(f"osm_id {OSM_ID} in GPKG; synced {n} segment(s) to roads_streets.geojson")
            return
        parts = missing
        print(f"Adding {len(parts)} missing Samudrasanna part(s) to GPKG")
    else:
        print(f"Importing {len(parts)} Samudrasanna part(s) from {OSM_WAY}")

    if not parts:
        raise RuntimeError("No Samudrasanna linework inside Mount Lavinia after clip")

    verts = collect_vertices(streets)
    segment_ids = next_segment_ids(streets, len(parts))
    new_rows = []
    for idx, part in enumerate(parts):
        line = snap_line_to_graph(part, verts)
        length_m = line_length_m(line)
        if length_m < MIN_LEN_M:
            continue
        nf_id = f"{NF_PREFIX}{idx}"
        new_rows.append(
            {
                "segment_id": segment_ids[idx],
                "osm_id": OSM_ID,
                "highway": "residential",
                "name": "Samudrasanna Road",
                "nf_road_id": nf_id,
                "gn_name": "Mount Lavinia",
                "bridge": "",
                "layer": "",
                "bridge_join": "site_review",
                "source_layer": "site_review",
                "processing_status": "site_review_add",
                "short_fragment": False,
                "length_m": length_m,
                "geometry": line,
            }
        )
        verts.extend(list(line.coords))

    if not new_rows and len(sam_existing) == 0:
        raise RuntimeError("All Samudrasanna parts below minimum length after snap")

    if new_rows:
        new_gdf = gpd.GeoDataFrame(new_rows, geometry="geometry", crs=streets.crs)
        streets = gpd.GeoDataFrame(pd.concat([streets, new_gdf], ignore_index=True), crs=streets.crs)
        added = len(new_rows)

    sam_all = streets[streets["osm_id"].astype(str) == OSM_ID]
    n_geo = sync_geojson_from_gpkg(sam_all)
    write_streets_gpkg(streets)

    with GEOM_LOG.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        for row in new_rows if new_rows else []:
            coords = list(row["geometry"].coords)
            writer.writerow(
                [
                    row["segment_id"],
                    "site_review",
                    "add_segment",
                    f"Samudrasanna OSM {OSM_ID} {coords[0][0]:.8f},{coords[0][1]:.8f} -> "
                    f"{coords[-1][0]:.8f},{coords[-1][1]:.8f} ({row['length_m']:.1f} m)",
                ]
            )

    total_m = sum(r["length_m"] for r in new_rows) if new_rows else 0
    print(f"Added {added} GPKG segment(s), synced {n_geo} to geojson, {total_m:.1f} m new")
    for row in new_rows if new_rows else []:
        print(f"  {row['segment_id']} {row['nf_road_id']} {row['length_m']} m")


if __name__ == "__main__":
    main()
