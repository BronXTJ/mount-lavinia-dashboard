import CentralityAnalysisView from '../components/focusArea/CentralityAnalysisView.jsx'
import DensityAnalysisView from '../components/focusArea/DensityAnalysisView.jsx'
import NetworkFormView from '../components/focusArea/NetworkFormView.jsx'
import UrbanMaturationView from '../components/focusArea/UrbanMaturationView.jsx'

const VIEWS = {
  centrality: CentralityAnalysisView,
  density: DensityAnalysisView,
  maturation: UrbanMaturationView,
  'network-form': NetworkFormView,
}

/** Focus Area tab — section controlled by sidebar only. */
export default function Tab2_FocusArea({ activeSection = 'centrality' }) {
  const section = VIEWS[activeSection] ? activeSection : 'centrality'
  const ActiveView = VIEWS[section] ?? CentralityAnalysisView

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[30%_40%_30%] lg:overflow-hidden">
        <ActiveView />
      </div>
    </div>
  )
}
