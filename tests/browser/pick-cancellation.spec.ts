import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { prepareKeyboardPage } from './helpers/keyboard'
const panel = page => page.getByRole('region', { name: 'Modo missão', exact: true })
const key = 'liber:pick-missions:v1:presentation:11111111-1111-4111-8111-111111111111'
async function prepare(page) {
  const writes = await prepareKeyboardPage(page)
  const close = page.getByRole('button', { name: 'Fechar aviso de estoque', exact: true })
  if (await close.isVisible()) await close.click()
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await panel(page).getByRole('button', { name: 'Iniciar missão', exact: true }).click()
  return writes
}
async function openCancel(page) { await panel(page).locator('summary').filter({ hasText: 'Cancelar missão local' }).click(); return panel(page).getByRole('form', { name: 'Cancelamento da missão' }) }
test('cancelamento exige motivo e conserva registro após reabrir sem escrever no servidor', async ({ page }) => {
  const writes = await prepare(page), form = await openCancel(page)
  await form.getByRole('button', { name: 'Confirmar cancelamento local' }).click()
  await expect(panel(page)).toContainText('Missão em andamento')
  await form.getByLabel('Motivo do cancelamento').fill('Cliente desistiu do pedido')
  await form.getByRole('button', { name: 'Confirmar cancelamento local' }).click()
  await page.reload(); await page.getByLabel('Visualização do Painel').selectOption('presentation')
  const record = panel(page).getByRole('region', { name: 'Registro do cancelamento' })
  await expect(record).toContainText('Cliente desistiu do pedido')
  await expect(record).toContainText('Sem caixas registradas como separadas')
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key)
  expect(saved.missions['PED-1001'].cancellation.disposition).toBe('not-picked')
  expect(writes).toEqual([])
})
test('caixas já separadas exigem declaração de retorno e mantêm a quantidade no registro cancelado', async ({ page }) => {
  await prepare(page)
  const item = panel(page).getByRole('form', { name: 'Conferência do item da missão' })
  await item.getByLabel('Leitura do item', { exact: true }).fill((await item.locator('code').innerText()).trim())
  await item.getByLabel('Total de caixas separadas neste item').fill('3')
  await item.getByRole('button', { name: 'Confirmar separação do item' }).click()
  const form = await openCancel(page)
  await form.getByLabel('Motivo do cancelamento').fill('Pedido alterado pelo cliente')
  await form.getByRole('button', { name: 'Confirmar cancelamento local' }).click()
  await expect(panel(page)).toContainText('Missão em andamento')
  await form.getByRole('checkbox').check()
  await form.getByRole('button', { name: 'Confirmar cancelamento local' }).click()
  await expect(panel(page)).toContainText('Missão cancelada · 3 de 12')
  await expect(panel(page).getByRole('region', { name: 'Registro do cancelamento' })).toContainText('Retorno às prateleiras de origem declarado')
})
test('falha ao salvar cancelamento conserva motivo digitado e missão ativa', async ({ page }) => {
  await prepare(page); const form = await openCancel(page)
  await form.getByLabel('Motivo do cancelamento').fill('Cliente desistiu do pedido')
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if(k.startsWith('liber:pick-missions:')) throw Error('Sem espaço para cancelar'); return original.call(this,k,v) } })
  await form.getByRole('button', { name: 'Confirmar cancelamento local' }).click()
  await expect(panel(page).getByRole('alert')).toContainText('Sem espaço para cancelar')
  await expect(form.getByLabel('Motivo do cancelamento')).toHaveValue('Cliente desistiu do pedido')
  await expect(panel(page)).toContainText('Missão em andamento')
})
test('novo formulário em 375 px permite teclado e passa auditoria A/AA', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await prepare(page)
  const summary = panel(page).locator('summary'); await summary.focus(); await summary.press('Enter')
  await page.keyboard.press('Tab'); await expect(panel(page).getByLabel('Motivo do cancelamento')).toBeFocused()
  const result = await new AxeBuilder({ page }).include('.pick-cancel').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(result.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
