import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * First-session coach mark anchored above the pencil toolbar button.
 * No focus trap, no Esc capture, no body scroll lock.
 */
export default function WhatIfPencilCoachMark({ anchorRef, title, body, onDismiss }) {
  const titleId = useId()
  const rootRef = useRef(null)

  useEffect(() => {
    function onPointerDown(event) {
      const anchor = anchorRef?.current
      const root = rootRef.current
      if (!root) return
      if (root.contains(event.target)) return
      if (anchor?.contains(event.target)) return
      onDismiss?.()
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [anchorRef, onDismiss])

  if (!title && !body) return null

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="pointer-events-auto absolute bottom-full left-1/2 z-[1100] mb-1.5 w-max max-w-[12rem] -translate-x-1/2 rounded-md border border-primary-500/40 bg-surface-900 px-2 py-1.5 shadow-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p id={titleId} className="text-[11px] font-semibold text-primary-300">
            {title}
          </p>
          {body ? (
            <p className="mt-1 text-[10px] leading-snug text-surface-200">{body}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss coach mark"
          className="shrink-0 rounded p-0.5 text-surface-400 hover:text-surface-100"
        >
          <X size={14} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      <div
        className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-primary-500/40 bg-surface-900"
        aria-hidden
      />
    </div>
  )
}
