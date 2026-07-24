"""Landsat Collection 2 L2 dry-season composite builders for GN5 AOI."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import ee

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config.json"

COMMON_BANDS = ["blue", "green", "red", "nir", "swir1", "swir2"]
INDEX_BANDS = ["NDVI", "NDBI", "MNDWI"]
EXPORT_BANDS = COMMON_BANDS + INDEX_BANDS

# Landsat C2 L2 optical band maps -> common names
BAND_MAPS = {
    "LANDSAT/LT05/C02/T1_L2": {
        "SR_B1": "blue",
        "SR_B2": "green",
        "SR_B3": "red",
        "SR_B4": "nir",
        "SR_B5": "swir1",
        "SR_B7": "swir2",
    },
    "LANDSAT/LE07/C02/T1_L2": {
        "SR_B1": "blue",
        "SR_B2": "green",
        "SR_B3": "red",
        "SR_B4": "nir",
        "SR_B5": "swir1",
        "SR_B7": "swir2",
    },
    "LANDSAT/LC08/C02/T1_L2": {
        "SR_B2": "blue",
        "SR_B3": "green",
        "SR_B4": "red",
        "SR_B5": "nir",
        "SR_B6": "swir1",
        "SR_B7": "swir2",
    },
    "LANDSAT/LC09/C02/T1_L2": {
        "SR_B2": "blue",
        "SR_B3": "green",
        "SR_B4": "red",
        "SR_B5": "nir",
        "SR_B6": "swir1",
        "SR_B7": "swir2",
    },
}


def load_config() -> dict[str, Any]:
    with CONFIG_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def load_aoi(cfg: dict[str, Any] | None = None) -> ee.Geometry:
    cfg = cfg or load_config()
    aoi_path = ROOT / cfg["aoi"]["dissolved_wgs84"]
    with aoi_path.open(encoding="utf-8") as f:
        geojson = json.load(f)
    return ee.FeatureCollection(geojson).geometry()


def mask_clouds_c2(image: ee.Image) -> ee.Image:
    """Mask cloud, dilated cloud, cloud shadow, and snow using QA_PIXEL."""
    qa = image.select("QA_PIXEL")
    dilated = qa.bitwiseAnd(1 << 1).neq(0)
    cirrus = qa.bitwiseAnd(1 << 2).neq(0)
    cloud = qa.bitwiseAnd(1 << 3).neq(0)
    shadow = qa.bitwiseAnd(1 << 4).neq(0)
    snow = qa.bitwiseAnd(1 << 5).neq(0)
    mask = dilated.Or(cirrus).Or(cloud).Or(shadow).Or(snow).Not()
    return image.updateMask(mask)


def scale_sr(image: ee.Image, src_bands: list[str]) -> ee.Image:
    optical = image.select(src_bands).multiply(0.0000275).add(-0.2)
    return image.addBands(optical, overwrite=True)


def prepare_image(image: ee.Image, collection_id: str) -> ee.Image:
    band_map = BAND_MAPS[collection_id]
    src_bands = list(band_map.keys())
    dst_bands = list(band_map.values())
    image = mask_clouds_c2(image)
    image = scale_sr(image, src_bands)
    return image.select(src_bands, dst_bands).copyProperties(image, ["system:time_start"])


def filter_dry_season(col: ee.ImageCollection, months: list[int]) -> ee.ImageCollection:
    return col.filter(ee.Filter.calendarRange(months[0], 12, "month")).merge(
        col.filter(ee.Filter.calendarRange(1, months[-1], "month"))
    ) if months == [12, 1, 2, 3] else col.filter(
        ee.Filter.inList("month", months)
    )


def collection_for_sensor(
    collection_id: str,
    start: str,
    end: str,
    region: ee.Geometry,
    months: list[int],
) -> ee.ImageCollection:
    col = (
        ee.ImageCollection(collection_id)
        .filterDate(start, end)
        .filterBounds(region)
    )
    # Keep Dec–Mar scenes inside the date window
    col = col.filter(
        ee.Filter.Or(
            ee.Filter.calendarRange(12, 12, "month"),
            ee.Filter.calendarRange(1, 3, "month"),
        )
    )
    return col.map(lambda img: prepare_image(img, collection_id))


def build_epoch_collection(
    epoch: dict[str, Any],
    region: ee.Geometry,
    months: list[int],
) -> ee.ImageCollection:
    cols = [
        collection_for_sensor(sid, epoch["start"], epoch["end"], region, months)
        for sid in epoch["sensors"]
    ]
    merged = cols[0]
    for c in cols[1:]:
        merged = merged.merge(c)
    return merged.select(COMMON_BANDS)


def add_indices(image: ee.Image) -> ee.Image:
    ndvi = image.normalizedDifference(["nir", "red"]).rename("NDVI")
    ndbi = image.normalizedDifference(["swir1", "nir"]).rename("NDBI")
    mndwi = image.normalizedDifference(["green", "swir1"]).rename("MNDWI")
    return image.addBands([ndvi, ndbi, mndwi])


def build_median_composite(
    epoch: dict[str, Any],
    region: ee.Geometry,
    months: list[int],
    buffer_m: float = 300.0,
) -> tuple[ee.Image, dict[str, Any]]:
    col = build_epoch_collection(epoch, region, months)
    count = int(col.size().getInfo())
    export_region = region.buffer(buffer_m).bounds()
    composite = add_indices(col.median()).clip(export_region).select(EXPORT_BANDS)

    meta = {
        "epoch_id": epoch["id"],
        "label": epoch["label"],
        "start": epoch["start"],
        "end": epoch["end"],
        "sensors": epoch["sensors"],
        "months": months,
        "image_count": count,
        "buffer_m": buffer_m,
        "bands": EXPORT_BANDS,
        "scale_m": 30,
        "crs": "EPSG:32644",
    }
    return composite, meta
