// Não acessa o banco: verifica permissões de interface, paginação e limites dos envios.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = new URL('../', import.meta.url)
let calls = []
let response = { data: { id: 'test-id' }, error: null }
let range = null
const history = Array.from({ length: 11 }, (_, index) => ({ id: String(index) }))
const query = { select() { return this }, eq() { return this }, order() { return this }, range(a,b) { range=[a,b]; return Promise.resolve({ data: history, error: null }) } }
globalThis.__shockTestClient = { rpc: async (...args) => { calls.push(args); return response }, from: () => query }
let apiSource = await readFile(new URL('src/lib/shock-testing.ts', root), 'utf8')
apiSource = apiSource.replace("import { supabase } from './supabase'", 'const supabase = globalThis.__shockTestClient')
apiSource = apiSource.replace("import { isSpringCode } from './product-category'", "const isSpringCode = (code) => ['MGM','MFI','MRE','MFR'].includes(code.split('-')[0])")
const compile = (source, jsx) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx } }).outputText
const importSource = (source) => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const api = await importSource(compile(apiSource))
for (const code of ['MGM-12','MFI-91','MRE-48','MFR-63']) await assert.rejects(api.approveShockBoxes(code,'A03',1,'id'), /molas não são testadas/)
for (const boxes of [0,-1,1.5,NaN]) await assert.rejects(api.approveShockBoxes('AGM-35','A03',boxes,'id'))
assert.equal(calls.length,0)
await api.approveShockBoxes('AGM-35','A03',2,'same-request')
await api.approveShockBoxes('AGM-35','A03',2,'same-request')
assert.deepEqual(calls[0],calls[1])
assert(!('p_performed_by' in calls[0][1]))
assert(!('p_created_at' in calls[0][1]))
const page = await api.loadShockApprovals('AGM-35',1)
assert.deepEqual(range,[10,20])
assert.equal(page.rows.length,10)
assert.equal(page.hasNext,true)
response = { data: null, error: { code: 'P0001' } }
await assert.rejects(api.approveShockBoxes('AGM-35','A03',1,'id'), /saldo aguardando teste/)
response = { data: null, error: { code: '42501' } }
await assert.rejects(api.approveShockBoxes('AGM-35','A03',1,'id'), /Administrador ou Testador/)

globalThis.__shockTestApi = api
let component = await readFile(new URL('src/components/ShockTesting.tsx', root), 'utf8')
component = component.replace(/^import type .*$/gm,'').replace(/^import .*from '\.\.\/lib\/shock-testing'$/m,'const { approveShockBoxes, loadShockApprovals } = globalThis.__shockTestApi').replace(/^import '\.\/ShockTesting.css'$/m,'')
component = compile(component,ts.JsxEmit.ReactJSX).replaceAll('from "react/jsx-runtime"',`from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`).replaceAll("from 'react'",`from ${JSON.stringify(import.meta.resolve('react'))}`)
const { ShockTestButton, ShockTestingDialog } = await importSource(component)
const props={ row:{code:'AGM-35',location:'A03',boxes:3,status:'Aguardando testagem'},ready:true,canApprove:true,onClose(){},onRecorded(){} }
const render=(overrides={})=>renderToStaticMarkup(React.createElement(ShockTestingDialog,{...props,...overrides}))
assert(render().includes('Confirmar aprovação'))
assert(render().includes('max="3"'))
assert(!render({canApprove:false}).includes('Confirmar aprovação'))
assert(!render({ready:false}).includes('Confirmar aprovação'))
assert(!render({row:{...props.row,status:'Liberado para venda'}}).includes('Confirmar aprovação'))
assert(render().includes('não identifica cada caixa desta linha'))
const icon=renderToStaticMarkup(React.createElement(ShockTestButton,{code:'AGM-35',onClick(){}}))
assert(icon.includes('aria-label="Ver testagem de AGM-35"'))
assert(icon.includes('aria-hidden="true"'))
calls=[]
delete globalThis.__shockTestClient
delete globalThis.__shockTestApi
console.log('OK: molas, quantidades inválidas, reenvio, autoria do servidor, paginação e visibilidade do formulário. Migração ainda precisa de teste no Supabase.')
