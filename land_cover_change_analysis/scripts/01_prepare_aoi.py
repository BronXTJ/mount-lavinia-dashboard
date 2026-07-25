"""
Phase 1 — Dissolve the 5 GN study-area polygons into one AOI.

Reads Social_media_analysis GN5 GeoJSON, dissolves, exports WGS84 + UTM
GeoJSON (and shapefile when possible), and prints area statistics.
"""

from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config.json"


def load_config() -> dict:
    with CONFIG_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    cfg = load_config()
    source = (ROOT / cfg["aoi"]["source"]).resolve()
    if not source.exists():
        raise FileNotFoundError(f"AOI source not found: {source}")

    gdf = gpd.read_file(source)
    if gdf.crs is None:
        gdf = gdf.set_crs(cfg["crs_wgs84"])
    else:
        gdf = gdf.to_crs(cfg["crs_wgs84"])

    gn_names = []
    if "ADM4_EN" in gdf.columns:
        gn_names = sorted(gdf["ADM4_EN"].dropna().astype(str).unique().tolist())

    dissolved = gdf[["geometry"]].dissolve().reset_index(drop=True)
    dissolved["name"] = "GN5_combined"
    dissolved["gn_count"] = len(gdf)
    if gn_names:
        dissolved["gn_names"] = ", ".join(gn_names)

    out_wgs = ROOT / cfg["aoi"]["dissolved_wgs84"]
    out_utm = ROOT / cfg["aoi"]["dissolved_utm"]
    out_shp = ROOT / cfg["aoi"]["dissolved_shp"]
    out_wgs.parent.mkdir(parents=True, exist_ok=True)

    dissolved.to_file(out_wgs, driver="GeoJSON")

    utm = dissolved.to_crs(cfg["crs_area"])
    utm.to_file(out_utm, driver="GeoJSON")

    shp_ok = False
    try:
        utm.to_file(out_shp)
        shp_ok = True
    except Exception as exc:  # noqa: BLE001
        print(f"Shapefile export skipped: {exc}")

    area_m2 = float(utm.geometry.area.sum())
    area_ha = area_m2 / 10_000.0
    area_km2 = area_m2 / 1_000_000.0
    bounds = utm.total_bounds  # minx, miny, maxx, maxy

    stats = {
        "source": str(source),
        "feature_count_source": int(len(gdf)),
        "gn_names": gn_names or cfg["aoi"].get("gn_names", []),
        "crs_wgs84": cfg["crs_wgs84"],
        "crs_area": cfg["crs_area"],
        "area_m2": round(area_m2, 2),
        "area_ha": round(area_ha, 4),
        "area_km2": round(area_km2, 6),
        "bounds_32644": {
            "minx": float(bounds[0]),
            "miny": float(bounds[1]),
            "maxx": float(bounds[2]),
            "maxy": float(bounds[3]),
        },
        "outputs": {
            "wgs84_geojson": str(out_wgs.relative_to(ROOT)),
            "utm_geojson": str(out_utm.relative_to(ROOT)),
            "utm_shapefile": str(out_shp.relative_to(ROOT)) if shp_ok else None,
        },
    }

    stats_path = ROOT / "aoi" / "aoi_stats.json"
    with stats_path.open("w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
