import { test, expect, type Page } from '@playwright/test'
import { prepareKeyboardPage, openModule } from './helpers/keyboard'

const manufacturers = [
  { id: 'm1', name: 'Fabricante teste', updated_at: '2026-10-27T00:00:00Z' },
  { id: 'm2', name: 'Outra marca', updated_at: '2026-10-27T00:00:00Z' },
]
function balances(factor: number) {
  return [{ manufacturer_id: 'm1', product_kind: 'shock', quantity: factor + 1 }, { manufacturer_id: 'm1', product_kind: 'spring', quantity: factor + 2 }]
}
function returns(factor: number) {
  return [
    { id: 'r1', manufacturer_id: 'm1', product_kind: 'spring', product_code: 'MGM-35', description: 'Devolução fictícia de mola', boxes: factor, reason: 'Motivo fictício', location: `DEV-${factor}`, ownership: 'ours', status: 'received', destination: '', created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' },
    { id: 'r2', manufacturer_id: 'm2', product_kind: 'shock', product_code: 'AGM-35', description: 'Devolução fictícia de amortecedor', boxes: 1, reason: 'Motivo fictício', location: 'DEV', ownership: 'ours', status: 'warranty', destination: '', created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' },
  ]
}
const names = ['warranty_manufacturers', 'warranty_box_balances', 'warranty_returns']
async function prepare(page: Page) {
  await page.clock.install()
  const writes = await prepareKeyboardPage(page, { warranty_manufacturers: manufacturers, warranty_box_balances: balances(2), warranty_returns: returns(2) })
  await openModule(page, 'Garantia')
  await expect(page.locator('.manufacturer-cards > li')).toHaveCount(2)
  await expect(page.locator('.return-cards > li')).toHaveCount(2)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const state = { factor: 2, failed: new Set<string>(), requests: [] as string[], hold: false, held: 0, release }
  for (const name of names) {
    await page.route(`https://stockflow-test.supabase.co/rest/v1/${name}*`, async route => {
      state.requests.push(name)
      const factor = state.factor
      if (state.hold) { state.held++; await gate }
      if (state.failed.has(name)) return route.fulfill({ status: 400, json: { message: 'Falha simulada de consulta', code: 'XX000' } })
      return route.fulfill({ json: name === 'warranty_manufacturers' ? manufacturers : name === 'warranty_box_balances' ? balances(factor) : returns(factor) })
    })
  }
  return { state, writes }
}
async function tick(page: Page, ms = 30_000) {
  await page.clock.fastForward(ms)
  await page.clock.runFor(200)
}
const manufacturer = (page: Page) => page.locator('.manufacturer-cards > li').filter({ hasText: 'Fabricante teste' })
const returnCard = (page: Page) => page.locator('.return-cards > li').filter({ hasText: 'MGM-35' })
const total = (page: Page) => manufacturer(page).locator('.warranty-box-summary strong')
const returnBoxes = (page: Page) => returnCard(page).locator('dd').first()

test('Garantia atualiza saldos, devoluções e CSV mantendo buscas e andamento', async ({ page }) => {
  const { state, writes } = await prepare(page)
  await page.getByLabel('Buscar fabricante', { exact: true }).fill('Fabricante teste')
  await page.getByLabel('Buscar devolução', { exact: true }).fill('MGM-35')
  await page.getByRole('combobox', { name: /^Andamento/ }).selectOption('received')
  state.factor = 7
  await tick(page)
  await expect(total(page)).toHaveText('17 caixas')
  await expect(manufacturer(page)).toContainText('Amortecedores: 8')
  await expect(manufacturer(page)).toContainText('Molas: 9')
  await expect(returnBoxes(page)).toHaveText('7')
  await expect(returnCard(page)).toContainText('DEV-7')
  await expect(page.getByLabel('Buscar fabricante', { exact: true })).toHaveValue('Fabricante teste')
  await expect(page.getByLabel('Buscar devolução', { exact: true })).toHaveValue('MGM-35')
  await expect(page.getByRole('combobox', { name: /^Andamento/ })).toHaveValue('received')
  await expect(page.locator('.manufacturer-cards > li')).toHaveCount(1)
  await expect(page.locator('.return-cards > li')).toHaveCount(1)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  if (!stream) throw new Error('CSV indisponível no teste.')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv).toContain('"Fabricante teste";8;9;17')
  expect(csv).not.toContain('Outra marca')
  expect(writes).toEqual([])
})

test('falhas automáticas da Garantia mantêm dados e recuperam no intervalo seguinte', async ({ page }) => {
  const { state } = await prepare(page)
  state.failed = new Set(names)
  await tick(page)
  const manufacturerWarning = page.getByRole('status').filter({ hasText: 'Não foi possível atualizar os saldos da garantia automaticamente.' })
  const returnsWarning = page.getByRole('status').filter({ hasText: 'Não foi possível atualizar as devoluções automaticamente.' })
  await expect(manufacturerWarning).toBeVisible()
  await expect(returnsWarning).toBeVisible()
  await expect(total(page)).toHaveText('7 caixas')
  await expect(returnBoxes(page)).toHaveText('2')
  state.failed.clear()
  state.factor = 6
  await tick(page)
  await expect(total(page)).toHaveText('15 caixas')
  await expect(returnBoxes(page)).toHaveText('6')
  await expect(manufacturerWarning).toHaveCount(0)
  await expect(returnsWarning).toHaveCount(0)
})

test('falha nos saldos da Garantia não impede atualizar as devoluções', async ({ page }) => {
  const { state } = await prepare(page)
  state.failed.add('warranty_box_balances')
  state.factor = 5
  await tick(page)
  await expect(total(page)).toHaveText('7 caixas')
  await expect(returnBoxes(page)).toHaveText('5')
  await expect(page.getByRole('status').filter({ hasText: 'Não foi possível atualizar os saldos da garantia automaticamente.' })).toBeVisible()
})

test('edição e cadastro de fabricante pausam as duas consultas sem apagar rascunhos', async ({ page }) => {
  const { state, writes } = await prepare(page)
  await page.getByRole('button', { name: 'Editar fabricante Fabricante teste', exact: true }).click()
  await page.getByLabel('Editar fabricante', { exact: true }).fill('Rascunho de edição')
  await tick(page, 60_000)
  expect(state.requests).toHaveLength(0)
  await expect(page.getByLabel('Editar fabricante', { exact: true })).toHaveValue('Rascunho de edição')
  await page.getByRole('button', { name: 'Cancelar edição', exact: true }).click()
  await page.getByLabel('Cadastrar fabricante', { exact: true }).fill('Rascunho novo')
  await tick(page, 60_000)
  expect(state.requests).toHaveLength(0)
  await expect(page.getByLabel('Cadastrar fabricante', { exact: true })).toHaveValue('Rascunho novo')
  await page.getByLabel('Cadastrar fabricante', { exact: true }).fill('')
  state.factor = 5
  await tick(page)
  await expect(total(page)).toHaveText('13 caixas')
  await expect(returnBoxes(page)).toHaveText('5')
  expect(writes).toEqual([])
})

test('diálogos de caixas e devolução pausam a Garantia e preservam seus campos', async ({ page }) => {
  const { state, writes } = await prepare(page)
  await page.getByRole('button', { name: 'Retirar caixas de Fabricante teste', exact: true }).click()
  const note = page.getByRole('dialog').getByRole('textbox', { name: /^Observação/ })
  await note.fill('Observação em rascunho')
  await tick(page, 60_000)
  expect(state.requests).toHaveLength(0)
  await expect(note).toHaveValue('Observação em rascunho')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Receber devolução', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Descrição do que chegou').fill('Descrição em rascunho')
  await tick(page, 60_000)
  expect(state.requests).toHaveLength(0)
  await expect(page.getByRole('dialog').getByLabel('Descrição do que chegou')).toHaveValue('Descrição em rascunho')
  await page.keyboard.press('Escape')
  state.factor = 5
  await tick(page)
  await expect(total(page)).toHaveText('13 caixas')
  expect(writes).toEqual([])
})

test('respostas antigas da Garantia não substituem a atualização manual mais recente', async ({ page }) => {
  const { state } = await prepare(page)
  state.hold = true
  state.factor = 99
  await tick(page)
  await expect.poll(() => state.held).toBe(3)
  state.hold = false
  state.factor = 8
  await page.getByRole('button', { name: 'Atualizar lista', exact: true }).click()
  await expect(total(page)).toHaveText('19 caixas')
  await expect(returnBoxes(page)).toHaveText('8')
  const responses = names.map(name => page.waitForResponse(response => response.url().includes(`/rest/v1/${name}`)))
  state.release()
  for (const response of await Promise.all(responses)) await response.finished()
  await page.clock.runFor(200)
  await expect(total(page)).toHaveText('19 caixas')
  await expect(returnBoxes(page)).toHaveText('8')
})
