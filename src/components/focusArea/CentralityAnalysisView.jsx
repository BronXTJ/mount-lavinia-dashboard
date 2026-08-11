import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_CENTRALITY_VISIBLE, scaleLabel } from '../../constants/centrality.js'
import {
  DEFAULT_WHAT_IF_VISIBLE,
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

/** Sub-section 1 — centrality analysis; owns Baseline vs What-if layout. */
export default function CentralityAnalysisView() {
  const [mode, setMode] = useState(WHAT_IF_MODES.baseline)
  const [scaleMeters, setScaleMeters] = useState(500)
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_CENTRALITY_VISIBLE)
  const [whatIfVisible, setWhatIfVisible] = useState(DEFAULT_WHAT_IF_VISIBLE)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)

  const isWhatIf = mode === WHAT_IF_MODES.whatIf

  const { closeness, betweenness, closenessStats, betweennessStats, loading, namedRoads } =
    useCentralityLayers(scaleMeters)
  const { closenessAvgs, betweennessAvgs } = useCentralityAllScales()

  const scenarioApi = useWhatIfScenario(scaleMeters, namedRoads)
  const drawing = useWhatIfDrawing(scenarioApi.snapNodes)

  const currentScaleLabel = scaleLabel(scaleMeters)

  function handleToggleLayer(id, checked) {
    if (isWhatIf) {
      setWhatIfVisible((prev) => ({ ...prev, [id]: checked }))
    } else {
      setVisibleLayers((prev) => ({ ...prev, [id]: checked }))
    }
  }

  const handleModeChange = useCallback(
    (next) => {
      setMode(next)
      setSelectedSegmentId(null)
      if (next === WHAT_IF_MODES.baseline) {
        scenarioApi.resetScenario()
        drawing.clearLinks()
      }
    },
    [scenarioApi, drawing],
  )

  const handleRun = useCallback(() => {
    if (!drawing.hasLinks) {
      scenarioApi.markNeedsCompute()
      return
    }
    const blob = new Blob([JSON.stringify(drawing.exportProposedGeoJson(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'proposed_links.geojson'
    a.click()
    URL.revokeObjectURL(url)
    scenarioApi.markNeedsCompute()
  }, [drawing, scenarioApi])

  const handleReset = useCallback(() => {
    scenarioApi.resetScenario()
    drawing.clearLinks()
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
    if (scenarioApi.status === WHAT_IF_STATUS.needsCompute) {
      return 'Links exported — run scripts/what-if/run_sdna_scenario.py, then refresh'
    }
    if (scenarioApi.status === WHAT_IF_STATUS.scenario) {
      return 'Showing local sDNA scenario results'
    }
    if (drawing.tool === 'pencil') {
      return 'Click snap nodes · double-click or ✓ to finish link · Esc cancels'
    }
    if (!drawing.hasLinks) {
      return 'Draw proposed links with the pencil, then ▶ to export for sDNA'
    }
    return 'Press ▶ to export proposed_links.geojson for local sDNA'
  }, [isWhatIf, scenarioApi.status, drawing.tool, drawing.hasLinks])

  const gridClass = isWhatIf
    ? 'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[20%_60%_20%] lg:overflow-hidden'
    : 'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[30%_40%_30%] lg:overflow-hidden'

  return (
    <div className={gridClass}>
      <div
        className={
          isWhatIf
            ? 'order-2 min-h-0 overflow-hidden lg:order-1'
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
            loading={loading || scenarioApi.status === WHAT_IF_STATUS.loading}
            namedRoads={namedRoads}
            selectedSegmentId={selectedSegmentId}
            mode={mode}
            onModeChange={handleModeChange}
            whatIf={{
              drawing,
              snapNodes: scenarioApi.snapNodes,
              statusText,
              onRun: handleRun,
              onReset: handleReset,
              showProposed: whatIfVisible.proposedLinks,
              showSnapNodes: whatIfVisible.snapNodes,
            }}
          />
        </div>
      </div>

      <div
        className={
          isWhatIf
            ? 'order-3 min-h-0 overflow-hidden'
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
