/**
 * Hash every file under public/data into public/data/manifest.json
 * and src/data/assetManifest.json. Skips unpublished condominiums_*.geojson.
 * Does not rewrite GeoJSON or rasters. Run: npm run write-manifest
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const OUT = path.join(DATA_DIR, 'manifest.json')
const SRC_OUT = path.join(ROOT, 'src', 'data', 'assetManifest.json')

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (entry.name !== 'manifest.json' && !/^condominiums_.*\.geojson$/i.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

const files = {}
for (const full of walk(DATA_DIR)) {
  const rel = path.relative(DATA_DIR, full).split(path.sep).join('/')
  const hash = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0, 12)
  files[rel] = hash
}

const manifest = {
  version: 1,
  generated_at: new Date().toISOString(),
  files,
}

const body = JSON.stringify(manifest, null, 2)
fs.writeFileSync(OUT, body)
fs.mkdirSync(path.dirname(SRC_OUT), { recursive: true })
fs.writeFileSync(SRC_OUT, body)
console.log(`[manifest] wrote ${Object.keys(files).length} hashes to public/data/manifest.json`)
