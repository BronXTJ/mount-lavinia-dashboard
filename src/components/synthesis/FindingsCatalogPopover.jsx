import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Lightbulb } from 'lucide-react'
import { DOMAIN_META, SYNTHESIS_ACCENT, findings } from './findingsData.js'

/**
 * Header chip + scrollable catalog of all synthesis findings.
 * Lightbulb pulses when closed; switches "on" when expanded.
 */
export default function FindingsCatalogPopover({ selectedId, onSelect }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function pick(id) {
    onSelect?.(id)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Expand to see all findings"
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ring-1 ${
          open
            ? 'border-[#f59e0b]/80 bg-[#f59e0b]/30 text-[#fbbf24] ring-[#f59e0b]/60 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
            : 'synth-findings-chip-pulse border-[#f59e0b]/55 bg-[#f59e0b]/15 text-[#fbbf24] ring-[#f59e0b]/40 hover:border-[#f59e0b]/80 hover:bg-[#f59e0b]/25 hover:ring-[#f59e0b]/60'
        }`}
      >
        <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
          {!open && (
            <span
              className="synth-findings-bulb-ping absolute inset-0 rounded-full bg-[#f59e0b]/35"
              aria-hidden
            />
          )}
          <Lightbulb
            className={`relative h-4 w-4 transition ${
              open
                ? 'fill-[#fbbf24] text-[#fbbf24] drop-shadow-[0_0_6px_rgba(251,191,36,0.85)]'
                : 'fill-transparent text-[#fbbf24]/80'
            }`}
            aria-hidden
          />
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span>All Findings</span>
          <span className="text-[10px] font-medium text-[#fbbf24]/75">
            {open ? 'Expanded' : 'Expand to see all'}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="All synthesis findings"
          className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,440px)] overflow-hidden rounded-xl border border-[#f59e0b]/35 bg-surface-900 shadow-card ring-1 ring-[#f59e0b]/25"
        >
          <div className="border-b border-surface-700 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-sm font-semibold text-surface-50">All Findings</p>
              <span className="text-[11px] tabular-nums text-surface-400">{findings.length}</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-surface-400">
              Expand list. Pick a finding for details.
            </p>
          </div>
          <ul className="max-h-[min(70vh,520px)] overflow-y-auto py-1.5">
            {findings.map((f) => {
              const active = f.id === selectedId
              const preview = Array.isArray(f.observation) ? f.observation[0] : f.observation
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(f.id)}
                    className={`flex w-full flex-col gap-1 px-4 py-2.5 text-left transition ${
                      active ? 'bg-[#f59e0b]/15' : 'hover:bg-surface-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: active ? SYNTHESIS_ACCENT : '#94a3b8' }}
                      >
                        {f.id}
                      </span>
                      <div className="flex gap-1">
                        {(f.domains ?? []).slice(0, 2).map((d) => (
                          <span
                            key={d}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: DOMAIN_META[d]?.color }}
                            title={DOMAIN_META[d]?.label}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="font-display text-sm font-semibold leading-snug text-surface-50">
                      {f.label}
                    </span>
                    {preview ? (
                      <span className="line-clamp-2 text-[11px] leading-snug text-surface-400">
                        {preview}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
