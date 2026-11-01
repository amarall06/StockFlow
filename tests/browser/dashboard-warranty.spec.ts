import { test, expect } from '@playwright/test'
import { prepareKeyboardPage } from './helpers/keyboard'

test('Painel exibe garantia separada do estoque normal e filtra as duas categorias', async ({ page }) => {
  const writes = await prepareKeyboardPage(page, { warranty_box_balances: [
    { manufacturer_id: 'm1', product_kind: 'shock', quantity: 8 },
    { manufacturer_id: 'm1', product_kind: 'spring', quantity: 4 },
  ] })
  const warranty = page.getByRole('region', { name: 'Saldo de garantia' })
  await expect(warranty).toContainText('12 caixas')
  await expect(page.locator('.dashboard-stock-totals .dashboard-stat-total')).toContainText('5 caixas')
  await page.getByText('Filtros do painel', { exact: true }).click()
  await page.getByLabel('Filtrar indicadores').selectOption('springs')
  await expect(warranty).toContainText('4 caixas')
  await page.getByLabel('Filtrar indicadores').selectOption('shocks')
  await expect(warranty).toContainText('8 caixas')
  expect(writes).toEqual([])
})

test('falha ao consultar garantia não exibe um zero fictício', async ({ page }) => {
  await prepareKeyboardPage(page)
  await page.route('https://stockflow-test.supabase.co/rest/v1/warranty_box_balances*', route => route.fulfill({ status: 400, json: { message: 'Falha simulada' } }))
  await page.reload()
  const warranty = page.getByRole('region', { name: 'Saldo de garantia' })
  await expect(warranty).toContainText('Não foi possível atualizar')
  await expect(warranty).not.toContainText('0 caixas')
  await expect(warranty.getByRole('button', { name: 'Consultar Garantia' })).toBeEnabled()
})

test('avisos e disponibilidade novos cabem em tela estreita', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await prepareKeyboardPage(page)
  const notice = page.getByRole('complementary', { name: 'Aviso de estoque' })
  await expect(notice).toBeVisible()
  const bounds = await notice.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375)
  await notice.getByRole('button', { name: 'Fechar aviso de estoque' }).click()
  await expect(page.getByRole('region', { name: 'Disponibilidade por situação' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
