import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Network } from 'lucide-react'
import { nodes as issueNodes } from '../issues/issuesData.js'
import {
  DOMAIN_META,
  EDGE_TYPE_META,
  SYNTHESIS_ACCENT,
  findingEdges,
  getFindingById,
} from './findingsData.js'

function issueLabel(id) {
  return issueNodes.find((n) => n.id === id)?.label ?? id
}

/**
 * Detail card for a selected synthesis finding.
 */
export default function FindingDetailPanel({
  selectedId,
  onSelectFinding,
  onFocusAreaSub,
}) {
  const navigate = useNavigate()
  const finding = getFindingById(selectedId)

  if (!finding) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-surface-600 bg-surface-900/40 px-6 text-center">
        <Network className="mb-3 h-8 w-8 text-[#f59e0b]/70" aria-hidden />
        <p className="font-display text-sm font-semibold text-surface-100">Select a Finding</p>
        <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-surface-300">
          Choose a Key Argument step, Relationships node, or All Findings card.
        </p>
      </div>
    )
  }

  const relatedEdges = findingEdges.filter(
    (e) => e.source === finding.id || e.target === finding.id,
  )

  function goEvidence(ev) {
    if (ev.focusSub) {
      onFocusAreaSub?.(ev.focusSub)
    }
    const params = new URLSearchParams()
    if (ev.node) params.set('node', ev.node)
    if (ev.focusSub) params.set('sub', ev.focusSub)
    const qs = params.toString()
    navigate(qs ? `${ev.path}?${qs}` : ev.path)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-800 shadow-card">
      <div
        className="border-b border-surface-700 px-4 py-3"
        style={{ borderTop: `3px solid ${SYNTHESIS_ACCENT}` }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[#f59e0b]/20 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#fbbf24]">
            {finding.id}
          </span>
          {(finding.domains ?? []).map((d) => (
            <span
              key={d}
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: `${DOMAIN_META[d]?.color ?? SYNTHESIS_ACCENT}22`,
                color: DOMAIN_META[d]?.color ?? SYNTHESIS_ACCENT,
              }}
            >
              {DOMAIN_META[d]?.label ?? d}
            </span>
          ))}
        </div>
        <h3 className="mt-2 font-display text-base font-semibold text-surface-50">{finding.label}</h3>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
        <Block title="Observation" body={finding.observation} />
        <Block title="Interpretation" body={finding.interpretation} />
        <Block title="Implication" body={finding.implication} accent />

        {finding.evidence?.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-surface-400">
              Evidence
            </p>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
              {finding.evidence.map((ev) => (
                <button
                  key={`${ev.path}-${ev.label}`}
                  type="button"
                  onClick={() => goEvidence(ev)}
                  className="inline-flex items-center justify-between gap-2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-left text-xs font-medium text-surface-100 transition hover:border-[#f59e0b]/50 hover:text-[#fbbf24] sm:min-w-[200px] sm:flex-1"
                >
                  <span>{ev.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        )}

        {finding.issuesLinks?.length > 0 && (
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">
                Issues & Potentials
              </p>
              <button
                type="button"
                onClick={() => navigate('/problems')}
                className="text-[11px] font-semibold text-[#fda4af] underline-offset-2 hover:underline"
              >
                Open Issues
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {finding.issuesLinks.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(`/problems?node=${id}`)}
                  className="rounded-full border border-[#be123c]/40 bg-[#be123c]/10 px-2.5 py-1 text-[11px] font-semibold text-[#fda4af] transition hover:bg-[#be123c]/20"
                >
                  <span className="tabular-nums opacity-80">{id}</span>
                  <span className="mx-1 opacity-40">·</span>
                  <span>{issueLabel(id)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {relatedEdges.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-surface-400">
              Linked Findings
            </p>
            <ul className="space-y-1.5">
              {relatedEdges.map((e) => {
                const otherId = e.source === finding.id ? e.target : e.source
                const other = getFindingById(otherId)
                const meta = EDGE_TYPE_META[e.type]
                return (
                  <li key={`${e.source}-${e.target}-${e.type}`}>
                    <button
                      type="button"
                      onClick={() => onSelectFinding(otherId)}
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-surface-900"
                    >
                      <span
                        className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{ color: meta?.color, background: `${meta?.color}22` }}
                      >
                        {meta?.label ?? e.type}
                      </span>
                      <span className="text-surface-200">
                        <span className="font-semibold text-surface-50">{otherId}</span>
                        {other ? ` — ${other.label}` : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function Block({ title, body, accent = false }) {
  const items = Array.isArray(body) ? body : body ? [body] : []

  if (accent) {
    return (
      <div className="rounded-lg border border-[#f59e0b]/35 bg-[#f59e0b]/10 px-3 py-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#fbbf24]">
          {title}
        </p>
        <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-surface-50">
          {items.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-surface-400">
        {title}
      </p>
      <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-surface-200">
        {items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
