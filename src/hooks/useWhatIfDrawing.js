import { useCallback, useMemo, useState } from 'react'
import { WHAT_IF_DRAW_TOOLS, WHAT_IF_SNAP_PX } from '../constants/centralityWhatIf.js'

function distPx(map, latlng, nodeLatLng) {
  if (!map) return Infinity
  const a = map.latLngToContainerPoint(latlng)
  const b = map.latLngToContainerPoint(nodeLatLng)
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function cloneCoords(coords) {
  return coords.map((c) => [...c])
}

function cloneLinks(links) {
  return links.map((l) => ({ id: l.id, coordinates: cloneCoords(l.coordinates) }))
}

function snapshotOf(s) {
  return {
    links: cloneLinks(s.links),
    draftCoords: cloneCoords(s.draftCoords),
    nextId: s.nextId,
  }
}

function toGeoJson(links) {
  return {
    type: 'FeatureCollection',
    features: links.map((link) => ({
      type: 'Feature',
      properties: { id: link.id, name: `Proposed ${link.id}` },
      geometry: { type: 'LineString', coordinates: link.coordinates },
    })),
  }
}

const EMPTY = {
  links: [],
  draftCoords: [],
  nextId: 1,
  past: [],
  future: [],
}

/**
 * Snap-assisted polyline drawing for What-if mode, with undo/redo history.
 * links: [{ id, coordinates: [[lng,lat], ...] }]
 */
export function useWhatIfDrawing(snapNodes) {
  const [tool, setTool] = useState(WHAT_IF_DRAW_TOOLS.pan)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [cursorLatLng, setCursorLatLng] = useState(null)
  const [state, setState] = useState(EMPTY)

  const { links, draftCoords, nextId, past, future } = state

  const nodeLatLngs = useMemo(() => {
    if (!snapNodes?.features?.length) return []
    return snapNodes.features.map((f) => {
      const [lng, lat] = f.geometry.coordinates
      return { id: f.properties?.id, latlng: [lat, lng], lngLat: [lng, lat], role: f.properties?.role }
    })
  }, [snapNodes])

  const snapLatLng = useCallback(
    (map, latlng) => {
      if (!snapEnabled || !map || !nodeLatLngs.length) {
        return { latlng: [latlng.lat, latlng.lng], lngLat: [latlng.lng, latlng.lat], snapped: false }
      }
      let best = null
      let bestD = WHAT_IF_SNAP_PX
      for (const node of nodeLatLngs) {
        const d = distPx(map, latlng, node.latlng)
        if (d < bestD) {
          bestD = d
          best = node
        }
      }
      if (!best) {
        return { latlng: [latlng.lat, latlng.lng], lngLat: [latlng.lng, latlng.lat], snapped: false }
      }
      return { latlng: best.latlng, lngLat: best.lngLat, snapped: true, nodeId: best.id }
    },
    [nodeLatLngs, snapEnabled],
  )

  const addVertex = useCallback(
    (map, leafletLatLng) => {
      if (tool !== WHAT_IF_DRAW_TOOLS.pencil) return
      const snapped = snapLatLng(map, leafletLatLng)
      setState((s) => ({
        ...s,
        past: [...s.past, snapshotOf(s)],
        future: [],
        draftCoords: [...s.draftCoords, snapped.lngLat],
      }))
    },
    [snapLatLng, tool],
  )

  const finishLink = useCallback(() => {
    let geo = null
    setState((s) => {
      if (s.draftCoords.length < 2) return s
      const id = s.nextId
      const nextLinks = [...s.links, { id, coordinates: cloneCoords(s.draftCoords) }]
      geo = toGeoJson(nextLinks)
      return {
        ...s,
        past: [...s.past, snapshotOf(s)],
        future: [],
        links: nextLinks,
        draftCoords: [],
        nextId: s.nextId + 1,
      }
    })
    return geo
  }, [])

  const undo = useCallback(() => {
    let result = { changedFinished: false, geojson: null, can: false }
    setState((s) => {
      if (!s.past.length) return s
      const prev = s.past[s.past.length - 1]
      result = {
        changedFinished: prev.links.length !== s.links.length,
        geojson: toGeoJson(prev.links),
        can: true,
      }
      return {
        links: cloneLinks(prev.links),
        draftCoords: cloneCoords(prev.draftCoords),
        nextId: prev.nextId,
        past: s.past.slice(0, -1),
        future: [snapshotOf(s), ...s.future],
      }
    })
    return result
  }, [])

  const redo = useCallback(() => {
    let result = { changedFinished: false, geojson: null, can: false }
    setState((s) => {
      if (!s.future.length) return s
      const next = s.future[0]
      result = {
        changedFinished: next.links.length !== s.links.length,
        geojson: toGeoJson(next.links),
        can: true,
      }
      return {
        links: cloneLinks(next.links),
        draftCoords: cloneCoords(next.draftCoords),
        nextId: next.nextId,
        past: [...s.past, snapshotOf(s)],
        future: s.future.slice(1),
      }
    })
    return result
  }, [])

  const clearLinks = useCallback(() => {
    setState((s) => {
      if (!s.links.length && !s.draftCoords.length) return s
      return {
        ...s,
        past: [...s.past, snapshotOf(s)],
        future: [],
        links: [],
        draftCoords: [],
      }
    })
  }, [])

  const cancelDraft = useCallback(() => {
    setState((s) => {
      if (!s.draftCoords.length) return s
      return {
        ...s,
        past: [...s.past, snapshotOf(s)],
        future: [],
        draftCoords: [],
      }
    })
  }, [])

  const resetDrawing = useCallback(() => {
    setState(EMPTY)
  }, [])

  const proposedGeoJson = useMemo(() => {
    const features = links.map((link) => ({
      type: 'Feature',
      properties: { id: link.id, name: `Proposed ${link.id}` },
      geometry: { type: 'LineString', coordinates: link.coordinates },
    }))
    if (draftCoords.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { id: 'draft', draft: true },
        geometry: { type: 'LineString', coordinates: draftCoords },
      })
    }
    return { type: 'FeatureCollection', features }
  }, [links, draftCoords])

  const exportProposedGeoJson = useCallback(() => toGeoJson(links), [links])

  return {
    tool,
    setTool,
    snapEnabled,
    setSnapEnabled,
    draftCoords,
    links,
    cursorLatLng,
    setCursorLatLng,
    snapLatLng,
    addVertex,
    finishLink,
    undo,
    redo,
    clearLinks,
    cancelDraft,
    resetDrawing,
    proposedGeoJson,
    exportProposedGeoJson,
    hasDraft: draftCoords.length > 0,
    hasLinks: links.length > 0,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  }
}
