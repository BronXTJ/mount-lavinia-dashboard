import { LC_CHANGE_LEGEND, LC_CLASS_LEGEND } from '../../constants/landCover.js'

/** Compact map legend for the active overlay; hidden when all overlays are off. */
export default function LandCoverLegend({ activeOverlay }) {
  if (!activeOverlay) return null

  if (activeOverlay === 'context') {
    return (
      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] max-w-[220px] rounded-lg border border-surface-700 bg-surface-900/90 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Context</p>
        <p className="mt-1 text-[11px] leading-snug text-surface-300">
          ~2025 classified map with OSM roads / buildings overlay.
        </p>
      </div>
    )
  }

  const items = activeOverlay === 'change' ? LC_CHANGE_LEGEND : LC_CLASS_LEGEND
  const title = activeOverlay === 'change' ? 'Change theme' : 'Land cover'

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] max-w-[220px] rounded-lg border border-surface-700 bg-surface-900/90 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-[11px] text-surface-200">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/20"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
