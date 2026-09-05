import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ChevronDown } from 'lucide-react'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import MapFullscreenShell, { useMapFullscreen } from '../MapFullscreenShell.jsx'
import {
  CENTRALITY_BOUNDARIES,
  CENTRALITY_MAP_CENTER,
  CENTRALITY_MAP_ZOOM,
  CENTRALITY_SCALES,
  boundaryGeoUrl,
  boundaryLayerId,
  scaleLabel,
} from '../../constants/centrality.js'
import {
  DEFAULT_NETWORK_FORM_BASEMAP,
  getNetworkFormBasemap,
} from '../../constants/basemaps.js'
import { WHAT_IF_DRAW_TOOLS, WHAT_IF_MODES, WHAT_IF_VIEWS, whatIfNewSegmentGlowColor, whatIfPendingColor } from '../../constants/centralityWhatIf.js'
import { COMPARE_SLOT_STATUS } from '../../constants/whatIfCompare.js'
import {
  colorForSignedDelta,
  colorForValue,
  formatMetricValue,
  getMetricValue,
  interpretCentrality,
  segmentLabel,
} from '../../utils/centralityStats.js'
import { layerSignedDeltas } from '../../utils/nearbyWhatIfDeltas.js'
import { buildCellInfoPopupHtml, CELL_POPUP_OPTS } from '../../utils/cellPopup.js'
import CentralityLegend from './CentralityLegend.jsx'
import CentralityMapLayerFab from './CentralityMapLayerFab.jsx'
import { BASELINE_VS_WHAT_IF_INFO } from '../../constants/whatIfHelpContent.js'
import MetricInfoButton from './MetricInfoButton.jsx'
import WhatIfDrawToolbar from './whatIf/WhatIfDrawToolbar.jsx'
import WhatIfNewSegmentsLayer from './whatIf/WhatIfNewSegmentsLayer.jsx'
import WhatIfSnapDrawLayer from './whatIf/WhatIfSnapDrawLayer.jsx'
import WhatIfCompareOptionsLayer from './whatIf/compare/WhatIfCompareOptionsLayer.jsx'

const boundaryStyle = (color) => ({ color, weight: 2, fill: false, dashArray: '6 4', opacity: 0.9 })

// Two-layer highlight: wide teal glow (CSS-animated) + crisp white line on top.
// Both layers need an explicit SVG renderer because the map uses preferCanvas,
// and Canvas paths cannot be targeted by CSS keyframe animations.
const highlightGlowStyle = () => ({
  color: '#00b4d8',
  weight: 20,
  opacity: 0.4,
  className: 'centrality-highlight-glow',
})
const highlightLineStyle = () => ({ color: '#ffffff', weight: 4, opacity: 1 })

const TIER_STYLE = {
  High: { color: '#ef4444', textColor: '#ffffff' },
  Moderate: { color: '#f59e0b', textColor: '#0f172a' },
  Low: { color: '#64748b', textColor: '#ffffff' },
  Unknown: { color: '#475569', textColor: '#ffffff' },
}

function normInRange(value, min, max) {
  if (value == null || min == null || max == null) return null
  const span = max - min
  if (span === 0) return 0.5
  return Math.max(0, Math.min(1, (value - min) / span))
}

function findFeatureById(geojson, id) {
  if (!geojson?.features || id == null) return null
  // Use loose equality so string IDs from click events match numeric IDs in data
  return geojson.features.find((f) => f.properties?.ID == id) ?? null
}

function formatSignedDelta(delta) {
  if (delta == null || Number.isNaN(delta)) return '—'
  return `${delta >= 0 ? '+' : ''}${formatMetricValue(delta)}`
}

function buildPopupHtml({
  scaleMeters,
  segmentId,
  closenessValue,
  betweennessValue,
  closenessStats,
  betweennessStats,
  showCloseness,
  showBetweenness,
  closenessDelta,
  betweennessDelta,
  showDeltas = false,
}) {
  const metrics = []
  let primaryInterp = null

  if (showCloseness && closenessValue != null) {
    const interp = interpretCentrality(closenessValue, closenessStats.min, closenessStats.max)
    if (!primaryInterp) primaryInterp = interp
    metrics.push({
      label: 'Closeness',
      value: formatMetricValue(closenessValue),
      bar: normInRange(closenessValue, closenessStats.min, closenessStats.max),
      barColor: colorForValue(
        closenessValue,
        closenessStats.min,
        closenessStats.max,
        'closeness',
      ),
    })
    if (showDeltas) {
      metrics.push({
        label: 'Δ vs baseline',
        value: formatSignedDelta(closenessDelta),
      })
    }
  }
  if (showBetweenness && betweennessValue != null) {
    const interp = interpretCentrality(
      betweennessValue,
      betweennessStats.min,
      betweennessStats.max,
    )
    if (!primaryInterp) primaryInterp = interp
    metrics.push({
      label: 'Betweenness',
      value: formatMetricValue(betweennessValue),
      bar: normInRange(betweennessValue, betweennessStats.min, betweennessStats.max),
      barColor: colorForValue(
        betweennessValue,
        betweennessStats.min,
        betweennessStats.max,
        'betweenness',
      ),
    })
    if (showDeltas) {
      metrics.push({
        label: 'Δ vs baseline',
        value: formatSignedDelta(betweennessDelta),
      })
    }
  }

  const tier = primaryInterp?.tier ?? 'Unknown'
  const style = TIER_STYLE[tier] ?? TIER_STYLE.Unknown

  return buildCellInfoPopupHtml({
    title: scaleLabel(scaleMeters),
    primaryLabel: 'Segment:',
    primaryValue: segmentLabel({ ID: segmentId }),
    badge: { label: tier, color: style.color, textColor: style.textColor },
    metrics,
    footer:
      primaryInterp != null
        ? {
            label: primaryInterp.text,
            color: style.color,
            textColor: style.textColor,
          }
        : null,
  })
}

/**
 * Flies the map to the midpoint of the selected segment.
 * Handles both LineString and MultiLineString geometries correctly.
 * Must be rendered inside <MapContainer>.
 */
function FlyToSegment({ segmentId, closeness, betweenness }) {
  const map = useMap()

  useEffect(() => {
    if (segmentId == null) return

    const feature =
      findFeatureById(closeness, segmentId) ?? findFeatureById(betweenness, segmentId)
    if (!feature?.geometry) return

    const { type, coordinates } = feature.geometry

    // Normalise to a flat array of [lng, lat] pairs regardless of geometry type
    let flatCoords
    if (type === 'LineString') {
      flatCoords = coordinates
    } else if (type === 'MultiLineString') {
      flatCoords = coordinates.flat(1)
    } else {
      return
    }

    if (!flatCoords.length) return

    const mid = flatCoords[Math.floor(flatCoords.length / 2)]
    // Guard: mid must be a [lng, lat] leaf pair, not a nested array
    if (!Array.isArray(mid) || mid.length < 2 || mid[0] == null || mid[1] == null) return

    map.flyTo([mid[1], mid[0]], 17, { animate: true, duration: 0.8 })
  }, [segmentId, closeness, betweenness, map])

  return null
}

export function CentralityScaleChips({ scaleMeters, onScaleChange }) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-1.5 rounded-xl bg-surface-950/80 p-1 ring-1 ring-surface-700/50 backdrop-blur-sm">
      {CENTRALITY_SCALES.map((scale) => {
        const isActive = scaleMeters === scale.meters
        return (
          <button
            key={scale.meters}
            type="button"
            title={scale.label}
            aria-label={scale.label}
            aria-pressed={isActive}
            onClick={() => onScaleChange(scale.meters)}
            className={[
              'shrink-0 whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[11px] transition-colors duration-200 ease-out select-none',
              isActive
                ? 'bg-surface-700 font-semibold text-primary-400 shadow-[0_0_0_1px_#00b4d8,0_4px_12px_rgba(0,180,216,0.22)]'
                : 'font-medium text-surface-400 hover:bg-surface-700/50 hover:text-surface-100',
            ].join(' ')}
          >
            {scale.chipLabel}
          </button>
        )
      })}
    </div>
  )
}

function CentralityModeScaleControls({
  mode,
  onModeChange,
  scaleMeters,
  onScaleChange,
  whatIfView = WHAT_IF_VIEWS.draw,
  onWhatIfViewChange,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const compareActive = mode === WHAT_IF_MODES.whatIf && whatIfView === WHAT_IF_VIEWS.compare

  useEffect(() => {
    if (!menuOpen) return undefined
    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

  function handleWhatIfClick() {
    if (compareActive) {
      onWhatIfViewChange?.(WHAT_IF_VIEWS.draw)
      return
    }
    onModeChange?.(WHAT_IF_MODES.whatIf)
  }

  function handleCompare() {
    setMenuOpen(false)
    onModeChange?.(WHAT_IF_MODES.whatIf)
    onWhatIfViewChange?.(WHAT_IF_VIEWS.compare)
  }

  const whatIfActive = mode === WHAT_IF_MODES.whatIf

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-5 gap-y-2">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex items-stretch gap-1.5 rounded-lg bg-surface-950/80 p-1 ring-1 ring-surface-700/50 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => onModeChange?.(WHAT_IF_MODES.baseline)}
            className={[
              'whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition',
              mode === WHAT_IF_MODES.baseline
                ? 'bg-surface-700 text-primary-300 shadow-[0_0_0_1px_#00b4d8]'
                : 'text-surface-400 hover:text-surface-100',
            ].join(' ')}
          >
            Baseline
          </button>
          <div ref={menuRef} className="relative overflow-visible">
            <div
              className={[
                'flex items-stretch overflow-hidden rounded-md',
                whatIfActive
                  ? 'bg-surface-700 text-primary-300 shadow-[0_0_0_1px_#00b4d8]'
                  : 'bg-surface-800/80 text-surface-400',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={handleWhatIfClick}
                className="whitespace-nowrap rounded-l-md px-2.5 py-1.5 text-[11px] font-semibold transition hover:text-surface-100"
              >
                What-if
              </button>
              <button
                type="button"
                aria-label="What-if tools"
                title="What-if tools"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className={[
                  'flex w-8 self-stretch items-center justify-center border-l transition',
                  whatIfActive ? 'border-primary-500/40 hover:text-surface-100' : 'border-surface-600 hover:text-white',
                  compareActive ? 'bg-primary-500/20 text-primary-200' : '',
                ].join(' ')}
              >
                <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-[2200] mt-1 min-w-[10rem] rounded-md border border-surface-600 bg-surface-900 py-1 shadow-card"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleCompare}
                  className={[
                    'block w-full px-3 py-1.5 text-left text-[11px] hover:bg-surface-800',
                    compareActive ? 'font-semibold text-primary-300' : 'text-surface-100',
                  ].join(' ')}
                >
                  Compare
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <MetricInfoButton
          title="Baseline Vs What-If"
          ariaLabel="What is What-if mode?"
          points={BASELINE_VS_WHAT_IF_INFO}
        />
      </div>
      <CentralityScaleChips scaleMeters={scaleMeters} onScaleChange={onScaleChange} />
    </div>
  )
}

/** Same mode + scale chips, shown only in enlarged map so they stay reachable. */
function CentralityExpandedHud({ mode, onModeChange, scaleMeters, onScaleChange, whatIfView, onWhatIfViewChange }) {
  const expanded = useMapFullscreen()
  const rootRef = useRef(null)
  const compareActive = mode === WHAT_IF_MODES.whatIf && whatIfView === WHAT_IF_VIEWS.compare

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    L.DomEvent.disableClickPropagation(el)
    L.DomEvent.disableScrollPropagation(el)
    return undefined
  }, [expanded])

  if (!expanded) return null

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto absolute left-1/2 top-4 z-[2100] max-w-[calc(100%-9rem)] -translate-x-1/2"
    >
      {compareActive ? (
        <CentralityScaleChips scaleMeters={scaleMeters} onScaleChange={onScaleChange} />
      ) : (
        <CentralityModeScaleControls
          mode={mode}
          onModeChange={onModeChange}
          scaleMeters={scaleMeters}
          onScaleChange={onScaleChange}
          whatIfView={whatIfView}
          onWhatIfViewChange={onWhatIfViewChange}
        />
      )}
    </div>
  )
}

/** Interactive centrality map — road network lines coloured by metric value. */
export default function CentralityMap({
  scaleMeters,
  onScaleChange,
  visibleLayers,
  onToggleLayer,
  closeness,
  betweenness,
  closenessStats,
  betweennessStats,
  loading,
  namedRoads,
  selectedSegmentId,
  onSegmentClick,
  mode = WHAT_IF_MODES.baseline,
  onModeChange,
  whatIfView = WHAT_IF_VIEWS.draw,
  onWhatIfViewChange,
  whatIf,
}) {
  const isWhatIf = mode === WHAT_IF_MODES.whatIf
  const isCompare = isWhatIf && whatIfView === WHAT_IF_VIEWS.compare
  const hideDrawChrome = isCompare
  const [boundaries, setBoundaries] = useState({})
  const [basemapId, setBasemapId] = useState(DEFAULT_NETWORK_FORM_BASEMAP)
  const basemap = useMemo(() => getNetworkFormBasemap(basemapId), [basemapId])
  const whatIfPendingLineColor = useMemo(() => whatIfPendingColor(basemapId), [basemapId])
  const whatIfGlowColor = useMemo(() => whatIfNewSegmentGlowColor(basemapId), [basemapId])
  const showCloseness = Boolean(visibleLayers?.closeness)
  const showBetweenness = Boolean(visibleLayers?.betweenness)
  const showRoadLabels = Boolean(visibleLayers?.roadLabels)
  const compareDeltaReady =
    isCompare &&
    whatIf?.compareSlots &&
    whatIf.activeSlotId &&
    whatIf.compareSlots[whatIf.activeSlotId]?.status === COMPARE_SLOT_STATUS.ready

  const closenessDeltas = useMemo(
    () =>
      compareDeltaReady
        ? layerSignedDeltas({
            scenario: closeness,
            baseline: whatIf?.baselineCloseness,
            metric: 'closeness',
            scaleMeters,
          })
        : null,
    [compareDeltaReady, closeness, whatIf?.baselineCloseness, scaleMeters],
  )

  const betweennessDeltas = useMemo(
    () =>
      compareDeltaReady
        ? layerSignedDeltas({
            scenario: betweenness,
            baseline: whatIf?.baselineBetweenness,
            metric: 'betweenness',
            scaleMeters,
          })
        : null,
    [compareDeltaReady, betweenness, whatIf?.baselineBetweenness, scaleMeters],
  )

  // What-if defaults to Streets for drawing readability; Baseline keeps Dark.
  useEffect(() => {
    setBasemapId(isWhatIf ? 'streets' : DEFAULT_NETWORK_FORM_BASEMAP)
  }, [isWhatIf])

  // Dedicated SVG renderer for the animated highlight layers.
  // preferCanvas is set on the MapContainer for performance on the large
  // GeoJSON layers, but Canvas paths cannot be CSS-animated — the highlight
  // needs its own SVG renderer so the pulse keyframes work.
  const highlightRenderer = useMemo(() => L.svg(), [])

  useEffect(() => {
    let cancelled = false

    Promise.all(
      CENTRALITY_BOUNDARIES.map(async ({ meters }) => {
        try {
          const res = await fetch(boundaryGeoUrl(meters))
          if (!res.ok) return [meters, null]
          const data = await res.json()
          return [meters, data]
        } catch {
          return [meters, null]
        }
      }),
    ).then((results) => {
      if (cancelled) return
      setBoundaries(Object.fromEntries(results.filter(([, data]) => data)))
    })

    return () => {
      cancelled = true
    }
  }, [])

  // Derive the highlighted feature from the active GeoJSON data
  const selectedFeature = useMemo(() => {
    if (selectedSegmentId == null) return null
    return findFeatureById(closeness, selectedSegmentId) ?? findFeatureById(betweenness, selectedSegmentId)
  }, [selectedSegmentId, closeness, betweenness])

  const makeOnEach =
    (metric, _geojson, _stats) =>
    (feature, layer) => {
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        const id = feature.properties?.ID
        if (onSegmentClick && id != null) onSegmentClick(id)
        const value = getMetricValue(feature.properties, metric, scaleMeters)
        const other =
          metric === 'closeness'
            ? getMetricValue(findFeatureById(betweenness, id)?.properties, 'betweenness', scaleMeters)
            : getMetricValue(findFeatureById(closeness, id)?.properties, 'closeness', scaleMeters)

        const nid = Number(id)
        const html = buildPopupHtml({
          scaleMeters,
          segmentId: id,
          closenessValue: metric === 'closeness' ? value : other,
          betweennessValue: metric === 'betweenness' ? value : other,
          closenessStats,
          betweennessStats,
          showCloseness,
          showBetweenness,
          showDeltas: Boolean(compareDeltaReady),
          closenessDelta: closenessDeltas?.byId.get(nid) ?? null,
          betweennessDelta: betweennessDeltas?.byId.get(nid) ?? null,
        })
        const popup = L.popup(CELL_POPUP_OPTS).setContent(html)
        layer.bindPopup(popup).openPopup()
      })
    }

  const closenessStyle = useMemo(
    () => (feature) => {
      if (compareDeltaReady && closenessDeltas) {
        const id = Number(feature.properties?.ID)
        const delta = Number.isFinite(id) ? closenessDeltas.byId.get(id) : null
        return {
          color: colorForSignedDelta(delta ?? 0, closenessDeltas.maxAbs),
          weight: 3,
          opacity: 0.9,
        }
      }
      const value = getMetricValue(feature.properties, 'closeness', scaleMeters)
      return {
        color: colorForValue(value, closenessStats.min, closenessStats.max, 'closeness'),
        weight: 3,
        opacity: 0.9,
      }
    },
    [scaleMeters, closenessStats, compareDeltaReady, closenessDeltas],
  )

  const betweennessStyle = useMemo(
    () => (feature) => {
      if (compareDeltaReady && betweennessDeltas) {
        const id = Number(feature.properties?.ID)
        const delta = Number.isFinite(id) ? betweennessDeltas.byId.get(id) : null
        return {
          color: colorForSignedDelta(delta ?? 0, betweennessDeltas.maxAbs),
          weight: 3,
          opacity: 0.9,
        }
      }
      const value = getMetricValue(feature.properties, 'betweenness', scaleMeters)
      return {
        color: colorForValue(value, betweennessStats.min, betweennessStats.max, 'betweenness'),
        weight: 3,
        opacity: 0.9,
      }
    },
    [scaleMeters, betweennessStats, compareDeltaReady, betweennessDeltas],
  )

  return (
    <div className="relative z-[1100] flex h-full min-h-0 flex-col">
      {!hideDrawChrome ? (
        <div className="relative z-[1200] flex shrink-0 items-center overflow-visible bg-surface-900 px-2 py-2">
          <CentralityModeScaleControls
            mode={mode}
            onModeChange={onModeChange}
            scaleMeters={scaleMeters}
            onScaleChange={onScaleChange}
            whatIfView={whatIfView}
            onWhatIfViewChange={onWhatIfViewChange}
          />
        </div>
      ) : null}

      <MapFullscreenShell className="min-h-0 flex-1">
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center bg-surface-900/60 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        )}

        <CentralityExpandedHud
          mode={mode}
          onModeChange={onModeChange}
          scaleMeters={scaleMeters}
          onScaleChange={onScaleChange}
          whatIfView={whatIfView}
          onWhatIfViewChange={onWhatIfViewChange}
        />

        <MapContainer
          center={CENTRALITY_MAP_CENTER}
          zoom={CENTRALITY_MAP_ZOOM}
          className="h-full w-full"
          preferCanvas
          scrollWheelZoom
        >
          <MapInvalidateOnResize />
          <TileLayer
            key={basemap.id}
            attribution={basemap.attribution}
            url={basemap.url}
            {...(basemap.subdomains ? { subdomains: basemap.subdomains } : {})}
            {...(basemap.maxZoom != null ? { maxZoom: basemap.maxZoom } : {})}
          />

          {CENTRALITY_BOUNDARIES.map(({ meters, color }) =>
            visibleLayers?.[boundaryLayerId(meters)] && boundaries[meters] ? (
              <GeoJSON
                key={`boundary-${meters}`}
                data={boundaries[meters]}
                style={boundaryStyle(color)}
              />
            ) : null,
          )}

          {showCloseness && closeness && (
            <GeoJSON
              key={`closeness-${scaleMeters}-${closeness.features?.length ?? 0}-${closenessStats?.min ?? 'x'}-${closenessStats?.max ?? 'x'}-${compareDeltaReady ? `d${whatIf?.activeSlotId}-${closenessDeltas?.maxAbs ?? 0}` : 'abs'}`}
              data={closeness}
              style={closenessStyle}
              onEachFeature={makeOnEach('closeness', closeness, closenessStats)}
            />
          )}

          {showBetweenness && betweenness && (
            <GeoJSON
              key={`betweenness-${scaleMeters}-${betweenness.features?.length ?? 0}-${betweennessStats?.min ?? 'x'}-${betweennessStats?.max ?? 'x'}-${compareDeltaReady ? `d${whatIf?.activeSlotId}-${betweennessDeltas?.maxAbs ?? 0}` : 'abs'}`}
              data={betweenness}
              style={betweennessStyle}
              onEachFeature={makeOnEach('betweenness', betweenness, betweennessStats)}
            />
          )}

          {/* Pulsing highlight for the selected Top-5 segment.
              Wide teal glow underneath (CSS-animated) + crisp white line on top.
              Both rendered on a dedicated SVG renderer so the CSS keyframe works. */}
          {selectedFeature && (
            <>
              <GeoJSON
                key={`highlight-glow-${selectedSegmentId}`}
                data={{ type: 'FeatureCollection', features: [selectedFeature] }}
                style={highlightGlowStyle}
                renderer={highlightRenderer}
              />
              <GeoJSON
                key={`highlight-line-${selectedSegmentId}`}
                data={{ type: 'FeatureCollection', features: [selectedFeature] }}
                style={highlightLineStyle}
                renderer={highlightRenderer}
              />
            </>
          )}

          {/* Road name labels — toggled by the Road Labels checkbox.
              Permanent Leaflet tooltips; centrality-road-label = minimal white chip. */}
          {showRoadLabels && namedRoads && (
            <GeoJSON
              key="road-labels"
              data={{ type: 'FeatureCollection', features: namedRoads }}
              style={{ weight: 0, opacity: 0, fill: false }}
              onEachFeature={(feature, layer) => {
                if (feature.properties?.name) {
                  layer.bindTooltip(feature.properties.name, {
                    permanent: true,
                    direction: 'center',
                    className: 'centrality-road-label',
                  })
                }
              }}
            />
          )}

          {/* Fly to segment when a Top-5 bar is clicked */}
          <FlyToSegment
            segmentId={selectedSegmentId}
            closeness={closeness}
            betweenness={betweenness}
          />

          {isWhatIf &&
          whatIf?.showProposed &&
          whatIf?.newSegmentIds?.size &&
          (showCloseness || showBetweenness) ? (
            <WhatIfNewSegmentsLayer
              geojson={showCloseness ? closeness : betweenness}
              newSegmentIds={whatIf.newSegmentIds}
              metric={showCloseness ? 'closeness' : 'betweenness'}
              scaleMeters={scaleMeters}
              stats={showCloseness ? closenessStats : betweennessStats}
              renderer={highlightRenderer}
              glowColor={whatIfGlowColor}
            />
          ) : null}

          {isWhatIf && whatIf?.drawing ? (
            <WhatIfSnapDrawLayer
              tool={whatIf.drawing.tool}
              snapNodes={whatIf.snapNodes}
              showSnapNodes={whatIf.showSnapNodes}
              proposedGeoJson={whatIf.drawing.proposedGeoJson}
              showProposed={whatIf.showProposed}
              draftCoords={whatIf.drawing.draftCoords}
              cursorLatLng={whatIf.drawing.cursorLatLng}
              addVertex={whatIf.drawing.addVertex}
              finishLink={whatIf.onFinishLink || whatIf.drawing.finishLink}
              cancelDraft={whatIf.drawing.cancelDraft}
              setCursorLatLng={whatIf.drawing.setCursorLatLng}
              snapLatLng={whatIf.drawing.snapLatLng}
              onUndo={whatIf.onUndo}
              onRedo={whatIf.onRedo}
              links={whatIf.drawing.links}
              onEraseLink={whatIf.onEraseLink}
              hideFinishedProposed={Boolean(whatIf.hideFinishedProposed)}
              forceShowFinishedForErase={whatIf.drawing.tool === WHAT_IF_DRAW_TOOLS.erase}
              pendingLineColor={whatIfPendingLineColor}
              canUndo={whatIf.drawing.canUndo}
              canRedo={whatIf.drawing.canRedo}
              onToolChange={whatIf.drawing.selectTool ?? whatIf.drawing.setTool}
            />
          ) : null}

          {isWhatIf && whatIf?.compareSlots ? (
            <WhatIfCompareOptionsLayer
              slots={whatIf.compareSlots}
              activeId={whatIf.activeSlotId}
              openedCount={whatIf.openedCount ?? 3}
            />
          ) : null}

        </MapContainer>

        <CentralityMapLayerFab
          visibleLayers={visibleLayers}
          onToggle={onToggleLayer}
          basemapId={basemapId}
          onBasemapChange={setBasemapId}
          whatIfMode={isWhatIf}
        />

        {isWhatIf && whatIf?.drawing ? (
          <WhatIfDrawToolbar
            tool={whatIf.drawing.tool}
            onToolChange={whatIf.drawing.selectTool ?? whatIf.drawing.setTool}
            snapEnabled={whatIf.drawing.snapEnabled}
            onSnapToggle={whatIf.drawing.setSnapEnabled}
            onUndo={whatIf.onUndo || whatIf.drawing.undo}
            onRedo={whatIf.onRedo || whatIf.drawing.redo}
            onFinishLink={whatIf.onFinishLink || whatIf.drawing.finishLink}
            onRun={whatIf.onRun}
            onReset={whatIf.onReset}
            canFinish={whatIf.drawing.draftCoords.length >= 2}
            canUndo={whatIf.drawing.canUndo}
            canRedo={whatIf.drawing.canRedo}
            runLabel={whatIf.runLabel}
            statusText={whatIf.statusText}
            guidance={whatIf.guidance}
          />
        ) : null}

        <CentralityLegend
          whatIfMode={isWhatIf}
          showCloseness={showCloseness}
          showBetweenness={showBetweenness}
          closenessStats={closenessStats}
          betweennessStats={betweennessStats}
          showDeltaKey={compareDeltaReady}
        />
      </MapFullscreenShell>
    </div>
  )
}
