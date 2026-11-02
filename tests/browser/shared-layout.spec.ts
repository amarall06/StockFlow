import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import {prepareKeyboardPage} from './helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const region=page=>page.getByRole('region',{name:'Sincronização da planta e capacidades',exact:true})
const north=page=>page.getByRole('article',{name:'Prateleira NORTE',exact:true})
const shelf=page=>page.getByRole('region',{name:'Mapa de prateleiras',exact:true}).getByRole('button',{name:/^Prateleira NORTE —/})
function server(){return {head:{scenario_key:base.scenario_key,revision:1,layout:structuredClone(base.payload.floorPlan),capacities:structuredClone(base.payload.capacities),updated_at:base.published_at,updated_by:null},reads:0,commits:0,calls:[] as any[],receipts:new Map(),failRead:false,invalid:false,loseOnce:false}}
async function prepare(page,db){
  const writes=await prepareKeyboardPage(page)
  const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
  await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
  await page.route('**/rest/v1/presentation_layouts*',route=>{
    db.reads++
    return db.failRead?route.fulfill({status:403,json:{message:'Sem conexão'}}):route.fulfill({json:db.invalid?{...db.head,revision:0}:db.head})
  })
  await page.route('**/rest/v1/rpc/save_presentation_layout',route=>{
    const input=route.request().postDataJSON();db.calls.push(input)
    const saved=db.receipts.get(input.p_request_id)
    if(saved)return route.fulfill({json:saved})
    if(input.p_expected_revision!==db.head.revision)return route.fulfill({status:409,json:{code:'40001',message:'Versão antiga'}})
    db.commits++;db.head={...db.head,revision:db.head.revision+1,layout:input.p_layout,capacities:input.p_capacities,updated_at:'2026-11-02T15:00:00Z',updated_by:'11111111-1111-4111-8111-111111111111'}
    db.receipts.set(input.p_request_id,structuredClone(db.head))
    if(db.loseOnce){db.loseOnce=false;return route.fulfill({status:400,json:{code:'08006',message:'Confirmação perdida'}})}
    return route.fulfill({json:db.head})
  })
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  return writes
}
async function openEditor(page){await expect(region(page)).toContainText('Versão compartilhada');await region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true}).click();return region(page).getByRole('form',{name:'Editar configuração compartilhada'})}
test('dois navegadores recebem a mesma planta e capacidade após salvar e retomar foco',async({page,browser})=>{
  const db=server(),context=await browser.newContext({baseURL:test.info().project.use.baseURL}),other=await context.newPage()
  try{
    const writes=await prepare(page,db),otherWrites=await prepare(other,db)
    await expect(north(other)).toContainText('Capacidade: 40 caixas')
    const form=await openEditor(page)
    await form.getByLabel('Coluna compartilhada',{exact:true}).fill('20')
    await form.getByLabel('Capacidade compartilhada (caixas)').fill('55')
    await form.getByRole('button',{name:'Salvar planta e capacidades no Supabase'}).click()
    await expect(region(page)).toContainText('Gravação confirmada no Supabase, versão 2')
    await other.evaluate(()=>window.dispatchEvent(new Event('focus')))
    await expect(region(other)).toContainText('Versão compartilhada 2')
    await expect(north(other)).toContainText('Capacidade: 55 caixas')
    await expect(shelf(other)).toHaveCSS('left','400px')
    expect(db.commits).toBe(1);expect(writes).toEqual([]);expect(otherWrites).toEqual([])
  }finally{await context.close()}
})
test('edição congelada mantém preenchimento ao receber versão de outro aparelho e não sobrescreve',async({page})=>{
  const db=server();await prepare(page,db)
  const form=await openEditor(page);await form.getByLabel('Capacidade compartilhada (caixas)').fill('66')
  db.head={...db.head,revision:2,capacities:{...db.head.capacities,NORTE:{boxes:55,basis:'Caixa padrão'}}}
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
  await expect(region(page)).toContainText('Versão compartilhada 2')
  await expect(form.getByLabel('Capacidade compartilhada (caixas)')).toHaveValue('66')
  await form.getByRole('button',{name:'Salvar planta e capacidades no Supabase'}).click()
  await expect(form.getByRole('alert')).toContainText('mudou em outro aparelho')
  await expect(form.getByLabel('Capacidade compartilhada (caixas)')).toHaveValue('66')
  expect(db.head.capacities.NORTE.boxes).toBe(55);expect(db.commits).toBe(0)
})
test('confirmação perdida é recuperada com a mesma identidade sem nova alteração',async({page})=>{
  const db=server();db.loseOnce=true;await prepare(page,db)
  const form=await openEditor(page);await form.getByLabel('Capacidade compartilhada (caixas)').fill('55')
  await form.getByRole('button',{name:'Salvar planta e capacidades no Supabase'}).click()
  await expect(form.getByRole('alert')).toContainText('Não foi possível confirmar')
  await form.getByRole('button',{name:'Salvar planta e capacidades no Supabase'}).click()
  await expect(region(page)).toContainText('Gravação confirmada no Supabase, versão 2')
  expect(db.calls).toHaveLength(2);expect(db.calls[0].p_request_id).toBe(db.calls[1].p_request_id);expect(db.commits).toBe(1)
})
test('cópias locais permanecem independentes e falha de consulta mantém última versão compartilhada',async({page})=>{
  const db=server(),userId='presentation:11111111-1111-4111-8111-111111111111'
  const capacity={version:1,userId,entries:{NORTE:{boxes:66,basis:'Caixa padrão'}}}
  const plan={version:1,userId,layout:{...base.payload.floorPlan,NORTE:{...base.payload.floorPlan.NORTE,x:21}}}
  await page.addInitScript(({capacity,plan,userId})=>{localStorage.setItem(`liber:shelf-capacity:v1:demo:${userId}`,JSON.stringify(capacity));localStorage.setItem(`liber:floor-plan:v1:${userId}`,JSON.stringify(plan))},{capacity,plan,userId})
  await prepare(page,db);await expect(north(page)).toContainText('Capacidade: 40 caixas')
  await region(page).getByLabel('Configuração exibida').selectOption('local')
  await expect(north(page)).toContainText('Capacidade: 66 caixas');await expect(shelf(page)).toHaveCSS('left','420px')
  await region(page).getByLabel('Configuração exibida').selectOption('shared')
  await expect(north(page)).toContainText('Capacidade: 40 caixas')
  db.failRead=true;await region(page).getByRole('button',{name:'Atualizar planta e capacidades'}).click()
  await expect(region(page).getByRole('alert')).toContainText('última versão consultada foi mantida')
  await expect(region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true})).toBeDisabled()
  await expect(north(page)).toContainText('Capacidade: 40 caixas')
  expect(await page.evaluate(userId=>JSON.parse(localStorage.getItem(`liber:shelf-capacity:v1:demo:${userId}`)!),userId)).toEqual(capacity)
})
test('configuração inválida não habilita edição e pode recuperar consulta válida',async({page})=>{
  const db=server();db.invalid=true;await prepare(page,db)
  await expect(region(page).getByRole('alert')).toBeVisible()
  await expect(region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true})).toBeDisabled()
  db.invalid=false;await region(page).getByRole('button',{name:'Atualizar planta e capacidades'}).click()
  await expect(region(page)).toContainText('Versão compartilhada 1')
  await expect(region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true})).toBeEnabled()
})
test('Consulta ativa acompanha configuração sem formulário de gravação',async({page})=>{
  const db=server();await prepare(page,db)
  await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,display_name:'Consulta',role:'viewer'}}))
  await page.reload();await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await expect(region(page)).toContainText('Versão compartilhada 1')
  await expect(region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true})).toHaveCount(0)
  expect(db.calls).toEqual([])
})
test('consulta automática atualiza em dez segundos e para ao sair do painel',async({page})=>{
  await page.clock.install();const db=server();await prepare(page,db)
  await expect(region(page)).toContainText('Versão compartilhada 1')
  db.head={...db.head,revision:2,capacities:{...db.head.capacities,NORTE:{boxes:77,basis:'Caixa padrão'}}}
  await page.clock.runFor(10100)
  await expect(north(page)).toContainText('Capacidade: 77 caixas')
  await page.getByLabel('Visualização do Painel').selectOption('stock')
  const reads=db.reads;await page.clock.runFor(10100);expect(db.reads).toBe(reads)
})
for(const theme of ['light','dark'])test(`novo editor compartilhado em 375 px com teclado e auditoria A/AA ${theme}`,async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.addInitScript(value=>localStorage.setItem('liber-automotive-theme',value),theme)
  const db=server();await prepare(page,db);const form=await openEditor(page)
  await form.getByLabel('Coluna compartilhada',{exact:true}).focus();await page.keyboard.press('Tab')
  await expect(form.getByLabel('Linha compartilhada',{exact:true})).toBeFocused()
  const audit=await new AxeBuilder({page}).include('.shared-shelf-layout').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(audit.violations).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
test('identidade dos painéis permanece única ao alternar configuração compartilhada e local',async({page})=>{
  const duplicateWarnings:string[]=[]
  page.on('console',message=>{if(/same key|unique.*key/i.test(message.text()))duplicateWarnings.push(message.text())})
  const db=server();await prepare(page,db)
  await expect(region(page)).toContainText('Versão compartilhada 1')
  await region(page).getByLabel('Configuração exibida').selectOption('local')
  await region(page).getByLabel('Configuração exibida').selectOption('shared')
  await expect(page.getByRole('region',{name:'Modo missão',exact:true})).toHaveCount(1)
  await expect(page.getByRole('region',{name:'Mapa de prateleiras',exact:true})).toHaveCount(1)
  expect(duplicateWarnings).toEqual([])
})
