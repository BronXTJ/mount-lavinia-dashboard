import { lazy, Suspense } from 'react'
import TabSuspenseFallback from '../components/TabSuspenseFallback.jsx'

const CentralityAnalysisView = lazy(() => import('../components/focusArea/CentralityAnalysisView.jsx'))
const DensityAnalysisView = lazy(() => import('../components/focusArea/DensityAnalysisView.jsx'))
const NetworkFormView = lazy(() => import('../components/focusArea/NetworkFormView.jsx'))
const UrbanMaturationView = lazy(() => import('../components/focusArea/UrbanMaturationView.jsx'))
const WalkAccessibilityView = lazy(() => import('../components/focusArea/WalkAccessibilityView.jsx'))

const VIEWS = {
  centrality: CentralityAnalysisView,
  density: DensityAnalysisView,
  maturation: UrbanMaturationView,
  'walk-access': WalkAccessibilityView,
  'network-form': NetworkFormView,
}

/** Focus Area tab — section controlled by sidebar only. */
export default function Tab2_FocusArea({ activeSection = 'centrality' }) {
  const section = VIEWS[activeSection] ? activeSection : 'centrality'
  const ActiveView = VIEWS[section] ?? CentralityAnalysisView
  const isCentrality = section === 'centrality'

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <Suspense fallback={<TabSuspenseFallback />}>
        {isCentrality ? (
          <div className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
            <ActiveView />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[30%_40%_30%] lg:overflow-hidden">
            <ActiveView />
          </div>
        )}
      </Suspense>
    </div>
  )
}
