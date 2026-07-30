import { useEffect, useMemo, useState } from 'react'
import { networkFormGeoUrl } from '../constants/networkForm.js'
import {
  buildTypeShareZones,
  countByJtype,
  filterInsideJunctions,
  listCuldesacs,
} from '../utils/networkFormStats.js'

async function fetchJson(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Loads Network Form layers + summaries once on mount.
 */
export function useNetworkFormLayers() {
  const [gnBoundary, setGnBoundary] = useState(null)
  const [edges, setEdges] = useState(null)
  const [junctions, setJunctions] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [findings, setFindings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [gn, ed, junc, met, find] = await Promise.all([
        fetchJson(networkFormGeoUrl('mount_lavinia_gn.geojson')),
        fetchJson(networkFormGeoUrl('topology_edges.geojson')),
        fetchJson(networkFormGeoUrl('junctions_classified.geojson')),
        fetchJson(networkFormGeoUrl('metrics_ml_gn_summary.json')),
        fetchJson(networkFormGeoUrl('findings_summary.json')),
      ])
      if (cancelled) return
      setGnBoundary(gn)
      setEdges(ed)
      setJunctions(junc)
      setMetrics(met)
      setFindings(find)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const insideFeatures = useMemo(() => filterInsideJunctions(junctions), [junctions])
  const counts = useMemo(() => countByJtype(insideFeatures), [insideFeatures])
  const typeZones = useMemo(() => buildTypeShareZones(counts), [counts])
  const culdesacRows = useMemo(() => listCuldesacs(insideFeatures), [insideFeatures])

  const insideJunctions = useMemo(() => {
    if (!junctions) return null
    return { type: 'FeatureCollection', features: insideFeatures }
  }, [junctions, insideFeatures])

  return {
    gnBoundary,
    edges,
    junctions: insideJunctions,
    allJunctions: junctions,
    metrics,
    findings,
    counts,
    typeZones,
    culdesacRows,
    loading,
  }
}
