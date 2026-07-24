"""Shared Earth Engine initialization for this project."""

from __future__ import annotations

import json
from pathlib import Path

import ee

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config.json"
DEFAULT_PROJECT = "mount-lavinia-based-analyses"


def load_gee_project_id() -> str:
    if CONFIG_PATH.exists():
        with CONFIG_PATH.open(encoding="utf-8") as f:
            cfg = json.load(f)
        return cfg.get("gee_project_id", DEFAULT_PROJECT)
    return DEFAULT_PROJECT


def init_ee(project: str | None = None) -> str:
    """Initialize the Earth Engine API. Returns the project ID used."""
    project_id = project or load_gee_project_id()
    ee.Initialize(project=project_id)
    return project_id


if __name__ == "__main__":
    pid = init_ee()
    info = ee.Image("USGS/SRTMGL1_003").getInfo()
    print(f"project={pid}")
    print(f"smoke_test={info['type']}")
