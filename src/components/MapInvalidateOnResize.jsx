import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

/**
 * Keeps Leaflet in sync when the map container resizes (e.g. sidebar collapse).
 * Must render inside a MapContainer.
 */
export default function MapInvalidateOnResize() {
  const map = useMap()

  useEffect(() => {
    const invalidate = () => {
      map.invalidateSize({ animate: false })
    }

    invalidate()
    const settleTimer = window.setTimeout(invalidate, 260)

    const container = map.getContainer()
    const observer = new ResizeObserver(() => {
      invalidate()
    })
    observer.observe(container)

    return () => {
      window.clearTimeout(settleTimer)
      observer.disconnect()
    }
  }, [map])

  return null
}
