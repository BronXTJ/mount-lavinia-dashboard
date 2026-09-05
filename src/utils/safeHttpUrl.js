/**
 * Allow only http(s) URLs for href attributes.
 * Returns null for javascript:, data:, and other unsafe schemes.
 */
export function safeHttpUrl(value) {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw) return null
  try {
    const url = new URL(raw, 'https://bronxtj.github.io')
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}
