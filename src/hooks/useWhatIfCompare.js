import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  COMPARE_MAX_OPTIONS,
  COMPARE_SESSION_KEY,
  COMPARE_SLOT_IDS,
  COMPARE_SLOT_STATUS,
} from '../constants/whatIfCompare.js'
import { fetchJobArtifact, runWhatIfJob } from '../utils/whatIfWorker.js'
import {
  cloneCompareLinks,
  linksFingerprint,
  linksToGeoJson,
} from '../utils/whatIfCompareGeometry.js'

function emptySlot(id) {
  return {
    id,
    name: '',
    opened: id === 'A',
    links: [],
    jobId: null,
    summary: null,
    closeness: null,
    betweenness: null,
    status: COMPARE_SLOT_STATUS.empty,
    error: null,
  }
}

function makeInitialSlots() {
  return Object.fromEntries(COMPARE_SLOT_IDS.map((id) => [id, emptySlot(id)]))
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(COMPARE_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.slots) return null
    return parsed
  } catch {
    return null
  }
}

function writeSession(payload) {
  try {
    sessionStorage.setItem(COMPARE_SESSION_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(COMPARE_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

async function fetchJsonSafe(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Three Compare slots, one sDNA job queue, shared-radius artifact reload.
 * Does not replace useWhatIfScenario (draw mode stays single-job).
 */
export function useWhatIfCompare({ scaleMeters, initialOptionA }) {
  const [slots, setSlots] = useState(makeInitialSlots)
  const [activeId, setActiveId] = useState('A')
  const [openedCount, setOpenedCount] = useState(1)
  const [hydrated, setHydrated] = useState(false)

  const scaleRef = useRef(scaleMeters)
  const slotsRef = useRef(slots)
  const queueRef = useRef([])
  const runningRef = useRef(false)
  const abortRef = useRef(null)
  const skipScaleReloadRef = useRef(true)

  useEffect(() => {
    scaleRef.current = scaleMeters
  }, [scaleMeters])

  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

  const patchSlot = useCallback((id, patch) => {
    setSlots((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...(typeof patch === 'function' ? patch(prev[id]) : patch) },
    }))
  }, [])

  const persist = useCallback((nextSlots, nextOpened, nextActive) => {
    const s = nextSlots ?? slotsRef.current
    writeSession({
      openedCount: nextOpened ?? openedCount,
      activeId: nextActive ?? activeId,
      slots: COMPARE_SLOT_IDS.map((id) => ({
        id,
        name: s[id].name,
        opened: s[id].opened,
        links: s[id].links,
        jobId: s[id].jobId,
        status:
          s[id].status === COMPARE_SLOT_STATUS.computing ||
          s[id].status === COMPARE_SLOT_STATUS.waiting
            ? COMPARE_SLOT_STATUS.error
            : s[id].status,
        error: s[id].status === COMPARE_SLOT_STATUS.ready ? null : s[id].error,
      })),
    })
  }, [openedCount, activeId])

  // Seed A from the draw canvas; restore B/C from session on first mount.
  useEffect(() => {
    const stored = readSession()
    const parentLinks = cloneCompareLinks(initialOptionA?.links)
    const parentReady =
      Boolean(initialOptionA?.ready) &&
      Boolean(initialOptionA?.jobId) &&
      Boolean(initialOptionA?.closeness) &&
      Boolean(initialOptionA?.betweenness)

    setSlots((prev) => {
      const next = { ...prev }
      for (const id of COMPARE_SLOT_IDS) {
        const saved = stored?.slots?.find((row) => row.id === id)
        if (id === 'A' && parentLinks.length) {
          next.A = {
            ...emptySlot('A'),
            opened: true,
            links: parentLinks,
            jobId: parentReady ? initialOptionA.jobId : saved?.jobId ?? null,
            summary: parentReady ? initialOptionA.summary ?? null : null,
            closeness: parentReady ? initialOptionA.closeness : null,
            betweenness: parentReady ? initialOptionA.betweenness : null,
            status: parentReady
              ? COMPARE_SLOT_STATUS.ready
              : parentLinks.length
                ? COMPARE_SLOT_STATUS.drawing
                : COMPARE_SLOT_STATUS.empty,
          }
          continue
        }
        if (saved?.opened && saved.links?.length) {
          next[id] = {
            ...emptySlot(id),
            opened: true,
            name: saved.name || '',
            links: cloneCompareLinks(saved.links),
            jobId: saved.jobId ?? null,
            status: saved.jobId ? COMPARE_SLOT_STATUS.computing : COMPARE_SLOT_STATUS.drawing,
          }
        }
      }
      return next
    })

    const storedOpened = Number(stored?.openedCount)
    const opened = Math.max(
      1,
      Number.isFinite(storedOpened) ? Math.min(COMPARE_MAX_OPTIONS, storedOpened) : 1,
    )
    setOpenedCount(opened)
    if (stored?.activeId && COMPARE_SLOT_IDS.includes(stored.activeId)) {
      setActiveId(stored.activeId)
    }
    setHydrated(true)
    // Seed once when Compare mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore worker artifacts for session job ids (not the parent-ready A payload).
  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    const scale = scaleRef.current

    async function restore() {
      const current = slotsRef.current
      for (const id of COMPARE_SLOT_IDS) {
        const slot = current[id]
        if (!slot.opened || !slot.jobId) continue
        if (slot.closeness && slot.betweenness && slot.summary) continue
        const [closeness, betweenness, summary] = await Promise.all([
          fetchJobArtifact(slot.jobId, `closeness_${scale}.geojson`).catch(() => null),
          fetchJobArtifact(slot.jobId, `betweenness_${scale}.geojson`).catch(() => null),
          fetchJobArtifact(slot.jobId, 'summary.json').catch(() => null),
        ])
        if (cancelled) return
        if (closeness && betweenness) {
          patchSlot(id, {
            closeness,
            betweenness,
            summary: summary ?? slot.summary,
            status: COMPARE_SLOT_STATUS.ready,
            error: null,
          })
        } else {
          patchSlot(id, {
            status: COMPARE_SLOT_STATUS.error,
            error: 'Couldn’t finish — job artifacts missing. Try again.',
          })
        }
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [hydrated, patchSlot])

  // Shared radius: reload Ready artifacts; no new sDNA jobs.
  useEffect(() => {
    if (!hydrated) return
    if (skipScaleReloadRef.current) {
      skipScaleReloadRef.current = false
      return
    }
    let cancelled = false

    async function reload() {
      const current = slotsRef.current
      for (const id of COMPARE_SLOT_IDS) {
        const slot = current[id]
        if (slot.status !== COMPARE_SLOT_STATUS.ready || !slot.jobId) continue
        patchSlot(id, { status: COMPARE_SLOT_STATUS.computing, error: null })
        const [closeness, betweenness] = await Promise.all([
          fetchJobArtifact(slot.jobId, `closeness_${scaleMeters}.geojson`).catch(() => null),
          fetchJobArtifact(slot.jobId, `betweenness_${scaleMeters}.geojson`).catch(() => null),
        ])
        if (cancelled) return
        if (closeness && betweenness) {
          patchSlot(id, {
            closeness,
            betweenness,
            status: COMPARE_SLOT_STATUS.ready,
            error: null,
          })
        } else {
          patchSlot(id, {
            status: COMPARE_SLOT_STATUS.error,
            error: `Failed to load ${scaleMeters}m layers`,
          })
        }
      }
    }

    void reload()
    return () => {
      cancelled = true
    }
  }, [scaleMeters, hydrated, patchSlot])

  const processQueue = useCallback(async () => {
    if (runningRef.current) return
    const next = queueRef.current.shift()
    if (!next) return
    runningRef.current = true
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const { slotId, geojson } = next
    patchSlot(slotId, { status: COMPARE_SLOT_STATUS.computing, error: null })

    try {
      const result = await runWhatIfJob(geojson, scaleRef.current, { signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      patchSlot(slotId, {
        jobId: result.jobId,
        summary: result.summary ?? null,
        closeness: result.closeness,
        betweenness: result.betweenness,
        status: COMPARE_SLOT_STATUS.ready,
        error: null,
      })
    } catch (err) {
      if (ctrl.signal.aborted || err?.message === 'Aborted') return
      if (err?.code === 'WORKER_OFFLINE') {
        patchSlot(slotId, {
          status: COMPARE_SLOT_STATUS.error,
          error: 'Worker offline — run the two Command Prompt lines, then Try again.',
        })
      } else if (err?.code === 'SDNA_MISSING') {
        patchSlot(slotId, {
          status: COMPARE_SLOT_STATUS.error,
          error: 'sDNA missing on this PC.',
        })
      } else {
        patchSlot(slotId, {
          status: COMPARE_SLOT_STATUS.error,
          error: err?.message || 'sDNA compute failed',
        })
      }
    } finally {
      runningRef.current = false
      abortRef.current = null
      if (queueRef.current.length) {
        const queuedId = queueRef.current[0]?.slotId
        if (queuedId) patchSlot(queuedId, { status: COMPARE_SLOT_STATUS.waiting })
        void processQueue()
      }
    }
  }, [patchSlot])

  const enqueueCompute = useCallback(
    (slotId, links) => {
      const geojson = linksToGeoJson(links)
      if (!geojson.features.length) {
        patchSlot(slotId, {
          status: COMPARE_SLOT_STATUS.error,
          error: 'Draw and finish at least one link.',
        })
        return { ok: false, reason: 'empty' }
      }
      const fp = linksFingerprint(links)
      const current = slotsRef.current
      for (const id of COMPARE_SLOT_IDS) {
        if (id === slotId || !current[id].opened || !current[id].links.length) continue
        if (linksFingerprint(current[id].links) === fp) {
          patchSlot(slotId, {
            status: COMPARE_SLOT_STATUS.error,
            error: `Same geometry as Option ${id}. Draw a different idea.`,
          })
          return { ok: false, reason: 'duplicate' }
        }
      }
      patchSlot(slotId, {
        links: cloneCompareLinks(links),
        status: runningRef.current ? COMPARE_SLOT_STATUS.waiting : COMPARE_SLOT_STATUS.computing,
        error: null,
      })
      queueRef.current = queueRef.current.filter((item) => item.slotId !== slotId)
      queueRef.current.push({ slotId, geojson })
      void processQueue()
      return { ok: true }
    },
    [patchSlot, processQueue],
  )

  const commitLinks = useCallback(
    (slotId, links) => {
      patchSlot(slotId, { links: cloneCompareLinks(links) })
    },
    [patchSlot],
  )

  const selectSlot = useCallback((id) => {
    if (!COMPARE_SLOT_IDS.includes(id)) return
    setActiveId(id)
  }, [])

  const addOption = useCallback(() => {
    if (openedCount >= COMPARE_MAX_OPTIONS) return null
    const nextId = COMPARE_SLOT_IDS[openedCount]
    setOpenedCount((n) => n + 1)
    patchSlot(nextId, {
      ...emptySlot(nextId),
      opened: true,
      status: COMPARE_SLOT_STATUS.drawing,
    })
    setActiveId(nextId)
    return nextId
  }, [openedCount, patchSlot])

  const redrawSlot = useCallback(
    (id) => {
      patchSlot(id, {
        links: [],
        jobId: null,
        summary: null,
        closeness: null,
        betweenness: null,
        status: COMPARE_SLOT_STATUS.drawing,
        error: null,
      })
      queueRef.current = queueRef.current.filter((item) => item.slotId !== id)
      setActiveId(id)
    },
    [patchSlot],
  )

  const removeSlot = useCallback(
    (id) => {
      if (id === 'A') return
      patchSlot(id, emptySlot(id))
      patchSlot(id, { opened: true, status: COMPARE_SLOT_STATUS.empty })
      queueRef.current = queueRef.current.filter((item) => item.slotId !== id)
      if (activeId === id) setActiveId('A')
    },
    [activeId, patchSlot],
  )

  const setSlotName = useCallback(
    (id, name) => {
      patchSlot(id, { name: String(name ?? '').slice(0, 40) })
    },
    [patchSlot],
  )

  const retrySlot = useCallback(
    (id) => {
      const slot = slotsRef.current[id]
      if (!slot?.links?.length) return
      enqueueCompute(id, slot.links)
    },
    [enqueueCompute],
  )

  const resetAll = useCallback(() => {
    abortRef.current?.abort()
    queueRef.current = []
    runningRef.current = false
    setSlots(makeInitialSlots())
    setOpenedCount(1)
    setActiveId('A')
    clearSession()
  }, [])

  useEffect(() => {
    if (!hydrated) return
    persist(slots, openedCount, activeId)
  }, [slots, openedCount, activeId, hydrated, persist])

  const readyCount = useMemo(
    () => COMPARE_SLOT_IDS.filter((id) => slots[id].status === COMPARE_SLOT_STATUS.ready).length,
    [slots],
  )

  const activeSlot = slots[activeId]

  return {
    slots,
    activeId,
    activeSlot,
    openedCount,
    readyCount,
    hydrated,
    selectSlot,
    addOption,
    redrawSlot,
    removeSlot,
    setSlotName,
    commitLinks,
    enqueueCompute,
    retrySlot,
    resetAll,
  }
}
