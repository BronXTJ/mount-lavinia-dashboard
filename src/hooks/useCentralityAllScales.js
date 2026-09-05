import { useEffect, useState } from 'react'
import { CENTRALITY_SCALES, centralityGeoUrl } from '../constants/centrality.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'
import { summarizeGeoJson } from '../utils/centralityStats.js'

/**
 * Fetches all 8 centrality GeoJSON files once on mount (4 scales × 2 metrics)
 * and computes the average value per scale for each metric.
 * Used to populate the cross-scale comparison bar charts in both panels.
 */
export function useCentralityAllScales() {
  const [closenessAvgs, setClosenessAvgs] = useState([])
  const [betweennessAvgs, setBetweennessAvgs] = useState([])

  useEffect(() => {
    const ctrl = new AbortController()
    const scales = CENTRALITY_SCALES.map((s) => s.meters) // [500, 2000, 3000, 5000]

    // Fetch in pairs: [closeness_500, betweenness_500, closeness_2000, betweenness_2000, ...]
    Promise.all(
      scales.flatMap((s) => [
        fetchJsonOrNull(centralityGeoUrl(`closeness_${s}.geojson`), { signal: ctrl.signal }),
        fetchJsonOrNull(centralityGeoUrl(`betweenness_${s}.geojson`), { signal: ctrl.signal }),
      ]),
    )
      .then((results) => {
        setClosenessAvgs(
          scales.map((s, i) => ({
            scale: s,
            avg: summarizeGeoJson(results[i * 2], 'closeness', s).avg ?? 0,
          })),
        )
        setBetweennessAvgs(
          scales.map((s, i) => ({
            scale: s,
            avg: summarizeGeoJson(results[i * 2 + 1], 'betweenness', s).avg ?? 0,
          })),
        )
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          /* keep empty averages; banner is owned by useCentralityLayers */
        }
      })

    return () => ctrl.abort()
  }, [])

  return { closenessAvgs, betweennessAvgs }
}
