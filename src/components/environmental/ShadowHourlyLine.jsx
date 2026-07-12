import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import { SHADOW_COLOR } from '../../constants/environmental.js'
import { formatShadowPercent } from '../../utils/environmentalStats.js'
import { ENV_INFO } from './environmentalInfoContent.js'

function renderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{row?.label} LST</p>
      <p className="mt-0.5 text-surface-200">
        Area mean: {formatShadowPercent(row?.value, 0)} in shadow
      </p>
    </div>
  )
}

/** Area-mean shadow fraction by hour (07–18 LST). */
export default function ShadowHourlyLine({ data, shadowMeta }) {
  const { isAnimationActive, animationDuration } = useChartAnimation()
  const chartData = (data ?? []).map((row) => ({
    ...row,
    pct: row.value != null ? row.value * 100 : null,
  }))
  const hasData = chartData.length > 0

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">
          Shadow Through the Day
        </h3>
        <MetricInfoButton
          title={ENV_INFO.shadowHourly.title}
          points={ENV_INFO.shadowHourly.points}
          ariaLabel={ENV_INFO.shadowHourly.ariaLabel}
        />
      </div>
      <p className="mt-1 text-xs text-surface-300">
        Area-wide mean share of cells in shadow each hour
      </p>
      {shadowMeta?.date && (
        <p className="mt-0.5 text-[11px] text-surface-400">
          {shadowMeta.date} · {shadowMeta.hours}
        </p>
      )}

      {!hasData ? (
        <p className="mt-6 text-center text-xs text-surface-400">No hourly shadow series yet</p>
      ) : (
        <>
          <div className="mt-3 h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={36}
                />
                <Tooltip content={renderTooltip} />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke={SHADOW_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: SHADOW_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: SHADOW_COLOR }}
                  isAnimationActive={isAnimationActive}
                  animationDuration={animationDuration}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[11px] text-surface-400">
            Higher line = more of the study area in shadow at that hour
          </p>
        </>
      )}
    </div>
  )
}
