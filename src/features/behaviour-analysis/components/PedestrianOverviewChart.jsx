import MetricInfoButton from '../../../components/focusArea/MetricInfoButton.jsx'
import DeferredLabelList from '../../../components/DeferredLabelList.jsx'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_TICK, JUNCTION_COLORS, PERIOD_LABELS, PERIOD_ORDER } from '../data/colors'
import { pedestrianByPeriodAllJunctions } from '../utils/aggregations'
import useChartAnimation from '../../../hooks/useChartAnimation.js'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm shadow-card">
      <p className="mb-1 font-medium text-surface-50">{PERIOD_LABELS[label] ?? label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString('en-US')}
        </p>
      ))}
    </div>
  )
}

export default function PedestrianOverviewChart({ dayFilter }) {
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation()
  const data = pedestrianByPeriodAllJunctions(dayFilter)

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-3 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-display text-base font-semibold text-surface-50">
          Pedestrian Count — All Junctions
        </h3>
        <MetricInfoButton
          title="Pedestrian Count — All Junctions"
          ariaLabel="What does the Pedestrian Count chart show?"
          points={[
            'Shows pedestrian counts at all four junctions across Morning, Midday, and Evening.',
            'Responds to the Weekday/Weekend day filter; always shows all three periods.',
            'Each colour is one junction (J1–J4), matching the map legend.',
            'Taller bars mean more pedestrians counted in that period.',
          ]}
        />
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={(p) =>
                p === 'morning' ? 'Morning' : p === 'midday' ? 'Midday' : 'Evening'
              }
              tick={CHART_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#e0e0e0' }}
              formatter={(value) => value}
            />
            {[1, 2, 3, 4].map((id) => (
              <Bar
                key={id}
                dataKey={`j${id}`}
                name={`J${id}`}
                fill={JUNCTION_COLORS[id]}
                radius={[2, 2, 0, 0]}
                isAnimationActive={isAnimationActive}
                animationDuration={animationDuration}
                animationEasing={animationEasing}
                onAnimationEnd={onAnimationEnd}
              >
                <DeferredLabelList
                  showLabels={showLabels}
                  dataKey={`j${id}`}
                  position="top"
                  formatter={(v) => (v > 0 ? v : '')}
                  style={{ fontSize: 9 }}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 rounded-md border border-[#dc2626]/40 bg-[#dc2626]/10 px-2.5 py-1.5 text-xs font-semibold text-surface-50">
        Responds to day filter · shows all {PERIOD_ORDER.length} periods
      </p>
    </div>
  )
}
