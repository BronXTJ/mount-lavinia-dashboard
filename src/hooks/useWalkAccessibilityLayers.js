import { useEffect, useState } from 'react'
import { walkContextGeoUrl, walkGeoUrl } from '../constants/walkAccessibility.js'
import {
  buildOutlineCollection,
  buildWalkAccessibilityStats,
  isWalkDesertFeature,
  isWalkMismatchFeature,
} from '../utils/walkAccessibilityStats.js'
import { partitionHexFeatures } from '../utils/hexCellGrade.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'

const EMPTY_STATS = {
  accessScore: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  accessScoreClasses: null,
  timeSummaries: {},
  timeClasses: {},
  tiers: [],
  tierCounts: { high: 0, medium: 0, low: 0, excluded: 0 },
  coverageBars: [],
  groupDetail: [],
  desertCount: 0,
  mismatchCount: 0,
  desertIds: [],
  mismatchIds: [],
  meanAccessScore: null,
  analysisHexCount: 0,
  umiContrastNote: '',
  findings: [],
  hexCounts: null,
}

/**
 * Loads Walk Accessibility hex + context layers once on mount.
 * KPIs use ≥90% complete hexes (partitionHexFeatures); access POIs from pois_snapped.geojson.
 */
export function useWalkAccessibilityLayers() {
  const [hex, setHex] = useState(null)
  const [excludedHex, setExcludedHex] = useState(null)
  const [hexGrid, setHexGrid] = useState(null)
  const [buildings, setBuildings] = useState(null)
  const [roads, setRoads] = useState(null)
  const [pois, setPois] = useState(null)
  const [boundary, setBoundary] = useState(null)
  const [deserts, setDeserts] = useState(null)
  const [mismatch, setMismatch] = useState(null)
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)

    Promise.all([
      fetchJsonOrNull(walkGeoUrl('access_hex_classified.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(walkGeoUrl('pois_snapped.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(walkGeoUrl('access_primary_summary.json'), { signal: ctrl.signal }),
      fetchJsonOrNull(walkGeoUrl('findings_summary.json'), { signal: ctrl.signal }),
      fetchJsonOrNull(walkContextGeoUrl('hex_grid_primary_100m.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(walkContextGeoUrl('buildings_primary_floors.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(walkContextGeoUrl('roads_primary.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(walkContextGeoUrl('primary_study_area_boundary.geojson'), { signal: ctrl.signal }),
    ]).then(
      ([
        rawHex,
        poisData,
        primarySummary,
        findingsSummary,
        hexGridData,
        buildingsData,
        roadsData,
        boundaryData,
      ]) => {
        const { mapFc, excludedFc, statsFeatures, counts } = partitionHexFeatures(rawHex)

        const summary = findingsSummary ?? primarySummary
        const built = statsFeatures.length
          ? { ...buildWalkAccessibilityStats(statsFeatures, summary), hexCounts: counts }
          : { ...EMPTY_STATS, hexCounts: counts }

        setHex(mapFc)
        setExcludedHex(excludedFc)
        setHexGrid(hexGridData)
        setBuildings(buildingsData)
        setRoads(roadsData)
        setPois(poisData)
        setBoundary(boundaryData)
        setDeserts(buildOutlineCollection(rawHex, isWalkDesertFeature))
        setMismatch(buildOutlineCollection(rawHex, isWalkMismatchFeature))
        setStats(built)
        setLoading(false)
      },
    ).catch((err) => {
      if (err?.name === 'AbortError') return
      setError(err)
      setLoading(false)
    })

    return () => {
      ctrl.abort()
    }
  }, [])

  return {
    hex,
    excludedHex,
    hexGrid,
    buildings,
    roads,
    pois,
    boundary,
    deserts,
    mismatch,
    stats,
    loading,
    error,
  }
}
