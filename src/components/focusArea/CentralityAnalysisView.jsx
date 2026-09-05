import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEFAULT_CENTRALITY_VISIBLE, scaleLabel } from '../../constants/centrality.js'
import {
  centralityModeFromSearchParams,
  DEFAULT_WHAT_IF_VISIBLE,
  mergeCentralityModeIntoSearchRecord,
  mergeWhatIfViewIntoSearchRecord,
  readPersistedCentralityMode,
  readPersistedWhatIfView,
  searchParamsToRecord,
  writePersistedCentralityMode,
  writePersistedWhatIfView,
  whatIfViewFromSearchParams,
  WHAT_IF_MODES,
  WHAT_IF_STATUS,
  WHAT_IF_VIEWS,
} from '../../constants/centralityWhatIf.js'
import { useCentralityAllScales } from '../../hooks/useCentralityAllScales.js'
import { useCentralityLayers } from '../../hooks/useCentralityLayers.js'
import { useWhatIfDrawing } from '../../hooks/useWhatIfDrawing.js'
import { useWhatIfGuidance } from '../../hooks/useWhatIfGuidance.js'
import { useWhatIfScenario } from '../../hooks/useWhatIfScenario.js'
import BetweennessPanel from './BetweennessPanel.jsx'
import CentralityMap from './CentralityMap.jsx'
import ClosenessPanel from './ClosenessPanel.jsx'
import WhatIfMetricPanel from './whatIf/WhatIfMetricPanel.jsx'
import WhatIfCompareView from './whatIf/compare/WhatIfCompareView.jsx'
import { COMPARE_SLOT_STATUS } from '../../constants/whatIfCompare.js'
import { nearbySegmentDeltas, NEARBY_DELTA_METERS } from '../../utils/nearbyWhatIfDeltas.js'

const CENTRALITY_METRIC_IDS = ['closeness', 'betweenness']

function downloadProposedGeoJson(geo) {
  const blob = new Blob([JSON.stringify(geo, null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'proposed_links.geojson'
  a.click()
  URL.revokeObjectURL(url)
}

/** Sub-section 1 — centrality analysis; owns Baseline vs What-if layout. */
export default function CentralityAnalysisView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState(() => readPersistedCentralityMode())
  const [whatIfView, setWhatIfView] = useState(() =>
    readPersistedCentralityMode() === WHAT_IF_MODES.whatIf
      ? readPersistedWhatIfView()
      : WHAT_IF_VIEWS.draw,
  )

  useEffect(() => {
    const fromUrl = centralityModeFromSearchParams(searchParams)
    setMode((prev) => (prev === fromUrl ? prev : fromUrl))
  }, [searchParams])

  useEffect(() => {
    const fromUrl = whatIfViewFromSearchParams(searchParams)
    setWhatIfView((prev) => (prev === fromUrl ? prev : fromUrl))
  }, [searchParams])

  // Keep URL (and session) aligned when What-if was restored without centralityMode in the bar.
  useEffect(() => {
    if (mode !== WHAT_IF_MODES.whatIf) return
    const urlMode = centralityModeFromSearchParams(searchParams)
    if (urlMode === WHAT_IF_MODES.whatIf) return
    writePersistedCentralityMode(WHAT_IF_MODES.whatIf)
    setSearchParams(
      (prev) =>
        mergeCentralityModeIntoSearchRecord(searchParamsToRecord(prev), WHAT_IF_MODES.whatIf, {
          ensureCentralitySub: true,
        }),
      { replace: true },
    )
  }, [mode, searchParams, setSearchParams])
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

  // IDs present in scenario GeoJSON but not baseline — fed to WhatIfNewSegmentsLayer
  // with the same mapCloseness/mapBetweenness + scenario stats as the main GeoJSON layer.
  const newSegmentIds = useMemo(() => {
    if (!scenarioApi.activeScenario || !scenarioApi.scenarioCloseness?.features?.length) {
      return null
    }
    // Wait for baseline so we do not treat the entire scenario as "new"
    if (!closeness?.features?.length) return null
    const scenarioFeatures = scenarioApi.scenarioCloseness.features
    const baseIds = new Set(
      closeness.features
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

  const handleWhatIfViewChange = useCallback(
    (view) => {
      setWhatIfView(view)
      writePersistedWhatIfView(view)
      writePersistedCentralityMode(WHAT_IF_MODES.whatIf)
      setMode(WHAT_IF_MODES.whatIf)
      setSearchParams(
        (prev) => {
          const record = mergeCentralityModeIntoSearchRecord(searchParamsToRecord(prev), WHAT_IF_MODES.whatIf, {
            ensureCentralitySub: true,
          })
          return mergeWhatIfViewIntoSearchRecord(record, view)
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const handleModeChange = useCallback(
    (next) => {
      setMode(next)
      setSelectedSegmentId(null)
      writePersistedCentralityMode(next)
      const nextView = next === WHAT_IF_MODES.whatIf ? whatIfView : WHAT_IF_VIEWS.draw
      if (next !== WHAT_IF_MODES.whatIf) {
        setWhatIfView(WHAT_IF_VIEWS.draw)
        writePersistedWhatIfView(WHAT_IF_VIEWS.draw)
      }
      setSearchParams(
        (prev) => {
          const record = mergeCentralityModeIntoSearchRecord(searchParamsToRecord(prev), next, {
            ensureCentralitySub: true,
          })
          return mergeWhatIfViewIntoSearchRecord(record, nextView)
        },
        { replace: true },
      )
      if (next === WHAT_IF_MODES.baseline) {
        scenarioApi.resetScenario()
        drawing.resetDrawing()
      }
    },
    [scenarioApi, drawing, setSearchParams, whatIfView],
  )

  const handleWhatIfSegmentClick = useCallback((id) => {
    setSelectedSegmentId((prev) => (prev == id ? null : id))
  }, [])

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

  const nearbyBlock = useMemo(() => {
    if (!isWhatIf || !scenarioApi.activeScenario) {
      return { closeness: [], betweenness: [] }
    }
    return {
      closeness: nearbySegmentDeltas({
        links: drawing.links,
        baseline: closeness,
        scenario: scenarioApi.scenarioCloseness,
        metric: 'closeness',
        scaleMeters,
        radiusM: NEARBY_DELTA_METERS,
      }),
      betweenness: nearbySegmentDeltas({
        links: drawing.links,
        baseline: betweenness,
        scenario: scenarioApi.scenarioBetweenness,
        metric: 'betweenness',
        scaleMeters,
        radiusM: NEARBY_DELTA_METERS,
      }),
    }
  }, [
    isWhatIf,
    scenarioApi.activeScenario,
    scenarioApi.scenarioCloseness,
    scenarioApi.scenarioBetweenness,
    drawing.links,
    closeness,
    betweenness,
    scaleMeters,
  ])

  const hasRankings = useMemo(() => {
    const block = scenarioApi.deltaBlock
    if (!block) return false
    return Boolean(
      block.closeness?.top_gainers?.length ||
        block.closeness?.top_losers?.length ||
        block.betweenness?.top_gainers?.length ||
        block.betweenness?.top_losers?.length,
    )
  }, [scenarioApi.deltaBlock])

  const guidance = useWhatIfGuidance({
    isWhatIf: isWhatIf && whatIfView !== WHAT_IF_VIEWS.compare,
    status: scenarioApi.status,
    workerOnline: scenarioApi.workerOnline,
    sdnaMissing: scenarioApi.sdnaMissing,
    error: scenarioApi.error,
    drawHint,
    tool: drawing.tool,
    draftLength: drawing.draftCoords.length,
    linkCount,
    hasLinks: drawing.hasLinks,
    hasRankings,
  })

  const statusText = useMemo(() => {
    if (!isWhatIf) return null
    if (guidance.suppressesStatusText) return null
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
    return null
  }, [
    isWhatIf,
    guidance.suppressesStatusText,
    scenarioApi.status,
    scenarioApi.error,
    scenarioApi.sdnaMissing,
  ])

  const runLabel = scenarioApi.workerOnline ? 'Run sDNA (local)' : 'Export proposed links'

  const gridClass = isWhatIf
    ? 'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[24%_52%_24%] lg:overflow-hidden'
    : 'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[30%_40%_30%] lg:overflow-hidden'

  const computing =
    loading ||
    scenarioApi.status === WHAT_IF_STATUS.loading ||
    scenarioApi.status === WHAT_IF_STATUS.computing

  const isCompare = isWhatIf && whatIfView === WHAT_IF_VIEWS.compare

  const handleSyncOptionA = useCallback(
    (slotA) => {
      drawing.importLinks(slotA?.links ?? [])
      if (
        slotA?.status === COMPARE_SLOT_STATUS.ready &&
        slotA.jobId &&
        slotA.closeness &&
        slotA.betweenness
      ) {
        scenarioApi.hydrateScenarioPayload(
          {
            summary: slotA.summary,
            closeness: slotA.closeness,
            betweenness: slotA.betweenness,
          },
          slotA.jobId,
          scaleMeters,
        )
      } else if (slotA?.links?.length) {
        scenarioApi.markNeedsCompute()
      } else {
        scenarioApi.resetScenario()
      }
    },
    [drawing, scenarioApi, scaleMeters],
  )

  if (isCompare) {
    return (
      <WhatIfCompareView
        scaleMeters={scaleMeters}
        onScaleChange={setScaleMeters}
        namedRoads={namedRoads}
        snapNodes={scenarioApi.snapNodes}
        baselineCloseness={closeness}
        baselineBetweenness={betweenness}
        baselineClosenessStats={closenessStats}
        baselineBetweennessStats={betweennessStats}
        layersLoading={loading}
        initialOptionA={{
          links: drawing.links,
          jobId: scenarioApi.jobId,
          summary: scenarioApi.summary,
          closeness: scenarioApi.scenarioCloseness,
          betweenness: scenarioApi.scenarioBetweenness,
          ready: scenarioApi.status === WHAT_IF_STATUS.scenario,
        }}
        workerOnline={scenarioApi.workerOnline}
        workerReachable={scenarioApi.workerReachable}
        sdnaMissing={scenarioApi.sdnaMissing}
        onConnect={scenarioApi.connectWorker}
        onBackToDraw={() => handleWhatIfViewChange(WHAT_IF_VIEWS.draw)}
        onModeChange={handleModeChange}
        whatIfView={whatIfView}
        onWhatIfViewChange={handleWhatIfViewChange}
        onSyncOptionA={handleSyncOptionA}
      />
    )
  }

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
            workerReachable={scenarioApi.workerReachable}
            sdnaMissing={scenarioApi.sdnaMissing}
            linkCount={linkCount}
            selectedSegmentId={selectedSegmentId}
            onSegmentClick={handleWhatIfSegmentClick}
            summaryWarning={scenarioApi.summary?.warnings?.[0]}
            guidanceActive={guidance.guidanceActive}
            nearbyRows={nearbyBlock.closeness}
            onConnect={scenarioApi.connectWorker}
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
            whatIfView={whatIfView}
            onWhatIfViewChange={handleWhatIfViewChange}
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
              guidance,
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
            workerReachable={scenarioApi.workerReachable}
            sdnaMissing={scenarioApi.sdnaMissing}
            linkCount={linkCount}
            selectedSegmentId={selectedSegmentId}
            onSegmentClick={handleWhatIfSegmentClick}
            summaryWarning={scenarioApi.summary?.warnings?.[0]}
            guidanceActive={guidance.guidanceActive}
            nearbyRows={nearbyBlock.betweenness}
            onConnect={scenarioApi.connectWorker}
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
