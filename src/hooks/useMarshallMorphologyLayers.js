import { useEffect, useMemo, useState } from 'react'
import { NETWORK_FORM_GN_NAMES, NETWORK_FORM_SCOPE_ALL } from '../constants/networkForm.js'
import { marshallDataUrl } from '../constants/marshallMorphology.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'
import { marshallChartPoints } from '../utils/marshallMorphologyFormat.js'

function featuresForGn(collection, gnName) {
  if (!collection?.features || !gnName) return null
  const features = collection.features.filter((feature) => feature?.properties?.gn_name === gnName)
  if (!features.length) return null
  return { type: 'FeatureCollection', features }
}

function matchesScope(gnName, scope) {
  if (!gnName) return false
  if (scope === NETWORK_FORM_SCOPE_ALL) return NETWORK_FORM_GN_NAMES.includes(gnName)
  return gnName === scope
}

/** Junction + cul markers for map (single GN or all study GNs). */
export function marshallMarkersForScope(junctions, culdesacs, scope) {
  if (!junctions?.features?.length) return null
  const junctionFeatures = junctions.features.filter((f) => matchesScope(f?.properties?.gn_name, scope))
  const culFeatures = (culdesacs?.features ?? []).filter((f) =>
    matchesScope(f?.properties?.gn_name, scope),
  )
  const features = [...junctionFeatures, ...culFeatures]
  return features.length ? { type: 'FeatureCollection', features } : null
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
        setError(new Error('Marshall Morphology data is not available.'))
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

  const junctionsMarshall = useMemo(
    () => marshallMarkersForScope(junctions, culdesacs, selectedGn),
    [junctions, culdesacs, selectedGn],
  )

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
