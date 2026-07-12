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
import { formatMetricValue } from '../../utils/centralityStats.js'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import ChartHint from './ChartHint.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'

function renderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{row?.label}</p>
      {row?.id != null && (
        <p className="mt-0.5 text-[10px] text-surface-400">Segment #{row.id}</p>
      )}
      <p className="mt-1 text-surface-200">{formatMetricValue(row?.value)}</p>
    </div>
  )
}

/**
 * Horizontal bar chart for top road segments by centrality metric.
 * Clicking a bar calls onBarClick(segmentId) so the map can fly to it.
 */
export default function CentralityBarChart({
  title,
  data,
  barColor,
  isPlaceholder = false,
  onBarClick,
  infoTitle,
  infoPoints,
  infoAria,
}) {
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation()
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">{title}</h3>
        {infoTitle && infoPoints?.length > 0 && (
          <MetricInfoButton title={infoTitle} points={infoPoints} ariaLabel={infoAria} />
        )}
      </div>
      {isPlaceholder && <ChartHint muted>Placeholder — awaiting GeoJSON</ChartHint>}
      {!isPlaceholder && onBarClick && (
        <ChartHint>Click a bar to locate on map</ChartHint>
      )}
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 40, left: 4, bottom: 8 }}
            barCategoryGap="18%"
          >
            <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#9fadb9', fontSize: 10 }} axisLine={{ stroke: '#2a3a4a' }} />
            <YAxis
              type="category"
              dataKey="label"
              width={48}
              tick={{ fill: '#9fadb9', fontSize: 9 }}
              axisLine={{ stroke: '#2a3a4a' }}
              tickLine={false}
            />
            <Tooltip content={renderTooltip} />
            <Bar
              dataKey="value"
              fill={barColor}
              radius={[0, 4, 4, 0]}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
              onAnimationEnd={onAnimationEnd}
              cursor={onBarClick ? 'pointer' : 'default'}
              onClick={(data) => onBarClick?.(data?.id)}
            >
              <DeferredLabelList
                showLabels={showLabels}
                dataKey="value"
                position="right"
                formatter={(v) => (v > 0 ? formatMetricValue(v) : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
