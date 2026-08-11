import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, Polyline, useMap, useMapEvents } from 'react-leaflet'
import {
  WHAT_IF_DRAW_TOOLS,
  WHAT_IF_NEW_GLOW_COLOR,
  WHAT_IF_SNAP_COLOR,
  WHAT_IF_SNAP_PX,
} from '../../../constants/centralityWhatIf.js'
import { CLOSENESS_RAMP } from '../../../constants/centrality.js'

function distPointToSegPx(map, latlng, aLngLat, bLngLat) {
  const p = map.latLngToContainerPoint(latlng)
  const a = map.latLngToContainerPoint([aLngLat[1], aLngLat[0]])
  const b = map.latLngToContainerPoint([bLngLat[1], bLngLat[0]])
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const qx = a.x + t * dx
  const qy = a.y + t * dy
  return Math.hypot(p.x - qx, p.y - qy)
}

function hitTestLinkId(map, latlng, links, tolPx = 12) {
  if (!map || !links?.length) return null
  let bestId = null
  let bestD = tolPx
  for (const link of links) {
    const coords = link.coordinates
    for (let i = 0; i < coords.length - 1; i++) {
      const d = distPointToSegPx(map, latlng, coords[i], coords[i + 1])
      if (d < bestD) {
        bestD = d
        bestId = link.id
      }
    }
  }
  return bestId
}

function DrawInteraction({
  tool,
  addVertex,
  finishLink,
  cancelDraft,
  setCursorLatLng,
  snapLatLng,
  draftCoords,
  onUndo,
  onRedo,
  links,
  onEraseLink,
  setSnapPreview,
}) {
  const map = useMap()

  useEffect(() => {
    if (tool === WHAT_IF_DRAW_TOOLS.pencil) {
      map.dragging.disable()
      map.doubleClickZoom.disable()
      map.getContainer().style.cursor = 'crosshair'
    } else if (tool === WHAT_IF_DRAW_TOOLS.erase) {
      map.dragging.disable()
      map.doubleClickZoom.disable()
      map.getContainer().style.cursor = 'pointer'
    } else {
      map.dragging.enable()
      map.doubleClickZoom.enable()
      map.getContainer().style.cursor = ''
    }
    return () => {
      map.dragging.enable()
      map.doubleClickZoom.enable()
      map.getContainer().style.cursor = ''
    }
  }, [tool, map])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (tool === WHAT_IF_DRAW_TOOLS.erase) return
        if (draftCoords.length >= 2) finishLink()
        else cancelDraft()
        return
      }
      if (e.key === 'Enter' && draftCoords.length >= 2) finishLink()
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndo?.()
      }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault()
        onRedo?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelDraft, finishLink, draftCoords.length, onUndo, onRedo, tool])

  useMapEvents({
    click(e) {
      if (tool === WHAT_IF_DRAW_TOOLS.erase) {
        const id = hitTestLinkId(map, e.latlng, links)
        if (id != null) onEraseLink?.(id)
        return
      }
      if (tool !== WHAT_IF_DRAW_TOOLS.pencil) return
      addVertex(map, e.latlng)
    },
    dblclick(e) {
      if (tool !== WHAT_IF_DRAW_TOOLS.pencil) return
      e.originalEvent?.preventDefault?.()
      if (draftCoords.length >= 1) {
        addVertex(map, e.latlng)
        finishLink()
      }
    },
    mousemove(e) {
      if (tool === WHAT_IF_DRAW_TOOLS.erase) {
        setCursorLatLng(null)
        setSnapPreview?.(null)
        const id = hitTestLinkId(map, e.latlng, links)
        map.getContainer().style.cursor = id != null ? 'pointer' : 'not-allowed'
        return
      }
      if (tool !== WHAT_IF_DRAW_TOOLS.pencil) {
        setCursorLatLng(null)
        setSnapPreview?.(null)
        return
      }
      const snapped = snapLatLng(map, e.latlng)
      setCursorLatLng(snapped.latlng)
      setSnapPreview?.(snapped.snapped ? { latlng: snapped.latlng, nodeId: snapped.nodeId } : null)
    },
  })

  return null
}

/** Leaflet children: snap nodes, proposed links, rubber-band, draw handlers. */
export default function WhatIfSnapDrawLayer({
  tool,
  snapNodes,
  showSnapNodes,
  proposedGeoJson,
  showProposed,
  draftCoords,
  cursorLatLng,
  addVertex,
  finishLink,
  cancelDraft,
  setCursorLatLng,
  snapLatLng,
  onUndo,
  onRedo,
  links = [],
  onEraseLink,
  /** When true, finished links are shown via ramp+glow layer — only drafts stay dotted. */
  hideFinishedProposed = false,
  /** Legend-ramp color for finished links before sDNA values exist (default: closeness mid). */
  pendingLineColor = CLOSENESS_RAMP.stops[2],
  /** Keep finished lines pickable in erase mode even after sDNA hides the overlay. */
  forceShowFinishedForErase = false,
}) {
  const [snapPreview, setSnapPreview] = useState(null)

  // local state without importing useState at top awkwardly - fix import
  const rubberPositions =
    draftCoords.length && cursorLatLng
      ? [
          [...draftCoords[draftCoords.length - 1]].reverse(),
          cursorLatLng,
        ]
      : null

  const showFinished = !hideFinishedProposed || forceShowFinishedForErase

  const { draftFc, finishedFc } = useMemo(() => {
    const features = proposedGeoJson?.features ?? []
    const drafts = features.filter((f) => f.properties?.draft)
    const finished = showFinished ? features.filter((f) => !f.properties?.draft) : []
    return {
      draftFc: drafts.length ? { type: 'FeatureCollection', features: drafts } : null,
      finishedFc: finished.length ? { type: 'FeatureCollection', features: finished } : null,
    }
  }, [proposedGeoJson, showFinished])

  return (
    <>
      <DrawInteraction
        tool={tool}
        addVertex={addVertex}
        finishLink={finishLink}
        cancelDraft={cancelDraft}
        setCursorLatLng={setCursorLatLng}
        snapLatLng={snapLatLng}
        draftCoords={draftCoords}
        onUndo={onUndo}
        onRedo={onRedo}
        links={links}
        onEraseLink={onEraseLink}
        setSnapPreview={setSnapPreview}
      />

      {showSnapNodes && snapNodes?.features?.length
        ? snapNodes.features
            .filter((f) => {
              const role = f.properties?.role
              return role === 'culdesac' || role === 'junction'
            })
            .map((f) => {
              const [lng, lat] = f.geometry.coordinates
              const cul = f.properties?.role === 'culdesac'
              const previewHit =
                snapPreview &&
                Math.abs(snapPreview.latlng[0] - lat) < 1e-8 &&
                Math.abs(snapPreview.latlng[1] - lng) < 1e-8
              return (
                <CircleMarker
                  key={`snap-${f.properties?.id ?? `${lng}-${lat}`}`}
                  center={[lat, lng]}
                  radius={previewHit ? 7 : cul ? 4 : 3}
                  pathOptions={{
                    color: WHAT_IF_SNAP_COLOR,
                    fillColor: WHAT_IF_SNAP_COLOR,
                    fillOpacity: previewHit ? 1 : cul ? 0.9 : 0.55,
                    weight: previewHit ? 2 : 1,
                    opacity: 0.85,
                  }}
                />
              )
            })
        : null}

      {/* Snap radius hint while pencil + SNAP and hovering a node */}
      {tool === WHAT_IF_DRAW_TOOLS.pencil && snapPreview?.latlng ? (
        <CircleMarker
          center={snapPreview.latlng}
          radius={WHAT_IF_SNAP_PX / 2}
          pathOptions={{
            color: WHAT_IF_SNAP_COLOR,
            fill: false,
            weight: 1,
            opacity: 0.45,
            dashArray: '2 4',
          }}
        />
      ) : null}

      {/* Finished proposals: solid legend-ramp + glow (hidden after sDNA unless erase mode) */}
      {showProposed && finishedFc ? (
        <>
          <GeoJSON
            key={`proposed-finished-glow-${finishedFc.features.length}-${forceShowFinishedForErase}`}
            data={finishedFc}
            style={() => ({
              color: WHAT_IF_NEW_GLOW_COLOR,
              weight: 11,
              opacity: forceShowFinishedForErase ? 0.55 : 0.35,
              lineCap: 'round',
              lineJoin: 'round',
              className: 'whatif-new-segment-glow',
            })}
          />
          <GeoJSON
            key={`proposed-finished-${finishedFc.features.length}-${pendingLineColor}-${forceShowFinishedForErase}`}
            data={finishedFc}
            style={() => ({
              color: pendingLineColor,
              weight: forceShowFinishedForErase ? 6 : 4.5,
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round',
            })}
          />
        </>
      ) : null}

      {showProposed && draftFc ? (
        <GeoJSON
          key={`proposed-draft-${draftFc.features.length}-${draftCoords.length}`}
          data={draftFc}
          style={() => ({
            color: pendingLineColor,
            weight: 3,
            dashArray: '8 6',
            opacity: 0.95,
          })}
        />
      ) : null}

      {rubberPositions ? (
        <Polyline
          positions={rubberPositions}
          pathOptions={{
            color: pendingLineColor,
            weight: 2,
            dashArray: '4 6',
            opacity: 0.85,
          }}
        />
      ) : null}
    </>
  )
}
