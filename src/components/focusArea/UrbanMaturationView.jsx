import { useState } from 'react'
import {
  DEFAULT_MATURATION_VISIBLE,
  MATURATION_METRIC_IDS,
  hasMaturationHexSelectableLayer,
} from '../../constants/maturation.js'
import { useMaturationLayers } from '../../hooks/useMaturationLayers.js'
import LandUseMixPanel from './LandUseMixPanel.jsx'
import MaturationMap from './MaturationMap.jsx'
import MaturationScorePanel from './MaturationScorePanel.jsx'

/**
 * Sub-section 3 — Urban Maturation Analysis.
 * Left: land use & entropy · Center: map · Right: UMI score panels.
 */
export default function UrbanMaturationView() {
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_MATURATION_VISIBLE)
  const [focusedHexId, setFocusedHexId] = useState(null)
  const { hex, excludedHex, hexGrid, landuse, buildings, roads, pois, boundary, stats, loading } =
    useMaturationLayers()

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => {
      const next = { ...prev, [id]: checked }
      if (checked && MATURATION_METRIC_IDS.includes(id)) {
        for (const m of MATURATION_METRIC_IDS) {
          if (m !== id) next[m] = false
        }
      }
      if (!hasMaturationHexSelectableLayer(next)) {
        setFocusedHexId(null)
      }
      return next
    })
  }

  function handleFocusCell(metricId, hexId) {
    if (hexId == null || !MATURATION_METRIC_IDS.includes(metricId)) return
    setVisibleLayers((prev) => {
      const next = { ...prev }
      for (const m of MATURATION_METRIC_IDS) {
        next[m] = m === metricId
      }
      return next
    })
    setFocusedHexId(hexId)
  }

  return (
    <>
      <div className="overflow-y-auto p-4">
        <LandUseMixPanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>

      <div className="flex min-h-0 flex-col border-x border-surface-700 py-3">
        <div className="min-h-0 flex-1">
          <MaturationMap
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            hex={hex}
            excludedHex={excludedHex}
            hexGrid={hexGrid}
            landuse={landuse}
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
        <MaturationScorePanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>
    </>
  )
}
