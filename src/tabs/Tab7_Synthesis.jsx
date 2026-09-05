import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MetricInfoButton from '../components/focusArea/MetricInfoButton.jsx'
import FindingsCatalogPopover from '../components/synthesis/FindingsCatalogPopover.jsx'
import SynthesisView from '../components/synthesis/SynthesisView.jsx'
import {
  SYNTHESIS_ACCENT,
  getFindingById,
} from '../components/synthesis/findingsData.js'
import { SYNTHESIS_INFO } from '../components/synthesis/synthesisInfoContent.js'

const DEFAULT_FINDING = 'F14'

/**
 * Tab 7 — Synthesis / Integrated Findings.
 * Bridges spatial evidence to Issues & Potentials for panel evaluation.
 */
export default function Tab7_Synthesis({ onFocusAreaSub }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const paramF = searchParams.get('f')
  const initial = getFindingById(paramF)?.id ?? DEFAULT_FINDING

  const [selectedId, setSelectedId] = useState(initial)

  useEffect(() => {
    const id = searchParams.get('f')
    if (id && getFindingById(id)) {
      setSelectedId(id)
    }
  }, [searchParams])

  const selectFinding = useCallback(
    (id) => {
      setSelectedId(id)
      if (id && getFindingById(id)) {
        setSearchParams({ f: id }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    },
    [setSearchParams],
  )

  return (
    <section className="flex min-h-[calc(100vh-2rem)] flex-col pb-4">
      <header className="mb-4 flex gap-3">
        <div
          className="mt-1 w-1 shrink-0 rounded-full"
          style={{ background: SYNTHESIS_ACCENT }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[20px] font-bold tracking-tight text-surface-50">
              Synthesis — Integrated Findings
            </h1>
            <MetricInfoButton
              title={SYNTHESIS_INFO.page.title}
              points={SYNTHESIS_INFO.page.points}
              ariaLabel={SYNTHESIS_INFO.page.ariaLabel}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onFocusAreaSub?.('centrality')
                navigate('/focus-area?sub=centrality')
              }}
              className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-surface-200 transition hover:border-[#a78bfa]/50"
            >
              Centrality
            </button>
            <button
              type="button"
              onClick={() => {
                onFocusAreaSub?.('density')
                navigate('/focus-area?sub=density')
              }}
              className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-surface-200 transition hover:border-[#22d3ee]/50"
            >
              Density
            </button>
            <button
              type="button"
              onClick={() => {
                onFocusAreaSub?.('maturation')
                navigate('/focus-area?sub=maturation')
              }}
              className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-surface-200 transition hover:border-[#b45309]/50"
            >
              Urban Maturation
            </button>
            <button
              type="button"
              onClick={() => {
                onFocusAreaSub?.('walk-access')
                navigate('/focus-area?sub=walk-access')
              }}
              className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-surface-200 transition hover:border-[#0d9488]/50"
            >
              Walk Accessibility
            </button>
            <button
              type="button"
              onClick={() => {
                onFocusAreaSub?.('network-form')
                navigate('/focus-area?sub=network-form')
              }}
              className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-surface-200 transition hover:border-[#f59e0b]/50"
            >
              Network Form
            </button>
            <button
              type="button"
              onClick={() => navigate('/connectivity')}
              className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-surface-200 transition hover:border-[#38bdf8]/50"
            >
              Movement
            </button>
            <button
              type="button"
              onClick={() => navigate('/land-cover')}
              className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-surface-200 transition hover:border-[#1a9850]/50"
            >
              Land Cover
            </button>
            <button
              type="button"
              onClick={() => navigate('/environmental')}
              className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-surface-200 transition hover:border-[#f46d43]/50"
            >
              Environmental
            </button>
            <button
              type="button"
              onClick={() => navigate('/problems')}
              className="rounded-lg border border-[#be123c]/40 bg-[#be123c]/10 px-2.5 py-1 text-[11px] font-medium text-[#fda4af] transition hover:bg-[#be123c]/20"
            >
              Issues & Potentials
            </button>
            <FindingsCatalogPopover selectedId={selectedId} onSelect={selectFinding} />
          </div>
        </div>
      </header>

      <SynthesisView
        onFocusAreaSub={onFocusAreaSub}
        selectedId={selectedId}
        onSelectFinding={selectFinding}
      />
    </section>
  )
}
