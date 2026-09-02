import { ArrowDown, ArrowUp, Gauge, GitCompareArrows, Pencil, PenLine, Split, X } from 'lucide-react'
import { formatMetricValue } from '../../../utils/centralityStats.js'
import { WHAT_IF_STATUS } from '../../../constants/centralityWhatIf.js'
import {
  WHAT_IF_BETWEENNESS_INFO,
  WHAT_IF_CLOSENESS_INFO,
  whatIfGainersInfo,
  whatIfLosersInfo,
  whatIfNearbyInfo,
} from '../../../constants/whatIfHelpContent.js'
import MetricInfoButton from '../MetricInfoButton.jsx'
import WhatIfStatusCard from './WhatIfStatusCard.jsx'

function Kpi({ label, value, accent = 'primary', icon }) {
  const topBorder = accent === 'orange' ? 'border-t-orange-500' : 'border-t-primary-500'
  const chip =
    accent === 'orange' ? 'bg-orange-500/10 text-orange-300' : 'bg-primary-500/10 text-primary-300'
  return (
    <div
      className={`min-w-0 rounded-lg border border-surface-700 border-t-[3px] ${topBorder} bg-surface-800 px-2.5 py-2 shadow-card`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-surface-200">{label}</p>
        {icon ? (
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${chip}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-display text-sm font-semibold tabular-nums text-surface-50">{value}</p>
    </div>
  )
}

function emptyStateCopy(status, linkCount, workerOnline, sdnaMissing, guidanceActive) {
  if (status === WHAT_IF_STATUS.computing || status === WHAT_IF_STATUS.loading) {
    return {
      headline: 'Computing sDNA…',
      subline: 'Rankings appear when the job finishes',
    }
  }
  if (status === WHAT_IF_STATUS.scenario) {
    return {
      headline: 'No segment change at this scale',
      subline: 'Try another radius or add more links',
    }
  }
  if (sdnaMissing) {
    return {
      headline: 'sDNA missing on this PC',
      subline: guidanceActive ? 'See the map tip for install steps' : 'Install sDNA, restart npm run what-if:worker, then finish a link',
    }
  }
  if (!workerOnline && linkCount > 0) {
    return {
      headline: 'Start the local worker',
      subline: guidanceActive ? 'See the map tip above the toolbar' : 'npm run what-if:worker, click Connect, then finish a link or press ▶',
    }
  }
  if (status === WHAT_IF_STATUS.needsCompute) {
    return {
      headline: 'Run sDNA to fill rankings',
      subline: guidanceActive ? 'Press ▶ or finish a link' : 'Press ▶ or finish a link — worker is online',
    }
  }
  if (linkCount === 0) {
    return {
      headline: 'Draw a proposed link',
      subline: guidanceActive ? 'Rankings appear when sDNA finishes' : 'Finish with Esc / ✓ / double-click, then sDNA fills these rankings',
    }
  }
  return {
    headline: 'Finish a link to compute',
    subline: guidanceActive ? 'Rankings appear when sDNA finishes' : 'Local sDNA will fill Top Gainers and Top Losers here',
  }
}

function RankingsEmptyState({ accent = 'primary', headline, subline }) {
  const isOrange = accent === 'orange'
  const border = isOrange ? 'border-orange-400/50' : 'border-primary-400/50'
  const bg = isOrange ? 'bg-orange-500/10' : 'bg-primary-500/10'
  const ring = isOrange ? 'ring-orange-400/30' : 'ring-primary-400/30'
  const ping = isOrange ? 'bg-orange-400/35' : 'bg-primary-400/35'
  const iconWrap = isOrange ? 'bg-orange-500/20 text-orange-300' : 'bg-primary-500/20 text-primary-300'
  const title = isOrange ? 'text-orange-300' : 'text-primary-300'

  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden rounded-md border-2 ${border} ${bg} px-3 py-5 text-center`}
    >
      <span className={`pointer-events-none absolute inset-0 rounded-md ring-2 ${ring} animate-pulse`} />
      <span className="relative flex h-10 w-10 items-center justify-center">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ping}`} />
        <span className={`relative flex h-10 w-10 items-center justify-center rounded-full ${iconWrap}`}>
          <Pencil className="h-5 w-5" aria-hidden />
        </span>
      </span>
      <p className={`relative font-display text-sm font-semibold ${title}`}>{headline}</p>
      <p className="relative max-w-[16rem] text-xs text-surface-200">{subline}</p>
    </div>
  )
}

function nearbyToneClasses(accent) {
  if (accent === 'orange') {
    return {
      headerClass: 'border-l-4 border-l-orange-500 bg-orange-500/10 text-orange-300',
      selectedRowClass: 'border-orange-500 bg-orange-500/20 hover:border-orange-400',
      clearBtnClass: 'border-orange-500 bg-orange-500/20 text-orange-300 hover:bg-orange-500/30',
      idleRowClass: 'border-surface-700/80 bg-surface-850/60 hover:border-orange-500/50',
    }
  }
  return {
    headerClass: 'border-l-4 border-l-sky-500 bg-sky-500/10 text-sky-300',
    selectedRowClass: 'border-sky-500 bg-sky-500/20 hover:border-sky-400',
    clearBtnClass: 'border-sky-500 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30',
    idleRowClass: 'border-surface-700/80 bg-surface-850/60 hover:border-sky-500/50',
  }
}

function TopList({
  title,
  rows,
  onSelect,
  selectedId,
  tone = 'gain',
  accent = 'primary',
  infoTitle,
  infoPoints,
  infoAria,
}) {
  const isLoss = tone === 'loss'
  const isNearby = tone === 'nearby'
  const nearby = isNearby ? nearbyToneClasses(accent) : null
  const headerClass = isLoss
    ? 'border-l-4 border-l-rose-500 bg-rose-500/10 text-rose-300'
    : isNearby
      ? nearby.headerClass
      : 'border-l-4 border-l-emerald-500 bg-emerald-500/10 text-emerald-300'
  const selectedRowClass = isLoss
    ? 'border-rose-500 bg-rose-500/20 hover:border-rose-400'
    : isNearby
      ? nearby.selectedRowClass
      : 'border-emerald-500 bg-emerald-500/20 hover:border-emerald-400'
  const idleRowClass = isNearby
    ? nearby.idleRowClass
    : 'border-surface-700/80 bg-surface-850/60 hover:border-primary-500/50'
  const clearBtnClass = isLoss
    ? 'border-rose-500 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
    : isNearby
      ? nearby.clearBtnClass
      : 'border-emerald-500 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div
        className={`flex shrink-0 items-center justify-between gap-2 rounded-md px-2 py-1.5 ${headerClass}`}
      >
        <h3 className="text-[11px] font-semibold uppercase tracking-wide">{title}</h3>
        {infoPoints?.length ? (
          <MetricInfoButton
            title={infoTitle ?? title}
            ariaLabel={infoAria ?? `What does ${title} show?`}
            points={infoPoints}
            pulse={false}
            chipAccent={isNearby && accent === 'orange' ? 'orange' : 'teal'}
          />
        ) : null}
      </div>
      <ul className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {rows.slice(0, 12).map((row) => {
          const selected = selectedId != null && row.ID == selectedId
          return (
            <li key={`${title}-${row.ID}`} className="flex min-w-0 items-stretch gap-0.5">
              <button
                type="button"
                onClick={() => onSelect?.(row.ID)}
                aria-pressed={selected}
                className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md border px-2 py-1 text-left text-[11px] text-surface-100 transition ${
                  selected ? selectedRowClass : idleRowClass
                }`}
              >
                <span className="min-w-0 truncate">
                  Seg #{row.ID}
                  {row.new_link ? ' · new' : ''}
                  {row.distM != null ? ` · ${row.distM}m` : ''}
                </span>
                <span
                  className={`shrink-0 tabular-nums ${row.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {row.delta >= 0 ? '+' : ''}
                  {formatMetricValue(row.delta)}
                </span>
              </button>
              {selected ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(row.ID)}
                  aria-label="Clear segment highlight"
                  className={`flex shrink-0 items-center justify-center rounded-md border px-1.5 transition ${clearBtnClass}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** What-if side panel for closeness or betweenness Δ rankings. */
export default function WhatIfMetricPanel({
  metric,
  scaleLabel,
  status,
  error,
  deltaBlock,
  workerOnline = false,
  workerReachable = false,
  sdnaMissing = false,
  linkCount = 0,
  selectedSegmentId = null,
  onSegmentClick,
  summaryWarning = null,
  guidanceActive = false,
  nearbyRows = [],
  onConnect,
}) {
  const isCloseness = metric === 'closeness'
  const block = deltaBlock?.[metric] ?? null
  const title = isCloseness ? 'Closeness Change' : 'Betweenness Change'
  const metricCode = isCloseness ? 'NQPDA' : 'BtA'
  const metricLabel = isCloseness ? 'angular closeness' : 'angular betweenness'
  const AccentIcon = isCloseness ? Gauge : Split
  const accentBorder = isCloseness ? 'border-primary-500' : 'border-orange-500'
  const accentIconClass = isCloseness ? 'text-primary-300' : 'text-orange-300'
  const kpiAccent = isCloseness ? 'primary' : 'orange'
  const infoPoints = isCloseness ? WHAT_IF_CLOSENESS_INFO : WHAT_IF_BETWEENNESS_INFO
  const gainerPoints = whatIfGainersInfo(metricCode, metricLabel)
  const loserPoints = whatIfLosersInfo(metricCode, metricLabel)
  const nearbyPoints = whatIfNearbyInfo(metricCode, metricLabel)

  const hasRankings = Boolean(block?.top_gainers?.length || block?.top_losers?.length)
  const hasNearby = nearbyRows.length > 0
  const emptyCopy = emptyStateCopy(status, linkCount, workerOnline, sdnaMissing, guidanceActive)

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

      <WhatIfStatusCard
        status={status}
        workerOnline={workerOnline}
        workerReachable={workerReachable}
        sdnaMissing={sdnaMissing}
        nChanged={block?.n_changed}
        error={error}
        warning={status === WHAT_IF_STATUS.scenario ? summaryWarning : null}
        onConnect={onConnect}
      />

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <Kpi
          label="Links Drawn"
          value={linkCount}
          accent={kpiAccent}
          icon={<PenLine className="h-3.5 w-3.5" aria-hidden />}
        />
        <Kpi
          label="Changed Segs"
          value={block?.n_changed ?? '—'}
          accent={kpiAccent}
          icon={<GitCompareArrows className="h-3.5 w-3.5" aria-hidden />}
        />
        <Kpi
          label="Max Δ"
          value={block ? formatMetricValue(block.max_delta) : '—'}
          accent={kpiAccent}
          icon={<ArrowUp className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />}
        />
        <Kpi
          label="Min Δ"
          value={block ? formatMetricValue(block.min_delta) : '—'}
          accent={kpiAccent}
          icon={<ArrowDown className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />}
        />
      </div>

      {hasRankings ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          {hasNearby ? (
            <TopList
              title="Nearby 500m"
              tone="nearby"
              accent={kpiAccent}
              rows={nearbyRows}
              selectedId={selectedSegmentId}
              onSelect={onSegmentClick}
              infoTitle="Nearby 500m"
              infoAria="What does Nearby 500m show?"
              infoPoints={nearbyPoints}
            />
          ) : status === WHAT_IF_STATUS.scenario ? (
            <p className="shrink-0 text-[10px] text-surface-500">
              No measurable Δ within 500 m of your drawn links at this scale.
            </p>
          ) : null}
          {block?.top_gainers?.length ? (
            <TopList
              title="Top Gainers"
              tone="gain"
              rows={block.top_gainers}
              selectedId={selectedSegmentId}
              onSelect={onSegmentClick}
              infoTitle="Top Gainers"
              infoAria="What do Top Gainers show?"
              infoPoints={gainerPoints}
            />
          ) : null}
          {block?.top_losers?.length ? (
            <TopList
              title="Top Losers"
              tone="loss"
              rows={block.top_losers}
              selectedId={selectedSegmentId}
              onSelect={onSegmentClick}
              infoTitle="Top Losers"
              infoAria="What do Top Losers show?"
              infoPoints={loserPoints}
            />
          ) : null}
        </div>
      ) : (
        <RankingsEmptyState
          accent={kpiAccent}
          headline={emptyCopy.headline}
          subline={emptyCopy.subline}
        />
      )}

      {!guidanceActive ? (
        <p className="shrink-0 text-[10px] leading-snug text-surface-500">
          Start <code className="text-surface-400">npm run what-if:worker</code>, then click Connect
          if Chrome asks to Allow local network. Without the worker, ▶ downloads
          proposed_links.geojson.
        </p>
      ) : null}
    </div>
  )
}
