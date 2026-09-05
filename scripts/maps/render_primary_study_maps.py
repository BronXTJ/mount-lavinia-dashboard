#!/usr/bin/env python3
"""Print-ready primary-study-area maps (300 dpi PNG).

One theme per figure. Legend lives in a dedicated right-hand panel so titles,
labels, and the scale bar never sit on the geography.

Usage (from repo root):
  python scripts/maps/render_primary_study_maps.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import pandas as pd
from matplotlib.lines import Line2D
from matplotlib import patheffects as pe
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "outputs" / "primary_study_maps"
DATA = ROOT / "public" / "data"

CRS_PLOT = "EPSG:32644"
CRS_WGS84 = "EPSG:4326"
DPI = 300

HEX_FULL_AREA_M2 = 8660.254
HEX_FULL_RATIO = 0.90
HEX_SCRAP_RATIO = 0.50

BOUNDARY_COLOR = "#dc2626"
INK = "#1a1a1a"
MUTED = "#4b5563"
EDGE_HEX = "#94a3b8"
EXCLUDED_EDGE = "#94a3b8"
PARTIAL_ALPHA = 0.45
FULL_ALPHA = 0.78
MAP_PAD_LEFT = 130.0
MAP_PAD_RIGHT = 250.0
MAP_PAD_BOTTOM = 130.0
MAP_PAD_TOP = 140.0

UMI_HIGH = 0.35
UMI_MED = 0.15
assert UMI_MED == 0.15 and UMI_HIGH == 0.35

DENSITY_RAMPS = {
    "fsi": ["#000004", "#3b0f70", "#8c2981", "#de4968", "#fe9f6d", "#fcfdbf"],
    "gsi": ["#0b0405", "#357ba2", "#3bbcc0", "#9ce5bf", "#def5e5"],
    "osr": ["#00224e", "#1a4673", "#4a6c6f", "#8a8659", "#c4a647", "#fee838"],
    "density": ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
}
ACCESS_RAMP = ["#f0f9ff", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0369a1"]
WALK_RAMP = ["#f0fdfa", "#99f6e4", "#2dd4bf", "#0d9488", "#115e59", "#042f2e"]

UMI_TIERS = [
    ("high", "Highly Matured", "> 0.35", "#b45309"),
    ("medium", "Moderately Matured", "0.15 – 0.35", "#fbbf24"),
    ("low", "Early Stage / Emerging", "< 0.15", "#94a3b8"),
]

LAND_USE_COLORS = {
    "Residential": "#fa9f00",
    "Commercial": "#ec4899",
    "Industrial": "#fb7185",
    "Institutional": "#a78bfa",
    "Cultural": "#eab308",
    "Public Space": "#22c55e",
    "Transport": "#6b7280",
    "Agriculture": "#65a30d",
    "Coastal area": "#0ea5e9",
    "Water": "#0369a1",
    "Barren Land": "#cbd5e1",
    "Under Construction": "#c026d3",
}
LAND_USE_FALLBACK = "#64748b"
LAND_USE_BY_LOWER = {k.lower(): (k, v) for k, v in LAND_USE_COLORS.items()}

GN_ORDER = ["Mount Lavinia", "Kawdana West", "Watarappala", "Wathumulla", "Wedikanda"]
GN_COLORS = {
    "Mount Lavinia": "#7eb8da",
    "Kawdana West": "#88c9a1",
    "Watarappala": "#f0c987",
    "Wathumulla": "#e8a0a0",
    "Wedikanda": "#c4a8d8",
}
LABEL_OFFSET_M = {
    "Mount Lavinia": (0.0, 0.0),
    "Kawdana West": (0.0, 40.0),
    "Watarappala": (0.0, -20.0),
    "Wathumulla": (0.0, 0.0),
    "Wedikanda": (0.0, 0.0),
}

JTYPE_STYLE = {
    "four_way": {"label": "4-way", "color": "#ef4444", "marker": "^", "size": 38},
    "three_way": {"label": "3-way", "color": "#3b82f6", "marker": "s", "size": 28},
    "culdesac": {"label": "Cul-de-sac", "color": "#f59e0b", "marker": "o", "size": 28},
}

CREDIT = "Mount Lavinia primary study area (five GN divisions)  ·  CRS: EPSG:32644 (UTM zone 44N)"

QA_ISSUES: list[str] = []
QA_ROWS: list[dict] = []


def fail(msg: str) -> None:
    QA_ISSUES.append(msg)
    print(f"QA FAIL: {msg}", file=sys.stderr)


def read_geo(path: Path) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(path)
    if gdf.crs is None:
        gdf = gdf.set_crs(CRS_WGS84)
    return gdf.to_crs(CRS_PLOT)


def finite_series(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s, errors="coerce")


def format_class_edge(v: float) -> str:
    if not np.isfinite(v):
        return "—"
    av = abs(v)
    if av >= 100:
        return f"{v:.0f}"
    if av >= 10:
        return f"{v:.1f}"
    return f"{v:.2f}"


def percentile_sorted(sorted_vals: np.ndarray, p: float) -> float:
    if sorted_vals.size == 1:
        return float(sorted_vals[0])
    rank = (p / 100.0) * (sorted_vals.size - 1)
    lo = int(np.floor(rank))
    hi = int(np.ceil(rank))
    if lo == hi:
        return float(sorted_vals[lo])
    t = rank - lo
    return float(sorted_vals[lo] * (1 - t) + sorted_vals[hi] * t)


def build_equal_interval_breaks(values: np.ndarray, n: int) -> np.ndarray | None:
    vals = np.asarray(values, dtype=float)
    vals = vals[np.isfinite(vals)]
    if vals.size == 0 or n < 1:
        return None
    vals = np.sort(vals)
    vmin = float(vals[0])
    vmax = float(vals[-1])
    if vmax == vmin:
        out = np.full(n + 1, vmax, dtype=float)
        out[0] = vmin
        return out
    p98 = percentile_sorted(vals, 98)
    high = max(vmin, p98)
    width = (high - vmin) or 1.0
    width = width / n
    breaks = [vmin]
    for i in range(1, n):
        breaks.append(vmin + i * width)
    breaks.append(vmax)
    return np.asarray(breaks, dtype=float)


def class_index(value: float, breaks: np.ndarray, n_classes: int) -> int:
    if not np.isfinite(value) or breaks is None or n_classes < 1:
        return -1
    for i in range(n_classes - 1):
        if value <= breaks[i + 1]:
            return i
    return n_classes - 1


def build_metric_classes(values: np.ndarray, colors: list[str]) -> dict:
    palette = list(colors)
    finite = np.asarray(values, dtype=float)
    finite = finite[np.isfinite(finite)]
    breaks = build_equal_interval_breaks(finite, len(palette))
    if breaks is None:
        return {"breaks": None, "colors": palette, "bins": []}
    bins = []
    for i, color in enumerate(palette):
        lo, hi = float(breaks[i]), float(breaks[i + 1])
        bins.append(
            {
                "index": i,
                "color": color,
                "from": lo,
                "to": hi,
                "label": f"{format_class_edge(lo)} – {format_class_edge(hi)}",
                "count": 0,
            }
        )
    for v in finite:
        idx = class_index(float(v), breaks, len(palette))
        if idx >= 0:
            bins[idx]["count"] += 1
    return {"breaks": breaks, "colors": palette, "bins": bins}


def color_for_class(value: float, classes: dict) -> str | None:
    if not np.isfinite(value) or classes.get("breaks") is None:
        return None
    idx = class_index(value, classes["breaks"], len(classes["colors"]))
    if idx < 0:
        return None
    return classes["colors"][idx]


def hex_ratio(area) -> float:
    a = pd.to_numeric(area, errors="coerce")
    if not np.isfinite(a) or a <= 0:
        return 0.0
    return float(a) / HEX_FULL_AREA_M2


def grade_row(area, osr=None, density_invalid: bool = False) -> str:
    a = pd.to_numeric(area, errors="coerce")
    if density_invalid:
        o = pd.to_numeric(osr, errors="coerce")
        if np.isfinite(o) and o < 0:
            return "invalid"
        if not np.isfinite(a) or a <= 0:
            return "invalid"
    ratio = hex_ratio(a)
    if ratio >= HEX_FULL_RATIO:
        return "full"
    if ratio >= HEX_SCRAP_RATIO:
        return "partial"
    if not np.isfinite(a) or a <= 0:
        return "invalid"
    return "scrap"


def classify_umi_tier(v) -> str:
    x = pd.to_numeric(v, errors="coerce")
    if not np.isfinite(x):
        return "low"
    if x > UMI_HIGH:
        return "high"
    if x >= UMI_MED:
        return "medium"
    return "low"


def land_use_lookup(raw) -> tuple[str, str]:
    if raw is None or (isinstance(raw, float) and not np.isfinite(raw)):
        return "Unclassified", LAND_USE_FALLBACK
    key = str(raw).strip()
    if not key:
        return "Unclassified", LAND_USE_FALLBACK
    hit = LAND_USE_BY_LOWER.get(key.lower())
    if hit:
        return hit
    return "Unclassified", LAND_USE_FALLBACK


def study_edge_anchors(boundary: gpd.GeoDataFrame) -> dict:
    """Points just outside the real geometry (not the empty bbox corner)."""
    from shapely.geometry import box

    geom = unary_union(boundary.geometry)
    minx, miny, maxx, maxy = geom.bounds
    h = maxy - miny
    south = geom.intersection(box(minx, miny, maxx, miny + 0.32 * h))
    north = geom.intersection(box(minx, miny + 0.62 * h, maxx, maxy))
    sx0, sy0, sx1, sy1 = (south.bounds if not south.is_empty else (minx, miny, maxx, miny + 0.3 * h))
    nx0, ny0, nx1, ny1 = (north.bounds if not north.is_empty else (minx, maxy - 0.3 * h, maxx, maxy))
    return {
        "legend_xy": (float(sx1 + 12.0), float((sy0 + sy1) / 2.0)),
        "arrow_xy": (float(maxx + 40.0), float(maxy - 120.0)),
        "scale_xy": (float(minx + 18.0), float(miny - 90.0)),
        "bounds": (float(minx), float(miny), float(maxx), float(maxy)),
    }


def add_north_arrow(ax, x: float, y: float, size: float = 240.0) -> None:
    """Traditional two-tone compass rose (black/white spear + star)."""
    s = size
    z = 26
    kw = dict(closed=True, linewidth=0.7, edgecolor=INK, zorder=z, clip_on=False)

    # Long north / short south spear
    tip = (x, y + 0.78 * s)
    waist = (x, y)
    nl, nr = (x - 0.22 * s, y), (x + 0.22 * s, y)
    stip = (x, y - 0.40 * s)
    sl, sr = (x - 0.13 * s, y), (x + 0.13 * s, y)
    ax.add_patch(mpatches.Polygon([tip, waist, nl], facecolor=INK, **kw))
    ax.add_patch(mpatches.Polygon([tip, nr, waist], facecolor="#ffffff", **kw))
    ax.add_patch(mpatches.Polygon([stip, waist, sl], facecolor="#ffffff", **kw))
    ax.add_patch(mpatches.Polygon([stip, sr, waist], facecolor=INK, **kw))

    # East–west crossbar
    ew = 0.20 * s
    ax.plot([x - ew, x + ew], [y, y], color=INK, linewidth=1.1, solid_capstyle="butt", zorder=z + 1, clip_on=False)
    for px, lab, ha in ((x + ew + 0.04 * s, "E", "left"), (x - ew - 0.04 * s, "W", "right")):
        ax.text(px, y, lab, ha=ha, va="center", fontsize=6.5, fontweight="bold", color=INK, zorder=z + 3, clip_on=False)

    inn = 0.05 * s
    star = [
        (x, y + 0.18 * s),
        (x + inn, y + inn),
        (x + 0.18 * s, y),
        (x + inn, y - inn),
        (x, y - 0.18 * s),
        (x - inn, y - inn),
        (x - 0.18 * s, y),
        (x - inn, y + inn),
    ]
    ax.add_patch(mpatches.Polygon(star, facecolor=INK, edgecolor=INK, linewidth=0.35, zorder=z + 2, clip_on=False))
    ax.add_patch(
        mpatches.Circle((x, y), radius=0.032 * s, facecolor="#ffffff", edgecolor=INK, linewidth=0.5, zorder=z + 3, clip_on=False)
    )
    ax.text(
        x,
        y + 0.86 * s,
        "N",
        ha="center",
        va="bottom",
        fontsize=11,
        fontweight="bold",
        color=INK,
        zorder=z + 4,
        clip_on=False,
    )


def add_scale_bar(ax, x0: float, y0: float, length_m: float = 500.0) -> None:
    height_m = 28.0
    seg = length_m / 2.0
    ax.add_patch(
        mpatches.Rectangle((x0, y0), seg, height_m, facecolor=INK, edgecolor=INK, zorder=20, clip_on=False)
    )
    ax.add_patch(
        mpatches.Rectangle(
            (x0 + seg, y0),
            seg,
            height_m,
            facecolor="#ffffff",
            edgecolor=INK,
            linewidth=0.8,
            zorder=20,
            clip_on=False,
        )
    )
    label_y = y0 - 38.0
    for xpos, txt in ((x0, "0"), (x0 + seg, f"{int(seg)}"), (x0 + length_m, f"{int(length_m)} m")):
        ax.text(xpos, label_y, txt, ha="center", va="top", fontsize=7, color=INK, clip_on=False, zorder=20)


def new_figure(title: str, subtitle: str):
    fig = plt.figure(figsize=(8.2, 12.0), facecolor="white")
    gs = fig.add_gridspec(
        nrows=3,
        ncols=1,
        height_ratios=[0.065, 0.88, 0.055],
        left=0.04,
        right=0.975,
        top=0.978,
        bottom=0.026,
        hspace=0.012,
    )
    ax_title = fig.add_subplot(gs[0, 0])
    ax = fig.add_subplot(gs[1, 0])
    ax_foot = fig.add_subplot(gs[2, 0])
    for extra in (ax_title, ax_foot):
        extra.set_axis_off()
    ax_title.set_xlim(0, 1)
    ax_title.set_ylim(0, 1)
    ax_foot.set_xlim(0, 1)
    ax_foot.set_ylim(0, 1)

    ax_title.text(0.0, 0.70, title, ha="left", va="center", fontsize=15, fontweight="bold", color=INK)
    ax_title.text(0.0, 0.18, subtitle, ha="left", va="center", fontsize=8.5, color=MUTED)
    ax_foot.text(0.0, 0.50, CREDIT, ha="left", va="center", fontsize=7.2, color=MUTED)

    ax.set_facecolor("#f7f8fa")
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(True)
        spine.set_color("#334155")
        spine.set_linewidth(0.9)
    return fig, ax


def frame_map(ax, boundary: gpd.GeoDataFrame) -> None:
    anchors = study_edge_anchors(boundary)
    minx, miny, maxx, maxy = anchors["bounds"]
    ax.set_xlim(minx - MAP_PAD_LEFT, maxx + MAP_PAD_RIGHT)
    ax.set_ylim(miny - MAP_PAD_BOTTOM, maxy + MAP_PAD_TOP)
    ax.set_aspect("equal", adjustable="box")
    ax_x, ax_y = anchors["arrow_xy"]
    add_north_arrow(ax, x=ax_x, y=ax_y, size=280.0)
    sx, sy = anchors["scale_xy"]
    add_scale_bar(ax, x0=sx, y0=sy)


def plot_boundary(ax, boundary: gpd.GeoDataFrame, z: int = 8) -> None:
    boundary.boundary.plot(ax=ax, color=BOUNDARY_COLOR, linewidth=1.55, zorder=z)


def draw_side_legend(ax, handles, legend_title: str, map_title_metric: str, ncol: int = 1) -> None:
    if legend_title.lower() not in map_title_metric.lower() and map_title_metric.lower() not in legend_title.lower():
        # Allow known pairings that use a slightly longer map title.
        allowed = {
            ("fsi", "floor space index"),
            ("gsi", "ground space index"),
            ("osr", "open space ratio"),
            ("density value", "density value"),
            ("land use", "land use"),
            ("accessibility score", "accessibility score"),
            ("urban maturation", "urban maturation"),
            ("walk accessibility", "walk accessibility"),
            ("junction typology", "network form"),
            ("grama niladhari", "primary study area"),
        }
        ok = any(a in legend_title.lower() and b in map_title_metric.lower() for a, b in allowed) or any(
            b in legend_title.lower() and a in map_title_metric.lower() for a, b in allowed
        )
        if not ok:
            fail(f"Legend title '{legend_title}' does not match map title metric '{map_title_metric}'")
    n_items = len(handles)
    fontsize = 6.6 if n_items >= 10 else 7.4
    title_fs = 8.0 if n_items >= 10 else 8.6
    loc = "lower right"
    leg = ax.legend(
        handles=handles,
        title=legend_title,
        loc=loc,
        bbox_to_anchor=(0.86, 0.028),
        bbox_transform=ax.transAxes,
        borderaxespad=0.0,
        fontsize=fontsize,
        title_fontsize=title_fs,
        frameon=True,
        fancybox=False,
        edgecolor="#94a3b8",
        facecolor="#ffffff",
        framealpha=0.96,
        labelspacing=0.38 if n_items >= 10 else 0.46,
        handlelength=1.35,
        handletextpad=0.5,
        borderpad=0.55,
        ncol=ncol,
    )
    leg.set_zorder(30)
    leg.set_clip_on(False)
    leg.get_title().set_fontweight("bold")
    leg.get_title().set_color(INK)
    for txt in leg.get_texts():
        txt.set_color(INK)


def class_legend_handles(classes: dict, extra: list | None = None) -> list:
    handles = [
        mpatches.Patch(facecolor=b["color"], edgecolor="#64748b", linewidth=0.5, label=b["label"])
        for b in classes["bins"]
    ]
    if extra:
        handles.extend(extra)
    return handles


def completeness_handles(include_partial: bool = True) -> list:
    out = []
    if include_partial:
        out.append(
            mpatches.Patch(
                facecolor="#94a3b8",
                edgecolor="#64748b",
                linewidth=0.6,
                alpha=PARTIAL_ALPHA,
                linestyle="--",
                label="Partial (50–90% complete)",
            )
        )
    out.append(
        mpatches.Patch(
            facecolor="none",
            edgecolor=EXCLUDED_EDGE,
            linewidth=1.1,
            label="Excluded (<50% complete or invalid)",
        )
    )
    return out


def save_fig(fig, name: str) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    fig.savefig(path, dpi=DPI, facecolor="white", edgecolor="none")
    plt.close(fig)
    print(f"  wrote {path}")
    return path


def plot_hex_groups(ax, gdf: gpd.GeoDataFrame, color_col: str = "_fill") -> tuple[int, int, int]:
    """Plot full (solid), partial (dimmed dashed), excluded (outline). Returns counts."""
    n_full = n_partial = n_excl = 0
    if "grade" not in gdf.columns:
        raise ValueError("hex GeoDataFrame needs a grade column")

    excl = gdf[gdf["grade"].isin(["scrap", "invalid"]) | gdf[color_col].isna()]
    shown = gdf[gdf[color_col].notna() & gdf["grade"].isin(["full", "partial"])]
    if len(excl):
        excl.plot(ax=ax, facecolor="none", edgecolor=EXCLUDED_EDGE, linewidth=0.4, zorder=2)
        n_excl = len(excl)
    full = shown[shown["grade"] == "full"]
    partial = shown[shown["grade"] == "partial"]
    if len(full):
        for color, sub in full.groupby(color_col, sort=False):
            sub.plot(
                ax=ax,
                facecolor=color,
                edgecolor=EDGE_HEX,
                linewidth=0.28,
                alpha=FULL_ALPHA,
                zorder=3,
            )
        n_full = len(full)
    if len(partial):
        for color, sub in partial.groupby(color_col, sort=False):
            sub.plot(
                ax=ax,
                facecolor=color,
                edgecolor=EDGE_HEX,
                linewidth=0.55,
                alpha=PARTIAL_ALPHA,
                linestyle="--",
                zorder=4,
            )
        n_partial = len(partial)
    return n_full, n_partial, n_excl


def qa_class_coverage(name: str, values: np.ndarray, classes: dict) -> None:
    finite = np.asarray(values, dtype=float)
    finite = finite[np.isfinite(finite)]
    if finite.size == 0 or classes.get("breaks") is None:
        fail(f"{name}: no class breaks")
        return
    vmin, vmax = float(finite.min()), float(finite.max())
    b0, b1 = float(classes["breaks"][0]), float(classes["breaks"][-1])
    if abs(b0 - vmin) > 1e-6 or abs(b1 - vmax) > 1e-6:
        fail(f"{name}: class range {b0:g}–{b1:g} does not cover analysis min/max {vmin:g}–{vmax:g}")
    QA_ROWS.append(
        {
            "map": name,
            "n_analysis": int(finite.size),
            "min": vmin,
            "max": vmax,
            "classes": len(classes["bins"]),
        }
    )


def join_hex_area(target: gpd.GeoDataFrame, grid: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    out = target.copy()
    if "Hex_area" in out.columns and finite_series(out["Hex_area"]).fillna(0).gt(0).any():
        missing = ~finite_series(out["Hex_area"]).gt(0)
        if not missing.any():
            return out
    area_by_id = grid.set_index("id")["Hex_area"]
    if "id" not in out.columns:
        fail("maturation hex missing id for Hex_area join")
        return out
    joined = out["id"].map(area_by_id)
    if "Hex_area" not in out.columns:
        out["Hex_area"] = joined
    else:
        current = finite_series(out["Hex_area"])
        out["Hex_area"] = current.where(current.gt(0), joined)
    return out


def prepare_density(hex_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    out = hex_gdf.copy()
    out["Hex_area"] = finite_series(out["Hex_area"])
    out["OSR"] = finite_series(out.get("OSR"))
    out["grade"] = [
        grade_row(a, o, density_invalid=True) for a, o in zip(out["Hex_area"], out["OSR"])
    ]
    return out


def analysis_mask(gdf: gpd.GeoDataFrame) -> pd.Series:
    return gdf["grade"] == "full"


# ---------------------------------------------------------------------------
# Maps
# ---------------------------------------------------------------------------


def map_boundary(gn: gpd.GeoDataFrame, boundary: gpd.GeoDataFrame, roads: gpd.GeoDataFrame) -> None:
    title = "Primary Study Area Boundary"
    fig, ax = new_figure(
        title,
        "Five Grama Niladhari divisions, Ratmalana DSD, Mount Lavinia",
    )
    if len(roads):
        clip = unary_union(boundary.geometry).buffer(80)
        roads_c = roads[roads.intersects(clip)]
        if len(roads_c):
            roads_c.plot(ax=ax, color="#c4c9ce", linewidth=0.35, zorder=1)

    gn = gn.copy()
    gn["gn_name"] = gn["ADM4_EN"].astype(str).str.strip()
    missing = [n for n in GN_ORDER if n not in set(gn["gn_name"])]
    extra = [n for n in set(gn["gn_name"]) if n not in GN_ORDER]
    if missing:
        fail(f"Boundary map missing GN names: {missing}")
    if extra:
        fail(f"Boundary map unexpected GN names: {extra}")

    for _, row in gn.iterrows():
        gpd.GeoSeries([row.geometry], crs=gn.crs).plot(
            ax=ax,
            facecolor=GN_COLORS.get(row["gn_name"], "#cccccc"),
            edgecolor="#2c3e50",
            linewidth=1.05,
            alpha=0.78,
            zorder=3,
        )
    boundary.boundary.plot(ax=ax, color=BOUNDARY_COLOR, linewidth=2.15, zorder=5)

    halo = [pe.withStroke(linewidth=3.4, foreground="white")]
    for _, row in gn.iterrows():
        name = row["gn_name"]
        pt = row.geometry.representative_point()
        dx, dy = LABEL_OFFSET_M.get(name, (0.0, 0.0))
        ax.text(
            pt.x + dx,
            pt.y + dy,
            name,
            ha="center",
            va="center",
            fontsize=9.2,
            fontweight="bold",
            color=INK,
            zorder=12,
            path_effects=halo,
            clip_on=True,
        )

    frame_map(ax, boundary)
    handles = [
        mpatches.Patch(facecolor=GN_COLORS[n], edgecolor="#2c3e50", linewidth=0.8, label=n) for n in GN_ORDER
    ]
    handles.append(mpatches.Patch(facecolor="none", edgecolor=BOUNDARY_COLOR, linewidth=1.8, label="Primary study area boundary"))
    draw_side_legend(ax, handles, "Grama Niladhari divisions", title)
    save_fig(fig, "01_primary_study_area_boundary.png")
    QA_ROWS.append({"map": "01_boundary", "n_analysis": len(gn), "min": None, "max": None, "classes": 5})


def map_hex_metric(
    hex_gdf: gpd.GeoDataFrame,
    boundary: gpd.GeoDataFrame,
    *,
    filename: str,
    title: str,
    subtitle: str,
    legend_title: str,
    column: str,
    colors: list[str],
    density_mode: bool,
) -> None:
    gdf = hex_gdf.copy()
    gdf[column] = finite_series(gdf[column])
    if density_mode:
        gdf = prepare_density(gdf) if "grade" not in gdf.columns else gdf
        if column != "OSR":
            # still honour negative OSR / missing area as globally invalid
            gdf["grade"] = [
                grade_row(a, o, density_invalid=True)
                for a, o in zip(gdf["Hex_area"], finite_series(gdf.get("OSR")))
            ]
    stats = gdf[analysis_mask(gdf) & gdf[column].notna() & (gdf[column] >= 0)]
    values = stats[column].to_numpy(dtype=float)
    classes = build_metric_classes(values, colors)
    qa_class_coverage(title, values, classes)

    fills = []
    for _, row in gdf.iterrows():
        v = row[column]
        if row["grade"] in ("scrap", "invalid"):
            fills.append(np.nan)
            continue
        if not np.isfinite(v) or v < 0:
            fills.append(np.nan)
            continue
        fills.append(color_for_class(float(v), classes))
    gdf["_fill"] = fills

    fig, ax = new_figure(title, subtitle)
    plot_hex_groups(ax, gdf)
    plot_boundary(ax, boundary)
    frame_map(ax, boundary)
    extra = completeness_handles(include_partial=True)
    draw_side_legend(ax, class_legend_handles(classes, extra), legend_title, title)
    save_fig(fig, filename)


def map_land_use(landuse: gpd.GeoDataFrame, boundary: gpd.GeoDataFrame) -> None:
    title = "Land Use"
    gdf = landuse.copy()
    labels_colors = [land_use_lookup(v) for v in gdf["Main_C"]]
    gdf["_label"] = [p[0] for p in labels_colors]
    gdf["_fill"] = [p[1] for p in labels_colors]

    present = list(dict.fromkeys(gdf["_label"].tolist()))
    present_canonical = [k for k in LAND_USE_COLORS if k in present]
    if "Unclassified" in present:
        present_canonical.append("Unclassified")

    data_classes = set(str(v).strip() for v in gdf["Main_C"].dropna().unique())
    for raw in data_classes:
        label, _ = land_use_lookup(raw)
        if label not in present_canonical and label != "Unclassified":
            fail(f"Land use Main_C '{raw}' missing from legend")
        if label == "Unclassified" and "Unclassified" not in present_canonical:
            fail(f"Land use Main_C '{raw}' is unclassified and omitted from legend")

    fig, ax = new_figure(
        title,
        "Primary study area  ·  Main_C categories (dashboard palette)",
    )
    clip = unary_union(boundary.geometry)
    try:
        gdf = gpd.clip(gdf, clip)
    except Exception:
        gdf = gdf[gdf.intersects(clip)].copy()
    for color, sub in gdf.groupby("_fill", sort=False):
        sub.plot(ax=ax, facecolor=color, edgecolor="#ffffff", linewidth=0.12, zorder=2)
    plot_boundary(ax, boundary)
    frame_map(ax, boundary)

    handles = []
    for name in present_canonical:
        color = LAND_USE_COLORS.get(name, LAND_USE_FALLBACK)
        handles.append(mpatches.Patch(facecolor=color, edgecolor="#64748b", linewidth=0.5, label=name))
    handles.append(mpatches.Patch(facecolor="none", edgecolor=BOUNDARY_COLOR, linewidth=1.6, label="Primary study area boundary"))
    draw_side_legend(ax, handles, "Land use", title, ncol=2)
    save_fig(fig, "06_land_use.png")
    QA_ROWS.append({"map": "06_land_use", "n_analysis": len(gdf), "min": None, "max": None, "classes": len(present_canonical)})


def map_umi(hex_gdf: gpd.GeoDataFrame, boundary: gpd.GeoDataFrame) -> None:
    title = "Urban Maturation Index"
    gdf = hex_gdf.copy()
    gdf["umi"] = finite_series(gdf["umi"])
    gdf["grade"] = [grade_row(a) for a in gdf["Hex_area"]]
    tier_color = {k: c for k, _, _, c in UMI_TIERS}

    fills = []
    for _, row in gdf.iterrows():
        if row["grade"] in ("scrap", "invalid") or not np.isfinite(row["umi"]):
            fills.append(np.nan)
            continue
        fills.append(tier_color[classify_umi_tier(row["umi"])])
    gdf["_fill"] = fills

    fig, ax = new_figure(
        title,
        "Official UMI tiers  ·  100 m hex grid  ·  analysis-grade ≥90% complete",
    )
    plot_hex_groups(ax, gdf)
    plot_boundary(ax, boundary)
    frame_map(ax, boundary)

    handles = [
        mpatches.Patch(facecolor=c, edgecolor="#64748b", linewidth=0.5, label=f"{lab}  ({rng})")
        for _, lab, rng, c in UMI_TIERS
    ]
    handles.extend(completeness_handles(include_partial=True))
    draw_side_legend(ax, handles, "Urban Maturation Index", title)
    save_fig(fig, "08_urban_maturation.png")
    QA_ROWS.append({"map": "08_umi", "n_analysis": int((gdf["grade"] == "full").sum()), "min": 0.15, "max": 0.35, "classes": 3})


def map_walk(hex_gdf: gpd.GeoDataFrame, boundary: gpd.GeoDataFrame) -> None:
    title = "Walk Accessibility Score"
    gdf = hex_gdf.copy()
    gdf["access_score"] = finite_series(gdf["access_score"])
    if "Hex_area" not in gdf.columns and "Hex_area_full" in gdf.columns:
        gdf["Hex_area"] = finite_series(gdf.get("Hex_area"))
    gdf["grade"] = [grade_row(a) for a in gdf["Hex_area"]]
    tier = gdf.get("access_tier")
    if tier is None:
        fail("Walk hexes missing access_tier")
        gdf["access_tier"] = "excluded"
    else:
        gdf["access_tier"] = gdf["access_tier"].astype(str).str.lower()
    if "analysis_ok" in gdf.columns:
        ok = gdf["analysis_ok"].map(
            lambda x: str(x).lower() in {"true", "1"} if pd.notna(x) else False
        )
    else:
        ok = (gdf["grade"] == "full") & (gdf["access_tier"] != "excluded")

    scored = ok & (gdf["access_tier"] != "excluded") & gdf["access_score"].notna() & (gdf["access_score"] >= 0)
    # Walk analysis cells are ≥90% complete AND snapped — do not colour excluded hexes.
    values = gdf.loc[scored, "access_score"].to_numpy(dtype=float)
    classes = build_metric_classes(values, WALK_RAMP)
    qa_class_coverage(title, values, classes)

    gdf["_fill"] = [
        color_for_class(float(v), classes) if keep and np.isfinite(v) and v >= 0 else np.nan
        for keep, v in zip(scored, gdf["access_score"])
    ]
    excl_mask = (gdf["access_tier"] == "excluded") | (~ok)
    if gdf.loc[excl_mask, "_fill"].notna().any():
        n_excluded_coloured = int(gdf.loc[excl_mask, "_fill"].notna().sum())
        fail(f"Walk excluded hexes coloured as scored: {n_excluded_coloured}")
        gdf.loc[excl_mask, "_fill"] = np.nan

    fig, ax = new_figure(
        title,
        "10-minute destination reach (0–1)  ·  100 m hex grid  ·  analysis = ≥90% complete and snapped",
    )
    # Treat non-scored as excluded outlines; do not dim partials as walk analysis requires ≥90%.
    gdf.loc[gdf["_fill"].isna(), "grade"] = "scrap"
    gdf.loc[gdf["_fill"].notna(), "grade"] = "full"
    plot_hex_groups(ax, gdf)
    plot_boundary(ax, boundary)
    frame_map(ax, boundary)
    extra = [
        mpatches.Patch(
            facecolor="none",
            edgecolor=EXCLUDED_EDGE,
            linewidth=1.1,
            label="Excluded (<90% complete or unsnapped)",
        )
    ]
    draw_side_legend(ax, class_legend_handles(classes, extra), "Walk Accessibility Score", title)
    save_fig(fig, "09_walk_accessibility.png")


def map_network_form(
    roads: gpd.GeoDataFrame,
    junctions: gpd.GeoDataFrame,
    gn: gpd.GeoDataFrame,
    boundary: gpd.GeoDataFrame,
) -> None:
    title = "Network Form — Junction Typology"
    fig, ax = new_figure(
        title,
        "Street pathways and junction types inside the five GN divisions  ·  no road labels",
    )
    clip = unary_union(boundary.geometry).buffer(40)
    roads_c = roads[roads.intersects(clip)]
    if len(roads_c):
        roads_c.plot(ax=ax, color="#0f172a", linewidth=0.55, zorder=2)

    gn.boundary.plot(ax=ax, color="#00b4d8", linewidth=1.15, zorder=4)
    plot_boundary(ax, boundary, z=5)

    jn = junctions.copy()
    jn["jtype"] = jn["jtype"].astype(str)
    jn["gn_name"] = jn["gn_name"].astype(str)
    jn = jn[jn["gn_name"].isin(GN_ORDER)]
    unknown = set(jn["jtype"].unique()) - set(JTYPE_STYLE)
    if unknown:
        fail(f"Unknown junction types: {unknown}")

    for jtype, style in JTYPE_STYLE.items():
        sub = jn[jn["jtype"] == jtype]
        if not len(sub):
            continue
        xs = sub.geometry.x
        ys = sub.geometry.y
        ax.scatter(
            xs,
            ys,
            s=style["size"],
            c=style["color"],
            marker=style["marker"],
            edgecolors="#0f172a",
            linewidths=0.25,
            zorder=6,
            label=style["label"],
        )

    frame_map(ax, boundary)
    handles = [
        Line2D(
            [0],
            [0],
            marker=style["marker"],
            color="none",
            markerfacecolor=style["color"],
            markeredgecolor="#0f172a",
            markersize=8 if jtype != "four_way" else 9,
            label=style["label"],
        )
        for jtype, style in JTYPE_STYLE.items()
    ]
    handles.append(Line2D([0], [0], color="#0f172a", linewidth=1.4, label="Street pathways"))
    handles.append(Line2D([0], [0], color="#00b4d8", linewidth=1.6, label="GN boundaries"))
    handles.append(Line2D([0], [0], color=BOUNDARY_COLOR, linewidth=1.8, label="Primary study area boundary"))
    draw_side_legend(ax, handles, "Junction typology", title)
    save_fig(fig, "10_network_form.png")
    QA_ROWS.append({"map": "10_network_form", "n_analysis": len(jn), "min": None, "max": None, "classes": 3})


def print_qa_table() -> None:
    print("\nQA summary")
    print(f"{'map':<28} {'n':>8} {'min':>10} {'max':>10} {'classes':>8}")
    for row in QA_ROWS:
        mn = "—" if row["min"] is None else f"{row['min']:.4g}"
        mx = "—" if row["max"] is None else f"{row['max']:.4g}"
        print(f"{row['map']:<28} {row['n_analysis']:>8} {mn:>10} {mx:>10} {row['classes']:>8}")


def main() -> int:
    plt.rcParams.update(
        {
            "font.family": "sans-serif",
            "font.sans-serif": ["Calibri", "Arial", "DejaVu Sans"],
            "axes.unicode_minus": False,
        }
    )
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Loading layers…")

    boundary = read_geo(DATA / "density-analysis" / "primary_study_area_boundary.geojson")
    gn = read_geo(DATA / "network-form" / "gn5_divisions.geojson")
    roads_density = read_geo(DATA / "density-analysis" / "roads_primary.geojson")
    dens = read_geo(DATA / "density-analysis" / "density_primary_hex.geojson")
    grid = read_geo(DATA / "density-analysis" / "hex_grid_primary_100m.geojson")
    mat = read_geo(DATA / "urban-morpho" / "urban-maturation" / "maturation_primary_hex.geojson")
    landuse = read_geo(DATA / "urban-morpho" / "urban-maturation" / "landuse_primary.geojson")
    walk = read_geo(DATA / "walk-accessibility" / "access_hex_classified.geojson")
    streets = read_geo(DATA / "network-form" / "roads_streets.geojson")
    junctions = read_geo(DATA / "network-form" / "junctions_classified.geojson")

    dens = prepare_density(dens)
    mat = join_hex_area(mat, grid)
    mat["Hex_area"] = finite_series(mat["Hex_area"])
    mat["grade"] = [grade_row(a) for a in mat["Hex_area"]]
    if "accessibility" not in mat.columns and "1normali_1" in mat.columns:
        mat["accessibility"] = finite_series(mat["1normali_1"])
    else:
        mat["accessibility"] = finite_series(mat["accessibility"])

    hex_sub = "100 m hex grid  ·  analysis-grade ≥90% complete  ·  partial cells dimmed"

    print("Rendering maps…")
    map_boundary(gn, boundary, roads_density)
    map_hex_metric(
        dens,
        boundary,
        filename="02_fsi.png",
        title="Floor Space Index (FSI)",
        subtitle=f"Floor area / hex area  ·  {hex_sub}",
        legend_title="FSI",
        column="FSI",
        colors=DENSITY_RAMPS["fsi"],
        density_mode=True,
    )
    map_hex_metric(
        dens,
        boundary,
        filename="03_gsi.png",
        title="Ground Space Index (GSI)",
        subtitle=f"Building footprint / hex area  ·  {hex_sub}",
        legend_title="GSI",
        column="GSI",
        colors=DENSITY_RAMPS["gsi"],
        density_mode=True,
    )
    map_hex_metric(
        dens,
        boundary,
        filename="04_osr.png",
        title="Open Space Ratio (OSR)",
        subtitle=f"Open ground relative to floor area  ·  {hex_sub}",
        legend_title="OSR",
        column="OSR",
        colors=DENSITY_RAMPS["osr"],
        density_mode=True,
    )
    map_hex_metric(
        dens,
        boundary,
        filename="05_density_value.png",
        title="Density Value",
        subtitle=f"Density_V = (FSI_Norm + GSI_Norm) / 2  ·  {hex_sub}",
        legend_title="Density Value",
        column="Density_V",
        colors=DENSITY_RAMPS["density"],
        density_mode=True,
    )
    map_land_use(landuse, boundary)
    map_hex_metric(
        mat,
        boundary,
        filename="07_accessibility_score.png",
        title="Accessibility Score (network, 5000 m)",
        subtitle=f"UMI network accessibility from NQPDA / BtA at 5000 m  ·  {hex_sub}",
        legend_title="Accessibility Score",
        column="accessibility",
        colors=ACCESS_RAMP,
        density_mode=False,
    )
    map_umi(mat, boundary)
    map_walk(walk, boundary)
    map_network_form(streets, junctions, gn, boundary)

    print_qa_table()
    if QA_ISSUES:
        print(f"\n{len(QA_ISSUES)} QA issue(s):")
        for item in QA_ISSUES:
            print(f"  - {item}")
        return 1
    print("\nQA PASS — all 10 maps written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
