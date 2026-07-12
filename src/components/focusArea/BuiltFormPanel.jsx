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
              'Ratio of total floor area to plot area.',
              'Higher FSI = more vertical development intensity.',
            ]}
            ariaLabel="What is Floor Space Index?"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DensityStatCard label="Min FSI" value={formatDensityValue(fsi?.min)} topBorderColor="#fb7185" />
          <DensityStatCard label="Max FSI" value={formatDensityValue(fsi?.max)} topBorderColor="#fb7185" />
          <DensityStatCard
            label="Average FSI"
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
            'Histogram of hex cells by Floor Space Index (FSI) bucket.',
            'Taller bars mean more cells fall in that FSI range.',
            'Use this to see how building intensity is distributed across the study area.',
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
              'Ratio of building footprint to plot area.',
              'Higher GSI = more ground covered.',
            ]}
            ariaLabel="What is Ground Space Index?"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DensityStatCard label="Min GSI" value={formatDensityValue(gsi?.min)} topBorderColor="#a3e635" />
          <DensityStatCard label="Max GSI" value={formatDensityValue(gsi?.max)} topBorderColor="#a3e635" />
          <DensityStatCard
            label="Average GSI"
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
            'Histogram of hex cells by Ground Space Index (GSI) bucket.',
            'Taller bars mean more cells fall in that GSI range.',
            'Use this to see how ground coverage is distributed across the study area.',
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
