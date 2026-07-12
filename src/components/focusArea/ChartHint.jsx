export default function ChartHint({ children, muted = false }) {
  return (
    <p
      className={[
        'mt-1.5 rounded-r-md border-l-2 px-2.5 py-1.5 text-xs leading-snug',
        muted
          ? 'border-surface-600 bg-surface-900/40 font-normal text-surface-400'
          : 'border-primary-500/80 bg-surface-900/70 font-medium text-surface-100',
      ].join(' ')}
    >
      {children}
    </p>
  )
}
