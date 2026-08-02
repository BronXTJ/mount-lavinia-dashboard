import { useEffect, useState } from 'react'
import { Info, X } from 'lucide-react'
import { DENSITY_TYPOLOGY } from '../../constants/density.js'

const TYPOLOGY_DESCRIPTORS = [
  { id: 'denseCongested', text: 'high FSI, high GSI, low OSR' },
  { id: 'denseLiveable', text: 'high FSI, high GSI, high OSR' },
  { id: 'verticalCompact', text: 'high FSI, low GSI, low OSR' },
  { id: 'verticalOpen', text: 'high FSI, low GSI, high OSR' },
  { id: 'sprawlingCongested', text: 'low FSI, high GSI, low OSR' },
  { id: 'sprawlingOpen', text: 'low FSI, high GSI, high OSR' },
  { id: 'openUnderdeveloped', text: 'low FSI, low GSI, high OSR' },
  { id: 'bareInactive', text: 'low FSI, low GSI, low OSR' },
]

/**
 * Teal info chip that opens the shared typology classification modal.
 */
export default function TypologyInfoButton() {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)

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
        aria-label="How are typologies classified?"
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
            aria-labelledby="typology-info-title"
            className={`w-full max-w-[480px] rounded-xl border border-[#2a3a4a] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)] ${
              closing ? 'typology-info-modal-exit' : 'typology-info-modal-enter'
            }`}
            style={{ backgroundColor: '#1a2535' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h4
                id="typology-info-title"
                className="font-display text-[16px] font-bold text-[#e0e0e0]"
              >
                How Are Typologies Classified?
              </h4>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close typology info"
                className="inline-flex cursor-pointer items-center justify-center text-[#94a3b8] transition-colors hover:text-[#e0e0e0]"
              >
                <X size={18} strokeWidth={2.25} />
              </button>
            </div>

            <div className="mt-3 border-t border-[#2a3a4a]" />

            <div className="mt-4 space-y-3 text-[13px] leading-[1.7] text-[#cbd5e1]">
              <p>
                Typologies describe how packed and how open the buildings feel in each
                neighbourhood cell — using three simple building measures together:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>FSI (Floor Space Index) — how much total floor space vs plot size (taller / denser)</li>
                <li>GSI (Ground Space Index) — how much of the ground is covered by buildings</li>
                <li>OSR (Open Space Ratio) — how much open ground there is relative to floor space</li>
              </ul>
              <p>
                Each cell is compared with the median of all valid cells. Above-median FSI =
                high intensity, above-median GSI = high coverage, above-median OSR = more open.
              </p>
              <p>That combination produces eight urban typologies:</p>
              <ul className="space-y-1.5">
                {TYPOLOGY_DESCRIPTORS.map((row) => {
                  const meta = DENSITY_TYPOLOGY[row.id]
                  return (
                    <li key={row.id} className="flex items-start gap-2">
                      <span
                        className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden="true"
                      />
                      <span>
                        <span className="font-medium text-[#e0e0e0]">{meta.label}</span>
                        <span> — {row.text}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p>Method basis: Spacematrix (TU Delft).</p>
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
