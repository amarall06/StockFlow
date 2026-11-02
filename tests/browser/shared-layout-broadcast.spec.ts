import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {prepareKeyboardPage} from './helpers/keyboard'
const base=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const region=page=>page.getByRole('region',{name:'Sincronização da planta e capacidades',exact:true})
async function prepare(page){
  await page.clock.install()
  const peers:any[]=[]
  await page.routeWebSocket('wss://stockflow-test.supabase.co/realtime/v1/websocket*',socket=>socket.onMessage(raw=>{
    const [join,ref,topic,event,payload]=JSON.parse(String(raw))
    if(event==='phx_join'){
      expect(payload.config.private).toBe(true);peers.push({socket,join,topic})
      socket.send(JSON.stringify([join,ref,topic,'phx_reply',{status:'ok',response:{}}]))
    }else if(event==='heartbeat'||event==='phx_leave')socket.send(JSON.stringify([join,ref,topic,'phx_reply',{status:'ok',response:{}}]))
  }))
  const writes=await prepareKeyboardPage(page)
  const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
  const db={reads:0,head:{scenario_key:base.scenario_key,revision:1,layout:base.payload.floorPlan,capacities:base.payload.capacities,updated_at:base.published_at,updated_by:null}}
  await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
  await page.route('**/rest/v1/presentation_layouts*',route=>{db.reads++;return route.fulfill({json:db.head})})
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await expect(region(page)).toContainText('Versão compartilhada 1')
  await page.clock.runFor(500)
  const emit=()=>peers.forEach(({socket,join,topic})=>socket.send(JSON.stringify([join,null,topic,'broadcast',{event:'inventory_changed',payload:{source:'database',id:'evento-de-teste',capacities:{NORTE:{boxes:999999}}},type:'broadcast'}])))
  return {db,writes,emit}
}
test('avisos privados agrupados atualizam a planta por consulta e conservam edição congelada',async({page})=>{
  const {db,writes,emit}=await prepare(page)
  await region(page).getByRole('button',{name:'Editar configuração compartilhada',exact:true}).click()
  const form=region(page).getByRole('form',{name:'Editar configuração compartilhada'})
  await form.getByLabel('Capacidade compartilhada (caixas)').fill('66')
  const before=db.reads
  db.head={...db.head,revision:2,capacities:{...db.head.capacities,NORTE:{boxes:55,basis:'Caixa padrão'}}}
  for(let i=0;i<10;i++)emit()
  await page.clock.runFor(500)
  await expect(region(page)).toContainText('Versão compartilhada 2')
  await expect(page.getByRole('article',{name:'Prateleira NORTE',exact:true})).toContainText('Capacidade: 55 caixas')
  await expect(form.getByLabel('Capacidade compartilhada (caixas)')).toHaveValue('66')
  expect(db.reads).toBe(before+1);expect(writes).toEqual([])
})
test('aviso privado da planta respeita conexão e é removido ao sair da apresentação',async({page})=>{
  const {db,emit}=await prepare(page),before=db.reads
  await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,value:false}))
  emit();await page.clock.runFor(500);expect(db.reads).toBe(before)
  await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,value:true}))
  db.head={...db.head,revision:2};emit();await page.clock.runFor(500)
  await expect(region(page)).toContainText('Versão compartilhada 2')
  await page.getByLabel('Visualização do Painel').selectOption('stock')
  const after=db.reads;emit();await page.clock.runFor(500)
  expect(db.reads).toBe(after);await expect(region(page)).toHaveCount(0)
})
