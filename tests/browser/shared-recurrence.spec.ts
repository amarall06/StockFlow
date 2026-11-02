import{test,expect}from'@playwright/test'
import{readFileSync}from'node:fs'
import{prepareKeyboardPage}from'./helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const sample=JSON.parse(readFileSync(new URL('../fixtures/presentation-counts.json',import.meta.url),'utf8'))[1]
const actor='11111111-1111-4111-8111-111111111111'
const region=page=>page.getByRole('region',{name:'Recorrência das conferências compartilhadas',exact:true})
function database(){
 const counts=Array.from({length:5},(_,i)=>{
  const source=crypto.randomUUID(),submission={...structuredClone(sample),source_id:source}
  if(i===4)submission.rows[0].counted=12
  return{id:crypto.randomUUID(),actor_id:actor,actor_name:'Conferente',source_id:source,scenario_key:base.scenario_key,scenario_revision:1,location:'SUL',submission,state:'awaiting_review',created_at:`2026-11-0${i+1}T01:00:00Z`}
 })
 const review=(i,decision='approved')=>({id:crypto.randomUUID(),request_id:crypto.randomUUID(),count_id:counts[i].id,reviewer_id:actor,reviewer_name:'Revisor',decision,note:'Revisão do roteiro compartilhado.',submission_snapshot:counts[i].submission,reviewed_at:'2026-11-06T12:00:00Z'})
 return{counts,review,reviews:[review(0),review(1),review(3,'recount_requested'),review(4)],fail:false}
}
async function prepare(page,db){
 await page.clock.install({time:new Date('2026-11-02T20:00:00Z')})
 await page.addInitScript(user=>localStorage.setItem(`liber:recurrence-rule:v1:presentation:${user}`,JSON.stringify({version:1,userId:`presentation:${user}`,rule:{occurrences:2,days:30}})),actor)
 const writes=await prepareKeyboardPage(page)
 await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
 await page.route('**/rest/v1/presentation_shelf_counts*',route=>db.fail?route.fulfill({status:403,json:{message:'Indisponível'}}):route.fulfill({json:db.counts}))
 await page.route('**/rest/v1/presentation_count_reviews*',route=>route.fulfill({json:db.reviews}))
 await page.getByRole('combobox',{name:'Visualização do Painel',exact:true}).selectOption('presentation')
 await expect(region(page)).toBeVisible()
 return writes
}
test('recorrência compartilhada usa só aprovações com diferença e abre evidência e mapa',async({page})=>{
 const db=database(),writes=await prepare(page,db)
 await expect(region(page)).toContainText('2 conferências com diferença')
 await expect(region(page)).toContainText('Soma das diferenças absolutas: 2 caixas')
 await region(page).getByText('Ver conferências de MGM-35 em SUL',{exact:true}).click()
 await expect(region(page).getByRole('button',{name:/^Abrir contagem /})).toHaveCount(2)
 await expect(region(page)).toContainText('31/10/2026')
 await region(page).getByRole('button',{name:`Abrir contagem ${db.counts[0].id}`,exact:true}).click()
 await expect(page.locator(`#presentation-count-${db.counts[0].id}>details`)).toHaveAttribute('open','')
 await region(page).getByRole('button',{name:'Ver SUL no mapa de recorrências',exact:true}).click()
 await expect(page.getByRole('region',{name:'Detalhes da prateleira',exact:true})).toContainText('Prateleira SUL — detalhes')
 expect(writes).toEqual([])
})
test('nova decisão recalcula recorrência; erro mantém evidência com aviso',async({page})=>{
 const db=database();db.reviews=db.reviews.filter(review=>review.count_id!==db.counts[1].id)
 const writes=await prepare(page,db)
 await expect(region(page)).toContainText('0 combinações com recorrência')
 db.reviews.push(db.review(1))
 await page.getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
 await expect(region(page)).toContainText('1 combinações com recorrência')
 db.fail=true
 await page.getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
 await expect(region(page)).toContainText('Resultados da consulta anterior')
 await expect(region(page)).toContainText('2 conferências com diferença')
 expect(writes).toEqual([])
})
test('Consulta no celular não edita regra e decisões pendentes não produzem recorrência',async({page})=>{
 await page.setViewportSize({width:375,height:812})
 const db=database();db.reviews=[]
 const writes=await prepare(page,db)
 await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,role:'viewer',display_name:'Consulta'}}))
 await page.reload()
 await page.getByRole('combobox',{name:'Visualização do Painel',exact:true}).selectOption('presentation')
 await expect(region(page)).toContainText('0 combinações com recorrência')
 await expect(region(page).getByRole('button',{name:'Salvar regra de recorrência local',exact:true})).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 expect(writes).toEqual([])
})
test('virada do dia preserva referência anterior em falha e avança na consulta confirmada',async({page})=>{
 const db=database();await prepare(page,db)
 await page.clock.setSystemTime(new Date('2026-11-02T02:59:00Z'))
 await page.getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
 await expect(region(page)).toContainText('Data de referência: 01/11/2026')
 await page.clock.setSystemTime(new Date('2026-11-02T03:01:00Z'))
 db.fail=true
 await page.getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
 await expect(region(page)).toContainText('Resultados da consulta anterior')
 await expect(region(page)).toContainText('Data de referência: 01/11/2026')
 db.fail=false
 await page.getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
 await expect(region(page)).toContainText('Data de referência: 02/11/2026')
})
