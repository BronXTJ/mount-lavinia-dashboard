/** Tab 5 Environmental Analysis — UTCI / UHI / SVF configuration. */

export const SHADOW_COLOR = '#a78a7f'

export const ENV_MAP_CENTER = [6.8325, 79.8665]
export const ENV_MAP_ZOOM = 16

/** 800 m analysis boundary — solid red, matches other analysis boundaries. */
export const ENV_BUFFER_COLOR = '#dc2626'

/** Cool → hot multi-stop ramps for thermal metrics. */
export const ENV_METRIC_RAMPS = {
  utci: {
    stops: ['#313695', '#4575b4', '#74add1', '#fee090', '#f46d43', '#a50026'],
    property: 'utci_c',
    label: 'UTCI (°C)',
    unit: '°C',
  },
  uhi: {
    stops: ['#2166ac', '#67a9cf', '#d1e5f0', '#fddbc7', '#ef8a62', '#b2182b'],
    property: 'UHI_intens',
    label: 'UHI Intensity (°C)',
    unit: '°C',
  },
  airTemp: {
    stops: ['#ffffcc', '#ffeda0', '#feb24c', '#f03b20', '#bd0026'],
    property: 'Air_Temp',
    label: 'Air Temperature (°C)',
    unit: '°C',
  },
  tmrt: {
    stops: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
    property: 'Tmrt',
    label: 'Mean Radiant Temp (°C)',
    unit: '°C',
  },
  shadow: {
    stops: ['#f5ebe8', '#e4d0cb', '#a78a7f', '#7a5f56', '#4f3c36', '#2c211e'],
    property: 'shadow_frac',
    label: 'Shadow Exposure',
    unit: '%',
    asPercent: true,
  },
}

/** Selected cell highlight. */
export const ENV_CELL_HIGHLIGHT = {
  color: '#67e8f9',
  weight: 3,
  fillColor: '#ecfeff',
  fillOpacity: 0.35,
}

export const ENV_CONTEXT_STYLES = {
  svf: {
    radius: 5,
    weight: 1,
    color: '#ffffff',
    fillOpacity: 0.9,
  },
}

/** SVF openness → fill colour. */
export const SVF_CLASS_COLORS = {
  'Very Enclosed': '#7f1d1d',
  'Moderately Enclosed': '#c2410c',
  Mixed: '#ca8a04',
  Open: '#65a30d',
  'Very Open': '#0284c7',
}

/** Model UTCI stress classes present in this study (4 = strong, 5 = very strong). */
export const UTCI_CLASS_LABELS = {
  4: { label: 'Strong Heat Stress', color: '#ea580c' },
  5: { label: 'Very Strong Heat Stress', color: '#b91c1c' },
}

export const ENV_FAB_LAYERS = [
  { id: 'analysisArea', label: '800 m Analysis Boundary', dot: '#dc2626', group: 'independent' },
  { id: 'utci', label: 'UTCI (°C)', dot: '#f46d43', group: 'metric' },
  { id: 'uhi', label: 'UHI Intensity', dot: '#ef8a62', group: 'metric' },
  { id: 'airTemp', label: 'Air Temperature', dot: '#feb24c', group: 'metric' },
  { id: 'tmrt', label: 'Mean Radiant Temp', dot: '#b12a90', group: 'metric' },
  { id: 'shadow', label: 'Shadow Exposure', dot: SHADOW_COLOR, group: 'metric' },
  { id: 'svfPoints', label: 'SVF Sample Points', dot: '#0284c7', group: 'independent' },
]

export const DEFAULT_ENV_VISIBLE = {
  analysisArea: true,
  utci: true,
  uhi: false,
  airTemp: false,
  tmrt: false,
  shadow: false,
  svfPoints: true,
}

export const ENV_METRIC_IDS = ['utci', 'uhi', 'airTemp', 'tmrt', 'shadow']

/** Modelled shadow hours joined onto the thermal grid (07–18 LST). */
export const SHADOW_MODEL_HOURS = [
  '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18',
]

/** SVF samples focus on the active Junction streetscape corridor. */
export const SVF_FOCUS_LABEL =
  'Mount Lavinia Junction → along Galle Road → supermarket & bus stand (and nearby surroundings)'

export const SVF_FOCUS_LANDMARKS = ['Junction', 'Galle Road', 'Supermarket', 'Bus stand']

export function environmentalGeoUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/environmental-analysis/${fileName}`
}

export function getActiveEnvMetric(visibleLayers) {
  return ENV_METRIC_IDS.find((id) => visibleLayers?.[id]) ?? null
}

export function hasEnvSelectableLayer(visibleLayers) {
  return ENV_METRIC_IDS.some((id) => visibleLayers?.[id])
}
