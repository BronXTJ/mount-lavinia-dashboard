#!/usr/bin/env python3
"""Validate snap 50/100 sensitivity package. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent
SCENARIOS = PACKAGE_ROOT / "scenarios"

REQUIRED = [
    "scenarios/snap_50m/scenario_meta.json",
    "scenarios/snap_50m/04_origins/origins_snap_summary.json",
    "scenarios/snap_50m/05_accessibility/access_hex_classified.geojson",
    "scenarios/snap_50m/06_maps/map01_access_score.png",
    "scenarios/snap_100m/scenario_meta.json",
    "scenarios/snap_100m/04_origins/origins_snap_summary.json",
    "scenarios/snap_100m/05_accessibility/access_hex_classified.geojson",
    "scenarios/snap_100m/06_maps/map01_access_score.png",
    "scenarios/snap_100m/06_maps/map03_time_by_group.png",
    "scenarios/snap_100m/07_findings/findings_summary.json",
    "scenarios/compare/compare_summary.json",
    "scenarios/compare/compare_table.csv",
    "scenarios/compare/COMPARE.md",
    "scenarios/compare/map_snap_difference.png",
    "00_manifest/METHODS_SNAP_SENSITIVITY.md",
    "scripts/10_run_snap_scenario.py",
    "scripts/11_compare_snap_scenarios.py",
    "scripts/08_classify_and_maps.py",
]


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED:
        if not (PACKAGE_ROOT / rel).is_file():
            fail(f"Missing: {rel}", errors)

    # North arrow top-right placement in classify maps
    src08 = (PACKAGE_ROOT / "scripts/08_classify_and_maps.py").read_text(encoding="utf-8")
    if "ymax - 0.08" not in src08 and "ymax - 0.10" not in src08 and "ymax - 0.12" not in src08:
        fail("08_classify_and_maps.py missing top-right north arrow (ymax - 0.0x)", errors)
    if "ymin + 0.18" in src08:
        fail("08_classify_and_maps.py still has bottom-right north arrow (ymin + 0.18)", errors)
    if "add_north_arrow" not in src08:
        fail("08_classify_and_maps.py missing add_north_arrow", errors)
    if "axes[0, 2]" not in src08 and "axes[2]" not in src08:
        fail("08_classify_and_maps.py missing shared map03 north arrow on top-right panel", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    meta50 = load_json(SCENARIOS / "snap_50m/scenario_meta.json")
    meta100 = load_json(SCENARIOS / "snap_100m/scenario_meta.json")
    if float(meta50.get("snap_tolerance_m") or 0) != 50:
        fail(f"snap_50m meta snap_tolerance_m={meta50.get('snap_tolerance_m')}", errors)
    if float(meta100.get("snap_tolerance_m") or 0) != 100:
        fail(f"snap_100m meta snap_tolerance_m={meta100.get('snap_tolerance_m')}", errors)

    s50 = load_json(SCENARIOS / "snap_50m/04_origins/origins_snap_summary.json")
    s100 = load_json(SCENARIOS / "snap_100m/04_origins/origins_snap_summary.json")
    if float(s50.get("snap_tolerance_m") or 0) != 50:
        fail("snap_50m origins summary not 50 m", errors)
    if float(s100.get("snap_tolerance_m") or 0) != 100:
        fail("snap_100m origins summary not 100 m", errors)
    if int(s100.get("hex_snap_ok") or 0) < int(s50.get("hex_snap_ok") or 0):
        fail(
            f"expected 100m hex_snap_ok >= 50m ({s100.get('hex_snap_ok')} < {s50.get('hex_snap_ok')})",
            errors,
        )

    compare = load_json(SCENARIOS / "compare/compare_summary.json")
    if "newly_snapped_hex_ids" not in compare or "table" not in compare:
        fail("compare_summary missing keys", errors)

    # Dashboard publish unchanged (still present; not required equal to 100m)
    pub = REPO_ROOT / "public/data/walk-accessibility/access_hex_classified.geojson"
    if not pub.is_file():
        fail("dashboard publish missing access_hex_classified.geojson", errors)

    # Manifest note
    manifest = load_json(PACKAGE_ROOT / "00_manifest/SOURCE_MANIFEST.json")
    if "snap_sensitivity" not in manifest:
        fail("SOURCE_MANIFEST missing snap_sensitivity block", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  50m hex_snap_ok={s50.get('hex_snap_ok')} fail={s50.get('hex_snap_fail')}")
    print(f"  100m hex_snap_ok={s100.get('hex_snap_ok')} fail={s100.get('hex_snap_fail')}")
    print(f"  newly_snapped={len(compare.get('newly_snapped_hex_ids') or [])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
