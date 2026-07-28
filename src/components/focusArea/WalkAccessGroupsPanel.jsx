import MetricInfoButton from './MetricInfoButton.jsx'
import {
  formatWalkMinutes,
  formatWalkPct,
} from '../../utils/walkAccessibilityStats.js'

const ACCENT = '#0d9488'

/**
 * Right panel — destination-group detail, desert / mismatch lists, UMI contrast note.
 */
export default function WalkAccessGroupsPanel({ stats, loading, onFocusCell }) {
  const groups = stats?.groupDetail ?? []
  const desertIds = stats?.desertIds ?? []
  const mismatchIds = stats?.mismatchIds ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <h2 className="border-l-4 border-[#0d9488] pl-3 font-display text-lg font-semibold text-surface-50">
          Destination groups
        </h2>
        <MetricInfoButton
          title="Destination groups"
          points={[
            'Six daily need groups: food, education, health, transit, finance, open space.',
            'Reach % = share of analysis-grade hexes (≥90% complete) within 10 minutes of that group.',
            'Median time is among hexes with a finite snapped path to the group.',
          ]}
          ariaLabel="What do destination groups show?"
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading destination groups…</p>
      )}

      <div className="flex flex-col gap-2">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            className="rounded-lg border border-surface-700 bg-surface-800 p-3 text-left shadow-card transition-colors hover:border-surface-500"
            onClick={() => {
              const id = g.summary?.lowestId
              if (id != null) onFocusCell?.(g.timeKey, id)
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-sm font-semibold text-surface-50">{g.label}</p>
              <span className="text-xs font-semibold" style={{ color: ACCENT }}>
                {formatWalkPct(g.reachPct)} reach
              </span>
            </div>
            <p className="mt-1 text-[11px] text-surface-300">
              Median walk time {formatWalkMinutes(g.medianTime)}
              {g.summary?.lowestId != null ? ` · click → slowest cell #${g.summary.lowestId}` : ''}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">Desert hexes</h3>
          <MetricInfoButton
            title="Destination deserts"
            points={[
              'Low-tier analysis hexes with ≤2 destination groups within 10 minutes.',
              'Click a Cell ID to fly to that hex on the Access Score layer.',
            ]}
            ariaLabel="What are desert hexes?"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {desertIds.length === 0 && (
            <p className="text-xs text-surface-400">No desert hexes in the analysis set.</p>
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
            Centrality–access mismatch
          </h3>
          <MetricInfoButton
            title="Mismatch hexes"
            points={[
              'Analysis hexes in the top quartile of mean BtA5000 with access_score under 0.5.',
              'High network betweenness without matching daily destination reach.',
              'Click a Cell ID to fly to that hex on the Access Score layer.',
            ]}
            ariaLabel="What are mismatch hexes?"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mismatchIds.length === 0 && (
            <p className="text-xs text-surface-400">No mismatch hexes in the analysis set.</p>
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
          'Destination reach ≠ UMI network accessibility (NQPDA / BtA).'}
      </p>
    </div>
  )
}
