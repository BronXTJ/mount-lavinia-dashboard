import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { Maximize2, X } from 'lucide-react'

const MapFullscreenContext = createContext(false)

/** True when the nearest MapFullscreenShell is expanded to the viewport. */
export function useMapFullscreen() {
  return useContext(MapFullscreenContext)
}

const mapFullscreenListeners = new Set()

function emitMapFullscreenChange() {
  window.dispatchEvent(new Event('map-fullscreen-change'))
  mapFullscreenListeners.forEach((listener) => listener())
}

/** Sync document flag so CSS + panels outside the map tree can react before paint. */
function setMapFullscreenFlag(on) {
  if (on) document.documentElement.dataset.mapFullscreen = 'true'
  else delete document.documentElement.dataset.mapFullscreen
  emitMapFullscreenChange()
}

function subscribeMapFullscreen(listener) {
  mapFullscreenListeners.add(listener)
  return () => mapFullscreenListeners.delete(listener)
}

function getMapFullscreenSnapshot() {
  return document.documentElement.dataset.mapFullscreen === 'true'
}

/** True while any map shell is viewport-enlarged (works outside the shell tree). */
export function useDocumentMapFullscreen() {
  return useSyncExternalStore(subscribeMapFullscreen, getMapFullscreenSnapshot, () => false)
}

const btnClass =
  'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg border border-surface-700 bg-surface-850/95 text-surface-100 shadow-card backdrop-blur transition hover:bg-surface-800 hover:text-white'

/**
 * Keeps the map in layout while allowing a fixed full-viewport enlarge mode.
 * Same Leaflet instance is reused so pan/zoom are preserved.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] — applied to the outer in-flow wrapper
 * @param {string} [props.innerClassName] — extra classes on the map surface (e.g. rounded border when collapsed)
 */
export default function MapFullscreenShell({ children, className = '', innerClassName = '' }) {
  const [expanded, setExpanded] = useState(false)

  function openExpanded() {
    setMapFullscreenFlag(true)
    setExpanded(true)
  }

  function closeExpanded() {
    setExpanded(false)
    setMapFullscreenFlag(false)
  }

  useEffect(() => {
    if (!expanded) return undefined

    // Re-assert after Strict Mode remount so CSS hide rules stay active.
    setMapFullscreenFlag(true)

    // Esc must NOT close enlarge — What-if drawing uses Esc; close only via X.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [expanded])

  useEffect(() => {
    return () => {
      setMapFullscreenFlag(false)
    }
  }, [])

  return (
    <MapFullscreenContext.Provider value={expanded}>
      <div className={`relative h-full w-full ${className}`.trim()}>
        <div
          className={
            expanded
              ? 'fixed bottom-0 right-0 top-0 z-[2500] isolate bg-surface-950'
              : `absolute inset-0 overflow-hidden ${innerClassName}`.trim()
          }
          style={
            expanded
              ? { left: 'var(--app-sidebar-width, 0px)' }
              : undefined
          }
        >
          {children}

          {expanded ? (
            <button
              type="button"
              className={`${btnClass} absolute right-4 top-4 z-[2100]`}
              aria-label="Close full map"
              title="Close full map"
              onClick={closeExpanded}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              className={`${btnClass} map-enlarge-btn absolute z-[1000]`}
              aria-label="Enlarge map"
              title="Enlarge map"
              onClick={openExpanded}
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </MapFullscreenContext.Provider>
  )
}
