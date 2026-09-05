import { describe, expect, it } from 'vitest'
import { safeHttpUrl } from '../src/utils/safeHttpUrl.js'

describe('safeHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(safeHttpUrl('https://example.com/a')).toBe('https://example.com/a')
    expect(safeHttpUrl('http://127.0.0.1:8787/health')).toBe('http://127.0.0.1:8787/health')
  })

  it('rejects javascript and other schemes', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('data:text/html,hi')).toBeNull()
    expect(safeHttpUrl('')).toBeNull()
    expect(safeHttpUrl(null)).toBeNull()
  })
})
