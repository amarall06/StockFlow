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
const api=await importSource(compile(source))
const product=(minimumBoxes)=>({application:'Fictício',defaultLocation:'A01',minimumBoxes,minimumUpdatedAt:'version'})
const catalog={'AGM-35':product(5),'ARE-24':product(null),'AFI-89':product(0),'AFR-57':product(1),'MGM-35':product(2)}
const stock=[{code:'AGM-35',location:'A01',status:'Aguardando testagem',boxes:3},{code:'AGM-35',location:'B01',status:'Liberado para venda',boxes:2},{code:'AFI-89',location:'A01',status:'Aguardando testagem',boxes:1},{code:'AFR-57',location:'A01',status:'Aguardando testagem',boxes:3},{code:'MGM-35',location:'A03',status:'Em estoque',boxes:2}]
const untouched=JSON.stringify({catalog,stock})
const alerts=api.calculateStockAlerts(catalog,stock,false)
assert.equal(alerts.find((r)=>r.code==='AGM-35').total,5)
assert.equal(alerts.find((r)=>r.code==='AGM-35').severity,'low')
assert.equal(alerts.find((r)=>r.code==='AGM-35').available,2)
assert.equal(alerts.find((r)=>r.code==='AGM-35').awaiting,3)
assert.equal(alerts[0].code,'ARE-24')
assert.equal(alerts[0].severity,'zero')
assert.equal(alerts.find((r)=>r.code==='AFI-89').minimum,0)
assert.equal(alerts.find((r)=>r.code==='AFI-89').severity,'ok')
assert.equal(alerts.find((r)=>r.code==='AFR-57').severity,'ok')
assert.equal(alerts.find((r)=>r.code==='AFR-57').available,0)
assert.equal(api.calculateStockAlerts(catalog,stock,true)[0].severity,'low')
assert.equal(api.calculateStockAlerts(catalog,[],true)[0].severity,'zero')
assert.equal(api.calculateStockAlerts(catalog,[...stock,{code:'AGM-35',location:'GARANTIA',status:'Em garantia',boxes:500}],false).find((r)=>r.code==='AGM-35').total,5)
assert.equal(JSON.stringify({catalog,stock}),untouched)
assert.equal(api.parseMinimum(''),null)
assert.equal(api.parseMinimum('0'),0)
for(const invalid of ['-1','1.5','abc','2147483648'])assert.throws(()=>api.parseMinimum(invalid))

// Verifica que um saldo em prateleira inativa entra no total, sem liberar nova entrada naquele local.
let version=12
const selections=[]
const data={products:[{id:'p',code:'AGM-35',application:'Fictício',default_location_id:'a',updated_at:'time',minimum_boxes:9,minimum_updated_at:'version'}],locations:[{id:'a',code:'A01',is_active:true},{id:'b',code:'B01',is_active:false}],stock_balances:[{product_id:'p',location_id:'a',status_code:'awaiting_test',quantity:3},{product_id:'p',location_id:'b',status_code:'released_for_sale',quantity:5}],product_applications:[]}
globalThis.__alertClient={rpc:async()=>({data:version,error:null}),from(table){return{select(fields){selections.push([table,fields]);return this},order(){return this},eq(){return this},in(){return this},then(resolve){return Promise.resolve({data:data[table],error:null}).then(resolve)}}}}
source=await readFile(new URL('src/lib/inventory-api.ts',root),'utf8')
source=source.replace("import { supabase } from './supabase'",'const supabase=globalThis.__alertClient').replace("export { shockTypeLabels } from './product-details'",'export const shockTypeLabels={}')
const inventory=await importSource(compile(source))
const snapshot=await inventory.loadInventorySnapshot()
assert.deepEqual(snapshot.locations,['A01'])
assert.equal(snapshot.stock.reduce((sum,r)=>sum+r.boxes,0),8)
assert.equal(snapshot.catalog['AGM-35'].minimumBoxes,9)
assert(selections.find(([table])=>table==='products')[1].includes('minimum_boxes'))
selections.length=0;version=11
await inventory.loadInventorySnapshot()
assert(!selections.find(([table])=>table==='products')[1].includes('minimum_boxes'))

globalThis.__alertApi=api
source=await readFile(new URL('src/components/StockAlerts.tsx',root),'utf8')
source=source.replace(/^import type .*$/gm,'').replace(/^import .*from '\.\.\/lib\/stock-alerts'$/m,'const {calculateStockAlerts}=globalThis.__alertApi').replace(/^import .*from '\.\.\/lib\/stock-minimum-api'$/m,'const saveStockMinimum=async()=>{}').replace(/^import .*from '\.\/EditButton'$/m,'const EditButton=()=>null').replace(/^import '\.\/StockAlerts.css'$/m,'')
source=compile(source,ts.JsxEmit.ReactJSX).replaceAll('from "react/jsx-runtime"',`from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`).replaceAll("from 'react'",`from ${JSON.stringify(import.meta.resolve('react'))}`)
const {StockAlerts}=await importSource(source)
const props={catalog,stock,springs:false,ready:true,isAdministrator:true,onRefresh:async()=>{}}
const render=(overrides={})=>renderToStaticMarkup(React.createElement(StockAlerts,{...props,...overrides}))
assert(render().includes('Configurar mínimos'))
assert(!render({isAdministrator:false}).includes('Configurar mínimos'))
assert(!render({ready:false}).includes('produtos sem estoque'))
assert(render().includes('Disponíveis para venda: 2'))
assert(!render({springs:true}).includes('Aguardando teste:'))
delete globalThis.__alertClient
delete globalThis.__alertApi
console.log('OK: limites inclusivos, vazio/zero, todas as localizações, catálogo sem saldo, garantia excluída, molas, prateleira inativa, compatibilidade API anterior e acesso da interface. SQL ainda exige ativação/ensaio no Supabase.')
