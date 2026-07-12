import { BEHAVIOUR_ACCENT, JUNCTION_COLORS } from '../data/colors'
import { junctions } from '../data/junctions'

export default function JunctionCardList({ selectedJunctionId, onSelect }) {
  return (
    <div>
      <h2
        className="mb-3 border-l-4 pl-3 font-display text-lg font-semibold text-surface-50"
        style={{ borderColor: BEHAVIOUR_ACCENT }}
      >
        Junction Analysis
      </h2>
      <div className="space-y-2">
        {junctions.map((j) => {
          const selected = selectedJunctionId === j.id
          const color = JUNCTION_COLORS[j.id]
          return (
            <button
              key={j.id}
              type="button"
              onClick={() => onSelect(j.id)}
              className="w-full rounded-lg border p-3 text-left transition-colors"
              style={{
                backgroundColor: selected ? '#1f2d3d' : '#1a2535',
                borderColor: selected ? BEHAVIOUR_ACCENT : '#2a3a4a',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="font-display text-base font-semibold text-surface-50">
                  {j.name}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
