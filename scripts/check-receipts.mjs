import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root=new URL('../',import.meta.url)
const compile=(source,jsx)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx}}).outputText
const importSource=(source)=>import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const springFunction="const isSpringCode=(code)=>['MGM','MFI','MRE','MFR'].includes(code.split('-')[0])"
const calls=[]
let response={data:{id:'receipt-id',name:'Fornecedor fictício'},error:null}
globalThis.__receiptClient={rpc:async(...args)=>{calls.push(args);return response}}
let source=await readFile(new URL('src/lib/receipt-api.ts',root),'utf8')
source=source.replace("import { supabase } from './supabase'",'const supabase=globalThis.__receiptClient').replace("import { isSpringCode } from './product-category'",springFunction)
const api=await importSource(compile(source))
const input={code:' agm-35 ',application:'',location:' a03 ',boxes:2,status:'awaiting_test',supplierId:'supplier-id',lot:' LOTE-DEMO '}
assert.equal(api.normalizeReceipt(input).p_code,'AGM-35')
assert.equal(api.normalizeReceipt(input).p_lot_reference,'LOTE-DEMO')
assert.equal(api.normalizeReceipt(input).p_location,'A03')
assert.throws(()=>api.normalizeReceipt({...input,supplierId:''}),/selecione seu fornecedor/)
assert.throws(()=>api.normalizeReceipt({...input,boxes:1.2}))
assert.throws(()=>api.normalizeReceipt({...input,boxes:0}))
assert.throws(()=>api.normalizeReceipt({...input,code:'AGM-035'}))
assert.throws(()=>api.normalizeReceipt({...input,lot:'x'.repeat(101)}))
assert.equal(api.normalizeReceipt({...input,code:'MGM-12',status:'awaiting_test'}).p_status,'in_stock')
assert.equal(api.normalizeReceipt({...input,supplierId:'',lot:''}).p_supplier_id,null)
await api.receiveWithSupplier(input,'same-id')
await api.receiveWithSupplier(input,'same-id')
assert.deepEqual(calls[0],calls[1])
assert(!('performed_by' in calls[0][1]))
assert(!('supplier_name' in calls[0][1]))
await api.createSupplier('  Fornecedor   fictício ')
assert.equal(calls.at(-1)[1].p_name,'Fornecedor fictício')
response={data:null,error:{code:'42501'}}
await assert.rejects(api.receiveWithSupplier(input,'id'),/Sua função/)

globalThis.__receiptApi=api
source=await readFile(new URL('src/components/ReceiptForm.tsx',root),'utf8')
source=source.replace(/^import type .*$/gm,'').replace("import { isSpringCode } from '../lib/product-category'",springFunction)
source=source.replace(/^import .*from '\.\.\/lib\/receipt-api'$/m,'const {createSupplier,loadSuppliers,receiveWithSupplier}=globalThis.__receiptApi').replace(/^import '\.\/ReceiptForm.css'$/m,'')
source=compile(source,ts.JsxEmit.ReactJSX).replaceAll('from "react/jsx-runtime"',`from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`).replaceAll("from 'react'",`from ${JSON.stringify(import.meta.resolve('react'))}`)
const {ReceiptForm}=await importSource(source)
const props={catalog:{},locations:['A01'],springs:false,role:'administrator',onReceived:async()=>{}}
const render=(overrides={})=>renderToStaticMarkup(React.createElement(ReceiptForm,{...props,...overrides}))
const admin=render()
assert(admin.includes('Nome do fornecedor'))
assert(admin.includes('Referência do lote (opcional)'))
assert(!render({role:'receiving'}).includes('Nome do fornecedor'))
assert(!render({role:'receiving'}).includes('value="released_for_sale"'))
assert(render({role:'viewer'}).includes('<fieldset disabled=""'))
assert(render({springs:true}).includes('value="Em estoque"'))
assert(!render({springs:true}).includes('Aguardando testagem</option>'))
delete globalThis.__receiptClient
delete globalThis.__receiptApi
console.log('OK: lote exige fornecedor, normalização, caixas inteiras, molas sem teste, reenvio, cadastro por administrador e formulário por cargo. SQL e persistência ainda exigem validação após ativar.')
