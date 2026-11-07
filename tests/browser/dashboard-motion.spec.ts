import {expect, test} from '@playwright/test'
import {prepareRedesign} from './helpers/redesign'

test('entrada dos cartões do Painel respeita movimento reduzido', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'})
  const state = await prepareRedesign(page)
  const metric = page.locator('.dashboard-stock-totals .dashboard-stat-total')
  const cards = page.locator('.reference-summary-grid')
  await expect(metric).toContainText('53')
  await expect(metric).toHaveCSS('animation-name','liber-panel-enter')
  await expect(cards).toHaveCSS('animation-name','liber-panel-enter')
  await page.emulateMedia({reducedMotion:'reduce'})
  await expect(metric).toHaveCSS('animation-name','none')
  await expect(cards).toHaveCSS('animation-name','none')
  await expect(metric).toContainText('53')
  expect(state.writes).toEqual([])
})

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
