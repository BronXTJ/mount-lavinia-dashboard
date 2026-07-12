import { Car, PersonStanding } from 'lucide-react'
import MetricInfoButton from '../../../components/focusArea/MetricInfoButton.jsx'
import { PEDESTRIAN_COLOR, VEHICLE_RATIO_COLOR } from '../data/colors'
import { pedVehicleLabel, sumPedestrians, sumVehicles } from '../utils/aggregations'

export default function PedVehicleRatio({ junctionId, dayFilter, periodFilter }) {
  const vehicles = sumVehicles(junctionId, dayFilter, periodFilter)
  const pedestrians = sumPedestrians(junctionId, dayFilter, periodFilter)
  const total = vehicles + pedestrians
  const vehPct = total > 0 ? (vehicles / total) * 100 : 0
  const pedPct = total > 0 ? (pedestrians / total) * 100 : 0
  const label = pedVehicleLabel(vehicles, pedestrians)

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-3 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-display text-base font-semibold text-surface-50">
          Pedestrian vs Vehicle Ratio
        </h3>
        <MetricInfoButton
          title="Pedestrian vs Vehicle Ratio"
          ariaLabel="What does Pedestrian vs Vehicle Ratio show?"
          points={[
            'Compares vehicle and pedestrian counts at the selected junction for the active filters.',
            'The bar shows each group as a share of the combined total.',
            'The classification label summarises whether the junction is vehicle-dominated, mixed, or pedestrian-active.',
            'Use this with the direction and type charts for a fuller movement picture.',
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-surface-700/60 bg-surface-900/40 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-surface-300">Vehicles</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-500/10 text-primary-400">
              <Car className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-surface-50">
            {vehicles.toLocaleString('en-US')}
          </p>
        </div>
        <div className="rounded-md border border-surface-700/60 bg-surface-900/40 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-surface-300">Pedestrians</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-500/10 text-accent-400">
              <PersonStanding className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-surface-50">
            {pedestrians.toLocaleString('en-US')}
          </p>
        </div>
      </div>

      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-md bg-surface-700">
        <div style={{ width: `${vehPct}%`, backgroundColor: VEHICLE_RATIO_COLOR }} />
        <div style={{ width: `${pedPct}%`, backgroundColor: PEDESTRIAN_COLOR }} />
      </div>

      <div className="mt-2 flex justify-between text-xs text-surface-200">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: VEHICLE_RATIO_COLOR }}
          />
          Vehicles {vehPct.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: PEDESTRIAN_COLOR }}
          />
          Pedestrians {pedPct.toFixed(0)}%
        </span>
      </div>

      <p className="mt-3 rounded-md border border-[#dc2626]/40 bg-[#dc2626]/10 px-2.5 py-1.5 text-xs font-semibold text-surface-50">
        {label}
      </p>
    </div>
  )
}
