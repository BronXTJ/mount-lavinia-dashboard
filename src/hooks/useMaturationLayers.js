import { useEffect, useState } from 'react'
import { maturationGeoUrl } from '../constants/maturation.js'
import { densityGeoUrl } from '../constants/density.js'
import { boundaryGeoUrl } from '../constants/centrality.js'
import {
  buildMaturationStats,
  filterValidMaturationFeatures,
} from '../utils/maturationStats.js'

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
  umiHistogram: [],
  accessibilityHistogram: [],
  componentContribution: [],
}

/**
 * Loads Urban Maturation hex + shannon + landuse + Density context layers.
 * Reuses density hex grid outline, buildings/roads/pois, and 500m boundary.
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

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetchGeoJson(maturationGeoUrl('urban_maturation_analysis.geojson')),
      fetchGeoJson(maturationGeoUrl('shanon_entropy_index.geojson')),
      fetchGeoJson(maturationGeoUrl('landuse_500m.geojson')),
      fetchGeoJson(densityGeoUrl('hex_grid_500m.geojson')),
      fetchGeoJson(densityGeoUrl('buildings_500m.geojson')),
      fetchGeoJson(densityGeoUrl('roads_clipped_500m.geojson')),
      fetchGeoJson(densityGeoUrl('pois_clipped_500m.geojson')),
      fetchGeoJson(boundaryGeoUrl(500)),
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
        if (cancelled) return

        const validFeatures = filterValidMaturationFeatures(rawHex)
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

        const shannonFeatures = shannonData?.features ?? []

        setHex(hexFc)
        setExcludedHex(excludedFc)
        setShannon(shannonData)
        setLanduse(landuseData)
        setHexGrid(hexGridData)
        setBuildings(buildingsData)
        setRoads(roadsData)
        setPois(poisData)
        setBoundary(boundaryData)
        setStats(
          hexFc
            ? buildMaturationStats(validFeatures, shannonFeatures, landuseData)
            : EMPTY_STATS,
        )
        setLoading(false)
      },
    )

    return () => {
      cancelled = true
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
  }
}
