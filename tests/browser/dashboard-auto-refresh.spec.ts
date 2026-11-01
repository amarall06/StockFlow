import { test, expect, type Page } from '@playwright/test'
import { prepareKeyboardPage } from './helpers/keyboard'

function dashboard(factor: number) {
  return { as_of: '2026-10-27T00:00:00Z', period_start: '2026-09-27T00:00:00Z', sold_boxes: factor, sales_count: 1,
    sales_by_product: [{ code: 'MGM-35', boxes: factor }],
    receipts: [{ id: 'e1', created_at: '2026-10-26T00:00:00Z', code: 'MGM-35', boxes: factor + 1, location: 'A01', supplier: 'Fornecedor fictício', lot: 'DEMO' }],
  }
}
function activity(days: number, factor: number) {
  return Array.from({ length: days }, (_, i) => ({ day: new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10), sold_boxes: factor + i % 3, received_boxes: factor * 2 + i % 5 }))
}
async function prepare(page: Page) {
  await page.clock.install()
  const writes = await prepareKeyboardPage(page, { inventory_dashboard: dashboard(2), inventory_activity_daily: activity(7, 2) })
  await expect(page.locator('.dashboard-sales-table')).toBeVisible()
  await expect(page.locator('.activity-chart')).toBeVisible()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const state = { factor: 2, failDashboard: false, failActivity: false, holdAll: false, held: 0,
    requests: [] as { name: string; category: string; days?: number }[], release,
  }
  for (const name of ['inventory_dashboard', 'inventory_activity_daily']) {
    await page.route(`https://stockflow-test.supabase.co/rest/v1/rpc/${name}`, async route => {
      const input = route.request().postDataJSON()
      state.requests.push({ name, category: input.p_category, days: input.p_days })
      const factor = state.factor
      if (state.holdAll && input.p_category === 'all') { state.held++; await gate }
      if (name === 'inventory_dashboard' ? state.failDashboard : state.failActivity) {
        return route.fulfill({ status: 503, json: { message: 'Falha simulada de relatório' } })
      }
      return route.fulfill({ json: name === 'inventory_dashboard' ? dashboard(factor) : activity(input.p_days, factor) })
    })
  }
  return { state, writes }
}
async function tick(page: Page) {
  await page.clock.fastForward(30_000)
  await page.clock.runFor(200)
}
const sold = (page: Page) => page.locator('.dashboard-sales-table tbody tr strong')
const firstDay = (page: Page) => page.locator('.activity-values tbody tr').first()
async function showValues(page: Page) {
  await page.locator('.activity-values summary').click()
}

test('Painel renova vendas, entradas e atividade preservando todos os filtros', async ({ page }) => {
  const { state, writes } = await prepare(page)
  await page.getByText('Filtros do painel', { exact: true }).click()
  await page.getByRole('combobox', { name: /^Filtrar indicadores/ }).selectOption('springs')
  await page.getByLabel('Período do gráfico', { exact: true }).selectOption('30')
  await expect(page.locator('.activity-chart')).toBeVisible()
  await page.getByLabel('Série do gráfico', { exact: true }).selectOption('received_boxes')
  await page.getByLabel('Visualização do gráfico', { exact: true }).selectOption('line')
  await showValues(page)
  await expect(page.locator('.activity-values tbody tr')).toHaveCount(30)
  await page.getByLabel('Dia do gráfico', { exact: true }).press('End')
  await expect(page.getByLabel('Dia do gráfico', { exact: true })).toHaveValue('29')
  const before = state.requests.length
  state.factor = 9
  await tick(page)
  await expect(sold(page)).toHaveText('9')
  await expect(page.locator('.dashboard-receipt-list b')).toHaveText('+ 10')
  await expect(firstDay(page).locator('td').nth(2)).toHaveText('18')
  await expect(page.getByRole('combobox', { name: /^Filtrar indicadores/ })).toHaveValue('springs')
  await expect(page.getByLabel('Período do gráfico', { exact: true })).toHaveValue('30')
  await expect(page.getByLabel('Série do gráfico', { exact: true })).toHaveValue('received_boxes')
  await expect(page.getByLabel('Visualização do gráfico', { exact: true })).toHaveValue('line')
  await expect(page.getByLabel('Dia do gráfico', { exact: true })).toHaveValue('29')
  await expect(page.locator('.activity-values')).toHaveAttribute('open', '')
  expect(state.requests.slice(before)).toEqual(expect.arrayContaining([
    { name: 'inventory_dashboard', category: 'springs', days: undefined },
    { name: 'inventory_activity_daily', category: 'springs', days: 30 },
  ]))
  expect(writes).toEqual([])
})

test('Painel conserva os dois relatórios em falha automática e recupera depois', async ({ page }) => {
  const { state } = await prepare(page)
  await showValues(page)
  state.failDashboard = true
  state.failActivity = true
  await tick(page)
  const reportWarning = page.getByRole('status').filter({ hasText: 'Não foi possível atualizar vendas e entradas automaticamente.' })
  const activityWarning = page.getByRole('status').filter({ hasText: 'Não foi possível atualizar a atividade diária automaticamente.' })
  await expect(reportWarning).toBeVisible()
  await expect(activityWarning).toBeVisible()
  await expect(sold(page)).toHaveText('2')
  await expect(firstDay(page).locator('td').nth(1)).toHaveText('2')
  state.failDashboard = false
  state.failActivity = false
  state.factor = 8
  await tick(page)
  await expect(sold(page)).toHaveText('8')
  await expect(firstDay(page).locator('td').nth(1)).toHaveText('8')
  await expect(reportWarning).toHaveCount(0)
  await expect(activityWarning).toHaveCount(0)
})

test('falha da atividade não impede atualização das vendas e entradas', async ({ page }) => {
  const { state } = await prepare(page)
  await showValues(page)
  state.factor = 7
  state.failActivity = true
  await tick(page)
  await expect(sold(page)).toHaveText('7')
  await expect(page.locator('.dashboard-receipt-list b')).toHaveText('+ 8')
  await expect(firstDay(page).locator('td').nth(1)).toHaveText('2')
  await expect(page.getByRole('status').filter({ hasText: 'Não foi possível atualizar a atividade diária automaticamente.' })).toBeVisible()
})

test('respostas antigas dos relatórios do Painel não substituem nova categoria', async ({ page }) => {
  const { state } = await prepare(page)
  state.factor = 99
  state.holdAll = true
  await tick(page)
  await expect.poll(() => state.held).toBe(2)
  state.factor = 9
  await page.getByText('Filtros do painel', { exact: true }).click()
  await page.getByRole('combobox', { name: /^Filtrar indicadores/ }).selectOption('springs')
  await expect(sold(page)).toHaveText('9')
  await expect(page.locator('.activity-chart')).toBeVisible()
  await showValues(page)
  await expect(firstDay(page).locator('td').nth(1)).toHaveText('9')
  const responses = ['inventory_dashboard', 'inventory_activity_daily'].map(name => page.waitForResponse(response => response.url().endsWith(`/rpc/${name}`) && response.request().postDataJSON().p_category === 'all'))
  state.release()
  for (const response of await Promise.all(responses)) await response.finished()
  await page.clock.runFor(200)
  await expect(sold(page)).toHaveText('9')
  await expect(firstDay(page).locator('td').nth(1)).toHaveText('9')
})

test('relatórios do Painel pausam durante atualização manual do estoque', async ({ page }) => {
  const { state } = await prepare(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let stockReading = false
  await page.route('https://stockflow-test.supabase.co/rest/v1/rpc/inventory_api_version', async route => {
    stockReading = true
    await gate
    return route.fulfill({ json: 16 })
  })
  await page.getByText('Filtros do painel', { exact: true }).click()
  await page.getByRole('button', { name: 'Atualizar painel', exact: true }).click()
  await expect.poll(() => stockReading).toBe(true)
  await page.clock.fastForward(60_000)
  await page.clock.runFor(200)
  expect(state.requests).toHaveLength(0)
  state.factor = 6
  release()
  await expect(sold(page)).toHaveText('6')
})
