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
    if (!(index in slots)) slots[index] = initial
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
source = await readFile(new URL('src/components/StockOutflows.tsx', root), 'utf8')
source = source.replace(/^import .*from 'react'$/m, 'const {useRef,useState}=globalThis.__recovery.hooks')
  .replace(/^import type .*$/gm, '')
  .replace(/^import .*from '..\/lib\/outflow-api'$/m, 'const {eligibleOutflows,outflowLabels,registerOutflow}=globalThis.__recovery.api')
  .replace(/^import '.\/StockOutflows.css'$/m, 'const {h,Fragment}=globalThis.__recovery')
const { StockOutflows } = await load(source, ts.JsxEmit.React)
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...tree.children.flatMap(nodes)]
const text = tree => !tree || typeof tree !== 'object' ? String(tree ?? '') : tree.children.map(text).join(' ')
const event = { preventDefault() {} }
const results = []

for (const springs of [false, true]) {
  const row = { code: springs ? 'MGM-35' : 'AGM-35', location: 'TEST', status: springs ? 'Em estoque' : 'Liberado para venda', boxes: 2 }
  const props = { stock: [row], catalog: {}, ready: true, isAdministrator: true, onRefresh: () => refresh() }
  const render = () => { cursor = 0; return StockOutflows(props) }
  const find = type => nodes(render()).find(node => node.type === type)
  const reset = () => {
    slots = []; render()
    // Mesmas atualizações produzidas pelos campos controlados do formulário.
    slots[0] = springs; slots[2] = JSON.stringify([row.code, row.location, row.status])
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
  passed('Resposta demorada: novo envio bloqueado enquanto está salvando')
}
delete globalThis.__recovery
console.log(JSON.stringify({ scope: 'Handlers reais; transporte e hooks simulados; sem rede ou escrita no banco', results }, null, 2))
