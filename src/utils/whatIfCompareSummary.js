import { CENTRALITY_SCALES } from '../constants/centrality.js'

export function compareScalePhrase(scaleMeters) {
  const row = CENTRALITY_SCALES.find((s) => s.meters === scaleMeters)
  if (scaleMeters === 500) return 'walking scale (500 m)'
  if (scaleMeters === 2000) return 'neighbourhood scale (2000 m)'
  if (scaleMeters === 3000) return 'district scale (3000 m)'
  if (scaleMeters === 5000) return 'regional scale (5000 m)'
  return row?.shortLabel ?? `${scaleMeters} m`
}

function finite(v) {
  return v != null && Number.isFinite(v)
}

/** Nearby closeness max Δ per 100 m of new street. Null if length is 0 or Δ is missing. */
export function gainPer100m(maxDelta, lengthM) {
  if (!finite(maxDelta) || !finite(lengthM) || lengthM <= 0) return null
  return maxDelta / (lengthM / 100)
}
