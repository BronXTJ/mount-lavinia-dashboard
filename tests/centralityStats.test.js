import { describe, expect, it } from 'vitest'
import {
  colorForSignedDelta,
  colorForValue,
  formatMetricValue,
  getMetricValue,
  interpretCentrality,
  segmentLabel,
  summarizeGeoJson,
} from '../src/utils/centralityStats.js'

describe('centralityStats', () => {
  it('reads closeness and betweenness property keys', () => {
    expect(getMetricValue({ NQPDA500: 1.25 }, 'closeness', 500)).toBe(1.25)
    expect(getMetricValue({ BtA2000: 40 }, 'betweenness', 2000)).toBe(40)
    expect(getMetricValue({ value: 9 }, 'closeness', 500)).toBe(9)
    expect(getMetricValue(null, 'closeness', 500)).toBeNull()
  })

  it('formats values and labels', () => {
    expect(formatMetricValue(null)).toBe('—')
    expect(formatMetricValue(1.23456)).toBe('1.2346')
    expect(segmentLabel({ name: 'Galle Road' })).toBe('Galle Road')
    expect(segmentLabel({ ID: 12.2 })).toBe('Seg 12')
    expect(segmentLabel(null)).toBe('Road segment')
  })

  it('interprets high / moderate / low tiers', () => {
    expect(interpretCentrality(10, 0, 10).tier).toBe('High')
    expect(interpretCentrality(5, 0, 10).tier).toBe('Moderate')
    expect(interpretCentrality(1, 0, 10).tier).toBe('Low')
    expect(interpretCentrality(null, 0, 10).tier).toBe('Unknown')
  })

  it('returns a fallback colour when the range is missing', () => {
    expect(colorForValue(1, null, 2, 'closeness')).toBe('#9fadb9')
  })

  it('colours signed deltas green / grey / red', () => {
    expect(colorForSignedDelta(null, 1)).toBe('#94a3b8')
    expect(colorForSignedDelta(0, 1)).toBe('#94a3b8')
    expect(colorForSignedDelta(1, 1)).toBe('#22c55e')
    expect(colorForSignedDelta(-1, 1)).toBe('#ef4444')
  })

  it('summarises a small FeatureCollection', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        { properties: { ID: 1, NQPDA500: 2 }, geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
        { properties: { ID: 2, NQPDA500: 4 }, geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
      ],
    }
    const summary = summarizeGeoJson(geojson, 'closeness', 500)
    expect(summary.min).toBe(2)
    expect(summary.max).toBe(4)
    expect(summary.avg).toBe(3)
    expect(summary.top5).toHaveLength(2)
  })
})
