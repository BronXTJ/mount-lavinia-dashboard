#!/usr/bin/env python3
"""Fetch OSM walkable roads for the access AOI via Overpass API."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import geopandas as gpd
from shapely.geometry import mapping, shape

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
AOI_PATH = PACKAGE_ROOT / "01_boundary" / "access_aoi_500m.geojson"
OUT_RAW = PACKAGE_ROOT / "03_network" / "raw" / "roads_osm_raw.geojson"
OUT_WALK = PACKAGE_ROOT / "03_network" / "roads_walk_aoi.geojson"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

WALKABLE = {
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
    "footway",
    "path",
    "pedestrian",
    "steps",
}


def aoi_bbox(aoi_path: Path) -> tuple[float, float, float, float]:
    gdf = gpd.read_file(aoi_path)
    if gdf.crs is None:
        gdf = gdf.set_crs(4326)
    else:
        gdf = gdf.to_crs(4326)
    minx, miny, maxx, maxy = gdf.total_bounds
    return float(miny), float(minx), float(maxy), float(maxx)


def build_query(south: float, west: float, north: float, east: float) -> str:
    # Single highway regex keeps query small; filter walkable client-side
    return f"""[out:json][timeout:180];
(
  way["highway"]({south},{west},{north},{east});
);
out body;
>;
out skel qt;
"""


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


def is_walkable(tags: dict) -> bool:
    highway = tags.get("highway")
    if highway not in WALKABLE:
        return False
    if tags.get("access") == "no":
        return False
    if tags.get("foot") == "no":
        return False
    return True


def elements_to_features(payload: dict) -> list[dict]:
    nodes: dict[int, tuple[float, float]] = {}
    for el in payload.get("elements", []):
        if el.get("type") == "node":
            nodes[int(el["id"])] = (float(el["lon"]), float(el["lat"]))

    features: list[dict] = []
    for el in payload.get("elements", []):
        if el.get("type") != "way":
            continue
        tags = el.get("tags") or {}
        if not is_walkable(tags):
            continue
        coords: list[tuple[float, float]] = []
        for nid in el.get("nodes") or []:
            pt = nodes.get(int(nid))
            if pt is None:
                coords = []
                break
            coords.append(pt)
        if len(coords) < 2:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "osm_id": el.get("id"),
                    "highway": tags.get("highway"),
                    "name": tags.get("name") or tags.get("name:en") or "",
                    "access": tags.get("access"),
                    "foot": tags.get("foot"),
                    "oneway": tags.get("oneway"),
                },
                "geometry": {"type": "LineString", "coordinates": coords},
            }
        )
    return features


def write_geojson(path: Path, name: str, features: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "name": name,
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": features,
    }
    with path.open("w", encoding="utf-8") as f:
        json.dump(collection, f)


def clip_to_aoi(features: list[dict], aoi_geom) -> list[dict]:
    clipped: list[dict] = []
    for feat in features:
        geom = shape(feat["geometry"])
        inter = geom.intersection(aoi_geom)
        if inter.is_empty:
            continue
        geoms: list = []
        if inter.geom_type == "LineString":
            geoms = [inter]
        elif inter.geom_type == "MultiLineString":
            geoms = list(inter.geoms)
        elif inter.geom_type == "GeometryCollection":
            for g in inter.geoms:
                if g.geom_type == "LineString":
                    geoms.append(g)
                elif g.geom_type == "MultiLineString":
                    geoms.extend(list(g.geoms))
        for i, g in enumerate(geoms):
            if g.is_empty or g.length == 0:
                continue
            props = dict(feat["properties"])
            if len(geoms) > 1:
                props["part"] = i
            clipped.append(
                {
                    "type": "Feature",
                    "properties": props,
                    "geometry": mapping(g),
                }
            )
    return clipped


def main() -> None:
    if not AOI_PATH.is_file():
        raise SystemExit(f"Missing AOI: {AOI_PATH}")

    south, west, north, east = aoi_bbox(AOI_PATH)
    print(f"Overpass bbox SWN E: {south:.6f},{west:.6f},{north:.6f},{east:.6f}")
    payload = fetch_overpass(build_query(south, west, north, east))
    features = elements_to_features(payload)
    write_geojson(OUT_RAW, "roads_osm_raw", features)
    print(f"Wrote {OUT_RAW} ({len(features)} walkable ways in bbox)")

    aoi = gpd.read_file(AOI_PATH)
    if aoi.crs is None:
        aoi = aoi.set_crs(4326)
    else:
        aoi = aoi.to_crs(4326)
    aoi_geom = aoi.unary_union
    clipped = clip_to_aoi(features, aoi_geom)
    write_geojson(OUT_WALK, "roads_walk_aoi", clipped)
    print(f"Wrote {OUT_WALK} ({len(clipped)} segments clipped to AOI)")


if __name__ == "__main__":
    main()
