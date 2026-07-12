import { useState } from 'react'
import { JUNCTION_COLORS } from './data/colors'
import { junctions } from './data/junctions'
import BehaviourFilterBar from './components/BehaviourFilterBar'
import JunctionCardList from './components/JunctionCardList'
import VolumeComparisonChart from './components/VolumeComparisonChart'
import PedestrianOverviewChart from './components/PedestrianOverviewChart'
import JunctionMap from './components/JunctionMap'
import DirectionFlowChart from './components/DirectionFlowChart'
import VehicleTypeBreakdown from './components/VehicleTypeBreakdown'
import TimePeriodTrend from './components/TimePeriodTrend'
import PedVehicleRatio from './components/PedVehicleRatio'

export default function BehaviourAnalysisPage() {
  const [dayFilter, setDayFilter] = useState('weekday')
  const [periodFilter, setPeriodFilter] = useState('morning')
  const [selectedJunctionId, setSelectedJunctionId] = useState(2)

  const selected = junctions.find((j) => j.id === selectedJunctionId) ?? junctions[1]
  const accent = JUNCTION_COLORS[selected.id]

  return (
    <section className="flex h-screen flex-col bg-surface-900 text-surface-50">
      <div className="shrink-0 border-b border-surface-700 px-4 py-3 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-surface-50">
          Movement & Behaviour Analysis
        </h1>
        <p className="mt-0.5 text-sm text-surface-200">
          Junction movement behaviour along the Galle Road corridor — Primary Study Area
        </p>
      </div>

      <BehaviourFilterBar
        dayFilter={dayFilter}
        periodFilter={periodFilter}
        onDayChange={setDayFilter}
        onPeriodChange={setPeriodFilter}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[28%_32%_40%]">
        {/* Left panel */}
        <aside className="min-h-0 space-y-3 overflow-y-auto lg:pr-1">
          <JunctionCardList
            selectedJunctionId={selectedJunctionId}
            onSelect={setSelectedJunctionId}
          />
          <VolumeComparisonChart dayFilter={dayFilter} periodFilter={periodFilter} />
          <PedestrianOverviewChart dayFilter={dayFilter} />
        </aside>

        {/* Center map */}
        <div className="min-h-[360px] lg:min-h-0">
          <JunctionMap
            dayFilter={dayFilter}
            periodFilter={periodFilter}
            selectedJunctionId={selectedJunctionId}
            onSelect={setSelectedJunctionId}
          />
        </div>

        {/* Right detail */}
        <aside className="min-h-0 space-y-3 overflow-y-auto lg:pl-1">
          <h2
            className="border-l-4 pl-3 font-display text-lg font-semibold text-surface-50"
            style={{ borderColor: accent }}
          >
            {selected.name}
          </h2>
          <DirectionFlowChart
            junctionId={selectedJunctionId}
            dayFilter={dayFilter}
            periodFilter={periodFilter}
          />
          <VehicleTypeBreakdown
            junctionId={selectedJunctionId}
            dayFilter={dayFilter}
            periodFilter={periodFilter}
          />
          <TimePeriodTrend junctionId={selectedJunctionId} />
          <PedVehicleRatio
            junctionId={selectedJunctionId}
            dayFilter={dayFilter}
            periodFilter={periodFilter}
          />
        </aside>
      </div>
    </section>
  )
}
