"""Sentinel-2 SR Harmonized dry-season composite builders (10 m)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import ee

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config.json"

COMMON_BANDS = ["blue", "green", "red", "nir", "swir1", "swir2"]
EXPORT_BANDS = COMMON_BANDS + ["NDVI", "NDBI", "MNDWI"]
SRC_BANDS = ["B2", "B3", "B4", "B8", "B11", "B12"]


def load_config() -> dict[str, Any]:
    with CONFIG_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def load_aoi(cfg: dict[str, Any] | None = None) -> ee.Geometry:
    cfg = cfg or load_config()
    aoi_path = ROOT / cfg["aoi"]["dissolved_wgs84"]
    with aoi_path.open(encoding="utf-8") as f:
        geojson = json.load(f)
    return ee.FeatureCollection(geojson).geometry()


def mask_s2_scl(image: ee.Image) -> ee.Image:
    """Mask clouds/shadows/snow/cirrus using Scene Classification Layer."""
    scl = image.select("SCL")
    # Keep: 2 dark, 4 veg, 5 bare, 6 water, 7 unclassified
    keep = (
        scl.eq(2)
        .Or(scl.eq(4))
        .Or(scl.eq(5))
        .Or(scl.eq(6))
        .Or(scl.eq(7))
    )
    return image.updateMask(keep)


def prepare_s2(image: ee.Image) -> ee.Image:
    image = mask_s2_scl(image)
    optical = image.select(SRC_BANDS).divide(10000.0)
    optical = optical.rename(COMMON_BANDS)
    return optical.copyProperties(image, ["system:time_start"])


def build_epoch_collection(
    epoch: dict[str, Any],
    region: ee.Geometry,
) -> ee.ImageCollection:
    collection_id = epoch["sensors"][0]
    col = (
        ee.ImageCollection(collection_id)
        .filterDate(epoch["start"], epoch["end"])
        .filterBounds(region)
        .filter(
            ee.Filter.Or(
                ee.Filter.calendarRange(12, 12, "month"),
                ee.Filter.calendarRange(1, 3, "month"),
            )
        )
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 60))
    )
    return col.map(prepare_s2).select(COMMON_BANDS)


def add_indices(image: ee.Image) -> ee.Image:
    ndvi = image.normalizedDifference(["nir", "red"]).rename("NDVI")
    ndbi = image.normalizedDifference(["swir1", "nir"]).rename("NDBI")
    mndwi = image.normalizedDifference(["green", "swir1"]).rename("MNDWI")
    return image.addBands([ndvi, ndbi, mndwi])


def build_median_composite(
    epoch: dict[str, Any],
    region: ee.Geometry,
    buffer_m: float = 300.0,
) -> tuple[ee.Image, dict[str, Any]]:
    col = build_epoch_collection(epoch, region)
    count = int(col.size().getInfo())
    export_region = region.buffer(buffer_m).bounds()
    composite = add_indices(col.median()).clip(export_region).select(EXPORT_BANDS)
    meta = {
        "epoch_id": epoch["id"],
        "label": epoch["label"],
        "start": epoch["start"],
        "end": epoch["end"],
        "sensors": epoch["sensors"],
        "image_count": count,
        "buffer_m": buffer_m,
        "bands": EXPORT_BANDS,
        "scale_m": 10,
        "crs": "EPSG:32644",
    }
    return composite, meta
