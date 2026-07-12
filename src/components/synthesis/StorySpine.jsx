import { ChevronLeft, ChevronRight } from 'lucide-react'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import { SYNTHESIS_ACCENT, storySpine } from './findingsData.js'
import { SYNTHESIS_INFO } from './synthesisInfoContent.js'

/** Horizontal 6-step key argument path. */
export default function StorySpine({ selectedId, onSelect }) {
  const spineIndex = storySpine.findIndex((s) => s.findingId === selectedId)
  const activeIndex = spineIndex >= 0 ? spineIndex : -1
  const canPrev = activeIndex > 0
  const canNext = activeIndex >= 0 && activeIndex < storySpine.length - 1

  function goPrev() {
    if (!canPrev) return
    onSelect(storySpine[activeIndex - 1].findingId)
  }

  function goNext() {
    if (!canNext) return
    onSelect(storySpine[activeIndex + 1].findingId)
  }

  return (
    <section className="rounded-xl border border-surface-700 bg-surface-800/80 p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-sm font-semibold text-surface-50">Key Argument</h2>
        <MetricInfoButton
          title={SYNTHESIS_INFO.spine.title}
          points={SYNTHESIS_INFO.spine.points}
          ariaLabel={SYNTHESIS_INFO.spine.ariaLabel}
        />
        <div className="ml-auto flex items-center gap-1.5">
          {activeIndex >= 0 && (
            <span className="mr-1 text-[11px] tabular-nums text-surface-400">
              {activeIndex + 1} / {storySpine.length}
            </span>
          )}
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className="inline-flex items-center gap-1 rounded-lg border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-xs font-medium text-surface-100 transition hover:border-surface-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="inline-flex items-center gap-1 rounded-lg border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-xs font-medium text-surface-100 transition hover:border-[#f59e0b]/40 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next step"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {storySpine.map((step, index) => {
          const active = selectedId === step.findingId
          return (
            <button
              key={step.findingId}
              type="button"
              onClick={() => onSelect(step.findingId)}
              className={`relative flex min-w-[148px] flex-1 flex-col rounded-lg border px-3 py-2.5 text-left transition ${
                active
                  ? 'border-[#f59e0b] bg-[#f59e0b]/15'
                  : 'border-surface-700 bg-surface-900/70 hover:border-surface-500'
              }`}
            >
              <span
                className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background: active ? SYNTHESIS_ACCENT : '#334155',
                  color: active ? '#0f172a' : '#e2e8f0',
                }}
              >
                {index + 1}
              </span>
              <span className="font-display text-xs font-semibold text-surface-50">{step.title}</span>
              <span className="mt-1 text-[11px] leading-snug text-surface-300">{step.blurb}</span>
              <span className="mt-2 text-[10px] font-semibold tabular-nums text-[#f59e0b]">
                {step.findingId}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
