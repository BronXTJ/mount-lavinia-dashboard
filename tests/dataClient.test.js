import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearDataClientCache, DataClientError, fetchJson, fetchJsonOrNull } from '../src/lib/dataClient.js'

afterEach(() => {
  clearDataClientCache()
  vi.unstubAllGlobals()
})

describe('dataClient', () => {
  it('caches successful JSON and dedupes in-flight requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ n: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([fetchJson('/one.json'), fetchJson('/one.json')])
    expect(a).toEqual({ n: 1 })
    expect(b).toEqual({ n: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await fetchJson('/one.json')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws DataClientError on HTTP failure and returns null from fetchJsonOrNull', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }),
    )
    await expect(fetchJson('/missing.json')).rejects.toBeInstanceOf(DataClientError)
    await expect(fetchJsonOrNull('/missing.json')).resolves.toBeNull()
  })
})
