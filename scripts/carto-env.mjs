import fs from 'node:fs'
import path from 'node:path'

function parseEnvFileValue(raw) {
  const val = raw.trim().replace(/^['"]|['"]$/g, '')
  return val || ''
}

function readKeyFromDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return ''
  const text = fs.readFileSync(filePath, 'utf8')
  const m = text.match(/^\s*VITE_CARTO_API_KEY\s*=\s*(.+)\s*$/m)
  return m ? parseEnvFileValue(m[1]) : ''
}

/** Resolve CARTO key for production builds (never log the value). */
export function loadCartoApiKey() {
  const fromEnv = process.env.VITE_CARTO_API_KEY?.trim()
  if (fromEnv) return fromEnv

  const root = process.cwd()
  for (const name of ['.env.local', '.env']) {
    const key = readKeyFromDotEnv(path.join(root, name))
    if (key) return key
  }

  const cartoTxt = path.join(root, 'carto dark access.txt')
  if (!fs.existsSync(cartoTxt)) return ''

  const raw = fs.readFileSync(cartoTxt, 'utf8').trim()
  if (!raw) return ''

  const urlKey = raw.match(/[?&]key=([^&\s]+)/i)
  if (urlKey) return decodeURIComponent(urlKey[1])

  const lineMatch = raw.match(/^\s*VITE_CARTO_API_KEY\s*=\s*(.+)$/m)
  if (lineMatch) return parseEnvFileValue(lineMatch[1])

  return raw.split(/\s+/)[0].trim()
}
