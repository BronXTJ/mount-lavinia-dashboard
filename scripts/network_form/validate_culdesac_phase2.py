#!/usr/bin/env python3
"""Validate cul-de-sac Phase 2 spatial outputs. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "data" / "network-form"
METHODS = ROOT / "scripts" / "network_form" / "METHODS_CULDESAC_PHASE2.md"
EXPECTED_PRIMARY = 259


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def main() -> int:
    errors: list[str] = []
    hex_path = OUT / "culdesac_hex_counts.geojson"
    sum_path = OUT / "culdesac_spatial_summary.json"

    for p in (hex_path, sum_path, METHODS):
        if not p.is_file():
            fail(f"Missing {p}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    hex_fc = json.loads(hex_path.read_text(encoding="utf-8"))
    summary = json.loads(sum_path.read_text(encoding="utf-8"))

    feats = hex_fc.get("features") or []
    total_n = 0
    for f in feats:
        p = f.get("properties") or {}
        n = p.get("culdesac_n")
        if not isinstance(n, int) or n < 1:
            fail(f"hex {p.get('hex_id')}: culdesac_n must be int >= 1", errors)
            continue
        total_n += n

    if total_n > EXPECTED_PRIMARY:
        fail(f"sum culdesac_n {total_n} > primary {EXPECTED_PRIMARY}", errors)

    if int(summary.get("hex_assigned_n") or 0) != total_n:
        fail("summary hex_assigned_n != sum of hex counts", errors)

    primary = int(summary.get("primary_culdesac_n") or 0)
    outside = int(summary.get("hex_outside_grid_n") or 0)
    if primary != EXPECTED_PRIMARY:
        fail(f"primary_culdesac_n {primary} != {EXPECTED_PRIMARY}", errors)
    if primary != total_n + outside:
        fail(f"primary {primary} != assigned {total_n} + outside {outside}", errors)

    rank = summary.get("by_gn_rank") or []
    if len(rank) != 5:
        fail(f"by_gn_rank length {len(rank)} != 5", errors)

    if "hex_coverage_note" not in summary:
        fail("missing hex_coverage_note", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  hexes={len(feats)} assigned={total_n} outside={outside}")
    print(f"  top_gn={rank[0].get('gn_name')} density={rank[0].get('culdesac_per_km2')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
