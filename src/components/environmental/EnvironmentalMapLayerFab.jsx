import { useEffect, useRef, useState } from 'react'
import { Layers, X } from 'lucide-react'
import L from 'leaflet'
import { ENV_FAB_LAYERS } from '../../constants/environmental.js'
import BasemapChips from '../BasemapChips.jsx'

/** Environmental Analysis map FAB — reliable switch rows + Leaflet DomEvent isolation. */
export default function EnvironmentalMapLayerFab({ visibleLayers, onToggle, basemapId, onBasemapChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    L.DomEvent.disableClickPropagation(el)
    L.DomEvent.disableScrollPropagation(el)
  }, [])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto absolute top-4 right-4 z-[2000] flex flex-col items-end gap-2.5"
    >
      <span className="relative flex h-12 w-12 items-center justify-center">
        {!open && (
          <>
            <span
              className="density-fab-pulse absolute inset-0 rounded-full"
              style={{ backgroundColor: '#00b4d8' }}
              aria-hidden="true"
            />
            <span
              className="density-fab-pulse-delay absolute inset-0 rounded-full"
              style={{ backgroundColor: '#00b4d8' }}
              aria-hidden="true"
            />
          </>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle map layers panel"
          aria-expanded={open}
          className="relative flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: '#00b4d8',
            boxShadow: '0 4px 16px rgba(0,180,216,0.4)',
          }}
        >
          {open ? <X size={22} strokeWidth={2.25} /> : <Layers size={22} strokeWidth={2.25} />}
        </button>
      </span>

      {open && (
        <div
          className="density-fab-panel-enter w-[240px] overflow-hidden rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          style={{ backgroundColor: '#1e293b' }}
        >
          <p
            className="px-4 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.1em]"
            style={{ color: '#94a3b8' }}
          >
            Map Layers
          </p>
          <div className="mx-0 border-t" style={{ borderColor: '#2a3a4a' }} />
          <BasemapChips basemapId={basemapId} onBasemapChange={onBasemapChange} />
          <div className="mx-0 border-t" style={{ borderColor: '#2a3a4a' }} />

          <div className="py-1">
            {ENV_FAB_LAYERS.map((layer) => {
              const checked = Boolean(visibleLayers?.[layer.id])
              return (
                <button
                  key={layer.id}
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={layer.label}
                  onClick={() => onToggle(layer.id, !checked)}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/[0.05]"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: layer.dot }}
                    aria-hidden="true"
                  />
                  <span
                    className="min-w-0 flex-1 text-[13px] leading-snug"
                    style={{ color: '#e0e0e0' }}
                  >
                    {layer.label}
                  </span>
                  <span
                    className="relative inline-flex h-[22px] w-10 shrink-0 items-center"
                    aria-hidden="true"
                  >
                    <span
                      className="absolute inset-0 rounded-[11px] transition-colors duration-200"
                      style={{ backgroundColor: checked ? '#00b4d8' : '#334155' }}
                    />
                    <span
                      className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-transform duration-200"
                      style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }}
                    />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
