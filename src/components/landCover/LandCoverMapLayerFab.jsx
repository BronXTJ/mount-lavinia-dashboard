import { useEffect, useRef, useState } from 'react'
import { Layers, X } from 'lucide-react'
import L from 'leaflet'
import { LC_BASEMAPS, LC_EPOCHS, LC_FAB_LAYERS } from '../../constants/landCover.js'

/** Map FAB — Environmental-style on/off switches for overlays + GN boundaries. */
export default function LandCoverMapLayerFab({
  visibleLayers,
  epochId,
  basemapId,
  onToggle,
  onEpochChange,
  onBasemapChange,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const classifiedOn = Boolean(visibleLayers?.classified)

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

  const overlayLayers = LC_FAB_LAYERS.filter((l) => l.group === 'overlay')
  const independentLayers = LC_FAB_LAYERS.filter((l) => l.group === 'independent')

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

          <div className="py-1">
            {overlayLayers.map((layer) => {
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
                  <span className="min-w-0 flex-1 text-[13px] leading-snug text-[#e0e0e0]">
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

          {classifiedOn && (
            <>
              <div className="mx-0 border-t" style={{ borderColor: '#2a3a4a' }} />
              <div className="px-4 py-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
                  Landsat epoch
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
          <div className="px-4 py-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
              Basemap
            </p>
            <div className="flex gap-1">
              {LC_BASEMAPS.map((bm) => {
                const active = basemapId === bm.id
                return (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() => onBasemapChange(bm.id)}
                    className="flex-1 rounded-md px-2 py-1.5 text-center text-[12px] font-medium"
                    style={{
                      backgroundColor: active ? '#00b4d8' : 'rgba(255,255,255,0.06)',
                      color: active ? '#0f172a' : '#e2e8f0',
                    }}
                  >
                    {bm.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] leading-snug text-surface-500">
              Satellite shows present-day ground. Turn off Classified / Change overlays for a clear
              photo view.
            </p>
          </div>

          <div className="mx-0 border-t" style={{ borderColor: '#2a3a4a' }} />
          <div className="py-1">
            {independentLayers.map((layer) => {
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
                  <span className="min-w-0 flex-1 text-[13px] leading-snug text-[#e0e0e0]">
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
