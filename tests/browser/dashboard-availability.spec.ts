import { test, expect } from '@playwright/test'
import { prepareKeyboardPage } from './helpers/keyboard'

test('Painel distingue caixas vendáveis de amortecedores aguardando teste e respeita a categoria', async ({ page }) => {
  await prepareKeyboardPage(page, { stock_balances: [
    { product_id: 'p1', location_id: 'l1', status_code: 'awaiting_test', quantity: 3 },
    { product_id: 'p1', location_id: 'l1', status_code: 'released_for_sale', quantity: 4 },
    { product_id: 'p2', location_id: 'l1', status_code: 'in_stock', quantity: 5 },
  ] })
  const availability = page.getByRole('region', { name: 'Disponibilidade por situação' })
  await expect(availability.getByRole('button', { name: /^Disponível para venda/ })).toContainText('9 caixas')
  await expect(availability.getByRole('button', { name: /^Aguardando testagem/ })).toContainText('3 caixas')
  await page.getByText('Filtros do painel', { exact: true }).click()
  await page.getByLabel('Filtrar indicadores').selectOption('springs')
  await expect(availability.getByRole('button', { name: /^Disponível para venda/ })).toContainText('5 caixas')
  await expect(availability.getByRole('button', { name: /^Aguardando testagem/ })).toContainText('0 caixas')
})
