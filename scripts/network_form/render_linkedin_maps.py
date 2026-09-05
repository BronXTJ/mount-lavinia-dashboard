"""
Professional LinkedIn maps matching Network Form dashboard layers.

Rules:
- One thematic story per figure (no stacked competing overlays)
- Colours / weights from src/constants/networkForm.js
- Carto Dark basemap (same family as dashboard default)
- Legend outside the map frame (no on-map label clutter)
"""
from __future__ import annotations

import json
from pathlib import Path

import contextily as cx
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.collections import LineCollection, PatchCollection
from matplotlib.patches import Polygon as MplPolygon, Rectangle
from shapely.ops import unary_union
from shapely.geometry import shape
from pyproj import Transformer
from shapely.ops import transform as shp_transform

ROOT = Path(__file__).resolve().parents[2]
NF = ROOT / "public" / "data" / "network-form"
OUT = ROOT / "linkedin_network_form_walk" / "maps"
OUT.mkdir(parents=True, exist_ok=True)

# --- Dashboard constants (networkForm.js) ---
ROAD_COLOR = "#e2e8f0"
ROAD_WEIGHT = 1.15  # visual weight at export scale
GN_COLOR = "#00b4d8"
FOUR_WAY = "#ef4444"
THREE_WAY = "#3b82f6"
CULDESAC = "#f59e0b"

WALK_TIER = {
    "high": "#0d9488",
    "medium": "#fbbf24",
    "low": "#dc2626",
    "excluded": "#94a3b8",
}
HEX_COUNT_STOPS = [
    (1, "#fef3c7"),
    (2, "#fcd34d"),
    (3, "#f59e0b"),
    (10**9, "#b45309"),
]
FILL_OPACITY = 0.55

PANEL_BG = "#0f172a"
FIG_BG = "#020617"
INK = "#f1f5f9"
MUTED = "#94a3b8"
DPI = 220
# Web Mercator for contextily
EPSG = 3857


def load_fc(name: str):
    with (NF / name).open(encoding="utf-8") as f:
        return json.load(f)


def features(fc):
    return fc.get("features") or []


def geom(ft):
    g = ft.get("geometry")
    if not g:
        return None
    try:
        s = shape(g)
        return None if s.is_empty else s
    except Exception:
        return None


_TRANSFORMER = Transformer.from_crs("EPSG:4326", f"EPSG:{EPSG}", always_xy=True)


def to_mercator(g):
    return shp_transform(_TRANSFORMER.transform, g)


def study_bounds_mercator(gn_fc, pad_m=180):
    geoms = [to_mercator(geom(ft)) for ft in features(gn_fc)]
    geoms = [g for g in geoms if g is not None]
    u = unary_union(geoms)
    minx, miny, maxx, maxy = u.bounds
    return minx - pad_m, miny - pad_m, maxx + pad_m, maxy + pad_m


def poly_patches(g_merc, facecolor, edgecolor, lw, alpha):
    out = []
    if g_merc.geom_type == "Polygon":
        polys = [g_merc]
    elif g_merc.geom_type == "MultiPolygon":
        polys = list(g_merc.geoms)
    else:
        return out
    for p in polys:
        x, y = p.exterior.xy
        out.append(
            MplPolygon(
                list(zip(x, y)),
                closed=True,
                facecolor=facecolor,
                edgecolor=edgecolor,
                linewidth=lw,
                alpha=alpha,
            )
        )
    return out


def line_segments(g_merc):
    if g_merc.geom_type == "LineString":
        return [list(g_merc.coords)]
    if g_merc.geom_type == "MultiLineString":
        return [list(ls.coords) for ls in g_merc.geoms]
    return []


def color_hex_count(n):
    try:
        c = float(n)
    except (TypeError, ValueError):
        return "#94a3b8"
    for mx, col in HEX_COUNT_STOPS:
        if c <= mx:
            return col
    return "#b45309"


def setup_figure():
    fig = plt.figure(figsize=(11.5, 12.2), dpi=DPI, facecolor=FIG_BG)
    # Map takes most of the canvas; legend band at bottom (no overlap)
    ax = fig.add_axes([0.04, 0.14, 0.92, 0.80])
    ax_leg = fig.add_axes([0.04, 0.02, 0.92, 0.10])
    ax_leg.set_facecolor(PANEL_BG)
    ax_leg.set_xticks([])
    ax_leg.set_yticks([])
    for s in ax_leg.spines.values():
        s.set_color("#1e293b")
    ax.set_facecolor("#0b1220")
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    return fig, ax, ax_leg


def finish(ax, bounds, title, subtitle, out_name, legend_fn):
    minx, miny, maxx, maxy = bounds
    ax.set_xlim(minx, maxx)
    ax.set_ylim(miny, maxy)
    ax.set_aspect("equal")
    try:
        cx.add_basemap(
            ax,
            source=cx.providers.CartoDB.DarkMatter,
            crs=f"EPSG:{EPSG}",
            attribution_size=5,
            zoom="auto",
        )
    except Exception as e:
        print("Basemap warning:", e)
    ax.set_title(title, color=INK, fontsize=14, fontweight="bold", loc="left", pad=12)
    ax.text(0.0, 1.012, subtitle, transform=ax.transAxes, color=MUTED, fontsize=8.5, va="bottom")
    legend_fn(ax.figure.axes[1])
    out = OUT / out_name
    ax.figure.savefig(out, dpi=DPI, facecolor=FIG_BG)
    plt.close(ax.figure)
    print(out)
    return out


def draw_roads(ax, roads_fc, alpha=0.9):
    segs = []
    for ft in features(roads_fc):
        g = geom(ft)
        if g is None:
            continue
        segs.extend(line_segments(to_mercator(g)))
    if segs:
        ax.add_collection(
            LineCollection(
                segs,
                colors=ROAD_COLOR,
                linewidths=ROAD_WEIGHT,
                alpha=alpha,
                zorder=3,
            )
        )


def draw_gn(ax, gn_fc, fill=True):
    fills = []
    outlines = []
    for ft in features(gn_fc):
        g = geom(ft)
        if g is None:
            continue
        gm = to_mercator(g)
        if fill:
            fills.extend(
                poly_patches(gm, facecolor=GN_COLOR, edgecolor="none", lw=0, alpha=0.08)
            )
        outlines.extend(
            poly_patches(gm, facecolor="none", edgecolor=GN_COLOR, lw=1.8, alpha=0.95)
        )
    if fills:
        ax.add_collection(PatchCollection(fills, match_original=True, zorder=4))
    if outlines:
        ax.add_collection(PatchCollection(outlines, match_original=True, zorder=4))


def legend_row(ax_leg, items, title):
    ax_leg.clear()
    ax_leg.set_facecolor(PANEL_BG)
    ax_leg.set_xlim(0, 1)
    ax_leg.set_ylim(0, 1)
    ax_leg.axis("off")
    ax_leg.text(0.01, 0.72, title, color=INK, fontsize=9, fontweight="600", va="center")
    n = len(items)
    for i, (kind, color, label) in enumerate(items):
        x = 0.02 + i * (0.96 / max(n, 1))
        if kind == "line":
            ax_leg.plot([x, x + 0.04], [0.32, 0.32], color=color, lw=2.5, solid_capstyle="round")
        elif kind == "square":
            ax_leg.add_patch(Rectangle((x, 0.22), 0.028, 0.028, facecolor=color, edgecolor="#0f172a", lw=0.4))
        elif kind == "tri":
            ax_leg.plot(x + 0.014, 0.34, marker="^", color=color, markersize=9)
        elif kind == "sq":
            ax_leg.plot(x + 0.014, 0.34, marker="s", color=color, markersize=8)
        elif kind == "cir":
            ax_leg.plot(x + 0.014, 0.34, marker="o", color=color, markersize=8)
        else:
            ax_leg.add_patch(Rectangle((x, 0.22), 0.028, 0.028, facecolor=color, edgecolor="#0f172a", lw=0.4, alpha=FILL_OPACITY + 0.2))
        ax_leg.text(x + 0.038, 0.32, label, color=MUTED, fontsize=8, va="center")
    ax_leg.text(
        0.01,
        0.08,
        "Mount Lavinia Urban Analytics  ·  Network Form  ·  WGS 84 / Web Mercator display  ·  Layer colours match the dashboard",
        color="#64748b",
        fontsize=6.5,
        va="center",
    )


def map_01_street_pathways():
    gn = load_fc("gn5_divisions.geojson")
    roads = load_fc("roads_streets.geojson")
    bounds = study_bounds_mercator(gn)
    fig, ax, ax_leg = setup_figure()
    draw_roads(ax, roads, alpha=0.92)
    draw_gn(ax, gn, fill=True)

    def leg(a):
        legend_row(
            a,
            [
                ("line", ROAD_COLOR, "Street pathways"),
                ("square", GN_COLOR, "GN boundary"),
            ],
            "Layer: Street Pathways + GN Boundaries",
        )

    finish(
        ax,
        bounds,
        "Street pathways and GN boundaries",
        "Network Form context layers  ·  primary study area (five GN divisions)",
        "01_street_pathways_gn.png",
        leg,
    )


def map_02_junction_typology():
    gn = load_fc("gn5_divisions.geojson")
    roads = load_fc("roads_streets.geojson")
    junc = load_fc("junctions_classified.geojson")
    bounds = study_bounds_mercator(gn)
    fig, ax, ax_leg = setup_figure()
    draw_roads(ax, roads, alpha=0.55)
    draw_gn(ax, gn, fill=False)

    buckets = {"four_way": [], "three_way": [], "culdesac": []}
    for ft in features(junc):
        p = ft.get("properties") or {}
        jt = p.get("jtype")
        if jt not in buckets:
            continue
        g = geom(ft)
        if g is None or g.geom_type != "Point":
            continue
        gm = to_mercator(g)
        buckets[jt].append((gm.x, gm.y))

    # Draw in order: 3-way (many), then 4-way, then cul-de-sac on top
    if buckets["three_way"]:
        xs, ys = zip(*buckets["three_way"])
        ax.scatter(xs, ys, s=9, c=THREE_WAY, marker="s", linewidths=0, zorder=5, alpha=0.9)
    if buckets["four_way"]:
        xs, ys = zip(*buckets["four_way"])
        ax.scatter(xs, ys, s=14, c=FOUR_WAY, marker="^", linewidths=0, zorder=6, alpha=0.95)
    if buckets["culdesac"]:
        xs, ys = zip(*buckets["culdesac"])
        ax.scatter(xs, ys, s=12, c=CULDESAC, marker="o", linewidths=0, zorder=7, alpha=0.95)

    def leg(a):
        legend_row(
            a,
            [
                ("tri", FOUR_WAY, "4-way"),
                ("sq", THREE_WAY, "3-way"),
                ("cir", CULDESAC, "Cul-de-sac"),
                ("line", ROAD_COLOR, "Streets"),
            ],
            "Layer: Junction typology (dashboard symbols)",
        )

    finish(
        ax,
        bounds,
        "Junction typology",
        "4-way · 3-way · cul-de-sac  ·  same colours as Network Form map FAB",
        "02_junction_typology.png",
        leg,
    )


def map_03_walk_hex_only():
    """Cul-de-sac × Walk Access — hex choropleth only (no point overlay)."""
    gn = load_fc("gn5_divisions.geojson")
    hexes = load_fc("culdesac_hex_walk.geojson")
    bounds = study_bounds_mercator(gn)
    fig, ax, ax_leg = setup_figure()
    draw_gn(ax, gn, fill=False)

    patches = []
    for ft in features(hexes):
        p = ft.get("properties") or {}
        tier = str(p.get("access_tier") or "excluded").lower()
        color = WALK_TIER.get(tier, "#64748b")
        g = geom(ft)
        if g is None:
            continue
        patches.extend(
            poly_patches(
                to_mercator(g),
                facecolor=color,
                edgecolor="#0f172a",
                lw=0.35,
                alpha=FILL_OPACITY,
            )
        )
    if patches:
        ax.add_collection(PatchCollection(patches, match_original=True, zorder=5))

    def leg(a):
        legend_row(
            a,
            [
                ("hex", WALK_TIER["high"], "High"),
                ("hex", WALK_TIER["medium"], "Medium"),
                ("hex", WALK_TIER["low"], "Low (desert)"),
                ("hex", WALK_TIER["excluded"], "Excluded"),
            ],
            "Layer: Cul-de-sac × Walk Access (100 m hex fill only)",
        )

    finish(
        ax,
        bounds,
        "Cul-de-sac × Walk Access",
        "Destination walk-access tier by 100 m cell  ·  fill opacity 0.55 (dashboard)",
        "03_culdesac_walk_access_hex.png",
        leg,
    )


def map_04_hex_density_only():
    gn = load_fc("gn5_divisions.geojson")
    hexes = load_fc("culdesac_hex_counts.geojson")
    bounds = study_bounds_mercator(gn)
    fig, ax, ax_leg = setup_figure()
    draw_gn(ax, gn, fill=False)

    patches = []
    for ft in features(hexes):
        p = ft.get("properties") or {}
        n = p.get("culdesac_n")
        if n is None:
            n = p.get("n")
        color = color_hex_count(n)
        g = geom(ft)
        if g is None:
            continue
        patches.extend(
            poly_patches(
                to_mercator(g),
                facecolor=color,
                edgecolor="#0f172a",
                lw=0.35,
                alpha=FILL_OPACITY,
            )
        )
    if patches:
        ax.add_collection(PatchCollection(patches, match_original=True, zorder=5))

    def leg(a):
        legend_row(
            a,
            [
                ("hex", "#fef3c7", "1"),
                ("hex", "#fcd34d", "2"),
                ("hex", "#f59e0b", "3"),
                ("hex", "#b45309", "4+"),
            ],
            "Layer: Cul-de-sac hex density (count per 100 m cell)",
        )

    finish(
        ax,
        bounds,
        "Cul-de-sac hex density",
        "Count of primary cul-de-sacs per 100 m cell  ·  dashboard stepped ramp",
        "04_culdesac_hex_density.png",
        leg,
    )


def main():
    map_01_street_pathways()
    map_02_junction_typology()
    map_03_walk_hex_only()
    map_04_hex_density_only()


if __name__ == "__main__":
    main()
