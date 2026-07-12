import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import { formatEnvValue } from '../../utils/environmentalStats.js'
import { ENV_INFO } from './environmentalInfoContent.js'

const GAUGE_MIN = 26
const GAUGE_MAX = 48

/**
 * UTCI comfort gauge — mean °C in the centre, arc fill relative to heat band.
 */
export default function UtciComfortGauge({ utci }) {
  const { isAnimationActive, animationDuration } = useChartAnimation()
  const mean = utci?.avg
  const hasData = Number.isFinite(mean)
  const fill = hasData
    ? Math.max(0, Math.min(100, ((mean - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100))
    : 0
  const data = [{ name: 'UTCI', value: fill, fill: '#f46d43' }]

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">UTCI Comfort Gauge</h3>
        <MetricInfoButton
          title={ENV_INFO.utciGauge.title}
          points={ENV_INFO.utciGauge.points}
          ariaLabel={ENV_INFO.utciGauge.ariaLabel}
        />
      </div>
      <p className="mt-1 text-xs text-surface-300">
        Mean how-hot-it-feels temperature for the 10 m grid (°C)
      </p>

      {!hasData ? (
        <p className="mt-6 text-center text-xs text-surface-400">No UTCI values yet</p>
      ) : (
        <>
          <div className="relative mx-auto mt-2 h-[180px] w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="55%"
                innerRadius="68%"
                outerRadius="100%"
                startAngle={210}
                endAngle={-30}
                data={data}
                barSize={14}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="value"
                  cornerRadius={8}
                  background={{ fill: '#334155' }}
                  isAnimationActive={isAnimationActive}
                  animationDuration={animationDuration}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4">
              <p className="font-display text-4xl font-bold tabular-nums text-surface-50">
                {formatEnvValue(mean, 1)}
              </p>
              <p className="mt-0.5 text-sm font-semibold tracking-wide text-[#f46d43]">
                °C mean
              </p>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-sm font-semibold tabular-nums text-surface-100">
            <span className="text-[#74add1]">Cooler · {GAUGE_MIN} °C</span>
            <span className="text-[#f46d43]">Hotter · {GAUGE_MAX} °C</span>
          </div>
          <p className="mt-2 text-center text-sm font-semibold tabular-nums text-surface-50">
            Range {formatEnvValue(utci?.min, 1)} – {formatEnvValue(utci?.max, 1)} °C
          </p>
        </>
      )}
    </div>
  )
}
