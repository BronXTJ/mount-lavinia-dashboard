import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WHAT_IF_STATUS, whatIfDataUrl, whatIfWorkerArtifactUrl } from '../constants/centralityWhatIf.js'
import { summarizeGeoJson } from '../utils/centralityStats.js'
import { checkWorkerHealth, runWhatIfJob } from '../utils/whatIfWorker.js'

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
 * Prefers local FastAPI worker artifacts; falls back to offline export messaging.
 * workerOnline means reachable AND sDNA present (ready to POST jobs).
 */
export function useWhatIfScenario(scaleMeters, namedRoads) {
  const [snapNodes, setSnapNodes] = useState(null)
  const [summary, setSummary] = useState(null)
  const [scenarioCloseness, setScenarioCloseness] = useState(null)
  const [scenarioBetweenness, setScenarioBetweenness] = useState(null)
  const [status, setStatus] = useState(WHAT_IF_STATUS.draft)
  const [error, setError] = useState(null)
  const [activeScenario, setActiveScenario] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [workerOnline, setWorkerOnline] = useState(false)
  const [workerReachable, setWorkerReachable] = useState(false)
  const [sdnaMissing, setSdnaMissing] = useState(false)
  const abortRef = useRef(null)
  const jobIdRef = useRef(null)
  /** Skip one scale-reload after applyScenarioPayload (layers already match scaleMeters). */
  const skipScaleReloadRef = useRef(false)

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

  useEffect(() => {
    let cancelled = false
    const tick = () => {
      checkWorkerHealth().then((h) => {
        if (cancelled) return
        const reachable = Boolean(h?.ok)
        const sdnaOk = Boolean(h?.sdna)
        setWorkerReachable(reachable)
        setSdnaMissing(reachable && !sdnaOk)
        setWorkerOnline(reachable && sdnaOk)
      })
    }
    tick()
    const id = setInterval(tick, 8000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const applyScenarioPayload = useCallback((payload, nextJobId) => {
    skipScaleReloadRef.current = true
    setScenarioCloseness(payload.closeness)
    setScenarioBetweenness(payload.betweenness)
    setSummary(payload.summary ?? null)
    setJobId(nextJobId)
    jobIdRef.current = nextJobId
    setActiveScenario(true)
    setError(null)
    setStatus(WHAT_IF_STATUS.scenario)
  }, [])

  // Reload closeness/betweenness when scale changes for an active worker job.
  // Clear immediately so stale NQPDA/BtA fields are never styled with the new radius.
  useEffect(() => {
    if (!activeScenario || !jobId) return
    if (skipScaleReloadRef.current) {
      skipScaleReloadRef.current = false
      return
    }
    let cancelled = false
    setScenarioCloseness(null)
    setScenarioBetweenness(null)
    setStatus(WHAT_IF_STATUS.loading)
    Promise.all([
      fetchJson(whatIfWorkerArtifactUrl(jobId, `closeness_${scaleMeters}.geojson`)),
      fetchJson(whatIfWorkerArtifactUrl(jobId, `betweenness_${scaleMeters}.geojson`)),
    ]).then(([c, b]) => {
      if (cancelled) return
      if (c && b) {
        setScenarioCloseness(c)
        setScenarioBetweenness(b)
        setError(null)
        setStatus(WHAT_IF_STATUS.scenario)
        return
      }
      setScenarioCloseness(null)
      setScenarioBetweenness(null)
      setError(`Failed to load ${scaleMeters}m scenario layers from the worker`)
      setStatus(WHAT_IF_STATUS.error)
    })
    return () => {
      cancelled = true
    }
  }, [scaleMeters, activeScenario, jobId])

  const resetScenario = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setScenarioCloseness(null)
    setScenarioBetweenness(null)
    setSummary(null)
    setActiveScenario(false)
    setJobId(null)
    jobIdRef.current = null
    setError(null)
    setStatus(WHAT_IF_STATUS.draft)
  }, [])

  const markNeedsCompute = useCallback(() => {
    setActiveScenario(false)
    setScenarioCloseness(null)
    setScenarioBetweenness(null)
    setSummary(null)
    setJobId(null)
    jobIdRef.current = null
    setStatus(WHAT_IF_STATUS.needsCompute)
  }, [])

  const runComputeJob = useCallback(
    async (geojson) => {
      if (!geojson?.features?.length) {
        setStatus(WHAT_IF_STATUS.needsCompute)
        return { ok: false, offline: false }
      }
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setStatus(WHAT_IF_STATUS.computing)
      setError(null)
      try {
        const result = await runWhatIfJob(geojson, scaleMeters, { signal: ctrl.signal })
        if (ctrl.signal.aborted) return { ok: false, offline: false }
        applyScenarioPayload(result, result.jobId)
        setWorkerOnline(true)
        setWorkerReachable(true)
        setSdnaMissing(false)
        return { ok: true, offline: false }
      } catch (err) {
        if (ctrl.signal.aborted || err?.message === 'Aborted') {
          return { ok: false, offline: false, aborted: true }
        }
        if (err?.code === 'WORKER_OFFLINE') {
          setWorkerOnline(false)
          setWorkerReachable(false)
          setSdnaMissing(false)
          setStatus(WHAT_IF_STATUS.needsCompute)
          setError(null)
          return { ok: false, offline: true }
        }
        if (err?.code === 'SDNA_MISSING') {
          setWorkerReachable(true)
          setWorkerOnline(false)
          setSdnaMissing(true)
          setStatus(WHAT_IF_STATUS.error)
          setError('Worker online but sDNA not found at C:\\Program Files (x86)\\sDNA')
          setActiveScenario(false)
          return { ok: false, offline: false }
        }
        setStatus(WHAT_IF_STATUS.error)
        setError(err?.message || 'sDNA compute failed')
        setActiveScenario(false)
        return { ok: false, offline: false }
      }
    },
    [scaleMeters, applyScenarioPayload],
  )

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
    workerOnline,
    workerReachable,
    sdnaMissing,
    scenarioCloseness,
    scenarioBetweenness,
    scenarioClosenessStats,
    scenarioBetweennessStats,
    deltaBlock,
    resetScenario,
    markNeedsCompute,
    runComputeJob,
  }
}
