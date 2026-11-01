import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { unzipSync, strFromU8 } from 'fflate'
import { prepareKeyboardPage, openModule } from './helpers/keyboard'

test('Excel contém estoque e movimentos em abas reais, com textos sem fórmulas', async ({ page }) => {
  const writes = await prepareKeyboardPage(page)
  const ranges: URL[] = []
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_movements*', route => {
    const url = new URL(route.request().url())
    // O indicador de atividade usa o mesmo recurso; esta interceptação é só da exportação.
    if (url.searchParams.getAll('created_at').some(value => value.startsWith('lte.'))) return route.fallback()
    ranges.push(url)
    return route.fulfill({ json: Number(url.searchParams.get('offset')) > 0 ? [] : [{ created_at: '2026-10-31T12:00:00Z', movement_type: 'transfer', quantity: 2, product: { code: 'AGM-35' }, origin: { code: '=2+2' }, destination: { code: 'A02' } }] })
  })
  const panel = page.getByRole('region', { name: 'Relatório PDF e Excel' })
  await panel.getByLabel('Data de referência').fill('2026-10-31')
  await panel.getByLabel('Período do relatório').selectOption('month')
  const download = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Baixar Excel', exact: true }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.xlsx$/)
  const archive = unzipSync(await readFile((await file.path())!))
  expect(strFromU8(archive['xl/workbook.xml'])).toContain('Estoque atual')
  expect(strFromU8(archive['xl/workbook.xml'])).toContain('Movimentações')
  const contents = Object.values(archive).map(bytes => strFromU8(bytes)).join('\n')
  expect(contents).toContain('AGM-35')
  expect(contents).toContain('MGM-35')
  expect(contents).toContain('=2+2')
  expect(contents).not.toMatch(/<f[ >]/)
  expect(contents).toContain('não representa saldo de fechamento histórico')
  expect(ranges[0].searchParams.get('unit_type')).toBe('eq.box')
  expect(ranges[0].searchParams.get('created_at')).toBe('gte.2026-10-01T03:00:00.000Z')
  expect(ranges[0].searchParams.getAll('created_at')).toContain('lt.2026-11-01T03:00:00.000Z')
  expect(writes).toEqual([])
})

test('PDF é baixado com cabeçalho, período e dados das duas categorias', async ({ page }) => {
  await prepareKeyboardPage(page)
  const panel = page.getByRole('region', { name: 'Relatório PDF e Excel' })
  await panel.getByLabel('Data de referência').fill('2026-10-31')
  await panel.getByLabel('Período do relatório').selectOption('year')
  const download = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Baixar PDF', exact: true }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.pdf$/)
  const bytes = await readFile((await file.path())!)
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  const contents = bytes.toString('latin1')
  expect(contents).toContain('AGM-35')
  expect(contents).toContain('MGM-35')
  expect(contents).toContain('2026-01-01 a 2026-12-31')
  expect(contents).toContain('saldo de fechamento')
  expect(contents).toContain('Nenhum registro nesta consulta.')
})

test('falha em movimentos impede download parcial e permite tentar novamente', async ({ page }) => {
  await prepareKeyboardPage(page)
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_movements*', route => route.fulfill({ status: 400, json: { message: 'Falha simulada' } }))
  let downloads = 0
  page.on('download', () => { downloads++ })
  const panel = page.getByRole('region', { name: 'Relatório PDF e Excel' })
  await panel.getByRole('button', { name: 'Baixar Excel', exact: true }).click()
  await expect(panel).toContainText('Nenhum relatório foi gerado')
  await expect(panel.getByRole('button', { name: 'Baixar Excel', exact: true })).toBeEnabled()
  expect(downloads).toBe(0)
})

test('sair do Painel durante a consulta cancela a entrega do relatório', async ({ page }) => {
  await prepareKeyboardPage(page)
  let release!: () => void
  const waiting = new Promise<void>(resolve => { release = resolve })
  let entered = false
  let finished = false
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_movements*', async route => {
    if (new URL(route.request().url()).searchParams.getAll('created_at').some(value => value.startsWith('lte.'))) return route.fallback()
    entered = true
    await waiting
    await route.fulfill({ json: [] })
    finished = true
  })
  let downloads = 0
  page.on('download', () => { downloads++ })
  await page.getByRole('button', { name: 'Baixar Excel', exact: true }).click()
  await expect.poll(() => entered).toBe(true)
  await openModule(page, 'Visão geral')
  release()
  await expect.poll(() => finished).toBe(true)
  await expect(page.locator('.receipt-form')).toBeVisible()
  expect(downloads).toBe(0)
})
