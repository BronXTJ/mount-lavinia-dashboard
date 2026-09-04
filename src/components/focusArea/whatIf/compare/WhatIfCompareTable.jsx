import { useMemo, useState } from 'react'
import MetricInfoButton from '../../MetricInfoButton.jsx'
import {
  COMPARE_SLOT_COLORS,
  COMPARE_SLOT_IDS,
  COMPARE_SLOT_STATUS,
} from '../../../../constants/whatIfCompare.js'
import {
  COMPARE_BETWEENNESS_NEARBY_INFO,
  COMPARE_CLOSENESS_NEARBY_INFO,
  COMPARE_EFFICIENCY_INFO,
  COMPARE_HEADING_INFO,
  COMPARE_LINKS_INFO,
  COMPARE_N_CHANGED_NEARBY_INFO,
  COMPARE_NETWORK_DETAIL_INFO,
  COMPARE_SCALE_INFO,
  COMPARE_SHARED_INFO,
  COMPARE_STREETS_CLOSENESS_INFO,
  COMPARE_STREETS_THROUGH_INFO,
} from '../../../../constants/whatIfCompareHelpContent.js'
import { useCompareScaleCloseness } from '../../../../hooks/useCompareScaleCloseness.js'
import { formatMetricValue, lookupRoadName } from '../../../../utils/centralityStats.js'
import {
  COMPARE_SPARKLINE_SCALES,
  nearbyClosenessSparkline,
  nearbySegmentDeltaStats,
  NEARBY_DELTA_METERS,
} from '../../../../utils/nearbyWhatIfDeltas.js'
import { formatLengthM, proposedLinksLengthM } from '../../../../utils/whatIfCompareGeometry.js'
import { classifySharedVsUniqueStreets } from '../../../../utils/whatIfCompareSharedStreets.js'
import { compareScalePhrase, gainPer100m } from '../../../../utils/whatIfCompareSummary.js'

const HEADER_TONE = {
  sky: 'border-l-4 border-l-sky-500 bg-sky-500/10 text-sky-300',
  orange: 'border-l-4 border-l-orange-500 bg-orange-500/10 text-orange-300',
  emerald: 'border-l-4 border-l-emerald-500 bg-emerald-500/10 text-emerald-300',
  rose: 'border-l-4 border-l-rose-500 bg-rose-500/10 text-rose-300',
  primary: 'border-l-4 border-l-primary-500 bg-primary-500/10 text-primary-300',
  stone: 'border-l-4 border-l-stone-400 bg-stone-500/10 text-stone-300',
  violet: 'border-l-4 border-l-violet-500 bg-violet-500/10 text-violet-300',
  indigo: 'border-l-4 border-l-indigo-400 bg-indigo-500/10 text-indigo-300',
  lime: 'border-l-4 border-l-lime-500 bg-lime-500/10 text-lime-300',
  fuchsia: 'border-l-4 border-l-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300',
}

const BAR_FILL = {
  sky: 'bg-sky-500/25',
  orange: 'bg-orange-500/25',
  emerald: 'bg-emerald-500/25',
  rose: 'bg-rose-500/25',
  primary: 'bg-primary-500/25',
  stone: 'bg-stone-500/25',
  violet: 'bg-violet-500/25',
  indigo: 'bg-indigo-500/25',
  lime: 'bg-lime-500/25',
  fuchsia: 'bg-fuchsia-500/25',
}

function cell(slot, renderReady) {
  if (slot.status !== COMPARE_SLOT_STATUS.ready) return '—'
  return renderReady()
}

function numericHighlight(ids, slots, rawFn, preferMin = false) {
  const values = ids
    .filter((id) => slots[id]?.status === COMPARE_SLOT_STATUS.ready)
    .map((id) => ({ id, v: rawFn?.(id) }))
    .filter((row) => row.v != null && Number.isFinite(row.v))
  if (values.length < 2) return {}
  const max = Math.max(...values.map((row) => row.v))
  const min = Math.min(...values.map((row) => row.v))
  if (max === min) return {}
  const map = {}
  for (const { id, v } of values) {
    if (v === max) map[id] = preferMin ? 'text-rose-300' : 'text-emerald-300'
    else if (v === min) map[id] = preferMin ? 'text-emerald-300' : 'text-rose-300'
  }
  return map
}

function barWidths(ids, slots, rawFn) {
  const values = ids
    .filter((id) => slots[id]?.status === COMPARE_SLOT_STATUS.ready)
    .map((id) => ({ id, v: rawFn?.(id) }))
    .filter((row) => row.v != null && Number.isFinite(row.v))
  const peak = Math.max(0, ...values.map((row) => Math.abs(row.v)))
  const map = {}
  if (peak <= 0) {
    for (const { id } of values) map[id] = 0
    return map
  }
  for (const { id, v } of values) {
    map[id] = Math.max(0.08, Math.abs(v) / peak)
  }
  return map
}

function streetName(row, baseline, namedRoads) {
  if (!row?.ID) return '—'
  const feature = baseline?.features?.find((f) => Number(f.properties?.ID) === Number(row.ID))
  const name = feature ? lookupRoadName(feature, namedRoads) : null
  return name || `Seg #${row.ID}`
}

function nameCountsFor(items, baseline, namedRoads) {
  const counts = new Map()
  for (const item of items ?? []) {
    const n = streetName(item, baseline, namedRoads)
    counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  return counts
}

function displayStreetName(row, baseline, namedRoads, counts) {
  const base = streetName(row, baseline, namedRoads)
  if (row?.ID && counts?.get(base) > 1 && !String(base).startsWith('Seg #')) {
    return `${base} #${row.ID}`
  }
  return base
}

function formatSignedDelta(d) {
  if (d == null || Number.isNaN(d)) return '—'
  return `${d >= 0 ? '+' : ''}${formatMetricValue(d)}`
}

function listCsv(rows, baseline, namedRoads) {
  if (!rows?.length) return '—'
  const counts = nameCountsFor(rows, baseline, namedRoads)
  return rows.map((row) => displayStreetName(row, baseline, namedRoads, counts)).join('; ')
}

function sparkTick(meters) {
  if (meters === 500) return '500'
  if (meters === 2000) return '2k'
  if (meters === 3000) return '3k'
  if (meters === 5000) return '5k'
  return `${meters}`
}

function printStamp() {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
}

function optionPrintLabel(id, slot) {
  const name = slot?.name?.trim()
  const n = slot?.links?.length ?? 0
  return name ? `${id} · ${name} (${n} links)` : `${id} (${n} links)`
}

function ScaleSparkline({ points, color, activeMeters }) {
  const w = 96
  const h = 28
  const pad = 3
  const values = (points ?? []).map((p) => p.maxDelta).filter((v) => v != null && Number.isFinite(v))
  const peak = Math.max(0.0001, ...values.map((v) => Math.abs(v)))
  const n = Math.max(2, points?.length ?? 0)
  const coords = (points ?? []).map((p, i) => {
    const x = pad + (i * (w - 2 * pad)) / (n - 1)
    const y =
      p.maxDelta == null || !Number.isFinite(p.maxDelta)
        ? null
        : h / 2 - (p.maxDelta / peak) * (h / 2 - pad)
    return { x, y, meters: p.meters }
  })
  const drawn = coords.filter((c) => c.y != null)
  const d = drawn.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24 shrink-0" aria-hidden>
      <line
        x1={pad}
        x2={w - pad}
        y1={h / 2}
        y2={h / 2}
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      {d ? (
        <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      ) : null}
      {coords.map((c) =>
        c.y == null ? null : (
          <circle
            key={c.meters}
            cx={c.x}
            cy={c.y}
            r={c.meters === activeMeters ? 3.1 : 2}
            fill={color}
          />
        ),
      )}
    </svg>
  )
}

function BaselineCell({ children }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-surface-500">Baseline</p>
      {children}
    </div>
  )
}

function MetricBlock({ row, ids, slots, selectedSegmentId, onSegmentClick }) {
  const highlight = row.raw ? numericHighlight(ids, slots, row.raw, row.preferMin) : {}
  const widths = row.bar && row.raw ? barWidths(ids, slots, row.raw) : {}
  const headerClass = HEADER_TONE[row.tone] ?? HEADER_TONE.primary
  const chipAccent = row.chipAccent ?? (row.tone === 'orange' ? 'orange' : 'teal')
  return (
    <div className="border-b border-surface-800 py-2">
      <div className={`mb-1.5 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${headerClass}`}>
        <p className="min-w-0 text-[11px] font-semibold text-surface-100">{row.label}</p>
        {row.info ? (
          <MetricInfoButton
            title={row.label}
            ariaLabel={`What does ${row.label} show?`}
            points={row.info}
            pulse={false}
            chipAccent={chipAccent}
          />
        ) : null}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-1.5">
        <BaselineCell>
          <p className="mt-0.5 break-words text-[12px] tabular-nums text-surface-400">{row.today ?? '0'}</p>
        </BaselineCell>
        {ids.map((id) => {
          const slot = slots[id]
          const value = cell(slot, () => row.render(id))
          const segId = row.segmentId?.(id)
          const selected = segId != null && selectedSegmentId == segId
          const tone = highlight[id] ?? 'text-surface-100'
          const width = widths[id] ?? 0
          const ready = slot.status === COMPARE_SLOT_STATUS.ready
          return (
            <div key={id} className="min-w-0">
              <p className="text-[10px] font-semibold text-surface-500">
                {id}
                {slot.name ? ` · ${slot.name}` : ''}
              </p>
              {row.clickable && ready && segId != null ? (
                <button
                  type="button"
                  onClick={() => onSegmentClick?.(segId)}
                  className={`mt-0.5 break-words text-left text-[12px] hover:underline ${
                    selected ? 'text-primary-300' : tone
                  }`}
                >
                  {value}
                </button>
              ) : row.bar && ready ? (
                <div className="mt-1 h-6 overflow-hidden rounded bg-surface-800">
                  <div
                    className={`flex h-full items-center px-1.5 text-[11px] font-medium tabular-nums ${tone} ${
                      BAR_FILL[row.tone] ?? BAR_FILL.sky
                    }`}
                    style={{ width: `${Math.round(width * 100)}%` }}
                  >
                    {value}
                  </div>
                </div>
              ) : (
                <p className={`mt-0.5 break-words text-[12px] tabular-nums ${tone}`}>{value}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function labeledStreetItems(items, baseline, namedRoads) {
  const counts = nameCountsFor(items, baseline, namedRoads)
  return (items ?? []).map((item) => ({
    ...item,
    label: displayStreetName(item, baseline, namedRoads, counts),
  }))
}

function RankedStreetTable({ ids, slots, itemsById, baseline, namedRoads, selectedSegmentId, onSegmentClick }) {
  const labeled = {}
  for (const id of ids) {
    const ready = slots[id]?.status === COMPARE_SLOT_STATUS.ready
    labeled[id] = ready ? labeledStreetItems(itemsById(id) ?? [], baseline, namedRoads) : []
  }
  const rowCount = Math.min(5, Math.max(0, ...ids.map((id) => labeled[id].length)))
  const colTemplate = `1.35rem repeat(${ids.length}, minmax(0, 1fr))`

  if (!rowCount) {
    return <p className="text-[12px] text-surface-400">—</p>
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-x-1.5 gap-y-0.5" style={{ gridTemplateColumns: colTemplate }}>
        <p className="text-[10px] font-semibold text-surface-500">#</p>
        {ids.map((id) => (
          <p key={id} className="min-w-0 text-[10px] font-semibold text-surface-500">
            {id}
            {slots[id]?.name ? ` · ${slots[id].name}` : ''}
          </p>
        ))}
        {Array.from({ length: rowCount }, (_, rank) => (
          <div key={`r-${rank}`} className="contents">
            <p className="pt-1 text-[10px] tabular-nums text-surface-500">{rank + 1}</p>
            {ids.map((id) => {
              const item = labeled[id][rank]
              if (!item) {
                return (
                  <p key={id} className="pt-1 text-[11px] text-surface-500">
                    —
                  </p>
                )
              }
              const selected = selectedSegmentId == item.ID
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSegmentClick?.(item.ID)}
                  className={`flex min-w-0 items-baseline justify-between gap-1 pt-1 text-left hover:underline ${
                    selected ? 'text-primary-300' : 'text-surface-100'
                  }`}
                >
                  <span className="min-w-0 truncate text-[11px] leading-snug">{item.label}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-surface-400">
                    {formatSignedDelta(item.delta)}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function StreetRankCard({
  title,
  info,
  chipAccent = 'teal',
  tone = 'sky',
  ids,
  slots,
  gainedById,
  lostById,
  baseline,
  namedRoads,
  selectedSegmentId,
  onSegmentClick,
}) {
  const headerClass = HEADER_TONE[tone] ?? HEADER_TONE.primary
  return (
    <div className="border-b border-surface-800 py-2">
      <div className={`mb-1.5 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${headerClass}`}>
        <p className="min-w-0 text-[11px] font-semibold text-surface-100">{title}</p>
        {info ? (
          <MetricInfoButton
            title={title}
            ariaLabel={`What does ${title} show?`}
            points={info}
            pulse={false}
            chipAccent={chipAccent}
          />
        ) : null}
      </div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">Gained</p>
      <RankedStreetTable
        ids={ids}
        slots={slots}
        itemsById={gainedById}
        baseline={baseline}
        namedRoads={namedRoads}
        selectedSegmentId={selectedSegmentId}
        onSegmentClick={onSegmentClick}
      />
      <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-rose-400">Lost</p>
      <RankedStreetTable
        ids={ids}
        slots={slots}
        itemsById={lostById}
        baseline={baseline}
        namedRoads={namedRoads}
        selectedSegmentId={selectedSegmentId}
        onSegmentClick={onSegmentClick}
      />
    </div>
  )
}

export default function WhatIfCompareTable({
  slots,
  openedCount,
  scaleMeters,
  baselineCloseness,
  baselineBetweenness,
  namedRoads,
  selectedSegmentId,
  onSegmentClick,
}) {
  const [detailOpen, setDetailOpen] = useState(false)
  const ids = COMPARE_SLOT_IDS.slice(0, openedCount)

  const nearby = useMemo(() => {
    const out = {}
    for (const id of ids) {
      const slot = slots[id]
      if (slot.status !== COMPARE_SLOT_STATUS.ready) {
        out[id] = { closeness: null, betweenness: null }
        continue
      }
      out[id] = {
        closeness: nearbySegmentDeltaStats({
          links: slot.links,
          baseline: baselineCloseness,
          scenario: slot.closeness,
          metric: 'closeness',
          scaleMeters,
          radiusM: NEARBY_DELTA_METERS,
        }),
        betweenness: nearbySegmentDeltaStats({
          links: slot.links,
          baseline: baselineBetweenness,
          scenario: slot.betweenness,
          metric: 'betweenness',
          scaleMeters,
          radiusM: NEARBY_DELTA_METERS,
        }),
      }
    }
    return out
  }, [ids, slots, baselineCloseness, baselineBetweenness, scaleMeters])

  const { baselineByScale, scenarioByScale } = useCompareScaleCloseness({
    slots,
    ids,
    scaleMeters,
    baselineCloseness,
  })

  const sparklineBySlot = useMemo(() => {
    const out = {}
    for (const id of ids) {
      const slot = slots[id]
      if (slot.status !== COMPARE_SLOT_STATUS.ready) {
        out[id] = COMPARE_SPARKLINE_SCALES.map((meters) => ({ meters, maxDelta: null }))
        continue
      }
      out[id] = nearbyClosenessSparkline({
        links: slot.links,
        baselineByScale: {
          ...baselineByScale,
          [scaleMeters]: baselineByScale[scaleMeters] ?? baselineCloseness,
        },
        scenarioByScale: {
          ...scenarioByScale[id],
          [scaleMeters]: scenarioByScale[id]?.[scaleMeters] ?? slot.closeness,
        },
      })
    }
    return out
  }, [ids, slots, baselineByScale, scenarioByScale, scaleMeters, baselineCloseness])

  const sharedStreets = useMemo(() => {
    const readyIds = ids.filter((id) => slots[id]?.status === COMPARE_SLOT_STATUS.ready)
    return classifySharedVsUniqueStreets({
      readyIds,
      listsBySlot: Object.fromEntries(readyIds.map((id) => [id, nearby[id]?.closeness?.topGainers ?? []])),
    })
  }, [ids, slots, nearby])

  function networkBlock(slot, metric) {
    const key = `${metric}_${scaleMeters}`
    return slot.summary?.metrics?.[key] ?? null
  }

  const barRows = [
    {
      id: 'nqpd',
      tone: 'sky',
      bar: true,
      today: '0',
      label: 'Nearby closeness (largest gain)',
      info: COMPARE_CLOSENESS_NEARBY_INFO,
      raw: (id) => nearby[id]?.closeness?.maxDelta ?? null,
      render: (id) => {
        const d = nearby[id]?.closeness?.maxDelta
        return d == null ? '—' : `${d >= 0 ? '+' : ''}${formatMetricValue(d)}`
      },
    },
    {
      id: 'efficiency',
      tone: 'sky',
      bar: true,
      today: '0',
      label: 'Gain per 100 m of new street',
      info: COMPARE_EFFICIENCY_INFO,
      raw: (id) => gainPer100m(nearby[id]?.closeness?.maxDelta, proposedLinksLengthM(slots[id].links)),
      render: (id) => {
        const e = gainPer100m(nearby[id]?.closeness?.maxDelta, proposedLinksLengthM(slots[id].links))
        return e == null ? '—' : `${e >= 0 ? '+' : ''}${formatMetricValue(e)}`
      },
    },
    {
      id: 'bta',
      tone: 'orange',
      bar: true,
      today: '0',
      chipAccent: 'orange',
      label: 'Nearby through-routes (largest gain)',
      info: COMPARE_BETWEENNESS_NEARBY_INFO,
      raw: (id) => nearby[id]?.betweenness?.maxDelta ?? null,
      render: (id) => {
        const d = nearby[id]?.betweenness?.maxDelta
        return d == null ? '—' : `${d >= 0 ? '+' : ''}${formatMetricValue(d)}`
      },
    },
    {
      id: 'n-near',
      tone: 'violet',
      bar: true,
      today: '0',
      label: 'Nearby streets that changed',
      info: COMPARE_N_CHANGED_NEARBY_INFO,
      raw: (id) => {
        const n = nearby[id]?.closeness?.nChanged
        return typeof n === 'number' ? n : null
      },
      render: (id) => nearby[id]?.closeness?.nChanged ?? '—',
    },
    {
      id: 'links',
      tone: 'stone',
      bar: true,
      preferMin: true,
      today: '0 · 0 m',
      label: 'New links · length',
      info: COMPARE_LINKS_INFO,
      raw: (id) => {
        const m = proposedLinksLengthM(slots[id].links)
        return Number.isFinite(m) ? m : null
      },
      render: (id) => {
        const n = slots[id].links?.length ?? 0
        return `${n} · ${formatLengthM(proposedLinksLengthM(slots[id].links))}`
      },
    },
  ]

  const streetCards = [
    {
      id: 'streets-c',
      title: 'Nearby Streets (Closeness)',
      info: COMPARE_STREETS_CLOSENESS_INFO,
      tone: 'sky',
      baseline: baselineCloseness,
      gainedById: (id) => nearby[id]?.closeness?.topGainers ?? [],
      lostById: (id) => nearby[id]?.closeness?.topLosers ?? [],
    },
    {
      id: 'streets-b',
      title: 'Nearby Streets (Through-Routes)',
      info: COMPARE_STREETS_THROUGH_INFO,
      tone: 'orange',
      chipAccent: 'orange',
      baseline: baselineBetweenness,
      gainedById: (id) => nearby[id]?.betweenness?.topGainers ?? [],
      lostById: (id) => nearby[id]?.betweenness?.topLosers ?? [],
    },
  ]

  const detailRows = [
    {
      id: 'n-net-c',
      tone: 'lime',
      bar: true,
      today: '0',
      label: 'n changed (network, NQPDA)',
      raw: (id) => {
        const n = networkBlock(slots[id], 'closeness')?.n_changed
        return typeof n === 'number' ? n : null
      },
      render: (id) => networkBlock(slots[id], 'closeness')?.n_changed ?? '—',
    },
    {
      id: 'max-c',
      tone: 'lime',
      bar: true,
      today: '0',
      label: 'Max Δ (network, NQPDA)',
      raw: (id) => networkBlock(slots[id], 'closeness')?.max_delta ?? null,
      render: (id) => {
        const v = networkBlock(slots[id], 'closeness')?.max_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
    {
      id: 'min-c',
      tone: 'lime',
      bar: true,
      today: '0',
      label: 'Min Δ (network, NQPDA)',
      raw: (id) => networkBlock(slots[id], 'closeness')?.min_delta ?? null,
      render: (id) => {
        const v = networkBlock(slots[id], 'closeness')?.min_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
    {
      id: 'n-net-b',
      tone: 'fuchsia',
      bar: true,
      today: '0',
      label: 'n changed (network, BtA)',
      raw: (id) => {
        const n = networkBlock(slots[id], 'betweenness')?.n_changed
        return typeof n === 'number' ? n : null
      },
      render: (id) => networkBlock(slots[id], 'betweenness')?.n_changed ?? '—',
    },
    {
      id: 'max-b',
      tone: 'fuchsia',
      bar: true,
      today: '0',
      label: 'Max Δ (network, BtA)',
      raw: (id) => networkBlock(slots[id], 'betweenness')?.max_delta ?? null,
      render: (id) => {
        const v = networkBlock(slots[id], 'betweenness')?.max_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
    {
      id: 'min-b',
      tone: 'fuchsia',
      bar: true,
      today: '0',
      label: 'Min Δ (network, BtA)',
      raw: (id) => networkBlock(slots[id], 'betweenness')?.min_delta ?? null,
      render: (id) => {
        const v = networkBlock(slots[id], 'betweenness')?.min_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
  ]

  function downloadCsv() {
    const header = ['Metric', 'Baseline', ...ids.map((id) => `Option ${id}`)]
    const sparkRows = COMPARE_SPARKLINE_SCALES.map((meters) => [
      `Nearby closeness at ${sparkTick(meters)}`,
      '0',
      ...ids.map((id) => {
        const slot = slots[id]
        if (slot.status !== COMPARE_SLOT_STATUS.ready) return '—'
        const point = sparklineBySlot[id]?.find((p) => p.meters === meters)
        const d = point?.maxDelta
        return d == null ? '—' : `${d >= 0 ? '+' : ''}${formatMetricValue(d)}`
      }),
    ])
    const sharedCsv = [
      [
        'Shared Top 5 closeness gainers',
        '—',
        ...ids.map((id) => {
          if (slots[id].status !== COMPARE_SLOT_STATUS.ready) return '—'
          const names = sharedStreets.shared
            .filter((row) => row.optionIds.includes(id))
            .map((row) => streetName(row, baselineCloseness, namedRoads))
          return names.length ? names.join('; ') : '—'
        }),
      ],
      [
        'Unique Top 5 closeness gainers',
        '—',
        ...ids.map((id) => {
          if (slots[id].status !== COMPARE_SLOT_STATUS.ready) return '—'
          return listCsv(sharedStreets.unique[id], baselineCloseness, namedRoads)
        }),
      ],
    ]
    const body = [
      ...barRows.map((row) => [
        row.label,
        row.today ?? '0',
        ...ids.map((id) => {
          const slot = slots[id]
          if (slot.status !== COMPARE_SLOT_STATUS.ready) return '—'
          return String(row.render(id) ?? '—')
        }),
      ]),
      ...sparkRows,
      ...streetCards.flatMap((card) => [
        [
          `${card.title} · Gained`,
          '—',
          ...ids.map((id) => {
            if (slots[id].status !== COMPARE_SLOT_STATUS.ready) return '—'
            return listCsv(card.gainedById(id), card.baseline, namedRoads)
          }),
        ],
        [
          `${card.title} · Lost`,
          '—',
          ...ids.map((id) => {
            if (slots[id].status !== COMPARE_SLOT_STATUS.ready) return '—'
            return listCsv(card.lostById(id), card.baseline, namedRoads)
          }),
        ],
      ]),
      ...sharedCsv,
      ...detailRows.map((row) => [
        row.label,
        row.today ?? '0',
        ...ids.map((id) => {
          const slot = slots[id]
          if (slot.status !== COMPARE_SLOT_STATUS.ready) return '—'
          return String(row.render(id) ?? '—')
        }),
      ]),
    ]
    const csv = [header, ...body].map((line) => line.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'what-if-compare.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="what-if-compare-table px-3 py-3">
      <div className="what-if-compare-print-masthead mb-3 hidden border-b border-surface-300 pb-2 print:block">
        <h1 className="font-display text-base font-semibold">What-If Compare</h1>
        <p className="mt-0.5 text-[12px]">
          Mount Lavinia · {printStamp()} · {compareScalePhrase(scaleMeters)}
        </p>
        <p className="mt-0.5 text-[12px]">
          Options:{' '}
          {ids
            .filter((id) => slots[id]?.status === COMPARE_SLOT_STATUS.ready)
            .map((id) => optionPrintLabel(id, slots[id]))
            .join(' · ')}
        </p>
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-semibold text-surface-50">Comparison</h2>
          <MetricInfoButton
            title="What This Comparison Shows"
            ariaLabel="What does Comparison show?"
            points={COMPARE_HEADING_INFO}
            pulse={false}
          />
        </div>
        <div className="what-if-compare-no-print flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-md border border-surface-600 px-2 py-1 text-[11px] text-surface-200 hover:bg-surface-800"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-surface-600 px-2 py-1 text-[11px] text-surface-200 hover:bg-surface-800"
          >
            Print / PDF
          </button>
        </div>
      </div>

      <div className="border-b border-surface-800 py-2">
        <div className={`mb-1.5 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${HEADER_TONE.sky}`}>
          <p className="min-w-0 text-[11px] font-semibold text-surface-100">
            Nearby closeness across scales
          </p>
          <MetricInfoButton
            title="Nearby closeness across scales"
            ariaLabel="What does the scale strip show?"
            points={COMPARE_SCALE_INFO}
            pulse={false}
          />
        </div>
        <p className="mb-1.5 px-0.5 text-[10px] text-surface-500">500 · 2k · 3k · 5k</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-1.5">
          <BaselineCell>
            <p className="mt-0.5 text-[12px] tabular-nums text-surface-400">0</p>
          </BaselineCell>
          {ids.map((id) => {
            const slot = slots[id]
            const ready = slot.status === COMPARE_SLOT_STATUS.ready
            const points = sparklineBySlot[id] ?? []
            const active = points.find((p) => p.meters === scaleMeters)
            const color = COMPARE_SLOT_COLORS[id]?.line ?? '#94a3b8'
            return (
              <div key={id} className="min-w-0">
                <p className="text-[10px] font-semibold text-surface-500">
                  {id}
                  {slot.name ? ` · ${slot.name}` : ''}
                </p>
                {ready ? (
                  <>
                    <ScaleSparkline points={points} color={color} activeMeters={scaleMeters} />
                    <p className="mt-0.5 text-[11px] tabular-nums text-surface-200">
                      {active?.maxDelta == null
                        ? '—'
                        : `${active.maxDelta >= 0 ? '+' : ''}${formatMetricValue(active.maxDelta)} at ${sparkTick(scaleMeters)}`}
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-[12px] text-surface-400">—</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {barRows.map((row) => (
        <MetricBlock
          key={row.id}
          row={row}
          ids={ids}
          slots={slots}
          selectedSegmentId={selectedSegmentId}
          onSegmentClick={onSegmentClick}
        />
      ))}

      {streetCards.map((card) => (
        <StreetRankCard
          key={card.id}
          title={card.title}
          info={card.info}
          chipAccent={card.chipAccent}
          tone={card.tone}
          ids={ids}
          slots={slots}
          gainedById={card.gainedById}
          lostById={card.lostById}
          baseline={card.baseline}
          namedRoads={namedRoads}
          selectedSegmentId={selectedSegmentId}
          onSegmentClick={onSegmentClick}
        />
      ))}

      <div className="border-b border-surface-800 py-2">
        <div className={`mb-1.5 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${HEADER_TONE.emerald}`}>
          <p className="min-w-0 text-[11px] font-semibold text-surface-100">Shared Vs Unique Streets</p>
          <MetricInfoButton
            title="Shared Vs Unique Streets"
            ariaLabel="What do Shared Vs Unique Streets show?"
            points={COMPARE_SHARED_INFO}
            pulse={false}
          />
        </div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
          Gains In More Than One Option
        </p>
        {sharedStreets.shared.length ? (
          <ul className="mb-2 space-y-0.5">
            {sharedStreets.shared.map((row) => (
              <li key={row.ID}>
                <button
                  type="button"
                  onClick={() => onSegmentClick?.(row.ID)}
                  className={`flex w-full min-w-0 items-baseline justify-between gap-2 text-left text-[12px] hover:underline ${
                    selectedSegmentId == row.ID ? 'text-primary-300' : 'text-surface-100'
                  }`}
                >
                  <span className="min-w-0 truncate">{streetName(row, baselineCloseness, namedRoads)}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-surface-400">
                    {row.optionIds
                      .map((oid) => {
                        const d = row.deltas[oid]
                        return d == null ? null : `${oid} ${formatSignedDelta(d)}`
                      })
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2 text-[12px] text-surface-400">No Top 5 closeness gainer is shared.</p>
        )}
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-surface-400">Only In One Option</p>
        <div
          className="grid gap-x-1.5"
          style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}
        >
          {ids.map((id) => {
            const slot = slots[id]
            const ready = slot.status === COMPARE_SLOT_STATUS.ready
            const items = ready ? labeledStreetItems(sharedStreets.unique[id] ?? [], baselineCloseness, namedRoads) : []
            return (
              <div key={id} className="min-w-0">
                <p className="text-[10px] font-semibold text-surface-500">
                  {id}
                  {slot.name ? ` · ${slot.name}` : ''}
                </p>
                {!ready || !items.length ? (
                  <p className="mt-0.5 text-[12px] text-surface-400">{ready ? 'None unique' : '—'}</p>
                ) : (
                  <ul className="mt-0.5 space-y-0.5">
                    {items.map((item) => (
                      <li key={item.ID}>
                        <button
                          type="button"
                          onClick={() => onSegmentClick?.(item.ID)}
                          className={`flex w-full min-w-0 items-baseline justify-between gap-1 text-left hover:underline ${
                            selectedSegmentId == item.ID ? 'text-primary-300' : 'text-surface-100'
                          }`}
                        >
                          <span className="min-w-0 truncate text-[11px] leading-snug">{item.label}</span>
                          <span className="shrink-0 text-[10px] tabular-nums text-surface-400">
                            {formatSignedDelta(item.delta)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDetailOpen((v) => !v)}
        className="what-if-compare-no-print mt-2 text-[11px] text-surface-400 hover:text-surface-200"
      >
        {detailOpen ? 'Hide more detail' : 'More detail (whole network)'}
      </button>

      <div className={`mt-2 ${detailOpen ? '' : 'hidden print:block'}`}>
          <div className={`mb-1 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${HEADER_TONE.indigo}`}>
            <p className="min-w-0 text-[11px] font-semibold text-surface-100">
              Whole-Network Summary At This Radius
            </p>
            <MetricInfoButton
              title="Whole-Network Detail"
              ariaLabel="What does whole-network detail show?"
              points={COMPARE_NETWORK_DETAIL_INFO}
              pulse={false}
            />
          </div>
          {detailRows.map((row) => (
            <MetricBlock
              key={row.id}
              row={row}
              ids={ids}
              slots={slots}
              selectedSegmentId={selectedSegmentId}
              onSegmentClick={onSegmentClick}
            />
          ))}
      </div>
    </section>
  )
}
