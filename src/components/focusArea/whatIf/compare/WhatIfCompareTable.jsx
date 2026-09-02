import { useMemo, useState } from 'react'
import MetricInfoButton from '../../MetricInfoButton.jsx'
import { COMPARE_SLOT_IDS, COMPARE_SLOT_STATUS } from '../../../../constants/whatIfCompare.js'
import {
  COMPARE_BETWEENNESS_NEARBY_INFO,
  COMPARE_CLOSENESS_NEARBY_INFO,
  COMPARE_GAINER_INFO,
  COMPARE_HEADING_INFO,
  COMPARE_LINKS_INFO,
  COMPARE_LOSER_INFO,
  COMPARE_N_CHANGED_NEARBY_INFO,
  COMPARE_NETWORK_DETAIL_INFO,
} from '../../../../constants/whatIfCompareHelpContent.js'
import { formatMetricValue, lookupRoadName } from '../../../../utils/centralityStats.js'
import { nearbySegmentDeltaStats, NEARBY_DELTA_METERS } from '../../../../utils/nearbyWhatIfDeltas.js'
import { formatLengthM, proposedLinksLengthM } from '../../../../utils/whatIfCompareGeometry.js'

function cell(slot, renderReady) {
  if (slot.status !== COMPARE_SLOT_STATUS.ready) return '—'
  return renderReady()
}

function numericHighlight(ids, slots, rawFn) {
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
    if (v === max) map[id] = 'text-emerald-300'
    else if (v === min) map[id] = 'text-rose-300'
  }
  return map
}

function MetricBlock({ row, ids, slots, selectedSegmentId, onSegmentClick }) {
  const highlight = row.raw ? numericHighlight(ids, slots, row.raw) : {}
  return (
    <div className="border-b border-surface-800 py-2">
      <div className="mb-1.5 flex items-start gap-1.5">
        <p className="text-[11px] font-medium leading-snug text-surface-200">{row.label}</p>
        {row.info ? (
          <MetricInfoButton
            title={row.label}
            ariaLabel={`What does ${row.label} show?`}
            points={row.info}
            pulse={false}
          />
        ) : null}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-1.5">
        {ids.map((id) => {
          const slot = slots[id]
          const value = cell(slot, () => row.render(id))
          const segId = row.segmentId?.(id)
          const selected = segId != null && selectedSegmentId == segId
          const tone = highlight[id] ?? 'text-surface-100'
          return (
            <div key={id} className="min-w-0">
              <p className="text-[10px] font-semibold text-surface-500">
                {id}
                {slot.name ? ` · ${slot.name}` : ''}
              </p>
              {row.clickable && slot.status === COMPARE_SLOT_STATUS.ready && segId != null ? (
                <button
                  type="button"
                  onClick={() => onSegmentClick?.(segId)}
                  className={`mt-0.5 break-words text-left text-[11px] hover:underline ${
                    selected ? 'text-primary-300' : tone
                  }`}
                >
                  {value}
                </button>
              ) : (
                <p className={`mt-0.5 break-words text-[11px] tabular-nums ${tone}`}>{value}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function segmentLabel(row, baseline, namedRoads) {
  if (!row?.ID) return '—'
  const feature = baseline?.features?.find((f) => Number(f.properties?.ID) === Number(row.ID))
  const name = feature ? lookupRoadName(feature, namedRoads) : null
  return name ? `${name} · #${row.ID}` : `Seg #${row.ID}`
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

  function networkBlock(slot, metric) {
    const key = `${metric}_${scaleMeters}`
    return slot.summary?.metrics?.[key] ?? null
  }

  const rows = [
    {
      id: 'nqpd',
      label: 'Closeness change (NQPDA) nearby',
      info: COMPARE_CLOSENESS_NEARBY_INFO,
      raw: (id) => nearby[id]?.closeness?.maxDelta ?? null,
      render: (id) => {
        const d = nearby[id]?.closeness?.maxDelta
        return d == null ? '—' : `${d >= 0 ? '+' : ''}${formatMetricValue(d)}`
      },
    },
    {
      id: 'bta',
      label: 'Betweenness change (BtA) nearby',
      info: COMPARE_BETWEENNESS_NEARBY_INFO,
      raw: (id) => nearby[id]?.betweenness?.maxDelta ?? null,
      render: (id) => {
        const d = nearby[id]?.betweenness?.maxDelta
        return d == null ? '—' : `${d >= 0 ? '+' : ''}${formatMetricValue(d)}`
      },
    },
    {
      id: 'gainer-c',
      label: 'Strongest gainer (nearby, NQPDA)',
      info: COMPARE_GAINER_INFO,
      clickable: true,
      metricKey: 'closeness',
      render: (id) => segmentLabel(nearby[id]?.closeness?.topGainer, baselineCloseness, namedRoads),
      segmentId: (id) => nearby[id]?.closeness?.topGainer?.ID ?? null,
    },
    {
      id: 'loser-c',
      label: 'Strongest loser (nearby, NQPDA)',
      info: COMPARE_LOSER_INFO,
      clickable: true,
      render: (id) => segmentLabel(nearby[id]?.closeness?.topLoser, baselineCloseness, namedRoads),
      segmentId: (id) => nearby[id]?.closeness?.topLoser?.ID ?? null,
    },
    {
      id: 'gainer-b',
      label: 'Strongest gainer (nearby, BtA)',
      info: COMPARE_GAINER_INFO,
      clickable: true,
      render: (id) => segmentLabel(nearby[id]?.betweenness?.topGainer, baselineBetweenness, namedRoads),
      segmentId: (id) => nearby[id]?.betweenness?.topGainer?.ID ?? null,
    },
    {
      id: 'loser-b',
      label: 'Strongest loser (nearby, BtA)',
      info: COMPARE_LOSER_INFO,
      clickable: true,
      render: (id) => segmentLabel(nearby[id]?.betweenness?.topLoser, baselineBetweenness, namedRoads),
      segmentId: (id) => nearby[id]?.betweenness?.topLoser?.ID ?? null,
    },
    {
      id: 'links',
      label: 'Links drawn / length',
      info: COMPARE_LINKS_INFO,
      render: (id) => {
        const n = slots[id].links?.length ?? 0
        return `${n} · ${formatLengthM(proposedLinksLengthM(slots[id].links))}`
      },
    },
    {
      id: 'n-near',
      label: 'n changed (nearby)',
      info: COMPARE_N_CHANGED_NEARBY_INFO,
      raw: (id) => {
        const n = nearby[id]?.closeness?.nChanged
        return typeof n === 'number' ? n : null
      },
      render: (id) => nearby[id]?.closeness?.nChanged ?? '—',
    },
  ]

  const detailRows = [
    {
      id: 'n-net-c',
      label: 'n changed (network, NQPDA)',
      raw: (id) => {
        const n = networkBlock(slots[id], 'closeness')?.n_changed
        return typeof n === 'number' ? n : null
      },
      render: (id) => networkBlock(slots[id], 'closeness')?.n_changed ?? '—',
    },
    {
      id: 'max-c',
      label: 'Max Δ (network, NQPDA)',
      raw: (id) => networkBlock(slots[id], 'closeness')?.max_delta ?? null,
      render: (id) => {
        const v = networkBlock(slots[id], 'closeness')?.max_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
    {
      id: 'min-c',
      label: 'Min Δ (network, NQPDA)',
      raw: (id) => networkBlock(slots[id], 'closeness')?.min_delta ?? null,
      render: (id) => {
        const v = networkBlock(slots[id], 'closeness')?.min_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
    {
      id: 'n-net-b',
      label: 'n changed (network, BtA)',
      raw: (id) => {
        const n = networkBlock(slots[id], 'betweenness')?.n_changed
        return typeof n === 'number' ? n : null
      },
      render: (id) => networkBlock(slots[id], 'betweenness')?.n_changed ?? '—',
    },
    {
      id: 'max-b',
      label: 'Max Δ (network, BtA)',
      raw: (id) => networkBlock(slots[id], 'betweenness')?.max_delta ?? null,
      render: (id) => {
        const v = networkBlock(slots[id], 'betweenness')?.max_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
    {
      id: 'min-b',
      label: 'Min Δ (network, BtA)',
      raw: (id) => networkBlock(slots[id], 'betweenness')?.min_delta ?? null,
      render: (id) => {
        const v = networkBlock(slots[id], 'betweenness')?.min_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
  ]

  const csvRows = [...rows, ...detailRows]

  function downloadCsv() {
    const header = ['Metric', ...ids.map((id) => `Option ${id}`)]
    const body = csvRows.map((row) => [
      row.label,
      ...ids.map((id) => {
        const slot = slots[id]
        if (slot.status !== COMPARE_SLOT_STATUS.ready) return '—'
        return String(row.render(id) ?? '—')
      }),
    ])
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
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-semibold text-surface-50">Comparison</h2>
          <MetricInfoButton
            title="What this comparison shows"
            ariaLabel="What does Comparison show?"
            points={COMPARE_HEADING_INFO}
            pulse={false}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
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

      {rows.map((row) => (
        <MetricBlock
          key={row.id}
          row={row}
          ids={ids}
          slots={slots}
          selectedSegmentId={selectedSegmentId}
          onSegmentClick={onSegmentClick}
        />
      ))}

      <button
        type="button"
        onClick={() => setDetailOpen((v) => !v)}
        className="mt-2 text-[11px] text-surface-400 hover:text-surface-200"
      >
        {detailOpen ? 'Hide more detail' : 'More detail (whole network)'}
      </button>

      {detailOpen ? (
        <div className="mt-2">
          <div className="mb-1 flex items-center gap-1.5">
            <p className="text-[11px] text-surface-400">Whole-network summary at this radius</p>
            <MetricInfoButton
              title="Whole-network detail"
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
      ) : null}
    </section>
  )
}
