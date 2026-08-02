# Destination-based walk accessibility — findings

## Method (one line)

Network walk distance/time from primary hexes to six daily destination groups at **4.8 km/h**, with KPI set **`area_ratio>=0.90 AND snap_ok=true`** (341 hexes).

## Key results

| Metric | Value |
|--------|-------|
| Analysis hexes | 341 |
| Mean access_score | 0.872 |
| Deserts (≤2 groups / 10 min) | 29 (8.5%) |
| High / medium / low / excluded | 272 / 40 / 29 / 106 |
| Centrality–access mismatch | 5 |

### 10-minute coverage by group

| Group | Within 10 min | Median dist (m) |
|-------|---------------|-----------------|
| food | 99.4% | 155.495 |
| education | 82.7% | 435.013 |
| health | 80.3% | 556.74 |
| transit | 89.7% | 455.474 |
| finance | 88.0% | 409.19 |
| open_space | 83.0% | 498.92 |

## Draft synthesis cards

### WA1 — Food Access Is Strong; Health and Education Lag

**Observation**
- Among 341 analysis hexes (area_ratio≥0.90 and snapped within 100 m), mean destination access_score is 0.872.
- Within a 10-minute walk, food coverage is 99.4% while health is 80.3% and education is 82.7%.
- Transit (89.7%), finance (88.0%), and open space (83.0%) sit between those extremes.

**Interpretation**
- Daily retail/food destinations are already dense relative to other essential services.
- Health and education remain the thinnest 10-minute destination groups, so ‘accessibility’ is uneven by function rather than uniformly poor.
- Five-minute coverage is much lower for health/education than for food, so short-trip equity gaps are sharper than 10-minute totals alone suggest.

**Implication**
- Prioritise pharmacies/clinics and school-adjacent walking links where 10-minute health/education reach is weakest.
- Do not treat high food coverage as proof that all daily needs are walkable.
- Use map03 (time by group) and map04 (coverage bars) to target service insertion or crossing upgrades.

### WA2 — Destination Deserts Are Localized

**Observation**
- 29 analysis hexes are low-tier deserts (groups_within_10 ≤ 2), about 8.5% of the analysis set.
- Tier among all 447 hexes: high 272, medium 40, low 29, excluded 106.
- Excluded cells are incomplete (<90% area) or unsnapped (>100 m from the walk network); they remain mapped but are outside KPI denominators.

**Interpretation**
- Most of the primary area already reaches five or more destination groups within 10 minutes.
- Deserts are concentrated pockets, not an area-wide failure of walk access.
- Treating only legacy is_edge cells as ‘invalid’ would mis-state the problem; the analysis_ok gate keeps near-complete boundary hexes in the evidence.

**Implication**
- Treat the 29 desert hexes as priority zones for missing daily destinations or safer walk links into existing clusters.
- Keep deserts visible on map02 alongside high-access fabric so interventions stay place-specific.
- Re-check deserts after any POI inventory update (health/education especially).

### WA3 — A Few High-Betweenness Cells Still Lack Daily Destinations

**Observation**
- 5 analysis hexes combine top-quartile mean BtA5000 with access_score < 0.5.
- These cells sit on structurally important movement corridors but still fail to reach half of the six destination groups within 10 minutes.
- This is the spatial bridge to synthesis finding F8 (network centrality concentrates pressure).

**Interpretation**
- Network importance (space-syntax betweenness) is not the same as destination reach.
- UMI ‘accessibility’ (~0.11 from NQPDA/BtA) measures network potential; destination walk scores measure lived reach to services.
- Mismatch hexes show where movement spines still under-serve daily needs.

**Implication**
- Put service insertion, sidewalk continuity, and shade packages first on mismatch corridors (map05).
- When updating F8/F15, cite destination walk results alongside centrality so ‘accessibility lag’ is not read as network topology alone.
- Avoid assuming high betweenness streets already have complete daily amenity catchments.

## UMI accessibility vs destination reach

UMI accessibility (~0.11) is normalized NQPDA5000/BtA5000 network potential; destination access_score is share of six daily groups within a 10-minute network walk.

Destination walk results should update the F8/F15 story: network centrality can be high while lived reach to health/education (and desert pockets) still lags.

## Design priorities

1. **Close health and education 10-minute gaps** — Weakest groups at 10 min: health 80.3%, education 82.7%.
2. **Target the 29 destination-desert hexes for service insertion or walk-link upgrades** — Localized low-tier cells with ≤2 destination groups within 10 minutes.
3. **Upgrade the 5 centrality–access mismatch corridors** — High betweenness with weak destination reach — align with F8 pressure corridors.
4. **Keep food/retail strength while diversifying essential services** — Food already at 99.4% within 10 min; do not mistake that for full daily access.

## Map index

| Id | File |
|----|------|
| `map01_access_score` | `map01_access_score.png` |
| `map02_access_tiers_deserts` | `map02_access_tiers_deserts.png` |
| `map03_time_by_group` | `map03_time_by_group.png` |
| `map04_coverage_10min` | `map04_coverage_10min.png` |
| `map05_centrality_mismatch` | `map05_centrality_mismatch.png` |

Figures live under `06_maps/` (`map01_access_score.png` … `map05_centrality_mismatch.png`).
