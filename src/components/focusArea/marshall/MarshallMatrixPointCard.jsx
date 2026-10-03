import { X } from 'lucide-react'
import { MARSHALL_GN_COLORS } from '../../../constants/marshallMorphology.js'
import {
  formatStoredCount,
  formatStoredPercent,
} from '../../../utils/marshallMorphologyFormat.js'

export default function MarshallMatrixPointCard({ metrics, onClose }) {
  if (!metrics?.gn_name) return null

  const name = metrics.gn_name
  const counts = metrics.counts ?? {}
  const ratios = metrics.ratios ?? {}
  const matrix = metrics.matrix ?? {}
  const color = MARSHALL_GN_COLORS[name] ?? '#e2e8f0'

  const xRatio = matrix.x_ratio ?? ratios.X_ratio
  const cellRatio = matrix.y_cell_ratio ?? ratios.Cell_ratio

  const countsLine = [
    `T ${formatStoredCount(counts.n_T)}`,
    `X ${formatStoredCount(counts.n_X)}`,
    `Cells ${formatStoredCount(counts.n_cell_marshall)}`,
    `Culs ${formatStoredCount(counts.n_cul_marshall)}`,
  ].join(' · ')

  return (
    <div
      role="dialog"
      aria-label={`${name} Marshall matrix details`}
      data-testid="marshall-matrix-point-popup"
      className="max-w-[10.5rem] rounded-md border border-surface-600 bg-surface-800/95 p-2 shadow-lg backdrop-blur-sm"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-1 flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <h4 className="truncate font-display text-[11px] font-semibold leading-tight text-surface-50">
            {name}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
          aria-label="Close"
        >
          <X size={12} aria-hidden />
        </button>
      </div>
      <div className="space-y-0.5 text-[10px] leading-tight text-surface-200">
        <p className="tabular-nums text-surface-100">
          X {formatStoredPercent(xRatio)} · Cell {formatStoredPercent(cellRatio)}
        </p>
        <p className="tabular-nums text-surface-300">
          T {formatStoredPercent(ratios.T_ratio)} · Cul {formatStoredPercent(ratios.Cul_ratio)}
        </p>
        <p className="flex flex-wrap gap-x-1 tabular-nums text-surface-400">{countsLine}</p>
      </div>
    </div>
  )
}
