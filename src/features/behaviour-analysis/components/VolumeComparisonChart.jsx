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
import MetricInfoButton from '../../../components/focusArea/MetricInfoButton.jsx'
import useChartAnimation from '../../../hooks/useChartAnimation.js'
import { CHART_TICK, JUNCTION_COLORS } from '../data/colors'
import { allJunctionVolumes } from '../utils/aggregations'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm shadow-card">
      <p className="font-medium text-surface-50">{row.name}</p>
      <p className="text-surface-200">{row.vehicles.toLocaleString('en-US')} vehicles</p>
    </div>
  )
}

export default function VolumeComparisonChart({ dayFilter, periodFilter }) {
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation()
  const data = allJunctionVolumes(dayFilter, periodFilter)
    .map((v) => ({
      ...v,
      shortName: `J${v.junctionId}`,
      color: JUNCTION_COLORS[v.junctionId],
    }))
    .sort((a, b) => b.vehicles - a.vehicles)

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-3 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-display text-base font-semibold text-surface-50">
          Total Volume Comparison
        </h3>
        <MetricInfoButton
          title="Total Volume Comparison"
          ariaLabel="What does Total Volume Comparison show?"
          points={[
            'Compares total vehicle counts across the four survey junctions.',
            'Values respond to the Weekday/Weekend and time-period filters above.',
            'Longer bars mean higher traffic volume for that junction.',
            'Junction colours match the map markers and legend.',
          ]}
        />
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 52, left: 4, bottom: 0 }}>
            <XAxis type="number" tick={CHART_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="shortName"
              width={32}
              tick={CHART_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar
              dataKey="vehicles"
              radius={[0, 4, 4, 0]}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
              onAnimationEnd={onAnimationEnd}
            >
              {data.map((row) => (
                <Cell key={row.junctionId} fill={row.color} />
              ))}
              <DeferredLabelList
                showLabels={showLabels}
                dataKey="vehicles"
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
