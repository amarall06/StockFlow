import { expect, type Locator, type Page } from '@playwright/test'

export async function prepareKeyboardPage(page: Page, overrides: Record<string, unknown> = {}) {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'teste@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-27T00:00:00Z' }
  const writes: string[] = []
  await page.addInitScript(value => {
    localStorage.setItem('sb-stockflow-test-auth-token', JSON.stringify(value))
  }, { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user })
  await page.route('https://stockflow-test.supabase.co/**', async route => {
    const url = new URL(route.request().url())
    const name = url.pathname.split('/').pop()
    const photoListing = url.pathname === '/storage/v1/object/list/product-photos'
    if (route.request().method() !== 'GET' && !photoListing && !['inventory_api_version', 'inventory_dashboard', 'inventory_activity_daily'].includes(name ?? '')) {
      writes.push(url.pathname)
      return route.fulfill({ status: 400, json: { message: 'Escrita bloqueada no teste de teclado' } })
    }
    if (name === 'user') return route.fulfill({ json: user })
    if (name === 'profiles') return route.fulfill({ json: { is_active: true, display_name: 'Conta de Teste', role: 'administrator' } })
    if (name === 'inventory_api_version') return route.fulfill({ json: 16 })
    if (Number(url.searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    if (name && Object.hasOwn(overrides, name)) {
      if (name === 'stock_movements' && url.searchParams.has('product.code')) return route.fulfill({ json: [] })
      return route.fulfill({ json: overrides[name] })
    }
    if (name === 'products') return route.fulfill({ json: [
      { id: 'p1', code: 'AGM-35', application: 'Amortecedor teste', default_location_id: 'l1', updated_at: '2026-10-27T00:00:00Z', minimum_boxes: 3, minimum_updated_at: '2026-10-27T00:00:00Z' },
      { id: 'p2', code: 'MGM-35', application: 'Mola teste', default_location_id: 'l1', updated_at: '2026-10-27T00:00:00Z' },
    ] })
    if (name === 'locations') return route.fulfill({ json: [{ id: 'l1', code: 'A01', is_active: true }] })
    if (name === 'stock_balances') return route.fulfill({ json: [
      { product_id: 'p1', location_id: 'l1', status_code: 'awaiting_test', quantity: 3 },
      { product_id: 'p2', location_id: 'l1', status_code: 'in_stock', quantity: 2 },
    ] })
    if (name === 'warranty_manufacturers') return route.fulfill({ json: [{ id: 'm1', name: 'Fabricante teste', updated_at: '2026-10-27T00:00:00Z' }] })
    if (name === 'warranty_box_balances') return route.fulfill({ json: [{ manufacturer_id: 'm1', product_kind: 'shock', quantity: 3 }] })
    if (name === 'product_application_history') return route.fulfill({ json: [{
      id: 'h1', product_code: 'AGM-35', change_kind: 'updated', performed_by: null, actor_display_name: 'Pessoa fictícia', created_at: '2026-10-27T00:00:00Z',
      details_before: { shockType: null, applications: [] }, details_after: { shockType: 'conventional_hydraulic', applications: [] },
    }] })
    if (name === 'inventory_dashboard') return route.fulfill({ json: { as_of: '2026-10-27T00:00:00Z', period_start: '2026-09-27T00:00:00Z', sold_boxes: 0, sales_count: 0, sales_by_product: [], receipts: [] } })
    return route.fulfill({ json: [] })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible()
  await expect(page.locator('.dashboard-stock-totals')).toBeVisible()
  return writes
}

export async function tabTo(page: Page, target: Locator, key = 'Tab') {
  await expect(target).toBeVisible()
  await expect(target).toBeEnabled()
  for (let step = 0; step < 120; step++) {
    if (await target.evaluate(element => element === document.activeElement)) return
    await page.keyboard.press(key)
  }
  await expect(target).toBeFocused()
}

export async function openModule(page: Page, name: string) {
  // Preparação do módulo; os fluxos sob teste começam nos controles internos.
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name, exact: true }).click()
}

export async function checkModalKeyboard(page: Page, trigger: Locator, dialog: Locator) {
  await tabTo(page, trigger)
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: /^Fechar/ })
  await expect(close).toBeFocused()
  // Percorre todos os controles habilitados nas duas direções. O navegador pode
  // receber foco entre as extremidades; nenhum controle de fundo pode recebê-lo.
  const count = await dialog.locator('button:enabled, input:enabled, select:enabled, textarea:enabled, summary').count()
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let step = 0; step < count + 2; step++) {
      await page.keyboard.press(key)
      expect(await dialog.evaluate(element => element.matches(':modal') && (element.contains(document.activeElement) || document.activeElement === document.body))).toBe(true)
    }
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Space')
  await expect(close).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
}
