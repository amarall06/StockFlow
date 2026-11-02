import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { prepareKeyboardPage } from './helpers/keyboard'
const panel = page => page.getByRole('region', { name: 'Modo missão', exact: true })
async function prepare(page) {
  const writes = await prepareKeyboardPage(page)
  const close = page.getByRole('button', { name: 'Fechar aviso de estoque', exact: true })
  if (await close.isVisible()) await close.click()
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await panel(page).getByRole('button', { name: 'Iniciar missão', exact: true }).click()
  return writes
}
async function download(page, format) {
  const pending = page.waitForEvent('download')
  await panel(page).getByRole('button', { name: `Baixar lista de retirada ${format}` }).click()
  const file = await pending
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) }
}
test('PDF de retirada contém pedido, roteiro, leitura e limites sem alterar a missão', async ({ page }) => {
  const writes = await prepare(page)
  const before = await page.evaluate(() => localStorage.getItem('liber:pick-missions:v1:presentation:11111111-1111-4111-8111-111111111111'))
  const file = await download(page, 'PDF'), pdf = file.bytes.toString('latin1')
  expect(file.name).toBe('liber-retirada-PED-1001.pdf')
  expect(pdf.startsWith('%PDF-')).toBe(true)
  for (const text of ['PED-1001', 'Oficina Horizonte', 'NORTE', 'SUL', 'LIBER|NORTE|AGM-35|LIBERADO', 'Solicitado: 8 caixas | Separado: 0 | Pendente: 8']) expect(pdf).toContain(text)
  expect(await page.evaluate(() => localStorage.getItem('liber:pick-missions:v1:presentation:11111111-1111-4111-8111-111111111111'))).toBe(before)
  expect(writes).toEqual([])
})
test('CSV exporta progresso parcial recuperado e seleciona somente o pedido atual', async ({ page }) => {
  const writes = await prepare(page), form = panel(page).getByRole('form', { name: 'Conferência do item da missão' })
  await form.getByLabel('Leitura do item', { exact: true }).fill((await form.locator('code').innerText()).trim())
  await form.getByLabel('Total de caixas separadas neste item').fill('3')
  await form.getByRole('button', { name: 'Confirmar separação do item' }).click()
  await page.reload(); await page.getByLabel('Visualização do Painel').selectOption('presentation')
  const file = await download(page, 'CSV'), csv = file.bytes.toString('utf8')
  expect(file.name).toMatch(/^liber-retirada-PED-1001-.*\.csv$/)
  expect(csv.charCodeAt(0)).toBe(0xfeff)
  expect(csv).toContain('"LIBER|NORTE|AGM-35|LIBERADO";8;3;5;')
  expect(csv).toContain('"LIBER|SUL|MGM-35|EM_ESTOQUE";4;0;4;')
  expect(csv).toContain('Não registra venda, expedição ou baixa de estoque')
  await panel(page).getByLabel('Pedido para separar').selectOption('PED-1002')
  await expect(panel(page).getByRole('button', { name: 'Baixar lista de retirada CSV' })).toHaveCount(0)
  await panel(page).getByRole('button', { name: 'Iniciar missão', exact: true }).click()
  const second = await download(page, 'CSV')
  expect(second.bytes.toString('utf8')).toContain('PED-1002'); expect(second.bytes.toString('utf8')).not.toContain('PED-1001')
  expect(writes).toEqual([])
})
test('lista cancelada é explicitamente invalidada nos dois formatos', async ({ page }) => {
  await prepare(page)
  await panel(page).locator('summary').filter({ hasText: 'Cancelar missão local' }).click()
  await panel(page).getByLabel('Motivo do cancelamento').fill('Cliente desistiu do pedido')
  await panel(page).getByRole('button', { name: 'Confirmar cancelamento local' }).click()
  const csv = await download(page, 'CSV'), pdf = await download(page, 'PDF')
  expect(csv.bytes.toString('utf8')).toContain('CANCELADA - não utilizar para retirada')
  expect(pdf.bytes.toString('latin1')).toContain('CANCELADA - n')
  await expect(panel(page)).toContainText('Missão cancelada')
})
test('Consulta pode baixar cópia mas dados inválidos não oferecem exportação', async ({ page }) => {
  const writes = await prepare(page)
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ json: { is_active: true, display_name: 'Consulta', role: 'viewer' } }))
  await page.reload(); await page.getByLabel('Visualização do Painel').selectOption('presentation')
  expect((await download(page, 'CSV')).bytes.toString('utf8')).toContain('PED-1001')
  await expect(panel(page).getByRole('button', { name: 'Confirmar separação do item' })).toHaveCount(0)
  await page.evaluate(() => { localStorage.setItem('liber:pick-missions:v1:presentation:11111111-1111-4111-8111-111111111111', 'inválido'); window.dispatchEvent(new Event('liber:pick-missions')) })
  await expect(panel(page).getByRole('alert')).toContainText('dados foram preservados')
  await expect(panel(page).getByRole('button', { name: 'Baixar lista de retirada CSV' })).toHaveCount(0)
  expect(writes).toEqual([])
})
