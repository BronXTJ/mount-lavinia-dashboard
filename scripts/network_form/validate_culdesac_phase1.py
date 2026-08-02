#!/usr/bin/env python3
"""Validate cul-de-sac Phase 1 depth outputs. Exit 0 only on PASS."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "data" / "network-form"
EXPECTED_PRIMARY = 259
CLASSES = {"short", "medium", "long"}


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def main() -> int:
    errors: list[str] = []
    depth_path = OUT / "culdesacs_depth.geojson"
    summary_path = OUT / "culdesac_depth_summary.json"
    edges_path = OUT / "topology_edges.geojson"
    metrics_path = OUT / "metrics_by_scope.json"

    for p in (depth_path, summary_path, edges_path, metrics_path):
        if not p.is_file():
            fail(f"Missing {p.name}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    depth = json.loads(depth_path.read_text(encoding="utf-8"))
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    edges = json.loads(edges_path.read_text(encoding="utf-8"))
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))

    feats = depth.get("features") or []
    primary = [f for f in feats if f.get("properties", {}).get("inside_primary") is True]
    if len(primary) != EXPECTED_PRIMARY:
        fail(f"primary culdesacs {len(primary)} != {EXPECTED_PRIMARY}", errors)

    mall = metrics.get("all", {}).get("counts", {}).get("n_culdesac")
    if mall != EXPECTED_PRIMARY:
        fail(f"metrics all n_culdesac {mall} != {EXPECTED_PRIMARY}", errors)

    class_counts = {"short": 0, "medium": 0, "long": 0}
    for f in primary:
        p = f.get("properties") or {}
        stub = p.get("stub_length_m")
        if stub is None or not isinstance(stub, (int, float)) or stub != stub or stub <= 0:
            fail(f"node {p.get('node_id')}: invalid stub_length_m={stub}", errors)
            continue
        klass = p.get("depth_class")
        if klass not in CLASSES:
            fail(f"node {p.get('node_id')}: bad depth_class={klass}", errors)
        else:
            class_counts[klass] += 1
        if p.get("dist_to_junction_m") is None:
            fail(f"node {p.get('node_id')}: missing dist_to_junction_m", errors)
        if sum(class_counts.values()) and klass:
            # stub vs class consistency
            if klass == "short" and stub >= 50:
                fail(f"node {p.get('node_id')}: short but stub={stub}", errors)
            if klass == "medium" and not (50 <= stub <= 150):
                fail(f"node {p.get('node_id')}: medium but stub={stub}", errors)
            if klass == "long" and stub <= 150:
                fail(f"node {p.get('node_id')}: long but stub={stub}", errors)

    if sum(class_counts.values()) != len(primary):
        fail(
            f"depth classes {sum(class_counts.values())} do not partition primary {len(primary)}",
            errors,
        )

    if int(summary.get("inventory_primary_n") or 0) != len(primary):
        fail("summary inventory_primary_n mismatch", errors)

    if len(edges.get("features") or []) < 500:
        fail(f"topology_edges looks too small: {len(edges.get('features') or [])}", errors)

    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS")
    print(f"  primary culdesacs={len(primary)}")
    print(f"  depth_class={class_counts}")
    print(f"  topology_edges={len(edges['features'])}")
    print(f"  median_stub_all={summary['by_scope']['all']['stub_length_m']['median']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
