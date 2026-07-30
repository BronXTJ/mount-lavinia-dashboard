import { NETWORK_FORM_ICONS } from '../../constants/networkForm.js'

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

/** Bottom-left dark legend for Network Form junction icons. */
export default function NetworkFormLegend({ counts, visibleLayers }) {
  const rows = [
    { id: 'four_way', label: '4-way' },
    { id: 'three_way', label: '3-way' },
    { id: 'culdesac', label: 'Cul-de-sac' },
  ].filter((r) => visibleLayers?.[r.id] !== false)

  if (rows.length === 0) return null

  return (
    <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] w-52 rounded-lg border border-surface-700 bg-surface-900/95 p-3 shadow-card backdrop-blur">
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
    </div>
  )
}
