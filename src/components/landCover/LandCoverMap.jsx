import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, ImageOverlay, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import MapFullscreenShell from '../MapFullscreenShell.jsx'
import FitBoundsToGeoJson from '../focusArea/FitBoundsToGeoJson.jsx'
import {
  DEFAULT_LC_BASEMAP,
  LC_BASEMAPS,
  LC_CONTEXT_STYLES,
  LC_MAP_CENTER,
  LC_MAP_ZOOM,
  LC_OVERLAY_BOUNDS,
  getActiveLcOverlay,
  getOverlayUrlFromVisible,
  landCoverUrl,
} from '../../constants/landCover.js'
import { densityGeoUrl } from '../../constants/density.js'
import { escapeHtml } from '../../utils/escapeHtml.js'
import { fetchJsonOrNull } from '../../lib/dataClient.js'
import LandCoverLegend from './LandCoverLegend.jsx'
import LandCoverMapLayerFab from './LandCoverMapLayerFab.jsx'

/** Pale purple highlight — unique vs Landsat red/green/orange/blue and cyan GN lines. */
const GN_SELECTED = {
  color: '#c4b5fd',
  fillColor: '#a78bfa',
  fillOpacity: 0.22,
  weight: 4,
  opacity: 1,
}

const gnHighlightGlowStyle = () => ({
  color: '#a78bfa',
  weight: 10,
  opacity: 0.55,
  fill: false,
  className: 'lc-gn-boundary-pulse',
  interactive: false,
})

const gnHighlightEdgeStyle = () => ({
  color: '#ede9fe',
  weight: 3,
  opacity: 1,
  fillColor: '#c4b5fd',
  fillOpacity: 0.18,
  interactive: false,
})

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
  const [basemapId, setBasemapId] = useState(DEFAULT_LC_BASEMAP)

  const activeOverlay = useMemo(() => getActiveLcOverlay(visibleLayers), [visibleLayers])
  const overlayUrl = useMemo(
    () => getOverlayUrlFromVisible(visibleLayers, epochId),
    [visibleLayers, epochId],
  )
  const basemap = useMemo(
    () => LC_BASEMAPS.find((b) => b.id === basemapId) ?? LC_BASEMAPS[0],
    [basemapId],
  )
  const showGnBoundaries = Boolean(visibleLayers?.gnBoundaries)
  const showBuildings = Boolean(visibleLayers?.buildings)
  const showRoads = Boolean(visibleLayers?.roads)

  const highlightRenderer = useMemo(() => L.svg(), [])

  const selectedGnCollection = useMemo(() => {
    if (!selectedGn || !gnData?.features) return null
    const feature = gnData.features.find((f) => f.properties?.ADM4_EN === selectedGn)
    if (!feature) return null
    return { type: 'FeatureCollection', features: [feature] }
  }, [selectedGn, gnData])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    // Core boundary data first so the map appears quickly.
    Promise.all([
      fetchJsonOrNull(landCoverUrl('aoi_gn5_dissolved.geojson')),
      fetchJsonOrNull(landCoverUrl('gn5_divisions.geojson')),
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

    // OSM context can load after — large GeoJSON should not block the map.
    Promise.all([
      fetchJsonOrNull(densityGeoUrl('buildings_primary_floors.geojson')),
      fetchJsonOrNull(densityGeoUrl('roads_primary.geojson')),
    ])
      .then(([buildingsJson, roadsJson]) => {
        if (cancelled) return
        setBuildings(buildingsJson)
        setRoads(roadsJson)
      })
      .catch(() => {
        if (!cancelled) {
          setBuildings(null)
          setRoads(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const overlayOpacity = basemapId === 'satellite' ? 0.55 : 0.88

  const gnStyle = (feature) => {
    const name = feature?.properties?.ADM4_EN
    const selected = selectedGn && name === selectedGn
    if (selected) {
      return {
        color: GN_SELECTED.color,
        weight: GN_SELECTED.weight,
        fillColor: GN_SELECTED.fillColor,
        fillOpacity: GN_SELECTED.fillOpacity,
        opacity: GN_SELECTED.opacity,
      }
    }
    return {
      color: '#00b4d8',
      weight: 1,
      fillColor: '#00b4d8',
      fillOpacity: 0.03,
      opacity: 0.85,
    }
  }

  function onEachGn(feature, layer) {
    const name = feature?.properties?.ADM4_EN
    if (!name) return
    layer.bindTooltip(escapeHtml(name), { sticky: true, direction: 'top', opacity: 0.95 })
    layer.on({
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        onSelectGn?.(name)
      },
    })
  }

  return (
    <MapFullscreenShell className="min-h-[360px]" innerClassName="bg-surface-900">
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
          key={basemap.id}
          attribution={basemap.attribution}
          url={basemap.url}
        />
        <FitBoundsToGeoJson data={aoi} padding={[48, 48]} maxZoom={15} />
        <FlyToSelectedGn selectedGn={selectedGn} gnData={gnData} />

        {overlayUrl && (
          <ImageOverlay
            key={overlayUrl}
            url={overlayUrl}
            bounds={LC_OVERLAY_BOUNDS}
            opacity={overlayOpacity}
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
            key={`gn-all-${selectedGn ?? 'none'}`}
            data={gnData}
            style={gnStyle}
            onEachFeature={onEachGn}
          />
        )}

        {/* Selected GN always visible (even if GN boundaries toggle is off). */}
        {selectedGnCollection && (
          <>
            <GeoJSON
              key={`gn-glow-${selectedGn}`}
              data={selectedGnCollection}
              style={gnHighlightGlowStyle}
              renderer={highlightRenderer}
            />
            <GeoJSON
              key={`gn-edge-${selectedGn}`}
              data={selectedGnCollection}
              style={gnHighlightEdgeStyle}
              renderer={highlightRenderer}
            />
          </>
        )}
      </MapContainer>

      <LandCoverMapLayerFab
        visibleLayers={visibleLayers}
        epochId={epochId}
        basemapId={basemapId}
        onToggle={onToggleLayer}
        onEpochChange={onEpochChange}
        onBasemapChange={setBasemapId}
      />
      <LandCoverLegend activeOverlay={activeOverlay} />
    </MapFullscreenShell>
  )
}
