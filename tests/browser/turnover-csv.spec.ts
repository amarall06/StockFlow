import { test, expect } from '@playwright/test'

test('CSV de Giro ABC preserva período, filtro e classificação original', async ({ page }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'teste@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-27T00:00:00Z' }
  await page.addInitScript(value => {
    localStorage.setItem('sb-stockflow-test-auth-token', JSON.stringify(value))
  }, { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user })

  // Catálogo e vendas fictícios: nenhuma chamada chega ao banco real.
  await page.route('https://stockflow-test.supabase.co/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { is_active: true, display_name: 'Conta de Teste', role: 'administrator' } })
    if (url.pathname.endsWith('/inventory_api_version')) return route.fulfill({ json: 16 })
    if (Number(url.searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    if (url.pathname.endsWith('/products')) return route.fulfill({ json: [
      { id: 'p1', code: 'AGM-35', application: 'Amortecedor teste', default_location_id: 'l1', updated_at: '2026-10-27T00:00:00Z' },
      { id: 'p2', code: 'MGM-35', application: 'Mola teste', default_location_id: 'l1', updated_at: '2026-10-27T00:00:00Z' },
    ] })
    if (url.pathname.endsWith('/locations')) return route.fulfill({ json: [{ id: 'l1', code: 'A01', is_active: true }] })
    if (url.pathname.endsWith('/inventory_turnover')) {
      const input = route.request().postDataJSON()
      const asOf = Date.parse('2026-10-27T00:00:00Z')
      return route.fulfill({ json: {
        as_of: new Date(asOf).toISOString(),
        period_start: new Date(asOf - input.p_days * 86400000).toISOString(),
        days: input.p_days,
        category: input.p_category,
        products: [
          { code: 'AGM-35', registered_at: '2026-01-01T00:00:00Z', sold_boxes: 24, sales_count: 1, last_sale_at: '2026-10-26T00:00:00Z', stock_boxes: 10 },
          { code: 'MGM-35', registered_at: '2026-01-01T00:00:00Z', sold_boxes: 6, sales_count: 1, last_sale_at: '2026-10-25T00:00:00Z', stock_boxes: 7 },
        ],
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
  await expect(page.locator('.turnover-table tbody tr')).toHaveCount(2)
  await page.getByRole('combobox', { name: /^Período/ }).selectOption('30')
  await expect(page.locator('.turnover-summary')).toContainText('Últimos 30 dias')
  await page.getByLabel('Buscar código ou aplicação').fill('MGM-35')
  await expect(page.locator('.turnover-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.turnover-table .abc-badge')).toHaveText('B')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^liber-giro-abc-\d{4}-\d{2}-\d{2}\.csv$/)
  expect(await download.failure()).toBeNull()
  const stream = await download.createReadStream()
  if (!stream) throw new Error('O navegador não disponibilizou o CSV baixado.')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const csv = Buffer.concat(chunks).toString('utf8')

  // A busca não pode transformar a classe B em A ou sua participação em 100%.
  expect(csv).toBe(
    '\uFEFF"Consulta em (ISO)";"Início do período (ISO)";"Dias";"Categoria selecionada";"Código";"Aplicação";"Classe";"Caixas vendidas";"Participação (%)";"Acumulado (%)";"Caixas por dia";"Estoque atual (caixas)";"Última venda (ISO)"\r\n'
    + '"2026-10-27T00:00:00.000Z";"2026-09-27T00:00:00.000Z";30;"Amortecedores e molas";"MGM-35";"Mola teste  ";"Classe B";6;20;100;0,2;7;"2026-10-25T00:00:00Z"\r\n',
  )
})
