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
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import { formatEnvValue } from '../../utils/environmentalStats.js'
import { ENV_INFO } from './environmentalInfoContent.js'

function renderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">
        Cell #{row?.id != null ? row.id : '—'}
      </p>
      <p className="mt-0.5 text-surface-200">UTCI: {formatEnvValue(row?.utci, 1)} °C</p>
      <p className="mt-0.5 text-surface-200">UHI: {formatEnvValue(row?.uhi)} °C</p>
    </div>
  )
}

function scatterDot(props) {
  const { cx, cy } = props
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={2.5} fill="#f46d43" fillOpacity={0.65} />
}

/**
 * UTCI (°C) vs UHI intensity (°C) scatter for sampled thermal cells.
 */
export default function UtciUhiScatter({ data, meanUtci, meanUhi }) {
  const { isAnimationActive, animationDuration } = useChartAnimation()
  const hasData = data?.length > 0

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">
          UTCI vs UHI Intensity
        </h3>
        <MetricInfoButton
          title={ENV_INFO.utciUhiScatter.title}
          points={ENV_INFO.utciUhiScatter.points}
          ariaLabel={ENV_INFO.utciUhiScatter.ariaLabel}
        />
      </div>
      <p className="mt-1 text-xs text-surface-300">
        Each point is a sampled cell — right = hotter feel, up = warmer than rural
      </p>

      {!hasData ? (
        <p className="mt-6 text-center text-xs text-surface-400">No scatter data</p>
      ) : (
        <div className="mt-3 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 20 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="utci"
                name="UTCI"
                unit=" °C"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                label={{
                  value: 'UTCI (°C)',
                  position: 'insideBottom',
                  offset: -8,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="uhi"
                name="UHI"
                unit=" °C"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                label={{
                  value: 'UHI (°C)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 8,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              {Number.isFinite(meanUtci) && (
                <ReferenceLine
                  x={meanUtci}
                  stroke="#74add1"
                  strokeDasharray="4 4"
                  strokeOpacity={0.9}
                />
              )}
              {Number.isFinite(meanUhi) && (
                <ReferenceLine
                  y={meanUhi}
                  stroke="#ef8a62"
                  strokeDasharray="4 4"
                  strokeOpacity={0.9}
                />
              )}
              <Tooltip content={renderTooltip} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                data={data}
                shape={scatterDot}
                isAnimationActive={isAnimationActive}
                animationDuration={animationDuration}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasData && (
        <p className="mt-1 text-[11px] text-surface-400">
          Showing {data.length.toLocaleString()} sampled cells · dashed lines = means
        </p>
      )}
    </div>
  )
}
