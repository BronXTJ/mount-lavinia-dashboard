import { ChartNoAxesColumn, CircleDot, TrendingDown, TrendingUp } from 'lucide-react'
import { BETWEENNESS_BAR_COLOR, PLACEHOLDER_TOP5 } from '../../constants/centrality.js'
import { computeZoneDistribution, formatMetricValue } from '../../utils/centralityStats.js'
import CentralityBarChart from './CentralityBarChart.jsx'
import FocusAreaStatGrid from './FocusAreaStatGrid.jsx'
import KeyFindingsBridge from './KeyFindingsBridge.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'
import ScaleComparisonChart from './ScaleComparisonChart.jsx'
import ZoneStackedBar from './ZoneStackedBar.jsx'

const kpiIconClass = 'h-3.5 w-3.5'

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
    {
      label: 'Current Scale',
      value: scaleLabel,
      icon: <CircleDot className={kpiIconClass} aria-hidden />,
    },
    {
      label: 'Highest Value',
      value: formatMetricValue(stats?.max),
      icon: <TrendingUp className={kpiIconClass} aria-hidden />,
    },
    {
      label: 'Lowest Value',
      value: formatMetricValue(stats?.min),
      icon: <TrendingDown className={kpiIconClass} aria-hidden />,
    },
    {
      label: 'Average Value',
      value: formatMetricValue(stats?.avg),
      icon: <ChartNoAxesColumn className={kpiIconClass} aria-hidden />,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-l-4 border-orange-500 pl-3">
        <h2 className="font-display text-lg font-semibold text-surface-50">Betweenness Centrality</h2>
        <MetricInfoButton
          title="Betweenness Centrality"
          ariaLabel="What does Betweenness Centrality show?"
          points={[
            'Betweenness asks how often a road would sit on shortest paths between other places — a network through-route role, not live traffic counts.',
            'This panel summarises that role at the scale you pick on the map (Walking → Regional).',
            'Higher values mark stronger through-movement corridors. Click a top-segment bar to find that road on the map.',
            'Scale buttons change the network distance used in the calculation.',
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
          'The five road segments with the highest betweenness at the active scale — the strongest through-route candidates.',
          'Longer bars mean a stronger network through-route role (not measured vehicle counts).',
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
          'Compares average betweenness across Walking, Neighbourhood, District, and Regional scales.',
          'Taller bars mean higher average through-route importance at that network distance.',
          'Use this to see how corridor roles shift as the analysis radius grows.',
        ]}
      />

      <ZoneStackedBar
        key={`betweenness-zone-${scaleLabel}`}
        title="Betweenness Zone Distribution"
        zones={zones}
        infoTitle="Betweenness Zone Distribution"
        infoAria="What does the Betweenness Zone Distribution show?"
        infoPoints={[
          'Share of road segments in High, Medium, and Low betweenness tiers for the active scale.',
          'Tiers are relative to this scale’s value range — not fixed planning zones on the ground.',
          'High = top third of the range, Medium = middle third, Low = bottom third.',
          'Counts are not forced to 33% each; skewed networks can show more Low or more High segments.',
          'Percentages update when you change the scale; popups use the same idea (middle tier labelled Moderate).',
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
