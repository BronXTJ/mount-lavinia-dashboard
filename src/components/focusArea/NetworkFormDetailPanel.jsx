import DensityStatCard from './DensityStatCard.jsx'
import FocusAreaPanelCard from './FocusAreaPanelCard.jsx'
import FocusAreaStatGrid from './FocusAreaStatGrid.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'
import { formatPct } from '../../utils/networkFormStats.js'
import {
  CULDESAC_MATURATION_TIER_COLORS,
  CULDESAC_WALK_TIER_COLORS,
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
  culdesacWalkSummary,
  culdesacDensityUmiSummary,
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
  const walkTiers = culdesacWalkSummary?.by_access_tier ?? []
  const desert = culdesacWalkSummary?.desert
  const matTiers = culdesacDensityUmiSummary?.by_maturation_tier ?? []

  const ratio =
    Number.isFinite(Number(shareC)) && Number.isFinite(Number(shareI)) && Number(shareI) > 0
      ? (Number(shareC) / Number(shareI)).toFixed(1)
      : null

  const spacingItems = [
    {
      label: 'Median',
      value: spacing?.median != null ? String(spacing.median) : '—',
      unit: spacing?.median != null ? 'm' : undefined,
      icon: '↔',
    },
    {
      label: 'Mean',
      value: spacing?.mean != null ? String(spacing.mean) : '—',
      unit: spacing?.mean != null ? 'm' : undefined,
      icon: '≈',
    },
    {
      label: 'Shorter quarter (Q25)',
      value: spacing?.q25 != null ? String(spacing.q25) : '—',
      unit: spacing?.q25 != null ? 'm' : undefined,
      icon: '▾',
    },
    {
      label: 'Longer quarter (Q75)',
      value: spacing?.q75 != null ? String(spacing.q75) : '—',
      unit: spacing?.q75 != null ? 'm' : undefined,
      icon: '▴',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-l-4 border-[#f59e0b] pl-3">
        <h2 className="font-display text-lg font-semibold text-surface-50">Fabric Detail</h2>
        <MetricInfoButton
          title="Fabric Detail"
          ariaLabel="What does Fabric Detail show?"
          points={[
            'This panel compares junction form along main through-roads versus the residential back-streets, plus spacing and cul-de-sac depth.',
            'Open the “i” on Corridor vs Interior (50 m) for plain-language definitions of Corridor and Interior.',
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
            title="Corridor vs Interior"
            points={[
              'Corridor: junctions within about 50 m of the main through-roads — the street spines that carry through traffic.',
              'Interior: every other junction in the selected area — the residential back-streets away from those spines (often more T-junctions and dead-ends).',
              'Bars: for each zone, the share of real junctions that are 4-way. A higher Corridor bar means the spines are more open than the back streets.',
              'Technically, corridor roads are OSM trunk / primary / secondary (and their link classes).',
            ]}
            ariaLabel="What do Corridor and Interior mean, and how do I read the bars?"
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
              'How far apart junctions are along the street network in the selected area.',
              'Q25 = shorter quarter of link lengths; Median = typical distance; Q75 = longer quarter. The middle half of links sits between Q25 and Q75.',
              'Shorter spacing usually means a finer-grain street pattern; longer spacing means longer blocks between junctions.',
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
              `Dead-end street ends inside ${scopeLabel} — places where the street stops instead of continuing through.`,
              'Stub length is how long the dead-end spur is from the last junction to the end of the road.',
              'Typical stub (median) is the middle value — half of dead-ends are shorter, half are longer. Depth mix splits them into short (<50 m), medium (50–150 m), and long (>150 m).',
              'Cards show count, density per km², typical stub length, and that short/medium/long mix. Click a sample row to fly the map to that dead-end.',
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
            value={culPerKm2 != null ? String(culPerKm2) : '—'}
            unit={culPerKm2 != null ? '/km²' : undefined}
            topBorderColor={NETWORK_FORM_ICONS.culdesac.color}
            hint="Per square kilometre"
          />
          <DensityStatCard
            label="Typical stub"
            value={medianStub != null ? String(medianStub) : '—'}
            unit={medianStub != null ? 'm' : undefined}
            topBorderColor={NETWORK_FORM_ICONS.culdesac.color}
            hint="Dead-end spur length"
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
                  'Ranks the five GNs by how many cul-de-sacs they have per square kilometre (not just raw count).',
                  'Typ. stub = typical dead-end spur length in that GN (half shorter, half longer). Long % = share of dead-ends with stub length over 150 m.',
                  'On the map, turn on Cul-de-sac Hex Density to see how many dead-ends fall in each 100 m cell.',
                  'Hex colours cover the primary study-area grid; GN ranking still covers all five divisions.',
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
                    <th className="px-2 py-1.5 font-semibold">Typ. stub</th>
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

        {walkTiers.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">
                By walk-access tier
              </p>
              <MetricInfoButton
                title="Cul-de-sac × Walk Access"
                points={[
                  'Each dead-end is scored by how well its 100 m neighbourhood reaches daily destinations on foot (same idea as Walk Accessibility).',
                  'Desert = few daily needs nearby (low tier). Excluded = cells we could not measure reliably.',
                  'Typ. stub in the table is the typical dead-end spur length for cul-de-sacs in that access tier (half shorter, half longer).',
                  'The table counts cul-de-sacs in each access tier; the map FAB Cul-de-sac × Walk Access colours those hexes by tier.',
                ]}
                ariaLabel="How to read cul-de-sac walk-access overlay?"
              />
            </div>
            {desert && (
              <p className="mb-2 text-[11px] leading-relaxed text-surface-400">
                Desert: {desert.culdesac_n ?? '—'} cul-de-sacs in {desert.hex_n ?? '—'} hexes
                {desert.share_of_assigned != null
                  ? ` (${formatPct(desert.share_of_assigned)} of assigned)`
                  : ''}
                {culdesacWalkSummary?.mean_access_among_culdesac_hexes != null
                  ? ` · mean access in cul-de-sac hexes ${culdesacWalkSummary.mean_access_among_culdesac_hexes}`
                  : ''}
              </p>
            )}
            <div className="overflow-x-auto rounded-md border border-surface-700/80">
              <table className="w-full min-w-[280px] text-left text-[11px]">
                <thead className="bg-surface-900/80 text-surface-400">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Tier</th>
                    <th className="px-2 py-1.5 font-semibold">n</th>
                    <th className="px-2 py-1.5 font-semibold">Share</th>
                    <th className="px-2 py-1.5 font-semibold">Typ. stub</th>
                  </tr>
                </thead>
                <tbody>
                  {walkTiers.map((row) => (
                    <tr
                      key={row.access_tier}
                      className="border-t border-surface-700/60 text-surface-100"
                    >
                      <td className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-sm"
                            style={{
                              backgroundColor:
                                CULDESAC_WALK_TIER_COLORS[row.access_tier] ?? '#64748b',
                            }}
                            aria-hidden
                          />
                          {row.access_tier}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono">{row.n ?? '—'}</td>
                      <td className="px-2 py-1.5 font-mono">{formatPct(row.share)}</td>
                      <td className="px-2 py-1.5 font-mono">
                        {row.median_stub_m != null ? `${row.median_stub_m} m` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {matTiers.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">
                By maturation tier
              </p>
              <MetricInfoButton
                title="Cul-de-sac × Density / UMI"
                points={[
                  'Each dead-end inherits building intensity (FSI) and Urban Maturation Index (UMI) from its 100 m neighbourhood cell.',
                  'UMI summarises how “complete” that cell feels (mix + access + diversity); FSI is how much floor space is built relative to the plot.',
                  'Typ. stub in the table is the typical dead-end spur length for cul-de-sacs in that maturation tier (half shorter, half longer).',
                  'The table groups cul-de-sacs by maturation tier; the map FAB Cul-de-sac × UMI colours those hexes by UMI.',
                ]}
                ariaLabel="How to read cul-de-sac density and UMI overlay?"
              />
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-surface-400">
              Mean among cul-de-sac hexes: UMI{' '}
              {culdesacDensityUmiSummary?.mean_umi_among_culdesac_hexes ?? '—'} · FSI{' '}
              {culdesacDensityUmiSummary?.mean_fsi_among_culdesac_hexes ?? '—'}
              {culdesacDensityUmiSummary?.high_umi_share != null
                ? ` · high-tier share ${formatPct(culdesacDensityUmiSummary.high_umi_share)}`
                : ''}
            </p>
            <div className="overflow-x-auto rounded-md border border-surface-700/80">
              <table className="w-full min-w-[280px] text-left text-[11px]">
                <thead className="bg-surface-900/80 text-surface-400">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Tier</th>
                    <th className="px-2 py-1.5 font-semibold">n</th>
                    <th className="px-2 py-1.5 font-semibold">Share</th>
                    <th className="px-2 py-1.5 font-semibold">Typ. stub</th>
                    <th className="px-2 py-1.5 font-semibold">Mean FSI</th>
                  </tr>
                </thead>
                <tbody>
                  {matTiers.map((row) => (
                    <tr
                      key={row.tier}
                      className="border-t border-surface-700/60 text-surface-100"
                    >
                      <td className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-sm"
                            style={{
                              backgroundColor:
                                CULDESAC_MATURATION_TIER_COLORS[row.tier] ?? '#64748b',
                            }}
                            aria-hidden
                          />
                          {row.tier}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono">{row.n ?? '—'}</td>
                      <td className="px-2 py-1.5 font-mono">{formatPct(row.share)}</td>
                      <td className="px-2 py-1.5 font-mono">
                        {row.median_stub_m != null ? `${row.median_stub_m} m` : '—'}
                      </td>
                      <td className="px-2 py-1.5 font-mono">
                        {row.mean_fsi != null ? row.mean_fsi : '—'}
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
