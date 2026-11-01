import { test, expect } from '@playwright/test'
import { prepareKeyboardPage, openModule } from './helpers/keyboard'

for (const category of [
  { value: 'shocks', code: 'AGM-35', status: 'awaiting_test', available: 3 },
  { value: 'springs', code: 'MGM-35', status: 'in_stock', available: 2 },
]) {
  for (const reason of [
    { value: 'discard', label: 'descarte' },
    { value: 'supplier_return', label: 'devolução ao fornecedor' },
  ]) {
    test(`confirmação de ${reason.label} para ${category.code} permite cancelar antes do envio`, async ({ page }) => {
      await prepareKeyboardPage(page)
      const requests: Record<string, unknown>[] = []
      await page.route('https://stockflow-test.supabase.co/rest/v1/rpc/register_stock_outflow', async route => {
        requests.push(route.request().postDataJSON())
        return route.fulfill({ json: { id: 'saida-ficticia' } })
      })
      await openModule(page, 'Saídas')
      const form = page.getByRole('region', { name: 'Registrar saída de caixas' })
      await form.getByRole('combobox', { name: /^Categoria/ }).selectOption(category.value)
      await form.getByRole('combobox', { name: /^Motivo da saída/ }).selectOption(reason.value)
      await form.getByRole('combobox', { name: /^Saldo de origem/ }).selectOption({ index: 1 })
      await form.getByRole('spinbutton', { name: 'Quantidade de caixas', exact: true }).fill('1')
      await form.getByRole('textbox', { name: /^Observação/ }).fill('Motivo fictício e destino conferidos')
      await form.getByRole('textbox', { name: /^Referência/ }).fill('TESTE-CONFIRMACAO')
      const submit = form.getByRole('button', { name: 'Registrar saída', exact: true })
      const expectedMessage = [
        `Confirmar ${reason.label}?`,
        `Produto: ${category.code}`,
        'Localização: A01',
        'Quantidade: 1 caixa',
        `Saldo consultado após a saída: ${category.available - 1} caixas`,
        'Motivo / destino: Motivo fictício e destino conferidos',
        'Referência: TESTE-CONFIRMACAO',
      ]
      let canceled = false
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm')
        for (const line of expectedMessage) expect(dialog.message()).toContain(line)
        await dialog.dismiss()
        canceled = true
      })
      await submit.click()
      await expect.poll(() => canceled).toBe(true)
      expect(requests).toEqual([])
      expect(await page.evaluate(() => sessionStorage.getItem('liber.outflow.pending.v1:11111111-1111-4111-8111-111111111111'))).toBeNull()
      await expect(submit).toBeEnabled()
      await expect(form.getByRole('textbox', { name: /^Observação/ })).toHaveValue('Motivo fictício e destino conferidos')

      page.once('dialog', async dialog => {
        for (const line of expectedMessage) expect(dialog.message()).toContain(line)
        await dialog.accept()
      })
      await submit.click()
      await expect(form.getByText('Saída registrada. Estoque e histórico atualizados.', { exact: true })).toBeVisible()
      expect(requests).toHaveLength(1)
      expect(requests[0]).toMatchObject({ p_code: category.code, p_location: 'A01', p_status: category.status, p_boxes: 1, p_reason: reason.value, p_notes: 'Motivo fictício e destino conferidos', p_reference: 'TESTE-CONFIRMACAO' })
      expect(requests[0].p_request_id).toMatch(/^[a-f0-9-]{36}$/i)
    })
  }
}
