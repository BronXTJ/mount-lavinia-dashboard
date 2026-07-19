import EnvironmentalAnalysisView from '../components/environmental/EnvironmentalAnalysisView.jsx'

/** Environmental Analysis tab — UTCI / UHI / SVF full-bleed layout. */
export default function Tab5_Environmental() {
  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[30%_40%_30%] lg:overflow-hidden">
        <EnvironmentalAnalysisView />
      </div>
    </div>
  )
}
