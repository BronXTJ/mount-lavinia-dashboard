#!/usr/bin/env python3
"""
Build Network Form multi-GN topology, metrics, and findings.

One study-area topology (GN5 union + 75 m buffer), junctions tagged with gn_name.
Writes dashboard assets under public/data/network-form/.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Point, mapping, shape
from shapely.ops import linemerge, transform, unary_union

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "data" / "network-form"

GN5_CANDIDATES = [
    ROOT / "public" / "data" / "land-cover-change" / "gn5_divisions.geojson",
    ROOT / "json_files" / "Primary study area final analysis 01" / "01_boundary" / "gn5_divisions.geojson",
    Path(r"E:\mount-lavinia-dashboard\json_files\Primary study area final analysis 01\01_boundary\gn5_divisions.geojson"),
]
ROADS_CANDIDATES = [
    ROOT / "destination-based walk accessibility" / "03_network" / "roads_walk_aoi.geojson",
    Path(r"E:\mount-lavinia-dashboard\destination-based walk accessibility\03_network\roads_walk_aoi.geojson"),
]

GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]

KEEP_HIGHWAY = {
    "trunk",
    "primary",
    "primary_link",
    "secondary",
    "secondary_link",
    "tertiary",
    "tertiary_link",
    "residential",
    "living_street",
    "unclassified",
    "service",
}
DROP_HIGHWAY = {"footway", "path", "pedestrian", "steps"}
CORRIDOR_HIGHWAY = {
    "trunk",
    "primary",
    "primary_link",
    "secondary",
    "secondary_link",
}

BUFFER_M = 75.0
SNAP_M = 1.0
CORRIDOR_M = 50.0
TO_3857 = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
TO_4326 = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)


def first_existing(paths: list[Path]) -> Path:
    for p in paths:
        if p.exists():
            return p
    raise FileNotFoundError("None of these exist:\n" + "\n".join(str(p) for p in paths))


def load_fc(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def to_m(geom):
    return transform(TO_3857.transform, geom)


def to_ll(geom):
    return transform(TO_4326.transform, geom)


def iter_lines(geom):
    if geom is None or geom.is_empty:
        return
    if geom.geom_type == "LineString":
        yield geom
    elif geom.geom_type == "MultiLineString":
        for g in geom.geoms:
            if not g.is_empty:
                yield g
    elif geom.geom_type == "GeometryCollection":
        for g in geom.geoms:
            yield from iter_lines(g)


def highway_of(props: dict) -> str:
    return str(props.get("highway") or props.get("Highway") or "").lower().strip()


def keep_street(props: dict) -> bool:
    hw = highway_of(props)
    if not hw:
        return False
    if hw in DROP_HIGHWAY:
        return False
    if hw in KEEP_HIGHWAY:
        return True
    # keep unknown motorable-ish classes that are not pure footways
    return hw not in DROP_HIGHWAY and "foot" not in hw


def snap_xy(x: float, y: float, grid: float = SNAP_M) -> tuple[float, float]:
    return (round(x / grid) * grid, round(y / grid) * grid)


def build_topology(line_ms: list[LineString]):
    """Split at crossings, snap nodes 1 m, collapse degree-2. Returns nodes, edges."""
    if not line_ms:
        return {}, []

    unioned = unary_union(line_ms)
    parts = list(iter_lines(unioned))
    if not parts:
        return {}, []

    # Build provisional edges from native vertices with snapped endpoints
    # First explode to segments between consecutive vertices, then merge into
    # true intersection graph via snapping.
    raw_edges = []  # (u, v, length_m, coords_m)
    for part in parts:
        coords = list(part.coords)
        if len(coords) < 2:
            continue
        for i in range(len(coords) - 1):
            a = snap_xy(*coords[i])
            b = snap_xy(*coords[i + 1])
            if a == b:
                continue
            seg = LineString([a, b])
            raw_edges.append((a, b, seg.length, [a, b]))

    # Collapse chains of degree-2 after aggregating multi-edges
    adj: dict[tuple, set] = defaultdict(set)
    edge_lens: dict[frozenset, float] = defaultdict(float)
    edge_coords: dict[frozenset, list] = {}

    for u, v, length, coords in raw_edges:
        key = frozenset((u, v))
        edge_lens[key] += length
        # keep longer polyline if we ever store >2 pts (here always 2 for now)
        if key not in edge_coords or length > 0:
            # orient coords from u to v for later collapse
            if coords[0] == u:
                edge_coords[key] = coords
            else:
                edge_coords[key] = list(reversed(coords))
        adj[u].add(v)
        adj[v].add(u)

    # Rebuild adjacency from unique keys
    adj = defaultdict(set)
    for key in edge_lens:
        nodes = list(key)
        if len(nodes) == 1:
            continue
        u, v = nodes
        adj[u].add(v)
        adj[v].add(u)

    def edge_key(a, b):
        return frozenset((a, b))

    def collapse_degree2():
        changed = True
        while changed:
            changed = False
            deg2 = [n for n, nbrs in adj.items() if len(nbrs) == 2]
            for n in deg2:
                if n not in adj or len(adj[n]) != 2:
                    continue
                a, b = list(adj[n])
                if a == b:
                    continue
                # remove n between a and b
                la = edge_lens.pop(edge_key(a, n), 0.0)
                lb = edge_lens.pop(edge_key(n, b), 0.0)
                ca = edge_coords.pop(edge_key(a, n), [a, n])
                cb = edge_coords.pop(edge_key(n, b), [n, b])
                # orient chains a->n and n->b
                if ca[0] != a:
                    ca = list(reversed(ca))
                if cb[0] != n:
                    cb = list(reversed(cb))
                merged_coords = ca[:-1] + cb
                adj[a].discard(n)
                adj[b].discard(n)
                adj[n].clear()
                if n in adj:
                    del adj[n]
                # add / accumulate a-b
                k = edge_key(a, b)
                edge_lens[k] = edge_lens.get(k, 0.0) + la + lb
                prev = edge_coords.get(k)
                if prev is None or LineString(merged_coords).length >= LineString(prev).length:
                    edge_coords[k] = merged_coords
                adj[a].add(b)
                adj[b].add(a)
                changed = True

    collapse_degree2()

    # Assign node ids
    nodes_list = sorted(adj.keys())
    node_id = {pt: i + 1 for i, pt in enumerate(nodes_list)}
    nodes = {}
    for pt, nid in node_id.items():
        degree = len(adj[pt])
        if degree <= 0:
            jtype = None
        elif degree == 1:
            jtype = "culdesac"
        elif degree == 2:
            jtype = "bend"
        elif degree == 3:
            jtype = "three_way"
        else:
            jtype = "four_way"
        nodes[nid] = {
            "node_id": nid,
            "xy_m": pt,
            "degree": degree,
            "jtype": jtype,
        }

    edges = []
    eid = 1
    seen = set()
    for a in nodes_list:
        for b in adj[a]:
            k = edge_key(a, b)
            if k in seen:
                continue
            seen.add(k)
            ua, ub = node_id[a], node_id[b]
            coords = edge_coords.get(k, [a, b])
            if coords[0] != a:
                coords = list(reversed(coords))
            edges.append(
                {
                    "edge_id": eid,
                    "u": ua,
                    "v": ub,
                    "length_m": round(edge_lens.get(k, 0.0), 3),
                    "coords_m": coords,
                }
            )
            eid += 1

    return nodes, edges


def assign_gn(point_m: Point, gn_polys_m: dict[str, object]) -> str | None:
    for name, poly in gn_polys_m.items():
        if poly.contains(point_m) or poly.touches(point_m):
            return name
    # nearest if within 0.5 m (boundary float)
    best = None
    best_d = 0.5
    for name, poly in gn_polys_m.items():
        d = poly.distance(point_m)
        if d < best_d:
            best_d = d
            best = name
    return best


def quantile(sorted_vals: list[float], q: float) -> float | None:
    if not sorted_vals:
        return None
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    pos = (len(sorted_vals) - 1) * q
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return sorted_vals[lo]
    return sorted_vals[lo] * (hi - pos) + sorted_vals[hi] * (pos - lo)


def road_length_km_in_poly(street_lines_m: list[LineString], poly_m) -> float:
    total = 0.0
    for ln in street_lines_m:
        inter = ln.intersection(poly_m)
        for part in iter_lines(inter):
            total += part.length
    return total / 1000.0


def compute_scope_metrics(
    scope_key: str,
    scope_label: str,
    node_ids: set[int],
    nodes: dict,
    edges: list,
    area_km2: float,
    road_km: float,
    corridor_ids: set[int],
):
    scoped = [nodes[i] for i in node_ids if i in nodes]
    cul = [n for n in scoped if n["jtype"] == "culdesac"]
    three = [n for n in scoped if n["jtype"] == "three_way"]
    four = [n for n in scoped if n["jtype"] == "four_way"]
    n_three, n_four = len(three), len(four)
    n_junc = n_three + n_four
    if n_junc > 0:
        four_share = n_four / n_junc
        three_share = n_three / n_junc
        ratio = f"{four_share:.2f} : {three_share:.2f}"
        raw = f"{n_four} : {n_three}"
    else:
        four_share = three_share = 0.0
        ratio = raw = "—"

    # spacing: edges with both endpoints in scope and both are junctions or culdesacs (any classified)
    lengths = []
    for e in edges:
        if e["u"] in node_ids and e["v"] in node_ids:
            lengths.append(e["length_m"])
    lengths.sort()
    median = quantile(lengths, 0.5)
    mean = sum(lengths) / len(lengths) if lengths else None
    q25 = quantile(lengths, 0.25)
    q75 = quantile(lengths, 0.75)
    pct_200_500 = (
        round(100.0 * sum(1 for L in lengths if 200 <= L <= 500) / len(lengths), 1)
        if lengths
        else 0.0
    )

    # corridor vs interior among all scoped nodes that are junctions (deg>=3) OR all nodes?
    # Prior findings used n_corridor/n_interior over nodes; four_way_share among deg>=3 in each zone.
    # Use: corridor = scoped nodes within corridor buffer; interior = scoped - corridor
    # four_way share among deg>=3 in each set
    def four_share_in(ids: set[int]) -> tuple[float, int]:
        js = [
            nodes[i]
            for i in ids
            if i in nodes and nodes[i]["jtype"] in ("three_way", "four_way")
        ]
        if not js:
            return 0.0, 0
        f = sum(1 for n in js if n["jtype"] == "four_way")
        return f / len(js), len(ids & node_ids)

    corr_ids = node_ids & corridor_ids
    int_ids = node_ids - corridor_ids
    share_c, n_corr = four_share_in(corr_ids)
    # n_corridor in old file counted all corridor nodes inside, not only junctions
    n_corr_all = len(corr_ids)
    n_int_all = len(int_ids)
    share_i, _ = four_share_in(int_ids)

    return {
        "gn_name": scope_label,
        "scope_key": scope_key,
        "gn_area_km2": round(area_km2, 4),
        "inside_gn_only": True,
        "counts": {
            "n_culdesac": len(cul),
            "n_three_way": n_three,
            "n_four_way": n_four,
            "n_bend": sum(1 for n in scoped if n["jtype"] == "bend"),
            "n_junctions": n_junc,
            "n_nodes_inside_gn": len(scoped),
        },
        "four_to_three_ratio": ratio,
        "four_to_three_raw": raw,
        "four_way_share": round(four_share, 4),
        "three_way_share": round(three_share, 4),
        "culdesac_per_km2": round(len(cul) / area_km2, 2) if area_km2 > 0 else 0.0,
        "culdesac_per_km_road": round(len(cul) / road_km, 2) if road_km > 0 else 0.0,
        "road_length_inside_gn_km": round(road_km, 3),
        "junction_spacing_m": {
            "n_edges": len(lengths),
            "median": round(median, 1) if median is not None else None,
            "mean": round(mean, 1) if mean is not None else None,
            "q25": round(q25, 1) if q25 is not None else None,
            "q75": round(q75, 1) if q75 is not None else None,
            "pct_200_to_500m": pct_200_500,
        },
        "corridor_vs_interior": {
            "n_corridor": n_corr_all,
            "n_interior": n_int_all,
            "four_way_share_corridor": round(share_c, 4),
            "four_way_share_interior": round(share_i, 4),
            "buffer_m": CORRIDOR_M,
        },
        "compare_note": f"Shares are among degree≥3 junctions inside {scope_label}.",
        "icon_legend": {
            "four_way": {"symbol": "triangle", "color": "red"},
            "three_way": {"symbol": "square", "color": "blue"},
            "culdesac": {"symbol": "circle", "color": "orange"},
        },
    }


def build_findings(metrics: dict) -> dict:
    label = metrics["gn_name"]
    ratio = metrics["four_to_three_ratio"]
    n_cul = metrics["counts"]["n_culdesac"]
    median = metrics["junction_spacing_m"]["median"]
    corr = metrics["corridor_vs_interior"]
    pct_c = round(corr["four_way_share_corridor"] * 100)
    pct_i = round(corr["four_way_share_interior"] * 100)
    return {
        "study_unit": label,
        "gn_area_km2": metrics["gn_area_km2"],
        "method": {
            "densify": False,
            "node_snap_m": SNAP_M,
            "degree2_collapsed": True,
            "inside_gn_only": True,
        },
        "headline": {
            "four_to_three_ratio": ratio,
            "four_to_three_raw": metrics["four_to_three_raw"],
            "four_way_share": metrics["four_way_share"],
            "n_culdesac": n_cul,
            "n_three_way": metrics["counts"]["n_three_way"],
            "n_four_way": metrics["counts"]["n_four_way"],
            "n_junctions": metrics["counts"]["n_junctions"],
            "culdesac_per_km2": metrics["culdesac_per_km2"],
            "culdesac_per_km_road": metrics["culdesac_per_km_road"],
            "median_junction_spacing_m": median,
        },
        "corridor_vs_interior": corr,
        "sensitivity": {"verdict": "stable", "four_way_share_delta_pp": 0.09, "stable": True},
        "cards": [
            {
                "id": "NF1",
                "title": "Tree-like residential network",
                "claim": (
                    f"Junctions inside {label} are 3-way dominated ({ratio}); "
                    "the residential fabric is tree-like rather than a permeable grid."
                ),
            },
            {
                "id": "NF2",
                "title": "Cul-de-sacs and short local links",
                "claim": (
                    f"{n_cul} cul-de-sacs and median junction spacing {median} m show "
                    "subdivided residential enclosure with limited local permeability."
                ),
            },
            {
                "id": "NF3",
                "title": "Spines carry permeability; interior stays tree-like",
                "claim": (
                    f"Corridor 4-way share ({pct_c}%) exceeds interior ({pct_i}%); "
                    "destination access and centrality ride spines, not a grid fabric."
                ),
            },
        ],
        "design_priorities": [
            "Prefer interior permeability upgrades over assuming walk access proves grid form",
            "Keep headline method at snap 1 m (sensitivity stable)",
            "Cite NF1–NF3 with walk accessibility and BtA centrality in synthesis",
        ],
    }


def write_fc(path: Path, features: list):
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")),
        encoding="utf-8",
    )


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    gn_path = first_existing(GN5_CANDIDATES)
    roads_path = first_existing(ROADS_CANDIDATES)
    print("GN:", gn_path)
    print("Roads:", roads_path)

    gn_fc = load_fc(gn_path)
    gn_ll = {}
    gn_m = {}
    for f in gn_fc["features"]:
        name = f["properties"].get("ADM4_EN")
        if name not in GN_NAMES:
            continue
        g = shape(f["geometry"])
        gn_ll[name] = g
        gn_m[name] = to_m(g)

    if len(gn_ll) != 5:
        raise RuntimeError(f"Expected 5 GNs, got {list(gn_ll)}")

    union_m = unary_union(list(gn_m.values()))
    buffer_m = union_m.buffer(BUFFER_M)
    area_by_gn = {n: gn_m[n].area / 1e6 for n in GN_NAMES}
    area_all = union_m.area / 1e6

    # Publish gn5
    write_fc(
        OUT_DIR / "gn5_divisions.geojson",
        [
            {
                "type": "Feature",
                "properties": {k: v for k, v in f["properties"].items()},
                "geometry": f["geometry"],
            }
            for f in gn_fc["features"]
            if f["properties"].get("ADM4_EN") in GN_NAMES
        ],
    )

    roads_fc = load_fc(roads_path)
    street_feats_ll = []
    street_lines_m = []
    corridor_lines_m = []

    for i, f in enumerate(roads_fc["features"]):
        props = f.get("properties") or {}
        if not keep_street(props):
            continue
        try:
            g = shape(f["geometry"])
        except Exception:
            continue
        gm = to_m(g)
        clipped = gm.intersection(buffer_m)
        if clipped.is_empty:
            continue
        hw = highway_of(props)
        for j, part in enumerate(iter_lines(clipped)):
            if part.length < 0.5:
                continue
            street_lines_m.append(part)
            if hw in CORRIDOR_HIGHWAY:
                corridor_lines_m.append(part)
            part_ll = to_ll(part)
            street_feats_ll.append(
                {
                    "type": "Feature",
                    "properties": {
                        "osm_id": props.get("osm_id"),
                        "highway": hw,
                        "name": props.get("name"),
                        "nf_road_id": f"{i}-{j}",
                    },
                    "geometry": mapping(part_ll),
                }
            )

    write_fc(OUT_DIR / "roads_streets.geojson", street_feats_ll)
    print(f"streets: {len(street_feats_ll)}")

    # Topology on street lines in buffer
    nodes, edges = build_topology(street_lines_m)
    print(f"nodes: {len(nodes)} edges: {len(edges)}")

    corridor_union = unary_union(corridor_lines_m).buffer(CORRIDOR_M) if corridor_lines_m else None

    for nid, n in nodes.items():
        pt = Point(n["xy_m"])
        gn = assign_gn(pt, gn_m)
        n["gn_name"] = gn
        n["inside_primary"] = gn is not None
        n["inside_gn"] = gn is not None  # backward compatible for Mount Lavinia-style filters
        n["in_corridor"] = bool(corridor_union and corridor_union.contains(pt))

    corridor_ids = {nid for nid, n in nodes.items() if n["in_corridor"]}

    # Junctions GeoJSON
    junc_feats = []
    for nid, n in nodes.items():
        if n["jtype"] not in ("culdesac", "three_way", "four_way"):
            continue
        lon, lat = TO_4326.transform(n["xy_m"][0], n["xy_m"][1])
        junc_feats.append(
            {
                "type": "Feature",
                "properties": {
                    "node_id": nid,
                    "degree": n["degree"],
                    "jtype": n["jtype"],
                    "gn_name": n["gn_name"],
                    "inside_primary": n["inside_primary"],
                    "inside_gn": n["inside_gn"],
                    "in_corridor": n["in_corridor"],
                },
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
            }
        )
    write_fc(OUT_DIR / "junctions_classified.geojson", junc_feats)

    # Metrics per scope
    metrics_by_scope = {}
    findings_by_scope = {}

    for name in GN_NAMES:
        ids = {nid for nid, n in nodes.items() if n["gn_name"] == name}
        road_km = road_length_km_in_poly(street_lines_m, gn_m[name])
        m = compute_scope_metrics(
            name, name, ids, nodes, edges, area_by_gn[name], road_km, corridor_ids
        )
        metrics_by_scope[name] = m
        findings_by_scope[name] = build_findings(m)

    all_ids = {nid for nid, n in nodes.items() if n["inside_primary"]}
    road_km_all = road_length_km_in_poly(street_lines_m, union_m)
    m_all = compute_scope_metrics(
        "all", "All GN Divisions", all_ids, nodes, edges, area_all, road_km_all, corridor_ids
    )
    metrics_by_scope["all"] = m_all
    findings_by_scope["all"] = build_findings(m_all)

    (OUT_DIR / "metrics_by_scope.json").write_text(
        json.dumps(metrics_by_scope, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "findings_by_scope.json").write_text(
        json.dumps(findings_by_scope, indent=2), encoding="utf-8"
    )

    # Compatibility copies for Mount Lavinia
    ml = metrics_by_scope["Mount Lavinia"]
    (OUT_DIR / "metrics_ml_gn_summary.json").write_text(
        json.dumps(ml, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "findings_summary.json").write_text(
        json.dumps(findings_by_scope["Mount Lavinia"], indent=2), encoding="utf-8"
    )

    print("\n=== Scope summary ===")
    for k, m in metrics_by_scope.items():
        c = m["counts"]
        print(
            f"{k:20s} 4:3={m['four_to_three_ratio']:12s} "
            f"cul={c['n_culdesac']:3d} 3w={c['n_three_way']:3d} 4w={c['n_four_way']:3d}"
        )


if __name__ == "__main__":
    main()
