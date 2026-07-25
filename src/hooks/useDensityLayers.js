import { useEffect, useState } from 'react'
import { densityGeoUrl } from '../constants/density.js'
import { buildDensityStats, filterValidFeatures } from '../utils/densityStats.js'

async function fetchGeoJson(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const EMPTY_STATS = {
  fsi: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  gsi: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  osr: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  density: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  medianFsi: null,
  medianGsi: null,
  medianOsr: null,
  typology: null,
  scatter: [],
  fsiHistogram: [],
  gsiHistogram: [],
  osrHistogram: [],
  densityHistogram: [],
  findings: [],
}

/**
 * Loads Density Analysis hex grid + context layers once on mount.
 * Primary 5-GN study area layers by default.
 * Filters invalid / edge cells and precomputes panel stats.
 */
export function useDensityLayers() {
  const [hex, setHex] = useState(null)
  const [excludedHex, setExcludedHex] = useState(null)
  const [hexGrid, setHexGrid] = useState(null)
  const [buildings, setBuildings] = useState(null)
  const [roads, setRoads] = useState(null)
  const [pois, setPois] = useState(null)
  const [boundary, setBoundary] = useState(null)
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetchGeoJson(densityGeoUrl('density_primary_hex.geojson')),
      fetchGeoJson(densityGeoUrl('hex_grid_primary_100m.geojson')),
      fetchGeoJson(densityGeoUrl('buildings_primary_floors.geojson')),
      fetchGeoJson(densityGeoUrl('roads_primary.geojson')),
      fetchGeoJson(densityGeoUrl('pois_primary.geojson')),
      fetchGeoJson(densityGeoUrl('primary_study_area_boundary.geojson')),
    ]).then(([rawHex, hexGridData, buildingsData, roadsData, poisData, boundaryData]) => {
      if (cancelled) return

      const validFeatures = filterValidFeatures(rawHex)
      const validIds = new Set(validFeatures.map((f) => f.properties?.id))
      const excludedFeatures = (rawHex?.features ?? []).filter(
        (f) => !validIds.has(f.properties?.id),
      )
      const hexFc =
        validFeatures.length > 0
          ? { type: 'FeatureCollection', features: validFeatures }
          : null
      const excludedFc =
        excludedFeatures.length > 0
          ? { type: 'FeatureCollection', features: excludedFeatures }
          : null

      setHex(hexFc)
      setExcludedHex(excludedFc)
      setHexGrid(hexGridData)
      setBuildings(buildingsData)
      setRoads(roadsData)
      setPois(poisData)
      setBoundary(boundaryData)
      setStats(hexFc ? buildDensityStats(validFeatures) : EMPTY_STATS)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { hex, excludedHex, hexGrid, buildings, roads, pois, boundary, stats, loading }
}
