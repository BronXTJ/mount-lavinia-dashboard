import { useEffect, useState } from 'react'
import { densityGeoUrl } from '../constants/density.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'
import { buildDensityStats } from '../utils/densityStats.js'
import { isDensityGloballyInvalid, partitionHexFeatures } from '../utils/hexCellGrade.js'

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
  const [error, setError] = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)

    Promise.all([
      fetchJsonOrNull(densityGeoUrl('density_primary_hex.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('hex_grid_primary_100m.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('buildings_primary_floors.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('roads_primary.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('pois_primary.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('primary_study_area_boundary.geojson'), { signal: ctrl.signal }),
    ]).then(([rawHex, hexGridData, buildingsData, roadsData, poisData, boundaryData]) => {

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
    }).catch((err) => {
      if (err?.name === 'AbortError') return
      setError(err)
      setLoading(false)
    })

    return () => {
      ctrl.abort()
    }
  }, [])

  return { hex, excludedHex, hexGrid, buildings, roads, pois, boundary, stats, loading, error }
}
