import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { DEFAULT_WHAT_IF_VISIBLE, WHAT_IF_DRAW_TOOLS, WHAT_IF_MODES } from '../../../../constants/centralityWhatIf.js'
import { scaleLabel } from '../../../../constants/centrality.js'
import {
  COMPARE_MAX_OPTIONS,
  COMPARE_SLOT_STATUS,
  COMPARE_TIP_SESSION_KEY,
} from '../../../../constants/whatIfCompare.js'
import { COMPARE_HEADING_INFO, COMPARE_SCALE_INFO } from '../../../../constants/whatIfCompareHelpContent.js'
import { useWhatIfCompare } from '../../../../hooks/useWhatIfCompare.js'
import { useWhatIfDrawing } from '../../../../hooks/useWhatIfDrawing.js'
import { summarizeGeoJson } from '../../../../utils/centralityStats.js'
import MetricInfoButton from '../../MetricInfoButton.jsx'
import CentralityMap from '../../CentralityMap.jsx'
import WhatIfCompareOptionCard from './WhatIfCompareOptionCard.jsx'
import WhatIfCompareTable from './WhatIfCompareTable.jsx'

function downloadProposedGeoJson(geo) {
  const blob = new Blob([JSON.stringify(geo, null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'proposed_links.geojson'
  a.click()
  URL.revokeObjectURL(url)
}

function readTipDismissed() {
  try {
    return sessionStorage.getItem(COMPARE_TIP_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/** Compare workspace — alternative ideas A/B/C. Draw path stays in CentralityAnalysisView. */
export default function WhatIfCompareView({
  scaleMeters,
  onScaleChange,
  namedRoads,
  snapNodes,
  baselineCloseness,
  baselineBetweenness,
  baselineClosenessStats,
  baselineBetweennessStats,
  layersLoading = false,
  initialOptionA,
  workerOnline,
  workerReachable,
  sdnaMissing,
  onConnect,
  onBackToDraw,
  onModeChange,
  whatIfView,
  onWhatIfViewChange,
  onSyncOptionA,
}) {
  const compare = useWhatIfCompare({ scaleMeters, initialOptionA })
  const drawing = useWhatIfDrawing(snapNodes)
  const lastSyncedSlot = useRef(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)
  const [whatIfVisible, setWhatIfVisible] = useState(DEFAULT_WHAT_IF_VISIBLE)
  const [tipHidden, setTipHidden] = useState(readTipDismissed)
  const [drawHint, setDrawHint] = useState(null)

  const { slots, activeId, openedCount, readyCount } = compare
  const activeSlot = slots[activeId]

  useEffect(() => {
    if (lastSyncedSlot.current === activeId) return
    lastSyncedSlot.current = activeId
    drawing.importLinks(slots[activeId]?.links ?? [])
    if (slots[activeId]?.status === COMPARE_SLOT_STATUS.drawing) {
      drawing.selectTool(WHAT_IF_DRAW_TOOLS.pencil)
    }
    // Only when the selected card changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  const handleSelectSlot = useCallback(
    (id) => {
      compare.selectSlot(id)
      const slot = slots[id]
      if (slot?.status === COMPARE_SLOT_STATUS.empty) {
        compare.redrawSlot(id)
      }
    },
    [compare, slots],
  )

  const maybeCompute = useCallback(
    (geo) => {
      const links = (geo?.features ?? [])
        .filter((f) => f.geometry?.type === 'LineString')
        .map((f, i) => ({
          id: f.properties?.id ?? i + 1,
          coordinates: f.geometry.coordinates,
        }))
      compare.commitLinks(activeId, links)
      if (!links.length) return
      compare.enqueueCompute(activeId, links)
    },
    [activeId, compare],
  )

  const handleFinishLink = useCallback(
    (mapOrEvent, latlng) => {
      const isMap = mapOrEvent && typeof mapOrEvent.latLngToContainerPoint === 'function'
      const geo =
        isMap && latlng ? drawing.finishLinkAt(mapOrEvent, latlng) : drawing.finishLink()
      if (geo?.features?.length) {
        setDrawHint(null)
        const links = geo.features
          .filter((f) => f.geometry?.type === 'LineString' && !f.properties?.draft)
          .map((f, i) => ({
            id: f.properties?.id ?? i + 1,
            coordinates: f.geometry.coordinates,
          }))
        compare.commitLinks(activeId, links)
        compare.enqueueCompute(activeId, links)
        return
      }
      setDrawHint('Need at least 2 points — then Esc / ✓ / double-click to finish')
    },
    [activeId, compare, drawing],
  )

  const handleUndo = useCallback(() => {
    const result = drawing.undo()
    if (result?.changedFinished) maybeCompute(result.geojson)
  }, [drawing, maybeCompute])

  const handleRedo = useCallback(() => {
    const result = drawing.redo()
    if (result?.changedFinished) maybeCompute(result.geojson)
  }, [drawing, maybeCompute])

  const handleEraseLink = useCallback(
    (linkId) => {
      const result = drawing.removeLink(linkId)
      if (result?.changedFinished) maybeCompute(result.geojson)
    },
    [drawing, maybeCompute],
  )

  const handleRun = useCallback(async () => {
    let geo = drawing.exportProposedGeoJson()
    if (!geo.features.length && drawing.draftCoords.length >= 2) {
      geo = drawing.finishLink()
    }
    if (!geo?.features?.length) {
      setDrawHint('Draw and finish at least one link (≥2 points) before ▶')
      return
    }
    setDrawHint(null)
    const links = geo.features
      .filter((f) => f.geometry?.type === 'LineString')
      .map((f, i) => ({
        id: f.properties?.id ?? i + 1,
        coordinates: f.geometry.coordinates,
      }))
    compare.commitLinks(activeId, links)
    const result = compare.enqueueCompute(activeId, links)
    if (result?.ok && !workerOnline) {
      downloadProposedGeoJson(geo)
    }
  }, [activeId, compare, drawing, workerOnline])

  const handleResetActive = useCallback(() => {
    if (!window.confirm(`Clear Option ${activeId} drawing?`)) return
    drawing.resetDrawing()
    compare.redrawSlot(activeId)
  }, [activeId, compare, drawing])

  const handleAdd = useCallback(() => {
    const id = compare.addOption()
    if (!id) return
    lastSyncedSlot.current = null
    drawing.importLinks([])
    drawing.selectTool(WHAT_IF_DRAW_TOOLS.pencil)
  }, [compare, drawing])

  const handleRedraw = useCallback(
    (id) => {
      if (!window.confirm(`Clear and redraw Option ${id}? This does not change the other options.`)) return
      compare.redrawSlot(id)
      lastSyncedSlot.current = null
      drawing.importLinks([])
      drawing.selectTool(WHAT_IF_DRAW_TOOLS.pencil)
    },
    [compare, drawing],
  )

  const handleRemove = useCallback(
    (id) => {
      if (!window.confirm(`Remove Option ${id}? Option labels stay A / B / C.`)) return
      compare.removeSlot(id)
      if (id === activeId) lastSyncedSlot.current = null
    },
    [activeId, compare],
  )

  const handleBack = useCallback(() => {
    onSyncOptionA?.(slots.A)
    onBackToDraw?.()
  }, [onBackToDraw, onSyncOptionA, slots.A])

  const handleToggleLayer = useCallback((id, checked) => {
    setWhatIfVisible((prev) => {
      const next = { ...prev, [id]: checked }
      if (checked && (id === 'closeness' || id === 'betweenness')) {
        next.closeness = id === 'closeness'
        next.betweenness = id === 'betweenness'
      }
      return next
    })
  }, [])

  const mapCloseness = activeSlot?.status === COMPARE_SLOT_STATUS.ready ? activeSlot.closeness : baselineCloseness
  const mapBetweenness =
    activeSlot?.status === COMPARE_SLOT_STATUS.ready ? activeSlot.betweenness : baselineBetweenness
  const mapClosenessStats = useMemo(
    () =>
      activeSlot?.status === COMPARE_SLOT_STATUS.ready
        ? summarizeGeoJson(activeSlot.closeness, 'closeness', scaleMeters, namedRoads)
        : baselineClosenessStats,
    [activeSlot, scaleMeters, namedRoads, baselineClosenessStats],
  )
  const mapBetweennessStats = useMemo(
    () =>
      activeSlot?.status === COMPARE_SLOT_STATUS.ready
        ? summarizeGeoJson(activeSlot.betweenness, 'betweenness', scaleMeters, namedRoads)
        : baselineBetweennessStats,
    [activeSlot, scaleMeters, namedRoads, baselineBetweennessStats],
  )

  const newSegmentIds = useMemo(() => {
    if (activeSlot?.status !== COMPARE_SLOT_STATUS.ready || !activeSlot.closeness?.features || !baselineCloseness?.features) {
      return null
    }
    const baseIds = new Set(
      baselineCloseness.features.map((f) => Number(f.properties?.ID)).filter((n) => Number.isFinite(n)),
    )
    const ids = new Set()
    for (const f of activeSlot.closeness.features) {
      const id = Number(f.properties?.ID)
      if (Number.isFinite(id) && !baseIds.has(id)) ids.add(id)
    }
    return ids.size ? ids : null
  }, [activeSlot, baselineCloseness])

  const computing =
    layersLoading ||
    activeSlot?.status === COMPARE_SLOT_STATUS.computing ||
    activeSlot?.status === COMPARE_SLOT_STATUS.waiting

  const statusText = useMemo(() => {
    if (sdnaMissing) return 'Worker reachable but sDNA missing'
    if (activeSlot?.status === COMPARE_SLOT_STATUS.computing) return 'Computing sDNA on local worker…'
    if (activeSlot?.status === COMPARE_SLOT_STATUS.waiting) return 'Waiting for the previous option’s job…'
    if (activeSlot?.status === COMPARE_SLOT_STATUS.error) return activeSlot.error
    if (drawHint) return drawHint
    return null
  }, [activeSlot, drawHint, sdnaMissing])

  const emptyWorkspace = openedCount === 1 && !slots.A.links.length && slots.A.status === COMPARE_SLOT_STATUS.empty

  function dismissTip() {
    setTipHidden(true)
    try {
      sessionStorage.setItem(COMPARE_TIP_SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="what-if-compare-root flex min-h-0 flex-1 flex-col overflow-hidden pl-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-surface-700 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 rounded-md border border-surface-600 px-2 py-1 text-[11px] text-surface-100 hover:bg-surface-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to What-if
          </button>
          <h1 className="font-display text-sm font-semibold text-surface-50">Compare</h1>
          <MetricInfoButton
            title="What-if Compare"
            ariaLabel="What does Compare show?"
            points={COMPARE_HEADING_INFO}
            pulse={false}
          />
          <p className="text-[11px] text-surface-400">You can compare up to 3 ideas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={workerOnline ? 'text-emerald-400' : 'text-surface-400'}>
            Worker {workerOnline ? 'online' : workerReachable ? 'no sDNA' : 'offline'}
          </span>
          {!workerOnline ? (
            <button
              type="button"
              onClick={() => onConnect?.()}
              className="rounded-md border border-primary-500/50 px-2 py-0.5 text-primary-300 hover:bg-primary-500/10"
            >
              Connect
            </button>
          ) : null}
        </div>
      </div>

      {!tipHidden ? (
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-surface-800 bg-surface-850/60 px-3 py-1.5 text-[11px] text-surface-200">
          <p>
            Each card is a <strong className="font-semibold text-surface-50">different</strong> idea, not
            another street on the same idea. Add a second idea to fill the comparison.
          </p>
          <button type="button" onClick={dismissTip} className="shrink-0 text-surface-400 hover:text-white">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_30%] lg:overflow-hidden">
        <div className="flex min-h-[50vh] min-w-0 flex-1 flex-col lg:min-h-0">
          <p className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-1 text-[11px] text-surface-400">
            <span>All options · {scaleLabel(scaleMeters)}</span>
            <MetricInfoButton
              title="Analysis radius"
              ariaLabel="What do the radius chips do in Compare?"
              points={COMPARE_SCALE_INFO}
              pulse={false}
            />
            <span className="text-surface-200">Map: Option {activeId}</span>
          </p>
          <div className="min-h-0 min-w-0 flex-1">
            <CentralityMap
              scaleMeters={scaleMeters}
              onScaleChange={onScaleChange}
              visibleLayers={whatIfVisible}
              onToggleLayer={handleToggleLayer}
              closeness={mapCloseness}
              betweenness={mapBetweenness}
              closenessStats={mapClosenessStats}
              betweennessStats={mapBetweennessStats}
              loading={computing}
              namedRoads={namedRoads}
              selectedSegmentId={selectedSegmentId}
              mode={WHAT_IF_MODES.whatIf}
              onModeChange={onModeChange}
              whatIfView={whatIfView}
              onWhatIfViewChange={onWhatIfViewChange}
              whatIf={{
                drawing,
                snapNodes,
                statusText,
                runLabel: workerOnline ? 'Run sDNA (local)' : 'Export proposed links',
                onFinishLink: handleFinishLink,
                onUndo: handleUndo,
                onRedo: handleRedo,
                onEraseLink: handleEraseLink,
                onRun: handleRun,
                onReset: handleResetActive,
                showProposed: whatIfVisible.proposedLinks,
                showSnapNodes: whatIfVisible.snapNodes,
                newSegmentIds,
                hideFinishedProposed: true,
                compareSlots: slots,
                activeSlotId: activeId,
                openedCount,
              }}
            />
          </div>
        </div>

        <aside className="what-if-compare-rail min-h-0 overflow-y-auto border-t border-surface-700 bg-surface-900 lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-2 px-3 py-2">
            {['A', 'B', 'C'].slice(0, openedCount).map((id) => (
              <WhatIfCompareOptionCard
                key={id}
                slot={slots[id]}
                selected={activeId === id}
                onSelect={handleSelectSlot}
                onRedraw={handleRedraw}
                onRemove={handleRemove}
                onRetry={compare.retrySlot}
                onNameChange={compare.setSlotName}
                allowRemove={id !== 'A'}
              />
            ))}
            {openedCount < COMPARE_MAX_OPTIONS ? (
              <button
                type="button"
                onClick={handleAdd}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary-500/50 bg-primary-500/5 px-2 py-2 text-[11px] text-primary-200 hover:bg-primary-500/10"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                <span className="font-semibold">
                  {openedCount === 1 ? 'Add another idea' : 'Add a third idea (3 of 3)'}
                </span>
              </button>
            ) : (
              <p className="text-[11px] text-surface-500">That’s the maximum — 3 ideas.</p>
            )}
            {emptyWorkspace ? (
              <p className="text-[11px] text-surface-300">
                Draw Option A on the map, or go back and sketch in What-if first. Comparison appears
                when two ideas are Ready.
              </p>
            ) : readyCount < 2 ? (
              <p className="text-[11px] text-surface-400">Add a second idea to compare.</p>
            ) : null}
          </div>
          {readyCount >= 2 ? (
            <WhatIfCompareTable
              slots={slots}
              openedCount={openedCount}
              scaleMeters={scaleMeters}
              baselineCloseness={baselineCloseness}
              baselineBetweenness={baselineBetweenness}
              namedRoads={namedRoads}
              selectedSegmentId={selectedSegmentId}
              onSegmentClick={(id) => setSelectedSegmentId((prev) => (prev == id ? null : id))}
            />
          ) : null}
        </aside>
      </div>
    </div>
  )
}
