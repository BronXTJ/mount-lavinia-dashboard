import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import useMediaQuery from './hooks/useMediaQuery.js'
import Tab1_Overview from './tabs/Tab1_Overview.jsx'
import Tab2_FocusArea from './tabs/Tab2_FocusArea.jsx'
import Tab3_LandUse from './tabs/Tab3_LandUse.jsx'
import Tab4_Connectivity from './tabs/Tab4_Connectivity.jsx'
import TabLandCover from './tabs/TabLandCover.jsx'
import Tab5_Environmental from './tabs/Tab5_Environmental.jsx'
import Tab6_Problems from './tabs/Tab6_Problems.jsx'
import Tab7_Synthesis from './tabs/Tab7_Synthesis.jsx'
import ExportMaps from './tabs/ExportMaps.jsx'

const FOCUS_SUB_IDS = new Set(['centrality', 'density', 'maturation', 'network-form'])

export default function App() {
  const location = useLocation()
  const { pathname, search } = location
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activeFocusSubSection, setActiveFocusSubSection] = useState('centrality')

  useEffect(() => {
    const isFocus = pathname === '/focus-area' || pathname.endsWith('/focus-area')
    if (!isFocus) return
    const sub = new URLSearchParams(search).get('sub')
    if (sub && FOCUS_SUB_IDS.has(sub)) {
      setActiveFocusSubSection(sub)
    }
  }, [pathname, search])

  useEffect(() => {
    if (!isDesktop) setMobileSidebarOpen(false)
  }, [pathname, isDesktop])

  const isFocusArea = pathname === '/focus-area' || pathname.endsWith('/focus-area')
  const isConnectivity = pathname === '/connectivity' || pathname.endsWith('/connectivity')
  const isLandCover = pathname === '/land-cover' || pathname.endsWith('/land-cover')
  const isEnvironmental = pathname === '/environmental' || pathname.endsWith('/environmental')
  const isIssues = pathname === '/problems' || pathname.endsWith('/problems')
  const isSynthesis = pathname === '/synthesis' || pathname.endsWith('/synthesis')
  const isFullBleed = isFocusArea || isConnectivity || isLandCover || isEnvironmental

  const sidebarWidth = isDesktop ? (sidebarExpanded ? 240 : 64) : 0

  return (
    <div className="min-h-screen bg-surface-900 font-sans text-surface-50">
      {!isDesktop && mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {!isDesktop && !mobileSidebarOpen && (
        <button
          type="button"
          className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(0,180,216,0.55)] bg-[#0f1923] text-[#00b4d8] shadow-[0_0_14px_rgba(0,180,216,0.45)]"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      )}

      <Sidebar
        expanded={isDesktop ? sidebarExpanded : true}
        setExpanded={setSidebarExpanded}
        isMobile={!isDesktop}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        activeFocusSubSection={activeFocusSubSection}
        setActiveFocusSubSection={setActiveFocusSubSection}
      />

      <main
        style={{
          marginLeft: isDesktop ? sidebarWidth : 0,
          width: isDesktop ? `calc(100% - ${sidebarWidth}px)` : '100%',
          transition: 'margin-left 250ms ease, width 250ms ease',
        }}
        className={
          isFullBleed
            ? 'min-h-screen'
            : isIssues || isSynthesis
              ? 'min-h-screen px-4 py-4 sm:px-6'
              : 'mx-auto min-h-screen max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8'
        }
      >
        <Routes>
          <Route path="/" element={<Tab1_Overview />} />
          <Route
            path="/focus-area"
            element={<Tab2_FocusArea activeSection={activeFocusSubSection} />}
          />
          <Route path="/land-use" element={<Tab3_LandUse />} />
          <Route path="/connectivity" element={<Tab4_Connectivity />} />
          <Route path="/land-cover" element={<TabLandCover />} />
          <Route path="/environmental" element={<Tab5_Environmental />} />
          <Route
            path="/synthesis"
            element={
              <Tab7_Synthesis
                onFocusAreaSub={(id) => {
                  if (FOCUS_SUB_IDS.has(id)) setActiveFocusSubSection(id)
                }}
              />
            }
          />
          <Route path="/problems" element={<Tab6_Problems />} />
          <Route path="/export-maps" element={<ExportMaps />} />
        </Routes>
      </main>
    </div>
  )
}
