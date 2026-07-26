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
  SVF_CLASS_COLORS,
  UTCI_CLASS_LABELS,
  getActiveEnvMetric,
  hasEnvSelectableLayer,
} from '../../constants/environmental.js'
import { DEFAULT_APP_BASEMAP, getAppBasemap } from '../../constants/basemaps.js'
import { colorForEnvMetric, formatEnvValue, formatShadowPercent } from '../../utils/environmentalStats.js'
import {
  CELL_POPUP_OPTS,
  buildCellInfoPopupHtml,
  contrastTextForBg,
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

function bandFromRange(value, summary, kind) {
  const min = summary?.min
  const max = summary?.max
  const labels = ENV_BAND_LABELS[kind]
  if (
    !labels ||
    !Number.isFinite(value) ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max === min
  ) {
    return { shortLabel: labels?.medium?.shortLabel ?? '—', label: labels?.medium?.label ?? '—' }
  }
  const t = (value - min) / (max - min)
  const level = t > 2 / 3 ? 'high' : t >= 1 / 3 ? 'medium' : 'low'
  return labels[level]
}

const ENV_BAND_LABELS = {
  uhi: {
    high: { shortLabel: 'High UHI', label: 'High Heat Island Intensity' },
    medium: { shortLabel: 'Moderate UHI', label: 'Moderate Heat Island Intensity' },
    low: { shortLabel: 'Low UHI', label: 'Low Heat Island Intensity' },
  },
  airTemp: {
    high: { shortLabel: 'Hotter', label: 'Higher Air Temperature' },
    medium: { shortLabel: 'Moderate', label: 'Moderate Air Temperature' },
    low: { shortLabel: 'Cooler', label: 'Lower Air Temperature' },
  },
  tmrt: {
    high: { shortLabel: 'High Tmrt', label: 'Higher Mean Radiant Temp' },
    medium: { shortLabel: 'Moderate Tmrt', label: 'Moderate Mean Radiant Temp' },
    low: { shortLabel: 'Low Tmrt', label: 'Lower Mean Radiant Temp' },
  },
  shadow: {
    high: { shortLabel: 'More Shade', label: 'Higher Shadow Exposure' },
    medium: { shortLabel: 'Mixed Shade', label: 'Moderate Shadow Exposure' },
    low: { shortLabel: 'Less Shade', label: 'Lower Shadow Exposure' },
  },
}

function buildCellPopup(props, activeMetric = 'utci', metricSummary = null) {
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  const stressClass = props?.utci_class != null ? Number(props.utci_class) : null
  const stressMeta =
    stressClass != null
      ? UTCI_CLASS_LABELS[stressClass] ?? {
          label: `Class ${stressClass}`,
          shortLabel: `Class ${stressClass}`,
        }
      : null
  const utci = Number(props?.utci_c)
  const utciBar = Number.isFinite(utci) ? Math.max(0, Math.min(1, (utci - 26) / 22)) : null
  const uhi = Number(props?.UHI_intens)
  const uhiBar = Number.isFinite(uhi) ? Math.max(0, Math.min(1, (uhi + 8) / 16)) : null
  const airTemp = Number(props?.Air_Temp)
  const tmrt = Number(props?.Tmrt)
  const wind = Number(props?.Wind_speed)
  const shadowFrac = Number(props?.shadow_frac)
  const shadowBar = Number.isFinite(shadowFrac) ? Math.max(0, Math.min(1, shadowFrac)) : null

  const valueByMetric = {
    utci,
    uhi,
    airTemp,
    tmrt,
    shadow: shadowFrac,
  }
  const valueNum = valueByMetric[activeMetric]
  const legendColor = colorForEnvMetric(
    valueNum,
    metricSummary?.min,
    metricSummary?.max,
    activeMetric,
  )
  const textColor = contrastTextForBg(legendColor)

  if (activeMetric === 'uhi') {
    const band = bandFromRange(uhi, metricSummary, 'uhi')
    return buildCellInfoPopupHtml({
      title: `Cell #${id}`,
      primaryLabel: 'UHI Intensity:',
      primaryValue: `${formatEnvValue(props?.UHI_intens)} °C`,
      badge: { label: band.shortLabel, color: legendColor, textColor },
      metrics: [
        {
          label: 'UHI Intensity',
          value: `${formatEnvValue(props?.UHI_intens)} °C`,
          bar: uhiBar,
          barColor: legendColor,
        },
        {
          label: 'Air Temp',
          value: `${formatEnvValue(props?.Air_Temp, 1)} °C`,
          bar: null,
        },
        {
          label: 'Wind',
          value: formatEnvValue(props?.Wind_speed, 1),
          bar: null,
        },
      ],
      footer: { label: band.label, color: legendColor, textColor },
    })
  }

  if (activeMetric === 'airTemp') {
    const band = bandFromRange(airTemp, metricSummary, 'airTemp')
    return buildCellInfoPopupHtml({
      title: `Cell #${id}`,
      primaryLabel: 'Air Temperature:',
      primaryValue: `${formatEnvValue(props?.Air_Temp, 1)} °C`,
      badge: { label: band.shortLabel, color: legendColor, textColor },
      metrics: [
        {
          label: 'Air Temp',
          value: `${formatEnvValue(props?.Air_Temp, 1)} °C`,
          bar: null,
          barColor: legendColor,
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
      ],
      footer: { label: band.label, color: legendColor, textColor },
    })
  }

  if (activeMetric === 'tmrt') {
    const band = bandFromRange(tmrt, metricSummary, 'tmrt')
    return buildCellInfoPopupHtml({
      title: `Cell #${id}`,
      primaryLabel: 'Mean Radiant Temp:',
      primaryValue: `${formatEnvValue(props?.Tmrt, 1)} °C`,
      badge: { label: band.shortLabel, color: legendColor, textColor },
      metrics: [
        {
          label: 'Tmrt',
          value: `${formatEnvValue(props?.Tmrt, 1)} °C`,
          bar: null,
          barColor: legendColor,
        },
        {
          label: 'Air Temp',
          value: `${formatEnvValue(props?.Air_Temp, 1)} °C`,
          bar: null,
        },
        {
          label: 'UTCI',
          value: `${formatEnvValue(props?.utci_c, 1)} °C`,
          bar: utciBar,
        },
      ],
      footer: { label: band.label, color: legendColor, textColor },
    })
  }

  if (activeMetric === 'shadow') {
    const band = bandFromRange(shadowFrac, metricSummary, 'shadow')
    return buildCellInfoPopupHtml({
      title: `Cell #${id}`,
      primaryLabel: 'Shadow Exposure:',
      primaryValue: formatShadowPercent(props?.shadow_frac, 0),
      badge: { label: band.shortLabel, color: legendColor, textColor },
      metrics: [
        {
          label: 'Shadow',
          value: formatShadowPercent(props?.shadow_frac, 0),
          bar: shadowBar,
          barColor: legendColor,
        },
        {
          label: 'Tmrt',
          value: `${formatEnvValue(props?.Tmrt, 1)} °C`,
          bar: null,
        },
        {
          label: 'UTCI',
          value: `${formatEnvValue(props?.utci_c, 1)} °C`,
          bar: utciBar,
        },
      ],
      footer: { label: band.label, color: legendColor, textColor },
    })
  }

  // UTCI (default) — stress class + comfort drivers
  return buildCellInfoPopupHtml({
    title: `Cell #${id}`,
    primaryLabel: 'UTCI:',
    primaryValue: `${formatEnvValue(props?.utci_c, 1)} °C`,
    badge: {
      label: stressMeta?.shortLabel ?? stressMeta?.label ?? 'UTCI',
      color: legendColor,
      textColor,
    },
    metrics: [
      {
        label: 'UTCI',
        value: `${formatEnvValue(props?.utci_c, 1)} °C`,
        bar: utciBar,
        barColor: legendColor,
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
        value: formatEnvValue(wind, 1),
        bar: null,
      },
    ],
    footer: {
      label: stressMeta?.label ?? 'UTCI',
      color: legendColor,
      textColor,
    },
  })
}

function FlyToCell({ cellId, grid, activeMetric, metricSummary }) {
  const map = useMap()

  useEffect(() => {
    if (cellId == null || !grid?.features || !activeMetric) return
    const feature = grid.features.find((f) => f.properties?.id == cellId)
    if (!feature) return

    const center = getFeatureCenter(feature)
    const anchor = getFeaturePopupAnchor(feature)
    if (!center || !anchor) return

    map.flyTo(center, 19, { animate: true, duration: 0.8 })
    const popup = L.popup(CELL_POPUP_OPTS)
      .setLatLng(anchor)
      .setContent(buildCellPopup(feature.properties, activeMetric, metricSummary))
    popup.openOn(map)

    return () => {
      map.closePopup(popup)
    }
  }, [cellId, grid, activeMetric, metricSummary, map])

  return null
}

function ClosePopupWhenNoMetric({ activeMetric }) {
  const map = useMap()
  useEffect(() => {
    if (!activeMetric) map.closePopup()
  }, [activeMetric, map])
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

const ENV_FOCUS_PULSE_RADIUS = 22
const ENV_FOCUS_DOT_RADIUS = 8

function envFocusPulseStyle(color) {
  return {
    radius: ENV_FOCUS_PULSE_RADIUS,
    color,
    weight: 2,
    opacity: 0.7,
    fillOpacity: 0,
    interactive: false,
    className: 'poi-pulse-ring',
  }
}

function envFocusPulseDelayStyle(color) {
  return {
    ...envFocusPulseStyle(color),
    className: 'poi-pulse-ring-delay',
  }
}

function envFocusDotStyle(color) {
  return {
    radius: ENV_FOCUS_DOT_RADIUS,
    color: '#ffffff',
    weight: 2,
    fillColor: color,
    fillOpacity: 0.95,
    interactive: false,
  }
}

function focusMarkerColor(feature, stats) {
  const utci = Number(feature?.properties?.utci_c)
  const min = stats?.utci?.min
  const max = stats?.utci?.max
  if (Number.isFinite(utci) && Number.isFinite(min) && utci === min) return '#4575b4'
  if (Number.isFinite(utci) && Number.isFinite(max) && utci === max) return '#a50026'
  return ENV_CELL_HIGHLIGHT.color
}

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
  const [basemapId, setBasemapId] = useState(DEFAULT_APP_BASEMAP)
  const basemap = useMemo(() => getAppBasemap(basemapId), [basemapId])
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

  useEffect(() => {
    if (!activeMetric) setSelectedCellId(null)
  }, [activeMetric])

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
        const popup = L.popup(CELL_POPUP_OPTS).setContent(
          buildCellPopup(feature.properties, activeMetric, metricSummary),
        )
        if (anchor && layer._map) {
          popup.setLatLng(anchor).openOn(layer._map)
        } else {
          layer.bindPopup(popup).openPopup()
        }
      })
    },
    [activeMetric, metricSummary],
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
          key={basemap.id}
          attribution={basemap.attribution}
          url={basemap.url}
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
            {(() => {
              const center = getFeatureCenter(selectedFeature)
              if (!center) return null
              const [lat, lng] = center
              const markerColor = focusMarkerColor(selectedFeature, stats)
              return (
                <Fragment key={`env-focus-marker-${selectedCellId}`}>
                  <CircleMarker
                    center={[lat, lng]}
                    pathOptions={envFocusPulseStyle(markerColor)}
                    renderer={highlightRenderer}
                  />
                  <CircleMarker
                    center={[lat, lng]}
                    pathOptions={envFocusPulseDelayStyle(markerColor)}
                    renderer={highlightRenderer}
                  />
                  <CircleMarker
                    center={[lat, lng]}
                    pathOptions={envFocusDotStyle(markerColor)}
                    renderer={highlightRenderer}
                  />
                </Fragment>
              )
            })()}
          </>
        )}

        <FlyToCell
          cellId={focusedCellId}
          grid={grid}
          activeMetric={activeMetric}
          metricSummary={metricSummary}
        />
        <ClosePopupWhenNoMetric activeMetric={activeMetric} />
      </MapContainer>

      <EnvironmentalMapLayerFab
        visibleLayers={visibleLayers}
        onToggle={onToggleLayer}
        basemapId={basemapId}
        onBasemapChange={setBasemapId}
      />
      <EnvironmentalLegend activeMetric={activeMetric} stats={stats} />
    </div>
  )
}
