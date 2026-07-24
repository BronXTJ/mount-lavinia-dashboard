"""
Phase 4 — Validation site panels, zone stats, OSM context, design synthesis.

Full 5 GN coverage + deeper focus on entire Mount Lavinia GN (no Galle Road split).
"""

from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import rasterio
from matplotlib.colors import ListedColormap
from rasterio.features import geometry_mask
from rasterio.plot import plotting_extent
from rasterio.windows import from_bounds
from rasterio.windows import transform as window_transform
from shapely.geometry import Point, box, mapping

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config.json"
LAYERS = ROOT.parent / "Social_media_analysis" / "layers_json_files"

SYN_DIR = ROOT / "outputs" / "synthesis"
ZONE_DIR = SYN_DIR / "zones"
TAB_DIR = ROOT / "outputs" / "tables"
MAP_DIR = ROOT / "outputs" / "maps"
PROC = ROOT / "data" / "processed"
COMP = ROOT / "data" / "raw" / "composites"

CLASS_IDS = [1, 2, 3, 4, 5]
WINDOW_M = 300.0
CRS = "EPSG:32644"


def load_config() -> dict:
    with CONFIG_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def class_map(cfg: dict) -> dict[int, dict]:
    return {c["id"]: c for c in cfg["classes"]}


def load_zones(cfg: dict) -> dict[str, gpd.GeoDataFrame]:
    src = (ROOT / cfg["aoi"]["source"]).resolve()
    gdf = gpd.read_file(src)
    if gdf.crs is None:
        gdf = gdf.set_crs(4326)
    gdf = gdf.to_crs(CRS)

    ml = gdf[gdf["ADM4_EN"] == "Mount Lavinia"].dissolve().reset_index(drop=True)
    ml["zone"] = "mount_lavinia_gn"
    other = gdf[gdf["ADM4_EN"] != "Mount Lavinia"].dissolve().reset_index(drop=True)
    other["zone"] = "other_4gn"
    gn5 = gdf.dissolve().reset_index(drop=True)
    gn5["zone"] = "gn5"

    ZONE_DIR.mkdir(parents=True, exist_ok=True)
    ml.to_file(ZONE_DIR / "mount_lavinia_gn.geojson", driver="GeoJSON")
    other.to_file(ZONE_DIR / "other_4gn.geojson", driver="GeoJSON")
    gn5.to_file(ZONE_DIR / "gn5_reference.geojson", driver="GeoJSON")
    return {"gn5": gn5, "mount_lavinia_gn": ml, "other_4gn": other, "gn_parts": gdf}


def zone_mask(dataset: rasterio.DatasetReader, geom) -> np.ndarray:
    geoms = [mapping(geom)]
    outside = geometry_mask(
        geoms,
        out_shape=(dataset.height, dataset.width),
        transform=dataset.transform,
        invert=False,
        all_touched=True,
    )
    return ~outside


def area_by_class(arr: np.ndarray, mask: np.ndarray, px_m2: float) -> dict[int, float]:
    out = {}
    for cid in CLASS_IDS:
        out[cid] = float(np.sum((arr == cid) & mask) * px_m2 / 10_000.0)
    return out


def compute_zone_stats(zones: dict[str, gpd.GeoDataFrame], class_lookup: dict) -> pd.DataFrame:
    path2018 = PROC / "classified_y2018.tif"
    path2025 = PROC / "classified_y2025.tif"
    rows = []
    with rasterio.open(path2018) as d0, rasterio.open(path2025) as d1:
        a0 = d0.read(1)
        a1 = d1.read(1)
        px = abs(d0.res[0] * d0.res[1])
        for zname in ["gn5", "mount_lavinia_gn", "other_4gn"]:
            m = zone_mask(d0, zones[zname].geometry.iloc[0])
            s0 = area_by_class(a0, m, px)
            s1 = area_by_class(a1, m, px)
            total0 = sum(s0.values()) or 1.0
            total1 = sum(s1.values()) or 1.0
            row = {
                "zone": zname,
                "total_ha_y2018": round(sum(s0.values()), 4),
                "total_ha_y2025": round(sum(s1.values()), 4),
            }
            for cid in CLASS_IDS:
                name = class_lookup[cid]["name"]
                row[f"{name}_y2018_ha"] = round(s0[cid], 4)
                row[f"{name}_y2025_ha"] = round(s1[cid], 4)
                row[f"{name}_change_ha"] = round(s1[cid] - s0[cid], 4)
                row[f"{name}_y2018_pct"] = round(100 * s0[cid] / total0, 2)
                row[f"{name}_y2025_pct"] = round(100 * s1[cid] / total1, 2)
            rows.append(row)
    df = pd.DataFrame(rows)
    TAB_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(TAB_DIR / "area_by_zone_y2018_y2025.csv", index=False)
    return df


def density_peak(
    mask: np.ndarray,
    exclude: list[tuple[int, int]] | None = None,
    min_dist_px: int = 8,
):
    if not mask.any():
        return None
    try:
        from scipy.ndimage import uniform_filter

        dens = uniform_filter(mask.astype(float), size=5)
    except Exception:
        dens = mask.astype(float)

    dens = dens.copy()
    dens[~mask] = -1.0
    if exclude:
        for r, c in exclude:
            r0, r1 = max(0, r - min_dist_px), min(mask.shape[0], r + min_dist_px + 1)
            c0, c1 = max(0, c - min_dist_px), min(mask.shape[1], c + min_dist_px + 1)
            dens[r0:r1, c0:c1] = -1.0
    if dens.max() < 0:
        return None
    idx = np.unravel_index(int(np.argmax(dens)), dens.shape)
    return int(idx[0]), int(idx[1])


def xy_from_rc(transform, r: int, c: int) -> tuple[float, float]:
    x, y = transform * (c + 0.5, r + 0.5)
    return float(x), float(y)


def pick_sites(zones: dict, class_lookup: dict) -> gpd.GeoDataFrame:
    change_path = PROC / "change_theme_y2018_y2025.tif"
    class2025 = PROC / "classified_y2025.tif"
    class2018 = PROC / "classified_y2018.tif"

    with rasterio.open(change_path) as dc, rasterio.open(class2025) as d25, rasterio.open(
        class2018
    ) as d00:
        ch = dc.read(1)
        c25 = d25.read(1)
        c00 = d00.read(1)
        transform = dc.transform
        ml_m = zone_mask(dc, zones["mount_lavinia_gn"].geometry.iloc[0])
        other_m = zone_mask(dc, zones["other_4gn"].geometry.iloc[0])
        gn5_m = zone_mask(dc, zones["gn5"].geometry.iloc[0])

        specs = [
            ("01", "ml_veg_to_built_1", "Mount Lavinia veg→built (primary)", ml_m & (ch == 2)),
            ("02", "ml_veg_to_built_2", "Mount Lavinia veg→built (secondary)", ml_m & (ch == 2)),
            ("03", "ml_open_to_built", "Mount Lavinia open→built", ml_m & (ch == 3)),
            (
                "04",
                "ml_coastal_beach",
                "Mount Lavinia coastal / beach edge",
                ml_m & ((c25 == 5) | (c00 == 5) | (ch == 4)),
            ),
            (
                "05",
                "ml_stable_green",
                "Mount Lavinia remaining green/soft",
                ml_m & (c25 == 2) & (ch == 1),
            ),
            ("06", "other_veg_to_built", "Other GNs veg→built", other_m & (ch == 2)),
            (
                "07",
                "other_stable_green",
                "Other GNs stable vegetation",
                other_m & (c25 == 2) & (ch == 1),
            ),
            (
                "08",
                "other_water_or_built",
                "Other GNs water/wetland or densification",
                other_m & ((c25 == 4) | (ch == 2) | (ch == 3)),
            ),
        ]

        if not specs[3][3].any():
            ml_geom = zones["mount_lavinia_gn"].geometry.iloc[0]
            minx, miny, maxx, maxy = ml_geom.bounds
            west = box(minx, miny, minx + (maxx - minx) * 0.35, maxy)
            west_m = zone_mask(dc, west.intersection(ml_geom))
            specs[3] = (
                "04",
                "ml_coastal_beach",
                "Mount Lavinia coastal edge (west strip)",
                west_m & gn5_m,
            )

        if not (other_m & (c25 == 4)).any():
            specs[7] = (
                "08",
                "other_water_or_built",
                "Other GNs densification pocket",
                other_m & ((ch == 2) | (ch == 3) | (ch == 4)),
            )

        features = []
        picks_ml: list[tuple[int, int]] = []
        picks_ot: list[tuple[int, int]] = []

        for sid, key, label, mask in specs:
            pool = picks_ml if key.startswith("ml_") else picks_ot
            rc = density_peak(mask, exclude=pool, min_dist_px=8)
            if rc is None:
                geom = zones[
                    "mount_lavinia_gn" if key.startswith("ml_") else "other_4gn"
                ].geometry.iloc[0]
                cx, cy = geom.centroid.x, geom.centroid.y
                r, c = rasterio.transform.rowcol(transform, cx, cy)
                rc = (int(r), int(c))

            pool.append(rc)
            x, y = xy_from_rc(transform, rc[0], rc[1])
            half = WINDOW_M / 2.0
            win = box(x - half, y - half, x + half, y + half)
            features.append(
                {
                    "site_id": sid,
                    "key": key,
                    "label": label,
                    "focus": "mount_lavinia_gn" if key.startswith("ml_") else "other_4gn",
                    "row": rc[0],
                    "col": rc[1],
                    "geometry": Point(x, y),
                    "window": win,
                }
            )

    gdf = gpd.GeoDataFrame(features, crs=CRS)
    SYN_DIR.mkdir(parents=True, exist_ok=True)
    pts = gdf.drop(columns=["window"])
    pts.to_file(SYN_DIR / "focal_sites.geojson", driver="GeoJSON")
    wins = gdf.copy()
    wins["geometry"] = wins["window"]
    wins = wins.drop(columns=["window"])
    wins.to_file(SYN_DIR / "focal_site_windows.geojson", driver="GeoJSON")
    return gdf


def stretch_rgb(stack: np.ndarray) -> np.ndarray:
    rgb = np.stack([stack[2], stack[1], stack[0]], axis=-1)
    out = np.zeros_like(rgb, dtype=float)
    for i in range(3):
        band = rgb[..., i]
        valid = band[np.isfinite(band)]
        if valid.size == 0:
            continue
        lo, hi = np.percentile(valid, (2, 98))
        if hi <= lo:
            hi = lo + 1e-6
        out[..., i] = np.clip((band - lo) / (hi - lo), 0, 1)
        out[~np.isfinite(band), i] = 0
    return out


def read_window(path: Path, bounds, bands=None):
    with rasterio.open(path) as ds:
        win = from_bounds(*bounds, transform=ds.transform)
        win = win.round_offsets().round_lengths()
        data = ds.read(bands, window=win) if bands else ds.read(window=win)
        transform = window_transform(win, ds.transform)
        base = data if data.ndim == 2 else data[0]
        return data, transform, plotting_extent(base, transform)


def plot_site_panel(site: pd.Series, out_path: Path) -> None:
    bounds = site["window"].bounds
    rgb00, _, ext = read_window(COMP / "composite_y2018.tif", bounds)
    rgb25, _, _ = read_window(COMP / "composite_y2025.tif", bounds)
    ch, _, _ = read_window(PROC / "change_theme_y2018_y2025.tif", bounds)

    rgb00 = stretch_rgb(rgb00)
    rgb25 = stretch_rgb(rgb25)
    ch = ch[0] if ch.ndim == 3 else ch

    change_colors = ["#f0f0f0", "#bdbdbd", "#d73027", "#fc8d59", "#fee08b", "#1a9850", "#4575b4"]
    cmap = ListedColormap(change_colors)

    fig, axes = plt.subplots(1, 3, figsize=(12, 4.2), dpi=140)
    axes[0].imshow(rgb00, extent=ext, origin="upper")
    axes[0].set_title("~2018 RGB (S2 10 m)")
    axes[1].imshow(rgb25, extent=ext, origin="upper")
    axes[1].set_title("~2025 RGB (S2 10 m)")
    im = axes[2].imshow(
        ch, extent=ext, origin="upper", cmap=cmap, vmin=0, vmax=6, interpolation="nearest"
    )
    axes[2].set_title("Change theme")
    for ax in axes:
        ax.set_xticks([])
        ax.set_yticks([])
        ax.plot(
            site.geometry.x,
            site.geometry.y,
            "o",
            color="cyan",
            markersize=6,
            markeredgecolor="k",
        )
    fig.suptitle(f"Site {site['site_id']}: {site['label']}", fontsize=11)
    fig.colorbar(im, ax=axes[2], fraction=0.046, pad=0.04, ticks=range(7))
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)


def load_osm(gn5: gpd.GeoDataFrame):
    buildings = gpd.read_file(LAYERS / "buildings.geojson")
    roads = gpd.read_file(LAYERS / "roads.geojson")
    if buildings.crs is None:
        buildings = buildings.set_crs(4326)
    if roads.crs is None:
        roads = roads.set_crs(4326)
    buildings = buildings.to_crs(CRS)
    roads = roads.to_crs(CRS)
    geom = gn5.geometry.iloc[0]
    buildings = buildings[buildings.intersects(geom)].copy()
    roads = roads[roads.intersects(geom)].copy()
    galle = roads[roads["name"].fillna("").str.contains("Galle Road", case=False)].copy()
    return buildings, roads, galle


def plot_context_gn5(zones, buildings, roads, galle, class_lookup, out_path: Path) -> None:
    with rasterio.open(PROC / "classified_y2025.tif") as ds:
        arr = ds.read(1)
        extent = plotting_extent(ds)
    colors = ["#000000"] + [class_lookup[i]["color"] for i in CLASS_IDS]
    cmap = ListedColormap(colors)
    fig, ax = plt.subplots(figsize=(8, 9), dpi=150)
    ax.imshow(arr, extent=extent, origin="upper", cmap=cmap, vmin=0, vmax=5, interpolation="nearest")
    zones["gn5"].boundary.plot(ax=ax, color="#1d3557", linewidth=1.5)
    zones["mount_lavinia_gn"].boundary.plot(ax=ax, color="#e63946", linewidth=2.0)
    if len(roads):
        roads.plot(ax=ax, color="#444444", linewidth=0.4, alpha=0.7)
    if len(galle):
        galle.plot(ax=ax, color="#000000", linewidth=1.6, label="Galle Road")
    if len(buildings):
        buildings.plot(ax=ax, color="#222222", alpha=0.25, linewidth=0)
    ax.set_title("GN5 ~2025 land cover + OSM roads/buildings\n(red outline = Mount Lavinia GN)")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.legend(loc="lower right", fontsize=8)
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)


def plot_context_ml(zones, buildings, roads, galle, class_lookup, sites: gpd.GeoDataFrame, out_path: Path) -> None:
    ml = zones["mount_lavinia_gn"]
    minx, miny, maxx, maxy = ml.total_bounds
    pad = 80
    bounds = (minx - pad, miny - pad, maxx + pad, maxy + pad)
    arr, _, extent = read_window(PROC / "classified_y2025.tif", bounds)
    arr = arr[0] if arr.ndim == 3 else arr
    colors = ["#000000"] + [class_lookup[i]["color"] for i in CLASS_IDS]
    cmap = ListedColormap(colors)

    fig, ax = plt.subplots(figsize=(7, 9), dpi=150)
    ax.imshow(arr, extent=extent, origin="upper", cmap=cmap, vmin=0, vmax=5, interpolation="nearest")
    ml.boundary.plot(ax=ax, color="#e63946", linewidth=2.2)
    b_clip = buildings[buildings.intersects(ml.geometry.iloc[0])]
    r_clip = roads[roads.intersects(ml.geometry.iloc[0])]
    g_clip = galle[galle.intersects(ml.geometry.iloc[0])]
    if len(r_clip):
        r_clip.plot(ax=ax, color="#555555", linewidth=0.5, alpha=0.8)
    if len(g_clip):
        g_clip.plot(ax=ax, color="#000000", linewidth=2.0, label="Galle Road")
    if len(b_clip):
        b_clip.plot(ax=ax, color="#111111", alpha=0.3, linewidth=0)
    ml_sites = sites[sites["focus"] == "mount_lavinia_gn"]
    ax.scatter(
        ml_sites.geometry.x,
        ml_sites.geometry.y,
        c="cyan",
        s=40,
        edgecolors="k",
        zorder=5,
        label="Focal sites",
    )
    for _, s in ml_sites.iterrows():
        ax.text(
            s.geometry.x + 20,
            s.geometry.y + 20,
            s["site_id"],
            fontsize=8,
            color="white",
            bbox=dict(boxstyle="round,pad=0.15", fc="#333333", alpha=0.7),
        )
    ax.set_title("Mount Lavinia GN deep dive — ~2025 class + OSM\n(Galle Road = context only)")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.legend(loc="lower right", fontsize=8)
    ax.set_xlim(bounds[0], bounds[2])
    ax.set_ylim(bounds[1], bounds[3])
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)


def write_design_synthesis(zone_df: pd.DataFrame, sites: gpd.GeoDataFrame) -> None:
    def zone_row(name: str) -> pd.Series:
        return zone_df[zone_df["zone"] == name].iloc[0]

    gn5 = zone_row("gn5")
    ml = zone_row("mount_lavinia_gn")
    other = zone_row("other_4gn")

    lines = [
        "# Design synthesis — Sentinel-2 10 m land cover (5 GN + Mount Lavinia deep dive)",
        "",
        "## Scope",
        "",
        "- Study area: five GN divisions (Mount Lavinia, Kawdana West, Watarappala, Wathumulla, Wedikanda).",
        "- Deep dive: **entire Mount Lavinia GN**.",
        "- Evidence: **Sentinel-2 10 m** dry-season composites (~2018 / ~2020 / ~2025), Random Forest classes, OSM context.",
        "- Companion study: Landsat 30 m folder covers longer archive including ~2000.",
        "- Scale caveat: neighbourhood-scale (10 m), not plot/cadastral accuracy.",
        "",
        "## Headline — Mount Lavinia GN",
        "",
        f"- Built-up: **{ml['built_up_y2018_ha']:.1f} → {ml['built_up_y2025_ha']:.1f} ha** ({ml['built_up_change_ha']:+.1f} ha).",
        f"- Vegetation: **{ml['vegetation_y2018_ha']:.1f} → {ml['vegetation_y2025_ha']:.1f} ha** ({ml['vegetation_change_ha']:+.1f} ha).",
        f"- Open / bare: **{ml['open_bare_y2018_ha']:.1f} → {ml['open_bare_y2025_ha']:.1f} ha** ({ml['open_bare_change_ha']:+.1f} ha).",
        f"- Beach / sand: **{ml['beach_sand_y2018_ha']:.1f} → {ml['beach_sand_y2025_ha']:.1f} ha** ({ml['beach_sand_change_ha']:+.1f} ha).",
        "",
        "Mount Lavinia is the priority design lens: coastal identity, hotel/promenade edge, and Galle Road as the main structuring corridor (shown on maps for context only).",
        "",
        "## Full 5 GN summary",
        "",
        f"- Built-up: **{gn5['built_up_y2018_ha']:.1f} → {gn5['built_up_y2025_ha']:.1f} ha** ({gn5['built_up_change_ha']:+.1f} ha).",
        f"- Vegetation: **{gn5['vegetation_y2018_ha']:.1f} → {gn5['vegetation_y2025_ha']:.1f} ha** ({gn5['vegetation_change_ha']:+.1f} ha).",
        f"- Open / bare: **{gn5['open_bare_y2018_ha']:.1f} → {gn5['open_bare_y2025_ha']:.1f} ha** ({gn5['open_bare_change_ha']:+.1f} ha).",
        "",
        f"Other four GNs combined: built-up {other['built_up_change_ha']:+.1f} ha; vegetation {other['vegetation_change_ha']:+.1f} ha.",
        "",
        "## Design implications",
        "",
        "1. **Cooling / canopy** — Vegetation change across GN5 at 10 m detail, with Mount Lavinia deep-dive sites showing local conversion patterns. Protect remaining tree patches and street trees along Galle Road and secondary streets.",
        "2. **Open space** — Open/bare dynamics often accompany vegetation decline. Treat residual soft patches in Mount Lavinia as candidate public/landscape inserts before further hard coverage.",
        "3. **Coastal edge** — Beach/sand and Mount Lavinia frontage are identity-critical. Limit hard expansion onto soft coastal surfaces; keep visual and physical access to the shore.",
        "4. **Flood / soft surfaces** — Soft cover (vegetation + open + wetland remnants) is the local sponge. Prioritize permeable surfaces and pocket greens where Phase 4 sites mark densification.",
        "5. **Corridor densification** — OSM building/road overlay on ~2025 classes shows intensification along primary routes. Use Galle Road as a design armature (shade, frontage, pedestrian continuity) rather than only a traffic corridor.",
        "",
        "## Focal validation sites",
        "",
    ]
    for _, s in sites.sort_values("site_id").iterrows():
        lines.append(f"- **Site {s['site_id']}** ({s['focus']}): {s['label']}")
    lines += [
        "",
        "Each site panel: `outputs/synthesis/site_XX_*.png` (~2000 RGB | ~2025 RGB | change theme).",
        "",
        "## Key maps / tables",
        "",
        "- `outputs/maps/context_y2025_osm_overlay_gn5.png`",
        "- `outputs/maps/context_y2025_mount_lavinia_focus.png`",
        "- `outputs/tables/area_by_zone_y2018_y2025.csv`",
        "- `outputs/synthesis/focal_sites.geojson`",
        "",
    ]
    SYN_DIR.mkdir(parents=True, exist_ok=True)
    (SYN_DIR / "design_synthesis.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    cfg = load_config()
    lookup = class_map(cfg)
    print("Building zones...")
    zones = load_zones(cfg)
    print("Zone stats...")
    zone_df = compute_zone_stats(zones, lookup)
    print(zone_df[["zone", "built_up_change_ha", "vegetation_change_ha"]].to_string(index=False))

    print("Selecting focal sites...")
    sites = pick_sites(zones, lookup)

    print("Writing site panels...")
    for _, site in sites.iterrows():
        out = SYN_DIR / f"site_{site['site_id']}_{site['key']}.png"
        plot_site_panel(site, out)
        print(f"  {out.name}")

    print("OSM overlays...")
    buildings, roads, galle = load_osm(zones["gn5"])
    plot_context_gn5(
        zones, buildings, roads, galle, lookup, MAP_DIR / "context_y2025_osm_overlay_gn5.png"
    )
    plot_context_ml(
        zones,
        buildings,
        roads,
        galle,
        lookup,
        sites,
        MAP_DIR / "context_y2025_mount_lavinia_focus.png",
    )

    write_design_synthesis(zone_df, sites)

    manifest = {
        "focus": "full_5gn_plus_mount_lavinia_gn_deep_dive",
        "galle_road_role": "map_context_only_no_statistical_split",
        "zones": ["gn5", "mount_lavinia_gn", "other_4gn"],
        "n_sites": int(len(sites)),
        "site_ids": sites["site_id"].tolist(),
        "outputs": {
            "design_synthesis": "outputs/synthesis/design_synthesis.md",
            "zone_table": "outputs/tables/area_by_zone_y2000_y2025.csv",
            "focal_sites": "outputs/synthesis/focal_sites.geojson",
            "context_gn5": "outputs/maps/context_y2025_osm_overlay_gn5.png",
            "context_ml": "outputs/maps/context_y2025_mount_lavinia_focus.png",
        },
    }
    with (SYN_DIR / "phase4_manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("Phase 4 complete.")


if __name__ == "__main__":
    main()
