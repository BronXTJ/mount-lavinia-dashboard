/**
 * Ray-cast point-in-ring test. Ring is [[lng, lat], ...]; first/last may repeat.
 * @param {number} lng
 * @param {number} lat
 * @param {number[][]} ring
 */
function pointInRing(lng, lat, ring) {
  if (!ring?.length) return false
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/**
 * True if point is inside a GeoJSON Polygon coordinate array
 * (outer ring minus holes — holes are treated as outside).
 * @param {number} lng
 * @param {number} lat
 * @param {number[][][]} polygonCoords
 */
function pointInPolygonCoords(lng, lat, polygonCoords) {
  if (!polygonCoords?.length) return false
  const [outer, ...holes] = polygonCoords
  if (!pointInRing(lng, lat, outer)) return false
  for (const hole of holes) {
    if (pointInRing(lng, lat, hole)) return false
  }
  return true
}

/**
 * Find the GN division name (ADM4_EN) containing lng/lat, or null.
 * @param {GeoJSON.FeatureCollection|null|undefined} gnGeoJson
 * @param {number} lng
 * @param {number} lat
 * @returns {string|null}
 */
export default function findGnAtPoint(gnGeoJson, lng, lat) {
  if (!gnGeoJson?.features?.length || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  for (const feature of gnGeoJson.features) {
    const geom = feature?.geometry
    if (!geom) continue

    let inside = false
    if (geom.type === 'Polygon') {
      inside = pointInPolygonCoords(lng, lat, geom.coordinates)
    } else if (geom.type === 'MultiPolygon') {
      inside = geom.coordinates.some((poly) => pointInPolygonCoords(lng, lat, poly))
    }

    if (inside) {
      const name = feature.properties?.ADM4_EN
      return name || null
    }
  }

  return null
}
