#!/usr/bin/env python3
"""Phase 3 gate: walk accessibility hex layer. Exit 0 only on PASS."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "00_manifest/METHODS_PHASE3.md",
    "05_accessibility/access_hex_primary.geojson",
    "05_accessibility/access_primary_summary.json",
]

DEST_GROUPS = ["food", "education", "health", "transit", "finance", "open_space"]


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED_FILES:
        if not (PACKAGE_ROOT / rel).is_file():
            fail(f"Missing file: {rel}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    data = load_json(PACKAGE_ROOT / "05_accessibility/access_hex_primary.geojson")
    feats = data.get("features", [])
    if len(feats) != 447:
        fail(f"Expected 447 hex features, got {len(feats)}", errors)

    for i, feat in enumerate(feats):
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        if geom.get("type") not in ("Polygon", "MultiPolygon"):
            fail(f"Feature {i}: geometry must be Polygon/MultiPolygon", errors)
            break
        for field in (
            "hex_id",
            "is_edge",
            "snap_ok",
            "analysis_ok",
            "area_ratio",
            "completeness_class",
            "access_score",
            "groups_within_10",
        ):
            if field not in props:
                fail(f"Feature {i}: missing {field}", errors)
                break
        for g in DEST_GROUPS:
            for field in (
                f"dist_{g}_m",
                f"time_{g}_min",
                f"reach_{g}_5",
                f"reach_{g}_10",
                f"reach_{g}_15",
                f"count_{g}_10",
            ):
                if field not in props:
                    fail(f"Feature {i}: missing {field}", errors)
                    break
            else:
                continue
            break
        else:
            # access_score rules
            score = props.get("access_score")
            if props.get("snap_ok"):
                if score is None or not isinstance(score, (int, float)) or isinstance(score, bool):
                    fail(f"Feature {i}: snap_ok hex needs numeric access_score", errors)
                    break
                if not (0.0 <= float(score) <= 1.0):
                    fail(f"Feature {i}: access_score out of range {score}", errors)
                    break
            else:
                if score is not None:
                    fail(f"Feature {i}: unsnapped hex must have access_score null", errors)
                    break
            continue
        break

    summary = load_json(PACKAGE_ROOT / "05_accessibility/access_primary_summary.json")
    if summary.get("hex_count") != 447:
        fail(f"summary hex_count {summary.get('hex_count')} != 447", errors)

    if summary.get("analysis_definition") != "area_ratio>=0.90 AND snap_ok=true":
        fail(
            f"unexpected analysis_definition: {summary.get('analysis_definition')!r}",
            errors,
        )

    cov = summary.get("coverage_analysis_ok") or summary.get("coverage_non_edge_snap_ok") or {}
    for g in DEST_GROUPS:
        if g not in cov:
            fail(f"summary missing coverage for {g}", errors)
            continue
        if "within_10_min" not in cov[g]:
            fail(f"summary missing within_10_min for {g}", errors)

    mean_score = summary.get("mean_access_score")
    if mean_score is None or not isinstance(mean_score, (int, float)) or isinstance(mean_score, bool):
        fail("summary mean_access_score missing or non-numeric", errors)
    elif not math.isfinite(float(mean_score)):
        fail("summary mean_access_score is not finite", errors)

    any_cover = False
    for g in DEST_GROUPS:
        share = (cov.get(g) or {}).get("within_10_min")
        if isinstance(share, (int, float)) and float(share) > 0:
            any_cover = True
            break
    if not any_cover:
        fail("no dest_group has within_10_min coverage > 0", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  hex features: {len(feats)}")
    print(f"  analysis hexes: {summary.get('analysis_hex_count')}")
    print(f"  mean access_score: {mean_score}")
    print(f"  desert_count: {summary.get('desert_count')}")
    print("  within_10_min:")
    for g in DEST_GROUPS:
        print(f"    {g}: {cov[g]['within_10_min']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
