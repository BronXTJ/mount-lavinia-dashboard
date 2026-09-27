import { useEffect, useMemo, useState } from 'react'
import { marshallDataUrl } from '../constants/marshallMorphology.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'
import { marshallChartPoints } from '../utils/marshallMorphologyFormat.js'

function featuresForGn(collection, gnName) {
  if (!collection?.features || !gnName) return null
  const features = collection.features.filter((feature) => feature?.properties?.gn_name === gnName)
  if (!features.length) return null
  return { type: 'FeatureCollection', features }
}

/**
 * Loads stored Marshall ratios and the validated map geometries.
 * Counts are not recomputed from the geometries.
 */
export function useMarshallMorphologyLayers(enabled = false, selectedGn = null) {
  const [scopes, setScopes] = useState([])
  const [studyArea, setStudyArea] = useState(null)
  const [uncertainty, setUncertainty] = useState(null)
  const [junctions, setJunctions] = useState(null)
  const [culdesacs, setCuldesacs] = useState(null)
  const [cells, setCells] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) return undefined
    const ctrl = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      const [met, junctionFc, culFc, cellFc] = await Promise.all([
        fetchJsonOrNull(marshallDataUrl('marshall_scopes.json'), { signal: ctrl.signal }),
        fetchJsonOrNull(marshallDataUrl('junctions_marshall.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(marshallDataUrl('culdesacs_marshall.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(marshallDataUrl('cells_marshall.geojson'), { signal: ctrl.signal }),
      ])
      if (ctrl.signal.aborted) return
      const scopeList = met?.scopes
      if (!Array.isArray(scopeList) || !scopeList.length) {
        setScopes([])
        setStudyArea(null)
        setUncertainty(null)
        setJunctions(null)
        setCuldesacs(null)
        setCells(null)
        setError(new Error('Marshall morphology data is not available.'))
        setLoading(false)
        return
      }
      setScopes(scopeList)
      setStudyArea(met.study_area ?? null)
      setUncertainty(met.uncertainty ?? null)
      setJunctions(junctionFc)
      setCuldesacs(culFc)
      setCells(cellFc)
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

  const junctionsMarshall = useMemo(() => {
    const junctionFeatures = featuresForGn(junctions, selectedGn)?.features ?? []
    const culFeatures = featuresForGn(culdesacs, selectedGn)?.features ?? []
    const features = [...junctionFeatures, ...culFeatures]
    return features.length ? { type: 'FeatureCollection', features } : null
  }, [junctions, culdesacs, selectedGn])

  const cellsForGn = useMemo(() => featuresForGn(cells, selectedGn), [cells, selectedGn])

  return {
    metrics,
    scopes,
    studyArea,
    uncertainty,
    chartPoints,
    cells: cellsForGn,
    junctionsMarshall,
    loading,
    error,
  }
}
