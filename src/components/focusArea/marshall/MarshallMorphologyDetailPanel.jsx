import FocusAreaPanelCard from '../FocusAreaPanelCard.jsx'
import MetricInfoButton from '../MetricInfoButton.jsx'
import { formatStoredCount, formatStoredPercent } from '../../../utils/marshallMorphologyFormat.js'
import {
  MARSHALL_JUNCTION_INFO,
  MARSHALL_METHOD_INFO,
  MARSHALL_RATIO_INFO,
  MARSHALL_REFERENCE_INFO,
  MARSHALL_STRUCTURE_INFO,
} from '../../../constants/marshallMorphology.js'
import {
  MarshallJunctionEquations,
  MarshallStructureEquations,
} from './MarshallRatioEquations.jsx'

function countSum(a, b) {
  const left = Number(a)
  const right = Number(b)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return '—'
  return String(left + right)
}

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
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-surface-400">{item.label}</p>
          <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-surface-50">{item.value}</p>
        </li>
      ))}
    </ul>
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
    <div className="flex flex-col gap-2" data-testid="marshall-counts">
      <div className="shrink-0 border-l-4 border-primary-500 pl-3">
        <div className="flex items-center gap-1.5">
          <h2 className="font-display text-lg font-semibold text-surface-50">Marshall Counts</h2>
          <MetricInfoButton
            title="Definitions and Method"
            ariaLabel="How are Marshall Counts defined?"
            points={[
              <MarshallJunctionEquations key="t" />,
              <MarshallStructureEquations key="c" />,
              ...MARSHALL_METHOD_INFO,
            ]}
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
              points={[...MARSHALL_JUNCTION_INFO, <MarshallJunctionEquations key="t" />]}
            />
            <div data-testid="marshall-counts-table">
              <StatTiles
                items={[
                  { label: 'T-junctions', value: formatStoredCount(counts?.n_T) },
                  { label: 'X-junctions', value: formatStoredCount(counts?.n_X) },
                  { label: 'T + X', value: countSum(counts?.n_T, counts?.n_X) },
                ]}
              />
            </div>
          </FocusAreaPanelCard>

          <FocusAreaPanelCard className="shrink-0 !p-3">
            <CardHeading
              title="Structure"
              infoTitle="Structure"
              infoAria="What do cells and cul-de-sacs mean?"
              points={[...MARSHALL_STRUCTURE_INFO, <MarshallStructureEquations key="c" />]}
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
              points={[
                ...MARSHALL_RATIO_INFO,
                <MarshallJunctionEquations key="t" />,
                <MarshallStructureEquations key="c" />,
              ]}
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
              muted
            />
            <ul className="space-y-2 text-xs text-surface-300">
              <li className="flex items-baseline justify-between gap-3">
                <span>Network Form cul-de-sacs</span>
                <span className="tabular-nums text-surface-100">
                  {formatStoredCount(comparison?.n_culdesac_dashboard)}
                </span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>Network Form 3-way</span>
                <span className="tabular-nums text-surface-100">
                  {formatStoredCount(comparison?.n_three_way_dashboard)}
                </span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>Network Form 4-way</span>
                <span className="tabular-nums text-surface-100">
                  {formatStoredCount(comparison?.n_four_way_dashboard)}
                </span>
              </li>
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
              <MarshallJunctionEquations key="t" />,
              <MarshallStructureEquations key="c" />,
              ...MARSHALL_METHOD_INFO,
            ]}
            />
            <div className="mb-3 space-y-3 text-sm text-surface-100">
              <MarshallJunctionEquations />
              <MarshallStructureEquations />
            </div>
            <ul className="space-y-1 text-[11px] leading-relaxed text-surface-300">
              {MARSHALL_METHOD_INFO.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </FocusAreaPanelCard>

          <p className="shrink-0 text-[11px] leading-relaxed text-surface-400" data-testid="marshall-uncertainty">
            Quality note: {uncertainty?.junctions ?? '—'} junction crossings, {uncertainty?.cells ?? '—'} cell,
            and {uncertainty?.cul_de_sacs ?? '—'} cul-de-sac cases remained uncertain. These six cases were
            excluded from the ratios. The counts use the validated Marshall-ready street network.
          </p>
        </>
      )}
    </div>
  )
}
