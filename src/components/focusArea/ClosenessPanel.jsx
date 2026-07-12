import { CLOSENESS_BAR_COLOR, PLACEHOLDER_TOP5 } from '../../constants/centrality.js'
import { computeZoneDistribution, formatMetricValue } from '../../utils/centralityStats.js'
import CentralityBarChart from './CentralityBarChart.jsx'
import FocusAreaStatGrid from './FocusAreaStatGrid.jsx'
import KeyFindingsBridge from './KeyFindingsBridge.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'
import ScaleComparisonChart from './ScaleComparisonChart.jsx'
import ZoneStackedBar from './ZoneStackedBar.jsx'

const CLOSENESS_KEY_FINDINGS = [
  'Highest closeness values concentrate on segments that can reach the rest of the network most easily, notably around Mount Lavinia Junction.',
  'Closeness patterns shift across Walking to Regional scales as the analysis distance changes.',
  'High-closeness zones mark the most reachable local streets, not necessarily the strongest through-routes.',
]

const CENTRALITY_FINDING_CHIPS = [
  { id: 'F8', label: 'F8 Network centrality', to: '/synthesis?f=F8' },
]

export default function ClosenessPanel({
  scaleLabel,
  stats,
  loading,
  onSegmentClick,
  allScaleAvgs,
  currentGeoJson,
  scaleMeters,
}) {
  const hasData = stats?.top5?.length > 0
  const chartData = hasData ? stats.top5 : PLACEHOLDER_TOP5
  const zones = computeZoneDistribution(currentGeoJson, 'closeness', scaleMeters)

  const statItems = [
    { label: 'Current Scale', value: scaleLabel, icon: '◎' },
    { label: 'Highest Value', value: formatMetricValue(stats?.max), icon: '▲' },
    { label: 'Lowest Value', value: formatMetricValue(stats?.min), icon: '▼' },
    { label: 'Average Value', value: formatMetricValue(stats?.avg), icon: '◆' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-l-4 border-primary-500 pl-3">
        <h2 className="font-display text-lg font-semibold text-surface-50">Closeness Centrality</h2>
        <MetricInfoButton
          title="Closeness Centrality"
          ariaLabel="What does Closeness Centrality show?"
          points={[
            'Measures how easily each road segment can reach all other locations in the network.',
            'Higher values mean more central, accessible locations within the study area.',
            'Compare scales (500m–5000m) to see how centrality shifts with analysis distance.',
            'Click a top segment bar to locate that road on the map.',
          ]}
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading closeness data…</p>
      )}

      <FocusAreaStatGrid items={statItems} />

      <CentralityBarChart
        key={scaleLabel}
        title="Top 5 Road Segments by Closeness"
        data={chartData}
        barColor={CLOSENESS_BAR_COLOR}
        isPlaceholder={!hasData}
        onBarClick={hasData ? onSegmentClick : undefined}
        infoTitle="Top 5 Road Segments by Closeness"
        infoAria="What does the Top 5 Closeness chart show?"
        infoPoints={[
          'Shows the five road segments with the highest closeness values at the active scale.',
          'Longer bars mean more accessible segments within the network.',
          'Click a bar to locate that segment on the map.',
        ]}
      />

      <ScaleComparisonChart
        title="Closeness — Cross Scale Comparison"
        data={allScaleAvgs}
        barColor="#E95474"
        infoTitle="Closeness — Cross Scale Comparison"
        infoAria="What does the Closeness Cross Scale chart show?"
        infoPoints={[
          'Compares the overall average closeness across Walking, Neighbourhood, District, and Regional scales.',
          'Taller bars mean higher average accessibility at that analysis distance.',
          'Use this to see how centrality shifts as the network radius grows.',
        ]}
      />

      <ZoneStackedBar
        key={`closeness-zone-${scaleLabel}`}
        title="Closeness Zone Distribution"
        zones={zones}
        infoTitle="Closeness Zone Distribution"
        infoAria="What does the Closeness Zone Distribution show?"
        infoPoints={[
          'Shows the share of road segments in High, Medium, and Low closeness zones for the active scale.',
          'Percentages update when you change the scale buttons on the map.',
          'High zones are the most accessible segments in the network.',
        ]}
      />

      <KeyFindingsBridge
        bullets={CLOSENESS_KEY_FINDINGS}
        synthesisTo="/synthesis?f=F8"
        chips={CENTRALITY_FINDING_CHIPS}
      />
    </div>
  )
}
