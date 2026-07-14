import { BETWEENNESS_BAR_COLOR, PLACEHOLDER_TOP5 } from '../../constants/centrality.js'
import { computeZoneDistribution, formatMetricValue } from '../../utils/centralityStats.js'
import CentralityBarChart from './CentralityBarChart.jsx'
import FocusAreaStatGrid from './FocusAreaStatGrid.jsx'
import KeyFindingsBridge from './KeyFindingsBridge.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'
import ScaleComparisonChart from './ScaleComparisonChart.jsx'
import ZoneStackedBar from './ZoneStackedBar.jsx'

const BETWEENNESS_KEY_FINDINGS = [
  'Highest betweenness values mark corridors that lie on many shortest paths between other places.',
  'Junction and arterial spines stand out as through-movement links rather than only local-access streets.',
  'Cross-scale betweenness shows which corridors keep through-route importance as the network radius grows.',
]

const CENTRALITY_FINDING_CHIPS = [
  { id: 'F8', label: 'F8 Network centrality', to: '/synthesis?f=F8' },
]

export default function BetweennessPanel({
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
  const zones = computeZoneDistribution(currentGeoJson, 'betweenness', scaleMeters)

  const statItems = [
    { label: 'Current Scale', value: scaleLabel, icon: '◎' },
    { label: 'Highest Value', value: formatMetricValue(stats?.max), icon: '▲' },
    { label: 'Lowest Value', value: formatMetricValue(stats?.min), icon: '▼' },
    { label: 'Average Value', value: formatMetricValue(stats?.avg), icon: '◆' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-l-4 border-orange-500 pl-3">
        <h2 className="font-display text-lg font-semibold text-surface-50">Betweenness Centrality</h2>
        <MetricInfoButton
          title="Betweenness Centrality"
          ariaLabel="What does Betweenness Centrality show?"
          points={[
            'Measures how often a road segment lies on shortest paths between other locations.',
            'Higher values mark major through-movement corridors with high traffic potential.',
            'Scale buttons change the network distance used for the calculation.',
            'Click a top segment bar to locate that corridor on the map.',
          ]}
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading betweenness data…</p>
      )}

      <FocusAreaStatGrid items={statItems} />

      <CentralityBarChart
        key={scaleLabel}
        title="Top 5 Road Segments by Betweenness"
        data={chartData}
        barColor={BETWEENNESS_BAR_COLOR}
        isPlaceholder={!hasData}
        onBarClick={hasData ? onSegmentClick : undefined}
        infoTitle="Top 5 Road Segments by Betweenness"
        infoAria="What does the Top 5 Betweenness chart show?"
        infoPoints={[
          'Shows the five road segments with the highest betweenness values at the active scale.',
          'Longer bars mean stronger through-movement corridors.',
          'Click a bar to locate that corridor on the map.',
        ]}
      />

      <ScaleComparisonChart
        title="Betweenness — Cross Scale Comparison"
        data={allScaleAvgs}
        barColor="#34d399"
        infoTitle="Betweenness — Cross Scale Comparison"
        infoAria="What does the Betweenness Cross Scale chart show?"
        infoPoints={[
          'Compares the overall average betweenness across Walking, Neighbourhood, District, and Regional scales.',
          'Taller bars mean higher average through-movement potential at that analysis distance.',
          'Use this to see how corridor importance shifts as the network radius grows.',
        ]}
      />

      <ZoneStackedBar
        key={`betweenness-zone-${scaleLabel}`}
        title="Betweenness Zone Distribution"
        zones={zones}
        infoTitle="Betweenness Zone Distribution"
        infoAria="What does the Betweenness Zone Distribution show?"
        infoPoints={[
          'Shows the share of road segments in High, Medium, and Low betweenness tiers for the active scale.',
          'Tiers are relative, not fixed planning zones: each segment is ranked against the min–max range for this scale.',
          'High = top third of the value range (normalized ≥ ⅔), Medium = middle third (⅓–⅔), Low = bottom third (< ⅓).',
          'Segment counts are not forced to 33% each — skewed networks can show more Low or more High segments.',
          'Percentages update when you change the scale on the map; the same logic is used in segment popups (shown as Moderate there).',
          'High tiers are the strongest through-movement corridors at this scale.',
        ]}
      />

      <KeyFindingsBridge
        bullets={BETWEENNESS_KEY_FINDINGS}
        synthesisTo="/synthesis?f=F8"
        chips={CENTRALITY_FINDING_CHIPS}
      />
    </div>
  )
}
