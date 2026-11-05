import{test,expect}from'@playwright/test'
import{readFileSync}from'node:fs'
import{prepareKeyboardPage}from'./helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const samples=JSON.parse(readFileSync(new URL('../fixtures/presentation-counts.json',import.meta.url),'utf8'))
const actor='11111111-1111-4111-8111-111111111111'
const queue=page=>page.getByRole('region',{name:'Pendências das contagens compartilhadas',exact:true})
function review(count,decision){return{id:crypto.randomUUID(),request_id:crypto.randomUUID(),count_id:count.id,reviewer_id:actor,reviewer_name:'Revisor',decision,note:'Decisão registrada no roteiro.',submission_snapshot:count.submission,reviewed_at:'2026-11-02T16:05:00Z'}}
function database(){
 const counts=samples.map(submission=>({id:crypto.randomUUID(),actor_id:actor,actor_name:'Conferente',source_id:submission.source_id,scenario_key:base.scenario_key,scenario_revision:1,location:submission.location,submission:structuredClone(submission),state:'awaiting_review',created_at:'2026-11-02T16:00:00Z'}))
 return{counts,reviews:[review(counts[0],'recount_requested'),review(counts[1],'approved')],links:[] as any[],fail:false}
}
async function prepare(page,db,role='administrator'){
 const writes=await prepareKeyboardPage(page)
 await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
 await page.route('**/rest/v1/presentation_shelf_counts*',route=>db.fail?route.fulfill({status:403,json:{message:'Consulta indisponível'}}):route.fulfill({json:db.counts}))
 await page.route('**/rest/v1/presentation_count_reviews*',route=>route.fulfill({json:db.reviews}))
 await page.route('**/rest/v1/presentation_recount_links*',route=>route.fulfill({json:db.links}))
 if(role!=='administrator'){
  await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,role,display_name:'Consulta'}}))
  await page.reload()
 }
 await page.getByRole('combobox',{name:'Visualização do Painel',exact:true}).selectOption('presentation')
 await expect(queue(page)).toBeVisible()
 return writes
}
test('fila prioriza a data da pendência e usa a data da decisão para recontagem',async({page})=>{
 const db=database()
 db.counts[2].created_at='2026-11-02T16:10:00Z'
 const writes=await prepareKeyboardPage(page)
 await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
 await page.route('**/rest/v1/presentation_shelf_counts*',route=>route.fulfill({json:db.counts}))
 await page.route('**/rest/v1/presentation_count_reviews*',route=>route.fulfill({json:db.reviews}))
 await page.route('**/rest/v1/presentation_recount_links*',route=>route.fulfill({json:db.links}))
 const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true})
 if(await close.isVisible())await close.click()
 await page.locator('.dashboard-quicknav summary').click()
 await page.getByLabel('Visualização do Painel').selectOption('presentation')
 const items=queue(page).getByRole('listitem')
 await expect(items.first()).toContainText('NORTE — Recontagem por iniciar')
 await expect(items.first().locator('time')).toHaveAttribute('datetime',db.reviews[0].reviewed_at)
 await expect(items.last()).toContainText('OESTE — Aguardando revisão')
 await expect(items.last().locator('time')).toHaveAttribute('datetime',db.counts[2].created_at)
 expect(writes).toEqual([])
})
test('fila separa revisão de recontagem e abre a evidência correspondente sem escrita',async({page})=>{
 const db=database(),writes=await prepare(page,db)
 await expect(queue(page)).toContainText('1 envios aguardando revisão · 1 recontagens por iniciar')
 await expect(queue(page).getByRole('listitem')).toHaveCount(2)
 await expect(queue(page)).not.toContainText('SUL')
 await queue(page).getByRole('button',{name:'Abrir contagem para revisão de OESTE',exact:true}).click()
 await expect(page.locator(`#presentation-count-${db.counts[2].id}>details`)).toHaveAttribute('open','')
 await queue(page).getByRole('button',{name:'Abrir solicitação de recontagem de NORTE',exact:true}).click()
 await expect(page.locator(`#presentation-count-${db.counts[0].id}>details`)).toHaveAttribute('open','')
 expect(writes).toEqual([])
})
test('recontagem enviada retira solicitação atendida e mantém nova revisão; falha sinaliza fila anterior',async({page})=>{
 const db=database(),writes=await prepare(page,db),parent=db.counts[0]
 const source=crypto.randomUUID(),child={...structuredClone(parent),id:crypto.randomUUID(),source_id:source,created_at:'2026-11-02T16:15:00Z',submission:{...structuredClone(parent.submission),source_id:source,recount_of:parent.id}}
 db.counts.push(child)
 db.links.push({parent_count_id:parent.id,child_count_id:child.id,parent_review_id:db.reviews[0].id,created_by:actor,created_at:child.created_at})
 const refresh=page.getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true})
 await refresh.click()
 await expect(queue(page)).toContainText('2 envios aguardando revisão · 0 recontagens por iniciar')
 await expect(queue(page).getByRole('button',{name:'Abrir solicitação de recontagem de NORTE',exact:true})).toHaveCount(0)
 await expect(refresh).toBeFocused()
 db.fail=true;await refresh.click()
 await expect(queue(page)).toContainText('Pendências da consulta anterior')
 await expect(queue(page).getByRole('listitem')).toHaveCount(2)
 expect(writes).toEqual([])
})
test('Consulta no celular navega por teclado sem ações de revisão',async({page})=>{
 await page.setViewportSize({width:375,height:812})
 const db=database(),writes=await prepare(page,db,'viewer')
 await expect(queue(page).getByRole('button',{name:/^Abrir contagem para revisão/})).toHaveCount(0)
 const consult=queue(page).getByRole('button',{name:'Consultar pendência de OESTE',exact:true})
 await consult.focus();await page.keyboard.press('Enter')
 await expect(page.locator(`#presentation-count-${db.counts[2].id}>details>summary`)).toBeFocused()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 expect(writes).toEqual([])
})
test('registros aprovados não geram pendência nem conclusão indevida do histórico',async({page})=>{
 const db=database();db.reviews=db.counts.map(count=>review(count,'approved'))
 const writes=await prepare(page,db)
 await expect(queue(page)).toContainText('0 envios aguardando revisão · 0 recontagens por iniciar')
 await expect(queue(page)).toContainText('Isso não confirma a conclusão do histórico completo')
 await expect(queue(page).getByRole('button')).toHaveCount(0)
 expect(writes).toEqual([])
})
