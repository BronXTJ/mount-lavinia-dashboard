#!/usr/bin/env python3
"""Phase 1 gate: validate locked primary-study-area inputs. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]

EXPECTED = {
    "01_boundary/primary_study_area_boundary.geojson": {
        "feature_count": 1,
        "required_fields": [],
    },
    "01_boundary/gn5_divisions.geojson": {
        "feature_count": 5,
        "required_fields": ["ADM4_EN", "ADM4_PCODE"],
    },
    "03_buildings/zenodo_buildings_raw.geojson": {
        "feature_count": 5501,
        "required_fields": ["Height", "Area", "FID_1"],
    },
    "06_context/landuse_primary.geojson": {
        "feature_count": 573,
        "required_fields": ["Main_C", "Domain", "Area_m2"],
    },
    "06_context/roads_primary.geojson": {
        "feature_count": 496,
        "required_fields": ["highway", "id"],
    },
    "06_context/pois_primary.geojson": {
        "feature_count": 147,
        "required_fields": ["id"],
    },
    "07_centrality/closeness_5000m.geojson": {
        "feature_count": 2115,
        "required_fields": ["NQPDA5000"],
    },
    "07_centrality/betweenness_5000m.geojson": {
        "feature_count": 2115,
        "required_fields": ["BtA5000"],
    },
}

BOUNDARY_REL = "01_boundary/primary_study_area_boundary.geojson"
ZENODO_REL = "03_buildings/zenodo_buildings_raw.geojson"


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def load_geojson(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def bbox_of(features: list) -> list[float]:
    xs: list[float] = []
    ys: list[float] = []

    def walk(coords) -> None:
        if isinstance(coords, (int, float)):
            return
        if coords and isinstance(coords[0], (int, float)):
            xs.append(float(coords[0]))
            ys.append(float(coords[1]))
            return
        for item in coords:
            walk(item)

    for feat in features:
        walk(feat["geometry"]["coordinates"])
    if not xs:
        raise ValueError("empty geometry bbox")
    return [min(xs), min(ys), max(xs), max(ys)]


def bboxes_intersect(a: list[float], b: list[float]) -> bool:
    # a,b = [minx, miny, maxx, maxy]
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])


def main() -> int:
    errors: list[str] = []
    summary: list[str] = []

    print(f"Package root: {PACKAGE_ROOT}")
    print("--- Phase 1 validation ---")

    for rel, spec in EXPECTED.items():
        path = PACKAGE_ROOT / rel
        if not path.exists():
            fail(f"MISSING file: {rel}", errors)
            continue
        size = path.stat().st_size
        if size <= 0:
            fail(f"EMPTY file: {rel}", errors)
            continue
        try:
            data = load_geojson(path)
        except Exception as exc:  # noqa: BLE001
            fail(f"INVALID JSON/GeoJSON {rel}: {exc}", errors)
            continue

        features = data.get("features") or []
        n = len(features)
        if n != spec["feature_count"]:
            fail(
                f"COUNT mismatch {rel}: expected {spec['feature_count']}, got {n}",
                errors,
            )

        if features:
            keys = set(features[0].get("properties") or {})
            missing = [k for k in spec["required_fields"] if k not in keys]
            if missing:
                fail(f"FIELDS missing {rel}: {missing}", errors)

        summary.append(f"OK {rel}  n={n}  bytes={size}")

    # Zenodo height QC
    zenodo_path = PACKAGE_ROOT / ZENODO_REL
    below3 = None
    hmin = hmax = None
    if zenodo_path.exists():
        zdata = load_geojson(zenodo_path)
        heights = [
            float(f["properties"]["Height"])
            for f in zdata["features"]
            if f.get("properties") and f["properties"].get("Height") is not None
        ]
        if not heights:
            fail("Zenodo: no Height values", errors)
        else:
            hmin, hmax = min(heights), max(heights)
            below3 = sum(1 for h in heights if h < 3)
            if hmin <= 0:
                fail(f"Zenodo: Height min must be > 0, got {hmin}", errors)
            summary.append(
                f"OK zenodo height  min={hmin}  max={hmax}  below_3m={below3}"
            )

    # Bbox intersection vs primary boundary
    boundary_path = PACKAGE_ROOT / BOUNDARY_REL
    if boundary_path.exists():
        try:
            boundary_bbox = bbox_of(load_geojson(boundary_path)["features"])
            summary.append(f"OK boundary bbox {boundary_bbox}")
            for rel in EXPECTED:
                path = PACKAGE_ROOT / rel
                if not path.exists() or rel == BOUNDARY_REL:
                    continue
                layer_bbox = bbox_of(load_geojson(path)["features"])
                if not bboxes_intersect(boundary_bbox, layer_bbox):
                    fail(
                        f"BBOX no intersection with primary boundary: {rel} bbox={layer_bbox}",
                        errors,
                    )
                else:
                    summary.append(f"OK bbox intersects boundary: {rel}")
        except Exception as exc:  # noqa: BLE001
            fail(f"BBOX check failed: {exc}", errors)

    print()
    for line in summary:
        print(line)

    if errors:
        print()
        print("FAIL — Phase 1 validation errors:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print()
    print("PASS — Phase 1 locked inputs are valid.")
    print(f"  layers checked: {len(EXPECTED)}")
    if below3 is not None:
        print(f"  zenodo buildings: 5501; Height min={hmin}, max={hmax}; Height<3m: {below3}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
