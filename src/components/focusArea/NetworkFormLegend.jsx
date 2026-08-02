import {
  CULDESAC_HEX_COUNT_STOPS,
  CULDESAC_WALK_TIER_COLORS,
  CULDESAC_WALK_TIER_ORDER,
  NETWORK_FORM_ICONS,
} from '../../constants/networkForm.js'

function Symbol({ jtype }) {
  const color = NETWORK_FORM_ICONS[jtype]?.color ?? '#94a3b8'
  if (jtype === 'four_way') {
    return (
      <span
        className="inline-block"
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: `10px solid ${color}`,
        }}
        aria-hidden
      />
    )
  }
  if (jtype === 'three_way') {
    return (
      <span
        className="inline-block h-2.5 w-2.5"
        style={{ backgroundColor: color }}
        aria-hidden
      />
    )
  }
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}

function hexStopLabel(stop, index, stops) {
  if (index === 0) return '1'
  const prev = stops[index - 1].max
  if (!Number.isFinite(stop.max)) return `${prev + 1}+`
  if (stop.max === prev + 1) return String(stop.max)
  return `${prev + 1}–${stop.max}`
}

const TIER_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low / Desert',
  excluded: 'Excluded',
}

/** Bottom-left dark legend for Network Form junction icons. */
export default function NetworkFormLegend({ counts, visibleLayers }) {
  const rows = [
    { id: 'four_way', label: '4-way' },
    { id: 'three_way', label: '3-way' },
    { id: 'culdesac', label: 'Cul-de-sac' },
  ].filter((r) => visibleLayers?.[r.id] !== false)

  const showHex = Boolean(visibleLayers?.culdesacHex)
  const showWalk = Boolean(visibleLayers?.culdesacWalk)

  if (rows.length === 0 && !showHex && !showWalk) return null

  return (
    <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] w-52 rounded-lg border border-surface-700 bg-surface-900/95 p-3 shadow-card backdrop-blur">
      {rows.length > 0 && (
        <>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-surface-300">
            Junctions (inside GN)
          </p>
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-2 text-xs text-surface-100">
                <Symbol jtype={row.id} />
                <span className="flex-1">{row.label}</span>
                <span className="font-mono text-surface-300">{counts?.[row.id] ?? 0}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {showHex && (
        <div className={rows.length > 0 ? 'mt-3 border-t border-surface-700/80 pt-2.5' : ''}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-surface-300">
            Cul-de-sacs / hex
          </p>
          <ul className="space-y-1.5">
            {CULDESAC_HEX_COUNT_STOPS.map((stop, i) => (
              <li key={stop.color} className="flex items-center gap-2 text-xs text-surface-100">
                <span
                  className="inline-block h-2.5 w-3.5 shrink-0 rounded-sm border border-surface-600"
                  style={{ backgroundColor: stop.color }}
                  aria-hidden
                />
                <span className="flex-1 font-mono text-surface-200">
                  {hexStopLabel(stop, i, CULDESAC_HEX_COUNT_STOPS)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showWalk && (
        <div
          className={
            rows.length > 0 || showHex ? 'mt-3 border-t border-surface-700/80 pt-2.5' : ''
          }
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-surface-300">
            Walk access tier
          </p>
          <ul className="space-y-1.5">
            {CULDESAC_WALK_TIER_ORDER.map((tier) => (
              <li key={tier} className="flex items-center gap-2 text-xs text-surface-100">
                <span
                  className="inline-block h-2.5 w-3.5 shrink-0 rounded-sm border border-surface-600"
                  style={{ backgroundColor: CULDESAC_WALK_TIER_COLORS[tier] }}
                  aria-hidden
                />
                <span className="flex-1 text-surface-200">{TIER_LABELS[tier]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
