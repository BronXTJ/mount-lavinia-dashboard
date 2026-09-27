/** Network Form — Marshall morphology (Mount Lavinia GN, Marshall 2005). */

export const NETWORK_FORM_MODE_OVERVIEW = 'overview'
export const NETWORK_FORM_MODE_MARSHALL = 'marshall'

export const MARSHALL_GN_NAME = 'Mount Lavinia'
export const MARSHALL_GN_PCODE = 'LK1131005'

export const MARSHALL_CELL_FILL = '#22c55e'
export const MARSHALL_CELL_STROKE = '#16a34a'
export const MARSHALL_CELL_FILL_OPACITY = 0.28

export const MARSHALL_LAYER_CELLS = 'marshall_cells'

export const MARSHALL_INFO_POINTS = [
  'Each GN division is one dot on the matrix. The counts follow the division you select.',
  'Counts and ratios come from the validated Marshall street network. They are not recomputed in the dashboard.',
  'This view does not show space syntax, accessibility, centrality, land use, or density.',
]

export const MARSHALL_MATRIX_INFO = [
  'The horizontal axis is X-ratio. T-ratio is the complementary share, because T-ratio + X-ratio = 1.',
  'The vertical axis is Cell-ratio. Cul-ratio is the complementary share, because Cell-ratio + Cul-ratio = 1.',
  'The corner names T-tree, T-cell, X-tree, and X-cell describe structural combinations. They are not a ranking.',
]

export const MARSHALL_JUNCTION_INFO = [
  'A T-junction is three distinct street approaches. An X-junction is four distinct street approaches.',
  'T-ratio = T / (T + X). X-ratio = X / (T + X).',
]

export const MARSHALL_STRUCTURE_INFO = [
  'A cell is a structural unit enclosed by street segments.',
  'A cul-de-sac is a genuine internal dead-end street. GN-boundary clip ends are not counted.',
  'The 100 m hexagonal grid is not used as Marshall cells.',
  'Cell-ratio = Cells / (Cells + Culs). Cul-ratio = Culs / (Cells + Culs).',
]

export const MARSHALL_RATIO_INFO = [
  'Each figure is a share of the confirmed counts, shown as a percentage.',
  'T-ratio = T / (T + X). X-ratio = X / (T + X).',
  'Cell-ratio = Cells / (Cells + Culs). Cul-ratio = Culs / (Cells + Culs).',
]

export const MARSHALL_REFERENCE_INFO = [
  'These three numbers are the Network Form counts for the same GN. They are a comparison, not Marshall counts.',
  'Network Form counts every dead-end. Marshall leaves out dead-ends on the GN boundary.',
  'A Network Form 3-way is not always the same junction as a Marshall T-junction, because the two analyses connect the streets differently.',
]

export const MARSHALL_METHOD_INFO = [
  'T-ratio = T / (T + X). X-ratio = X / (T + X).',
  'Cell-ratio = Cells / (Cells + Culs). Cul-ratio = Culs / (Cells + Culs).',
  'A T-junction has three distinct street approaches. An X-junction has four.',
  'A cell is enclosed by street segments. A cul-de-sac is an internal dead end. Boundary clip ends are excluded.',
  'The 100 m hexagonal grid is not a Marshall cell. This view does not measure space syntax or accessibility.',
]

export const MARSHALL_INTERPRETATION =
  'All five GN divisions occupy the low X-ratio and low Cell-ratio side of the Marshall Matrix, indicating a predominantly T-junction and tree-like street-network structure. The GN divisions nevertheless show variation in their exact positions within this structural range.'

export const MARSHALL_GN_COLORS = {
  'Mount Lavinia': '#38bdf8',
  'Kawdana West': '#f59e0b',
  Watarappala: '#a78bfa',
  Wathumulla: '#34d399',
  Wedikanda: '#fb7185',
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
