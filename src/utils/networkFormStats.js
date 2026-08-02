import {
  NETWORK_FORM_GN_NAMES,
  NETWORK_FORM_ICONS,
  NETWORK_FORM_SCOPE_ALL,
} from '../constants/networkForm.js'

export function isPrimaryJunction(props) {
  if (props?.inside_primary === true || props?.inside_primary === 'true') return true
  if (props?.inside_gn === true || props?.inside_gn === 'true') return true
  const name = props?.gn_name
  return Boolean(name && NETWORK_FORM_GN_NAMES.includes(name))
}

/** Filter classified junctions for the active scope. */
export function filterJunctionsByScope(geojson, scope) {
  if (!geojson?.features) return []
  return geojson.features.filter((f) => {
    const jtype = f.properties?.jtype
    if (!NETWORK_FORM_ICONS[jtype]) return false
    const gn = f.properties?.gn_name
    if (scope === NETWORK_FORM_SCOPE_ALL) {
      return Boolean(gn && NETWORK_FORM_GN_NAMES.includes(gn))
    }
    return gn === scope
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
    .map((f) => {
      const stub = f.properties?.stub_length_m
      const depth = f.properties?.depth_class
      const stubLabel =
        stub != null && Number.isFinite(Number(stub)) ? `${Number(stub).toFixed(0)} m` : null
      return {
        nodeId: f.properties.node_id,
        degree: f.properties.degree,
        stubLengthM: stub != null ? Number(stub) : null,
        depthClass: depth ?? null,
        label: `Cul-de-sac ${f.properties.node_id}`,
        meta: [depth, stubLabel].filter(Boolean).join(' · ') || null,
      }
    })
}

/** Attach Phase-1 depth fields onto cul-de-sac junction features by node_id. */
export function mergeCuldesacDepth(junctionsFc, depthFc) {
  if (!junctionsFc?.features?.length) return junctionsFc
  const byId = new Map()
  for (const f of depthFc?.features ?? []) {
    const id = f.properties?.node_id
    if (id == null) continue
    byId.set(String(id), f.properties)
  }
  if (!byId.size) return junctionsFc
  return {
    type: 'FeatureCollection',
    features: junctionsFc.features.map((f) => {
      if (f.properties?.jtype !== 'culdesac') return f
      const depth = byId.get(String(f.properties?.node_id))
      if (!depth) return f
      return {
        ...f,
        properties: {
          ...f.properties,
          stub_length_m: depth.stub_length_m,
          neighbor_node_id: depth.neighbor_node_id,
          neighbor_jtype: depth.neighbor_jtype,
          dist_to_junction_m: depth.dist_to_junction_m,
          depth_class: depth.depth_class,
        },
      }
    }),
  }
}

/** Attach Phase-3 walk-access fields onto cul-de-sac junctions by node_id. */
export function mergeCuldesacWalk(junctionsFc, walkFc) {
  if (!junctionsFc?.features?.length) return junctionsFc
  const byId = new Map()
  for (const f of walkFc?.features ?? []) {
    const id = f.properties?.node_id
    if (id == null) continue
    byId.set(String(id), f.properties)
  }
  if (!byId.size) return junctionsFc
  return {
    type: 'FeatureCollection',
    features: junctionsFc.features.map((f) => {
      if (f.properties?.jtype !== 'culdesac') return f
      const walk = byId.get(String(f.properties?.node_id))
      if (!walk) return f
      return {
        ...f,
        properties: {
          ...f.properties,
          hex_id: walk.hex_id,
          access_score: walk.access_score,
          access_tier: walk.access_tier,
          analysis_ok: walk.analysis_ok,
          outside_grid: walk.outside_grid,
        },
      }
    }),
  }
}

export function scopeCuldesacDepthSummary(summary, scope) {
  if (!summary?.by_scope) return null
  return summary.by_scope[scope] ?? summary.by_scope.all ?? null
}

/** Ray-cast point-in-ring (ring = [[lon,lat],...], no holes). */
function pointInRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointInPolygonFeature(lon, lat, feature) {
  const geom = feature?.geometry
  if (!geom) return false
  const polys =
    geom.type === 'Polygon'
      ? [geom.coordinates]
      : geom.type === 'MultiPolygon'
        ? geom.coordinates
        : []
  for (const poly of polys) {
    const outer = poly[0]
    if (!outer || !pointInRing(lon, lat, outer)) continue
    let inHole = false
    for (let h = 1; h < poly.length; h++) {
      if (pointInRing(lon, lat, poly[h])) {
        inHole = true
        break
      }
    }
    if (!inHole) return true
  }
  return false
}

function lineMidpoint(coords) {
  if (!coords?.length) return null
  const mid = coords[Math.floor(coords.length / 2)]
  if (!mid || mid.length < 2) return null
  return [mid[0], mid[1]]
}

function collectLineCoords(geom) {
  if (!geom) return []
  if (geom.type === 'LineString') return [geom.coordinates]
  if (geom.type === 'MultiLineString') return geom.coordinates
  return []
}

/** Keep street features whose midpoint falls in any of the given GN polygons. */
export function filterStreetsByGnFeatures(streets, gnFeatures) {
  if (!streets?.features?.length) return streets
  if (!gnFeatures?.length) return { type: 'FeatureCollection', features: [] }
  const kept = streets.features.filter((f) => {
    const lines = collectLineCoords(f.geometry)
    for (const coords of lines) {
      const mid = lineMidpoint(coords)
      if (!mid) continue
      for (const gn of gnFeatures) {
        if (pointInPolygonFeature(mid[0], mid[1], gn)) return true
      }
    }
    return false
  })
  return { type: 'FeatureCollection', features: kept }
}

export function gnFeaturesForScope(gn5, scope) {
  if (!gn5?.features) return []
  if (scope === NETWORK_FORM_SCOPE_ALL) {
    return gn5.features.filter((f) => NETWORK_FORM_GN_NAMES.includes(f.properties?.ADM4_EN))
  }
  return gn5.features.filter((f) => f.properties?.ADM4_EN === scope)
}

export function scopeMetrics(metricsByScope, scope) {
  if (!metricsByScope) return null
  return metricsByScope[scope] ?? metricsByScope[NETWORK_FORM_SCOPE_ALL] ?? null
}

export function scopeFindings(findingsByScope, scope) {
  if (!findingsByScope) return null
  return findingsByScope[scope] ?? findingsByScope[NETWORK_FORM_SCOPE_ALL] ?? null
}
