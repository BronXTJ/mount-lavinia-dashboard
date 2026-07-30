import { useEffect, useMemo, useState } from 'react'
import { MousePointerClick } from 'lucide-react'
import TopRoadsPanel from './TopRoadsPanel.jsx'
import RoadRankingsScopeSelect from './RoadRankingsScopeSelect.jsx'
import MetricInfoButton from './focusArea/MetricInfoButton.jsx'
import { LAND_USE_COLORS } from '../constants/mapLayers.js'
import { buildRoadRankings, extractMountLaviniaGeometry } from '../utils/roadRankings.js'

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v.008a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm-.75 3.75a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const ROAD_PROPERTY_INFO = {
  title: 'Road Property Analysis',
  ariaLabel: 'What does Road Property Analysis show?',
  points: [
    'Lists selected main roads in the Primary Study Area with property and land-use shares.',
    'Selecting a road highlights it on the map and updates residential, commercial, and bare-land percentages.',
    'Total properties counts parcels linked to that road in the property registry.',
    'Road Rankings combine both sides of each road and show top shares by land use.',
  ],
}

const ROAD_RANKINGS_INFO = {
  title: 'Road Rankings',
  ariaLabel: 'What do Road Rankings show?',
  points: [
    'Each tab ranks roads independently by residential, commercial, or vacant (bare land) share — up to 10 when data allows.',
    'Both carriageway sides are combined when both exist; All GN Divisions also includes one-sided roads.',
    'Mount Lavinia uses the GN boundary plus one-sided in-GN roads; scroll the list to see the full ranking.',
    'Commercial and vacant tabs omit roads with 0% on that share.',
    'Clickable rows select that road in the list above and highlight it on the map.',
  ],
}

/**
 * Interactive road property analysis: scrollable road list (selecting a
 * road also drives the map highlight via onSelectRoad), an info card for
 * whichever road is selected, and — below that — the full-width ranked
 * road rankings panel (up to 10 per tab).
 */
export default function RoadPropertyPanel({ data, selectedRoadName, onSelectRoad }) {
  const [rankingsScope, setRankingsScope] = useState('all')
  const [mlGeometry, setMlGeometry] = useState(null)
  const selectedRoad = data.roads.find((r) => r.name === selectedRoadName) ?? null

  useEffect(() => {
    let cancelled = false
    const url = `${import.meta.env.BASE_URL}data/geo/gn5_combined_area.geojson`
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load GN boundaries (${res.status})`)
        return res.json()
      })
      .then((collection) => {
        if (!cancelled) setMlGeometry(extractMountLaviniaGeometry(collection))
      })
      .catch(() => {
        if (!cancelled) setMlGeometry(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const top5 = useMemo(
    () => buildRoadRankings(data.roads, { scope: rankingsScope, mlGeometry }),
    [data.roads, rankingsScope, mlGeometry],
  )

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-5 shadow-card">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold text-surface-50">
          Road Property Analysis — Selected Main Roads
        </h2>
        <MetricInfoButton
          title={ROAD_PROPERTY_INFO.title}
          points={ROAD_PROPERTY_INFO.points}
          ariaLabel={ROAD_PROPERTY_INFO.ariaLabel}
        />
      </div>
      <p className="mt-0.5 text-xs text-surface-200">
        {data.roadsProcessed} selected main roads from the study area
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-md border border-primary-500/30 bg-primary-500/10 px-3 py-2 text-xs text-surface-100">
        <span className="mt-0.5 text-primary-400">
          <InfoIcon />
        </span>
        <p>
          <span className="font-semibold text-primary-300">How to use — </span>
          Select a road from the list below. It will be highlighted on the map, and property statistics and land-use
          information will update automatically.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="max-h-72 overflow-y-auto rounded-md border border-surface-700">
          {data.roads.map((road) => {
            const active = road.name === selectedRoadName
            return (
              <button
                key={road.slug}
                type="button"
                onClick={() => onSelectRoad(road.name)}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 border-b border-l-4 border-surface-700 px-3 py-2 text-left text-sm transition-all duration-150 last:border-b-0 ${
                  active
                    ? 'border-l-primary-400 bg-primary-500/15 font-semibold text-primary-300'
                    : 'border-l-transparent text-surface-100 hover:border-l-primary-400/50 hover:bg-white/5 hover:pl-4'
                }`}
              >
                <span className="truncate">{road.name}</span>
                {active && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {selectedRoad ? (
          <div className="rounded-md border border-surface-700 bg-surface-900/50 p-4">
            <p className="font-display text-sm font-semibold text-surface-50">{selectedRoad.name}</p>
            <p className="mt-0.5 text-[10px] text-surface-200">
              {selectedRoad.isEstimate
                ? 'Study-wide average applied (no per-road detail on file)'
                : 'Per-road data from the property registry'}
            </p>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-surface-200">Residential %</dt>
                <dd className="font-semibold" style={{ color: LAND_USE_COLORS.Residential }}>
                  {selectedRoad.residential}%
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-surface-200">Commercial %</dt>
                <dd className="font-semibold" style={{ color: LAND_USE_COLORS.Commercial }}>
                  {selectedRoad.commercial}%
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-surface-200">Bare Land %</dt>
                <dd className="font-semibold" style={{ color: LAND_USE_COLORS['Barren Land'] }}>
                  {selectedRoad.bareLand}%
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-surface-700 pt-2">
                <dt className="text-surface-200">Total Properties</dt>
                <dd className="font-semibold text-surface-50">
                  {selectedRoad.total}
                  {selectedRoad.isEstimate && <span className="ml-1 text-[10px] font-normal text-surface-200">(avg.)</span>}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="relative flex min-h-[160px] flex-col items-center justify-center gap-2 overflow-hidden rounded-md border-2 border-primary-400/50 bg-primary-500/10 px-4 py-6 text-center">
            <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary-400/30 animate-pulse" />
            <span className="relative flex h-10 w-10 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400/35" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-primary-300">
                <MousePointerClick className="h-5 w-5" aria-hidden />
              </span>
            </span>
            <p className="relative font-display text-sm font-semibold text-primary-300">
              Select a road to view property statistics
            </p>
            <p className="relative text-xs text-surface-200">
              Choose a road from the list on the left
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-surface-700/80 bg-surface-900/40">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-700/80 px-3 py-2">
          <p className="font-display text-sm font-semibold text-surface-50">Road Rankings</p>
          <MetricInfoButton
            title={ROAD_RANKINGS_INFO.title}
            points={ROAD_RANKINGS_INFO.points}
            ariaLabel={ROAD_RANKINGS_INFO.ariaLabel}
          />
          <div className="ml-auto w-full min-w-[10rem] sm:w-auto sm:min-w-[11rem]">
            <RoadRankingsScopeSelect value={rankingsScope} onChange={setRankingsScope} />
          </div>
        </div>
        <div className="p-3">
          <TopRoadsPanel
            top5={top5}
            selectedRoadName={selectedRoadName}
            onSelectRoad={onSelectRoad}
          />
        </div>
      </div>
    </div>
  )
}
