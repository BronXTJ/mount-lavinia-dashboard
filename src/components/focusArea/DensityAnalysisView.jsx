import { useState } from 'react'
import {
  DEFAULT_DENSITY_VISIBLE,
  DENSITY_METRIC_IDS,
  hasHexSelectableLayer,
} from '../../constants/density.js'
import { useDensityLayers } from '../../hooks/useDensityLayers.js'
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
  const { hex, excludedHex, hexGrid, buildings, roads, pois, boundary, stats, loading } =
    useDensityLayers()

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => {
      const next = { ...prev, [id]: checked }
      if (checked && DENSITY_METRIC_IDS.includes(id)) {
        for (const m of DENSITY_METRIC_IDS) {
          if (m !== id) next[m] = false
        }
      }
      if (!hasHexSelectableLayer(next)) {
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
      <div className="overflow-y-auto p-4">
        <BuiltFormPanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>

      <div className="flex min-h-0 flex-col border-x border-surface-700 py-3">
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

      <div className="overflow-y-auto p-4">
        <OpennessPanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>
    </>
  )
}
