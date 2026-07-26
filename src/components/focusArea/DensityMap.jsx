import { Fragment, useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import {
  DENSITY_BUFFER_COLOR,
  DENSITY_CONTEXT_STYLES,
  DENSITY_HEX_HIGHLIGHT,
  DENSITY_MAP_CENTER,
  DENSITY_MAP_ZOOM,
  DENSITY_METRIC_RAMPS,
  getActiveDensityMetric,
  hasHexSelectableLayer,
} from '../../constants/density.js'
import { DEFAULT_APP_BASEMAP, getAppBasemap } from '../../constants/basemaps.js'
import {
  classifyTypology,
  colorForDensityMetric,
  formatDensityValue,
} from '../../utils/densityStats.js'
import { isPracticalMetricValue } from '../../utils/metricClasses.js'
import { formatHexCompletenessNote, isPartialHex } from '../../utils/hexCellGrade.js'
import {
  CELL_POPUP_OPTS,
  buildCellInfoPopupHtml,
  getFeatureCenter,
  getFeaturePopupAnchor,
} from '../../utils/cellPopup.js'
import DensityLegend from './DensityLegend.jsx'
import DensityMapLayerFab from './DensityMapLayerFab.jsx'
import FitBoundsToGeoJson from './FitBoundsToGeoJson.jsx'
import HexEdgeEffectNote from './HexEdgeEffectNote.jsx'

const bufferStyle = {
  color: DENSITY_BUFFER_COLOR,
  weight: 4,
  fill: false,
}

const POI_COLOR = DENSITY_CONTEXT_STYLES.pois.color
const poiPulseStyle = {
  radius: DENSITY_CONTEXT_STYLES.pois.radius,
  color: POI_COLOR,
  weight: 2,
  opacity: 0.6,
  fillOpacity: 0,
  interactive: false,
  className: 'poi-pulse-ring',
}
const poiDotStyle = {
  radius: DENSITY_CONTEXT_STYLES.pois.radius,
  color: '#ffffff',
  weight: 1,
  fillColor: POI_COLOR,
  fillOpacity: DENSITY_CONTEXT_STYLES.pois.fillOpacity,
}

const getPoiLabel = (p) => p.name || p.name_en || p.shop || p.amenity || p.tourism || p.man_made

const highlightGlowStyle = () => ({
  color: DENSITY_HEX_HIGHLIGHT.color,
  weight: 8,
  opacity: 0.5,
  fill: false,
  className: 'density-hex-highlight-pulse',
  interactive: false,
})

const highlightFillStyle = () => ({
  color: DENSITY_HEX_HIGHLIGHT.color,
  weight: DENSITY_HEX_HIGHLIGHT.weight,
  fillColor: DENSITY_HEX_HIGHLIGHT.fillColor,
  fillOpacity: DENSITY_HEX_HIGHLIGHT.fillOpacity,
  interactive: false,
})

function clamp01(v) {
  if (!Number.isFinite(v)) return null
  return Math.max(0, Math.min(1, v))
}

function buildHexPopup(props, medianFsi, medianGsi, medianOsr, activeMetric = null) {
  const typology = classifyTypology(
    Number(props?.FSI),
    Number(props?.GSI),
    Number(props?.OSR),
    medianFsi,
    medianGsi,
    medianOsr,
  )
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  const fsiNorm = clamp01(Number(props?.FSI_Norm))
  const gsiNorm = clamp01(Number(props?.GSI_Norm))
  const osr = Number(props?.OSR)
  const density = Number(props?.Density_V)
  const completeness = formatHexCompletenessNote({ properties: props })

  const primaryByMetric = {
    fsi: { label: 'FSI:', value: formatDensityValue(props?.FSI) },
    gsi: { label: 'GSI:', value: formatDensityValue(props?.GSI) },
    osr: { label: 'OSR:', value: formatDensityValue(props?.OSR) },
    density: { label: 'Density Value:', value: formatDensityValue(props?.Density_V) },
  }
  const primary = primaryByMetric[activeMetric] ?? {
    label: 'Density Value:',
    value: formatDensityValue(props?.Density_V),
  }

  return buildCellInfoPopupHtml({
    title: `Hex Cell #${id}`,
    primaryLabel: primary.label,
    primaryValue: primary.value,
    badge: { label: typology.label, color: typology.color, textColor: '#ffffff' },
    metrics: [
      { label: 'FSI', value: formatDensityValue(props?.FSI), bar: fsiNorm },
      { label: 'GSI', value: formatDensityValue(props?.GSI), bar: gsiNorm },
      {
        label: 'OSR',
        value: formatDensityValue(props?.OSR),
        bar: Number.isFinite(osr) ? clamp01(osr / 2) : null,
      },
      {
        label: 'Built area',
        value: `${formatDensityValue(props?.Area_build, 1)} m²`,
        bar: null,
      },
      {
        label: 'Floor area',
        value: `${formatDensityValue(props?.Floor_Area, 1)} m²`,
        bar: null,
      },
      {
        label: 'Density_V',
        value: formatDensityValue(density),
        bar: Number.isFinite(density) ? clamp01(density) : null,
      },
      { label: 'Completeness', value: completeness, bar: null },
    ],
    footer: { label: typology.label, color: typology.color, textColor: '#ffffff' },
  })
}

function buildHexIdOnlyPopup(props) {
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  const note = formatHexCompletenessNote({ properties: props })
  return buildCellInfoPopupHtml({
    title: `Hex Cell #${id}`,
    primaryLabel: 'Hex grid',
    primaryValue: 'Outline only',
    metrics: [{ label: 'Completeness', value: note, bar: null }],
  })
}

function formatHexCellLabel(props) {
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  return `Hex Cell #${id}`
}

/** Fly to a hex focused from a Min/Highest Cell ID card and open its popup. */
function FlyToHex({ hexId, hex, medianFsi, medianGsi, medianOsr, activeMetric }) {
  const map = useMap()

  useEffect(() => {
    if (hexId == null || !hex?.features || !activeMetric) return
    const feature = hex.features.find((f) => f.properties?.id == hexId)
    if (!feature) return

    const center = getFeatureCenter(feature)
    const anchor = getFeaturePopupAnchor(feature)
    if (!center || !anchor) return

    map.flyTo(center, 17, { animate: true, duration: 0.8 })
    const popup = L.popup(CELL_POPUP_OPTS)
      .setLatLng(anchor)
      .setContent(
        buildHexPopup(feature.properties, medianFsi, medianGsi, medianOsr, activeMetric),
      )
    popup.openOn(map)

    return () => {
      map.closePopup(popup)
    }
  }, [hexId, hex, medianFsi, medianGsi, medianOsr, activeMetric, map])

  return null
}

/** Close any open Leaflet popup when metric layers turn off. */
function ClosePopupWhenNoMetric({ activeMetric }) {
  const map = useMap()
  useEffect(() => {
    if (!activeMetric) map.closePopup()
  }, [activeMetric, map])
  return null
}

/** Interactive Density Analysis map — hex choropleth + context layers + FAB. */
export default function DensityMap({
  visibleLayers,
  onToggleLayer,
  hex,
  excludedHex,
  hexGrid,
  buildings,
  roads,
  pois,
  boundary,
  stats,
  loading,
  focusedHexId = null,
}) {
  const [selectedHexId, setSelectedHexId] = useState(null)
  const [basemapId, setBasemapId] = useState(DEFAULT_APP_BASEMAP)
  const basemap = useMemo(() => getAppBasemap(basemapId), [basemapId])
  const activeMetric = getActiveDensityMetric(visibleLayers)
  const hexLayersOn = hasHexSelectableLayer(visibleLayers)
  const metricKey = activeMetric ? DENSITY_METRIC_RAMPS[activeMetric]?.property : null
  const metricClasses =
    activeMetric === 'fsi'
      ? stats?.fsiClasses
      : activeMetric === 'gsi'
        ? stats?.gsiClasses
        : activeMetric === 'osr'
          ? stats?.osrClasses
          : activeMetric === 'density'
            ? stats?.densityClasses
            : null

  // Sync selection from parent (cell-ID card clicks)
  useEffect(() => {
    if (focusedHexId != null) setSelectedHexId(focusedHexId)
  }, [focusedHexId])

  // Drop selection when no hex-capable layer remains visible
  useEffect(() => {
    if (!hexLayersOn) setSelectedHexId(null)
  }, [hexLayersOn])

  // Clear selection highlight when metric turns off (hex-grid-only keeps ID clicks)
  useEffect(() => {
    if (!activeMetric) setSelectedHexId(null)
  }, [activeMetric])

  const selectedFeature = useMemo(() => {
    if (!hexLayersOn || selectedHexId == null) return null
    const fromHex = hex?.features?.find((f) => f.properties?.id == selectedHexId)
    if (fromHex) return fromHex
    return hexGrid?.features?.find((f) => f.properties?.id == selectedHexId) ?? null
  }, [hexLayersOn, selectedHexId, hex, hexGrid])

  const hexStyle = useMemo(
    () => (feature) => {
      const value = Number(feature.properties?.[metricKey])
      if (!isPracticalMetricValue(value, activeMetric)) {
        return {
          color: '#94a3b8',
          weight: 0.6,
          fill: true,
          fillColor: '#94a3b8',
          fillOpacity: 0,
        }
      }
      const fill = colorForDensityMetric(value, metricClasses)
      const partial = isPartialHex(feature)
      return {
        color: '#94a3b8',
        weight: partial ? 1.2 : 0.6,
        dashArray: partial ? '4 3' : null,
        fillColor: fill,
        fillOpacity: partial ? 0.45 : 0.75,
      }
    },
    [activeMetric, metricKey, metricClasses],
  )

  const excludedHexStyle = useMemo(
    () => ({
      color: '#94a3b8',
      weight: 0.6,
      fill: true,
      fillColor: '#94a3b8',
      fillOpacity: 0,
      interactive: false,
    }),
    [],
  )

  const hexGridInteractive = Boolean(visibleLayers.hexGrid && !activeMetric)

  const hexGridStyle = useMemo(() => {
    const base = DENSITY_CONTEXT_STYLES.hexGrid
    if (!hexGridInteractive) {
      return { ...base, interactive: false }
    }
    // Transparent fill so outline-only cells still receive hover/click.
    return {
      ...base,
      fill: true,
      fillColor: base.color,
      fillOpacity: 0,
    }
  }, [hexGridInteractive])

  const onEachHex = useMemo(
    () => (feature, layer) => {
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        const id = feature.properties?.id ?? null
        setSelectedHexId(id)
        const anchor = getFeaturePopupAnchor(feature)
        const popup = L.popup(CELL_POPUP_OPTS).setContent(
          buildHexPopup(
            feature.properties,
            stats?.medianFsi,
            stats?.medianGsi,
            stats?.medianOsr,
            activeMetric,
          ),
        )
        if (anchor && layer._map) {
          popup.setLatLng(anchor).openOn(layer._map)
        } else {
          layer.bindPopup(popup).openPopup()
        }
      })
    },
    [stats?.medianFsi, stats?.medianGsi, stats?.medianOsr, activeMetric],
  )

  const onEachHexGrid = useMemo(() => {
    if (!hexGridInteractive) return undefined
    return (feature, layer) => {
      layer.bindTooltip(formatHexCellLabel(feature.properties), {
        sticky: true,
        direction: 'top',
        opacity: 0.95,
      })
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        const id = feature.properties?.id ?? null
        setSelectedHexId(id)
        const anchor = getFeaturePopupAnchor(feature)
        const popup = L.popup(CELL_POPUP_OPTS).setContent(buildHexIdOnlyPopup(feature.properties))
        if (anchor && layer._map) {
          popup.setLatLng(anchor).openOn(layer._map)
        } else {
          layer.bindPopup(popup).openPopup()
        }
      })
    }
  }, [hexGridInteractive])

  // SVG renderer so CSS pulse animations work (preferCanvas can't animate paths).
  const highlightRenderer = useMemo(() => L.svg(), [])

  return (
    <div className="relative h-full min-h-0">
        {loading && (
          <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-surface-900/60 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#fb7185] border-t-transparent" />
          </div>
        )}

        <MapContainer
          center={DENSITY_MAP_CENTER}
          zoom={DENSITY_MAP_ZOOM}
          className="h-full w-full"
          preferCanvas
          scrollWheelZoom
        >
        <MapInvalidateOnResize />
        {boundary && <FitBoundsToGeoJson data={boundary} />}
        <TileLayer
          key={basemap.id}
          attribution={basemap.attribution}
          url={basemap.url}
        />

        {visibleLayers.analysisArea && boundary && (
          <GeoJSON data={boundary} style={bufferStyle} />
        )}

        {visibleLayers.hexGrid && hexGrid && (
          <GeoJSON
            key={hexGridInteractive ? 'hex-grid-interactive' : 'hex-grid'}
            data={hexGrid}
            style={hexGridStyle}
            onEachFeature={onEachHexGrid}
          />
        )}

        {activeMetric && excludedHex && (
          <GeoJSON
            key={`hex-excluded-${activeMetric}`}
            data={excludedHex}
            style={excludedHexStyle}
            interactive={false}
          />
        )}

        {activeMetric && hex && (
          <GeoJSON
            key={`hex-${activeMetric}`}
            data={hex}
            style={hexStyle}
            onEachFeature={onEachHex}
          />
        )}

        {/* Pulsing cyan highlight for the focused / clicked hex */}
        {selectedFeature && (
          <>
            <GeoJSON
              key={`hex-glow-${selectedHexId}`}
              data={{ type: 'FeatureCollection', features: [selectedFeature] }}
              style={highlightGlowStyle}
              renderer={highlightRenderer}
            />
            <GeoJSON
              key={`hex-highlight-${selectedHexId}`}
              data={{ type: 'FeatureCollection', features: [selectedFeature] }}
              style={highlightFillStyle}
              renderer={highlightRenderer}
            />
          </>
        )}

        <ClosePopupWhenNoMetric activeMetric={activeMetric} />

        {focusedHexId != null && activeMetric && (
          <FlyToHex
            hexId={focusedHexId}
            hex={hex}
            medianFsi={stats?.medianFsi}
            medianGsi={stats?.medianGsi}
            medianOsr={stats?.medianOsr}
            activeMetric={activeMetric}
          />
        )}

        {visibleLayers.buildings && buildings && (
          <GeoJSON
            key="buildings"
            data={buildings}
            style={DENSITY_CONTEXT_STYLES.buildings}
          />
        )}

        {visibleLayers.roads && roads && (
          <GeoJSON key="roads" data={roads} style={DENSITY_CONTEXT_STYLES.roads} />
        )}

        {visibleLayers.pois &&
          pois?.features?.map((feature, i) => {
            const coords = feature.geometry?.coordinates
            if (!coords || feature.geometry.type !== 'Point') return null
            const [lng, lat] = coords
            const label = getPoiLabel(feature.properties ?? {})
            return (
              <Fragment key={feature.id ?? `poi-${i}`}>
                <CircleMarker center={[lat, lng]} {...poiPulseStyle} renderer={highlightRenderer} />
                <CircleMarker center={[lat, lng]} {...poiDotStyle} renderer={highlightRenderer}>
                  {label && (
                    <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                      {label}
                    </Tooltip>
                  )}
                </CircleMarker>
              </Fragment>
            )
          })}
        </MapContainer>

        <DensityLegend activeMetric={activeMetric} stats={stats} />
        <DensityMapLayerFab
          visibleLayers={visibleLayers}
          onToggle={onToggleLayer}
          basemapId={basemapId}
          onBasemapChange={setBasemapId}
        />
        <HexEdgeEffectNote />
    </div>
  )
}
