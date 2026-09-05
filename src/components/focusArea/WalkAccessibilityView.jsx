import { useState } from 'react'
import {
  DEFAULT_WALK_VISIBLE,
  WALK_METRIC_IDS,
  hasWalkHexSelectableLayer,
} from '../../constants/walkAccessibility.js'
import { useWalkAccessibilityLayers } from '../../hooks/useWalkAccessibilityLayers.js'
import LayerLoadError from '../LayerLoadError.jsx'
import WalkAccessGroupsPanel from './WalkAccessGroupsPanel.jsx'
import WalkAccessMap from './WalkAccessMap.jsx'
import WalkAccessScorePanel from './WalkAccessScorePanel.jsx'

/**
 * Sub-section 4 — Walk Accessibility.
 * Left: score KPIs · Center: map · Right: destination groups / deserts.
 */
export default function WalkAccessibilityView() {
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_WALK_VISIBLE)
  const [focusedHexId, setFocusedHexId] = useState(null)
  const {
    hex,
    excludedHex,
    hexGrid,
    buildings,
    roads,
    pois,
    boundary,
    deserts,
    mismatch,
    stats,
    loading,
    error,
  } = useWalkAccessibilityLayers()

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => {
      const next = { ...prev, [id]: checked }
      if (checked && WALK_METRIC_IDS.includes(id)) {
        for (const m of WALK_METRIC_IDS) {
          if (m !== id) next[m] = false
        }
      }
      const hasMetric = WALK_METRIC_IDS.some((m) => next[m])
      if (!hasMetric || !hasWalkHexSelectableLayer(next)) {
        setFocusedHexId(null)
      }
      return next
    })
  }

  function handleFocusCell(metricId, hexId) {
    if (hexId == null || !WALK_METRIC_IDS.includes(metricId)) return
    setVisibleLayers((prev) => {
      const next = { ...prev }
      for (const m of WALK_METRIC_IDS) {
        next[m] = m === metricId
      }
      return next
    })
    setFocusedHexId(hexId)
  }

  return (
    <>
      <div className="order-2 overflow-y-auto p-4 lg:order-1">
        <WalkAccessScorePanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>

      <div className="relative order-1 flex min-h-[360px] flex-col border-y border-surface-700 py-3 lg:order-2 lg:min-h-0 lg:border-x lg:border-y-0">
        <LayerLoadError error={error} />
        <div className="min-h-0 flex-1">
          <WalkAccessMap
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            hex={hex}
            excludedHex={excludedHex}
            hexGrid={hexGrid}
            buildings={buildings}
            roads={roads}
            pois={pois}
            boundary={boundary}
            deserts={deserts}
            mismatch={mismatch}
            stats={stats}
            loading={loading}
            focusedHexId={focusedHexId}
          />
        </div>
      </div>

      <div className="order-3 overflow-y-auto p-4">
        <WalkAccessGroupsPanel stats={stats} loading={loading} onFocusCell={handleFocusCell} />
      </div>
    </>
  )
}
