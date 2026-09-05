import { getWhatIfWorkerBase, whatIfWorkerArtifactUrl } from '../constants/centralityWhatIf.js'

const POLL_MS = 1500
const POLL_MAX_MS = 30 * 60 * 1000

/** Chromium Local Network Access: public HTTPS → 127.0.0.1 needs loopback address space. */
function workerFetchInit(init = {}) {
  return { ...init, targetAddressSpace: 'loopback' }
}

async function fetchJson(url, init) {
  const res = await fetch(url, workerFetchInit(init))
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

/** @returns {Promise<{ ok: boolean, sdna?: boolean } | null>} */
export async function checkWorkerHealth() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2000)
    const data = await fetchJson(`${getWhatIfWorkerBase()}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    return data
  } catch {
    return null
  }
}

/** @param {GeoJSON.FeatureCollection} geojson */
export async function submitJob(geojson) {
  return fetchJson(`${getWhatIfWorkerBase()}/v1/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geojson),
  })
}

/**
 * Poll until done/error or timeout.
 * @param {string} jobId
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function pollJob(jobId, opts = {}) {
  const started = Date.now()
  while (Date.now() - started < POLL_MAX_MS) {
    if (opts.signal?.aborted) throw new Error('Aborted')
    const job = await fetchJson(`${getWhatIfWorkerBase()}/v1/jobs/${jobId}`, {
      signal: opts.signal,
    })
    if (job.status === 'done' || job.status === 'error') return job
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  throw new Error('sDNA job timed out')
}

export async function fetchJobArtifact(jobId, fileName, opts = {}) {
  return fetchJson(whatIfWorkerArtifactUrl(jobId, fileName), { signal: opts.signal })
}

/**
 * Submit + poll + load closeness/betweenness/summary for one scale.
 * @param {GeoJSON.FeatureCollection} geojson
 * @param {number} scaleMeters
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function runWhatIfJob(geojson, scaleMeters, opts = {}) {
  const health = await checkWorkerHealth()
  if (!health?.ok) {
    const err = new Error('WORKER_OFFLINE')
    err.code = 'WORKER_OFFLINE'
    throw err
  }
  if (!health.sdna) {
    const err = new Error('sDNA not found on worker host')
    err.code = 'SDNA_MISSING'
    throw err
  }
  const { id } = await submitJob(geojson)
  const job = await pollJob(id, opts)
  if (job.status === 'error') {
    throw new Error(job.error || 'sDNA job failed')
  }
  const [closeness, betweenness, summary] = await Promise.all([
    fetchJobArtifact(id, `closeness_${scaleMeters}.geojson`, opts),
    fetchJobArtifact(id, `betweenness_${scaleMeters}.geojson`, opts),
    fetchJobArtifact(id, 'summary.json', opts),
  ])
  return { jobId: id, closeness, betweenness, summary }
}
