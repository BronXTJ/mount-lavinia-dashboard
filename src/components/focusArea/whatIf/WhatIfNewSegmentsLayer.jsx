import { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import { colorForValue, getMetricValue } from '../../../utils/centralityStats.js'
import { WHAT_IF_NEW_GLOW_COLOR } from '../../../constants/centralityWhatIf.js'

/**
 * After sDNA, newly added segments: solid ramp color + soft outer glow so they stay identifiable.
 */
export default function WhatIfNewSegmentsLayer({
  geojson,
  newSegmentIds,
  metric,
  scaleMeters,
  stats,
  renderer,
}) {
  const data = useMemo(() => {
    if (!geojson?.features?.length || !newSegmentIds?.size) return null
    const features = geojson.features.filter((f) => {
      const id = f.properties?.ID
      return newSegmentIds.has(id) || newSegmentIds.has(Number(id))
    })
    if (!features.length) return null
    return { type: 'FeatureCollection', features }
  }, [geojson, newSegmentIds])

  const lineStyle = useMemo(
    () => (feature) => {
      const value = getMetricValue(feature.properties, metric, scaleMeters)
      return {
        color: colorForValue(value, stats?.min, stats?.max, metric),
        weight: 4.5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }
    },
    [metric, scaleMeters, stats],
  )

  if (!data) return null

  return (
    <>
      <GeoJSON
        key={`whatif-new-glow-${metric}-${scaleMeters}-${data.features.length}`}
        data={data}
        style={() => ({
          color: WHAT_IF_NEW_GLOW_COLOR,
          weight: 12,
          opacity: 0.4,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'whatif-new-segment-glow',
        })}
        renderer={renderer}
      />
      <GeoJSON
        key={`whatif-new-line-${metric}-${scaleMeters}-${data.features.length}`}
        data={data}
        style={lineStyle}
        renderer={renderer}
      />
    </>
  )
}
