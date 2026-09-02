import { getMetricValue } from './centralityStats.js'

/** Buffer around proposed links for the Nearby Δ list. */
export const NEARBY_DELTA_METERS = 500

const EARTH_M = 6371000
const DEG_LAT_M = 111_320

function toRad(d) {
  return (d * Math.PI) / 180
}

function haversineM(lng1, lat1, lng2, lat2) {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

function flattenLineCoords(geometry) {
  if (!geometry) return []
  if (geometry.type === 'LineString') return geometry.coordinates ?? []
  if (geometry.type === 'MultiLineString') return (geometry.coordinates ?? []).flat()
  return []
}

function subsample(coords, maxPts = 24) {
  if (coords.length <= maxPts) return coords
  const step = (coords.length - 1) / (maxPts - 1)
  const out = []
  for (let i = 0; i < maxPts; i += 1) {
    out.push(coords[Math.round(i * step)])
  }
  return out
}

function proposedPointCloud(links) {
  const pts = []
  for (const link of links ?? []) {
    const coords = subsample(link.coordinates ?? [])
    for (const c of coords) {
      if (Array.isArray(c) && c.length >= 2) pts.push(c)
    }
  }
  return pts
}

function proposedBBox(pts, radiusM) {
  if (!pts.length) return null
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of pts) {
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }
  const padLat = radiusM / DEG_LAT_M
  const cos = Math.max(0.2, Math.cos(toRad((minLat + maxLat) / 2)))
  const padLng = radiusM / (DEG_LAT_M * cos)
  return {
    minLng: minLng - padLng,
    minLat: minLat - padLat,
    maxLng: maxLng + padLng,
    maxLat: maxLat + padLat,
  }
}

function coordsInBBox(coords, bbox) {
  for (const c of coords) {
    const lng = c[0]
    const lat = c[1]
    if (lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat) {
      return true
    }
  }
  return false
}

function minDistToProposedM(coords, proposedPts) {
  let min = Infinity
  const sampled = subsample(coords)
  for (const a of sampled) {
    for (const b of proposedPts) {
      const d = haversineM(a[0], a[1], b[0], b[1])
      if (d < min) min = d
      if (min === 0) return 0
    }
  }
  return min
}

function collectNearbyRows({
  links,
  baseline,
  scenario,
  metric,
  scaleMeters,
  radiusM = NEARBY_DELTA_METERS,
}) {
  const proposedPts = proposedPointCloud(links)
  if (!proposedPts.length || !baseline?.features?.length || !scenario?.features?.length) {
    return []
  }

  const bbox = proposedBBox(proposedPts, radiusM)
  const scenarioById = new Map()
  for (const f of scenario.features) {
    const id = Number(f.properties?.ID)
    if (!Number.isFinite(id)) continue
    const val = getMetricValue(f.properties, metric, scaleMeters)
    if (val == null || Number.isNaN(val)) continue
    scenarioById.set(id, val)
  }

  const rows = []
  for (const f of baseline.features) {
    const id = Number(f.properties?.ID)
    if (!Number.isFinite(id)) continue
    const coords = flattenLineCoords(f.geometry)
    if (!coords.length || !coordsInBBox(coords, bbox)) continue

    const distM = minDistToProposedM(coords, proposedPts)
    if (distM > radiusM) continue

    const bval = getMetricValue(f.properties, metric, scaleMeters)
    const sval = scenarioById.get(id)
    if (bval == null || sval == null || Number.isNaN(bval) || Number.isNaN(sval)) continue
    const delta = sval - bval
    if (Math.abs(delta) <= 1e-12) continue

    rows.push({
      ID: id,
      delta,
      distM: Math.round(distM),
      new_link: false,
    })
  }

  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return rows
}

/**
 * Existing (baseline) segments within radiusM of proposed links, with scenario − baseline Δ.
 * Excludes newly added sDNA links. Sorted by |Δ| descending, capped at 12.
 */
export function nearbySegmentDeltas(args) {
  return collectNearbyRows(args).slice(0, 12)
}

/**
 * Uncapped nearby Δ stats for Compare. Does not change the draw-mode Nearby list cap.
 */
export function nearbySegmentDeltaStats(args) {
  const rows = collectNearbyRows(args)
  if (!rows.length) {
    return {
      nChanged: 0,
      maxDelta: null,
      minDelta: null,
      topGainer: null,
      topLoser: null,
    }
  }
  const bySigned = [...rows].sort((a, b) => b.delta - a.delta)
  const topGainer = bySigned[0].delta > 0 ? bySigned[0] : null
  const topLoser = bySigned[bySigned.length - 1].delta < 0 ? bySigned[bySigned.length - 1] : null
  return {
    nChanged: rows.length,
    maxDelta: bySigned[0].delta,
    minDelta: bySigned[bySigned.length - 1].delta,
    topGainer,
    topLoser,
  }
}
