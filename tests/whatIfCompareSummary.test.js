import { describe, expect, it } from 'vitest'
import { compareScalePhrase, gainPer100m } from '../src/utils/whatIfCompareSummary.js'

describe('whatIfCompareSummary', () => {
  it('names known scales in plain language', () => {
    expect(compareScalePhrase(500)).toBe('walking scale (500 m)')
    expect(compareScalePhrase(2000)).toBe('neighbourhood scale (2000 m)')
    expect(compareScalePhrase(3000)).toBe('district scale (3000 m)')
    expect(compareScalePhrase(5000)).toBe('regional scale (5000 m)')
    expect(compareScalePhrase(4000)).toMatch(/4000/)
  })

  it('returns closeness gain per 100 m of new street', () => {
    expect(gainPer100m(0.4, 200)).toBeCloseTo(0.2)
    expect(gainPer100m(0.4, 0)).toBeNull()
    expect(gainPer100m(null, 200)).toBeNull()
  })
})
