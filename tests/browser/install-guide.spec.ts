import { test, expect } from '@playwright/test'
import { prepareKeyboardPage } from './helpers/keyboard'

test('menu da conta oferece instalação direta apenas quando disponível', async ({ page }) => {
  await prepareKeyboardPage(page)
  await page.getByLabel('Opções da conta').click()
  await expect(page.getByRole('button', { name: /Como instalar/ })).toHaveCount(0)
  const install = page.getByRole('button', { name: 'Instalar aplicativo', exact: true })
  await expect(install).toHaveCount(0)
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(event, {
      prompt: async () => { document.body.dataset.installPromptOpened = 'true' },
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    })
    window.dispatchEvent(event)
  })
  await expect(install).toBeVisible()
  await expect(page.locator('body')).not.toHaveAttribute('data-install-prompt-opened')
  await install.click()
  await expect(page.locator('body')).toHaveAttribute('data-install-prompt-opened', 'true')
  await expect(install).toHaveCount(0)
})
