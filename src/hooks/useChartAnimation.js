import { useCallback, useEffect, useState } from 'react'

const DEFAULT_DURATION_MS = 800

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Recharts entrance animation + label reveal via onAnimationEnd (no setTimeout).
 * Call `onAnimationEnd` from Bar / Pie / Scatter so labels appear after grow finishes.
 * Pass a distinct hook instance per chart when a panel has multiple charts.
 *
 * @param {string|number|null} [replayKey] - change to re-hide labels and re-animate
 * @param {number} [durationMs]
 * @returns {{
 *   isAnimationActive: boolean,
 *   animationDuration: number,
 *   animationEasing: string,
 *   showLabels: boolean,
 *   onAnimationEnd: () => void,
 * }}
 */
export default function useChartAnimation(replayKey = null, durationMs = DEFAULT_DURATION_MS) {
  const [showLabels, setShowLabels] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShowLabels(true)
      return undefined
    }
    setShowLabels(false)
    return undefined
  }, [replayKey, durationMs])

  const onAnimationEnd = useCallback(() => {
    setShowLabels(true)
  }, [])

  const reduced = prefersReducedMotion()

  return {
    isAnimationActive: !reduced,
    animationDuration: durationMs,
    animationEasing: 'ease-out',
    showLabels: reduced ? true : showLabels,
    onAnimationEnd,
  }
}
