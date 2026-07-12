import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Tab1_Overview from './tabs/Tab1_Overview.jsx'
import Tab2_FocusArea from './tabs/Tab2_FocusArea.jsx'
import Tab3_LandUse from './tabs/Tab3_LandUse.jsx'
import Tab4_Connectivity from './tabs/Tab4_Connectivity.jsx'
import Tab5_Environmental from './tabs/Tab5_Environmental.jsx'
import Tab6_Problems from './tabs/Tab6_Problems.jsx'
import Tab7_Synthesis from './tabs/Tab7_Synthesis.jsx'
import ExportMaps from './tabs/ExportMaps.jsx'

const FOCUS_SUB_IDS = new Set(['centrality', 'density', 'maturation'])

export default function App() {
  const location = useLocation()
  const { pathname, search } = location
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [activeFocusSubSection, setActiveFocusSubSection] = useState('centrality')

  useEffect(() => {
    const isFocus = pathname === '/focus-area' || pathname.endsWith('/focus-area')
    if (!isFocus) return
    const sub = new URLSearchParams(search).get('sub')
    if (sub && FOCUS_SUB_IDS.has(sub)) {
      setActiveFocusSubSection(sub)
    }
  }, [pathname, search])

  const isFocusArea = pathname === '/focus-area' || pathname.endsWith('/focus-area')
  const isConnectivity = pathname === '/connectivity' || pathname.endsWith('/connectivity')
  const isEnvironmental = pathname === '/environmental' || pathname.endsWith('/environmental')
  const isIssues = pathname === '/problems' || pathname.endsWith('/problems')
  const isSynthesis = pathname === '/synthesis' || pathname.endsWith('/synthesis')
  const isFullBleed = isFocusArea || isConnectivity || isEnvironmental

  const sidebarWidth = sidebarExpanded ? 240 : 64

  return (
    <div className="min-h-screen bg-surface-900 font-sans text-surface-50">
      <Sidebar
        expanded={sidebarExpanded}
        setExpanded={setSidebarExpanded}
        activeFocusSubSection={activeFocusSubSection}
        setActiveFocusSubSection={setActiveFocusSubSection}
      />

      <main
        style={{
          marginLeft: sidebarWidth,
          width: `calc(100% - ${sidebarWidth}px)`,
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
