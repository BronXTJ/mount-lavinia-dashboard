#!/usr/bin/env python3
"""Fetch OSM POIs for destination groups via Overpass API."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import geopandas as gpd
from shapely.geometry import Point

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
AOI_PATH = PACKAGE_ROOT / "01_boundary" / "access_aoi_500m.geojson"
OUT_RAW = PACKAGE_ROOT / "02_pois" / "raw" / "osm_pois_raw.geojson"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# (osm_key, osm_value, dest_group)
OSM_TARGETS = [
    ("shop", "supermarket", "food"),
    ("shop", "convenience", "food"),
    ("shop", "bakery", "food"),
    ("shop", "grocery", "food"),
    ("amenity", "restaurant", "food"),
    ("amenity", "cafe", "food"),
    ("amenity", "fast_food", "food"),
    ("amenity", "school", "education"),
    ("amenity", "kindergarten", "education"),
    ("amenity", "college", "education"),
    ("amenity", "university", "education"),
    ("amenity", "pharmacy", "health"),
    ("amenity", "hospital", "health"),
    ("amenity", "clinic", "health"),
    ("amenity", "doctors", "health"),
    ("amenity", "dentist", "health"),
    ("highway", "bus_stop", "transit"),
    ("amenity", "bus_station", "transit"),
    ("amenity", "bank", "finance"),
    ("amenity", "atm", "finance"),
    ("leisure", "park", "open_space"),
    ("leisure", "playground", "open_space"),
]


def aoi_bbox(aoi_path: Path) -> tuple[float, float, float, float]:
    gdf = gpd.read_file(aoi_path)
    if gdf.crs is None:
        gdf = gdf.set_crs(4326)
    else:
        gdf = gdf.to_crs(4326)
    minx, miny, maxx, maxy = gdf.total_bounds
    # south, west, north, east for Overpass
    return float(miny), float(minx), float(maxy), float(maxx)


def build_query(south: float, west: float, north: float, east: float) -> str:
    lines = ["[out:json][timeout:180];", "("]
    for key, value, _group in OSM_TARGETS:
        tag = f'["{key}"="{value}"]'
        bbox = f"({south},{west},{north},{east})"
        lines.append(f"  node{tag}{bbox};")
        lines.append(f"  way{tag}{bbox};")
    lines.append(");")
    lines.append("out center tags;")
    return "\n".join(lines)


def fetch_overpass(query: str, retries: int = 4) -> dict:
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                OVERPASS_URL,
                data=data,
                headers={"User-Agent": "mount-lavinia-dashboard-walk-access/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            last_err = exc
            wait = 8 * (attempt + 1)
            print(f"Overpass attempt {attempt + 1} failed: {exc}; retry in {wait}s")
            time.sleep(wait)
    raise SystemExit(f"Overpass failed after {retries} attempts: {last_err}")


def tag_lookup() -> dict[tuple[str, str], str]:
    return {(k, v): g for k, v, g in OSM_TARGETS}


def element_point(el: dict) -> Point | None:
    if el.get("type") == "node":
        return Point(float(el["lon"]), float(el["lat"]))
    center = el.get("center")
    if center and "lon" in center and "lat" in center:
        return Point(float(center["lon"]), float(center["lat"]))
    return None


def classify(tags: dict, lookup: dict[tuple[str, str], str]) -> tuple[str, str, str] | None:
    for (key, value), group in lookup.items():
        if tags.get(key) == value:
            return key, value, group
    return None


def main() -> None:
    if not AOI_PATH.is_file():
        raise SystemExit(f"Missing AOI. Run 01_prepare_boundary.py first: {AOI_PATH}")

    south, west, north, east = aoi_bbox(AOI_PATH)
    query = build_query(south, west, north, east)
    print(f"Overpass bbox SWN E: {south:.6f},{west:.6f},{north:.6f},{east:.6f}")
    payload = fetch_overpass(query)
    elements = payload.get("elements", [])
    print(f"Overpass returned {len(elements)} elements")

    aoi = gpd.read_file(AOI_PATH)
    if aoi.crs is None:
        aoi = aoi.set_crs(4326)
    else:
        aoi = aoi.to_crs(4326)
    aoi_geom = aoi.unary_union

    lookup = tag_lookup()
    features: list[dict] = []
    for el in elements:
        tags = el.get("tags") or {}
        classified = classify(tags, lookup)
        if not classified:
            continue
        osm_key, osm_value, dest_group = classified
        pt = element_point(el)
        if pt is None or not aoi_geom.intersects(pt):
            continue
        osm_type = el.get("type")
        osm_id = el.get("id")
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "osm_type": osm_type,
                    "osm_id": osm_id,
                    "name": tags.get("name") or tags.get("name:en") or "",
                    "osm_key": osm_key,
                    "osm_value": osm_value,
                    "dest_group": dest_group,
                    "source": "osm",
                },
                "geometry": {"type": "Point", "coordinates": [pt.x, pt.y]},
            }
        )

    # Deduplicate identical osm ids if both node/way somehow collide (keep first)
    seen: set[tuple[str, int]] = set()
    unique: list[dict] = []
    for feat in features:
        key = (feat["properties"]["osm_type"], int(feat["properties"]["osm_id"]))
        if key in seen:
            continue
        seen.add(key)
        unique.append(feat)

    OUT_RAW.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "name": "osm_pois_raw",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": unique,
    }
    with OUT_RAW.open("w", encoding="utf-8") as f:
        json.dump(collection, f)

    print(f"Wrote {OUT_RAW} ({len(unique)} POIs inside AOI)")


if __name__ == "__main__":
    main()
