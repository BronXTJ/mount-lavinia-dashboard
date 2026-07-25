"""Helpers for index-seeded land-cover classification and change analysis."""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    cohen_kappa_score,
    confusion_matrix,
)

BAND_NAMES = [
    "blue",
    "green",
    "red",
    "nir",
    "swir1",
    "swir2",
    "NDVI",
    "NDBI",
    "MNDWI",
]

CLASS_IDS = [1, 2, 3, 4, 5]


def valid_mask(stack: np.ndarray) -> np.ndarray:
    """True where all bands are finite."""
    return np.all(np.isfinite(stack), axis=0)


def seed_class_masks(stack: np.ndarray) -> dict[int, np.ndarray]:
    """
    Build boolean seed masks from spectral indices.

    Band order: blue, green, red, nir, swir1, swir2, NDVI, NDBI, MNDWI
    """
    blue, green, red, nir, swir1, swir2, ndvi, ndbi, mndwi = stack
    valid = valid_mask(stack)
    brightness = (blue + green + red) / 3.0

    # Western coastal strip (columns near ocean / beach)
    _, _, width = stack.shape
    west_strip = np.zeros(stack.shape[1:], dtype=bool)
    west_cols = max(3, int(width * 0.18))
    west_strip[:, :west_cols] = True

    water = valid & (mndwi > 0.15)
    vegetation = valid & (~water) & (ndvi > 0.40) & (ndbi < 0.05)
    built_up = valid & (~water) & (~vegetation) & (ndbi > 0.05) & (ndvi < 0.30)
    beach = (
        valid
        & (~water)
        & (~vegetation)
        & (~built_up)
        & (ndvi < 0.20)
        & (brightness > 0.08)
        & west_strip
    )
    claimed = water | vegetation | built_up | beach
    open_bare = (
        valid
        & (~claimed)
        & (ndvi >= 0.15)
        & (ndvi <= 0.45)
        & (ndbi >= -0.10)
        & (ndbi <= 0.15)
    )

    return {
        4: water,
        2: vegetation,
        1: built_up,
        5: beach,
        3: open_bare,
    }


def sample_points_from_masks(
    masks: dict[int, np.ndarray],
    stack: np.ndarray,
    transform,
    crs,
    rng: np.random.Generator,
    target_per_class: int = 120,
) -> tuple[np.ndarray, np.ndarray, list[dict[str, Any]]]:
    """Return X, y, and GeoJSON feature props for seed points."""
    xs: list[np.ndarray] = []
    ys: list[int] = []
    features: list[dict[str, Any]] = []

    for class_id, mask in masks.items():
        rows, cols = np.where(mask)
        if rows.size == 0:
            continue
        n = min(target_per_class, int(rows.size))
        pick = rng.choice(rows.size, size=n, replace=False)
        rr, cc = rows[pick], cols[pick]
        for r, c in zip(rr, cc):
            xs.append(stack[:, r, c])
            ys.append(class_id)
            x, y = transform * (c + 0.5, r + 0.5)
            features.append(
                {
                    "type": "Feature",
                    "properties": {"class_id": int(class_id), "row": int(r), "col": int(c)},
                    "geometry": {"type": "Point", "coordinates": [float(x), float(y)]},
                }
            )

    if not xs:
        raise RuntimeError("No training seeds could be created from index masks.")

    return np.asarray(xs, dtype=np.float64), np.asarray(ys, dtype=np.int32), features


def metrics_report(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
    labels = CLASS_IDS
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    oa = float(accuracy_score(y_true, y_pred))
    kappa = float(cohen_kappa_score(y_true, y_pred, labels=labels))
    return {
        "overall_accuracy": oa,
        "kappa": kappa,
        "confusion_matrix": cm,
        "labels": labels,
    }


def class_areas_ha(classified: np.ndarray, pixel_area_m2: float) -> dict[int, float]:
    out: dict[int, float] = {}
    for cid in CLASS_IDS:
        out[cid] = float(np.sum(classified == cid) * pixel_area_m2 / 10_000.0)
    return out


def transition_matrix_ha(
    before: np.ndarray,
    after: np.ndarray,
    pixel_area_m2: float,
) -> np.ndarray:
    """Rows = from class, cols = to class; values in hectares."""
    mat = np.zeros((5, 5), dtype=np.float64)
    valid = (before >= 1) & (before <= 5) & (after >= 1) & (after <= 5)
    b = before[valid]
    a = after[valid]
    for i in range(5):
        for j in range(5):
            count = np.sum((b == i + 1) & (a == j + 1))
            mat[i, j] = count * pixel_area_m2 / 10_000.0
    return mat


def change_theme_raster(before: np.ndarray, after: np.ndarray) -> np.ndarray:
    """
    Thematic change codes:
      0 = nodata / other
      1 = stable
      2 = vegetation -> built-up
      3 = open_bare -> built-up
      4 = any -> built-up (other gains)
      5 = vegetation loss (not to built-up)
      6 = built-up loss
    """
    out = np.zeros(before.shape, dtype=np.uint8)
    valid = (before >= 1) & (after >= 1)
    out[valid & (before == after)] = 1
    out[valid & (before == 2) & (after == 1)] = 2
    out[valid & (before == 3) & (after == 1)] = 3
    other_to_built = valid & (after == 1) & (before != 1) & (before != 2) & (before != 3)
    out[other_to_built] = 4
    veg_loss = valid & (before == 2) & (after != 2) & (after != 1)
    out[veg_loss] = 5
    built_loss = valid & (before == 1) & (after != 1)
    out[built_loss] = 6
    return out
