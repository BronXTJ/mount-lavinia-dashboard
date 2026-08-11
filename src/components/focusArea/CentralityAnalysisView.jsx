import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_CENTRALITY_VISIBLE, scaleLabel } from '../../constants/centrality.js'
import {
  DEFAULT_WHAT_IF_VISIBLE,
  WHAT_IF_DRAW_TOOLS,
  WHAT_IF_MODES,
  WHAT_IF_STATUS,
} from '../../constants/centralityWhatIf.js'
import { useCentralityAllScales } from '../../hooks/useCentralityAllScales.js'
import { useCentralityLayers } from '../../hooks/useCentralityLayers.js'
import { useWhatIfDrawing } from '../../hooks/useWhatIfDrawing.js'
import { useWhatIfScenario } from '../../hooks/useWhatIfScenario.js'
import BetweennessPanel from './BetweennessPanel.jsx'
import CentralityMap from './CentralityMap.jsx'
import ClosenessPanel from './ClosenessPanel.jsx'
import WhatIfMetricPanel from './whatIf/WhatIfMetricPanel.jsx'

function downloadProposedGeoJson(geojson) {
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'proposed_links.geojson'
  a.click()
  URL.revokeObjectURL(url)
}

const CENTRALITY_METRIC_IDS = ['closeness', 'betweenness']

/** Sub-section 1 — centrality analysis; owns Baseline vs What-if layout. */
export default function CentralityAnalysisView() {
  const [mode, setMode] = useState(WHAT_IF_MODES.baseline)
  const [scaleMeters, setScaleMeters] = useState(500)
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_CENTRALITY_VISIBLE)
  const [whatIfVisible, setWhatIfVisible] = useState(DEFAULT_WHAT_IF_VISIBLE)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)

  const [drawHint, setDrawHint] = useState(null)

  const isWhatIf = mode === WHAT_IF_MODES.whatIf

  const { closeness, betweenness, closenessStats, betweennessStats, loading, namedRoads } =
    useCentralityLayers(scaleMeters)
  const { closenessAvgs, betweennessAvgs } = useCentralityAllScales()

  const scenarioApi = useWhatIfScenario(scaleMeters, namedRoads)
  const drawing = useWhatIfDrawing(scenarioApi.snapNodes)

  const currentScaleLabel = scaleLabel(scaleMeters)
  const linkCount = drawing.links.length

  const newSegmentIds = useMemo(() => {
    if (!scenarioApi.activeScenario || !scenarioApi.scenarioCloseness?.features?.length) {
      return null
    }
    const scenarioFeatures = scenarioApi.scenarioCloseness.features
    const baseIds = new Set(
      (closeness?.features ?? [])
        .map((f) => Number(f.properties?.ID))
        .filter((n) => Number.isFinite(n)),
    )
    const ids = new Set()
    for (const f of scenarioFeatures) {
      const id = Number(f.properties?.ID)
      if (!Number.isFinite(id)) continue
      if (!baseIds.has(id)) ids.add(id)
    }
    if (ids.size) return ids
    // Fallback: sDNA appends new links at the high end of the ID range
    if (linkCount > 0) {
      const sorted = scenarioFeatures
        .map((f) => Number(f.properties?.ID))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => b - a)
      return new Set(sorted.slice(0, linkCount))
    }
    return null
  }, [scenarioApi.activeScenario, scenarioApi.scenarioCloseness, closeness, linkCount])

  function handleToggleLayer(id, checked) {
    const apply = (prev) => {
      const next = { ...prev, [id]: checked }
      if (checked && CENTRALITY_METRIC_IDS.includes(id)) {
        for (const m of CENTRALITY_METRIC_IDS) {
          if (m !== id) next[m] = false
        }
      }
      return next
    }
    if (isWhatIf) setWhatIfVisible(apply)
    else setVisibleLayers(apply)
  }

  const maybeRecompute = useCallback(
    (result) => {
      if (!result?.changedFinished) return
      if (result.geojson?.features?.length) {
        void scenarioApi.runComputeJob(result.geojson)
      } else {
        scenarioApi.resetScenario()
      }
    },
    [scenarioApi],
  )

  const handleModeChange = useCallback(
    (next) => {
      setMode(next)
      setSelectedSegmentId(null)
      if (next === WHAT_IF_MODES.baseline) {
        scenarioApi.resetScenario()
        drawing.resetDrawing()
      }
    },
    [scenarioApi, drawing],
  )

  const handleFinishLink = useCallback(
    (mapOrEvent, latlng) => {
      const isMap = mapOrEvent && typeof mapOrEvent.latLngToContainerPoint === 'function'
      const geo =
        isMap && latlng
          ? drawing.finishLinkAt(mapOrEvent, latlng)
          : drawing.finishLink()
      if (geo?.features?.length) {
        setDrawHint(null)
        void scenarioApi.runComputeJob(geo)
        return
      }
      setDrawHint('Need at least 2 points — then Esc / ✓ / double-click to finish and run sDNA')
    },
    [drawing, scenarioApi],
  )

  const handleUndo = useCallback(() => {
    const result = drawing.undo()
    maybeRecompute(result)
  }, [drawing, maybeRecompute])

  const handleRedo = useCallback(() => {
    const result = drawing.redo()
    maybeRecompute(result)
  }, [drawing, maybeRecompute])

  const handleEraseLink = useCallback(
    (linkId) => {
      const result = drawing.removeLink(linkId)
      maybeRecompute(result)
    },
    [drawing, maybeRecompute],
  )

  const handleRun = useCallback(async () => {
    let geo = drawing.exportProposedGeoJson()
    if (!geo.features.length && drawing.draftCoords.length >= 2) {
      geo = drawing.finishLink()
    }
    if (!geo?.features?.length) {
      setDrawHint('Draw and finish at least one link (≥2 points) before ▶')
      scenarioApi.markNeedsCompute()
      return
    }
    setDrawHint(null)
    const result = await scenarioApi.runComputeJob(geo)
    if (result?.offline) {
      downloadProposedGeoJson(geo)
      scenarioApi.markNeedsCompute()
    }
  }, [drawing, scenarioApi])

  const handleReset = useCallback(() => {
    scenarioApi.resetScenario()
    drawing.resetDrawing()
  }, [scenarioApi, drawing])

  const mapCloseness = useMemo(() => {
    if (isWhatIf && scenarioApi.activeScenario) return scenarioApi.scenarioCloseness
    return closeness
  }, [isWhatIf, scenarioApi.activeScenario, scenarioApi.scenarioCloseness, closeness])

  const mapBetweenness = useMemo(() => {
    if (isWhatIf && scenarioApi.activeScenario) return scenarioApi.scenarioBetweenness
    return betweenness
  }, [isWhatIf, scenarioApi.activeScenario, scenarioApi.scenarioBetweenness, betweenness])

  const mapClosenessStats = useMemo(() => {
    if (isWhatIf && scenarioApi.activeScenario) return scenarioApi.scenarioClosenessStats
    return closenessStats
  }, [isWhatIf, scenarioApi.activeScenario, scenarioApi.scenarioClosenessStats, closenessStats])

  const mapBetweennessStats = useMemo(() => {
    if (isWhatIf && scenarioApi.activeScenario) return scenarioApi.scenarioBetweennessStats
    return betweennessStats
  }, [isWhatIf, scenarioApi.activeScenario, scenarioApi.scenarioBetweennessStats, betweennessStats])

  const statusText = useMemo(() => {
    if (!isWhatIf) return null
    if (drawHint) return drawHint
    if (drawing.tool === WHAT_IF_DRAW_TOOLS.erase) {
      return 'Erase mode — click one drawn link to delete it'
    }
    if (scenarioApi.sdnaMissing) {
      return 'Worker reachable but sDNA missing — install to C:\\Program Files (x86)\\sDNA'
    }
    if (scenarioApi.status === WHAT_IF_STATUS.loading) {
      return 'Loading scenario layers for this scale…'
    }
    if (scenarioApi.status === WHAT_IF_STATUS.computing) {
      return 'Computing sDNA on local worker…'
    }
    if (scenarioApi.status === WHAT_IF_STATUS.error) {
      return scenarioApi.error || 'sDNA error — check worker log'
    }
    if (scenarioApi.status === WHAT_IF_STATUS.scenario) {
      return scenarioApi.workerOnline
        ? 'Showing sDNA scenario results (local worker)'
        : 'Showing sDNA scenario results'
    }
    if (scenarioApi.status === WHAT_IF_STATUS.needsCompute) {
      return scenarioApi.workerOnline
        ? 'Press ▶ to run sDNA on the local worker'
        : 'Worker offline — ▶ exports GeoJSON for offline sDNA'
    }
    if (drawing.tool === 'pencil') {
      return scenarioApi.workerOnline
        ? 'Click snap nodes · finish link to auto-run sDNA'
        : 'Click snap nodes · finish link · start npm run what-if:worker for auto sDNA'
    }
    if (!drawing.hasLinks) {
      return scenarioApi.workerOnline
        ? 'Draw proposed links — finish a link to compute'
        : 'Draw links · start what-if:worker for live sDNA (or ▶ to export)'
    }
    return scenarioApi.workerOnline
      ? 'Press ▶ to re-run sDNA'
      : 'Worker offline — ▶ exports GeoJSON'
  }, [
    isWhatIf,
    drawHint,
    scenarioApi.status,
    scenarioApi.error,
    scenarioApi.workerOnline,
    scenarioApi.sdnaMissing,
    drawing.tool,
    drawing.hasLinks,
  ])

  const runLabel = scenarioApi.workerOnline ? 'Run sDNA (local)' : 'Export proposed links'

  const gridClass = isWhatIf
    ? 'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[24%_52%_24%] lg:overflow-hidden'
    : 'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[30%_40%_30%] lg:overflow-hidden'

  const computing =
    loading ||
    scenarioApi.status === WHAT_IF_STATUS.loading ||
    scenarioApi.status === WHAT_IF_STATUS.computing

  return (
    <div className={gridClass}>
      <div
        className={
          isWhatIf
            ? 'order-2 min-h-0 min-w-0 overflow-hidden lg:order-1'
            : 'order-2 overflow-y-auto p-4 lg:order-1'
        }
      >
        {isWhatIf ? (
          <WhatIfMetricPanel
            metric="closeness"
            scaleLabel={currentScaleLabel}
            status={scenarioApi.status}
            error={scenarioApi.error}
            deltaBlock={scenarioApi.deltaBlock}
            workerOnline={scenarioApi.workerOnline}
            sdnaMissing={scenarioApi.sdnaMissing}
            linkCount={linkCount}
            onSegmentClick={setSelectedSegmentId}
          />
        ) : (
          <ClosenessPanel
            scaleLabel={currentScaleLabel}
            stats={closenessStats}
            loading={loading}
            onSegmentClick={setSelectedSegmentId}
            allScaleAvgs={closenessAvgs}
            currentGeoJson={closeness}
            scaleMeters={scaleMeters}
          />
        )}
      </div>

      <div className="order-1 flex min-h-[360px] flex-col border-y border-surface-700 py-3 lg:order-2 lg:min-h-0 lg:border-x lg:border-y-0">
        <div className="min-h-0 flex-1">
          <CentralityMap
            scaleMeters={scaleMeters}
            onScaleChange={setScaleMeters}
            visibleLayers={isWhatIf ? whatIfVisible : visibleLayers}
            onToggleLayer={handleToggleLayer}
            closeness={mapCloseness}
            betweenness={mapBetweenness}
            closenessStats={mapClosenessStats}
            betweennessStats={mapBetweennessStats}
            loading={computing}
            namedRoads={namedRoads}
            selectedSegmentId={selectedSegmentId}
            mode={mode}
            onModeChange={handleModeChange}
            whatIf={{
              drawing,
              snapNodes: scenarioApi.snapNodes,
              statusText,
              runLabel,
              onFinishLink: handleFinishLink,
              onUndo: handleUndo,
              onRedo: handleRedo,
              onEraseLink: handleEraseLink,
              onRun: handleRun,
              onReset: handleReset,
              showProposed: whatIfVisible.proposedLinks,
              showSnapNodes: whatIfVisible.snapNodes,
              newSegmentIds,
              hideFinishedProposed: Boolean(scenarioApi.activeScenario),
            }}
          />
        </div>
      </div>

      <div
        className={
          isWhatIf
            ? 'order-3 min-h-0 min-w-0 overflow-hidden'
            : 'order-3 overflow-y-auto p-4'
        }
      >
        {isWhatIf ? (
          <WhatIfMetricPanel
            metric="betweenness"
            scaleLabel={currentScaleLabel}
            status={scenarioApi.status}
            error={scenarioApi.error}
            deltaBlock={scenarioApi.deltaBlock}
            workerOnline={scenarioApi.workerOnline}
            sdnaMissing={scenarioApi.sdnaMissing}
            linkCount={linkCount}
            onSegmentClick={setSelectedSegmentId}
          />
        ) : (
          <BetweennessPanel
            scaleLabel={currentScaleLabel}
            stats={betweennessStats}
            loading={loading}
            onSegmentClick={setSelectedSegmentId}
            allScaleAvgs={betweennessAvgs}
            currentGeoJson={betweenness}
            scaleMeters={scaleMeters}
          />
        )}
      </div>
    </div>
  )
}
