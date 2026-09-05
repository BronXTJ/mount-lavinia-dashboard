import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { getCartoDarkTileUrl } from '../../constants/basemaps.js'
import { CENTRALITY_MAP_CENTER, CENTRALITY_MAP_ZOOM } from '../../constants/centrality.js'
import { buildExportGeoJsonStyler } from '../../utils/exportGeoJsonStyle.js'
import FitBoundsToGeoJson from '../focusArea/FitBoundsToGeoJson.jsx'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'

export default function ExportGeoJsonPreview({ url, itemId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load GeoJSON (${response.status})`)
        return response.json()
      })
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load GeoJSON')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [url])

  const styler = useMemo(() => (data ? buildExportGeoJsonStyler(data, itemId) : null), [data, itemId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] max-h-[70vh] items-center justify-center rounded-lg border border-surface-700 bg-surface-900">
        <p className="text-sm text-surface-300">Loading map…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] max-h-[70vh] items-center justify-center rounded-lg border border-surface-700 bg-surface-900 p-6">
        <p className="text-center text-sm text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] max-h-[70vh] flex-col gap-2">
      <p className="text-xs text-surface-400">
        Simplified interactive view of the downloadable layer
      </p>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-surface-700">
        <MapContainer
          center={CENTRALITY_MAP_CENTER}
          zoom={CENTRALITY_MAP_ZOOM}
          className="h-full min-h-[48vh] w-full"
          scrollWheelZoom
        >
          <MapInvalidateOnResize />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={getCartoDarkTileUrl()}
            subdomains="abcd"
            maxZoom={19}
          />
          <GeoJSON
            key={url}
            data={data}
            style={styler.style}
            pointToLayer={(feature, latlng) => L.circleMarker(latlng, styler.pointStyle(feature))}
          />
          <FitBoundsToGeoJson data={data} />
        </MapContainer>
      </div>
    </div>
  )
}
