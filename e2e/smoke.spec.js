import { test, expect } from '@playwright/test'

const ROUTES = [
  { name: 'overview', path: '/' },
  { name: 'focus-centrality', path: '/focus-area?sub=centrality' },
  { name: 'focus-density', path: '/focus-area?sub=density' },
  { name: 'focus-maturation', path: '/focus-area?sub=maturation' },
  { name: 'focus-walk-access', path: '/focus-area?sub=walk-access' },
  { name: 'focus-network-form', path: '/focus-area?sub=network-form' },
  { name: 'land-use', path: '/land-use' },
  { name: 'connectivity', path: '/connectivity' },
  { name: 'land-cover', path: '/land-cover' },
  { name: 'environmental', path: '/environmental' },
  { name: 'synthesis', path: '/synthesis' },
  { name: 'problems', path: '/problems' },
  { name: 'export-maps', path: '/export-maps' },
]

function isIgnorableConsole(msg) {
  const text = msg.text()
  return (
    text.includes('Download the React DevTools') ||
    text.includes('favicon') ||
    text.includes("Content Security Policy directive 'frame-ancestors' is ignored") ||
    /net::ERR_/.test(text)
  )
}

for (const route of ROUTES) {
  test(`smoke ${route.name}`, async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (err) => pageErrors.push(String(err)))
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isIgnorableConsole(msg)) {
        pageErrors.push(msg.text())
      }
    })

    await page.goto(route.path.replace(/^\//, ''), { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toBeVisible()
    await page.waitForTimeout(1200)
    expect(pageErrors, `console/page errors on ${route.path}`).toEqual([])
    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: false,
      mask: [page.locator('.leaflet-container, .leaflet-pane')],
    })
  })
}
