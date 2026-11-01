import { test, expect } from '@playwright/test'
import { prepareKeyboardPage } from './helpers/keyboard'

test('atividade distingue ausência de movimentos de ausência de vendas e calcula locais sem duplicar transferências', async ({ page }) => {
  const writes = await prepareKeyboardPage(page, { stock_movements: [
    { id: 'a', created_at: new Date().toISOString(), quantity: 2, product: { code: 'AGM-35' }, origin: { code: 'A01' }, destination: { code: 'A02' } },
    { id: 'b', created_at: new Date().toISOString(), quantity: 1, product: { code: 'AGM-35' }, origin: { code: 'A01' }, destination: { code: 'A01' } },
  ] })
  const panel = page.getByRole('region', { name: 'Atividade por produto e prateleira' })
  await expect(panel.getByRole('heading', { name: 'Produtos com saldo sem movimentação no período: 1', exact: true })).toBeVisible()
  const products = panel.getByRole('table', { name: 'Última movimentação dos produtos com saldo' })
  await expect(products.getByRole('row').filter({ hasText: 'MGM-35' })).toContainText('Sem movimentação no período')
  await expect(products.getByRole('row').filter({ hasText: 'AGM-35' })).not.toContainText('Sem movimentação no período')
  const heat = panel.getByRole('table', { name: 'Mapa de calor por prateleira', exact: true })
  const first = heat.getByRole('row').filter({ has: page.getByRole('cell', { name: 'A01', exact: true }) })
  await expect(first.getByRole('cell').nth(1)).toHaveText('2')
  await expect(first.getByRole('cell').nth(2)).toHaveText('3')
  await expect(heat.getByRole('row').filter({ hasText: 'A02' })).toContainText('50%')
  await panel.getByLabel('Intensidade do mapa de calor').selectOption('boxes')
  await expect(heat.getByRole('row').filter({ hasText: 'A02' })).toContainText('67%')
  expect(writes).toEqual([])
})

test('troca de período permite recuperar falha sem inventar atividade', async ({ page }) => {
  await prepareKeyboardPage(page)
  const panel = page.getByRole('region', { name: 'Atividade por produto e prateleira' })
  await expect(panel).toContainText('Produtos com saldo sem movimentação no período: 2')
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_movements*', route => route.fulfill({ status: 400, json: { message: 'Falha simulada' } }))
  await panel.getByLabel('Período de atividade').selectOption('30')
  await expect(panel).toContainText('Não foi possível atualizar')
  await expect(panel.getByRole('table')).toHaveCount(0)
  await page.unroute('https://stockflow-test.supabase.co/rest/v1/stock_movements*')
  await panel.getByLabel('Período de atividade').selectOption('180')
  await expect(panel).toContainText('Produtos com saldo sem movimentação no período: 2')
})

test('resposta de período anterior não substitui o atual e filtro de molas respeita a categoria', async ({ page }) => {
  await prepareKeyboardPage(page)
  const panel = page.getByRole('region', { name: 'Atividade por produto e prateleira' })
  await expect(panel).toContainText('Produtos com saldo sem movimentação no período: 2')
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let started = false, released = false
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_movements*', async route => {
    const url = new URL(route.request().url())
    if (Number(url.searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    const days = Math.round((Date.parse(url.searchParams.get('created_at')!.slice(4)) - Date.now()) / -86400000)
    const old = days === 30
    if (old) { started = true; await gate }
    await route.fulfill({ json: [{ id: old ? 'old' : 'new', created_at: new Date().toISOString(), quantity: 1, product: { code: old ? 'MGM-35' : 'AGM-35' }, origin: null, destination: { code: 'A01' } }] })
    if (old) released = true
  })
  await panel.getByLabel('Período de atividade').selectOption('30')
  await expect.poll(() => started).toBe(true)
  await panel.getByLabel('Período de atividade').selectOption('180')
  await expect(panel).toContainText('Produtos com saldo sem movimentação no período: 1')
  release()
  await expect.poll(() => released).toBe(true)
  await page.getByText('Filtros do painel', { exact: true }).click()
  await page.getByLabel('Filtrar indicadores').selectOption('springs')
  const products = panel.getByRole('table', { name: 'Última movimentação dos produtos com saldo' })
  await expect(products).toContainText('MGM-35')
  await expect(products).toContainText('Sem movimentação no período')
  await expect(products).not.toContainText('AGM-35')
})

test('tabelas novas permitem rolagem por teclado sem alargar tela de celular', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await prepareKeyboardPage(page)
  const panel = page.getByRole('region', { name: 'Atividade por produto e prateleira' })
  await expect(panel.getByRole('table', { name: 'Mapa de calor por prateleira' })).toBeVisible()
  const scroll = panel.getByRole('region', { name: 'Rolagem das prateleiras' })
  await scroll.focus()
  await expect(scroll).toBeFocused()
  await page.keyboard.press('ArrowRight')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const bounds = await scroll.boundingBox()
  expect(bounds!.width).toBeLessThan(375)
})
