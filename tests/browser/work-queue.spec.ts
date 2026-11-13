import { expect, test } from '@playwright/test'
import { prepareKeyboardPage } from './helpers/keyboard'

test('fila abre testagem filtrada e alertas de reposição', async ({ page }) => {
  await page.routeWebSocket('wss://stockflow-test.supabase.co/**', socket => socket.close())
  await prepareKeyboardPage(page, { stock_balances: [
    { product_id: 'p1', location_id: 'l1', status_code: 'awaiting_test', quantity: 2 },
    { product_id: 'p1', location_id: 'l1', status_code: 'released_for_sale', quantity: 1 },
  ] })
  const queue = page.getByRole('region', { name: 'Fila de trabalho' })
  await queue.getByRole('button', { name: '2 cx. aguardando testagem' }).click()
  const table = page.getByRole('region', { name: 'Rolagem da tabela de estoque' })
  await expect(table.locator('tbody tr')).toHaveCount(1)
  await expect(table).toContainText('Aguardando testagem')
  await page.getByRole('button', { name: 'Remover filtro: aguardando testagem' }).click()
  await expect(table.locator('tbody tr')).toHaveCount(2)
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Painel inicial' }).click()
  await queue.getByRole('button', { name: /produtos para reposição/ }).click()
  await expect(page.getByRole('heading', { name: 'Alertas', exact: true })).toBeVisible()
  await page.evaluate(() => {
    const userId = '11111111-1111-4111-8111-111111111111'
    sessionStorage.setItem('liber.outflow.pending.v1:' + userId, JSON.stringify({
      userId, version: 1, requestId: '22222222-2222-4222-8222-222222222222', phase: 'uncertain',
      input: { row: { code: 'AGM-35', location: 'A01', status: 'Liberado para venda', boxes: 1 }, boxes: 1, reason: 'sale', notes: '', reference: '' },
    }))
  })
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Painel inicial' }).click()
  await queue.getByRole('button', { name: '1 saída para conferir neste aparelho' }).click()
  await expect(page.getByText('Pedido aguardando confirmação', { exact: true })).toBeVisible()
})
