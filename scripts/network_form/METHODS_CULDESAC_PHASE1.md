---
uid: 13c31a04-fa03-4c26-a100-1dec0a879f32
kind: element
title: Cul-de-sac Phase 0–1 — Inventory and stub depth
domain: scripts
---

# Cul-de-sac Phase 0–1 — Inventory and stub depth

## Phase 0 — Locked inventory (QC PASS)

Source: `public/data/network-form/junctions_classified.geojson` (`jtype=culdesac`, `inside_primary=true`) matched to `metrics_by_scope.json`.

| Scope | n_culdesac |
|-------|------------|
| Mount Lavinia | 65 |
| Kawdana West | 58 |
| Watarappala | 44 |
| Wathumulla | 38 |
| Wedikanda | 54 |
| **All GN Divisions** | **259** |

Buffer-only cul-de-sacs (`inside_primary=false`, no `gn_name`): 94 — retained on the full topology for network continuity but excluded from primary KPIs.

Definition (unchanged from Network Form build): after 1 m snap and degree-2 collapse, **degree = 1** → cul-de-sac.

## Phase 1 — Stub depth

Script: `scripts/network_form/02_culdesac_depth.py`

Rebuilds the same study-area topology as `01_build_network_form_scopes.py` (GN5 ∪ 75 m buffer streets), then for each cul-de-sac:

| Field | Definition |
|-------|------------|
| `stub_length_m` | Length of the single incident topology edge |
| `neighbor_node_id` | Other endpoint of that edge |
| `neighbor_jtype` | Junction type of the neighbor |
| `dist_to_junction_m` | Shortest network distance to nearest `three_way` or `four_way` |
| `depth_class` | `short` &lt; 50 m · `medium` 50–150 m · `long` &gt; 150 m (by stub length) |

Thresholds sit around local median junction spacing (~50–66 m inside GNs).

### Outputs (`public/data/network-form/`)

- `culdesacs_depth.geojson` — cul-de-sac points with depth attributes
- `culdesac_depth_summary.json` — global + by-GN medians / depth-class counts
- `topology_edges.geojson` — full topology edges (`u`, `v`, `length_m`) refreshed from the same run

### Validation

`python scripts/network_form/validate_culdesac_phase1.py` → **PASS**
