import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MousePointerClick } from 'lucide-react'
import MapInvalidateOnResize from './MapInvalidateOnResize.jsx'
import MapFullscreenShell from './MapFullscreenShell.jsx'
import { findRoadFeature } from '../utils/roadNameMatch.js'
import findGnAtPoint from '../utils/findGnAtPoint.js'
import { getLandUseColor, HIGHLIGHT_COLOR, MAP_CENTER, MAP_ZOOM, SELECTED_GN_COLOR } from '../constants/mapLayers.js'
import { DEFAULT_APP_BASEMAP, getAppBasemap } from '../constants/basemaps.js'
import MapLayerFab from './MapLayerFab.jsx'
import Legend from './Legend.jsx'

const GEO_FILES = {
  boundary: 'study_area_boundary.geojson',
  gn5: 'gn5_combined_area.geojson',
  landuse: 'landuse.geojson',
  roads: 'roads.geojson',
  railways: 'railways.geojson',
  buildings: 'buildings.geojson',
  pois: 'pois.geojson',
}

function geoUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/geo/${fileName}`
}

/** Fetches every layer once on mount. Missing/broken files resolve to `null` — never throws. */
function useGeoLayers() {
  const [layers, setLayers] = useState({})

  useEffect(() => {
    let cancelled = false

    Promise.all(
      Object.entries(GEO_FILES).map(async ([key, fileName]) => {
        try {
          const res = await fetch(geoUrl(fileName))
          if (!res.ok) return [key, null]
          return [key, await res.json()]
        } catch {
          return [key, null]
        }
      }),
    ).then((entries) => {
      if (!cancelled) setLayers(Object.fromEntries(entries))
    })

    return () => {
      cancelled = true
    }
  }, [])

  return layers
}

function ClickHandler({ onMapClick, onGnSelect, suppressMapClickRef, gn5Active, gn5GeoJson }) {
  useMapEvents({
    click(e) {
      // GN polygon layer clicks set this flag so Canvas-propagated map clicks
      // do not double-fire after makeOnEachGn5 already handled the selection.
      if (suppressMapClickRef?.current) return

      const lat = e.latlng.lat
      const lng = e.latlng.lng

      if (gn5Active && gn5GeoJson) {
        const name = findGnAtPoint(gn5GeoJson, lng, lat)
        if (name) {
          // forceSelect: clicking around inside the same GN should keep it
          // selected while refreshing weather, not toggle it off.
          onGnSelect?.({ name, lat, lng, forceSelect: true })
          return
        }
      }

      onMapClick({ lat, lng })
    },
  })
  return null
}

function FlyToFeature({ feature }) {
  const map = useMap()
  useEffect(() => {
    if (!feature) return
    const bounds = L.geoJSON(feature).getBounds()
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [100, 100], maxZoom: 17, duration: 0.75 })
    }
  }, [feature, map])
  return null
}

/** Used when a road has no matching OSM line — flies to its registry lat/lng instead. */
function FlyToPoint({ point }) {
  const map = useMap()
  useEffect(() => {
    if (!point) return
    map.flyTo([point.lat, point.lng], 17, { duration: 0.75 })
  }, [point, map])
  return null
}

const tooltipOptions = { sticky: true, direction: 'top', opacity: 0.95 }

function bindTooltip(getLabel) {
  return (feature, layer) => {
    const label = getLabel(feature.properties ?? {})
    if (label) layer.bindTooltip(label, tooltipOptions)
  }
}

const onEachRoad = bindTooltip((p) => p.name)
const onEachLanduse = bindTooltip((p) => p.Main_C)
const onEachBuilding = bindTooltip((p) => (p.area_in_me ? `Building • ${Math.round(p.area_in_me)} m²` : null))
const getPoiLabel = (p) =>
  p.name || p.name_en || p.shop || p.amenity || p.tourism || p.man_made || p.dest_group

const gnLabelOptions = { permanent: true, direction: 'center', className: 'gn-label', interactive: false }

// Binds the division-name label and wires a click-to-select interaction —
// clicking a GN polygon reports its name + click lat/lng so the parent can
// swap KPI cards and refresh live weather. stopPropagation + suppress flag
// keep the map-wide weather handler from clearing the selection.
function makeOnEachGn5(onGnSelect, suppressMapClickRef) {
  return (feature, layer) => {
    const name = feature.properties?.ADM4_EN
    if (name) layer.bindTooltip(name, gnLabelOptions)

    layer.on('mouseover', () => {
      const el = layer._map?.getContainer()
      if (el) el.style.cursor = 'pointer'
    })
    layer.on('mouseout', () => {
      const el = layer._map?.getContainer()
      if (el) el.style.cursor = ''
    })

    layer.on('click', (e) => {
      // The map renders via Canvas (preferCanvas), where vector layers have
      // no real DOM element — Leaflet simulates their events and manually
      // propagates them up to the map afterwards. Only L.DomEvent's own
      // stopPropagation (not the native e.originalEvent one) short-circuits
      // that simulated propagation; the suppress flag covers any residual
      // map click that still arrives.
      L.DomEvent.stopPropagation(e)
      if (suppressMapClickRef) {
        suppressMapClickRef.current = true
        window.setTimeout(() => {
          suppressMapClickRef.current = false
        }, 50)
      }
      onGnSelect?.({
        name,
        lat: e.latlng?.lat,
        lng: e.latlng?.lng,
      })
    })
  }
}

// POIs render as two stacked circles — a non-interactive pulsing "radar
// ping" ring behind a solid, interactive dot — matching the halo technique
// used for the road highlight, scaled down for point markers.
const POI_COLOR = '#db2777'
const poiPulseStyle = {
  radius: 5,
  color: POI_COLOR,
  weight: 2,
  opacity: 0.6,
  fillOpacity: 0,
  interactive: false,
  className: 'poi-pulse-ring',
}
const poiDotStyle = {
  radius: 5,
  color: '#ffffff',
  weight: 1,
  fillColor: POI_COLOR,
  fillOpacity: 0.9,
}

const boundaryStyle = { color: '#dc2626', weight: 4, fill: false }
const gn5Style = { color: '#ffffff', weight: 2, fillColor: '#8b5cf6', fillOpacity: 0.18 }
const gn5SelectedStyle = { color: SELECTED_GN_COLOR, weight: 3, fillColor: SELECTED_GN_COLOR, fillOpacity: 0.32 }
const roadsStyle = { color: '#f77f00', weight: 1.5 }
const railwaysStyle = { color: '#ef4444', weight: 2, dashArray: '5 4' }
const buildingsStyle = { color: '#78716c', weight: 0.5, fillColor: '#94a3b8', fillOpacity: 0.55 }

// Rendered as two stacked lines for a halo effect: a wide, soft, pulsing
// "glow" underneath a crisp solid line on top.
const highlightGlowStyle = { color: HIGHLIGHT_COLOR, weight: 18, opacity: 0.35, className: 'road-highlight-glow' }
const highlightLineStyle = { color: HIGHLIGHT_COLOR, weight: 7, opacity: 1 }

// Fallback for roads with no matching OSM line — same brown glow treatment,
// but as a point marker (stroke-only ring + solid center dot) instead of a line.
const highlightMarkerGlowStyle = {
  radius: 14,
  color: HIGHLIGHT_COLOR,
  weight: 18,
  opacity: 0.35,
  fillOpacity: 0,
  className: 'road-highlight-glow',
}
const highlightMarkerDotStyle = {
  radius: 8,
  color: '#ffffff',
  weight: 2,
  fillColor: HIGHLIGHT_COLOR,
  fillOpacity: 0.95,
}

function landuseStyle(feature) {
  const color = getLandUseColor(feature.properties?.Main_C)
  return { color, weight: 0.4, fillColor: color, fillOpacity: 0.45 }
}

/**
 * The Focus Area interactive map. Self-loads GeoJSON layers and renders
 * whichever are active. Reports clicks up via onMapClick and accepts a
 * clickedPosition to render the "you clicked here" marker (state lives in
 * the parent tab so it can also drive the Live Data Panel). Clicking a GN
 * division polygon reports { name, lat, lng } via onGnSelect so the parent can
 * swap KPI cards and refresh weather; selectedGnName drives the highlight
 * style for the currently-selected polygon.
 */
export default function FocusAreaMap({
  activeLayers,
  onToggleLayer,
  onMapClick,
  highlightedRoadName,
  highlightedRoadCoords,
  clickedPosition,
  selectedGnName,
  onGnSelect,
}) {
  const layers = useGeoLayers()
  const suppressMapClickRef = useRef(false)
  const [basemapId, setBasemapId] = useState(DEFAULT_APP_BASEMAP)
  const basemap = useMemo(() => getAppBasemap(basemapId), [basemapId])

  const onEachGn5 = useMemo(
    () => makeOnEachGn5(onGnSelect, suppressMapClickRef),
    [onGnSelect],
  )
  const gn5StyleFn = (feature) =>
    feature.properties?.ADM4_EN === selectedGnName ? gn5SelectedStyle : gn5Style

  const highlightedFeature = useMemo(
    () => findRoadFeature(layers.roads, highlightedRoadName),
    [layers.roads, highlightedRoadName],
  )

  // Some roads in the property registry don't exist as a line in the OSM
  // linework at all — fall back to a point marker at their registry lat/lng
  // so every road can still be located on the map.
  const showFallbackMarker = !highlightedFeature && Boolean(highlightedRoadCoords)

  // The map otherwise renders via Canvas (preferCanvas) for performance on the
  // large buildings/roads layers, but Canvas paths can't be CSS-animated. The
  // highlight needs its own real SVG renderer so the pulse-glow keyframes work.
  const highlightRenderer = useMemo(() => L.svg(), [])

  const isOn = (id) => activeLayers.includes(id)
  const showGnHint = isOn('gn5')

  return (
    <MapFullscreenShell innerClassName="rounded-lg border border-surface-700">
      <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full" preferCanvas>
        <MapInvalidateOnResize />
        <TileLayer
          key={basemap.id}
          attribution={basemap.attribution}
          url={basemap.url}
        />

        <ClickHandler
          onMapClick={onMapClick}
          onGnSelect={onGnSelect}
          suppressMapClickRef={suppressMapClickRef}
          gn5Active={isOn('gn5')}
          gn5GeoJson={layers.gn5}
        />

        {isOn('landuse') && layers.landuse && (
          <GeoJSON data={layers.landuse} style={landuseStyle} onEachFeature={onEachLanduse} />
        )}

        {isOn('buildings') && layers.buildings && (
          <GeoJSON data={layers.buildings} style={buildingsStyle} onEachFeature={onEachBuilding} />
        )}

        {isOn('roadNetwork') && layers.roads && (
          <GeoJSON data={layers.roads} style={roadsStyle} onEachFeature={onEachRoad} />
        )}
        {isOn('roadNetwork') && layers.railways && <GeoJSON data={layers.railways} style={railwaysStyle} />}

        {isOn('gn5') && layers.gn5 && (
          <GeoJSON
            key={selectedGnName ?? 'all'}
            data={layers.gn5}
            style={gn5StyleFn}
            onEachFeature={onEachGn5}
          />
        )}
        {isOn('boundary') && layers.boundary && <GeoJSON data={layers.boundary} style={boundaryStyle} />}

        {isOn('pois') &&
          layers.pois &&
          layers.pois.features.map((feature, idx) => {
            if (feature.geometry?.type !== 'Point') return null
            const [lng, lat] = feature.geometry.coordinates
            const label = getPoiLabel(feature.properties ?? {})
            return (
              <Fragment key={feature.id ?? idx}>
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

        {highlightedFeature && (
          <>
            <GeoJSON
              key={`${highlightedRoadName}-glow`}
              data={highlightedFeature}
              style={highlightGlowStyle}
              renderer={highlightRenderer}
            />
            <GeoJSON
              key={`${highlightedRoadName}-line`}
              data={highlightedFeature}
              style={highlightLineStyle}
              renderer={highlightRenderer}
            />
            <FlyToFeature feature={highlightedFeature} />
          </>
        )}

        {showFallbackMarker && (
          <>
            <CircleMarker
              key={`${highlightedRoadName}-marker-glow`}
              center={[highlightedRoadCoords.lat, highlightedRoadCoords.lng]}
              {...highlightMarkerGlowStyle}
              renderer={highlightRenderer}
            />
            <CircleMarker
              key={`${highlightedRoadName}-marker-dot`}
              center={[highlightedRoadCoords.lat, highlightedRoadCoords.lng]}
              {...highlightMarkerDotStyle}
              renderer={highlightRenderer}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                {highlightedRoadName} — not mapped as a road, showing approximate location
              </Tooltip>
            </CircleMarker>
            <FlyToPoint point={highlightedRoadCoords} />
          </>
        )}

        {clickedPosition && (
          <CircleMarker
            center={clickedPosition}
            radius={7}
            color="#ffffff"
            weight={2}
            fillColor="#00b4d8"
            fillOpacity={0.9}
          />
        )}
      </MapContainer>

      {showGnHint && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary-400/50 bg-surface-900/90 px-3.5 py-1.5 text-surface-50 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500/25 text-primary-300">
            <MousePointerClick className="h-3 w-3" aria-hidden />
          </span>
          <p className="whitespace-nowrap text-[11px] font-medium tracking-wide">
            Click a GN division for its stats
          </p>
        </div>
      )}

      <Legend
        activeLayers={activeLayers}
        highlightedRoadName={highlightedFeature || showFallbackMarker ? highlightedRoadName : null}
        selectedGnName={selectedGnName}
      />
      <MapLayerFab
        activeLayers={activeLayers}
        onToggle={onToggleLayer}
        basemapId={basemapId}
        onBasemapChange={setBasemapId}
      />
    </MapFullscreenShell>
  )
}
