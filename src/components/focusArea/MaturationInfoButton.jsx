import { useEffect, useId, useState } from 'react'
import { Info, X } from 'lucide-react'

/**
 * Info chip for Urban Maturation Index calculation modal.
 */
export default function MaturationInfoButton() {
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
        aria-label="How is Urban Maturation Index calculated?"
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
            className={`w-full max-w-[480px] rounded-xl border border-[#2a3a4a] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)] ${
              closing ? 'typology-info-modal-exit' : 'typology-info-modal-enter'
            }`}
            style={{ backgroundColor: '#1a2535' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h4 id={titleId} className="font-display text-[16px] font-bold text-[#e0e0e0]">
                How Is Urban Maturation Index Calculated?
              </h4>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close maturation info"
                className="inline-flex cursor-pointer items-center justify-center text-[#94a3b8] transition-colors hover:text-[#e0e0e0]"
              >
                <X size={18} strokeWidth={2.25} />
              </button>
            </div>

            <div className="mt-3 border-t border-[#2a3a4a]" />

            <div className="mt-4 space-y-3 text-[13px] leading-[1.7] text-[#cbd5e1]">
              <p>
                Urban Maturation Index (UMI) is a composite score combining three normalized
                components:
              </p>
              <p className="font-medium text-[#e0e0e0]">
                UMI = (Shannon Entropy + Accessibility + Land Use Diversity) ÷ 3
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#10b981]" />
                  <span>
                    <span className="font-medium text-[#e0e0e0]">Shannon Entropy</span> — measures
                    how diverse and balanced the mix of land uses is within each hex cell. Higher =
                    more variety.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0ea5e9]" />
                  <span>
                    <span className="font-medium text-[#e0e0e0]">Accessibility</span> — how well
                    the streets connect for movement through the area (network position, not live
                    traffic counts). Higher = better connected.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#b63679]" />
                  <span>
                    <span className="font-medium text-[#e0e0e0]">Land Use Diversity</span> — measures
                    the variety of functional categories present. Higher = more complete urban
                    function.
                  </span>
                </li>
              </ul>
              <p>
                All three components are normalized to a 0–1 scale before combining, ensuring equal
                weight in the final score.
              </p>
              <p className="font-medium text-[#e0e0e0]">Classification thresholds:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#b45309]" />
                  Highly Matured → UMI &gt; 0.35
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
                  Moderately Matured → UMI 0.15 – 0.35
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#334155]" />
                  Early Stage → UMI &lt; 0.15
                </li>
              </ul>
            </div>

            <div className="mt-4 border-t border-[#2a3a4a] pt-3 text-[12px] text-[#94a3b8]">
              Click anywhere outside to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}
