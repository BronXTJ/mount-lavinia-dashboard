import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import FocusAreaPanelCard from './FocusAreaPanelCard.jsx'
import FocusAreaStatGrid from './FocusAreaStatGrid.jsx'
import KeyFindingsBridge from './KeyFindingsBridge.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'
import { formatPct, formatRatio } from '../../utils/networkFormStats.js'

const LABEL_RADIAN = Math.PI / 180

function renderTypeSliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, pct }) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * LABEL_RADIAN)
  const y = cy + radius * Math.sin(-midAngle * LABEL_RADIAN)
  const value = pct != null ? Math.round(pct) : Math.round((percent ?? 0) * 100)
  if (!Number.isFinite(value) || value <= 0) return null
  return (
    <text
      className="chart-value-label"
      x={x}
      y={y}
      fill="#ffffff"
      stroke="#0f1923"
      strokeWidth={3}
      paintOrder="stroke"
      fontSize={11}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {`${value}%`}
    </text>
  )
}

function TypeDonut({ zones }) {
  const {
    isAnimationActive,
    animationDuration,
    animationEasing,
    showLabels,
    onAnimationEnd,
  } = useChartAnimation()
  if (!zones?.length) {
    return (
      <p className="py-6 text-center text-xs text-surface-400">Junction type mix unavailable.</p>
    )
  }

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={zones}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={68}
            paddingAngle={2}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            onAnimationEnd={onAnimationEnd}
            label={(props) => (showLabels ? renderTypeSliceLabel(props) : null)}
            labelLine={false}
          >
            {zones.map((z) => (
              <Cell key={z.name} fill={z.color} stroke="#0f172a" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              return (
                <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
                  <p className="font-medium text-surface-50">{d?.name}</p>
                  <p className="mt-1 text-surface-200">
                    {d?.count} ({d?.pct}%)
                  </p>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function NetworkFormOverviewPanel({
  metrics,
  findings,
  typeZones,
  counts,
  loading,
}) {
  const ratio = formatRatio(metrics?.four_to_three_ratio)
  const raw = metrics?.four_to_three_raw ?? '—'
  const share = formatPct(metrics?.four_way_share)
  const culKm2 = metrics?.culdesac_per_km2 ?? '—'
  const median = metrics?.junction_spacing_m?.median ?? '—'

  const statItems = [
    { label: '4-way : 3-way', value: ratio, icon: '◇' },
    { label: '4-way share', value: share, icon: '▲' },
    { label: 'Cul-de-sacs / km²', value: String(culKm2), icon: '●' },
    { label: 'Median spacing', value: median === '—' ? '—' : `${median} m`, icon: '↔' },
  ]

  const findingBullets =
    findings?.cards?.map((c) => c.claim).filter(Boolean).slice(0, 3) ?? []

  const chips =
    findings?.cards?.map((c) => ({
      id: c.id,
      label: c.id,
      to: '/synthesis',
    })) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-l-4 border-primary-500 pl-3">
        <h2 className="font-display text-lg font-semibold text-surface-50">Network Form</h2>
        <MetricInfoButton
          title="Network Form"
          ariaLabel="What does Network Form show?"
          points={[
            'Classifies Mount Lavinia GN street junctions as 4-way, 3-way, or cul-de-sac from a true-intersection topology (no densify).',
            'A high share of 3-way junctions indicates a tree-like residential fabric with lower local permeability than a grid.',
            'Compare with Walk Accessibility and Centrality: destination reach and through-movement can sit on spines even when the interior fabric is tree-like.',
          ]}
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading network form data…</p>
      )}

      <FocusAreaStatGrid items={statItems} />

      <FocusAreaPanelCard>
        <div className="mb-2 flex flex-nowrap items-center justify-between gap-2">
          <h3 className="shrink-0 font-display text-sm font-semibold text-surface-100">
            Junction Type Mix
          </h3>
          <p className="min-w-0 truncate text-right text-[11px] text-surface-400 whitespace-nowrap">
            {counts?.three_way ?? 0}×3-way · {counts?.four_way ?? 0}×4-way ·{' '}
            {counts?.culdesac ?? 0} cul-de-sacs
          </p>
        </div>
        <TypeDonut zones={typeZones} />
        <p className="mt-1 text-center text-[11px] text-surface-400">
          Raw ratio {raw} (inside GN)
        </p>
      </FocusAreaPanelCard>

      <KeyFindingsBridge
        bullets={
          findingBullets.length
            ? findingBullets
            : [
                'Mount Lavinia GN junctions are 3-way dominated (tree-like residential fabric).',
                'Cul-de-sacs and short links constrain interior permeability.',
                'Spines are relatively more permeable than the interior; walk access rides those spines.',
              ]
        }
        chips={chips}
        synthesisTo="/synthesis"
      />
    </div>
  )
}
