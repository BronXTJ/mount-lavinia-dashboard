import { useState } from 'react'
import {
  DEFAULT_DENSITY_VISIBLE,
  DENSITY_METRIC_IDS,
  hasHexSelectableLayer,
} from '../../constants/density.js'
import { useDensityLayers } from '../../hooks/useDensityLayers.js'
import LayerLoadError from '../LayerLoadError.jsx'
import BuiltFormPanel from './BuiltFormPanel.jsx'
import DensityMap from './DensityMap.jsx'
import OpennessPanel from './OpennessPanel.jsx'

/**
 * Sub-section 2 — Density Analysis.
 * Hex-grid choropleth + built-form / openness side panels.
 * Each hex cell is clickable for typology + metric popup.
 */
export default function DensityAnalysisView() {
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_DENSITY_VISIBLE)
  const [focusedHexId, setFocusedHexId] = useState(null)
  const { hex, excludedHex, hexGrid, buildings, roads, pois, boundary, stats, loading, error } =
    useDensityLayers()

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => {
      const next = { ...prev, [id]: checked }
      if (checked && DENSITY_METRIC_IDS.includes(id)) {
        for (const m of DENSITY_METRIC_IDS) {
          if (m !== id) next[m] = false
        }
      }
      const hasMetric = DENSITY_METRIC_IDS.some((m) => next[m])
      if (!hasMetric || !hasHexSelectableLayer(next)) {
        setFocusedHexId(null)
      }
      return next
    })
  }

  function handleFocusCell(metricId, hexId) {
    if (hexId == null || !DENSITY_METRIC_IDS.includes(metricId)) return
    setVisibleLayers((prev) => {
      const next = { ...prev }
      for (const m of DENSITY_METRIC_IDS) {
        next[m] = m === metricId
      }
      return next
    })
    setFocusedHexId(hexId)
  }

  return (
    <>
      <div className="order-2 overflow-y-auto p-4 lg:order-1">
        <BuiltFormPanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>

      <div className="relative order-1 flex min-h-[360px] flex-col border-y border-surface-700 py-3 lg:order-2 lg:min-h-0 lg:border-x lg:border-y-0">
        <LayerLoadError error={error} />
        <div className="min-h-0 flex-1">
          <DensityMap
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            hex={hex}
            excludedHex={excludedHex}
            hexGrid={hexGrid}
            buildings={buildings}
            roads={roads}
            pois={pois}
            boundary={boundary}
            stats={stats}
            loading={loading}
            focusedHexId={focusedHexId}
          />
        </div>
      </div>

      <div className="order-3 overflow-y-auto p-4">
        <OpennessPanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>
    </>
  )
}
