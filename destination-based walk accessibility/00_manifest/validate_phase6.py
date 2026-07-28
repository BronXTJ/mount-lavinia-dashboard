#!/usr/bin/env python3
"""Phase 6 gate: dashboard publish + id alias. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent
PUBLIC = REPO_ROOT / "public" / "data" / "walk-accessibility"

REQUIRED_PACKAGE = [
    "00_manifest/METHODS_PHASE6.md",
    "05_accessibility/access_hex_classified.geojson",
    "05_accessibility/access_primary_summary.json",
    "04_origins/pois_snapped.geojson",
    "07_findings/findings_summary.json",
]

REQUIRED_PUBLIC = [
    "access_hex_classified.geojson",
    "access_primary_summary.json",
    "pois_snapped.geojson",
    "findings_summary.json",
]

REQUIRED_UI = [
    "src/constants/walkAccessibility.js",
    "src/hooks/useWalkAccessibilityLayers.js",
    "src/utils/walkAccessibilityStats.js",
    "src/components/focusArea/WalkAccessibilityView.jsx",
    "src/components/focusArea/WalkAccessMap.jsx",
    "src/components/focusArea/WalkAccessMapLayerFab.jsx",
    "src/components/focusArea/WalkAccessLegend.jsx",
    "src/components/focusArea/WalkAccessScorePanel.jsx",
    "src/components/focusArea/WalkAccessGroupsPanel.jsx",
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

    for rel in REQUIRED_UI:
        if not (REPO_ROOT / rel).is_file():
            fail(f"Missing UI file: {rel}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    hex_path = PUBLIC / "access_hex_classified.geojson"
    data = load_json(hex_path)
    feats = data.get("features") or []
    if len(feats) < 100:
        fail(f"classified hex feature count {len(feats)} < 100", errors)

    missing_id = 0
    mismatched = 0
    missing_hex_area = 0
    for f in feats:
        p = f.get("properties") or {}
        if "id" not in p:
            missing_id += 1
            continue
        hid = p.get("hex_id")
        if hid is not None and int(p["id"]) != int(hid):
            mismatched += 1
        if not isinstance(p.get("Hex_area"), (int, float)):
            missing_hex_area += 1

    if missing_id:
        fail(f"{missing_id} features missing id alias", errors)
    if mismatched:
        fail(f"{mismatched} features where id != hex_id", errors)
    if missing_hex_area:
        fail(f"{missing_hex_area} features missing Hex_area", errors)

    # Wire checks in App / Sidebar / Tab2
    app = (REPO_ROOT / "src/App.jsx").read_text(encoding="utf-8")
    if "walk-access" not in app:
        fail("App.jsx missing walk-access in FOCUS_SUB_IDS", errors)

    sidebar = (REPO_ROOT / "src/components/Sidebar.jsx").read_text(encoding="utf-8")
    if "walk-access" not in sidebar:
        fail("Sidebar.jsx missing walk-access FOCUS_SUBS entry", errors)

    tab2 = (REPO_ROOT / "src/tabs/Tab2_FocusArea.jsx").read_text(encoding="utf-8")
    if "walk-access" not in tab2 or "WalkAccessibilityView" not in tab2:
        fail("Tab2_FocusArea.jsx missing WalkAccessibilityView wiring", errors)

    findings = (REPO_ROOT / "src/components/synthesis/findingsData.js").read_text(encoding="utf-8")
    for wid in ("WA1", "WA2", "WA3"):
        if f"id: '{wid}'" not in findings and f'id: "{wid}"' not in findings:
            fail(f"findingsData.js missing {wid}", errors)
    if "focusSub: 'walk-access'" not in findings:
        fail("findingsData.js missing walk-access evidence links", errors)

    guide = (REPO_ROOT / "src/constants/userGuideContent.js").read_text(encoding="utf-8")
    if "walk-access" not in guide:
        fail("userGuideContent.js missing walk-access section", errors)

    manifest = load_json(PACKAGE_ROOT / "00_manifest/SOURCE_MANIFEST.json")
    if int(manifest.get("phase") or 0) != 6:
        fail(f"SOURCE_MANIFEST phase is {manifest.get('phase')}, expected 6", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  published hex features: {len(feats)}")
    print(f"  public dir: {PUBLIC}")
    print("  UI + WA1–WA3 + walk-access wiring OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
