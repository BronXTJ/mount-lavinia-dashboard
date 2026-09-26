import { spawnSync } from 'node:child_process'
import { loadCartoApiKey } from './carto-env.mjs'

const key = loadCartoApiKey()
if (key) {
  process.env.VITE_CARTO_API_KEY = key
  console.log('[build:pages] Using VITE_CARTO_API_KEY from env / .env.local / carto dark access.txt')
} else {
  console.warn(
    '[build:pages] No CARTO key found — dark tiles use the public CARTO URL. For production, set VITE_CARTO_API_KEY in .env.local, carto dark access.txt, or GitHub Actions secret VITE_CARTO_API_KEY.',
  )
}

const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], {
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status === null ? 1 : result.status)
