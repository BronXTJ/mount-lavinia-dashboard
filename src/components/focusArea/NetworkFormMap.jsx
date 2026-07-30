import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import NetworkFormLegend from './NetworkFormLegend.jsx'
import NetworkFormMapLayerFab from './NetworkFormMapLayerFab.jsx'
import {
  NETWORK_FORM_GN_COLOR,
  NETWORK_FORM_GN_MUTED,
  NETWORK_FORM_HIGHLIGHT,
  NETWORK_FORM_ICONS,
  NETWORK_FORM_JTYPE_LABEL,
  NETWORK_FORM_MAP_CENTER,
  NETWORK_FORM_MAP_ZOOM,
  NETWORK_FORM_ROAD_COLOR,
  NETWORK_FORM_ROAD_COLOR_ON_STREETS,
  NETWORK_FORM_ROAD_WEIGHT,
  NETWORK_FORM_ROAD_WEIGHT_ON_STREETS,
  NETWORK_FORM_SCOPE_ALL,
  NETWORK_FORM_SELECTED_ZOOM,
} from '../../constants/networkForm.js'
import {
  DEFAULT_NETWORK_FORM_BASEMAP,
  getNetworkFormBasemap,
} from '../../constants/basemaps.js'
import { buildCellInfoPopupHtml, CELL_POPUP_OPTS } from '../../utils/cellPopup.js'
import { findJunctionById, junctionLatLng } from '../../utils/networkFormStats.js'

const gnMutedStyle = {
  color: NETWORK_FORM_GN_MUTED,
  weight: 1.25,
  fill: false,
  dashArray: '4 4',
  opacity: 0.7,
}

const gnHighlightStyle = {
  color: NETWORK_FORM_GN_COLOR,
  weight: 2.5,
  fillColor: NETWORK_FORM_GN_COLOR,
  fillOpacity: 0.08,
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
      { label: 'GN', value: props?.gn_name ?? '—', bar: null },
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

function FitBoundsToScope({ data, scopeKey, padding = [28, 28], maxZoom = 16 }) {
  const map = useMap()

  useEffect(() => {
    if (!data?.features?.length) return
    const layer = L.geoJSON(data)
    const bounds = layer.getBounds()
    if (!bounds.isValid()) return
    map.fitBounds(bounds, { padding, maxZoom, animate: true })
  }, [data, scopeKey, map, padding, maxZoom])

  return null
}

/** Interactive Network Form map — dark basemap + report-style junction icons. */
export default function NetworkFormMap({
  visibleLayers,
  onToggleLayer,
  gnBoundary,
  allGnBoundary,
  selectedScope,
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
  const showMutedOthers =
    showGn && selectedScope !== NETWORK_FORM_SCOPE_ALL && allGnBoundary?.features?.length

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

        {fitData && (
          <FitBoundsToScope data={fitData} scopeKey={selectedScope} padding={[28, 28]} />
        )}

        {showMutedOthers && (
          <GeoJSON
            key={`gn-all-muted-${selectedScope}`}
            data={allGnBoundary}
            style={gnMutedStyle}
          />
        )}
        {showGn && gnBoundary && (
          <GeoJSON key={`gn-scope-${selectedScope}`} data={gnBoundary} style={gnHighlightStyle} />
        )}
        {showRoads && streets && (
          <GeoJSON
            key={`streets-${basemapId}-${selectedScope}`}
            data={streets}
            style={roadStyle}
          />
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
