import DonutChart from '../DonutChart.jsx'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import { ENV_INFO } from './environmentalInfoContent.js'

/**
 * Heat-stress class donut — share of cells in strong vs very strong stress.
 */
export default function StressClassDonut({ breakdown }) {
  const data = (breakdown ?? []).map((c) => ({
    name: c.label,
    value: c.pct,
    count: c.count,
  }))
  const colors = (breakdown ?? []).map((c) => c.color)
  const hasData = data.length > 0 && data.some((d) => d.value > 0)

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">Heat Stress Classes</h3>
        <MetricInfoButton
          title={ENV_INFO.stressDonut.title}
          points={ENV_INFO.stressDonut.points}
          ariaLabel={ENV_INFO.stressDonut.ariaLabel}
        />
      </div>
      <p className="mt-1 text-xs text-surface-300">
        Share of grid cells by model stress class (not continuous °C)
      </p>

      {!hasData ? (
        <p className="mt-6 text-center text-xs text-surface-400">No class data</p>
      ) : (
        <div className="mt-2">
          <DonutChart data={data} colors={colors} height={200} />
        </div>
      )}
    </div>
  )
}
