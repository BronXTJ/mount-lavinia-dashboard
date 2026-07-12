import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

/**
 * Fits the map to a GeoJSON feature collection once it becomes available.
 * Must render inside a MapContainer.
 */
export default function FitBoundsToGeoJson({ data, padding = [40, 40], maxZoom = 17 }) {
  const map = useMap()
  const fittedRef = useRef(false)

  useEffect(() => {
    if (!data || fittedRef.current) return

    const layer = L.geoJSON(data)
    const bounds = layer.getBounds()
    if (!bounds.isValid()) return

    fittedRef.current = true
    map.fitBounds(bounds, { padding, maxZoom, animate: false })
  }, [data, map, padding, maxZoom])

  return null
}
