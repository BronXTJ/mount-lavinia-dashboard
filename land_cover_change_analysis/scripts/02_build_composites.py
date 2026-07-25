"""
Phase 2 — Build dry-season Landsat median composites for ~2000 / ~2015 / ~2025.

Exports GeoTIFFs to data/raw/composites/, RGB previews to outputs/figures/,
and a manifest JSON.
"""

from __future__ import annotations

import json
import sys
import zipfile
from io import BytesIO
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import rasterio
import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from gee.composites import (  # noqa: E402
    EXPORT_BANDS,
    build_median_composite,
    load_aoi,
    load_config,
)
from gee.ee_init import init_ee  # noqa: E402

OUT_DIR = ROOT / "data" / "raw" / "composites"
FIG_DIR = ROOT / "outputs" / "figures"
SCALE = 30
CRS = "EPSG:32644"


def download_geotiff(image, region, out_path: Path) -> None:
    """Download a small AOI composite as GeoTIFF via Earth Engine."""
    import ee

    out_path.parent.mkdir(parents=True, exist_ok=True)
    params = {
        "name": out_path.stem,
        "bands": EXPORT_BANDS,
        "region": region,
        "scale": SCALE,
        "crs": CRS,
        "format": "GEO_TIFF",
        "filePerBand": False,
    }
    url = image.getDownloadURL(params)
    resp = requests.get(url, timeout=600)
    resp.raise_for_status()
    content = resp.content

    # EE sometimes returns a zip even for GEO_TIFF
    if content[:2] == b"PK":
        with zipfile.ZipFile(BytesIO(content)) as zf:
            tif_names = [n for n in zf.namelist() if n.lower().endswith(".tif")]
            if not tif_names:
                raise RuntimeError(f"No GeoTIFF in zip for {out_path.name}: {zf.namelist()}")
            data = zf.read(tif_names[0])
            out_path.write_bytes(data)
    else:
        out_path.write_bytes(content)


def write_rgb_preview(tif_path: Path, png_path: Path, title: str) -> None:
    with rasterio.open(tif_path) as ds:
        # bands: blue, green, red, ... -> RGB = 3,2,1
        red = ds.read(3).astype(np.float32)
        green = ds.read(2).astype(np.float32)
        blue = ds.read(1).astype(np.float32)

    def stretch(band: np.ndarray) -> np.ndarray:
        valid = band[np.isfinite(band)]
        if valid.size == 0:
            return np.zeros_like(band)
        lo, hi = np.percentile(valid, (2, 98))
        if hi <= lo:
            hi = lo + 1e-6
        out = np.clip((band - lo) / (hi - lo), 0, 1)
        out = np.where(np.isfinite(band), out, 0)
        return out

    rgb = np.dstack([stretch(red), stretch(green), stretch(blue)])
    fig, ax = plt.subplots(figsize=(6, 7), dpi=150)
    ax.imshow(rgb)
    ax.set_title(title)
    ax.axis("off")
    png_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(png_path, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)


def verify_tif(path: Path) -> dict:
    with rasterio.open(path) as ds:
        return {
            "path": str(path.relative_to(ROOT)).replace("\\", "/"),
            "crs": str(ds.crs),
            "width": ds.width,
            "height": ds.height,
            "count": ds.count,
            "dtypes": [str(d) for d in ds.dtypes],
            "bounds": list(ds.bounds),
        }


def main() -> None:
    init_ee()
    cfg = load_config()
    aoi = load_aoi(cfg)
    months = cfg["season"]["months"]
    buffer_m = 300.0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    FIG_DIR.mkdir(parents=True, exist_ok=True)

    import ee

    export_region = aoi.buffer(buffer_m).bounds()
    manifest = {
        "project": cfg["gee_project_id"],
        "scale_m": SCALE,
        "crs": CRS,
        "buffer_m": buffer_m,
        "bands": EXPORT_BANDS,
        "epochs": [],
    }

    for epoch in cfg["epochs"]:
        print(f"Building composite {epoch['id']} ({epoch['label']}) ...")
        composite, meta = build_median_composite(epoch, aoi, months, buffer_m=buffer_m)
        if meta["image_count"] == 0:
            raise RuntimeError(
                f"No clear Landsat scenes for {epoch['id']} "
                f"({epoch['start']} to {epoch['end']}). Widen the window in config.json."
            )

        tif_path = OUT_DIR / f"composite_{epoch['id']}.tif"
        png_path = FIG_DIR / f"composite_{epoch['id']}_rgb.png"

        print(f"  scenes={meta['image_count']}  exporting {tif_path.name} ...")
        download_geotiff(composite, export_region, tif_path)
        write_rgb_preview(tif_path, png_path, f"GN5 RGB composite {epoch['label']}")
        info = verify_tif(tif_path)

        meta.update(
            {
                "export_path": info["path"],
                "preview_path": str(png_path.relative_to(ROOT)).replace("\\", "/"),
                "raster": info,
            }
        )
        manifest["epochs"].append(meta)
        print(f"  wrote {info['path']} ({info['width']}x{info['height']}, {info['count']} bands)")

    manifest_path = OUT_DIR / "composite_manifest.json"
    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote {manifest_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
