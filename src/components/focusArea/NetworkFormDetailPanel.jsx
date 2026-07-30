import FocusAreaPanelCard from './FocusAreaPanelCard.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'
import { formatPct } from '../../utils/networkFormStats.js'
import { NETWORK_FORM_ICONS } from '../../constants/networkForm.js'

export default function NetworkFormDetailPanel({
  findings,
  metrics,
  culdesacRows,
  loading,
  onJunctionClick,
}) {
  const corridor = findings?.corridor_vs_interior
  const shareC = formatPct(corridor?.four_way_share_corridor)
  const shareI = formatPct(corridor?.four_way_share_interior)
  const spacing = metrics?.junction_spacing_m

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-l-4 border-[#f59e0b] pl-3">
        <h2 className="font-display text-lg font-semibold text-surface-50">
          Fabric detail
        </h2>
        <MetricInfoButton
          title="Corridor vs interior"
          ariaLabel="What does corridor vs interior mean?"
          points={[
            'Corridor junctions sit within 50 m of trunk/primary/secondary streets.',
            'Interior junctions are the remaining inside-GN nodes — typically more 3-way and cul-de-sac dominated.',
            'Click a cul-de-sac row to fly to it on the map.',
          ]}
        />
      </div>

      {loading && (
        <p className="text-center text-xs text-surface-300">Loading detail…</p>
      )}

      <FocusAreaPanelCard>
        <h3 className="mb-3 font-display text-sm font-semibold text-surface-100">
          Corridor vs interior (50 m)
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-surface-700 bg-surface-900/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-surface-400">Corridor</p>
            <p className="mt-1 text-lg font-semibold text-surface-50">{shareC}</p>
            <p className="text-xs text-surface-300">4-way share</p>
            <p className="mt-2 text-xs text-surface-400">
              n = {corridor?.n_corridor ?? '—'}
            </p>
          </div>
          <div className="rounded-md border border-surface-700 bg-surface-900/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-surface-400">Interior</p>
            <p className="mt-1 text-lg font-semibold text-surface-50">{shareI}</p>
            <p className="text-xs text-surface-300">4-way share</p>
            <p className="mt-2 text-xs text-surface-400">
              n = {corridor?.n_interior ?? '—'}
            </p>
          </div>
        </div>
      </FocusAreaPanelCard>

      <FocusAreaPanelCard>
        <h3 className="mb-2 font-display text-sm font-semibold text-surface-100">
          Junction spacing
        </h3>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <dt className="text-surface-400">Median</dt>
            <dd className="font-mono text-surface-100">
              {spacing?.median != null ? `${spacing.median} m` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-surface-400">Mean</dt>
            <dd className="font-mono text-surface-100">
              {spacing?.mean != null ? `${spacing.mean} m` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-surface-400">IQR</dt>
            <dd className="font-mono text-surface-100">
              {spacing?.q25 != null && spacing?.q75 != null
                ? `${spacing.q25}–${spacing.q75} m`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-surface-400">Cul-de-sacs</dt>
            <dd className="font-mono text-surface-100">
              {metrics?.counts?.n_culdesac ?? '—'}
            </dd>
          </div>
        </dl>
      </FocusAreaPanelCard>

      <FocusAreaPanelCard>
        <h3 className="mb-2 font-display text-sm font-semibold text-surface-100">
          Sample cul-de-sacs
        </h3>
        {!culdesacRows?.length ? (
          <p className="text-xs text-surface-400">No cul-de-sacs loaded.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {culdesacRows.map((row) => (
              <li key={row.nodeId}>
                <button
                  type="button"
                  onClick={() => onJunctionClick?.(row.nodeId)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-surface-100 hover:bg-surface-700/80"
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: NETWORK_FORM_ICONS.culdesac.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                  <span className="font-mono text-surface-400">deg {row.degree}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </FocusAreaPanelCard>
    </div>
  )
}
