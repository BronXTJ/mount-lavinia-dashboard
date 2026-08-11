import { Check, Eraser, Hand, Pencil, Play, RotateCcw, Undo2 } from 'lucide-react'
import { WHAT_IF_DRAW_TOOLS } from '../../../constants/centralityWhatIf.js'

function ToolBtn({ active, onClick, label, children, accent }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={[
        'flex h-10 w-10 items-center justify-center rounded-lg border transition',
        active
          ? 'border-primary-500 bg-primary-500/20 text-primary-300'
          : accent
            ? 'border-orange-500/60 bg-orange-500/15 text-orange-300 hover:bg-orange-500/25'
            : 'border-surface-600 bg-surface-850/95 text-surface-200 hover:border-surface-400 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/** Floating draw toolbar for Centrality What-if mode. */
export default function WhatIfDrawToolbar({
  tool,
  onToolChange,
  snapEnabled,
  onSnapToggle,
  onUndo,
  onClear,
  onFinishLink,
  onRun,
  onReset,
  canFinish,
  runLabel = 'Export proposed links',
  statusText,
}) {
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 flex-col items-center gap-2">
      {statusText ? (
        <p className="rounded-md border border-surface-600 bg-surface-900/95 px-3 py-1 text-[11px] text-surface-200 shadow-card backdrop-blur">
          {statusText}
        </p>
      ) : null}
      <div className="flex items-center gap-1.5 rounded-xl border border-surface-600 bg-surface-900/95 p-1.5 shadow-card backdrop-blur">
        <ToolBtn
          active={tool === WHAT_IF_DRAW_TOOLS.pan}
          onClick={() => onToolChange(WHAT_IF_DRAW_TOOLS.pan)}
          label="Pan map"
        >
          <Hand size={18} />
        </ToolBtn>
        <ToolBtn
          active={tool === WHAT_IF_DRAW_TOOLS.pencil}
          onClick={() => onToolChange(WHAT_IF_DRAW_TOOLS.pencil)}
          label="Draw link"
        >
          <Pencil size={18} />
        </ToolBtn>
        <ToolBtn active={false} onClick={onUndo} label="Undo">
          <Undo2 size={18} />
        </ToolBtn>
        <ToolBtn active={false} onClick={onClear} label="Clear proposed links">
          <Eraser size={18} />
        </ToolBtn>
        <ToolBtn
          active={snapEnabled}
          onClick={() => onSnapToggle(!snapEnabled)}
          label={snapEnabled ? 'Snap on' : 'Snap off'}
        >
          <span className="text-[10px] font-bold">{snapEnabled ? 'SNAP' : 'FREE'}</span>
        </ToolBtn>
        {canFinish ? (
          <ToolBtn active={false} onClick={onFinishLink} label="Finish link" accent>
            <Check size={18} />
          </ToolBtn>
        ) : null}
        <div className="mx-1 h-6 w-px bg-surface-600" />
        <ToolBtn active={false} onClick={onRun} label={runLabel} accent>
          <Play size={18} />
        </ToolBtn>
        <ToolBtn active={false} onClick={onReset} label="Reset drawing">
          <RotateCcw size={18} />
        </ToolBtn>
      </div>
    </div>
  )
}
