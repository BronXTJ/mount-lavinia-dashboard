/** Centrality Analysis — What-if Links mode. */

export const WHAT_IF_MODES = {
  baseline: 'baseline',
  whatIf: 'whatIf',
}

/** URL search param on /focus-area?sub=centrality — persists Baseline vs What-if across refresh. */
export const CENTRALITY_MODE_SEARCH_PARAM = 'centralityMode'

/** sessionStorage fallback when the URL param is missing (e.g. after sidebar navigation). */
export const CENTRALITY_MODE_SESSION_KEY = 'ml.centrality.mode'

export function centralityModeFromSearchParams(params) {
  const value = params?.get(CENTRALITY_MODE_SEARCH_PARAM)
  return value === WHAT_IF_MODES.whatIf ? WHAT_IF_MODES.whatIf : WHAT_IF_MODES.baseline
}

export function searchParamsToRecord(params) {
  if (!params) return {}
  return Object.fromEntries(params.entries())
}

/** Merge Baseline / What-if into a search-param record; optionally pin sub=centrality. */
export function mergeCentralityModeIntoSearchRecord(record, mode, { ensureCentralitySub = false } = {}) {
  const next = { ...record }
  if (ensureCentralitySub) next.sub = 'centrality'
  if (mode === WHAT_IF_MODES.whatIf) {
    next[CENTRALITY_MODE_SEARCH_PARAM] = WHAT_IF_MODES.whatIf
  } else {
    delete next[CENTRALITY_MODE_SEARCH_PARAM]
  }
  return next
}

/** Read mode from URL first, then sessionStorage. */
export function readPersistedCentralityMode() {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const urlValue = urlParams.get(CENTRALITY_MODE_SEARCH_PARAM)
    if (urlValue === WHAT_IF_MODES.whatIf) return WHAT_IF_MODES.whatIf
    if (urlValue === WHAT_IF_MODES.baseline) return WHAT_IF_MODES.baseline
    const stored = sessionStorage.getItem(CENTRALITY_MODE_SESSION_KEY)
    if (stored === WHAT_IF_MODES.whatIf) return WHAT_IF_MODES.whatIf
  } catch {
    /* ignore */
  }
  return WHAT_IF_MODES.baseline
}

export function writePersistedCentralityMode(mode) {
  try {
    if (mode === WHAT_IF_MODES.whatIf) {
      sessionStorage.setItem(CENTRALITY_MODE_SESSION_KEY, WHAT_IF_MODES.whatIf)
    } else {
      sessionStorage.removeItem(CENTRALITY_MODE_SESSION_KEY)
      writePersistedWhatIfView(WHAT_IF_VIEWS.draw)
    }
  } catch {
    /* ignore */
  }
}

/** Draw (default What-if) vs Compare workspace. Omit URL param = draw. */
export const WHAT_IF_VIEWS = {
  draw: 'draw',
  compare: 'compare',
}

export const WHAT_IF_VIEW_SEARCH_PARAM = 'whatIfView'
export const WHAT_IF_VIEW_SESSION_KEY = 'ml.whatIf.view'

export function whatIfViewFromSearchParams(params) {
  const value = params?.get(WHAT_IF_VIEW_SEARCH_PARAM)
  return value === WHAT_IF_VIEWS.compare ? WHAT_IF_VIEWS.compare : WHAT_IF_VIEWS.draw
}

/** Merge Compare flag; Baseline / draw strips it. Compare implies centralityMode=whatIf. */
export function mergeWhatIfViewIntoSearchRecord(record, view) {
  const next = { ...record }
  if (view === WHAT_IF_VIEWS.compare) {
    next[CENTRALITY_MODE_SEARCH_PARAM] = WHAT_IF_MODES.whatIf
    next[WHAT_IF_VIEW_SEARCH_PARAM] = WHAT_IF_VIEWS.compare
  } else {
    delete next[WHAT_IF_VIEW_SEARCH_PARAM]
  }
  return next
}

export function readPersistedWhatIfView() {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get(WHAT_IF_VIEW_SEARCH_PARAM) === WHAT_IF_VIEWS.compare) {
      return WHAT_IF_VIEWS.compare
    }
    if (centralityModeFromSearchParams(urlParams) !== WHAT_IF_MODES.whatIf) {
      return WHAT_IF_VIEWS.draw
    }
    const stored = sessionStorage.getItem(WHAT_IF_VIEW_SESSION_KEY)
    if (stored === WHAT_IF_VIEWS.compare) return WHAT_IF_VIEWS.compare
  } catch {
    /* ignore */
  }
  return WHAT_IF_VIEWS.draw
}

export function writePersistedWhatIfView(view) {
  try {
    if (view === WHAT_IF_VIEWS.compare) {
      sessionStorage.setItem(WHAT_IF_VIEW_SESSION_KEY, WHAT_IF_VIEWS.compare)
    } else {
      sessionStorage.removeItem(WHAT_IF_VIEW_SESSION_KEY)
    }
  } catch {
    /* ignore */
  }
}

export const WHAT_IF_DRAW_TOOLS = {
  pan: 'pan',
  pencil: 'pencil',
  erase: 'erase',
}

/**
 * Pending proposal stroke — used only before sDNA has metric values.
 * Never a centrality ramp stop; post-sDNA color comes from colorForValue(NQPDA|BtA).
 */
export const WHAT_IF_PENDING_COLOR_STREETS = '#0f172a'
export const WHAT_IF_PENDING_COLOR = '#e2e8f0'
/** @deprecated Alias — prefer WHAT_IF_PENDING_COLOR */
export const WHAT_IF_PROPOSED_COLOR = WHAT_IF_PENDING_COLOR
/** Snap UI chrome — off both centrality ramps; readable on light + dark basemaps. */
export const WHAT_IF_SNAP_COLOR = '#d946ef'
export const WHAT_IF_SNAP_STROKE = '#ffffff'
/** Soft outer halo so newly added (post-sDNA) segments stay identifiable. */
export const WHAT_IF_NEW_GLOW_COLOR = '#ffffff'
export const WHAT_IF_NEW_GLOW_COLOR_STREETS = '#0f172a'

/** Pending / rubber-band stroke tuned for the active basemap (What-if defaults to Streets). */
export function whatIfPendingColor(basemapId) {
  return basemapId === 'streets' ? WHAT_IF_PENDING_COLOR_STREETS : WHAT_IF_PENDING_COLOR
}

/** New-segment glow under ramp colour — dark on Streets, white on dark basemaps. */
export function whatIfNewSegmentGlowColor(basemapId) {
  return basemapId === 'streets' ? WHAT_IF_NEW_GLOW_COLOR_STREETS : WHAT_IF_NEW_GLOW_COLOR
}

/** Magnetic snap radius in Leaflet CSS pixels. */
export const WHAT_IF_SNAP_PX = 18

/** Default folder name when writing local sDNA scenario outputs (user-chosen). */
export const WHAT_IF_SCENARIO_ID = 'custom'

/** Direct loopback worker (Uvicorn). GitHub Pages HTTPS cannot fetch this. */
export const WHAT_IF_WORKER_DIRECT = 'http://127.0.0.1:8787'
export const WHAT_IF_WORKER_PROXY_PATH = '/what-if-api'

export function isLocalDashboardHost() {
  if (typeof window === 'undefined') return false
  const { protocol, hostname } = window.location
  return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')
}

export function isGitHubPagesHost() {
  if (typeof window === 'undefined') return false
  return window.location.hostname.endsWith('github.io')
}

/**
 * Local `npm run what-if` / `npm run dev` uses the Vite same-origin proxy.
 * GitHub Pages still points at loopback (browsers block that mixed-content fetch).
 */
export function getWhatIfWorkerBase() {
  if (isLocalDashboardHost()) {
    return `${window.location.origin}${WHAT_IF_WORKER_PROXY_PATH}`
  }
  return WHAT_IF_WORKER_DIRECT
}

/** Direct worker URL — use getWhatIfWorkerBase() for fetches. */
export const WHAT_IF_WORKER_BASE = WHAT_IF_WORKER_DIRECT

export function whatIfDataUrl(relPath) {
  return `${import.meta.env.BASE_URL}data/urban-morpho/what-if/${relPath}`
}

export function whatIfScenarioUrl(scenarioId, fileName) {
  return whatIfDataUrl(`scenarios/${scenarioId}/${fileName}`)
}

export function whatIfWorkerArtifactUrl(jobId, fileName) {
  return `${getWhatIfWorkerBase()}/v1/jobs/${jobId}/artifacts/${fileName}`
}

export const DEFAULT_WHAT_IF_VISIBLE = {
  closeness: true,
  betweenness: false,
  roadLabels: false,
  proposedLinks: true,
  snapNodes: true,
}

export const WHAT_IF_FAB_EXTRA_LAYERS = [
  { id: 'proposedLinks', label: 'Proposed Links (pending)', dot: WHAT_IF_PENDING_COLOR },
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
