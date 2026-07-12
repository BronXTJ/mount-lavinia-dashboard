/**
 * Matches a road name from the Property Registry list (e.g. "Hotel Road Left")
 * against a feature's `name` property in the roads GeoJSON (e.g. "Hotel Road").
 *
 * Two data sources, two naming conventions:
 *  - The property registry (manually transcribed) encodes carriageway side /
 *    lane info ("Left", "RHS", "1st Cross Lane") that doesn't exist on the
 *    OSM-derived road linework, and uses inconsistent Sinhala transliteration
 *    (e.g. "Wijaya" vs "Vijaya", "Gunarathana" vs "Gunarathna").
 *  - The road linework just has the base street name.
 *
 * We normalize both sides (expand abbreviations, strip directional/lane
 * suffixes and the road-type word, unify v/w) then score similarity with a
 * bigram Dice coefficient. If nothing scores high enough, we return null so
 * the caller can skip the map highlight without crashing or highlighting the
 * wrong road.
 */

const DIRECTIONAL_SUFFIX_TOKENS = [
  'left',
  'right',
  'lhs',
  'rhs',
  'lt',
  'rt',
  '1st lane',
  '2nd lane',
  '3rd lane',
  '1st cross lane',
  '2nd cross lane',
  'cross lane',
  'lane',
]

const ROAD_TYPE_WORDS = ['road', 'mawatha', 'avenue', 'place', 'street', 'mw', 'rd', 'ave', 'st']

const ABBREVIATIONS = [
  [/\bmw\b/g, 'mawatha'],
  [/\brd\b/g, 'road'],
  [/\bave\b/g, 'avenue'],
  [/\bst\b/g, 'street'],
  [/\bdj\b/g, 'd j'],
]

function basicClean(rawName) {
  return (rawName || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeRoadName(rawName) {
  let name = basicClean(rawName)
  for (const [pattern, replacement] of ABBREVIATIONS) {
    name = name.replace(pattern, replacement)
  }
  for (const token of DIRECTIONAL_SUFFIX_TOKENS) {
    name = name.replace(new RegExp(`\\b${token}\\b`, 'g'), ' ')
  }
  return name.replace(/\s+/g, ' ').trim()
}

/** Strips the road-type word too, and unifies v/w — used only for fuzzy scoring. */
function fuzzyKey(rawName) {
  let name = normalizeRoadName(rawName)
  for (const word of ROAD_TYPE_WORDS) {
    name = name.replace(new RegExp(`\\b${word}\\b`, 'g'), ' ')
  }
  return name.replace(/\s+/g, ' ').trim().replace(/w/g, 'v')
}

function bigrams(str) {
  const compact = str.replace(/\s+/g, '')
  const grams = []
  for (let i = 0; i < compact.length - 1; i++) grams.push(compact.slice(i, i + 2))
  return grams
}

function diceCoefficient(a, b) {
  const bigramsA = bigrams(a)
  const bigramsB = bigrams(b)
  if (!bigramsA.length || !bigramsB.length) return 0

  const remaining = new Map()
  for (const g of bigramsB) remaining.set(g, (remaining.get(g) || 0) + 1)

  let matches = 0
  for (const g of bigramsA) {
    const count = remaining.get(g) || 0
    if (count > 0) {
      matches++
      remaining.set(g, count - 1)
    }
  }
  return (2 * matches) / (bigramsA.length + bigramsB.length)
}

const FUZZY_MATCH_THRESHOLD = 0.6

/**
 * Combines multiple line features that share the same road name into a
 * single synthetic MultiLineString feature, so the whole road highlights
 * (and its bounds fly-to covers the whole road) instead of an arbitrary
 * single segment.
 */
function mergeLineFeatures(features) {
  const lines = []
  for (const feature of features) {
    const geometry = feature.geometry
    if (!geometry) continue
    if (geometry.type === 'LineString') lines.push(geometry.coordinates)
    else if (geometry.type === 'MultiLineString') lines.push(...geometry.coordinates)
  }
  return {
    type: 'Feature',
    properties: { name: features[0].properties?.name },
    geometry: { type: 'MultiLineString', coordinates: lines },
  }
}

/**
 * @param {GeoJSON.FeatureCollection|null} roadsGeoJson
 * @param {string} roadName
 * @returns {GeoJSON.Feature|null}
 */
export function findRoadFeature(roadsGeoJson, roadName) {
  if (!roadsGeoJson?.features?.length) return null

  const target = normalizeRoadName(roadName)
  const targetFuzzy = fuzzyKey(roadName)
  if (!target) return null

  // A single named road is often split into several disconnected OSM way
  // segments (typically at intersections), so we can't just return the
  // first exact match — that risks grabbing an arbitrary, sometimes tiny
  // and unrepresentative fragment. Collect every exact match and merge them.
  const exactMatches = []
  let bestFuzzyMatch = null
  let bestFuzzyScore = 0

  for (const feature of roadsGeoJson.features) {
    const candidateRaw = feature.properties?.name
    const candidate = normalizeRoadName(candidateRaw)
    if (!candidate) continue

    if (candidate === target) {
      exactMatches.push(feature)
      continue
    }

    if (exactMatches.length) continue

    if (candidate.includes(target) || target.includes(candidate)) {
      const score = Math.min(candidate.length, target.length) / Math.max(candidate.length, target.length)
      if (score > bestFuzzyScore) {
        bestFuzzyScore = score
        bestFuzzyMatch = feature
      }
      continue
    }

    const candidateFuzzy = fuzzyKey(candidateRaw)
    const score = diceCoefficient(targetFuzzy, candidateFuzzy)
    if (score > bestFuzzyScore) {
      bestFuzzyScore = score
      bestFuzzyMatch = feature
    }
  }

  if (exactMatches.length === 1) return exactMatches[0]
  if (exactMatches.length > 1) return mergeLineFeatures(exactMatches)

  return bestFuzzyScore >= FUZZY_MATCH_THRESHOLD ? bestFuzzyMatch : null
}
