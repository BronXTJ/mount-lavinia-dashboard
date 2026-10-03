#!/usr/bin/env python3
"""Sync Network Form Overview assets from published Marshall morphology.

Run after 14_publish_marshall_geometries.py so Overview map/metrics match Marshall
site-review junctions and cul counts. Does not re-run 01_build_network_form_scopes.py;
junction_spacing_m and corridor_vs_interior stay from the last full Network Form build.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NF = ROOT / "public" / "data" / "network-form"
MARSHALL = NF / "marshall"
SCOPES = MARSHALL / "marshall_scopes.json"
METRICS = NF / "metrics_by_scope.json"
CLASSIFIED = NF / "junctions_classified.geojson"
MANIFESTS = [
    ROOT / "src" / "data" / "assetManifest.json",
    ROOT / "public" / "data" / "manifest.json",
]
GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]


def refresh_hash(relative: str, path: Path) -> None:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    for manifest_path in MANIFESTS:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        files = manifest.setdefault("files", {})
        files[relative] = digest
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def ratio_pair(part: int, other: int) -> tuple[float, float]:
    total = part + other
    if total <= 0:
        return 0.0, 0.0
    return part / total, other / total


def sync_metrics(metrics: dict, scopes: list[dict]) -> None:
    totals = {"n_T": 0, "n_X": 0, "n_cul": 0}
    for scope in scopes:
        gn = scope["gn_name"]
        if gn not in metrics:
            raise RuntimeError(f"metrics_by_scope missing {gn}")
        n_t = int(scope["counts"]["n_T"])
        n_x = int(scope["counts"]["n_X"])
        n_cul = int(scope["counts"]["n_cul_marshall"])
        totals["n_T"] += n_t
        totals["n_X"] += n_x
        totals["n_cul"] += n_cul
        row = metrics[gn]
        row["counts"]["n_three_way"] = n_t
        row["counts"]["n_four_way"] = n_x
        row["counts"]["n_culdesac"] = n_cul
        row["counts"]["n_junctions"] = n_t + n_x
        x_share, t_share = ratio_pair(n_x, n_t)
        row["four_way_share"] = round(x_share, 4)
        row["three_way_share"] = round(t_share, 4)
        row["four_to_three_raw"] = f"{n_x} : {n_t}"
        row["four_to_three_ratio"] = f"{x_share:.2f} : {t_share:.2f}"
        area = float(row.get("gn_area_km2") or 0)
        if area > 0:
            row["culdesac_per_km2"] = round(n_cul / area, 2)

    if "all" in metrics:
        row = metrics["all"]
        n_t, n_x, n_cul = totals["n_T"], totals["n_X"], totals["n_cul"]
        row["counts"]["n_three_way"] = n_t
        row["counts"]["n_four_way"] = n_x
        row["counts"]["n_culdesac"] = n_cul
        row["counts"]["n_junctions"] = n_t + n_x
        x_share, t_share = ratio_pair(n_x, n_t)
        row["four_way_share"] = round(x_share, 4)
        row["three_way_share"] = round(t_share, 4)
        row["four_to_three_raw"] = f"{n_x} : {n_t}"
        row["four_to_three_ratio"] = f"{x_share:.2f} : {t_share:.2f}"
        area = float(row.get("gn_area_km2") or 0)
        if area > 0:
            row["culdesac_per_km2"] = round(n_cul / area, 2)


def build_classified(junction_fc: dict, cul_fc: dict) -> dict:
    features = []
    for feat in junction_fc.get("features", []):
        props = feat.get("properties", {})
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "node_id": props.get("node_id"),
                    "degree": 4 if props.get("jtype") == "four_way" else 3,
                    "jtype": props.get("jtype"),
                    "gn_name": props.get("gn_name"),
                    "inside_primary": True,
                    "inside_gn": True,
                    "in_corridor": False,
                },
                "geometry": feat.get("geometry"),
            }
        )
    for feat in cul_fc.get("features", []):
        props = feat.get("properties", {})
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "node_id": props.get("node_id"),
                    "degree": 1,
                    "jtype": "culdesac",
                    "gn_name": props.get("gn_name"),
                    "inside_primary": True,
                    "inside_gn": True,
                    "in_corridor": False,
                },
                "geometry": feat.get("geometry"),
            }
        )
    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    scopes_doc = json.loads(SCOPES.read_text(encoding="utf-8"))
    scopes = scopes_doc.get("scopes", [])
    metrics = json.loads(METRICS.read_text(encoding="utf-8"))
    sync_metrics(metrics, scopes)
    METRICS.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")

    junction_fc = json.loads((MARSHALL / "junctions_marshall.geojson").read_text(encoding="utf-8"))
    cul_fc = json.loads((MARSHALL / "culdesacs_marshall.geojson").read_text(encoding="utf-8"))
    classified = build_classified(junction_fc, cul_fc)
    CLASSIFIED.write_text(json.dumps(classified), encoding="utf-8")

    refresh_hash("network-form/metrics_by_scope.json", METRICS)
    refresh_hash("network-form/junctions_classified.geojson", CLASSIFIED)
    print(f"Synced metrics_by_scope and {len(classified['features'])} classified junction features")


if __name__ == "__main__":
    main()
