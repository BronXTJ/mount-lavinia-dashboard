import { formatDensityValue } from '../../utils/densityStats.js'
import DensityStatCard from './DensityStatCard.jsx'
import FsiGsiScatter from './FsiGsiScatter.jsx'
import MetricHistogram from './MetricHistogram.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'

/** Left panel — Built Form Intensity (FSI / GSI + scatter). */
export default function BuiltFormPanel({ stats, loading, onFocusCell }) {
  const fsi = stats?.fsi
  const gsi = stats?.gsi

  return (
    <div className="flex flex-col gap-4">
      <h2 className="border-l-4 border-[#fb7185] pl-3 font-display text-lg font-semibold text-surface-50">
        Built Form Intensity
      </h2>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading density data…</p>
      )}

      {/* FSI subsection */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">
            Floor Space Index (FSI)
          </h3>
          <MetricInfoButton
            title="Floor Space Index (FSI)"
            points={[
              'FSI compares total floor area in buildings to plot size — like how much building is stacked on the land.',
              'These cards show the lowest, highest, and average FSI across neighbourhood cells we can measure reliably.',
              'Higher FSI = more floor space relative to plot size (often taller or denser). Lower FSI = lighter built intensity.',
              'Click Minimum / Highest Cell ID to fly to that cell on the map. Charts use mostly complete cells (≥90% filled).',
            ]}
            ariaLabel="What is Floor Space Index?"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DensityStatCard label="Min" value={formatDensityValue(fsi?.min)} topBorderColor="#fb7185" />
          <DensityStatCard label="Max" value={formatDensityValue(fsi?.max)} topBorderColor="#fb7185" />
          <DensityStatCard
            label="Average"
            value={formatDensityValue(fsi?.avg)}
            topBorderColor="#fb7185"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Minimum Cell ID"
            value={fsi?.lowestId != null ? String(fsi.lowestId) : '—'}
            topBorderColor="#fb7185"
            interactive={fsi?.lowestId != null}
            onClick={() => onFocusCell?.('fsi', fsi.lowestId)}
          />
          <DensityStatCard
            label="Highest Cell ID"
            value={fsi?.highestId != null ? String(fsi.highestId) : '—'}
            topBorderColor="#fb7185"
            interactive={fsi?.highestId != null}
            onClick={() => onFocusCell?.('fsi', fsi.highestId)}
          />
        </div>
        <MetricHistogram
          title="FSI Value Distribution"
          data={stats?.fsiHistogram}
          barColor="#fb7185"
          infoTitle="FSI Value Distribution"
          infoAria="What does the FSI Value Distribution show?"
          infoPoints={[
            'This chart groups neighbourhood cells into equal FSI bands — the same colour ranges as the map legend.',
            'Taller bars mean more cells fall in that FSI range (not that those cells are “better”).',
            'High-FSI bands are more intensely built; low-FSI bands have less floor space. Thin edge scraps on the map are left out of the chart.',
          ]}
        />
      </div>

      {/* GSI subsection */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-sm font-semibold text-surface-100">
            Ground Space Index (GSI)
          </h3>
          <MetricInfoButton
            title="Ground Space Index (GSI)"
            points={[
              'GSI is the share of ground covered by building footprints — how much of the plot is built over at ground level.',
              'These cards show the lowest, highest, and average GSI across neighbourhood cells we can measure reliably.',
              'Higher GSI = more of the ground is covered by buildings. Lower GSI = more open ground between buildings.',
              'Click Minimum / Highest Cell ID to fly to that cell on the map. Charts use mostly complete cells (≥90% filled).',
            ]}
            ariaLabel="What is Ground Space Index?"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DensityStatCard label="Min" value={formatDensityValue(gsi?.min)} topBorderColor="#a3e635" />
          <DensityStatCard label="Max" value={formatDensityValue(gsi?.max)} topBorderColor="#a3e635" />
          <DensityStatCard
            label="Average"
            value={formatDensityValue(gsi?.avg)}
            topBorderColor="#a3e635"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DensityStatCard
            label="Minimum Cell ID"
            value={gsi?.lowestId != null ? String(gsi.lowestId) : '—'}
            topBorderColor="#a3e635"
            interactive={gsi?.lowestId != null}
            onClick={() => onFocusCell?.('gsi', gsi.lowestId)}
          />
          <DensityStatCard
            label="Highest Cell ID"
            value={gsi?.highestId != null ? String(gsi.highestId) : '—'}
            topBorderColor="#a3e635"
            interactive={gsi?.highestId != null}
            onClick={() => onFocusCell?.('gsi', gsi.highestId)}
          />
        </div>
        <MetricHistogram
          title="GSI Value Distribution"
          data={stats?.gsiHistogram}
          barColor="#a3e635"
          infoTitle="GSI Value Distribution"
          infoAria="What does the GSI Value Distribution show?"
          infoPoints={[
            'This chart groups neighbourhood cells into equal GSI bands — the same colour ranges as the map legend.',
            'Taller bars mean more cells fall in that GSI range (not that those cells are “better”).',
            'High-GSI bands have more ground covered by buildings; low-GSI bands leave more open ground. Thin edge scraps on the map are left out of the chart.',
          ]}
        />
      </div>

      <FsiGsiScatter
        data={stats?.scatter}
        medianFsi={stats?.medianFsi}
        medianGsi={stats?.medianGsi}
      />
    </div>
  )
}
