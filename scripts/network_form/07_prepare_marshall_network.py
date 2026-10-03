#!/usr/bin/env python3
"""Build the Marshall-ready street network checkpoint.

Joins bridge/layer tags, nodes only same-layer at-grade crossings, tests snap
tolerances, and writes diagnostic tables. Does not calculate Marshall ratios,
cells, or the matrix, and does not modify published Network Form files.
"""

from __future__ import annotations

import csv
import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Point, mapping, shape
from shapely.ops import polygonize, substring, unary_union
from shapely.strtree import STRtree
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[2]
NF = ROOT / "public" / "data" / "network-form"
ROADS_PATH = NF / "roads_streets.geojson"
GN5_PATH = NF / "gn5_divisions.geojson"
PRIMARY_PATH = (
    ROOT
    / "json_files"
    / "Primary study area final analysis 01"
    / "06_context"
    / "roads_primary.geojson"
)
OUT_ROOT = ROOT / "network_form" / "marshall_matrix"
GPKG_PATH = OUT_ROOT / "data" / "processed" / "roads_marshall_ready.gpkg"
TABLE_DIR = OUT_ROOT / "results" / "tables"
NOTE_PATH = OUT_ROOT / "notes" / "marshall_network_methodology.md"
MAP_PATH = OUT_ROOT / "results" / "maps" / "marshall_network_diagnostics.html"

SOURCE_LAYER = "public/data/network-form/roads_streets.geojson"
GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]
TOLERANCES = (0.0, 0.25, 0.5, 1.0, 2.0)
END_EPS_M = 0.05
BOUNDARY_M = 1.0
SHORT_M = 0.5
MAJOR_HIGHWAY = {"trunk", "primary", "primary_link"}
GALLE_OSM_ID = "48701240"

TO_M = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
TO_LL = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)


def load_fc(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def project_geom(geom, forward: bool):
    transformer = TO_M if forward else TO_LL
    from shapely.ops import transform

    return transform(transformer.transform, geom)


def way_number(raw) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if text.lower().startswith("way/"):
        text = text.split("/", 1)[1]
    try:
        return str(int(float(text)))
    except (TypeError, ValueError):
        return None


def is_bridge(value) -> bool:
    return str(value).strip().lower() in {"yes", "true", "1"}


def norm_layer(value) -> str:
    if value is None:
        return "0"
    text = str(value).strip()
    if text == "" or text.lower() == "null":
        return "0"
    return text


def linear_parts(geom):
    if geom is None or geom.is_empty:
        return
    kind = geom.geom_type
    if kind == "LineString":
        yield geom
    elif kind == "MultiLineString":
        for part in geom.geoms:
            if not part.is_empty:
                yield part
    elif kind == "GeometryCollection":
        for part in geom.geoms:
            yield from linear_parts(part)


def point_parts(geom):
    if geom is None or geom.is_empty:
        return
    kind = geom.geom_type
    if kind == "Point":
        yield geom
    elif kind == "MultiPoint":
        yield from geom.geoms
    elif kind == "GeometryCollection":
        for part in geom.geoms:
            yield from point_parts(part)


def overlap_length(geom) -> float:
    total = 0.0
    if geom is None or geom.is_empty:
        return 0.0
    if geom.geom_type == "LineString":
        return float(geom.length)
    if geom.geom_type == "MultiLineString":
        return float(sum(part.length for part in geom.geoms))
    if geom.geom_type == "GeometryCollection":
        for part in geom.geoms:
            total += overlap_length(part)
    return total


def is_line_end(line: LineString, point: Point, eps: float = END_EPS_M) -> bool:
    start = Point(line.coords[0])
    end = Point(line.coords[-1])
    return point.distance(start) <= eps or point.distance(end) <= eps


def coord_key(line: LineString) -> tuple:
    return tuple((round(x, 2), round(y, 2)) for x, y in line.coords)


def bearing_deg(line: LineString) -> float:
    x1, y1 = line.coords[0]
    x2, y2 = line.coords[-1]
    return math.degrees(math.atan2(y2 - y1, x2 - x1)) % 180.0


def bearing_delta(a: float, b: float) -> float:
    delta = abs(a - b) % 180.0
    if delta > 90.0:
        delta = 180.0 - delta
    return delta


def sample_distances(line: LineString) -> list[float]:
    if line.length <= 0:
        return []
    steps = 6
    return [line.length * i / steps for i in range(steps + 1)]


class UnionFind:
    def __init__(self, size: int):
        self.parent = list(range(size))
        self.rank = [0] * size

    def find(self, item: int) -> int:
        parent = self.parent
        while parent[item] != item:
            parent[item] = parent[parent[item]]
            item = parent[item]
        return item

    def union(self, left: int, right: int) -> bool:
        a = self.find(left)
        b = self.find(right)
        if a == b:
            return False
        if self.rank[a] < self.rank[b]:
            a, b = b, a
        self.parent[b] = a
        if self.rank[a] == self.rank[b]:
            self.rank[a] += 1
        return True


def load_bridge_lookup(path: Path) -> dict[str, dict]:
    lookup: dict[str, dict] = {}
    for feature in load_fc(path)["features"]:
        props = feature.get("properties") or {}
        osm_id = way_number(props.get("id"))
        if osm_id is None:
            continue
        incoming = {
            "bridge": props.get("bridge"),
            "layer": props.get("layer"),
        }
        current = lookup.get(osm_id)
        if current is None or (is_bridge(incoming["bridge"]) and not is_bridge(current["bridge"])):
            lookup[osm_id] = incoming
    return lookup


def load_gn_polygons() -> list[dict]:
    polygons = []
    for feature in load_fc(GN5_PATH)["features"]:
        props = feature.get("properties") or {}
        name = props.get("ADM4_EN")
        if name not in GN_NAMES:
            continue
        geom = project_geom(shape(feature["geometry"]), True)
        if geom.geom_type == "MultiPolygon":
            geom = max(geom.geoms, key=lambda part: part.area)
        polygons.append(
            {
                "name": name,
                "pcode": props.get("ADM4_PCODE"),
                "geom_m": geom,
                "feature": feature,
            }
        )
    missing = [name for name in GN_NAMES if name not in {item["name"] for item in polygons}]
    if missing:
        raise RuntimeError(f"GN polygons missing: {missing}")
    return polygons


def prepare_source_lines(bridge_lookup: dict[str, dict]) -> tuple[list[dict], list[dict], float]:
    changes = []
    seen: dict[tuple, str] = {}
    prepared = []
    length_before = 0.0
    for feature in load_fc(ROADS_PATH)["features"]:
        props = feature.get("properties") or {}
        osm_id = way_number(props.get("osm_id")) or ""
        raw = shape(feature["geometry"])
        if not raw.is_valid:
            repaired = make_valid(raw)
            lines = list(linear_parts(repaired))
            if not lines:
                changes.append(
                    {
                        "original_feature": props.get("nf_road_id"),
                        "osm_id": osm_id,
                        "change": "dropped",
                        "reason": "invalid geometry and make_valid returned no line",
                    }
                )
                continue
            changes.append(
                {
                    "original_feature": props.get("nf_road_id"),
                    "osm_id": osm_id,
                    "change": "repaired",
                    "reason": "invalid geometry replaced with linear parts from make_valid",
                }
            )
            raw_parts = lines
        else:
            raw_parts = list(linear_parts(raw))
            if raw.geom_type == "MultiLineString":
                changes.append(
                    {
                        "original_feature": props.get("nf_road_id"),
                        "osm_id": osm_id,
                        "change": "exploded",
                        "reason": "MultiLineString exploded to LineString parts",
                    }
                )
        tags = bridge_lookup.get(osm_id)
        for index, part_ll in enumerate(raw_parts):
            part_m = project_geom(part_ll, True)
            length_before += float(part_m.length) if index == 0 or raw.geom_type != "LineString" else 0.0
            if index == 0 and raw.geom_type == "LineString":
                pass
            if part_m.length <= 1e-6:
                changes.append(
                    {
                        "original_feature": props.get("nf_road_id"),
                        "osm_id": osm_id,
                        "change": "dropped",
                        "reason": "zero-length line",
                    }
                )
                continue
            key = coord_key(part_m)
            if key in seen:
                changes.append(
                    {
                        "original_feature": props.get("nf_road_id"),
                        "osm_id": osm_id,
                        "change": "dropped_duplicate",
                        "reason": f"identical geometry already kept as {seen[key]}",
                    }
                )
                continue
            nf_id = str(props.get("nf_road_id") or "")
            part_id = nf_id if len(raw_parts) == 1 else f"{nf_id}#{index}"
            seen[key] = part_id
            prepared.append(
                {
                    "osm_id": osm_id,
                    "highway": props.get("highway") or "",
                    "name": props.get("name") or "",
                    "nf_road_id": part_id,
                    "bridge": None if tags is None else tags.get("bridge"),
                    "layer": None if tags is None else tags.get("layer"),
                    "bridge_join": "matched" if tags is not None else "unmatched",
                    "line_m": part_m,
                    "source_ends": (Point(part_m.coords[0]), Point(part_m.coords[-1])),
                }
            )
    # length_before should be the sum of original projected lines, once each.
    length_before = 0.0
    for feature in load_fc(ROADS_PATH)["features"]:
        geom = project_geom(shape(feature["geometry"]), True)
        length_before += float(geom.length)
    return prepared, changes, length_before


def clip_to_gns(lines: list[dict], gns: list[dict]) -> tuple[dict[str, list[dict]], dict]:
    union = unary_union([item["geom_m"] for item in gns])
    by_gn = {item["name"]: [] for item in gns}
    fringe_parts = 0
    fringe_length = 0.0
    for record in lines:
        outside = record["line_m"].difference(union)
        fringe_bits = [part for part in linear_parts(outside) if part.length > 1e-6]
        fringe_parts += len(fringe_bits)
        fringe_length += sum(part.length for part in fringe_bits)
        for gn in gns:
            clipped = record["line_m"].intersection(gn["geom_m"])
            for part in linear_parts(clipped):
                if part.length <= 1e-6:
                    continue
                by_gn[gn["name"]].append(
                    {
                        **record,
                        "gn_name": gn["name"],
                        "line_m": part,
                        "short_fragment": part.length < SHORT_M,
                    }
                )
    stats = {
        "fringe_parts": fringe_parts,
        "fringe_length_m": fringe_length,
        "clipped_segments": sum(len(parts) for parts in by_gn.values()),
        "clipped_length_m": sum(part["line_m"].length for parts in by_gn.values() for part in parts),
    }
    return by_gn, stats


def crossing_decision(left: dict, right: dict) -> tuple[str, str, str]:
    if left["bridge_join"] != "matched" or right["bridge_join"] != "matched":
        return (
            "unknown",
            "do_not_connect",
            "one or both osm ids are absent from roads_primary, so bridge status is unknown",
        )
    if is_bridge(left["bridge"]) or is_bridge(right["bridge"]) or norm_layer(left["layer"]) != norm_layer(right["layer"]):
        return (
            "not_connected",
            "do_not_connect",
            "bridge tag or differing layer; geometric crossing is not a street junction",
        )
    return (
        "connected",
        "split",
        "both ways matched, neither is a bridge, and both are on the same layer",
    )


def find_crossings(by_gn: dict[str, list[dict]]) -> tuple[list[dict], dict[str, list[dict]], list[dict]]:
    crossings = []
    split_points: dict[str, list[dict]] = {name: [] for name in by_gn}
    overlaps = []
    serial = 1
    for gn_name, segments in by_gn.items():
        if not segments:
            continue
        tree = STRtree([item["line_m"] for item in segments])
        seen_pairs = set()
        for index, segment in enumerate(segments):
            for other_index in tree.query(segment["line_m"]):
                other_index = int(other_index)
                if other_index <= index:
                    continue
                pair = (index, other_index)
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)
                other = segments[other_index]
                if segment["osm_id"] == other["osm_id"] and segment["nf_road_id"] == other["nf_road_id"]:
                    continue
                intersection = segment["line_m"].intersection(other["line_m"])
                if intersection.is_empty:
                    continue
                shared = overlap_length(intersection)
                if shared >= SHORT_M:
                    overlaps.append(
                        {
                            "gn_name": gn_name,
                            "osm_id_1": segment["osm_id"],
                            "osm_id_2": other["osm_id"],
                            "overlap_m": round(shared, 2),
                            "nf_road_id_1": segment["nf_road_id"],
                            "nf_road_id_2": other["nf_road_id"],
                        }
                    )
                for point in point_parts(intersection):
                    left_end = is_line_end(segment["line_m"], point)
                    right_end = is_line_end(other["line_m"], point)
                    bridge_or_layer = (
                        is_bridge(segment["bridge"])
                        or is_bridge(other["bridge"])
                        or norm_layer(segment["layer"]) != norm_layer(other["layer"])
                    )
                    if left_end and right_end and not bridge_or_layer:
                        continue
                    if left_end and right_end:
                        if segment["bridge_join"] != "matched" or other["bridge_join"] != "matched":
                            status, treatment, reason = (
                                "unknown",
                                "do_not_connect",
                                "shared endpoint involves an unmatched osm id, so bridge status is unknown",
                            )
                        else:
                            status, treatment, reason = (
                                "connected",
                                "allow_approach",
                                "bridge-tagged way meets another way only at a shared endpoint, so the landing stays connected; not an interior grade-separated crossing",
                            )
                    else:
                        status, treatment, reason = crossing_decision(segment, other)
                    lon, lat = TO_LL.transform(point.x, point.y)
                    crossings.append(
                        {
                            "crossing_id": f"C{serial:04d}",
                            "gn_name": gn_name,
                            "osm_id_1": segment["osm_id"],
                            "osm_id_2": other["osm_id"],
                            "bridge_status": f"{segment['bridge']}|{other['bridge']}",
                            "layer_status": f"{norm_layer(segment['layer'])}|{norm_layer(other['layer'])}",
                            "connection_status": status,
                            "treatment": treatment,
                            "reason": reason,
                            "lon": lon,
                            "lat": lat,
                            "x": point.x,
                            "y": point.y,
                        }
                    )
                    serial += 1
                    if status == "connected":
                        split_points[gn_name].append(
                            {
                                "indexes": (index, other_index),
                                "point": point,
                            }
                        )
    return crossings, split_points, overlaps


def apply_splits(by_gn: dict[str, list[dict]], split_points: dict[str, list[dict]], changes: list[dict]) -> dict[str, list[dict]]:
    noded = {}
    for gn_name, segments in by_gn.items():
        buckets: dict[int, list[Point]] = defaultdict(list)
        for item in split_points.get(gn_name, []):
            point = item["point"]
            for index in item["indexes"]:
                buckets[index].append(point)
        pieces = []
        for index, segment in enumerate(segments):
            cuts = []
            for point in buckets.get(index, []):
                distance = float(segment["line_m"].project(point))
                if END_EPS_M < distance < segment["line_m"].length - END_EPS_M:
                    cuts.append(distance)
            cuts = sorted(set(round(distance, 3) for distance in cuts))
            bounds = [0.0, *cuts, float(segment["line_m"].length)]
            part_index = 0
            for start, end in zip(bounds, bounds[1:]):
                if end - start <= 1e-6:
                    continue
                part = substring(segment["line_m"], start, end)
                if part.geom_type != "LineString" or part.length <= 1e-6:
                    changes.append(
                        {
                            "original_feature": segment["nf_road_id"],
                            "osm_id": segment["osm_id"],
                            "change": "dropped",
                            "reason": "split produced a zero-length piece",
                        }
                    )
                    continue
                pieces.append(
                    {
                        **segment,
                        "line_m": part,
                        "short_fragment": part.length < SHORT_M,
                        "segment_id": f"{gn_name[:2].upper()}-{index}-{part_index}",
                        "was_split": len(cuts) > 0,
                    }
                )
                part_index += 1
        noded[gn_name] = pieces
    return noded


def forbidden_index(crossings: list[dict]) -> dict[frozenset, list[tuple[float, float]]]:
    index = defaultdict(list)
    for row in crossings:
        if row["connection_status"] == "connected":
            continue
        index[frozenset((row["osm_id_1"], row["osm_id_2"]))].append((row["x"], row["y"]))
    return index


def evaluate_tolerance(noded: dict[str, list[dict]], forbidden: dict, tolerance: float) -> dict[str, dict]:
    per_gn = {}
    for gn_name, segments in noded.items():
        per_gn[gn_name] = graph_metrics(segments, forbidden, tolerance)
    total = {
        "gn_name": "TOTAL",
        "tolerance_m": tolerance,
        "components": sum(row["components"] for row in per_gn.values()),
        "endpoint_merges": sum(row["endpoint_merges"] for row in per_gn.values()),
        "junctions_degree_ge3": sum(row["junctions_degree_ge3"] for row in per_gn.values()),
        "different_name_merges": sum(row["different_name_merges"] for row in per_gn.values()),
        "polygonize_faces": sum(row["polygonize_faces"] for row in per_gn.values()),
        "illegal_layer_or_bridge_merges": sum(row["illegal_layer_or_bridge_merges"] for row in per_gn.values()),
    }
    per_gn["TOTAL"] = total
    return per_gn


def graph_metrics(segments: list[dict], forbidden: dict, tolerance: float) -> dict:
    if not segments:
        return {
            "components": 0,
            "endpoint_merges": 0,
            "junctions_degree_ge3": 0,
            "different_name_merges": 0,
        "polygonize_faces": 0,
        "illegal_layer_or_bridge_merges": 0,
        "node_of_end": {},
        "name_merge_examples": [],
    }
    ends = []
    for index, segment in enumerate(segments):
        coords = list(segment["line_m"].coords)
        for which, coord in (("start", coords[0]), ("end", coords[-1])):
            ends.append(
                {
                    "seg": index,
                    "which": which,
                    "x": coord[0],
                    "y": coord[1],
                    "osm_id": segment["osm_id"],
                    "name": (segment["name"] or "").strip(),
                    "layer": norm_layer(segment["layer"]),
                    "bridge": is_bridge(segment["bridge"]),
                }
            )
    uf = UnionFind(len(ends))
    cell = max(tolerance, END_EPS_M)
    buckets = defaultdict(list)
    for index, item in enumerate(ends):
        buckets[(math.floor(item["x"] / cell), math.floor(item["y"] / cell))].append(index)
    merges = 0
    name_merges = 0
    name_merge_examples = []
    illegal = 0
    for index, item in enumerate(ends):
        cx = math.floor(item["x"] / cell)
        cy = math.floor(item["y"] / cell)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for other_index in buckets.get((cx + dx, cy + dy), []):
                    if other_index <= index:
                        continue
                    other = ends[other_index]
                    distance = math.hypot(item["x"] - other["x"], item["y"] - other["y"])
                    if distance > max(tolerance, END_EPS_M):
                        continue
                    if pair_forbidden(item, other, forbidden, tolerance):
                        continue
                    preexisting = distance <= END_EPS_M
                    same_layer = item["layer"] == other["layer"]
                    if not preexisting and not same_layer:
                        continue
                    if not preexisting and tolerance <= 0:
                        continue
                    if not uf.union(index, other_index):
                        continue
                    if preexisting:
                        continue
                    merges += 1
                    if item["name"] and other["name"] and item["name"] != other["name"]:
                        name_merges += 1
                        name_merge_examples.append(
                            {
                                "osm_id_1": item["osm_id"],
                                "osm_id_2": other["osm_id"],
                                "names": f"{item['name']}|{other['name']}",
                            }
                        )
                    if item["bridge"] != other["bridge"] or item["layer"] != other["layer"]:
                        illegal += 1
    clusters = defaultdict(list)
    for index in range(len(ends)):
        clusters[uf.find(index)].append(index)
    reps = {}
    for root, members in clusters.items():
        reps[root] = (
            sum(ends[item]["x"] for item in members) / len(members),
            sum(ends[item]["y"] for item in members) / len(members),
        )
    degree = defaultdict(int)
    snapped_lines = []
    for index, segment in enumerate(segments):
        start_root = uf.find(index * 2)
        end_root = uf.find(index * 2 + 1)
        degree[start_root] += 1
        degree[end_root] += 1
        coords = list(segment["line_m"].coords)
        coords[0] = reps[start_root]
        coords[-1] = reps[end_root]
        if coords[0] == coords[-1] and len(coords) == 2:
            continue
        snapped = LineString(coords)
        if snapped.length > 1e-6:
            snapped_lines.append(snapped)
    components = 0
    if snapped_lines:
        node_uf = UnionFind(len(clusters))
        root_list = list(clusters.keys())
        root_pos = {root: pos for pos, root in enumerate(root_list)}
        touched = set()
        for index, segment in enumerate(segments):
            start_root = uf.find(index * 2)
            end_root = uf.find(index * 2 + 1)
            if start_root == end_root:
                touched.add(root_pos[start_root])
                continue
            node_uf.union(root_pos[start_root], root_pos[end_root])
            touched.add(root_pos[start_root])
            touched.add(root_pos[end_root])
        components = len({node_uf.find(pos) for pos in touched})
    faces = 0
    if snapped_lines:
        faces = sum(1 for _ in polygonize(snapped_lines))
    node_of_end = {}
    for index in range(len(ends)):
        root = uf.find(index)
        node_of_end[(ends[index]["seg"], ends[index]["which"])] = (root, reps[root], degree[root])
    return {
        "components": components,
        "endpoint_merges": merges,
        "junctions_degree_ge3": sum(1 for value in degree.values() if value >= 3),
        "different_name_merges": name_merges,
        "polygonize_faces": faces,
        "illegal_layer_or_bridge_merges": illegal,
        "node_of_end": node_of_end,
        "name_merge_examples": name_merge_examples,
    }


def pair_forbidden(left: dict, right: dict, forbidden: dict, tolerance: float) -> bool:
    if left["osm_id"] == right["osm_id"]:
        return False
    points = forbidden.get(frozenset((left["osm_id"], right["osm_id"])))
    if not points:
        return False
    reach = max(tolerance, END_EPS_M)
    for x, y in points:
        if math.hypot(left["x"] - x, left["y"] - y) <= reach and math.hypot(right["x"] - x, right["y"] - y) <= reach:
            return True
    return False


def choose_tolerance(total_rows: list[dict]) -> tuple[float, str, str]:
    by_tol = {row["tolerance_m"]: row for row in total_rows}
    rejected = {}
    for tolerance, row in by_tol.items():
        if row["illegal_layer_or_bridge_merges"] > 0:
            rejected[tolerance] = "merges a bridge with a non-bridge or two layers"
    if by_tol[2.0]["different_name_merges"] > by_tol[1.0]["different_name_merges"]:
        rejected[2.0] = "2.0 m adds differently named merges that 1.0 m does not"
    plateau = []
    for index, tolerance in enumerate(TOLERANCES):
        if tolerance in rejected or index == 0:
            continue
        previous = by_tol[TOLERANCES[index - 1]]["components"]
        current = by_tol[tolerance]["components"]
        fall = 0.0 if previous <= 0 else (previous - current) / previous
        if 0.0 <= fall < 0.01:
            plateau.append(tolerance)
    if 1.0 in plateau and 1.0 not in rejected:
        return (
            1.0,
            "1.0 m is on the plateau where components fall under 1 percent, and it matches the existing Network Form snap",
            "defensible",
        )
    if plateau:
        chosen = min(plateau)
        return (
            chosen,
            f"{chosen} m is the smallest tested tolerance on the plateau",
            "defensible",
        )
    return (
        0.0,
        "no tested tolerance satisfied the selection rule, so the network keeps coincident endpoints only",
        "low",
    )


def parallel_overlap_m(left: LineString, right: LineString) -> tuple[float, float]:
    distances = []
    projections = []
    for distance in sample_distances(left):
        point = left.interpolate(distance)
        gap = point.distance(right)
        along = right.project(point)
        foot = right.interpolate(along)
        if foot.distance(point) <= 25.0 and 0.0 <= along <= right.length:
            distances.append(gap)
            projections.append(along)
    if len(projections) < 2:
        return 0.0, 0.0
    overlap = max(projections) - min(projections)
    median = sorted(distances)[len(distances) // 2]
    return overlap, median


def find_dual_carriageways(noded: dict[str, list[dict]]) -> list[dict]:
    cases = []
    serial = 1
    seen_galle = False
    for gn_name, segments in noded.items():
        tree = STRtree([item["line_m"].buffer(25.0) for item in segments]) if segments else None
        used = set()
        for index, segment in enumerate(segments):
            if segment["osm_id"] == GALLE_OSM_ID or (segment["name"] or "").strip().lower() == "galle road":
                seen_galle = True
            if tree is None:
                continue
            for other_index in tree.query(segment["line_m"]):
                other_index = int(other_index)
                if other_index <= index:
                    continue
                other = segments[other_index]
                pair_key = (segment["osm_id"], other["osm_id"], gn_name)
                if pair_key in used:
                    continue
                if bearing_delta(bearing_deg(segment["line_m"]), bearing_deg(other["line_m"])) > 15.0:
                    continue
                overlap, gap = parallel_overlap_m(segment["line_m"], other["line_m"])
                if overlap < 30.0 or not (2.0 <= gap <= 25.0):
                    continue
                used.add(pair_key)
                name_left = (segment["name"] or "").strip()
                name_right = (other["name"] or "").strip()
                same_name = bool(name_left and name_left == name_right)
                major = segment["highway"] in MAJOR_HIGHWAY or other["highway"] in MAJOR_HIGHWAY
                galle = segment["osm_id"] == GALLE_OSM_ID or other["osm_id"] == GALLE_OSM_ID
                if galle or same_name or major:
                    treatment = "manual_review"
                    problem = "parallel lines could close a thin artificial cell or add junctions if treated as one street"
                    confidence = "high" if galle or (same_name and major) else "medium"
                else:
                    treatment = "kept_separate"
                    problem = "parallel lines kept as separate edges; not collapsed"
                    confidence = "low"
                mid = segment["line_m"].interpolate(0.5, normalized=True)
                lon, lat = TO_LL.transform(mid.x, mid.y)
                cases.append(
                    {
                        "case_id": f"D{serial:03d}",
                        "gn_name": gn_name,
                        "location": f"{lat:.5f}, {lon:.5f}",
                        "road_ids": f"{segment['osm_id']}|{other['osm_id']}",
                        "names": f"{name_left}|{name_right}",
                        "interpretation": "possible opposite carriageways" if same_name or galle or major else "parallel streets",
                        "potential_problem": problem,
                        "treatment": treatment,
                        "confidence": confidence,
                        "separation_m": round(gap, 2),
                        "overlap_m": round(overlap, 2),
                        "geometry": MultiLineString([segment["line_m"], other["line_m"]]),
                    }
                )
                serial += 1
    if not seen_galle:
        cases.append(
            {
                "case_id": "D000",
                "gn_name": "",
                "location": "",
                "road_ids": GALLE_OSM_ID,
                "names": "Galle Road",
                "interpretation": "Galle Road osm id was not present inside the five GN clips",
                "potential_problem": "cannot assess a divided carriageway that is outside the analysis units",
                "treatment": "manual_review",
                "confidence": "low",
                "separation_m": "",
                "overlap_m": "",
                "geometry": None,
            }
        )
    elif not any(GALLE_OSM_ID in row["road_ids"].split("|") for row in cases if row["case_id"] != "D000"):
        cases.append(
            {
                "case_id": "D000",
                "gn_name": "",
                "location": "",
                "road_ids": GALLE_OSM_ID,
                "names": "Galle Road",
                "interpretation": "single linestring in the Network Form streets; no parallel partner within 2–25 m",
                "potential_problem": "a second carriageway is not drawn in this layer, so none was collapsed",
                "treatment": "none_required",
                "confidence": "medium",
                "separation_m": "",
                "overlap_m": "",
                "geometry": None,
            }
        )
    return cases


def boundary_endpoints(noded: dict[str, list[dict]], gns: list[dict], forbidden: dict, tolerance: float) -> list[dict]:
    gn_geom = {item["name"]: item["geom_m"] for item in gns}
    points = []
    serial = 1
    for gn_name, segments in noded.items():
        metrics = graph_metrics(segments, forbidden, tolerance)
        boundary = gn_geom[gn_name].boundary
        seen = set()
        for (seg_index, which), (root, xy, degree) in metrics["node_of_end"].items():
            if degree != 1 or root in seen:
                continue
            seen.add(root)
            point = Point(xy)
            if boundary.distance(point) > BOUNDARY_M:
                continue
            segment = segments[seg_index]
            source_hit = any(point.distance(end) <= END_EPS_M for end in segment["source_ends"])
            if source_hit:
                continue
            lon, lat = TO_LL.transform(point.x, point.y)
            points.append(
                {
                    "endpoint_id": f"B{serial:04d}",
                    "class": "BOUNDARY_ENDPOINT",
                    "gn_name": gn_name,
                    "osm_id": segment["osm_id"],
                    "nf_road_id": segment["nf_road_id"],
                    "reason": "degree-1 end created by clipping to the GN polygon",
                    "lon": lon,
                    "lat": lat,
                }
            )
            serial += 1
    return points


def snapped_output_segments(noded: dict[str, list[dict]], forbidden: dict, tolerance: float) -> list[dict]:
    rows = []
    serial = 1
    for gn_name, segments in noded.items():
        metrics = graph_metrics(segments, forbidden, tolerance)
        for index, segment in enumerate(segments):
            start = metrics["node_of_end"][(index, "start")]
            end = metrics["node_of_end"][(index, "end")]
            coords = list(segment["line_m"].coords)
            coords[0] = start[1]
            coords[-1] = end[1]
            line = LineString(coords)
            if line.length <= 1e-6:
                continue
            line_ll = project_geom(line, False)
            status = "clipped_to_gn"
            if segment.get("was_split"):
                status += ";split_at_grade_junction"
            status += f";snapped_{tolerance:.2f}m"
            rows.append(
                {
                    "segment_id": f"S{serial:04d}",
                    "osm_id": segment["osm_id"],
                    "highway": segment["highway"],
                    "name": segment["name"],
                    "nf_road_id": segment["nf_road_id"],
                    "gn_name": gn_name,
                    "bridge": "" if segment["bridge"] is None else str(segment["bridge"]),
                    "layer": "" if segment["layer"] is None else str(segment["layer"]),
                    "bridge_join": segment["bridge_join"],
                    "source_layer": SOURCE_LAYER,
                    "processing_status": status,
                    "short_fragment": bool(line.length < SHORT_M),
                    "length_m": round(float(line.length), 3),
                    "geometry": line_ll,
                }
            )
            serial += 1
    return rows


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def write_gpkg(streets, endpoints, crossings, duals, gns) -> None:
    GPKG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if GPKG_PATH.exists():
        GPKG_PATH.unlink()

    def frame(rows, geometry_key="geometry"):
        if not rows:
            return gpd.GeoDataFrame({"geometry": []}, geometry="geometry", crs="EPSG:4326")
        payload = []
        geometries = []
        for row in rows:
            item = {key: value for key, value in row.items() if key != geometry_key}
            geometries.append(row.get(geometry_key))
            payload.append(item)
        return gpd.GeoDataFrame(payload, geometry=geometries, crs="EPSG:4326")

    layers = {
        "streets": frame(streets),
        "boundary_endpoints": frame(
            [
                {
                    **row,
                    "geometry": Point(row["lon"], row["lat"]),
                }
                for row in endpoints
            ]
        ),
        "crossings": frame(
            [
                {
                    **{key: row[key] for key in (
                        "crossing_id",
                        "gn_name",
                        "osm_id_1",
                        "osm_id_2",
                        "bridge_status",
                        "layer_status",
                        "connection_status",
                        "treatment",
                        "reason",
                    )},
                    "geometry": Point(row["lon"], row["lat"]),
                }
                for row in crossings
            ]
        ),
        "dual_carriageways": frame([row for row in duals if row.get("geometry") is not None]),
        "gn_boundaries": gpd.GeoDataFrame(
            [{"gn_name": item["name"], "gn_pcode": item["pcode"]} for item in gns],
            geometry=[shape(item["feature"]["geometry"]) for item in gns],
            crs="EPSG:4326",
        ),
    }
    first = True
    for name, data in layers.items():
        data.to_file(
            GPKG_PATH,
            layer=name,
            driver="GPKG",
            mode="w" if first else "a",
            engine="pyogrio",
        )
        first = False


def write_map(streets, endpoints, crossings, duals, gns) -> None:
    MAP_PATH.parent.mkdir(parents=True, exist_ok=True)

    def collection(features):
        return {"type": "FeatureCollection", "features": features}

    street_features = [
        {
            "type": "Feature",
            "properties": {
                "segment_id": row["segment_id"],
                "osm_id": row["osm_id"],
                "name": row["name"],
                "highway": row["highway"],
                "gn_name": row["gn_name"],
                "bridge": row["bridge"],
                "layer": row["layer"],
            },
            "geometry": mapping(row["geometry"]),
        }
        for row in streets
    ]
    gn_features = [
        {
            "type": "Feature",
            "properties": {"gn_name": item["name"]},
            "geometry": item["feature"]["geometry"],
        }
        for item in gns
    ]
    crossing_features = [
        {
            "type": "Feature",
            "properties": {
                "crossing_id": row["crossing_id"],
                "connection_status": row["connection_status"],
                "osm_id_1": row["osm_id_1"],
                "osm_id_2": row["osm_id_2"],
                "reason": row["reason"],
            },
            "geometry": {"type": "Point", "coordinates": [row["lon"], row["lat"]]},
        }
        for row in crossings
        if row["connection_status"] != "connected"
    ]
    endpoint_features = [
        {
            "type": "Feature",
            "properties": {"endpoint_id": row["endpoint_id"], "gn_name": row["gn_name"], "osm_id": row["osm_id"]},
            "geometry": {"type": "Point", "coordinates": [row["lon"], row["lat"]]},
        }
        for row in endpoints
    ]
    dual_features = []
    for row in duals:
        if row.get("geometry") is None:
            continue
        dual_features.append(
            {
                "type": "Feature",
                "properties": {
                    "case_id": row["case_id"],
                    "treatment": row["treatment"],
                    "road_ids": row["road_ids"],
                    "interpretation": row["interpretation"],
                },
                "geometry": mapping(project_geom(row["geometry"], False)),
            }
        )
    payload = {
        "streets": collection(street_features),
        "gns": collection(gn_features),
        "crossings": collection(crossing_features),
        "endpoints": collection(endpoint_features),
        "duals": collection(dual_features),
    }
    data = json.dumps(payload).replace("<", "\\u003c")
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Marshall network diagnostics</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {{ height: 100%; margin: 0; }}
    .panel {{
      position: absolute; z-index: 500; top: 12px; right: 12px;
      background: #fff; padding: 10px 12px; border-radius: 8px;
      font: 13px/1.4 sans-serif; box-shadow: 0 1px 4px rgba(0,0,0,.2);
    }}
    .panel label {{ display: block; }}
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="panel">
    <strong>Marshall network diagnostics</strong>
    <label><input type="checkbox" id="ly-streets" checked /> Streets</label>
    <label><input type="checkbox" id="ly-gn" checked /> GN boundaries</label>
    <label><input type="checkbox" id="ly-bridge" checked /> Grade-separated crossings</label>
    <label><input type="checkbox" id="ly-unknown" checked /> Unknown crossings</label>
    <label><input type="checkbox" id="ly-ends" checked /> Boundary endpoints</label>
    <label><input type="checkbox" id="ly-dual" checked /> Dual-carriageway cases</label>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const data = {data};
    const map = L.map('map');
    L.tileLayer('https://{{s}}.basemaps.cartocdn.com/light_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 20
    }}).addTo(map);
    const streets = L.geoJSON(data.streets, {{
      style: {{ color: '#334155', weight: 2 }},
      onEachFeature: (f, layer) => layer.bindPopup(
        `${{f.properties.segment_id}} · ${{f.properties.name || 'unnamed'}}<br>${{f.properties.gn_name}} · osm ${{f.properties.osm_id}}<br>bridge ${{f.properties.bridge || '—'}} · layer ${{f.properties.layer || '—'}}`
      )
    }});
    const gns = L.geoJSON(data.gns, {{
      style: {{ color: '#0f766e', weight: 2, fillOpacity: 0.04 }},
      onEachFeature: (f, layer) => layer.bindPopup(f.properties.gn_name)
    }});
    function crossingLayer(status, color) {{
      return L.geoJSON(data.crossings, {{
        filter: (f) => f.properties.connection_status === status,
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {{
          radius: 6, color, fillColor: color, fillOpacity: 0.9, weight: 1
        }}),
        onEachFeature: (f, layer) => layer.bindPopup(
          `${{f.properties.crossing_id}} · ${{f.properties.connection_status}}<br>osm ${{f.properties.osm_id_1}} / ${{f.properties.osm_id_2}}<br>${{f.properties.reason}}`
        )
      }});
    }}
    const bridges = crossingLayer('not_connected', '#ea580c');
    const unknown = crossingLayer('unknown', '#dc2626');
    const ends = L.geoJSON(data.endpoints, {{
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {{
        radius: 4, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.85, weight: 1
      }}),
      onEachFeature: (f, layer) => layer.bindPopup(
        `${{f.properties.endpoint_id}} · BOUNDARY_ENDPOINT<br>${{f.properties.gn_name}} · osm ${{f.properties.osm_id}}`
      )
    }});
    const duals = L.geoJSON(data.duals, {{
      style: {{ color: '#7c3aed', weight: 4, opacity: 0.8 }},
      onEachFeature: (f, layer) => layer.bindPopup(
        `${{f.properties.case_id}} · ${{f.properties.treatment}}<br>${{f.properties.road_ids}}<br>${{f.properties.interpretation}}`
      )
    }});
    const groups = {{
      'ly-streets': streets, 'ly-gn': gns, 'ly-bridge': bridges,
      'ly-unknown': unknown, 'ly-ends': ends, 'ly-dual': duals
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


def write_methodology(summary: dict, snap_rows: list[dict], chosen: float, reason: str, confidence: str) -> None:
    NOTE_PATH.parent.mkdir(parents=True, exist_ok=True)
    total_lines = [
        "| tolerance_m | components | endpoint_merges | junctions_degree_ge3 | different_name_merges | polygonize_faces | illegal_merges |",
        "|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for row in snap_rows:
        if row["gn_name"] != "TOTAL":
            continue
        total_lines.append(
            f"| {row['tolerance_m']} | {row['components']} | {row['endpoint_merges']} | "
            f"{row['junctions_degree_ge3']} | {row['different_name_merges']} | "
            f"{row['polygonize_faces']} | {row['illegal_layer_or_bridge_merges']} |"
        )
    text = f"""# Marshall-ready street network

Generated {summary['generated_at']}.

This note records how the checkpoint network was prepared. It is an auditable working file. It is not a claim that every street, bridge, or parallel carriageway is error-free.

## Extent

- Source streets: `{SOURCE_LAYER}` (Network Form motorable set: trunk, primary, secondary, tertiary, residential, living_street, unclassified, service).
- Bridge and layer tags: `json_files/Primary study area final analysis 01/06_context/roads_primary.geojson`, joined on the numeric OSM way id (`way/98371180` matches street `osm_id` 98371180).
- Analysis units: the five GN polygons in `public/data/network-form/gn5_divisions.geojson` (Mount Lavinia, Kawdana West, Watarappala, Wathumulla, Wedikanda). Each GN is clipped on its own.
- The 75 m buffer used to build `roads_streets.geojson` is not part of the Marshall analysis. Segments that fall only in that fringe are excluded from `roads_marshall_ready.gpkg` and counted in the preparation summary ({summary['fringe_parts']} parts, {summary['fringe_length_m']:.1f} m).

## Noding

`shapely.ops.unary_union` is not used on the streets. A geometric crossing is split into a shared node only when both ways matched the OSM source, neither is `bridge=yes`, and both layers are the same (a missing layer is treated as ground).

An interior crossing with `bridge=yes` or unequal layers is stored as `not_connected` and is not given a shared node. A bridge-tagged way that only meets another way at a shared endpoint is an approach landing: it stays connected and is recorded as `allow_approach`. If either way did not match `roads_primary.geojson`, the crossing is `unknown` and is not connected.

Snap clustering does not pull a bridge vertex onto the road it crosses. Vertices farther than 0.05 m apart merge only when they share a layer and the pair is not a recorded grade-separated or unknown crossing. Vertices already within 0.05 m stay together so a bridge deck remains joined to its own approaches.

Polygonize face counts in the snap table are a false-loop diagnostic only. They are not Marshall cells.

## Snap test

Tolerances tested: 0, 0.25, 0.5, 1.0, and 2.0 metres.

{chr(10).join(total_lines)}

Chosen tolerance: **{chosen} m**. Confidence: **{confidence}**.

{reason}

Differently named roads merged by that snap are listed in `network_validation_issues.csv`. They were not silently accepted as junctions and they were not used to reject the tolerance, because the component count did not fall further. Those rows still need a look.

Selection order: reject a tolerance that merges different layers or a bridge with a non-bridge; reject 2.0 m when it adds differently named merges that 1.0 m does not; take the smallest remaining tolerance whose component count falls by under 1 percent versus the next smaller test; if 1.0 m is on that plateau and was not rejected, keep 1.0 m because it matches the existing Network Form graph; otherwise keep 0 m.

## Other checks

- Dual carriageways are flagged, not collapsed and not deleted. Galle Road (`osm_id` {GALLE_OSM_ID}) is called out in `dual_carriageways.csv`.
- `BOUNDARY_ENDPOINT` is a degree-1 node within 1 m of the GN boundary whose coordinate is not an endpoint of the source street, so the clip created it. These points are not cul-de-sacs.
- Lines shorter than 0.5 m are kept and flagged `short_fragment`. Identical duplicate geometries are dropped once and logged. Overlaps are flagged and kept.

## Counts

- Street features in the source file: {summary['features_before']}
- Length before clipping: {summary['length_before_m']:.1f} m
- Segments after the per-GN clip: {summary['clipped_segments']}
- Length inside the five GNs before noding: {summary['clipped_length_m']:.1f} m
- Final segments: {summary['final_segments']}
- Final length: {summary['final_length_m']:.1f} m
- Crossings connected / not connected / unknown: {summary['connected']} / {summary['not_connected']} / {summary['unknown']}
- Boundary endpoints: {summary['boundary_endpoints']}
- Unresolved crossing or dual-carriageway rows: {summary['unresolved']}

No T-ratio, X-ratio, cell ratio, cul-de-sac ratio, or Marshall matrix was calculated.
"""
    NOTE_PATH.write_text(text, encoding="utf-8")


def main() -> None:
    bridge_lookup = load_bridge_lookup(PRIMARY_PATH)
    gns = load_gn_polygons()
    source_lines, changes, length_before = prepare_source_lines(bridge_lookup)
    by_gn, clip_stats = clip_to_gns(source_lines, gns)
    crossings, split_points, overlaps = find_crossings(by_gn)
    noded = apply_splits(by_gn, split_points, changes)
    forbidden = forbidden_index(crossings)

    snap_rows = []
    metrics_by_tol = {}
    for tolerance in TOLERANCES:
        metrics_by_tol[tolerance] = evaluate_tolerance(noded, forbidden, tolerance)
        for gn_name in [*GN_NAMES, "TOTAL"]:
            row = dict(metrics_by_tol[tolerance][gn_name])
            row.pop("node_of_end", None)
            row.pop("name_merge_examples", None)
            row["gn_name"] = gn_name
            row["tolerance_m"] = tolerance
            previous_index = TOLERANCES.index(tolerance) - 1
            if previous_index < 0:
                fall = ""
            else:
                previous = metrics_by_tol[TOLERANCES[previous_index]][gn_name]["components"]
                current = row["components"]
                fall = 0.0 if previous <= 0 else round((previous - current) / previous, 4)
            row["component_fall_fraction"] = fall
            snap_rows.append(row)

    totals = [row for row in snap_rows if row["gn_name"] == "TOTAL"]
    chosen, reason, confidence = choose_tolerance(totals)
    for row in totals:
        if row["tolerance_m"] == chosen:
            row["selected"] = "yes"
        else:
            row["selected"] = "no"

    duals = find_dual_carriageways(noded)
    endpoints = boundary_endpoints(noded, gns, forbidden, chosen)
    streets = snapped_output_segments(noded, forbidden, chosen)

    for segment in source_lines:
        if segment["bridge_join"] == "unmatched":
            changes.append(
                {
                    "original_feature": segment["nf_road_id"],
                    "osm_id": segment["osm_id"],
                    "change": "flagged",
                    "reason": "osm id not found in roads_primary; bridge and layer unknown",
                }
            )
    for part_lists in by_gn.values():
        for segment in part_lists:
            if segment["short_fragment"]:
                changes.append(
                    {
                        "original_feature": segment["nf_road_id"],
                        "osm_id": segment["osm_id"],
                        "change": "kept_short_fragment",
                        "reason": f"length under {SHORT_M} m inside {segment['gn_name']}; not deleted",
                    }
                )
    for overlap in overlaps:
        changes.append(
            {
                "original_feature": overlap["nf_road_id_1"],
                "osm_id": overlap["osm_id_1"],
                "change": "flagged_overlap",
                "reason": (
                    f"overlaps osm {overlap['osm_id_2']} by {overlap['overlap_m']} m "
                    f"in {overlap['gn_name']}; kept"
                ),
            }
        )

    issues = []
    for row in crossings:
        if row["connection_status"] == "unknown":
            issues.append(
                {
                    "issue_id": row["crossing_id"],
                    "kind": "unknown_crossing",
                    "gn_name": row["gn_name"],
                    "detail": row["reason"],
                }
            )
    for row in duals:
        if row["treatment"] == "manual_review":
            issues.append(
                {
                    "issue_id": row["case_id"],
                    "kind": "dual_carriageway",
                    "gn_name": row["gn_name"],
                    "detail": f"{row['road_ids']}: {row['potential_problem']}",
                }
            )
    for overlap in overlaps:
        issues.append(
            {
                "issue_id": f"{overlap['osm_id_1']}-{overlap['osm_id_2']}",
                "kind": "overlap",
                "gn_name": overlap["gn_name"],
                "detail": f"{overlap['overlap_m']} m overlap; both lines kept",
            }
        )
    for gn_name, metrics in metrics_by_tol[chosen].items():
        if gn_name == "TOTAL":
            continue
        seen_snaps = set()
        for example in metrics.get("name_merge_examples") or []:
            pair = tuple(sorted((gn_name, example["osm_id_1"], example["osm_id_2"])))
            if pair in seen_snaps:
                continue
            seen_snaps.add(pair)
            issues.append(
                {
                    "issue_id": f"snap-{example['osm_id_1']}-{example['osm_id_2']}",
                    "kind": "different_name_snap",
                    "gn_name": gn_name,
                    "detail": (
                        f"{chosen} m snap merges {example['names']} "
                        f"(osm {example['osm_id_1']} and {example['osm_id_2']})"
                    ),
                }
            )
    if confidence == "low":
        issues.append(
            {
                "issue_id": "snap",
                "kind": "snap_tolerance",
                "gn_name": "",
                "detail": reason,
            }
        )

    final_length = sum(row["length_m"] for row in streets)
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "features_before": len(load_fc(ROADS_PATH)["features"]),
        "length_before_m": length_before,
        "fringe_parts": clip_stats["fringe_parts"],
        "fringe_length_m": clip_stats["fringe_length_m"],
        "clipped_segments": clip_stats["clipped_segments"],
        "clipped_length_m": clip_stats["clipped_length_m"],
        "final_segments": len(streets),
        "final_length_m": final_length,
        "connected": sum(1 for row in crossings if row["connection_status"] == "connected"),
        "not_connected": sum(1 for row in crossings if row["connection_status"] == "not_connected"),
        "unknown": sum(1 for row in crossings if row["connection_status"] == "unknown"),
        "boundary_endpoints": len(endpoints),
        "unresolved": len(issues),
        "snap_m": chosen,
        "snap_confidence": confidence,
    }

    write_csv(
        TABLE_DIR / "crossings.csv",
        crossings,
        [
            "crossing_id",
            "gn_name",
            "osm_id_1",
            "osm_id_2",
            "bridge_status",
            "layer_status",
            "connection_status",
            "treatment",
            "reason",
            "lon",
            "lat",
        ],
    )
    write_csv(
        TABLE_DIR / "snap_tolerance_test.csv",
        snap_rows,
        [
            "gn_name",
            "tolerance_m",
            "components",
            "endpoint_merges",
            "junctions_degree_ge3",
            "different_name_merges",
            "polygonize_faces",
            "illegal_layer_or_bridge_merges",
            "component_fall_fraction",
            "selected",
        ],
    )
    write_csv(
        TABLE_DIR / "dual_carriageways.csv",
        duals,
        [
            "case_id",
            "gn_name",
            "location",
            "road_ids",
            "names",
            "interpretation",
            "potential_problem",
            "treatment",
            "confidence",
            "separation_m",
            "overlap_m",
        ],
    )
    write_csv(
        TABLE_DIR / "geometry_changes.csv",
        changes,
        ["original_feature", "osm_id", "change", "reason"],
    )
    write_csv(
        TABLE_DIR / "network_validation_issues.csv",
        issues,
        ["issue_id", "kind", "gn_name", "detail"],
    )
    write_csv(
        TABLE_DIR / "network_preparation_summary.csv",
        [{"metric": key, "value": value} for key, value in summary.items()],
        ["metric", "value"],
    )
    write_gpkg(streets, endpoints, crossings, duals, gns)
    write_map(streets, endpoints, crossings, duals, gns)
    write_methodology(summary, snap_rows, chosen, reason, confidence)

    print(json.dumps(summary, indent=2))
    print(f"snap_m={chosen} confidence={confidence}")
    print(reason)
    print(f"gpkg={GPKG_PATH}")


if __name__ == "__main__":
    main()
