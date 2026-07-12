import { useEffect, useState } from 'react'
import {
  DEFAULT_ENV_VISIBLE,
  ENV_METRIC_IDS,
  hasEnvSelectableLayer,
} from '../../constants/environmental.js'
import { useEnvironmentalLayers } from '../../hooks/useEnvironmentalLayers.js'
import EnvironmentalMap from './EnvironmentalMap.jsx'
import MicroclimatePanel from './MicroclimatePanel.jsx'
import ThermalComfortPanel from './ThermalComfortPanel.jsx'

/**
 * Environmental Analysis — full-bleed 30/40/30 layout.
 * 10 m UTCI / UHI choropleth + SVF points + side panels.
 */
export default function EnvironmentalAnalysisView() {
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_ENV_VISIBLE)
  const [focusedCellId, setFocusedCellId] = useState(null)
  const { grid, svfPoints, boundary, buildings, roads, stats, loading } =
    useEnvironmentalLayers()

  useEffect(() => {
    if (!hasEnvSelectableLayer(visibleLayers)) setFocusedCellId(null)
  }, [visibleLayers])

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => {
      const next = { ...prev, [id]: checked }
      if (checked && ENV_METRIC_IDS.includes(id)) {
        for (const m of ENV_METRIC_IDS) {
          if (m !== id) next[m] = false
        }
      }
      return next
    })
  }

  function handleFocusCell(metricId, cellId) {
    if (cellId == null || !ENV_METRIC_IDS.includes(metricId)) return
    setVisibleLayers((prev) => {
      const next = { ...prev }
      for (const m of ENV_METRIC_IDS) {
        next[m] = m === metricId
      }
      return next
    })
    setFocusedCellId(cellId)
  }

  return (
    <>
      <div className="overflow-y-auto p-4">
        <ThermalComfortPanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>

      <div className="flex min-h-0 flex-col border-x border-surface-700 py-3">
        <div className="min-h-0 flex-1">
          <EnvironmentalMap
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            grid={grid}
            svfPoints={svfPoints}
            boundary={boundary}
            buildings={buildings}
            roads={roads}
            stats={stats}
            loading={loading}
            focusedCellId={focusedCellId}
          />
        </div>
      </div>

      <div className="overflow-y-auto p-4">
        <MicroclimatePanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>
    </>
  )
}
