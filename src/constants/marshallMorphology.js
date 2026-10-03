/** Network Form — Marshall morphology (Mount Lavinia GN, Marshall 2005). */

export const NETWORK_FORM_MODE_OVERVIEW = 'overview'
export const NETWORK_FORM_MODE_MARSHALL = 'marshall'

export const MARSHALL_GN_NAME = 'Mount Lavinia'
export const MARSHALL_GN_PCODE = 'LK1131005'

export const MARSHALL_CELL_FILL = '#22c55e'
export const MARSHALL_CELL_STROKE = '#16a34a'

export const MARSHALL_CELL_SELECTED_STROKE = '#86efac'
export const MARSHALL_CELL_FILL_OPACITY = 0.28

export const MARSHALL_LAYER_CELLS = 'marshall_cells'

export const MARSHALL_INFO_POINTS = [
  'Each GN division is one dot on the matrix. The counts follow the division you select.',
  'Counts and ratios come from the validated Marshall street network. They are not recomputed in the dashboard.',
  'This view does not show space syntax, accessibility, centrality, land use, or density.',
]

export const MARSHALL_MATRIX_INFO = [
  'Each colored dot is one GN division. Positions use stored Marshall ratios—we do not recalculate them here.',
  'How to read a dot: farther down-left means more T-junctions and fewer cells; farther up-right means more X-junctions and more cells.',
  'Axes: bottom is X-ratio, top is T-ratio (together they make 100%). Left is Cell-ratio, right is Cul-ratio (together they make 100%).',
  'Compact vs Expand: compact zooms the bottom and left scales to 0–0.5 so dots are easier to compare; Expand shows the full 0–1 chart. Dots stay in the same place.',
  'Why you sometimes see 1.00: on the chart edge, T or Cul can read 1.00 where X or Cell is 0—that is the scale, not your GN values. All five GNs sit near the bottom-left (a few percent on X and Cell).',
  'Corner labels (T-tree, X-cell, etc.) are orientation hints only—not scores or zones.',
  'Click a dot for that GN’s counts and ratios; Escape or click outside to close. The highlighted dot matches the GN chip above the map. Same numbers appear in GN Comparison below and formulas on the Definitions card (right). The study-area total is not a dot on this chart.',
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
  'Mount Lavinia': '#e3d85d',
  'Kawdana West': '#e6d8b8',
  Watarappala: '#0cf7e4',
  Wathumulla: '#bf6ffc',
  Wedikanda: '#21e7eb',
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
