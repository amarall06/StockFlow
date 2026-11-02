import{test,expect}from'@playwright/test'
import{readFileSync}from'node:fs'
import{prepareKeyboardPage}from'./helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const samples=JSON.parse(readFileSync(new URL('../fixtures/presentation-counts.json',import.meta.url),'utf8'))
const actor='11111111-1111-4111-8111-111111111111'
const map=page=>page.getByRole('region',{name:'Mapa das conferências compartilhadas',exact:true})
const card=(page,location)=>map(page).getByRole('article',{name:`Conferências de ${location}`,exact:true})
function database(){
 const counts=samples.map(submission=>({id:crypto.randomUUID(),actor_id:actor,actor_name:'Conferente',source_id:submission.source_id,scenario_key:base.scenario_key,scenario_revision:1,location:submission.location,submission:structuredClone(submission),state:'awaiting_review',created_at:'2026-11-02T16:00:00Z'}))
 const review=(index,decision)=>({id:crypto.randomUUID(),request_id:crypto.randomUUID(),count_id:counts[index].id,reviewer_id:actor,reviewer_name:'Revisor',decision,note:'Decisão registrada no roteiro.',submission_snapshot:counts[index].submission,reviewed_at:'2026-11-02T16:05:00Z'})
 return {counts,reviews:[review(0,'recount_requested'),review(1,'approved')],fail:false}
}
async function prepare(page,db){
 const writes=await prepareKeyboardPage(page)
 await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
 await page.route('**/rest/v1/presentation_shelf_counts*',route=>db.fail?route.fulfill({status:403,json:{message:'Consulta indisponível'}}):route.fulfill({json:db.counts}))
 await page.route('**/rest/v1/presentation_count_reviews*',route=>route.fulfill({json:db.reviews}))
 await page.getByRole('combobox',{name:'Visualização do Painel',exact:true}).selectOption('presentation')
 await expect(map(page)).toBeVisible()
 return writes
}
test('mapa usa decisões compartilhadas, abre evidência e localiza a região sem escrita',async({page})=>{
 const db=database(),writes=await prepare(page,db)
 await expect(card(page,'NORTE')).toContainText('Recontagem solicitada')
 await expect(card(page,'SUL')).toContainText('Aprovada na apresentação')
 await expect(card(page,'SUL')).toContainText('sobram 1 caixas')
 await expect(card(page,'SUL')).toContainText('Revisor')
 await expect(card(page,'OESTE')).toContainText('Aguardando revisão')
 await expect(card(page,'LESTE')).toContainText('Sem envio nesta consulta')
 await card(page,'SUL').getByRole('button',{name:'Ver aprovação de SUL',exact:true}).click()
 await expect(page.locator(`#presentation-count-${db.counts[1].id}>details`)).toHaveAttribute('open','')
 await card(page,'SUL').getByRole('button',{name:'Localizar SUL na planta',exact:true}).click()
 await expect(page.getByRole('region',{name:'Detalhes da prateleira',exact:true})).toContainText('Prateleira SUL — detalhes')
 expect(writes).toEqual([])
})
test('envio posterior pendente não vira aprovado; falha conserva mapa sinalizado',async({page})=>{
 const db=database(),old=db.counts[1]
 db.counts.push({...structuredClone(old),id:crypto.randomUUID(),source_id:crypto.randomUUID(),created_at:'2026-11-02T17:00:00Z'})
 db.counts[3].submission.source_id=db.counts[3].source_id
 await prepare(page,db)
 await expect(card(page,'SUL')).toContainText('Último envio: Aguardando revisão')
 await expect(card(page,'SUL')).toContainText('Existe envio posterior')
 db.fail=true
 await page.getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
 await expect(map(page)).toContainText('Exibindo a consulta anterior')
 await expect(card(page,'SUL')).toContainText('Revisor')
 db.fail=false
 await page.getByRole('button',{name:'Atualizar contagens compartilhadas',exact:true}).click()
 await expect(map(page)).not.toContainText('Exibindo a consulta anterior')
})
test('sem envios mostra quatro regiões sem presumir aprovação; celular e teclado',async({page})=>{
 await page.setViewportSize({width:375,height:812})
 const db=database();db.counts=[];db.reviews=[]
 const writes=await prepare(page,db)
 await expect(map(page).getByRole('article')).toHaveCount(4)
 await expect(map(page).getByText('Sem aprovação nesta consulta.',{exact:true})).toHaveCount(4)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 const locate=card(page,'NORTE').getByRole('button',{name:'Localizar NORTE na planta',exact:true})
 await locate.focus();await page.keyboard.press('Enter')
 await expect(page.getByRole('region',{name:'Detalhes da prateleira',exact:true})).toContainText('Prateleira NORTE — detalhes')
 expect(writes).toEqual([])
})
