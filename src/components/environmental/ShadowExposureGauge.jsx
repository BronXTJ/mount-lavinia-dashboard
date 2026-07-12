import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import { SHADOW_COLOR } from '../../constants/environmental.js'
import { formatShadowPercent } from '../../utils/environmentalStats.js'
import { ENV_INFO } from './environmentalInfoContent.js'

/**
 * Shadow exposure gauge — mean fraction of modelled hours in shadow (% in centre).
 */
export default function ShadowExposureGauge({ shadow, shadowMeta }) {
  const { isAnimationActive, animationDuration } = useChartAnimation()
  const mean = shadow?.avg
  const hasData = Number.isFinite(mean)
  const fill = hasData ? Math.max(0, Math.min(100, mean * 100)) : 0
  const data = [{ name: 'Shadow', value: fill, fill: SHADOW_COLOR }]

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">Shadow Exposure Gauge</h3>
        <MetricInfoButton
          title={ENV_INFO.shadowGauge.title}
          points={ENV_INFO.shadowGauge.points}
          ariaLabel={ENV_INFO.shadowGauge.ariaLabel}
        />
      </div>
      <p className="mt-1 text-xs text-surface-300">
        Mean share of modelled daylight hours in shadow across the 10 m grid
      </p>
      {shadowMeta?.date && (
        <p className="mt-0.5 text-[11px] text-surface-400">
          {shadowMeta.date} · {shadowMeta.hours}
        </p>
      )}

      {!hasData ? (
        <p className="mt-6 text-center text-xs text-surface-400">No shadow values yet</p>
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
                {formatShadowPercent(mean, 0)}
              </p>
              <p className="mt-0.5 text-sm font-semibold tracking-wide" style={{ color: SHADOW_COLOR }}>
                mean exposure
              </p>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-sm font-semibold tabular-nums text-surface-100">
            <span className="text-[#e4d0cb]">Sunlit · 0%</span>
            <span className="text-[#7a5f56]">Shaded · 100%</span>
          </div>
          <p className="mt-2 text-center text-sm font-semibold tabular-nums text-surface-50">
            Range {formatShadowPercent(shadow?.min, 0)} – {formatShadowPercent(shadow?.max, 0)}
          </p>
        </>
      )}
    </div>
  )
}
