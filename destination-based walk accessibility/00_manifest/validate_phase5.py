#!/usr/bin/env python3
"""Phase 5 gate: findings package. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "00_manifest/METHODS_PHASE5.md",
    "07_findings/findings.md",
    "07_findings/findings_summary.json",
    "07_findings/desert_hex_ids.json",
]

MAP_NAMES = [
    "map01_access_score",
    "map02_access_tiers_deserts",
    "map03_time_by_group",
    "map04_coverage_10min",
    "map05_centrality_mismatch",
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

    md = (PACKAGE_ROOT / "07_findings/findings.md").read_text(encoding="utf-8")
    if len(md) < 1500:
        fail(f"findings.md too short ({len(md)} chars)", errors)
    for name in MAP_NAMES:
        if name not in md:
            fail(f"findings.md missing map cite: {name}", errors)

    summary = load_json(PACKAGE_ROOT / "07_findings/findings_summary.json")
    for key in ("kpis", "draft_findings", "priorities"):
        if key not in summary:
            fail(f"findings_summary missing {key}", errors)

    drafts = summary.get("draft_findings") or []
    if len(drafts) < 3:
        fail(f"draft_findings length {len(drafts)} < 3", errors)
    for i, card in enumerate(drafts):
        for field in ("id", "label", "observation", "interpretation", "implication"):
            if field not in card:
                fail(f"draft_findings[{i}] missing {field}", errors)
                break
        else:
            for field in ("observation", "interpretation", "implication"):
                if not isinstance(card[field], list) or len(card[field]) < 1:
                    fail(f"draft_findings[{i}].{field} must be non-empty list", errors)

    deserts = load_json(PACKAGE_ROOT / "07_findings/desert_hex_ids.json")
    desert_ids = deserts.get("hex_ids") or []
    desert_count = int(deserts.get("count") or len(desert_ids))
    if desert_count != len(desert_ids):
        fail("desert_hex_ids count != len(hex_ids)", errors)

    access = load_json(PACKAGE_ROOT / "05_accessibility/access_primary_summary.json")
    maps = load_json(PACKAGE_ROOT / "06_maps/maps_summary.json")
    if desert_count != int(access.get("desert_count") or -1):
        fail(
            f"desert count {desert_count} != Phase3 desert_count {access.get('desert_count')}",
            errors,
        )
    if desert_count != int((maps.get("tier_counts") or {}).get("low") or -1):
        fail(
            f"desert count {desert_count} != tier_counts.low {(maps.get('tier_counts') or {}).get('low')}",
            errors,
        )

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  findings.md chars: {len(md)}")
    print(f"  draft_findings: {[d.get('id') for d in drafts]}")
    print(f"  desert_count: {desert_count}")
    print(f"  mean_access_score: {(summary.get('kpis') or {}).get('mean_access_score')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
