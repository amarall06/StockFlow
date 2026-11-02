import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import {prepareKeyboardPage} from './helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const samples=JSON.parse(readFileSync(new URL('../fixtures/presentation-counts.json',import.meta.url),'utf8'))
const actor='11111111-1111-4111-8111-111111111111',scope=`presentation:${actor}`
const region=page=>page.getByRole('region',{name:'Contagens compartilhadas',exact:true})
const card=(page,id)=>page.locator(`#presentation-count-${id}`)
const ids=url=>{const value=url.searchParams.get('count_id')??url.searchParams.get('parent_count_id')??url.searchParams.get('child_count_id');return value?.startsWith('in.(')?value.slice(4,-1).split(','):[]}
function review(count,decision){return {id:crypto.randomUUID(),request_id:crypto.randomUUID(),count_id:count.id,reviewer_id:actor,reviewer_name:'Administrador do roteiro',decision,note:'Decisão de exemplo para conferência.',submission_snapshot:count.submission,reviewed_at:'2026-11-02T16:05:00Z'}}
function database(){
  const counts=samples.map(submission=>({id:crypto.randomUUID(),actor_id:actor,actor_name:'Conta do roteiro',source_id:submission.source_id,scenario_key:base.scenario_key,scenario_revision:1,location:submission.location,submission:structuredClone(submission),state:'awaiting_review',created_at:'2026-11-02T16:00:00Z'}))
  return {counts,reviews:[review(counts[0],'recount_requested'),review(counts[1],'approved')],links:[] as any[],calls:[] as any[],lose:false,hideParent:false,detailReads:0}
}
function child(db,parent){
  const submission={...structuredClone(parent.submission),source_id:crypto.randomUUID(),recount_of:parent.id,rows:parent.submission.rows.map(row=>({...row,counted:row.expected}))}
  const count={...parent,id:crypto.randomUUID(),source_id:submission.source_id,submission,created_at:'2026-11-02T16:15:00Z'}
  db.counts.unshift(count);db.links.push({parent_count_id:parent.id,child_count_id:count.id,parent_review_id:db.reviews.find(review=>review.count_id===parent.id).id,created_by:actor,created_at:count.created_at});return count
}
async function prepare(page,db,role='administrator'){
  const writes=await prepareKeyboardPage(page)
  const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
  await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
  await page.route('**/rest/v1/presentation_shelf_counts*',route=>{
    const url=new URL(route.request().url()),id=url.searchParams.get('id')
    if(id){db.detailReads++;return route.fulfill({json:db.counts.find(count=>count.id===id.slice(3))})}
    return route.fulfill({json:db.counts.filter(count=>!db.hideParent||db.links.every(link=>link.parent_count_id!==count.id))})
  })
  await page.route('**/rest/v1/presentation_count_reviews*',route=>{const wanted=ids(new URL(route.request().url()));return route.fulfill({json:db.reviews.filter(review=>wanted.includes(review.count_id))})})
  await page.route('**/rest/v1/presentation_recount_links*',route=>{const url=new URL(route.request().url()),wanted=ids(url),field=url.searchParams.has('parent_count_id')?'parent_count_id':'child_count_id';return route.fulfill({json:db.links.filter(link=>wanted.includes(link[field]))})})
  await page.route('**/rest/v1/rpc/submit_presentation_shelf_count',route=>{
    const payload=route.request().postDataJSON().p_submission;db.calls.push(payload)
    const saved=db.counts.find(count=>count.source_id===payload.source_id)
    if(saved)return route.fulfill({json:saved})
    if(db.links.some(link=>link.parent_count_id===payload.recount_of))return route.fulfill({status:409,json:{code:'40001'}})
    const parent=db.counts.find(count=>count.id===payload.recount_of),count=child(db,parent);count.source_id=payload.source_id;count.submission=payload
    if(db.lose){db.lose=false;return route.fulfill({status:500,json:{code:'08006'}})}
    return route.fulfill({json:count})
  })
  if(role!=='administrator'){
    await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{role,is_active:true,display_name:'Consulta'}}))
    await page.reload();const notice=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await notice.isVisible())await notice.click()
  }
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await expect(region(page).locator(':scope > ul > li')).toHaveCount(db.hideParent?db.counts.length-1:db.counts.length)
  return writes
}
async function start(page,parent){
  await card(page,parent.id).locator('summary').first().click()
  await card(page,parent.id).getByRole('button',{name:'Iniciar recontagem de NORTE',exact:true}).click()
}
async function fill(page){
  await region(page).getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true}).fill('20')
  await region(page).getByLabel('Caixas contadas AGM-35 Liberado para venda',{exact:true}).fill('20')
  const form=region(page).getByRole('form',{name:'Enviar contagem compartilhada'})
  await form.getByLabel('Conferi os valores',{exact:false}).check();await form.getByRole('button',{name:'Enviar contagem para revisão',exact:true}).click();return form
}
test('nova recontagem começa em branco e histórico navega da origem para a filha e de volta',async({page,browser})=>{
  const db=database(),parent=db.counts[0],before=JSON.stringify(parent),context=await browser.newContext({baseURL:test.info().project.use.baseURL})
  try{
    const writes=await prepare(page,db),other=await context.newPage();await prepare(other,db,'viewer')
    await start(page,parent)
    await expect(region(page).getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true})).toHaveValue('')
    await expect(region(page).getByRole('form',{name:'Enviar contagem compartilhada'})).toContainText(parent.id)
    await fill(page);await expect(region(page)).toContainText('Envio confirmado:')
    await other.evaluate(()=>window.dispatchEvent(new Event('liber:inventory-change')))
    await expect(card(other,parent.id)).toContainText('Recontagem registrada:')
    await card(other,parent.id).locator('summary').first().click();await card(other,parent.id).getByRole('button',{name:'Ver recontagem',exact:true}).click()
    const id=db.links[0].child_count_id
    await expect(card(other,id).locator('summary').first()).toBeFocused()
    await card(other,id).getByRole('button',{name:'Ver contagem de origem',exact:true}).click()
    await expect(card(other,parent.id).locator('summary').first()).toBeFocused()
    expect(JSON.stringify(parent)).toBe(before);expect(db.links).toHaveLength(1);expect(writes).toEqual([])
  }finally{await context.close()}
})
test('rascunho existente é preservado e origens aprovadas ou pendentes não oferecem recontagem',async({page})=>{
  const db=database(),parent=db.counts[0]
  const draft={version:1,userId:scope,id:crypto.randomUUID(),location:'NORTE',consultedAt:samples[0].consulted_at,startedAt:samples[0].started_at,notes:'Rascunho que deve ser preservado',rows:samples[0].rows,reference:JSON.stringify(samples[0].rows.map(row=>({code:row.code,status:row.status,boxes:row.expected})))}
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:`liber:shelf-count:v1:${scope}`,value:JSON.stringify(draft)})
  await prepare(page,db);await start(page,parent);await expect(region(page)).toContainText('Já existe um rascunho')
  expect(await page.evaluate(key=>localStorage.getItem(key),`liber:shelf-count:v1:${scope}`)).toBe(JSON.stringify(draft))
  await card(page,db.counts[1].id).locator('summary').first().click();await expect(card(page,db.counts[1].id).getByRole('button',{name:/Iniciar recontagem/})).toHaveCount(0)
})
test('resposta perdida recupera vínculo único e origem persiste ao reabrir a apresentação',async({page})=>{
  const db=database(),parent=db.counts[0];db.lose=true;await prepare(page,db);await start(page,parent);const form=await fill(page)
  await expect(form.getByRole('alert')).toContainText('Não foi possível confirmar')
  await form.getByRole('button',{name:'Enviar contagem para revisão',exact:true}).click();await expect(region(page)).toContainText('Envio confirmado:')
  expect(db.calls[0].source_id).toBe(db.calls[1].source_id);expect(db.calls[1].recount_of).toBe(parent.id);expect(db.links).toHaveLength(1)
  await page.getByLabel('Visualização do Painel').selectOption('stock');await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await expect(region(page).getByRole('form',{name:'Enviar contagem compartilhada'})).toContainText(parent.id)
  await expect(region(page).getByRole('form',{name:'Enviar contagem compartilhada'})).toContainText('Envio já confirmado:')
})
test('solicitação já atendida em outro aparelho recusa novo envio e mantém o rascunho vinculado',async({page})=>{
  const db=database(),parent=db.counts[0];await prepare(page,db);await start(page,parent);child(db,parent)
  const form=await fill(page);await expect(form.getByRole('alert')).toContainText('solicitação de recontagem já foi atendida')
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),`liber:shelf-count:v1:${scope}`)
  expect(stored.recountOf).toBe(parent.id);expect(stored.rows[0].counted).toBe(20);expect(db.links).toHaveLength(1)
})
test('origem fora dos envios recentes é consultada pelo vínculo e recebe foco',async({page})=>{
  const db=database(),parent=db.counts[0],recount=child(db,parent);db.hideParent=true
  await prepare(page,db);await expect(card(page,parent.id)).toHaveCount(0)
  await card(page,recount.id).locator('summary').first().click();await card(page,recount.id).getByRole('button',{name:'Ver contagem de origem',exact:true}).click()
  await expect(card(page,parent.id).locator('summary').first()).toBeFocused();expect(db.detailReads).toBe(1)
})
test('nova solicitação sobre a filha cria a próxima recontagem sem reescrever a origem',async({page})=>{
  const db=database(),parent=db.counts[0],first=child(db,parent);db.reviews.push(review(first,'recount_requested'))
  await prepare(page,db);await start(page,first);await fill(page);await expect(region(page)).toContainText('Envio confirmado:')
  expect(db.links).toHaveLength(2);expect(db.links[1].parent_count_id).toBe(first.id);expect(db.links[0].parent_count_id).toBe(parent.id)
})
test('Consulta acompanha os vínculos sem iniciar ou enviar recontagens',async({page})=>{
  const db=database(),parent=db.counts[0],recount=child(db,parent);await prepare(page,db,'viewer')
  await card(page,recount.id).locator('summary').first().click();await expect(card(page,recount.id).getByRole('button',{name:'Ver contagem de origem',exact:true})).toBeVisible()
  await expect(region(page).getByRole('button',{name:/Iniciar recontagem/})).toHaveCount(0);expect(db.calls).toEqual([])
})
for(const dark of [false,true])test(`vínculos em 375px por teclado com contraste ${dark?'escuro':'claro'}`,async({page})=>{
  await page.setViewportSize({width:375,height:812});const db=database(),parent=db.counts[0],recount=child(db,parent);await prepare(page,db)
  if(dark)await page.evaluate(()=>document.querySelector('.app-shell')!.classList.add('theme-dark'))
  await card(page,recount.id).locator('summary').first().click();await card(page,recount.id).getByRole('button',{name:'Ver contagem de origem',exact:true}).focus();await page.keyboard.press('Enter')
  await expect(card(page,parent.id).locator('summary').first()).toBeFocused()
  expect(await region(page).evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
  const result=await new AxeBuilder({page}).include('.presentation-counts').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([])
})
test('item encontrado sem saldo na origem permanece obrigatório na recontagem',async({page})=>{
  const db=database(),parent=db.counts[0]
  parent.submission.rows.push({code:'MGM-35',status:'Em estoque',expected:0,counted:1})
  await prepare(page,db);await start(page,parent)
  const found=region(page).getByLabel('Caixas contadas MGM-35 Em estoque',{exact:true})
  await expect(found).toHaveValue('')
  await expect(region(page).getByRole('button',{name:'Enviar contagem para revisão',exact:true})).toBeDisabled()
  await found.fill('0');await fill(page);await expect(region(page)).toContainText('Envio confirmado:')
  expect(db.calls[0].rows.find(row=>row.code==='MGM-35').counted).toBe(0)
  expect(parent.submission.rows.find(row=>row.code==='MGM-35').counted).toBe(1)
})
