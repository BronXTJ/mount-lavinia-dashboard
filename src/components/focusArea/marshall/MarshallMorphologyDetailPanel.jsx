import FocusAreaPanelCard from '../FocusAreaPanelCard.jsx'
import MarshallDataQualityPanel from './MarshallDataQualityPanel.jsx'
import MetricInfoButton from '../MetricInfoButton.jsx'
import { formatStoredCount, formatStoredPercent } from '../../../utils/marshallMorphologyFormat.js'
import { NETWORK_FORM_ICONS } from '../../../constants/networkForm.js'
import {
  MARSHALL_INFO_POINTS,
  MARSHALL_JUNCTION_INFO,
  MARSHALL_METHOD_INFO,
  MARSHALL_RATIO_INFO,
  MARSHALL_REFERENCE_INFO,
  MARSHALL_STRUCTURE_INFO,
  MARSHALL_UNCERTAINTY_DETAIL,
} from '../../../constants/marshallMorphology.js'
import {
  MarshallJunctionEquations,
  MarshallStructureEquations,
} from './MarshallRatioEquations.jsx'

function CardHeading({ title, infoTitle, infoAria, points, muted = false }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <h3 className={`font-display text-sm font-semibold ${muted ? 'text-surface-300' : 'text-surface-100'}`}>
        {title}
      </h3>
      <MetricInfoButton title={infoTitle} ariaLabel={infoAria} points={points} />
    </div>
  )
}

function StatTiles({ items }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="rounded-md border border-surface-700/80 bg-surface-900/50 px-2.5 py-2"
        >
          <p className="text-[11px] font-medium leading-snug text-surface-300">{item.label}</p>
          <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-surface-50">{item.value}</p>
        </li>
      ))}
    </ul>
  )
}

function NetworkFormReferenceTile({ color, label, value }) {
  return (
    <li
      className="rounded-md border border-surface-700/80 bg-surface-900/60 px-2.5 py-2"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, rgb(15 23 42))`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/15"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-surface-100">{label}</p>
        <p className="shrink-0 font-display text-base font-semibold tabular-nums text-surface-50">{value}</p>
      </div>
    </li>
  )
}

export default function MarshallMorphologyDetailPanel({
  metrics,
  studyArea,
  uncertainty,
  loading,
  error,
}) {
  const counts = metrics?.counts
  const ratios = metrics?.ratios
  const comparison = metrics?.comparison_network_form
  const gnName = metrics?.gn_name ?? '—'

  return (
    <div className="flex flex-col gap-3" data-testid="marshall-counts">
      <div className="shrink-0 border-l-4 border-primary-500 pl-3">
        <div className="flex items-center gap-1.5">
          <h2 className="font-display text-lg font-semibold text-surface-50">Marshall Counts</h2>
          <MetricInfoButton
            title="Marshall Counts"
            ariaLabel="What do Marshall Counts show?"
            points={MARSHALL_INFO_POINTS}
          />
        </div>
        <p className="mt-1 text-[11px] text-surface-400">{gnName} GN</p>
      </div>

      {loading && <p className="text-xs text-surface-300">Loading Marshall Counts…</p>}
      {error && !loading && (
        <p className="text-xs text-rose-300">Marshall Morphology data is not available.</p>
      )}

      {!loading && !error && (
        <>
          <FocusAreaPanelCard className="shrink-0 !p-3">
            <CardHeading
              title="Junctions"
              infoTitle="Junctions"
              infoAria="What do the junction counts mean?"
              points={MARSHALL_JUNCTION_INFO}
            />
            <div data-testid="marshall-counts-table">
              <StatTiles
                items={[
                  { label: 'T-junctions', value: formatStoredCount(counts?.n_T) },
                  { label: 'X-junctions', value: formatStoredCount(counts?.n_X) },
                ]}
              />
            </div>
          </FocusAreaPanelCard>

          <FocusAreaPanelCard className="shrink-0 !p-3">
            <CardHeading
              title="Structure"
              infoTitle="Structure"
              infoAria="What do cells and cul-de-sacs mean?"
              points={MARSHALL_STRUCTURE_INFO}
            />
            <StatTiles
              items={[
                { label: 'Cells', value: formatStoredCount(counts?.n_cell_marshall) },
                { label: 'Cul-de-sacs', value: formatStoredCount(counts?.n_cul_marshall) },
              ]}
            />
          </FocusAreaPanelCard>

          <FocusAreaPanelCard className="shrink-0 !p-3">
            <CardHeading
              title="Ratios"
              infoTitle="Ratios"
              infoAria="How are the Marshall ratios defined?"
              points={MARSHALL_RATIO_INFO}
            />
            <StatTiles
              items={[
                { label: 'T-ratio', value: formatStoredPercent(ratios?.T_ratio) },
                { label: 'X-ratio', value: formatStoredPercent(ratios?.X_ratio) },
                { label: 'Cell-ratio', value: formatStoredPercent(ratios?.Cell_ratio) },
                { label: 'Cul-ratio', value: formatStoredPercent(ratios?.Cul_ratio) },
              ]}
            />
          </FocusAreaPanelCard>

          <FocusAreaPanelCard className="shrink-0 !p-3">
            <CardHeading
              title="Network Form Reference"
              infoTitle="Network Form Reference"
              infoAria="How do these counts differ from Marshall?"
              points={MARSHALL_REFERENCE_INFO}
            />
            <ul className="space-y-2" data-testid="marshall-network-form-reference">
              <NetworkFormReferenceTile
                color={NETWORK_FORM_ICONS.culdesac.color}
                label="Network Form Cul-de-sacs"
                value={formatStoredCount(comparison?.n_culdesac_dashboard)}
              />
              <NetworkFormReferenceTile
                color={NETWORK_FORM_ICONS.three_way.color}
                label="Network Form 3-Way"
                value={formatStoredCount(comparison?.n_three_way_dashboard)}
              />
              <NetworkFormReferenceTile
                color={NETWORK_FORM_ICONS.four_way.color}
                label="Network Form 4-Way"
                value={formatStoredCount(comparison?.n_four_way_dashboard)}
              />
            </ul>
          </FocusAreaPanelCard>

          <FocusAreaPanelCard className="shrink-0 !p-3">
            <div data-testid="marshall-study-area">
            <h3 className="mb-2 font-display text-sm font-semibold text-surface-100">Study Area</h3>
            <StatTiles
              items={[
                { label: 'T-junctions', value: formatStoredCount(studyArea?.counts?.n_T) },
                { label: 'X-junctions', value: formatStoredCount(studyArea?.counts?.n_X) },
                { label: 'Cells', value: formatStoredCount(studyArea?.counts?.n_cell_marshall) },
                { label: 'Cul-de-sacs', value: formatStoredCount(studyArea?.counts?.n_cul_marshall) },
                { label: 'T-ratio', value: formatStoredPercent(studyArea?.ratios?.T_ratio) },
                { label: 'X-ratio', value: formatStoredPercent(studyArea?.ratios?.X_ratio) },
                { label: 'Cell-ratio', value: formatStoredPercent(studyArea?.ratios?.Cell_ratio) },
                { label: 'Cul-ratio', value: formatStoredPercent(studyArea?.ratios?.Cul_ratio) },
              ]}
            />
            </div>
          </FocusAreaPanelCard>

          <FocusAreaPanelCard className="shrink-0 !p-3">
            <CardHeading
              title="Definitions"
              infoTitle="Definitions and Method"
              infoAria="How are Marshall Counts defined?"
              points={[
                ...MARSHALL_METHOD_INFO,
                ...MARSHALL_UNCERTAINTY_DETAIL,
                <MarshallJunctionEquations key="t" />,
                <MarshallStructureEquations key="c" />,
              ]}
            />
            <div className="space-y-1.5 text-surface-100">
              <MarshallJunctionEquations />
              <MarshallStructureEquations />
            </div>
          </FocusAreaPanelCard>

          <MarshallDataQualityPanel uncertainty={uncertainty} />
        </>
      )}
    </div>
  )
}
