#!/usr/bin/env python3
"""Review only the flagged Marshall junctions. Does not rebuild the network or calculate ratios."""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path

import geopandas as gpd
from pyproj import Transformer
from shapely.geometry import LineString, Point, mapping
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = ROOT / "network_form" / "marshall_matrix"
READY = OUT_ROOT / "data" / "processed" / "roads_marshall_ready.gpkg"
JUNCTIONS = OUT_ROOT / "data" / "processed" / "marshall_junctions.gpkg"
REVIEWED = OUT_ROOT / "data" / "processed" / "marshall_junctions_reviewed.gpkg"
TABLE_PATH = OUT_ROOT / "results" / "tables" / "marshall_junction_review_final.csv"
MAP_PATH = OUT_ROOT / "results" / "maps" / "marshall_junctions_reviewed.html"

CELL_M = 0.01
ARM_DEG = 20.0
BOUNDARY_M = 1.0
SHORT_M = 0.5
PARTNERS = {"D001": "1498946138", "D002": "687500136"}
GALLE = "48701240"
DEGREE0_UNKNOWN = {"C0130", "C0135", "C0257"}

TO_M = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)


def to_metric(geom):
    return transform(TO_M.transform, geom)


def cell_of(x: float, y: float) -> tuple[float, float]:
    return (round(x / CELL_M) * CELL_M, round(y / CELL_M) * CELL_M)


def osm_text(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def is_short_value(flag, length_m) -> bool:
    if isinstance(flag, str) and flag.strip().lower() in {"true", "1", "yes"}:
        return True
    if flag is True or flag == 1:
        return True
    try:
        return float(length_m) < SHORT_M
    except (TypeError, ValueError):
        return False


def is_bridge(value) -> bool:
    return str(value).strip().lower() in {"yes", "true", "1"}


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


def cluster_groups(items: list[dict]) -> list[list[dict]]:
    unused = set(range(len(items)))
    groups = []
    while unused:
        start = unused.pop()
        members = [items[start]]
        growing = True
        while growing:
            growing = False
            for index in list(unused):
                if any(ang_diff(items[index]["bearing"], member["bearing"]) <= ARM_DEG for member in members):
                    members.append(items[index])
                    unused.remove(index)
                    growing = True
        groups.append(members)
    return groups


def dual_case(reason: str) -> str | None:
    if "D001" in reason:
        return "D001"
    if "D002" in reason:
        return "D002"
    return None


def unknown_id(reason: str) -> str:
    for crossing_id in ("C0130", "C0135", "C0257", "C0340"):
        if crossing_id in reason:
            return crossing_id
    return ""


def class_from_count(count: int, bridge_present: bool) -> tuple[str, str, str]:
    if count == 3:
        return "CONFIRMED_T", "high", "three distinct approaches remain"
    if count == 4:
        if bridge_present:
            return "UNCERTAIN", "low", "four approaches include a bridge-tagged arm; not treated as an X"
        return "CONFIRMED_X", "high", "four distinct approaches remain"
    if count > 4:
        return "UNCERTAIN", "low", f"{count} approaches remain; not forced into T or X"
    return "ENDPOINT / NOT_JUNCTION", "high", f"only {count} distinct approaches remain after the review exclusion"


def arms_for_node(node_cell, gn_name, street_rows, boundary_pts) -> list[dict]:
    found = []
    for row in street_rows:
        if row["gn"] != gn_name:
            continue
        for at_start, coord in ((True, row["coords"][0]), (False, row["coords"][-1])):
            if cell_of(coord[0], coord[1]) != node_cell:
                continue
            far = row["coords"][-1] if at_start else row["coords"][0]
            far_boundary = any(
                point["gn"] == gn_name and math.hypot(point["x"] - far[0], point["y"] - far[1]) <= BOUNDARY_M
                for point in boundary_pts
            )
            found.append(
                {
                    "osm_id": row["osm_id"],
                    "name": row["name"],
                    "bearing": outgoing_bearing(row["line"], at_start),
                    "length_m": row["length_m"],
                    "short": row["short"],
                    "bridge": row["bridge"],
                    "boundary_stub": far_boundary,
                    "segment_id": row["segment_id"],
                }
            )
    return found


def ids_are_separate_arms(arms: list[dict], left: str, right: str) -> bool:
    left_bearings = [arm["bearing"] for arm in arms if arm["osm_id"] == left]
    right_bearings = [arm["bearing"] for arm in arms if arm["osm_id"] == right]
    if not left_bearings or not right_bearings:
        return False
    return all(ang_diff(a, b) > ARM_DEG for a in left_bearings for b in right_bearings)


def review_node(node, street_rows, boundary_pts) -> dict:
    x_m, y_m = TO_M.transform(float(node["x"]), float(node["y"]))
    node_cell = cell_of(x_m, y_m)
    arms = arms_for_node(node_cell, node["GN"], street_rows, boundary_pts)
    countable = [arm for arm in arms if not arm["short"]]
    reason = str(node["uncertainty_reason"] or "")
    previous = str(node["classification"])
    crossing = unknown_id(reason)
    case = dual_case(reason)

    if crossing in DEGREE0_UNKNOWN or (previous == "UNCERTAIN" and int(node["degree"]) == 0 and crossing):
        final, confidence, detail = (
            "UNCERTAIN",
            "low",
            f"{crossing} is an unconnected geometric crossing with no shared node; not classified as X",
        )
    elif crossing == "C0340" or (previous == "UNCERTAIN" and int(node["degree"]) <= 1 and "C0340" in reason):
        final, confidence, detail = (
            "ENDPOINT / NOT_JUNCTION",
            "medium",
            "C0340 was not connected; the graph node is only an endpoint, not a T or X",
        )
    elif case in PARTNERS:
        partner = PARTNERS[case]
        kept = [arm for arm in countable if arm["osm_id"] != partner]
        groups = cluster_groups(kept)
        if ids_are_separate_arms(kept, GALLE, partner):
            final, confidence, detail = (
                "UNCERTAIN",
                "low",
                f"{case}: Galle Road and {partner} still form separate arms after the partner exclusion",
            )
        else:
            final, confidence, detail = class_from_count(len(groups), any(arm["bridge"] for arm in kept))
            detail = f"{case}: parallel partner {partner} removed from the arm count; {detail}"
            if int(node["degree"]) == 2 and len(groups) < 3:
                final, confidence, detail = (
                    "ENDPOINT / NOT_JUNCTION",
                    "high",
                    f"{case}: degree-2 bend after removing the parallel carriageway; not a junction",
                )
    elif previous == "T" and bool(node["boundary_flag"]) and bool(node["uncertainty_flag"]):
        kept = [arm for arm in countable if not arm["boundary_stub"]]
        groups = cluster_groups(kept)
        separate_dual = ids_are_separate_arms(kept, GALLE, PARTNERS["D001"]) or ids_are_separate_arms(
            kept, GALLE, PARTNERS["D002"]
        )
        if separate_dual:
            final, confidence, detail = (
                "UNCERTAIN",
                "low",
                "boundary node still includes both members of a dual carriageway as separate arms",
            )
        else:
            final, confidence, detail = class_from_count(len(groups), any(arm["bridge"] for arm in kept))
            if final == "CONFIRMED_T":
                detail = "three distinct approaches remain after ignoring segments that only run to a GN-boundary endpoint"
            elif final == "ENDPOINT / NOT_JUNCTION":
                detail = "dropping segments that only run to a GN-boundary endpoint leaves fewer than three approaches; the clip created the extra arm"
            else:
                detail = f"boundary review: {detail}"
    else:
        final, confidence, detail = (
            "UNCERTAIN",
            "low",
            "local arms do not match a boundary T or a named uncertain case",
        )

    names = sorted({arm["name"] or arm["osm_id"] for arm in countable})
    return {
        "node_id": node["junction_id"],
        "GN": node["GN"],
        "previous_class": previous,
        "final_class": final,
        "reason": detail,
        "confidence": confidence,
        "x": float(node["x"]),
        "y": float(node["y"]),
        "arms": ", ".join(names),
    }


def write_csv(rows: list[dict]) -> None:
    TABLE_PATH.parent.mkdir(parents=True, exist_ok=True)
    fields = ["node_id", "GN", "previous_class", "final_class", "reason", "confidence"]
    with TABLE_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_gpkg(rows: list[dict]) -> None:
    REVIEWED.parent.mkdir(parents=True, exist_ok=True)
    if REVIEWED.exists():
        REVIEWED.unlink()
    frame = gpd.GeoDataFrame(
        [{key: row[key] for key in ("node_id", "GN", "previous_class", "final_class", "reason", "confidence")} for row in rows],
        geometry=[Point(row["x"], row["y"]) for row in rows],
        crs="EPSG:4326",
    )
    frame.to_file(REVIEWED, layer="reviewed_junctions", driver="GPKG", engine="pyogrio")


def write_map(rows: list[dict], streets, boundaries) -> None:
    MAP_PATH.parent.mkdir(parents=True, exist_ok=True)
    street_fc = {
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
    }
    gn_fc = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"gn_name": row.gn_name}, "geometry": mapping(row.geometry)}
            for row in boundaries.itertuples(index=False)
        ],
    }

    def points(label: str):
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "node_id": row["node_id"],
                        "GN": row["GN"],
                        "final_class": row["final_class"],
                        "reason": row["reason"],
                    },
                    "geometry": {"type": "Point", "coordinates": [row["x"], row["y"]]},
                }
                for row in rows
                if row["final_class"] == label
            ],
        }

    payload = {
        "streets": street_fc,
        "gns": gn_fc,
        "T": points("CONFIRMED_T"),
        "X": points("CONFIRMED_X"),
        "ENDPOINT": points("ENDPOINT / NOT_JUNCTION"),
        "UNCERTAIN": points("UNCERTAIN"),
    }
    data = json.dumps(payload).replace("<", "\\u003c")
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Marshall junction review</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {{ height: 100%; margin: 0; }}
    .panel {{
      position: absolute; z-index: 500; top: 12px; right: 12px; background: #fff;
      padding: 10px 12px; border-radius: 8px; font: 13px/1.45 sans-serif;
      box-shadow: 0 1px 4px rgba(0,0,0,.2);
    }}
    .panel label {{ display: block; }}
    .swatch {{ display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }}
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="panel">
    <strong>Reviewed junctions</strong>
    <label><input type="checkbox" id="ly-streets" checked /> Streets</label>
    <label><input type="checkbox" id="ly-gn" checked /> GN boundaries</label>
    <label><input type="checkbox" id="ly-T" checked /> <span class="swatch" style="background:#2563eb"></span>Confirmed T</label>
    <label><input type="checkbox" id="ly-X" checked /> <span class="swatch" style="background:#dc2626"></span>Confirmed X</label>
    <label><input type="checkbox" id="ly-ENDPOINT" checked /> <span class="swatch" style="background:#0f766e"></span>Endpoint / not a junction</label>
    <label><input type="checkbox" id="ly-UNCERTAIN" checked /> <span class="swatch" style="background:#7c3aed"></span>Remaining uncertain</label>
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
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {{ radius: 7, color, fillColor: color, fillOpacity: 0.9, weight: 1 }}),
        onEachFeature: (f, layer) => layer.bindPopup(`${{f.properties.node_id}} · ${{f.properties.final_class}}<br>${{f.properties.GN}}<br>${{f.properties.reason}}`)
      }});
    }}
    const groups = {{
      'ly-streets': streets, 'ly-gn': gns,
      'ly-T': points('T', '#2563eb'), 'ly-X': points('X', '#dc2626'),
      'ly-ENDPOINT': points('ENDPOINT', '#0f766e'), 'ly-UNCERTAIN': points('UNCERTAIN', '#7c3aed')
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
    junctions = gpd.read_file(JUNCTIONS, layer="junctions")
    streets = gpd.read_file(READY, layer="streets")
    endpoints = gpd.read_file(READY, layer="boundary_endpoints")
    boundaries = gpd.read_file(READY, layer="gn_boundaries")

    boundary_pts = []
    for row in endpoints.itertuples(index=False):
        x_m, y_m = TO_M.transform(float(row.lon), float(row.lat))
        boundary_pts.append({"gn": row.gn_name, "x": x_m, "y": y_m})

    street_rows = []
    for row in streets.itertuples(index=False):
        if row.geometry is None or row.geometry.geom_type != "LineString":
            continue
        line_m = to_metric(row.geometry)
        street_rows.append(
            {
                "gn": row.gn_name,
                "osm_id": osm_text(row.osm_id),
                "name": row.name or "",
                "segment_id": row.segment_id,
                "length_m": float(row.length_m),
                "short": is_short_value(row.short_fragment, row.length_m),
                "bridge": is_bridge(row.bridge),
                "line": line_m,
                "coords": list(line_m.coords),
            }
        )

    flagged = []
    for row in junctions.itertuples(index=False):
        uncertain = str(row.classification) == "UNCERTAIN"
        boundary_t = (
            str(row.classification) == "T"
            and bool(row.boundary_flag)
            and bool(row.uncertainty_flag)
        )
        if uncertain or boundary_t:
            flagged.append(row._asdict())

    if len(flagged) != 28:
        raise RuntimeError(f"Expected 28 flagged nodes, found {len(flagged)}")

    reviewed = [review_node(node, street_rows, boundary_pts) for node in flagged]
    reviewed.sort(key=lambda item: item["node_id"])
    write_csv(reviewed)
    write_gpkg(reviewed)
    write_map(reviewed, streets, boundaries)

    changed = [
        f"{row['node_id']}: {row['previous_class']} -> {row['final_class']}"
        for row in reviewed
        if row["final_class"] != row["previous_class"]
        and not (row["previous_class"] == "T" and row["final_class"] == "CONFIRMED_T")
        and not (row["previous_class"] == "X" and row["final_class"] == "CONFIRMED_X")
    ]
    summary = {
        "reviewed": len(reviewed),
        "confirmed_T": sum(1 for row in reviewed if row["final_class"] == "CONFIRMED_T"),
        "confirmed_X": sum(1 for row in reviewed if row["final_class"] == "CONFIRMED_X"),
        "removed_false_TX": sum(
            1
            for row in reviewed
            if row["previous_class"] in {"T", "X"} and row["final_class"] == "ENDPOINT / NOT_JUNCTION"
        ),
        "remaining_uncertain": sum(1 for row in reviewed if row["final_class"] == "UNCERTAIN"),
        "changed": changed,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
