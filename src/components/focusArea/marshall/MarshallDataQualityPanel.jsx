import { useState } from 'react'
import { ChevronDown, CircleAlert } from 'lucide-react'
import {
  MARSHALL_EXCLUDED_KIND_COLORS,
} from '../../../constants/marshallMorphology.js'

const TREATMENT_LABEL = 'Uncertain — excluded'

const KIND_BREAKDOWN = [
  { key: 'junctions', kind: 'junction', label: 'Junction crossings' },
  { key: 'cells', kind: 'cell', label: 'Cell' },
  { key: 'cul_de_sacs', kind: 'cul-de-sac', label: 'Cul-de-sacs' },
]

const KIND_TABLE_LABEL = {
  junction: 'Junction',
  cell: 'Cell',
  'cul-de-sac': 'Cul-de-sac',
}

function uncertaintyTotals(uncertainty) {
  const junctions = uncertainty?.junctions ?? 0
  const cells = uncertainty?.cells ?? 0
  const culs = uncertainty?.cul_de_sacs ?? 0
  return { junctions, cells, culs, total: junctions + cells + culs }
}

function kindColor(kind) {
  return MARSHALL_EXCLUDED_KIND_COLORS[kind] ?? '#94a3b8'
}

function canFocusCase(row) {
  return Number.isFinite(Number(row?.lat)) && Number.isFinite(Number(row?.lng))
}

export default function MarshallDataQualityPanel({ uncertainty, onFocusExcludedCase }) {
  const [expanded, setExpanded] = useState(false)
  const { junctions, cells, culs, total } = uncertaintyTotals(uncertainty)
  const cases = uncertainty?.excluded_cases ?? []

  const summaryLine =
    total > 0
      ? `${total} uncertain case${total === 1 ? '' : 's'} excluded from ratio calculations`
      : 'No uncertain cases excluded from ratio calculations'

  const breakdownRows = KIND_BREAKDOWN
    .map(({ key, kind, label }) => {
      const count = uncertainty?.[key] ?? 0
      if (count <= 0) return null
      const displayLabel = key === 'cells' && count !== 1 ? `${label}s` : label
      return { kind, count, label: displayLabel }
    })
    .filter(Boolean)

  const ariaSummary = [
    summaryLine,
    breakdownRows.length
      ? breakdownRows.map((r) => `${r.count} ${r.label}`).join(', ')
      : null,
    'Reported ratios use confirmed classifications only.',
  ]
    .filter(Boolean)
    .join(' ')

  function handleRowClick(row) {
    if (!canFocusCase(row) || !onFocusExcludedCase) return
    onFocusExcludedCase({
      lat: Number(row.lat),
      lng: Number(row.lng),
      kind: row.kind,
      id: row.id,
    })
  }

  return (
    <div
      role="note"
      data-testid="marshall-uncertainty"
      aria-label={`Data quality: ${ariaSummary}`}
      className="shrink-0 rounded-md border border-rose-400/50 border-l-4 border-l-rose-400 bg-rose-500/12 px-2.5 py-2"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <CircleAlert size={14} className="shrink-0 text-rose-300" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-200">Data quality</p>
      </div>
      <p className="text-xs font-medium leading-snug text-surface-50">{summaryLine}</p>
      {breakdownRows.length > 0 && (
        <div className="mt-1.5 rounded-md bg-surface-900/30 px-2 py-1.5">
          <ul className="space-y-1 text-[11px] text-surface-200">
            {breakdownRows.map((row) => (
              <li key={row.kind} className="flex items-center gap-2 leading-snug">
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/10"
                  style={{ backgroundColor: kindColor(row.kind) }}
                  aria-hidden
                />
                <span className="tabular-nums font-medium text-surface-50">{row.count}</span>
                <span className="text-surface-200">{row.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-1.5 text-[11px] leading-snug text-surface-300">
        Reported ratios use confirmed classifications only.
      </p>
      {cases.length > 0 && (
        <div className="mt-2 border-t border-rose-400/20 pt-2">
          <button
            type="button"
            className="flex w-full items-center gap-1 text-left text-[11px] font-medium text-rose-200/90 transition-colors hover:text-rose-100"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            <ChevronDown
              size={14}
              className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
            View excluded cases
          </button>
          {expanded && (
            <div className="mt-1.5 overflow-x-auto">
              <table className="w-full min-w-[12rem] border-collapse text-left text-[10px] text-surface-200">
                <thead>
                  <tr className="border-b border-surface-700/80 text-surface-400">
                    <th className="pb-1 pr-2 font-medium">Type</th>
                    <th className="pb-1 pr-2 font-medium">ID</th>
                    <th className="pb-1 font-medium">Treatment</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((row) => {
                    const color = kindColor(row.kind)
                    const focusable = canFocusCase(row) && onFocusExcludedCase
                    return (
                      <tr
                        key={`${row.kind}-${row.id}`}
                        className={`border-b border-surface-800/60 last:border-0 ${
                          focusable ? 'cursor-pointer hover:bg-surface-800/40' : ''
                        }`}
                        style={{ borderLeftWidth: '3px', borderLeftColor: `${color}55` }}
                        onClick={() => focusable && handleRowClick(row)}
                        onKeyDown={(e) => {
                          if (focusable && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            handleRowClick(row)
                          }
                        }}
                        tabIndex={focusable ? 0 : undefined}
                        role={focusable ? 'button' : undefined}
                      >
                        <td className="py-1 pr-2 align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                            {KIND_TABLE_LABEL[row.kind] ?? row.kind}
                          </span>
                        </td>
                        <td className="py-1 pr-2 align-top font-mono text-[10px] text-surface-100">{row.id}</td>
                        <td className="py-1 align-top text-surface-400">{TREATMENT_LABEL}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
