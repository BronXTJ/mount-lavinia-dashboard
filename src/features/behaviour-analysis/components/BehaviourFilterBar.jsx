import { BEHAVIOUR_ACCENT, PERIOD_LABELS } from '../data/colors'

const DAYS = [
  { id: 'weekday', label: 'Weekday' },
  { id: 'weekend', label: 'Weekend' },
]

const PERIODS = [
  { id: 'morning', label: PERIOD_LABELS.morning },
  { id: 'midday', label: PERIOD_LABELS.midday },
  { id: 'evening', label: PERIOD_LABELS.evening },
]

function FilterButton({ active, onClick, children, wide }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-md px-6 py-2.5 text-sm font-semibold transition-colors',
        wide ? 'min-w-[9rem]' : 'min-w-[7.5rem]',
      ].join(' ')}
      style={{
        backgroundColor: active ? BEHAVIOUR_ACCENT : '#1a2535',
        color: '#e0e0e0',
        border: '1px solid #2a3a4a',
      }}
    >
      {children}
    </button>
  )
}

export default function BehaviourFilterBar({ dayFilter, periodFilter, onDayChange, onPeriodChange }) {
  return (
    <div
      className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-surface-700 px-4"
      style={{ backgroundColor: '#0f1923' }}
    >
      <div className="flex items-center gap-2">
        {DAYS.map((d) => (
          <FilterButton key={d.id} active={dayFilter === d.id} onClick={() => onDayChange(d.id)}>
            {d.label}
          </FilterButton>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <FilterButton
            key={p.id}
            wide
            active={periodFilter === p.id}
            onClick={() => onPeriodChange(p.id)}
          >
            {p.label}
          </FilterButton>
        ))}
      </div>
    </div>
  )
}
