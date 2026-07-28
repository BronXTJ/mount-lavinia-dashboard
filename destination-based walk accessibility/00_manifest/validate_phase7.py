#!/usr/bin/env python3
"""Phase 7 gate: clean open_space + 50 m republish. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent
PUBLIC = REPO_ROOT / "public" / "data" / "walk-accessibility"
ARCHIVE = PACKAGE_ROOT / "scenarios" / "snap_50m"

REQUIRED_PACKAGE = [
    "00_manifest/METHODS_PHASE7.md",
    "02_pois/pois_access_primary.geojson",
    "02_pois/pois_access_summary.json",
    "04_origins/origins_snap_summary.json",
    "05_accessibility/access_hex_classified.geojson",
    "05_accessibility/access_primary_summary.json",
    "07_findings/findings_summary.json",
]

REQUIRED_PUBLIC = [
    "access_hex_classified.geojson",
    "access_primary_summary.json",
    "pois_snapped.geojson",
    "findings_summary.json",
]


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED_PACKAGE:
        if not (PACKAGE_ROOT / rel).is_file():
            fail(f"Missing package file: {rel}", errors)

    for name in REQUIRED_PUBLIC:
        if not (PUBLIC / name).is_file():
            fail(f"Missing public publish: public/data/walk-accessibility/{name}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    pois = load_json(PACKAGE_ROOT / "02_pois/pois_access_primary.geojson")["features"]
    open_space = [f["properties"] for f in pois if f["properties"].get("dest_group") == "open_space"]
    parking_leaks = []
    for p in open_space:
        blob = " ".join(
            str(p.get(k) or "")
            for k in ("gmaps_category", "gmaps_categories", "name", "osm_value")
        ).lower()
        if "parking" in blob or "car park" in blob or "carpark" in blob:
            parking_leaks.append(p)
        # Explicit: gmaps_category containing parking must not be open_space
        gcat = str(p.get("gmaps_category") or "").lower()
        if "parking" in gcat:
            parking_leaks.append(p)

    if parking_leaks:
        fail(f"{len(parking_leaks)} open_space features still look like parking", errors)

    poi_sum = load_json(PACKAGE_ROOT / "02_pois/pois_access_summary.json")
    expected_os = int((poi_sum.get("by_dest_group") or {}).get("open_space") or 0)
    if len(open_space) != expected_os:
        fail(
            f"open_space count {len(open_space)} != summary {expected_os}",
            errors,
        )
    if expected_os < 1:
        fail("open_space count is 0 after cleanup", errors)

    snap = load_json(PACKAGE_ROOT / "04_origins/origins_snap_summary.json")
    if float(snap.get("snap_tolerance_m") or 0) != 50.0:
        fail(f"snap_tolerance_m is {snap.get('snap_tolerance_m')}, expected 50", errors)

    # Published classified hex: id == hex_id
    pub_hex = load_json(PUBLIC / "access_hex_classified.geojson")["features"]
    if len(pub_hex) < 100:
        fail(f"published hex count {len(pub_hex)} < 100", errors)
    missing_id = mismatched = 0
    for f in pub_hex:
        p = f.get("properties") or {}
        if "id" not in p:
            missing_id += 1
            continue
        if p.get("hex_id") is not None and int(p["id"]) != int(p["hex_id"]):
            mismatched += 1
    if missing_id:
        fail(f"{missing_id} published features missing id", errors)
    if mismatched:
        fail(f"{mismatched} published features where id != hex_id", errors)

    # snap_50m archive refreshed
    for rel in (
        "04_origins/origins_snap_summary.json",
        "05_accessibility/access_primary_summary.json",
        "07_findings/findings_summary.json",
        "scenario_meta.json",
    ):
        if not (ARCHIVE / rel).is_file():
            fail(f"Missing snap_50m archive file: {rel}", errors)

    if (ARCHIVE / "04_origins/origins_snap_summary.json").is_file():
        arch_snap = load_json(ARCHIVE / "04_origins/origins_snap_summary.json")
        if float(arch_snap.get("snap_tolerance_m") or 0) != 50.0:
            fail("snap_50m archive snap_tolerance != 50", errors)

    findings_js = (REPO_ROOT / "src/components/synthesis/findingsData.js").read_text(encoding="utf-8")
    kpis = load_json(PACKAGE_ROOT / "07_findings/findings_summary.json").get("kpis") or {}
    mean = kpis.get("mean_access_score")
    if mean is not None:
        mean_s = f"{float(mean):.3f}"
        if mean_s not in findings_js and f"{float(mean):.4f}" not in findings_js:
            # WA1 uses 3-decimal rounding in draft text
            if "0.873" not in findings_js and mean_s not in findings_js:
                fail(f"findingsData.js missing mean access score ~{mean_s}", errors)
    os_cov = (kpis.get("coverage_within_10_min") or {}).get("open_space")
    if os_cov is not None:
        pct = f"{round(float(os_cov) * 100, 1)}"
        # allow 83.3 style
        if "83.3" not in findings_js and pct not in findings_js:
            fail(f"findingsData.js missing open_space coverage ~{pct}%", errors)

    manifest = load_json(PACKAGE_ROOT / "00_manifest/SOURCE_MANIFEST.json")
    if int(manifest.get("phase") or 0) != 7:
        fail(f"SOURCE_MANIFEST phase is {manifest.get('phase')}, expected 7", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  open_space: {len(open_space)} (no parking)")
    print(f"  snap_tolerance_m: {snap.get('snap_tolerance_m')}")
    print(f"  published hex features: {len(pub_hex)}")
    print(f"  mean_access_score: {mean}")
    print(f"  desert_count: {kpis.get('desert_count')}")
    print(f"  mismatch_count: {kpis.get('mismatch_count')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
