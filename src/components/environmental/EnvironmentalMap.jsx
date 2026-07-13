import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import FitBoundsToGeoJson from '../focusArea/FitBoundsToGeoJson.jsx'
import {
  ENV_BUFFER_COLOR,
  ENV_CELL_HIGHLIGHT,
  ENV_CONTEXT_STYLES,
  ENV_MAP_CENTER,
  ENV_MAP_ZOOM,
  ENV_METRIC_RAMPS,
  SHADOW_COLOR,
  SVF_CLASS_COLORS,
  UTCI_CLASS_LABELS,
  getActiveEnvMetric,
  hasEnvSelectableLayer,
} from '../../constants/environmental.js'
import { colorForEnvMetric, formatEnvValue, formatShadowPercent } from '../../utils/environmentalStats.js'
import {
  CELL_POPUP_OPTS,
  buildCellInfoPopupHtml,
  getFeatureCenter,
  getFeaturePopupAnchor,
} from '../../utils/cellPopup.js'
import EnvironmentalLegend from './EnvironmentalLegend.jsx'
import EnvironmentalMapLayerFab from './EnvironmentalMapLayerFab.jsx'

const bufferStyle = {
  color: ENV_BUFFER_COLOR,
  weight: 4,
  fill: false,
}

function buildCellPopup(props) {
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  const stressClass = props?.utci_class != null ? Number(props.utci_class) : null
  const stressMeta =
    stressClass != null
      ? UTCI_CLASS_LABELS[stressClass] ?? {
          label: `Class ${stressClass}`,
          color: '#94a3b8',
        }
      : null
  const utci = Number(props?.utci_c)
  // Rough comfort band 26–48 °C for mini-bar
  const utciBar = Number.isFinite(utci) ? Math.max(0, Math.min(1, (utci - 26) / 22)) : null
  const uhi = Number(props?.UHI_intens)
  const uhiBar = Number.isFinite(uhi) ? Math.max(0, Math.min(1, (uhi + 8) / 16)) : null

  const shadowFrac = Number(props?.shadow_frac)
  const shadowBar = Number.isFinite(shadowFrac) ? Math.max(0, Math.min(1, shadowFrac)) : null

  return buildCellInfoPopupHtml({
    title: `Cell #${id}`,
    primaryLabel: 'UTCI:',
    primaryValue: `${formatEnvValue(props?.utci_c, 1)} °C`,
    badge: stressMeta
      ? { label: stressMeta.label, color: stressMeta.color, textColor: '#ffffff' }
      : null,
    metrics: [
      {
        label: 'UHI Intensity',
        value: `${formatEnvValue(props?.UHI_intens)} °C`,
        bar: uhiBar,
      },
      {
        label: 'Air Temp',
        value: `${formatEnvValue(props?.Air_Temp, 1)} °C`,
        bar: null,
      },
      {
        label: 'Tmrt',
        value: `${formatEnvValue(props?.Tmrt, 1)} °C`,
        bar: null,
      },
      {
        label: 'Wind',
        value: formatEnvValue(props?.Wind_speed, 1),
        bar: null,
      },
      {
        label: 'UTCI Band',
        value: `${formatEnvValue(props?.utci_c, 1)} °C`,
        bar: utciBar,
      },
      {
        label: 'Stress Class',
        value: stressMeta?.label ?? '—',
        bar: null,
      },
      {
        label: 'Shadow Exposure',
        value: formatShadowPercent(props?.shadow_frac, 0),
        bar: shadowBar,
        barColor: SHADOW_COLOR,
      },
    ],
    footer: stressMeta
      ? { label: stressMeta.label, color: stressMeta.color, textColor: '#ffffff' }
      : null,
  })
}

function FlyToCell({ cellId, grid }) {
  const map = useMap()

  useEffect(() => {
    if (cellId == null || !grid?.features) return
    const feature = grid.features.find((f) => f.properties?.id == cellId)
    if (!feature) return

    const center = getFeatureCenter(feature)
    const anchor = getFeaturePopupAnchor(feature)
    if (!center || !anchor) return

    map.flyTo(center, 18, { animate: true, duration: 0.8 })
    const popup = L.popup(CELL_POPUP_OPTS)
      .setLatLng(anchor)
      .setContent(buildCellPopup(feature.properties))
    popup.openOn(map)

    return () => {
      map.closePopup(popup)
    }
  }, [cellId, grid, map])

  return null
}

/**
 * Fit map to SVF sample points when the user toggles the layer on.
 * Skips the initial mount when SVF starts enabled so FitBoundsToGeoJson
 * can show the full 800 m analysis circle instead of the corridor only.
 */
function FitBoundsToSvfPoints({ enabled, data, padding = [48, 48], maxZoom = 18 }) {
  const map = useMap()
  const wasEnabledRef = useRef(null)
  const fittedForOnCycleRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      wasEnabledRef.current = false
      fittedForOnCycleRef.current = false
      return
    }

    const isFirstRun = wasEnabledRef.current === null
    const justTurnedOn = wasEnabledRef.current === false
    wasEnabledRef.current = true

    // Default view keeps the 800 m boundary fit; only re-zoom on later off→on.
    if (isFirstRun) {
      fittedForOnCycleRef.current = true
      return
    }

    if (!data?.features?.length) return
    if (!justTurnedOn && fittedForOnCycleRef.current) return

    const layer = L.geoJSON(data)
    const bounds = layer.getBounds()
    if (!bounds.isValid()) return

    fittedForOnCycleRef.current = true
    map.fitBounds(bounds, { padding, maxZoom, animate: true })
  }, [enabled, data, map, padding, maxZoom])

  return null
}

const highlightGlowStyle = () => ({
  color: ENV_CELL_HIGHLIGHT.color,
  weight: 8,
  opacity: 0.5,
  fill: false,
  className: 'density-hex-highlight-pulse',
  interactive: false,
})

const highlightFillStyle = () => ({
  color: ENV_CELL_HIGHLIGHT.color,
  weight: ENV_CELL_HIGHLIGHT.weight,
  fillColor: ENV_CELL_HIGHLIGHT.fillColor,
  fillOpacity: ENV_CELL_HIGHLIGHT.fillOpacity,
  interactive: false,
})

function svfFillColor(props) {
  const cls = props?.SVF_Class
  return SVF_CLASS_COLORS[cls] ?? '#0284c7'
}

/** Interactive Environmental Analysis map — 10 m thermal choropleth + SVF points. */
export default function EnvironmentalMap({
  visibleLayers,
  onToggleLayer,
  grid,
  svfPoints,
  boundary,
  stats,
  loading,
  focusedCellId = null,
}) {
  const [selectedCellId, setSelectedCellId] = useState(null)
  const activeMetric = getActiveEnvMetric(visibleLayers)
  const selectableOn = hasEnvSelectableLayer(visibleLayers)
  const metricKey = activeMetric ? ENV_METRIC_RAMPS[activeMetric]?.property : null
  const metricSummary =
    activeMetric === 'utci'
      ? stats?.utci
      : activeMetric === 'uhi'
        ? stats?.uhi
        : activeMetric === 'airTemp'
          ? stats?.airTemp
          : activeMetric === 'tmrt'
            ? stats?.tmrt
            : activeMetric === 'shadow'
              ? stats?.shadow
              : null

  useEffect(() => {
    if (focusedCellId != null) setSelectedCellId(focusedCellId)
  }, [focusedCellId])

  useEffect(() => {
    if (!selectableOn) setSelectedCellId(null)
  }, [selectableOn])

  const selectedFeature = useMemo(() => {
    if (!selectableOn || selectedCellId == null) return null
    return grid?.features?.find((f) => f.properties?.id == selectedCellId) ?? null
  }, [selectableOn, selectedCellId, grid])

  const cellStyle = useMemo(
    () => (feature) => {
      if (!activeMetric || !metricKey) {
        return {
          color: '#334155',
          weight: 0,
          fillColor: '#64748b',
          fillOpacity: 0,
          opacity: 0,
          interactive: false,
        }
      }
      const value = Number(feature.properties?.[metricKey])
      const fill = colorForEnvMetric(
        value,
        metricSummary?.min,
        metricSummary?.max,
        activeMetric,
      )
      return {
        color: '#334155',
        weight: 0.2,
        fillColor: fill,
        fillOpacity: 0.78,
        opacity: 1,
        interactive: true,
      }
    },
    [activeMetric, metricKey, metricSummary],
  )

  const onEachCell = useMemo(
    () => (feature, layer) => {
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        const id = feature.properties?.id ?? null
        setSelectedCellId(id)
        const anchor = getFeaturePopupAnchor(feature)
        const popup = L.popup(CELL_POPUP_OPTS).setContent(buildCellPopup(feature.properties))
        if (anchor && layer._map) {
          popup.setLatLng(anchor).openOn(layer._map)
        } else {
          layer.bindPopup(popup).openPopup()
        }
      })
    },
    [],
  )

  const highlightRenderer = useMemo(() => L.svg(), [])

  return (
    <div className="relative h-full min-h-0">
      {loading && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-surface-900/60 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f46d43] border-t-transparent" />
        </div>
      )}

      <MapContainer
        center={ENV_MAP_CENTER}
        zoom={ENV_MAP_ZOOM}
        className="h-full w-full"
        preferCanvas
        scrollWheelZoom
      >
        <MapInvalidateOnResize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBoundsToGeoJson data={boundary} padding={[56, 56]} maxZoom={16} />
        <FitBoundsToSvfPoints
          enabled={Boolean(visibleLayers.svfPoints)}
          data={svfPoints}
        />

        {grid && (
          <GeoJSON
            key="env-thermal-grid"
            data={grid}
            style={cellStyle}
            onEachFeature={onEachCell}
          />
        )}

        {visibleLayers.analysisArea && boundary && (
          <GeoJSON key="env-boundary" data={boundary} style={bufferStyle} interactive={false} />
        )}

        {visibleLayers.svfPoints &&
          svfPoints?.features?.map((f, i) => {
            const coords = f.geometry?.coordinates
            if (!coords) return null
            const [lng, lat] = coords
            const fill = svfFillColor(f.properties)
            return (
              <Fragment key={`svf-${f.properties?.id ?? i}`}>
                <CircleMarker
                  center={[lat, lng]}
                  pathOptions={{
                    ...ENV_CONTEXT_STYLES.svf,
                    fillColor: fill,
                  }}
                  radius={ENV_CONTEXT_STYLES.svf.radius}
                >
                  <Tooltip direction="top" opacity={0.95}>
                    <span>
                      SVF {formatEnvValue(f.properties?.SVF_value1, 3)}
                      {f.properties?.SVF_Class ? ` · ${f.properties.SVF_Class}` : ''}
                    </span>
                  </Tooltip>
                </CircleMarker>
              </Fragment>
            )
          })}

        {selectedFeature && (
          <>
            <GeoJSON
              key={`env-hl-glow-${selectedCellId}`}
              data={selectedFeature}
              style={highlightGlowStyle}
              renderer={highlightRenderer}
            />
            <GeoJSON
              key={`env-hl-fill-${selectedCellId}`}
              data={selectedFeature}
              style={highlightFillStyle}
              renderer={highlightRenderer}
            />
          </>
        )}

        <FlyToCell cellId={focusedCellId} grid={grid} />
      </MapContainer>

      <EnvironmentalMapLayerFab visibleLayers={visibleLayers} onToggle={onToggleLayer} />
      <EnvironmentalLegend activeMetric={activeMetric} stats={stats} />
    </div>
  )
}
