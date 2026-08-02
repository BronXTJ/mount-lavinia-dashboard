#!/usr/bin/env python3
"""
Phase 2: cul-de-sac spatial pattern — hex counts + GN ranking.

Inputs:
  public/data/network-form/culdesacs_depth.geojson
  public/data/network-form/culdesac_depth_summary.json
  public/data/network-form/metrics_by_scope.json
  public/data/density-analysis/hex_grid_primary_100m.geojson

Outputs:
  public/data/network-form/culdesac_hex_counts.geojson
  public/data/network-form/culdesac_spatial_summary.json
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

from shapely.geometry import mapping, shape
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "data" / "network-form"
HEX_PATH = ROOT / "public" / "data" / "density-analysis" / "hex_grid_primary_100m.geojson"

GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]


def load_fc(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def median(vals: list[float]) -> float | None:
    if not vals:
        return None
    s = sorted(vals)
    n = len(s)
    mid = n // 2
    if n % 2:
        return s[mid]
    return (s[mid - 1] + s[mid]) / 2


def mean(vals: list[float]) -> float | None:
    if not vals:
        return None
    return sum(vals) / len(vals)


def write_fc(path: Path, features: list) -> None:
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")),
        encoding="utf-8",
    )


def main() -> None:
    depth_fc = load_fc(OUT_DIR / "culdesacs_depth.geojson")
    depth_summary = load_fc(OUT_DIR / "culdesac_depth_summary.json")
    metrics = load_fc(OUT_DIR / "metrics_by_scope.json")
    hex_fc = load_fc(HEX_PATH)

    primary = [
        f
        for f in depth_fc["features"]
        if f.get("properties", {}).get("inside_primary") is True
        and f.get("properties", {}).get("jtype") == "culdesac"
    ]

    # Build hex spatial index
    hex_geoms = []
    hex_meta = []
    for f in hex_fc["features"]:
        g = shape(f["geometry"])
        if g.is_empty:
            continue
        hid = f["properties"].get("id")
        if hid is None:
            continue
        hex_geoms.append(g)
        hex_meta.append(
            {
                "id": int(hid) if not isinstance(hid, int) else hid,
                "Hex_area": f["properties"].get("Hex_area"),
                "geometry": f["geometry"],
                "geom": g,
            }
        )
    tree = STRtree(hex_geoms)
    # STRtree query returns geometries; map back via id(geom) or index
    geom_index = {id(g): i for i, g in enumerate(hex_geoms)}

    by_hex: dict[int, list[dict]] = defaultdict(list)
    outside = 0
    for f in primary:
        props = f["properties"]
        pt = shape(f["geometry"])
        hits = tree.query(pt)
        assigned = None
        for h in hits:
            # shapely 2 returns ndarray of geoms
            idx = geom_index.get(id(h))
            if idx is None:
                continue
            if hex_geoms[idx].covers(pt) or hex_geoms[idx].intersects(pt):
                assigned = hex_meta[idx]["id"]
                break
        if assigned is None:
            # fallback: nearest hex centroid within 60 m
            best_i = None
            best_d = 60.0
            for i, g in enumerate(hex_geoms):
                d = g.centroid.distance(pt)
                if d < best_d:
                    best_d = d
                    best_i = i
            if best_i is not None and hex_geoms[best_i].distance(pt) <= 1e-9:
                assigned = hex_meta[best_i]["id"]
            elif best_i is not None:
                # only accept if point is inside
                if hex_geoms[best_i].covers(pt):
                    assigned = hex_meta[best_i]["id"]
        if assigned is None:
            outside += 1
            continue
        by_hex[int(assigned)].append(props)

    hex_by_id = {h["id"]: h for h in hex_meta}
    hex_feats = []
    for hid, rows in sorted(by_hex.items()):
        stubs = [float(r["stub_length_m"]) for r in rows if r.get("stub_length_m") is not None]
        depth_c = {"short": 0, "medium": 0, "long": 0}
        corridor_n = 0
        for r in rows:
            dc = r.get("depth_class")
            if dc in depth_c:
                depth_c[dc] += 1
            if r.get("in_corridor"):
                corridor_n += 1
        h = hex_by_id[hid]
        hex_feats.append(
            {
                "type": "Feature",
                "properties": {
                    "id": hid,
                    "hex_id": hid,
                    "culdesac_n": len(rows),
                    "mean_stub_m": None if mean(stubs) is None else round(mean(stubs), 1),
                    "median_stub_m": None if median(stubs) is None else round(median(stubs), 1),
                    "depth_short": depth_c["short"],
                    "depth_medium": depth_c["medium"],
                    "depth_long": depth_c["long"],
                    "corridor_n": corridor_n,
                    "Hex_area": h.get("Hex_area"),
                },
                "geometry": h["geometry"],
            }
        )

    write_fc(OUT_DIR / "culdesac_hex_counts.geojson", hex_feats)
    print(f"Wrote culdesac_hex_counts.geojson ({len(hex_feats)} hexes, outside_grid={outside})")

    # GN ranking
    rank = []
    for name in GN_NAMES:
        m = metrics.get(name) or {}
        d = (depth_summary.get("by_scope") or {}).get(name) or {}
        n = int((m.get("counts") or {}).get("n_culdesac") or d.get("n") or 0)
        density = m.get("culdesac_per_km2")
        stub = (d.get("stub_length_m") or {})
        dc = d.get("depth_class_counts") or {}
        long_n = int(dc.get("long") or 0)
        long_share = (long_n / n) if n else 0.0
        rank.append(
            {
                "gn_name": name,
                "n": n,
                "culdesac_per_km2": density,
                "median_stub_m": stub.get("median"),
                "mean_stub_m": stub.get("mean"),
                "depth_class_counts": dc,
                "long_share": round(long_share, 4),
                "corridor_n": d.get("corridor_n"),
                "interior_n": d.get("interior_n"),
            }
        )
    rank.sort(key=lambda r: (-(r["culdesac_per_km2"] or 0), -r["n"]))
    for i, row in enumerate(rank):
        row["rank"] = i + 1

    all_d = (depth_summary.get("by_scope") or {}).get("all") or {}
    corridor_vs_interior = {
        "corridor_n": all_d.get("corridor_n"),
        "interior_n": all_d.get("interior_n"),
        "corridor_share": round(
            (all_d.get("corridor_n") or 0) / max(1, all_d.get("n") or 1), 4
        ),
    }

    top_by_n = sorted(
        [
            {
                "hex_id": f["properties"]["hex_id"],
                "culdesac_n": f["properties"]["culdesac_n"],
                "mean_stub_m": f["properties"]["mean_stub_m"],
                "median_stub_m": f["properties"]["median_stub_m"],
            }
            for f in hex_feats
        ],
        key=lambda x: (-x["culdesac_n"], -(x["mean_stub_m"] or 0)),
    )[:10]

    top_by_stub = sorted(
        [
            {
                "hex_id": f["properties"]["hex_id"],
                "culdesac_n": f["properties"]["culdesac_n"],
                "mean_stub_m": f["properties"]["mean_stub_m"],
                "median_stub_m": f["properties"]["median_stub_m"],
            }
            for f in hex_feats
            if f["properties"]["culdesac_n"] >= 2
        ],
        key=lambda x: (-(x["mean_stub_m"] or 0), -x["culdesac_n"]),
    )[:10]

    counted = sum(f["properties"]["culdesac_n"] for f in hex_feats)
    summary = {
        "phase": 2,
        "primary_culdesac_n": len(primary),
        "hex_assigned_n": counted,
        "hex_outside_grid_n": outside,
        "hex_with_culdesacs_n": len(hex_feats),
        "hex_coverage_note": (
            "Cul-de-sac hex counts use density-analysis hex_grid_primary_100m "
            "(Mount Lavinia primary study area). Points outside that grid are "
            "excluded from the choropleth but remain in GN ranking."
        ),
        "by_gn_rank": rank,
        "corridor_vs_interior": corridor_vs_interior,
        "top_hexes_by_count": top_by_n,
        "top_hexes_by_mean_stub_n2": top_by_stub,
    }
    (OUT_DIR / "culdesac_spatial_summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Wrote culdesac_spatial_summary.json "
        f"assigned={counted}/{len(primary)} top_gn={rank[0]['gn_name']}"
    )


if __name__ == "__main__":
    main()
