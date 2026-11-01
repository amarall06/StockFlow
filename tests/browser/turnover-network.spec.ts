import { test, expect } from '@playwright/test'

test('Giro ABC permite recuperar consulta após falha de rede', async ({ page }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'teste@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-27T00:00:00Z' }
  await page.addInitScript(value => {
    localStorage.setItem('sb-stockflow-test-auth-token', JSON.stringify(value))
  }, { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user })

  let networkFailed = true
  let turnoverRequests = 0
  // A falha atinge somente o relatório; conta e estoque são simulados normalmente.
  await page.route('https://stockflow-test.supabase.co/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { is_active: true, display_name: 'Conta de Teste', role: 'administrator' } })
    if (url.pathname.endsWith('/inventory_api_version')) return route.fulfill({ json: 16 })
    if (Number(url.searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    if (url.pathname.endsWith('/products')) return route.fulfill({ json: [{ id: 'p1', code: 'AGM-35', application: 'Teste', default_location_id: 'l1', updated_at: '2026-10-27T00:00:00Z' }] })
    if (url.pathname.endsWith('/locations')) return route.fulfill({ json: [{ id: 'l1', code: 'A01', is_active: true }] })
    if (url.pathname.endsWith('/inventory_turnover')) {
      turnoverRequests++
      if (networkFailed) return route.abort('failed')
      const input = route.request().postDataJSON()
      const asOf = Date.parse('2026-10-27T00:00:00Z')
      return route.fulfill({ json: {
        as_of: new Date(asOf).toISOString(),
        period_start: new Date(asOf - input.p_days * 86400000).toISOString(),
        days: input.p_days,
        category: input.p_category,
        products: [{ code: 'AGM-35', registered_at: '2026-01-01T00:00:00Z', sold_boxes: 9, sales_count: 1, last_sale_at: '2026-10-26T00:00:00Z', stock_boxes: 2 }],
      } })
    }
    return route.fulfill({ json: [] })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible()
  if ((page.viewportSize()?.width ?? 1440) <= 1024) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Giro e ABC', exact: true }).click()
  } else {
    await page.getByLabel('Opções da conta').click()
    await page.locator('.account-options').getByRole('button', { name: 'Giro e ABC', exact: true }).click()
  }
  const error = page.getByRole('alert').filter({ hasText: 'Não foi possível consultar os indicadores. Confira a conexão e tente atualizar.' })
  await expect(error).toBeVisible()
  await expect(page.locator('.turnover-table')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Exportar CSV', exact: true })).toHaveCount(0)
  const attemptsBeforeRetry = turnoverRequests

  // Restaura a resposta e usa a recuperação oferecida pela própria tela.
  networkFailed = false
  await page.getByRole('button', { name: 'Atualizar indicadores', exact: true }).click()
  await expect(page.locator('.turnover-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.turnover-table tbody tr')).toContainText('AGM-35')
  await expect(error).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Exportar CSV', exact: true })).toBeEnabled()
  expect(turnoverRequests).toBeGreaterThan(attemptsBeforeRetry)
})
