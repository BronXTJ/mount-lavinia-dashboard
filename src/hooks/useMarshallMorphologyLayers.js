import { useEffect, useMemo, useState } from 'react'
import { marshallDataUrl } from '../constants/marshallMorphology.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'
import { marshallChartPoints } from '../utils/marshallMorphologyFormat.js'

/**
 * Loads stored Marshall ratios for the five GN divisions.
 * Old cell and junction geometries are not loaded.
 */
export function useMarshallMorphologyLayers(enabled = false, selectedGn = null) {
  const [scopes, setScopes] = useState([])
  const [studyArea, setStudyArea] = useState(null)
  const [uncertainty, setUncertainty] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) return undefined
    const ctrl = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      const met = await fetchJsonOrNull(marshallDataUrl('marshall_scopes.json'), { signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      const scopeList = met?.scopes
      if (!Array.isArray(scopeList) || !scopeList.length) {
        setScopes([])
        setStudyArea(null)
        setUncertainty(null)
        setError(new Error('Marshall morphology data is not available.'))
        setLoading(false)
        return
      }
      setScopes(scopeList)
      setStudyArea(met.study_area ?? null)
      setUncertainty(met.uncertainty ?? null)
      setLoading(false)
    }

    load().catch((err) => {
      if (ctrl.signal.aborted || err?.name === 'AbortError') return
      setError(err)
      setLoading(false)
    })

    return () => ctrl.abort()
  }, [enabled])

  const metrics = useMemo(
    () => scopes.find((scope) => scope?.gn_name === selectedGn) ?? null,
    [scopes, selectedGn],
  )

  const chartPoints = useMemo(() => marshallChartPoints(scopes), [scopes])

  return {
    metrics,
    scopes,
    studyArea,
    uncertainty,
    chartPoints,
    cells: null,
    junctionsMarshall: null,
    loading,
    error,
  }
}
