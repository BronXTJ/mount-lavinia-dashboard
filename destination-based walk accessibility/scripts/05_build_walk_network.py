#!/usr/bin/env python3
"""Build undirected walk network (networkx) from roads_walk_aoi."""

from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import networkx as nx
from shapely.geometry import LineString, Point

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
ROADS_PATH = PACKAGE_ROOT / "03_network" / "roads_walk_aoi.geojson"
OUT_NODES = PACKAGE_ROOT / "03_network" / "network_nodes.geojson"
OUT_EDGES = PACKAGE_ROOT / "03_network" / "network_edges.geojson"
OUT_GRAPH = PACKAGE_ROOT / "03_network" / "network_graph.graphml"
OUT_SUMMARY = PACKAGE_ROOT / "03_network" / "network_summary.json"

NODE_SNAP_M = 1.0
MIN_COMPONENT_EDGES = 5
# Densify so hex centroids mid-block can snap within 50 m
EDGE_DENSE_M = 25.0


def round_xy(x: float, y: float, ndigits: int = 3) -> tuple[float, float]:
    """Round metric coords to 1 m grid matching NODE_SNAP_M."""
    return (round(x, 0), round(y, 0))


def densify_coords(coords: list[tuple[float, float]], step_m: float) -> list[tuple[float, float]]:
    """Insert vertices along a polyline so consecutive points are ~step_m apart."""
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
        # ensure exact endpoint
        if out[-1] != (x2, y2):
            out.append((x2, y2))
    # drop near-duplicates
    cleaned: list[tuple[float, float]] = [out[0]]
    for pt in out[1:]:
        if Point(cleaned[-1]).distance(Point(pt)) >= 0.5:
            cleaned.append(pt)
    return cleaned


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


def main() -> None:
    if not ROADS_PATH.is_file():
        raise SystemExit(f"Missing roads: {ROADS_PATH}")

    roads = gpd.read_file(ROADS_PATH)
    if roads.crs is None:
        roads = roads.set_crs(4326)
    else:
        roads = roads.to_crs(4326)
    roads = roads.explode(index_parts=False).reset_index(drop=True)
    roads = roads[~roads.geometry.is_empty & roads.geometry.notna()].copy()
    roads_m = roads.to_crs(3857)

    # Map snapped endpoint -> node_id
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
    edge_records: list[dict] = []
    edge_id = 0

    for idx, row in roads_m.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue
        if geom.geom_type != "LineString":
            continue
        coords = densify_coords([(c[0], c[1]) for c in geom.coords], EDGE_DENSE_M)
        if len(coords) < 2:
            continue
        # Split into segments between consecutive vertices so intermediate
        # intersections can connect when endpoints snap; also keep full way
        # as chained edges between consecutive snapped vertices.
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
            # If parallel edge exists, keep shorter / accumulate? keep min length
            if G.has_edge(u, v):
                if length < G[u][v]["length_m"]:
                    G[u][v]["length_m"] = length
                    G[u][v]["highway"] = row.get("highway")
                    G[u][v]["osm_id"] = row.get("osm_id")
                    G[u][v]["name"] = row.get("name") or ""
                continue
            edge_id += 1
            G.add_edge(
                u,
                v,
                length_m=float(length),
                highway=str(row.get("highway") or ""),
                osm_id=row.get("osm_id"),
                name=str(row.get("name") or ""),
                edge_id=edge_id,
            )
            edge_records.append(
                {
                    "u": u,
                    "v": v,
                    "edge_id": edge_id,
                    "length_m": float(length),
                    "highway": str(row.get("highway") or ""),
                    "osm_id": row.get("osm_id"),
                    "name": str(row.get("name") or ""),
                    "geom_m": LineString([(node_xy_m[u][0], node_xy_m[u][1]), (node_xy_m[v][0], node_xy_m[v][1])]),
                }
            )

    # Drop tiny connected components
    components = list(nx.connected_components(G))
    components_sorted = sorted(components, key=len, reverse=True)
    dropped_nodes: set[int] = set()
    kept_components = 0
    for comp in components_sorted:
        sub = G.subgraph(comp)
        if sub.number_of_edges() < MIN_COMPONENT_EDGES:
            dropped_nodes.update(comp)
        else:
            kept_components += 1
    if dropped_nodes:
        G.remove_nodes_from(dropped_nodes)
        edge_records = [e for e in edge_records if e["u"] in G and e["v"] in G and G.has_edge(e["u"], e["v"])]

    # Rebuild edge list from final graph (authoritative)
    nodes_lonlat: dict[int, tuple[float, float]] = {}
    node_gdf = gpd.GeoDataFrame(
        {
            "node_id": list(node_xy_m.keys()),
            "geometry": [Point(xy[0], xy[1]) for xy in node_xy_m.values()],
        },
        crs=3857,
    )
    node_gdf = node_gdf[node_gdf["node_id"].isin(G.nodes)].copy()
    node_ll = node_gdf.to_crs(4326)
    for _, r in node_ll.iterrows():
        nodes_lonlat[int(r["node_id"])] = (float(r.geometry.x), float(r.geometry.y))

    node_features = [
        {
            "type": "Feature",
            "properties": {"node_id": nid},
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
        }
        for nid, (lon, lat) in sorted(nodes_lonlat.items())
    ]

    edge_features: list[dict] = []
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
                    "osm_id": data.get("osm_id"),
                    "name": data.get("name") or "",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[lon1, lat1], [lon2, lat2]],
                },
            }
        )

    # Ensure GraphML-serializable attributes
    for _, _, data in G.edges(data=True):
        data["length_m"] = float(data["length_m"])
        data["highway"] = str(data.get("highway") or "")
        data["name"] = str(data.get("name") or "")
        if data.get("osm_id") is None:
            data["osm_id"] = ""
        else:
            data["osm_id"] = str(data["osm_id"])
        data["edge_id"] = int(data.get("edge_id") or 0)
    for n in G.nodes:
        lon, lat = nodes_lonlat[n]
        G.nodes[n]["lon"] = lon
        G.nodes[n]["lat"] = lat
        G.nodes[n]["x"] = float(node_xy_m[n][0])
        G.nodes[n]["y"] = float(node_xy_m[n][1])

    write_geojson(OUT_NODES, "network_nodes", node_features)
    write_geojson(OUT_EDGES, "network_edges", edge_features)
    nx.write_graphml(G, OUT_GRAPH)

    comps = list(nx.connected_components(G))
    largest = max((len(c) for c in comps), default=0)
    summary = {
        "node_count": G.number_of_nodes(),
        "edge_count": G.number_of_edges(),
        "total_length_km": round(total_length / 1000.0, 3),
        "component_count": len(comps),
        "kept_components_min_edges": kept_components,
        "dropped_tiny_nodes": len(dropped_nodes),
        "largest_component_nodes": largest,
        "largest_component_share": round(largest / G.number_of_nodes(), 4)
        if G.number_of_nodes()
        else 0,
        "node_snap_m": NODE_SNAP_M,
        "edge_densify_m": EDGE_DENSE_M,
        "min_component_edges": MIN_COMPONENT_EDGES,
    }
    with OUT_SUMMARY.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        f.write("\n")

    print(f"Wrote {OUT_NODES} ({len(node_features)} nodes)")
    print(f"Wrote {OUT_EDGES} ({len(edge_features)} edges)")
    print(f"Wrote {OUT_GRAPH}")
    print(f"Wrote {OUT_SUMMARY}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
