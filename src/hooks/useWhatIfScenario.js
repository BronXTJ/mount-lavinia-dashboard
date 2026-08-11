import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  WHAT_IF_SCENARIO_ID,
  WHAT_IF_STATUS,
  whatIfDataUrl,
  whatIfScenarioUrl,
} from '../constants/centralityWhatIf.js'
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
 * Loads snap nodes + beach demo scenario; tracks What-if analysis status.
 */
export function useWhatIfScenario(scaleMeters, namedRoads) {
  const [snapNodes, setSnapNodes] = useState(null)
  const [demoLinks, setDemoLinks] = useState(null)
  const [summary, setSummary] = useState(null)
  const [scenarioCloseness, setScenarioCloseness] = useState(null)
  const [scenarioBetweenness, setScenarioBetweenness] = useState(null)
  const [status, setStatus] = useState(WHAT_IF_STATUS.draft)
  const [error, setError] = useState(null)
  const [activeScenario, setActiveScenario] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchJson(whatIfDataUrl('snap_nodes.geojson')),
      fetchJson(whatIfScenarioUrl(WHAT_IF_SCENARIO_ID, 'proposed_links.geojson')),
      fetchJson(whatIfScenarioUrl(WHAT_IF_SCENARIO_ID, 'summary.json')),
    ]).then(([nodes, links, sum]) => {
      if (cancelled) return
      setSnapNodes(nodes)
      setDemoLinks(links)
      setSummary(sum)
      if (links?.features?.length && sum) setStatus(WHAT_IF_STATUS.readyDemo)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loadScenarioLayers = useCallback(
    async (scenarioId = WHAT_IF_SCENARIO_ID) => {
      setStatus(WHAT_IF_STATUS.loading)
      setError(null)
      const [c, b, sum] = await Promise.all([
        fetchJson(whatIfScenarioUrl(scenarioId, `closeness_${scaleMeters}.geojson`)),
        fetchJson(whatIfScenarioUrl(scenarioId, `betweenness_${scaleMeters}.geojson`)),
        fetchJson(whatIfScenarioUrl(scenarioId, 'summary.json')),
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
      setActiveScenario(true)
      setStatus(WHAT_IF_STATUS.scenario)
      return true
    },
    [scaleMeters],
  )

  // Refresh scenario layers when scale changes while scenario active
  useEffect(() => {
    if (!activeScenario) return
    let cancelled = false
    Promise.all([
      fetchJson(whatIfScenarioUrl(WHAT_IF_SCENARIO_ID, `closeness_${scaleMeters}.geojson`)),
      fetchJson(whatIfScenarioUrl(WHAT_IF_SCENARIO_ID, `betweenness_${scaleMeters}.geojson`)),
    ]).then(([c, b]) => {
      if (cancelled) return
      if (c) setScenarioCloseness(c)
      if (b) setScenarioBetweenness(b)
    })
    return () => {
      cancelled = true
    }
  }, [scaleMeters, activeScenario])

  const resetScenario = useCallback(() => {
    setScenarioCloseness(null)
    setScenarioBetweenness(null)
    setActiveScenario(false)
    setError(null)
    setStatus(demoLinks ? WHAT_IF_STATUS.readyDemo : WHAT_IF_STATUS.draft)
  }, [demoLinks])

  const markNeedsCompute = useCallback(() => {
    setActiveScenario(false)
    setScenarioCloseness(null)
    setScenarioBetweenness(null)
    setStatus(WHAT_IF_STATUS.needsCompute)
  }, [])

  const metricKey = useCallback(
    (metric) => `${metric}_${scaleMeters}`,
    [scaleMeters],
  )

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
    demoLinks,
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
