import { test, expect } from '@playwright/test'
import { prepareKeyboardPage, tabTo, openModule } from './helpers/keyboard'

for (const item of [
  { module: 'Visão geral', trigger: 'Ver testagem de AGM-35', dialog: 'Testagem · AGM-35', input: 'Quantidade aprovada (caixas)', submit: 'Confirmar aprovação' },
  { module: 'Garantia', trigger: 'Retirar caixas de Fabricante teste', dialog: 'Retirar caixas · Fabricante teste', input: 'Quantidade de caixas', submit: 'Confirmar retirada' },
]) {
  test(`teclado rejeita quantidade acima do saldo em ${item.dialog}`, async ({ page }) => {
    const writes = await prepareKeyboardPage(page)
    await openModule(page, item.module)
    await tabTo(page, page.getByRole('button', { name: item.trigger, exact: true }))
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: item.dialog, exact: true })
    const input = dialog.getByRole('spinbutton', { name: item.input, exact: true })
    await tabTo(page, input)
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type('4')
    await tabTo(page, dialog.getByRole('button', { name: item.submit, exact: true }))
    await page.keyboard.press('Enter')
    await expect(input).toBeFocused()
    expect(await input.evaluate((element: HTMLInputElement) => element.validity.rangeOverflow)).toBe(true)
    expect(writes).toEqual([])
  })
}

for (const module of ['Visão geral', 'Molas']) {
  test(`entrada vazia aponta o código pelo teclado em ${module}`, async ({ page }) => {
    const writes = await prepareKeyboardPage(page)
    if (module === 'Molas') {
      await page.getByLabel('Opções da conta').click()
      await page.locator('.account-options').getByRole('button', { name: 'Molas', exact: true }).click()
    } else await openModule(page, module)
    const form = page.locator('.receipt-form')
    await tabTo(page, form.getByRole('button', { name: 'Registrar entrada', exact: true }))
    await page.keyboard.press('Enter')
    const code = form.getByLabel('Código do produto', { exact: true })
    await expect(code).toBeFocused()
    expect(await code.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true)
    expect(writes).toEqual([])
  })
}

test('aplicação nova vazia aponta o veículo pelo teclado sem salvar', async ({ page }) => {
  const writes = await prepareKeyboardPage(page)
  await openModule(page, 'Aplicações')
  await tabTo(page, page.getByRole('button', { name: '+ Adicionar aplicação', exact: true }))
  await page.keyboard.press('Enter')
  await tabTo(page, page.getByRole('button', { name: 'Salvar cadastro', exact: true }))
  await page.keyboard.press('Enter')
  const vehicle = page.getByRole('textbox', { name: 'Veículo', exact: true })
  await expect(vehicle).toBeFocused()
  expect(await vehicle.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true)
  expect(writes).toEqual([])
})

test('consulta de código funciona por digitação e Enter', async ({ page }) => {
  const writes = await prepareKeyboardPage(page)
  await openModule(page, 'Visão geral')
  await tabTo(page, page.locator('#scan-code'))
  await page.keyboard.type('AGM-35')
  await page.keyboard.press('Enter')
  await expect(page.locator('.scan-result-code')).toContainText('AGM-35')
  await expect(page.locator('.scan-locations')).toContainText('A01')
  expect(writes).toEqual([])
})
