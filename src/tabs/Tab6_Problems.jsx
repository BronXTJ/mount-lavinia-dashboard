import { useState } from 'react'
import { Grid2x2, Hexagon, Network, Table2 } from 'lucide-react'
import MetricInfoButton from '../components/focusArea/MetricInfoButton.jsx'
import NetworkOverview from '../components/issues/NetworkOverview.jsx'
import PestelFramework from '../components/issues/PestelFramework.jsx'
import SfaAssessment from '../components/issues/SfaAssessment.jsx'
import SwotAnalysis from '../components/issues/SwotAnalysis.jsx'
import { ISSUES_INFO } from '../components/issues/issuesInfoContent.js'

const SUB_SECTIONS = [
  {
    id: 'network',
    label: 'Network Overview',
    icon: Network,
    hint: 'Force-directed map of root causes, issues, potentials, and stakeholders',
    info: ISSUES_INFO.network,
  },
  {
    id: 'swot',
    label: 'SWOT Analysis',
    icon: Grid2x2,
    hint: 'Internal strengths and weaknesses against external opportunities and threats',
    info: ISSUES_INFO.swot,
  },
  {
    id: 'pestel',
    label: 'PESTEL Framework',
    icon: Hexagon,
    hint: 'Macro context across political, economic, social, technological, environmental, and legal lenses',
    info: ISSUES_INFO.pestel,
  },
  {
    id: 'sfa',
    label: 'SFA Assessment',
    icon: Table2,
    hint: 'Suitability–feasibility–acceptability scoring to prioritise planning responses',
    info: ISSUES_INFO.sfa,
  },
]

/** Tab 6 — Issues & Potentials (network, SWOT, PESTEL, SFA). */
export default function Tab6_Problems() {
  const [active, setActive] = useState('network')
  const activeSection = SUB_SECTIONS.find((s) => s.id === active) ?? SUB_SECTIONS[0]

  return (
    <section className="flex min-h-[calc(100vh-2rem)] flex-col pb-4">
      <header className="mb-4 flex gap-3">
        <div className="mt-1 w-1 shrink-0 rounded-full bg-[#be123c]" aria-hidden />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[20px] font-bold tracking-tight text-surface-50">
              Issues & Potentials — Mount Lavinia
            </h1>
            <MetricInfoButton
              title={ISSUES_INFO.page.title}
              points={ISSUES_INFO.page.points}
              ariaLabel={ISSUES_INFO.page.ariaLabel}
            />
          </div>
          <p className="mt-0.5 text-sm text-surface-200">
            Spatial and socio-economic analysis of urban challenges and opportunities
          </p>
        </div>
      </header>

      <div
        className="mb-1.5 inline-flex flex-wrap gap-1 rounded-xl border border-surface-700 bg-surface-800/80 p-1 backdrop-blur-[8px]"
        role="tablist"
        aria-label="Issues & Potentials sections"
      >
        {SUB_SECTIONS.map((s) => {
          const isActive = active === s.id
          const Icon = s.icon
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(s.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-[#be123c] text-white shadow-[0_0_20px_rgba(190,18,60,0.35)]'
                  : 'text-[#94a3b8] hover:bg-surface-900 hover:text-surface-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {s.label}
            </button>
          )
        })}
      </div>
      <div className="mb-4 flex items-center gap-2">
        <p className="text-xs text-surface-300">{activeSection.hint}</p>
        <MetricInfoButton
          title={activeSection.info.title}
          points={activeSection.info.points}
          ariaLabel={activeSection.info.ariaLabel}
        />
      </div>

      <div
        key={active}
        className="flex min-h-[calc(100vh-11rem)] flex-1 flex-col"
        style={{ animation: 'issuesFadeUp 0.35s ease both' }}
      >
        {active === 'network' && <NetworkOverview />}
        {active === 'swot' && <SwotAnalysis />}
        {active === 'pestel' && <PestelFramework />}
        {active === 'sfa' && <SfaAssessment />}
      </div>
    </section>
  )
}
