import { Pencil, RotateCcw, X } from 'lucide-react'
import { COMPARE_SLOT_COLORS, COMPARE_SLOT_STATUS } from '../../../../constants/whatIfCompare.js'

function statusLabel(status) {
  switch (status) {
    case COMPARE_SLOT_STATUS.drawing:
      return 'Drawing'
    case COMPARE_SLOT_STATUS.waiting:
      return 'Waiting…'
    case COMPARE_SLOT_STATUS.computing:
      return 'Working it out…'
    case COMPARE_SLOT_STATUS.ready:
      return 'Ready'
    case COMPARE_SLOT_STATUS.error:
      return 'Couldn’t finish'
    default:
      return 'Empty'
  }
}

export default function WhatIfCompareOptionCard({
  slot,
  selected,
  onSelect,
  onRedraw,
  onRemove,
  onRetry,
  onNameChange,
  allowRemove = false,
}) {
  const color = COMPARE_SLOT_COLORS[slot.id]
  const linkCount = slot.links?.length ?? 0
  const empty = slot.status === COMPARE_SLOT_STATUS.empty && linkCount === 0

  return (
    <button
      type="button"
      onClick={() => onSelect?.(slot.id)}
      aria-pressed={selected}
      className={[
        'flex min-w-[10.5rem] flex-1 flex-col gap-1.5 rounded-lg border px-3 py-2 text-left transition',
        selected
          ? 'border-primary-500 bg-surface-800 ring-1 ring-primary-500/40'
          : 'border-surface-700 bg-surface-850/80 hover:border-surface-500',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-bold text-white"
            style={{ backgroundColor: color.line }}
          >
            {color.label}
          </span>
          <span className="text-xs font-semibold text-surface-50">Option {slot.id}</span>
        </span>
        <span className="text-[10px] uppercase tracking-wide text-surface-400">{statusLabel(slot.status)}</span>
      </div>

      <input
        type="text"
        value={slot.name ?? ''}
        placeholder="Optional name"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onNameChange?.(slot.id, e.target.value)}
        className="w-full rounded border border-surface-700 bg-surface-900 px-1.5 py-0.5 text-[11px] text-surface-100 placeholder:text-surface-500"
      />

      <p className="text-[11px] text-surface-300">
        {empty ? 'No links yet' : `${linkCount} link${linkCount === 1 ? '' : 's'}`}
      </p>

      {slot.error ? <p className="text-[10px] leading-snug text-rose-300">{slot.error}</p> : null}

      <div className="mt-auto flex flex-wrap gap-1 pt-1">
        {slot.status === COMPARE_SLOT_STATUS.error ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onRetry?.(slot.id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                onRetry?.(slot.id)
              }
            }}
            className="rounded border border-amber-500/60 px-1.5 py-0.5 text-[10px] text-amber-200 hover:bg-amber-500/15"
          >
            Try again
          </span>
        ) : null}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onRedraw?.(slot.id)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation()
              onRedraw?.(slot.id)
            }
          }}
          className="inline-flex items-center gap-0.5 rounded border border-surface-600 px-1.5 py-0.5 text-[10px] text-surface-200 hover:bg-surface-700"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Redraw
        </span>
        {allowRemove ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onRemove?.(slot.id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                onRemove?.(slot.id)
              }
            }}
            className="inline-flex items-center gap-0.5 rounded border border-rose-500/50 px-1.5 py-0.5 text-[10px] text-rose-300 hover:bg-rose-500/15"
          >
            <X className="h-3 w-3" aria-hidden />
            Remove
          </span>
        ) : null}
        {empty ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-primary-300">
            <Pencil className="h-3 w-3" aria-hidden />
            Draw this idea
          </span>
        ) : null}
      </div>
    </button>
  )
}
