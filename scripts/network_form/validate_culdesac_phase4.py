#!/usr/bin/env python3
"""Validate cul-de-sac Phase 4 density/UMI overlay. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "data" / "network-form"
METHODS = ROOT / "scripts" / "network_form" / "METHODS_CULDESAC_PHASE4.md"
EXPECTED_PRIMARY = 259


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def main() -> int:
    errors: list[str] = []
    hex_path = OUT / "culdesac_hex_density_umi.geojson"
    pts_path = OUT / "culdesacs_density_umi.geojson"
    sum_path = OUT / "culdesac_density_umi_summary.json"

    for p in (hex_path, pts_path, sum_path, METHODS):
        if not p.is_file():
            fail(f"Missing {p}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    hex_fc = json.loads(hex_path.read_text(encoding="utf-8"))
    pts_fc = json.loads(pts_path.read_text(encoding="utf-8"))
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
        if p.get("density_join_ok") is not True:
            fail(f"hex {p.get('hex_id')}: density join missing", errors)
        if p.get("maturation_join_ok") is not True:
            fail(f"hex {p.get('hex_id')}: maturation join missing", errors)
        if p.get("FSI") is None:
            fail(f"hex {p.get('hex_id')}: FSI null", errors)
        if p.get("umi") is None:
            fail(f"hex {p.get('hex_id')}: umi null", errors)

    if total_n > EXPECTED_PRIMARY:
        fail(f"sum culdesac_n {total_n} > primary {EXPECTED_PRIMARY}", errors)

    pts = pts_fc.get("features") or []
    if len(pts) != EXPECTED_PRIMARY:
        fail(f"culdesacs_density_umi n {len(pts)} != {EXPECTED_PRIMARY}", errors)

    primary = int(summary.get("primary_culdesac_n") or 0)
    outside = int(summary.get("hex_outside_grid_n") or 0)
    assigned = int(summary.get("hex_assigned_n") or 0)
    if primary != EXPECTED_PRIMARY:
        fail(f"primary_culdesac_n {primary} != {EXPECTED_PRIMARY}", errors)
    if primary != assigned + outside:
        fail(f"primary {primary} != assigned {assigned} + outside {outside}", errors)
    if assigned != total_n:
        fail(f"assigned {assigned} != hex culdesac_n sum {total_n}", errors)

    tier_rows = summary.get("by_maturation_tier") or []
    tier_sum = sum(int(r.get("n") or 0) for r in tier_rows)
    if tier_sum != assigned:
        fail(f"by_maturation_tier n sum {tier_sum} != assigned {assigned}", errors)

    for key in (
        "mean_fsi_among_culdesac_hexes",
        "mean_umi_among_culdesac_hexes",
        "high_umi_share",
        "low_umi_share",
        "hex_coverage_note",
        "depth_x_tier",
    ):
        if key not in summary:
            fail(f"missing {key}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  hexes={len(feats)} assigned={assigned} outside={outside}")
    print(
        f"  mean_umi={summary.get('mean_umi_among_culdesac_hexes')} "
        f"mean_fsi={summary.get('mean_fsi_among_culdesac_hexes')}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
