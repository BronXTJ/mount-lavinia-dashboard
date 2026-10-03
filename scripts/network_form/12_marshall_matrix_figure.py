#!/usr/bin/env python3
"""Plot the Marshall matrix from stored GN ratios. Does not recalculate ratios."""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = ROOT / "network_form" / "marshall_matrix"
RATIOS_CSV = OUT_ROOT / "results" / "tables" / "marshall_ratios_by_gn.csv"
COORD_CSV = OUT_ROOT / "results" / "tables" / "marshall_matrix_coordinates.csv"
FIG_PNG = OUT_ROOT / "results" / "figures" / "marshall_matrix_gn.png"
FIG_SVG = OUT_ROOT / "results" / "figures" / "marshall_matrix_gn.svg"
NOTE_PATH = OUT_ROOT / "notes" / "marshall_matrix_methodology.md"

GN_ORDER = [
    "Mount Lavinia",
    "Kawdana West",
    "Watarappala",
    "Wathumulla",
    "Wedikanda",
]
COLORS = {
    "Mount Lavinia": "#38bdf8",
    "Kawdana West": "#f59e0b",
    "Watarappala": "#a78bfa",
    "Wathumulla": "#34d399",
    "Wedikanda": "#fb7185",
}
LABEL_OFFSETS = {
    "Mount Lavinia": (48, 12),
    "Kawdana West": (78, -20),
    "Watarappala": (52, 4),
    "Wathumulla": (-92, 8),
    "Wedikanda": (52, -6),
}
SUM_TOLERANCE = 1e-9


def load_rows() -> list[dict]:
    with RATIOS_CSV.open(newline="", encoding="utf-8") as handle:
        rows = [row for row in csv.DictReader(handle) if row["GN"] != "TOTAL"]
    found = [row["GN"] for row in rows]
    if found != GN_ORDER:
        raise RuntimeError(f"Expected {GN_ORDER}, found {found}")
    for row in rows:
        x_ratio = float(row["X_ratio"])
        t_ratio = float(row["T_ratio"])
        cell_ratio = float(row["Cell_ratio"])
        cul_ratio = float(row["Cul_ratio"])
        if abs((x_ratio + t_ratio) - 1.0) > SUM_TOLERANCE:
            raise RuntimeError(f"{row['GN']} T-ratio + X-ratio is not 1")
        if abs((cell_ratio + cul_ratio) - 1.0) > SUM_TOLERANCE:
            raise RuntimeError(f"{row['GN']} Cell-ratio + Cul-ratio is not 1")
    return rows


def write_coordinates(rows: list[dict]) -> None:
    COORD_CSV.parent.mkdir(parents=True, exist_ok=True)
    with COORD_CSV.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["GN", "X_ratio", "T_ratio", "Cell_ratio", "Cul_ratio"],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row[key] for key in writer.fieldnames})


def draw(rows: list[dict]) -> None:
    FIG_PNG.parent.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 11,
            "axes.labelsize": 12,
            "axes.titlesize": 13,
        }
    )
    figure, axis = plt.subplots(figsize=(8.2, 8.2), dpi=160)
    axis.set_xlim(0, 1)
    axis.set_ylim(0, 1)
    axis.set_xlabel("X-ratio")
    axis.set_ylabel("Cell-ratio")
    axis.set_xticks([0, 0.25, 0.5, 0.75, 1])
    axis.set_yticks([0, 0.25, 0.5, 0.75, 1])
    axis.tick_params(direction="out", length=4, width=0.6, colors="#334155")
    for spine in axis.spines.values():
        spine.set_color("#334155")
        spine.set_linewidth(0.8)

    top = axis.twiny()
    top.set_xlim(1, 0)
    top.set_xticks([0, 0.25, 0.5, 0.75, 1])
    top.set_xlabel("T-ratio")
    top.tick_params(direction="out", length=4, width=0.6, colors="#334155")
    for spine in top.spines.values():
        spine.set_color("#334155")
        spine.set_linewidth(0.8)

    right = axis.twinx()
    right.set_ylim(1, 0)
    right.set_yticks([0, 0.25, 0.5, 0.75, 1])
    right.set_ylabel("Cul-ratio")
    right.tick_params(direction="out", length=4, width=0.6, colors="#334155")
    for spine in right.spines.values():
        spine.set_color("#334155")
        spine.set_linewidth(0.8)

    corners = (
        (0.38, 0.045, "T-tree", "left", "bottom"),
        (0.02, 0.96, "T-cell", "left", "top"),
        (0.80, 0.045, "X-tree", "right", "bottom"),
        (0.98, 0.96, "X-cell", "right", "top"),
    )
    for x_pos, y_pos, label, ha, va in corners:
        axis.text(
            x_pos,
            y_pos,
            label,
            transform=axis.transAxes,
            ha=ha,
            va=va,
            fontsize=11,
            color="#64748b",
        )

    for row in rows:
        name = row["GN"]
        x_ratio = float(row["X_ratio"])
        cell_ratio = float(row["Cell_ratio"])
        axis.scatter(
            [x_ratio],
            [cell_ratio],
            s=46,
            color=COLORS[name],
            edgecolors="#0f172a",
            linewidths=0.6,
            zorder=3,
            label=name,
        )
        dx, dy = LABEL_OFFSETS[name]
        axis.annotate(
            name,
            xy=(x_ratio, cell_ratio),
            xytext=(dx, dy),
            textcoords="offset points",
            fontsize=9,
            color="#0f172a",
            arrowprops={"arrowstyle": "-", "color": "#64748b", "lw": 0.6},
            zorder=4,
        )

    axis.legend(
        loc="center",
        bbox_to_anchor=(0.62, 0.55),
        frameon=False,
        fontsize=9,
        handletextpad=0.4,
        borderpad=0.2,
    )
    axis.set_title("Marshall matrix")
    figure.subplots_adjust(left=0.12, right=0.86, bottom=0.1, top=0.88)
    figure.savefig(FIG_PNG, dpi=200)
    figure.savefig(FIG_SVG)
    plt.close(figure)


def write_note(rows: list[dict]) -> None:
    lines = "\n".join(
        f"| {row['GN']} | {row['X_ratio']} | {row['T_ratio']} | {row['Cell_ratio']} | {row['Cul_ratio']} |"
        for row in rows
    )
    text = f"""# Marshall matrix

The figure uses the stored ratios in `marshall_ratios_by_gn.csv`. Those ratios are not recalculated here.

1. The horizontal position is X-ratio. T-ratio is the complementary scale on the top, because T-ratio + X-ratio = 1. The vertical position is Cell-ratio. Cul-ratio is the complementary scale on the right, because Cell-ratio + Cul-ratio = 1.
2. The ratios come from confirmed classifications only.
3. One candidate (C0054, Wedikanda) was uncertain after Phase 0 review and excluded from initial ratios. Resolved in Phase 4 as GENUINE_CELL (MC0052); see marshall_ratios_methodology.md Phase 4 section. No junction or cul-de-sac uncertainties remain.
4. The five GN divisions are plotted individually. The summed study-area row is not a point.
5. The matrix describes street-network morphology: T/X structure on the junction dimension, and cell/cul structure on the network dimension. The corner names T-tree, T-cell, X-tree, and X-cell mark those conceptual combinations. They are not bins, and no point is given a category.
6. The analysis does not incorporate accessibility, land use, density, or Space Syntax.

## Coordinates

| GN | X_ratio | T_ratio | Cell_ratio | Cul_ratio |
|---|---:|---:|---:|---:|
{lines}

No categorical label is assigned. All five points sit toward low X-ratio and low Cell-ratio, which is the T-tree corner of this layout. That is a description of position, not a threshold classification.
"""
    NOTE_PATH.parent.mkdir(parents=True, exist_ok=True)
    NOTE_PATH.write_text(text, encoding="utf-8")


def main() -> None:
    rows = load_rows()
    write_coordinates(rows)
    draw(rows)
    write_note(rows)
    for row in rows:
        print(
            f"{row['GN']}: X {row['X_ratio']} T {row['T_ratio']} "
            f"Cell {row['Cell_ratio']} Cul {row['Cul_ratio']}"
        )


if __name__ == "__main__":
    main()
