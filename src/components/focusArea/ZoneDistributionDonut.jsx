import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import useChartAnimation from '../../hooks/useChartAnimation.js'

const PLACEHOLDER_ZONES = [
  { name: 'High',   count: 0, pct: 33 },
  { name: 'Medium', count: 0, pct: 34 },
  { name: 'Low',    count: 0, pct: 33 },
]

function renderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{d?.name}</p>
      <p className="mt-1 text-surface-200">{d?.pct}% of segments</p>
      {d?.count > 0 && <p className="text-surface-400">{d.count} segments</p>}
    </div>
  )
}

const RADIAN = Math.PI / 180
const MIN_LABEL_PERCENT = 0.08

function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, pct }) {
  if (percent != null && percent < MIN_LABEL_PERCENT) return null
  if (pct != null && pct < MIN_LABEL_PERCENT * 100) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const value = pct != null ? Math.round(pct) : Math.round(percent * 100)
  return (
    <text
      className="chart-value-label"
      x={x}
      y={y}
      fill="#ffffff"
      stroke="#0f1923"
      strokeWidth={3}
      paintOrder="stroke"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {`${value}%`}
    </text>
  )
}

/**
 * Donut chart showing the proportion of road segments in each zone
 * (High / Medium / Low) for the currently active scale.
 */
export default function ZoneDistributionDonut({ title, zones, colors }) {
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation()
  const isPlaceholder = !zones
  const data = isPlaceholder ? PLACEHOLDER_ZONES : zones

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <h3 className="font-display text-sm font-semibold text-surface-50">{title}</h3>
      {isPlaceholder && (
        <p className="mt-0.5 text-[10px] text-surface-400">Placeholder — awaiting GeoJSON</p>
      )}

      <div className="mt-2 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="pct"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={2}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
              onAnimationEnd={onAnimationEnd}
              labelLine={false}
              label={(props) => (showLabels ? renderLabel(props) : null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index] ?? '#9fadb9'}
                  opacity={isPlaceholder ? 0.35 : 1}
                />
              ))}
            </Pie>
            <Tooltip content={renderTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Zone legend below the donut */}
      <div className="mt-2 flex justify-around text-[10px] text-surface-300">
        {data.map((zone, i) => (
          <div key={zone.name} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: colors[i] ?? '#9fadb9', opacity: isPlaceholder ? 0.4 : 1 }}
            />
            {zone.name}
          </div>
        ))}
      </div>
    </div>
  )
}
