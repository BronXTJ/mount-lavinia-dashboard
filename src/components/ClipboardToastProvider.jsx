import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const ClipboardToastContext = createContext(null)

const DEFAULT_MESSAGE = 'Copied to clipboard'
const AUTO_HIDE_MS = 2500

export function useClipboardToast() {
  const ctx = useContext(ClipboardToastContext)
  if (!ctx) {
    throw new Error('useClipboardToast must be used within ClipboardToastProvider')
  }
  return ctx
}

/** Optional hook for map extras — no throw when provider missing (tests). */
export function useClipboardToastOptional() {
  return useContext(ClipboardToastContext)
}

export default function ClipboardToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const hideTimerRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimer()
    setToast(null)
  }, [clearTimer])

  const showClipboardToast = useCallback(
    (message = DEFAULT_MESSAGE) => {
      clearTimer()
      setToast({ message })
      hideTimerRef.current = window.setTimeout(() => {
        setToast(null)
        hideTimerRef.current = null
      }, AUTO_HIDE_MS)
    },
    [clearTimer],
  )

  useEffect(() => () => clearTimer(), [clearTimer])

  return (
    <ClipboardToastContext.Provider value={{ showClipboardToast }}>
      {children}
      {toast ? (
        <div
          className="pointer-events-auto fixed bottom-6 left-1/2 z-[10000] flex -translate-x-1/2 items-center gap-3 rounded-md bg-surface-950 px-4 py-2.5 text-sm text-surface-50 shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
          role="status"
          aria-live="polite"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-surface-300 transition hover:bg-surface-800 hover:text-surface-50"
            aria-label="Dismiss"
            onClick={dismiss}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </ClipboardToastContext.Provider>
  )
}
