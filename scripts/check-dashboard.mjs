import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const root=new URL('../',import.meta.url)
const compile=(s,jsx)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx}}).outputText
const importSource=(s)=>import(`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`)
let source=await readFile(new URL('src/lib/stock-alerts.ts',root),'utf8')
source=source.replace(/^import type .*$/gm,'').replace("import { isSpringCode } from './product-category'","const isSpringCode=(code)=>['MGM','MFI','MRE','MFR'].includes(code.split('-')[0])")
const alerts=await importSource(compile(source))
globalThis.__dashboardAlerts=alerts
source=await readFile(new URL('src/lib/dashboard-summary.ts',root),'utf8')
source=source.replace(/^import type .*$/gm,'').replace("import {calculateStockAlerts} from './stock-alerts'",'const {calculateStockAlerts}=globalThis.__dashboardAlerts')
const summary=await importSource(compile(source))
const product=(minimumBoxes=null)=>({application:'Fictício',defaultLocation:'A01',minimumBoxes})
const catalog={'AGM-35':product(5),'ARE-24':product(),'MGM-35':product(4)}
const stock=[{code:'AGM-35',location:'A01',status:'Aguardando testagem',boxes:2},{code:'AGM-35',location:'B01',status:'Liberado para venda',boxes:3},{code:'MGM-35',location:'A03',status:'Em estoque',boxes:4}]
const all=summary.dashboardStockSummary(catalog,stock,'all')
assert.equal(all.boxes,9);assert.equal(all.products,3);assert.equal(all.zeros,1);assert.equal(all.low,2)
assert.equal(summary.dashboardStockSummary(catalog,stock,'shocks').boxes,5)
assert.equal(summary.dashboardStockSummary(catalog,stock,'springs').boxes,4)
assert.equal(summary.dashboardStockSummary({},[],'all').products,0)
assert.equal(all.alerts[0].code,'ARE-24')
const report={as_of:'2026-10-25T15:00:00Z',period_start:'2026-09-25T15:00:00Z',sold_boxes:2,sales_count:2,sales_by_product:[{code:'AGM-35',boxes:1},{code:'MGM-35',boxes:1}],receipts:[{id:'receipt',created_at:'2026-10-25T14:00:00Z',code:'MGM-35',boxes:1,location:'A03',supplier:'Fornecedor fictício',lot:'DEMO-M'}]}
const calls=[]
globalThis.__dashboardClient={rpc:async(...args)=>{calls.push(args);return{data:report,error:null}}}
source=await readFile(new URL('src/lib/dashboard-api.ts',root),'utf8')
source=source.replace("import {supabase} from './supabase'",'const supabase=globalThis.__dashboardClient')
const api=await importSource(compile(source))
assert.equal(api.validateDashboardReport(report),report)
for(const invalid of [null,{}, {...report,sold_boxes:-1},{...report,sales_count:0.5},{...report,as_of:'invalid'},{...report,sales_by_product:[{code:'AGM-35',boxes:0}]}])assert.throws(()=>api.validateDashboardReport(invalid))
await api.loadDashboardReport('springs')
assert.deepEqual(calls[0],['inventory_dashboard',{p_category:'springs'}])
await assert.rejects(api.loadDashboardReport('unknown'),/Categoria inválida/)
globalThis.__dashboardApi=api;globalThis.__dashboardSummary=summary
source=await readFile(new URL('src/components/InventoryDashboard.tsx',root),'utf8')
source=source.replace(/^import type .*$/gm,'').replace(/^import .*from '\.\.\/lib\/dashboard-api'$/m,'const {loadDashboardReport}=globalThis.__dashboardApi').replace(/^import .*from '\.\.\/lib\/dashboard-summary'$/m,'const {dashboardStockSummary}=globalThis.__dashboardSummary').replace(/^import '\.\/InventoryDashboard.css'$/m,'')
source=compile(source,ts.JsxEmit.ReactJSX).replaceAll('from "react/jsx-runtime"',`from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`).replaceAll("from 'react'",`from ${JSON.stringify(import.meta.resolve('react'))}`)
const {DashboardActivity,InventoryDashboard}=await importSource(source)
const rendered=renderToStaticMarkup(React.createElement(DashboardActivity,{report}))
assert(rendered.includes('DEMO-M'));assert(rendered.includes('Fornecedor fictício'));assert(rendered.includes('2 caixas vendidas'))
assert(rendered.includes('width:100%'))
assert(!rendered.includes('(Bahia)'))
const empty=renderToStaticMarkup(React.createElement(DashboardActivity,{report:{...report,sold_boxes:0,sales_count:0,sales_by_product:[],receipts:[]}}))
assert(empty.includes('Nenhuma venda registrada'));assert(empty.includes('Nenhum recebimento registrado'));assert(!empty.includes('dashboard-bar-track'))
const pending=renderToStaticMarkup(React.createElement(InventoryDashboard,{catalog,stock,ready:false,onRefresh:async()=>{},onOpen(){}}))
assert(pending.includes('aguarda ativação'));assert(!pending.includes('dashboard-totals'))
// Os cartões principais mostram ambas as categorias e excluem caixas fora do estoque normal.
const readyPanel=renderToStaticMarkup(React.createElement(InventoryDashboard,{catalog,stock:[...stock,{code:'AGM-35',boxes:99,status:'Garantia',location:'GAR'}],ready:true,onRefresh:async()=>{},onOpen(){}}))
assert(readyPanel.includes('Total de caixas por categoria'))
assert(readyPanel.includes('Amortecedores</span><strong>5'))
assert(readyPanel.includes('Molas</span><strong>4'))
assert(readyPanel.includes('Total no estoque normal</span><strong>9'))
assert(readyPanel.includes('Abrir catálogo de produtos'))
assert(readyPanel.includes('Ver todos os alertas'))
assert(readyPanel.includes('dashboard-alert-panel has-alerts'))
delete globalThis.__dashboardAlerts;delete globalThis.__dashboardClient;delete globalThis.__dashboardApi;delete globalThis.__dashboardSummary
console.log('OK: filtros de estoque, alertas, relatório inválido, categoria RPC, barras e quantidades, entradas, estado vazio e ativação pendente. A agregação SQL ainda exige ensaio no Supabase.')
