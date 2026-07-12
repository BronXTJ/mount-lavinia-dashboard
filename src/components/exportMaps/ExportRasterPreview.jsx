import { useEffect, useState } from 'react'
import { ImageOverlay, MapContainer, TileLayer, useMap } from 'react-leaflet'
import { fromArrayBuffer } from 'geotiff'
import proj4 from 'proj4'
import { CENTRALITY_MAP_CENTER, CENTRALITY_MAP_ZOOM } from '../../constants/centrality.js'
import MapInvalidateOnResize from '../MapInvalidateOnResize.jsx'

const PREVIEW_MAX_EDGE = 768

/** Same SLD99 definition as scripts/prepare-data.mjs (EPSG:5235). */
const SLD99 =
  '+proj=tmerc +lat_0=7.00047152777778 +lon_0=80.7717130833333 +k=0.9999238418 +x_0=500000 +y_0=500000 +a=6377276.345 +rf=300.8017 +units=m +no_defs'
const WGS84 = 'EPSG:4326'

const TERRAIN_STOPS = [
  [32, 76, 107],
  [52, 148, 120],
  [180, 210, 120],
  [230, 200, 140],
  [250, 250, 250],
]

const ASPECT_STOPS = [
  [59, 130, 246],
  [34, 211, 238],
  [74, 222, 128],
  [250, 204, 21],
  [249, 115, 22],
  [239, 68, 68],
  [59, 130, 246],
]

/** Matches ENV_METRIC_RAMPS.shadow in environmental.js */
const SHADOW_STOPS = [
  [245, 235, 232],
  [228, 208, 203],
  [167, 138, 127],
  [122, 95, 86],
  [79, 60, 54],
  [44, 33, 30],
]

function isNoData(value, nodata) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return true
  if (nodata == null || Number.isNaN(Number(nodata))) {
    return Math.abs(value) > 1e30
  }
  const nd = Number(nodata)
  if (!Number.isFinite(nd)) return Math.abs(value) > 1e30
  return Math.abs(value - nd) < 1e-6 || (Math.abs(nd) > 1e30 && Math.abs(value) > 1e30)
}

function lerpColor(stops, t) {
  const clamped = Math.max(0, Math.min(1, t))
  const scaled = clamped * (stops.length - 1)
  const idx = Math.min(Math.floor(scaled), stops.length - 2)
  const local = scaled - idx
  const a = stops[idx]
  const b = stops[idx + 1]
  return [
    Math.round(a[0] + (b[0] - a[0]) * local),
    Math.round(a[1] + (b[1] - a[1]) * local),
    Math.round(a[2] + (b[2] - a[2]) * local),
  ]
}

function isSld99GeoTiff(image) {
  const keys = image.getGeoKeys?.() ?? {}
  if (keys.ProjectedCSTypeGeoKey === 5235) return true
  const citation = `${keys.GTCitationGeoKey ?? ''} ${keys.GeogCitationGeoKey ?? ''}`
  return /SLD99/i.test(citation)
}

/** Leaflet [[south, west], [north, east]] from GeoTIFF bbox, reprojecting SLD99 → WGS84 when needed. */
function leafletBoundsFromGeoTiff(image) {
  const bbox = image.getBoundingBox()
  let minX = bbox[0]
  let minY = bbox[1]
  let maxX = bbox[2]
  let maxY = bbox[3]

  if (isSld99GeoTiff(image)) {
    const corners = [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[1]],
      [bbox[2], bbox[3]],
      [bbox[0], bbox[3]],
    ].map(([x, y]) => proj4(SLD99, WGS84, [x, y]))

    minX = Math.min(...corners.map((c) => c[0]))
    maxX = Math.max(...corners.map((c) => c[0]))
    minY = Math.min(...corners.map((c) => c[1]))
    maxY = Math.max(...corners.map((c) => c[1]))
  }

  return [
    [minY, minX],
    [maxY, maxX],
  ]
}

function buildPreviewImage(band, width, height, nodata, itemId) {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < band.length; i += 1) {
    const value = band[i]
    if (isNoData(value, nodata)) continue
    if (value < min) min = value
    if (value > max) max = value
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Raster has no valid values to display')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(width, height)
  const { data } = imageData
  const span = max - min || 1
  const aspectMode = itemId === 'env-wall-aspect'
  const shadowMode = itemId === 'env-shadow'
  const stops = aspectMode ? ASPECT_STOPS : shadowMode ? SHADOW_STOPS : TERRAIN_STOPS

  for (let i = 0; i < band.length; i += 1) {
    const value = band[i]
    const px = i * 4
    if (isNoData(value, nodata)) {
      data[px + 3] = 0
      continue
    }
    const t = aspectMode ? ((((value % 360) + 360) % 360) / 360) : (value - min) / span
    const [r, g, b] = lerpColor(stops, t)
    data[px] = r
    data[px + 1] = g
    data[px + 2] = b
    data[px + 3] = 220
  }

  ctx.putImageData(imageData, 0, 0)
  return {
    url: canvas.toDataURL('image/png'),
    min,
    max,
  }
}

function RasterFitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (!bounds) return
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17, animate: false })
  }, [bounds, map])
  return null
}

export default function ExportRasterPreview({ url, itemId }) {
  const [overlay, setOverlay] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setOverlay(null)

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load raster (${response.status})`)
        return response.arrayBuffer()
      })
      .then(async (buffer) => {
        const tiff = await fromArrayBuffer(buffer)
        const image = await tiff.getImage()
        const width = image.getWidth()
        const height = image.getHeight()
        const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(width, height))
        const previewW = Math.max(1, Math.round(width * scale))
        const previewH = Math.max(1, Math.round(height * scale))
        // nearest keeps nodata cells from bleeding into the color ramp
        const rasters = await image.readRasters({
          width: previewW,
          height: previewH,
          resampleMethod: 'nearest',
        })
        const band = rasters[0]
        const nodata = image.getGDALNoData()
        const { url: dataUrl, min, max } = buildPreviewImage(
          band,
          previewW,
          previewH,
          nodata,
          itemId,
        )
        const bounds = leafletBoundsFromGeoTiff(image)
        if (!cancelled) {
          setOverlay({ dataUrl, bounds, min, max })
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load raster')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [url, itemId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] max-h-[70vh] items-center justify-center rounded-lg border border-surface-700 bg-surface-900">
        <p className="text-sm text-surface-300">Loading raster…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] max-h-[70vh] items-center justify-center rounded-lg border border-surface-700 bg-surface-900 p-6">
        <p className="text-center text-sm text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] max-h-[70vh] flex-col gap-2">
      <p className="text-xs text-surface-400">
        Simplified interactive raster preview
        {overlay ? (
          <>
            {' '}
            · range {overlay.min.toFixed(2)} – {overlay.max.toFixed(2)}
          </>
        ) : null}
      </p>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-surface-700">
        <MapContainer
          center={CENTRALITY_MAP_CENTER}
          zoom={CENTRALITY_MAP_ZOOM}
          className="h-full min-h-[48vh] w-full"
          scrollWheelZoom
        >
          <MapInvalidateOnResize />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <ImageOverlay url={overlay.dataUrl} bounds={overlay.bounds} opacity={0.9} />
          <RasterFitBounds bounds={overlay.bounds} />
        </MapContainer>
      </div>
    </div>
  )
}
