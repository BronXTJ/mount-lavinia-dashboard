import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import MapInvalidateOnResize from '../../../components/MapInvalidateOnResize.jsx'
import MapFullscreenShell, { useMapFullscreen } from '../../../components/MapFullscreenShell.jsx'
import { getCartoDarkTileUrl } from '../../../constants/basemaps.js'
import { escapeHtml } from '../../../utils/escapeHtml.js'
import { fetchJsonOrNull } from '../../../lib/dataClient.js'
import { junctions } from '../data/junctions'
import { JUNCTION_COLORS, STUDY_BOUNDARY_COLOR } from '../data/colors'
import {
  allJunctionVolumes,
  markerRadius,
  vehicleTypeBreakdown,
} from '../utils/aggregations'

function geoUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/geo/${fileName}`
}

const MAP_CENTER = [6.836, 79.866]
const MAP_ZOOM = 15
const SELECTED_ZOOM = 16

const gnLabelOptions = {
  permanent: true,
  direction: 'top',
  offset: [0, -10],
  className: 'gn-label',
  interactive: false,
}

function RoadLabelsToggle({ showRoadLabels, onChange }) {
  const fullscreen = useMapFullscreen()
  return (
    <div
      className={`absolute top-3 z-[1000] rounded-lg border border-surface-700 bg-surface-900/95 p-3 shadow-card backdrop-blur ${
        fullscreen ? 'right-16' : 'right-3'
      }`}
    >
      <label className="flex cursor-pointer items-center gap-2 text-sm text-surface-100">
        <input
          type="checkbox"
          checked={showRoadLabels}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[#dc2626]"
        />
        Road Labels
      </label>
    </div>
  )
}

/** Fly map to the selected junction when selection changes. */
function FlyToSelected({ selectedJunctionId }) {
  const map = useMap()

  useEffect(() => {
    const j = junctions.find((x) => x.id === selectedJunctionId)
    if (!j) return
    map.flyTo([j.lat, j.lng], SELECTED_ZOOM, { duration: 0.6 })
  }, [map, selectedJunctionId])

  return null
}

export default function JunctionMap({
  dayFilter,
  periodFilter,
  selectedJunctionId,
  onSelect,
}) {
  const [boundary, setBoundary] = useState(null)
  const [galleRoad, setGalleRoad] = useState(null)
  const [namedRoads, setNamedRoads] = useState(null)
  const [showRoadLabels, setShowRoadLabels] = useState(false)

  const volumes = useMemo(
    () => allJunctionVolumes(dayFilter, periodFilter),
    [dayFilter, periodFilter],
  )
  const volumeList = volumes.map((v) => v.vehicles)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchJsonOrNull(geoUrl('study_area_boundary.geojson'))
        if (!cancelled && data) setBoundary(data)
      } catch {
        /* skip silently */
      }

      try {
        const roads = await fetchJsonOrNull(geoUrl('roads.geojson'))
        if (!roads) return
        const allFeatures = roads.features || []

        const galleFeatures = allFeatures.filter(
          (f) => String(f.properties?.name || '').toLowerCase() === 'galle road',
        )
        const named = allFeatures.filter(
          (f) => String(f.properties?.name || '').trim().length > 0,
        )

        if (!cancelled) {
          if (galleFeatures.length > 0) {
            setGalleRoad({ type: 'FeatureCollection', features: galleFeatures })
          }
          if (named.length > 0) {
            setNamedRoads({ type: 'FeatureCollection', features: named })
          }
        }
      } catch {
        /* skip silently */
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <MapFullscreenShell className="min-h-[320px]" innerClassName="rounded-lg border border-surface-700">
      <RoadLabelsToggle
        showRoadLabels={showRoadLabels}
        onChange={setShowRoadLabels}
      />

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <MapInvalidateOnResize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={getCartoDarkTileUrl()}
          subdomains="abcd"
          maxZoom={19}
        />

        <FlyToSelected selectedJunctionId={selectedJunctionId} />

        {boundary && (
          <GeoJSON
            data={boundary}
            style={{
              color: STUDY_BOUNDARY_COLOR,
              weight: 2,
              fillOpacity: 0,
              opacity: 0.95,
            }}
          />
        )}

        {galleRoad && (
          <GeoJSON
            key="galle-road"
            data={galleRoad}
            style={{ color: '#e0e0e0', weight: 3, opacity: 0.55 }}
          />
        )}

        {showRoadLabels && namedRoads && (
          <GeoJSON
            key="road-labels"
            data={namedRoads}
            style={{ weight: 0, opacity: 0, fill: false }}
            onEachFeature={(feature, layer) => {
              if (feature.properties?.name) {
                layer.bindTooltip(escapeHtml(feature.properties.name), {
                  permanent: true,
                  direction: 'center',
                  className: 'behaviour-road-label',
                })
              }
            }}
          />
        )}

        {junctions.map((j) => {
          const vol = volumes.find((v) => v.junctionId === j.id)
          const vehicles = vol?.vehicles ?? 0
          const pedestrians = vol?.pedestrians ?? 0
          const radius = markerRadius(vehicles, volumeList)
          const color = JUNCTION_COLORS[j.id]
          const selected = selectedJunctionId === j.id
          const { dominantType } = vehicleTypeBreakdown(j.id, dayFilter, periodFilter)
          const shortLabel = j.name.split('—')[0].trim()

          return (
            <Fragment key={j.id}>
              {selected && (
                <>
                  <CircleMarker
                    center={[j.lat, j.lng]}
                    radius={radius + 8}
                    pathOptions={{
                      color,
                      weight: 3,
                      opacity: 0.9,
                      fillOpacity: 0,
                      className: 'poi-pulse-ring',
                    }}
                    interactive={false}
                  />
                  <CircleMarker
                    center={[j.lat, j.lng]}
                    radius={radius + 14}
                    pathOptions={{
                      color,
                      weight: 2.5,
                      opacity: 0.7,
                      fillOpacity: 0,
                      className: 'poi-pulse-ring-delay',
                    }}
                    interactive={false}
                  />
                </>
              )}
              <CircleMarker
                center={[j.lat, j.lng]}
                radius={radius}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.85,
                }}
                eventHandlers={{
                  click: () => onSelect(j.id),
                }}
              >
                <Tooltip {...gnLabelOptions}>{shortLabel}</Tooltip>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{j.name}</p>
                    <p>Vehicles: {vehicles.toLocaleString('en-US')}</p>
                    <p>Pedestrians: {pedestrians.toLocaleString('en-US')}</p>
                    <p>Dominant: {dominantType}</p>
                  </div>
                </Popup>
              </CircleMarker>
            </Fragment>
          )
        })}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] max-w-[240px] rounded-lg border border-surface-700 bg-surface-850/95 p-3.5 text-xs shadow-card backdrop-blur">
        <p className="mb-2.5 font-display text-sm font-semibold text-surface-50">
          Junction Traffic Volume
        </p>
        <ul className="space-y-2">
          {junctions.map((j) => (
            <li key={j.id} className="flex items-center gap-2 text-surface-100">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: JUNCTION_COLORS[j.id] }}
              />
              <span className="truncate">
                J{j.id} — {j.name.split('—')[0].trim()}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2 text-surface-100">
            <span
              className="inline-block h-0 w-4 border-t-2"
              style={{ borderColor: STUDY_BOUNDARY_COLOR }}
              aria-hidden
            />
            Primary Study Area Boundary
          </li>
        </ul>
        <p className="mt-2.5 border-t border-surface-700 pt-2 text-xs text-surface-200">
          Circle size = relative traffic volume
        </p>
      </div>
    </MapFullscreenShell>
  )
}
