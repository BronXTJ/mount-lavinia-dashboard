import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Code2,
  Download,
  GitBranch,
  Grid3x3,
  Layers,
  LayoutDashboard,
  MapPin,
  Thermometer,
  Trees,
  TrendingUp,
} from 'lucide-react'
import DeveloperModal from './DeveloperModal.jsx'
import UserGuideModal from './UserGuideModal.jsx'

const TEAL = '#00b4d8'
const VIOLET_SOFT = '#a78bfa'
const VIOLET_TEXT = '#c4b5fd'
const AMBER = '#f59e0b'
const EMERALD = '#34d399'

const FOCUS_SUBS = [
  { id: 'centrality', label: 'Centrality Analysis', icon: Layers },
  { id: 'density', label: 'Density Analysis', icon: Grid3x3 },
  { id: 'maturation', label: 'Urban Maturation', icon: TrendingUp },
]

/**
 * Fixed left sidebar — frosted glass chrome, collapsible 240px / 64px.
 * Active route from React Router; Focus Area sub-section from App state.
 */
export default function Sidebar({
  expanded,
  setExpanded,
  isMobile = false,
  mobileOpen = false,
  onMobileClose,
  activeFocusSubSection,
  setActiveFocusSubSection,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [focusOpen, setFocusOpen] = useState(true)
  const [focusFlyoutOpen, setFocusFlyoutOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [developerOpen, setDeveloperOpen] = useState(false)

  const isFocusArea =
    location.pathname === '/focus-area' || location.pathname.endsWith('/focus-area')

  // Mobile overlay is full-width: use accordion. Desktop collapsed: use flyout.
  const showFocusAccordion = isMobile || expanded
  const showFocusFlyout = !isMobile && !expanded

  const width = isMobile ? 240 : expanded ? 240 : 64
  const isVisible = !isMobile || mobileOpen

  function goFocusSub(id) {
    setActiveFocusSubSection(id)
    navigate('/focus-area')
    setFocusFlyoutOpen(false)
    onMobileClose?.()
  }

  function handleToggleSidebar() {
    if (isMobile) {
      onMobileClose?.()
      return
    }
    setFocusFlyoutOpen(false)
    setExpanded((v) => !v)
  }

  useEffect(() => {
    if (!focusFlyoutOpen) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') setFocusFlyoutOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusFlyoutOpen])

  useEffect(() => {
    setFocusFlyoutOpen(false)
  }, [expanded, isMobile, location.pathname])

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-screen flex-col"
      style={{
        width,
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'width 250ms ease, transform 250ms ease',
        background:
          'linear-gradient(180deg, rgba(0, 180, 216, 0.07) 0%, rgba(14, 22, 34, 0.55) 28%, rgba(10, 16, 26, 0.62) 100%)',
        backdropFilter: 'blur(28px) saturate(140%)',
        WebkitBackdropFilter: 'blur(28px) saturate(140%)',
        borderRight: '1px solid rgba(0, 180, 216, 0.22)',
        boxShadow:
          '8px 0 40px rgba(0, 0, 0, 0.45), inset -1px 0 0 rgba(125, 224, 242, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      }}
    >
      {/* Edge toggle — sits on sidebar right edge */}
      <button
        type="button"
        onClick={handleToggleSidebar}
        aria-label={isMobile ? 'Close sidebar' : expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          position: 'absolute',
          top: '50%',
          right: '-12px',
          transform: 'translateY(-50%)',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#0f1923',
          border: '1px solid rgba(0,180,216,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 60,
          boxShadow: '0 0 14px rgba(0,180,216,0.45)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = '1px solid rgba(0,180,216,0.9)'
          e.currentTarget.style.boxShadow = '0 0 18px rgba(0,180,216,0.65)'
          const icon = e.currentTarget.querySelector('svg')
          if (icon) icon.style.color = '#7de0f2'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = '1px solid rgba(0,180,216,0.55)'
          e.currentTarget.style.boxShadow = '0 0 14px rgba(0,180,216,0.45)'
          const icon = e.currentTarget.querySelector('svg')
          if (icon) icon.style.color = '#00b4d8'
        }}
      >
        {expanded ? (
          <ChevronLeft className="h-4 w-4 text-[#00b4d8]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#00b4d8]" />
        )}
      </button>

      {/* Urban Analytics Dashboard identity */}
      {expanded ? (
        <div
          className="shrink-0"
          style={{
            margin: 12,
            borderRadius: 14,
            border: '1px solid rgba(0,180,216,0.28)',
            background:
              'linear-gradient(145deg, rgba(10,18,28,0.97) 0%, rgba(15,25,35,0.95) 100%)',
            padding: '18px 16px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 0 16px rgba(0,180,216,0.12)',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px)
              `,
              backgroundSize: '18px 18px',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 120,
              height: 120,
              background:
                'radial-gradient(circle, rgba(0,180,216,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              marginBottom: 10,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              className="city-identity-pulse-dot"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#00b4d8',
                boxShadow: '0 0 10px rgba(0,180,216,0.9)',
                animation: 'pulse 2s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
            <span
              className="font-sans uppercase"
              style={{
                fontSize: 9,
                color: '#00b4d8',
                letterSpacing: '0.18em',
                fontWeight: 600,
              }}
            >
              Live
            </span>
          </div>

          <div
            style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              lineHeight: 1.15,
            }}
          >
            <div
              className="font-display"
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                marginBottom: 2,
              }}
            >
              Urban Analytics
            </div>
            <div
              className="font-display uppercase"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#64748b',
                letterSpacing: '0.25em',
              }}
            >
              Dashboard
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 12 16" fill="none" aria-hidden>
              <path
                d="M6 0C3.24 0 1 2.24 1 5C1 8.75 6 14 6 14C6 14 11 8.75 11 5C11 2.24 8.76 0 6 0ZM6 6.5C5.17 6.5 4.5 5.83 4.5 5C4.5 4.17 5.17 3.5 6 3.5C6.83 3.5 7.5 4.17 7.5 5C7.5 5.83 6.83 6.5 6 6.5Z"
                fill="#94a3b8"
              />
            </svg>
            <span
              className="font-sans"
              style={{
                fontSize: 12,
                color: '#94a3b8',
                letterSpacing: '0.05em',
                fontWeight: 500,
              }}
            >
              Mount Lavinia · Sri Lanka
            </span>
          </div>
        </div>
      ) : (
        <div
          title="Mount Lavinia Urban Analytics Dashboard"
          aria-label="Mount Lavinia Urban Analytics Dashboard"
          style={{
            width: 36,
            height: 36,
            margin: '14px auto',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0369a1, #00b4d8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(0,180,216,0.4)',
            cursor: 'default',
            flexShrink: 0,
          }}
        >
          {/* Spatial dashboard mark — grid (spatial data) + pin (place) */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <rect
              x="3"
              y="3"
              width="7"
              height="7"
              rx="1"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity="0.75"
            />
            <rect
              x="14"
              y="3"
              width="7"
              height="7"
              rx="1"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity="0.75"
            />
            <rect
              x="3"
              y="14"
              width="7"
              height="7"
              rx="1"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity="0.75"
            />
            <path
              d="M17.5 22 C17.5 22 13 18 13 15.5 C13 13 15 12 17.5 12 C20 12 22 13 22 15.5 C22 18 17.5 22 17.5 22Z"
              stroke="white"
              strokeWidth="1.5"
              fill="rgba(255,255,255,0.25)"
            />
            <circle cx="17.5" cy="15.5" r="1.75" fill="white" />
          </svg>
        </div>
      )}

      <div
        className="mx-3 shrink-0"
        style={{ borderTop: '1px solid rgba(0,180,216,0.18)' }}
      />

      {/* Navigation — allow overflow when flyout is open so the menu isn't clipped */}
      <nav
        className="min-h-0 flex-1 px-2 py-3"
        style={{
          overflowY: focusFlyoutOpen ? 'visible' : 'auto',
          overflowX: focusFlyoutOpen ? 'visible' : 'hidden',
        }}
      >
        <NavItem
          to="/"
          end
          expanded={expanded}
          icon={LayoutDashboard}
          label="Overview"
          onNavigate={onMobileClose}
        />

        {/* Focus Area — accordion when expanded/mobile; flyout when collapsed desktop */}
        <div
          className="relative mt-0.5"
          onMouseEnter={() => {
            if (showFocusFlyout) setFocusFlyoutOpen(true)
          }}
          onMouseLeave={() => {
            if (showFocusFlyout) setFocusFlyoutOpen(false)
          }}
        >
          <button
            type="button"
            title={!showFocusAccordion ? 'Focus Area' : undefined}
            aria-haspopup={showFocusFlyout ? 'menu' : undefined}
            aria-expanded={showFocusFlyout ? focusFlyoutOpen : showFocusAccordion ? focusOpen : undefined}
            aria-label="Focus Area"
            onClick={() => {
              if (showFocusFlyout) {
                setFocusFlyoutOpen((o) => !o)
                return
              }
              setFocusOpen((o) => !o)
            }}
            className="flex w-full items-center transition-colors"
            style={{
              height: 44,
              padding: showFocusAccordion ? '0 16px' : '0',
              justifyContent: showFocusAccordion ? 'flex-start' : 'center',
              gap: showFocusAccordion ? 12 : 0,
              background: isFocusArea ? 'rgba(0, 180, 216, 0.12)' : 'transparent',
              borderLeft:
                showFocusAccordion && isFocusArea ? `3px solid ${TEAL}` : '3px solid transparent',
              boxShadow: isFocusArea
                ? showFocusAccordion
                  ? 'inset 0 0 24px rgba(0, 180, 216, 0.08)'
                  : 'inset 0 -2px 12px rgba(0, 180, 216, 0.15)'
                : 'none',
              color: isFocusArea ? TEAL : '#cbd5e1',
            }}
            onMouseEnter={(e) => {
              if (!isFocusArea) {
                e.currentTarget.style.background = 'rgba(0,180,216,0.08)'
                e.currentTarget.style.color = '#f1f5f9'
              }
            }}
            onMouseLeave={(e) => {
              if (!isFocusArea) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#cbd5e1'
              }
            }}
          >
            <MapPin
              className="h-5 w-5 shrink-0"
              style={{
                color: isFocusArea ? TEAL : '#94a3b8',
                filter: isFocusArea
                  ? 'drop-shadow(0 0 6px rgba(0,180,216,0.6))'
                  : 'none',
              }}
            />
            {showFocusAccordion && (
              <>
                <span className="flex-1 truncate text-left font-sans text-[13px]">
                  Focus Area
                </span>
                {focusOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                )}
              </>
            )}
          </button>

          {/* Collapsed desktop flyout */}
          {showFocusFlyout && focusFlyoutOpen && (
            <div
              role="menu"
              aria-label="Focus Area analyses"
              className="absolute top-0 z-[70]"
              style={{
                left: '100%',
                paddingLeft: 8,
                minWidth: 208,
              }}
            >
              <div
                className="space-y-0.5 overflow-hidden rounded-xl p-1.5"
                style={{
                  background: 'rgba(15, 25, 38, 0.97)',
                  border: '1px solid rgba(167, 139, 250, 0.28)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow:
                    '0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(167,139,250,0.12)',
                }}
              >
              <p
                className="px-2.5 pb-1 pt-1 font-sans text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: VIOLET_TEXT }}
              >
                Focus Area
              </p>
              {FOCUS_SUBS.map((sub) => {
                const Icon = sub.icon
                const active = isFocusArea && activeFocusSubSection === sub.id
                return (
                  <button
                    key={sub.id}
                    type="button"
                    role="menuitem"
                    onClick={() => goFocusSub(sub.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg transition-colors"
                    style={{
                      height: 38,
                      paddingLeft: 12,
                      paddingRight: 12,
                      background: active ? 'rgba(167, 139, 250, 0.16)' : 'transparent',
                      borderLeft: active
                        ? `3px solid ${VIOLET_SOFT}`
                        : '3px solid transparent',
                      boxShadow: active
                        ? 'inset 0 0 20px rgba(167,139,250,0.12)'
                        : 'none',
                      color: active ? '#ddd6fe' : VIOLET_TEXT,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(167,139,250,0.12)'
                        e.currentTarget.style.color = '#ede9fe'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = VIOLET_TEXT
                      }
                    }}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{
                        color: VIOLET_SOFT,
                        filter: active
                          ? 'drop-shadow(0 0 6px rgba(167,139,250,0.55))'
                          : 'none',
                        opacity: active ? 1 : 0.85,
                      }}
                    />
                    <span className="truncate font-sans text-xs">{sub.label}</span>
                  </button>
                )
              })}
              </div>
            </div>
          )}

          {/* Expanded / mobile accordion pocket */}
          {showFocusAccordion && focusOpen && (
            <div
              className="mx-1 mt-1 space-y-0.5 overflow-hidden rounded-xl p-1"
              style={{
                background: 'rgba(167, 139, 250, 0.08)',
                border: '1px solid rgba(167, 139, 250, 0.18)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              {FOCUS_SUBS.map((sub) => {
                const Icon = sub.icon
                const active = isFocusArea && activeFocusSubSection === sub.id
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => goFocusSub(sub.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg transition-colors"
                    style={{
                      height: 38,
                      paddingLeft: 12,
                      paddingRight: 10,
                      background: active ? 'rgba(167, 139, 250, 0.16)' : 'transparent',
                      borderLeft: active
                        ? `3px solid ${VIOLET_SOFT}`
                        : '3px solid transparent',
                      boxShadow: active
                        ? 'inset 0 0 20px rgba(167,139,250,0.12)'
                        : 'none',
                      color: active ? '#ddd6fe' : VIOLET_TEXT,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(167,139,250,0.12)'
                        e.currentTarget.style.color = '#ede9fe'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = VIOLET_TEXT
                      }
                    }}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{
                        color: VIOLET_SOFT,
                        filter: active
                          ? 'drop-shadow(0 0 6px rgba(167,139,250,0.55))'
                          : 'none',
                        opacity: active ? 1 : 0.85,
                      }}
                    />
                    <span className="truncate font-sans text-xs">{sub.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <NavItem
          to="/connectivity"
          expanded={expanded}
          icon={Car}
          label="Movement & Behaviour"
          onNavigate={onMobileClose}
        />
        <NavItem
          to="/land-cover"
          expanded={expanded}
          icon={Trees}
          label="Land Cover Change"
          onNavigate={onMobileClose}
        />
        <NavItem
          to="/environmental"
          expanded={expanded}
          icon={Thermometer}
          label="Environmental Analysis"
          onNavigate={onMobileClose}
        />
        <NavItem
          to="/synthesis"
          expanded={expanded}
          icon={GitBranch}
          label="Synthesis"
          iconColor={AMBER}
          accentColor={AMBER}
          onNavigate={onMobileClose}
        />
        <NavItem
          to="/problems"
          expanded={expanded}
          icon={AlertTriangle}
          label="Issues & Potentials"
          onNavigate={onMobileClose}
        />

        <div
          className="my-2 mx-1"
          style={{ borderTop: '1px solid rgba(0,180,216,0.15)' }}
        />

        <NavItem
          to="/export-maps"
          expanded={expanded}
          icon={Download}
          label="Export Maps"
          iconColor={EMERALD}
          accentColor={EMERALD}
          onNavigate={onMobileClose}
        />
      </nav>

      <div className="shrink-0 px-2 pb-4 pt-2">
        <div
          className="mb-2 mx-1"
          style={{ borderTop: '1px solid rgba(0,180,216,0.15)' }}
        />
        <button
          type="button"
          title={!expanded ? 'User Guide' : undefined}
          onClick={() => setGuideOpen(true)}
          aria-label="Open user guide"
          className="flex w-full items-center transition-colors"
          style={{
            height: 40,
            padding: expanded ? '0 12px' : '0',
            justifyContent: expanded ? 'flex-start' : 'center',
            gap: expanded ? 10 : 0,
            color: guideOpen ? TEAL : '#7dd3fc',
            background: guideOpen ? 'rgba(0,180,216,0.12)' : 'transparent',
            borderRadius: 8,
          }}
          onMouseEnter={(e) => {
            if (!guideOpen) {
              e.currentTarget.style.background = 'rgba(0,180,216,0.1)'
              e.currentTarget.style.color = '#e0f2fe'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = guideOpen
              ? 'rgba(0,180,216,0.12)'
              : 'transparent'
            e.currentTarget.style.color = guideOpen ? TEAL : '#7dd3fc'
          }}
        >
          <span
            className="user-guide-sidebar-pulse relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'rgba(0, 180, 216, 0.14)',
              border: '1px solid rgba(0, 180, 216, 0.35)',
              boxShadow: guideOpen ? 'none' : '0 0 12px rgba(0, 180, 216, 0.25)',
            }}
            aria-hidden
          >
            {!guideOpen && (
              <span
                className="typology-info-icon-pulse absolute inset-0 rounded-full border-2 border-[#00b4d8]/70"
                aria-hidden="true"
              />
            )}
            <CircleHelp
              className={`h-4 w-4 relative ${guideOpen ? '' : 'typology-info-icon-breathe'}`}
              style={{ color: TEAL }}
            />
          </span>
          {expanded && (
            <span className="truncate font-sans text-[13px] font-medium">User Guide</span>
          )}
        </button>

        <button
          type="button"
          title={!expanded ? 'Developer' : undefined}
          onClick={() => setDeveloperOpen(true)}
          aria-label="Open developer"
          className="mt-1 flex w-full items-center transition-colors"
          style={{
            height: 40,
            padding: expanded ? '0 12px' : '0',
            justifyContent: expanded ? 'flex-start' : 'center',
            gap: expanded ? 10 : 0,
            color: developerOpen ? '#34d399' : '#94a3b8',
            background: developerOpen ? 'rgba(52,211,153,0.1)' : 'transparent',
            borderRadius: 8,
          }}
          onMouseEnter={(e) => {
            if (!developerOpen) {
              e.currentTarget.style.background = 'rgba(52,211,153,0.08)'
              e.currentTarget.style.color = '#a7f3d0'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = developerOpen
              ? 'rgba(52,211,153,0.1)'
              : 'transparent'
            e.currentTarget.style.color = developerOpen ? '#34d399' : '#94a3b8'
          }}
        >
          <span
            className="dev-sidebar-icon-glitch relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.28)',
            }}
            aria-hidden
          >
            <Code2 className="h-4 w-4 relative" style={{ color: '#34d399' }} />
          </span>
          {expanded && (
            <span className="truncate font-sans text-[13px] font-medium">Developer</span>
          )}
        </button>

      </div>

      <UserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <DeveloperModal open={developerOpen} onClose={() => setDeveloperOpen(false)} />
    </aside>
  )
}

/** Single top-level nav link with glass-readable contrast. */
function NavItem({
  to,
  end,
  expanded,
  icon: Icon,
  label,
  iconColor,
  accentColor = TEAL,
  onNavigate,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={!expanded ? label : undefined}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        [
          'mt-0.5 flex items-center transition-colors',
          !isActive && 'hover:bg-[rgba(0,180,216,0.08)] hover:text-[#f1f5f9]',
        ].join(' ')
      }
      style={({ isActive }) => ({
        height: 44,
        padding: expanded ? '0 16px' : '0',
        justifyContent: expanded ? 'flex-start' : 'center',
        gap: expanded ? 12 : 0,
        background: isActive ? 'rgba(0, 180, 216, 0.12)' : 'transparent',
        borderLeft:
          expanded && isActive ? `3px solid ${accentColor}` : '3px solid transparent',
        boxShadow: isActive
          ? expanded
            ? 'inset 0 0 24px rgba(0, 180, 216, 0.08)'
            : 'inset 0 -2px 12px rgba(0, 180, 216, 0.15)'
          : 'none',
        color: isActive ? accentColor : '#cbd5e1',
        textDecoration: 'none',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon
            className="h-5 w-5 shrink-0"
            style={{
              color: isActive ? accentColor : iconColor || '#94a3b8',
              filter: isActive
                ? `drop-shadow(0 0 6px ${accentColor}99)`
                : 'none',
            }}
          />
          {expanded && (
            <span
              className="truncate font-sans text-[13px]"
              style={{ color: isActive ? '#f8fafc' : undefined }}
            >
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
