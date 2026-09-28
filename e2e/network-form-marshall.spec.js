import { test, expect } from '@playwright/test'

test('Marshall morphology shows the stored matrix', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(String(err)))

  await page.goto('focus-area?sub=network-form', { waitUntil: 'domcontentloaded' })
  await page.getByRole('tab', { name: 'Marshall Morphology' }).click()
  await expect(page.getByTestId('marshall-matrix')).toBeVisible()
  await expect(page.getByTestId('marshall-matrix-figure')).toBeVisible()
  await expect(page.getByTestId('marshall-counts-table')).toBeVisible()
  await expect(page.getByTestId('marshall-counts-table')).toContainText('108')
  await expect(page.getByTestId('marshall-study-area')).toContainText('376')
  await expect(page.getByTestId('marshall-uncertainty')).toContainText('excluded from ratio calculations')
  await expect(page.getByTestId('marshall-uncertainty')).toContainText('Junction crossings')
  await expect(page.getByTestId('marshall-uncertainty')).toContainText('3')
  await expect(page.getByTestId('marshall-uncertainty')).toContainText('Data quality')
  await expect(page.getByText('Pattern:')).toHaveCount(0)

  await page
    .getByRole('button', { name: /Kawdana West\. X-ratio/i })
    .click()
  await expect(page.getByTestId('marshall-matrix-point-popup')).toContainText('Kawdana West')
  await expect(page.getByText('Structural pattern for')).toContainText('Kawdana West')

  expect(pageErrors).toEqual([])
})
