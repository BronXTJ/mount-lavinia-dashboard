import { useEffect, useState } from 'react'
import { environmentalGeoUrl } from '../constants/environmental.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'
import { buildEnvironmentalStats } from '../utils/environmentalStats.js'

const EMPTY_STATS = {
  cellCount: 0,
  rural_bg_T: null,
  utci: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  uhi: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  airTemp: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  tmrt: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  wind: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  shadow: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  shadowExposureBreakdown: null,
  shadowMeta: null,
  shadowHourlySeries: [],
  scatterSample: [],
  radarMeans: [],
  utciClassBreakdown: [],
  svfBreakdown: [],
  svfPointCount: 0,
  findings: [],
}

/**
 * Loads Environmental Analysis thermal grid + SVF + boundary + context layers.
 */
export function useEnvironmentalLayers() {
  const [grid, setGrid] = useState(null)
  const [svfPoints, setSvfPoints] = useState(null)
  const [boundary, setBoundary] = useState(null)
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetchJsonOrNull(environmentalGeoUrl('thermal_grid.geojson')),
      fetchJsonOrNull(environmentalGeoUrl('svf_points.geojson')),
      fetchJsonOrNull(environmentalGeoUrl('boundary_800m.geojson')),
      fetchJsonOrNull(environmentalGeoUrl('environmental_summary.json')),
    ]).then(([gridData, svfData, boundaryData, summary]) => {
      if (cancelled) return

      const features = gridData?.features ?? []
      setGrid(features.length ? gridData : null)
      setSvfPoints(svfData)
      setBoundary(boundaryData)
      setStats(
        features.length
          ? buildEnvironmentalStats(features, svfData, summary)
          : EMPTY_STATS,
      )
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { grid, svfPoints, boundary, stats, loading, error: null }
}
