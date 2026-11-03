import {test,expect,type Page} from '@playwright/test'
import {prepareKeyboardPage,openModule} from './helpers/keyboard'

const regions=['NORTE','SUL','LESTE','OESTE']
async function prepare(page:Page){
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error'&&/unique.*key|same key|React error/i.test(message.text()))errors.push(message.text())})
  const products=Array.from({length:95},(_,i)=>({id:`p${i}`,code:`${i<60?'AGM':'MGM'}-${i+100}`,application:`Aplicação ${i}`,default_location_id:`l${i%4}`,updated_at:'2026-11-02T12:00:00Z',minimum_boxes:3}))
  const writes=await prepareKeyboardPage(page,{
    products, locations:regions.map((code,i)=>({id:`l${i}`,code,is_active:true})),
    stock_balances:products.map((product,i)=>({product_id:product.id,location_id:`l${i%4}`,quantity:10,status_code:i<60?'released_for_sale':'in_stock'})),
    inventory_activity_daily:Array.from({length:7},(_,i)=>({day:`2026-10-${i+20}`,sold_boxes:i,received_boxes:i+1})),
  })
  return {errors,writes}
}

test('Painel regional: 95 produtos, quatro capacidades e gráfico dentro do eixo',async({page})=>{
  const {errors,writes}=await prepare(page)
  const capacity=page.getByRole('region',{name:'Ocupação por capacidade física',exact:true})
  await expect(capacity).toBeVisible()
  await expect(capacity.getByRole('combobox')).toHaveCount(0)
  for(const region of regions)await expect(capacity.getByText(region,{exact:true}).first()).toBeVisible()
  await expect(page.locator('.dashboard-stock-totals')).toContainText('950')
  await page.getByLabel('Visualização do gráfico',{exact:true}).selectOption('line')
  const svg=page.locator('svg.activity-chart')
  const points=(await svg.locator('polyline').getAttribute('points'))!.split(' ').map(pair=>pair.split(',').map(Number))
  expect(points).toHaveLength(7)
  expect(points.every(([x,y])=>x>40&&x<580&&y>=30&&y<=150)).toBe(true)
  expect(Number(await svg.locator('circle').getAttribute('cx'))).toBeCloseTo(points[0][0])
  expect(errors).toEqual([])
  expect(writes).toEqual([])
})

test('Revisão de navegação: todos os módulos e apresentação sem quebra',async({page})=>{
  const {errors}=await prepare(page)
  for(const module of ['Produtos','Giro e ABC','Visão geral','Garantia','Molas','Saídas','Histórico','Aplicações','Painel inicial']){
    if(['Giro e ABC','Molas'].includes(module)){
      await page.getByLabel('Opções da conta',{exact:true}).click()
      await page.locator('.account-options').getByRole('button',{name:module,exact:true}).click()
    }else await openModule(page,module)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('heading',{name:'Não foi possível abrir esta tela',exact:true})).toHaveCount(0)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),module).toBe(true)
  }
  await page.getByRole('button',{name:'Abrir meu perfil',exact:true}).click()
  await expect(page.locator('h1')).toContainText('perfil')
  await openModule(page,'Painel inicial')
  await page.getByRole('combobox',{name:'Visualização do Painel',exact:true}).selectOption('presentation')
  await expect(page.getByRole('region',{name:'Apresentação do estoque',exact:true})).toBeVisible()
  expect(errors).toEqual([])
})

test('Celular: Painel e consulta de quatro regiões cabem na tela',async({page})=>{
  await page.setViewportSize({width:375,height:812})
  const {errors}=await prepare(page)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.getByRole('button',{name:'Menu',exact:true}).click()
  await page.getByRole('dialog',{name:'Menu de navegação',exact:true}).getByRole('button',{name:'Visão geral',exact:true}).click()
  await expect(page.getByText('Prateleiras por região',{exact:true})).toBeVisible()
  await expect(page.getByLabel('Código da nova localização',{exact:true})).toHaveCount(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  expect(errors).toEqual([])
})

test('Consulta de vendas interrompida informa erro e permite nova tentativa',async({page})=>{
  await prepare(page)
  await page.route('**/rest/v1/rpc/inventory_dashboard',route=>route.abort('timedout'))
  await page.reload()
  await expect(page.getByRole('alert').filter({hasText:'Não foi possível consultar vendas e entradas'})).toBeVisible()
  await page.getByText('Filtros do painel',{exact:true}).click()
  await expect(page.getByRole('button',{name:'Atualizar painel',exact:true})).toBeEnabled()
})

test('API 17 e tema escuro: locais arquivados não voltam às opções operacionais',async({page})=>{
  const {errors}=await prepare(page)
  await page.route('**/rest/v1/rpc/inventory_api_version',route=>route.fulfill({contentType:'application/json',body:'17'}))
  await page.route('**/rest/v1/locations?**',route=>route.fulfill({json:Number(new URL(route.request().url()).searchParams.get('offset'))>0?[]:[...regions.map((code,i)=>({id:`l${i}`,code,is_active:true})),{id:'old',code:'A01',is_active:false}]}))
  await page.reload()
  await expect(page.locator('.dashboard-stock-totals')).toContainText('950')
  await page.getByLabel('Opções da conta',{exact:true}).click()
  await page.getByRole('button',{name:'Ativar modo escuro',exact:true}).click()
  await page.getByLabel('Opções da conta',{exact:true}).click()
  await expect(page.locator('main')).toHaveClass(/theme-dark/)
  await page.getByRole('button',{name:'Total em estoque 950 caixas',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Estoque geral',exact:true})).toBeVisible()
  await expect(page.locator('#consulta')).not.toContainText('A01')
  await openModule(page,'Visão geral')
  const destination=page.getByRole('combobox',{name:'Destino da transferência',exact:true})
  await expect(destination).toBeVisible()
  await expect(destination.getByRole('option',{name:'A01',exact:true})).toHaveCount(0)
  for(const region of regions)await expect(destination.getByRole('option',{name:region,exact:true})).toHaveCount(1)
  await page.screenshot({path:'test-results/regional-desktop.png',fullPage:true})
  expect(errors).toEqual([])
})

test('Painel: requisição sem resposta termina após 15 segundos',async({page})=>{
  await prepare(page)
  await page.route('**/rest/v1/rpc/inventory_dashboard',()=>{})
  await page.reload()
  await expect(page.getByRole('alert').filter({hasText:'Não foi possível consultar vendas e entradas'})).toBeVisible({timeout:20000})
})

test('Conferência final: alertas, unidades em caixas e tabela limitada do Painel',async({page})=>{
  await prepare(page)
  const productTable=page.getByRole('table',{name:'Última movimentação dos produtos com saldo',exact:true})
  await expect(productTable.locator('tbody tr')).toHaveCount(95)
  expect(await productTable.locator('..').evaluate(element=>element.clientHeight)).toBeLessThanOrEqual(420)
  await page.screenshot({path:'test-results/painel-regional.png'})
  await page.getByRole('navigation',{name:'Menu principal'}).getByRole('button',{name:/^Alertas/}).click()
  await expect(page.getByRole('heading',{name:'Alertas',exact:true})).toBeVisible()
  await openModule(page,'Visão geral')
  await expect(page.getByRole('heading',{name:'Prateleiras por região',exact:true})).toBeVisible()
  await expect(page.locator('#consulta')).not.toContainText('cada caixa contém 2 peças')
  await expect(page.locator('#consulta')).not.toContainText('equivale a')
})
