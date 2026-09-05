import { buildKeyFindings, formatDensityValue } from '../../utils/densityStats.js'
import DensityStatCard from './DensityStatCard.jsx'
import KeyFindingsBridge from './KeyFindingsBridge.jsx'
import MetricHistogram from './MetricHistogram.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'
import TypologyStackedBar from './TypologyStackedBar.jsx'

const DENSITY_FINDINGS_FALLBACK = [
  'Built form is split: dense congested cells sit alongside large open-underdeveloped patches.',
  'Open-space ratio is limited relative to built coverage across many hex cells.',
  'Typology and OSR patterns on the density hex map show how form and openness vary together.',
]

const DENSITY_FINDING_CHIPS = [
  { id: 'F6', label: 'F6 Split built form', to: '/synthesis?f=F6' },
  { id: 'F7', label: 'F7 Open space', to: '/synthesis?f=F7' },
]

/** Right panel — Openness & Density Patterns. */
export default function OpennessPanel({ stats, loading, onFocusCell }) {
  const osr = stats?.osr
  const density = stats?.density
  const densityFindings =
    stats?.findings?.length > 0
      ? stats.findings.slice(0, 3)
      : stats?.typology?.length
        ? buildKeyFindings(stats.typology, stats.medianOsr).slice(0, 3)
        : DENSITY_FINDINGS_FALLBACK

  return (
    <div className="flex flex-col gap-4">
      <h2 className="border-l-4 border-[#e879f9] pl-3 font-display text-lg font-semibold text-surface-50">
        Openness & Density Patterns
      </h2>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading density data…</p>
      )}

      {/* OSR subsection */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">
            Open Space Ratio (OSR)
          </h3>
          <MetricInfoButton
            title="Open Space Ratio (OSR)"
            points={[
              'OSR compares open ground to floor area — a simple “how much breathing room is there relative to how much is built?” measure.',
              'These cards show the lowest, highest, and average OSR across neighbourhood cells we can measure reliably.',
              'Higher OSR = more open, less congested feel. Lower OSR = buildings dominate relative to open space.',
              'Click Minimum / Highest Cell ID to fly to that cell on the map. Charts use mostly complete cells (≥90% filled).',
            ]}
            ariaLabel="What is Open Space Ratio?"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DensityStatCard label="Min" value={formatDensityValue(osr?.min)} topBorderColor="#e879f9" />
          <DensityStatCard label="Max" value={formatDensityValue(osr?.max)} topBorderColor="#e879f9" />
          <DensityStatCard
            label="Average"
            value={formatDensityValue(osr?.avg)}
            topBorderColor="#e879f9"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Minimum Cell ID"
            value={osr?.lowestId != null ? String(osr.lowestId) : '—'}
            topBorderColor="#e879f9"
            interactive={osr?.lowestId != null}
            onClick={() => onFocusCell?.('osr', osr.lowestId)}
          />
          <DensityStatCard
            label="Highest Cell ID"
            value={osr?.highestId != null ? String(osr.highestId) : '—'}
            topBorderColor="#e879f9"
            interactive={osr?.highestId != null}
            onClick={() => onFocusCell?.('osr', osr.highestId)}
          />
        </div>
      </div>

      <MetricHistogram
        title="OSR Value Distribution"
        data={stats?.osrHistogram}
        barColor="#e879f9"
        infoTitle="OSR Value Distribution"
        infoAria="What does the OSR Value Distribution show?"
        infoPoints={[
          'This chart groups neighbourhood cells into equal OSR bands — the same colour ranges as the map legend.',
          'Taller bars mean more cells fall in that OSR range (not that those cells are “better”).',
          'High-OSR bands feel more open relative to floor space; low-OSR bands feel more congested. Thin edge scraps on the map are left out of the chart.',
        ]}
      />

      {/* Density Value subsection */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">Density Value</h3>
          <MetricInfoButton
            title="Density Value"
            points={[
              'Density Value summarises how intensely built each neighbourhood cell is — a volume-style reading of built form in that hex.',
              'These cards show the lowest, highest, and average across cells we can measure reliably in the primary study area.',
              'Higher Density Value = denser development in that cell. Lower = lighter built intensity.',
              'Click Minimum / Highest Cell ID to fly to that cell on the map.',
            ]}
            ariaLabel="What is Density Value?"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DensityStatCard
            label="Min"
            value={formatDensityValue(density?.min)}
            topBorderColor="#78716c"
          />
          <DensityStatCard
            label="Max"
            value={formatDensityValue(density?.max)}
            topBorderColor="#78716c"
          />
          <DensityStatCard
            label="Average"
            value={formatDensityValue(density?.avg)}
            topBorderColor="#78716c"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Minimum Cell ID"
            value={density?.lowestId != null ? String(density.lowestId) : '—'}
            topBorderColor="#78716c"
            interactive={density?.lowestId != null}
            onClick={() => onFocusCell?.('density', density.lowestId)}
          />
          <DensityStatCard
            label="Highest Cell ID"
            value={density?.highestId != null ? String(density.highestId) : '—'}
            topBorderColor="#78716c"
            interactive={density?.highestId != null}
            onClick={() => onFocusCell?.('density', density.highestId)}
          />
        </div>
        <MetricHistogram
          title="Density Value Distribution"
          data={stats?.densityHistogram}
          barColor="#78716c"
          infoTitle="Density Value Distribution"
          infoAria="What does the Density Value Distribution show?"
          infoPoints={[
            'This chart groups neighbourhood cells into equal Density Value bands — the same colour ranges as the map legend.',
            'Taller bars mean more cells fall in that density range (not that those cells are “better”).',
            'High bands are more intensely built; low bands are lighter. Thin edge scraps on the map are left out of the chart.',
          ]}
        />
      </div>

      <TypologyStackedBar zones={stats?.typology} />

      <KeyFindingsBridge
        bullets={densityFindings}
        synthesisTo="/synthesis?f=F6"
        chips={DENSITY_FINDING_CHIPS}
      />
    </div>
  )
}
