#!/usr/bin/env python3
"""Classify Marshall T/X junctions from the Marshall-ready street network.

Does not calculate ratios, cells, cul-de-sacs, or the Marshall matrix.
Does not read earlier junction or cell outputs.
"""

from __future__ import annotations

import csv
import json
import math
from collections import defaultdict
from pathlib import Path

import geopandas as gpd
from pyproj import Transformer
from shapely.geometry import LineString, Point, mapping
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = ROOT / "network_form" / "marshall_matrix"
GPKG_IN = OUT_ROOT / "data" / "processed" / "roads_marshall_ready.gpkg"
GPKG_OUT = OUT_ROOT / "data" / "processed" / "marshall_junctions.gpkg"
TABLE_DIR = OUT_ROOT / "results" / "tables"
MAP_PATH = OUT_ROOT / "results" / "maps" / "marshall_junctions_diagnostic.html"

GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]
CELL_M = 0.01
ARM_DEG = 20.0
BOUNDARY_M = 1.0
SHORT_M = 0.5
DUAL_PAIRS = {
    "D001": frozenset({"48701240", "1498946138"}),
    "D002": frozenset({"48701240", "687500136"}),
}
UNKNOWN_IDS = ("C0130", "C0135", "C0257", "C0340")

TO_M = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
TO_LL = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)


def to_metric(geom):
    return transform(TO_M.transform, geom)


def to_lonlat(x: float, y: float) -> tuple[float, float]:
    return TO_LL.transform(x, y)


def cell_of(x: float, y: float) -> tuple[float, float]:
    return (round(x / CELL_M) * CELL_M, round(y / CELL_M) * CELL_M)


def ang_diff(left: float, right: float) -> float:
    delta = abs(left - right) % 360.0
    return min(delta, 360.0 - delta)


def outgoing_bearing(line: LineString, at_start: bool) -> float:
    coords = list(line.coords)
    if len(coords) < 2:
        return 0.0
    if at_start:
        origin = coords[0]
        steps = coords[1:]
    else:
        origin = coords[-1]
        steps = list(reversed(coords[:-1]))
    travelled = 0.0
    target = steps[0]
    previous = origin
    for coord in steps:
        travelled += math.hypot(coord[0] - previous[0], coord[1] - previous[1])
        target = coord
        previous = coord
        if travelled >= 8.0:
            break
    return math.degrees(math.atan2(target[1] - origin[1], target[0] - origin[0])) % 360.0


def cluster_bearings(bearings: list[float]) -> int:
    if not bearings:
        return 0
    unused = set(range(len(bearings)))
    clusters = 0
    while unused:
        start = unused.pop()
        members = [bearings[start]]
        growing = True
        while growing:
            growing = False
            for index in list(unused):
                if any(ang_diff(bearings[index], member) <= ARM_DEG for member in members):
                    members.append(bearings[index])
                    unused.remove(index)
                    growing = True
        clusters += 1
    return clusters


def osm_text(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def is_bridge(value) -> bool:
    return str(value).strip().lower() in {"yes", "true", "1"}


def is_short(row) -> bool:
    flag = row.get("short_fragment")
    if isinstance(flag, str):
        if flag.strip().lower() in {"true", "1", "yes"}:
            return True
    elif bool(flag):
        return True
    try:
        return float(row.get("length_m") or 0) < SHORT_M
    except (TypeError, ValueError):
        return False


def load_inputs():
    streets = gpd.read_file(GPKG_IN, layer="streets")
    endpoints = gpd.read_file(GPKG_IN, layer="boundary_endpoints")
    crossings = gpd.read_file(GPKG_IN, layer="crossings")
    boundaries = gpd.read_file(GPKG_IN, layer="gn_boundaries")
    return streets, endpoints, crossings, boundaries


def build_nodes(streets, endpoints, boundaries) -> list[dict]:
    boundary_pts = []
    for row in endpoints.itertuples(index=False):
        x, y = TO_M.transform(float(row.lon), float(row.lat))
        boundary_pts.append({"gn": row.gn_name, "x": x, "y": y, "endpoint_id": row.endpoint_id})

    gn_metric = {}
    for row in boundaries.itertuples(index=False):
        gn_metric[row.gn_name] = to_metric(row.geometry)

    grouped = defaultdict(list)
    for row in streets.itertuples(index=False):
        line_ll = row.geometry
        if line_ll is None or line_ll.is_empty or line_ll.geom_type != "LineString":
            continue
        line_m = to_metric(line_ll)
        coords = list(line_m.coords)
        if len(coords) < 2:
            continue
        record = {
            "osm_id": osm_text(row.osm_id),
            "segment_id": row.segment_id,
            "bridge": is_bridge(row.bridge),
            "short": is_short(row._asdict() if hasattr(row, "_asdict") else {"short_fragment": row.short_fragment, "length_m": row.length_m}),
            "gn": row.gn_name,
        }
        for at_start, coord in ((True, coords[0]), (False, coords[-1])):
            grouped[(row.gn_name, cell_of(coord[0], coord[1]))].append(
                {
                    **record,
                    "x": coord[0],
                    "y": coord[1],
                    "bearing": outgoing_bearing(line_m, at_start),
                }
            )

    nodes = []
    for (gn_name, cell), ends in grouped.items():
        xs = [item["x"] for item in ends]
        ys = [item["y"] for item in ends]
        x = sum(xs) / len(xs)
        y = sum(ys) / len(ys)
        arms = [item["bearing"] for item in ends if not item["short"]]
        degree = cluster_bearings(arms)
        osm_ids = {item["osm_id"] for item in ends if item["osm_id"]}
        dual_hits = [case for case, pair in DUAL_PAIRS.items() if pair <= osm_ids]
        point = Point(x, y)
        boundary_match = None
        for candidate in boundary_pts:
            if candidate["gn"] == gn_name and math.hypot(candidate["x"] - x, candidate["y"] - y) <= BOUNDARY_M:
                boundary_match = candidate["endpoint_id"]
                break
        near_boundary = False
        polygon = gn_metric.get(gn_name)
        if polygon is not None and polygon.boundary.distance(point) <= BOUNDARY_M:
            near_boundary = True
        classification, reason, uncertainty = classify_node(degree, dual_hits, boundary_match)
        boundary_flag = bool(boundary_match) or (near_boundary and classification in {"T", "X", "COMPLEX"})
        if classification in {"T", "X", "COMPLEX"} and near_boundary:
            uncertainty = True
            reason = join_reason(reason, "near GN boundary; an arm may be missing because of clipping")
        lon, lat = to_lonlat(x, y)
        nodes.append(
            {
                "GN": gn_name,
                "x_m": x,
                "y_m": y,
                "cell": cell,
                "x": lon,
                "y": lat,
                "degree": degree,
                "classification": classification,
                "street_count": len(ends),
                "boundary_flag": boundary_flag,
                "bridge_flag": any(item["bridge"] for item in ends),
                "uncertainty_flag": uncertainty or bool(dual_hits),
                "uncertainty_reason": reason,
                "osm_ids": sorted(osm_ids),
                "boundary_endpoint_id": boundary_match or "",
                "dual_cases": dual_hits,
                "unknown_crossing_id": "",
            }
        )
    return nodes


def join_reason(current: str, extra: str) -> str:
    if not current:
        return extra
    if extra in current:
        return current
    return f"{current}; {extra}"


def classify_node(degree: int, dual_hits: list[str], boundary_match: str | None) -> tuple[str, str, bool]:
    if dual_hits and degree != 1:
        cases = ", ".join(dual_hits)
        return (
            "UNCERTAIN",
            f"incident to both roads in dual-carriageway {cases}; not forced into T or X",
            True,
        )
    if degree <= 1:
        if boundary_match:
            return ("ENDPOINT", f"boundary endpoint {boundary_match}", False)
        return ("ENDPOINT", "", False)
    if degree == 2:
        return ("OTHER", "", False)
    if degree == 3:
        return ("T", "", False)
    if degree == 4:
        return ("X", "", False)
    return ("COMPLEX", f"effective degree {degree}; not forced into X", True)


def add_unknown_crossings(nodes: list[dict], crossings) -> list[dict]:
    unknown = crossings[crossings["connection_status"].astype(str).str.lower() == "unknown"]
    found = set()
    extras = []
    for row in unknown.itertuples(index=False):
        crossing_id = str(row.crossing_id)
        found.add(crossing_id)
        lon = float(row.geometry.x)
        lat = float(row.geometry.y)
        x_m, y_m = TO_M.transform(lon, lat)
        cell = cell_of(x_m, y_m)
        reason = (
            f"{crossing_id} unknown crossing between osm {osm_text(row.osm_id_1)} "
            f"and {osm_text(row.osm_id_2)}; roads were not connected"
        )
        same = [
            node
            for node in nodes
            if node["GN"] == row.gn_name and node["cell"] == cell and node["classification"] != "OTHER"
        ]
        if same:
            target = same[0]
            target["classification"] = "UNCERTAIN"
            target["uncertainty_flag"] = True
            target["unknown_crossing_id"] = crossing_id
            target["uncertainty_reason"] = join_reason(target["uncertainty_reason"], reason)
            continue
        extras.append(
            {
                "GN": row.gn_name,
                "x_m": x_m,
                "y_m": y_m,
                "cell": cell,
                "x": lon,
                "y": lat,
                "degree": 0,
                "classification": "UNCERTAIN",
                "street_count": 0,
                "boundary_flag": False,
                "bridge_flag": False,
                "uncertainty_flag": True,
                "uncertainty_reason": reason,
                "osm_ids": [osm_text(row.osm_id_1), osm_text(row.osm_id_2)],
                "boundary_endpoint_id": "",
                "dual_cases": [],
                "unknown_crossing_id": crossing_id,
            }
        )
    missing = [item for item in UNKNOWN_IDS if item not in found]
    if missing:
        raise RuntimeError(f"Unknown crossings missing from the checkpoint: {missing}")
    return nodes + extras


def assign_ids(nodes: list[dict]) -> list[dict]:
    ordered = sorted(nodes, key=lambda node: (GN_NAMES.index(node["GN"]) if node["GN"] in GN_NAMES else 99, node["y"], node["x"]))
    for index, node in enumerate(ordered, start=1):
        node["junction_id"] = f"J{index:04d}"
    return ordered


def summary_rows(nodes: list[dict]) -> list[dict]:
    rows = []
    groups = GN_NAMES + ["TOTAL"]
    for name in groups:
        chosen = nodes if name == "TOTAL" else [node for node in nodes if node["GN"] == name]
        counts = {label: 0 for label in ("T", "X", "COMPLEX", "UNCERTAIN", "ENDPOINT", "OTHER")}
        for node in chosen:
            counts[node["classification"]] = counts.get(node["classification"], 0) + 1
        rows.append(
            {
                "GN": name,
                "T_count": counts["T"],
                "X_count": counts["X"],
                "complex_count": counts["COMPLEX"],
                "uncertain_count": counts["UNCERTAIN"],
                "endpoint_count": counts["ENDPOINT"],
                "other_count": counts["OTHER"],
                "total_junction_nodes": len(chosen),
            }
        )
    return rows


def review_rows(nodes: list[dict]) -> list[dict]:
    picked = []

    def take(label: str, limit: int | None, predicate=None):
        rows = [node for node in nodes if node["classification"] == label and (predicate(node) if predicate else True)]
        if limit is not None:
            rows = rows[:limit]
        for node in rows:
            picked.append(
                {
                    "junction_id": node["junction_id"],
                    "GN": node["GN"],
                    "x": round(node["x"], 6),
                    "y": round(node["y"], 6),
                    "classification": node["classification"],
                    "degree": node["degree"],
                    "reason": node["uncertainty_reason"] or node["boundary_endpoint_id"],
                }
            )

    take("T", 5)
    take("X", 5)
    take("COMPLEX", None)
    take("UNCERTAIN", None)
    take("ENDPOINT", 5, predicate=lambda node: node["boundary_flag"])
    return picked


def validate(nodes: list[dict], endpoints) -> list[dict]:
    checks = []

    def add(check_id: str, ok: bool, detail: str):
        checks.append({"check_id": check_id, "result": "pass" if ok else "fail", "detail": detail})

    bad_degree = [
        node["junction_id"]
        for node in nodes
        if node["classification"] in {"T", "X"} and node["degree"] not in {3, 4}
    ]
    add("A_T_degree_3_and_B_X_degree_4", not bad_degree, f"T/X with other degree: {bad_degree[:8]}")
    bends = [node["junction_id"] for node in nodes if node["degree"] == 2 and node["classification"] in {"T", "X"}]
    add("C_degree2_not_TX", not bends, f"degree-2 labelled T/X: {bends[:8]}")
    tx_cells = {(node["GN"], node["cell"]) for node in nodes if node["classification"] in {"T", "X"}}
    boundary_in_tx = []
    for row in endpoints.itertuples(index=False):
        x_m, y_m = TO_M.transform(float(row.lon), float(row.lat))
        if (row.gn_name, cell_of(x_m, y_m)) in tx_cells:
            boundary_in_tx.append(row.endpoint_id)
    add("D_boundary_endpoints_not_TX", not boundary_in_tx, f"boundary endpoints on T/X: {boundary_in_tx[:8]}")
    forced = [node["junction_id"] for node in nodes if node["degree"] >= 5 and node["classification"] == "X"]
    add("G_complex_not_forced_to_X", not forced, f"degree>=5 labelled X: {forced[:8]}")
    present = {node["unknown_crossing_id"] for node in nodes if node["unknown_crossing_id"]}
    missing = [item for item in UNKNOWN_IDS if item not in present]
    add("F_unknown_crossings_flagged", not missing, f"missing unknown ids: {missing}")
    dual_tx = [
        node["junction_id"]
        for node in nodes
        if node["classification"] in {"T", "X"} and node["dual_cases"]
    ]
    add("H_dual_carriageway_not_TX", not dual_tx, f"T/X on D001/D002: {dual_tx[:8]}")
    seen = {}
    duplicates = []
    for node in nodes:
        if node["classification"] not in {"T", "X", "COMPLEX", "UNCERTAIN"}:
            continue
        key = (node["GN"], node["cell"])
        if key in seen:
            duplicates.append(f"{seen[key]}|{node['junction_id']}")
        else:
            seen[key] = node["junction_id"]
    add("I_no_duplicate_junction_cells", not duplicates, f"shared cells: {duplicates[:8]}")
    add(
        "note",
        True,
        "Auditable classification from the Marshall-ready graph. Not an error-free claim. "
        "No new snap was applied. Unknown crossings were not connected. Ratios, cells, and cul-de-sacs were not calculated.",
    )
    return checks


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_gpkg(nodes: list[dict]) -> None:
    GPKG_OUT.parent.mkdir(parents=True, exist_ok=True)
    if GPKG_OUT.exists():
        GPKG_OUT.unlink()
    rows = []
    geometries = []
    for node in nodes:
        rows.append(
            {
                "junction_id": node["junction_id"],
                "GN": node["GN"],
                "x": node["x"],
                "y": node["y"],
                "degree": int(node["degree"]),
                "classification": node["classification"],
                "street_count": int(node["street_count"]),
                "boundary_flag": bool(node["boundary_flag"]),
                "bridge_flag": bool(node["bridge_flag"]),
                "uncertainty_flag": bool(node["uncertainty_flag"]),
                "uncertainty_reason": node["uncertainty_reason"],
            }
        )
        geometries.append(Point(node["x"], node["y"]))
    frame = gpd.GeoDataFrame(rows, geometry=geometries, crs="EPSG:4326")
    frame.to_file(GPKG_OUT, layer="junctions", driver="GPKG", engine="pyogrio")


def write_map(nodes: list[dict], streets, boundaries) -> None:
    MAP_PATH.parent.mkdir(parents=True, exist_ok=True)

    def features(rows, props):
        return {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "properties": props(row), "geometry": mapping(row.geometry) if hasattr(row, "geometry") else {"type": "Point", "coordinates": [row["x"], row["y"]]}}
                for row in rows
            ],
        }

    street_fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"segment_id": row.segment_id, "gn_name": row.gn_name, "name": row.name or ""},
                "geometry": mapping(row.geometry),
            }
            for row in streets.itertuples(index=False)
            if row.geometry is not None
        ],
    }
    gn_fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"gn_name": row.gn_name},
                "geometry": mapping(row.geometry),
            }
            for row in boundaries.itertuples(index=False)
        ],
    }

    def point_fc(label: str):
        chosen = [node for node in nodes if node["classification"] == label or (label == "BOUNDARY" and node["boundary_flag"] and node["classification"] == "ENDPOINT")]
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "junction_id": node["junction_id"],
                        "GN": node["GN"],
                        "degree": node["degree"],
                        "classification": node["classification"],
                        "reason": node["uncertainty_reason"],
                    },
                    "geometry": {"type": "Point", "coordinates": [node["x"], node["y"]]},
                }
                for node in chosen
            ],
        }

    payload = {
        "streets": street_fc,
        "gns": gn_fc,
        "T": point_fc("T"),
        "X": point_fc("X"),
        "COMPLEX": point_fc("COMPLEX"),
        "UNCERTAIN": point_fc("UNCERTAIN"),
        "BOUNDARY": point_fc("BOUNDARY"),
    }
    data = json.dumps(payload).replace("<", "\\u003c")
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Marshall junction diagnostics</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {{ height: 100%; margin: 0; }}
    .panel {{
      position: absolute; z-index: 500; top: 12px; right: 12px;
      background: #fff; padding: 10px 12px; border-radius: 8px;
      font: 13px/1.45 sans-serif; box-shadow: 0 1px 4px rgba(0,0,0,.2);
    }}
    .panel label {{ display: block; }}
    .swatch {{ display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }}
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="panel">
    <strong>Marshall junctions</strong>
    <label><input type="checkbox" id="ly-streets" checked /> Streets</label>
    <label><input type="checkbox" id="ly-gn" checked /> GN boundaries</label>
    <label><input type="checkbox" id="ly-T" checked /> <span class="swatch" style="background:#2563eb"></span>T</label>
    <label><input type="checkbox" id="ly-X" checked /> <span class="swatch" style="background:#dc2626"></span>X</label>
    <label><input type="checkbox" id="ly-COMPLEX" checked /> <span class="swatch" style="background:#d97706"></span>Complex</label>
    <label><input type="checkbox" id="ly-UNCERTAIN" checked /> <span class="swatch" style="background:#7c3aed"></span>Uncertain</label>
    <label><input type="checkbox" id="ly-BOUNDARY" checked /> <span class="swatch" style="background:#0f766e"></span>Boundary endpoints</label>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const data = {data};
    const map = L.map('map');
    L.tileLayer('https://{{s}}.basemaps.cartocdn.com/light_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 20
    }}).addTo(map);
    const streets = L.geoJSON(data.streets, {{
      style: {{ color: '#334155', weight: 1.5 }},
      onEachFeature: (f, layer) => layer.bindPopup(`${{f.properties.name || 'unnamed'}} · ${{f.properties.gn_name}}`)
    }});
    const gns = L.geoJSON(data.gns, {{
      style: {{ color: '#0f766e', weight: 1.5, fillOpacity: 0.03 }},
      onEachFeature: (f, layer) => layer.bindPopup(f.properties.gn_name)
    }});
    function points(name, color) {{
      return L.geoJSON(data[name], {{
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {{
          radius: 6, color, fillColor: color, fillOpacity: 0.9, weight: 1
        }}),
        onEachFeature: (f, layer) => layer.bindPopup(
          `${{f.properties.junction_id}} · ${{f.properties.classification}}<br>${{f.properties.GN}} · degree ${{f.properties.degree}}<br>${{f.properties.reason || ''}}`
        )
      }});
    }}
    const groups = {{
      'ly-streets': streets,
      'ly-gn': gns,
      'ly-T': points('T', '#2563eb'),
      'ly-X': points('X', '#dc2626'),
      'ly-COMPLEX': points('COMPLEX', '#d97706'),
      'ly-UNCERTAIN': points('UNCERTAIN', '#7c3aed'),
      'ly-BOUNDARY': points('BOUNDARY', '#0f766e')
    }};
    Object.values(groups).forEach((layer) => layer.addTo(map));
    Object.entries(groups).forEach(([id, layer]) => {{
      document.getElementById(id).addEventListener('change', (event) => {{
        if (event.target.checked) layer.addTo(map); else map.removeLayer(layer);
      }});
    }});
    const bounds = streets.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.05));
  </script>
</body>
</html>
"""
    MAP_PATH.write_text(html, encoding="utf-8")


def main() -> None:
    streets, endpoints, crossings, boundaries = load_inputs()
    nodes = assign_ids(add_unknown_crossings(build_nodes(streets, endpoints, boundaries), crossings))
    summaries = summary_rows(nodes)
    reviews = review_rows(nodes)
    checks = validate(nodes, endpoints)
    write_gpkg(nodes)
    write_csv(
        TABLE_DIR / "marshall_junction_summary.csv",
        summaries,
        ["GN", "T_count", "X_count", "complex_count", "uncertain_count", "endpoint_count", "other_count", "total_junction_nodes"],
    )
    write_csv(
        TABLE_DIR / "marshall_junction_review.csv",
        reviews,
        ["junction_id", "GN", "x", "y", "classification", "degree", "reason"],
    )
    write_csv(
        TABLE_DIR / "marshall_junction_validation.csv",
        checks,
        ["check_id", "result", "detail"],
    )
    write_map(nodes, streets, boundaries)
    failed = [row["check_id"] for row in checks if row["result"] == "fail"]
    report = {
        "nodes": len(nodes),
        "summary": summaries[-1],
        "boundary_flagged": sum(1 for node in nodes if node["boundary_flag"]),
        "unknown_crossing_rows": sum(1 for node in nodes if node["unknown_crossing_id"]),
        "dual_uncertain": sum(1 for node in nodes if node["dual_cases"]),
        "unresolved": sum(1 for node in nodes if node["classification"] in {"UNCERTAIN", "COMPLEX"} or node["uncertainty_flag"]),
        "validation_failed": failed,
        "gpkg": str(GPKG_OUT),
    }
    print(json.dumps(report, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
