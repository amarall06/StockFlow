import {test,expect} from '@playwright/test'
import {prepareKeyboardPage} from './helpers/keyboard'
test('planta no computador mantém propriedades laterais e orientação das prateleiras',async({page})=>{
  await page.setViewportSize({width:1600,height:1100})
  await prepareKeyboardPage(page)
  const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  const map=page.getByRole('region',{name:'Mapa de prateleiras',exact:true})
  await map.getByRole('button',{name:/^Prateleira NORTE —/}).click()
  const viewport=await map.getByRole('region',{name:'Área da planta com rolagem'}).boundingBox()
  const details=await map.getByRole('region',{name:'Detalhes da prateleira'}).boundingBox()
  expect(details!.x).toBeGreaterThanOrEqual(viewport!.x+viewport!.width)
  const north=await map.locator('.map-norte').boundingBox(),south=await map.locator('.map-sul').boundingBox(),west=await map.locator('.map-oeste').boundingBox(),east=await map.locator('.map-leste').boundingBox()
  expect(north!.y).toBeLessThan(south!.y);expect(west!.x).toBeLessThan(east!.x)
  await map.locator('.floor-workspace').screenshot({path:'test-results/floor-plan-desktop.png'})
})
