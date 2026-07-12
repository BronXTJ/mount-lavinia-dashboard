/**
 * Small reusable loading indicator used while data is being fetched
 * (live weather, etc). `size` in pixels, `label` optional inline text.
 */
export default function LoadingSpinner({ size = 16, label, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 text-surface-200 ${className}`}>
      <span
        className="inline-block animate-spin rounded-full border-2 border-surface-700 border-t-primary-400"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      {label && <span className="text-xs">{label}</span>}
    </span>
  )
}
