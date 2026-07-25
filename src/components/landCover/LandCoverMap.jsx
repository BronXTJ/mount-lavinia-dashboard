import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, ImageOverlay, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import FitBoundsToGeoJson from '../focusArea/FitBoundsToGeoJson.jsx'
import {
  LC_DATA_BASE,
  LC_MAP_CENTER,
  LC_MAP_ZOOM,
  LC_OVERLAY_BOUNDS,
  getOverlayUrl,
} from '../../constants/landCover.js'
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
 * Center map — Landsat PNG ImageOverlay + clickable GN polygons.
 */
export default function LandCoverMap({
  layerMode,
  epochId,
  showGnBoundaries,
  selectedGn,
  onSelectGn,
  onLayerModeChange,
  onEpochChange,
  onToggleGnBoundaries,
}) {
  const [aoi, setAoi] = useState(null)
  const [gnData, setGnData] = useState(null)
  const [loading, setLoading] = useState(true)

  const overlayUrl = useMemo(() => getOverlayUrl(layerMode, epochId), [layerMode, epochId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetch(`${LC_DATA_BASE}/aoi_gn5_dissolved.geojson`).then((r) => r.json()),
      fetch(`${LC_DATA_BASE}/gn5_divisions.geojson`).then((r) => r.json()),
    ])
      .then(([aoiJson, gnJson]) => {
        if (cancelled) return
        setAoi(aoiJson)
        setGnData(gnJson)
      })
      .catch(() => {
        if (!cancelled) {
          setAoi(null)
          setGnData(null)
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
      opacity: showGnBoundaries ? 1 : 0,
      fill: showGnBoundaries,
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

        {layerMode !== 'context' && (
          <ImageOverlay
            key={overlayUrl}
            url={overlayUrl}
            bounds={LC_OVERLAY_BOUNDS}
            opacity={0.88}
            zIndex={200}
          />
        )}

        {showGnBoundaries && gnData && (
          <GeoJSON
            key={`gn-${selectedGn ?? 'none'}-${showGnBoundaries}`}
            data={gnData}
            style={gnStyle}
            onEachFeature={onEachGn}
          />
        )}
      </MapContainer>

      {layerMode === 'context' && (
        <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center bg-surface-900/80 p-3">
          <img
            src={`${LC_DATA_BASE}/maps/context_y2025_osm_overlay_gn5.png`}
            alt="Classified ~2025 with OSM roads and buildings overlay"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      <LandCoverMapLayerFab
        layerMode={layerMode}
        epochId={epochId}
        showGnBoundaries={showGnBoundaries}
        onLayerModeChange={onLayerModeChange}
        onEpochChange={onEpochChange}
        onToggleGnBoundaries={onToggleGnBoundaries}
      />
      <LandCoverLegend layerMode={layerMode} />
    </div>
  )
}
