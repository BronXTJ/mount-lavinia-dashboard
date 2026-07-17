/**
 * Generic KPI stat card used across the dashboard tabs.
 *
 * Props:
 * - label: string, small caption above the value (e.g. "Total Population")
 * - value: string | number, the headline stat (e.g. "24,650")
 * - unit: optional string shown after the value (e.g. "people", "km²")
 * - icon: optional React node (e.g. Lucide icon) rendered in a small chip
 * - trend: optional string shown as a small badge (e.g. "+3.2% since 2012")
 * - trendDirection: "up" | "down" | "neutral"
 * - accent: "primary" (teal) | "accent" (orange) - controls the top border + icon chip color
 * - footer: optional React node rendered under the value (e.g. a select control)
 */
export default function KPICard({
  label,
  value,
  unit,
  icon,
  trend,
  trendDirection = 'neutral',
  accent = 'primary',
  footer,
}) {
  const accentBorder = accent === 'accent' ? 'border-t-accent-500' : 'border-t-primary-500'
  const accentChip = accent === 'accent' ? 'bg-accent-500/10 text-accent-400' : 'bg-primary-500/10 text-primary-400'

  const trendColor =
    trendDirection === 'up'
      ? 'text-emerald-400 bg-emerald-500/10'
      : trendDirection === 'down'
        ? 'text-rose-400 bg-rose-500/10'
        : 'text-surface-200 bg-surface-700/60'

  return (
    <div
      className={`h-full rounded-lg border border-surface-700 border-t-[3px] ${accentBorder} bg-surface-800 p-4 shadow-card transition-transform hover:-translate-y-0.5`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-surface-200">{label}</p>
        {icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${accentChip}`}>
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold text-surface-50">{value}</span>
        {unit && <span className="text-xs font-medium text-surface-200">{unit}</span>}
      </div>

      {trend && (
        <span className={`mt-3 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${trendColor}`}>
          {trend}
        </span>
      )}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  )
}
