import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearDataClientCache,
  DataClientError,
  fetchJson,
  fetchJsonOrNull,
  withAssetVersion,
} from '../src/lib/dataClient.js'
import assetManifest from '../src/data/assetManifest.json'

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

  it('appends ?v= for known public/data assets and leaves others unchanged', async () => {
    const hash = assetManifest.files['geo/pois.geojson']
    expect(hash).toMatch(/^[0-9a-f]{12}$/)
    expect(withAssetVersion('/data/geo/pois.geojson')).toBe(`/data/geo/pois.geojson?v=${hash}`)
    expect(withAssetVersion(`/mount-lavinia-dashboard/data/geo/pois.geojson`)).toBe(
      `/mount-lavinia-dashboard/data/geo/pois.geojson?v=${hash}`,
    )
    expect(withAssetVersion(`/data/geo/pois.geojson?v=${hash}`)).toBe(`/data/geo/pois.geojson?v=${hash}`)
    expect(withAssetVersion('https://example.com/a.json')).toBe('https://example.com/a.json')
    expect(withAssetVersion('/one.json')).toBe('/one.json')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)
    await fetchJson('/data/geo/pois.geojson')
    expect(fetchMock).toHaveBeenCalledWith(`/data/geo/pois.geojson?v=${hash}`, expect.any(Object))
  })
})
