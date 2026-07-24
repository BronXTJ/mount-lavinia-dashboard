"""
Phase 3 — Classify composites with Random Forest and compute change analysis.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import rasterio
from matplotlib.colors import ListedColormap
from rasterio.features import geometry_mask
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from shapely.geometry import mapping

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from lulc_utils import (  # noqa: E402
    BAND_NAMES,
    CLASS_IDS,
    change_theme_raster,
    class_areas_ha,
    metrics_report,
    sample_points_from_masks,
    seed_class_masks,
    transition_matrix_ha,
    valid_mask,
)

CONFIG_PATH = ROOT / "config.json"
COMP_DIR = ROOT / "data" / "raw" / "composites"
PROC_DIR = ROOT / "data" / "processed"
TAB_DIR = ROOT / "outputs" / "tables"
MAP_DIR = ROOT / "outputs" / "maps"
FIG_DIR = ROOT / "outputs" / "figures"

CHANGE_PAIRS = [
    ("y2018", "y2020"),
    ("y2020", "y2025"),
    ("y2018", "y2025"),
]


def load_config() -> dict:
    with CONFIG_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def class_lookup(cfg: dict) -> dict[int, dict]:
    return {c["id"]: c for c in cfg["classes"]}


def load_aoi_mask(dataset: rasterio.DatasetReader, aoi_path: Path) -> np.ndarray:
    gdf = gpd.read_file(aoi_path).to_crs(dataset.crs)
    geoms = [mapping(geom) for geom in gdf.geometry]
    # True outside AOI
    outside = geometry_mask(
        geoms,
        out_shape=(dataset.height, dataset.width),
        transform=dataset.transform,
        invert=False,
        all_touched=True,
    )
    return ~outside


def read_stack(path: Path) -> tuple[np.ndarray, dict]:
    with rasterio.open(path) as ds:
        arr = ds.read().astype(np.float64)
        profile = ds.profile.copy()
        transform = ds.transform
        crs = ds.crs
        res = ds.res
    meta = {"profile": profile, "transform": transform, "crs": crs, "res": res, "path": path}
    return arr, meta


def write_classification(
    path: Path,
    array: np.ndarray,
    profile: dict,
) -> None:
    profile = profile.copy()
    profile.update(dtype="uint8", count=1, nodata=0, compress="lzw")
    path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(array.astype(np.uint8), 1)


def save_training_geojson(features: list[dict], crs, path: Path, class_map: dict) -> None:
    for f in features:
        cid = f["properties"]["class_id"]
        f["properties"]["class_name"] = class_map[cid]["name"]
        f["properties"]["class_label"] = class_map[cid]["label"]
    fc = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": str(crs)}},
        "features": features,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(fc, f)


def classify_epoch(
    epoch_id: str,
    cfg: dict,
    class_map: dict,
    rng: np.random.Generator,
) -> dict:
    tif = COMP_DIR / f"composite_{epoch_id}.tif"
    stack, meta = read_stack(tif)
    aoi_path = ROOT / cfg["aoi"]["dissolved_utm"]
    with rasterio.open(tif) as ds:
        aoi = load_aoi_mask(ds, aoi_path)

    # Restrict to AOI for training and mapping
    stack_masked = stack.copy()
    stack_masked[:, ~aoi] = np.nan

    masks = seed_class_masks(stack_masked)
    # Keep seeds inside AOI only
    for cid in list(masks):
        masks[cid] = masks[cid] & aoi

    X, y, feats = sample_points_from_masks(
        masks, stack_masked, meta["transform"], meta["crs"], rng, target_per_class=120
    )
    save_training_geojson(
        feats,
        meta["crs"],
        PROC_DIR / f"training_samples_{epoch_id}.geojson",
        class_map,
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    clf = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    report = metrics_report(y_test, y_pred)

    # Predict full grid
    h, w = stack.shape[1:]
    flat = stack_masked.reshape(9, -1).T
    valid = np.all(np.isfinite(flat), axis=1) & aoi.reshape(-1)
    pred = np.zeros(flat.shape[0], dtype=np.uint8)
    if valid.any():
        pred[valid] = clf.predict(flat[valid]).astype(np.uint8)
    classified = pred.reshape(h, w)

    out_tif = PROC_DIR / f"classified_{epoch_id}.tif"
    write_classification(out_tif, classified, meta["profile"])

    px_area = abs(meta["res"][0] * meta["res"][1])
    areas = class_areas_ha(classified, px_area)

    # Confusion CSV
    TAB_DIR.mkdir(parents=True, exist_ok=True)
    cm = report["confusion_matrix"]
    cm_df = pd.DataFrame(
        cm,
        index=[class_map[i]["name"] for i in CLASS_IDS],
        columns=[class_map[i]["name"] for i in CLASS_IDS],
    )
    cm_df.to_csv(TAB_DIR / f"confusion_{epoch_id}.csv")

    seed_counts = {int(cid): int(np.sum(masks[cid])) for cid in CLASS_IDS}

    return {
        "epoch_id": epoch_id,
        "classified_path": str(out_tif.relative_to(ROOT)).replace("\\", "/"),
        "training_path": f"data/processed/training_samples_{epoch_id}.geojson",
        "n_samples": int(len(y)),
        "n_train": int(len(y_train)),
        "n_test": int(len(y_test)),
        "seed_pixel_counts": seed_counts,
        "overall_accuracy": report["overall_accuracy"],
        "kappa": report["kappa"],
        "areas_ha": {str(k): v for k, v in areas.items()},
        "classified": classified,
        "profile": meta["profile"],
        "transform": meta["transform"],
        "crs": meta["crs"],
        "pixel_area_m2": px_area,
    }


def plot_classified(array: np.ndarray, class_map: dict, title: str, path: Path) -> None:
    colors = ["#000000"] + [class_map[i]["color"] for i in CLASS_IDS]
    cmap = ListedColormap(colors)
    fig, ax = plt.subplots(figsize=(5.5, 7), dpi=150)
    im = ax.imshow(array, cmap=cmap, vmin=0, vmax=5, interpolation="nearest")
    ax.set_title(title)
    ax.axis("off")
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04, ticks=[0, 1, 2, 3, 4, 5])
    cbar.ax.set_yticklabels(
        ["nodata"] + [class_map[i]["name"] for i in CLASS_IDS], fontsize=8
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)


def plot_change(theme: np.ndarray, title: str, path: Path) -> None:
    colors = [
        "#f0f0f0",  # 0 other/nodata
        "#bdbdbd",  # 1 stable
        "#d73027",  # 2 veg -> built
        "#fc8d59",  # 3 open -> built
        "#fee08b",  # 4 other -> built
        "#1a9850",  # 5 veg loss other
        "#4575b4",  # 6 built loss
    ]
    labels = [
        "other/nodata",
        "stable",
        "veg→built-up",
        "open→built-up",
        "other→built-up",
        "veg loss (not built)",
        "built-up loss",
    ]
    cmap = ListedColormap(colors)
    fig, ax = plt.subplots(figsize=(5.5, 7), dpi=150)
    im = ax.imshow(theme, cmap=cmap, vmin=0, vmax=6, interpolation="nearest")
    ax.set_title(title)
    ax.axis("off")
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04, ticks=list(range(7)))
    cbar.ax.set_yticklabels(labels, fontsize=7)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)


def plot_stacked_areas(area_df: pd.DataFrame, class_map: dict, path: Path) -> None:
    epochs = area_df["epoch"].tolist()
    fig, ax = plt.subplots(figsize=(8, 5), dpi=150)
    bottom = np.zeros(len(epochs))
    for cid in CLASS_IDS:
        vals = area_df[class_map[cid]["name"]].to_numpy(dtype=float)
        ax.bar(
            epochs,
            vals,
            bottom=bottom,
            label=class_map[cid]["label"],
            color=class_map[cid]["color"],
            edgecolor="#333333",
            linewidth=0.3,
        )
        bottom += vals
    ax.set_ylabel("Area (ha)")
    ax.set_title("Land cover area by epoch (GN5)")
    ax.legend(loc="upper left", bbox_to_anchor=(1.02, 1), fontsize=8)
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    cfg = load_config()
    class_map = class_lookup(cfg)
    rng = np.random.default_rng(42)

    PROC_DIR.mkdir(parents=True, exist_ok=True)
    TAB_DIR.mkdir(parents=True, exist_ok=True)
    MAP_DIR.mkdir(parents=True, exist_ok=True)
    FIG_DIR.mkdir(parents=True, exist_ok=True)

    results = []
    classified = {}
    for epoch in cfg["epochs"]:
        eid = epoch["id"]
        print(f"Classifying {eid} ...")
        res = classify_epoch(eid, cfg, class_map, rng)
        print(
            f"  samples={res['n_samples']}  OA={res['overall_accuracy']:.3f}  "
            f"kappa={res['kappa']:.3f}"
        )
        if res["overall_accuracy"] < 0.85:
            print("  WARNING: OA below 0.85 target (index-seed holdout; retune if needed)")
        plot_classified(
            res["classified"],
            class_map,
            f"Classified land cover {epoch['label']}",
            MAP_DIR / f"classified_{eid}.png",
        )
        classified[eid] = res
        results.append(res)

    # Accuracy table
    acc_rows = [
        {
            "epoch": r["epoch_id"],
            "n_samples": r["n_samples"],
            "n_train": r["n_train"],
            "n_test": r["n_test"],
            "overall_accuracy": round(r["overall_accuracy"], 4),
            "kappa": round(r["kappa"], 4),
        }
        for r in results
    ]
    pd.DataFrame(acc_rows).to_csv(TAB_DIR / "accuracy_by_epoch.csv", index=False)

    # Area table
    area_rows = []
    for r in results:
        row = {"epoch": r["epoch_id"]}
        total = sum(r["areas_ha"].values())
        for cid in CLASS_IDS:
            name = class_map[cid]["name"]
            ha = r["areas_ha"][str(cid)]
            row[name] = round(ha, 4)
            row[f"{name}_pct"] = round(100.0 * ha / total, 2) if total else 0.0
        row["total_ha"] = round(total, 4)
        area_rows.append(row)
    area_df = pd.DataFrame(area_rows)
    area_df.to_csv(TAB_DIR / "area_by_class.csv", index=False)
    plot_stacked_areas(
        area_df[["epoch"] + [class_map[i]["name"] for i in CLASS_IDS]],
        class_map,
        FIG_DIR / "class_area_stacked.png",
    )

    # Transitions + change maps
    px_area = results[0]["pixel_area_m2"]
    for a, b in CHANGE_PAIRS:
        before = classified[a]["classified"]
        after = classified[b]["classified"]
        mat = transition_matrix_ha(before, after, px_area)
        names = [class_map[i]["name"] for i in CLASS_IDS]
        tdf = pd.DataFrame(mat, index=names, columns=names)
        tdf.to_csv(TAB_DIR / f"transition_{a}_{b}.csv")

        theme = change_theme_raster(before, after)
        theme_path = PROC_DIR / f"change_theme_{a}_{b}.tif"
        write_classification(theme_path, theme, classified[a]["profile"])
        plot_change(
            theme,
            f"Change {a} → {b} (built-up gain / veg loss)",
            MAP_DIR / f"change_builtup_gain_veg_loss_{a}_{b}.png",
        )
        print(f"Wrote transition {a}->{b}")

    manifest = {
        "method": "index-seeded RandomForest (sklearn), per-epoch models",
        "features": BAND_NAMES,
        "n_estimators": 200,
        "train_test_split": "70/30 stratified",
        "accuracy_target_oa": cfg.get("accuracy_target_oa", 0.85),
        "epochs": [
            {
                "epoch_id": r["epoch_id"],
                "classified_path": r["classified_path"],
                "training_path": r["training_path"],
                "n_samples": r["n_samples"],
                "overall_accuracy": r["overall_accuracy"],
                "kappa": r["kappa"],
                "areas_ha": r["areas_ha"],
                "seed_pixel_counts": r["seed_pixel_counts"],
            }
            for r in results
        ],
        "change_pairs": [f"{a}_{b}" for a, b in CHANGE_PAIRS],
        "tables": {
            "area_by_class": "outputs/tables/area_by_class.csv",
            "accuracy_by_epoch": "outputs/tables/accuracy_by_epoch.csv",
        },
    }
    with (PROC_DIR / "classification_manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("Phase 3 complete.")


if __name__ == "__main__":
    main()
