import {expect, test} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {openModule, prepareKeyboardPage} from './helpers/keyboard'

test('folha de contagem sai antes da conferência e omite saldos e quantidades digitadas', async ({page}) => {
  const writes = await prepareKeyboardPage(page)
  const notice = page.getByRole('button', {name:'Fechar aviso de estoque', exact:true})
  if (await notice.isVisible()) await notice.click()
  await openModule(page, 'Visão geral')
  await page.locator('#shelf-count > summary').click()
  await page.getByLabel('Prateleira para contar').selectOption('A01')
  await page.getByRole('button', {name:'Iniciar contagem local'}).click()
  const counted = page.getByLabel('Caixas contadas AGM-35 Aguardando testagem', {exact:true})
  await counted.fill('17')
  await expect(page.getByRole('button', {name:'Exportar contagem para revisão'})).toBeDisabled()
  const pendingDownload = page.waitForEvent('download')
  await page.getByRole('button', {name:'Baixar folha de contagem'}).click()
  const download = await pendingDownload
  const csv = await readFile(await download.path(), 'utf8')
  expect(csv).toContain('"Prateleira";"Produto";"Situação";"Caixas contadas";"Observação"')
  expect(csv).toContain('"A01";"AGM-35";"Aguardando testagem";"";""')
  expect(csv).toContain('"A01";"MGM-35";"Em estoque";"";""')
  expect(csv).not.toContain('Esperado')
  expect(csv).not.toContain(';17;')
  await expect(counted).toHaveValue('17')
  expect(writes).toEqual([])
})
