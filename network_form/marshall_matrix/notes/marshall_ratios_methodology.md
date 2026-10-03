# Marshall structural ratios

Ratios in this note use confirmed classifications only. Uncertain cases are listed in `marshall_uncertainties.csv` and are excluded from T, X, Cells, and Culs.

Unflagged T and X junctions stay as stored in `marshall_junctions.gpkg`. The junction review then removes original T or X nodes whose final class is not `CONFIRMED_T` or `CONFIRMED_X`. Endpoints, bends, rejected junctions, and unresolved crossings are not counted. Cells and cul-de-sacs are the genuine rows only. GN-boundary clip ends, rejected candidates, and uncertain candidates are not counted.

The study-area row sums those confirmed counts. The five GN divisions are not dissolved. No network cleaning, snapping, polygonization, or junction detection was repeated.

T-ratio = T / (T + X). X-ratio = X / (T + X). Cell-ratio = Cells / (Cells + Culs). Cul-ratio = Culs / (Cells + Culs). Each pair sums to 1.

The Marshall matrix is not calculated. These ratios are not interpreted as residential, commercial, accessible, inaccessible, good, or bad.

## Ratios

| GN | T | X | T_ratio | X_ratio | Cells | Culs | Cell_ratio | Cul_ratio |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mount Lavinia | 111 | 11 | 0.9098360656 | 0.0901639344 | 21 | 67 | 0.2386363636 | 0.7613636364 |
| Kawdana West | 76 | 4 | 0.9500000000 | 0.0500000000 | 5 | 56 | 0.0819672131 | 0.9180327869 |
| Watarappala | 74 | 8 | 0.9024390244 | 0.0975609756 | 8 | 44 | 0.1538461538 | 0.8461538462 |
| Wathumulla | 56 | 4 | 0.9333333333 | 0.0666666667 | 10 | 38 | 0.2083333333 | 0.7916666667 |
| Wedikanda | 77 | 6 | 0.9277108434 | 0.0722891566 | 8 | 54 | 0.1290322581 | 0.8709677419 |
| TOTAL | 394 | 33 | 0.9227166276 | 0.0772833724 | 52 | 259 | 0.1672025723 | 0.8327974277 |

## Excluded uncertainties

| kind | id | GN | reason |
|---|---|---|---|

## Nested cells

The Phase 2 check runs inside `scripts/network_form/06_marshall_matrix_ml_gn.py` on the 109 cells produced after the boundary-buffer cell stream. For each GN, every cell polygon in EPSG:3857 is tested with Shapely `within()` against every other cell in that GN. A cell is nested when its polygon lies entirely inside another cell. The recorded parent is the smallest containing cell. The outer cell's stored geometry is then `difference()` of that inner polygon, so the published GeoJSON is a ring with a hole and the stored area is not counted twice.

Both the inner cell and the outer cell still count in `n_cell_marshall`. Each is a separate enclosed block. Nesting changes the outer polygon's shape and area. It does not drop either cell from the Marshall cell count.

Result of this run: **no nested pairs**. `n_cells_nested` is 0 in all five GN divisions (Mount Lavinia 35 cells, Kawdana West 18, Watarappala 21, Wathumulla 17, Wedikanda 18). Every feature in `public/data/network-form/marshall/cells_all.geojson` has `nested_in: null`. The audit table `network_form/marshall_matrix/results/tables/marshall_cells_nesting.csv` has a header and no data rows.

A second check, centroid-inside plus at least 95% area overlap, also found no near-misses. The three Phase 0 suspects (MC0026 in Kawdana West, MC0049 and MC0051 in Wedikanda) do not sit inside another cell in this cell set. Those cells come from disconnected road components that are beside the larger blocks, not inside them.

This nesting section records the geometric audit of the boundary-buffer cell set. It does not replace the confirmed ratios in the table above. Those confirmed ratios now include MC0052, so the study-area cell total is 52.

## Phase 3 — internal road gaps

The cell stream snaps road vertices to a metre grid before `polygonize`. A larger grid can join endpoints that sit a few metres apart. Junction counting stays on `SNAP_M = 1.0`. Only the cell stream uses `SNAP_M_CELL`.

The extended test uses the same 80 m buffered road set as Phase 1. Face counts after the 100 m² and 50% overlap filters:

| GN | 1 m | 2 m | 3 m | 5 m | 7 m | 10 m | 15 m | 20 m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mount Lavinia | 35 | 37 | 34 | 34 | 35 | 32 | 30 | 26 |
| Kawdana West | 18 | 19 | 19 | 18 | 18 | 18 | 15 | 17 |
| Watarappala | 21 | 21 | 21 | 21 | 21 | 21 | 20 | 21 |
| Wathumulla | 17 | 16 | 16 | 18 | 17 | 16 | 17 | 13 |
| Wedikanda | 18 | 18 | 18 | 18 | 16 | 15 | 18 | 15 |

The 1 m column matches the Phase 1 cell counts exactly. Source table: `network_form/marshall_matrix/results/tables/snap_tolerance_test_extended.csv`.

`SNAP_M_CELL` stays **1.0 m**. At 2 m, Mount Lavinia gains 2 cells and Kawdana West gains 1, but Wathumulla loses 1. At 3 m and 5 m, Mount Lavinia falls to 34, below its 1 m count. No snap of 5 m or less raises every GN without dropping another. A coarser grid also collapses short edges, so the extra faces are not a clean recovery of missing blocks.

No new cells were added. The published counts remain Mount Lavinia 35, Kawdana West 18, Watarappala 21, Wathumulla 17, Wedikanda 18 (109 total). The smallest cell is 206 m². `SNAP_M` for junctions remains 1.0 m.

## Phase 4 — C0054

Candidate C0054 (Wedikanda, 4,294.13 m², segments S0840, S0877, S0880, S0921, S0922) was the only uncertain cell after Phase 0. Every boundary segment belongs to dual-carriageway case D017. D001 and D002, which produced rejected cells C0002 and C0003, are narrow carriageway pairs (2.75 m and 5.1 m) marked `manual_review` with high confidence. D017 is recorded in `dual_carriageways.csv` as parallel streets, `treatment=kept_separate`, confidence low, separation 23.7 m. That separation is a block width, not a median. C0054 is therefore a genuine enclosed block.

C0054 is now `GENUINE_CELL` with cell id MC0052 in `marshall_cell_review.csv`, `marshall_cell_candidates.csv`, `marshall_cells_final.csv`, and the `cell_candidates` layer of `marshall_cells_culs.gpkg`. `marshall_uncertainties.csv` stays empty.

Phase 5 re-ran the confirmed-count pipeline. The ratio table at the top of this note includes MC0052. Wedikanda has 8 cells and 54 cul-de-sacs, so Cell-ratio = 8 / 62 = 0.1290322581. The study-area cell total is 52 and Cell-ratio = 52 / 311 = 0.1672025723.

