import { AlertCircle } from 'lucide-react'

/** Compact caption under hex-based Focus Area maps (overlay bar). */
export default function HexEdgeEffectNote() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-center gap-2 border-t border-surface-700 bg-surface-900/80 px-2.5 py-1">
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f87171]/40" />
        <AlertCircle className="relative h-3.5 w-3.5 text-[#f87171]" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-[11px] leading-snug text-surface-200">
        Hexes are clipped to the study boundary. Edge / impractical cells (e.g. negative OSR) stay
        unfilled and are omitted from charts and KPIs.
      </p>
    </div>
  )
}
