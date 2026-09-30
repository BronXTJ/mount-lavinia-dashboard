# Marshall morphology — five GN divisions

Stephen Marshall, *Streets and Patterns* (2005), as summarised in van Nes & Yamu, *Introduction to Space Syntax in Urban Studies*, §1.2.3 (Figure 1.11).

This analysis is **not** space syntax. It does not compute integration, choice, depth, accessibility, land use, or GSI/FSI/OSR. Structural **cells** are minimal street-enclosed faces from planar polygonization. They are not GIS hex grids.

## Study unit

| Item | Value |
|------|--------|
| GNs | Mount Lavinia, Kawdana West, Watarappala, Wathumulla, Wedikanda (`ADM4_EN` / `ADM4_PCODE` on each feature) |
| Boundary | `public/data/network-form/gn5_divisions.geojson` (Mount Lavinia is `LK1131005`) |
| Streets | `public/data/network-form/roads_streets.geojson` (Network Form motorable set) |
| Extent | Each GN is clipped and noded on its own polygon (not the 5-GN union and not the 75 m topology buffer) |
| Metric CRS | EPSG:3857 (same projection as `01_build_network_form_scopes.py`) |

## Locked parameters

| Parameter | Value |
|-----------|--------|
| Snap tolerance | 1.0 m |
| Minimum clipped segment | 0.5 m |
| Minimum cell area | 100 m² |
| Boundary cul-de-sac exclusion | degree-1 node within 1.0 m of the GN boundary is **not** a Marshall cul-de-sac |
| Degree ≥ 5 | Counted as **X** (also listed as `n_degree5_plus`) |
| Noding | `shapely.ops.unary_union` on clipped lines so crossings become vertices, then 1 m endpoint snap |

## Graph

After noding and snap:

1. Build an undirected graph on snapped vertices.
2. Collapse degree-2 vertices (bends are not junctions).
3. Classify remaining nodes by degree.

| Class | Rule |
|-------|------|
| T-junction (`n_T`) | degree = 3, point inside the GN |
| X-junction (`n_X`) | degree ≥ 4, point inside the GN |
| Marshall cul-de-sac (`n_cul_marshall`) | degree = 1, inside the GN, farther than 1 m from the boundary |
| Boundary artefact | degree = 1 and within 1 m of the boundary (`n_cul_boundary_excluded`) |

## Cells

`shapely.ops.polygonize` on the snapped, noded linework.

A face counts as a Marshall cell when:

- its representative point lies inside the GN polygon,
- its area is at least 100 m², and
- at least 50% of the face overlaps the GN polygon.

`n_cell_marshall` is that count. Cell markers use the polygon centroid (WGS84) stored on each feature.

## Ratios

Let \(n_{TX} = n_T + n_X\) and \(n_{\text{struct}} = n_{\text{cell}} + n_{\text{cul}}\).

\[
T\text{-ratio} = n_T / n_{TX},\quad
X\text{-ratio} = n_X / n_{TX}
\]

\[
\text{Cell-ratio} = n_{\text{cell}} / n_{\text{struct}},\quad
\text{Cul-ratio} = n_{\text{cul}} / n_{\text{struct}}
\]

The dashboard displays these stored floats. It does not recompute them from rounded percentages.

## Marshall matrix (Figure 1.11)

| Axis | Coordinate | Meaning |
|------|------------|---------|
| Horizontal | \(x =\) Cell-ratio | 0 = cul-dominated, 1 = cell-dominated |
| Vertical | \(y =\) T-ratio | 0 = X-dominated, 1 = T-dominated |

Quadrant (ties at 0.5 go to T and to cell):

| Quadrant | Rule |
|----------|------|
| T-tree | T-ratio ≥ 0.5 and Cell-ratio < 0.5 |
| T-cell | T-ratio ≥ 0.5 and Cell-ratio ≥ 0.5 |
| X-tree | T-ratio < 0.5 and Cell-ratio < 0.5 |
| X-cell | T-ratio < 0.5 and Cell-ratio ≥ 0.5 |

`matrix.x_cell_ratio` equals `ratios.Cell_ratio`. `matrix.y_t_ratio` equals `ratios.T_ratio`.

## Network Form comparison

`comparison_network_form` copies that GN’s dashboard junction counts from `metrics_by_scope.json`. Those counts use a different graph (study-area buffer, no Marshall boundary rule, no structural cells). They are **not** Marshall measures.

If `n_T + n_X` is 0, or `n_cell + n_cul` is 0, the ratios and matrix coordinates are null. They are not stored as 0.

## Outputs

Written by `scripts/network_form/06_marshall_matrix_ml_gn.py` under `public/data/network-form/marshall/`. `marshall_scopes.json` holds one metrics object per GN. Combined GeoJSON layers carry `gn_name` on every feature. The Mount Lavinia files are the same run filtered to that GN. Checked by `scripts/network_form/validate_marshall_ml_gn.py`.

## Site review publish pipeline (Overview sync)

After geometry or site-review overlays (`_site_connect_*`, `_apply_marshall_ml_site_reviews.py`):

```text
11_marshall_ratios.py → 12 → 13 → 14_publish_marshall_geometries.py → 15_sync_network_form_overview_from_marshall.py
```

Step **15** copies Marshall T/X/cul counts into `metrics_by_scope.json` and rebuilds `junctions_classified.geojson` from published Marshall junction/cul layers so the Network Form **Overview** tab matches Marshall Morphology on the map and count-driven stats. Spacing and corridor metrics in `metrics_by_scope.json` are unchanged until a full `01_build_network_form_scopes.py` run.
