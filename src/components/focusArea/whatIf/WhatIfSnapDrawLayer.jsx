import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, Polyline, useMap, useMapEvents } from 'react-leaflet'
import {
  WHAT_IF_DRAW_TOOLS,
  WHAT_IF_PENDING_COLOR,
  WHAT_IF_RUBBER_COLOR,
  WHAT_IF_SNAP_COLOR,
  WHAT_IF_SNAP_PX,
  WHAT_IF_SNAP_STROKE,
} from '../../../constants/centralityWhatIf.js'

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

/** Drawing only on the map surface — ignore off-pane / out-of-bounds events. */
function isDrawEventOnMap(map, e) {
  if (!map || !e?.latlng) return false
  const container = map.getContainer?.()
  const target = e.originalEvent?.target
  if (container && target && !container.contains(target)) return false
  const size = map.getSize?.()
  if (size) {
    const pt = map.latLngToContainerPoint(e.latlng)
    if (pt.x < 0 || pt.y < 0 || pt.x > size.x || pt.y > size.y) return false
  }
  return map.getBounds?.().contains(e.latlng) ?? true
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
  canUndo = false,
  canRedo = false,
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
        if (!canUndo) return
        e.preventDefault()
        onUndo?.()
      }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        if (!canRedo) return
        e.preventDefault()
        onRedo?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelDraft, finishLink, draftCoords.length, onUndo, onRedo, canUndo, canRedo, tool])

  useMapEvents({
    click(e) {
      if (!isDrawEventOnMap(map, e)) return
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
      if (!isDrawEventOnMap(map, e)) return
      e.originalEvent?.preventDefault?.()
      e.originalEvent?.stopPropagation?.()
      // Single atomic finish: append snapped vertex + commit (avoids setState race)
      finishLink(map, e.latlng)
    },
    mousemove(e) {
      if (!isDrawEventOnMap(map, e)) {
        setCursorLatLng(null)
        setSnapPreview?.(null)
        return
      }
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
    mouseout() {
      setCursorLatLng(null)
      setSnapPreview?.(null)
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
  /** When true, finished links are hidden (sDNA map shows them with ramp colors). */
  hideFinishedProposed = false,
  /** Pending stroke only — never a metric ramp colour. */
  pendingLineColor = WHAT_IF_PENDING_COLOR,
  /**
   * Erase mode: show finished link geometry for hit-testing.
   * When scenario is active this is a neutral dashed pick target — not a fake ramp / branding color.
   */
  forceShowFinishedForErase = false,
  canUndo = false,
  canRedo = false,
}) {
  const [snapPreview, setSnapPreview] = useState(null)

  const rubberPositions =
    draftCoords.length && cursorLatLng
      ? [
          [...draftCoords[draftCoords.length - 1]].reverse(),
          cursorLatLng,
        ]
      : null

  const showFinished = !hideFinishedProposed || forceShowFinishedForErase
  const erasePickOnly = hideFinishedProposed && forceShowFinishedForErase
  const finishedKey = (links ?? []).map((l) => l.id).join('-') || 'none'
  const draftKey = draftCoords.map((c) => `${c[0]},${c[1]}`).join(';') || 'empty'

  const { draftFc, finishedFc } = useMemo(() => {
    const features = proposedGeoJson?.features ?? []
    const drafts = features.filter((f) => f.properties?.draft)
    const finished = showFinished ? features.filter((f) => !f.properties?.draft) : []
    return {
      draftFc: drafts.length ? { type: 'FeatureCollection', features: drafts } : null,
      finishedFc: finished.length ? { type: 'FeatureCollection', features: finished } : null,
    }
  }, [proposedGeoJson, showFinished])

  const firstVertex =
    draftCoords.length === 1 ? [draftCoords[0][1], draftCoords[0][0]] : null

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
        canUndo={canUndo}
        canRedo={canRedo}
        links={links}
        onEraseLink={onEraseLink}
        setSnapPreview={setSnapPreview}
      />

      {/* Always-on snap nodes (small magenta dots) while What-if layer is enabled */}
      {showSnapNodes && snapNodes?.features?.length
        ? snapNodes.features
            .filter((f) => {
              const role = f.properties?.role
              return role === 'culdesac' || role === 'junction'
            })
            .map((f) => {
              const [lng, lat] = f.geometry.coordinates
              const cul = f.properties?.role === 'culdesac'
              const drawing = tool === WHAT_IF_DRAW_TOOLS.pencil
              const previewHit =
                drawing &&
                snapPreview &&
                Math.abs(snapPreview.latlng[0] - lat) < 1e-8 &&
                Math.abs(snapPreview.latlng[1] - lng) < 1e-8
              return (
                <CircleMarker
                  key={`snap-${f.properties?.id ?? `${lng}-${lat}`}`}
                  center={[lat, lng]}
                  radius={previewHit ? 5 : cul ? 2.5 : 2}
                  pathOptions={{
                    color: WHAT_IF_SNAP_STROKE,
                    fillColor: WHAT_IF_SNAP_COLOR,
                    fillOpacity: previewHit ? 1 : drawing ? (cul ? 0.95 : 0.85) : 0.75,
                    weight: previewHit ? 2 : 1.25,
                    opacity: 1,
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
            weight: 1.5,
            opacity: 0.55,
            dashArray: '2 4',
          }}
        />
      ) : null}

      {/*
        Finished proposals — pending only (pre-sDNA). After activeScenario these are hidden;
        color comes from scenario GeoJSON + colorForValue. Erase may show dashed pick targets.
      */}
      {showProposed && finishedFc ? (
        erasePickOnly ? (
          <GeoJSON
            key={`proposed-erase-pick-${finishedKey}`}
            data={finishedFc}
            style={() => ({
              color: pendingLineColor,
              weight: 8,
              opacity: 0.35,
              dashArray: '6 8',
              lineCap: 'round',
              lineJoin: 'round',
            })}
          />
        ) : (
          <GeoJSON
            key={`proposed-finished-pending-${finishedKey}-${pendingLineColor}`}
            data={finishedFc}
            style={() => ({
              color: pendingLineColor,
              weight: 3.5,
              opacity: 0.95,
              dashArray: '8 6',
              lineCap: 'round',
              lineJoin: 'round',
            })}
          />
        )
      ) : null}

      {showProposed && draftFc ? (
        <GeoJSON
          key={`proposed-draft-${draftKey}`}
          data={draftFc}
          style={() => ({
            color: pendingLineColor,
            weight: 3,
            dashArray: '8 6',
            opacity: 0.95,
          })}
        />
      ) : null}

      {firstVertex ? (
        <CircleMarker
          center={firstVertex}
          radius={4}
          pathOptions={{
            color: WHAT_IF_SNAP_STROKE,
            fillColor: pendingLineColor,
            fillOpacity: 0.95,
            weight: 1.5,
            opacity: 1,
          }}
        />
      ) : null}

      {rubberPositions ? (
        <Polyline
          positions={rubberPositions}
          pathOptions={{
            color: WHAT_IF_RUBBER_COLOR,
            weight: 2,
            dashArray: '4 6',
            opacity: 0.85,
          }}
        />
      ) : null}
    </>
  )
}
