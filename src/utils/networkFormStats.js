import { NETWORK_FORM_ICONS } from '../constants/networkForm.js'

export function isInsideGn(props) {
  return props?.inside_gn === true || props?.inside_gn === 'true'
}

export function filterInsideJunctions(geojson) {
  if (!geojson?.features) return []
  return geojson.features.filter((f) => {
    const jtype = f.properties?.jtype
    return isInsideGn(f.properties) && Boolean(NETWORK_FORM_ICONS[jtype])
  })
}

export function countByJtype(features) {
  const counts = { four_way: 0, three_way: 0, culdesac: 0 }
  for (const f of features) {
    const jtype = f.properties?.jtype
    if (counts[jtype] != null) counts[jtype] += 1
  }
  return counts
}

export function formatPct(share) {
  if (share == null || Number.isNaN(Number(share))) return '—'
  return `${(Number(share) * 100).toFixed(1)}%`
}

export function formatRatio(ratio) {
  return ratio ?? '—'
}

export function junctionLatLng(feature) {
  const coords = feature?.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  return [coords[1], coords[0]]
}

export function findJunctionById(geojson, nodeId) {
  if (!geojson?.features || nodeId == null) return null
  return (
    geojson.features.find((f) => String(f.properties?.node_id) === String(nodeId)) ?? null
  )
}

/** Donut/bar data from inside-GN counts. */
export function buildTypeShareZones(counts) {
  const total = (counts.four_way || 0) + (counts.three_way || 0) + (counts.culdesac || 0)
  if (!total) return null
  return [
    {
      name: '4-way',
      count: counts.four_way,
      pct: Math.round((100 * counts.four_way) / total),
      color: NETWORK_FORM_ICONS.four_way.color,
    },
    {
      name: '3-way',
      count: counts.three_way,
      pct: Math.round((100 * counts.three_way) / total),
      color: NETWORK_FORM_ICONS.three_way.color,
    },
    {
      name: 'Cul-de-sac',
      count: counts.culdesac,
      pct: Math.round((100 * counts.culdesac) / total),
      color: NETWORK_FORM_ICONS.culdesac.color,
    },
  ]
}

export function listCuldesacs(features, limit = 12) {
  return features
    .filter((f) => f.properties?.jtype === 'culdesac')
    .slice(0, limit)
    .map((f) => ({
      nodeId: f.properties.node_id,
      degree: f.properties.degree,
      label: `Cul-de-sac #${f.properties.node_id}`,
    }))
}
