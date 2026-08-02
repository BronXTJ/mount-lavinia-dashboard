import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DeferredLabelList from '../DeferredLabelList.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import { formatMaturationValue } from '../../utils/maturationStats.js'
import DensityStatCard from './DensityStatCard.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'

const SHANNON_ACCENT = '#10b981'

function landUseTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const area = Number(row?.area ?? 0)
  const areaLabel =
    area >= 1e6
      ? `${(area / 1e6).toFixed(2)} km²`
      : area >= 1
        ? `${area.toFixed(0)} m²`
        : `${area.toFixed(2)} m²`
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{row?.name}</p>
      <p className="mt-1 text-surface-200">
        {row?.pct}% · {areaLabel}
      </p>
    </div>
  )
}

function formatLandUsePct(v) {
  if (!Number.isFinite(Number(v))) return ''
  const n = Number(v)
  if (n > 0 && n < 0.1) return '<0.1%'
  return `${n}%`
}

function scatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">Hex Cell #{row?.id ?? '—'}</p>
      <p className="mt-1 text-surface-200">Entropy: {formatMaturationValue(row?.entropy)}</p>
      <p className="text-surface-200">UMI: {formatMaturationValue(row?.umi)}</p>
    </div>
  )
}

const MIX_LABEL_RADIAN = Math.PI / 180

function renderMixSliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, pct }) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * MIX_LABEL_RADIAN)
  const y = cy + radius * Math.sin(-midAngle * MIX_LABEL_RADIAN)
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

function mixTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{row?.name}</p>
      <p className="mt-1 text-surface-200">
        {row?.value} hexes ({row?.pct}%)
      </p>
    </div>
  )
}

function scatterDot(props) {
  const { cx, cy } = props
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={4} fill={SHANNON_ACCENT} />
}

/** Left panel — Land Use & Mix Analysis. */
export default function LandUseMixPanel({ stats, loading, onFocusCell }) {
  const barAnim = useChartAnimation()
  const pieAnim = useChartAnimation()
  const scatterAnim = useChartAnimation()
  const composition = stats?.landUseComposition ?? []
  const scatter = stats?.scatter ?? []
  const entropy = stats?.entropyRaw
  const mixedUse = stats?.mixedUse
  const mix = stats?.hexFunctionalMix
  const monoMulti = mix?.monoMulti ?? []
  const functionalComposition = mix?.functionalComposition ?? []
  const liveWorkPct = mix?.liveWorkPct

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="border-l-4 border-[#10b981] pl-3 font-display text-lg font-semibold text-surface-50">
          Land Use & Mix Analysis
        </h2>
        <MetricInfoButton
          title="Land Use & Mix Analysis"
          points={[
            'This panel shows what land is used for, how mixed neighbourhood cells are, and how that mix relates to Urban Maturation.',
            'Shannon Entropy = how balanced the mix of uses is. Mixed Use Index = how many different functions sit together. Land Use Diversity (on the Maturation panel) = variety of functional categories.',
            'UMI on the Maturation tab combines entropy, network accessibility, and land-use diversity into one “how complete is this place?” score.',
          ]}
          ariaLabel="What does Land Use and Mix Analysis show?"
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading maturation data…</p>
      )}

      {/* Land Use Composition */}
      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">
            Land Use Composition — Primary Study Area
          </h3>
          <MetricInfoButton
            title="Land Use Composition"
            points={[
              'How much ground area falls in each land-use category across the primary study area (same categories as the Overview land-use map).',
              'Longer bars mean more area in that category; the percent labels are each category’s share of the total mapped land-use area.',
              'Colours match the Overview land-use map.',
            ]}
            ariaLabel="What does Land Use Composition show?"
          />
        </div>
        <div
          className="mt-3"
          style={{ height: Math.max(320, (composition.length || 8) * 32) }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={composition}
              margin={{ top: 4, right: 56, left: 4, bottom: 28 }}
            >
              <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#9fadb9', fontSize: 11 }}
                axisLine={{ stroke: '#2a3a4a' }}
                tickLine={false}
                label={{
                  value: 'Area (m²)',
                  position: 'insideBottom',
                  offset: -16,
                  fill: '#9fadb9',
                  fontSize: 12,
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={128}
                interval={0}
                tick={{ fill: '#9fadb9', fontSize: 11 }}
                axisLine={{ stroke: '#2a3a4a' }}
                tickLine={false}
              />
              <Tooltip content={landUseTooltip} />
              <Bar
                dataKey="area"
                radius={[0, 4, 4, 0]}
                isAnimationActive={barAnim.isAnimationActive}
                animationDuration={barAnim.animationDuration}
                animationEasing={barAnim.animationEasing}
                onAnimationEnd={barAnim.onAnimationEnd}
              >
                {composition.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
                <DeferredLabelList
                  showLabels={barAnim.showLabels}
                  dataKey="pct"
                  position="right"
                  formatter={formatLandUsePct}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Land Use Mix by Hex Cell */}
      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">
            Land Use Mix by Hex Cell
          </h3>
          <MetricInfoButton
            title="Land Use Mix by Hex Cell"
            points={[
              'Groups land uses into four everyday functions: Living, Working, Culture, and Movement.',
              'Charts count neighbourhood cells that are mostly complete; thin scrap cells on the boundary are left out.',
              'Cells with more than one function count as Mixed Use. Live + Work is highlighted because homes and jobs together support walkability and street life.',
            ]}
            ariaLabel="What does Land Use Mix by Hex Cell show?"
          />
        </div>
        <p className="mt-1 text-xs text-surface-300">
          Based on distinct land-use types per mostly complete neighbourhood cell (≥90% filled)
        </p>

        {/* Component 1 — Land Use Mix Distribution */}
        <div className="mt-4">
          <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-surface-200">
            Land Use Mix Distribution
          </h4>
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={monoMulti}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                  isAnimationActive={pieAnim.isAnimationActive}
                  animationDuration={pieAnim.animationDuration}
                  animationEasing={pieAnim.animationEasing}
                  onAnimationEnd={pieAnim.onAnimationEnd}
                  label={(props) => (pieAnim.showLabels ? renderMixSliceLabel(props) : null)}
                  labelLine={false}
                >
                  {monoMulti.map((row) => (
                    <Cell key={row.name} fill={row.color} />
                  ))}
                </Pie>
                <Tooltip content={mixTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-4 text-sm text-surface-200">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#FFFAF0]" />
              Single Use Hex - Mono functional (1 land use type)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#F38E7E]" />
              Mixed Use Hex - multi functional (2+ land use types)
            </span>
          </div>
        </div>

        {/* Component 2 — Functional Composition by Hex */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-surface-200">
              Functional Composition by Hex
            </h4>
            <MetricInfoButton
              title="Functional Composition by Hex"
              points={[
                'This bar shows how neighbourhood cells split between homes-only, jobs-only, Live + Work, and other mixes.',
                'Live + Work (homes and jobs together) is highlighted — it usually means less travel, livelier streets, and a more complete neighbourhood.',
                liveWorkPct != null
                  ? `In the primary study area, Live + Work accounts for ${liveWorkPct}% (${mix?.liveWorkCount ?? 0} cells we can measure reliably).`
                  : 'Live + Work share will appear once maturation data loads.',
              ]}
              ariaLabel="What does Functional Composition by Hex show?"
            />
          </div>
          <div className="mt-3 flex h-10 w-full overflow-hidden rounded">
            {(functionalComposition.length
              ? functionalComposition
              : [
                  { id: 'liveOnly', name: 'Live only', pct: 20, color: '#fa9f00' },
                  { id: 'workOnly', name: 'Work only', pct: 20, color: '#a5b4fc' },
                  { id: 'liveWork', name: 'Live + Work', pct: 20, color: '#86efac' },
                  { id: 'liveWorkCulture', name: 'Live + Work + Culture', pct: 20, color: '#fde68a' },
                  { id: 'movement', name: 'Movement dominated', pct: 10, color: '#94a3b8' },
                  { id: 'other', name: 'Other combinations', pct: 10, color: '#334155' },
                ]
            ).map((zone) => {
              const pct = zone.pct ?? 0
              if (pct <= 0) return null
              const isLiveWork = zone.id === 'liveWork'
              return (
                <div
                  key={zone.name}
                  style={{ width: `${pct}%`, backgroundColor: zone.color }}
                  className={`relative flex items-center justify-center ${
                    isLiveWork ? 'z-10 ring-2 ring-inset ring-white/90 shadow-[0_0_12px_rgba(20,184,166,0.55)]' : ''
                  }`}
                >
                  {pct > 8 && (
                    <span className="select-none text-sm font-bold text-black/70">{pct}%</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            {functionalComposition.map((zone) => {
              const isLiveWork = zone.id === 'liveWork'
              return (
                <div
                  key={zone.id}
                  className={`flex items-center gap-2 text-sm ${
                    isLiveWork
                      ? 'rounded-md border-l-4 border-l-[#14b8a6] bg-[#14b8a6]/10 py-1.5 pl-2 pr-1 font-medium text-surface-50'
                      : 'text-surface-200'
                  }`}
                >
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-sm"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="flex-1">
                    {zone.name}
                    {isLiveWork && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[#14b8a6]">
                        Key mix
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-surface-100">
                    {zone.pct}% ({zone.count})
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Shannon Entropy */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">
            Shannon Entropy Index
          </h3>
          <MetricInfoButton
            title="Shannon Entropy Index"
            points={[
              'How balanced the mix of land uses is in each neighbourhood cell — not just how many uses, but whether they share the space fairly.',
              'Higher entropy means a more even mix (often livelier streets). This is the “balance” measure; Mixed Use Index is the “how many functions” measure.',
              'Click Minimum / Highest Cell ID to fly to that cell on the map.',
            ]}
            ariaLabel="What is Shannon Entropy?"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Min"
            value={formatMaturationValue(entropy?.min)}
            topBorderColor={SHANNON_ACCENT}
          />
          <DensityStatCard
            label="Max"
            value={formatMaturationValue(entropy?.max)}
            topBorderColor={SHANNON_ACCENT}
          />
          <DensityStatCard
            label="Average"
            value={formatMaturationValue(entropy?.avg)}
            topBorderColor={SHANNON_ACCENT}
          />
          <DensityStatCard
            label="Cells above median"
            value={stats?.cellsAboveMedian != null ? String(stats.cellsAboveMedian) : '—'}
            topBorderColor={SHANNON_ACCENT}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Minimum Cell ID"
            value={entropy?.lowestId != null ? String(entropy.lowestId) : '—'}
            topBorderColor={SHANNON_ACCENT}
            interactive={entropy?.lowestId != null}
            onClick={() => onFocusCell?.('entropy', entropy.lowestId)}
          />
          <DensityStatCard
            label="Highest Cell ID"
            value={entropy?.highestId != null ? String(entropy.highestId) : '—'}
            topBorderColor={SHANNON_ACCENT}
            interactive={entropy?.highestId != null}
            onClick={() => onFocusCell?.('entropy', entropy.highestId)}
          />
        </div>
      </div>

      {/* Entropy vs UMI scatter */}
      <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-50">
            Entropy vs Urban Maturation Score
          </h3>
          <MetricInfoButton
            title="Entropy vs Urban Maturation Score"
            points={[
              'Each dot is one neighbourhood cell we can measure reliably in the primary study area.',
              'Left–right is land-use mix balance (Shannon Entropy); up–down is overall Urban Maturation (UMI).',
              'A rising cloud of dots means places with a more balanced mix of uses tend to score higher on maturation.',
            ]}
            ariaLabel="What does the entropy scatter show?"
          />
        </div>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 12, left: 8, bottom: 28 }}>
              <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="entropy"
                name="Entropy"
                tick={{ fill: '#9fadb9', fontSize: 11 }}
                axisLine={{ stroke: '#2a3a4a' }}
                tickLine={false}
                label={{
                  value: 'Shannon Entropy',
                  position: 'insideBottom',
                  offset: -14,
                  fill: '#9fadb9',
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="umi"
                name="UMI"
                tick={{ fill: '#9fadb9', fontSize: 11 }}
                axisLine={{ stroke: '#2a3a4a' }}
                tickLine={false}
                width={40}
                label={{
                  value: 'UMI',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9fadb9',
                  fontSize: 12,
                }}
              />
              <Tooltip content={scatterTooltip} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                data={scatter}
                shape={scatterDot}
                isAnimationActive={scatterAnim.isAnimationActive}
                animationDuration={scatterAnim.animationDuration}
                animationEasing={scatterAnim.animationEasing}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mixed Use Index */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">Mixed Use Index</h3>
          <MetricInfoButton
            title="Mixed Use Index"
            points={[
              'How many different land-use functions sit together in each neighbourhood cell — a simple “is this place single-use or mixed?” score.',
              'Higher values mean more functions share the same cell. This is related to, but not the same as, Shannon Entropy (balance) or UMI (overall maturation).',
              'Click Minimum / Highest Cell ID to fly to that cell on the map.',
            ]}
            ariaLabel="What is Mixed Use Index?"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DensityStatCard
            label="Min"
            value={formatMaturationValue(mixedUse?.min)}
            topBorderColor="#14b8a6"
          />
          <DensityStatCard
            label="Max"
            value={formatMaturationValue(mixedUse?.max)}
            topBorderColor="#14b8a6"
          />
          <DensityStatCard
            label="Average"
            value={formatMaturationValue(mixedUse?.avg)}
            topBorderColor="#14b8a6"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Minimum Cell ID"
            value={mixedUse?.lowestId != null ? String(mixedUse.lowestId) : '—'}
            topBorderColor="#14b8a6"
            interactive={mixedUse?.lowestId != null}
            onClick={() => onFocusCell?.('umi', mixedUse.lowestId)}
          />
          <DensityStatCard
            label="Highest Cell ID"
            value={mixedUse?.highestId != null ? String(mixedUse.highestId) : '—'}
            topBorderColor="#14b8a6"
            interactive={mixedUse?.highestId != null}
            onClick={() => onFocusCell?.('umi', mixedUse.highestId)}
          />
        </div>
      </div>
    </div>
  )
}
