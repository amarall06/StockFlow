import { test, expect } from '@playwright/test'
import { prepareKeyboardPage } from './helpers/keyboard'

test('manifesto e ícones permitem preparar instalação em janela própria', async ({ page, request }) => {
  await prepareKeyboardPage(page)
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest')
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest.display).toBe('standalone')
  expect(manifest.scope).toBe('/')
  expect(manifest.start_url).toBe('/')
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512'])
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src)
    expect(image.ok()).toBe(true)
    expect(image.headers()['content-type']).toContain('image/png')
    const bytes = await image.body()
    expect(bytes.readUInt32BE(16)).toBe(Number(icon.sizes.split('x')[0]))
    expect(bytes.readUInt32BE(20)).toBe(Number(icon.sizes.split('x')[1]))
  }
})

test('instalação só abre após ação da pessoa e consome um convite por vez', async ({ page }) => {
  await prepareKeyboardPage(page)
  await page.getByLabel('Opções da conta').click()
  const install = page.getByRole('button', { name: 'Instalar aplicativo', exact: true })
  await expect(install).toHaveCount(0)
  await page.evaluate(() => {
    const state = window as Window & { installRequests: number }
    state.installRequests = 0
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(event, { prompt: async () => { state.installRequests++ }, userChoice: Promise.resolve({ outcome: 'dismissed' }) })
    window.dispatchEvent(event)
  })
  await expect(install).toBeVisible()
  expect(await page.evaluate(() => (window as Window & { installRequests: number }).installRequests)).toBe(0)
  await install.click()
  await expect(install).toHaveCount(0)
  expect(await page.evaluate(() => (window as Window & { installRequests: number }).installRequests)).toBe(1)
})
