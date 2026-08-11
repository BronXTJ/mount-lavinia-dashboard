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
/** Soft outer halo so newly added (post-sDNA) segments stay identifiable. */
export const WHAT_IF_NEW_GLOW_COLOR = '#ffffff'

/** Magnetic snap radius in Leaflet CSS pixels. */
export const WHAT_IF_SNAP_PX = 14

/** Default folder name when writing local sDNA scenario outputs (user-chosen). */
export const WHAT_IF_SCENARIO_ID = 'custom'

/** Local FastAPI worker (Windows + sDNA). Used by deployed Pages UI via CORS. */
export const WHAT_IF_WORKER_BASE = 'http://127.0.0.1:8787'

export function whatIfDataUrl(relPath) {
  return `${import.meta.env.BASE_URL}data/urban-morpho/what-if/${relPath}`
}

export function whatIfScenarioUrl(scenarioId, fileName) {
  return whatIfDataUrl(`scenarios/${scenarioId}/${fileName}`)
}

export function whatIfWorkerArtifactUrl(jobId, fileName) {
  return `${WHAT_IF_WORKER_BASE}/v1/jobs/${jobId}/artifacts/${fileName}`
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
  loading: 'loading',
  computing: 'computing',
  scenario: 'scenario',
  needsCompute: 'needsCompute',
  error: 'error',
}
