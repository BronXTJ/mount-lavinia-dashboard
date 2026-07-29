/**
 * Both-side road rankings for Overview Road Property Analysis.
 *
 * Pair Left↔Right / LHS↔RHS on the same base street name, combine property
 * counts, then rank whole roads. Side-less rows (e.g. Watarappola Rd) count
 * as complete whole-road records.
 *
 * Mount Lavinia scope: point-in-polygon against the Mount Lavinia GN, then
 * add one-sided in-GN rows (without double-counting bases that already have
 * a both-side merge). All GN Divisions uses the same pairing + one-sided
 * pattern without a GN filter. Each tab returns up to 10 roads; commercial /
 * vacant omit 0%.
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

function groupRoadsByBase(roads) {
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

  return groups
}

function rankRecordFromPair(g, left, right) {
  const cL = countsFromRow(left)
  const cR = countsFromRow(right)
  const total = cL.total + cR.total
  if (total <= 0) return null
  return {
    baseKey: g.baseKey,
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
    bothSides: true,
  }
}

function rankRecordFromWhole(g, row) {
  return {
    baseKey: g.baseKey,
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
    bothSides: false,
  }
}

function rankRecordFromOneSide(row) {
  const { baseKey } = parseRoadSide(row.name)
  return {
    baseKey,
    name: row.name,
    selectName: row.name,
    selectNames: [row.name],
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    total: row.total,
    residential: row.residential,
    commercial: row.commercial,
    bareLand: row.bareLand,
    inRoadList: true,
    bothSides: false,
  }
}

/**
 * Pair both-side (or whole) roads. Returns merged road records ready to rank.
 * One-sided-only bases are excluded here.
 * @param {Array<object>} roads
 */
export function pairBothSideRoads(roads) {
  const paired = []

  for (const g of groupRoadsByBase(roads).values()) {
    const left = g.sides.left
    const right = g.sides.right

    if (left && right) {
      const record = rankRecordFromPair(g, left, right)
      if (record) paired.push(record)
      continue
    }

    if (left || right) continue

    if (g.whole) paired.push(rankRecordFromWhole(g, g.whole))
  }

  return paired
}

/**
 * One-sided registry rows whose base is not already represented by a both-side
 * merge (and not a whole-road-only base). Used to fill Mount Lavinia rankings.
 * @param {Array<object>} roads
 * @param {Set<string>} pairedBaseKeys - base keys already in the both-side pool
 */
export function collectOneSidedRoads(roads, pairedBaseKeys = new Set()) {
  const ones = []

  for (const g of groupRoadsByBase(roads).values()) {
    if (pairedBaseKeys.has(g.baseKey)) continue

    const left = g.sides.left
    const right = g.sides.right
    const hasBoth = Boolean(left && right)
    if (hasBoth) continue

    // Skip whole-road-only (already in pairBothSideRoads) and empty groups.
    if (!left && !right) continue

    if (left) ones.push(rankRecordFromOneSide(left))
    if (right) ones.push(rankRecordFromOneSide(right))
  }

  return ones
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

function emptyRankings() {
  return { residential: [], commercial: [], vacant: [] }
}

export const RANKING_LIMIT = 10

/**
 * @param {Array<object>} roads
 * @param {string} metricKey
 * @param {{ minPercentage?: number }} [options] - exclusive lower bound; use 0 to require > 0
 */
function topNForMetric(roads, metricKey, { minPercentage = null } = {}) {
  let pool = [...roads]
  if (minPercentage != null) {
    pool = pool.filter((r) => (r[metricKey] ?? 0) > minPercentage)
  }

  return pool
    .sort((a, b) => {
      const diff = (b[metricKey] ?? 0) - (a[metricKey] ?? 0)
      if (diff !== 0) return diff
      return (b.total ?? 0) - (a.total ?? 0)
    })
    .slice(0, RANKING_LIMIT)
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

function buildAllScopePool(roads) {
  const paired = pairBothSideRoads(roads)
  const pairedBaseKeys = new Set(paired.map((r) => r.baseKey))
  const oneSided = collectOneSidedRoads(roads, pairedBaseKeys)
  return [...paired, ...oneSided]
}

function buildMountLaviniaPool(roads, mlGeometry) {
  const paired = pairBothSideRoads(roads).filter((road) =>
    inMountLaviniaGn(road, mlGeometry),
  )
  const pairedBaseKeys = new Set(paired.map((r) => r.baseKey))
  const oneSided = collectOneSidedRoads(roads, pairedBaseKeys).filter((road) =>
    inMountLaviniaGn(road, mlGeometry),
  )
  return [...paired, ...oneSided]
}

/**
 * @param {Array<object>} roads - roadProperty.roads
 * @param {{ scope?: 'all' | 'mount-lavinia', mlGeometry?: GeoJSON.Geometry|null }} [options]
 * @returns {{ residential: object[], commercial: object[], vacant: object[] }}
 */
export function buildRoadRankings(roads, { scope = 'all', mlGeometry = null } = {}) {
  let pool

  if (scope === 'mount-lavinia') {
    if (!mlGeometry) return emptyRankings()
    pool = buildMountLaviniaPool(roads, mlGeometry)
  } else {
    pool = buildAllScopePool(roads)
  }

  return {
    residential: topNForMetric(pool, 'residential'),
    commercial: topNForMetric(pool, 'commercial', { minPercentage: 0 }),
    vacant: topNForMetric(pool, 'bareLand', { minPercentage: 0 }),
  }
}

/** Extract Mount Lavinia feature geometry from a gn5 FeatureCollection. */
export function extractMountLaviniaGeometry(gnCollection) {
  const feature = gnCollection?.features?.find(
    (f) => f.properties?.ADM4_EN === 'Mount Lavinia',
  )
  return feature?.geometry ?? null
}
