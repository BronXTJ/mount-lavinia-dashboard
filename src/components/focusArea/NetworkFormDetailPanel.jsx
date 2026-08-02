import DensityStatCard from './DensityStatCard.jsx'
import FocusAreaPanelCard from './FocusAreaPanelCard.jsx'
import FocusAreaStatGrid from './FocusAreaStatGrid.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'
import { formatPct } from '../../utils/networkFormStats.js'
import {
  NETWORK_FORM_ICONS,
  networkFormScopeLabel,
} from '../../constants/networkForm.js'

const CORRIDOR_COLOR = '#00b4d8'
const INTERIOR_COLOR = '#f59e0b'

function ShareBar({ label, share, color, n }) {
  const pct = Number.isFinite(Number(share))
    ? Math.max(0, Math.min(100, Number(share) * 100))
    : 0
  return (
    <div>
      <div className="mb-1 flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-300">
            {label}
          </p>
          <p className="text-[10px] text-surface-400">n = {n ?? '—'}</p>
        </div>
        <p className="font-display text-xl font-bold text-surface-50">{formatPct(share)}</p>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded" style={{ backgroundColor: '#2a3a4a' }}>
        <div
          className="h-full rounded transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 text-[10px] text-surface-400">4-way share</p>
    </div>
  )
}

function SpacingRangeBar({ q25, median, q75 }) {
  if (q25 == null || q75 == null || median == null || q75 <= q25) return null
  const pad = (q75 - q25) * 0.15 || 5
  const min = Math.max(0, q25 - pad)
  const max = q75 + pad
  const span = max - min || 1
  const left = ((q25 - min) / span) * 100
  const width = ((q75 - q25) / span) * 100
  const mid = ((median - min) / span) * 100

  return (
    <div className="mt-3">
      <div className="relative h-2.5 w-full rounded" style={{ backgroundColor: '#2a3a4a' }}>
        <div
          className="absolute top-0 h-full rounded"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: 'rgba(0,180,216,0.45)',
          }}
        />
        <div
          className="absolute top-[-3px] h-4 w-0.5 rounded-sm bg-[#00b4d8]"
          style={{ left: `calc(${mid}% - 1px)` }}
          title={`Median ${median} m`}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-surface-400">
        <span>Q25 {q25} m</span>
        <span>Median {median} m</span>
        <span>Q75 {q75} m</span>
      </div>
    </div>
  )
}

function formatLongPct(share) {
  if (!Number.isFinite(Number(share))) return '—'
  return `${(Number(share) * 100).toFixed(0)}%`
}

export default function NetworkFormDetailPanel({
  findings,
  metrics,
  culdesacRows,
  culdesacDepthStats,
  culdesacSpatialSummary,
  loading,
  selectedScope,
  onJunctionClick,
}) {
  const scopeLabel = networkFormScopeLabel(selectedScope)
  const corridor = findings?.corridor_vs_interior ?? metrics?.corridor_vs_interior
  const shareC = corridor?.four_way_share_corridor
  const shareI = corridor?.four_way_share_interior
  const spacing = metrics?.junction_spacing_m
  const nCuldesac = metrics?.counts?.n_culdesac
  const culPerKm2 = metrics?.culdesac_per_km2
  const medianStub = culdesacDepthStats?.stub_length_m?.median
  const depthCounts = culdesacDepthStats?.depth_class_counts
  const gnRank = culdesacSpatialSummary?.by_gn_rank ?? []
  const culCorridor = culdesacSpatialSummary?.corridor_vs_interior

  const ratio =
    Number.isFinite(Number(shareC)) && Number.isFinite(Number(shareI)) && Number(shareI) > 0
      ? (Number(shareC) / Number(shareI)).toFixed(1)
      : null

  const spacingItems = [
    {
      label: 'Median',
      value: spacing?.median != null ? `${spacing.median} m` : '—',
      icon: '↔',
    },
    {
      label: 'Mean',
      value: spacing?.mean != null ? `${spacing.mean} m` : '—',
      icon: '≈',
    },
    {
      label: 'IQR low (Q25)',
      value: spacing?.q25 != null ? `${spacing.q25} m` : '—',
      icon: '▾',
    },
    {
      label: 'IQR high (Q75)',
      value: spacing?.q75 != null ? `${spacing.q75} m` : '—',
      icon: '▴',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-l-4 border-[#f59e0b] pl-3">
        <h2 className="font-display text-lg font-semibold text-surface-50">Fabric Detail</h2>
        <MetricInfoButton
          title="Corridor vs Interior"
          ariaLabel="What does corridor vs interior mean?"
          points={[
            'Corridor junctions sit within 50 m of trunk/primary/secondary streets.',
            'Interior junctions are the remaining inside-GN nodes — typically more 3-way and cul-de-sac dominated.',
            'Click a cul-de-sac row to fly to it on the map.',
          ]}
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading detail…</p>
      )}

      <FocusAreaPanelCard>
        <div className="mb-3 flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">
            Corridor vs Interior (50 m)
          </h3>
          <MetricInfoButton
            title="4-Way Share Comparison"
            points={[
              'Bars show the share of degree ≥3 junctions that are 4-way+ within each zone.',
              'Higher corridor share means spines are more permeable than the residential interior.',
            ]}
            ariaLabel="How to read corridor vs interior bars?"
          />
        </div>

        <div className="flex flex-col gap-4">
          <ShareBar
            label="Corridor"
            share={shareC}
            color={CORRIDOR_COLOR}
            n={corridor?.n_corridor}
          />
          <ShareBar
            label="Interior"
            share={shareI}
            color={INTERIOR_COLOR}
            n={corridor?.n_interior}
          />
        </div>

        {ratio != null && (
          <p className="mt-3 rounded-md border border-surface-700/80 bg-surface-900/50 px-2.5 py-2 text-[11px] leading-relaxed text-surface-300">
            Corridor 4-way share is about{' '}
            <span className="font-semibold text-surface-100">{ratio}×</span> the interior — spines
            carry permeability while the fabric stays tree-like.
          </p>
        )}
      </FocusAreaPanelCard>

      <FocusAreaPanelCard>
        <div className="mb-3 flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">
            Junction Spacing
          </h3>
          <MetricInfoButton
            title="Junction Spacing"
            points={[
              'Measured along true topology edges between consecutive junctions inside the selected scope.',
              'Median is the headline; IQR (Q25–Q75) shows the middle half of link lengths.',
            ]}
            ariaLabel="What does junction spacing show?"
          />
        </div>
        <FocusAreaStatGrid items={spacingItems} />
        <SpacingRangeBar q25={spacing?.q25} median={spacing?.median} q75={spacing?.q75} />
      </FocusAreaPanelCard>

      <FocusAreaPanelCard>
        <div className="mb-3 flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">Cul-de-sacs</h3>
          <MetricInfoButton
            title="Cul-de-sacs"
            points={[
              `Degree-1 ends inside ${scopeLabel} after true-intersection topology (degree-2 collapsed).`,
              'Stub length = length of the single incident topology edge from the dead-end to the next remaining node.',
              'Depth class by stub length: short < 50 m, medium 50–150 m, long > 150 m.',
              'Click a row to fly to that cul-de-sac on the map.',
            ]}
            ariaLabel="What do cul-de-sac stats show?"
          />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Total"
            value={nCuldesac != null ? String(nCuldesac) : '—'}
            topBorderColor={NETWORK_FORM_ICONS.culdesac.color}
            hint={scopeLabel}
          />
          <DensityStatCard
            label="Density"
            value={culPerKm2 != null ? `${culPerKm2}/km²` : '—'}
            topBorderColor={NETWORK_FORM_ICONS.culdesac.color}
            hint="Per square kilometre"
          />
          <DensityStatCard
            label="Median stub"
            value={medianStub != null ? `${medianStub} m` : '—'}
            topBorderColor={NETWORK_FORM_ICONS.culdesac.color}
            hint="Dead-end edge length"
          />
          <DensityStatCard
            label="Depth mix"
            value={
              depthCounts
                ? `${depthCounts.short ?? 0}/${depthCounts.medium ?? 0}/${depthCounts.long ?? 0}`
                : '—'
            }
            topBorderColor={NETWORK_FORM_ICONS.culdesac.color}
            hint="Short / medium / long"
          />
        </div>

        {gnRank.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">
                GN ranking (by density)
              </p>
              <MetricInfoButton
                title="Cul-de-sac Spatial Pattern"
                points={[
                  'Ranking uses cul-de-sac density per km² across all five GNs.',
                  'Long % = share of cul-de-sacs with stub length > 150 m.',
                  'Hex choropleth (map FAB) counts Phase 1 cul-de-sacs in 100 m primary hex cells.',
                  culdesacSpatialSummary?.hex_coverage_note ||
                    'Hex grid covers the primary Mount Lavinia study area only.',
                ]}
                ariaLabel="How to read cul-de-sac ranking and hex density?"
              />
            </div>
            {culCorridor && (
              <p className="mb-2 text-[11px] leading-relaxed text-surface-400">
                Corridor {culCorridor.corridor_n ?? '—'} · Interior{' '}
                {culCorridor.interior_n ?? '—'}
                {culCorridor.corridor_share != null
                  ? ` (${formatPct(culCorridor.corridor_share)} on corridor)`
                  : ''}
              </p>
            )}
            <div className="overflow-x-auto rounded-md border border-surface-700/80">
              <table className="w-full min-w-[280px] text-left text-[11px]">
                <thead className="bg-surface-900/80 text-surface-400">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">GN</th>
                    <th className="px-2 py-1.5 font-semibold">/km²</th>
                    <th className="px-2 py-1.5 font-semibold">Med stub</th>
                    <th className="px-2 py-1.5 font-semibold">Long %</th>
                  </tr>
                </thead>
                <tbody>
                  {gnRank.map((row) => (
                    <tr
                      key={row.gn_name}
                      className="border-t border-surface-700/60 text-surface-100"
                    >
                      <td className="px-2 py-1.5">
                        <span className="text-surface-400">{row.rank}.</span> {row.gn_name}
                      </td>
                      <td className="px-2 py-1.5 font-mono">
                        {row.culdesac_per_km2 != null ? row.culdesac_per_km2 : '—'}
                      </td>
                      <td className="px-2 py-1.5 font-mono">
                        {row.median_stub_m != null ? `${row.median_stub_m} m` : '—'}
                      </td>
                      <td className="px-2 py-1.5 font-mono">
                        {formatLongPct(row.long_share)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-surface-400">
          Sample Cul-de-sacs
        </p>
        {!culdesacRows?.length ? (
          <p className="text-xs text-surface-400">No cul-de-sacs loaded.</p>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {culdesacRows.map((row) => (
              <li key={row.nodeId}>
                <button
                  type="button"
                  onClick={() => onJunctionClick?.(row.nodeId)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-surface-100 transition-colors hover:bg-surface-700/80"
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: NETWORK_FORM_ICONS.culdesac.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {row.label}
                    {row.meta ? (
                      <span className="text-surface-400"> · {row.meta}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-[#00b4d8]">
                    Fly to
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </FocusAreaPanelCard>
    </div>
  )
}
