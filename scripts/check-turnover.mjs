// Indicadores locais: limites ABC, empates, períodos, contratos da API e renderização.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const root=new URL('../',import.meta.url)
const compile=(source,jsx)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx}}).outputText
const load=source=>import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const pure=await load(compile(await readFile(new URL('src/lib/turnover.ts',root),'utf8')))
const end='2026-10-26T23:00:00.000Z'
const product=(code,sold,stock=2)=>({code,registered_at:'2026-01-01T12:00:00Z',sold_boxes:sold,sales_count:sold?1:0,last_sale_at:sold?'2026-10-25T12:00:00Z':null,stock_boxes:stock})
const report=(quantities,days=90)=>({as_of:end,period_start:new Date(Date.parse(end)-days*86400000).toISOString(),days,category:'all',products:quantities.map((quantity,index)=>product(`AGM-${index+1}`,quantity))})
for(const code of ['AVW-04','AFI-35ABS','AJE-02D'])pure.validateTurnoverReport({...report([]),products:[product(code,0)]})
const classes=quantities=>pure.rankTurnover(pure.validateTurnoverReport(report(quantities))).map(row=>row.abc)
assert.deepEqual(classes([80,15,5]),['A','B','C'])
assert.deepEqual(classes([79,10,6,5]),['A','A','B','C'])
assert.deepEqual(classes([80,5,5,5,5]),['A','B','B','B','B'])
assert.deepEqual(classes([1,1]),['A','A'])
assert.deepEqual(classes([0,0]),['none','none'])
assert.deepEqual(pure.rankTurnover(report([])),[])
assert(pure.rankTurnover(report([0,0])).every(row=>row.share===0&&row.cumulative===0&&row.daily===0))
const ranked=pure.rankTurnover(report([5,80,15]))
assert.equal(ranked[0].code,'AGM-2')
assert.equal(ranked.at(-1).cumulative,100)
assert.equal(ranked[0].daily,80/90)
assert.deepEqual(pure.rankTurnover({...report([1,1,0]),products:[product('MGM-35',1),product('AGM-35',1),product('AFR-57',0)]}).map(row=>row.code),['AGM-35','MGM-35','AFR-57'])
assert.equal(pure.daysWithoutSale(product('AGM-35',0),end),null)
assert.equal(pure.daysWithoutSale(product('AGM-35',1),end),1)
for(const days of [30,90,180])assert.equal(pure.validateTurnoverReport(report([1],days)).days,days)
const base=report([1])
for(const bad of [null,{}, {...base,days:60},{...base,period_start:end},{...base,category:'other'},
  {...base,products:[product('AGM-001',1)]},{...base,products:[product('AGM-101',1)]},
  {...base,products:[product('AGM-1',1),product('AGM-1',1)]},
  {...base,products:[{...product('AGM-1',1),sold_boxes:1.5}]},
  {...base,products:[{...product('AGM-1',1),stock_boxes:-1}]},
  {...base,products:[{...product('AGM-1',0),sales_count:1}]},
  {...base,products:[{...product('AGM-1',1),last_sale_at:null}]},
  {...base,products:[{...product('AGM-1',1),last_sale_at:'2027-01-01T00:00:00Z'}]},
  {...base,products:[{...product('AGM-1',1),last_sale_at:'2026-01-01T00:00:00Z'}]},
  {...base,products:[{...product('AGM-1',1),registered_at:'2027-01-01T00:00:00Z'}]},
  {...base,category:'springs'}, {...base,category:'shocks',products:[product('MGM-35',1)]}])assert.throws(()=>pure.validateTurnoverReport(bad))
assert.equal(pure.validateTurnoverReport({...base,products:[{...product('AGM-1',0),last_sale_at:'2026-01-01T00:00:00Z'}]}).products.length,1)

globalThis.__turnoverPure=pure
globalThis.__turnoverDetails=await load(compile(await readFile(new URL('src/lib/product-details.ts',root),'utf8')))
let applicationsSource=await readFile(new URL('src/components/ProductApplications.tsx',root),'utf8')
applicationsSource=applicationsSource.replace(/^import .*from '..\/lib\/product-details'$/m,'const {formatVehicleYears,shockTypeLabels}=globalThis.__turnoverDetails')
applicationsSource=compile(applicationsSource,ts.JsxEmit.ReactJSX).replaceAll('from "react/jsx-runtime"',`from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`)
globalThis.__turnoverApplications=await load(applicationsSource)
const calls=[]
let response={data:{...report([1],30),category:'springs',products:[product('MGM-35',1)]},error:null}
globalThis.__turnoverClient={rpc:async(...args)=>{calls.push(args);return response}}
let source=await readFile(new URL('src/lib/turnover-api.ts',root),'utf8')
source=source.replace("import {supabase} from './supabase'",'const supabase=globalThis.__turnoverClient')
  .replace(/^import .*from '.\/turnover'$/m,'const {validateTurnoverReport}=globalThis.__turnoverPure')
const api=await load(compile(source))
await api.loadTurnover('springs',30)
assert.deepEqual(calls[0],['inventory_turnover',{p_category:'springs',p_days:30}])
await assert.rejects(api.loadTurnover('bad',30),/inválido/)
await assert.rejects(api.loadTurnover('all',31),/inválido/)
await assert.rejects(api.loadTurnover('all',90),/não corresponde/)
response={data:null,error:{code:'42501'}}
await assert.rejects(api.loadTurnover('all',90),/conta precisa estar ativa/)
response={data:null,error:{code:'503'}}
await assert.rejects(api.loadTurnover('all',90),/Confira a conexão/)

globalThis.__turnoverApi=api
source=await readFile(new URL('src/components/InventoryTurnover.tsx',root),'utf8')
source=source.replace(/^import type .*$/gm,'')
  .replace(/^import .*from '..\/lib\/turnover-api'$/m,'const {loadTurnover}=globalThis.__turnoverApi')
  .replace(/^import .*from '..\/lib\/turnover'$/m,'const {daysWithoutSale,rankTurnover}=globalThis.__turnoverPure')
  .replace(/^import .*from '.\/ProductPhotos'$/m,'const ProductPhoto=()=>null')
  .replace(/^import .*from '.\/ExportCsvButton'$/m,'const ExportCsvButton=()=>null')
  .replace(/^import .*from '.\/ProductApplications'$/m,'const {ProductApplications}=globalThis.__turnoverApplications')
  .replace(/^import .*from '..\/lib\/product-details'$/m,'const {searchableProductText}=globalThis.__turnoverDetails')
  .replace(/^import '.\/InventoryTurnover.css'$/m,'')
source=compile(source,ts.JsxEmit.ReactJSX).replaceAll('from "react/jsx-runtime"',`from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`).replaceAll("from 'react'",`from ${JSON.stringify(import.meta.resolve('react'))}`)
const ui=await load(source)
const props={report:report([80,15,5,0]),catalog:{'AGM-1':{application:'Corsa'}}}
const html=renderToStaticMarkup(React.createElement(ui.TurnoverResults,props))
assert(html.includes('Corsa'));assert(html.includes('Classe A'));assert(html.includes('Sem venda registrada'))
assert(html.includes('Sem vendas'));assert(html.includes('<svg'));assert(html.includes('<caption'))
assert(!html.includes('NaN'));assert(!html.includes('Infinity'));assert(!html.includes('(Bahia)'))
assert(html.includes('1</strong><small>Ver produtos no período'))
const noSales=renderToStaticMarkup(React.createElement(ui.TurnoverResults,{...props,report:report([0,0])}))
assert(noSales.includes('Ainda não há vendas'));assert(!noSales.includes('<svg'))
const pending=renderToStaticMarkup(React.createElement(ui.InventoryTurnover,{catalog:{},ready:false,onRefresh:async()=>{}}))
assert(pending.includes('ainda não estão disponíveis'))
delete globalThis.__turnoverPure;delete globalThis.__turnoverClient;delete globalThis.__turnoverApi
delete globalThis.__turnoverDetails;delete globalThis.__turnoverApplications
console.log('OK: ABC 80/95%, cruzamento de limite, empates, ausência de vendas, contratos inválidos, categorias/períodos, recusa de acesso, gráfico e estados da interface. Nenhum banco alterado.')
