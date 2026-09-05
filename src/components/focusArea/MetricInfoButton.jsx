import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'

/**
 * Teal info chip — centered modal (default) or anchored popover above the trigger.
 * Modal is portaled to document.body so parent transforms (e.g. toolbar -translate-x-1/2)
 * cannot pin it to the bottom of the map.
 * @param {{
 *   title: string,
 *   points?: string[],
 *   ariaLabel?: string,
 *   pulse?: boolean,
 *   variant?: 'modal' | 'popover',
 *   chipAccent?: 'teal' | 'orange',
 * }} props
 */
export default function MetricInfoButton({
  title,
  points,
  ariaLabel,
  pulse = true,
  variant = 'modal',
  chipAccent = 'teal',
}) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const titleId = useId()
  const rootRef = useRef(null)
  const isPopover = variant === 'popover'

  function requestClose() {
    if (closing) return
    setClosing(true)
  }

  function handleOpen() {
    setClosing(false)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return

    function onKeyDown(event) {
      if (event.key === 'Escape') setClosing(true)
    }

    if (isPopover) {
      function onPointerDown(event) {
        if (rootRef.current && !rootRef.current.contains(event.target)) {
          setClosing(true)
        }
      }
      document.addEventListener('keydown', onKeyDown)
      document.addEventListener('mousedown', onPointerDown)
      return () => {
        document.removeEventListener('keydown', onKeyDown)
        document.removeEventListener('mousedown', onPointerDown)
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, isPopover])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [closing])

  const panelBody = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h4 id={titleId} className="font-display text-[16px] font-bold text-[#e0e0e0]">
          {title}
        </h4>
        <button
          type="button"
          onClick={requestClose}
          aria-label={`Close ${title} info`}
          className="inline-flex cursor-pointer items-center justify-center text-[#94a3b8] transition-colors hover:text-[#e0e0e0]"
        >
          <X size={18} strokeWidth={2.25} />
        </button>
      </div>

      <div className="mt-3 border-t border-[#2a3a4a]" />

      <ul className="mt-4 list-disc space-y-2 pl-5 text-[13px] leading-[1.7] text-[#cbd5e1]">
        {(points ?? []).map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className="mt-4 border-t border-[#2a3a4a] pt-3 text-[12px] text-[#94a3b8]">
        {isPopover ? 'Click outside to close' : 'Click anywhere outside to close'}
      </div>
    </>
  )

  const modalOverlay =
    open && !isPopover
      ? createPortal(
          <div
            className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 ${
              closing ? 'typology-info-overlay-exit' : 'typology-info-overlay-enter'
            }`}
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={requestClose}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={`w-full max-w-[420px] rounded-xl border border-[#2a3a4a] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)] ${
                closing ? 'typology-info-modal-exit' : 'typology-info-modal-enter'
              }`}
              style={{ backgroundColor: '#1a2535' }}
              onClick={(event) => event.stopPropagation()}
            >
              {panelBody}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={isPopover ? 'relative' : undefined}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          if (open) requestClose()
          else handleOpen()
        }}
        aria-label={ariaLabel ?? title}
        aria-expanded={open}
        className={`relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center overflow-visible rounded-full text-white transition-colors ${
          chipAccent === 'orange'
            ? 'bg-orange-500 shadow-[0_0_0_2px_rgba(249,115,22,0.35)] hover:bg-orange-400'
            : 'bg-[#00b4d8] shadow-[0_0_0_2px_rgba(0,180,216,0.35)] hover:bg-[#33c3e0]'
        }`}
      >
        {pulse && !open && (
          <span
            className={`typology-info-icon-pulse absolute inset-0 rounded-full border-2 ${
              chipAccent === 'orange' ? 'border-orange-400/70' : 'border-[#00b4d8]/70'
            }`}
            aria-hidden="true"
          />
        )}
        <Info
          size={14}
          strokeWidth={2.5}
          className={pulse && !open ? 'typology-info-icon-breathe relative' : 'relative'}
        />
      </button>

      {open && isPopover ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className={`absolute bottom-full right-0 z-[1100] mb-2 w-[min(92vw,320px)] rounded-xl border border-[#2a3a4a] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.6)] ${
            closing ? 'typology-info-modal-exit' : 'typology-info-modal-enter'
          }`}
          style={{ backgroundColor: '#1a2535' }}
        >
          {panelBody}
        </div>
      ) : null}

      {modalOverlay}
    </div>
  )
}
