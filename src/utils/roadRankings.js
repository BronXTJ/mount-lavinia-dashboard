/**
 * Both-side road rankings for Overview Road Property Analysis.
 *
 * Pair Left↔Right / LHS↔RHS on the same base street name, combine property
 * counts, then rank whole roads. One-sided rows are excluded. Side-less rows
 * (e.g. Watarappola Rd) count as complete whole-road records.
 *
 * Mount Lavinia scope uses point-in-polygon against the Mount Lavinia GN
 * feature from gn5_combined_area.geojson.
 */

/** Side tokens used only for pairing — do not strip lane names. */
const SIDE_TOKENS = [
  { re: /\b(lhs)\b/i, side: 'left' },
  { re: /\b(rhs)\b/i, side: 'right' },
  { re: /\b(left)\b/i, side: 'left' },
  { re: /\b(right)\b/i, side: 'right' },
  { re: /\b(lt)\b/i, side: 'left' },
  { re: /\b(rt)\b/i, side: 'right' },
]

const ABBREVIATIONS = [
  [/\bmw\b/gi, 'mawatha'],
  [/\brd\b/gi, 'road'],
  [/\bave\b/gi, 'avenue'],
  [/\bst\b/gi, 'street'],
]

function basicClean(rawName) {
  return (rawName || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function expandAbbreviations(name) {
  let out = name
  for (const [pattern, replacement] of ABBREVIATIONS) {
    out = out.replace(pattern, replacement)
  }
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * @returns {{ side: 'left'|'right'|null, baseKey: string, displayBase: string }}
 */
export function parseRoadSide(rawName) {
  const cleaned = basicClean(rawName)
  const expanded = expandAbbreviations(cleaned)

  let side = null
  let withoutSide = expanded
  for (const { re, side: s } of SIDE_TOKENS) {
    if (re.test(withoutSide)) {
      side = s
      withoutSide = withoutSide.replace(re, ' ').replace(/\s+/g, ' ').trim()
      break
    }
  }

  const displayBase = stripSideFromDisplayName(rawName)
  return { side, baseKey: withoutSide, displayBase }
}

/** Preserve original casing while removing a trailing side token. */
function stripSideFromDisplayName(rawName) {
  return (rawName || '')
    .replace(/\s*[.,]?\s*(LHS|RHS|Left|Right|Lt|Rt)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function countsFromRow(row) {
  const total = Number(row.total) || 0
  return {
    total,
    residential: ((Number(row.residential) || 0) / 100) * total,
    commercial: ((Number(row.commercial) || 0) / 100) * total,
    vacant: ((Number(row.bareLand) || 0) / 100) * total,
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * Pair both-side (or whole) roads. Returns merged road records ready to rank.
 * @param {Array<object>} roads
 */
export function pairBothSideRoads(roads) {
  const groups = new Map()

  for (const row of roads ?? []) {
    const { side, baseKey, displayBase } = parseRoadSide(row.name)
    if (!baseKey) continue

    if (!groups.has(baseKey)) {
      groups.set(baseKey, {
        baseKey,
        displayBase,
        sides: { left: null, right: null },
        whole: null,
      })
    }
    const g = groups.get(baseKey)
    if (!g.displayBase && displayBase) g.displayBase = displayBase

    if (side === null) {
      g.whole = row
    } else {
      g.sides[side] = row
    }
  }

  const paired = []

  for (const g of groups.values()) {
    const left = g.sides.left
    const right = g.sides.right

    if (left && right) {
      const cL = countsFromRow(left)
      const cR = countsFromRow(right)
      const total = cL.total + cR.total
      if (total <= 0) continue
      paired.push({
        name: g.displayBase || left.name,
        selectName: left.name,
        selectNames: [left.name, right.name],
        lat: left.lat ?? right.lat ?? null,
        lng: left.lng ?? right.lng ?? null,
        total: Math.round(total),
        residential: round2((100 * (cL.residential + cR.residential)) / total),
        commercial: round2((100 * (cL.commercial + cR.commercial)) / total),
        bareLand: round2((100 * (cL.vacant + cR.vacant)) / total),
        inRoadList: true,
      })
      continue
    }

    // One side only → incomplete; drop (even if a whole row somehow coexists).
    if (left || right) continue

    if (g.whole) {
      const row = g.whole
      paired.push({
        name: g.displayBase || row.name,
        selectName: row.name,
        selectNames: [row.name],
        lat: row.lat ?? null,
        lng: row.lng ?? null,
        total: row.total,
        residential: row.residential,
        commercial: row.commercial,
        bareLand: row.bareLand,
        inRoadList: true,
      })
    }
  }

  return paired
}

/** Ray-casting point-in-ring (lng/lat). Exterior ring only; holes ignored. */
function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Point-in-polygon for GeoJSON Polygon / MultiPolygon.
 * @param {number} lng
 * @param {number} lat
 * @param {GeoJSON.Geometry|null|undefined} geometry
 */
export function pointInPolygon(lng, lat, geometry) {
  if (!geometry || lng == null || lat == null) return false
  if (Number.isNaN(Number(lng)) || Number.isNaN(Number(lat))) return false

  if (geometry.type === 'Polygon') {
    const exterior = geometry.coordinates?.[0]
    return Array.isArray(exterior) ? pointInRing(lng, lat, exterior) : false
  }

  if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates ?? []) {
      const exterior = polygon?.[0]
      if (Array.isArray(exterior) && pointInRing(lng, lat, exterior)) return true
    }
    return false
  }

  return false
}

function inMountLaviniaGn(road, mlGeometry) {
  return pointInPolygon(road.lng, road.lat, mlGeometry)
}

function emptyTop5() {
  return { residential: [], commercial: [], vacant: [] }
}

function top5ForMetric(roads, metricKey) {
  return [...roads]
    .sort((a, b) => {
      const diff = (b[metricKey] ?? 0) - (a[metricKey] ?? 0)
      if (diff !== 0) return diff
      return (b.total ?? 0) - (a.total ?? 0)
    })
    .slice(0, 5)
    .map((road, index) => ({
      rank: index + 1,
      name: road.name,
      selectName: road.selectName,
      selectNames: road.selectNames ?? [road.selectName],
      percentage: road[metricKey],
      total: road.total,
      inRoadList: road.inRoadList,
    }))
}

/**
 * @param {Array<object>} roads - roadProperty.roads
 * @param {{ scope?: 'all' | 'mount-lavinia', mlGeometry?: GeoJSON.Geometry|null }} [options]
 * @returns {{ residential: object[], commercial: object[], vacant: object[] }}
 */
export function buildRoadRankings(roads, { scope = 'all', mlGeometry = null } = {}) {
  let paired = pairBothSideRoads(roads)
  if (scope === 'mount-lavinia') {
    if (!mlGeometry) return emptyTop5()
    paired = paired.filter((road) => inMountLaviniaGn(road, mlGeometry))
  }

  return {
    residential: top5ForMetric(paired, 'residential'),
    commercial: top5ForMetric(paired, 'commercial'),
    vacant: top5ForMetric(paired, 'bareLand'),
  }
}

/** Extract Mount Lavinia feature geometry from a gn5 FeatureCollection. */
export function extractMountLaviniaGeometry(gnCollection) {
  const feature = gnCollection?.features?.find(
    (f) => f.properties?.ADM4_EN === 'Mount Lavinia',
  )
  return feature?.geometry ?? null
}
