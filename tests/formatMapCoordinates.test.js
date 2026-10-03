import { describe, expect, it } from 'vitest'
import { formatMapCoordinates } from '../src/utils/formatMapCoordinates.js'

describe('formatMapCoordinates', () => {
  it('formats lat, lng with six decimals and comma separator', () => {
    expect(formatMapCoordinates(6.841283, 79.866948)).toBe('6.841283, 79.866948')
  })

  it('pads trailing zeros', () => {
    expect(formatMapCoordinates(6.84, 79.8)).toBe('6.840000, 79.800000')
  })

  it('handles negative coordinates', () => {
    expect(formatMapCoordinates(-33.865143, 151.2099)).toBe('-33.865143, 151.209900')
  })

  it('returns empty string for non-finite input', () => {
    expect(formatMapCoordinates(Number.NaN, 1)).toBe('')
    expect(formatMapCoordinates(1, Number.NaN)).toBe('')
  })
})
