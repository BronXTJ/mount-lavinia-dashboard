import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Car,
  Compass,
  Download,
  GitBranch,
  Grid3x3,
  Layers,
  LayoutDashboard,
  MapPin,
  Thermometer,
  Trees,
  TrendingUp,
  Footprints,
  X,
} from 'lucide-react'
import { USER_GUIDE_SECTIONS } from '../constants/userGuideContent.js'

const TEAL = '#00b4d8'

const ICON_MAP = {
  Compass,
  LayoutDashboard,
  MapPin,
  Layers,
  Grid3x3,
  TrendingUp,
  Footprints,
  Car,
  Trees,
  Thermometer,
  GitBranch,
  AlertTriangle,
  Download,
}

/**
 * Scannable User Guide modal — left section nav + action bullets.
 * Portaled to document.body so sidebar overflow/backdrop-filter cannot clip it.
 */
export default function UserGuideModal({ open, onClose }) {
  const [closing, setClosing] = useState(false)
  const [activeId, setActiveId] = useState(USER_GUIDE_SECTIONS[0]?.id)
  const titleId = useId()
  const closeBtnRef = useRef(null)

  const activeSection =
    USER_GUIDE_SECTIONS.find((section) => section.id === activeId) ?? USER_GUIDE_SECTIONS[0]
  const ActiveIcon = ICON_MAP[activeSection?.icon] ?? Compass

  function requestClose() {
    if (closing) return
    setClosing(true)
  }

  useEffect(() => {
    if (!open) return
    setClosing(false)
    setActiveId(USER_GUIDE_SECTIONS[0]?.id)
    const timer = window.setTimeout(() => closeBtnRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event) {
      if (event.key === 'Escape') requestClose()
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => {
      onClose()
      setClosing(false)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  if (!open) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[3000] flex items-center justify-center p-4 sm:p-6 ${
        closing ? 'typology-info-overlay-exit' : 'typology-info-overlay-enter'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={requestClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex h-[min(88vh,640px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#2a3a4a] shadow-[0_16px_48px_rgba(0,0,0,0.6)] ${
          closing ? 'typology-info-modal-exit' : 'typology-info-modal-enter'
        }`}
        style={{ backgroundColor: '#1a2535' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#2a3a4a] px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'rgba(0, 180, 216, 0.14)',
                boxShadow: 'inset 0 0 0 1px rgba(0, 180, 216, 0.35)',
              }}
              aria-hidden
            >
              <Compass style={{ color: TEAL }} size={18} />
            </span>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-[#e0e0e0]">
                User Guide
              </h2>
              <p className="mt-1 text-xs text-[#94a3b8]">
                Quick tips for using each part of the dashboard
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={requestClose}
            aria-label="Close user guide"
            className="inline-flex shrink-0 cursor-pointer items-center justify-center text-[#94a3b8] transition-colors hover:text-[#e0e0e0]"
          >
            <X size={20} strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav
            aria-label="Guide sections"
            className="max-h-40 shrink-0 overflow-x-auto overflow-y-auto border-b border-[#2a3a4a] sm:max-h-none sm:w-56 sm:border-b-0 sm:border-r"
          >
            <ul className="flex gap-1 p-2 sm:flex-col sm:gap-0.5 sm:p-3">
              {USER_GUIDE_SECTIONS.map((section) => {
                const isActive = section.id === activeSection?.id
                const Icon = ICON_MAP[section.icon] ?? Compass
                return (
                  <li key={section.id} className="shrink-0 sm:w-full">
                    <button
                      type="button"
                      onClick={() => setActiveId(section.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors sm:text-[13px]"
                      style={{
                        background: isActive ? 'rgba(0, 180, 216, 0.14)' : 'transparent',
                        color: isActive ? '#f8fafc' : '#94a3b8',
                        boxShadow: isActive ? `inset 3px 0 0 ${TEAL}` : 'none',
                      }}
                      onMouseEnter={(event) => {
                        if (!isActive) event.currentTarget.style.background = 'rgba(0,180,216,0.08)'
                      }}
                      onMouseLeave={(event) => {
                        if (!isActive) event.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <Icon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isActive ? TEAL : '#64748b' }}
                        aria-hidden
                      />
                      <span className="truncate">{section.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <div key={activeSection?.id} className="user-guide-pane-in">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: 'rgba(0, 180, 216, 0.16)',
                    boxShadow: '0 0 0 1px rgba(0, 180, 216, 0.35), 0 0 20px rgba(0, 180, 216, 0.12)',
                  }}
                  aria-hidden
                >
                  <ActiveIcon size={20} style={{ color: TEAL }} />
                </span>
                <h3 className="font-display text-base font-semibold text-[#e0e0e0]">
                  {activeSection?.title}
                </h3>
              </div>
              <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[13px] leading-relaxed text-[#cbd5e1]">
                {(activeSection?.bullets ?? []).map((bullet, index) => (
                  <li
                    key={bullet}
                    className="user-guide-bullet-in"
                    style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2a3a4a] px-5 py-3">
          <p className="text-[11px] text-[#64748b]">Press Esc or click outside to close</p>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg px-3.5 py-1.5 text-sm font-semibold text-surface-950 transition-opacity hover:opacity-90"
            style={{ background: TEAL }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
