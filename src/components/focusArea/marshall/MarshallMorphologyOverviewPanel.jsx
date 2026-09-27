import { useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { NETWORK_FORM_GN_NAMES } from '../../../constants/networkForm.js'
import {
  MARSHALL_INFO_POINTS,
  MARSHALL_INTERPRETATION,
  MARSHALL_MATRIX_INFO,
} from '../../../constants/marshallMorphology.js'
import { formatStoredCount, formatStoredPercent } from '../../../utils/marshallMorphologyFormat.js'
import FocusAreaPanelCard from '../FocusAreaPanelCard.jsx'
import MetricInfoButton from '../MetricInfoButton.jsx'
import MarshallMatrixChart from './MarshallMatrixChart.jsx'
import MarshallMatrixExpandModal from './MarshallMatrixExpandModal.jsx'

function ScopeChip({ active, label, disabled, title, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className="rounded-full border px-2.5 py-1 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: active ? '#00b4d8' : 'rgba(71,85,105,0.8)',
        backgroundColor: active ? 'rgba(0,180,216,0.12)' : 'transparent',
        color: active ? '#e0f2fe' : '#cbd5e1',
      }}
    >
      {label}
    </button>
  )
}

export default function MarshallMorphologyOverviewPanel({
  metrics,
  scopes = [],
  selectedScope,
  onSelectScope,
  loading,
  error,
}) {
  const [expanded, setExpanded] = useState(false)
  const gnName = metrics?.gn_name ?? selectedScope

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 border-l-4 border-primary-500 pl-3">
        <h2 className="font-display text-lg font-semibold text-surface-50">Marshall morphology</h2>
        <MetricInfoButton
          title="Marshall morphology"
          ariaLabel="What does Marshall morphology show?"
          points={MARSHALL_INFO_POINTS}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ScopeChip label="All" disabled title="Marshall morphology is shown for one GN division at a time." />
        {NETWORK_FORM_GN_NAMES.map((name) => (
          <ScopeChip
            key={name}
            active={name === selectedScope}
            label={name}
            onClick={() => onSelectScope?.(name)}
          />
        ))}
      </div>

      <p className="text-[11px] text-surface-400">
        Structural pattern for <span className="font-semibold text-surface-200">{gnName}</span> GN
      </p>

      {loading && (
        <div
          className="flex min-h-[160px] items-center justify-center rounded-lg border border-surface-700 bg-surface-800 text-xs text-surface-300"
          data-testid="marshall-loading"
        >
          Loading Marshall morphology…
        </div>
      )}

      {error && !loading && (
        <p className="text-xs text-rose-300" data-testid="marshall-error">
          Marshall morphology data is not available.
        </p>
      )}

      {!loading && !error && (
        <>
        <FocusAreaPanelCard className="flex min-h-0 flex-col !p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-sm font-semibold text-surface-100">
                Marshall Matrix — Street Network Morphology
              </h3>
              <MetricInfoButton
                title="Marshall matrix"
                ariaLabel="How do I read the Marshall matrix?"
                points={MARSHALL_MATRIX_INFO}
              />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              disabled={!metrics}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-surface-600 px-2 py-1 text-[11px] text-surface-200 hover:bg-surface-700 disabled:opacity-40"
              aria-label="Expand Marshall matrix"
            >
              <Maximize2 size={12} aria-hidden />
              Expand
            </button>
          </div>
          <MarshallMatrixChart />
          <p className="mt-2 text-[11px] leading-relaxed text-surface-300">{MARSHALL_INTERPRETATION}</p>
        </FocusAreaPanelCard>

        <FocusAreaPanelCard className="!p-3">
          <h3 className="mb-2 font-display text-sm font-semibold text-surface-100">GN comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-surface-200" data-testid="marshall-gn-table">
              <thead>
                <tr className="text-surface-400">
                  <th className="py-1 pr-2 font-medium">GN</th>
                  <th className="py-1 pr-2 font-medium">T</th>
                  <th className="py-1 pr-2 font-medium">X</th>
                  <th className="py-1 pr-2 font-medium">Cells</th>
                  <th className="py-1 pr-2 font-medium">Culs</th>
                  <th className="py-1 pr-2 font-medium">T-ratio</th>
                  <th className="py-1 font-medium">Cell-ratio</th>
                </tr>
              </thead>
              <tbody>
                {scopes.map((scope) => (
                  <tr
                    key={scope.gn_name}
                    className={scope.gn_name === selectedScope ? 'text-surface-50' : undefined}
                  >
                    <td className="py-0.5 pr-2">{scope.gn_name}</td>
                    <td className="py-0.5 pr-2 tabular-nums">{formatStoredCount(scope.counts?.n_T)}</td>
                    <td className="py-0.5 pr-2 tabular-nums">{formatStoredCount(scope.counts?.n_X)}</td>
                    <td className="py-0.5 pr-2 tabular-nums">
                      {formatStoredCount(scope.counts?.n_cell_marshall)}
                    </td>
                    <td className="py-0.5 pr-2 tabular-nums">
                      {formatStoredCount(scope.counts?.n_cul_marshall)}
                    </td>
                    <td className="py-0.5 pr-2 tabular-nums">{formatStoredPercent(scope.ratios?.T_ratio)}</td>
                    <td className="py-0.5 tabular-nums">{formatStoredPercent(scope.ratios?.Cell_ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FocusAreaPanelCard>
        </>
      )}

      <MarshallMatrixExpandModal open={expanded} onClose={() => setExpanded(false)} />
    </div>
  )
}
