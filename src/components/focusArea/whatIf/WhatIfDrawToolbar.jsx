import { useRef } from 'react'
import { Check, Eraser, Hand, Pencil, Play, Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { WHAT_IF_DRAW_TOOLS } from '../../../constants/centralityWhatIf.js'
import { WHAT_IF_TOOLBAR_INFO } from '../../../constants/whatIfHelpContent.js'
import MetricInfoButton from '../MetricInfoButton.jsx'
import WhatIfGuidanceBanner from './WhatIfGuidanceBanner.jsx'
import WhatIfPencilCoachMark from './WhatIfPencilCoachMark.jsx'

function ToolBtn({ active, onClick, label, children, accent, disabled, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex h-10 w-10 items-center justify-center rounded-lg border transition',
        disabled
          ? 'cursor-not-allowed border-surface-700 bg-surface-900/60 text-surface-600'
          : active
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
  onRedo,
  onFinishLink,
  onRun,
  onReset,
  canFinish,
  canUndo = false,
  canRedo = false,
  runLabel = 'Run sDNA',
  statusText,
  guidance,
  embedded = false,
}) {
  const pencilRef = useRef(null)

  function selectTool(next) {
    onToolChange(tool === next ? WHAT_IF_DRAW_TOOLS.pan : next)
  }

  const showBanner = Boolean(guidance?.banner)
  const showFallbackStatus = !showBanner && statusText

  return (
    <div
      className={[
        'pointer-events-auto z-[1000] flex w-fit max-w-full flex-col items-center gap-1.5',
        embedded
          ? 'relative'
          : 'absolute bottom-4 left-1/2 max-w-[min(92vw,520px)] -translate-x-1/2',
      ].join(' ')}
    >
      {showBanner ? (
        <WhatIfGuidanceBanner
          title={guidance.banner.title}
          body={guidance.banner.body}
          assertive={guidance.banner.assertive}
          showWelcomeCheckbox={guidance.banner.showWelcomeCheckbox}
          onDismissStep={guidance.dismissStep}
          onDismissSession={guidance.dismissSession}
          onMarkCompleted={guidance.markCompleted}
        />
      ) : null}

      {showFallbackStatus ? (
        <div className="max-w-full rounded-md border border-surface-600 bg-surface-900/95 px-3 py-1 text-[11px] text-surface-200 shadow-card backdrop-blur">
          <p className="min-w-0">{statusText}</p>
        </div>
      ) : null}

      <div className="relative flex items-center gap-1.5 rounded-xl border border-surface-600 bg-surface-900/95 p-1.5 shadow-card backdrop-blur">
        <ToolBtn
          active={tool === WHAT_IF_DRAW_TOOLS.pan}
          onClick={() => selectTool(WHAT_IF_DRAW_TOOLS.pan)}
          label="Pan map"
        >
          <Hand size={18} />
        </ToolBtn>
        <div className="relative">
          {guidance?.showCoachMark ? (
            <WhatIfPencilCoachMark
              anchorRef={pencilRef}
              title={guidance.coachCopy?.title}
              body={guidance.coachCopy?.body}
              onDismiss={guidance.dismissCoachMark}
            />
          ) : null}
          <ToolBtn
            buttonRef={pencilRef}
            active={tool === WHAT_IF_DRAW_TOOLS.pencil}
            onClick={() => selectTool(WHAT_IF_DRAW_TOOLS.pencil)}
            label="Draw link — click again to deselect"
          >
            <Pencil size={18} />
          </ToolBtn>
        </div>
        <ToolBtn
          active={tool === WHAT_IF_DRAW_TOOLS.erase}
          onClick={() => selectTool(WHAT_IF_DRAW_TOOLS.erase)}
          label="Erase one link — click again to deselect"
        >
          <Eraser size={18} />
        </ToolBtn>
        <ToolBtn active={false} onClick={onUndo} label="Undo" disabled={!canUndo}>
          <Undo2 size={18} />
        </ToolBtn>
        <ToolBtn active={false} onClick={onRedo} label="Redo" disabled={!canRedo}>
          <Redo2 size={18} />
        </ToolBtn>
        <ToolBtn
          active={snapEnabled}
          onClick={() => onSnapToggle(!snapEnabled)}
          label={snapEnabled ? 'Snap on — stick to magenta nodes' : 'Snap off — free placement'}
        >
          <span className="text-[10px] font-bold">{snapEnabled ? 'SNAP' : 'FREE'}</span>
        </ToolBtn>
        {canFinish ? (
          <ToolBtn active={false} onClick={() => onFinishLink?.()} label="Finish link" accent>
            <Check size={18} />
          </ToolBtn>
        ) : null}
        <div className="mx-1 h-6 w-px bg-surface-600" />
        <ToolBtn active={false} onClick={onRun} label={runLabel} accent>
          <Play size={18} />
        </ToolBtn>
        <ToolBtn active={false} onClick={onReset} label="Reset all drawing">
          <RotateCcw size={18} />
        </ToolBtn>
        <div className="mx-1 h-6 w-px bg-surface-600" />
        <div className="flex h-10 w-10 items-center justify-center">
          <MetricInfoButton
            title="What-If Drawing Tools"
            ariaLabel="What-if drawing help"
            points={WHAT_IF_TOOLBAR_INFO}
          />
        </div>
      </div>
    </div>
  )
}
