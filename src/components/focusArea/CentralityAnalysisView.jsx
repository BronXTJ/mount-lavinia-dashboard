import { useState } from 'react'
import { DEFAULT_CENTRALITY_VISIBLE, scaleLabel } from '../../constants/centrality.js'
import { useCentralityAllScales } from '../../hooks/useCentralityAllScales.js'
import { useCentralityLayers } from '../../hooks/useCentralityLayers.js'
import BetweennessPanel from './BetweennessPanel.jsx'
import CentralityMap from './CentralityMap.jsx'
import ClosenessPanel from './ClosenessPanel.jsx'

/** Sub-section 1 — full centrality analysis with map + side panels. */
export default function CentralityAnalysisView() {
  const [scaleMeters, setScaleMeters] = useState(500)
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_CENTRALITY_VISIBLE)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)

  const { closeness, betweenness, closenessStats, betweennessStats, loading, namedRoads } =
    useCentralityLayers(scaleMeters)

  // Load all 4 scales on mount for the cross-scale comparison charts
  const { closenessAvgs, betweennessAvgs } = useCentralityAllScales()

  const currentScaleLabel = scaleLabel(scaleMeters)

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => ({ ...prev, [id]: checked }))
  }

  return (
    <>
      <div className="overflow-y-auto p-4">
        <ClosenessPanel
          scaleLabel={currentScaleLabel}
          stats={closenessStats}
          loading={loading}
          onSegmentClick={setSelectedSegmentId}
          allScaleAvgs={closenessAvgs}
          currentGeoJson={closeness}
          scaleMeters={scaleMeters}
        />
      </div>

      <div className="flex min-h-0 flex-col border-x border-surface-700 py-3">
        <div className="min-h-0 flex-1">
          <CentralityMap
            scaleMeters={scaleMeters}
            onScaleChange={setScaleMeters}
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            closeness={closeness}
            betweenness={betweenness}
            closenessStats={closenessStats}
            betweennessStats={betweennessStats}
            loading={loading}
            namedRoads={namedRoads}
            selectedSegmentId={selectedSegmentId}
          />
        </div>
      </div>

      <div className="overflow-y-auto p-4">
        <BetweennessPanel
          scaleLabel={currentScaleLabel}
          stats={betweennessStats}
          loading={loading}
          onSegmentClick={setSelectedSegmentId}
          allScaleAvgs={betweennessAvgs}
          currentGeoJson={betweenness}
          scaleMeters={scaleMeters}
        />
      </div>
    </>
  )
}
