import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WHAT_IF_DRAW_TOOLS, WHAT_IF_STATUS } from '../constants/centralityWhatIf.js'
import {
  COACH_MARK_COPY,
  getGuidanceStep,
  GUIDANCE_STEP_IDS,
  GUIDANCE_STORAGE_KEYS,
} from '../constants/whatIfGuidanceContent.js'

/** Always re-show while the user is in that draw action (dismiss only hides until context changes). */
const DRAW_CONTEXT_STEP_IDS = new Set([
  GUIDANCE_STEP_IDS.pencilActive,
  GUIDANCE_STEP_IDS.firstVertex,
  GUIDANCE_STEP_IDS.readyToFinish,
  GUIDANCE_STEP_IDS.eraseMode,
])

const RESULTS_TIP_STEP_IDS = new Set([
  GUIDANCE_STEP_IDS.scenarioReady,
  GUIDANCE_STEP_IDS.scenarioNoChange,
])

function readDismissedSteps() {
  try {
    const raw = sessionStorage.getItem(GUIDANCE_STORAGE_KEYS.dismissedSteps)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeDismissedSteps(set) {
  try {
    sessionStorage.setItem(GUIDANCE_STORAGE_KEYS.dismissedSteps, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

function readSessionHidden() {
  try {
    return sessionStorage.getItem(GUIDANCE_STORAGE_KEYS.sessionHidden) === '1'
  } catch {
    return false
  }
}

function writeSessionHidden(hidden) {
  try {
    if (hidden) sessionStorage.setItem(GUIDANCE_STORAGE_KEYS.sessionHidden, '1')
    else sessionStorage.removeItem(GUIDANCE_STORAGE_KEYS.sessionHidden)
  } catch {
    /* ignore */
  }
}

function readCompleted() {
  try {
    return localStorage.getItem(GUIDANCE_STORAGE_KEYS.completed) === '1'
  } catch {
    return false
  }
}

function writeCompleted(completed) {
  try {
    if (completed) localStorage.setItem(GUIDANCE_STORAGE_KEYS.completed, '1')
    else localStorage.removeItem(GUIDANCE_STORAGE_KEYS.completed)
  } catch {
    /* ignore */
  }
}

function resolveStepId({
  drawHint,
  sdnaMissing,
  status,
  error,
  tool,
  draftLength,
  linkCount,
  hasLinks,
  workerOnline,
  hasRankings,
  linkFinishedPulse,
  resultsTipConsumed,
}) {
  if (drawHint) return GUIDANCE_STEP_IDS.validation
  if (sdnaMissing) return GUIDANCE_STEP_IDS.sdnaMissing
  if (status === WHAT_IF_STATUS.error) return GUIDANCE_STEP_IDS.error
  if (status === WHAT_IF_STATUS.computing) return GUIDANCE_STEP_IDS.computing
  if (status === WHAT_IF_STATUS.loading) return GUIDANCE_STEP_IDS.loading

  if (tool === WHAT_IF_DRAW_TOOLS.erase) return GUIDANCE_STEP_IDS.eraseMode

  if (tool === WHAT_IF_DRAW_TOOLS.pencil) {
    if (draftLength === 0) return GUIDANCE_STEP_IDS.pencilActive
    if (draftLength === 1) return GUIDANCE_STEP_IDS.firstVertex
    if (draftLength >= 2) return GUIDANCE_STEP_IDS.readyToFinish
  }

  if (linkFinishedPulse) return GUIDANCE_STEP_IDS.linkFinished

  if (status === WHAT_IF_STATUS.needsCompute && !workerOnline) {
    return GUIDANCE_STEP_IDS.workerOffline
  }

  if (status === WHAT_IF_STATUS.scenario) {
    if (!resultsTipConsumed) {
      return hasRankings ? GUIDANCE_STEP_IDS.scenarioReady : GUIDANCE_STEP_IDS.scenarioNoChange
    }
    if (tool === WHAT_IF_DRAW_TOOLS.pan && hasLinks) {
      return GUIDANCE_STEP_IDS.drawAnotherLink
    }
    return null
  }

  if (!hasLinks && tool === WHAT_IF_DRAW_TOOLS.pan) {
    return GUIDANCE_STEP_IDS.welcome
  }

  if (hasLinks && tool === WHAT_IF_DRAW_TOOLS.pan && status === WHAT_IF_STATUS.draft) {
    return GUIDANCE_STEP_IDS.selectPencil
  }

  if (!workerOnline && linkCount > 0 && status === WHAT_IF_STATUS.draft) {
    return GUIDANCE_STEP_IDS.workerOffline
  }

  return null
}

function isCriticalStep(stepId) {
  const step = getGuidanceStep(stepId)
  return Boolean(step?.critical)
}

/**
 * Progressive contextual guidance for What-if drawing workflow.
 */
export function useWhatIfGuidance({
  isWhatIf,
  status,
  workerOnline,
  sdnaMissing,
  error,
  drawHint,
  tool,
  draftLength = 0,
  linkCount = 0,
  hasLinks = false,
  hasRankings = false,
}) {
  const [dismissedSteps, setDismissedSteps] = useState(readDismissedSteps)
  const [sessionHidden, setSessionHidden] = useState(readSessionHidden)
  const [completed, setCompleted] = useState(readCompleted)
  const [coachDismissed, setCoachDismissed] = useState(false)
  const [linkFinishedPulse, setLinkFinishedPulse] = useState(false)
  const [resultsTipConsumed, setResultsTipConsumed] = useState(false)

  const prevLinkCountRef = useRef(linkCount)
  const prevStatusRef = useRef(status)
  const linkFinishedTimerRef = useRef(null)

  const activelyDrawing =
    tool === WHAT_IF_DRAW_TOOLS.pencil || draftLength > 0 || tool === WHAT_IF_DRAW_TOOLS.erase

  useEffect(() => {
    if (!isWhatIf) return
    if (
      status === WHAT_IF_STATUS.computing ||
      status === WHAT_IF_STATUS.loading ||
      status === WHAT_IF_STATUS.draft
    ) {
      setResultsTipConsumed(false)
    }
  }, [isWhatIf, status])

  useEffect(() => {
    if (!isWhatIf) return

    const prevCount = prevLinkCountRef.current
    const prevStatus = prevStatusRef.current

    if (linkCount > prevCount && prevStatus !== WHAT_IF_STATUS.computing) {
      setLinkFinishedPulse(true)
      if (linkFinishedTimerRef.current) clearTimeout(linkFinishedTimerRef.current)
      linkFinishedTimerRef.current = window.setTimeout(() => {
        setLinkFinishedPulse(false)
      }, 4000)
    }

    prevLinkCountRef.current = linkCount
    prevStatusRef.current = status

    return () => {
      if (linkFinishedTimerRef.current) clearTimeout(linkFinishedTimerRef.current)
    }
  }, [isWhatIf, linkCount, status])

  const rawStepId = useMemo(
    () =>
      isWhatIf
        ? resolveStepId({
            drawHint,
            sdnaMissing,
            status,
            error,
            tool,
            draftLength,
            linkCount,
            hasLinks,
            workerOnline,
            hasRankings,
            linkFinishedPulse,
            resultsTipConsumed,
          })
        : null,
    [
      isWhatIf,
      drawHint,
      sdnaMissing,
      status,
      error,
      tool,
      draftLength,
      linkCount,
      hasLinks,
      workerOnline,
      hasRankings,
      linkFinishedPulse,
      resultsTipConsumed,
    ],
  )

  const stepId = useMemo(() => {
    if (!rawStepId) return null
    if (sessionHidden && !isCriticalStep(rawStepId)) return null
    const isDrawContext = DRAW_CONTEXT_STEP_IDS.has(rawStepId)
    if (!isDrawContext && dismissedSteps.has(rawStepId)) return null
    return rawStepId
  }, [rawStepId, sessionHidden, dismissedSteps])

  useEffect(() => {
    if (!stepId || !RESULTS_TIP_STEP_IDS.has(stepId)) return
    setResultsTipConsumed(true)
  }, [stepId])

  const banner = useMemo(() => {
    if (!stepId) return null
    const step = getGuidanceStep(stepId)
    if (!step) return null

    let body = step.body
    if (stepId === GUIDANCE_STEP_IDS.validation && drawHint) body = drawHint
    if (stepId === GUIDANCE_STEP_IDS.error && error) body = error

    return {
      title: step.title,
      body,
      assertive: Boolean(step.critical),
      showWelcomeCheckbox: Boolean(step.showWelcomeCheckbox),
    }
  }, [stepId, drawHint, error])

  const showCoachMark = useMemo(() => {
    if (!isWhatIf || completed || coachDismissed || sessionHidden) return false
    if (tool !== WHAT_IF_DRAW_TOOLS.pan || hasLinks) return false
    if (stepId === GUIDANCE_STEP_IDS.welcome || stepId === GUIDANCE_STEP_IDS.selectPencil) {
      return true
    }
    if (!stepId && !dismissedSteps.has(GUIDANCE_STEP_IDS.welcome)) return true
    return false
  }, [isWhatIf, completed, coachDismissed, sessionHidden, tool, hasLinks, stepId, dismissedSteps])

  const dismissStep = useCallback(() => {
    if (!rawStepId) return
    if (RESULTS_TIP_STEP_IDS.has(rawStepId)) {
      setResultsTipConsumed(true)
    }
    if (!DRAW_CONTEXT_STEP_IDS.has(rawStepId)) {
      setDismissedSteps((prev) => {
        const next = new Set(prev)
        next.add(rawStepId)
        writeDismissedSteps(next)
        return next
      })
    }
  }, [rawStepId])

  const dismissSession = useCallback(() => {
    setSessionHidden(true)
    writeSessionHidden(true)
  }, [])

  const markCompleted = useCallback(() => {
    setCompleted(true)
    writeCompleted(true)
    setCoachDismissed(true)
  }, [])

  const dismissCoachMark = useCallback(() => {
    setCoachDismissed(true)
  }, [])

  const suppressesStatusText =
    activelyDrawing ||
    status === WHAT_IF_STATUS.scenario ||
    Boolean(stepId && getGuidanceStep(stepId)?.suppressesStatusText)

  const guidanceActive = Boolean(banner || showCoachMark)

  return {
    stepId,
    banner,
    showCoachMark,
    coachCopy: COACH_MARK_COPY,
    dismissStep,
    dismissSession,
    markCompleted,
    dismissCoachMark,
    suppressesStatusText,
    guidanceActive,
    sessionHidden,
    activelyDrawing,
  }
}
