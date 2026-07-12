import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DeferredLabelList from '../DeferredLabelList.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import ChartHint from './ChartHint.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'

const SCALE_TICK_LABELS = { 500: '500m', 2000: '2km', 3000: '3km', 5000: '5km' }

function renderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{SCALE_TICK_LABELS[row?.scale] ?? row?.scale}</p>
      <p className="mt-1 text-surface-200">Avg: {row?.avg != null ? row.avg.toFixed(4) : '—'}</p>
    </div>
  )
}

/**
 * Four-bar chart comparing the average metric value across all four analysis scales.
 * All bars share a single flat barColor.
 */
export default function ScaleComparisonChart({
  title,
  data,
  barColor,
  infoTitle,
  infoPoints,
  infoAria,
}) {
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation()
  const isPlaceholder = !data?.length || data.every((d) => d.avg === 0)

  const chartData = isPlaceholder
    ? [
        { scale: 500, avg: 0 },
        { scale: 2000, avg: 0 },
        { scale: 3000, avg: 0 },
        { scale: 5000, avg: 0 },
      ]
    : data

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">{title}</h3>
        {infoTitle && infoPoints?.length > 0 && (
          <MetricInfoButton title={infoTitle} points={infoPoints} ariaLabel={infoAria} />
        )}
      </div>
      <ChartHint muted={isPlaceholder}>
        {isPlaceholder
          ? 'Placeholder — loading cross-scale data'
          : 'Overall average across all road segments for each analysis scale'}
      </ChartHint>
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 28, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="scale"
              tickFormatter={(s) => SCALE_TICK_LABELS[s] ?? s}
              tick={{ fill: '#9fadb9', fontSize: 10 }}
              axisLine={{ stroke: '#2a3a4a' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => v.toFixed(4)}
              tick={{ fill: '#9fadb9', fontSize: 9 }}
              axisLine={{ stroke: '#2a3a4a' }}
              tickLine={false}
              width={52}
            />
            <Tooltip content={renderTooltip} />
            <Bar
              dataKey="avg"
              fill={barColor}
              radius={[4, 4, 0, 0]}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
              onAnimationEnd={onAnimationEnd}
            >
              <DeferredLabelList
                showLabels={showLabels}
                dataKey="avg"
                position="top"
                formatter={(v) => (v > 0 ? v.toFixed(4) : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
