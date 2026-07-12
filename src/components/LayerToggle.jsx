/**
 * Single labeled on/off switch row, used inside MapLayerFab for each map layer.
 */
export default function LayerToggle({ label, checked, onChange, swatchColor }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-white/5">
      <span className="flex items-center gap-2 text-sm text-surface-100">
        {swatchColor && (
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: swatchColor }}
            aria-hidden="true"
          />
        )}
        {label}
      </span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-surface-700 transition-colors peer-checked:bg-primary-500" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  )
}
