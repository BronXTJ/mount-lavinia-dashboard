/** What-if Compare workspace — option slots, colours, session. */

export const COMPARE_SLOT_IDS = ['A', 'B', 'C']

export const COMPARE_SLOT_STATUS = {
  empty: 'empty',
  drawing: 'drawing',
  waiting: 'waiting',
  computing: 'computing',
  ready: 'ready',
  error: 'error',
}

/** Colour + letter so A/B/C stay distinct without relying on hue alone. */
export const COMPARE_SLOT_COLORS = {
  A: { line: '#0891b2', label: 'A' },
  B: { line: '#d97706', label: 'B' },
  C: { line: '#7c3aed', label: 'C' },
}

export const COMPARE_SESSION_KEY = 'ml.whatIf.compare.v1'
export const COMPARE_TIP_SESSION_KEY = 'ml.whatIf.compare.tipDismissed'

export const COMPARE_MAX_OPTIONS = 3
