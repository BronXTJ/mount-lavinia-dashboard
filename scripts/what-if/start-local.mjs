/**
 * Local What-if environment: sDNA worker + Vite dashboard.
 *
 *   npm run what-if
 *
 * Open http://localhost:5173/mount-lavinia-dashboard/ — not GitHub Pages.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DASHBOARD_URL = 'http://localhost:5173/mount-lavinia-dashboard/'
const WORKER_HEALTH = 'http://127.0.0.1:8787/health'

const children = []
let shuttingDown = false

async function workerUp() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch(WORKER_HEALTH, { signal: ctrl.signal })
    clearTimeout(t)
    return res.ok
  } catch {
    return false
  }
}

function spawnInherit(command, args) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    windowsHide: false,
  })
  children.push(child)
  return child
}

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    try {
      if (child.exitCode == null) child.kill()
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  console.log('')
  console.log('=== Mount Lavinia What-if (local sDNA) ===')
  console.log('Open this URL (not GitHub Pages):')
  console.log(`  ${DASHBOARD_URL}`)
  console.log('Focus Area → Centrality → What-if → draw a link → finish')
  console.log('Leave this window open. Ctrl+C to stop.')
  console.log('')

  if (await workerUp()) {
    console.log('sDNA worker already on http://127.0.0.1:8787 — reusing it.')
  } else {
    console.log('Starting sDNA worker on http://127.0.0.1:8787 …')
    spawnInherit('python', ['scripts/what-if/api/server.py'])
  }

  spawnInherit('npm', ['run', 'dev', '--', '--open', '/mount-lavinia-dashboard/'])

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('exit', shutdown)
}

main().catch((err) => {
  console.error(err)
  shutdown()
  process.exit(1)
})
