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
  'Destination deserts are localized pockets (~8.5% of analysis hexes), not area-wide failure.',
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
          title="Walk Accessibility"
          points={[
            'How many everyday destinations you can reach on foot in about 10 minutes from each neighbourhood cell (food, school, health, transit, finance, open space).',
            'Scores use only cells we can measure reliably — mostly inside the study area and connected to the walkable street network.',
            'Grey / Excluded cells stay on the map for context but are left out of averages, coverage bars, and desert counts.',
            'This is destination reach — not the same as UMI’s network-accessibility score on the Maturation tab.',
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
          Mean access score · {analysisN} analysis-ok hexes (≥90% complete and snapped ≤100 m)
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">Access Score</h3>
          <MetricInfoButton
            title="Access Score"
            points={[
              'Access score is the share of the six daily destination groups reachable within a 10-minute walk (0 = none, 1 = all six).',
              'Min / Max / Average summarise the reliable neighbourhood cells only.',
              'Click Minimum or Highest Cell ID to fly to that cell on the Access Score map.',
            ]}
            ariaLabel="What Do The Access Score Cards Show?"
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
          label="Desert Hexes"
          value={String(stats?.desertCount ?? 0)}
          topBorderColor="#dc2626"
          hint="Low Tier · ≤2 Groups / 10 Min"
        />
        <DensityStatCard
          label="Mismatch Hexes"
          value={String(stats?.mismatchCount ?? 0)}
          topBorderColor="#7c3aed"
          hint="High BtA + Weak Access"
        />
      </div>

      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">Access Tier Rules</h3>
          <MetricInfoButton
            title="Access Tier Rules"
            points={[
              'High: five or six daily needs within 10 minutes.',
              'Medium: three or four groups within 10 minutes.',
              'Low (desert): two or fewer groups within 10 minutes.',
              'Excluded: cells we could not measure reliably (too incomplete or too far from the walk network). Still shown grey on the map; not in averages.',
            ]}
            ariaLabel="What Do Access Tiers Mean?"
          />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-surface-300">
          Turn on the Access Tier map layer to see High / Medium / Low / Excluded colours.
        </p>
      </div>

      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">
            10-Minute Coverage By Group
          </h3>
          <MetricInfoButton
            title="10-Minute Coverage By Group"
            points={[
              'For each daily need (food, health, etc.), the bar is the share of reliable neighbourhood cells that can reach at least one place of that type within 10 minutes.',
              'Longer bars mean better coverage. Food is often strongest; health and education are often thinner.',
            ]}
            ariaLabel="What Do The Coverage Bars Show?"
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
