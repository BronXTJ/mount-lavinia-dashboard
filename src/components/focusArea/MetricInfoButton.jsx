import { useEffect, useId, useState } from 'react'
import { Info, X } from 'lucide-react'

/**
 * Teal info chip that opens a simple title + bullet-points modal.
 * Visual match for TypologyInfoButton; content is metric-specific.
 */
export default function MetricInfoButton({ title, points, ariaLabel }) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const titleId = useId()

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

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [closing])

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={ariaLabel ?? title}
        className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#00b4d8] text-white shadow-[0_0_0_2px_rgba(0,180,216,0.35)] transition-colors hover:bg-[#33c3e0]"
      >
        {!open && (
          <span
            className="typology-info-icon-pulse absolute inset-0 rounded-full border-2 border-[#00b4d8]/70"
            aria-hidden="true"
          />
        )}
        <Info
          size={14}
          strokeWidth={2.5}
          className={!open ? 'typology-info-icon-breathe relative' : 'relative'}
        />
      </button>

      {open && (
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
              Click anywhere outside to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}
