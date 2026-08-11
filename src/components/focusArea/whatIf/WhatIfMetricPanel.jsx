import { formatMetricValue } from '../../../utils/centralityStats.js'
import { WHAT_IF_STATUS } from '../../../constants/centralityWhatIf.js'

function Kpi({ label, value }) {
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800/80 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-surface-400">{label}</p>
      <p className="mt-0.5 font-display text-sm font-semibold text-surface-50">{value}</p>
    </div>
  )
}

function TopList({ title, rows, onSelect }) {
  if (!rows?.length) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-surface-300">{title}</h3>
        <p className="mt-1 text-[11px] text-surface-500">Finish a link with the local worker to see Δ rankings.</p>
      </div>
    )
  }
  return (
    <div>
      <h3 className="text-xs font-semibold text-surface-300">{title}</h3>
      <ul className="mt-1 space-y-1">
        {rows.slice(0, 5).map((row) => (
          <li key={`${title}-${row.ID}`}>
            <button
              type="button"
              onClick={() => onSelect?.(row.ID)}
              className="flex w-full items-center justify-between rounded-md border border-surface-700/80 bg-surface-850/60 px-2 py-1 text-left text-[11px] text-surface-100 transition hover:border-primary-500/50"
            >
              <span>Seg #{row.ID}{row.new_link ? ' · new' : ''}</span>
              <span className={row.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {row.delta >= 0 ? '+' : ''}
                {formatMetricValue(row.delta)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const STATUS_LABEL = {
  [WHAT_IF_STATUS.draft]: 'Draft — draw links',
  [WHAT_IF_STATUS.loading]: 'Loading scenario…',
  [WHAT_IF_STATUS.computing]: 'Computing sDNA (local worker)…',
  [WHAT_IF_STATUS.scenario]: 'Scenario active (sDNA)',
  [WHAT_IF_STATUS.needsCompute]: 'Worker offline — export or start what-if:worker',
  [WHAT_IF_STATUS.error]: 'Scenario error',
}

/** Compact non-scrolling What-if side panel for closeness or betweenness. */
export default function WhatIfMetricPanel({
  metric,
  scaleLabel,
  status,
  error,
  deltaBlock,
  workerOnline = false,
  onSegmentClick,
}) {
  const block = deltaBlock?.[metric] ?? null
  const title = metric === 'closeness' ? 'Closeness Δ' : 'Betweenness Δ'
  const statusLine =
    status === WHAT_IF_STATUS.needsCompute && workerOnline
      ? 'Ready — press ▶ to run sDNA'
      : (STATUS_LABEL[status] ?? status)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3">
      <div className="shrink-0 border-l-4 border-primary-500 pl-2.5">
        <h2 className="font-display text-base font-semibold text-surface-50">{title}</h2>
        <p className="text-[11px] text-surface-400">{scaleLabel}</p>
      </div>

      <p className="shrink-0 rounded-md border border-surface-700 bg-surface-800 px-2.5 py-1.5 text-[11px] text-surface-200">
        {statusLine}
        {error ? <span className="mt-1 block text-rose-400">{error}</span> : null}
        <span className="mt-1 block text-[10px] text-surface-500">
          Worker: {workerOnline ? 'online' : 'offline'}
        </span>
      </p>

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <Kpi label="Changed segs" value={block?.n_changed ?? '—'} />
        <Kpi label="Max Δ" value={block ? formatMetricValue(block.max_delta) : '—'} />
        <Kpi label="Min Δ" value={block ? formatMetricValue(block.min_delta) : '—'} />
        <Kpi label="Scale" value={scaleLabel.replace(' Scale — ', ' · ')} />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-hidden">
        <TopList title="Top gainers" rows={block?.top_gainers} onSelect={onSegmentClick} />
        <TopList title="Top losers" rows={block?.top_losers} onSelect={onSegmentClick} />
      </div>

      <p className="shrink-0 text-[10px] leading-snug text-surface-500">
        Start <code className="text-surface-400">npm run what-if:worker</code> for live sDNA after
        drawing. Without it, ▶ exports GeoJSON for the offline script.
      </p>
    </div>
  )
}
