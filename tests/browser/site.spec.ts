import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Todas as chamadas ao Supabase são interceptadas: nenhuma conta ou estoque real.
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'teste@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-27T00:00:00Z' }
const session = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user }

for (const width of [360, 390, 1440]) {
  test(`login, tema e acessibilidade em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route('https://stockflow-test.supabase.co/**', route => route.fulfill({ status: 400, json: { code: 'invalid_credentials', message: 'Invalid login credentials' } }))
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Entrar no sistema' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const theme = page.getByRole('button').first()
    await theme.click()
    await page.reload()
    await expect(page.locator('.auth-screen')).toHaveClass(/theme-dark/)
    await theme.click()
    await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('senha-ficticia')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Não foi possível entrar')
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled()
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(audit.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([])
  })
}

test('navegação, CSV, fotos e recuperação de transferência após resposta perdida', async ({ page }) => {
  const transfers: unknown[] = []
  let accepted = false
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.addInitScript(value => localStorage.setItem('sb-stockflow-test-auth-token', JSON.stringify(value)), session)
  await page.route('https://stockflow-test.supabase.co/**', async route => {
    const url = new URL(route.request().url())
    if (['/products', '/locations', '/stock_balances', '/product_applications'].some(table => url.pathname.endsWith(table)) && Number(url.searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    if (url.pathname.endsWith('/transfer_stock_once')) {
      const payload = route.request().postDataJSON()
      transfers.push(payload)
      if (!accepted) { accepted = true; return route.fulfill({ status: 503, json: { message: 'Resposta perdida' } }) }
      return route.fulfill({ json: { id: payload.p_request_id } })
    }
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 500, json: { message: 'Falha simulada' } })
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { is_active: true, display_name: 'Conta de Teste', role: 'administrator' } })
    if (url.pathname.endsWith('/inventory_api_version')) return route.fulfill({ json: 15 })
    if (url.pathname.endsWith('/products')) return route.fulfill({ json: [{ id: 'p1', code: 'AGM-35', application: 'Teste', default_location_id: 'l1', updated_at: '2026-10-27T00:00:00Z' }] })
    if (url.pathname.endsWith('/stock_balances')) return route.fulfill({ json: [{ product_id: 'p1', location_id: 'l1', status_code: 'released_for_sale', quantity: 2 }] })
    if (url.pathname.endsWith('/inventory_turnover')) {
      const input = route.request().postDataJSON()
      const asOf = Date.parse('2026-10-27T00:00:00Z')
      return route.fulfill({ json: { as_of: new Date(asOf).toISOString(), period_start: new Date(asOf-input.p_days*86400000).toISOString(), days: input.p_days, category: input.p_category, products: [] } })
    }
    if (url.pathname.endsWith('/locations')) return route.fulfill({ json: [{ id: 'l1', code: 'A01', is_active: true }, { id: 'l2', code: 'B01', is_active: true }] })
    if (url.pathname.endsWith('/inventory_dashboard')) return route.fulfill({ json: { as_of: '2026-10-27T00:00:00Z', period_start: '2026-09-27T00:00:00Z', sold_boxes: 0, sales_count: 0, sales_by_product: [], receipts: [] } })
    return route.fulfill({ json: [] })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible()
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const name of ['Produtos', 'Giro e ABC', 'Visão geral', 'Garantia', 'Molas', 'Saídas', 'Histórico', 'Aplicações', 'Painel']) {
      await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name, exact: true }).click()
      await expect(page.locator('#consulta h1')).toBeVisible()
      await expect(page.getByText('Não foi possível abrir esta tela', { exact: true })).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow em ${width}px`).toBe(true)
    }
  }
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Visão geral', exact: true }).click()
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Painel', exact: true }).click()
  await page.getByRole('button', { name: /Total no estoque normal/ }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.csv$/)
  await page.getByRole('button', { name: /Ampliar foto de AGM-35/ }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect.poll(() => page.getByRole('dialog').locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Visão geral', exact: true }).click()
  const transfer = page.getByRole('region', { name: 'Transferir caixas entre prateleiras' })
  await transfer.getByLabel('Saldo de origem da transferência').selectOption({ index: 1 })
  await transfer.getByLabel('Destino da transferência').selectOption('B01')
  await transfer.getByRole('button', { name: 'Registrar transferência' }).click()
  await expect(transfer.getByRole('alert')).toContainText('Não foi possível confirmar')
  await expect(transfer.getByLabel('Saldo de origem da transferência')).toBeDisabled()
  await page.reload()
  await expect(transfer.getByText('Transferência aguardando confirmação', { exact: true })).toBeVisible()
  await transfer.getByRole('button', { name: 'Conferir transferência pendente' }).click()
  await expect(transfer.getByText('Transferência registrada. Estoque e histórico atualizados.', { exact: true })).toBeVisible()
  expect(transfers).toHaveLength(2)
  expect(transfers[0]).toEqual(transfers[1])
  expect(pageErrors).toEqual([])
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('O serviço não confirmou a saída')
  await expect(page.getByRole('heading', { name: 'Entrar no sistema' })).toBeVisible()
})
