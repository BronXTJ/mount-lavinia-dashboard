#!/usr/bin/env python3
"""Validate Marshall Mount Lavinia GN outputs. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from shapely.geometry import Point, shape

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "data" / "network-form" / "marshall"
NF = ROOT / "public" / "data" / "network-form"
EPS = 1e-9

REQUIRED = [
    "run_meta.json",
    "marshall_ml_gn_metrics.json",
    "marshall_scopes.json",
    "cells_marshall.geojson",
    "cells_all.geojson",
    "culdesacs_marshall.geojson",
    "culdesacs_all.geojson",
    "junctions_t.geojson",
    "junctions_t_all.geojson",
    "junctions_x.geojson",
    "junctions_x_all.geojson",
    "roads_ml_gn_clipped.geojson",
    "topology_nodes_ml_gn.geojson",
    "topology_edges_ml_gn.geojson",
]

GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]

ML_EXPECTED = {
    "n_T": 115,
    "n_X": 9,
    "n_cul_marshall": 63,
    "n_cell_marshall": 21,
    "quadrant": "T-tree",
    "n_culdesac_dashboard": 65,
    "n_three_way_dashboard": 109,
    "n_four_way_dashboard": 13,
}


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    errors: list[str] = []
    for name in REQUIRED:
        if not (OUT / name).is_file():
            fail(f"Missing {name}", errors)
    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    metrics = load(OUT / "marshall_ml_gn_metrics.json")
    meta = load(OUT / "run_meta.json")
    cells = load(OUT / "cells_marshall.geojson")
    culs = load(OUT / "culdesacs_marshall.geojson")
    ts = load(OUT / "junctions_t.geojson")
    xs = load(OUT / "junctions_x.geojson")
    roads = load(OUT / "roads_ml_gn_clipped.geojson")
    dash = load(NF / "metrics_ml_gn_summary.json")

    counts = metrics.get("counts") or {}
    ratios = metrics.get("ratios") or {}
    matrix = metrics.get("matrix") or {}

    n_t = counts.get("n_T")
    n_x = counts.get("n_X")
    n_cul = counts.get("n_cul_marshall")
    n_cell = counts.get("n_cell_marshall")
    for key, val in (
        ("n_T", n_t),
        ("n_X", n_x),
        ("n_cul_marshall", n_cul),
        ("n_cell_marshall", n_cell),
    ):
        if not isinstance(val, int) or val <= 0:
            fail(f"{key} must be a positive int, got {val}", errors)

    t_r = ratios.get("T_ratio")
    x_r = ratios.get("X_ratio")
    c_r = ratios.get("Cell_ratio")
    u_r = ratios.get("Cul_ratio")
    if None in (t_r, x_r, c_r, u_r):
        fail("missing ratios", errors)
    else:
        if abs((t_r + x_r) - 1.0) > 1e-9:
            fail(f"T+X ratios {t_r + x_r} != 1", errors)
        if abs((c_r + u_r) - 1.0) > 1e-9:
            fail(f"Cell+Cul ratios {c_r + u_r} != 1", errors)
        if n_t is not None and n_x is not None and (n_t + n_x) > 0:
            if abs(t_r - (n_t / (n_t + n_x))) > 1e-12:
                fail("T_ratio does not match counts", errors)
        if n_cell is not None and n_cul is not None and (n_cell + n_cul) > 0:
            if abs(c_r - (n_cell / (n_cell + n_cul))) > 1e-12:
                fail("Cell_ratio does not match counts", errors)
        if abs(matrix.get("x_cell_ratio", 99) - c_r) > EPS:
            fail("matrix.x_cell_ratio != Cell_ratio", errors)
        if abs(matrix.get("y_t_ratio", 99) - t_r) > EPS:
            fail("matrix.y_t_ratio != T_ratio", errors)

    quad = matrix.get("quadrant")
    if quad not in ("T-tree", "T-cell", "X-tree", "X-cell"):
        fail(f"bad quadrant {quad}", errors)
    elif c_r is not None and t_r is not None:
        expect = (
            "T-cell"
            if t_r >= 0.5 and c_r >= 0.5
            else "T-tree"
            if t_r >= 0.5
            else "X-cell"
            if c_r >= 0.5
            else "X-tree"
        )
        if quad != expect:
            fail(f"quadrant {quad} != {expect}", errors)

    dash_cul = (dash.get("counts") or {}).get("n_culdesac")
    if isinstance(dash_cul, int) and isinstance(n_cul, int) and n_cul > dash_cul:
        fail(f"n_cul_marshall {n_cul} > dashboard {dash_cul}", errors)

    cmp = metrics.get("comparison_network_form") or {}
    if cmp.get("n_culdesac_dashboard") != dash_cul:
        fail("comparison cul-de-sac count does not match dashboard summary", errors)

    if len(cells.get("features") or []) != n_cell:
        fail("cells geojson count != n_cell_marshall", errors)
    marshall_cul_feats = [
        f
        for f in (culs.get("features") or [])
        if (f.get("properties") or {}).get("marshall_cul") is True
    ]
    if len(marshall_cul_feats) != n_cul:
        fail("culdesac geojson marshall_cul count != n_cul_marshall", errors)
    if len(ts.get("features") or []) != n_t:
        fail("junctions_t count != n_T", errors)
    if len(xs.get("features") or []) != n_x:
        fail("junctions_x count != n_X", errors)
    if not (roads.get("features") or []):
        fail("clipped roads empty", errors)

    gn = load(NF / "mount_lavinia_gn.geojson")
    gn_geom = shape(gn["features"][0]["geometry"])
    # spot-check: every cell centroid falls inside the GN (lon/lat)
    for f in cells.get("features") or []:
        props = f.get("properties") or {}
        lon, lat = props.get("centroid_lon"), props.get("centroid_lat")
        if lon is None or lat is None:
            fail(f"cell {props.get('cell_id')} missing centroid", errors)
            break
        if not gn_geom.covers(Point(lon, lat)):
            fail(f"cell {props.get('cell_id')} centroid outside GN", errors)
            break
        geom = shape(f["geometry"])
        if geom.geom_type not in ("Polygon", "MultiPolygon"):
            fail("cell geometry is not a polygon", errors)
            break
        area = props.get("area_m2")
        if not isinstance(area, (int, float)) or area < meta.get("min_cell_area_m2", 100) - 0.01:
            fail(f"cell {props.get('cell_id')} area below minimum", errors)
            break

    if meta.get("noding_method") != "shapely.ops.unary_union":
        fail("run_meta noding_method mismatch", errors)
    if meta.get("gn_pcode") != "LK1131005":
        fail("run_meta gn code mismatch", errors)
    if meta.get("independent_clip") is not True:
        fail("run_meta must record an independent clip per GN", errors)

    scopes_doc = load(OUT / "marshall_scopes.json")
    scopes = scopes_doc.get("scopes") or []
    if [s.get("gn_name") for s in scopes] != GN_NAMES:
        fail(f"scopes must be {GN_NAMES}", errors)

    gn5 = load(NF / "gn5_divisions.geojson")
    gn_by_name = {
        (f.get("properties") or {}).get("ADM4_EN"): shape(f["geometry"])
        for f in gn5.get("features") or []
    }
    by_scope = load(NF / "metrics_by_scope.json")
    cells_all = load(OUT / "cells_all.geojson").get("features") or []
    culs_all = load(OUT / "culdesacs_all.geojson").get("features") or []
    t_all = load(OUT / "junctions_t_all.geojson").get("features") or []
    x_all = load(OUT / "junctions_x_all.geojson").get("features") or []

    def named(features, name):
        return [f for f in features if (f.get("properties") or {}).get("gn_name") == name]

    for scope in scopes:
        name = scope.get("gn_name")
        sc = scope.get("counts") or {}
        sr = scope.get("ratios") or {}
        sm = scope.get("matrix") or {}
        st = sr.get("T_ratio")
        sx = sr.get("X_ratio")
        scell = sr.get("Cell_ratio")
        scul = sr.get("Cul_ratio")
        if None in (st, sx, scell, scul):
            if any(v is not None for v in (st, sx, scell, scul, sm.get("x_cell_ratio"), sm.get("y_t_ratio"), sm.get("quadrant"))):
                fail(f"{name} has a partial ratio", errors)
        else:
            if abs((st + sx) - 1.0) > 1e-9:
                fail(f"{name} T+X ratios != 1", errors)
            if abs((scell + scul) - 1.0) > 1e-9:
                fail(f"{name} Cell+Cul ratios != 1", errors)
            denom_tx = sc.get("n_T", 0) + sc.get("n_X", 0)
            denom_st = sc.get("n_cell_marshall", 0) + sc.get("n_cul_marshall", 0)
            if denom_tx > 0 and abs(st - (sc["n_T"] / denom_tx)) > 1e-12:
                fail(f"{name} T_ratio mismatch", errors)
            if denom_st > 0 and abs(scell - (sc["n_cell_marshall"] / denom_st)) > 1e-12:
                fail(f"{name} Cell_ratio mismatch", errors)
            if abs(sm.get("x_cell_ratio", 99) - scell) > EPS or abs(sm.get("y_t_ratio", 99) - st) > EPS:
                fail(f"{name} matrix coordinates != ratios", errors)
        dash_counts = (by_scope.get(name) or {}).get("counts") or {}
        cmp_s = scope.get("comparison_network_form") or {}
        if cmp_s.get("n_culdesac_dashboard") != dash_counts.get("n_culdesac"):
            fail(f"{name} comparison cul-de-sac mismatch", errors)
        if cmp_s.get("n_three_way_dashboard") != dash_counts.get("n_three_way"):
            fail(f"{name} comparison 3-way mismatch", errors)
        if cmp_s.get("n_four_way_dashboard") != dash_counts.get("n_four_way"):
            fail(f"{name} comparison 4-way mismatch", errors)
        dash_cul_n = dash_counts.get("n_culdesac")
        if isinstance(dash_cul_n, int) and sc.get("n_cul_marshall", 0) > dash_cul_n:
            fail(f"{name} Marshall cul-de-sacs exceed Network Form", errors)
        if len(named(cells_all, name)) != sc.get("n_cell_marshall"):
            fail(f"{name} cell feature count mismatch", errors)
        if len([f for f in named(culs_all, name) if (f.get("properties") or {}).get("marshall_cul") is True]) != sc.get("n_cul_marshall"):
            fail(f"{name} cul-de-sac feature count mismatch", errors)
        if len(named(t_all, name)) != sc.get("n_T"):
            fail(f"{name} T feature count mismatch", errors)
        if len(named(x_all, name)) != sc.get("n_X"):
            fail(f"{name} X feature count mismatch", errors)
        gn_geom = gn_by_name.get(name)
        if gn_geom is None:
            fail(f"{name} missing from gn5", errors)
            continue
        if scope.get("gn_pcode") != (next(f for f in gn5["features"] if f["properties"].get("ADM4_EN") == name)["properties"].get("ADM4_PCODE")):
            fail(f"{name} pcode mismatch", errors)
        for f in named(cells_all, name):
            props = f.get("properties") or {}
            lon, lat = props.get("centroid_lon"), props.get("centroid_lat")
            if lon is None or not gn_geom.covers(Point(lon, lat)):
                fail(f"{name} cell {props.get('cell_id')} centroid outside GN", errors)
                break
            area = props.get("area_m2")
            if not isinstance(area, (int, float)) or area < 100 - 0.01:
                fail(f"{name} cell {props.get('cell_id')} area below minimum", errors)
                break

    ml_scope = next((s for s in scopes if s.get("gn_name") == "Mount Lavinia"), {})
    ml_counts = ml_scope.get("counts") or {}
    ml_cmp = ml_scope.get("comparison_network_form") or {}
    for key in ("n_T", "n_X", "n_cul_marshall", "n_cell_marshall"):
        if ml_counts.get(key) != ML_EXPECTED[key]:
            fail(f"Mount Lavinia {key} is {ml_counts.get(key)}, expected {ML_EXPECTED[key]}", errors)
    if (ml_scope.get("matrix") or {}).get("quadrant") != ML_EXPECTED["quadrant"]:
        fail("Mount Lavinia quadrant changed", errors)
    for key in ("n_culdesac_dashboard", "n_three_way_dashboard", "n_four_way_dashboard"):
        if ml_cmp.get(key) != ML_EXPECTED[key]:
            fail(f"Mount Lavinia {key} changed", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS")
    print(
        f"  Mount Lavinia  T={n_t} X={n_x} cul={n_cul} cells={n_cell}  "
        f"quadrant={quad}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
