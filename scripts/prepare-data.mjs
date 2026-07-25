/**
 * One-time / re-runnable data prep script.
 *
 * Converts the raw source data in `json_files/` (an Excel workbook +
 * high-precision GeoJSON exports from QGIS) into small, web-friendly files
 * that the app actually reads at runtime:
 *   - src/data/*.json          <- parsed from chalani database.xlsx
 *   - public/data/geo/*.geojson <- coordinate-rounded, property-trimmed copies
 *
 * Run with: npm run prepare-data
 *
 * Safe to re-run any time the source files are updated. Missing source
 * files are skipped with a warning instead of crashing the script, so a
 * partial `json_files/` folder still produces whatever output it can.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import xlsxPkg from 'xlsx'
import { fromFile as geotiffFromFile } from 'geotiff'
import proj4 from 'proj4'
import shapefile from 'shapefile'
import { LAND_USE_COLORS } from '../src/constants/mapLayers.js'

const { readFile: readWorkbook, utils: xlsxUtils } = xlsxPkg

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SOURCE_DIR = path.join(ROOT, 'json_files')
const XLSX_PATH = path.join(SOURCE_DIR, 'No1_study_boundary_related_analysis', 'chalani database.xlsx')
const DATA_OUT_DIR = path.join(ROOT, 'src', 'data')
const GEO_OUT_DIR = path.join(ROOT, 'public', 'data', 'geo')
const URBAN_MORPHO_DIR = path.join(ROOT, 'public', 'data', 'urban-morpho')
const URBAN_MORPHO_CENTRALITY_DIR = path.join(URBAN_MORPHO_DIR, 'centrality')
const DENSITY_ANALYSIS_DIR = path.join(ROOT, 'public', 'data', 'density-analysis')
const URBAN_MATURATION_DIR = path.join(URBAN_MORPHO_DIR, 'urban-maturation')
const ENVIRONMENTAL_ANALYSIS_DIR = path.join(ROOT, 'public', 'data', 'environmental-analysis')

fs.mkdirSync(DATA_OUT_DIR, { recursive: true })
fs.mkdirSync(GEO_OUT_DIR, { recursive: true })
fs.mkdirSync(URBAN_MORPHO_CENTRALITY_DIR, { recursive: true })
fs.mkdirSync(DENSITY_ANALYSIS_DIR, { recursive: true })
fs.mkdirSync(URBAN_MATURATION_DIR, { recursive: true })
fs.mkdirSync(ENVIRONMENTAL_ANALYSIS_DIR, { recursive: true })

function writeJson(fileName, data) {
  const outPath = path.join(DATA_OUT_DIR, fileName)
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2))
  console.log(`[prepare-data] wrote src/data/${fileName}`)
}

// ---------------------------------------------------------------------------
// XLSX -> JSON
// ---------------------------------------------------------------------------

function sheetRows(workbook, sheetNameGuess) {
  const sheetName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === sheetNameGuess.toLowerCase(),
  )
  if (!sheetName) {
    console.warn(`[prepare-data] sheet "${sheetNameGuess}" not found in workbook`)
    return []
  }
  return xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null })
}

function findValue(rows, labelIncludes) {
  const needle = labelIncludes.toLowerCase()
  for (const row of rows) {
    if (typeof row[0] === 'string' && row[0].trim().toLowerCase().includes(needle)) {
      return row[1]
    }
  }
  return null
}

function parseLeadingNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/[\d.]+/)
    if (match) return Number(match[0])
  }
  return null
}

function buildKpiJson(workbook) {
  const rows = sheetRows(workbook, 'KPI')
  const populationDensityRaw = findValue(rows, 'population density')
  const housingDensityRaw = findValue(rows, 'housing density')

  const kpi = {
    gnDivisions: findValue(rows, 'number of gn divisions'),
    totalLandAreaKm2: findValue(rows, 'total land area'),
    totalPopulation: findValue(rows, 'total population'),
    populationDensityPerKm2: parseLeadingNumber(populationDensityRaw),
    populationDensityLabel: populationDensityRaw,
    builtUpAreaKm2: findValue(rows, 'built-up area'),
    totalHousingUnits: findValue(rows, 'total housing occupancy'),
    housingDensityPerM2: parseLeadingNumber(housingDensityRaw),
    housingDensityLabel: housingDensityRaw,
  }
  writeJson('kpi.json', kpi)
}

function buildPopulationTrendJson(workbook) {
  const rows = sheetRows(workbook, 'Population')
  const years = [2001, 2012, 2024]
  const byDivision = {}
  let currentYear = null

  for (const row of rows) {
    const [a, b, c] = row
    if (typeof a === 'number' && years.includes(a)) {
      currentYear = a
    }
    if (currentYear && typeof b === 'string' && typeof c === 'number') {
      const division = b.trim()
      byDivision[division] = byDivision[division] || {}
      byDivision[division][currentYear] = c
    }
  }

  const divisions = Object.keys(byDivision)
  const trend = years.map((year) => {
    const point = { year: String(year) }
    for (const division of divisions) {
      point[division] = byDivision[division][year] ?? null
    }
    return point
  })

  writeJson('populationTrend.json', { divisions, trend })
}

// Per-GN-division stats for the map's click-through KPI cards. Joins the
// "Population " sheet's 2024 census block (name, area, population, density)
// with the "Housing " sheet (name, GN code, housing units) by division name.
// Housing density has no source cell, so it's calculated the same way the
// study-wide "Population density" KPI already is: units / area.
function buildGnDivisionStatsJson(workbook) {
  const populationRows = sheetRows(workbook, 'Population')
  const housingRows = sheetRows(workbook, 'Housing')

  const populationByName = new Map()
  for (const row of populationRows) {
    const name = row[1]
    const total = row[3]
    const areaKm2 = row[11]
    const densityPerKm2 = row[12]
    if (typeof name !== 'string' || typeof total !== 'number') continue
    if (typeof areaKm2 !== 'number' || typeof densityPerKm2 !== 'number') continue
    populationByName.set(name.trim().toLowerCase(), {
      name: name.trim(),
      areaKm2,
      population2024: total,
      populationDensityPerKm2: densityPerKm2,
    })
  }

  const stats = []
  for (const row of housingRows) {
    const name = row[0]
    const gnCode = row[1]
    const housingUnits = row[2]
    if (typeof name !== 'string' || gnCode == null || typeof housingUnits !== 'number') continue
    if (name.trim().toLowerCase() === 'total') continue

    const population = populationByName.get(name.trim().toLowerCase())
    if (!population) {
      console.warn(`[prepare-data] no Population sheet match for GN division "${name}"`)
      continue
    }

    stats.push({
      name: population.name,
      gnCode: String(gnCode).trim(),
      areaKm2: population.areaKm2,
      population2024: population.population2024,
      populationDensityPerKm2: population.populationDensityPerKm2,
      housingUnits,
      housingDensityPerKm2: Number((housingUnits / population.areaKm2).toFixed(0)),
    })
  }

  writeJson('gnDivisionStats.json', stats)
}

// The "land use" sheet now has exactly one row per LAND_USE_COLORS category
// (see mapLayers.js — same 12 names the map legend uses), stored as 0-1
// fractions. We map rows straight onto that canonical name/order list rather
// than the old substring "buckets", so the summary always matches the map
// legend 1:1 with no leftover "Others" catch-all.
function buildLandUseJson(workbook) {
  const rows = sheetRows(workbook, 'land use')
  const valueByLowerName = new Map()

  for (const row of rows) {
    const [label, value] = row
    if (typeof label !== 'string' || typeof value !== 'number') continue
    const clean = label.trim()
    if (!clean || clean.toLowerCase() === 'land use') continue
    valueByLowerName.set(clean.toLowerCase(), value)
  }

  const summary = Object.keys(LAND_USE_COLORS).map((name) => {
    const raw = valueByLowerName.get(name.toLowerCase())
    if (raw == null) {
      console.warn(`[prepare-data] no "land use" row found for category "${name}"`)
    }
    return { name, value: raw != null ? Number((raw * 100).toFixed(2)) : 0 }
  })

  writeJson('landUseSummary.json', summary)
}

const ROAD_LIST = [
  'Hotel Road Left',
  'Hotel Road Right',
  'D.J.Wijesiriwardhana Mw. Left',
  'De Soysa Avenue LHS',
  'De Soysa Avenue RHS',
  'Old Quarry Road Left',
  'Dakshinarama Rd Left',
  'Beach Road Left',
  'Templers Place Left',
  'Liliyan Mawatha LHS',
  'Hena Rd Left',
  'Templers Mw Right',
  'Templers Rd 1st Cross Lane Rt',
  'Watarappola Rd',
  'Wedikanda Rd Left',
  'Aponso Mawatha Left',
  'Hena Rd 1st Lane Right',
  'Templers Rd 2nd Lane Right',
  'Vishaka Road Left',
  'Vishaka Road Right',
  'Samudra Mawatha Right',
  'Menerigama Place Right',
  'Liliyan Mawatha RHS',
  'Sri Gunarathana Mw Right',
  'Fernando Rd Left',
  'Wijaya Road Right',
]

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// One-off transliteration mismatches between the curated ROAD_LIST and the
// other sheets ("Aponso" here, "Aponsu" over there — same road).
const ROAD_NAME_ALIASES = {
  'aponso mawatha left': 'aponsu mawatha left',
}

function resolveAlias(normalized) {
  return ROAD_NAME_ALIASES[normalized] ?? normalized
}

// Manual coordinate overrides — take precedence over the Roadwise sheet
// lookup for specific roads where a more precise/corrected point was supplied.
// Keys must be the already-normalizeExact()-ed form (e.g. "rd" expands to "road").
const COORD_OVERRIDES = {
  'watarappola road': { lat: 6.838819247514777, lng: 79.8703368166711 },
}

// Exact-identity normalizer for matching road names *within* our own data
// (ROAD_LIST <-> Roadwise sheet <-> Property sheet Top-10 tables). Unlike
// roadNameMatch.js's normalizeRoadName (used for matching against OSM
// linework), this deliberately KEEPS left/right — "X Left" and "X Right" are
// different entries in ROAD_LIST and must not collapse into one.
const EXACT_ABBREVIATIONS = [
  [/\bmw\b/g, 'mawatha'],
  [/\brd\b/g, 'road'],
  [/\bave\b/g, 'avenue'],
  [/\bst\b/g, 'street'],
  [/\bdj\b/g, 'd j'],
  [/\blhs\b/g, 'left'],
  [/\brhs\b/g, 'right'],
  [/\blt\b/g, 'left'],
  [/\brt\b/g, 'right'],
]

function normalizeExact(rawName) {
  let name = (rawName || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  for (const [pattern, replacement] of EXACT_ABBREVIATIONS) {
    name = name.replace(pattern, replacement)
  }
  return name.replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// "Roadwise" sheet — per-road lat/lng only. This sheet covers ~140 roads
// (far more than our curated 26-road ROAD_LIST); we deliberately use it as a
// coordinate lookup ONLY and never pull in roads outside ROAD_LIST from it.
// ---------------------------------------------------------------------------
function loadRoadwiseCoords(workbook) {
  const rows = sheetRows(workbook, 'Roadwise')
  if (!rows.length) return new Map()

  const header = rows[0]
  const nameIdx = header.indexOf('Road_Name')
  const latIdx = header.indexOf('Latitude')
  const lngIdx = header.indexOf('Longitude')
  if (nameIdx === -1 || latIdx === -1 || lngIdx === -1) {
    console.warn('[prepare-data] "Roadwise" sheet is missing expected columns — skipping coordinate lookup')
    return new Map()
  }

  const coordsByName = new Map()
  for (const row of rows.slice(1)) {
    const rawName = row[nameIdx]
    if (typeof rawName !== 'string') continue
    const lat = row[latIdx]
    const lng = row[lngIdx]
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    coordsByName.set(resolveAlias(normalizeExact(rawName)), {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    })
  }
  return coordsByName
}

// ---------------------------------------------------------------------------
// "Roadwise" sheet — real per-road residential/commercial/bare-land/total
// figures. Covers all 26 of our curated ROAD_LIST roads (verified), so this
// is now the primary source for the per-road property card, superseding the
// old hardcoded-5-roads + sheet-wide-average-for-the-rest approach.
// ---------------------------------------------------------------------------
function loadRoadwisePropertyStats(workbook) {
  const rows = sheetRows(workbook, 'Roadwise')
  if (!rows.length) return new Map()

  const header = rows[0]
  const nameIdx = header.indexOf('Road_Name')
  const resIdx = header.indexOf('Residential_%')
  const comIdx = header.indexOf('Commercial_%')
  const bareIdx = header.indexOf('BareLand_%')
  const totalIdx = header.indexOf('Total_Properties')
  if ([nameIdx, resIdx, comIdx, bareIdx, totalIdx].includes(-1)) {
    console.warn('[prepare-data] "Roadwise" sheet is missing expected property columns — skipping stats lookup')
    return new Map()
  }

  const statsByName = new Map()
  for (const row of rows.slice(1)) {
    const rawName = row[nameIdx]
    if (typeof rawName !== 'string') continue
    const residential = row[resIdx]
    const commercial = row[comIdx]
    const bareLand = row[bareIdx]
    const total = row[totalIdx]
    if ([residential, commercial, bareLand, total].some((v) => typeof v !== 'number')) continue
    statsByName.set(resolveAlias(normalizeExact(rawName)), { residential, commercial, bareLand, total })
  }
  return statsByName
}

// ---------------------------------------------------------------------------
// "Property" sheet — Top 10 Residential / Commercial / Bare Land tables.
// We only need the top 5 of each for the dashboard's ranking panel.
// ---------------------------------------------------------------------------
function parseTop10Table(rows, tableTitleIncludes) {
  const titleIdx = rows.findIndex(
    (row) => typeof row[0] === 'string' && row[0].trim().toLowerCase().includes(tableTitleIncludes),
  )
  if (titleIdx === -1) return []

  // titleIdx + 1 is the "Rank / Road Name / ..." header row, data starts after that.
  const dataStart = titleIdx + 2
  const entries = []
  for (let i = dataStart; i < rows.length; i++) {
    const [rank, name, , percentage, total] = rows[i]
    if (typeof rank !== 'number' || typeof name !== 'string') break
    entries.push({ rank, rawName: name.trim(), percentage, total })
  }
  return entries
}

function buildTop5(entries, roadListByNormalizedName) {
  return entries.slice(0, 5).map((entry) => {
    const normalized = resolveAlias(normalizeExact(entry.rawName))
    const matched = roadListByNormalizedName.get(normalized)
    return {
      rank: entry.rank,
      name: matched ?? toTitleCase(entry.rawName),
      percentage: entry.percentage,
      total: entry.total,
      inRoadList: Boolean(matched),
    }
  })
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}

function buildTop5Lists(workbook) {
  const rows = sheetRows(workbook, 'Property')
  const roadListByNormalizedName = new Map(ROAD_LIST.map((name) => [normalizeExact(name), name]))

  return {
    residential: buildTop5(parseTop10Table(rows, 'top 10 residential'), roadListByNormalizedName),
    commercial: buildTop5(parseTop10Table(rows, 'top 10 commercial'), roadListByNormalizedName),
    vacant: buildTop5(parseTop10Table(rows, 'top 10 bare land'), roadListByNormalizedName),
  }
}

function buildRoadPropertyJson(workbook) {
  const rows = sheetRows(workbook, 'Property')
  const defaultSplit = {
    residential: findValue(rows, 'average residential') ?? 85.72,
    commercial: findValue(rows, 'average commercial') ?? 4.16,
    bareLand: findValue(rows, 'average bare land') ?? 8.36,
  }
  const roadsProcessed = findValue(rows, 'roads processed') ?? 65
  const totalProperties = findValue(rows, 'total properties') ?? 7137
  const avgTotalPerRoad = Math.round(totalProperties / roadsProcessed)

  const roadwiseCoords = loadRoadwiseCoords(workbook)
  const roadwiseStats = loadRoadwisePropertyStats(workbook)

  const roads = ROAD_LIST.map((name) => {
    const normalized = resolveAlias(normalizeExact(name))

    const rawCoords = COORD_OVERRIDES[normalized] ?? roadwiseCoords.get(normalized) ?? null
    const coords = rawCoords && { lat: Number(rawCoords.lat.toFixed(6)), lng: Number(rawCoords.lng.toFixed(6)) }
    if (!coords) {
      console.warn(`[prepare-data] no Roadwise coordinates found for "${name}"`)
    }

    const stats = roadwiseStats.get(normalized)
    if (stats) {
      return {
        name,
        slug: slugify(name),
        residential: stats.residential,
        commercial: stats.commercial,
        bareLand: stats.bareLand,
        total: stats.total,
        isEstimate: false,
        ...coords,
      }
    }

    console.warn(`[prepare-data] no Roadwise property stats found for "${name}" — using sheet-wide average`)
    return {
      name,
      slug: slugify(name),
      residential: defaultSplit.residential,
      commercial: defaultSplit.commercial,
      bareLand: defaultSplit.bareLand,
      total: avgTotalPerRoad,
      isEstimate: true,
      ...coords,
    }
  })

  writeJson('roadProperty.json', {
    roadsProcessed,
    totalProperties,
    defaultSplit,
    roads,
    top5: buildTop5Lists(workbook),
  })
}

function buildXlsxData() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.warn(`[prepare-data] xlsx not found at ${XLSX_PATH} - skipping xlsx extraction`)
    return
  }
  const workbook = readWorkbook(XLSX_PATH)
  buildKpiJson(workbook)
  buildPopulationTrendJson(workbook)
  buildGnDivisionStatsJson(workbook)
  buildLandUseJson(workbook)
  buildRoadPropertyJson(workbook)
}

// ---------------------------------------------------------------------------
// GeoJSON cleaning (round coordinates, trim properties)
// ---------------------------------------------------------------------------

function roundCoordinates(coords, precision) {
  if (typeof coords[0] === 'number') {
    return coords.map((n) => Number(n.toFixed(precision)))
  }
  return coords.map((c) => roundCoordinates(c, precision))
}

function pickProperties(properties, keepKeys) {
  if (!keepKeys) return properties
  const picked = {}
  for (const key of keepKeys) {
    if (key in properties) picked[key] = properties[key]
  }
  return picked
}

/** SLD99 Sri Lanka Grid 1999 (from centrality SHP .prj) → WGS84. */
const SLD99 =
  '+proj=tmerc +lat_0=7.00047152777778 +lon_0=80.7717130833333 +k=0.9999238418 +x_0=500000 +y_0=500000 +a=6377276.345 +rf=300.8017 +units=m +no_defs'
const WGS84 = 'EPSG:4326'

function reprojectCoordsSld99ToWgs84(coords) {
  if (typeof coords[0] === 'number') {
    const [lng, lat] = proj4(SLD99, WGS84, [coords[0], coords[1]])
    return [lng, lat]
  }
  return coords.map((c) => reprojectCoordsSld99ToWgs84(c))
}

/**
 * Read an SLD99 shapefile, reproject to WGS84 GeoJSON, round coords, write under outDir.
 */
async function convertSld99ShpToWgs84GeoJson(shpPath, outputFileName, { precision = 6, outDir } = {}) {
  if (!fs.existsSync(shpPath)) {
    console.warn(`[prepare-data] shapefile not found, skipping: ${shpPath}`)
    return
  }

  const dbfPath = shpPath.replace(/\.shp$/i, '.dbf')
  if (!fs.existsSync(dbfPath)) {
    console.warn(`[prepare-data] dbf not found for shapefile: ${dbfPath}`)
  }
  const source = await shapefile.open(shpPath, fs.existsSync(dbfPath) ? dbfPath : undefined)
  const features = []

  while (true) {
    const result = await source.read()
    if (result.done) break
    const feature = result.value
    if (!feature?.geometry) continue
    features.push({
      type: 'Feature',
      properties: feature.properties ?? {},
      geometry: {
        type: feature.geometry.type,
        coordinates: roundCoordinates(
          reprojectCoordsSld99ToWgs84(feature.geometry.coordinates),
          precision,
        ),
      },
    })
  }

  const geojson = { type: 'FeatureCollection', features }
  const outPath = path.join(outDir, outputFileName)
  const json = JSON.stringify(geojson)
  fs.writeFileSync(outPath, json)

  const beforeKb = (fs.statSync(shpPath).size / 1024).toFixed(0)
  const afterKb = (Buffer.byteLength(json) / 1024).toFixed(0)
  const relDir = path.relative(path.join(ROOT, 'public'), outDir).replace(/\\/g, '/')
  console.log(
    `[prepare-data] wrote public/${relDir}/${outputFileName}  (from SHP ${beforeKb}KB -> ${afterKb}KB, ${features.length} features, SLD99→WGS84)`,
  )
}

/** Convert missing 1000m / 4000m centrality SHPs (SLD99) to WGS84 GeoJSON. */
async function buildCentralityShpLayers(morphoDir) {
  const closenessDir = path.join(
    morphoDir,
    'betweeness_centrality',
    'ClosenessCentrality',
    'ClosenessCentrality',
  )
  const betweennessDir = path.join(
    morphoDir,
    'betweeness_centrality',
    'BetweenessCnetrality',
    'BetweenessCnetrality',
  )

  for (const scale of [1000, 4000]) {
    await convertSld99ShpToWgs84GeoJson(
      path.join(closenessDir, `${scale}_closeness.shp`),
      `closeness_${scale}.geojson`,
      { outDir: URBAN_MORPHO_CENTRALITY_DIR, precision: 6 },
    )
    await convertSld99ShpToWgs84GeoJson(
      path.join(betweennessDir, `${scale}_betweenness.shp`),
      `betweenness_${scale}.geojson`,
      { outDir: URBAN_MORPHO_CENTRALITY_DIR, precision: 6 },
    )
  }
}

function getBoundaryCentroid(geojson) {
  let sumLng = 0
  let sumLat = 0
  let count = 0
  for (const feature of geojson.features ?? []) {
    const ring = feature.geometry?.coordinates?.[0]?.[0]
    if (!ring) continue
    for (const [lng, lat] of ring) {
      sumLng += lng
      sumLat += lat
      count++
    }
  }
  if (!count) return null
  return [sumLng / count, sumLat / count]
}

/** boundary_5000m source is tagged EPSG:5235 but does not reproject to the study area — synthesize from 500m center. */
function buildBoundary5000mGeoJson(morphoDir, outDir, precision = 6) {
  const refPath = path.join(morphoDir, 'boundary_500m', 'boundary_500m.geojson')
  if (!fs.existsSync(refPath)) {
    console.warn('[prepare-data] boundary_500m not found — cannot synthesize boundary_5000m')
    return
  }

  const ref = JSON.parse(fs.readFileSync(refPath, 'utf-8'))
  const center = getBoundaryCentroid(ref)
  if (!center) {
    console.warn('[prepare-data] could not derive centroid from boundary_500m')
    return
  }

  const [centerLng, centerLat] = center
  const radiusMeters = 5000
  const points = 128
  const ring = []
  const earthRadius = 6378137
  const lat1 = (centerLat * Math.PI) / 180
  const lng1 = (centerLng * Math.PI) / 180
  const angularDistance = radiusMeters / earthRadius

  for (let i = 0; i <= points; i++) {
    const bearing = (2 * Math.PI * i) / points
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    )
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
      )
    ring.push([
      Number(((lng2 * 180) / Math.PI).toFixed(precision)),
      Number(((lat2 * 180) / Math.PI).toFixed(precision)),
    ])
  }

  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: 1 },
        geometry: { type: 'MultiPolygon', coordinates: [[ring]] },
      },
    ],
  }

  const outPath = path.join(outDir, 'boundary_5000m.geojson')
  const json = JSON.stringify(geojson)
  fs.writeFileSync(outPath, json)
  console.log(
    `[prepare-data] wrote public/data/urban-morpho/boundary_5000m.geojson  (synthesized ${radiusMeters}m circle)`,
  )
}

function cleanGeoJson(inputPath, outputFileName, { keepKeys, precision = 6, outDir = GEO_OUT_DIR } = {}) {
  if (!fs.existsSync(inputPath)) {
    console.warn(`[prepare-data] geojson not found, skipping: ${inputPath}`)
    return
  }
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  const cleaned = {
    type: 'FeatureCollection',
    features: raw.features.map((feature) => ({
      type: 'Feature',
      properties: pickProperties(feature.properties ?? {}, keepKeys),
      geometry: {
        type: feature.geometry.type,
        coordinates: roundCoordinates(feature.geometry.coordinates, precision),
      },
    })),
  }

  const outPath = path.join(outDir, outputFileName)
  const json = JSON.stringify(cleaned)
  fs.writeFileSync(outPath, json)

  const beforeKb = (fs.statSync(inputPath).size / 1024).toFixed(0)
  const afterKb = (Buffer.byteLength(json) / 1024).toFixed(0)
  const relDir = path.relative(path.join(ROOT, 'public'), outDir).replace(/\\/g, '/')
  console.log(`[prepare-data] wrote public/${relDir}/${outputFileName}  (${beforeKb}KB -> ${afterKb}KB)`)
}

/** Tab 2 centrality layers — renamed to match dashboard fetch paths. */
async function buildUrbanMorphoLayers() {
  const morphoDir = path.join(SOURCE_DIR, 'Urban_morpho_analysis')
  const scales = [500, 2000, 3000, 5000]

  for (const scale of scales) {
    cleanGeoJson(
      path.join(morphoDir, 'closeness_centrality', `${scale}m_closeness.geojson`),
      `closeness_${scale}.geojson`,
      { outDir: URBAN_MORPHO_CENTRALITY_DIR, precision: 6 },
    )
    cleanGeoJson(
      path.join(morphoDir, 'betweeness_centrality', `${scale}m_betweenness.geojson`),
      `betweenness_${scale}.geojson`,
      { outDir: URBAN_MORPHO_CENTRALITY_DIR, precision: 6 },
    )
  }

  // 1000m / 4000m only available as SLD99 shapefiles — convert to WGS84 GeoJSON
  await buildCentralityShpLayers(morphoDir)

  for (const scale of [500, 2000, 3000]) {
    cleanGeoJson(
      path.join(morphoDir, `boundary_${scale}m`, `boundary_${scale}m.geojson`),
      `boundary_${scale}m.geojson`,
      { outDir: URBAN_MORPHO_DIR, precision: 6 },
    )
  }

  buildBoundary5000mGeoJson(morphoDir, URBAN_MORPHO_DIR, 6)
}

const PRIMARY_ANALYSIS_DIR = path.join(SOURCE_DIR, 'Primary study area final analysis 01')

/** Legacy 500 m Focus Area density layers (kept for rollback / comparison). */
function buildDensityAnalysisLayersLegacy() {
  const densityDir = path.join(SOURCE_DIR, 'Density_analysis')

  cleanGeoJson(
    path.join(densityDir, 'Density_value', 'Density_value.geojson'),
    'Density_value.geojson',
    {
      outDir: DENSITY_ANALYSIS_DIR,
      precision: 6,
      keepKeys: [
        'id',
        'FSI',
        'GSI',
        'OSR',
        'Density_V',
        'FSI_Norm',
        'GSI_Norm',
        'Area_build',
        'Floor_Area',
        'Hex_area',
      ],
    },
  )
  cleanGeoJson(
    path.join(densityDir, 'buildings_500m', 'buildings_500m.geojson'),
    'buildings_500m.geojson',
    { outDir: DENSITY_ANALYSIS_DIR, precision: 6, keepKeys: ['area_in_me', 'height', 'building'] },
  )
  cleanGeoJson(
    path.join(densityDir, 'roads_clipped_500m', 'roads_clipped_500m.geojson'),
    'roads_clipped_500m.geojson',
    { outDir: DENSITY_ANALYSIS_DIR, precision: 6, keepKeys: ['name', 'highway'] },
  )
  cleanGeoJson(
    path.join(densityDir, 'Pois_clipped_500m', 'Pois_clipped_500m.geojson'),
    'pois_clipped_500m.geojson',
    {
      outDir: DENSITY_ANALYSIS_DIR,
      precision: 6,
      keepKeys: ['name', 'name_en', 'amenity', 'shop', 'tourism', 'man_made'],
    },
  )
  cleanGeoJson(
    path.join(densityDir, 'hex_grid_500m', 'hex_grid_500m.geojson'),
    'hex_grid_500m.geojson',
    { outDir: DENSITY_ANALYSIS_DIR, precision: 6, keepKeys: ['id'] },
  )
}

/**
 * Primary 5-GN study area density + context layers (dashboard defaults).
 * Sources: json_files/Primary study area final analysis 01/
 */
function buildPrimaryDensityLayers() {
  cleanGeoJson(
    path.join(PRIMARY_ANALYSIS_DIR, '04_density', 'density_primary_hex.geojson'),
    'density_primary_hex.geojson',
    {
      outDir: DENSITY_ANALYSIS_DIR,
      precision: 6,
      keepKeys: [
        'id',
        'FSI',
        'GSI',
        'OSR',
        'Density_V',
        'FSI_Norm',
        'GSI_Norm',
        'Area_build',
        'Floor_Area',
        'Hex_area',
        'is_edge',
        'is_valid',
        'row_index',
        'col_index',
      ],
    },
  )
  cleanGeoJson(
    path.join(PRIMARY_ANALYSIS_DIR, '02_hex_grid', 'hex_grid_primary_100m.geojson'),
    'hex_grid_primary_100m.geojson',
    {
      outDir: DENSITY_ANALYSIS_DIR,
      precision: 6,
      keepKeys: ['id', 'is_edge', 'Hex_area', 'row_index', 'col_index'],
    },
  )
  cleanGeoJson(
    path.join(PRIMARY_ANALYSIS_DIR, '03_buildings', 'buildings_primary_floors.geojson'),
    'buildings_primary_floors.geojson',
    {
      outDir: DENSITY_ANALYSIS_DIR,
      precision: 6,
      keepKeys: ['FID_1', 'Height', 'Area_build', 'Floors', 'Floor_Area'],
    },
  )
  cleanGeoJson(
    path.join(PRIMARY_ANALYSIS_DIR, '06_context', 'roads_primary.geojson'),
    'roads_primary.geojson',
    { outDir: DENSITY_ANALYSIS_DIR, precision: 6, keepKeys: ['name', 'highway', 'id'] },
  )
  cleanGeoJson(
    path.join(PRIMARY_ANALYSIS_DIR, '06_context', 'pois_primary.geojson'),
    'pois_primary.geojson',
    {
      outDir: DENSITY_ANALYSIS_DIR,
      precision: 6,
      keepKeys: ['name', 'name_en', 'amenity', 'shop', 'tourism', 'man_made', 'id'],
    },
  )
  cleanGeoJson(
    path.join(PRIMARY_ANALYSIS_DIR, '01_boundary', 'primary_study_area_boundary.geojson'),
    'primary_study_area_boundary.geojson',
    { outDir: DENSITY_ANALYSIS_DIR, precision: 6, keepKeys: ['id'] },
  )
}

function buildDensityAnalysisLayers() {
  buildDensityAnalysisLayersLegacy()
  buildPrimaryDensityLayers()
}

/** Legacy 500 m maturation layers (kept for rollback). */
function buildUrbanMaturationLayersLegacy() {
  const maturationDir = path.join(SOURCE_DIR, 'Urban_maturation_analysis')

  cleanGeoJson(
    path.join(maturationDir, 'urban_maturation_analysis', 'urban_maturation_analysis.geojson'),
    'urban_maturation_analysis.geojson',
    {
      outDir: URBAN_MATURATION_DIR,
      precision: 6,
      keepKeys: [
        'id',
        '1entropy_i',
        '1average_c',
        '1landuse_d',
        '1normalize',
        '1normali_1',
        '1normali_2',
        '1urban mat',
      ],
    },
  )
  cleanGeoJson(
    path.join(maturationDir, 'shanon_entropy_index', 'shanon_entropy_index.geojson'),
    'shanon_entropy_index.geojson',
    {
      outDir: URBAN_MATURATION_DIR,
      precision: 6,
      keepKeys: ['id', ' final_ent', ' final_mui'],
    },
  )
  cleanGeoJson(
    path.join(maturationDir, 'landuse_500m', 'landuse_500m.geojson'),
    'landuse_500m.geojson',
    {
      outDir: URBAN_MATURATION_DIR,
      precision: 6,
      keepKeys: ['Main_C', 'Sub_class', 'Land_Exten', 'Domain'],
    },
  )
}

/** Primary 5-GN maturation layers (dashboard defaults). */
function buildPrimaryMaturationLayers() {
  const maturationHex = path.join(
    PRIMARY_ANALYSIS_DIR,
    '05_maturation',
    'maturation_primary_hex.geojson',
  )

  cleanGeoJson(maturationHex, 'maturation_primary_hex.geojson', {
    outDir: URBAN_MATURATION_DIR,
    precision: 6,
    keepKeys: [
      'id',
      '1entropy_i',
      '1average_c',
      '1landuse_d',
      '1normalize',
      '1normali_1',
      '1normali_2',
      '1urban mat',
      ' final_ent',
      ' final_mui',
      'is_edge',
      'is_valid_maturation',
      'tier',
      'umi',
      'entropy_raw',
      'entropy_norm',
      'accessibility',
      'landuse_div',
    ],
  })
  // Shannon panel reads a slim layer; same primary hex source.
  cleanGeoJson(maturationHex, 'shanon_entropy_primary.geojson', {
    outDir: URBAN_MATURATION_DIR,
    precision: 6,
    keepKeys: ['id', ' final_ent', ' final_mui'],
  })
  cleanGeoJson(
    path.join(PRIMARY_ANALYSIS_DIR, '06_context', 'landuse_primary.geojson'),
    'landuse_primary.geojson',
    {
      outDir: URBAN_MATURATION_DIR,
      precision: 6,
      keepKeys: ['Main_C', 'Sub_class', 'Land_Exten', 'Domain', 'Area_m2', 'NAME'],
    },
  )
}

function buildUrbanMaturationLayers() {
  buildUrbanMaturationLayersLegacy()
  buildPrimaryMaturationLayers()
}

// ---------------------------------------------------------------------------
// Environmental Analysis (UTCI / UHI / SVF)
// ---------------------------------------------------------------------------

const SVF_CLASS_LABELS = {
  'Very Enclo': 'Very Enclosed',
  Moderately: 'Moderately Enclosed',
  Mixed: 'Mixed',
  Open: 'Open',
  'Very Open': 'Very Open',
}

function isValidMetric(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > -900
}

function geometryCentroid(geometry) {
  if (!geometry?.coordinates) return null
  let sumLng = 0
  let sumLat = 0
  let count = 0

  function walk(coords) {
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      sumLng += coords[0]
      sumLat += coords[1]
      count += 1
      return
    }
    for (const c of coords) walk(c)
  }

  walk(geometry.coordinates)
  if (!count) return null
  return [sumLng / count, sumLat / count]
}

function getRasterPixelIndex(image, lon, lat) {
  const origin = image.getOrigin()
  const resolution = image.getResolution()
  const width = image.getWidth()
  const height = image.getHeight()
  if (!origin || !resolution || !resolution[0] || !resolution[1]) return null

  const px = Math.floor((lon - origin[0]) / resolution[0])
  const py = Math.floor((lat - origin[1]) / resolution[1])
  if (px < 0 || py < 0 || px >= width || py >= height) return null
  return { px, py, width, height }
}

function sampleRasterAt(image, band, lon, lat) {
  const idx = getRasterPixelIndex(image, lon, lat)
  if (!idx) return null

  const v = Number(band[idx.py * idx.width + idx.px])
  if (!Number.isFinite(v) || v < -100 || v > 80) return null
  return v
}

const SHADOW_HOURS = ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18']

function sampleShadowBandAtUtciPixel(shadowImage, shadowBand, utciPx, utciPy, utciW, utciH) {
  const shadowW = shadowImage.getWidth()
  const shadowH = shadowImage.getHeight()
  const spx = Math.floor((utciPx * shadowW) / utciW)
  const spy = Math.floor((utciPy * shadowH) / utciH)
  if (spx < 0 || spy < 0 || spx >= shadowW || spy >= shadowH) return null

  const v = Number(shadowBand[spy * shadowW + spx])
  if (!Number.isFinite(v) || v < 0 || v > 1) return null
  return v
}

function sampleShadowAtCentroid(utciImage, shadowImage, shadowBand, lon, lat) {
  const idx = getRasterPixelIndex(utciImage, lon, lat)
  if (!idx) return null
  return sampleShadowBandAtUtciPixel(
    shadowImage,
    shadowBand,
    idx.px,
    idx.py,
    idx.width,
    idx.height,
  )
}

async function loadShadowRasters(shadowDir) {
  const aggregatedPath = path.join(shadowDir, 'AGGREGATED.tif')
  if (!fs.existsSync(aggregatedPath)) return null

  try {
    const aggTiff = await geotiffFromFile(aggregatedPath)
    const aggImage = await aggTiff.getImage()
    const aggRasters = await aggImage.readRasters()
    const aggregated = { image: aggImage, band: aggRasters[0] }

    const hourly = {}
    for (const hour of SHADOW_HOURS) {
      const hourlyPath = path.join(shadowDir, `Shadow_20260705_${hour}00_LST.tif`)
      if (!fs.existsSync(hourlyPath)) continue
      const tiff = await geotiffFromFile(hourlyPath)
      const image = await tiff.getImage()
      const rasters = await image.readRasters()
      hourly[hour] = { image, band: rasters[0] }
    }

    console.log(
      `[prepare-data] loaded shadow rasters (aggregated + ${Object.keys(hourly).length} hourly)`,
    )
    return { aggregated, hourly }
  } catch (err) {
    console.warn(`[prepare-data] could not read shadow rasters: ${err.message}`)
    return null
  }
}

function summarizeNumeric(values) {
  if (!values.length) return { min: null, max: null, mean: null }
  let min = values[0]
  let max = values[0]
  let sum = 0
  for (const v of values) {
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max, mean: sum / values.length }
}

/** Tab 5 Environmental — trimmed 10 m thermal grid + SVF points + 800 m boundary. */
async function buildEnvironmentalLayers() {
  const utciDir = path.join(SOURCE_DIR, 'utci_analysis')
  const uhiPath = path.join(utciDir, 'UHI_final_WGS84', 'UHI_final_WGS8.geojson')
  const utciTifPath = path.join(utciDir, 'final_UTCI', 'final_UTCI.tif')
  const svfPointsPath = path.join(utciDir, 'SVF_point_values_WGS84', 'SVF_point_values_WGS84.geojson')
  const boundaryPath = path.join(utciDir, '800m boundry for utci analysis', 'boundary_800m_buffered.geojson')

  if (!fs.existsSync(uhiPath)) {
    console.warn('[prepare-data] UHI grid not found, skipping environmental layers')
    return
  }

  let utciImage = null
  let utciBand = null
  let sampleUtci = null
  if (fs.existsSync(utciTifPath)) {
    try {
      const tiff = await geotiffFromFile(utciTifPath)
      utciImage = await tiff.getImage()
      const rasters = await utciImage.readRasters()
      utciBand = rasters[0]
      sampleUtci = (lon, lat) => sampleRasterAt(utciImage, utciBand, lon, lat)
      console.log('[prepare-data] loaded final_UTCI.tif for centroid sampling')
    } catch (err) {
      console.warn(`[prepare-data] could not read final_UTCI.tif: ${err.message}`)
    }
  } else {
    console.warn('[prepare-data] final_UTCI.tif not found — utci_c will be omitted')
  }

  const shadowDir = path.join(utciDir, 'shadow_analysis')
  const shadowRasters = utciImage ? await loadShadowRasters(shadowDir) : null
  if (!shadowRasters && fs.existsSync(path.join(shadowDir, 'AGGREGATED.tif'))) {
    console.warn('[prepare-data] shadow rasters found but UTCI bridge unavailable — skipping shadow join')
  }

  const raw = JSON.parse(fs.readFileSync(uhiPath, 'utf-8'))
  const features = []
  const utciCValues = []
  const uhiValues = []
  const airValues = []
  const tmrtValues = []
  const windValues = []
  const shadowFracValues = []
  const shadowHourlySums = Object.fromEntries(SHADOW_HOURS.map((h) => [h, 0]))
  const shadowHourlyCounts = Object.fromEntries(SHADOW_HOURS.map((h) => [h, 0]))
  const classCounts = {}
  let ruralBg = null
  let dropped = 0

  for (const feature of raw.features ?? []) {
    const p = feature.properties ?? {}
    const uhi = Number(p.UHI_intens)
    const air = Number(p.Air_Temp)
    const tmrt = Number(p.Tmrt)
    const wind = Number(p.Wind_speed)
    const utciClass = Number(p.UTCI)

    if (!isValidMetric(uhi) && !isValidMetric(air) && !isValidMetric(tmrt)) {
      dropped += 1
      continue
    }

    const centroid = geometryCentroid(feature.geometry)
    let utciC = null
    if (sampleUtci && centroid) {
      utciC = sampleUtci(centroid[0], centroid[1])
    }

    const props = {
      id: p.id ?? p.fid ?? null,
      UHI_intens: isValidMetric(uhi) ? Number(uhi.toFixed(3)) : null,
      Air_Temp: isValidMetric(air) ? Number(air.toFixed(2)) : null,
      Tmrt: isValidMetric(tmrt) ? Number(tmrt.toFixed(2)) : null,
      Wind_speed: isValidMetric(wind) ? Number(wind.toFixed(2)) : null,
      utci_class: isValidMetric(utciClass) ? Math.round(utciClass) : null,
    }
    if (utciC != null) {
      props.utci_c = Number(utciC.toFixed(2))
      utciCValues.push(props.utci_c)
    }

    if (shadowRasters && centroid) {
      const shadowFrac = sampleShadowAtCentroid(
        utciImage,
        shadowRasters.aggregated.image,
        shadowRasters.aggregated.band,
        centroid[0],
        centroid[1],
      )
      if (shadowFrac != null) {
        props.shadow_frac = Number(shadowFrac.toFixed(3))
        shadowFracValues.push(props.shadow_frac)
      }

      for (const hour of SHADOW_HOURS) {
        const layer = shadowRasters.hourly[hour]
        if (!layer) continue
        const hourlyVal = sampleShadowAtCentroid(
          utciImage,
          layer.image,
          layer.band,
          centroid[0],
          centroid[1],
        )
        if (hourlyVal != null) {
          props[`shadow_h${hour}`] = Number(hourlyVal.toFixed(2))
          shadowHourlySums[hour] += hourlyVal
          shadowHourlyCounts[hour] += 1
        }
      }
    }

    if (props.UHI_intens != null) uhiValues.push(props.UHI_intens)
    if (props.Air_Temp != null) airValues.push(props.Air_Temp)
    if (props.Tmrt != null) tmrtValues.push(props.Tmrt)
    if (props.Wind_speed != null) windValues.push(props.Wind_speed)
    if (props.utci_class != null) {
      classCounts[props.utci_class] = (classCounts[props.utci_class] ?? 0) + 1
    }
    if (ruralBg == null && isValidMetric(p.Rural_bg_T)) {
      ruralBg = Number(Number(p.Rural_bg_T).toFixed(2))
    }

    features.push({
      type: 'Feature',
      properties: props,
      geometry: {
        type: feature.geometry.type,
        coordinates: roundCoordinates(feature.geometry.coordinates, 5),
      },
    })
  }

  const thermalOut = {
    type: 'FeatureCollection',
    features,
  }
  const thermalJson = JSON.stringify(thermalOut)
  const thermalPath = path.join(ENVIRONMENTAL_ANALYSIS_DIR, 'thermal_grid.geojson')
  fs.writeFileSync(thermalPath, thermalJson)
  const beforeKb = (fs.statSync(uhiPath).size / 1024).toFixed(0)
  const afterKb = (Buffer.byteLength(thermalJson) / 1024).toFixed(0)
  console.log(
    `[prepare-data] wrote public/data/environmental-analysis/thermal_grid.geojson  (${beforeKb}KB -> ${afterKb}KB, ${features.length} cells, dropped ${dropped})`,
  )

  // SVF sample points
  if (fs.existsSync(svfPointsPath)) {
    const svfRaw = JSON.parse(fs.readFileSync(svfPointsPath, 'utf-8'))
    const svfFeatures = (svfRaw.features ?? []).map((feature) => {
      const p = feature.properties ?? {}
      const rawClass = typeof p.SVF_Class === 'string' ? p.SVF_Class.trim() : ''
      return {
        type: 'Feature',
        properties: {
          id: p.id ?? null,
          SVF_value1: isValidMetric(p.SVF_value1) ? Number(Number(p.SVF_value1).toFixed(4)) : null,
          SVF_Class: SVF_CLASS_LABELS[rawClass] ?? rawClass ?? null,
        },
        geometry: {
          type: feature.geometry.type,
          coordinates: roundCoordinates(feature.geometry.coordinates, 6),
        },
      }
    })
    const svfJson = JSON.stringify({ type: 'FeatureCollection', features: svfFeatures })
    fs.writeFileSync(path.join(ENVIRONMENTAL_ANALYSIS_DIR, 'svf_points.geojson'), svfJson)
    console.log(
      `[prepare-data] wrote public/data/environmental-analysis/svf_points.geojson  (${svfFeatures.length} points)`,
    )
  } else {
    console.warn('[prepare-data] SVF points not found, skipping')
  }

  cleanGeoJson(boundaryPath, 'boundary_800m.geojson', {
    outDir: ENVIRONMENTAL_ANALYSIS_DIR,
    precision: 6,
    keepKeys: ['id'],
  })

  const shadowHourlyMeans = {}
  for (const hour of SHADOW_HOURS) {
    const count = shadowHourlyCounts[hour]
    shadowHourlyMeans[hour] =
      count > 0 ? Number((shadowHourlySums[hour] / count).toFixed(4)) : null
  }

  const summary = {
    cellCount: features.length,
    dropped,
    rural_bg_T: ruralBg,
    utci_c: summarizeNumeric(utciCValues),
    UHI_intens: summarizeNumeric(uhiValues),
    Air_Temp: summarizeNumeric(airValues),
    Tmrt: summarizeNumeric(tmrtValues),
    Wind_speed: summarizeNumeric(windValues),
    utci_class_counts: classCounts,
    shadow_frac: summarizeNumeric(shadowFracValues),
    shadow_hourly_means: shadowHourlyMeans,
    shadow_meta: {
      date: '2026-07-05',
      hours: '07:00–18:00 LST',
      unit: 'fraction_in_shadow',
    },
    generatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(
    path.join(ENVIRONMENTAL_ANALYSIS_DIR, 'environmental_summary.json'),
    JSON.stringify(summary, null, 2),
  )
  console.log('[prepare-data] wrote public/data/environmental-analysis/environmental_summary.json')

  // Export Maps — keep DEM/DSM/CDSM/wall GeoTIFFs as rasters (not converted to GeoJSON)
  const rasterOutDir = path.join(ENVIRONMENTAL_ANALYSIS_DIR, 'rasters')
  fs.mkdirSync(rasterOutDir, { recursive: true })
  const rasterCopies = [
    ['clipped_DEM_WGS84', 'clipped_DEM_WGS84.tif', 'dem.tif'],
    ['final_DSM_WGS84', 'final_DSM_WGS84.tif', 'dsm.tif'],
    ['clipped_canopy_WGS84', 'clipped_canopy_WGS84.tif', 'cdsm.tif'],
    ['clipped_wall_height_WGS84', 'clipped_wall_height_WGS84.tif', 'wall-height.tif'],
    ['clipped_wall_aspect_WGS84', 'clipped_wall_aspect_WGS84.tif', 'wall-aspect.tif'],
    ['shadow_analysis', 'AGGREGATED.tif', 'shadow-aggregated.tif'],
  ]
  for (const [folder, fileName, outName] of rasterCopies) {
    const src = path.join(utciDir, folder, fileName)
    const dest = path.join(rasterOutDir, outName)
    if (!fs.existsSync(src)) {
      console.warn(`[prepare-data] raster missing, skipped: ${folder}/${fileName}`)
      continue
    }
    fs.copyFileSync(src, dest)
    console.log(`[prepare-data] copied environmental raster → rasters/${outName}`)
  }
}

function buildGeoJsonLayers() {
  const boundaryDir = path.join(SOURCE_DIR, 'No1_study_boundary_related_analysis')

  cleanGeoJson(
    path.join(boundaryDir, 'studyarea01_boundary', 'studyarea01_boundary.geojson'),
    'study_area_boundary.geojson',
  )
  cleanGeoJson(
    path.join(boundaryDir, 'GN5_combined_area', 'GN5_combined_area.geojson'),
    'gn5_combined_area.geojson',
  )
  cleanGeoJson(
    path.join(boundaryDir, 'landuse_clipped', 'landuse_clipped.geojson'),
    'landuse.geojson',
    { keepKeys: ['Sub_class', 'Main_C', 'Domain', 'NAME'] },
  )
  cleanGeoJson(
    path.join(boundaryDir, 'clipped_roads', 'clipped_roads.geojson'),
    'roads.geojson',
    { keepKeys: ['name', 'highway'] },
  )
  cleanGeoJson(
    path.join(boundaryDir, 'clipped_railways', 'clipped_railways.geojson'),
    'railways.geojson',
  )
  cleanGeoJson(
    path.join(boundaryDir, 'clipped_buildings', 'clipped_buildings.geojson'),
    'buildings.geojson',
    { keepKeys: ['area_in_me', 'confidence'], precision: 6 },
  )
  cleanGeoJson(
    path.join(boundaryDir, 'clipped_POIS', 'clipped_POIS.geojson'),
    'pois.geojson',
    { keepKeys: ['name', 'name_en', 'amenity', 'shop', 'tourism', 'man_made'] },
  )
}

// ---------------------------------------------------------------------------

async function main() {
  console.log('[prepare-data] starting...')
  buildXlsxData()
  buildGeoJsonLayers()
  await buildUrbanMorphoLayers()
  buildDensityAnalysisLayers()
  buildUrbanMaturationLayers()
  await buildEnvironmentalLayers()
  console.log('[prepare-data] done.')
}

main().catch((err) => {
  console.error('[prepare-data] failed:', err)
  process.exit(1)
})
