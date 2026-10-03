#!/usr/bin/env python3
"""Identify Marshall cells and cul-de-sacs from the ready street network.

Polygon faces are candidates. They are not accepted as cells until the
boundary checks below pass. This script does not calculate ratios or the
Marshall matrix, and it does not read the old green cell layer or any hex grid.
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
from shapely.ops import linemerge, polygonize, transform

ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = ROOT / "network_form" / "marshall_matrix"
READY = OUT_ROOT / "data" / "processed" / "roads_marshall_ready.gpkg"
REVIEWED = OUT_ROOT / "data" / "processed" / "marshall_junctions_reviewed.gpkg"
GPKG_OUT = OUT_ROOT / "data" / "processed" / "marshall_cells_culs.gpkg"
TABLE_DIR = OUT_ROOT / "results" / "tables"
MAP_PATH = OUT_ROOT / "results" / "maps" / "marshall_cells_culs.html"
NOTE_PATH = OUT_ROOT / "notes" / "marshall_cells_culs_methodology.md"

GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]
CELL_M = 0.01
BOUNDARY_M = 1.0
SHORT_M = 0.5
SLIVER_WIDTH_M = 2.0
SLIVER_RATIO = 20.0
RING_MATCH_M = 0.25
COINCIDENT_M = 0.6
COINCIDENT_LEN_M = 2.0

TO_M = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
TO_LL = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)


def to_metric(geom):
    return transform(TO_M.transform, geom)


def to_lonlat(geom):
    return transform(TO_LL.transform, geom)


def cell_of(x: float, y: float) -> tuple[float, float]:
    return (round(x / CELL_M) * CELL_M, round(y / CELL_M) * CELL_M)


def osm_text(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def is_bridge(value) -> bool:
    return str(value).strip().lower() in {"yes", "true", "1"}


def is_short_value(flag, length_m) -> bool:
    if isinstance(flag, str) and flag.strip().lower() in {"true", "1", "yes"}:
        return True
    if flag is True or flag == 1:
        return True
    try:
        return float(length_m) < SHORT_M
    except (TypeError, ValueError):
        return False


def ang_diff(left: float, right: float) -> float:
    delta = abs(left - right) % 360.0
    return min(delta, 360.0 - delta)


def outgoing_bearing(line: LineString, at_start: bool) -> float:
    coords = list(line.coords)
    if len(coords) < 2:
        return 0.0
    origin = coords[0] if at_start else coords[-1]
    steps = coords[1:] if at_start else list(reversed(coords[:-1]))
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


def cluster_count(bearings: list[float]) -> int:
    unused = set(range(len(bearings)))
    clusters = 0
    while unused:
        start = unused.pop()
        members = [bearings[start]]
        growing = True
        while growing:
            growing = False
            for index in list(unused):
                if any(ang_diff(bearings[index], member) <= 20.0 for member in members):
                    members.append(bearings[index])
                    unused.remove(index)
                    growing = True
        clusters += 1
    return clusters


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def load_segments():
    streets = gpd.read_file(READY, layer="streets")
    endpoints = gpd.read_file(READY, layer="boundary_endpoints")
    crossings = gpd.read_file(READY, layer="crossings")
    duals = gpd.read_file(READY, layer="dual_carriageways")
    boundaries = gpd.read_file(READY, layer="gn_boundaries")
    reviewed = gpd.read_file(REVIEWED, layer="reviewed_junctions")

    segments = []
    for row in streets.itertuples(index=False):
        if row.geometry is None or row.geometry.geom_type != "LineString":
            continue
        line_m = to_metric(row.geometry)
        if line_m.length <= 1e-6:
            continue
        segments.append(
            {
                "segment_id": row.segment_id,
                "osm_id": osm_text(row.osm_id),
                "name": row.name or "",
                "gn": row.gn_name,
                "bridge": is_bridge(row.bridge),
                "short": is_short_value(row.short_fragment, row.length_m),
                "length_m": float(line_m.length),
                "line": line_m,
                "start": cell_of(*line_m.coords[0]),
                "end": cell_of(*line_m.coords[-1]),
                "start_xy": line_m.coords[0],
                "end_xy": line_m.coords[-1],
            }
        )

    boundary_pts = []
    for row in endpoints.itertuples(index=False):
        x_m, y_m = TO_M.transform(float(row.lon), float(row.lat))
        boundary_pts.append({"gn": row.gn_name, "x": x_m, "y": y_m, "id": row.endpoint_id})

    unknown_pts = []
    for row in crossings.itertuples(index=False):
        if str(row.connection_status).strip().lower() != "unknown":
            continue
        x_m, y_m = TO_M.transform(float(row.geometry.x), float(row.geometry.y))
        unknown_pts.append(
            {
                "gn": row.gn_name,
                "x": x_m,
                "y": y_m,
                "id": str(row.crossing_id),
                "point": Point(x_m, y_m),
            }
        )

    pairs = []
    for row in duals.itertuples(index=False):
        parts = [osm_text(part) for part in str(row.road_ids).split("|") if osm_text(part)]
        if len(parts) != 2:
            continue
        pairs.append(
            {
                "gn": row.gn_name,
                "case_id": row.case_id,
                "treatment": str(row.treatment),
                "ids": frozenset(parts),
            }
        )

    j0620 = None
    for row in reviewed.itertuples(index=False):
        if row.node_id == "J0620":
            x_m, y_m = TO_M.transform(float(row.geometry.x), float(row.geometry.y))
            j0620 = {"gn": row.GN, "x": x_m, "y": y_m}
            break

    return segments, boundary_pts, unknown_pts, pairs, boundaries, streets, j0620


def ends_near(left, right, tol=RING_MATCH_M) -> bool:
    for a in (left["start_xy"], left["end_xy"]):
        for b in (right["start_xy"], right["end_xy"]):
            if math.hypot(a[0] - b[0], a[1] - b[1]) <= tol:
                return True
    return False


def point_is_boundary(xy, gn, boundary_pts) -> bool:
    return any(
        item["gn"] == gn and math.hypot(item["x"] - xy[0], item["y"] - xy[1]) <= BOUNDARY_M
        for item in boundary_pts
    )


def graph_degree(cell, gn, by_cell) -> int:
    bearings = []
    for segment, at_start in by_cell.get((gn, cell), []):
        if segment["short"]:
            continue
        bearings.append(outgoing_bearing(segment["line"], at_start))
    return cluster_count(bearings)


def ring_segments(poly, gn_segments) -> tuple[list[dict], float]:
    boundary = poly.exterior
    matched = []
    covered = 0.0
    for segment in gn_segments:
        piece = segment["line"].intersection(boundary.buffer(RING_MATCH_M))
        if piece.is_empty:
            continue
        if piece.length < max(0.4, 0.5 * segment["length_m"]):
            continue
        matched.append(segment)
        covered += min(piece.length, segment["length_m"])
    return matched, covered


def forms_closed_chain(matched: list[dict]) -> bool:
    if len(matched) < 3:
        return False
    unused = set(range(len(matched)))
    start = unused.pop()
    order = [start]
    while unused:
        found = None
        for index in list(unused):
            if ends_near(matched[order[-1]], matched[index]):
                found = index
                break
        if found is None:
            return False
        unused.remove(found)
        order.append(found)
    return ends_near(matched[order[-1]], matched[order[0]])


def dual_hit(matched, gn, pairs, treatment: str):
    osm_ids = {segment["osm_id"] for segment in matched}
    hits = [
        pair
        for pair in pairs
        if pair["gn"] == gn and pair["treatment"] == treatment and pair["ids"] <= osm_ids
    ]
    return hits


def recorded_pair(left: str, right: str, gn, pairs) -> bool:
    key = frozenset({left, right})
    return any(pair["gn"] == gn and pair["ids"] == key for pair in pairs)


def coincident_duplicate(matched, gn, pairs) -> bool:
    for index, left in enumerate(matched):
        for right in matched[index + 1 :]:
            if recorded_pair(left["osm_id"], right["osm_id"], gn, pairs):
                continue
            overlap = left["line"].intersection(right["line"].buffer(COINCIDENT_M))
            if overlap.length >= COINCIDENT_LEN_M:
                return True
    return False


def bridge_crosses_interior(matched, gn_segments) -> bool:
    others = gn_segments
    for segment in matched:
        if not segment["bridge"]:
            continue
        for other in others:
            if other["segment_id"] == segment["segment_id"]:
                continue
            crossed = segment["line"].intersection(other["line"])
            if crossed.is_empty:
                continue
            points = []
            if crossed.geom_type == "Point":
                points = [crossed]
            elif crossed.geom_type == "MultiPoint":
                points = list(crossed.geoms)
            else:
                return True
            for point in points:
                near_bridge_end = min(
                    point.distance(Point(segment["start_xy"])),
                    point.distance(Point(segment["end_xy"])),
                ) <= 0.5
                near_other_end = min(
                    point.distance(Point(other["start_xy"])),
                    point.distance(Point(other["end_xy"])),
                ) <= 0.5
                if not near_bridge_end and not near_other_end:
                    return True
    return False


def unknown_on_face(poly, gn, unknown_pts) -> str:
    for item in unknown_pts:
        if item["gn"] != gn:
            continue
        if poly.covers(item["point"]) or poly.boundary.distance(item["point"]) <= BOUNDARY_M:
            return item["id"]
    return ""


def clip_stub_on_ring(matched, gn, boundary_pts, by_cell) -> bool:
    for segment in matched:
        for xy, cell in (
            (segment["start_xy"], segment["start"]),
            (segment["end_xy"], segment["end"]),
        ):
            if not point_is_boundary(xy, gn, boundary_pts):
                continue
            if graph_degree(cell, gn, by_cell) <= 1:
                return True
    return False


def sliver_reason(poly, matched) -> str:
    try:
        rect = poly.minimum_rotated_rectangle
    except Exception:
        return "sliver check failed; left uncertain"
    if rect.geom_type != "Polygon" or rect.exterior is None:
        return "sliver check failed; left uncertain"
    coords = list(rect.exterior.coords)
    sides = [
        math.hypot(coords[i + 1][0] - coords[i][0], coords[i + 1][1] - coords[i][1])
        for i in range(len(coords) - 1)
    ]
    sides = [side for side in sides if side > 0]
    if len(sides) < 2:
        return "sliver check failed; left uncertain"
    width = min(sides)
    longest = max(max(sides), max(segment["length_m"] for segment in matched))
    if width < SLIVER_WIDTH_M:
        return f"sliver: minimum width {width:.2f} m"
    if width > 0 and longest > SLIVER_RATIO * width:
        return f"sliver: longest edge {longest:.1f} m is more than {SLIVER_RATIO:.0f} times the {width:.2f} m width"
    return ""


def classify_face(poly, gn, gn_segments, pairs, unknown_pts, boundary_pts, by_cell) -> dict:
    matched, covered = ring_segments(poly, gn_segments)
    ids = [segment["segment_id"] for segment in matched]
    area = float(poly.area)
    perimeter = float(poly.exterior.length)
    base = {
        "GN": gn,
        "area_m2": round(area, 2),
        "boundary_segment_count": len(matched),
        "boundary_segment_ids": "|".join(ids),
        "geometry": to_lonlat(poly),
    }
    if len(matched) < 3 or covered < 0.85 * perimeter or not forms_closed_chain(matched):
        return {**base, "classification": "NOT_A_CELL", "reason": "not a closed block of connected street segments"}
    manual = dual_hit(matched, gn, pairs, "manual_review")
    if manual:
        cases = ", ".join(pair["case_id"] for pair in manual)
        return {
            **base,
            "classification": "NOT_A_CELL",
            "reason": f"gap between carriageways of one divided road ({cases})",
        }
    separate = dual_hit(matched, gn, pairs, "kept_separate")
    if separate:
        cases = ", ".join(pair["case_id"] for pair in separate)
        return {
            **base,
            "classification": "UNCERTAIN",
            "reason": f"parallel streets ({cases}); may be a real block or a divided road",
        }
    if coincident_duplicate(matched, gn, pairs):
        return {**base, "classification": "NOT_A_CELL", "reason": "duplicated or overlapping road geometry"}
    crossing_id = unknown_on_face(poly, gn, unknown_pts)
    if crossing_id:
        return {
            **base,
            "classification": "UNCERTAIN",
            "reason": f"{crossing_id} is an unconnected crossing on this face; not treated as a cell",
        }
    if bridge_crosses_interior(matched, gn_segments):
        return {
            **base,
            "classification": "UNCERTAIN",
            "reason": "a bridge-tagged edge crosses another street in the interior",
        }
    if clip_stub_on_ring(matched, gn, boundary_pts, by_cell):
        return {
            **base,
            "classification": "NOT_A_CELL",
            "reason": "the ring closes with a segment that runs only to a GN-boundary endpoint",
        }
    sliver = sliver_reason(poly, matched)
    if sliver:
        return {**base, "classification": "UNCERTAIN", "reason": sliver}
    return {**base, "classification": "GENUINE_CELL", "reason": "enclosed by connected street segments"}


def detect_cells(segments, pairs, unknown_pts, boundary_pts, by_cell) -> list[dict]:
    faces = []
    for gn in GN_NAMES:
        gn_segments = [segment for segment in segments if segment["gn"] == gn]
        lines = [segment["line"] for segment in gn_segments]
        for poly in polygonize(lines):
            if poly.is_empty or not poly.is_valid or poly.area <= 0:
                continue
            faces.append(classify_face(poly, gn, gn_segments, pairs, unknown_pts, boundary_pts, by_cell))
    faces.sort(key=lambda row: (GN_NAMES.index(row["GN"]), -row["area_m2"]))
    genuine_serial = 1
    for index, face in enumerate(faces, start=1):
        face["candidate_id"] = f"C{index:04d}"
        if face["classification"] == "GENUINE_CELL":
            face["cell_id"] = f"MC{genuine_serial:04d}"
            genuine_serial += 1
        else:
            face["cell_id"] = ""
    return faces


def build_cell_index(segments):
    by_cell = defaultdict(list)
    for segment in segments:
        by_cell[(segment["gn"], segment["start"])].append((segment, True))
        by_cell[(segment["gn"], segment["end"])].append((segment, False))
    return by_cell


def other_cell(segment, cell):
    if segment["start"] == cell:
        return segment["end"]
    return segment["start"]


def walk_chain(start_cell, first, gn, by_cell) -> list[dict]:
    chain = [first]
    previous = start_cell
    current = other_cell(first, start_cell)
    seen = {first["segment_id"]}
    while graph_degree(current, gn, by_cell) == 2:
        options = []
        for segment, _at_start in by_cell.get((gn, current), []):
            if segment["short"] or segment["segment_id"] in seen:
                continue
            options.append(segment)
        if len(options) != 1:
            break
        nxt = options[0]
        chain.append(nxt)
        seen.add(nxt["segment_id"])
        previous, current = current, other_cell(nxt, current)
        if current == previous:
            break
    return chain


def detect_culs(segments, boundary_pts, by_cell, j0620) -> list[dict]:
    rows = []
    seen_cells = set()
    for segment in segments:
        for cell, xy in ((segment["start"], segment["start_xy"]), (segment["end"], segment["end_xy"])):
            key = (segment["gn"], cell)
            if key in seen_cells:
                continue
            incidents = by_cell.get(key, [])
            if not incidents:
                continue
            non_short = [item for item in incidents if not item[0]["short"]]
            degree = graph_degree(cell, segment["gn"], by_cell)
            all_short = not non_short
            if degree != 1 and not all_short:
                continue
            seen_cells.add(key)
            gn = segment["gn"]
            near_j0620 = (
                j0620 is not None
                and j0620["gn"] == gn
                and math.hypot(j0620["x"] - xy[0], j0620["y"] - xy[1]) <= BOUNDARY_M
            )
            if all_short:
                classification = "NOT_A_CUL"
                reason = "short geometry fragment under 0.5 m"
                chain = [item[0] for item in incidents]
            elif point_is_boundary(xy, gn, boundary_pts):
                classification = "NOT_A_CUL"
                reason = "GN boundary endpoint created by clipping"
                chain = [item[0] for item in non_short]
            elif near_j0620:
                classification = "UNCERTAIN"
                reason = "unconnected crossing C0340, not a confirmed dead-end street"
                chain = walk_chain(cell, non_short[0][0], gn, by_cell)
            elif any(item[0]["bridge"] for item in non_short):
                classification = "UNCERTAIN"
                reason = "bridge-tagged approach, not a confirmed dead-end street"
                chain = walk_chain(cell, non_short[0][0], gn, by_cell)
            elif len(non_short) != 1:
                classification = "UNCERTAIN"
                reason = "more than one segment meets this degree-1 end; not forced into a cul-de-sac"
                chain = [item[0] for item in non_short]
            else:
                classification = "GENUINE_CUL"
                reason = "internal degree-1 street end, not a boundary endpoint"
                chain = walk_chain(cell, non_short[0][0], gn, by_cell)
            merged = linemerge([item["line"] for item in chain])
            if merged.geom_type == "MultiLineString":
                merged = max(merged.geoms, key=lambda part: part.length)
            rows.append(
                {
                    "GN": gn,
                    "street_segment_id": "|".join(item["segment_id"] for item in chain),
                    "classification": classification,
                    "reason": reason,
                    "geometry": to_lonlat(merged),
                    "x": xy[0],
                    "y": xy[1],
                }
            )
    rows.sort(key=lambda row: (GN_NAMES.index(row["GN"]), row["y"], row["x"]))
    for index, row in enumerate(rows, start=1):
        row["cul_id"] = f"K{index:04d}"
    return rows


def write_tables(faces, culs) -> None:
    write_csv(
        TABLE_DIR / "marshall_cell_candidates.csv",
        faces,
        [
            "candidate_id",
            "cell_id",
            "GN",
            "classification",
            "reason",
            "area_m2",
            "boundary_segment_count",
            "boundary_segment_ids",
        ],
    )
    write_csv(
        TABLE_DIR / "marshall_cells_final.csv",
        [row for row in faces if row["classification"] == "GENUINE_CELL"],
        ["cell_id", "GN", "area_m2", "boundary_segment_count", "boundary_segment_ids"],
    )
    write_csv(
        TABLE_DIR / "marshall_cell_review.csv",
        [row for row in faces if row["classification"] != "GENUINE_CELL"],
        ["candidate_id", "GN", "classification", "reason", "area_m2"],
    )
    write_csv(
        TABLE_DIR / "marshall_cul_candidates.csv",
        culs,
        ["cul_id", "GN", "street_segment_id", "classification", "reason"],
    )
    write_csv(
        TABLE_DIR / "marshall_culs_final.csv",
        [row for row in culs if row["classification"] == "GENUINE_CUL"],
        ["cul_id", "GN", "street_segment_id", "classification", "reason"],
    )
    write_csv(
        TABLE_DIR / "marshall_cul_review.csv",
        [row for row in culs if row["classification"] != "GENUINE_CUL"],
        ["cul_id", "GN", "street_segment_id", "classification", "reason"],
    )


def write_gpkg(faces, culs) -> None:
    GPKG_OUT.parent.mkdir(parents=True, exist_ok=True)
    if GPKG_OUT.exists():
        GPKG_OUT.unlink()
    cell_frame = gpd.GeoDataFrame(
        [
            {
                "candidate_id": row["candidate_id"],
                "cell_id": row["cell_id"],
                "GN": row["GN"],
                "classification": row["classification"],
                "reason": row["reason"],
                "area_m2": row["area_m2"],
                "boundary_segment_count": row["boundary_segment_count"],
                "boundary_segment_ids": row["boundary_segment_ids"],
            }
            for row in faces
        ],
        geometry=[row["geometry"] for row in faces],
        crs="EPSG:4326",
    )
    cul_frame = gpd.GeoDataFrame(
        [
            {
                "cul_id": row["cul_id"],
                "GN": row["GN"],
                "street_segment_id": row["street_segment_id"],
                "classification": row["classification"],
                "reason": row["reason"],
            }
            for row in culs
        ],
        geometry=[row["geometry"] for row in culs],
        crs="EPSG:4326",
    )
    cell_frame.to_file(GPKG_OUT, layer="cell_candidates", driver="GPKG", engine="pyogrio")
    cul_frame.to_file(GPKG_OUT, layer="cul_candidates", driver="GPKG", mode="a", engine="pyogrio")


def feature_collection(rows, properties) -> dict:
    features = []
    for row in rows:
        features.append(
            {
                "type": "Feature",
                "properties": {key: row[key] for key in properties},
                "geometry": mapping(row["geometry"]),
            }
        )
    return {"type": "FeatureCollection", "features": features}


def write_map(faces, culs, streets, boundaries) -> None:
    MAP_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "streets": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": row.name or "", "gn_name": row.gn_name},
                    "geometry": mapping(row.geometry),
                }
                for row in streets.itertuples(index=False)
                if row.geometry is not None
            ],
        },
        "gns": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"gn_name": row.gn_name},
                    "geometry": mapping(row.geometry),
                }
                for row in boundaries.itertuples(index=False)
            ],
        },
        "genuineCells": feature_collection(
            [row for row in faces if row["classification"] == "GENUINE_CELL"],
            ["cell_id", "GN", "area_m2"],
        ),
        "rejectedCells": feature_collection(
            [row for row in faces if row["classification"] == "NOT_A_CELL"],
            ["candidate_id", "GN", "reason"],
        ),
        "uncertainCells": feature_collection(
            [row for row in faces if row["classification"] == "UNCERTAIN"],
            ["candidate_id", "GN", "reason"],
        ),
        "genuineCuls": feature_collection(
            [row for row in culs if row["classification"] == "GENUINE_CUL"],
            ["cul_id", "GN", "reason"],
        ),
        "uncertainCuls": feature_collection(
            [row for row in culs if row["classification"] == "UNCERTAIN"],
            ["cul_id", "GN", "reason"],
        ),
    }
    data = json.dumps(payload).replace("<", "\\u003c")
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Marshall cells and cul-de-sacs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {{ height: 100%; margin: 0; }}
    .panel {{
      position: absolute; z-index: 500; top: 12px; right: 12px; background: #fff;
      padding: 10px 12px; border-radius: 8px; font: 13px/1.45 sans-serif;
      box-shadow: 0 1px 4px rgba(0,0,0,.2); max-width: 280px;
    }}
    .panel label {{ display: block; }}
    .swatch {{ display: inline-block; width: 10px; height: 10px; margin-right: 6px; }}
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="panel">
    <strong>Cells and cul-de-sacs</strong>
    <label><input type="checkbox" id="ly-streets" checked /> Streets</label>
    <label><input type="checkbox" id="ly-gn" checked /> GN boundaries</label>
    <label><input type="checkbox" id="ly-genuineCells" checked /> <span class="swatch" style="background:#15803d"></span>Genuine cells</label>
    <label><input type="checkbox" id="ly-rejectedCells" checked /> <span class="swatch" style="background:#94a3b8"></span>Rejected cells</label>
    <label><input type="checkbox" id="ly-uncertainCells" checked /> <span class="swatch" style="background:#d97706"></span>Uncertain cells</label>
    <label><input type="checkbox" id="ly-genuineCuls" checked /> <span class="swatch" style="background:#0f766e"></span>Genuine cul-de-sacs</label>
    <label><input type="checkbox" id="ly-uncertainCuls" checked /> <span class="swatch" style="background:#7c3aed"></span>Uncertain cul-de-sacs</label>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const data = {data};
    const map = L.map('map');
    L.tileLayer('https://{{s}}.basemaps.cartocdn.com/light_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 20
    }}).addTo(map);
    const streets = L.geoJSON(data.streets, {{
      style: {{ color: '#334155', weight: 1.4 }},
      onEachFeature: (f, layer) => layer.bindPopup(`${{f.properties.name || 'unnamed'}} · ${{f.properties.gn_name}}`)
    }});
    const gns = L.geoJSON(data.gns, {{
      style: {{ color: '#0f766e', weight: 1.5, fillOpacity: 0.02 }},
      onEachFeature: (f, layer) => layer.bindPopup(f.properties.gn_name)
    }});
    function polys(name, color) {{
      return L.geoJSON(data[name], {{
        style: {{ color, weight: 1.5, fillColor: color, fillOpacity: 0.35 }},
        onEachFeature: (f, layer) => layer.bindPopup(Object.entries(f.properties).map(([k, v]) => `${{k}}: ${{v}}`).join('<br>'))
      }});
    }}
    function lines(name, color) {{
      return L.geoJSON(data[name], {{
        style: {{ color, weight: 4 }},
        onEachFeature: (f, layer) => layer.bindPopup(Object.entries(f.properties).map(([k, v]) => `${{k}}: ${{v}}`).join('<br>'))
      }});
    }}
    const groups = {{
      'ly-streets': streets,
      'ly-gn': gns,
      'ly-genuineCells': polys('genuineCells', '#15803d'),
      'ly-rejectedCells': polys('rejectedCells', '#94a3b8'),
      'ly-uncertainCells': polys('uncertainCells', '#d97706'),
      'ly-genuineCuls': lines('genuineCuls', '#0f766e'),
      'ly-uncertainCuls': lines('uncertainCuls', '#7c3aed')
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


def count_rows(rows, label_key, label) -> int:
    return sum(1 for row in rows if row[label_key] == label)


def summary_block(faces, culs) -> dict:
    report = {"cells": {}, "culs": {}}
    for name in GN_NAMES + ["TOTAL"]:
        chosen_faces = faces if name == "TOTAL" else [row for row in faces if row["GN"] == name]
        chosen_culs = culs if name == "TOTAL" else [row for row in culs if row["GN"] == name]
        report["cells"][name] = {
            "candidates": len(chosen_faces),
            "genuine": count_rows(chosen_faces, "classification", "GENUINE_CELL"),
            "uncertain": count_rows(chosen_faces, "classification", "UNCERTAIN"),
            "rejected": count_rows(chosen_faces, "classification", "NOT_A_CELL"),
        }
        report["culs"][name] = {
            "candidates": len(chosen_culs),
            "genuine": count_rows(chosen_culs, "classification", "GENUINE_CUL"),
            "uncertain": count_rows(chosen_culs, "classification", "UNCERTAIN"),
            "rejected": count_rows(chosen_culs, "classification", "NOT_A_CUL"),
        }
    return report


def write_note(report) -> None:
    def line(kind, name):
        item = report[kind][name]
        return (
            f"| {name} | {item['candidates']} | {item['genuine']} | {item['uncertain']} | {item['rejected']} |"
        )

    cell_lines = "\n".join(line("cells", name) for name in GN_NAMES + ["TOTAL"])
    cul_lines = "\n".join(line("culs", name) for name in GN_NAMES + ["TOTAL"])
    text = f"""# Marshall cells and cul-de-sacs

Cells and cul-de-sacs in this note come from the ready street lines in `roads_marshall_ready.gpkg`. Each of the five GN divisions is polygonized and counted on its own. The five areas are not dissolved.

The old green polygon layer (`cells_all.geojson`, `cells_marshall.geojson`) and the 100 m hexagonal grid are not inputs. A polygonize face is only a candidate. The face counts in the network snap table are not Marshall cells. No minimum area is applied. The old 100 m² cutoff is not used.

No T-ratio, X-ratio, cell ratio, cul ratio, or Marshall matrix is calculated.

## Cell rules

For each face, the exterior ring is matched to ready street segments within 0.25 m.

1. `NOT_A_CELL` when the ring is not a closed chain of at least three connected street segments.
2. `NOT_A_CELL` when the ring uses both OSM ids of a `manual_review` dual-carriageway pair, including D001 (`48701240` with `1498946138`) and D002 (`48701240` with `687500136`). That face is the gap between carriageways.
3. `UNCERTAIN` when the ring uses both OSM ids of a `kept_separate` parallel pair.
4. `NOT_A_CELL` when two boundary segments overlap by at least 2 m within 0.6 m and are not an already recorded dual pair.
5. `UNCERTAIN` when an unknown crossing lies on the face, or a bridge-tagged ring segment crosses another street in the interior rather than only at shared endpoints. A bridge landing that only meets other streets at endpoints does not reject the face.
6. `NOT_A_CELL` when the ring uses a segment that ends at a degree-1 `boundary_endpoints` point. Touching the GN boundary at a vertex is not enough.
7. `UNCERTAIN` when the minimum rotated-rectangle width is under 2 m, or the longest edge is more than 20 times that width. These slivers stay in the review table.
8. Otherwise `GENUINE_CELL`.

## Cul-de-sac rules

Candidates are degree-1 ends of the ready graph. Node identity is the existing 0.01 m endpoint cell. Nothing is snapped again.

- `NOT_A_CUL` when the end is a `boundary_endpoints` point.
- `NOT_A_CUL` when the only incident segment is a short fragment under 0.5 m.
- `UNCERTAIN` when the end is J0620 / crossing C0340, or the incident segment is bridge-tagged.
- `GENUINE_CUL` otherwise. The geometry is the degree-1 segment plus following degree-2 segments until the first node of degree 3 or more.

## Counts

### Cells

| GN | candidates | genuine | uncertain | rejected |
|---|---:|---:|---:|---:|
{cell_lines}

### Cul-de-sacs

| GN | candidates | genuine | uncertain | rejected |
|---|---:|---:|---:|---:|
{cul_lines}

These counts are a review of the ready street faces and dead ends. They are not a claim that every cell or cul-de-sac is error-free.
"""
    NOTE_PATH.parent.mkdir(parents=True, exist_ok=True)
    NOTE_PATH.write_text(text, encoding="utf-8")


def main() -> None:
    segments, boundary_pts, unknown_pts, pairs, boundaries, streets, j0620 = load_segments()
    by_cell = build_cell_index(segments)
    faces = detect_cells(segments, pairs, unknown_pts, boundary_pts, by_cell)
    culs = detect_culs(segments, boundary_pts, by_cell, j0620)
    write_tables(faces, culs)
    write_gpkg(faces, culs)
    write_map(faces, culs, streets, boundaries)
    report = summary_block(faces, culs)
    write_note(report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
