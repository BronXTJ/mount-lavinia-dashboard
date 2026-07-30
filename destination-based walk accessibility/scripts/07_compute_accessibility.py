#!/usr/bin/env python3
"""Phase 3: network walk accessibility from hex origins to destination groups."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import geopandas as gpd
import networkx as nx
from shapely.geometry import mapping

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent

GRAPH_PATH = PACKAGE_ROOT / "03_network" / "network_graph.graphml"
HEX_ORIGINS = PACKAGE_ROOT / "04_origins" / "hex_origins_primary.geojson"
POIS_SNAPPED = PACKAGE_ROOT / "04_origins" / "pois_snapped.geojson"
HEX_POLYGONS = (
    REPO_ROOT
    / "json_files"
    / "Primary study area final analysis 01"
    / "02_hex_grid"
    / "hex_grid_primary_100m.geojson"
)
OUT_HEX = PACKAGE_ROOT / "05_accessibility" / "access_hex_primary.geojson"
OUT_SUMMARY = PACKAGE_ROOT / "05_accessibility" / "access_primary_summary.json"

DEST_GROUPS = ["food", "education", "health", "transit", "finance", "open_space"]
WALK_M_PER_MIN = 80.0  # 4.8 km/h
THRESHOLDS_M = {5: 400.0, 10: 800.0, 15: 1200.0}
# Near-complete hexes stay in KPIs; only true incompletes are dropped from stats
AREA_RATIO_ANALYSIS = 0.90
AREA_RATIO_CORE = 0.95
AREA_RATIO_SLIVER = 0.50


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


def load_graph() -> nx.Graph:
    G = nx.read_graphml(GRAPH_PATH)
    G = nx.relabel_nodes(G, lambda n: int(n))
    for _, _, data in G.edges(data=True):
        data["length_m"] = float(data["length_m"])
    return G


def poi_sources_by_group(pois_path: Path) -> dict[str, list[int]]:
    with pois_path.open(encoding="utf-8") as f:
        feats = json.load(f)["features"]
    by_group: dict[str, list[int]] = defaultdict(list)
    for feat in feats:
        p = feat["properties"]
        if not p.get("snap_ok"):
            continue
        nid = p.get("node_id")
        if nid is None:
            continue
        by_group[p["dest_group"]].append(int(nid))
    # unique preserve order
    return {g: list(dict.fromkeys(by_group.get(g, []))) for g in DEST_GROUPS}


def distances_from_group(G: nx.Graph, sources: list[int]) -> dict[int, float]:
    if not sources:
        return {}
    # Keep only sources present in graph
    src = [n for n in sources if n in G]
    if not src:
        return {}
    return dict(
        nx.multi_source_dijkstra_path_length(G, sources=src, weight="length_m")
    )


def count_pois_within(
    G: nx.Graph,
    origin: int,
    poi_nodes: list[int],
    limit_m: float,
    dist_cache: dict[int, float] | None = None,
) -> int:
    """Count POIs within limit_m of origin using single-source distances."""
    if origin not in G or not poi_nodes:
        return 0
    # Prefer reverse lookup: for each poi, if multi-source dist from pois equals
    # path origin→poi only when we have all-pairs; cheaper: dijkstra from origin once
    # Callers pass precomputed single-source map from origin when available.
    if dist_cache is None:
        dist_cache = nx.single_source_dijkstra_path_length(
            G, origin, cutoff=limit_m, weight="length_m"
        )
    return sum(1 for n in poi_nodes if dist_cache.get(n, math.inf) <= limit_m)


def main() -> None:
    for path in (GRAPH_PATH, HEX_ORIGINS, POIS_SNAPPED, HEX_POLYGONS):
        if not path.is_file():
            raise SystemExit(f"Missing required input: {path}")

    print("Loading graph…")
    G = load_graph()
    print(f"  nodes={G.number_of_nodes()} edges={G.number_of_edges()}")

    sources = poi_sources_by_group(POIS_SNAPPED)
    for g, nodes in sources.items():
        print(f"  {g}: {len(nodes)} snapped POI nodes")

    # Multi-source nearest distance per group
    nearest: dict[str, dict[int, float]] = {}
    for g in DEST_GROUPS:
        print(f"Dijkstra multi-source: {g}…")
        nearest[g] = distances_from_group(G, sources[g])

    with HEX_ORIGINS.open(encoding="utf-8") as f:
        origins = {int(ft["properties"]["hex_id"]): ft["properties"] for ft in json.load(f)["features"]}

    polygons = gpd.read_file(HEX_POLYGONS)
    if polygons.crs is None:
        polygons = polygons.set_crs(4326)
    else:
        polygons = polygons.to_crs(4326)
    polygons["hex_id"] = polygons["id"].astype(int)

    # For count_*_10: single-source from each snapped hex once (reuse across groups)
    print("Computing per-hex metrics…")
    features: list[dict] = []
    metric_rows: list[dict] = []

    for _, row in polygons.iterrows():
        hex_id = int(row["hex_id"])
        o = origins.get(hex_id)
        if o is None:
            raise SystemExit(f"Missing origin for hex_id={hex_id}")

        hex_area = float(row["Hex_area"]) if row.get("Hex_area") is not None else (
            float(o["Hex_area"]) if o.get("Hex_area") is not None else None
        )
        hex_area_full = float(row["Hex_area_full"]) if row.get("Hex_area_full") is not None else None
        if hex_area is not None and hex_area_full and hex_area_full > 0:
            area_ratio = float(hex_area) / float(hex_area_full)
        else:
            area_ratio = None
        cclass = completeness_class(area_ratio)
        snap_ok = bool(o["snap_ok"])
        analysis_ok = bool(
            snap_ok
            and area_ratio is not None
            and area_ratio >= AREA_RATIO_ANALYSIS
        )

        props: dict = {
            "hex_id": hex_id,
            "is_edge": bool(o["is_edge"]),  # legacy grid flag (strict 0.999); not used for KPI gate
            "Hex_area": hex_area,
            "Hex_area_full": hex_area_full,
            "area_ratio": None if area_ratio is None else round(area_ratio, 6),
            "completeness_class": cclass,
            "snap_ok": snap_ok,
            "analysis_ok": analysis_ok,
            "node_id": int(o["node_id"]) if snap_ok and o.get("node_id") is not None else None,
        }

        reach10_flags: list[bool] = []
        origin_node = props["node_id"]
        dist_from_origin: dict[int, float] | None = None
        if snap_ok and origin_node is not None and origin_node in G:
            # cutoff 1200 m covers 15 min and count within 10
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
                ok = dist is not None and dist <= lim
                props[f"reach_{g}_{mins}"] = bool(ok)

            if dist_from_origin is not None:
                props[f"count_{g}_10"] = count_pois_within(
                    G, origin_node, sources[g], THRESHOLDS_M[10], dist_from_origin
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
        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": mapping(row.geometry),
            }
        )

    OUT_HEX.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "name": "access_hex_primary",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": features,
    }
    with OUT_HEX.open("w", encoding="utf-8") as f:
        json.dump(collection, f)
    print(f"Wrote {OUT_HEX} ({len(features)} hexes)")

    # Summary — near-complete (≥0.90) + snap_ok; not legacy is_edge
    analysis = [r for r in metric_rows if r["analysis_ok"] and r["access_score"] is not None]
    denom = len(analysis) if analysis else 1
    coverage: dict[str, dict[str, float]] = {}
    for g in DEST_GROUPS:
        coverage[g] = {}
        for mins in (5, 10, 15):
            key = f"reach_{g}_{mins}"
            share = sum(1 for r in analysis if r[key]) / denom if analysis else 0.0
            coverage[g][f"within_{mins}_min"] = round(share, 4)
        dists = [r[f"dist_{g}_m"] for r in analysis if r[f"dist_{g}_m"] is not None]
        coverage[g]["median_dist_m"] = (
            round(sorted(dists)[len(dists) // 2], 3) if dists else None
        )
        coverage[g]["mean_dist_m"] = (
            round(sum(dists) / len(dists), 3) if dists else None
        )

    scores = [r["access_score"] for r in analysis]
    deserts = [r for r in analysis if r["groups_within_10"] <= 2]
    by_class = {}
    for cname in ("core", "near_complete", "partial", "sliver", "unknown"):
        by_class[cname] = sum(1 for r in metric_rows if r["completeness_class"] == cname)

    summary = {
        "hex_count": len(metric_rows),
        "analysis_hex_count": len(analysis),
        "analysis_definition": "area_ratio>=0.90 AND snap_ok=true",
        "area_ratio_analysis_threshold": AREA_RATIO_ANALYSIS,
        "completeness_counts": by_class,
        "legacy_is_edge_note": "is_edge uses Hex_area/Hex_area_full<0.999; retained for reference only",
        "walk_speed_kmh": 4.8,
        "walk_m_per_min": WALK_M_PER_MIN,
        "thresholds_m": THRESHOLDS_M,
        "dest_groups": DEST_GROUPS,
        "coverage_analysis_ok": coverage,
        # backward-compatible alias used by older map04 readers
        "coverage_non_edge_snap_ok": coverage,
        "mean_access_score": round(sum(scores) / len(scores), 4) if scores else None,
        "median_access_score": round(sorted(scores)[len(scores) // 2], 4) if scores else None,
        "desert_count": len(deserts),
        "desert_definition": "analysis_ok AND groups_within_10 <= 2",
        "desert_share": round(len(deserts) / denom, 4) if analysis else None,
        "poi_sources_snapped": {g: len(sources[g]) for g in DEST_GROUPS},
    }
    with OUT_SUMMARY.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        f.write("\n")
    print(f"Wrote {OUT_SUMMARY}")
    print(
        json.dumps(
            {
                k: summary[k]
                for k in (
                    "analysis_hex_count",
                    "mean_access_score",
                    "desert_count",
                    "desert_share",
                    "completeness_counts",
                )
            },
            indent=2,
        )
    )
    print("Coverage within 10 min:")
    for g in DEST_GROUPS:
        print(f"  {g}: {coverage[g]['within_10_min']}")


if __name__ == "__main__":
    main()
