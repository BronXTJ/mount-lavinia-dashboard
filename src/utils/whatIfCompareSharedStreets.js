/**
 * Shared vs unique Top-5 nearby streets across Ready Compare options.
 * One street can look like a win in every column; uniqueness is the trust check.
 */

function streetKey(row) {
  const id = Number(row?.ID)
  return Number.isFinite(id) ? id : null
}

/**
 * @param {{
 *   readyIds: string[],
 *   listsBySlot: Record<string, Array<{ ID: number, delta?: number }>>,
 * }} args
 * @returns {{
 *   shared: Array<{ ID: number, optionIds: string[], deltas: Record<string, number|null> }>,
 *   unique: Record<string, Array<{ ID: number, delta?: number }>>,
 * }}
 */
export function classifySharedVsUniqueStreets({ readyIds, listsBySlot }) {
  const unique = Object.fromEntries((readyIds ?? []).map((id) => [id, []]))
  const owners = new Map()

  for (const slotId of readyIds ?? []) {
    for (const row of listsBySlot?.[slotId] ?? []) {
      const ID = streetKey(row)
      if (ID == null) continue
      if (!owners.has(ID)) owners.set(ID, [])
      owners.get(ID).push({ id: slotId, ID, delta: row.delta ?? null })
    }
  }

  const shared = []
  for (const [ID, hits] of owners) {
    const optionIds = []
    const deltas = {}
    for (const hit of hits) {
      if (!optionIds.includes(hit.id)) optionIds.push(hit.id)
      if (deltas[hit.id] == null) deltas[hit.id] = hit.delta
    }
    if (optionIds.length >= 2) {
      shared.push({ ID, optionIds, deltas })
    } else {
      unique[optionIds[0]]?.push({ ID, delta: hits[0].delta })
    }
  }

  shared.sort((a, b) => {
    if (b.optionIds.length !== a.optionIds.length) return b.optionIds.length - a.optionIds.length
    const absA = Math.max(0, ...a.optionIds.map((id) => Math.abs(a.deltas[id] ?? 0)))
    const absB = Math.max(0, ...b.optionIds.map((id) => Math.abs(b.deltas[id] ?? 0)))
    return absB - absA
  })

  return { shared, unique }
}
