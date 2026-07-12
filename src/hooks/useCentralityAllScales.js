import { useEffect, useState } from 'react'
import { CENTRALITY_SCALES, centralityGeoUrl } from '../constants/centrality.js'
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
 * Fetches all 8 centrality GeoJSON files once on mount (4 scales × 2 metrics)
 * and computes the average value per scale for each metric.
 * Used to populate the cross-scale comparison bar charts in both panels.
 */
export function useCentralityAllScales() {
  const [closenessAvgs, setClosenessAvgs] = useState([])
  const [betweennessAvgs, setBetweennessAvgs] = useState([])

  useEffect(() => {
    const scales = CENTRALITY_SCALES.map((s) => s.meters) // [500, 2000, 3000, 5000]

    // Fetch in pairs: [closeness_500, betweenness_500, closeness_2000, betweenness_2000, ...]
    Promise.all(
      scales.flatMap((s) => [
        fetchGeoJson(centralityGeoUrl(`closeness_${s}.geojson`)),
        fetchGeoJson(centralityGeoUrl(`betweenness_${s}.geojson`)),
      ]),
    ).then((results) => {
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
  }, [])

  return { closenessAvgs, betweennessAvgs }
}
