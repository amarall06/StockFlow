// Testes locais sem alterar estoque ou consultar contas reais.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const root=new URL('../',import.meta.url)
const compile=(s,jsx)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx}}).outputText
const importSource=(s)=>import(`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`)
const calls=[]
let response={data:{id:'outflow-id'},error:null}
globalThis.__outflowClient={rpc:async(...args)=>{calls.push(args);return response}}
let source=await readFile(new URL('src/lib/outflow-api.ts',root),'utf8')
source=source.replace(/^import type .*$/gm,'').replace("import { supabase } from './supabase'",'const supabase=globalThis.__outflowClient')
source=source.replace("import { isSpringCode } from './product-category'","const isSpringCode=(code)=>['MGM','MFI','MRE','MFR'].includes(code.split('-')[0])")
const api=await importSource(compile(source))
const waiting={code:'AGM-35',location:'A03',status:'Aguardando testagem',boxes:3}
const released={...waiting,location:'A01',status:'Liberado para venda',boxes:1}
const spring={code:'MGM-35',location:'A03',status:'Em estoque',boxes:3}
assert.deepEqual(api.eligibleOutflows([waiting,released,spring],false,'sale'),[released])
assert.deepEqual(api.eligibleOutflows([waiting,released,spring],true,'sale'),[spring])
assert.deepEqual(api.eligibleOutflows([waiting,released,spring],false,'discard'),[waiting,released])
const input={row:released,boxes:1,reason:'sale',notes:'',reference:' DEMO-VENDA '}
assert.throws(()=>api.normalizeOutflow({...input,row:waiting}),/situação/)
assert.throws(()=>api.normalizeOutflow({...input,boxes:2}),/saldo disponível/)
assert.throws(()=>api.normalizeOutflow({...input,boxes:0}))
assert.throws(()=>api.normalizeOutflow({...input,boxes:0.5}))
assert.throws(()=>api.normalizeOutflow({...input,reason:'discard',notes:'  '}),/motivo detalhado/)
assert.throws(()=>api.normalizeOutflow({...input,reason:'supplier_return'}))
assert.equal(api.normalizeOutflow({...input,reason:'discard',notes:'Caixa fictícia com defeito'}).p_reason,'discard')
assert.equal(api.normalizeOutflow({...input,row:spring}).p_status,'in_stock')
assert.equal(api.normalizeOutflow(input).p_reference,'DEMO-VENDA')
await api.registerOutflow(input,'same-request')
await api.registerOutflow(input,'same-request')
assert.deepEqual(calls[0],calls[1])
assert(!('p_performed_by' in calls[0][1]))
assert(!('p_created_at' in calls[0][1]))
response={data:null,error:{code:'P0001'}}
await assert.rejects(api.registerOutflow(input,'id'),/saldo mudou/)
response={data:null,error:{code:'42501'}}
await assert.rejects(api.registerOutflow(input,'id'),/Administrador/)
globalThis.__outflowApi=api
source=await readFile(new URL('src/components/StockOutflows.tsx',root),'utf8')
source=source.replace(/^import type .*$/gm,'').replace(/^import .*from '\.\.\/lib\/outflow-api'$/m,'const {eligibleOutflows,outflowLabels,registerOutflow}=globalThis.__outflowApi').replace(/^import '\.\/StockOutflows.css'$/m,'')
source=compile(source,ts.JsxEmit.ReactJSX).replaceAll('from "react/jsx-runtime"',`from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`).replaceAll("from 'react'",`from ${JSON.stringify(import.meta.resolve('react'))}`)
const {StockOutflows}=await importSource(source)
const props={stock:[waiting,released,spring],catalog:{},ready:true,isAdministrator:true,onRefresh:async()=>{}}
const render=(overrides={})=>renderToStaticMarkup(React.createElement(StockOutflows,{...props,...overrides}))
const html=render()
assert(html.includes('AGM-35 · A01 · Liberado para venda · 1 caixas'))
assert(!html.includes('AGM-35 · A03 · Aguardando testagem · 3 caixas'))
assert(!render({isAdministrator:false}).includes('<form'))
assert(!render({ready:false}).includes('<form'))
assert(render({stock:[waiting]}).includes('Não há caixas de amortecedores liberadas para venda.'))
delete globalThis.__outflowClient
delete globalThis.__outflowApi
console.log('OK: venda só de liberados, molas Em estoque, saldo/inteiros, observação de descarte/devolução, reenvio, autoria do servidor e interface por cargo. SQL ainda aguarda aplicação e ensaio no Supabase.')
