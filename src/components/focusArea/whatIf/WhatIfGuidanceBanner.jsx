import { X } from 'lucide-react'

/**
 * Compact non-blocking tip pill above the What-if draw toolbar.
 * Sized to content so it stays in the toolbar column and does not cover the legend.
 */
export default function WhatIfGuidanceBanner({
  title,
  body,
  assertive = false,
  showWelcomeCheckbox = false,
  onDismissStep,
  onDismissSession,
  onMarkCompleted,
}) {
  if (!title && !body) return null

  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      className="pointer-events-none w-fit max-w-full rounded-md border border-surface-600 bg-surface-900/95 px-2 py-1 shadow-card backdrop-blur"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-2">
        <p className="min-w-0 truncate text-[11px] leading-tight text-surface-200">
          {title ? <span className="font-semibold text-surface-50">{title}</span> : null}
          {title && body ? <span className="text-surface-500"> — </span> : null}
          {body ? <span>{body}</span> : null}
        </p>

        {showWelcomeCheckbox ? (
          <button
            type="button"
            onClick={onMarkCompleted}
            className="shrink-0 text-[10px] text-surface-400 hover:text-surface-200 hover:underline"
          >
            Skip later
          </button>
        ) : null}

        <button
          type="button"
          onClick={onDismissSession}
          className="shrink-0 text-[10px] text-surface-400 hover:text-surface-200 hover:underline"
        >
          Hide
        </button>

        <button
          type="button"
          onClick={onDismissStep}
          aria-label="Dismiss tip"
          className="shrink-0 rounded p-0.5 text-surface-400 transition hover:bg-surface-700 hover:text-surface-100"
        >
          <X size={12} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  )
}
