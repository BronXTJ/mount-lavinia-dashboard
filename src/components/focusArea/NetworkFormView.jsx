import { useMemo, useState } from 'react'
import {
  DEFAULT_NETWORK_FORM_SCOPE,
  DEFAULT_NETWORK_FORM_VISIBLE,
  NETWORK_FORM_GN_NAMES,
  NETWORK_FORM_SCOPE_ALL,
  NETWORK_FORM_GRID_CLASS,
  STREET_TYPOLOGY_GRID_CLASS,
  STREET_TYPOLOGY_TAB_LABEL,
} from '../../constants/networkForm.js'
import {
  DEFAULT_MARSHALL_VISIBLE,
  MARSHALL_GN_NAME,
  NETWORK_FORM_MODE_MARSHALL,
  NETWORK_FORM_MODE_OVERVIEW,
} from '../../constants/marshallMorphology.js'
import { useMarshallMorphologyLayers } from '../../hooks/useMarshallMorphologyLayers.js'
import { useNetworkFormLayers } from '../../hooks/useNetworkFormLayers.js'
import {
  buildTypeShareZones,
  countByJtype,
  listCuldesacs,
} from '../../utils/networkFormStats.js'
import LayerLoadError from '../LayerLoadError.jsx'
import NetworkFormDetailPanel from './NetworkFormDetailPanel.jsx'
import NetworkFormMap from './NetworkFormMap.jsx'
import NetworkFormOverviewPanel from './NetworkFormOverviewPanel.jsx'
import MarshallMorphologyDetailPanel from './marshall/MarshallMorphologyDetailPanel.jsx'
import MarshallMorphologyOverviewPanel from './marshall/MarshallMorphologyOverviewPanel.jsx'

function ModeButton({ active, label, onClick, grow = false }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm transition-colors ${grow ? 'min-w-0 flex-1' : ''}`}
      style={{
        borderColor: active ? '#00b4d8' : 'rgba(71,85,105,0.8)',
        backgroundColor: active ? 'rgba(0,180,216,0.12)' : 'transparent',
        color: active ? '#e0f2fe' : '#cbd5e1',
      }}
    >
      {label}
    </button>
  )
}

/** Focus Area — Network Form: Street Typology 31.5/41/27.5; Marshall 35/40/25. */
export default function NetworkFormView() {
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_NETWORK_FORM_VISIBLE)
  const [selectedJunctionId, setSelectedJunctionId] = useState(null)
  const [excludedCaseFocus, setExcludedCaseFocus] = useState(null)
  const [selectedScope, setSelectedScope] = useState(DEFAULT_NETWORK_FORM_SCOPE)
  const [networkFormMode, setNetworkFormMode] = useState(NETWORK_FORM_MODE_OVERVIEW)
  const marshallMode = networkFormMode === NETWORK_FORM_MODE_MARSHALL
  const marshallScope = NETWORK_FORM_GN_NAMES.includes(selectedScope) ? selectedScope : MARSHALL_GN_NAME

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
    culdesacHexWalk,
    culdesacWalkSummary,
    culdesacHexUmi,
    culdesacDensityUmiSummary,
    loading,
    error,
  } = useNetworkFormLayers(marshallMode ? marshallScope : selectedScope)

  const marshall = useMarshallMorphologyLayers(
    true,
    marshallMode ? marshallScope : selectedScope,
  )

  function handleToggleLayer(id, checked) {
    setVisibleLayers((prev) => ({ ...prev, [id]: checked }))
  }

  function handleSelectScope(scope) {
    setSelectedScope(scope)
    setSelectedJunctionId(null)
    setExcludedCaseFocus(null)
  }

  function handleMode(mode) {
    setNetworkFormMode(mode)
    setSelectedJunctionId(null)
    setExcludedCaseFocus(null)
    if (mode === NETWORK_FORM_MODE_MARSHALL) {
      setSelectedScope((prev) =>
        prev === NETWORK_FORM_SCOPE_ALL || !NETWORK_FORM_GN_NAMES.includes(prev) ? MARSHALL_GN_NAME : prev,
      )
      setVisibleLayers(DEFAULT_MARSHALL_VISIBLE)
    } else {
      setVisibleLayers(DEFAULT_NETWORK_FORM_VISIBLE)
    }
  }

  const marshallCounts = marshall.metrics
    ? {
        four_way: marshall.metrics.counts?.n_X ?? 0,
        three_way: marshall.metrics.counts?.n_T ?? 0,
        culdesac: marshall.metrics.counts?.n_cul_marshall ?? 0,
        marshall_cells: marshall.metrics.counts?.n_cell_marshall ?? 0,
      }
    : counts

  const overviewMarkerFeatures = marshall.junctionsMarshall?.features
  const overviewCounts = useMemo(() => {
    if (!overviewMarkerFeatures?.length) return counts
    return countByJtype(overviewMarkerFeatures)
  }, [overviewMarkerFeatures, counts])
  const overviewTypeZones = useMemo(
    () => buildTypeShareZones(overviewCounts),
    [overviewCounts],
  )
  const overviewCuldesacRows = useMemo(() => {
    if (!overviewMarkerFeatures?.length) return culdesacRows
    return listCuldesacs(overviewMarkerFeatures)
  }, [overviewMarkerFeatures, culdesacRows])
  const mapJunctions = marshall.junctionsMarshall ?? junctions
  const gridLayoutClass = marshallMode ? NETWORK_FORM_GRID_CLASS : STREET_TYPOLOGY_GRID_CLASS

  return (
    <div className={`grid min-h-0 flex-1 grid-cols-1 lg:overflow-hidden ${gridLayoutClass}`}>
      <div
        className={
          marshallMode
            ? 'order-2 flex min-h-0 flex-col overflow-y-auto p-4 lg:order-1 lg:h-full lg:overflow-y-auto'
            : 'order-2 overflow-y-auto p-4 lg:order-1'
        }
      >
        <div
          className={marshallMode ? 'mb-5 flex shrink-0 flex-row gap-2' : 'mb-4 flex flex-col gap-2'}
          role="tablist"
          aria-label="Street Typology and Marshall Morphology"
        >
          <ModeButton
            active={!marshallMode}
            label={STREET_TYPOLOGY_TAB_LABEL}
            grow={marshallMode}
            onClick={() => handleMode(NETWORK_FORM_MODE_OVERVIEW)}
          />
          <ModeButton
            active={marshallMode}
            label="Marshall Morphology"
            grow={marshallMode}
            onClick={() => handleMode(NETWORK_FORM_MODE_MARSHALL)}
          />
        </div>
        {marshallMode ? (
          <MarshallMorphologyOverviewPanel
            metrics={marshall.metrics}
            scopes={marshall.scopes}
            selectedScope={marshallScope}
            onSelectScope={handleSelectScope}
            loading={marshall.loading}
            error={marshall.error}
          />
        ) : (
          <NetworkFormOverviewPanel
            metrics={metrics}
            findings={findings}
            typeZones={overviewTypeZones}
            counts={overviewCounts}
            loading={loading || marshall.loading}
            selectedScope={selectedScope}
            onSelectScope={handleSelectScope}
          />
        )}
      </div>

      <div className="relative order-1 flex min-h-[360px] flex-col border-y border-surface-700 py-3 lg:order-2 lg:min-h-0 lg:border-x lg:border-y-0">
        <LayerLoadError error={marshallMode ? marshall.error : error ?? marshall.error} />
        <div className="min-h-0 flex-1">
          <NetworkFormMap
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            gnBoundary={gnBoundary}
            allGnBoundary={allGnBoundary}
            selectedScope={marshallMode ? marshallScope : selectedScope}
            streets={streets}
            junctions={mapJunctions}
            culdesacHex={marshallMode ? null : culdesacHex}
            culdesacHexWalk={marshallMode ? null : culdesacHexWalk}
            culdesacHexUmi={marshallMode ? null : culdesacHexUmi}
            counts={marshallMode ? marshallCounts : overviewCounts}
            loading={marshallMode ? marshall.loading : loading || marshall.loading}
            selectedJunctionId={selectedJunctionId}
            onSelectJunction={(id) => {
              setExcludedCaseFocus(null)
              setSelectedJunctionId(id)
            }}
            flyToLatLng={marshallMode ? excludedCaseFocus : null}
            marshallMode={marshallMode}
            marshallCells={marshall.cells}
          />
        </div>
      </div>

      <div
        className={
          marshallMode
            ? 'order-3 flex min-h-0 flex-col overflow-y-auto p-4 lg:h-full lg:overflow-y-auto'
            : 'order-3 overflow-y-auto p-4'
        }
      >
        {marshallMode ? (
          <MarshallMorphologyDetailPanel
            metrics={marshall.metrics}
            studyArea={marshall.studyArea}
            uncertainty={marshall.uncertainty}
            loading={marshall.loading}
            error={marshall.error}
            onFocusExcludedCase={(focus) => {
              setSelectedJunctionId(null)
              setExcludedCaseFocus(focus)
            }}
          />
        ) : (
          <NetworkFormDetailPanel
            findings={findings}
            metrics={metrics}
            culdesacRows={overviewCuldesacRows}
            culdesacDepthStats={culdesacDepthStats}
            culdesacSpatialSummary={culdesacSpatialSummary}
            culdesacWalkSummary={culdesacWalkSummary}
            culdesacDensityUmiSummary={culdesacDensityUmiSummary}
            loading={loading}
            selectedScope={selectedScope}
            onJunctionClick={setSelectedJunctionId}
          />
        )}
      </div>
    </div>
  )
}
