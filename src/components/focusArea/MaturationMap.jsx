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
import { DEFAULT_APP_BASEMAP, getAppBasemap } from '../../constants/basemaps.js'
import {
  colorForLandUseDiversity,
  colorForMaturationMetric,
  formatMaturationValue,
} from '../../utils/maturationStats.js'
import { isPracticalMetricValue } from '../../utils/metricClasses.js'
import { formatHexCompletenessNote, isPartialHex } from '../../utils/hexCellGrade.js'
import {
  CELL_POPUP_OPTS,
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

/** High / medium / low bands for 0–1 component scores (same cut-points as UMI tiers). */
function classifyComponentBand(value, kind) {
  const v = Number(value)
  const level = !Number.isFinite(v) ? 'low' : v > 0.35 ? 'high' : v >= 0.15 ? 'medium' : 'low'
  const tier = MATURATION_TIERS_BY_LEVEL[level]
  const labels = COMPONENT_BAND_LABELS[kind]?.[level] ?? {
    shortLabel: tier.shortLabel,
    label: tier.label,
  }
  const textColor = level === 'high' ? '#ffffff' : '#0f172a'
  return {
    shortLabel: labels.shortLabel,
    label: labels.label,
    color: tier.color,
    textColor,
  }
}

const MATURATION_TIERS_BY_LEVEL = {
  high: { shortLabel: 'High', label: 'High', color: '#b45309' },
  medium: { shortLabel: 'Medium', label: 'Medium', color: '#fbbf24' },
  low: { shortLabel: 'Low', label: 'Low', color: '#94a3b8' },
}

const COMPONENT_BAND_LABELS = {
  mix: {
    high: { shortLabel: 'High Mix', label: 'High Land-Use Mix' },
    medium: { shortLabel: 'Moderate Mix', label: 'Moderate Land-Use Mix' },
    low: { shortLabel: 'Low Mix', label: 'Low Land-Use Mix' },
  },
  access: {
    high: { shortLabel: 'High Access', label: 'High Accessibility' },
    medium: { shortLabel: 'Moderate Access', label: 'Moderate Accessibility' },
    low: { shortLabel: 'Low Access', label: 'Low Accessibility' },
  },
  diversity: {
    high: { shortLabel: 'High Diversity', label: 'High Land-Use Diversity' },
    medium: { shortLabel: 'Moderate Diversity', label: 'Moderate Land-Use Diversity' },
    low: { shortLabel: 'Low Diversity', label: 'Low Land-Use Diversity' },
  },
}

function buildMaturationPopup(props, activeMetric = 'umi') {
  const umi = Number(props?.[MATURATION_PROPS.umi] ?? props?.umi)
  const tier = classifyMaturationTier(umi)
  const entropy = Number(props?.[MATURATION_PROPS.entropyNorm] ?? props?.entropy_norm)
  const entropyRaw = Number(props?.[MATURATION_PROPS.entropyRaw] ?? props?.entropy_raw)
  const access = Number(props?.[MATURATION_PROPS.accessibilityNorm] ?? props?.accessibility)
  const landUse = Number(props?.[MATURATION_PROPS.landUseNorm] ?? props?.landuse_div)
  const mixedUse = Number(props?.[MATURATION_PROPS.mixedUse] ?? props?.[' final_mui'])
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  const completeness = formatHexCompletenessNote({ properties: props })
  const umiBadgeText = tier.id === 'low' ? '#0f172a' : '#ffffff'

  if (activeMetric === 'entropy') {
    const band = classifyComponentBand(entropy, 'mix')
    return buildCellInfoPopupHtml({
      title: `Hex Cell #${id}`,
      primaryLabel: 'Shannon Entropy:',
      primaryValue: formatMaturationValue(entropy),
      badge: { label: band.shortLabel, color: band.color, textColor: band.textColor },
      metrics: [
        { label: 'Entropy (norm)', value: formatMaturationValue(entropy), bar: entropy },
        { label: 'Entropy (raw)', value: formatMaturationValue(entropyRaw), bar: null },
        {
          label: 'Mixed-use',
          value: formatMaturationValue(mixedUse),
          bar: Number.isFinite(mixedUse) ? mixedUse : null,
        },
        { label: 'Completeness', value: completeness, bar: null },
      ],
      footer: { label: band.label, color: band.color, textColor: band.textColor },
    })
  }

  if (activeMetric === 'accessibility') {
    const band = classifyComponentBand(access, 'access')
    return buildCellInfoPopupHtml({
      title: `Hex Cell #${id}`,
      primaryLabel: 'Accessibility:',
      primaryValue: formatMaturationValue(access),
      badge: { label: band.shortLabel, color: band.color, textColor: band.textColor },
      metrics: [
        { label: 'Accessibility', value: formatMaturationValue(access), bar: access },
        { label: 'Completeness', value: completeness, bar: null },
      ],
      footer: { label: band.label, color: band.color, textColor: band.textColor },
    })
  }

  if (activeMetric === 'landUseDiversity') {
    const band = classifyComponentBand(landUse, 'diversity')
    return buildCellInfoPopupHtml({
      title: `Hex Cell #${id}`,
      primaryLabel: 'Land Use Diversity:',
      primaryValue: formatMaturationValue(landUse),
      badge: { label: band.shortLabel, color: band.color, textColor: band.textColor },
      metrics: [
        { label: 'Diversity (norm)', value: formatMaturationValue(landUse), bar: landUse },
        {
          label: 'Mixed-use',
          value: formatMaturationValue(mixedUse),
          bar: Number.isFinite(mixedUse) ? mixedUse : null,
        },
        { label: 'Completeness', value: completeness, bar: null },
      ],
      footer: { label: band.label, color: band.color, textColor: band.textColor },
    })
  }

  // UMI (default) — maturation tier + component breakdown
  return buildCellInfoPopupHtml({
    title: `Hex Cell #${id}`,
    primaryLabel: 'Urban Maturation Score:',
    primaryValue: formatMaturationValue(umi),
    badge: { label: tier.shortLabel, color: tier.color, textColor: umiBadgeText },
    metrics: [
      { label: 'Shannon Entropy', value: formatMaturationValue(entropy), bar: entropy },
      { label: 'Accessibility', value: formatMaturationValue(access), bar: access },
      { label: 'Land Use Diversity', value: formatMaturationValue(landUse), bar: landUse },
      { label: 'Completeness', value: completeness, bar: null },
    ],
    footer: { label: tier.label, color: tier.color, textColor: umiBadgeText },
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

function buildLandUsePopup(props) {
  const cat = props?.Main_C ?? 'Unknown'
  const sub = props?.Sub_class ?? '—'
  const fill = getMaturationLandUseColor(cat)
  return buildCellInfoPopupHtml({
    title: 'Land use parcel',
    primaryLabel: 'Category:',
    primaryValue: String(cat),
    badge: { label: String(cat), color: fill, textColor: '#0f172a' },
    metrics: [{ label: 'Sub-class', value: String(sub), bar: null }],
    footer: { label: String(cat), color: fill, textColor: '#0f172a' },
  })
}

function formatHexCellLabel(props) {
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  return `Hex Cell #${id}`
}

function FlyToHex({ hexId, hex, activeMetric }) {
  const map = useMap()

  useEffect(() => {
    if (hexId == null || !hex?.features || !activeMetric) return
    const feature = hex.features.find((f) => f.properties?.id == hexId)
    if (!feature) return

    const center = getFeatureCenter(feature)
    const anchor = getFeaturePopupAnchor(feature)
    if (!center || !anchor) return

    map.flyTo(center, 17, { animate: true, duration: 0.8 })
    const popup = L.popup(POPUP_OPTS)
      .setLatLng(anchor)
      .setContent(buildMaturationPopup(feature.properties, activeMetric))
    popup.openOn(map)

    return () => {
      map.closePopup(popup)
    }
  }, [hexId, hex, activeMetric, map])

  return null
}

function ClosePopupWhenNoMetric({ activeMetric }) {
  const map = useMap()
  useEffect(() => {
    if (!activeMetric) map.closePopup()
  }, [activeMetric, map])
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
  const [basemapId, setBasemapId] = useState(DEFAULT_APP_BASEMAP)
  const basemap = useMemo(() => getAppBasemap(basemapId), [basemapId])
  const activeMetric = getActiveMaturationMetric(visibleLayers)
  const hexLayersOn = hasMaturationHexSelectableLayer(visibleLayers)
  const metricKey = activeMetric ? MATURATION_METRIC_RAMPS[activeMetric]?.property : null

  const metricClasses =
    activeMetric === 'umi'
      ? stats?.umiClasses
      : activeMetric === 'entropy'
        ? stats?.entropyClasses
        : activeMetric === 'accessibility'
          ? stats?.accessibilityClasses
          : activeMetric === 'landUseDiversity'
            ? stats?.landUseDiversityClasses
            : null

  useEffect(() => {
    if (focusedHexId != null) setSelectedHexId(focusedHexId)
  }, [focusedHexId])

  useEffect(() => {
    if (!hexLayersOn) setSelectedHexId(null)
  }, [hexLayersOn])

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
      const fill =
        activeMetric === 'landUseDiversity'
          ? colorForLandUseDiversity(value, metricClasses)
          : colorForMaturationMetric(value, metricClasses)
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
        const popup = L.popup(POPUP_OPTS).setContent(
          buildMaturationPopup(feature.properties, activeMetric),
        )
        if (anchor) {
          popup.setLatLng(anchor).openOn(layer._map)
        } else {
          layer.bindPopup(popup).openPopup()
        }
      })
    },
    [activeMetric],
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
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        const anchor = getFeaturePopupAnchor(feature)
        const popup = L.popup(POPUP_OPTS).setContent(buildLandUsePopup(feature.properties))
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
          key={basemap.id}
          attribution={basemap.attribution}
          url={basemap.url}
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

        {focusedHexId != null && activeMetric && (
          <FlyToHex hexId={focusedHexId} hex={hex} activeMetric={activeMetric} />
        )}
        <ClosePopupWhenNoMetric activeMetric={activeMetric} />
      </MapContainer>

        <MaturationLegend activeMetric={activeMetric} stats={stats} />
        <MaturationMapLayerFab
          visibleLayers={visibleLayers}
          onToggle={onToggleLayer}
          basemapId={basemapId}
          onBasemapChange={setBasemapId}
        />
        <HexEdgeEffectNote />
    </div>
  )
}
