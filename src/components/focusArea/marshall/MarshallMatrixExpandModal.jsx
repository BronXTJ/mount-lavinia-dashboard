import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import MarshallMatrixChart from './MarshallMatrixChart.jsx'

export default function MarshallMatrixExpandModal({
  open,
  onClose,
  scopes = [],
  selectedName = null,
  onSelectScope,
}) {
  const titleId = useId()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    closeRef.current?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90vh,100dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-900 p-5 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-lg font-semibold text-surface-50">
            Marshall morphology matrix
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md border border-surface-700 px-2 py-1 text-surface-200 hover:bg-surface-800"
            aria-label="Close expanded Marshall morphology matrix"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <MarshallMatrixChart
            size="expanded"
            scopes={scopes}
            selectedName={selectedName}
            onSelectScope={onSelectScope}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
