#!/usr/bin/env python3
"""Create hex origin centroids and snap hexes + POIs to the walk network.

Snaps to the nearest network edge within SNAP_TOL_M. Mid-edge projections
become new graph nodes (edge split) so Phase 3 routing stays accurate.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import geopandas as gpd
import networkx as nx
from shapely.geometry import LineString, Point

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent

HEX_SRC = (
    REPO_ROOT
    / "json_files"
    / "Primary study area final analysis 01"
    / "02_hex_grid"
    / "hex_grid_primary_100m.geojson"
)
POIS_SRC = PACKAGE_ROOT / "02_pois" / "pois_access_primary.geojson"
GRAPH_PATH = PACKAGE_ROOT / "03_network" / "network_graph.graphml"
EDGES_PATH = PACKAGE_ROOT / "03_network" / "network_edges.geojson"
OUT_NODES = PACKAGE_ROOT / "03_network" / "network_nodes.geojson"
OUT_EDGES = PACKAGE_ROOT / "03_network" / "network_edges.geojson"
OUT_HEX = PACKAGE_ROOT / "04_origins" / "hex_origins_primary.geojson"
OUT_POIS = PACKAGE_ROOT / "04_origins" / "pois_snapped.geojson"
OUT_SUMMARY = PACKAGE_ROOT / "04_origins" / "origins_snap_summary.json"

SNAP_TOL_M = 100.0


def write_geojson(path: Path, name: str, features: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "name": name,
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": features,
    }
    with path.open("w", encoding="utf-8") as f:
        json.dump(collection, f)


def load_graph() -> nx.Graph:
    G = nx.read_graphml(GRAPH_PATH)
    G = nx.relabel_nodes(G, lambda n: int(n))
    # Ensure numeric attrs
    for _, _, data in G.edges(data=True):
        data["length_m"] = float(data["length_m"])
        data["edge_id"] = int(float(data.get("edge_id") or 0))
        data["highway"] = str(data.get("highway") or "")
        data["name"] = str(data.get("name") or "")
        data["osm_id"] = str(data.get("osm_id") or "")
    for n, data in G.nodes(data=True):
        data["x"] = float(data["x"])
        data["y"] = float(data["y"])
        data["lon"] = float(data["lon"])
        data["lat"] = float(data["lat"])
    return G


def next_ids(G: nx.Graph) -> tuple[int, int]:
    next_node = max(G.nodes) + 1 if G.number_of_nodes() else 1
    edge_ids = [int(float(d.get("edge_id") or 0)) for _, _, d in G.edges(data=True)]
    next_edge = max(edge_ids) + 1 if edge_ids else 1
    return next_node, next_edge


def ensure_node_at(
    G: nx.Graph,
    x: float,
    y: float,
    lon: float,
    lat: float,
    u: int,
    v: int,
    edge_data: dict,
    next_node: int,
    next_edge: int,
) -> tuple[int, int, int]:
    """Insert node on edge u-v at (x,y) if needed; return (node_id, next_node, next_edge)."""
    # Reuse endpoint if projection is essentially at endpoint
    ux, uy = G.nodes[u]["x"], G.nodes[u]["y"]
    vx, vy = G.nodes[v]["x"], G.nodes[v]["y"]
    if Point(x, y).distance(Point(ux, uy)) <= 1.0:
        return u, next_node, next_edge
    if Point(x, y).distance(Point(vx, vy)) <= 1.0:
        return v, next_node, next_edge

    # Reuse existing node near projection
    for nid, data in G.nodes(data=True):
        if Point(x, y).distance(Point(data["x"], data["y"])) <= 1.0:
            return int(nid), next_node, next_edge

    if not G.has_edge(u, v):
        # Edge may already have been split; fall back to nearest existing node
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


def snap_to_edges(
    gdf_ll: gpd.GeoDataFrame,
    edges_m: gpd.GeoDataFrame,
    G: nx.Graph,
    next_node: int,
    next_edge: int,
) -> tuple[gpd.GeoDataFrame, int, int]:
    pts = gdf_ll.to_crs(3857).copy()
    joined = gpd.sjoin_nearest(
        pts,
        edges_m[["u", "v", "edge_id", "geometry"]],
        how="left",
        distance_col="snap_dist_m",
    )
    joined = joined[~joined.index.duplicated(keep="first")].copy()

    node_ids: list[int | None] = []
    snap_ok_flags: list[bool] = []
    snap_dists: list[float | None] = []

    # Need lon/lat for new nodes — convert once
    pts_ll = gdf_ll.copy()
    pts_ll = pts_ll.set_geometry(gdf_ll.geometry)

    for idx, row in joined.iterrows():
        dist = row.get("snap_dist_m")
        if dist is None or (isinstance(dist, float) and math.isnan(dist)) or float(dist) > SNAP_TOL_M:
            node_ids.append(None)
            snap_ok_flags.append(False)
            snap_dists.append(None if dist is None or (isinstance(dist, float) and math.isnan(dist)) else float(dist))
            continue

        u = int(row["u"])
        v = int(row["v"])
        pt = row.geometry  # metric
        if not G.has_edge(u, v):
            # try swapped — undirected should be fine; edge may already be split
            # find current nearest edge among remaining
            best_nid = None
            best_d = float("inf")
            for nid, data in G.nodes(data=True):
                d = pt.distance(Point(data["x"], data["y"]))
                if d < best_d:
                    best_d = d
                    best_nid = int(nid)
            if best_nid is not None and best_d <= SNAP_TOL_M:
                node_ids.append(best_nid)
                snap_ok_flags.append(True)
                snap_dists.append(float(best_d))
            else:
                node_ids.append(None)
                snap_ok_flags.append(False)
                snap_dists.append(float(dist))
            continue

        edge_geom = LineString(
            [(G.nodes[u]["x"], G.nodes[u]["y"]), (G.nodes[v]["x"], G.nodes[v]["y"])]
        )
        proj = edge_geom.interpolate(edge_geom.project(pt))
        # lon/lat from original point row
        orig = pts_ll.loc[idx].geometry
        # Better: transform proj to 4326
        proj_ll = gpd.GeoSeries([proj], crs=3857).to_crs(4326).iloc[0]
        edge_data = dict(G.edges[u, v])
        nid, next_node, next_edge = ensure_node_at(
            G,
            float(proj.x),
            float(proj.y),
            float(proj_ll.x),
            float(proj_ll.y),
            u,
            v,
            edge_data,
            next_node,
            next_edge,
        )
        node_ids.append(nid)
        snap_ok_flags.append(True)
        snap_dists.append(float(dist))

    joined = joined.copy()
    joined["node_id"] = node_ids
    joined["snap_ok"] = snap_ok_flags
    joined["snap_dist_m"] = snap_dists
    return joined, next_node, next_edge


def export_graph(G: nx.Graph) -> None:
    node_features = []
    for nid, data in sorted(G.nodes(data=True), key=lambda t: t[0]):
        node_features.append(
            {
                "type": "Feature",
                "properties": {"node_id": int(nid)},
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(data["lon"]), float(data["lat"])],
                },
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
    write_geojson(OUT_NODES, "network_nodes", node_features)
    write_geojson(OUT_EDGES, "network_edges", edge_features)
    # GraphML-safe types
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
    nx.write_graphml(G, GRAPH_PATH)


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
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row.geometry.x), float(row.geometry.y)],
                },
            }
        )
    return feats


def main() -> None:
    for path in (HEX_SRC, POIS_SRC, GRAPH_PATH, EDGES_PATH):
        if not path.is_file():
            raise SystemExit(f"Missing required input: {path}")

    G = load_graph()
    next_node, next_edge = next_ids(G)

    edges = gpd.read_file(EDGES_PATH)
    if edges.crs is None:
        edges = edges.set_crs(4326)
    else:
        edges = edges.to_crs(4326)
    edges_m = edges.to_crs(3857)

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
        origins, edges_m, G, next_node, next_edge
    )

    # Refresh edges_m after hex insertions so POI snaps see updated topology
    # Rebuild edges geodataframe from G
    edge_rows = []
    for u, v, data in G.edges(data=True):
        edge_rows.append(
            {
                "u": u,
                "v": v,
                "edge_id": int(data.get("edge_id") or 0),
                "geometry": LineString(
                    [(G.nodes[u]["x"], G.nodes[u]["y"]), (G.nodes[v]["x"], G.nodes[v]["y"])]
                ),
            }
        )
    edges_m = gpd.GeoDataFrame(edge_rows, crs=3857)

    pois = gpd.read_file(POIS_SRC)
    if pois.crs is None:
        pois = pois.set_crs(4326)
    else:
        pois = pois.to_crs(4326)

    snapped_pois, next_node, next_edge = snap_to_edges(
        pois, edges_m, G, next_node, next_edge
    )

    export_graph(G)

    hex_features = features_from_snapped(snapped_hex, "hex")
    poi_features = features_from_snapped(snapped_pois, "poi")
    write_geojson(OUT_HEX, "hex_origins_primary", hex_features)
    write_geojson(OUT_POIS, "pois_snapped", poi_features)

    hex_ok = sum(1 for f in hex_features if f["properties"]["snap_ok"])
    poi_ok = sum(1 for f in poi_features if f["properties"]["snap_ok"])
    summary = {
        "snap_tolerance_m": SNAP_TOL_M,
        "snap_method": "nearest_edge_within_tolerance_insert_node",
        "hex_count": len(hex_features),
        "hex_snap_ok": hex_ok,
        "hex_snap_ok_share": round(hex_ok / len(hex_features), 4) if hex_features else 0,
        "hex_non_edge_count": sum(1 for f in hex_features if not f["properties"]["is_edge"]),
        "hex_non_edge_snap_ok": sum(
            1 for f in hex_features if (not f["properties"]["is_edge"]) and f["properties"]["snap_ok"]
        ),
        "poi_count": len(poi_features),
        "poi_snap_ok": poi_ok,
        "poi_snap_ok_share": round(poi_ok / len(poi_features), 4) if poi_features else 0,
        "hex_snap_fail": len(hex_features) - hex_ok,
        "poi_snap_fail": len(poi_features) - poi_ok,
        "graph_nodes_after_snap": G.number_of_nodes(),
        "graph_edges_after_snap": G.number_of_edges(),
    }
    non_edge = summary["hex_non_edge_count"]
    summary["hex_non_edge_snap_ok_share"] = (
        round(summary["hex_non_edge_snap_ok"] / non_edge, 4) if non_edge else 0
    )

    # Refresh network summary node/edge counts after snap insertions
    net_summary_path = PACKAGE_ROOT / "03_network" / "network_summary.json"
    if net_summary_path.is_file():
        with net_summary_path.open(encoding="utf-8") as f:
            net_summary = json.load(f)
        net_summary["node_count_after_snap"] = G.number_of_nodes()
        net_summary["edge_count_after_snap"] = G.number_of_edges()
        with net_summary_path.open("w", encoding="utf-8") as f:
            json.dump(net_summary, f, indent=2)
            f.write("\n")
    with OUT_SUMMARY.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        f.write("\n")

    print(f"Wrote {OUT_HEX}")
    print(f"Wrote {OUT_POIS}")
    print(f"Updated {GRAPH_PATH}, {OUT_NODES}, {OUT_EDGES}")
    print(f"Wrote {OUT_SUMMARY}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
