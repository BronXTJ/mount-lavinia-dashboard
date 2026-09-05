import { describe, expect, it } from 'vitest'
import { centralityGeoUrl, boundaryGeoUrl, scaleLabel } from '../src/constants/centrality.js'
import { walkGeoUrl, walkContextGeoUrl, classifyWalkAccessTier } from '../src/constants/walkAccessibility.js'
import { densityGeoUrl } from '../src/constants/density.js'
import { maturationGeoUrl } from '../src/constants/maturation.js'
import { environmentalGeoUrl } from '../src/constants/environmental.js'
import { networkFormGeoUrl } from '../src/constants/networkForm.js'
import { landCoverUrl } from '../src/constants/landCover.js'
import { whatIfDataUrl, whatIfScenarioUrl } from '../src/constants/centralityWhatIf.js'
import { getCartoDarkTileUrl } from '../src/constants/basemaps.js'

const base = import.meta.env.BASE_URL

describe('URL builders', () => {
  it('builds centrality and boundary URLs under the Vite base', () => {
    expect(centralityGeoUrl('closeness_500.geojson')).toBe(
      `${base}data/urban-morpho/centrality/closeness_500.geojson`,
    )
    expect(boundaryGeoUrl(2000)).toBe(`${base}data/urban-morpho/boundary_2000m.geojson`)
  })

  it('builds walk, density, maturation, environmental, and network-form URLs', () => {
    expect(walkGeoUrl('hex.geojson')).toBe(`${base}data/walk-accessibility/hex.geojson`)
    expect(walkContextGeoUrl('hex.geojson')).toBe(`${base}data/density-analysis/hex.geojson`)
    expect(densityGeoUrl('hex.geojson')).toBe(`${base}data/density-analysis/hex.geojson`)
    expect(maturationGeoUrl('umi.geojson')).toBe(`${base}data/urban-morpho/urban-maturation/umi.geojson`)
    expect(environmentalGeoUrl('utci.geojson')).toBe(`${base}data/environmental-analysis/utci.geojson`)
    expect(networkFormGeoUrl('streets.geojson')).toBe(`${base}data/network-form/streets.geojson`)
  })

  it('strips a leading slash on land-cover paths', () => {
    expect(landCoverUrl('/maps/classified_y2025.png')).toBe(
      `${base}data/land-cover-change/maps/classified_y2025.png`,
    )
  })

  it('builds what-if data URLs', () => {
    expect(whatIfDataUrl('proposed.geojson')).toBe(`${base}data/urban-morpho/what-if/proposed.geojson`)
    expect(whatIfScenarioUrl('beach', 'closeness.geojson')).toBe(
      `${base}data/urban-morpho/what-if/scenarios/beach/closeness.geojson`,
    )
  })

  it('uses the CARTO dark tile URL, and appends a key only when one is configured', () => {
    const url = getCartoDarkTileUrl()
    expect(url.startsWith('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')).toBe(true)
    if (import.meta.env.VITE_CARTO_API_KEY) {
      expect(url).toContain('key=')
    } else {
      expect(url).toBe('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
    }
  })

  it('labels known centrality scales', () => {
    expect(scaleLabel(500)).toContain('500m')
    expect(scaleLabel(999)).toBe('999m')
  })

  it('classifies walk access tiers with an excluded fallback', () => {
    expect(classifyWalkAccessTier('high').id).toBe('high')
    expect(classifyWalkAccessTier('unknown').id).toBe('excluded')
  })
})
