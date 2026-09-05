import { MapContainer, TileLayer } from 'react-leaflet'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'
import { getCartoDarkTileUrl } from '../../constants/basemaps.js'
import { CENTRALITY_MAP_CENTER, CENTRALITY_MAP_ZOOM } from '../../constants/centrality.js'

/** Base OSM map with a centred overlay message — used for placeholder sub-sections. */
export default function PlaceholderMap({ message }) {
  return (
    <div className="relative h-full min-h-0">
      <MapContainer
        center={CENTRALITY_MAP_CENTER}
        zoom={CENTRALITY_MAP_ZOOM}
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
      </MapContainer>
      <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-surface-900/50 p-6">
        <p className="max-w-md rounded-lg border border-surface-700 bg-surface-800 px-6 py-4 text-center text-sm font-medium text-surface-100 shadow-card">
          {message}
        </p>
      </div>
    </div>
  )
}
