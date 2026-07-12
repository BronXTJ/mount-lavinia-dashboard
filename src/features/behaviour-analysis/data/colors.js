/** Behaviour Analysis — tab-only color tokens (collision-safe, no repeats). */

export const BEHAVIOUR_ACCENT = '#dc2626'

/** Primary Study Area boundary stroke on the map. */
export const STUDY_BOUNDARY_COLOR = '#E5C8C4'

export const JUNCTION_COLORS = {
  1: '#f97316', // bright orange
  2: '#3b82f6',
  3: '#10b981',
  4: '#eab308', // golden yellow
}

/** Unique vs junctions, directions, and ratio colors. */
export const VEHICLE_TYPE_COLORS = {
  Private: '#1d4ed8',
  'Three Wheeler': '#a21caf',
  'Motor Bike': '#84cc16',
  Other: '#78716c',
}

/** Per-direction palette — distinct from junction + mode + ratio colors. */
export const DIRECTION_COLORS = {
  Colombo: '#38bdf8',
  Galle: '#6366f1',
  'Station road': '#f472b6',
  'Templers road': '#2dd4bf',
  'DeSaram road': '#fb7185',
  Beach: '#c084fc',
}

export const PEDESTRIAN_COLOR = '#FAD9C1'
export const VEHICLE_RATIO_COLOR = '#D49A53'

export const PERIOD_ORDER = ['morning', 'midday', 'evening']
export const PERIOD_LABELS = {
  morning: 'Morning Peak',
  midday: 'Midday',
  evening: 'Evening Peak',
}

export const VEHICLE_TYPE_ORDER = ['Private', 'Three Wheeler', 'Motor Bike', 'Other']

/** Display labels for the breakdown legend (Private expands to survey classes). */
export const VEHICLE_TYPE_LABELS = {
  Private: 'Private (Cars, Van, Jeep, Lorry, Bus)',
  'Three Wheeler': 'Three Wheeler',
  'Motor Bike': 'Motor Bike',
  Other: 'Other',
}

/** Shared Recharts axis tick style — readable on dark cards. */
export const CHART_TICK = { fill: '#e0e0e0', fontSize: 12 }
