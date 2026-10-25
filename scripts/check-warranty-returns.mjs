// Verificação sem conexão ao Supabase: não cria contas ou movimentações reais.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'

const root = new URL('../', import.meta.url)
const source = await readFile(new URL('src/lib/warranty-returns.ts', root), 'utf8')
const calls = []
let rpcResult = { data: { id: 'confirmed' }, error: null }
globalThis.__warrantyTestClient = { rpc: async (...args) => { calls.push(args); return rpcResult } }
const js = ts.transpileModule(source.replace("import { supabase } from './supabase'", 'const supabase = globalThis.__warrantyTestClient'), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText
const api = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
assert.deepEqual(api.allowedReturnStatuses({ product_kind: 'spring', ownership: 'ours' }), ['received', 'warranty', 'closed'])
for (const product_kind of ['shock', 'spring', 'unknown']) {
  for (const ownership of ['unknown', 'other']) {
    assert.deepEqual(api.allowedReturnStatuses({ product_kind, ownership }), ['received', 'closed'])
  }
}
assert(api.allowedReturnStatuses({ product_kind: 'shock', ownership: 'ours' }).includes('awaiting_test'))
assert(!api.allowedReturnStatuses({ product_kind: 'unknown', ownership: 'ours' }).includes('warranty'))
const input = { manufacturer_id: null, product_kind: 'unknown', product_code: '', description: 'Caixa fictícia', boxes: 1, reason: 'Conferir', location: 'Recebimento', ownership: 'unknown', status: 'received', destination: '' }
await api.saveWarrantyReturn('return-id', input, null, 'same-request')
await api.saveWarrantyReturn('return-id', input, null, 'same-request')
assert.equal(calls[0][1].p_request_id, calls[1][1].p_request_id)
assert.deepEqual(calls[0][1].p_input, input)
rpcResult = { data: null, error: { code: '40001' } }
await assert.rejects(api.saveWarrantyReturn('return-id', input, 'old', 'another'), /Outra alteração/)
rpcResult = { data: null, error: { code: 'P0001' } }
await assert.rejects(api.saveWarrantyReturn('return-id', input, 'old', 'another'), /saldo da garantia/)

// Renderiza o formulário isolado para verificar opções e bloqueios por categoria.
globalThis.__warrantyTestApi = api
let component = await readFile(new URL('src/components/WarrantyReturns.tsx', root), 'utf8')
component = component.replace(/^import .*from '\.\.\/lib\/warranty-returns'$/m, 'const { allowedReturnStatuses, loadWarrantyReturns, returnStatusLabels, saveWarrantyReturn } = globalThis.__warrantyTestApi')
component = component.replace(/^import type .*$/gm, '').replace(/^import .*EditButton.*$/m, 'const EditButton = () => null').replace(/^import '\.\/WarrantyReturns.css'$/m, '')
component = component.replace('function ReturnDialog(', 'export function ReturnDialog(')
component = ts.transpileModule(component, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
// Imports absolutos permitem importar este módulo pela URL data:.
component = component.replaceAll('from "react/jsx-runtime"', `from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`).replaceAll("from 'react'", `from ${JSON.stringify(import.meta.resolve('react'))}`)
const { ReturnDialog, WarrantyReturns } = await import(`data:text/javascript;base64,${Buffer.from(component).toString('base64')}`)
const props = { manufacturers: [], onClose() {}, onSaved() {} }
const spring = renderToStaticMarkup(React.createElement(ReturnDialog, { ...props, previous: { ...input, id: 'id', product_kind: 'spring', ownership: 'ours', updated_at: 'now' } }))
assert(!spring.includes('value="awaiting_test"'))
assert(!spring.includes('value="identification"'))
assert(spring.includes('Molas não passam por testagem'))
const closed = renderToStaticMarkup(React.createElement(ReturnDialog, { ...props, previous: { ...input, id: 'id', status: 'closed', updated_at: 'now' } }))
assert(closed.includes('Destino / conclusão'))
const inWarranty = renderToStaticMarkup(React.createElement(ReturnDialog, { ...props, previous: { ...input, id: 'id', product_kind: 'shock', ownership: 'ours', status: 'warranty', updated_at: 'now' } }))
assert(!inWarranty.includes('value="received"'))
assert(!inWarranty.includes('value="awaiting_test"'))
assert(inWarranty.includes('value="closed"'))
assert(inWarranty.includes('<select disabled=""><option value="unknown"'))
const pending = renderToStaticMarkup(React.createElement(WarrantyReturns, { ready: false, isAdministrator: true, manufacturers: [], revision: 0, onChanged() {} }))
assert(!pending.includes('>Receber devolução</button>'))
const viewer = renderToStaticMarkup(React.createElement(WarrantyReturns, { ready: true, isAdministrator: false, manufacturers: [], revision: 0, onChanged() {} }))
assert(!viewer.includes('>Receber devolução</button>'))
delete globalThis.__warrantyTestClient
delete globalThis.__warrantyTestApi
console.log('OK: categorias, itens desconhecidos, repetição do identificador, erros, formulário de molas, destino e acesso à interface. SQL ainda exige aplicação e teste no Supabase.')
