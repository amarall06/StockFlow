import { test, expect } from '@playwright/test'
import { prepareKeyboardPage } from './helpers/keyboard'

test('saldo inválido recebido durante atualização gera aviso e preserva a consulta anterior', async ({ page }) => {
  await page.clock.install()
  const writes = await prepareKeyboardPage(page)
  await expect(page.locator('.dashboard-stock-totals .dashboard-stat-total')).toContainText('5 caixas')
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_balances*', route => route.fulfill({ json: Number(new URL(route.request().url()).searchParams.get('offset')) > 0 ? [] : [{ product_id: 'p1', location_id: 'l1', status_code: 'awaiting_test', quantity: -2 }] }))
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await page.clock.runFor(500)
  await expect(page.getByText(/Foi encontrado um saldo inválido/)).toBeVisible()
  await expect(page.locator('.dashboard-stock-totals .dashboard-stat-total')).toContainText('5 caixas')
  expect(writes).toEqual([])
})

test('mola recebida em situação de testagem não é apresentada como saldo normal', async ({ page }) => {
  const writes = await prepareKeyboardPage(page)
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_balances*', route => route.fulfill({ json: Number(new URL(route.request().url()).searchParams.get('offset')) > 0 ? [] : [{ product_id: 'p2', location_id: 'l1', status_code: 'awaiting_test', quantity: 2 }] }))
  await page.reload()
  await expect(page.getByText(/situação incompatível com a categoria/)).toBeVisible()
  await expect(page.locator('.dashboard-stock-totals')).toHaveCount(0)
  expect(writes).toEqual([])
})
