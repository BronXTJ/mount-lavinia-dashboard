#!/usr/bin/env python3
"""Phase 4 gate: validate density hex metrics. Exit 0 only on PASS."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = PACKAGE_ROOT / "04_density" / "density_primary_hex.geojson"
SUMMARY_PATH = PACKAGE_ROOT / "04_density" / "density_primary_summary.json"

EXPECTED_COUNT = 447
REQUIRED = [
    "id",
    "row_index",
    "col_index",
    "left",
    "right",
    "top",
    "bottom",
    "is_edge",
    "Hex_area",
    "Area_build",
    "Floor_Area",
    "GSI",
    "FSI",
    "OSR",
    "GSI_Norm",
    "FSI_Norm",
    "Density_V",
]
TOL = 0.0015


def nearly_equal(a: float, b: float, tol: float = TOL) -> bool:
    """Absolute tolerance, with relative slack for large magnitudes (rounding)."""
    return abs(a - b) <= max(tol, 1e-3 * abs(b))


def main() -> int:
    errors: list[str] = []
    print(f"Package root: {PACKAGE_ROOT}")
    print("--- Phase 4 validation ---")

    if not OUT_PATH.exists() or OUT_PATH.stat().st_size <= 0:
        errors.append(f"MISSING or empty: {OUT_PATH}")
    if not SUMMARY_PATH.exists():
        errors.append(f"MISSING summary: {SUMMARY_PATH}")
    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1

    with OUT_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    features = data.get("features") or []
    n = len(features)
    if n != EXPECTED_COUNT:
        errors.append(f"COUNT expected {EXPECTED_COUNT}, got {n}")

    edge_count = 0
    valid_fsi_norms = []
    valid_gsi_norms = []

    for i, feat in enumerate(features):
        p = feat.get("properties") or {}
        missing = [k for k in REQUIRED if k not in p]
        if missing:
            errors.append(f"Feature {i}: missing {missing}")
            continue

        is_edge = bool(p["is_edge"])
        if is_edge:
            edge_count += 1

        hex_area = float(p["Hex_area"])
        area_build = float(p["Area_build"])
        floor_area = float(p["Floor_Area"])
        gsi = float(p["GSI"])
        fsi = float(p["FSI"])
        osr = p["OSR"]
        fsi_norm = float(p["FSI_Norm"])
        gsi_norm = float(p["GSI_Norm"])
        density_v = float(p["Density_V"])

        if hex_area > 0:
            if not nearly_equal(gsi, area_build / hex_area):
                errors.append(f"id={p['id']}: GSI formula mismatch")
            if not nearly_equal(fsi, floor_area / hex_area):
                errors.append(f"id={p['id']}: FSI formula mismatch")

        if floor_area > 0:
            expected_osr = (hex_area - area_build) / floor_area
            if osr is None:
                errors.append(f"id={p['id']}: OSR null but Floor_Area > 0")
            elif not nearly_equal(float(osr), expected_osr):
                errors.append(f"id={p['id']}: OSR formula mismatch")
        else:
            if osr is not None:
                errors.append(f"id={p['id']}: OSR should be null when Floor_Area==0")

        expected_dv = 0.5 * (fsi_norm + gsi_norm)
        if not nearly_equal(density_v, expected_dv):
            errors.append(f"id={p['id']}: Density_V != 0.5*(FSI_Norm+GSI_Norm)")

        # Valid-cell checks for norms
        osr_ok = osr is not None and float(osr) >= 0
        is_valid = (
            (not is_edge)
            and hex_area > 0
            and fsi > 0
            and gsi > 0
            and osr_ok
        )
        if is_valid:
            if not (0 <= fsi_norm <= 1 + 1e-6 and 0 <= gsi_norm <= 1 + 1e-6):
                errors.append(f"id={p['id']}: valid-cell norms outside [0,1]")
            valid_fsi_norms.append(fsi_norm)
            valid_gsi_norms.append(gsi_norm)

        if len(errors) > 50:
            break

    if edge_count == 0:
        errors.append("Expected some edge cells (is_edge=true)")

    if valid_fsi_norms:
        if abs(max(valid_fsi_norms) - 1.0) > TOL:
            errors.append(f"max valid FSI_Norm should be 1, got {max(valid_fsi_norms)}")
        if abs(max(valid_gsi_norms) - 1.0) > TOL:
            errors.append(f"max valid GSI_Norm should be 1, got {max(valid_gsi_norms)}")
    else:
        errors.append("No valid cells found for norm checks")

    with SUMMARY_PATH.open(encoding="utf-8") as f:
        summary = json.load(f)
    if summary.get("feature_count") != n:
        errors.append(
            f"Summary feature_count {summary.get('feature_count')} != geojson n={n}"
        )

    print()
    print(f"OK density file n={n} bytes={OUT_PATH.stat().st_size}")
    print(f"OK edge_count={edge_count} valid_norm_cells={len(valid_fsi_norms)}")
    if valid_fsi_norms:
        print(
            f"OK max FSI_Norm={max(valid_fsi_norms)} max GSI_Norm={max(valid_gsi_norms)}"
        )
    print("OK formula checks (GSI/FSI/OSR/Density_V)")
    print("OK required fields present")

    if errors:
        print()
        print("FAIL - Phase 4 validation errors:")
        for err in errors[:30]:
            print(f"  - {err}")
        if len(errors) > 30:
            print(f"  ... and {len(errors) - 30} more")
        return 1

    print()
    print("PASS - Phase 4 density metrics layer is valid.")
    print(f"  hexes={n} edge={edge_count} valid={len(valid_fsi_norms)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
