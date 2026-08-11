import { Gauge, Split } from 'lucide-react'
import { formatMetricValue } from '../../../utils/centralityStats.js'
import { WHAT_IF_STATUS } from '../../../constants/centralityWhatIf.js'
import MetricInfoButton from '../MetricInfoButton.jsx'

function Kpi({ label, value, accent = 'primary' }) {
  const topBorder = accent === 'orange' ? 'border-t-orange-500' : 'border-t-primary-500'
  return (
    <div
      className={`min-w-0 rounded-lg border border-surface-700 border-t-[3px] ${topBorder} bg-surface-800 px-2.5 py-2 shadow-card`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-surface-200">{label}</p>
      <p className="mt-1 font-display text-sm font-semibold tabular-nums text-surface-50">{value}</p>
    </div>
  )
}

function emptyListHint(status, linkCount, workerOnline) {
  if (status === WHAT_IF_STATUS.computing || status === WHAT_IF_STATUS.loading) {
    return 'Computing sDNA… rankings appear when the job finishes.'
  }
  if (status === WHAT_IF_STATUS.scenario) {
    return 'No Segment Δ at this scale for the current scenario.'
  }
  if (status === WHAT_IF_STATUS.needsCompute || (!workerOnline && linkCount > 0)) {
    return 'Start npm run what-if:worker, then ▶ — drawing alone does not fill Δ.'
  }
  if (linkCount === 0) {
    return 'Draw and finish a link on the map.'
  }
  return 'Finish a link with the local worker to see Δ rankings.'
}

function TopList({ title, rows, onSelect, emptyHint, tone = 'gain' }) {
  const headerClass =
    tone === 'loss'
      ? 'border-l-4 border-l-rose-500 bg-rose-500/10 text-rose-300'
      : 'border-l-4 border-l-emerald-500 bg-emerald-500/10 text-emerald-300'

  const header = (
    <h3
      className={`shrink-0 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${headerClass}`}
    >
      {title}
    </h3>
  )

  if (!rows?.length) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {header}
        <p className="mt-1 text-[11px] text-surface-500">{emptyHint}</p>
      </div>
    )
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {header}
      <ul className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {rows.slice(0, 12).map((row) => (
          <li key={`${title}-${row.ID}`} className="min-w-0">
            <button
              type="button"
              onClick={() => onSelect?.(row.ID)}
              className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-surface-700/80 bg-surface-850/60 px-2 py-1 text-left text-[11px] text-surface-100 transition hover:border-primary-500/50"
            >
              <span className="min-w-0 truncate">
                Seg #{row.ID}
                {row.new_link ? ' · new' : ''}
              </span>
              <span
                className={`shrink-0 tabular-nums ${row.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
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
  [WHAT_IF_STATUS.draft]: 'Draft — Draw Links',
  [WHAT_IF_STATUS.loading]: 'Loading Scenario…',
  [WHAT_IF_STATUS.computing]: 'Computing sDNA (Local Worker)…',
  [WHAT_IF_STATUS.scenario]: 'Scenario Active (sDNA)',
  [WHAT_IF_STATUS.needsCompute]: 'Worker Offline — Export Or Start what-if:worker',
  [WHAT_IF_STATUS.error]: 'Scenario Error',
}

const CLOSENESS_INFO = [
  'Closeness Change is the change in angular closeness (NQPDA) after your proposed links vs the baseline network.',
  'Drawing on the map alone does not fill these numbers — a local sDNA job must finish first.',
  'Start npm run what-if:worker on this PC, then finish a link or press ▶.',
  'Click a Top Gainer / Top Loser to highlight that segment on the map.',
]

const BETWEENNESS_INFO = [
  'Betweenness Change is the change in angular betweenness (BtA) after your proposed links vs the baseline network.',
  'These rankings appear only after local sDNA completes — not from drawing alone.',
  'Keep the What-if worker running (npm run what-if:worker) for live results.',
  'Click a Top Gainer / Top Loser to highlight that segment on the map.',
]

/** What-if side panel for closeness or betweenness Δ rankings. */
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
  const isCloseness = metric === 'closeness'
  const block = deltaBlock?.[metric] ?? null
  const title = isCloseness ? 'Closeness Change' : 'Betweenness Change'
  const metricCode = isCloseness ? 'NQPDA' : 'BtA'
  const AccentIcon = isCloseness ? Gauge : Split
  const accentBorder = isCloseness ? 'border-primary-500' : 'border-orange-500'
  const accentIconClass = isCloseness ? 'text-primary-300' : 'text-orange-300'
  const kpiAccent = isCloseness ? 'primary' : 'orange'
  const infoPoints = isCloseness ? CLOSENESS_INFO : BETWEENNESS_INFO
  const statusLine = sdnaMissing
    ? 'sDNA Missing On This PC'
    : status === WHAT_IF_STATUS.needsCompute && workerOnline
      ? 'Ready — Press ▶ To Run sDNA'
      : (STATUS_LABEL[status] ?? status)
  const listHint = emptyListHint(status, linkCount, workerOnline)
  const workerLabel = sdnaMissing
    ? 'reachable · sDNA missing'
    : workerOnline
      ? 'online'
      : 'offline'

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden p-3">
      <div className={`flex shrink-0 items-start justify-between gap-2 border-l-4 pl-2.5 ${accentBorder}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AccentIcon className={`h-4 w-4 shrink-0 ${accentIconClass}`} aria-hidden />
            <h2 className="font-display text-base font-semibold text-surface-50">{title}</h2>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-surface-400">
            {scaleLabel} · {metricCode}
          </p>
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
          Worker: {workerLabel} · Links Drawn: {linkCount}
        </span>
      </p>

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <Kpi label="Links Drawn" value={linkCount} accent={kpiAccent} />
        <Kpi label="Changed Segs" value={block?.n_changed ?? '—'} accent={kpiAccent} />
        <Kpi
          label="Max Δ"
          value={block ? formatMetricValue(block.max_delta) : '—'}
          accent={kpiAccent}
        />
        <Kpi
          label="Min Δ"
          value={block ? formatMetricValue(block.min_delta) : '—'}
          accent={kpiAccent}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        <TopList
          title="Top Gainers"
          tone="gain"
          rows={block?.top_gainers}
          onSelect={onSegmentClick}
          emptyHint={listHint}
        />
        <TopList
          title="Top Losers"
          tone="loss"
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
