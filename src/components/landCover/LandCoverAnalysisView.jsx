import { useState } from 'react'
import LandCoverMap from './LandCoverMap.jsx'
import LandCoverOverviewPanel from './LandCoverOverviewPanel.jsx'
import LandCoverDetailPanel from './LandCoverDetailPanel.jsx'

/**
 * Land Cover Change — full-bleed 30/40/30 layout.
 * Left: KPIs + trend + GN list · Center: map · Right: selected detail.
 */
export default function LandCoverAnalysisView() {
  const [layerMode, setLayerMode] = useState('classified')
  const [epochId, setEpochId] = useState('y2025')
  const [showGnBoundaries, setShowGnBoundaries] = useState(true)
  const [selectedGn, setSelectedGn] = useState(null)

  return (
    <>
      <div className="order-2 overflow-y-auto p-4 lg:order-1">
        <LandCoverOverviewPanel selectedGn={selectedGn} onSelectGn={setSelectedGn} />
      </div>

      <div className="order-1 flex min-h-[360px] flex-col border-y border-surface-700 py-3 lg:order-2 lg:min-h-0 lg:border-x lg:border-y-0">
        <div className="min-h-0 flex-1">
          <LandCoverMap
            layerMode={layerMode}
            epochId={epochId}
            showGnBoundaries={showGnBoundaries}
            selectedGn={selectedGn}
            onSelectGn={setSelectedGn}
            onLayerModeChange={setLayerMode}
            onEpochChange={setEpochId}
            onToggleGnBoundaries={setShowGnBoundaries}
          />
        </div>
      </div>

      <div className="order-3 overflow-y-auto p-4">
        <LandCoverDetailPanel selectedGn={selectedGn} epochId={epochId} />
      </div>
    </>
  )
}
