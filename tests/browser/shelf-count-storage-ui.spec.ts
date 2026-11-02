import {test,expect} from '@playwright/test'
import {prepareKeyboardPage,openModule} from './helpers/keyboard'
test('falha de espaço ao contar informa a recusa sem mostrar valor como salvo',async({page})=>{
  const writes=await prepareKeyboardPage(page)
  await openModule(page,'Visão geral');await page.locator('#shelf-count > summary').click()
  await page.getByLabel('Prateleira para contar').selectOption('A01')
  await page.getByRole('button',{name:'Iniciar contagem local'}).click()
  const before=await page.evaluate(()=>localStorage.getItem('liber:shelf-count:v1:11111111-1111-4111-8111-111111111111'))
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('liber:shelf-count:'))throw new DOMException('Sem espaço para salvar a contagem.','QuotaExceededError');return original.call(this,key,value)}})
  await page.getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true}).fill('2')
  await expect(page.locator('#shelf-count').getByRole('status').filter({hasText:'Sem espaço para salvar a contagem.'})).toBeVisible()
  await expect(page.getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true})).toHaveValue('')
  await expect(page.getByRole('button',{name:'Exportar contagem para revisão'})).toBeDisabled()
  expect(await page.evaluate(()=>localStorage.getItem('liber:shelf-count:v1:11111111-1111-4111-8111-111111111111'))).toBe(before)
  expect(writes).toEqual([])
})
