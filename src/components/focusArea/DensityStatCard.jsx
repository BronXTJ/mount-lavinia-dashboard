/** Stat card with a custom top-border color for Density Analysis panels. */
export default function DensityStatCard({
  label,
  value,
  topBorderColor,
  onClick,
  interactive = false,
  hint,
}) {
  const isClickable = interactive && typeof onClick === 'function'

  return (
    <div
      className={`rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card ${
        isClickable
          ? 'cursor-pointer transition-transform hover:-translate-y-0.5 hover:border-surface-500'
          : ''
      }`}
      style={{ borderTopWidth: 3, borderTopColor: topBorderColor }}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-surface-200">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-surface-50">{value}</p>
      {hint ? <p className="mt-1.5 text-[10px] leading-snug text-surface-400">{hint}</p> : null}
    </div>
  )
}
