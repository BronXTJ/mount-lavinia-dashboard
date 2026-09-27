#!/usr/bin/env python3
"""Copy stored Marshall ratios into the dashboard JSON. Does not recalculate them."""

from __future__ import annotations

import csv
import hashlib
import json
import shutil
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RATIOS = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "marshall_ratios_by_gn.csv"
UNCERTAIN = ROOT / "network_form" / "marshall_matrix" / "results" / "tables" / "marshall_uncertainties.csv"
SVG_SRC = ROOT / "network_form" / "marshall_matrix" / "results" / "figures" / "marshall_matrix_gn.svg"
PUBLIC = ROOT / "public" / "data" / "network-form" / "marshall"
SCOPES = PUBLIC / "marshall_scopes.json"
SVG_DEST = PUBLIC / "marshall_matrix_gn.svg"
MANIFESTS = [
    ROOT / "src" / "data" / "assetManifest.json",
    ROOT / "public" / "data" / "manifest.json",
]
EXPECTED_ML = (108, 13, 21, 65)


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


def uncertainty_counts() -> dict:
    with UNCERTAIN.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    counts = {"junctions": 0, "cells": 0, "cul_de_sacs": 0}
    for row in rows:
        kind = row["kind"]
        if kind == "junction":
            counts["junctions"] += 1
        elif kind == "cell":
            counts["cells"] += 1
        elif kind == "cul-de-sac":
            counts["cul_de_sacs"] += 1
        else:
            raise RuntimeError(f"Unexpected uncertainty kind: {kind}")
    if counts != {"junctions": 3, "cells": 1, "cul_de_sacs": 2}:
        raise RuntimeError(f"Unexpected uncertainty counts: {counts}")
    return counts


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
    document["uncertainty"] = uncertainty_counts()
    SCOPES.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
    shutil.copyfile(SVG_SRC, SVG_DEST)
    refresh_hash("network-form/marshall/marshall_scopes.json", SCOPES)
    print(f"Wrote {SCOPES.name} and {SVG_DEST.name}")


if __name__ == "__main__":
    main()
