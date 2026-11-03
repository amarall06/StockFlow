import { test, expect, type Page, type Locator } from '@playwright/test'
import { prepareKeyboardPage, openModule } from './helpers/keyboard'

type Scenario = { name: string; rpc: string; text: string[]; overrides?: Record<string, unknown>; setup: (page: Page) => Promise<Locator>; confirm?: boolean }
const balances = [
  { product_id: 'p1', location_id: 'l1', status_code: 'awaiting_test', quantity: 3 },
  { product_id: 'p1', location_id: 'l1', status_code: 'released_for_sale', quantity: 3 },
  { product_id: 'p2', location_id: 'l1', status_code: 'in_stock', quantity: 2 },
]
const warranty = [
  { manufacturer_id: 'm1', product_kind: 'shock', quantity: 3 },
  { manufacturer_id: 'm1', product_kind: 'spring', quantity: 2 },
]
async function module(page: Page, name: string) {
  if (name === 'Molas') {
    await page.getByLabel('Opções da conta').click()
    await page.locator('.account-options').getByRole('button', { name, exact: true }).click()
  } else await openModule(page, name)
}
const cases: Scenario[] = []
for (const category of [{ kind: 'shock', code: 'AGM-35', module: 'Visão geral' }, { kind: 'spring', code: 'MGM-35', module: 'Molas' }]) {
  cases.push({ name: `entrada de ${category.code}`, rpc: 'receive_stock_with_supplier', text: ['Confirmar entrada de estoque?', category.code, 'A01', 'Quantidade: 1'],
    setup: async page => {
      await module(page, category.module)
      const form = page.locator('.receipt-form')
      await form.getByLabel('Código do produto', { exact: true }).fill(category.code)
      await form.getByRole('combobox', { name: /^Localização/ }).selectOption('A01')
      return form
    },
  })
  cases.push({ name: `venda de ${category.code}`, rpc: 'register_stock_outflow', text: ['Confirmar venda?', category.code, 'A01', 'Quantidade: 1'],
    setup: async page => {
      await module(page, 'Saídas')
      const form = page.locator('.outflow-panel form')
      await form.getByRole('combobox', { name: /^Categoria/ }).selectOption(category.kind === 'spring' ? 'springs' : 'shocks')
      await form.getByRole('combobox', { name: /^Saldo de origem/ }).selectOption({ index: 1 })
      return form
    },
  })
  cases.push({ name: `transferência de ${category.code}`, rpc: 'transfer_stock_once', text: ['Confirmar transferência?', category.code, 'Origem: A01', 'Destino: B01', 'Quantidade: 1'],
    setup: async page => {
      await module(page, category.module)
      const form = page.getByRole('region', { name: 'Transferir caixas entre prateleiras' }).locator('form')
      await form.getByRole('combobox', { name: /^Saldo de origem/ }).selectOption({ index: 1 })
      await form.getByRole('combobox', { name: /^Destino/ }).selectOption('B01')
      return form
    },
  })
  for (const direction of ['in', 'out']) {
    cases.push({ name: `garantia ${direction} de ${category.code}`, rpc: 'change_warranty_boxes', text: [direction === 'in' ? 'Confirmar entrada em garantia?' : 'Confirmar retirada da garantia?', category.kind === 'spring' ? 'Molas' : 'Amortecedores', 'Fabricante teste', 'Quantidade: 1'],
      setup: async page => {
        await module(page, 'Garantia')
        await page.getByRole('button', { name: direction === 'in' ? 'Adicionar caixas em Fabricante teste' : 'Retirar caixas de Fabricante teste', exact: true }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByRole('combobox', { name: /^Categoria/ }).selectOption(category.kind)
        return dialog.locator('form')
      },
    })
  }
  cases.push({ name: `devolução em garantia de ${category.code}`, rpc: 'save_warranty_return', text: ['Confirmar registro de devolução?', category.code, 'Em garantia', 'somadas à garantia'],
    setup: async page => {
      await module(page, 'Garantia')
      await page.getByRole('button', { name: 'Novo registro', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('Descrição do que chegou').fill('Devolução fictícia')
      await dialog.getByRole('combobox', { name: /^Categoria/ }).selectOption(category.kind)
      await dialog.getByRole('combobox', { name: /^Identificação da peça/ }).selectOption('ours')
      await dialog.getByRole('combobox', { name: /^Fabricante/ }).selectOption('m1')
      await dialog.getByLabel('Código da peça (se identificado)').fill(category.code)
      await dialog.getByLabel('Local atual').fill('DEV-01')
      await dialog.getByLabel('Motivo / relato da devolução').fill('Motivo fictício')
      await dialog.getByRole('combobox', { name: /^Andamento/ }).selectOption('warranty')
      return dialog.locator('form')
    },
  })
  cases.push({ name: `encerramento da garantia de ${category.code}`, rpc: 'save_warranty_return', text: ['Confirmar registro de devolução?', category.code, 'Encerrada', 'Destino: Destino fictício', 'retiradas da garantia'],
    overrides: { warranty_returns: [{ id: 'r1', manufacturer_id: 'm1', product_kind: category.kind, product_code: category.code, description: 'Retorno fictício', boxes: 1, reason: 'Motivo fictício', location: 'DEV-01', ownership: 'ours', status: 'warranty', destination: '', created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' }] },
    setup: async page => {
      await module(page, 'Garantia')
      await page.getByRole('button', { name: `Atualizar devolução ${category.code}`, exact: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('combobox', { name: /^Andamento/ }).selectOption('closed')
      await dialog.getByLabel('Destino / conclusão').fill('Destino fictício')
      return dialog.locator('form')
    },
  })
}
cases.push({ name: 'aprovação de amortecedor', rpc: 'approve_shock_boxes', text: ['Confirmar aprovação de amortecedores?', 'AGM-35', 'A01', 'Quantidade: 1'],
  setup: async page => {
    await module(page, 'Visão geral')
    await page.getByRole('button', { name: 'Ver testagem de AGM-35', exact: true }).first().click()
    return page.getByRole('dialog').locator('form')
  },
})
cases.push({ name: 'bloqueio imediato ao salvar mínimo', rpc: 'set_product_minimum', text: [], confirm: false,
  setup: async page => {
    await module(page, 'Visão geral')
    await page.getByRole('button', { name: 'Configurar mínimos', exact: true }).click()
    return page.getByRole('dialog').locator('form')
  },
})

for (const scenario of cases) {
  test(`prevenção: ${scenario.name} cancela e bloqueia envio repetido`, async ({ page }) => {
    await prepareKeyboardPage(page, {
      stock_balances: balances,
      locations: [{ id: 'l1', code: 'A01', is_active: true }, { id: 'l2', code: 'B01', is_active: true }],
      warranty_box_balances: warranty, ...scenario.overrides,
    })
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const requests: Record<string, unknown>[] = []
    await page.route(`https://stockflow-test.supabase.co/rest/v1/rpc/${scenario.rpc}`, async route => {
      requests.push(route.request().postDataJSON())
      await gate
      await route.fulfill({ json: { id: 'registro-ficticio', minimum_updated_at: '2026-11-01T00:00:00Z' } })
    })
    const form = await scenario.setup(page)
    const submit = form.locator('button[type="submit"]')
    if (scenario.confirm !== false) {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm')
        for (const text of scenario.text) expect(dialog.message()).toContain(text)
        await dialog.dismiss()
      })
      await submit.click()
      await expect(submit).toBeEnabled()
      expect(requests).toEqual([])
      expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => /liber\.(outflow|transfer)\.pending/.test(key)))).toEqual([])
    }
    let confirmations = 0
    page.on('dialog', async dialog => {
      confirmations++
      await dialog.accept()
    })
    // Duas tentativas no mesmo trecho de JavaScript, com resposta ainda pendente.
    await form.evaluate((element: HTMLFormElement) => { element.requestSubmit(); element.requestSubmit() })
    await expect.poll(() => requests.length).toBe(1)
    await expect(submit).toBeDisabled()
    expect(confirmations).toBe(scenario.confirm === false ? 0 : 1)
    expect(requests[0].p_request_id).toMatch(/^[a-f0-9-]{36}$/i)
    const completed = page.waitForResponse(response => response.url().endsWith(`/rpc/${scenario.rpc}`) && response.request().method() === 'POST')
    release()
    await (await completed).finished()
    expect(requests).toHaveLength(1)
  })
}
