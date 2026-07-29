import { useEffect, useState } from 'react'
import { Home, Store, LandPlot } from 'lucide-react'
import { LAND_USE_COLORS } from '../constants/mapLayers.js'

const BAR_DURATION_MS = 500

const TABS = [
  {
    id: 'residential',
    label: 'Residential',
    Icon: Home,
    barColor: LAND_USE_COLORS.Residential,
    chipColor: 'text-[#fa9f00] bg-[#fa9f00]/25 ring-1 ring-[#fa9f00]/55',
  },
  {
    id: 'commercial',
    label: 'Commercial',
    Icon: Store,
    barColor: LAND_USE_COLORS.Commercial,
    chipColor: 'text-[#ec4899] bg-[#ec4899]/20 ring-1 ring-[#ec4899]/40',
  },
  {
    id: 'vacant',
    label: 'Vacant',
    Icon: LandPlot,
    barColor: LAND_USE_COLORS['Barren Land'],
    chipColor: 'text-[#e2e8f0] bg-[#cbd5e1]/20 ring-1 ring-[#94a3b8]/50',
  },
]

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Ranked Top-5 lists (Residential / Commercial / Vacant) from both-side
 * merged road rankings. Entries with `inRoadList` are clickable and call
 * `onSelectRoad` with `selectName` (registry row) so the list/map stay in sync.
 */
export default function TopRoadsPanel({ top5, selectedRoadName, onSelectRoad }) {
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const [barProgress, setBarProgress] = useState(1)
  const tab = TABS.find((t) => t.id === activeTab)
  const entries = top5?.[activeTab] ?? []

  useEffect(() => {
    if (prefersReducedMotion()) {
      setBarProgress(1)
      return undefined
    }
    setBarProgress(0)
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setBarProgress(1))
    })
    return () => window.cancelAnimationFrame(id)
  }, [activeTab, top5])

  return (
    <div>
      <div className="flex gap-1.5 rounded-lg bg-surface-900/70 p-1">
        {TABS.map((t) => {
          const Icon = t.Icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                isActive ? t.chipColor : 'text-surface-300 hover:bg-white/5 hover:text-surface-100'
              }`}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: t.barColor }}
                aria-hidden
              />
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              {t.label}
            </button>
          )
        })}
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-xs text-surface-300">
          No both-side (or whole-road) records in this scope yet.
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {entries.map((entry) => {
          const selectName = entry.selectName ?? entry.name
          const selectNames = entry.selectNames ?? [selectName]
          const active = entry.inRoadList && selectNames.includes(selectedRoadName)
          const Wrapper = entry.inRoadList ? 'button' : 'div'
          const targetPct = Math.min(entry.percentage, 100)

          return (
            <li key={`${activeTab}-${entry.rank}-${entry.name}`}>
              <Wrapper
                type={entry.inRoadList ? 'button' : undefined}
                onClick={entry.inRoadList ? () => onSelectRoad(selectName) : undefined}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                  entry.inRoadList
                    ? 'cursor-pointer hover:bg-white/[0.07]'
                    : 'cursor-default opacity-70'
                } ${
                  active
                    ? 'bg-primary-500/15 ring-1 ring-primary-400/40'
                    : 'ring-1 ring-transparent'
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-700 text-[11px] font-bold text-surface-100">
                  {entry.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-xs ${
                      active ? 'font-semibold text-primary-300' : 'font-medium text-surface-100'
                    }`}
                  >
                    {entry.name}
                  </span>
                  <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-surface-700/90">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${targetPct * barProgress}%`,
                        background: `linear-gradient(90deg, ${tab.barColor}99, ${tab.barColor})`,
                        transition: `width ${BAR_DURATION_MS}ms ease-out`,
                      }}
                    />
                  </span>
                </span>
                <span
                  className="shrink-0 font-mono text-xs font-semibold tabular-nums"
                  style={{ color: tab.barColor }}
                >
                  {entry.percentage}%
                </span>
              </Wrapper>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
