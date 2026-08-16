import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Network, RotateCcw, Search, X } from 'lucide-react'
import MapFullscreenShell, { FullscreenEnlargeButton } from '../MapFullscreenShell.jsx'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import ForceGraph from './ForceGraph.jsx'
import { ISSUES_INFO } from './issuesInfoContent.js'
import {
  CATEGORY_ORDER,
  categoryColors,
  edges,
  nodes,
} from './issuesData.js'

function getConnectedIds(nodeId) {
  const ids = new Set()
  for (const e of edges) {
    if (e.source === nodeId) ids.add(e.target)
    if (e.target === nodeId) ids.add(e.source)
  }
  return [...ids]
}

/** Left graph (65%) + right detail panel (35%). */
export default function NetworkOverview() {
  const [searchParams] = useSearchParams()
  const nodeFromUrl = searchParams.get('node')
  const [selectedId, setSelectedId] = useState(() =>
    nodeFromUrl && nodes.some((n) => n.id === nodeFromUrl) ? nodeFromUrl : null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [hiddenCategories, setHiddenCategories] = useState(() => new Set())
  const [resetToken, setResetToken] = useState(0)

  useEffect(() => {
    const id = searchParams.get('node')
    if (id && nodes.some((n) => n.id === id)) {
      setSelectedId(id)
    }
  }, [searchParams])

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [selectedId],
  )

  const connected = useMemo(() => {
    if (!selectedId) return []
    const ids = getConnectedIds(selectedId)
    return ids.map((id) => nodes.find((n) => n.id === id)).filter(Boolean)
  }, [selectedId])

  function toggleCategory(cat) {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-1 flex-col gap-3 lg:flex-row lg:gap-4">
      {/* Graph panel — 65% */}
      <MapFullscreenShell
        className="flex min-h-[calc(100vh-12rem)] flex-[65] flex-col"
        innerClassName="flex flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-800 shadow-card"
        trackDocumentFullscreen={false}
        showFloatingEnlarge={false}
        enlargeLabel="Enlarge network overview"
        closeLabel="Close network overview"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-700 px-3 py-2.5">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-300" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes…"
              className="w-full rounded-lg border border-surface-700 bg-surface-900 py-2 pl-8 pr-2 text-sm text-surface-50 placeholder:text-surface-400 focus:border-[#be123c]/70 focus:outline-none focus:ring-1 focus:ring-[#be123c]/40"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-surface-300">
            <span>How to explore</span>
            <MetricInfoButton
              title={ISSUES_INFO.networkInteract.title}
              points={ISSUES_INFO.networkInteract.points}
              ariaLabel={ISSUES_INFO.networkInteract.ariaLabel}
            />
          </div>
          <FullscreenEnlargeButton
            label="Enlarge network overview"
            title="Enlarge network overview"
          />
          <button
            type="button"
            onClick={() => setResetToken((t) => t + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm font-medium text-surface-100 transition hover:border-surface-300"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset View
          </button>
        </div>

        {/* Compact category filters — frees graph height */}
        <div className="flex flex-wrap gap-1.5 border-b border-surface-700 px-3 py-1.5">
          {CATEGORY_ORDER.map((cat) => {
            const hidden = hiddenCategories.has(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium leading-snug transition ${
                  hidden
                    ? 'border-surface-700 bg-surface-900/40 text-surface-400 opacity-45'
                    : 'border-surface-700 bg-surface-900 text-surface-50 hover:border-surface-400'
                }`}
                title={hidden ? `Show ${cat}` : `Hide ${cat}`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: categoryColors[cat] }}
                />
                {cat}
              </button>
            )
          })}
        </div>

        <div className="relative min-h-0 flex-1">
          <ForceGraph
            selectedId={selectedId}
            onSelect={setSelectedId}
            searchQuery={searchQuery}
            hiddenCategories={hiddenCategories}
            resetToken={resetToken}
          />
        </div>
      </MapFullscreenShell>

      {/* Detail panel — 35% */}
      <aside className="flex min-h-[320px] flex-[35] flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-800 shadow-card lg:min-h-[calc(100vh-12rem)]">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-surface-700 bg-surface-900/80 text-surface-300">
              <Network className="h-6 w-6" aria-hidden />
            </div>
            <p className="font-display text-lg font-semibold text-surface-50">Explore the Network</p>
            <p className="max-w-[260px] text-sm leading-relaxed text-surface-200">
              Click any node to explore issues, potentials, and stakeholder connections
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col" style={{ animation: 'issuesFadeUp 0.3s ease both' }}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-surface-700 bg-surface-800/95 px-4 py-3.5 backdrop-blur-[8px]">
              <div className="min-w-0">
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-surface-950"
                  style={{ backgroundColor: categoryColors[selected.category] }}
                >
                  {selected.category}
                </span>
                <h3 className="mt-2.5 font-display text-xl font-semibold leading-snug text-surface-50">
                  {selected.label}
                </h3>
                <p className="mt-1 text-sm tabular-nums text-surface-400">
                  {connected.length} linked
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="shrink-0 rounded-lg p-1.5 text-surface-300 transition hover:bg-surface-700 hover:text-surface-50"
                aria-label="Close detail"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {Array.isArray(selected.detail) ? (
                <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-surface-100">
                  {selected.detail.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-base leading-relaxed text-surface-100">{selected.detail}</p>
              )}
              <div className="mt-5">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-surface-300">
                  Connected to
                </p>
                {connected.length === 0 ? (
                  <p className="text-sm text-surface-400">No direct connections</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {connected.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setSelectedId(n.id)}
                        className="rounded-full border px-2.5 py-1.5 text-xs text-surface-50 transition hover:-translate-y-0.5 hover:brightness-110"
                        style={{
                          backgroundColor: `${categoryColors[n.category]}26`,
                          borderColor: `${categoryColors[n.category]}66`,
                        }}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
