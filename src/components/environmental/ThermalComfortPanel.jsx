import DensityStatCard from '../focusArea/DensityStatCard.jsx'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import { formatEnvValue } from '../../utils/environmentalStats.js'
import { ENV_INFO } from './environmentalInfoContent.js'
import { SHADOW_COLOR } from '../../constants/environmental.js'
import StressClassDonut from './StressClassDonut.jsx'
import ShadowExposureGauge from './ShadowExposureGauge.jsx'
import UtciComfortGauge from './UtciComfortGauge.jsx'

function ShadowExposureBreakdown({ breakdown }) {
  const segments = breakdown?.segments ?? []
  const hasData = breakdown?.total > 0

  if (!hasData) {
    return <p className="text-center text-xs text-surface-400">No shadow cells loaded</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 rounded-md border border-surface-700/80 bg-surface-900/40 px-3 py-2">
          <span className="text-xs font-medium text-surface-200">
            Highly Shaded Cells (&gt;75%)
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-surface-50">
            {breakdown.shadedPct}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-surface-700/80 bg-surface-900/40 px-3 py-2">
          <span className="text-xs font-medium text-surface-200">
            Highly Sunlit Cells (&lt;25%)
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-surface-50">
            {breakdown.sunlitPct}%
          </span>
        </div>
      </div>

      <div
        className="flex h-8 w-full overflow-hidden rounded-md border border-surface-700"
        role="img"
        aria-label="Shadow exposure cell share bar"
      >
        {segments.map((s) => (
          <div
            key={s.id}
            className="relative flex h-full items-center justify-center"
            style={{
              width: `${Math.max(s.pct, 0)}%`,
              backgroundColor: s.color,
              minWidth: s.pct > 0 ? 4 : 0,
            }}
            title={`${s.label}: ${s.pct}%`}
          >
            {s.pct >= 12 && (
              <span
                className={`text-[10px] font-bold tabular-nums drop-shadow ${
                  s.id === 'sunlit' ? 'text-surface-800' : 'text-white'
                }`}
              >
                {s.pct}%
              </span>
            )}
          </div>
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5 text-[11px] text-surface-300">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Left panel — thermal comfort KPIs + gauge + stress donut (no histograms). */
export default function ThermalComfortPanel({ stats, loading, onFocusCell }) {
  const utci = stats?.utci
  const shadow = stats?.shadow

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <h2 className="border-l-4 border-[#f46d43] pl-3 font-display text-lg font-semibold text-surface-50">
          Thermal Comfort (modelled)
        </h2>
        <MetricInfoButton
          title="Thermal Comfort (modelled)"
          points={[
            'How outdoor heat stress feels across the Mount Lavinia study grid — mainly UTCI and shadow patterns.',
            'This panel shows modelled spatial patterns for planning, not live weather from a phone app.',
            'Live temperature on the Overview tab comes from Open-Meteo for a clicked map point — use that for “what is it like right now”.',
          ]}
          ariaLabel="What does Thermal Comfort (modelled) show?"
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading thermal data…</p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">UTCI (°C)</h3>
          <MetricInfoButton
            title={ENV_INFO.utci.title}
            points={ENV_INFO.utci.points}
            ariaLabel={ENV_INFO.utci.ariaLabel}
          />
        </div>
      </div>

      <UtciComfortGauge utci={utci} />

      <div className="grid grid-cols-2 gap-3">
        <DensityStatCard
          label="Coolest spot"
          value={utci?.min != null ? `${formatEnvValue(utci.min, 1)} °C` : '—'}
          topBorderColor="#4575b4"
          hint={utci?.lowestId != null ? 'Click to locate on map' : undefined}
          interactive={utci?.lowestId != null}
          onClick={() => onFocusCell?.('utci', utci.lowestId)}
        />
        <DensityStatCard
          label="Hottest spot"
          value={utci?.max != null ? `${formatEnvValue(utci.max, 1)} °C` : '—'}
          topBorderColor="#a50026"
          hint={utci?.highestId != null ? 'Click to locate on map' : undefined}
          interactive={utci?.highestId != null}
          onClick={() => onFocusCell?.('utci', utci.highestId)}
        />
      </div>

      <StressClassDonut breakdown={stats?.utciClassBreakdown} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3
            className="border-l-4 pl-3 font-display text-sm font-semibold text-surface-100"
            style={{ borderColor: SHADOW_COLOR }}
          >
            Shadow Exposure
          </h3>
          <MetricInfoButton
            title={ENV_INFO.shadow.title}
            points={ENV_INFO.shadow.points}
            ariaLabel={ENV_INFO.shadow.ariaLabel}
          />
        </div>
        <ShadowExposureBreakdown breakdown={stats?.shadowExposureBreakdown} />
      </div>

      <ShadowExposureGauge shadow={shadow} shadowMeta={stats?.shadowMeta} />

      {stats?.cellCount > 0 && (
        <p className="text-[11px] text-surface-400">
          {stats.cellCount.toLocaleString()} cells · 10 m grid · 800 m analysis extent
        </p>
      )}
    </div>
  )
}
