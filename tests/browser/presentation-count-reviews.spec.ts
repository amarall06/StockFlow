import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import {prepareKeyboardPage} from './helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const samples=JSON.parse(readFileSync(new URL('../fixtures/presentation-counts.json',import.meta.url),'utf8'))
const actor='11111111-1111-4111-8111-111111111111'
const region=page=>page.getByRole('region',{name:'Contagens compartilhadas',exact:true})
function database(){return {counts:samples.map(submission=>({id:crypto.randomUUID(),actor_id:actor,actor_name:'Pessoa do roteiro',source_id:submission.source_id,scenario_key:base.scenario_key,scenario_revision:1,location:submission.location,submission:structuredClone(submission),state:'awaiting_review',created_at:'2026-11-02T16:00:00Z'})),reviews:[] as any[],calls:[] as any[],lose:false,hide:false,invalid:false,delay:null as Promise<void>|null}}
async function prepare(page,db,options:{role?:string;freezeReviews?:boolean}={}){
  const writes=await prepareKeyboardPage(page)
  const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
  await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
  await page.route('**/rest/v1/presentation_shelf_counts*',route=>route.fulfill({json:db.counts}))
  await page.route('**/rest/v1/presentation_count_reviews*',route=>route.fulfill({json:db.invalid?[{id:'inválido'}]:db.hide||options.freezeReviews?[]:db.reviews}))
  await page.route('**/rest/v1/rpc/review_presentation_count',async route=>{
    const input=route.request().postDataJSON();db.calls.push(input)
    if(db.delay)await db.delay
    const previous=db.reviews.find(review=>review.request_id===input.p_request_id)
    if(previous)return route.fulfill({json:previous})
    if(db.reviews.some(review=>review.count_id===input.p_count_id))return route.fulfill({status:409,json:{code:'40001'}})
    const count=db.counts.find(count=>count.id===input.p_count_id)
    const receipt={id:crypto.randomUUID(),request_id:input.p_request_id,count_id:count.id,reviewer_id:actor,reviewer_name:'Administrador do roteiro',decision:input.p_decision,note:input.p_note,submission_snapshot:count.submission,reviewed_at:'2026-11-02T16:05:00Z'}
    db.reviews.push(receipt)
    if(db.lose){db.lose=false;return route.fulfill({status:500,json:{code:'08006'}})}
    return route.fulfill({json:receipt})
  })
  if(options.role&&options.role!=='administrator'){
    await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{role:options.role,is_active:true,display_name:'Pessoa da equipe'}}))
    await page.reload();const notice=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await notice.isVisible())await notice.click()
  }
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await expect(region(page).locator(':scope > ul > li')).toHaveCount(3)
  return writes
}
async function open(page,location='NORTE'){
  await region(page).locator(':scope > ul > li').filter({has:page.locator('summary').filter({hasText:new RegExp(`^${location} ·`)})}).locator('summary').first().click()
  await region(page).getByRole('button',{name:`Revisar contagem de ${location}`,exact:true}).click()
  return region(page).getByRole('form',{name:`Revisar contagem de ${location}`,exact:true})
}
async function confirm(form,note='Conferência aprovada na apresentação sem ajuste de saldo.'){
  await form.getByRole('textbox',{name:'Justificativa da revisão',exact:true}).fill(note)
  await form.getByLabel('Conferi os itens',{exact:false}).check()
  await form.getByRole('button',{name:'Confirmar revisão da contagem',exact:true}).click()
}
test('aprovação de exemplo aparece em outra sessão com autor e justificativa sem alterar envio ou saldo',async({page,browser})=>{
  const db=database(),before=JSON.stringify(db.counts),context=await browser.newContext({baseURL:test.info().project.use.baseURL})
  try{
    const writes=await prepare(page,db),other=await context.newPage();await prepare(other,db,{role:'viewer'})
    await confirm(await open(page))
    await expect(region(page)).toContainText('Revisão confirmada:')
    await other.evaluate(()=>window.dispatchEvent(new Event('liber:inventory-change')))
    await expect(region(other).locator('summary').filter({hasText:/^NORTE · Aprovada na apresentação/})).toBeVisible()
    await region(other).locator('summary').filter({hasText:/^NORTE · Aprovada na apresentação/}).click()
    await expect(region(other)).toContainText('Administrador do roteiro')
    await expect(region(other)).toContainText('Conferência aprovada na apresentação sem ajuste de saldo.')
    expect(JSON.stringify(db.counts)).toBe(before);expect(db.reviews).toHaveLength(1);expect(writes).toEqual([])
    await expect(page.getByRole('region',{name:'Indicadores do estoque'})).toContainText('85')
  }finally{await context.close()}
})
test('solicitação de recontagem exige justificativa e nova confirmação ao mudar a decisão',async({page})=>{
  const db=database();await prepare(page,db);const form=await open(page)
  await expect(form.getByRole('button',{name:'Confirmar revisão da contagem',exact:true})).toBeDisabled()
  await form.getByRole('textbox',{name:'Justificativa da revisão',exact:true}).fill('Conferir novamente a caixa que falta.')
  await form.getByLabel('Conferi os itens',{exact:false}).check()
  await form.getByRole('combobox',{name:'Decisão da revisão',exact:true}).selectOption('recount_requested')
  await expect(form.getByLabel('Conferi os itens',{exact:false})).not.toBeChecked()
  await form.getByLabel('Conferi os itens',{exact:false}).check();await form.getByRole('button',{name:'Confirmar revisão da contagem',exact:true}).click()
  await expect(region(page).locator('summary').filter({hasText:/^NORTE · Recontagem solicitada/})).toBeVisible()
  expect(db.reviews[0].decision).toBe('recount_requested');expect(db.counts[0].submission.rows[0].counted).toBe(19)
})
test('confirmação de revisão perdida é recuperada com o mesmo UUID e uma única decisão',async({page})=>{
  const db=database();db.lose=true;await prepare(page,db);const form=await open(page);await confirm(form)
  await expect(form.getByRole('alert')).toContainText('Não foi possível confirmar a revisão')
  await expect(form.getByRole('textbox',{name:'Justificativa da revisão',exact:true})).toHaveValue('Conferência aprovada na apresentação sem ajuste de saldo.')
  await form.getByRole('button',{name:'Confirmar revisão da contagem',exact:true}).click()
  await expect(region(page)).toContainText('Revisão confirmada:')
  expect(db.calls).toHaveLength(2);expect(db.calls[0].p_request_id).toBe(db.calls[1].p_request_id);expect(db.reviews).toHaveLength(1)
})
test('revisor desatualizado recebe conflito, preserva justificativa e consulta a decisão vencedora',async({page,browser})=>{
  const db=database(),context=await browser.newContext({baseURL:test.info().project.use.baseURL}),options={freezeReviews:true}
  try{
    await prepare(page,db);const other=await context.newPage();await prepare(other,db,options)
    const stale=await open(other);await stale.getByRole('combobox',{name:'Decisão da revisão',exact:true}).selectOption('recount_requested')
    await confirm(await open(page));await expect(region(page)).toContainText('Revisão confirmada:')
    await confirm(stale,'Minha justificativa de recontagem preservada.')
    await expect(stale.getByRole('alert')).toContainText('já foi revisada')
    await expect(stale.getByRole('textbox',{name:'Justificativa da revisão',exact:true})).toHaveValue('Minha justificativa de recontagem preservada.')
    options.freezeReviews=false;await region(other).getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
    await expect(stale.getByText('Outra revisão já foi registrada.',{exact:false})).toBeVisible()
    await expect(stale.getByRole('button',{name:'Confirmar revisão da contagem',exact:true})).toBeDisabled()
    expect(db.reviews).toHaveLength(1)
  }finally{await context.close()}
})
for(const role of ['viewer','stockkeeper'])test(`${role} consulta decisões mas não recebe controles de aprovação`,async({page})=>{
  const db=database();await prepare(page,db,{role})
  await region(page).locator('summary').filter({hasText:/^NORTE ·/}).click()
  await expect(region(page)).toContainText('Aguardando revisão pelo Administrador')
  await expect(region(page).getByRole('button',{name:/Revisar contagem de/})).toHaveCount(0);expect(db.calls).toEqual([])
})
test('revisão em envio bloqueia campos, fechamento e acionamento repetido',async({page})=>{
  const db=database();await prepare(page,db);const form=await open(page);let release:()=>void=()=>{};db.delay=new Promise<void>(resolve=>release=resolve)
  await confirm(form);await expect(form.getByRole('button',{name:'Confirmando revisão…',exact:true})).toBeDisabled()
  await expect(form.getByRole('button',{name:'Fechar revisão',exact:true})).toBeDisabled()
  await expect(form.getByRole('textbox',{name:'Justificativa da revisão',exact:true})).toBeDisabled()
  await form.evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
  expect(db.calls).toHaveLength(1);release();await expect(region(page)).toContainText('Revisão confirmada:');expect(db.reviews).toHaveLength(1)
})
test('leitura atrasada não apaga confirmação e revisão inválida conserva a última decisão',async({page})=>{
  const db=database();await prepare(page,db);await confirm(await open(page));await expect(region(page)).toContainText('Revisão confirmada:')
  db.hide=true;await region(page).getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
  await expect(region(page).locator('summary').filter({hasText:/^NORTE · Aprovada na apresentação/})).toBeVisible()
  db.hide=false;db.invalid=true;await region(page).getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
  await expect(region(page).getByRole('alert')).toContainText('Não foi possível atualizar')
  await expect(region(page).locator('summary').filter({hasText:/^NORTE · Aprovada na apresentação/})).toBeVisible()
})
for(const dark of [false,true])test(`revisão da contagem em 375px com teclado e contraste ${dark?'escuro':'claro'}`,async({page})=>{
  await page.setViewportSize({width:375,height:812});await prepare(page,database());const form=await open(page)
  if(dark)await page.evaluate(()=>document.querySelector('.app-shell')!.classList.add('theme-dark'))
  await form.getByRole('textbox',{name:'Justificativa da revisão',exact:true}).fill('Conferência por teclado sem ajustar saldo.')
  await form.getByLabel('Conferi os itens',{exact:false}).focus();await page.keyboard.press('Space');await page.keyboard.press('Tab')
  await expect(form.getByRole('button',{name:'Confirmar revisão da contagem',exact:true})).toBeFocused()
  expect(await region(page).evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
  const result=await new AxeBuilder({page}).include('.presentation-counts').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([])
})
