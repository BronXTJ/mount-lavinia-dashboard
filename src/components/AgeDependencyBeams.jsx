import { useEffect, useState } from 'react'
import { MousePointerClick } from 'lucide-react'
import useChartAnimation from '../hooks/useChartAnimation.js'
import { dependencyRatios, studyAreaTotals } from '../utils/populationStructure.js'

const CHILD_COLOR = '#38bdf8'
const ELDERLY_COLOR = '#fbbf24'
const GN_COLORS = {
  'Mount Lavinia': '#00b4d8',
  'Kawdana West': '#f77f00',
  Watarappala: '#a78bfa',
  Wathumulla: '#34d399',
  Wedikanda: '#fb7185',
}

function AnimatedRatioTrack({
  label,
  value,
  avg,
  maxRatio,
  color,
  progress,
  durationMs,
  showLabels,
  onBarTransitionEnd,
}) {
  const targetPct = Math.min(100, (value / maxRatio) * 100)
  const avgPct = Math.min(100, (avg / maxRatio) * 100)

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-surface-300">
        {label}
      </span>
      <div className="relative h-5 min-w-0 flex-1 rounded-full bg-surface-700/80">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${targetPct * progress}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            transition: `width ${durationMs}ms ease-out`,
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'width') onBarTransitionEnd?.()
          }}
        />
        <div
          className="pointer-events-none absolute top-1/2 z-[1] h-7 w-0 -translate-y-1/2 border-l-2 border-dashed border-white"
          style={{ left: `${avgPct}%` }}
          title={`Study-area average ${avg.toFixed(2)}`}
        />
        <div
          className="pointer-events-none absolute z-[1] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm"
          style={{ left: `${avgPct}%`, top: '-2px' }}
          aria-hidden
        />
      </div>
      <span
        className={`w-12 shrink-0 text-right font-mono text-sm font-semibold text-surface-50 transition-opacity duration-200 ${
          showLabels ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {value.toFixed(2)}
      </span>
    </div>
  )
}

function StaticRatioTrack({ label, value, maxRatio, color }) {
  const widthPct = Math.min(100, (value / maxRatio) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-surface-400">
        {label}
      </span>
      <div className="relative h-3.5 min-w-0 flex-1 rounded-full bg-surface-700/80">
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-70"
          style={{
            width: `${widthPct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
          }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-xs font-semibold text-surface-300">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

function SelectedDependencyCard({
  name,
  swatch,
  child,
  elderly,
  areaDep,
  maxRatio,
  animationDuration,
  showLabels,
  onAnimationEnd,
  animate,
}) {
  const [progress, setProgress] = useState(animate ? 0 : 1)

  useEffect(() => {
    if (!animate) {
      setProgress(1)
      onAnimationEnd?.()
      return undefined
    }
    setProgress(0)
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setProgress(1))
    })
    return () => window.cancelAnimationFrame(id)
  }, [name, animate, onAnimationEnd])

  return (
    <div className="flex flex-1 flex-col justify-center rounded-lg border border-primary-400/40 bg-primary-500/10 px-4 py-5">
      <div className="mb-5 flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: swatch }} />
        <h4 className="font-display text-lg font-semibold text-surface-50">{name}</h4>
      </div>
      <div className="flex flex-col gap-4">
        <AnimatedRatioTrack
          label="Child"
          value={child}
          avg={areaDep.child}
          maxRatio={maxRatio}
          color={CHILD_COLOR}
          progress={progress}
          durationMs={animationDuration}
          showLabels={showLabels}
          onBarTransitionEnd={onAnimationEnd}
        />
        <AnimatedRatioTrack
          label="Elderly"
          value={elderly}
          avg={areaDep.elderly}
          maxRatio={maxRatio}
          color={ELDERLY_COLOR}
          progress={progress}
          durationMs={animationDuration}
          showLabels={showLabels}
          onBarTransitionEnd={onAnimationEnd}
        />
      </div>
    </div>
  )
}

/**
 * Single-GN age dependency panel — child / elderly bars grow from zero
 * when the selected GN changes (map click).
 */
export default function AgeDependencyBeams({ data, selectedGnName }) {
  const { animationDuration, showLabels, onAnimationEnd } = useChartAnimation(
    selectedGnName ?? 'none',
  )

  const area = studyAreaTotals(data)
  const areaDep = dependencyRatios(area)
  const selected = selectedGnName
    ? data.divisions.find((d) => d.name === selectedGnName)
    : null
  const selectedDep = selected ? dependencyRatios(selected) : null

  const maxRatio = Math.max(
    ...data.divisions.flatMap((d) => {
      const r = dependencyRatios(d)
      return [r.child, r.elderly]
    }),
    areaDep.child,
    areaDep.elderly,
    0.01,
  )

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="flex h-full min-h-[16rem] flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-semibold text-surface-100">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: CHILD_COLOR }} />
          Child dependency (0–14 / 15–59)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: ELDERLY_COLOR }} />
          Elderly dependency (60+ / 15–59)
        </span>
        <span className="flex items-center gap-2 text-surface-50">
          <span className="relative inline-flex h-4 w-3 items-center justify-center">
            <span className="absolute h-4 w-0 border-l-2 border-dashed border-white" />
            <span className="absolute top-0 h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          Dashed = study-area average
        </span>
      </div>

      {!selected || !selectedDep ? (
        <div className="flex flex-1 flex-col justify-center gap-4 rounded-lg border border-dashed border-surface-600 bg-surface-900/40 px-4 py-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-primary-300">
              <MousePointerClick className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-surface-100">
                Select a GN on the map to view dependency balance
              </p>
              <p className="mt-1 text-xs text-surface-400">
                Child and elderly dependency for that division will appear here.
              </p>
            </div>
          </div>
          <div className="rounded-md border border-surface-700/80 bg-surface-800/60 px-3 py-2.5 opacity-70">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
              Study-area reference
            </p>
            <div className="flex flex-col gap-2">
              <StaticRatioTrack
                label="Child"
                value={areaDep.child}
                maxRatio={maxRatio}
                color={CHILD_COLOR}
              />
              <StaticRatioTrack
                label="Elderly"
                value={areaDep.elderly}
                maxRatio={maxRatio}
                color={ELDERLY_COLOR}
              />
            </div>
          </div>
        </div>
      ) : (
        <SelectedDependencyCard
          key={selectedGnName}
          name={selected.name}
          swatch={GN_COLORS[selected.name] ?? '#94a3b8'}
          child={selectedDep.child}
          elderly={selectedDep.elderly}
          areaDep={areaDep}
          maxRatio={maxRatio}
          animationDuration={animationDuration}
          showLabels={showLabels}
          onAnimationEnd={onAnimationEnd}
          animate={!reduceMotion}
        />
      )}
    </div>
  )
}
