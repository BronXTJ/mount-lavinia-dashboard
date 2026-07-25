import LandCoverAnalysisView from '../components/landCover/LandCoverAnalysisView.jsx'

/** Land Cover Change tab — Landsat maps + GN detail, full-bleed 30/40/30. */
export default function TabLandCover() {
  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[30%_40%_30%] lg:overflow-hidden">
        <LandCoverAnalysisView />
      </div>
    </div>
  )
}
