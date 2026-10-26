// Executa os handlers reais com hooks em memória e transporte simulado.
// Não usa credenciais, não acessa a rede e não prova o comportamento do servidor.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const load = (source, jsx) => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx, jsxFactory: 'h', jsxFragmentFactory: 'Fragment' },
}).outputText).toString('base64')}`)
let slots, cursor, transport, refresh
const hooks = {
  useState(initial) {
    const index = cursor++
    if (!(index in slots)) slots[index] = typeof initial==='function'?initial():initial
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
  },
  useRef(initial) {
    const index = cursor++
    if (!(index in slots)) slots[index] = { current: initial }
    return slots[index]
  },
}
globalThis.__recovery = {
  hooks,
  client: { rpc: (...args) => transport(...args) },
  h: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
  Fragment: 'fragment',
}
let source = await readFile(new URL('src/lib/outflow-api.ts', root), 'utf8')
source = source.replace(/^import type .*$/gm, '')
  .replace("import { supabase } from './supabase'", 'const supabase=globalThis.__recovery.client')
  .replace("import { isSpringCode } from './product-category'", "const isSpringCode=(code)=>/^(MGM|MFI|MRE|MFR)-/.test(code)")
globalThis.__recovery.api = await load(source)
const saved=new Map()
globalThis.window={sessionStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)}}
source=await readFile(new URL('src/lib/pending-outflow.ts',root),'utf8')
source=source.replace(/^import .*from '.\/outflow-api'$/m,'const {normalizeOutflow}=globalThis.__recovery.api')
globalThis.__recovery.pending=await load(source)
source = await readFile(new URL('src/components/StockOutflows.tsx', root), 'utf8')
source = source.replace(/^import .*from 'react'$/m, 'const {useRef,useState}=globalThis.__recovery.hooks')
  .replace(/^import type .*$/gm, '')
  .replace(/^import .*from '..\/lib\/outflow-api'$/m, 'const {eligibleOutflows,outflowLabels,registerOutflow,normalizeOutflow,OutflowRejectedError}=globalThis.__recovery.api')
  .replace(/^import .*from '..\/lib\/pending-outflow'$/m,'const {readPendingOutflow,savePendingOutflow,clearPendingOutflow}=globalThis.__recovery.pending')
  .replace(/^import '.\/StockOutflows.css'$/m, 'const {h,Fragment}=globalThis.__recovery')
const { StockOutflows } = await load(source, ts.JsxEmit.React)
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...tree.children.flatMap(nodes)]
const text = tree => !tree || typeof tree !== 'object' ? String(tree ?? '') : tree.children.map(text).join(' ')
const event = { preventDefault() {} }
const results = []

for (const springs of [false, true]) {
  const row = { code: springs ? 'MGM-35' : 'AGM-35', location: 'TEST', status: springs ? 'Em estoque' : 'Liberado para venda', boxes: 2 }
  const props = { userId:springs?'spring-user':'shock-user',stock: [row], catalog: {}, ready: true, isAdministrator: true, onRefresh: () => refresh() }
  const render = () => { cursor = 0; return StockOutflows(props) }
  const find = type => nodes(render()).find(node => node.type === type)
  const reset = () => {
    saved.clear();slots = []; render()
    // Mesmas atualizações produzidas pelos campos controlados do formulário.
    slots[1] = springs; slots[3] = JSON.stringify([row.code, row.location, row.status])
    refresh = async () => {}
  }
  const passed = name => results.push({ category: springs ? 'molas' : 'amortecedores', name, passed: true })

  reset()
  const calls = [], ledger = new Map()
  transport = async (method, payload) => {
    calls.push({ method, payload })
    if (!ledger.has(payload.p_request_id)) {
      ledger.set(payload.p_request_id, { id: 'simulated-event' })
      // O servidor simulado aceitou; a resposta se perdeu no transporte.
      return { data: null, error: { message: 'Simulated response loss' } }
    }
    return { data: ledger.get(payload.p_request_id), error: null }
  }
  await find('form').props.onSubmit(event)
  assert.match(text(render()), /Não foi possível confirmar/)
  await find('form').props.onSubmit(event)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], calls[1], 'Reenvio deve preservar UUID e conteúdo')
  assert.equal(ledger.size, 1)
  assert.match(text(render()), /Saída registrada/)
  passed('Resposta perdida: reenvio mantém identificador e conteúdo')

  reset()
  let writes = 0
  transport = async () => { writes++; return { data: { id: 'saved' }, error: null } }
  refresh = async () => { throw new Error('Simulated refresh failure') }
  await find('form').props.onSubmit(event)
  assert.match(text(render()), /Saída já salva/)
  assert.equal(find('fieldset').props.disabled, true)
  await find('form').props.onSubmit(event)
  assert.equal(writes, 1, 'Falha na consulta não pode gerar nova retirada')
  refresh = async () => {}
  const refreshButton = nodes(render()).find(node => node.type === 'button' && text(node).includes('Atualizar estoque'))
  refreshButton.props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(writes, 1)
  assert.match(text(render()), /Estoque e histórico atualizados/)
  passed('Saída confirmada e consulta falha: atualização não reenvia retirada')

  reset()
  let finish
  writes = 0
  transport = () => { writes++; return new Promise(resolve => { finish = resolve }) }
  const pending = find('form').props.onSubmit(event)
  assert.equal(find('fieldset').props.disabled, true)
  await find('form').props.onSubmit(event)
  assert.equal(writes, 1)
  finish({ data: { id: 'saved' }, error: null })
  await pending
  reset()
  const reloadCalls=[]
  transport=async(method,payload)=>{
    reloadCalls.push([method,payload])
    return reloadCalls.length===1?{data:null,error:{code:'NETWORK'}}:{data:{id:'saved-once'},error:null}
  }
  await find('form').props.onSubmit(event)
  assert.equal(saved.size,1)
  props.stock=[]
  slots=[] // Recarga: destrói os hooks, mas mantém os dados da aba.
  assert.match(text(render()),/Pedido aguardando confirmação/)
  assert.equal(find('fieldset').props.disabled,true)
  nodes(render()).find(node=>node.type==='button'&&text(node)==='Conferir pedido pendente').props.onClick()
  await new Promise(resolve=>setImmediate(resolve))
  assert.deepEqual(reloadCalls[0],reloadCalls[1])
  assert.equal(saved.size,0)
  assert.match(text(render()),/Saída registrada/)
  props.stock=[row]
  passed('Recarga com saldo zero recupera UUID e conteúdo originais')

  reset()
  const originalStorage=window.sessionStorage
  // Confirmou a saída, mas a consulta falhou; após recarga, só consultar novamente.
  let confirmedCalls=0
  transport=async()=>{confirmedCalls++;return {data:{id:'already-confirmed'},error:null}}
  refresh=async()=>{throw new Error('Refresh unavailable')}
  await find('form').props.onSubmit(event)
  slots=[]
  assert.match(text(render()),/Saída confirmada; atualização pendente/)
  refresh=async()=>{}
  nodes(render()).find(node=>node.type==='button'&&text(node)==='Atualizar pedido confirmado').props.onClick()
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(confirmedCalls,1)
  assert.equal(saved.size,0)
  passed('Recarga de pedido confirmado apenas atualiza a consulta')

  reset()
  transport=async()=>({data:null,error:{code:'P0001'}})
  await find('form').props.onSubmit(event)
  assert.equal(saved.size,0)
  assert.equal(find('fieldset').props.disabled,false)
  passed('Recusa explícita de saldo libera formulário sem pendência falsa')

  reset()
  window.sessionStorage={...originalStorage,setItem:()=>{throw new Error('Quota')}}
  let blockedCalls=0
  transport=async()=>{blockedCalls++;return {data:{id:'unexpected'},error:null}}
  await find('form').props.onSubmit(event)
  assert.equal(blockedCalls,0)
  assert.match(text(render()),/Nenhuma nova saída foi enviada/)
  window.sessionStorage=originalStorage
  passed('Armazenamento indisponível impede envio')

  reset()
  const failedCalls=[]
  transport=async(...args)=>{failedCalls.push(args);return {data:null,error:{code:'NETWORK'}}}
  await find('form').props.onSubmit(event)
  const ownKey=[...saved.keys()][0]
  assert(saved.get(ownKey))
  assert.equal(globalThis.__recovery.pending.readPendingOutflow('another-account').pending,null)
  saved.set(ownKey,'{invalid')
  slots=[]
  assert.match(text(render()),/Novas saídas estão bloqueadas/)
  await find('form').props.onSubmit(event)
  assert.equal(failedCalls.length,1)
  passed('Conta isolada e pedido corrompido bloqueiam nova saída')
  passed('Resposta demorada: novo envio bloqueado enquanto está salvando')
}
delete globalThis.__recovery
delete globalThis.window
console.log(JSON.stringify({ scope: 'Handlers reais; transporte e hooks simulados; sem rede ou escrita no banco', results }, null, 2))
