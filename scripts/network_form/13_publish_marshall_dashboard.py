#!/usr/bin/env python3
"""Copy stored Marshall ratios into the dashboard JSON. Does not recalculate them."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import shutil
from decimal import Decimal
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parents[2]
RATIOS = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "marshall_ratios_by_gn.csv"
UNCERTAIN = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "marshall_uncertainties.csv"
JUNCTION_REVIEW = (
    ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "marshall_junction_review.csv"
)
CROSSINGS = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "crossings.csv"
CUL_REVIEW = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "marshall_cul_review.csv"
READY_GPKG = ROOT / "network_form" / "marshall_matrix" / "data" / "processed" / "roads_marshall_ready.gpkg"
SVG_SRC = ROOT / "network_form" / "marshall_matrix" / "results" / "figures" / "marshall_matrix_gn.svg"
PUBLIC = ROOT / "public" / "data" / "network-form" / "marshall"
SCOPES = PUBLIC / "marshall_scopes.json"
SVG_DEST = PUBLIC / "marshall_matrix_gn.svg"
MANIFESTS = [
    ROOT / "src" / "data" / "assetManifest.json",
    ROOT / "public" / "data" / "manifest.json",
]
EXPECTED_ML = (115, 9, 21, 64)


def as_number(text: str):
    value = Decimal(text)
    if value == value.to_integral():
        return int(value)
    return float(value)


def load_ratios() -> tuple[list[dict], dict]:
    with RATIOS.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    gn_rows = [row for row in rows if row["GN"] != "TOTAL"]
    total = next(row for row in rows if row["GN"] == "TOTAL")
    return gn_rows, total


def apply_row(scope: dict, row: dict) -> None:
    scope["counts"] = {
        "n_T": as_number(row["T"]),
        "n_X": as_number(row["X"]),
        "n_cell_marshall": as_number(row["Cells"]),
        "n_cul_marshall": as_number(row["Culs"]),
    }
    scope["ratios"] = {
        "T_ratio": as_number(row["T_ratio"]),
        "X_ratio": as_number(row["X_ratio"]),
        "Cell_ratio": as_number(row["Cell_ratio"]),
        "Cul_ratio": as_number(row["Cul_ratio"]),
    }
    scope["matrix"] = {
        "x_ratio": scope["ratios"]["X_ratio"],
        "y_cell_ratio": scope["ratios"]["Cell_ratio"],
    }


def junction_display_id(row: dict) -> str:
    crossing = (row.get("reason") or "").split(" ", 1)[0]
    if crossing.startswith("C") and row.get("id"):
        return f"{row['id']} / {crossing}"
    return row["id"]


def load_junction_coords() -> dict[str, tuple[float, float]]:
    with JUNCTION_REVIEW.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    out: dict[str, tuple[float, float]] = {}
    for row in rows:
        jid = row["junction_id"]
        lon = float(row["x"])
        lat = float(row["y"])
        out[jid] = (lat, lon)
    return out


def load_crossing_coords() -> dict[str, tuple[float, float]]:
    with CROSSINGS.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    return {row["crossing_id"]: (float(row["lat"]), float(row["lon"])) for row in rows}


def load_cul_segment_refs() -> dict[str, str]:
    with CUL_REVIEW.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    return {row["cul_id"]: row["street_segment_id"] for row in rows}


def segment_midpoint_lat_lng(streets: gpd.GeoDataFrame, segment_id: str) -> tuple[float, float]:
    match = streets[streets["segment_id"] == segment_id]
    if match.empty:
        raise RuntimeError(f"Segment {segment_id} not found in {READY_GPKG}")
    geom = match.iloc[0].geometry
    point = geom.interpolate(0.5, normalized=True)
    return float(point.y), float(point.x)


def cul_coords_from_segments(streets: gpd.GeoDataFrame, segment_refs: str) -> tuple[float, float]:
    ids = [part.strip() for part in segment_refs.split("|") if part.strip()]
    if not ids:
        raise RuntimeError(f"Empty segment_refs: {segment_refs}")
    lats: list[float] = []
    lngs: list[float] = []
    for seg_id in ids:
        lat, lng = segment_midpoint_lat_lng(streets, seg_id)
        lats.append(lat)
        lngs.append(lng)
    return sum(lats) / len(lats), sum(lngs) / len(lngs)


def crossing_id_from_reason(reason: str) -> str | None:
    match = re.search(r"\b(C\d{4})\b", reason or "")
    return match.group(1) if match else None


def coords_for_case(
    row: dict,
    junction_coords: dict[str, tuple[float, float]],
    crossing_coords: dict[str, tuple[float, float]],
    cul_segment_refs: dict[str, str],
    streets: gpd.GeoDataFrame,
) -> tuple[float, float]:
    kind = row["kind"]
    primary_id = row["id"]
    if kind == "junction":
        if primary_id not in junction_coords:
            raise RuntimeError(f"Missing junction coords for {primary_id}")
        return junction_coords[primary_id]
    if kind == "cell":
        if primary_id not in crossing_coords:
            raise RuntimeError(f"Missing crossing coords for cell {primary_id}")
        return crossing_coords[primary_id]
    if kind == "cul-de-sac":
        crossing_id = crossing_id_from_reason(row.get("reason") or "")
        if crossing_id and crossing_id in crossing_coords:
            return crossing_coords[crossing_id]
        refs = cul_segment_refs.get(primary_id)
        if not refs:
            raise RuntimeError(f"Missing cul segment refs for {primary_id}")
        return cul_coords_from_segments(streets, refs)
    raise RuntimeError(f"Unexpected uncertainty kind: {kind}")


def uncertainty_block() -> dict:
    with UNCERTAIN.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    junction_coords = load_junction_coords()
    crossing_coords = load_crossing_coords()
    cul_segment_refs = load_cul_segment_refs()
    streets = gpd.read_file(READY_GPKG, layer="streets")

    counts = {"junctions": 0, "cells": 0, "cul_de_sacs": 0}
    excluded_cases = []
    for row in rows:
        kind = row["kind"]
        primary_id = row["id"]
        if kind == "junction":
            counts["junctions"] += 1
            case_id = junction_display_id(row)
        elif kind == "cell":
            counts["cells"] += 1
            case_id = primary_id
        elif kind == "cul-de-sac":
            counts["cul_de_sacs"] += 1
            case_id = primary_id
        else:
            raise RuntimeError(f"Unexpected uncertainty kind: {kind}")
        lat, lng = coords_for_case(row, junction_coords, crossing_coords, cul_segment_refs, streets)
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise RuntimeError(f"Invalid lat/lng for {kind} {primary_id}: {lat}, {lng}")
        entry = {
            "kind": kind,
            "id": case_id,
            "primary_id": primary_id,
            "lat": round(lat, 7),
            "lng": round(lng, 7),
        }
        excluded_cases.append(entry)
    if counts != {"junctions": 0, "cells": 1, "cul_de_sacs": 0}:
        raise RuntimeError(f"Unexpected uncertainty counts: {counts}")
    if len(excluded_cases) != 1:
        raise RuntimeError(f"Expected 1 excluded case, got {len(excluded_cases)}")
    return {**counts, "excluded_cases": excluded_cases}


def refresh_hash(relative: str, path: Path) -> None:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    for manifest_path in MANIFESTS:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        files = manifest.get("files")
        if not isinstance(files, dict) or relative not in files:
            raise RuntimeError(f"{relative} is missing from {manifest_path}")
        files[relative] = digest
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    gn_rows, total = load_ratios()
    document = json.loads(SCOPES.read_text(encoding="utf-8"))
    by_name = {row["GN"]: row for row in gn_rows}
    if [scope["gn_name"] for scope in document["scopes"]] != list(by_name):
        raise RuntimeError("GN order in marshall_scopes.json does not match the ratio table")
    for scope in document["scopes"]:
        apply_row(scope, by_name[scope["gn_name"]])
        if "quadrant" in scope.get("matrix", {}):
            raise RuntimeError("quadrant was not removed")
    ml = document["scopes"][0]["counts"]
    found = (ml["n_T"], ml["n_X"], ml["n_cell_marshall"], ml["n_cul_marshall"])
    if found != EXPECTED_ML:
        raise RuntimeError(f"Mount Lavinia counts {found} do not match {EXPECTED_ML}")
    document["study_area"] = {
        "label": "Study area",
        "counts": {
            "n_T": as_number(total["T"]),
            "n_X": as_number(total["X"]),
            "n_cell_marshall": as_number(total["Cells"]),
            "n_cul_marshall": as_number(total["Culs"]),
        },
        "ratios": {
            "T_ratio": as_number(total["T_ratio"]),
            "X_ratio": as_number(total["X_ratio"]),
            "Cell_ratio": as_number(total["Cell_ratio"]),
            "Cul_ratio": as_number(total["Cul_ratio"]),
        },
    }
    document["uncertainty"] = uncertainty_block()
    SCOPES.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
    shutil.copyfile(SVG_SRC, SVG_DEST)
    refresh_hash("network-form/marshall/marshall_scopes.json", SCOPES)
    print(f"Wrote {SCOPES.name} and {SVG_DEST.name}")


if __name__ == "__main__":
    main()
