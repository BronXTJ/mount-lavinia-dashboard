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

  return (
    <div
      role="dialog"
      aria-label={`${name} Marshall matrix details`}
      data-testid="marshall-matrix-point-popup"
      className="z-10 w-[min(16rem,88vw)] rounded-md border border-surface-600 bg-surface-800/95 p-2.5 shadow-lg backdrop-blur-sm"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <h4 className="truncate font-display text-sm font-semibold text-surface-50">{name}</h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-surface-600 p-0.5 text-surface-300 hover:bg-surface-700"
          aria-label="Close"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      <dl className="space-y-1 text-[11px] text-surface-200">
        <div className="flex justify-between gap-2 border-b border-surface-700/80 pb-1">
          <dt className="text-surface-400">Matrix position</dt>
          <dd className="tabular-nums text-right">
            X {formatStoredPercent(xRatio)} · Cell {formatStoredPercent(cellRatio)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-surface-400">T-ratio / Cul-ratio</dt>
          <dd className="tabular-nums text-right">
            {formatStoredPercent(ratios.T_ratio)} / {formatStoredPercent(ratios.Cul_ratio)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-surface-400">T-junctions</dt>
          <dd className="tabular-nums">{formatStoredCount(counts.n_T)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-surface-400">X-junctions</dt>
          <dd className="tabular-nums">{formatStoredCount(counts.n_X)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-surface-400">Marshall cells</dt>
          <dd className="tabular-nums">{formatStoredCount(counts.n_cell_marshall)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-surface-400">Marshall cul-de-sacs</dt>
          <dd className="tabular-nums">{formatStoredCount(counts.n_cul_marshall)}</dd>
        </div>
      </dl>
    </div>
  )
}
