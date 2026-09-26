import {
  NETWORK_FORM_GN_NAMES,
  NETWORK_FORM_SCOPE_ALL,
} from '../../constants/networkForm.js'
import FocusAreaPanelCard from './FocusAreaPanelCard.jsx'

function ScopeButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border px-3 py-2 text-left text-sm transition-colors"
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

function ScopeButtonStack({ selectedScope, onSelectScope, gapClass }) {
  return (
    <div className={`flex flex-col ${gapClass}`}>
      <ScopeButton
        active={selectedScope === NETWORK_FORM_SCOPE_ALL}
        label="All GN Divisions"
        onClick={() => onSelectScope?.(NETWORK_FORM_SCOPE_ALL)}
      />
      {NETWORK_FORM_GN_NAMES.map((name) => (
        <ScopeButton
          key={name}
          active={selectedScope === name}
          label={name}
          onClick={() => onSelectScope?.(name)}
        />
      ))}
    </div>
  )
}

/** GN study-area scope — left panel or enlarged-map HUD. */
export default function NetworkFormScopeSelector({
  selectedScope,
  onSelectScope,
  variant = 'panel',
  className = '',
}) {
  if (variant === 'hud') {
    return (
      <div
        className={`w-52 max-h-[min(70vh,calc(100%-6rem))] overflow-y-auto rounded-lg border border-surface-700 bg-surface-900/95 p-2 shadow-card backdrop-blur ${className}`.trim()}
      >
        <p className="mb-1.5 px-1 font-display text-xs font-semibold text-surface-100">
          GN Divisions
        </p>
        <ScopeButtonStack
          selectedScope={selectedScope}
          onSelectScope={onSelectScope}
          gapClass="gap-1"
        />
      </div>
    )
  }

  return (
    <FocusAreaPanelCard className={className}>
      <h3 className="mb-2 font-display text-sm font-semibold text-surface-100">GN Divisions</h3>
      <ScopeButtonStack
        selectedScope={selectedScope}
        onSelectScope={onSelectScope}
        gapClass="gap-1.5"
      />
    </FocusAreaPanelCard>
  )
}
