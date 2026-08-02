import { useState } from 'react'
import {
  DEFAULT_NETWORK_FORM_SCOPE,
  DEFAULT_NETWORK_FORM_VISIBLE,
} from '../../constants/networkForm.js'
import { useNetworkFormLayers } from '../../hooks/useNetworkFormLayers.js'
import NetworkFormDetailPanel from './NetworkFormDetailPanel.jsx'
import NetworkFormMap from './NetworkFormMap.jsx'
import NetworkFormOverviewPanel from './NetworkFormOverviewPanel.jsx'

/** Focus Area — Network Form (junction typology) 30/40/30 layout. */
export default function NetworkFormView() {
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_NETWORK_FORM_VISIBLE)
  const [selectedJunctionId, setSelectedJunctionId] = useState(null)
  const [selectedScope, setSelectedScope] = useState(DEFAULT_NETWORK_FORM_SCOPE)

  const {
    gnBoundary,
    allGnBoundary,
    streets,
    junctions,
    metrics,
    findings,
    counts,
    typeZones,
    culdesacRows,
    culdesacDepthStats,
    culdesacHex,
    culdesacSpatialSummary,
    loading,
  } = useNetworkFormLayers(selectedScope)

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => ({ ...prev, [id]: checked }))
  }

  function handleSelectScope(scope) {
    setSelectedScope(scope)
    setSelectedJunctionId(null)
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
          selectedScope={selectedScope}
          onSelectScope={handleSelectScope}
        />
      </div>

      <div className="order-1 flex min-h-[360px] flex-col border-y border-surface-700 py-3 lg:order-2 lg:min-h-0 lg:border-x lg:border-y-0">
        <div className="min-h-0 flex-1">
          <NetworkFormMap
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            gnBoundary={gnBoundary}
            allGnBoundary={allGnBoundary}
            selectedScope={selectedScope}
            streets={streets}
            junctions={junctions}
            culdesacHex={culdesacHex}
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
          culdesacDepthStats={culdesacDepthStats}
          culdesacSpatialSummary={culdesacSpatialSummary}
          loading={loading}
          selectedScope={selectedScope}
          onJunctionClick={setSelectedJunctionId}
        />
      </div>
    </>
  )
}
