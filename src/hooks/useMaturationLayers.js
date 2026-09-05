import { useEffect, useState } from 'react'
import { maturationGeoUrl } from '../constants/maturation.js'
import { densityGeoUrl } from '../constants/density.js'
import { fetchJsonOrNull } from '../lib/dataClient.js'
import { buildMaturationStats } from '../utils/maturationStats.js'
import { annotateHexAreaFromGrid, partitionHexFeatures } from '../utils/hexCellGrade.js'

const EMPTY_STATS = {
  umi: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  entropyRaw: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  entropyNorm: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  accessibilityNorm: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  accessibilityRaw: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  landUseNorm: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  entropyMedian: null,
  cellsAboveMedian: 0,
  mixedUse: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  shannonEntropy: { min: null, max: null, avg: null, highestId: null, lowestId: null },
  tiers: null,
  landUseComposition: [],
  scatter: [],
  hexFunctionalMix: null,
  landUseDiversityClasses: null,
  umiClasses: null,
  entropyClasses: null,
  accessibilityClasses: null,
  umiHistogram: [],
  accessibilityHistogram: [],
  componentContribution: [],
  hexCounts: null,
}

/**
 * Loads Urban Maturation hex + shannon + landuse + Density context layers.
 * Grades by Hex_area from the shared 100 m grid; KPIs use ≥90% cells only.
 */
export function useMaturationLayers() {
  const [hex, setHex] = useState(null)
  const [excludedHex, setExcludedHex] = useState(null)
  const [hexGrid, setHexGrid] = useState(null)
  const [landuse, setLanduse] = useState(null)
  const [shannon, setShannon] = useState(null)
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
      fetchJsonOrNull(maturationGeoUrl('maturation_primary_hex.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(maturationGeoUrl('shanon_entropy_primary.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(maturationGeoUrl('landuse_primary.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('hex_grid_primary_100m.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('buildings_primary_floors.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('roads_primary.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('pois_primary.geojson'), { signal: ctrl.signal }),
      fetchJsonOrNull(densityGeoUrl('primary_study_area_boundary.geojson'), { signal: ctrl.signal }),
    ]).then(
      ([
        rawHex,
        shannonData,
        landuseData,
        hexGridData,
        buildingsData,
        roadsData,
        poisData,
        boundaryData,
      ]) => {
        const withArea = {
          type: 'FeatureCollection',
          features: annotateHexAreaFromGrid(rawHex?.features ?? [], hexGridData),
        }
        const { mapFc, excludedFc, statsFeatures, counts } = partitionHexFeatures(withArea)

        const shannonFeatures = shannonData?.features ?? []

        setHex(mapFc)
        setExcludedHex(excludedFc)
        setShannon(shannonData)
        setLanduse(landuseData)
        setHexGrid(hexGridData)
        setBuildings(buildingsData)
        setRoads(roadsData)
        setPois(poisData)
        setBoundary(boundaryData)
        setStats(
          statsFeatures.length
            ? {
                ...buildMaturationStats(statsFeatures, shannonFeatures, landuseData),
                hexCounts: counts,
              }
            : { ...EMPTY_STATS, hexCounts: counts },
        )
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
    landuse,
    shannon,
    buildings,
    roads,
    pois,
    boundary,
    stats,
    loading,
    error,
  }
}
