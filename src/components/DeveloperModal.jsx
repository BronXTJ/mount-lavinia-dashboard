import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Heart, Mail, X } from 'lucide-react'
import { DEVELOPER_CREDIT } from '../constants/developerCredit.js'
import DeveloperWorldBackground from './DeveloperWorldBackground.jsx'

const TEAL = '#00b4d8'
const TERMINAL_GREEN = '#34d399'

function FacebookIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function LinkedInIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

/**
 * Immersive coding-world developer credit modal.
 */
export default function DeveloperModal({ open, onClose }) {
  const [closing, setClosing] = useState(false)
  const titleId = useId()
  const closeBtnRef = useRef(null)

  const linkedinHref = DEVELOPER_CREDIT.linkedin.startsWith('http')
    ? DEVELOPER_CREDIT.linkedin
    : `https://${DEVELOPER_CREDIT.linkedin}`

  const links = [
    { id: 'email', label: 'Email', href: `mailto:${DEVELOPER_CREDIT.email}`, external: false },
    { id: 'facebook', label: 'Facebook', href: DEVELOPER_CREDIT.facebook, external: true },
    { id: 'linkedin', label: 'LinkedIn', href: linkedinHref, external: true },
  ]

  function requestClose() {
    if (closing) return
    setClosing(true)
  }

  useEffect(() => {
    if (!open) return
    setClosing(false)
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
      style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
      onClick={requestClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex h-[min(90vh,680px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#1e3a4a] shadow-[0_20px_60px_rgba(0,0,0,0.7)] ${
          closing ? 'typology-info-modal-exit' : 'typology-info-modal-enter'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <DeveloperWorldBackground />

        <button
          ref={closeBtnRef}
          type="button"
          onClick={requestClose}
          aria-label="Close developer"
          className="pointer-events-auto absolute right-3 top-3 z-20 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-white/5 hover:text-[#e0e0e0]"
        >
          <X size={20} strokeWidth={2.25} />
        </button>

        <div className="pointer-events-none relative z-10 flex min-h-0 flex-1 items-center justify-center p-5 sm:p-8">
          <div className="dev-world-terminal pointer-events-auto w-full max-w-md overflow-hidden rounded-xl border border-[#00b4d8]/35 shadow-[0_0_40px_rgba(0,180,216,0.15)]">
            <div className="flex items-center gap-2 border-b border-[#1e3a4a] bg-[#0a1219]/95 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/80" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#eab308]/80" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]/80" aria-hidden />
              <p className="ml-2 flex-1 truncate font-mono text-[11px] text-[#7dd3fc]">
                thanuja@ml-dashboard ~
                <span className="dev-world-cursor ml-0.5 inline-block h-3 w-1.5 align-middle bg-[#34d399]" />
              </p>
            </div>

            <div
              className="px-5 py-6 text-center"
              style={{
                background: 'rgba(8, 14, 22, 0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#64748b]">
                WHO DA HELL AM I
              </p>
              <h2
                id={titleId}
                className="mt-2 font-display text-xl font-bold text-[#f8fafc] sm:text-2xl"
              >
                {DEVELOPER_CREDIT.name}
              </h2>
              <p className="mt-1 text-sm font-medium" style={{ color: TERMINAL_GREEN }}>
                {DEVELOPER_CREDIT.role}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {['ONLINE', 'BUILD OK', '24/7'].map((chip) => (
                  <span
                    key={chip}
                    className="rounded border border-[#00b4d8]/30 bg-[#00b4d8]/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[#7dd3fc]"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-[12px] leading-relaxed text-[#94a3b8]">
                Made with Love
                <Heart
                  size={14}
                  fill="#fb7185"
                  stroke="#fb7185"
                  aria-hidden
                />
              </p>

              <div className="mt-5 flex items-center justify-center gap-2.5">
                {links.map(({ id, label, href, external }) => (
                  <a
                    key={id}
                    href={href}
                    aria-label={label}
                    title={label}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5"
                    style={{
                      background: 'rgba(0, 180, 216, 0.14)',
                      border: '1px solid rgba(0, 180, 216, 0.4)',
                      color: TEAL,
                    }}
                  >
                    {id === 'email' ? (
                      <Mail size={18} strokeWidth={2} />
                    ) : id === 'facebook' ? (
                      <FacebookIcon />
                    ) : (
                      <LinkedInIcon />
                    )}
                  </a>
                ))}
              </div>

              <p className="mt-4 truncate font-mono text-[11px] text-[#64748b]">
                {DEVELOPER_CREDIT.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
