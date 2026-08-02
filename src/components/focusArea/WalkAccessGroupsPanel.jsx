import MetricInfoButton from './MetricInfoButton.jsx'
import {
  formatWalkMinutes,
  formatWalkPct,
} from '../../utils/walkAccessibilityStats.js'

const ACCENT = '#0d9488'

/**
 * Right panel — daily-needs reach by service type, desert / mismatch lists, UMI note.
 */
export default function WalkAccessGroupsPanel({ stats, loading, onFocusCell }) {
  const groups = stats?.groupDetail ?? []
  const desertIds = stats?.desertIds ?? []
  const mismatchIds = stats?.mismatchIds ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-1.5">
          <h2 className="border-l-4 border-[#0d9488] pl-3 font-display text-lg font-semibold text-surface-50">
            Daily Needs Reach
          </h2>
          <MetricInfoButton
            title="Daily Needs Reach"
            points={[
              'Six everyday services: Food, Education, Health, Transit, Finance, and Open Space.',
              'Reach % is how many reliable neighbourhood cells can walk to that service in about 10 minutes.',
              'Click a service card to open its walk-time map and jump to the longest-walk (weakest) cell.',
            ]}
            ariaLabel="What Does Daily Needs Reach Show?"
          />
        </div>
        <p className="mt-1.5 pl-[15px] text-[11px] leading-snug text-surface-300">
          Share of hexes within a 10-minute walk of each service type
        </p>
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading Daily Needs Reach…</p>
      )}

      <div className="flex flex-col gap-2">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            className="rounded-lg border border-surface-700 bg-surface-800 p-3 text-left shadow-card transition-colors hover:border-surface-500"
            onClick={() => {
              const id = g.summary?.highestId
              if (id != null) onFocusCell?.(g.timeKey, id)
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-sm font-semibold text-surface-50">{g.label}</p>
              <span className="text-xs font-semibold" style={{ color: ACCENT }}>
                {formatWalkPct(g.reachPct)} Reach
              </span>
            </div>
            <p className="mt-1 text-[11px] text-surface-300">
              Median Walk Time {formatWalkMinutes(g.medianTime)}
              {g.summary?.highestId != null
                ? ` · Click → Longest Walk · Cell #${g.summary.highestId}`
                : ''}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">Desert Hexes</h3>
          <MetricInfoButton
            title="Desert Hexes"
            points={[
              'Neighbourhood cells with two or fewer daily needs within a 10-minute walk — local “destination deserts.”',
              'Excluded cells are never counted as deserts; they could not be measured reliably.',
              'Click a Cell ID to fly to that place on the Access Score map.',
            ]}
            ariaLabel="What Are Desert Hexes?"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {desertIds.length === 0 && (
            <p className="text-xs text-surface-400">No Desert Hexes in the analysis set.</p>
          )}
          {desertIds.map((id) => (
            <button
              key={`desert-${id}`}
              type="button"
              onClick={() => onFocusCell?.('accessScore', id)}
              className="rounded border border-[#dc2626]/40 bg-[#dc2626]/10 px-2 py-0.5 text-[11px] font-semibold text-[#fca5a5] hover:bg-[#dc2626]/20"
            >
              #{id}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">
            Centrality–Access Mismatch
          </h3>
          <MetricInfoButton
            title="Centrality–Access Mismatch"
            points={[
              'Places that sit on busy through-movement corridors but still reach few daily destinations on foot (access score under 0.5).',
              'High network importance does not guarantee shops, clinics, or schools nearby.',
              'Click a Cell ID to fly to that place on the Access Score map.',
            ]}
            ariaLabel="What Is Centrality–Access Mismatch?"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mismatchIds.length === 0 && (
            <p className="text-xs text-surface-400">No Mismatch Hexes in the analysis set.</p>
          )}
          {mismatchIds.map((id) => (
            <button
              key={`mismatch-${id}`}
              type="button"
              onClick={() => onFocusCell?.('accessScore', id)}
              className="rounded border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-2 py-0.5 text-[11px] font-semibold text-[#c4b5fd] hover:bg-[#7c3aed]/20"
            >
              #{id}
            </button>
          ))}
        </div>
      </div>

      <p className="rounded-lg border border-surface-700 bg-surface-800/80 p-3 text-[11px] leading-relaxed text-surface-300">
        {stats?.umiContrastNote ||
          'Daily-needs walk reach is not the same as Maturation’s network-accessibility score (how well streets connect for movement).'}
      </p>
    </div>
  )
}
