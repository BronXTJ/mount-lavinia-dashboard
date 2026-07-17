import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import gnDivisionStatsData from '../data/gnDivisionStats.json'

const ALL_OPTION = { value: null, label: 'All GN Divisions' }

const OPTIONS = [
  ALL_OPTION,
  ...gnDivisionStatsData.map((d) => ({ value: d.name, label: d.name })),
]

/**
 * Compact GN division picker — "All GN Divisions" plus the five study-area GNs.
 * Synced via value / onChange with map selection in Tab1_Overview.
 * When emphasized (default), the closed trigger uses a primary callout style
 * so the control is easy to find on Overview.
 */
export default function GnDivisionSelect({
  value = null,
  onChange,
  id,
  className = '',
  emphasized = true,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listId = useId()
  const triggerId = id ?? listId

  const selectedLabel =
    OPTIONS.find((o) => o.value === value)?.label ?? ALL_OPTION.label

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

  function pick(nextValue) {
    onChange?.(nextValue)
    setOpen(false)
  }

  const closedClass = emphasized
    ? 'border-primary-400/70 bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/45 hover:border-primary-400 hover:bg-primary-500/25'
    : 'border-surface-700 bg-surface-800 text-surface-100 hover:border-surface-400 hover:bg-surface-700'

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={triggerId}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label="Select GN division"
        className={`inline-flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition ${
          open
            ? 'border-primary-400/60 bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/45'
            : closedClass
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${
            open || emphasized ? 'text-primary-300' : 'text-surface-300'
          } ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="GN divisions"
          className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-md border border-primary-500/35 bg-surface-900 py-1 shadow-card ring-1 ring-primary-500/25"
        >
          {OPTIONS.map((opt) => {
            const active = opt.value === value
            const key = opt.value ?? '__all__'
            return (
              <li key={key} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(opt.value)}
                  className={`flex w-full px-2.5 py-1.5 text-left text-xs transition ${
                    active
                      ? 'bg-primary-500/20 font-semibold text-primary-300'
                      : 'text-surface-100 hover:bg-surface-800'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
