import { test, expect, type Page } from '@playwright/test'
import { prepareKeyboardPage } from './helpers/keyboard'

type Selection = { p_days: number; p_category: string }
function report(input: Selection, sold = 6, stock = 7) {
  const asOf = Date.parse('2026-10-27T00:00:00Z')
  return {
    as_of: new Date(asOf).toISOString(),
    period_start: new Date(asOf - input.p_days * 86400000).toISOString(),
    days: input.p_days, category: input.p_category,
    products: [
      { code: 'MGM-12', registered_at: '2026-01-01T00:00:00Z', sold_boxes: sold * 4, sales_count: 1, last_sale_at: '2026-10-26T00:00:00Z', stock_boxes: 10 },
      { code: 'MGM-35', registered_at: '2026-01-01T00:00:00Z', sold_boxes: sold, sales_count: 1, last_sale_at: '2026-10-25T00:00:00Z', stock_boxes: stock },
    ],
  }
}
async function openTurnover(page: Page) {
  await page.getByLabel('Opções da conta').click()
  await page.locator('.account-options').getByRole('button', { name: 'Giro e ABC', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Giro e Curva ABC', exact: true })).toBeVisible()
}
async function tick(page: Page) {
  await page.clock.fastForward(30_000)
  await page.clock.runFor(200)
}
const rowFor = (page: Page) => page.locator('.turnover-table tbody tr').filter({ hasText: 'MGM-35' })
const endpoint = 'https://stockflow-test.supabase.co/rest/v1/rpc/inventory_turnover'

test('Giro automático atualiza resultados mantendo período, categoria, busca e classe', async ({ page }) => {
  await page.clock.install()
  const writes = await prepareKeyboardPage(page)
  const selections: Selection[] = []
  let sold = 6
  await page.route(endpoint, async route => {
    const input = route.request().postDataJSON() as Selection
    selections.push(input)
    await route.fulfill({ json: report(input, sold, sold + 1) })
  })
  await openTurnover(page)
  await expect(rowFor(page).locator('td').nth(2)).toHaveText('6')
  await page.getByRole('combobox', { name: /^Período/ }).selectOption('30')
  await page.getByRole('combobox', { name: /^Categoria/ }).selectOption('springs')
  await expect(page.locator('.turnover-summary')).toContainText('Últimos 30 dias')
  await page.getByLabel('Buscar código ou aplicação').fill('MGM-35')
  await page.getByRole('combobox', { name: /^Classificação/ }).selectOption('B')
  await expect(page.locator('.turnover-table tbody tr')).toHaveCount(1)
  const before = selections.length
  sold = 12
  await tick(page)
  await expect(rowFor(page).locator('td').nth(2)).toHaveText('12')
  await expect(rowFor(page).locator('td').nth(6)).toHaveText('13')
  await expect(page.getByLabel('Buscar código ou aplicação')).toHaveValue('MGM-35')
  await expect(page.getByRole('combobox', { name: /^Classificação/ })).toHaveValue('B')
  await expect(page.getByRole('combobox', { name: /^Categoria/ })).toHaveValue('springs')
  await expect(page.getByRole('combobox', { name: /^Período/ })).toHaveValue('30')
  expect(selections.length).toBe(before + 1)
  expect(selections.at(-1)).toMatchObject({ p_days: 30, p_category: 'springs' })
  expect(writes).toEqual([])
})

test('falha no Giro automático preserva relatório e recupera no próximo intervalo', async ({ page }) => {
  await page.clock.install()
  await prepareKeyboardPage(page)
  let fail = false
  let sold = 6
  await page.route(endpoint, async route => {
    if (fail) return route.fulfill({ status: 503, json: { message: 'Falha simulada de relatório' } })
    await route.fulfill({ json: report(route.request().postDataJSON(), sold) })
  })
  await openTurnover(page)
  await expect(rowFor(page).locator('td').nth(2)).toHaveText('6')
  fail = true
  await tick(page)
  const warning = page.getByRole('status').filter({ hasText: 'Não foi possível atualizar os indicadores automaticamente.' })
  await expect(warning).toBeVisible()
  await expect(rowFor(page).locator('td').nth(2)).toHaveText('6')
  fail = false
  sold = 9
  await tick(page)
  await expect(rowFor(page).locator('td').nth(2)).toHaveText('9')
  await expect(warning).toHaveCount(0)
})

test('Giro não sobrepõe atualização periódica à primeira consulta lenta', async ({ page }) => {
  await page.clock.install()
  await prepareKeyboardPage(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let calls = 0
  await page.route(endpoint, async route => {
    calls++
    await gate
    await route.fulfill({ json: report(route.request().postDataJSON()) })
  })
  await openTurnover(page)
  await expect.poll(() => calls).toBeGreaterThan(0)
  // StrictMode pode executar o efeito inicial duas vezes no desenvolvimento.
  await page.clock.runFor(200)
  const initialCalls = calls
  await page.clock.fastForward(60_000)
  await page.clock.runFor(200)
  expect(calls).toBe(initialCalls)
  release()
  await expect(rowFor(page)).toBeVisible()
  await tick(page)
  await expect.poll(() => calls).toBe(initialCalls + 1)
})

test('resposta automática atrasada do Giro não substitui uma categoria nova', async ({ page }) => {
  await page.clock.install()
  await prepareKeyboardPage(page)
  let hold = false
  let waiting = false
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route(endpoint, async route => {
    const input = route.request().postDataJSON() as Selection
    if (hold && input.p_category === 'all') {
      waiting = true
      await gate
      return route.fulfill({ json: report(input, 6, 999) })
    }
    return route.fulfill({ json: report(input, 6, input.p_category === 'springs' ? 77 : 7) })
  })
  await openTurnover(page)
  await expect(rowFor(page).locator('td').nth(6)).toHaveText('7')
  hold = true
  await tick(page)
  await expect.poll(() => waiting).toBe(true)
  await page.getByRole('combobox', { name: /^Categoria/ }).selectOption('springs')
  await expect(rowFor(page).locator('td').nth(6)).toHaveText('77')
  const oldResponse = page.waitForResponse(response => response.url() === endpoint && response.request().postDataJSON().p_category === 'all')
  release()
  await (await oldResponse).finished()
  await page.clock.runFor(200)
  await expect(rowFor(page).locator('td').nth(6)).toHaveText('77')
  await expect(page.getByRole('combobox', { name: /^Categoria/ })).toHaveValue('springs')
})
