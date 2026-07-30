#!/usr/bin/env python3
"""Isolated snap-tolerance scenario runner (default 100 m).

Rebuilds a clean walk graph from roads_walk_aoi into scenarios/snap_{N}m/,
snaps hexes+POIs, computes accessibility, classifies, maps, and findings.
NEVER writes to package-root 03_network/, 04_origins/, or public/data/walk-accessibility/.
"""

from __future__ import annotations

import argparse
import importlib
import json
import math
import shutil
import sys
from collections import defaultdict
from pathlib import Path

import geopandas as gpd
import networkx as nx
import numpy as np
import pandas as pd
from shapely.geometry import LineString, Point, mapping

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent
SCRIPTS = PACKAGE_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

ROADS_SRC = PACKAGE_ROOT / "03_network" / "roads_walk_aoi.geojson"
POIS_SRC = PACKAGE_ROOT / "02_pois" / "pois_access_primary.geojson"
HEX_SRC = (
    REPO_ROOT
    / "json_files"
    / "Primary study area final analysis 01"
    / "02_hex_grid"
    / "hex_grid_primary_100m.geojson"
)
BOUNDARY = PACKAGE_ROOT / "01_boundary" / "primary_study_area_boundary.geojson"
BETWEENNESS = (
    REPO_ROOT
    / "json_files"
    / "Primary study area final analysis 01"
    / "07_centrality"
    / "betweenness_5000m.geojson"
)

DEST_GROUPS = ["food", "education", "health", "transit", "finance", "open_space"]
WALK_M_PER_MIN = 80.0
THRESHOLDS_M = {5: 400.0, 10: 800.0, 15: 1200.0}
AREA_RATIO_ANALYSIS = 0.90
AREA_RATIO_CORE = 0.95
AREA_RATIO_SLIVER = 0.50
NODE_SNAP_M = 1.0
MIN_COMPONENT_EDGES = 5
EDGE_DENSE_M = 25.0


def write_geojson(path: Path, name: str, features: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "name": name,
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
    }
    with path.open("w", encoding="utf-8") as f:
        json.dump(collection, f)


def round_xy(x: float, y: float) -> tuple[float, float]:
    return (round(x, 0), round(y, 0))


def densify_coords(coords: list[tuple[float, float]], step_m: float) -> list[tuple[float, float]]:
    if len(coords) < 2:
        return coords
    out: list[tuple[float, float]] = [coords[0]]
    for i in range(len(coords) - 1):
        x1, y1 = coords[i][0], coords[i][1]
        x2, y2 = coords[i + 1][0], coords[i + 1][1]
        seg_len = Point(x1, y1).distance(Point(x2, y2))
        if seg_len <= step_m:
            out.append((x2, y2))
            continue
        n = max(int(seg_len // step_m), 1)
        for k in range(1, n + 1):
            t = min(k * step_m / seg_len, 1.0)
            out.append((x1 + t * (x2 - x1), y1 + t * (y2 - y1)))
        if out[-1] != (x2, y2):
            out.append((x2, y2))
    cleaned: list[tuple[float, float]] = [out[0]]
    for pt in out[1:]:
        if Point(cleaned[-1]).distance(Point(pt)) >= 0.5:
            cleaned.append(pt)
    return cleaned


def completeness_class(area_ratio: float | None) -> str:
    if area_ratio is None or not math.isfinite(area_ratio):
        return "unknown"
    if area_ratio >= AREA_RATIO_CORE:
        return "core"
    if area_ratio >= AREA_RATIO_ANALYSIS:
        return "near_complete"
    if area_ratio >= AREA_RATIO_SLIVER:
        return "partial"
    return "sliver"


def build_clean_graph(out_net: Path) -> nx.Graph:
    """Rebuild undirected densified walk graph from roads_walk_aoi into out_net only."""
    out_net.mkdir(parents=True, exist_ok=True)
    roads = gpd.read_file(ROADS_SRC)
    if roads.crs is None:
        roads = roads.set_crs(4326)
    else:
        roads = roads.to_crs(4326)
    roads = roads.explode(index_parts=False).reset_index(drop=True)
    roads = roads[~roads.geometry.is_empty & roads.geometry.notna()].copy()
    roads_m = roads.to_crs(3857)

    key_to_id: dict[tuple[float, float], int] = {}
    node_xy_m: dict[int, tuple[float, float]] = {}
    next_id = 1

    def get_node(x: float, y: float) -> int:
        nonlocal next_id
        key = round_xy(x, y)
        if key not in key_to_id:
            nid = next_id
            next_id += 1
            key_to_id[key] = nid
            node_xy_m[nid] = key
        return key_to_id[key]

    G = nx.Graph()
    edge_id = 0
    for _, row in roads_m.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty or geom.geom_type != "LineString":
            continue
        coords = densify_coords([(c[0], c[1]) for c in geom.coords], EDGE_DENSE_M)
        if len(coords) < 2:
            continue
        for i in range(len(coords) - 1):
            x1, y1 = coords[i][0], coords[i][1]
            x2, y2 = coords[i + 1][0], coords[i + 1][1]
            u = get_node(x1, y1)
            v = get_node(x2, y2)
            if u == v:
                continue
            length = Point(x1, y1).distance(Point(x2, y2))
            if length <= 0:
                continue
            if G.has_edge(u, v):
                if length < G[u][v]["length_m"]:
                    G[u][v]["length_m"] = length
                    G[u][v]["highway"] = str(row.get("highway") or "")
                    G[u][v]["osm_id"] = str(row.get("osm_id") or "")
                    G[u][v]["name"] = str(row.get("name") or "")
                continue
            edge_id += 1
            G.add_edge(
                u,
                v,
                length_m=float(length),
                highway=str(row.get("highway") or ""),
                osm_id=str(row.get("osm_id") or ""),
                name=str(row.get("name") or ""),
                edge_id=edge_id,
            )

    dropped_nodes: set[int] = set()
    kept_components = 0
    for comp in nx.connected_components(G):
        sub = G.subgraph(comp)
        if sub.number_of_edges() < MIN_COMPONENT_EDGES:
            dropped_nodes.update(comp)
        else:
            kept_components += 1
    if dropped_nodes:
        G.remove_nodes_from(dropped_nodes)

    node_gdf = gpd.GeoDataFrame(
        {
            "node_id": list(node_xy_m.keys()),
            "geometry": [Point(xy[0], xy[1]) for xy in node_xy_m.values()],
        },
        crs=3857,
    )
    node_gdf = node_gdf[node_gdf["node_id"].isin(G.nodes)].copy()
    node_ll = node_gdf.to_crs(4326)
    nodes_lonlat: dict[int, tuple[float, float]] = {}
    for _, r in node_ll.iterrows():
        nodes_lonlat[int(r["node_id"])] = (float(r.geometry.x), float(r.geometry.y))

    for n in G.nodes:
        lon, lat = nodes_lonlat[n]
        G.nodes[n]["lon"] = lon
        G.nodes[n]["lat"] = lat
        G.nodes[n]["x"] = float(node_xy_m[n][0])
        G.nodes[n]["y"] = float(node_xy_m[n][1])

    for _, _, data in G.edges(data=True):
        data["length_m"] = float(data["length_m"])
        data["highway"] = str(data.get("highway") or "")
        data["name"] = str(data.get("name") or "")
        data["osm_id"] = str(data.get("osm_id") or "")
        data["edge_id"] = int(data.get("edge_id") or 0)

    node_features = [
        {
            "type": "Feature",
            "properties": {"node_id": nid},
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
        }
        for nid, (lon, lat) in sorted(nodes_lonlat.items())
    ]
    edge_features = []
    total_length = 0.0
    for u, v, data in G.edges(data=True):
        lon1, lat1 = nodes_lonlat[u]
        lon2, lat2 = nodes_lonlat[v]
        length = float(data["length_m"])
        total_length += length
        edge_features.append(
            {
                "type": "Feature",
                "properties": {
                    "edge_id": int(data.get("edge_id") or 0),
                    "u": int(u),
                    "v": int(v),
                    "length_m": length,
                    "highway": data.get("highway") or "",
                    "osm_id": data.get("osm_id") or "",
                    "name": data.get("name") or "",
                },
                "geometry": {"type": "LineString", "coordinates": [[lon1, lat1], [lon2, lat2]]},
            }
        )

    write_geojson(out_net / "network_nodes.geojson", "network_nodes", node_features)
    write_geojson(out_net / "network_edges.geojson", "network_edges", edge_features)
    nx.write_graphml(G, out_net / "network_graph.graphml")
    summary = {
        "node_count": G.number_of_nodes(),
        "edge_count": G.number_of_edges(),
        "total_length_km": round(total_length / 1000.0, 3),
        "kept_components_min_edges": kept_components,
        "dropped_tiny_nodes": len(dropped_nodes),
        "node_snap_m": NODE_SNAP_M,
        "edge_densify_m": EDGE_DENSE_M,
        "source_roads": str(ROADS_SRC.relative_to(PACKAGE_ROOT)),
    }
    (out_net / "network_summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    # Scenario folders get a local roads copy; skip when writing into package 03_network/
    dest_roads = out_net / "roads_walk_aoi.geojson"
    if ROADS_SRC.resolve() != dest_roads.resolve():
        shutil.copy2(ROADS_SRC, dest_roads)
    print(f"Clean graph: nodes={G.number_of_nodes()} edges={G.number_of_edges()}")
    return G


def ensure_node_at(G, x, y, lon, lat, u, v, edge_data, next_node, next_edge):
    ux, uy = G.nodes[u]["x"], G.nodes[u]["y"]
    vx, vy = G.nodes[v]["x"], G.nodes[v]["y"]
    if Point(x, y).distance(Point(ux, uy)) <= 1.0:
        return u, next_node, next_edge
    if Point(x, y).distance(Point(vx, vy)) <= 1.0:
        return v, next_node, next_edge
    for nid, data in G.nodes(data=True):
        if Point(x, y).distance(Point(data["x"], data["y"])) <= 1.0:
            return int(nid), next_node, next_edge
    if not G.has_edge(u, v):
        best = None
        best_d = float("inf")
        for nid, data in G.nodes(data=True):
            d = Point(x, y).distance(Point(data["x"], data["y"]))
            if d < best_d:
                best_d = d
                best = int(nid)
        return best, next_node, next_edge
    nid = next_node
    next_node += 1
    G.add_node(nid, x=float(x), y=float(y), lon=float(lon), lat=float(lat))
    G.remove_edge(u, v)
    len_u = Point(ux, uy).distance(Point(x, y))
    len_v = Point(x, y).distance(Point(vx, vy))
    base = {
        "highway": edge_data.get("highway") or "",
        "name": edge_data.get("name") or "",
        "osm_id": edge_data.get("osm_id") or "",
    }
    G.add_edge(u, nid, length_m=float(len_u), edge_id=next_edge, **base)
    next_edge += 1
    G.add_edge(nid, v, length_m=float(len_v), edge_id=next_edge, **base)
    next_edge += 1
    return nid, next_node, next_edge


def snap_to_edges(gdf_ll, edges_m, G, next_node, next_edge, snap_tol_m: float):
    pts = gdf_ll.to_crs(3857).copy()
    joined = gpd.sjoin_nearest(
        pts, edges_m[["u", "v", "edge_id", "geometry"]], how="left", distance_col="snap_dist_m"
    )
    joined = joined[~joined.index.duplicated(keep="first")].copy()
    pts_ll = gdf_ll.copy()
    node_ids: list[int | None] = []
    snap_ok_flags: list[bool] = []
    snap_dists: list[float | None] = []

    for idx, row in joined.iterrows():
        dist = row.get("snap_dist_m")
        if dist is None or (isinstance(dist, float) and math.isnan(dist)) or float(dist) > snap_tol_m:
            node_ids.append(None)
            snap_ok_flags.append(False)
            snap_dists.append(
                None if dist is None or (isinstance(dist, float) and math.isnan(dist)) else float(dist)
            )
            continue
        u = int(row["u"])
        v = int(row["v"])
        pt = row.geometry
        if not G.has_edge(u, v):
            best_nid = None
            best_d = float("inf")
            for nid, data in G.nodes(data=True):
                d = pt.distance(Point(data["x"], data["y"]))
                if d < best_d:
                    best_d = d
                    best_nid = int(nid)
            if best_nid is not None and best_d <= snap_tol_m:
                node_ids.append(best_nid)
                snap_ok_flags.append(True)
                snap_dists.append(float(best_d))
            else:
                node_ids.append(None)
                snap_ok_flags.append(False)
                snap_dists.append(float(dist))
            continue
        edge_geom = LineString([(G.nodes[u]["x"], G.nodes[u]["y"]), (G.nodes[v]["x"], G.nodes[v]["y"])])
        proj = edge_geom.interpolate(edge_geom.project(pt))
        proj_ll = gpd.GeoSeries([proj], crs=3857).to_crs(4326).iloc[0]
        edge_data = dict(G.edges[u, v])
        nid, next_node, next_edge = ensure_node_at(
            G, float(proj.x), float(proj.y), float(proj_ll.x), float(proj_ll.y),
            u, v, edge_data, next_node, next_edge,
        )
        node_ids.append(nid)
        snap_ok_flags.append(True)
        snap_dists.append(float(dist))

    joined = joined.copy()
    joined["node_id"] = node_ids
    joined["snap_ok"] = snap_ok_flags
    joined["snap_dist_m"] = snap_dists
    return joined, next_node, next_edge


def features_from_snapped(snapped: gpd.GeoDataFrame, kind: str) -> list[dict]:
    feats: list[dict] = []
    ll = snapped.to_crs(4326)
    for _, row in ll.iterrows():
        node_id = row.get("node_id")
        if node_id is not None and not (isinstance(node_id, float) and math.isnan(node_id)):
            node_id = int(node_id)
        else:
            node_id = None
        dist = row.get("snap_dist_m")
        snap_dist = None if dist is None or (isinstance(dist, float) and math.isnan(dist)) else float(dist)
        if kind == "hex":
            props = {
                "hex_id": int(row["hex_id"]),
                "is_edge": bool(row["is_edge"]),
                "Hex_area": float(row["Hex_area"]) if row["Hex_area"] is not None else None,
                "node_id": node_id,
                "snap_dist_m": None if snap_dist is None else round(snap_dist, 3),
                "snap_ok": bool(row["snap_ok"]),
            }
        else:
            props = {
                "poi_id": row.get("poi_id"),
                "name": row.get("name") or "",
                "dest_group": row.get("dest_group"),
                "source": row.get("source"),
                "in_primary": bool(row.get("in_primary")),
                "node_id": node_id,
                "snap_dist_m": None if snap_dist is None else round(snap_dist, 3),
                "snap_ok": bool(row["snap_ok"]),
            }
        feats.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "Point", "coordinates": [float(row.geometry.x), float(row.geometry.y)]},
            }
        )
    return feats


def export_graph_local(G: nx.Graph, out_net: Path) -> None:
    node_features = []
    for nid, data in sorted(G.nodes(data=True), key=lambda t: t[0]):
        node_features.append(
            {
                "type": "Feature",
                "properties": {"node_id": int(nid)},
                "geometry": {"type": "Point", "coordinates": [float(data["lon"]), float(data["lat"])]},
            }
        )
    edge_features = []
    for u, v, data in G.edges(data=True):
        edge_features.append(
            {
                "type": "Feature",
                "properties": {
                    "edge_id": int(data.get("edge_id") or 0),
                    "u": int(u),
                    "v": int(v),
                    "length_m": float(data["length_m"]),
                    "highway": data.get("highway") or "",
                    "osm_id": data.get("osm_id") or "",
                    "name": data.get("name") or "",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [float(G.nodes[u]["lon"]), float(G.nodes[u]["lat"])],
                        [float(G.nodes[v]["lon"]), float(G.nodes[v]["lat"])],
                    ],
                },
            }
        )
    write_geojson(out_net / "network_nodes.geojson", "network_nodes", node_features)
    write_geojson(out_net / "network_edges.geojson", "network_edges", edge_features)
    for _, _, data in G.edges(data=True):
        data["length_m"] = float(data["length_m"])
        data["edge_id"] = int(data.get("edge_id") or 0)
        data["highway"] = str(data.get("highway") or "")
        data["name"] = str(data.get("name") or "")
        data["osm_id"] = str(data.get("osm_id") or "")
    for n, data in G.nodes(data=True):
        data["x"] = float(data["x"])
        data["y"] = float(data["y"])
        data["lon"] = float(data["lon"])
        data["lat"] = float(data["lat"])
    nx.write_graphml(G, out_net / "network_graph.graphml")


def run_snap(G: nx.Graph, out_scenario: Path, snap_tol_m: float) -> nx.Graph:
    out_net = out_scenario / "03_network"
    out_origins = out_scenario / "04_origins"
    out_origins.mkdir(parents=True, exist_ok=True)

    edges = gpd.read_file(out_net / "network_edges.geojson")
    if edges.crs is None:
        edges = edges.set_crs(4326)
    else:
        edges = edges.to_crs(4326)
    edges_m = edges.to_crs(3857)

    next_node = max(G.nodes) + 1 if G.number_of_nodes() else 1
    edge_ids = [int(float(d.get("edge_id") or 0)) for _, _, d in G.edges(data=True)]
    next_edge = max(edge_ids) + 1 if edge_ids else 1

    hexes = gpd.read_file(HEX_SRC)
    if hexes.crs is None:
        hexes = hexes.set_crs(4326)
    else:
        hexes = hexes.to_crs(4326)
    origins_m = hexes.to_crs(3857)
    origins_m["geometry"] = origins_m.geometry.centroid
    origins = origins_m.to_crs(4326)[["id", "is_edge", "Hex_area", "geometry"]].copy()
    origins = origins.rename(columns={"id": "hex_id"})
    origins["hex_id"] = origins["hex_id"].astype(int)

    snapped_hex, next_node, next_edge = snap_to_edges(
        origins, edges_m, G, next_node, next_edge, snap_tol_m
    )

    edge_rows = []
    for u, v, data in G.edges(data=True):
        edge_rows.append(
            {
                "u": u,
                "v": v,
                "edge_id": int(data.get("edge_id") or 0),
                "geometry": LineString([(G.nodes[u]["x"], G.nodes[u]["y"]), (G.nodes[v]["x"], G.nodes[v]["y"])]),
            }
        )
    edges_m = gpd.GeoDataFrame(edge_rows, crs=3857)

    pois = gpd.read_file(POIS_SRC)
    if pois.crs is None:
        pois = pois.set_crs(4326)
    else:
        pois = pois.to_crs(4326)
    snapped_pois, next_node, next_edge = snap_to_edges(
        pois, edges_m, G, next_node, next_edge, snap_tol_m
    )

    export_graph_local(G, out_net)

    hex_features = features_from_snapped(snapped_hex, "hex")
    poi_features = features_from_snapped(snapped_pois, "poi")
    write_geojson(out_origins / "hex_origins_primary.geojson", "hex_origins_primary", hex_features)
    write_geojson(out_origins / "pois_snapped.geojson", "pois_snapped", poi_features)

    hex_ok = sum(1 for f in hex_features if f["properties"]["snap_ok"])
    poi_ok = sum(1 for f in poi_features if f["properties"]["snap_ok"])
    summary = {
        "snap_tolerance_m": snap_tol_m,
        "snap_method": "nearest_edge_within_tolerance_insert_node",
        "hex_count": len(hex_features),
        "hex_snap_ok": hex_ok,
        "hex_snap_ok_share": round(hex_ok / len(hex_features), 4) if hex_features else 0,
        "hex_snap_fail": len(hex_features) - hex_ok,
        "poi_count": len(poi_features),
        "poi_snap_ok": poi_ok,
        "poi_snap_ok_share": round(poi_ok / len(poi_features), 4) if poi_features else 0,
        "poi_snap_fail": len(poi_features) - poi_ok,
        "graph_nodes_after_snap": G.number_of_nodes(),
        "graph_edges_after_snap": G.number_of_edges(),
    }
    (out_origins / "origins_snap_summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, indent=2))
    return G


def run_accessibility(G: nx.Graph, out_scenario: Path) -> None:
    out_acc = out_scenario / "05_accessibility"
    out_acc.mkdir(parents=True, exist_ok=True)
    hex_origins = out_scenario / "04_origins" / "hex_origins_primary.geojson"
    pois_snapped = out_scenario / "04_origins" / "pois_snapped.geojson"

    with pois_snapped.open(encoding="utf-8") as f:
        feats = json.load(f)["features"]
    by_group: dict[str, list[int]] = defaultdict(list)
    for feat in feats:
        p = feat["properties"]
        if not p.get("snap_ok") or p.get("node_id") is None:
            continue
        by_group[p["dest_group"]].append(int(p["node_id"]))
    sources = {g: list(dict.fromkeys(by_group.get(g, []))) for g in DEST_GROUPS}

    nearest: dict[str, dict[int, float]] = {}
    for g in DEST_GROUPS:
        print(f"Dijkstra multi-source: {g}…")
        src = [n for n in sources[g] if n in G]
        nearest[g] = (
            dict(nx.multi_source_dijkstra_path_length(G, sources=src, weight="length_m"))
            if src
            else {}
        )

    with hex_origins.open(encoding="utf-8") as f:
        origins = {int(ft["properties"]["hex_id"]): ft["properties"] for ft in json.load(f)["features"]}

    polygons = gpd.read_file(HEX_SRC)
    if polygons.crs is None:
        polygons = polygons.set_crs(4326)
    else:
        polygons = polygons.to_crs(4326)
    polygons["hex_id"] = polygons["id"].astype(int)

    features: list[dict] = []
    metric_rows: list[dict] = []
    print("Computing per-hex metrics…")
    for _, row in polygons.iterrows():
        hex_id = int(row["hex_id"])
        o = origins[hex_id]
        hex_area = float(row["Hex_area"]) if row.get("Hex_area") is not None else None
        hex_area_full = float(row["Hex_area_full"]) if row.get("Hex_area_full") is not None else None
        area_ratio = (
            float(hex_area) / float(hex_area_full)
            if hex_area is not None and hex_area_full and hex_area_full > 0
            else None
        )
        snap_ok = bool(o["snap_ok"])
        analysis_ok = bool(snap_ok and area_ratio is not None and area_ratio >= AREA_RATIO_ANALYSIS)
        props: dict = {
            "hex_id": hex_id,
            "is_edge": bool(o["is_edge"]),
            "Hex_area": hex_area,
            "Hex_area_full": hex_area_full,
            "area_ratio": None if area_ratio is None else round(area_ratio, 6),
            "completeness_class": completeness_class(area_ratio),
            "snap_ok": snap_ok,
            "analysis_ok": analysis_ok,
            "node_id": int(o["node_id"]) if snap_ok and o.get("node_id") is not None else None,
        }
        reach10_flags: list[bool] = []
        origin_node = props["node_id"]
        dist_from_origin = None
        if snap_ok and origin_node is not None and origin_node in G:
            dist_from_origin = nx.single_source_dijkstra_path_length(
                G, origin_node, cutoff=THRESHOLDS_M[15], weight="length_m"
            )
        for g in DEST_GROUPS:
            dist = None
            time_min = None
            if snap_ok and origin_node is not None:
                d = nearest[g].get(origin_node)
                if d is not None and math.isfinite(d):
                    dist = float(d)
                    time_min = dist / WALK_M_PER_MIN
            props[f"dist_{g}_m"] = None if dist is None else round(dist, 3)
            props[f"time_{g}_min"] = None if time_min is None else round(time_min, 3)
            for mins, lim in THRESHOLDS_M.items():
                props[f"reach_{g}_{mins}"] = bool(dist is not None and dist <= lim)
            if dist_from_origin is not None:
                props[f"count_{g}_10"] = sum(
                    1 for n in sources[g] if dist_from_origin.get(n, math.inf) <= THRESHOLDS_M[10]
                )
            else:
                props[f"count_{g}_10"] = 0
            reach10_flags.append(bool(props[f"reach_{g}_10"]))
        if snap_ok:
            props["groups_within_10"] = int(sum(reach10_flags))
            props["access_score"] = round(sum(reach10_flags) / len(DEST_GROUPS), 4)
        else:
            props["groups_within_10"] = 0
            props["access_score"] = None
        metric_rows.append(props)
        features.append({"type": "Feature", "properties": props, "geometry": mapping(row.geometry)})

    out_hex = out_acc / "access_hex_primary.geojson"
    with out_hex.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "type": "FeatureCollection",
                "name": "access_hex_primary",
                "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
                "features": features,
            },
            f,
        )

    analysis = [r for r in metric_rows if r["analysis_ok"] and r["access_score"] is not None]
    denom = len(analysis) if analysis else 1
    coverage: dict[str, dict[str, float]] = {}
    for g in DEST_GROUPS:
        coverage[g] = {}
        for mins in (5, 10, 15):
            key = f"reach_{g}_{mins}"
            coverage[g][f"within_{mins}_min"] = (
                round(sum(1 for r in analysis if r[key]) / denom, 4) if analysis else 0.0
            )
        dists = [r[f"dist_{g}_m"] for r in analysis if r[f"dist_{g}_m"] is not None]
        coverage[g]["median_dist_m"] = round(sorted(dists)[len(dists) // 2], 3) if dists else None
        coverage[g]["mean_dist_m"] = round(sum(dists) / len(dists), 3) if dists else None

    scores = [r["access_score"] for r in analysis]
    deserts = [r for r in analysis if r["groups_within_10"] <= 2]
    by_class = {
        cname: sum(1 for r in metric_rows if r["completeness_class"] == cname)
        for cname in ("core", "near_complete", "partial", "sliver", "unknown")
    }
    summary = {
        "hex_count": len(metric_rows),
        "analysis_hex_count": len(analysis),
        "analysis_definition": "area_ratio>=0.90 AND snap_ok=true",
        "area_ratio_analysis_threshold": AREA_RATIO_ANALYSIS,
        "completeness_counts": by_class,
        "walk_speed_kmh": 4.8,
        "walk_m_per_min": WALK_M_PER_MIN,
        "thresholds_m": THRESHOLDS_M,
        "dest_groups": DEST_GROUPS,
        "coverage_analysis_ok": coverage,
        "coverage_non_edge_snap_ok": coverage,
        "mean_access_score": round(sum(scores) / len(scores), 4) if scores else None,
        "median_access_score": round(sorted(scores)[len(scores) // 2], 4) if scores else None,
        "desert_count": len(deserts),
        "desert_definition": "analysis_ok AND groups_within_10 <= 2",
        "desert_share": round(len(deserts) / denom, 4) if analysis else None,
        "poi_sources_snapped": {g: len(sources[g]) for g in DEST_GROUPS},
    }
    (out_acc / "access_primary_summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"access: analysis={len(analysis)} mean={summary['mean_access_score']} deserts={len(deserts)}"
    )


def run_classify_maps_findings(out_scenario: Path) -> None:
    """Call Phase 4/5 modules with paths remapped to the scenario folder."""
    classify = importlib.import_module("08_classify_and_maps")
    findings = importlib.import_module("09_write_findings")

    classify.ACCESS_HEX = out_scenario / "05_accessibility" / "access_hex_primary.geojson"
    classify.ACCESS_SUMMARY = out_scenario / "05_accessibility" / "access_primary_summary.json"
    classify.OUT_CLASSIFIED = out_scenario / "05_accessibility" / "access_hex_classified.geojson"
    classify.BOUNDARY = BOUNDARY
    classify.BETWEENNESS = BETWEENNESS
    classify.OUT_MAPS = out_scenario / "06_maps"
    classify.main()

    findings.ACCESS_SUMMARY = out_scenario / "05_accessibility" / "access_primary_summary.json"
    findings.CLASSIFIED = out_scenario / "05_accessibility" / "access_hex_classified.geojson"
    findings.MAPS_SUMMARY = out_scenario / "06_maps" / "maps_summary.json"
    findings.OUT_DIR = out_scenario / "07_findings"
    findings.OUT_MD = findings.OUT_DIR / "findings.md"
    findings.OUT_JSON = findings.OUT_DIR / "findings_summary.json"
    findings.OUT_DESERTS = findings.OUT_DIR / "desert_hex_ids.json"
    findings.main()


def assert_no_package_root_mutation(before_mtimes: dict[Path, float]) -> None:
    protected = [
        PACKAGE_ROOT / "03_network" / "network_graph.graphml",
        PACKAGE_ROOT / "04_origins" / "hex_origins_primary.geojson",
        PACKAGE_ROOT / "04_origins" / "pois_snapped.geojson",
        REPO_ROOT / "public" / "data" / "walk-accessibility" / "access_hex_classified.geojson",
    ]
    for path in protected:
        if not path.is_file():
            continue
        after = path.stat().st_mtime
        if path in before_mtimes and after != before_mtimes[path]:
            raise SystemExit(f"Isolation breach: mutated {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run isolated snap-tolerance scenario")
    parser.add_argument("--snap-m", type=float, default=100.0)
    args = parser.parse_args()
    snap_m = float(args.snap_m)
    if snap_m <= 0:
        raise SystemExit("--snap-m must be > 0")

    label = int(snap_m) if snap_m == int(snap_m) else snap_m
    out_scenario = PACKAGE_ROOT / "scenarios" / f"snap_{label}m"
    if out_scenario.exists():
        shutil.rmtree(out_scenario)
    out_scenario.mkdir(parents=True)

    protected = [
        PACKAGE_ROOT / "03_network" / "network_graph.graphml",
        PACKAGE_ROOT / "04_origins" / "hex_origins_primary.geojson",
        PACKAGE_ROOT / "04_origins" / "pois_snapped.geojson",
        REPO_ROOT / "public" / "data" / "walk-accessibility" / "access_hex_classified.geojson",
    ]
    before = {p: p.stat().st_mtime for p in protected if p.is_file()}

    print(f"=== Scenario snap_{label}m -> {out_scenario} ===")
    G = build_clean_graph(out_scenario / "03_network")
    G = run_snap(G, out_scenario, snap_m)
    run_accessibility(G, out_scenario)
    run_classify_maps_findings(out_scenario)

    meta = {
        "snap_tolerance_m": snap_m,
        "role": "sensitivity_scenario",
        "dashboard_publish": "unchanged — live dashboard stays on 50 m",
        "outputs": {
            "network": "03_network/",
            "origins": "04_origins/",
            "accessibility": "05_accessibility/",
            "maps": "06_maps/",
            "findings": "07_findings/",
        },
    }
    (out_scenario / "scenario_meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    assert_no_package_root_mutation(before)
    print(f"PASS isolation — wrote {out_scenario}")


if __name__ == "__main__":
    main()
