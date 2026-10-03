import { NETWORK_FORM_GN_NAMES } from '../../../constants/networkForm.js'

function ScopeChip({ active, label, disabled, title, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className="w-full rounded-full border px-2 py-1 text-center text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: active ? '#00b4d8' : 'rgba(71,85,105,0.8)',
        backgroundColor: active ? 'rgba(0,180,216,0.12)' : 'transparent',
        color: active ? '#e0f2fe' : '#cbd5e1',
      }}
    >
      {label}
    </button>
  )
}

export default function MarshallGnScopeChips({
  selectedScope,
  onSelectScope,
  testId,
  className = '',
}) {
  return (
    <div
      className={`grid grid-cols-6 gap-1.5 ${className}`.trim()}
      data-testid={testId}
      role="group"
      aria-label="GN divisions"
    >
      {NETWORK_FORM_GN_NAMES.map((name, index) => (
        <div key={name} className={index < 3 ? 'col-span-2' : 'col-span-3'}>
          <ScopeChip
            active={name === selectedScope}
            label={name}
            onClick={() => onSelectScope?.(name)}
          />
        </div>
      ))}
    </div>
  )
}
