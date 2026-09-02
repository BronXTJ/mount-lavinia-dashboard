const EARTH_M = 6371000

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

function roundCoord(n) {
  return Math.round(Number(n) * 1e7) / 1e7
}

/** Stable fingerprint of finished proposed links (for duplicate-idea checks). */
export function linksFingerprint(links) {
  const parts = (links ?? [])
    .map((link) => (link.coordinates ?? []).map((c) => `${roundCoord(c[0])},${roundCoord(c[1])}`).join(';'))
    .filter(Boolean)
    .sort()
  return parts.join('|')
}

export function proposedLinksLengthM(links) {
  let total = 0
  for (const link of links ?? []) {
    const coords = link.coordinates ?? []
    for (let i = 1; i < coords.length; i += 1) {
      const a = coords[i - 1]
      const b = coords[i]
      if (!a || !b || a.length < 2 || b.length < 2) continue
      total += haversineM(a[0], a[1], b[0], b[1])
    }
  }
  return total
}

export function cloneCompareLinks(links) {
  return (links ?? []).map((l) => ({
    id: l.id,
    coordinates: (l.coordinates ?? []).map((c) => [...c]),
  }))
}

export function linksToGeoJson(links) {
  return {
    type: 'FeatureCollection',
    features: (links ?? []).map((link) => ({
      type: 'Feature',
      properties: { id: link.id, name: `Proposed ${link.id}` },
      geometry: { type: 'LineString', coordinates: link.coordinates },
    })),
  }
}

export function formatLengthM(meters) {
  if (meters == null || Number.isNaN(meters)) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(2)} km`
}
