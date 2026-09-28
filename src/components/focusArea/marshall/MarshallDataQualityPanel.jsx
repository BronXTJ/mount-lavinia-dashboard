import { useState } from 'react'
import { ChevronDown, CircleAlert } from 'lucide-react'

const TREATMENT_LABEL = 'Uncertain — excluded'

const KIND_BREAKDOWN_LABEL = {
  junctions: 'Junction crossings',
  cells: 'Cell',
  cul_de_sacs: 'Cul-de-sacs',
}

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

function breakdownLines(uncertainty) {
  const { junctions, cells, culs } = uncertaintyTotals(uncertainty)
  const lines = []
  if (junctions > 0) {
    lines.push(`${junctions} ${KIND_BREAKDOWN_LABEL.junctions}`)
  }
  if (cells > 0) {
    const label = cells === 1 ? KIND_BREAKDOWN_LABEL.cells : `${KIND_BREAKDOWN_LABEL.cells}s`
    lines.push(`${cells} ${label}`)
  }
  if (culs > 0) {
    lines.push(`${culs} ${KIND_BREAKDOWN_LABEL.cul_de_sacs}`)
  }
  return lines
}

export default function MarshallDataQualityPanel({ uncertainty }) {
  const [expanded, setExpanded] = useState(false)
  const { total } = uncertaintyTotals(uncertainty)
  const breakdown = breakdownLines(uncertainty)
  const cases = uncertainty?.excluded_cases ?? []

  const summaryLine =
    total > 0
      ? `${total} uncertain case${total === 1 ? '' : 's'} excluded from ratio calculations`
      : 'No uncertain cases excluded from ratio calculations'

  const ariaSummary = [
    summaryLine,
    breakdown.length ? breakdown.join(', ') : null,
    'Reported ratios use confirmed classifications only.',
  ]
    .filter(Boolean)
    .join(' ')

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
      {breakdown.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-[11px] text-surface-200">
          {breakdown.map((line) => (
            <li key={line} className="leading-snug">{line}</li>
          ))}
        </ul>
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
                  {cases.map((row) => (
                    <tr key={`${row.kind}-${row.id}`} className="border-b border-surface-800/60 last:border-0">
                      <td className="py-1 pr-2 align-top whitespace-nowrap">
                        {KIND_TABLE_LABEL[row.kind] ?? row.kind}
                      </td>
                      <td className="py-1 pr-2 align-top font-mono text-[10px] text-surface-100">{row.id}</td>
                      <td className="py-1 align-top text-surface-300">{TREATMENT_LABEL}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
