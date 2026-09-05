import { describe, expect, it } from 'vitest'
import {
  formatWalkMinutes,
  formatWalkPct,
  formatWalkScore,
  summarizeMetric,
} from '../src/utils/walkAccessibilityStats.js'

function hex(id, props) {
  return { properties: { id, ...props } }
}

describe('walkAccessibilityStats', () => {
  it('formats scores, minutes, and percents', () => {
    expect(formatWalkScore(undefined)).toBe('—')
    expect(formatWalkScore(Number.NaN)).toBe('—')
    expect(formatWalkScore(0.1234)).toBe('0.123')
    expect(formatWalkScore(12.34)).toBe('12.3')
    expect(formatWalkScore(123.4)).toBe('123')
    expect(formatWalkMinutes(8.25)).toBe('8.3 min')
    expect(formatWalkPct(0.251)).toBe('25.1%')
  })

  it('summarises a numeric property across hexes', () => {
    const features = [
      hex(11, { access_score: 0.2 }),
      hex(22, { access_score: 0.8 }),
      hex(33, { access_score: 'x' }),
    ]
    const summary = summarizeMetric(features, 'access_score')
    expect(summary.min).toBe(0.2)
    expect(summary.max).toBe(0.8)
    expect(summary.avg).toBeCloseTo(0.5)
    expect(summary.lowestId).toBe(11)
    expect(summary.highestId).toBe(22)
  })
})
