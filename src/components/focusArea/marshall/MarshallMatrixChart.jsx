import { MARSHALL_GN_COLORS } from '../../../constants/marshallMorphology.js'
import { marshallChartPoints } from '../../../utils/marshallMorphologyFormat.js'

const TICKS = [0, 0.25, 0.5, 0.75, 1]

function formatTick(value) {
  return value.toFixed(2)
}

/**
 * Stored Marshall matrix. Ratios are not recomputed.
 * The study-area total is not a point, and the corner names are not categories.
 */
export default function MarshallMatrixChart({ scopes = [], selectedName = null, size = 'compact' }) {
  const expanded = size === 'expanded'
  const points = marshallChartPoints(scopes)
  const width = expanded ? 720 : 520
  const height = expanded ? 560 : 360
  const pad = { left: 62, right: 68, top: 40, bottom: 48 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom
  const xOf = (value) => pad.left + value * plotW
  const yOf = (value) => pad.top + (1 - value) * plotH

  const legendGridClass = expanded
    ? 'mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3'
    : 'mt-1.5 shrink-0 grid grid-cols-2 gap-x-3 gap-y-1.5'

  return (
    <div
      data-testid="marshall-matrix"
      className={expanded ? 'w-full' : 'flex h-full min-h-[240px] w-full flex-col'}
    >
      <div className={expanded ? undefined : 'min-h-0 flex-1'}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Marshall Matrix. Horizontal axis X-ratio, vertical axis Cell-ratio, five GN divisions."
          className={
            expanded ? 'h-auto w-full rounded-md bg-surface-900' : 'h-full min-h-0 w-full rounded-md bg-surface-900'
          }
          data-testid="marshall-matrix-figure"
        >
        <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="#0b1220" stroke="#334155" />
        {TICKS.map((tick) => (
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
        <text x={xOf(0.28)} y={yOf(0.03)} fill="#64748b" fontSize="11">
          T-tree
        </text>
        <text x={pad.left + 10} y={pad.top + 16} fill="#64748b" fontSize="11">
          T-cell
        </text>
        <text x={pad.left + plotW - 10} y={pad.top + plotH - 10} textAnchor="end" fill="#64748b" fontSize="11">
          X-tree
        </text>
        <text x={pad.left + plotW - 10} y={pad.top + 16} textAnchor="end" fill="#64748b" fontSize="11">
          X-cell
        </text>
        {points.map((point, index) => {
          const selected = point.name === selectedName
          const color = MARSHALL_GN_COLORS[point.name] ?? '#e2e8f0'
          const radius = selected ? 7 : 4.5
          return (
            <g key={point.name}>
              <circle
                className="marshall-matrix-pulse"
                cx={xOf(point.x)}
                cy={yOf(point.y)}
                r={radius}
                fill={color}
                style={{ animationDelay: `${index * 0.28}s` }}
              />
              <circle
                cx={xOf(point.x)}
                cy={yOf(point.y)}
                r={radius}
                fill={color}
                stroke={selected ? '#f8fafc' : '#0b1220'}
                strokeWidth={selected ? 2 : 1}
              />
              <title>{`${point.name}. X-ratio ${point.x.toFixed(3)}. Cell-ratio ${point.y.toFixed(3)}.`}</title>
            </g>
          )
        })}
        </svg>
      </div>
      <ul className={legendGridClass} aria-label="GN divisions in Marshall Matrix">
        {points.map((point) => {
          const selected = point.name === selectedName
          return (
            <li
              key={point.name}
              className={`flex min-w-0 items-center gap-1.5 text-[11px] leading-tight ${
                selected ? 'text-surface-50' : 'text-surface-300'
              }`}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: MARSHALL_GN_COLORS[point.name] ?? '#e2e8f0' }}
                aria-hidden
              />
              <span className={`min-w-0 ${selected ? 'font-semibold' : ''}`}>{point.name}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
