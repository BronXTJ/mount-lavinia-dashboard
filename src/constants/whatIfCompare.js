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

/** Off-ramp identity colours (not NQPDA/BtA stops). Letter + ink keep chips readable. */
export const COMPARE_SLOT_COLORS = {
  A: { line: '#C5CAD3', ink: '#1e293b', label: 'A' },
  B: { line: '#9A8B78', ink: '#1e293b', label: 'B' },
  C: { line: '#4B5563', ink: '#f8fafc', label: 'C' },
}

/** Dark halo under Compare overlay strokes so light grey A still reads on Streets. */
export const COMPARE_SLOT_HALO = '#1e293b'

export const COMPARE_SESSION_KEY = 'ml.whatIf.compare.v1'
export const COMPARE_TIP_SESSION_KEY = 'ml.whatIf.compare.tipDismissed'

export const COMPARE_MAX_OPTIONS = 3
