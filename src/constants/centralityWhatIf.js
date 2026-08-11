/** Centrality Analysis — What-if Links mode. */

export const WHAT_IF_MODES = {
  baseline: 'baseline',
  whatIf: 'whatIf',
}

export const WHAT_IF_DRAW_TOOLS = {
  pan: 'pan',
  pencil: 'pencil',
}

export const WHAT_IF_PROPOSED_COLOR = '#f97316'
export const WHAT_IF_SNAP_COLOR = '#38bdf8'
export const WHAT_IF_RUBBER_COLOR = '#fb923c'

/** Magnetic snap radius in Leaflet CSS pixels. */
export const WHAT_IF_SNAP_PX = 14

export const WHAT_IF_SCENARIO_ID = 'beach_connectors'

export function whatIfDataUrl(relPath) {
  return `${import.meta.env.BASE_URL}data/urban-morpho/what-if/${relPath}`
}

export function whatIfScenarioUrl(scenarioId, fileName) {
  return whatIfDataUrl(`scenarios/${scenarioId}/${fileName}`)
}

export const DEFAULT_WHAT_IF_VISIBLE = {
  closeness: true,
  betweenness: false,
  roadLabels: false,
  proposedLinks: true,
  snapNodes: true,
}

export const WHAT_IF_FAB_EXTRA_LAYERS = [
  { id: 'proposedLinks', label: 'Proposed Links', dot: WHAT_IF_PROPOSED_COLOR },
  { id: 'snapNodes', label: 'Snap Nodes', dot: WHAT_IF_SNAP_COLOR },
]

export const WHAT_IF_STATUS = {
  draft: 'draft',
  readyDemo: 'readyDemo',
  loading: 'loading',
  scenario: 'scenario',
  needsCompute: 'needsCompute',
  error: 'error',
}
