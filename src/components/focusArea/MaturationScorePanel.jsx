import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Grid3x3, Network, Shapes } from 'lucide-react'
import DeferredLabelList from '../DeferredLabelList.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import { formatMaturationValue } from '../../utils/maturationStats.js'
import DensityStatCard from './DensityStatCard.jsx'
import KeyFindingsBridge from './KeyFindingsBridge.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'

const MATURATION_KEY_FINDINGS = [
  'Shannon land-use mix is the main maturation reading across the hex fabric.',
  'Access and diversity lag behind mix, so UMI sits lower than Shannon.',
  'Most hexes fall in early or moderate UMI tiers rather than highly matured.',
]

const MATURATION_FINDING_CHIPS = [
  { id: 'F14', label: 'F14 Shannon / maturation', to: '/synthesis?f=F14' },
  { id: 'F15', label: 'F15 Access / diversity', to: '/synthesis?f=F15' },
]

function contributionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{row?.name}</p>
      <p className="mt-1 text-surface-200">{formatMaturationValue(row?.value)}</p>
    </div>
  )
}

function histogramTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{row?.label}</p>
      <p className="mt-1 text-surface-200">{row?.count} cells</p>
    </div>
  )
}

function ComponentCard({ title, value, subLabel, color, icon: Icon }) {
  return (
    <div
      className="rounded-lg border border-surface-700 bg-surface-800 p-3 shadow-card"
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={14} style={{ color }} strokeWidth={2.25} />}
        <p className="text-[11px] font-medium uppercase tracking-wide text-surface-200">{title}</p>
      </div>
      <p className="mt-2 font-display text-xl font-bold text-surface-50">
        {formatMaturationValue(value)}
      </p>
      <p className="mt-1 text-[11px] text-surface-300">{subLabel}</p>
    </div>
  )
}

function MetricStatSection({
  title,
  infoTitle,
  infoPoints,
  infoAria,
  accent,
  summary,
  onFocusCell,
  focusMetricId,
  minLabel = 'Min',
  maxLabel = 'Max',
  avgLabel = 'Average',
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-100">{title}</h3>
        <MetricInfoButton title={infoTitle} points={infoPoints} ariaLabel={infoAria} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <DensityStatCard
          label={minLabel}
          value={formatMaturationValue(summary?.min)}
          topBorderColor={accent}
        />
        <DensityStatCard
          label={maxLabel}
          value={formatMaturationValue(summary?.max)}
          topBorderColor={accent}
        />
        <DensityStatCard
          label={avgLabel}
          value={formatMaturationValue(summary?.avg)}
          topBorderColor={accent}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DensityStatCard
          label="Minimum Cell ID"
          value={summary?.lowestId != null ? String(summary.lowestId) : '—'}
          topBorderColor={accent}
          interactive={summary?.lowestId != null}
          onClick={() => onFocusCell?.(focusMetricId, summary.lowestId)}
        />
        <DensityStatCard
          label="Highest Cell ID"
          value={summary?.highestId != null ? String(summary.highestId) : '—'}
          topBorderColor={accent}
          interactive={summary?.highestId != null}
          onClick={() => onFocusCell?.(focusMetricId, summary.highestId)}
        />
      </div>
    </div>
  )
}

/** Right panel — Urban Maturation Score. */
export default function MaturationScorePanel({ stats, loading, onFocusCell }) {
  const accessAnim = useChartAnimation()
  const contribAnim = useChartAnimation()
  const histAnim = useChartAnimation()
  const avgUmi = stats?.umi?.avg
  const barPct = avgUmi != null ? Math.max(0, Math.min(100, avgUmi * 100)) : 0
  const tiers = stats?.tiers ?? []
  const contribution = stats?.componentContribution ?? []
  const histogram = stats?.umiHistogram ?? []
  const accessHistogram = stats?.accessibilityHistogram ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <h2 className="border-l-4 border-[#b45309] pl-3 font-display text-lg font-semibold text-surface-50">
          Urban Maturation Analysis
        </h2>
        <MetricInfoButton
          title="Average Urban Maturation Index"
          points={[
            'Large number is the mean UMI across all valid hex cells.',
            'Progress bar places that average on a 0–1 scale (study max ≈ 0.57).',
            'Emerging / Moderate / Matured markers follow the 0 / 0.35 / 0.57 reference points.',
          ]}
          ariaLabel="What does the UMI gauge show?"
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading maturation data…</p>
      )}

      {/* UMI Summary Gauge */}
      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <p
          className="text-center font-display text-[36px] font-bold leading-none"
          style={{ color: '#b45309' }}
        >
          {formatMaturationValue(avgUmi)}
        </p>
        <p className="mt-2 text-center text-xs font-medium text-surface-200">
          Average Urban Maturation Index
        </p>
        <div
          className="mt-3 h-3 w-full overflow-hidden rounded-md"
          style={{ backgroundColor: '#2a3a4a' }}
        >
          <div
            className="h-full rounded-md"
            style={{
              width: `${barPct}%`,
              background: 'linear-gradient(to right, #94a3b8, #fbbf24, #b45309)',
            }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs font-semibold text-surface-200 sm:text-sm">
          <span>Emerging | 0</span>
          <span>Moderate | 0.35</span>
          <span>Matured | 0.57</span>
        </div>
      </div>

      {/* Urban Maturation stats */}
      <MetricStatSection
        title="Urban Maturation"
        infoTitle="Urban Maturation Index"
        infoPoints={[
          'Min / Max / Average UMI across valid hex cells after edge filtering.',
          'Click Minimum / Highest Cell ID to fly to that hex and open the UMI layer.',
        ]}
        infoAria="What do the Urban Maturation cards show?"
        accent="#b45309"
        summary={stats?.umi}
        onFocusCell={onFocusCell}
        focusMetricId="umi"
        minLabel="Min UMI"
        maxLabel="Max UMI"
        avgLabel="Average UMI"
      />

      {/* Maturation Level Distribution */}
      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">
            Maturation Level Distribution
          </h3>
          <MetricInfoButton
            title="Maturation Classification"
            points={[
              'Highly Matured: UMI greater than 0.35.',
              'Moderately Matured: UMI from 0.15 to 0.35.',
              'Early Stage / Emerging: UMI below 0.15 (light grey).',
            ]}
            ariaLabel="How are maturation levels classified?"
          />
        </div>
        <div className="mt-3 flex h-10 w-full overflow-hidden rounded">
          {(tiers.length
            ? tiers
            : [
                { name: 'Highly Matured', pct: 33, color: '#b45309' },
                { name: 'Moderately Matured', pct: 34, color: '#fbbf24' },
                { name: 'Early Stage / Emerging', pct: 33, color: '#94a3b8' },
              ]
          ).map((zone) => {
            const pct = zone.pct ?? 0
            return (
              <div
                key={zone.name}
                style={{ width: `${pct}%`, backgroundColor: zone.color }}
                className="flex items-center justify-center"
              >
                {pct > 8 && (
                  <span className="select-none text-[12px] font-bold text-black/70">{pct}%</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          {tiers.map((zone) => (
            <div key={zone.name} className="flex items-center gap-2 text-sm text-surface-200">
              <span
                className="inline-block h-3.5 w-3.5 rounded-sm"
                style={{ backgroundColor: zone.color }}
              />
              <span className="flex-1">{zone.name}</span>
              <span className="text-xs font-semibold text-surface-100">
                {zone.pct}% ({zone.count})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Accessibility */}
      <div className="flex flex-col gap-3">
        <MetricStatSection
          title="Accessibility"
          infoTitle="Accessibility"
          infoPoints={[
            'Normalized accessibility (0–1) from average closeness / betweenness centrality.',
            'Click Minimum / Highest Cell ID to fly to that hex on the Accessibility layer.',
          ]}
          infoAria="What does Accessibility show?"
          accent="#0ea5e9"
          summary={stats?.accessibilityNorm}
          onFocusCell={onFocusCell}
          focusMetricId="accessibility"
          minLabel="Min Accessibility"
          maxLabel="Max Accessibility"
          avgLabel="Average Accessibility"
        />
        <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-sm font-semibold text-surface-50">
              Accessibility Distribution
            </h3>
            <MetricInfoButton
              title="Accessibility Distribution"
              points={[
                'Histogram of normalized accessibility scores (0–1) across valid hex cells.',
                'Taller bars mean more cells fall in that accessibility range.',
              ]}
              ariaLabel="What does the accessibility histogram show?"
            />
          </div>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accessHistogram} margin={{ top: 20, right: 8, left: 8, bottom: 36 }}>
                <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9fadb9', fontSize: 8 }}
                  axisLine={{ stroke: '#2a3a4a' }}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  label={{
                    value: 'Accessibility (0–1)',
                    position: 'insideBottom',
                    offset: -22,
                    fill: '#9fadb9',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#9fadb9', fontSize: 10 }}
                  axisLine={{ stroke: '#2a3a4a' }}
                  tickLine={false}
                  width={36}
                  label={{
                    value: 'Hex cells',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 8,
                    fill: '#9fadb9',
                    fontSize: 11,
                  }}
                />
                <Tooltip content={histogramTooltip} />
                <Bar
                  dataKey="count"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={accessAnim.isAnimationActive}
                  animationDuration={accessAnim.animationDuration}
                  animationEasing={accessAnim.animationEasing}
                  onAnimationEnd={accessAnim.onAnimationEnd}
                >
                  <DeferredLabelList
                    showLabels={accessAnim.showLabels}
                    dataKey="count"
                    position="top"
                    formatter={(v) => (v > 0 ? v : '')}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Land Use Diversity */}
      <MetricStatSection
        title="Land Use Diversity"
        infoTitle="Land Use Diversity"
        infoPoints={[
          'Normalized land-use diversity (1normali_2) across valid hex cells.',
          'Click Minimum / Highest Cell ID to fly to that hex on the Land Use Diversity layer.',
        ]}
        infoAria="What does Land Use Diversity show?"
        accent="#b63679"
        summary={stats?.landUseNorm}
        onFocusCell={onFocusCell}
        focusMetricId="landUseDiversity"
        minLabel="Min Diversity"
        maxLabel="Max Diversity"
        avgLabel="Average Diversity"
      />

      {/* Index Components */}
      <div>
        <div className="mb-3 flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">Index Components</h3>
          <MetricInfoButton
            title="Index Components"
            points={[
              'Three cards show average normalized scores (0–1) across valid hex cells.',
              'Accessibility, Land Use Diversity, and Shannon Entropy are the equal-weight inputs to UMI.',
            ]}
            ariaLabel="What are Index Components?"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ComponentCard
            title="Accessibility"
            value={stats?.accessibilityNorm?.avg}
            subLabel="Centrality score"
            color="#0ea5e9"
            icon={Network}
          />
          <ComponentCard
            title="Land Use Diversity"
            value={stats?.landUseNorm?.avg}
            subLabel="Functional variety"
            color="#b63679"
            icon={Shapes}
          />
          <ComponentCard
            title="Shannon Entropy"
            value={stats?.entropyNorm?.avg}
            subLabel="Land use mix diversity"
            color="#10b981"
            icon={Grid3x3}
          />
        </div>
      </div>

      {/* Component Contribution */}
      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">
            Component Contribution to UMI
          </h3>
          <MetricInfoButton
            title="Component Contribution to UMI"
            points={[
              'Bars compare the average normalized value of each UMI input across the study area.',
              'Taller bars mean that component contributes more, on average, to the composite score.',
              'UMI itself is the mean of these three normalized components per cell.',
            ]}
            ariaLabel="What does Component Contribution show?"
          />
        </div>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={contribution} margin={{ top: 24, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9fadb9', fontSize: 9 }}
                axisLine={{ stroke: '#2a3a4a' }}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis
                domain={[0, 1]}
                tick={{ fill: '#9fadb9', fontSize: 10 }}
                axisLine={{ stroke: '#2a3a4a' }}
                tickLine={false}
                width={28}
              />
              <Tooltip content={contributionTooltip} />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                isAnimationActive={contribAnim.isAnimationActive}
                animationDuration={contribAnim.animationDuration}
                animationEasing={contribAnim.animationEasing}
                onAnimationEnd={contribAnim.onAnimationEnd}
              >
                {contribution.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
                <DeferredLabelList
                  showLabels={contribAnim.showLabels}
                  dataKey="value"
                  position="top"
                  formatter={(v) => (Number.isFinite(v) ? Number(v).toFixed(3) : '')}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* UMI Histogram */}
      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">
            Urban Maturation Score Distribution
          </h3>
          <MetricInfoButton
            title="Urban Maturation Score Distribution"
            points={[
              'Histogram counts how many hex cells fall into each UMI value bucket (0–0.57).',
              'Tier boundaries sit near 0.15 (moderate) and 0.35 (high).',
            ]}
            ariaLabel="What does the UMI histogram show?"
          />
        </div>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogram} margin={{ top: 20, right: 8, left: 0, bottom: 24 }}>
              <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9fadb9', fontSize: 8 }}
                axisLine={{ stroke: '#2a3a4a' }}
                tickLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#9fadb9', fontSize: 10 }}
                axisLine={{ stroke: '#2a3a4a' }}
                tickLine={false}
                width={28}
              />
              <Tooltip content={histogramTooltip} />
              <Bar
                dataKey="count"
                fill="#e7c3a2"
                radius={[4, 4, 0, 0]}
                isAnimationActive={histAnim.isAnimationActive}
                animationDuration={histAnim.animationDuration}
                animationEasing={histAnim.animationEasing}
                onAnimationEnd={histAnim.onAnimationEnd}
              >
                <DeferredLabelList
                  showLabels={histAnim.showLabels}
                  dataKey="count"
                  position="top"
                  formatter={(v) => (v > 0 ? v : '')}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[10px] text-surface-400">
          Tier boundaries at 0.15 (moderate) and 0.35 (high)
        </p>
      </div>

      <KeyFindingsBridge
        bullets={MATURATION_KEY_FINDINGS}
        synthesisTo="/synthesis?f=F14"
        chips={MATURATION_FINDING_CHIPS}
      />
    </div>
  )
}
