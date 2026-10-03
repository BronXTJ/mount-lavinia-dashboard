/** Google-style map coordinate string: lat, lng with fixed decimal places. */
export function formatMapCoordinates(lat, lng, decimals = 6) {
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return ''
  return `${la.toFixed(decimals)}, ${ln.toFixed(decimals)}`
}
