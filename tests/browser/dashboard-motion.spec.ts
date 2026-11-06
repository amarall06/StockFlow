import {expect, test} from '@playwright/test'
import {prepareRedesign} from './helpers/redesign'

test('gráficos animam sem alterar valores e respeitam movimento reduzido', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'})
  await prepareRedesign(page)
  const series = page.locator('.activity-chart-series')
  const sales = page.locator('.dashboard-sales-panel .dashboard-bar-track > span').first()
  await expect(series).toHaveCSS('animation-name', 'liber-chart-enter')
  await expect(sales).toHaveCSS('animation-name', 'liber-sales-enter')
  const values = await series.locator('title').allTextContents()
  expect(values.length).toBeGreaterThan(0)
  await page.emulateMedia({reducedMotion:'reduce'})
  await expect(series).toHaveCSS('animation-name', 'none')
  await expect(sales).toHaveCSS('animation-name', 'none')
  expect(await series.locator('title').allTextContents()).toEqual(values)
})
