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
import { fetchJsonOrNull } from '../lib/dataClient.js'

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
  const [error, setError] = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
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
        fetchJsonOrNull(networkFormGeoUrl('gn5_divisions.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('roads_streets.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('junctions_classified.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('metrics_by_scope.json'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('findings_by_scope.json'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesacs_depth.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesac_depth_summary.json'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesac_hex_counts.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesac_spatial_summary.json'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesac_hex_walk.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesacs_walk.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesac_walk_summary.json'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesac_hex_density_umi.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesacs_density_umi.geojson'), { signal: ctrl.signal }),
        fetchJsonOrNull(networkFormGeoUrl('culdesac_density_umi_summary.json'), { signal: ctrl.signal }),
      ])
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

    load().catch((err) => {
      if (err?.name === 'AbortError') return
      setError(err)
      setLoading(false)
    })
    return () => {
      ctrl.abort()
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
    error,
  }
}
