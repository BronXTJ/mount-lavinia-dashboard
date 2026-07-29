import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const OPTIONS = [
  { value: 'all', label: 'All GN Divisions' },
  { value: 'mount-lavinia', label: 'Mount Lavinia' },
]

/**
 * Compact scope picker for Road Rankings — All GN Divisions + Mount Lavinia.
 * Same chrome language as GnDivisionSelect (emphasized callout when closed).
 */
export default function RoadRankingsScopeSelect({
  value = 'all',
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
    OPTIONS.find((o) => o.value === value)?.label ?? OPTIONS[0].label

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
        aria-label="Select road rankings scope"
        className={`inline-flex w-full min-w-[9.5rem] items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition ${
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
          aria-label="Road rankings scope"
          className="absolute right-0 z-40 mt-1 min-w-full overflow-y-auto rounded-md border border-primary-500/35 bg-surface-900 py-1 shadow-card ring-1 ring-primary-500/25"
        >
          {OPTIONS.map((opt) => {
            const active = opt.value === value
            return (
              <li key={opt.value} role="presentation">
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
