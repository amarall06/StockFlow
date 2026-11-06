import{test,expect}from'@playwright/test'
import{readFileSync}from'node:fs'
import{prepareKeyboardPage}from'./helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const actor='11111111-1111-4111-8111-111111111111'
const region=page=>page.getByRole('region',{name:'Sincronização da planta e capacidades',exact:true})
const stock=page=>page.getByRole('region',{name:'Ocupação operacional compartilhada',exact:true})
const north=page=>stock(page).getByRole('article',{name:'Consultada NORTE',exact:true})
function server(){return{head:{scenario_key:'liber-inventory-v1',revision:1,layout:structuredClone(base.payload.floorPlan),capacities:{},updated_at:base.published_at,updated_by:null},calls:[] as any[],receipts:new Map(),commits:0,lose:false,fail:false,invalid:false}}
async function prepare(page,db,role='administrator'){
 const writes=await prepareKeyboardPage(page,{
  locations:['NORTE','SUL','LESTE','OESTE'].map((code,i)=>({id:`l${i+1}`,code,is_active:true})),
  stock_balances:[{product_id:'p1',location_id:'l1',status_code:'awaiting_test',quantity:3},{product_id:'p2',location_id:'l2',status_code:'in_stock',quantity:2}],
 })
 await page.route('**/rest/v1/inventory_layouts*',route=>db.fail?route.fulfill({status:403,json:{message:'Consulta indisponível'}}):route.fulfill({json:db.invalid?{...db.head,scenario_key:base.scenario_key}:db.head}))
 await page.route('**/rest/v1/rpc/save_inventory_layout',route=>{
  const input=route.request().postDataJSON();db.calls.push(input)
  const previous=db.receipts.get(input.p_request_id);if(previous)return route.fulfill({json:previous})
  if(input.p_expected_revision!==db.head.revision)return route.fulfill({status:409,json:{code:'40001'}})
  db.commits++;db.head={...db.head,revision:db.head.revision+1,layout:input.p_layout,capacities:input.p_capacities,updated_by:actor}
  db.receipts.set(input.p_request_id,structuredClone(db.head))
  if(db.lose){db.lose=false;return route.fulfill({status:400,json:{code:'08006'}})}
  return route.fulfill({json:db.head})
 })
 await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
 await page.route('**/rest/v1/presentation_layouts*',route=>route.fulfill({json:{scenario_key:base.scenario_key,revision:1,layout:base.payload.floorPlan,capacities:base.payload.capacities,updated_at:base.published_at,updated_by:null}}))
 if(role!=='administrator')await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,role,display_name:'Consulta'}}))
 await page.reload()
 await expect(region(page)).toContainText('Planta e capacidades do estoque')
 return writes
}
async function edit(page){await expect(region(page)).toContainText('Versão compartilhada');await region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true}).click();return region(page).getByRole('form',{name:'Editar configuração compartilhada',exact:true})}
test('mapa operacional usa saldos consultados e capacidades vazias sem divergência de exemplo',async({page})=>{
 const db=server(),writes=await prepare(page,db)
 await expect(stock(page).getByRole('article')).toHaveCount(4)
 await expect(north(page)).toContainText('3 caixas consultadas')
 await expect(stock(page).getByText('Capacidade não informada — percentual indisponível.',{exact:true})).toHaveCount(4)
 await expect(stock(page).getByRole('button',{name:/^Prateleira LESTE — Sem caixas/})).toBeVisible()
 await expect(stock(page).locator('.map-divergent')).toHaveCount(0)
 await expect(stock(page).locator('.space-suggestions')).toHaveCount(0)
 expect(writes).toEqual([]);expect(db.commits).toBe(0)
})
test('confirmação operacional recuperada sincroniza outro navegador',async({page,browser})=>{
 const db=server(),context=await browser.newContext({baseURL:test.info().project.use.baseURL})
 try{
  const writes=await prepare(page,db),other=await context.newPage(),otherWrites=await prepare(other,db)
  db.lose=true
  const form=await edit(page)
  await form.getByLabel('Capacidade compartilhada (caixas)',{exact:true}).fill('100')
  await form.getByLabel('Referência compartilhada da caixa',{exact:true}).fill('Caixa conferida')
  await form.getByRole('button',{name:'Salvar planta e capacidades no Supabase',exact:true}).click()
  await expect(form.getByRole('alert')).toContainText('Não foi possível confirmar')
  await form.getByRole('button',{name:'Salvar planta e capacidades no Supabase',exact:true}).click()
  await expect(north(page)).toContainText('3% da capacidade')
  expect(db.calls[0].p_request_id).toBe(db.calls[1].p_request_id);expect(db.commits).toBe(1)
  await other.evaluate(()=>window.dispatchEvent(new Event('focus')))
  await expect(north(other)).toContainText('Capacidade: 100 caixas')
  expect(writes).toEqual([]);expect(otherWrites).toEqual([])
 }finally{await context.close()}
})
test('edição operacional congelada recusa conflito de versão e mantém preenchimento',async({page})=>{
 const db=server();await prepare(page,db);const form=await edit(page)
 await form.getByLabel('Capacidade compartilhada (caixas)',{exact:true}).fill('100')
 await form.getByLabel('Referência compartilhada da caixa',{exact:true}).fill('Minha referência')
 db.head={...db.head,revision:2,capacities:{NORTE:{boxes:80,basis:'Outra referência'}}}
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await expect(region(page)).toContainText('Versão compartilhada 2')
 await form.getByRole('button',{name:'Salvar planta e capacidades no Supabase',exact:true}).click()
 await expect(form.getByRole('alert')).toContainText('mudou em outro aparelho')
 await expect(form.getByLabel('Capacidade compartilhada (caixas)',{exact:true})).toHaveValue('100')
 expect(db.commits).toBe(0)
})
test('falha operacional preserva última planta e bloqueia nova edição até recuperar',async({page})=>{
 const db=server();await prepare(page,db);await expect(stock(page)).toBeVisible()
 db.fail=true;await region(page).getByRole('button',{name:'Atualizar planta e capacidades',exact:true}).click()
 await expect(region(page).getByRole('alert')).toContainText('última versão consultada foi mantida')
 await expect(north(page)).toContainText('3 caixas consultadas')
 await expect(region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true})).toBeDisabled()
 db.fail=false;await region(page).getByRole('button',{name:'Atualizar planta e capacidades',exact:true}).click()
 await expect(region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true})).toBeEnabled()
})
test('Consulta operacional em 375px navega no mapa por teclado e não altera configuração',async({page})=>{
 await page.setViewportSize({width:375,height:812})
 const db=server(),writes=await prepare(page,db,'viewer')
 await expect(region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true})).toHaveCount(0)
 const button=stock(page).getByRole('button',{name:/^Prateleira NORTE —/})
 await button.focus();await page.keyboard.press('Enter')
 await expect(stock(page).getByRole('region',{name:'Detalhes da prateleira',exact:true})).toContainText('Saldo completo: 3 caixas')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 expect(writes).toEqual([]);expect(db.commits).toBe(0)
})
test('resposta com identidade da apresentação é rejeitada no mapa operacional',async({page})=>{
 const db=server();db.invalid=true;await prepare(page,db)
 await expect(region(page).getByRole('alert')).toBeVisible()
 await expect(stock(page)).toHaveCount(0)
 await expect(region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true})).toBeDisabled()
})
