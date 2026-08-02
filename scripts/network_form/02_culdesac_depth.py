#!/usr/bin/env python3
"""
Phase 1: cul-de-sac stub depth on the Network Form topology.

Rebuilds the same GN5+75 m street topology as 01_build_network_form_scopes.py,
then writes culdesacs_depth.geojson, culdesac_depth_summary.json, and
refreshes topology_edges.geojson under public/data/network-form/.
"""

from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from pathlib import Path

from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import unary_union

# Import shared builders from the Network Form scope script
sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util

_SPEC = importlib.util.spec_from_file_location(
    "nf01",
    Path(__file__).resolve().parent / "01_build_network_form_scopes.py",
)
nf01 = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(nf01)

ROOT = nf01.ROOT
OUT_DIR = nf01.OUT_DIR
GN_NAMES = nf01.GN_NAMES
DEPTH_SHORT_M = 50.0
DEPTH_LONG_M = 150.0


def depth_class(stub_m: float) -> str:
    if stub_m < DEPTH_SHORT_M:
        return "short"
    if stub_m <= DEPTH_LONG_M:
        return "medium"
    return "long"


def median(vals: list[float]) -> float | None:
    if not vals:
        return None
    s = sorted(vals)
    n = len(s)
    mid = n // 2
    if n % 2:
        return s[mid]
    return (s[mid - 1] + s[mid]) / 2


def mean(vals: list[float]) -> float | None:
    if not vals:
        return None
    return sum(vals) / len(vals)


def build_adj(edges: list) -> dict[int, list[tuple[int, float]]]:
    adj: dict[int, list[tuple[int, float]]] = defaultdict(list)
    for e in edges:
        u, v, L = e["u"], e["v"], float(e["length_m"])
        adj[u].append((v, L))
        adj[v].append((u, L))
    return adj


def dist_to_nearest_junction(
    start: int,
    adj: dict[int, list[tuple[int, float]]],
    nodes: dict,
) -> float | None:
    """Dijkstra to nearest three_way / four_way (can be 0 if start is already one)."""
    import heapq

    if nodes[start]["jtype"] in ("three_way", "four_way"):
        return 0.0
    dist = {start: 0.0}
    heap = [(0.0, start)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, math.inf):
            continue
        if u != start and nodes[u]["jtype"] in ("three_way", "four_way"):
            return d
        for v, w in adj.get(u, []):
            nd = d + w
            if nd < dist.get(v, math.inf):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return None


def summarize(rows: list[dict], label: str) -> dict:
    stubs = [r["stub_length_m"] for r in rows if r.get("stub_length_m") is not None]
    classes = {"short": 0, "medium": 0, "long": 0}
    corridor = 0
    interior = 0
    for r in rows:
        classes[r["depth_class"]] = classes.get(r["depth_class"], 0) + 1
        if r.get("in_corridor"):
            corridor += 1
        else:
            interior += 1
    return {
        "scope": label,
        "n": len(rows),
        "stub_length_m": {
            "median": None if median(stubs) is None else round(median(stubs), 1),
            "mean": None if mean(stubs) is None else round(mean(stubs), 1),
            "min": None if not stubs else round(min(stubs), 1),
            "max": None if not stubs else round(max(stubs), 1),
        },
        "depth_class_counts": classes,
        "corridor_n": corridor,
        "interior_n": interior,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    gn_path = nf01.first_existing(nf01.GN5_CANDIDATES)
    roads_path = nf01.first_existing(nf01.ROADS_CANDIDATES)
    print("GN:", gn_path)
    print("Roads:", roads_path)

    gn_fc = nf01.load_fc(gn_path)
    gn_m = {}
    for f in gn_fc["features"]:
        name = f["properties"].get("ADM4_EN")
        if name not in GN_NAMES:
            continue
        gn_m[name] = nf01.to_m(shape(f["geometry"]))

    if len(gn_m) != 5:
        raise SystemExit(f"Expected 5 GNs, got {list(gn_m)}")

    union_m = unary_union(list(gn_m.values()))
    buffer_m = union_m.buffer(nf01.BUFFER_M)

    roads_fc = nf01.load_fc(roads_path)
    street_lines_m = []
    corridor_lines_m = []
    for f in roads_fc["features"]:
        props = f.get("properties") or {}
        if not nf01.keep_street(props):
            continue
        try:
            g = shape(f["geometry"])
        except Exception:
            continue
        gm = nf01.to_m(g)
        clipped = gm.intersection(buffer_m)
        if clipped.is_empty:
            continue
        hw = nf01.highway_of(props)
        for part in nf01.iter_lines(clipped):
            if part.length < 0.5:
                continue
            street_lines_m.append(part)
            if hw in nf01.CORRIDOR_HIGHWAY:
                corridor_lines_m.append(part)

    nodes, edges = nf01.build_topology(street_lines_m)
    print(f"nodes={len(nodes)} edges={len(edges)}")

    corridor_union = (
        unary_union(corridor_lines_m).buffer(nf01.CORRIDOR_M) if corridor_lines_m else None
    )
    for nid, n in nodes.items():
        pt = Point(n["xy_m"])
        gn = nf01.assign_gn(pt, gn_m)
        n["gn_name"] = gn
        n["inside_primary"] = gn is not None
        n["inside_gn"] = gn is not None
        n["in_corridor"] = bool(corridor_union and corridor_union.contains(pt))

    # Full topology edges (refresh stale public file)
    edge_feats = []
    for e in edges:
        coords_m = e["coords_m"]
        line_m = LineString(coords_m)
        line_ll = nf01.to_ll(line_m)
        u, v = e["u"], e["v"]
        both_inside = bool(nodes[u]["inside_primary"] and nodes[v]["inside_primary"])
        edge_feats.append(
            {
                "type": "Feature",
                "properties": {
                    "edge_id": e["edge_id"],
                    "u": u,
                    "v": v,
                    "length_m": e["length_m"],
                    "both_inside_gn": both_inside,
                },
                "geometry": mapping(line_ll),
            }
        )
    nf01.write_fc(OUT_DIR / "topology_edges.geojson", edge_feats)
    print(f"Wrote topology_edges.geojson ({len(edge_feats)} edges)")

    adj = build_adj(edges)
    # Incident edge lookup for degree-1 nodes
    incident: dict[int, tuple[int, float]] = {}
    for e in edges:
        u, v, L = e["u"], e["v"], float(e["length_m"])
        if nodes[u]["jtype"] == "culdesac":
            incident[u] = (v, L)
        if nodes[v]["jtype"] == "culdesac":
            incident[v] = (u, L)

    cul_feats = []
    rows_all = []
    for nid, n in nodes.items():
        if n["jtype"] != "culdesac":
            continue
        if nid not in incident:
            raise SystemExit(f"Cul-de-sac {nid} has no incident edge")
        neigh_id, stub = incident[nid]
        neigh = nodes[neigh_id]
        d_junc = dist_to_nearest_junction(nid, adj, nodes)
        stub_r = round(stub, 3)
        d_r = None if d_junc is None else round(d_junc, 3)
        klass = depth_class(stub_r)
        lon, lat = nf01.TO_4326.transform(n["xy_m"][0], n["xy_m"][1])
        props = {
            "node_id": nid,
            "degree": n["degree"],
            "jtype": "culdesac",
            "gn_name": n["gn_name"],
            "inside_primary": n["inside_primary"],
            "inside_gn": n["inside_gn"],
            "in_corridor": n["in_corridor"],
            "stub_length_m": stub_r,
            "neighbor_node_id": neigh_id,
            "neighbor_jtype": neigh["jtype"],
            "dist_to_junction_m": d_r,
            "depth_class": klass,
        }
        cul_feats.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
            }
        )
        rows_all.append(props)

    nf01.write_fc(OUT_DIR / "culdesacs_depth.geojson", cul_feats)
    print(f"Wrote culdesacs_depth.geojson ({len(cul_feats)} cul-de-sacs)")

    primary_rows = [r for r in rows_all if r.get("inside_primary")]
    by_scope = {"all": summarize(primary_rows, "All GN Divisions")}
    for name in GN_NAMES:
        by_scope[name] = summarize(
            [r for r in primary_rows if r.get("gn_name") == name], name
        )

    summary = {
        "phase": 1,
        "depth_class_thresholds_m": {
            "short_lt": DEPTH_SHORT_M,
            "medium_to": DEPTH_LONG_M,
            "long_gt": DEPTH_LONG_M,
        },
        "inventory_primary_n": len(primary_rows),
        "inventory_total_n": len(rows_all),
        "by_scope": by_scope,
    }
    (OUT_DIR / "culdesac_depth_summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Wrote culdesac_depth_summary.json "
        f"primary_n={len(primary_rows)} median_stub="
        f"{by_scope['all']['stub_length_m']['median']}"
    )


if __name__ == "__main__":
    main()
