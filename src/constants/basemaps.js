/** Shared Streets / Esri satellite basemap options for Leaflet maps. */

export const APP_BASEMAPS = [
  {
    id: 'streets',
    label: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
]

/** Default for Overview / Density / Maturation / Environmental. */
export const DEFAULT_APP_BASEMAP = 'streets'

/** Network Form — Dark Matter (default) + Streets (Carto light). */
export const NETWORK_FORM_BASEMAPS = [
  {
    id: 'dark',
    label: 'Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  {
    id: 'streets',
    label: 'Streets',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
]

export const DEFAULT_NETWORK_FORM_BASEMAP = 'dark'

export function getAppBasemap(basemapId) {
  return APP_BASEMAPS.find((b) => b.id === basemapId) ?? APP_BASEMAPS[0]
}

export function getNetworkFormBasemap(basemapId) {
  return (
    NETWORK_FORM_BASEMAPS.find((b) => b.id === basemapId) ??
    NETWORK_FORM_BASEMAPS.find((b) => b.id === DEFAULT_NETWORK_FORM_BASEMAP) ??
    NETWORK_FORM_BASEMAPS[0]
  )
}
