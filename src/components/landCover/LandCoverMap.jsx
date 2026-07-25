import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, ImageOverlay, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import FitBoundsToGeoJson from '../focusArea/FitBoundsToGeoJson.jsx'
import {
  LC_CONTEXT_STYLES,
  LC_MAP_CENTER,
  LC_MAP_ZOOM,
  LC_OVERLAY_BOUNDS,
  getActiveLcOverlay,
  getOverlayUrlFromVisible,
  landCoverUrl,
} from '../../constants/landCover.js'
import { densityGeoUrl } from '../../constants/density.js'
import LandCoverLegend from './LandCoverLegend.jsx'
import LandCoverMapLayerFab from './LandCoverMapLayerFab.jsx'

function FlyToSelectedGn({ selectedGn, gnData }) {
  const map = useMap()

  useEffect(() => {
    if (!selectedGn || !gnData?.features) return
    const feature = gnData.features.find((f) => f.properties?.ADM4_EN === selectedGn)
    if (!feature) return
    const layer = L.geoJSON(feature)
    const bounds = layer.getBounds()
    if (!bounds.isValid()) return
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: true })
  }, [selectedGn, gnData, map])

  return null
}

/**
 * Center map — Landsat PNG ImageOverlay + OSM buildings/roads + clickable GN polygons.
 * Overlay visibility driven by Environmental-style visibleLayers switches.
 */
export default function LandCoverMap({
  visibleLayers,
  epochId,
  selectedGn,
  onSelectGn,
  onToggleLayer,
  onEpochChange,
}) {
  const [aoi, setAoi] = useState(null)
  const [gnData, setGnData] = useState(null)
  const [buildings, setBuildings] = useState(null)
  const [roads, setRoads] = useState(null)
  const [loading, setLoading] = useState(true)

  const activeOverlay = useMemo(() => getActiveLcOverlay(visibleLayers), [visibleLayers])
  const overlayUrl = useMemo(
    () => getOverlayUrlFromVisible(visibleLayers, epochId),
    [visibleLayers, epochId],
  )
  const showGnBoundaries = Boolean(visibleLayers?.gnBoundaries)
  const showBuildings = Boolean(visibleLayers?.buildings)
  const showRoads = Boolean(visibleLayers?.roads)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetch(landCoverUrl('aoi_gn5_dissolved.geojson')).then((r) => r.json()),
      fetch(landCoverUrl('gn5_divisions.geojson')).then((r) => r.json()),
      fetch(densityGeoUrl('buildings_primary_floors.geojson')).then((r) => r.json()),
      fetch(densityGeoUrl('roads_primary.geojson')).then((r) => r.json()),
    ])
      .then(([aoiJson, gnJson, buildingsJson, roadsJson]) => {
        if (cancelled) return
        setAoi(aoiJson)
        setGnData(gnJson)
        setBuildings(buildingsJson)
        setRoads(roadsJson)
      })
      .catch(() => {
        if (!cancelled) {
          setAoi(null)
          setGnData(null)
          setBuildings(null)
          setRoads(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const gnStyle = (feature) => {
    const name = feature?.properties?.ADM4_EN
    const selected = selectedGn && name === selectedGn
    return {
      color: selected ? '#67e8f9' : '#00b4d8',
      weight: selected ? 3 : 1.5,
      fillColor: selected ? '#ecfeff' : '#00b4d8',
      fillOpacity: selected ? 0.18 : 0.04,
      opacity: 1,
    }
  }

  function onEachGn(feature, layer) {
    const name = feature?.properties?.ADM4_EN
    if (!name) return
    layer.bindTooltip(name, { sticky: true, direction: 'top', opacity: 0.95 })
    layer.on({
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        onSelectGn?.(name)
      },
    })
  }

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-none bg-surface-900">
      {loading && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-surface-900/60 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00b4d8] border-t-transparent" />
        </div>
      )}

      <MapContainer
        center={LC_MAP_CENTER}
        zoom={LC_MAP_ZOOM}
        className="h-full w-full"
        preferCanvas
        scrollWheelZoom
      >
        <MapInvalidateOnResize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBoundsToGeoJson data={aoi} padding={[48, 48]} maxZoom={15} />
        <FlyToSelectedGn selectedGn={selectedGn} gnData={gnData} />

        {overlayUrl && (
          <ImageOverlay
            key={overlayUrl}
            url={overlayUrl}
            bounds={LC_OVERLAY_BOUNDS}
            opacity={0.88}
            zIndex={200}
          />
        )}

        {showBuildings && buildings && (
          <GeoJSON data={buildings} style={() => LC_CONTEXT_STYLES.buildings} />
        )}

        {showRoads && roads && (
          <GeoJSON data={roads} style={() => LC_CONTEXT_STYLES.roads} />
        )}

        {showGnBoundaries && gnData && (
          <GeoJSON
            key={`gn-${selectedGn ?? 'none'}`}
            data={gnData}
            style={gnStyle}
            onEachFeature={onEachGn}
          />
        )}
      </MapContainer>

      <LandCoverMapLayerFab
        visibleLayers={visibleLayers}
        epochId={epochId}
        onToggle={onToggleLayer}
        onEpochChange={onEpochChange}
      />
      <LandCoverLegend activeOverlay={activeOverlay} />
    </div>
  )
}
