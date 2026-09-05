/** Progressive contextual guidance for Centrality What-if drawing. */

export const GUIDANCE_STEP_IDS = {
  validation: 'validation',
  sdnaMissing: 'sdna_missing',
  error: 'error',
  computing: 'computing',
  loading: 'loading',
  eraseMode: 'erase_mode',
  pencilActive: 'pencil_active',
  firstVertex: 'first_vertex',
  readyToFinish: 'ready_to_finish',
  workerOffline: 'worker_offline',
  scenarioReady: 'scenario_ready',
  scenarioNoChange: 'scenario_no_change',
  linkFinished: 'link_finished',
  welcome: 'welcome',
  selectPencil: 'select_pencil',
  drawAnotherLink: 'draw_another_link',
}

export const GUIDANCE_STORAGE_KEYS = {
  dismissedSteps: 'ml.whatIf.guidance.dismissedSteps',
  sessionHidden: 'ml.whatIf.guidance.sessionHidden',
  completed: 'ml.whatIf.guidance.completed.v1',
}

/** @type {Record<string, { id: string, title: string, body: string, suppressesStatusText: boolean, critical?: boolean, showWelcomeCheckbox?: boolean }>} */
export const GUIDANCE_STEPS = {
  [GUIDANCE_STEP_IDS.validation]: {
    id: GUIDANCE_STEP_IDS.validation,
    title: 'Check your link',
    body: '',
    suppressesStatusText: true,
    critical: true,
  },
  [GUIDANCE_STEP_IDS.sdnaMissing]: {
    id: GUIDANCE_STEP_IDS.sdnaMissing,
    title: 'sDNA not installed',
    body: 'Install to C:\\Program Files (x86)\\sDNA, then restart the worker.',
    suppressesStatusText: true,
    critical: true,
  },
  [GUIDANCE_STEP_IDS.error]: {
    id: GUIDANCE_STEP_IDS.error,
    title: 'Scenario error',
    body: '',
    suppressesStatusText: true,
    critical: true,
  },
  [GUIDANCE_STEP_IDS.computing]: {
    id: GUIDANCE_STEP_IDS.computing,
    title: 'Computing sDNA…',
    body: 'Rankings appear when the job finishes.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.loading]: {
    id: GUIDANCE_STEP_IDS.loading,
    title: 'Loading results…',
    body: 'Fetching this distance scale.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.eraseMode]: {
    id: GUIDANCE_STEP_IDS.eraseMode,
    title: 'Erase mode',
    body: 'Click a proposed link to remove it.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.pencilActive]: {
    id: GUIDANCE_STEP_IDS.pencilActive,
    title: 'Select snap nodes',
    body: 'Click magenta nodes to place vertices.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.firstVertex]: {
    id: GUIDANCE_STEP_IDS.firstVertex,
    title: 'Add another point',
    body: 'Esc clears this point.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.readyToFinish]: {
    id: GUIDANCE_STEP_IDS.readyToFinish,
    title: 'Finish this link',
    body: '✓, double-click, Enter, or Esc.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.workerOffline]: {
    id: GUIDANCE_STEP_IDS.workerOffline,
    title: 'Worker offline',
    body: 'Use the Command Prompt steps on the status card, then click Connect.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.scenarioReady]: {
    id: GUIDANCE_STEP_IDS.scenarioReady,
    title: 'Results ready',
    body: 'Check Top Gainers and Top Losers in the side panels.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.scenarioNoChange]: {
    id: GUIDANCE_STEP_IDS.scenarioNoChange,
    title: 'No measurable change',
    body: 'Try another radius or add more links.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.linkFinished]: {
    id: GUIDANCE_STEP_IDS.linkFinished,
    title: 'Link saved',
    body: 'Dashed until sDNA finishes.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.welcome]: {
    id: GUIDANCE_STEP_IDS.welcome,
    title: 'What-if',
    body: 'Draw a link, then finish to fill Δ panels.',
    suppressesStatusText: true,
    showWelcomeCheckbox: true,
  },
  [GUIDANCE_STEP_IDS.selectPencil]: {
    id: GUIDANCE_STEP_IDS.selectPencil,
    title: 'Select the pencil',
    body: 'Then click magenta nodes to draw.',
    suppressesStatusText: true,
  },
  [GUIDANCE_STEP_IDS.drawAnotherLink]: {
    id: GUIDANCE_STEP_IDS.drawAnotherLink,
    title: 'Draw another link',
    body: 'Select Pencil to add more.',
    suppressesStatusText: true,
  },
}

export const COACH_MARK_COPY = {
  title: 'Start here',
  body: 'Draw with the pencil.',
}

export function getGuidanceStep(stepId) {
  return GUIDANCE_STEPS[stepId] ?? null
}
