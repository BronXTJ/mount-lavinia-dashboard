import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import { DENSITY_TYPOLOGY } from '../../constants/density.js'
import TypologyInfoButton from './TypologyInfoButton.jsx'

function renderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">FSI: {row?.fsi?.toFixed(3)}</p>
      <p className="mt-0.5 text-surface-200">GSI: {row?.gsi?.toFixed(3)}</p>
      <p className="mt-0.5 text-surface-200">
        OSR: {row?.osr != null ? row.osr.toFixed(3) : '—'}
      </p>
      <p className="mt-1 text-surface-300">{row?.typology}</p>
    </div>
  )
}

function typologyDot(props) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={4} fill={payload?.color ?? '#94a3b8'} />
}

/**
 * FSI vs GSI scatter colored by 8-type typology; median reference lines retained.
 */
export default function FsiGsiScatter({ data, medianFsi, medianGsi }) {
  const { isAnimationActive, animationDuration } = useChartAnimation()
  const hasData = data?.length > 0
  const legendItems = Object.values(DENSITY_TYPOLOGY)

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">
          FSI vs GSI — Colored by Typology (FSI · GSI · OSR)
        </h3>
        <TypologyInfoButton />
      </div>
      <p className="mt-1.5 text-xs font-medium text-surface-200">
        Axes show FSI and GSI; dot color uses the 8-type median classification including OSR.
      </p>
      <div className="relative mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="fsi"
              name="FSI"
              tick={{ fill: '#9fadb9', fontSize: 10 }}
              axisLine={{ stroke: '#2a3a4a' }}
              tickLine={false}
              label={{ value: 'FSI', position: 'insideBottom', offset: -2, fill: '#9fadb9', fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="gsi"
              name="GSI"
              tick={{ fill: '#9fadb9', fontSize: 10 }}
              axisLine={{ stroke: '#2a3a4a' }}
              tickLine={false}
              width={40}
              label={{ value: 'GSI', angle: -90, position: 'insideLeft', fill: '#9fadb9', fontSize: 10 }}
            />
            {medianFsi != null && (
              <ReferenceLine x={medianFsi} stroke="#94a3b8" strokeDasharray="4 4" />
            )}
            {medianGsi != null && (
              <ReferenceLine y={medianGsi} stroke="#94a3b8" strokeDasharray="4 4" />
            )}
            <Tooltip content={renderTooltip} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={hasData ? data : []}
              shape={typologyDot}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {legendItems.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-xs text-surface-200">
            <span
              className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm"
              style={{ backgroundColor: t.color }}
            />
            <span className="leading-tight">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
