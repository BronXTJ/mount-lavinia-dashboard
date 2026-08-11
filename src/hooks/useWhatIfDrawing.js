import { useCallback, useMemo, useState } from 'react'
import { WHAT_IF_DRAW_TOOLS, WHAT_IF_SNAP_PX } from '../constants/centralityWhatIf.js'

function distPx(map, latlng, nodeLatLng) {
  if (!map) return Infinity
  const a = map.latLngToContainerPoint(latlng)
  const b = map.latLngToContainerPoint(nodeLatLng)
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Snap-assisted polyline drawing for What-if mode.
 * links: [{ id, coordinates: [[lng,lat], ...] }]
 */
export function useWhatIfDrawing(snapNodes) {
  const [tool, setTool] = useState(WHAT_IF_DRAW_TOOLS.pan)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [draftCoords, setDraftCoords] = useState([])
  const [links, setLinks] = useState([])
  const [cursorLatLng, setCursorLatLng] = useState(null)
  const [nextId, setNextId] = useState(1)

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
      setDraftCoords((prev) => [...prev, snapped.lngLat])
    },
    [snapLatLng, tool],
  )

  const finishLink = useCallback(() => {
    if (draftCoords.length < 2) return null
    const id = nextId
    const nextLinks = [...links, { id, coordinates: draftCoords }]
    setNextId((n) => n + 1)
    setLinks(nextLinks)
    setDraftCoords([])
    return {
      type: 'FeatureCollection',
      features: nextLinks.map((link) => ({
        type: 'Feature',
        properties: { id: link.id, name: `Proposed ${link.id}` },
        geometry: { type: 'LineString', coordinates: link.coordinates },
      })),
    }
  }, [draftCoords, links, nextId])

  const undo = useCallback(() => {
    setDraftCoords((prev) => {
      if (prev.length) return prev.slice(0, -1)
      setLinks((linksPrev) => linksPrev.slice(0, -1))
      return prev
    })
  }, [])

  const clearLinks = useCallback(() => {
    setDraftCoords([])
    setLinks([])
  }, [])

  const cancelDraft = useCallback(() => setDraftCoords([]), [])

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

  const exportProposedGeoJson = useCallback(() => {
    return {
      type: 'FeatureCollection',
      features: links.map((link) => ({
        type: 'Feature',
        properties: { id: link.id, name: `Proposed ${link.id}` },
        geometry: { type: 'LineString', coordinates: link.coordinates },
      })),
    }
  }, [links])

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
    clearLinks,
    cancelDraft,
    proposedGeoJson,
    exportProposedGeoJson,
    hasDraft: draftCoords.length > 0,
    hasLinks: links.length > 0,
  }
}
