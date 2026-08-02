import { Fragment, useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import MapFullscreenShell from '../MapFullscreenShell.jsx'
import FitBoundsToGeoJson from './FitBoundsToGeoJson.jsx'
import HexEdgeEffectNote from './HexEdgeEffectNote.jsx'
import {
  WALK_BUFFER_COLOR,
  WALK_CONTEXT_STYLES,
  WALK_HEX_HIGHLIGHT,
  WALK_MAP_CENTER,
  WALK_MAP_ZOOM,
  WALK_METRIC_RAMPS,
  WALK_PROPS,
  classifyWalkAccessTier,
  getActiveWalkMetric,
  getWalkTierColor,
  hasWalkHexSelectableLayer,
} from '../../constants/walkAccessibility.js'
import { DEFAULT_APP_BASEMAP, getAppBasemap } from '../../constants/basemaps.js'
import {
  colorForWalkMetric,
  formatWalkMinutes,
  formatWalkScore,
} from '../../utils/walkAccessibilityStats.js'
import { isPracticalMetricValue } from '../../utils/metricClasses.js'
import { formatHexCompletenessNote, isPartialHex } from '../../utils/hexCellGrade.js'
import {
  CELL_POPUP_OPTS,
  buildCellInfoPopupHtml,
  contrastTextForBg,
  getFeatureCenter,
  getFeaturePopupAnchor,
} from '../../utils/cellPopup.js'
import WalkAccessLegend from './WalkAccessLegend.jsx'
import WalkAccessMapLayerFab from './WalkAccessMapLayerFab.jsx'

const bufferStyle = {
  color: WALK_BUFFER_COLOR,
  weight: 4,
  fill: false,
}

const POI_COLOR = WALK_CONTEXT_STYLES.pois.color
const poiPulseStyle = {
  radius: WALK_CONTEXT_STYLES.pois.radius,
  color: POI_COLOR,
  weight: 2,
  opacity: 0.6,
  fillOpacity: 0,
  interactive: false,
  className: 'poi-pulse-ring',
}
const poiDotStyle = {
  radius: WALK_CONTEXT_STYLES.pois.radius,
  color: '#ffffff',
  weight: 1,
  fillColor: POI_COLOR,
  fillOpacity: WALK_CONTEXT_STYLES.pois.fillOpacity,
}

const getPoiLabel = (p) =>
  p.name || p.dest_group || p.poi_id || p.name_en || p.shop || p.amenity || p.tourism || p.man_made

const highlightGlowStyle = () => ({
  color: WALK_HEX_HIGHLIGHT.color,
  weight: 8,
  opacity: 0.5,
  fill: false,
  className: 'density-hex-highlight-pulse',
  interactive: false,
})

const highlightFillStyle = () => ({
  color: WALK_HEX_HIGHLIGHT.color,
  weight: WALK_HEX_HIGHLIGHT.weight,
  fillColor: WALK_HEX_HIGHLIGHT.fillColor,
  fillOpacity: WALK_HEX_HIGHLIGHT.fillOpacity,
  interactive: false,
})

const POPUP_OPTS = CELL_POPUP_OPTS

function formatHexCellLabel(props) {
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  return `Hex Cell #${id}`
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

function buildWalkPopup(props, activeMetric = 'accessScore', metricClasses = null) {
  const id = props?.id != null ? Math.round(Number(props.id)) : '—'
  const completeness = formatHexCompletenessNote({ properties: props })
  const score = Number(props?.[WALK_PROPS.accessScore])
  const tierMeta = classifyWalkAccessTier(props?.[WALK_PROPS.accessTier])
  const groups = Number(props?.[WALK_PROPS.groupsWithin10])

  if (activeMetric === 'accessTier') {
    const color = getWalkTierColor(props?.[WALK_PROPS.accessTier])
    const textColor = contrastTextForBg(color)
    const tierKey = String(props?.[WALK_PROPS.accessTier] ?? '').toLowerCase()
    const snapOk = props?.snap_ok
    const areaRatio = Number(props?.area_ratio)
    let excludeReason = '—'
    if (tierKey === 'excluded') {
      const incomplete = !(Number.isFinite(areaRatio) && areaRatio >= 0.9)
      const unsnapped = snapOk === false || snapOk === 0 || snapOk === 'false'
      if (incomplete && unsnapped) excludeReason = 'Incomplete (<90%) and unsnapped (>100 m)'
      else if (incomplete) excludeReason = 'Incomplete hex (<90% of full area)'
      else if (unsnapped) excludeReason = 'Unsnapped (centroid >100 m from network)'
      else excludeReason = 'Not analysis-ok'
    }
    return buildCellInfoPopupHtml({
      title: `Hex Cell #${id}`,
      primaryLabel: 'Access tier:',
      primaryValue: tierMeta.shortLabel,
      badge: { label: tierMeta.shortLabel, color, textColor },
      metrics: [
        { label: 'Access Score', value: formatWalkScore(score), bar: Number.isFinite(score) ? score : null, barColor: color },
        {
          label: 'Groups ≤10 min',
          value: Number.isFinite(groups) ? String(groups) : '—',
          bar: null,
        },
        { label: 'Completeness', value: completeness, bar: null },
        ...(tierKey === 'excluded'
          ? [{ label: 'Why excluded', value: excludeReason, bar: null }]
          : []),
      ],
      footer: { label: tierMeta.label, color, textColor },
    })
  }

  if (activeMetric?.startsWith('time')) {
    const prop = WALK_METRIC_RAMPS[activeMetric]?.property
    const label = WALK_METRIC_RAMPS[activeMetric]?.label ?? 'Walk time'
    const minutes = Number(props?.[prop])
    const color = colorForWalkMetric(minutes, metricClasses)
    const textColor = contrastTextForBg(color)
    const reachable = Number.isFinite(minutes)
    return buildCellInfoPopupHtml({
      title: `Hex Cell #${id}`,
      primaryLabel: `${label}:`,
      primaryValue: reachable ? formatWalkMinutes(minutes) : 'Unreachable',
      badge: {
        label: reachable ? formatWalkMinutes(minutes) : 'No path',
        color: reachable ? color : '#94a3b8',
        textColor: reachable ? textColor : '#0f172a',
      },
      metrics: [
        {
          label: 'Walk time',
          value: reachable ? formatWalkMinutes(minutes) : '—',
          bar: reachable ? Math.min(1, minutes / 15) : null,
          barColor: color,
        },
        { label: 'Access Score', value: formatWalkScore(score), bar: Number.isFinite(score) ? score : null },
        { label: 'Completeness', value: completeness, bar: null },
      ],
      footer: {
        label: reachable ? label : 'No snapped path to this group',
        color: reachable ? color : '#94a3b8',
        textColor: reachable ? textColor : '#0f172a',
      },
    })
  }

  // accessScore (default)
  const color = colorForWalkMetric(score, metricClasses)
  const textColor = contrastTextForBg(color)
  return buildCellInfoPopupHtml({
    title: `Hex Cell #${id}`,
    primaryLabel: 'Access Score:',
    primaryValue: formatWalkScore(score),
    badge: { label: tierMeta.shortLabel, color: tierMeta.color, textColor: contrastTextForBg(tierMeta.color) },
    metrics: [
      {
        label: 'Access Score',
        value: formatWalkScore(score),
        bar: Number.isFinite(score) ? score : null,
        barColor: color,
      },
      {
        label: 'Groups ≤10 min',
        value: Number.isFinite(groups) ? String(groups) : '—',
        bar: null,
      },
      { label: 'Tier', value: tierMeta.label, bar: null },
      { label: 'Completeness', value: completeness, bar: null },
    ],
    footer: { label: tierMeta.label, color: tierMeta.color, textColor: contrastTextForBg(tierMeta.color) },
  })
}

function FlyToHex({ hexId, hex, activeMetric, metricClasses }) {
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
      .setContent(buildWalkPopup(feature.properties, activeMetric, metricClasses))
    popup.openOn(map)

    return () => {
      map.closePopup(popup)
    }
  }, [hexId, hex, activeMetric, metricClasses, map])

  return null
}

function ClosePopupWhenNoMetric({ activeMetric }) {
  const map = useMap()
  useEffect(() => {
    if (!activeMetric) map.closePopup()
  }, [activeMetric, map])
  return null
}

/** Interactive Walk Accessibility map — hex choropleth + context + POI pulse + FAB. */
export default function WalkAccessMap({
  visibleLayers,
  onToggleLayer,
  hex,
  excludedHex,
  hexGrid,
  buildings,
  roads,
  pois,
  boundary,
  deserts,
  mismatch,
  stats,
  loading,
  focusedHexId = null,
}) {
  const [selectedHexId, setSelectedHexId] = useState(null)
  const [basemapId, setBasemapId] = useState(DEFAULT_APP_BASEMAP)
  const basemap = useMemo(() => getAppBasemap(basemapId), [basemapId])
  const activeMetric = getActiveWalkMetric(visibleLayers)
  const hexLayersOn = hasWalkHexSelectableLayer(visibleLayers)
  const metricKey = activeMetric ? WALK_METRIC_RAMPS[activeMetric]?.property : null

  const metricClasses =
    activeMetric === 'accessScore'
      ? stats?.accessScoreClasses
      : activeMetric?.startsWith('time')
        ? stats?.timeClasses?.[activeMetric]
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
      if (activeMetric === 'accessTier') {
        const tier = String(feature.properties?.[WALK_PROPS.accessTier] ?? '').toLowerCase()
        if (tier === 'excluded' || !tier) {
          return {
            color: '#94a3b8',
            weight: 0.6,
            fill: true,
            fillColor: '#94a3b8',
            fillOpacity: 0,
          }
        }
        const fill = getWalkTierColor(tier)
        const partial = isPartialHex(feature)
        return {
          color: '#94a3b8',
          weight: partial ? 1.2 : 0.6,
          dashArray: partial ? '4 3' : null,
          fillColor: fill,
          fillOpacity: partial ? 0.45 : 0.75,
        }
      }

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
      const fill = colorForWalkMetric(value, metricClasses)
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
    const base = WALK_CONTEXT_STYLES.hexGrid
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

  const onEachHex = useMemo(
    () => (feature, layer) => {
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
        const popup = L.popup(POPUP_OPTS).setContent(
          buildWalkPopup(feature.properties, activeMetric, metricClasses),
        )
        if (anchor) {
          popup.setLatLng(anchor).openOn(layer._map)
        } else {
          layer.bindPopup(popup).openPopup()
        }
      })
    },
    [activeMetric, metricClasses],
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

  const highlightRenderer = useMemo(() => L.svg(), [])

  return (
    <MapFullscreenShell className="min-h-0">
      {loading && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-surface-900/60 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0d9488] border-t-transparent" />
        </div>
      )}

      <MapContainer
        center={WALK_MAP_CENTER}
        zoom={WALK_MAP_ZOOM}
        className="h-full w-full"
        preferCanvas
        scrollWheelZoom
      >
        <MapInvalidateOnResize />
        {boundary && <FitBoundsToGeoJson data={boundary} />}
        <TileLayer key={basemap.id} attribution={basemap.attribution} url={basemap.url} />

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

        {visibleLayers.deserts && deserts && (
          <GeoJSON
            key="deserts-outline"
            data={deserts}
            style={WALK_CONTEXT_STYLES.deserts}
            interactive={false}
          />
        )}

        {visibleLayers.mismatch && mismatch && (
          <GeoJSON
            key="mismatch-outline"
            data={mismatch}
            style={WALK_CONTEXT_STYLES.mismatch}
            interactive={false}
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
          <GeoJSON key="buildings" data={buildings} style={WALK_CONTEXT_STYLES.buildings} />
        )}

        {visibleLayers.roads && roads && (
          <GeoJSON key="roads" data={roads} style={WALK_CONTEXT_STYLES.roads} />
        )}

        {visibleLayers.pois &&
          pois?.features?.map((feature, i) => {
            const coords = feature.geometry?.coordinates
            if (!coords || feature.geometry.type !== 'Point') return null
            const [lng, lat] = coords
            const label = getPoiLabel(feature.properties ?? {})
            return (
              <Fragment key={feature.properties?.poi_id ?? `poi-${i}`}>
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
          <FlyToHex
            hexId={focusedHexId}
            hex={hex}
            activeMetric={activeMetric}
            metricClasses={metricClasses}
          />
        )}
        <ClosePopupWhenNoMetric activeMetric={activeMetric} />
      </MapContainer>

      <WalkAccessLegend activeMetric={activeMetric} stats={stats} />
      <WalkAccessMapLayerFab
        visibleLayers={visibleLayers}
        onToggle={onToggleLayer}
        basemapId={basemapId}
        onBasemapChange={setBasemapId}
      />
      <HexEdgeEffectNote />
    </MapFullscreenShell>
  )
}
