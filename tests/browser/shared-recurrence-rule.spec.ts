import{test,expect,type Page}from'@playwright/test'
import AxeBuilder from'@axe-core/playwright'
import{prepareRedesign}from'./helpers/redesign'
const actor='11111111-1111-4111-8111-111111111111'
function database(){return{head:{scenario_key:'liber-presentation-v1',revision:1,occurrences:3,days:30,updated_at:'2026-11-02T12:00:00Z'},requests:[] as any[],receipts:new Map<string,any>(),lose:false,fail:false}}
async function prepare(page:Page,db:ReturnType<typeof database>,theme:'light'|'dark'='light',viewer=false){
 const state=await prepareRedesign(page,theme)
 if(viewer){await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,role:'viewer',display_name:'Consulta'}}));await page.reload();await expect(page.locator('.dashboard-stock-totals')).toBeVisible()}
 await page.route('**/rest/v1/presentation_recurrence_rules*',route=>db.fail?route.fulfill({status:403,json:{message:'Indisponível'}}):route.fulfill({json:db.head}))
 await page.route('**/rest/v1/rpc/save_presentation_recurrence_rule',route=>{
  const input=route.request().postDataJSON();db.requests.push(input)
  if(db.receipts.has(input.p_request_id))return route.fulfill({json:db.receipts.get(input.p_request_id)})
  if(input.p_expected_revision!==db.head.revision)return route.fulfill({status:409,json:{code:'40001',message:'Conflito'}})
  db.head={...db.head,revision:db.head.revision+1,occurrences:input.p_occurrences,days:input.p_days,updated_at:new Date().toISOString()};db.receipts.set(input.p_request_id,structuredClone(db.head))
  if(db.lose){db.lose=false;return route.fulfill({json:null})}return route.fulfill({json:db.head})
 })
 await page.route('**/rest/v1/presentation_shelf_counts*',route=>route.fulfill({json:[]}))
 await page.route('**/rest/v1/presentation_count_reviews*',route=>route.fulfill({json:[]}))
 await page.locator('.dashboard-quicknav>summary').click();await page.getByRole('combobox',{name:/^Visualização do Painel/}).selectOption('presentation')
 const region=page.locator('.shared-recurrence')
 if(db.fail)await expect(region.getByRole('alert')).toContainText('Não foi possível atualizar a regra compartilhada.');else await expect(region).toContainText('Regra compartilhada · versão 1')
 return{...state,region}
}
async function edit(page:Page){await page.getByRole('button',{name:'Editar regra compartilhada',exact:true}).click();return page.getByRole('form',{name:'Editar regra compartilhada de recorrência'})}
test('22: dois aparelhos recebem a regra compartilhada, sem importar a cópia local',async({browser})=>{
 const db=database(),contexts=await Promise.all([browser.newContext(),browser.newContext()])
 try{
  const pages=await Promise.all(contexts.map(context=>context.newPage()))
  await pages[0].addInitScript(id=>localStorage.setItem(`liber:recurrence-rule:v1:presentation:${id}`,JSON.stringify({version:1,userId:`presentation:${id}`,rule:{occurrences:9,days:90}})),actor)
  await prepare(pages[0],db);await prepare(pages[1],db)
  const form=await edit(pages[0]);await form.getByLabel('Mínimo compartilhado de conferências').fill('4');await form.getByRole('button',{name:'Salvar regra entre aparelhos',exact:true}).click()
  await expect(pages[0].locator('.shared-recurrence')).toContainText('mínimo 4 conferências em 30 dias')
  await pages[1].evaluate(()=>window.dispatchEvent(new Event('liber:inventory-change')))
  await expect(pages[1].locator('.shared-recurrence')).toContainText('mínimo 4 conferências em 30 dias')
  await pages[0].getByRole('combobox',{name:/^Origem da regra de recorrência/}).selectOption('local')
  await expect(pages[0].locator('.shared-recurrence')).toContainText('mínimo 9 conferências em 90 dias')
  expect(db.requests).toHaveLength(1)
 }finally{await Promise.all(contexts.map(context=>context.close()))}
})
test('22: confirmação perdida é recuperada com o mesmo identificador e sem duplicar versão',async({page})=>{
 const db=database(),state=await prepare(page,db);db.lose=true
 const form=await edit(page);await form.getByLabel('Período compartilhado (dias corridos)').fill('45');await form.getByRole('button',{name:'Salvar regra entre aparelhos',exact:true}).click()
 await expect(form.getByRole('alert')).toContainText('tente novamente')
 await expect(form.getByLabel('Período compartilhado (dias corridos)')).toHaveValue('45')
 await form.getByRole('button',{name:'Salvar regra entre aparelhos',exact:true}).click()
 await expect(state.region).toContainText('Regra compartilhada · versão 2')
 expect(db.requests[0].p_request_id).toBe(db.requests[1].p_request_id);expect(db.head.revision).toBe(2);expect(state.writes).toEqual([])
})
test('22: conflito mantém preenchimento e exige revisão da versão atual',async({page})=>{
 const db=database(),state=await prepare(page,db),form=await edit(page)
 await form.getByLabel('Mínimo compartilhado de conferências').fill('7');db.head={...db.head,revision:2,occurrences:5}
 await form.getByRole('button',{name:'Salvar regra entre aparelhos',exact:true}).click()
 await expect(form.getByRole('alert')).toContainText('mudou em outro aparelho');await expect(form.getByLabel('Mínimo compartilhado de conferências')).toHaveValue('7')
 await form.getByRole('button',{name:'Fechar edição da regra',exact:true}).click();await expect(state.region).toContainText('mínimo 5 conferências')
 const fresh=await edit(page);await expect(fresh.getByLabel('Mínimo compartilhado de conferências')).toHaveValue('5')
 expect(state.writes).toEqual([])
})
test('22: indisponibilidade preserva regra anterior e bloqueia edição até recuperar',async({page})=>{
 const db=database(),state=await prepare(page,db);db.fail=true
 await page.getByRole('button',{name:'Atualizar regra compartilhada',exact:true}).click()
 await expect(state.region.getByRole('alert')).toContainText('última regra consultada foi preservada')
 await expect(page.getByRole('button',{name:'Editar regra compartilhada',exact:true})).toBeDisabled()
 await expect(state.region).toContainText('mínimo 3 conferências em 30 dias')
 db.fail=false;await page.getByRole('button',{name:'Atualizar regra compartilhada',exact:true}).click();await expect(state.region.getByRole('alert')).toHaveCount(0)
 expect(db.requests).toHaveLength(0);expect(state.writes).toEqual([])
})
for(const theme of ['light','dark'] as const)test(`22 ${theme}: Consulta no celular sem edição e com acesso à cópia anterior`,async({page})=>{
 await page.setViewportSize({width:375,height:812});const db=database(),state=await prepare(page,db,theme,true)
 await expect(state.region.getByRole('button',{name:'Editar regra compartilhada',exact:true})).toHaveCount(0)
 expect((await new AxeBuilder({page}).include('.shared-recurrence').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await state.region.screenshot({path:`docs/design/regra-compartilhada-${theme}-mobile.png`})
 expect(db.requests).toHaveLength(0);expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})

test('22: primeira leitura indisponível não assume regra local e permite recuperar',async({page})=>{
 const db=database();db.fail=true
 await page.addInitScript(id=>localStorage.setItem(`liber:recurrence-rule:v1:presentation:${id}`,JSON.stringify({version:1,userId:`presentation:${id}`,rule:{occurrences:8,days:80}})),actor)
 const state=await prepare(page,db)
 await expect(state.region).not.toContainText('mínimo 8 conferências')
 await expect(state.region.getByRole('button',{name:'Editar regra compartilhada',exact:true})).toBeDisabled()
 db.fail=false;await state.region.getByRole('button',{name:'Atualizar regra compartilhada',exact:true}).click()
 await expect(state.region).toContainText('mínimo 3 conferências em 30 dias')
 expect(db.requests).toHaveLength(0);expect(state.writes).toEqual([])
})
test('22: recuperar confirmação antiga consulta a regra mais nova sem restaurar valores',async({page})=>{
 const db=database(),state=await prepare(page,db);db.lose=true
 const form=await edit(page);await form.getByLabel('Mínimo compartilhado de conferências').fill('4');await form.getByRole('button',{name:'Salvar regra entre aparelhos',exact:true}).click()
 await expect(form.getByRole('alert')).toBeVisible()
 db.head={...db.head,revision:3,occurrences:7}
 await form.getByRole('button',{name:'Salvar regra entre aparelhos',exact:true}).click()
 await expect(state.region).toContainText('Regra compartilhada · versão 3');await expect(state.region).toContainText('mínimo 7 conferências')
 expect(db.head.revision).toBe(3);expect(db.requests[0].p_request_id).toBe(db.requests[1].p_request_id)
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
