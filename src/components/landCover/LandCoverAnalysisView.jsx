import { useState } from 'react'
import { DEFAULT_LC_VISIBLE, LC_OVERLAY_IDS } from '../../constants/landCover.js'
import LandCoverMap from './LandCoverMap.jsx'
import LandCoverOverviewPanel from './LandCoverOverviewPanel.jsx'
import LandCoverDetailPanel from './LandCoverDetailPanel.jsx'

/**
 * Land Cover Change — full-bleed 30/40/30 layout.
 * Left: KPIs + trend + GN list · Center: map · Right: selected detail.
 */
export default function LandCoverAnalysisView() {
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_LC_VISIBLE)
  const [epochId, setEpochId] = useState('y2025')
  const [selectedGn, setSelectedGn] = useState(null)

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => {
      const next = { ...prev, [id]: checked }
      if (checked && LC_OVERLAY_IDS.includes(id)) {
        for (const overlayId of LC_OVERLAY_IDS) {
          if (overlayId !== id) next[overlayId] = false
        }
      }
      return next
    })
  }

  return (
    <>
      <div className="order-2 overflow-y-auto p-4 lg:order-1">
        <LandCoverOverviewPanel selectedGn={selectedGn} onSelectGn={setSelectedGn} />
      </div>

      <div className="order-1 flex min-h-[360px] flex-col border-y border-surface-700 py-3 lg:order-2 lg:min-h-0 lg:border-x lg:border-y-0">
        <div className="min-h-0 flex-1">
          <LandCoverMap
            visibleLayers={visibleLayers}
            epochId={epochId}
            selectedGn={selectedGn}
            onSelectGn={setSelectedGn}
            onToggleLayer={handleToggleLayer}
            onEpochChange={setEpochId}
          />
        </div>
      </div>

      <div className="order-3 overflow-y-auto p-4">
        <LandCoverDetailPanel selectedGn={selectedGn} epochId={epochId} />
      </div>
    </>
  )
}
