import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import { formatEnvValue } from '../../utils/environmentalStats.js'
import { ENV_INFO } from './environmentalInfoContent.js'

function renderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const unit = row?.unit ? ` ${row.unit}` : ''
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{row?.fullLabel ?? row?.axis}</p>
      <p className="mt-0.5 text-surface-200">
        Mean: {formatEnvValue(row?.raw, 1)}
        {unit}
      </p>
      <p className="mt-0.5 text-surface-400">
        Relative score: {row?.value != null ? (row.value * 100).toFixed(0) : '—'}%
      </p>
    </div>
  )
}

/**
 * Microclimate driver radar — relative means across UTCI, UHI, air, Tmrt, wind, SVF.
 */
export default function DriverRadar({ radarMeans }) {
  const { isAnimationActive, animationDuration } = useChartAnimation()
  const data = radarMeans ?? []
  const hasData = data.some((d) => Number.isFinite(d.raw))

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">
          Microclimate Signature
        </h3>
        <MetricInfoButton
          title={ENV_INFO.driverRadar.title}
          points={ENV_INFO.driverRadar.points}
          ariaLabel={ENV_INFO.driverRadar.ariaLabel}
        />
      </div>
      <p className="mt-1 text-xs text-surface-300">
        Relative driver means — hover a spoke for real units
      </p>

      {!hasData ? (
        <p className="mt-6 text-center text-xs text-surface-400">No driver means yet</p>
      ) : (
        <div className="mt-2 h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
              <PolarGrid stroke="#475569" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: '#cbd5e1', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 1]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Means"
                dataKey="value"
                stroke="#00b4d8"
                fill="#00b4d8"
                fillOpacity={0.35}
                isAnimationActive={isAnimationActive}
                animationDuration={animationDuration}
              />
              <Tooltip content={renderTooltip} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
