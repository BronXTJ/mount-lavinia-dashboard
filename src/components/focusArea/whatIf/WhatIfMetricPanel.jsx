import { formatMetricValue } from '../../../utils/centralityStats.js'
import { WHAT_IF_STATUS } from '../../../constants/centralityWhatIf.js'
import MetricInfoButton from '../MetricInfoButton.jsx'

function Kpi({ label, value }) {
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800/80 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-surface-400">{label}</p>
      <p className="mt-0.5 font-display text-sm font-semibold text-surface-50">{value}</p>
    </div>
  )
}

function emptyListHint(status, linkCount, workerOnline) {
  if (status === WHAT_IF_STATUS.computing) {
    return 'Computing sDNA… rankings appear when the job finishes.'
  }
  if (status === WHAT_IF_STATUS.scenario) {
    return 'No segment Δ at this scale for the current scenario.'
  }
  if (status === WHAT_IF_STATUS.needsCompute || (!workerOnline && linkCount > 0)) {
    return 'Start npm run what-if:worker, then ▶ — drawing alone does not fill Δ.'
  }
  if (linkCount === 0) {
    return 'Draw and finish a link on the map.'
  }
  return 'Finish a link with the local worker to see Δ rankings.'
}

function TopList({ title, rows, onSelect, emptyHint }) {
  if (!rows?.length) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-surface-300">{title}</h3>
        <p className="mt-1 text-[11px] text-surface-500">{emptyHint}</p>
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

const CLOSENESS_INFO = [
  'Closeness Δ is the change in angular closeness (NQPDA) after your proposed links vs the baseline network.',
  'Drawing on the map alone does not fill these numbers — a local sDNA job must finish first.',
  'Start npm run what-if:worker on this PC, then finish a link or press ▶.',
  'Click a top gainer/loser to highlight that segment on the map.',
]

const BETWEENNESS_INFO = [
  'Betweenness Δ is the change in angular betweenness (BtA) after your proposed links vs the baseline network.',
  'These rankings appear only after local sDNA completes — not from drawing alone.',
  'Keep the What-if worker running (npm run what-if:worker) for live results.',
  'Click a top gainer/loser to highlight that segment on the map.',
]

/** Compact non-scrolling What-if side panel for closeness or betweenness. */
export default function WhatIfMetricPanel({
  metric,
  scaleLabel,
  status,
  error,
  deltaBlock,
  workerOnline = false,
  sdnaMissing = false,
  linkCount = 0,
  onSegmentClick,
}) {
  const block = deltaBlock?.[metric] ?? null
  const title = metric === 'closeness' ? 'Closeness Δ' : 'Betweenness Δ'
  const infoPoints = metric === 'closeness' ? CLOSENESS_INFO : BETWEENNESS_INFO
  const statusLine = sdnaMissing
    ? 'sDNA missing on this PC'
    : status === WHAT_IF_STATUS.needsCompute && workerOnline
      ? 'Ready — press ▶ to run sDNA'
      : (STATUS_LABEL[status] ?? status)
  const listHint = emptyListHint(status, linkCount, workerOnline)
  const workerLabel = sdnaMissing
    ? 'reachable · sDNA missing'
    : workerOnline
      ? 'online'
      : 'offline'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3">
      <div className="flex shrink-0 items-start justify-between gap-2 border-l-4 border-primary-500 pl-2.5">
        <div>
          <h2 className="font-display text-base font-semibold text-surface-50">{title}</h2>
          <p className="text-[11px] text-surface-400">{scaleLabel}</p>
        </div>
        <MetricInfoButton
          title={title}
          ariaLabel={`What does ${title} show?`}
          points={infoPoints}
        />
      </div>

      <p className="shrink-0 rounded-md border border-surface-700 bg-surface-800 px-2.5 py-1.5 text-[11px] text-surface-200">
        {statusLine}
        {error ? <span className="mt-1 block text-rose-400">{error}</span> : null}
        {sdnaMissing && !error ? (
          <span className="mt-1 block text-rose-400">
            Install sDNA to C:\Program Files (x86)\sDNA, then restart what-if:worker
          </span>
        ) : null}
        <span className="mt-1 block text-[10px] text-surface-500">
          Worker: {workerLabel} · Links drawn: {linkCount}
        </span>
      </p>

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <Kpi label="Links drawn" value={linkCount} />
        <Kpi label="Changed segs" value={block?.n_changed ?? '—'} />
        <Kpi label="Max Δ" value={block ? formatMetricValue(block.max_delta) : '—'} />
        <Kpi label="Min Δ" value={block ? formatMetricValue(block.min_delta) : '—'} />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-hidden">
        <TopList
          title="Top gainers"
          rows={block?.top_gainers}
          onSelect={onSegmentClick}
          emptyHint={listHint}
        />
        <TopList
          title="Top losers"
          rows={block?.top_losers}
          onSelect={onSegmentClick}
          emptyHint={listHint}
        />
      </div>

      <p className="shrink-0 text-[10px] leading-snug text-surface-500">
        Start <code className="text-surface-400">npm run what-if:worker</code> for live sDNA after
        drawing. Without it, ▶ exports GeoJSON for the offline script.
      </p>
    </div>
  )
}
