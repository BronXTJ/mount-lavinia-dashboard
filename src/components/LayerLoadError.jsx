/** Small retry banner for a failed static layer fetch. */
export default function LayerLoadError({ error, onRetry }) {
  if (!error) return null
  return (
    <div
      role="alert"
      className="pointer-events-auto absolute left-3 top-3 z-[1100] max-w-sm rounded-md border border-rose-500/40 bg-[#1a0f12]/95 px-3 py-2 text-[11px] text-rose-100 shadow-lg"
    >
      <p className="font-medium">Map data failed to load</p>
      <p className="mt-0.5 text-rose-200/80">{String(error.message || error)}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1.5 rounded border border-rose-400/50 px-2 py-0.5 text-[10px] font-medium text-rose-100 hover:bg-rose-500/20"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}
