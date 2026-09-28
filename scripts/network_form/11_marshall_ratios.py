#!/usr/bin/env python3
"""Calculate Marshall T/X and cell/cul ratios from stored confirmed classes.

Does not clean the network, snap, polygonize, detect junctions, or build the matrix.
"""

from __future__ import annotations

import csv
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = ROOT / "network_form" / "marshall_matrix"
JUNCTIONS = OUT_ROOT / "data" / "processed" / "marshall_junctions.gpkg"
REVIEWED = OUT_ROOT / "data" / "processed" / "marshall_junctions_reviewed.gpkg"
CELLS_GPKG = OUT_ROOT / "data" / "processed" / "marshall_cells_culs.gpkg"
TABLE_DIR = OUT_ROOT / "results" / "tables"
REVIEW_CSV = TABLE_DIR / "marshall_junction_review_final.csv"
CELLS_CSV = TABLE_DIR / "marshall_cells_final.csv"
CELL_REVIEW_CSV = TABLE_DIR / "marshall_cell_review.csv"
CULS_CSV = TABLE_DIR / "marshall_culs_final.csv"
CUL_REVIEW_CSV = TABLE_DIR / "marshall_cul_review.csv"
RATIOS_CSV = TABLE_DIR / "marshall_ratios_by_gn.csv"
UNCERTAIN_CSV = TABLE_DIR / "marshall_uncertainties.csv"
NOTE_PATH = OUT_ROOT / "notes" / "marshall_ratios_methodology.md"

GN_NAMES = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]
EXPECTED_TX = {
    "Mount Lavinia": (112, 10),
    "Kawdana West": (68, 3),
    "Watarappala": (75, 8),
    "Wathumulla": (55, 4),
    "Wedikanda": (73, 7),
}
EXPECTED_STRUCTURE = {
    "Mount Lavinia": (21, 63),
    "Kawdana West": (5, 58),
    "Watarappala": (8, 44),
    "Wathumulla": (10, 38),
    "Wedikanda": (7, 54),
}
JUNCTION_UNCERTAIN: tuple[str, ...] = ()
CELL_UNCERTAIN = ("C0053",)
CUL_UNCERTAIN: tuple[str, ...] = ()
SUM_TOLERANCE = 1e-9


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def ratio_pair(part: int, other: int) -> tuple[float, float]:
    total = part + other
    if total <= 0:
        raise RuntimeError("Cannot divide ratios by zero")
    left = part / total
    right = other / total
    if abs((left + right) - 1.0) > SUM_TOLERANCE:
        raise RuntimeError(f"Ratio pair {left} + {right} is not 1")
    return left, right


def format_ratio(value: float) -> str:
    return f"{value:.10f}"


def confirmed_junctions() -> dict[str, tuple[int, int]]:
    junctions = gpd.read_file(JUNCTIONS, layer="junctions")
    review_rows = read_csv(REVIEW_CSV)
    reviewed = gpd.read_file(REVIEWED, layer="reviewed_junctions")
    reviewed_class = {row.node_id: row.final_class for row in reviewed.itertuples(index=False)}
    for row in review_rows:
        stored = reviewed_class.get(row["node_id"])
        if stored != row["final_class"]:
            raise RuntimeError(f"{row['node_id']} review CSV and reviewed gpkg disagree")

    drop_ids = {
        row["node_id"]
        for row in review_rows
        if row["previous_class"] in {"T", "X"} and row["final_class"] not in {"CONFIRMED_T", "CONFIRMED_X"}
    }
    counts = {name: {"T": 0, "X": 0} for name in GN_NAMES}
    for row in junctions.itertuples(index=False):
        kind = str(row.classification)
        if kind not in {"T", "X"}:
            continue
        if row.junction_id in drop_ids:
            continue
        if row.GN not in counts:
            raise RuntimeError(f"Unexpected GN on {row.junction_id}: {row.GN}")
        counts[row.GN][kind] += 1
    result = {name: (item["T"], item["X"]) for name, item in counts.items()}
    for name, expected in EXPECTED_TX.items():
        if result[name] != expected:
            raise RuntimeError(f"{name} T/X {result[name]} does not match the review overlay {expected}")
    return result


def count_by_gn(rows: list[dict], id_field: str) -> dict[str, int]:
    counts = {name: 0 for name in GN_NAMES}
    seen = set()
    for row in rows:
        if row[id_field] in seen:
            raise RuntimeError(f"Duplicate {id_field} {row[id_field]}")
        seen.add(row[id_field])
        if row["GN"] not in counts:
            raise RuntimeError(f"Unexpected GN on {row[id_field]}: {row['GN']}")
        counts[row["GN"]] += 1
    return counts


def confirmed_structure() -> dict[str, tuple[int, int]]:
    cell_rows = read_csv(CELLS_CSV)
    cul_rows = read_csv(CULS_CSV)
    cell_counts = count_by_gn(cell_rows, "cell_id")
    cul_counts = count_by_gn(cul_rows, "cul_id")
    gpkg_cells = gpd.read_file(CELLS_GPKG, layer="cell_candidates")
    gpkg_culs = gpd.read_file(CELLS_GPKG, layer="cul_candidates")
    genuine_cells = gpkg_cells[gpkg_cells["classification"] == "GENUINE_CELL"]
    genuine_culs = gpkg_culs[gpkg_culs["classification"] == "GENUINE_CUL"]
    gpkg_cell_counts = count_by_gn(genuine_cells.to_dict("records"), "cell_id")
    gpkg_cul_counts = count_by_gn(genuine_culs.to_dict("records"), "cul_id")
    if cell_counts != gpkg_cell_counts:
        raise RuntimeError(f"Cell CSV {cell_counts} does not match genuine gpkg cells {gpkg_cell_counts}")
    if cul_counts != gpkg_cul_counts:
        raise RuntimeError(f"Cul CSV {cul_counts} does not match genuine gpkg culs {gpkg_cul_counts}")
    result = {name: (cell_counts[name], cul_counts[name]) for name in GN_NAMES}
    for name, expected in EXPECTED_STRUCTURE.items():
        if result[name] != expected:
            raise RuntimeError(f"{name} cells/culs {result[name]} does not match confirmed counts {expected}")
    return result


def uncertainty_rows() -> list[dict]:
    junction_review = {row["node_id"]: row for row in read_csv(REVIEW_CSV)}
    cell_review = {row["candidate_id"]: row for row in read_csv(CELL_REVIEW_CSV)}
    cul_review = {row["cul_id"]: row for row in read_csv(CUL_REVIEW_CSV)}
    rows = []
    for node_id in JUNCTION_UNCERTAIN:
        source = junction_review.get(node_id)
        if source is None or source["final_class"] != "UNCERTAIN":
            raise RuntimeError(f"{node_id} is not an unresolved junction in the review table")
        rows.append(
            {
                "kind": "junction",
                "id": node_id,
                "GN": source["GN"],
                "reason": source["reason"],
                "excluded_from_ratios": "yes",
            }
        )
    for candidate_id in CELL_UNCERTAIN:
        source = cell_review.get(candidate_id)
        if source is None or source["classification"] != "UNCERTAIN":
            raise RuntimeError(f"{candidate_id} is not an uncertain cell in the review table")
        rows.append(
            {
                "kind": "cell",
                "id": candidate_id,
                "GN": source["GN"],
                "reason": source["reason"],
                "excluded_from_ratios": "yes",
            }
        )
    for cul_id in CUL_UNCERTAIN:
        source = cul_review.get(cul_id)
        if source is None or source["classification"] != "UNCERTAIN":
            raise RuntimeError(f"{cul_id} is not an uncertain cul-de-sac in the review table")
        rows.append(
            {
                "kind": "cul-de-sac",
                "id": cul_id,
                "GN": source["GN"],
                "reason": source["reason"],
                "excluded_from_ratios": "yes",
            }
        )
    return rows


def ratio_rows(tx: dict[str, tuple[int, int]], structure: dict[str, tuple[int, int]]) -> list[dict]:
    names = GN_NAMES + ["TOTAL"]
    totals = {
        "TOTAL": (
            sum(tx[name][0] for name in GN_NAMES),
            sum(tx[name][1] for name in GN_NAMES),
            sum(structure[name][0] for name in GN_NAMES),
            sum(structure[name][1] for name in GN_NAMES),
        )
    }
    rows = []
    for name in names:
        if name == "TOTAL":
            t_count, x_count, cells, culs = totals["TOTAL"]
        else:
            t_count, x_count = tx[name]
            cells, culs = structure[name]
        t_ratio, x_ratio = ratio_pair(t_count, x_count)
        cell_ratio, cul_ratio = ratio_pair(cells, culs)
        rows.append(
            {
                "GN": name,
                "T": t_count,
                "X": x_count,
                "T_ratio": format_ratio(t_ratio),
                "X_ratio": format_ratio(x_ratio),
                "Cells": cells,
                "Culs": culs,
                "Cell_ratio": format_ratio(cell_ratio),
                "Cul_ratio": format_ratio(cul_ratio),
            }
        )
    return rows


def write_note(rows: list[dict], uncertainties: list[dict]) -> None:
    ratio_lines = "\n".join(
        f"| {row['GN']} | {row['T']} | {row['X']} | {row['T_ratio']} | {row['X_ratio']} | {row['Cells']} | {row['Culs']} | {row['Cell_ratio']} | {row['Cul_ratio']} |"
        for row in rows
    )
    uncertain_lines = "\n".join(
        f"| {row['kind']} | {row['id']} | {row['GN']} | {row['reason']} |" for row in uncertainties
    )
    text = f"""# Marshall structural ratios

Ratios in this note use confirmed classifications only. Uncertain cases are listed in `marshall_uncertainties.csv` and are excluded from T, X, Cells, and Culs.

Unflagged T and X junctions stay as stored in `marshall_junctions.gpkg`. The junction review then removes original T or X nodes whose final class is not `CONFIRMED_T` or `CONFIRMED_X`. Endpoints, bends, rejected junctions, and unresolved crossings are not counted. Cells and cul-de-sacs are the genuine rows only. GN-boundary clip ends, rejected candidates, and uncertain candidates are not counted.

The study-area row sums those confirmed counts. The five GN divisions are not dissolved. No network cleaning, snapping, polygonization, or junction detection was repeated.

T-ratio = T / (T + X). X-ratio = X / (T + X). Cell-ratio = Cells / (Cells + Culs). Cul-ratio = Culs / (Cells + Culs). Each pair sums to 1.

The Marshall matrix is not calculated. These ratios are not interpreted as residential, commercial, accessible, inaccessible, good, or bad.

## Ratios

| GN | T | X | T_ratio | X_ratio | Cells | Culs | Cell_ratio | Cul_ratio |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
{ratio_lines}

## Excluded uncertainties

| kind | id | GN | reason |
|---|---|---|---|
{uncertain_lines}
"""
    NOTE_PATH.parent.mkdir(parents=True, exist_ok=True)
    NOTE_PATH.write_text(text, encoding="utf-8")


def main() -> None:
    tx = confirmed_junctions()
    structure = confirmed_structure()
    rows = ratio_rows(tx, structure)
    uncertainties = uncertainty_rows()
    if len(uncertainties) != 1:
        raise RuntimeError(f"Expected 1 uncertainty row, found {len(uncertainties)}")
    write_csv(
        RATIOS_CSV,
        rows,
        ["GN", "T", "X", "T_ratio", "X_ratio", "Cells", "Culs", "Cell_ratio", "Cul_ratio"],
    )
    write_csv(
        UNCERTAIN_CSV,
        uncertainties,
        ["kind", "id", "GN", "reason", "excluded_from_ratios"],
    )
    write_note(rows, uncertainties)
    for row in rows:
        print(
            f"{row['GN']}: T {row['T']} X {row['X']} "
            f"T_ratio {row['T_ratio']} X_ratio {row['X_ratio']} "
            f"Cells {row['Cells']} Culs {row['Culs']} "
            f"Cell_ratio {row['Cell_ratio']} Cul_ratio {row['Cul_ratio']}"
        )


if __name__ == "__main__":
    main()
