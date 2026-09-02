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
      render: (id) => {
        const d = nearby[id]?.closeness?.maxDelta
        return d == null ? '—' : `${d >= 0 ? '+' : ''}${formatMetricValue(d)}`
      },
    },
    {
      id: 'bta',
      label: 'Betweenness change (BtA) nearby',
      info: COMPARE_BETWEENNESS_NEARBY_INFO,
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
      render: (id) => nearby[id]?.closeness?.nChanged ?? '—',
    },
  ]

  const detailRows = [
    {
      id: 'n-net-c',
      label: 'n changed (network, NQPDA)',
      render: (id) => networkBlock(slots[id], 'closeness')?.n_changed ?? '—',
    },
    {
      id: 'max-c',
      label: 'Max Δ (network, NQPDA)',
      render: (id) => {
        const v = networkBlock(slots[id], 'closeness')?.max_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
    {
      id: 'min-c',
      label: 'Min Δ (network, NQPDA)',
      render: (id) => {
        const v = networkBlock(slots[id], 'closeness')?.min_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
    {
      id: 'n-net-b',
      label: 'n changed (network, BtA)',
      render: (id) => networkBlock(slots[id], 'betweenness')?.n_changed ?? '—',
    },
    {
      id: 'max-b',
      label: 'Max Δ (network, BtA)',
      render: (id) => {
        const v = networkBlock(slots[id], 'betweenness')?.max_delta
        return v == null ? '—' : formatMetricValue(v)
      },
    },
    {
      id: 'min-b',
      label: 'Min Δ (network, BtA)',
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
    <section className="what-if-compare-table shrink-0 border-t border-surface-700 bg-surface-900 px-3 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="py-1.5 pr-2 font-medium text-surface-400">Metric</th>
              {ids.map((id) => (
                <th key={id} className="px-2 py-1.5 font-semibold text-surface-100">
                  Option {id}
                  {slots[id].name ? ` · ${slots[id].name}` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-surface-800">
                <th className="py-1.5 pr-2 font-medium text-surface-200">
                  <span className="inline-flex items-center gap-1.5">
                    {row.label}
                    <MetricInfoButton
                      title={row.label}
                      ariaLabel={`What does ${row.label} show?`}
                      points={row.info}
                      pulse={false}
                    />
                  </span>
                </th>
                {ids.map((id) => {
                  const slot = slots[id]
                  const value = cell(slot, () => row.render(id))
                  const segId = row.segmentId?.(id)
                  const selected = segId != null && selectedSegmentId == segId
                  if (row.clickable && slot.status === COMPARE_SLOT_STATUS.ready && segId != null) {
                    return (
                      <td key={id} className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => onSegmentClick?.(segId)}
                          className={`text-left tabular-nums hover:underline ${
                            selected ? 'text-primary-300' : 'text-surface-100'
                          }`}
                        >
                          {value}
                        </button>
                      </td>
                    )
                  }
                  return (
                    <td key={id} className="px-2 py-1.5 tabular-nums text-surface-100">
                      {value}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => setDetailOpen((v) => !v)}
        className="mt-2 text-[11px] text-surface-400 hover:text-surface-200"
      >
        {detailOpen ? 'Hide more detail' : 'More detail (whole network)'}
      </button>

      {detailOpen ? (
        <div className="mt-2 overflow-x-auto">
          <div className="mb-1 flex items-center gap-1.5">
            <p className="text-[11px] text-surface-400">Whole-network summary at this radius</p>
            <MetricInfoButton
              title="Whole-network detail"
              ariaLabel="What does whole-network detail show?"
              points={COMPARE_NETWORK_DETAIL_INFO}
              pulse={false}
            />
          </div>
          <table className="w-full min-w-[36rem] border-collapse text-left text-[11px]">
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.id} className="border-b border-surface-800">
                  <th className="py-1.5 pr-2 font-medium text-surface-200">{row.label}</th>
                  {ids.map((id) => (
                    <td key={id} className="px-2 py-1.5 tabular-nums text-surface-100">
                      {cell(slots[id], () => row.render(id))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
