import { Link } from 'react-router-dom'

/**
 * Shared Focus Area bridge: up to 3 critical bullets + Synthesis chips.
 *
 * @param {{
 *   bullets: string[],
 *   synthesisTo?: string,
 *   chips?: { id: string, label: string, to: string }[],
 * }} props
 */
export default function KeyFindingsBridge({
  bullets,
  synthesisTo = '/synthesis',
  chips = [],
}) {
  const lines = (bullets ?? []).filter(Boolean).slice(0, 3)
  if (lines.length === 0) return null

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-surface-700 bg-surface-800/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-surface-100">Key Findings</h3>
        <Link
          to={synthesisTo}
          className="text-[11px] font-semibold text-[#fbbf24] underline-offset-2 hover:underline"
        >
          View in Synthesis
        </Link>
      </div>
      <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-surface-200">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chips.map((chip) => (
            <Link
              key={chip.id}
              to={chip.to}
              className="rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-semibold text-[#fbbf24]"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
