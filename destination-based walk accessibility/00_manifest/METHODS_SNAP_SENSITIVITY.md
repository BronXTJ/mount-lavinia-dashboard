# Snap sensitivity — 50 m vs 100 m

## Purpose

Measure how destination walk accessibility changes when hex/POI snap tolerance
widens from **50 m** (locked baseline used by the dashboard) to **100 m**
(analysis-only sensitivity run).

## Phase 8 refresh

After Phase 7 open_space cleanup, Phase 8 re-ran `snap_100m` and rebuilt
`scenarios/compare/` against the refreshed Phase 7 `snap_50m` archive.
Compare headline KPIs must match the cleaned-inventory 50 m baseline
(mean access_score ~0.873), not the pre-cleanup figures.

See [`METHODS_PHASE8.md`](METHODS_PHASE8.md).

## Isolation rule

[`scripts/06_prepare_origins_snaps.py`](../scripts/06_prepare_origins_snaps.py) mutates
`03_network/network_graph.graphml` in place. The 100 m run **must not** overwrite
package-root network or origins.

Use:

```bash
python scripts/10_run_snap_scenario.py --snap-m 100
python scripts/11_compare_snap_scenarios.py
```

Outputs live under:

| Path | Role |
|------|------|
| `scenarios/snap_50m/` | Archive of locked 50 m Phase 2–5 outputs |
| `scenarios/snap_100m/` | Isolated rebuild + snap 100 m + access + maps + findings |
| `scenarios/compare/` | KPI table, hex ID diffs, difference map, `COMPARE.md` |

## Dashboard

Live publish stays on **50 m**:

- `public/data/walk-accessibility/`
- Focus Area → Walk Accessibility (`/focus-area?sub=walk-access`)

Do not republish from `snap_100m` unless an explicit product decision changes the primary scenario.

## North arrows

Canonical and scenario map figures (map01, map02, map05, map03 shared arrow, compare difference map)
place the north arrow in the **top-right**. map04 (bar chart) has no north arrow.

## Expected reading

100 m usually snaps more mid-area hexes (fewer empty holes). Newly included hexes can be
low-access, so desert count may rise even if mean access score stays similar. Treat 50 m as
the conservative primary evidence; cite 100 m as sensitivity.
