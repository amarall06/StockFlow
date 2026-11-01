import { test, expect } from '@playwright/test'
import { prepareKeyboardPage, openModule } from './helpers/keyboard'

test('estoque atualiza periodicamente sem voltar à aba nem recarregar', async ({ page }) => {
  await page.clock.install()
  const writes = await prepareKeyboardPage(page)
  const total = page.locator('.dashboard-stock-totals .dashboard-stat-total strong')
  await expect(total).toHaveText('5 caixas')
  let queries = 0
  let boxes = 7
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_balances*', async route => {
    if (Number(new URL(route.request().url()).searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    queries++
    return route.fulfill({ json: [
      { product_id: 'p1', location_id: 'l1', status_code: 'awaiting_test', quantity: boxes },
      { product_id: 'p2', location_id: 'l1', status_code: 'in_stock', quantity: 4 },
    ] })
  })
  await page.clock.fastForward(30_000)
  await page.clock.runFor(200)
  await expect(total).toHaveText('11 caixas')
  expect(queries).toBe(1)
  boxes = 8
  await page.clock.fastForward(30_000)
  await page.clock.runFor(200)
  await expect(total).toHaveText('12 caixas')
  expect(queries).toBe(2)
  expect(writes).toEqual([])
})

test('temporizador não atualiza sob diálogo nem durante formulário operacional', async ({ page }) => {
  await page.clock.install()
  const writes = await prepareKeyboardPage(page)
  await openModule(page, 'Produtos')
  await page.getByRole('button', { name: 'Ampliar foto de AGM-35 — exemplo ilustrativo', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'AGM-35', exact: true })).toBeVisible()
  let queries = 0
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_balances*', async route => {
    queries++
    return route.fulfill({ json: [] })
  })
  await page.clock.fastForward(60_000)
  await page.clock.runFor(200)
  expect(queries).toBe(0)
  await page.keyboard.press('Escape')
  await openModule(page, 'Visão geral')
  const code = page.locator('.receipt-form').getByLabel('Código do produto', { exact: true })
  await code.fill('AGM-35')
  await page.clock.fastForward(60_000)
  await page.clock.runFor(200)
  await expect(code).toHaveValue('AGM-35')
  expect(queries).toBe(0)
  expect(writes).toEqual([])
})
