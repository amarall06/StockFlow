import { test, expect } from '@playwright/test'
import { prepareKeyboardPage, openModule } from './helpers/keyboard'

test('retomada agrupa eventos e atualiza caixas das duas categorias', async ({ page }) => {
  const writes = await prepareKeyboardPage(page)
  const total = page.locator('.dashboard-stock-totals .dashboard-stat-total strong')
  await expect(total).toHaveText('5 caixas')
  let queries = 0
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_balances*', async route => {
    if (Number(new URL(route.request().url()).searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    queries++
    return route.fulfill({ json: [
      { product_id: 'p1', location_id: 'l1', status_code: 'awaiting_test', quantity: 7 },
      { product_id: 'p2', location_id: 'l1', status_code: 'in_stock', quantity: 4 },
    ] })
  })
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('online'))
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(total).toHaveText('11 caixas')
  await expect(page.locator('.dashboard-stock-totals .dashboard-stat').nth(0).locator('strong')).toHaveText('7 caixas')
  await expect(page.locator('.dashboard-stock-totals .dashboard-stat').nth(1).locator('strong')).toHaveText('4 caixas')
  expect(queries).toBe(1)
  expect(writes).toEqual([])
})

test('falha na retomada conserva dados e recupera na próxima tentativa', async ({ page }) => {
  await prepareKeyboardPage(page)
  const total = page.locator('.dashboard-stock-totals .dashboard-stat-total strong')
  await expect(total).toHaveText('5 caixas')
  let fail = true
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_balances*', async route => {
    if (fail) return route.abort('failed')
    if (Number(new URL(route.request().url()).searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    return route.fulfill({ json: [{ product_id: 'p2', location_id: 'l1', status_code: 'in_stock', quantity: 8 }] })
  })
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  const error = page.getByRole('status').filter({ hasText: 'Não foi possível atualizar automaticamente.' })
  // Consultas GET têm novas tentativas automáticas no cliente instalado.
  await expect(error).toBeVisible({ timeout: 15000 })
  await expect(total).toHaveText('5 caixas')
  fail = false
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(total).toHaveText('8 caixas')
  await expect(error).toHaveCount(0)
})

test('retomada não atualiza formulário operacional nem apaga o rascunho', async ({ page }) => {
  await page.clock.install()
  const writes = await prepareKeyboardPage(page)
  await openModule(page, 'Visão geral')
  const code = page.locator('.receipt-form').getByLabel('Código do produto', { exact: true })
  await code.fill('AGM-35')
  let queries = 0
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_balances*', async route => {
    queries++
    return route.fulfill({ json: [] })
  })
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('online'))
  })
  await page.clock.fastForward(1000)
  await expect(code).toHaveValue('AGM-35')
  expect(queries).toBe(0)
  expect(writes).toEqual([])
})
