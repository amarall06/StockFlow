import { test, expect } from '@playwright/test'
import { prepareKeyboardPage, openModule } from './helpers/keyboard'

test('aviso funciona entre módulos, preserva rascunho e não se repete ao recarregar', async ({ page }) => {
  const writes = await prepareKeyboardPage(page)
  const notice = page.getByRole('complementary', { name: 'Aviso de estoque' })
  await expect(notice).toContainText('AGM-35')
  await openModule(page, 'Visão geral')
  const code = page.locator('.receipt-form').getByLabel('Código do produto', { exact: true })
  await code.fill('AGM-35')
  await expect(code).toBeFocused()
  await expect(notice).toBeVisible()
  await notice.getByRole('button', { name: 'Fechar aviso de estoque' }).click()
  await expect(code).toHaveValue('AGM-35')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible()
  await expect(notice).toHaveCount(0)
  expect(writes).toEqual([])
})

test('aviso inclui molas sem saldo e abre a página Alertas pelo teclado', async ({ page }) => {
  await prepareKeyboardPage(page, { stock_balances: [] })
  const notice = page.getByRole('complementary', { name: 'Aviso de estoque' })
  await expect(notice).toContainText('MGM-35')
  await expect(notice).toContainText('2 produtos')
  const open = notice.getByRole('button', { name: 'Ver alertas' })
  await open.focus()
  await page.keyboard.press('Enter')
  await expect(notice).toHaveCount(0)
  await expect(page.locator('.breadcrumb')).toContainText('Alertas')
})

test('armazenamento indisponível não impede fechar aviso ou usar o sistema', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('liber:stock-notices:')) throw new Error('Indisponível no teste')
      original.call(this, key, value)
    }
  })
  await prepareKeyboardPage(page)
  const notice = page.getByRole('complementary', { name: 'Aviso de estoque' })
  await expect(notice).toBeVisible()
  await notice.getByRole('button', { name: 'Fechar aviso de estoque' }).click()
  await expect(notice).toHaveCount(0)
  await openModule(page, 'Visão geral')
  await expect(page.locator('.breadcrumb')).toContainText('Visão geral')
})
