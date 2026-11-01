import { test, expect } from '@playwright/test'

test('CSV de garantia contém somente o fabricante filtrado e seus saldos', async ({ page }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'teste@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-27T00:00:00Z' }
  await page.addInitScript(value => {
    localStorage.setItem('sb-stockflow-test-auth-token', JSON.stringify(value))
  }, { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user })

  // Todas as respostas são fictícias, sem consultar ou alterar o banco real.
  await page.route('https://stockflow-test.supabase.co/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { is_active: true, display_name: 'Conta de Teste', role: 'administrator' } })
    if (url.pathname.endsWith('/inventory_api_version')) return route.fulfill({ json: 16 })
    if (Number(url.searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    if (url.pathname.endsWith('/products')) return route.fulfill({ json: [{ id: 'p1', code: 'AGM-35', application: 'Teste', default_location_id: 'l1', updated_at: '2026-10-27T00:00:00Z' }] })
    if (url.pathname.endsWith('/locations')) return route.fulfill({ json: [{ id: 'l1', code: 'A01', is_active: true }] })
    if (url.pathname.endsWith('/warranty_manufacturers')) return route.fulfill({ json: [
      { id: 'm1', name: 'Fábrica de Teste', updated_at: '2026-10-27T00:00:00Z' },
      { id: 'm2', name: 'Outra Marca', updated_at: '2026-10-27T00:00:00Z' },
    ] })
    if (url.pathname.endsWith('/warranty_box_balances')) return route.fulfill({ json: [
      { manufacturer_id: 'm1', product_kind: 'shock', quantity: 2 },
      { manufacturer_id: 'm1', product_kind: 'spring', quantity: 3 },
      { manufacturer_id: 'm2', product_kind: 'shock', quantity: 9 },
    ] })
    return route.fulfill({ json: [] })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible()
  if ((page.viewportSize()?.width ?? 1440) <= 1024) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
  }
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Garantia', exact: true }).click()
  await expect(page.locator('.manufacturer-cards > li')).toHaveCount(2)
  await page.getByLabel('Buscar fabricante').fill('Fábrica')
  await expect(page.locator('.manufacturer-cards > li')).toHaveCount(1)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^liber-garantia-fabricantes-\d{4}-\d{2}-\d{2}\.csv$/)
  expect(await download.failure()).toBeNull()

  // Lê o arquivo realmente baixado, em vez de conferir apenas o aviso da tela.
  const stream = await download.createReadStream()
  if (!stream) throw new Error('O navegador não disponibilizou o CSV baixado.')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv).toBe(
    '\uFEFF"Fabricante";"Amortecedores (caixas)";"Molas (caixas)";"Total (caixas)"\r\n'
    + '"Fábrica de Teste";2;3;5\r\n',
  )
})
