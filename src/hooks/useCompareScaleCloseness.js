import { useEffect, useMemo, useRef, useState } from 'react'
import { centralityGeoUrl } from '../constants/centrality.js'
import { COMPARE_SLOT_STATUS } from '../constants/whatIfCompare.js'
import { COMPARE_SPARKLINE_SCALES } from '../utils/nearbyWhatIfDeltas.js'
import { fetchJobArtifact } from '../utils/whatIfWorker.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'

/**
 * Baseline + scenario closeness layers at all four radii for the Compare sparkline.
 * Uses existing closeness_{m}.geojson artifacts — no new worker URLs.
 */
export function useCompareScaleCloseness({ slots, ids, scaleMeters, baselineCloseness }) {
  const [baselineByScale, setBaselineByScale] = useState({})
  const [scenarioByScale, setScenarioByScale] = useState({})
  const cacheRef = useRef(new Map())

  const readyJobs = useMemo(
    () =>
      (ids ?? [])
        .filter((id) => slots[id]?.status === COMPARE_SLOT_STATUS.ready && slots[id]?.jobId)
        .map((id) => `${id}:${slots[id].jobId}`)
        .join('|'),
    [ids, slots],
  )

  useEffect(() => {
    if (!baselineCloseness?.features?.length) return
    setBaselineByScale((prev) =>
      prev[scaleMeters] === baselineCloseness ? prev : { ...prev, [scaleMeters]: baselineCloseness },
    )
  }, [baselineCloseness, scaleMeters])

  useEffect(() => {
    let cancelled = false
    Promise.all(
      COMPARE_SPARKLINE_SCALES.map(async (meters) => {
        const data = await fetchJsonOrNull(centralityGeoUrl(`closeness_${meters}.geojson`))
        return [meters, data]
      }),
    ).then((rows) => {
      if (cancelled) return
      setBaselineByScale((prev) => {
        const next = { ...prev }
        for (const [meters, data] of rows) {
          if (data) next[meters] = data
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!readyJobs) {
      setScenarioByScale({})
      return undefined
    }
    let cancelled = false

    async function load() {
      const entries = readyJobs.split('|').filter(Boolean)
      const next = {}
      for (const entry of entries) {
        const colon = entry.indexOf(':')
        const slotId = entry.slice(0, colon)
        const jobId = entry.slice(colon + 1)
        const slot = slots[slotId]
        next[slotId] = { jobId }
        for (const meters of COMPARE_SPARKLINE_SCALES) {
          const key = `${slotId}:${jobId}:${meters}`
          if (meters === scaleMeters && slot?.closeness?.features?.length) {
            cacheRef.current.set(key, slot.closeness)
          } else if (!cacheRef.current.has(key)) {
            try {
              const fc = await fetchJobArtifact(jobId, `closeness_${meters}.geojson`)
              if (cancelled) return
              cacheRef.current.set(key, fc)
            } catch {
              cacheRef.current.set(key, null)
            }
          }
          if (cancelled) return
          next[slotId][meters] = cacheRef.current.get(key) ?? null
        }
      }
      if (!cancelled) setScenarioByScale(next)
    }

    void load()
    return () => {
      cancelled = true
    }
    // slots is read for current-scale closeness; readyJobs + scaleMeters gate refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyJobs, scaleMeters])

  return { baselineByScale, scenarioByScale }
}
