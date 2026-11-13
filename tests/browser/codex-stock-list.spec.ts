import {expect,test} from '@playwright/test'
import {prepareKeyboardPage,openModule} from './helpers/keyboard'
test('Visão geral limita a lista e busca registros ocultos',async ({page})=>{
 const products=Array.from({length:10},(_,i)=>({id:'p'+i,code:'AGM-'+(30+i),application:'Teste',default_location_id:'l1'}))
 await prepareKeyboardPage(page,{products,stock_balances:products.map(p=>({product_id:p.id,location_id:'l1',status_code:'released_for_sale',quantity:1}))})
 await openModule(page,'Visão geral')
 const table=page.getByRole('region',{name:'Rolagem da tabela de estoque'})
 const rows=table.locator('tbody tr')
 await expect(rows).toHaveCount(8)
 await expect(table.getByText('AGM-39',{exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Ver todos os amortecedores'}).click()
 await expect(rows).toHaveCount(10)
 await page.getByRole('button',{name:'Mostrar menos amortecedores'}).click()
 await expect(rows).toHaveCount(8)
 const search=page.getByRole('searchbox',{name:'Buscar por código, aplicação ou localização'})
 await search.fill('AGM-39')
 await expect(rows).toHaveCount(1)
 await expect(rows.first()).toContainText('AGM-39')
 await search.clear()
 await expect(rows).toHaveCount(8)
})

import {prepareRedesign} from './helpers/redesign'
for (const width of [1440, 820, 390]) {
 test('Planta amplia prateleira e ajusta a posição da lista em '+width+'px', async ({page}) => {
  await page.setViewportSize({width,height:900})
  await prepareRedesign(page)
  await page.locator('.dashboard-quicknav summary').click()
  await page.getByRole('button',{name:/Planta e capacidades/}).click()
  const map=page.getByRole('region',{name:'Mapa de prateleiras'})
  const rack=map.getByRole('button',{name:/Prateleira NORTE/})
  await expect(map.getByLabel('Nível de zoom')).toHaveText('75%')
  await rack.click()
  await expect(map.getByLabel('Nível de zoom')).toHaveText('100%')
  const details=map.getByRole('region',{name:'Detalhes da prateleira'})
  await expect(details.getByRole('table',{name:'Produtos de NORTE'})).toBeVisible()
  const area=await map.getByRole('region',{name:'Área da planta com rolagem'}).boundingBox()
  const list=await details.boundingBox()
  if (width > 600) {
   expect(list!.x).toBeGreaterThan(area!.x+area!.width-1)
   expect(list!.height).toBe(area!.height)
  } else {
   expect(list!.x).toBeCloseTo(area!.x)
   expect(list!.y).toBeGreaterThan(area!.y+area!.height-1)
   expect(list!.height).toBeLessThanOrEqual(900*.42+1)
  }
  await details.getByRole('button',{name:'Fechar detalhes do mapa'}).click()
  await expect(map.getByLabel('Nível de zoom')).toHaveText('75%')
 })
}
