#!/usr/bin/env python3
"""
Phase 3: cul-de-sac × walk-access overlay (shared 100 m hex_id join).

Inputs:
  public/data/network-form/culdesacs_depth.geojson
  public/data/walk-accessibility/access_hex_classified.geojson
  public/data/density-analysis/hex_grid_primary_100m.geojson

Outputs:
  public/data/network-form/culdesac_hex_walk.geojson
  public/data/network-form/culdesacs_walk.geojson
  public/data/network-form/culdesac_walk_summary.json
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from shapely.geometry import shape
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "data" / "network-form"
WALK_HEX = ROOT / "public" / "data" / "walk-accessibility" / "access_hex_classified.geojson"
HEX_PATH = ROOT / "public" / "data" / "density-analysis" / "hex_grid_primary_100m.geojson"

TIER_ORDER = ("high", "medium", "low", "excluded")
WALK_JOIN_KEYS = ("access_score", "access_tier", "analysis_ok", "snap_ok")


def load_fc(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_fc(path: Path, features: list) -> None:
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")),
        encoding="utf-8",
    )


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


def assign_hex_ids(primary: list[dict], hex_fc: dict) -> tuple[dict[int, list], int, dict[int, int]]:
    """Point-in-hex assign; returns by_hex props lists, outside count, node_id -> hex_id."""
    hex_geoms = []
    hex_meta = []
    for f in hex_fc["features"]:
        g = shape(f["geometry"])
        if g.is_empty:
            continue
        hid = f["properties"].get("id")
        if hid is None:
            continue
        hid = int(hid)
        hex_geoms.append(g)
        hex_meta.append({"id": hid, "geom": g})
    tree = STRtree(hex_geoms)
    geom_index = {id(g): i for i, g in enumerate(hex_geoms)}

    by_hex: dict[int, list] = defaultdict(list)
    node_to_hex: dict[int, int] = {}
    outside = 0

    for f in primary:
        props = f["properties"]
        pt = shape(f["geometry"])
        assigned = None
        for h in tree.query(pt):
            idx = geom_index.get(id(h))
            if idx is None:
                continue
            if hex_geoms[idx].covers(pt) or hex_geoms[idx].intersects(pt):
                assigned = hex_meta[idx]["id"]
                break
        if assigned is None:
            for i, g in enumerate(hex_geoms):
                if g.covers(pt):
                    assigned = hex_meta[i]["id"]
                    break
        if assigned is None:
            outside += 1
            continue
        by_hex[int(assigned)].append(props)
        nid = props.get("node_id")
        if nid is not None:
            node_to_hex[int(nid)] = int(assigned)

    return by_hex, outside, node_to_hex


def depth_counts(rows: list[dict]) -> dict[str, int]:
    out = {"short": 0, "medium": 0, "long": 0}
    for r in rows:
        dc = r.get("depth_class")
        if dc in out:
            out[dc] += 1
    return out


def main() -> None:
    depth_fc = load_fc(OUT_DIR / "culdesacs_depth.geojson")
    walk_fc = load_fc(WALK_HEX)
    grid_fc = load_fc(HEX_PATH)

    walk_by_id: dict[int, dict] = {}
    for f in walk_fc["features"]:
        p = f.get("properties") or {}
        hid = p.get("hex_id", p.get("id"))
        if hid is None:
            continue
        walk_by_id[int(hid)] = {
            "access_score": p.get("access_score"),
            "access_tier": p.get("access_tier"),
            "analysis_ok": p.get("analysis_ok"),
            "snap_ok": p.get("snap_ok"),
        }

    grid_geom: dict[int, dict] = {}
    grid_area: dict[int, float | None] = {}
    for f in grid_fc["features"]:
        hid = f.get("properties", {}).get("id")
        if hid is None:
            continue
        hid = int(hid)
        grid_geom[hid] = f["geometry"]
        grid_area[hid] = f["properties"].get("Hex_area")

    primary = [
        f
        for f in depth_fc["features"]
        if f.get("properties", {}).get("inside_primary") is True
        and f.get("properties", {}).get("jtype") == "culdesac"
    ]

    by_hex, outside, node_to_hex = assign_hex_ids(primary, grid_fc)

    # Aggregate hexes from assignment, then left-join walk attrs by hex_id
    hex_walk_feats = []
    missing_walk = 0
    for hid, rows in sorted(by_hex.items()):
        stubs = [float(r["stub_length_m"]) for r in rows if r.get("stub_length_m") is not None]
        dc = depth_counts(rows)
        corridor_n = sum(1 for r in rows if r.get("in_corridor"))
        p = {
            "id": hid,
            "hex_id": hid,
            "culdesac_n": len(rows),
            "mean_stub_m": None if mean(stubs) is None else round(mean(stubs), 1),
            "median_stub_m": None if median(stubs) is None else round(median(stubs), 1),
            "depth_short": dc["short"],
            "depth_medium": dc["medium"],
            "depth_long": dc["long"],
            "corridor_n": corridor_n,
            "Hex_area": grid_area.get(hid),
        }
        w = walk_by_id.get(hid)
        if w is None:
            missing_walk += 1
            p["walk_join_ok"] = False
            for k in WALK_JOIN_KEYS:
                p[k] = None
        else:
            p["walk_join_ok"] = True
            p.update(w)
        hex_walk_feats.append(
            {
                "type": "Feature",
                "properties": p,
                "geometry": grid_geom[hid],
            }
        )

    write_fc(OUT_DIR / "culdesac_hex_walk.geojson", hex_walk_feats)
    print(
        f"Wrote culdesac_hex_walk.geojson "
        f"({len(hex_walk_feats)} hexes, missing_walk={missing_walk})"
    )

    # Point overlay
    point_feats = []
    for f in primary:
        props = dict(f["properties"])
        nid = props.get("node_id")
        hid = node_to_hex.get(int(nid)) if nid is not None else None
        if hid is None:
            props["hex_id"] = None
            props["outside_grid"] = True
            for k in WALK_JOIN_KEYS:
                props[k] = None
        else:
            props["hex_id"] = hid
            props["outside_grid"] = False
            w = walk_by_id.get(hid) or {}
            for k in WALK_JOIN_KEYS:
                props[k] = w.get(k)
        point_feats.append(
            {"type": "Feature", "properties": props, "geometry": f["geometry"]}
        )

    write_fc(OUT_DIR / "culdesacs_walk.geojson", point_feats)
    print(f"Wrote culdesacs_walk.geojson ({len(point_feats)} points, outside={outside})")

    # Summaries from assigned points
    assigned_pts = [f["properties"] for f in point_feats if not f["properties"].get("outside_grid")]
    by_tier: dict[str, list] = defaultdict(list)
    for p in assigned_pts:
        tier = p.get("access_tier") or "unknown"
        by_tier[tier].append(p)

    def tier_row(tier: str, rows: list) -> dict:
        stubs = [float(r["stub_length_m"]) for r in rows if r.get("stub_length_m") is not None]
        n = len(rows)
        return {
            "access_tier": tier,
            "n": n,
            "share": round(n / max(1, len(assigned_pts)), 4),
            "median_stub_m": None if median(stubs) is None else round(median(stubs), 1),
            "mean_stub_m": None if mean(stubs) is None else round(mean(stubs), 1),
            "depth_class_counts": depth_counts(rows),
            "analysis_ok_n": sum(1 for r in rows if r.get("analysis_ok") is True),
        }

    by_access_tier = [
        tier_row(t, by_tier.get(t, []))
        for t in TIER_ORDER
        if by_tier.get(t)
    ]
    # append any unexpected tiers
    for t, rows in sorted(by_tier.items()):
        if t not in TIER_ORDER:
            by_access_tier.append(tier_row(t, rows))

    desert_rows = [
        r
        for r in assigned_pts
        if r.get("access_tier") == "low" and r.get("analysis_ok") is True
    ]
    desert_hex_ids = sorted(
        {
            int(f["properties"]["hex_id"])
            for f in hex_walk_feats
            if f["properties"].get("access_tier") == "low"
            and f["properties"].get("analysis_ok") is True
            and f["properties"].get("culdesac_n", 0) >= 1
        }
    )

    analysis_hex_scores = [
        float(f["properties"]["access_score"])
        for f in hex_walk_feats
        if f["properties"].get("analysis_ok") is True
        and f["properties"].get("access_score") is not None
    ]

    depth_x_tier: dict[str, dict[str, int]] = {
        d: {t: 0 for t in TIER_ORDER} for d in ("short", "medium", "long")
    }
    for p in assigned_pts:
        dc = p.get("depth_class")
        tier = p.get("access_tier")
        if dc in depth_x_tier and tier in depth_x_tier[dc]:
            depth_x_tier[dc][tier] += 1

    counted = sum(f["properties"]["culdesac_n"] for f in hex_walk_feats)
    summary = {
        "phase": 3,
        "primary_culdesac_n": len(primary),
        "hex_assigned_n": len(assigned_pts),
        "hex_outside_grid_n": outside,
        "hex_with_culdesacs_n": len(hex_walk_feats),
        "walk_join_missing_hex_n": missing_walk,
        "hex_coverage_note": (
            "Walk attrs join on hex_id from access_hex_classified (same primary 100 m grid). "
            "Points outside the primary hex grid remain unjoined; "
            "excluded tier means not analysis-ok (incomplete area or snap > 100 m)."
        ),
        "by_access_tier": by_access_tier,
        "desert": {
            "culdesac_n": len(desert_rows),
            "hex_n": len(desert_hex_ids),
            "hex_ids": desert_hex_ids,
            "share_of_assigned": round(len(desert_rows) / max(1, len(assigned_pts)), 4),
        },
        "mean_access_among_culdesac_hexes": (
            None if mean(analysis_hex_scores) is None else round(mean(analysis_hex_scores), 4)
        ),
        "median_access_among_culdesac_hexes": (
            None
            if median(analysis_hex_scores) is None
            else round(median(analysis_hex_scores), 4)
        ),
        "analysis_ok_culdesac_hex_n": len(analysis_hex_scores),
        "depth_x_tier": depth_x_tier,
        "hex_culdesac_n_sum": counted,
    }
    (OUT_DIR / "culdesac_walk_summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Wrote culdesac_walk_summary.json "
        f"desert_cul={len(desert_rows)} mean_access={summary['mean_access_among_culdesac_hexes']}"
    )


if __name__ == "__main__":
    main()
