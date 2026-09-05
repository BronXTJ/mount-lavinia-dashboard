import { describe, expect, it } from 'vitest'
import { escapeHtml } from '../src/utils/cellPopup.js'

describe('escapeHtml', () => {
  it('escapes markup and quotes', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    )
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('stringifies nullish values', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(12)).toBe('12')
  })
})
