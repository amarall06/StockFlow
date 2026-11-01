import { test, expect } from '@playwright/test'

test('teclado pula o menu e abre o estoque pelo painel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'teste@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-27T00:00:00Z' }
  await page.addInitScript(value => {
    localStorage.setItem('sb-stockflow-test-auth-token', JSON.stringify(value))
  }, { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user })

  // Somente dados fictícios: o teste de navegação não realiza operações de estoque.
  await page.route('https://stockflow-test.supabase.co/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { is_active: true, display_name: 'Conta de Teste', role: 'administrator' } })
    if (url.pathname.endsWith('/inventory_api_version')) return route.fulfill({ json: 16 })
    if (Number(url.searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    if (url.pathname.endsWith('/products')) return route.fulfill({ json: [{ id: 'p1', code: 'AGM-35', application: 'Teste', default_location_id: 'l1', updated_at: '2026-10-27T00:00:00Z' }] })
    if (url.pathname.endsWith('/locations')) return route.fulfill({ json: [{ id: 'l1', code: 'A01', is_active: true }] })
    if (url.pathname.endsWith('/inventory_dashboard')) return route.fulfill({ json: { as_of: '2026-10-27T00:00:00Z', period_start: '2026-09-27T00:00:00Z', sold_boxes: 0, sales_count: 0, sales_by_product: [], receipts: [] } })
    return route.fulfill({ json: [] })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible()
  await expect(page.locator('.dashboard-stock-totals')).toBeVisible()

  // Não usa click() nem focus(): verifica o caminho real de Tab e Enter.
  const skip = page.getByRole('link', { name: 'Ir para o conteúdo', exact: true })
  await page.keyboard.press('Tab')
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await expect(skip).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(page.locator('#consulta')).toBeFocused()

  await page.keyboard.press('Tab')
  const firstCard = page.getByRole('region', { name: 'Total de caixas por categoria' }).getByRole('button', { name: /Amortecedores/ }).first()
  await expect(firstCard).toBeFocused()
  await expect(firstCard).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible()
})
