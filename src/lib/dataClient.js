import assetManifest from '../data/assetManifest.json'

const cache = new Map()
const inFlight = new Map()

/** Append `?v=<sha256-12>` for same-origin `/data/...` files listed in the asset manifest. */
export function withAssetVersion(url) {
  if (!url || url.startsWith('http://') || url.startsWith('https://')) return url
  if (/[?&]v=/.test(url)) return url
  const base = import.meta.env.BASE_URL || '/'
  let path = url.startsWith(base) ? url.slice(base.length) : url.replace(/^\//, '')
  path = path.replace(/^mount-lavinia-dashboard\//, '')
  const rel = path.replace(/^data\//, '')
  const hash = assetManifest.files?.[rel]
  if (!hash) return url
  return url.includes('?') ? `${url}&v=${hash}` : `${url}?v=${hash}`
}

export class DataClientError extends Error {
  constructor(message, { url, status } = {}) {
    super(message)
    this.name = 'DataClientError'
    this.url = url
    this.status = status
  }
}

export function clearDataClientCache() {
  cache.clear()
  inFlight.clear()
}

/**
 * JSON fetch with URL-keyed cache and in-flight promise dedupe.
 * Pass `{ cache: false }` for live endpoints (weather).
 */
export async function fetchJson(url, { signal, cache: useCache = true } = {}) {
  const resolved = withAssetVersion(url)
  if (useCache && cache.has(resolved)) {
    return cache.get(resolved)
  }

  const existing = inFlight.get(resolved)
  if (existing) {
    return existing
  }

  const request = (async () => {
    let res
    try {
      res = await fetch(resolved, { signal })
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      throw new DataClientError(err?.message || 'Network error', { url })
    }
    if (!res.ok) {
      throw new DataClientError(`${res.status} ${res.statusText}`, { url, status: res.status })
    }
    const data = await res.json()
    if (useCache) cache.set(resolved, data)
    return data
  })()

  inFlight.set(resolved, request)
  try {
    return await request
  } finally {
    if (inFlight.get(resolved) === request) inFlight.delete(resolved)
  }
}

/** Same as fetchJson, but missing/failed files resolve to null — the old hook contract. */
export async function fetchJsonOrNull(url, opts) {
  try {
    return await fetchJson(url, opts)
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    return null
  }
}
