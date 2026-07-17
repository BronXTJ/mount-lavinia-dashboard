import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import useChartAnimation from '../hooks/useChartAnimation.js'

const DIVISION_COLORS = {
  'Mount Lavinia': '#00b4d8',
  'Kawdana West': '#f77f00',
  Watarappala: '#a78bfa',
  Wathumulla: '#34d399',
  Wedikanda: '#fbbf24',
}

function renderTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-surface-700 bg-surface-850 px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-surface-50">{label} (Census)</p>
      {payload.map((item) => (
        <p key={item.dataKey} style={{ color: item.color }}>
          {item.dataKey}: <span className="text-surface-50">{item.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

/**
 * Population trend line chart — one line per GN division across census years.
 * When selectedGnName is set, that division's line and legend item are emphasized.
 */
export default function PopulationTrendChart({ divisions, trend, selectedGnName = null }) {
  const { isAnimationActive, animationDuration } = useChartAnimation()
  const hasSelection = Boolean(selectedGnName)

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={trend} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tickFormatter={(year) => `${year} (Census)`}
            tick={{ fill: '#9fadb9', fontSize: 11 }}
            axisLine={{ stroke: '#2a3a4a' }}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#9fadb9', fontSize: 11 }} axisLine={{ stroke: '#2a3a4a' }} tickLine={false} />
          <Tooltip content={renderTooltip} />
          {divisions.map((division) => {
            const isSelected = selectedGnName === division
            const isMuted = hasSelection && !isSelected
            return (
              <Line
                key={division}
                type="monotone"
                dataKey={division}
                stroke={DIVISION_COLORS[division] ?? '#9fadb9'}
                strokeWidth={isSelected ? 3.5 : isMuted ? 1.5 : 2.5}
                strokeOpacity={isMuted ? 0.28 : 1}
                dot={{ r: isSelected ? 5 : isMuted ? 2 : 3, fillOpacity: isMuted ? 0.28 : 1 }}
                activeDot={{ r: isSelected ? 7 : 5 }}
                isAnimationActive={isAnimationActive}
                animationDuration={animationDuration}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Custom legend — Recharts' built-in <Legend> silently re-sorts items
          alphabetically, which breaks the intentional division ordering. */}
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {divisions.map((division) => {
          const isSelected = selectedGnName === division
          const isMuted = hasSelection && !isSelected
          return (
            <li
              key={division}
              className={`flex items-center gap-1.5 text-xs transition ${
                isSelected
                  ? 'rounded-md bg-primary-500/15 px-2 py-0.5 font-semibold text-primary-300 ring-1 ring-primary-500/40'
                  : isMuted
                    ? 'text-surface-400 opacity-40'
                    : 'text-surface-200'
              }`}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DIVISION_COLORS[division] ?? '#9fadb9' }}
                aria-hidden="true"
              />
              {division}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
