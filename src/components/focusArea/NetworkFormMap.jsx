import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import FitBoundsToGeoJson from './FitBoundsToGeoJson.jsx'
import NetworkFormLegend from './NetworkFormLegend.jsx'
import NetworkFormMapLayerFab from './NetworkFormMapLayerFab.jsx'
import {
  NETWORK_FORM_GN_COLOR,
  NETWORK_FORM_HIGHLIGHT,
  NETWORK_FORM_ICONS,
  NETWORK_FORM_JTYPE_LABEL,
  NETWORK_FORM_MAP_CENTER,
  NETWORK_FORM_MAP_ZOOM,
  NETWORK_FORM_ROAD_COLOR,
  NETWORK_FORM_ROAD_COLOR_ON_STREETS,
  NETWORK_FORM_ROAD_WEIGHT,
  NETWORK_FORM_ROAD_WEIGHT_ON_STREETS,
  NETWORK_FORM_SELECTED_ZOOM,
} from '../../constants/networkForm.js'
import {
  DEFAULT_NETWORK_FORM_BASEMAP,
  getNetworkFormBasemap,
} from '../../constants/basemaps.js'
import { buildCellInfoPopupHtml, CELL_POPUP_OPTS } from '../../utils/cellPopup.js'
import { findJunctionById, junctionLatLng } from '../../utils/networkFormStats.js'

const gnStyle = {
  color: NETWORK_FORM_GN_COLOR,
  weight: 2,
  fill: false,
  dashArray: '6 4',
  opacity: 0.95,
}

function roadStyleForBasemap(basemapId) {
  const onStreets = basemapId === 'streets'
  return {
    color: onStreets ? NETWORK_FORM_ROAD_COLOR_ON_STREETS : NETWORK_FORM_ROAD_COLOR,
    weight: onStreets ? NETWORK_FORM_ROAD_WEIGHT_ON_STREETS : NETWORK_FORM_ROAD_WEIGHT,
    opacity: onStreets ? 0.92 : 0.9,
  }
}

function junctionIcon(jtype, selected) {
  const color = NETWORK_FORM_ICONS[jtype]?.color ?? '#94a3b8'
  const size = selected ? 18 : 14
  let html = ''
  if (jtype === 'four_way') {
    html = `<div class="nf-icon nf-icon-tri${selected ? ' nf-icon-selected' : ''}" style="border-bottom-color:${color};border-bottom-width:${size}px;border-left-width:${size * 0.55}px;border-right-width:${size * 0.55}px"></div>`
  } else if (jtype === 'three_way') {
    html = `<div class="nf-icon nf-icon-sq${selected ? ' nf-icon-selected' : ''}" style="width:${size - 2}px;height:${size - 2}px;background:${color}"></div>`
  } else {
    html = `<div class="nf-icon nf-icon-cir${selected ? ' nf-icon-selected' : ''}" style="width:${size - 2}px;height:${size - 2}px;background:${color}"></div>`
  }
  return L.divIcon({
    className: 'nf-junction-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function buildPopup(props) {
  const jtype = props?.jtype
  const color = NETWORK_FORM_ICONS[jtype]?.color ?? '#64748b'
  return buildCellInfoPopupHtml({
    title: NETWORK_FORM_JTYPE_LABEL[jtype] ?? 'Junction',
    primaryLabel: 'Node',
    primaryValue: `#${props?.node_id ?? '—'}`,
    badge: {
      label: jtype === 'four_way' ? 'Permeable' : jtype === 'three_way' ? 'Tree-like' : 'Dead-end',
      color,
      textColor: '#ffffff',
    },
    metrics: [
      { label: 'Degree', value: String(props?.degree ?? '—'), bar: null },
      { label: 'Inside GN', value: props?.inside_gn ? 'Yes' : 'No', bar: null },
    ],
  })
}

function FlyToJunction({ selectedJunctionId, junctions }) {
  const map = useMap()

  useEffect(() => {
    if (selectedJunctionId == null || !junctions) return
    const feature = findJunctionById(junctions, selectedJunctionId)
    const ll = junctionLatLng(feature)
    if (!ll) return
    map.flyTo(ll, NETWORK_FORM_SELECTED_ZOOM, { duration: 0.55 })
  }, [selectedJunctionId, junctions, map])

  return null
}

function OpenSelectedPopup({ selectedJunctionId, junctions }) {
  const map = useMap()

  useEffect(() => {
    if (selectedJunctionId == null || !junctions) return
    const feature = findJunctionById(junctions, selectedJunctionId)
    const ll = junctionLatLng(feature)
    if (!ll || !feature) return
    const popup = L.popup(CELL_POPUP_OPTS)
      .setLatLng(ll)
      .setContent(buildPopup(feature.properties))
    popup.openOn(map)
    return () => {
      map.closePopup(popup)
    }
  }, [selectedJunctionId, junctions, map])

  return null
}

/** Interactive Network Form map — dark basemap + report-style junction icons. */
export default function NetworkFormMap({
  visibleLayers,
  onToggleLayer,
  gnBoundary,
  streets,
  junctions,
  counts,
  loading,
  selectedJunctionId,
  onSelectJunction,
}) {
  const [basemapId, setBasemapId] = useState(DEFAULT_NETWORK_FORM_BASEMAP)
  const basemap = useMemo(() => getNetworkFormBasemap(basemapId), [basemapId])
  const roadStyle = useMemo(() => roadStyleForBasemap(basemapId), [basemapId])

  const showRoads = Boolean(visibleLayers?.roads)
  const showGn = Boolean(visibleLayers?.gnBoundary)

  const markers = useMemo(() => {
    if (!junctions?.features) return []
    return junctions.features.filter((f) => {
      const jtype = f.properties?.jtype
      return jtype && visibleLayers?.[jtype]
    })
  }, [junctions, visibleLayers])

  const fitData = gnBoundary ?? streets

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-lg border border-surface-700">
      <NetworkFormMapLayerFab
        visibleLayers={visibleLayers}
        onToggle={onToggleLayer}
        basemapId={basemapId}
        onBasemapChange={setBasemapId}
      />
      <NetworkFormLegend counts={counts} visibleLayers={visibleLayers} />

      {loading && (
        <div className="absolute inset-0 z-[900] flex items-center justify-center bg-surface-950/40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      )}

      <MapContainer
        center={NETWORK_FORM_MAP_CENTER}
        zoom={NETWORK_FORM_MAP_ZOOM}
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

        {fitData && <FitBoundsToGeoJson data={fitData} padding={[28, 28]} />}

        {showGn && gnBoundary && <GeoJSON data={gnBoundary} style={gnStyle} />}
        {showRoads && streets && (
          <GeoJSON key={`streets-${basemapId}`} data={streets} style={roadStyle} />
        )}

        {markers.map((feature) => {
          const ll = junctionLatLng(feature)
          if (!ll) return null
          const id = feature.properties?.node_id
          const jtype = feature.properties?.jtype
          const selected = String(id) === String(selectedJunctionId)
          return (
            <Marker
              key={`j-${id}`}
              position={ll}
              icon={junctionIcon(jtype, selected)}
              zIndexOffset={selected ? 1000 : 0}
              eventHandlers={{
                click: () => onSelectJunction?.(id),
              }}
            />
          )
        })}

        <FlyToJunction selectedJunctionId={selectedJunctionId} junctions={junctions} />
        <OpenSelectedPopup selectedJunctionId={selectedJunctionId} junctions={junctions} />

        {selectedJunctionId != null &&
          (() => {
            const feature = findJunctionById(junctions, selectedJunctionId)
            const ll = junctionLatLng(feature)
            if (!ll) return null
            return (
              <Marker
                position={ll}
                interactive={false}
                zIndexOffset={900}
                icon={L.divIcon({
                  className: 'nf-junction-marker',
                  html: `<div class="nf-icon-glow" style="border-color:${NETWORK_FORM_HIGHLIGHT}"></div>`,
                  iconSize: [28, 28],
                  iconAnchor: [14, 14],
                })}
              />
            )
          })()}
      </MapContainer>
    </div>
  )
}
