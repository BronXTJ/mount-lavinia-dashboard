#!/usr/bin/env python3
"""Phase 5 gate: validate maturation UMI layer. Exit 0 only on PASS."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = PACKAGE_ROOT / "05_maturation" / "maturation_primary_hex.geojson"
SUMMARY_PATH = PACKAGE_ROOT / "05_maturation" / "maturation_primary_summary.json"

EXPECTED_COUNT = 447
REQUIRED = [
    "id",
    "is_edge",
    "entropy_raw",
    "entropy_norm",
    "accessibility",
    "landuse_div",
    "umi",
    "mixed_use",
    "shannon_entropy",
    "is_valid_maturation",
    "1entropy_i",
    "1normalize",
    "1average_c",
    "1normali_1",
    "1landuse_d",
    "1normali_2",
    "1urban mat",
    " final_ent",
    " final_mui",
]
TOL = 0.0015


def nearly_equal(a: float, b: float, tol: float = TOL) -> bool:
    return abs(a - b) <= max(tol, 1e-3 * abs(b) if b else tol)


def main() -> int:
    errors: list[str] = []
    print(f"Package root: {PACKAGE_ROOT}")
    print("--- Phase 5 validation ---")

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
    valid_entropy_norms = []
    valid_count = 0

    for i, feat in enumerate(features):
        p = feat.get("properties") or {}
        missing = [k for k in REQUIRED if k not in p]
        if missing:
            errors.append(f"Feature {i}: missing {missing}")
            continue

        if bool(p["is_edge"]):
            edge_count += 1

        entropy_raw = float(p["entropy_raw"])
        entropy_norm = float(p["entropy_norm"])
        accessibility = float(p["accessibility"])
        landuse_div = float(p["landuse_div"])
        umi = float(p["umi"])
        is_valid = bool(p["is_valid_maturation"])

        expected_umi = (entropy_norm + accessibility + landuse_div) / 3.0
        if not nearly_equal(umi, expected_umi):
            errors.append(f"id={p['id']}: UMI != mean of 3 components")

        # Alias consistency
        if not nearly_equal(float(p["1urban mat"]), umi):
            errors.append(f"id={p['id']}: alias 1urban mat mismatch")
        if not nearly_equal(float(p["1normalize"]), entropy_norm):
            errors.append(f"id={p['id']}: alias 1normalize mismatch")
        if not nearly_equal(float(p["1average_c"]), accessibility):
            errors.append(f"id={p['id']}: alias 1average_c mismatch")
        if not nearly_equal(float(p["1landuse_d"]), landuse_div):
            errors.append(f"id={p['id']}: alias 1landuse_d mismatch")

        expected_valid = (not bool(p["is_edge"])) and entropy_raw > 0 and accessibility > 0
        if is_valid != expected_valid:
            errors.append(f"id={p['id']}: is_valid_maturation flag mismatch")

        if is_valid:
            valid_count += 1
            if not (0 <= entropy_norm <= 1 + 1e-6):
                errors.append(f"id={p['id']}: entropy_norm outside [0,1]")
            if not (0 <= accessibility <= 1 + 1e-6):
                errors.append(f"id={p['id']}: accessibility outside [0,1]")
            valid_entropy_norms.append(entropy_norm)

        if len(errors) > 40:
            break

    if edge_count == 0:
        errors.append("Expected some edge cells")

    if valid_entropy_norms:
        if abs(max(valid_entropy_norms) - 1.0) > TOL:
            errors.append(
                f"max valid entropy_norm should be 1, got {max(valid_entropy_norms)}"
            )
    else:
        errors.append("No valid maturation cells")

    with SUMMARY_PATH.open(encoding="utf-8") as f:
        summary = json.load(f)
    if summary.get("feature_count") != n:
        errors.append(
            f"Summary feature_count {summary.get('feature_count')} != geojson n={n}"
        )

    print()
    print(f"OK maturation file n={n} bytes={OUT_PATH.stat().st_size}")
    print(f"OK edge={edge_count} valid={valid_count}")
    if valid_entropy_norms:
        print(f"OK max entropy_norm={max(valid_entropy_norms)}")
    print("OK UMI = mean of three components")
    print("OK dashboard aliases present")

    if errors:
        print()
        print("FAIL - Phase 5 validation errors:")
        for err in errors[:30]:
            print(f"  - {err}")
        if len(errors) > 30:
            print(f"  ... and {len(errors) - 30} more")
        return 1

    print()
    print("PASS - Phase 5 maturation layer is valid.")
    print(f"  hexes={n} edge={edge_count} valid={valid_count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
