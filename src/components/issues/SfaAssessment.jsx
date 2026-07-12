import { useState } from 'react'
import {
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import useChartAnimation from '../../hooks/useChartAnimation.js'
import { ISSUES_INFO } from './issuesInfoContent.js'
import { scoreColor, sfaData } from './issuesData.js'

function ScoreCell({ score }) {
  const color = scoreColor(score)
  return (
    <div className="flex min-w-[72px] flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium tabular-nums text-surface-50">{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-900">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${(score / 10) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function PriorityBadge({ priority }) {
  const isHigh = priority === 'High'
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        backgroundColor: isHigh ? '#be123c' : '#fcd34d',
        color: isHigh ? '#ffffff' : '#0f1923',
      }}
    >
      {priority}
    </span>
  )
}

function BubbleTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const avg = Math.round((d.suitability + d.feasibility + d.acceptability) / 3)
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-900/95 px-3 py-2 text-sm shadow-lg backdrop-blur-[8px]">
      <p className="font-semibold text-surface-50">{d.intervention}</p>
      <p className="mt-1.5 text-surface-200">
        Suitability {d.suitability} · Feasibility {d.feasibility} · Acceptability {d.acceptability}
      </p>
      <p className="mt-0.5 tabular-nums text-surface-400">
        Avg {avg} · {d.priority} priority
      </p>
    </div>
  )
}

const SHORT_LABELS = {
  'Working Coast Zoning': 'Working Coast',
  'Sustainable Tourism Pivot': 'Tourism Pivot',
  'Reef Conservation Program': 'Reef Conservation',
  'Community Governance Model': 'Community Governance',
  'Fishery Infrastructure Upgrade': 'Fishery Infrastructure',
  'Heritage Tourism Circuit': 'Heritage Circuit',
}

/** Display-only offsets so coinciding (F,A) points do not stack. */
function buildChartData() {
  const keyCount = new Map()
  return sfaData.map((d) => {
    const key = `${d.feasibility},${d.acceptability}`
    const n = keyCount.get(key) ?? 0
    keyCount.set(key, n + 1)
    const jitter = n === 0 ? 0 : n % 2 === 1 ? 0.28 : -0.28
    return {
      ...d,
      feasibilityPlot: d.feasibility + jitter,
      acceptabilityPlot: d.acceptability + (n > 1 ? 0.15 * (n - 1) : 0),
      z: d.suitability * 40,
      avg: Math.round((d.suitability + d.feasibility + d.acceptability) / 3),
      shortLabel: SHORT_LABELS[d.intervention] ?? d.intervention,
    }
  })
}

/** SFA — full-width prioritisation matrix + scoring table below. */
export default function SfaAssessment() {
  const [activeIntervention, setActiveIntervention] = useState(null)
  const { isAnimationActive, animationDuration, animationEasing, showLabels, onAnimationEnd } =
    useChartAnimation()

  const chartData = buildChartData()

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-1 flex-col gap-4">
      {/* Chart on top — full width */}
      <div
        className="flex flex-col rounded-xl border border-surface-700 bg-surface-800 p-5 shadow-card backdrop-blur-[8px]"
        style={{ animation: 'issuesFadeUp 0.45s ease both' }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold text-surface-50">
            Intervention Prioritisation Matrix
          </h3>
          <MetricInfoButton
            title={ISSUES_INFO.sfaMatrix.title}
            points={ISSUES_INFO.sfaMatrix.points}
            ariaLabel={ISSUES_INFO.sfaMatrix.ariaLabel}
          />
        </div>
        <p className="mt-1 text-sm text-surface-300">
          Top-right = high feasibility + high acceptability = implement first
        </p>
        <div className="relative mt-3 h-[400px] w-full">
          <span className="pointer-events-none absolute left-[8%] top-[4%] z-10 rounded-md bg-surface-900/80 px-2 py-0.5 text-xs font-semibold text-[#fcd34d] backdrop-blur-sm">
            Build Consensus
          </span>
          <span className="pointer-events-none absolute right-[4%] top-[4%] z-10 rounded-md bg-surface-900/80 px-2 py-0.5 text-xs font-semibold text-[#86efac] backdrop-blur-sm">
            Implement Now
          </span>
          <span className="pointer-events-none absolute bottom-[10%] left-[6%] z-10 rounded-md bg-surface-900/80 px-2 py-0.5 text-xs font-semibold text-surface-300 backdrop-blur-sm">
            Long-term Planning
          </span>
          <span className="pointer-events-none absolute bottom-[10%] right-[3%] z-10 rounded-md bg-surface-900/80 px-2 py-0.5 text-xs font-semibold text-[#fb923c] backdrop-blur-sm">
            Overcome Resistance
          </span>

          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 24, right: 28, bottom: 36, left: 12 }}>
              <ReferenceArea x1={7} x2={10} y1={7} y2={10} fill="#86efac" fillOpacity={0.07} />
              <ReferenceArea x1={1} x2={7} y1={7} y2={10} fill="#fcd34d" fillOpacity={0.06} />
              <ReferenceArea x1={7} x2={10} y1={1} y2={7} fill="#fb923c" fillOpacity={0.06} />
              <ReferenceArea x1={1} x2={7} y1={1} y2={7} fill="#64748b" fillOpacity={0.06} />

              <CartesianGrid stroke="#2a3a4a" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="feasibilityPlot"
                name="Feasibility"
                domain={[1, 10]}
                tick={{ fill: '#e0e0e0', fontSize: 12 }}
                label={{
                  value: 'Feasibility',
                  position: 'insideBottom',
                  offset: -16,
                  fill: '#e0e0e0',
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="acceptabilityPlot"
                name="Acceptability"
                domain={[1, 10]}
                tick={{ fill: '#e0e0e0', fontSize: 12 }}
                label={{
                  value: 'Acceptability',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#e0e0e0',
                  fontSize: 12,
                }}
              />
              <ZAxis type="number" dataKey="z" range={[90, 380]} />
              <ReferenceLine x={7} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />
              <ReferenceLine y={7} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />
              <Tooltip content={<BubbleTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                data={chartData}
                name="Interventions"
                isAnimationActive={isAnimationActive}
                animationDuration={animationDuration}
                animationEasing={animationEasing}
                onAnimationEnd={onAnimationEnd}
                onClick={(data) => {
                  const name = data?.intervention
                  if (!name) return
                  setActiveIntervention((prev) => (prev === name ? null : name))
                }}
                cursor="pointer"
              >
                {chartData.map((entry) => {
                  const isActive = activeIntervention === entry.intervention
                  return (
                    <Cell
                      key={entry.intervention}
                      fill={entry.priority === 'High' ? '#be123c' : '#fcd34d'}
                      fillOpacity={
                        activeIntervention == null ? 0.9 : isActive ? 1 : 0.22
                      }
                      stroke={isActive ? '#ffffff' : '#e0e0e0'}
                      strokeWidth={isActive ? 3 : 1.5}
                    />
                  )
                })}
                <LabelList
                    dataKey="shortLabel"
                    content={({ x, y, value, index }) => {
                      if (!showLabels) return null
                      if (x == null || y == null || !value) return null
                      const entry = chartData[index]
                      const isActive = activeIntervention === entry?.intervention
                      if (activeIntervention && !isActive) return null
                      return (
                        <text
                          className="chart-value-label"
                          x={x}
                          y={y - 14}
                          textAnchor="middle"
                          fill="#e0e0e0"
                          fontSize={11}
                          fontWeight={600}
                          fontFamily="Inter, system-ui, sans-serif"
                          style={{
                            paintOrder: 'stroke',
                            stroke: '#0f1923',
                            strokeWidth: 3,
                          }}
                        >
                          {value}
                        </text>
                      )
                    }}
                  />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-surface-200">
          {sfaData.map((d) => (
            <li key={d.intervention}>
              <button
                type="button"
                onClick={() =>
                  setActiveIntervention((prev) =>
                    prev === d.intervention ? null : d.intervention,
                  )
                }
                className={`inline-flex items-center gap-2 rounded-md px-2 py-1 transition ${
                  activeIntervention === d.intervention
                    ? 'bg-surface-700 text-surface-50'
                    : 'hover:text-surface-50'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: d.priority === 'High' ? '#be123c' : '#fcd34d' }}
                />
                {d.intervention}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Scoring table below */}
      <div
        className="min-w-0 overflow-x-auto rounded-xl border border-surface-700 bg-surface-800 shadow-card backdrop-blur-[8px]"
        style={{ animation: 'issuesFadeUp 0.4s ease both', animationDelay: '80ms' }}
      >
        <div className="flex items-center gap-2 border-b border-surface-700 px-3 py-2.5">
          <p className="font-display text-sm font-semibold text-surface-50">SFA Scores</p>
          <MetricInfoButton
            title={ISSUES_INFO.sfa.title}
            points={ISSUES_INFO.sfa.points}
            ariaLabel={ISSUES_INFO.sfa.ariaLabel}
          />
        </div>
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-surface-800">
            <tr className="border-b border-surface-700 text-xs uppercase tracking-wide text-surface-300">
              <th className="px-3 py-3 font-semibold">Intervention</th>
              <th className="px-3 py-3 font-semibold">Description</th>
              <th className="px-3 py-3 font-semibold">Suitability</th>
              <th className="px-3 py-3 font-semibold">Feasibility</th>
              <th className="px-3 py-3 font-semibold">Acceptability</th>
              <th className="px-3 py-3 font-semibold">Avg</th>
              <th className="px-3 py-3 font-semibold">Priority</th>
            </tr>
          </thead>
          <tbody>
            {sfaData.map((row, i) => {
              const avg = Math.round(
                (row.suitability + row.feasibility + row.acceptability) / 3,
              )
              const isActive = activeIntervention === row.intervention
              return (
                <tr
                  key={row.intervention}
                  onClick={() =>
                    setActiveIntervention((prev) =>
                      prev === row.intervention ? null : row.intervention,
                    )
                  }
                  className={`cursor-pointer border-b border-surface-700/60 last:border-0 transition-colors ${
                    isActive ? 'bg-[#be123c]/15' : 'hover:bg-surface-900/60'
                  }`}
                  style={{
                    animation: 'issuesFadeUp 0.4s ease both',
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  <td className="px-3 py-3 font-medium text-surface-50">{row.intervention}</td>
                  <td className="max-w-[280px] px-3 py-3 text-sm leading-snug text-surface-200">
                    {row.description}
                  </td>
                  <td className="px-3 py-3">
                    <ScoreCell score={row.suitability} />
                  </td>
                  <td className="px-3 py-3">
                    <ScoreCell score={row.feasibility} />
                  </td>
                  <td className="px-3 py-3">
                    <ScoreCell score={row.acceptability} />
                  </td>
                  <td className="px-3 py-3">
                    <ScoreCell score={avg} />
                  </td>
                  <td className="px-3 py-3">
                    <PriorityBadge priority={row.priority} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
