import DensityStatCard from '../focusArea/DensityStatCard.jsx'
import FocusAreaPanelCard from '../focusArea/FocusAreaPanelCard.jsx'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import { LC_GN_NAMES, LC_HEADLINE_KPIS } from '../../constants/landCover.js'
import { LC_INFO } from './landCoverInfoContent.js'
import ClassAreaTrendChart from './ClassAreaTrendChart.jsx'

/** Left panel — intro, headline KPIs, class trend, GN selector. */
export default function LandCoverOverviewPanel({ selectedGn, onSelectGn }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-bold text-surface-50">Land Cover Change</h1>
            <p className="mt-1 text-xs leading-relaxed text-surface-400">
              Five GN study area · Landsat 30 m (~2000 / ~2015 / ~2025) · Sentinel-2 10 m GN
              metrics (2018–2025) · neighbourhood-scale only
            </p>
          </div>
          <MetricInfoButton title={LC_INFO.section.title} points={LC_INFO.section.points} />
        </div>
      </div>

      <FocusAreaPanelCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-surface-100">
            Landsat headline change (2000→2025)
          </h2>
          <MetricInfoButton title={LC_INFO.kpis.title} points={LC_INFO.kpis.points} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-1">
          {LC_HEADLINE_KPIS.map((kpi) => (
            <DensityStatCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              hint={kpi.hint}
              topBorderColor={kpi.color}
            />
          ))}
        </div>
      </FocusAreaPanelCard>

      <FocusAreaPanelCard>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-surface-100">
            Landsat class area trend (~2000 / ~2015 / ~2025)
          </h2>
          <MetricInfoButton title={LC_INFO.classTrend.title} points={LC_INFO.classTrend.points} />
        </div>
        <ClassAreaTrendChart />
      </FocusAreaPanelCard>

      <FocusAreaPanelCard>
        <h2 className="mb-2 text-sm font-semibold text-surface-100">GN divisions</h2>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onSelectGn(null)}
            className="rounded-md border px-3 py-2 text-left text-sm transition-colors"
            style={{
              borderColor: selectedGn == null ? '#00b4d8' : 'rgba(71,85,105,0.8)',
              backgroundColor: selectedGn == null ? 'rgba(0,180,216,0.12)' : 'transparent',
              color: selectedGn == null ? '#e0f2fe' : '#cbd5e1',
            }}
          >
            All 5 GN
          </button>
          {LC_GN_NAMES.map((name) => {
            const active = selectedGn === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelectGn(name)}
                className="rounded-md border px-3 py-2 text-left text-sm transition-colors"
                style={{
                  borderColor: active ? '#00b4d8' : 'rgba(71,85,105,0.8)',
                  backgroundColor: active ? 'rgba(0,180,216,0.12)' : 'transparent',
                  color: active ? '#e0f2fe' : '#cbd5e1',
                }}
              >
                {name}
              </button>
            )
          })}
        </div>
      </FocusAreaPanelCard>
    </div>
  )
}
