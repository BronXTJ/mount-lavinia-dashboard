#!/usr/bin/env python3
"""Marshall (2005) morphology for the five Network Form GN divisions.

Each GN is clipped and noded on its own. See METHODS_MARSHALL_ML_GN.md.
Does not modify Network Form dashboard metrics.
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Point, mapping, shape
from shapely.ops import polygonize, transform, unary_union

ROOT = Path(__file__).resolve().parents[2]
NF = ROOT / "public" / "data" / "network-form"
OUT = NF / "marshall"
GN5_PATH = NF / "gn5_divisions.geojson"
ROADS_PATH = NF / "roads_streets.geojson"
SCOPE_METRICS = NF / "metrics_by_scope.json"
TABLES = ROOT / "network_form" / "marshall_matrix" / "results" / "tables"

SNAP_M = 1.0
MIN_SEG_M = 0.5
MIN_CELL_M2 = 100.0
BOUNDARY_CUL_M = 1.0
BOUNDARY_BUFFER_M = 80.0  # metres; roads within this buffer of the GN edge are kept whole for cell detection
SNAP_M_CELL = 1.0  # snap grid for cell Stream 2; junction snap stays SNAP_M (1.0 m)
GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]
ML_NAME = "Mount Lavinia"

TO_M = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
TO_LL = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)


def load_fc(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def to_m(geom):
    return transform(TO_M.transform, geom)


def to_ll(geom):
    return transform(TO_LL.transform, geom)


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


def snap_xy(x: float, y: float, grid: float = SNAP_M) -> tuple[float, float]:
    return (round(x / grid) * grid, round(y / grid) * grid)


def write_fc(path: Path, features: list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")),
        encoding="utf-8",
    )


def quadrant(cell_ratio: float, t_ratio: float) -> str:
    t_side = t_ratio >= 0.5
    cell_side = cell_ratio >= 0.5
    if t_side and cell_side:
        return "T-cell"
    if t_side and not cell_side:
        return "T-tree"
    if not t_side and cell_side:
        return "X-cell"
    return "X-tree"


def build_graph(parts: list[LineString]):
    """Snap vertices, unique edges, collapse degree-2. Returns adj, edge_coords."""
    raw = []
    for part in parts:
        coords = [snap_xy(x, y) for x, y in part.coords]
        for i in range(len(coords) - 1):
            a, b = coords[i], coords[i + 1]
            if a == b:
                continue
            raw.append((a, b, LineString([a, b]).length))

    edge_lens: dict[frozenset, float] = defaultdict(float)
    edge_coords: dict[frozenset, list] = {}
    for u, v, length in raw:
        key = frozenset((u, v))
        edge_lens[key] += length
        edge_coords[key] = [u, v] if (u, v) == (list(key)[0], list(key)[1]) or True else [u, v]
        if edge_coords[key][0] != u:
            # keep a consistent orientation from the last write
            edge_coords[key] = [u, v]

    adj: dict[tuple, set] = defaultdict(set)
    for key in list(edge_lens):
        nodes = list(key)
        if len(nodes) != 2:
            edge_lens.pop(key, None)
            edge_coords.pop(key, None)
            continue
        u, v = nodes
        adj[u].add(v)
        adj[v].add(u)

    def edge_key(a, b):
        return frozenset((a, b))

    changed = True
    while changed:
        changed = False
        deg2 = [n for n, nbrs in list(adj.items()) if len(nbrs) == 2]
        for n in deg2:
            if n not in adj or len(adj[n]) != 2:
                continue
            a, b = list(adj[n])
            if a == b:
                continue
            la = edge_lens.pop(edge_key(a, n), 0.0)
            lb = edge_lens.pop(edge_key(n, b), 0.0)
            edge_coords.pop(edge_key(a, n), None)
            edge_coords.pop(edge_key(n, b), None)
            adj[a].discard(n)
            adj[b].discard(n)
            del adj[n]
            k = edge_key(a, b)
            edge_lens[k] = edge_lens.get(k, 0.0) + la + lb
            edge_coords[k] = [a, b]
            adj[a].add(b)
            adj[b].add(a)
            changed = True

    return adj, edge_lens


def snapped_linework(parts: list[LineString], snap_m: float = SNAP_M) -> list[LineString]:
    lines = []
    for part in parts:
        coords = [snap_xy(x, y, grid=snap_m) for x, y in part.coords]
        cleaned = [coords[0]]
        for c in coords[1:]:
            if c != cleaned[-1]:
                cleaned.append(c)
        if len(cleaned) >= 2:
            lines.append(LineString(cleaned))
    return lines


def maybe_png(out_path: Path, cell_ratio: float, t_ratio: float, label: str) -> bool:
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return False

    fig, ax = plt.subplots(figsize=(6.2, 6.2))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_aspect("equal")
    ax.set_xlabel("Cell-ratio")
    ax.set_ylabel("T-ratio")
    ax.grid(True, linestyle=":", linewidth=0.6)
    ax.scatter([cell_ratio], [t_ratio], s=40, c="#0f172a", zorder=3)
    ax.annotate(label, (cell_ratio, t_ratio), textcoords="offset points", xytext=(6, 6), fontsize=9)
    ax.text(0.02, 0.98, "T-tree", va="top", fontsize=8, color="#475569")
    ax.text(0.98, 0.98, "T-cell", va="top", ha="right", fontsize=8, color="#475569")
    ax.text(0.02, 0.02, "X-tree", va="bottom", fontsize=8, color="#475569")
    ax.text(0.98, 0.02, "X-cell", va="bottom", ha="right", fontsize=8, color="#475569")
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=140)
    plt.close(fig)
    return True


def polygon_m(feature: dict):
    geom = to_m(shape(feature["geometry"]))
    if geom.geom_type == "MultiPolygon":
        return max(geom.geoms, key=lambda g: g.area)
    if geom.geom_type != "Polygon":
        raise RuntimeError(f"GN geometry is {geom.geom_type}")
    return geom


def analyze_gn(gn_name: str, gn_pcode: str, gn_poly, roads: dict, dash_counts: dict) -> dict:
    clipped_m: list[LineString] = []
    clipped_feats = []
    for i, f in enumerate(roads["features"]):
        g = to_m(shape(f["geometry"]))
        inter = g.intersection(gn_poly)
        if inter.is_empty:
            continue
        for j, part in enumerate(iter_lines(inter)):
            if part.length < MIN_SEG_M:
                continue
            clipped_m.append(part)
            props = dict(f.get("properties") or {})
            props["marshall_clip_id"] = f"{i}-{j}"
            props["gn_name"] = gn_name
            clipped_feats.append(
                {
                    "type": "Feature",
                    "properties": props,
                    "geometry": mapping(to_ll(part)),
                }
            )

    if not clipped_m:
        raise RuntimeError(f"No street fragments inside {gn_name} GN")

    # --- Stream 1: junction graph uses strictly clipped roads (T, X, cul counts unchanged) ---
    noded_j = unary_union(clipped_m)
    parts_j = [p for p in iter_lines(noded_j) if p.length >= MIN_SEG_M]
    adj, edge_lens = build_graph(parts_j)

    # --- Stream 2: cell polygonization uses full road geometry within buffer ---
    # Roads that cross the GN boundary are kept whole so polygonize can close
    # blocks that straddle the boundary.  Cell attribution is handled below by the
    # poly.intersects(gn_poly) pre-check plus the 50 % area-overlap filter.
    gn_poly_buffered = gn_poly.buffer(BOUNDARY_BUFFER_M)
    cell_lines: list[LineString] = []
    for f in roads["features"]:
        g = to_m(shape(f["geometry"]))
        if not g.intersects(gn_poly_buffered):
            continue
        for part in iter_lines(g):
            if part.length < MIN_SEG_M:
                continue
            cell_lines.append(part)
    noded_c = unary_union(cell_lines)
    parts_c = [p for p in iter_lines(noded_c) if p.length >= MIN_SEG_M]
    linework_c = snapped_linework(parts_c, snap_m=SNAP_M_CELL)

    nodes_sorted = sorted(adj.keys())
    node_id = {pt: i + 1 for i, pt in enumerate(nodes_sorted)}

    t_feats = []
    x_feats = []
    cul_feats = []
    topo_node_feats = []
    n_t = n_x = n_deg5 = n_cul = n_cul_excl = 0

    for pt, nid in node_id.items():
        degree = len(adj[pt])
        if degree < 1:
            continue
        p = Point(pt)
        if not gn_poly.covers(p) and gn_poly.distance(p) > SNAP_M:
            continue
        lon, lat = TO_LL.transform(pt[0], pt[1])
        on_boundary = gn_poly.boundary.distance(p) <= BOUNDARY_CUL_M
        jtype = None
        marshall_cul = False
        exclusion = None
        if degree == 1:
            if on_boundary:
                n_cul_excl += 1
                exclusion = "boundary_artifact"
                jtype = "culdesac"
            else:
                n_cul += 1
                marshall_cul = True
                jtype = "culdesac"
        elif degree == 2:
            jtype = "bend"
        elif degree == 3:
            n_t += 1
            jtype = "three_way"
        else:
            n_x += 1
            if degree >= 5:
                n_deg5 += 1
            jtype = "four_way"

        props = {
            "node_id": nid,
            "degree": degree,
            "jtype": jtype,
            "gn_name": gn_name,
            "gn_pcode": gn_pcode,
            "on_boundary": on_boundary,
            "marshall_cul": marshall_cul,
            "exclusion_reason": exclusion,
        }
        feat = {
            "type": "Feature",
            "properties": props,
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
        }
        topo_node_feats.append(feat)
        if jtype == "three_way":
            t_feats.append(feat)
        elif jtype == "four_way":
            x_feats.append(feat)
        elif jtype == "culdesac":
            cul_feats.append(feat)

    edge_feats = []
    eid = 0
    for key, length in edge_lens.items():
        nodes = list(key)
        if len(nodes) != 2:
            continue
        a, b = nodes
        eid += 1
        line = to_ll(LineString([a, b]))
        edge_feats.append(
            {
                "type": "Feature",
                "properties": {
                    "edge_id": eid,
                    "u": node_id.get(a),
                    "v": node_id.get(b),
                    "length_m": round(length, 3),
                    "gn_name": gn_name,
                },
                "geometry": mapping(line),
            }
        )

    cells = []
    cells_m: list = []  # parallel list — Shapely poly in EPSG:3857
    cid = 0
    for poly in polygonize(linework_c):
        if poly.is_empty or poly.area < MIN_CELL_M2:
            continue
        # Fast reject: skip faces with no overlap with the GN at all.
        # Using intersects (not contains) so boundary-straddling cells are not
        # dropped before the 50 % overlap test runs.
        if not poly.intersects(gn_poly):
            continue
        overlap = gn_poly.intersection(poly).area
        if poly.area <= 0 or overlap / poly.area < 0.5:
            continue
        cid += 1
        cent = poly.centroid
        clon, clat = TO_LL.transform(cent.x, cent.y)
        cells.append(
            {
                "type": "Feature",
                "properties": {
                    "cell_id": cid,
                    "area_m2": round(poly.area, 2),
                    "centroid_lon": clon,
                    "centroid_lat": clat,
                    "gn_name": gn_name,
                    "gn_pcode": gn_pcode,
                    "nested_in": None,
                },
                "geometry": mapping(to_ll(poly)),
            }
        )
        cells_m.append(poly)

    # A cell is nested if its EPSG:3857 polygon lies within another cell's polygon.
    # This happens when two disconnected road components produce overlapping planar faces.
    nested_in: dict[int, int] = {}  # inner cell_id → outer cell_id
    for i, poly_i in enumerate(cells_m):
        parents = [
            (j, cells_m[j].area)
            for j in range(len(cells_m))
            if i != j and poly_i.within(cells_m[j])
        ]
        if parents:
            # immediate parent = smallest containing polygon
            best_j = min(parents, key=lambda x: x[1])[0]
            outer_cid = cells[best_j]["properties"]["cell_id"]
            inner_cid = cells[i]["properties"]["cell_id"]
            nested_in[inner_cid] = outer_cid
            cells[i]["properties"]["nested_in"] = outer_cid

    # Subtract each direct inner polygon from its outer cell so the outer
    # GeoJSON polygon is a donut and the stored area is not double-counted.
    inner_polys_by_outer: dict[int, list] = defaultdict(list)
    for inner_cid, outer_cid in nested_in.items():
        inner_idx = next(k for k, c in enumerate(cells) if c["properties"]["cell_id"] == inner_cid)
        inner_polys_by_outer[outer_cid].append(cells_m[inner_idx])

    for j, cell in enumerate(cells):
        cid_j = cell["properties"]["cell_id"]
        if cid_j in inner_polys_by_outer:
            corrected = cells_m[j]
            for inner_p in inner_polys_by_outer[cid_j]:
                corrected = corrected.difference(inner_p)
            cells[j]["properties"]["area_m2"] = round(corrected.area, 2)
            cells[j]["geometry"] = mapping(to_ll(corrected))

    n_nested = len(nested_in)
    n_cell = len(cells)
    n_tx = n_t + n_x
    n_struct = n_cell + n_cul
    if n_tx > 0 and n_struct > 0:
        t_ratio = n_t / n_tx
        x_ratio = n_x / n_tx
        cell_ratio = n_cell / n_struct
        cul_ratio = n_cul / n_struct
        quad = quadrant(cell_ratio, t_ratio)
    else:
        t_ratio = x_ratio = cell_ratio = cul_ratio = None
        quad = None

    metrics = {
        "gn_name": gn_name,
        "gn_pcode": gn_pcode,
        "framework": "marshall_2005",
        "counts": {
            "n_T": n_t,
            "n_X": n_x,
            "n_cul_marshall": n_cul,
            "n_cell_marshall": n_cell,
            "n_cells_nested": n_nested,
            "n_cul_boundary_excluded": n_cul_excl,
            "n_degree5_plus": n_deg5,
        },
        "ratios": {
            "T_ratio": t_ratio,
            "X_ratio": x_ratio,
            "Cell_ratio": cell_ratio,
            "Cul_ratio": cul_ratio,
        },
        "matrix": {
            "x_cell_ratio": cell_ratio,
            "y_t_ratio": t_ratio,
            "quadrant": quad,
        },
        "comparison_network_form": {
            "n_culdesac_dashboard": dash_counts.get("n_culdesac"),
            "n_three_way_dashboard": dash_counts.get("n_three_way"),
            "n_four_way_dashboard": dash_counts.get("n_four_way"),
            "note": (
                "Dashboard cul-de-sacs are degree-1 nodes from the Network Form topology "
                "without the Marshall boundary rule. Dashboard junctions are not Marshall T/X counts."
            ),
        },
        "run_meta_ref": "run_meta.json",
    }

    return {
        "metrics": metrics,
        "clipped_feats": clipped_feats,
        "clipped_segments": len(clipped_m),
        "noded_parts": len(parts_j),
        "topo_node_feats": topo_node_feats,
        "edge_feats": edge_feats,
        "cells": cells,
        "cul_feats": cul_feats,
        "t_feats": t_feats,
        "x_feats": x_feats,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    gn_fc = load_fc(GN5_PATH)
    by_name = {}
    for feature in gn_fc["features"]:
        props = feature.get("properties") or {}
        name = props.get("ADM4_EN")
        if name in GN_NAMES:
            by_name[name] = feature
    missing = [name for name in GN_NAMES if name not in by_name]
    if missing:
        raise RuntimeError(f"GN polygons missing: {missing}")

    roads = load_fc(ROADS_PATH)
    scope_metrics = load_fc(SCOPE_METRICS)
    results = []
    for name in GN_NAMES:
        feature = by_name[name]
        pcode = (feature.get("properties") or {}).get("ADM4_PCODE")
        if not pcode:
            raise RuntimeError(f"Missing ADM4_PCODE for {name}")
        dash = (scope_metrics.get(name) or {}).get("counts") or {}
        results.append(analyze_gn(name, pcode, polygon_m(feature), roads, dash))

    cells_all = []
    cul_all = []
    t_all = []
    x_all = []
    for result in results:
        cells_all.extend(result["cells"])
        cul_all.extend(result["cul_feats"])
        t_all.extend(result["t_feats"])
        x_all.extend(result["x_feats"])

    write_fc(OUT / "cells_all.geojson", cells_all)

    nesting_rows = []
    for result in results:
        gn = result["metrics"]["gn_name"]
        cell_area = {c["properties"]["cell_id"]: c["properties"]["area_m2"] for c in result["cells"]}
        for cell in result["cells"]:
            outer_id = cell["properties"]["nested_in"]
            if outer_id is not None:
                nesting_rows.append(
                    {
                        "gn_name": gn,
                        "inner_cell_id": cell["properties"]["cell_id"],
                        "inner_area_m2": cell["properties"]["area_m2"],
                        "outer_cell_id": outer_id,
                        "outer_area_m2": cell_area.get(outer_id, ""),
                    }
                )
    TABLES.mkdir(parents=True, exist_ok=True)
    with open(TABLES / "marshall_cells_nesting.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "gn_name",
                "inner_cell_id",
                "inner_area_m2",
                "outer_cell_id",
                "outer_area_m2",
            ],
        )
        writer.writeheader()
        writer.writerows(nesting_rows)

    write_fc(OUT / "culdesacs_all.geojson", cul_all)
    write_fc(OUT / "junctions_t_all.geojson", t_all)
    write_fc(OUT / "junctions_x_all.geojson", x_all)

    scopes = [result["metrics"] for result in results]
    (OUT / "marshall_scopes.json").write_text(json.dumps({"scopes": scopes}, indent=2), encoding="utf-8")

    ml = next(result for result in results if result["metrics"]["gn_name"] == ML_NAME)
    ml_metrics = ml["metrics"]
    ml_matrix = ml_metrics["matrix"]
    fig_rel = "figures/marshall_matrix_mount_lavinia.png"
    wrote_png = False
    if ml_matrix.get("x_cell_ratio") is not None and ml_matrix.get("y_t_ratio") is not None:
        wrote_png = maybe_png(OUT / fig_rel, ml_matrix["x_cell_ratio"], ml_matrix["y_t_ratio"], ML_NAME)

    run_meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "gn_name": ML_NAME,
        "gn_pcode": ml_metrics["gn_pcode"],
        "gn_names": GN_NAMES,
        "boundary": "public/data/network-form/gn5_divisions.geojson",
        "streets": "public/data/network-form/roads_streets.geojson",
        "crs_metric": "EPSG:3857",
        "snap_m": SNAP_M,
        "snap_m_cell": SNAP_M_CELL,
        "min_segment_m": MIN_SEG_M,
        "min_cell_area_m2": MIN_CELL_M2,
        "min_cell_overlap": 0.5,
        "boundary_cul_m": BOUNDARY_CUL_M,
        "boundary_buffer_m": BOUNDARY_BUFFER_M,
        "degree_ge5_policy": "count_as_X",
        "noding_method": "shapely.ops.unary_union",
        "quadrant_tie": "T_ratio>=0.5 is T; Cell_ratio>=0.5 is cell",
        "independent_clip": True,
        "nesting_check": True,
        "clipped_segments": ml["clipped_segments"],
        "noded_parts": ml["noded_parts"],
        "png_written": wrote_png,
        "figure": fig_rel if wrote_png else None,
        "excludes": [
            "space_syntax",
            "integration",
            "choice",
            "depth",
            "accessibility",
            "hex_cells",
            "gsi_fsi_osr",
        ],
        "methods": "scripts/network_form/METHODS_MARSHALL_ML_GN.md",
    }

    write_fc(OUT / "roads_ml_gn_clipped.geojson", ml["clipped_feats"])
    write_fc(OUT / "topology_nodes_ml_gn.geojson", ml["topo_node_feats"])
    write_fc(OUT / "topology_edges_ml_gn.geojson", ml["edge_feats"])
    write_fc(OUT / "cells_marshall.geojson", ml["cells"])
    write_fc(OUT / "culdesacs_marshall.geojson", ml["cul_feats"])
    write_fc(OUT / "junctions_t.geojson", ml["t_feats"])
    write_fc(OUT / "junctions_x.geojson", ml["x_feats"])
    (OUT / "marshall_ml_gn_metrics.json").write_text(json.dumps(ml_metrics, indent=2), encoding="utf-8")
    (OUT / "run_meta.json").write_text(json.dumps(run_meta, indent=2), encoding="utf-8")

    for result in results:
        counts = result["metrics"]["counts"]
        matrix = result["metrics"]["matrix"]
        print(
            f"{result['metrics']['gn_name']}  T={counts['n_T']} X={counts['n_X']} "
            f"cul={counts['n_cul_marshall']} cells={counts['n_cell_marshall']} "
            f"nested={counts['n_cells_nested']} "
            f"excl={counts['n_cul_boundary_excluded']} quadrant={matrix['quadrant']}"
        )


if __name__ == "__main__":
    main()
