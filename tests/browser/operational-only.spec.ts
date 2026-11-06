import {test, expect} from '@playwright/test'
import {prepareKeyboardPage} from './helpers/keyboard'

test('Painel abre apenas o estoque operacional e preserva o atalho da planta', async ({page}) => {
  const writes = await prepareKeyboardPage(page)
  const notice = page.getByRole('button', {name:'Fechar aviso de estoque', exact:true})
  if (await notice.isVisible()) await notice.click()
  await expect(page.getByRole('region', {name:'Total de caixas por categoria'})).toContainText('5 caixas')
  await page.locator('.dashboard-quicknav summary').click()
  await expect(page.getByLabel('Visualização do Painel')).toHaveCount(0)
  await expect(page.getByRole('region', {name:'Apresentação do estoque', exact:true})).toHaveCount(0)
  await page.getByRole('button', {name:'Planta e capacidades', exact:true}).click()
  await expect(page.getByRole('heading', {name:'Planta e capacidades do estoque', exact:true})).toBeVisible()
  expect(writes).toEqual([])
})
