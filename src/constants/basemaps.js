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

export function getAppBasemap(basemapId) {
  return APP_BASEMAPS.find((b) => b.id === basemapId) ?? APP_BASEMAPS[0]
}
