const cache = new Map()
const inFlight = new Map()

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
  if (useCache && cache.has(url)) {
    return cache.get(url)
  }

  const existing = inFlight.get(url)
  if (existing) {
    return existing
  }

  const request = (async () => {
    let res
    try {
      res = await fetch(url, { signal })
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      throw new DataClientError(err?.message || 'Network error', { url })
    }
    if (!res.ok) {
      throw new DataClientError(`${res.status} ${res.statusText}`, { url, status: res.status })
    }
    const data = await res.json()
    if (useCache) cache.set(url, data)
    return data
  })()

  inFlight.set(url, request)
  try {
    return await request
  } finally {
    if (inFlight.get(url) === request) inFlight.delete(url)
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
