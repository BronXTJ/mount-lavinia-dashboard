import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { Maximize2, X } from 'lucide-react'

const FullscreenShellContext = createContext(null)

/** True when the nearest fullscreen shell is expanded. */
export function useMapFullscreen() {
  const ctx = useContext(FullscreenShellContext)
  return Boolean(ctx?.expanded)
}

/** Open / close controls for a parent-rendered enlarge button. */
export function useFullscreenShell() {
  return useContext(FullscreenShellContext)
}

export const fullscreenShellBtnClass =
  'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg border border-surface-700 bg-surface-850/95 text-surface-100 shadow-card backdrop-blur transition hover:bg-surface-800 hover:text-white'

/** Header or toolbar enlarge control — pair with `showFloatingEnlarge={false}`. */
export function FullscreenEnlargeButton({
  className = '',
  label = 'Enlarge',
  title = label,
}) {
  const shell = useFullscreenShell()
  if (!shell || shell.expanded) return null

  return (
    <button
      type="button"
      className={`${fullscreenShellBtnClass} ${className}`.trim()}
      aria-label={label}
      title={title}
      onClick={shell.open}
    >
      <Maximize2 className="h-4 w-4" aria-hidden />
    </button>
  )
}

/** Header close control — pair with `showFloatingClose={false}`. */
export function FullscreenCloseButton({
  className = '',
  label = 'Close',
  title = label,
}) {
  const shell = useFullscreenShell()
  if (!shell?.expanded) return null

  return (
    <button
      type="button"
      className={`${fullscreenShellBtnClass} ${className}`.trim()}
      aria-label={label}
      title={title}
      onClick={shell.close}
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  )
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

/**
 * Keeps content in layout while allowing a fixed full-viewport enlarge mode.
 * Maps reuse the same Leaflet instance so pan/zoom are preserved.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] — applied to the outer in-flow wrapper
 * @param {string} [props.innerClassName] — extra classes on the surface when collapsed
 * @param {string} [props.expandedInnerClassName] — extra classes when enlarged (panel chrome / flex column)
 * @param {boolean} [props.trackDocumentFullscreen] — set html[data-map-fullscreen] (maps only)
 * @param {boolean} [props.showFloatingEnlarge] — built-in map enlarge button
 * @param {boolean} [props.showFloatingClose] — built-in top-right close (maps); false when header owns close
 * @param {string} [props.enlargeButtonClassName]
 * @param {string} [props.enlargeLabel]
 * @param {string} [props.closeLabel]
 */
export default function MapFullscreenShell({
  children,
  className = '',
  innerClassName = '',
  expandedInnerClassName = '',
  trackDocumentFullscreen = true,
  showFloatingEnlarge = true,
  showFloatingClose = true,
  enlargeButtonClassName = 'map-enlarge-btn',
  enlargeLabel = 'Enlarge map',
  closeLabel = 'Close full map',
}) {
  const [expanded, setExpanded] = useState(false)

  function openExpanded() {
    if (trackDocumentFullscreen) setMapFullscreenFlag(true)
    setExpanded(true)
  }

  function closeExpanded() {
    setExpanded(false)
    if (trackDocumentFullscreen) setMapFullscreenFlag(false)
  }

  useEffect(() => {
    if (!expanded) return undefined

    if (trackDocumentFullscreen) setMapFullscreenFlag(true)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [expanded, trackDocumentFullscreen])

  useEffect(() => {
    if (!trackDocumentFullscreen) return undefined
    return () => {
      setMapFullscreenFlag(false)
    }
  }, [trackDocumentFullscreen])

  const shellValue = { expanded, open: openExpanded, close: closeExpanded }

  return (
    <FullscreenShellContext.Provider value={shellValue}>
      <div className={`relative h-full w-full ${className}`.trim()}>
        <div
          className={
            expanded
              ? `fixed inset-y-0 right-0 z-[2500] isolate h-full min-h-0 overflow-hidden bg-surface-950 ${expandedInnerClassName}`.trim()
              : `absolute inset-0 overflow-hidden ${innerClassName}`.trim()
          }
          style={
            expanded
              ? { left: 'var(--app-sidebar-width, 0px)' }
              : undefined
          }
        >
          {children}

          {expanded && showFloatingClose ? (
            <button
              type="button"
              className={`${fullscreenShellBtnClass} absolute right-4 top-4 z-[2100]`}
              aria-label={closeLabel}
              title={closeLabel}
              onClick={closeExpanded}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
          {!expanded && showFloatingEnlarge ? (
            <button
              type="button"
              className={`${fullscreenShellBtnClass} ${enlargeButtonClassName} absolute z-[1000]`}
              aria-label={enlargeLabel}
              title={enlargeLabel}
              onClick={openExpanded}
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </FullscreenShellContext.Provider>
  )
}
