import { useEffect, useMemo, useState } from 'react'
import { centralityGeoUrl } from '../constants/centrality.js'
import { summarizeGeoJson } from '../utils/centralityStats.js'

async function fetchGeoJson(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

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

  // Load roads.geojson once — not tied to scaleMeters
  useEffect(() => {
    fetchGeoJson(`${import.meta.env.BASE_URL}data/geo/roads.geojson`).then((data) => {
      if (data) setNamedRoads(data.features.filter((f) => f.properties?.name))
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // Clear stale data immediately so the GeoJSON layers unmount before the
    // new fetch completes. Without this, the style function is evaluated
    // against the old data with the new scaleMeters key, producing null
    // min/max stats and rendering every segment grey.
    setCloseness(null)
    setBetweenness(null)

    Promise.all([
      fetchGeoJson(centralityGeoUrl(`closeness_${scaleMeters}.geojson`)),
      fetchGeoJson(centralityGeoUrl(`betweenness_${scaleMeters}.geojson`)),
    ]).then(([closenessData, betweennessData]) => {
      if (cancelled) return
      setCloseness(closenessData)
      setBetweenness(betweennessData)
      setLoading(false)
    })

    return () => {
      cancelled = true
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

  return { closeness, betweenness, closenessStats, betweennessStats, loading, namedRoads }
}
