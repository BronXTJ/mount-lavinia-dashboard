import MetricInfoButton from '../../../components/focusArea/MetricInfoButton.jsx'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_TICK, JUNCTION_COLORS, PERIOD_LABELS } from '../data/colors'
import { vehiclesByPeriod } from '../utils/aggregations'
import useChartAnimation from '../../../hooks/useChartAnimation.js'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm shadow-card">
      <p className="mb-1 font-medium text-surface-50">{PERIOD_LABELS[label] ?? label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-surface-200">
          {p.name}: {Number(p.value).toLocaleString('en-US')}
        </p>
      ))}
    </div>
  )
}

/** Custom legend: solid Weekday vs dashed Weekend — clearly distinct. */
function SolidDashedLegend({ color }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-8 text-sm font-medium text-surface-50">
      <span className="flex items-center gap-2">
        <svg width="28" height="10" aria-hidden>
          <line x1="0" y1="5" x2="28" y2="5" stroke={color} strokeWidth="2.5" />
        </svg>
        Weekday
      </span>
      <span className="flex items-center gap-2">
        <svg width="28" height="10" aria-hidden>
          <line
            x1="0"
            y1="5"
            x2="28"
            y2="5"
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray="5 3"
          />
        </svg>
        Weekend
      </span>
    </div>
  )
}

export default function TimePeriodTrend({ junctionId }) {
  const { isAnimationActive, animationDuration } = useChartAnimation()
  const weekday = vehiclesByPeriod(junctionId, 'weekday')
  const weekend = vehiclesByPeriod(junctionId, 'weekend')
  const color = JUNCTION_COLORS[junctionId]

  const data = weekday.map((row, i) => ({
    period: row.period,
    Weekday: row.count,
    Weekend: weekend[i]?.count ?? 0,
  }))

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-3 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-display text-base font-semibold text-surface-50">
          Traffic Volume Across Time Periods
        </h3>
        <MetricInfoButton
          title="Traffic Volume Across Time Periods"
          ariaLabel="What does Traffic Volume Across Time Periods show?"
          points={[
            'Compares vehicle volume across Morning, Midday, and Evening for the selected junction.',
            'Solid line = Weekday; dashed line = Weekend (always both shown).',
            'Line colour matches the selected junction on the map.',
            'Use this to spot peak periods and weekday vs weekend differences.',
          ]}
        />
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
            <XAxis
              dataKey="period"
              tickFormatter={(p) =>
                p === 'morning' ? 'Morning' : p === 'midday' ? 'Midday' : 'Evening'
              }
              tick={CHART_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="Weekday"
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: color }}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
            />
            <Line
              type="monotone"
              dataKey="Weekend"
              stroke={color}
              strokeWidth={2.5}
              strokeDasharray="6 4"
              strokeOpacity={0.75}
              dot={{ r: 3.5, fill: color, fillOpacity: 0.75 }}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SolidDashedLegend color={color} />
      <p className="mt-2 rounded-md border border-[#dc2626]/40 bg-[#dc2626]/10 px-2.5 py-1.5 text-xs font-semibold text-surface-50">
        Always shows weekday (solid) and weekend (dashed)
      </p>
    </div>
  )
}
