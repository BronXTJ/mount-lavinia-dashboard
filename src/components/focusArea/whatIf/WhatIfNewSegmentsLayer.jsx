import { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import { colorForValue, getMetricValue } from '../../../utils/centralityStats.js'
import { WHAT_IF_NEW_GLOW_COLOR } from '../../../constants/centralityWhatIf.js'

/**
 * After sDNA, newly added segments: exact ramp color via colorForValue (same as main
 * network layer) + soft outer glow so they stay identifiable.
 * `geojson` / `stats` must be the same scenario layers passed to CentralityMap.
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
      const id = Number(f.properties?.ID)
      return Number.isFinite(id) && newSegmentIds.has(id)
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
        key={`whatif-new-glow-${metric}-${scaleMeters}-${data.features.length}-${stats?.min ?? 'x'}-${stats?.max ?? 'x'}`}
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
        key={`whatif-new-line-${metric}-${scaleMeters}-${data.features.length}-${stats?.min ?? 'x'}-${stats?.max ?? 'x'}`}
        data={data}
        style={lineStyle}
        renderer={renderer}
      />
    </>
  )
}
