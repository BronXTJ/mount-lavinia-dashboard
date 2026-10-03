import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { MARSHALL_GN_COLORS } from '../../../constants/marshallMorphology.js'
import {
  formatStoredCount,
  formatStoredPercent,
  marshallChartPoints,
} from '../../../utils/marshallMorphologyFormat.js'

const TICKS_FULL = [0, 0.25, 0.5, 0.75, 1]
const TICKS_COMPACT = [0, 0.1, 0.2, 0.3, 0.4, 0.5]

function formatTick(value) {
  return value.toFixed(2)
}

function scopeByGnName(scopes) {
  const map = new Map()
  for (const scope of scopes ?? []) {
    if (scope?.gn_name) map.set(scope.gn_name, scope)
  }
  return map
}

/**
 * Stored Marshall matrix. Ratios are not recomputed.
 * The study-area total is not a point, and the corner names are not categories.
 */
export default function MarshallMatrixChart({
  scopes = [],
  selectedName = null,
  size = 'compact',
  onSelectScope,
}) {
  const expanded = size === 'expanded'
  const axisMax = expanded ? 1 : 0.5
  const ticks = expanded ? TICKS_FULL : TICKS_COMPACT
  const points = marshallChartPoints(scopes)
  const scopeMap = useMemo(() => scopeByGnName(scopes), [scopes])
  const [popupName, setPopupName] = useState(null)
  const chartRef = useRef(null)
  const popupRef = useRef(null)
  const clipId = useId().replace(/:/g, '')

  const width = expanded ? 720 : 520
  const height = expanded ? 560 : 360
  const pad = { left: 62, right: 68, top: 40, bottom: 48 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom
  const xOf = useCallback(
    (value) => pad.left + (value / axisMax) * plotW,
    [axisMax, plotW],
  )
  const yOf = useCallback(
    (value) => pad.top + (1 - value / axisMax) * plotH,
    [axisMax, plotH],
  )

  const popupScope = popupName ? scopeMap.get(popupName) : null

  const closePopup = useCallback(() => setPopupName(null), [])

  const openPopup = useCallback(
    (name) => {
      setPopupName(name)
      onSelectScope?.(name)
    },
    [onSelectScope],
  )

  useEffect(() => {
    if (!popupName) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') closePopup()
    }

    function onPointerDown(event) {
      const target = event.target
      if (popupRef.current?.contains(target)) return
      if (target?.closest?.('[data-marshall-matrix-point]')) return
      closePopup()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [popupName, closePopup])

  const legendGridClass = expanded
    ? 'mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3'
    : 'mt-1.5 shrink-0 grid grid-cols-2 gap-x-3 gap-y-1.5'

  const legendListClass = expanded ? `${legendGridClass} shrink-0` : legendGridClass

  const cornerXLow = expanded ? 0.28 : 0.12
  const cornerXHigh = expanded ? 0.92 : 0.46
  const cornerYLow = expanded ? 0.03 : 0.02
  const cornerYHigh = expanded ? 0.97 : 0.48

  return (
    <div
      ref={chartRef}
      data-testid="marshall-matrix"
      className={
        expanded ? 'relative flex min-h-0 w-full flex-col' : 'relative flex h-full min-h-[280px] w-full flex-col'
      }
    >
      <div className={expanded ? 'min-h-0 flex-1' : 'min-h-0 flex-1'}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Marshall Matrix. Horizontal axis X-ratio, vertical axis Cell-ratio, five GN divisions."
          className={
            expanded
              ? 'h-auto w-full max-h-[min(560px,calc(90vh-11.5rem))] rounded-md bg-surface-900'
              : 'h-full min-h-0 w-full rounded-md bg-surface-900'
          }
          data-testid="marshall-matrix-figure"
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={pad.left} y={pad.top} width={plotW} height={plotH} />
            </clipPath>
          </defs>
          <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="#0b1220" stroke="#334155" />
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={xOf(tick)}
                x2={xOf(tick)}
                y1={pad.top}
                y2={pad.top + plotH}
                stroke="#1e293b"
              />
              <line
                y1={yOf(tick)}
                y2={yOf(tick)}
                x1={pad.left}
                x2={pad.left + plotW}
                stroke="#1e293b"
              />
              <text x={xOf(tick)} y={pad.top + plotH + 16} textAnchor="middle" fill="#94a3b8" fontSize="11">
                {formatTick(tick)}
              </text>
              <text x={xOf(tick)} y={pad.top - 12} textAnchor="middle" fill="#94a3b8" fontSize="11">
                {formatTick(1 - tick)}
              </text>
              <text x={pad.left - 8} y={yOf(tick) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">
                {formatTick(tick)}
              </text>
              <text x={pad.left + plotW + 8} y={yOf(tick) + 4} textAnchor="start" fill="#94a3b8" fontSize="11">
                {formatTick(1 - tick)}
              </text>
            </g>
          ))}
          <text x={pad.left + plotW / 2} y={height - 10} textAnchor="middle" fill="#e2e8f0" fontSize="12">
            X-ratio
          </text>
          <text x={pad.left + plotW / 2} y={14} textAnchor="middle" fill="#e2e8f0" fontSize="12">
            T-ratio
          </text>
          <text
            transform={`translate(16 ${pad.top + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="12"
          >
            Cell-ratio
          </text>
          <text
            transform={`translate(${width - 16} ${pad.top + plotH / 2}) rotate(90)`}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="12"
          >
            Cul-ratio
          </text>
          <text x={xOf(cornerXLow)} y={yOf(cornerYLow)} fill="#64748b" fontSize="11">
            T-tree
          </text>
          <text x={pad.left + 10} y={pad.top + 16} fill="#64748b" fontSize="11">
            T-cell
          </text>
          <text
            x={xOf(cornerXHigh)}
            y={yOf(cornerYHigh)}
            textAnchor="end"
            fill="#64748b"
            fontSize="11"
          >
            X-tree
          </text>
          <text x={xOf(cornerXHigh)} y={pad.top + 16} textAnchor="end" fill="#64748b" fontSize="11">
            X-cell
          </text>
          <g clipPath={`url(#${clipId})`}>
            {points.map((point, index) => {
              const selected = point.name === selectedName
              const color = MARSHALL_GN_COLORS[point.name] ?? '#e2e8f0'
              const radius = selected ? 7 : 4.5
              const label = `${point.name}. X-ratio ${point.x.toFixed(3)}. Cell-ratio ${point.y.toFixed(3)}.`
              return (
                <g key={point.name} data-marshall-matrix-point>
                  <circle
                    className="marshall-matrix-pulse"
                    cx={xOf(point.x)}
                    cy={yOf(point.y)}
                    r={radius}
                    fill={color}
                    style={{ animationDelay: `${index * 0.28}s` }}
                    pointerEvents="none"
                  />
                  <foreignObject
                    x={xOf(point.x) - 14}
                    y={yOf(point.y) - 14}
                    width={28}
                    height={28}
                    className="overflow-visible"
                  >
                    <button
                      type="button"
                      xmlns="http://www.w3.org/1999/xhtml"
                      aria-label={label}
                      className="m-0 h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                      onClick={(event) => {
                        event.stopPropagation()
                        openPopup(point.name)
                      }}
                    />
                  </foreignObject>
                  <circle
                    cx={xOf(point.x)}
                    cy={yOf(point.y)}
                    r={radius}
                    fill={color}
                    stroke={selected ? '#f8fafc' : '#0b1220'}
                    strokeWidth={selected ? 2 : 1}
                    pointerEvents="none"
                  />
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {popupScope && (
        <div
          ref={popupRef}
          data-testid="marshall-matrix-point-popup"
          className="absolute left-2 right-2 top-2 z-10 rounded-lg border border-surface-600 bg-surface-900/95 p-3 shadow-lg backdrop-blur-sm sm:left-auto sm:right-3 sm:top-3 sm:max-w-[16rem]"
          role="dialog"
          aria-label={`${popupScope.gn_name} Marshall metrics`}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="font-display text-sm font-semibold text-surface-50">{popupScope.gn_name}</p>
            <button
              type="button"
              onClick={closePopup}
              className="shrink-0 rounded border border-surface-600 p-0.5 text-surface-300 hover:bg-surface-800"
              aria-label="Close GN details"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
          <dl className="space-y-1 text-[11px] text-surface-200">
            <div className="flex justify-between gap-3">
              <dt className="text-surface-400">X-ratio</dt>
              <dd className="tabular-nums font-medium text-surface-50">
                {formatStoredPercent(popupScope.ratios?.X_ratio)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-surface-400">Cell-ratio</dt>
              <dd className="tabular-nums font-medium text-surface-50">
                {formatStoredPercent(popupScope.ratios?.Cell_ratio)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-surface-400">Cul-ratio</dt>
              <dd className="tabular-nums font-medium text-surface-50">
                {formatStoredPercent(popupScope.ratios?.Cul_ratio)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-surface-400">T-ratio</dt>
              <dd className="tabular-nums font-medium text-surface-50">
                {formatStoredPercent(popupScope.ratios?.T_ratio)}
              </dd>
            </div>
          </dl>
          <dl className="mt-2 border-t border-surface-700/80 pt-2 space-y-1 text-[11px] text-surface-200">
            <div className="flex justify-between gap-3">
              <dt className="text-surface-400">T-junctions</dt>
              <dd className="tabular-nums">{formatStoredCount(popupScope.counts?.n_T)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-surface-400">X-junctions</dt>
              <dd className="tabular-nums">{formatStoredCount(popupScope.counts?.n_X)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-surface-400">Cells</dt>
              <dd className="tabular-nums">{formatStoredCount(popupScope.counts?.n_cell_marshall)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-surface-400">Cul-de-sacs</dt>
              <dd className="tabular-nums">{formatStoredCount(popupScope.counts?.n_cul_marshall)}</dd>
            </div>
          </dl>
        </div>
      )}

      <ul className={legendListClass} aria-label="GN divisions in Marshall Matrix">
        {points.map((point) => {
          const selected = point.name === selectedName
          const legendContent = (
            <>
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: MARSHALL_GN_COLORS[point.name] ?? '#e2e8f0' }}
                aria-hidden
              />
              <span className={`min-w-0 ${selected ? 'font-semibold' : ''}`}>{point.name}</span>
            </>
          )
          if (onSelectScope) {
            return (
              <li key={point.name}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectScope(point.name)}
                  className={`flex min-w-0 w-full items-center gap-1.5 rounded px-0.5 py-0.5 text-left text-[11px] leading-tight transition-colors hover:bg-surface-800/60 ${
                    selected ? 'text-surface-50' : 'text-surface-300'
                  }`}
                >
                  {legendContent}
                </button>
              </li>
            )
          }
          return (
            <li
              key={point.name}
              className={`flex min-w-0 items-center gap-1.5 text-[11px] leading-tight ${
                selected ? 'text-surface-50' : 'text-surface-300'
              }`}
            >
              {legendContent}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
