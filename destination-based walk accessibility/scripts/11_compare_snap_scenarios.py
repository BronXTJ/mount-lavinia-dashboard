#!/usr/bin/env python3
"""Compare locked snap_50m vs snap_100m scenario outputs."""

from __future__ import annotations

import csv
import json
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SCENARIOS = PACKAGE_ROOT / "scenarios"
SNAP50 = SCENARIOS / "snap_50m"
SNAP100 = SCENARIOS / "snap_100m"
OUT = SCENARIOS / "compare"
BOUNDARY = PACKAGE_ROOT / "01_boundary" / "primary_study_area_boundary.geojson"
CRS_PLOT = "EPSG:32644"


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def props_by_hex(path: Path) -> dict[int, dict]:
    data = load_json(path)
    out = {}
    for f in data["features"]:
        p = f["properties"]
        out[int(p["hex_id"])] = p
    return out


def add_north_arrow(ax, x: float, y: float, size: float = 100.0) -> None:
    ax.annotate(
        "",
        xy=(x, y + size),
        xytext=(x, y),
        arrowprops=dict(facecolor="#1a1a1a", edgecolor="#1a1a1a", width=2.5, headwidth=9, headlength=10),
        zorder=10,
        clip_on=False,
    )
    ax.text(x, y + size + size * 0.22, "N", ha="center", va="bottom", fontsize=8, fontweight="bold", zorder=10)


def main() -> None:
    for p in (
        SNAP50 / "04_origins" / "origins_snap_summary.json",
        SNAP100 / "04_origins" / "origins_snap_summary.json",
        SNAP50 / "05_accessibility" / "access_primary_summary.json",
        SNAP100 / "05_accessibility" / "access_primary_summary.json",
        SNAP50 / "05_accessibility" / "access_hex_classified.geojson",
        SNAP100 / "05_accessibility" / "access_hex_classified.geojson",
        SNAP50 / "06_maps" / "maps_summary.json",
        SNAP100 / "06_maps" / "maps_summary.json",
    ):
        if not p.is_file():
            raise SystemExit(f"Missing: {p}")

    OUT.mkdir(parents=True, exist_ok=True)

    s50 = load_json(SNAP50 / "04_origins" / "origins_snap_summary.json")
    s100 = load_json(SNAP100 / "04_origins" / "origins_snap_summary.json")
    a50 = load_json(SNAP50 / "05_accessibility" / "access_primary_summary.json")
    a100 = load_json(SNAP100 / "05_accessibility" / "access_primary_summary.json")
    m50 = load_json(SNAP50 / "06_maps" / "maps_summary.json")
    m100 = load_json(SNAP100 / "06_maps" / "maps_summary.json")

    h50 = props_by_hex(SNAP50 / "05_accessibility" / "access_hex_classified.geojson")
    h100 = props_by_hex(SNAP100 / "05_accessibility" / "access_hex_classified.geojson")

    newly_snapped = sorted(
        hid for hid, p in h100.items() if p.get("snap_ok") and not h50[hid].get("snap_ok")
    )
    still_unsnapped = sorted(hid for hid, p in h100.items() if not p.get("snap_ok"))
    lost_snap = sorted(
        hid for hid, p in h50.items() if p.get("snap_ok") and not h100[hid].get("snap_ok")
    )

    deserts50 = {hid for hid, p in h50.items() if p.get("access_tier") == "low"}
    deserts100 = {hid for hid, p in h100.items() if p.get("access_tier") == "low"}
    mismatch50 = {hid for hid, p in h50.items() if p.get("mismatch_flag") is True}
    mismatch100 = {hid for hid, p in h100.items() if p.get("mismatch_flag") is True}

    table = {
        "metric": [
            "snap_tolerance_m",
            "hex_snap_ok",
            "hex_snap_fail",
            "poi_snap_ok",
            "analysis_hex_count",
            "mean_access_score",
            "desert_count",
            "mismatch_count",
            "tier_high",
            "tier_medium",
            "tier_low",
            "tier_excluded",
        ],
        "snap_50m": [
            s50.get("snap_tolerance_m"),
            s50.get("hex_snap_ok"),
            s50.get("hex_snap_fail"),
            s50.get("poi_snap_ok"),
            a50.get("analysis_hex_count"),
            a50.get("mean_access_score"),
            a50.get("desert_count"),
            m50.get("mismatch_count"),
            (m50.get("tier_counts") or {}).get("high"),
            (m50.get("tier_counts") or {}).get("medium"),
            (m50.get("tier_counts") or {}).get("low"),
            (m50.get("tier_counts") or {}).get("excluded"),
        ],
        "snap_100m": [
            s100.get("snap_tolerance_m"),
            s100.get("hex_snap_ok"),
            s100.get("hex_snap_fail"),
            s100.get("poi_snap_ok"),
            a100.get("analysis_hex_count"),
            a100.get("mean_access_score"),
            a100.get("desert_count"),
            m100.get("mismatch_count"),
            (m100.get("tier_counts") or {}).get("high"),
            (m100.get("tier_counts") or {}).get("medium"),
            (m100.get("tier_counts") or {}).get("low"),
            (m100.get("tier_counts") or {}).get("excluded"),
        ],
    }

    compare = {
        "table": table,
        "newly_snapped_hex_ids": newly_snapped,
        "still_unsnapped_hex_ids": still_unsnapped,
        "lost_snap_hex_ids": lost_snap,
        "deserts_gained": sorted(deserts100 - deserts50),
        "deserts_lost": sorted(deserts50 - deserts100),
        "mismatch_gained": sorted(mismatch100 - mismatch50),
        "mismatch_lost": sorted(mismatch50 - mismatch100),
        "counts": {
            "newly_snapped": len(newly_snapped),
            "still_unsnapped": len(still_unsnapped),
            "lost_snap": len(lost_snap),
            "deserts_gained": len(deserts100 - deserts50),
            "deserts_lost": len(deserts50 - deserts100),
            "mismatch_gained": len(mismatch100 - mismatch50),
            "mismatch_lost": len(mismatch50 - mismatch100),
        },
        "dashboard_note": "Live dashboard uses 100 m snap results; 50 m is sensitivity-only.",
    }
    (OUT / "compare_summary.json").write_text(json.dumps(compare, indent=2) + "\n", encoding="utf-8")

    with (OUT / "compare_table.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["metric", "snap_50m", "snap_100m", "delta_100_minus_50"])
        for metric, v50, v100 in zip(table["metric"], table["snap_50m"], table["snap_100m"]):
            try:
                delta = float(v100) - float(v50)
            except (TypeError, ValueError):
                delta = ""
            w.writerow([metric, v50, v100, delta])

    # Difference map: newly snapped at 100 m
    hexes = gpd.read_file(SNAP100 / "05_accessibility" / "access_hex_classified.geojson")
    if hexes.crs is None:
        hexes = hexes.set_crs(4326)
    else:
        hexes = hexes.to_crs(4326)
    boundary = gpd.read_file(BOUNDARY)
    if boundary.crs is None:
        boundary = boundary.set_crs(4326)
    hex_utm = hexes.to_crs(CRS_PLOT)
    boundary_utm = boundary.to_crs(CRS_PLOT)
    hex_utm["diff_class"] = "unchanged"
    hex_utm.loc[hex_utm["hex_id"].isin(newly_snapped), "diff_class"] = "newly_snapped_100m"
    hex_utm.loc[hex_utm["hex_id"].isin(still_unsnapped), "diff_class"] = "still_unsnapped"
    desert_gained = sorted(deserts100 - deserts50)
    hex_utm.loc[hex_utm["hex_id"].isin(desert_gained), "diff_class"] = "desert_gained_at_100m"

    colors = {
        "unchanged": "#e5e7eb",
        "newly_snapped_100m": "#0d9488",
        "still_unsnapped": "#94a3b8",
        "desert_gained_at_100m": "#dc2626",
    }
    fig = plt.figure(figsize=(10.5, 9.0), dpi=150)
    gs = fig.add_gridspec(1, 2, width_ratios=[4.2, 1.45], wspace=0.08)
    ax = fig.add_subplot(gs[0, 0])
    side = fig.add_subplot(gs[0, 1])
    side.axis("off")
    for cls, color in colors.items():
        subset = hex_utm[hex_utm["diff_class"] == cls]
        if len(subset):
            lw = 0.9 if cls != "unchanged" else 0.15
            subset.plot(ax=ax, color=color, edgecolor="white", linewidth=lw, zorder=2)
    boundary_utm.boundary.plot(ax=ax, color="#222222", linewidth=1.2, zorder=5)
    minx, miny, maxx, maxy = boundary_utm.total_bounds
    pad = 160
    ax.set_xlim(minx - pad, maxx + pad)
    ax.set_ylim(miny - pad, maxy + pad)
    ax.set_aspect("equal")
    ax.set_title("Snap sensitivity: 50 m vs 100 m differences", fontsize=11, pad=10)
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)
    xmin, xmax = ax.get_xlim()
    ymin, ymax = ax.get_ylim()
    add_north_arrow(ax, xmax - 0.07 * (xmax - xmin), ymax - 0.08 * (ymax - ymin), size=90)
    handles = [
        mpatches.Patch(color=colors["newly_snapped_100m"], label=f"Newly snapped at 100 m ({len(newly_snapped)})"),
        mpatches.Patch(color=colors["still_unsnapped"], label=f"Still unsnapped ({len(still_unsnapped)})"),
        mpatches.Patch(color=colors["desert_gained_at_100m"], label=f"Desert gained at 100 m ({len(desert_gained)})"),
        mpatches.Patch(color=colors["unchanged"], label="Unchanged / other"),
    ]
    side.legend(
        handles=handles,
        title="Difference",
        loc="upper left",
        bbox_to_anchor=(0.0, 1.0),
        borderaxespad=0.0,
        fontsize=8,
        title_fontsize=9,
        frameon=True,
        fancybox=False,
        edgecolor="#94a3b8",
        framealpha=1.0,
    )
    fig.savefig(OUT / "map_snap_difference.png", dpi=150, bbox_inches="tight", facecolor="white", pad_inches=0.2)
    plt.close(fig)

    md = f"""# Snap sensitivity — 50 m vs 100 m

## Purpose

Test how walk-accessibility KPIs and empty mid-area hexes change when the network snap tolerance
widens from **50 m** (sensitivity archive) to **100 m** (locked baseline / dashboard).

## Headline differences

| Metric | 50 m | 100 m | Delta |
|--------|------|-------|-------|
| Hex snap OK | {s50.get('hex_snap_ok')} | {s100.get('hex_snap_ok')} | {int(s100.get('hex_snap_ok') or 0) - int(s50.get('hex_snap_ok') or 0)} |
| Hex snap fail | {s50.get('hex_snap_fail')} | {s100.get('hex_snap_fail')} | {int(s100.get('hex_snap_fail') or 0) - int(s50.get('hex_snap_fail') or 0)} |
| Analysis hexes | {a50.get('analysis_hex_count')} | {a100.get('analysis_hex_count')} | {int(a100.get('analysis_hex_count') or 0) - int(a50.get('analysis_hex_count') or 0)} |
| Mean access score | {a50.get('mean_access_score')} | {a100.get('mean_access_score')} | {(float(a100.get('mean_access_score') or 0) - float(a50.get('mean_access_score') or 0)):.4f} |
| Deserts | {a50.get('desert_count')} | {a100.get('desert_count')} | {int(a100.get('desert_count') or 0) - int(a50.get('desert_count') or 0)} |
| Mismatch | {m50.get('mismatch_count')} | {m100.get('mismatch_count')} | {int(m100.get('mismatch_count') or 0) - int(m50.get('mismatch_count') or 0)} |

## Hex ID changes

- **Newly snapped at 100 m ({len(newly_snapped)}):** {newly_snapped}
- **Still unsnapped ({len(still_unsnapped)}):** {still_unsnapped}
- **Deserts gained at 100 m:** {sorted(deserts100 - deserts50)}
- **Deserts lost at 100 m:** {sorted(deserts50 - deserts100)}

## How to read this

Widening snap to 100 m attaches more hex centroids (and nearly all POIs) to the road network,
so fewer mid-area holes remain empty. Some newly included hexes can be low-access, so desert
count may rise even while mean score stays similar.

## Dashboard

The live dashboard (`public/data/walk-accessibility/`) uses the **100 m** baseline.
"""
    (OUT / "COMPARE.md").write_text(md, encoding="utf-8")
    print(f"Wrote {OUT}")
    print(json.dumps(compare["counts"], indent=2))


if __name__ == "__main__":
    main()
