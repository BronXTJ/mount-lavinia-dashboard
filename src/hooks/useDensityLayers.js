import { useEffect, useState } from 'react'
import { densityGeoUrl } from '../constants/density.js'
import { buildDensityStats } from '../utils/densityStats.js'
import { isDensityGloballyInvalid, partitionHexFeatures } from '../utils/hexCellGrade.js'

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
  fsiClasses: null,
  gsiClasses: null,
  osrClasses: null,
  densityClasses: null,
  fsiHistogram: [],
  gsiHistogram: [],
  osrHistogram: [],
  densityHistogram: [],
  findings: [],
  hexCounts: null,
}

/**
 * Loads Density Analysis hex grid + context layers once on mount.
 * Primary 5-GN study area layers by default.
 * Grades hexes by area completeness; KPIs use ≥90% cells only.
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

      const { mapFc, excludedFc, statsFeatures, counts } = partitionHexFeatures(rawHex, {
        isGloballyInvalid: isDensityGloballyInvalid,
      })

      setHex(mapFc)
      setExcludedHex(excludedFc)
      setHexGrid(hexGridData)
      setBuildings(buildingsData)
      setRoads(roadsData)
      setPois(poisData)
      setBoundary(boundaryData)
      setStats(
        statsFeatures.length
          ? { ...buildDensityStats(statsFeatures), hexCounts: counts }
          : { ...EMPTY_STATS, hexCounts: counts },
      )
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { hex, excludedHex, hexGrid, buildings, roads, pois, boundary, stats, loading }
}
