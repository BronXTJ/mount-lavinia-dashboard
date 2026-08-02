# Snap sensitivity — 50 m vs 100 m

## Purpose

Measure how destination walk accessibility changes when hex/POI snap tolerance
narrows from **100 m** (locked baseline used by the dashboard) to **50 m**
(analysis-only sensitivity archive).

## Current baseline

Package-root and live publish use **100 m** snap (`SNAP_TOL_M` in
`scripts/06_prepare_origins_snaps.py`). The **50 m** chain is kept under
`scenarios/snap_50m/` for compare only.

See also [`METHODS_PHASE8.md`](METHODS_PHASE8.md) (historical Phase 8 notes)
and the current `validate_phase8.py` gate (package / public / `snap_100m` = 100 m).

## Isolation rule

[`scripts/06_prepare_origins_snaps.py`](../scripts/06_prepare_origins_snaps.py) mutates
`03_network/network_graph.graphml` in place. Sensitivity runs that must not overwrite
package-root network or origins should use:

```bash
python scripts/10_run_snap_scenario.py --snap-m 50
python scripts/11_compare_snap_scenarios.py
```

Outputs live under:

| Path | Role |
|------|------|
| `scenarios/snap_100m/` | Archive of locked **100 m** Phase 2–5 outputs (matches package / dashboard) |
| `scenarios/snap_50m/` | Sensitivity archive at **50 m** |
| `scenarios/compare/` | KPI table, hex ID diffs, difference map, `COMPARE.md` |

## Dashboard

Live publish is **100 m**:

- `public/data/walk-accessibility/`
- Focus Area → Walk Accessibility (`/focus-area?sub=walk-access`)

## North arrows

Canonical and scenario map figures (map01, map02, map05, map03 shared arrow, compare difference map)
place the north arrow in the **top-right**. map04 (bar chart) has no north arrow.

## Expected reading

100 m snaps more mid-area hexes (fewer empty holes) and matches Sri Lanka road-walking
practice on a 100 m hex grid. 50 m is the stricter sensitivity case: more unsnapped /
Excluded hexes, slightly different desert counts. Treat 100 m as the primary evidence;
cite 50 m as sensitivity.
