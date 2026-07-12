import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import useChartAnimation from '../hooks/useChartAnimation.js'

const DEFAULT_COLORS = ['#00b4d8', '#f77f00', '#a78bfa', '#34d399', '#fbbf24', '#38bdf8', '#fb7185', '#a3e635', '#94a3b8']

function renderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-md border border-surface-700 bg-surface-850 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{item.name}</p>
      <p className="text-surface-200">{item.value}%</p>
    </div>
  )
}

const RADIAN = Math.PI / 180
// Skip labels on very thin slices — they'd overlap and become unreadable;
// the tooltip and legend still cover those.
const MIN_LABEL_PERCENT = 0.08

function renderSliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < MIN_LABEL_PERCENT) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
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
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

/**
 * Generic donut (ring) chart built on Recharts.
 *
 * Props:
 * - data: [{ name, value }]
 * - colors: optional array of hex colors, one per data entry (falls back to DEFAULT_COLORS)
 * - height: chart height in px
 */
export default function DonutChart({ data, colors = DEFAULT_COLORS, height = 260 }) {
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation()
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="#1a2535"
            strokeWidth={2}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            onAnimationEnd={onAnimationEnd}
            label={(props) => (showLabels ? renderSliceLabel(props) : null)}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend — Recharts' built-in <Legend> silently re-sorts items
          alphabetically, which breaks the intentional category ordering. */}
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-1.5 text-xs text-surface-200">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
              aria-hidden="true"
            />
            {entry.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

export { DEFAULT_COLORS }
