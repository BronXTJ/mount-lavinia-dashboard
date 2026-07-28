#!/usr/bin/env python3
"""Import Google Maps places, merge with OSM, dedupe, write accessibility POI layer."""

from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent

AOI_PATH = PACKAGE_ROOT / "01_boundary" / "access_aoi_500m.geojson"
PRIMARY_PATH = PACKAGE_ROOT / "01_boundary" / "primary_study_area_boundary.geojson"
OSM_RAW = PACKAGE_ROOT / "02_pois" / "raw" / "osm_pois_raw.geojson"
GMAPS_CSV = (
    REPO_ROOT / "Social_media_analysis" / "cleaned" / "google_maps" / "places_gn5.csv"
)
GMAPS_RAW_OUT = PACKAGE_ROOT / "02_pois" / "raw" / "gmaps_places_raw.geojson"
POIS_OUT = PACKAGE_ROOT / "02_pois" / "pois_access_primary.geojson"
SUMMARY_OUT = PACKAGE_ROOT / "02_pois" / "pois_access_summary.json"
OLD_POIS = (
    REPO_ROOT
    / "json_files"
    / "Primary study area final analysis 01"
    / "06_context"
    / "pois_primary.geojson"
)

DEDUPE_M = 30

# Lowercase substring / exact category → dest_group
# NOTE: open_space is handled separately in map_gmaps_category (word-safe "park").
GMAPS_CATEGORY_MAP: list[tuple[str, str]] = [
    # food
    ("supermarket", "food"),
    ("grocery", "food"),
    ("convenience store", "food"),
    ("bakery", "food"),
    ("restaurant", "food"),
    ("cafe", "food"),
    ("coffee shop", "food"),
    ("fast food", "food"),
    ("hamburger", "food"),
    ("pizza", "food"),
    ("seafood", "food"),
    ("chinese restaurant", "food"),
    ("asian restaurant", "food"),
    ("italian restaurant", "food"),
    ("meal takeaway", "food"),
    ("food court", "food"),
    # education
    ("school", "education"),
    ("kindergarten", "education"),
    ("preschool", "education"),
    ("college", "education"),
    ("university", "education"),
    # health
    ("pharmacy", "health"),
    ("drugstore", "health"),
    ("hospital", "health"),
    ("clinic", "health"),
    ("doctor", "health"),
    ("dentist", "health"),
    ("medical", "health"),
    # transit
    ("bus stop", "transit"),
    ("bus station", "transit"),
    ("transit station", "transit"),
    # finance
    ("bank", "finance"),
    ("atm", "finance"),
]

# Lodging / amenity / parking excludes that always return None when present
GMAPS_HARD_EXCLUDE = {
    "hotel",
    "guest house",
    "guesthouse",
    "hostel",
    "resort",
    "lodging",
    "apartment",
    "beauty salon",
    "hair salon",
    "spa",
    "real estate",
    "parking lot",
    "parking garage",
    "parking grounds",
    "parking ground",
    "car park",
    "carpark",
    "parking",
}


def _tokens(text: str) -> set[str]:
    """Split on non-letters so 'park' != substring of 'parking'."""
    import re

    return {t for t in re.split(r"[^a-z0-9]+", text.lower()) if t}


def load_polygon(path: Path):
    gdf = gpd.read_file(path)
    if gdf.crs is None:
        gdf = gdf.set_crs(4326)
    else:
        gdf = gdf.to_crs(4326)
    return gdf.unary_union


def is_gmaps_open_space(category: str, categories: str) -> bool:
    """True parks/playgrounds only — never parking* categories."""
    primary = (category or "").strip().lower()
    blob = f"{category or ''} | {categories or ''}".lower()
    if any(bad in blob for bad in ("parking", "car park", "carpark")):
        return False
    # Prefer primary category
    primary_tokens = _tokens(primary)
    if "playground" in primary_tokens or primary in {"park", "indoor playground"}:
        return True
    if "park" in primary_tokens and "parking" not in primary:
        return True
    # Fall back to categories text with token check
    all_tokens = _tokens(blob)
    if "playground" in all_tokens:
        return True
    if "park" in all_tokens and "parking" not in all_tokens:
        return True
    return False


def map_gmaps_category(category: str, categories: str) -> str | None:
    text = f"{category or ''} | {categories or ''}".lower()
    for bad in GMAPS_HARD_EXCLUDE:
        if bad in text:
            return None
    # Open space first with word-safe park matching
    if is_gmaps_open_space(category, categories):
        return "open_space"
    for needle, group in GMAPS_CATEGORY_MAP:
        if needle in text:
            return group
    return None


def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def import_gmaps(aoi_geom) -> list[dict]:
    df = pd.read_csv(GMAPS_CSV)
    # handle BOM on place_id
    cols = {c: c.lstrip("\ufeff") for c in df.columns}
    df = df.rename(columns=cols)

    features: list[dict] = []
    for _, row in df.iterrows():
        try:
            lon = float(row["longitude"])
            lat = float(row["latitude"])
        except (TypeError, ValueError, KeyError):
            continue
        if math.isnan(lon) or math.isnan(lat):
            continue
        pt = Point(lon, lat)
        if not aoi_geom.intersects(pt):
            continue
        cat = str(row.get("category") or "")
        cats = str(row.get("categories") or "")
        group = map_gmaps_category(cat, cats)
        if not group:
            continue
        name = str(row.get("place_name") or "").strip()
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "place_id": str(row.get("place_id") or ""),
                    "name": name,
                    "gmaps_category": cat,
                    "dest_group": group,
                    "source": "gmaps",
                },
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
            }
        )
    return features


def load_osm_features() -> list[dict]:
    with OSM_RAW.open(encoding="utf-8") as f:
        data = json.load(f)
    return data.get("features", [])


def dedupe(features: list[dict]) -> list[dict]:
    """Within each dest_group, drop points within DEDUPE_M; prefer OSM."""
    by_group: dict[str, list[dict]] = defaultdict(list)
    for feat in features:
        by_group[feat["properties"]["dest_group"]].append(feat)

    kept: list[dict] = []
    for group, items in by_group.items():
        # Prefer OSM first so they win ties
        items_sorted = sorted(
            items,
            key=lambda f: (0 if f["properties"]["source"] == "osm" else 1, f["properties"].get("name") or ""),
        )
        accepted: list[dict] = []
        for feat in items_sorted:
            lon, lat = feat["geometry"]["coordinates"][:2]
            duplicate = False
            for other in accepted:
                olon, olat = other["geometry"]["coordinates"][:2]
                if haversine_m(lon, lat, olon, olat) <= DEDUPE_M:
                    duplicate = True
                    break
            if not duplicate:
                accepted.append(feat)
        kept.extend(accepted)
    return kept


def normalize_feature(feat: dict, idx: int, primary_geom) -> dict:
    props = feat["properties"]
    lon, lat = feat["geometry"]["coordinates"][:2]
    pt = Point(lon, lat)
    source = props["source"]
    out_props = {
        "poi_id": f"poi_{idx:04d}",
        "name": props.get("name") or "",
        "dest_group": props["dest_group"],
        "source": source,
        "in_primary": bool(primary_geom.intersects(pt)),
        "osm_key": props.get("osm_key") if source == "osm" else None,
        "osm_value": props.get("osm_value") if source == "osm" else None,
        "gmaps_category": props.get("gmaps_category") if source == "gmaps" else None,
    }
    if source == "osm":
        out_props["osm_type"] = props.get("osm_type")
        out_props["osm_id"] = props.get("osm_id")
    if source == "gmaps":
        out_props["place_id"] = props.get("place_id")
    return {
        "type": "Feature",
        "properties": out_props,
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
    }


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


def bbox_of(features: list[dict]) -> list[float] | None:
    if not features:
        return None
    xs = [f["geometry"]["coordinates"][0] for f in features]
    ys = [f["geometry"]["coordinates"][1] for f in features]
    return [min(xs), min(ys), max(xs), max(ys)]


def main() -> None:
    for path in (AOI_PATH, PRIMARY_PATH, OSM_RAW, GMAPS_CSV):
        if not path.is_file():
            raise SystemExit(f"Missing required input: {path}")

    aoi_geom = load_polygon(AOI_PATH)
    primary_geom = load_polygon(PRIMARY_PATH)

    osm_feats = load_osm_features()
    gmaps_feats = import_gmaps(aoi_geom)
    write_geojson(GMAPS_RAW_OUT, "gmaps_places_raw", gmaps_feats)
    print(f"OSM features: {len(osm_feats)}")
    print(f"GMaps features (mapped+clipped): {len(gmaps_feats)}")
    print(f"Wrote {GMAPS_RAW_OUT}")

    merged = osm_feats + gmaps_feats
    deduped = dedupe(merged)
    print(f"After {DEDUPE_M} m within-group dedupe: {len(deduped)}")

    final = [normalize_feature(f, i + 1, primary_geom) for i, f in enumerate(deduped)]
    write_geojson(POIS_OUT, "pois_access_primary", final)

    by_group = Counter(f["properties"]["dest_group"] for f in final)
    by_source = Counter(f["properties"]["source"] for f in final)
    in_primary = sum(1 for f in final if f["properties"]["in_primary"])
    empty_groups = [g for g in ("food", "education", "health", "transit", "finance", "open_space") if by_group.get(g, 0) == 0]

    old_count = None
    if OLD_POIS.is_file():
        with OLD_POIS.open(encoding="utf-8") as f:
            old_count = len(json.load(f).get("features", []))

    summary = {
        "feature_count": len(final),
        "by_dest_group": dict(sorted(by_group.items())),
        "by_source": dict(sorted(by_source.items())),
        "in_primary_count": in_primary,
        "in_buffer_only_count": len(final) - in_primary,
        "empty_groups": empty_groups,
        "dedupe_m": DEDUPE_M,
        "buffer_m": 500,
        "bbox_crs84": bbox_of(final),
        "old_pois_primary_count": old_count,
        "osm_raw_count": len(osm_feats),
        "gmaps_raw_mapped_count": len(gmaps_feats),
        "merged_before_dedupe": len(merged),
    }
    with SUMMARY_OUT.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        f.write("\n")

    print(f"Wrote {POIS_OUT}")
    print(f"Wrote {SUMMARY_OUT}")
    print(json.dumps(summary, indent=2))
    if empty_groups:
        print(f"WARNING: empty dest groups: {empty_groups}")


if __name__ == "__main__":
    main()
