import { test, expect, type Page } from '@playwright/test'
import { prepareKeyboardPage, openModule } from './helpers/keyboard'

const actor = '22222222-2222-4222-8222-222222222222'
async function prepare(page: Page) {
  await page.clock.install()
  const writes = await prepareKeyboardPage(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const state = { factor: 2, fail: false, holdFirstPage: false, held: 0, requests: [] as URL[], release }
  await page.route('https://stockflow-test.supabase.co/rest/v1/profiles*', async route => {
    if (!new URL(route.request().url()).searchParams.get('select')?.includes('id, display_name') && !new URL(route.request().url()).searchParams.get('select')?.includes('id,display_name')) return route.fallback()
    return route.fulfill({ json: [{ id: actor, display_name: `Pessoa ${state.factor}` }] })
  })
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_movements*', async route => {
    const url = new URL(route.request().url())
    const offset = Number(url.searchParams.get('offset'))
    const factor = state.factor
    state.requests.push(url)
    if (state.holdFirstPage && offset === 0) { state.held++; await gate }
    if (state.fail) return route.fulfill({ status: 400, json: { message: 'Falha simulada', code: 'XX000' } })
    return route.fulfill({ json: Array.from({ length: offset === 0 ? 26 : 2 }, (_, i) => ({
      id: `${offset + i}-${factor}`, created_at: '2026-10-27T00:00:00Z', movement_type: 'sale', quantity: factor, unit_type: 'box', status_before: 'in_stock', status_after: null,
      performed_by: actor, notes: `Versão ${factor}, posição ${offset + i}`, product: { code: 'MGM-35' }, origin: { code: 'A01' }, destination: null,
    })) })
  })
  await openModule(page, 'Histórico')
  if (!state.holdFirstPage) await expect(page.locator('.history-panel tbody tr')).toHaveCount(25)
  return { state, writes }
}
async function tick(page: Page, ms = 30_000) {
  await page.clock.fastForward(ms)
  await page.clock.runFor(200)
}
const firstRow = (page: Page) => page.locator('.history-panel tbody tr').first()

test('Histórico atualiza página aplicada mantendo filtros, paginação e responsáveis', async ({ page }) => {
  const { state, writes } = await prepare(page)
  await page.getByRole('combobox', { name: /^Categoria/ }).selectOption('springs')
  await page.getByLabel('Código do produto', { exact: true }).fill('MGM-35')
  await page.getByRole('combobox', { name: /^Tipo de operação/ }).selectOption('sale')
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click()
  await expect(page.locator('.history-panel tbody tr')).toHaveCount(25)
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.locator('.history-panel tbody tr')).toHaveCount(2)
  const before = state.requests.length
  state.factor = 7
  await tick(page)
  await expect(firstRow(page)).toContainText('Versão 7, posição 25')
  await expect(firstRow(page)).toContainText('7 caixas')
  await expect(firstRow(page)).toContainText('Pessoa 7')
  await expect(page.locator('.history-pagination')).toContainText('Página 2')
  await expect(page.getByLabel('Código do produto', { exact: true })).toHaveValue('MGM-35')
  await expect(page.getByRole('combobox', { name: /^Categoria/ })).toHaveValue('springs')
  await expect(page.getByRole('combobox', { name: /^Tipo de operação/ })).toHaveValue('sale')
  expect(state.requests.length).toBe(before + 1)
  const query = state.requests.at(-1)!.searchParams
  expect(query.get('offset')).toBe('25')
  expect(query.get('limit')).toBe('26')
  expect(query.get('movement_type')).toBe('eq.sale')
  expect(query.get('product.code')).toBe('ilike.%MGM-35%')
  expect(query.get('product.or')).toContain('code.like.MGM-%')
  expect(query.get('order')).toBe('created_at.desc,id.desc')
  expect(writes).toEqual([])
})

test('Histórico conserva registros e navegação em falha automática e recupera depois', async ({ page }) => {
  const { state } = await prepare(page)
  state.fail = true
  await tick(page)
  const warning = page.getByRole('status').filter({ hasText: 'Não foi possível atualizar o histórico automaticamente.' })
  await expect(warning).toBeVisible()
  await expect(firstRow(page)).toContainText('Versão 2')
  await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeEnabled()
  state.fail = false
  state.factor = 6
  await tick(page)
  await expect(firstRow(page)).toContainText('Versão 6')
  await expect(warning).toHaveCount(0)
})

test('Histórico não aplica rascunhos de filtros durante a atualização automática', async ({ page }) => {
  const { state } = await prepare(page)
  await page.getByLabel('Código do produto', { exact: true }).fill('MGM-35')
  await page.getByRole('combobox', { name: /^Categoria/ }).selectOption('springs')
  await page.getByRole('combobox', { name: /^Tipo de operação/ }).selectOption('sale')
  state.factor = 5
  await tick(page)
  await expect(firstRow(page)).toContainText('Versão 5')
  const query = state.requests.at(-1)!.searchParams
  expect(query.has('product.code')).toBe(false)
  expect(query.has('product.or')).toBe(false)
  expect(query.has('movement_type')).toBe(false)
  await expect(page.getByLabel('Código do produto', { exact: true })).toHaveValue('MGM-35')
  await expect(page.getByRole('combobox', { name: /^Categoria/ })).toHaveValue('springs')
  await expect(page.getByRole('combobox', { name: /^Tipo de operação/ })).toHaveValue('sale')
})

test('resposta atrasada de uma página do Histórico não substitui a página seguinte', async ({ page }) => {
  const { state } = await prepare(page)
  state.holdFirstPage = true
  state.factor = 99
  await tick(page)
  await expect.poll(() => state.held).toBe(1)
  state.factor = 8
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(firstRow(page)).toContainText('Versão 8, posição 25')
  const oldResponse = page.waitForResponse(response => response.url().includes('/stock_movements') && Number(new URL(response.url()).searchParams.get('offset')) === 0)
  state.release()
  await (await oldResponse).finished()
  await page.clock.runFor(200)
  await expect(firstRow(page)).toContainText('Versão 8, posição 25')
  await expect(page.locator('.history-pagination')).toContainText('Página 2')
})

test('sair do Histórico remove seu temporizador de consulta', async ({ page }) => {
  const { state, writes } = await prepare(page)
  const before = state.requests.length
  await openModule(page, 'Produtos')
  await expect(page.getByRole('heading', { name: 'Produtos cadastrados', exact: true })).toBeVisible()
  await tick(page, 60_000)
  expect(state.requests).toHaveLength(before)
  expect(writes).toEqual([])
})
