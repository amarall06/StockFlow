import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { prepareKeyboardPage } from './helpers/keyboard'
const panel = page => page.getByRole('region', { name: 'Pendências de testagem', exact: true })
const key = 'liber:testing-delay:v1:presentation:11111111-1111-4111-8111-111111111111'
async function prepare(page) {
  const writes = await prepareKeyboardPage(page)
  const close = page.getByRole('button', { name: 'Fechar aviso de estoque', exact: true })
  if (await close.isVisible()) await close.click()
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  return writes
}
test('detector mostra atraso e data desconhecida; edição recalcula e recupera prazo sem gravar estoque', async ({ page }) => {
  const writes = await prepare(page)
  await expect(panel(page)).toContainText('10 caixas com prazo ultrapassado · 8 dentro do prazo · 2 sem data')
  await expect(panel(page).getByRole('list', { name: 'Grupos aguardando testagem' })).toContainText('Data de início não informada')
  await panel(page).getByLabel('Prazo de testagem (dias corridos)').fill('14')
  await panel(page).getByRole('button', { name: 'Salvar prazo local' }).click()
  await expect(panel(page)).toContainText('3 caixas com prazo ultrapassado · 15 dentro do prazo · 2 sem data')
  await page.reload(); await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await expect(panel(page).getByLabel('Prazo de testagem (dias corridos)')).toHaveValue('14')
  await panel(page).getByLabel('Prazo de testagem (dias corridos)').fill('30')
  await panel(page).getByRole('button', { name: 'Salvar prazo local' }).click()
  await expect(panel(page)).toContainText('Nenhuma caixa com data conhecida ultrapassou')
  await expect(panel(page)).toContainText('2 sem data')
  expect(writes).toEqual([])
})
test('falha ao salvar prazo mantém avaliação anterior e valor digitado', async ({ page }) => {
  await prepare(page)
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if (k.startsWith('liber:testing-delay:')) throw Error('Sem espaço para prazo'); return original.call(this,k,v) } })
  await panel(page).getByLabel('Prazo de testagem (dias corridos)').fill('14')
  await panel(page).getByRole('button', { name: 'Salvar prazo local' }).click()
  await expect(panel(page).getByRole('alert')).toContainText('Sem espaço para prazo')
  await expect(panel(page)).toContainText('10 caixas com prazo ultrapassado')
  await expect(panel(page).getByLabel('Prazo de testagem (dias corridos)')).toHaveValue('14')
})
test('configuração inválida é preservada e não apresenta avaliação como válida', async ({ page }) => {
  await prepare(page)
  await page.evaluate(k => { localStorage.setItem(k,'inválido'); window.dispatchEvent(new Event('liber:testing-delay')) }, key)
  await expect(panel(page).getByRole('alert')).toContainText('avaliação está bloqueada')
  await expect(panel(page).getByRole('list')).toHaveCount(0)
  await expect(panel(page).getByRole('button', { name: 'Salvar prazo local' })).toHaveCount(0)
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe('inválido')
})
test('Consulta visualiza pendências sem editar prazo', async ({ page }) => {
  const writes = await prepare(page)
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ json: { is_active: true, display_name: 'Consulta', role: 'viewer' } }))
  await page.reload(); await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await expect(panel(page)).toContainText('10 caixas com prazo ultrapassado')
  await expect(panel(page).getByRole('button', { name: 'Salvar prazo local' })).toHaveCount(0)
  expect(writes).toEqual([])
})
for (const theme of ['light','dark']) test(`novo detector em 375 px com teclado e auditoria A/AA ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width:375,height:812 }); await page.addInitScript(value => localStorage.setItem('liber-automotive-theme', value), theme)
  await prepare(page)
  const field = panel(page).getByLabel('Prazo de testagem (dias corridos)')
  await field.focus(); await page.keyboard.press('Tab')
  await expect(panel(page).getByRole('button', { name:'Salvar prazo local' })).toBeFocused()
  const result = await new AxeBuilder({ page }).include('.testing-delay').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(result.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
