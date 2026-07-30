#!/usr/bin/env python3
"""Phase 8 gate: refreshed 100 m sensitivity after open_space cleanup. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent
SCENARIOS = PACKAGE_ROOT / "scenarios"
PUBLIC = REPO_ROOT / "public" / "data" / "walk-accessibility"

REQUIRED = [
    "00_manifest/METHODS_PHASE8.md",
    "00_manifest/METHODS_SNAP_SENSITIVITY.md",
    "scenarios/snap_50m/scenario_meta.json",
    "scenarios/snap_50m/04_origins/origins_snap_summary.json",
    "scenarios/snap_50m/05_accessibility/access_primary_summary.json",
    "scenarios/snap_100m/scenario_meta.json",
    "scenarios/snap_100m/04_origins/origins_snap_summary.json",
    "scenarios/snap_100m/05_accessibility/access_hex_classified.geojson",
    "scenarios/snap_100m/05_accessibility/access_primary_summary.json",
    "scenarios/snap_100m/06_maps/map01_access_score.png",
    "scenarios/snap_100m/07_findings/findings_summary.json",
    "scenarios/compare/compare_summary.json",
    "scenarios/compare/compare_table.csv",
    "scenarios/compare/COMPARE.md",
    "scenarios/compare/map_snap_difference.png",
    "04_origins/origins_snap_summary.json",
    "05_accessibility/access_primary_summary.json",
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

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    # Package root still 50 m primary
    root_snap = load_json(PACKAGE_ROOT / "04_origins/origins_snap_summary.json")
    if float(root_snap.get("snap_tolerance_m") or 0) != 50.0:
        fail(f"package-root snap_tolerance_m={root_snap.get('snap_tolerance_m')}, expected 50", errors)

    s50 = load_json(SCENARIOS / "snap_50m/04_origins/origins_snap_summary.json")
    s100 = load_json(SCENARIOS / "snap_100m/04_origins/origins_snap_summary.json")
    if float(s50.get("snap_tolerance_m") or 0) != 50.0:
        fail("snap_50m origins not 50 m", errors)
    if float(s100.get("snap_tolerance_m") or 0) != 100.0:
        fail("snap_100m origins not 100 m", errors)
    if int(s100.get("hex_snap_ok") or 0) < int(s50.get("hex_snap_ok") or 0):
        fail(
            f"expected 100m hex_snap_ok >= 50m ({s100.get('hex_snap_ok')} < {s50.get('hex_snap_ok')})",
            errors,
        )

    # Compare 50 m mean matches package / archive Phase 7 baseline
    pkg_acc = load_json(PACKAGE_ROOT / "05_accessibility/access_primary_summary.json")
    arch_acc = load_json(SCENARIOS / "snap_50m/05_accessibility/access_primary_summary.json")
    cmp = load_json(SCENARIOS / "compare/compare_summary.json")

    pkg_mean = float(pkg_acc.get("mean_access_score") or 0)
    arch_mean = float(arch_acc.get("mean_access_score") or 0)
    if abs(pkg_mean - arch_mean) > 1e-6:
        fail(f"package mean {pkg_mean} != snap_50m archive mean {arch_mean}", errors)

    table = cmp.get("table") or {}
    cmp_mean = None
    if isinstance(table, dict) and "metric" in table and "snap_50m" in table:
        try:
            metrics = table["metric"]
            idx = metrics.index("mean_access_score")
            cmp_mean = float(table["snap_50m"][idx])
        except (ValueError, IndexError, TypeError, KeyError):
            cmp_mean = None
    elif isinstance(table, list):
        for r in table:
            if float(r.get("snap_tolerance_m") or r.get("snap_m") or 0) == 50:
                cmp_mean = float(r.get("mean_access_score") or 0)
                break

    if cmp_mean is None:
        fail("compare_summary missing 50 m mean_access_score", errors)
    elif abs(float(cmp_mean) - pkg_mean) > 0.001:
        fail(f"compare 50 m mean {cmp_mean} != package mean {pkg_mean}", errors)

    # Clean open_space (Phase 7 QC)
    pois = load_json(PACKAGE_ROOT / "02_pois/pois_access_primary.geojson")["features"]
    leaks = []
    for f in pois:
        p = f.get("properties") or {}
        if p.get("dest_group") != "open_space":
            continue
        blob = " ".join(
            str(p.get(k) or "") for k in ("gmaps_category", "gmaps_categories", "name", "osm_value")
        ).lower()
        if "parking" in blob or "car park" in blob or "carpark" in blob:
            leaks.append(p)
        if "parking" in str(p.get("gmaps_category") or "").lower():
            leaks.append(p)
    if leaks:
        fail(f"{len(leaks)} open_space features still look like parking", errors)

    # Dashboard still present (50 m publish; not overwritten by 100 m)
    for name in (
        "access_hex_classified.geojson",
        "access_primary_summary.json",
        "pois_snapped.geojson",
        "findings_summary.json",
    ):
        if not (PUBLIC / name).is_file():
            fail(f"missing dashboard publish: {name}", errors)

    pub_acc = load_json(PUBLIC / "access_primary_summary.json")
    pub_mean = float(pub_acc.get("mean_access_score") or 0)
    if abs(pub_mean - pkg_mean) > 1e-6:
        fail(f"dashboard mean {pub_mean} != package mean {pkg_mean} (dashboard should stay on 50 m)", errors)

    manifest = load_json(PACKAGE_ROOT / "00_manifest/SOURCE_MANIFEST.json")
    if int(manifest.get("phase") or 0) != 8:
        fail(f"SOURCE_MANIFEST phase is {manifest.get('phase')}, expected 8", errors)
    if "phase8_snap_sensitivity_refresh" not in manifest:
        fail("SOURCE_MANIFEST missing phase8_snap_sensitivity_refresh", errors)

    methods8 = (PACKAGE_ROOT / "00_manifest/METHODS_PHASE8.md").read_text(encoding="utf-8")
    if "100 m" not in methods8 and "100m" not in methods8:
        fail("METHODS_PHASE8.md missing 100 m note", errors)

    snap_methods = (PACKAGE_ROOT / "00_manifest/METHODS_SNAP_SENSITIVITY.md").read_text(encoding="utf-8")
    if "Phase 8" not in snap_methods:
        fail("METHODS_SNAP_SENSITIVITY.md missing Phase 8 note", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  package/dashboard mean_access_score={pkg_mean}")
    print(f"  50m hex_snap_ok={s50.get('hex_snap_ok')}  100m hex_snap_ok={s100.get('hex_snap_ok')}")
    print(f"  newly_snapped={len(cmp.get('newly_snapped_hex_ids') or [])}")
    print(f"  still_unsnapped={len(cmp.get('still_unsnapped_hex_ids') or [])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
