import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import MapFullscreenShell from '../MapFullscreenShell.jsx'
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
  colorForValue,
  formatMetricValue,
  getMetricValue,
  interpretCentrality,
  segmentLabel,
} from '../../utils/centralityStats.js'
import { buildCellInfoPopupHtml, CELL_POPUP_OPTS } from '../../utils/cellPopup.js'
import CentralityLegend from './CentralityLegend.jsx'
import CentralityMapLayerFab from './CentralityMapLayerFab.jsx'

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

function buildPopupHtml({
  scaleMeters,
  segmentId,
  closenessValue,
  betweennessValue,
  closenessStats,
  betweennessStats,
  showCloseness,
  showBetweenness,
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
}) {
  const [boundaries, setBoundaries] = useState({})
  const showCloseness = Boolean(visibleLayers?.closeness)
  const showBetweenness = Boolean(visibleLayers?.betweenness)
  const showRoadLabels = Boolean(visibleLayers?.roadLabels)

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
    (metric, geojson, stats) =>
    (feature, layer) => {
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        const id = feature.properties?.ID
        const value = getMetricValue(feature.properties, metric, scaleMeters)
        const other =
          metric === 'closeness'
            ? getMetricValue(findFeatureById(betweenness, id)?.properties, 'betweenness', scaleMeters)
            : getMetricValue(findFeatureById(closeness, id)?.properties, 'closeness', scaleMeters)

        const html = buildPopupHtml({
          scaleMeters,
          segmentId: id,
          closenessValue: metric === 'closeness' ? value : other,
          betweennessValue: metric === 'betweenness' ? value : other,
          closenessStats,
          betweennessStats,
          showCloseness,
          showBetweenness,
        })
        const popup = L.popup(CELL_POPUP_OPTS).setContent(html)
        layer.bindPopup(popup).openPopup()
      })
    }

  const closenessStyle = useMemo(
    () => (feature) => {
      const value = getMetricValue(feature.properties, 'closeness', scaleMeters)
      return {
        color: colorForValue(value, closenessStats.min, closenessStats.max, 'closeness'),
        weight: 3,
        opacity: 0.9,
      }
    },
    [scaleMeters, closenessStats],
  )

  const betweennessStyle = useMemo(
    () => (feature) => {
      const value = getMetricValue(feature.properties, 'betweenness', scaleMeters)
      return {
        color: colorForValue(value, betweennessStats.min, betweennessStats.max, 'betweenness'),
        weight: 3,
        opacity: 0.9,
      }
    },
    [scaleMeters, betweennessStats],
  )

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Modern pill segmented-control — replaces flat rectangular tabs */}
      <div className="flex shrink-0 items-center justify-center bg-surface-900 px-3 py-2">
        <div className="flex gap-2 rounded-xl bg-surface-950/60 p-1.5 ring-1 ring-surface-700/50 backdrop-blur-sm">
          {CENTRALITY_SCALES.map((scale) => {
            const isActive = scaleMeters === scale.meters
            return (
              <button
                key={scale.meters}
                type="button"
                onClick={() => onScaleChange(scale.meters)}
                className={[
                  'rounded-[10px] px-3 py-1.5 text-[11px] transition-all duration-200 ease-out select-none',
                  isActive
                    ? 'bg-surface-700 font-semibold text-primary-400 shadow-[0_0_0_1px_#00b4d8,0_4px_12px_rgba(0,180,216,0.22)] scale-[1.03]'
                    : 'font-medium text-surface-400 hover:bg-surface-700/50 hover:text-surface-100 hover:scale-[1.02]',
                ].join(' ')}
              >
                {scale.label}
              </button>
            )
          })}
        </div>
      </div>

      <MapFullscreenShell className="min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-surface-900/60 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        )}

        <MapContainer
          center={CENTRALITY_MAP_CENTER}
          zoom={CENTRALITY_MAP_ZOOM}
          className="h-full w-full"
          preferCanvas
          scrollWheelZoom
        >
          <MapInvalidateOnResize />
          {/* CartoDB Dark Matter with default labels always visible */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
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
              key={`closeness-${scaleMeters}`}
              data={closeness}
              style={closenessStyle}
              onEachFeature={makeOnEach('closeness', closeness, closenessStats)}
            />
          )}

          {showBetweenness && betweenness && (
            <GeoJSON
              key={`betweenness-${scaleMeters}`}
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

          {/* White text road name labels — toggled by the Road Labels checkbox.
              Rendered as permanent Leaflet tooltips with the centrality-road-label
              CSS class (transparent background, white text, text-shadow for contrast). */}
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
        </MapContainer>

        <CentralityMapLayerFab visibleLayers={visibleLayers} onToggle={onToggleLayer} />

        <CentralityLegend
          showCloseness={showCloseness}
          showBetweenness={showBetweenness}
          closenessStats={closenessStats}
          betweennessStats={betweennessStats}
        />
      </MapFullscreenShell>
    </div>
  )
}
