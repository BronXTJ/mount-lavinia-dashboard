import { useCallback, useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { Popup, useMap, useMapEvents } from 'react-leaflet'
import { useClipboardToast } from '../ClipboardToastProvider.jsx'
import { formatMapCoordinates } from '../../utils/formatMapCoordinates.js'

/**
 * Right-click map → coordinate popup with copy. Must render inside MapContainer.
 */
export default function MapContextMenuCoordinates() {
  const map = useMap()
  const { showClipboardToast } = useClipboardToast()
  const [anchor, setAnchor] = useState(null)

  const clearAnchor = useCallback(() => setAnchor(null), [])

  const openAtLatLng = useCallback((latlng) => {
    if (!latlng) return
    setAnchor({ lat: latlng.lat, lng: latlng.lng })
  }, [])

  const copyCoordinates = useCallback(
    async (lat, lng) => {
      const text = formatMapCoordinates(lat, lng)
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
        showClipboardToast()
      } catch {
        // clipboard denied or unavailable
      }
    },
    [showClipboardToast],
  )

  useMapEvents({
    contextmenu(e) {
      e.originalEvent.preventDefault()
      openAtLatLng(e.latlng)
    },
    click() {
      clearAnchor()
    },
  })

  useEffect(() => {
    const container = map.getContainer()

    const onContainerContextMenu = (domEvent) => {
      domEvent.preventDefault()
      const latlng = map.mouseEventToLatLng(domEvent)
      openAtLatLng(latlng)
    }

    container.addEventListener('contextmenu', onContainerContextMenu, true)

    map.on('movestart', clearAnchor)
    map.on('zoomstart', clearAnchor)

    return () => {
      container.removeEventListener('contextmenu', onContainerContextMenu, true)
      map.off('movestart', clearAnchor)
      map.off('zoomstart', clearAnchor)
    }
  }, [map, clearAnchor, openAtLatLng])

  if (!anchor) return null

  const label = formatMapCoordinates(anchor.lat, anchor.lng)

  return (
    <Popup
      position={anchor}
      closeButton={false}
      autoPan
      className="map-coords-popup"
    >
      <div className="flex items-center gap-2 pr-1">
        <button
          type="button"
          className="font-mono text-xs text-surface-100 hover:text-white"
          onClick={() => void copyCoordinates(anchor.lat, anchor.lng)}
        >
          {label}
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-surface-600 bg-surface-800 text-surface-200 transition hover:bg-surface-700 hover:text-white"
          aria-label="Copy coordinates"
          title="Copy coordinates"
          onClick={() => void copyCoordinates(anchor.lat, anchor.lng)}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </Popup>
  )
}
