#!/usr/bin/env python3
"""
Phase 4: cul-de-sac × density / UMI cross (shared 100 m hex_id join).

Inputs:
  public/data/network-form/culdesac_hex_walk.geojson
  public/data/network-form/culdesacs_walk.geojson
  public/data/density-analysis/density_primary_hex.geojson
  public/data/urban-morpho/urban-maturation/maturation_primary_hex.geojson

Outputs:
  public/data/network-form/culdesac_hex_density_umi.geojson
  public/data/network-form/culdesacs_density_umi.geojson
  public/data/network-form/culdesac_density_umi_summary.json
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "data" / "network-form"
DENS_PATH = ROOT / "public" / "data" / "density-analysis" / "density_primary_hex.geojson"
MAT_PATH = (
    ROOT / "public" / "data" / "urban-morpho" / "urban-maturation" / "maturation_primary_hex.geojson"
)

TIER_ORDER = ("high", "medium", "low")
DENS_KEYS = ("FSI", "GSI", "Density_V", "is_valid")
MAT_KEYS = ("umi", "entropy_norm", "accessibility", "tier", "is_valid_maturation")


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


def round_or_none(v: float | None, nd: int = 4) -> float | None:
    if v is None:
        return None
    return round(v, nd)


def index_by_id(fc: dict) -> dict[int, dict]:
    out: dict[int, dict] = {}
    for f in fc.get("features") or []:
        p = f.get("properties") or {}
        hid = p.get("hex_id", p.get("id"))
        if hid is None:
            continue
        out[int(hid)] = p
    return out


def depth_counts(rows: list[dict]) -> dict[str, int]:
    out = {"short": 0, "medium": 0, "long": 0}
    for r in rows:
        dc = r.get("depth_class")
        if dc in out:
            out[dc] += 1
    return out


def main() -> None:
    hex_walk = load_fc(OUT_DIR / "culdesac_hex_walk.geojson")
    pts_walk = load_fc(OUT_DIR / "culdesacs_walk.geojson")
    dens_by = index_by_id(load_fc(DENS_PATH))
    mat_by = index_by_id(load_fc(MAT_PATH))

    missing_dens = 0
    missing_mat = 0
    hex_feats = []
    for f in hex_walk["features"]:
        p = dict(f.get("properties") or {})
        hid = int(p.get("hex_id", p.get("id")))
        d = dens_by.get(hid)
        m = mat_by.get(hid)
        if d is None:
            missing_dens += 1
            p["density_join_ok"] = False
            for k in DENS_KEYS:
                p[k] = None
        else:
            p["density_join_ok"] = True
            for k in DENS_KEYS:
                p[k] = d.get(k)
        if m is None:
            missing_mat += 1
            p["maturation_join_ok"] = False
            for k in MAT_KEYS:
                p[k] = None
        else:
            p["maturation_join_ok"] = True
            for k in MAT_KEYS:
                p[k] = m.get(k)
        p["id"] = hid
        p["hex_id"] = hid
        hex_feats.append({"type": "Feature", "properties": p, "geometry": f["geometry"]})

    write_fc(OUT_DIR / "culdesac_hex_density_umi.geojson", hex_feats)
    print(
        f"Wrote culdesac_hex_density_umi.geojson "
        f"({len(hex_feats)} hexes, missing_dens={missing_dens}, missing_mat={missing_mat})"
    )

    # Points: copy walk attrs + density/UMI from hex
    dens_mat_by_hex = {int(f["properties"]["hex_id"]): f["properties"] for f in hex_feats}
    point_feats = []
    for f in pts_walk["features"]:
        props = dict(f["properties"])
        hid = props.get("hex_id")
        if hid is None:
            for k in DENS_KEYS + MAT_KEYS:
                props[k] = None
            props["density_join_ok"] = False
            props["maturation_join_ok"] = False
        else:
            src = dens_mat_by_hex.get(int(hid)) or {}
            for k in DENS_KEYS + MAT_KEYS:
                props[k] = src.get(k)
            props["density_join_ok"] = bool(src.get("density_join_ok"))
            props["maturation_join_ok"] = bool(src.get("maturation_join_ok"))
        point_feats.append(
            {"type": "Feature", "properties": props, "geometry": f["geometry"]}
        )

    write_fc(OUT_DIR / "culdesacs_density_umi.geojson", point_feats)
    print(f"Wrote culdesacs_density_umi.geojson ({len(point_feats)} points)")

    assigned = [f["properties"] for f in point_feats if f["properties"].get("hex_id") is not None]
    outside = len(point_feats) - len(assigned)

    by_tier: dict[str, list] = defaultdict(list)
    for p in assigned:
        tier = p.get("tier") or "unknown"
        by_tier[tier].append(p)

    def tier_row(tier: str, rows: list) -> dict:
        stubs = [float(r["stub_length_m"]) for r in rows if r.get("stub_length_m") is not None]
        fsis = [float(r["FSI"]) for r in rows if r.get("FSI") is not None]
        umis = [float(r["umi"]) for r in rows if r.get("umi") is not None]
        n = len(rows)
        return {
            "tier": tier,
            "n": n,
            "share": round(n / max(1, len(assigned)), 4),
            "median_stub_m": round_or_none(median(stubs), 1),
            "mean_fsi": round_or_none(mean(fsis), 3),
            "mean_umi": round_or_none(mean(umis), 4),
            "depth_class_counts": depth_counts(rows),
        }

    by_maturation_tier = [
        tier_row(t, by_tier.get(t, [])) for t in TIER_ORDER if by_tier.get(t)
    ]
    for t, rows in sorted(by_tier.items()):
        if t not in TIER_ORDER:
            by_maturation_tier.append(tier_row(t, rows))

    valid_fsi = [
        float(f["properties"]["FSI"])
        for f in hex_feats
        if f["properties"].get("is_valid") is True and f["properties"].get("FSI") is not None
    ]
    valid_umi = [
        float(f["properties"]["umi"])
        for f in hex_feats
        if f["properties"].get("is_valid_maturation") is True
        and f["properties"].get("umi") is not None
    ]

    high_n = sum(1 for p in assigned if p.get("tier") == "high")
    low_n = sum(1 for p in assigned if p.get("tier") == "low")

    depth_x_tier: dict[str, dict[str, int]] = {
        d: {t: 0 for t in TIER_ORDER} for d in ("short", "medium", "long")
    }
    for p in assigned:
        dc = p.get("depth_class")
        tier = p.get("tier")
        if dc in depth_x_tier and tier in depth_x_tier[dc]:
            depth_x_tier[dc][tier] += 1

    counted = sum(int(f["properties"]["culdesac_n"]) for f in hex_feats)
    summary = {
        "phase": 4,
        "primary_culdesac_n": len(point_feats),
        "hex_assigned_n": len(assigned),
        "hex_outside_grid_n": outside,
        "hex_with_culdesacs_n": len(hex_feats),
        "density_join_missing_hex_n": missing_dens,
        "maturation_join_missing_hex_n": missing_mat,
        "hex_coverage_note": (
            "Density (FSI/GSI/Density_V) and maturation (umi/tier/entropy_norm) join on "
            "hex_id from density_primary_hex and maturation_primary_hex (same primary 100 m grid). "
            "Mean FSI/UMI among cul-de-sac hexes use is_valid / is_valid_maturation gates."
        ),
        "by_maturation_tier": by_maturation_tier,
        "mean_fsi_among_culdesac_hexes": round_or_none(mean(valid_fsi), 3),
        "median_fsi_among_culdesac_hexes": round_or_none(median(valid_fsi), 3),
        "mean_umi_among_culdesac_hexes": round_or_none(mean(valid_umi), 4),
        "median_umi_among_culdesac_hexes": round_or_none(median(valid_umi), 4),
        "valid_density_culdesac_hex_n": len(valid_fsi),
        "valid_maturation_culdesac_hex_n": len(valid_umi),
        "high_umi_share": round(high_n / max(1, len(assigned)), 4),
        "low_umi_share": round(low_n / max(1, len(assigned)), 4),
        "depth_x_tier": depth_x_tier,
        "hex_culdesac_n_sum": counted,
    }
    (OUT_DIR / "culdesac_density_umi_summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Wrote culdesac_density_umi_summary.json "
        f"mean_umi={summary['mean_umi_among_culdesac_hexes']} "
        f"mean_fsi={summary['mean_fsi_among_culdesac_hexes']}"
    )


if __name__ == "__main__":
    main()
