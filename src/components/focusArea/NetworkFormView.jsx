import { useState } from 'react'
import { DEFAULT_NETWORK_FORM_VISIBLE } from '../../constants/networkForm.js'
import { useNetworkFormLayers } from '../../hooks/useNetworkFormLayers.js'
import NetworkFormDetailPanel from './NetworkFormDetailPanel.jsx'
import NetworkFormMap from './NetworkFormMap.jsx'
import NetworkFormOverviewPanel from './NetworkFormOverviewPanel.jsx'

/** Focus Area — Network Form (junction typology) 30/40/30 layout. */
export default function NetworkFormView() {
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_NETWORK_FORM_VISIBLE)
  const [selectedJunctionId, setSelectedJunctionId] = useState(null)

  const {
    gnBoundary,
    streets,
    junctions,
    metrics,
    findings,
    counts,
    typeZones,
    culdesacRows,
    loading,
  } = useNetworkFormLayers()

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => ({ ...prev, [id]: checked }))
  }

  return (
    <>
      <div className="order-2 overflow-y-auto p-4 lg:order-1">
        <NetworkFormOverviewPanel
          metrics={metrics}
          findings={findings}
          typeZones={typeZones}
          counts={counts}
          loading={loading}
        />
      </div>

      <div className="order-1 flex min-h-[360px] flex-col border-y border-surface-700 py-3 lg:order-2 lg:min-h-0 lg:border-x lg:border-y-0">
        <div className="min-h-0 flex-1">
          <NetworkFormMap
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            gnBoundary={gnBoundary}
            streets={streets}
            junctions={junctions}
            counts={counts}
            loading={loading}
            selectedJunctionId={selectedJunctionId}
            onSelectJunction={setSelectedJunctionId}
          />
        </div>
      </div>

      <div className="order-3 overflow-y-auto p-4">
        <NetworkFormDetailPanel
          findings={findings}
          metrics={metrics}
          culdesacRows={culdesacRows}
          loading={loading}
          onJunctionClick={setSelectedJunctionId}
        />
      </div>
    </>
  )
}
