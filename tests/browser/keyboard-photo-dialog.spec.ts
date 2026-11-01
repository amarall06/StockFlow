import { test, expect } from '@playwright/test'

test('diálogo de foto mantém o foco e o devolve à miniatura pelo teclado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'teste@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-27T00:00:00Z' }
  await page.addInitScript(value => {
    localStorage.setItem('sb-stockflow-test-auth-token', JSON.stringify(value))
  }, { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user })

  // A conta é administradora apenas nesta simulação; nenhum arquivo é enviado.
  await page.route('https://stockflow-test.supabase.co/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { is_active: true, display_name: 'Conta de Teste', role: 'administrator' } })
    if (url.pathname.endsWith('/inventory_api_version')) return route.fulfill({ json: 16 })
    if (Number(url.searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    if (url.pathname.endsWith('/products')) return route.fulfill({ json: [{ id: 'p1', code: 'AGM-35', application: 'Teste', default_location_id: 'l1', updated_at: '2026-10-27T00:00:00Z' }] })
    if (url.pathname.endsWith('/locations')) return route.fulfill({ json: [{ id: 'l1', code: 'A01', is_active: true }] })
    return route.fulfill({ json: [] })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible()
  // O clique só prepara a página; todo o percurso do diálogo usa teclado.
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Produtos', exact: true }).click()
  const thumbnail = page.getByRole('button', { name: 'Ampliar foto de AGM-35 — exemplo ilustrativo', exact: true })
  await expect(thumbnail).toBeVisible()
  // Procura a miniatura com Tab, sem forçar foco por código.
  for (let step = 0; step < 80; step++) {
    if (await thumbnail.evaluate(element => element === document.activeElement)) break
    await page.keyboard.press('Tab')
  }
  await expect(thumbnail).toBeFocused()
  await page.keyboard.press('Space')

  const dialog = page.getByRole('dialog', { name: 'AGM-35', exact: true })
  const close = dialog.getByRole('button', { name: 'Fechar', exact: true })
  const file = dialog.getByLabel('Escolher imagem', { exact: true })
  await expect(dialog).toBeVisible()
  await expect(close).toBeFocused()
  await expect(file).toBeEnabled()
  await expect(dialog.getByRole('button', { name: 'Salvar foto', exact: true })).toBeDisabled()
  await page.keyboard.press('Tab')
  await expect(file).toBeFocused()
  await page.keyboard.press('Tab')
  // Chrome pode passar pelos controles do navegador entre o fim e o início.
  // Nesse ponto document.activeElement é body; nenhum controle de fundo é focado.
  if (await page.evaluate(() => document.activeElement === document.body)) {
    await expect(dialog).toHaveJSProperty('open', true)
    expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true)
    await page.keyboard.press('Tab')
  }
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  if (await page.evaluate(() => document.activeElement === document.body)) {
    await page.keyboard.press('Shift+Tab')
  }
  await expect(file).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(thumbnail).toBeFocused()

  // Confere também a abertura por Enter e o botão Fechar por Enter.
  await page.keyboard.press('Enter')
  await expect(close).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(thumbnail).toBeFocused()
})
