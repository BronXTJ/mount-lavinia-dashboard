import { junctions } from '../data/junctions'
import { vehicularMovement } from '../data/vehicularMovement'
import { vehicleTypes } from '../data/vehicleTypes'
import { pedestrianData } from '../data/pedestrianData'
import { PERIOD_ORDER, VEHICLE_TYPE_ORDER } from '../data/colors'

export function sumVehicles(junctionId, day, period) {
  return vehicularMovement
    .filter((r) => r.junctionId === junctionId && r.day === day && r.period === period)
    .reduce((s, r) => s + r.count, 0)
}

export function sumPedestrians(junctionId, day, period) {
  const row = pedestrianData.find(
    (r) => r.junctionId === junctionId && r.day === day && r.period === period,
  )
  return row?.count ?? 0
}

export function vehiclesByDirection(junctionId, day, period) {
  return vehicularMovement
    .filter((r) => r.junctionId === junctionId && r.day === day && r.period === period)
    .map((r) => ({ direction: r.direction, count: r.count }))
    .sort((a, b) => b.count - a.count)
}

export function vehicleTypeBreakdown(junctionId, day, period) {
  const rows = vehicleTypes.filter(
    (r) => r.junctionId === junctionId && r.day === day && r.period === period,
  )
  const byType = Object.fromEntries(VEHICLE_TYPE_ORDER.map((t) => [t, 0]))
  for (const r of rows) {
    if (byType[r.type] != null) byType[r.type] += r.count
  }
  const total = Object.values(byType).reduce((s, n) => s + n, 0)
  const segments = VEHICLE_TYPE_ORDER.map((type) => ({
    type,
    count: byType[type],
    pct: total > 0 ? (byType[type] / total) * 100 : 0,
  }))
  const dominant = segments.reduce((best, s) => (s.count > best.count ? s : best), segments[0])
  return { total, segments, dominantType: dominant?.type ?? 'Private' }
}

export function vehiclesByPeriod(junctionId, day) {
  return PERIOD_ORDER.map((period) => ({
    period,
    count: sumVehicles(junctionId, day, period),
  }))
}

export function allJunctionVolumes(day, period) {
  return junctions.map((j) => ({
    junctionId: j.id,
    name: j.name,
    vehicles: sumVehicles(j.id, day, period),
    pedestrians: sumPedestrians(j.id, day, period),
  }))
}

/** Grouped ped chart: one row per period with j1..j4 keys. */
export function pedestrianByPeriodAllJunctions(day) {
  return PERIOD_ORDER.map((period) => {
    const row = { period }
    for (const j of junctions) {
      row[`j${j.id}`] = sumPedestrians(j.id, day, period)
    }
    return row
  })
}

/** Ped share of combined movement: ped / (veh + ped). */
export function pedVehicleLabel(veh, ped) {
  const total = veh + ped
  if (total <= 0) return 'Vehicle dominated junction'
  const pedPct = (ped / total) * 100
  if (pedPct < 10) return 'Vehicle dominated junction'
  if (pedPct <= 20) return 'Mixed movement junction'
  return 'High pedestrian activity'
}

/** Map circle radius 14–28px from volumes across the 4 junctions. */
export function markerRadius(volume, volumes) {
  const min = Math.min(...volumes)
  const max = Math.max(...volumes)
  if (max === min) return 21
  return 14 + ((volume - min) / (max - min)) * 14
}
