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
  const [error, setError] = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)

    Promise.all([
      fetchJsonOrNull(environmentalGeoUrl('thermal_grid.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(environmentalGeoUrl('svf_points.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(environmentalGeoUrl('boundary_800m.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(environmentalGeoUrl('environmental_summary.json'), { signal: ctrl.signal }),
    ]).then(([gridData, svfData, boundaryData, summary]) => {
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
    }).catch((err) => {
      if (err?.name === 'AbortError') return
      setError(err)
      setLoading(false)
    })

    return () => {
      ctrl.abort()
    }
  }, [])

  return { grid, svfPoints, boundary, stats, loading, error }
}
