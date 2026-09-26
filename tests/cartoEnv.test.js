import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadCartoApiKey } from '../scripts/carto-env.mjs'

describe('loadCartoApiKey', () => {
  let tmpDir
  let prevCwd
  let prevKey

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carto-env-'))
    prevCwd = process.cwd()
    prevKey = process.env.VITE_CARTO_API_KEY
    delete process.env.VITE_CARTO_API_KEY
    process.chdir(tmpDir)
  })

  afterEach(() => {
    process.chdir(prevCwd)
    if (prevKey !== undefined) process.env.VITE_CARTO_API_KEY = prevKey
    else delete process.env.VITE_CARTO_API_KEY
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('prefers VITE_CARTO_API_KEY from the environment', () => {
    process.env.VITE_CARTO_API_KEY = 'from-env'
    expect(loadCartoApiKey()).toBe('from-env')
  })

  it('reads .env.local when the env var is unset', () => {
    fs.writeFileSync(path.join(tmpDir, '.env.local'), 'VITE_CARTO_API_KEY=from-dotenv\n')
    expect(loadCartoApiKey()).toBe('from-dotenv')
  })

  it('parses carto dark access.txt (plain key or URL with key=)', () => {
    fs.writeFileSync(path.join(tmpDir, 'carto dark access.txt'), 'plain-key-token\n')
    expect(loadCartoApiKey()).toBe('plain-key-token')

    fs.writeFileSync(
      path.join(tmpDir, 'carto dark access.txt'),
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=url-key\n',
    )
    expect(loadCartoApiKey()).toBe('url-key')
  })
})
