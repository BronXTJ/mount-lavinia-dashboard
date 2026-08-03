import DensityStatCard from '../focusArea/DensityStatCard.jsx'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import { formatEnvValue } from '../../utils/environmentalStats.js'
import { ENV_INFO } from './environmentalInfoContent.js'
import DriverRadar from './DriverRadar.jsx'
import ShadowHourlyLine from './ShadowHourlyLine.jsx'
import SvfStackedBar from './SvfStackedBar.jsx'
import UtciUhiScatter from './UtciUhiScatter.jsx'

/** Right panel — UHI KPIs + scatter + radar + SVF bar (no histograms / no donut). */
export default function MicroclimatePanel({ stats, loading, onFocusCell }) {
  const uhi = stats?.uhi

  return (
    <div className="flex flex-col gap-4">
      <h2 className="border-l-4 border-[#ef8a62] pl-3 font-display text-lg font-semibold text-surface-50">
        Microclimate Drivers
      </h2>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading microclimate data…</p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">UHI Intensity</h3>
          <MetricInfoButton
            title={ENV_INFO.uhi.title}
            points={ENV_INFO.uhi.points}
            ariaLabel={ENV_INFO.uhi.ariaLabel}
          />
        </div>
        {stats?.rural_bg_T != null && (
          <p className="text-xs text-surface-300">
            Rural background: {formatEnvValue(stats.rural_bg_T, 1)} °C
          </p>
        )}
        <div className="grid grid-cols-3 gap-3">
          <DensityStatCard
            label="Min"
            value={formatEnvValue(uhi?.min)}
            unit={uhi?.min != null ? '°C' : undefined}
            topBorderColor="#2166ac"
          />
          <DensityStatCard
            label="Max"
            value={formatEnvValue(uhi?.max)}
            unit={uhi?.max != null ? '°C' : undefined}
            topBorderColor="#b2182b"
          />
          <DensityStatCard
            label="Mean"
            value={formatEnvValue(uhi?.avg)}
            unit={uhi?.avg != null ? '°C' : undefined}
            topBorderColor="#ef8a62"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Lowest Cell ID"
            value={uhi?.lowestId != null ? String(uhi.lowestId) : '—'}
            topBorderColor="#2166ac"
            interactive={uhi?.lowestId != null}
            onClick={() => onFocusCell?.('uhi', uhi.lowestId)}
          />
          <DensityStatCard
            label="Highest Cell ID"
            value={uhi?.highestId != null ? String(uhi.highestId) : '—'}
            topBorderColor="#b2182b"
            interactive={uhi?.highestId != null}
            onClick={() => onFocusCell?.('uhi', uhi.highestId)}
          />
        </div>
      </div>

      <UtciUhiScatter
        data={stats?.scatterSample}
        meanUtci={stats?.utci?.avg}
        meanUhi={stats?.uhi?.avg}
      />

      <ShadowHourlyLine
        data={stats?.shadowHourlySeries}
        shadowMeta={stats?.shadowMeta}
      />

      <DriverRadar radarMeans={stats?.radarMeans} />

      <SvfStackedBar
        breakdown={stats?.svfBreakdown}
        sampleCount={stats?.svfPointCount}
      />
    </div>
  )
}
