import MetricInfoButton from '../../../components/focusArea/MetricInfoButton.jsx'
import { VEHICLE_TYPE_COLORS, VEHICLE_TYPE_LABELS, VEHICLE_TYPE_ORDER } from '../data/colors'
import { vehicleTypeBreakdown } from '../utils/aggregations'

export default function VehicleTypeBreakdown({ junctionId, dayFilter, periodFilter }) {
  const { total, segments } = vehicleTypeBreakdown(junctionId, dayFilter, periodFilter)

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-3 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-display text-base font-semibold text-surface-50">
          Vehicle Type Breakdown
        </h3>
        <MetricInfoButton
          title="Vehicle Type Breakdown"
          ariaLabel="What does Vehicle Type Breakdown show?"
          points={[
            'Shows the mix of vehicle types from the type survey at the selected junction.',
            'Private includes cars, vans, jeeps, lorries, and buses.',
            'The segmented bar and percentages respond to day and period filters.',
            'Total at the bottom is the sum of all typed vehicles for this filter.',
          ]}
        />
      </div>

      <div className="flex h-4 w-full overflow-hidden rounded-md bg-surface-700">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.type}
              style={{
                width: `${s.pct}%`,
                backgroundColor: VEHICLE_TYPE_COLORS[s.type],
              }}
              title={`${VEHICLE_TYPE_LABELS[s.type] ?? s.type}: ${s.count}`}
            />
          ) : null,
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
        {VEHICLE_TYPE_ORDER.map((type) => {
          const seg = segments.find((s) => s.type === type)
          return (
            <div
              key={type}
              className="flex items-start gap-2 rounded-md border border-surface-700/60 bg-surface-900/40 px-2 py-1.5 text-xs text-surface-200"
            >
              <span
                className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: VEHICLE_TYPE_COLORS[type] }}
              />
              <span className="min-w-0 flex-1 leading-snug">
                {VEHICLE_TYPE_LABELS[type] ?? type}
              </span>
              <span className="ml-1 shrink-0 font-medium tabular-nums text-surface-50">
                {(seg?.count ?? 0).toLocaleString('en-US')}
                <span className="ml-1 text-surface-200">
                  ({(seg?.pct ?? 0).toFixed(0)}%)
                </span>
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 rounded-md border border-[#dc2626]/40 bg-[#dc2626]/10 px-2.5 py-1.5 text-xs font-semibold text-surface-50">
        Total {(total ?? 0).toLocaleString('en-US')} vehicles (type survey)
      </p>
    </div>
  )
}
