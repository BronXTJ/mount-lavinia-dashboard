import DensityStatCard from './DensityStatCard.jsx'
import KeyFindingsBridge from './KeyFindingsBridge.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'
import {
  formatWalkPct,
  formatWalkScore,
} from '../../utils/walkAccessibilityStats.js'

const ACCENT = '#0d9488'

const WALK_KEY_FINDINGS = [
  'Food coverage within 10 minutes is near-universal; health and education lag.',
  'Destination deserts are localized pockets (~8% of analysis hexes), not area-wide failure.',
  'A few high-betweenness corridors still lack daily destination reach.',
]

const WALK_FINDING_CHIPS = [
  { id: 'WA1', label: 'WA1 Food vs health/education', to: '/synthesis?f=WA1' },
  { id: 'WA2', label: 'WA2 Destination deserts', to: '/synthesis?f=WA2' },
  { id: 'WA3', label: 'WA3 Centrality mismatch', to: '/synthesis?f=WA3' },
]

/**
 * Left panel — walk access score KPIs, coverage bars, Cell ID fly-to, WA chips.
 */
export default function WalkAccessScorePanel({ stats, loading, onFocusCell }) {
  const summary = stats?.accessScore
  const coverage = stats?.coverageBars ?? []
  const analysisN = stats?.analysisHexCount ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <h2 className="border-l-4 border-[#0d9488] pl-3 font-display text-lg font-semibold text-surface-50">
          Walk Accessibility
        </h2>
        <MetricInfoButton
          title="Destination walk access"
          points={[
            'Access score = share of six daily destination groups reachable within a 10-minute network walk (4.8 km/h).',
            'KPIs use analysis-grade hexes (≥90% complete). Partial / scrap cells stay off these cards.',
            'Destination reach is not the same as UMI network accessibility (NQPDA / BtA).',
          ]}
          ariaLabel="What does walk accessibility measure?"
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading walk accessibility data…</p>
      )}

      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <p className="text-center font-display text-[36px] font-bold leading-none" style={{ color: ACCENT }}>
          {formatWalkScore(stats?.meanAccessScore ?? summary?.avg)}
        </p>
        <p className="mt-2 text-center text-xs font-medium text-surface-200">
          Mean access score · {analysisN} analysis-grade hexes (≥90% complete)
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">Access score</h3>
          <MetricInfoButton
            title="Access score cards"
            points={[
              'Min / Max / Average across analysis-grade hexes (≥90% complete).',
              'Click Minimum / Highest Cell ID to fly to that hex and open the Access Score layer.',
            ]}
            ariaLabel="What do the access score cards show?"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DensityStatCard label="Min" value={formatWalkScore(summary?.min)} topBorderColor={ACCENT} />
          <DensityStatCard label="Max" value={formatWalkScore(summary?.max)} topBorderColor={ACCENT} />
          <DensityStatCard label="Average" value={formatWalkScore(summary?.avg)} topBorderColor={ACCENT} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Minimum Cell ID"
            value={summary?.lowestId != null ? String(summary.lowestId) : '—'}
            topBorderColor={ACCENT}
            interactive={summary?.lowestId != null}
            onClick={() => onFocusCell?.('accessScore', summary.lowestId)}
          />
          <DensityStatCard
            label="Highest Cell ID"
            value={summary?.highestId != null ? String(summary.highestId) : '—'}
            topBorderColor={ACCENT}
            interactive={summary?.highestId != null}
            onClick={() => onFocusCell?.('accessScore', summary.highestId)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DensityStatCard
          label="Desert hexes"
          value={String(stats?.desertCount ?? 0)}
          topBorderColor="#dc2626"
          hint="Low tier · ≤2 groups / 10 min"
        />
        <DensityStatCard
          label="Mismatch hexes"
          value={String(stats?.mismatchCount ?? 0)}
          topBorderColor="#7c3aed"
          hint="High BtA + weak access"
        />
      </div>

      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">
            10-minute coverage by group
          </h3>
          <MetricInfoButton
            title="10-minute coverage"
            points={[
              'Share of analysis-grade hexes that reach at least one destination in each group within 10 minutes.',
              'Food is typically strongest; health and education are the thinnest essential groups.',
            ]}
            ariaLabel="What do the coverage bars show?"
          />
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          {coverage.map((row) => {
            const pct = Number.isFinite(row.share) ? Math.max(0, Math.min(100, row.share * 100)) : 0
            return (
              <div key={row.id}>
                <div className="mb-1 flex justify-between text-[11px] text-surface-200">
                  <span>{row.label}</span>
                  <span className="font-semibold text-surface-100">{formatWalkPct(row.share)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded" style={{ backgroundColor: '#2a3a4a' }}>
                  <div
                    className="h-full rounded"
                    style={{ width: `${pct}%`, backgroundColor: ACCENT }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <KeyFindingsBridge
        bullets={WALK_KEY_FINDINGS}
        synthesisTo="/synthesis?f=WA1"
        chips={WALK_FINDING_CHIPS}
      />
    </div>
  )
}
