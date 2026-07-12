/**
 * Helpers for Census 2024 GN population structure charts.
 */

export const AGE_BAND_ORDER = ['65_plus', '60_64', '15_59', '0_14'] // top → bottom (pyramid)

export function sumAge(divisions, bandId) {
  return divisions.reduce((sum, d) => sum + (d.age?.[bandId] ?? 0), 0)
}

export function studyAreaTotals(data) {
  const divisions = data.divisions
  const total = divisions.reduce((s, d) => s + d.total, 0)
  const age = {}
  for (const band of data.ageBands) {
    age[band.id] = sumAge(divisions, band.id)
  }
  return { name: 'Study area (5 GN)', total, age }
}

export function ageShares(entity) {
  const total = entity.total || 1
  const shares = {}
  for (const [id, count] of Object.entries(entity.age ?? {})) {
    shares[id] = (count / total) * 100
  }
  return shares
}

/** Child = (0–14)/(15–59); Elderly = (60–64 + 65+)/(15–59) */
export function dependencyRatios(entity) {
  const working = entity.age?.['15_59'] || 1
  const child = (entity.age?.['0_14'] ?? 0) / working
  const elderly =
    ((entity.age?.['60_64'] ?? 0) + (entity.age?.['65_plus'] ?? 0)) / working
  return { child, elderly }
}

export function bandLabel(data, id) {
  return data.ageBands.find((b) => b.id === id)?.label ?? id
}
