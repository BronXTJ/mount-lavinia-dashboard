import { useEffect, useRef, useState } from 'react'
import { Layers, X } from 'lucide-react'
import L from 'leaflet'
import { LC_EPOCHS, LC_LAYER_MODES } from '../../constants/landCover.js'

/** Map FAB — layer mode, epoch, and GN boundary toggle. */
export default function LandCoverMapLayerFab({
  layerMode,
  epochId,
  showGnBoundaries,
  onLayerModeChange,
  onEpochChange,
  onToggleGnBoundaries,
}) {
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
          className="density-fab-panel-enter w-[260px] overflow-hidden rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          style={{ backgroundColor: '#1e293b' }}
        >
          <p
            className="px-4 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.1em]"
            style={{ color: '#94a3b8' }}
          >
            Map Layers
          </p>
          <div className="mx-0 border-t" style={{ borderColor: '#2a3a4a' }} />

          <div className="px-4 py-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
              Layer mode
            </p>
            <div className="flex flex-col gap-1">
              {LC_LAYER_MODES.map((mode) => {
                const active = layerMode === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onLayerModeChange(mode.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-white/[0.05]"
                    style={{
                      backgroundColor: active ? 'rgba(0,180,216,0.12)' : 'transparent',
                    }}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: mode.dot }}
                      aria-hidden
                    />
                    <span className="text-[13px] text-surface-100">{mode.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {layerMode === 'classified' && (
            <>
              <div className="mx-0 border-t" style={{ borderColor: '#2a3a4a' }} />
              <div className="px-4 py-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
                  Epoch
                </p>
                <div className="flex gap-1">
                  {LC_EPOCHS.map((ep) => {
                    const active = epochId === ep.id
                    return (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => onEpochChange(ep.id)}
                        className="flex-1 rounded-md px-2 py-1.5 text-center text-[12px] font-medium"
                        style={{
                          backgroundColor: active ? '#00b4d8' : 'rgba(255,255,255,0.06)',
                          color: active ? '#0f172a' : '#e2e8f0',
                        }}
                      >
                        {ep.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div className="mx-0 border-t" style={{ borderColor: '#2a3a4a' }} />
          <button
            type="button"
            role="switch"
            aria-checked={showGnBoundaries}
            onClick={() => onToggleGnBoundaries(!showGnBoundaries)}
            className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/[0.05]"
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: '#00b4d8' }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-[13px] text-surface-100">GN boundaries</span>
            <span
              className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
              style={{ backgroundColor: showGnBoundaries ? '#00b4d8' : '#475569' }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                style={{ left: showGnBoundaries ? 16 : 2 }}
              />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
