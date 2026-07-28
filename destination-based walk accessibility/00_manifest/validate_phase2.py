#!/usr/bin/env python3
"""Phase 2 gate: walk network + snapped origins. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import networkx as nx

PACKAGE_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "00_manifest/METHODS_PHASE2.md",
    "03_network/raw/roads_osm_raw.geojson",
    "03_network/roads_walk_aoi.geojson",
    "03_network/network_nodes.geojson",
    "03_network/network_edges.geojson",
    "03_network/network_graph.graphml",
    "03_network/network_summary.json",
    "04_origins/hex_origins_primary.geojson",
    "04_origins/pois_snapped.geojson",
    "04_origins/origins_snap_summary.json",
]

HEX_FIELDS = ["hex_id", "is_edge", "Hex_area", "node_id", "snap_dist_m", "snap_ok"]
POI_FIELDS = ["poi_id", "dest_group", "node_id", "snap_dist_m", "snap_ok"]


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED_FILES:
        if not (PACKAGE_ROOT / rel).is_file():
            fail(f"Missing file: {rel}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    try:
        G = nx.read_graphml(PACKAGE_ROOT / "03_network/network_graph.graphml")
    except Exception as exc:  # noqa: BLE001
        fail(f"Cannot load GraphML: {exc}", errors)
        G = None

    if G is not None:
        if G.number_of_nodes() < 100:
            fail(f"Graph too small: {G.number_of_nodes()} nodes", errors)
        if G.number_of_edges() < 100:
            fail(f"Graph too small: {G.number_of_edges()} edges", errors)

    net_summary = load_json(PACKAGE_ROOT / "03_network/network_summary.json")
    if net_summary.get("total_length_km", 0) < 10:
        fail(f"Network length too small: {net_summary.get('total_length_km')} km", errors)

    roads = load_json(PACKAGE_ROOT / "03_network/roads_walk_aoi.geojson")
    if len(roads.get("features", [])) < 50:
        fail(f"roads_walk_aoi too small: {len(roads.get('features', []))}", errors)

    hexes = load_json(PACKAGE_ROOT / "04_origins/hex_origins_primary.geojson")
    hex_feats = hexes.get("features", [])
    if len(hex_feats) != 447:
        fail(f"Expected 447 hex origins, got {len(hex_feats)}", errors)

    for i, feat in enumerate(hex_feats[:5]):
        props = feat.get("properties") or {}
        for field in HEX_FIELDS:
            if field not in props:
                fail(f"Hex feature missing {field}", errors)
                break
        if feat.get("geometry", {}).get("type") != "Point":
            fail(f"Hex {i}: geometry must be Point", errors)

    pois = load_json(PACKAGE_ROOT / "04_origins/pois_snapped.geojson")
    poi_feats = pois.get("features", [])
    if len(poi_feats) < 50:
        fail(f"pois_snapped too small: {len(poi_feats)}", errors)
    for field in POI_FIELDS:
        if field not in (poi_feats[0].get("properties") or {}):
            fail(f"POI feature missing {field}", errors)

    snap = load_json(PACKAGE_ROOT / "04_origins/origins_snap_summary.json")
    poi_share = float(snap.get("poi_snap_ok_share") or 0)
    # Analysis-grade hexes: non-edge cells (edge/coast often >50 m from roads)
    non_edge_share = snap.get("hex_non_edge_snap_ok_share")
    if non_edge_share is None:
        non_edge_ok = sum(
            1
            for f in hex_feats
            if (not f["properties"].get("is_edge")) and f["properties"].get("snap_ok")
        )
        non_edge_n = sum(1 for f in hex_feats if not f["properties"].get("is_edge"))
        non_edge_share = (non_edge_ok / non_edge_n) if non_edge_n else 0
    else:
        non_edge_share = float(non_edge_share)

    if poi_share < 0.90:
        fail(f"POI snap_ok share {poi_share:.3f} < 0.90", errors)
    if non_edge_share < 0.90:
        fail(f"Non-edge hex snap_ok share {non_edge_share:.3f} < 0.90", errors)

    if snap.get("hex_count") != len(hex_feats):
        fail("origins_snap_summary hex_count mismatch", errors)
    if snap.get("poi_count") != len(poi_feats):
        fail("origins_snap_summary poi_count mismatch", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  graph nodes/edges: {G.number_of_nodes()}/{G.number_of_edges()}")
    print(f"  network km: {net_summary.get('total_length_km')}")
    print(f"  hex snap_ok share (all): {snap.get('hex_snap_ok_share')}")
    print(f"  hex snap_ok share (non-edge): {non_edge_share}")
    print(f"  poi snap_ok share: {poi_share}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
