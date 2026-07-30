#!/usr/bin/env python3
"""Phase 4 gate: classified hexes + map exports. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "00_manifest/METHODS_PHASE4.md",
    "05_accessibility/access_hex_classified.geojson",
    "06_maps/map01_access_score.png",
    "06_maps/map02_access_tiers_deserts.png",
    "06_maps/map03_time_by_group.png",
    "06_maps/map04_coverage_10min.png",
    "06_maps/map05_centrality_mismatch.png",
    "06_maps/maps_summary.json",
]

REQUIRED_FIELDS = [
    "hex_id",
    "access_tier",
    "mean_BtA5000",
    "mismatch_flag",
    "access_score",
    "groups_within_10",
    "analysis_ok",
    "area_ratio",
]
TIERS = {"high", "medium", "low", "excluded"}
MAPS = [
    "map01_access_score.png",
    "map02_access_tiers_deserts.png",
    "map03_time_by_group.png",
    "map04_coverage_10min.png",
    "map05_centrality_mismatch.png",
]


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

    data = load_json(PACKAGE_ROOT / "05_accessibility/access_hex_classified.geojson")
    feats = data.get("features", [])
    if len(feats) != 447:
        fail(f"Expected 447 features, got {len(feats)}", errors)

    tier_counts = {"high": 0, "medium": 0, "low": 0, "excluded": 0}
    for i, feat in enumerate(feats):
        props = feat.get("properties") or {}
        for field in REQUIRED_FIELDS:
            if field not in props:
                fail(f"Feature {i}: missing {field}", errors)
                break
        else:
            tier = props.get("access_tier")
            if tier not in TIERS:
                fail(f"Feature {i}: invalid access_tier {tier!r}", errors)
                break
            tier_counts[tier] += 1
            analysis_ok = bool(props.get("analysis_ok"))
            if analysis_ok and tier == "excluded":
                fail(f"Feature {i}: analysis_ok hex marked excluded", errors)
                break
            if (not analysis_ok) and tier != "excluded":
                fail(f"Feature {i}: non-analysis hex must be excluded", errors)
                break
            if not isinstance(props.get("mismatch_flag"), bool):
                fail(f"Feature {i}: mismatch_flag must be bool", errors)
                break
            continue
        break

    if sum(tier_counts.values()) != 447 and not errors:
        fail(f"Tier do not sum to 447: {tier_counts}", errors)

    for name in MAPS:
        path = PACKAGE_ROOT / "06_maps" / name
        size = path.stat().st_size
        if size < 10_000:
            fail(f"{name} too small ({size} bytes)", errors)

    summary = load_json(PACKAGE_ROOT / "06_maps/maps_summary.json")
    for key in ("tier_counts", "mismatch_count", "maps", "map_bytes"):
        if key not in summary:
            fail(f"maps_summary missing {key}", errors)

    if "tier_counts" in summary:
        for t in TIERS:
            if t not in summary["tier_counts"]:
                fail(f"maps_summary.tier_counts missing {t}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  tier_counts: {tier_counts}")
    print(f"  mismatch_count: {summary.get('mismatch_count')}")
    print(f"  maps: {list(summary.get('maps', {}).values())}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
