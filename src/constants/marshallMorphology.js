/** Network Form — Marshall morphology (Mount Lavinia GN, Marshall 2005). */

import { NETWORK_FORM_ICONS } from './networkForm.js'

export const NETWORK_FORM_MODE_OVERVIEW = 'overview'
export const NETWORK_FORM_MODE_MARSHALL = 'marshall'

export const MARSHALL_GN_NAME = 'Mount Lavinia'
export const MARSHALL_GN_PCODE = 'LK1131005'

export const MARSHALL_CELL_FILL = '#22c55e'
export const MARSHALL_CELL_STROKE = '#16a34a'

/** Legend-aligned colors for excluded uncertainty cases (data quality panel + map focus). */
export const MARSHALL_EXCLUDED_KIND_COLORS = {
  junction: NETWORK_FORM_ICONS.three_way.color,
  cell: MARSHALL_CELL_FILL,
  'cul-de-sac': NETWORK_FORM_ICONS.culdesac.color,
}
export const MARSHALL_CELL_SELECTED_STROKE = '#86efac'
export const MARSHALL_CELL_FILL_OPACITY = 0.28

export const MARSHALL_LAYER_CELLS = 'marshall_cells'

export const MARSHALL_INFO_POINTS = [
  'Each GN division is one dot on the matrix. The counts follow the division you select.',
  'Counts and ratios come from the validated Marshall street network. They are not recomputed in the dashboard.',
  'This view does not show space syntax, accessibility, centrality, land use, or density.',
]

export const MARSHALL_MATRIX_INFO = [
  'Compact matrix axes are shown from 0 to 0.5 on X and Cell so the five GN dots are easier to compare; Expand shows the full 0–1 Marshall scale. Positions use the same stored ratios in both views.',
  'Each colored dot is one GN division. Its position uses the stored Marshall ratios for that GN; the dashboard does not recompute them.',
  'Horizontal axis: the bottom scale is X-ratio (X-junctions as a share of T + X). The top scale is T-ratio and runs in the opposite direction. T-ratio + X-ratio = 1.',
  'Vertical axis: the left scale is Cell-ratio (Marshall cells as a share of cells + cul-de-sacs). The right scale is Cul-ratio and is complementary. Cell-ratio + Cul-ratio = 1.',
  'At the plot corner where bottom-left reads 0.00 for X and Cell, the opposite scales read 1.00 for T and Cul—that is because T + X = 1 and Cell + Cul = 1 on the same grid lines. It describes the axis edge, not your GN dots. All five GNs sit at low X and low Cell (a few percent), not at 1.00.',
  'Read position: toward the bottom-left means lower X-ratio and lower Cell-ratio (more T-junction, tree-like structure, fewer enclosed cells). Toward the top-right means higher X and higher Cell. All five GNs in this study sit on the low X, low Cell side, with small differences between divisions.',
  'Corner labels T-tree, T-cell, X-tree, and X-cell name structural combinations at the corners. They are guides, not score categories or bins.',
  'Click a GN dot to open a summary card with that division’s stored ratios and counts. Press Escape or click outside to dismiss.',
  'All five Network Form GN divisions appear as dots. The study-area total is not plotted as a point.',
  'The highlighted dot matches the GN you selected above the map. Scroll the left panel to GN Comparison for the same counts and percentages in a table.',
  'For the ratio formulas (T-ratio, X-ratio, Cell-ratio, Cul-ratio), see the Definitions card on the right.',
]

export const MARSHALL_JUNCTION_INFO = [
  'A T-junction has three distinct street approaches; an X-junction has four.',
]

export const MARSHALL_STRUCTURE_INFO = [
  'A cell is enclosed by street segments. A cul-de-sac is an internal dead end.',
  'Dead-ends on the GN boundary clip are not counted as Marshall cul-de-sacs.',
]

export const MARSHALL_RATIO_INFO = [
  'Each figure is a share of the confirmed counts, shown as a percentage.',
  'Formulas are in the Definitions card below.',
]

export const MARSHALL_REFERENCE_INFO = [
  'These three numbers are the Network Form counts for the same GN. They are a comparison, not Marshall counts.',
  'Network Form counts every dead-end. Marshall leaves out dead-ends on the GN boundary.',
  'A Network Form 3-way is not always the same junction as a Marshall T-junction, because the two analyses connect the streets differently.',
]

/** Definitions (i) modal only — not shown on the card body. */
export const MARSHALL_METHOD_INFO = [
  'A T-junction has three distinct street approaches. An X-junction has four.',
  'A cell is enclosed by street segments. A cul-de-sac is an internal dead end. Boundary clip ends are excluded.',
  'The 100 m hexagonal grid is not a Marshall cell. This view does not measure space syntax or accessibility.',
]

export const MARSHALL_UNCERTAINTY_DETAIL = [
  'Uncertain junction crossings, cells, and cul-de-sacs are excluded from the ratio denominators.',
  'Counts use the validated Marshall-ready street network prepared for this study.',
]

export const MARSHALL_INTERPRETATION =
  'Low X · low Cell · five-GN cluster (T-tree), with variation within that range.'

/** GN-only matrix/legend colors; not junction typology or Marshall cell greens on the map. */
export const MARSHALL_GN_COLORS = {
  'Mount Lavinia': '#8b9cf7',
  'Kawdana West': '#e3d85d',
  Watarappala: '#0cf7e4',
  Wathumulla: '#bf6ffc',
  Wedikanda: '#8199fc',
}

/** Default map layers while Marshall morphology is active. */
export const DEFAULT_MARSHALL_VISIBLE = {
  four_way: true,
  three_way: true,
  culdesac: true,
  marshall_cells: true,
  culdesacHex: false,
  culdesacWalk: false,
  culdesacUmi: false,
  roads: true,
  roadLabels: false,
  gnBoundary: true,
}

export function marshallDataUrl(relativePath) {
  return `${import.meta.env.BASE_URL}data/network-form/marshall/${relativePath}`
}
