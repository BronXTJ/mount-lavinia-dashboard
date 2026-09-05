import { Fragment } from 'react'
import { GeoJSON } from 'react-leaflet'
import { COMPARE_SLOT_COLORS, COMPARE_SLOT_HALO } from '../../../../constants/whatIfCompare.js'

function linksToCollection(links) {
  return {
    type: 'FeatureCollection',
    features: (links ?? [])
      .filter((l) => (l.coordinates ?? []).length >= 2)
      .map((link) => ({
        type: 'Feature',
        properties: { id: link.id },
        geometry: { type: 'LineString', coordinates: link.coordinates },
      })),
  }
}

/** Overlay all Compare option geometries; active slot is brighter. */
export default function WhatIfCompareOptionsLayer({ slots, activeId, openedCount }) {
  const ids = ['A', 'B', 'C'].slice(0, openedCount)
  return (
    <>
      {ids.map((id) => {
        const slot = slots[id]
        const data = linksToCollection(slot?.links)
        if (!data.features.length) return null
        const color = COMPARE_SLOT_COLORS[id].line
        const active = id === activeId
        const dashArray = active ? null : '6 4'
        return (
          <Fragment key={`compare-opt-${id}-${data.features.length}-${slot?.status}`}>
            <GeoJSON
              data={data}
              style={{
                color: COMPARE_SLOT_HALO,
                weight: active ? 8 : 6,
                opacity: 0.7,
                dashArray,
              }}
            />
            <GeoJSON
              data={data}
              style={{
                color,
                weight: active ? 6 : 4,
                opacity: active ? 1 : 0.55,
                dashArray,
              }}
            />
          </Fragment>
        )
      })}
    </>
  )
}
