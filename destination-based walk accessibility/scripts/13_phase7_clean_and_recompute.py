#!/usr/bin/env python3
"""Phase 7: refuse dirty open_space, rebuild clean 50 m package-root chain.

1. QC pois_access_primary — no parking in open_space
2. Rebuild clean graph into package 03_network/ (do not snap on post-snap graph)
3. Snap hexes+POIs at 50 m → 04_origins/
4. Access → 05_accessibility/
5. Classify + maps → 06_maps/
6. Findings → 07_findings/

Does not publish to public/ or refresh scenarios/snap_50m/ (handled after KPIs are ready).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = PACKAGE_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import importlib

snap_mod = importlib.import_module("10_run_snap_scenario")

SNAP_M = 50.0
POIS = PACKAGE_ROOT / "02_pois" / "pois_access_primary.geojson"


def assert_open_space_clean() -> int:
    with POIS.open(encoding="utf-8") as f:
        feats = json.load(f)["features"]
    open_space = [
        ft["properties"] for ft in feats if ft["properties"].get("dest_group") == "open_space"
    ]
    leaks = []
    for p in open_space:
        blob = " ".join(
            str(p.get(k) or "")
            for k in ("gmaps_category", "gmaps_categories", "name", "osm_value", "osm_key")
        ).lower()
        if "parking" in blob or "car park" in blob or "carpark" in blob:
            leaks.append(p)
    if leaks:
        print("FAIL: parking still classified as open_space:")
        for p in leaks:
            print(" ", p.get("name"), p.get("gmaps_category") or p.get("osm_value"))
        raise SystemExit(1)
    print(f"QC open_space clean: n={len(open_space)} (no parking)")
    for p in open_space:
        print(
            " -",
            repr(p.get("name") or ""),
            "|",
            p.get("source"),
            "|",
            p.get("gmaps_category") or p.get("osm_value"),
        )
    return len(open_space)


def main() -> None:
    n_os = assert_open_space_clean()

    out_root = PACKAGE_ROOT
    print(f"=== Phase 7 recompute 50 m into package root ({out_root}) ===")
    print("Rebuilding clean graph from roads_walk_aoi…")
    G = snap_mod.build_clean_graph(out_root / "03_network")
    print(f"Graph nodes={G.number_of_nodes()} edges={G.number_of_edges()}")

    print(f"Snapping at {SNAP_M} m…")
    G = snap_mod.run_snap(G, out_root, SNAP_M)

    print("Computing accessibility…")
    snap_mod.run_accessibility(G, out_root)

    print("Classify + maps + findings…")
    snap_mod.run_classify_maps_findings(out_root)

    snap_sum = json.loads((out_root / "04_origins" / "origins_snap_summary.json").read_text(encoding="utf-8"))
    acc_sum = json.loads(
        (out_root / "05_accessibility" / "access_primary_summary.json").read_text(encoding="utf-8")
    )
    findings = json.loads((out_root / "07_findings" / "findings_summary.json").read_text(encoding="utf-8"))
    meta = {
        "phase": 7,
        "snap_tolerance_m": SNAP_M,
        "open_space_count": n_os,
        "role": "package_root_primary_after_open_space_cleanup",
        "hex_snap_ok": snap_sum.get("hex_snap_ok"),
        "poi_snap_ok": snap_sum.get("poi_snap_ok"),
        "mean_access_score": acc_sum.get("mean_access_score"),
        "desert_count": acc_sum.get("desert_count"),
        "mismatch_count": (findings.get("kpis") or {}).get("mismatch_count"),
        "poi_sources_snapped": acc_sum.get("poi_sources_snapped"),
    }
    (out_root / "00_manifest" / "phase7_recompute_meta.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(meta, indent=2))
    print("PASS Phase 7 package-root recompute")


if __name__ == "__main__":
    main()
