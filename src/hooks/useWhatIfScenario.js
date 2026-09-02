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
  const scaleMetersRef = useRef(scaleMeters)
  const statusRef = useRef(status)
  /** Skip one scale-reload after apply when payload scale already matches UI. */
  const skipScaleReloadRef = useRef(false)
  /** Scale meters used for the in-flight / last applied job artifacts. */
  const jobScaleRef = useRef(null)

  useEffect(() => {
    scaleMetersRef.current = scaleMeters
  }, [scaleMeters])

  useEffect(() => {
    statusRef.current = status
  }, [status])

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

  const applyHealth = useCallback((h) => {
    const reachable = Boolean(h?.ok)
    const sdnaOk = Boolean(h?.sdna)
    setWorkerReachable(reachable)
    setSdnaMissing(reachable && !sdnaOk)
    setWorkerOnline(reachable && sdnaOk)
    return { reachable, sdnaOk }
  }, [])

  useEffect(() => {
    let cancelled = false
    const tick = () => {
      checkWorkerHealth().then((h) => {
        if (cancelled) return
        applyHealth(h)
      })
    }
    tick()
    const id = setInterval(tick, 8000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [applyHealth])

  // Abort in-flight compute when the user changes scale mid-job.
  useEffect(() => {
    if (statusRef.current === WHAT_IF_STATUS.computing && abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
      setStatus(WHAT_IF_STATUS.needsCompute)
      setError(null)
    }
  }, [scaleMeters])

  const applyScenarioPayload = useCallback((payload, nextJobId, jobScale) => {
    const uiScale = scaleMetersRef.current
    jobScaleRef.current = jobScale
    setSummary(payload.summary ?? null)
    setJobId(nextJobId)
    jobIdRef.current = nextJobId
    setActiveScenario(true)
    setError(null)

    if (jobScale === uiScale && payload.closeness && payload.betweenness) {
      skipScaleReloadRef.current = true
      setScenarioCloseness(payload.closeness)
      setScenarioBetweenness(payload.betweenness)
      setStatus(WHAT_IF_STATUS.scenario)
      return
    }

    // UI scale differs from job fetch scale — load matching radius artifacts.
    skipScaleReloadRef.current = false
    setScenarioCloseness(null)
    setScenarioBetweenness(null)
    setStatus(WHAT_IF_STATUS.loading)
    Promise.all([
      fetchJson(whatIfWorkerArtifactUrl(nextJobId, `closeness_${uiScale}.geojson`)),
      fetchJson(whatIfWorkerArtifactUrl(nextJobId, `betweenness_${uiScale}.geojson`)),
    ]).then(([c, b]) => {
      if (jobIdRef.current !== nextJobId) return
      if (c && b) {
        setScenarioCloseness(c)
        setScenarioBetweenness(b)
        setError(null)
        setStatus(WHAT_IF_STATUS.scenario)
        return
      }
      setScenarioCloseness(null)
      setScenarioBetweenness(null)
      setError(`Failed to load ${uiScale}m scenario layers from the worker`)
      setStatus(WHAT_IF_STATUS.error)
    })
  }, [])

  // Reload closeness/betweenness when scale changes for an active worker job.
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
    jobScaleRef.current = null
    setError(null)
    setStatus(WHAT_IF_STATUS.draft)
  }, [])

  const connectWorker = useCallback(async () => {
    const h = await checkWorkerHealth()
    const { reachable, sdnaOk } = applyHealth(h)
    return { ok: reachable && sdnaOk, reachable, sdnaMissing: reachable && !sdnaOk }
  }, [applyHealth])

  const markNeedsCompute = useCallback(() => {
    setActiveScenario(false)
    setScenarioCloseness(null)
    setScenarioBetweenness(null)
    setSummary(null)
    setJobId(null)
    jobIdRef.current = null
    jobScaleRef.current = null
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
      const jobScale = scaleMetersRef.current
      // M1: clear stale scenario so old ramp colors (incl. deleted links) do not linger
      setActiveScenario(false)
      setScenarioCloseness(null)
      setScenarioBetweenness(null)
      setSummary(null)
      setJobId(null)
      jobIdRef.current = null
      setStatus(WHAT_IF_STATUS.computing)
      setError(null)
      try {
        const result = await runWhatIfJob(geojson, jobScale, { signal: ctrl.signal })
        if (ctrl.signal.aborted) return { ok: false, offline: false, aborted: true }
        applyScenarioPayload(result, result.jobId, jobScale)
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
    [applyScenarioPayload],
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
    jobId,
    resetScenario,
    markNeedsCompute,
    connectWorker,
    runComputeJob,
    hydrateScenarioPayload: applyScenarioPayload,
  }
}
