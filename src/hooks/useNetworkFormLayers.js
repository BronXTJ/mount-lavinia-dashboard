import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_NETWORK_FORM_SCOPE,
  networkFormGeoUrl,
} from '../constants/networkForm.js'
import {
  buildTypeShareZones,
  countByJtype,
  filterJunctionsByScope,
  filterStreetsByGnFeatures,
  gnFeaturesForScope,
  listCuldesacs,
  mergeCuldesacDepth,
  mergeCuldesacDensityUmi,
  mergeCuldesacWalk,
  scopeCuldesacDepthSummary,
  scopeFindings,
  scopeMetrics,
} from '../utils/networkFormStats.js'

async function fetchJson(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Loads Network Form layers once; derives scoped metrics/layers from selectedScope.
 */
export function useNetworkFormLayers(selectedScope = DEFAULT_NETWORK_FORM_SCOPE) {
  const [gn5, setGn5] = useState(null)
  const [streetsAll, setStreetsAll] = useState(null)
  const [junctionsAll, setJunctionsAll] = useState(null)
  const [metricsByScope, setMetricsByScope] = useState(null)
  const [findingsByScope, setFindingsByScope] = useState(null)
  const [culdesacDepth, setCuldesacDepth] = useState(null)
  const [culdesacDepthSummary, setCuldesacDepthSummary] = useState(null)
  const [culdesacHex, setCuldesacHex] = useState(null)
  const [culdesacSpatialSummary, setCuldesacSpatialSummary] = useState(null)
  const [culdesacHexWalk, setCuldesacHexWalk] = useState(null)
  const [culdesacWalkSummary, setCuldesacWalkSummary] = useState(null)
  const [culdesacHexUmi, setCuldesacHexUmi] = useState(null)
  const [culdesacDensityUmiSummary, setCuldesacDensityUmiSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [
        gn,
        streetFc,
        junc,
        met,
        find,
        depthFc,
        depthSum,
        hexFc,
        spatialSum,
        hexWalkFc,
        walkPts,
        walkSum,
        hexUmiFc,
        densPts,
        densSum,
      ] = await Promise.all([
        fetchJson(networkFormGeoUrl('gn5_divisions.geojson')),
        fetchJson(networkFormGeoUrl('roads_streets.geojson')),
        fetchJson(networkFormGeoUrl('junctions_classified.geojson')),
        fetchJson(networkFormGeoUrl('metrics_by_scope.json')),
        fetchJson(networkFormGeoUrl('findings_by_scope.json')),
        fetchJson(networkFormGeoUrl('culdesacs_depth.geojson')),
        fetchJson(networkFormGeoUrl('culdesac_depth_summary.json')),
        fetchJson(networkFormGeoUrl('culdesac_hex_counts.geojson')),
        fetchJson(networkFormGeoUrl('culdesac_spatial_summary.json')),
        fetchJson(networkFormGeoUrl('culdesac_hex_walk.geojson')),
        fetchJson(networkFormGeoUrl('culdesacs_walk.geojson')),
        fetchJson(networkFormGeoUrl('culdesac_walk_summary.json')),
        fetchJson(networkFormGeoUrl('culdesac_hex_density_umi.geojson')),
        fetchJson(networkFormGeoUrl('culdesacs_density_umi.geojson')),
        fetchJson(networkFormGeoUrl('culdesac_density_umi_summary.json')),
      ])
      if (cancelled) return
      setGn5(gn)
      setStreetsAll(streetFc)
      setJunctionsAll(
        mergeCuldesacDensityUmi(
          mergeCuldesacWalk(mergeCuldesacDepth(junc, depthFc), walkPts),
          densPts,
        ),
      )
      setMetricsByScope(met)
      setFindingsByScope(find)
      setCuldesacDepth(depthFc)
      setCuldesacDepthSummary(depthSum)
      setCuldesacHex(hexFc)
      setCuldesacSpatialSummary(spatialSum)
      setCuldesacHexWalk(hexWalkFc)
      setCuldesacWalkSummary(walkSum)
      setCuldesacHexUmi(hexUmiFc)
      setCuldesacDensityUmiSummary(densSum)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const scopeGnFeatures = useMemo(
    () => gnFeaturesForScope(gn5, selectedScope),
    [gn5, selectedScope],
  )

  const gnBoundary = useMemo(() => {
    if (!scopeGnFeatures.length) return null
    return { type: 'FeatureCollection', features: scopeGnFeatures }
  }, [scopeGnFeatures])

  const allGnBoundary = useMemo(() => {
    if (!gn5?.features) return null
    return gn5
  }, [gn5])

  const scopedFeatures = useMemo(
    () => filterJunctionsByScope(junctionsAll, selectedScope),
    [junctionsAll, selectedScope],
  )

  const streets = useMemo(
    () => filterStreetsByGnFeatures(streetsAll, scopeGnFeatures),
    [streetsAll, scopeGnFeatures],
  )

  const counts = useMemo(() => countByJtype(scopedFeatures), [scopedFeatures])
  const typeZones = useMemo(() => buildTypeShareZones(counts), [counts])
  const culdesacRows = useMemo(() => listCuldesacs(scopedFeatures), [scopedFeatures])

  const junctions = useMemo(() => {
    if (!junctionsAll) return null
    return { type: 'FeatureCollection', features: scopedFeatures }
  }, [junctionsAll, scopedFeatures])

  const metrics = useMemo(
    () => scopeMetrics(metricsByScope, selectedScope),
    [metricsByScope, selectedScope],
  )
  const findings = useMemo(
    () => scopeFindings(findingsByScope, selectedScope),
    [findingsByScope, selectedScope],
  )

  const culdesacDepthStats = useMemo(
    () => scopeCuldesacDepthSummary(culdesacDepthSummary, selectedScope),
    [culdesacDepthSummary, selectedScope],
  )

  return {
    gnBoundary,
    allGnBoundary,
    streets,
    junctions,
    metrics,
    findings,
    counts,
    typeZones,
    culdesacRows,
    culdesacDepthStats,
    culdesacDepth,
    culdesacHex,
    culdesacSpatialSummary,
    culdesacHexWalk,
    culdesacWalkSummary,
    culdesacHexUmi,
    culdesacDensityUmiSummary,
    loading,
    selectedScope,
  }
}
