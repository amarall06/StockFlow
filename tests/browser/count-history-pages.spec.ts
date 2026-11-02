import{test,expect}from'@playwright/test'
import{readFileSync}from'node:fs'
import{prepareKeyboardPage}from'./helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const sample=JSON.parse(readFileSync(new URL('../fixtures/presentation-counts.json',import.meta.url),'utf8'))[1]
const actor='11111111-1111-4111-8111-111111111111'
const region=page=>page.getByRole('region',{name:'Contagens compartilhadas',exact:true})
const items=page=>region(page).locator(':scope > ul > li')
const older=page=>region(page).getByRole('button',{name:'Carregar mais 50 envios anteriores',exact:true})
const ids=url=>(url.searchParams.get('count_id')??url.searchParams.get('parent_count_id')??url.searchParams.get('child_count_id')??'').slice(4,-1).split(',').filter(Boolean)
function database(){
 const counts=Array.from({length:61},(_,index)=>{
  const id=`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,submission={...structuredClone(sample),source_id:crypto.randomUUID()}
  return{id,actor_id:actor,actor_name:'Conferente',source_id:submission.source_id,scenario_key:base.scenario_key,scenario_revision:1,location:'SUL',submission,state:'awaiting_review',created_at:'2026-11-02T16:00:00.123456+00:00'}
 }).reverse()
 const reviews=counts.slice(-3).map(count=>({id:crypto.randomUUID(),request_id:crypto.randomUUID(),count_id:count.id,reviewer_id:actor,reviewer_name:'Revisor do histórico',decision:'approved',note:'Revisão de exemplo registrada.',submission_snapshot:count.submission,reviewed_at:'2026-11-02T16:05:00Z'}))
 return{counts,reviews,cursors:[] as string[],batches:[] as number[],fail:false,duplicate:false,delay:null as Promise<void>|null}
}
async function prepare(page,db,role='administrator'){
 const writes=await prepareKeyboardPage(page)
 await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
 await page.route('**/rest/v1/presentation_shelf_counts*',async route=>{
  const url=new URL(route.request().url()),cursor=url.searchParams.get('or'),limit=Number(url.searchParams.get('limit'))
  if(cursor){db.cursors.push(cursor);if(db.fail)return route.fulfill({status:403,json:{message:'Sem consulta'}});if(db.delay)await db.delay}
  const before=cursor?.match(/id\.lt\.([\da-f-]+)/i)?.[1]
  return route.fulfill({json:db.counts.filter(count=>!before||db.duplicate||count.id<before).slice(0,limit)})
 })
 await page.route('**/rest/v1/presentation_count_reviews*',route=>{
  const wanted=ids(new URL(route.request().url()));db.batches.push(wanted.length)
  return route.fulfill({json:db.reviews.filter(review=>wanted.includes(review.count_id))})
 })
 await page.route('**/rest/v1/presentation_recount_links*',route=>{db.batches.push(ids(new URL(route.request().url())).length);return route.fulfill({json:[]})})
 if(role!=='administrator'){await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,role,display_name:'Consulta'}}));await page.reload()}
 await page.getByRole('combobox',{name:'Visualização do Painel',exact:true}).selectOption('presentation')
 await expect(items(page)).toHaveCount(50)
 return writes
}
test('histórico além de 50 usa desempate e microssegundos e alimenta mapa, fila e recorrência',async({page})=>{
 const db=database(),writes=await prepare(page,db)
 const pending=page.getByRole('region',{name:'Pendências das contagens compartilhadas',exact:true})
 await expect(pending).toContainText('50 envios aguardando revisão')
 await older(page).click()
 await expect(items(page)).toHaveCount(61)
 await expect(older(page)).toHaveCount(0)
 expect(new Set(await items(page).evaluateAll(elements=>elements.map(element=>element.id))).size).toBe(61)
 expect(db.cursors.some(value=>value.includes(db.counts[49].id)&&value.includes('16:00:00.123456+00:00'))).toBe(true)
 expect(db.batches.every(size=>size>0&&size<=50)).toBe(true)
 await expect(pending).toContainText('58 envios aguardando revisão')
 await expect(page.getByRole('region',{name:'Mapa das conferências compartilhadas',exact:true})).toContainText('Revisor do histórico')
 await expect(page.getByRole('region',{name:'Recorrência das conferências compartilhadas',exact:true})).toContainText('3 conferências com diferença')
 expect(writes).toEqual([])
})
test('falha na página antiga preserva os 50 registros e permite repetir a ampliação',async({page})=>{
 const db=database();await prepare(page,db)
 const first=page.locator(`#presentation-count-${db.counts[0].id}>details`)
 await first.locator('summary').first().click()
 db.fail=true;await older(page).click()
 await expect(region(page).getByRole('alert').filter({hasText:'Não foi possível atualizar as contagens compartilhadas'})).toBeVisible()
 await expect(items(page)).toHaveCount(50)
 await expect(first).toHaveAttribute('open','')
 await expect(older(page)).toBeEnabled()
 db.fail=false;await older(page).click()
 await expect(items(page)).toHaveCount(61)
 await expect(first).toHaveAttribute('open','')
})
test('resposta que repete a primeira página é rejeitada sem duplicar o histórico',async({page})=>{
 const db=database();await prepare(page,db)
 db.duplicate=true;await older(page).click()
 await expect(region(page).getByRole('alert').filter({hasText:'Não foi possível atualizar as contagens compartilhadas'})).toBeVisible()
 await expect(items(page)).toHaveCount(50)
 db.duplicate=false;await older(page).click()
 await expect(items(page)).toHaveCount(61)
})
test('Consulta em 375px amplia histórico pelo teclado sem escrita',async({page})=>{
 await page.setViewportSize({width:375,height:812})
 const db=database(),writes=await prepare(page,db,'viewer')
 await older(page).focus();await page.keyboard.press('Enter')
 await expect(items(page)).toHaveCount(61)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 expect(writes).toEqual([])
})
test('atualização periódica aguarda paginação em andamento em vez de reiniciá-la',async({page})=>{
 const db=database();await prepare(page,db);await page.clock.install()
 let release!:()=>void;db.delay=new Promise<void>(resolve=>{release=resolve})
 await older(page).click()
 await expect.poll(()=>db.cursors.length).toBe(1)
 await page.clock.fastForward(10000)
 expect(db.cursors).toHaveLength(1)
 db.delay=null;release()
 await expect(items(page)).toHaveCount(61)
})
