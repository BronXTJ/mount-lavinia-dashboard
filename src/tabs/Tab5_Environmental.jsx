import EnvironmentalAnalysisView from '../components/environmental/EnvironmentalAnalysisView.jsx'

/** Environmental Analysis tab — UTCI / UHI / SVF full-bleed layout. */
export default function Tab5_Environmental() {
  return (
    <div className="flex h-screen flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-[30%_40%_30%]">
        <EnvironmentalAnalysisView />
      </div>
    </div>
  )
}
