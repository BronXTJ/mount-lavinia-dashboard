import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import MapFullscreenShell, { FullscreenEnlargeButton } from '../MapFullscreenShell.jsx'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import FindingDetailPanel from './FindingDetailPanel.jsx'
import FindingsForceGraph from './FindingsForceGraph.jsx'
import StorySpine from './StorySpine.jsx'
import { DOMAIN_META, EDGE_TYPE_META } from './findingsData.js'
import { SYNTHESIS_INFO } from './synthesisInfoContent.js'

/**
 * Synthesis page body — key argument → relationships | detail.
 * Selection is owned by Tab7 (header All findings + URL).
 */
export default function SynthesisView({ onFocusAreaSub, selectedId, onSelectFinding }) {
  const [resetToken, setResetToken] = useState(0)
  const [activeDomains, setActiveDomains] = useState(() => new Set())

  function toggleDomain(key) {
    if (key == null) {
      setActiveDomains(new Set())
      return
    }
    setActiveDomains((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <StorySpine selectedId={selectedId} onSelect={onSelectFinding} />

      <div className="flex min-h-[420px] flex-col gap-3 lg:h-[calc(100vh-14rem)] lg:min-h-[480px] lg:flex-row lg:gap-4">
        <MapFullscreenShell
          className="flex min-h-[320px] flex-[58] flex-col lg:min-h-0"
          innerClassName="flex flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-800 shadow-card"
          trackDocumentFullscreen={false}
          showFloatingEnlarge={false}
          enlargeLabel="Enlarge relationships graph"
          closeLabel="Close relationships graph"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-700 px-3 py-2.5">
            <h2 className="font-display text-sm font-semibold text-surface-50">Relationships</h2>
            <MetricInfoButton
              title={SYNTHESIS_INFO.graph.title}
              points={SYNTHESIS_INFO.graph.points}
              ariaLabel={SYNTHESIS_INFO.graph.ariaLabel}
            />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-3">
                {Object.entries(EDGE_TYPE_META).map(([k, meta]) => (
                  <span key={k} className="inline-flex items-center gap-1.5 text-xs text-surface-200">
                    <span className="h-1.5 w-5 rounded" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                ))}
              </div>
              <FullscreenEnlargeButton
                label="Enlarge relationships graph"
                title="Enlarge relationships graph"
              />
              <button
                type="button"
                onClick={() => setResetToken((t) => t + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs font-medium text-surface-100 transition hover:border-[#f59e0b]/40"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reset view
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-surface-700 px-3 py-2">
            {Object.entries(DOMAIN_META).map(([key, meta]) => {
              const on = activeDomains.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDomain(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    on
                      ? 'border-transparent text-surface-950'
                      : 'border-surface-600 bg-transparent text-surface-300 hover:border-surface-400'
                  }`}
                  style={on ? { background: meta.color, borderColor: meta.color } : undefined}
                  aria-pressed={on}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: on ? '#0f172a' : meta.color }}
                    aria-hidden
                  />
                  {meta.label}
                </button>
              )
            })}
            {activeDomains.size > 0 && (
              <button
                type="button"
                onClick={() => toggleDomain(null)}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium text-surface-400 underline-offset-2 hover:text-surface-200 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1">
            <FindingsForceGraph
              selectedId={selectedId}
              onSelect={onSelectFinding}
              resetToken={resetToken}
              activeDomains={activeDomains}
            />
          </div>
        </MapFullscreenShell>

        <div className="flex min-h-[360px] flex-[42] flex-col lg:min-h-0">
          <FindingDetailPanel
            selectedId={selectedId}
            onSelectFinding={onSelectFinding}
            onFocusAreaSub={onFocusAreaSub}
          />
        </div>
      </div>
    </div>
  )
}
