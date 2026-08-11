import { useCallback, useEffect, useMemo, useState } from 'react'
import { WHAT_IF_STATUS, whatIfDataUrl, whatIfScenarioUrl } from '../constants/centralityWhatIf.js'
import { summarizeGeoJson } from '../utils/centralityStats.js'

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
 * Loads snap nodes; tracks What-if analysis status.
 * Scenario layers load only from a user-computed scenario folder (local sDNA), not a baked demo.
 */
export function useWhatIfScenario(scaleMeters, namedRoads) {
  const [snapNodes, setSnapNodes] = useState(null)
  const [summary, setSummary] = useState(null)
  const [scenarioCloseness, setScenarioCloseness] = useState(null)
  const [scenarioBetweenness, setScenarioBetweenness] = useState(null)
  const [status, setStatus] = useState(WHAT_IF_STATUS.draft)
  const [error, setError] = useState(null)
  const [activeScenario, setActiveScenario] = useState(false)
  const [scenarioId, setScenarioId] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchJson(whatIfDataUrl('snap_nodes.geojson')).then((nodes) => {
      if (cancelled) return
      setSnapNodes(nodes)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loadScenarioLayers = useCallback(
    async (id) => {
      if (!id) {
        setStatus(WHAT_IF_STATUS.error)
        setError('No scenario id. Run scripts/what-if/run_sdna_scenario.py locally.')
        return false
      }
      setStatus(WHAT_IF_STATUS.loading)
      setError(null)
      const [c, b, sum] = await Promise.all([
        fetchJson(whatIfScenarioUrl(id, `closeness_${scaleMeters}.geojson`)),
        fetchJson(whatIfScenarioUrl(id, `betweenness_${scaleMeters}.geojson`)),
        fetchJson(whatIfScenarioUrl(id, 'summary.json')),
      ])
      if (!c || !b) {
        setStatus(WHAT_IF_STATUS.error)
        setError('Scenario GeoJSON missing. Run scripts/what-if/run_sdna_scenario.py locally.')
        setActiveScenario(false)
        return false
      }
      setScenarioCloseness(c)
      setScenarioBetweenness(b)
      if (sum) setSummary(sum)
      setScenarioId(id)
      setActiveScenario(true)
      setStatus(WHAT_IF_STATUS.scenario)
      return true
    },
    [scaleMeters],
  )

  useEffect(() => {
    if (!activeScenario || !scenarioId) return
    let cancelled = false
    Promise.all([
      fetchJson(whatIfScenarioUrl(scenarioId, `closeness_${scaleMeters}.geojson`)),
      fetchJson(whatIfScenarioUrl(scenarioId, `betweenness_${scaleMeters}.geojson`)),
    ]).then(([c, b]) => {
      if (cancelled) return
      if (c) setScenarioCloseness(c)
      if (b) setScenarioBetweenness(b)
    })
    return () => {
      cancelled = true
    }
  }, [scaleMeters, activeScenario, scenarioId])

  const resetScenario = useCallback(() => {
    setScenarioCloseness(null)
    setScenarioBetweenness(null)
    setSummary(null)
    setActiveScenario(false)
    setScenarioId(null)
    setError(null)
    setStatus(WHAT_IF_STATUS.draft)
  }, [])

  const markNeedsCompute = useCallback(() => {
    setActiveScenario(false)
    setScenarioCloseness(null)
    setScenarioBetweenness(null)
    setSummary(null)
    setScenarioId(null)
    setStatus(WHAT_IF_STATUS.needsCompute)
  }, [])

  const metricKey = useCallback((metric) => `${metric}_${scaleMeters}`, [scaleMeters])

  const deltaBlock = useMemo(() => {
    if (!summary?.metrics) return null
    return {
      closeness: summary.metrics[metricKey('closeness')] ?? null,
      betweenness: summary.metrics[metricKey('betweenness')] ?? null,
    }
  }, [summary, metricKey])

  const scenarioClosenessStats = useMemo(
    () => summarizeGeoJson(scenarioCloseness, 'closeness', scaleMeters, namedRoads),
    [scenarioCloseness, scaleMeters, namedRoads],
  )
  const scenarioBetweennessStats = useMemo(
    () => summarizeGeoJson(scenarioBetweenness, 'betweenness', scaleMeters, namedRoads),
    [scenarioBetweenness, scaleMeters, namedRoads],
  )

  return {
    snapNodes,
    summary,
    status,
    error,
    activeScenario,
    scenarioCloseness,
    scenarioBetweenness,
    scenarioClosenessStats,
    scenarioBetweennessStats,
    deltaBlock,
    loadScenarioLayers,
    resetScenario,
    markNeedsCompute,
  }
}
