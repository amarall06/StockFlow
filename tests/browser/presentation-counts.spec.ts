import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import {prepareKeyboardPage} from './helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const actor='11111111-1111-4111-8111-111111111111',scope=`presentation:${actor}`
const region=page=>page.getByRole('region',{name:'Contagens compartilhadas',exact:true})
function server(){return {rows:[] as any[],calls:[] as any[],lose:false,fail:false,invalid:false,role:'administrator',reads:0,delay:null as null|Promise<void>}}
async function prepare(page,db){
  const writes=await prepareKeyboardPage(page)
  const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
  await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
  await page.route('**/rest/v1/presentation_shelf_counts*',route=>{db.reads++;return db.fail?route.fulfill({status:403,json:{message:'Consulta indisponível'}}):route.fulfill({json:db.invalid?[{}]:db.rows})})
  await page.route('**/rest/v1/rpc/submit_presentation_shelf_count',async route=>{
    const submission=route.request().postDataJSON().p_submission;db.calls.push(submission)
    if(db.delay)await db.delay
    const previous=db.rows.find(row=>row.source_id===submission.source_id)
    if(previous)return JSON.stringify(previous.submission)===JSON.stringify(submission)?route.fulfill({json:previous}):route.fulfill({status:409,json:{code:'40001'}})
    const saved={id:crypto.randomUUID(),actor_id:actor,actor_name:'Pessoa do roteiro',source_id:submission.source_id,scenario_key:base.scenario_key,scenario_revision:1,location:submission.location,submission,state:'awaiting_review',created_at:'2026-11-02T16:00:00Z'}
    db.rows.unshift(saved)
    if(db.lose){db.lose=false;return route.fulfill({status:500,json:{code:'08006'}})}
    return route.fulfill({json:saved})
  })
  if(db.role!=='administrator'){
    await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,role:db.role,display_name:'Consulta'}}))
    await page.reload();const notice=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await notice.isVisible())await notice.click()
  }
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await expect(region(page)).toBeVisible()
  await expect(page.getByRole('region',{name:'Cenário compartilhado',exact:true})).toContainText('Dados-base carregados')
  return writes
}
async function fill(page,location='NORTE'){
  await region(page).getByText('Conferência de prateleira — contagem local',{exact:true}).click()
  await region(page).getByRole('combobox',{name:'Prateleira para contar',exact:true}).selectOption(location)
  await region(page).getByRole('button',{name:'Iniciar contagem local',exact:true}).click()
  if(location==='NORTE'){
    await region(page).getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true}).fill('19')
    await region(page).getByLabel('Caixas contadas AGM-35 Liberado para venda',{exact:true}).fill('20')
  }
  return region(page).getByRole('form',{name:'Enviar contagem compartilhada'})
}
async function send(form){await form.getByLabel('Conferi os valores',{exact:false}).check();await form.getByRole('button',{name:'Enviar contagem para revisão',exact:true}).click()}
test('contagem enviada aparece em outro navegador sem transformar divergência em ajuste',async({page,browser})=>{
  const db=server(),context=await browser.newContext({baseURL:test.info().project.use.baseURL}),other=await context.newPage()
  try{
    const writes=await prepare(page,db);await prepare(other,db)
    const form=await fill(page);await send(form)
    await expect(region(page)).toContainText('Envio confirmado:')
    await other.evaluate(()=>window.dispatchEvent(new Event('liber:inventory-change')))
    await expect(region(other).getByRole('listitem').filter({hasText:'NORTE · Aguardando revisão'})).toHaveCount(1)
    await region(other).getByText(/NORTE · Aguardando revisão/).click()
    await expect(region(other)).toContainText('faltam 1 caixas')
    await expect(region(other)).toContainText('Pessoa do roteiro')
    expect(db.rows).toHaveLength(1);expect(writes).toEqual([])
    expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).rows[0].counted,`liber:shelf-count:v1:${scope}`)).toBe(19)
  }finally{await context.close()}
})
test('resposta perdida recupera a mesma contagem após reabrir sem duplicar envio',async({page})=>{
  const db=server();db.lose=true;await prepare(page,db);let form=await fill(page);await send(form)
  await expect(form.getByRole('alert')).toContainText('Não foi possível confirmar')
  // A consulta ainda não foi repetida: a tentativa usa a mesma identidade persistida.
  const source=db.calls[0].source_id
  await form.getByRole('button',{name:'Enviar contagem para revisão',exact:true}).click()
  await expect(region(page)).toContainText('Envio confirmado:');expect(db.calls[1].source_id).toBe(source);expect(db.rows).toHaveLength(1)
  await page.getByLabel('Visualização do Painel').selectOption('stock');await page.getByLabel('Visualização do Painel').selectOption('presentation')
  form=region(page).getByRole('form',{name:'Enviar contagem compartilhada'})
  await expect(form).toContainText('Envio já confirmado:');expect(db.rows).toHaveLength(1)
})
test('branco impede envio, alterações exigem nova confirmação e prateleira vazia pode ser declarada',async({page})=>{
  const db=server();await prepare(page,db);const form=await fill(page)
  await region(page).getByLabel('Caixas contadas AGM-35 Liberado para venda',{exact:true}).fill('')
  await expect(form.getByRole('button',{name:'Enviar contagem para revisão',exact:true})).toBeDisabled()
  await region(page).getByLabel('Caixas contadas AGM-35 Liberado para venda',{exact:true}).fill('20')
  await form.getByLabel('Conferi os valores',{exact:false}).check()
  await region(page).getByLabel('Observação da contagem',{exact:true}).fill('Nova observação')
  await expect(form.getByLabel('Conferi os valores',{exact:false})).not.toBeChecked()
  await send(form);await expect(region(page)).toContainText('Envio confirmado:')
  await region(page).getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true}).fill('18')
  await expect(form.getByRole('alert')).toContainText('já tem um envio com outros valores')
  expect(db.rows).toHaveLength(1)
})
test('envio de prateleira vazia e perfil Consulta com histórico sem controles operacionais',async({page,browser})=>{
  const db=server();await prepare(page,db);await send(await fill(page,'OESTE'));await expect(region(page)).toContainText('Envio confirmado:')
  expect(db.calls[0].rows).toEqual([])
  const context=await browser.newContext({baseURL:test.info().project.use.baseURL})
  try{const viewer=await context.newPage();db.role='viewer';await prepare(viewer,db);await expect(region(viewer)).toContainText('OESTE · Aguardando revisão');await expect(region(viewer).getByRole('button',{name:'Iniciar contagem local',exact:true})).toHaveCount(0)}finally{await context.close()}
})
test('falha ou resposta inválida mantém histórico e bloqueia envio; aviso não modifica rascunho',async({page})=>{
  const db=server();await prepare(page,db);const form=await fill(page)
  const before=await page.evaluate(key=>localStorage.getItem(key),`liber:shelf-count:v1:${scope}`)
  db.fail=true;await region(page).getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
  await expect(region(page).getByRole('alert')).toContainText('Não foi possível atualizar')
  await expect(form.getByRole('button',{name:'Enviar contagem para revisão',exact:true})).toBeDisabled()
  db.fail=false;db.invalid=true;await region(page).getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
  await expect(region(page).getByRole('alert')).toContainText('Não foi possível atualizar')
  expect(await page.evaluate(key=>localStorage.getItem(key),`liber:shelf-count:v1:${scope}`)).toBe(before)
  db.invalid=false;await page.evaluate(()=>window.dispatchEvent(new Event('liber:inventory-change')))
  await expect(region(page).getByRole('alert')).toHaveCount(0)
  await form.getByLabel('Conferi os valores',{exact:false}).check();await expect(form.getByRole('button',{name:'Enviar contagem para revisão',exact:true})).toBeEnabled()
})
test('envio pendente bloqueia edição e duplo acionamento até receber confirmação',async({page})=>{
  const db=server();await prepare(page,db);const form=await fill(page);let release:()=>void=()=>{};db.delay=new Promise<void>(resolve=>release=resolve)
  await send(form);await expect(region(page)).toContainText('Confirmando envio…')
  await expect(region(page).getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true})).toBeDisabled()
  await form.evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})
  expect(db.calls).toHaveLength(1);release();await expect(region(page)).toContainText('Envio confirmado:')
  await expect(region(page).getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true})).toBeEnabled()
})
for(const dark of [false,true])test(`contagens compartilhadas em 375px, teclado e contraste ${dark?'escuro':'claro'}`,async({page})=>{
  await page.setViewportSize({width:375,height:812});await prepare(page,server());const form=await fill(page)
  if(dark)await page.evaluate(()=>document.querySelector('.app-shell')!.classList.add('theme-dark'))
  await form.getByLabel('Conferi os valores',{exact:false}).focus();await page.keyboard.press('Space');await page.keyboard.press('Tab');await expect(form.getByRole('button',{name:'Enviar contagem para revisão',exact:true})).toBeFocused()
  expect(await region(page).evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
  const result=await new AxeBuilder({page}).include('.presentation-counts').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([])
})
