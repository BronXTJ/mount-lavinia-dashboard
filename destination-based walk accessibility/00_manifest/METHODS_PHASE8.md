# Phase 8+ — Snap baseline now 100 m

## Purpose (updated)

The live Walk Accessibility dashboard baseline is **100 m** snap tolerance.
`scenarios/snap_50m/` remains the narrower sensitivity archive; `scenarios/snap_100m/`
mirrors package-root Phase 2–5 outputs used for publish.

## Locked defaults (current)

| Item | Value |
|------|-------|
| Primary / dashboard | **100 m** |
| Sensitivity | **50 m** under `scenarios/snap_50m/` |
| Package-root snap | `SNAP_TOL_M = 100` in `scripts/06_prepare_origins_snaps.py` |

## Historical note

Original Phase 8 re-ran an isolated **100 m** sensitivity while the dashboard stayed on
**50 m**. That product decision was reversed: 100 m is now primary.

## Validation

`python 00_manifest/validate_phase8.py` → **PASS** (package / public / snap_100m at 100 m;
snap_50m at 50 m; 100 m hex_snap_ok ≥ 50 m).

## Done when

- Package-root snap tolerance is 100 m
- Dashboard publish matches package mean
- `snap_100m` archive matches package
- `snap_50m` retained as sensitivity
- Compare rebuilt; validator prints **PASS**
