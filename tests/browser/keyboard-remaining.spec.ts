import { test, expect } from '@playwright/test'
import { prepareKeyboardPage, tabTo, openModule, checkModalKeyboard } from './helpers/keyboard'

const dialogs = [
  { module: 'Visão geral', trigger: 'Configurar mínimos', title: 'Configurar estoque mínimo' },
  { module: 'Visão geral', trigger: 'Ver testagem de AGM-35', title: 'Testagem · AGM-35' },
  { module: 'Garantia', trigger: 'Adicionar caixas em Fabricante teste', title: 'Adicionar caixas · Fabricante teste' },
  { module: 'Garantia', trigger: 'Retirar caixas de Fabricante teste', title: 'Retirar caixas · Fabricante teste' },
  { module: 'Garantia', trigger: 'Novo registro', title: 'Receber devolução' },
  { module: 'Aplicações', trigger: 'Ver histórico completo de AGM-35', title: 'Histórico completo · AGM-35' },
]

for (const item of dialogs) {
  test(`teclado no diálogo ${item.title}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const writes = await prepareKeyboardPage(page)
    await openModule(page, item.module)
    await checkModalKeyboard(page, page.getByRole('button', { name: item.trigger, exact: true }), page.getByRole('dialog', { name: item.title, exact: true }))
    expect(writes).toEqual([])
  })
}

test('formulário de mínimo rejeita fração pelo teclado sem salvar', async ({ page }) => {
  const writes = await prepareKeyboardPage(page)
  await openModule(page, 'Visão geral')
  const trigger = page.getByRole('button', { name: 'Configurar mínimos', exact: true })
  await tabTo(page, trigger)
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Configurar estoque mínimo' })
  const input = dialog.getByRole('spinbutton')
  await tabTo(page, input)
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('1.5')
  await tabTo(page, dialog.getByRole('button', { name: 'Salvar limite', exact: true }))
  await page.keyboard.press('Enter')
  await expect(input).toBeFocused()
  expect(await input.evaluate((element: HTMLInputElement) => element.validity.stepMismatch)).toBe(true)
  expect(writes).toEqual([])
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('devolução vazia aponta o campo obrigatório pelo teclado sem salvar', async ({ page }) => {
  const writes = await prepareKeyboardPage(page)
  await openModule(page, 'Garantia')
  await tabTo(page, page.getByRole('button', { name: 'Novo registro', exact: true }))
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Receber devolução', exact: true })
  await tabTo(page, dialog.getByRole('button', { name: 'Salvar devolução', exact: true }))
  await page.keyboard.press('Enter')
  const description = dialog.getByLabel('Descrição do que chegou')
  await expect(description).toBeFocused()
  expect(await description.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true)
  expect(writes).toEqual([])
})

test('menu móvel abre e navega até Produtos somente com teclado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const writes = await prepareKeyboardPage(page)
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  await tabTo(page, menu)
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Menu de navegação' })
  await expect(dialog).toBeVisible()
  await tabTo(page, dialog.getByRole('button', { name: 'Produtos', exact: true }))
  await page.keyboard.press('Enter')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Produtos', exact: true })).toBeVisible()
  await expect(menu).toBeFocused()
  expect(writes).toEqual([])
})
