import { useEffect, useMemo, useState } from 'react'
import { centralityGeoUrl } from '../constants/centrality.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'
import { summarizeGeoJson } from '../utils/centralityStats.js'

/**
 * Loads closeness + betweenness GeoJSON for the active analysis scale.
 * Also loads roads.geojson once on mount to resolve real road names for
 * the top-5 bar charts and the map label overlay.
 * Missing files resolve to null — never throws.
 */
export function useCentralityLayers(scaleMeters) {
  const [closeness, setCloseness] = useState(null)
  const [betweenness, setBetweenness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [namedRoads, setNamedRoads] = useState(null)
  const [error, setError] = useState(null)

  // Load roads.geojson once — not tied to scaleMeters
  useEffect(() => {
    const ctrl = new AbortController()
    fetchJsonOrNull(`${import.meta.env.BASE_URL}data/geo/roads.geojson`, { signal: ctrl.signal })
      .then((data) => {
        if (data) setNamedRoads(data.features.filter((f) => f.properties?.name))
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setError(err)
      })
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    // Clear stale data immediately so the GeoJSON layers unmount before the
    // new fetch completes. Without this, the style function is evaluated
    // against the old data with the new scaleMeters key, producing null
    // min/max stats and rendering every segment grey.
    setCloseness(null)
    setBetweenness(null)

    Promise.all([
      fetchJsonOrNull(centralityGeoUrl(`closeness_${scaleMeters}.geojson`), { signal: ctrl.signal }),
      fetchJsonOrNull(centralityGeoUrl(`betweenness_${scaleMeters}.geojson`), { signal: ctrl.signal }),
    ])
      .then(([closenessData, betweennessData]) => {
        setCloseness(closenessData)
        setBetweenness(betweennessData)
        setLoading(false)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err)
        setLoading(false)
      })

    return () => {
      ctrl.abort()
    }
  }, [scaleMeters])

  const closenessStats = useMemo(
    () => summarizeGeoJson(closeness, 'closeness', scaleMeters, namedRoads),
    [closeness, scaleMeters, namedRoads],
  )

  const betweennessStats = useMemo(
    () => summarizeGeoJson(betweenness, 'betweenness', scaleMeters, namedRoads),
    [betweenness, scaleMeters, namedRoads],
  )

  return { closeness, betweenness, closenessStats, betweennessStats, loading, namedRoads, error }
}
