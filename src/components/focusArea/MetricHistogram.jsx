import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DeferredLabelList from '../DeferredLabelList.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import MetricInfoButton from './MetricInfoButton.jsx'

function renderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{row?.label}</p>
      <p className="mt-1 text-surface-200">{row?.count} cells</p>
    </div>
  )
}

/** Quantile class distribution — bar colors match map / legend when bins include `color`. */
export default function MetricHistogram({
  title,
  data,
  barColor = '#e879f9',
  infoTitle,
  infoPoints,
  infoAria,
}) {
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation()
  const chartData = data?.length
    ? data
    : [{ label: '—', count: 0, color: barColor }]

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">{title}</h3>
        {infoTitle && infoPoints?.length > 0 && (
          <MetricInfoButton title={infoTitle} points={infoPoints} ariaLabel={infoAria} />
        )}
      </div>
      <div className="mt-3 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 22, right: 8, left: 0, bottom: 24 }}>
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
            <Tooltip content={renderTooltip} />
            <Bar
              dataKey="count"
              fill={barColor}
              radius={[4, 4, 0, 0]}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
              onAnimationEnd={onAnimationEnd}
            >
              {chartData.map((row, i) => (
                <Cell key={`cell-${row.label ?? i}`} fill={row.color ?? barColor} />
              ))}
              <DeferredLabelList
                showLabels={showLabels}
                dataKey="count"
                position="top"
                formatter={(v) => (v > 0 ? v : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
