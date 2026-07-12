import MetricInfoButton from '../../../components/focusArea/MetricInfoButton.jsx'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DeferredLabelList from '../../../components/DeferredLabelList.jsx'
import { CHART_TICK, DIRECTION_COLORS } from '../data/colors'
import { vehiclesByDirection } from '../utils/aggregations'
import useChartAnimation from '../../../hooks/useChartAnimation.js'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm shadow-card">
      <p className="font-medium text-surface-50">Towards {row.direction}</p>
      <p className="text-surface-200">{row.count.toLocaleString('en-US')} vehicles</p>
    </div>
  )
}

export default function DirectionFlowChart({ junctionId, dayFilter, periodFilter }) {
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation()
  const data = vehiclesByDirection(junctionId, dayFilter, periodFilter).map((row) => ({
    ...row,
    color: DIRECTION_COLORS[row.direction] ?? '#38bdf8',
  }))

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-3 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-display text-base font-semibold text-surface-50">
          Vehicle Flow by Direction
        </h3>
        <MetricInfoButton
          title="Vehicle Flow by Direction"
          ariaLabel="What does Vehicle Flow by Direction show?"
          points={[
            'Shows vehicle counts by approach direction for the selected junction.',
            'Responds to Weekday/Weekend and Morning/Midday/Evening filters.',
            'Each bar is traffic moving towards that named direction.',
            'Compare bars to see which approach dominates at this junction.',
          ]}
        />
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 52, left: 4, bottom: 0 }}>
            <XAxis type="number" tick={CHART_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="direction"
              width={100}
              tick={CHART_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
              onAnimationEnd={onAnimationEnd}
            >
              {data.map((row) => (
                <Cell key={row.direction} fill={row.color} />
              ))}
              <DeferredLabelList
                showLabels={showLabels}
                dataKey="count"
                position="right"
                formatter={(v) => (v > 0 ? Number(v).toLocaleString('en-US') : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
