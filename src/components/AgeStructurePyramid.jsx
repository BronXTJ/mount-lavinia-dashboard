import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import useChartAnimation from '../hooks/useChartAnimation.js'
import {
  AGE_BAND_ORDER,
  ageShares,
  bandLabel,
  studyAreaTotals,
} from '../utils/populationStructure.js'

const LEFT_COLOR = '#38bdf8'
const RIGHT_COLOR = '#a78bfa'
const SMALL_BAR_PX = 35

function PyramidTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-md border border-surface-700 bg-surface-850 px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-surface-50">{row.label}</p>
      <p style={{ color: LEFT_COLOR }}>
        {row.leftName}: {row.leftPct.toFixed(1)}%
        <span className="text-surface-300"> ({row.leftCount.toLocaleString()})</span>
      </p>
      <p style={{ color: RIGHT_COLOR }}>
        Primary study area avg: {row.rightPct.toFixed(1)}%
        <span className="text-surface-300"> ({row.rightCount.toLocaleString()})</span>
      </p>
    </div>
  )
}

/**
 * Inside wide bars; outside narrow ones. dy separates left/right when both are small.
 */
function renderSmartLabel({ x, y, width, height, value, dy = 0, showLabels }) {
  if (!showLabels) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  if (x == null || y == null || width == null || height == null) return null

  const isSmall = Math.abs(width) < SMALL_BAR_PX
  const isLeftBar = width < 0

  const labelX = isSmall
    ? isLeftBar
      ? x + width - 6
      : x + Math.abs(width) + 6
    : x + width / 2

  const labelY = y + height / 2 + 4 + dy
  const textAnchor = isSmall ? (isLeftBar ? 'end' : 'start') : 'middle'

  return (
    <text
      className="chart-value-label"
      x={labelX}
      y={labelY}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      fill={isSmall ? '#e0e0e0' : '#0f1923'}
      fontSize={11}
      fontFamily="Inter, sans-serif"
      fontWeight={500}
      pointerEvents="none"
    >
      {`${Math.round(n)}%`}
    </text>
  )
}

/**
 * Mirrored age pyramid — left = selected GN (or 5-GN total), right = primary study area average.
 */
export default function AgeStructurePyramid({ data, selectedGnName }) {
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation(selectedGnName ?? 'area')

  const area = studyAreaTotals(data)
  const areaShares = ageShares(area)
  const leftEntity = selectedGnName
    ? data.divisions.find((d) => d.name === selectedGnName) ?? area
    : area
  const leftShares = ageShares(leftEntity)
  const leftName = selectedGnName ?? 'Study area (5 GN)'

  const chartData = AGE_BAND_ORDER.map((id) => {
    const leftPct = leftShares[id] ?? 0
    const rightPct = areaShares[id] ?? 0
    return {
      id,
      label: bandLabel(data, id),
      left: -leftPct,
      right: rightPct,
      leftPct,
      rightPct,
      leftCount: leftEntity.age?.[id] ?? 0,
      rightCount: area.age?.[id] ?? 0,
      leftName,
    }
  })

  const maxPct = Math.max(
    ...chartData.flatMap((d) => [d.leftPct, d.rightPct]),
    1,
  )
  const domainMax = Math.ceil(maxPct / 5) * 5 + 5

  const renderLeftLabel = (props) =>
    renderSmartLabel({ ...props, dy: -6, showLabels })
  const renderRightLabel = (props) =>
    renderSmartLabel({ ...props, dy: 6, showLabels })

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-5 text-sm font-semibold text-surface-50">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: LEFT_COLOR }} />
          {leftName}
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: RIGHT_COLOR }} />
          Primary Study Area Average
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            stackOffset="sign"
            margin={{ top: 8, right: 36, left: 36, bottom: 8 }}
          >
            <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[-domainMax, domainMax]}
              tickFormatter={(v) => `${Math.abs(v)}%`}
              tick={{ fill: '#9fadb9', fontSize: 10 }}
              axisLine={{ stroke: '#2a3a4a' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={44}
              tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<PyramidTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar
              dataKey="left"
              stackId="pyramid"
              fill={LEFT_COLOR}
              radius={[4, 0, 0, 4]}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
              onAnimationEnd={onAnimationEnd}
            >
              {chartData.map((row) => (
                <Cell key={`l-${row.id}`} fill={LEFT_COLOR} />
              ))}
              <LabelList dataKey="leftPct" content={renderLeftLabel} />
            </Bar>
            <Bar
              dataKey="right"
              stackId="pyramid"
              fill={RIGHT_COLOR}
              radius={[0, 4, 4, 0]}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
              onAnimationEnd={onAnimationEnd}
            >
              {chartData.map((row) => (
                <Cell key={`r-${row.id}`} fill={RIGHT_COLOR} />
              ))}
              <LabelList dataKey="rightPct" content={renderRightLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!selectedGnName && (
        <p className="mt-1 text-center text-[11px] text-surface-400">
          Select a GN on the map to compare its age structure with the primary study area average
        </p>
      )}
    </div>
  )
}
