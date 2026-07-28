#!/usr/bin/env python3
"""Phase 4: classify accessibility hexes and export report maps."""

from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import pandas as pd
from matplotlib import colors as mcolors
from shapely.geometry import mapping

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent

ACCESS_HEX = PACKAGE_ROOT / "05_accessibility" / "access_hex_primary.geojson"
ACCESS_SUMMARY = PACKAGE_ROOT / "05_accessibility" / "access_primary_summary.json"
OUT_CLASSIFIED = PACKAGE_ROOT / "05_accessibility" / "access_hex_classified.geojson"
BOUNDARY = PACKAGE_ROOT / "01_boundary" / "primary_study_area_boundary.geojson"
BETWEENNESS = (
    REPO_ROOT
    / "json_files"
    / "Primary study area final analysis 01"
    / "07_centrality"
    / "betweenness_5000m.geojson"
)
OUT_MAPS = PACKAGE_ROOT / "06_maps"
CRS_PLOT = "EPSG:32644"

DEST_GROUPS = ["food", "education", "health", "transit", "finance", "open_space"]
TIER_COLORS = {
    "high": "#2a9d8f",
    "medium": "#e9c46a",
    "low": "#e76f51",
    "excluded": "#d0d0d0",
}
EXCLUDED_FACE = "#d9d9d9"


def add_north_arrow(ax, x: float, y: float, size: float = 120.0) -> None:
    ax.annotate(
        "",
        xy=(x, y + size),
        xytext=(x, y),
        arrowprops=dict(facecolor="#1a1a1a", edgecolor="#1a1a1a", width=2.5, headwidth=9, headlength=10),
        zorder=10,
        clip_on=False,
    )
    ax.text(
        x,
        y + size + size * 0.22,
        "N",
        ha="center",
        va="bottom",
        fontsize=8,
        fontweight="bold",
        color="#1a1a1a",
        clip_on=False,
        zorder=10,
    )


def add_scale_bar(ax, length_m: float = 500.0, height_m: float = 40.0) -> None:
    xmin, xmax = ax.get_xlim()
    ymin, ymax = ax.get_ylim()
    x0 = xmin + 0.05 * (xmax - xmin)
    y0 = ymin + 0.045 * (ymax - ymin)
    seg = length_m / 2
    ax.add_patch(
        mpatches.Rectangle((x0, y0), seg, height_m, facecolor="#1a1a1a", edgecolor="#1a1a1a", zorder=10, clip_on=False)
    )
    ax.add_patch(
        mpatches.Rectangle(
            (x0 + seg, y0),
            seg,
            height_m,
            facecolor="#ffffff",
            edgecolor="#1a1a1a",
            linewidth=0.8,
            zorder=10,
            clip_on=False,
        )
    )
    label_y = y0 - height_m * 2.2
    ax.text(x0, label_y, "0", ha="center", va="top", fontsize=7, color="#1a1a1a", clip_on=False, zorder=10)
    ax.text(x0 + seg, label_y, f"{int(seg)}", ha="center", va="top", fontsize=7, color="#1a1a1a", clip_on=False, zorder=10)
    ax.text(
        x0 + length_m,
        label_y,
        f"{int(length_m)} m",
        ha="center",
        va="top",
        fontsize=7,
        color="#1a1a1a",
        clip_on=False,
        zorder=10,
    )


def access_tier(row: pd.Series) -> str:
    # Prefer analysis_ok (area_ratio>=0.90 & snap_ok); fall back if missing
    if "analysis_ok" in row.index and pd.notna(row.get("analysis_ok")):
        ok = bool(row.get("analysis_ok"))
    else:
        ratio = row.get("area_ratio")
        ok = bool(row.get("snap_ok")) and ratio is not None and float(ratio) >= 0.90
    if not ok:
        return "excluded"
    g = int(row.get("groups_within_10") or 0)
    if g >= 5:
        return "high"
    if g >= 3:
        return "medium"
    return "low"


def mean_bta_per_hex(hexes: gpd.GeoDataFrame, bet_path: Path) -> pd.Series:
    bet = gpd.read_file(bet_path)
    if bet.crs is None:
        bet = bet.set_crs(4326)
    else:
        bet = bet.to_crs(4326)
    hex_m = hexes.to_crs(3857)[["hex_id", "geometry"]].copy()
    bet_m = bet.to_crs(3857)[["BtA5000", "geometry"]].copy()
    bet_m["BtA5000"] = pd.to_numeric(bet_m["BtA5000"], errors="coerce")
    bet_m = bet_m.dropna(subset=["BtA5000"])
    joined = gpd.sjoin(bet_m, hex_m, how="inner", predicate="intersects")
    means = joined.groupby("hex_id")["BtA5000"].mean()
    return means


def style_map_frame(ax, boundary_utm: gpd.GeoDataFrame, title: str, *, north: bool = True) -> None:
    boundary_utm.boundary.plot(ax=ax, color="#222222", linewidth=1.2, zorder=5)
    minx, miny, maxx, maxy = boundary_utm.total_bounds
    pad = 160
    ax.set_xlim(minx - pad, maxx + pad)
    ax.set_ylim(miny - pad, maxy + pad)
    ax.set_aspect("equal")
    ax.set_title(title, fontsize=11, pad=10)
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)
    if north:
        xmin, xmax = ax.get_xlim()
        ymin, ymax = ax.get_ylim()
        # Keep N in map margin but clear of typical hex cluster (top-right empty pad)
        add_north_arrow(ax, xmax - 0.07 * (xmax - xmin), ymax - 0.08 * (ymax - ymin), size=90)
    add_scale_bar(ax, length_m=500, height_m=35)


def make_map_with_side_panel(figsize=(10.5, 9.0)):
    """Map axes + dedicated right panel for legend/colorbar (no overlap)."""
    fig = plt.figure(figsize=figsize, dpi=150)
    gs = fig.add_gridspec(1, 2, width_ratios=[4.2, 1.35], wspace=0.08)
    ax = fig.add_subplot(gs[0, 0])
    side = fig.add_subplot(gs[0, 1])
    side.axis("off")
    return fig, ax, side


def draw_side_legend(side_ax, handles, title: str = "Legend") -> None:
    side_ax.legend(
        handles=handles,
        title=title,
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


def draw_side_colorbar(fig, side_ax, cmap, vmin, vmax, label: str) -> None:
    """Vertical colorbar fully inside the side panel axes."""
    sm = plt.cm.ScalarMappable(cmap=cmap, norm=mcolors.Normalize(vmin=vmin, vmax=vmax))
    sm.set_array([])
    # inset axes within side panel
    cax = side_ax.inset_axes([0.15, 0.15, 0.28, 0.7])
    cbar = fig.colorbar(sm, cax=cax)
    cbar.set_label(label, fontsize=9)
    cbar.ax.tick_params(labelsize=8)


def save_map_figure(fig, out: Path) -> None:
    fig.savefig(out, dpi=150, bbox_inches="tight", facecolor="white", pad_inches=0.2)
    plt.close(fig)


def write_geojson(path: Path, name: str, gdf: gpd.GeoDataFrame) -> None:
    gdf_out = gdf.to_crs(4326)
    features = []
    for _, row in gdf_out.iterrows():
        props = {}
        for col in gdf_out.columns:
            if col == "geometry":
                continue
            val = row[col]
            if pd.isna(val):
                props[col] = None
            elif isinstance(val, (np.bool_, bool)):
                props[col] = bool(val)
            elif isinstance(val, (np.floating, float)):
                props[col] = float(val)
            elif isinstance(val, (np.integer, int)):
                props[col] = int(val)
            else:
                props[col] = val
        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": mapping(row.geometry),
            }
        )
    collection = {
        "type": "FeatureCollection",
        "name": name,
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": features,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(collection, f)


def map01_access_score(hex_utm: gpd.GeoDataFrame, boundary_utm: gpd.GeoDataFrame, out: Path) -> None:
    fig, ax, side = make_map_with_side_panel()
    excluded = hex_utm[hex_utm["access_tier"] == "excluded"]
    analysis = hex_utm[hex_utm["access_tier"] != "excluded"]
    if len(excluded):
        excluded.plot(ax=ax, color=EXCLUDED_FACE, edgecolor="white", linewidth=0.2, zorder=1)
    analysis.plot(
        ax=ax,
        column="access_score",
        cmap="YlGnBu",
        vmin=0,
        vmax=1,
        edgecolor="white",
        linewidth=0.2,
        legend=False,
        zorder=2,
        missing_kwds={"color": EXCLUDED_FACE},
    )
    style_map_frame(ax, boundary_utm, "Walk accessibility score (10-min destination reach)")
    draw_side_colorbar(fig, side, "YlGnBu", 0, 1, "Access score (0–1)")
    save_map_figure(fig, out)


def map02_tiers(hex_utm: gpd.GeoDataFrame, boundary_utm: gpd.GeoDataFrame, out: Path) -> None:
    fig, ax, side = make_map_with_side_panel()
    for tier, color in TIER_COLORS.items():
        subset = hex_utm[hex_utm["access_tier"] == tier]
        if len(subset):
            lw = 0.8 if tier == "low" else 0.2
            ec = "#7f1d1d" if tier == "low" else "white"
            subset.plot(ax=ax, color=color, edgecolor=ec, linewidth=lw, zorder=2 if tier != "excluded" else 1)
    style_map_frame(ax, boundary_utm, "Access tiers (low = destination desert)")
    handles = [
        mpatches.Patch(color=TIER_COLORS["high"], label="High (≥5 groups / 10 min)"),
        mpatches.Patch(color=TIER_COLORS["medium"], label="Medium (3–4)"),
        mpatches.Patch(color=TIER_COLORS["low"], label="Low / desert (≤2)"),
        mpatches.Patch(color=TIER_COLORS["excluded"], label="Excluded (<90% area or unsnapped)"),
    ]
    draw_side_legend(side, handles, title="Access tier")
    save_map_figure(fig, out)


def map03_time_panel(hex_utm: gpd.GeoDataFrame, boundary_utm: gpd.GeoDataFrame, out: Path) -> None:
    fig = plt.figure(figsize=(14.5, 9.5), dpi=150)
    gs = fig.add_gridspec(2, 4, width_ratios=[1, 1, 1, 0.22], wspace=0.12, hspace=0.18)
    cmap = plt.get_cmap("RdYlGn_r")
    norm = mcolors.Normalize(vmin=0, vmax=15)
    axes = []
    for i, g in enumerate(DEST_GROUPS):
        r, c = divmod(i, 3)
        ax = fig.add_subplot(gs[r, c])
        axes.append(ax)
        col = f"time_{g}_min"
        excluded = hex_utm[hex_utm["access_tier"] == "excluded"]
        analysis = hex_utm[hex_utm["access_tier"] != "excluded"].copy()
        if len(excluded):
            excluded.plot(ax=ax, color=EXCLUDED_FACE, edgecolor="white", linewidth=0.15, zorder=1)
        analysis.plot(
            ax=ax,
            column=col,
            cmap=cmap,
            norm=norm,
            edgecolor="white",
            linewidth=0.15,
            zorder=2,
            missing_kwds={"color": EXCLUDED_FACE},
        )
        boundary_utm.boundary.plot(ax=ax, color="#222222", linewidth=0.8, zorder=5)
        minx, miny, maxx, maxy = boundary_utm.total_bounds
        pad = 140
        ax.set_xlim(minx - pad, maxx + pad)
        ax.set_ylim(miny - pad, maxy + pad)
        ax.set_aspect("equal")
        ax.set_xticks([])
        ax.set_yticks([])
        ax.set_title(g.replace("_", " ").title(), fontsize=10)
        for spine in ax.spines.values():
            spine.set_visible(False)
    # North arrow on top-right map panel
    top_right = axes[2]
    xmin, xmax = top_right.get_xlim()
    ymin, ymax = top_right.get_ylim()
    add_north_arrow(top_right, xmax - 0.08 * (xmax - xmin), ymax - 0.10 * (ymax - ymin), size=70)
    # Dedicated colorbar column spanning both rows
    cax = fig.add_subplot(gs[:, 3])
    sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    cbar = fig.colorbar(sm, cax=cax)
    cbar.set_label("Minutes to nearest destination", fontsize=9)
    fig.suptitle("Walk time to nearest destination by group", fontsize=12, y=0.98)
    fig.savefig(out, dpi=150, bbox_inches="tight", facecolor="white", pad_inches=0.2)
    plt.close(fig)


def map04_coverage_bars(summary: dict, out: Path) -> None:
    cov = summary.get("coverage_analysis_ok") or summary.get("coverage_non_edge_snap_ok")
    labels = DEST_GROUPS
    values = [float(cov[g]["within_10_min"]) * 100 for g in labels]
    fig, ax = plt.subplots(figsize=(8.5, 5.2), dpi=150)
    y = np.arange(len(labels))
    bars = ax.barh(y, values, color="#457b9d", edgecolor="#1d3557", height=0.65)
    ax.set_yticks(y)
    ax.set_yticklabels([g.replace("_", " ").title() for g in labels])
    ax.set_xlabel("Share of analysis hexes within 10 min (%)")
    ax.set_xlim(0, 112)
    ax.set_title("10-minute walk coverage by destination group\n(analysis = area≥90% & snapped)")
    for bar, val in zip(bars, values):
        ax.text(val + 1.2, bar.get_y() + bar.get_height() / 2, f"{val:.1f}%", va="center", fontsize=8)
    ax.axvline(90, color="#adb5bd", linestyle="--", linewidth=0.8)
    save_map_figure(fig, out)


def map05_mismatch(hex_utm: gpd.GeoDataFrame, boundary_utm: gpd.GeoDataFrame, out: Path) -> None:
    fig, ax, side = make_map_with_side_panel()
    excluded = hex_utm[hex_utm["access_tier"] == "excluded"]
    analysis = hex_utm[hex_utm["access_tier"] != "excluded"]
    mismatch = hex_utm[hex_utm["mismatch_flag"] == True]  # noqa: E712
    if len(excluded):
        excluded.plot(ax=ax, color=EXCLUDED_FACE, edgecolor="white", linewidth=0.2, zorder=1)
    if len(analysis):
        analysis.plot(
            ax=ax,
            column="access_score",
            cmap="Greys",
            vmin=0,
            vmax=1,
            edgecolor="white",
            linewidth=0.15,
            alpha=0.85,
            zorder=2,
        )
    if len(mismatch):
        mismatch.plot(ax=ax, facecolor="none", edgecolor="#d62828", linewidth=1.6, zorder=4)
        mismatch.plot(ax=ax, color="#f77f00", alpha=0.45, edgecolor="#d62828", linewidth=1.2, zorder=3)
    style_map_frame(ax, boundary_utm, "Centrality–access mismatch (high BtA + weak destinations)")
    handles = [
        mpatches.Patch(facecolor="#f77f00", edgecolor="#d62828", label="Mismatch hex"),
        mpatches.Patch(facecolor="#bbbbbb", edgecolor="white", label="Access score (background)"),
    ]
    draw_side_legend(side, handles, title="Legend")
    save_map_figure(fig, out)


def main() -> None:
    for path in (ACCESS_HEX, ACCESS_SUMMARY, BOUNDARY, BETWEENNESS):
        if not path.is_file():
            raise SystemExit(f"Missing required input: {path}")

    OUT_MAPS.mkdir(parents=True, exist_ok=True)

    hexes = gpd.read_file(ACCESS_HEX)
    if hexes.crs is None:
        hexes = hexes.set_crs(4326)
    else:
        hexes = hexes.to_crs(4326)

    hexes["access_tier"] = hexes.apply(access_tier, axis=1)

    print("Joining mean BtA5000 per hex…")
    means = mean_bta_per_hex(hexes, BETWEENNESS)
    hexes["mean_BtA5000"] = hexes["hex_id"].map(means)

    if "analysis_ok" in hexes.columns:
        analysis = hexes[hexes["analysis_ok"].astype(bool)].copy()
    else:
        analysis = hexes[
            hexes["snap_ok"].astype(bool) & (hexes["area_ratio"].astype(float) >= 0.90)
        ].copy()
    bta_vals = analysis["mean_BtA5000"].dropna()
    if len(bta_vals) == 0:
        raise SystemExit("No mean_BtA5000 values for analysis hexes")
    q75 = float(bta_vals.quantile(0.75))
    hexes["mismatch_flag"] = False
    mask = (
        hexes["hex_id"].isin(analysis["hex_id"])
        & (hexes["mean_BtA5000"].notna())
        & (hexes["mean_BtA5000"] >= q75)
        & (hexes["access_score"].notna())
        & (hexes["access_score"] < 0.5)
    )
    hexes.loc[mask, "mismatch_flag"] = True

    write_geojson(OUT_CLASSIFIED, "access_hex_classified", hexes)
    print(f"Wrote {OUT_CLASSIFIED}")

    boundary = gpd.read_file(BOUNDARY)
    if boundary.crs is None:
        boundary = boundary.set_crs(4326)
    boundary_utm = boundary.to_crs(CRS_PLOT)
    hex_utm = hexes.to_crs(CRS_PLOT)

    with ACCESS_SUMMARY.open(encoding="utf-8") as f:
        summary3 = json.load(f)

    paths = {
        "map01_access_score": OUT_MAPS / "map01_access_score.png",
        "map02_access_tiers_deserts": OUT_MAPS / "map02_access_tiers_deserts.png",
        "map03_time_by_group": OUT_MAPS / "map03_time_by_group.png",
        "map04_coverage_10min": OUT_MAPS / "map04_coverage_10min.png",
        "map05_centrality_mismatch": OUT_MAPS / "map05_centrality_mismatch.png",
    }

    print("Rendering maps…")
    map01_access_score(hex_utm, boundary_utm, paths["map01_access_score"])
    map02_tiers(hex_utm, boundary_utm, paths["map02_access_tiers_deserts"])
    map03_time_panel(hex_utm, boundary_utm, paths["map03_time_by_group"])
    map04_coverage_bars(summary3, paths["map04_coverage_10min"])
    map05_mismatch(hex_utm, boundary_utm, paths["map05_centrality_mismatch"])

    tier_counts = hexes["access_tier"].value_counts().to_dict()
    tier_counts = {k: int(v) for k, v in tier_counts.items()}
    for t in ("high", "medium", "low", "excluded"):
        tier_counts.setdefault(t, 0)

    maps_summary = {
        "hex_count": int(len(hexes)),
        "analysis_hex_count": int(len(analysis)),
        "analysis_definition": "area_ratio>=0.90 AND snap_ok=true",
        "tier_counts": tier_counts,
        "bta_q75": round(q75, 6),
        "mismatch_count": int(hexes["mismatch_flag"].sum()),
        "mismatch_definition": "analysis_ok AND mean_BtA5000 >= Q75 AND access_score < 0.5",
        "plot_crs": CRS_PLOT,
        "maps": {k: str(v.name) for k, v in paths.items()},
        "map_bytes": {k: v.stat().st_size for k, v in paths.items()},
    }
    summary_path = OUT_MAPS / "maps_summary.json"
    with summary_path.open("w", encoding="utf-8") as f:
        json.dump(maps_summary, f, indent=2)
        f.write("\n")

    print(f"Wrote {summary_path}")
    print(json.dumps({k: maps_summary[k] for k in ("tier_counts", "mismatch_count", "bta_q75")}, indent=2))
    for k, p in paths.items():
        print(f"  {p.name}: {p.stat().st_size} bytes")


if __name__ == "__main__":
    main()
