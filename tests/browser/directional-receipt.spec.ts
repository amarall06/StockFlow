import {expect, test} from '@playwright/test'
import {openModule, prepareKeyboardPage} from './helpers/keyboard'

test('entrada aceita código AMD completo e mantém o prefixo no envio', async ({page}) => {
  const writes = await prepareKeyboardPage(page)
  const notice = page.getByRole('button', {name:'Fechar aviso de estoque',exact:true})
  if (await notice.isVisible()) await notice.click()
  const requests: Record<string, unknown>[] = []
  await page.route('**/rest/v1/rpc/receive_stock_with_supplier', route => {
    requests.push(route.request().postDataJSON())
    return route.fulfill({json:{id:'entrada-de-teste'}})
  })
  await openModule(page, 'Visão geral')
  const form = page.locator('.receipt-form')
  const code = form.getByRole('textbox', {name:'Código do produto',exact:true})
  await code.pressSequentially('amd-agm-35')
  await expect(code).toHaveValue('amd-agm-35')
  await form.getByRole('textbox', {name:'Aplicação (para código novo)',exact:true}).fill('Amortecedor dianteiro de teste')
  await form.getByRole('combobox', {name:'Localização',exact:true}).selectOption('A01')
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('AMD-AGM-35')
    await dialog.accept()
  })
  await form.getByRole('button', {name:'Registrar entrada',exact:true}).click()
  await expect(page.locator('.receipt-feedback').getByRole('status')).toContainText('Entrada salva')
  expect(requests).toHaveLength(1)
  expect(requests[0].p_code).toBe('AMD-AGM-35')
  expect(writes).toEqual([])
})
