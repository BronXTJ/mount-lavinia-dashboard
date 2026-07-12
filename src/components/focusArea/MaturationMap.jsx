import { Fragment, useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import FitBoundsToGeoJson from './FitBoundsToGeoJson.jsx'
import HexEdgeEffectNote from './HexEdgeEffectNote.jsx'
import {
  MATURATION_BUFFER_COLOR,
  MATURATION_CONTEXT_STYLES,
  MATURATION_HEX_HIGHLIGHT,
  MATURATION_MAP_CENTER,
  MATURATION_MAP_ZOOM,
  MATURATION_METRIC_RAMPS,
  MATURATION_PROPS,
  classifyMaturationTier,
  getActiveMaturationMetric,
  getMaturationLandUseColor,
  hasMaturationHexSelectableLayer,
} from '../../constants/maturation.js'
import {
  colorForLandUseDiversity,
  colorForMaturationMetric,
  formatMaturationValue,
} from '../../utils/maturationStats.js'
import {
  CELL_POPUP_OPTS,
  buildCellIdOnlyPopupHtml,
  buildCellInfoPopupHtml,
  getFeatureCenter,
  getFeaturePopupAnchor,
} from '../../utils/cellPopup.js'
import MaturationLegend from './MaturationLegend.jsx'
import MaturationMapLayerFab from './MaturationMapLayerFab.jsx'

const bufferStyle = {
  color: MATURATION_BUFFER_COLOR,
  weight: 4,
  fill: false,
}

/** Muted fill for edge hexes excluded from calculations (visual context only). */
const excludedHexStyle = {
  color: '#94a3b8',
  weight: 0.5,
  fillColor: '#64748b',
  fillOpacity: 0.35,
}

const POI_COLOR = MATURATION_CONTEXT_STYLES.pois.color
const poiPulseStyle = {
  radius: MATURATION_CONTEXT_STYLES.pois.radius,
  color: POI_COLOR,
  weight: 2,
  opacity: 0.6,
  fillOpacity: 0,
  interactive: false,
  className: 'poi-pulse-ring',
}
const poiDotStyle = {
  radius: MATURATION_CONTEXT_STYLES.pois.radius,
  color: '#ffffff',
  weight: 1,
  fillColor: POI_COLOR,
  fillOpacity: MATURATION_CONTEXT_STYLES.pois.fillOpacity,
}

const getPoiLabel = (p) => p.name || p.name_en || p.shop || p.amenity || p.tourism || p.man_made

const highlightGlowStyle = () => ({
  color: MATURATION_HEX_HIGHLIGHT.color,
  weight: 8,
  opacity: 0.5,
  fill: false,
  className: 'density-hex-highlight-pulse',
  interactive: false,
})

const highlightFillStyle = () => ({
  color: MATURATION_HEX_HIGHLIGHT.color,
  weight: MATURATION_HEX_HIGHLIGHT.weight,
  fillColor: MATURATION_HEX_HIGHLIGHT.fillColor,
  fillOpacity: MATURATION_HEX_HIGHLIGHT.fillOpacity,
  interactive: false,
})

const POPUP_OPTS = CELL_POPUP_OPTS

function buildMaturationPopup(props) {
  const umi = Number(props?.[MATURATION_PROPS.umi])
  const tier = classifyMaturationTier(umi)
  const entropy = Number(props?.[MATURATION_PROPS.entropyNorm])
  const access = Number(props?.[MATURATION_PROPS.accessibilityNorm])
  const landUse = Number(props?.[MATURATION_PROPS.landUseNorm])
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  const badgeTextColor = tier.id === 'low' ? '#0f172a' : '#ffffff'

  return buildCellInfoPopupHtml({
    title: `Hex Cell #${id}`,
    primaryLabel: 'Urban Maturation Score:',
    primaryValue: formatMaturationValue(umi),
    badge: { label: tier.shortLabel, color: tier.color, textColor: badgeTextColor },
    metrics: [
      { label: 'Shannon Entropy', value: formatMaturationValue(entropy), bar: entropy },
      { label: 'Accessibility', value: formatMaturationValue(access), bar: access },
      { label: 'Land Use Diversity', value: formatMaturationValue(landUse), bar: landUse },
    ],
    footer: { label: tier.label, color: tier.color, textColor: badgeTextColor },
  })
}

function buildHexIdOnlyPopup(props) {
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  return buildCellIdOnlyPopupHtml(`Hex Cell #${id}`)
}

function formatHexCellLabel(props) {
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  return `Hex Cell #${id}`
}

function FlyToHex({ hexId, hex }) {
  const map = useMap()

  useEffect(() => {
    if (hexId == null || !hex?.features) return
    const feature = hex.features.find((f) => f.properties?.id == hexId)
    if (!feature) return

    const center = getFeatureCenter(feature)
    const anchor = getFeaturePopupAnchor(feature)
    if (!center || !anchor) return

    map.flyTo(center, 17, { animate: true, duration: 0.8 })
    const popup = L.popup(POPUP_OPTS)
      .setLatLng(anchor)
      .setContent(buildMaturationPopup(feature.properties))
    popup.openOn(map)

    return () => {
      map.closePopup(popup)
    }
  }, [hexId, hex, map])

  return null
}

/** Interactive Urban Maturation map — hex choropleth + context layers + FAB. */
export default function MaturationMap({
  visibleLayers,
  onToggleLayer,
  hex,
  excludedHex,
  hexGrid,
  landuse,
  buildings,
  roads,
  pois,
  boundary,
  stats,
  loading,
  focusedHexId = null,
}) {
  const [selectedHexId, setSelectedHexId] = useState(null)
  const activeMetric = getActiveMaturationMetric(visibleLayers)
  const hexLayersOn = hasMaturationHexSelectableLayer(visibleLayers)
  const metricKey = activeMetric ? MATURATION_METRIC_RAMPS[activeMetric]?.property : null

  const metricSummary =
    activeMetric === 'umi'
      ? stats?.umi
      : activeMetric === 'entropy'
        ? stats?.entropyNorm
        : activeMetric === 'accessibility'
          ? stats?.accessibilityNorm
          : activeMetric === 'landUseDiversity'
            ? stats?.landUseNorm
            : null

  useEffect(() => {
    if (focusedHexId != null) setSelectedHexId(focusedHexId)
  }, [focusedHexId])

  useEffect(() => {
    if (!hexLayersOn) setSelectedHexId(null)
  }, [hexLayersOn])

  const selectedFeature = useMemo(() => {
    if (!hexLayersOn || selectedHexId == null) return null
    const fromHex = hex?.features?.find((f) => f.properties?.id == selectedHexId)
    if (fromHex) return fromHex
    return hexGrid?.features?.find((f) => f.properties?.id == selectedHexId) ?? null
  }, [hexLayersOn, selectedHexId, hex, hexGrid])

  const hexStyle = useMemo(
    () => (feature) => {
      const value = Number(feature.properties?.[metricKey])
      const fill =
        activeMetric === 'landUseDiversity'
          ? colorForLandUseDiversity(value, stats?.landUseDiversityClasses)
          : colorForMaturationMetric(
              value,
              metricSummary?.min,
              metricSummary?.max,
              activeMetric,
            )
      return {
        color: '#94a3b8',
        weight: 0.6,
        fillColor: fill,
        fillOpacity: 0.75,
      }
    },
    [activeMetric, metricKey, metricSummary, stats?.landUseDiversityClasses],
  )

  const hexGridInteractive = Boolean(visibleLayers.hexGrid && !activeMetric)

  const hexGridStyle = useMemo(() => {
    const base = MATURATION_CONTEXT_STYLES.hexGrid
    if (!hexGridInteractive) {
      return { ...base, interactive: false }
    }
    return {
      ...base,
      fill: true,
      fillColor: base.color,
      fillOpacity: 0,
    }
  }, [hexGridInteractive])

  const landUseStyle = useMemo(
    () => (feature) => {
      const fill = getMaturationLandUseColor(feature.properties?.Main_C)
      return {
        color: '#1e293b',
        weight: 0.4,
        fillColor: fill,
        fillOpacity: 0.7,
      }
    },
    [],
  )

  const onEachHex = useMemo(
    () => (feature, layer) => {
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        const id = feature.properties?.id ?? null
        setSelectedHexId(id)
        const anchor = getFeaturePopupAnchor(feature)
        const popup = L.popup(POPUP_OPTS).setContent(buildMaturationPopup(feature.properties))
        if (anchor) {
          popup.setLatLng(anchor).openOn(layer._map)
        } else {
          layer.bindPopup(popup).openPopup()
        }
      })
    },
    [],
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
        const popup = L.popup(POPUP_OPTS).setContent(buildHexIdOnlyPopup(feature.properties))
        if (anchor) {
          popup.setLatLng(anchor).openOn(layer._map)
        } else {
          layer.bindPopup(popup).openPopup()
        }
      })
    }
  }, [hexGridInteractive])

  const onEachLandUse = useMemo(
    () => (feature, layer) => {
      const cat = feature.properties?.Main_C ?? 'Unknown'
      const sub = feature.properties?.Sub_class
      layer.bindTooltip(sub ? `${cat} — ${sub}` : cat, {
        sticky: true,
        direction: 'top',
        opacity: 0.95,
      })
    },
    [],
  )

  const highlightRenderer = useMemo(() => L.svg(), [])

  return (
    <div className="relative h-full min-h-0">
        {loading && (
          <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-surface-900/60 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b45309] border-t-transparent" />
          </div>
        )}

        <MapContainer
          center={MATURATION_MAP_CENTER}
          zoom={MATURATION_MAP_ZOOM}
          className="h-full w-full"
          preferCanvas
          scrollWheelZoom
        >
        <MapInvalidateOnResize />
        {boundary && <FitBoundsToGeoJson data={boundary} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibleLayers.analysisArea && boundary && (
          <GeoJSON data={boundary} style={bufferStyle} />
        )}

        {visibleLayers.landUseMap && landuse && (
          <GeoJSON
            key="landuse-map"
            data={landuse}
            style={landUseStyle}
            onEachFeature={onEachLandUse}
          />
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
            key="hex-excluded-edge"
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

        {visibleLayers.buildings && buildings && (
          <GeoJSON
            key="buildings"
            data={buildings}
            style={MATURATION_CONTEXT_STYLES.buildings}
          />
        )}

        {visibleLayers.roads && roads && (
          <GeoJSON key="roads" data={roads} style={MATURATION_CONTEXT_STYLES.roads} />
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

        {focusedHexId != null && <FlyToHex hexId={focusedHexId} hex={hex} />}
      </MapContainer>

        <MaturationLegend activeMetric={activeMetric} stats={stats} />
        <MaturationMapLayerFab visibleLayers={visibleLayers} onToggle={onToggleLayer} />
        <HexEdgeEffectNote />
    </div>
  )
}
