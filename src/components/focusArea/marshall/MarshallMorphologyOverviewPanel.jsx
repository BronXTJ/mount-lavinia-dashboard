import { useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { NETWORK_FORM_GN_NAMES } from '../../../constants/networkForm.js'
import {
  MARSHALL_GN_COLORS,
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
      className="w-full rounded-full border px-2 py-1 text-center text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2 border-l-4 border-primary-500 pl-3">
        <h2 className="font-display text-lg font-semibold text-surface-50">Marshall Morphology</h2>
        <MetricInfoButton
          title="Marshall Morphology"
          ariaLabel="What does Marshall Morphology show?"
          points={MARSHALL_INFO_POINTS}
        />
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {NETWORK_FORM_GN_NAMES.map((name, index) => (
          <div key={name} className={index < 3 ? 'col-span-2' : 'col-span-3'}>
            <ScopeChip
              active={name === selectedScope}
              label={name}
              onClick={() => onSelectScope?.(name)}
            />
          </div>
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
          Loading Marshall Morphology…
        </div>
      )}

      {error && !loading && (
        <p className="text-xs text-rose-300" data-testid="marshall-error">
          Marshall Morphology data is not available.
        </p>
      )}

      {!loading && !error && (
        <>
        <FocusAreaPanelCard className="marshall-matrix-frame flex min-h-0 flex-1 flex-col !p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-sm font-semibold text-surface-100">
                Marshall Matrix — Street Network Morphology
              </h3>
              <MetricInfoButton
                title="Marshall Matrix"
                ariaLabel="How do I read the Marshall Matrix?"
                points={MARSHALL_MATRIX_INFO}
              />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              disabled={!metrics}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-surface-600 px-2 py-1 text-[11px] text-surface-200 hover:bg-surface-700 disabled:opacity-40"
              aria-label="Expand Marshall Matrix"
            >
              <Maximize2 size={12} aria-hidden />
              Expand
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <MarshallMatrixChart scopes={scopes} selectedName={selectedScope} />
          </div>
          <p className="mt-1.5 shrink-0 text-[11px] leading-snug text-surface-400">
            {MARSHALL_INTERPRETATION}
          </p>
        </FocusAreaPanelCard>

        <FocusAreaPanelCard className="shrink-0 !p-3">
          <h3 className="mb-2 font-display text-sm font-semibold text-surface-100">GN Comparison</h3>
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
                {scopes.map((scope) => {
                  const selected = scope.gn_name === selectedScope
                  return (
                    <tr
                      key={scope.gn_name}
                      className={selected ? 'bg-surface-900/70 text-surface-50' : 'text-surface-300'}
                    >
                      <td className="py-1 pr-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: MARSHALL_GN_COLORS[scope.gn_name] }}
                            aria-hidden
                          />
                          {scope.gn_name}
                        </span>
                      </td>
                      <td className="py-1 pr-2 tabular-nums">{formatStoredCount(scope.counts?.n_T)}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatStoredCount(scope.counts?.n_X)}</td>
                      <td className="py-1 pr-2 tabular-nums">
                        {formatStoredCount(scope.counts?.n_cell_marshall)}
                      </td>
                      <td className="py-1 pr-2 tabular-nums">
                        {formatStoredCount(scope.counts?.n_cul_marshall)}
                      </td>
                      <td className="py-1 pr-2 tabular-nums">{formatStoredPercent(scope.ratios?.T_ratio)}</td>
                      <td className="py-1 tabular-nums">{formatStoredPercent(scope.ratios?.Cell_ratio)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </FocusAreaPanelCard>
        </>
      )}

      <MarshallMatrixExpandModal
        open={expanded}
        onClose={() => setExpanded(false)}
        scopes={scopes}
        selectedName={selectedScope}
      />
    </div>
  )
}
