import { useEffect } from 'react'
import { CircleMarker, GeoJSON, Polyline, useMap, useMapEvents } from 'react-leaflet'
import {
  WHAT_IF_DRAW_TOOLS,
  WHAT_IF_PROPOSED_COLOR,
  WHAT_IF_RUBBER_COLOR,
  WHAT_IF_SNAP_COLOR,
} from '../../../constants/centralityWhatIf.js'

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
}) {
  const map = useMap()

  useEffect(() => {
    if (tool === WHAT_IF_DRAW_TOOLS.pencil) {
      map.dragging.disable()
      map.doubleClickZoom.disable()
      map.getContainer().style.cursor = 'crosshair'
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
      if (e.key === 'Escape') cancelDraft()
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
  }, [cancelDraft, finishLink, draftCoords.length, onUndo, onRedo])

  useMapEvents({
    click(e) {
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
      if (tool !== WHAT_IF_DRAW_TOOLS.pencil) {
        setCursorLatLng(null)
        return
      }
      const snapped = snapLatLng(map, e.latlng)
      setCursorLatLng(snapped.latlng)
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
  /** When true, finished links are shown via ramp+glow layer — only drafts stay dotted. */
  hideFinishedProposed = false,
}) {
  const rubberPositions =
    draftCoords.length && cursorLatLng
      ? [
          [...draftCoords[draftCoords.length - 1]].reverse(),
          cursorLatLng,
        ]
      : null

  const overlayGeoJson = (() => {
    if (!proposedGeoJson?.features?.length) return null
    if (!hideFinishedProposed) return proposedGeoJson
    const features = proposedGeoJson.features.filter((f) => f.properties?.draft)
    if (!features.length) return null
    return { type: 'FeatureCollection', features }
  })()

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
              return (
                <CircleMarker
                  key={`snap-${f.properties?.id ?? `${lng}-${lat}`}`}
                  center={[lat, lng]}
                  radius={cul ? 4 : 3}
                  pathOptions={{
                    color: WHAT_IF_SNAP_COLOR,
                    fillColor: WHAT_IF_SNAP_COLOR,
                    fillOpacity: cul ? 0.9 : 0.55,
                    weight: 1,
                    opacity: 0.85,
                  }}
                />
              )
            })
        : null}

      {showProposed && overlayGeoJson?.features?.length ? (
        <GeoJSON
          key={`proposed-${overlayGeoJson.features.length}-${draftCoords.length}-${hideFinishedProposed}`}
          data={overlayGeoJson}
          style={(feature) => ({
            color: feature?.properties?.draft ? WHAT_IF_RUBBER_COLOR : WHAT_IF_PROPOSED_COLOR,
            weight: feature?.properties?.draft ? 3 : 4,
            dashArray: '8 6',
            opacity: 0.95,
          })}
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
